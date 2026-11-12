import { TripProfile, ChecklistItem } from '../types/trip';
import {
  generateRandomPresetTrips,
  getAllPresetTrips,
  buildDefaultNewTripTemplate,
} from './presetTrips';

const STORAGE_KEY_PROFILES = 'bike_trip_engine_profiles_v2';
const STORAGE_KEY_ACTIVE_ID = 'bike_trip_engine_active_id_v2';
const STORAGE_KEY_THEME = 'bike_trip_engine_theme_v1';

export { generateRandomPresetTrips, getAllPresetTrips, buildDefaultNewTripTemplate };

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Mechanics
  { id: 'chk-tire', label: 'Tire Pressure: 3.2 bar (Gravel Tubeless on tarmac)', category: 'mechanics', checked: true, critical: true },
  { id: 'chk-chain', label: 'Drivetrain: Degreased & Silca hot-melt / ceramic wax lubricated', category: 'mechanics', checked: true, critical: false },
  { id: 'chk-battery', label: 'Batteries: Di2 shifter > 80% & Garmin Varia Radar fully charged', category: 'mechanics', checked: true, critical: true },
  { id: 'chk-brakes', label: 'Brakes: Pad bite checked, rotors degreased with isopropyl', category: 'mechanics', checked: true, critical: true },

  // Gear & Kit
  { id: 'chk-vest', label: 'High-Vis Aero Wind Vest & Reflective Ankle Bands', category: 'gear', checked: true, critical: true },
  { id: 'chk-glasses', label: 'Photochromic / Clear Hydrophobic Lenses (Estuary spray protection)', category: 'gear', checked: false, critical: false },
  { id: 'chk-lights', label: 'Front 800lm Beam mounted in strobe/steady daytime mode', category: 'gear', checked: true, critical: true },
  { id: 'chk-shell', label: 'Gore-Tex Shakedry emergency shell stowed in middle pocket', category: 'gear', checked: false, critical: false },

  // Nutrition Pack (NO POWDERS / NO MILK / NO BANANAS)
  { id: 'chk-bidon', label: 'Bidon: 650 ml 50/50 Water & 100% Pressed Grape/Apple juice', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-dates', label: 'Pocket Fuel: 2 Medjool dates + 2 dried Turkish figs', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-pate', label: 'Pocket Fuel: 2 artisanal pâte de fruits squares', category: 'nutrition', checked: false, critical: false },
  { id: 'chk-skyr', label: 'Commute Pack: 200 g plain yogurt in insulated cooler pouch', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-oats', label: 'Commute Pack: Jar of oat milk overnight oats + apple + walnuts', category: 'nutrition', checked: true, critical: true },

  // Office & Security Logistics
  { id: 'chk-badge', label: 'Office RFID Security Badge & Bike Shelter Token', category: 'logistics', checked: true, critical: true },
  { id: 'chk-padlock', label: 'Bike Shelter Heavy-Duty Padlock + Cable', category: 'logistics', checked: true, critical: true },
  { id: 'chk-shirt', label: 'Ironed Oxford shirt & lightweight office trousers in dry pack', category: 'logistics', checked: true, critical: true },
  { id: 'chk-towel', label: 'Microfiber quick-dry bath towel + natural cedar deodorant', category: 'logistics', checked: true, critical: true },
];

/**
 * Full curated pool of 12 preset trip projects (3 per archetype) with pre-fetched OSRM routes,
 * DEM elevation profiles, and preloaded archetype chips + ruleSettings.
 */
export const PRESET_TRIP_POOL: TripProfile[] = getAllPresetTrips();

/**
 * Default initial set of 3 randomized trip projects across distinct ride archetypes.
 */
export const INITIAL_PROFILES: TripProfile[] = generateRandomPresetTrips(3);

export function loadTrips(): TripProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error loading trips from localStorage', e);
    return [];
  }
}

export function saveTrips(trips: TripProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(trips));
  } catch (e) {
    console.error('Error saving trips to localStorage', e);
  }
}

export function getActiveTripId(trips: TripProfile[]): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (stored && trips.some((t) => t.id === stored)) {
      return stored;
    }
    const fallback = trips[0]?.id || '';
    if (fallback) {
      setActiveTripId(fallback);
    }
    return fallback;
  } catch (e) {
    return trips[0]?.id || '';
  }
}

export function setActiveTripId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (e) {
    console.error('Error setting active trip id', e);
  }
}

export function loadTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  } catch (e) {
    return 'dark';
  }
}

export function saveTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch (e) {
    console.error('Error saving theme to localStorage', e);
  }
}
