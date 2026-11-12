import { TripProfile, TripStage } from '../types/trip';
import { calculatePhysics } from './physics';
import { calculateReverseTimeline, parseHHMM } from './timeline';
import { getChipsExtraBufferMinutes } from './archetypeChips';
import { Language } from '../context/LanguageContext';

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
      waypoints: trip.route?.waypoints ? trip.route.waypoints.map((w) => ({ ...w })) : undefined,
    },
    office: { ...trip.office },
    weather: { ...trip.weather },
    customChips: [...(trip.customChips || [])],
    accommodationNote: existingStage?.accommodationNote,
    pinnedAmenities: trip.pinnedAmenities
      ? trip.pinnedAmenities.map((a) => ({ ...a }))
      : existingStage?.pinnedAmenities
      ? existingStage.pinnedAmenities.map((a) => ({ ...a }))
      : undefined,
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
      waypoints: targetStage.route.waypoints
        ? targetStage.route.waypoints.map((w) => ({ ...w }))
        : undefined,
    },
    office: { ...targetStage.office },
    weather: { ...targetStage.weather },
    customChips: [...(targetStage.customChips || [])],
    arriveAtMode: targetStage.targetMode ? targetStage.targetMode === 'arrive' : trip.arriveAtMode,
    stages,
    activeStageIndex: validTargetIndex,
    pinnedAmenities: targetStage.pinnedAmenities
      ? targetStage.pinnedAmenities.map((a) => ({ ...a }))
      : undefined,
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
      waypoints: undefined,
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
    pinnedAmenities: undefined,
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
      waypoints: targetStage.route.waypoints
        ? targetStage.route.waypoints.map((w) => ({ ...w }))
        : undefined,
    },
    office: { ...targetStage.office },
    weather: { ...targetStage.weather },
    customChips: [...(targetStage.customChips || [])],
    arriveAtMode: targetStage.targetMode ? targetStage.targetMode === 'arrive' : trip.arriveAtMode,
    stages: renumberedStages,
    activeStageIndex: newActiveIndex,
    pinnedAmenities: targetStage.pinnedAmenities
      ? targetStage.pinnedAmenities.map((a) => ({ ...a }))
      : undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns a consistent array of stages where the currently active stage reflects
 * any live edits on the top-level TripProfile fields.
 */
export function resolveLiveStages(trip: TripProfile): TripStage[] {
  if (!trip.stages || trip.stages.length === 0) {
    return [extractCurrentStage(trip, 1)];
  }

  const activeIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1));
  return trip.stages.map((stage, idx) => {
    if (idx !== activeIdx) return stage;
    const live = extractCurrentStage(trip, stage.dayNumber || idx + 1);
    return {
      ...stage,
      ...live,
      id: stage.id || live.id,
      // Keep full-resolution live coordinates in memory for GPX export / mapping
      route: {
        ...live.route,
        coordinates: trip.route?.coordinates ?? live.route.coordinates,
      },
      accommodationNote: stage.accommodationNote ?? live.accommodationNote,
    };
  });
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
  const stages = resolveLiveStages(trip);
  let totalDistanceKm = 0;
  let totalElevationM = 0;

  for (const stage of stages) {
    totalDistanceKm += stage.route?.distanceKm ?? 0;
    totalElevationM += stage.route?.elevationGainM ?? 0;
  }

  const firstStage = stages[0];
  const lastStage = stages[stages.length - 1];

  return {
    totalDays: stages.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalElevationM: Math.round(totalElevationM),
    originCity: firstStage?.route?.origin || '',
    finalDestinationCity: lastStage?.route?.destination || '',
  };
}

export type TourFatigueLevel = 'fresh' | 'moderate' | 'high';

export interface TourStageSummary {
  id: string;
  dayNumber: number;
  departureDate: string;
  origin: string;
  destination: string;
  waypointCount: number;
  distanceKm: number;
  elevationGainM: number;
  startTime: string;
  estimatedArrivalTime: string;
  movingTimeMinutes: number;
  movingTimeFormatted: string;
  bufferMinutes: number;
  totalKcal: number;
  totalCarbsGrams: number;
  legWatts: number;
  effectiveSpeedKmH: number;
  cumulativeDistanceKm: number;
  cumulativeElevationM: number;
  fatigueLevel: TourFatigueLevel;
  overnightRecoveryMinutes: number | null;
  overnightRecoveryFormatted: string | null;
}

export interface TourAggregateSummary {
  totalDays: number;
  totalDistanceKm: number;
  totalElevationM: number;
  totalMovingTimeMinutes: number;
  totalMovingTimeFormatted: string;
  totalKcalBurn: number;
  totalCarbsGrams: number;
  batteryBudgetHours: number;
  originCity: string;
  finalDestinationCity: string;
  stages: TourStageSummary[];
}

export function formatDurationHoursMins(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, '0')} min`;
}

function calendarDaysBetween(isoA?: string, isoB?: string): number {
  if (!isoA || !isoB || !/^\d{4}-\d{2}-\d{2}$/.test(isoA) || !/^\d{4}-\d{2}-\d{2}$/.test(isoB)) {
    return 1;
  }
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  if (isNaN(a) || isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

/**
 * Computes full cumulative metrics and aggregated daily timeline (including overnight recovery)
 * across all stages of a Tour.
 */
export function getTourAggregateSummary(
  trip: TripProfile,
  lang: Language = 'en',
  ftpWatts?: number
): TourAggregateSummary {
  const stages = resolveLiveStages(trip);
  let totalDistanceKm = 0;
  let totalElevationM = 0;
  let totalMovingTimeMinutes = 0;
  let totalKcalBurn = 0;
  let totalCarbsGrams = 0;
  let cumulativeWorkKj = 0;
  let totalElapsedMinutesWithBuffers = 0;

  const stageSummaries: TourStageSummary[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const physics = calculatePhysics(trip.physics, stage.route, stage.weather, lang, ftpWatts);

    // Extra buffer from stage-level custom chips
    const stageTripProxy: TripProfile = {
      ...trip,
      customChips: stage.customChips || [],
      office: stage.office,
    };
    const extraBufferMinutes = getChipsExtraBufferMinutes(stageTripProxy);

    const timeline = calculateReverseTimeline(
      stage.route,
      stage.office,
      stage.weather,
      trip.tag,
      stage.route.destination,
      lang,
      extraBufferMinutes,
      stage.customChips || [],
      {
        effectiveSpeedKmH: physics.effectiveSpeedKmH,
        calmSpeedKmH: physics.calmSpeedKmH,
        arriveAtMode: stage.targetMode !== undefined ? stage.targetMode === 'arrive' : trip.arriveAtMode,
        departureTime: stage.departureTime,
        movingTimeSeconds: physics.movingTimeSeconds,
        pinnedAmenities: stage.pinnedAmenities,
      }
    );

    const distKm = Math.round((stage.route?.distanceKm ?? 0) * 10) / 10;
    const elevM = Math.round(stage.route?.elevationGainM ?? 0);
    const movingMins = Math.max(1, Math.round(physics.movingTimeSeconds / 60));

    totalDistanceKm += distKm;
    totalElevationM += elevM;
    totalMovingTimeMinutes += movingMins;
    totalKcalBurn += Math.round(physics.totalKcalBurn);
    totalCarbsGrams += Math.round(physics.totalCarbsBurnedGrams);
    cumulativeWorkKj += physics.totalWorkKj;
    totalElapsedMinutesWithBuffers += movingMins + timeline.bufferMinutes;

    const startTime = timeline.hardDepartureTime || stage.departureTime || '08:00';
    const estimatedArrivalTime = timeline.gateArrivalTime || '17:00';

    // Overnight recovery between Stage i-1 arrival and Stage i start
    let overnightRecoveryMinutes: number | null = null;
    let overnightRecoveryFormatted: string | null = null;
    if (i > 0) {
      const prevSummary = stageSummaries[i - 1];
      const prevStage = stages[i - 1];
      const daySpan = calendarDaysBetween(prevSummary.departureDate, stage.departureDate);
      const prevArrMins = parseHHMM(prevSummary.estimatedArrivalTime);
      const currStartMins = parseHHMM(startTime);
      const rawRecovery = daySpan * 1440 + currStartMins - prevArrMins;
      // Guard against same-day anomaly if user manually entered identical dates
      const validRecovery = rawRecovery > 0 ? rawRecovery : (1440 + currStartMins - prevArrMins);
      overnightRecoveryMinutes = Math.max(60, validRecovery);
      overnightRecoveryFormatted = formatDurationHoursMins(overnightRecoveryMinutes);
      void prevStage;
    }

    // Multi-day fatigue curve classification from cumulative riding hours, work, and consecutive days
    const cumHours = totalMovingTimeMinutes / 60;
    let fatigueLevel: TourFatigueLevel = 'fresh';
    if (cumHours > 7.5 || cumulativeWorkKj > 4200 || (i >= 2 && cumHours > 5.5)) {
      fatigueLevel = 'high';
    } else if (cumHours >= 3.2 || i >= 1) {
      fatigueLevel = 'moderate';
    }

    stageSummaries.push({
      id: stage.id,
      dayNumber: stage.dayNumber || i + 1,
      departureDate: stage.departureDate,
      origin: stage.route?.origin || '',
      destination: stage.route?.destination || '',
      waypointCount: stage.route?.waypoints?.length || 0,
      distanceKm: distKm,
      elevationGainM: elevM,
      startTime,
      estimatedArrivalTime,
      movingTimeMinutes: movingMins,
      movingTimeFormatted: formatDurationHoursMins(movingMins),
      bufferMinutes: timeline.bufferMinutes,
      totalKcal: Math.round(physics.totalKcalBurn),
      totalCarbsGrams: Math.round(physics.totalCarbsBurnedGrams),
      legWatts: Math.round(physics.legWatts),
      effectiveSpeedKmH: physics.effectiveSpeedKmH,
      cumulativeDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      cumulativeElevationM: Math.round(totalElevationM),
      fatigueLevel,
      overnightRecoveryMinutes,
      overnightRecoveryFormatted,
    });
  }

  return {
    totalDays: stages.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalElevationM: Math.round(totalElevationM),
    totalMovingTimeMinutes,
    totalMovingTimeFormatted: formatDurationHoursMins(totalMovingTimeMinutes),
    totalKcalBurn,
    totalCarbsGrams,
    batteryBudgetHours: Math.max(1, Math.round((totalElapsedMinutesWithBuffers / 60) * 10) / 10),
    originCity: stageSummaries[0]?.origin || '',
    finalDestinationCity: stageSummaries[stageSummaries.length - 1]?.destination || '',
    stages: stageSummaries,
  };
}
