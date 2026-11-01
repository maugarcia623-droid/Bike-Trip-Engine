import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../types/trip';
import { Language, getCurrentLanguage, translate } from '../context/LanguageContext';
import { loadRiderBikeSpecs } from './specsStorage';

const GRAVITY = 9.81; // m/s^2

export type PowerZoneCode = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

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
  ftpOverride?: number
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

  // 1. Total System Mass (Rider + Bike + Gear) & Synced Air Density
  const systemMassKg = Number(Math.max(10, riderWeightKg + bikeWeightKg + gearWeightKg).toFixed(1));
  const eff = Math.min(0.99, Math.max(0.70, drivetrainEfficiency));
  const gradeFraction = gradientPercent / 100;
  const sinTheta = Math.sin(Math.atan(gradeFraction));
  const effectiveRho = weather.airDensityRho ?? rho ?? 1.225;

  // Resolve rider FTP baseline
  const configuredSpecs = loadRiderBikeSpecs();
  const ftpWatts = Math.max(80, Math.round(ftpOverride || configuredSpecs.ftpWatts || 210));

  // 2. Calm Baseline at Target Cruising Speed
  const targetSpeedKmH = Math.max(5, route.targetSpeedKmH || 25);
  const targetGroundSpeedMs = targetSpeedKmH / 3.6;

  const calmRollW = crr * systemMassKg * GRAVITY * targetGroundSpeedMs;
  const calmAeroW = 0.5 * effectiveRho * cda * Math.pow(targetGroundSpeedMs, 3);
  const calmGravW = systemMassKg * GRAVITY * sinTheta * targetGroundSpeedMs;
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
      crr,
      effectiveRho,
      gradeFraction,
      0,
      eff
    );
    groundSpeedMs =
      Math.abs(windSpeedMs) > 0.05
        ? solveGroundSpeedMsForLegWatts(
            cappedLegWatts,
            systemMassKg,
            cda,
            crr,
            effectiveRho,
            gradeFraction,
            windSpeedMs,
            eff
          )
        : calmSolvedMs;

    calmSpeedKmH = Number((calmSolvedMs * 3.6).toFixed(1));
    effectiveSpeedKmH = Number((groundSpeedMs * 3.6).toFixed(1));

    const airSpeed = Math.max(0, groundSpeedMs + windSpeedMs);
    rollingResistanceWatts = crr * systemMassKg * GRAVITY * groundSpeedMs;
    aerodynamicDragWatts = 0.5 * effectiveRho * cda * Math.pow(airSpeed, 2) * groundSpeedMs;
    gravityWatts = systemMassKg * GRAVITY * sinTheta * groundSpeedMs;
    wheelWatts = Math.max(5, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts);
    legWatts = wheelWatts / eff;

    powerDeltaWatts = 0;
    speedDeltaKmH = weather.isHeadwindActive
      ? Number(Math.max(0, calmSpeedKmH - effectiveSpeedKmH).toFixed(1))
      : 0;

    const calmMinutes = Math.round(((route.distanceKm * 1000) / calmSolvedMs) / 60);
    const actualMinutes = Math.round(((route.distanceKm * 1000) / groundSpeedMs) / 60);
    windDelayMinutes = Math.max(0, actualMinutes - calmMinutes);
  } else {
    groundSpeedMs = targetGroundSpeedMs;
    calmSpeedKmH = Number(targetSpeedKmH.toFixed(1));
    effectiveSpeedKmH = Number(targetSpeedKmH.toFixed(1));

    const airSpeed = Math.max(0, groundSpeedMs + windSpeedMs);
    rollingResistanceWatts = crr * systemMassKg * GRAVITY * groundSpeedMs;
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
          crr,
          effectiveRho,
          gradeFraction,
          windSpeedMs,
          eff
        )
      : groundSpeedMs;
    speedDeltaKmH = weather.isHeadwindActive
      ? Number(Math.max(0, targetSpeedKmH - eqEffortMs * 3.6).toFixed(1))
      : 0;
    windDelayMinutes = 0;
  }

  const airSpeedMs = Math.max(0, groundSpeedMs + windSpeedMs);

  // 4. Rider-Normalized Effort Metrics (W/kg, % FTP, Coggan Zone)
  const safeRiderKg = Math.max(35, riderWeightKg || 70);
  const wattsPerKg = Number((legWatts / safeRiderKg).toFixed(2));
  const ftpPercent = Math.round((legWatts / ftpWatts) * 100);
  const powerZone = getPowerZone(ftpPercent);

  // 5. Moving Time
  const distanceMeters = route.distanceKm * 1000;
  const movingTimeSeconds = distanceMeters / groundSpeedMs;

  const hours = Math.floor(movingTimeSeconds / 3600);
  const minutes = Math.floor((movingTimeSeconds % 3600) / 60);
  const seconds = Math.floor(movingTimeSeconds % 60);
  const movingTimeFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  // 6. Total Mechanical Work (kJ) & Caloric Burn (kcal)
  const totalWorkKj = (legWatts * movingTimeSeconds) / 1000;
  const grossEff = Math.min(0.26, Math.max(0.15, grossMechanicalEfficiency));
  const totalKcalBurn = totalWorkKj / (grossEff * 4.184);

  // 7. Carbohydrate Oxidation Rate (g/hr) — scaled relative to rider % FTP
  const hourlyBurnKcal = movingTimeSeconds > 0 ? totalKcalBurn / (movingTimeSeconds / 3600) : 0;
  const carbFraction = Math.min(0.88, Math.max(0.42, 0.38 + (ftpPercent / 115) * 0.48));
  const carbOxidationGramPerHour = movingTimeSeconds > 0 ? Math.round((hourlyBurnKcal * carbFraction) / 4) : 0;
  const totalCarbsBurnedGrams =
    movingTimeSeconds > 0 ? Math.round(carbOxidationGramPerHour * (movingTimeSeconds / 3600)) : 0;

  // 8. FTP-Aware GO / CAUTION / NO-GO Evaluation
  let goStatus: 'GO' | 'CAUTION' | 'NO-GO' = 'GO';
  let goStatusReason = translate(lang, 'goReasonCalm');

  const windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH || 0 : 0;

  if (windKmh >= 30 || (weather.estuaryGustKmH && weather.estuaryGustKmH >= 50)) {
    goStatus = 'NO-GO';
    goStatusReason = translate(lang, 'goReasonGale', { wind: windKmh });
  } else if (windKmh >= 15 || ftpPercent > 90) {
    goStatus = 'CAUTION';
    if (windKmh >= 15) {
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
    goStatusReason =
      windKmh > 0
        ? translate(lang, 'goReasonBreeze', { wind: windKmh })
        : translate(lang, 'goReasonCalm');
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
  };
}
