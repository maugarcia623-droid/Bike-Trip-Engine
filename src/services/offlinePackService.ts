import { ElevationProfilePoint, TripProfile } from '../types/trip';
import { downsampleCoordinates } from '../utils/stageManager';
import { getRouteHashKey, scanCorridorAmenities, setCachedScan } from './overpassCorridor';
import { fetchOsmSurfaceForRoute, getOsmSurfaceRouteKey } from './osmSurfaceService';
import { fetchRouteSectorForecast } from './routeWeatherService';
import { getLocalTodayIso } from './weatherService';
import { loadRiderBikeSpecs } from '../utils/specsStorage';
import {
  idbDelete,
  idbGet,
  idbPut,
  saveAmenitiesToIdb,
  saveOsmSurfaceToIdb,
  STORE_PACKS,
} from './offlineIdb';

export interface OfflineExpeditionPackMeta {
  tripId: string;
  tripName: string;
  savedAt: string;
  distanceKm: number;
  amenitiesCount: number;
  hasSurface: boolean;
  hasWeather: boolean;
  tilesPrefetched: number;
}

export async function getExpeditionPackStatus(
  tripId: string
): Promise<OfflineExpeditionPackMeta | null> {
  return idbGet<OfflineExpeditionPackMeta>(STORE_PACKS, tripId);
}

export async function deleteExpeditionPack(tripId: string): Promise<void> {
  await idbDelete(STORE_PACKS, tripId);
}

function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/**
 * Builds a zoom-balanced list of ArcGIS tile URLs across zoom levels [11, 12, 13].
 * Queues spine center tiles before corridor halo tiles per zoom, then round-robins across zooms
 * so zoom 11 never starves zooms 12 and 13 within the maxTiles cap.
 */
export function buildRouteTileUrls(coordinates: [number, number][], maxTiles = 96): string[] {
  if (!coordinates || coordinates.length < 2 || maxTiles <= 0) return [];

  const zooms = [11, 12, 13] as const;
  const styles = ['World_Light_Gray_Base', 'World_Dark_Gray_Base'] as const;
  const sampleCount = Math.min(16, coordinates.length);
  const sampled: [number, number][] = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx =
      sampleCount === 1
        ? 0
        : Math.min(coordinates.length - 1, Math.round((i / (sampleCount - 1)) * (coordinates.length - 1)));
    sampled.push(coordinates[idx]);
  }

  const perZoomQueues = new Map<number, string[]>();
  for (const z of zooms) {
    const n = Math.pow(2, z);
    const queue: string[] = [];
    const zoomSeen = new Set<string>();

    const pushTile = (lat: number, lon: number, dx: number, dy: number) => {
      const center = latLonToTile(lat, lon, z);
      const x = Math.max(0, Math.min(n - 1, center.x + dx));
      const y = Math.max(0, Math.min(n - 1, center.y + dy));
      for (const style of styles) {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/${z}/${y}/${x}`;
        if (!zoomSeen.has(url)) {
          zoomSeen.add(url);
          queue.push(url);
        }
      }
    };

    // Pass 1: corridor centerline tiles along the entire route
    for (const [lat, lon] of sampled) {
      pushTile(lat, lon, 0, 0);
    }
    // Pass 2: adjacent corridor halo tiles
    for (const [lat, lon] of sampled) {
      for (const dx of [-1, 0, 1]) {
        for (const dy of [-1, 0, 1]) {
          if (dx === 0 && dy === 0) continue;
          pushTile(lat, lon, dx, dy);
        }
      }
    }
    perZoomQueues.set(z, queue);
  }

  const urls: string[] = [];
  const globalSeen = new Set<string>();
  const cursors = new Map<number, number>(zooms.map((z) => [z, 0]));
  let progressed = true;

  while (urls.length < maxTiles && progressed) {
    progressed = false;
    for (const z of zooms) {
      if (urls.length >= maxTiles) break;
      const queue = perZoomQueues.get(z)!;
      let cursor = cursors.get(z)!;
      while (cursor < queue.length && globalSeen.has(queue[cursor])) {
        cursor++;
      }
      if (cursor < queue.length) {
        const url = queue[cursor];
        globalSeen.add(url);
        urls.push(url);
        cursors.set(z, cursor + 1);
        progressed = true;
      } else {
        cursors.set(z, cursor);
      }
    }
  }

  return urls;
}

/**
 * Warms amenities, surface ways, and sector weather for a single stage, and aliases
 * 250-point downsampled coordinate hashes so switching stages offline never misses cached data.
 */
async function warmStageOfflineAssets(params: {
  tripForWeather: TripProfile;
  coordinates: [number, number][];
  distanceKm: number;
  stageId: string;
  elevationProfile?: ElevationProfilePoint[];
  targetDate: string;
  targetTime: string;
  lang: 'en' | 'fr';
  ftpWatts?: number;
}): Promise<{ amenitiesCount: number; hasSurface: boolean; hasWeather: boolean }> {
  const {
    tripForWeather,
    coordinates,
    distanceKm,
    stageId,
    elevationProfile,
    targetDate,
    targetTime,
    lang,
    ftpWatts,
  } = params;

  const [amenitiesRes, surfaceRes, weatherRes] = await Promise.allSettled([
    scanCorridorAmenities({
      coordinates,
      totalDistanceKm: distanceKm,
      stageId,
      elevationProfile,
      lang,
    }),
    fetchOsmSurfaceForRoute({ coordinates, distanceKm }),
    fetchRouteSectorForecast(tripForWeather, targetDate, targetTime, lang, ftpWatts),
  ]);

  const downsampled = coordinates.length > 250 ? downsampleCoordinates(coordinates, 250) : undefined;
  let amenitiesCount = 0;
  let hasSurface = false;
  let hasWeather = false;

  if (amenitiesRes.status === 'fulfilled') {
    amenitiesCount = amenitiesRes.value.length;
    if (downsampled && downsampled.length >= 2) {
      const rawKey = getRouteHashKey(coordinates, stageId, distanceKm);
      const dsKey = getRouteHashKey(downsampled, stageId, distanceKm);
      if (dsKey !== rawKey) {
        setCachedScan(dsKey, amenitiesRes.value);
        await saveAmenitiesToIdb(dsKey, amenitiesRes.value).catch(() => {});
      }
    }
  }

  if (surfaceRes.status === 'fulfilled') {
    hasSurface = surfaceRes.value.ways.length > 0;
    if (downsampled && downsampled.length >= 2) {
      const rawSurfKey = getOsmSurfaceRouteKey(coordinates, distanceKm);
      const dsSurfKey = getOsmSurfaceRouteKey(downsampled, distanceKm);
      if (dsSurfKey !== rawSurfKey) {
        await saveOsmSurfaceToIdb(dsSurfKey, {
          ...surfaceRes.value,
          routeKey: dsSurfKey,
        }).catch(() => {});
      }
    }
  }

  if (weatherRes.status === 'fulfilled' && weatherRes.value) {
    hasWeather = true;
  }

  return { amenitiesCount, hasSurface, hasWeather };
}

function prefetchRouteTilesViaSw(coordinates: [number, number][]): number {
  const urls = buildRouteTileUrls(coordinates, 96);
  if (urls.length === 0) return 0;
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !navigator.serviceWorker.controller
  ) {
    return 0;
  }
  navigator.serviceWorker.controller.postMessage({
    type: 'PREFETCH_TILES',
    urls,
  });
  return urls.length;
}

/**
 * Downloads and persists an Offline Expedition Pack for a trip:
 * - Corridor POIs (Overpass -> localStorage + IDB)
 * - OSM Surface segments (Overpass -> IDB)
 * - Sector Weather Forecast (Open-Meteo -> IDB)
 * - Map tiles along the route corridor (Service Worker tile cache)
 */
export async function saveExpeditionPack(
  trip: TripProfile,
  lang: 'en' | 'fr' = 'en'
): Promise<OfflineExpeditionPackMeta> {
  const coords = trip.route?.coordinates ?? [];
  const hasTrace = coords.length >= 2;
  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const stageId = activeStage?.id || trip.id;
  const ftpWatts = loadRiderBikeSpecs().ftpWatts;

  let amenitiesCount = 0;
  let hasSurface = false;
  let hasWeather = false;

  if (hasTrace) {
    const targetDate = trip.departureDate || getLocalTodayIso();
    const targetTime = trip.departureTime || '08:00';
    const activeWarm = await warmStageOfflineAssets({
      tripForWeather: trip,
      coordinates: coords,
      distanceKm: trip.route.distanceKm,
      stageId,
      elevationProfile: trip.route.elevationProfile,
      targetDate,
      targetTime,
      lang,
      ftpWatts,
    });
    amenitiesCount = activeWarm.amenitiesCount;
    hasSurface = activeWarm.hasSurface;
    hasWeather = activeWarm.hasWeather;
  }

  let extraStageTiles = 0;

  // Warm additional expedition stages (POIs, surfaces, sector weather & tiles) for multi-day offline readiness
  if (trip.stages && trip.stages.length > 1) {
    const otherStages = trip.stages.filter(
      (s) => s.id !== stageId && (s.route?.coordinates?.length ?? 0) >= 2
    );
    if (otherStages.length > 0) {
      for (const st of otherStages) {
        extraStageTiles += prefetchRouteTilesViaSw(st.route.coordinates!);
      }
      await Promise.allSettled(
        otherStages.map((st) => {
          const stageDate = st.departureDate || trip.departureDate || getLocalTodayIso();
          const stageTime = st.departureTime || trip.departureTime || '08:00';
          return warmStageOfflineAssets({
            tripForWeather: {
              ...trip,
              id: trip.id,
              route: st.route,
              departureDate: stageDate,
              departureTime: stageTime,
              customChips: st.customChips ?? trip.customChips,
              weather: st.weather ?? trip.weather,
              office: st.office ?? trip.office,
              arriveAtMode:
                st.targetMode !== undefined ? st.targetMode === 'arrive' : trip.arriveAtMode,
            },
            coordinates: st.route.coordinates!,
            distanceKm: st.route.distanceKm,
            stageId: st.id,
            elevationProfile: st.route.elevationProfile,
            targetDate: stageDate,
            targetTime: stageTime,
            lang,
            ftpWatts,
          });
        })
      );
    }
  }

  const tilesPrefetched = (hasTrace ? prefetchRouteTilesViaSw(coords) : 0) + extraStageTiles;

  const meta: OfflineExpeditionPackMeta = {
    tripId: trip.id,
    tripName: trip.name,
    savedAt: new Date().toISOString(),
    distanceKm: trip.route?.distanceKm ?? 0,
    amenitiesCount,
    hasSurface,
    hasWeather,
    tilesPrefetched,
  };

  await idbPut(STORE_PACKS, meta);
  return meta;
}
