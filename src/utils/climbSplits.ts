import {
  ElevationProfilePoint,
  PhysicsCalculationResult,
  TripProfile,
} from '../types/trip';
import { Language } from '../context/LanguageContext';
import { calculatePhysics, PowerZoneCode } from './physics';
import {
  calculateHydrationPlan,
  calculateIntensityModulatedCarbTarget,
  ENERGY_GEL_UNIT,
  MEDJOOL_DATE,
} from './nutrition';
import { synthesizeRouteElevationProfile } from './gpxParser';

export type ClimbCategory = 'HC' | '1' | '2' | '3' | '4' | 'hill';

export interface DetectedClimb {
  index: number;
  category: ClimbCategory;
  name: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  elevationGainM: number;
  avgGradePct: number;
  maxGradePct: number;
  startEleM: number;
  summitEleM: number;
}

export interface ClimbSplit extends DetectedClimb {
  targetWatts: number;
  wattsPerKg: number;
  ftpPercent: number;
  powerZone: PowerZoneCode;
  climbSpeedKmH: number;
  durationMinutes: number;
  durationFormatted: string;
  vamMetersPerHour: number;
  etaStartHHMM?: string;
  fuelingCue: string;
}

export interface FuelingCheckpoint {
  id: string;
  distKm: number;
  elapsedMinutes: number;
  etaHHMM?: string;
  kind: 'fuel-and-hydration' | 'hydration' | 'pre-climb';
  carbsGrams: number;
  fluidMl: number;
  label: string;
  shortFitCue: string;
  detail: string;
}

export interface ClimbSplitsSummary {
  climbs: ClimbSplit[];
  checkpoints: FuelingCheckpoint[];
  totalClimbKm: number;
  totalClimbGainM: number;
  recommendedCarbsGPerHr: number;
  targetFluidMlPerHr: number;
  isSynthesizedProfile: boolean;
}

export interface DetectClimbsOptions {
  minLengthKm?: number;
  minGainM?: number;
  minAvgGradePct?: number;
  lang?: Language;
}

export interface ClimbSplitsOptions {
  ftpWatts?: number;
  carbTargetGPerHr?: number;
  nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
  departureTimeHHMM?: string;
  bidonSizeMl?: number;
  frameBottleSlots?: number;
  checkpointIntervalMinutes?: number;
  minLengthKm?: number;
  minGainM?: number;
  minAvgGradePct?: number;
}

function classifyClimbCategory(gainM: number, avgGradePct: number): ClimbCategory {
  const score = gainM * Math.max(1, avgGradePct);
  if (score >= 8000) return 'HC';
  if (score >= 4000) return '1';
  if (score >= 2000) return '2';
  if (score >= 800) return '3';
  if (score >= 250) return '4';
  return 'hill';
}

export function formatClimbCategoryLabel(category: ClimbCategory, lang: Language = 'en'): string {
  const isFr = lang === 'fr';
  switch (category) {
    case 'HC':
      return 'HC';
    case '1':
      return isFr ? 'Cat. 1' : 'Cat 1';
    case '2':
      return isFr ? 'Cat. 2' : 'Cat 2';
    case '3':
      return isFr ? 'Cat. 3' : 'Cat 3';
    case '4':
      return isFr ? 'Cat. 4' : 'Cat 4';
    default:
      return isFr ? 'Côte' : 'Hill';
  }
}

function formatClimbDuration(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(rem).padStart(2, '0')}`;
}

function shiftHHMM(hhmm: string | undefined, addMinutes: number): string | undefined {
  if (!hhmm || !hhmm.includes(':')) return undefined;
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return undefined;
  const total = (((hRaw * 60 + mRaw + Math.round(addMinutes)) % 1440) + 1440) % 1440;
  const outH = Math.floor(total / 60);
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

function segmentGradePct(prev: ElevationProfilePoint, curr: ElevationProfilePoint): number {
  const segKm = curr.distKm - prev.distKm;
  if (segKm > 0.005) {
    return ((curr.eleM - prev.eleM) / (segKm * 1000)) * 100;
  }
  return curr.gradePct ?? 0;
}

/**
 * Automatically detects significant climbs from an elevation profile.
 * Merges minor flat/dip bridges (<= 0.45 km and <= 12 m drop) while trimming
 * non-climbing tails at the local summit.
 */
export function detectClimbs(
  elevationProfile?: ElevationProfilePoint[],
  options: DetectClimbsOptions = {}
): DetectedClimb[] {
  if (!elevationProfile || elevationProfile.length < 2) return [];

  const minLengthKm = options.minLengthKm ?? 0.4;
  const minGainM = options.minGainM ?? 35;
  const minAvgGradePct = options.minAvgGradePct ?? 2.5;
  const isFr = options.lang === 'fr';

  const rawClimbs: Array<{ startIdx: number; endIdx: number; maxGrade: number }> = [];

  let i = 1;
  while (i < elevationProfile.length) {
    const g = segmentGradePct(elevationProfile[i - 1], elevationProfile[i]);
    if (g < 2.0) {
      i++;
      continue;
    }

    const startIdx = i - 1;
    let summitIdx = i;
    let maxEle = elevationProfile[i].eleM;
    let maxGrade = g;
    let flatBridgeKm = 0;
    let dipM = 0;
    let j = i + 1;

    while (j < elevationProfile.length) {
      const prev = elevationProfile[j - 1];
      const curr = elevationProfile[j];
      const segKm = Math.max(0, curr.distKm - prev.distKm);
      const segG = segmentGradePct(prev, curr);

      if (curr.eleM >= maxEle) {
        maxEle = curr.eleM;
        summitIdx = j;
      }

      if (segG >= 1.5) {
        if (segG > maxGrade) maxGrade = segG;
        flatBridgeKm = 0;
        dipM = 0;
      } else {
        flatBridgeKm += segKm;
        dipM += Math.max(0, prev.eleM - curr.eleM);
        if (flatBridgeKm > 0.45 || dipM > 12 || segG <= -2.5) {
          break;
        }
      }
      j++;
    }

    // Recompute maxGrade up to summitIdx only
    let trimmedMaxGrade = 0;
    for (let k = startIdx + 1; k <= summitIdx; k++) {
      const sg = segmentGradePct(elevationProfile[k - 1], elevationProfile[k]);
      if (sg > trimmedMaxGrade) trimmedMaxGrade = sg;
    }

    if (summitIdx > startIdx) {
      rawClimbs.push({ startIdx, endIdx: summitIdx, maxGrade: trimmedMaxGrade });
    }
    i = Math.max(summitIdx + 1, i + 1);
  }

  const climbs: DetectedClimb[] = [];
  for (const rc of rawClimbs) {
    const pStart = elevationProfile[rc.startIdx];
    const pEnd = elevationProfile[rc.endIdx];
    const lengthKm = Number((pEnd.distKm - pStart.distKm).toFixed(2));
    const netGainM = Math.round(pEnd.eleM - pStart.eleM);
    if (lengthKm < minLengthKm || netGainM < minGainM) continue;

    const avgGradePct = Number(((netGainM / (lengthKm * 1000)) * 100).toFixed(1));
    if (avgGradePct < minAvgGradePct) continue;

    const idx = climbs.length + 1;
    const category = classifyClimbCategory(netGainM, avgGradePct);
    const catLabel = formatClimbCategoryLabel(category, isFr ? 'fr' : 'en');
    climbs.push({
      index: idx,
      category,
      name: isFr ? `Ascension ${idx} (${catLabel})` : `Climb ${idx} (${catLabel})`,
      startKm: Number(pStart.distKm.toFixed(1)),
      endKm: Number(pEnd.distKm.toFixed(1)),
      lengthKm: Number(lengthKm.toFixed(1)),
      elevationGainM: netGainM,
      avgGradePct,
      maxGradePct: Number(Math.min(28, Math.max(avgGradePct, rc.maxGrade)).toFixed(1)),
      startEleM: Math.round(pStart.eleM),
      summitEleM: Math.round(pEnd.eleM),
    });
  }

  return climbs;
}

function buildFuelUnitLabel(
  carbsG: number,
  fluidMl: number,
  pref: 'real-food' | 'mixed' | 'sports-fuel',
  lang: Language
): string {
  const isFr = lang === 'fr';
  const parts: string[] = [];

  if (carbsG >= 15) {
    if (pref === 'real-food') {
      const dates = Math.max(1, Math.round(carbsG / MEDJOOL_DATE.carbsG));
      parts.push(
        isFr
          ? `${dates} datte${dates > 1 ? 's' : ''} (ou barre)`
          : `${dates} date${dates > 1 ? 's' : ''} (or bar)`
      );
    } else {
      const gels = Math.max(1, Math.round(carbsG / ENERGY_GEL_UNIT.carbsG));
      parts.push(`${gels} gel${gels > 1 ? 's' : ''}`);
    }
  }

  if (fluidMl >= 150) {
    if (fluidMl >= 500) {
      parts.push('1 bidon');
    } else if (fluidMl >= 250) {
      parts.push(isFr ? '1/2 bidon' : '1/2 bidon');
    } else {
      parts.push(`${Math.round(fluidMl)} ml`);
    }
  }

  return parts.join(' + ') || (isFr ? 'Hydratation' : 'Hydrate');
}

function buildShortFitCue(carbsG: number, fluidMl: number, isFr: boolean): string {
  if (carbsG >= 15 && fluidMl >= 150) {
    return isFr ? `Ravito ${carbsG}g+Eau` : `Fuel ${carbsG}g+H2O`;
  }
  if (carbsG >= 15) {
    return isFr ? `Manger ${carbsG}g` : `Eat ${carbsG}g`;
  }
  return isFr ? `Boire ${fluidMl}ml` : `Drink ${fluidMl}ml`;
}

/**
 * Computes climb-by-climb pacing splits (target watts, W/kg, %FTP, duration)
 * and km-by-km fueling/hydration checkpoints along the route.
 */
export function computeClimbSplitsAndFueling(
  trip: TripProfile,
  physicsResult: PhysicsCalculationResult,
  lang: Language = 'en',
  options: ClimbSplitsOptions = {}
): ClimbSplitsSummary {
  const isFr = lang === 'fr';
  const hasExplicitProfile = Boolean(
    trip.route.elevationProfile && trip.route.elevationProfile.length >= 3
  );
  const profile = hasExplicitProfile
    ? trip.route.elevationProfile!
    : synthesizeRouteElevationProfile(trip.route).elevationProfile;

  const detected = detectClimbs(profile, {
    minLengthKm: options.minLengthKm,
    minGainM: options.minGainM,
    minAvgGradePct: options.minAvgGradePct,
    lang,
  });

  const ftpWatts = Math.max(80, Math.round(options.ftpWatts ?? physicsResult.ftpWatts ?? 210));
  const riderMassKg = Math.max(35, trip.physics.riderWeightKg || 70);
  const rideHours = Math.max(0.25, physicsResult.movingTimeSeconds / 3600);
  const gutCeiling = Math.max(30, Math.min(120, options.carbTargetGPerHr ?? 60));
  const pref = options.nutritionPreference ?? 'mixed';
  const bidonSizeMl = options.bidonSizeMl ?? 650;
  const frameBottleSlots = options.frameBottleSlots ?? 2;

  const carbTarget = calculateIntensityModulatedCarbTarget({
    rideHours,
    pctFtp: physicsResult.ftpPercent,
    carbOxidationGramPerHour: physicsResult.carbOxidationGramPerHour,
    gutCeilingGPerHr: gutCeiling,
    totalDays: trip.stages?.length || 1,
    activeChips: trip.customChips || [],
  });

  const hydrationPlan = calculateHydrationPlan({
    rideHours,
    tempC: trip.weather.temperatureC,
    legWatts: physicsResult.legWatts,
    bidonSizeMl,
    frameBottleSlots,
    isShortRide: rideHours < 0.75,
    activeChips: trip.customChips || [],
  });

  const avgSpeedKmH = Math.max(10, physicsResult.effectiveSpeedKmH || trip.route.targetSpeedKmH || 24);
  const departureTimeHHMM = options.departureTimeHHMM ?? trip.departureTime;

  const climbs: ClimbSplit[] = detected.map((climb) => {
    // Sustainable climbing target power: lift effort smoothly on climbs without exceeding realistic threshold caps
    const gradeLift =
      climb.avgGradePct <= 3.5
        ? 1.06
        : Math.min(1.28, 1.08 + (climb.avgGradePct - 3.5) * 0.035);
    const baseClimbW = Math.max(physicsResult.legWatts, ftpWatts * 0.65) * gradeLift;
    const rawTargetWatts = Math.round(Math.min(ftpWatts * 1.15, baseClimbW));

    const climbPhys = calculatePhysics(
      {
        ...trip.physics,
        gradientPercent: climb.avgGradePct,
      },
      {
        ...trip.route,
        distanceKm: climb.lengthKm,
        pacingMode: 'effort',
        targetEffortWatts: rawTargetWatts,
      },
      trip.weather,
      lang,
      ftpWatts
    );

    const targetWatts = Math.round(climbPhys.legWatts);
    const wattsPerKg = Number((targetWatts / riderMassKg).toFixed(2));
    const durationMinutes = Math.max(1, Math.round(climbPhys.movingTimeSeconds / 60));
    const vamMetersPerHour = Math.round(
      (climb.elevationGainM / Math.max(60, climbPhys.movingTimeSeconds)) * 3600
    );

    const elapsedToStartMin = Math.round((climb.startKm / avgSpeedKmH) * 60);
    const etaStartHHMM = shiftHHMM(departureTimeHHMM, elapsedToStartMin);

    const preClimbKm = Math.max(0.5, Number((climb.startKm - 1.5).toFixed(1)));
    const preClimbCarbs = carbTarget.recommendedGPerHr > 0 ? Math.min(30, Math.round(carbTarget.recommendedGPerHr * 0.4)) : 0;
    const preClimbFluid = Math.max(200, Math.round((hydrationPlan.targetFluidMlPerHr || 450) * 0.45));
    const cueItems = buildFuelUnitLabel(preClimbCarbs, preClimbFluid, pref, lang);
    const fuelingCue = isFr
      ? `Km ${preClimbKm} : ${cueItems} avant la rampe (${climb.avgGradePct} %)`
      : `Km ${preClimbKm}: ${cueItems} before ${climb.avgGradePct}% climb`;

    return {
      ...climb,
      targetWatts,
      wattsPerKg,
      ftpPercent: climbPhys.ftpPercent,
      powerZone: climbPhys.powerZone,
      climbSpeedKmH: climbPhys.effectiveSpeedKmH,
      durationMinutes,
      durationFormatted: formatClimbDuration(durationMinutes),
      vamMetersPerHour,
      etaStartHHMM,
      fuelingCue,
    };
  });

  // Build periodic km-by-km fueling & hydration checkpoints (every 30–45 min, default 35 min)
  const intervalMin = Math.max(25, Math.min(45, options.checkpointIntervalMinutes ?? 35));
  const totalRideMin = Math.round(rideHours * 60);
  const totalDistanceKm = Math.max(1, trip.route.distanceKm || 1);
  const checkpoints: FuelingCheckpoint[] = [];

  if (totalRideMin >= intervalMin) {
    const hourlyFluid = Math.max(350, hydrationPlan.targetFluidMlPerHr || 450);
    const hourlyCarbs = carbTarget.recommendedGPerHr;

    for (let min = intervalMin; min <= totalRideMin - 10; min += intervalMin) {
      const distKm = Number(
        Math.min(totalDistanceKm - 0.5, (min / totalRideMin) * totalDistanceKm).toFixed(1)
      );
      if (distKm < 1) continue;

      const intervalHours = intervalMin / 60;
      const carbsGrams = hourlyCarbs > 0 ? Math.round((hourlyCarbs * intervalHours) / 5) * 5 : 0;
      const fluidMl = Math.round((hourlyFluid * intervalHours) / 50) * 50;
      const unitDesc = buildFuelUnitLabel(carbsGrams, fluidMl, pref, lang);

      // Check if this checkpoint sits right before a climb (within 2.5 km of climb start)
      const upcomingClimb = climbs.find(
        (c) => c.startKm - distKm >= 0 && c.startKm - distKm <= 2.5
      );

      const label = isFr
        ? `Km ${distKm} : ${unitDesc}`
        : `Km ${distKm}: ${unitDesc}`;

      const detailParts: string[] = [];
      if (carbsGrams > 0) detailParts.push(`${carbsGrams}g CHO`);
      detailParts.push(`${fluidMl} ml`);
      detailParts.push(formatClimbDuration(min));
      if (upcomingClimb) {
        detailParts.push(
          isFr
            ? `avant ${upcomingClimb.name}`
            : `pre-${upcomingClimb.name}`
        );
      }

      checkpoints.push({
        id: `cp-${min}`,
        distKm,
        elapsedMinutes: min,
        etaHHMM: shiftHHMM(departureTimeHHMM, min),
        kind: upcomingClimb
          ? 'pre-climb'
          : carbsGrams > 0
          ? 'fuel-and-hydration'
          : 'hydration',
        carbsGrams,
        fluidMl,
        label,
        shortFitCue: buildShortFitCue(carbsGrams, fluidMl, isFr),
        detail: detailParts.join(' · '),
      });
    }
  }

  return {
    climbs,
    checkpoints,
    totalClimbKm: Number(climbs.reduce((s, c) => s + c.lengthKm, 0).toFixed(1)),
    totalClimbGainM: climbs.reduce((s, c) => s + c.elevationGainM, 0),
    recommendedCarbsGPerHr: carbTarget.recommendedGPerHr,
    targetFluidMlPerHr: hydrationPlan.targetFluidMlPerHr || 450,
    isSynthesizedProfile: !hasExplicitProfile,
  };
}
