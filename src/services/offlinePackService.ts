import { TripProfile } from '../types/trip';
import { scanCorridorAmenities } from './overpassCorridor';
import { fetchOsmSurfaceForRoute } from './osmSurfaceService';
import { fetchRouteSectorForecast } from './routeWeatherService';
import { getLocalTodayIso } from './weatherService';
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

function buildRouteTileUrls(coordinates: [number, number][], maxTiles = 48): string[] {
  if (!coordinates || coordinates.length < 2) return [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const [lat, lon] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  const urls: string[] = [];
  const seen = new Set<string>();
  const zooms = [11, 12];

  for (const z of zooms) {
    const tl = latLonToTile(maxLat, minLon, z);
    const br = latLonToTile(minLat, maxLon, z);
    for (let x = tl.x; x <= br.x; x++) {
      for (let y = tl.y; y <= br.y; y++) {
        const url = `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
        if (!seen.has(url)) {
          seen.add(url);
          urls.push(url);
          if (urls.length >= maxTiles) return urls;
        }
      }
    }
  }
  return urls;
}

function prefetchRouteTilesViaSw(coordinates: [number, number][]): number {
  const urls = buildRouteTileUrls(coordinates, 48);
  if (urls.length === 0) return 0;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({
      type: 'PREFETCH_TILES',
      urls,
    });
  }
  return urls.length;
}

/**
 * Downloads and persists an Offline Expedition Pack for a trip:
 * - Corridor POIs (Overpass -> localStorage + IDB)
 * - OSM Surface segments (Overpass -> IDB)
 * - Sector Weather Forecast (Open-Meteo -> IDB)
 * - Map tiles along the route bounding box (Service Worker tile cache)
 */
export async function saveExpeditionPack(
  trip: TripProfile,
  lang: 'en' | 'fr' = 'en'
): Promise<OfflineExpeditionPackMeta> {
  const coords = trip.route?.coordinates ?? [];
  const hasTrace = coords.length >= 2;

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
        elevationProfile: trip.route.elevationProfile,
        lang,
      }),
      fetchOsmSurfaceForRoute({ coordinates: coords, distanceKm: trip.route.distanceKm }),
      fetchRouteSectorForecast(trip, targetDate, targetTime, lang),
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
