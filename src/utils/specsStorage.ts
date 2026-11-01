import { RiderBikeSpecs, DEFAULT_RIDER_BIKE_SPECS } from '../types/specs';

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
    let bikes =
      parsed.bikes && Array.isArray(parsed.bikes) && parsed.bikes.length > 0
        ? parsed.bikes
        : DEFAULT_RIDER_BIKE_SPECS.bikes;

    // Non-destructively seed the 2 additional default garage builds if upgrading from single-bike v1
    const alreadySeeded = localStorage.getItem(GARAGE_SEEDED_KEY) === 'true';
    if (!alreadySeeded && bikes.length === 1 && bikes[0].id === 'bike-sword') {
      const extraDefaults = DEFAULT_RIDER_BIKE_SPECS.bikes.filter((b) => b.id !== 'bike-sword');
      bikes = [...bikes, ...extraDefaults];
      localStorage.setItem(GARAGE_SEEDED_KEY, 'true');
      const upgraded: RiderBikeSpecs = {
        ...DEFAULT_RIDER_BIKE_SPECS,
        ...parsed,
        bikes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      return upgraded;
    }

    return {
      ...DEFAULT_RIDER_BIKE_SPECS,
      ...parsed,
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

export function getActiveBike(specs: RiderBikeSpecs) {
  return specs.bikes.find((b) => b.id === specs.activeBikeId) || specs.bikes[0];
}
