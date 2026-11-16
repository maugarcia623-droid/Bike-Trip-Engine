/**
 * Free Bicycle Routing Engine via Komoot Photon / Nominatim + OSRM Public Bike Routing
 * Supports flexible multi-stop waypoints, intermediate via-points, and Resupply Radar POI rerouting.
 */
import { getCurrentLanguage } from '../context/LanguageContext';
import { geocodeLocation } from '../services/locationService';
import { ElevationProfilePoint, RouteCueStep, RouteParams, RouteWaypoint, TripProfile } from '../types/trip';
import { StageAmenity } from '../types/amenities';
import { fetchDemElevationProfile } from '../services/elevationService';
import {
  computeCumulativeDistances,
  getRouteHashKey,
  haversineDistanceMeters,
  resnapAmenitiesToRoute,
  setCachedScan,
  snapToPolyline,
} from '../services/overpassCorridor';
import { estimateAmenityDetourKm, parseOsrmRouteSteps } from './cueSheet';
import { downsampleCoordinates } from './stageManager';

export interface RouteWaypointParam {
  id?: string;
  name: string;
  coordinates?: [number, number] | null;
  distanceFromStartKm?: number;
  sourceAmenityId?: string;
}

export interface CalculatedBikeRouteLeg {
  distanceKm: number;
  estimatedMinutes: number;
}

export interface ResolvedWaypoint {
  id: string;
  name: string;
  coordinates: [number, number];
  distanceFromStartKm?: number;
  sourceAmenityId?: string;
}

export interface CalculatedBikeRoute {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  estimatedMinutes: number;
  elevationGainM?: number;
  elevationLossM?: number;
  elevationProfile?: ElevationProfilePoint[];
  legs?: CalculatedBikeRouteLeg[];
  resolvedWaypoints?: ResolvedWaypoint[];
  cueSheet?: RouteCueStep[];
}

export interface RerouteAmenityResult {
  updatedTrip: TripProfile;
  updatedAmenities: StageAmenity[];
  actualDetourKm: number;
  usedOfflineFallback: boolean;
}

const OSRM_BIKE_ENDPOINTS = [
  'https://routing.openstreetmap.de/routed-bike/route/v1/cycling',
  'https://router.project-osrm.org/route/v1/cycling',
];
const OSRM_ROUTE_TIMEOUT_MS = 8000;

async function fetchOsrmRouteWithFailover(
  coordsParam: string,
  lang: 'en' | 'fr'
): Promise<any> {
  let lastStatus: number | null = null;
  let lastError: unknown = null;
  let hadEmptyRoutesResponse = false;

  for (const endpoint of OSRM_BIKE_ENDPOINTS) {
    const osrmUrl = `${endpoint}/${coordsParam}?overview=full&geometries=geojson&steps=true`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_ROUTE_TIMEOUT_MS);

    try {
      const response = await fetch(osrmUrl, { signal: controller.signal });
      if (!response.ok) {
        lastStatus = response.status;
        continue;
      }

      const json = await response.json();
      if (json?.routes && json.routes.length > 0) {
        return json;
      }
      hadEmptyRoutesResponse = true;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (hadEmptyRoutesResponse) {
    throw new Error(
      lang === 'fr'
        ? 'Aucun itinéraire cyclable trouvé entre ces lieux et points de passage.'
        : 'No cycling path found between those locations and via-points.'
    );
  }

  if (lastStatus !== null) {
    throw new Error(
      lang === 'fr'
        ? `Impossible de calculer l’itinéraire vélo pour le moment (code ${lastStatus}).`
        : `Could not calculate cycling directions right now (status ${lastStatus}).`
    );
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          lang === 'fr'
            ? 'Impossible de calculer l’itinéraire vélo pour le moment (délai dépassé).'
            : 'Could not calculate cycling directions right now (request timed out).'
        )
  );
}

// Fetch OSRM Bicycle Path with multi-stop waypoints
export async function calculateAutoBikeRoute(
  originText: string,
  destText: string,
  originCoordsOverride?: [number, number] | null,
  destCoordsOverride?: [number, number] | null,
  waypoints?: RouteWaypointParam[]
): Promise<CalculatedBikeRoute | null> {
  const lang = getCurrentLanguage();
  const originCoord = originCoordsOverride || (await geocodeLocation(originText, lang));

  if (!originCoord) {
    throw new Error(
      lang === 'fr'
        ? `Impossible de trouver les coordonnées du départ ("${originText}"). Choisissez une suggestion dans la liste.`
        : `Could not find coordinates for origin ("${originText}"). Please choose a suggestion from the dropdown.`
    );
  }

  // Filter and resolve intermediate waypoints
  const resolvedWaypoints: ResolvedWaypoint[] = [];
  let prevCoord = originCoord;

  if (waypoints && waypoints.length > 0) {
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const trimmedName = (wp.name || '').trim();
      if (!trimmedName && !wp.coordinates) continue;

      let coord = wp.coordinates;
      if (!coord && trimmedName) {
        coord = await geocodeLocation(trimmedName, lang, prevCoord);
      }

      if (!coord) {
        throw new Error(
          lang === 'fr'
            ? `Impossible de localiser l’arrêt intermédiaire "${trimmedName || `Étape ${i + 1}`}". Choisissez une suggestion dans la liste.`
            : `Could not locate intermediate stop "${trimmedName || `Stop ${i + 1}`}". Please pick a suggestion from the dropdown.`
        );
      }

      resolvedWaypoints.push({
        id: wp.id || `wp-${Date.now()}-${i}`,
        name: trimmedName || `${coord[0].toFixed(3)}°N, ${coord[1].toFixed(3)}°E`,
        coordinates: coord,
        ...(wp.sourceAmenityId ? { sourceAmenityId: wp.sourceAmenityId } : {}),
      });
      prevCoord = coord;
    }
  }

  const destCoord = destCoordsOverride || (await geocodeLocation(destText, lang, prevCoord));
  if (!destCoord) {
    throw new Error(
      lang === 'fr'
        ? `Impossible de trouver les coordonnées de la destination ("${destText}"). Choisissez une suggestion dans la liste.`
        : `Could not find coordinates for destination ("${destText}"). Please choose a suggestion from the dropdown.`
    );
  }

  // Combine all coordinates: origin -> waypoints -> destination
  const allCoords: [number, number][] = [
    originCoord,
    ...resolvedWaypoints.map((w) => w.coordinates),
    destCoord,
  ];

  // OSRM expects coordinates in lng,lat format separated by semicolons
  const coordsParam = allCoords.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const json = await fetchOsrmRouteWithFailover(coordsParam, lang);

  const route = json.routes[0];
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const estimatedMinutes = Math.round(route.duration / 60);

  // GeoJSON coordinates come as [lng, lat], Leaflet wants [lat, lng]
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  // Parse legs & compute cumulative distance for each waypoint
  const legs: CalculatedBikeRouteLeg[] = [];
  if (Array.isArray(route.legs)) {
    let runningDistKm = 0;
    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const legDist = Math.round(((leg.distance || 0) / 1000) * 10) / 10;
      const legMin = Math.round((leg.duration || 0) / 60);
      legs.push({ distanceKm: legDist, estimatedMinutes: legMin });

      runningDistKm += legDist;
      if (i < resolvedWaypoints.length) {
        resolvedWaypoints[i].distanceFromStartKm = Math.round(runningDistKm * 10) / 10;
      }
    }
  }

  const cueSheet = parseOsrmRouteSteps(route.legs);
  const dem = await fetchDemElevationProfile(coordinates, distanceKm);

  return {
    coordinates,
    distanceKm,
    estimatedMinutes,
    elevationGainM: dem?.elevationGainM,
    elevationLossM: dem?.elevationLossM,
    elevationProfile: dem?.elevationProfile,
    legs,
    resolvedWaypoints,
    cueSheet,
  };
}

/**
 * Toggles a StageAmenity's pinned status on top-level trip and active stage snapshot.
 */
export function togglePinnedAmenityOnTrip(
  trip: TripProfile,
  amenity: StageAmenity
): { updatedTrip: TripProfile; isNowPinned: boolean } {
  const existingPinned = trip.pinnedAmenities || [];
  const isCurrentlyPinned = existingPinned.some((p) => p.id === amenity.id);

  const updatedPinned: StageAmenity[] = isCurrentlyPinned
    ? existingPinned.filter((p) => p.id !== amenity.id)
    : [...existingPinned, { ...amenity, isPinned: true }].sort(
        (a, b) => a.routeKm - b.routeKm
      );

  let updatedStages = trip.stages;
  if (trip.stages && trip.stages.length > 0) {
    const activeIdx = Math.max(
      0,
      Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
    );
    updatedStages = trip.stages.map((st, idx) =>
      idx === activeIdx ? { ...st, pinnedAmenities: updatedPinned } : st
    );
  }

  return {
    isNowPinned: !isCurrentlyPinned,
    updatedTrip: {
      ...trip,
      pinnedAmenities: updatedPinned,
      stages: updatedStages,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Matches a RouteWaypoint against a Resupply Radar StageAmenity by linkage ID or < 40 m proximity.
 */
export function doesWaypointMatchAmenity(wp: RouteWaypoint, amenity: StageAmenity): boolean {
  if (wp.sourceAmenityId === amenity.id || wp.id === `wp-poi-${amenity.id}`) return true;
  if (wp.coordinates) {
    return haversineDistanceMeters(wp.coordinates[0], wp.coordinates[1], amenity.lat, amenity.lon) < 40;
  }
  return false;
}

/**
 * Checks whether a scanned/pinned StageAmenity has already been added as an intermediate route waypoint.
 */
export function isAmenityInRoute(route: RouteParams | undefined, amenity: StageAmenity): boolean {
  const waypoints = route?.waypoints;
  if (!waypoints || waypoints.length === 0) return false;
  return waypoints.some((wp) => doesWaypointMatchAmenity(wp, amenity));
}

async function fetchOsrmSegment(
  points: [number, number][]
): Promise<{ coordinates: [number, number][]; distanceMeters: number; cueSheet: RouteCueStep[] } | null> {
  const coordsParam = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  try {
    const json = await fetchOsrmRouteWithFailover(coordsParam, getCurrentLanguage());
    const route = json?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return {
      coordinates,
      distanceMeters: route.distance || 0,
      cueSheet: parseOsrmRouteSteps(route.legs),
    };
  } catch {
    return null;
  }
}

function buildSortedWaypointsWithAmenity(
  existingWaypoints: RouteWaypoint[] | undefined,
  amenity: StageAmenity,
  coords: [number, number][]
): RouteWaypoint[] {
  const cumDistances = coords.length >= 2 ? computeCumulativeDistances(coords) : [];
  const normalized: RouteWaypoint[] = (existingWaypoints || []).map((wp) => {
    if (wp.distanceFromStartKm !== undefined) return { ...wp };
    if (wp.coordinates && coords.length >= 2) {
      const snapped = snapToPolyline(wp.coordinates[0], wp.coordinates[1], coords, cumDistances);
      return { ...wp, distanceFromStartKm: snapped.routeKm };
    }
    return { ...wp, distanceFromStartKm: 0 };
  });

  const newWp: RouteWaypoint = {
    id: `wp-poi-${amenity.id}`,
    name: amenity.name,
    coordinates: [amenity.lat, amenity.lon],
    distanceFromStartKm: amenity.routeKm,
    sourceAmenityId: amenity.id,
  };

  return [...normalized, newWp].sort(
    (a, b) => (a.distanceFromStartKm ?? 0) - (b.distanceFromStartKm ?? 0)
  );
}

function spliceCoordinateFallback(
  currentCoords: [number, number][],
  amenity: StageAmenity,
  oldDistanceKm: number
): { coordinates: [number, number][]; distanceKm: number } {
  const cumDistances = computeCumulativeDistances(currentCoords);
  const snapped = snapToPolyline(amenity.lat, amenity.lon, currentCoords, cumDistances);
  const insertAt = Math.min(currentCoords.length - 1, Math.max(1, snapped.nearestIdx));
  const pBefore = currentCoords[insertAt - 1];
  const pAfter = currentCoords[insertAt];
  const prevSeg = haversineDistanceMeters(pBefore[0], pBefore[1], pAfter[0], pAfter[1]);
  const newSeg =
    haversineDistanceMeters(pBefore[0], pBefore[1], amenity.lat, amenity.lon) +
    haversineDistanceMeters(amenity.lat, amenity.lon, pAfter[0], pAfter[1]);
  const deltaKm = (newSeg - prevSeg) / 1000;
  return {
    coordinates: [
      ...currentCoords.slice(0, insertAt),
      [amenity.lat, amenity.lon],
      ...currentCoords.slice(insertAt),
    ],
    distanceKm: Math.max(1, Math.round((oldDistanceKm + deltaKm) * 10) / 10),
  };
}

function removeAmenityCoordinateFallback(
  currentCoords: [number, number][],
  amenity: StageAmenity,
  oldDistanceKm: number
): { coordinates: [number, number][]; distanceKm: number } {
  if (currentCoords.length <= 2) {
    const estDetourKm = estimateAmenityDetourKm(amenity.detourMeters);
    return {
      coordinates: currentCoords,
      distanceKm: Math.max(1, Math.round((oldDistanceKm - estDetourKm) * 10) / 10),
    };
  }

  // Strip interior vertices snapped close to the removed POI while preserving origin/destination
  const filteredCoords = currentCoords.filter((pt, idx) => {
    if (idx === 0 || idx === currentCoords.length - 1) return true;
    return haversineDistanceMeters(pt[0], pt[1], amenity.lat, amenity.lon) > 120;
  });

  if (filteredCoords.length < currentCoords.length && filteredCoords.length >= 2) {
    const prevTotalMeters =
      computeCumulativeDistances(currentCoords).slice(-1)[0] || oldDistanceKm * 1000;
    const nextTotalMeters =
      computeCumulativeDistances(filteredCoords).slice(-1)[0] || oldDistanceKm * 1000;
    const deltaKm = Math.max(0, (prevTotalMeters - nextTotalMeters) / 1000);
    return {
      coordinates: filteredCoords,
      distanceKm: Math.max(1, Math.round((oldDistanceKm - deltaKm) * 10) / 10),
    };
  }

  const estDetourKm = estimateAmenityDetourKm(amenity.detourMeters);
  return {
    coordinates: currentCoords,
    distanceKm: Math.max(1, Math.round((oldDistanceKm - estDetourKm) * 10) / 10),
  };
}

function resolveGpxSpliceBounds(
  currentCoords: [number, number][],
  amenity: StageAmenity
): { cumDistances: number[]; entryIdx: number; exitIdx: number } {
  const cumDistances = computeCumulativeDistances(currentCoords);
  const snapped = snapToPolyline(amenity.lat, amenity.lon, currentCoords, cumDistances);
  const snapMeters = cumDistances[snapped.nearestIdx] || 0;

  let entryIdx = snapped.nearestIdx;
  while (entryIdx > 0 && snapMeters - cumDistances[entryIdx] < 1400) {
    entryIdx--;
  }
  let exitIdx = snapped.nearestIdx;
  while (exitIdx < currentCoords.length - 1 && cumDistances[exitIdx] - snapMeters < 1400) {
    exitIdx++;
  }
  return { cumDistances, entryIdx, exitIdx };
}

function finalizeAmenityRouteUpdate(params: {
  trip: TripProfile;
  currentAmenities: StageAmenity[];
  updatedPinnedInput: StageAmenity[];
  nextCoords: [number, number][];
  nextDistanceKm: number;
  nextElevationGainM?: number;
  nextElevationLossM?: number;
  nextElevationProfile?: ElevationProfilePoint[];
  nextWaypoints: RouteWaypoint[];
  nextCueSheet: RouteCueStep[] | undefined;
  nextRouteMode: RouteParams['routeMode'];
  nextRadiusMeters: number | undefined;
  actualDetourKm: number;
  usedOfflineFallback: boolean;
}): RerouteAmenityResult {
  const {
    trip,
    currentAmenities,
    updatedPinnedInput,
    nextCoords,
    nextDistanceKm,
    nextElevationGainM,
    nextElevationLossM,
    nextElevationProfile,
    nextWaypoints,
    nextCueSheet,
    nextRouteMode,
    nextRadiusMeters,
    actualDetourKm,
    usedOfflineFallback,
  } = params;

  const oldDistanceKm = trip.route.distanceKm || 0;
  const oldElev = trip.route.elevationGainM ?? Math.round(oldDistanceKm * 6.5);
  const nextElevGain =
    typeof nextElevationGainM === 'number'
      ? nextElevationGainM
      : oldDistanceKm > 0
      ? Math.max(0, Math.round(oldElev * (nextDistanceKm / oldDistanceKm)))
      : oldElev;

  const resolvedElevationProfile = nextElevationProfile;

  const updatedPinned = resnapAmenitiesToRoute(
    updatedPinnedInput.map((p) => ({ ...p, isPinned: true })),
    nextCoords,
    resolvedElevationProfile ?? trip.route.elevationProfile
  );

  // Re-snap waypoint distanceFromStartKm against final coordinates
  const finalCumDistances =
    nextCoords.length >= 2 ? computeCumulativeDistances(nextCoords) : [];
  const finalWaypoints = nextWaypoints.map((wp) => {
    if (!wp.coordinates || nextCoords.length < 2) return wp;
    const snapped = snapToPolyline(wp.coordinates[0], wp.coordinates[1], nextCoords, finalCumDistances);
    return {
      ...wp,
      distanceFromStartKm: snapped.routeKm,
    };
  });

  const nextRoute: RouteParams = {
    ...trip.route,
    routeMode: nextRouteMode,
    radiusMeters: nextRadiusMeters,
    distanceKm: nextDistanceKm,
    elevationGainM: nextElevGain,
    elevationLossM:
      typeof nextElevationLossM === 'number' ? nextElevationLossM : trip.route.elevationLossM,
    coordinates: nextCoords,
    waypoints: finalWaypoints,
    cueSheet: nextCueSheet,
    elevationProfile: resolvedElevationProfile,
    terrainSummary: resolvedElevationProfile ? undefined : trip.route.terrainSummary,
  };

  let updatedStages = trip.stages;
  let activeStageId = trip.id;
  if (trip.stages && trip.stages.length > 0) {
    const activeIdx = Math.max(
      0,
      Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
    );
    activeStageId = trip.stages[activeIdx]?.id || trip.id;
    updatedStages = trip.stages.map((st, idx) =>
      idx === activeIdx
        ? {
            ...st,
            route: {
              ...nextRoute,
              coordinates: downsampleCoordinates(nextCoords),
              waypoints: finalWaypoints.map((w) => ({ ...w })),
            },
            pinnedAmenities: updatedPinned.map((a) => ({ ...a })),
          }
        : st
    );
  }

  // Re-snap scanned amenities and persist under the new route hash so Radar stays populated
  const mergedAmenities = [...currentAmenities];
  for (const pinned of updatedPinned) {
    if (!mergedAmenities.some((a) => a.id === pinned.id)) {
      mergedAmenities.push(pinned);
    }
  }
  const resnappedAmenities = resnapAmenitiesToRoute(
    mergedAmenities,
    nextCoords,
    trip.route.elevationProfile
  );
  const newCacheKey = getRouteHashKey(nextCoords, activeStageId, nextDistanceKm);
  setCachedScan(newCacheKey, resnappedAmenities);

  const updatedTrip: TripProfile = {
    ...trip,
    route: nextRoute,
    pinnedAmenities: updatedPinned,
    stages: updatedStages,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedTrip,
    updatedAmenities: resnappedAmenities,
    actualDetourKm,
    usedOfflineFallback,
  };
}

/**
 * Inserts a pinned Resupply Radar POI into the active stage as an ordered intermediate waypoint
 * and recalculates the cycling polyline, distance, elevation estimate, and turn-by-turn cue sheet.
 */
export async function rerouteTripThroughAmenity(
  trip: TripProfile,
  amenity: StageAmenity,
  currentAmenities: StageAmenity[] = []
): Promise<RerouteAmenityResult> {
  const oldDistanceKm = trip.route.distanceKm || 0;
  const currentCoords: [number, number][] =
    trip.route.coordinates && trip.route.coordinates.length >= 2
      ? trip.route.coordinates
      : trip.route.originCoords
      ? [trip.route.originCoords, trip.route.originCoords]
      : [
          [amenity.lat, amenity.lon],
          [amenity.lat, amenity.lon],
        ];

  const sortedWaypoints = buildSortedWaypointsWithAmenity(
    trip.route.waypoints,
    amenity,
    currentCoords
  );

  let nextCoords: [number, number][] = currentCoords;
  let nextDistanceKm = oldDistanceKm;
  let nextWaypoints: RouteWaypoint[] = sortedWaypoints;
  let nextCueSheet: RouteCueStep[] | undefined = trip.route.cueSheet;
  let nextRouteMode = trip.route.routeMode;
  let nextRadiusMeters = trip.route.radiusMeters;
  let usedOfflineFallback = false;
  let nextElevationGainM: number | undefined;
  let nextElevationLossM: number | undefined;
  let nextElevationProfile: ElevationProfilePoint[] | undefined;

  const isCustomGpx = trip.route.routeMode === 'gpx' && currentCoords.length >= 10;

  if (isCustomGpx) {
    const { cumDistances, entryIdx, exitIdx } = resolveGpxSpliceBounds(currentCoords, amenity);
    const segmentRes = await fetchOsrmSegment([
      currentCoords[entryIdx],
      [amenity.lat, amenity.lon],
      currentCoords[exitIdx],
    ]);

    if (segmentRes && segmentRes.coordinates.length >= 2) {
      const oldSubMeters = Math.max(0, cumDistances[exitIdx] - cumDistances[entryIdx]);
      const deltaKm = (segmentRes.distanceMeters - oldSubMeters) / 1000;
      nextCoords = [
        ...currentCoords.slice(0, entryIdx),
        ...segmentRes.coordinates,
        ...currentCoords.slice(exitIdx + 1),
      ];
      nextDistanceKm = Math.max(
        1,
        Math.round((oldDistanceKm + deltaKm) * 10) / 10
      );
      nextCueSheet = undefined;
    } else {
      usedOfflineFallback = true;
      const spliced = spliceCoordinateFallback(currentCoords, amenity, oldDistanceKm);
      nextCoords = spliced.coordinates;
      nextDistanceKm = spliced.distanceKm;
      nextCueSheet = undefined;
    }
  } else {
    const originCoord = trip.route.originCoords || currentCoords[0];
    const destCoord =
      trip.route.destCoords ||
      (currentCoords.length >= 2 ? currentCoords[currentCoords.length - 1] : originCoord);

    try {
      const routed = await calculateAutoBikeRoute(
        trip.route.origin || 'Start',
        trip.route.destination || 'Finish',
        originCoord,
        destCoord,
        sortedWaypoints
      );
      if (routed && routed.coordinates.length >= 2) {
        nextCoords = routed.coordinates;
        nextDistanceKm = routed.distanceKm;
        nextElevationGainM = routed.elevationGainM;
        nextElevationLossM = routed.elevationLossM;
        nextElevationProfile = routed.elevationProfile;
        nextWaypoints = routed.resolvedWaypoints || sortedWaypoints;
        nextCueSheet = routed.cueSheet;
        if (nextRouteMode === 'manual-radius') {
          nextRouteMode = 'corridor';
          nextRadiusMeters = undefined;
        }
      } else {
        throw new Error('Empty OSRM route');
      }
    } catch {
      usedOfflineFallback = true;
      const spliced = spliceCoordinateFallback(currentCoords, amenity, oldDistanceKm);
      nextCoords = spliced.coordinates;
      nextDistanceKm = spliced.distanceKm;
      nextCueSheet = undefined;
    }
  }

  const basePinned = trip.pinnedAmenities ? [...trip.pinnedAmenities] : [];
  if (!basePinned.some((p) => p.id === amenity.id)) {
    basePinned.push({ ...amenity, isPinned: true });
  }

  return finalizeAmenityRouteUpdate({
    trip,
    currentAmenities,
    updatedPinnedInput: basePinned,
    nextCoords,
    nextDistanceKm,
    nextElevationGainM,
    nextElevationLossM,
    nextElevationProfile,
    nextWaypoints,
    nextCueSheet,
    nextRouteMode,
    nextRadiusMeters,
    actualDetourKm: Math.max(0, Math.round((nextDistanceKm - oldDistanceKm) * 10) / 10),
    usedOfflineFallback,
  });
}

/**
 * Removes a Resupply Radar POI waypoint from the active stage route and recalculates
 * the cycling polyline, distance, elevation estimate, cue sheet, and optionally unpins it.
 */
export async function removeAmenityFromRoute(
  trip: TripProfile,
  amenity: StageAmenity,
  currentAmenities: StageAmenity[] = [],
  options?: { unpin?: boolean }
): Promise<RerouteAmenityResult> {
  const oldDistanceKm = trip.route.distanceKm || 0;
  const remainingWaypoints: RouteWaypoint[] = (trip.route.waypoints || []).filter(
    (wp) => !doesWaypointMatchAmenity(wp, amenity)
  );

  const currentCoords: [number, number][] =
    trip.route.coordinates && trip.route.coordinates.length >= 2
      ? trip.route.coordinates
      : trip.route.originCoords
      ? [trip.route.originCoords, trip.route.originCoords]
      : [
          [amenity.lat, amenity.lon],
          [amenity.lat, amenity.lon],
        ];

  let nextCoords: [number, number][] = currentCoords;
  let nextDistanceKm = oldDistanceKm;
  let nextWaypoints: RouteWaypoint[] = remainingWaypoints;
  let nextCueSheet: RouteCueStep[] | undefined = trip.route.cueSheet;
  let nextRouteMode = trip.route.routeMode;
  let nextRadiusMeters = trip.route.radiusMeters;
  let usedOfflineFallback = false;
  let nextElevationGainM: number | undefined;
  let nextElevationLossM: number | undefined;
  let nextElevationProfile: ElevationProfilePoint[] | undefined;

  const isCustomGpx = trip.route.routeMode === 'gpx' && currentCoords.length >= 10;

  if (isCustomGpx) {
    const { cumDistances, entryIdx, exitIdx } = resolveGpxSpliceBounds(currentCoords, amenity);
    const segmentRes = await fetchOsrmSegment([
      currentCoords[entryIdx],
      currentCoords[exitIdx],
    ]);

    if (segmentRes && segmentRes.coordinates.length >= 2) {
      const oldSubMeters = Math.max(0, cumDistances[exitIdx] - cumDistances[entryIdx]);
      const deltaKm = (oldSubMeters - segmentRes.distanceMeters) / 1000;
      nextCoords = [
        ...currentCoords.slice(0, entryIdx),
        ...segmentRes.coordinates,
        ...currentCoords.slice(exitIdx + 1),
      ];
      nextDistanceKm = Math.max(1, Math.round((oldDistanceKm - deltaKm) * 10) / 10);
      nextCueSheet = undefined;
    } else {
      usedOfflineFallback = true;
      const stripped = removeAmenityCoordinateFallback(currentCoords, amenity, oldDistanceKm);
      nextCoords = stripped.coordinates;
      nextDistanceKm = stripped.distanceKm;
      nextCueSheet = undefined;
    }
  } else {
    const originCoord = trip.route.originCoords || currentCoords[0];
    const destCoord =
      trip.route.destCoords ||
      (currentCoords.length >= 2 ? currentCoords[currentCoords.length - 1] : originCoord);

    try {
      const routed = await calculateAutoBikeRoute(
        trip.route.origin || 'Start',
        trip.route.destination || 'Finish',
        originCoord,
        destCoord,
        remainingWaypoints
      );
      if (routed && routed.coordinates.length >= 2) {
        nextCoords = routed.coordinates;
        nextDistanceKm = routed.distanceKm;
        nextElevationGainM = routed.elevationGainM;
        nextElevationLossM = routed.elevationLossM;
        nextElevationProfile = routed.elevationProfile;
        nextWaypoints =
          remainingWaypoints.length > 0
            ? routed.resolvedWaypoints || remainingWaypoints
            : [];
        nextCueSheet = routed.cueSheet;
      } else {
        throw new Error('Empty OSRM route');
      }
    } catch {
      usedOfflineFallback = true;
      const stripped = removeAmenityCoordinateFallback(currentCoords, amenity, oldDistanceKm);
      nextCoords = stripped.coordinates;
      nextDistanceKm = stripped.distanceKm;
      nextCueSheet = undefined;
    }
  }

  const basePinned = trip.pinnedAmenities ? [...trip.pinnedAmenities] : [];
  const nextPinnedInput = options?.unpin
    ? basePinned.filter((p) => p.id !== amenity.id)
    : basePinned;

  return finalizeAmenityRouteUpdate({
    trip,
    currentAmenities,
    updatedPinnedInput: nextPinnedInput,
    nextCoords,
    nextDistanceKm,
    nextElevationGainM,
    nextElevationLossM,
    nextElevationProfile,
    nextWaypoints,
    nextCueSheet,
    nextRouteMode,
    nextRadiusMeters,
    actualDetourKm: Math.max(0, Math.round((oldDistanceKm - nextDistanceKm) * 10) / 10),
    usedOfflineFallback,
  });
}

export type LoopShape = 'loop' | 'out-and-back';

export interface GeneratedBikeLoopResult extends CalculatedBikeRoute {
  originCoordinates: [number, number];
  usedOfflineFallback: boolean;
  shape: LoopShape;
}

/**
 * Offsets a [lat, lng] coordinate by distKm along a compass bearing (degrees clockwise from North).
 */
export function offsetLatLng(
  lat: number,
  lng: number,
  distKm: number,
  bearingDeg: number
): [number, number] {
  const earthRadiusKm = 6371;
  const delta = distKm / earthRadiusKm;
  const theta = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [
    Number(((lat2 * 180) / Math.PI).toFixed(6)),
    Number(((lng2 * 180) / Math.PI).toFixed(6)),
  ];
}

function buildLoopWaypointsForRadius(
  startCoord: [number, number],
  radiusKm: number,
  shape: LoopShape,
  bearingDeg: number
): RouteWaypointParam[] {
  if (shape === 'out-and-back') {
    const turnCoord = offsetLatLng(startCoord[0], startCoord[1], radiusKm, bearingDeg);
    return [
      {
        id: 'loop-turnaround',
        name: 'Turnaround',
        coordinates: turnCoord,
      },
    ];
  }

  // Triangular road loop: Start -> WP1 -> WP2 -> Start
  const wp1 = offsetLatLng(startCoord[0], startCoord[1], radiusKm, (bearingDeg - 30 + 360) % 360);
  const wp2 = offsetLatLng(startCoord[0], startCoord[1], radiusKm, (bearingDeg + 30) % 360);
  return [
    { id: 'loop-wp-1', name: 'Loop Sector 1', coordinates: wp1 },
    { id: 'loop-wp-2', name: 'Loop Sector 2', coordinates: wp2 },
  ];
}

function buildOfflineLoopFallback(
  startCoord: [number, number],
  targetDistanceKm: number,
  shape: LoopShape,
  bearingDeg: number
): GeneratedBikeLoopResult {
  const safeDist = Math.max(4, targetDistanceKm);
  const coordinates: [number, number][] = [startCoord];

  if (shape === 'out-and-back') {
    const halfKm = safeDist / 2;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      coordinates.push(offsetLatLng(startCoord[0], startCoord[1], (halfKm * i) / steps, bearingDeg));
    }
    for (let i = steps - 1; i >= 0; i--) {
      coordinates.push(offsetLatLng(startCoord[0], startCoord[1], (halfKm * i) / steps, bearingDeg));
    }
  } else {
    // Circular polygon touching startCoord with perimeter ~= targetDistanceKm
    const circleRadiusKm = safeDist / (2 * Math.PI);
    const center = offsetLatLng(startCoord[0], startCoord[1], circleRadiusKm, bearingDeg);
    const startAngleFromCenter = (bearingDeg + 180) % 360;
    const segments = 32;
    for (let i = 1; i <= segments; i++) {
      const angle = (startAngleFromCenter + (360 * i) / segments) % 360;
      coordinates.push(offsetLatLng(center[0], center[1], circleRadiusKm, angle));
    }
  }

  return {
    coordinates,
    distanceKm: Number(safeDist.toFixed(1)),
    estimatedMinutes: Math.max(15, Math.round((safeDist / 21) * 60)),
    originCoordinates: startCoord,
    usedOfflineFallback: true,
    shape,
  };
}

/**
 * Generates an actual road-snapped circular loop or out-and-back bike route
 * starting and ending at the given location, using OSRM bike routing with an
 * offline geometric polyline fallback when unreachable.
 */
export async function generateBikeLoopRoute(
  originText: string,
  targetDistanceKm: number,
  options?: {
    originCoordsOverride?: [number, number] | null;
    shape?: LoopShape;
    bearingDeg?: number;
  }
): Promise<GeneratedBikeLoopResult> {
  const lang = getCurrentLanguage();
  const shape: LoopShape = options?.shape ?? 'loop';
  const bearingDeg = options?.bearingDeg ?? 45;
  const safeTargetKm = Math.max(4, Math.min(300, targetDistanceKm || 50));

  const startCoord =
    options?.originCoordsOverride || (await geocodeLocation(originText, lang));

  if (!startCoord) {
    throw new Error(
      lang === 'fr'
        ? `Impossible de localiser "${originText}". Sélectionnez un lieu dans la liste.`
        : `Could not locate "${originText}". Choose a suggestion from the dropdown.`
    );
  }

  // Initial crow-flies leg scaling accounting for ~1.3x real-road winding factor
  const initialRadiusKm =
    shape === 'out-and-back' ? safeTargetKm / (2 * 1.28) : safeTargetKm / (3 * 1.3);

  try {
    const firstWaypoints = buildLoopWaypointsForRadius(
      startCoord,
      Math.max(1, initialRadiusKm),
      shape,
      bearingDeg
    );
    const firstRoute = await calculateAutoBikeRoute(
      originText || 'Start',
      originText || 'Start',
      startCoord,
      startCoord,
      firstWaypoints
    );

    if (!firstRoute || firstRoute.coordinates.length < 2) {
      return buildOfflineLoopFallback(startCoord, safeTargetKm, shape, bearingDeg);
    }

    let bestRoute = firstRoute;
    const errorRatio = Math.abs(firstRoute.distanceKm - safeTargetKm) / safeTargetKm;

    // One adaptive distance calibration pass if OSRM distance is >18% off target
    if (errorRatio > 0.18 && firstRoute.distanceKm > 1) {
      const scaledRadiusKm = Math.max(
        1,
        Math.min(120, initialRadiusKm * (safeTargetKm / firstRoute.distanceKm))
      );
      try {
        const tunedWaypoints = buildLoopWaypointsForRadius(
          startCoord,
          scaledRadiusKm,
          shape,
          bearingDeg
        );
        const tunedRoute = await calculateAutoBikeRoute(
          originText || 'Start',
          originText || 'Start',
          startCoord,
          startCoord,
          tunedWaypoints
        );
        if (
          tunedRoute &&
          tunedRoute.coordinates.length >= 2 &&
          Math.abs(tunedRoute.distanceKm - safeTargetKm) <
            Math.abs(firstRoute.distanceKm - safeTargetKm)
        ) {
          bestRoute = tunedRoute;
        }
      } catch {
        // Keep first valid OSRM loop if tuning request fails
      }
    }

    return {
      ...bestRoute,
      originCoordinates: startCoord,
      usedOfflineFallback: false,
      shape,
    };
  } catch {
    return buildOfflineLoopFallback(startCoord, safeTargetKm, shape, bearingDeg);
  }
}
