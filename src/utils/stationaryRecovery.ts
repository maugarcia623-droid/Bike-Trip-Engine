import type { TripProfile } from '../types/trip';
import { getSolarEphemeris, hhmmToMinutes, minutesToHHMM } from './solarVisibility';

export const PRE_DAWN_WINTER_MAX_REST_MIN = 5;
export const LUNCH_BREAK_MIN_DURATION = 30;

export interface StationaryRecoveryRule {
  isRestricted: boolean;
  maxRestMinutes: number | null;
  disableLunchBreak: boolean;
  isWinter: boolean;
  isBeforeDawn: boolean;
  civilDawnHHMM: string;
  rolloutHHMM: string;
}

/**
 * Evaluates whether stationary mid-ride recovery time must be restricted based on
 * time of day (before dawn) and season (winter: Nov–Feb).
 *
 * When a ride starts before dawn in winter (e.g. before 07:00 or before civil dawn),
 * all mid-ride rest stops are strictly capped at 5 minutes to prevent core body
 * temperature from dropping, and 30-minute+ lunch breaks are disabled.
 */
export function getStationaryRecoveryRule(params: {
  rolloutTimeHHMM: string;
  departureDate?: string;
  coordinates?: [number, number];
}): StationaryRecoveryRule {
  const dateStr = params.departureDate || new Date().toISOString().split('T')[0];
  const [, monthNum] = dateStr.split('-').map(Number);
  const isWinter = monthNum === 11 || monthNum === 12 || monthNum === 1 || monthNum === 2;

  const coords: [number, number] = params.coordinates || [47.2184, -1.5536];
  const solar = getSolarEphemeris(coords[0], coords[1], dateStr);

  const civilDawnMin = hhmmToMinutes(solar.civilDawn);
  const rolloutMin = hhmmToMinutes(params.rolloutTimeHHMM || '07:15');
  const isBeforeDawn = rolloutMin < Math.max(civilDawnMin, 7 * 60);
  const isRestricted = isWinter && isBeforeDawn;

  return {
    isRestricted,
    maxRestMinutes: isRestricted ? PRE_DAWN_WINTER_MAX_REST_MIN : null,
    disableLunchBreak: isRestricted,
    isWinter,
    isBeforeDawn,
    civilDawnHHMM: solar.civilDawn,
    rolloutHHMM: params.rolloutTimeHHMM,
  };
}

/**
 * Estimates rollout time (HH:MM) for a TripProfile without creating a circular
 * dependency on timeline.ts.
 */
export function estimateTripRolloutTimeHHMM(trip: TripProfile): string {
  if (trip.arriveAtMode === false && trip.departureTime) {
    return trip.departureTime;
  }

  const tagUpper = (trip.tag || '').toUpperCase();
  const isSport = tagUpper.includes('SPORT') || tagUpper.includes('FONDO') || tagUpper.includes('TEMPO');
  const isBikepacking = tagUpper.includes('BIKEPACK') || tagUpper.includes('BIVOUAC');
  const isEscapade =
    !isSport &&
    !isBikepacking &&
    (tagUpper.includes('ESCAPADE') ||
      tagUpper.includes('TOURING') ||
      tagUpper.includes('LEISURE') ||
      tagUpper.includes('WEEKEND'));

  const defaultAnchor = isSport ? '11:00' : isBikepacking ? '18:00' : isEscapade ? '15:00' : '08:30';
  const anchorHHMM =
    trip.office?.targetGateArrivalTime ||
    trip.office?.shiftStartTime ||
    trip.ruleSettings?.anchorTimeHHMM ||
    defaultAnchor;

  const speed = Math.max(5, trip.route?.targetSpeedKmH || 25);
  const movingMin = Math.round(((trip.route?.distanceKm || 20) / speed) * 60);
  const routeBuffer =
    isEscapade || isBikepacking ? 15 : isSport ? 5 : trip.route?.urbanTrafficDelayMinutes ?? 8;
  const arrivalBuffer =
    isEscapade || isBikepacking ? 10 : isSport ? 5 : trip.route?.gateSecurityDelayMinutes ?? 5;

  return minutesToHHMM(hhmmToMinutes(anchorHHMM) - (movingMin + routeBuffer + arrivalBuffer));
}

/**
 * Convenience wrapper that resolves the stationary recovery rule for a TripProfile.
 */
export function getStationaryRecoveryRuleForTrip(
  trip: TripProfile,
  overrideRolloutHHMM?: string
): StationaryRecoveryRule {
  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const departureDate = activeStage?.departureDate || trip.departureDate;
  const rolloutTimeHHMM = overrideRolloutHHMM || estimateTripRolloutTimeHHMM(trip);

  return getStationaryRecoveryRule({
    rolloutTimeHHMM,
    departureDate,
    coordinates: trip.route?.coordinates?.[0],
  });
}

/**
 * Applies the stationary recovery cap/disable rule to a requested rest stop duration.
 * - Unrestricted: returns the rounded non-negative duration unchanged.
 * - Restricted (pre-dawn winter): disables any >= 30-min lunch/recovery break (returns 0),
 *   and caps all shorter mid-ride rest stops at 5 minutes max.
 */
export function resolveEffectiveRestStopMinutes(
  requestedMinutes: number,
  rule: StationaryRecoveryRule
): number {
  const clean = Math.max(0, Math.round(Number(requestedMinutes) || 0));
  if (!rule.isRestricted) return clean;
  if (clean >= LUNCH_BREAK_MIN_DURATION) return 0;
  return Math.min(PRE_DAWN_WINTER_MAX_REST_MIN, clean);
}
