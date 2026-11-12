import {
  RiderBikeSpecs,
  DEFAULT_RIDER_BIKE_SPECS,
  BikeSpec,
  TelemetryMode,
  PacingInputMode,
  DietaryFilter,
  PantryItem,
  BidonSizeMl,
  FrameBottleSlots,
  getEffectiveRiderSpecs,
  formatFuelTarget,
} from '../types/specs';

export { getEffectiveRiderSpecs, formatFuelTarget };

const STORAGE_KEY = 'velotaf_rider_bike_specs_v1';
const GARAGE_SEEDED_KEY = 'velotaf_garage_v2_seeded';

export function hasSavedRiderBikeSpecs(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function normalizeRiderBikeSpecs(parsed: Partial<RiderBikeSpecs> | Record<string, any> | null | undefined): RiderBikeSpecs {
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_RIDER_BIKE_SPECS;
  }

  let bikes: BikeSpec[] =
    parsed.bikes && Array.isArray(parsed.bikes) && parsed.bikes.length > 0
      ? parsed.bikes
      : DEFAULT_RIDER_BIKE_SPECS.bikes;

  try {
    const alreadySeeded = localStorage.getItem(GARAGE_SEEDED_KEY) === 'true';
    if (!alreadySeeded && bikes.length === 1 && bikes[0].id === 'bike-sword') {
      const extraDefaults = DEFAULT_RIDER_BIKE_SPECS.bikes.filter((b) => b.id !== 'bike-sword');
      bikes = [...bikes, ...extraDefaults];
      localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
    }
  } catch {
    // ignore storage access errors
  }

  bikes = bikes.map((bike) => {
    const defaultMatch = DEFAULT_RIDER_BIKE_SPECS.bikes.find((d) => d.id === bike.id);
    return {
      ...bike,
      isTubeless:
        typeof bike.isTubeless === 'boolean'
          ? bike.isTubeless
          : defaultMatch?.isTubeless ?? false,
    };
  });

  const resolvedLevel =
    parsed.riderLevel === 'occasional' ||
    parsed.riderLevel === 'regular' ||
    parsed.riderLevel === 'pro'
      ? parsed.riderLevel
      : DEFAULT_RIDER_BIKE_SPECS.riderLevel;
  const resolvedViewMode =
    parsed.cockpitViewMode === 'essential' || parsed.cockpitViewMode === 'pro'
      ? parsed.cockpitViewMode
      : DEFAULT_RIDER_BIKE_SPECS.cockpitViewMode ?? 'essential';
  const resolvedWeight =
    typeof parsed.riderWeightKg === 'number' && Number.isFinite(parsed.riderWeightKg) && parsed.riderWeightKg > 25
      ? parsed.riderWeightKg
      : DEFAULT_RIDER_BIKE_SPECS.riderWeightKg;
  const resolvedHeight =
    typeof parsed.riderHeightCm === 'number' && Number.isFinite(parsed.riderHeightCm) && parsed.riderHeightCm > 100
      ? parsed.riderHeightCm
      : DEFAULT_RIDER_BIKE_SPECS.riderHeightCm;
  const resolvedFtp =
    typeof parsed.ftpWatts === 'number' && Number.isFinite(parsed.ftpWatts) && parsed.ftpWatts >= 80
      ? parsed.ftpWatts
      : DEFAULT_RIDER_BIKE_SPECS.ftpWatts;
  const resolvedCarbTarget =
    typeof parsed.carbTargetGPerHr === 'number' &&
    Number.isFinite(parsed.carbTargetGPerHr) &&
    parsed.carbTargetGPerHr >= 20
      ? parsed.carbTargetGPerHr
      : DEFAULT_RIDER_BIKE_SPECS.carbTargetGPerHr;
  const resolvedNutritionPref =
    parsed.nutritionPreference === 'real-food' ||
    parsed.nutritionPreference === 'mixed' ||
    parsed.nutritionPreference === 'sports-fuel'
      ? parsed.nutritionPreference
      : DEFAULT_RIDER_BIKE_SPECS.nutritionPreference;
  const resolvedRiderName =
    typeof parsed.riderName === 'string' && parsed.riderName.trim().length > 0
      ? parsed.riderName.trim()
      : undefined;

  const resolvedTelemetryMode: TelemetryMode =
    parsed.telemetryMode === 'quantitative' ||
    parsed.telemetryMode === 'fuel-first' ||
    parsed.telemetryMode === 'intuitive'
      ? parsed.telemetryMode
      : DEFAULT_RIDER_BIKE_SPECS.telemetryMode ?? 'fuel-first';
  const resolvedPacingMode: PacingInputMode =
    parsed.pacingInputMode === 'feel' || parsed.pacingInputMode === 'power'
      ? parsed.pacingInputMode
      : DEFAULT_RIDER_BIKE_SPECS.pacingInputMode ?? 'feel';

  const resolvedDietaryFilters: DietaryFilter[] =
    Array.isArray(parsed.dietaryFilters)
      ? parsed.dietaryFilters
      : DEFAULT_RIDER_BIKE_SPECS.dietaryFilters ?? [];

  const resolvedActivePantryIds: string[] =
    Array.isArray(parsed.activePantryIds) && parsed.activePantryIds.length > 0
      ? parsed.activePantryIds
      : DEFAULT_RIDER_BIKE_SPECS.activePantryIds ?? [];

  const resolvedCustomPantryItems: PantryItem[] =
    Array.isArray(parsed.customPantryItems)
      ? parsed.customPantryItems
      : DEFAULT_RIDER_BIKE_SPECS.customPantryItems ?? [];

  const resolvedBidonSizeMl: BidonSizeMl =
    parsed.bidonSizeMl === 500 ||
    parsed.bidonSizeMl === 550 ||
    parsed.bidonSizeMl === 650 ||
    parsed.bidonSizeMl === 750 ||
    parsed.bidonSizeMl === 950
      ? parsed.bidonSizeMl
      : DEFAULT_RIDER_BIKE_SPECS.bidonSizeMl ?? 650;

  const resolvedFrameBottleSlots: FrameBottleSlots =
    parsed.frameBottleSlots === 1 ||
    parsed.frameBottleSlots === 2 ||
    parsed.frameBottleSlots === 3
      ? parsed.frameBottleSlots
      : DEFAULT_RIDER_BIKE_SPECS.frameBottleSlots ?? 2;

  const resolvedLiquidCarbRatio =
    typeof parsed.liquidCarbRatio === 'number' &&
    Number.isFinite(parsed.liquidCarbRatio) &&
    parsed.liquidCarbRatio >= 0.15 &&
    parsed.liquidCarbRatio <= 0.85
      ? parsed.liquidCarbRatio
      : DEFAULT_RIDER_BIKE_SPECS.liquidCarbRatio ?? 0.35;

  const resolvedAutoModulateLiquid =
    typeof parsed.autoModulateLiquidInHeatOrEffort === 'boolean'
      ? parsed.autoModulateLiquidInHeatOrEffort
      : DEFAULT_RIDER_BIKE_SPECS.autoModulateLiquidInHeatOrEffort ?? true;

  const resolvedEnableSavoryPalateResets =
    typeof parsed.enableSavoryPalateResets === 'boolean'
      ? parsed.enableSavoryPalateResets
      : DEFAULT_RIDER_BIKE_SPECS.enableSavoryPalateResets ?? true;

  return {
    ...DEFAULT_RIDER_BIKE_SPECS,
    ...parsed,
    riderName: resolvedRiderName,
    riderWeightKg: resolvedWeight,
    riderHeightCm: resolvedHeight,
    ftpWatts: resolvedFtp,
    carbTargetGPerHr: resolvedCarbTarget,
    nutritionPreference: resolvedNutritionPref,
    dietaryFilters: resolvedDietaryFilters,
    activePantryIds: resolvedActivePantryIds,
    customPantryItems: resolvedCustomPantryItems,
    riderLevel: resolvedLevel,
    cockpitViewMode: resolvedViewMode,
    telemetryMode: resolvedTelemetryMode,
    pacingInputMode: resolvedPacingMode,
    bidonSizeMl: resolvedBidonSizeMl,
    frameBottleSlots: resolvedFrameBottleSlots,
    liquidCarbRatio: resolvedLiquidCarbRatio,
    autoModulateLiquidInHeatOrEffort: resolvedAutoModulateLiquid,
    enableSavoryPalateResets: resolvedEnableSavoryPalateResets,
    bikes,
  };
}

export function loadRiderBikeSpecs(): RiderBikeSpecs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
      return DEFAULT_RIDER_BIKE_SPECS;
    }
    const parsed = JSON.parse(raw);
    return normalizeRiderBikeSpecs(parsed);
  } catch (e) {
    console.error('Failed to load rider & bike specs:', e);
    return DEFAULT_RIDER_BIKE_SPECS;
  }
}

export function saveRiderBikeSpecs(specs: RiderBikeSpecs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(specs));
    localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
  } catch (e) {
    console.error('Failed to save rider & bike specs:', e);
  }
}

export function getActiveBike(specs: RiderBikeSpecs): BikeSpec {
  const list = specs?.bikes && specs.bikes.length > 0 ? specs.bikes : DEFAULT_RIDER_BIKE_SPECS.bikes;
  return list.find((b) => b.id === specs?.activeBikeId) || list[0];
}
