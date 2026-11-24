import { calculatePhysics } from './physics';
import { calculateAirDensity, degreesToCompassCardinal } from '../services/weatherService';

export interface HumanWindImpactParams {
  distanceKm: number;
  targetSpeedKmH: number;
  riderWeightKg: number;
  bikeWeightKg: number;
  cda: number;
  crr: number;
  windSpeedKmH: number;
  /** Relative wind angle to rider heading: 0° = direct headwind, 90° = crosswind, 180° = direct tailwind */
  windRelativeAngleDeg: number;
  /** Optional meteorological wind-from direction (0°=N, 90°=E, 180°=S, 270°=W) for compass advice */
  windFromDegrees?: number;
  temperatureC?: number;
  ftpWatts?: number;
  lang: 'en' | 'fr';
}

export interface HumanWindImpactResult {
  effectiveHeadwindKmH: number;
  /** Equivalent constant hill grade % caused solely by the wind (+ = uphill headwind, - = downhill tailwind) */
  equivalentGradePct: number;
  /** Ghost meters of climbing (or free descent if negative) across distanceKm */
  ghostElevationM: number;
  /** Actual speed achievable at the same calm-day effort */
  sameEffortSpeedKmH: number;
  /** Speed gained/lost at the same effort (km/h, negative = slower) */
  speedDeltaKmH: number;
  /** Moving time on a calm day (min) */
  calmTimeMin: number;
  /** Moving time riding at the same effort into today's wind (min) */
  sameEffortTimeMin: number;
  /** Extra minutes spent (positive = slower, negative = faster) */
  timeDeltaMin: number;
  /** Total ride calories holding target speed in wind */
  totalRideKcal: number;
  /** Calm-day ride calories at target speed */
  calmRideKcal: number;
  /** Calories strictly added (or saved) by the wind */
  extraWindKcal: number;
  /** Relatable food unit: extra croissants (260 kcal) or bananas (95 kcal) */
  extraCroissants: number;
  extraBananas: number;
  /** Power-meter metrics (secondary for non-power-meter riders) */
  windyWatts: number;
  calmWatts: number;
  deltaWatts: number;
  airResistanceWatts: number;
  airResistanceSharePct: number;
  /** Best compass direction to ride OUT into the wind while fresh so you fly home with a tailwind */
  outboundIntoWindDeg: number | null;
  outboundIntoWindCardinal: string | null;
  returnTailwindCardinal: string | null;
  /** Relatable iconic climb benchmark for ghost elevation (e.g. Alpe d'Huez / Eiffel Tower) */
  iconicClimbComparison: string | null;
}

function getIconicClimbComparison(ghostElevationM: number, lang: 'en' | 'fr'): string | null {
  const isFr = lang === 'fr';
  if (ghostElevationM < 180) return null;
  if (ghostElevationM >= 1500) {
    const ratio = (ghostElevationM / 1610).toFixed(1);
    return isFr
      ? `≈ ${ratio}× l’ascension du Mont Ventoux (1 610 m)`
      : `≈ ${ratio}× climbing Mont Ventoux (1,610 m)`;
  }
  if (ghostElevationM >= 800) {
    const ratio = (ghostElevationM / 1071).toFixed(1);
    return isFr
      ? `≈ ${ratio}× l’Alpe d’Huez (1 071 m)`
      : `≈ ${ratio}× Alpe d’Huez (1,071 m)`;
  }
  if (ghostElevationM >= 450) {
    const towers = (ghostElevationM / 300).toFixed(1);
    return isFr
      ? `≈ ${towers}× la Tour Eiffel`
      : `≈ ${towers}× the Eiffel Tower`;
  }
  const empirePct = Math.round((ghostElevationM / 381) * 100);
  return isFr
    ? `≈ ${empirePct} % de l’Empire State Building`
    : `≈ ${empirePct}% of the Empire State Building`;
}

const GRAVITY = 9.81;

/**
 * Translates cycling wind aerodynamics into immediate, human, non-power-meter insights:
 * - "Invisible Hill" equivalent gradient % and ghost elevation meters
 * - Speed lost/gained & minutes lost/gained at the exact same leg effort
 * - Unambiguous calorie split (extra wind burn vs. total ride burn)
 * - Best compass direction to ride out into the wind for a tailwind home
 */
export function calculateHumanWindImpact(
  params: HumanWindImpactParams
): HumanWindImpactResult {
  const {
    distanceKm,
    targetSpeedKmH,
    riderWeightKg,
    bikeWeightKg,
    cda,
    crr,
    windSpeedKmH,
    windRelativeAngleDeg,
    windFromDegrees,
    temperatureC = 15,
    ftpWatts = 220,
    lang,
  } = params;

  const safeDist = Math.max(1, distanceKm);
  const safeSpeed = Math.max(10, targetSpeedKmH);
  const rho = calculateAirDensity(temperatureC, 1013);
  const effectiveHeadwindKmH = Number(
    (windSpeedKmH * Math.cos((windRelativeAngleDeg * Math.PI) / 180)).toFixed(1)
  );

  const makeRoute = (speed: number) => ({
    origin: 'Start',
    destination: 'Finish',
    distanceKm: safeDist,
    elevationGainM: 0,
    targetSpeedKmH: speed,
    pacingMode: 'speed' as const,
    urbanTrafficDelayMinutes: 0,
    gateSecurityDelayMinutes: 0,
  });

  const basePhysics = {
    riderWeightKg,
    bikeWeightKg,
    gearWeightKg: 1.5,
    luggageWeightKg: 1.5,
    cda,
    crr,
    rho,
    drivetrainEfficiency: 0.96,
    grossMechanicalEfficiency: 0.24,
    gradientPercent: 0,
  };

  const makeWindWeather = (wSpeed: number, effHead: number, angleDeg: number) => ({
    temperatureC,
    windDirectionDegrees: angleDeg,
    windDirection:
      wSpeed < 2
        ? ('calm' as const)
        : effHead > 2
        ? ('headwind' as const)
        : effHead < -2
        ? ('tailwind' as const)
        : ('cross-headwind' as const),
    baseWindSpeedKmH: wSpeed,
    precipitationRiskPercent: 10,
    estuaryGustKmH: Math.round(wSpeed * 1.3),
    visibilityKm: 12,
    isHeadwindActive: effHead > 2,
    airDensityRho: rho,
    effectiveHeadwindKmH: effHead,
  });

  const calmWeather = makeWindWeather(0, 0, 0);
  const windyWeather = makeWindWeather(windSpeedKmH, effectiveHeadwindKmH, windRelativeAngleDeg);

  const calm = calculatePhysics(basePhysics, makeRoute(safeSpeed), calmWeather, lang, ftpWatts);
  const windy = calculatePhysics(basePhysics, makeRoute(safeSpeed), windyWeather, lang, ftpWatts);

  const totalMassKg = riderWeightKg + bikeWeightKg + 1.5;
  const vMs = safeSpeed / 3.6;
  const extraAeroWatts = windy.aerodynamicDragWatts - calm.aerodynamicDragWatts;
  const extraAeroForceN = vMs > 0 ? extraAeroWatts / vMs : 0;
  const equivalentGradePct = Number(
    ((extraAeroForceN / (totalMassKg * GRAVITY)) * 100).toFixed(1)
  );
  const ghostElevationM = Math.round(safeDist * 1000 * (equivalentGradePct / 100));

  // Solve for actual riding speed at the SAME effort (calm.legWatts) via binary search
  const targetEffortWatts = Math.max(40, calm.legWatts);
  let lo = 6;
  let hi = 60;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const probe = calculatePhysics(basePhysics, makeRoute(mid), windyWeather, lang, ftpWatts);
    if (probe.legWatts < targetEffortWatts) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const sameEffortSpeedKmH = Number(((lo + hi) / 2).toFixed(1));
  const speedDeltaKmH = Number((sameEffortSpeedKmH - safeSpeed).toFixed(1));

  const calmTimeMin = Math.round((safeDist / safeSpeed) * 60);
  const sameEffortTimeMin = Math.round((safeDist / Math.max(6, sameEffortSpeedKmH)) * 60);
  const timeDeltaMin = sameEffortTimeMin - calmTimeMin;

  const totalRideKcal = Math.round(windy.totalKcalBurn);
  const calmRideKcal = Math.round(calm.totalKcalBurn);
  const extraWindKcal = totalRideKcal - calmRideKcal;

  const extraCroissants = Number((Math.abs(extraWindKcal) / 260).toFixed(1));
  const extraBananas = Number((Math.abs(extraWindKcal) / 95).toFixed(1));

  const windyWatts = Math.round(windy.legWatts);
  const calmWatts = Math.round(calm.legWatts);
  const deltaWatts = windyWatts - calmWatts;
  const airResistanceWatts = Math.max(0, Math.round(windy.aerodynamicDragWatts));
  const airResistanceSharePct =
    windy.legWatts > 0
      ? Math.min(100, Math.max(0, Math.round((airResistanceWatts / windy.legWatts) * 100)))
      : 0;

  let outboundIntoWindDeg: number | null = null;
  let outboundIntoWindCardinal: string | null = null;
  let returnTailwindCardinal: string | null = null;
  if (typeof windFromDegrees === 'number' && Number.isFinite(windFromDegrees)) {
    const normalized = ((Math.round(windFromDegrees) % 360) + 360) % 360;
    outboundIntoWindDeg = normalized;
    outboundIntoWindCardinal = degreesToCompassCardinal(normalized, lang);
    returnTailwindCardinal = degreesToCompassCardinal((normalized + 180) % 360, lang);
  }

  return {
    effectiveHeadwindKmH,
    equivalentGradePct,
    ghostElevationM,
    sameEffortSpeedKmH,
    speedDeltaKmH,
    calmTimeMin,
    sameEffortTimeMin,
    timeDeltaMin,
    totalRideKcal,
    calmRideKcal,
    extraWindKcal,
    extraCroissants,
    extraBananas,
    windyWatts,
    calmWatts,
    deltaWatts,
    airResistanceWatts,
    airResistanceSharePct,
    outboundIntoWindDeg,
    outboundIntoWindCardinal,
    returnTailwindCardinal,
    iconicClimbComparison: getIconicClimbComparison(ghostElevationM, lang),
  };
}

/**
 * Convenience wrapper for translating a full TripProfile's route + weather into
 * the same Invisible Hill / ghost-climbing / croissant intelligence used in Multi-Tool.
 */
export function calculateTripWindInsight(params: {
  distanceKm: number;
  targetSpeedKmH: number;
  riderWeightKg?: number;
  bikeWeightKg?: number;
  cda?: number;
  crr?: number;
  windSpeedKmH: number;
  effectiveHeadwindKmH?: number;
  isHeadwindActive?: boolean;
  windDirection?: 'headwind' | 'tailwind' | 'calm' | 'cross-headwind' | 'cross-tailwind';
  windFromDegrees?: number;
  temperatureC?: number;
  ftpWatts?: number;
  lang: 'en' | 'fr';
}): HumanWindImpactResult {
  const safeWind = Math.max(0, params.windSpeedKmH || 0);
  let relativeDeg = 90;
  if (safeWind < 1.5 || params.windDirection === 'calm') {
    relativeDeg = 90;
  } else if (typeof params.effectiveHeadwindKmH === 'number' && Number.isFinite(params.effectiveHeadwindKmH)) {
    const ratio = Math.max(-1, Math.min(1, params.effectiveHeadwindKmH / safeWind));
    relativeDeg = Math.round((Math.acos(ratio) * 180) / Math.PI);
  } else if (params.windDirection === 'tailwind') {
    relativeDeg = 180;
  } else if (params.windDirection === 'headwind' || params.isHeadwindActive) {
    relativeDeg = 0;
  }

  return calculateHumanWindImpact({
    distanceKm: Math.max(1, params.distanceKm || 25),
    targetSpeedKmH: Math.max(12, params.targetSpeedKmH || 24),
    riderWeightKg: params.riderWeightKg ?? 74,
    bikeWeightKg: params.bikeWeightKg ?? 10,
    cda: params.cda ?? 0.36,
    crr: params.crr ?? 0.0055,
    windSpeedKmH: safeWind,
    windRelativeAngleDeg: relativeDeg,
    windFromDegrees: params.windFromDegrees,
    temperatureC: params.temperatureC ?? 15,
    ftpWatts: params.ftpWatts ?? 220,
    lang: params.lang,
  });
}
