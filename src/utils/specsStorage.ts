import { RiderBikeSpecs, DEFAULT_RIDER_BIKE_SPECS, BikeSpec } from '../types/specs';

const STORAGE_KEY = 'velotaf_rider_bike_specs_v1';
const GARAGE_SEEDED_KEY = 'velotaf_garage_v2_seeded';

export function loadRiderBikeSpecs(): RiderBikeSpecs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
      return DEFAULT_RIDER_BIKE_SPECS;
    }
    const parsed = JSON.parse(raw);
    let bikes: BikeSpec[] =
      parsed.bikes && Array.isArray(parsed.bikes) && parsed.bikes.length > 0
        ? parsed.bikes
        : DEFAULT_RIDER_BIKE_SPECS.bikes;

    const alreadySeeded = localStorage.getItem(GARAGE_SEEDED_KEY) === 'true';
    if (!alreadySeeded && bikes.length === 1 && bikes[0].id === 'bike-sword') {
      const extraDefaults = DEFAULT_RIDER_BIKE_SPECS.bikes.filter((b) => b.id !== 'bike-sword');
      bikes = [...bikes, ...extraDefaults];
      localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
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
        : resolvedLevel === 'occasional'
        ? 'essential'
        : 'pro';
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

    return {
      ...DEFAULT_RIDER_BIKE_SPECS,
      ...parsed,
      riderWeightKg: resolvedWeight,
      riderHeightCm: resolvedHeight,
      ftpWatts: resolvedFtp,
      carbTargetGPerHr: resolvedCarbTarget,
      nutritionPreference: resolvedNutritionPref,
      riderLevel: resolvedLevel,
      cockpitViewMode: resolvedViewMode,
      bikes,
    };
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
