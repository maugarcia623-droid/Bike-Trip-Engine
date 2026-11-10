import { TripProfile, RouteParams, ElevationProfilePoint } from '../types/trip';
import { synthesizeRouteElevationProfile } from './gpxParser';

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
  // Total circumference of circle C = 2 * PI * R => R = C / (2 * PI)
  // We use an elliptical / clover shape that starts and ends at [lat0, lng0]
  const radiusKm = targetDist / (2 * Math.PI);
  // 1 deg lat ~ 111.0 km, 1 deg lng ~ 111.0 * cos(lat) km
  const latKmPerDeg = 111.0;
  const lngKmPerDeg = 111.0 * Math.cos((lat0 * Math.PI) / 180);

  const coords: [number, number][] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * 2 * Math.PI;
    // Circular loop offset with slight natural variation so it begins and ends at [lat0, lng0]
    // Shape: offset circle touching origin at t = 0 and t = 2*PI
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
    const center: [number, number] = route.originCoords ||
      (route.coordinates && route.coordinates.length > 0 ? route.coordinates[0] : [47.2186, -1.5541]);
    return generateRadiusLoopCoordinates(center, route.distanceKm || 30);
  }

  // Fallback default corridor (Nantes to Saint-Nazaire corridor)
  const defaultBase: [number, number][] = [
    [47.2184, -1.5536],
    [47.2050, -1.6000],
    [47.2350, -1.7200],
    [47.2500, -1.8600],
    [47.2800, -2.0500],
    [47.2730, -2.1800],
    [47.2840, -2.2080],
  ];

  return defaultBase;
}

/**
 * Compute haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface TrackPointData {
  lat: number;
  lng: number;
  eleM: number;
  distanceMeters: number;
  timestamp: string;
}

/**
 * Prepare uniform track points with elevations and pacing timestamps.
 */
function prepareTrackPoints(trip: TripProfile): TrackPointData[] {
  const coords = resolveExportCoordinates(trip.route);
  const speedKmH = Math.max(10, trip.route.targetSpeedKmH || 24);
  const speedMetersPerSec = (speedKmH * 1000) / 3600;

  // Resolve elevation profile
  let profile = trip.route.elevationProfile;
  if (!profile || profile.length < 2) {
    profile = synthesizeRouteElevationProfile(trip.route).elevationProfile;
  }

  // Parse start time
  let startDate = new Date();
  if (trip.departureDate) {
    const parsedDate = new Date(trip.departureDate);
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate;
    }
  }
  if (trip.departureTime) {
    const [h, m] = trip.departureTime.split(':').map((n) => parseInt(n, 10));
    if (!isNaN(h) && !isNaN(m)) {
      startDate.setHours(h, m, 0, 0);
    }
  }
  const startEpoch = startDate.getTime();

  // Compute cumulative distances
  const cumDists: number[] = [0];
  let totalMeters = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    totalMeters += d;
    cumDists.push(totalMeters);
  }

  // If coords total distance differs from trip.route.distanceKm, scale distances
  const targetTotalMeters = (trip.route.distanceKm || 30) * 1000;
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

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate standard GPX 1.1 XML string ready for Garmin, Wahoo, Hammerhead.
 */
export function exportTripToGpx(trip: TripProfile): string {
  const points = prepareTrackPoints(trip);
  const trackName = escapeXml(trip.name || `${trip.route.origin || 'Start'} → ${trip.route.destination || 'Finish'}`);
  const description = escapeXml(
    trip.description ||
      `${trip.route.distanceKm} km ride · Planned with Cadence Cockpit (bike-trip-engine)`
  );
  const time = points.length > 0 ? points[0].timestamp : new Date().toISOString();

  let trkptsXml = '';
  for (const p of points) {
    trkptsXml += `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">\n`;
    trkptsXml += `        <ele>${p.eleM.toFixed(1)}</ele>\n`;
    trkptsXml += `        <time>${p.timestamp}</time>\n`;
    trkptsXml += `      </trkpt>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cadence Cockpit - bike-trip-engine"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${trackName}</name>
    <desc>${description}</desc>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <desc>${description}</desc>
    <trkseg>
${trkptsXml}    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Generate Garmin TCX Course XML string with course laps and track points.
 */
export function exportTripToTcx(trip: TripProfile): string {
  const points = prepareTrackPoints(trip);
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
    </Course>
  </Courses>
</TrainingCenterDatabase>`;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'cadence-route';
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
