import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClimbAdjustedPacingCurve,
  computeClimbSplitsAndFueling,
  detectClimbs,
  formatClimbCategoryLabel,
  interpolateElapsedSecondsAtKm,
} from '../climbSplits';
import { calculatePhysics } from '../physics';
import { exportTripToGpx, exportTripToTcx } from '../gpxExporter';
import type { ElevationProfilePoint, TripProfile } from '../../types/trip';

function makeClimbingTrip(): TripProfile {
  const elevationProfile: ElevationProfilePoint[] = [
    { distKm: 0, eleM: 210, gradePct: 0 },
    { distKm: 10, eleM: 225, gradePct: 0.15 },
    { distKm: 12, eleM: 345, gradePct: 6.0 },
    { distKm: 15, eleM: 555, gradePct: 7.0 },
    { distKm: 18, eleM: 765, gradePct: 7.0 }, // +540 m over 8 km (~6.75%)
    { distKm: 28, eleM: 420, gradePct: -3.4 },
    { distKm: 35, eleM: 430, gradePct: 0.14 },
    { distKm: 39, eleM: 650, gradePct: 5.5 }, // +220 m over 4 km (5.5%)
    { distKm: 55, eleM: 310, gradePct: -2.1 },
    { distKm: 62, eleM: 320, gradePct: 0.14 },
  ];

  return {
    id: 'alpine-loop',
    name: 'Col Loop',
    tag: 'SPORT',
    description: 'Mountain pacing test',
    departureTime: '08:00',
    createdAt: '2026-11-15T00:00:00Z',
    updatedAt: '2026-11-15T00:00:00Z',
    physics: {
      riderWeightKg: 70,
      bikeWeightKg: 8.5,
      gearWeightKg: 2.5,
      cda: 0.34,
      crr: 0.0045,
      rho: 1.225,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 1.8,
    },
    route: {
      distanceKm: 62,
      elevationGainM: 820,
      targetSpeedKmH: 23,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      elevationProfile,
    },
    office: {
      shiftStartTime: '12:00',
      targetGateArrivalTime: '11:30',
      gateName: 'Col Summit Cafe',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 8,
      windDirection: 'cross-headwind',
      windDirectionDegrees: 240,
      temperatureC: 24,
      precipitationRiskPercent: 0,
      estuaryGustKmH: 12,
      visibilityKm: 20,
    },
    checklist: [],
  };
}

describe('climbSplits.ts', () => {
  it('detects significant climbs with accurate distance, gain, and grade metrics', () => {
    const trip = makeClimbingTrip();
    const climbs = detectClimbs(trip.route.elevationProfile);

    assert.equal(climbs.length, 2);
    assert.ok(climbs[0].startKm >= 9.5 && climbs[0].startKm <= 10.5);
    assert.ok(climbs[0].endKm >= 17.5 && climbs[0].endKm <= 18.5);
    assert.ok(climbs[0].elevationGainM >= 500);
    assert.ok(climbs[0].avgGradePct >= 6.0);
    assert.ok(climbs[0].maxGradePct >= 6.5);

    assert.ok(climbs[1].elevationGainM >= 200);
    assert.ok(climbs[1].avgGradePct >= 5.0);
  });

  it('computes per-climb target watts, W/kg, VAM, duration, and fueling checkpoints', () => {
    const trip = makeClimbingTrip();
    const physics = calculatePhysics(trip.physics, trip.route, trip.weather, 'en', 260);
    const summary = computeClimbSplitsAndFueling(trip, physics, 'en', {
      ftpWatts: 260,
      carbTargetGPerHr: 60,
      nutritionPreference: 'sports-fuel',
      departureTimeHHMM: '08:00',
      checkpointIntervalMinutes: 35,
    });

    assert.equal(summary.isSynthesizedProfile, false);
    assert.equal(summary.climbs.length, 2);

    const first = summary.climbs[0];
    assert.ok(first.targetWatts > physics.legWatts);
    assert.ok(first.wattsPerKg > 2.2);
    assert.ok(first.durationMinutes > 10);
    assert.ok(first.vamMetersPerHour > 400);
    assert.match(first.fuelingCue, /\S+/);
    assert.ok(first.etaStartHHMM);

    assert.ok(summary.checkpoints.length >= 3);
    assert.ok(summary.recommendedCarbsGPerHr >= 30);
    assert.ok(summary.targetFluidMlPerHr >= 350);
    assert.ok(summary.checkpoints.every((cp) => cp.shortFitCue.length > 0 && cp.shortFitCue.length <= 15));
  });

  it('returns 0 climbs on flat rides while still emitting periodic nutrition checkpoints', () => {
    const flatTrip = makeClimbingTrip();
    flatTrip.route.elevationProfile = [
      { distKm: 0, eleM: 25, gradePct: 0 },
      { distKm: 25, eleM: 28, gradePct: 0.01 },
      { distKm: 50, eleM: 26, gradePct: 0 },
    ];
    flatTrip.route.elevationGainM = 20;
    flatTrip.route.distanceKm = 50;

    const physics = calculatePhysics(flatTrip.physics, flatTrip.route, flatTrip.weather, 'fr', 230);
    const summary = computeClimbSplitsAndFueling(flatTrip, physics, 'fr', {
      ftpWatts: 230,
      checkpointIntervalMinutes: 35,
    });

    assert.equal(summary.climbs.length, 0);
    assert.ok(summary.checkpoints.length >= 2);
    assert.match(formatClimbCategoryLabel('HC', 'fr'), /Hors|HC/i);
    assert.match(formatClimbCategoryLabel('2', 'en'), /Cat 2/i);
  });

  it('computeClimbSplitsAndFueling keeps climb W/kg consistent with calculatePhysics overridden weight', () => {
    const heavyTrip = makeClimbingTrip();
    heavyTrip.physics.riderWeightKg = 85;
    const physics = calculatePhysics(heavyTrip.physics, heavyTrip.route, heavyTrip.weather, 'en', 250);
    const summary = computeClimbSplitsAndFueling(heavyTrip, physics, 'en', {
      ftpWatts: 250,
    });

    assert.ok(summary.climbs.length >= 1);
    const firstClimb = summary.climbs[0];
    const expectedWattsPerKg = Number((firstClimb.targetWatts / 85).toFixed(2));
    assert.ok(Math.abs(firstClimb.wattsPerKg - expectedWattsPerKg) <= 0.05);
  });

  it('buildClimbAdjustedPacingCurve slows ETA non-linearly on steep climbs vs flat segments', () => {
    const profile = [
      { distKm: 0, eleM: 100, gradePct: 0 },
      { distKm: 10, eleM: 100, gradePct: 0 }, // 10 km flat
      { distKm: 20, eleM: 1000, gradePct: 9.0 }, // 10 km @ 9% climb
    ];
    const curve = buildClimbAdjustedPacingCurve(profile, 20, 28, 78);
    const flat10Sec = interpolateElapsedSecondsAtKm(curve, 10);
    const end20Sec = interpolateElapsedSecondsAtKm(curve, 20);
    const climb10Sec = end20Sec - flat10Sec;

    assert.ok(climb10Sec > flat10Sec * 1.8, `Expected climb 10km (${climb10Sec}s) >> flat 10km (${flat10Sec}s)`);
  });

  it('includes climb-by-climb splits and fueling checkpoints in GPX and TCX exports', () => {
    const trip = makeClimbingTrip();
    const gpx = exportTripToGpx(trip);
    const tcx = exportTripToTcx(trip);

    assert.match(gpx, /<wpt /);
    assert.match(gpx, /<sym>Summit<\/sym>/);
    assert.match(gpx, /<sym>(Food|Drinking Water)<\/sym>/);
    assert.match(gpx, /% FTP/);

    assert.match(tcx, /<CoursePoint>/);
    assert.match(tcx, /<PointType>(Hors Category|1st Category|2nd Category|3rd Category|4th Category)<\/PointType>/);
    assert.match(tcx, /<PointType>(Food|Water)<\/PointType>/);
    assert.match(tcx, /% FTP/);
  });

  it('propagates carbPacingMode locked and 25 g/h floor into climb splits and fueling checkpoints', () => {
    const trip = makeClimbingTrip();
    trip.route.targetSpeedKmH = 18;
    const physics = calculatePhysics(trip.physics, trip.route, trip.weather, 'en', 300);

    const autoSummary = computeClimbSplitsAndFueling(trip, physics, 'en', {
      ftpWatts: 300,
      carbTargetGPerHr: 80,
      carbPacingMode: 'auto',
      riderLevel: 'regular',
      checkpointIntervalMinutes: 35,
    });
    const lockedSummary = computeClimbSplitsAndFueling(trip, physics, 'en', {
      ftpWatts: 300,
      carbTargetGPerHr: 80,
      carbPacingMode: 'locked',
      riderLevel: 'regular',
      checkpointIntervalMinutes: 35,
    });

    assert.equal(lockedSummary.recommendedCarbsGPerHr, 80);
    assert.ok(
      autoSummary.recommendedCarbsGPerHr < 80,
      `Expected auto mode at low intensity to modulate below 80, got ${autoSummary.recommendedCarbsGPerHr}`
    );

    const lockedFuelCp = lockedSummary.checkpoints.find((cp) => cp.kind === 'fuel-and-hydration');
    const autoFuelCp = autoSummary.checkpoints.find((cp) => cp.kind === 'fuel-and-hydration');
    assert.ok(lockedFuelCp && autoFuelCp);
    assert.ok(lockedFuelCp.carbsGrams > autoFuelCp.carbsGrams);
    assert.notEqual(lockedFuelCp.shortFitCue, autoFuelCp.shortFitCue);

    // 25 g/h locked floor matches nutrition.ts
    const floorSummary = computeClimbSplitsAndFueling(trip, physics, 'en', {
      ftpWatts: 300,
      carbTargetGPerHr: 25,
      carbPacingMode: 'locked',
      riderLevel: 'regular',
    });
    assert.equal(floorSummary.recommendedCarbsGPerHr, 25);
  });

  it('prevents riderLevel pro from auto-locking when carbPacingMode is auto', () => {
    const trip = makeClimbingTrip();
    trip.route.targetSpeedKmH = 18;
    const physics = calculatePhysics(trip.physics, trip.route, trip.weather, 'en', 300);

    const proAutoSummary = computeClimbSplitsAndFueling(trip, physics, 'en', {
      ftpWatts: 300,
      carbTargetGPerHr: 90,
      carbPacingMode: 'auto',
      riderLevel: 'pro',
    });
    assert.ok(
      proAutoSummary.recommendedCarbsGPerHr < 90,
      `Expected pro+auto to modulate below 90 g/h, got ${proAutoSummary.recommendedCarbsGPerHr}`
    );
  });
});
