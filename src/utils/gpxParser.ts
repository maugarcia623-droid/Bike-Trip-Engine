import { ElevationProfilePoint, RouteParams, TerrainSummary } from '../types/trip';
import { computeSurfaceBreakdown } from './surfaceProfile';

export interface GpxWaypoint {
  lat: number;
  lng: number;
  ele?: number;
}

export interface GpxParseResult {
  trackName?: string;
  originLabel: string;
  destLabel: string;
  coordinates: [number, number][];
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  elevationProfile: ElevationProfilePoint[];
  terrainSummary: TerrainSummary;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

function inferSurfaceFromTitle(title: string): 'road' | 'mixed' | 'gravel' {
  const lower = title.toLowerCase();
  if (
    lower.includes('gravel') ||
    lower.includes('grvl') ||
    lower.includes('trail') ||
    lower.includes('sentier') ||
    lower.includes('single') ||
    lower.includes('vtt') ||
    lower.includes('offroad') ||
    lower.includes('forest')
  ) {
    return 'gravel';
  }
  if (
    lower.includes('canal') ||
    lower.includes('voie verte') ||
    lower.includes('loire') ||
    lower.includes('bikepack') ||
    lower.includes('mixed') ||
    lower.includes('halage')
  ) {
    return 'mixed';
  }
  return 'road';
}

function classifyDifficulty(
  distanceKm: number,
  elevationGainM: number,
  maxGradePct: number
): 'easy' | 'moderate' | 'challenging' | 'alpine' {
  const mPerKm = distanceKm > 0 ? elevationGainM / distanceKm : 0;
  if (mPerKm >= 16 || elevationGainM >= 1600 || maxGradePct >= 13) return 'alpine';
  if (mPerKm >= 10 || elevationGainM >= 900 || distanceKm >= 110) return 'challenging';
  if (mPerKm >= 5.5 || elevationGainM >= 400 || distanceKm >= 55) return 'moderate';
  return 'easy';
}

export function buildTerrainSummaryFromProfile(
  profile: ElevationProfilePoint[],
  distanceKm: number,
  elevationGainM: number,
  titleHint: string = '',
  coordinates?: [number, number][]
): TerrainSummary {
  const surfaceBreakdown = computeSurfaceBreakdown({
    origin: titleHint,
    distanceKm,
    elevationGainM,
    elevationProfile: profile,
    coordinates,
  });

  if (!profile || profile.length < 2) {
    return {
      flatPct: 65,
      rollingPct: 25,
      climbPct: 5,
      descentPct: 5,
      maxGradePct: 3.2,
      minEleM: 12,
      maxEleM: Math.max(25, Math.round(12 + elevationGainM * 0.35)),
      surfaceLabel: inferSurfaceFromTitle(titleHint),
      difficultyLevel: classifyDifficulty(distanceKm, elevationGainM, 3.2),
      pavedPct: surfaceBreakdown.pavedPct,
      gravelPct: surfaceBreakdown.gravelPct,
      singletrackPct: surfaceBreakdown.singletrackPct,
      surfaceBreakdown,
    };
  }

  let flatDist = 0;
  let rollingDist = 0;
  let climbDist = 0;
  let descentDist = 0;
  let maxGradePct = 0;
  let minEleM = profile[0].eleM;
  let maxEleM = profile[0].eleM;

  for (let i = 1; i < profile.length; i++) {
    const prev = profile[i - 1];
    const curr = profile[i];
    const segDist = Math.max(0.01, curr.distKm - prev.distKm);
    const g = curr.gradePct;

    if (curr.eleM < minEleM) minEleM = curr.eleM;
    if (curr.eleM > maxEleM) maxEleM = curr.eleM;
    if (g > maxGradePct) maxGradePct = g;

    if (g < -1.5) {
      descentDist += segDist;
    } else if (g <= 1.5) {
      flatDist += segDist;
    } else if (g <= 4.0) {
      rollingDist += segDist;
    } else {
      climbDist += segDist;
    }
  }

  const total = Math.max(0.01, flatDist + rollingDist + climbDist + descentDist);
  const flatPct = Math.round((flatDist / total) * 100);
  const rollingPct = Math.round((rollingDist / total) * 100);
  const climbPct = Math.round((climbDist / total) * 100);
  const descentPct = Math.max(0, 100 - flatPct - rollingPct - climbPct);
  const roundedMaxGrade = Number(Math.max(0.5, maxGradePct).toFixed(1));

  return {
    flatPct,
    rollingPct,
    climbPct,
    descentPct,
    maxGradePct: roundedMaxGrade,
    minEleM: Math.round(minEleM),
    maxEleM: Math.round(maxEleM),
    surfaceLabel: inferSurfaceFromTitle(titleHint),
    difficultyLevel: classifyDifficulty(distanceKm, elevationGainM, roundedMaxGrade),
    pavedPct: surfaceBreakdown.pavedPct,
    gravelPct: surfaceBreakdown.gravelPct,
    singletrackPct: surfaceBreakdown.singletrackPct,
    surfaceBreakdown,
  };
}

/**
 * Deterministic terrain & elevation profile synthesizer for non-GPX routes
 * (OSRM corridors or manual distance loops) so elevation overview and variable
 * sectional energy expenditure always reflect route distance & elevation gain.
 */
export function synthesizeRouteElevationProfile(route: RouteParams): {
  elevationProfile: ElevationProfilePoint[];
  terrainSummary: TerrainSummary;
} {
  if (route.elevationProfile && route.elevationProfile.length >= 3) {
    const summary =
      route.terrainSummary && route.terrainSummary.surfaceBreakdown
        ? route.terrainSummary
        : buildTerrainSummaryFromProfile(
            route.elevationProfile,
            route.distanceKm,
            route.elevationGainM ?? Math.round(route.distanceKm * 6.5),
            `${route.origin || ''} ${route.destination || ''} ${route.gpxFileName || ''}`,
            route.coordinates
          );
    const enrichedProfile = route.elevationProfile.map((pt, idx) => ({
      ...pt,
      surfaceType:
        pt.surfaceType ?? summary.surfaceBreakdown?.pointSurfaces[idx] ?? 'paved',
    }));
    return { elevationProfile: enrichedProfile, terrainSummary: summary };
  }

  const distKm = Math.max(2, route.distanceKm || 30);
  const targetGainM =
    typeof route.elevationGainM === 'number' && route.elevationGainM >= 0
      ? route.elevationGainM
      : Math.round(distKm * 6.5);

  const sampleCount = 48;
  const rawEle: number[] = [];
  const baseEle = 18;
  // Deterministic seed from origin/destination text + distance
  const seedText = `${route.origin || 'start'}-${route.destination || 'end'}-${Math.round(distKm)}`;
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed * 31 + seedText.charCodeAt(i)) % 997;
  }
  const phase1 = (seed % 100) / 100 * Math.PI;
  const phase2 = ((seed * 7) % 100) / 100 * Math.PI;

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const wave =
      0.52 * Math.sin(t * Math.PI * 2.2 + phase1) +
      0.31 * Math.sin(t * Math.PI * 5.4 + phase2) +
      0.17 * Math.sin(t * Math.PI * 9.0 + phase1 * 0.5);
    rawEle.push(wave);
  }

  let rawGain = 0;
  let minRaw = rawEle[0];
  for (let i = 1; i < rawEle.length; i++) {
    if (rawEle[i] > rawEle[i - 1]) rawGain += rawEle[i] - rawEle[i - 1];
    if (rawEle[i] < minRaw) minRaw = rawEle[i];
  }

  const scale = rawGain > 0.001 ? targetGainM / rawGain : 0;
  const profile: ElevationProfilePoint[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const d = Number(((i / sampleCount) * distKm).toFixed(2));
    const ele = Number((baseEle + (rawEle[i] - minRaw) * scale).toFixed(1));
    let gradePct = 0;
    if (i > 0) {
      const prev = profile[i - 1];
      const dMeters = Math.max(25, (d - prev.distKm) * 1000);
      gradePct = Number(
        Math.max(-14, Math.min(16, ((ele - prev.eleM) / dMeters) * 100)).toFixed(1)
      );
    }
    profile.push({ distKm: d, eleM: ele, gradePct });
  }

  const terrainSummary = buildTerrainSummaryFromProfile(
    profile,
    distKm,
    targetGainM,
    `${route.origin || ''} ${route.destination || ''} ${route.gpxFileName || ''}`,
    route.coordinates
  );

  const enrichedProfile = profile.map((pt, idx) => ({
    ...pt,
    surfaceType: terrainSummary.surfaceBreakdown?.pointSurfaces[idx] ?? 'paved',
  }));

  return { elevationProfile: enrichedProfile, terrainSummary };
}

/**
 * Full client-side GPX 1.0 / 1.1 XML parser extracting smoothed elevation profile,
 * hysteresis-filtered D+ / D-, terrain breakdown, track metadata, and compact polyline.
 */
export function parseGpxFileContent(gpxText: string, fileNameHint: string = ''): GpxParseResult {
  const rawPoints: { lat: number; lng: number; ele?: number; cumDistKm: number }[] = [];
  let totalDistKm = 0;
  let rawTrackName = '';

  const pushCandidatePoint = (lat: number, lng: number, parsedEle: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const ele = Number.isFinite(parsedEle) ? parsedEle : undefined;
    if (rawPoints.length > 0) {
      const prev = rawPoints[rawPoints.length - 1];
      const segKm = haversineKm(prev.lat, prev.lng, lat, lng);
      if (segKm < 0.002 && rawPoints.length > 1) {
        return;
      }
      totalDistKm += segKm;
    }
    rawPoints.push({
      lat,
      lng,
      ele,
      cumDistKm: totalDistKm,
    });
  };

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');

    const parserErr = xmlDoc.getElementsByTagName('parsererror');
    if (parserErr && parserErr.length > 0) {
      throw new Error('Invalid GPX XML file format.');
    }

    let ptNodes = Array.from(xmlDoc.getElementsByTagName('trkpt'));
    if (ptNodes.length < 2) {
      ptNodes = Array.from(xmlDoc.getElementsByTagName('rtept'));
    }
    if (ptNodes.length < 2) {
      ptNodes = Array.from(xmlDoc.getElementsByTagName('wpt'));
    }

    for (const pt of ptNodes) {
      const lat = parseFloat(pt.getAttribute('lat') || '');
      const lng = parseFloat(pt.getAttribute('lon') || '');
      const eleNodes = pt.getElementsByTagName('ele');
      const parsedEle = eleNodes.length > 0 ? parseFloat(eleNodes[0].textContent || '') : NaN;
      pushCandidatePoint(lat, lng, parsedEle);
    }

    const trkNodes = xmlDoc.getElementsByTagName('trk');
    const rteNodes = xmlDoc.getElementsByTagName('rte');
    const nameScope = trkNodes[0] || rteNodes[0] || xmlDoc;
    const nameNodes = nameScope.getElementsByTagName('name');
    rawTrackName =
      (nameNodes[0]?.textContent || xmlDoc.getElementsByTagName('name')[0]?.textContent || '').trim();
  } else {
    const ptRegex = /<(?:trkpt|rtept|wpt)\b([^>]*)>([\s\S]*?)<\/(?:trkpt|rtept|wpt)>|<(?:trkpt|rtept|wpt)\b([^>]*)\/>/gi;
    let match: RegExpExecArray | null;
    while ((match = ptRegex.exec(gpxText)) !== null) {
      const attrs = match[1] || match[3] || '';
      const body = match[2] || '';
      const latM = /\blat=["']([^"']+)["']/i.exec(attrs);
      const lonM = /\blon=["']([^"']+)["']/i.exec(attrs);
      const eleM = /<ele>([^<]+)<\/ele>/i.exec(body);
      pushCandidatePoint(
        latM ? parseFloat(latM[1]) : NaN,
        lonM ? parseFloat(lonM[1]) : NaN,
        eleM ? parseFloat(eleM[1]) : NaN
      );
    }
    const nameM = /<name>([^<]+)<\/name>/i.exec(gpxText);
    rawTrackName = nameM ? nameM[1].trim() : '';
  }

  if (rawPoints.length < 2) {
    throw new Error('GPX file contains fewer than 2 valid GPS track points.');
  }

  const cleanFileStem = fileNameHint.replace(/\.gpx$/i, '').replace(/[_-]+/g, ' ').trim();
  const trackName = rawTrackName || cleanFileStem || 'Custom GPX Route';

  // Split trackName if it looks like "Origin -> Destination" or "Origin - Destination"
  let originLabel = `${trackName} (Start)`;
  let destLabel = `${trackName} (Finish)`;
  const arrowParts = trackName.split(/\s*(?:→|->|—|–|\s-\s|\sto\s|\svers\s)\s*/i);
  if (arrowParts.length >= 2 && arrowParts[0].trim() && arrowParts[arrowParts.length - 1].trim()) {
    originLabel = arrowParts[0].trim();
    destLabel = arrowParts[arrowParts.length - 1].trim();
  } else {
    // Check if start and end are within 1.2 km (loop)
    const first = rawPoints[0];
    const last = rawPoints[rawPoints.length - 1];
    const startEndDist = haversineKm(first.lat, first.lng, last.lat, last.lng);
    if (startEndDist < 1.5 && totalDistKm > 4) {
      originLabel = trackName;
      destLabel = `${trackName} (Loop)`;
    }
  }

  const hasElevation = rawPoints.some((p) => p.ele !== undefined);
  const distanceKm = Math.max(0.5, Math.round(totalDistKm * 10) / 10);

  let elevationGainM = 0;
  let elevationLossM = 0;
  let elevationProfile: ElevationProfilePoint[] = [];

  if (hasElevation) {
    // Fill any missing intermediate elevations + apply 5-point moving average smoothing
    let lastKnownEle = rawPoints.find((p) => p.ele !== undefined)?.ele ?? 20;
    const filledEles = rawPoints.map((p) => {
      if (p.ele !== undefined) lastKnownEle = p.ele;
      return lastKnownEle;
    });

    const smoothedEles = filledEles.map((_, idx) => {
      const start = Math.max(0, idx - 2);
      const end = Math.min(filledEles.length - 1, idx + 2);
      let sum = 0;
      for (let k = start; k <= end; k++) sum += filledEles[k];
      return sum / (end - start + 1);
    });

    // Deadband hysteresis (2.0 m) to prevent vertical GPS jitter inflating D+
    let anchorEle = smoothedEles[0];
    for (let i = 1; i < smoothedEles.length; i++) {
      const diff = smoothedEles[i] - anchorEle;
      if (diff >= 2.0) {
        elevationGainM += diff;
        anchorEle = smoothedEles[i];
      } else if (diff <= -2.0) {
        elevationLossM += Math.abs(diff);
        anchorEle = smoothedEles[i];
      }
    }
    // Fallback if deadband was too strict on very short / gentle track
    if (elevationGainM === 0 && smoothedEles.length > 2) {
      for (let i = 1; i < smoothedEles.length; i++) {
        const d = smoothedEles[i] - smoothedEles[i - 1];
        if (d > 0) elevationGainM += d;
        else elevationLossM += Math.abs(d);
      }
    }

    // Build ~72 distance-uniform samples for the elevation chart & physics engine
    const targetSamples = Math.min(72, Math.max(16, rawPoints.length - 1));
    let cursor = 0;
    for (let s = 0; s <= targetSamples; s++) {
      const targetDist = (s / targetSamples) * totalDistKm;
      while (cursor < rawPoints.length - 2 && rawPoints[cursor + 1].cumDistKm < targetDist) {
        cursor++;
      }
      const p0 = rawPoints[cursor];
      const p1 = rawPoints[Math.min(rawPoints.length - 1, cursor + 1)];
      const e0 = smoothedEles[cursor];
      const e1 = smoothedEles[Math.min(smoothedEles.length - 1, cursor + 1)];
      const span = p1.cumDistKm - p0.cumDistKm;
      const ratio = span > 0.0001 ? Math.max(0, Math.min(1, (targetDist - p0.cumDistKm) / span)) : 0;
      const interpEle = Number((e0 + (e1 - e0) * ratio).toFixed(1));
      const distVal = Number(targetDist.toFixed(2));

      let gradePct = 0;
      if (elevationProfile.length > 0) {
        const prevSample = elevationProfile[elevationProfile.length - 1];
        const dMeters = Math.max(20, (distVal - prevSample.distKm) * 1000);
        gradePct = Number(
          Math.max(-22, Math.min(24, ((interpEle - prevSample.eleM) / dMeters) * 100)).toFixed(1)
        );
      }
      elevationProfile.push({ distKm: distVal, eleM: interpEle, gradePct });
    }
  } else {
    // GPX without <ele> tags: synthesize gentle profile at ~6m/km
    elevationGainM = Math.round(distanceKm * 6);
    elevationLossM = elevationGainM;
    elevationProfile = synthesizeRouteElevationProfile({
      distanceKm,
      elevationGainM,
      targetSpeedKmH: 24,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      origin: originLabel,
      destination: destLabel,
    }).elevationProfile;
  }

  // Downsample coordinates to at most 360 points (preserving start, peak, and finish)
  const maxCoords = 360;
  let coordinates: [number, number][];
  if (rawPoints.length <= maxCoords) {
    coordinates = rawPoints.map((p) => [Number(p.lat.toFixed(5)), Number(p.lng.toFixed(5))]);
  } else {
    let peakIdx = 0;
    let peakEle = -Infinity;
    rawPoints.forEach((p, idx) => {
      if ((p.ele ?? -Infinity) > peakEle) {
        peakEle = p.ele ?? -Infinity;
        peakIdx = idx;
      }
    });

    const selectedIndices = new Set<number>([0, rawPoints.length - 1]);
    if (peakIdx > 0) selectedIndices.add(peakIdx);
    const step = (rawPoints.length - 1) / (maxCoords - 1);
    for (let i = 1; i < maxCoords - 1; i++) {
      selectedIndices.add(Math.round(i * step));
    }
    coordinates = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((idx) => [
        Number(rawPoints[idx].lat.toFixed(5)),
        Number(rawPoints[idx].lng.toFixed(5)),
      ]);
  }

  const roundedGain = Math.round(elevationGainM);
  const roundedLoss = Math.round(elevationLossM);
  const terrainSummary = buildTerrainSummaryFromProfile(
    elevationProfile,
    distanceKm,
    roundedGain,
    `${trackName} ${fileNameHint}`,
    coordinates
  );
  elevationProfile = elevationProfile.map((pt, idx) => ({
    ...pt,
    surfaceType: terrainSummary.surfaceBreakdown?.pointSurfaces[idx] ?? 'paved',
  }));

  return {
    trackName,
    originLabel,
    destLabel,
    coordinates,
    distanceKm,
    elevationGainM: roundedGain,
    elevationLossM: roundedLoss,
    elevationProfile,
    terrainSummary,
  };
}
