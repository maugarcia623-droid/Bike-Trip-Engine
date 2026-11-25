import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Calendar,
  SlidersHorizontal,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes, getArchetypeFromTag } from '../../utils/archetypeChips';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { computeTripReadiness } from '../../utils/tripReadiness';
import { ReadinessGauge } from '../dashboard/RideReadinessGauge';
import { Badge } from '../common/Badge';
import { Button } from "@/components/arc/button/button";
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

interface UpcomingTripCardProps {
  trip: TripProfile;
  allTrips: TripProfile[];
  onSelectTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onEditTrip?: (trip: TripProfile) => void;
  defaultExpanded?: boolean;
}

export function getTripDateDetails(trip: TripProfile, lang: 'en' | 'fr' = 'en') {
  const now = new Date();
  let departureDateStr = trip.departureDate;
  if (!departureDateStr && trip.stages && trip.stages.length > 0) {
    departureDateStr = trip.stages[0].departureDate;
  }

  let targetDate: Date;
  if (departureDateStr) {
    const timeStr = trip.departureTime || '08:00';
    targetDate = new Date(`${departureDateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`);
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
    }
  } else {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const formattedDate = targetDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  let countdownText = '';
  let countdownCode = '';
  let countdownVariant: 'yellow-vest' | 'emerald' | 'amber' | 'blue' | 'purple' | 'zinc' = 'yellow-vest';

  if (diffDays === 0) {
    countdownCode = 'TODAY';
    countdownText = lang === 'fr' ? 'Départ aujourd’hui' : 'Leave today';
    countdownVariant = 'yellow-vest';
  } else if (diffDays === 1) {
    countdownCode = 'TOMORROW';
    countdownText = lang === 'fr' ? 'Demain' : 'Tomorrow';
    countdownVariant = 'yellow-vest';
  } else if (diffDays > 1) {
    countdownCode = `IN ${diffDays}D`;
    countdownText = lang === 'fr' ? `Dans ${diffDays} j` : `In ${diffDays} days`;
    countdownVariant = diffDays <= 3 ? 'blue' : 'purple';
  } else {
    countdownCode = 'PAST';
    countdownText = lang === 'fr' ? `Passé (${Math.abs(diffDays)} j)` : `${Math.abs(diffDays)}d ago`;
    countdownVariant = 'zinc';
  }

  return {
    targetDate,
    diffDays,
    formattedDate,
    countdownText,
    countdownCode,
    countdownVariant,
    timeFormatted: trip.departureTime || '08:00',
  };
}

export const UpcomingTripCard: React.FC<UpcomingTripCardProps> = ({
  trip,
  allTrips: _allTrips,
  onSelectTrip: _onSelectTrip,
  onLaunchDashboard,
  onEditTrip,
  defaultExpanded: _defaultExpanded = false,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const meta = getLocalizedTripMeta(trip, lang);
  const archetype = getArchetypeFromTag(trip.tag, trip.name);
  const dateInfo = useMemo(() => getTripDateDetails(trip, lang), [trip, lang]);
  const specs = useMemo(() => loadRiderBikeSpecs(), []);

  const physicsResult = useMemo(
    () => calculatePhysics(trip.physics, trip.route, trip.weather, lang, specs?.ftpWatts),
    [trip.physics, trip.route, trip.weather, lang, specs?.ftpWatts]
  );

  const extraBufferMinutes = useMemo(() => getChipsExtraBufferMinutes(trip), [trip]);
  const timelineResult = useMemo(
    () =>
      calculateReverseTimeline(
        trip.route,
        trip.office,
        trip.weather,
        trip.tag,
        trip.route?.destination,
        lang,
        extraBufferMinutes,
        trip.customChips || [],
        {
          effectiveSpeedKmH: physicsResult.effectiveSpeedKmH,
          calmSpeedKmH: physicsResult.calmSpeedKmH,
          arriveAtMode: trip.arriveAtMode,
          departureTime: trip.departureTime,
          pinnedAmenities: trip.pinnedAmenities,
          isMultiDayTour: Boolean(trip.stages && trip.stages.length > 1),
        }
      ),
    [trip, physicsResult, extraBufferMinutes, lang]
  );

  const readiness = useMemo(
    () => computeTripReadiness(trip, physicsResult, timelineResult, isFr ? 'fr' : 'en'),
    [trip, physicsResult, timelineResult, isFr]
  );

  const checkedChecklistCount = (trip.checklist || []).filter((c) => c.checked).length;
  const totalChecklistCount = Math.max(1, (trip.checklist || []).length);

  const archetypeBadgeVariant =
    archetype === 'COMMUTE'
      ? 'yellow-vest'
      : archetype === 'SPORT'
      ? 'rose'
      : archetype === 'BIKEPACKING'
      ? 'emerald'
      : 'purple';

  return (
    <div className="rounded-card bg-card p-4 sm:p-5 shadow-xs border border-ink/5 dark:border-white/5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`h-8 px-3 rounded-full font-semibold text-xs tracking-wide tnum flex items-center gap-1.5 ${
                dateInfo.countdownVariant === 'yellow-vest'
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : dateInfo.countdownVariant === 'blue'
                  ? `${CHIP_TOKENS.blue.surface} ${CHIP_TOKENS.blue.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.blue.selectedRing}`
                  : dateInfo.countdownVariant === 'purple'
                  ? `${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing}`
                  : 'bg-pod text-ink-secondary'
              } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Calendar className="w-3.5 h-3.5 text-current shrink-0" />
              <span>{dateInfo.countdownText}</span>
            </div>

            <Badge variant={archetypeBadgeVariant} size="md" className="h-8 px-3 text-xs font-semibold">
              {trip.tag === 'VÉLOTAF' ? (isFr ? 'Vélotaf' : 'Commute') : trip.tag}
            </Badge>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink leading-snug break-words">
            <span className="text-ink-secondary font-medium">{t('upcomingTripTitle')}: </span>
            <span className="font-semibold text-ink">{meta.name || t('defaultTripName')}</span>
          </h2>
          <p className="text-xs text-ink-muted tnum leading-relaxed">
            {dateInfo.formattedDate} ·{' '}
            <strong className="text-ink font-semibold">{t('hardRollout')}: {timelineResult.hardDepartureTime}</strong> ·{' '}
            {trip.route.distanceKm} km
            {trip.route.elevationGainM ? ` · +${trip.route.elevationGainM} m` : ''} ·{' '}
            {checkedChecklistCount}/{totalChecklistCount} {isFr ? 'prêt' : 'ready'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <span
            className="inline-flex items-center shrink-0"
            title={`${isFr ? 'Prêt à partir' : 'Ride readiness'}: ${readiness.score}/100 · ${readiness.label}`}
          >
            <ReadinessGauge
              score={readiness.score}
              level={readiness.level}
              label={readiness.label}
              size={40}
              showIcon={false}
            />
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={() => onLaunchDashboard(trip.id)}
            className={`flex items-center gap-1.5 min-h-[44px] h-10 px-5 rounded-full font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} hover:brightness-95 dark:hover:brightness-110`}
          >
            <span>{t('launchCockpitBtn')}</span>
            <ArrowUpRight className="w-4 h-4 text-current stroke-[2.2]" />
          </Button>

          {onEditTrip && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEditTrip(trip)}
              aria-label={isFr ? 'Modifier' : 'Edit'}
              title={isFr ? 'Modifier' : 'Edit'}
              className="min-w-[44px] min-h-[44px] w-10 h-10 p-0 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-current" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
