import { NutritionPhase, NutritionItem } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';
import { loadRiderBikeSpecs } from './specsStorage';

/**
 * Canonical per-unit nutritional constants for discrete bottom-up fueling allocation.
 */
export const JUICE_BIDON_650ML = { carbsG: 36, kcal: 145 } as const;
export const MEDJOOL_DATE = { carbsG: 17, kcal: 68 } as const;
export const FRUIT_CHEW_PIECE = { carbsG: 12, kcal: 48 } as const;
export const ENERGY_GEL_UNIT = { carbsG: 25, kcal: 100 } as const;
export const ISOTONIC_SCOOP_BIDON = { carbsG: 36, kcal: 144 } as const;

export interface DynamicCarbTargetResult {
  effectiveHourlyRateG: number;
  targetOnBikeCarbsG: number;
}

/**
 * Calculates intensity-modulated carb targeting (Upgraded EQ-13).
 * Scales recommended hourly intake dynamically based on %FTP, metabolic demand,
 * and ride duration, respecting the gut ceiling.
 */
export function calculateDynamicCarbTarget(
  rideHours: number,
  pctFtp: number,
  carbOxidationGramPerHour: number,
  gutCeilingGPerHr: number,
  totalDays: number = 1
): DynamicCarbTargetResult {
  // Short-Ride Cutoff: Under 45m on a single-day ride requires no on-bike carbs
  if (rideHours < 0.75 && totalDays === 1) {
    return { effectiveHourlyRateG: 0, targetOnBikeCarbsG: 0 };
  }

  // Duration Factor: Scales exogenous carb reliance over duration
  const durationFactor = Math.min(1.0, Math.max(0.55, 0.45 + 0.18 * rideHours));

  // Exogenous Share: Scales with physiological intensity (%FTP)
  const exoShare = Math.min(0.75, Math.max(0.35, 0.25 + (pctFtp / 100) * 0.45));

  // Raw Metabolic Demand: Required exogenous carbohydrates per hour
  const rawDemandGPerHr = Math.round(carbOxidationGramPerHour * exoShare * durationFactor);

  // Ceiling Clamp with Emergency Over-Threshold Surge for %FTP > 105%
  const effectiveCap = pctFtp > 105 ? gutCeilingGPerHr + 20 : gutCeilingGPerHr;
  const effectiveHourlyRateG = Math.min(effectiveCap, Math.max(25, rawDemandGPerHr));
  const targetOnBikeCarbsG = Math.max(25, Math.round(effectiveHourlyRateG * rideHours));

  return { effectiveHourlyRateG, targetOnBikeCarbsG };
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
 */
export function allocatePhase2OnBikeItems(
  targetOnBikeCarbsG: number,
  preference: 'real-food' | 'mixed' | 'sports-fuel',
  rideHours: number,
  lang: Language = getCurrentLanguage()
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
}

/**
 * Returns the 4-phase Nutrition Protocol scaled dynamically with intensity-modulated
 * carbohydrate targeting and bottom-up discrete portion allocation.
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

  // Use physiological intensity if available, otherwise baseline Zone 2
  const pctFtp = options?.pctFtp ?? 72;
  const carbOxidation = options?.carbOxidationGramPerHour ?? Math.round(gutCeilingGPerHr * 1.8);

  const { effectiveHourlyRateG, targetOnBikeCarbsG } = calculateDynamicCarbTarget(
    rideHours,
    pctFtp,
    carbOxidation,
    gutCeilingGPerHr,
    totalDays
  );

  const onBikeItems = allocatePhase2OnBikeItems(targetOnBikeCarbsG, pref, rideHours, lang);

  return [
    {
      phaseId: 'pre-ride',
      title: isFr ? 'Petit-Déjeuner Pré-Sortie' : 'Pre-Ride Breakfast',
      timeWindow: `${subtractMinutesFromTime(departureTime, 45)} – ${departureTime}`,
      location: isFr ? 'Cuisine Domicile' : 'Home Kitchen',
      rules: isFr
        ? 'Glucides digestes à assimilation douce, zéro graisses lourdes, confort digestif maximal. Terminer 35-45 min avant le départ.'
        : 'Gentle easily digestible carbs, zero heavy fats, high gastro-comfort. Complete 35-45m prior to rollout.',
      items: [
        {
          name: isFr ? 'Baguette Blanche Grillée / Pain de Campagne' : 'Toasted White Baguette / Country Loaf',
          quantity: isFr ? '75 g (2 tranches)' : '75g (2 thick slices)',
          carbsGrams: 41,
          proteinGrams: 6,
          fatsGrams: 1,
          kcals: 200,
          quantitativeLabel: isFr ? 'Baguette blanche grillée (75g, 41g C)' : 'Toasted white baguette (75g, 41g C)',
          portionLabel: isFr ? '2 tranches de pain grillé' : '2 slices toasted bread',
          notes: isFr ? 'Vidange gastrique rapide, sans fibres irritantes.' : 'Rapid gastric emptying, zero resistant fiber.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? "Miel Pur d'Acacia ou de Fleurs" : 'Pure Acacia or Wildflower Honey',
          quantity: isFr ? '25 g (1,5 c.à.s)' : '25g (1.5 tbsp)',
          carbsGrams: 21,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 85,
          quantitativeLabel: isFr ? "Miel pur d'acacia (25g, 21g C)" : 'Pure wildflower honey (25g, 21g C)',
          portionLabel: isFr ? '1 cuillère de miel' : '1 spoonful honey',
          notes: isFr ? 'Ratio 50/50 glucose-fructose pour assimilation directe.' : '50/50 glucose-fructose ratio for cellular uptake.',
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
      ],
    },
    {
      phaseId: 'on-bike',
      title:
        targetOnBikeCarbsG === 0
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
        targetOnBikeCarbsG === 0
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
    {
      phaseId: 'locker-refuel',
      title: isFr ? 'Phase 1 : Ravito Vestiaire' : 'Phase 1: Locker Refuel',
      timeWindow: `${lockerArrivalTime} – ${addMinutesToTime(lockerArrivalTime, 10)}`,
      location: isFr ? 'Vestiaires Sous-Sol (Après Porte 17)' : 'Basement Locker Bay (Post-Gate 17)',
      rules: isFr
        ? 'Recharge immédiate post-effort. Consommé confortablement sur le banc du vestiaire.'
        : 'Immediate post-effort replenishment. Eaten comfortably at locker bench before shower.',
      items: [
        {
          name: isFr ? 'Skyr 0 % Nature' : 'Skyr 0% Natural (Thick Icelandic Strained)',
          quantity: isFr ? 'Pot de 200 g' : '200g tub',
          carbsGrams: 8,
          proteinGrams: 22,
          fatsGrams: 0,
          kcals: 120,
          quantitativeLabel: isFr ? 'Skyr 0% Nature (pot de 200g, 22g P)' : 'Skyr 0% Natural (200g tub, 22g P)',
          portionLabel: isFr ? '1 bol yaourt ou collation protéinée' : '1 bowl yogurt or protein snack',
          notes: isFr ? 'Apport protéiné pur caséine & lactosérum sans graisses.' : 'Lactose-strained pure casein & whey matrix, spoonable without mess.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Pur Jus de Raisin Noir 100 %' : '100% Pure Dark Concord Grape Juice',
          quantity: isFr ? 'Flasque 250 ml' : '250ml flask',
          carbsGrams: 38,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 155,
          quantitativeLabel: isFr ? 'Pur jus de raisin noir (flasque 250ml, 38g C)' : 'Pure concord grape juice (250ml flask, 38g C)',
          portionLabel: isFr ? '1 petit verre de jus de fruit' : '1 small glass fruit juice',
          notes: isFr ? 'Recharge rapide du glycogène musculaire.' : 'Rapid glycogen replenishment after arrival.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'break-room',
      title: isFr ? 'Phase 2 : Petit-Déjeuner Salle de Pause' : 'Phase 2: Break Room Breakfast',
      timeWindow: `${breakRoomTime} – ${addMinutesToTime(breakRoomTime, 15)}`,
      location: isFr ? 'Salle de Pause Dédiée (3e étage)' : '3rd Floor Dedicated Break Room',
      rules: isFr
        ? 'Espace convivial : Petit-déjeuner partagé en salle de pause dédiée avant la prise de poste.'
        : 'Break room lounge: Relaxed pre-shift breakfast in the dedicated shared kitchen before starting your day.',
      items: [
        {
          name: isFr ? "Overnight Oats au Lait d'Avoine & Chia" : 'Oat Milk Overnight Oats with Chia',
          quantity: isFr ? 'Bocal 250 g' : '250g jar',
          carbsGrams: 42,
          proteinGrams: 8,
          fatsGrams: 6,
          kcals: 255,
          quantitativeLabel: isFr ? "Overnight oats au lait d'avoine (250g, 42g C, 8g P)" : 'Oat milk overnight oats (250g jar, 42g C, 8g P)',
          portionLabel: isFr ? "1 bocal d'avoine préparée" : '1 jar prepared oats',
          notes: isFr ? 'Fibres bêta-glucanes infusées à froid.' : 'Beta-glucan complex fibers soaked overnight in oat milk.',
          isRealFoodVerified: true,
        },
        {
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
        },
        {
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
        },
        {
          name: isFr ? '1/2 Sandwich Baguette Fraîche (Dinde ou Avocat)' : '1/2 Fresh Baguette Sandwich (Turkey or Avocado)',
          quantity: isFr ? '100 g (demi-baguette)' : '100g half sandwich',
          carbsGrams: 36,
          proteinGrams: 14,
          fatsGrams: 5,
          kcals: 245,
          quantitativeLabel: isFr ? '1/2 sandwich baguette (100g, 36g C, 14g P)' : '1/2 fresh baguette sandwich (100g, 36g C, 14g P)',
          portionLabel: isFr ? '1 demi-sandwich frais' : '1 half fresh sandwich',
          notes: isFr ? 'Satiété salée et énergie stable toute la matinée.' : 'Savory satiation and sustained energy for the morning.',
          isRealFoodVerified: true,
        },
        {
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
        },
      ],
    },
  ];
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
