import { TripProfile, ChecklistItem } from '../types/trip';

const STORAGE_KEY_PROFILES = 'bike_trip_engine_profiles_v1';
const STORAGE_KEY_ACTIVE_ID = 'bike_trip_engine_active_id_v1';
const STORAGE_KEY_THEME = 'bike_trip_engine_theme_v1';

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
  { id: 'chk-bidon', label: 'Bidon: 650ml 50/50 Water & 100% Pressed Grape/Apple juice', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-dates', label: 'Pocket Pocket: 2 Medjool dates + 2 dried Turkish figs', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-pate', label: 'Pocket Pocket: 2 artisanal pâte de fruits squares', category: 'nutrition', checked: false, critical: false },
  { id: 'chk-skyr', label: 'Commute Pack: 200g Skyr 0% in insulated cooler pouch for Locker Bay', category: 'nutrition', checked: true, critical: true },
  { id: 'chk-oats', label: 'Commute Pack: Jar of oat milk overnight oats + apple + walnuts', category: 'nutrition', checked: true, critical: true },

  // Office & Security Logistics
  { id: 'chk-badge', label: 'Gate 17 RFID Security Badge & Subterranean Shelter Token', category: 'logistics', checked: true, critical: true },
  { id: 'chk-padlock', label: 'Locker Bay Heavy-Duty Master Padlock + Cable', category: 'logistics', checked: true, critical: true },
  { id: 'chk-shirt', label: 'Ironed Oxford shirt & lightweight office trousers in dry pack', category: 'logistics', checked: true, critical: true },
  { id: 'chk-towel', label: 'Microfiber quick-dry bath towel + natural cedar deodorant', category: 'logistics', checked: true, critical: true },
];

export const INITIAL_PROFILES: TripProfile[] = [
  {
    id: 'estuary-gate17-morning',
    name: 'Morning Estuary Commute (Gate 17)',
    tag: 'DEFAULT REVERSE RUN',
    description: '22 km daily gravel commute crossing the Saint-Nazaire estuary bridge to secure Gate 17. Strict office protocol: Locker refuel at 08:30, Break room breakfast at 08:50, Shift lock 09:00.',
    createdAt: '2026-10-24T06:00:00Z',
    updatedAt: '2026-10-24T06:00:00Z',
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.4,
      gearWeightKg: 4.2,
      cda: 0.40,
      crr: 0.006, // Gravel tires on asphalt
      rho: 1.225, // Air density kg/m3
      drivetrainEfficiency: 0.95, // 95%
      grossMechanicalEfficiency: 0.21, // 21%
      gradientPercent: 0.3, // Slight rolling elevation
    },
    route: {
      distanceKm: 22.0,
      targetSpeedKmH: 27.5,
      urbanTrafficDelayMinutes: 8,
      gateSecurityDelayMinutes: 5,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:30',
      gateName: 'Gate 17',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'No food permitted at open space desks. Locker refuel (Skyr + juice) on arrival, break room oats before 09:00 standup.',
    },
    weather: {
      isHeadwindActive: true,
      baseWindSpeedKmH: 8.0, // 8 km/h Estuary Headwind
      windDirection: 'headwind',
      windDirectionDegrees: 245,
      temperatureC: 11,
      precipitationRiskPercent: 15,
      estuaryGustKmH: 14,
      visibilityKm: 12,
    },
    checklist: DEFAULT_CHECKLIST,
  },
  {
    id: 'gravel-aero-speedrun',
    name: 'Gravel Aero Time-Trial (Fast Shift)',
    tag: 'HIGH INTENSITY',
    description: 'Aggressive aero posture for compressed morning transit. Pushing 31.5 km/h with low profile tuck and reduced drag envelope.',
    createdAt: '2026-10-23T06:00:00Z',
    updatedAt: '2026-10-23T06:00:00Z',
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 8.8,
      gearWeightKg: 3.2,
      cda: 0.36,
      crr: 0.0055,
      rho: 1.225,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.0,
    },
    route: {
      distanceKm: 22.0,
      targetSpeedKmH: 31.5,
      urbanTrafficDelayMinutes: 6,
      gateSecurityDelayMinutes: 4,
    },
    office: {
      shiftStartTime: '08:30',
      targetGateArrivalTime: '08:00',
      gateName: 'Gate 17 Fast Lane',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 10,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'Speedrun configuration. Arrive at 08:00 for earlier team scrum.',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 4.0,
      windDirection: 'calm',
      windDirectionDegrees: 180,
      temperatureC: 13,
      precipitationRiskPercent: 5,
      estuaryGustKmH: 7,
      visibilityKm: 20,
    },
    checklist: DEFAULT_CHECKLIST.map((item, idx) => ({ ...item, checked: idx < 10 })),
  },
  {
    id: 'calm-recovery-commute',
    name: 'Endurance Recovery Cruise',
    tag: 'AEROBIC RECOVERY',
    description: 'Zone 2 gentle cruise on flat tarmac. Relaxed cadence with ample 15-minute buffer cushion.',
    createdAt: '2026-10-22T06:00:00Z',
    updatedAt: '2026-10-22T06:00:00Z',
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.8,
      gearWeightKg: 4.5,
      cda: 0.42,
      crr: 0.0062,
      rho: 1.225,
      drivetrainEfficiency: 0.94,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.1,
    },
    route: {
      distanceKm: 22.0,
      targetSpeedKmH: 24.0,
      urbanTrafficDelayMinutes: 10,
      gateSecurityDelayMinutes: 5,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:30',
      gateName: 'Gate 17',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'Easy recovery watts, low heart rate zone.',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 3.0,
      windDirection: 'calm',
      windDirectionDegrees: 90,
      temperatureC: 15,
      precipitationRiskPercent: 0,
      estuaryGustKmH: 5,
      visibilityKm: 18,
    },
    checklist: DEFAULT_CHECKLIST,
  },
];

export function loadTrips(): TripProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      saveTrips(INITIAL_PROFILES);
      return INITIAL_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveTrips(INITIAL_PROFILES);
    return INITIAL_PROFILES;
  } catch (e) {
    console.error('Error loading trips from localStorage', e);
    return INITIAL_PROFILES;
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
    const fallback = trips[0]?.id || INITIAL_PROFILES[0].id;
    setActiveTripId(fallback);
    return fallback;
  } catch (e) {
    return trips[0]?.id || INITIAL_PROFILES[0].id;
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
    // Default to dark mode per design system specs
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
