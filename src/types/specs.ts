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

export interface BikeSpec {
  id: string;
  name: string;
  weightKg: number;
  crr: number;
  cda: number;
  isTubeless: boolean;
}

export interface RiderBikeSpecs {
  riderName?: string;
  riderWeightKg: number;
  riderHeightCm: number;
  ftpWatts: number;
  carbTargetGPerHr: number;
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
  cockpitViewMode: 'pro',
  telemetryMode: 'quantitative',
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
    },
    {
      id: 'bike-aeroad',
      name: 'Canyon Aeroad CF SLX',
      weightKg: 7.6,
      crr: 0.0040,
      cda: 0.32,
      isTubeless: true,
    },
    {
      id: 'bike-urban',
      name: 'Omnium Urban Utility',
      weightKg: 12.8,
      crr: 0.0070,
      cda: 0.44,
      isTubeless: false,
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

  // Body-neutral baseline mapping for 'fuel-first' and 'intuitive'
  return {
    ...specs,
    telemetryMode: mode,
    riderWeightKg: 68,
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
      return isFr ? `${units} ${units > 1 ? 'unités de ravito' : 'unité de ravito'}` : `${units} fuel units`;
    }
    case 'intuitive':
      return isFr ? 'Rythme de ravito régulier' : 'Steady fueling rhythm';
    case 'quantitative':
    default:
      return isFr ? `${grams}g glucides` : `${grams}g carbs`;
  }
}
