import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateIntensityModulatedCarbTarget,
  calculateHydrationPlan,
  resolveEffectiveFuelSplit,
} from '../nutrition';

describe('nutrition.ts', () => {
  it('returns short-hydration-only with zero carbs for single-day rides under 45 minutes', () => {
    const result = calculateIntensityModulatedCarbTarget({
      rideHours: 0.5,
      pctFtp: 75,
      carbOxidationGramPerHour: 120,
      gutCeilingGPerHr: 90,
      totalDays: 1,
    });

    assert.equal(result.pacingTier, 'short-hydration-only');
    assert.equal(result.recommendedGPerHr, 0);
    assert.equal(result.targetOnBikeCarbsG, 0);
  });

  it('keeps carbs active on short segments when totalDays > 1', () => {
    const result = calculateIntensityModulatedCarbTarget({
      rideHours: 0.5,
      pctFtp: 75,
      carbOxidationGramPerHour: 120,
      gutCeilingGPerHr: 90,
      totalDays: 2,
    });

    assert.notEqual(result.pacingTier, 'short-hydration-only');
    assert.ok(result.recommendedGPerHr >= 25);
  });

  it('scales carb target with intensity and active intensity chips', () => {
    const easy = calculateIntensityModulatedCarbTarget({
      rideHours: 3,
      pctFtp: 60,
      carbOxidationGramPerHour: 110,
      gutCeilingGPerHr: 90,
    });
    const hard = calculateIntensityModulatedCarbTarget({
      rideHours: 3,
      pctFtp: 92,
      carbOxidationGramPerHour: 150,
      gutCeilingGPerHr: 90,
      activeChips: ['climbing-kom-hunt'],
    });

    assert.ok(hard.exoShare > easy.exoShare);
    assert.ok(hard.recommendedGPerHr > easy.recommendedGPerHr);
    assert.ok(hard.recommendedGPerHr <= 90);
  });

  it('triggers emergency-surge and expands ceiling for over-threshold effort (>105% FTP)', () => {
    const surge = calculateIntensityModulatedCarbTarget({
      rideHours: 2,
      pctFtp: 110,
      carbOxidationGramPerHour: 220,
      gutCeilingGPerHr: 80,
    });

    assert.equal(surge.pacingTier, 'emergency-surge');
    assert.equal(surge.effectiveCeilingGPerHr, 100);
    assert.ok(surge.recommendedGPerHr <= 100);
  });

  it('solves short-ride hydration baseline (<45m)', () => {
    const plan = calculateHydrationPlan({
      rideHours: 0.5,
      tempC: 20,
      legWatts: 180,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });

    assert.equal(plan.totalFluidNeedMl, 450);
    assert.equal(plan.totalBidonsNeeded, 1);
    assert.equal(plan.carriedOnFrameBidons, 1);
    assert.equal(plan.plannedRefillBidons, 0);
    assert.equal(plan.sodiumMgPerL, 0);
  });

  it('splits bidons between frame slots and planned refills and elevates sodium in heat', () => {
    const hotPlan = calculateHydrationPlan({
      rideHours: 4,
      tempC: 28,
      legWatts: 200,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });

    assert.ok(hotPlan.sweatRateMlPerHr >= 850 && hotPlan.sweatRateMlPerHr <= 1400);
    assert.equal(hotPlan.targetFluidMlPerHr, Math.round(hotPlan.sweatRateMlPerHr * 0.8));
    assert.equal(hotPlan.sodiumMgPerL, 750);
    assert.equal(hotPlan.carriedOnFrameBidons, 2);
    assert.ok(hotPlan.totalBidonsNeeded > 2);
    assert.equal(
      hotPlan.plannedRefillBidons,
      hotPlan.totalBidonsNeeded - hotPlan.carriedOnFrameBidons
    );

    const coolPlan = calculateHydrationPlan({
      rideHours: 1.5,
      tempC: 12,
      legWatts: 120,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });
    assert.equal(coolPlan.sodiumMgPerL, 500);
  });

  it('strips savory palate resets on Single Day rides and enables them only for Multi-Day Tours', () => {
    const singleDay = resolveEffectiveFuelSplit({
      rideHours: 4,
      pctFtp: 72,
      tempC: 20,
      enableSavoryPalateResets: true,
      isMultiDayTour: false,
    });
    assert.equal(singleDay.savoryResetCount, 0);

    const multiDay = resolveEffectiveFuelSplit({
      rideHours: 4,
      pctFtp: 72,
      tempC: 20,
      enableSavoryPalateResets: true,
      isMultiDayTour: true,
    });
    assert.equal(multiDay.savoryResetCount, 2);
  });
});
