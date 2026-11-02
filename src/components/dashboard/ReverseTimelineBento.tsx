import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  Coffee,
  ShieldCheck,
  Lightning,
  NavigationArrow,
  Shower,
  Alarm,
  ForkKnife,
  Briefcase,
  Backpack,
  Compass,
  Wind,
  Trophy,
  Flame,
  Users,
  Mountains,
  Landmark,
  Wine,
  Camera,
  Moon,
  ChevronDown,
} from '@/components/icons';
import type { TripProfile } from '../../types/trip';
import type { RiderBikeSpecs } from '../../types/specs';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible } from '../common/Collapsible';
import {
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { TimelineContextualBanner, getTripArchetype } from './TimelineContextualBanner';
import { useTranslation } from '../../context/LanguageContext';

interface ReverseTimelineBentoProps {
  trip?: TripProfile;
  timeline: ReverseTimelineCalculation;
  gateName?: string;
  riderSpecs?: RiderBikeSpecs;
}

type TimelineStepFilter = 'all' | 'crucial';

function getTimelineStepTokenSpec(
  iconName: string,
  isHardDeparture: boolean
): { icon: React.ElementType; theme: ChipTheme } {
  const resolveIconAndTheme = (): { icon: React.ElementType; theme: ChipTheme } => {
    switch (iconName) {
      case 'AlarmClock':
        return { icon: Alarm, theme: 'purple' };
      case 'Utensils':
      case 'UtensilsCrossed':
        return { icon: ForkKnife, theme: 'orange' };
      case 'CheckCircle2':
        return { icon: CheckCircle, theme: 'emerald' };
      case 'Navigation':
        return { icon: NavigationArrow, theme: 'yellow-vest' };
      case 'Wind':
        return { icon: Wind, theme: 'sky' };
      case 'ShieldCheck':
        return { icon: ShieldCheck, theme: 'teal' };
      case 'Zap':
        return { icon: Lightning, theme: 'lime' };
      case 'ShowerHead':
        return { icon: Shower, theme: 'sky' };
      case 'Coffee':
        return { icon: Coffee, theme: 'amber' };
      case 'Briefcase':
        return { icon: Briefcase, theme: 'blue' };
      case 'Backpack':
        return { icon: Backpack, theme: 'orange' };
      case 'Compass':
        return { icon: Compass, theme: 'teal' };
      case 'Trophy':
        return { icon: Trophy, theme: 'amber' };
      case 'Flame':
        return { icon: Flame, theme: 'rose' };
      case 'Users':
        return { icon: Users, theme: 'blue' };
      case 'Mountain':
        return { icon: Mountains, theme: 'emerald' };
      case 'Landmark':
        return { icon: Landmark, theme: 'amber' };
      case 'Wine':
        return { icon: Wine, theme: 'rose' };
      case 'Camera':
        return { icon: Camera, theme: 'purple' };
      case 'Moon':
        return { icon: Moon, theme: 'purple' };
      default:
        return { icon: Clock, theme: 'amber' };
    }
  };

  const resolved = resolveIconAndTheme();
  if (isHardDeparture) {
    return { icon: resolved.icon, theme: 'yellow-vest' };
  }
  return resolved;
}

export const ReverseTimelineBento: React.FC<ReverseTimelineBentoProps> = ({
  timeline,
  trip,
  riderSpecs,
}) => {
  const { t } = useTranslation();

  // Collapsed summary view by default: crucial checkpoints shown, descriptions tucked until clicked
  const [stepFilter, setStepFilter] = useState<TimelineStepFilter>('crucial');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedSteps({});
  }, [trip?.id]);

  const toggleStep = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleSteps = useMemo(
    () =>
      stepFilter === 'crucial'
        ? timeline.steps.filter((s) => s.isCrucialCheckpoint)
        : timeline.steps,
    [timeline.steps, stepFilter]
  );

  const hiddenCount = timeline.steps.length - visibleSteps.length;

  const archetype = getTripArchetype(trip?.tag, trip?.name);

  const cardTitle =
    archetype === 'sport'
      ? t('timelineTitleSport')
      : archetype === 'bikepacking'
      ? t('timelineTitleBikepacking')
      : archetype === 'escapade'
      ? t('timelineTitleEscapade')
      : t('timelineTitleCommute');

  const cardSubtitle =
    archetype === 'sport'
      ? t('timelineSubSport')
      : archetype === 'bikepacking'
      ? t('timelineSubBikepacking')
      : archetype === 'escapade'
      ? t('timelineSubEscapade')
      : t('timelineSubCommute');

  return (
    <Card
      title={cardTitle}
      subtitle={cardSubtitle}
      badge={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Crucial Only vs. All Steps Segmented Pill Toggle */}
          <div
            role="group"
            aria-label={t('timelineFilterAria')}
            className="inline-flex items-center gap-0.5 p-1 rounded-full bg-pod"
          >
            <button
              type="button"
              onClick={() => setStepFilter('crucial')}
              aria-pressed={stepFilter === 'crucial'}
              className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-semibold transition-all cursor-pointer select-none ${CHIP_RING_BASE} ${
                stepFilter === 'crucial'
                  ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                  : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
              }`}
            >
              {t('timelineFilterCrucial')}
            </button>
            <button
              type="button"
              onClick={() => setStepFilter('all')}
              aria-pressed={stepFilter === 'all'}
              className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-semibold tnum transition-all cursor-pointer select-none ${CHIP_RING_BASE} ${
                stepFilter === 'all'
                  ? 'bg-card text-ink shadow-xs ring-ink/10 dark:ring-white/10'
                  : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
              }`}
            >
              {t('timelineFilterAll', { count: timeline.steps.length })}
            </button>
          </div>

          <Badge variant="yellow-vest" size="md" dot className="py-1.5 px-3 tnum">
            {t('rolloutBadgeTime', { time: timeline.hardDepartureTime })}
          </Badge>
        </div>
      }
      className="w-full"
    >
      {/* Contextual Directive Capsule / Expandable Mandate Pod */}
      <TimelineContextualBanner trip={trip} timeline={timeline} riderSpecs={riderSpecs} />

      {/* Bounded Scrollable Stepper Timeline with Asphalt Dashed Center-Line */}
      <div className="max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin mt-3.5">
        <div className="relative space-y-2.5 sm:space-y-3 py-0.5">
          {/* Continuous vertical dashed road center-line */}
          <div
            className="lane-spine absolute left-[17px] sm:left-[19px] top-4 sm:top-5 bottom-4 sm:bottom-5 pointer-events-none"
            aria-hidden="true"
          />

          {visibleSteps.map((step) => {
            const isHardDeparture =
              step.id === 'hard-departure' ||
              step.id === 'sport-rollout' ||
              step.id === 'bp-departure';

            const { icon: StepIcon, theme: stepTheme } = getTimelineStepTokenSpec(
              step.iconName,
              isHardDeparture
            );

            const isStepExpanded = Boolean(expandedSteps[step.id]);
            const descId = `timeline-step-desc-${step.id}`;

            return (
              <div
                key={step.id}
                className="relative flex items-start sm:items-center gap-2.5 sm:gap-3.5 group"
              >
                {/* Circular Layered Token Badge on Spine */}
                <IconBadge
                  theme={stepTheme}
                  icon={StepIcon}
                  size="spine"
                  isSelected={isHardDeparture}
                  solidBacker
                  className="relative z-10 mt-2 sm:mt-0 transition-transform duration-200 group-hover:scale-105"
                />

                {/* Compact Clickable Step Pod Card */}
                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  aria-expanded={isStepExpanded}
                  aria-controls={descId}
                  className="flex-1 min-w-0 rounded-pod p-2.5 sm:p-3.5 bg-pod hover:bg-chip/70 text-ink text-left transition-colors flex flex-col items-stretch sm:flex-row sm:items-center gap-2 sm:gap-3.5 border border-transparent dark:border-white/[0.03] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
                >
                  {/* Top Row on Mobile / Left Column on Desktop: Full-Radius Time Pill + Mobile Badges */}
                  <div className="flex items-center justify-between gap-2 sm:shrink-0">
                    <div
                      className={`min-w-[68px] sm:min-w-[88px] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full flex items-center justify-center shrink-0 ${CHIP_RING_BASE} ${
                        isHardDeparture
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `bg-card text-ink dark:text-zinc-100 ${CHIP_RING_UNSELECTED} border border-black/[0.04] dark:border-white/[0.04]`
                      }`}
                    >
                      <span className="font-mono text-base sm:text-xl font-bold tracking-tight tnum">
                        {step.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                      {isHardDeparture ? (
                        <Badge variant="yellow-vest" size="sm" dot>
                          {t('rolloutPill')}
                        </Badge>
                      ) : step.isCrucialCheckpoint ? (
                        <Badge variant="emerald" size="sm" dot>
                          {t('checkpointPill')}
                        </Badge>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full bg-card text-ink-muted flex items-center justify-center shrink-0"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                            isStepExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </div>
                  </div>

                  {/* Center: Title, Location Chip (always visible), Desktop Badge & Collapsible Description */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-[15px] font-semibold font-rounded text-ink dark:text-white leading-snug">
                          {step.title}
                        </span>

                        {step.location && (
                          <span
                            title={step.location}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-card dark:bg-[#161618] text-ink-secondary dark:text-zinc-300 border border-black/5 dark:border-white/[0.04] max-w-full"
                          >
                            <span className="truncate">{step.location}</span>
                          </span>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        {isHardDeparture ? (
                          <Badge variant="yellow-vest" size="sm" dot>
                            {t('rolloutPill')}
                          </Badge>
                        ) : step.isCrucialCheckpoint ? (
                          <Badge variant="emerald" size="sm" dot>
                            {t('checkpointPill')}
                          </Badge>
                        ) : null}
                        <span
                          aria-hidden="true"
                          className="w-6 h-6 rounded-full bg-card text-ink-muted group-hover:text-ink flex items-center justify-center shrink-0 transition-colors"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                              isStepExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </div>
                    </div>

                    {step.description && (
                      <Collapsible open={isStepExpanded} id={descId} innerClassName="pt-1.5">
                        <p className="text-xs sm:text-[13px] text-ink-secondary dark:text-zinc-400 leading-relaxed">
                          {step.description}
                        </p>
                      </Collapsible>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {hiddenCount > 0 && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span className="tnum">{t('timelineHiddenSteps', { count: hiddenCount })}</span>
          <button
            type="button"
            onClick={() => setStepFilter('all')}
            className="px-2.5 py-1 rounded-full text-xs font-rounded font-semibold bg-pod hover:bg-chip text-ink transition-colors cursor-pointer"
          >
            {t('timelineShowAllBtn')}
          </button>
        </div>
      )}
    </Card>
  );
};
