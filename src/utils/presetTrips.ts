import {
  TripProfile,
  PhysicsParams,
  OfficeConstraints,
  WeatherCondition,
  generateTripChecklist,
} from '../types/trip';
import { ArchetypeMode } from './archetypeChips';
import { PRESET_ROUTES } from './presetRoutes';

export interface PresetTripTranslationEntry {
  en: { name: string; description: string; gateName: string };
  fr: { name: string; description: string; gateName: string };
}

interface PresetTripBlueprint {
  id: string;
  archetype: ArchetypeMode;
  tag: 'VÉLOTAF' | 'SPORT' | 'BIKEPACKING' | 'ESCAPADE';
  daysAheadOffset: number;
  departureTime: string;
  arriveAtMode: boolean;
  checkedRatio: number;
  origin: string;
  destination: string;
  targetSpeedKmH: number;
  urbanTrafficDelayMinutes: number;
  gateSecurityDelayMinutes: number;
  physics: PhysicsParams;
  office: Omit<OfficeConstraints, 'gateName'>;
  weather: WeatherCondition;
  customChips: string[];
  ruleSettings: Record<string, any>;
  translations: PresetTripTranslationEntry;
}

function detectStoredLanguage(): 'en' | 'fr' {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('velotaf_lang');
      if (saved === 'fr' || saved === 'en') {
        return saved;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) {
      return 'fr';
    }
  } catch {
    // Fallback to English in non-browser or restricted storage environments
  }
  return 'en';
}

function getOffsetLocalDateIso(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const PRESET_TRIP_BLUEPRINTS: PresetTripBlueprint[] = [
  // ── 1. COMMUTE / VÉLOTAF (3 Corridors) ─────────────────────────────────────
  {
    id: 'commute-nantes-atlantis',
    archetype: 'COMMUTE',
    tag: 'VÉLOTAF',
    daysAheadOffset: 0,
    departureTime: '07:38',
    arriveAtMode: true,
    checkedRatio: 0.82,
    origin: 'Gare de Nantes',
    destination: 'Saint-Herblain Atlantis',
    targetSpeedKmH: 24.5,
    urbanTrafficDelayMinutes: 7,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.6,
      gearWeightKg: 4.5,
      cda: 0.39,
      crr: 0.0058,
      rho: 1.225,
      drivetrainEfficiency: 0.95,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.4,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:30',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 12,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'Loire quay segregated cycleway into Atlantis tech campus. Arrival snack at 08:30 before 09:00 standup.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.236,
      isHeadwindActive: true,
      baseWindSpeedKmH: 9,
      windDirection: 'headwind',
      windDirectionDegrees: 265,
      temperatureC: 11,
      precipitationRiskPercent: 15,
      estuaryGustKmH: 16,
      visibilityKm: 14,
      isDay: true,
      sunrise: '07:35',
      sunset: '18:05',
    },
    customChips: ['coffee-stop', 'shower-locker', 'cargo-laptop-pack', 'bike-lane-priority'],
    ruleSettings: {
      cafeName: 'Torréfaction Quai de la Fosse',
      coffeeDurationMin: 12,
      rationType: 'Double espresso & artisanal fruit paste',
      showerMinutes: 12,
      lockerRefuelMinutes: 10,
      towelKitVerified: true,
      laptopCargoMassKg: 3.6,
      waterproofPannierCheck: true,
      segregatedTrackPct: 92,
    },
    translations: {
      en: {
        name: 'Loire Quay Morning Commute (Atlantis)',
        description:
          '9.4 km segregated riverside commute from Gare de Nantes to Saint-Herblain Atlantis with espresso stop, waterproof laptop pannier, and 08:30 arrival shower break.',
        gateName: 'Atlantis Campus',
      },
      fr: {
        name: 'Vélotaf Quais de Loire (Campus Atlantis)',
        description:
          'Trajet vélotaf sécurisé de 9,4 km depuis la Gare de Nantes vers Saint-Herblain Atlantis avec pause expresso, sacoche ordinateur étanche et pause douche à 08:30.',
        gateName: 'Campus Atlantis',
      },
    },
  },
  {
    id: 'commute-paris-seine',
    archetype: 'COMMUTE',
    tag: 'VÉLOTAF',
    daysAheadOffset: 1,
    departureTime: '07:22',
    arriveAtMode: true,
    checkedRatio: 0.75,
    origin: 'Place de la Bastille, Paris',
    destination: 'La Défense Grande Arche',
    targetSpeedKmH: 24.5,
    urbanTrafficDelayMinutes: 12,
    gateSecurityDelayMinutes: 5,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.2,
      gearWeightKg: 4.1,
      cda: 0.38,
      crr: 0.0055,
      rho: 1.232,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.5,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:35',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'Voies sur Berges + Pont de Neuilly segregated bike lane to La Défense tower bike shelter.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.242,
      isHeadwindActive: true,
      baseWindSpeedKmH: 7,
      windDirection: 'headwind',
      windDirectionDegrees: 280,
      temperatureC: 9,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 13,
      visibilityKm: 11,
      isDay: true,
      sunrise: '07:32',
      sunset: '17:55',
    },
    customChips: ['night-ride', 'hi-vis-vest', 'rush-hour-buffer', 'bike-lane-priority'],
    ruleSettings: {
      headlightLumens: '800+ lm (High beam)',
      nightCautionBufferMin: 10,
      hiVisMandate: true,
      isoVestVerified: true,
      reflectiveAnkleBands: true,
      peakRushBufferMin: 12,
      segregatedTrackPct: 88,
    },
    translations: {
      en: {
        name: 'Seine Express Cycleway (Bastille → La Défense)',
        description:
          '16.1 km dawn urban transit along the Seine cycleways and Neuilly bridge with 800+ lm lighting, EN ISO 20471 yellow vest, and peak rush-hour cushion.',
        gateName: 'Tour Majunga Bike Bay',
      },
      fr: {
        name: 'Axe Seine Express (Bastille → La Défense)',
        description:
          'Traversée matinale de 16,1 km par les voies sur berges et le pont de Neuilly avec éclairage 800+ lm, gilet jaune homologué et marge heure de pointe.',
        gateName: 'Parking Vélo Tour Majunga',
      },
    },
  },
  {
    id: 'commute-lyon-saone',
    archetype: 'COMMUTE',
    tag: 'VÉLOTAF',
    daysAheadOffset: 1,
    departureTime: '06:42',
    arriveAtMode: true,
    checkedRatio: 0.7,
    origin: 'Villefranche-sur-Saône Gare',
    destination: 'Lyon Part-Dieu',
    targetSpeedKmH: 29.5,
    urbanTrafficDelayMinutes: 9,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 8.9,
      gearWeightKg: 4.4,
      cda: 0.36,
      crr: 0.0054,
      rho: 1.228,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0.4,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:25',
      lockerRefuelMinutes: 10,
      showerChangeMinutes: 14,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: true,
      badgeRequiredForGate: true,
      notes: 'Voie Bleue Saône towpath tempo commute into Lyon Part-Dieu business district.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.235,
      isHeadwindActive: false,
      baseWindSpeedKmH: 5,
      windDirection: 'calm',
      windDirectionDegrees: 175,
      temperatureC: 10,
      precipitationRiskPercent: 25,
      estuaryGustKmH: 11,
      visibilityKm: 15,
      isDay: true,
      sunrise: '07:20',
      sunset: '17:52',
    },
    customChips: ['fitness-boost', 'hill-climb', 'shower-locker', 'bad-weather-prep'],
    ruleSettings: {
      targetWattsFloor: 245,
      warmupDurationMin: 12,
      electrolyteElectrolyteRequired: true,
      targetVam: 740,
      climbingBufferMin: 8,
      gradientPercent: 0.4,
      showerMinutes: 14,
      lockerRefuelMinutes: 10,
      towelKitVerified: true,
      wetRoadBufferMin: 6,
      mudguardFitted: true,
    },
    translations: {
      en: {
        name: 'Saône Valley Tempo Commute (Part-Dieu)',
        description:
          '38.3 km endurance commuter express from Villefranche along the Saône towpath into Lyon Part-Dieu, pairing Zone 3 fitness intervals with full splash-guard protection.',
        gateName: 'Part-Dieu Secure Bike Hub',
      },
      fr: {
        name: 'Vélotaf Tempo Val de Saône (Lyon Part-Dieu)',
        description:
          'Vélotaf longue distance de 38,3 km le long de la Saône vers Lyon Part-Dieu, combinant allure cardio Zone 3, garde-boue intégraux et protocole douche complet.',
        gateName: 'Consigne Vélo Part-Dieu',
      },
    },
  },

  // ── 2. SPORT (3 Corridors) ─────────────────────────────────────────────────
  {
    id: 'sport-cote-sauvage',
    archetype: 'SPORT',
    tag: 'SPORT',
    daysAheadOffset: 1,
    departureTime: '09:30',
    arriveAtMode: true,
    checkedRatio: 0.78,
    origin: 'Pornichet Port',
    destination: 'Piriac-sur-Mer',
    targetSpeedKmH: 33.5,
    urbanTrafficDelayMinutes: 4,
    gateSecurityDelayMinutes: 2,
    physics: {
      riderWeightKg: 73,
      bikeWeightKg: 7.9,
      gearWeightKg: 2.0,
      cda: 0.28,
      crr: 0.0044,
      rho: 1.222,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0.2,
    },
    office: {
      shiftStartTime: '11:00',
      targetGateArrivalTime: '10:35',
      lockerRefuelMinutes: 15,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Atlantic headland echelon drill along La Baule, Le Croisic, and Piriac coastal road.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.222,
      isHeadwindActive: true,
      baseWindSpeedKmH: 8,
      windDirection: 'cross-headwind',
      windDirectionDegrees: 295,
      temperatureC: 14,
      precipitationRiskPercent: 5,
      estuaryGustKmH: 19,
      visibilityKm: 22,
      isDay: true,
      sunrise: '07:38',
      sunset: '18:08',
    },
    customChips: ['paceline-drafting', 'fast-group-ride', 'hydration-electrolytes'],
    ruleSettings: {
      targetPacelineSpeedKmH: 34,
      pelotonAvgSpeedKmH: 34,
      carbTargetGramHour: 80,
    },
    translations: {
      en: {
        name: 'Côte Sauvage Aero Paceline (Piriac)',
        description:
          '23.3 km Atlantic coastal chain-gang sprint from Pornichet to Piriac-sur-Mer in tight echelon rotation at 33.5 km/h with 80 g/h isotonic carbohydrate fueling.',
        gateName: 'Piriac Lighthouse Finish',
      },
      fr: {
        name: 'Bordures Aéro Côte Sauvage (Piriac)',
        description:
          'Sortie peloton rythmée de 23,3 km entre Pornichet et Piriac-sur-Mer en relais serrés à 33,5 km/h avec protocole glucidique isotonique à 80 g/h.',
        gateName: 'Arrivée Phare de Piriac',
      },
    },
  },
  {
    id: 'sport-annecy-forclaz',
    archetype: 'SPORT',
    tag: 'SPORT',
    daysAheadOffset: 2,
    departureTime: '08:45',
    arriveAtMode: true,
    checkedRatio: 0.72,
    origin: 'Annecy Pâquier',
    destination: 'Col de la Forclaz',
    targetSpeedKmH: 19.5,
    urbanTrafficDelayMinutes: 3,
    gateSecurityDelayMinutes: 2,
    physics: {
      riderWeightKg: 72,
      bikeWeightKg: 7.5,
      gearWeightKg: 1.8,
      cda: 0.33,
      crr: 0.0045,
      rho: 1.185,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.23,
      gradientPercent: 3.9,
    },
    office: {
      shiftStartTime: '10:30',
      targetGateArrivalTime: '10:05',
      lockerRefuelMinutes: 15,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Lakeside progressive warmup to Menthon followed by sustained threshold climb to Col de la Forclaz (1,150 m).',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.185,
      isHeadwindActive: false,
      baseWindSpeedKmH: 4,
      windDirection: 'calm',
      windDirectionDegrees: 190,
      temperatureC: 13,
      precipitationRiskPercent: 5,
      estuaryGustKmH: 9,
      visibilityKm: 25,
      isDay: true,
      sunrise: '07:15',
      sunset: '17:50',
    },
    customChips: ['climbing-kom-hunt', 'interval-training', 'hydration-electrolytes'],
    ruleSettings: {
      komPeakWatts: 365,
      intervalWatts: 295,
      carbTargetGramHour: 85,
    },
    translations: {
      en: {
        name: 'Col de la Forclaz KOM Ascent (Annecy)',
        description:
          '17.7 km Alpine climbing benchmark (+790 m D+) from Lake Annecy up to Col de la Forclaz with structured threshold intervals and 85 g/h high-carb pacing.',
        gateName: 'Col de la Forclaz Summit (1150 m)',
      },
      fr: {
        name: 'Ascension KOM Col de la Forclaz (Annecy)',
        description:
          'Montée référence de 17,7 km (+790 m D+) depuis le Pâquier d’Annecy jusqu’au Col de la Forclaz avec séries au seuil et apport glucidique à 85 g/h.',
        gateName: 'Sommet Col de la Forclaz (1150 m)',
      },
    },
  },
  {
    id: 'sport-briere-gravel',
    archetype: 'SPORT',
    tag: 'SPORT',
    daysAheadOffset: 2,
    departureTime: '09:15',
    arriveAtMode: true,
    checkedRatio: 0.8,
    origin: 'Guérande Remparts',
    destination: 'La Roche-Bernard Port',
    targetSpeedKmH: 27.5,
    urbanTrafficDelayMinutes: 4,
    gateSecurityDelayMinutes: 2,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 8.6,
      gearWeightKg: 2.4,
      cda: 0.35,
      crr: 0.0068,
      rho: 1.224,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0.4,
    },
    office: {
      shiftStartTime: '11:00',
      targetGateArrivalTime: '10:35',
      lockerRefuelMinutes: 15,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 15,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Fast Brière marshland gravel tracks and Vilaine valley rollers on 40mm tubeless tires at 2.5 bar.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.224,
      isHeadwindActive: false,
      baseWindSpeedKmH: 6,
      windDirection: 'calm',
      windDirectionDegrees: 215,
      temperatureC: 15,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 12,
      visibilityKm: 20,
      isDay: true,
      sunrise: '07:36',
      sunset: '18:06',
    },
    customChips: ['off-road-exploration', 'interval-training', 'hydration-electrolytes', 'eco-friendly-path'],
    ruleSettings: {
      tirePressureBar: 2.5,
      intervalWatts: 285,
      carbTargetGramHour: 75,
      sharedPathSpeedLimitKmH: 25,
    },
    translations: {
      en: {
        name: 'Brière Gravel Tempo (Guérande → Vilaine)',
        description:
          '25.2 km mixed-surface gravel tempo across the Brière Regional Park to La Roche-Bernard with 2.5 bar tubeless setup, sweetspot surges, and zero-waste fueling.',
        gateName: 'La Roche-Bernard Old Harbour',
      },
      fr: {
        name: 'Gravel Tempo Brière (Guérande → Vilaine)',
        description:
          'Parcours gravel rapide de 25,2 km à travers le Parc de Brière vers La Roche-Bernard en tubeless 2,5 bar, séries sweetspot et charte zéro déchet.',
        gateName: 'Vieux Port de La Roche-Bernard',
      },
    },
  },

  // ── 3. BIKEPACKING (3 Corridors) ───────────────────────────────────────────
  {
    id: 'bikepacking-jade-coast',
    archetype: 'BIKEPACKING',
    tag: 'BIKEPACKING',
    daysAheadOffset: 1,
    departureTime: '14:30',
    arriveAtMode: true,
    checkedRatio: 0.75,
    origin: 'Saint-Brevin-les-Pins',
    destination: 'Bouin Port du Bec',
    targetSpeedKmH: 20.5,
    urbanTrafficDelayMinutes: 6,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 10.4,
      gearWeightKg: 11.2,
      cda: 0.43,
      crr: 0.0074,
      rho: 1.225,
      drivetrainEfficiency: 0.94,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.3,
    },
    office: {
      shiftStartTime: '18:30',
      targetGateArrivalTime: '17:45',
      lockerRefuelMinutes: 25,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Vélodyssée coastal pine tracks and Bourgneuf oyster marshes. Pitch ultralight shelter before dusk.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.225,
      isHeadwindActive: true,
      baseWindSpeedKmH: 11,
      windDirection: 'cross-headwind',
      windDirectionDegrees: 255,
      temperatureC: 13,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 18,
      visibilityKm: 18,
      isDay: true,
      sunrise: '07:36',
      sunset: '18:07',
    },
    customChips: ['bivouac-camp', 'resupply-points', 'gravel-trail-master', 'solar-power-recharge'],
    ruleSettings: {
      bivouacCurfew: '18:30',
      resupplyIntervalKm: 30,
      trailSectorBufferMin: 12,
      powerBankMassKg: 0.6,
    },
    translations: {
      en: {
        name: 'Jade Coast & Oyster Marsh Bivouac',
        description:
          '41.0 km self-supported Vélodyssée stage from Saint-Brevin to Port du Bec across coastal pine trails and salt marshes with full bivouac kit and 20,000mAh power reserve.',
        gateName: 'Port du Bec Marsh Bivouac',
      },
      fr: {
        name: 'Bivouac Côte de Jade & Marais Breton',
        description:
          'Étape Vélodyssée en autonomie de 41,0 km de Saint-Brevin au Port du Bec entre pinèdes côtières et marais ostréicoles avec kit bivouac et batterie 20 000 mAh.',
        gateName: 'Bivouac du Port du Bec',
      },
    },
  },
  {
    id: 'bikepacking-canal-redon',
    archetype: 'BIKEPACKING',
    tag: 'BIKEPACKING',
    daysAheadOffset: 2,
    departureTime: '12:45',
    arriveAtMode: true,
    checkedRatio: 0.67,
    origin: 'Nort-sur-Erdre Port',
    destination: 'Redon Port de Plaisance',
    targetSpeedKmH: 20.0,
    urbanTrafficDelayMinutes: 6,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 10.6,
      gearWeightKg: 10.8,
      cda: 0.42,
      crr: 0.0066,
      rho: 1.224,
      drivetrainEfficiency: 0.95,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.2,
    },
    office: {
      shiftStartTime: '18:30',
      targetGateArrivalTime: '17:45',
      lockerRefuelMinutes: 25,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Canal de Nantes à Brest lock-house towpath haul with bakery resupply at Blain Castle.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.224,
      isHeadwindActive: false,
      baseWindSpeedKmH: 6,
      windDirection: 'calm',
      windDirectionDegrees: 165,
      temperatureC: 14,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 11,
      visibilityKm: 20,
      isDay: true,
      sunrise: '07:35',
      sunset: '18:05',
    },
    customChips: ['leisure-cruise', 'scenic-route', 'bivouac-camp', 'resupply-points'],
    ruleSettings: {
      speedLimitKmH: 20,
      maxContinuousRidingMin: 75,
      photoStopsTotalMin: 25,
      bivouacCurfew: '18:30',
      resupplyIntervalKm: 35,
    },
    translations: {
      en: {
        name: 'Nantes–Brest Canal Towpath Expedition',
        description:
          '70.3 km traffic-free towpath expedition from Nort-sur-Erdre to Redon past historic lock houses and Blain Castle, paced at a steady 20 km/h cruise before camp curfew.',
        gateName: 'Redon Canal Basin Camp',
      },
      fr: {
        name: 'Expédition Canal de Nantes à Brest (Redon)',
        description:
          'Traversée de 70,3 km sur le chemin de halage de Nort-sur-Erdre à Redon au fil des écluses et du château de Blain, régulée à 20 km/h avant le bivouac.',
        gateName: 'Campement Bassin de Redon',
      },
    },
  },
  {
    id: 'bikepacking-drome-vercors',
    archetype: 'BIKEPACKING',
    tag: 'BIKEPACKING',
    daysAheadOffset: 3,
    departureTime: '12:30',
    arriveAtMode: true,
    checkedRatio: 0.73,
    origin: 'Valence',
    destination: 'Die',
    targetSpeedKmH: 18.5,
    urbanTrafficDelayMinutes: 6,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 10.8,
      gearWeightKg: 12.2,
      cda: 0.44,
      crr: 0.0076,
      rho: 1.205,
      drivetrainEfficiency: 0.94,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 1.4,
    },
    office: {
      shiftStartTime: '18:30',
      targetGateArrivalTime: '17:30',
      lockerRefuelMinutes: 30,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Vercors foothills gravel ascent along the Drôme river valley through Crest medieval tower to Die.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.205,
      isHeadwindActive: false,
      baseWindSpeedKmH: 7,
      windDirection: 'calm',
      windDirectionDegrees: 140,
      temperatureC: 15,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 14,
      visibilityKm: 24,
      isDay: true,
      sunrise: '07:12',
      sunset: '17:54',
    },
    customChips: ['mountain-adventure', 'emergency-first-aid', 'solar-power-recharge', 'gravel-trail-master'],
    ruleSettings: {
      bivouacCurfewTime: '18:15',
      campBreakdownMin: 30,
      medicalKitChecked: true,
      powerBankMassKg: 0.6,
      trailSectorBufferMin: 15,
    },
    translations: {
      en: {
        name: 'Drôme Valley & Vercors Foothills Haul',
        description:
          '58.5 km mountain bikepacking stage (+1,331 m D+) from Valence to Die via Crest, equipped with 12.2 kg alpine rig, wilderness trauma kit, and pre-dusk camp curfew.',
        gateName: 'Die Vercors Highland Bivouac',
      },
      fr: {
        name: 'Bikepacking Vallée de la Drôme & Vercors',
        description:
          'Étape montagne de 58,5 km (+1 331 m D+) de Valence à Die par la tour de Crest avec chargement alpin de 12,2 kg, trousse secours et couvre-feu bivouac.',
        gateName: 'Bivouac Piémont du Vercors (Die)',
      },
    },
  },

  // ── 4. ESCAPADE (3 Corridors) ──────────────────────────────────────────────
  {
    id: 'escapade-clisson-spa',
    archetype: 'ESCAPADE',
    tag: 'ESCAPADE',
    daysAheadOffset: 2,
    departureTime: '13:30',
    arriveAtMode: true,
    checkedRatio: 0.82,
    origin: 'Château des Ducs, Nantes',
    destination: 'Hôtel Villa Saint-Antoine, Clisson',
    targetSpeedKmH: 22.5,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.8,
      gearWeightKg: 5.2,
      cda: 0.39,
      crr: 0.0056,
      rho: 1.22,
      drivetrainEfficiency: 0.95,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.4,
    },
    office: {
      shiftStartTime: '17:30',
      targetGateArrivalTime: '16:15',
      lockerRefuelMinutes: 20,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Vineyard greenway along the Sèvre Nantaise to Villa Saint-Antoine hotel check-in, thermal spa, and riverside dining.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.22,
      isHeadwindActive: false,
      baseWindSpeedKmH: 5,
      windDirection: 'calm',
      windDirectionDegrees: 135,
      temperatureC: 16,
      precipitationRiskPercent: 5,
      estuaryGustKmH: 9,
      visibilityKm: 24,
      isDay: true,
      sunrise: '07:34',
      sunset: '18:04',
    },
    customChips: ['spa-wellness', 'local-gastronomy', 'photography-spots', 'historical-tour'],
    ruleSettings: {
      spaSessionDurationMin: 50,
      dinnerReservationTime: '19:45',
      goldenHourTarget: '17:30',
      shootingPausesTotalMin: 15,
      monumentPauseMin: 25,
    },
    translations: {
      en: {
        name: 'Sèvre Vineyard & Clisson Spa Escapade',
        description:
          '30.5 km scenic vineyard ride from Nantes Castle to Hôtel Villa Saint-Antoine overlooking Clisson fortress, timed for a 50-minute spa session and 19:45 terroir dinner.',
        gateName: 'Villa Saint-Antoine Reception',
      },
      fr: {
        name: 'Escapade Vignoble & Spa à Clisson',
        description:
          'Balade panoramique de 30,5 km du Château de Nantes à l’Hôtel Villa Saint-Antoine face à la forteresse de Clisson, calée pour 50 min de spa et le dîner à 19:45.',
        gateName: 'Réception Villa Saint-Antoine',
      },
    },
  },
  {
    id: 'escapade-saumur-chinon',
    archetype: 'ESCAPADE',
    tag: 'ESCAPADE',
    daysAheadOffset: 3,
    departureTime: '13:45',
    arriveAtMode: true,
    checkedRatio: 0.78,
    origin: 'Château de Saumur',
    destination: 'Forteresse Royale de Chinon',
    targetSpeedKmH: 22.0,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.9,
      gearWeightKg: 5.6,
      cda: 0.39,
      crr: 0.0055,
      rho: 1.218,
      drivetrainEfficiency: 0.95,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.4,
    },
    office: {
      shiftStartTime: '18:00',
      targetGateArrivalTime: '17:00',
      lockerRefuelMinutes: 15,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Loire à Vélo riverside heritage route via Montsoreau and Candes-Saint-Martin with waterside picnic and B&B check-in.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.218,
      isHeadwindActive: false,
      baseWindSpeedKmH: 4,
      windDirection: 'tailwind',
      windDirectionDegrees: 95,
      temperatureC: 17,
      precipitationRiskPercent: 0,
      estuaryGustKmH: 8,
      visibilityKm: 25,
      isDay: true,
      sunrise: '07:28',
      sunset: '18:00',
    },
    customChips: ['historical-tour', 'picnic-outing', 'scenic-waterways', 'bed-and-breakfast'],
    ruleSettings: {
      monumentPauseMin: 30,
      picnicDurationMin: 45,
      waterwaySpeedCapKmH: 22,
      hostGreetingTime: '17:00',
    },
    translations: {
      en: {
        name: 'Royal Loire Châteaux (Saumur → Chinon)',
        description:
          '27.7 km Loire à Vélo riverside tour linking Saumur Castle, Montsoreau confluence, and Chinon Royal Fortress with an insulated riverside picnic and 17:00 B&B greeting.',
        gateName: 'Clos de la Vienne B&B Courtyard',
      },
      fr: {
        name: 'Châteaux de la Loire (Saumur → Chinon)',
        description:
          'Échappée Loire à Vélo de 27,7 km reliant le Château de Saumur, Montsoreau et la Forteresse de Chinon avec pique-nique sur berge et accueil chambre d’hôtes à 17:00.',
        gateName: 'Cour Fermée Maison d’Hôtes Chinon',
      },
    },
  },
  {
    id: 'escapade-annecy-aix',
    archetype: 'ESCAPADE',
    tag: 'ESCAPADE',
    daysAheadOffset: 3,
    departureTime: '14:15',
    arriveAtMode: true,
    checkedRatio: 0.7,
    origin: "Vieille Ville d'Annecy",
    destination: "Thermes d'Aix-les-Bains",
    targetSpeedKmH: 23.5,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 4,
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 9.5,
      gearWeightKg: 5.0,
      cda: 0.38,
      crr: 0.0054,
      rho: 1.202,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.5,
    },
    office: {
      shiftStartTime: '18:30',
      targetGateArrivalTime: '17:30',
      lockerRefuelMinutes: 20,
      showerChangeMinutes: 15,
      breakRoomBreakfastMinutes: 20,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: 'Savoyard valley touring corridor from Annecy canals to Aix-les-Bains Belle Époque thermal resort.',
    },
    weather: {
      source: 'planned',
      airDensityRho: 1.202,
      isHeadwindActive: false,
      baseWindSpeedKmH: 5,
      windDirection: 'calm',
      windDirectionDegrees: 180,
      temperatureC: 16,
      precipitationRiskPercent: 5,
      estuaryGustKmH: 10,
      visibilityKm: 25,
      isDay: true,
      sunrise: '07:15',
      sunset: '17:51',
    },
    customChips: ['long-distance-endurance', 'local-gastronomy', 'cultural-audio-guide', 'photography-spots'],
    ruleSettings: {
      hotelCheckinDeadline: '17:30',
      dinnerReservationTime: '20:00',
      audioStopBufferMin: 15,
      goldenHourTarget: '17:45',
      shootingPausesTotalMin: 15,
    },
    translations: {
      en: {
        name: 'Savoyard Lakes & Thermal Aix Escapade',
        description:
          '34.7 km Alpine valley tour from Annecy Old Town canals to Aix-les-Bains thermal baths with audio heritage stops, golden-hour Lake Bourget views, and Savoyard dining.',
        gateName: 'Grand Hôtel du Parc Reception',
      },
      fr: {
        name: 'Escapade Lacs de Savoie & Aix Thermal',
        description:
          'Randonnée cyclo de 34,7 km des canaux d’Annecy jusqu’aux Thermes d’Aix-les-Bains avec étapes audio patrimoine, lumière dorée sur le lac du Bourget et table savoyarde.',
        gateName: 'Réception Grand Hôtel du Parc',
      },
    },
  },
];

export const PRESET_TRIP_TRANSLATIONS: Record<string, PresetTripTranslationEntry> =
  Object.fromEntries(PRESET_TRIP_BLUEPRINTS.map((bp) => [bp.id, bp.translations]));

function hydratePresetBlueprint(
  bp: PresetTripBlueprint,
  lang: 'en' | 'fr' = detectStoredLanguage()
): TripProfile {
  const geometry = PRESET_ROUTES[bp.id];
  const nowIso = new Date().toISOString();
  const localized = bp.translations[lang];

  const rawChecklist = generateTripChecklist(bp.tag, geometry.distanceKm, bp.weather, {
    lang,
    customChips: bp.customChips,
  });

  const preCheckedCount = Math.max(
    1,
    Math.min(rawChecklist.length - 1, Math.round(rawChecklist.length * bp.checkedRatio))
  );
  const checklist = rawChecklist.map((item, idx) => ({
    ...item,
    checked: idx < preCheckedCount,
  }));

  return {
    id: bp.id,
    name: localized.name,
    tag: bp.tag,
    description: localized.description,
    departureDate: getOffsetLocalDateIso(bp.daysAheadOffset),
    departureTime: bp.departureTime,
    arriveAtMode: bp.arriveAtMode,
    createdAt: nowIso,
    updatedAt: nowIso,
    physics: { ...bp.physics },
    route: {
      origin: bp.origin,
      destination: bp.destination,
      distanceKm: geometry.distanceKm,
      elevationGainM: geometry.elevationGainM,
      targetSpeedKmH: bp.targetSpeedKmH,
      urbanTrafficDelayMinutes: bp.urbanTrafficDelayMinutes,
      gateSecurityDelayMinutes: bp.gateSecurityDelayMinutes,
      coordinates: geometry.coordinates.map(([lat, lng]) => [lat, lng]),
    },
    office: {
      ...bp.office,
      gateName: localized.gateName,
    },
    weather: { ...bp.weather },
    checklist,
    customChips: [...bp.customChips],
    ruleSettings: { ...bp.ruleSettings },
  };
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates `count` (default 3) randomized preset trip projects with pre-fetched OSRM routes,
 * DEM elevation profiles, and preloaded archetype chips + ruleSettings.
 * Selects distinct archetypes in randomized order so every roll showcases varied ride modes.
 */
export function generateRandomPresetTrips(
  count: number = 3,
  excludeIds: string[] = [],
  lang: 'en' | 'fr' = detectStoredLanguage()
): TripProfile[] {
  const archetypes: ArchetypeMode[] = ['COMMUTE', 'SPORT', 'BIKEPACKING', 'ESCAPADE'];
  const selectedArchetypes = shuffleArray(archetypes).slice(0, Math.max(1, Math.min(count, archetypes.length)));
  const excludedSet = new Set(excludeIds);

  return selectedArchetypes.map((archetype) => {
    const pool = PRESET_TRIP_BLUEPRINTS.filter((bp) => bp.archetype === archetype);
    const freshPool = pool.filter((bp) => !excludedSet.has(bp.id));
    const candidates = freshPool.length > 0 ? freshPool : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return hydratePresetBlueprint(chosen, lang);
  });
}

/**
 * Full hydrated pool of all 12 curated preset trip projects across all 4 archetypes.
 */
export function getAllPresetTrips(lang: 'en' | 'fr' = detectStoredLanguage()): TripProfile[] {
  return PRESET_TRIP_BLUEPRINTS.map((bp) => hydratePresetBlueprint(bp, lang));
}

/**
 * Clean commuter baseline template used when creating a brand-new custom trip.
 */
export function buildDefaultNewTripTemplate(lang: 'en' | 'fr' = detectStoredLanguage()): TripProfile {
  const baseCommute = PRESET_TRIP_BLUEPRINTS[0];
  const hydrated = hydratePresetBlueprint(baseCommute, lang);
  return {
    ...hydrated,
    customChips: ['coffee-stop', 'rush-hour-buffer'],
    ruleSettings: {
      cafeName: 'Café de la Gare / Estuary Roaster',
      coffeeDurationMin: 15,
      rationType: 'Double espresso & almond pastry',
      peakRushBufferMin: 12,
    },
  };
}
