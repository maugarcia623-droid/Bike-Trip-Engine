/**
 * Solar & Atmospheric Visibility Engine
 * Mathematical solar ephemeris, ambient light phases, and winter cycling visibility analysis.
 */

import { TripProfile } from '../types/trip';

export type AmbientLightPhase =
  | 'deep-night'         // Sun < -12° (Pitch dark, zero ambient lux)
  | 'nautical-twilight'  // -12° <= Sun < -6° (Deep dusk/dawn, stars visible)
  | 'civil-twilight'     // -6° <= Sun < 0° (Civil dawn/dusk, sky luminous but ground dark)
  | 'golden-hour'        // 0° <= Sun < 15° (Low sun angle, strong glare)
  | 'daylight';          // Sun >= 15° (High ambient daylight)

export type VisibilityCategory =
  | 'dense-fog'   // < 1 km
  | 'mist-haze'   // 1 - 4 km
  | 'reduced'     // 4 - 10 km
  | 'good'        // 10 - 20 km
  | 'crystal';    // > 20 km

export interface SolarEphemeris {
  solarNoon: string;
  sunrise: string;
  sunset: string;
  civilDawn: string;
  civilDusk: string;
  nauticalDawn: string;
  nauticalDusk: string;
  daylightMinutes: number;
  daylightHoursFormatted: string;
  maxSolarElevationDeg: number;
  isWinterSolsticeWindow: boolean;
}

export interface VisibilitySuggestion {
  id: string;
  category: 'lighting' | 'reflective' | 'eyewear' | 'battery' | 'surface';
  critical: boolean;
  titleEn: string;
  titleFr: string;
  detailEn: string;
  detailFr: string;
  badgeEn?: string;
  badgeFr?: string;
}

export interface RideVisibilityAnalysis {
  rolloutTime: string;
  arrivalTime: string;
  movingMinutes: number;
  dateStr: string;
  isSimulatedWinterDate: boolean;
  solar: SolarEphemeris;
  rolloutElevationDeg: number;
  arrivalElevationDeg: number;
  rolloutPhase: AmbientLightPhase;
  arrivalPhase: AmbientLightPhase;
  nightPercent: number;
  twilightPercent: number;
  daylightPercent: number;
  overallCondition:
    | 'pitch-dark'
    | 'twilight-dawn'
    | 'twilight-dusk'
    | 'winter-overcast'
    | 'bright-daylight';
  opticalHazardLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  visibilityKm: number;
  visibilityCategory: VisibilityCategory;
  weatherCode: number;
  weatherDescEn: string;
  weatherDescFr: string;
  isWinterTrip: boolean;
  lightingGear: {
    recommendedLumens: string; // e.g. "800 – 1000 lm"
    minLumens: number;
    maxLumens: number;
    lumenSpectrumPosition: number; // 0 to 100 for gauge
    beamModeEn: string;
    beamModeFr: string;
    rearBeaconEn: string;
    rearBeaconFr: string;
    batteryNoticeEn: string;
    batteryNoticeFr: string;
  };
  passiveGear: {
    reflectiveApparelEn: string;
    reflectiveApparelFr: string;
    ankleBandsEn: string;
    ankleBandsFr: string;
    eyewearEn: string;
    eyewearFr: string;
  };
  surfaceCaution: {
    isBlackIceRisk: boolean;
    messageEn?: string;
    messageFr?: string;
  };
  summaryRecommendationEn: string;
  summaryRecommendationFr: string;
  suggestions: VisibilitySuggestion[];
}

/**
 * Converts degrees to radians
 */
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Converts radians to degrees
 */
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Formats fractional minutes from midnight into HH:MM
 */
export function minutesToHHMM(totalMinutes: number): string {
  let m = Math.round(totalMinutes);
  while (m < 0) m += 1440;
  m = m % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Parses "HH:MM" into minutes from midnight
 */
export function hhmmToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Approximate local timezone offset in hours based on date and longitude.
 * For Western Europe (France, etc.), winter standard time is UTC+1 (CET), summer is UTC+2 (CEST).
 */
export function getApproxTimezoneOffset(dateStr: string, lon: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  
  // Try using browser's Intl API if in local timezone
  try {
    const tzMatch = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzMatch) {
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tzMatch }));
      const diffHours = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
      if (!Number.isNaN(diffHours) && diffHours >= -12 && diffHours <= 14) {
        return diffHours;
      }
    }
  } catch {
    // Fallback based on longitude and European DST rules
  }

  // Western Europe fallback:
  // DST starts last Sunday of March, ends last Sunday of October
  const month = (m || 1);
  const isSummerCET = month >= 4 && month <= 9;
  if (lon >= -5 && lon <= 15) {
    return isSummerCET ? 2 : 1;
  }
  return Math.round(lon / 15);
}

/**
 * Astronomical Solar Ephemeris Calculation
 * Uses standard NOAA / Meeus algorithms for solar declination, equation of time, and hour angles.
 */
export function getSolarEphemeris(
  lat: number,
  lon: number,
  dateStr: string,
  tzOffsetHours?: number
): SolarEphemeris {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const start = new Date(y, 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));

  const tz = tzOffsetHours ?? getApproxTimezoneOffset(dateStr, lon);
  const phi = toRad(lat);

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // Equation of time in minutes
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination in radians
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Solar noon in minutes from local midnight
  const timeOffset = eqtime + 4 * lon - 60 * tz;
  const solarNoonMin = 720 - timeOffset;

  // Hour angle solver for specific zenith angle
  const calcHourAngle = (zenithDeg: number): number | null => {
    const cosHA =
      (Math.cos(toRad(zenithDeg)) - Math.sin(phi) * Math.sin(decl)) /
      (Math.cos(phi) * Math.cos(decl));
    if (cosHA > 1) return null; // Polar night / sun never reaches zenith
    if (cosHA < -1) return Math.PI; // Midnight sun
    return Math.acos(cosHA);
  };

  // Standard sunrise/sunset: 90.833° (atmospheric refraction + solar disk radius)
  const haSunrise = calcHourAngle(90.833) ?? toRad(60);
  // Civil twilight: 96° (sun 6° below horizon)
  const haCivil = calcHourAngle(96.0) ?? toRad(70);
  // Nautical twilight: 102° (sun 12° below horizon)
  const haNautical = calcHourAngle(102.0) ?? toRad(80);

  const sunriseMin = solarNoonMin - toDeg(haSunrise) * 4;
  const sunsetMin = solarNoonMin + toDeg(haSunrise) * 4;
  const dawnMin = solarNoonMin - toDeg(haCivil) * 4;
  const duskMin = solarNoonMin + toDeg(haCivil) * 4;
  const nautDawnMin = solarNoonMin - toDeg(haNautical) * 4;
  const nautDuskMin = solarNoonMin + toDeg(haNautical) * 4;

  const daylightMinutes = Math.max(0, Math.round(toDeg(haSunrise) * 8));
  const dlHours = Math.floor(daylightMinutes / 60);
  const dlMins = daylightMinutes % 60;

  // Max solar elevation at noon
  const maxElevation = 90 - Math.abs(lat - toDeg(decl));

  // Winter solstice window: mid-November to mid-February
  const isWinterSolsticeWindow = (dayOfYear >= 315 || dayOfYear <= 50);

  return {
    solarNoon: minutesToHHMM(solarNoonMin),
    sunrise: minutesToHHMM(sunriseMin),
    sunset: minutesToHHMM(sunsetMin),
    civilDawn: minutesToHHMM(dawnMin),
    civilDusk: minutesToHHMM(duskMin),
    nauticalDawn: minutesToHHMM(nautDawnMin),
    nauticalDusk: minutesToHHMM(nautDuskMin),
    daylightMinutes,
    daylightHoursFormatted: `${dlHours}h ${dlMins.toString().padStart(2, '0')}m`,
    maxSolarElevationDeg: Math.round(maxElevation * 10) / 10,
    isWinterSolsticeWindow,
  };
}

/**
 * Calculates solar elevation angle (altitude in degrees above horizon) at a specific time
 */
export function getSolarElevation(
  lat: number,
  lon: number,
  dateStr: string,
  timeStr: string,
  tzOffsetHours?: number
): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const start = new Date(y, 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));

  const tz = tzOffsetHours ?? getApproxTimezoneOffset(dateStr, lon);
  const phi = toRad(lat);
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const minutesFromMidnight = hhmmToMinutes(timeStr);
  const timeOffset = eqtime + 4 * lon - 60 * tz;
  const trueSolarTime = minutesFromMidnight + timeOffset;

  // Hour angle in degrees (-180° at solar midnight, 0° at solar noon)
  const ha = (trueSolarTime / 4) - 180;
  const haRad = toRad(ha);

  const sinElevation =
    Math.sin(phi) * Math.sin(decl) +
    Math.cos(phi) * Math.cos(decl) * Math.cos(haRad);

  const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
  return Math.round(toDeg(elevationRad) * 10) / 10;
}

/**
 * Classifies an elevation angle into an AmbientLightPhase
 */
export function getAmbientLightPhase(elevationDeg: number): AmbientLightPhase {
  if (elevationDeg < -12) return 'deep-night';
  if (elevationDeg < -6) return 'nautical-twilight';
  if (elevationDeg < 0) return 'civil-twilight';
  if (elevationDeg < 15) return 'golden-hour';
  return 'daylight';
}

/**
 * Classifies visibility distance into standard meteorological categories
 */
export function getVisibilityCategory(visKm: number): VisibilityCategory {
  if (visKm < 1.0) return 'dense-fog';
  if (visKm < 4.0) return 'mist-haze';
  if (visKm < 10.0) return 'reduced';
  if (visKm < 20.0) return 'good';
  return 'crystal';
}

/**
 * WMO Weather code human description
 */
export function getWmoWeatherDescription(code: number = 0): { en: string; fr: string } {
  if (code === 0) return { en: 'Clear sky', fr: 'Ciel dégagé' };
  if (code === 1 || code === 2) return { en: 'Partly cloudy', fr: 'Éclaircies' };
  if (code === 3) return { en: 'Overcast winter sky', fr: 'Couvert hivernal' };
  if (code === 45 || code === 48) return { en: 'Dense fog / Freezing mist', fr: 'Brouillard givrant' };
  if (code >= 51 && code <= 55) return { en: 'Fine drizzle', fr: 'Bruine persistante' };
  if (code >= 61 && code <= 65) return { en: 'Cold rain', fr: 'Pluie froide' };
  if (code >= 71 && code <= 77) return { en: 'Snow flurries / Ice pellets', fr: 'Averses de neige / Grésil' };
  if (code >= 80 && code <= 82) return { en: 'Rain showers', fr: 'Averses de pluie' };
  return { en: 'Atmospheric murk', fr: 'Brume atmosphérique' };
}

/**
 * Evaluates visibility and solar conditions for a planned ride and provides
 * precision lighting, lumen rating, reflective apparel, and safety suggestions.
 */
export function calculateRideVisibility(
  trip: TripProfile,
  customDate?: string,
  customRolloutTime?: string,
  effectiveSpeedOverrideKmH?: number
): RideVisibilityAnalysis {
  const coords: [number, number] =
    trip.route.coordinates?.[0] || [47.2184, -1.5536]; // Default to Nantes corridor
  const lat = coords[0];
  const lon = coords[1];

  const dateStr = customDate || trip.departureDate || new Date().toISOString().split('T')[0];
  const isSimulatedWinterDate = dateStr.includes('-12-') || dateStr.includes('-01-');

  const tz = getApproxTimezoneOffset(dateStr, lon);
  const solar = getSolarEphemeris(lat, lon, dateStr, tz);

  // Moving duration from solved physics speed or trip target speed
  const targetSpeed = Math.max(6, effectiveSpeedOverrideKmH || trip.route.targetSpeedKmH || 25);
  const distance = Math.max(1, trip.route.distanceKm || 20);
  const movingMinutes = Math.round((distance / targetSpeed) * 60);

  // Determine rollout time
  const rolloutTime = customRolloutTime || trip.departureTime || '07:15';
  const rolloutMin = hhmmToMinutes(rolloutTime);
  const arrivalMin = (rolloutMin + movingMinutes) % 1440;
  const arrivalTime = minutesToHHMM(arrivalMin);

  // Sample elevation at rollout and arrival
  const rolloutElevationDeg = getSolarElevation(lat, lon, dateStr, rolloutTime, tz);
  const arrivalElevationDeg = getSolarElevation(lat, lon, dateStr, arrivalTime, tz);

  const rolloutPhase = getAmbientLightPhase(rolloutElevationDeg);
  const arrivalPhase = getAmbientLightPhase(arrivalElevationDeg);

  // Sample 7 discrete intervals across the ride to calculate light breakdown
  let nightCount = 0;
  let twilightCount = 0;
  let daylightCount = 0;
  const sampleSteps = 7;

  for (let i = 0; i < sampleSteps; i++) {
    const frac = i / (sampleSteps - 1);
    const sampleMin = (rolloutMin + Math.round(movingMinutes * frac)) % 1440;
    const elev = getSolarElevation(lat, lon, dateStr, minutesToHHMM(sampleMin), tz);
    if (elev < -6) {
      nightCount++;
    } else if (elev < 0) {
      twilightCount++;
    } else {
      daylightCount++;
    }
  }

  const nightPercent = Math.round((nightCount / sampleSteps) * 100);
  const twilightPercent = Math.round((twilightCount / sampleSteps) * 100);
  const daylightPercent = Math.max(0, 100 - nightPercent - twilightPercent);

  // Meteorological visibility: use trip weather or estimate from date/season
  const [yearNum, monthNum] = dateStr.split('-').map(Number);
  const isWinterTrip = monthNum === 11 || monthNum === 12 || monthNum === 1 || monthNum === 2;

  let visKm = trip.weather?.visibilityKm ?? (isWinterTrip ? 3.5 : 18);
  if (isSimulatedWinterDate && !trip.weather?.visibilityKm) {
    visKm = 2.8; // Realistic morning winter haze/mist
  }

  const visibilityCategory = getVisibilityCategory(visKm);
  const weatherCode = trip.weather?.weatherCode ?? (isWinterTrip ? 3 : 0);
  const weatherDesc = getWmoWeatherDescription(weatherCode);

  // Overall condition descriptor
  let overallCondition: RideVisibilityAnalysis['overallCondition'] = 'bright-daylight';
  if (nightPercent >= 50) {
    overallCondition = 'pitch-dark';
  } else if (twilightPercent >= 40 && rolloutElevationDeg < arrivalElevationDeg) {
    overallCondition = 'twilight-dawn';
  } else if (twilightPercent >= 40 && rolloutElevationDeg >= arrivalElevationDeg) {
    overallCondition = 'twilight-dusk';
  } else if (isWinterTrip || daylightPercent < 70) {
    overallCondition = 'winter-overcast';
  }

  // Optical Hazard Level
  let opticalHazardLevel: RideVisibilityAnalysis['opticalHazardLevel'] = 'low';
  if (overallCondition === 'pitch-dark' || visibilityCategory === 'dense-fog') {
    opticalHazardLevel = 'critical';
  } else if (overallCondition === 'twilight-dawn' || overallCondition === 'twilight-dusk' || visibilityCategory === 'mist-haze') {
    opticalHazardLevel = 'elevated';
  } else if (overallCondition === 'winter-overcast' || visibilityCategory === 'reduced') {
    opticalHazardLevel = 'moderate';
  }

  // Lumen & Lighting recommendations
  let recommendedLumens = '800 – 1000 lm';
  let minLumens = 800;
  let maxLumens = 1000;
  let lumenSpectrumPosition = 75; // 0 to 100%

  if (overallCondition === 'pitch-dark' || visibilityCategory === 'dense-fog' || (isWinterTrip && rolloutElevationDeg < -3)) {
    // Pitch dark or dense fog or mid-December early commute
    recommendedLumens = '800 – 1000 lm';
    minLumens = 800;
    maxLumens = 1000;
    lumenSpectrumPosition = 82;
  } else if (overallCondition === 'twilight-dawn' || overallCondition === 'twilight-dusk' || visibilityCategory === 'mist-haze') {
    recommendedLumens = '500 – 700 lm';
    minLumens = 500;
    maxLumens = 700;
    lumenSpectrumPosition = 55;
  } else if (overallCondition === 'winter-overcast' || visibilityCategory === 'reduced') {
    recommendedLumens = '300 – 500 lm';
    minLumens = 300;
    maxLumens = 500;
    lumenSpectrumPosition = 35;
  } else {
    // Clear daylight
    recommendedLumens = '200 – 400 lm (Daytime Pulse)';
    minLumens = 200;
    maxLumens = 400;
    lumenSpectrumPosition = 20;
  }

  const lightingGear = {
    recommendedLumens,
    minLumens,
    maxLumens,
    lumenSpectrumPosition,
    beamModeEn:
      minLumens >= 800
        ? 'High-intensity focused beam (StVZO cutoff recommended)'
        : minLumens >= 500
        ? 'Medium continuous beam with wide peripheral spill'
        : 'Daytime hyper-flash / penetrating pulse mode',
    beamModeFr:
      minLumens >= 800
        ? 'Faisceau longue portée focalisé (faisceau coupé StVZO recommandé)'
        : minLumens >= 500
        ? 'Faisceau continu médium avec diffusion périphérique large'
        : 'Mode flash pulsé haute visibilité diurne',
    rearBeaconEn: 'Multi-LED pulse red beacon (≥ 50–100 lm) visible from 1 km',
    rearBeaconFr: 'Feu rouge clignotant haute puissance (≥ 50–100 lm) visible à 1 km',
    batteryNoticeEn:
      'Sub-5°C winter cold cuts Lithium-ion runtime by 25–35%. Ensure 100% full charge prior to rollout.',
    batteryNoticeFr:
      'Le froid hivernal (< 5°C) ampute l’autonomie lithium de 25 à 35%. Départ impératif à 100% de charge.',
  };

  const passiveGear = {
    reflectiveApparelEn:
      'EN ISO 20471 / EN 17353 certified reflective vest or sash + high-contrast Volt outer shell',
    reflectiveApparelFr:
      'Gilet ou harnais rétro-réfléchissant certifié EN 17353 + veste extérieure jaune Volt',
    ankleBandsEn:
      'Retro-reflective ankle bands: rotating pedal motion triggers motorist recognition 3× faster in headlights',
    ankleBandsFr:
      'Bandes réfléchissantes de chevilles : le mouvement de pédalage alerte les conducteurs 3× plus vite',
    eyewearEn:
      'Clear or yellow/amber contrast photochromic lenses (avoid dark tinted sunglasses in winter twilight)',
    eyewearFr:
      'Verres transparents ou photochromiques jaunes/ambre (proscrire les verres solaires foncés)',
  };

  const tempC = trip.weather?.temperatureC ?? (isWinterTrip ? 2 : 14);
  const isBlackIceRisk = isWinterTrip && tempC <= 3.5 && (visKm < 5 || (trip.weather?.precipitationRiskPercent || 0) > 30);

  const surfaceCaution = {
    isBlackIceRisk,
    messageEn: isBlackIceRisk
      ? `Cold surface alert (${tempC}°C + wet fog): Watch for black ice on bridge expansion joints, riverbanks, and shaded turns.`
      : undefined,
    messageFr: isBlackIceRisk
      ? `Alerte verglas (${tempC}°C + brume humide) : Méfiance sur ponts métalliques, berges et virages ombragés.`
      : undefined,
  };

  // Structured Actionable Suggestions
  const suggestions: VisibilitySuggestion[] = [];

  // Suggestion 1: Front High-Beam Lighting
  if (minLumens >= 800) {
    suggestions.push({
      id: 'vis-front-beam',
      category: 'lighting',
      critical: true,
      badgeEn: '800–1000 Lumens',
      badgeFr: '800–1000 Lumens',
      titleEn: 'High-Output 800 to 1,000 Lumen Headlight Mandatory',
      titleFr: 'Éclairage avant puissant 800 à 1 000 Lumens impératif',
      detailEn:
        'With low winter ambient light or early morning darkness, an 800 to 1000 lumen headlight is essential to illuminate road obstacles, potholes, and wet asphalt 40–50 meters ahead at cruising pace.',
      detailFr:
        'En condition d’obscurité ou de faible luminosité hivernale, un feu avant de 800 à 1 000 lumens est indispensable pour éclairer la chaussée, les nids-de-poule et l’asphalte mouillé à 40–50 mètres à vive allure.',
    });
  } else if (minLumens >= 500) {
    suggestions.push({
      id: 'vis-front-beam-med',
      category: 'lighting',
      critical: false,
      badgeEn: '500–700 Lumens',
      badgeFr: '500–700 Lumens',
      titleEn: '500 to 700 Lumen Headlight for Twilight Transition',
      titleFr: 'Éclairage 500 à 700 Lumens pour transition crépusculaire',
      detailEn:
        'Dawn and dusk reduce visual contrast dramatically. Run 500–700 lumens with wide beam spread to illuminate unlit road segments while maintaining pedestrian awareness.',
      detailFr:
        'L’aube et le crépuscule réduisent drastiquement les contrastes. Activez 500 à 700 lumens avec faisceau large pour les sections non éclairées.',
    });
  } else {
    suggestions.push({
      id: 'vis-front-daytime',
      category: 'lighting',
      critical: false,
      badgeEn: 'Daytime Pulse',
      badgeFr: 'Flash Diurne',
      titleEn: 'Daytime Penetrating Pulse Light',
      titleFr: 'Feu flash diurne anti-brouillard',
      detailEn:
        'Run front and rear flashing beacons (200–400 lm) to stay visible through diffuse moisture and low winter sunlight glare.',
      detailFr:
        'Conservez un flash avant/arrière actif (200–400 lm) pour percer la brume et le contre-jour du soleil rasant.',
    });
  }

  // Suggestion 2: 360° Passive Reflective Gear & "Be Seen in the Dark"
  suggestions.push({
    id: 'vis-reflective-gear',
    category: 'reflective',
    critical: overallCondition === 'pitch-dark' || overallCondition === 'twilight-dawn',
    badgeEn: 'EN 17353 / ISO 20471',
    badgeFr: 'Norme EN 17353',
    titleEn: 'Passive Reflective Gear & 360° Bio-Motion Ankle Bands',
    titleFr: 'Gilet réfléchissant & bandes de chevilles bio-dynamiques',
    detailEn:
      'Wear an EN 17353 certified reflective vest or sash to be seen from 300m. Add retro-reflective ankle bands: rotating pedal motion triggers motorist human-reflex recognition 3× faster than static torso reflectors.',
    detailFr:
      'Portez un gilet ou baudrier réfléchissant certifié pour être vu à 300 m. Ajoutez des serre-pantalons réfléchissants : le mouvement rotatif du pédalage est détecté 3× plus vite par les automobilistes.',
  });

  // Suggestion 3: Winter Cold Battery Drain
  if (isWinterTrip || tempC <= 6) {
    suggestions.push({
      id: 'vis-battery-drain',
      category: 'battery',
      critical: false,
      badgeEn: 'Winter Battery -30%',
      badgeFr: 'Batterie Froid -30%',
      titleEn: 'Cold Ambient Battery Degradation Warning',
      titleFr: 'Alerte autonomie batterie par temps froid (< 5°C)',
      detailEn:
        'Freezing temperatures drop Lithium-ion battery capacity by 25–35%. Top off all lights to 100% before rollout, and avoid high-power modes in illuminated urban zones to conserve runtime.',
      detailFr:
        'Le froid abaisse la capacité des cellules lithium de 25 à 35%. Rechargez à 100% avant le départ et basculez en mode éco sur les tronçons urbains éclairés pour préserver l’autonomie.',
    });
  }

  // Suggestion 4: Optical Eyewear
  suggestions.push({
    id: 'vis-eyewear',
    category: 'eyewear',
    critical: false,
    badgeEn: 'Yellow / Clear Lenses',
    badgeFr: 'Verres Clairs / Jaunes',
    titleEn: 'High-Contrast Yellow or Clear Eyewear',
    titleFr: 'Lunettes à verres clairs ou contrastés jaune/ambre',
    detailEn:
      'Never wear dark sunglasses in winter dawn or dusk. Use clear or high-contrast yellow lenses to shield eyes from sub-zero headwind, grit, and tire spray without losing terrain definition.',
    detailFr:
      'Évitez les verres solaires foncés à l’aube et au crépuscule. Utilisez des verres transparents ou jaunes amplificateurs de contraste contre le vent glacial et les projections.',
  });

  // Suggestion 5: Surface Black Ice Risk
  if (isBlackIceRisk) {
    suggestions.push({
      id: 'vis-black-ice',
      category: 'surface',
      critical: true,
      badgeEn: 'Black Ice Caution',
      badgeFr: 'Danger Verglas',
      titleEn: 'Morning Black Ice & Low-Contrast Surface Hazard',
      titleFr: 'Risque de verglas matinal & chaussée glissante',
      detailEn:
        `Ambient temperature is ${tempC}°C with wet air. In darkness or low dawn light, thin transparent black ice is invisible. Drop tire pressure slightly (0.3 bar) and avoid aggressive braking on bridge joints and damp canal towpaths.`,
      detailFr:
        `Température de ${tempC}°C avec air saturé. Dans l’obscurité, les plaques de verglas sont indétectables. Réduisez légèrement la pression des pneus (0,3 bar) et évitez tout freinage brusque sur les ponts.`,
    });
  }

  // Synthesize concise overall recommendation
  let summaryRecommendationEn = '';
  let summaryRecommendationFr = '';

  if (minLumens >= 800 || overallCondition === 'pitch-dark') {
    summaryRecommendationEn = `Rollout is in deep darkness before dawn. Mount an 800 to 1,000 lumen headlight in high-beam mode to see the road ahead, wear reflective gear with rotating ankle bands to be seen, and ensure lights are fully charged (cold drops battery runtime by ~30%).`;
    summaryRecommendationFr = `Départ en pleine nuit avant l'aube. Équipez un feu avant de 800 à 1 000 lumens en plein phare pour éclairer la route, portez un gilet et des bandes de cheville réfléchissantes pour être vu, et partez à 100% de charge (le froid réduit l'autonomie de ~30%).`;
  } else if (minLumens >= 500 || overallCondition === 'twilight-dawn' || overallCondition === 'twilight-dusk') {
    summaryRecommendationEn = `Low-contrast twilight transition across your route. Run a 500–700 lumen continuous beam to illuminate unlit road segments, and wear high-contrast reflective outer gear to stay visible to drivers.`;
    summaryRecommendationFr = `Transition crépusculaire à faible contraste. Utilisez un faisceau continu de 500 à 700 lumens pour éclairer les zones d'ombre, et portez une tenue rétro-réfléchissante contrastée.`;
  } else if (visKm < 4) {
    summaryRecommendationEn = `Atmospheric mist and moisture reduce road visibility to ${visKm} km. Keep daytime penetrating pulse lights active front and rear, and use clear or yellow contrast eyewear against cold wind.`;
    summaryRecommendationFr = `Brume et humidité réduisent la visibilité à ${visKm} km. Maintenez des feux flash pulsés actifs à l'avant et à l'arrière, et portez des verres clairs ou jaunes contre le vent frais.`;
  } else {
    summaryRecommendationEn = `Favorable daylight visibility throughout the ride. Keep a daytime safety flasher active for traffic awareness, and wear clear or UV eyewear.`;
    summaryRecommendationFr = `Visibilité optimale en plein jour. Conservez un feu clignotant diurne pour vous signaler aux automobilistes, et prévoyez des verres adaptés aux reflets.`;
  }

  if (isBlackIceRisk) {
    summaryRecommendationEn += ` Caution: near-freezing surface (${tempC}°C) — watch for black ice on bridges and damp turns.`;
    summaryRecommendationFr += ` Attention : chaussée froide (${tempC}°C) — risque de verglas sur ponts et virages humides.`;
  }

  return {
    rolloutTime,
    arrivalTime,
    movingMinutes,
    dateStr,
    isSimulatedWinterDate,
    solar,
    rolloutElevationDeg,
    arrivalElevationDeg,
    rolloutPhase,
    arrivalPhase,
    nightPercent,
    twilightPercent,
    daylightPercent,
    overallCondition,
    opticalHazardLevel,
    visibilityKm: visKm,
    visibilityCategory,
    weatherCode,
    weatherDescEn: weatherDesc.en,
    weatherDescFr: weatherDesc.fr,
    isWinterTrip,
    lightingGear,
    passiveGear,
    surfaceCaution,
    summaryRecommendationEn,
    summaryRecommendationFr,
    suggestions,
  };
}
