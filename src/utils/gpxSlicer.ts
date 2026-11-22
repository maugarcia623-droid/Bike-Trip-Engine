import {
  ElevationProfilePoint,
  PhysicsParams,
  RouteParams,
  TripProfile,
  TripStage,
  WeatherCondition,
} from '../types/trip';
import {
  buildTerrainSummaryFromProfile,
  synthesizeRouteElevationProfile,
} from './gpxParser';
import { calculatePhysics } from './physics';
import {
  addDaysToIso,
  downsampleCoordinates,
  formatDurationHoursMins,
  resolveLiveStages,
} from './stageManager';
import {
  getSolarEphemeris,
  hhmmToMinutes,
  minutesToHHMM,
} from './solarVisibility';
import { checkForecastHorizon, getLocalTodayIso } from '../services/weatherService';
import { Language } from '../context/LanguageContext';

export type StageSliceBalanceMode = 'effort' | 'distance';

/**
 * Distinct, high-contrast per-day stage colors legible on both Light Gray and Dark Gray basemaps.
 */
export const STAGE_COLORS: readonly string[] = [
  '#10B981', // Day 1: Emerald
  '#3B82F6', // Day 2: Electric Blue
  '#F59E0B', // Day 3: Amber
  '#8B5CF6', // Day 4: Violet
  '#EC4899', // Day 5: Rose
  '#06B6D4', // Day 6: Cyan
  '#EF4444', // Day 7: Coral Red
  '#84CC16', // Day 8: Volt Lime
  '#F97316', // Day 9: Orange
  '#6366F1', // Day 10: Indigo
];

export function getStageColor(dayIndexZeroBased: number): string {
  return STAGE_COLORS[((dayIndexZeroBased % STAGE_COLORS.length) + STAGE_COLORS.length) % STAGE_COLORS.length];
}

export interface FullTourSpine {
  coordinates: [number, number][];
  /** Cumulative distance (km) aligned 1:1 with coordinates, normalized onto [0, totalDistanceKm]. */
  coordDistKm: number[];
  totalDistanceKm: number;
  elevationProfile: ElevationProfilePoint[];
  totalElevationGainM: number;
  totalElevationLossM: number;
  originLabel: string;
  destLabel: string;
  /** If reconstructed from an existing multi-stage tour, preserves the existing cut distances (km). */
  initialCutDistancesKm?: number[];
  /** Existing overnight stop labels aligned with initialCutDistancesKm. */
  initialCutLabels?: string[];
  /** Existing accommodation notes per stage (index 0..N-1). */
  initialAccommodationNotes?: (string | undefined)[];
  gpxFileName?: string;
}

export interface SlicedStagePreview {
  dayNumber: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minEleM: number;
  maxEleM: number;
  coordinates: [number, number][];
  elevationProfile: ElevationProfilePoint[];
  originCoords: [number, number];
  destCoords: [number, number];
  originLabel: string;
  destLabel: string;
  departureDate: string;
  departureTime: string;
  movingTimeMinutes: number;
  movingTimeFormatted: string;
  estimatedArrivalHHMM: string;
  sunsetHHMM: string;
  arrivesAfterSunset: boolean;
  arrivesNearSunset: boolean;
  effortEquivalentKm: number;
  color: string;
  accommodationNote?: string;
}

export interface SlicePreviewOptions {
  startDateIso: string;
  dailyStartTime: string;
  physics: PhysicsParams;
  targetSpeedKmH: number;
  weather: WeatherCondition;
  lang: Language;
  ftpWatts?: number;
  /** Optional custom labels for each cut point (length = cutDistancesKm.length). */
  cutLabels?: Record<number, string>;
  /** Optional override for Day 1 origin label (e.g. reverse-geocoded town name instead of GPX filename). */
  originLabelOverride?: string;
  /** Optional override for Final Day destination label. */
  destLabelOverride?: string;
  /** Optional accommodation notes for each overnight cut (index = cutIndex 0..cuts-1). */
  cutAccommodationNotes?: Record<number, string>;
  /** Extra stop/rest buffer minutes per day (e.g. lunch + coffee + resupply, default 45 min). */
  dailyStopBufferMinutes?: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function buildNormalizedCoordDistances(
  coords: [number, number][],
  targetTotalKm: number
): number[] {
  const raw: number[] = [0];
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    raw.push(sum);
  }
  const safeTotal = targetTotalKm > 0.1 ? targetTotalKm : Math.max(0.5, sum);
  if (sum <= 0.0001) {
    return coords.map((_, idx) =>
      coords.length > 1 ? (idx / (coords.length - 1)) * safeTotal : 0
    );
  }
  const scale = safeTotal / sum;
  return raw.map((d, idx) => (idx === raw.length - 1 ? safeTotal : d * scale));
}

function normalizeElevationProfileToSpan(
  profile: ElevationProfilePoint[],
  totalDistanceKm: number
): ElevationProfilePoint[] {
  if (!profile || profile.length < 2) {
    return [
      { distKm: 0, eleM: 20, gradePct: 0 },
      { distKm: Number(totalDistanceKm.toFixed(3)), eleM: 20, gradePct: 0 },
    ];
  }
  const lastDist = profile[profile.length - 1].distKm;
  const scale = lastDist > 0.01 ? totalDistanceKm / lastDist : 1;
  return profile.map((pt, idx) => ({
    ...pt,
    distKm:
      idx === 0
        ? 0
        : idx === profile.length - 1
        ? Number(totalDistanceKm.toFixed(3))
        : Number((pt.distKm * scale).toFixed(3)),
  }));
}

/**
 * Computes raw positive/negative elevation change on a profile slice using the same 2.0 m
 * hysteresis deadband as gpxParser.ts, with a gentle fallback if deadband yields zero.
 */
function measureProfileGainLoss(profile: ElevationProfilePoint[]): { gainM: number; lossM: number } {
  if (profile.length < 2) return { gainM: 0, lossM: 0 };
  let gain = 0;
  let loss = 0;
  let anchor = profile[0].eleM;
  for (let i = 1; i < profile.length; i++) {
    const diff = profile[i].eleM - anchor;
    if (diff >= 2.0) {
      gain += diff;
      anchor = profile[i].eleM;
    } else if (diff <= -2.0) {
      loss += Math.abs(diff);
      anchor = profile[i].eleM;
    }
  }
  if (gain === 0 && loss === 0 && profile.length >= 2) {
    for (let i = 1; i < profile.length; i++) {
      const d = profile[i].eleM - profile[i - 1].eleM;
      if (d > 0) gain += d;
      else loss += Math.abs(d);
    }
  }
  return { gainM: gain, lossM: loss };
}

/**
 * Extracts a single contiguous FullTourSpine from either a single-stage GPX/corridor trip
 * or an already sliced multi-stage Tour (so existing tours can be re-sliced seamlessly).
 */
export function extractFullTourSpine(trip: TripProfile): FullTourSpine | null {
  const stages = resolveLiveStages(trip);
  const routedStages = stages.filter(
    (st) => Boolean(st.route?.coordinates && st.route.coordinates.length >= 2)
  );
  if (routedStages.length === 0) return null;

  // Single routed stage (either a single-day trip OR a newly toggled Tour with an empty Day 2 placeholder)
  if (routedStages.length === 1) {
    const route = routedStages[0].route;
    const coords = route.coordinates!;
    const totalDistanceKm = Math.max(0.5, Number((route.distanceKm || 0).toFixed(1)));
    if (totalDistanceKm < 5) return null;

    const synth = synthesizeRouteElevationProfile(route);
    const elevationProfile = normalizeElevationProfileToSpan(
      synth.elevationProfile,
      totalDistanceKm
    );
    const measured = measureProfileGainLoss(elevationProfile);
    const totalElevationGainM =
      typeof route.elevationGainM === 'number' && route.elevationGainM >= 0
        ? Math.round(route.elevationGainM)
        : Math.round(measured.gainM);
    const totalElevationLossM =
      typeof route.elevationLossM === 'number' && route.elevationLossM >= 0
        ? Math.round(route.elevationLossM)
        : Math.round(measured.lossM);

    return {
      coordinates: coords.map((c) => [c[0], c[1]]),
      coordDistKm: buildNormalizedCoordDistances(coords, totalDistanceKm),
      totalDistanceKm,
      elevationProfile,
      totalElevationGainM,
      totalElevationLossM,
      originLabel: route.origin || trip.name || 'Start',
      destLabel: route.destination || 'Finish',
      gpxFileName: route.gpxFileName,
    };
  }

  // Multi-stage trip with 2+ routed stages: stitch them back into a single full spine
  const stitchedCoords: [number, number][] = [];
  const stitchedProfile: ElevationProfilePoint[] = [];
  const initialCutDistancesKm: number[] = [];
  const initialCutLabels: string[] = [];
  const initialAccommodationNotes: (string | undefined)[] = [];

  let cumDistOffset = 0;
  let totalGainM = 0;
  let totalLossM = 0;

  for (let s = 0; s < routedStages.length; s++) {
    const stage = routedStages[s];
    const r = stage.route;
    const stageCoords = r.coordinates!;

    const stageDistKm = Math.max(0.5, Number((r.distanceKm || 0).toFixed(1)));
    const stageSynth = synthesizeRouteElevationProfile(r);
    const stageProfile = normalizeElevationProfileToSpan(
      stageSynth.elevationProfile,
      stageDistKm
    );
    const stageMeasured = measureProfileGainLoss(stageProfile);
    totalGainM +=
      typeof r.elevationGainM === 'number' && r.elevationGainM >= 0
        ? r.elevationGainM
        : stageMeasured.gainM;
    totalLossM +=
      typeof r.elevationLossM === 'number' && r.elevationLossM >= 0
        ? r.elevationLossM
        : stageMeasured.lossM;

    for (let i = 0; i < stageCoords.length; i++) {
      const pt = stageCoords[i];
      if (i === 0 && stitchedCoords.length > 0) {
        const prev = stitchedCoords[stitchedCoords.length - 1];
        if (haversineKm(prev[0], prev[1], pt[0], pt[1]) < 0.05) {
          continue;
        }
      }
      stitchedCoords.push([pt[0], pt[1]]);
    }

    for (let i = 0; i < stageProfile.length; i++) {
      const pt = stageProfile[i];
      if (i === 0 && stitchedProfile.length > 0) {
        continue;
      }
      stitchedProfile.push({
        ...pt,
        distKm: Number((cumDistOffset + pt.distKm).toFixed(3)),
      });
    }

    cumDistOffset += stageDistKm;
    initialAccommodationNotes.push(stage.accommodationNote);

    if (s < routedStages.length - 1) {
      initialCutDistancesKm.push(Number(cumDistOffset.toFixed(1)));
      initialCutLabels.push(r.destination || routedStages[s + 1]?.route?.origin || '');
    }
  }

  const totalDistanceKm = Math.max(0.5, Number(cumDistOffset.toFixed(1)));
  if (stitchedCoords.length < 2 || totalDistanceKm < 5) return null;

  return {
    coordinates: stitchedCoords,
    coordDistKm: buildNormalizedCoordDistances(stitchedCoords, totalDistanceKm),
    totalDistanceKm,
    elevationProfile: stitchedProfile,
    totalElevationGainM: Math.round(totalGainM),
    totalElevationLossM: Math.round(totalLossM),
    originLabel: routedStages[0]?.route?.origin || trip.name || 'Start',
    destLabel: routedStages[routedStages.length - 1]?.route?.destination || 'Finish',
    initialCutDistancesKm,
    initialCutLabels,
    initialAccommodationNotes,
    gpxFileName: routedStages[0]?.route?.gpxFileName || trip.route.gpxFileName,
  };
}

/**
 * Recommends a sensible bikepacking day count (2..10) given total distance & elevation gain.
 * 400 km / ~2000 m D+ -> 3 days; 400 km / ~5000 m D+ (alpine) -> 4 days; 140 km -> 2 days.
 */
export function suggestDayCount(totalDistanceKm: number, totalElevationGainM: number = 0): number {
  const effortKm = Math.max(0, totalDistanceKm) + (Math.max(0, totalElevationGainM) / 1000) * 25;
  return Math.max(2, Math.min(10, Math.round(effortKm / 135)));
}

/**
 * Minimum distance (km) enforced per stage so handles never collapse or overlap.
 */
export function getMinStageDistanceKm(totalDistanceKm: number, dayCount: number): number {
  const safeDays = Math.max(2, dayCount);
  return Math.max(1, Math.min(10, Number((totalDistanceKm / (safeDays * 3)).toFixed(1))));
}

/**
 * Ensures cuts are strictly ascending, bounded within [minStageKm, total - minStageKm],
 * and separated by at least minStageKm.
 */
export function clampAndSortCuts(
  cutsKm: number[],
  totalDistanceKm: number,
  minStageKm?: number
): number[] {
  const count = cutsKm.length;
  if (count === 0) return [];
  const gap = minStageKm ?? getMinStageDistanceKm(totalDistanceKm, count + 1);
  const sorted = [...cutsKm].sort((a, b) => a - b);

  // Forward pass: enforce lower bound and spacing from previous cut
  for (let i = 0; i < count; i++) {
    const lower = i === 0 ? gap : sorted[i - 1] + gap;
    const upper = totalDistanceKm - gap * (count - i);
    sorted[i] = Math.max(lower, Math.min(upper, sorted[i]));
  }

  // Backward pass: ensure no cut exceeded its upper bound after forward pushes
  for (let i = count - 1; i >= 0; i--) {
    const upper = i === count - 1 ? totalDistanceKm - gap : sorted[i + 1] - gap;
    const lower = gap * (i + 1);
    sorted[i] = Math.max(lower, Math.min(upper, sorted[i]));
  }

  return sorted.map((v) => Number(v.toFixed(1)));
}

/**
 * Moves a single cut handle to `targetKm` while strictly preserving ordering between neighbors.
 */
export function moveSingleCut(
  cutsKm: number[],
  cutIndex: number,
  targetKm: number,
  totalDistanceKm: number
): number[] {
  if (cutIndex < 0 || cutIndex >= cutsKm.length) return cutsKm;
  const gap = getMinStageDistanceKm(totalDistanceKm, cutsKm.length + 1);
  const minAllowed = cutIndex === 0 ? gap : cutsKm[cutIndex - 1] + gap;
  const maxAllowed =
    cutIndex === cutsKm.length - 1 ? totalDistanceKm - gap : cutsKm[cutIndex + 1] - gap;
  const clamped = Math.max(minAllowed, Math.min(maxAllowed, targetKm));
  const next = [...cutsKm];
  next[cutIndex] = Number(clamped.toFixed(1));
  return next;
}

/**
 * Computes `dayCount - 1` cut distances in km.
 * - 'distance': equal kilometers per day.
 * - 'effort': equal climbing-weighted effort per day (100 m positive climb = +8 km equivalent),
 *   so mountainous days are automatically shorter than flat days.
 */
export function computeDefaultCutDistances(
  spine: FullTourSpine,
  dayCount: number,
  mode: StageSliceBalanceMode = 'effort'
): number[] {
  const safeDays = Math.max(2, Math.min(10, Math.round(dayCount)));
  const cutsNeeded = safeDays - 1;
  const totalKm = spine.totalDistanceKm;

  if (mode === 'distance' || spine.elevationProfile.length < 3) {
    const equalCuts: number[] = [];
    for (let k = 1; k <= cutsNeeded; k++) {
      equalCuts.push((k / safeDays) * totalKm);
    }
    return clampAndSortCuts(equalCuts, totalKm);
  }

  // Build cumulative climbing-weighted effort along elevationProfile
  const profile = spine.elevationProfile;
  const cumEffort: number[] = [0];
  let totalEffort = 0;

  for (let i = 1; i < profile.length; i++) {
    const dKm = Math.max(0, profile[i].distKm - profile[i - 1].distKm);
    const dEle = Math.max(0, profile[i].eleM - profile[i - 1].eleM);
    // 100 m climbing ≈ 8 km flat effort
    totalEffort += dKm + (dEle / 100) * 8;
    cumEffort.push(totalEffort);
  }

  if (totalEffort <= 0.01) {
    const fallback: number[] = [];
    for (let k = 1; k <= cutsNeeded; k++) {
      fallback.push((k / safeDays) * totalKm);
    }
    return clampAndSortCuts(fallback, totalKm);
  }

  const cuts: number[] = [];
  let cursor = 0;
  for (let k = 1; k <= cutsNeeded; k++) {
    const targetEffort = (k / safeDays) * totalEffort;
    while (cursor < cumEffort.length - 2 && cumEffort[cursor + 1] < targetEffort) {
      cursor++;
    }
    const e0 = cumEffort[cursor];
    const e1 = cumEffort[Math.min(cumEffort.length - 1, cursor + 1)];
    const d0 = profile[cursor].distKm;
    const d1 = profile[Math.min(profile.length - 1, cursor + 1)].distKm;
    const ratio = e1 - e0 > 0.0001 ? Math.max(0, Math.min(1, (targetEffort - e0) / (e1 - e0))) : 0;
    cuts.push(d0 + (d1 - d0) * ratio);
  }

  return clampAndSortCuts(cuts, totalKm);
}

/**
 * Linearly interpolates [lat, lng] at an arbitrary distance (km) along the spine.
 */
export function interpolateCoordAtDistance(
  spine: FullTourSpine,
  targetKm: number
): [number, number] {
  const { coordinates, coordDistKm } = spine;
  if (coordinates.length === 0) return [47.2184, -1.5536];
  if (coordinates.length === 1 || targetKm <= coordDistKm[0]) {
    return [coordinates[0][0], coordinates[0][1]];
  }
  const lastIdx = coordinates.length - 1;
  if (targetKm >= coordDistKm[lastIdx]) {
    return [coordinates[lastIdx][0], coordinates[lastIdx][1]];
  }

  // Binary search for segment containing targetKm
  let lo = 0;
  let hi = lastIdx;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (coordDistKm[mid] <= targetKm) lo = mid;
    else hi = mid;
  }

  const d0 = coordDistKm[lo];
  const d1 = coordDistKm[hi];
  const ratio = d1 - d0 > 1e-6 ? Math.max(0, Math.min(1, (targetKm - d0) / (d1 - d0))) : 0;
  const lat = coordinates[lo][0] + (coordinates[hi][0] - coordinates[lo][0]) * ratio;
  const lng = coordinates[lo][1] + (coordinates[hi][1] - coordinates[lo][1]) * ratio;
  return [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
}

/**
 * Linearly interpolates elevation (m) at an arbitrary distance (km) along an elevation profile.
 */
export function interpolateElevationAtDistance(
  profile: ElevationProfilePoint[],
  targetKm: number
): { eleM: number; gradePct: number } {
  if (profile.length === 0) return { eleM: 20, gradePct: 0 };
  if (profile.length === 1 || targetKm <= profile[0].distKm) {
    return { eleM: profile[0].eleM, gradePct: profile[0].gradePct };
  }
  const lastIdx = profile.length - 1;
  if (targetKm >= profile[lastIdx].distKm) {
    return { eleM: profile[lastIdx].eleM, gradePct: profile[lastIdx].gradePct };
  }

  let lo = 0;
  let hi = lastIdx;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (profile[mid].distKm <= targetKm) lo = mid;
    else hi = mid;
  }

  const p0 = profile[lo];
  const p1 = profile[hi];
  const span = p1.distKm - p0.distKm;
  const ratio = span > 1e-6 ? Math.max(0, Math.min(1, (targetKm - p0.distKm) / span)) : 0;
  return {
    eleM: Number((p0.eleM + (p1.eleM - p0.eleM) * ratio).toFixed(1)),
    gradePct: Number((p0.gradePct + (p1.gradePct - p0.gradePct) * ratio).toFixed(1)),
  };
}

/**
 * Projects a geographic [lat, lng] onto the closest distance (km) on the spine,
 * optionally constrained to [minKm, maxKm] (crucial for closed loops & ordered handles).
 */
export function findNearestDistanceOnSpine(
  spine: FullTourSpine,
  lat: number,
  lng: number,
  minKm: number = 0,
  maxKm: number = spine.totalDistanceKm
): { distKm: number; offRouteKm: number; coord: [number, number] } {
  const { coordinates, coordDistKm } = spine;
  const clampedMin = Math.max(0, Math.min(minKm, spine.totalDistanceKm));
  const clampedMax = Math.max(clampedMin, Math.min(maxKm, spine.totalDistanceKm));

  let bestDistKm = (clampedMin + clampedMax) / 2;
  let bestOffRouteKm = Infinity;
  let bestCoord = interpolateCoordAtDistance(spine, bestDistKm);

  for (let i = 0; i < coordinates.length; i++) {
    const dKm = coordDistKm[i];
    if (dKm < clampedMin || dKm > clampedMax) continue;
    const dist = haversineKm(lat, lng, coordinates[i][0], coordinates[i][1]);
    if (dist < bestOffRouteKm) {
      bestOffRouteKm = dist;
      bestDistKm = dKm;
      bestCoord = coordinates[i];
    }
  }

  // Also check exact boundaries in case no discrete vertex falls inside [clampedMin, clampedMax]
  for (const boundKm of [clampedMin, clampedMax]) {
    const c = interpolateCoordAtDistance(spine, boundKm);
    const dist = haversineKm(lat, lng, c[0], c[1]);
    if (dist < bestOffRouteKm) {
      bestOffRouteKm = dist;
      bestDistKm = boundKm;
      bestCoord = c;
    }
  }

  return {
    distKm: Number(bestDistKm.toFixed(1)),
    offRouteKm: Number(bestOffRouteKm.toFixed(2)),
    coord: bestCoord,
  };
}

function sliceCoordinatesRange(
  spine: FullTourSpine,
  startKm: number,
  endKm: number
): [number, number][] {
  const startCoord = interpolateCoordAtDistance(spine, startKm);
  const endCoord = interpolateCoordAtDistance(spine, endKm);
  const out: [number, number][] = [startCoord];

  for (let i = 0; i < spine.coordinates.length; i++) {
    const d = spine.coordDistKm[i];
    if (d > startKm + 0.005 && d < endKm - 0.005) {
      out.push([spine.coordinates[i][0], spine.coordinates[i][1]]);
    }
  }

  const last = out[out.length - 1];
  if (haversineKm(last[0], last[1], endCoord[0], endCoord[1]) > 0.002 || out.length < 2) {
    out.push(endCoord);
  }
  return out;
}

function sliceElevationProfileRange(
  profile: ElevationProfilePoint[],
  startKm: number,
  endKm: number
): ElevationProfilePoint[] {
  const spanKm = Math.max(0.1, endKm - startKm);
  const startVal = interpolateElevationAtDistance(profile, startKm);
  const endVal = interpolateElevationAtDistance(profile, endKm);

  const sliced: ElevationProfilePoint[] = [
    { distKm: 0, eleM: startVal.eleM, gradePct: 0 },
  ];

  for (const pt of profile) {
    if (pt.distKm > startKm + 0.005 && pt.distKm < endKm - 0.005) {
      sliced.push({
        distKm: Number((pt.distKm - startKm).toFixed(3)),
        eleM: pt.eleM,
        gradePct: pt.gradePct,
        surfaceType: pt.surfaceType,
      });
    }
  }

  sliced.push({
    distKm: Number(spanKm.toFixed(3)),
    eleM: endVal.eleM,
    gradePct: endVal.gradePct,
  });

  // If sparse (e.g. short stage), resample to 28 clean points for crisp rendering
  if (sliced.length < 24) {
    const resampled: ElevationProfilePoint[] = [];
    const samples = 28;
    for (let i = 0; i <= samples; i++) {
      const localDist = (i / samples) * spanKm;
      const interp = interpolateElevationAtDistance(sliced, localDist);
      let gradePct = 0;
      if (i > 0) {
        const prev = resampled[i - 1];
        const dMeters = Math.max(20, (localDist - prev.distKm) * 1000);
        gradePct = Number(
          Math.max(-22, Math.min(24, ((interp.eleM - prev.eleM) / dMeters) * 100)).toFixed(1)
        );
      }
      resampled.push({
        distKm: Number(localDist.toFixed(3)),
        eleM: interp.eleM,
        gradePct,
      });
    }
    return resampled;
  }

  return sliced;
}

/**
 * Computes rich per-stage previews (coordinates, re-zeroed elevation profile, proportional D+/D-,
 * realistic physics moving time, arrival vs. sunset) for a set of cut distances.
 */
export function sliceRouteIntoStagePreviews(
  spine: FullTourSpine,
  rawCutDistancesKm: number[],
  options: SlicePreviewOptions
): SlicedStagePreview[] {
  const cuts = clampAndSortCuts(rawCutDistancesKm, spine.totalDistanceKm);
  const boundaries = [0, ...cuts, spine.totalDistanceKm];
  const stopBufferMin = options.dailyStopBufferMinutes ?? 45;
  const startDateBase =
    options.startDateIso && /^\d{4}-\d{2}-\d{2}$/.test(options.startDateIso)
      ? options.startDateIso
      : getLocalTodayIso();
  const dailyStart = options.dailyStartTime || '08:30';
  const startMinutes = hhmmToMinutes(dailyStart);

  // First pass: slice geometry & measure raw elevation gains so we can preserve total D+ faithfully
  const rawSlices = [];
  let sumRawGain = 0;
  let sumRawLoss = 0;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startKm = boundaries[i];
    const endKm = boundaries[i + 1];
    const distKm = Math.max(0.5, Number((endKm - startKm).toFixed(1)));
    const coords = sliceCoordinatesRange(spine, startKm, endKm);
    const profile = sliceElevationProfileRange(spine.elevationProfile, startKm, endKm);
    const measured = measureProfileGainLoss(profile);
    sumRawGain += measured.gainM;
    sumRawLoss += measured.lossM;
    rawSlices.push({ startKm, endKm, distKm, coords, profile, measured });
  }

  // Gently scale stage gains/losses to match original full-res GPX D+ / D- (clamped [0.8, 1.35])
  const gainScale =
    sumRawGain > 1 && spine.totalElevationGainM > 0
      ? Math.max(0.8, Math.min(1.35, spine.totalElevationGainM / sumRawGain))
      : 1;
  const lossScale =
    sumRawLoss > 1 && spine.totalElevationLossM > 0
      ? Math.max(0.8, Math.min(1.35, spine.totalElevationLossM / sumRawLoss))
      : 1;

  const isFr = options.lang === 'fr';
  const previews: SlicedStagePreview[] = [];

  for (let i = 0; i < rawSlices.length; i++) {
    const s = rawSlices[i];
    const dayNumber = i + 1;
    const departureDate = i === 0 ? startDateBase : addDaysToIso(startDateBase, i);
    const elevationGainM = Math.round(s.measured.gainM * gainScale);
    const elevationLossM = Math.round(s.measured.lossM * lossScale);

    let minEleM = s.profile[0]?.eleM ?? 0;
    let maxEleM = minEleM;
    for (const pt of s.profile) {
      if (pt.eleM < minEleM) minEleM = pt.eleM;
      if (pt.eleM > maxEleM) maxEleM = pt.eleM;
    }

    const originLabel =
      i === 0
        ? options.originLabelOverride?.trim() || spine.originLabel
        : options.cutLabels?.[i - 1]?.trim() ||
          (isFr ? `Étape ${i} (km ${Math.round(s.startKm)})` : `Stop ${i} (km ${Math.round(s.startKm)})`);
    const destLabel =
      i === rawSlices.length - 1
        ? options.destLabelOverride?.trim() || spine.destLabel
        : options.cutLabels?.[i]?.trim() ||
          (isFr ? `Étape ${dayNumber} (km ${Math.round(s.endKm)})` : `Stop ${dayNumber} (km ${Math.round(s.endKm)})`);

    const stageAvgGradePct =
      s.distKm > 0
        ? Math.min(8, Math.max(0, ((elevationGainM / (s.distKm * 1000)) * 100) * 0.35))
        : 0;

    const stageRoute: RouteParams = {
      origin: originLabel,
      destination: destLabel,
      distanceKm: s.distKm,
      elevationGainM,
      elevationLossM,
      targetSpeedKmH: Math.max(10, options.targetSpeedKmH || 21),
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: s.coords,
      originCoords: s.coords[0],
      destCoords: s.coords[s.coords.length - 1],
      routeMode: 'gpx',
      elevationProfile: s.profile,
    };

    const stageWeather: WeatherCondition =
      i === 0
        ? options.weather
        : {
            source: 'simulated',
            airDensityRho: 1.225,
            effectiveHeadwindKmH: 0,
            isHeadwindActive: false,
            baseWindSpeedKmH: 10,
            windDirection: 'calm',
            windDirectionDegrees: 240,
            temperatureC: options.weather.temperatureC ?? 18,
            precipitationRiskPercent: 10,
            estuaryGustKmH: 14,
            visibilityKm: 20,
          };

    const phys = calculatePhysics(
      { ...options.physics, gradientPercent: stageAvgGradePct },
      stageRoute,
      stageWeather,
      options.lang,
      options.ftpWatts
    );

    const movingTimeMinutes = Math.max(15, Math.round(phys.movingTimeSeconds / 60));
    const arrivalMins = startMinutes + movingTimeMinutes + stopBufferMin;
    const estimatedArrivalHHMM = minutesToHHMM(arrivalMins);

    const destCoord = s.coords[s.coords.length - 1];
    const solar = getSolarEphemeris(destCoord[0], destCoord[1], departureDate);
    const sunsetMins = hhmmToMinutes(solar.sunset);
    const arrivesAfterSunset = arrivalMins >= sunsetMins;
    const arrivesNearSunset = !arrivesAfterSunset && arrivalMins >= sunsetMins - 35;

    const effortEquivalentKm = Number((s.distKm + (elevationGainM / 100) * 8).toFixed(1));

    previews.push({
      dayNumber,
      startKm: Number(s.startKm.toFixed(1)),
      endKm: Number(s.endKm.toFixed(1)),
      distanceKm: s.distKm,
      elevationGainM,
      elevationLossM,
      minEleM: Math.round(minEleM),
      maxEleM: Math.round(maxEleM),
      coordinates: s.coords,
      elevationProfile: s.profile,
      originCoords: s.coords[0],
      destCoords: destCoord,
      originLabel,
      destLabel,
      departureDate,
      departureTime: dailyStart,
      movingTimeMinutes,
      movingTimeFormatted: formatDurationHoursMins(movingTimeMinutes),
      estimatedArrivalHHMM,
      sunsetHHMM: solar.sunset,
      arrivesAfterSunset,
      arrivesNearSunset,
      effortEquivalentKm,
      color: getStageColor(i),
      accommodationNote:
        i < rawSlices.length - 1 ? options.cutAccommodationNotes?.[i] : undefined,
    });
  }

  return previews;
}

export interface ApplyStageSlicesOptions {
  /** Optional updated bike/load physics (e.g. bikepacking luggage weight) to apply on the trip. */
  physics?: PhysicsParams;
  /** Optional updated target speed (km/h). */
  targetSpeedKmH?: number;
}

/**
 * Commits sliced stage previews onto a TripProfile, producing clean contiguous TripStage[]
 * with proper Day 2+ weather rollover, re-zeroed elevation profiles, terrain summaries, and
 * Day 1 projected onto top-level TripProfile fields.
 */
export function applyStageSlicesToTrip(
  trip: TripProfile,
  spine: FullTourSpine,
  previews: SlicedStagePreview[],
  options?: ApplyStageSlicesOptions
): TripProfile {
  if (previews.length === 0) return trip;

  const basePhysics = options?.physics ? { ...trip.physics, ...options.physics } : { ...trip.physics };
  const targetSpeedKmH = options?.targetSpeedKmH ?? trip.route.targetSpeedKmH ?? 21;
  const baseChips = Array.from(new Set(trip.customChips || []));
  const nowStamp = Date.now();

  const stages: TripStage[] = previews.map((p, idx) => {
    const horizon = checkForecastHorizon(p.departureDate);
    const sameDateAsTrip = idx === 0 && p.departureDate === trip.departureDate;

    // Preserve live weather only on Day 1 if its date matches the original trip date;
    // never copy Day 1 live storm/wind telemetry onto subsequent days.
    const stageWeather: WeatherCondition = sameDateAsTrip
      ? { ...trip.weather }
      : {
          source: 'simulated',
          isBeyondForecastWindow: !horizon.isAvailable,
          airDensityRho: 1.225,
          effectiveHeadwindKmH: 0,
          isHeadwindActive: false,
          baseWindSpeedKmH: 10,
          windDirection: 'calm',
          windDirectionDegrees: 240,
          temperatureC: trip.weather?.temperatureC ?? 18,
          precipitationRiskPercent: 10,
          estuaryGustKmH: 14,
          visibilityKm: 20,
        };

    const stageCoords = downsampleCoordinates(p.coordinates, 450) ?? p.coordinates;
    const terrainSummary = buildTerrainSummaryFromProfile(
      p.elevationProfile,
      p.distanceKm,
      p.elevationGainM,
      `${p.originLabel} ${p.destLabel} ${spine.gpxFileName || ''}`,
      stageCoords
    );

    const stageRoute: RouteParams = {
      ...trip.route,
      origin: p.originLabel,
      destination: p.destLabel,
      originCoords: p.originCoords,
      destCoords: p.destCoords,
      distanceKm: p.distanceKm,
      elevationGainM: p.elevationGainM,
      elevationLossM: p.elevationLossM,
      targetSpeedKmH,
      routeMode: 'gpx',
      gpxFileName: spine.gpxFileName || trip.route.gpxFileName,
      coordinates: stageCoords,
      elevationProfile: p.elevationProfile,
      terrainSummary,
      surfaceBreakdown: undefined,
      waypoints: undefined,
      cueSheet: undefined,
      radiusMeters: undefined,
    };

    return {
      id: `stage-${p.dayNumber}-${nowStamp}-${idx}`,
      dayNumber: p.dayNumber,
      departureDate: p.departureDate,
      departureTime: p.departureTime,
      targetMode: 'depart',
      route: stageRoute,
      office: {
        ...trip.office,
        gateName: p.destLabel,
        targetGateArrivalTime: p.estimatedArrivalHHMM,
      },
      weather: stageWeather,
      customChips: [...baseChips],
      accommodationNote: p.accommodationNote,
      pinnedAmenities: undefined,
    };
  });

  const day1 = stages[0];
  const day1AvgGrade =
    day1.route.distanceKm > 0
      ? Math.min(8, Math.max(0, (((day1.route.elevationGainM || 0) / (day1.route.distanceKm * 1000)) * 100) * 0.35))
      : 0;

  return {
    ...trip,
    tag: stages.length > 1 ? 'BIKEPACKING' : trip.tag,
    departureDate: day1.departureDate,
    departureTime: day1.departureTime,
    arriveAtMode: false,
    physics: {
      ...basePhysics,
      gradientPercent: Number(day1AvgGrade.toFixed(2)),
    },
    route: {
      ...day1.route,
      coordinates: day1.route.coordinates
        ? day1.route.coordinates.map((c) => [c[0], c[1]] as [number, number])
        : undefined,
    },
    office: { ...day1.office },
    weather: { ...day1.weather },
    customChips: [...day1.customChips],
    stages: stages.length > 1 ? stages : undefined,
    activeStageIndex: stages.length > 1 ? 0 : undefined,
    pinnedAmenities: undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Re-merges a multi-stage sliced Tour back into a single unified single-day route.
 */
export function mergeTourStagesToSingleDay(trip: TripProfile): TripProfile {
  const spine = extractFullTourSpine(trip);
  if (!spine) return trip;

  const mergedCoords = downsampleCoordinates(spine.coordinates, 1200) ?? spine.coordinates;
  const terrainSummary = buildTerrainSummaryFromProfile(
    spine.elevationProfile,
    spine.totalDistanceKm,
    spine.totalElevationGainM,
    `${spine.originLabel} ${spine.destLabel} ${spine.gpxFileName || ''}`,
    mergedCoords
  );

  const avgGrade =
    spine.totalDistanceKm > 0
      ? Math.min(8, Math.max(0, ((spine.totalElevationGainM / (spine.totalDistanceKm * 1000)) * 100) * 0.35))
      : 0;

  const firstStage = trip.stages?.[0];

  return {
    ...trip,
    departureDate: firstStage?.departureDate || trip.departureDate,
    departureTime: firstStage?.departureTime || trip.departureTime,
    physics: {
      ...trip.physics,
      gradientPercent: Number(avgGrade.toFixed(2)),
    },
    route: {
      ...trip.route,
      origin: spine.originLabel,
      destination: spine.destLabel,
      originCoords: mergedCoords[0],
      destCoords: mergedCoords[mergedCoords.length - 1],
      distanceKm: spine.totalDistanceKm,
      elevationGainM: spine.totalElevationGainM,
      elevationLossM: spine.totalElevationLossM,
      routeMode: 'gpx',
      gpxFileName: spine.gpxFileName || trip.route.gpxFileName,
      coordinates: mergedCoords,
      elevationProfile: spine.elevationProfile,
      terrainSummary,
      surfaceBreakdown: undefined,
      waypoints: undefined,
      cueSheet: undefined,
    },
    stages: undefined,
    activeStageIndex: undefined,
    updatedAt: new Date().toISOString(),
  };
}
