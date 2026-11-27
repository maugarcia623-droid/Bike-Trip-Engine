import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStageOfflineKeyAliases,
  resolveActiveStageForPack,
  resolveActiveStageIndexForPack,
  resolveStageWeatherRolloutTime,
} from '../../services/offlinePackService';
import { getRouteHashKey } from '../../services/overpassCorridor';
import { getOsmSurfaceRouteKey } from '../../services/osmSurfaceService';
import { buildSectorCacheKey } from '../../services/routeWeatherService';
import { calculatePhysics } from '../physics';
import { calculateReverseTimeline } from '../timeline';
import { getChipsExtraBufferMinutes } from '../archetypeChips';
import { switchActiveStage } from '../stageManager';
import type { TripProfile, TripStage } from '../../types/trip';

function makePolyline(pointCount: number, latStart = 47.2, lonStart = -1.5): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i < pointCount; i++) {
    const t = i / Math.max(1, pointCount - 1);
    // Non-linear bend so fractional indices at 0.25/0.5 between 600, 450, 250 pts differ > 0.001 deg
    const lat = latStart + t * 0.4 + Math.sin(t * Math.PI * 5) * 0.03;
    const lon = lonStart + t * 0.6 + Math.cos(t * Math.PI * 3) * 0.02;
    coords.push([lat, lon]);
  }
  return coords;
}

function makeStage(id: string, dayNumber: number, departureDate: string, departureTime: string, coords: [number, number][]): TripStage {
  return {
    id,
    dayNumber,
    departureDate,
    departureTime,
    targetMode: 'arrive',
    route: {
      origin: `Town ${dayNumber}`,
      destination: `Town ${dayNumber + 1}`,
      originCoords: coords[0],
      destCoords: coords[coords.length - 1],
      distanceKm: 90,
      elevationGainM: 600,
      targetSpeedKmH: 24,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: coords,
    },
    office: {
      shiftStartTime: '17:30',
      targetGateArrivalTime: '17:30',
      gateName: `Gate ${dayNumber}`,
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 10,
      windDirection: 'calm',
      windDirectionDegrees: 180,
      temperatureC: 18,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 12,
      visibilityKm: 20,
    },
    customChips: [],
  };
}

function makeMultiStageTrip(stages?: TripStage[], activeStageIndex?: number): TripProfile {
  const coords = stages?.[0]?.route.coordinates ?? makePolyline(600);
  return {
    id: 'trip-root-id',
    name: 'Loire Multi-Stage',
    tag: 'BIKEPACKING',
    description: 'Offline key parity test',
    departureDate: '2026-07-01',
    departureTime: '08:00',
    arriveAtMode: true,
    activeStageIndex,
    stages,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    physics: {
      riderWeightKg: 72,
      bikeWeightKg: 10,
      gearWeightKg: 4,
      cda: 0.35,
      crr: 0.005,
      rho: 1.225,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0.4,
    },
    route: {
      origin: 'Nantes',
      destination: 'Angers',
      originCoords: coords[0],
      destCoords: coords[coords.length - 1],
      distanceKm: 90,
      elevationGainM: 600,
      targetSpeedKmH: 24,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: coords,
    },
    office: {
      shiftStartTime: '17:30',
      targetGateArrivalTime: '17:30',
      gateName: 'Finish',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 10,
      windDirection: 'calm',
      windDirectionDegrees: 180,
      temperatureC: 18,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 12,
      visibilityKm: 20,
    },
    checklist: [],
  };
}

describe('offlinePackService.ts multi-stage cache key alignment', () => {
  it('resolves clamped activeStageIndex ?? 0 matching BentoDashboard & PrintFlightSheet', () => {
    const s1 = makeStage('stage-1', 1, '2026-07-01', '08:00', makePolyline(20));
    const s2 = makeStage('stage-2', 2, '2026-07-02', '08:30', makePolyline(20));

    // activeStageIndex undefined with 2 stages -> resolves stage 0, not trip.id
    const trip2 = makeMultiStageTrip([s1, s2], undefined);
    assert.equal(resolveActiveStageIndexForPack(trip2), 0);
    assert.equal(resolveActiveStageForPack(trip2)?.id, 'stage-1');

    // activeStageIndex undefined with 1 stage -> resolves stage 0
    const trip1 = makeMultiStageTrip([s1], undefined);
    assert.equal(resolveActiveStageIndexForPack(trip1), 0);
    assert.equal(resolveActiveStageForPack(trip1)?.id, 'stage-1');

    // Out-of-bounds clamping
    assert.equal(resolveActiveStageIndexForPack(makeMultiStageTrip([s1, s2], 99)), 1);
    assert.equal(resolveActiveStageForPack(makeMultiStageTrip([s1, s2], 99))?.id, 'stage-2');
    assert.equal(resolveActiveStageIndexForPack(makeMultiStageTrip([s1, s2], -4)), 0);
    assert.equal(resolveActiveStageForPack(makeMultiStageTrip([s1, s2], -4))?.id, 'stage-1');

    // No stages -> -1 / undefined (falls back to trip.id)
    assert.equal(resolveActiveStageIndexForPack(makeMultiStageTrip(undefined, undefined)), -1);
    assert.equal(resolveActiveStageForPack(makeMultiStageTrip([], undefined)), undefined);
  });

  it('produces both 450-pt and 250-pt downsampled aliases matching switchActiveStage', () => {
    const rawCoords600 = makePolyline(600);
    const s1 = makeStage('stage-1', 1, '2026-07-01', '08:00', rawCoords600);
    const s2 = makeStage('stage-2', 2, '2026-07-02', '08:30', makePolyline(600, 47.6, -0.8));
    const trip = makeMultiStageTrip([s1, s2], 0);

    const aliases = buildStageOfflineKeyAliases({
      coordinates: rawCoords600,
      stageId: 'stage-1',
      distanceKm: 90,
    });

    // Switch stage 0 -> stage 1 -> stage 0 (extractCurrentStage downsamples to 450 pts)
    const afterSwitchTo2 = switchActiveStage(trip, 1);
    const afterSwitchBackTo1 = switchActiveStage(afterSwitchTo2, 0);
    const switchedCoords = afterSwitchBackTo1.route.coordinates!;
    assert.equal(switchedCoords.length, 450);

    const postSwitchAmenityKey = getRouteHashKey(switchedCoords, 'stage-1', 90);
    const postSwitchSurfaceKey = getOsmSurfaceRouteKey(switchedCoords, 90);

    const allAmenityKeys = [aliases.rawAmenityKey, ...aliases.aliasAmenityKeys];
    const allSurfaceKeys = [aliases.rawSurfaceKey, ...aliases.aliasSurfaceKeys];

    assert.ok(
      allAmenityKeys.includes(postSwitchAmenityKey),
      'Expected 450-pt post-switch amenity key to match offline pack aliases'
    );
    assert.ok(
      allSurfaceKeys.includes(postSwitchSurfaceKey),
      'Expected 450-pt post-switch surface key to match offline pack aliases'
    );
    assert.ok(aliases.aliasAmenityKeys.length >= 1);
    assert.ok(aliases.aliasSurfaceKeys.length >= 1);
  });

  it('aligns sector weather cache key across offlinePackService, BentoDashboard, and AtmosphereCard (rollout + ftpWatts)', () => {
    const s1 = makeStage('stage-1', 1, '2026-07-01', '08:00', makePolyline(50));
    const s2 = makeStage('stage-2', 2, '2026-07-02', '08:30', makePolyline(50, 47.6, -0.8));
    const trip = makeMultiStageTrip([s1, s2], 1);
    trip.departureDate = s2.departureDate;
    trip.departureTime = s2.departureTime;
    trip.route = s2.route;
    trip.office = s2.office;
    const ftpWatts = 260;

    // Simulate offlinePackService rollout calculation
    const packRollout = resolveStageWeatherRolloutTime(trip, 'en', ftpWatts);
    const packKey = buildSectorCacheKey(trip, s2.departureDate, packRollout, 'en', ftpWatts);

    // Simulate BentoDashboard / AtmosphereCard timelineResult.hardDepartureTime + effectiveSpecs.ftpWatts
    const phys = calculatePhysics(trip.physics, trip.route, trip.weather, 'en', ftpWatts);
    const timeline = calculateReverseTimeline(
      trip.route,
      trip.office,
      trip.weather,
      trip.tag,
      trip.route.destination,
      'en',
      getChipsExtraBufferMinutes(trip),
      trip.customChips || [],
      {
        effectiveSpeedKmH: phys.effectiveSpeedKmH,
        calmSpeedKmH: phys.calmSpeedKmH,
        arriveAtMode: trip.arriveAtMode,
        departureTime: trip.departureTime,
        movingTimeSeconds: phys.movingTimeSeconds,
        logistics: trip.ruleSettings,
        pinnedAmenities: trip.pinnedAmenities,
        departureDate: trip.departureDate,
        isMultiDayTour: true,
      }
    );
    const dashboardKey = buildSectorCacheKey(
      trip,
      s2.departureDate,
      timeline.hardDepartureTime || trip.departureTime || '08:00',
      'en',
      ftpWatts
    );

    assert.ok(packKey);
    assert.equal(packKey, dashboardKey);

    // Omitting ftpWatts produces a mismatched :0 cache key (catching the old BentoDashboard bug)
    const missingFtpKey = buildSectorCacheKey(
      trip,
      s2.departureDate,
      timeline.hardDepartureTime || trip.departureTime || '08:00',
      'en'
    );
    assert.notEqual(packKey, missingFtpKey);
    assert.ok(packKey!.endsWith(':260'));
    assert.ok(missingFtpKey!.endsWith(':0'));
  });
});
