import React, { useMemo } from 'react';
import { Button } from '@/components/arc';
import {
  Route,
  Mountain,
  Clock,
  BedDouble,
  Download,
  Banana,
  Bike,
  Flame2,
  ArrowRight,
  Calendar,
  SlidersHorizontal,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { getTourAggregateSummary, TourFatigueLevel } from '../../utils/stageManager';
import { downloadEntireTourGpx, downloadStageGpx } from '../../utils/gpxExporter';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { InfoTooltip } from '../common/InfoTooltip';
import { CHIP_TOKENS, CHIP_DUOTONE_ISOLATION_CLASSES } from '../../tokens/chipTokens';

interface TourOverviewCardProps {
  trip: TripProfile;
  activeStageIdx?: number;
  onSelectStage?: (idx: number) => void;
  onOpenSlicer?: () => void;
  hideHeaderActions?: boolean;
  /** When true, renders flush inside a parent card instead of creating a second standalone card. */
  embedded?: boolean;
  ftpWatts?: number;
  className?: string;
}

function formatShortDate(iso?: string, lang: 'en' | 'fr' = 'en'): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const TourOverviewCard: React.FC<TourOverviewCardProps> = ({
  trip,
  activeStageIdx = 0,
  onSelectStage,
  onOpenSlicer,
  hideHeaderActions = false,
  embedded = false,
  ftpWatts,
  className = '',
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const summary = useMemo(
    () => getTourAggregateSummary(trip, lang, ftpWatts),
    [trip, lang, ftpWatts]
  );

  const getFatigueBadgeProps = (level: TourFatigueLevel) => {
    if (level === 'high') {
      return { variant: 'rose' as const, label: t('tourFatigueHigh') };
    }
    if (level === 'moderate') {
      return { variant: 'amber' as const, label: t('tourFatigueModerate') };
    }
    return { variant: 'emerald' as const, label: t('tourFatigueFresh') };
  };

  return (
    <div
      className={`${
        embedded ? 'p-4 sm:p-5' : 'rounded-pod bg-card p-3.5 sm:p-4'
      } text-ink space-y-3.5 transition-colors ${className}`}
    >
      {/* Header Row: Title + Single-Click Export Entire Tour GPX */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-pod flex items-center justify-center shrink-0">
            <Bike className="w-4 h-4 text-ink" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-semibold font-rounded tracking-tight text-ink">
              {t('tourTimelineHeading')}
            </h3>
            <p className="text-[11px] text-ink-muted truncate font-body">
              {summary.originCity || '...'} → {summary.finalDestinationCity || '...'} ·{' '}
              {t('daysCountUnit', { count: summary.totalDays })}
            </p>
          </div>
        </div>

        {!hideHeaderActions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenSlicer && (
              <Button
                variant="ghost"
                type="button"
                onClick={onOpenSlicer}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-semibold transition-all duration-150 cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-current shrink-0" />
                <span>{isFr ? 'Ajuster les étapes' : 'Edit cuts'}</span>
              </Button>
            )}
            <Button variant="ghost"
              type="button"
              onClick={() => downloadEntireTourGpx(trip)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-full text-xs font-rounded font-semibold transition-all duration-150 cursor-pointer shrink-0 shadow-xs active:scale-[0.98] ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-95`}
            >
              <Download className="w-3.5 h-3.5 text-current shrink-0" />
              <span>{t('exportEntireTourGpxBtn')}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Cumulative Tour Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Distance */}
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-medium">
            <Route className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
            <span className="truncate">{t('tourSummaryDistance')}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-rounded text-ink tnum leading-tight">
            {summary.totalDistanceKm} <span className="text-xs font-medium text-ink-muted">km</span>
          </div>
        </div>

        {/* Elevation */}
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-medium">
            <Mountain className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
            <span className="truncate">{t('tourSummaryElevation')}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-rounded text-ink tnum leading-tight">
            +{summary.totalElevationM.toLocaleString()} <span className="text-xs font-medium text-ink-muted">m</span>
          </div>
        </div>

        {/* Moving Time & Battery Runtime */}
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-medium">
            <Clock className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
            <span className="truncate">{t('tourSummaryMovingTime')}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-rounded text-ink tnum leading-tight">
            {summary.totalMovingTimeFormatted}
          </div>
          <div className="mt-0.5 text-[10px] text-ink-muted tnum">
            {t('tourSummaryBattery')}: ~{summary.batteryBudgetHours} h
          </div>
        </div>

        {/* Cumulative Fuel / Nutrition */}
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted font-medium">
            <Banana className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
            <span className="truncate">{t('tourSummaryNutrition')}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-rounded text-ink tnum leading-tight">
            {summary.totalKcalBurn.toLocaleString()} <span className="text-xs font-medium text-ink-muted">kcal</span>
          </div>
          <div className="mt-0.5 text-[10px] text-ink-muted tnum">
            ~{summary.totalCarbsGrams.toLocaleString()} g CHO
          </div>
        </div>
      </div>

      {/* Aggregated Daily Timeline with Overnight Recovery */}
      <div className="space-y-1.5">
        {summary.stages.map((st, idx) => {
          const isCurrent = idx === activeStageIdx;
          const fatigueBadge = getFatigueBadgeProps(st.fatigueLevel);
          const dateLabel = formatShortDate(st.departureDate, lang);

          return (
            <React.Fragment key={st.id || `tour-stage-${idx}`}>
              {/* Overnight Recovery Connector between consecutive stages */}
              {idx > 0 && st.overnightRecoveryFormatted && (() => {
                const prevStage = summary.stages[idx - 1];
                return (
                  <div className="flex items-center gap-2 pl-3 py-0.5">
                    <div className="w-px h-4 bg-ink/15 dark:bg-white/15 ml-2.5" />
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pod text-[11px] font-medium text-ink-secondary tnum">
                      <BedDouble className="w-3 h-3 text-indigo-500 dark:text-indigo-300 shrink-0" />
                      <span>{t('tourOvernightRecovery', { duration: st.overnightRecoveryFormatted })}</span>
                      <InfoTooltip
                        size="sm"
                        title={isFr ? 'Temps hors vélo entre deux étapes' : 'Off-bike recovery window'}
                        content={
                          isFr
                            ? `Calculé entre votre arrivée estimée du Jour ${prevStage.dayNumber} (${prevStage.estimatedArrivalTime}) et le départ du Jour ${st.dayNumber} (${st.startTime}).`
                            : `Time between your estimated Day ${prevStage.dayNumber} arrival (${prevStage.estimatedArrivalTime}) and Day ${st.dayNumber} rollout (${st.startTime}).`
                        }
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Stage Row */}
              <div
                role={onSelectStage ? 'button' : undefined}
                tabIndex={onSelectStage ? 0 : undefined}
                onClick={() => onSelectStage?.(idx)}
                onKeyDown={(e) => {
                  if (onSelectStage && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectStage(idx);
                  }
                }}
                className={`rounded-pod p-3 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  onSelectStage ? 'cursor-pointer' : ''
                } ${
                  isCurrent
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ring-2 ring-inset ring-[#a3b300] dark:ring-[#dfff00]/70`
                    : 'bg-pod hover:bg-chip'
                }`}
              >
                {/* Left: Day Badge, Date, Origin -> Destination */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-rounded shrink-0 ${
                      isCurrent
                        ? 'bg-volt text-[#111111]'
                        : 'bg-card text-ink-secondary'
                    }`}
                  >
                    {t('stageDayPill', { day: st.dayNumber })}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink truncate">
                      <span className="truncate">{st.origin || '...'}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 text-ink-muted" />
                      <span className="truncate">{st.destination || '...'}</span>
                      {st.waypointCount > 0 && (
                        <span className="text-[10px] font-rounded font-medium text-ink-muted shrink-0">
                          (+{st.waypointCount} via)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted tnum mt-0.5 flex-wrap">
                      {dateLabel && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{dateLabel}</span>
                        </span>
                      )}
                      <span>·</span>
                      <span className="font-semibold text-ink-secondary">
                        {st.startTime} → {st.estimatedArrivalTime}
                      </span>
                      <span>·</span>
                      <span>{st.movingTimeFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Distance, Elevation, Fatigue Load Badge & Per-Day GPX */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 tnum">
                  <div className="text-right text-xs">
                    <span className="font-bold text-ink">{st.distanceKm} km</span>
                    <span className="text-ink-muted ml-1.5">+{st.elevationGainM} m</span>
                  </div>
                  <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant={fatigueBadge.variant}
                      size="sm"
                      icon={Flame2}
                    >
                      {fatigueBadge.label}
                    </Badge>
                    <InfoTooltip
                      size="sm"
                      title={isFr ? 'Effort cumulé estimé' : 'Estimated cumulative effort'}
                      content={
                        isFr
                          ? `Estimé à partir du temps de selle cumulé (${st.movingTimeFormatted} ce jour, ${st.cumulativeDistanceKm} km au total), du dénivelé (+${st.cumulativeElevationM} m) et du travail mécanique (~${st.legWatts} W moyens) — sans capteur cardiaque.`
                          : `Estimated from cumulative riding hours (${st.movingTimeFormatted} today, ${st.cumulativeDistanceKm} km total), climbing (+${st.cumulativeElevationM} m), and mechanical work (~${st.legWatts} W avg) — based on physics, not heart rate.`
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadStageGpx(trip, idx, { ftpWatts });
                    }}
                    title={
                      isFr
                        ? `Télécharger Jour ${st.dayNumber} (.gpx)`
                        : `Download Day ${st.dayNumber} (.gpx)`
                    }
                    aria-label={
                      isFr
                        ? `Télécharger Jour ${st.dayNumber} en GPX`
                        : `Download Day ${st.dayNumber} GPX`
                    }
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-full bg-card hover:bg-volt hover:text-[#111111] text-ink-secondary text-[10.5px] font-bold font-rounded border border-black/8 dark:border-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-3 h-3 shrink-0" />
                    <span>GPX</span>
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
