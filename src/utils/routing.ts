/**
 * Free Bicycle Routing Engine via Komoot Photon / Nominatim + OSRM Public Bike Routing
 * Supports flexible multi-stop waypoints, intermediate via-points, and Resupply Radar POI rerouting.
 */
import { getCurrentLanguage } from '../context/LanguageContext';
import { geocodeLocation } from '../services/locationService';
import { RouteCueStep, RouteParams, RouteWaypoint, TripProfile } from '../types/trip';
import { StageAmenity } from '../types/amenities';
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
  const osrmUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/cycling/${coordsParam}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(osrmUrl);
  if (!response.ok) {
    throw new Error(
      lang === 'fr'
        ? `Impossible de calculer l’itinéraire vélo pour le moment (code ${response.status}).`
        : `Could not calculate cycling directions right now (status ${response.status}).`
    );
  }

  const json = await response.json();

  if (!json.routes || json.routes.length === 0) {
    throw new Error(
      lang === 'fr'
        ? 'Aucun itinéraire cyclable trouvé entre ces lieux et points de passage.'
        : 'No cycling path found between those locations and via-points.'
    );
  }

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

  return {
    coordinates,
    distanceKm,
    estimatedMinutes,
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
  const osrmUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/cycling/${coordsParam}?overview=full&geometries=geojson&steps=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const json = await response.json();
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
    clearTimeout(timeoutId);
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
    const prevTotal = computeCumulativeDistances(currentCoords).slice(-1)[0] || oldDistanceKm;
    const nextTotal = computeCumulativeDistances(filteredCoords).slice(-1)[0] || oldDistanceKm;
    const deltaKm = Math.max(0, prevTotal - nextTotal);
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
    oldDistanceKm > 0
      ? Math.max(0, Math.round(oldElev * (nextDistanceKm / oldDistanceKm)))
      : oldElev;

  const updatedPinned = resnapAmenitiesToRoute(
    updatedPinnedInput.map((p) => ({ ...p, isPinned: true })),
    nextCoords,
    trip.route.elevationProfile
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
    coordinates: nextCoords,
    waypoints: finalWaypoints,
    cueSheet: nextCueSheet,
    elevationProfile: undefined, // Re-synthesized on demand for new distance
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
      currentCoords.length >= 2 ? currentCoords[currentCoords.length - 1] : originCoord;

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
      currentCoords.length >= 2 ? currentCoords[currentCoords.length - 1] : originCoord;

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
    nextWaypoints,
    nextCueSheet,
    nextRouteMode,
    nextRadiusMeters,
    actualDetourKm: Math.max(0, Math.round((oldDistanceKm - nextDistanceKm) * 10) / 10),
    usedOfflineFallback,
  });
}
