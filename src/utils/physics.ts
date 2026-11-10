import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../types/trip';
import { Language, getCurrentLanguage, translate } from '../context/LanguageContext';
import { loadRiderBikeSpecs, getEffectiveRiderSpecs } from './specsStorage';
import { synthesizeRouteElevationProfile } from './gpxParser';

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

  // Resolve effective rider baselines (body-neutral mode safe)
  const configuredSpecs = loadRiderBikeSpecs();
  const effectiveSpecs = getEffectiveRiderSpecs(configuredSpecs);
  // In body-neutral modes the trip snapshot may still carry a previously entered weight;
  // always defer to the effective (baseline or opted-in) value there.
  const isBodyNeutral = (configuredSpecs.telemetryMode ?? 'quantitative') !== 'quantitative';
  const effectiveRiderKg =
    !isBodyNeutral && typeof riderWeightKg === 'number' && riderWeightKg > 25
      ? riderWeightKg
      : effectiveSpecs.riderWeightKg;

  // 1. Total System Mass (Rider + Bike + Gear) & Synced Air Density
  const systemMassKg = Number(
    Math.max(10, effectiveRiderKg + (bikeWeightKg || 9.5) + (gearWeightKg || 0)).toFixed(1)
  );
  const eff = Math.min(0.99, Math.max(0.70, drivetrainEfficiency));
  const gradeFraction = gradientPercent / 100;
  const sinTheta = Math.sin(Math.atan(gradeFraction));
  const effectiveRho = weather.airDensityRho ?? rho ?? 1.225;

  // Resolve rider FTP baseline. Callers pass the stored FTP as an override, so it is routed
  // through the same body-neutral guard (Phase 2 §1): 'feel' pacing in non-quantitative modes
  // must use the riderLevel baseline instead of a stale or default stored value.
  const guardedFtp = ftpOverride
    ? getEffectiveRiderSpecs({ ...configuredSpecs, ftpWatts: ftpOverride }).ftpWatts
    : effectiveSpecs.ftpWatts;
  const ftpWatts = Math.max(80, Math.round(guardedFtp || 210));

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
  const safeRiderKg = Math.max(35, effectiveRiderKg || 68);
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

export interface SectionalEnergySummary {
  isFromGpx: boolean;
  zoneShares: ZoneTimeShare[];
  bands: SectionalEffortBand[];
  peakClimbWatts: number;
  peakZone: PowerZoneCode;
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
  lang: Language = getCurrentLanguage()
): SectionalEnergySummary {
  const isFr = lang === 'fr';
  const isFromGpx = Boolean(route.elevationProfile && route.elevationProfile.length >= 3);
  const { elevationProfile } = synthesizeRouteElevationProfile(route);

  const systemMassKg = result.systemMassKg;
  const eff = Math.min(0.99, Math.max(0.7, physics.drivetrainEfficiency));
  const grossEff = Math.min(0.26, Math.max(0.15, physics.grossMechanicalEfficiency));
  const effectiveRho = weather.airDensityRho ?? physics.rho ?? 1.225;
  const ftp = Math.max(80, result.ftpWatts);

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

  for (let i = 1; i < elevationProfile.length; i++) {
    const prev = elevationProfile[i - 1];
    const curr = elevationProfile[i];
    const segDistKm = Math.max(0.02, curr.distKm - prev.distKm);
    const gradePct = curr.gradePct;
    const gradeFrac = gradePct / 100;
    const sinTheta = Math.sin(Math.atan(gradeFrac));

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
              (physics.crr * systemMassKg * GRAVITY * minClimbSpeedMs +
                systemMassKg * GRAVITY * sinTheta * minClimbSpeedMs) /
                eff
            )
          : 35;
      const targetSegW = Math.max(35, minClimbW, result.legWatts * modFactor);
      segSpeedMs = solveGroundSpeedMsForLegWatts(
        targetSegW,
        systemMassKg,
        physics.cda,
        physics.crr,
        effectiveRho,
        gradeFrac,
        windMs,
        eff
      );
      segLegWatts = targetSegW;
    } else {
      // Hold-speed mode, bounded by realistic climbing ceiling (~1.38x FTP) & descent coasting
      const desiredMs = Math.max(2.0, (route.targetSpeedKmH || 25) / 3.6);
      if (gradePct < -2.5) {
        segSpeedMs = Math.min(13.5, desiredMs * 1.18);
      } else {
        segSpeedMs = desiredMs;
      }
      const airMs = Math.max(0, segSpeedMs + windMs);
      const rawWheelW =
        physics.crr * systemMassKg * GRAVITY * segSpeedMs +
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
          physics.crr,
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
    }

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
    const kcal = Math.round((b.workKj / rawTotalKj) * result.totalKcalBurn);
    const avgSpd =
      b.timeSec > 5 ? Number(((b.distKm / (b.timeSec / 3600))).toFixed(1)) : Number(result.effectiveSpeedKmH.toFixed(1));
    return {
      id,
      title,
      subtitle,
      pctDistance: Math.round((b.distKm / totalDistKm) * 100),
      distanceKm: Number(b.distKm.toFixed(1)),
      avgWatts: avgW,
      peakWatts: peakW,
      zone: getPowerZone(Math.round((avgW / ftp) * 100)),
      kcalShare: b.distKm > 0.05 ? Math.max(5, kcal) : 0,
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

  return {
    isFromGpx,
    zoneShares,
    bands,
    peakClimbWatts,
    peakZone,
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
