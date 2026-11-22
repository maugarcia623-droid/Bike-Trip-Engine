import {
  PhysicsParams,
  RouteParams,
  WeatherCondition,
  PhysicsCalculationResult,
  PhysicsCautionReason,
  RoadSurfaceCondition,
  SurfaceBreakdown,
  SurfaceSegment,
  TripProfile,
} from '../types/trip';
import { Language, getCurrentLanguage, translate } from '../context/LanguageContext';
import { loadRiderBikeSpecs, getEffectiveRiderSpecs, getActiveBike } from './specsStorage';
import { synthesizeRouteElevationProfile } from './gpxParser';
import { calculateRideVisibility } from './solarVisibility';

const GRAVITY = 9.81; // m/s^2
const OSM_PAVED_REFERENCE_CRR = 0.0045;

export type PowerZoneCode = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export interface PhysicsEnvironmentContext {
  /** True if active bike runs tubeless; false = butyl inner tubes (higher cold hysteresis). */
  isTubeless?: boolean;
  /** Route-wide weighted Crr from real OSM Overpass surface data. */
  osmWeightedCrr?: number;
  /** Guard ensuring heuristic surface fallbacks never inflate Crr on paved roads. */
  surfaceDataSource?: 'osm-overpass' | 'heuristic-fallback';
  /** Optional per-segment surface sectors for sectional breakdown (used only when OSM-backed). */
  surfaceSegments?: SurfaceSegment[];
  /** Percentage of ride spent in night darkness (0–100) from solarVisibility. */
  nightPercent?: number;
  /** Percentage of ride spent in civil/nautical twilight (0–100) from solarVisibility. */
  twilightPercent?: number;
}

/**
 * Classifies road moisture from rain probability, recent 6h precipitation,
 * WMO weather code, and cold high-humidity dew condensation (e.g. 9°C + 98% RH).
 */
export function classifyRoadSurfaceCondition(weather: WeatherCondition): RoadSurfaceCondition {
  const rainRisk = weather.precipitationRiskPercent ?? 0;
  const recentMm = weather.recentPrecipitationMm ?? 0;
  const code = weather.weatherCode ?? 0;
  const tempC = typeof weather.temperatureC === 'number' ? weather.temperatureC : 18;
  const humidity = weather.relativeHumidity;
  const visKm = weather.visibilityKm ?? 20;

  const isRainCode =
    (code >= 51 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 86) ||
    code >= 95;
  if (rainRisk >= 35 || recentMm >= 1.0 || isRainCode) {
    return 'wet';
  }

  const isFogCode = code === 45 || code === 48;
  const isColdDew = typeof humidity === 'number' && humidity >= 88 && tempC <= 13;
  const isColdMist = visKm > 0 && visKm <= 3 && tempC <= 12;
  if (rainRisk >= 16 || recentMm >= 0.2 || isColdDew || isFogCode || isColdMist) {
    return 'damp';
  }

  return 'dry';
}

interface EnvironmentalAdjustments {
  roadCondition: RoadSurfaceCondition;
  effectiveCrr: number;
  crrMultiplier: number;
  coldCrrMult: number;
  wetCrrMult: number;
  cautionPaceFactor: number;
  cautionReasons: PhysicsCautionReason[];
  surfaceCrrSource: 'bike-baseline' | 'osm-surface';
}

function resolveEnvironmentalAdjustments(
  baseCrr: number,
  weather: WeatherCondition,
  isTubeless: boolean,
  context?: PhysicsEnvironmentContext
): EnvironmentalAdjustments {
  const safeBaseCrr = Math.max(0.002, Number.isFinite(baseCrr) ? baseCrr : 0.0055);
  const roadCondition = classifyRoadSurfaceCondition(weather);

  // 1. Surface roughness delta (strictly from real OSM Overpass data — never from heuristic fallback)
  const useOsmSurface =
    context?.surfaceDataSource === 'osm-overpass' &&
    typeof context.osmWeightedCrr === 'number' &&
    Number.isFinite(context.osmWeightedCrr) &&
    context.osmWeightedCrr > 0;
  const surfaceCrrDelta = useOsmSurface
    ? Math.max(0, (context.osmWeightedCrr as number) - OSM_PAVED_REFERENCE_CRR)
    : 0;
  const surfaceAdjustedCrr = safeBaseCrr + surfaceCrrDelta;

  // 2. Cold-rubber hysteresis below 16°C (butyl tubes stiffen ~1.6%/°C; tubeless ~1.0%/°C)
  const tempC =
    typeof weather.temperatureC === 'number' && Number.isFinite(weather.temperatureC)
      ? weather.temperatureC
      : 18;
  const tempDrop = Math.max(0, 16 - tempC);
  const coldRatePerDeg = isTubeless ? 0.010 : 0.016;
  const coldCrrMult = 1 + Math.min(0.30, tempDrop * coldRatePerDeg);

  // 3. Road surface moisture film drag (water displacement + grit)
  const wetCrrMult = roadCondition === 'wet' ? 1.12 : roadCondition === 'damp' ? 1.06 : 1.0;

  const effectiveCrr = Number((surfaceAdjustedCrr * coldCrrMult * wetCrrMult).toFixed(5));
  const crrMultiplier = Number((effectiveCrr / safeBaseCrr).toFixed(3));

  // 4. Low-light / wet caution pacing factor (automatically factored into moving speed & time)
  let darkShare = 0;
  if (
    typeof context?.nightPercent === 'number' ||
    typeof context?.twilightPercent === 'number'
  ) {
    const night = Math.max(0, context.nightPercent ?? 0);
    const twilight = Math.max(0, context.twilightPercent ?? 0);
    darkShare = Math.min(1, (night + 0.5 * twilight) / 100);
  } else if (weather.isDay === false) {
    darkShare = 0.75;
  }

  const darkPenalty = darkShare * 0.075; // up to -7.5% at 100% night
  const wetPenalty = roadCondition === 'wet' ? 0.05 : roadCondition === 'damp' ? 0.025 : 0;
  const fogPenalty =
    typeof weather.visibilityKm === 'number' && weather.visibilityKm > 0 && weather.visibilityKm < 3
      ? 0.03
      : 0;
  const cautionSlowdown = Math.min(0.14, darkPenalty + wetPenalty + fogPenalty);
  const cautionPaceFactor = Number((1 - cautionSlowdown).toFixed(3));

  const cautionReasons: PhysicsCautionReason[] = [];
  if (darkPenalty >= 0.015) cautionReasons.push('dark');
  if (roadCondition === 'wet') cautionReasons.push('wet');
  else if (roadCondition === 'damp') cautionReasons.push('damp');
  if (coldCrrMult >= 1.06) cautionReasons.push('cold-tires');
  if (surfaceCrrDelta >= 0.0008) cautionReasons.push('surface');

  return {
    roadCondition,
    effectiveCrr,
    crrMultiplier,
    coldCrrMult,
    wetCrrMult,
    cautionPaceFactor,
    cautionReasons,
    surfaceCrrSource: useOsmSurface && surfaceCrrDelta > 0 ? 'osm-surface' : 'bike-baseline',
  };
}

/**
 * Builds a non-circular PhysicsEnvironmentContext from a TripProfile, optional live OSM
 * surface breakdown, and solar visibility so Dashboard, Configurator, and Exporters stay aligned.
 */
export function buildPhysicsEnvironmentContext(
  trip: TripProfile,
  options?: {
    surfaceBreakdown?: SurfaceBreakdown | null;
    isTubeless?: boolean;
    departureDate?: string;
    extraBufferMinutes?: number;
  }
): PhysicsEnvironmentContext {
  const configuredSpecs = loadRiderBikeSpecs();
  const activeBike = getActiveBike(configuredSpecs);
  const isTubeless =
    typeof options?.isTubeless === 'boolean'
      ? options.isTubeless
      : activeBike?.isTubeless ?? true;

  const surface =
    options?.surfaceBreakdown ?? trip.route?.terrainSummary?.surfaceBreakdown;
  const isOsm = surface?.dataSource === 'osm-overpass';

  // Estimate approximate rollout time without circular dependency on calculatePhysics()
  const baseSpeed = Math.max(8, trip.route?.targetSpeedKmH || 25);
  const distKm = Math.max(0.5, trip.route?.distanceKm || 20);
  const approxMovingMin = Math.round((distKm / baseSpeed) * 60);
  const extraMin = Math.max(0, options?.extraBufferMinutes ?? 0);

  let approxRolloutHHMM: string | undefined;
  if (trip.arriveAtMode === false && trip.departureTime) {
    approxRolloutHHMM = trip.departureTime;
  } else {
    const anchorStr =
      trip.ruleSettings?.anchorTimeHHMM ||
      trip.office?.targetGateArrivalTime ||
      trip.departureTime ||
      '08:30';
    const [h, m] = anchorStr.split(':').map(Number);
    const anchorMin = (Number.isFinite(h) ? h : 8) * 60 + (Number.isFinite(m) ? m : 30);
    let rolloutMin = anchorMin - approxMovingMin - extraMin;
    while (rolloutMin < 0) rolloutMin += 1440;
    rolloutMin = rolloutMin % 1440;
    approxRolloutHHMM = `${String(Math.floor(rolloutMin / 60)).padStart(2, '0')}:${String(
      rolloutMin % 60
    ).padStart(2, '0')}`;
  }

  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const departureDate =
    options?.departureDate ?? activeStage?.departureDate ?? trip.departureDate;

  const vis = calculateRideVisibility(trip, departureDate, approxRolloutHHMM, baseSpeed);

  return {
    isTubeless,
    osmWeightedCrr: isOsm ? surface?.weightedCrr : undefined,
    surfaceDataSource: surface?.dataSource,
    surfaceSegments: isOsm ? surface?.segments : undefined,
    nightPercent: vis.nightPercent,
    twilightPercent: vis.twilightPercent,
  };
}

/**
 * Formats a concise human-readable badge label when caution pace or cold/wet Crr adjustments are active.
 */
export function formatCautionPaceSummary(
  result: PhysicsCalculationResult,
  lang: Language = getCurrentLanguage()
): string | null {
  const isFr = lang === 'fr';
  const pacePct = Math.round((1 - (result.cautionPaceFactor ?? 1)) * 100);
  const crrPct = Math.round(((result.crrMultiplier ?? 1) - 1) * 100);
  const reasons = result.cautionReasons ?? [];

  if (pacePct <= 0 && crrPct < 8) return null;

  const reasonLabels: string[] = [];
  if (reasons.includes('dark')) reasonLabels.push(isFr ? 'nuit' : 'dark');
  if (reasons.includes('wet')) reasonLabels.push(isFr ? 'mouillé' : 'wet');
  else if (reasons.includes('damp')) reasonLabels.push(isFr ? 'humide' : 'damp');
  if (reasons.includes('surface')) reasonLabels.push(isFr ? 'surface' : 'surface');
  else if (reasonLabels.length === 0 && reasons.includes('cold-tires')) {
    reasonLabels.push(isFr ? 'pneus froids' : 'cold tyres');
  }

  const joined = reasonLabels.join('/');
  if (pacePct > 0) {
    return isFr
      ? `−${pacePct}% allure${joined ? ` (${joined})` : ''}`
      : `−${pacePct}% pace${joined ? ` (${joined})` : ''}`;
  }
  return isFr
    ? `+${crrPct}% Crr${joined ? ` (${joined})` : ''}`
    : `+${crrPct}% Crr${joined ? ` (${joined})` : ''}`;
}

/**
 * Standard Coggan 5-zone aerobic/threshold mapping from % FTP.
 */
export function getPowerZone(ftpPercent: number): PowerZoneCode {
  if (ftpPercent < 56) return 'Z1';
  if (ftpPercent <= 75) return 'Z2';
  if (ftpPercent <= 90) return 'Z3';
  if (ftpPercent <= 105) return 'Z4';
  return 'Z5';
}

/**
 * Monotonic binary-search solver finding exact ground speed (m/s)
 * that matches a target rider leg wattage against wind, rolling resistance, and grade.
 */
function solveGroundSpeedMsForLegWatts(
  targetLegWatts: number,
  systemMassKg: number,
  cda: number,
  crr: number,
  rho: number,
  gradeFraction: number,
  windSpeedMs: number,
  eff: number
): number {
  let low = 1.5; // 5.4 km/h minimum crawl
  let high = 20.0; // 72.0 km/h ceiling
  const sinTheta = Math.sin(Math.atan(gradeFraction));

  for (let i = 0; i < 28; i++) {
    const mid = (low + high) * 0.5;
    const rollW = crr * systemMassKg * GRAVITY * mid;
    const effAirMs = Math.max(0, mid + windSpeedMs);
    const aeroW = 0.5 * rho * cda * Math.pow(effAirMs, 2) * mid;
    const gravW = systemMassKg * GRAVITY * sinTheta * mid;
    const legW = Math.max(5, rollW + aeroW + gravW) / eff;
    if (legW < targetLegWatts) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) * 0.5;
}

/**
 * Calculates high-precision cycling physics on flat/rolling tarmac
 * based on standard aero drag, rolling resistance, drivetrain loss,
 * gross metabolic efficiency, rider FTP zones, and Hold-Speed vs. Hold-Effort pacing.
 */
export function calculatePhysics(
  physics: PhysicsParams,
  route: RouteParams,
  weather: WeatherCondition,
  lang: Language = getCurrentLanguage(),
  ftpOverride?: number,
  envContext?: PhysicsEnvironmentContext
): PhysicsCalculationResult {
  const {
    riderWeightKg,
    bikeWeightKg,
    gearWeightKg,
    cda,
    crr,
    rho,
    drivetrainEfficiency,
    grossMechanicalEfficiency,
    gradientPercent,
  } = physics;

  // Resolve effective rider baselines (body-neutral mode safe)
  const configuredSpecs = loadRiderBikeSpecs();
  const effectiveSpecs = getEffectiveRiderSpecs(configuredSpecs);
  const activeBike = getActiveBike(configuredSpecs);
  const hasExplicitWeightOverride =
    typeof riderWeightKg === 'number' && riderWeightKg > 25;
  const effectiveRiderKg = hasExplicitWeightOverride
    ? riderWeightKg
    : effectiveSpecs.riderWeightKg;

  // Resolve environmental Crr (cold hysteresis, road moisture, real OSM surface) & dark/wet caution pace
  const isTubeless =
    typeof envContext?.isTubeless === 'boolean'
      ? envContext.isTubeless
      : activeBike?.isTubeless ?? true;
  const envAdj = resolveEnvironmentalAdjustments(crr, weather, isTubeless, envContext);
  const effectiveCrr = envAdj.effectiveCrr;
  const cautionPaceFactor = envAdj.cautionPaceFactor;

  // 1. Total System Mass (Rider + Bike + Gear) & Synced Air Density
  const safeBikeKg = typeof bikeWeightKg === 'number' && Number.isFinite(bikeWeightKg) && bikeWeightKg > 0 ? bikeWeightKg : 9.5;
  const safeGearKg = typeof gearWeightKg === 'number' && Number.isFinite(gearWeightKg) && gearWeightKg >= 0 ? gearWeightKg : 0;
  const systemMassKg = Number(
    Math.max(10, effectiveRiderKg + safeBikeKg + safeGearKg).toFixed(1)
  );
  const safeCda = typeof cda === 'number' && Number.isFinite(cda) && cda > 0 ? cda : 0.38;
  const eff = Math.min(
    0.99,
    Math.max(0.70, typeof drivetrainEfficiency === 'number' && Number.isFinite(drivetrainEfficiency) ? drivetrainEfficiency : 0.95)
  );
  const safeGradientPct = typeof gradientPercent === 'number' && Number.isFinite(gradientPercent) ? gradientPercent : 0;
  const gradeFraction = safeGradientPct / 100;
  const sinTheta = Math.sin(Math.atan(gradeFraction));
  const rawRho = weather.airDensityRho ?? rho ?? 1.225;
  const effectiveRho = typeof rawRho === 'number' && Number.isFinite(rawRho) && rawRho > 0 ? rawRho : 1.225;
  const safeDistanceKm =
    typeof route.distanceKm === 'number' && Number.isFinite(route.distanceKm) && route.distanceKm > 0
      ? route.distanceKm
      : 0;

  const resolvedFtp =
    typeof ftpOverride === 'number' && Number.isFinite(ftpOverride) && ftpOverride >= 80
      ? ftpOverride
      : effectiveSpecs.ftpWatts;
  const ftpWatts = Math.max(80, Math.round(resolvedFtp || 210));

  // 2. Calm Baseline at Target Cruising Speed (with environmental Crr & caution pace)
  const targetSpeedKmH = Math.max(
    5,
    typeof route.targetSpeedKmH === 'number' && Number.isFinite(route.targetSpeedKmH) && route.targetSpeedKmH > 0
      ? route.targetSpeedKmH
      : 25
  );
  const targetGroundSpeedMs = targetSpeedKmH / 3.6;
  const cautiousTargetMs = Math.max(1.5, targetGroundSpeedMs * cautionPaceFactor);

  const calmRollW = effectiveCrr * systemMassKg * GRAVITY * cautiousTargetMs;
  const calmAeroW = 0.5 * effectiveRho * safeCda * Math.pow(cautiousTargetMs, 3);
  const calmGravW = systemMassKg * GRAVITY * sinTheta * cautiousTargetMs;
  const baselineLegWatts = Math.max(25, (calmRollW + calmAeroW + calmGravW) / eff);

  // 3. Axial Wind Vector (positive = opposing headwind, negative = assisting tailwind)
  let axialWindKmH = 0;
  if (weather.isHeadwindActive) {
    axialWindKmH =
      typeof weather.effectiveHeadwindKmH === 'number' && weather.effectiveHeadwindKmH > 0
        ? weather.effectiveHeadwindKmH
        : Math.max(0, weather.baseWindSpeedKmH || 0);
  } else if (weather.windDirection === 'tailwind') {
    axialWindKmH =
      typeof weather.effectiveHeadwindKmH === 'number' && weather.effectiveHeadwindKmH < 0
        ? weather.effectiveHeadwindKmH
        : -0.7 * Math.max(0, weather.baseWindSpeedKmH || 0);
  }
  const windSpeedMs = axialWindKmH / 3.6;

  const pacingMode: 'speed' | 'effort' = route.pacingMode === 'effort' ? 'effort' : 'speed';

  let groundSpeedMs: number;
  let uncautionedSpeedMs: number;
  let calmSpeedKmH: number;
  let effectiveSpeedKmH: number;
  let rollingResistanceWatts: number;
  let aerodynamicDragWatts: number;
  let gravityWatts: number;
  let wheelWatts: number;
  let legWatts: number;
  let powerDeltaWatts: number;
  let speedDeltaKmH: number;
  let windDelayMinutes: number;

  if (pacingMode === 'effort') {
    const cappedLegWatts = Math.max(
      45,
      route.targetEffortWatts && route.targetEffortWatts > 0
        ? route.targetEffortWatts
        : Math.round(baselineLegWatts)
    );

    const calmSolvedMs = solveGroundSpeedMsForLegWatts(
      cappedLegWatts,
      systemMassKg,
      cda,
      effectiveCrr,
      effectiveRho,
      gradeFraction,
      0,
      eff
    );
    uncautionedSpeedMs =
      Math.abs(windSpeedMs) > 0.05
        ? solveGroundSpeedMsForLegWatts(
            cappedLegWatts,
            systemMassKg,
            cda,
            effectiveCrr,
            effectiveRho,
            gradeFraction,
            windSpeedMs,
            eff
          )
        : calmSolvedMs;

    groundSpeedMs = Math.max(1.5, uncautionedSpeedMs * cautionPaceFactor);
    const calmCautiousMs = Math.max(1.5, calmSolvedMs * cautionPaceFactor);

    calmSpeedKmH = Number((calmCautiousMs * 3.6).toFixed(1));
    effectiveSpeedKmH = Number((groundSpeedMs * 3.6).toFixed(1));

    const airSpeed = Math.max(0, groundSpeedMs + windSpeedMs);
    rollingResistanceWatts = effectiveCrr * systemMassKg * GRAVITY * groundSpeedMs;
    aerodynamicDragWatts = 0.5 * effectiveRho * cda * Math.pow(airSpeed, 2) * groundSpeedMs;
    gravityWatts = systemMassKg * GRAVITY * sinTheta * groundSpeedMs;
    wheelWatts = Math.max(5, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts);
    legWatts = wheelWatts / eff;

    powerDeltaWatts = 0;
    speedDeltaKmH = weather.isHeadwindActive
      ? Number(Math.max(0, calmSpeedKmH - effectiveSpeedKmH).toFixed(1))
      : 0;

    const calmMinutes = safeDistanceKm > 0 ? Math.round(((safeDistanceKm * 1000) / Math.max(0.5, calmCautiousMs)) / 60) : 0;
    const actualMinutes = safeDistanceKm > 0 ? Math.round(((safeDistanceKm * 1000) / Math.max(0.5, groundSpeedMs)) / 60) : 0;
    windDelayMinutes = Math.max(0, actualMinutes - calmMinutes);
  } else {
    uncautionedSpeedMs = targetGroundSpeedMs;
    groundSpeedMs = cautiousTargetMs;
    calmSpeedKmH = Number((groundSpeedMs * 3.6).toFixed(1));
    effectiveSpeedKmH = Number((groundSpeedMs * 3.6).toFixed(1));

    const airSpeed = Math.max(0, groundSpeedMs + windSpeedMs);
    rollingResistanceWatts = effectiveCrr * systemMassKg * GRAVITY * groundSpeedMs;
    aerodynamicDragWatts = 0.5 * effectiveRho * cda * Math.pow(airSpeed, 2) * groundSpeedMs;
    gravityWatts = systemMassKg * GRAVITY * sinTheta * groundSpeedMs;
    wheelWatts = Math.max(5, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts);
    legWatts = wheelWatts / eff;

    powerDeltaWatts = weather.isHeadwindActive ? Math.max(0, legWatts - baselineLegWatts) : 0;

    const eqEffortMs = weather.isHeadwindActive
      ? solveGroundSpeedMsForLegWatts(
          baselineLegWatts,
          systemMassKg,
          cda,
          effectiveCrr,
          effectiveRho,
          gradeFraction,
          windSpeedMs,
          eff
        )
      : groundSpeedMs;
    speedDeltaKmH = weather.isHeadwindActive
      ? Number(Math.max(0, effectiveSpeedKmH - eqEffortMs * 3.6).toFixed(1))
      : 0;
    windDelayMinutes = 0;
  }

  const airSpeedMs = Math.max(0, groundSpeedMs + windSpeedMs);

  // 4. Rider-Normalized Effort Metrics (W/kg, % FTP, Coggan Zone)
  const safeRiderKg = Math.max(35, effectiveRiderKg || 68);
  const wattsPerKg = Number((legWatts / safeRiderKg).toFixed(2));
  const ftpPercent = Math.round((legWatts / ftpWatts) * 100);
  const powerZone = getPowerZone(ftpPercent);

  // 5. Moving Time & Dark/Wet Caution Delay (zero-distance & NaN safe)
  const distanceMeters = safeDistanceKm * 1000;
  const safeGroundMs = Math.max(0.5, Number.isFinite(groundSpeedMs) ? groundSpeedMs : 1.5);
  const safeUncautionedMs = Math.max(0.5, Number.isFinite(uncautionedSpeedMs) ? uncautionedSpeedMs : safeGroundMs);
  const movingTimeSeconds = distanceMeters > 0 ? distanceMeters / safeGroundMs : 0;
  const uncautionedMovingSeconds = distanceMeters > 0 ? distanceMeters / safeUncautionedMs : 0;
  const cautionDelayMinutes =
    distanceMeters > 0
      ? Math.max(0, Math.round((movingTimeSeconds - uncautionedMovingSeconds) / 60))
      : 0;

  const hours = Math.floor(movingTimeSeconds / 3600);
  const minutes = Math.floor((movingTimeSeconds % 3600) / 60);
  const seconds = Math.floor(movingTimeSeconds % 60);
  const movingTimeFormatted = `${hours > 0 ? `${hours} h ` : ''}${minutes} min ${seconds.toString().padStart(2, '0')} s`;

  // 6. Total Mechanical Work (kJ) & Caloric Burn (kcal)
  const safeLegWatts = Number.isFinite(legWatts) ? legWatts : 0;
  const totalWorkKj = movingTimeSeconds > 0 ? (safeLegWatts * movingTimeSeconds) / 1000 : 0;
  const grossEff = Math.min(
    0.26,
    Math.max(
      0.15,
      typeof grossMechanicalEfficiency === 'number' && Number.isFinite(grossMechanicalEfficiency)
        ? grossMechanicalEfficiency
        : 0.21
    )
  );
  const totalKcalBurn = totalWorkKj > 0 ? totalWorkKj / (grossEff * 4.184) : 0;

  // 7. Carbohydrate Oxidation Rate (g/hr) — scaled relative to rider % FTP
  const movingHours = movingTimeSeconds / 3600;
  const hourlyBurnKcal = movingHours > 0 ? totalKcalBurn / movingHours : 0;
  const carbFraction = Math.min(0.88, Math.max(0.42, 0.38 + (ftpPercent / 115) * 0.48));
  const carbOxidationGramPerHour = movingHours > 0 ? Math.round((hourlyBurnKcal * carbFraction) / 4) : 0;
  const totalCarbsBurnedGrams =
    movingHours > 0 ? Math.round(carbOxidationGramPerHour * movingHours) : 0;

  // 8. FTP-Aware & Reassuring GO / CAUTION / NO-GO Evaluation
  let goStatus: 'GO' | 'CAUTION' | 'NO-GO' = 'GO';
  let goStatusReason = translate(lang, 'goReasonCalm');

  const windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH || 0 : 0;

  if (windKmh >= 32 || (weather.estuaryGustKmH && weather.estuaryGustKmH >= 52)) {
    goStatus = 'NO-GO';
    goStatusReason = translate(lang, 'goReasonGale', { wind: windKmh });
  } else if (
    (windKmh >= 22 && pacingMode === 'speed') ||
    windKmh >= 26 ||
    ftpPercent > 90
  ) {
    goStatus = 'CAUTION';
    if (windKmh >= 22) {
      goStatusReason =
        pacingMode === 'effort'
          ? translate(lang, 'goReasonHeadwindEffort', {
              wind: windKmh,
              watts: Math.round(legWatts),
              zone: powerZone,
              min: windDelayMinutes,
            })
          : translate(lang, 'goReasonHeadwind', {
              wind: windKmh,
              watts: Math.round(powerDeltaWatts),
            });
    } else {
      goStatusReason = translate(lang, 'goReasonPowerFtp', {
        watts: Math.round(legWatts),
        pct: ftpPercent,
        zone: powerZone,
      });
    }
  } else {
    goStatus = 'GO';
    if (windKmh >= 14 && pacingMode === 'effort') {
      goStatusReason = translate(lang, 'goReasonHeadwindEffort', {
        wind: windKmh,
        watts: Math.round(legWatts),
        zone: powerZone,
        min: windDelayMinutes,
      });
    } else {
      goStatusReason =
        windKmh > 0
          ? translate(lang, 'goReasonBreeze', { wind: windKmh })
          : translate(lang, 'goReasonCalm');
    }
  }

  return {
    systemMassKg,
    groundSpeedMs,
    airSpeedMs,
    effectiveSpeedKmH,
    calmSpeedKmH,
    baselineLegWatts,
    rollingResistanceWatts,
    aerodynamicDragWatts,
    gravityWatts,
    wheelWatts,
    legWatts,
    wattsPerKg,
    ftpWatts,
    ftpPercent,
    powerZone,
    pacingMode,
    windDelayMinutes,
    movingTimeSeconds,
    movingTimeFormatted,
    totalWorkKj,
    totalKcalBurn,
    carbOxidationGramPerHour,
    totalCarbsBurnedGrams,
    speedDeltaKmH,
    powerDeltaWatts,
    goStatus,
    goStatusReason,
    effectiveCrr: envAdj.effectiveCrr,
    crrMultiplier: envAdj.crrMultiplier,
    roadCondition: envAdj.roadCondition,
    cautionPaceFactor: envAdj.cautionPaceFactor,
    cautionDelayMinutes,
    cautionReasons: envAdj.cautionReasons,
    surfaceCrrSource: envAdj.surfaceCrrSource,
  };
}

export interface ZoneTimeShare {
  zone: PowerZoneCode;
  pctTime: number;
  minutes: number;
  wattsRange: string;
}

export interface SectionalEffortBand {
  id: 'easy' | 'rolling' | 'climbs';
  title: string;
  subtitle: string;
  pctDistance: number;
  distanceKm: number;
  avgWatts: number;
  peakWatts: number;
  zone: PowerZoneCode;
  kcalShare: number;
  avgSpeedKmH: number;
}

export interface EffortTracePoint {
  distKm: number;
  eleM: number;
  /** Time-weighted average leg watts across the segment ending at this point. */
  watts: number;
  gradePct: number;
  zone: PowerZoneCode;
}

export interface SectionalEnergySummary {
  isFromGpx: boolean;
  zoneShares: ZoneTimeShare[];
  bands: SectionalEffortBand[];
  peakClimbWatts: number;
  peakZone: PowerZoneCode;
  /** Downsampled route-ordered elevation + effort trace (≤ 96 points) for dataviz. */
  effortTrace: EffortTracePoint[];
  /** Distance (km) along the route where the peak effort occurs. */
  peakAtKm: number;
  /** Grade (%) of the segment where the peak effort occurs. */
  peakGradePct: number;
  totalMinutes: number;
  totalDistanceKm: number;
  elevationGainM: number;
  ftpWatts: number;
}

/**
 * Computes variable sectional energy expenditure across descents/flats, rolling terrain,
 * and climbs using actual GPX elevation profiles (or synthesized route terrain),
 * resolving Arthur's feedback that real rides span multiple zones rather than flat Z1.
 */
export function calculateSectionalEnergyBreakdown(
  physics: PhysicsParams,
  route: RouteParams,
  weather: WeatherCondition,
  result: PhysicsCalculationResult,
  lang: Language = getCurrentLanguage(),
  envContext?: PhysicsEnvironmentContext
): SectionalEnergySummary {
  const isFr = lang === 'fr';
  const isFromGpx = Boolean(route.elevationProfile && route.elevationProfile.length >= 3);
  const { elevationProfile } = synthesizeRouteElevationProfile(route);

  const systemMassKg = result.systemMassKg;
  const eff = Math.min(0.99, Math.max(0.7, physics.drivetrainEfficiency));
  const grossEff = Math.min(0.26, Math.max(0.15, physics.grossMechanicalEfficiency));
  const effectiveRho = weather.airDensityRho ?? physics.rho ?? 1.225;
  const ftp = Math.max(80, result.ftpWatts);

  const configuredSpecs = loadRiderBikeSpecs();
  const activeBike = getActiveBike(configuredSpecs);
  const isTubeless =
    typeof envContext?.isTubeless === 'boolean'
      ? envContext.isTubeless
      : activeBike?.isTubeless ?? true;
  const envAdj = resolveEnvironmentalAdjustments(physics.crr, weather, isTubeless, envContext);
  const baseEffectiveCrr = result.effectiveCrr ?? envAdj.effectiveCrr;
  const cautionFactor = result.cautionPaceFactor ?? envAdj.cautionPaceFactor;
  const osmSegments =
    envContext?.surfaceDataSource === 'osm-overpass' &&
    Array.isArray(envContext.surfaceSegments) &&
    envContext.surfaceSegments.length > 0
      ? envContext.surfaceSegments
      : null;

  const resolveSegmentCrr = (distKm: number): number => {
    if (!osmSegments) return baseEffectiveCrr;
    const seg =
      osmSegments.find((s) => distKm >= s.startKm && distKm <= s.endKm) ??
      osmSegments[osmSegments.length - 1];
    if (!seg || !Number.isFinite(seg.effectiveCrr)) return baseEffectiveCrr;
    const segDelta = Math.max(0, seg.effectiveCrr - OSM_PAVED_REFERENCE_CRR);
    return Number(
      ((physics.crr + segDelta) * envAdj.coldCrrMult * envAdj.wetCrrMult).toFixed(5)
    );
  };

  let axialWindKmH = 0;
  if (weather.isHeadwindActive) {
    axialWindKmH =
      typeof weather.effectiveHeadwindKmH === 'number' && weather.effectiveHeadwindKmH > 0
        ? weather.effectiveHeadwindKmH
        : Math.max(0, weather.baseWindSpeedKmH || 0);
  } else if (weather.windDirection === 'tailwind') {
    axialWindKmH =
      typeof weather.effectiveHeadwindKmH === 'number' && weather.effectiveHeadwindKmH < 0
        ? weather.effectiveHeadwindKmH
        : -0.7 * Math.max(0, weather.baseWindSpeedKmH || 0);
  }
  const windMs = axialWindKmH / 3.6;

  const zoneSeconds: Record<PowerZoneCode, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };

  type BucketAcc = { distKm: number; timeSec: number; workKj: number; peakW: number };
  const buckets: Record<'easy' | 'rolling' | 'climbs', BucketAcc> = {
    easy: { distKm: 0, timeSec: 0, workKj: 0, peakW: 0 },
    rolling: { distKm: 0, timeSec: 0, workKj: 0, peakW: 0 },
    climbs: { distKm: 0, timeSec: 0, workKj: 0, peakW: 0 },
  };

  let peakClimbWatts = Math.round(result.legWatts);
  let peakAtKm = 0;
  let peakGradePct = 0;
  let elevationGainM = 0;
  const rawTrace: Array<{ distKm: number; eleM: number; watts: number; timeSec: number; gradePct: number }> = [];

  for (let i = 1; i < elevationProfile.length; i++) {
    const prev = elevationProfile[i - 1];
    const curr = elevationProfile[i];
    const segDistKm = Math.max(0.02, curr.distKm - prev.distKm);
    const gradePct = curr.gradePct;
    const gradeFrac = gradePct / 100;
    const sinTheta = Math.sin(Math.atan(gradeFrac));
    const segCrr = resolveSegmentCrr((prev.distKm + curr.distKm) * 0.5);

    let segSpeedMs: number;
    let segLegWatts: number;

    if (result.pacingMode === 'effort') {
      // Even in effort-cap mode, riders ease on descents and naturally press harder on >3% ramps
      const modFactor =
        gradePct < -2
          ? 0.48
          : gradePct < 0.8
          ? 0.86
          : gradePct <= 3.5
          ? 1.04
          : Math.min(1.42, 1.12 + (gradePct - 3.5) * 0.055);
      // Minimum mechanical climbing wattage at ~7.5 km/h cadence floor on steep pitches
      const minClimbSpeedMs = 2.1;
      const minClimbW =
        gradePct > 3
          ? Math.max(
              0,
              (segCrr * systemMassKg * GRAVITY * minClimbSpeedMs +
                systemMassKg * GRAVITY * sinTheta * minClimbSpeedMs) /
                eff
            )
          : 35;
      const targetSegW = Math.max(35, minClimbW, result.legWatts * modFactor);
      const solvedSegMs = solveGroundSpeedMsForLegWatts(
        targetSegW,
        systemMassKg,
        physics.cda,
        segCrr,
        effectiveRho,
        gradeFrac,
        windMs,
        eff
      );
      segSpeedMs = Math.max(1.5, solvedSegMs * cautionFactor);
      segLegWatts = targetSegW;
    } else {
      // Hold-speed mode, bounded by realistic climbing ceiling (~1.38x FTP) & descent coasting
      const desiredMs = Math.max(2.0, ((route.targetSpeedKmH || 25) / 3.6) * cautionFactor);
      if (gradePct < -2.5) {
        segSpeedMs = Math.min(13.5, desiredMs * 1.18);
      } else {
        segSpeedMs = desiredMs;
      }
      const airMs = Math.max(0, segSpeedMs + windMs);
      const rawWheelW =
        segCrr * systemMassKg * GRAVITY * segSpeedMs +
        0.5 * effectiveRho * physics.cda * Math.pow(airMs, 2) * segSpeedMs +
        systemMassKg * GRAVITY * sinTheta * segSpeedMs;
      const rawLegW = Math.max(25, rawWheelW / eff);
      const ceilingW = ftp * 1.38;
      if (rawLegW > ceilingW && gradePct > 1.5) {
        segLegWatts = ceilingW;
        segSpeedMs = solveGroundSpeedMsForLegWatts(
          ceilingW,
          systemMassKg,
          physics.cda,
          segCrr,
          effectiveRho,
          gradeFrac,
          windMs,
          eff
        );
      } else {
        segLegWatts = rawLegW;
      }
    }

    const dtSec = (segDistKm * 1000) / Math.max(1.5, segSpeedMs);
    const workKj = (segLegWatts * dtSec) / 1000;
    const zone = getPowerZone(Math.round((segLegWatts / ftp) * 100));
    zoneSeconds[zone] += dtSec;

    if (segLegWatts > peakClimbWatts) {
      peakClimbWatts = Math.round(segLegWatts);
      peakAtKm = curr.distKm;
      peakGradePct = gradePct;
    }
    if (curr.eleM > prev.eleM) {
      elevationGainM += curr.eleM - prev.eleM;
    }
    rawTrace.push({
      distKm: curr.distKm,
      eleM: curr.eleM,
      watts: segLegWatts,
      timeSec: dtSec,
      gradePct,
    });

    const bucketKey: 'easy' | 'rolling' | 'climbs' =
      gradePct < 1.0 ? 'easy' : gradePct <= 3.5 ? 'rolling' : 'climbs';
    buckets[bucketKey].distKm += segDistKm;
    buckets[bucketKey].timeSec += dtSec;
    buckets[bucketKey].workKj += workKj;
    if (segLegWatts > buckets[bucketKey].peakW) {
      buckets[bucketKey].peakW = segLegWatts;
    }
  }

  // Normalize kcal to align cleanly with overall result.totalKcalBurn
  const rawTotalKj = Math.max(1, buckets.easy.workKj + buckets.rolling.workKj + buckets.climbs.workKj);
  const totalTimeSec = Math.max(1, Object.values(zoneSeconds).reduce((a, b) => a + b, 0));
  const totalDistKm = Math.max(0.1, buckets.easy.distKm + buckets.rolling.distKm + buckets.climbs.distKm);

  const zoneRanges: Record<PowerZoneCode, string> = {
    Z1: `< ${Math.round(ftp * 0.56)}W`,
    Z2: `${Math.round(ftp * 0.56)}–${Math.round(ftp * 0.75)}W`,
    Z3: `${Math.round(ftp * 0.76)}–${Math.round(ftp * 0.90)}W`,
    Z4: `${Math.round(ftp * 0.91)}–${Math.round(ftp * 1.05)}W`,
    Z5: `> ${Math.round(ftp * 1.05)}W`,
  };

  const zoneOrder: PowerZoneCode[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
  const zoneShares: ZoneTimeShare[] = zoneOrder.map((z) => ({
    zone: z,
    pctTime: Math.round((zoneSeconds[z] / totalTimeSec) * 100),
    minutes: Math.round(zoneSeconds[z] / 60),
    wattsRange: zoneRanges[z],
  }));

  // Ensure percentages sum to 100%
  const sumPct = zoneShares.reduce((acc, z) => acc + z.pctTime, 0);
  if (sumPct !== 100 && sumPct > 0) {
    const largest = zoneShares.reduce((prev, curr) => (curr.pctTime > prev.pctTime ? curr : prev));
    largest.pctTime = Math.max(0, largest.pctTime + (100 - sumPct));
  }

  const hasRouteDistance =
    typeof route.distanceKm === 'number' && Number.isFinite(route.distanceKm) && route.distanceKm > 0;
  const makeBand = (
    id: 'easy' | 'rolling' | 'climbs',
    title: string,
    subtitle: string,
    fallbackMult: number
  ): SectionalEffortBand => {
    const b = buckets[id];
    const avgW =
      b.timeSec > 5 ? Math.round((b.workKj * 1000) / b.timeSec) : Math.round(result.legWatts * fallbackMult);
    const peakW = b.peakW > 0 ? Math.round(b.peakW) : Math.round(avgW * 1.12);
    const safeTotalKcal = Number.isFinite(result.totalKcalBurn) && result.totalKcalBurn > 0 ? result.totalKcalBurn : 0;
    const kcal = hasRouteDistance && safeTotalKcal > 0 ? Math.round((b.workKj / rawTotalKj) * safeTotalKcal) : 0;
    const avgSpd =
      b.timeSec > 5 ? Number(((b.distKm / (b.timeSec / 3600))).toFixed(1)) : Number(result.effectiveSpeedKmH.toFixed(1));
    return {
      id,
      title,
      subtitle,
      pctDistance: hasRouteDistance ? Math.round((b.distKm / totalDistKm) * 100) : 0,
      distanceKm: hasRouteDistance ? Number(b.distKm.toFixed(1)) : 0,
      avgWatts: avgW,
      peakWatts: peakW,
      zone: getPowerZone(Math.round((avgW / ftp) * 100)),
      kcalShare: hasRouteDistance && safeTotalKcal > 0 && b.distKm > 0.05 ? Math.max(5, kcal) : 0,
      avgSpeedKmH: avgSpd,
    };
  };

  const bands: SectionalEffortBand[] = [
    makeBand(
      'easy',
      isFr ? 'Plats abrités & Descentes' : 'Sheltered Flats & Descents',
      isFr ? 'Récupération active, souplesse de pédalage' : 'Active recovery & light cadence spin',
      0.74
    ),
    makeBand(
      'rolling',
      isFr ? 'Faux-plats & Sections ventées' : 'Rolling Cruise & Wind Exposure',
      isFr ? 'Allure endurance régulière en prise d’air' : 'Steady endurance rhythm on undulating roads',
      1.04
    ),
    makeBand(
      'climbs',
      isFr ? 'Côtes & Relances (>3,5 %)' : 'Climbs & Punchy Ramps (>3.5%)',
      isFr ? 'Pic d’effort musculaire — moulinez tôt !' : 'Peak muscular effort — shift down early!',
      1.32
    ),
  ];

  const peakZone = getPowerZone(Math.round((peakClimbWatts / ftp) * 100));

  // Suppress unused grossEff warning by referencing it if needed
  void grossEff;

  // Downsample the route-ordered trace to ≤ 96 time-weighted buckets for lightweight SVG rendering
  const MAX_TRACE_POINTS = 96;
  const effortTrace: EffortTracePoint[] = [];
  if (elevationProfile.length > 0) {
    const first = elevationProfile[0];
    const firstW = rawTrace[0]?.watts ?? result.legWatts;
    effortTrace.push({
      distKm: first.distKm,
      eleM: first.eleM,
      watts: Math.round(firstW),
      gradePct: rawTrace[0]?.gradePct ?? 0,
      zone: getPowerZone(Math.round((firstW / ftp) * 100)),
    });
  }
  const step = Math.max(1, Math.ceil(rawTrace.length / MAX_TRACE_POINTS));
  for (let s = 0; s < rawTrace.length; s += step) {
    const chunk = rawTrace.slice(s, s + step);
    const t = chunk.reduce((acc, p) => acc + p.timeSec, 0) || 1;
    const w = chunk.reduce((acc, p) => acc + p.watts * p.timeSec, 0) / t;
    const g = chunk.reduce((acc, p) => acc + p.gradePct * p.timeSec, 0) / t;
    const last = chunk[chunk.length - 1];
    effortTrace.push({
      distKm: last.distKm,
      eleM: last.eleM,
      watts: Math.round(w),
      gradePct: Number(g.toFixed(1)),
      zone: getPowerZone(Math.round((w / ftp) * 100)),
    });
  }

  return {
    isFromGpx,
    zoneShares,
    bands,
    peakClimbWatts,
    peakZone,
    effortTrace,
    peakAtKm: Number(peakAtKm.toFixed(1)),
    peakGradePct: Number(peakGradePct.toFixed(1)),
    totalMinutes: Math.round(totalTimeSec / 60),
    totalDistanceKm: Number(totalDistKm.toFixed(1)),
    elevationGainM: Math.round(elevationGainM),
    ftpWatts: Math.round(ftp),
  };
}

export interface WattsDidacticGuide {
  headline: string;
  breathingCue: string;
  everydayAnalogy: string;
  whatIsWatts: string;
  whatIsFtp: string;
  whatIsWkg: string;
}

export function getWattsDidacticExplanation(
  legWatts: number,
  ftpWatts: number,
  riderWeightKg: number,
  lang: Language = getCurrentLanguage()
): WattsDidacticGuide {
  const isFr = lang === 'fr';
  const roundedW = Math.round(legWatts);
  const pct = Math.round((legWatts / Math.max(80, ftpWatts)) * 100);
  const wkg = (legWatts / Math.max(35, riderWeightKg || 70)).toFixed(1);

  let headline = '';
  let breathingCue = '';
  let everydayAnalogy = '';

  if (pct < 56) {
    headline = isFr
      ? `${roundedW} W — Promenade fluide & très confortable`
      : `${roundedW}W — Gentle, effortless spin`;
    breathingCue = isFr
      ? 'Respiration calme par le nez, conversation fluide sans aucun essoufflement.'
      : 'Easy nasal breathing — you can chat in full paragraphs all day.';
    everydayAnalogy = isFr
      ? 'Équivaut à une marche tranquille sur terrain plat.'
      : 'Feels like an unhurried stroll on flat ground.';
  } else if (pct <= 75) {
    headline = isFr
      ? `${roundedW} W — Allure endurance idéale (rythme voyage)`
      : `${roundedW}W — All-day bikepacking endurance pace`;
    breathingCue = isFr
      ? 'Vous parlez en phrases complètes ; les jambes chauffent doucement sans brûler.'
      : 'Comfortable full-sentence conversation; warm legs with zero burn.';
    everydayAnalogy = isFr
      ? 'Équivaut à une marche rapide et tonique en discutant.'
      : 'Feels like a brisk, purposeful walk with a friend.';
  } else if (pct <= 90) {
    headline = isFr
      ? `${roundedW} W — Allure soutenue "Tempo" (effort tonique)`
      : `${roundedW}W — Brisk "Tempo" effort (engaged & focused)`;
    breathingCue = isFr
      ? 'Phrases courtes de 4–5 mots ; concentration active et souffle profond.'
      : 'Short 4–5 word phrases; deep rhythmic breathing.';
    everydayAnalogy = isFr
      ? 'Équivaut à monter un long escalier d’un pas régulier.'
      : 'Feels like climbing a long flight of stairs at a steady clip.';
  } else {
    headline = isFr
      ? `${roundedW} W — Effort intense près du seuil (à limiter en voyage)`
      : `${roundedW}W — High threshold push (best kept short on tours)`;
    breathingCue = isFr
      ? 'Un ou deux mots maximum ; jambes sollicitées — passez en "Effort Fixe" pour souffler.'
      : '1–2 words at a time; heavy legs — switch to "Cap Effort" to ease off.';
    everydayAnalogy = isFr
      ? 'Équivaut à courir vite en côte ou grimper deux marches à la fois.'
      : 'Feels like a fast uphill run — sustainable for ~45–60 min max.';
  }

  return {
    headline,
    breathingCue,
    everydayAnalogy,
    whatIsWatts: isFr
      ? `Les Watts mesurent l'énergie mécanique réelle appuyée sur vos pédales (indépendamment du vent ou de la pente).`
      : `Watts measure the actual leg push on your pedals right now (unlike speed, which drops in wind or hills).`,
    whatIsFtp: isFr
      ? `Votre FTP (${ftpWatts} W) est la puissance maximale que vous pouvez tenir pendant 1 heure sans exploser (${pct} % utilisé ici).`
      : `Your FTP (${ftpWatts}W) is the max steady power you can sustain for 1 hour (${pct}% used on this ride).`,
    whatIsWkg: isFr
      ? `${wkg} W/kg rapporte votre puissance à votre poids (${riderWeightKg} kg) — le vrai repère dès que la route grimpe.`
      : `${wkg} W/kg divides your watts by body weight (${riderWeightKg}kg) — what truly matters on climbs.`,
  };
}
