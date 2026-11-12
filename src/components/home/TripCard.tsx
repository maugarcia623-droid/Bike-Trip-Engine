import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Copy,
  Trash,
  PencilSimple,
  Clock,
  Wind,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes, findChipDef, CHIP_ICONS } from '../../utils/archetypeChips';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { getExpeditionTotals } from '../../utils/stageManager';
import { Badge } from '../common/Badge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface TripCardProps {
  trip: TripProfile;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (trip: TripProfile) => void;
  onDuplicate: (trip: TripProfile) => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onLaunch,
}) => {
  const { lang, t } = useTranslation();
  const riderSpecs = loadRiderBikeSpecs();
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather, lang, riderSpecs?.ftpWatts);
  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const timelineResult = calculateReverseTimeline(
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

  const checkedCount = trip.checklist.filter((c) => c.checked).length;
  const totalChecklist = Math.max(1, trip.checklist.length);
  const activeSegments = Math.round((checkedCount / totalChecklist) * 5);

  return (
    <div className="group relative rounded-card p-4 bg-card text-ink apple-card-hover flex flex-col justify-between h-full shadow-xs hover:shadow-lg border border-ink/5 dark:border-white/5">
      {/* Top Section: Category, Actions, Title, Description, Preset Tags */}
      <div>
        {/* Top Row: Category Pill & Circular Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="zinc" size="md">
              {trip.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : trip.tag}
            </Badge>
            {trip.stages && trip.stages.length > 1 && (
              <Badge variant="yellow-vest" size="md">
                {t('tourBadgeLabel', { count: trip.stages.length })}
              </Badge>
            )}
            {trip.route?.waypoints && trip.route.waypoints.length > 0 && (
              <Badge variant="sky" size="md">
                +{trip.route.waypoints.length} via
              </Badge>
            )}
            {isActive && (
              <Badge variant="yellow-vest" size="md" dot>
                {t('activeBadge')}
              </Badge>
            )}
            <Badge
              variant={
                physicsResult.goStatus === 'GO'
                  ? 'emerald'
                  : physicsResult.goStatus === 'CAUTION'
                  ? 'amber'
                  : 'rose'
              }
              size="md"
              dot
              title={`${t('rideFeasibility')}: ${physicsResult.goStatus === 'GO' ? t('feasibilityOptimal') : physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')} — ${physicsResult.goStatusReason}`}
            >
              {physicsResult.goStatus === 'GO' ? t('feasibilityOptimal') : physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}
            </Badge>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onDuplicate(trip)}
              title={t('duplicateTripTitle')}
              aria-label={t('duplicateTripTitle')}
              className={`relative before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Copy className="w-4 h-4 text-current" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(trip)}
              title={t('editParamsTitle')}
              aria-label={t('editParamsTitle')}
              className={`relative before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <PencilSimple className="w-4 h-4 text-current" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(trip.id)}
              title={t('deleteProfileTitle')}
              aria-label={t('deleteProfileTitle')}
              className={`relative before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Trash className="w-4 h-4 text-current" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-semibold text-ink tracking-tight leading-snug break-words">
          {meta.name || t('defaultTripName')}
        </h3>
        <p className="text-[13px] text-ink-muted break-words mt-1 mb-2.5 leading-relaxed">
          {meta.description}
        </p>

        {/* Feasibility Alert Capsule when not GO */}
        {physicsResult.goStatus !== 'GO' && (
          <div
            className={`mb-3 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 ${
              physicsResult.goStatus === 'CAUTION'
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
            }`}
            title={`${physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}: ${physicsResult.goStatusReason}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                physicsResult.goStatus === 'CAUTION'
                  ? CHIP_TOKENS.amber.dot
                  : CHIP_TOKENS.rose.dot
              }`}
            />
            <span className="break-words font-medium leading-tight">{physicsResult.goStatusReason}</span>
          </div>
        )}

        {/* Active Custom Preset Chips as Borderless Colored Pills */}
        {(trip.customChips || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {(trip.customChips || []).slice(0, 3).map((chipId) => {
              const def = findChipDef(chipId);
              if (!def) return null;
              const Icon = CHIP_ICONS[def.iconName];
              return (
                <Badge
                  key={chipId}
                  variant={def.colorKey}
                  size="sm"
                  icon={Icon}
                >
                  {lang === 'fr' ? def.labelFr : def.labelEn}
                </Badge>
              );
            })}
            {(trip.customChips || []).length > 3 && (
              <span className="text-[10px] font-rounded font-medium tnum px-2 py-0.5 rounded-full bg-pod text-ink-muted self-center">
                +{(trip.customChips || []).length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Hero Departure Sub-Card, Attribute Pills, Action Row */}
      <div className="mt-auto">
        {/* Hero Departure Sub-Card (Yellow-Vest Layered Token Matrix when Active) */}
        <div
          className={`rounded-pod p-4 mb-4 transition-colors ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            isActive
              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
              : `${CHIP_RING_UNSELECTED} bg-pod text-ink`
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 flex-wrap text-xs font-medium ${
              isActive ? 'opacity-85' : 'text-ink-muted'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Clock className={`w-4 h-4 shrink-0 ${isActive ? 'text-current' : GREYSCALE_TOKENS.primary}`} />
              <span>{t('hardRollout')}</span>
            </span>
            <span className="tnum">
              {t('arrivalTimeLabel', { time: timelineResult.gateArrivalTime })}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div className="text-4xl font-semibold tracking-tight tnum leading-none">
              {timelineResult.hardDepartureTime}
            </div>
            <div className="text-right tnum">
              {riderSpecs?.cockpitViewMode === 'pro' ? (
                <>
                  <span className="text-base font-semibold block">
                    {Math.round(physicsResult.legWatts)} W &middot; {physicsResult.powerZone}
                  </span>
                  <span className={`text-xs block ${isActive ? 'opacity-80' : 'text-ink-muted'}`}>
                    {physicsResult.effectiveSpeedKmH} km/h{riderSpecs?.telemetryMode === 'quantitative' ? ` · ${physicsResult.wattsPerKg} W/kg` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base font-semibold block">
                    {physicsResult.effectiveSpeedKmH} km/h
                  </span>
                  <span className={`text-xs block ${isActive ? 'opacity-80' : 'text-ink-muted'}`}>
                    ~{Math.max(5, Math.round((trip.route.distanceKm / Math.max(8, physicsResult.effectiveSpeedKmH)) * 60))} min
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Segmented Road-Lane Readiness Bar + Telemetry Code */}
          <div className="mt-4 pt-3 border-t border-dashed border-current/15 dark:border-current/15 flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-1.5"
              title={t('readinessProgressTitle', { checked: checkedCount, total: totalChecklist })}
            >
              {Array.from({ length: 5 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 w-4 rounded-full ${
                    idx < activeSegments
                      ? isActive
                        ? CHIP_TOKENS['yellow-vest'].dot
                        : CHIP_TOKENS.emerald.dot
                      : isActive
                      ? 'bg-[#4d5200]/20 dark:bg-[#dfff00]/20'
                      : 'bg-chip'
                  }`}
                />
              ))}
            </div>

            <span className={`font-rounded font-medium text-xs tnum ${isActive ? 'opacity-85' : 'text-ink-secondary'}`}>
              {t('readyCountLabel', {
                checked: String(checkedCount).padStart(2, '0'),
                total: String(totalChecklist).padStart(2, '0'),
              })}
            </span>
          </div>
        </div>

        {/* Compact Full-Radius Attribute Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          <Badge
            variant="zinc"
            size="md"
            className="tnum"
            title={
              trip.stages && trip.stages.length > 1
                ? `+${getExpeditionTotals(trip).totalElevationM} m`
                : undefined
            }
          >
            {trip.stages && trip.stages.length > 1
              ? `${getExpeditionTotals(trip).totalDistanceKm} km`
              : `${trip.route.distanceKm} km`}
          </Badge>
          <Badge variant="zinc" size="md" className="tnum">
            {riderSpecs?.cockpitViewMode === 'pro'
              ? t('rigMassPill', { mass: Number(physicsResult.systemMassKg.toFixed(1)) })
              : `${trip.weather.temperatureC}°C · ${trip.weather.baseWindSpeedKmH} km/h ${lang === 'fr' ? 'vent' : 'wind'}`}
          </Badge>
          <Badge
            variant={trip.weather.isHeadwindActive ? 'amber' : 'zinc'}
            size="md"
            icon={Wind}
            className="tnum"
          >
            {trip.weather.isHeadwindActive
              ? t('windSpeedPill', { speed: trip.weather.baseWindSpeedKmH })
              : t('calmWind')}
          </Badge>
        </div>

        {/* Full-Radius Action Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLaunch(trip.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 font-semibold text-[13px] h-10 px-4 rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              isActive
                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} hover:brightness-[0.97] dark:hover:brightness-110`
                : `${CHIP_RING_UNSELECTED} bg-[#111111] hover:bg-[#262626] text-white dark:bg-chip dark:hover:bg-chip-hover dark:text-ink`
            }`}
          >
            <span>{t('openFlightDeckBtn')}</span>
            <ArrowUpRight className="w-4 h-4 text-current" />
          </button>

          {!isActive && (
            <button
              type="button"
              onClick={() => onSelect(trip.id)}
              className="text-xs font-medium text-ink-secondary hover:text-ink bg-pod hover:bg-chip h-10 px-4 rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              {t('setActiveBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
