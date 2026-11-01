import React from 'react';
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
} from '@/components/icons';
import type { TripProfile } from '../../types/trip';
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
import { TimelineContextualBanner, getTripArchetype } from './TimelineContextualBanner';
import { useTranslation } from '../../context/LanguageContext';

interface ReverseTimelineBentoProps {
  trip?: TripProfile;
  timeline: ReverseTimelineCalculation;
  gateName?: string;
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
        <Badge variant="yellow-vest" size="md" dot className="py-1.5 px-3.5 tnum">
          {t('rolloutBadgeTime', { time: timeline.hardDepartureTime })}
        </Badge>
      }
      className="w-full"
    >
      {/* Contextual Directive Capsule / Expandable Pod */}
      <TimelineContextualBanner trip={trip} timeline={timeline} />

      {/* Stepper Timeline with Asphalt Dashed Center-Line */}
      <div className="relative mt-4 space-y-3 sm:space-y-3.5">
        {/* Continuous vertical dashed road center-line */}
        <div
          className="lane-spine absolute left-[17px] sm:left-[19px] top-4 sm:top-5 bottom-4 sm:bottom-5 pointer-events-none"
          aria-hidden="true"
        />

        {timeline.steps.map((step) => {
          const isHardDeparture =
            step.id === 'hard-departure' ||
            step.id === 'sport-rollout' ||
            step.id === 'bp-departure';

          const { icon: StepIcon, theme: stepTheme } = getTimelineStepTokenSpec(
            step.iconName,
            isHardDeparture
          );

          return (
            <div key={step.id} className="relative flex items-start sm:items-center gap-2.5 sm:gap-4 group">
              {/* Circular Layered Token Badge on Spine (Opaque card backing blocks dashed spine bleed in Dark Mode) */}
              <IconBadge
                theme={stepTheme}
                icon={StepIcon}
                size="spine"
                isSelected={isHardDeparture}
                solidBacker
                className="relative z-10 mt-2.5 sm:mt-0 transition-transform duration-200 group-hover:scale-105"
              />

              {/* Step Pod Card */}
              <div className="flex-1 min-w-0 rounded-pod p-3 sm:p-4 lg:p-4.5 bg-pod text-ink transition-colors flex flex-col items-stretch sm:flex-row sm:items-center gap-2.5 sm:gap-4 border border-transparent dark:border-white/[0.03]">
                {/* Top Row on Mobile / Left Column on Desktop: Full-Radius Time Pill + Mobile Checkpoint Badge */}
                <div className="flex items-center justify-between gap-2 sm:shrink-0">
                  <div
                    className={`min-w-[74px] sm:min-w-[96px] px-3 py-1 sm:px-4 sm:py-2 rounded-full flex items-center justify-center shrink-0 ${CHIP_RING_BASE} ${
                      isHardDeparture
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : `bg-card text-ink dark:text-zinc-100 ${CHIP_RING_UNSELECTED} border border-black/[0.04] dark:border-white/[0.04]`
                    }`}
                  >
                    <span className="font-mono text-lg sm:text-[23px] lg:text-[25px] font-bold tracking-tight tnum">
                      {step.time}
                    </span>
                  </div>

                  {isHardDeparture ? (
                    <Badge variant="yellow-vest" size="sm" dot className="sm:hidden shrink-0">
                      {t('rolloutPill')}
                    </Badge>
                  ) : step.isCrucialCheckpoint ? (
                    <Badge variant="emerald" size="sm" dot className="sm:hidden shrink-0">
                      {t('checkpointPill')}
                    </Badge>
                  ) : null}
                </div>

                {/* Center: Title, Checkpoint Badge (Desktop), Description & Location Chip */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-ink dark:text-white leading-snug">
                      {step.title}
                    </span>

                    {isHardDeparture ? (
                      <Badge variant="yellow-vest" size="sm" dot className="hidden sm:inline-flex shrink-0">
                        {t('rolloutPill')}
                      </Badge>
                    ) : step.isCrucialCheckpoint ? (
                      <Badge variant="emerald" size="sm" dot className="hidden sm:inline-flex shrink-0">
                        {t('checkpointPill')}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-xs sm:text-[13px] text-ink-secondary dark:text-zinc-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>

                  {step.location && (
                    <div className="mt-2 sm:mt-2.5">
                      <span
                        title={step.location}
                        className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium bg-card dark:bg-[#161618] text-ink-secondary dark:text-zinc-300 border border-black/5 dark:border-white/[0.04] max-w-full"
                      >
                        <span className="truncate">{step.location}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
