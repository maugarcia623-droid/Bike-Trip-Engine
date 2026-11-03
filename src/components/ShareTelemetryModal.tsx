import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Copy,
  CheckCircle2,
  Layers,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Receipt } from '@/components/icons';
import {
  renderTelemetryCard,
  extractTelemetryShareData,
} from '../utils/renderTelemetryCard';
import {
  TelemetryShareData,
  TelemetryCardMode,
  TripProfile,
  PhysicsCalculationResult,
} from '../types/trip';
import { useTranslation } from '../context/LanguageContext';
import { Badge } from './common/Badge';
import {
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../tokens/chipTokens';

export interface ShareTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: TelemetryShareData;
  trip?: TripProfile;
  physicsResult?: PhysicsCalculationResult;
  defaultMode?: TelemetryCardMode;
}

export const ShareTelemetryModal: React.FC<ShareTelemetryModalProps> = ({
  isOpen,
  onClose,
  data: directData,
  trip,
  physicsResult,
  defaultMode = 'solid',
}) => {
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';

  const [mode, setMode] = useState<TelemetryCardMode>(defaultMode);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Keep track of active object URL to clean up properly
  const activeUrlRef = useRef<string | null>(null);

  // Lock background page scroll while modal is active to prevent mobile scroll wobble
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Compute resolved telemetry data
  const telemetryData = useMemo<TelemetryShareData | null>(() => {
    if (directData) return directData;
    if (trip) {
      return extractTelemetryShareData(trip, physicsResult);
    }
    return null;
  }, [directData, trip, physicsResult]);

  // Clean, formatted metric strings (guaranteed rounded values, zero decimal spillover)
  const formattedMetrics = useMemo(() => {
    if (!telemetryData) return null;

    const rawDist = telemetryData.distanceKm ?? telemetryData.distance ?? 0;
    const dist = typeof rawDist === 'number' ? rawDist : parseFloat(String(rawDist)) || 0;

    const rawElev =
      telemetryData.elevationGainM ?? telemetryData.elevationM ?? telemetryData.elevation ?? 0;
    const elev = typeof rawElev === 'number' ? rawElev : parseFloat(String(rawElev)) || 0;

    const rawPwr =
      telemetryData.avgPowerWatts ?? telemetryData.averagePower ?? telemetryData.avgPower ?? 0;
    const pwr = typeof rawPwr === 'number' ? rawPwr : parseFloat(String(rawPwr)) || 0;

    const rawTax =
      telemetryData.windTaxWatts ?? telemetryData.powerDeltaWatts ?? telemetryData.windTax ?? 0;
    const tax = typeof rawTax === 'number' ? rawTax : parseFloat(String(rawTax)) || 0;

    const rawRho =
      telemetryData.airDensityRho ?? telemetryData.airDensity ?? telemetryData.rho ?? 1.225;
    const rho = typeof rawRho === 'number' ? rawRho : parseFloat(String(rawRho)) || 1.225;

    const rawCarb =
      telemetryData.carbBurnGramsPerHour ?? telemetryData.carbBurnGPerHour ?? telemetryData.carbBurn ?? 0;
    const carb = typeof rawCarb === 'number' ? rawCarb : parseFloat(String(rawCarb)) || 0;

    const rawKj = telemetryData.totalWorkKj ?? telemetryData.totalKj ?? 0;
    const kj = typeof rawKj === 'number' ? rawKj : parseFloat(String(rawKj)) || 0;

    const roundedTax = Math.round(tax);

    return {
      distanceStr: `${dist.toFixed(1)} km`,
      elevationStr: `+${Math.round(elev)} m`,
      avgPowerStr: `${Math.round(pwr)} W`,
      windTaxVal: roundedTax,
      windTaxStr: `${roundedTax > 0 ? '+' : ''}${roundedTax} W`,
      airDensityStr: `${rho.toFixed(3)} kg/m³`,
      carbBurnStr: `${Math.round(carb)} g/h`,
      totalWorkStr: `${Math.round(kj).toLocaleString()} kJ`,
    };
  }, [telemetryData]);

  // Generate canvas card whenever modal opens or mode / data changes
  useEffect(() => {
    if (!isOpen || !telemetryData) {
      return;
    }

    let isCancelled = false;
    setIsGenerating(true);
    setError(null);

    const generate = async () => {
      try {
        const generatedBlob = await renderTelemetryCard(telemetryData, mode);
        if (isCancelled) return;

        // Revoke previous object URL if any
        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current);
        }

        const newUrl = URL.createObjectURL(generatedBlob);
        activeUrlRef.current = newUrl;

        setBlob(generatedBlob);
        setPreviewUrl(newUrl);
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to generate telemetry card:', err);
          setError(
            (err as Error).message ||
              (isFr
                ? 'Erreur lors du rendu du ticket.'
                : 'Failed to render telemetry card.')
          );
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    generate();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, mode, telemetryData, isFr]);

  // Clean up object URLs on modal close or unmount
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerFileDownload = (targetBlob: Blob, filename = 'flightdeck-telemetry.png') => {
    const url = URL.createObjectURL(targetBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleExportOrShare = async () => {
    if (!blob) return;

    const filename = 'flightdeck-telemetry.png';
    const file = new File([blob], filename, { type: 'image/png' });

    // Check if the browser environment supports file sharing via Web Share API
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      (() => {
        try {
          return navigator.canShare({ files: [file] });
        } catch {
          return false;
        }
      })();

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: telemetryData?.routeName
            ? `${telemetryData.routeName} // Flight Deck Telemetry`
            : 'Flight Deck Telemetry',
          text: `Flight Deck Telemetry receipt · 1080×1920 PNG (9:16 Story / Strava)`,
        });
        return;
      } catch (err) {
        // If the user dismissed or cancelled the native share sheet, do not force download
        if ((err as Error).name === 'AbortError') {
          return;
        }
        console.warn('Native Web Share failed, falling back to direct file download:', err);
      }
    }

    // Fall back to standard <a download="flightdeck-telemetry.png"> file download
    triggerFileDownload(blob, filename);
  };

  const handleCopyImage = async () => {
    if (!blob) return;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        triggerFileDownload(blob, 'flightdeck-telemetry.png');
      }
    } catch (err) {
      console.warn('Clipboard write failed, downloading instead:', err);
      triggerFileDownload(blob, 'flightdeck-telemetry.png');
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-telemetry-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] bg-black/80 dark:bg-black/90 backdrop-blur-md animate-apple-fade-in overflow-y-auto overflow-x-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] max-h-[90dvh] flex flex-col bg-card text-ink rounded-card p-4 sm:p-6 shadow-2xl border border-ink/10 dark:border-white/10 transition-colors my-auto overflow-hidden animate-apple-modal">
        {/* ── Modal Header ── */}
        <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-ink/5 dark:border-white/10 shrink-0 min-w-0 animate-apple-in stagger-1">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} shadow-xs transition-transform duration-200 hover:scale-105`}
            >
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="share-telemetry-title"
                  className="text-base sm:text-xl font-bold font-rounded text-ink tracking-tight truncate"
                >
                  {t('shareModalTitle')}
                </h2>
                <Badge variant="yellow-vest" size="xs" className="tnum font-rounded font-bold">
                  {t('shareSpecsBadge')}
                </Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5 truncate max-w-xl">
                {t('shareModalSub')}
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

        {/* ── Main Modal Body: Split 2-Column Deck (Zero Horizontal Overflow) ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar py-1 w-full">
          {/* ════════ LEFT COLUMN (5 COLS): LIVE IMAGE PREVIEW (9:16) ════════ */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center min-w-0 w-full animate-apple-receipt stagger-2">
            <div
              className={`relative w-full max-w-[210px] min-[390px]:max-w-[230px] sm:max-w-[260px] lg:max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] border transition-all duration-300 flex items-center justify-center mx-auto hover:shadow-[0_25px_60px_rgba(0,0,0,0.25)] hover:scale-[1.01] ${
                mode === 'transparent'
                  ? 'border-white/20 bg-[#141518] [background-image:linear-gradient(45deg,#202226_25%,transparent_25%),linear-gradient(-45deg,#202226_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#202226_75%),linear-gradient(-45deg,transparent_75%,#202226_75%)] [background-size:20px_20px] [background-position:0_0,0_10px,10px_-10px,-10px_0px]'
                  : 'border-ink/15 dark:border-white/10 bg-[#E5E3DD]'
              }`}
            >
              {isGenerating && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white p-4 animate-apple-fade-in">
                  <Loader2 className="w-8 h-8 text-volt animate-spin mb-2.5" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-volt">
                    {t('shareGenerating')}
                  </span>
                  <span className="text-[11px] text-white/70 font-mono mt-1">
                    1080×1920 Native Canvas 2D (9:16)
                  </span>
                </div>
              )}

              {error && (
                <div className="p-6 text-center text-xs text-beacon-red font-mono animate-apple-fade-in">
                  <p className="font-bold mb-1">Canvas Render Error</p>
                  <p className="opacity-80">{error}</p>
                </div>
              )}

              {previewUrl && !error && (
                <img
                  src={previewUrl}
                  alt="Telemetry Share Card Preview"
                  className="w-full h-full object-contain pointer-events-auto select-none transition-opacity duration-300 ease-out"
                />
              )}

              {/* Watermark mode pill on bottom left of preview */}
              <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/75 text-white/90 backdrop-blur-md border border-white/15 shadow-xs">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      mode === 'solid' ? 'bg-volt' : 'bg-volt-lime'
                    }`}
                  />
                  <span>
                    {mode === 'solid'
                      ? t('shareModeManifest')
                      : t('shareModeSticker')}
                  </span>
                </span>
              </div>

              {/* External preview button */}
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open full-resolution card in new tab"
                  className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <p className="text-[11px] font-rounded text-ink-muted mt-2 text-center truncate max-w-full px-2">
              {mode === 'solid'
                ? isFr
                  ? 'Reçu de vol Peloton tactile sur fond pierre chaude #E5E3DD'
                  : 'Tactile Peloton Flight Receipt on warm stone #E5E3DD canvas'
                : isFr
                  ? 'Ticket découpé alpha transparent pour superposition photo'
                  : 'Alpha transparent ticket cutout for photo overlay'}
            </p>
          </div>

          {/* ════════ RIGHT COLUMN (7 COLS): CONTROLS & METRICS ════════ */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-w-0 w-full">
            {/* 1. Interactive Mode Switcher (Respecting Brand yellow-vest design token) */}
            <div className="min-w-0 animate-apple-in stagger-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 font-body">
                {isFr ? 'Format & Style du Ticket' : 'Receipt Style & Alpha Layer'}
              </label>

              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-pod border border-ink/5 dark:border-white/5 min-w-0">
                {/* Option 1: Solid Mode */}
                <button
                  type="button"
                  onClick={() => setMode('solid')}
                  className={`flex flex-col text-left p-3 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer relative select-none min-w-0 ${
                    mode === 'solid'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : `bg-card text-ink-secondary hover:text-ink hover:bg-chip ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-current" />
                      <span className="text-xs font-bold font-rounded truncate">
                        {t('shareModeManifest')}
                      </span>
                    </div>
                    {mode === 'solid' && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS['yellow-vest'].dot}`}
                      />
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug">
                    {t('shareModeManifestDesc')}
                  </p>
                </button>

                {/* Option 2: Transparent Mode */}
                <button
                  type="button"
                  onClick={() => setMode('transparent')}
                  className={`flex flex-col text-left p-3 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer relative select-none min-w-0 ${
                    mode === 'transparent'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : `bg-card text-ink-secondary hover:text-ink hover:bg-chip ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers className="w-4 h-4 shrink-0 text-current" />
                      <span className="text-xs font-bold font-rounded truncate">
                        {t('shareModeSticker')}
                      </span>
                    </div>
                    {mode === 'transparent' && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS['yellow-vest'].dot}`}
                      />
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug">
                    {t('shareModeStickerDesc')}
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Embedded Metrics Overview (Cleanly Formatted, Zero Decimal Spillover) */}
            {formattedMetrics && (
              <div className="p-3.5 rounded-2xl bg-pod border border-ink/5 dark:border-white/5 min-w-0 animate-apple-in stagger-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-body font-bold text-ink-muted mb-2.5 min-w-0">
                  <span className="shrink-0">
                    {isFr ? 'DONNÉES EMBARQUÉES' : 'EMBEDDED SORTIE METRICS'}
                  </span>
                  <span className="truncate text-right flex-1 min-w-0 text-ink dark:text-volt font-rounded">
                    {telemetryData?.routeName || 'Sortie'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-rounded tnum min-w-0">
                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Distance
                    </span>
                    <strong className="text-sm font-extrabold text-ink truncate block min-w-0">
                      {formattedMetrics.distanceStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Elevation
                    </span>
                    <strong className="text-sm font-extrabold text-ink truncate block min-w-0">
                      {formattedMetrics.elevationStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Avg Power
                    </span>
                    <strong
                      className={`text-sm font-extrabold ${CHIP_TOKENS['yellow-vest'].primary} truncate block min-w-0`}
                    >
                      {formattedMetrics.avgPowerStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Wind Tax
                    </span>
                    <strong
                      className={`text-sm font-extrabold truncate block min-w-0 ${
                        formattedMetrics.windTaxVal > 0
                          ? CHIP_TOKENS['yellow-vest'].primary
                          : 'text-emerald-500'
                      }`}
                    >
                      {formattedMetrics.windTaxStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Air Density (ρ)
                    </span>
                    <strong className="text-xs font-extrabold text-ink truncate block min-w-0">
                      {formattedMetrics.airDensityStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Carb Burn
                    </span>
                    <strong className="text-xs font-extrabold text-ink truncate block min-w-0">
                      {formattedMetrics.carbBurnStr}
                    </strong>
                  </div>

                  <div className="p-2 rounded-xl bg-card border border-ink/5 dark:border-white/5 col-span-2 min-w-0 overflow-hidden transition-all duration-150 hover:border-ink/15 dark:hover:border-white/15">
                    <span className="text-[10px] text-ink-muted block uppercase truncate">
                      Total Work
                    </span>
                    <strong className="text-xs font-extrabold text-ink truncate block min-w-0">
                      {formattedMetrics.totalWorkStr}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Action Buttons (Respecting Brand yellow-vest and greyscale tokens) */}
            <div className="flex flex-col gap-2.5 pt-1 min-w-0 animate-apple-in stagger-4">
              {/* Primary Export / Share Button */}
              <button
                type="button"
                onClick={handleExportOrShare}
                disabled={isGenerating || !blob}
                className={`w-full py-3.5 px-5 rounded-2xl ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.98] dark:hover:brightness-110 font-rounded font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]`}
              >
                <Receipt className="w-4 h-4 shrink-0 text-current" />
                <span>{t('shareExportBtn')}</span>
              </button>

              <div className="grid grid-cols-2 gap-2 min-w-0">
                {/* Copy Image Button */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isGenerating || !blob}
                  className={`py-2.5 px-3 rounded-xl ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:bg-chip hover:text-ink text-xs font-semibold font-rounded flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-50 min-w-0 truncate`}
                >
                  {copied ? (
                    <div className="flex items-center gap-1.5 animate-apple-check-pop truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-emerald-500 truncate">{t('shareCopiedBtn')}</span>
                    </div>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 shrink-0 text-current" />
                      <span className="truncate">{t('shareCopyBtn')}</span>
                    </>
                  )}
                </button>

                {/* Direct Save PNG Button */}
                <button
                  type="button"
                  onClick={() => blob && triggerFileDownload(blob, 'flightdeck-telemetry.png')}
                  disabled={isGenerating || !blob}
                  className={`py-2.5 px-3 rounded-xl ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:bg-chip hover:text-ink text-xs font-semibold font-rounded flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-50 min-w-0 truncate`}
                >
                  <Download className="w-4 h-4 shrink-0 text-current" />
                  <span className="truncate">{t('shareSavePngBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
