import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkle,
  RocketLaunch,
  Bicycle,
  Briefcase,
  Trophy,
  Compass,
  Clock,
  Gauge,
  Buildings,
  Coffee,
  Shower,
  ForkKnife,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle,
  SpinnerGap,
  MapPin,
  ArrowsLeftRight,
  Lightning,
  Wine,
  Tent,
  Sun,
  Moon,
  Flame,
  Bed,
  MapTrifold,
  BatteryCharging,
  Drop,
  Feather,
  Backpack,
  Package,
  Ruler,
  Target,
} from '@/components/icons';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { generateTripChecklist } from '../types/trip';
import {
  ARCHETYPE_CHIP_DEFINITIONS,
  CHIP_ICONS,
} from '../utils/archetypeChips';
import { Chip } from './common/Chip';
import { Badge } from './common/Badge';
import { IconBadge } from './common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../tokens/chipTokens';
import { LocationAutocompleteInput } from './configurator/LocationAutocompleteInput';
import { calculateAutoBikeRoute } from '../utils/routing';

// Map trip archetype tags to ArchetypeMode keys used in archetypeChips.ts
const ARCHETYPE_MODE_MAP = {
  VÉLOTAF: 'COMMUTE',
  SPORT: 'SPORT',
  BIKEPACKING: 'BIKEPACKING',
  ESCAPADE: 'ESCAPADE',
};

// 4 Archetypes with comprehensive French and English metadata
const ARCHETYPES = [
  {
    id: 'VÉLOTAF',
    nameEn: 'Vélotaf (Commuter)',
    nameFr: 'Vélotaf (Trajet Pro)',
    subtitleEn: 'Daily Transit & Work Protocol',
    subtitleFr: 'Transit quotidien & protocole d’entreprise',
    icon: Briefcase,
    descriptionEn:
      'Workplace transit with timed gate arrival, corporate locker buffers, and desk fueling rules.',
    descriptionFr:
      'Trajet domicile-travail avec heure d’arrivée ciblée, vestiaire & règles de ravitaillement.',
    defaultDistance: 35,
    defaultSpeed: 26.5,
    defaultArrival: '08:30',
    defaultDeparture: '07:00',
    defaultOrigin: 'Nantes Quai',
    defaultDestination: 'Saint-Nazaire Gate 17',
    corridorPresets: [
      { origin: 'Nantes Quai', destination: 'Saint-Nazaire Gate 17', distance: 64 },
      { origin: 'Gare de Nantes', destination: 'Saint-Herblain Atlantis', distance: 12 },
      { origin: 'Clisson Gare', destination: 'Nantes Île de Nantes', distance: 32 },
    ],
  },
  {
    id: 'SPORT',
    nameEn: 'Sport (Gran Fondo)',
    nameFr: 'Sport (Gran Fondo)',
    subtitleEn: 'High Tempo & Aero Efficiency',
    subtitleFr: 'Haute cadence & aérodynamisme',
    icon: Trophy,
    descriptionEn:
      'Aggressive drops posture, sustained tempo watts, rapid carbohydrate oxidation, and minimal transit delays.',
    descriptionFr:
      'Posture aéro agressive, watts soutenus, oxydation rapide des glucides et arrêts réduits au minimum.',
    defaultDistance: 45,
    defaultSpeed: 31.0,
    defaultArrival: '11:00',
    defaultDeparture: '09:00',
    defaultOrigin: 'La Baule Pier',
    defaultDestination: 'Guérande Ramparts',
    corridorPresets: [
      { origin: 'La Baule Pier', destination: 'Guérande Ramparts', distance: 18 },
      { origin: 'Pornichet Port', destination: 'Le Croisic Côte Sauvage', distance: 42 },
      { origin: 'Nantes Pont Anne de Bretagne', destination: 'Pornic Château', distance: 52 },
    ],
  },
  {
    id: 'BIKEPACKING',
    nameEn: 'Bikepacking',
    nameFr: 'Bikepacking (Aventure)',
    subtitleEn: 'Multi-Day Loaded Rig',
    subtitleFr: 'Itinérance & rig autonome',
    icon: Compass,
    descriptionEn:
      'Self-supported long-haul adventure with heavy gear loading, steady cruising pacing, and bivouac checkpoints.',
    descriptionFr:
      'Aventure au long cours en autonomie avec sacoches complètes, allure régulière et bivouac au crépuscule.',
    defaultDistance: 65,
    defaultSpeed: 21.0,
    defaultArrival: '18:00',
    defaultDeparture: '08:30',
    defaultOrigin: 'Saint-Brevin Trailhead',
    defaultDestination: 'Pornic Bivouac Cove',
    corridorPresets: [
      { origin: 'Saint-Brevin Trailhead', destination: 'Pornic Bivouac Cove', distance: 68 },
      { origin: 'Nantes Château des Ducs', destination: 'Angers Château', distance: 95 },
      { origin: 'Canal de Nantes à Brest', destination: 'Redon Port', distance: 75 },
    ],
  },
  {
    id: 'ESCAPADE',
    nameEn: 'Escapade (Weekend Touring)',
    nameFr: 'Escapade (Week-end)',
    subtitleEn: 'Scenic Getaway & Leisure',
    subtitleFr: 'Itinérance douce & découverte',
    icon: Wine,
    descriptionEn:
      'Relaxed scenic touring along vineyards and waterways, cultural sightseeing pauses, and boutique hotel check-in.',
    descriptionFr:
      'Sortie détente le long des vignobles et rivières, haltes patrimoine, et arrivée hôtel ou chambre d’hôtes.',
    defaultDistance: 38,
    defaultSpeed: 23.5,
    defaultArrival: '15:00',
    defaultDeparture: '10:00',
    defaultOrigin: 'Nantes Château',
    defaultDestination: 'Hôtel Villa Saint-Antoine (Clisson)',
    corridorPresets: [
      { origin: 'Nantes Château', destination: 'Hôtel Villa Saint-Antoine (Clisson)', distance: 38 },
      { origin: 'Saumur Château', destination: 'Chinon Forteresse Royale', distance: 32 },
      { origin: 'Tours Cathédrale', destination: 'Château d’Amboise', distance: 28 },
    ],
  },
];

// 3 Bike Types (Clear, straightforward naming)
const BIKE_PRESETS = [
  {
    id: 'road',
    nameEn: 'Road Bike (Aero / Race)',
    nameFr: 'Vélo de Route (Aéro / Course)',
    subtitleEn: 'Drops posture · 28mm slick tires',
    subtitleFr: 'Position basse aéro · Pneus lisses 28mm',
    bikeWeightKg: 8.2,
    cda: 0.32,
    crr: 0.0040,
    descriptionEn: 'Ultra-low rolling resistance and aggressive frontal aerodynamics.',
    descriptionFr: 'Résistance au roulement ultra-faible et pénétration dans l’air optimale.',
    tagEn: 'FAST & LIGHT',
    tagFr: 'LÉGER & RAPIDE',
  },
  {
    id: 'gravel',
    nameEn: 'Gravel / All-Road Commuter',
    nameFr: 'Gravel / Vélotaf Tout-Chemin',
    subtitleEn: 'Endurance hoods · 38mm all-weather tires',
    subtitleFr: 'Position aux cocottes · Pneus 38mm tout-temps',
    bikeWeightKg: 9.8,
    cda: 0.38,
    crr: 0.0055,
    descriptionEn: 'The versatile sweet spot: comfortable, puncture-resistant, and swift.',
    descriptionFr: 'Le compromis idéal : confortable, anti-crevaison et rapide sur asphalte.',
    tagEn: 'BALANCED & VERSATILE',
    tagFr: 'POLYVALENT & CONFORT',
  },
  {
    id: 'tourer',
    nameEn: 'Touring / Heavy Utility Rig',
    nameFr: 'Vélo de Randonnée / Trekking',
    subtitleEn: 'Upright cockpit · 42mm reinforced tires',
    subtitleFr: 'Position relevée · Pneus 42mm renforcés',
    bikeWeightKg: 12.5,
    cda: 0.44,
    crr: 0.0070,
    descriptionEn: 'Robust frame with rack mounts, fenders, and maximum load capacity.',
    descriptionFr: 'Cadre robuste avec porte-bagages, garde-boues et forte capacité de charge.',
    tagEn: 'STURDY & LOADED',
    tagFr: 'ROBUSTE & CHARGÉ',
  },
];

// Luggage Mass Presets
const LUGGAGE_PRESETS = [
  {
    id: 'feather',
    massKg: 1.5,
    nameEn: 'Featherweight',
    nameFr: 'Poids plume',
    subEn: 'Pockets & mini-tools (1.5 kg)',
    subFr: 'Poches & multi-outils (1,5 kg)',
    icon: Feather,
  },
  {
    id: 'commute',
    massKg: 4.0,
    nameEn: 'Commuter Pack',
    nameFr: 'Sac vélotaf',
    subEn: 'Laptop & office clothes (4 kg)',
    subFr: 'Ordi portable & rechange (4 kg)',
    icon: Backpack,
  },
  {
    id: 'touring',
    massKg: 8.5,
    nameEn: 'Moderate Touring',
    nameFr: 'Touring modéré',
    subEn: 'Double panniers & lock (8.5 kg)',
    subFr: 'Sacoches garnies & antivol (8,5 kg)',
    icon: Package,
  },
  {
    id: 'heavy',
    massKg: 14.0,
    nameEn: 'Heavy Expedition',
    nameFr: 'Expédition lourde',
    subEn: 'Tent, stove & sleeping pad (14 kg)',
    subFr: 'Tente, réchaud & duvet (14 kg)',
    icon: Tent,
  },
];

// Quirky Speed Tiers (Mapped strictly to 10-Palette Token Matrix)
const SPEED_TIERS = [
  {
    id: 'chill',
    min: 16,
    max: 22,
    targetSpeed: 20,
    icon: Coffee,
    theme: 'amber',
    titleEn: 'Chill & Scenic',
    titleFr: 'Nez au vent & Café',
    badgeEn: 'NO SWEAT',
    badgeFr: 'ZÉRO SUEUR',
    quoteEn: 'Upright coffee cruise. Enjoying the birds, zero sweat, baguette in hand.',
    quoteFr: 'Pédalage café décontracté. On écoute les oiseaux, zéro sueur, baguette sous le bras.',
  },
  {
    id: 'steady',
    min: 22.5,
    max: 27.5,
    targetSpeed: 25.5,
    icon: Bicycle,
    theme: 'emerald',
    titleEn: 'Daily Cadence',
    titleFr: 'Rythme Vélotaf',
    badgeEn: 'AEROBIC FLOW',
    badgeFr: 'ALLURE PROPRE',
    quoteEn: 'Smooth aerobic glide. Efficient cadence, effortless momentum on tarmac.',
    quoteFr: 'Allure de croisière efficace. Bon rythme, fluidité mécanique et kilomètres avalés.',
  },
  {
    id: 'tempo',
    min: 28,
    max: 33,
    targetSpeed: 30.5,
    icon: Lightning,
    theme: 'yellow-vest',
    titleEn: 'Aero Tempo',
    titleFr: 'Train Rapide & Aéro',
    badgeEn: 'DEEP IN DROPS',
    badgeFr: 'DANS LE CINTRE',
    quoteEn: 'Tucked in the hoods. Pushing threshold watts, overtaking e-bikes with authority.',
    quoteFr: 'Mains aux creux du cintre. Watts appuyés, dépassement franc et net des VAE !',
  },
  {
    id: 'monster',
    min: 33.5,
    max: 42,
    targetSpeed: 36,
    icon: Flame,
    theme: 'orange',
    titleEn: 'Watt Monster',
    titleFr: 'Monstre de Watts',
    badgeEn: 'RACE BREAKAWAY',
    badgeFr: 'ÉCHAPPÉE SOLO',
    quoteEn: 'Gran Fondo breakaway speed. Lactic acid is just seasoning for your pedals.',
    quoteFr: 'Allure contre-la-montre. L’acide lactique n’est qu’une épice pour vos cuisses.',
  },
];

function getSpeedTier(speed) {
  if (speed <= 22) return SPEED_TIERS[0];
  if (speed <= 27.5) return SPEED_TIERS[1];
  if (speed <= 33) return SPEED_TIERS[2];
  return SPEED_TIERS[3];
}

function calculateEstimatedDeparture(arrivalTime, distanceKm, speedKmH, bufferMinutes = 0) {
  if (!speedKmH || speedKmH <= 0) return '06:00';
  const [hStr, mStr] = (arrivalTime || '08:30').split(':');
  const h = parseInt(hStr, 10) || 8;
  const m = parseInt(mStr, 10) || 30;
  const transitMinutes = Math.round((distanceKm / speedKmH) * 60) + bufferMinutes;
  let departureMinutes = h * 60 + m - transitMinutes;
  while (departureMinutes < 0) departureMinutes += 24 * 60;
  const depH = Math.floor(departureMinutes / 60) % 24;
  const depM = departureMinutes % 60;
  return `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`;
}

function calculateEstimatedArrival(departureTime, distanceKm, speedKmH, bufferMinutes = 0) {
  if (!speedKmH || speedKmH <= 0) return '10:00';
  const [hStr, mStr] = (departureTime || '07:00').split(':');
  const h = parseInt(hStr, 10) || 7;
  const m = parseInt(mStr, 10) || 0;
  const transitMinutes = Math.round((distanceKm / speedKmH) * 60) + bufferMinutes;
  let arrivalMinutes = (h * 60 + m + transitMinutes) % (24 * 60);
  const arrH = Math.floor(arrivalMinutes / 60) % 24;
  const arrM = arrivalMinutes % 60;
  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
}

function calculateMovingTime(distanceKm, speedKmH) {
  if (!speedKmH || speedKmH <= 0) return '0h 00m';
  const totalMinutes = Math.round((distanceKm / speedKmH) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export const OnboardingModal = ({ isOpen, onClose, onLaunch }) => {
  const { lang, setLang, toggleLang, t } = useTranslation();
  const { isDark, toggleTheme, setTheme } = useTheme();
  const isFr = lang === 'fr';

  // Wizard internal step: 0 = Welcome & Fork, 1 = Archetype & Chips, 2 = Route, 3 = Equipment, 4 = Contextual Constraints
  const [step, setStep] = useState(0);

  // STEP 1 STATE: Starts BLANK to avoid orienting the user
  const [archetype, setArchetype] = useState(null);
  const [selectedChips, setSelectedChips] = useState([]);

  // STEP 2 STATE: Either corridor or manual distance (not both)
  const [routeMode, setRouteMode] = useState('corridor'); // 'corridor' | 'manual'
  const [origin, setOrigin] = useState('Nantes Quai');
  const [destination, setDestination] = useState('Saint-Nazaire Gate 17');
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [routeFetchFeedback, setRouteFetchFeedback] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(undefined);

  // Manual Distance state
  const [distanceKm, setDistanceKm] = useState(35);

  // Time Mode state: Arrival OR Departure time
  const [timeMode, setTimeMode] = useState('arrival'); // 'arrival' | 'departure'
  const [targetArrivalTime, setTargetArrivalTime] = useState('08:30');
  const [departureTime, setDepartureTime] = useState('07:00');

  // STEP 2: Quirky Cruising Pace Slider
  const [cruisingSpeedKmH, setCruisingSpeedKmH] = useState(26.0);

  // STEP 3 STATE: Starts BLANK (No pre-selected bike)
  const [riderWeightKg, setRiderWeightKg] = useState(74);
  const [gearWeightKg, setGearWeightKg] = useState(4.0);
  const [selectedBikeId, setSelectedBikeId] = useState(null);

  // STEP 4 CONTEXTUAL CONSTRAINTS STATE (Tailored per archetype)
  // Commute constraints
  const [breakfastBufferMinutes, setBreakfastBufferMinutes] = useState(15);
  const [hasLockerShower, setHasLockerShower] = useState(true);
  const [strictDeskFoodRestriction, setStrictDeskFoodRestriction] = useState(true);

  // Bikepacking constraints
  const [bivouacBufferMinutes, setBivouacBufferMinutes] = useState(30);
  const [hasWaterFilterStops, setHasWaterFilterStops] = useState(true);
  const [hasOffGridSolar, setHasOffGridSolar] = useState(true);

  // Sport constraints
  const [recoveryWindowMinutes, setRecoveryWindowMinutes] = useState(15);
  const [hasWarmupRollout, setHasWarmupRollout] = useState(true);
  const [highCarbPacingTarget, setHighCarbPacingTarget] = useState(true);

  // Escapade constraints
  const [hotelCheckinBufferMinutes, setHotelCheckinBufferMinutes] = useState(30);
  const [hasSecureGarageCheck, setHasSecureGarageCheck] = useState(true);
  const [hasPicnicTerroirHalt, setHasPicnicTerroirHalt] = useState(true);

  // Shared nutrition toggle
  const [realFoodNutrition, setRealFoodNutrition] = useState(true);

  if (!isOpen) return null;

  const activeMode = archetype ? ARCHETYPE_MODE_MAP[archetype] || 'COMMUTE' : 'COMMUTE';
  // Slices exactly 9 chips so the 3-column grid is always 3 rows x 3 columns (fixed height)
  const availableChips = (ARCHETYPE_CHIP_DEFINITIONS[activeMode] || []).slice(0, 9);
  const activeArchetypeDef = ARCHETYPES.find((a) => a.id === archetype) || null;

  const selectedBike = BIKE_PRESETS.find((p) => p.id === selectedBikeId) || null;

  const totalSystemMassKg = selectedBike
    ? (Number(riderWeightKg) + Number(selectedBike.bikeWeightKg) + Number(gearWeightKg)).toFixed(1)
    : (Number(riderWeightKg) + Number(gearWeightKg)).toFixed(1);

  const speedTier = getSpeedTier(cruisingSpeedKmH);

  // Compute total buffer minutes based on the chosen archetype's Step 4 controls
  const getTotalBufferMinutes = () => {
    if (archetype === 'VÉLOTAF') {
      return (hasLockerShower ? 15 : 0) + Number(breakfastBufferMinutes || 0);
    }
    if (archetype === 'BIKEPACKING') {
      return Number(bivouacBufferMinutes || 0) + (hasWaterFilterStops ? 20 : 0);
    }
    if (archetype === 'SPORT') {
      return (hasWarmupRollout ? 15 : 0) + Number(recoveryWindowMinutes || 0);
    }
    if (archetype === 'ESCAPADE') {
      return Number(hotelCheckinBufferMinutes || 0) + (hasPicnicTerroirHalt ? 45 : 0);
    }
    return 15;
  };

  const bufferMinutes = getTotalBufferMinutes();

  // Calculated chronometry readout
  const computedRollout =
    timeMode === 'arrival'
      ? calculateEstimatedDeparture(targetArrivalTime, distanceKm, cruisingSpeedKmH, bufferMinutes)
      : departureTime;

  const computedArrival =
    timeMode === 'arrival'
      ? targetArrivalTime
      : calculateEstimatedArrival(departureTime, distanceKm, cruisingSpeedKmH, bufferMinutes);

  // Handle archetype selection on Step 1
  const handleSelectArchetype = (archId) => {
    setArchetype(archId);
    const arch = ARCHETYPES.find((a) => a.id === archId);
    if (arch) {
      setDistanceKm(arch.defaultDistance);
      setCruisingSpeedKmH(arch.defaultSpeed);
      setTargetArrivalTime(arch.defaultArrival);
      setDepartureTime(arch.defaultDeparture);
      setOrigin(arch.defaultOrigin);
      setDestination(arch.defaultDestination);
      setOriginCoords(null);
      setDestCoords(null);
      setRouteFetchFeedback(null);
      setRouteCoordinates(undefined);
      // Keep chips blank as requested by the user
      setSelectedChips([]);
    }
  };

  // Toggle custom chips for the selected archetype
  const handleToggleChip = (chipId) => {
    setSelectedChips((prev) =>
      prev.includes(chipId) ? prev.filter((id) => id !== chipId) : [...prev, chipId]
    );
  };

  // Fetch cycling route using OSRM via calculateAutoBikeRoute
  const handleFetchRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setRouteFetchFeedback({
        type: 'error',
        message: isFr
          ? 'Veuillez saisir un lieu de départ et de destination.'
          : 'Please enter both origin and destination.',
      });
      return;
    }

    setIsFetchingRoute(true);
    setRouteFetchFeedback(null);

    try {
      const result = await calculateAutoBikeRoute(
        origin.trim(),
        destination.trim(),
        originCoords,
        destCoords
      );

      if (result) {
        setDistanceKm(Number(result.distanceKm.toFixed(1)));
        if (result.coordinates && result.coordinates.length > 1) {
          setRouteCoordinates(result.coordinates);
          setOriginCoords(result.coordinates[0]);
          setDestCoords(result.coordinates[result.coordinates.length - 1]);
        }
        setRouteFetchFeedback({
          type: 'success',
          message: isFr
            ? `Itinéraire cycliste calculé : ${result.distanceKm} km (~${Math.round(result.estimatedMinutes)} min)`
            : `Cycling route computed: ${result.distanceKm} km (~${Math.round(result.estimatedMinutes)} min)`,
        });
      }
    } catch (err) {
      setRouteFetchFeedback({
        type: 'error',
        message:
          err.message ||
          (isFr
            ? 'Impossible de calculer l’itinéraire. Utilisez le mode distance manuelle.'
            : 'Could not compute automatic route. Switch to manual distance mode.'),
      });
    } finally {
      setIsFetchingRoute(false);
    }
  };

  // Swap corridor origin and destination
  const handleSwapCorridor = () => {
    const prevOrigin = origin;
    const prevDest = destination;
    const prevOriginCoords = originCoords;
    const prevDestCoords = destCoords;
    setOrigin(prevDest);
    setDestination(prevOrigin);
    setOriginCoords(prevDestCoords);
    setDestCoords(prevOriginCoords);
    setRouteFetchFeedback(null);
  };

  // Load and launch demo ride (Screen 0)
  const handleLaunchDemo = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const demoTrip = {
      id: `demo-estuary-commute-64k-${Date.now()}`,
      name: isFr ? 'Démo Vélotaf Estuaire (64 km)' : 'Demo Estuary Commute (64 km)',
      tag: 'VÉLOTAF',
      description: isFr
        ? 'Transit côtier gravel à 28.5 km/h traversant le pont de Saint-Nazaire jusqu’à la Porte 17. Profil aéro, vestiaire et ravitaillement naturel.'
        : '64 km high-tempo coastal gravel transit crossing the Saint-Nazaire estuary bridge to secure Gate 17. Aero hoods calibration, locker refuel & real-food fueling.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      physics: {
        riderWeightKg: 74,
        bikeWeightKg: 9.8,
        gearWeightKg: 4.2,
        cda: 0.38,
        crr: 0.0055,
        rho: 1.225,
        drivetrainEfficiency: 0.95,
        grossMechanicalEfficiency: 0.21,
        gradientPercent: 0.3,
      },
      route: {
        origin: 'Nantes Quai',
        destination: 'Saint-Nazaire Gate 17',
        distanceKm: 64.0,
        targetSpeedKmH: 28.5,
        urbanTrafficDelayMinutes: 8,
        gateSecurityDelayMinutes: 5,
      },
      office: {
        shiftStartTime: '09:00',
        targetGateArrivalTime: '08:30',
        gateName: isFr ? 'Porte 17' : 'Gate 17',
        lockerRefuelMinutes: 10,
        showerChangeMinutes: 15,
        breakRoomBreakfastMinutes: 15,
        strictNoFoodInOpenSpace: true,
        badgeRequiredForGate: true,
        notes: isFr
          ? 'Protocole d’entreprise strict : Douche & ravitaillement vestiaire à 08:30, shift lock à 09:00.'
          : 'Strict workplace protocol: Locker shower & refuel on arrival at 08:30, shift lock at 09:00.',
      },
      weather: {
        isHeadwindActive: true,
        baseWindSpeedKmH: 12.0,
        windDirection: 'headwind',
        windDirectionDegrees: 245,
        temperatureC: 12,
        precipitationRiskPercent: 15,
        estuaryGustKmH: 18,
        visibilityKm: 15,
      },
      checklist: generateTripChecklist('VÉLOTAF', 64.0, undefined, {
        lang: isFr ? 'fr' : 'en',
        includeExtraRavito: true,
      }),
      customChips: ['coffee-stop', 'shower-locker', 'bike-lane-priority'],
      arriveAtMode: true,
    };

    onLaunch(demoTrip);
  };

  // Compile calibrated user trip
  const handleLaunchCalibrated = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const chosenBike = selectedBike || BIKE_PRESETS[1];
    const finalArchetype = archetype || 'VÉLOTAF';

    let tripName = '';
    if (finalArchetype === 'VÉLOTAF') {
      tripName = isFr ? `Vélotaf calibré (${distanceKm} km)` : `Calibrated Commute (${distanceKm} km)`;
    } else if (finalArchetype === 'SPORT') {
      tripName = isFr ? `Gran Fondo aéro (${distanceKm} km)` : `Gran Fondo Aero (${distanceKm} km)`;
    } else if (finalArchetype === 'BIKEPACKING') {
      tripName = isFr ? `Bikepacking autonome (${distanceKm} km)` : `Expedition Bikepack (${distanceKm} km)`;
    } else {
      tripName = isFr ? `Escapade week-end (${distanceKm} km)` : `Weekend Escapade (${distanceKm} km)`;
    }

    // Compile contextual notes
    let notes = '';
    if (finalArchetype === 'VÉLOTAF') {
      notes = strictDeskFoodRestriction
        ? (isFr
            ? 'Règlement entreprise : Ravitaillement au vestiaire ou salle de pause avant la prise de poste.'
            : 'Strict office protocol: Locker refuel or break room fueling before shift lock.')
        : (isFr ? 'Alimentation libre sur place.' : 'Open desk fueling permitted.');
    } else if (finalArchetype === 'BIKEPACKING') {
      notes = isFr
        ? `Étape bivouac en autonomie. Installation du camp (${bivouacBufferMinutes} min) avant la nuit.`
        : `Self-supported bivouac stage. Camp pitch window (${bivouacBufferMinutes} min) before dusk.`;
    } else if (finalArchetype === 'SPORT') {
      notes = isFr
        ? `Allure haute intensité. Fenêtre de récupération immédiate (${recoveryWindowMinutes} min) à l'arrivée.`
        : `High-intensity tempo ride. Post-ride recovery window (${recoveryWindowMinutes} min) upon finish.`;
    } else {
      notes = isFr
        ? `Escapade détente. Arrivée étape (${hotelCheckinBufferMinutes} min de marge avant enregistrement/dîner).`
        : `Scenic leisure escapade. Target stage buffer (${hotelCheckinBufferMinutes} min before check-in).`;
    }

    const calibratedTrip = {
      id: `trip-calibrated-${Date.now()}`,
      name: tripName,
      tag: finalArchetype,
      description: isFr
        ? `Sortie ${finalArchetype.toLowerCase()} de ${distanceKm} km calibrée avec ${isFr ? chosenBike.nameFr : chosenBike.nameEn}. Allure : ${cruisingSpeedKmH} km/h (${speedTier.titleFr}).`
        : `${distanceKm} km calibrated ${finalArchetype.toLowerCase()} ride with ${chosenBike.nameEn}. Pace: ${cruisingSpeedKmH} km/h (${speedTier.titleEn}).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departureTime: computedRollout,
      physics: {
        riderWeightKg: Number(riderWeightKg) || 74,
        bikeWeightKg: chosenBike.bikeWeightKg,
        gearWeightKg: Number(gearWeightKg) || 4.0,
        cda: chosenBike.cda,
        crr: chosenBike.crr,
        rho: 1.225,
        drivetrainEfficiency: chosenBike.id === 'road' ? 0.97 : 0.95,
        grossMechanicalEfficiency: chosenBike.id === 'road' ? 0.22 : 0.21,
        gradientPercent: 0.3,
      },
      route: {
        origin: routeMode === 'corridor' ? origin.trim() || 'Home Base' : (isFr ? 'Point de départ' : 'Origin Point'),
        destination: routeMode === 'corridor' ? destination.trim() || 'Destination' : (isFr ? 'Point d’arrivée' : 'Destination Point'),
        distanceKm: Number(distanceKm) || 35,
        targetSpeedKmH: Number(cruisingSpeedKmH) || 26.0,
        urbanTrafficDelayMinutes: finalArchetype === 'VÉLOTAF' ? 8 : 4,
        gateSecurityDelayMinutes: finalArchetype === 'VÉLOTAF' ? 5 : 2,
        coordinates: routeMode === 'corridor' ? routeCoordinates : undefined,
      },
      office: {
        shiftStartTime: computedArrival,
        targetGateArrivalTime: computedArrival,
        gateName: finalArchetype === 'VÉLOTAF' ? (isFr ? 'Porte d’entrée' : 'Gate 17') : (isFr ? 'Point d’arrivée' : 'Finish Stage'),
        lockerRefuelMinutes: 10,
        showerChangeMinutes: finalArchetype === 'VÉLOTAF' && hasLockerShower ? 15 : 0,
        breakRoomBreakfastMinutes: finalArchetype === 'VÉLOTAF' ? Number(breakfastBufferMinutes) || 0 : 0,
        strictNoFoodInOpenSpace: finalArchetype === 'VÉLOTAF' ? strictDeskFoodRestriction : false,
        badgeRequiredForGate: finalArchetype === 'VÉLOTAF',
        notes,
      },
      weather: {
        isHeadwindActive: true,
        baseWindSpeedKmH: 9.0,
        windDirection: 'headwind',
        windDirectionDegrees: 245,
        temperatureC: 13,
        precipitationRiskPercent: 10,
        estuaryGustKmH: 15,
        visibilityKm: 16,
      },
      checklist: generateTripChecklist(finalArchetype, Number(distanceKm) || 35, undefined, {
        lang: isFr ? 'fr' : 'en',
        includeExtraRavito: realFoodNutrition,
        customChips: selectedChips,
      }),
      customChips: [
        ...selectedChips,
        ...(realFoodNutrition ? ['real-food'] : []),
        ...(finalArchetype === 'VÉLOTAF' && hasLockerShower ? ['shower-buffer'] : []),
      ],
      arriveAtMode: timeMode === 'arrival',
    };

    onLaunch(calibratedTrip);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 bg-[#F5F4EF]/95 dark:bg-[#111113]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl my-auto bg-card text-ink rounded-card shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden animate-fade-in max-h-[92vh] max-h-[92dvh]">
        {/* Top Header Bar with 4-Segment Progress Bar and Close / Skip Button */}
        <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-3 sm:pb-3.5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${CHIP_TOKENS['yellow-vest'].dot} animate-beacon-pulse`} />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-ink-muted leading-tight">
                {step === 0
                  ? (isFr ? 'Bienvenue · Assistant de calibrage' : 'Welcome · Calibration Wizard')
                  : `${isFr ? 'Étape' : 'Step'} ${step} / 4 · ${
                      step === 1
                        ? (isFr ? 'Profil de sortie & Badges' : 'Ride Profile & Chips')
                        : step === 2
                        ? (isFr ? 'Parcours & Allure' : 'Route & Cruising Pace')
                        : step === 3
                        ? (isFr ? 'Type de vélo & Bagages' : 'Bike Type & Luggage')
                        : (isFr ? 'Protocoles opérationnels' : 'Operational Protocols')
                    }`}
              </span>
            </div>

            {/* Header Right Controls: Language Selector + Theme Toggle + Close / Skip */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Language Switcher Segmented Pill */}
              <div
                role="group"
                aria-label={isFr ? 'Sélecteur de langue' : 'Language selector'}
                className="flex items-center rounded-full bg-pod p-0.5 border border-black/5 dark:border-white/10 text-xs font-bold shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    lang === 'en'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : 'text-ink-muted hover:text-ink'
                  }`}
                  title="Switch to English"
                  aria-pressed={lang === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('fr')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    lang === 'fr'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : 'text-ink-muted hover:text-ink'
                  }`}
                  title="Passer en Français"
                  aria-pressed={lang === 'fr'}
                >
                  FR
                </button>
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`w-8 h-8 rounded-full bg-pod hover:bg-chip flex items-center justify-center transition-colors cursor-pointer border border-black/5 dark:border-white/10 shadow-xs ${
                  isDark ? CHIP_TOKENS.amber.primary : GREYSCALE_TOKENS.primary
                }`}
                title={isDark ? t('switchToLight') : t('switchToDark')}
                aria-label={isDark ? t('switchToLight') : t('switchToDark')}
              >
                {isDark ? (
                  <Sun size={16} className="w-4 h-4 text-current shrink-0" />
                ) : (
                  <Moon size={16} className="w-4 h-4 text-current shrink-0" />
                )}
              </button>

              {/* Close / Skip Button */}
              <button
                type="button"
                onClick={onClose}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} hover:ring-zinc-400/50 ${CHIP_DUOTONE_ISOLATION_CLASSES} text-xs font-medium transition-all cursor-pointer`}
                title={isFr ? 'Fermer l’assistant' : 'Close and dismiss wizard'}
              >
                <X className="w-4 h-4 shrink-0 text-current" />
                <span className="hidden sm:inline">{isFr ? 'Fermer / Passer' : 'Close / Skip'}</span>
              </button>
            </div>
          </div>

          {/* 4-Segment Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mt-3.5">
            {[1, 2, 3, 4].map((segIndex) => {
              const isFilled = step >= segIndex;
              const isCurrent = step === segIndex;
              return (
                <div
                  key={segIndex}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isFilled
                      ? 'bg-[#a3b300] dark:bg-[#dfff00]'
                      : isCurrent
                      ? 'bg-[#a3b300]/50 dark:bg-[#dfff00]/50'
                      : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Wizard Step Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6">
          {/* SCREEN 0: WELCOME & FORK SCREEN */}
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-2xl mx-auto space-y-3 pt-1">
                <div className="flex justify-center">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} flex items-center justify-center shadow-sm`}
                  >
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8 text-current"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="7" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                      <circle cx="17" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                      <path d="M9.5 9.2c1.6.9 3.4.9 5 0" />
                      <path d="M9.5 14.8c1.6-.9 3.4-.9 5 0" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    Bike Trip Engine
                  </h1>
                  <Badge variant="zinc" size="sm">
                    v2.6
                  </Badge>
                </div>

                <p className={`text-xs sm:text-sm font-semibold ${CHIP_TOKENS['yellow-vest'].primary} tracking-wide uppercase`}>
                  {isFr
                    ? 'Physique aéro · Rétro-planning horaire · Ravitaillement naturel'
                    : 'Aero physics · Reverse timeline · Real-food fueling'}
                </p>

                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-xl mx-auto">
                  {isFr
                    ? 'Cockpit complet pour cyclistes exigeants. Modélisez votre traînée aérodynamique (CdA), anticipez votre heure exacte de départ et équilibrez votre alimentation en aliments bruts.'
                    : 'The complete ride cockpit and planning engine for cyclists. Model CdA drag and rolling resistance, calculate reverse chronometry, and fuel with wholesome real foods.'}
                </p>
              </div>

              {/* 4 Feature Capability Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-1.5 text-left">
                  <IconBadge theme="yellow-vest" icon={Lightning} size="md" solidBacker />
                  <h4 className="font-bold text-xs text-ink">
                    {isFr ? 'Physique & Watts' : 'Aero & Watts'}
                  </h4>
                  <p className="text-[11px] text-ink-muted leading-tight">
                    {isFr ? 'Traînée CdA, roulement Crr & vent de face.' : 'CdA drag, rolling Crr & headwind.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-1.5 text-left">
                  <IconBadge theme="amber" icon={Clock} size="md" solidBacker />
                  <h4 className="font-bold text-xs text-ink">
                    {isFr ? 'Rétro-planning' : 'Reverse Timeline'}
                  </h4>
                  <p className="text-[11px] text-ink-muted leading-tight">
                    {isFr ? 'Départ impératif calculé selon vos marges.' : 'Exact hard rollout backward from your target.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-1.5 text-left">
                  <IconBadge theme="emerald" icon={ForkKnife} size="md" solidBacker />
                  <h4 className="font-bold text-xs text-ink">
                    {isFr ? 'Nourriture vraie' : 'Real-Food Fueling'}
                  </h4>
                  <p className="text-[11px] text-ink-muted leading-tight">
                    {isFr ? 'Dattes, figues, Skyr 0%, zéro gel chimique.' : 'Whole-food fueling, zero synthetic gels.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-1.5 text-left">
                  <IconBadge theme="blue" icon={Compass} size="md" solidBacker />
                  <h4 className="font-bold text-xs text-ink">
                    {isFr ? '4 Archétypes' : '4 Archetypes'}
                  </h4>
                  <p className="text-[11px] text-ink-muted leading-tight">
                    {isFr ? 'Vélotaf, Sport, Bikepacking & Escapades.' : 'Vélotaf, Sport, Bikepacking & Escapades.'}
                  </p>
                </div>
              </div>

              {/* The Two Fork Paths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="group relative rounded-pod bg-pod hover:bg-chip/60 border border-black/5 dark:border-white/10 p-4 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-md">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <IconBadge theme="yellow-vest" icon={Bicycle} size="lg" isSelected solidBacker />
                      <Badge variant="emerald" size="sm" className="font-bold">
                        {isFr ? 'PRÉRÉGLAGE VÉRIFIÉ' : 'VERIFIED PRESET'}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-ink">
                        {isFr ? 'Charger la démo Estuaire (64 km)' : 'Load Demo Estuary Commute (64 km)'}
                      </h3>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        {isFr
                          ? 'Traversée côtière du pont de Saint-Nazaire. Paramétré avec CdA gravel, arrivée 08:30, vestiaire et ravitaillement naturel.'
                          : 'High-tempo coastal transit across Saint-Nazaire bridge. Pre-configured with aero gravel CdA, 08:30 arrival, locker refuel & real food.'}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/10 text-xs text-ink-secondary">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span>{isFr ? 'Itinéraire :' : 'Route:'}</span>
                        <span className="font-semibold text-ink">Nantes → Gate 17 (64 km)</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span>{isFr ? 'Allure :' : 'Pacing:'}</span>
                        <span className="font-semibold text-ink">28.5 km/h · {isFr ? 'Arrivée 08:30' : '08:30 Arrival'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleLaunchDemo}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl sm:rounded-full text-center ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.97] dark:hover:brightness-110 font-semibold text-sm transition-all shadow-xs cursor-pointer`}
                    >
                      <span>{isFr ? 'Lancer le trajet démo (64 km)' : 'Load Demo Estuary Commute (64 km)'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0 text-current" />
                    </button>
                  </div>
                </div>

                <div className="group relative rounded-pod bg-pod hover:bg-chip/60 border-2 border-dashed border-black/15 dark:border-white/20 hover:border-black/30 dark:hover:border-white/40 p-4 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-md">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <IconBadge theme="greyscale" icon={SlidersHorizontal} size="lg" solidBacker />
                      <Badge variant="zinc" size="sm" className="font-bold">
                        {isFr ? 'ASSISTANT 4 ÉTAPES' : '4-STEP WIZARD'}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-ink">
                        {isFr ? 'Configurer un nouveau trajet' : 'Configure New Ride'}
                      </h3>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        {isFr
                          ? 'Paramétrez votre profil sur mesure : archétype neutre au départ, type de vélo, allure de croisière vivante et contraintes dédiées.'
                          : 'Calibrate your custom profile from a clean slate: neutral start, clear bike selection, quirky cruising pace, and relevant protocols.'}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/10 text-xs text-ink-secondary">
                      <div className={`flex items-center gap-2 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                        <Check className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.emerald.primary}`} />
                        <span>{isFr ? '4 Archétypes sans pré-sélection' : '4 Archetypes starting unselected'}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                        <Check className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.emerald.primary}`} />
                        <span>{isFr ? 'Choix clair : Itinéraire OU distance' : 'Clean choice: Route OR distance'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl sm:rounded-full text-center bg-card hover:bg-chip text-ink ${CHIP_RING_BASE} ring-zinc-300 dark:ring-zinc-700 ${CHIP_DUOTONE_ISOLATION_CLASSES} font-semibold text-sm transition-all shadow-xs cursor-pointer`}
                    >
                      <span>{isFr ? 'Configurer le parcours' : 'Configure New Ride'}</span>
                      <ArrowRight className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: RIDE ARCHETYPE (BLANK INITIALLY) & CONSISTENT CHIP GRID */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  {isFr ? 'Étape 1 : Choisissez votre profil de sortie' : 'Step 1: Choose Your Ride Profile'}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {isFr
                    ? 'Sélectionnez le type de votre sortie pour révéler ses badges d’équipement et de rythme.'
                    : 'Select your ride profile to reveal its custom setup chips.'}
                </p>
              </div>

              {/* 4 Ride Archetype Cards (None pre-selected) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {ARCHETYPES.map((arch) => {
                  const Icon = arch.icon;
                  const isSelected = archetype === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => handleSelectArchetype(arch.id)}
                      className={`text-left p-5 rounded-pod flex flex-col justify-between transition-all cursor-pointer relative ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        isSelected
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-sm`
                          : `bg-pod hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      {isSelected && (
                        <IconBadge
                          theme="yellow-vest"
                          icon={Check}
                          size="xs"
                          isSelected
                          solidBacker
                          className="absolute top-3 right-3"
                        />
                      )}

                      <div className="space-y-2.5">
                        <IconBadge
                          theme={isSelected ? 'yellow-vest' : 'greyscale'}
                          icon={Icon}
                          size="spine"
                          isSelected={isSelected}
                          solidBacker
                          className="w-9 h-9 sm:w-9 sm:h-9"
                        />

                        <div>
                          <h4 className="font-bold text-sm tracking-tight">
                            {isFr ? arch.nameFr : arch.nameEn}
                          </h4>
                          <span
                            className={`text-[11px] block mt-0.5 ${
                              isSelected ? 'opacity-80' : 'text-ink-muted'
                            }`}
                          >
                            {isFr ? arch.subtitleFr : arch.subtitleEn}
                          </span>
                        </div>

                        <p
                          className={`text-xs leading-relaxed line-clamp-3 ${
                            isSelected ? 'opacity-85' : 'text-ink-secondary'
                          }`}
                        >
                          {isFr ? arch.descriptionFr : arch.descriptionEn}
                        </p>
                      </div>

                      <div className={`pt-3 mt-3 border-t ${isSelected ? 'border-current/20' : 'border-black/10 dark:border-white/10'} text-[11px] flex items-center justify-between font-mono`}>
                        <span>~{arch.defaultSpeed} km/h</span>
                        <span>{arch.defaultDistance} km</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Consistent Height Chips Area: Fixed 3 Rows x 3 Columns (Exactly 9 chips, no height bounce) */}
              <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-3 min-h-[175px] flex flex-col justify-center">
                {!archetype ? (
                  <div className="flex flex-col items-center justify-center text-center py-6 text-ink-muted space-y-1.5">
                    <Sparkle className={`w-5 h-5 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                    <p className="text-xs font-medium">
                      {isFr
                        ? 'Sélectionnez un profil ci-dessus pour activer ses badges de personnalisation.'
                        : 'Select a profile above to unlock its custom ride chips.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkle className={`w-4 h-4 shrink-0 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                          {isFr
                            ? `Badges optionnels pour ${activeArchetypeDef.nameFr} :`
                            : `Optional ride chips for ${activeArchetypeDef.nameEn} :`}
                        </h4>
                      </div>
                      <Badge variant="yellow-vest" size="sm" className="font-mono shrink-0">
                        {selectedChips.length} {isFr ? 'sélectionné(s)' : 'selected'}
                      </Badge>
                    </div>

                    {/* Centered Honeycomb Custom Chips (Hugs contents & middle-centered like the configurator) */}
                    <div
                      key={archetype}
                      className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto py-1 animate-fade-in"
                    >
                      {availableChips.map((chip) => {
                        const isSelected = selectedChips.includes(chip.id);
                        const Icon = CHIP_ICONS[chip.iconName] || Lightning;

                        return (
                          <Chip
                            key={chip.id}
                            label={isFr ? chip.labelFr : chip.labelEn}
                            theme={chip.colorKey}
                            icon={Icon}
                            isSelected={isSelected}
                            onClick={() => handleToggleChip(chip.id)}
                            title={isFr ? chip.descriptionFr : chip.descriptionEn}
                            className="h-8 font-bold text-xs"
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ROUTE (EITHER CORRIDOR OR MANUAL KM) & QUIRKY PACING SLIDER */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  {isFr ? 'Étape 2 : Parcours, Horaires & Allure' : 'Step 2: Route, Schedule & Cruising Pace'}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {isFr
                    ? 'Définissez votre itinéraire (via calcul OSRM OU saisie kilométrique directe), choisissez votre heure cible et réglez votre tempo.'
                    : 'Configure your route (via corridor calculation OR manual distance), set arrival or departure time, and calibrate cruising pace.'}
                </p>
              </div>

              {/* Segmented Switcher: Either Corridor OR Manual Distance (Not both) */}
              <div className="p-4 sm:p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    {isFr ? 'Mode de définition du parcours :' : 'Route Definition Mode:'}
                  </span>

                  <div className="grid grid-cols-1 sm:inline-flex w-full sm:w-auto p-1 rounded-2xl sm:rounded-full bg-card border border-black/5 dark:border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setRouteMode('corridor')}
                      className={`px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        routeMode === 'corridor'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-current" />
                      <span>{isFr ? 'Calcul itinéraire (Départ / Arrivée)' : 'Route Corridor (OSRM)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteMode('manual')}
                      className={`px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        routeMode === 'manual'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      <Ruler className="w-4 h-4 shrink-0 text-current" />
                      <span>{isFr ? 'Distance directe (km)' : 'Manual Distance (km)'}</span>
                    </button>
                  </div>
                </div>

                {/* OPTION A: Corridor Autocomplete & Fetch Route */}
                {routeMode === 'corridor' && (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    {/* Suggested Corridor presets */}
                    {activeArchetypeDef?.corridorPresets && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-ink-muted">
                          {isFr ? 'Itinéraires fréquents suggérés :' : 'Suggested corridor shortcuts:'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {activeArchetypeDef.corridorPresets.map((preset, idx) => {
                            const isPresetSelected = origin === preset.origin && destination === preset.destination;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setOrigin(preset.origin);
                                  setDestination(preset.destination);
                                  setDistanceKm(preset.distance);
                                  setOriginCoords(null);
                                  setDestCoords(null);
                                  setRouteFetchFeedback(null);
                                }}
                                className={`px-3 py-1.5 sm:py-1 text-xs rounded-2xl sm:rounded-full text-left sm:text-center font-medium transition-all cursor-pointer ${CHIP_RING_BASE} ${
                                  isPresetSelected
                                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                    : `bg-card hover:bg-chip text-ink-secondary ${CHIP_RING_UNSELECTED}`
                                }`}
                              >
                                {preset.origin} → {preset.destination} ({preset.distance} km)
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 pt-1">
                      <div className="flex-1 relative min-w-0">
                        <LocationAutocompleteInput
                          id="onboarding-origin-input"
                          label={isFr ? 'Lieu de départ' : 'Origin / Departure'}
                          value={origin}
                          dropdownAlign="left"
                          onChange={(val) => {
                            setOrigin(val);
                            setOriginCoords(null);
                            setRouteFetchFeedback(null);
                          }}
                          onSelectLocation={(loc) => {
                            setOrigin(loc.name);
                            setOriginCoords(loc.coordinates);
                            setRouteFetchFeedback(null);
                          }}
                          onKeyDownEnter={handleFetchRoute}
                          placeholder={isFr ? 'ex. Nantes Quai, Gare...' : 'e.g. Nantes Quai, Station...'}
                        />
                      </div>

                      <div className="flex items-center justify-center self-center sm:self-end pb-0.5">
                        <button
                          type="button"
                          onClick={handleSwapCorridor}
                          title={isFr ? 'Inverser départ et arrivée' : 'Swap origin and destination'}
                          className={`h-10 w-10 flex items-center justify-center rounded-full bg-card hover:bg-chip ${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_DUOTONE_ISOLATION_CLASSES} transition-all cursor-pointer shrink-0 border border-black/5 dark:border-white/10`}
                        >
                          <ArrowsLeftRight className="w-4 h-4 text-current" />
                        </button>
                      </div>

                      <div className="flex-1 relative min-w-0">
                        <LocationAutocompleteInput
                          id="onboarding-dest-input"
                          label={isFr ? 'Lieu d’arrivée' : 'Destination'}
                          value={destination}
                          dropdownAlign="right"
                          onChange={(val) => {
                            setDestination(val);
                            setDestCoords(null);
                            setRouteFetchFeedback(null);
                          }}
                          onSelectLocation={(loc) => {
                            setDestination(loc.name);
                            setDestCoords(loc.coordinates);
                            setRouteFetchFeedback(null);
                          }}
                          onKeyDownEnter={handleFetchRoute}
                          placeholder={isFr ? 'ex. Saint-Nazaire, Pornic...' : 'e.g. Saint-Nazaire, Clisson...'}
                        />
                      </div>

                      <div className="self-stretch sm:self-end pb-0.5">
                        <button
                          type="button"
                          onClick={handleFetchRoute}
                          disabled={isFetchingRoute}
                          className={`h-10 px-4 w-full sm:w-auto flex items-center justify-center gap-2 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.97] dark:hover:brightness-110 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0`}
                        >
                          {isFetchingRoute ? (
                            <SpinnerGap className="w-4 h-4 animate-spin text-current" />
                          ) : (
                            <>
                              <Compass className="w-4 h-4 text-current" />
                              <span>{isFr ? 'Calculer OSRM' : 'Fetch Route'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {routeFetchFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${CHIP_RING_BASE} ${
                          routeFetchFeedback.type === 'success'
                            ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                            : `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ${CHIP_TOKENS.rose.selectedRing}`
                        }`}
                      >
                        <span>{routeFetchFeedback.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* OPTION B: Manual Distance Slider Only */}
                {routeMode === 'manual' && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-muted">
                        {isFr ? 'Distance totale de la sortie :' : 'Total Ride Distance:'}
                      </span>
                      <Badge variant="zinc" size="lg" className="font-mono font-extrabold">
                        {distanceKm} km
                      </Badge>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="160"
                      step="1"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                      className="w-full accent-volt cursor-pointer h-2.5 bg-black/10 dark:bg-white/10 rounded-lg"
                    />

                    <div className="flex flex-wrap gap-2 pt-1">
                      {[15, 25, 35, 50, 65, 80, 100, 120].map((presetKm) => (
                        <button
                          key={presetKm}
                          type="button"
                          onClick={() => setDistanceKm(presetKm)}
                          className={`px-3 py-1 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                            distanceKm === presetKm
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                              : `bg-card hover:bg-chip text-ink-secondary ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          {presetKm} km
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrival Time OR Departure Time (No Gate Lock text) */}
              <div className="p-4 sm:p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      {isFr ? 'Planification horaire :' : 'Time Schedule Calibration:'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto p-1 rounded-2xl sm:rounded-full bg-card border border-black/5 dark:border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setTimeMode('arrival')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        timeMode === 'arrival'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      <Target className="w-4 h-4 shrink-0 text-current" />
                      <span className="truncate">{isFr ? 'Heure d’arrivée' : 'Arrival Time'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('departure')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        timeMode === 'departure'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      <RocketLaunch className="w-4 h-4 shrink-0 text-current" />
                      <span className="truncate">{isFr ? 'Heure de départ' : 'Departure Time'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-muted block mb-1">
                      {timeMode === 'arrival'
                        ? (isFr ? 'Heure d’arrivée souhaitée' : 'Target Arrival Time')
                        : (isFr ? 'Heure de départ prévue' : 'Planned Departure Time')}
                    </label>
                    <input
                      type="time"
                      value={timeMode === 'arrival' ? targetArrivalTime : departureTime}
                      onChange={(e) => {
                        if (timeMode === 'arrival') {
                          setTargetArrivalTime(e.target.value);
                        } else {
                          setDepartureTime(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl bg-card border border-black/5 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] font-semibold text-ink-muted mb-1">
                      {isFr ? 'Raccourcis rapides :' : 'Quick presets:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(timeMode === 'arrival'
                        ? ['08:00', '08:30', '09:00', '12:00', '15:00', '18:00']
                        : ['06:30', '07:00', '07:30', '08:30', '09:30', '14:00']
                      ).map((presetTime) => {
                        const isTimeSelected = (timeMode === 'arrival' ? targetArrivalTime : departureTime) === presetTime;
                        return (
                          <button
                            key={presetTime}
                            type="button"
                            onClick={() => {
                              if (timeMode === 'arrival') {
                                setTargetArrivalTime(presetTime);
                              } else {
                                setDepartureTime(presetTime);
                              }
                            }}
                            className={`px-2.5 py-1 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                              isTimeSelected
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : `bg-card hover:bg-chip text-ink-secondary ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {presetTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quirky Cruising Pace Slider with Personality & Intensity Tiers */}
              <div className="p-4 sm:p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Gauge className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      {isFr ? 'Allure de croisière & Tempérament' : 'Cruising Pace & Attitude:'}
                    </span>
                  </div>

                  {/* Big bold quirky speed readout */}
                  <div className="flex items-baseline gap-1.5 bg-card px-3.5 sm:px-4 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-xs shrink-0">
                    <span className="text-xl sm:text-2xl font-mono font-extrabold text-ink">
                      {cruisingSpeedKmH.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono font-bold text-ink-muted">km/h</span>
                    <span className="text-[11px] font-mono text-ink-muted hidden sm:inline">
                      ({(cruisingSpeedKmH * 0.621371).toFixed(1)} mph)
                    </span>
                  </div>
                </div>

                {/* 4 Quirky Intensity Tiers */}
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SPEED_TIERS.map((tier) => {
                    const isActive = speedTier.id === tier.id;
                    const TierIcon = tier.icon;
                    const tierTokens = CHIP_TOKENS[tier.theme];
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setCruisingSpeedKmH(tier.targetSpeed)}
                        className={`text-left p-3 rounded-xl transition-all cursor-pointer relative ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                          isActive
                            ? `${tierTokens.surface} ${tierTokens.primary} ${tierTokens.selectedRing} shadow-xs`
                            : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <IconBadge
                            theme={isActive ? tier.theme : 'greyscale'}
                            icon={TierIcon}
                            size="sm"
                            shape="rounded"
                            isSelected={isActive}
                            solidBacker
                          />
                          <Badge
                            variant={isActive ? tier.theme : 'zinc'}
                            size="xs"
                            selected={isActive}
                            className="font-mono font-bold"
                          >
                            {isFr ? tier.badgeFr : tier.badgeEn}
                          </Badge>
                        </div>
                        <h5 className={`font-bold text-xs ${isActive ? 'text-current' : 'text-ink'}`}>{isFr ? tier.titleFr : tier.titleEn}</h5>
                        <span className={`text-[11px] font-mono block mt-0.5 ${isActive ? 'opacity-80' : 'text-ink-muted'}`}>
                          {tier.min} - {tier.max} km/h
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tactile range slider */}
                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min="16"
                    max="40"
                    step="0.5"
                    value={cruisingSpeedKmH}
                    onChange={(e) => setCruisingSpeedKmH(parseFloat(e.target.value))}
                    className="w-full accent-volt cursor-pointer h-2.5 bg-black/10 dark:bg-white/10 rounded-lg"
                  />

                  {/* Quirky Quote Subline */}
                  <p className="text-xs italic text-ink-secondary text-center pt-1 animate-fade-in">
                    « {isFr ? speedTier.quoteFr : speedTier.quoteEn} »
                  </p>
                </div>
              </div>

              {/* Live Chronometry Summary Banner */}
              <div className="p-4 rounded-pod bg-card text-ink border border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IconBadge
                    theme="yellow-vest"
                    icon={Clock}
                    size="spine"
                    isSelected
                    solidBacker
                    className="w-9 h-9 sm:w-9 sm:h-9"
                  />
                  <div>
                    <h5 className={`font-bold text-xs uppercase tracking-wider ${CHIP_TOKENS['yellow-vest'].primary}`}>
                      {isFr ? 'Synthèse chronométrique en direct' : 'Live Chronometry Preview'}
                    </h5>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      {isFr ? 'Temps de roulement pur :' : 'Pure rolling time :'}{' '}
                      <strong className="text-ink font-mono">
                        {calculateMovingTime(distanceKm, cruisingSpeedKmH)}
                      </strong>{' '}
                      ({distanceKm} km @ {cruisingSpeedKmH} km/h)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                  <Badge variant="zinc" size="md" className="font-mono">
                    {isFr ? 'Départ :' : 'Rollout :'} {computedRollout}
                  </Badge>
                  <Badge variant="yellow-vest" size="md" selected className="font-mono font-bold">
                    {isFr ? 'Arrivée :' : 'Arrival :'} {computedArrival}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PILOT, LUGGAGE CHIPS & BIKE SELECTION (NOT PRE-SELECTED, FIXED PADDING) */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  {isFr ? 'Étape 3 : Cycliste, Bagages & Type de vélo' : 'Step 3: Rider, Luggage & Bike Selection'}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {isFr
                    ? 'Indiquez votre poids de cycliste, sélectionnez un profil de bagages et choisissez le vélo le plus proche du vôtre.'
                    : 'Set rider mass, pick a luggage preset chip, and select the bike closest to your ride.'}
                </p>
              </div>

              {/* Mass Inputs & Luggage Preset Chips */}
              <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rider Mass */}
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
                      {isFr ? 'Poids du cycliste (kg)' : 'Rider Body Mass (kg)'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="40"
                        max="140"
                        step="0.5"
                        value={riderWeightKg}
                        onChange={(e) => setRiderWeightKg(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl bg-card border border-black/5 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt"
                      />
                      <span className="text-xs font-mono text-ink-muted shrink-0">kg</span>
                    </div>
                    <span className="text-[11px] text-ink-muted block mt-1">
                      {isFr ? 'Avec cuissard, maillot et chaussures' : 'With riding kit, shoes & helmet'}
                    </span>
                  </div>

                  {/* Luggage Mass Input */}
                  <div>
                    <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
                      {isFr ? 'Masse des bagages & matériel (kg)' : 'Luggage & Gear Mass (kg)'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="35"
                        step="0.5"
                        value={gearWeightKg}
                        onChange={(e) => setGearWeightKg(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl bg-card border border-black/5 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt"
                      />
                      <span className="text-xs font-mono text-ink-muted shrink-0">kg</span>
                    </div>
                    <span className="text-[11px] text-ink-muted block mt-1">
                      {isFr ? 'Sacoche, ordi, antivol et ravitaillement' : 'Pack, laptop, lock & hydration'}
                    </span>
                  </div>
                </div>

                {/* Preset Chips for Luggage Mass (Requested Item 6) */}
                <div className="pt-2 border-t border-black/5 dark:border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-ink-muted block">
                    {isFr ? 'Préréglages rapides de bagages :' : 'Quick Luggage Preset Chips:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LUGGAGE_PRESETS.map((preset) => {
                      const isMatch = Math.abs(gearWeightKg - preset.massKg) < 0.2;
                      const PresetIcon = preset.icon;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setGearWeightKg(preset.massKg)}
                          className={`text-left p-3 rounded-xl transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                            isMatch
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                              : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <IconBadge
                              theme={isMatch ? 'yellow-vest' : 'greyscale'}
                              icon={PresetIcon}
                              size="sm"
                              shape="rounded"
                              isSelected={isMatch}
                              solidBacker
                            />
                            <span className="text-xs font-mono font-bold">{preset.massKg} kg</span>
                          </div>
                          <div className="font-bold text-xs truncate">
                            {isFr ? preset.nameFr : preset.nameEn}
                          </div>
                          <span className={`text-[10px] block truncate mt-0.5 ${isMatch ? 'opacity-80' : 'text-ink-muted'}`}>
                            {isFr ? preset.subFr : preset.subEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Choose Your Bike Type (Straightforward & Not pre-selected, Proper padding p-5) */}
              <div className="space-y-3">
                <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                      {isFr ? 'Choisissez votre type de vélo' : 'Choose Your Bike Type'}
                    </h4>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {isFr
                        ? 'Chaque monture a son aérodynamisme (CdA) et son frottement de pneus (Crr). Choisissez la plus proche :'
                        : 'Different bikes cut through wind and tarmac differently. Pick the one closest to your setup:'}
                    </p>
                  </div>
                  {selectedBike && (
                    <Badge variant="yellow-vest" size="sm" icon={Check} selected className="font-mono font-bold shrink-0">
                      {isFr ? selectedBike.nameFr : selectedBike.nameEn}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {BIKE_PRESETS.map((bike) => {
                    const isSelected = selectedBikeId === bike.id;
                    return (
                      <button
                        key={bike.id}
                        type="button"
                        onClick={() => setSelectedBikeId(bike.id)}
                        className={`text-left p-5 rounded-pod flex flex-col justify-between transition-all cursor-pointer relative ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                          isSelected
                            ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-sm`
                            : `bg-pod hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                        }`}
                      >
                        {isSelected && (
                          <IconBadge
                            theme="yellow-vest"
                            icon={Check}
                            size="xs"
                            isSelected
                            solidBacker
                            className="absolute top-3.5 right-3.5"
                          />
                        )}

                        <div className="space-y-2">
                          <Badge
                            variant={isSelected ? 'yellow-vest' : 'zinc'}
                            size="xs"
                            selected={isSelected}
                            className="font-bold tracking-wider uppercase"
                          >
                            {isFr ? bike.tagFr : bike.tagEn}
                          </Badge>
                          <h4 className="font-bold text-sm tracking-tight">
                            {isFr ? bike.nameFr : bike.nameEn}
                          </h4>
                          <span className={`text-[11px] block ${isSelected ? 'opacity-80' : 'text-ink-muted'}`}>
                            {isFr ? bike.subtitleFr : bike.subtitleEn}
                          </span>
                          <p className={`text-xs leading-relaxed ${isSelected ? 'opacity-85' : 'text-ink-muted'}`}>
                            {isFr ? bike.descriptionFr : bike.descriptionEn}
                          </p>
                        </div>

                        <div className={`pt-3.5 mt-3 border-t ${isSelected ? 'border-current/20' : 'border-black/10 dark:border-white/10'} space-y-1 text-[11px] font-mono`}>
                          <div className="flex justify-between">
                            <span className={isSelected ? 'opacity-75' : 'text-ink-muted'}>
                              {isFr ? 'Masse vélo :' : 'Bike Mass:'}
                            </span>
                            <span className="font-bold">{bike.bikeWeightKg} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isSelected ? 'opacity-75' : 'text-ink-muted'}>
                              CdA (Aéro) :
                            </span>
                            <span className="font-bold">{bike.cda} m²</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isSelected ? 'opacity-75' : 'text-ink-muted'}>
                              Crr (Roulement) :
                            </span>
                            <span className="font-bold">{bike.crr}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Rig System Mass Display */}
              <div className="p-4 rounded-pod bg-card border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <IconBadge theme="emerald" icon={ShieldCheck} size="sm" solidBacker />
                  <span className="text-ink-secondary">
                    {isFr ? 'Masse totale système :' : 'Total System Mass :'}{' '}
                    <strong className="text-ink">{riderWeightKg} kg</strong> ({isFr ? 'cycliste' : 'rider'}) +{' '}
                    <strong className="text-ink">{gearWeightKg} kg</strong> ({isFr ? 'bagages' : 'gear'}) +{' '}
                    <strong className="text-ink">{selectedBike ? `${selectedBike.bikeWeightKg} kg` : (isFr ? '[choisir vélo]' : '[pick bike]')}</strong>
                  </span>
                </div>
                <Badge variant="zinc" size="md" className="font-mono font-bold self-start sm:self-auto shrink-0">
                  = {totalSystemMassKg} kg
                </Badge>
              </div>
            </div>
          )}

          {/* STEP 4: CONTEXTUAL OPERATIONAL PROTOCOLS (Strictly tailored to chosen archetype) */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              {/* Dynamic Title per archetype */}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  {archetype === 'VÉLOTAF' && (isFr ? 'Étape 4 : Protocoles opérationnels d’entreprise' : 'Step 4: Workplace Operational Protocols')}
                  {archetype === 'BIKEPACKING' && (isFr ? 'Étape 4 : Logistique de bivouac & autonomie' : 'Step 4: Bivouac & Expedition Logistics')}
                  {archetype === 'SPORT' && (isFr ? 'Étape 4 : Pacing de haute intensité & récupération' : 'Step 4: Performance Pacing & Recovery Protocol')}
                  {archetype === 'ESCAPADE' && (isFr ? 'Étape 4 : Logistique d’étape, visites & hébergement' : 'Step 4: Leisure, Sightseeing & Hospitality Logistics')}
                  {!archetype && (isFr ? 'Étape 4 : Protocoles de sortie & ravitaillement' : 'Step 4: Ride Protocols & Fueling')}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {archetype === 'VÉLOTAF' && (isFr ? 'Ajustez vos marges horaires pour le vestiaire d’entreprise, la douche et les règles de ravitaillement.' : 'Calibrate locker bay shower buffers, breakfast timing, and workstation desk policies.')}
                  {archetype === 'BIKEPACKING' && (isFr ? 'Préparez l’installation du camp avant la nuit, les arrêts filtrage d’eau et la nutrition longue distance.' : 'Plan camp pitch staging, trail water filtration stops, and self-supported caloric density.')}
                  {archetype === 'SPORT' && (isFr ? 'Optimisez l’échauffement progressif, l’apport glucidique de course et la recharge post-effort immédiate.' : 'Dial in progressive warmup rollout, high-rate carb pacing, and post-ride protein timing.')}
                  {archetype === 'ESCAPADE' && (isFr ? 'Allouez du temps pour l’enregistrement hôtel/B&B, la sécurité du vélo et les haltes gourmandes.' : 'Configure check-in buffers, verified bike parking, and relaxed terroir dining dwell times.')}
                  {!archetype && (isFr ? 'Réglez vos paramètres de confort et de ravitaillement.' : 'Configure your fueling and operational buffers.')}
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. VÉLOTAF TAILORED CONTROLS */}
                {archetype === 'VÉLOTAF' && (
                  <>
                    <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <IconBadge
                          theme={breakfastBufferMinutes > 0 ? 'amber' : 'greyscale'}
                          icon={Coffee}
                          size="spine"
                          isSelected={breakfastBufferMinutes > 0}
                          solidBacker
                          className="w-9 h-9 sm:w-9 sm:h-9"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Marge petit-déjeuner en salle de pause' : 'Break Room Breakfast Buffer'}
                          </h4>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {isFr ? 'Temps en salle de pause pour consommer le porridge et s’hydrater avant le shift.' : 'Dedicated window to eat breakfast and hydrate before clocking in.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[0, 10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setBreakfastBufferMinutes(mins)}
                            className={`px-3 py-1.5 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                              breakfastBufferMinutes === mins
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasLockerShower}
                        onChange={(e) => setHasLockerShower(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasLockerShower ? 'sky' : 'greyscale'}
                            icon={Shower}
                            size="sm"
                            isSelected={hasLockerShower}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Douche & vestiaire d’entreprise requis (+15 min)' : 'Locker Shower & Change Required (+15 min buffer)'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Ajoute 15 minutes au rétro-planning pour la douche et l’enfilage de la tenue de travail.' : 'Allocates 15 minutes for corporate subterranean shower and clothing change.'}
                        </p>
                      </div>
                    </label>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={strictDeskFoodRestriction}
                        onChange={(e) => setStrictDeskFoodRestriction(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={strictDeskFoodRestriction ? 'amber' : 'greyscale'}
                            icon={Buildings}
                            size="sm"
                            isSelected={strictDeskFoodRestriction}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Interdiction stricte de manger au bureau (Open Space)' : 'Strict Open Space Desk Food Restriction'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Règlement strict : Ravitaillement au vestiaire ou salle de pause avant la prise de poste.' : 'No food allowed at desk clusters; mandates fueling before clocking in.'}
                        </p>
                      </div>
                    </label>
                  </>
                )}

                {/* 2. BIKEPACKING TAILORED CONTROLS */}
                {archetype === 'BIKEPACKING' && (
                  <>
                    <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <IconBadge
                          theme="emerald"
                          icon={Tent}
                          size="spine"
                          isSelected
                          solidBacker
                          className="w-9 h-9 sm:w-9 sm:h-9"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Marge d’installation du bivouac avant la nuit' : 'Camp Pitch & Bivouac Buffer'}
                          </h4>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {isFr ? 'Temps réservé pour monter la tente, sangler le vélo et ranger les sacoches avant le crépuscule.' : 'Time allocated before dusk to pitch tent/tarp and secure your loaded rig.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setBivouacBufferMinutes(mins)}
                            className={`px-3 py-1.5 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                              bivouacBufferMinutes === mins
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasWaterFilterStops}
                        onChange={(e) => setHasWaterFilterStops(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasWaterFilterStops ? 'blue' : 'greyscale'}
                            icon={Drop}
                            size="sm"
                            isSelected={hasWaterFilterStops}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Haltes filtrage d’eau & réchaud (+20 min)' : 'Water Filtration & Stove Cooking Dwell (+20 min buffer)'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Alloue une marge pour prélever de l’eau en cours de route et faire bouillir les repas nomades.' : 'Accounts for trail filtration flask refill and stove meal preparation pauses.'}
                        </p>
                      </div>
                    </label>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasOffGridSolar}
                        onChange={(e) => setHasOffGridSolar(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasOffGridSolar ? 'amber' : 'greyscale'}
                            icon={BatteryCharging}
                            size="sm"
                            isSelected={hasOffGridSolar}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Gestion d’énergie autonome (Panneau solaire / Powerbank)' : 'Off-Grid Power Management & Solar Charging'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Planifie l’autonomie GPS, éclairage et batterie sans prise électrique.' : 'Optimizes GPS navigation and headlight power reserves for off-grid stages.'}
                        </p>
                      </div>
                    </label>
                  </>
                )}

                {/* 3. SPORT TAILORED CONTROLS */}
                {archetype === 'SPORT' && (
                  <>
                    <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <IconBadge
                          theme="yellow-vest"
                          icon={Trophy}
                          size="spine"
                          isSelected
                          solidBacker
                          className="w-9 h-9 sm:w-9 sm:h-9"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Fenêtre métabolique de récupération immédiate' : 'Post-Ride Recovery Protein Window'}
                          </h4>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {isFr ? 'Marge d’arrivée pour ingérer 25g de protéines et s’étirer dès la ligne franchie.' : 'Immediate post-effort dwell time for 25g protein recovery intake and cooldown.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setRecoveryWindowMinutes(mins)}
                            className={`px-3 py-1.5 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                              recoveryWindowMinutes === mins
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasWarmupRollout}
                        onChange={(e) => setHasWarmupRollout(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasWarmupRollout ? 'orange' : 'greyscale'}
                            icon={Flame}
                            size="sm"
                            isSelected={hasWarmupRollout}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Échauffement progressif sur home-trainer / route (+15 min)' : 'Pre-Ride Progressive Warmup Rollout (+15 min)'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Ajoute un bloc d’activation cardiaque et de vélocité avant le secteur chronométré.' : 'Incorporates structured cardiac activation before full tempo pacing.'}
                        </p>
                      </div>
                    </label>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={highCarbPacingTarget}
                        onChange={(e) => setHighCarbPacingTarget(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={highCarbPacingTarget ? 'yellow-vest' : 'greyscale'}
                            icon={Lightning}
                            size="sm"
                            isSelected={highCarbPacingTarget}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Cible d’oxydation glucidique élevée (60 - 90g glucides/h)' : 'High Carbohydrate Pacing Target (60 - 90g carbs/hr)'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Calibre la checklist avec un apport régulier toutes les 20 minutes pour éviter la fringale.' : 'Schedules aggressive 20-minute fueling intervals to sustain high aerobic threshold.'}
                        </p>
                      </div>
                    </label>
                  </>
                )}

                {/* 4. ESCAPADE TAILORED CONTROLS */}
                {archetype === 'ESCAPADE' && (
                  <>
                    <div className="p-5 rounded-pod bg-pod border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <IconBadge
                          theme="purple"
                          icon={Bed}
                          size="spine"
                          isSelected
                          solidBacker
                          className="w-9 h-9 sm:w-9 sm:h-9"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Marge d’enregistrement à l’hôtel / B&B' : 'Hotel / B&B Check-in Buffer'}
                          </h4>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {isFr ? 'Temps alloué pour déposer les bagages et s’installer avant le dîner.' : 'Arrival window allocated before hotel check-in desk closure or dinner reservations.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setHotelCheckinBufferMinutes(mins)}
                            className={`px-3 py-1.5 text-xs rounded-full font-mono transition-all cursor-pointer ${CHIP_RING_BASE} ${
                              hotelCheckinBufferMinutes === mins
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : `bg-card hover:bg-chip text-ink ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasSecureGarageCheck}
                        onChange={(e) => setHasSecureGarageCheck(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasSecureGarageCheck ? 'emerald' : 'greyscale'}
                            icon={ShieldCheck}
                            size="sm"
                            isSelected={hasSecureGarageCheck}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Vérification du garage à vélo fermé & sécurisé' : 'Verified Secure Hotel Bike Garage Protocol'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Exige un local vélo fermé à clé ou cour privée surveillée à l’étape.' : 'Requires an enclosed lockable bike shed or private courtyard at the destination.'}
                        </p>
                      </div>
                    </label>

                    <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={hasPicnicTerroirHalt}
                        onChange={(e) => setHasPicnicTerroirHalt(e.target.checked)}
                        className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <IconBadge
                            theme={hasPicnicTerroirHalt ? 'rose' : 'greyscale'}
                            icon={Wine}
                            size="sm"
                            isSelected={hasPicnicTerroirHalt}
                            solidBacker
                          />
                          <h4 className="font-bold text-sm text-ink">
                            {isFr ? 'Pause pique-nique au vert & terroir local (+45 min)' : 'Scenic Waterside Picnic or Terroir Dining (+45 min)'}
                          </h4>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {isFr ? 'Intègre un temps de détente au bord de l’eau avec dégustation de produits régionaux.' : 'Incorporates a 45-minute relaxation dwell time along vineyards or riverbanks.'}
                        </p>
                      </div>
                    </label>
                  </>
                )}

                {/* UNIVERSAL: Real-Food Nutrition Strategy */}
                <label className="p-5 rounded-pod bg-pod hover:bg-chip/50 border border-black/5 dark:border-white/10 flex items-start gap-3.5 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={realFoodNutrition}
                    onChange={(e) => setRealFoodNutrition(e.target.checked)}
                    className="w-4 h-4 mt-1 accent-volt rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <IconBadge
                        theme={realFoodNutrition ? 'emerald' : 'greyscale'}
                        icon={ForkKnife}
                        size="sm"
                        isSelected={realFoodNutrition}
                        solidBacker
                      />
                      <h4 className="font-bold text-sm text-ink">
                        {isFr
                          ? 'Protocole de nutrition naturelle (Zéro gel chimique ni maltodextrine)'
                          : 'Real-Food Nutrition Strategy (Zero gels or maltodextrin)'}
                      </h4>
                    </div>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                      {isFr
                        ? 'Alimente la feuille de route avec des aliments bruts digestes : dattes Medjool, figues de Turquie, Skyr 0% et jus pressé.'
                        : 'Configures fueling checklist strictly with whole real foods: Medjool dates, Turkish dried figs, artisanal pâte de fruits, 0% Skyr, and cold-pressed juices.'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Ready to Launch Summary Box (4-Layer Yellow-Vest Brand Surface) */}
              <div
                className={`p-4 rounded-pod ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs`}
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-current shrink-0 mt-0.5 sm:mt-0" />
                  <span className="font-medium text-current">
                    {isFr ? 'Paramètres validés :' : 'All parameters calibrated :'} {archetype} · {distanceKm} km @ {cruisingSpeedKmH} km/h · {totalSystemMassKg} kg · {isFr ? 'Départ' : 'Rollout'} ~{computedRollout} → {isFr ? 'Arrivée' : 'Arrival'} ~{computedArrival}
                  </span>
                </div>
                <span className="font-mono text-current font-bold shrink-0 self-end sm:self-auto">
                  {isFr ? 'PRÊT À ROULER' : 'READY TO ROLL'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation Controls */}
        <div className="px-4 sm:px-8 py-3 sm:py-3.5 bg-pod border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap shrink-0">
          {step === 0 ? (
            <div className="text-xs text-ink-muted">
              {isFr ? 'Choisissez une option pour débuter.' : 'Select an option above to ride or configure.'}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full bg-card hover:bg-chip text-ink ${CHIP_RING_BASE} ring-zinc-300 dark:ring-zinc-700 ${CHIP_DUOTONE_ISOLATION_CLASSES} text-xs font-semibold transition-all cursor-pointer`}
            >
              <ArrowLeft className={`w-4 h-4 ${GREYSCALE_TOKENS.primary}`} />
              <span>
                {step === 1
                  ? (isFr ? 'Retour à l’accueil' : 'Back to Welcome')
                  : (isFr ? 'Étape précédente' : 'Previous Step')}
              </span>
            </button>
          )}

          {step > 0 && step < 4 && (
            <button
              type="button"
              disabled={step === 1 && !archetype}
              onClick={() => setStep((prev) => Math.min(4, prev + 1))}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                step === 1 && !archetype
                  ? `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_UNSELECTED} opacity-50 cursor-not-allowed`
                  : `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} hover:brightness-[0.97] dark:hover:brightness-110 cursor-pointer`
              }`}
            >
              <span>{isFr ? 'Étape suivante' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4 text-current" />
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleLaunchCalibrated}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.97] dark:hover:brightness-110 text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer`}
            >
              <RocketLaunch className="w-4 h-4 text-current" />
              <span>{isFr ? 'Ouvrir le Cockpit' : 'Open Ride Cockpit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
