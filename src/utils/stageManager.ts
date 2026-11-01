import { TripProfile, TripStage } from '../types/trip';

/**
 * Downsamples OSRM polyline coordinates to at most maxPoints (default 250),
 * always preserving the first and last coordinate so multi-day trips never bloat browser localStorage.
 */
export function downsampleCoordinates(
  coords?: [number, number][],
  maxPoints: number = 250
): [number, number][] | undefined {
  if (!coords) return undefined;
  if (coords.length <= maxPoints) {
    return coords.map((c) => [c[0], c[1]]);
  }
  if (maxPoints <= 0) return [];
  if (maxPoints === 1) return [[coords[0][0], coords[0][1]]];

  const sampled: [number, number][] = [];
  const total = coords.length;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(
      total - 1,
      Math.round((i * (total - 1)) / (maxPoints - 1))
    );
    sampled.push([coords[idx][0], coords[idx][1]]);
  }
  return sampled;
}

/**
 * Increment a YYYY-MM-DD date string by a given number of days in UTC.
 */
export function addDaysToIso(dateStr?: string, days: number = 1): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + days);
    return now.toISOString().slice(0, 10);
  }
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);

  const utcDate = new Date(Date.UTC(year, month, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  const yyyy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Extracts the active top-level fields (departureDate, departureTime, route with downsampled coordinates,
 * office, weather, customChips) into a TripStage snapshot.
 */
export function extractCurrentStage(trip: TripProfile, dayNumber: number): TripStage {
  const existingStage = trip.stages?.find((s) => s.dayNumber === dayNumber)
    ?? (trip.activeStageIndex !== undefined && trip.stages ? trip.stages[trip.activeStageIndex] : undefined);

  const fallbackDate = new Date().toISOString().slice(0, 10);
  const departureDate = trip.departureDate || existingStage?.departureDate || fallbackDate;
  const departureTime = trip.departureTime || existingStage?.departureTime || '08:00';

  let targetMode: 'arrive' | 'depart' | undefined = existingStage?.targetMode;
  if (trip.arriveAtMode !== undefined) {
    targetMode = trip.arriveAtMode ? 'arrive' : 'depart';
  }

  return {
    id: (existingStage && existingStage.dayNumber === dayNumber && existingStage.id)
      ? existingStage.id
      : (existingStage?.id || `stage-${dayNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    dayNumber,
    departureDate,
    departureTime,
    targetMode,
    route: {
      ...trip.route,
      coordinates: downsampleCoordinates(trip.route?.coordinates),
    },
    office: { ...trip.office },
    weather: { ...trip.weather },
    customChips: [...(trip.customChips || [])],
    accommodationNote: existingStage?.accommodationNote,
  };
}

/**
 * Switches the active stage:
 * 1. Saves the current top-level trip fields back into trip.stages[trip.activeStageIndex || 0].
 * 2. Loads trip.stages[targetIndex] and projects its departureDate, departureTime, route,
 *    office, weather, and customChips onto the top-level TripProfile properties, updating activeStageIndex.
 */
export function switchActiveStage(trip: TripProfile, targetIndex: number): TripProfile {
  const stages = trip.stages && trip.stages.length > 0
    ? trip.stages.map((st) => ({ ...st }))
    : [extractCurrentStage(trip, 1)];

  const currentIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, stages.length - 1));
  const currentDayNumber = stages[currentIdx]?.dayNumber ?? (currentIdx + 1);

  // 1. Save current top-level fields back into stages[currentIdx]
  const currentSnapshot = extractCurrentStage(trip, currentDayNumber);
  stages[currentIdx] = {
    ...stages[currentIdx],
    ...currentSnapshot,
    id: stages[currentIdx]?.id || currentSnapshot.id,
    accommodationNote: stages[currentIdx]?.accommodationNote ?? currentSnapshot.accommodationNote,
  };

  // 2. Load target stage and project onto top-level properties
  const validTargetIndex = Math.max(0, Math.min(targetIndex, stages.length - 1));
  const targetStage = stages[validTargetIndex];

  return {
    ...trip,
    departureDate: targetStage.departureDate,
    departureTime: targetStage.departureTime,
    route: {
      ...targetStage.route,
      coordinates: targetStage.route.coordinates
        ? targetStage.route.coordinates.map((c) => [c[0], c[1]] as [number, number])
        : undefined,
    },
    office: { ...targetStage.office },
    weather: { ...targetStage.weather },
    customChips: [...(targetStage.customChips || [])],
    arriveAtMode: targetStage.targetMode ? targetStage.targetMode === 'arrive' : trip.arriveAtMode,
    stages,
    activeStageIndex: validTargetIndex,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds a new consecutive stage:
 * 1. If trip.stages is undefined or empty, initializes Stage 1 from the current trip state.
 * 2. Creates a new stage (Day N+1) where:
 *    - route.origin is automatically pre-filled with previous stage's route.destination (daisy-chain relay).
 *    - route.destination is "" (ready for the user to input their next checkpoint).
 *    - route.distanceKm is 45, route.elevationGainM is 200, route.coordinates is undefined.
 *    - departureDate is incremented by +1 calendar day from the previous stage's departureDate.
 *    - office.targetGateArrivalTime defaults to '17:30'.
 *    - customChips inherits the previous stage's chips.
 * 3. Appends the new stage and switches activeStageIndex to the newly created stage.
 */
export function addNextStage(trip: TripProfile): TripProfile {
  let stages: TripStage[];

  if (!trip.stages || trip.stages.length === 0) {
    const stage1 = extractCurrentStage(trip, 1);
    stages = [stage1];
  } else {
    stages = trip.stages.map((st) => ({ ...st }));
    const currentIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, stages.length - 1));
    const currentDayNumber = stages[currentIdx]?.dayNumber ?? (currentIdx + 1);
    const activeSnapshot = extractCurrentStage(trip, currentDayNumber);
    stages[currentIdx] = {
      ...stages[currentIdx],
      ...activeSnapshot,
      id: stages[currentIdx]?.id || activeSnapshot.id,
      accommodationNote: stages[currentIdx]?.accommodationNote ?? activeSnapshot.accommodationNote,
    };
  }

  const previousStage = stages[stages.length - 1];
  const nextDayNumber = stages.length + 1;
  const nextDepartureDate = addDaysToIso(
    previousStage.departureDate || trip.departureDate || new Date().toISOString().slice(0, 10),
    1
  );

  const newStage: TripStage = {
    id: `stage-${nextDayNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    dayNumber: nextDayNumber,
    departureDate: nextDepartureDate,
    departureTime: previousStage.departureTime || trip.departureTime || '08:00',
    targetMode: previousStage.targetMode ?? (trip.arriveAtMode !== undefined ? (trip.arriveAtMode ? 'arrive' : 'depart') : 'arrive'),
    route: {
      ...previousStage.route,
      origin: previousStage.route.destination || '',
      destination: '',
      distanceKm: 45,
      elevationGainM: 200,
      coordinates: undefined,
    },
    office: {
      ...previousStage.office,
      targetGateArrivalTime: '17:30',
    },
    weather: {
      ...previousStage.weather,
    },
    customChips: [...(previousStage.customChips || [])],
    accommodationNote: undefined,
  };

  const updatedStages = [...stages, newStage];
  const targetIndex = updatedStages.length - 1;

  return {
    ...trip,
    departureDate: newStage.departureDate,
    departureTime: newStage.departureTime,
    route: {
      ...newStage.route,
    },
    office: { ...newStage.office },
    weather: { ...newStage.weather },
    customChips: [...newStage.customChips],
    arriveAtMode: newStage.targetMode ? newStage.targetMode === 'arrive' : trip.arriveAtMode,
    stages: updatedStages,
    activeStageIndex: targetIndex,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes the stage at indexToRemove (if more than 1 stage exists),
 * re-numbers dayNumber sequentially (1, 2, 3...), and projects the nearest valid stage onto top-level trip.
 */
export function removeStage(trip: TripProfile, indexToRemove: number): TripProfile {
  if (!trip.stages || trip.stages.length <= 1) {
    return trip;
  }

  if (indexToRemove < 0 || indexToRemove >= trip.stages.length) {
    return trip;
  }

  const currentIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1));
  let stages = trip.stages.map((st) => ({ ...st }));

  // If removing a stage other than the active stage, persist current active stage live edits first
  if (currentIdx !== indexToRemove) {
    const currentDayNumber = stages[currentIdx]?.dayNumber ?? (currentIdx + 1);
    const activeSnapshot = extractCurrentStage(trip, currentDayNumber);
    stages[currentIdx] = {
      ...stages[currentIdx],
      ...activeSnapshot,
      id: stages[currentIdx]?.id || activeSnapshot.id,
      accommodationNote: stages[currentIdx]?.accommodationNote ?? activeSnapshot.accommodationNote,
    };
  }

  // Filter out removed stage
  const filtered = stages.filter((_, idx) => idx !== indexToRemove);

  // Re-number dayNumber sequentially (1, 2, 3...)
  const renumberedStages: TripStage[] = filtered.map((st, idx) => ({
    ...st,
    dayNumber: idx + 1,
  }));

  // Determine nearest valid active index
  let newActiveIndex = currentIdx;
  if (indexToRemove < currentIdx) {
    newActiveIndex = currentIdx - 1;
  } else if (indexToRemove === currentIdx) {
    newActiveIndex = Math.min(indexToRemove, renumberedStages.length - 1);
  }
  newActiveIndex = Math.max(0, Math.min(newActiveIndex, renumberedStages.length - 1));

  const targetStage = renumberedStages[newActiveIndex];

  return {
    ...trip,
    departureDate: targetStage.departureDate,
    departureTime: targetStage.departureTime,
    route: {
      ...targetStage.route,
      coordinates: targetStage.route.coordinates
        ? targetStage.route.coordinates.map((c) => [c[0], c[1]] as [number, number])
        : undefined,
    },
    office: { ...targetStage.office },
    weather: { ...targetStage.weather },
    customChips: [...(targetStage.customChips || [])],
    arriveAtMode: targetStage.targetMode ? targetStage.targetMode === 'arrive' : trip.arriveAtMode,
    stages: renumberedStages,
    activeStageIndex: newActiveIndex,
    updatedAt: new Date().toISOString(),
  };
}

export interface ExpeditionTotals {
  totalDays: number;
  totalDistanceKm: number;
  totalElevationM: number;
  originCity: string;
  finalDestinationCity: string;
}

/**
 * Returns { totalDays, totalDistanceKm, totalElevationM, originCity, finalDestinationCity }
 * summed across all stages (including unsaved live edits on the currently active stage).
 */
export function getExpeditionTotals(trip: TripProfile): ExpeditionTotals {
  if (!trip.stages || trip.stages.length === 0) {
    return {
      totalDays: 1,
      totalDistanceKm: Math.round((trip.route?.distanceKm ?? 0) * 10) / 10,
      totalElevationM: Math.round(trip.route?.elevationGainM ?? 0),
      originCity: trip.route?.origin || '',
      finalDestinationCity: trip.route?.destination || '',
    };
  }

  const activeIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1));
  let totalDistanceKm = 0;
  let totalElevationM = 0;

  for (let i = 0; i < trip.stages.length; i++) {
    const stage = trip.stages[i];
    const isLive = i === activeIdx;
    const dist = isLive
      ? (trip.route?.distanceKm ?? stage.route.distanceKm ?? 0)
      : (stage.route.distanceKm ?? 0);
    const elev = isLive
      ? (trip.route?.elevationGainM ?? stage.route.elevationGainM ?? 0)
      : (stage.route.elevationGainM ?? 0);

    totalDistanceKm += dist;
    totalElevationM += elev;
  }

  const firstStage = trip.stages[0];
  const lastStage = trip.stages[trip.stages.length - 1];

  const originCity = activeIdx === 0
    ? (trip.route?.origin || firstStage.route.origin || '')
    : (firstStage.route.origin || '');

  const finalDestinationCity = activeIdx === trip.stages.length - 1
    ? (trip.route?.destination || lastStage.route.destination || '')
    : (lastStage.route.destination || '');

  return {
    totalDays: trip.stages.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalElevationM: Math.round(totalElevationM),
    originCity,
    finalDestinationCity,
  };
}
