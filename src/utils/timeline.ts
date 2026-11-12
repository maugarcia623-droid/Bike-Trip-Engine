import { RouteParams, RouteWaypoint, OfficeConstraints, WeatherCondition, TimelineStep, LogisticsSettings, PreRideStyle, TimelineAnchorMode } from '../types/trip';
import { AmenityCategory, StageAmenity } from '../types/amenities';
import { computeCumulativeDistances, haversineDistanceMeters, snapToPolyline } from '../services/overpassCorridor';
import { estimateAmenityDetourKm } from './cueSheet';
import { subtractMinutesFromTime, addMinutesToTime } from './nutrition';
import { loadRiderBikeSpecs } from './specsStorage';
import { formatFuelTarget } from '../types/specs';
import { resolveCompliantPantry, getCafeSnackSuggestion } from '../data/pantryCatalog';
import { Language, getCurrentLanguage } from '../context/LanguageContext';

export interface SolvedTripTimeline {
  departureTimeHHMM: string;
  arrivalTimeHHMM: string;
  totalTransitMin: number;
  movingMin: number;
  dwellMin: number;
  preRideWindow: string;
  preRideMealTimeHHMM: string;
  postRideImmediateWindow?: string;
  postRideMealWindow?: string;
  postRideConsolidatedWindow?: string;
  resolvedDepartureMin: number;
  resolvedArrivalMin: number;
}

export function parseHHMM(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return 8 * 60 + 30; // 08:30 default
  }
  const [h, m] = timeStr.split(':').map(Number);
  const validH = isNaN(h) ? 8 : Math.max(0, Math.min(23, h));
  const validM = isNaN(m) ? 30 : Math.max(0, Math.min(59, m));
  return validH * 60 + validM;
}

export function formatHHMM(totalMinutes: number): string {
  let min = Math.round(totalMinutes) % 1440;
  while (min < 0) min += 1440;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateDwellMinutes(
  activeChips: string[] = [],
  logistics?: Partial<LogisticsSettings>
): number {
  let dwell = 0;
  if (activeChips.includes('coffee-stop')) {
    dwell += logistics?.coffeeDurationMin ?? 15;
  }
  if (activeChips.includes('picnic-outing')) {
    dwell += 45;
  }
  if (activeChips.includes('resupply-points')) {
    dwell += 15;
  }
  return dwell;
}

export function solveTripTimeline(
  movingSeconds: number,
  activeChips: string[] = [],
  logistics?: Partial<LogisticsSettings>
): SolvedTripTimeline {
  const dwellMin = calculateDwellMinutes(activeChips, logistics);
  const movingMin = Math.ceil(Math.max(60, movingSeconds) / 60);
  const totalTransitMin = movingMin + dwellMin;

  const anchorMode = logistics?.timelineAnchorMode ?? 'arrive-by';
  const defaultAnchor = anchorMode === 'arrive-by' ? '08:30' : '07:35';
  const anchorTime = logistics?.anchorTimeHHMM || defaultAnchor;

  let resolvedDepartureMin: number;
  let resolvedArrivalMin: number;

  if (anchorMode === 'arrive-by') {
    resolvedArrivalMin = parseHHMM(anchorTime);
    resolvedDepartureMin = resolvedArrivalMin - totalTransitMin;
  } else {
    resolvedDepartureMin = parseHHMM(anchorTime);
    resolvedArrivalMin = resolvedDepartureMin + totalTransitMin;
  }

  const departureTimeHHMM = formatHHMM(resolvedDepartureMin);
  const arrivalTimeHHMM = formatHHMM(resolvedArrivalMin);

  const preStyle = logistics?.preRideStyle ?? 'full-breakfast';
  const preBufferMin = preStyle === 'full-breakfast' ? 45 : preStyle === 'light-liquid' ? 20 : 15;
  const preRideMealTimeHHMM = formatHHMM(resolvedDepartureMin - preBufferMin);
  const preRideWindow = `${preRideMealTimeHHMM} – ${departureTimeHHMM}`;

  // The shower-locker chip only seeds the default; an explicit logistics choice always wins
  // (kept identical to nutrition.ts and NutritionBento so windows and cards agree).
  const isSplit = logistics?.splitPostRideRecovery ?? activeChips.includes('shower-locker');

  let postRideImmediateWindow: string | undefined;
  let postRideMealWindow: string | undefined;
  let postRideConsolidatedWindow: string | undefined;

  if (isSplit) {
    postRideImmediateWindow = `${arrivalTimeHHMM} – ${formatHHMM(resolvedArrivalMin + 10)}`;
    postRideMealWindow = `${formatHHMM(resolvedArrivalMin + 22)} – ${formatHHMM(resolvedArrivalMin + 37)}`;
  } else {
    postRideConsolidatedWindow = `${formatHHMM(resolvedArrivalMin + 10)} – ${formatHHMM(resolvedArrivalMin + 30)}`;
  }

  return {
    departureTimeHHMM,
    arrivalTimeHHMM,
    totalTransitMin,
    movingMin,
    dwellMin,
    preRideWindow,
    preRideMealTimeHHMM,
    postRideImmediateWindow,
    postRideMealWindow,
    postRideConsolidatedWindow,
    resolvedDepartureMin,
    resolvedArrivalMin,
  };
}

export interface ReverseTimelineCalculation {
  shiftStartTime: string;
  gateArrivalTime: string;
  hardDepartureTime: string;
  preRideMealTime: string;
  wakeUpTime: string;
  totalDoorToDeskMinutes: number;
  pureMovingMinutes: number;
  bufferMinutes: number;
  steps: TimelineStep[];
  weatherHeadwindImpactMinutes: number;
}

const ROLLOUT_STEP_PRIORITY_IDS = new Set([
  'hard-departure',
  'sport-rollout',
  'bp-departure',
]);

const ARRIVAL_STEP_PRIORITY_IDS = new Set([
  'gate-security',
  'destination-arrival',
  'bp-destination-arrive',
  'sport-session-finish',
]);

function resolveAmenityStopMeta(
  category: AmenityCategory,
  isFr: boolean
): { iconName: string; label: string; category: TimelineStep['category'] } {
  switch (category) {
    case 'water':
      return {
        iconName: 'Droplets',
        label: isFr ? "Point d'eau" : 'Water stop',
        category: 'nutrition',
      };
    case 'cemetery':
      return {
        iconName: 'Cemetery',
        label: isFr ? 'Cimetière (Eau)' : 'Cemetery water',
        category: 'nutrition',
      };
    case 'food':
      return {
        iconName: 'Baguette',
        label: isFr ? 'Ravitaillement' : 'Resupply stop',
        category: 'nutrition',
      };
    case 'mechanix':
      return {
        iconName: 'Wrench',
        label: isFr ? 'Atelier / Abri' : 'Repair / Shelter',
        category: 'ride',
      };
  }
}

/**
 * Builds chronological TimelineStep entries for intermediate stops between Point A and Point B,
 * unifying Configurator waypoints (`route.waypoints`) and Resupply Radar pins (`pinnedAmenities`)
 * without duplicating stops that have been both pinned and routed.
 */
function buildIntermediateStopSteps(
  route: RouteParams,
  pinnedAmenities: StageAmenity[],
  hardDepartureTime: string,
  totalRideMinutes: number,
  isFr: boolean
): TimelineStep[] {
  const waypoints = route.waypoints || [];
  const amenities = pinnedAmenities || [];
  if (waypoints.length === 0 && amenities.length === 0) {
    return [];
  }

  const hasPolyline = Boolean(route.coordinates && route.coordinates.length >= 2);
  const cumDistances = hasPolyline ? computeCumulativeDistances(route.coordinates!) : null;
  const polylineTotalKm =
    cumDistances && cumDistances.length > 0 ? cumDistances[cumDistances.length - 1] : 0;
  const totalKm = Math.max(1, route.distanceKm || polylineTotalKm || 30);

  const matchedAmenityIds = new Set<string>();

  const findMatchingAmenity = (wp: RouteWaypoint): StageAmenity | undefined => {
    for (const amenity of amenities) {
      if (wp.sourceAmenityId && wp.sourceAmenityId === amenity.id) return amenity;
      if (wp.id === `wp-poi-${amenity.id}`) return amenity;
      if (
        wp.coordinates &&
        haversineDistanceMeters(wp.coordinates[0], wp.coordinates[1], amenity.lat, amenity.lon) < 60
      ) {
        return amenity;
      }
    }
    return undefined;
  };

  interface NormalizedStop {
    id: string;
    name: string;
    stopKm: number;
    amenity?: StageAmenity;
    isRoutedWaypoint: boolean;
  }

  const normalized: NormalizedStop[] = [];

  waypoints.forEach((wp, idx) => {
    const matched = findMatchingAmenity(wp);
    if (matched) {
      matchedAmenityIds.add(matched.id);
    }

    let stopKm: number;
    if (
      typeof wp.distanceFromStartKm === 'number' &&
      Number.isFinite(wp.distanceFromStartKm) &&
      wp.distanceFromStartKm >= 0
    ) {
      stopKm = wp.distanceFromStartKm;
    } else if (wp.coordinates && cumDistances && route.coordinates) {
      stopKm = snapToPolyline(wp.coordinates[0], wp.coordinates[1], route.coordinates, cumDistances).routeKm;
    } else if (matched && Number.isFinite(matched.routeKm) && matched.routeKm >= 0) {
      stopKm = matched.routeKm;
    } else {
      stopKm = ((idx + 1) / (waypoints.length + 1)) * totalKm;
    }

    normalized.push({
      id: `intermediate-stop-wp-${wp.id || idx}`,
      name: wp.name || matched?.name || (isFr ? `Étape ${idx + 1}` : `Intermediate stop ${idx + 1}`),
      stopKm,
      amenity: matched,
      isRoutedWaypoint: true,
    });
  });

  amenities.forEach((amenity) => {
    if (matchedAmenityIds.has(amenity.id)) return;

    let stopKm: number;
    if (Number.isFinite(amenity.routeKm) && amenity.routeKm >= 0) {
      stopKm = amenity.routeKm;
    } else if (cumDistances && route.coordinates) {
      stopKm = snapToPolyline(amenity.lat, amenity.lon, route.coordinates, cumDistances).routeKm;
    } else {
      stopKm = totalKm * 0.5;
    }

    const meta = resolveAmenityStopMeta(amenity.category, isFr);
    normalized.push({
      id: `intermediate-stop-poi-${amenity.id}`,
      name: amenity.name || meta.label,
      stopKm,
      amenity,
      isRoutedWaypoint: false,
    });
  });

  normalized.sort((a, b) => a.stopKm - b.stopKm);

  const safeRideMinutes = Math.max(1, totalRideMinutes);
  const minOffset = totalRideMinutes >= 2 ? 1 : 0;
  const maxOffset = totalRideMinutes >= 2 ? totalRideMinutes - 1 : safeRideMinutes;

  return normalized.map((stop) => {
    const clampedKm = Math.max(0, Math.min(totalKm, stop.stopKm));
    const rawOffset = Math.round((clampedKm / totalKm) * safeRideMinutes);
    const offsetMinutes = Math.max(minOffset, Math.min(maxOffset, rawOffset));
    const time = addMinutesToTime(hardDepartureTime, offsetMinutes);
    const location = `KM ${clampedKm.toFixed(1)}`;

    if (stop.amenity) {
      const meta = resolveAmenityStopMeta(stop.amenity.category, isFr);
      const parts = [
        meta.label,
        stop.isRoutedWaypoint
          ? isFr
            ? 'Étape intégrée au tracé'
            : 'Routed via stop'
          : isFr
          ? 'Épingle Radar'
          : 'Radar pin',
      ];
      if (!stop.isRoutedWaypoint) {
        const detourKm = estimateAmenityDetourKm(stop.amenity.detourMeters);
        if (detourKm > 0) {
          parts.push(`+${detourKm.toFixed(1)} km`);
        } else if (stop.amenity.detourMeters >= 50) {
          parts.push(`+${Math.round(stop.amenity.detourMeters)} m`);
        }
      }
      if (stop.amenity.openingHours) {
        parts.push(stop.amenity.openingHours);
      }

      return {
        id: stop.id,
        time,
        title: stop.name,
        location,
        category: meta.category,
        isCrucialCheckpoint: true,
        description: parts.join(' · '),
        iconName: meta.iconName,
      };
    }

    return {
      id: stop.id,
      time,
      title: stop.name,
      location,
      category: 'ride',
      isCrucialCheckpoint: true,
      description: isFr
        ? 'Point de passage intermédiaire sur le parcours'
        : 'Intermediate stop along the route',
      iconName: 'MapPin',
    };
  });
}

export function calculateReverseTimeline(
  route: RouteParams,
  office: OfficeConstraints,
  weather: WeatherCondition,
  tripTag: string = 'VÉLOTAF',
  destinationName: string = '',
  lang: Language = getCurrentLanguage(),
  extraBufferMinutes: number = 0,
  customChips: string[] = [],
  physicsSpeedOverride?: {
    effectiveSpeedKmH: number;
    calmSpeedKmH: number;
    arriveAtMode?: boolean;
    departureTime?: string;
    movingTimeSeconds?: number;
    logistics?: LogisticsSettings;
    savoryResetCount?: number;
    pinnedAmenities?: StageAmenity[];
  }
): ReverseTimelineCalculation {
  const isFr = lang === 'fr';
  const tagUpper = tripTag.toUpperCase();
  const isSport = tagUpper.includes('SPORT') || tagUpper.includes('FONDO') || tagUpper.includes('TEMPO');
  const isBikepacking = tagUpper.includes('BIKEPACK') || tagUpper.includes('BIVOUAC');
  const isEscapade = !isSport && !isBikepacking && (
    tagUpper.includes('ESCAPADE') ||
    tagUpper.includes('TOURING') ||
    tagUpper.includes('LEISURE') ||
    tagUpper.includes('WEEKEND')
  );

  // Moving time in minutes — unified with Hold-Speed vs. Hold-Effort physics solver
  const fallbackSpeed = Math.max(5, route.targetSpeedKmH || 25);
  const isEffortMode = route.pacingMode === 'effort';
  const windKmh = weather.isHeadwindActive ? (weather.baseWindSpeedKmH || 0) : 0;

  const calmSpeed = physicsSpeedOverride?.calmSpeedKmH
    ? Math.max(5, physicsSpeedOverride.calmSpeedKmH)
    : fallbackSpeed;

  const effectiveSpeedKmH = physicsSpeedOverride?.effectiveSpeedKmH
    ? Math.max(5, physicsSpeedOverride.effectiveSpeedKmH)
    : isEffortMode
    ? Math.max(8, calmSpeed - windKmh * 0.35)
    : calmSpeed;

  const rawMovingMinutes = Math.round((route.distanceKm / calmSpeed) * 60);
  const actualMovingMinutes = Math.round((route.distanceKm / effectiveSpeedKmH) * 60);
  const weatherHeadwindImpactMinutes = Math.max(0, actualMovingMinutes - rawMovingMinutes);

  const totalRideMinutes = actualMovingMinutes;
  const routeBuffer = (isEscapade || isBikepacking) ? 15 : isSport ? 5 : (route.urbanTrafficDelayMinutes ?? 8);
  const arrivalBuffer = (isEscapade || isBikepacking) ? 10 : isSport ? 5 : (route.gateSecurityDelayMinutes ?? 5);

  const defaultAnchor = isSport ? '11:00' : isBikepacking ? '18:00' : isEscapade ? '15:00' : '08:30';
  const totalEnRouteMinutes = totalRideMinutes + routeBuffer + arrivalBuffer + extraBufferMinutes;

  // Check if deterministic single-anchor logistics solver is active
  const hasLogistics = Boolean(physicsSpeedOverride?.logistics);
  const solved = hasLogistics
    ? solveTripTimeline(physicsSpeedOverride?.movingTimeSeconds || actualMovingMinutes * 60, customChips, physicsSpeedOverride!.logistics)
    : null;

  // Support both Reverse Chronometry ("Arrive at") and Forward Chronometry ("Depart at")
  const isDepartAtMode =
    physicsSpeedOverride?.arriveAtMode === false && Boolean(physicsSpeedOverride?.departureTime);

  const hardDepartureTime = solved
    ? solved.departureTimeHHMM
    : isDepartAtMode
    ? (physicsSpeedOverride!.departureTime as string)
    : subtractMinutesFromTime(
        office.targetGateArrivalTime || office.shiftStartTime || defaultAnchor,
        totalEnRouteMinutes
      );

  const targetArrival = solved
    ? solved.arrivalTimeHHMM
    : isDepartAtMode
    ? addMinutesToTime(hardDepartureTime, totalEnRouteMinutes)
    : office.targetGateArrivalTime || office.shiftStartTime || defaultAnchor;

  const postGateOfficeMinutes = Math.max(
    15,
    (office.lockerRefuelMinutes ?? 10) +
      (office.showerChangeMinutes ?? 10) +
      (office.breakRoomBreakfastMinutes ?? 10)
  );
  const resolvedShiftStartTime =
    isSport || isBikepacking || isEscapade
      ? targetArrival
      : isDepartAtMode
      ? addMinutesToTime(targetArrival, postGateOfficeMinutes)
      : office.shiftStartTime || addMinutesToTime(targetArrival, postGateOfficeMinutes);

  // Pre-rollout checkpoints
  const bikePrepTime = subtractMinutesFromTime(hardDepartureTime, 15);
  const preRideMealTime = solved
    ? solved.preRideMealTimeHHMM
    : subtractMinutesFromTime(hardDepartureTime, 45);
  const wakeUpTime = subtractMinutesFromTime(hardDepartureTime, 60);

  const destTitle = destinationName || route.destination || 'Destination';
  const fallbackGate = isEscapade
    ? (isFr ? 'Réception Hôtel' : 'Hotel Check-in')
    : isBikepacking
    ? (isFr ? 'Zone de Bivouac' : 'Camp / Bivouac Site')
    : isSport
    ? (isFr ? 'Ligne d’arrivée' : 'Finish Line')
    : (isFr ? 'Porte' : 'Gate');
  const hasCommuterGateText = Boolean(
    office.gateName &&
      /gate\s*(b|17)|porte\s*(b|17)|atlantis|campus|office|bureau|workplace|entreprise/i.test(office.gateName)
  );
  const rawGate =
    !office.gateName?.trim() || ((isEscapade || isBikepacking || isSport) && hasCommuterGateText)
      ? fallbackGate
      : office.gateName;
  const localizedGate = isFr
    ? rawGate.replace(/^Gate\b/i, 'Porte')
    : rawGate.replace(/^Porte\b/i, 'Gate');

  const specs = loadRiderBikeSpecs();
  const compliantPantry = resolveCompliantPantry(specs);
  const telemetryMode = specs.telemetryMode ?? 'quantitative';
  const isQuant = telemetryMode === 'quantitative';
  const showWatts = isQuant && (specs.pacingInputMode ?? 'feel') === 'power';
  const bidonMl = specs.bidonSizeMl ?? 650;
  const slots = specs.frameBottleSlots ?? 2;
  const riderCarbs = specs.carbTargetGPerHr ?? 60;
  const fuelRateText = formatFuelTarget(riderCarbs, telemetryMode, lang);

  let steps: TimelineStep[] = [];

  if (isSport) {
    // ── SPORT / GRAN FONDO MILESTONES ──
    const warmupTime = hardDepartureTime;
    const midIntervalTime = addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5));
    const recoveryWindowTime = addMinutesToTime(targetArrival, 15);

    steps = [
      {
        id: 'sport-fuel-primer',
        time: wakeUpTime,
        title: isFr ? 'Hydratation & Charge Glucides Rapides' : 'Hydration & Fast Carbs Primer',
        location: isFr ? 'Domicile' : 'Home Base',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: isQuant
          ? isFr
            ? '500 ml de boisson électrolytes + 60 g de glucides à IG élevé. Vérifiez la charge du compteur GPS et de la ceinture cardio.'
            : '500 ml electrolyte mix + 60 g high-glycemic carbs. Top off bike computer & heart rate monitor.'
          : isFr
          ? `Un grand verre d’eau électrolytes + ${compliantPantry.preRide.nameFr.toLowerCase()}. Vérifiez la charge du compteur GPS.`
          : `1 tall glass electrolyte water + ${compliantPantry.preRide.nameEn.toLowerCase()}. Top off bike computer.`,
        iconName: 'AlarmClock',
      },
      {
        id: 'sport-cockpit-check',
        time: bikePrepTime,
        title: isFr ? 'Contrôle vélo & pression des pneus' : 'Tire pressure & bike check',
        location: isFr ? 'Zone de départ' : 'Roll-Out Point',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? `Pression des pneus ajustée pour un bon rendement. Vérification lubrification chaîne et mise en place des ${slots} bidon${slots > 1 ? 's' : ''} de ${bidonMl} ml.`
          : `Tire pressures dialed for smooth rolling. Lube check and ${slots}× ${bidonMl} ml water bottle${slots > 1 ? 's' : ''}.`,
        iconName: 'CheckCircle2',
      },
      {
        id: 'sport-rollout',
        time: warmupTime,
        title: isFr ? 'Départ & échauffement progressif' : 'Start ride & gentle warmup',
        location: isFr ? 'Départ' : 'Origin',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: isFr
          ? `15 min de vélocité progressive avant de caler l'allure cible (~${route.targetSpeedKmH || 30} km/h).`
          : `15-min progressive spin before settling into target pace (~${route.targetSpeedKmH || 30} km/h).`,
        iconName: 'Navigation',
      },
      {
        id: 'sport-mid-fuel',
        time: midIntervalTime,
        title: isFr ? 'Fenêtre Ravito Glucides & Électrolytes' : 'Mid-Ride Carb & Electrolyte Window',
        location: isFr ? 'Secteur Allure' : 'Pacing Sector',
        category: 'nutrition',
        isCrucialCheckpoint: false,
        description: isQuant
          ? isFr
            ? `Prise énergétique en selle adaptée à votre profil (~${riderCarbs} g glucides/h). Contrôle de l’allure et de la dérive cardiaque.`
            : `On-the-bike fueling scaled to your rider profile (~${riderCarbs} g carbs/h target). Smooth pacing & hydration check.`
          : isFr
          ? `Prise énergétique en selle adaptée à votre profil (${fuelRateText}). Gardez une allure fluide et régulière.`
          : `On-the-bike fueling scaled to your rider profile (${fuelRateText}). Smooth pacing & hydration check.`,
        iconName: 'Wind',
      },
      {
        id: 'sport-session-finish',
        time: targetArrival,
        title: isFr ? `Arrivée d'étape : ${destTitle}` : `Stage Finish: ${destTitle}`,
        location: destTitle,
        category: 'transit',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Passage de la ligne d’arrivée. 5 min de retour au calme souple sous 120 bpm.'
          : 'Cross route finish marker. 5-min easy spin down below 120 bpm.',
        iconName: 'ShieldCheck',
      },
      {
        id: 'sport-post-recovery',
        time: recoveryWindowTime,
        title: isFr ? 'Récupération & étirements' : 'Post-Ride Recovery & Stretch',
        location: isFr ? 'Après la sortie' : 'Post-ride',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isQuant
          ? isFr
            ? '25 g de protéines + 500 ml d’eau fraîche. Relâchement ischio-jambiers et fléchisseurs de hanche.'
            : '25 g protein + 500 ml cold water. Hamstring & hip flexor stretch.'
          : isFr
          ? `${compliantPantry.postRide.nameFr} + grand verre d’eau fraîche. Relâchement ischio-jambiers et fléchisseurs de hanche.`
          : `${compliantPantry.postRide.nameEn} + tall glass of cold water. Gentle hamstring & hip flexor stretch.`,
        iconName: 'Coffee',
      },
    ];

    if (customChips.includes('climbing-kom-hunt')) {
      steps.push({
        id: 'sport-kom-repeats',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.4)),
        title: isFr ? 'Chasse aux KOM & Répétitions en Côte' : 'KOM Segment Attacks & Ridge Climbs',
        location: isFr ? 'Secteur Bosses' : 'KOM Ridge Segment',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: showWatts
          ? isFr
            ? 'Attaques à 380 W+ sur les segments clés, relances explosives en danseuse et descente souple en récupération.'
            : 'Punchy 380 W+ surges on target segments, out-of-the-saddle attacks and smooth recovery descents.'
          : isFr
          ? 'Attaques soutenues sur les segments clés, relances dynamiques en danseuse et descente souple en récupération.'
          : 'Punchy hard surges on target segments, out-of-the-saddle attacks and smooth recovery descents.',
        iconName: 'Trophy',
      });
    }

    if (customChips.includes('interval-training')) {
      steps.push({
        id: 'sport-threshold-intervals',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.35)),
        title: showWatts
          ? isFr
            ? 'Fractionné au Seuil (Séries à 310 W+)'
            : 'Threshold VO2max Interval Sets (310 W+)'
          : isFr
          ? 'Fractionné soutenu au seuil'
          : 'Sustained Threshold Interval Sets',
        location: isFr ? 'Zone d’effort' : 'Interval Stretch',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: showWatts
          ? isFr
            ? 'Répétitions au seuil (310 W+) avec maintien d’une cadence régulière à 95–100 tr/min.'
            : 'Structured threshold repetitions holding 310 W+ with steady cadence (95–100 RPM).'
          : isFr
          ? 'Répétitions soutenues au seuil avec maintien d’une cadence fluide à 95–100 tr/min.'
          : 'Structured hard threshold repetitions with smooth cadence control (95-100 RPM).',
        iconName: 'Flame',
      });
    }

    if (customChips.includes('paceline-drafting')) {
      steps.push({
        id: 'sport-paceline-echelon',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.6)),
        title: isFr ? 'Peloton & Relais Organisés (33 km/h)' : 'Paceline Rotations (33 km/h)',
        location: isFr ? 'Groupe' : 'Open Road',
        category: 'ride',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Relais réguliers de 20–30 s à 33 km/h avec 15–20 % d’économie d’effort à l’abri du vent.'
          : 'Smooth 20–30 s pulls at 33 km/h, saving 15–20% effort riding in the draft.',
        iconName: 'Users',
      });
    }

    if (customChips.includes('hydration-electrolytes')) {
      const fuelStep = steps.find((s) => s.id === 'sport-mid-fuel');
      if (fuelStep) {
        fuelStep.title = isQuant
          ? isFr
            ? `Ravitaillement ${riderCarbs} g glucides/h & électrolytes`
            : `Tailored Carb Pacing (${riderCarbs} g/h) & Electrolytes`
          : isFr
          ? `Ravitaillement (${fuelRateText}) & électrolytes`
          : `Steady Fueling (${fuelRateText}) & Electrolytes`;
        fuelStep.description = isQuant
          ? isFr
            ? `Apport régulier calibré sur votre tolérance digestive (${riderCarbs} g/h) + recharge sodium 500–750 mg pour éviter toute fringale.`
            : `Steady fueling calibrated to your gut capacity (${riderCarbs} g/h) + 500–750 mg sodium reload to prevent bonking and cramping.`
          : isFr
          ? `Apport régulier calibré sur votre confort digestif (${fuelRateText}) + boisson électrolytes pour éviter le coup de mou.`
          : `Steady fueling calibrated to your digestion comfort (${fuelRateText}) + electrolyte sips to prevent energy dips.`;
      }
    }
  } else if (isBikepacking) {
    // ── BIKEPACKING / ADVENTURE MILESTONES ──
    const midStageTime = addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5));
    const campPitchTime = addMinutesToTime(targetArrival, 20);

    steps = [
      {
        id: 'bp-stowage-check',
        time: wakeUpTime,
        title: isFr ? 'Répartition du poids sacoches & repas' : 'Pannier / Saddlebag weight distribution & meals',
        location: isFr ? 'Camp / Départ' : 'Camp / Base',
        category: 'prep',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Compression des sacs étanches, répartition du poids sacoches / sac de selle, contrôle du couchage et de la filtration d’eau.'
          : 'Pack dry bags, balance pannier / saddlebag weight distribution, inspect sleeping kit and water filtration gear.',
        iconName: 'AlarmClock',
      },
      {
        id: 'bp-harness-inspection',
        time: bikePrepTime,
        title: isFr ? 'Contrôle sacoches, freins & kit réparation' : 'Check bags, brakes & repair kit',
        location: isFr ? 'Départ' : 'Trailhead',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Serrage du harnais de cintre, maintien de la sacoche de selle et vérification des flancs de pneus sous charge.'
          : 'Torque check handlebar harness, secure seat-pack sway, check tire sidewalls for loaded clearance.',
        iconName: 'CheckCircle2',
      },
      {
        id: 'bp-departure',
        time: hardDepartureTime,
        title: isFr ? `Départ expédition vers ${destTitle}` : `Trailhead rollout toward ${destTitle}`,
        location: isFr ? 'Départ' : 'Origin',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Cadence d’endurance régulière (~${route.targetSpeedKmH || 18} km/h) avec vélo chargé.`
          : `Steady endurance cadence (~${route.targetSpeedKmH || 18} km/h) under loaded cargo mass.`,
        iconName: 'Navigation',
      },
      {
        id: 'bp-mid-refuel',
        time: midStageTime,
        title: isFr ? 'Ravito Mi-Étape, Eau & Sanglage' : 'Mid-Stage Water Resupply & Bag Check',
        location: isFr ? 'Mi-Parcours' : 'Midway Sector',
        category: 'nutrition',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Contrôle de tension des sangles après vibrations et remplissage des réserves d’eau.'
          : 'Check frame bag straps for trail vibration looseness. Top off water bladders.',
        iconName: 'Wind',
      },
      {
        id: 'bp-destination-arrive',
        time: targetArrival,
        title: isFr ? `Arrivée à ${destTitle}` : `Arrival at ${destTitle}`,
        location: destTitle,
        category: 'transit',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Arrivée sur la zone de bivouac avant le crépuscule. Repérage d’un sol plat.'
          : 'Reach destination or bivouac zone. Survey ground for camp setup.',
        iconName: 'ShieldCheck',
      },
      {
        id: 'bp-camp-settle',
        time: campPitchTime,
        title: isFr ? 'Montage Bivouac, Recharge & Récupération' : 'Bivouac Setup, Evening Charging & Recovery',
        location: isFr ? 'Zone de Bivouac' : 'Bivouac Site',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Montage de la tente, recharge GPS/phares sur batterie externe, étirements et dîner chaud de récupération.'
          : 'Pitch shelter, plug GPS/lights into power bank for evening charging, air kit and enjoy warm recovery meal.',
        iconName: 'Coffee',
      },
    ];

    if (customChips.includes('mountain-adventure')) {
      steps.push({
        id: 'bp-mountain-col-clearance',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.45)),
        title: isFr ? 'Franchissement de Col & Contrôle Freins' : 'Alpine Pass Summit & Brake Pad Check',
        location: isFr ? 'Sommet du Col' : 'Alpine Pass Summit',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Contrôle du mordant des freins avant la descente technique, hydratation haute altitude et coupe-vent enfilé.'
          : 'Brake pad bite check before technical descent, altitude hydration and wind gilet deployed.',
        iconName: 'Mountain',
      });
      const arrStep = steps.find((s) => s.id === 'bp-destination-arrive');
      if (arrStep) {
        arrStep.title = isFr ? 'Arrivée Bivouac Montagne avant Crépuscule' : 'Mountain Bivouac Arrival before Dusk';
        arrStep.description = isFr
          ? 'Arrivée conseillée avant 19:30 pour installer le campement abrité du vent d’altitude.'
          : 'Target arrival before 19:30 to secure sheltered mountain camp against altitude wind.';
      }
    }

    if (customChips.includes('resupply-points')) {
      steps.push({
        id: 'bp-resupply-stop',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.35)),
        title: isFr ? 'Ravitaillement Boulangerie & Eau de Source' : 'Village Bakery & Spring Water Resupply',
        location: isFr ? 'Fontaine du Village' : 'Village Spring Waypoint',
        category: 'nutrition',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Recharge des 2L d’eau, approvisionnement en pain frais, fruits secs et bananes.'
          : 'Top off 2L water capacity, pick up fresh bread, dried fruit & energy rations.',
        iconName: 'UtensilsCrossed',
      });
    }

    if (customChips.includes('bivouac-camp')) {
      const campStep = steps.find((s) => s.id === 'bp-camp-settle');
      if (campStep) {
        campStep.title = isFr ? 'Bivouac Sauvage : Zéro Trace & Filtration d’Eau' : 'Wild Bivouac: Leave-No-Trace & Gravity Filter';
        campStep.description = isFr
          ? 'Montage de l’abri ultraléger, filtration d’eau à la flasque et repas chaud lyophilisé au réchaud.'
          : 'Pitch ultralight shelter, gravity water filtration, hot camp stove stew, and pristine leave-no-trace protocol.';
      }
    }

    if (customChips.includes('gravel-trail-master')) {
      const harnessStep = steps.find((s) => s.id === 'bp-harness-inspection');
      if (harnessStep) {
        harnessStep.title = isFr ? 'Calibrage Pression Tout-Terrain & Mèches' : 'Off-Grid Trail Pressure & Tubeless Dart Check';
        harnessStep.description = isFr
          ? 'Pression descendue à 2,4 bar pour maximiser l’adhérence sur piste caillouteuse, outil mèches accessible.'
          : 'Pressures dialed to 2.4 bar for loose trail grip, tubeless dart plug tool mounted within reach.';
      }
    }
  } else if (isEscapade) {
    // ── ESCAPADE / TOURING MILESTONES ──
    const arrivalTime = subtractMinutesFromTime(targetArrival, 5);
    const roomSettleTime = addMinutesToTime(targetArrival, 25);
    const exploreTime = addMinutesToTime(roomSettleTime, 30);

    steps = [
      {
        id: 'prep-hydration',
        time: wakeUpTime,
        title: isFr ? 'Répartition sacoches & hydratation' : 'Pannier balance & hydration primer',
        location: isFr ? 'Départ' : 'Home / Start',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Boire 400 ml d’eau avec électrolytes. Contrôler la répartition du poids sacoches / sac de selle (chargeurs, tenue du soir).'
          : 'Drink 400 ml water with electrolytes. Check pannier / saddlebag weight distribution (chargers, overnight kit).',
        iconName: 'AlarmClock',
      },
      {
        id: 'pre-ride-fuel',
        time: preRideMealTime,
        title: isFr ? 'Collation Énergétique Pré-Départ' : 'Pre-Ride Energy Breakfast',
        location: isFr ? 'Cuisine' : 'Kitchen Counter',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: isFr
          ? `${compliantPantry.preRide.nameFr} + expresso. Remplissage des ${slots} bidon${slots > 1 ? 's' : ''} pour la route.`
          : `${compliantPantry.preRide.nameEn} + espresso. Fill ${slots}× water bottle${slots > 1 ? 's' : ''} for the road.`,
        iconName: 'Utensils',
      },
      {
        id: 'garage-rollout',
        time: bikePrepTime,
        title: isFr ? 'Contrôle rapide du vélo' : 'Quick bike check',
        location: isFr ? 'Départ' : 'Start',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Pression pneus cyclo, sacoches sanglées, kit anti-crève et trace GPS chargée.'
          : 'Tire pressures at touring spec, panniers strapped, GPS route locked.',
        iconName: 'CheckCircle2',
      },
      {
        id: 'hard-departure',
        time: hardDepartureTime,
        title: isFr ? `Départ vers ${destTitle}` : `Rollout toward ${destTitle}`,
        location: isFr ? 'Départ' : 'Origin',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Allure cyclo régulière (~${route.targetSpeedKmH} km/h). Arrivée cible à ${targetArrival}.`
          : `Steady touring pace (~${route.targetSpeedKmH} km/h). Target arrival by ${targetArrival}.`,
        iconName: 'Navigation',
      },
      {
        id: 'mid-ride-transit',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5)),
        title: isFr ? 'Pause Ravito & Mi-Parcours' : 'Scenic Mid-Route Transition',
        location: isFr ? 'Mi-Parcours' : 'Midway Sector',
        category: 'ride',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Hydratation & encas énergétique. Gardez une cadence souple et confortable.'
          : 'Hydration check & energy bar. Maintain smooth, sustainable cadence.',
        iconName: 'Wind',
      },
      {
        id: 'destination-arrival',
        time: arrivalTime,
        title: isFr ? `Arrivée à ${destTitle}` : `Arrival in ${destTitle}`,
        location: destTitle,
        category: 'transit',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Entrée dans ${destTitle}. Approche calme jusqu'à la réception de l'hébergement.`
          : `Roll into ${destTitle}. Navigate to accommodation entrance.`,
        iconName: 'ShieldCheck',
      },
      {
        id: 'hotel-checkin',
        time: targetArrival,
        title: isFr ? 'Check-In Hôtel & Local Vélo Sécurisé' : 'Hotel Check-In & Secure Bike Storage',
        location: isFr ? 'Réception Hôtel' : 'Hotel Reception',
        category: 'office',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Enregistrement à la réception, rangement du vélo au local fermé et dépôt des bagages.'
          : 'Hotel Check-in at reception, secure bike in dedicated storage/room, and unload panniers.',
        iconName: 'Briefcase',
      },
      {
        id: 'freshen-up',
        time: roomSettleTime,
        title: isFr ? 'Recharge Soir, Douche & Récupération' : 'Evening Charging, Shower & Recovery',
        location: isFr ? "Chambre d'Hôtel" : 'Hotel Room',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Mise en charge GPS, phares et batterie externe, douche chaude, réhydratation et tenue de soirée.'
          : 'Plug GPS, lights & power bank for evening charging, hot shower, rehydrate, and slip into casual clothes.',
        iconName: 'ShowerHead',
      },
      {
        id: 'town-explore',
        time: exploreTime,
        title: isFr ? `Découverte de ${destTitle} & Dîner` : `Explore ${destTitle} & Evening Dining`,
        location: isFr ? `Centre de ${destTitle}` : `${destTitle} Center`,
        category: 'nutrition',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Balade à pied dans le centre, découverte locale et dîner détendu sans contrainte horaire.'
          : 'Stroll town center, visit local sights, relaxed dinner without timeline stress.',
        iconName: 'Coffee',
      },
    ];

    if (customChips.includes('picnic-outing')) {
      const hasDietaryFilters = (specs.dietaryFilters?.length ?? 0) > 0;
      const primarySolid = compliantPantry.onBikeSolids[0] || compliantPantry.preRide;
      steps.push({
        id: 'esc-picnic-lunch',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5)),
        title: isFr ? 'Déjeuner Pique-Nique au Bord de l’Eau (45 min)' : 'Waterside Scenic Picnic Lunch (45 min)',
        location: isFr ? 'Halte Fluviale / Lac' : 'Scenic Riverbank Halt',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: hasDietaryFilters
          ? isFr
            ? `Pause détente de 45 min : ${primarySolid.nameFr.toLowerCase()}, fruits frais et spécialités locales adaptées au soleil.`
            : `45-min waterside pause: ${primarySolid.nameEn.toLowerCase()}, fresh fruit and local specialties in the sun.`
          : isFr
          ? 'Pause détente de 45 min : pain frais, fromage local du terroir, fruits frais et hydratation au soleil.'
          : '45-min waterside pause: artisanal sourdough, regional cheese, fresh fruit and hydration in the sun.',
        iconName: 'Utensils',
      });
    }

    if (customChips.includes('historical-tour')) {
      steps.push({
        id: 'esc-historical-chateau',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.35)),
        title: isFr ? 'Visite Patrimoine & Pause Château (30 min)' : 'Château & Heritage Site Visit (30 min)',
        location: isFr ? 'Site Historique' : 'Heritage Monument',
        category: 'ride',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Stationnement sécurisé du vélo au pied des remparts et découverte à pied des monuments classés.'
          : 'Secure bike parking at castle gates, 30-min walking exploration of historic grounds.',
        iconName: 'Landmark',
      });
    }

    if (customChips.includes('local-gastronomy') || customChips.includes('wine-tasting')) {
      const diningStep = steps.find((s) => s.id === 'town-explore');
      if (diningStep) {
        diningStep.title = isFr ? 'Dîner Gastronomique du Terroir & Vignoble' : 'Regional Gastronomy & Terroir Dining';
        diningStep.description = isFr
          ? 'Table réservée pour 19:45 : accords mets-vins de terroir, spécialités régionales et récupération gourmande.'
          : 'Table booked for 19:45: local wine pairings, regional farm-to-table cuisine, and relaxed recovery.';
        diningStep.iconName = 'Wine';
      }
    }

    if (customChips.includes('photography-spots')) {
      steps.push({
        id: 'esc-golden-hour-photo',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.75)),
        title: isFr ? 'Spot Photo : Halte Lumière Dorée' : 'Golden Hour Scenic Photography Stop',
        location: isFr ? 'Belvédère Panoramique' : 'Scenic Overlook',
        category: 'ride',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Pause de 15 min pour immortaliser les paysages dans la lumière rasante de fin d’après-midi.'
          : '15-min pause to capture golden hour panoramas with handlebar camera gear.',
        iconName: 'Camera',
      });
    }
  } else {
    // ── COMMUTE / VÉLOTAF MILESTONES ──
    const gateArrivalAnchor = targetArrival;
    const gateTurnstileTime = subtractMinutesFromTime(gateArrivalAnchor, arrivalBuffer);
    const lockerRefuelEnd = addMinutesToTime(gateArrivalAnchor, office.lockerRefuelMinutes || 10);
    const isFasted = physicsSpeedOverride?.logistics?.preRideStyle === 'fasted-rollout';

    steps = [
      {
        id: 'wake-prep',
        time: wakeUpTime,
        title: isFr ? 'Réveil & hydratation' : 'Wake up and drink water',
        location: isFr ? 'Domicile' : 'Home Base',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Boire 300 ml d’eau fraîche avec une pincée de sel. Mise en route.'
          : 'Drink 300 ml fresh water with pinch of salt. Wake up and get ready.',
        iconName: 'AlarmClock',
      },
      {
        id: 'pre-ride-fuel',
        time: preRideMealTime,
        title: isFr ? 'Petit-déjeuner' : 'Breakfast',
        location: isFr ? 'Cuisine' : 'Kitchen Counter',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: isFasted
          ? isFr
            ? 'Hydratation légère (eau + café ou thé). Votre encas vous attend à l’arrivée.'
            : 'Light hydration (water + coffee or tea). Your breakfast awaits at arrival.'
          : isFr
          ? `${compliantPantry.preRide.nameFr} (${compliantPantry.preRide.portionLabelFr}) + café ou thé. Digestion matinale légère.`
          : `${compliantPantry.preRide.nameEn} (${compliantPantry.preRide.portionLabelEn}) + coffee or tea. Easy morning digestion.`,
        iconName: 'Utensils',
      },
      {
        id: 'garage-rollout',
        time: bikePrepTime,
        title: isFr ? 'Contrôle rapide du vélo' : 'Quick bike check',
        location: isFr ? 'Départ' : 'By the door',
        category: 'prep',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Vérifier pression des pneus, batteries feux/radar, bidons montés et badge d’accès.'
          : 'Verify tire pressure, battery status, bottles mounted, badge secured.',
        iconName: 'CheckCircle2',
      },
      {
        id: 'hard-departure',
        time: hardDepartureTime,
        title: isFr ? `Heure de départ : ${hardDepartureTime}` : `Time to go: ${hardDepartureTime}`,
        location: isFr ? 'Départ' : 'Start',
        category: 'ride',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Départ à l'allure cible (${route.targetSpeedKmH} km/h). Marge vent de face : +${weatherHeadwindImpactMinutes} min.`
          : `Roll out at target pace (${route.targetSpeedKmH} km/h). Headwind buffer: +${weatherHeadwindImpactMinutes} min.`,
        iconName: 'Navigation',
      },
      {
        id: 'estuary-transit',
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.45)),
        title: isFr ? 'Secteur Allure & Traversée Exposée' : 'Mid-Ride Pacing Sector',
        location: isFr ? 'Route Ouverte' : 'Open Road Sector',
        category: 'ride',
        isCrucialCheckpoint: false,
        description: weather.isHeadwindActive
          ? showWatts
            ? isFr
              ? `Vent de face détecté (${windKmh} km/h). Position basse sur les cocottes pour économiser ~${Math.round(windKmh * 3.5)} W.`
              : `Headwind detected (${windKmh} km/h). Tuck low on the hoods to save ~${Math.round(windKmh * 3.5)} W.`
            : isFr
            ? `Vent de face détecté (${windKmh} km/h). Position basse sur les cocottes pour protéger votre allure face au vent.`
            : `Headwind detected (${windKmh} km/h). Hold a low riding posture to save energy into the wind.`
          : isFr
          ? 'Vent calme sur le parcours. Cadence régulière (88–92 tr/min).'
          : 'Calm road conditions. Cruise at a steady cadence (88–92 RPM).',
        iconName: 'Wind',
      },
      {
        id: 'gate-security',
        time: gateTurnstileTime,
        title: isFr
          ? `Arrivée & stationnement vélo (${localizedGate})`
          : `Arrival & Bike Lockup (${localizedGate})`,
        location: localizedGate,
        category: 'transit',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Arrivée à ${localizedGate} et stationnement du vélo.`
          : `Arrive at ${localizedGate} and lock your bike.`,
        iconName: 'ShieldCheck',
      },
      {
        id: 'locker-refuel',
        time: gateArrivalAnchor,
        title: isFr ? 'Collation à l’arrivée' : 'Arrival snack',
        location: isFr ? 'À l’arrivée' : 'At work',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Collation rapide avant la douche.'
          : 'Quick snack before showering.',
        iconName: 'Zap',
      },
      {
        id: 'shower-groom',
        time: lockerRefuelEnd,
        title: isFr ? 'Douche & Tenue de Travail' : 'Shower & Clean Kit Change',
        location: isFr ? 'Douches' : 'Showers',
        category: 'office',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Douche et passage en tenue de bureau propre.'
          : 'Shower and swap into work attire.',
        iconName: 'ShowerHead',
      },
      {
        id: 'shift-start',
        time: resolvedShiftStartTime,
        title: isFr ? 'Au bureau / Prise de poste' : 'At work / Shift start',
        location: isFr ? 'Poste de Travail' : 'Work Desk',
        category: 'office',
        isCrucialCheckpoint: true,
        description: isFr
          ? 'Installation au poste à l’heure, ravitaillé et prêt pour la journée.'
          : 'Arrive composed, fully fueled, and ready for work.',
        iconName: 'Briefcase',
      },
    ];

    if (customChips.includes('coffee-stop')) {
      const cafeSnack = getCafeSnackSuggestion(specs.dietaryFilters || [], lang);
      steps.push({
        id: 'commute-coffee-pause',
        time: addMinutesToTime(hardDepartureTime, Math.max(10, Math.round(totalRideMinutes * 0.35))),
        title: isFr ? 'Pause Café & Ravitaillement Roaster' : 'Cafe Waypoint & Espresso Pause',
        location: isFr ? 'Café d’Étape' : 'Roastery Waypoint',
        category: 'nutrition',
        isCrucialCheckpoint: true,
        description: isFr
          ? `Pause café matinale planifiée (15 min). ${cafeSnack} avant la relance.`
          : `Scheduled 15-min morning coffee stop. ${cafeSnack} before rolling again.`,
        iconName: 'Coffee',
      });
    }

    if (customChips.includes('night-ride')) {
      const rolloutStep = steps.find((s) => s.id === 'garage-rollout');
      if (rolloutStep) {
        rolloutStep.title = isFr ? 'Sécurité Nocturne & Contrôle Phare 800+ lm' : 'Night Ride Prep & 800+ lm Check';
        rolloutStep.description = isFr
          ? 'Phare 800+ lumens vérifié en mode plein faisceau, baudrier rétro-réfléchissant ajusté et radar actif.'
          : '800+ lm headlight high-beam verified, hi-vis reflective sash adjusted, rear radar active.';
        rolloutStep.iconName = 'Moon';
      }
    }

    if (customChips.includes('fitness-boost')) {
      const transitStep = steps.find((s) => s.id === 'estuary-transit');
      if (transitStep) {
        transitStep.title = isFr ? 'Secteur Allure & Relais Cardio Tempo' : 'Tempo Cadence & Cardio Surge Sector';
        transitStep.description = showWatts
          ? isFr
            ? 'Relance en Zone 3 soutenue (~260W). Rythme cardio soutenu pour maximiser le bénéfice entraînement.'
            : 'Sustained Zone 3 tempo (~260W). High-output aerobic pacing to turn commute into a structured workout.'
          : isFr
          ? 'Relance soutenue en rythme tempo. Effort cardio régulier pour dynamiser le trajet.'
          : 'Sustained tempo effort. Steady aerobic pacing to turn your ride into an energizing workout.';
      }
    }

    if (customChips.includes('rush-hour-buffer')) {
      const gateStep = steps.find((s) => s.id === 'gate-security');
      if (gateStep) {
        gateStep.title = isFr ? `Arrivée Portillon avec Marge Heure de Pointe (${localizedGate})` : `Arrival with Peak Rush Buffer (${localizedGate})`;
        gateStep.description = isFr
          ? 'Franchissement sécurisé avec marge de +12 min pour parer aux goulets d’étranglement urbains.'
          : 'Arrival cushion with +12 min buffer factoring bridge bottlenecks and urban traffic.';
      }
    }

    if (customChips.includes('cargo-laptop-pack')) {
      const rolloutStep = steps.find((s) => s.id === 'garage-rollout');
      if (rolloutStep) {
        rolloutStep.description += isFr
          ? ' Ordinateur portable 15" rangé dans la sacoche étanche IPX6.'
          : ' 15" Work laptop secured in IPX6 waterproof pannier.';
      }
    }
  }

  // Inject Savory Palate Reset Milestones at 90-minute intervals on rides >= 2.5h (Phase 9)
  const enableSavory = specs.enableSavoryPalateResets !== false;
  const savoryCount =
    physicsSpeedOverride?.savoryResetCount !== undefined
      ? physicsSpeedOverride.savoryResetCount
      : enableSavory && totalRideMinutes >= 150
      ? Math.floor(totalRideMinutes / 90)
      : 0;

  if (savoryCount > 0 && totalRideMinutes >= 150) {
    for (let m = 90; m <= totalRideMinutes - 10; m += 90) {
      steps.push({
        id: `savory-palate-reset-${m}`,
        time: addMinutesToTime(hardDepartureTime, m),
        title: isFr ? `Pause salée (T + ${m} min)` : `Savory palate reset (T + ${m} min)`,
        location: isFr ? 'En selle' : 'On-bike',
        category: 'nutrition',
        isCrucialCheckpoint: false,
        description: isFr
          ? 'Pause salée : Alternez le sucré avec une collation salée + gorgée d’eau pure'
          : 'Savory palate reset: Swap sweet fuel for salted snack + plain water sip',
        iconName: 'Utensils',
      });
    }
  }

  // Inject intermediate stops between Point A and Point B (Configurator waypoints + Resupply Radar pins)
  const intermediateStops = buildIntermediateStopSteps(
    route,
    physicsSpeedOverride?.pinnedAmenities || [],
    hardDepartureTime,
    totalRideMinutes,
    isFr
  );
  if (intermediateStops.length > 0) {
    steps.push(...intermediateStops);
  }

  // Ensure steps are strictly ordered chronologically relative to wakeUpTime (midnight-wrap safe)
  const toMinutes = (hhmm: string) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const getStepSortRank = (step: TimelineStep): number => {
    if (ROLLOUT_STEP_PRIORITY_IDS.has(step.id)) return -1;
    if (ARRIVAL_STEP_PRIORITY_IDS.has(step.id)) return 1;
    return 0;
  };
  const anchorMinutes = toMinutes(wakeUpTime);
  steps.sort((a, b) => {
    const relA = (toMinutes(a.time) - anchorMinutes + 1440) % 1440;
    const relB = (toMinutes(b.time) - anchorMinutes + 1440) % 1440;
    if (relA !== relB) return relA - relB;
    return getStepSortRank(a) - getStepSortRank(b);
  });

  const totalDoorToDeskMinutes =
    60 + totalRideMinutes + routeBuffer + arrivalBuffer + extraBufferMinutes + postGateOfficeMinutes;

  return {
    shiftStartTime: resolvedShiftStartTime,
    gateArrivalTime: targetArrival,
    hardDepartureTime,
    preRideMealTime,
    wakeUpTime,
    totalDoorToDeskMinutes,
    pureMovingMinutes: actualMovingMinutes,
    bufferMinutes: routeBuffer + arrivalBuffer + extraBufferMinutes,
    steps,
    weatherHeadwindImpactMinutes,
  };
}
