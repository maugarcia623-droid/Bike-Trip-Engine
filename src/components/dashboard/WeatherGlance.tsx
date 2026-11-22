import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import type { TranslationKey } from '../../locales/en';
import type { WeatherCondition } from '../../types/trip';
import type { RideVisibilityAnalysis } from '../../utils/solarVisibility';
import type { KitRecommendation } from '../../utils/kitAdvisor';

/** WMO weather code → concise sky label */
function getSkyLabelKey(code: number): TranslationKey {
  if (code === 0) return 'skyClear';
  if (code === 1) return 'skyMostlyClear';
  if (code === 2) return 'skyPartlyCloudy';
  if (code === 3) return 'skyOvercast';
  if (code === 45 || code === 48) return 'skyFog';
  if (code >= 51 && code <= 57) return 'skyDrizzle';
  if (code >= 61 && code <= 67) return 'skyRain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'skySnow';
  if (code >= 80 && code <= 82) return 'skyShowers';
  if (code >= 95) return 'skyThunder';
  return 'skyOvercast';
}

function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export interface WeatherGlanceProps {
  weather: WeatherCondition;
  visibility: RideVisibilityAnalysis;
  kitAdvice: KitRecommendation;
  goStatus: 'GO' | 'CAUTION' | 'NO-GO' | string;
  temperature: number;
  windSpeed: number;
  windCardinal: string;
  maxGust: number;
  onExpand: () => void;
}

/**
 * Collapsed "at a glance" weather summary for the ride plan,
 * implementing the Ride weather V2 Figma specification with Cadence design tokens.
 */
export const WeatherGlance: React.FC<WeatherGlanceProps> = ({
  weather,
  visibility,
  kitAdvice,
  temperature,
  windSpeed,
  windCardinal,
  maxGust,
  onExpand,
}) => {
  const { t } = useTranslation();

  const skyLabelKey = getSkyLabelKey(visibility.weatherCode);
  const isCalm = windSpeed < 3 || weather.windDirection === 'calm';
  const rainPct = Math.max(0, Math.min(100, Math.round(weather.precipitationRiskPercent ?? 0)));
  const rainKey: TranslationKey =
    rainPct >= 50 ? 'weatherGlanceRainLikely' : rainPct >= 25 ? 'weatherGlanceRainPossible' : 'weatherGlanceRainDry';

  // Light on the road timeline
  const dayPct = visibility.daylightPercent;
  const twilightPct = visibility.twilightPercent;
  const nightPct = visibility.nightPercent;
  const daylightMinutes = Math.round((visibility.movingMinutes * dayPct) / 100);
  const isBrightening = visibility.arrivalElevationDeg >= visibility.rolloutElevationDeg;

  const segments = [
    { key: 'night', pct: nightPct, cls: 'bg-ink/20 dark:bg-white/20 paint-hatch' },
    { key: 'twilight', pct: twilightPct, cls: 'bg-[#f59e0b] paint-hatch' },
    { key: 'day', pct: dayPct, cls: 'bg-[#fde68a]' },
  ];
  if (!isBrightening) segments.reverse();

  const solarMilestone = isBrightening
    ? t('weatherGlanceSunrise', { time: visibility.solar.sunrise })
    : t('weatherGlanceSunset', { time: visibility.solar.sunset });

  return (
    <button
      type="button"
      onClick={onExpand}
      title={t('weatherGlanceExpandAria')}
      className="w-full pt-1 rounded-pod transition-opacity hover:opacity-90 text-left cursor-pointer flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
    >
      {/* ── 1. Weather heading ── */}
      <span className="flex items-center justify-between gap-2 w-full">
        <span className="font-rounded font-bold text-base leading-6 tracking-[-0.4px] text-ink whitespace-nowrap">
          {t('weatherGlanceTitle')}
        </span>
        <span className="bg-volt text-[#111111] px-2.5 py-1 rounded-full font-rounded font-medium text-xs leading-4 whitespace-nowrap tnum shrink-0">
          {t('weatherGlanceNowBadge', { time: visibility.rolloutTime })}
        </span>
      </span>

      {/* ── 2. Temperature and conditions ── */}
      <span className="flex items-center gap-3.5 w-full">
        <span className="font-rounded font-extrabold text-[44px] leading-[52px] tracking-[-1.76px] text-ink tnum shrink-0">
          {Math.round(temperature)}°
        </span>
        <span className="flex flex-col gap-1.5 min-w-0 flex-1">
          <span className="font-rounded font-bold text-base leading-6 tracking-[-0.4px] text-ink truncate">
            {t(skyLabelKey)}
          </span>
          <span className="font-body font-medium text-sm leading-5 tracking-[-0.14px] text-ink-muted tnum truncate">
            {t('weatherGlanceFeelsLike', { temp: kitAdvice.feelsLikeC })}
          </span>
        </span>
      </span>

      {/* ── 3. Wind, gusts and rain ── */}
      <span className="grid grid-cols-3 gap-3 w-full">
        <span className="flex flex-col gap-1.5 min-w-0">
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {t('weatherGlanceWind')}
          </span>
          <span className="font-rounded font-bold text-base leading-6 tracking-[-0.4px] text-ink tnum whitespace-nowrap">
            {Math.round(windSpeed)} km/h
          </span>
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {isCalm ? t('weatherGlanceCalm') : t('weatherGlanceFromDir', { dir: windCardinal })}
          </span>
        </span>

        <span className="flex flex-col gap-1.5 min-w-0">
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {t('weatherGlanceGusts')}
          </span>
          <span className="font-rounded font-bold text-base leading-6 tracking-[-0.4px] text-ink tnum whitespace-nowrap">
            {Math.round(maxGust)} km/h
          </span>
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {t('weatherGlancePeakWind')}
          </span>
        </span>

        <span className="flex flex-col gap-1.5 min-w-0">
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {t('weatherGlanceRain')}
          </span>
          <span className="font-rounded font-bold text-base leading-6 tracking-[-0.4px] text-ink tnum whitespace-nowrap">
            {rainPct}%
          </span>
          <span className="font-rounded font-medium text-xs leading-4 text-ink-muted truncate">
            {t(rainKey)}
          </span>
        </span>
      </span>

      {/* ── 4. Light on the road ── */}
      <span className="flex flex-col gap-1.5 w-full">
        <span className="flex items-start justify-between gap-2 w-full font-rounded font-medium text-xs leading-4">
          <span className="text-ink-muted">{t('weatherGlanceLight')}</span>
          <span className="text-ink tnum whitespace-nowrap">
            {t('weatherGlanceDaylightDuration', { duration: formatDuration(daylightMinutes) })}
          </span>
        </span>

        <span
          role="img"
          aria-label={t('weatherGlanceLightBarAria', { day: dayPct, twilight: twilightPct, night: nightPct })}
          className="h-[10px] w-full rounded-full overflow-hidden flex bg-ink/10 dark:bg-white/10"
        >
          {segments.map((seg) =>
            seg.pct > 0 ? (
              <span key={seg.key} className={`h-full block ${seg.cls}`} style={{ width: `${seg.pct}%` }} />
            ) : null
          )}
        </span>

        <span className="flex items-center justify-between gap-2 w-full font-rounded font-medium text-xs leading-4 tnum">
          <span className="text-ink whitespace-nowrap">
            {t('weatherGlanceStartTime', { time: visibility.rolloutTime })}
          </span>
          <span className="text-ink-muted whitespace-nowrap truncate">{solarMilestone}</span>
          <span className="text-ink-muted whitespace-nowrap">
            {t('weatherGlanceFinishTime', { time: visibility.arrivalTime })}
          </span>
        </span>
      </span>
    </button>
  );
};
