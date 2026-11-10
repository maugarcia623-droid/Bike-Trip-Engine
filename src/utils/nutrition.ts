import { NutritionPhase, NutritionItem, LogisticsSettings } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';
import { loadRiderBikeSpecs } from './specsStorage';
import {
  PantryItem,
  ResolvedCompliantPantry,
  resolveCompliantPantry,
  DEFAULT_PANTRY_CATALOG,
  isItemCompliant,
} from '../data/pantryCatalog';
import { SolvedTripTimeline, solveTripTimeline } from './timeline';

/**
 * Canonical per-unit nutritional constants for discrete bottom-up fueling allocation.
 */
export const JUICE_BIDON_650ML = { carbsG: 36, kcal: 145 } as const;
export const MEDJOOL_DATE = { carbsG: 17, kcal: 68 } as const;
export const FRUIT_CHEW_PIECE = { carbsG: 12, kcal: 48 } as const;
export const ENERGY_GEL_UNIT = { carbsG: 25, kcal: 100 } as const;
export const ISOTONIC_SCOOP_BIDON = { carbsG: 36, kcal: 144 } as const;

export type PacingTier =
  | 'short-hydration-only'
  | 'light-cruising'
  | 'steady-endurance'
  | 'high-output'
  | 'emergency-surge';

export interface IntensityModulatedCarbTargetParams {
  rideHours: number;
  pctFtp: number;
  carbOxidationGramPerHour: number;
  gutCeilingGPerHr: number;
  totalDays?: number;
  activeChips?: string[];
}

export interface IntensityModulatedCarbTargetResult {
  recommendedGPerHr: number;
  effectiveCeilingGPerHr: number;
  targetOnBikeCarbsG: number;
  pacingTier: PacingTier;
  effectiveHourlyRateG: number;
  durationFactor: number;
  exoShare: number;
  rawDemandGPerHr: number;
}

export type DynamicCarbTargetResult = IntensityModulatedCarbTargetResult;

/**
 * Calculates unified intensity-modulated carbohydrate targeting (EQ-13).
 * Scales recommended hourly intake dynamically based on relative intensity (%FTP),
 * ride duration (rideHours), gut absorption ceiling, and active intensity chips.
 */
export function calculateIntensityModulatedCarbTarget(
  params: IntensityModulatedCarbTargetParams
): IntensityModulatedCarbTargetResult {
  const {
    rideHours,
    pctFtp,
    carbOxidationGramPerHour,
    gutCeilingGPerHr,
    totalDays = 1,
    activeChips = [],
  } = params;

  const gutCeiling = Math.max(25, Math.min(120, gutCeilingGPerHr));

  // 1. Short-Ride Endogenous Cutoff: Under 45m on a single-day ride requires no on-bike carbs
  if (rideHours < 0.75 && totalDays === 1) {
    return {
      recommendedGPerHr: 0,
      effectiveCeilingGPerHr: gutCeiling,
      targetOnBikeCarbsG: 0,
      pacingTier: 'short-hydration-only',
      effectiveHourlyRateG: 0,
      durationFactor: 0.55,
      exoShare: 0.35,
      rawDemandGPerHr: 0,
    };
  }

  // 2. Duration Depletion Factor (durationFactor)
  const durationFactor = Math.min(1.0, Math.max(0.55, 0.45 + 0.18 * rideHours));

  // 3. Intensity Oxidation Share (exoShare)
  let exoShare = Math.min(0.75, Math.max(0.35, 0.25 + (pctFtp / 100) * 0.45));
  if (activeChips.includes('fitness-boost') || activeChips.includes('climbing-kom-hunt')) {
    exoShare = Math.min(0.80, exoShare + 0.08);
  }

  // 4. Ceiling Clamp & Gale Over-Threshold Surge
  const effectiveCeilingGPerHr = pctFtp > 105 ? Math.min(120, gutCeiling + 20) : gutCeiling;
  const rawDemandGPerHr = Math.round(carbOxidationGramPerHour * exoShare * durationFactor);
  const recommendedGPerHr = Math.min(effectiveCeilingGPerHr, Math.max(25, rawDemandGPerHr));
  const targetOnBikeCarbsG = Math.max(25, Math.round(recommendedGPerHr * rideHours));

  let pacingTier: PacingTier;
  if (pctFtp > 105) {
    pacingTier = 'emergency-surge';
  } else if (recommendedGPerHr >= 75 || exoShare >= 0.70) {
    pacingTier = 'high-output';
  } else if (recommendedGPerHr >= 45) {
    pacingTier = 'steady-endurance';
  } else {
    pacingTier = 'light-cruising';
  }

  return {
    recommendedGPerHr,
    effectiveCeilingGPerHr,
    targetOnBikeCarbsG,
    pacingTier,
    effectiveHourlyRateG: recommendedGPerHr,
    durationFactor,
    exoShare,
    rawDemandGPerHr,
  };
}

/**
 * Backward-compatible wrapper delegating to calculateIntensityModulatedCarbTarget.
 */
export function calculateDynamicCarbTarget(
  rideHours: number,
  pctFtp: number,
  carbOxidationGramPerHour: number,
  gutCeilingGPerHr: number,
  totalDays: number = 1,
  activeChips: string[] = []
): IntensityModulatedCarbTargetResult {
  return calculateIntensityModulatedCarbTarget({
    rideHours,
    pctFtp,
    carbOxidationGramPerHour,
    gutCeilingGPerHr,
    totalDays,
    activeChips,
  });
}

export interface BottomUpPortionCounts {
  juiceBidons: number;
  datesCount: number;
  chewsCount: number;
  gelsCount: number;
  isoBidons: number;
  totalCarbsG: number;
  totalKcal: number;
}

/**
 * Calculates discrete integer portion allocations for on-bike fueling (EQ-14 to EQ-20).
 */
export function getBottomUpPortionCounts(
  targetOnBikeCarbsG: number,
  preference: 'real-food' | 'mixed' | 'sports-fuel',
  rideHours: number = 1.5
): BottomUpPortionCounts {
  if (targetOnBikeCarbsG <= 0) {
    return {
      juiceBidons: 0,
      datesCount: 0,
      chewsCount: 0,
      gelsCount: 0,
      isoBidons: 0,
      totalCarbsG: 0,
      totalKcal: 0,
    };
  }

  if (preference === 'sports-fuel') {
    const isoBidons = Math.max(1, Math.round((targetOnBikeCarbsG * 0.55) / ISOTONIC_SCOOP_BIDON.carbsG));
    const remainingGelCarbs = Math.max(0, targetOnBikeCarbsG - isoBidons * ISOTONIC_SCOOP_BIDON.carbsG);
    const gelsCount = Math.max(1, Math.round(remainingGelCarbs / ENERGY_GEL_UNIT.carbsG));
    const totalCarbsG = isoBidons * ISOTONIC_SCOOP_BIDON.carbsG + gelsCount * ENERGY_GEL_UNIT.carbsG;
    const totalKcal = isoBidons * ISOTONIC_SCOOP_BIDON.kcal + gelsCount * ENERGY_GEL_UNIT.kcal;
    return {
      juiceBidons: 0,
      datesCount: 0,
      chewsCount: 0,
      gelsCount,
      isoBidons,
      totalCarbsG,
      totalKcal,
    };
  }

  const juiceBidons = Math.max(1, Math.round((targetOnBikeCarbsG * 0.32) / JUICE_BIDON_650ML.carbsG));
  const remainingSolidCarbs = Math.max(0, targetOnBikeCarbsG - juiceBidons * JUICE_BIDON_650ML.carbsG);
  const datesCount = Math.max(0, Math.round((remainingSolidCarbs * 0.45) / MEDJOOL_DATE.carbsG));
  const remainingSolidAfterDates = Math.max(0, remainingSolidCarbs - datesCount * MEDJOOL_DATE.carbsG);

  if (preference === 'mixed') {
    let gelsCount = Math.round(remainingSolidAfterDates / ENERGY_GEL_UNIT.carbsG);
    if (targetOnBikeCarbsG >= 60) {
      gelsCount = Math.max(1, gelsCount);
    } else {
      gelsCount = Math.max(0, gelsCount);
    }
    const totalCarbsG =
      juiceBidons * JUICE_BIDON_650ML.carbsG +
      datesCount * MEDJOOL_DATE.carbsG +
      gelsCount * ENERGY_GEL_UNIT.carbsG;
    const totalKcal =
      juiceBidons * JUICE_BIDON_650ML.kcal +
      datesCount * MEDJOOL_DATE.kcal +
      gelsCount * ENERGY_GEL_UNIT.kcal;
    return {
      juiceBidons,
      datesCount,
      chewsCount: 0,
      gelsCount,
      isoBidons: 0,
      totalCarbsG,
      totalKcal,
    };
  }

  // real-food
  const chewsCount = Math.max(0, Math.round(remainingSolidAfterDates / FRUIT_CHEW_PIECE.carbsG));
  const totalCarbsG =
    juiceBidons * JUICE_BIDON_650ML.carbsG +
    datesCount * MEDJOOL_DATE.carbsG +
    chewsCount * FRUIT_CHEW_PIECE.carbsG;
  const totalKcal =
    juiceBidons * JUICE_BIDON_650ML.kcal +
    datesCount * MEDJOOL_DATE.kcal +
    chewsCount * FRUIT_CHEW_PIECE.kcal;
  return {
    juiceBidons,
    datesCount,
    chewsCount,
    gelsCount: 0,
    isoBidons: 0,
    totalCarbsG,
    totalKcal,
  };
}

export interface HydrationPlanParams {
  rideHours: number;
  tempC?: number;
  legWatts?: number;
  bidonSizeMl?: number;
  frameBottleSlots?: number;
  isShortRide?: boolean;
  activeChips?: string[];
}

export interface HydrationPlanResult {
  sweatRateMlPerHr: number;
  targetFluidMlPerHr: number;
  totalFluidNeedMl: number;
  totalBidonsNeeded: number;
  carriedOnFrameBidons: number;
  plannedRefillBidons: number;
  sodiumMgPerL: 500 | 750 | 0;
  bidonSizeMl: number;
}

/**
 * Sweat-Driven Hydration Solver (Phase 7):
 * Decouples fluid volume from carbohydrate scaling and calculates sweat loss,
 * replacement fluid rate, frame vs. refill bidon split, and sodium concentration.
 */
export function calculateHydrationPlan(params: HydrationPlanParams): HydrationPlanResult {
  const rideHours = Math.max(0.1, params.rideHours);
  const tempC = params.tempC ?? 18;
  const legWatts = Math.max(0, params.legWatts ?? 150);
  const bidonSizeMl = params.bidonSizeMl ?? 650;
  const frameBottleSlots = Math.max(1, params.frameBottleSlots ?? 2);
  const isShortRide = params.isShortRide ?? rideHours < 0.75;
  const activeChips = params.activeChips ?? [];

  // Step 1 (Short-Ride < 45m)
  if (isShortRide) {
    return {
      sweatRateMlPerHr: 0,
      targetFluidMlPerHr: 0,
      totalFluidNeedMl: 450,
      totalBidonsNeeded: 1,
      carriedOnFrameBidons: 1,
      plannedRefillBidons: 0,
      sodiumMgPerL: 0,
      bidonSizeMl,
    };
  }

  // Step 2 (Hourly Sweat & Replacement Rate)
  const thermalSweat = 18 * Math.max(0, tempC - 10);
  const metabolicSweat = 1.15 * legWatts;
  const sweatRateMlPerHr = Math.min(1400, Math.max(350, Math.round(400 + thermalSweat + metabolicSweat)));
  const targetFluidMlPerHr = Math.round(sweatRateMlPerHr * 0.80);

  // Step 3 (Total Volume & Frame vs. Refill Split)
  const totalFluidNeedMl = Math.round(targetFluidMlPerHr * rideHours);
  const totalBidonsNeeded = Math.max(1, Math.ceil(totalFluidNeedMl / bidonSizeMl));
  const carriedOnFrameBidons = Math.min(frameBottleSlots, totalBidonsNeeded);
  const plannedRefillBidons = Math.max(0, totalBidonsNeeded - carriedOnFrameBidons);

  // Step 4 (Electrolyte Sodium Concentration)
  const isHighSodium =
    tempC >= 24 ||
    sweatRateMlPerHr >= 850 ||
    activeChips.includes('hydration-electrolytes');
  const sodiumMgPerL: 500 | 750 = isHighSodium ? 750 : 500;

  return {
    sweatRateMlPerHr,
    targetFluidMlPerHr,
    totalFluidNeedMl,
    totalBidonsNeeded,
    carriedOnFrameBidons,
    plannedRefillBidons,
    sodiumMgPerL,
    bidonSizeMl,
  };
}

export interface FuelSplitParams {
  rideHours: number;
  pctFtp?: number;
  tempC?: number;
  liquidCarbRatio?: number;
  autoModulateLiquidInHeatOrEffort?: boolean;
  enableSavoryPalateResets?: boolean;
}

export interface EffectiveFuelSplitResult {
  baselineLiquidRatio: number;
  effectiveLiquidRatio: number;
  intensityShift: number;
  heatShift: number;
  isLiquidShifted: boolean;
  liquidShiftPct: number;
  savoryResetCount: number;
}

/**
 * Resolves effective liquid-to-solid fuel split and savory palate fatigue resets (Phase 9).
 * Shifts intake toward liquid carbs during high effort (%FTP >= 85%) or heat (tempC >= 26°C),
 * and injects savory palate-reset snacks every 90 minutes on rides >= 2.5 hours.
 */
export function resolveEffectiveFuelSplit(params: FuelSplitParams): EffectiveFuelSplitResult {
  const baselineLiquidRatio = Math.min(0.85, Math.max(0.15, params.liquidCarbRatio ?? 0.35));
  const autoModulate = params.autoModulateLiquidInHeatOrEffort !== false;
  const pctFtp = params.pctFtp ?? 72;
  const tempC = params.tempC ?? 18;
  const rideHours = Math.max(0.1, params.rideHours);

  let intensityShift = 0;
  let heatShift = 0;

  if (autoModulate) {
    // Splanchnic vasoconstriction impairs gastric emptying at higher relative intensity
    if (pctFtp > 105) {
      intensityShift = 0.30;
    } else if (pctFtp >= 85) {
      intensityShift = 0.20;
    } else if (pctFtp >= 80) {
      intensityShift = 0.10;
    }

    // Thermal strain shifts circulating blood to skin for evaporative heat dissipation
    if (tempC >= 31) {
      heatShift = 0.15;
    } else if (tempC >= 26) {
      heatShift = 0.10;
    }
  }

  const effectiveLiquidRatio = Math.min(
    0.85,
    Math.max(0.15, Math.round((baselineLiquidRatio + intensityShift + heatShift) * 100) / 100)
  );

  const isLiquidShifted = effectiveLiquidRatio > baselineLiquidRatio;
  const liquidShiftPct = Math.round((effectiveLiquidRatio - baselineLiquidRatio) * 100);

  let savoryResetCount = 0;
  if (params.enableSavoryPalateResets !== false && rideHours >= 2.5) {
    if (pctFtp < 90) {
      savoryResetCount = Math.floor(rideHours / 1.5);
    } else if (rideHours >= 3.5) {
      savoryResetCount = 1;
    }
  }

  return {
    baselineLiquidRatio,
    effectiveLiquidRatio,
    intensityShift,
    heatShift,
    isLiquidShifted,
    liquidShiftPct,
    savoryResetCount,
  };
}

/**
 * Scales a catalog portion label ("1 plump date or dried fruit", "2 salted baby potatoes")
 * by a unit count without duplicating the leading quantity.
 */
export function scalePortionLabel(label: string, units: number): string {
  if (units <= 1) return label;
  const match = label.match(/^(\d+)\s+(.*)$/);
  if (match) {
    const baseCount = parseInt(match[1], 10);
    if (baseCount > 1) return `${baseCount * units} ${match[2]}`;
    return `${match[2]} × ${units}`;
  }
  return `${label} × ${units}`;
}

/**
 * Builds a plain-language bottle plan ("1 bottle of diluted fruit juice + 2 bottles of water").
 * Catalog liquid labels start with "1 bottle " / "1 bidon "; that prefix is stripped so the
 * count is never repeated. Pass bidonSizeMl to append the bottle volume.
 */
export function formatBottlePlan(
  carbBottles: number,
  waterBottles: number,
  liquidItem: PantryItem,
  lang: Language,
  bidonSizeMl?: number
): string {
  const isFr = lang === 'fr';
  const sizeSuffix = bidonSizeMl ? ` (${bidonSizeMl} ml)` : '';
  const rawLabel = isFr ? liquidItem.portionLabelFr : liquidItem.portionLabelEn;
  const noun = rawLabel.replace(/^1\s+(bottle|bidon)\s+/i, '');
  const hasPrefix = noun !== rawLabel;
  const carbPart =
    carbBottles > 0
      ? isFr
        ? hasPrefix
          ? `${carbBottles} bidon${carbBottles > 1 ? 's' : ''} ${noun}`
          : `${carbBottles} × ${rawLabel}`
        : hasPrefix
        ? `${carbBottles} bottle${carbBottles > 1 ? 's' : ''} of ${noun}`
        : `${carbBottles} × ${rawLabel}`
      : '';
  const waterPart =
    waterBottles > 0
      ? isFr
        ? `${waterBottles} bidon${waterBottles > 1 ? 's' : ''} d’eau`
        : `${waterBottles} bottle${waterBottles > 1 ? 's' : ''} of water`
      : '';
  return [carbPart, waterPart].filter(Boolean).join(' + ') + sizeSuffix;
}

/**
 * Allocates concrete on-bike items with strict unit-based macro integrity (EQ-14 to EQ-20).
 * Supports dynamic N-item Personal Pantry items (liquidItem + solidItems) with fallback
 * to legacy 3-way nutritionPreference strings.
 */
export function allocatePhase2OnBikeItems(
  targetOnBikeCarbsG: number,
  preferenceOrLiquid: 'real-food' | 'mixed' | 'sports-fuel' | PantryItem,
  rideHours: number,
  lang: Language = getCurrentLanguage(),
  solidItems?: PantryItem[],
  hydrationPlan?: HydrationPlanResult,
  fuelSplit?: EffectiveFuelSplitResult
): NutritionItem[] {
  const isFr = lang === 'fr';
  const bidonSizeMl = hydrationPlan?.bidonSizeMl ?? 650;

  if (targetOnBikeCarbsG <= 0) {
    return [
      {
        name: isFr ? 'Eau Pure & Électrolytes' : 'Pure Water & Electrolytes',
        quantity: isFr ? `1x Bidon ${bidonSizeMl} ml (450 ml cible)` : `1x ${bidonSizeMl}ml bidon (450ml target)`,
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau pure & électrolytes (0g C)' : 'Pure water & electrolytes (0g C)',
        portionLabel: isFr ? '1 bidon d’eau' : '1 bottle water',
        notes: isFr ? 'Hydratation seule pour une sortie courte (< 45 min).' : 'Just water for a short ride (under 45 min).',
        isRealFoodVerified: true,
        isLiquid: true,
      },
    ];
  }

  // Dynamic Personal Pantry mode (PantryItem passed for liquid)
  if (typeof preferenceOrLiquid !== 'string') {
    const liquidItem = preferenceOrLiquid;
    const items: NutritionItem[] = [];

    // Liquid allocation: modulated by fuelSplit if available, otherwise baseline 50% / 35%.
    // Catalog liquid macros are expressed per 650 ml bidon; scale to the rider's bottle size.
    const isHighCarb =
      liquidItem.carbsG >= 50 ||
      liquidItem.id.includes('maltodextrin') ||
      liquidItem.id.includes('isotonic');
    const liquidShare = fuelSplit
      ? fuelSplit.effectiveLiquidRatio
      : isHighCarb
      ? 0.5
      : 0.35;
    const bottleScale = bidonSizeMl / 650;
    const carbsPerBidon = Math.max(0, Math.round(liquidItem.carbsG * bottleScale));
    const kcalPerBidon = Math.max(0, Math.round(liquidItem.kcal * bottleScale));
    const proteinPerBidon = Math.max(0, Math.round(liquidItem.proteinG * bottleScale));
    const rawLiquidUnits =
      carbsPerBidon > 0
        ? Math.max(1, Math.round((targetOnBikeCarbsG * liquidShare) / carbsPerBidon))
        : 0;
    const totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? Math.max(1, rawLiquidUnits);
    const liquidCarbBidons = Math.min(totalBidonsNeeded, rawLiquidUnits);
    const pureWaterBidons = Math.max(0, totalBidonsNeeded - liquidCarbBidons);
    const sodiumMgPerL = hydrationPlan?.sodiumMgPerL ?? 500;
    const liquidCarbs = liquidCarbBidons * carbsPerBidon;

    items.push({
      name: isFr ? liquidItem.nameFr : liquidItem.nameEn,
      quantity: formatBottlePlan(liquidCarbBidons, pureWaterBidons, liquidItem, lang, bidonSizeMl),
      carbsGrams: liquidCarbs,
      proteinGrams: liquidCarbBidons * proteinPerBidon,
      fatsGrams: 0,
      kcals: liquidCarbBidons * kcalPerBidon,
      quantitativeLabel: isFr
        ? `${liquidItem.nameFr} (${liquidCarbs} g glucides · ${totalBidonsNeeded} × ${bidonSizeMl} ml · ~${sodiumMgPerL} mg sodium/L)`
        : `${liquidItem.nameEn} (${liquidCarbs}g carbs · ${totalBidonsNeeded} × ${bidonSizeMl} ml · ~${sodiumMgPerL} mg sodium/L)`,
      portionLabel: formatBottlePlan(liquidCarbBidons, pureWaterBidons, liquidItem, lang),
      notes: isFr
        ? 'Buvez par petites gorgées régulières, avec des électrolytes.'
        : 'Sip little and often, with electrolytes.',
      isRealFoodVerified:
        !liquidItem.id.includes('gel') &&
        !liquidItem.id.includes('isotonic') &&
        !liquidItem.id.includes('maltodextrin'),
      isLiquid: true,
      unitCount: liquidCarbBidons,
    });

    let remainingSolidCarbs = Math.max(0, targetOnBikeCarbsG - liquidCarbs);
    // Zero-carb custom items cannot carry fuel; drop them so they never swallow a slot share.
    const solids = (solidItems || []).filter((s) => s && s.carbsG > 0);

    // Per-item unit ledger so a savory item used for resets and regular fuel is listed once.
    const ledger = new Map<string, { item: PantryItem; units: number; resetUnits: number }>();
    const addUnits = (item: PantryItem, units: number, isReset: boolean) => {
      if (units <= 0) return;
      const entry = ledger.get(item.id) ?? { item, units: 0, resetUnits: 0 };
      entry.units += units;
      if (isReset) entry.resetUnits += units;
      ledger.set(item.id, entry);
    };

    // Savory Palate Reset Allocation (Phase 9): reset units come first, from a compliant savory item.
    const savoryResetCount = fuelSplit?.savoryResetCount ?? 0;
    let resetUnitsAllocated = 0;
    if (savoryResetCount > 0 && remainingSolidCarbs > 0) {
      const activeFilters = loadRiderBikeSpecs().dietaryFilters ?? [];
      const savoryItem =
        solids.find((s) => s.flavor === 'savory') ??
        DEFAULT_PANTRY_CATALOG.find(
          (c) =>
            c.slot === 'on-bike-solid' &&
            c.flavor === 'savory' &&
            c.carbsG > 0 &&
            isItemCompliant(c, activeFilters)
        );
      if (savoryItem) {
        // Never let resets overshoot the solid budget by more than a single unit.
        resetUnitsAllocated = Math.max(
          1,
          Math.min(savoryResetCount, Math.floor(remainingSolidCarbs / savoryItem.carbsG))
        );
        addUnits(savoryItem, resetUnitsAllocated, true);
        remainingSolidCarbs = Math.max(0, remainingSolidCarbs - resetUnitsAllocated * savoryItem.carbsG);
      }
    }

    // Remaining solid carbs: when resets already covered the savory need, prefer sweet/neutral
    // items; otherwise (short rides, resets off, or an all-savory pantry) use every solid.
    const sweetNeutralSolids = solids.filter((s) => s.flavor !== 'savory');
    const allocationSolids =
      resetUnitsAllocated > 0 && sweetNeutralSolids.length > 0 ? sweetNeutralSolids : solids;

    for (let idx = 0; idx < allocationSolids.length; idx++) {
      const item = allocationSolids[idx];
      const isLast = idx === allocationSolids.length - 1;
      const slotsRemaining = allocationSolids.length - idx;
      const slotTarget = remainingSolidCarbs / slotsRemaining;
      let units = Math.max(0, Math.round(slotTarget / item.carbsG));

      // Guarantee minimum 1 unit if significant unallocated carbs remain on the final item
      if (isLast && remainingSolidCarbs >= item.carbsG * 0.4 && units === 0) {
        units = 1;
      }

      if (units > 0) {
        remainingSolidCarbs = Math.max(0, remainingSolidCarbs - units * item.carbsG);
        addUnits(item, units, false);
      }
    }

    ledger.forEach(({ item, units, resetUnits }) => {
      const isReset = resetUnits > 0;
      const portion = isFr ? item.portionLabelFr : item.portionLabelEn;
      items.push({
        name: isFr ? item.nameFr : item.nameEn,
        quantity: isFr ? `${units} portion${units > 1 ? 's' : ''}` : `${units} serving${units > 1 ? 's' : ''}`,
        carbsGrams: units * item.carbsG,
        proteinGrams: units * item.proteinG,
        fatsGrams: 0,
        kcals: units * item.kcal,
        quantitativeLabel: isFr
          ? `${item.nameFr} (${units * item.carbsG} g glucides)`
          : `${item.nameEn} (${units * item.carbsG}g carbs)`,
        portionLabel: scalePortionLabel(portion, units),
        notes: isReset
          ? isFr
            ? 'Pause salée, environ toutes les 90 min.'
            : 'Salty break, about every 90 min.'
          : item.flavor === 'savory'
          ? isFr
            ? 'En-cas salé pour varier les saveurs.'
            : 'Salty snack for variety.'
          : isFr
          ? 'Énergie facile à digérer.'
          : 'Easy-to-digest energy.',
        isRealFoodVerified:
          !item.id.includes('gel') &&
          !item.id.includes('isotonic') &&
          !item.id.includes('maltodextrin'),
        isSavoryReset: isReset,
        unitCount: units,
      });
    });

    return items;
  }

  // Legacy fallback when string preference is passed
  const preference = preferenceOrLiquid as 'real-food' | 'mixed' | 'sports-fuel';

  const counts = getBottomUpPortionCounts(targetOnBikeCarbsG, preference, rideHours);
  const items: NutritionItem[] = [];

  if (preference === 'sports-fuel') {
    if (counts.isoBidons > 0) {
      const totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? counts.isoBidons;
      const liquidCarbBidons = Math.min(totalBidonsNeeded, counts.isoBidons);
      const pureWaterBidons = Math.max(0, totalBidonsNeeded - liquidCarbBidons);
      items.push({
        name: isFr ? 'Boisson Glucidique Isotonique + Électrolytes' : 'Isotonic Carb Drink Mix + Electrolytes',
        quantity:
          pureWaterBidons > 0
            ? isFr
              ? `${liquidCarbBidons}x Bidon Glucidique (${bidonSizeMl} ml) + ${pureWaterBidons}x Bidon${pureWaterBidons > 1 ? 's' : ''} Eau/Électrolytes (${bidonSizeMl} ml)`
              : `${liquidCarbBidons}x Carbohydrate Bidon (${bidonSizeMl}ml) + ${pureWaterBidons}x Pure/Electrolyte Water Bidon${pureWaterBidons > 1 ? 's' : ''} (${bidonSizeMl}ml)`
            : isFr
            ? `${liquidCarbBidons}x Bidon${liquidCarbBidons > 1 ? 's' : ''} ${bidonSizeMl} ml`
            : `${liquidCarbBidons}x ${bidonSizeMl}ml bidon${liquidCarbBidons > 1 ? 's' : ''}`,
        carbsGrams: liquidCarbBidons * ISOTONIC_SCOOP_BIDON.carbsG,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: liquidCarbBidons * ISOTONIC_SCOOP_BIDON.kcal,
        quantitativeLabel: isFr
          ? `Boisson glucidique isotonique (${liquidCarbBidons * ISOTONIC_SCOOP_BIDON.carbsG}g C)`
          : `Isotonic carb mix (${liquidCarbBidons * ISOTONIC_SCOOP_BIDON.carbsG}g C)`,
        portionLabel:
          pureWaterBidons > 0
            ? isFr
              ? `${liquidCarbBidons}x Bidon glucidique + ${pureWaterBidons}x Bidon${pureWaterBidons > 1 ? 's' : ''} eau/électrolytes`
              : `${liquidCarbBidons}x Carbohydrate Bidon + ${pureWaterBidons}x Pure/Electrolyte Water Bidon${pureWaterBidons > 1 ? 's' : ''}`
            : isFr
            ? `${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bidons' : 'bidon'} d'eau & électrolytes`
            : `${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bottles' : 'bottle'} hydration drink`,
        notes: isFr ? 'Facile à boire, rien à mâcher.' : 'Easy to drink, nothing to chew.',
        isRealFoodVerified: false,
        isLiquid: true,
      });
    }

    if (counts.gelsCount > 0) {
      items.push({
        name: isFr ? 'Gels Énergétiques Glucose/Fructose' : 'Dual-Source Energy Gels',
        quantity: `${counts.gelsCount}x gel (25g)`,
        carbsGrams: counts.gelsCount * ENERGY_GEL_UNIT.carbsG,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: counts.gelsCount * ENERGY_GEL_UNIT.kcal,
        quantitativeLabel: isFr
          ? `${counts.gelsCount}x gel énergétique (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG}g C)`
          : `${counts.gelsCount}x energy gel (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG}g C)`,
        portionLabel: isFr
          ? `${counts.gelsCount} ${counts.gelsCount > 1 ? 'collations' : 'collation'} de poche rapide`
          : `${counts.gelsCount} quick pocket ${counts.gelsCount > 1 ? 'snacks' : 'snack'}`,
        notes: isFr ? 'À prendre avant les côtes ou sections exposées.' : 'Take ahead of climbs or exposed headwind sections.',
        isRealFoodVerified: false,
      });
    }

    return items;
  }

  // Real-food or mixed fuel
  if (counts.juiceBidons > 0) {
    const totalBidonsNeeded = hydrationPlan?.totalBidonsNeeded ?? counts.juiceBidons;
    const liquidCarbBidons = Math.min(totalBidonsNeeded, counts.juiceBidons);
    const pureWaterBidons = Math.max(0, totalBidonsNeeded - liquidCarbBidons);
    items.push({
      name: isFr ? '50/50 Eau & Pur Jus de Pomme/Raisin Pressé' : '50/50 Water & 100% Pressed Apple/Grape Juice',
      quantity:
        pureWaterBidons > 0
          ? isFr
            ? `${liquidCarbBidons}x Bidon Glucidique (${bidonSizeMl} ml) + ${pureWaterBidons}x Bidon${pureWaterBidons > 1 ? 's' : ''} Eau/Électrolytes (${bidonSizeMl} ml)`
            : `${liquidCarbBidons}x Carbohydrate Bidon (${bidonSizeMl}ml) + ${pureWaterBidons}x Pure/Electrolyte Water Bidon${pureWaterBidons > 1 ? 's' : ''} (${bidonSizeMl}ml)`
          : isFr
          ? `${liquidCarbBidons}x Bidon${liquidCarbBidons > 1 ? 's' : ''} ${bidonSizeMl} ml`
          : `${liquidCarbBidons}x ${bidonSizeMl}ml bidon${liquidCarbBidons > 1 ? 's' : ''}`,
      carbsGrams: liquidCarbBidons * JUICE_BIDON_650ML.carbsG,
      proteinGrams: 0,
      fatsGrams: 0,
      kcals: liquidCarbBidons * JUICE_BIDON_650ML.kcal,
      quantitativeLabel: isFr
        ? `50/50 eau & pur jus pressé (${liquidCarbBidons * JUICE_BIDON_650ML.carbsG}g C)`
        : `50/50 water & 100% pressed juice (${liquidCarbBidons * JUICE_BIDON_650ML.carbsG}g C)`,
      portionLabel:
        pureWaterBidons > 0
          ? isFr
            ? `${liquidCarbBidons}x Bidon glucidique + ${pureWaterBidons}x Bidon${pureWaterBidons > 1 ? 's' : ''} eau/électrolytes`
            : `${liquidCarbBidons}x Carbohydrate Bidon + ${pureWaterBidons}x Pure/Electrolyte Water Bidon${pureWaterBidons > 1 ? 's' : ''}`
          : isFr
          ? `${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bidons' : 'bidon'} jus naturel dilué`
          : `${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bottles' : 'bottle'} diluted fruit juice`,
      notes: isFr ? 'Jus coupé d’eau, léger pour l’estomac.' : 'Juice cut with water, easy on the stomach.',
      isRealFoodVerified: true,
      isLiquid: true,
    });
  }

  if (counts.datesCount > 0) {
    items.push({
      name: isFr ? 'Dattes Medjool (Dénoyautées)' : 'Medjool Dates (Pitted)',
      quantity: isFr ? `${counts.datesCount} dattes` : `${counts.datesCount} plump dates`,
      carbsGrams: counts.datesCount * MEDJOOL_DATE.carbsG,
      proteinGrams: counts.datesCount > 0 ? 1 : 0,
      fatsGrams: 0,
      kcals: counts.datesCount * MEDJOOL_DATE.kcal,
      quantitativeLabel: isFr
        ? `Dattes Medjool dénoyautées (${counts.datesCount * MEDJOOL_DATE.carbsG}g C)`
        : `Medjool dates (${counts.datesCount * MEDJOOL_DATE.carbsG}g C)`,
      portionLabel: isFr
        ? `${counts.datesCount} ${counts.datesCount > 1 ? 'dattes' : 'datte'} ou fruits secs`
        : `${counts.datesCount} plump ${counts.datesCount > 1 ? 'dates' : 'date'} or dried fruit`,
      notes: isFr ? 'Riches en potassium naturel, texture fondante.' : 'Rich in natural potassium, melt-in-mouth chewability.',
      isRealFoodVerified: true,
    });
  }

  if (preference === 'mixed' && counts.gelsCount > 0) {
    items.push({
      name: isFr ? 'Gel Énergétique Rapide (Secours Bosses)' : 'Fast Energy Gel (Climb Backup)',
      quantity: `${counts.gelsCount}x gel (25g)`,
      carbsGrams: counts.gelsCount * ENERGY_GEL_UNIT.carbsG,
      proteinGrams: 0,
      fatsGrams: 0,
      kcals: counts.gelsCount * ENERGY_GEL_UNIT.kcal,
      quantitativeLabel: isFr
        ? `${counts.gelsCount}x gel énergétique (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG}g C)`
        : `${counts.gelsCount}x energy gel (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG}g C)`,
      portionLabel: isFr
        ? `${counts.gelsCount} ${counts.gelsCount > 1 ? 'collations' : 'collation'} de poche rapide`
        : `${counts.gelsCount} quick pocket ${counts.gelsCount > 1 ? 'snacks' : 'snack'}`,
      notes: isFr ? 'À prendre avant les côtes ou sections exposées.' : 'Take ahead of climbs or exposed headwind sections.',
      isRealFoodVerified: false,
    });
  } else if (preference === 'real-food' && counts.chewsCount > 0) {
    items.push({
      name: isFr ? 'Pâtes de Fruits Artisanales & Figues' : 'Artisanal Fruit Chews & Dried Figs',
      quantity: isFr ? `${counts.chewsCount} portions` : `${counts.chewsCount} pieces`,
      carbsGrams: counts.chewsCount * FRUIT_CHEW_PIECE.carbsG,
      proteinGrams: 0,
      fatsGrams: 0,
      kcals: counts.chewsCount * FRUIT_CHEW_PIECE.kcal,
      quantitativeLabel: isFr
        ? `Pâtes de fruits artisanales (${counts.chewsCount * FRUIT_CHEW_PIECE.carbsG}g C)`
        : `Artisanal fruit chews (${counts.chewsCount * FRUIT_CHEW_PIECE.carbsG}g C)`,
      portionLabel: isFr
        ? `${counts.chewsCount} ${counts.chewsCount > 1 ? 'bouchées' : 'bouchée'} de fruits secs ou figues`
        : `${counts.chewsCount} ${counts.chewsCount > 1 ? 'pieces' : 'piece'} fruit chews or dried figs`,
      notes: isFr ? 'Énergie progressive et coup de boost dans les côtes.' : 'Steady release plus quick boost for climbs and headwinds.',
      isRealFoodVerified: true,
    });
  }

  // Savory Palate Reset for legacy preset mode (Phase 9): use the compliant catalog item's real macros
  if ((fuelSplit?.savoryResetCount ?? 0) > 0) {
    const savoryCount = fuelSplit!.savoryResetCount;
    const activeFilters = loadRiderBikeSpecs().dietaryFilters ?? [];
    const savoryItem = DEFAULT_PANTRY_CATALOG.find(
      (c) => c.slot === 'on-bike-solid' && c.flavor === 'savory' && isItemCompliant(c, activeFilters)
    );
    if (savoryItem) {
      items.push({
        name: isFr ? savoryItem.nameFr : savoryItem.nameEn,
        quantity: isFr
          ? `${savoryCount} portion${savoryCount > 1 ? 's' : ''} salée${savoryCount > 1 ? 's' : ''}`
          : `${savoryCount} savory serving${savoryCount > 1 ? 's' : ''}`,
        carbsGrams: savoryCount * savoryItem.carbsG,
        proteinGrams: savoryCount * savoryItem.proteinG,
        fatsGrams: 0,
        kcals: savoryCount * savoryItem.kcal,
        quantitativeLabel: isFr
          ? `${savoryItem.nameFr} (${savoryCount * savoryItem.carbsG} g glucides)`
          : `${savoryItem.nameEn} (${savoryCount * savoryItem.carbsG}g carbs)`,
        portionLabel: scalePortionLabel(isFr ? savoryItem.portionLabelFr : savoryItem.portionLabelEn, savoryCount),
        notes: isFr ? 'Pause salée, environ toutes les 90 min.' : 'Salty break, about every 90 min.',
        isRealFoodVerified: true,
        isSavoryReset: true,
      });
    }
  }

  return items;
}

export interface RealFoodNutritionPlanOptions {
  carbTargetGPerHr?: number;
  rideHours?: number;
  nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
  pctFtp?: number;
  carbOxidationGramPerHour?: number;
  totalDays?: number;
  activeChips?: string[];
  compliantPantry?: ResolvedCompliantPantry;
  logistics?: LogisticsSettings;
  solvedTimeline?: SolvedTripTimeline;
  tempC?: number;
  legWatts?: number;
  bidonSizeMl?: number;
  frameBottleSlots?: number;
  hydrationPlan?: HydrationPlanResult;
  fuelSplit?: EffectiveFuelSplitResult;
}

/**
 * Returns the Nutrition Protocol scaled dynamically with intensity-modulated
 * carbohydrate targeting, personal pantry items, dietary guardrails, and single-anchor logistics.
 */
export function getRealFoodNutritionPlan(
  lockerArrivalTime: string = '08:30',
  breakRoomTime: string = '08:50',
  departureTime: string = '07:35',
  lang: Language = getCurrentLanguage(),
  options?: RealFoodNutritionPlanOptions
): NutritionPhase[] {
  const isFr = lang === 'fr';
  const storedSpecs = loadRiderBikeSpecs();
  const gutCeilingGPerHr = Math.max(25, Math.min(120, options?.carbTargetGPerHr ?? storedSpecs.carbTargetGPerHr ?? 60));
  const rideHours = Math.max(0.1, options?.rideHours ?? 1.5);
  const pref = options?.nutritionPreference ?? storedSpecs.nutritionPreference ?? 'real-food';
  const totalDays = options?.totalDays ?? 1;
  const activeChips = options?.activeChips ?? [];
  const logistics = options?.logistics;
  const preRideStyle = logistics?.preRideStyle ?? 'full-breakfast';
  const hasFridge = logistics?.hasDestinationFridge ?? true;
  const isSplitRecovery = logistics?.splitPostRideRecovery ?? Boolean(activeChips.includes('shower-locker'));

  const compliantPantry = options?.compliantPantry
    ? options.compliantPantry
    : resolveCompliantPantry(storedSpecs, { hasDestinationFridge: hasFridge });

  // If passed pantry has chilled post-ride item but hasFridge is false, swap to shelf-stable
  const resolvedPostRidePantry =
    !hasFridge && compliantPantry.postRide.requiresFridge
      ? resolveCompliantPantry(storedSpecs, { hasDestinationFridge: false }).postRide
      : compliantPantry.postRide;

  // Use physiological intensity if available, otherwise baseline Zone 2
  const pctFtp = options?.pctFtp ?? 72;
  const carbOxidation = options?.carbOxidationGramPerHour ?? Math.round(gutCeilingGPerHr * 1.8);

  const { recommendedGPerHr, targetOnBikeCarbsG, effectiveHourlyRateG, effectiveCeilingGPerHr } = calculateIntensityModulatedCarbTarget({
    rideHours,
    pctFtp,
    carbOxidationGramPerHour: carbOxidation,
    gutCeilingGPerHr,
    totalDays,
    activeChips,
  });

  // Pre-Ride Carb Deficit & Redistribution
  const basePreRideCarbs = compliantPantry.preRide.carbsG; // e.g. 62g
  let preDeficitG = 0;
  let phase1Items: NutritionItem[] = [];

  if (preRideStyle === 'light-liquid') {
    // Light liquid primer: ~28g carbs
    preDeficitG = Math.max(0, basePreRideCarbs - 28);
    phase1Items = [
      {
        name: isFr
          ? 'Boisson glucidique légère (pur jus ou eau d’érable salée)'
          : 'Light carb drink (pure juice or salted maple water)',
        quantity: '250ml',
        carbsGrams: 28,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 115,
        quantitativeLabel: isFr
          ? 'Boisson glucidique légère (250 ml, 28 g glucides)'
          : 'Light carb drink (250ml, 28g carbs)',
        portionLabel: isFr ? '1 petit verre de jus ou boisson légère' : '1 small glass of juice or light drink',
        notes: isFr
          ? 'Boisson légère, facile à digérer 20 min avant de partir.'
          : 'Light drink, easy on the stomach 20 min before you leave.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Double expresso' : 'Double espresso',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60 ml, ~140 mg caféine)' : 'Double espresso (60ml, ~140mg caffeine)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? 'Un petit coup de fouet avant de partir.' : 'A quick pick-me-up before you leave.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau fraîche + pincée de sel' : 'Water with a pinch of salt',
        quantity: '300ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau fraîche + sel (300 ml)' : 'Water with a pinch of salt (300ml)',
        portionLabel: isFr ? '1 grand verre d’eau salée' : '1 tall glass of salted water',
        notes: isFr ? 'Hydratation avant le départ avec une pincée de sel.' : 'Pre-ride water with a pinch of salt.',
        isRealFoodVerified: true,
      },
    ];
  } else if (preRideStyle === 'fasted-rollout') {
    // Fasted rollout: 0g carbs
    preDeficitG = basePreRideCarbs; // 62g
    phase1Items = [
      {
        name: isFr ? 'Double expresso' : 'Double espresso',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60 ml, ~140 mg caféine, 0 g glucides)' : 'Double espresso (60ml, ~140mg caffeine, 0g carbs)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? 'Un café court pour démarrer léger.' : 'A quick espresso for a light start.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau fraîche + pincée de sel' : 'Water with a pinch of salt',
        quantity: '350ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau fraîche + sel (350 ml)' : 'Water with a pinch of salt (350ml)',
        portionLabel: isFr ? '1 grand verre d’eau salée' : '1 tall glass of salted water',
        notes: isFr
          ? 'Un grand verre d’eau avec une pincée de sel avant de rouler.'
          : 'A tall glass of water with a pinch of salt before rolling out.',
        isRealFoodVerified: true,
      },
    ];
  } else {
    // Full breakfast: standard compliant pre-ride item
    preDeficitG = 0;
    phase1Items = [
      {
        name: isFr ? compliantPantry.preRide.nameFr : compliantPantry.preRide.nameEn,
        quantity: isFr ? '1 portion' : '1 portion',
        carbsGrams: compliantPantry.preRide.carbsG,
        proteinGrams: compliantPantry.preRide.proteinG,
        fatsGrams: 1,
        kcals: compliantPantry.preRide.kcal,
        quantitativeLabel: isFr
          ? `${compliantPantry.preRide.nameFr} (${compliantPantry.preRide.carbsG} g glucides, ${compliantPantry.preRide.proteinG} g protéines)`
          : `${compliantPantry.preRide.nameEn} (${compliantPantry.preRide.carbsG}g carbs, ${compliantPantry.preRide.proteinG}g protein)`,
        portionLabel: isFr ? compliantPantry.preRide.portionLabelFr : compliantPantry.preRide.portionLabelEn,
        notes: isFr ? 'Facile à digérer avant de partir.' : 'Easy to digest before you head out.',
        isRealFoodVerified: !compliantPantry.preRide.id.includes('gel'),
      },
      {
        name: isFr ? 'Double expresso' : 'Double espresso',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60 ml, ~140 mg caféine)' : 'Double espresso (60ml, ~140mg caffeine)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? 'Un petit coup de fouet avant de partir.' : 'A quick pick-me-up before you leave.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau fraîche + pincée de sel' : 'Water with a pinch of salt',
        quantity: '300ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau fraîche + sel (300 ml)' : 'Water with a pinch of salt (300ml)',
        portionLabel: isFr ? '1 grand verre d’eau salée' : '1 tall glass of salted water',
        notes: isFr ? 'Hydratation avant le départ avec une pincée de sel.' : 'Pre-ride water with a pinch of salt.',
        isRealFoodVerified: true,
      },
    ];
  }

  // Shift 50% of deficit into Phase 2 on-bike fueling (clamped by effectiveCeilingGPerHr * rideHours)
  const onBikeShiftWanted = Math.round(preDeficitG * 0.50);
  const maxOnBikeCarbs = Math.max(25, Math.round(effectiveCeilingGPerHr * rideHours));
  // Short rides (< 45 min, target 0) carry no on-bike food: the whole deficit goes to recovery.
  const maxShiftAllowed = targetOnBikeCarbsG > 0 ? Math.max(0, maxOnBikeCarbs - targetOnBikeCarbsG) : 0;
  const effectiveOnBikeShift = Math.min(onBikeShiftWanted, maxShiftAllowed);

  const finalOnBikeCarbsG = targetOnBikeCarbsG + effectiveOnBikeShift;

  const hydrationPlan =
    options?.hydrationPlan ??
    calculateHydrationPlan({
      rideHours,
      tempC: options?.tempC ?? 18,
      legWatts: options?.legWatts ?? 150,
      bidonSizeMl: options?.bidonSizeMl ?? storedSpecs.bidonSizeMl ?? 650,
      frameBottleSlots: options?.frameBottleSlots ?? storedSpecs.frameBottleSlots ?? 2,
      isShortRide: rideHours < 0.75 && totalDays === 1,
      activeChips,
    });

  const fuelSplit =
    options?.fuelSplit ??
    resolveEffectiveFuelSplit({
      rideHours,
      pctFtp,
      tempC: options?.tempC ?? 18,
      liquidCarbRatio: storedSpecs.liquidCarbRatio,
      autoModulateLiquidInHeatOrEffort: storedSpecs.autoModulateLiquidInHeatOrEffort,
      enableSavoryPalateResets: storedSpecs.enableSavoryPalateResets,
    });

  const onBikeItems = allocatePhase2OnBikeItems(
    finalOnBikeCarbsG,
    compliantPantry.onBikeLiquid,
    rideHours,
    lang,
    compliantPantry.onBikeSolids,
    hydrationPlan,
    fuelSplit
  );

  // Shift remaining deficit into Post-Ride Recovery as its own food item, so the recovery
  // portion keeps honest macros and the extra carbs show up as real food (Phase 5 §3).
  const recoveryCarbBonus = Math.max(0, preDeficitG - effectiveOnBikeShift);
  const preRidePantry = compliantPantry.preRide;

  const postRideItem: NutritionItem = {
    name: resolvedPostRidePantry[isFr ? 'nameFr' : 'nameEn'],
    quantity: isFr ? '1 portion de récupération' : '1 recovery portion',
    carbsGrams: resolvedPostRidePantry.carbsG,
    proteinGrams: resolvedPostRidePantry.proteinG,
    fatsGrams: 0,
    kcals: resolvedPostRidePantry.kcal,
    quantitativeLabel: isFr
      ? `${resolvedPostRidePantry.nameFr} (${resolvedPostRidePantry.carbsG} g glucides, ${resolvedPostRidePantry.proteinG} g protéines)`
      : `${resolvedPostRidePantry.nameEn} (${resolvedPostRidePantry.carbsG}g carbs, ${resolvedPostRidePantry.proteinG}g protein)`,
    portionLabel: isFr ? resolvedPostRidePantry.portionLabelFr : resolvedPostRidePantry.portionLabelEn,
    notes: isFr ? 'Glucides et protéines pour bien récupérer.' : 'Carbs and protein to help you recover.',
    isRealFoodVerified: !resolvedPostRidePantry.id.includes('shake'),
  };

  const bonusScale = preRidePantry.carbsG > 0 ? recoveryCarbBonus / preRidePantry.carbsG : 0;
  const recoveryBonusItem: NutritionItem | null =
    recoveryCarbBonus > 0
      ? {
          name: isFr ? preRidePantry.nameFr : preRidePantry.nameEn,
          quantity: isFr ? 'Portion du petit-déjeuner reportée' : 'Breakfast portion moved to recovery',
          carbsGrams: recoveryCarbBonus,
          proteinGrams: Math.round(preRidePantry.proteinG * bonusScale),
          fatsGrams: 0,
          kcals: Math.round(preRidePantry.kcal * bonusScale),
          quantitativeLabel: isFr
            ? `${preRidePantry.nameFr} (${recoveryCarbBonus} g glucides)`
            : `${preRidePantry.nameEn} (${recoveryCarbBonus}g carbs)`,
          portionLabel:
            bonusScale >= 0.75
              ? isFr
                ? preRidePantry.portionLabelFr
                : preRidePantry.portionLabelEn
              : isFr
              ? `Une demi-portion : ${preRidePantry.portionLabelFr}`
              : `Half portion: ${preRidePantry.portionLabelEn}`,
          notes: isFr
            ? 'Le petit-déjeuner que vous avez allégé, à rattraper ici.'
            : 'The breakfast you kept light, enjoyed now instead.',
          isRealFoodVerified: !preRidePantry.id.includes('gel'),
        }
      : null;

  // Dietary & allergen filter checks for Phase 4 break room items
  const dietaryFilters = storedSpecs.dietaryFilters || [];
  const isVegan = dietaryFilters.includes('vegan');
  const isGF = dietaryFilters.includes('gluten-free');
  const isDairyFree = dietaryFilters.includes('dairy-free') || isVegan;
  const isNutFree = dietaryFilters.includes('nut-free');
  const isLowFodmap = dietaryFilters.includes('low-fodmap');

  const oatsItem: NutritionItem = !hasFridge
    ? {
        name: isGF
          ? isFr
            ? 'Galette d’avoine sans gluten ou flocons minute'
            : 'Gluten-free oat bar or instant oats cup'
          : isFr
          ? 'Galette d’avoine ou flocons d’avoine minute'
          : 'Packable oat bar or instant oats cup',
        quantity: isFr ? '1 portion (65 g)' : '1 serving (65g)',
        carbsGrams: 42,
        proteinGrams: 8,
        fatsGrams: 6,
        kcals: 255,
        quantitativeLabel: isFr
          ? `${isGF ? 'Galette d’avoine sans gluten' : 'Galette d’avoine'} (65 g, 42 g glucides, 8 g protéines)`
          : `${isGF ? 'GF oat bar' : 'Packable oat bar'} (65g, 42g carbs, 8g protein)`,
        portionLabel: isFr ? '1 galette ou bol d’avoine' : '1 oat bar or instant oats cup',
        notes: isFr ? 'Se transporte dans le sac, sans frigo.' : 'Packs in your bag, no fridge needed.',
        isRealFoodVerified: true,
      }
    : {
        name: isGF
          ? isFr
            ? 'Flocons d’avoine sans gluten au lait végétal'
            : 'Certified GF overnight oats with plant milk'
          : isFr
          ? 'Flocons d’avoine préparés au lait d’avoine & chia'
          : 'Oat milk overnight oats with chia',
        quantity: isFr ? 'Bocal 250 g' : '250g jar',
        carbsGrams: 42,
        proteinGrams: 8,
        fatsGrams: 6,
        kcals: 255,
        quantitativeLabel: isFr
          ? `${isGF ? 'Avoine sans gluten' : 'Flocons d’avoine préparés'} (250 g, 42 g glucides, 8 g protéines)`
          : `${isGF ? 'GF overnight oats' : 'Oat milk overnight oats'} (250g jar, 42g carbs, 8g protein)`,
        portionLabel: isFr ? '1 bocal d’avoine préparée' : '1 jar of prepared oats',
        notes: isFr ? 'Préparé la veille, frais et rassasiant.' : 'Prepared the night before, cool and filling.',
        isRealFoodVerified: true,
      };

  const fruitItem: NutritionItem = isLowFodmap
    ? {
        name: isFr ? '1 banane ferme ou portion de fraises' : '1 firm banana or fresh strawberries',
        quantity: '120g',
        carbsGrams: 27,
        proteinGrams: 1,
        fatsGrams: 0,
        kcals: 105,
        quantitativeLabel: isFr ? '1 banane ferme (120 g, 27 g glucides)' : '1 firm banana (120g, 27g carbs)',
        portionLabel: isFr ? '1 portion de fruits frais' : '1 serving of fresh fruit',
        notes: isFr ? 'Doux pour l’estomac.' : 'Gentle on the stomach.',
        isRealFoodVerified: true,
      }
    : {
        name: isFr ? '1 pomme croquante de saison' : '1 crisp seasonal apple',
        quantity: '140g',
        carbsGrams: 19,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 75,
        quantitativeLabel: isFr ? '1 pomme croquante (140 g, 19 g glucides)' : '1 crisp apple (140g, 19g carbs)',
        portionLabel: isFr ? '1 pomme croquante fraîche' : '1 crisp fresh apple',
        notes: isFr ? 'Fruits frais et croquants.' : 'Fresh and crisp.',
        isRealFoodVerified: true,
      };

  const nutOrSeedItem: NutritionItem = isNutFree
    ? {
        name: isFr ? 'Graines de courge & tournesol grillées' : 'Toasted pumpkin & sunflower seeds',
        quantity: '20g',
        carbsGrams: 4,
        proteinGrams: 6,
        fatsGrams: 10,
        kcals: 125,
        quantitativeLabel: isFr ? 'Graines de courge & tournesol (20 g, 10 g lipides)' : 'Pumpkin & sunflower seeds (20g, 10g fats)',
        portionLabel: isFr ? '1 poignée de graines' : '1 small handful of seeds',
        notes: isFr ? 'Croquant salé, garanti sans fruits à coque.' : 'Crunchy and savory, 100% nut-free.',
        isRealFoodVerified: true,
      }
    : {
        name: isFr ? 'Cerneaux de noix' : 'Raw walnuts',
        quantity: '20g',
        carbsGrams: 3,
        proteinGrams: 3,
        fatsGrams: 13,
        kcals: 130,
        quantitativeLabel: isFr ? 'Cerneaux de noix (20 g, 13 g lipides)' : 'Walnuts (20g, 13g fats)',
        portionLabel: isFr ? '1 poignée de noix' : '1 small handful of walnuts',
        notes: isFr ? 'Une petite poignée pour accompagner le repas.' : 'A small handful alongside your meal.',
        isRealFoodVerified: true,
      };

  const breadLabelFr = isGF
    ? '1/2 pain sans gluten artisanal'
    : isLowFodmap
    ? '1/2 pain au levain d’épeautre'
    : '1/2 sandwich baguette fraîche';
  const breadLabelEn = isGF
    ? '1/2 GF artisan roll'
    : isLowFodmap
    ? '1/2 spelt sourdough roll'
    : '1/2 fresh baguette sandwich';
  const fillingLabelFr = !hasFridge
    ? isNutFree
      ? 'purée de graines de tournesol & concombre'
      : 'purée d’amandes ou beurre de cacahuète'
    : isLowFodmap
    ? isVegan
      ? 'tofu grillé & concombre'
      : isDairyFree
      ? 'dinde rôtie & concombre'
      : 'dinde ou comté affiné'
    : isVegan
    ? 'avocat & houmous'
    : 'dinde ou avocat';
  const fillingLabelEn = !hasFridge
    ? isNutFree
      ? 'sunflower seed spread & cucumber'
      : 'almond or peanut butter'
    : isLowFodmap
    ? isVegan
      ? 'grilled tofu & cucumber'
      : isDairyFree
      ? 'roast turkey & cucumber'
      : 'turkey or aged comté'
    : isVegan
    ? 'avocado & hummus'
    : 'turkey or avocado';

  const sandwichItem: NutritionItem = {
    name: isFr ? `${breadLabelFr} (${fillingLabelFr})` : `${breadLabelEn} (${fillingLabelEn})`,
    quantity: isFr ? '100 g (demi-sandwich)' : '100g half sandwich',
    carbsGrams: 36,
    proteinGrams: isVegan ? 10 : 14,
    fatsGrams: 5,
    kcals: 245,
    quantitativeLabel: isFr
      ? `${breadLabelFr} (100 g, 36 g glucides, ${isVegan ? '10 g' : '14 g'} protéines)`
      : `${breadLabelEn} (100g, 36g carbs, ${isVegan ? '10g' : '14g'} protein)`,
    portionLabel: isFr ? '1 demi-sandwich frais' : '1 half fresh sandwich',
    notes: isFr ? 'Une part salée pour tenir toute la matinée.' : 'Something savory to keep you going through the morning.',
    isRealFoodVerified: true,
  };

  const coffeeItem: NutritionItem = {
    name: isFr ? 'Café filtre ou thé chaud' : 'Filter coffee or hot tea',
    quantity: isFr ? 'Tasse 200 ml' : '200ml mug',
    carbsGrams: 0,
    proteinGrams: 0,
    fatsGrams: 0,
    kcals: 2,
    quantitativeLabel: isFr ? 'Café filtre ou thé (200 ml)' : 'Filter coffee or tea (200ml mug)',
    portionLabel: isFr ? '1 tasse de café ou thé' : '1 mug of coffee or tea',
    notes: isFr ? 'Une boisson chaude pour bien démarrer la journée.' : 'A warm drink as you ease into the day.',
    isRealFoodVerified: true,
  };

  // Timeline clock windows derived dynamically
  const solved = options?.solvedTimeline;
  const resolvedDeparture = solved?.departureTimeHHMM ?? departureTime;
  const resolvedArrival = solved?.arrivalTimeHHMM ?? lockerArrivalTime;
  const preBufferMin = preRideStyle === 'full-breakfast' ? 45 : preRideStyle === 'light-liquid' ? 20 : 15;
  const resolvedPreRideWindow = solved?.preRideWindow ?? `${subtractMinutesFromTime(resolvedDeparture, preBufferMin)} – ${resolvedDeparture}`;
  const resolvedPostRideImmediateWindow = solved?.postRideImmediateWindow ?? `${resolvedArrival} – ${addMinutesToTime(resolvedArrival, 10)}`;
  const resolvedPostRideMealWindow = solved?.postRideMealWindow ?? `${breakRoomTime} – ${addMinutesToTime(breakRoomTime, 15)}`;
  const resolvedPostRideConsolidatedWindow = solved?.postRideConsolidatedWindow ?? `${addMinutesToTime(resolvedArrival, 10)} – ${addMinutesToTime(resolvedArrival, 30)}`;

  const stage1Location = logistics?.stage1LocationLabel || (isFr ? 'Destination / Vestiaire' : 'Destination / Locker');
  const stage2Location = logistics?.stage2LocationLabel || (isFr ? 'Salle de Pause / Espace Bureau' : 'Break Room / Workspace');

  const phases: NutritionPhase[] = [
    {
      phaseId: 'pre-ride',
      title: isFr
        ? preRideStyle === 'fasted-rollout'
          ? 'Départ léger & hydratation'
          : preRideStyle === 'light-liquid'
          ? 'Petite boisson avant de partir (T − 20 min)'
          : 'Petit-déjeuner avant de partir'
        : preRideStyle === 'fasted-rollout'
        ? 'Light start & hydration'
        : preRideStyle === 'light-liquid'
        ? 'Quick drink before you leave (T − 20 min)'
        : 'Breakfast before you ride',
      timeWindow: resolvedPreRideWindow,
      location: isFr ? 'Domicile' : 'Home',
      rules: isFr
        ? preRideStyle === 'fasted-rollout'
          ? 'Un café et un grand verre d’eau avant de partir, puis vous mangerez en route.'
          : preRideStyle === 'light-liquid'
          ? 'Une boisson légère 20 min avant de partir, facile à digérer.'
          : 'Un repas simple et digeste avant de prendre la route.'
        : preRideStyle === 'fasted-rollout'
        ? 'A coffee and a tall glass of water before you leave, then eat once you’re rolling.'
        : preRideStyle === 'light-liquid'
        ? 'A light drink 20 min before you leave, easy on the stomach.'
        : 'A simple, easy-to-digest meal before you head out.',
      items: phase1Items,
    },
    {
      phaseId: 'on-bike',
      title:
        finalOnBikeCarbsG === 0
          ? isFr
            ? 'Hydratation en selle (< 45 min)'
            : 'On-bike hydration (< 45 min)'
          : pref === 'sports-fuel'
          ? isFr
            ? `Ravito sportif en selle (${effectiveHourlyRateG} g/h)`
            : `On-bike sports fueling (${effectiveHourlyRateG}g/h)`
          : pref === 'mixed'
          ? isFr
            ? `Ravito mixte en selle (${effectiveHourlyRateG} g/h)`
            : `On-bike mixed fueling (${effectiveHourlyRateG}g/h)`
          : isFr
          ? `Ravito naturel en selle (${effectiveHourlyRateG} g/h)`
          : `On-bike real-food fueling (${effectiveHourlyRateG}g/h)`,
      timeWindow: isFr ? 'Du départ à l’arrivée (boire toutes les 15-20 min)' : 'Rollout to arrival (sip every 15-20 min)',
      location: isFr ? 'Sur la route' : 'On the road',
      rules:
        finalOnBikeCarbsG === 0
          ? isFr
            ? 'Sortie courte : vos réserves suffisent. Un bidon d’eau suffit pour la route.'
            : 'Short ride: your natural reserves are plenty. Plain water is all you need on the bike.'
          : pref === 'sports-fuel'
          ? isFr
            ? `Calibré selon votre confort digestif (${effectiveHourlyRateG} g/h) : boisson glucidique et gels d’appoint.`
            : `Tuned to your digestion comfort (${effectiveHourlyRateG}g/h): drink mix and pocket gels.`
          : pref === 'mixed'
          ? isFr
            ? `Calibré sur ${effectiveHourlyRateG} g/h : vrais aliments pour rouler au train + 1 collation rapide pour les côtes.`
            : `Tuned to ${effectiveHourlyRateG}g/h: real food for steady riding + 1 quick snack for the climbs.`
          : isFr
          ? `Calibré sur ${effectiveHourlyRateG} g/h avec des aliments simples et faciles à emporter.`
          : `Tuned to ${effectiveHourlyRateG}g/h with simple, easy-to-carry foods.`,
      items: onBikeItems,
    },
  ];

  if (isSplitRecovery) {
    phases.push(
      {
        phaseId: 'locker-refuel',
        title: isFr ? `Phase 1 : ${stage1Location}` : `Phase 1: ${stage1Location}`,
        timeWindow: resolvedPostRideImmediateWindow,
        location: stage1Location,
        rules: isFr
          ? 'Recharge immédiate post-effort. Consommation rapide avant la douche.'
          : 'Immediate post-effort replenishment. Consumed upon arrival before shower.',
        items: [postRideItem],
      },
      {
        phaseId: 'break-room',
        title: isFr ? `Phase 2 : ${stage2Location}` : `Phase 2: ${stage2Location}`,
        timeWindow: resolvedPostRideMealWindow,
        location: stage2Location,
        rules: isFr
          ? 'Petit-déjeuner ou collation partagée à l’espace de travail.'
          : 'Relaxed breakfast or meal before starting workday / daily activity.',
        items: [oatsItem, fruitItem, nutOrSeedItem, sandwichItem, coffeeItem, ...(recoveryBonusItem ? [recoveryBonusItem] : [])],
      }
    );
  } else {
    phases.push({
      phaseId: 'arrival-recovery',
      title: isFr ? `Repas Récupérateur d’Arrivée (${stage1Location})` : `Arrival Recovery Meal (${stage1Location})`,
      timeWindow: resolvedPostRideConsolidatedWindow,
      location: stage1Location,
      rules: isFr
        ? 'Repas complet et équilibré à destination (recharge glycogène + protéines complètes).'
        : 'Consolidated recovery meal at destination (glycogen resynthesis + complete protein).',
      items: [postRideItem, ...(recoveryBonusItem ? [recoveryBonusItem] : []), sandwichItem, fruitItem, nutOrSeedItem, coffeeItem],
    });
  }

  return phases;
}

// Helpers for timeline math
export function subtractMinutesFromTime(timeStr: string, minutesToSub: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  let totalMin = h * 60 + m - minutesToSub;
  while (totalMin < 0) totalMin += 1440;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  let totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}
