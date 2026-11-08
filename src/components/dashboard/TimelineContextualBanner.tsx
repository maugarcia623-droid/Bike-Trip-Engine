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
  Sparkle,
  Timer,
  Clock,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { findChipDef, CHIP_ICONS, getArchetypeFromTag } from '../../utils/archetypeChips';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
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
  const panelId = React.useId();

  const [isExpanded, setIsExpanded] = React.useState<boolean>(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
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
              value: `${timeline.pureMovingMinutes} min`,
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
            { label: t('ctxBpMetric3Label'), value: `${timeline.pureMovingMinutes} min`, sub: t('ctxBpMetric3Sub') },
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
              value: `${timeline.pureMovingMinutes} min`,
              sub: `~${route?.targetSpeedKmH || 24} km/h`,
            },
            { label: t('ctxEscMetric4Label'), value: `+${timeline.bufferMinutes} min`, sub: t('ctxEscMetric4Sub') },
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
            { label: t('ctxComMetric2Label'), value: `+${timeline.bufferMinutes} min`, sub: t('ctxComMetric2Sub') },
            { label: t('ctxComMetric3Label'), value: `${timeline.totalDoorToDeskMinutes} min`, sub: t('ctxComMetric3Sub') },
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
    <div className="rounded-pod bg-pod overflow-hidden transition-colors">
      {/* Compact 1-line Mandate Header: icon · title · key metric pills · chevron */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        title={config.summaryLine}
        className="w-full flex items-center gap-2 sm:gap-2.5 p-2 pr-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
      >
        <IconBadge
          theme={config.theme}
          icon={IconComponent}
          size="spine"
          solidBacker
          className="w-8 h-8 sm:w-8 sm:h-8 shrink-0"
        />

        <span className="flex-1 min-w-0 break-words text-[13px] sm:text-sm font-semibold font-rounded text-ink leading-tight">
          {config.directiveTitle}
        </span>

        <span className="flex items-center gap-1.5 shrink-0">
          <Badge variant="zinc" size="sm" icon={Timer} className="tnum">
            {t('bannerMovingPill', { min: timeline.pureMovingMinutes })}
          </Badge>
          <Badge
            variant={config.theme}
            size="sm"
            icon={Clock}
            className="tnum hidden min-[440px]:inline-flex"
          >
            {t('bannerBufferPill', { min: timeline.bufferMinutes })}
          </Badge>
          {isHeadwind && headwindImpactMin > 0 && (
            <Badge variant="amber" size="sm" icon={Wind} className="hidden md:inline-flex tnum">
              +{headwindImpactMin} min
            </Badge>
          )}
        </span>

        <DisclosureChevron open={isExpanded} />
      </button>

      {/* Expandable Mandate Drawer */}
      <Collapsible
        open={isExpanded}
        id={panelId}
        innerClassName="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 space-y-3.5"
      >
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.theme} size="sm" dot className="tnum">
                {config.badgeValue}
              </Badge>
              <span className="text-xs text-ink-muted tnum">{config.summaryLine}</span>
            </div>
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
      </Collapsible>
    </div>
  );
};
