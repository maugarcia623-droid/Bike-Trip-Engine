import { reverseGeocodeLocation } from './locationService';
import { haversineKm } from '../utils/gpxSlicer';

export type OvernightSpotKind = 'campsite' | 'lodging' | 'station' | 'town';

export interface OvernightSpot {
  id: string;
  name: string;
  kind: OvernightSpotKind;
  lat: number;
  lng: number;
  distanceFromCutKm: number;
  subtitle?: string;
}

const OVERPASS_ENDPOINTS = [
  'https://ovp.dresel.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const placeNameCache = new Map<string, string>();
const overnightCache = new Map<string, OvernightSpot[]>();

function coordCacheKey(lat: number, lng: number, precision = 2): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

/**
 * Cleans verbose street-level reverse geocoder results down to a concise village/town name
 * suitable for stage titles (e.g. "Rue de la Gare (Redon)" -> "Redon").
 */
export function condensePlaceLabel(rawLabel: string): string {
  const trimmed = (rawLabel || '').trim();
  if (!trimmed) return '';
  if (/^\d+\.\d+°[NS]/.test(trimmed)) return '';

  const parenMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const lead = parenMatch[1].trim();
    const city = parenMatch[2].trim();
    const looksLikeStreet =
      /^(rue|avenue|boulevard|chemin|impasse|all[ée]e|route|place|d\s?\d+|n\s?\d+|c\s?\d+|\d+\s)/i.test(lead) ||
      /\b(road|street|lane|ave|rd|st|way|drive)\b/i.test(lead);
    if (looksLikeStreet && city) {
      return city;
    }
    return lead.length > 26 && city ? city : lead;
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const firstLooksLikeStreet = /^\d+|^(rue|avenue|route|chemin|bd|boulevard|d\s?\d+)/i.test(parts[0]);
      return firstLooksLikeStreet ? parts[1] : parts[0];
    }
  }

  return trimmed;
}

/**
 * Resolves a human-friendly village/town name near a cut coordinate with in-memory caching.
 */
export async function resolveCutTownName(
  lat: number,
  lng: number,
  lang: 'en' | 'fr' = 'en'
): Promise<string> {
  const key = `${lang}:${coordCacheKey(lat, lng, 2)}`;
  const cached = placeNameCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const raw = await reverseGeocodeLocation(lat, lng, lang);
    const shortName = condensePlaceLabel(raw);
    if (shortName) {
      placeNameCache.set(key, shortName);
      return shortName;
    }
  } catch {
    // Non-blocking fallback
  }
  return '';
}

/**
 * Fast, CORS-friendly Photon POI lookup near [lat, lng] used alongside Overpass so
 * Sleep Stops always returns real campsites, hotels, train stations, and towns quickly.
 */
async function queryPhotonOvernightSpots(
  lat: number,
  lng: number,
  maxRadiusKm: number
): Promise<OvernightSpot[]> {
  const queries: Array<{ q: string; kind: OvernightSpotKind }> = [
    { q: 'camping', kind: 'campsite' },
    { q: 'hotel', kind: 'lodging' },
    { q: 'gare', kind: 'station' },
  ];

  const results = await Promise.all(
    queries.map(async ({ q, kind }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3200);
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&limit=8`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return [] as OvernightSpot[];
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const list: OvernightSpot[] = [];

        for (const f of features) {
          const coords = f?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) continue;
          const ptLon = Number(coords[0]);
          const ptLat = Number(coords[1]);
          if (!Number.isFinite(ptLat) || !Number.isFinite(ptLon)) continue;

          const distKm = Number(haversineKm(lat, lng, ptLat, ptLon).toFixed(1));
          if (distKm > maxRadiusKm) continue;

          const p = f.properties || {};
          const osmKey = String(p.osm_key || '');
          const osmVal = String(p.osm_value || '');

          let resolvedKind: OvernightSpotKind = kind;
          if (osmVal === 'camp_site' || osmVal === 'caravan_site') {
            resolvedKind = 'campsite';
          } else if (osmVal === 'station' || osmVal === 'halt' || osmKey === 'railway') {
            resolvedKind = 'station';
          } else if (
            osmVal === 'hotel' ||
            osmVal === 'hostel' ||
            osmVal === 'guest_house' ||
            osmVal === 'motel' ||
            osmVal === 'chalet'
          ) {
            resolvedKind = 'lodging';
          } else if (osmKey === 'place') {
            resolvedKind = 'town';
          }

          const name = String(p.name || p.city || p.locality || '').trim();
          if (!name) continue;

          list.push({
            id: `photon/${p.osm_type || 'n'}/${p.osm_id || `${ptLat.toFixed(4)}_${ptLon.toFixed(4)}`}`,
            name,
            kind: resolvedKind,
            lat: ptLat,
            lng: ptLon,
            distanceFromCutKm: distKm,
            subtitle: p.city && p.city !== name ? String(p.city) : undefined,
          });
        }
        return list;
      } catch {
        clearTimeout(timer);
        return [] as OvernightSpot[];
      }
    })
  );

  return results.flat();
}

async function queryOverpassOvernightSpots(
  lat: number,
  lng: number,
  radiusM: number
): Promise<OvernightSpot[]> {
  const rCamp = Math.round(radiusM);
  const rHotel = Math.round(radiusM * 0.75);
  const query = `
[out:json][timeout:6];
(
  node["tourism"="camp_site"](around:${rCamp},${lat.toFixed(5)},${lng.toFixed(5)});
  way["tourism"="camp_site"](around:${rCamp},${lat.toFixed(5)},${lng.toFixed(5)});
  node["tourism"="hotel"]["name"](around:${rHotel},${lat.toFixed(5)},${lng.toFixed(5)});
  node["tourism"="hostel"]["name"](around:${rCamp},${lat.toFixed(5)},${lng.toFixed(5)});
  node["tourism"="guest_house"]["name"](around:${rHotel},${lat.toFixed(5)},${lng.toFixed(5)});
  node["railway"="station"]["name"](around:${rCamp},${lat.toFixed(5)},${lng.toFixed(5)});
  node["place"~"^(city|town|village)$"]["name"](around:${rCamp},${lat.toFixed(5)},${lng.toFixed(5)});
);
out center 40;
`.trim();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = await res.json();
      const elements: Array<{
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }> = Array.isArray(data?.elements) ? data.elements : [];

      const spots: OvernightSpot[] = [];
      for (const el of elements) {
        const ptLat = el.lat ?? el.center?.lat;
        const ptLon = el.lon ?? el.center?.lon;
        if (typeof ptLat !== 'number' || typeof ptLon !== 'number') continue;
        const tags = el.tags || {};

        let kind: OvernightSpotKind = 'town';
        let defaultName = '';
        if (tags.tourism === 'camp_site' || tags.tourism === 'caravan_site') {
          kind = 'campsite';
          defaultName = 'Camping';
        } else if (
          tags.tourism === 'hotel' ||
          tags.tourism === 'hostel' ||
          tags.tourism === 'guest_house'
        ) {
          kind = 'lodging';
          defaultName = 'Lodging';
        } else if (tags.railway === 'station') {
          kind = 'station';
          defaultName = 'Train Station';
        } else if (tags.place) {
          kind = 'town';
        }

        const name = (tags.name || defaultName).trim();
        if (!name) continue;

        spots.push({
          id: `${el.type}/${el.id}`,
          name,
          kind,
          lat: ptLat,
          lng: ptLon,
          distanceFromCutKm: Number(haversineKm(lat, lng, ptLat, ptLon).toFixed(1)),
          subtitle: tags['addr:city'] || tags.operator || undefined,
        });
      }
      if (spots.length > 0) return spots;
    } catch {
      clearTimeout(timer);
    }
  }
  return [];
}

/**
 * Searches Overpass + Photon in parallel within `radiusM` of a cut point for real bikepacking
 * overnight anchors: campsites, hotels/hostels/guesthouses, railway stations, and towns.
 * Never caches empty failure responses so users can always retry cleanly.
 */
export async function findOvernightSpotsNearCut(
  lat: number,
  lng: number,
  radiusM: number = 9000
): Promise<OvernightSpot[]> {
  const key = `${coordCacheKey(lat, lng, 2)}:${radiusM}`;
  const cached = overnightCache.get(key);
  if (cached && cached.length > 0) return cached;

  const maxRadiusKm = Math.max(5, radiusM / 1000);
  const [overpassSpots, photonSpots] = await Promise.all([
    queryOverpassOvernightSpots(lat, lng, radiusM),
    queryPhotonOvernightSpots(lat, lng, maxRadiusKm),
  ]);

  const combined = [...overpassSpots, ...photonSpots];
  const seenNames = new Set<string>();
  const deduped: OvernightSpot[] = [];

  for (const s of combined) {
    const dedupeKey = `${s.kind}:${s.name.toLowerCase()}`;
    if (seenNames.has(dedupeKey)) continue;
    seenNames.add(dedupeKey);
    deduped.push(s);
  }

  const kindWeight: Record<OvernightSpotKind, number> = {
    campsite: 0,
    town: 0.4,
    station: 0.5,
    lodging: 0.8,
  };
  deduped.sort(
    (a, b) => a.distanceFromCutKm + kindWeight[a.kind] - (b.distanceFromCutKm + kindWeight[b.kind])
  );

  const picked: OvernightSpot[] = [];
  const counts: Record<OvernightSpotKind, number> = { campsite: 0, lodging: 0, station: 0, town: 0 };
  const caps: Record<OvernightSpotKind, number> = { campsite: 4, lodging: 3, station: 2, town: 3 };
  for (const s of deduped) {
    if (counts[s.kind] < caps[s.kind]) {
      picked.push(s);
      counts[s.kind] += 1;
    }
    if (picked.length >= 10) break;
  }

  if (picked.length > 0) {
    overnightCache.set(key, picked);
  }
  return picked;
}
