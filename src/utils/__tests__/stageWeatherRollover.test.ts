import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addNextStage } from '../stageManager';
import { addMinutesHHMM } from '../../services/routeWeatherService';
import type { TripProfile } from '../../types/trip';

function makeMultiDaySeedTrip(): TripProfile {
  return {
    id: 'tour-seed',
    name: 'Loire Tour',
    tag: 'BIKEPACKING',
    description: 'Multi-day test',
    departureDate: '2026-06-15',
    departureTime: '08:30',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    physics: {
      riderWeightKg: 72,
      bikeWeightKg: 11,
      gearWeightKg: 6,
      cda: 0.38,
      crr: 0.005,
      rho: 1.225,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.5,
    },
    route: {
      origin: 'Nantes',
      destination: 'Angers',
      originCoords: [47.2184, -1.5536],
      destCoords: [47.4784, -0.5632],
      distanceKm: 92,
      elevationGainM: 420,
      targetSpeedKmH: 22,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: [
        [47.2184, -1.5536],
        [47.4784, -0.5632],
      ],
    },
    office: {
      shiftStartTime: '17:30',
      targetGateArrivalTime: '17:30',
      gateName: 'Angers',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      source: 'live',
      effectiveHeadwindKmH: 18,
      isHeadwindActive: true,
      baseWindSpeedKmH: 24,
      windDirection: 'headwind',
      windDirectionDegrees: 95,
      temperatureC: 19,
      precipitationRiskPercent: 85,
      estuaryGustKmH: 38,
      visibilityKm: 6,
      weatherCode: 63,
      targetTimestampFormatted: '2026-06-15T10:00',
    },
    checklist: [],
  };
}

describe('stageManager.ts & routeWeatherService.ts continuity', () => {
  it('resets stale live weather instead of cloning Day 1 forecast onto Day 2', () => {
    const day1 = makeMultiDaySeedTrip();
    const withDay2 = addNextStage(day1);

    assert.equal(withDay2.stages?.length, 2);
    const stage2 = withDay2.stages![1];
    assert.equal(stage2.dayNumber, 2);
    assert.equal(stage2.departureDate, '2026-06-16');
    assert.equal(stage2.route.origin, 'Angers');
    assert.equal(stage2.route.destination, '');

    // Must not carry over Day 1 live storm/gust/timestamp telemetry
    assert.equal(stage2.weather.source, 'simulated');
    assert.equal(stage2.weather.targetTimestampFormatted, undefined);
    assert.equal(stage2.weather.weatherCode, undefined);
    assert.notEqual(stage2.weather.precipitationRiskPercent, 85);
    assert.notEqual(stage2.weather.baseWindSpeedKmH, 24);
  });

  it('tracks midnight rollover dayOffset accurately in addMinutesHHMM', () => {
    const sameDay = addMinutesHHMM('21:30', 90);
    assert.equal(sameDay.hhmm, '23:00');
    assert.equal(sameDay.hour, 23);
    assert.equal(sameDay.dayOffset, 0);

    const nextDay = addMinutesHHMM('22:15', 150); // +2h30 -> 00:45 next day
    assert.equal(nextDay.hhmm, '00:45');
    assert.equal(nextDay.hour, 0);
    assert.equal(nextDay.dayOffset, 1);

    const multiDay = addMinutesHHMM('23:00', 1500); // +25h -> 00:00 +2 days
    assert.equal(multiDay.hhmm, '00:00');
    assert.equal(multiDay.hour, 0);
    assert.equal(multiDay.dayOffset, 2);
  });
});
