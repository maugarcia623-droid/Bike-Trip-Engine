import React from 'react';
import { Briefcase, Calendar, Compass, Copy, Lightning, PencilSimple, Tent, Trash } from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes } from '../../utils/archetypeChips';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { Badge, BadgeVariant } from '../common/Badge';
import { Button } from '@/components/arc';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import { getTripDateDetails } from './UpcomingTripCard';

interface CompactTripCardProps {
  trip: TripProfile;
  isActive: boolean;
  variant: 'carousel' | 'list';
  onClick: () => void;
  onDuplicate?: (trip: TripProfile) => void;
  onEdit?: (trip: TripProfile) => void;
  onDelete?: (id: string) => void;
}

function getRideStyleBadge(tag: string): {
  variant: BadgeVariant;
  icon: React.ComponentType<{ className?: string }>;
} {
  const normalized = (tag || '').toUpperCase();
  if (normalized === 'VÉLOTAF' || normalized === 'COMMUTE') {
    return { variant: 'sky', icon: Briefcase };
  }
  if (normalized === 'SPORT') {
    return { variant: 'rose', icon: Lightning };
  }
  if (normalized === 'BIKEPACKING') {
    return { variant: 'amber', icon: Tent };
  }
  if (normalized === 'ESCAPADE') {
    return { variant: 'purple', icon: Compass };
  }
  return { variant: 'emerald', icon: Compass };
}

export const CompactTripCard: React.FC<CompactTripCardProps> = ({
  trip,
  isActive,
  variant,
  onClick,
  onDuplicate,
  onEdit,
  onDelete,
}) => {
  const { lang, t } = useTranslation();
  const riderSpecs = loadRiderBikeSpecs();
  const physicsResult = calculatePhysics(
    trip.physics,
    trip.route,
    trip.weather,
    lang,
    riderSpecs?.ftpWatts
  );
  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  // Compute timeline so readiness/duration match TripCard
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
    }
  );
  const meta = getLocalizedTripMeta(trip, lang);
  const dateInfo = getTripDateDetails(trip, lang);
  const rideStyleBadge = getRideStyleBadge(trip.tag);

  const checkedCount = trip.checklist.filter((c) => c.checked).length;
  const totalChecklist = Math.max(1, trip.checklist.length);
  const customCount = (trip.customChips || []).length;
  const durationMin = Math.max(
    5,
    Math.round((trip.route.distanceKm / Math.max(8, physicsResult.effectiveSpeedKmH)) * 60)
  );

  const feasibilityLabel =
    physicsResult.goStatus === 'GO'
      ? t('feasibilityOptimal')
      : physicsResult.goStatus === 'CAUTION'
      ? t('feasibilityCaution')
      : t('feasibilitySevere');

  const feasibilityVariant =
    physicsResult.goStatus === 'GO'
      ? 'emerald'
      : physicsResult.goStatus === 'CAUTION'
      ? 'amber'
      : 'rose';

  const customizationsLabel =
    lang === 'fr'
      ? `${customCount} personnalisation${customCount > 1 ? 's' : ''}`
      : `${customCount} customization${customCount === 1 ? '' : 's'}`;

  const readyLabel = t('readyCountLabel', {
    checked: String(checkedCount),
    total: String(totalChecklist),
  });

  if (variant === 'carousel') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="w-[268px] shrink-0 snap-start rounded-card p-3.5 bg-card text-ink border border-ink/5 dark:border-white/5 shadow-xs flex flex-col justify-between gap-3 cursor-pointer transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={dateInfo.countdownVariant} size="md" icon={Calendar} className="h-9 tnum">
            {dateInfo.countdownText}
          </Badge>
          <Badge variant={rideStyleBadge.variant} size="md" icon={rideStyleBadge.icon} className="h-9">
            {trip.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : trip.tag}
          </Badge>
          {isActive && (
            <Badge variant="yellow-vest" size="md" dot className="h-9">
              {t('activeBadge')}
            </Badge>
          )}
          <Badge variant={feasibilityVariant} size="md" dot className="h-9">
            {feasibilityLabel}
          </Badge>
        </div>

        <div className="flex items-end justify-between gap-2.5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-sm font-semibold text-ink tracking-tight leading-snug break-words">
              {meta.name || t('defaultTripName')}
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-pod text-ink-secondary text-[11px] font-medium tnum">
              {customizationsLabel}
            </span>
          </div>

          <div className="text-right tnum shrink-0 text-xs space-y-0.5">
            <div className="font-semibold text-ink">{physicsResult.effectiveSpeedKmH} km/h</div>
            <div className="text-ink-muted">~{durationMin} min</div>
            <div className="text-ink-secondary font-medium pt-0.5">{readyLabel}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full rounded-card p-4 bg-card text-ink border border-ink/5 dark:border-white/5 shadow-xs flex flex-col gap-3 cursor-pointer transition-all active:scale-[0.99]"
    >
      {/* Top Row: Badges & Circular Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge variant={dateInfo.countdownVariant} size="md" icon={Calendar} className="h-9 tnum">
            {dateInfo.countdownText}
          </Badge>
          <Badge variant={rideStyleBadge.variant} size="md" icon={rideStyleBadge.icon} className="h-9">
            {trip.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : trip.tag}
          </Badge>
          {isActive && (
            <Badge variant="yellow-vest" size="md" dot className="h-9">
              {t('activeBadge')}
            </Badge>
          )}
          <Badge variant={feasibilityVariant} size="md" dot className="h-9">
            {feasibilityLabel}
          </Badge>
        </div>

        {(onDuplicate || onEdit || onDelete) && (
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {onDuplicate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDuplicate(trip)}
                title={t('duplicateTripTitle')}
                aria-label={t('duplicateTripTitle')}
                className={`relative before:content-[''] before:absolute before:-inset-1.5 w-9 h-9 p-0 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Copy className="w-4 h-4 text-current" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(trip)}
                title={t('editParamsTitle')}
                aria-label={t('editParamsTitle')}
                className={`relative before:content-[''] before:absolute before:-inset-1.5 w-9 h-9 p-0 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <PencilSimple className="w-4 h-4 text-current" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDelete(trip.id)}
                title={t('deleteProfileTitle')}
                aria-label={t('deleteProfileTitle')}
                className={`relative before:content-[''] before:absolute before:-inset-1.5 w-9 h-9 p-0 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Trash className="w-4 h-4 text-current" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Date + Title + Description + Customizations | Speed + Duration + Ready */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-medium text-ink-muted">{dateInfo.formattedDate}</div>
          <h3 className="text-lg font-semibold text-ink tracking-tight leading-snug break-words">
            {meta.name || t('defaultTripName')}
          </h3>
          {meta.description && (
            <p className="text-[13px] text-ink-muted line-clamp-2 leading-relaxed">
              {meta.description}
            </p>
          )}
          <div className="pt-1.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-pod text-ink-secondary text-xs font-medium tnum">
              {customizationsLabel}
            </span>
          </div>
        </div>

        <div className="text-right tnum shrink-0 space-y-0.5">
          <div className="text-sm font-semibold text-ink">{physicsResult.effectiveSpeedKmH} km/h</div>
          <div className="text-xs text-ink-muted">~{durationMin} min</div>
          <div className="text-xs text-ink-secondary font-medium pt-2">{readyLabel}</div>
        </div>
      </div>
    </div>
  );
};
