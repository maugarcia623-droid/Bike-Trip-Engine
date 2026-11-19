import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStationaryRecoveryRule,
  resolveEffectiveRestStopMinutes,
  PRE_DAWN_WINTER_MAX_REST_MIN,
} from '../stationaryRecovery';
import { calculateDwellMinutes, solveTripTimeline, calculateReverseTimeline } from '../timeline';
import { getChipsExtraBufferMinutes, getPlannedRestStopMinutes } from '../archetypeChips';
import type { TripProfile, RouteParams, OfficeConstraints, WeatherCondition } from '../../types/trip';

const BASE_WEATHER: WeatherCondition = {
  isHeadwindActive: false,
  baseWindSpeedKmH: 5,
  windDirection: 'calm',
  windDirectionDegrees: 0,
  temperatureC: 3,
  precipitationRiskPercent: 0,
  estuaryGustKmH: 10,
  visibilityKm: 10,
};

const BASE_OFFICE: OfficeConstraints = {
  shiftStartTime: '09:00',
  targetGateArrivalTime: '08:30',
  gateName: 'Main Gate',
  lockerRefuelMinutes: 10,
  showerChangeMinutes: 10,
  breakRoomBreakfastMinutes: 10,
  strictNoFoodInOpenSpace: false,
  badgeRequiredForGate: false,
  notes: '',
};

function makeRoute(overrides: Partial<RouteParams> = {}): RouteParams {
  return {
    origin: 'Start',
    destination: 'Finish',
    distanceKm: 30,
    targetSpeedKmH: 25,
    elevationGainM: 100,
    urbanTrafficDelayMinutes: 5,
    gateSecurityDelayMinutes: 5,
    coordinates: [[47.2184, -1.5536]],
    ...overrides,
  };
}

function makeTrip(overrides: Partial<TripProfile> = {}): TripProfile {
  return {
    id: 'test-trip',
    name: 'Winter Test Ride',
    tag: 'ESCAPADE',
    description: 'Test',
    createdAt: '2026-12-01T00:00:00Z',
    updatedAt: '2026-12-01T00:00:00Z',
    departureDate: '2026-12-15',
    departureTime: '06:30',
    arriveAtMode: false,
    physics: {
      riderWeightKg: 72,
      bikeWeightKg: 10,
      gearWeightKg: 2,
      cda: 0.35,
      crr: 0.005,
      rho: 1.225,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.5,
    },
    route: makeRoute(),
    office: BASE_OFFICE,
    weather: BASE_WEATHER,
    checklist: [],
    customChips: [],
    ruleSettings: {},
    ...overrides,
  };
}

describe('stationaryRecovery rule (pre-dawn winter cap)', () => {
  it('activates 5-min cap and disables lunch breaks before dawn in winter', () => {
    const rule = getStationaryRecoveryRule({
      rolloutTimeHHMM: '06:30',
      departureDate: '2026-12-15',
      coordinates: [47.2184, -1.5536],
    });
    assert.equal(rule.isWinter, true);
    assert.equal(rule.isBeforeDawn, true);
    assert.equal(rule.isRestricted, true);
    assert.equal(rule.maxRestMinutes, PRE_DAWN_WINTER_MAX_REST_MIN);
    assert.equal(rule.disableLunchBreak, true);
  });

  it('activates when starting before winter civil dawn even after 07:00', () => {
    const rule = getStationaryRecoveryRule({
      rolloutTimeHHMM: '07:15',
      departureDate: '2026-12-21',
      coordinates: [47.2184, -1.5536],
    });
    assert.equal(rule.isWinter, true);
    assert.equal(rule.isBeforeDawn, true);
    assert.equal(rule.isRestricted, true);
  });

  it('does not restrict winter rides starting after dawn', () => {
    const rule = getStationaryRecoveryRule({
      rolloutTimeHHMM: '09:30',
      departureDate: '2026-12-15',
      coordinates: [47.2184, -1.5536],
    });
    assert.equal(rule.isWinter, true);
    assert.equal(rule.isBeforeDawn, false);
    assert.equal(rule.isRestricted, false);
    assert.equal(rule.maxRestMinutes, null);
    assert.equal(rule.disableLunchBreak, false);
  });

  it('does not restrict early morning rides in summer', () => {
    const rule = getStationaryRecoveryRule({
      rolloutTimeHHMM: '06:30',
      departureDate: '2026-06-21',
      coordinates: [47.2184, -1.5536],
    });
    assert.equal(rule.isWinter, false);
    assert.equal(rule.isRestricted, false);
  });

  it('caps shorter rest stops at 5 min and disables 30-min+ lunch breaks', () => {
    const restricted = getStationaryRecoveryRule({
      rolloutTimeHHMM: '06:30',
      departureDate: '2026-12-15',
    });
    assert.equal(resolveEffectiveRestStopMinutes(15, restricted), 5);
    assert.equal(resolveEffectiveRestStopMinutes(5, restricted), 5);
    assert.equal(resolveEffectiveRestStopMinutes(3, restricted), 3);
    assert.equal(resolveEffectiveRestStopMinutes(30, restricted), 0);
    assert.equal(resolveEffectiveRestStopMinutes(45, restricted), 0);
    assert.equal(resolveEffectiveRestStopMinutes(60, restricted), 0);

    const unrestricted = getStationaryRecoveryRule({
      rolloutTimeHHMM: '10:00',
      departureDate: '2026-12-15',
    });
    assert.equal(resolveEffectiveRestStopMinutes(15, unrestricted), 15);
    assert.equal(resolveEffectiveRestStopMinutes(30, unrestricted), 30);
    assert.equal(resolveEffectiveRestStopMinutes(45, unrestricted), 45);
  });

  it('caps dwell in solveTripTimeline and disables 30-min+ lunch breaks in winter pre-dawn', () => {
    const winterPreDawn = solveTripTimeline(
      3600,
      ['coffee-stop', 'picnic-outing'],
      {
        timelineAnchorMode: 'depart-at',
        anchorTimeHHMM: '06:30',
        plannedLongStopMin: 30,
      },
      undefined,
      { departureDate: '2026-12-15', coordinates: [47.2184, -1.5536] }
    );
    // coffee-stop (15) capped to 5, picnic-outing (45) disabled -> 0, plannedLongStopMin (30) disabled -> 0
    assert.equal(winterPreDawn.dwellMin, 5);

    const winterDay = solveTripTimeline(
      3600,
      ['coffee-stop', 'picnic-outing'],
      {
        timelineAnchorMode: 'depart-at',
        anchorTimeHHMM: '10:00',
        plannedLongStopMin: 30,
      },
      undefined,
      { departureDate: '2026-12-15', coordinates: [47.2184, -1.5536] }
    );
    assert.equal(winterDay.dwellMin, 90);
  });

  it('omits 30-min+ lunch breaks and caps shorter planned stops at 5 min in calculateReverseTimeline', () => {
    const preDawnWithLunch = calculateReverseTimeline(
      makeRoute(),
      BASE_OFFICE,
      BASE_WEATHER,
      'ESCAPADE',
      'Finish',
      'en',
      0,
      ['picnic-outing'],
      {
        effectiveSpeedKmH: 25,
        calmSpeedKmH: 25,
        arriveAtMode: false,
        departureTime: '06:30',
        departureDate: '2026-12-15',
        logistics: { plannedLongStopMin: 30, plannedLongStopLabel: 'Lunch break' },
      }
    );
    assert.equal(preDawnWithLunch.stationaryRecoveryRule?.isRestricted, true);
    assert.equal(preDawnWithLunch.steps.some((s) => s.id === 'esc-picnic-lunch'), false);
    assert.equal(preDawnWithLunch.steps.some((s) => s.id === 'planned-long-stop'), false);

    const preDawnWithShortStop = calculateReverseTimeline(
      makeRoute(),
      BASE_OFFICE,
      BASE_WEATHER,
      'ESCAPADE',
      'Finish',
      'en',
      0,
      [],
      {
        effectiveSpeedKmH: 25,
        calmSpeedKmH: 25,
        arriveAtMode: false,
        departureTime: '06:30',
        departureDate: '2026-12-15',
        logistics: { plannedLongStopMin: 15, plannedLongStopLabel: 'Quick stretch' },
      }
    );
    const shortStep = preDawnWithShortStop.steps.find((s) => s.id === 'planned-long-stop');
    assert.ok(shortStep);
    assert.equal(shortStep.formattedDuration, '5 min');
  });

  it('applies cap to getChipsExtraBufferMinutes and getPlannedRestStopMinutes while preserving non-rest buffers', () => {
    const trip = makeTrip({
      departureDate: '2026-12-15',
      departureTime: '06:30',
      customChips: ['coffee-stop', 'picnic-outing', 'night-ride'],
      ruleSettings: {
        plannedLongStopMin: 30,
        nightCautionBufferMin: 10,
      },
    });
    // coffee-stop capped to 5, picnic-outing disabled (0), plannedLongStopMin 30 disabled (0)
    assert.equal(getPlannedRestStopMinutes(trip), 5);
    // extra buffer = 5 (coffee) + 10 (night-ride caution buffer) = 15
    assert.equal(getChipsExtraBufferMinutes(trip), 15);
  });
});
