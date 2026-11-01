/**
 * High-Precision Multi-Provider Location & Geocoding Service
 *
 * Integrated Datasets:
 * 1. Base Adresse Nationale (BAN - data.gouv.fr): Official French National Address Database
 *    (covers 100% of French street addresses, house numbers, hamlets, and municipalities).
 * 2. Komoot Photon (OpenStreetMap): High-speed global POI & place index
 *    (train stations, monuments, mountain passes, international cities, cycling trails).
 * 3. OSM Nominatim: Deep fallback for global administrative queries.
 */

export interface LocationSuggestion {
  id: string;
  name: string;             // Primary label: e.g. "12 Rue de la Paix", "Gare de Nantes Nord", "Saint-Nazaire"
  secondaryText: string;    // Context hierarchy: e.g. "44000 Nantes, Loire-Atlantique, France"
  fullDisplayName: string;  // Complete label
  coordinates: [number, number]; // [lat, lng]
  type?: string;            // 'housenumber' | 'street' | 'station' | 'city' | 'poi' | etc.
  source?: 'ban' | 'photon' | 'nominatim' | 'preset';
}

export interface SearchLocationOptions {
  lang?: 'en' | 'fr';
  biasCoords?: [number, number]; // [lat, lng]
  signal?: AbortSignal;
  limit?: number;
}

// In-memory cache to make repeated keystrokes instantaneous
const suggestionCache = new Map<string, LocationSuggestion[]>();
const MAX_CACHE_SIZE = 120;

function setCache(key: string, results: LocationSuggestion[]) {
  if (suggestionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey) suggestionCache.delete(oldestKey);
  }
  suggestionCache.set(key, results);
}

// Preset popular cycling hubs in the corridor
export const POPULAR_CYCLING_HUBS: LocationSuggestion[] = [
  {
    id: 'preset-nantes',
    name: 'Nantes',
    secondaryText: '44000, Loire-Atlantique, Pays de la Loire',
    fullDisplayName: 'Nantes, 44000, Loire-Atlantique, France',
    coordinates: [47.2186, -1.5541],
    type: 'city',
    source: 'preset',
  },
  {
    id: 'preset-st-nazaire',
    name: 'Saint-Nazaire',
    secondaryText: '44600, Pont de Saint-Nazaire, Loire-Atlantique',
    fullDisplayName: 'Saint-Nazaire, 44600, Loire-Atlantique, France',
    coordinates: [47.2734, -2.2139],
    type: 'city',
    source: 'preset',
  },
  {
    id: 'preset-clisson',
    name: 'Clisson',
    secondaryText: '44190, Vignoble Sèvre Nantaise, Loire-Atlantique',
    fullDisplayName: 'Clisson, 44190, Loire-Atlantique, France',
    coordinates: [47.0872, -1.2825],
    type: 'city',
    source: 'preset',
  },
  {
    id: 'preset-pornic',
    name: 'Pornic',
    secondaryText: '44210, Côte de Jade, Loire-Atlantique',
    fullDisplayName: 'Pornic, 44210, Loire-Atlantique, France',
    coordinates: [47.1158, -2.1026],
    type: 'city',
    source: 'preset',
  },
  {
    id: 'preset-gare-nantes',
    name: 'Gare de Nantes Nord',
    secondaryText: 'Esplanade Pierre Semard, 44000 Nantes',
    fullDisplayName: 'Gare de Nantes Nord, Esplanade Pierre Semard, 44000 Nantes',
    coordinates: [47.2174, -1.5434],
    type: 'station',
    source: 'preset',
  },
];

/**
 * Formats a BAN (Base Adresse Nationale) GeoJSON feature
 */
function formatBanFeature(feature: any): LocationSuggestion | null {
  if (!feature?.properties || !feature?.geometry?.coordinates) return null;
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

  const name = p.name || p.label || 'Lieu';
  const secondaryParts: string[] = [];
  if (p.postcode && p.city) {
    secondaryParts.push(`${p.postcode} ${p.city}`);
  } else if (p.city) {
    secondaryParts.push(p.city);
  }
  if (p.context) {
    secondaryParts.push(p.context);
  }

  const secondaryText = secondaryParts.join(' · ');
  const fullDisplayName = p.label || (secondaryText ? `${name}, ${secondaryText}` : name);

  return {
    id: `ban-${p.id || Math.random().toString(36).slice(2)}`,
    name,
    secondaryText,
    fullDisplayName,
    coordinates: [lat, lon],
    type: p.type || 'housenumber',
    source: 'ban',
  };
}

/**
 * Formats a Photon GeoJSON feature
 */
function formatPhotonFeature(feature: any): LocationSuggestion | null {
  if (!feature?.properties || !feature?.geometry?.coordinates) return null;
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

  const name = p.name || (p.housenumber ? `${p.housenumber} ${p.street || ''}`.trim() : p.street) || p.city || 'Lieu';
  const secondaryParts: string[] = [];

  if (p.housenumber && p.street && name !== `${p.housenumber} ${p.street}`) {
    secondaryParts.push(`${p.housenumber} ${p.street}`);
  } else if (p.street && name !== p.street) {
    secondaryParts.push(p.street);
  }

  if (p.postcode && p.city) {
    secondaryParts.push(`${p.postcode} ${p.city}`);
  } else if (p.city && p.city !== name) {
    secondaryParts.push(p.city);
  }

  if (p.county && p.county !== p.city && p.county !== name) {
    secondaryParts.push(p.county);
  }
  if (p.state && p.state !== p.county && p.state !== p.city) {
    secondaryParts.push(p.state);
  }
  if (p.country && p.country !== 'France') {
    secondaryParts.push(p.country);
  }

  const secondaryText = secondaryParts.join(' · ');
  const fullDisplayName = secondaryText ? `${name}, ${secondaryText}` : name;

  return {
    id: `photon-${p.osm_type || 'x'}-${p.osm_id || Math.random().toString(36).slice(2)}-${lat}-${lon}`,
    name,
    secondaryText,
    fullDisplayName,
    coordinates: [lat, lon],
    type: p.type || p.osm_value,
    source: 'photon',
  };
}

/**
 * Formats a Nominatim search response item
 */
function formatNominatimItem(item: any): LocationSuggestion | null {
  if (!item?.lat || !item?.lon) return null;
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

  const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
  const name = item.name || parts[0] || 'Lieu';
  const secondaryParts = parts.slice(1, 4);
  const secondaryText = secondaryParts.join(' · ');

  return {
    id: `nominatim-${item.place_id || Math.random().toString(36).slice(2)}-${lat}-${lon}`,
    name,
    secondaryText,
    fullDisplayName: item.display_name || name,
    coordinates: [lat, lon],
    type: item.type || item.class,
    source: 'nominatim',
  };
}

export function formatTypeBadge(type?: string, lang: 'fr' | 'en' = 'fr'): string {
  if (!type) return lang === 'fr' ? 'Lieu' : 'Place';
  const t = type.toLowerCase();
  if (t.includes('housenumber') || t.includes('address')) {
    return lang === 'fr' ? 'Adresse' : 'Address';
  }
  if (t.includes('street')) {
    return lang === 'fr' ? 'Rue' : 'Street';
  }
  if (t.includes('station') || t.includes('railway') || t.includes('train')) {
    return lang === 'fr' ? 'Gare' : 'Station';
  }
  if (t.includes('municipality') || t.includes('city') || t.includes('town') || t.includes('village')) {
    return lang === 'fr' ? 'Ville' : 'City';
  }
  if (t.includes('building') || t.includes('hotel')) {
    return lang === 'fr' ? 'Établissement' : 'Venue';
  }
  if (t.includes('peak') || t.includes('volcano') || t.includes('mountain')) {
    return lang === 'fr' ? 'Sommet' : 'Peak';
  }
  return lang === 'fr' ? 'Lieu' : 'Place';
}

/**
 * High-speed multi-source search combining Base Adresse Nationale + Photon OSM
 */
export async function searchLocationSuggestions(
  rawQuery: string,
  options?: SearchLocationOptions
): Promise<LocationSuggestion[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const lang = options?.lang || 'fr';
  const limit = options?.limit || 7;
  const cacheKey = `${query.toLowerCase()}#${lang}#${options?.biasCoords?.join(',') || 'none'}`;

  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey)!;
  }

  // 1. BAN API (French National Address Database)
  const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=${limit}`;
  const banPromise = fetch(banUrl, { signal: options?.signal })
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch((err) => {
      if (err?.name === 'AbortError') throw err;
      return null;
    });

  // 2. Komoot Photon API (Global OpenStreetMap POIs, stations, mountains, cities)
  let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=${lang}`;
  // Only apply bias if coordinates were explicitly supplied by the caller
  if (options?.biasCoords && options.biasCoords.length === 2) {
    photonUrl += `&lat=${options.biasCoords[0]}&lon=${options.biasCoords[1]}`;
  }

  const photonPromise = fetch(photonUrl, {
    signal: options?.signal,
    headers: { Accept: 'application/json' },
  })
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch((err) => {
      if (err?.name === 'AbortError') throw err;
      return null;
    });

  let banData: any = null;
  let photonData: any = null;

  try {
    [banData, photonData] = await Promise.all([banPromise, photonPromise]);
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
  }

  const banResults: LocationSuggestion[] = (banData?.features || [])
    .map(formatBanFeature)
    .filter((s: LocationSuggestion | null): s is LocationSuggestion => s !== null);

  const photonResults: LocationSuggestion[] = (photonData?.features || [])
    .map(formatPhotonFeature)
    .filter((s: LocationSuggestion | null): s is LocationSuggestion => s !== null);

  // Smart Query Analysis
  const isPoiQuery = /\b(gare|station|aeroport|airport|hotel|chateau|château|pont|bridge|sommet|mont|lac|port|plage|beach)\b/i.test(
    query
  );
  const isAddressQuery = /\d|\b(rue|av|avenue|bd|boulevard|chemin|route|allee|allée|impasse|quai|place|cours)\b/i.test(
    query
  );

  let merged: LocationSuggestion[] = [];

  if (isAddressQuery && banResults.length > 0) {
    // Address with street/number: prioritize BAN
    merged = [...banResults, ...photonResults];
  } else if (isPoiQuery) {
    // POI, station, landmark: prioritize Photon OSM
    merged = [...photonResults, ...banResults];
  } else {
    // General city / town search: interleave or place top BAN then Photon
    if (banResults.length > 0) {
      merged = [banResults[0], ...photonResults, ...banResults.slice(1)];
    } else {
      merged = [...photonResults, ...banResults];
    }
  }

  // Deduplicate results by proximity and name
  const deduped: LocationSuggestion[] = [];
  const seenCoordinates = new Set<string>();

  for (const item of merged) {
    const coordKey = `${item.coordinates[0].toFixed(3)},${item.coordinates[1].toFixed(3)}`;
    if (!seenCoordinates.has(coordKey)) {
      seenCoordinates.add(coordKey);
      deduped.push(item);
    }
  }

  if (deduped.length > 0) {
    const finalResults = deduped.slice(0, limit);
    setCache(cacheKey, finalResults);
    return finalResults;
  }

  // 3. Last-resort fallback to OpenStreetMap Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=${limit}&accept-language=${lang}`;

    const nominatimRes = await fetch(nominatimUrl, {
      signal: options?.signal,
      headers: { 'Accept-Language': `${lang},en` },
    });

    if (nominatimRes.ok) {
      const items = await nominatimRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const results = items
          .map(formatNominatimItem)
          .filter((s: LocationSuggestion | null): s is LocationSuggestion => s !== null);

        if (results.length > 0) {
          setCache(cacheKey, results);
          return results;
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.error('Nominatim autocomplete fallback failed', err);
  }

  return [];
}

/**
 * Geocoder: returns [lat, lng] or null
 */
export async function geocodeLocation(
  query: string,
  lang: 'en' | 'fr' = 'fr',
  biasCoords?: [number, number]
): Promise<[number, number] | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const suggestions = await searchLocationSuggestions(trimmed, {
      lang,
      biasCoords,
      limit: 1,
    });

    if (suggestions.length > 0) {
      return suggestions[0].coordinates;
    }
  } catch (err) {
    console.error('Geocoding error for:', query, err);
  }

  return null;
}
