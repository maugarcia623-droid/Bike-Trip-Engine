import { ElevationProfilePoint } from '../types/trip';
import { computeCumulativeDistances } from './overpassCorridor';

export interface DemElevationResult {
  elevationProfile: ElevationProfilePoint[];
  elevationGainM: number;
  elevationLossM: number;
}

const DEM_CACHE_PREFIX = 'cadence_dem_v1_';
const MAX_DEM_CACHE_ENTRIES = 30;
const MAX_SAMPLE_POINTS = 60;
const MIN_SAMPLE_POINTS = 16;
const ELEVATION_HYSTERESIS_M = 2.0;

const memoryDemCache = new Map<string, DemElevationResult>();

interface StoredDemEntry extends DemElevationResult {
  _lruTs?: number;
}

function buildDemCacheKey(coordinates: [number, number][]): string {
  const first = coordinates[0];
  const mid = coordinates[Math.floor(coordinates.length / 2)];
  const last = coordinates[coordinates.length - 1];
  const f = (n: number) => n.toFixed(4);
  return `${coordinates.length}_${f(first[0])},${f(first[1])}_${f(mid[0])},${f(mid[1])}_${f(last[0])},${f(last[1])}`;
}

function readCachedDem(cacheKey: string): DemElevationResult | null {
  const mem = memoryDemCache.get(cacheKey);
  if (mem) {
    // Refresh LRU order in memory
    memoryDemCache.delete(cacheKey);
    memoryDemCache.set(cacheKey, mem);
    return mem;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const fullKey = `${DEM_CACHE_PREFIX}${cacheKey}`;
      const raw = window.localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDemEntry;
        if (parsed && Array.isArray(parsed.elevationProfile) && parsed.elevationProfile.length >= 3) {
          const result: DemElevationResult = {
            elevationProfile: parsed.elevationProfile,
            elevationGainM: parsed.elevationGainM,
            elevationLossM: parsed.elevationLossM,
          };
          memoryDemCache.set(cacheKey, result);
          try {
            window.localStorage.setItem(fullKey, JSON.stringify({ ...result, _lruTs: Date.now() }));
          } catch {
            // Ignore LRU timestamp touch errors
          }
          return result;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function evictOldestDemEntries(storage: Storage, excludeFullKey: string, maxKeep: number): void {
  const entries: Array<{ key: string; ts: number }> = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k || !k.startsWith(DEM_CACHE_PREFIX) || k === excludeFullKey) continue;
    let ts = 0;
    try {
      const raw = storage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDemEntry;
        if (typeof parsed?._lruTs === 'number') ts = parsed._lruTs;
      }
    } catch {
      ts = 0;
    }
    entries.push({ key: k, ts });
  }

  if (entries.length <= maxKeep) return;
  entries.sort((a, b) => a.ts - b.ts);
  const toRemove = entries.length - maxKeep;
  for (let i = 0; i < toRemove; i++) {
    storage.removeItem(entries[i].key);
  }
}

function writeCachedDem(cacheKey: string, result: DemElevationResult): void {
  memoryDemCache.delete(cacheKey);
  memoryDemCache.set(cacheKey, result);
  while (memoryDemCache.size > MAX_DEM_CACHE_ENTRIES) {
    const oldestKey = memoryDemCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryDemCache.delete(oldestKey);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storage = window.localStorage;
      const fullKey = `${DEM_CACHE_PREFIX}${cacheKey}`;
      evictOldestDemEntries(storage, fullKey, MAX_DEM_CACHE_ENTRIES - 1);
      const payload = JSON.stringify({ ...result, _lruTs: Date.now() });
      try {
        storage.setItem(fullKey, payload);
      } catch {
        // Quota fallback: evict oldest half and retry once
        evictOldestDemEntries(storage, fullKey, Math.floor(MAX_DEM_CACHE_ENTRIES / 2));
        storage.setItem(fullKey, payload);
      }
    }
  } catch {
    // Ignore storage quota errors
  }
}

function samplePolylineEvenly(
  coordinates: [number, number][],
  sampleCount: number,
  targetDistanceKm?: number
): Array<{ lat: number; lon: number; distKm: number }> {
  const cumMeters = computeCumulativeDistances(coordinates);
  const rawTotalMeters = cumMeters[cumMeters.length - 1] || 0;
  if (rawTotalMeters <= 0) return [];

  const displayTotalKm =
    typeof targetDistanceKm === 'number' && targetDistanceKm > 0
      ? targetDistanceKm
      : rawTotalMeters / 1000;

  const sampled: Array<{ lat: number; lon: number; distKm: number }> = [];
  let cursor = 0;

  for (let i = 0; i < sampleCount; i++) {
    const frac = sampleCount > 1 ? i / (sampleCount - 1) : 0;
    const targetMeters = frac * rawTotalMeters;

    while (cursor < cumMeters.length - 2 && cumMeters[cursor + 1] < targetMeters) {
      cursor++;
    }

    const d0 = cumMeters[cursor];
    const d1 = cumMeters[cursor + 1] ?? d0;
    const segLen = d1 - d0;
    const t = segLen > 0 ? Math.max(0, Math.min(1, (targetMeters - d0) / segLen)) : 0;
    const p0 = coordinates[cursor];
    const p1 = coordinates[cursor + 1] || p0;

    sampled.push({
      lat: p0[0] + (p1[0] - p0[0]) * t,
      lon: p0[1] + (p1[1] - p0[1]) * t,
      distKm: frac * displayTotalKm,
    });
  }

  return sampled;
}

function smoothAndAccumulateDem(
  rawElevations: number[],
  sampled: Array<{ lat: number; lon: number; distKm: number }>
): DemElevationResult {
  // 3-point weighted moving average to suppress SRTM 1m quantization steps
  const smoothed = rawElevations.map((ele, idx) => {
    if (rawElevations.length < 3) return ele;
    if (idx === 0) return 0.75 * ele + 0.25 * rawElevations[1];
    if (idx === rawElevations.length - 1) {
      return 0.75 * ele + 0.25 * rawElevations[idx - 1];
    }
    return 0.25 * rawElevations[idx - 1] + 0.5 * ele + 0.25 * rawElevations[idx + 1];
  });

  // Hysteresis gain accumulation (ignore sub-2m noise ripples along flat river valleys)
  let totalGainM = 0;
  let anchorLow = smoothed[0];
  let extremeHigh = smoothed[0];
  for (let i = 1; i < smoothed.length; i++) {
    const e = smoothed[i];
    if (e > extremeHigh) {
      extremeHigh = e;
    } else if (extremeHigh - e >= ELEVATION_HYSTERESIS_M) {
      const climb = extremeHigh - anchorLow;
      if (climb >= ELEVATION_HYSTERESIS_M) {
        totalGainM += climb;
      }
      anchorLow = e;
      extremeHigh = e;
    }
    if (e < anchorLow) {
      anchorLow = e;
      extremeHigh = e;
    }
  }
  if (extremeHigh - anchorLow >= ELEVATION_HYSTERESIS_M) {
    totalGainM += extremeHigh - anchorLow;
  }

  // Symmetrical hysteresis loss accumulation
  let totalLossM = 0;
  let anchorHigh = smoothed[0];
  let extremeLow = smoothed[0];
  for (let i = 1; i < smoothed.length; i++) {
    const e = smoothed[i];
    if (e < extremeLow) {
      extremeLow = e;
    } else if (e - extremeLow >= ELEVATION_HYSTERESIS_M) {
      const drop = anchorHigh - extremeLow;
      if (drop >= ELEVATION_HYSTERESIS_M) {
        totalLossM += drop;
      }
      anchorHigh = e;
      extremeLow = e;
    }
    if (e > anchorHigh) {
      anchorHigh = e;
      extremeLow = e;
    }
  }
  if (anchorHigh - extremeLow >= ELEVATION_HYSTERESIS_M) {
    totalLossM += anchorHigh - extremeLow;
  }

  const elevationProfile: ElevationProfilePoint[] = sampled.map((pt, i) => {
    const eleM = Number(smoothed[i].toFixed(1));
    const distKm = Number(pt.distKm.toFixed(2));
    let gradePct = 0;
    if (i > 0) {
      const prevDistKm = sampled[i - 1].distKm;
      const dMeters = Math.max(25, (pt.distKm - prevDistKm) * 1000);
      const rawGrade = ((smoothed[i] - smoothed[i - 1]) / dMeters) * 100;
      gradePct = Number(Math.max(-25, Math.min(25, rawGrade)).toFixed(1));
    }
    return { distKm, eleM, gradePct };
  });

  return {
    elevationProfile,
    elevationGainM: Math.max(0, Math.round(totalGainM)),
    elevationLossM: Math.max(0, Math.round(totalLossM)),
  };
}

/**
 * Fetches real Copernicus / SRTM Digital Elevation Model (DEM) samples along a route polyline
 * via Open-Meteo's public `/v1/elevation` API (max 60 points per request, cached locally).
 * Returns `null` cleanly if offline or if the upstream service fails.
 */
export async function fetchDemElevationProfile(
  coordinates: [number, number][],
  totalDistanceKm?: number,
  timeoutMs = 5000
): Promise<DemElevationResult | null> {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const cacheKey = buildDemCacheKey(coordinates);
  const cached = readCachedDem(cacheKey);
  if (cached) {
    return cached;
  }

  const cum = computeCumulativeDistances(coordinates);
  const rawKm = (cum[cum.length - 1] || 0) / 1000;
  const distKm = totalDistanceKm && totalDistanceKm > 0 ? totalDistanceKm : rawKm;
  const sampleCount = Math.min(
    MAX_SAMPLE_POINTS,
    Math.max(MIN_SAMPLE_POINTS, Math.round(distKm * 1.5))
  );

  const sampled = samplePolylineEvenly(coordinates, sampleCount, distKm);
  if (sampled.length < 3) {
    return null;
  }

  const latitudes = sampled.map((p) => p.lat.toFixed(5)).join(',');
  const longitudes = sampled.map((p) => p.lon.toFixed(5)).join(',');
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return null;
    }
    const json = await response.json();
    const rawElevations: unknown = json?.elevation;
    if (!Array.isArray(rawElevations) || rawElevations.length !== sampled.length) {
      return null;
    }

    const numericElevations = rawElevations.map((v) => Number(v));
    if (numericElevations.some((v) => !Number.isFinite(v))) {
      return null;
    }

    const result = smoothAndAccumulateDem(numericElevations, sampled);
    writeCachedDem(cacheKey, result);
    return result;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
