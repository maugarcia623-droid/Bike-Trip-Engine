import React from 'react';
import {
  Lightning,
  Backpack,
  Compass,
  Briefcase,
  Wind,
  ThermometerSimple,
  CloudRain,
  Info,
  CaretDown,
  CaretUp,
  Sparkle,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { findChipDef, CHIP_ICONS, getArchetypeFromTag } from '../../utils/archetypeChips';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';

export type TripArchetype = 'sport' | 'bikepacking' | 'escapade' | 'commute';

export function getTripArchetype(tag?: string, name?: string): TripArchetype {
  const mode = getArchetypeFromTag(tag, name);
  switch (mode) {
    case 'SPORT':
      return 'sport';
    case 'BIKEPACKING':
      return 'bikepacking';
    case 'ESCAPADE':
      return 'escapade';
    case 'COMMUTE':
    default:
      return 'commute';
  }
}

interface TimelineContextualBannerProps {
  trip?: TripProfile;
  timeline: ReverseTimelineCalculation;
  defaultExpanded?: boolean;
  riderSpecs?: RiderBikeSpecs;
}

export const TimelineContextualBanner: React.FC<TimelineContextualBannerProps> = ({
  trip,
  timeline,
  defaultExpanded = false,
  riderSpecs: riderSpecsProp,
}) => {
  const { lang, t } = useTranslation();
  const effectiveSpecs = riderSpecsProp || loadRiderBikeSpecs();
  const carbTarget = effectiveSpecs.carbTargetGPerHr || 60;

  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bike_trip_contextual_banner_expanded');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // fallback
    }
    return defaultExpanded;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bike_trip_contextual_banner_expanded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const archetype = getTripArchetype(trip?.tag, trip?.name);
  const weather = trip?.weather;
  const route = trip?.route;
  const office = trip?.office;
  const localizedGate = trip ? getLocalizedTripMeta(trip, lang).gateName : lang === 'fr' ? 'Porte 17' : 'Gate 17';

  const isHeadwind = Boolean(weather?.isHeadwindActive);
  const headwindKmH = weather?.baseWindSpeedKmH || 0;
  const headwindImpactMin = timeline.weatherHeadwindImpactMinutes || 0;
  const isCold = (weather?.temperatureC ?? 20) < 10;
  const isWet = (weather?.precipitationRiskPercent ?? 0) >= 25;

  const isFr = lang === 'fr';
  const activeChips = trip?.customChips || [];
  const activeChipDefs = activeChips
    .map((id) => findChipDef(id))
    .filter((def): def is NonNullable<typeof def> => Boolean(def));

  const config = React.useMemo((): {
    directiveTitle: string;
    summaryLine: string;
    badgeValue: string;
    icon: React.ElementType;
    theme: ChipTheme;
    primaryAdvice: string;
    contextNote: string;
    metrics: Array<{ label: string; value: string; sub: string }>;
  } => {
    switch (archetype) {
      case 'sport': {
        const targetSpeed = route?.targetSpeedKmH || 30;
        const dest = route?.destination || (lang === 'fr' ? 'Arrivée' : 'Finish Sector');

        return {
          directiveTitle: t('ctxSportTitle'),
          summaryLine: t('ctxSportSummary', { carbs: carbTarget, speed: targetSpeed }),
          badgeValue: `~${targetSpeed} km/h`,
          icon: Lightning,
          theme: 'amber',
          primaryAdvice: t('ctxSportAdvice', { carbs: carbTarget }),
          contextNote: isHeadwind
            ? t('ctxSportNoteWind', { speed: headwindKmH, min: headwindImpactMin })
            : t('ctxSportNoteCalm', { dest }),
          metrics: [
            { label: t('ctxSportMetric1Label'), value: `~${targetSpeed} km/h`, sub: t('ctxSportMetric1Sub') },
            { label: t('ctxSportMetric2Label'), value: `${carbTarget}g/h`, sub: t('ctxSportMetric2Sub') },
            {
              label: t('ctxSportMetric3Label'),
              value: `${timeline.pureMovingMinutes}m`,
              sub: t('ctxSportMetric3Sub', { dist: route?.distanceKm || 35 }),
            },
            { label: t('ctxSportMetric4Label'), value: t('ctxSportMetric4Val'), sub: t('ctxSportMetric4Sub') },
          ],
        };
      }

      case 'bikepacking': {
        const gearWeight = trip?.physics?.gearWeightKg || 12;
        const totalRigMass = Math.round(gearWeight + (trip?.physics?.bikeWeightKg || 10));
        const dest = route?.destination || (lang === 'fr' ? 'Zone de Bivouac' : 'Bivouac Site');

        return {
          directiveTitle: t('ctxBpTitle'),
          summaryLine: t('ctxBpSummary', { gear: gearWeight }),
          badgeValue: t('ctxBpBadge'),
          icon: Backpack,
          theme: 'orange',
          primaryAdvice: t('ctxBpAdvice'),
          contextNote: isHeadwind
            ? t('ctxBpNoteWind', { speed: headwindKmH })
            : t('ctxBpNoteCalm', { gear: gearWeight, rig: totalRigMass, dest }),
          metrics: [
            { label: t('ctxBpMetric1Label'), value: `${route?.distanceKm || 65} km`, sub: t('ctxBpMetric1Sub') },
            {
              label: t('ctxBpMetric2Label'),
              value: `~${gearWeight} kg`,
              sub: t('ctxBpMetric2Sub', { rig: totalRigMass }),
            },
            { label: t('ctxBpMetric3Label'), value: `${timeline.pureMovingMinutes}m`, sub: t('ctxBpMetric3Sub') },
            { label: t('ctxBpMetric4Label'), value: timeline.gateArrivalTime || '18:00', sub: t('ctxBpMetric4Sub') },
          ],
        };
      }

      case 'escapade': {
        const dest = route?.destination || (lang === 'fr' ? 'Hôtel / Étape' : 'Hotel / Stage Finish');
        const checkInTime = office?.targetGateArrivalTime || '15:00';

        return {
          directiveTitle: t('ctxEscTitle'),
          summaryLine: t('ctxEscSummary', { time: checkInTime, min: timeline.bufferMinutes }),
          badgeValue: t('ctxEscBadge', { min: timeline.bufferMinutes }),
          icon: Compass,
          theme: 'emerald',
          primaryAdvice: t('ctxEscAdvice', { time: checkInTime }),
          contextNote: t('ctxEscNote', { min: timeline.bufferMinutes, dest }),
          metrics: [
            { label: t('ctxEscMetric1Label'), value: `${route?.distanceKm || 45} km`, sub: t('ctxEscMetric1Sub') },
            { label: t('ctxEscMetric2Label'), value: checkInTime, sub: dest },
            {
              label: t('ctxEscMetric3Label'),
              value: `${timeline.pureMovingMinutes}m`,
              sub: `~${route?.targetSpeedKmH || 24} km/h`,
            },
            { label: t('ctxEscMetric4Label'), value: `+${timeline.bufferMinutes}m`, sub: t('ctxEscMetric4Sub') },
          ],
        };
      }

      case 'commute':
      default: {
        const gate = localizedGate;
        const gateTime = office?.targetGateArrivalTime || '08:30';
        const shiftTime = office?.shiftStartTime || '09:00';

        return {
          directiveTitle: t('ctxComTitle'),
          summaryLine: t('ctxComSummary', { gateTime, shiftTime }),
          badgeValue: t('ctxComBadge'),
          icon: Briefcase,
          theme: 'yellow-vest',
          primaryAdvice: t('ctxComAdvice', { gateTime, shiftTime }),
          contextNote: isHeadwind
            ? t('ctxComNoteWind', {
                speed: headwindKmH,
                min: headwindImpactMin,
                depTime: timeline.hardDepartureTime,
                gate,
              })
            : t('ctxComNoteCalm', { gate, min: timeline.bufferMinutes }),
          metrics: [
            { label: t('ctxComMetric1Label'), value: gateTime, sub: gate },
            { label: t('ctxComMetric2Label'), value: `+${timeline.bufferMinutes}m`, sub: t('ctxComMetric2Sub') },
            { label: t('ctxComMetric3Label'), value: `${timeline.totalDoorToDeskMinutes}m`, sub: t('ctxComMetric3Sub') },
            { label: t('ctxComMetric4Label'), value: shiftTime, sub: t('ctxComMetric4Sub') },
          ],
        };
      }
    }
  }, [
    archetype,
    route,
    office,
    timeline,
    isHeadwind,
    headwindKmH,
    headwindImpactMin,
    trip?.physics,
    carbTarget,
    lang,
    localizedGate,
    t,
  ]);

  const IconComponent = config.icon;

  return (
    <div>
      {/* Full-Radius Chain-Link Callout Bar */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-2.5 sm:gap-3 pl-2.5 pr-2.5 sm:pr-3 py-2.5 rounded-2xl sm:rounded-full bg-pod hover:bg-chip/70 transition-colors cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <IconBadge
            theme={config.theme}
            icon={IconComponent}
            size="spine"
            solidBacker
            className="w-9 h-9 sm:w-9 sm:h-9 shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink leading-tight">
                {config.directiveTitle}
              </span>
              <Badge variant={config.theme} size="sm" dot className="hidden sm:inline-flex">
                {config.badgeValue}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5 truncate">
              {config.summaryLine}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded && isHeadwind && (
            <Badge variant="amber" size="sm" icon={Wind} className="hidden md:inline-flex tnum">
              +{headwindImpactMin}m
            </Badge>
          )}

          {/* Crisp White/Elevated Pill Action */}
          <span className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium bg-card text-ink whitespace-nowrap shrink-0">
            <span>{isExpanded ? t('bannerHide') : t('bannerDetails')}</span>
            {isExpanded ? (
              <CaretUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            ) : (
              <CaretDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            )}
          </span>
        </div>
      </button>

      {/* Expandable Nested Pod */}
      {isExpanded && (
        <div className="mt-2.5 rounded-pod bg-pod p-4 sm:p-5 animate-fade-in space-y-4">
          <div className="space-y-2">
            <p className="text-[13px] text-ink leading-relaxed">
              {config.primaryAdvice}
            </p>
            <p className="text-xs text-ink-secondary leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-zinc-400 dark:text-zinc-500 [--icon-secondary:currentColor] [--icon-secondary-opacity:0.3] shrink-0 mt-0.5" />
              <span>{config.contextNote}</span>
            </p>
          </div>

          {(isHeadwind || isCold || isWet) && (
            <div className="flex flex-wrap items-center gap-2">
              {isHeadwind && (
                <Badge variant="amber" size="md" icon={Wind} className="tnum">
                  {t('bannerHeadwindPill', { min: headwindImpactMin, speed: headwindKmH })}
                </Badge>
              )}
              {isCold && (
                <Badge variant="sky" size="md" icon={ThermometerSimple} className="tnum">
                  {t('bannerColdPill', { temp: weather?.temperatureC ?? 8 })}
                </Badge>
              )}
              {isWet && (
                <Badge variant="blue" size="md" icon={CloudRain} className="tnum">
                  {t('bannerRainPill', { risk: weather?.precipitationRiskPercent ?? 30 })}
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {config.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="bg-card rounded-sub-pod p-3 sm:p-3.5 flex flex-col justify-between min-w-0"
              >
                <span className="text-xs font-medium text-ink-muted">
                  {metric.label}
                </span>
                <div className="mt-1.5 min-w-0">
                  <span className="text-base font-semibold tracking-tight text-ink tnum block">
                    {metric.value}
                  </span>
                  <span className="text-[11px] text-ink-muted block mt-0.5 break-words">
                    {metric.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {activeChipDefs.length > 0 && (
            <div className="pt-3 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold text-ink-muted uppercase tracking-wider">
                <Sparkle
                  className={`w-4 h-4 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                />
                <span>{isFr ? 'Règles & Presets Actifs' : 'Active Presets & Protocols'}</span>
                <Badge variant="yellow-vest" size="xs" className="font-mono font-bold">
                  {activeChipDefs.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeChipDefs.map((def) => {
                  const ChipIcon = CHIP_ICONS[def.iconName] || Lightning;
                  const label = isFr ? def.labelFr : def.labelEn;
                  const rule = isFr ? def.ruleTitleFr : def.ruleTitleEn;
                  return (
                    <Badge
                      key={def.id}
                      title={rule}
                      variant={def.colorKey}
                      size="md"
                      icon={ChipIcon}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
