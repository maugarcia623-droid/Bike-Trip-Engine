import { WeatherCondition } from '../types/trip';
import { Language } from '../context/LanguageContext';

export interface KitRecommendation {
  feelsLikeC: number;
  tierBadge: string;
  tierTheme: 'sky' | 'teal' | 'emerald' | 'amber';
  upperBody: string;
  lowerAndExtremities: string;
  opticsAndShield: string;
}

/**
 * Computes apparent cycling temperature (wind-chill adjusted for airflow)
 * and prescribes practical cycling kit, layering, rain shell, and lens tint.
 */
export function getKitRecommendation(
  weather: WeatherCondition,
  solarPhase: string = 'daylight',
  lang: Language = 'en'
): KitRecommendation {
  const isFr = lang === 'fr';
  const tempC = weather.temperatureC ?? 12;
  const effectiveWindKmh = weather.isHeadwindActive
    ? Math.max(12, weather.baseWindSpeedKmH || 12)
    : Math.max(10, (weather.baseWindSpeedKmH || 6) * 0.6 + 10);

  // Environment Canada / Steadman apparent wind-chill blend relevant to cycling airflow
  const feelsLikeRaw =
    tempC <= 14
      ? 13.12 +
        0.6215 * tempC -
        11.37 * Math.pow(effectiveWindKmh, 0.16) +
        0.3965 * tempC * Math.pow(effectiveWindKmh, 0.16)
      : tempC;
  const feelsLikeC = Math.round(feelsLikeRaw);

  const rainRisk = weather.precipitationRiskPercent ?? 0;
  const visKm = weather.visibilityKm ?? 15;
  const isLowLight =
    solarPhase === 'deep-night' ||
    solarPhase === 'nautical-twilight' ||
    solarPhase === 'civil-twilight' ||
    weather.isDay === false ||
    visKm < 4;

  let tierBadge: string;
  let tierTheme: 'sky' | 'teal' | 'emerald' | 'amber';
  let upperBody: string;
  let lowerAndExtremities: string;

  if (feelsLikeC < 3) {
    tierBadge = isFr ? 'Grand froid (<3°C)' : 'Deep winter (<3°C)';
    tierTheme = 'sky';
    upperBody = isFr
      ? 'Sous-maillot mérinos épais + veste thermique coupe-vent'
      : 'Heavy merino base layer + windproof thermal winter jacket';
    lowerAndExtremities = isFr
      ? 'Cuissard long thermique, gants hiver isolés, sur-chaussures néoprène & tour de cou'
      : 'Thermal bib tights, insulated winter gloves, neoprene overshoes & neck buff';
  } else if (feelsLikeC <= 9) {
    tierBadge = isFr ? 'Thermique (3–9°C)' : 'Thermal kit (3–9°C)';
    tierTheme = 'sky';
    upperBody = isFr
      ? 'Sous-maillot manches longues + maillot gratté + gilet coupe-vent'
      : 'Long-sleeve base layer + Roubaix thermal jersey + windproof gilet';
    lowerAndExtremities = isFr
      ? 'Collant long ou jambières thermiques, gants longs coupe-vent & couvre-orteils'
      : 'Thermal bib tights or leg warmers, long-finger windproof gloves & toe covers';
  } else if (feelsLikeC <= 15) {
    tierBadge = isFr ? 'Mi-saison (10–15°C)' : 'Mid-season (10–15°C)';
    tierTheme = 'teal';
    upperBody = isFr
      ? 'Maillot manches courtes + manchettes amovibles + gilet coupe-vent pliable'
      : 'Short-sleeve jersey + arm warmers + packable wind vest (gilet)';
    lowerAndExtremities = isFr
      ? feelsLikeC <= 12
        ? 'Cuissard court + genouillères légères & gants fins'
        : 'Cuissard court classique & mitaines ou gants mi-saison'
      : feelsLikeC <= 12
      ? 'Bib shorts + light knee warmers & light full-finger liners'
      : 'Standard bib shorts & light mitts';
  } else if (feelsLikeC <= 22) {
    tierBadge = isFr ? 'Tempéré (16–22°C)' : 'Mild aero (16–22°C)';
    tierTheme = 'emerald';
    upperBody = isFr
      ? 'Sous-maillot mesh sans manches + maillot été respirant'
      : 'Sleeveless mesh base layer + breathable summer jersey';
    lowerAndExtremities = isFr
      ? 'Cuissard été léger & chaussettes aéro'
      : 'Lightweight summer bib shorts & aero socks';
  } else {
    tierBadge = isFr ? 'Chaleur (>22°C)' : 'Hot weather (>22°C)';
    tierTheme = 'amber';
    upperBody = isFr
      ? 'Maillot ultra-léger ajouré zip intégral (sans sous-couche épaisse)'
      : 'Ultralight open-mesh jersey (full-zip ventilation)';
    lowerAndExtremities = isFr
      ? 'Cuissard été ventilé, crème solaire SPF 50 & électrolytes renforcés'
      : 'Ventilated summer bibs, SPF 50 sun protection & high-sodium bidon';
  }

  let opticsAndShield: string;
  if (rainRisk >= 45) {
    opticsAndShield = isFr
      ? `Pluie ${rainRisk}% : veste membrane imperméable coutures étanches + garde-boue & écran hydrophobe clair`
      : `${rainRisk}% rain risk: taped-seam waterproof shell + fenders & clear hydrophobic lens`;
  } else if (rainRisk >= 25) {
    opticsAndShield = isFr
      ? `Averses ${rainRisk}% : coupe-vent déperlant DWR en poche centrale + verres photochromiques`
      : `${rainRisk}% shower risk: packable DWR shell in jersey pocket + photochromic lens`;
  } else if (isLowLight) {
    opticsAndShield = isFr
      ? 'Faible luminosité : verres clairs ou photochromiques Cat. 0–1 + rappels rétroréfléchissants'
      : 'Low light: clear or Cat. 0–1 photochromic eyewear + hi-vis ankle/vest accents';
  } else {
    opticsAndShield = isFr
      ? 'Route sèche : lunettes solaires Cat. 2–3 haute définition'
      : 'Dry corridor: high-contrast Cat. 2–3 sun cycling eyewear';
  }

  return {
    feelsLikeC,
    tierBadge,
    tierTheme,
    upperBody,
    lowerAndExtremities,
    opticsAndShield,
  };
}
