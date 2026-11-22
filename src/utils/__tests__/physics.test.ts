import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePhysics,
  calculateSectionalEnergyBreakdown,
  classifyRoadSurfaceCondition,
  formatCautionPaceSummary,
  getPowerZone,
} from '../physics';
import { computeSurfaceBreakdown } from '../surfaceProfile';
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

  it('detects damp roads from cold high-humidity dew and wet roads from recent rain', () => {
    assert.equal(classifyRoadSurfaceCondition(calmWeather), 'dry');
    assert.equal(
      classifyRoadSurfaceCondition({
        ...calmWeather,
        temperatureC: 9,
        relativeHumidity: 98,
        precipitationRiskPercent: 0,
      }),
      'damp'
    );
    assert.equal(
      classifyRoadSurfaceCondition({
        ...calmWeather,
        recentPrecipitationMm: 1.8,
        precipitationRiskPercent: 5,
      }),
      'wet'
    );
  });

  it('penalizes cold butyl tubes more than cold tubeless and increases Crr on damp/wet roads', () => {
    const warmDry = calculatePhysics(basePhysics, baseRoute, calmWeather, 'en', 240, {
      isTubeless: false,
    });
    const coldTubeless = calculatePhysics(
      basePhysics,
      baseRoute,
      { ...calmWeather, temperatureC: 6 },
      'en',
      240,
      { isTubeless: true }
    );
    const coldButyl = calculatePhysics(
      basePhysics,
      baseRoute,
      { ...calmWeather, temperatureC: 6 },
      'en',
      240,
      { isTubeless: false }
    );
    const coldButylDamp = calculatePhysics(
      basePhysics,
      baseRoute,
      { ...calmWeather, temperatureC: 6, relativeHumidity: 96 },
      'en',
      240,
      { isTubeless: false }
    );

    assert.equal(warmDry.effectiveCrr, basePhysics.crr);
    assert.ok(coldTubeless.effectiveCrr > warmDry.effectiveCrr);
    assert.ok(coldButyl.effectiveCrr > coldTubeless.effectiveCrr);
    assert.ok(coldButylDamp.effectiveCrr > coldButyl.effectiveCrr);
    assert.equal(coldButylDamp.roadCondition, 'damp');
  });

  it('wires OSM weightedCrr only when osm-overpass backed and ignores heuristic fallback', () => {
    const urbanPhysics: PhysicsParams = { ...basePhysics, crr: 0.0068 };

    const heuristicIgnored = calculatePhysics(urbanPhysics, baseRoute, calmWeather, 'en', 210, {
      isTubeless: false,
      osmWeightedCrr: 0.0095,
      surfaceDataSource: 'heuristic-fallback',
    });
    assert.equal(heuristicIgnored.effectiveCrr, 0.0068);
    assert.equal(heuristicIgnored.surfaceCrrSource, 'bike-baseline');

    const osmPaved = calculatePhysics(urbanPhysics, baseRoute, calmWeather, 'en', 210, {
      isTubeless: false,
      osmWeightedCrr: 0.0045,
      surfaceDataSource: 'osm-overpass',
    });
    assert.equal(osmPaved.effectiveCrr, 0.0068);

    const osmGravel = calculatePhysics(urbanPhysics, baseRoute, calmWeather, 'en', 210, {
      isTubeless: false,
      osmWeightedCrr: 0.0075,
      surfaceDataSource: 'osm-overpass',
    });
    assert.ok(osmGravel.effectiveCrr > urbanPhysics.crr);
    assert.equal(osmGravel.surfaceCrrSource, 'osm-surface');
    assert.ok(osmGravel.rollingResistanceWatts > osmPaved.rollingResistanceWatts);
  });

  it('automatically factors dark and damp caution pace into moving time for pre-dawn winter rides', () => {
    const urbanNovPhysics: PhysicsParams = {
      ...basePhysics,
      riderWeightKg: 68,
      bikeWeightKg: 12.8,
      gearWeightKg: 1.5,
      cda: 0.44,
      crr: 0.0068,
      drivetrainEfficiency: 0.95,
      grossMechanicalEfficiency: 0.21,
    };
    const sportRoute: RouteParams = {
      ...baseRoute,
      distanceKm: 50,
      targetSpeedKmH: 25,
      pacingMode: 'speed',
    };
    const preDawnDamp: WeatherCondition = {
      ...calmWeather,
      temperatureC: 9,
      relativeHumidity: 98,
      precipitationRiskPercent: 5,
    };

    const result = calculatePhysics(urbanNovPhysics, sportRoute, preDawnDamp, 'en', 210, {
      isTubeless: false,
      nightPercent: 56,
      twilightPercent: 30,
    });

    assert.equal(result.roadCondition, 'damp');
    assert.ok(result.cautionPaceFactor < 0.95);
    assert.ok(result.effectiveSpeedKmH < 24 && result.effectiveSpeedKmH > 22);
    assert.ok(result.cautionDelayMinutes >= 8);
    assert.ok(result.movingTimeSeconds > 7600 && result.movingTimeSeconds < 8200);
    assert.ok(formatCautionPaceSummary(result, 'en')?.includes('dark'));
  });

  it('defaults non-gravel routes without OSM data to 100% paved instead of fabricating 28% unpaved', () => {
    const highwayBreakdown = computeSurfaceBreakdown({
      distanceKm: 50,
      origin: 'Nantes',
      destination: 'Carquefou Highway Loop',
      targetSpeedKmH: 25,
      pacingMode: 'speed',
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
    });
    assert.equal(highwayBreakdown.pavedPct, 100);
    assert.equal(highwayBreakdown.gravelPct, 0);
    assert.equal(highwayBreakdown.singletrackPct, 0);
  });

  it('prevents division-by-zero and NaN caloric math when route distance is 0 km or invalid', () => {
    const zeroRoute: RouteParams = { ...baseRoute, distanceKm: 0 };
    const zeroResult = calculatePhysics(basePhysics, zeroRoute, calmWeather, 'en', 240);

    assert.equal(zeroResult.movingTimeSeconds, 0);
    assert.equal(zeroResult.totalWorkKj, 0);
    assert.equal(zeroResult.totalKcalBurn, 0);
    assert.equal(zeroResult.carbOxidationGramPerHour, 0);
    assert.equal(zeroResult.totalCarbsBurnedGrams, 0);
    assert.ok(Number.isFinite(zeroResult.legWatts));
    assert.ok(Number.isFinite(zeroResult.effectiveSpeedKmH));

    const sectional = calculateSectionalEnergyBreakdown(
      basePhysics,
      zeroRoute,
      calmWeather,
      zeroResult,
      'en'
    );
    for (const band of sectional.bands) {
      assert.equal(band.kcalShare, 0);
      assert.equal(band.distanceKm, 0);
      assert.ok(Number.isFinite(band.avgWatts));
    }

    const corruptPhysics: PhysicsParams = {
      ...basePhysics,
      grossMechanicalEfficiency: 0,
      drivetrainEfficiency: 0,
      cda: 0,
    };
    const corruptResult = calculatePhysics(
      corruptPhysics,
      { ...baseRoute, distanceKm: Number.NaN },
      calmWeather,
      'en',
      240
    );
    assert.equal(corruptResult.totalKcalBurn, 0);
    assert.ok(!Number.isNaN(corruptResult.totalKcalBurn));
    assert.ok(!Number.isNaN(corruptResult.legWatts));
  });
});
