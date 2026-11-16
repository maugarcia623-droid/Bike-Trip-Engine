import { TripProfile, WeatherCondition } from '../types/trip';
import { Language } from '../context/LanguageContext';
import { calculatePhysics } from '../utils/physics';
import { addDaysToIso } from '../utils/stageManager';
import { computeCumulativeDistances, haversineDistanceMeters } from './overpassCorridor';
import { calculateAirDensity, checkForecastHorizon, degreesToCompassCardinal } from './weatherService';
import { loadSectorWeatherFromIdb, saveSectorWeatherToIdb } from './offlineIdb';

export interface RouteSectorForecast {
  index: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  lat: number;
  lon: number;
  bearingDeg: number;
  etaHHMM: string;
  temperatureC: number;
  windChillC: number;
  windSpeedKmH: number;
  windDirectionDegrees: number;
  windCardinal: string;
  effectiveHeadwindKmH: number;
  precipitationRiskPercent: number;
  visibilityKm: number;
  airDensityRho: number;
  legWatts: number;
  aeroPenaltyWatts: number;
  effectiveSpeedKmH: number;
  durationMin: number;
  carbsG: number;
}

export interface LoopDirectionComparison {
  isLoop: boolean;
  forwardOrientation: 'clockwise' | 'anticlockwise' | 'out-and-back';
  recommendedDirection: 'forward' | 'reverse' | 'neutral';
  forwardTotalMin: number;
  reverseTotalMin: number;
  forwardAvgWatts: number;
  reverseAvgWatts: number;
  minutesSaved: number;
  wattsSaved: number;
}

export interface RouteWeatherAnalysis {
  sectors: RouteSectorForecast[];
  loopComparison: LoopDirectionComparison;
  coldestSector: RouteSectorForecast;
  wettestSector: RouteSectorForecast;
  worstCaseWeather: WeatherCondition;
  coldestSectorLabel: string;
  source: 'live' | 'planned' | 'simulated';
}

interface HourlyPointData {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m?: number[];
  surface_pressure?: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_gusts_10m?: number[];
  precipitation_probability?: number[];
  visibility?: number[];
  is_day?: number[];
  weather_code?: number[];
}

const sectorCache = new Map<string, RouteWeatherAnalysis>();

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function computeBearingDeg(a: [number, number], b: [number, number]): number {
  if (a[0] === b[0] && a[1] === b[1]) return 0;
  const dLon = toRad(b[1] - a[1]);
  const phi1 = toRad(a[0]);
  const phi2 = toRad(b[0]);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (Math.round(toDeg(Math.atan2(y, x))) + 360) % 360;
}

export function addMinutesHHMM(
  hhmm: string,
  addMin: number
): { hhmm: string; hour: number; dayOffset: number } {
  const [h, m] = (hhmm || '09:00').split(':').map(Number);
  const totalMinutes =
    (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + Math.round(addMin);
  const dayOffset = Math.floor(totalMinutes / 1440);
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const outH = Math.floor(norm / 60);
  const outM = norm % 60;
  return {
    hhmm: `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`,
    hour: outH,
    dayOffset,
  };
}

function computeCyclingWindChillC(tempC: number, speedKmH: number, headwindKmH: number): number {
  const airflow = Math.max(10, speedKmH + headwindKmH * 0.65);
  if (tempC > 14) return Math.round(tempC);
  const chill =
    13.12 +
    0.6215 * tempC -
    11.37 * Math.pow(airflow, 0.16) +
    0.3965 * tempC * Math.pow(airflow, 0.16);
  return Math.round(chill);
}

function detectLoopOrientation(coords: [number, number][]): {
  isLoop: boolean;
  orientation: 'clockwise' | 'anticlockwise' | 'out-and-back';
} {
  if (coords.length < 4) return { isLoop: false, orientation: 'out-and-back' };
  const start = coords[0];
  const end = coords[coords.length - 1];
  const endGapM = haversineDistanceMeters(start[0], start[1], end[0], end[1]);

  let maxDistM = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const d = haversineDistanceMeters(start[0], start[1], coords[i][0], coords[i][1]);
    if (d > maxDistM) maxDistM = d;
  }

  const isLoop = maxDistM > 500 && endGapM <= Math.max(3500, maxDistM * 0.35);
  if (!isLoop) return { isLoop: false, orientation: 'out-and-back' };

  // Signed shoelace area in local equirectangular projection:
  // x = lon * cos(lat0), y = lat. Positive signed area = CCW, Negative = CW.
  const cosLat = Math.cos(toRad(start[0]));
  let signedArea = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const x1 = coords[i][1] * cosLat;
    const y1 = coords[i][0];
    const x2 = coords[i + 1][1] * cosLat;
    const y2 = coords[i + 1][0];
    signedArea += x1 * y2 - x2 * y1;
  }

  if (Math.abs(signedArea) < 1e-6) {
    return { isLoop: true, orientation: 'out-and-back' };
  }
  return {
    isLoop: true,
    orientation: signedArea < 0 ? 'clockwise' : 'anticlockwise',
  };
}

interface RawSectorGeom {
  index: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  lat: number;
  lon: number;
  bearingDeg: number;
  gradePct: number;
}

function buildSectors(
  coordinates: [number, number][],
  totalDistanceKm: number,
  defaultGradePct: number,
  elevationProfile?: { distKm: number; eleM: number }[]
): RawSectorGeom[] {
  const cumM = computeCumulativeDistances(coordinates);
  const rawTotalM = cumM[cumM.length - 1] || 1;
  const distKm = Math.max(2, totalDistanceKm || rawTotalM / 1000);

  // Sample roughly every 5-8 km, clamped between 4 and 8 sectors
  const sectorCount = Math.max(4, Math.min(8, Math.round(distKm / 6)));
  const sectors: RawSectorGeom[] = [];

  const coordAtFraction = (frac: number): [number, number] => {
    const targetM = Math.max(0, Math.min(1, frac)) * rawTotalM;
    for (let i = 0; i < cumM.length - 1; i++) {
      if (cumM[i + 1] >= targetM) {
        const seg = cumM[i + 1] - cumM[i];
        const t = seg > 0 ? (targetM - cumM[i]) / seg : 0;
        const p0 = coordinates[i];
        const p1 = coordinates[i + 1];
        return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      }
    }
    return coordinates[coordinates.length - 1];
  };

  const eleAtKm = (km: number): number | null => {
    if (!elevationProfile || elevationProfile.length < 2) return null;
    let best = elevationProfile[0];
    let bestDiff = Infinity;
    for (const p of elevationProfile) {
      const diff = Math.abs(p.distKm - km);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = p;
      }
    }
    return best.eleM;
  };

  for (let i = 0; i < sectorCount; i++) {
    const f0 = i / sectorCount;
    const f1 = (i + 1) / sectorCount;
    const fMid = (f0 + f1) / 2;
    const pStart = coordAtFraction(f0);
    const pMid = coordAtFraction(fMid);
    const pEnd = coordAtFraction(f1);

    const startKm = Number((f0 * distKm).toFixed(1));
    const endKm = Number((f1 * distKm).toFixed(1));
    const secKm = Math.max(0.5, Number((endKm - startKm).toFixed(1)));
    const bearingDeg = computeBearingDeg(pStart, pEnd);

    let gradePct = defaultGradePct;
    const e0 = eleAtKm(startKm);
    const e1 = eleAtKm(endKm);
    if (e0 !== null && e1 !== null) {
      gradePct = Number(Math.max(-10, Math.min(12, ((e1 - e0) / (secKm * 1000)) * 100)).toFixed(1));
    }

    sectors.push({
      index: i,
      startKm,
      endKm,
      distanceKm: secKm,
      lat: pMid[0],
      lon: pMid[1],
      bearingDeg,
      gradePct,
    });
  }

  return sectors;
}

function evaluateDirectionPhysics(
  sectorsGeom: RawSectorGeom[],
  hourlyByIdx: HourlyPointData[] | null,
  trip: TripProfile,
  targetDate: string,
  departureTime: string,
  targetSpeedKmH: number,
  lang: Language,
  ftpWatts?: number
): RouteSectorForecast[] {
  const results: RouteSectorForecast[] = [];
  let elapsedMin = 0;

  for (let i = 0; i < sectorsGeom.length; i++) {
    const g = sectorsGeom[i];
    const { hhmm: etaHHMM, hour, dayOffset } = addMinutesHHMM(departureTime, elapsedMin);
    const sectorDate = dayOffset !== 0 ? addDaysToIso(targetDate, dayOffset) : targetDate;
    const targetHourStr = `${sectorDate}T${String(hour).padStart(2, '0')}:00`;

    let tempC = trip.weather.temperatureC ?? 14;
    let windSpeedKmH = trip.weather.baseWindSpeedKmH ?? 12;
    let windDirDeg = trip.weather.windDirectionDegrees ?? 245;
    let pressureHpa = 1013;
    let precipProb = trip.weather.precipitationRiskPercent ?? 10;
    let visKm = trip.weather.visibilityKm ?? 15;

    const hData = hourlyByIdx?.[i];
    if (hData && Array.isArray(hData.time)) {
      let idx = hData.time.findIndex((t) => t.startsWith(targetHourStr));
      if (idx === -1) idx = Math.min(hour, hData.time.length - 1);
      if (idx >= 0) {
        tempC = Math.round(hData.temperature_2m?.[idx] ?? tempC);
        windSpeedKmH = Math.round(hData.wind_speed_10m?.[idx] ?? windSpeedKmH);
        windDirDeg = Math.round(hData.wind_direction_10m?.[idx] ?? windDirDeg);
        pressureHpa = Math.round(hData.surface_pressure?.[idx] ?? pressureHpa);
        precipProb = Math.round(hData.precipitation_probability?.[idx] ?? precipProb);
        visKm = Math.round(((hData.visibility?.[idx] ?? visKm * 1000) / 1000) * 10) / 10;
      }
    }

    const rho = calculateAirDensity(tempC, pressureHpa);
    const angleDiffRad = toRad(windDirDeg - g.bearingDeg);
    const effectiveHeadwindKmH = Number((windSpeedKmH * Math.cos(angleDiffRad)).toFixed(1));

    const sectorWeather: WeatherCondition = {
      ...trip.weather,
      temperatureC: tempC,
      baseWindSpeedKmH: windSpeedKmH,
      windDirectionDegrees: windDirDeg,
      effectiveHeadwindKmH,
      isHeadwindActive: effectiveHeadwindKmH > 2,
      windDirection:
        effectiveHeadwindKmH > 2 ? 'headwind' : effectiveHeadwindKmH < -2 ? 'tailwind' : 'calm',
      airDensityRho: rho,
      precipitationRiskPercent: precipProb,
      visibilityKm: visKm,
    };

    const sectorRoute = {
      ...trip.route,
      distanceKm: g.distanceKm,
      targetSpeedKmH,
      elevationGainM: Math.max(0, Math.round((g.gradePct / 100) * g.distanceKm * 1000)),
      elevationProfile: undefined,
    };

    const phys = calculatePhysics(
      { ...trip.physics, gradientPercent: g.gradePct, rho },
      sectorRoute,
      sectorWeather,
      lang,
      ftpWatts
    );

    const durationMin = Math.max(1, Math.round(phys.movingTimeSeconds / 60));
    elapsedMin += durationMin;

    const windChillC = computeCyclingWindChillC(tempC, phys.effectiveSpeedKmH, effectiveHeadwindKmH);

    results.push({
      index: i,
      startKm: g.startKm,
      endKm: g.endKm,
      distanceKm: g.distanceKm,
      lat: g.lat,
      lon: g.lon,
      bearingDeg: g.bearingDeg,
      etaHHMM,
      temperatureC: tempC,
      windChillC,
      windSpeedKmH,
      windDirectionDegrees: windDirDeg,
      windCardinal: degreesToCompassCardinal(windDirDeg, lang === 'fr' ? 'fr' : 'en'),
      effectiveHeadwindKmH,
      precipitationRiskPercent: precipProb,
      visibilityKm: visKm,
      airDensityRho: rho,
      legWatts: Math.round(phys.legWatts),
      aeroPenaltyWatts: Math.round(phys.powerDeltaWatts),
      effectiveSpeedKmH: Number(phys.effectiveSpeedKmH.toFixed(1)),
      durationMin,
      carbsG: Math.round(phys.totalCarbsBurnedGrams),
    });
  }

  return results;
}

/**
 * Samples Open-Meteo hourly forecast along 4–8 route sectors at each sector's ETA,
 * evaluates per-sector cycling physics (watts, time, carbs, wind-chill), and compares
 * forward vs. reverse direction on loops (clockwise vs. anticlockwise).
 */
function buildSectorCacheKey(
  trip: TripProfile,
  targetDate: string,
  departureTime: string,
  lang: Language,
  ftpWatts?: number
): string | null {
  const coords = trip.route?.coordinates;
  if (!coords || coords.length < 2) return null;
  const targetSpeedKmH = Math.max(8, trip.route?.targetSpeedKmH || 24);
  const first = coords[0];
  const last = coords[coords.length - 1];
  const distTag = Math.round((trip.route?.distanceKm || 0) * 10);
  const ftpTag = Math.round(ftpWatts || 0);
  return `${trip.id}:${distTag}:${first[0].toFixed(3)},${first[1].toFixed(3)}:${last[0].toFixed(3)},${last[1].toFixed(3)}:${targetDate}:${departureTime}:${Math.round(targetSpeedKmH)}:${trip.route?.pacingMode || 'speed'}:${lang}:${ftpTag}`;
}

export function getCachedRouteSectorForecast(
  trip: TripProfile,
  targetDate: string,
  departureTime: string,
  lang: Language = 'en',
  ftpWatts?: number
): RouteWeatherAnalysis | null {
  const key = buildSectorCacheKey(trip, targetDate, departureTime, lang, ftpWatts);
  return key ? sectorCache.get(key) || null : null;
}

export async function fetchRouteSectorForecast(
  trip: TripProfile,
  targetDate: string,
  departureTime: string,
  lang: Language = 'en',
  ftpWatts?: number
): Promise<RouteWeatherAnalysis | null> {
  const coords = trip.route?.coordinates;
  if (!coords || coords.length < 2) return null;

  const targetSpeedKmH = Math.max(8, trip.route?.targetSpeedKmH || 24);
  const cacheKey = buildSectorCacheKey(trip, targetDate, departureTime, lang, ftpWatts);
  if (!cacheKey) return null;

  const cached = sectorCache.get(cacheKey);
  if (cached) return cached;

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    const idbOffline = await loadSectorWeatherFromIdb<RouteWeatherAnalysis>(cacheKey);
    if (idbOffline) {
      sectorCache.set(cacheKey, idbOffline);
      return idbOffline;
    }
  }

  const sectorsGeom = buildSectors(
    coords,
    trip.route.distanceKm,
    trip.physics.gradientPercent ?? 0.5,
    trip.route.elevationProfile
  );

  const { isAvailable, daysOffset } = checkForecastHorizon(targetDate);
  let hourlyByIdx: HourlyPointData[] | null = null;
  let source: 'live' | 'planned' | 'simulated' = isAvailable
    ? daysOffset === 0
      ? 'live'
      : 'planned'
    : 'simulated';

  if (isAvailable) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const lats = sectorsGeom.map((s) => s.lat.toFixed(4)).join(',');
      const lons = sectorsGeom.map((s) => s.lon.toFixed(4)).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,visibility,is_day,weather_code&wind_speed_unit=kmh&timezone=auto&past_days=2&forecast_days=14`;
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json) ? json : [json];
        hourlyByIdx = arr.map((item) => item?.hourly).filter(Boolean);
        if (hourlyByIdx.length !== sectorsGeom.length) {
          hourlyByIdx = null;
          source = 'simulated';
        }
      } else {
        source = 'simulated';
      }
    } catch {
      hourlyByIdx = null;
      source = 'simulated';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const forwardSectors = evaluateDirectionPhysics(
    sectorsGeom,
    hourlyByIdx,
    trip,
    targetDate,
    departureTime,
    targetSpeedKmH,
    lang,
    ftpWatts
  );

  const { isLoop, orientation } = detectLoopOrientation(coords);
  const reverseSectorsGeom = [...sectorsGeom]
    .reverse()
    .map((s, idx) => ({
      ...s,
      index: idx,
      bearingDeg: (s.bearingDeg + 180) % 360,
      gradePct: -s.gradePct,
    }));
  const reverseHourly = hourlyByIdx ? [...hourlyByIdx].reverse() : null;

  const reverseSectors = isLoop
    ? evaluateDirectionPhysics(
        reverseSectorsGeom,
        reverseHourly,
        trip,
        targetDate,
        departureTime,
        targetSpeedKmH,
        lang,
        ftpWatts
      )
    : forwardSectors;

  const sumMin = (arr: RouteSectorForecast[]) => arr.reduce((a, b) => a + b.durationMin, 0);
  const avgWatts = (arr: RouteSectorForecast[]) =>
    Math.round(arr.reduce((a, b) => a + b.legWatts, 0) / Math.max(1, arr.length));

  const forwardTotalMin = sumMin(forwardSectors);
  const reverseTotalMin = sumMin(reverseSectors);
  const forwardAvgWatts = avgWatts(forwardSectors);
  const reverseAvgWatts = avgWatts(reverseSectors);

  const minDiff = forwardTotalMin - reverseTotalMin; // positive -> reverse is faster
  const wattDiff = forwardAvgWatts - reverseAvgWatts; // positive -> reverse takes fewer watts

  let recommendedDirection: 'forward' | 'reverse' | 'neutral' = 'neutral';
  if (isLoop) {
    if (minDiff >= 2 || wattDiff >= 5) {
      recommendedDirection = 'reverse';
    } else if (minDiff <= -2 || wattDiff <= -5) {
      recommendedDirection = 'forward';
    }
  }

  const coldestSector = forwardSectors.reduce(
    (minS, s) => (s.windChillC < minS.windChillC ? s : minS),
    forwardSectors[0]
  );
  const wettestSector = forwardSectors.reduce(
    (maxS, s) => (s.precipitationRiskPercent > maxS.precipitationRiskPercent ? s : maxS),
    forwardSectors[0]
  );

  const worstCaseWeather: WeatherCondition = {
    ...trip.weather,
    temperatureC: coldestSector.temperatureC,
    baseWindSpeedKmH: coldestSector.windSpeedKmH,
    effectiveHeadwindKmH: coldestSector.effectiveHeadwindKmH,
    isHeadwindActive: coldestSector.effectiveHeadwindKmH > 2,
    precipitationRiskPercent: Math.max(
      trip.weather.precipitationRiskPercent ?? 0,
      wettestSector.precipitationRiskPercent
    ),
    visibilityKm: Math.min(trip.weather.visibilityKm ?? 15, coldestSector.visibilityKm),
  };

  const coldestSectorLabel =
    lang === 'fr'
      ? `Secteur le plus frais : KM ${coldestSector.startKm}–${coldestSector.endKm} (${coldestSector.temperatureC}°C, ressenti ${coldestSector.windChillC}°C)`
      : `Coldest stretch: KM ${coldestSector.startKm}–${coldestSector.endKm} (${coldestSector.temperatureC}°C, feels ${coldestSector.windChillC}°C)`;

  const analysis: RouteWeatherAnalysis = {
    sectors: forwardSectors,
    loopComparison: {
      isLoop,
      forwardOrientation: orientation,
      recommendedDirection,
      forwardTotalMin,
      reverseTotalMin,
      forwardAvgWatts,
      reverseAvgWatts,
      minutesSaved: Math.abs(minDiff),
      wattsSaved: Math.abs(wattDiff),
    },
    coldestSector,
    wettestSector,
    worstCaseWeather,
    coldestSectorLabel,
    source,
  };

  if (source === 'simulated') {
    const idbFallback = await loadSectorWeatherFromIdb<RouteWeatherAnalysis>(cacheKey);
    if (idbFallback) {
      sectorCache.set(cacheKey, idbFallback);
      return idbFallback;
    }
  }

  sectorCache.set(cacheKey, analysis);
  if (source !== 'simulated') {
    void saveSectorWeatherToIdb(cacheKey, analysis);
  }
  return analysis;
}
