import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Gauge,
  Lightning,
  ForkKnife,
  Droplets,
  Sliders,
  Sparkle,
} from '@/components/icons';
import { RiderBikeSpecs, TelemetryMode, PacingInputMode } from '../../types/specs';
import { saveRiderBikeSpecs, hasSavedRiderBikeSpecs } from '../../utils/specsStorage';
import { useTranslation } from '../../context/LanguageContext';
import { IconBadge } from '../common/IconBadge';
import { Badge } from '../common/Badge';
import {
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../../tokens/chipTokens';

export interface CockpitSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: RiderBikeSpecs;
  onSave: (updated: RiderBikeSpecs) => void;
}

/**
 * First-run users get 'fuel-first' pre-selected (Phase 1 §6). Returning riders who
 * reopen Calibration keep their saved mode so a pacing-only edit never resets it.
 */
function resolveInitialTelemetryMode(specs: RiderBikeSpecs): TelemetryMode {
  if (hasSavedRiderBikeSpecs() && specs.telemetryMode) return specs.telemetryMode;
  return 'fuel-first';
}

export const CockpitSetupModal: React.FC<CockpitSetupModalProps> = ({
  isOpen,
  onClose,
  specs,
  onSave,
}) => {
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';

  const [pacingMode, setPacingMode] = useState<PacingInputMode>(
    specs.pacingInputMode ?? 'feel'
  );
  // Default to 'fuel-first' as the pre-selected default per brief specification
  const [telemetryMode, setTelemetryMode] = useState<TelemetryMode>(
    resolveInitialTelemetryMode(specs)
  );

  const [ftpWatts, setFtpWatts] = useState<number>(specs.ftpWatts || 210);
  const [showWeightInput, setShowWeightInput] = useState<boolean>(false);
  const [riderWeightKg, setRiderWeightKg] = useState<number>(specs.riderWeightKg || 68);

  useEffect(() => {
    if (isOpen) {
      setPacingMode(specs.pacingInputMode ?? 'feel');
      setTelemetryMode(
        resolveInitialTelemetryMode(specs)
      );
      setFtpWatts(specs.ftpWatts || 210);
      setRiderWeightKg(specs.riderWeightKg || 68);
    }
  }, [isOpen, specs]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const updated: RiderBikeSpecs = {
      ...specs,
      pacingInputMode: pacingMode,
      telemetryMode,
      ftpWatts: pacingMode === 'power' ? ftpWatts : specs.ftpWatts || 210,
      riderWeightKg:
        pacingMode === 'power' && showWeightInput
          ? riderWeightKg
          : specs.riderWeightKg || 68,
      carbTargetGPerHr: specs.carbTargetGPerHr || 60,
    };

    saveRiderBikeSpecs(updated);
    onSave(updated);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cockpit-setup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))] bg-black/70 dark:bg-black/85 animate-apple-fade-in backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] max-h-[92dvh] flex flex-col bg-card text-ink rounded-card p-4 sm:p-6 overflow-hidden animate-apple-modal shadow-2xl border border-ink/10 dark:border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <IconBadge theme="amber" icon={Sliders} size="lg" isSelected solidBacker />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="cockpit-setup-title"
                  className="text-base sm:text-lg font-bold text-ink tracking-tight font-rounded"
                >
                  {t('cockpitSetupTitle')}
                </h2>
                <Badge variant="emerald" size="xs">
                  {t('bodyNeutralBadge')}
                </Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('cockpitSetupSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalAria')}
            className={`w-9 h-9 shrink-0 rounded-full hover:text-ink hover:bg-chip flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <X className="w-4 h-4 text-current" />
          </button>
        </div>

        {/* Modal Scrollable Workspace: 2 Clean Questions */}
        <div className="space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-0.5">
          {/* ── QUESTION 1: PACING CALIBRATION ── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-rounded flex items-center gap-1.5">
                <span>{t('pacingCalibrationTitle')}</span>
              </h3>
              <span className="text-[11px] text-ink-muted">
                {pacingMode === 'feel' ? (isFr ? 'Allure au ressenti' : 'Sensory pacing') : (isFr ? 'Télémétrie Watts' : 'Power telemetry')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Feel */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPacingMode('feel')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPacingMode('feel');
                  }
                }}
                className={`p-3.5 rounded-pod text-left transition-all cursor-pointer relative ${
                  pacingMode === 'feel'
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} shadow-sm`
                    : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-current shrink-0" />
                    <span className="text-xs sm:text-[13px] font-bold">
                      {t('pacingModeFeelTitle')}
                    </span>
                  </div>
                  <Badge variant="emerald" size="xs">
                    {t('bodyNeutralBadge')}
                  </Badge>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  {t('pacingModeFeelSub')}
                </p>
              </div>

              {/* Option 2: Power */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPacingMode('power')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPacingMode('power');
                  }
                }}
                className={`p-3.5 rounded-pod text-left transition-all cursor-pointer relative ${
                  pacingMode === 'power'
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-sm`
                    : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Lightning className="w-4 h-4 text-current shrink-0" />
                    <span className="text-xs sm:text-[13px] font-bold">
                      {t('pacingModePowerTitle')}
                    </span>
                  </div>
                  <Badge variant="yellow-vest" size="xs">
                    Watts
                  </Badge>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  {t('pacingModePowerSub')}
                </p>
              </div>
            </div>

            {/* Optional Collapsible Power / Weight Controls (Only when 'power' selected, never blocks confirmation) */}
            {pacingMode === 'power' && (
              <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-3 animate-apple-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink block">
                      {isFr ? 'Seuil fonctionnel FTP (Watts)' : 'Functional Threshold Power (FTP)'}
                    </label>
                    <span className="text-[10px] text-ink-muted">
                      {isFr ? 'Puissance repère pour les calculs de vent et de côtes' : 'Baseline power for wind and gradient calculations'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="5"
                      value={ftpWatts}
                      onChange={(e) => setFtpWatts(parseInt(e.target.value, 10) || 210)}
                      className="w-16 h-8 text-center text-base sm:text-sm font-mono font-bold tnum rounded-lg bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none"
                    />
                    <span className="text-xs font-mono text-ink-muted">W</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowWeightInput((prev) => !prev)}
                    className="text-xs font-medium text-ink-secondary hover:text-ink flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-volt-lime font-bold">
                      {showWeightInput ? '▾' : '▸'}
                    </span>
                    <span>{t('optionalWeightToggle')}</span>
                  </button>

                  {showWeightInput && (
                    <div className="flex items-baseline gap-1 animate-apple-fade-in">
                      <input
                        type="number"
                        step="0.5"
                        value={riderWeightKg}
                        onChange={(e) => setRiderWeightKg(parseFloat(e.target.value) || 68)}
                        className="w-16 h-8 text-center text-base sm:text-sm font-mono font-bold tnum rounded-lg bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none"
                      />
                      <span className="text-xs font-mono text-ink-muted">kg</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── QUESTION 2: FUELING GUIDANCE ── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-rounded flex items-center gap-1.5">
                <span>{t('fuelingGuidanceTitle')}</span>
              </h3>
              <Badge variant="amber" size="xs">
                {t('recommendedBadge')}: {t('fuelingModeFuelFirstTitle')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Fuel-First (Pre-selected default) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTelemetryMode('fuel-first')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTelemetryMode('fuel-first');
                  }
                }}
                className={`p-3.5 rounded-pod text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  telemetryMode === 'fuel-first'
                    ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing} shadow-sm`
                    : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <ForkKnife className="w-4 h-4 text-current shrink-0" />
                      <span className="text-xs sm:text-[13px] font-bold">
                        {t('fuelingModeFuelFirstTitle')}
                      </span>
                    </div>
                    <Badge variant="amber" size="xs" dot>
                      {t('recommendedBadge')}
                    </Badge>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    {t('fuelingModeFuelFirstSub')}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-dashed border-current/20 text-[10px] font-mono opacity-85">
                  {isFr ? '✓ Portions · 0 kcal · 0 grammes' : '✓ Portions · 0 kcal · 0 grams'}
                </div>
              </div>

              {/* Option 2: Full Quantitative Telemetry */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTelemetryMode('quantitative')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTelemetryMode('quantitative');
                  }
                }}
                className={`p-3.5 rounded-pod text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  telemetryMode === 'quantitative'
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-sm`
                    : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Lightning className="w-4 h-4 text-current shrink-0" />
                      <span className="text-xs sm:text-[13px] font-bold">
                        {t('fuelingModeQuantitativeTitle')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    {t('fuelingModeQuantitativeSub')}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-dashed border-current/20 text-[10px] font-mono opacity-85">
                  {isFr ? 'Détails : kcal + g/h' : 'Metrics: kcal + g/h'}
                </div>
              </div>

              {/* Option 3: Intuitive */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setTelemetryMode('intuitive')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTelemetryMode('intuitive');
                  }
                }}
                className={`p-3.5 rounded-pod text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  telemetryMode === 'intuitive'
                    ? `${CHIP_TOKENS.lime.surface} ${CHIP_TOKENS.lime.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.lime.selectedRing} shadow-sm`
                    : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-current shrink-0" />
                      <span className="text-xs sm:text-[13px] font-bold">
                        {t('fuelingModeIntuitiveTitle')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    {t('fuelingModeIntuitiveSub')}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-dashed border-current/20 text-[10px] font-mono opacity-85">
                  {isFr ? 'Horloge & radar d’eau' : 'Clock cues & water radar'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Confirmation Bar */}
        <div className="mt-4 pt-3.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Sparkle className="w-4 h-4 text-volt-lime shrink-0" />
            <span>
              {isFr
                ? 'Modifiable à tout moment dans Profil > Calibration'
                : 'Re-accessible anytime from Rider Profile > Calibration'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-10 px-4 text-xs font-medium rounded-full text-ink-secondary bg-pod hover:bg-chip transition-all duration-150 cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-5 text-xs font-semibold rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{t('enterCockpitBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
