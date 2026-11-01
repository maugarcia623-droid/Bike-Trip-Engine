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
 */
export function computeRouteBearing(coordinates?: [number, number][]): number {
  if (!coordinates || coordinates.length < 2) return 280;
  const [lat1, lon1] = coordinates[0];
  const [lat2, lon2] = coordinates[coordinates.length - 1];
  if (lat1 === lat2 && lon1 === lon2) return 280;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

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

  // Fetch deterministic model from Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,is_day,weather_code&daily=sunrise,sunset&wind_speed_unit=kmh&timezone=auto&past_days=2&forecast_days=14`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  const hourly = data.hourly;
  if (!hourly || !hourly.time) {
    throw new Error('Malformed Open-Meteo response');
  }

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
