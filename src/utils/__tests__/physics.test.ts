import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePhysics, getPowerZone } from '../physics';
import type { PhysicsParams, RouteParams, WeatherCondition } from '../../types/trip';

const basePhysics: PhysicsParams = {
  riderWeightKg: 70,
  bikeWeightKg: 9,
  gearWeightKg: 2,
  cda: 0.32,
  crr: 0.0045,
  rho: 1.225,
  drivetrainEfficiency: 0.97,
  grossMechanicalEfficiency: 0.22,
  gradientPercent: 0,
};

const baseRoute: RouteParams = {
  distanceKm: 50,
  targetSpeedKmH: 28,
  pacingMode: 'speed',
  urbanTrafficDelayMinutes: 0,
  gateSecurityDelayMinutes: 0,
};

const calmWeather: WeatherCondition = {
  isHeadwindActive: false,
  baseWindSpeedKmH: 0,
  windDirection: 'calm',
  windDirectionDegrees: 0,
  temperatureC: 18,
  precipitationRiskPercent: 0,
  estuaryGustKmH: 0,
  visibilityKm: 20,
};

describe('physics.ts', () => {
  it('getPowerZone maps %FTP to Coggan zones Z1-Z5', () => {
    assert.equal(getPowerZone(50), 'Z1');
    assert.equal(getPowerZone(68), 'Z2');
    assert.equal(getPowerZone(85), 'Z3');
    assert.equal(getPowerZone(100), 'Z4');
    assert.equal(getPowerZone(115), 'Z5');
  });

  it('increases power and aerodynamic drag under headwind in speed pacing mode', () => {
    const calm = calculatePhysics(basePhysics, baseRoute, calmWeather, 'en', 240);
    const headwindWeather: WeatherCondition = {
      ...calmWeather,
      isHeadwindActive: true,
      baseWindSpeedKmH: 20,
      effectiveHeadwindKmH: 20,
      windDirection: 'headwind',
    };
    const headwind = calculatePhysics(basePhysics, baseRoute, headwindWeather, 'en', 240);

    assert.equal(headwind.effectiveSpeedKmH, calm.calmSpeedKmH);
    assert.ok(headwind.legWatts > calm.legWatts);
    assert.ok(headwind.aerodynamicDragWatts > calm.aerodynamicDragWatts);
    assert.ok(headwind.powerDeltaWatts > 0);
  });

  it('reduces power under tailwind', () => {
    const calm = calculatePhysics(basePhysics, baseRoute, calmWeather, 'en', 240);
    const tailwindWeather: WeatherCondition = {
      ...calmWeather,
      isHeadwindActive: false,
      baseWindSpeedKmH: 20,
      effectiveHeadwindKmH: -15,
      windDirection: 'tailwind',
    };
    const tailwind = calculatePhysics(basePhysics, baseRoute, tailwindWeather, 'en', 240);

    assert.ok(tailwind.legWatts < calm.legWatts);
    assert.ok(tailwind.aerodynamicDragWatts < calm.aerodynamicDragWatts);
  });

  it('reduces effective speed and adds wind delay under headwind in effort pacing mode', () => {
    const effortRoute: RouteParams = {
      ...baseRoute,
      pacingMode: 'effort',
      targetEffortWatts: 180,
    };
    const headwindWeather: WeatherCondition = {
      ...calmWeather,
      isHeadwindActive: true,
      baseWindSpeedKmH: 20,
      effectiveHeadwindKmH: 20,
      windDirection: 'headwind',
    };
    const result = calculatePhysics(basePhysics, effortRoute, headwindWeather, 'en', 240);

    assert.equal(result.pacingMode, 'effort');
    assert.ok(result.effectiveSpeedKmH < result.calmSpeedKmH);
    assert.ok(result.speedDeltaKmH > 0);
    assert.ok(result.windDelayMinutes >= 0);
    assert.equal(result.powerDeltaWatts, 0);
  });

  it('scales gravityWatts and legWatts with gradient', () => {
    const flat = calculatePhysics(basePhysics, baseRoute, calmWeather, 'en', 240);
    const climb = calculatePhysics(
      { ...basePhysics, gradientPercent: 5 },
      baseRoute,
      calmWeather,
      'en',
      240
    );
    const descent = calculatePhysics(
      { ...basePhysics, gradientPercent: -3 },
      baseRoute,
      calmWeather,
      'en',
      240
    );

    assert.equal(flat.gravityWatts, 0);
    assert.ok(climb.gravityWatts > 0);
    assert.ok(climb.legWatts > flat.legWatts);
    assert.ok(descent.gravityWatts < 0);
    assert.ok(descent.legWatts < flat.legWatts);
  });

  it('increases systemMassKg, rolling resistance, and climbing power with added gear weight', () => {
    const lightClimb = calculatePhysics(
      { ...basePhysics, gradientPercent: 4, gearWeightKg: 0 },
      baseRoute,
      calmWeather,
      'en',
      240
    );
    const heavyClimb = calculatePhysics(
      { ...basePhysics, gradientPercent: 4, gearWeightKg: 10 },
      baseRoute,
      calmWeather,
      'en',
      240
    );

    assert.equal(heavyClimb.systemMassKg - lightClimb.systemMassKg, 10);
    assert.ok(heavyClimb.rollingResistanceWatts > lightClimb.rollingResistanceWatts);
    assert.ok(heavyClimb.gravityWatts > lightClimb.gravityWatts);
    assert.ok(heavyClimb.legWatts > lightClimb.legWatts);
  });
});
