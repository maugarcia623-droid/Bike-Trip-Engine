import { TripProfile, RouteParams } from '../types/trip';
import { StageAmenity } from '../types/amenities';
import { synthesizeRouteElevationProfile } from './gpxParser';
import { resolveLiveStages, getExpeditionTotals } from './stageManager';
import { getCurrentLanguage } from '../context/LanguageContext';
import { haversineDistanceMeters } from '../services/overpassCorridor';
import {
  buildStageCueSheet,
  CueSheetEntry,
  formatAmenityCategoryLabel,
  formatAmenityCueNote,
  getAmenityGpxSymbol,
} from './cueSheet';

/**
 * Generate a smooth closed loop of GPS coordinates centered around an origin point.
 * Computes coordinates such that the total path distance approximately matches distanceKm.
 */
function generateRadiusLoopCoordinates(
  center: [number, number],
  distanceKm: number,
  sampleCount: number = 64
): [number, number][] {
  const [lat0, lng0] = center;
  const targetDist = Math.max(2, distanceKm);
  const radiusKm = targetDist / (2 * Math.PI);
  const latKmPerDeg = 111.0;
  const lngKmPerDeg = 111.0 * Math.cos((lat0 * Math.PI) / 180);

  const coords: [number, number][] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * 2 * Math.PI;
    const dLatKm = radiusKm * Math.sin(t);
    const dLngKm = radiusKm * (1 - Math.cos(t));

    const lat = lat0 + dLatKm / latKmPerDeg;
    const lng = lng0 + dLngKm / (lngKmPerDeg || 1);
    coords.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  return coords;
}

/**
 * Interpolate track points along standard coordinates or synthesize from route params.
 */
function resolveExportCoordinates(route: RouteParams): [number, number][] {
  if (route.coordinates && route.coordinates.length >= 2) {
    return route.coordinates;
  }

  // Radius loop mode
  if (route.routeMode === 'manual-radius' || (route.radiusMeters && route.radiusMeters > 0)) {
    const center: [number, number] =
      route.originCoords ||
      (route.coordinates && route.coordinates.length > 0 ? route.coordinates[0] : [47.2186, -1.5541]);
    return generateRadiusLoopCoordinates(center, route.distanceKm || 30);
  }

  // Fallback default corridor (Nantes to Saint-Nazaire corridor)
  return [
    [47.2184, -1.5536],
    [47.205, -1.6],
    [47.235, -1.72],
    [47.25, -1.86],
    [47.28, -2.05],
    [47.273, -2.18],
    [47.284, -2.208],
  ];
}

interface TrackPointData {
  lat: number;
  lng: number;
  eleM: number;
  distanceMeters: number;
  timestamp: string;
}

/**
 * Prepare uniform track points with elevations and pacing timestamps for any RouteParams + date/time.
 */
function prepareStageTrackPoints(
  route: RouteParams,
  departureDate?: string,
  departureTime?: string
): TrackPointData[] {
  const coords = resolveExportCoordinates(route);
  const speedKmH = Math.max(10, route.targetSpeedKmH || 24);
  const speedMetersPerSec = (speedKmH * 1000) / 3600;

  let profile = route.elevationProfile;
  if (!profile || profile.length < 2) {
    profile = synthesizeRouteElevationProfile(route).elevationProfile;
  }

  let startDate = new Date();
  if (departureDate) {
    const parsedDate = new Date(departureDate);
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate;
    }
  }
  if (departureTime) {
    const [h, m] = departureTime.split(':').map((n) => parseInt(n, 10));
    if (!isNaN(h) && !isNaN(m)) {
      startDate.setHours(h, m, 0, 0);
    }
  }
  const startEpoch = startDate.getTime();

  const cumDists: number[] = [0];
  let totalMeters = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineDistanceMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    totalMeters += d;
    cumDists.push(totalMeters);
  }

  const targetTotalMeters = (route.distanceKm || 30) * 1000;
  const scale = totalMeters > 10 ? targetTotalMeters / totalMeters : 1;

  const getElevationAtDistKm = (distKm: number): number => {
    if (!profile || profile.length === 0) return 20;
    if (distKm <= profile[0].distKm) return profile[0].eleM;
    if (distKm >= profile[profile.length - 1].distKm) return profile[profile.length - 1].eleM;
    for (let j = 1; j < profile.length; j++) {
      if (profile[j].distKm >= distKm) {
        const p0 = profile[j - 1];
        const p1 = profile[j];
        const span = p1.distKm - p0.distKm;
        const ratio = span > 0 ? (distKm - p0.distKm) / span : 0;
        return Number((p0.eleM + (p1.eleM - p0.eleM) * ratio).toFixed(1));
      }
    }
    return 20;
  };

  return coords.map((c, idx) => {
    const distM = cumDists[idx] * scale;
    const distKm = distM / 1000;
    const ele = getElevationAtDistKm(distKm);
    const timeOffsetSec = Math.round(distM / speedMetersPerSec);
    const pointTime = new Date(startEpoch + timeOffsetSec * 1000).toISOString();

    return {
      lat: c[0],
      lng: c[1],
      eleM: ele,
      distanceMeters: Math.round(distM),
      timestamp: pointTime,
    };
  });
}

function prepareTrackPoints(trip: TripProfile): TrackPointData[] {
  return prepareStageTrackPoints(trip.route, trip.departureDate, trip.departureTime);
}

function resolveActivePinnedAmenities(trip: TripProfile): StageAmenity[] {
  if (trip.pinnedAmenities && trip.pinnedAmenities.length > 0) {
    return trip.pinnedAmenities;
  }
  if (trip.stages && trip.stages.length > 0) {
    const activeIdx = Math.max(
      0,
      Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
    );
    return trip.stages[activeIdx]?.pinnedAmenities || [];
  }
  return [];
}

function findNearestTrackPoint(points: TrackPointData[], targetDistKm: number, lat?: number, lng?: number): TrackPointData | undefined {
  if (points.length === 0) return undefined;
  const targetMeters = targetDistKm * 1000;
  let best = points[0];
  let bestDiff = Infinity;

  for (const pt of points) {
    const distDiff = Math.abs(pt.distanceMeters - targetMeters);
    if (distDiff < bestDiff) {
      bestDiff = distDiff;
      best = pt;
    }
  }

  if (lat !== undefined && lng !== undefined && bestDiff > 2000) {
    let bestGeo = Infinity;
    for (const pt of points) {
      const geo = haversineDistanceMeters(lat, lng, pt.lat, pt.lng);
      if (geo < bestGeo) {
        bestGeo = geo;
        best = pt;
      }
    }
  }

  return best;
}

function buildTrackPointsXml(points: TrackPointData[]): string {
  let xml = '';
  for (const p of points) {
    xml += `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">\n`;
    xml += `        <ele>${p.eleM.toFixed(1)}</ele>\n`;
    xml += `        <time>${p.timestamp}</time>\n`;
    xml += `      </trkpt>\n`;
  }
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatGpxPointElement(
  tag: 'wpt' | 'rtept',
  indent: string,
  opts: {
    lat: number;
    lon: number;
    ele?: number;
    time?: string;
    name: string;
    cmt?: string;
    desc?: string;
    sym?: string;
    type?: string;
  }
): string {
  let xml = `${indent}<${tag} lat="${opts.lat.toFixed(6)}" lon="${opts.lon.toFixed(6)}">\n`;
  if (opts.ele !== undefined && Number.isFinite(opts.ele)) {
    xml += `${indent}  <ele>${opts.ele.toFixed(1)}</ele>\n`;
  }
  if (opts.time) {
    xml += `${indent}  <time>${escapeXml(opts.time)}</time>\n`;
  }
  xml += `${indent}  <name>${escapeXml(opts.name)}</name>\n`;
  if (opts.cmt) {
    xml += `${indent}  <cmt>${escapeXml(opts.cmt)}</cmt>\n`;
  }
  if (opts.desc) {
    xml += `${indent}  <desc>${escapeXml(opts.desc)}</desc>\n`;
  }
  if (opts.sym) {
    xml += `${indent}  <sym>${escapeXml(opts.sym)}</sym>\n`;
  }
  if (opts.type) {
    xml += `${indent}  <type>${escapeXml(opts.type)}</type>\n`;
  }
  xml += `${indent}</${tag}>\n`;
  return xml;
}

function buildStageWaypointsXml(params: {
  route: RouteParams;
  points: TrackPointData[];
  pinnedAmenities: StageAmenity[];
  departureTime?: string;
  dayNumber?: number;
  lang: 'en' | 'fr';
}): string {
  const { route, points, pinnedAmenities, departureTime = '08:00', dayNumber, lang } = params;
  const dayTag = dayNumber !== undefined ? `Day ${dayNumber} ` : '';
  const speedKmH = Math.max(10, route.targetSpeedKmH || 24);
  let wptXml = '';

  // 1. Start checkpoint
  if (points.length > 0) {
    const startPt = points[0];
    wptXml += formatGpxPointElement('wpt', '  ', {
      lat: startPt.lat,
      lon: startPt.lng,
      ele: startPt.eleM,
      time: startPt.timestamp,
      name: `${dayTag}Start: ${route.origin || 'Start'}`,
      cmt: `km 0.0 · Start ${departureTime}`,
      desc: `${dayTag}Departure from ${route.origin || 'Start'}`,
      sym: 'Flag, Green',
      type: 'Start',
    });
  }

  // 2. Intermediate via-points (skip any already covered by a pinned amenity at the same spot)
  if (route.waypoints && route.waypoints.length > 0) {
    route.waypoints.forEach((wp, wpIdx) => {
      if (!wp.coordinates) return;
      const matchesPinned = pinnedAmenities.some(
        (p) =>
          wp.sourceAmenityId === p.id ||
          wp.id === `wp-poi-${p.id}` ||
          haversineDistanceMeters(p.lat, p.lon, wp.coordinates![0], wp.coordinates![1]) < 60
      );
      if (matchesPinned) return;

      const distKm = wp.distanceFromStartKm ?? 0;
      const nearPt = findNearestTrackPoint(points, distKm, wp.coordinates[0], wp.coordinates[1]);
      wptXml += formatGpxPointElement('wpt', '  ', {
        lat: wp.coordinates[0],
        lon: wp.coordinates[1],
        ele: nearPt?.eleM,
        time: nearPt?.timestamp,
        name: `${dayTag}Via ${wpIdx + 1}: ${wp.name}`,
        cmt: `KM ${distKm.toFixed(1)}`,
        desc: `${dayTag}Intermediate stop: ${wp.name} (KM ${distKm.toFixed(1)})`,
        sym: 'Flag, Blue',
        type: 'Waypoint',
      });
    });
  }

  // 3. Pinned Resupply Radar POIs (bakeries, water fountains, cemeteries, bike shops)
  for (const amenity of pinnedAmenities) {
    const nearPt = findNearestTrackPoint(points, amenity.routeKm, amenity.lat, amenity.lon);
    const eta = nearPt
      ? new Date(nearPt.timestamp).toISOString().slice(11, 16)
      : undefined;
    const etaDisplay = eta || departureTime;
    const { cmt, desc } = formatAmenityCueNote(amenity, etaDisplay, lang);
    const catLabel = formatAmenityCategoryLabel(amenity.category, lang);

    // Compute accurate local HH:MM ETA from routeKm & speed for display
    const [depH, depM] = departureTime.split(':').map((n) => parseInt(n, 10));
    const depMins = (Number.isFinite(depH) ? depH : 8) * 60 + (Number.isFinite(depM) ? depM : 0);
    const totalMins = (depMins + Math.round((amenity.routeKm / speedKmH) * 60)) % 1440;
    const localEta = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
    const localNote = formatAmenityCueNote(amenity, localEta, lang);

    wptXml += formatGpxPointElement('wpt', '  ', {
      lat: amenity.lat,
      lon: amenity.lon,
      ele: amenity.elevationMeters ?? nearPt?.eleM,
      time: nearPt?.timestamp,
      name: dayNumber !== undefined ? `D${dayNumber} · ${amenity.name}` : amenity.name,
      cmt: dayNumber !== undefined ? `Day ${dayNumber} · ${localNote.cmt}` : localNote.cmt || cmt,
      desc: dayNumber !== undefined ? `Day ${dayNumber} · ${localNote.desc}` : localNote.desc || desc,
      sym: getAmenityGpxSymbol(amenity.category),
      type: catLabel,
    });
  }

  // 4. Finish checkpoint
  if (points.length > 1) {
    const endPt = points[points.length - 1];
    wptXml += formatGpxPointElement('wpt', '  ', {
      lat: endPt.lat,
      lon: endPt.lng,
      ele: endPt.eleM,
      time: endPt.timestamp,
      name: `${dayTag}Finish: ${route.destination || 'Finish'}`,
      cmt: `KM ${(endPt.distanceMeters / 1000).toFixed(1)}`,
      desc: `${dayTag}Arrival at ${route.destination || 'Finish'}`,
      sym: 'Flag, Red',
      type: 'Finish',
    });
  }

  return wptXml;
}

function buildStageCueRouteXml(params: {
  route: RouteParams;
  points: TrackPointData[];
  pinnedAmenities: StageAmenity[];
  departureTime?: string;
  routeName: string;
  routeNumber?: number;
  dayPrefix?: string;
  lang: 'en' | 'fr';
}): string {
  const {
    route,
    points,
    pinnedAmenities,
    departureTime,
    routeName,
    routeNumber,
    dayPrefix,
    lang,
  } = params;
  const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const cueEntries: CueSheetEntry[] = buildStageCueSheet({
    route,
    coords,
    pinnedAmenities,
    departureTime,
    speedKmH: route.targetSpeedKmH || 24,
    dayPrefix,
    lang,
  });

  if (cueEntries.length === 0) return '';

  let rteptsXml = '';
  for (const cue of cueEntries) {
    const nearPt = findNearestTrackPoint(points, cue.distKm, cue.lat, cue.lng);
    rteptsXml += formatGpxPointElement('rtept', '    ', {
      lat: cue.lat,
      lon: cue.lng,
      ele: cue.amenity?.elevationMeters ?? nearPt?.eleM,
      time: nearPt?.timestamp,
      name: cue.shortName,
      cmt: cue.cmt,
      desc: cue.desc,
      sym: cue.sym,
      type: cue.typeLabel,
    });
  }

  const numberXml = routeNumber !== undefined ? `    <number>${routeNumber}</number>\n` : '';
  return `  <rte>\n    <name>${escapeXml(routeName)}</name>\n    <desc>${escapeXml(
    `Turn-by-turn navigation & resupply cue sheet (${cueEntries.length} cues)`
  )}</desc>\n${numberXml}${rteptsXml}  </rte>\n`;
}

/**
 * Generate standard GPX 1.1 XML string ready for Garmin, Wahoo, Hammerhead.
 * Includes all pinned Resupply Radar POIs as <wpt> waypoints and a <rte> turn-by-turn cue sheet.
 */
export function exportTripToGpx(trip: TripProfile): string {
  const lang = getCurrentLanguage();
  const points = prepareTrackPoints(trip);
  const pinnedAmenities = resolveActivePinnedAmenities(trip);
  const trackName =
    trip.name || `${trip.route.origin || 'Start'} → ${trip.route.destination || 'Finish'}`;
  const description =
    trip.description ||
    `${trip.route.distanceKm} km ride · Planned with Cadence Cockpit (bike-trip-engine)`;
  const time = points.length > 0 ? points[0].timestamp : new Date().toISOString();

  const wptXml = buildStageWaypointsXml({
    route: trip.route,
    points,
    pinnedAmenities,
    departureTime: trip.departureTime,
    lang,
  });

  const rteXml = buildStageCueRouteXml({
    route: trip.route,
    points,
    pinnedAmenities,
    departureTime: trip.departureTime,
    routeName: `${trackName} — Cue Sheet`,
    lang,
  });

  const trkptsXml = buildTrackPointsXml(points);

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cadence Cockpit - bike-trip-engine"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(trackName)}</name>
    <desc>${escapeXml(description)}</desc>
    <time>${time}</time>
  </metadata>
${wptXml}${rteXml}  <trk>
    <name>${escapeXml(trackName)}</name>
    <desc>${escapeXml(description)}</desc>
    <trkseg>
${trkptsXml}    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Generate a unified multi-track GPX 1.1 file containing every sequential stage of a Tour,
 * all pinned Resupply Radar <wpt> markers across every stage, and per-stage <rte> turn-by-turn cue sheets.
 */
export function exportEntireTourToGpx(trip: TripProfile): string {
  const stages = resolveLiveStages(trip);
  if (stages.length <= 1) {
    return exportTripToGpx(trip);
  }

  const lang = getCurrentLanguage();
  const totals = getExpeditionTotals(trip);
  const tourName = escapeXml(
    trip.name || `${totals.originCity || 'Tour'} → ${totals.finalDestinationCity || 'Finish'} (${totals.totalDays}d)`
  );
  const tourDesc = escapeXml(
    `${totals.totalDays}-stage Tour · ${totals.totalDistanceKm} km total · +${totals.totalElevationM} m elevation · Exported from Cadence`
  );

  let wptXml = '';
  let rteXml = '';
  let trksXml = '';
  let metadataTime = new Date().toISOString();

  stages.forEach((stage, idx) => {
    const pts = prepareStageTrackPoints(stage.route, stage.departureDate, stage.departureTime);
    if (idx === 0 && pts.length > 0) {
      metadataTime = pts[0].timestamp;
    }

    const stagePinned = stage.pinnedAmenities || [];

    wptXml += buildStageWaypointsXml({
      route: stage.route,
      points: pts,
      pinnedAmenities: stagePinned,
      departureTime: stage.departureTime,
      dayNumber: stage.dayNumber,
      lang,
    });

    rteXml += buildStageCueRouteXml({
      route: stage.route,
      points: pts,
      pinnedAmenities: stagePinned,
      departureTime: stage.departureTime,
      routeName: `Day ${stage.dayNumber} Cue Sheet: ${stage.route.origin || 'Start'} → ${stage.route.destination || 'Finish'}`,
      routeNumber: stage.dayNumber,
      dayPrefix: `D${stage.dayNumber}`,
      lang,
    });

    const stageName = escapeXml(
      `Day ${stage.dayNumber}: ${stage.route.origin || 'Start'} → ${stage.route.destination || 'Finish'} (${stage.route.distanceKm} km)`
    );
    const stageDesc = escapeXml(
      `Stage ${stage.dayNumber}/${stages.length} · ${stage.departureDate} ${stage.departureTime} · +${Math.round(stage.route.elevationGainM || 0)} m`
    );
    const trkptsXml = buildTrackPointsXml(pts);

    trksXml += `  <trk>\n    <name>${stageName}</name>\n    <desc>${stageDesc}</desc>\n    <number>${stage.dayNumber}</number>\n    <trkseg>\n${trkptsXml}    </trkseg>\n  </trk>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cadence Cockpit - Tour Engine"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${tourName}</name>
    <desc>${tourDesc}</desc>
    <time>${metadataTime}</time>
  </metadata>
${wptXml}${rteXml}${trksXml}</gpx>`;
}

/**
 * Generate Garmin TCX Course XML string with course laps, track points,
 * and <CoursePoint> turn-by-turn + pinned resupply cue sheet entries.
 */
export function exportTripToTcx(trip: TripProfile): string {
  const lang = getCurrentLanguage();
  const points = prepareTrackPoints(trip);
  const pinnedAmenities = resolveActivePinnedAmenities(trip);
  const courseName = escapeXml(
    (trip.name || `${trip.route.origin || 'Start'} - ${trip.route.destination || 'Finish'}`).slice(0, 30)
  );
  const totalMeters = points.length > 0 ? points[points.length - 1].distanceMeters : 0;
  const speedKmH = Math.max(10, trip.route.targetSpeedKmH || 24);
  const totalTimeSeconds = Math.round((totalMeters / (speedKmH * 1000)) * 3600);

  const startPt = points[0] || { lat: 47.2186, lng: -1.5541 };
  const endPt = points[points.length - 1] || startPt;

  let trackpointsXml = '';
  for (const p of points) {
    trackpointsXml += `          <Trackpoint>\n`;
    trackpointsXml += `            <Time>${p.timestamp}</Time>\n`;
    trackpointsXml += `            <Position>\n`;
    trackpointsXml += `              <LatitudeDegrees>${p.lat.toFixed(6)}</LatitudeDegrees>\n`;
    trackpointsXml += `              <LongitudeDegrees>${p.lng.toFixed(6)}</LongitudeDegrees>\n`;
    trackpointsXml += `            </Position>\n`;
    trackpointsXml += `            <AltitudeMeters>${p.eleM.toFixed(1)}</AltitudeMeters>\n`;
    trackpointsXml += `            <DistanceMeters>${p.distanceMeters.toFixed(1)}</DistanceMeters>\n`;
    trackpointsXml += `          </Trackpoint>\n`;
  }

  const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const cueEntries = buildStageCueSheet({
    route: trip.route,
    coords,
    pinnedAmenities,
    departureTime: trip.departureTime,
    speedKmH,
    lang,
  });

  let coursePointsXml = '';
  for (const cue of cueEntries) {
    const nearPt = findNearestTrackPoint(points, cue.distKm, cue.lat, cue.lng);
    const cpTime = nearPt?.timestamp || (points[0]?.timestamp ?? new Date().toISOString());
    const cpEle = cue.amenity?.elevationMeters ?? nearPt?.eleM;
    const cpName = escapeXml(cue.shortName.slice(0, 30));
    const cpNotes = escapeXml(cue.desc);

    coursePointsXml += `      <CoursePoint>\n`;
    coursePointsXml += `        <Name>${cpName}</Name>\n`;
    coursePointsXml += `        <Time>${cpTime}</Time>\n`;
    coursePointsXml += `        <Position>\n`;
    coursePointsXml += `          <LatitudeDegrees>${cue.lat.toFixed(6)}</LatitudeDegrees>\n`;
    coursePointsXml += `          <LongitudeDegrees>${cue.lng.toFixed(6)}</LongitudeDegrees>\n`;
    coursePointsXml += `        </Position>\n`;
    if (cpEle !== undefined && Number.isFinite(cpEle)) {
      coursePointsXml += `        <AltitudeMeters>${cpEle.toFixed(1)}</AltitudeMeters>\n`;
    }
    coursePointsXml += `        <PointType>${cue.tcxPointType}</PointType>\n`;
    coursePointsXml += `        <Notes>${cpNotes}</Notes>\n`;
    coursePointsXml += `      </CoursePoint>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Courses>
    <Course>
      <Name>${courseName}</Name>
      <Lap>
        <TotalTimeSeconds>${totalTimeSeconds}</TotalTimeSeconds>
        <DistanceMeters>${totalMeters.toFixed(1)}</DistanceMeters>
        <BeginPosition>
          <LatitudeDegrees>${startPt.lat.toFixed(6)}</LatitudeDegrees>
          <LongitudeDegrees>${startPt.lng.toFixed(6)}</LongitudeDegrees>
        </BeginPosition>
        <EndPosition>
          <LatitudeDegrees>${endPt.lat.toFixed(6)}</LatitudeDegrees>
          <LongitudeDegrees>${endPt.lng.toFixed(6)}</LongitudeDegrees>
        </EndPosition>
        <Intensity>Active</Intensity>
      </Lap>
      <Track>
${trackpointsXml}      </Track>
${coursePointsXml}    </Course>
  </Courses>
</TrainingCenterDatabase>`;
}

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'cadence-route'
  );
}

/**
 * Trigger browser file download for a GPX track file.
 */
export function downloadTripGpx(trip: TripProfile): void {
  const xml = exportTripToGpx(trip);
  const baseName = sanitizeFilename(trip.name || 'cadence-route');
  const filename = `${baseName}-${Math.round(trip.route.distanceKm || 0)}km.gpx`;
  downloadTextFile(xml, filename, 'application/gpx+xml');
}

/**
 * Trigger browser file download for a unified multi-stage Tour GPX track file.
 */
export function downloadEntireTourGpx(trip: TripProfile): void {
  const xml = exportEntireTourToGpx(trip);
  const totals = getExpeditionTotals(trip);
  const baseName = sanitizeFilename(trip.name || 'cadence-tour');
  const filename = `${baseName}-tour-${totals.totalDays}d-${Math.round(totals.totalDistanceKm)}km.gpx`;
  downloadTextFile(xml, filename, 'application/gpx+xml');
}

/**
 * Trigger browser file download for a TCX course file.
 */
export function downloadTripTcx(trip: TripProfile): void {
  const xml = exportTripToTcx(trip);
  const baseName = sanitizeFilename(trip.name || 'cadence-route');
  const filename = `${baseName}-${Math.round(trip.route.distanceKm || 0)}km.tcx`;
  downloadTextFile(xml, filename, 'application/vnd.garmin.tcx+xml');
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
