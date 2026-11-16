import type { DailyForecastDay, WeeklyForecast } from '../services/weatherService';

function isSnowDay(day: DailyForecastDay): boolean {
  return (day.weatherCode >= 71 && day.weatherCode <= 77) || day.weatherCode === 85 || day.weatherCode === 86;
}

function isStormDay(day: DailyForecastDay): boolean {
  return day.weatherCode >= 95;
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function isRainDay(day: DailyForecastDay): boolean {
  if (isSnowDay(day)) return false;
  return day.precipitationSumMm >= 1.5 || day.precipitationProbMax >= 60 || isRainCode(day.weatherCode);
}

function isHeavyRainDay(day: DailyForecastDay): boolean {
  if (isSnowDay(day)) return false;
  return (
    day.precipitationSumMm >= 8 ||
    [63, 65, 81, 82, 95, 96, 99].includes(day.weatherCode)
  );
}

function isWindyDay(day: DailyForecastDay): boolean {
  return day.windSpeedMaxKmH >= 32;
}

function isSunnyDay(day: DailyForecastDay): boolean {
  return day.weatherCode <= 2 && !isRainDay(day) && !isSnowDay(day);
}

function parseLocalNoon(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(dateStr);
}

function formatDayLabel(
  day: DailyForecastDay,
  index: number,
  lang: 'en' | 'fr',
  style: 'short' | 'long'
): string {
  if (style === 'long') {
    if (index === 0) return lang === 'fr' ? "aujourd'hui" : 'today';
    if (index === 1) return lang === 'fr' ? 'demain' : 'tomorrow';
  }
  const date = parseLocalNoon(day.date);
  const raw = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: style,
  }).format(date);
  return raw.replace(/\.$/, '');
}

function formatSingleDayWithPrep(
  day: DailyForecastDay,
  index: number,
  lang: 'en' | 'fr'
): string {
  const label = formatDayLabel(day, index, lang, 'long');
  if (index === 0 || index === 1 || lang === 'fr') {
    return label;
  }
  return `on ${label}`;
}

function formatShortDayList(
  items: { day: DailyForecastDay; index: number }[],
  lang: 'en' | 'fr'
): string {
  const labels = items.map(({ day, index }) => formatDayLabel(day, index, lang, 'short'));
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  const conj = lang === 'fr' ? ' et ' : ' & ';
  if (labels.length === 2) return `${labels[0]}${conj}${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}${conj}${labels[labels.length - 1]}`;
}

function formatTempPhrase(days: DailyForecastDay[], lang: 'en' | 'fr'): {
  tempPhrase: string;
  avgHigh: number;
  maxHigh: number;
  minLow: number;
} {
  const highs = days.map((d) => d.tempMaxC);
  const lows = days.map((d) => d.tempMinC);
  const minHigh = Math.round(Math.min(...highs));
  const maxHigh = Math.round(Math.max(...highs));
  const avgHigh = Math.round(highs.reduce((sum, v) => sum + v, 0) / highs.length);
  const minLow = Math.round(Math.min(...lows));

  const tempPhrase =
    maxHigh - minHigh <= 3
      ? lang === 'fr'
        ? `autour de ${avgHigh}°C`
        : `around ${avgHigh}°C`
      : lang === 'fr'
        ? `max ${minHigh}–${maxHigh}°C`
        : `highs ${minHigh}–${maxHigh}°C`;

  return { tempPhrase, avgHigh, maxHigh, minLow };
}

/**
 * Summarizes a 7-day forecast into a concise, plain-language cycling overview
 * with laid-back personality and practical utility.
 */
export function summarizeWeeklyWeather(
  forecast: WeeklyForecast,
  lang: 'en' | 'fr' = 'en'
): string {
  const days = forecast.days.slice(0, 7);
  if (days.length === 0) return '';

  const isFr = lang === 'fr';
  const indexed = days.map((day, index) => ({ day, index }));

  const snowDays = indexed.filter(({ day }) => isSnowDay(day));
  const rainDays = indexed.filter(({ day }) => isRainDay(day));
  const heavyRainDays = indexed.filter(({ day }) => isHeavyRainDay(day));
  const stormDays = indexed.filter(({ day }) => isStormDay(day));
  const dryDays = indexed.filter(({ day }) => !isRainDay(day) && !isSnowDay(day));
  const windyDays = indexed.filter(({ day }) => isWindyDay(day));
  const sunnyDays = indexed.filter(({ day }) => isSunnyDay(day));

  const totalPrecipMm = days.reduce((sum, d) => sum + Math.max(0, d.precipitationSumMm), 0);
  const maxWind = Math.max(...days.map((d) => d.windSpeedMaxKmH));
  const { tempPhrase, avgHigh, maxHigh, minLow } = formatTempPhrase(days, lang);

  // 1. Snow / freezing week
  if (snowDays.length >= 2 || (snowDays.length >= 1 && minLow <= 0 && avgHigh <= 4)) {
    return isFr
      ? `Neige et gel (${tempPhrase}) au programme cette semaine. Prudence dans les virages, ou session home-trainer.`
      : `Snow and freezing temps (${tempPhrase}) in the mix this week. Take it easy on the corners—or keep it on the trainer.`;
  }

  // 2. Heavy or frequent rain week
  const isVeryRainyWeek =
    rainDays.length >= 4 ||
    (rainDays.length >= 3 && totalPrecipMm >= 20) ||
    heavyRainDays.length >= 2;

  if (isVeryRainyWeek) {
    if (rainDays.length >= 6 || dryDays.length === 0) {
      if (stormDays.length >= 2) {
        return isFr
          ? `Semaine orageuse et bien arrosée (${tempPhrase}). Tu peux le faire, couvre-toi juste de la tête aux pieds et évite les gros grains.`
          : `Stormy, rain-soaked week ahead (${tempPhrase}). You can do it, just cover yourself from head to toe and dodge the heavy squalls.`;
      }
      return isFr
        ? `De la pluie presque toute la semaine (${tempPhrase}). Tu peux le faire, couvre-toi juste de la tête aux pieds.`
        : `Rain pretty much all week (${tempPhrase}). You can do it, just cover yourself from head to toe.`;
    }

    if (dryDays.length <= 3) {
      const bestDry = [...dryDays].sort((a, b) => {
        if (a.day.precipitationProbMax !== b.day.precipitationProbMax) {
          return a.day.precipitationProbMax - b.day.precipitationProbMax;
        }
        if (a.day.precipitationSumMm !== b.day.precipitationSumMm) {
          return a.day.precipitationSumMm - b.day.precipitationSumMm;
        }
        return b.day.tempMaxC - a.day.tempMaxC;
      })[0];
      const bestDryLabel = formatDayLabel(bestDry.day, bestDry.index, lang, 'long');
      return isFr
        ? `Semaine bien humide (${rainDays.length} jours de pluie, ${tempPhrase}) — ${bestDryLabel} s'annonce le plus sec. Tu peux le faire, couvre-toi juste de la tête aux pieds.`
        : `Lots of rain this week (${rainDays.length} wet days, ${tempPhrase})—${bestDryLabel} looks driest. You can do it, just cover yourself from head to toe.`;
    }

    return isFr
      ? `Pas mal de pluie au programme (${rainDays.length} jours humides, ${tempPhrase}). Tu peux le faire, couvre-toi juste de la tête aux pieds.`
      : `Plenty of rain in the forecast (${rainDays.length} wet days, ${tempPhrase}). You can do it, just cover yourself from head to toe.`;
  }

  // 3. Mixed week (2–3 wet days, lighter overall)
  if (rainDays.length >= 2) {
    const rainList = formatShortDayList(rainDays, lang);
    return isFr
      ? `Semaine mitigée (${tempPhrase}) — plutôt sec dans l'ensemble, avec de la pluie ${rainList}. Garde un coupe-pluie sous la main.`
      : `Mixed bag this week (${tempPhrase})—mostly dry, with rain ${rainDays.length === 2 ? 'around ' : 'on '}${rainList}. Keep a shell handy.`;
  }

  // 4. Dry / mostly dry but windy week
  if (windyDays.length >= 3 || maxWind >= 42) {
    const peakWind = Math.round(maxWind);
    return isFr
      ? `Plutôt sec cette semaine (${tempPhrase}), mais venteux (jusqu'à ${peakWind} km/h). De quoi chasser le vent de dos.`
      : `Mostly dry this week (${tempPhrase}), though it's looking breezy (up to ${peakWind} km/h). Free tailwinds if you plan it right.`;
  }

  // 5. Nearly all dry (just 1 wet day)
  if (rainDays.length === 1) {
    const wetWhen = formatSingleDayWithPrep(rainDays[0].day, rainDays[0].index, lang);
    return isFr
      ? `Semaine globalement sèche (${tempPhrase}), juste une averse possible ${wetWhen}. Roule tranquille.`
      : `Mostly dry all week (${tempPhrase}), with just a passing shower possible ${wetWhen}. Easy riding ahead.`;
  }

  // 6. All dry week
  if (avgHigh < 9) {
    return isFr
      ? `Sec et frais toute la semaine (${tempPhrase}${minLow <= 3 ? ', matins frisquets' : ''}). Une bonne couche thermique et profite des routes calmes.`
      : `Dry and crisp all week (${tempPhrase}${minLow <= 3 ? ', chilly mornings' : ''}). Throw on warm layers and enjoy the quiet roads.`;
  }

  if (maxHigh >= 28) {
    return isFr
      ? `Semaine chaude et sèche (${tempPhrase}). Pars tôt si possible et prends un bidon de plus.`
      : `Warm, dry stretch all week (${tempPhrase}). Roll out early if you can and pack an extra bottle.`;
  }

  if (sunnyDays.length >= 4 && avgHigh >= 12) {
    return isFr
      ? `Temps sec et lumineux toute la semaine (${tempPhrase}) — l'excuse parfaite pour rallonger le parcours.`
      : `Clear, dry skies all week (${tempPhrase})—basically an open invitation to take the long way.`;
  }

  return isFr
    ? `Semaine sèche et calme (${tempPhrase}). Des conditions idéales pour aligner les kilomètres.`
    : `Dry and calm all week (${tempPhrase}). Solid weather to get the miles in.`;
}
