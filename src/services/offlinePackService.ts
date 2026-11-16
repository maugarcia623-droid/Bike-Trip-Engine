import { TripProfile } from '../types/trip';
import { scanCorridorAmenities } from './overpassCorridor';
import { fetchOsmSurfaceForRoute } from './osmSurfaceService';
import { fetchRouteSectorForecast } from './routeWeatherService';
import { getLocalTodayIso } from './weatherService';
import { loadRiderBikeSpecs } from '../utils/specsStorage';
import { idbDelete, idbGet, idbPut, STORE_PACKS } from './offlineIdb';

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

function buildRouteTileUrls(coordinates: [number, number][], maxTiles = 96): string[] {
  if (!coordinates || coordinates.length < 2) return [];

  const urls: string[] = [];
  const seen = new Set<string>();
  const zooms = [11, 12, 13];
  const sampleCount = Math.min(16, coordinates.length);
  const sampled: [number, number][] = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx =
      sampleCount === 1
        ? 0
        : Math.min(coordinates.length - 1, Math.round((i / (sampleCount - 1)) * (coordinates.length - 1)));
    sampled.push(coordinates[idx]);
  }

  for (const z of zooms) {
    const n = Math.pow(2, z);
    const offsets = z === 13 ? [0] : [-1, 0, 1];
    for (const [lat, lon] of sampled) {
      const center = latLonToTile(lat, lon, z);
      for (const dx of offsets) {
        for (const dy of offsets) {
          const x = Math.max(0, Math.min(n - 1, center.x + dx));
          const y = Math.max(0, Math.min(n - 1, center.y + dy));
          for (const style of ['World_Light_Gray_Base', 'World_Dark_Gray_Base'] as const) {
            const url = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/${z}/${y}/${x}`;
            if (!seen.has(url)) {
              seen.add(url);
              urls.push(url);
              if (urls.length >= maxTiles) return urls;
            }
          }
        }
      }
    }
  }
  return urls;
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

    const [amenitiesRes, surfaceRes, weatherRes] = await Promise.allSettled([
      scanCorridorAmenities({
        coordinates: coords,
        totalDistanceKm: trip.route.distanceKm,
        stageId,
        elevationProfile: trip.route.elevationProfile,
        lang,
      }),
      fetchOsmSurfaceForRoute({ coordinates: coords, distanceKm: trip.route.distanceKm }),
      fetchRouteSectorForecast(trip, targetDate, targetTime, lang, ftpWatts),
    ]);

    if (amenitiesRes.status === 'fulfilled') {
      amenitiesCount = amenitiesRes.value.length;
    }
    if (surfaceRes.status === 'fulfilled') {
      hasSurface = surfaceRes.value.ways.length > 0;
    }
    if (weatherRes.status === 'fulfilled' && weatherRes.value) {
      hasWeather = true;
    }
  }

  const tilesPrefetched = hasTrace ? prefetchRouteTilesViaSw(coords) : 0;

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
