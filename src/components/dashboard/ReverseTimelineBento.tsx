import React, { useMemo, useState } from 'react';
import { Button, Timeline } from '@/components/arc';
import type { TimelineEvent, TimelineGroupMeta } from '@/components/arc';
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
}) => {
  const { t } = useTranslation();

  // Collapsed summary view by default: crucial checkpoints shown, descriptions tucked until clicked
  const [stepFilter, setStepFilter] = useState<TimelineStepFilter>('crucial');

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

  const groupLabels = useMemo<Record<string, TimelineGroupMeta>>(() => {
    const phases: Array<{ key: TimelinePhase; label: string }> = [
      { key: 'pre-ride', label: t('timelinePhasePreRide') },
      { key: 'ride', label: t('timelinePhaseRide') },
      { key: 'post-ride', label: t('timelinePhasePostRide') },
    ];

    return phases.reduce<Record<string, TimelineGroupMeta>>((acc, { key, label }) => {
      const tokens = CHIP_TOKENS[PHASE_BRAND_THEME[key]];
      acc[key] = {
        label,
        showDivider: true,
        header: (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rounded font-semibold shrink-0 ${tokens.surface} ${tokens.primary}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tokens.dot}`} />
            {label}
          </span>
        ),
      };
      return acc;
    }, {});
  }, [t]);

  const events = useMemo<TimelineEvent[]>(() => {
    return visibleSteps.map((step) => {
      const isHardDeparture = ROLLOUT_STEP_IDS.has(step.id);
      const isCrucial = step.isCrucialCheckpoint || isHardDeparture;
      const phase: TimelinePhase = stepPhaseMap[step.id] || 'pre-ride';
      const phaseTokens = CHIP_TOKENS[PHASE_BRAND_THEME[phase]];
      const { icon: StepIcon, theme: stepTheme } = getTimelineStepTokenSpec(
        step.iconName,
        isHardDeparture
      );
      const showCheckpointDot =
        stepFilter === 'all' && step.isCrucialCheckpoint && !isHardDeparture;

      return {
        id: step.id,
        group: phase,
        title: step.title,
        titleSuffix: showCheckpointDot ? (
          <span
            title={t('checkpointPill')}
            className={`inline-block align-middle ml-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${phaseTokens.dot}`}
          >
            <span className="sr-only">{t('checkpointPill')}</span>
          </span>
        ) : undefined,
        meta: step.location || undefined,
        timeLabel: step.time,
        timeFull: `${step.time} — ${step.title}`,
        highlight: isHardDeparture,
        emphasis: isHardDeparture ? 'accent' : isCrucial ? 'strong' : 'default',
        marker: (
          <IconBadge
            theme={stepTheme}
            icon={StepIcon}
            size="md"
            isSelected={isHardDeparture}
            solidBacker
            className="transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          />
        ),
        badge: isHardDeparture ? (
          <Badge
            variant="yellow-vest"
            size="xs"
            dot
            className="hidden min-[400px]:inline-flex"
          >
            {t('rolloutPill')}
          </Badge>
        ) : undefined,
        detail: step.description ? (
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
        ) : undefined,
      };
    });
  }, [visibleSteps, stepPhaseMap, stepFilter, t]);

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
            <Button
              variant="ghost"
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
            </Button>
            <Button
              variant="ghost"
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
            </Button>
          </div>

          <Badge variant="yellow-vest" size="md" dot className="tnum">
            {t('rolloutBadgeTime', { time: timeline.hardDepartureTime })}
          </Badge>
        </div>
      }
      className="w-full"
    >
      <div className="mt-2">
        <Timeline
          key={trip?.id ?? 'default'}
          events={events}
          label={cardTitle}
          groupBy="custom"
          sortOrder="preserve"
          groupLabels={groupLabels}
          showGroupCount={false}
          connectorStyle="dashed"
          markerSize="md"
          scrollToNew={false}
        />
      </div>

      {/* Ghost node for hidden secondary steps — aligned with the 32px marker spine column */}
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          type="button"
          onClick={() => setStepFilter('all')}
          className="group mt-1.5 w-full grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2.5 px-0 py-1.5 rounded-pod text-left hover:bg-pod transition-colors cursor-pointer"
        >
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
        </Button>
      )}
    </Card>
  );
};
