import React from 'react';
import { ModalPortal } from '../common/ModalPortal';
import { Badge } from '../common/Badge';
import {
  ArrowRight,
  CheckCircle2,
  Route,
  SlidersHorizontal,
  Sparkle,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { useTranslation } from '../../context/LanguageContext';
import { suggestDayCount } from '../../utils/gpxSlicer';
import { YELLOW_VEST_SOLID_CTA_CLASSES } from '../../tokens/chipTokens';

export interface LongRouteChoiceModalProps {
  isOpen: boolean;
  trip: TripProfile;
  onCutForMe: (suggestedDays: number) => void;
  onFineTune: () => void;
  onKeepSingleDay: () => void;
}

export const LongRouteChoiceModal: React.FC<LongRouteChoiceModalProps> = ({
  isOpen,
  trip,
  onCutForMe,
  onFineTune,
  onKeepSingleDay,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  const distKm = Math.round(trip.route.distanceKm || 0);
  const elevM = Math.round(trip.route.elevationGainM || 0);
  const suggestedDays = suggestDayCount(trip.route.distanceKm || 0, elevM);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onKeepSingleDay}
      closeOnBackdrop={false}
      closeOnEscape={false}
      labelledBy="long-route-choice-title"
      zIndexClass="z-[1150]"
      panelClassName="w-full max-w-[440px] bg-pod text-ink rounded-card p-5 sm:p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-apple-modal"
    >
      {/* Header (no close button — user chooses an explicit action below) */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-volt text-[#111111] flex items-center justify-center shrink-0 shadow-xs">
          <Route className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted tnum">
            <span>{distKm} km</span>
            {elevM > 0 && (
              <>
                <span>·</span>
                <span>+{elevM.toLocaleString()} m</span>
              </>
            )}
          </div>
          <h2
            id="long-route-choice-title"
            className="text-base sm:text-[17px] font-extrabold font-rounded tracking-tight text-ink truncate"
          >
            {trip.name || (isFr ? 'Long parcours détecté' : 'Multi-day route detected')}
          </h2>
        </div>
      </div>

      {/* File read confirmation badge */}
      <div className="mt-3.5">
        <Badge variant="emerald" size="sm" icon={CheckCircle2}>
          {isFr
            ? `Fichier lu avec succès · ${distKm} km importés`
            : `Route file read successfully · ${distKm} km loaded`}
        </Badge>
      </div>

      <p className="mt-2.5 text-xs sm:text-[13px] text-ink-secondary leading-relaxed">
        {isFr
          ? `Ce parcours ressemble à un voyage sur ~${suggestedDays} jours. Comment souhaitez-vous le préparer ?`
          : `This route looks like a ~${suggestedDays}-day trip. How would you like to set it up?`}
      </p>

      {/* Two Primary Choices */}
      <div className="mt-4 space-y-2.5">
        {/* Choice 1: Cut it for me -> Stage Slicer */}
        <button
          type="button"
          data-testid="long-route-cut-for-me-btn"
          onClick={() => onCutForMe(suggestedDays)}
          className={`w-full rounded-pod p-3.5 text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] shadow-xs ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold font-rounded tracking-tight">
                {isFr ? 'Découper pour moi' : 'Cut it for me'}
              </div>
              <div className="text-[11.5px] opacity-85 leading-snug mt-0.5">
                {isFr
                  ? `Ouvre le découpeur sur ${suggestedDays} étapes équilibrées avec bivouacs et GPX par jour.`
                  : `Jump straight into the slicer with ${suggestedDays} balanced days, sleep stops & per-day GPX.`}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>

        {/* Choice 2: Let me fine-tune -> Configurator */}
        <button
          type="button"
          data-testid="long-route-fine-tune-btn"
          onClick={onFineTune}
          className="w-full rounded-pod p-3.5 text-left flex items-center justify-between gap-3 bg-card hover:bg-chip border border-black/6 dark:border-white/10 transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-pod flex items-center justify-center shrink-0 mt-0.5 text-ink">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold font-rounded tracking-tight text-ink">
                {isFr ? 'Me laisser ajuster' : 'Let me fine-tune'}
              </div>
              <div className="text-[11.5px] text-ink-secondary leading-snug mt-0.5">
                {isFr
                  ? 'Ouvre les réglages du trajet (vélo, allure, dates) avec accès direct au découpeur.'
                  : 'Open Trip Setup to tweak bike, pace, or dates — with a 1-click button to slice later.'}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 text-ink-muted" />
        </button>
      </div>

      {/* Quiet 1-day escape */}
      <div className="mt-4 pt-3 border-t border-black/8 dark:border-white/8 flex justify-center">
        <button
          type="button"
          data-testid="long-route-keep-single-btn"
          onClick={onKeepSingleDay}
          className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          {isFr ? 'Garder sur 1 seul jour (vue trajet)' : 'Keep as 1 day & open ride plan'}
        </button>
      </div>
    </ModalPortal>
  );
};
