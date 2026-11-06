import React from 'react';
import { Wind, Printer, Warning, CheckCircle, ShieldCheck, Bicycle, Pulse, BadgeInfo, Receipt, Send } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../../tokens/chipTokens';

export type DashboardViewMode = 'commuter' | 'telemetry';

interface FlightDeckHeaderProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  hardDepartureTime: string;
  onToggleHeadwind: () => void;
  onPrint: () => void;
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  checklistProgress: { checked: number; total: number; percent: number };
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
}

export const FlightDeckHeader: React.FC<FlightDeckHeaderProps> = ({
  trip,
  physicsResult,
  hardDepartureTime,
  onToggleHeadwind,
  onPrint,
  onShareReceipt,
  onOpenFeedback,
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useTranslation();
  const isGo = physicsResult.goStatus === 'GO';
  const isCaution = physicsResult.goStatus === 'CAUTION';

  return (
    <div className="bg-card text-ink rounded-card p-4 mb-6 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full font-bold bg-pod text-ink">
              {trip.tag}
            </span>
            <span className="text-xs font-mono text-ink-muted px-2.5 py-0.5 rounded-full bg-pod">
              ID: {trip.id}
            </span>
            <span className="text-xs font-mono text-ink dark:text-volt flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-4 h-4 dual-tone-emerald" />
              {trip.office.gateName} check-in
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-ink tracking-tight">
            {trip.name}
          </h1>

          <p className="text-ink-secondary text-xs mt-1 max-w-2xl leading-relaxed">
            {trip.description}
          </p>
        </div>

        {/* Full-Radius View Switcher, Decision Callout, Wind & Print Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-pod rounded-full p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => onViewModeChange('commuter')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all font-bold cursor-pointer ${
                viewMode === 'commuter'
                  ? 'bg-[#111111] text-white dark:bg-elevated dark:text-volt'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Bicycle className="w-4 h-4 dual-tone-volt" />
              <span>{t('cockpitViewEssential')}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('telemetry')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all font-bold cursor-pointer ${
                viewMode === 'telemetry'
                  ? 'bg-[#111111] text-white dark:bg-elevated dark:text-volt'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Pulse className="w-4 h-4 dual-tone-rose" />
              <span>{t('cockpitViewPro')}</span>
            </button>
          </div>

          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full font-mono text-xs font-bold ${
              isGo
                ? 'bg-volt-lime text-[#111111] dark:bg-volt-lime/15 dark:text-volt-lime'
                : isCaution
                ? 'bg-volt text-[#111111] dark:bg-beacon-amber/15 dark:text-beacon-amber'
                : 'bg-beacon-red text-white dark:bg-beacon-red/15 dark:text-beacon-red'
            }`}
            title={`${t('rideFeasibility')}: ${
              isGo
                ? t('feasibilityOptimal')
                : isCaution
                ? t('feasibilityCaution')
                : t('feasibilitySevere')
            } — ${physicsResult.goStatusReason}`}
          >
            {isGo ? (
              <CheckCircle className="w-4 h-4 dual-tone-emerald" />
            ) : (
              <Warning className="w-4 h-4 dual-tone-amber" />
            )}
            <span>
              {isGo
                ? t('feasibilityOptimal')
                : isCaution
                ? t('feasibilityCaution')
                : t('feasibilitySevere')}
            </span>
          </div>

          <button
            onClick={onToggleHeadwind}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              trip.weather.isHeadwindActive
                ? 'bg-[#111111] text-volt dark:bg-elevated dark:text-beacon-amber'
                : 'bg-pod hover:bg-chip text-ink'
            }`}
          >
            <Wind className="w-4 h-4 dual-tone-cyan" />
            <span>{trip.weather.isHeadwindActive ? '8k Headwind' : 'Calm'}</span>
          </button>

          <button
            onClick={onPrint}
            title="Export Clean A4 Ride Sheet PDF"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-pod hover:bg-chip text-xs font-mono font-bold text-ink transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-4 h-4 text-ink-secondary dual-tone-sky" />
            <span>Print A4</span>
          </button>

          {onShareReceipt && (
            <button
              onClick={onShareReceipt}
              title="Share Ride Receipt"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-rounded font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.98] dark:hover:brightness-110 shadow-xs`}
            >
              <Receipt className="w-4 h-4 shrink-0 text-current" />
              <span>Share receipt</span>
            </button>
          )}

          {onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              title={t('sendFeedbackBtn')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-rounded font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer ${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.98] dark:hover:brightness-110 shadow-xs`}
            >
              <Send className="w-4 h-4 shrink-0 text-current" />
              <span>{t('sendFeedbackBtn')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="lane-divider my-4" aria-hidden="true" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-ink-secondary flex-wrap">
          <div>
            Leave by:{' '}
            <strong className="text-ink dark:text-volt font-bold">{hardDepartureTime}</strong>
          </div>
          <div>
            Arrival:{' '}
            <strong className="text-ink font-bold">{trip.office.targetGateArrivalTime}</strong> ({trip.office.gateName})
          </div>
          <div>
            Work starts:{' '}
            <strong className="text-ink font-bold">{trip.office.shiftStartTime}</strong>
          </div>
          {viewMode === 'telemetry' && (
            <div>
              Target Power:{' '}
              <strong className="text-ink dark:text-volt font-bold">{Math.round(physicsResult.legWatts)} W</strong>
            </div>
          )}
        </div>

        <span className="px-3 py-0.5 rounded-full bg-pod text-ink font-bold uppercase text-[11px]">
          {viewMode === 'commuter' ? t('cockpitViewEssential') : t('cockpitViewPro')}
        </span>
      </div>
    </div>
  );
};
