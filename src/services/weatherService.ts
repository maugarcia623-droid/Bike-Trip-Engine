/**
 * Open-Meteo Weather Service
 * High-precision meteorological telemetry for cycling commute routing.
 */

import { getSolarEphemeris } from '../utils/solarVisibility';

export interface TelemetryWeather {
  temperatureC: number;
  relativeHumidity: number;
  surfacePressureHpa: number;
  airDensityRho: number;         // kg/m³ derived from ideal gas law
  windSpeedKmH: number;
  windDirectionDegrees: number;   // Degrees (0° = N, 90° = E, 180° = S, 270° = W)
  windGustsKmH: number;
  routeBearingDegrees: number;   // Cyclist heading
  effectiveHeadwindKmH: number;  // Positive = Headwind, Negative = Tailwind
  isHeadwindActive: boolean;
  timestamp: string;
  source: 'live' | 'planned' | 'simulated';
  isBeyondForecastWindow: boolean;
  visibilityKm: number;
  isDay: boolean;
  weatherCode: number;
  sunriseIso?: string;
  sunsetIso?: string;
}

export interface DailyForecastDay {
  date: string;
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipitationSumMm: number;
  precipitationProbMax: number;
  windSpeedMaxKmH: number;
}

export interface WeeklyForecast {
  latitude: number;
  longitude: number;
  fetchedAt: string;
  days: DailyForecastDay[];
}

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const fallback = new Date(dateStr);
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes approximate compass bearing (0° = N, 90° = E, 180° = S, 270° = W)
 * from route coordinates if available, falling back to 280° (WNW Estuary).
 * For closed loops / out-and-back round trips where start ≈ end, uses the
 * outbound heading from start to the farthest turnaround point on the route.
 */
export function computeRouteBearing(coordinates?: [number, number][]): number {
  if (!coordinates || coordinates.length < 2) return 280;
  const [lat1, lon1] = coordinates[0];
  let [lat2, lon2] = coordinates[coordinates.length - 1];

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const approxDistSq = (a: [number, number], b: [number, number]) => {
    const dLat = b[0] - a[0];
    const dLon = (b[1] - a[1]) * Math.cos(toRad((a[0] + b[0]) / 2));
    return dLat * dLat + dLon * dLon;
  };

  if (coordinates.length >= 4) {
    let maxDistSq = 0;
    let apex = coordinates[Math.floor(coordinates.length / 2)];
    for (let i = 1; i < coordinates.length - 1; i++) {
      const dSq = approxDistSq(coordinates[0], coordinates[i]);
      if (dSq > maxDistSq) {
        maxDistSq = dSq;
        apex = coordinates[i];
      }
    }
    const endDistSq = approxDistSq(coordinates[0], coordinates[coordinates.length - 1]);
    // If net displacement is < 25% of the furthest point's distance, treat as round-trip loop
    if (maxDistSq > 0 && endDistSq < maxDistSq * 0.0625) {
      [lat2, lon2] = apex;
    }
  }

  if (lat1 === lat2 && lon1 === lon2) return 280;

  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}

const COMPASS_CARDINALS_EN = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
] as const;

const COMPASS_CARDINALS_FR = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO',
  'O', 'ONO', 'NO', 'NNO',
] as const;

/**
 * Converts meteorological degrees (0–360°) into a localized 16-point compass cardinal.
 */
export function degreesToCompassCardinal(degrees: number, lang: 'en' | 'fr' = 'en'): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return lang === 'fr' ? COMPASS_CARDINALS_FR[index] : COMPASS_CARDINALS_EN[index];
}

/**
 * Checks if a target date falls inside Open-Meteo 14-day forecast window
 */
export function checkForecastHorizon(targetDateStr: string): {
  isAvailable: boolean;
  daysOffset: number;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = parseLocalDate(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const daysOffset = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Open-Meteo provides 2 days of historical data + 14 days of forecast
  const isAvailable = daysOffset >= -2 && daysOffset <= 14;
  return { isAvailable, daysOffset };
}

/**
 * Calculates dry air density (rho in kg/m³) using barometric formula & temperature:
 * rho = (P_Pa) / (R_specific * T_Kelvin)
 */
export function calculateAirDensity(tempC: number, pressureHpa: number): number {
  const tempK = tempC + 273.15;
  const pressurePa = pressureHpa * 100;
  const R_SPECIFIC = 287.058;
  const rho = pressurePa / (R_SPECIFIC * tempK);
  return Number(rho.toFixed(3));
}

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const WEATHER_TIMEOUT_MS = 6000;
const WEATHER_MAX_CACHE_ENTRIES = 50;

const weatherResponseCache = new Map<string, { data: any; expiresAt: number }>();
const weatherInFlight = new Map<string, Promise<any>>();

async function fetchOpenMeteoForecast(lat: number, lon: number): Promise<any> {
  const key = `${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const now = Date.now();
  const cached = weatherResponseCache.get(key);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }
  if (cached) {
    weatherResponseCache.delete(key);
  }

  const existing = weatherInFlight.get(key);
  if (existing) {
    return existing;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,is_day,weather_code&daily=sunrise,sunset&wind_speed_unit=kmh&timezone=auto&past_days=2&forecast_days=14`;

  const requestPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.hourly?.time) {
        throw new Error('Malformed Open-Meteo response');
      }
      if (weatherResponseCache.size >= WEATHER_MAX_CACHE_ENTRIES) {
        const oldestKey = weatherResponseCache.keys().next().value;
        if (oldestKey !== undefined) {
          weatherResponseCache.delete(oldestKey);
        }
      }
      weatherResponseCache.set(key, {
        data,
        expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      });
      return data;
    } finally {
      clearTimeout(timeoutId);
      weatherInFlight.delete(key);
    }
  })();

  weatherInFlight.set(key, requestPromise);
  return requestPromise;
}

/**
 * Fetches hourly weather telemetry or falls back to simulation if beyond 14 days.
 */
export async function fetchHourlyWeather(
  lat: number,
  lon: number,
  targetDate: string, // "YYYY-MM-DD"
  targetTime: string, // "HH:MM"
  routeBearing: number = 280 // Heading (Nantes -> Saint-Nazaire is ~280° WNW)
): Promise<TelemetryWeather> {
  const { isAvailable, daysOffset } = checkForecastHorizon(targetDate);

  // If outside the 14-day window, apply statistical simulation
  if (!isAvailable) {
    const targetMonth = parseLocalDate(targetDate).getMonth();
    const isSummer = targetMonth >= 4 && targetMonth <= 8;
    const isWinter = targetMonth === 10 || targetMonth === 11 || targetMonth === 0 || targetMonth === 1;
    const fallbackTemp = isWinter ? 4 : isSummer ? 19 : 11;
    const fallbackWind = isWinter ? 18 : 14;
    const fallbackDir = 245; // Prevailing Atlantic WSW
    const fallbackPressure = 1015;
    const rho = calculateAirDensity(fallbackTemp, fallbackPressure);

    const angleDiffRad = ((fallbackDir - routeBearing) * Math.PI) / 180;
    const effectiveHeadwind = Number((fallbackWind * Math.cos(angleDiffRad)).toFixed(1));

    const solar = getSolarEphemeris(lat, lon, targetDate);
    const [h, m] = targetTime.split(':').map(Number);
    const targetMin = (h || 7) * 60 + (m || 30);
    const [srH, srM] = solar.sunrise.split(':').map(Number);
    const [ssH, ssM] = solar.sunset.split(':').map(Number);
    const srMin = srH * 60 + srM;
    const ssMin = ssH * 60 + ssM;
    const isDay = targetMin >= srMin && targetMin <= ssMin;

    const fallbackVisKm = isWinter ? (targetMin < srMin + 60 ? 2.8 : 4.5) : 18;

    return {
      temperatureC: fallbackTemp,
      relativeHumidity: isWinter ? 85 : 70,
      surfacePressureHpa: fallbackPressure,
      airDensityRho: rho,
      windSpeedKmH: fallbackWind,
      windDirectionDegrees: fallbackDir,
      windGustsKmH: Math.round(fallbackWind * 1.5),
      routeBearingDegrees: Math.round(routeBearing),
      effectiveHeadwindKmH: effectiveHeadwind,
      isHeadwindActive: effectiveHeadwind > 2,
      timestamp: `${targetDate}T${targetTime}:00`,
      source: 'simulated',
      isBeyondForecastWindow: true,
      visibilityKm: fallbackVisKm,
      isDay,
      weatherCode: isWinter ? 3 : 0,
      sunriseIso: `${targetDate}T${solar.sunrise}:00`,
      sunsetIso: `${targetDate}T${solar.sunset}:00`,
    };
  }

  // Fetch deterministic model from Open-Meteo (with 6s timeout, 10m TTL cache, and in-flight deduplication)
  const data = await fetchOpenMeteoForecast(lat, lon);
  const hourly = data.hourly;

  // Match target hour e.g. "2026-10-27T07:00"
  const targetHour = `${targetDate}T${targetTime.split(':')[0]}:00`;
  let index = hourly.time.findIndex((t: string) => t.startsWith(targetHour));
  if (index === -1) index = 0;

  const tempC = Math.round(hourly.temperature_2m[index] ?? 12);
  const pressure = Math.round(hourly.surface_pressure[index] ?? 1013);
  const humidity = Math.round(hourly.relative_humidity_2m[index] ?? 75);
  const windSpeed = Math.round(hourly.wind_speed_10m[index] ?? 10);
  const windDir = Math.round(hourly.wind_direction_10m[index] ?? 240);
  const windGusts = Math.round(hourly.wind_gusts_10m[index] ?? windSpeed * 1.5);

  const rawVisM = hourly.visibility?.[index] ?? 15000;
  const visKm = Math.round((rawVisM / 1000) * 10) / 10;
  const isDay = (hourly.is_day?.[index] ?? 1) === 1;
  const weatherCode = hourly.weather_code?.[index] ?? 0;

  const dailyIndex = data.daily?.time?.findIndex((t: string) => t === targetDate) ?? 0;
  const sunriseIso = data.daily?.sunrise?.[dailyIndex >= 0 ? dailyIndex : 0];
  const sunsetIso = data.daily?.sunset?.[dailyIndex >= 0 ? dailyIndex : 0];

  const rho = calculateAirDensity(tempC, pressure);

  const angleDiffRad = ((windDir - routeBearing) * Math.PI) / 180;
  const effectiveHeadwind = Number((windSpeed * Math.cos(angleDiffRad)).toFixed(1));

  return {
    temperatureC: tempC,
    relativeHumidity: humidity,
    surfacePressureHpa: pressure,
    airDensityRho: rho,
    windSpeedKmH: windSpeed,
    windDirectionDegrees: windDir,
    windGustsKmH: windGusts,
    routeBearingDegrees: Math.round(routeBearing),
    effectiveHeadwindKmH: effectiveHeadwind,
    isHeadwindActive: effectiveHeadwind > 2,
    timestamp: hourly.time[index],
    source: daysOffset === 0 ? 'live' : 'planned',
    isBeyondForecastWindow: false,
    visibilityKm: visKm,
    isDay,
    weatherCode,
    sunriseIso,
    sunsetIso,
  };
}

const WEEKLY_WEATHER_STORAGE_KEY = 'cadence_weekly_weather_v1';
const WEEKLY_WEATHER_TTL_MS = 60 * 60 * 1000; // 60 minutes

const weeklyMemoryCache = new Map<string, { forecast: WeeklyForecast; expiresAt: number }>();
const weeklyInFlight = new Map<string, Promise<WeeklyForecast>>();

function getWeeklyCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}:${lon.toFixed(2)}:${getLocalTodayIso()}`;
}

/**
 * Reads a cached 7-day forecast synchronously if still valid for today and this location.
 */
export function getCachedWeeklyWeather(lat: number, lon: number): WeeklyForecast | null {
  const key = getWeeklyCacheKey(lat, lon);
  const now = Date.now();
  const mem = weeklyMemoryCache.get(key);
  if (mem && now < mem.expiresAt) {
    return mem.forecast;
  }

  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WEEKLY_WEATHER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: string; expiresAt?: number; forecast?: WeeklyForecast };
    if (
      parsed &&
      parsed.key === key &&
      typeof parsed.expiresAt === 'number' &&
      now < parsed.expiresAt &&
      parsed.forecast?.days?.length
    ) {
      weeklyMemoryCache.set(key, { forecast: parsed.forecast, expiresAt: parsed.expiresAt });
      return parsed.forecast;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function saveCachedWeeklyWeather(key: string, forecast: WeeklyForecast): void {
  const expiresAt = Date.now() + WEEKLY_WEATHER_TTL_MS;
  weeklyMemoryCache.set(key, { forecast, expiresAt });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEEKLY_WEATHER_STORAGE_KEY, JSON.stringify({ key, expiresAt, forecast }));
    }
  } catch {
    // Ignore quota / storage errors
  }
}

/**
 * Fetches a 7-day daily weather overview from Open-Meteo for the given coordinates.
 */
export async function fetchWeeklyWeather(lat: number, lon: number): Promise<WeeklyForecast> {
  const cached = getCachedWeeklyWeather(lat, lon);
  if (cached) {
    return cached;
  }

  const key = getWeeklyCacheKey(lat, lon);
  const existing = weeklyInFlight.get(key);
  if (existing) {
    return existing;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

  const requestPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      const daily = data?.daily;
      if (!daily?.time || !Array.isArray(daily.time) || daily.time.length === 0) {
        throw new Error('Malformed Open-Meteo daily forecast response');
      }

      const days: DailyForecastDay[] = daily.time.map((date: string, i: number) => ({
        date,
        weatherCode: Number(daily.weather_code?.[i] ?? 0),
        tempMaxC: Number(daily.temperature_2m_max?.[i] ?? 15),
        tempMinC: Number(daily.temperature_2m_min?.[i] ?? 8),
        precipitationSumMm: Number(daily.precipitation_sum?.[i] ?? 0),
        precipitationProbMax: Number(daily.precipitation_probability_max?.[i] ?? 0),
        windSpeedMaxKmH: Number(daily.wind_speed_10m_max?.[i] ?? 10),
      }));

      const forecast: WeeklyForecast = {
        latitude: lat,
        longitude: lon,
        fetchedAt: new Date().toISOString(),
        days,
      };
      saveCachedWeeklyWeather(key, forecast);
      return forecast;
    } finally {
      clearTimeout(timeoutId);
      weeklyInFlight.delete(key);
    }
  })();

  weeklyInFlight.set(key, requestPromise);
  return requestPromise;
}
