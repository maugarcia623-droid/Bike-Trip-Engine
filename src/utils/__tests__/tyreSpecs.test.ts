import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateCrrFromTire,
  resolveBikeTireWidthMm,
} from '../../types/specs';
import { normalizeRiderBikeSpecs } from '../specsStorage';
import { calculateTyrePressure } from '../tyrePressure';

describe('tire specs helpers & pressure model', () => {
  it('estimates sensible Crr values from tire width, tubeless, and casing', () => {
    const roadTubelessSupple = estimateCrrFromTire(28, true, 'supple');
    const gravelTubelessStd = estimateCrrFromTire(38, true, 'standard');
    const gravelTubeReinforced = estimateCrrFromTire(38, false, 'reinforced');

    assert.equal(roadTubelessSupple, 0.0037);
    assert.equal(gravelTubelessStd, 0.0053);
    assert.ok(gravelTubeReinforced > gravelTubelessStd);
  });

  it('resolves tire width in priority order: explicit -> category -> crr -> 38 mm', () => {
    assert.equal(resolveBikeTireWidthMm({ tireWidthMm: 44, bikeCategory: 'road', crr: 0.004 }), 44);
    assert.equal(resolveBikeTireWidthMm({ bikeCategory: 'mtb', crr: 0.004 }), 54);
    assert.equal(resolveBikeTireWidthMm({ crr: 0.004 }), 28);
    assert.equal(resolveBikeTireWidthMm({ crr: 0.007 }), 42);
    assert.equal(resolveBikeTireWidthMm({}), 38);
  });

  it('normalizes legacy or newly added bikes lacking tireWidthMm', () => {
    const normalized = normalizeRiderBikeSpecs({
      bikes: [
        {
          id: 'custom-1',
          name: 'My Commuter',
          weightKg: 12,
          crr: 0.0068,
          cda: 0.42,
          isTubeless: false,
        },
      ],
    });
    assert.equal(normalized.bikes[0].tireWidthMm, 42);
    assert.equal(normalized.bikes[0].isHookless, false);
  });

  it('caps hookless setups at 5.0 bar and lowers pressure on gravel vs paved', () => {
    const hooklessRoad = calculateTyrePressure({
      systemMassKg: 95,
      tireWidthMm: 28,
      isTubeless: true,
      pavedPct: 100,
      gravelPct: 0,
      singletrackPct: 0,
      bikeCategory: 'road',
      isHookless: true,
    });
    assert.equal(hooklessRoad.hooklessCapped, true);
    assert.ok(hooklessRoad.frontBar <= 5.0);
    assert.ok(hooklessRoad.rearBar <= 5.0);

    const pavedGravel = calculateTyrePressure({
      systemMassKg: 80,
      tireWidthMm: 38,
      isTubeless: true,
      pavedPct: 100,
      gravelPct: 0,
      singletrackPct: 0,
      bikeCategory: 'gravel',
    });
    const mostlyGravel = calculateTyrePressure({
      systemMassKg: 80,
      tireWidthMm: 38,
      isTubeless: true,
      pavedPct: 20,
      gravelPct: 80,
      singletrackPct: 0,
      bikeCategory: 'gravel',
    });
    assert.ok(mostlyGravel.rearBar < pavedGravel.rearBar);
  });
});
