/**
 * 100 Unique Trip Configuration Scenarios Stress Test Suite
 * Bike Trip Engine Commute & Telemetry Platform
 */

import { calculatePhysics } from '../src/utils/physics';
import { calculateReverseTimeline } from '../src/utils/timeline';
import { getRealFoodNutritionPlan, subtractMinutesFromTime, addMinutesToTime } from '../src/utils/nutrition';
import { generateTripChecklist, TripProfile, PhysicsParams, RouteParams, OfficeConstraints, WeatherCondition } from '../src/types/trip';
import { parseTripDescription } from '../src/utils/nlpParser';
import { checkForecastHorizon, calculateAirDensity, computeRouteBearing } from '../src/services/weatherService';
import { getTripArchetype } from '../src/components/dashboard/TimelineContextualBanner';

// Mock localStorage if in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as any;
}

export interface ScenarioDefinition {
  id: number;
  name: string;
  category: 'COMMUTE' | 'SPORT' | 'BIKEPACKING' | 'ESCAPADE' | 'BOUNDARY_EDGE';
  nlpPrompt?: string;
  lang?: 'en' | 'fr';
  trip: TripProfile;
}

export interface ScenarioAuditResult {
  id: number;
  name: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  physics: {
    systemMassKg: number;
    legWatts: number;
    aeroWatts: number;
    rollingWatts: number;
    gravityWatts: number;
    movingTimeFormatted: string;
    totalKcalBurn: number;
    totalCarbsGrams: number;
    carbRateGramsPerHour: number;
    goStatus: string;
    goStatusReason: string;
  };
  timeline: {
    wakeUpTime: string;
    preRideMealTime: string;
    hardDepartureTime: string;
    gateArrivalTime: string;
    shiftStartTime: string;
    pureMovingMinutes: number;
    totalDoorToDeskMinutes: number;
    bufferMinutes: number;
    stepCount: number;
    hasMidnightCrossing: boolean;
  };
  checklist: {
    totalItems: number;
    criticalCount: number;
    hasThermalKit: boolean;
    hasPunctureKit: boolean;
  };
  nlpFeedback?: {
    extractedCount: number;
    detectedSpeed?: number;
    detectedDist?: number;
    detectedArrival?: string;
    detectedRollout?: string;
  };
  anomalies: string[];
  warnings: string[];
}

// Base template
const defaultTrip: TripProfile = {
  id: 'base-trip',
  name: 'Base Trip',
  tag: 'VÉLOTAF',
  description: 'Default test trip',
  createdAt: '2026-10-27T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
  physics: {
    riderWeightKg: 74,
    bikeWeightKg: 9.4,
    gearWeightKg: 4.2,
    cda: 0.40,
    crr: 0.006,
    rho: 1.225,
    drivetrainEfficiency: 0.95,
    grossMechanicalEfficiency: 0.21,
    gradientPercent: 0.3,
  },
  route: {
    origin: 'Nantes Quai',
    destination: 'Gate 17 Campus',
    distanceKm: 22.0,
    targetSpeedKmH: 27.5,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 5,
    coordinates: [
      [47.2184, -1.5536],
      [47.2840, -2.2080],
    ],
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
    notes: 'Standard morning shift',
  },
  weather: {
    isHeadwindActive: true,
    baseWindSpeedKmH: 8.0,
    windDirection: 'headwind',
    windDirectionDegrees: 245,
    temperatureC: 11,
    precipitationRiskPercent: 15,
    estuaryGustKmH: 14,
    visibilityKm: 12,
  },
  checklist: generateTripChecklist('VÉLOTAF', 22),
};

function createScenario(
  id: number,
  name: string,
  category: ScenarioDefinition['category'],
  overrides: {
    tag?: string;
    physics?: Partial<PhysicsParams>;
    route?: Partial<RouteParams>;
    office?: Partial<OfficeConstraints>;
    weather?: Partial<WeatherCondition>;
    nlpPrompt?: string;
    lang?: 'en' | 'fr';
    departureDate?: string;
    departureTime?: string;
  }
): ScenarioDefinition {
  const trip: TripProfile = {
    ...defaultTrip,
    id: `scenario-${id}`,
    name,
    tag: overrides.tag || (category === 'COMMUTE' ? 'VÉLOTAF' : category),
    departureDate: overrides.departureDate,
    departureTime: overrides.departureTime,
    physics: { ...defaultTrip.physics, ...(overrides.physics || {}) },
    route: { ...defaultTrip.route, ...(overrides.route || {}) },
    office: { ...defaultTrip.office, ...(overrides.office || {}) },
    weather: { ...defaultTrip.weather, ...(overrides.weather || {}) },
    checklist: generateTripChecklist(
      overrides.tag || category,
      overrides.route?.distanceKm ?? defaultTrip.route.distanceKm,
      { ...defaultTrip.weather, ...(overrides.weather || {}) },
      { lang: overrides.lang || 'en' }
    ),
  };

  return {
    id,
    name,
    category,
    nlpPrompt: overrides.nlpPrompt,
    lang: overrides.lang || 'en',
    trip,
  };
}

export const SCENARIOS: ScenarioDefinition[] = [
  // ══════════════════════════════════════════════════════════════════
  // GROUP 1: COMMUTE & STRICT OFFICE PROTOCOLS (1 to 25)
  // ══════════════════════════════════════════════════════════════════
  createScenario(1, 'Baseline Estuary Commute (Gate 17)', 'COMMUTE', {
    route: { distanceKm: 22, targetSpeedKmH: 27.5 },
    weather: { baseWindSpeedKmH: 8, isHeadwindActive: true },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:30', gateName: 'Gate 17' },
  }),
  createScenario(2, 'Early Dawn Commute (06:00 Shift)', 'COMMUTE', {
    route: { distanceKm: 16, targetSpeedKmH: 25 },
    office: { shiftStartTime: '06:00', targetGateArrivalTime: '05:30', gateName: 'North Gate' },
    weather: { baseWindSpeedKmH: 4, isHeadwindActive: false },
  }),
  createScenario(3, 'Estuary Gale Surcharge (NO-GO Trigger)', 'COMMUTE', {
    route: { distanceKm: 32, targetSpeedKmH: 24 },
    weather: { baseWindSpeedKmH: 34, estuaryGustKmH: 52, isHeadwindActive: true },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:30' },
  }),
  createScenario(4, 'Estuary Strong Headwind Warning (CAUTION Trigger)', 'COMMUTE', {
    route: { distanceKm: 26, targetSpeedKmH: 26 },
    weather: { baseWindSpeedKmH: 20, estuaryGustKmH: 32, isHeadwindActive: true },
    office: { shiftStartTime: '08:30', targetGateArrivalTime: '08:00' },
  }),
  createScenario(5, 'Ultra-Short Urban Commute Sprint', 'COMMUTE', {
    route: { distanceKm: 3.8, targetSpeedKmH: 22, urbanTrafficDelayMinutes: 5, gateSecurityDelayMinutes: 2 },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:45', lockerRefuelMinutes: 5, showerChangeMinutes: 5 },
  }),
  createScenario(6, 'Long-Range Interurban Mega-Commute', 'COMMUTE', {
    route: { distanceKm: 48, targetSpeedKmH: 29, urbanTrafficDelayMinutes: 12, gateSecurityDelayMinutes: 5 },
    weather: { baseWindSpeedKmH: 12, isHeadwindActive: true },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:20' },
  }),
  createScenario(7, 'Heavy E-Commuter with Full Cargo Panniers', 'COMMUTE', {
    physics: { bikeWeightKg: 24.5, gearWeightKg: 16.0, riderWeightKg: 82 },
    route: { distanceKm: 20, targetSpeedKmH: 22 },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:30' },
  }),
  createScenario(8, 'Minimalist Fixie Courier Commute (Zero Cargo)', 'COMMUTE', {
    physics: { bikeWeightKg: 7.8, gearWeightKg: 0, riderWeightKg: 70, cda: 0.36 },
    route: { distanceKm: 14, targetSpeedKmH: 28 },
    office: { shiftStartTime: '09:30', targetGateArrivalTime: '09:05' },
  }),
  createScenario(9, 'Zero-Buffer High-Risk Commute', 'COMMUTE', {
    route: { distanceKm: 22, targetSpeedKmH: 27, urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0 },
    office: { shiftStartTime: '08:30', targetGateArrivalTime: '08:30' },
  }),
  createScenario(10, 'Congested Urban Chokepoint (45m Traffic Delay)', 'COMMUTE', {
    route: { distanceKm: 15, targetSpeedKmH: 20, urbanTrafficDelayMinutes: 45, gateSecurityDelayMinutes: 15 },
    office: { shiftStartTime: '09:00', targetGateArrivalTime: '08:30' },
  }),
  createScenario(11, 'Sub-Zero Winter Commute (-6°C)', 'COMMUTE', {
    weather: { temperatureC: -6, baseWindSpeedKmH: 14, isHeadwindActive: true },
    physics: { rho: 1.32 },
    route: { distanceKm: 22, targetSpeedKmH: 25 },
  }),
  createScenario(12, 'Summer Heatwave Commute (38°C)', 'COMMUTE', {
    weather: { temperatureC: 38, baseWindSpeedKmH: 6, isHeadwindActive: false },
    physics: { rho: 1.135 },
    route: { distanceKm: 24, targetSpeedKmH: 26 },
  }),
  createScenario(13, 'Strict Subterranean Shelter Token (Gate 17)', 'COMMUTE', {
    office: { gateName: 'Porte 17 Sous-Sol', badgeRequiredForGate: true, strictNoFoodInOpenSpace: true },
    lang: 'fr',
  }),
  createScenario(14, 'Public Access Commute (No Badge Required)', 'COMMUTE', {
    office: { gateName: 'Public Bike Hub', badgeRequiredForGate: false, strictNoFoodInOpenSpace: false },
  }),
  createScenario(15, 'Late Evening Shift Commute (22:00 Shift)', 'COMMUTE', {
    office: { shiftStartTime: '22:00', targetGateArrivalTime: '21:30' },
    route: { distanceKm: 22, targetSpeedKmH: 26 },
  }),
  createScenario(16, 'Midnight Graveyard Shift Commute (00:00 Shift)', 'COMMUTE', {
    office: { shiftStartTime: '00:00', targetGateArrivalTime: '23:30' },
    route: { distanceKm: 25, targetSpeedKmH: 25 },
  }),
  createScenario(17, 'Post-Midnight 01:15 Shift (Rollover Prior Day)', 'COMMUTE', {
    office: { shiftStartTime: '01:15', targetGateArrivalTime: '00:45' },
    route: { distanceKm: 32, targetSpeedKmH: 26 },
  }),
  createScenario(18, 'Early Morning 05:00 Shift (Pre-Dawn Rollout)', 'COMMUTE', {
    office: { shiftStartTime: '05:00', targetGateArrivalTime: '04:30' },
    route: { distanceKm: 35, targetSpeedKmH: 26 },
  }),
  createScenario(19, 'French Natural Language Commute Prompt', 'COMMUTE', {
    nlpPrompt: 'Je pars de Nantes pour aller au bureau Porte 17, arrivée 8h25, shift à 9h, 22km à 27 km/h avec 4kg de sacoche',
    lang: 'fr',
  }),
  createScenario(20, 'Bilingual Mixed Commute Prompt', 'COMMUTE', {
    nlpPrompt: 'Vélotaf from Saint-Herblain to Gate 17, 18 km at 26km/h, vent de face 15 km/h, strict no food',
    lang: 'en',
  }),
  createScenario(21, 'Extended Executive Shower & Groom Protocol', 'COMMUTE', {
    office: { showerChangeMinutes: 25, lockerRefuelMinutes: 15, breakRoomBreakfastMinutes: 20 },
    route: { distanceKm: 22, targetSpeedKmH: 27 },
  }),
  createScenario(22, 'Ultra-Compressed 5-Minute Locker Turnaround', 'COMMUTE', {
    office: { showerChangeMinutes: 5, lockerRefuelMinutes: 5, breakRoomBreakfastMinutes: 5 },
    route: { distanceKm: 18, targetSpeedKmH: 26 },
  }),
  createScenario(23, 'Cross-Headwind Estuary Bridge Crossing', 'COMMUTE', {
    weather: { windDirection: 'cross-headwind', windDirectionDegrees: 270, baseWindSpeedKmH: 18, isHeadwindActive: true },
    route: { distanceKm: 24, targetSpeedKmH: 26 },
  }),
  createScenario(24, 'Commute with NLP Puncture Margin & Tubeless Kit', 'COMMUTE', {
    nlpPrompt: 'Trajet vélotaf de 26 km à 28 km/h, arrivée 8h30 Porte 4, prévoir marge anti-crève de 10 min et kit mèches',
    lang: 'fr',
  }),
  createScenario(25, 'Commute with Bakery Coffee Stop Added', 'COMMUTE', {
    nlpPrompt: 'Commute to Gate 17, 22km at 26 km/h, shift at 9am, pause café ravito 15 min',
    lang: 'en',
  }),

  // ══════════════════════════════════════════════════════════════════
  // GROUP 2: SPORT, TEMPO & GRAN FONDO (26 to 50)
  // ══════════════════════════════════════════════════════════════════
  createScenario(26, 'Standard Gran Fondo Fast Pace', 'SPORT', {
    route: { distanceKm: 42, targetSpeedKmH: 31.5 },
    physics: { cda: 0.34, crr: 0.0052, drivetrainEfficiency: 0.97 },
    office: { shiftStartTime: '11:30', targetGateArrivalTime: '11:00', gateName: 'Finish Line' },
  }),
  createScenario(27, 'Elite Aero Time Trial Posture', 'SPORT', {
    route: { distanceKm: 50, targetSpeedKmH: 38.0 },
    physics: { cda: 0.26, crr: 0.0042, drivetrainEfficiency: 0.97, grossMechanicalEfficiency: 0.23 },
    office: { targetGateArrivalTime: '10:00' },
  }),
  createScenario(28, 'High Threshold Wattage Surge (>300W)', 'SPORT', {
    route: { distanceKm: 35, targetSpeedKmH: 35.0 },
    physics: { cda: 0.38, gradientPercent: 1.2 },
    office: { targetGateArrivalTime: '09:30' },
  }),
  createScenario(29, 'Gran Fondo Mountain Pass (6.5% Climbing)', 'SPORT', {
    route: { distanceKm: 65, targetSpeedKmH: 21.0 },
    physics: { gradientPercent: 6.5, riderWeightKg: 68, bikeWeightKg: 7.5, gearWeightKg: 1.5 },
    office: { targetGateArrivalTime: '13:00' },
  }),
  createScenario(30, 'Steep Wall Assault (12% Gradient Sector)', 'SPORT', {
    route: { distanceKm: 12, targetSpeedKmH: 15.0 },
    physics: { gradientPercent: 12.0 },
    office: { targetGateArrivalTime: '11:00' },
  }),
  createScenario(31, 'High-Speed Mountain Descent (-4% Gradient)', 'SPORT', {
    route: { distanceKm: 30, targetSpeedKmH: 48.0 },
    physics: { gradientPercent: -4.0 },
    office: { targetGateArrivalTime: '14:00' },
  }),
  createScenario(32, 'Metric Century Endurance (100 km)', 'SPORT', {
    route: { distanceKm: 100, targetSpeedKmH: 29.0 },
    office: { targetGateArrivalTime: '13:30' },
  }),
  createScenario(33, 'Double Metric Century Ultra (200 km)', 'SPORT', {
    route: { distanceKm: 200, targetSpeedKmH: 28.0 },
    office: { targetGateArrivalTime: '16:00' },
  }),
  createScenario(34, 'Blistering Summer Fast Sunrise Ride (34°C)', 'SPORT', {
    route: { distanceKm: 60, targetSpeedKmH: 33.0 },
    weather: { temperatureC: 34, baseWindSpeedKmH: 5 },
    physics: { rho: 1.15 },
  }),
  createScenario(35, 'Freezing Winter Tempo Miles (-3°C)', 'SPORT', {
    route: { distanceKm: 70, targetSpeedKmH: 28.0 },
    weather: { temperatureC: -3, baseWindSpeedKmH: 15, isHeadwindActive: true },
    physics: { rho: 1.31 },
  }),
  createScenario(36, 'Featherweight Climber on Carbon Superlight', 'SPORT', {
    physics: { riderWeightKg: 52, bikeWeightKg: 6.1, gearWeightKg: 1.2, gradientPercent: 5.0 },
    route: { distanceKm: 45, targetSpeedKmH: 25.0 },
  }),
  createScenario(37, 'Heavy Flatland Rouleur on Deep Section Wheels', 'SPORT', {
    physics: { riderWeightKg: 94, bikeWeightKg: 8.2, gearWeightKg: 1.8, cda: 0.33 },
    route: { distanceKm: 65, targetSpeedKmH: 36.0 },
  }),
  createScenario(38, 'Mud-Clogged Drivetrain Efficiency Drop (88%)', 'SPORT', {
    physics: { drivetrainEfficiency: 0.88, crr: 0.0075 },
    route: { distanceKm: 50, targetSpeedKmH: 28.0 },
  }),
  createScenario(39, 'Sub-Par Metabolic Efficiency Rider (17%)', 'SPORT', {
    physics: { grossMechanicalEfficiency: 0.17 },
    route: { distanceKm: 40, targetSpeedKmH: 30.0 },
  }),
  createScenario(40, 'World-Class Efficiency Pro (24% GME)', 'SPORT', {
    physics: { grossMechanicalEfficiency: 0.24 },
    route: { distanceKm: 80, targetSpeedKmH: 35.0 },
  }),
  createScenario(41, 'French Gran Fondo NLP Prompt with Noon Finish', 'SPORT', {
    nlpPrompt: 'Sortie gran fondo 55 km à 32 km/h, arrivée midi, 2 bidons de ravito et kit anti-crève',
    lang: 'fr',
  }),
  createScenario(42, 'Sport Ride with Fast Sunrise NLP Phrasing', 'SPORT', {
    nlpPrompt: 'Fast sunrise tempo training ride, 65km at 33 km/h, finish at 10:30am, 2kg gear',
    lang: 'en',
  }),
  createScenario(43, 'High Altitude Pass Simulation (rho 0.95 kg/m³)', 'SPORT', {
    physics: { rho: 0.95, gradientPercent: 4.5 },
    route: { distanceKm: 45, targetSpeedKmH: 22.0 },
  }),
  createScenario(44, 'Sea Level Dense Coastal Air (rho 1.26 kg/m³)', 'SPORT', {
    physics: { rho: 1.26 },
    route: { distanceKm: 50, targetSpeedKmH: 32.0 },
  }),
  createScenario(45, 'Paceline Aerodynamic Drafting (CdA 0.22)', 'SPORT', {
    physics: { cda: 0.22 },
    route: { distanceKm: 75, targetSpeedKmH: 37.0 },
  }),
  createScenario(46, 'Violent Coastal Crosswind Blast (32 km/h wind)', 'SPORT', {
    weather: { baseWindSpeedKmH: 32, estuaryGustKmH: 48, isHeadwindActive: true },
    route: { distanceKm: 40, targetSpeedKmH: 27.0 },
  }),
  createScenario(47, 'Short Explosive Criterium Prep (15 km)', 'SPORT', {
    route: { distanceKm: 15, targetSpeedKmH: 38.0 },
    office: { targetGateArrivalTime: '08:00' },
  }),
  createScenario(48, 'Low-Intensity Zone 1 Recovery Spin', 'SPORT', {
    route: { distanceKm: 25, targetSpeedKmH: 19.0 },
    physics: { cda: 0.42 },
    office: { targetGateArrivalTime: '16:00' },
  }),
  createScenario(49, 'Combined 8% Gradient & 20 km/h Headwind', 'SPORT', {
    physics: { gradientPercent: 8.0 },
    weather: { baseWindSpeedKmH: 20, isHeadwindActive: true },
    route: { distanceKm: 20, targetSpeedKmH: 16.0 },
  }),
  createScenario(50, 'Evening Gran Fondo Finishing at Dusk (20:30)', 'SPORT', {
    office: { shiftStartTime: '21:00', targetGateArrivalTime: '20:30' },
    route: { distanceKm: 70, targetSpeedKmH: 30.0 },
  }),

  // ══════════════════════════════════════════════════════════════════
  // GROUP 3: BIKEPACKING & MULTI-DAY EXPEDITION (51 to 70)
  // ══════════════════════════════════════════════════════════════════
  createScenario(51, 'Loire Estuary 2-Day Adventure Stage 1', 'BIKEPACKING', {
    route: { distanceKm: 68, targetSpeedKmH: 21.0 },
    physics: { gearWeightKg: 12.0, bikeWeightKg: 10.5, cda: 0.44, crr: 0.0068 },
    office: { targetGateArrivalTime: '18:00', shiftStartTime: '19:00', gateName: 'Pornic Bivouac Cove' },
  }),
  createScenario(52, 'Heavy Expedition Trans-Continental Rig', 'BIKEPACKING', {
    physics: { bikeWeightKg: 14.5, gearWeightKg: 24.0, riderWeightKg: 85, cda: 0.48, crr: 0.0085 },
    route: { distanceKm: 85, targetSpeedKmH: 17.5 },
    office: { targetGateArrivalTime: '18:30' },
  }),
  createScenario(53, 'Ultralight Fastpack Bivouac Setup', 'BIKEPACKING', {
    physics: { bikeWeightKg: 9.0, gearWeightKg: 5.5, cda: 0.40, crr: 0.0060 },
    route: { distanceKm: 95, targetSpeedKmH: 24.0 },
    office: { targetGateArrivalTime: '19:00' },
  }),
  createScenario(54, 'Chunky Gravel Knobby Tire Resistance (Crr 0.012)', 'BIKEPACKING', {
    physics: { crr: 0.0120, gearWeightKg: 14.0 },
    route: { distanceKm: 48, targetSpeedKmH: 16.5 },
    office: { targetGateArrivalTime: '17:30' },
  }),
  createScenario(55, 'Sunset Dusk Cutoff Rush (Target 17:45)', 'BIKEPACKING', {
    route: { distanceKm: 62, targetSpeedKmH: 19.5 },
    office: { targetGateArrivalTime: '17:45', shiftStartTime: '18:00' },
  }),
  createScenario(56, 'Late Night Bivouac Arrival (21:30 Pitch)', 'BIKEPACKING', {
    route: { distanceKm: 88, targetSpeedKmH: 20.0 },
    office: { targetGateArrivalTime: '21:30', shiftStartTime: '22:00' },
  }),
  createScenario(57, 'Mountain Singletrack Bikepacking (4.8% Grade)', 'BIKEPACKING', {
    physics: { gradientPercent: 4.8, gearWeightKg: 16.0 },
    route: { distanceKm: 45, targetSpeedKmH: 14.0 },
    office: { targetGateArrivalTime: '17:00' },
  }),
  createScenario(58, 'Exposed Coastal Headwind Bikepacking', 'BIKEPACKING', {
    weather: { baseWindSpeedKmH: 22, isHeadwindActive: true, estuaryGustKmH: 35 },
    route: { distanceKm: 55, targetSpeedKmH: 17.5 },
    physics: { gearWeightKg: 15.0, cda: 0.46 },
    office: { targetGateArrivalTime: '18:00' },
  }),
  createScenario(59, 'Multi-Day Stage 2 Dawn Departure (06:00 Rollout)', 'BIKEPACKING', {
    departureTime: '06:00',
    route: { distanceKm: 110, targetSpeedKmH: 19.0 },
    office: { targetGateArrivalTime: '14:00' },
  }),
  createScenario(60, 'Heavy Rain & Mud Bikepacking Stage', 'BIKEPACKING', {
    weather: { precipitationRiskPercent: 95, temperatureC: 8, baseWindSpeedKmH: 16 },
    route: { distanceKm: 52, targetSpeedKmH: 16.0 },
    office: { targetGateArrivalTime: '16:30' },
  }),
  createScenario(61, 'French Bikepacking NLP Prompt with Filtration', 'BIKEPACKING', {
    nlpPrompt: 'Bikepacking de 75 km vers Pornic, départ 9h, allure 19 km/h avec tente et 14kg de sacoches, ravito eau',
    lang: 'fr',
  }),
  createScenario(62, 'English Self-Supported Adventure NLP Prompt', 'BIKEPACKING', {
    nlpPrompt: 'Bikepacking adventure trip, 85km at 18 km/h, camp pitch by 6pm at coastal cove, 12kg gear',
    lang: 'en',
  }),
  createScenario(63, 'Heavy Cargo Rig with 30 kg Equipment', 'BIKEPACKING', {
    physics: { gearWeightKg: 30.0, bikeWeightKg: 16.0 },
    route: { distanceKm: 40, targetSpeedKmH: 15.0 },
    office: { targetGateArrivalTime: '16:00' },
  }),
  createScenario(64, 'Frame Bags Only (Zero Backpack Comfort)', 'BIKEPACKING', {
    nlpPrompt: 'Bikepacking 65km vers Guérande à 20 km/h sans sac a dos avec 8kg sacoches',
    lang: 'fr',
  }),
  createScenario(65, 'Century Stage Bikepacking Expedition (140 km)', 'BIKEPACKING', {
    route: { distanceKm: 140, targetSpeedKmH: 21.0 },
    physics: { gearWeightKg: 11.0 },
    office: { targetGateArrivalTime: '19:30' },
  }),
  createScenario(66, 'Desert Gravel Summer Expedition (36°C)', 'BIKEPACKING', {
    weather: { temperatureC: 36, precipitationRiskPercent: 0 },
    route: { distanceKm: 75, targetSpeedKmH: 19.0 },
    office: { targetGateArrivalTime: '17:00' },
  }),
  createScenario(67, 'Alpine Valley Descent with Loaded Rig', 'BIKEPACKING', {
    physics: { gradientPercent: -2.5, gearWeightKg: 18.0 },
    route: { distanceKm: 45, targetSpeedKmH: 26.0 },
    office: { targetGateArrivalTime: '15:00' },
  }),
  createScenario(68, 'Bikepacking with Spare Derailleur Hanger Check', 'BIKEPACKING', {
    route: { distanceKm: 70, targetSpeedKmH: 20.0 },
    lang: 'fr',
  }),
  createScenario(69, 'Bikepacking Expedition with 20,000mAh Power Staging', 'BIKEPACKING', {
    route: { distanceKm: 80, targetSpeedKmH: 19.5 },
  }),
  createScenario(70, 'Bikepacking Stove & Warm Recovery Nutrition Check', 'BIKEPACKING', {
    route: { distanceKm: 60, targetSpeedKmH: 18.5 },
    office: { targetGateArrivalTime: '18:15' },
  }),

  // ══════════════════════════════════════════════════════════════════
  // GROUP 4: ESCAPADE, LEISURE & HOTEL TOURING (71 to 85)
  // ══════════════════════════════════════════════════════════════════
  createScenario(71, 'Weekend Escapade to Clisson (Hôtel Villa Saint-Antoine)', 'ESCAPADE', {
    route: { origin: 'Nantes Château', destination: 'Hôtel Villa Saint-Antoine (Clisson)', distanceKm: 38, targetSpeedKmH: 24.0 },
    office: { targetGateArrivalTime: '15:00', shiftStartTime: '16:00', gateName: 'Hotel Reception' },
    physics: { gearWeightKg: 5.5, bikeWeightKg: 9.8 },
  }),
  createScenario(72, 'Vineyard Country Hotel Tour to Vallet', 'ESCAPADE', {
    route: { destination: 'Château du Cléray Vallet', distanceKm: 32, targetSpeedKmH: 21.0 },
    office: { targetGateArrivalTime: '14:30', shiftStartTime: '15:30' },
  }),
  createScenario(73, 'Coastal Resort Getaway to Pornichet', 'ESCAPADE', {
    route: { destination: 'Hôtel des Bains Pornichet', distanceKm: 58, targetSpeedKmH: 23.5 },
    office: { targetGateArrivalTime: '16:00', shiftStartTime: '17:00' },
  }),
  createScenario(74, 'Medieval Ramparts Boutique Gîte in Guérande', 'ESCAPADE', {
    route: { destination: 'Gîte des Remparts Guérande', distanceKm: 48, targetSpeedKmH: 22.0 },
    office: { targetGateArrivalTime: '16:30' },
  }),
  createScenario(75, 'Scenic River Bank Tour to Ancenis Bistro', 'ESCAPADE', {
    route: { destination: 'Bistro de la Loire Ancenis', distanceKm: 36, targetSpeedKmH: 20.0 },
    office: { targetGateArrivalTime: '12:30' },
  }),
  createScenario(76, 'Tidal Passage Crossing to Noirmoutier Island', 'ESCAPADE', {
    route: { destination: 'Hôtel du Passage Gois Noirmoutier', distanceKm: 52, targetSpeedKmH: 23.0 },
    office: { targetGateArrivalTime: '13:15' },
  }),
  createScenario(77, 'Early Check-In Escapade (13:00 Arrival)', 'ESCAPADE', {
    route: { destination: 'Manoir de Belle-Île', distanceKm: 35, targetSpeedKmH: 24.0 },
    office: { targetGateArrivalTime: '13:00' },
  }),
  createScenario(78, 'Late Evening Dining Escapade (19:30 Check-In)', 'ESCAPADE', {
    route: { destination: 'Auberge du Vignoble', distanceKm: 65, targetSpeedKmH: 25.0 },
    office: { targetGateArrivalTime: '19:30', shiftStartTime: '20:30' },
  }),
  createScenario(79, 'French Escapade NLP Prompt with Hotel Check-in', 'ESCAPADE', {
    nlpPrompt: 'Escapade à Clisson départ samedi 10h, hôtel réservé pour 15h, 38km allure 22 km/h avec 6kg bagages',
    lang: 'fr',
  }),
  createScenario(80, 'English Weekend Getaway NLP Prompt', 'ESCAPADE', {
    nlpPrompt: 'Weekend leisure tour to seaside hotel by 4pm, 45km ride at 24 km/h, dinner reservation at 7pm',
    lang: 'en',
  }),
  createScenario(81, 'Gentle Couples Touring Pace (18 km/h)', 'ESCAPADE', {
    route: { distanceKm: 28, targetSpeedKmH: 18.0 },
    office: { targetGateArrivalTime: '14:30' },
  }),
  createScenario(82, 'Autumn Rain Winery Tour (12°C, 75% Rain)', 'ESCAPADE', {
    weather: { temperatureC: 12, precipitationRiskPercent: 75 },
    route: { distanceKm: 34, targetSpeedKmH: 21.0 },
    office: { targetGateArrivalTime: '15:00' },
  }),
  createScenario(83, 'Escapade with 45-Minute Mid-Route Gourmet Picnic', 'ESCAPADE', {
    nlpPrompt: 'Escapade 42km vers Clisson avec pause ravito pique-nique de 45 min, arrivée hôtel 16h',
    lang: 'fr',
  }),
  createScenario(84, 'Escapade with Locked Bike Storage Flag', 'ESCAPADE', {
    office: { gateName: 'Local Vélo Fermé Hôtel', notes: 'Private locked bike garage confirmed' },
    route: { distanceKm: 40, targetSpeedKmH: 23.0 },
  }),
  createScenario(85, 'Escapade Return Leg (Hotel to Home Base)', 'ESCAPADE', {
    route: { origin: 'Hôtel Clisson', destination: 'Nantes Domicile', distanceKm: 38, targetSpeedKmH: 24.5 },
    office: { targetGateArrivalTime: '18:00', gateName: 'Home Garage' },
  }),

  // ══════════════════════════════════════════════════════════════════
  // GROUP 5: BOUNDARY, STRESS & ADVERSARIAL EDGE CASES (86 to 100)
  // ══════════════════════════════════════════════════════════════════
  createScenario(86, 'Boundary: Zero Distance (0.0 km)', 'BOUNDARY_EDGE', {
    route: { distanceKm: 0.0, targetSpeedKmH: 25.0 },
  }),
  createScenario(87, 'Boundary: Micro-Commute (0.5 km)', 'BOUNDARY_EDGE', {
    route: { distanceKm: 0.5, targetSpeedKmH: 20.0 },
  }),
  createScenario(88, 'Boundary: Minimal Target Speed (5.0 km/h walking clamp)', 'BOUNDARY_EDGE', {
    route: { distanceKm: 20.0, targetSpeedKmH: 5.0 },
  }),
  createScenario(89, 'Boundary: Extreme Pro Speed (60.0 km/h)', 'BOUNDARY_EDGE', {
    route: { distanceKm: 30.0, targetSpeedKmH: 60.0 },
  }),
  createScenario(90, 'Boundary: Ultra-Endurance Audax (350.0 km)', 'BOUNDARY_EDGE', {
    route: { distanceKm: 350.0, targetSpeedKmH: 26.0 },
    office: { targetGateArrivalTime: '22:00' },
  }),
  createScenario(91, 'Boundary: Featherweight System Mass (Rider 40kg, Bike 5kg, Gear 0kg)', 'BOUNDARY_EDGE', {
    physics: { riderWeightKg: 40, bikeWeightKg: 5.0, gearWeightKg: 0.0 },
  }),
  createScenario(92, 'Boundary: Super-Heavy Cargo Rig (Rider 130kg, Bike 28kg, Gear 35kg)', 'BOUNDARY_EDGE', {
    physics: { riderWeightKg: 130, bikeWeightKg: 28.0, gearWeightKg: 35.0 },
  }),
  createScenario(93, 'Boundary: Extreme Negative Gradient (-12.0% Steep Descent)', 'BOUNDARY_EDGE', {
    physics: { gradientPercent: -12.0 },
    route: { distanceKm: 25.0, targetSpeedKmH: 45.0 },
  }),
  createScenario(94, 'Boundary: Extreme Wall Climb (+16.0% Gradient)', 'BOUNDARY_EDGE', {
    physics: { gradientPercent: 16.0 },
    route: { distanceKm: 10.0, targetSpeedKmH: 12.0 },
  }),
  createScenario(95, 'Boundary: Hurricane Storm Gale (75 km/h Wind, 95 km/h Gusts)', 'BOUNDARY_EDGE', {
    weather: { baseWindSpeedKmH: 75, estuaryGustKmH: 95, isHeadwindActive: true },
  }),
  createScenario(96, 'Boundary: Dead Sea Dense Atmosphere (rho 1.35 kg/m³, -10°C, 1045 hPa)', 'BOUNDARY_EDGE', {
    physics: { rho: 1.35 },
    weather: { temperatureC: -10 },
  }),
  createScenario(97, 'Boundary: Extreme High-Altitude Air (rho 0.82 kg/m³ at 4200m)', 'BOUNDARY_EDGE', {
    physics: { rho: 0.82 },
  }),
  createScenario(98, 'Boundary: Midnight Minute Crossing (Shift 00:10, 2h Ride)', 'BOUNDARY_EDGE', {
    office: { shiftStartTime: '00:10', targetGateArrivalTime: '23:45' },
    route: { distanceKm: 50.0, targetSpeedKmH: 25.0 },
  }),
  createScenario(99, 'Boundary: Missing/Empty Text Strings & Edge Flags', 'BOUNDARY_EDGE', {
    route: { origin: '', destination: '', distanceKm: 20 },
    office: { gateName: '', notes: '' },
  }),
  createScenario(100, 'Boundary: Complex Jargon Bilingual French Slang NLP Stress Test', 'BOUNDARY_EDGE', {
    nlpPrompt: "Salut l'équipe ! Vélotaf demain matin, départ Nantes direction Porte 17, shift à 9h pétantes, 24 bornes à 27 km/h, 15 km/h de vent dans la gueule sur le pont, prévoir 10 min de marge anti-crevaison et un ravito vestiaire de 12 min. J'ai 4,5 kg de matos.",
    lang: 'fr',
  }),
];

export function runFullStressTestAudit(): {
  totalScenarios: number;
  passedCount: number;
  warnCount: number;
  failCount: number;
  results: ScenarioAuditResult[];
  globalAnomalies: string[];
} {
  const results: ScenarioAuditResult[] = [];
  const globalAnomalies: Set<string> = new Set();

  for (const scen of SCENARIOS) {
    const anomalies: string[] = [];
    const warnings: string[] = [];

    let trip = { ...scen.trip };
    let nlpFeedback: ScenarioAuditResult['nlpFeedback'];

    // 1. NLP Parser step if prompt provided
    if (scen.nlpPrompt) {
      try {
        const parseRes = parseTripDescription(scen.nlpPrompt, trip, scen.lang || 'en');
        nlpFeedback = {
          extractedCount: parseRes.extractedSummary.length,
          detectedSpeed: parseRes.detected.speed,
          detectedDist: parseRes.detected.distance,
          detectedArrival: parseRes.detected.arrivalTarget,
          detectedRollout: parseRes.detected.rolloutTime,
        };

        // Merge parsed values into trip
        trip = {
          ...trip,
          ...parseRes.parsedValues,
          physics: { ...trip.physics, ...(parseRes.parsedValues.physics || {}) },
          route: { ...trip.route, ...(parseRes.parsedValues.route || {}) },
          office: { ...trip.office, ...(parseRes.parsedValues.office || {}) },
          weather: { ...trip.weather, ...(parseRes.parsedValues.weather || {}) },
        };
      } catch (err: any) {
        anomalies.push(`NLP Parsing threw exception: ${err.message}`);
      }
    }

    // 2. Physics Engine Execution
    let physResult: any = {};
    try {
      physResult = calculatePhysics(trip.physics, trip.route, trip.weather, scen.lang || 'en');

      // Check for numeric validity
      if (Number.isNaN(physResult.legWatts)) anomalies.push('Physics: legWatts is NaN');
      if (!Number.isFinite(physResult.legWatts)) anomalies.push('Physics: legWatts is not finite');
      if (Number.isNaN(physResult.totalWorkKj)) anomalies.push('Physics: totalWorkKj is NaN');
      if (Number.isNaN(physResult.totalKcalBurn)) anomalies.push('Physics: totalKcalBurn is NaN');
      if (Number.isNaN(physResult.carbOxidationGramPerHour)) anomalies.push('Physics: carbOxidationGramPerHour is NaN');
      if (Number.isNaN(physResult.totalCarbsBurnedGrams)) anomalies.push('Physics: totalCarbsBurnedGrams is NaN');

      if (physResult.legWatts < 0) {
        warnings.push(`Physics: legWatts is negative (${physResult.legWatts}W) on gradient ${trip.physics.gradientPercent}%`);
      }
      if (physResult.movingTimeSeconds < 0) {
        anomalies.push(`Physics: movingTimeSeconds is negative (${physResult.movingTimeSeconds}s)`);
      }
    } catch (err: any) {
      anomalies.push(`Physics Engine threw exception: ${err.message}`);
    }

    // 3. Reverse Timeline Execution
    let timeResult: any = {};
    try {
      timeResult = calculateReverseTimeline(
        trip.route,
        trip.office,
        trip.weather,
        trip.tag,
        trip.route.destination,
        scen.lang || 'en'
      );

      // Check timeline sanity
      if (!timeResult.hardDepartureTime || timeResult.hardDepartureTime.includes('NaN')) {
        anomalies.push(`Timeline: hardDepartureTime is invalid ("${timeResult.hardDepartureTime}")`);
      }
      if (!timeResult.wakeUpTime || timeResult.wakeUpTime.includes('NaN')) {
        anomalies.push(`Timeline: wakeUpTime is invalid ("${timeResult.wakeUpTime}")`);
      }
      if (Number.isNaN(timeResult.pureMovingMinutes)) anomalies.push('Timeline: pureMovingMinutes is NaN');
      if (Number.isNaN(timeResult.totalDoorToDeskMinutes)) anomalies.push('Timeline: totalDoorToDeskMinutes is NaN');

      // Check step count
      if (!timeResult.steps || timeResult.steps.length === 0) {
        warnings.push('Timeline: generated 0 steps');
      }

      // Check midnight rollover logic
      const depHour = parseInt((timeResult.hardDepartureTime || '00').split(':')[0], 10);
      const arrHour = parseInt((timeResult.gateArrivalTime || '00').split(':')[0], 10);
      if (depHour > arrHour && (arrHour < 12 && depHour > 12)) {
        // Legitimate previous day rollover
        // e.g. Rollout at 23:30, arrival at 00:45
      }
    } catch (err: any) {
      anomalies.push(`Timeline Engine threw exception: ${err.message}`);
    }

    // 4. Checklist Generation
    let chkItems: any[] = [];
    try {
      chkItems = generateTripChecklist(trip.tag, trip.route.distanceKm, trip.weather, { lang: scen.lang || 'en' });
      if (chkItems.length === 0) warnings.push('Checklist: 0 items generated');
    } catch (err: any) {
      anomalies.push(`Checklist Generator threw exception: ${err.message}`);
    }

    // 5. Weather Horizon & Density
    try {
      const rhoCalc = calculateAirDensity(trip.weather.temperatureC, 1013);
      if (Number.isNaN(rhoCalc) || rhoCalc <= 0) {
        anomalies.push(`Weather: calculateAirDensity returned invalid rho (${rhoCalc})`);
      }
      const horizon = checkForecastHorizon(trip.departureDate || '2026-10-27');
      if (typeof horizon.isAvailable !== 'boolean') {
        anomalies.push('Weather: checkForecastHorizon returned invalid boolean');
      }
    } catch (err: any) {
      anomalies.push(`Weather Service threw exception: ${err.message}`);
    }

    // Record anomalies into global registry
    anomalies.forEach((a) => globalAnomalies.add(a));

    const status: ScenarioAuditResult['status'] = anomalies.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS';

    results.push({
      id: scen.id,
      name: scen.name,
      category: scen.category,
      status,
      physics: {
        systemMassKg: physResult.systemMassKg || 0,
        legWatts: Math.round(physResult.legWatts || 0),
        aeroWatts: Math.round(physResult.aerodynamicDragWatts || 0),
        rollingWatts: Math.round(physResult.rollingResistanceWatts || 0),
        gravityWatts: Math.round(physResult.gravityWatts || 0),
        movingTimeFormatted: physResult.movingTimeFormatted || '0m',
        totalKcalBurn: Math.round(physResult.totalKcalBurn || 0),
        totalCarbsGrams: Math.round(physResult.totalCarbsBurnedGrams || 0),
        carbRateGramsPerHour: Math.round(physResult.carbOxidationGramPerHour || 0),
        goStatus: physResult.goStatus || 'UNKNOWN',
        goStatusReason: physResult.goStatusReason || '',
      },
      timeline: {
        wakeUpTime: timeResult.wakeUpTime || '',
        preRideMealTime: timeResult.preRideMealTime || '',
        hardDepartureTime: timeResult.hardDepartureTime || '',
        gateArrivalTime: timeResult.gateArrivalTime || '',
        shiftStartTime: timeResult.shiftStartTime || '',
        pureMovingMinutes: timeResult.pureMovingMinutes || 0,
        totalDoorToDeskMinutes: timeResult.totalDoorToDeskMinutes || 0,
        bufferMinutes: timeResult.bufferMinutes || 0,
        stepCount: timeResult.steps?.length || 0,
        hasMidnightCrossing: Boolean(
          timeResult.hardDepartureTime &&
          timeResult.gateArrivalTime &&
          parseInt(timeResult.hardDepartureTime.split(':')[0], 10) > parseInt(timeResult.gateArrivalTime.split(':')[0], 10)
        ),
      },
      checklist: {
        totalItems: chkItems.length,
        criticalCount: chkItems.filter((c) => c.critical).length,
        hasThermalKit: chkItems.some((c) => c.id === 'gear-thermal'),
        hasPunctureKit: chkItems.some((c) => c.id.includes('mech-') || c.id.includes('creve')),
      },
      nlpFeedback,
      anomalies,
      warnings,
    });
  }

  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  return {
    totalScenarios: results.length,
    passedCount,
    warnCount,
    failCount,
    results,
    globalAnomalies: Array.from(globalAnomalies),
  };
}

import * as fs from 'fs';
import * as path from 'path';

// When run directly as a script
const audit = runFullStressTestAudit();

const outputPath = path.resolve(__dirname, 'audit_results.json');
fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2), 'utf-8');

console.log('AUDIT_COMPLETE: Total=' + audit.totalScenarios + ', Passed=' + audit.passedCount + ', Warn=' + audit.warnCount + ', Fail=' + audit.failCount);
console.log('Global Anomalies:', JSON.stringify(audit.globalAnomalies));
console.log('Results written to:', outputPath);

