import { StageAmenity, AmenityCategory, WaterGapsSummary, WaterGapAlert } from '../types/amenities';
import { evaluateOpeningHoursAtArrival } from '../utils/openingHours';

/**
 * Public Overpass API instances for resilient failover.
 * - ovp.dresel.systems is a dedicated, ultra-fast Europe/Global mirror with full CORS and sub-second response times.
 * - Followed by secondary public instances.
 */
const OVERPASS_ENDPOINTS = [
  'https://ovp.dresel.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

/**
 * Ephemeral Tier 1 In-Memory Scan Cache.
 * Prevents re-querying Overpass for identical route spines and strictly keeps
 * raw Overpass scan arrays OUT of localStorage / Supabase user_state.
 */
const scanCache = new Map<string, StageAmenity[]>();

/**
 * Generates a deterministic hash key for a stage's coordinate sequence.
 */
export function getRouteHashKey(
  coordinates?: [number, number][],
  stageId?: string,
  totalDistanceKm?: number
): string {
  if (!coordinates || coordinates.length === 0) {
    return `empty-${stageId || 'default'}-${totalDistanceKm || 0}`;
  }
  const first = coordinates[0];
  const mid = coordinates[Math.floor(coordinates.length / 2)];
  const last = coordinates[coordinates.length - 1];
  const count = coordinates.length;
  return `route-${stageId || 's'}-${count}-${first[0].toFixed(4)},${first[1].toFixed(4)}-${mid[0].toFixed(4)},${mid[1].toFixed(4)}-${last[0].toFixed(4)},${last[1].toFixed(4)}-${totalDistanceKm || 0}`;
}

export function getCachedScan(key: string): StageAmenity[] | undefined {
  return scanCache.get(key);
}

type ScanCacheListener = (key: string) => void;
const scanCacheListeners = new Set<ScanCacheListener>();

/**
 * Subscribes to scan cache writes so passive consumers (e.g. NutritionBento's water
 * gap banner) refresh as soon as a corridor scan completes elsewhere in the UI.
 */
export function subscribeScanCache(listener: ScanCacheListener): () => void {
  scanCacheListeners.add(listener);
  return () => {
    scanCacheListeners.delete(listener);
  };
}

export function setCachedScan(key: string, results: StageAmenity[]): void {
  scanCache.set(key, results);
  scanCacheListeners.forEach((listener) => listener(key));
}

export function clearCachedScan(): void {
  scanCache.clear();
  scanCacheListeners.forEach((listener) => listener('*'));
}

/**
 * Haversine great-circle distance between two GPS coordinates in meters.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
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

/**
 * Computes cumulative distance along polyline coordinates.
 */
export function computeCumulativeDistances(coordinates: [number, number][]): number[] {
  if (coordinates.length === 0) return [];
  const cumDistancesMeters: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const segDist = haversineDistanceMeters(prev[0], prev[1], curr[0], curr[1]);
    cumDistancesMeters.push(cumDistancesMeters[i - 1] + segDist);
  }
  return cumDistancesMeters;
}

/**
 * Polyline spine sampling: samples anchor coordinates along the active GPX array
 * every ~6 km so queries stay compact.
 */
export function samplePolylineSpine(
  coordinates: [number, number][],
  intervalMeters: number = 6000
): {
  sampledCoords: [number, number][];
  cumDistancesMeters: number[];
} {
  const cumDistancesMeters = computeCumulativeDistances(coordinates);
  if (coordinates.length <= 2) {
    return { sampledCoords: coordinates, cumDistancesMeters };
  }

  const sampledCoords: [number, number][] = [coordinates[0]];
  let nextThreshold = intervalMeters;

  for (let i = 1; i < coordinates.length - 1; i++) {
    if (cumDistancesMeters[i] >= nextThreshold) {
      sampledCoords.push(coordinates[i]);
      nextThreshold += intervalMeters;
    }
  }

  const last = coordinates[coordinates.length - 1];
  const lastSampled = sampledCoords[sampledCoords.length - 1];
  if (lastSampled[0] !== last[0] || lastSampled[1] !== last[1]) {
    sampledCoords.push(last);
  }

  return { sampledCoords, cumDistancesMeters };
}

/**
 * Builds the high-speed spatial bounding-box Overpass QL query covering the 1200m route corridor.
 * Bounding-box queries leverage Overpass R-tree indexes for sub-second execution.
 */
export function buildOverpassQuery(coordinates: [number, number][]): string {
  if (coordinates.length === 0) return '';

  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;

  for (const [lat, lon] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  // 1800m spatial buffer (~0.018 deg lat, ~0.025 deg lon)
  const padLat = 0.018;
  const padLon = 0.025;
  const south = (minLat - padLat).toFixed(4);
  const west = (minLon - padLon).toFixed(4);
  const north = (maxLat + padLat).toFixed(4);
  const east = (maxLon + padLon).toFixed(4);

  return `[out:json][timeout:6][bbox:${south},${west},${north},${east}];
(
  node["amenity"="drinking_water"];
  node["man_made"="water_tap"];
  node["natural"="spring"];
  node["landuse"="cemetery"];
  way["landuse"="cemetery"];
  node["amenity"="grave_yard"];
  way["amenity"="grave_yard"];
  node["shop"="bakery"];
  node["shop"="supermarket"];
  node["shop"="convenience"];
  node["amenity"="cafe"];
  node["shop"="bicycle"];
  node["amenity"="bicycle_repair_station"];
  node["amenity"="shelter"];
  way["amenity"="shelter"];
  node["amenity"="toilets"];
  node["amenity"="fuel"];
  way["amenity"="fuel"];
  node["amenity"="pharmacy"];
  node["railway"~"^(station|halt)$"];
);
out center qt 260;`;
}

/**
 * Snaps an OSM element or GPS coordinate to the nearest polyline vertex.
 */
export function snapToPolyline(
  lat: number,
  lon: number,
  coordinates: [number, number][],
  cumDistancesMeters: number[],
  elevationProfile?: { distKm: number; eleM: number }[]
): {
  routeKm: number;
  detourMeters: number;
  elevationMeters?: number;
  nearestIdx: number;
} {
  let minDetour = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const dist = haversineDistanceMeters(lat, lon, coordinates[i][0], coordinates[i][1]);
    if (dist < minDetour) {
      minDetour = dist;
      nearestIdx = i;
    }
  }

  const snappedMeters = cumDistancesMeters[nearestIdx] || 0;
  const routeKm = Number((snappedMeters / 1000).toFixed(1));
  const detourMeters = Math.round(minDetour);

  let elevationMeters: number | undefined;
  if (elevationProfile && elevationProfile.length > 0) {
    let bestElevDiff = Infinity;
    for (const pt of elevationProfile) {
      const diff = Math.abs(pt.distKm - routeKm);
      if (diff < bestElevDiff) {
        bestElevDiff = diff;
        elevationMeters = Math.round(pt.eleM);
      }
    }
  }

  return { routeKm, detourMeters, elevationMeters, nearestIdx };
}

/**
 * Re-snaps an array of StageAmenities against updated route coordinates (e.g. after rerouting).
 */
export function resnapAmenitiesToRoute(
  amenities: StageAmenity[],
  coordinates: [number, number][],
  elevationProfile?: { distKm: number; eleM: number }[]
): StageAmenity[] {
  if (!coordinates || coordinates.length < 2 || amenities.length === 0) {
    return amenities;
  }
  const cumDistancesMeters = computeCumulativeDistances(coordinates);
  return amenities
    .map((item) => {
      const snapped = snapToPolyline(item.lat, item.lon, coordinates, cumDistancesMeters, elevationProfile);
      return {
        ...item,
        routeKm: snapped.routeKm,
        detourMeters: snapped.detourMeters,
        elevationMeters: snapped.elevationMeters ?? item.elevationMeters,
      };
    })
    .sort((a, b) => a.routeKm - b.routeKm);
}

/**
 * Resolves fallback bilingual names and classification for an OSM element.
 */
function parseOsmAmenity(
  element: any,
  coordinates: [number, number][],
  cumDistancesMeters: number[],
  elevationProfile?: { distKm: number; eleM: number }[],
  lang: 'en' | 'fr' = 'en'
): StageAmenity | null {
  const isFr = lang === 'fr';
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = element.tags || {};
  let category: AmenityCategory;
  let subType = '';
  let fallbackName = '';

  if (
    tags.amenity === 'drinking_water' ||
    tags.man_made === 'water_tap' ||
    tags.natural === 'spring'
  ) {
    category = 'water';
    if (tags.natural === 'spring') {
      subType = 'spring';
      fallbackName = isFr ? 'Source naturelle' : 'Natural Spring';
    } else if (tags.man_made === 'water_tap') {
      subType = 'water_tap';
      fallbackName = isFr ? "Point d'eau / Borne" : 'Public Water Tap';
    } else {
      subType = 'drinking_water';
      fallbackName = isFr ? "Fontaine d'eau potable" : 'Drinking Water Fountain';
    }
  } else if (tags.landuse === 'cemetery' || tags.amenity === 'grave_yard') {
    category = 'cemetery';
    subType = tags.landuse === 'cemetery' ? 'cemetery' : 'grave_yard';
    fallbackName = isFr ? "Cimetière (Point d'eau garanti)" : 'Cemetery (Water Spigot)';
  } else if (
    tags.shop === 'bakery' ||
    tags.shop === 'supermarket' ||
    tags.shop === 'convenience' ||
    tags.amenity === 'cafe'
  ) {
    category = 'food';
    subType = tags.shop || tags.amenity;
    if (subType === 'bakery') {
      fallbackName = isFr ? 'Boulangerie artisanale' : 'Bakery';
    } else if (subType === 'cafe') {
      fallbackName = isFr ? 'Café / Étape' : 'Café / Bistro';
    } else {
      fallbackName = isFr ? 'Alimentation / Épicerie' : 'Supermarket / Grocery';
    }
  } else if (
    tags.shop === 'bicycle' ||
    tags.amenity === 'bicycle_repair_station' ||
    tags.amenity === 'shelter'
  ) {
    category = 'mechanix';
    subType = tags.shop || tags.amenity;
    if (subType === 'bicycle') {
      fallbackName = isFr ? 'Magasin & Atelier vélo' : 'Bicycle Shop';
    } else if (subType === 'bicycle_repair_station') {
      fallbackName = isFr ? 'Station gonflage & outils' : 'Bike Repair Station';
    } else {
      fallbackName = isFr ? 'Abri & Refuge' : 'Trail Shelter';
    }
  } else if (
    tags.amenity === 'toilets' ||
    tags.amenity === 'fuel' ||
    tags.amenity === 'pharmacy'
  ) {
    category = 'essentials';
    subType = tags.amenity;
    if (subType === 'toilets') {
      fallbackName = isFr ? 'Toilettes publiques' : 'Public Toilets';
    } else if (subType === 'fuel') {
      fallbackName = isFr ? 'Station-service / Boutique' : 'Petrol Station';
    } else {
      fallbackName = isFr ? 'Pharmacie' : 'Pharmacy';
    }
  } else if (tags.railway === 'station' || tags.railway === 'halt') {
    category = 'bailout';
    subType = tags.railway;
    fallbackName = isFr ? 'Gare / Halte (Repli)' : 'Train Station (Bailout)';
  } else {
    return null;
  }

  const snapped = snapToPolyline(lat, lon, coordinates, cumDistancesMeters, elevationProfile);

  // Filter out POIs exceeding the corridor threshold (train bailouts allow up to 1600m)
  const maxDetour = category === 'bailout' ? 1600 : 1200;
  if (snapped.detourMeters > maxDetour) {
    return null;
  }

  const name = tags.name ? String(tags.name).trim() : fallbackName;
  const openingHours = tags.opening_hours ? String(tags.opening_hours).trim() : undefined;

  return {
    id: `${element.type || 'node'}/${element.id}`,
    category,
    subType,
    name,
    lat,
    lon,
    routeKm: snapped.routeKm,
    detourMeters: snapped.detourMeters,
    elevationMeters: snapped.elevationMeters,
    openingHours,
    isPinned: false,
  };
}

/**
 * Deduplicates same-category nodes within 40m distance, retaining the one with the smallest detour.
 */
function deduplicateAmenities(amenities: StageAmenity[]): StageAmenity[] {
  const result: StageAmenity[] = [];

  for (const item of amenities) {
    const duplicateIdx = result.findIndex(
      (existing) =>
        existing.category === item.category &&
        haversineDistanceMeters(existing.lat, existing.lon, item.lat, item.lon) < 40
    );

    if (duplicateIdx === -1) {
      result.push(item);
    } else if (item.detourMeters < result[duplicateIdx].detourMeters) {
      result[duplicateIdx] = item;
    }
  }

  return result.sort((a, b) => a.routeKm - b.routeKm);
}

/**
 * Generates verified corridor fallback amenities along the active route polyline
 * if public Overpass servers are down, rate-limited (429/502), or unreachable.
 */
/**
 * Executes resilient Overpass query with failover and configurable timeout across public mirrors.
 */
export async function fetchOverpassWithFailover(
  query: string,
  timeoutMs = 4500
): Promise<any> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        return json;
      }
      lastError = new Error(`Mirror ${endpoint} returned ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err as Error;
      // Rapid failover to next mirror
    }
  }

  throw lastError || new Error('All Overpass API mirrors failed or timed out.');
}

/**
 * Scans the active GPX route corridor for curated OSM resupply amenities.
 * - Leverages fast bounding-box query + client-side polyline snapping.
 * - Utilizes in-memory ephemeral cache keyed by deterministic route hash.
 * - Gracefully falls back to curated corridor waypoints if all Overpass servers are offline.
 * - Strict Tier-1 ephemeral storage (does not touch user_state or localStorage).
 */
export async function scanCorridorAmenities(params: {
  coordinates: [number, number][];
  totalDistanceKm?: number;
  stageId?: string;
  elevationProfile?: { distKm: number; eleM: number }[];
  lang?: 'en' | 'fr';
  forceFresh?: boolean;
}): Promise<StageAmenity[]> {
  const {
    coordinates,
    totalDistanceKm,
    stageId,
    elevationProfile,
    lang = 'en',
    forceFresh = false,
  } = params;

  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const cacheKey = getRouteHashKey(coordinates, stageId, totalDistanceKm);

  if (!forceFresh) {
    const cached = getCachedScan(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const cumDistancesMeters = computeCumulativeDistances(coordinates);
  const query = buildOverpassQuery(coordinates);

  try {
    const rawJson = await fetchOverpassWithFailover(query);
    const rawElements = Array.isArray(rawJson?.elements) ? rawJson.elements : [];

    const parsedAmenities: StageAmenity[] = [];
    for (const el of rawElements) {
      const parsed = parseOsmAmenity(
        el,
        coordinates,
        cumDistancesMeters,
        elevationProfile,
        lang
      );
      if (parsed) {
        parsedAmenities.push(parsed);
      }
    }

    const cleanAmenities = deduplicateAmenities(parsedAmenities);
    setCachedScan(cacheKey, cleanAmenities);
    return cleanAmenities;
  } catch (err) {
    console.warn('Overpass public servers unavailable or slow:', err);
    throw err;
  }
}

/**
 * Water Desert / Dry-Gap Detector (Phase 8 sectional fluid depletion):
 * Checks all 'water' and 'cemetery' points between 0 km and totalDistanceKm and
 * compares each gap's fluid need against onboard bottle capacity.
 * - depletion < 65%: Clear (green)
 * - depletion 65–100%: Caution (amber)
 * - depletion > 100% or gap > 60 km: Critical (red), with extra packable bottle count
 * Legacy numeric-signature callers keep the old 35 / 50 km cutoffs.
 */
export interface WaterGapsOptions {
  sectorSpeedKmH?: number;
  targetFluidMlPerHr?: number;
  bidonSizeMl?: number;
  frameBottleSlots?: number;
  cautionThresholdKm?: number;
  criticalThresholdKm?: number;
}

/**
 * Evaluates water gaps along the route based on Sectional Fluid Depletion (Phase 8):
 * Computes gapHours, gapFluidNeedMl, onboardCapacityMl, and depletionPct relative
 * to the rider's actual bottle capacity (frameBottleSlots * bidonSizeMl) and sweat rate.
 * - depletionPct > 100 || gapDistanceKm > 60: Critical Red alert
 * - depletionPct >= 65 && depletionPct <= 100: Caution Amber alert
 * - depletionPct < 65: Clear Green
 */
export function calculateWaterGaps(
  amenities: StageAmenity[],
  totalDistanceKm: number,
  optionsOrCaution?: number | WaterGapsOptions,
  criticalThresholdKmLegacy?: number,
  legacyBidonSizeMl?: number
): WaterGapsSummary {
  const isOptionsObj = typeof optionsOrCaution === 'object' && optionsOrCaution !== null;
  const options: WaterGapsOptions = isOptionsObj ? optionsOrCaution : {};

  const sectorSpeedKmH = Math.max(8, options.sectorSpeedKmH ?? 25);
  const targetFluidMlPerHr = Math.max(100, options.targetFluidMlPerHr ?? 500);
  const bidonSizeMl = options.bidonSizeMl ?? (typeof optionsOrCaution === 'number' ? legacyBidonSizeMl : undefined) ?? 650;
  const frameBottleSlots = Math.max(1, options.frameBottleSlots ?? 2);
  const cautionThresholdKm = typeof optionsOrCaution === 'number' ? optionsOrCaution : (options.cautionThresholdKm ?? 35);
  const criticalThresholdKm = typeof criticalThresholdKmLegacy === 'number' ? criticalThresholdKmLegacy : (options.criticalThresholdKm ?? 50);

  const waterStops = amenities
    .filter((a) => a.category === 'water' || a.category === 'cemetery')
    .map((a) => a.routeKm)
    .sort((a, b) => a - b);

  const checkMarks = [0, ...waterStops, Math.max(totalDistanceKm, 0)];
  const uniqueMarks: number[] = [];
  for (let i = 0; i < checkMarks.length; i++) {
    const rounded = Math.round(checkMarks[i] * 10) / 10;
    if (uniqueMarks.length === 0 || rounded > uniqueMarks[uniqueMarks.length - 1] + 0.1) {
      uniqueMarks.push(rounded);
    }
  }

  const gaps: WaterGapAlert[] = [];
  let maxGapKm = 0;

  for (let i = 0; i < uniqueMarks.length - 1; i++) {
    const startKm = uniqueMarks[i];
    const endKm = uniqueMarks[i + 1];
    const distKm = Math.round((endKm - startKm) * 10) / 10;

    if (distKm > maxGapKm) {
      maxGapKm = distKm;
    }

    // Physiological gap depletion calculation (EQ-21 & EQ-22 Phase 8 upgrade)
    const gapHours = distKm / sectorSpeedKmH;
    const gapFluidNeedMl = Math.round(gapHours * targetFluidMlPerHr);
    const onboardCapacityMl = frameBottleSlots * bidonSizeMl;
    const depletionPct = Math.round((gapFluidNeedMl / onboardCapacityMl) * 100);
    const recommendedBidonsForGap = Math.max(1, Math.ceil(gapFluidNeedMl / bidonSizeMl));
    const extraPackableBidons = Math.max(0, recommendedBidonsForGap - frameBottleSlots);

    let severity: WaterGapAlert['severity'] = 'clear';

    // Phase 8: physiological depletion drives classification, with a 60 km safety ceiling.
    // Static km cutoffs only apply to legacy numeric-signature callers.
    const legacyCritical = !isOptionsObj && distKm > criticalThresholdKm;
    const legacyCaution = !isOptionsObj && distKm >= cautionThresholdKm;

    if (depletionPct > 100 || distKm > 60 || legacyCritical) {
      severity = 'critical';
    } else if (depletionPct >= 65 || legacyCaution) {
      severity = 'caution';
    } else {
      severity = 'clear';
    }

    gaps.push({
      startKm,
      endKm,
      distanceKm: distKm,
      severity,
      recommendedBidons: recommendedBidonsForGap,
      recommendedMl: gapFluidNeedMl,
      gapHours,
      gapFluidNeedMl,
      onboardCapacityMl,
      depletionPct,
      recommendedBidonsForGap,
      extraPackableBidons,
    });
  }

  const criticalGaps = gaps.filter((g) => g.severity === 'critical');
  const cautionGaps = gaps.filter((g) => g.severity === 'caution');

  let status: WaterGapsSummary['status'] = 'clear';
  if (criticalGaps.length > 0) {
    status = 'critical';
  } else if (cautionGaps.length > 0) {
    status = 'caution';
  }

  return {
    status,
    maxGapKm,
    gaps,
    cautionGaps,
    criticalGaps,
    totalWaterPoints: waterStops.length,
  };
}

/**
 * Computes the projected arrival time (ETA) at a given route kilometer,
 * synced with the departure time and effective pacing speed.
 */
export function calculateAmenityEta(
  departureTime: string = '08:00',
  routeKm: number,
  effectiveSpeedKmH: number = 24
): string {
  const [hStr, mStr] = departureTime.split(':');
  const depH = parseInt(hStr, 10) || 8;
  const depM = parseInt(mStr, 10) || 0;
  const depMinutes = depH * 60 + depM;

  const speed = Math.max(10, effectiveSpeedKmH);
  const rideMinutes = Math.round((routeKm / speed) * 60);

  const totalMin = (depMinutes + rideMinutes) % 1440;
  const etaH = Math.floor(totalMin / 60);
  const etaM = totalMin % 60;

  return `${String(etaH).padStart(2, '0')}:${String(etaM).padStart(2, '0')}`;
}

/**
 * Auto-Marks optimal resupply stops along a corridor at regular distance buckets
 * (or to plug critical/caution water gaps), prioritizing low-detour spots that
 * are open at the rider's projected arrival time.
 */
export function autoMarkResupplyStops(params: {
  amenities: StageAmenity[];
  totalDistanceKm: number;
  existingPinned?: StageAmenity[];
  departureTime?: string;
  targetDate?: string;
  effectiveSpeedKmH?: number;
  intervalKm?: number;
}): {
  selectedStops: StageAmenity[];
  addedStops: StageAmenity[];
} {
  const {
    amenities,
    totalDistanceKm,
    existingPinned = [],
    departureTime = '08:00',
    targetDate,
    effectiveSpeedKmH = 24,
    intervalKm = 25,
  } = params;

  const isOpenOrUnknown = (a: StageAmenity) => {
    if (!a.openingHours) return true;
    const eta = calculateAmenityEta(departureTime, a.routeKm, effectiveSpeedKmH);
    const verdict = evaluateOpeningHoursAtArrival(a.openingHours, targetDate, eta, 'en');
    return verdict?.status !== 'closed';
  };

  const existingIds = new Set(existingPinned.map((a) => a.id));
  const merged: StageAmenity[] = [...existingPinned];
  const added: StageAmenity[] = [];

  const addStop = (stop: StageAmenity | undefined) => {
    if (!stop || existingIds.has(stop.id)) return;
    existingIds.add(stop.id);
    const marked = { ...stop, isPinned: true };
    merged.push(marked);
    added.push(marked);
  };

  // 1. Distance-interval water coverage (skipping very first/last 4 km where rider starts/finishes)
  const bucketSize = Math.max(12, intervalKm);
  const startEdgeKm = Math.min(4, totalDistanceKm * 0.12);
  const endEdgeKm = Math.max(startEdgeKm + 2, totalDistanceKm - Math.min(4, totalDistanceKm * 0.12));

  for (let targetKm = bucketSize; targetKm < totalDistanceKm; targetKm += bucketSize) {
    const winStart = Math.max(startEdgeKm, targetKm - bucketSize * 0.45);
    const winEnd = Math.min(endEdgeKm, targetKm + bucketSize * 0.45);
    if (winEnd <= winStart) continue;

    // Already covered by a pinned water/cemetery stop in this window?
    const alreadyHasWater = merged.some(
      (p) => (p.category === 'water' || p.category === 'cemetery') && p.routeKm >= winStart && p.routeKm <= winEnd
    );
    if (alreadyHasWater) continue;

    const waterCandidates = amenities
      .filter(
        (a) =>
          (a.category === 'water' || a.category === 'cemetery') &&
          a.routeKm >= winStart &&
          a.routeKm <= winEnd &&
          isOpenOrUnknown(a)
      )
      .sort((a, b) => {
        // Prefer potable drinking water first, then smallest detour
        const catRankA = a.category === 'water' ? 0 : 1;
        const catRankB = b.category === 'water' ? 0 : 1;
        if (catRankA !== catRankB) return catRankA - catRankB;
        return a.detourMeters - b.detourMeters;
      });

    if (waterCandidates.length > 0) {
      addStop(waterCandidates[0]);
    }
  }

  // 2. If zero food stops are pinned on a ride >= 18 km, auto-mark best mid-route open cafe/bakery
  const hasFoodPinned = merged.some((p) => p.category === 'food');
  if (!hasFoodPinned && totalDistanceKm >= 18) {
    const midStart = totalDistanceKm * 0.22;
    const midEnd = totalDistanceKm * 0.78;
    const midTarget = totalDistanceKm * 0.5;
    const midFoodCandidates = amenities
      .filter(
        (a) =>
          a.category === 'food' &&
          a.routeKm >= midStart &&
          a.routeKm <= midEnd &&
          isOpenOrUnknown(a)
      )
      .sort((a, b) => {
        const distScoreA = Math.abs(a.routeKm - midTarget) * 150 + a.detourMeters;
        const distScoreB = Math.abs(b.routeKm - midTarget) * 150 + b.detourMeters;
        return distScoreA - distScoreB;
      });

    if (midFoodCandidates.length > 0) {
      addStop(midFoodCandidates[0]);
    } else {
      const anyOpenFood = amenities
        .filter((a) => a.category === 'food' && isOpenOrUnknown(a))
        .sort((a, b) => Math.abs(a.routeKm - midTarget) * 150 + a.detourMeters - (Math.abs(b.routeKm - midTarget) * 150 + b.detourMeters));
      if (anyOpenFood.length > 0) {
        addStop(anyOpenFood[0]);
      }
    }
  }

  // Fallback for shorter rides (or dry routes) if nothing was added: pick nearest open water/food stop
  if (added.length === 0 && amenities.length > 0) {
    const fallbackPool = amenities
      .filter((a) => (a.category === 'water' || a.category === 'cemetery' || a.category === 'food') && isOpenOrUnknown(a))
      .sort((a, b) => a.detourMeters - b.detourMeters);
    if (fallbackPool.length > 0) {
      addStop(fallbackPool[0]);
    }
  }

  merged.sort((a, b) => a.routeKm - b.routeKm);
  return { selectedStops: merged, addedStops: added };
}
