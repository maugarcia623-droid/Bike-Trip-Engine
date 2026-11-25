import {
  PhysicsCalculationResult,
  TripProfile,
} from '../types/trip';
import { StageAmenity } from '../types/amenities';
import { BikeSpec, PressureUnit, RiderBikeSpecs, resolveBikeTireWidthMm } from '../types/specs';
import { Language } from '../context/LanguageContext';
import { getActiveBike, loadRiderBikeSpecs } from './specsStorage';
import { calculateTyrePressure, formatTyrePressurePair, TyrePressureResult } from './tyrePressure';
import { calculateHydrationPlan, calculateIntensityModulatedCarbTarget } from './nutrition';
import { getKitRecommendation, KitRecommendation } from './kitAdvisor';
import {
  calculateAmenityEta,
  calculateWaterGaps,
  getCachedScan,
  getRouteHashKey,
} from '../services/overpassCorridor';
import { evaluateOpeningHoursAtArrival } from './openingHours';
import { LoopDirectionComparison, RouteWeatherAnalysis } from '../services/routeWeatherService';
import { ReverseTimelineCalculation } from './timeline';
import { ChipTheme } from '../tokens/chipTokens';
import { getArchetypeFromTag, getPlannedRestStopMinutes } from './archetypeChips';
import { getStationaryRecoveryRuleForTrip } from './stationaryRecovery';
import { calculateRideVisibility } from './solarVisibility';
import { classifyRoadSurfaceCondition } from './physics';
import { degreesToCompassCardinal } from '../services/weatherService';
import { computeRideReadiness, RideReadiness } from './rideReadiness';
import { buildEffectiveChecklist } from './effectiveChecklist';
import { calculateTripWindInsight, HumanWindImpactResult } from './windInsights';

export type BriefProblemSeverity = 'critical' | 'warning' | 'info' | 'clear';

export interface RideBriefProblem {
  id: string;
  severity: BriefProblemSeverity;
  headline: string;
  detail: string;
  alternativeStop?: StageAmenity;
}

export type RideBriefPriorityIconKey =
  | 'lights'
  | 'blocker'
  | 'tyre'
  | 'wind'
  | 'rain'
  | 'sun'
  | 'fuel';

export interface RideBriefPriorityItem {
  id: string;
  theme: ChipTheme;
  iconKey: RideBriefPriorityIconKey;
  headline: string;
  detail: string;
}

export interface RideBriefData {
  verdict: 'GO' | 'CAUTION' | 'NO-GO';
  verdictReason: string;
  leaveByHHMM: string;
  arrivalHHMM: string;
  movingTimeFormatted: string;
  totalStopsMin: number;
  distanceKm: number;
  elevationGainM: number;
  departureDate?: string;
  bikeName: string;
  loopComparison?: LoopDirectionComparison;
  tyrePressure: TyrePressureResult;
  pressureUnit: PressureUnit;
  isTubeless: boolean;
  carbsPerHr: number;
  totalCarbsG: number;
  bottles: {
    carried: number;
    bidonSizeMl: number;
    refills: number;
    badgeLabel: string;
  };
  firstProblem: RideBriefProblem;
  secondaryProblems: RideBriefProblem[];
  kit: KitRecommendation;
  pinnedCount: number;
  scannedCount: number;
  archetypeLabel: string;
  leavePodLabel: string;
  targetContextLabel: string;
  headline: string;
  narrativeSummary: string;
  totalDurationFormatted: string;
  tempC: number;
  feelsLikeC: number;
  tireWidthMm: number;
  priorities: RideBriefPriorityItem[];
  blockerAlreadyFeatured: boolean;
  readiness: RideReadiness;
  /** Single quiet, context-triggered companion observation (never stacked) */
  companionNote?: {
    icon: 'wind' | 'flame' | 'thermometer' | 'compass';
    text: string;
  };
  windInsight?: HumanWindImpactResult;
}

function formatTotalBriefDuration(totalMinutes: number, stopsMin: number, isFr: boolean): string {
  const safeMinutes = Math.max(1, Math.round(totalMinutes));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  const base = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  if (stopsMin > 0) {
    return isFr ? `${base} arrêts inclus` : `${base} incl. stops`;
  }
  return isFr ? `${base} de selle` : `${base} saddle`;
}

function buildRideBriefCardMeta(input: {
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  timeline: ReverseTimelineCalculation;
  activeBike: BikeSpec;
  departureDate?: string;
  totalDistanceKm: number;
  tyrePressure: TyrePressureResult;
  pressureUnit?: PressureUnit;
  carbsPerHr: number;
  totalCarbsG: number;
  bottlesBadge: string;
  kit: KitRecommendation;
  firstProblem: RideBriefProblem;
  sectorForecast?: RouteWeatherAnalysis | null;
  finalVerdict: 'GO' | 'CAUTION' | 'NO-GO';
  lang: Language;
  telemetryMode?: RiderBikeSpecs['telemetryMode'];
  showWatts?: boolean;
  windInsight: HumanWindImpactResult;
  totalSweatLiters: number;
  vis?: ReturnType<typeof calculateRideVisibility>;
  readiness?: RideReadiness;
}): Pick<
  RideBriefData,
  | 'archetypeLabel'
  | 'leavePodLabel'
  | 'targetContextLabel'
  | 'headline'
  | 'narrativeSummary'
  | 'totalDurationFormatted'
  | 'tempC'
  | 'feelsLikeC'
  | 'tireWidthMm'
  | 'priorities'
  | 'blockerAlreadyFeatured'
  | 'companionNote'
> {
  const {
    trip,
    physics,
    timeline,
    activeBike,
    departureDate,
    totalDistanceKm,
    tyrePressure,
    pressureUnit = 'bar',
    carbsPerHr,
    totalCarbsG,
    bottlesBadge,
    kit,
    firstProblem,
    sectorForecast,
    finalVerdict,
    lang,
    telemetryMode,
    showWatts = false,
    windInsight,
    totalSweatLiters,
    readiness,
  } = input;

  const isFr = lang === 'fr';
  const archMode = getArchetypeFromTag(trip.tag, trip.name);
  const archetypeLabel =
    archMode === 'SPORT'
      ? 'Sport'
      : archMode === 'BIKEPACKING'
      ? 'Bikepacking'
      : archMode === 'ESCAPADE'
      ? 'Escapade'
      : isFr
      ? 'Vélotaf'
      : 'Commute';

  const archWordEn =
    archMode === 'SPORT'
      ? 'sport ride'
      : archMode === 'BIKEPACKING'
      ? 'stage'
      : archMode === 'ESCAPADE'
      ? 'escapade'
      : 'commute';
  const archWordFr =
    archMode === 'SPORT'
      ? 'sortie sport'
      : archMode === 'BIKEPACKING'
      ? 'étape'
      : archMode === 'ESCAPADE'
      ? 'escapade'
      : 'trajet vélotaf';

  const stopsMin = timeline.bufferMinutes ?? 0;
  const totalMinutes = Math.max(1, Math.round((timeline.pureMovingMinutes || 0) + stopsMin));
  const totalDurationFormatted = formatTotalBriefDuration(totalMinutes, stopsMin, isFr);

  const isDepartAt = trip.arriveAtMode === false && Boolean(trip.departureTime);
  const leavePodLabel = isDepartAt
    ? isFr
      ? 'Départ prévu'
      : 'Start time'
    : isFr
    ? 'Départ limite'
    : 'Leave by';

  const targetContextLabel = isDepartAt
    ? isFr
      ? `Fin estimée ${timeline.gateArrivalTime}`
      : `Est. ${timeline.gateArrivalTime} finish`
    : archMode === 'COMMUTE'
    ? isFr
      ? `Pour ton arrivée à ${timeline.shiftStartTime}`
      : `For your ${timeline.shiftStartTime} start`
    : isFr
    ? `Pour arriver vers ${timeline.gateArrivalTime}`
    : `For ${timeline.gateArrivalTime} finish`;

  const distRounded =
    totalDistanceKm >= 100
      ? `${Math.round(totalDistanceKm)}`
      : Number(totalDistanceKm.toFixed(1)).toString();
  const tempC = Math.round(trip.weather.temperatureC ?? 14);
  const feelsLikeC = Math.round(kit.feelsLikeC ?? tempC);
  const baseWind = Math.round(trip.weather.baseWindSpeedKmH ?? 0);
  const gusts = Math.round(trip.weather.estuaryGustKmH ?? Math.round(baseWind * 1.4));
  const rainRisk = Math.round(trip.weather.precipitationRiskPercent ?? 0);
  const windCardinal = degreesToCompassCardinal(trip.weather.windDirectionDegrees ?? 245, isFr ? 'fr' : 'en');
  const tireWidthMm = resolveBikeTireWidthMm(activeBike);

  const gravelPct =
    trip.route?.terrainSummary?.surfaceBreakdown?.gravelPct ??
    trip.route?.terrainSummary?.gravelPct ??
    0;
  const singletrackPct =
    trip.route?.terrainSummary?.surfaceBreakdown?.singletrackPct ??
    trip.route?.terrainSummary?.singletrackPct ??
    0;
  const unpavedPct = Math.round(gravelPct + singletrackPct);

  const vis =
    input.vis ??
    calculateRideVisibility(trip, departureDate, timeline.hardDepartureTime, physics.effectiveSpeedKmH);
  const daylightMin = Math.max(0, Math.round((vis.daylightPercent / 100) * vis.movingMinutes));
  const lumensCompact = vis.lightingGear.recommendedLumens.replace(' – ', '–');

  const loopComp = sectorForecast?.loopComparison;
  const hasRecommendedLoopFlip = Boolean(
    loopComp?.isLoop && loopComp.recommendedDirection === 'reverse' && loopComp.minutesSaved >= 2
  );
  const effectiveHeadwind = Math.round(
    trip.weather.effectiveHeadwindKmH ?? (trip.weather.isHeadwindActive ? baseWind : 0)
  );
  const isHeadwindHard = effectiveHeadwind >= 18 || (physics.windDelayMinutes ?? 0) >= 6;
  const isLongRide = totalDistanceKm >= 55 || (timeline.pureMovingMinutes || 0) >= 150;
  const isTailwind = trip.weather.windDirection === 'tailwind' && baseWind >= 12;

  // Warm, grounded companion headline & 1-sentence guidance (EN & natural French `tu`)
  let headline =
    vis.daylightPercent === 0
      ? isFr
        ? 'Allume tes feux et roule tranquille.'
        : 'Lights on. Easy, steady ride.'
      : readiness?.level === 'needs-change'
      ? isFr
        ? 'Un petit ajustement avant de partir.'
        : 'Worth a quick tweak before you roll.'
      : readiness?.level === 'worth-tweak'
      ? isFr
        ? 'Presque prêt — jette un œil aux points clés.'
        : 'Almost set — check the flags below.'
      : isFr
      ? 'Feu vert, bonne route.'
      : 'Good to roll.';
  const pressureFormatted = formatTyrePressurePair(
    tyrePressure.frontBar,
    tyrePressure.rearBar,
    pressureUnit,
    lang
  );
  const pressureSpacedFormatted = pressureFormatted.replace('/', ' / ');
  const wattsTail = showWatts
    ? ` · ~${Math.round(physics.legWatts)} W (${physics.powerZone})`
    : '';
  let narrativeSummary = isFr
    ? `Tes ${distRounded} km sur ${activeBike.name} s’annoncent simples — gonfle à ${pressureFormatted} et profite${wattsTail}.`
    : `${distRounded} km on ${activeBike.name} looks straightforward — set ${pressureFormatted} and enjoy the ride${wattsTail}.`;

  if (finalVerdict === 'NO-GO') {
    headline = isFr ? 'Mieux vaut reporter ou adapter.' : 'Best to wait or adjust.';
    narrativeSummary = isFr
      ? `Conditions rudes sur ce parcours de ${distRounded} km — vérifie les rafales et l’adhérence avant de partir.`
      : `Rough conditions on this ${distRounded} km ${archWordEn} — check the gusts and road grip before rolling out.`;
  } else if (hasRecommendedLoopFlip && loopComp) {
    const reverseOrientation =
      loopComp.forwardOrientation === 'anticlockwise' ? 'clockwise' : 'anticlockwise';
    const orientationLabelFr =
      reverseOrientation === 'clockwise' ? 'sens horaire' : 'sens antihoraire';
    const orientationLabelEn =
      reverseOrientation === 'clockwise' ? 'clockwise' : 'counter-clockwise';
    headline = isFr
      ? `Inverse la boucle, gagne ${loopComp.minutesSaved} min.`
      : `Flip the loop. Save ${loopComp.minutesSaved} min.`;
    narrativeSummary = isFr
      ? `Partir dans le ${orientationLabelFr} met le vent ${windCardinal} dans ton dos pour rentrer plus léger${wattsTail}.`
      : `Riding ${orientationLabelEn} puts the ${windCardinal} wind behind you on the way back for a smoother finish${wattsTail}.`;
  } else if (archMode === 'COMMUTE' && (vis.nightPercent >= 40 || isLongRide)) {
    headline = isFr ? 'Pars tranquille.' : 'Give yourself an easy start.';
    narrativeSummary = isFr
      ? `Un vélotaf de ${distRounded} km, c’est déjà une vraie sortie — cale un rythme confortable pour arriver frais${wattsTail}.`
      : `A ${distRounded} km commute is a proper ride — settle into a comfortable rhythm and save your legs for the day${wattsTail}.`;
  } else if (isLongRide) {
    headline = isFr ? 'Gère la première moitié.' : 'Pace easy early, finish strong.';
    narrativeSummary = isFr
      ? `${distRounded} km sur ${activeBike.name}, c’est une belle virée — mange tôt et garde de la réserve sur les premiers kilomètres${wattsTail}.`
      : `${distRounded} km on ${activeBike.name} is a proper day out — eat early and keep the first half relaxed${wattsTail}.`;
  } else if (isHeadwindHard) {
    const gradeLabel =
      windInsight.equivalentGradePct >= 0.5
        ? isFr
          ? `transforme le plat en côte à +${windInsight.equivalentGradePct.toFixed(1)} %`
          : `makes the flats feel like a +${windInsight.equivalentGradePct.toFixed(1)}% climb`
        : isFr
        ? `ajoute ~${Math.round(physics.windDelayMinutes)} min si tu forces`
        : `adds ~${Math.round(physics.windDelayMinutes)} min if you fight it`;
    headline = isFr ? 'Roule souple face au vent.' : 'Steady effort into the breeze.';
    narrativeSummary = isFr
      ? `Un vent ${windCardinal} de ${baseWind} km/h ${gradeLabel} — garde un coup de pédale fluide au lieu de courir après la moyenne${wattsTail}.`
      : `A ${baseWind} km/h ${windCardinal} breeze ${gradeLabel} — spin smooth instead of chasing your usual speed${wattsTail}.`;
  } else if (unpavedPct >= 30) {
    headline = isFr ? 'Pression souple pour le gravel.' : 'Softer tyres, smoother gravel.';
    narrativeSummary = isFr
      ? `Avec ${unpavedPct} % de chemins sur ${distRounded} km, ${pressureFormatted} sur ${activeBike.name} te garde du grip et du confort.`
      : `With ${unpavedPct}% unpaved roads across ${distRounded} km, ${pressureFormatted} on ${activeBike.name} keeps steering planted and takes the buzz out of your hands.`;
  } else if (isTailwind) {
    headline = isFr ? 'Joli vent dans le dos.' : 'Nice breeze at your back.';
    narrativeSummary = isFr
      ? `Le vent ${windCardinal} pousse tes ${distRounded} km sur ${activeBike.name} — profite de l’élan gratuit.`
      : `A supportive ${windCardinal} tailwind helps carry your ${distRounded} km ${archWordEn} on ${activeBike.name} — enjoy the free speed.`;
  }

  // Single, quiet "Reality check" companion note — picks at most ONE genuinely meaningful observation
  const realElevM = Math.round(trip.route?.elevationGainM || 0);
  const totalKcal = Math.round(physics.totalKcalBurn || 0);
  const croissantsEquiv = Number((totalKcal / 260).toFixed(1));
  const croissantLabel = `croissant${croissantsEquiv >= 1.5 ? 's' : ''}`;
  const chillDropC = Math.max(0, tempC - feelsLikeC);

  let companionNote: RideBriefData['companionNote'] = undefined;
  if (windInsight.ghostElevationM >= 150 && !hasRecommendedLoopFlip) {
    companionNote = {
      icon: 'wind',
      text: isFr
        ? `Vrai dénivelé : ${realElevM} m · Le vent ajoute +${windInsight.ghostElevationM} m de montée invisible${windInsight.iconicClimbComparison ? ` (${windInsight.iconicClimbComparison})` : ''}.`
        : `Real climbing: ${realElevM} m · Wind adds +${windInsight.ghostElevationM} m of invisible climbing${windInsight.iconicClimbComparison ? ` (${windInsight.iconicClimbComparison})` : ''}.`,
    };
  } else if (totalKcal >= 850 || totalSweatLiters >= 1.3) {
    companionNote = {
      icon: 'flame',
      text: isFr
        ? `Environ ${totalKcal.toLocaleString('fr-FR')} kcal brûlées (≈ ${croissantsEquiv} ${croissantLabel}) et ~${totalSweatLiters} L de sueur — pense à boire régulièrement.`
        : `Around ${totalKcal.toLocaleString('en-US')} kcal burned (≈ ${croissantsEquiv} ${croissantLabel}) and ~${totalSweatLiters} L of sweat — keep sipping steadily.`,
    };
  } else if (chillDropC >= 3 && feelsLikeC <= 12) {
    companionNote = {
      icon: 'thermometer',
      text: isFr
        ? `${tempC} °C devant la porte, ${feelsLikeC} °C une fois lancé — une couche de plus aide bien sur les 20 premières minutes.`
        : `${tempC}°C at the front door, ${feelsLikeC}°C once you’re rolling — an extra layer helps for the first 20 minutes.`,
    };
  } else if (windInsight.ghostElevationM <= -150) {
    companionNote = {
      icon: 'compass',
      text: isFr
        ? `Le vent de dos aujourd’hui t’offre l’équivalent de ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite sur le parcours.`
        : `Today’s tailwind gives you the equivalent of ${Math.abs(windInsight.ghostElevationM)} m of free downhill across the ride.`,
    };
  }

  // Priority #1: Darkness / Critical route problem / Low-light / Tyre Pressure
  let priority1: RideBriefPriorityItem;
  let blockerAlreadyFeatured = false;
  const hasUrgentProblem =
    firstProblem.severity === 'critical' ||
    (firstProblem.severity === 'warning' &&
      (firstProblem.id === 'cafe-closed' || firstProblem.id === 'water-gap'));

  if (vis.nightPercent >= 60) {
    priority1 = {
      id: 'visibility-night',
      theme: 'purple',
      iconKey: 'lights',
      headline: isFr ? 'Éclairage requis sur tout le trajet' : 'Lights on for the whole ride',
      detail: isFr
        ? `${daylightMin} min de jour · Phare ${lumensCompact}`
        : `${daylightMin} min daylight · Bring a ${lumensCompact} light`,
    };
  } else if (hasUrgentProblem) {
    blockerAlreadyFeatured = true;
    priority1 = {
      id: `blocker-${firstProblem.id}`,
      theme: firstProblem.severity === 'critical' ? 'rose' : 'amber',
      iconKey: 'blocker',
      headline: firstProblem.headline,
      detail: firstProblem.detail,
    };
  } else if (
    vis.nightPercent > 0 ||
    vis.twilightPercent >= 25 ||
    vis.opticalHazardLevel === 'critical' ||
    vis.opticalHazardLevel === 'elevated'
  ) {
    const lowLightPct = Math.min(100, Math.round(vis.nightPercent + vis.twilightPercent));
    priority1 = {
      id: 'visibility-twilight',
      theme: 'amber',
      iconKey: 'lights',
      headline: isFr ? 'Passages à faible luminosité' : 'Low-light sections ahead',
      detail: isFr
        ? `${lowLightPct}% pénombre · Optiques ${lumensCompact}`
        : `${lowLightPct}% twilight/dark · Pack ${lumensCompact} optics`,
    };
  } else {
    priority1 = {
      id: 'tyre-pressure',
      theme: 'sky',
      iconKey: 'tyre',
      headline: isFr
        ? `Pneus : ${pressureSpacedFormatted}`
        : `Tyres: ${pressureSpacedFormatted}`,
      detail: isFr
        ? `${tireWidthMm} mm ${activeBike.isTubeless ? 'tubeless' : 'chambre'}${unpavedPct > 0 ? ` · ${unpavedPct}% chemins` : ' · 15% déflexion'}`
        : `${tireWidthMm} mm ${activeBike.isTubeless ? 'tubeless' : 'tubes'}${unpavedPct > 0 ? ` · ${unpavedPct}% unpaved` : ' · 15% drop'}`,
    };
  }

  // Priority #2: Weather / Gusts / Rain & Clothing
  let priority2: RideBriefPriorityItem;
  if (rainRisk >= 35) {
    priority2 = {
      id: 'weather-rain',
      theme: 'blue',
      iconKey: 'rain',
      headline: isFr
        ? `Pluie ${rainRisk}%${gusts >= 30 ? ` · rafales ${gusts} km/h` : ''}`
        : `Rain risk ${rainRisk}%${gusts >= 30 ? ` · ${gusts} km/h gusts` : ''}`,
      detail: isFr
        ? `Vent ${windCardinal} · ${kit.tierBadge} + ${kit.upperBody}`
        : `Wind from ${windCardinal} · ${kit.tierBadge} + ${kit.upperBody}`,
    };
  } else if (gusts >= 28 || baseWind >= 18) {
    priority2 = {
      id: 'weather-gusts',
      theme: 'teal',
      iconKey: 'wind',
      headline: isFr ? `Rafales jusqu'à ${gusts} km/h` : `Gusts reach ${gusts} km/h`,
      detail: isFr
        ? `Vent ${windCardinal} · Reste souple en zone exposée`
        : `Wind from ${windCardinal} · Stay steady in exposed sections`,
    };
  } else {
    const roadCondition = classifyRoadSurfaceCondition(trip.weather);
    const roadSurfaceTextFr =
      rainRisk > 15
        ? `Pluie ${rainRisk}%`
        : roadCondition === 'wet'
        ? 'Routes mouillées'
        : roadCondition === 'damp'
        ? 'Chaussée humide'
        : 'Routes sèches';
    const roadSurfaceTextEn =
      rainRisk > 15
        ? `${rainRisk}% rain`
        : roadCondition === 'wet'
        ? 'Wet roads'
        : roadCondition === 'damp'
        ? 'Damp roads'
        : 'Dry roads';
    priority2 = {
      id: 'weather-calm',
      theme: kit.tierTheme,
      iconKey: 'sun',
      headline: isFr ? `Ciel calme · ${kit.tierBadge}` : `Calm skies · ${kit.tierBadge}`,
      detail: isFr
        ? `Vent ${windCardinal} ${baseWind} km/h · Ressenti ${feelsLikeC}°C · ${roadSurfaceTextFr}`
        : `Wind ${windCardinal} ${baseWind} km/h · Feels like ${feelsLikeC}°C · ${roadSurfaceTextEn}`,
    };
  }

  // Priority #3: Fueling & Hydration
  const isIntuitiveFuel = telemetryMode === 'intuitive';
  const isFuelFirstUnits = telemetryMode === 'fuel-first';
  const fuelUnitsPerHr = Math.max(1, Math.round(carbsPerHr / 20));
  const priority3: RideBriefPriorityItem =
    carbsPerHr > 0
      ? {
          id: 'fuel-hydration',
          theme: 'orange',
          iconKey: 'fuel',
          headline: isIntuitiveFuel
            ? isFr
              ? 'Gorgée & bouchée toutes les 20 min'
              : 'Sip & bite every 20 min'
            : isFuelFirstUnits
            ? isFr
              ? `~${fuelUnitsPerHr} en-cas / h`
              : `~${fuelUnitsPerHr} snacks / hr`
            : isFr
            ? `Ravito régulier : ${carbsPerHr} g/h`
            : `Fuel regularly: ${carbsPerHr} g carbs/h`,
          detail:
            !isIntuitiveFuel && !isFuelFirstUnits && totalCarbsG > 0
              ? isFr
                ? `${bottlesBadge} · ${totalCarbsG} g au total`
                : `${bottlesBadge} · ${totalCarbsG} g total`
              : bottlesBadge,
        }
      : {
          id: 'fuel-hydration',
          theme: 'orange',
          iconKey: 'fuel',
          headline: isFr
            ? 'Hydrate-toi · Pas besoin de glucides en plus'
            : 'Stay hydrated · No extra carbs needed',
          detail: isFr
            ? `${bottlesBadge} · Ton repas d’avant départ suffit`
            : `${bottlesBadge} · Pre-ride fuel covers energy`,
        };

  return {
    archetypeLabel,
    leavePodLabel,
    targetContextLabel,
    headline,
    narrativeSummary,
    totalDurationFormatted,
    tempC,
    feelsLikeC,
    tireWidthMm,
    priorities: [priority1, priority2, priority3],
    blockerAlreadyFeatured,
    companionNote,
  };
}

function detectRouteProblems(params: {
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  leaveByHHMM: string;
  pinnedAmenities: StageAmenity[];
  corridorAmenities: StageAmenity[];
  hasWaterScan: boolean;
  bidonSizeMl: number;
  frameBottleSlots: number;
  targetFluidMlPerHr: number;
  sectorForecast?: RouteWeatherAnalysis | null;
  lang: Language;
}): { firstProblem: RideBriefProblem; secondaryProblems: RideBriefProblem[] } {
  const {
    trip,
    physics,
    leaveByHHMM,
    pinnedAmenities,
    corridorAmenities,
    hasWaterScan,
    bidonSizeMl,
    frameBottleSlots,
    targetFluidMlPerHr,
    sectorForecast,
    lang,
  } = params;
  const isFr = lang === 'fr';
  const totalKm = trip.route?.distanceKm || 30;
  const speedKmH = physics.effectiveSpeedKmH || trip.route?.targetSpeedKmH || 24;
  const targetDate = trip.stages?.[trip.activeStageIndex ?? 0]?.departureDate || trip.departureDate;

  const problems: RideBriefProblem[] = [];

  // Pool of unique stops (pinned + scanned)
  const poolMap = new Map<string, StageAmenity>();
  for (const p of pinnedAmenities) poolMap.set(p.id, p);
  for (const a of corridorAmenities) if (!poolMap.has(a.id)) poolMap.set(a.id, a);
  const allStops = Array.from(poolMap.values()).sort((a, b) => a.routeKm - b.routeKm);

  // 1. Check pinned stops (or key mid-route food stop) for closed-on-arrival conflicts
  const stopsToAudit =
    pinnedAmenities.length > 0
      ? pinnedAmenities
      : corridorAmenities.filter((a) => a.category === 'food').slice(0, 3);

  for (const stop of stopsToAudit) {
    if (!stop.openingHours) continue;
    const eta = calculateAmenityEta(leaveByHHMM, stop.routeKm, speedKmH);
    const verdict = evaluateOpeningHoursAtArrival(stop.openingHours, targetDate, eta, lang);
    if (!verdict || (verdict.status !== 'closed' && verdict.status !== 'closing-soon')) {
      continue;
    }

    // Find nearest open alternative of same category (or food) by distance along route
    const openAlt = allStops
      .filter((cand) => {
        if (cand.id === stop.id) return false;
        if (cand.category !== stop.category && !(stop.category === 'food' && cand.category === 'essentials')) {
          return false;
        }
        if (!cand.openingHours) return false;
        const candEta = calculateAmenityEta(leaveByHHMM, cand.routeKm, speedKmH);
        const candVerdict = evaluateOpeningHoursAtArrival(cand.openingHours, targetDate, candEta, lang);
        return candVerdict?.status === 'open';
      })
      .sort((a, b) => Math.abs(a.routeKm - stop.routeKm) - Math.abs(b.routeKm - stop.routeKm))[0];

    const altEta = openAlt ? calculateAmenityEta(leaveByHHMM, openAlt.routeKm, speedKmH) : null;
    const isClosed = verdict.status === 'closed';

    const headline = openAlt
      ? isFr
        ? `${stop.name} ${isClosed ? 'fermé' : 'ferme bientôt'} à ${eta} (km ${stop.routeKm}) → ouvert le plus proche : ${openAlt.name} au km ${openAlt.routeKm}`
        : `${stop.name} ${isClosed ? 'closed' : 'closing soon'} at ${eta} (km ${stop.routeKm}) → nearest open: ${openAlt.name} at km ${openAlt.routeKm}`
      : isFr
      ? `${stop.name} ${isClosed ? 'fermé' : 'ferme bientôt'} à ton passage (${eta}, km ${stop.routeKm})`
      : `${stop.name} ${isClosed ? 'closed' : 'closing soon'} at arrival (${eta}, km ${stop.routeKm})`;

    const detail = openAlt && altEta
      ? isFr
        ? `${openAlt.name} est ouvert à ${altEta} (${openAlt.detourMeters < 75 ? 'sur la trace' : `+${openAlt.detourMeters} m`}). Horaires initiaux : ${stop.openingHours}.`
        : `${openAlt.name} is open at ${altEta} (${openAlt.detourMeters < 75 ? 'on route' : `+${openAlt.detourMeters} m detour`}). Listed hours: ${stop.openingHours}.`
      : verdict.detailLabel;

    problems.push({
      id: `closed-${stop.id}`,
      severity: isClosed ? 'critical' : 'warning',
      headline,
      detail,
      alternativeStop: openAlt,
    });
    break; // Highlight first stop conflict cleanly
  }

  // 2. Check corridor water gaps (ONLY when an Overpass scan has actually run)
  if (hasWaterScan) {
    const gaps = calculateWaterGaps(allStops, totalKm, {
      sectorSpeedKmH: speedKmH,
      targetFluidMlPerHr,
      bidonSizeMl,
      frameBottleSlots,
    });

    if (gaps.status === 'critical' && gaps.criticalGaps[0]) {
      const g = gaps.criticalGaps[0];
      problems.push({
        id: 'water-gap-critical',
        severity: 'critical',
        headline: isFr
          ? `Trou d’eau critique km ${g.startKm}–${g.endKm} (${g.distanceKm} km · ${g.depletionPct ?? 100}% d’autonomie)`
          : `Critical water gap km ${g.startKm}–${g.endKm} (${g.distanceKm} km · ${g.depletionPct ?? 100}% depletion)`,
        detail: isFr
          ? `Besoin estimé ${g.gapFluidNeedMl ?? 0} ml pour ${g.onboardCapacityMl ?? frameBottleSlots * bidonSizeMl} ml sur le cadre — prévois un bidon de plus ou une pause eau.`
          : `Estimated need ${g.gapFluidNeedMl ?? 0} ml vs ${g.onboardCapacityMl ?? frameBottleSlots * bidonSizeMl} ml on frame — pack an extra bottle or detour for water.`,
      });
    } else if (gaps.status === 'caution' && gaps.cautionGaps[0]) {
      const g = gaps.cautionGaps[0];
      problems.push({
        id: 'water-gap-caution',
        severity: 'warning',
        headline: isFr
          ? `Long secteur sans eau km ${g.startKm}–${g.endKm} (${g.distanceKm} km)`
          : `Long dry stretch km ${g.startKm}–${g.endKm} (${g.distanceKm} km)`,
        detail: isFr
          ? `Consomme ~${g.depletionPct ?? 70} % de tes bidons — remplis avant le km ${g.startKm}.`
          : `Uses ~${g.depletionPct ?? 70}% of bottle capacity — top up before km ${g.startKm}.`,
      });
    }
  }

  // 3. Sector headwind / aero tax or overall wind tax
  const worstWindSector =
    sectorForecast?.sectors && sectorForecast.sectors.length > 0
      ? sectorForecast.sectors.reduce(
          (maxS, s) => (s.effectiveHeadwindKmH > maxS.effectiveHeadwindKmH ? s : maxS),
          sectorForecast.sectors[0]
        )
      : undefined;
  if (worstWindSector && worstWindSector.effectiveHeadwindKmH >= 18) {
    problems.push({
      id: 'sector-headwind',
      severity: worstWindSector.effectiveHeadwindKmH >= 28 ? 'critical' : 'warning',
      headline: isFr
        ? `Gros vent de face km ${worstWindSector.startKm}–${worstWindSector.endKm} (${Math.round(worstWindSector.effectiveHeadwindKmH)} km/h)`
        : `Heavy headwind km ${worstWindSector.startKm}–${worstWindSector.endKm} (${Math.round(worstWindSector.effectiveHeadwindKmH)} km/h)`,
      detail: isFr
        ? `Le vent ajoute environ +${Math.round(physics.windDelayMinutes)} min vers ${worstWindSector.etaHHMM} — garde un peu d’énergie avant ce tronçon.`
        : `Wind adds around +${Math.round(physics.windDelayMinutes)} min around ${worstWindSector.etaHHMM} — save a bit of energy before this stretch.`,
    });
  } else if (physics.powerDeltaWatts >= 20 && physics.windDelayMinutes >= 5) {
    problems.push({
      id: 'wind-tax',
      severity: physics.windDelayMinutes >= 12 ? 'warning' : 'info',
      headline: isFr
        ? `Le vent ralentit la sortie d’environ +${Math.round(physics.windDelayMinutes)} min`
        : `Wind slows this ride by about +${Math.round(physics.windDelayMinutes)} min`,
      detail: isFr
        ? `Mieux vaut rouler aux sensations qu’en chassant ta vitesse moyenne habituelle.`
        : `Better to ride by feel than chase your usual average speed.`,
    });
  }

  // 4. High rain risk on worst sector or forecast
  const maxRain = Math.max(
    trip.weather?.precipitationRiskPercent ?? 0,
    sectorForecast?.worstCaseWeather?.precipitationRiskPercent ?? 0
  );
  if (maxRain >= 50) {
    problems.push({
      id: 'rain-risk',
      severity: maxRain >= 75 ? 'warning' : 'info',
      headline: isFr
        ? `Pluie probable (${Math.round(maxRain)} %) — routes humides`
        : `Rain likely (${Math.round(maxRain)}%) — expect wet roads`,
      detail: isFr
        ? 'Prends un coupe-pluie, des verres clairs et retire 0,2 bar pour garder du grip.'
        : 'Pack a rain shell, clear lenses, and drop 0.2 bar for extra cornering grip.',
    });
  }

  if (problems.length === 0) {
    const noCorridorScan = corridorAmenities.length === 0 && Boolean(trip.route?.coordinates?.length);
    return {
      firstProblem: {
        id: 'all-clear',
        severity: 'clear',
        headline: isFr
          ? 'Rien à signaler sur la trace ni côté météo'
          : 'All clear across weather, pace, and stops',
        detail: noCorridorScan
          ? isFr
            ? 'Astuce : ouvre l’onglet Ravitaillement pour vérifier les fontaines et les boulangeries ouvertes.'
            : 'Tip: open the Resupply tab to check live water stops and bakery opening hours.'
          : isFr
          ? `${pinnedAmenities.length} arrêt(s) épinglé(s) vérifié(s) pour ton passage.`
          : `${pinnedAmenities.length} pinned stop(s) verified against your arrival window.`,
      },
      secondaryProblems: [],
    };
  }

  // Sort critical before warning before info
  const rank = { critical: 0, warning: 1, info: 2, clear: 3 };
  problems.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    firstProblem: problems[0],
    secondaryProblems: problems.slice(1, 3),
  };
}

export function buildRideBrief(params: {
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  timeline: ReverseTimelineCalculation;
  riderSpecs?: RiderBikeSpecs;
  sectorForecast?: RouteWeatherAnalysis | null;
  amenities?: StageAmenity[];
  lang?: Language;
}): RideBriefData {
  const {
    trip,
    physics,
    timeline,
    riderSpecs: specsArg,
    sectorForecast,
    amenities: passedAmenities,
    lang = 'en',
  } = params;

  const riderSpecs = specsArg || loadRiderBikeSpecs();
  const activeBike = getActiveBike(riderSpecs);
  const pinnedAmenities = trip.pinnedAmenities || [];

  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const stageId = activeStage?.id || trip.id;
  const coords = trip.route?.coordinates || [];
  const totalDistanceKm = trip.route?.distanceKm || 30;
  const rawCachedScan =
    coords.length >= 2
      ? getCachedScan(getRouteHashKey(coords, stageId, totalDistanceKm))
      : undefined;
  const hasWaterScan = Boolean(
    (passedAmenities && passedAmenities.length > 0) || Array.isArray(rawCachedScan)
  );
  const cachedScan =
    passedAmenities && passedAmenities.length > 0
      ? passedAmenities
      : rawCachedScan ?? [];

  // 1. Tyre Pressure (continuous 15%-drop model)
  const bikeTireWidthMm = resolveBikeTireWidthMm(activeBike);
  const sb = trip.route?.terrainSummary?.surfaceBreakdown;
  const pavedPct = sb?.pavedPct ?? (bikeTireWidthMm >= 34 ? 55 : 95);
  const gravelPct = sb?.gravelPct ?? (bikeTireWidthMm >= 34 ? 40 : 5);
  const singletrackPct = sb?.singletrackPct ?? (bikeTireWidthMm >= 42 ? 5 : 0);
  const gearKg = trip.physics?.luggageWeightKg ?? trip.physics?.gearWeightKg ?? 1.5;

  const tyrePressure = calculateTyrePressure({
    systemMassKg:
      (riderSpecs.riderWeightKg || trip.physics.riderWeightKg || 75) +
      (activeBike.weightKg || trip.physics.bikeWeightKg || 10) +
      gearKg,
    tireWidthMm: bikeTireWidthMm,
    isTubeless: activeBike.isTubeless,
    pavedPct,
    gravelPct,
    singletrackPct,
    gearWeightKg: gearKg,
    bikeCategory: activeBike.bikeCategory,
    casingType: activeBike.casingType,
    isHookless: activeBike.isHookless,
    bikeName: activeBike.name,
  });

  // 2. Carbs / hour & hydration
  const movingHours = Math.max(0.25, (physics.movingTimeSeconds || 3600) / 3600);
  const carbTarget = riderSpecs.carbTargetGPerHr ?? 60;
  const pctFtp = physics.ftpPercent ?? 72;
  const dynamicCarb = calculateIntensityModulatedCarbTarget({
    rideHours: movingHours,
    pctFtp,
    carbOxidationGramPerHour:
      physics.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
    gutCeilingGPerHr: carbTarget,
    totalDays: trip.stages?.length || 1,
    activeChips: trip.customChips || [],
  });
  const isLockedCarb =
    riderSpecs?.carbPacingMode === 'locked' ||
    (riderSpecs?.riderLevel === 'pro' && carbTarget >= 60);
  const carbsPerHr = isLockedCarb
    ? dynamicCarb.effectiveCeilingGPerHr
    : dynamicCarb.recommendedGPerHr;
  const totalCarbsG = isLockedCarb
    ? Math.round(carbsPerHr * Math.max(0.5, movingHours))
    : dynamicCarb.targetOnBikeCarbsG;

  const bidonSizeMl = riderSpecs.bidonSizeMl ?? 650;
  const frameBottleSlots = riderSpecs.frameBottleSlots ?? 2;
  const isShortRide = movingHours < 0.75 && (trip.stages?.length || 1) === 1;
  const hydration = calculateHydrationPlan({
    rideHours: movingHours,
    tempC: sectorForecast?.worstCaseWeather?.temperatureC ?? trip.weather?.temperatureC ?? 18,
    legWatts: physics.legWatts,
    bidonSizeMl,
    frameBottleSlots,
    isShortRide,
    activeChips: trip.customChips || [],
  });

  const isFr = lang === 'fr';
  const bottlesBadge =
    hydration.plannedRefillBidons > 0
      ? isFr
        ? `${hydration.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydration.plannedRefillBidons} rech.`
        : `${hydration.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydration.plannedRefillBidons} refill${hydration.plannedRefillBidons > 1 ? 's' : ''}`
      : `${hydration.carriedOnFrameBidons}× ${bidonSizeMl} ml`;

  // 3. First Problem on the Route
  const { firstProblem, secondaryProblems } = detectRouteProblems({
    trip,
    physics,
    leaveByHHMM: timeline.hardDepartureTime,
    pinnedAmenities,
    corridorAmenities: cachedScan,
    hasWaterScan,
    bidonSizeMl,
    frameBottleSlots,
    targetFluidMlPerHr: hydration.targetFluidMlPerHr,
    sectorForecast,
    lang,
  });

  // 4. Kit call (uses coldest sector & riding wind chill when sectorForecast is present)
  const kit = getKitRecommendation(
    sectorForecast?.worstCaseWeather || trip.weather,
    'daylight',
    lang,
    {
      ridingSpeedKmH: physics.effectiveSpeedKmH,
      coldestSectorLabel: sectorForecast?.coldestSectorLabel,
    }
  );

  // Verdict promotion if there's a critical stop/water problem on a GO ride
  let finalVerdict = physics.goStatus;
  let finalReason = physics.goStatusReason;
  if (firstProblem.severity === 'critical' && finalVerdict === 'GO') {
    finalVerdict = 'CAUTION';
    finalReason = firstProblem.headline;
  }

  // 5. Readiness score (0–100) — blends weather, bike/terrain fit, effort, checklist, light & stops
  const briefDepartureDate = activeStage?.departureDate || trip.departureDate;
  const vis = calculateRideVisibility(
    trip,
    briefDepartureDate,
    timeline.hardDepartureTime,
    physics.effectiveSpeedKmH
  );
  const realSurface = trip.route?.terrainSummary?.surfaceBreakdown ?? trip.route?.surfaceBreakdown;
  const terrainGravelPct = realSurface?.gravelPct ?? trip.route?.terrainSummary?.gravelPct;
  const terrainSinglePct = realSurface?.singletrackPct ?? trip.route?.terrainSummary?.singletrackPct;
  // Same list the "Before you leave" card renders (bike-specific tyre item, saved ticks merged).
  const checklistItems = buildEffectiveChecklist(trip, riderSpecs, lang === 'fr' ? 'fr' : 'en');
  const criticalItems = checklistItems.filter((c) => c.critical);
  // Route factor = logistics only (closed stops, water gaps). Wind & rain problems are
  // already scored by the Weather factor, so they're excluded to avoid double-counting.
  const logisticsProblems = [firstProblem, ...secondaryProblems].filter(
    (p) => p.id.startsWith('closed-') || p.id.startsWith('water-gap')
  );
  const flaggedProblems = logisticsProblems.filter(
    (p) => p.severity === 'critical' || p.severity === 'warning'
  );
  const worstLogistics = logisticsProblems[0]; // already sorted critical → info
  const baseWindKmH = trip.weather?.baseWindSpeedKmH ?? 0;
  const worstWeather = sectorForecast?.worstCaseWeather;
  const readiness = computeRideReadiness({
    lang,
    weather: {
      rainRiskPct: Math.max(
        trip.weather?.precipitationRiskPercent ?? 0,
        worstWeather?.precipitationRiskPercent ?? 0
      ),
      baseWindKmH: Math.max(baseWindKmH, worstWeather?.baseWindSpeedKmH ?? 0),
      gustKmH: Math.max(
        trip.weather?.estuaryGustKmH ?? Math.round(baseWindKmH * 1.4),
        worstWeather?.estuaryGustKmH ?? 0
      ),
      headwindKmH:
        trip.weather?.effectiveHeadwindKmH ?? (trip.weather?.isHeadwindActive ? baseWindKmH : 0),
      feelsLikeC: kit.feelsLikeC ?? trip.weather?.temperatureC ?? 14,
    },
    bike: {
      name: activeBike.name,
      category: activeBike.bikeCategory,
      tireWidthMm: bikeTireWidthMm,
      isTubeless: activeBike.isTubeless,
    },
    terrain: {
      hasSurfaceData: terrainGravelPct !== undefined || terrainSinglePct !== undefined,
      gravelPct: terrainGravelPct ?? 0,
      singletrackPct: terrainSinglePct ?? 0,
      suitabilityLevel: realSurface?.suitability?.overallLevel,
    },
    effort: {
      ftpPercent: physics.ftpPercent ?? 70,
      movingHours,
      powerZone: physics.powerZone,
      riderLevel: riderSpecs.riderLevel,
      plannedStopMinutes: getPlannedRestStopMinutes(trip),
      isPreDawnWinter: getStationaryRecoveryRuleForTrip(trip, timeline.hardDepartureTime).isRestricted,
    },
    checklist: {
      total: checklistItems.length,
      checked: checklistItems.filter((c) => c.checked).length,
      criticalTotal: criticalItems.length,
      criticalChecked: criticalItems.filter((c) => c.checked).length,
    },
    light: {
      nightPercent: vis.nightPercent,
      twilightPercent: vis.twilightPercent,
    },
    route: {
      worstSeverity: worstLogistics?.severity ?? 'clear',
      issueCount: flaggedProblems.length,
      headline: worstLogistics?.headline,
    },
    goStatus: finalVerdict,
  });

  const pressureUnit: PressureUnit = riderSpecs.pressureUnit === 'psi' ? 'psi' : 'bar';
  const showWatts =
    riderSpecs.cockpitViewMode === 'pro' || riderSpecs.pacingInputMode === 'power';
  const windInsight = calculateTripWindInsight({
    distanceKm: totalDistanceKm,
    targetSpeedKmH: trip.route?.targetSpeedKmH || physics.effectiveSpeedKmH || 24,
    riderWeightKg: riderSpecs.riderWeightKg || trip.physics?.riderWeightKg || 74,
    bikeWeightKg: activeBike.weightKg || trip.physics?.bikeWeightKg || 10,
    cda: trip.physics?.cda ?? 0.36,
    crr: trip.physics?.crr ?? 0.0055,
    windSpeedKmH: trip.weather?.baseWindSpeedKmH ?? 0,
    effectiveHeadwindKmH: trip.weather?.effectiveHeadwindKmH,
    isHeadwindActive: trip.weather?.isHeadwindActive,
    windDirection: trip.weather?.windDirection,
    windFromDegrees: trip.weather?.windDirectionDegrees,
    temperatureC: trip.weather?.temperatureC ?? 15,
    ftpWatts: riderSpecs.ftpWatts ?? 220,
    lang: isFr ? 'fr' : 'en',
  });
  const totalSweatLiters = Number(((hydration.sweatRateMlPerHr * movingHours) / 1000).toFixed(1));

  return {
    verdict: finalVerdict,
    verdictReason: finalReason,
    leaveByHHMM: timeline.hardDepartureTime,
    arrivalHHMM: timeline.gateArrivalTime,
    movingTimeFormatted: physics.movingTimeFormatted,
    totalStopsMin: timeline.bufferMinutes ?? 0,
    distanceKm: totalDistanceKm,
    elevationGainM: Math.round(trip.route?.elevationGainM || 0),
    departureDate: activeStage?.departureDate || trip.departureDate,
    bikeName: activeBike.name,
    loopComparison: sectorForecast?.loopComparison,
    tyrePressure,
    pressureUnit,
    isTubeless: activeBike.isTubeless,
    carbsPerHr,
    totalCarbsG,
    bottles: {
      carried: hydration.carriedOnFrameBidons,
      bidonSizeMl,
      refills: hydration.plannedRefillBidons,
      badgeLabel: bottlesBadge,
    },
    firstProblem,
    secondaryProblems,
    kit,
    pinnedCount: pinnedAmenities.length,
    scannedCount: cachedScan.length,
    windInsight,
    ...buildRideBriefCardMeta({
      trip: params.trip,
      physics,
      timeline,
      activeBike,
      departureDate: activeStage?.departureDate || params.trip.departureDate,
      totalDistanceKm,
      tyrePressure,
      pressureUnit,
      carbsPerHr,
      totalCarbsG,
      bottlesBadge,
      kit,
      firstProblem,
      sectorForecast,
      finalVerdict,
      lang: params.lang || 'en',
      telemetryMode: riderSpecs.telemetryMode,
      showWatts,
      windInsight,
      totalSweatLiters,
      vis,
      readiness,
    }),
    readiness,
  };
}
