import {
  PantryItem,
  DietaryFilter,
  PantrySlot,
  NutritionPreference,
  RiderSpecs,
} from '../types/specs';

export type { PantryItem, DietaryFilter, PantrySlot, FlavorProfile } from '../types/specs';

/**
 * 24-Item Universal Pantry Catalog with guaranteed multi-option compliance
 * across all 5 dietary/allergen guardrail filters.
 */
export const DEFAULT_PANTRY_CATALOG: PantryItem[] = [
  // ── PRE-RIDE (4 items) ──
  {
    id: 'pre-baguette-honey',
    slot: 'pre-ride',
    nameEn: 'Toasted Baguette with Wildflower Honey',
    nameFr: 'Baguette blanche grillée au miel de fleurs',
    portionLabelEn: '2 thick slices toasted bread & honey',
    portionLabelFr: '2 tranches de pain grillé & miel',
    carbsG: 62,
    proteinG: 6,
    kcal: 300,
    flavor: 'sweet',
    compliance: {
      vegan: false,
      'gluten-free': false,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'pre-oats-maple-banana',
    slot: 'pre-ride',
    nameEn: 'Oatmeal with Maple Syrup & Ripe Banana',
    nameFr: "Flocons d'avoine au sirop d'érable & banane",
    portionLabelEn: '1 bowl warm oatmeal with fruit',
    portionLabelFr: "1 bol de flocons d'avoine aux fruits",
    carbsG: 68,
    proteinG: 8,
    kcal: 340,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'pre-rice-porridge-jam',
    slot: 'pre-ride',
    nameEn: 'White Rice Porridge with Strawberry Jam',
    nameFr: 'Riz au lait végétal doux & confiture',
    portionLabelEn: '1 bowl sweet rice porridge',
    portionLabelFr: '1 bol de riz doux à la confiture',
    carbsG: 72,
    proteinG: 5,
    kcal: 330,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'pre-savory-potato-hash',
    slot: 'pre-ride',
    nameEn: 'Steamed Baby Potato Hash with Olive Oil & Salt',
    nameFr: "Poêlée de pommes de terre vapeur & huile d'olive",
    portionLabelEn: '1 bowl savory seasoned potatoes',
    portionLabelFr: '1 bol de pommes de terre assaisonnées',
    carbsG: 58,
    proteinG: 6,
    kcal: 310,
    flavor: 'savory',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },

  // ── ON-BIKE LIQUID (4 items, per 650ml bidon) ──
  {
    id: 'liq-pressed-apple-grape',
    slot: 'on-bike-liquid',
    nameEn: '50/50 Water & 100% Pressed Apple/Grape Juice',
    nameFr: '50/50 eau & pur jus pressé pomme/raisin',
    portionLabelEn: '1 bottle diluted fruit juice',
    portionLabelFr: '1 bidon de jus naturel dilué',
    carbsG: 36,
    proteinG: 0,
    kcal: 145,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'liq-maple-citrus-salted',
    slot: 'on-bike-liquid',
    nameEn: 'Maple Syrup, Lemon Juice & Sea Salt Bidon',
    nameFr: "Élixir eau, sirop d'érable, citron & sel de mer",
    portionLabelEn: '1 bottle maple citrus hydration',
    portionLabelFr: "1 bidon d'hydratation érable-citron",
    carbsG: 34,
    proteinG: 0,
    kcal: 136,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'liq-isotonic-36',
    slot: 'on-bike-liquid',
    nameEn: 'Isotonic Dual-Carb Drink Mix (Maltodextrin/Fructose)',
    nameFr: 'Boisson isotonique glucidique 2:1',
    portionLabelEn: '1 bottle isotonic sports mix',
    portionLabelFr: '1 bidon de boisson isotonique',
    carbsG: 36,
    proteinG: 0,
    kcal: 144,
    flavor: 'neutral',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'liq-high-carb-cluster-60',
    slot: 'on-bike-liquid',
    nameEn: 'High-Carb Cluster Dextrin Fuel (60g C)',
    nameFr: 'Boisson haute énergie cluster dextrine (60g C)',
    portionLabelEn: '1 bottle high-concentration carb fuel',
    portionLabelFr: '1 bidon concentré haute intensité',
    carbsG: 60,
    proteinG: 0,
    kcal: 240,
    flavor: 'neutral',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },

  // ── ON-BIKE SOLID (12 items) ──
  {
    id: 'sol-medjool-date',
    slot: 'on-bike-solid',
    nameEn: 'Medjool Dates (Pitted)',
    nameFr: 'Dattes Medjool dénoyautées',
    portionLabelEn: '1 plump date or dried fruit',
    portionLabelFr: '1 datte ou fruit sec',
    carbsG: 17,
    proteinG: 1,
    kcal: 68,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'sol-fruit-chew-fig',
    slot: 'on-bike-solid',
    nameEn: 'Artisanal Fruit Chews & Dried Figs',
    nameFr: 'Pâtes de fruits artisanales & figues séchées',
    portionLabelEn: '1 fruit chew or dried fig',
    portionLabelFr: '1 pâte de fruits ou figue',
    carbsG: 12,
    proteinG: 0,
    kcal: 48,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'sol-ripe-banana',
    slot: 'on-bike-solid',
    nameEn: 'Fresh Firm-Ripe Banana',
    nameFr: 'Banane mûre fraîche',
    portionLabelEn: '1 fresh banana',
    portionLabelFr: '1 banane fraîche',
    carbsG: 23,
    proteinG: 1,
    kcal: 95,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-pain-depices',
    slot: 'on-bike-solid',
    nameEn: 'Traditional Spiced Honey Bread (Pain d\'Épices)',
    nameFr: "Pain d'épices traditionnel au miel",
    portionLabelEn: '1 slice spiced honey cake',
    portionLabelFr: "1 tranche de pain d'épices",
    carbsG: 22,
    proteinG: 2,
    kcal: 98,
    flavor: 'sweet',
    compliance: {
      vegan: false,
      'gluten-free': false,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'sol-maple-oat-bar',
    slot: 'on-bike-solid',
    nameEn: 'Chewy Maple Oat Pocket Bar',
    nameFr: "Barre moelleuse avoine & érable",
    portionLabelEn: '1 oat flapjack pocket bar',
    portionLabelFr: "1 barre d'avoine de poche",
    carbsG: 28,
    proteinG: 3,
    kcal: 140,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-almond-marzipan',
    slot: 'on-bike-solid',
    nameEn: 'Almond Marzipan / Pâte d\'Amande',
    nameFr: "Pâte d'amande artisanale",
    portionLabelEn: '1 roll almond marzipan',
    portionLabelFr: "1 rouleau de pâte d'amande",
    carbsG: 16,
    proteinG: 3,
    kcal: 115,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': false,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-salted-baby-potatoes',
    slot: 'on-bike-solid',
    nameEn: 'Boiled Baby Potatoes with Sea Salt',
    nameFr: 'Grenailles vapeur salées à la fleur de sel',
    portionLabelEn: '2 salted baby potatoes',
    portionLabelFr: '2 petites pommes de terre salées',
    carbsG: 20,
    proteinG: 2,
    kcal: 92,
    flavor: 'savory',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-savory-rice-cake',
    slot: 'on-bike-solid',
    nameEn: 'Savory Sushi Rice Cake with Soy & Sesame',
    nameFr: 'Galette de riz japonais salée au sésame',
    portionLabelEn: '1 savory wrapped rice bar',
    portionLabelFr: '1 bouchée de riz salée',
    carbsG: 25,
    proteinG: 2,
    kcal: 125,
    flavor: 'savory',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-salted-pretzels-gf',
    slot: 'on-bike-solid',
    nameEn: 'Gluten-Free Sea Salt Mini Pretzels',
    nameFr: 'Mini bretzels sans gluten au sel de mer',
    portionLabelEn: '1 pocket handful salted pretzels',
    portionLabelFr: '1 poignée de bretzels salés',
    carbsG: 22,
    proteinG: 2,
    kcal: 100,
    flavor: 'savory',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-gel-standard-25',
    slot: 'on-bike-solid',
    nameEn: 'Standard Hydrogel Energy Gel (25g C)',
    nameFr: 'Gel énergétique standard (25g C)',
    portionLabelEn: '1 quick energy gel',
    portionLabelFr: '1 gel énergétique rapide',
    carbsG: 25,
    proteinG: 0,
    kcal: 100,
    flavor: 'neutral',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'sol-gel-dual-25',
    slot: 'on-bike-solid',
    nameEn: 'Dual-Source Fructose/Maltodextrin Gel (25g C)',
    nameFr: 'Gel énergétique double source 2:1 (25g C)',
    portionLabelEn: '1 dual-source climb gel',
    portionLabelFr: "1 gel d'appoint pour les bosses",
    carbsG: 25,
    proteinG: 0,
    kcal: 100,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'sol-gel-pro-high-40',
    slot: 'on-bike-solid',
    nameEn: 'High-Carb Hydrogel Pouch (40g C)',
    nameFr: 'Poche hydrogel haute concentration (40g C)',
    portionLabelEn: '1 high-dose energy pouch',
    portionLabelFr: "1 poche d'énergie concentrée",
    carbsG: 40,
    proteinG: 0,
    kcal: 160,
    flavor: 'neutral',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },

  // ── POST-RIDE RECOVERY (4 items) ──
  {
    id: 'rec-skyr-grape',
    slot: 'post-ride-recovery',
    nameEn: 'Skyr 0% Natural with Pure Dark Grape Juice',
    nameFr: 'Skyr 0% nature & pur jus de raisin noir',
    portionLabelEn: '1 bowl yogurt & fruit juice',
    portionLabelFr: '1 bol yaourt & jus de fruit',
    carbsG: 46,
    proteinG: 22,
    kcal: 275,
    flavor: 'sweet',
    compliance: {
      vegan: false,
      'gluten-free': true,
      'dairy-free': false,
      'nut-free': true,
      'low-fodmap': false,
    },
  },
  {
    id: 'rec-soy-yogurt-maple-tart',
    slot: 'post-ride-recovery',
    nameEn: 'Organic Soy Yogurt with Maple & Tart Cherry',
    nameFr: "Yaourt de soja bio à l'érable & griotte",
    portionLabelEn: '1 bowl plant yogurt & cherry juice',
    portionLabelFr: '1 bol yaourt végétal & griotte',
    carbsG: 48,
    proteinG: 20,
    kcal: 285,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'rec-pea-rice-shake-banana',
    slot: 'post-ride-recovery',
    nameEn: 'Plant Protein Shake (Pea/Rice) with Banana',
    nameFr: 'Shake protéines végétales (pois/riz) & banane',
    portionLabelEn: '1 protein shake & whole fruit',
    portionLabelFr: '1 shake protéiné & fruit frais',
    carbsG: 52,
    proteinG: 24,
    kcal: 315,
    flavor: 'sweet',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
  {
    id: 'rec-savory-tofu-rice-bowl',
    slot: 'post-ride-recovery',
    nameEn: 'Warm Jasmine Rice Bowl with Baked Tofu & Tamari',
    nameFr: 'Bol de riz jasmin au tofu grillé & tamari',
    portionLabelEn: '1 warm savory recovery rice bowl',
    portionLabelFr: '1 bol chaud de riz & protéines',
    carbsG: 58,
    proteinG: 23,
    kcal: 360,
    flavor: 'savory',
    compliance: {
      vegan: true,
      'gluten-free': true,
      'dairy-free': true,
      'nut-free': true,
      'low-fodmap': true,
    },
  },
];

export interface ResolvedCompliantPantry {
  preRide: PantryItem;
  onBikeLiquid: PantryItem;
  onBikeSolids: PantryItem[];
  postRide: PantryItem;
  allCompliantItems: PantryItem[];
}

/**
 * Checks whether an item complies with all active dietary and allergen filters.
 */
export function isItemCompliant(item: PantryItem, filters: DietaryFilter[]): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((filter) => item.compliance[filter] === true);
}

/**
 * Seeds default pantry IDs based on the style preset or legacy nutrition preference.
 */
export function getDefaultPantryIdsForPreference(
  pref?: NutritionPreference | 'savory-endurance'
): string[] {
  switch (pref) {
    case 'sports-fuel':
      return [
        'pre-rice-porridge-jam',
        'liq-isotonic-36',
        'sol-gel-standard-25',
        'sol-gel-pro-high-40',
        'rec-pea-rice-shake-banana',
      ];
    case 'mixed':
      return [
        'pre-baguette-honey',
        'liq-pressed-apple-grape',
        'sol-medjool-date',
        'sol-gel-standard-25',
        'rec-skyr-grape',
      ];
    case 'savory-endurance':
      return [
        'pre-savory-potato-hash',
        'liq-maple-citrus-salted',
        'sol-salted-baby-potatoes',
        'sol-savory-rice-cake',
        'sol-salted-pretzels-gf',
        'rec-savory-tofu-rice-bowl',
      ];
    case 'real-food':
    default:
      return [
        'pre-baguette-honey',
        'liq-pressed-apple-grape',
        'sol-medjool-date',
        'sol-fruit-chew-fig',
        'rec-skyr-grape',
      ];
  }
}

/**
 * Resolves a compliant pantry configuration for the rider.
 * Guarantees that if a filter is active, any non-compliant item is automatically
 * substituted with the first compliant item in that slot so no slot is ever empty.
 */
export function resolveCompliantPantry(specs: RiderSpecs): ResolvedCompliantPantry {
  const customItems = specs.customPantryItems || [];
  const fullCatalog: PantryItem[] = [...DEFAULT_PANTRY_CATALOG, ...customItems];
  const filters: DietaryFilter[] = specs.dietaryFilters || [];

  const allCompliantItems = fullCatalog.filter((item) => isItemCompliant(item, filters));

  const compliantPreRide = allCompliantItems.filter((i) => i.slot === 'pre-ride');
  const compliantLiquid = allCompliantItems.filter((i) => i.slot === 'on-bike-liquid');
  const compliantSolids = allCompliantItems.filter((i) => i.slot === 'on-bike-solid');
  const compliantPostRide = allCompliantItems.filter((i) => i.slot === 'post-ride-recovery');

  const activeIds =
    specs.activePantryIds && specs.activePantryIds.length > 0
      ? specs.activePantryIds
      : getDefaultPantryIdsForPreference(specs.nutritionPreference);

  // 1. Pre-ride: find active compliant or fallback to first compliant
  const activePreRide = compliantPreRide.find((i) => activeIds.includes(i.id));
  const preRide = activePreRide || compliantPreRide[0] || DEFAULT_PANTRY_CATALOG[0];

  // 2. Liquid: find active compliant or fallback to first compliant
  const activeLiquid = compliantLiquid.find((i) => activeIds.includes(i.id));
  const onBikeLiquid = activeLiquid || compliantLiquid[0] || DEFAULT_PANTRY_CATALOG[4];

  // 3. Solids: find all active compliant or fallback to first 2 compliant
  const activeSolids = compliantSolids.filter((i) => activeIds.includes(i.id));
  const onBikeSolids =
    activeSolids.length > 0
      ? activeSolids
      : compliantSolids.slice(0, 2).length > 0
      ? compliantSolids.slice(0, 2)
      : [DEFAULT_PANTRY_CATALOG[8]];

  // 4. Post-ride: find active compliant or fallback to first compliant
  const activePostRide = compliantPostRide.find((i) => activeIds.includes(i.id));
  const postRide = activePostRide || compliantPostRide[0] || DEFAULT_PANTRY_CATALOG[20];

  return {
    preRide,
    onBikeLiquid,
    onBikeSolids,
    postRide,
    allCompliantItems,
  };
}
