import React from 'react';
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  Clouds,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Umbrella,
  Flashlight,
  Shield,
  ChevronRight,
} from '@/components/icons';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  LayeredTokenTheme,
  getLayeredThemeTokens,
} from '../../tokens/chipTokens';
import { useTranslation } from '../../context/LanguageContext';
import type { TranslationKey } from '../../locales/en';
import type { WeatherCondition } from '../../types/trip';
import type { RideVisibilityAnalysis } from '../../utils/solarVisibility';
import type { KitRecommendation } from '../../utils/kitAdvisor';

/** Section eyebrow — matches TerrainEffortStory / SurfaceProfileBar */
const EYEBROW = 'text-[10px] font-rounded font-bold uppercase tracking-[0.14em] text-ink-muted';
/** Stat label (dt) — icon + label in the rounded voice */
const STAT_LABEL = 'flex items-center gap-1.5 text-[10px] font-rounded font-bold text-ink-secondary';
const STAT_VALUE = 'text-xl leading-none font-rounded font-extrabold tracking-tight text-ink tnum';
const STAT_UNIT = 'ml-0.5 text-[11px] font-rounded font-bold text-ink-muted';
const STAT_SUB = 'mt-1 text-[10px] font-rounded font-semibold text-ink-muted leading-snug break-words';

const DARK_PHASES = new Set(['deep-night', 'nautical-twilight']);

interface SkyMeta {
  icon: React.ElementType;
  theme: LayeredTokenTheme;
  labelKey: TranslationKey;
}

/** WMO weather code → concise sky label + keyline duotone icon + palette theme */
function getSkyMeta(code: number, isDark: boolean): SkyMeta {
  if (code === 0) return { icon: isDark ? Moon : Sun, theme: isDark ? 'purple' : 'amber', labelKey: 'skyClear' };
  if (code === 1) return { icon: isDark ? Moon : Sun, theme: isDark ? 'purple' : 'amber', labelKey: 'skyMostlyClear' };
  if (code === 2)
    return { icon: isDark ? CloudMoon : CloudSun, theme: isDark ? 'purple' : 'amber', labelKey: 'skyPartlyCloudy' };
  if (code === 3) return { icon: Cloud, theme: 'greyscale', labelKey: 'skyOvercast' };
  if (code === 45 || code === 48) return { icon: Clouds, theme: 'greyscale', labelKey: 'skyFog' };
  if (code >= 51 && code <= 57) return { icon: CloudRain, theme: 'sky', labelKey: 'skyDrizzle' };
  if (code >= 61 && code <= 67) return { icon: CloudRain, theme: 'blue', labelKey: 'skyRain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { icon: Snowflake, theme: 'sky', labelKey: 'skySnow' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, theme: 'blue', labelKey: 'skyShowers' };
  if (code >= 95) return { icon: CloudLightning, theme: 'rose', labelKey: 'skyThunder' };
  return { icon: Cloud, theme: 'greyscale', labelKey: 'skyOvercast' };
}

const tint = (theme: LayeredTokenTheme) =>
  `${getLayeredThemeTokens(theme).primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`;

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
 * Collapsed "at a glance" weather summary for the ride plan.
 * Hierarchy: eyebrow + status → hero temperature & sky → wind / gusts / rain → light on the road → kit.
 */
export const WeatherGlance: React.FC<WeatherGlanceProps> = ({
  weather,
  visibility,
  kitAdvice,
  goStatus,
  temperature,
  windSpeed,
  windCardinal,
  maxGust,
  onExpand,
}) => {
  const { t } = useTranslation();

  // ── Sky & temperature ──
  const isDark = DARK_PHASES.has(visibility.rolloutPhase);
  const sky = getSkyMeta(visibility.weatherCode, isDark);
  const SkyIcon = sky.icon;

  // ── Wind relative to the route ──
  const isCalm = windSpeed < 3 || weather.windDirection === 'calm';
  const relKey: TranslationKey = isCalm
    ? 'weatherGlanceCalm'
    : weather.windDirection === 'tailwind'
    ? 'weatherGlanceTailwind'
    : weather.windDirection === 'cross-headwind'
    ? 'weatherGlanceCrosswind'
    : weather.isHeadwindActive || weather.windDirection === 'headwind'
    ? 'weatherGlanceHeadwind'
    : 'weatherGlanceCrosswind';
  const windTheme: LayeredTokenTheme =
    windSpeed >= 30
      ? 'rose'
      : isCalm
      ? 'greyscale'
      : relKey === 'weatherGlanceTailwind'
      ? 'emerald'
      : windSpeed >= 8
      ? 'amber'
      : 'greyscale';

  const gustTheme: LayeredTokenTheme = maxGust >= 40 ? 'rose' : maxGust >= 24 ? 'amber' : 'greyscale';
  const gustKey: TranslationKey =
    maxGust >= 40 ? 'weatherGlanceGustStrong' : maxGust >= 24 ? 'weatherGlanceGustModerate' : 'weatherGlanceGustGentle';

  const rainPct = Math.max(0, Math.min(100, Math.round(weather.precipitationRiskPercent ?? 0)));
  const rainTheme: LayeredTokenTheme = rainPct >= 25 ? 'blue' : 'greyscale';
  const rainKey: TranslationKey =
    rainPct >= 50 ? 'weatherGlanceRainLikely' : rainPct >= 25 ? 'weatherGlanceRainPossible' : 'weatherGlanceRainDry';

  // ── Light on the road (chronological: darkness drawn as the empty track) ──
  const dayPct = visibility.daylightPercent;
  const twilightPct = visibility.twilightPercent;
  const nightPct = visibility.nightPercent;
  const isBrightening = visibility.arrivalElevationDeg >= visibility.rolloutElevationDeg;
  const segments = [
    { key: 'night', pct: nightPct, cls: '' },
    { key: 'twilight', pct: twilightPct, cls: 'bg-amber-300 paint-hatch' },
    { key: 'day', pct: dayPct, cls: 'bg-amber-300' },
  ];
  if (!isBrightening) segments.reverse();

  const unlitPct = nightPct + twilightPct;
  const lightsMin = Math.round((visibility.movingMinutes * unlitPct) / 100);
  const lightsCaption =
    unlitPct <= 0 || lightsMin <= 0
      ? t('weatherGlanceFullDaylight')
      : unlitPct >= 100
      ? t('weatherGlanceLightsWholeRide')
      : t('weatherGlanceLightsOn', { min: lightsMin });
  const needsLights = unlitPct > 0 && lightsMin > 0;

  const statusVariant = goStatus === 'GO' ? 'emerald' : goStatus === 'CAUTION' ? 'yellow-vest' : 'rose';
  const statusLabel =
    goStatus === 'GO'
      ? t('feasibilityOptimal')
      : goStatus === 'CAUTION'
      ? t('feasibilityCaution')
      : t('feasibilitySevere');

  return (
    <button
      type="button"
      onClick={onExpand}
      title={t('weatherGlanceExpandAria')}
      className="w-full p-4 rounded-pod bg-pod hover:bg-chip/60 transition-colors text-left cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
    >
      {/* ── 1. Eyebrow + ride status ── */}
      <span className="flex items-center justify-between gap-2">
        <span className={EYEBROW}>{t('weatherGlanceEyebrow')}</span>
        <Badge variant={statusVariant} size="xs" dot className="shrink-0">
          {statusLabel}
        </Badge>
      </span>

      {/* ── 2. Hero: temperature + sky ── */}
      <span className="mt-2.5 flex items-center justify-between gap-3">
        <span className="min-w-0 block">
          <span className="flex items-baseline gap-0.5">
            <span className="text-[44px] sm:text-5xl leading-none font-rounded font-extrabold tracking-tight text-ink tnum">
              {Math.round(temperature)}
            </span>
            <span className="text-xl font-rounded font-bold text-ink-muted">°C</span>
          </span>
          <span className="mt-2 block text-[15px] font-rounded font-bold text-ink leading-tight">
            {t(sky.labelKey)}
          </span>
          <span className="mt-0.5 block text-xs font-rounded font-semibold text-ink-muted tnum leading-snug">
            {t('weatherGlanceFeelsLike', { temp: kitAdvice.feelsLikeC })}
            <span aria-hidden="true"> · </span>
            {t('weatherGlanceVisibility', { km: visibility.visibilityKm })}
          </span>
        </span>
        <SkyIcon className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 ${tint(sky.theme)}`} aria-hidden="true" />
      </span>

      <span className="lane-divider my-3.5 block" aria-hidden="true" />

      {/* ── 3. Wind · Gusts · Rain ── */}
      <span className="grid grid-cols-3 divide-x divide-ink/10">
        <span className="pr-3 min-w-0 block">
          <span className={STAT_LABEL}>
            <Wind className={`w-3.5 h-3.5 shrink-0 ${tint(windTheme)}`} aria-hidden="true" />
            <span className="truncate">{t('weatherGlanceWind')}</span>
          </span>
          <span className="mt-1.5 flex items-baseline whitespace-nowrap">
            <span className={STAT_VALUE}>{Math.round(windSpeed)}</span>
            <span className={STAT_UNIT}>km/h</span>
          </span>
          <span className={`${STAT_SUB} block`}>
            {t(relKey)}
            {!isCalm && ` · ${windCardinal}`}
          </span>
        </span>

        <span className="px-3 min-w-0 block">
          <span className={STAT_LABEL}>
            <Wind className={`w-3.5 h-3.5 shrink-0 ${tint(gustTheme)}`} aria-hidden="true" />
            <span className="truncate">{t('weatherGlanceGusts')}</span>
          </span>
          <span className="mt-1.5 flex items-baseline whitespace-nowrap">
            <span className={STAT_VALUE}>{Math.round(maxGust)}</span>
            <span className={STAT_UNIT}>km/h</span>
          </span>
          <span className={`${STAT_SUB} block`}>{t(gustKey)}</span>
        </span>

        <span className="pl-3 min-w-0 block">
          <span className={STAT_LABEL}>
            <Umbrella className={`w-3.5 h-3.5 shrink-0 ${tint(rainTheme)}`} aria-hidden="true" />
            <span className="truncate">{t('weatherGlanceRain')}</span>
          </span>
          <span className="mt-1.5 flex items-baseline whitespace-nowrap">
            <span className={STAT_VALUE}>{rainPct}</span>
            <span className={STAT_UNIT}>%</span>
          </span>
          <span className={`${STAT_SUB} block`}>{t(rainKey)}</span>
        </span>
      </span>

      <span className="lane-divider my-3.5 block" aria-hidden="true" />

      {/* ── 4. Light on the road ── */}
      <span className="flex items-baseline justify-between gap-2">
        <span className={EYEBROW}>{t('weatherGlanceLight')}</span>
        <span className="whitespace-nowrap">
          <span className="text-[15px] leading-none font-rounded font-bold text-ink tnum">{dayPct}%</span>
          <span className="ml-1 text-[11px] font-rounded font-bold text-ink-muted">
            {t('weatherGlanceDaylightUnit')}
          </span>
        </span>
      </span>
      <span
        role="img"
        aria-label={t('weatherGlanceLightBarAria', { day: dayPct, twilight: twilightPct, night: nightPct })}
        className="mt-2 flex h-3 w-full rounded-full overflow-hidden bg-ink/10"
      >
        {segments.map((seg) =>
          seg.pct > 0 ? (
            <span key={seg.key} className={`h-full block ${seg.cls}`} style={{ width: `${seg.pct}%` }} />
          ) : null
        )}
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-rounded font-semibold text-ink-muted tnum">
        <span>{visibility.rolloutTime}</span>
        <span className="flex items-center gap-1 min-w-0 text-ink-secondary">
          {needsLights ? (
            <Flashlight className={`w-3 h-3 shrink-0 ${tint('yellow-vest')}`} aria-hidden="true" />
          ) : (
            <Sun className={`w-3 h-3 shrink-0 ${tint('amber')}`} aria-hidden="true" />
          )}
          <span className="truncate">{lightsCaption}</span>
        </span>
        <span>{visibility.arrivalTime}</span>
      </span>

      <span className="lane-divider my-3.5 block" aria-hidden="true" />

      {/* ── 5. What to wear + expand affordance ── */}
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <IconBadge theme={kitAdvice.tierTheme} icon={Shield} size="xs" />
          <span className="hidden sm:inline text-[11px] font-rounded font-bold text-ink-secondary whitespace-nowrap">
            {t('kitDirectiveTitle')}
          </span>
          <Badge variant={kitAdvice.tierTheme} size="xs" className="tnum min-w-0 truncate">
            {kitAdvice.tierBadge}
          </Badge>
        </span>
        <span className="flex items-center gap-1 shrink-0 text-xs font-rounded font-bold text-ink-secondary">
          {t('bannerDetails')}
          <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
};
