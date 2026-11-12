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
  MapPin,
  Droplets,
  Cemetery,
  Baguette,
  Wrench,
  Flag,
} from '@/components/icons';
import type { TripProfile, TimelineStep } from '../../types/trip';
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
import { getTripArchetype } from './TimelineContextualBanner';
import { useTranslation } from '../../context/LanguageContext';

interface ReverseTimelineBentoProps {
  trip?: TripProfile;
  timeline: ReverseTimelineCalculation;
  gateName?: string;
  riderSpecs?: RiderBikeSpecs;
}

type TimelineStepFilter = 'all' | 'crucial';
export type TimelinePhase = 'pre-ride' | 'ride' | 'post-ride';

const ROLLOUT_STEP_IDS = new Set(['hard-departure', 'sport-rollout', 'bp-departure']);
const ARRIVAL_STEP_IDS = new Set([
  'gate-security',
  'destination-arrival',
  'bp-destination-arrive',
  'sport-session-finish',
]);

const PHASE_BRAND_THEME: Record<TimelinePhase, ChipTheme> = {
  'pre-ride': 'amber',
  ride: 'yellow-vest',
  'post-ride': 'emerald',
};

function computeStepPhases(steps: TimelineStep[]): Record<string, TimelinePhase> {
  const rolloutIdx = steps.findIndex((s) => ROLLOUT_STEP_IDS.has(s.id));
  const arrivalIdx = steps.findIndex((s) => ARRIVAL_STEP_IDS.has(s.id));

  const map: Record<string, TimelinePhase> = {};
  steps.forEach((step, idx) => {
    if (rolloutIdx !== -1 && idx < rolloutIdx) {
      map[step.id] = 'pre-ride';
    } else if (arrivalIdx !== -1 && idx > arrivalIdx) {
      map[step.id] = 'post-ride';
    } else if (rolloutIdx !== -1 && (arrivalIdx === -1 || idx <= arrivalIdx)) {
      map[step.id] = 'ride';
    } else if (step.category === 'ride' || step.category === 'transit') {
      map[step.id] = 'ride';
    } else if (step.category === 'office') {
      map[step.id] = 'post-ride';
    } else {
      map[step.id] = 'pre-ride';
    }
  });
  return map;
}

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
      case 'Droplets':
        return { icon: Droplets, theme: 'sky' };
      case 'Cemetery':
        return { icon: Cemetery, theme: 'teal' };
      case 'Baguette':
        return { icon: Baguette, theme: 'amber' };
      case 'Wrench':
        return { icon: Wrench, theme: 'orange' };
      case 'MapPin':
        return { icon: MapPin, theme: 'emerald' };
      case 'Flag':
        return { icon: Flag, theme: 'emerald' };
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

  const stepPhaseMap = useMemo(() => computeStepPhases(timeline.steps), [timeline.steps]);

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

  const getPhaseLabel = (phase: TimelinePhase): string => {
    switch (phase) {
      case 'pre-ride':
        return t('timelinePhasePreRide');
      case 'ride':
        return t('timelinePhaseRide');
      case 'post-ride':
        return t('timelinePhasePostRide');
    }
  };

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
            className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-pod"
          >
            <button
              type="button"
              onClick={() => setStepFilter('crucial')}
              aria-pressed={stepFilter === 'crucial'}
              className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-semibold transition-all cursor-pointer select-none active:scale-[0.98] ${CHIP_RING_BASE} ${
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
              className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-semibold tnum transition-all cursor-pointer select-none active:scale-[0.98] ${CHIP_RING_BASE} ${
                stepFilter === 'all'
                  ? 'bg-card text-ink shadow-xs ring-ink/10 dark:ring-white/10'
                  : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
              }`}
            >
              {t('timelineFilterAll', { count: timeline.steps.length })}
            </button>
          </div>

          <Badge variant="yellow-vest" size="md" dot className="tnum">
            {t('rolloutBadgeTime', { time: timeline.hardDepartureTime })}
          </Badge>
        </div>
      }
      className="w-full"
    >
      {/*
        Compact Itinerary Rail
        Columns: [time · 3rem] [spine node · 2rem] [title + location] [phase badge + chevron]
        Rows sit directly on the card surface (rounded-pod at 16px inset → concentric with rounded-card).
      */}
      <div className="mt-2">
        <ol className="relative py-0.5 space-y-0.5" aria-label={cardTitle}>
          {/* Continuous vertical dashed road center-line, centred on the node column */}
          {visibleSteps.length > 1 && (
            <div
              className="lane-spine absolute left-[83px] top-6 bottom-6 sm:top-[22px] sm:bottom-[22px] pointer-events-none"
              aria-hidden="true"
            />
          )}

          {visibleSteps.map((step, index) => {
            const isHardDeparture = ROLLOUT_STEP_IDS.has(step.id);
            const isCrucial = step.isCrucialCheckpoint || isHardDeparture;
            const phase: TimelinePhase = stepPhaseMap[step.id] || 'pre-ride';
            const prevPhase =
              index > 0 ? stepPhaseMap[visibleSteps[index - 1].id] || 'pre-ride' : null;
            const isPhaseStart = prevPhase !== phase;
            const phaseTheme = PHASE_BRAND_THEME[phase];
            const phaseTokens = CHIP_TOKENS[phaseTheme];

            const { icon: StepIcon, theme: stepTheme } = getTimelineStepTokenSpec(
              step.iconName,
              isHardDeparture
            );

            const hasDescription = Boolean(step.description);
            const isStepExpanded = hasDescription && Boolean(expandedSteps[step.id]);
            const descId = `timeline-step-desc-${step.id}`;
            const showCheckpointDot =
              stepFilter === 'all' && step.isCrucialCheckpoint && !isHardDeparture;

            return (
              <React.Fragment key={step.id}>
                {/* Subtle Phase Boundary Divider across Pre-Ride (Amber) → Ride (Yellow-Vest) → Post-Ride (Emerald) */}
                {isPhaseStart && index > 0 && (
                  <li aria-hidden="true" className="pt-2 pb-1">
                    <div className="grid grid-cols-[3rem_2rem_minmax(0,1fr)] items-center gap-x-3 px-2">
                      <span />
                      <span className="flex justify-center">
                        <span
                          className={`relative z-10 w-2 h-2 rounded-full ring-4 ring-card ${phaseTokens.dot}`}
                        />
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rounded font-semibold shrink-0 ${phaseTokens.surface} ${phaseTokens.primary}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${phaseTokens.dot}`} />
                          {getPhaseLabel(phase)}
                        </span>
                        <div className="lane-divider flex-1" />
                      </div>
                    </div>
                  </li>
                )}

                <li className="group">
                  <button
                    type="button"
                    onClick={hasDescription ? () => toggleStep(step.id) : undefined}
                    aria-expanded={hasDescription ? isStepExpanded : undefined}
                    aria-controls={hasDescription ? descId : undefined}
                    tabIndex={hasDescription ? 0 : -1}
                    className={`w-full grid grid-cols-[3rem_2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-1.5 rounded-pod text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30 ${
                      hasDescription ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isHardDeparture
                        ? 'bg-pod/80 dark:bg-pod/60 ring-1 ring-inset ring-[#a3b300]/30 dark:ring-[#dfff00]/20 hover:bg-pod'
                        : isStepExpanded
                        ? 'bg-pod'
                        : hasDescription
                        ? 'hover:bg-pod active:bg-chip/70'
                        : ''
                    }`}
                  >
                    {/* Tier 1/2/3 Time — right-aligned tabular readout with greyscale + phase hierarchy */}
                    <span
                      className={`text-right font-rounded text-sm sm:text-[15px] tracking-tight tnum leading-none ${
                        isHardDeparture
                          ? `font-bold ${CHIP_TOKENS['yellow-vest'].primary}`
                          : isCrucial
                          ? 'font-bold text-ink'
                          : 'font-semibold text-ink-muted group-hover:text-ink-secondary transition-colors'
                      }`}
                    >
                      {step.time}
                    </span>

                    {/* Spine Node — layered token badge with solid backer over the dashed lane */}
                    <IconBadge
                      theme={stepTheme}
                      icon={StepIcon}
                      size="md"
                      isSelected={isHardDeparture}
                      solidBacker
                      className="relative z-10 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
                    />

                    {/* Tier 1/2/3 Title + Tier 4 Location — distinct greyscale contrast steps */}
                    <span className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2 py-0.5">
                      <span className="min-w-0 flex items-center gap-1.5">
                        <span
                          className={`break-words text-sm font-rounded leading-snug ${
                            isCrucial
                              ? 'font-semibold text-ink'
                              : 'font-medium text-ink-secondary group-hover:text-ink transition-colors'
                          }`}
                        >
                          {step.title}
                        </span>
                        {showCheckpointDot && (
                          <span
                            title={t('checkpointPill')}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${phaseTokens.dot}`}
                          >
                            <span className="sr-only">{t('checkpointPill')}</span>
                          </span>
                        )}
                      </span>
                      {step.location && (
                        <span
                          title={step.location}
                          className="min-w-0 break-words text-xs leading-snug text-ink-muted"
                        >
                          <span
                            className="hidden sm:inline text-ink-muted/50 mr-1"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          {step.location}
                        </span>
                      )}
                    </span>

                    {/* Meta — Brand Phase Pill (Pre-Ride Amber / En Route Yellow-Vest / Post-Ride Emerald) + Chevron */}
                    <span className="flex items-center gap-1.5 shrink-0">
                      {isHardDeparture ? (
                        <Badge
                          variant="yellow-vest"
                          size="xs"
                          dot
                          className="hidden min-[400px]:inline-flex"
                        >
                          {t('rolloutPill')}
                        </Badge>
                      ) : isPhaseStart ? (
                        <Badge
                          variant={phaseTheme}
                          size="xs"
                          dot
                          className="hidden sm:inline-flex"
                        >
                          {getPhaseLabel(phase)}
                        </Badge>
                      ) : (
                        <span
                          title={getPhaseLabel(phase)}
                          className="hidden sm:inline-flex items-center justify-center w-4 h-4"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${phaseTokens.dot}`} />
                        </span>
                      )}

                      {hasDescription && (
                        <span
                          aria-hidden="true"
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isStepExpanded
                              ? 'bg-card text-ink'
                              : 'text-ink-muted group-hover:text-ink group-hover:bg-card'
                          }`}
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                              isStepExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      )}
                    </span>

                    {/* Tier 4 Collapsible Description — aligned to the content column with phase accent bar */}
                    {hasDescription && (
                      <Collapsible
                        open={isStepExpanded}
                        id={descId}
                        className="col-start-3 col-span-2"
                        innerClassName="pt-1.5 pb-1 pr-1"
                      >
                        <p
                          className={`text-xs sm:text-[13px] text-ink-secondary leading-relaxed pl-2.5 border-l-2 ${
                            phase === 'ride'
                              ? 'border-[#a3b300]/60 dark:border-[#dfff00]/45'
                              : phase === 'post-ride'
                              ? 'border-emerald-500/50 dark:border-emerald-400/50'
                              : 'border-amber-500/50 dark:border-amber-400/50'
                          }`}
                        >
                          {step.description}
                        </p>
                      </Collapsible>
                    )}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </div>

      {/* Ghost node for hidden secondary steps — aligned with the spine column */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setStepFilter('all')}
          className="group mt-1 w-full grid grid-cols-[3rem_2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-1.5 rounded-pod text-left hover:bg-pod transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <span aria-hidden="true" />
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-rounded font-bold tnum text-ink-muted bg-pod group-hover:text-ink transition-colors"
          >
            +{hiddenCount}
          </span>
          <span className="min-w-0 break-words text-xs text-ink-muted group-hover:text-ink-secondary tnum transition-colors">
            {t('timelineHiddenSteps', { count: hiddenCount })}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-rounded font-semibold bg-pod group-hover:bg-card text-ink-secondary group-hover:text-ink transition-colors">
            {t('timelineShowAllBtn')}
          </span>
        </button>
      )}
    </Card>
  );
};
