export type NutritionPreference = 'real-food' | 'mixed' | 'sports-fuel';
export type RiderLevel = 'occasional' | 'regular' | 'pro';
export type CockpitViewMode = 'essential' | 'pro';
export type TelemetryMode = 'quantitative' | 'fuel-first' | 'intuitive';
export type PacingInputMode = 'feel' | 'power';

export type DietaryFilter = 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'low-fodmap';
export type PantrySlot = 'pre-ride' | 'on-bike-liquid' | 'on-bike-solid' | 'post-ride-recovery';
export type FlavorProfile = 'sweet' | 'savory' | 'neutral';
export type BidonSizeMl = 500 | 550 | 650 | 750 | 950;
export type FrameBottleSlots = 1 | 2 | 3;

export interface PantryItem {
  id: string;
  slot: PantrySlot;
  nameEn: string;
  nameFr: string;
  portionLabelEn: string; // Used in 'fuel-first' mode (no gram weights/kcals)
  portionLabelFr: string;
  carbsG: number;
  proteinG: number;
  kcal: number;
  flavor: FlavorProfile;
  compliance: Record<DietaryFilter, boolean>;
  requiresFridge?: boolean;
  isCustom?: boolean;
}

export type BikeCategory = 'road' | 'gravel' | 'mtb' | 'urban' | 'touring';
export type CasingType = 'supple' | 'standard' | 'reinforced';

export interface BikeSpec {
  id: string;
  name: string;
  weightKg: number;
  crr: number;
  cda: number;
  isTubeless: boolean;
  tireWidthMm?: number;
  bikeCategory?: BikeCategory;
  casingType?: CasingType;
  isHookless?: boolean;
}

export const BIKE_CATEGORY_DEFAULTS: Record<
  BikeCategory,
  {
    tireWidthMm: number;
    crr: number;
    cda: number;
    isTubeless: boolean;
    casingType: CasingType;
    weightKg: number;
  }
> = {
  road: {
    tireWidthMm: 28,
    crr: 0.0040,
    cda: 0.32,
    isTubeless: true,
    casingType: 'supple',
    weightKg: 8.2,
  },
  gravel: {
    tireWidthMm: 38,
    crr: 0.0055,
    cda: 0.38,
    isTubeless: true,
    casingType: 'standard',
    weightKg: 10.2,
  },
  urban: {
    tireWidthMm: 40,
    crr: 0.0065,
    cda: 0.44,
    isTubeless: false,
    casingType: 'reinforced',
    weightKg: 12.8,
  },
  touring: {
    tireWidthMm: 42,
    crr: 0.0062,
    cda: 0.45,
    isTubeless: false,
    casingType: 'reinforced',
    weightKg: 13.5,
  },
  mtb: {
    tireWidthMm: 54,
    crr: 0.0075,
    cda: 0.48,
    isTubeless: true,
    casingType: 'standard',
    weightKg: 12.0,
  },
};

export interface TireWidthPreset {
  widthMm: number;
  labelEn: string;
  labelFr: string;
  hintEn: string;
  hintFr: string;
}

export const TIRE_WIDTH_PRESETS: TireWidthPreset[] = [
  { widthMm: 28, labelEn: '28 mm', labelFr: '28 mm', hintEn: 'Road', hintFr: 'Route' },
  { widthMm: 32, labelEn: '32 mm', labelFr: '32 mm', hintEn: 'All-road', hintFr: 'Polyvalent' },
  { widthMm: 38, labelEn: '38 mm', labelFr: '38 mm', hintEn: 'Gravel', hintFr: 'Gravel' },
  { widthMm: 45, labelEn: '45 mm', labelFr: '45 mm', hintEn: 'Rough', hintFr: 'Chemins' },
  { widthMm: 54, labelEn: '54 mm', labelFr: '54 mm', hintEn: 'MTB', hintFr: 'VTT' },
];

/**
 * Estimates baseline rolling resistance (Crr) from plain tire traits
 * so beginners never need to know Crr numbers directly.
 */
export function estimateCrrFromTire(
  tireWidthMm: number,
  isTubeless: boolean,
  casingType: CasingType = 'standard'
): number {
  const w = Math.max(23, Math.min(65, Number.isFinite(tireWidthMm) ? tireWidthMm : 38));
  let base: number;
  if (w <= 26) base = 0.0042;
  else if (w <= 31) base = 0.0045;
  else if (w <= 36) base = 0.0052;
  else if (w <= 41) base = 0.0058;
  else if (w <= 47) base = 0.0068;
  else base = 0.0076;

  const tubelessDelta = isTubeless ? -0.0005 : 0;
  const casingDelta =
    casingType === 'supple' ? -0.0003 : casingType === 'reinforced' ? 0.0004 : 0;

  return Number(Math.max(0.0034, Math.min(0.0095, base + tubelessDelta + casingDelta)).toFixed(4));
}

/**
 * Resolves a valid tire width in mm from explicit width, bike category, or Crr fallback.
 */
export function resolveBikeTireWidthMm(bike?: Partial<BikeSpec> | null): number {
  if (
    typeof bike?.tireWidthMm === 'number' &&
    Number.isFinite(bike.tireWidthMm) &&
    bike.tireWidthMm >= 23 &&
    bike.tireWidthMm <= 65
  ) {
    return Math.round(bike.tireWidthMm);
  }
  if (bike?.bikeCategory && BIKE_CATEGORY_DEFAULTS[bike.bikeCategory]) {
    return BIKE_CATEGORY_DEFAULTS[bike.bikeCategory].tireWidthMm;
  }
  if (typeof bike?.crr === 'number' && Number.isFinite(bike.crr)) {
    if (bike.crr <= 0.0045) return 28;
    if (bike.crr <= 0.0062) return 38;
    return 42;
  }
  return 38;
}

export interface RiderBikeSpecs {
  riderName?: string;
  riderWeightKg: number;
  riderHeightCm: number;
  ftpWatts: number;
  carbTargetGPerHr: number;
  carbPacingMode?: 'auto' | 'locked';
  sweatRateLPerHr?: number;
  sweatSodiumMgPerL?: number;
  nutritionPreference: NutritionPreference;
  dietaryFilters?: DietaryFilter[];
  activePantryIds?: string[];
  customPantryItems?: PantryItem[];
  riderLevel: RiderLevel;
  cockpitViewMode?: CockpitViewMode;
  telemetryMode?: TelemetryMode;
  pacingInputMode?: PacingInputMode;
  bidonSizeMl?: BidonSizeMl;
  frameBottleSlots?: FrameBottleSlots;
  liquidCarbRatio?: number;
  autoModulateLiquidInHeatOrEffort?: boolean;
  enableSavoryPalateResets?: boolean;
  activeBikeId: string;
  bikes: BikeSpec[];
}

export type RiderSpecs = RiderBikeSpecs;

export const DEFAULT_RIDER_BIKE_SPECS: RiderBikeSpecs = {
  riderWeightKg: 68,
  riderHeightCm: 178,
  ftpWatts: 210,
  carbTargetGPerHr: 60,
  nutritionPreference: 'real-food',
  dietaryFilters: [],
  activePantryIds: [
    'pre-baguette-honey',
    'liq-pressed-apple-grape',
    'sol-medjool-date',
    'sol-fruit-chew-fig',
    'rec-skyr-grape',
  ],
  customPantryItems: [],
  riderLevel: 'regular',
  cockpitViewMode: 'essential',
  telemetryMode: 'fuel-first',
  pacingInputMode: 'feel',
  bidonSizeMl: 650,
  frameBottleSlots: 2,
  liquidCarbRatio: 0.35,
  autoModulateLiquidInHeatOrEffort: true,
  enableSavoryPalateResets: true,
  activeBikeId: 'bike-sword',
  bikes: [
    {
      id: 'bike-sword',
      name: 'Van Rysel GRVL AF SWORD',
      weightKg: 10.9,
      crr: 0.0055,
      cda: 0.38,
      isTubeless: true,
      tireWidthMm: 38,
      bikeCategory: 'gravel',
      casingType: 'standard',
      isHookless: false,
    },
    {
      id: 'bike-aeroad',
      name: 'Canyon Aeroad CF SLX',
      weightKg: 7.6,
      crr: 0.0040,
      cda: 0.32,
      isTubeless: true,
      tireWidthMm: 28,
      bikeCategory: 'road',
      casingType: 'supple',
      isHookless: true,
    },
    {
      id: 'bike-urban',
      name: 'Omnium Urban Utility',
      weightKg: 12.8,
      crr: 0.0070,
      cda: 0.44,
      isTubeless: false,
      tireWidthMm: 42,
      bikeCategory: 'urban',
      casingType: 'reinforced',
      isHookless: false,
    },
  ],
};

/**
 * Decouples biophysical calculations from display presentation.
 * In 'quantitative' mode, returns user-entered weight and FTP.
 * In 'fuel-first' or 'intuitive' modes, returns silent internal baselines
 * (68 kg, level-mapped FTP) so physics.ts never receives null/undefined.
 */
export function getEffectiveRiderSpecs(specs: RiderSpecs): RiderSpecs {
  const mode: TelemetryMode = specs.telemetryMode ?? 'quantitative';
  const pacingMode: PacingInputMode = specs.pacingInputMode ?? 'feel';

  // Use user-entered FTP whenever pacingInputMode is 'power' OR telemetryMode is 'quantitative'
  const userEnteredFtp =
    typeof specs.ftpWatts === 'number' && Number.isFinite(specs.ftpWatts) && specs.ftpWatts >= 80
      ? specs.ftpWatts
      : 210;

  // Baseline level mapping for 'feel' + non-quantitative modes
  const level: RiderLevel = specs.riderLevel ?? 'regular';
  const baselineFtp = level === 'occasional' ? 160 : level === 'pro' ? 280 : 210;

  const effectiveFtp = (pacingMode === 'power' || mode === 'quantitative') ? userEnteredFtp : baselineFtp;

  if (mode === 'quantitative') {
    return {
      ...specs,
      telemetryMode: mode,
      riderWeightKg:
        typeof specs.riderWeightKg === 'number' && Number.isFinite(specs.riderWeightKg) && specs.riderWeightKg > 25
          ? specs.riderWeightKg
          : 68,
      ftpWatts: effectiveFtp,
      carbTargetGPerHr: specs.carbTargetGPerHr ?? 60,
      bidonSizeMl: specs.bidonSizeMl ?? 650,
      frameBottleSlots: specs.frameBottleSlots ?? 2,
      liquidCarbRatio: specs.liquidCarbRatio ?? 0.35,
      autoModulateLiquidInHeatOrEffort: specs.autoModulateLiquidInHeatOrEffort ?? true,
      enableSavoryPalateResets: specs.enableSavoryPalateResets ?? true,
      dietaryFilters: specs.dietaryFilters ?? [],
      activePantryIds: specs.activePantryIds ?? DEFAULT_RIDER_BIKE_SPECS.activePantryIds,
      customPantryItems: specs.customPantryItems ?? [],
    };
  }

  // Body-neutral baseline mapping for 'fuel-first' and 'intuitive'.
  // Riders who opted into power pacing may have entered a weight for W/kg (Phase 1 §6); keep it.
  const optedInWeight =
    pacingMode === 'power' &&
    typeof specs.riderWeightKg === 'number' &&
    Number.isFinite(specs.riderWeightKg) &&
    specs.riderWeightKg > 25
      ? specs.riderWeightKg
      : 68;
  return {
    ...specs,
    telemetryMode: mode,
    riderWeightKg: optedInWeight,
    ftpWatts: effectiveFtp,
    carbTargetGPerHr: mode === 'intuitive' ? 60 : (specs.carbTargetGPerHr ?? 60),
    bidonSizeMl: specs.bidonSizeMl ?? 650,
    frameBottleSlots: specs.frameBottleSlots ?? 2,
    liquidCarbRatio: specs.liquidCarbRatio ?? 0.35,
    autoModulateLiquidInHeatOrEffort: specs.autoModulateLiquidInHeatOrEffort ?? true,
    enableSavoryPalateResets: specs.enableSavoryPalateResets ?? true,
    dietaryFilters: specs.dietaryFilters ?? [],
    activePantryIds: specs.activePantryIds ?? DEFAULT_RIDER_BIKE_SPECS.activePantryIds,
    customPantryItems: specs.customPantryItems ?? [],
  };
}

/**
 * Formats carb fueling target according to active telemetry philosophy.
 * - 'quantitative': "${grams}g carbs" (or "${grams}g glucides" in FR)
 * - 'fuel-first': "${units} fuel units" (where 1 unit ≈ 1 snack / 20g carbs)
 * - 'intuitive': "Steady fueling rhythm"
 */
export function formatFuelTarget(
  grams: number,
  mode: TelemetryMode = 'quantitative',
  lang?: string
): string {
  const isFr = lang === 'fr';
  switch (mode) {
    case 'fuel-first': {
      const units = Math.max(1, Math.round(grams / 20));
      return isFr ? `${units} ${units > 1 ? 'unités de ravito' : 'unité de ravito'}` : `${units} fuel unit${units > 1 ? 's' : ''}`;
    }
    case 'intuitive':
      return isFr ? 'Rythme de ravito régulier' : 'Steady fueling rhythm';
    case 'quantitative':
    default:
      return isFr ? `${grams}g glucides` : `${grams}g carbs`;
  }
}
