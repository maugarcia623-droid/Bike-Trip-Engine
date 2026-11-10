import { NutritionPhase, NutritionItem, LogisticsSettings } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';
import { loadRiderBikeSpecs } from './specsStorage';
import {
  PantryItem,
  ResolvedCompliantPantry,
  resolveCompliantPantry,
  DEFAULT_PANTRY_CATALOG,
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
  solidItems?: PantryItem[]
): NutritionItem[] {
  const isFr = lang === 'fr';

  if (targetOnBikeCarbsG <= 0) {
    return [
      {
        name: isFr ? 'Eau Pure & Électrolytes' : 'Pure Water & Electrolytes',
        quantity: isFr ? '1x Bidon 500 ml' : '1x 500ml bidon',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau pure & électrolytes (0g C)' : 'Pure water & electrolytes (0g C)',
        portionLabel: isFr ? '1 bidon d’eau' : '1 bottle water',
        notes: isFr ? 'Hydratation seule pour sortie courte (< 45 min).' : 'Hydration only for short ride (< 45m).',
        isRealFoodVerified: true,
      },
    ];
  }

  // Dynamic Personal Pantry mode (PantryItem passed for liquid)
  if (typeof preferenceOrLiquid !== 'string') {
    const liquidItem = preferenceOrLiquid;
    const items: NutritionItem[] = [];

    // Liquid allocation: 50% for high-carb mixes (>=50g C or maltodextrin/cluster dextrin), 35% for fruit juices
    const isHighCarb =
      liquidItem.carbsG >= 50 ||
      liquidItem.id.includes('maltodextrin') ||
      liquidItem.id.includes('isotonic');
    const liquidShare = isHighCarb ? 0.5 : 0.35;
    const liquidUnits = Math.max(1, Math.round((targetOnBikeCarbsG * liquidShare) / Math.max(1, liquidItem.carbsG)));

    items.push({
      name: isFr ? liquidItem.nameFr : liquidItem.nameEn,
      quantity: isFr ? `${liquidUnits}x Bidon 650 ml` : `${liquidUnits}x 650ml bidon`,
      carbsGrams: liquidUnits * liquidItem.carbsG,
      proteinGrams: liquidUnits * liquidItem.proteinG,
      fatsGrams: 0,
      kcals: liquidUnits * liquidItem.kcal,
      quantitativeLabel: isFr
        ? `${liquidItem.nameFr} (${liquidUnits * liquidItem.carbsG}g C)`
        : `${liquidItem.nameEn} (${liquidUnits * liquidItem.carbsG}g C)`,
      portionLabel: isFr
        ? `${liquidUnits} ${liquidUnits > 1 ? 'bidons' : 'bidon'} ${liquidItem.portionLabelFr}`
        : `${liquidUnits} ${liquidUnits > 1 ? 'bottles' : 'bottle'} ${liquidItem.portionLabelEn}`,
      notes: isFr
        ? 'Assimilation hydrique et minérale continue.'
        : 'Smooth on-bike hydration and mineral intake.',
      isRealFoodVerified:
        !liquidItem.id.includes('gel') &&
        !liquidItem.id.includes('isotonic') &&
        !liquidItem.id.includes('maltodextrin'),
    });

    let remainingSolidCarbs = Math.max(0, targetOnBikeCarbsG - liquidUnits * liquidItem.carbsG);
    const solids = solidItems && solidItems.length > 0 ? solidItems : [];

    for (let idx = 0; idx < solids.length; idx++) {
      const item = solids[idx];
      if (!item || item.carbsG <= 0) continue;
      const isLast = idx === solids.length - 1;
      const slotsRemaining = solids.length - idx;
      const slotTarget = remainingSolidCarbs / slotsRemaining;
      let units = Math.max(0, Math.round(slotTarget / item.carbsG));

      // Guarantee minimum 1 unit if significant unallocated carbs remain on the final item
      if (isLast && remainingSolidCarbs >= item.carbsG * 0.4 && units === 0) {
        units = 1;
      }

      if (units > 0) {
        remainingSolidCarbs = Math.max(0, remainingSolidCarbs - units * item.carbsG);
        items.push({
          name: isFr ? item.nameFr : item.nameEn,
          quantity: isFr ? `${units} portion${units > 1 ? 's' : ''}` : `${units} serving${units > 1 ? 's' : ''}`,
          carbsGrams: units * item.carbsG,
          proteinGrams: units * item.proteinG,
          fatsGrams: 0,
          kcals: units * item.kcal,
          quantitativeLabel: isFr
            ? `${item.nameFr} (${units * item.carbsG}g C)`
            : `${item.nameEn} (${units * item.carbsG}g C)`,
          portionLabel:
            units === 1
              ? isFr
                ? item.portionLabelFr
                : item.portionLabelEn
              : `${units}x ${isFr ? item.portionLabelFr : item.portionLabelEn}`,
          notes: isFr
            ? item.flavor === 'savory'
              ? 'Apport salé anti-saturation sucrée.'
              : 'Recharge glucidique digeste.'
            : item.flavor === 'savory'
            ? 'Savory fuel to prevent sweet palate fatigue.'
            : 'Digestible carbohydrate replenishment.',
          isRealFoodVerified:
            !item.id.includes('gel') &&
            !item.id.includes('isotonic') &&
            !item.id.includes('maltodextrin'),
        });
      }
    }

    return items;
  }

  // Legacy fallback when string preference is passed
  const preference = preferenceOrLiquid as 'real-food' | 'mixed' | 'sports-fuel';

  const counts = getBottomUpPortionCounts(targetOnBikeCarbsG, preference, rideHours);
  const items: NutritionItem[] = [];

  if (preference === 'sports-fuel') {
    if (counts.isoBidons > 0) {
      items.push({
        name: isFr ? 'Boisson Glucidique Isotonique + Électrolytes' : 'Isotonic Carb Drink Mix + Electrolytes',
        quantity: isFr ? `${counts.isoBidons}x Bidon 650 ml` : `${counts.isoBidons}x 650ml bidon`,
        carbsGrams: counts.isoBidons * ISOTONIC_SCOOP_BIDON.carbsG,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: counts.isoBidons * ISOTONIC_SCOOP_BIDON.kcal,
        quantitativeLabel: isFr
          ? `Boisson glucidique isotonique (${counts.isoBidons * ISOTONIC_SCOOP_BIDON.carbsG}g C)`
          : `Isotonic carb mix (${counts.isoBidons * ISOTONIC_SCOOP_BIDON.carbsG}g C)`,
        portionLabel: isFr
          ? `${counts.isoBidons} ${counts.isoBidons > 1 ? 'bidons' : 'bidon'} d'eau & électrolytes`
          : `${counts.isoBidons} ${counts.isoBidons > 1 ? 'bottles' : 'bottle'} hydration drink`,
        notes: isFr ? 'Assimilation liquide rapide sans mastication.' : 'Rapid liquid gastric uptake without chewing.',
        isRealFoodVerified: false,
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
    items.push({
      name: isFr ? '50/50 Eau & Pur Jus de Pomme/Raisin Pressé' : '50/50 Water & 100% Pressed Apple/Grape Juice',
      quantity: isFr ? `${counts.juiceBidons}x Bidon 650 ml` : `${counts.juiceBidons}x 650ml bidon`,
      carbsGrams: counts.juiceBidons * JUICE_BIDON_650ML.carbsG,
      proteinGrams: 0,
      fatsGrams: 0,
      kcals: counts.juiceBidons * JUICE_BIDON_650ML.kcal,
      quantitativeLabel: isFr
        ? `50/50 eau & pur jus pressé (${counts.juiceBidons * JUICE_BIDON_650ML.carbsG}g C)`
        : `50/50 water & 100% pressed juice (${counts.juiceBidons * JUICE_BIDON_650ML.carbsG}g C)`,
      portionLabel: isFr
        ? `${counts.juiceBidons} ${counts.juiceBidons > 1 ? 'bidons' : 'bidon'} jus naturel dilué`
        : `${counts.juiceBidons} ${counts.juiceBidons > 1 ? 'bottles' : 'bottle'} diluted fruit juice`,
      notes: isFr ? 'Solution isotonique naturelle ~6 % de glucides.' : 'Isotonic ~6% natural carbohydrate solution, effortless stomach transit.',
      isRealFoodVerified: true,
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
          ? 'Élixir Glucidique Léger & Minéraux (Pur Jus ou Eau d’Érable)'
          : 'Light Liquid Carb Primer (Pure Juice or Salted Maple Water)',
        quantity: '250ml',
        carbsGrams: 28,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 115,
        quantitativeLabel: isFr
          ? 'Élixir glucidique léger (250ml, 28g C)'
          : 'Light liquid carb primer (250ml, 28g C)',
        portionLabel: isFr ? '1 petit verre de jus ou boisson légère' : '1 small glass juice or light primer',
        notes: isFr ? 'Assimilation immédiate en T-20m, digestion ultra-légère.' : 'Instant cellular uptake at T-20m, ultra-light digestion.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Double Ristretto / Expresso' : 'Double Ristretto / Espresso',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60ml, ~140mg caféine)' : 'Double espresso (60ml, ~140mg caffeine)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? '~140 mg caféine, éveil cognitif.' : '~140mg caffeine, alertness and focus.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau de Source + Pincée de Sel de Guérande' : 'Spring Water with Pinch of Celtic Salt',
        quantity: '300ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau de source + sel (300ml)' : 'Spring water with salt pinch (300ml)',
        portionLabel: isFr ? "1 grand verre d'eau salée" : '1 large glass water & trace minerals',
        notes: isFr ? 'Pré-hydratation avec électrolytes naturels.' : 'Pre-hydration volume with trace electrolytes.',
        isRealFoodVerified: true,
      },
    ];
  } else if (preRideStyle === 'fasted-rollout') {
    // Fasted rollout: 0g carbs
    preDeficitG = basePreRideCarbs; // 62g
    phase1Items = [
      {
        name: isFr ? 'Double Ristretto / Expresso (Amorce Métabolique)' : 'Double Ristretto / Espresso (Metabolic Primer)',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60ml, ~140mg caféine, 0g C)' : 'Double espresso (60ml, ~140mg caffeine, 0g C)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? 'Stimulation de l’oxydation lipidique sans charge gastrique.' : 'Stimulates fat oxidation with zero gastric volume.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau de Source + Pincée de Sel de Guérande' : 'Spring Water with Pinch of Celtic Salt',
        quantity: '350ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau de source + sel (350ml)' : 'Spring water with salt pinch (350ml)',
        portionLabel: isFr ? "1 grand verre d'eau salée" : '1 large glass water & trace minerals',
        notes: isFr ? 'Volémie plasmatique et électrolytes sans calories.' : 'Plasma volume support with zero calories.',
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
          ? `${compliantPantry.preRide.nameFr} (${compliantPantry.preRide.carbsG}g C, ${compliantPantry.preRide.proteinG}g P)`
          : `${compliantPantry.preRide.nameEn} (${compliantPantry.preRide.carbsG}g C, ${compliantPantry.preRide.proteinG}g P)`,
        portionLabel: isFr ? compliantPantry.preRide.portionLabelFr : compliantPantry.preRide.portionLabelEn,
        notes: isFr ? 'Vidange gastrique rapide, sans fibres irritantes.' : 'Rapid gastric emptying, gentle on digestion.',
        isRealFoodVerified: !compliantPantry.preRide.id.includes('gel'),
      },
      {
        name: isFr ? 'Double Ristretto / Expresso' : 'Double Ristretto / Espresso',
        quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 5,
        quantitativeLabel: isFr ? 'Double expresso (60ml, ~140mg caféine)' : 'Double espresso (60ml, ~140mg caffeine)',
        portionLabel: isFr ? '1 café ou expresso' : '1 coffee or espresso',
        notes: isFr ? '~140 mg caféine, éveil cognitif.' : '~140mg caffeine, alertness and focus.',
        isRealFoodVerified: true,
      },
      {
        name: isFr ? 'Eau de Source + Pincée de Sel de Guérande' : 'Spring Water with Pinch of Celtic Salt',
        quantity: '300ml',
        carbsGrams: 0,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 0,
        quantitativeLabel: isFr ? 'Eau de source + sel (300ml)' : 'Spring water with salt pinch (300ml)',
        portionLabel: isFr ? "1 grand verre d'eau salée" : '1 large glass water & trace minerals',
        notes: isFr ? 'Pré-hydratation avec électrolytes naturels.' : 'Pre-hydration volume with trace electrolytes.',
        isRealFoodVerified: true,
      },
    ];
  }

  // Shift 50% of deficit into Phase 2 on-bike fueling (clamped by effectiveCeilingGPerHr * rideHours)
  const onBikeShiftWanted = Math.round(preDeficitG * 0.50);
  const maxOnBikeCarbs = Math.max(25, Math.round(effectiveCeilingGPerHr * rideHours));
  const maxShiftAllowed = Math.max(0, maxOnBikeCarbs - targetOnBikeCarbsG);
  const effectiveOnBikeShift = Math.min(onBikeShiftWanted, maxShiftAllowed);

  const finalOnBikeCarbsG = targetOnBikeCarbsG + effectiveOnBikeShift;

  const onBikeItems = allocatePhase2OnBikeItems(
    finalOnBikeCarbsG,
    compliantPantry.onBikeLiquid,
    rideHours,
    lang,
    compliantPantry.onBikeSolids
  );

  // Shift remaining deficit into Post-Ride Recovery
  const recoveryCarbBonus = preDeficitG - effectiveOnBikeShift;
  const postRideCarbs = resolvedPostRidePantry.carbsG + recoveryCarbBonus;
  const postRideKcal = resolvedPostRidePantry.kcal + recoveryCarbBonus * 4;

  const postRideItem: NutritionItem = {
    name: resolvedPostRidePantry[isFr ? 'nameFr' : 'nameEn'],
    quantity: isFr ? '1 portion de récupération' : '1 recovery portion',
    carbsGrams: postRideCarbs,
    proteinGrams: resolvedPostRidePantry.proteinG,
    fatsGrams: 0,
    kcals: postRideKcal,
    quantitativeLabel: isFr
      ? `${resolvedPostRidePantry.nameFr} (${postRideCarbs}g C, ${resolvedPostRidePantry.proteinG}g P)`
      : `${resolvedPostRidePantry.nameEn} (${postRideCarbs}g C, ${resolvedPostRidePantry.proteinG}g P)`,
    portionLabel: isFr ? resolvedPostRidePantry.portionLabelFr : resolvedPostRidePantry.portionLabelEn,
    notes:
      recoveryCarbBonus > 0
        ? isFr
          ? `Recharge majorée (+${recoveryCarbBonus}g C) compensant le départ léger.`
          : `Boosted recovery (+${recoveryCarbBonus}g C) replenishing early morning deficit.`
        : isFr
        ? 'Recharge immédiate du glycogène et synthèse protéique.'
        : 'Immediate glycogen resynthesis and protein recovery.',
    isRealFoodVerified: !resolvedPostRidePantry.id.includes('shake'),
  };

  // Dietary & allergen filter checks for Phase 4 break room items
  const dietaryFilters = storedSpecs.dietaryFilters || [];
  const isVegan = dietaryFilters.includes('vegan');
  const isGF = dietaryFilters.includes('gluten-free');
  const isNutFree = dietaryFilters.includes('nut-free');
  const isLowFodmap = dietaryFilters.includes('low-fodmap');

  const oatsItem: NutritionItem = {
    name: isGF
      ? isFr
        ? "Flocons d'Avoine Sans Gluten au Lait Végétal"
        : 'Certified GF Overnight Oats with Plant Milk'
      : isFr
      ? "Overnight Oats au Lait d'Avoine & Chia"
      : 'Oat Milk Overnight Oats with Chia',
    quantity: isFr ? 'Bocal 250 g' : '250g jar',
    carbsGrams: 42,
    proteinGrams: 8,
    fatsGrams: 6,
    kcals: 255,
    quantitativeLabel: isFr
      ? `${isGF ? 'Oats sans gluten' : "Overnight oats au lait d'avoine"} (250g, 42g C, 8g P)`
      : `${isGF ? 'GF overnight oats' : 'Oat milk overnight oats'} (250g jar, 42g C, 8g P)`,
    portionLabel: isFr ? "1 bocal d'avoine préparée" : '1 jar prepared oats',
    notes: isFr ? 'Fibres bêta-glucanes infusées à froid.' : 'Beta-glucan complex fibers soaked overnight in oat milk.',
    isRealFoodVerified: true,
  };

  const fruitItem: NutritionItem = isLowFodmap
    ? {
        name: isFr ? '1 Banane Ferme ou Portion de Fraises' : '1 Firm Banana or Fresh Strawberries',
        quantity: '120g',
        carbsGrams: 27,
        proteinGrams: 1,
        fatsGrams: 0,
        kcals: 105,
        quantitativeLabel: isFr ? '1 banane ferme (120g, 27g C)' : '1 firm banana (120g, 27g C)',
        portionLabel: isFr ? '1 portion de fruits frais' : '1 serving fresh fruit',
        notes: isFr ? 'Faible en FODMAP, énergie douce.' : 'Low-FODMAP, gentle on stomach.',
        isRealFoodVerified: true,
      }
    : {
        name: isFr ? '1 Pomme Granny Smith Croquante' : '1 Whole Crisp Grated Granny Smith Apple',
        quantity: '140g',
        carbsGrams: 19,
        proteinGrams: 0,
        fatsGrams: 0,
        kcals: 75,
        quantitativeLabel: isFr ? '1 pomme Granny Smith (140g, 19g C)' : '1 crisp Granny Smith apple (140g, 19g C)',
        portionLabel: isFr ? '1 pomme croquante fraîche' : '1 crisp fresh apple',
        notes: isFr ? 'Fraîcheur acide malique et pectine.' : 'Tart malic acid freshness, pectin, enzymes.',
        isRealFoodVerified: true,
      };

  const nutOrSeedItem: NutritionItem = isNutFree
    ? {
        name: isFr ? 'Graines de Courge & Tournesol Grillées' : 'Toasted Pumpkin & Sunflower Seeds',
        quantity: '20g',
        carbsGrams: 4,
        proteinGrams: 6,
        fatsGrams: 10,
        kcals: 125,
        quantitativeLabel: isFr ? 'Graines de courge & tournesol (20g, 10g lipides)' : 'Pumpkin & sunflower seeds (20g, 10g fats)',
        portionLabel: isFr ? '1 poignée de graines' : '1 small handful seeds',
        notes: isFr ? 'Minéraux et acides gras sains sans allergènes.' : 'Rich in zinc, magnesium, and healthy fats (100% nut-free).',
        isRealFoodVerified: true,
      }
    : {
        name: isFr ? 'Cerneaux de Noix Concassés' : 'Lightly Crushed Raw Walnuts',
        quantity: '20g',
        carbsGrams: 3,
        proteinGrams: 3,
        fatsGrams: 13,
        kcals: 130,
        quantitativeLabel: isFr ? 'Cerneaux de noix concassés (20g, 13g lipides)' : 'Lightly crushed walnuts (20g, 13g fats)',
        portionLabel: isFr ? '1 poignée de noix' : '1 small handful walnuts',
        notes: isFr ? 'Oméga-3 ALA anti-inflammatoires.' : 'Omega-3 ALA nutrients and healthy fats.',
        isRealFoodVerified: true,
      };

  const sandwichItem: NutritionItem = {
    name: isGF
      ? isVegan
        ? isFr
          ? '1/2 Pain Sans Gluten Artisanal (Avocat & Houmous)'
          : '1/2 GF Artisan Roll (Avocado & Hummus)'
        : isFr
        ? '1/2 Pain Sans Gluten Artisanal (Dinde ou Avocat)'
        : '1/2 GF Artisan Roll (Turkey or Avocado)'
      : isVegan
      ? isFr
        ? '1/2 Sandwich Baguette Fraîche (Avocat & Houmous)'
        : '1/2 Fresh Baguette Sandwich (Avocado & Hummus)'
      : isFr
      ? '1/2 Sandwich Baguette Fraîche (Dinde ou Avocat)'
      : '1/2 Fresh Baguette Sandwich (Turkey or Avocado)',
    quantity: isFr ? '100 g (demi-baguette)' : '100g half sandwich',
    carbsGrams: 36,
    proteinGrams: isVegan ? 10 : 14,
    fatsGrams: 5,
    kcals: 245,
    quantitativeLabel: isFr
      ? `1/2 sandwich ${isGF ? 'sans gluten' : 'baguette'} (100g, 36g C, ${isVegan ? '10g' : '14g'} P)`
      : `1/2 ${isGF ? 'GF roll' : 'fresh baguette'} sandwich (100g, 36g C, ${isVegan ? '10g' : '14g'} P)`,
    portionLabel: isFr ? '1 demi-sandwich frais' : '1 half fresh sandwich',
    notes: isFr ? 'Satiété salée et énergie stable toute la matinée.' : 'Savory satiation and sustained energy for the morning.',
    isRealFoodVerified: true,
  };

  const coffeeItem: NutritionItem = {
    name: isFr ? 'Café Filtre ou Allongé' : 'Fresh Office Filter Coffee or Long Black',
    quantity: isFr ? 'Tasse 200 ml' : '200ml mug',
    carbsGrams: 0,
    proteinGrams: 0,
    fatsGrams: 0,
    kcals: 2,
    quantitativeLabel: isFr ? 'Café filtre de bureau (200ml)' : 'Office filter coffee (200ml mug)',
    portionLabel: isFr ? '1 tasse de café ou thé' : '1 mug coffee or tea',
    notes: isFr ? 'Vigilance cognitive avant le début de journée.' : 'Alertness and comfort before the morning sync.',
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
          ? 'Amorce à Jeun & Hydratation'
          : preRideStyle === 'light-liquid'
          ? 'Collation Liquide Rapide (T-20m)'
          : 'Petit-Déjeuner Pré-Sortie'
        : preRideStyle === 'fasted-rollout'
        ? 'Fasted Primer & Hydration'
        : preRideStyle === 'light-liquid'
        ? 'Light Liquid Primer (T-20m)'
        : 'Pre-Ride Breakfast',
      timeWindow: resolvedPreRideWindow,
      location: isFr ? 'Cuisine Domicile' : 'Home Kitchen',
      rules: isFr
        ? preRideStyle === 'fasted-rollout'
          ? 'Amorce métabolique sans calories solides. Hydratation et caféine uniquement.'
          : preRideStyle === 'light-liquid'
          ? 'Glucides liquides légers à absorption ultra-rapide 20 min avant le départ.'
          : 'Glucides digestes à assimilation douce, zéro graisses lourdes, confort digestif maximal. Terminer avant le départ.'
        : preRideStyle === 'fasted-rollout'
        ? 'Metabolic primer without solid calories. Pure hydration and espresso only.'
        : preRideStyle === 'light-liquid'
        ? 'Rapid liquid carbohydrate uptake 20 min before rollout, effortless transit.'
        : 'Gentle easily digestible carbs, zero heavy fats, high gastro-comfort. Complete before rollout.',
      items: phase1Items,
    },
    {
      phaseId: 'on-bike',
      title:
        finalOnBikeCarbsG === 0
          ? isFr
            ? 'Hydratation en Selle (< 45 min)'
            : 'On-Bike Hydration (< 45m)'
          : pref === 'sports-fuel'
          ? isFr
            ? `Ravito Sportif en Selle (${effectiveHourlyRateG} g/h)`
            : `On-Bike Sports Fueling (${effectiveHourlyRateG}g/h)`
          : pref === 'mixed'
          ? isFr
            ? `Ravito Hybride en Selle (${effectiveHourlyRateG} g/h)`
            : `On-Bike Mixed Fueling (${effectiveHourlyRateG}g/h)`
          : isFr
          ? `Ravito Naturel en Selle (${effectiveHourlyRateG} g/h)`
          : `On-Bike Real-Food Fueling (${effectiveHourlyRateG}g/h)`,
      timeWindow: isFr ? 'Du départ à l’arrivée (boire toutes les 15-20 min)' : 'Rollout to Arrival (sip every 15-20 min)',
      location: isFr ? 'En Route / Cockpit' : 'On Route / Cockpit',
      rules:
        finalOnBikeCarbsG === 0
          ? isFr
            ? 'Sortie courte : les réserves hépatiques et musculaires suffisent. Hydratation à l’eau claire uniquement.'
            : 'Short ride: liver and muscular glycogen are sufficient. Hydration with plain water only.'
          : pref === 'sports-fuel'
          ? isFr
            ? `Calibré sur votre tolérance digestive (${effectiveHourlyRateG} g/h) : boisson isotonique + gels d'appoint.`
            : `Calibrated to your gut comfort (${effectiveHourlyRateG}g/h): isotonic drink mix + supportive gels.`
          : pref === 'mixed'
          ? isFr
            ? `Calibré sur ${effectiveHourlyRateG} g/h : aliments naturels en croisière + 1 collation de secours pour les bosses.`
            : `Calibrated to ${effectiveHourlyRateG}g/h: whole foods for steady cruising + 1 pocket backup for climbs.`
          : isFr
          ? `Calibré sur ${effectiveHourlyRateG} g/h — énergie naturelle, sucres de fruits bruts uniquement.`
          : `Calibrated to ${effectiveHourlyRateG}g/h — pure whole-food sugars and natural energy.`,
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
        items: [oatsItem, fruitItem, nutOrSeedItem, sandwichItem, coffeeItem],
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
      items: [postRideItem, sandwichItem, fruitItem, nutOrSeedItem, coffeeItem],
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
