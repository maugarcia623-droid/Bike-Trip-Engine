import { useCallback, useEffect, useMemo, useState } from 'react';
import { SurfaceType, SectorTechnicality } from '../types/trip';
import {
  computeCumulativeDistances,
  fetchOverpassWithFailover,
  haversineDistanceMeters,
} from './overpassCorridor';

export interface OsmWayTags {
  highway?: string;
  surface?: string;
  tracktype?: string;
  smoothness?: string;
  bicycle?: string;
  footway?: string;
  service?: string;
  access?: string;
  name?: string;
  ref?: string;
  'mtb:scale'?: string;
  sac_scale?: string;
  width?: string;
  'cycleway:surface'?: string;
  'cycleway:both:surface'?: string;
  [key: string]: string | undefined;
}

export interface OsmWayElement {
  id: number;
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  geometry: { lat: number; lon: number }[];
  tags: OsmWayTags;
}

export interface ClassifiedOsmWay {
  surfaceType: SurfaceType;
  technicality: SectorTechnicality;
  suitability38c: 'ideal' | 'capable' | 'caution';
  effectiveCrr: number;
  isInferredFromHighway: boolean;
  detailEn: string;
  detailFr: string;
  riderNoteEn: string;
  riderNoteFr: string;
}

export interface OsmSurfaceRouteData {
  routeKey: string;
  ways: OsmWayElement[];
  wayCount: number;
  chunkCount: number;
  fetchedAt: string;
}

export type OsmFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface OsmSurfaceStateEntry {
  status: OsmFetchStatus;
  data?: OsmSurfaceRouteData;
  error?: string;
}

// Ephemeral Tier-1 In-Memory Cache & Pub/Sub Store
const osmSurfaceStore = new Map<string, OsmSurfaceStateEntry>();
const osmInFlight = new Map<string, Promise<OsmSurfaceRouteData>>();
const osmListeners = new Set<(key: string) => void>();

function notifyOsmListeners(key: string): void {
  osmListeners.forEach((listener) => listener(key));
}

export function subscribeOsmSurface(listener: (key: string) => void): () => void {
  osmListeners.add(listener);
  return () => {
    osmListeners.delete(listener);
  };
}

/**
 * Deterministic collision-resistant route hash key derived from coordinates + distance,
 * independent of stageId so Dashboard Cards, Map Banners, and Configurator share one cache entry.
 */
export function getOsmSurfaceRouteKey(
  coordinates?: [number, number][],
  distanceKm?: number
): string {
  if (!coordinates || coordinates.length < 2) {
    return 'empty';
  }
  const n = coordinates.length;
  const sampleIndices = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) =>
    Math.min(n - 1, Math.floor(t * (n - 1)))
  );
  const sig = sampleIndices
    .map((idx) => `${coordinates[idx][0].toFixed(4)},${coordinates[idx][1].toFixed(4)}`)
    .join('|');
  const distTag = typeof distanceKm === 'number' ? Math.round(distanceKm * 10) : 0;
  return `osm-surf-${n}-${distTag}-${sig}`;
}

export function getCachedOsmSurfaceEntry(routeKey: string): OsmSurfaceStateEntry | undefined {
  return osmSurfaceStore.get(routeKey);
}

/**
 * Computes average vertex spacing to adapt Overpass `around` buffer width
 * (wider on simplified preset chords, tight on dense OSRM/GPX traces).
 */
function computeQueryBufferMeters(
  coordinates: [number, number][],
  cumMeters: number[]
): number {
  const totalM = cumMeters[cumMeters.length - 1] || 0;
  const avgStepM = totalM / Math.max(1, coordinates.length - 1);
  if (avgStepM > 400) return 55;
  if (avgStepM > 180) return 40;
  return 28;
}

/**
 * Splits a route polyline into manageable geographic chunks (~9km or max 24 vertices per chunk)
 * with overlapping boundary vertices so Overpass stays fast (<2.5s/chunk) and never hits rate limits.
 */
function buildOverpassPolylineChunks(
  coordinates: [number, number][],
  cumMeters: number[]
): [number, number][][] {
  if (coordinates.length < 2) return [];

  const MAX_CHUNK_METERS = 9500;
  const MAX_CHUNK_POINTS = 22;
  const chunks: [number, number][][] = [];

  let chunkStartIdx = 0;
  while (chunkStartIdx < coordinates.length - 1) {
    const startMeters = cumMeters[chunkStartIdx];
    const rawSlice: [number, number][] = [coordinates[chunkStartIdx]];
    let endIdx = chunkStartIdx + 1;

    while (endIdx < coordinates.length) {
      rawSlice.push(coordinates[endIdx]);
      const spanMeters = cumMeters[endIdx] - startMeters;
      if (spanMeters >= MAX_CHUNK_METERS || rawSlice.length >= MAX_CHUNK_POINTS * 3) {
        break;
      }
      endIdx++;
    }

    // Downsample dense GPS slices inside a chunk to <= MAX_CHUNK_POINTS while preserving endpoints
    let chunkPoints = rawSlice;
    if (rawSlice.length > MAX_CHUNK_POINTS) {
      chunkPoints = [];
      for (let i = 0; i < MAX_CHUNK_POINTS; i++) {
        const idx = Math.round((i / (MAX_CHUNK_POINTS - 1)) * (rawSlice.length - 1));
        chunkPoints.push(rawSlice[idx]);
      }
    }

    if (chunkPoints.length >= 2) {
      chunks.push(chunkPoints);
    }

    if (endIdx >= coordinates.length - 1) {
      break;
    }
    // Share boundary vertex with next chunk so there is zero gap
    chunkStartIdx = endIdx;
  }

  return chunks;
}

function buildChunkOverpassQuery(chunk: [number, number][], bufferMeters: number): string {
  const flatCoords = chunk
    .map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`)
    .join(',');
  return [
    '[out:json][timeout:10];',
    `way(around:${bufferMeters},${flatCoords})`,
    '["highway"]',
    '["highway"!~"motorway|motorway_link|trunk|trunk_link|steps|corridor|elevator|construction|proposed"]',
    '["service"!~"driveway|parking_aisle"]',
    '["footway"!~"crossing|sidewalk"]',
    '["area"!="yes"];',
    'out tags geom;',
  ].join('');
}

function normalizeOsmElement(raw: any): OsmWayElement | null {
  if (!raw || raw.type !== 'way' || !Array.isArray(raw.geometry) || raw.geometry.length < 2) {
    return null;
  }
  const geometry = raw.geometry.filter(
    (pt: any) => typeof pt?.lat === 'number' && typeof pt?.lon === 'number'
  );
  if (geometry.length < 2) return null;

  let bounds = raw.bounds;
  if (!bounds) {
    let minlat = Infinity;
    let minlon = Infinity;
    let maxlat = -Infinity;
    let maxlon = -Infinity;
    for (const pt of geometry) {
      if (pt.lat < minlat) minlat = pt.lat;
      if (pt.lat > maxlat) maxlat = pt.lat;
      if (pt.lon < minlon) minlon = pt.lon;
      if (pt.lon > maxlon) maxlon = pt.lon;
    }
    bounds = { minlat, minlon, maxlat, maxlon };
  }

  return {
    id: Number(raw.id),
    bounds,
    geometry,
    tags: raw.tags || {},
  };
}

/**
 * Fetches real OpenStreetMap way tags and geometry along the active route polyline.
 * Uses Tier-1 in-memory caching and deduplicates simultaneous requests from multiple UI cards.
 */
export async function fetchOsmSurfaceForRoute(params: {
  coordinates: [number, number][];
  distanceKm?: number;
  forceFresh?: boolean;
}): Promise<OsmSurfaceRouteData> {
  const { coordinates, distanceKm, forceFresh = false } = params;
  if (!coordinates || coordinates.length < 2) {
    throw new Error('Route needs at least 2 coordinates to query OpenStreetMap.');
  }

  const routeKey = getOsmSurfaceRouteKey(coordinates, distanceKm);
  const existing = osmSurfaceStore.get(routeKey);
  if (!forceFresh && existing?.status === 'ready' && existing.data) {
    return existing.data;
  }

  if (!forceFresh && osmInFlight.has(routeKey)) {
    return osmInFlight.get(routeKey)!;
  }

  osmSurfaceStore.set(routeKey, {
    status: 'loading',
    data: existing?.data,
  });
  notifyOsmListeners(routeKey);

  const runPromise = (async (): Promise<OsmSurfaceRouteData> => {
    try {
      const cumMeters = computeCumulativeDistances(coordinates);
      const bufferMeters = computeQueryBufferMeters(coordinates, cumMeters);
      const chunks = buildOverpassPolylineChunks(coordinates, cumMeters);

      // Cap extreme mega-routes gently while preserving full chunking for typical stages (<180km)
      const wayMap = new Map<number, OsmWayElement>();
      const CONCURRENCY = 2;

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map((chunk) =>
            fetchOverpassWithFailover(buildChunkOverpassQuery(chunk, bufferMeters), 9500)
          )
        );
        for (const json of batchResults) {
          const elements = Array.isArray(json?.elements) ? json.elements : [];
          for (const rawEl of elements) {
            const way = normalizeOsmElement(rawEl);
            if (way) {
              wayMap.set(way.id, way);
            }
          }
        }
      }

      const ways = Array.from(wayMap.values());
      const result: OsmSurfaceRouteData = {
        routeKey,
        ways,
        chunkCount: chunks.length,
        wayCount: ways.length,
        fetchedAt: new Date().toISOString(),
      };

      osmSurfaceStore.set(routeKey, { status: 'ready', data: result });
      notifyOsmListeners(routeKey);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'OpenStreetMap surface query failed.';
      osmSurfaceStore.set(routeKey, {
        status: existing?.data ? 'ready' : 'error',
        data: existing?.data,
        error: message,
      });
      notifyOsmListeners(routeKey);
      throw err;
    } finally {
      osmInFlight.delete(routeKey);
    }
  })();

  osmInFlight.set(routeKey, runPromise);
  return runPromise;
}

/**
 * React hook sharing real OpenStreetMap surface data across Hero Card, Map Views,
 * Elevation Strip, Configurator, and Physics Engine with zero duplicate Overpass queries.
 */
export function useOsmSurface(
  coordinates?: [number, number][],
  distanceKm?: number,
  enabled = true
): {
  osmData: OsmSurfaceRouteData | null;
  status: OsmFetchStatus;
  error?: string;
  refresh: () => void;
} {
  const routeKey = useMemo(
    () => (enabled ? getOsmSurfaceRouteKey(coordinates, distanceKm) : 'disabled'),
    [coordinates, distanceKm, enabled]
  );

  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeOsmSurface((changedKey) => {
      if (changedKey === routeKey || changedKey === '*') {
        setVersion((v) => v + 1);
      }
    });
    return unsubscribe;
  }, [routeKey]);

  useEffect(() => {
    if (!enabled || !coordinates || coordinates.length < 2) return;
    const entry = osmSurfaceStore.get(routeKey);
    if (!entry || (entry.status === 'idle' && !entry.data)) {
      fetchOsmSurfaceForRoute({ coordinates, distanceKm }).catch(() => {
        // Error state recorded in osmSurfaceStore and handled gracefully via fallback
      });
    }
  }, [enabled, routeKey, coordinates, distanceKm]);

  const refresh = useCallback(() => {
    if (!enabled || !coordinates || coordinates.length < 2) return;
    fetchOsmSurfaceForRoute({ coordinates, distanceKm, forceFresh: true }).catch(() => {
      // Error recorded in store
    });
  }, [enabled, coordinates, distanceKm]);

  if (!enabled || routeKey === 'disabled' || routeKey === 'empty') {
    return { osmData: null, status: 'idle', refresh };
  }

  const entry = osmSurfaceStore.get(routeKey);
  return {
    osmData: entry?.data || null,
    status: entry?.status || 'loading',
    error: entry?.error,
    refresh,
  };
}

// ============================================================================
// OSM Tag Surface Classification & Spatial Matching Engine
// ============================================================================

const PAVED_SURFACES = new Set([
  'asphalt',
  'paved',
  'concrete',
  'concrete:lanes',
  'concrete:plates',
  'paving_stones',
  'chipseal',
  'tarmac',
  'metal',
  'brick',
  'bricks',
]);

const GRAVEL_SURFACES = new Set([
  'compacted',
  'fine_gravel',
  'gravel',
  'pebblestone',
  'unpaved',
  'crushed_limestone',
  'shells',
  'slag',
  'laterite',
]);

const SINGLETRACK_SURFACES = new Set([
  'dirt',
  'earth',
  'ground',
  'mud',
  'sand',
  'grass',
  'rock',
  'stone',
  'roots',
  'woodchips',
  'clay',
]);

function parseMtbScaleNumeric(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}

const OSM_SURFACE_LABELS: Record<string, { en: string; fr: string }> = {
  asphalt: { en: 'Asphalt', fr: 'Bitume / Enrobé' },
  paved: { en: 'Paved Tarmac', fr: 'Chaussée revêtue' },
  concrete: { en: 'Concrete', fr: 'Béton' },
  'concrete:lanes': { en: 'Concrete Strips', fr: 'Bandes bétonnées' },
  'concrete:plates': { en: 'Concrete Slabs', fr: 'Dalles béton' },
  paving_stones: { en: 'Paving Stones', fr: 'Pavés joints serrés' },
  chipseal: { en: 'Chipseal Tarmac', fr: 'Gravillonné routier' },
  sett: { en: 'Stone Setts / Cobbles', fr: 'Pavés anciens' },
  cobblestone: { en: 'Cobblestones', fr: 'Pavés irréguliers' },
  unhewn_cobblestone: { en: 'Rough Cobbles', fr: 'Pavés disjoints' },
  wood: { en: 'Timber Boardwalk', fr: 'Caillebotis / Ponton bois' },
  metal: { en: 'Metal Bridge Deck', fr: 'Tablier métallique' },
  compacted: { en: 'Compacted Hardpack', fr: 'Stabilisé compacté' },
  fine_gravel: { en: 'Fine Rolled Gravel', fr: 'Gravillon fin roulant' },
  gravel: { en: 'Loose Gravel', fr: 'Gravier / Chemin empierré' },
  pebblestone: { en: 'Cobbled Shingle / Pebbles', fr: 'Galets / Cailloutis' },
  unpaved: { en: 'Unpaved Lane', fr: 'Voie non revêtue' },
  crushed_limestone: { en: 'Crushed Limestone', fr: 'Calcaire concassé' },
  shells: { en: 'Shells & Marl', fr: 'Coquillages compactés' },
  dirt: { en: 'Natural Dirt Trail', fr: 'Chemin de terre' },
  earth: { en: 'Earth Track', fr: 'Sentier en terre' },
  ground: { en: 'Unprepared Ground', fr: 'Sol naturel' },
  mud: { en: 'Muddy / Soft Soil', fr: 'Zone humide / Boue' },
  sand: { en: 'Sandy Track', fr: 'Sol sableux' },
  grass: { en: 'Grassy Field Track', fr: 'Piste enherbée' },
  rock: { en: 'Rocky Outcrop / Slate', fr: 'Dalles rocheuses' },
  woodchips: { en: 'Woodchip Forest Path', fr: 'Sentier copeaux forestiers' },
};

const HIGHWAY_FALLBACK_LABELS: Record<string, { en: string; fr: string }> = {
  cycleway: { en: 'Dedicated Cycleway', fr: 'Piste / Voie cyclable' },
  primary: { en: 'Primary Road', fr: 'Route principale' },
  secondary: { en: 'Secondary Road', fr: 'Route départementale' },
  tertiary: { en: 'Country Road', fr: 'Route communale / D-road' },
  unclassified: { en: 'Rural Minor Lane', fr: 'Petite route rurale' },
  residential: { en: 'Residential Street', fr: 'Rue résidentielle' },
  living_street: { en: 'Shared Low-Speed Street', fr: 'Zone de rencontre' },
  service: { en: 'Service / Canal Access', fr: 'Voie de service / Halage' },
  pedestrian: { en: 'Pedestrian Precinct', fr: 'Zone piétonne' },
  track: { en: 'Agricultural / Forest Track', fr: 'Chemin agricole / forestier' },
  path: { en: 'Narrow Path / Singletrack', fr: 'Sentier / Monotrace' },
  bridleway: { en: 'Bridleway / Bridle Path', fr: 'Chemin cavalier / rural' },
  footway: { en: 'Park / Embankment Path', fr: 'Allée / Promenade' },
};

/**
 * Classifies an OpenStreetMap way into Cadence's 3-category surface taxonomy,
 * physical rolling resistance, and 38c gravel suitability guidance.
 */
export function classifyOsmWay(tags: OsmWayTags): ClassifiedOsmWay {
  const rawSurface = (tags.surface || '').trim().toLowerCase();
  const highway = (tags.highway || 'unclassified').trim().toLowerCase();
  const tracktype = (tags.tracktype || '').trim().toLowerCase();
  const smoothness = (tags.smoothness || '').trim().toLowerCase();
  const mtbScale = parseMtbScaleNumeric(tags['mtb:scale']);
  const sacScale = (tags.sac_scale || '').trim().toLowerCase();

  const surfaceMeta = rawSurface ? OSM_SURFACE_LABELS[rawSurface] : undefined;
  const hwMeta = HIGHWAY_FALLBACK_LABELS[highway] || {
    en: `OSM ${highway}`,
    fr: `Voie OSM (${highway})`,
  };

  const isRoughSmoothness = /very_bad|horrible|very_horrible|impassable/.test(smoothness);
  const isBadSmoothness = /bad|intermediate/.test(smoothness) || isRoughSmoothness;

  // 1. Mountain-bike technical trail or Alpine hiking path override
  if (
    sacScale ||
    (mtbScale !== null && (mtbScale >= 1 || (!rawSurface && highway === 'path')))
  ) {
    const isTechnical = (mtbScale !== null && mtbScale >= 2) || !!sacScale || isRoughSmoothness;
    return {
      surfaceType: 'singletrack',
      technicality: isTechnical ? 'technical' : 'moderate',
      suitability38c: isTechnical ? 'caution' : 'capable',
      effectiveCrr: isTechnical ? 0.0155 : 0.0118,
      isInferredFromHighway: !rawSurface,
      detailEn: surfaceMeta ? surfaceMeta.en : `${hwMeta.en} (Technical)`,
      detailFr: surfaceMeta ? surfaceMeta.fr : `${hwMeta.fr} (Technique)`,
      riderNoteEn: isTechnical
        ? 'Technical narrow trail with roots or rocks — ride cautiously or walk steep steps.'
        : 'Natural narrow trail — keep a steady line and relaxed grip.',
      riderNoteFr: isTechnical
        ? 'Sentier technique avec racines ou cailloux — restez vigilant ou mettez pied à terre si besoin.'
        : 'Sentier naturel étroit — trajectoire propre et conduite souple.',
    };
  }

  // 2. Explicit OSM surface=* tag rules
  if (rawSurface) {
    // 2a. Cobbles & sett
    if (rawSurface === 'sett' || rawSurface === 'cobblestone' || rawSurface === 'unhewn_cobblestone') {
      const roughCobble = rawSurface === 'unhewn_cobblestone' || isBadSmoothness;
      return {
        surfaceType: rawSurface === 'unhewn_cobblestone' ? 'gravel' : 'paved',
        technicality: roughCobble ? 'moderate' : 'smooth',
        suitability38c: roughCobble ? 'capable' : 'ideal',
        effectiveCrr: roughCobble ? 0.0095 : 0.0068,
        isInferredFromHighway: false,
        detailEn: surfaceMeta?.en || rawSurface,
        detailFr: surfaceMeta?.fr || rawSurface,
        riderNoteEn:
          '38c tubeless setup absorbs cobblestone buzz smoothly without harsh pinch-flat risk.',
        riderNoteFr:
          'Les 38c absorbent très bien les vibrations des pavés sans fatigue excessive.',
      };
    }

    // 2b. Wood boardwalks / bridges
    if (rawSurface === 'wood') {
      return {
        surfaceType: highway === 'path' || highway === 'footway' ? 'gravel' : 'paved',
        technicality: 'smooth',
        suitability38c: 'capable',
        effectiveCrr: 0.0065,
        isInferredFromHighway: false,
        detailEn: surfaceMeta?.en || 'Timber Deck',
        detailFr: surfaceMeta?.fr || 'Platelage bois',
        riderNoteEn: 'Timber deck / boardwalk — watch grip carefully when damp or dewy.',
        riderNoteFr: 'Platelage bois — vigilance sur l’adhérence s’il est humide le matin.',
      };
    }

    // 2c. Paved surfaces
    if (PAVED_SURFACES.has(rawSurface)) {
      const cracked = isRoughSmoothness;
      return {
        surfaceType: 'paved',
        technicality: cracked ? 'moderate' : 'smooth',
        suitability38c: 'ideal',
        effectiveCrr: cracked ? 0.0056 : 0.0044,
        isInferredFromHighway: false,
        detailEn: surfaceMeta?.en || rawSurface,
        detailFr: surfaceMeta?.fr || rawSurface,
        riderNoteEn: cracked
          ? 'Paved road with weathered patches — wider tires smooth out the bumps.'
          : 'Smooth paved road — fast, predictable rolling.',
        riderNoteFr: cracked
          ? 'Enrobé dégradé — des pneus un peu larges gomment bien les irrégularités.'
          : 'Revêtement roulant — rendement fluide et régulier.',
      };
    }

    // 2d. Gravel / compacted / fine_gravel surfaces
    if (GRAVEL_SURFACES.has(rawSurface)) {
      const coarseGravel =
        rawSurface === 'pebblestone' ||
        rawSurface === 'gravel' ||
        rawSurface === 'unpaved' ||
        tracktype === 'grade3' ||
        tracktype === 'grade4' ||
        isRoughSmoothness;
      const veryRough = tracktype === 'grade4' || tracktype === 'grade5' || isRoughSmoothness;
      return {
        surfaceType: 'gravel',
        technicality: veryRough ? 'technical' : coarseGravel ? 'moderate' : 'smooth',
        suitability38c: veryRough ? 'caution' : coarseGravel ? 'capable' : 'ideal',
        effectiveCrr: veryRough ? 0.0112 : coarseGravel ? 0.0086 : 0.0068,
        isInferredFromHighway: false,
        detailEn: surfaceMeta?.en || rawSurface,
        detailFr: surfaceMeta?.fr || rawSurface,
        riderNoteEn: veryRough
          ? 'Coarse or rutted unpaved track — ease up slightly and pick your line.'
          : coarseGravel
            ? 'Unpaved gravel sector — well suited for a steady touring pace.'
            : 'Hardpacked fine gravel — fast, smooth gravel riding.',
        riderNoteFr: veryRough
          ? 'Chemin empierré irrégulier — ralentissez légèrement et anticipez les ornières.'
          : coarseGravel
            ? 'Secteur gravier — adapté pour rouler sereinement.'
            : 'Chemin stabilisé fin — idéal et roulant.',
      };
    }

    // 2e. Singletrack / dirt / earth / mud / sand / rock
    if (SINGLETRACK_SURFACES.has(rawSurface)) {
      const demanding =
        rawSurface === 'mud' ||
        rawSurface === 'sand' ||
        rawSurface === 'rock' ||
        rawSurface === 'roots' ||
        isRoughSmoothness;
      return {
        surfaceType: 'singletrack',
        technicality: demanding ? 'technical' : 'moderate',
        suitability38c: demanding ? 'caution' : 'capable',
        effectiveCrr: demanding ? 0.015 : 0.0115,
        isInferredFromHighway: false,
        detailEn: surfaceMeta?.en || rawSurface,
        detailFr: surfaceMeta?.fr || rawSurface,
        riderNoteEn: demanding
          ? 'Soft or rocky natural ground — watch grip closely after rain.'
          : 'Natural earth track — keep an easy pace and enjoy the quiet track.',
        riderNoteFr: demanding
          ? 'Sol naturel meuble ou pierreux — vigilance sur l’adhérence après la pluie.'
          : 'Chemin naturel — gardez une cadence souple et profitez du calme.',
      };
    }
  }

  // 3. No explicit surface tag -> infer from tracktype + highway tag
  if (highway === 'track') {
    if (tracktype === 'grade1') {
      return {
        surfaceType: 'paved',
        technicality: 'smooth',
        suitability38c: 'ideal',
        effectiveCrr: 0.0052,
        isInferredFromHighway: false,
        detailEn: 'Farm Track (Firm Surface)',
        detailFr: 'Chemin agricole stabilisé',
        riderNoteEn: 'Firm agricultural lane with reliable, hard surface.',
        riderNoteFr: 'Chemin agricole dur et bien roulant.',
      };
    }
    if (tracktype === 'grade4' || tracktype === 'grade5') {
      return {
        surfaceType: 'singletrack',
        technicality: tracktype === 'grade5' ? 'technical' : 'moderate',
        suitability38c: tracktype === 'grade5' ? 'caution' : 'capable',
        effectiveCrr: tracktype === 'grade5' ? 0.0148 : 0.0118,
        isInferredFromHighway: false,
        detailEn: 'Natural Unpaved Track',
        detailFr: 'Chemin naturel irrégulier',
        riderNoteEn: 'Soft soil or grassy ruts expected — take it steady.',
        riderNoteFr: 'Sol meuble ou herbeux — restez souple et attentif.',
      };
    }
    const isGrade2 = tracktype === 'grade2';
    return {
      surfaceType: 'gravel',
      technicality: isGrade2 ? 'smooth' : 'moderate',
      suitability38c: isGrade2 ? 'ideal' : 'capable',
      effectiveCrr: isGrade2 ? 0.0072 : 0.0092,
      isInferredFromHighway: !tracktype,
      detailEn: isGrade2 ? 'Firm Gravel Track' : hwMeta.en,
      detailFr: isGrade2 ? 'Piste gravel régulière' : hwMeta.fr,
      riderNoteEn: tracktype
        ? 'Dependable gravel track suitable for most bikes.'
        : 'Rural farm track — expect mixed earth and loose gravel.',
      riderNoteFr: tracktype
        ? 'Piste gravillonnée régulière et praticable.'
        : 'Chemin rural — attendez-vous à un sol mixte terre et gravier.',
    };
  }

  if (highway === 'path' || highway === 'bridleway') {
    return {
      surfaceType: 'singletrack',
      technicality: 'moderate',
      suitability38c: 'capable',
      effectiveCrr: 0.0116,
      isInferredFromHighway: true,
      detailEn: hwMeta.en,
      detailFr: hwMeta.fr,
      riderNoteEn: 'Narrow natural path — expect dirt or grass singletrack.',
      riderNoteFr: 'Sentier étroit — chemin naturel en terre ou en herbe probable.',
    };
  }

  if (highway === 'footway') {
    return {
      surfaceType: 'gravel',
      technicality: 'smooth',
      suitability38c: 'capable',
      effectiveCrr: 0.0074,
      isInferredFromHighway: true,
      detailEn: hwMeta.en,
      detailFr: hwMeta.fr,
      riderNoteEn: 'Shared embankment/park path in OSM — moderate pace around walkers.',
      riderNoteFr: 'Allée ou chemin partagé dans OSM — allure modérée près des piétons.',
    };
  }

  // Standard roads / cycleways without surface=* tag default to inferred paved tarmac
  return {
    surfaceType: 'paved',
    technicality: 'smooth',
    suitability38c: 'ideal',
    effectiveCrr: 0.0046,
    isInferredFromHighway: true,
    detailEn: `${hwMeta.en} (Inferred Paved)`,
    detailFr: `${hwMeta.fr} (Bitume présumé)`,
    riderNoteEn: `Standard OSM ${highway} road (no explicit surface tag) — reliably paved.`,
    riderNoteFr: `Voie OSM ${highway} (sans tag surface explicite) — bitume standard présumé.`,
  };
}

// ============================================================================
// Geometry Distance & Directional Bearing Alignment onto OSM Ways
// ============================================================================

function getHighwayMatchPenaltyMeters(tags: OsmWayTags): number {
  const hw = (tags.highway || '').toLowerCase();
  const bicycle = (tags.bicycle || '').toLowerCase();
  const hasExplicitSurface = !!(tags.surface || tags.tracktype);
  let penalty = hasExplicitSurface ? -3 : 0;

  if (hw === 'footway') {
    penalty += bicycle === 'yes' || bicycle === 'designated' || bicycle === 'permissive' ? 4 : 14;
  } else if (hw === 'service') {
    penalty += 7;
  } else if (hw === 'pedestrian') {
    penalty += 5;
  }

  if (tags.access === 'private') {
    penalty += 24;
  }
  return penalty;
}

/**
 * Computes minimum squared metric distance from point P to segment AB plus cosine bearing
 * so parallel route corridors strongly outscore cross streets at intersections.
 */
function scoreWayForEdge(
  midLat: number,
  midLon: number,
  cosLat: number,
  routeUx: number,
  routeUy: number,
  way: OsmWayElement
): number {
  const METERS_PER_DEG_LAT = 111320;
  const METERS_PER_DEG_LON = 111320 * cosLat;

  const px = midLon * METERS_PER_DEG_LON;
  const py = midLat * METERS_PER_DEG_LAT;

  let bestScore = Infinity;
  const geom = way.geometry;

  for (let i = 1; i < geom.length; i++) {
    const ax = geom[i - 1].lon * METERS_PER_DEG_LON;
    const ay = geom[i - 1].lat * METERS_PER_DEG_LAT;
    const bx = geom[i].lon * METERS_PER_DEG_LON;
    const by = geom[i].lat * METERS_PER_DEG_LON;

    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq < 1e-6) continue;

    let t = ((px - ax) * abx + (py - ay) * aby) / abLenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    const closestX = ax + t * abx;
    const closestY = ay + t * aby;
    const dx = px - closestX;
    const dy = py - closestY;
    const distM = Math.sqrt(dx * dx + dy * dy);

    const abLen = Math.sqrt(abLenSq);
    const cosTheta = Math.abs((routeUx * abx + routeUy * aby) / abLen);
    // Crossing streets at 90deg receive a +24m directional penalty
    const anglePenaltyM = (1 - cosTheta) * 24;
    const score = distM + anglePenaltyM;

    if (score < bestScore) {
      bestScore = score;
    }
  }

  return bestScore + getHighwayMatchPenaltyMeters(way.tags);
}

export interface EdgeOsmMatch {
  way: OsmWayElement;
  classified: ClassifiedOsmWay;
  distScoreM: number;
}

/**
 * Matches every edge `i -> i+1` of a polyline against cached OpenStreetMap ways
 * using bounding-box culling + distance/bearing scoring.
 */
export function matchPolylineEdgesToOsmWays(
  coordinates: [number, number][],
  ways: OsmWayElement[]
): (EdgeOsmMatch | null)[] {
  const edgeCount = Math.max(0, coordinates.length - 1);
  if (edgeCount === 0 || ways.length === 0) {
    return new Array(edgeCount).fill(null);
  }

  // Allow slightly wider snap tolerance so curved simplified preset chords still lock cleanly onto parallel ways
  const cumMeters = computeCumulativeDistances(coordinates);
  const avgStepM = (cumMeters[cumMeters.length - 1] || 0) / Math.max(1, edgeCount);
  const maxSnapScoreM = avgStepM > 350 ? 105 : 85;
  const bboxPadDeg = avgStepM > 350 ? 0.0016 : 0.0014;

  // Cache classification per way ID
  const classCache = new Map<number, ClassifiedOsmWay>();
  const getClass = (w: OsmWayElement) => {
    let c = classCache.get(w.id);
    if (!c) {
      c = classifyOsmWay(w.tags);
      classCache.set(w.id, c);
    }
    return c;
  };

  const results: (EdgeOsmMatch | null)[] = new Array(edgeCount).fill(null);

  for (let i = 0; i < edgeCount; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const midLat = (a[0] + b[0]) * 0.5;
    const midLon = (a[1] + b[1]) * 0.5;
    const cosLat = Math.max(0.15, Math.cos((midLat * Math.PI) / 180));

    const rx = (b[1] - a[1]) * cosLat;
    const ry = b[0] - a[0];
    const rLen = Math.sqrt(rx * rx + ry * ry) || 1;
    const routeUx = rx / rLen;
    const routeUy = ry / rLen;

    let bestWay: OsmWayElement | null = null;
    let bestScore = Infinity;

    for (let wIdx = 0; wIdx < ways.length; wIdx++) {
      const way = ways[wIdx];
      const bnd = way.bounds;
      if (
        bnd &&
        (midLat < bnd.minlat - bboxPadDeg ||
          midLat > bnd.maxlat + bboxPadDeg ||
          midLon < bnd.minlon - bboxPadDeg ||
          midLon > bnd.maxlon + bboxPadDeg)
      ) {
        continue;
      }

      const score = scoreWayForEdge(midLat, midLon, cosLat, routeUx, routeUy, way);
      if (score < bestScore) {
        bestScore = score;
        bestWay = way;
      }
    }

    if (bestWay && bestScore <= maxSnapScoreM) {
      results[i] = {
        way: bestWay,
        classified: getClass(bestWay),
        distScoreM: bestScore,
      };
    }
  }

  return results;
}

/**
 * Formats concise readable OSM tag string for sector tooltips / UI chips.
 */
export function formatOsmSectorTagsSummary(
  tags: Pick<
    OsmWayTags,
    'highway' | 'surface' | 'tracktype' | 'smoothness' | 'mtb:scale'
  >
): string {
  const parts: string[] = [];
  if (tags.surface) parts.push(`surface=${tags.surface}`);
  else if (tags.highway) parts.push(`highway=${tags.highway}`);
  if (tags.tracktype) parts.push(`tracktype=${tags.tracktype}`);
  if (tags.smoothness) parts.push(`smoothness=${tags.smoothness}`);
  if (tags['mtb:scale']) parts.push(`mtb:scale=${tags['mtb:scale']}`);
  return parts.join(' · ');
}

/**
 * Helper to measure route spacing safely without re-exposing haversine internals.
 */
export function estimateSegmentDistanceKm(a: [number, number], b: [number, number]): number {
  return haversineDistanceMeters(a[0], a[1], b[0], b[1]) / 1000;
}
