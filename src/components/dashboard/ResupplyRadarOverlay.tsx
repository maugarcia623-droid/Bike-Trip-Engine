import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Radar,
  Droplets,
  Cemetery,
  Baguette,
  Wrench,
  Star,
  SpinnerGap,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  ArrowsClockwise,
  X,
  MapPin,
  Eye,
  EyeOff,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { StageAmenity, AmenityCategory } from '../../types/amenities';
import { DEFAULT_CORRIDOR } from './HeroRouteCard';
import {
  scanCorridorAmenities,
  calculateWaterGaps,
  calculateAmenityEta,
  getRouteHashKey,
  getCachedScan,
} from '../../services/overpassCorridor';
import { useTranslation } from '../../context/LanguageContext';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../../tokens/chipTokens';

export interface ResupplyRadarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripProfile;
  hardDepartureTime: string;
  effectiveSpeedKmH: number;
  onUpdateTrip: (updated: TripProfile) => void;
  selectedAmenity?: StageAmenity | null;
  onSelectAmenity?: (amenity: StageAmenity) => void;
  onAmenitiesLoaded?: (amenities: StageAmenity[]) => void;
  showMapDots?: boolean;
  onToggleShowMapDots?: () => void;
}

export const ResupplyRadarOverlay: React.FC<ResupplyRadarOverlayProps> = ({
  isOpen,
  onClose,
  trip,
  hardDepartureTime,
  effectiveSpeedKmH,
  onUpdateTrip,
  selectedAmenity,
  onSelectAmenity,
  onAmenitiesLoaded,
  showMapDots = true,
  onToggleShowMapDots,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  // Category filters
  const [activeCategories, setActiveCategories] = useState<Set<AmenityCategory>>(
    () => new Set<AmenityCategory>(['water', 'cemetery', 'food', 'mechanix'])
  );
  const [detourOnly250m, setDetourOnly250m] = useState<boolean>(false);

  // Amenity scanning states
  const [amenities, setAmenities] = useState<StageAmenity[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [justPinnedId, setJustPinnedId] = useState<string | null>(null);

  // Lock background page scroll while overlay is active
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;

  const currentCoords = useMemo(() => {
    return trip.route?.coordinates && trip.route.coordinates.length >= 2
      ? trip.route.coordinates
      : DEFAULT_CORRIDOR;
  }, [trip.route?.coordinates]);
  const totalDistanceKm = trip.route?.distanceKm || 45;
  const stageId = activeStage?.id || trip.id;

  const routeCacheKey = useMemo(
    () => getRouteHashKey(currentCoords, stageId, totalDistanceKm),
    [currentCoords, stageId, totalDistanceKm]
  );

  // Auto-load from in-memory Tier-1 cache if previously scanned
  useEffect(() => {
    const cached = getCachedScan(routeCacheKey);
    if (cached && cached.length > 0) {
      setAmenities(cached);
      setHasScanned(true);
      setScanError(null);
      if (onAmenitiesLoaded) {
        onAmenitiesLoaded(cached);
      }
    } else {
      setAmenities([]);
      setHasScanned(false);
      setScanError(null);
    }
  }, [routeCacheKey]);

  // Execute Corridor Scan
  const handleScanCorridor = async (forceFresh = false) => {
    if (!currentCoords || currentCoords.length < 2) {
      setScanError(
        isFr
          ? 'Aucune coordonnée GPX active pour scanner le corridor.'
          : 'No active route coordinates available to scan corridor.'
      );
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const results = await scanCorridorAmenities({
        coordinates: currentCoords,
        totalDistanceKm,
        stageId,
        elevationProfile: trip.route?.elevationProfile,
        lang,
        forceFresh,
      });

      setAmenities(results);
      setHasScanned(true);
      if (onAmenitiesLoaded) {
        onAmenitiesLoaded(results);
      }
    } catch (err) {
      console.error('Overpass scan error:', err);
      setScanError(
        isFr
          ? 'Échec du scan Overpass. Veuillez vérifier votre réseau et réessayer.'
          : 'Overpass corridor scan failed. Please check network connection and retry.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle category filter
  const toggleCategory = (cat: AmenityCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) {
          next.delete(cat);
        }
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Active pinned amenities from top-level trip / active stage
  const pinnedAmenities = useMemo(() => {
    return trip.pinnedAmenities || [];
  }, [trip.pinnedAmenities]);

  const pinnedIds = useMemo(() => {
    return new Set(pinnedAmenities.map((p) => p.id));
  }, [pinnedAmenities]);

  // Pin / unpin stop
  const handleTogglePin = (amenity: StageAmenity, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlyPinned = pinnedIds.has(amenity.id);
    let updatedPinned: StageAmenity[];

    if (isCurrentlyPinned) {
      updatedPinned = pinnedAmenities.filter((p) => p.id !== amenity.id);
    } else {
      const newPinnedItem: StageAmenity = {
        ...amenity,
        isPinned: true,
      };
      updatedPinned = [...pinnedAmenities, newPinnedItem].sort(
        (a, b) => a.routeKm - b.routeKm
      );
      setJustPinnedId(amenity.id);
      setTimeout(() => setJustPinnedId(null), 1200);
    }

    // Update active stage snapshot if multi-stage
    let updatedStages = trip.stages;
    if (trip.stages && trip.stages.length > 0) {
      const activeIdx = Math.max(
        0,
        Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
      );
      updatedStages = trip.stages.map((st, idx) =>
        idx === activeIdx ? { ...st, pinnedAmenities: updatedPinned } : st
      );
    }

    onUpdateTrip({
      ...trip,
      pinnedAmenities: updatedPinned,
      stages: updatedStages,
      updatedAt: new Date().toISOString(),
    });
  };

  // Filtered amenities according to category & detour pills
  const filteredAmenities = useMemo(() => {
    return amenities.filter((item) => {
      if (!activeCategories.has(item.category)) return false;
      if (detourOnly250m && item.detourMeters > 250) return false;
      return true;
    });
  }, [amenities, activeCategories, detourOnly250m]);

  // Water gap analysis
  const waterGaps = useMemo(() => {
    const allWaterItems = [...amenities];
    for (const pinned of pinnedAmenities) {
      if (!allWaterItems.some((a) => a.id === pinned.id)) {
        allWaterItems.push(pinned);
      }
    }
    return calculateWaterGaps(allWaterItems, totalDistanceKm);
  }, [amenities, pinnedAmenities, totalDistanceKm]);

  // Category badges configuration
  const categoryConfig: {
    id: AmenityCategory;
    label: string;
    theme: 'sky' | 'purple' | 'amber' | 'teal';
    icon: React.ElementType;
    tooltip?: string;
  }[] = [
    {
      id: 'water',
      label: t('catWater'),
      theme: 'sky',
      icon: Droplets,
    },
    {
      id: 'cemetery',
      label: t('catCemetery'),
      theme: 'purple',
      icon: Cemetery,
      tooltip: t('catCemeteryTooltip'),
    },
    {
      id: 'food',
      label: t('catFood'),
      theme: 'amber',
      icon: Baguette,
    },
    {
      id: 'mechanix',
      label: t('catMechanix'),
      theme: 'teal',
      icon: Wrench,
    },
  ];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const yellowVest = CHIP_TOKENS['yellow-vest'];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-3.5 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 no-print print:hidden select-none">
      {/* ── Solid dark backdrop (NO blur effects, matching settings bottom sheet) ── */}
      <div
        className="fixed inset-0 bg-black/85 animate-fade-in touch-none"
        onClick={onClose}
      />

      {/* ── Modal Card (Floating bottom sheet on mobile, Centered dialog on desktop) ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resupply-radar-title"
        className="relative z-10 w-full max-w-lg sm:max-w-xl max-h-[85vh] max-h-[85dvh] flex flex-col bg-card dark:bg-[#18181B] border-0 sm:border sm:border-ink/[0.08] sm:dark:border-white/[0.08] rounded-[32px] p-4 sm:p-5 shadow-2xl overflow-hidden animate-apple-in"
      >
        {/* Grabber handle pill (touch handle on mobile only) */}
        <div className="w-10 h-1 bg-ink/15 dark:bg-white/20 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

        {/* ── Header: Identity & 1:1 action buttons ── */}
        <div className="flex items-center gap-3 px-1 pt-0.5 pb-2 shrink-0 border-b border-ink/[0.06] dark:border-white/[0.06]">
          <div
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`}
          >
            <Radar className="w-6 h-6 text-current" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold text-ink tracking-tight break-words font-rounded">
              {t('resupplyRadarTitle')}
            </div>
            <div className="text-[13px] text-ink-muted break-words mt-0.5">
              {hasScanned
                ? `${filteredAmenities.length} POIs · ${pinnedAmenities.length} ${t('pinnedStop').toLowerCase()}`
                : t('resupplyRadarSub')}
            </div>
          </div>

          {/* Right actions: 1:1 Map Dots Toggle + Re-scan + 1:1 Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1:1 Map Dots Visibility Toggle */}
            {onToggleShowMapDots && (
              <button
                type="button"
                onClick={onToggleShowMapDots}
                aria-pressed={showMapDots}
                aria-label={showMapDots ? t('hideMapDots') : t('showMapDots')}
                title={showMapDots ? t('hideMapDots') : t('showMapDots')}
                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  showMapDots
                    ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                    : 'bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink'
                } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                {showMapDots ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            )}

            {/* Re-scan button: ONLY shown after scanned */}
            {hasScanned && (
              <button
                type="button"
                onClick={() => handleScanCorridor(true)}
                disabled={isScanning}
                className="w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title={t('reScanCorridor')}
                aria-label={t('reScanCorridor')}
              >
                {isScanning ? (
                  <SpinnerGap className="w-4 h-4 animate-spin text-current" />
                ) : (
                  <ArrowsClockwise className="w-4 h-4 text-current" />
                )}
              </button>
            )}

            {/* 1:1 Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
              aria-label={t('closeRadarModal')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body (clean inner scrolling with zero viewport spillover) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar flex flex-col gap-2.5 pr-0.5 pt-2 pb-1">
          {/* 1. INFORMATION BANNER (Clean, crisp borders, ZERO shadow clipping) */}
          <div className="shrink-0">
            {waterGaps.status === 'critical' ? (
              <div className="rounded-[22px] p-3.5 sm:p-4 bg-rose-500/[0.1] dark:bg-rose-500/[0.15] text-rose-900 dark:text-rose-200 border border-rose-500/25 dark:border-rose-400/25 flex items-start gap-3 transition-colors shadow-none">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <TriangleAlert className="w-4 h-4 text-current" />
                </div>
                <div className="text-xs min-w-0 flex-1 leading-snug">
                  <span className="font-semibold font-rounded">
                    {t('hydrationCritical', {
                      gap: waterGaps.criticalGaps[0]?.distanceKm || waterGaps.maxGapKm,
                      start: waterGaps.criticalGaps[0]?.startKm || 0,
                      end: waterGaps.criticalGaps[0]?.endKm || totalDistanceKm,
                      bidons: waterGaps.criticalGaps[0]?.recommendedBidons || 2,
                      ml: (waterGaps.criticalGaps[0]?.recommendedBidons || 2) * 750,
                    })}
                  </span>
                </div>
              </div>
            ) : waterGaps.status === 'caution' ? (
              <div className="rounded-[22px] p-3.5 sm:p-4 bg-amber-500/[0.1] dark:bg-amber-500/[0.15] text-amber-900 dark:text-amber-200 border border-amber-500/25 dark:border-amber-400/25 flex items-start gap-3 transition-colors shadow-none">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4 text-current" />
                </div>
                <div className="text-xs min-w-0 flex-1 leading-snug">
                  <span className="font-semibold font-rounded">
                    {t('hydrationCaution', {
                      gap: waterGaps.cautionGaps[0]?.distanceKm || waterGaps.maxGapKm,
                      start: waterGaps.cautionGaps[0]?.startKm || 0,
                      end: waterGaps.cautionGaps[0]?.endKm || totalDistanceKm,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] p-3 sm:p-3.5 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-200 border border-emerald-500/20 dark:border-emerald-400/25 flex items-center gap-2.5 transition-colors shadow-none">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-current" />
                </div>
                <span className="text-xs font-medium font-rounded">
                  {t('hydrationStatusGo', { maxGap: waterGaps.maxGapKm })}
                </span>
              </div>
            )}
          </div>

          {/* 2. CATEGORY FILTERS & DETOUR TOGGLE */}
          <div className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted font-rounded shrink-0">
            {isFr ? 'Filtres de ravitaillement' : 'Resupply Filters'}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
            {categoryConfig.map((cat) => {
              const isSelected = activeCategories.has(cat.id);
              const tokens = CHIP_TOKENS[cat.theme];
              const IconComponent = cat.icon;

              return (
                <div key={cat.id} className="relative inline-flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-rounded text-xs font-semibold select-none transition-all cursor-pointer ${
                      tokens.surface
                    } ${tokens.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${CHIP_RING_BASE} ${
                      isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED
                    } hover:brightness-[0.97] dark:hover:brightness-110 active:scale-[0.98]`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-current/15' : 'bg-transparent'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5 text-current shrink-0" />
                    </span>
                    <span>{cat.label}</span>
                  </button>
                  {cat.tooltip && (
                    <div className="ml-0.5">
                      <InfoTooltip content={cat.tooltip} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick toggle pill: < 250m detour only */}
            <button
              type="button"
              onClick={() => setDetourOnly250m((prev) => !prev)}
              aria-pressed={detourOnly250m}
              title={t('radarDetourOnlyTooltip')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-rounded text-xs font-semibold select-none transition-all cursor-pointer shrink-0 ${
                detourOnly250m
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : 'bg-pod dark:bg-white/[0.045] text-ink-muted hover:text-ink hover:bg-chip ring-1 ring-inset ring-ink/10 dark:ring-white/10'
              }`}
            >
              <span>{t('radarDetourOnly')}</span>
            </button>
          </div>

          {/* 3. CORRIDOR HORIZON BAR */}
          <div className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted font-rounded shrink-0">
            {t('corridorHorizonTitle', { total: totalDistanceKm })}
          </div>
          <div className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] p-3.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2 tnum">
              <span>0 km → {totalDistanceKm} km</span>
              <span>{filteredAmenities.length} POIs</span>
            </div>

            <div className="relative w-full h-3 bg-card dark:bg-black/30 rounded-full overflow-hidden flex items-center">
              {/* Background Route Strip */}
              <div className="absolute inset-0 bg-ink/5 dark:bg-white/5" />

              {/* Active Amenity Ticks */}
              {filteredAmenities.map((amenity) => {
                const pct = Math.max(
                  0,
                  Math.min(100, (amenity.routeKm / Math.max(totalDistanceKm, 1)) * 100)
                );
                const isPinned = pinnedIds.has(amenity.id);
                const isSelected = selectedAmenity?.id === amenity.id;

                const colorClass =
                  amenity.category === 'water'
                    ? 'bg-sky-500'
                    : amenity.category === 'cemetery'
                    ? 'bg-purple-500'
                    : amenity.category === 'food'
                    ? 'bg-amber-500'
                    : 'bg-teal-500';

                if (isPinned) {
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => onSelectAmenity?.(amenity)}
                      style={{ left: `${pct}%` }}
                      className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-volt ring-2 ring-[#4d5200] z-20 hover:scale-125 transition-transform cursor-pointer"
                      title={`KM ${amenity.routeKm}: ${amenity.name} (${t('pinnedStop')})`}
                    />
                  );
                }

                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => onSelectAmenity?.(amenity)}
                    style={{ left: `${pct}%` }}
                    className={`absolute -translate-x-1/2 rounded-full transition-transform hover:scale-150 cursor-pointer z-10 ${colorClass} ${
                      isSelected ? 'w-2.5 h-2.5 ring-2 ring-ink' : 'w-1.5 h-1.5'
                    }`}
                    title={`KM ${amenity.routeKm}: ${amenity.name}`}
                  />
                );
              })}
            </div>

            {/* Kilometer Markers Under Spine */}
            <div className="flex justify-between text-[10px] font-mono text-ink-muted mt-1.5 tnum">
              <span>0 km</span>
              <span>{Math.round(totalDistanceKm * 0.25)} km</span>
              <span>{Math.round(totalDistanceKm * 0.5)} km</span>
              <span>{Math.round(totalDistanceKm * 0.75)} km</span>
              <span>{totalDistanceKm} km</span>
            </div>
          </div>

          {/* 4. TACTICAL CORRIDOR FEED / EMPTY STATE */}
          <div className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted font-rounded shrink-0">
            {isFr ? 'Points de passage' : 'Checkpoints'}
          </div>

          {scanError ? (
            <div className="rounded-[22px] p-4 text-center bg-rose-500/[0.1] text-rose-700 dark:text-rose-300 text-xs font-medium space-y-2 shrink-0">
              <p>{scanError}</p>
              <button
                type="button"
                onClick={() => handleScanCorridor(true)}
                className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-bold hover:brightness-105 cursor-pointer text-xs"
              >
                {isFr ? 'Réessayer le scan' : 'Retry Scan'}
              </button>
            </div>
          ) : !hasScanned ? (
            /* Empty state card designed like the "Sync your rides" card in Settings sheet */
            <div className="rounded-[22px] p-5 bg-pod/70 dark:bg-white/[0.045] text-center flex flex-col items-center gap-3 shrink-0">
              <div className="w-12 h-12 rounded-full bg-card dark:bg-[#18181B] flex items-center justify-center text-ink shadow-xs">
                <Radar className="w-6 h-6 text-current" />
              </div>
              <p className="text-[13px] text-ink-muted max-w-sm leading-relaxed">
                {t('emptyRadarState')}
              </p>
              <button
                type="button"
                onClick={() => handleScanCorridor(false)}
                disabled={isScanning}
                className="mt-1 w-full h-12 inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-all hover:brightness-[0.97] active:scale-[0.99] shadow-xs bg-volt text-[#111111]"
              >
                {isScanning ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin text-current" />
                    <span>{t('scanningCorridor')}</span>
                  </>
                ) : (
                  <>
                    <Radar className="w-4 h-4 text-current" />
                    <span>{t('scanCorridor')}</span>
                  </>
                )}
              </button>
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div className="rounded-[22px] p-5 text-center text-xs text-ink-muted bg-pod/70 dark:bg-white/[0.045] shrink-0">
              {t('emptyFilteredRadarState')}
            </div>
          ) : (
            /* Scrollable feed inside grouped card container */
            <div className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] overflow-hidden divide-y divide-ink/[0.06] dark:divide-white/[0.06]">
              {filteredAmenities.map((amenity) => {
                const isPinned = pinnedIds.has(amenity.id);
                const isSelected = selectedAmenity?.id === amenity.id;
                const isJustPinned = justPinnedId === amenity.id;

                const eta = calculateAmenityEta(
                  hardDepartureTime,
                  amenity.routeKm,
                  effectiveSpeedKmH
                );

                const categoryDetails = categoryConfig.find((c) => c.id === amenity.category);
                const tokens = CHIP_TOKENS[categoryDetails?.theme || 'sky'];
                const IconComp = categoryDetails?.icon || Droplets;

                return (
                  <div
                    key={amenity.id}
                    onClick={() => onSelectAmenity?.(amenity)}
                    className={`p-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-pod dark:bg-white/[0.08]'
                        : 'hover:bg-pod/80 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Left: Category Icon & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tokens.surface} ${tokens.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                      >
                        <IconComp className="w-4 h-4 text-current" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-rounded font-semibold text-[13px] text-ink break-words leading-tight">
                            {amenity.name}
                          </span>
                          {amenity.openingHours && (
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card dark:bg-black/30 text-ink-muted shrink-0 hidden sm:inline"
                              title={amenity.openingHours}
                            >
                              {amenity.openingHours.length > 15
                                ? `${amenity.openingHours.slice(0, 15)}...`
                                : amenity.openingHours}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-ink-muted capitalize mt-0.5">
                          {amenity.subType.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Right: Telemetry Cluster, Map Action & Pin CTA */}
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                      {/* Snapped KM & Reverse-timeline ETA */}
                      <div className="text-right tnum">
                        <div className="font-rounded font-bold text-xs text-ink">
                          KM {amenity.routeKm}
                        </div>
                        <div className="text-[10px] font-mono text-ink-muted">
                          ETA {eta}
                        </div>
                      </div>

                      {/* Perpendicular Detour Badge */}
                      <div className="hidden sm:block">
                        {amenity.detourMeters < 75 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {t('onRoute')}
                          </span>
                        ) : amenity.detourMeters > 500 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-rounded bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 tnum">
                            {t('detourDist', { detour: amenity.detourMeters })}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium font-rounded bg-card dark:bg-white/[0.08] text-ink-secondary tnum">
                            {t('detourDist', { detour: amenity.detourMeters })}
                          </span>
                        )}
                      </div>

                      {/* View on Map Button (1:1 aspect-ratio, centers map and closes sheet) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAmenity?.(amenity);
                          onClose();
                        }}
                        className="w-8 h-8 rounded-full bg-card dark:bg-white/[0.08] hover:bg-chip flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer transition-colors"
                        title={t('viewOnMap')}
                        aria-label={t('viewOnMap')}
                      >
                        <MapPin className="w-3.5 h-3.5 text-current" />
                      </button>

                      {/* Pin to Ride Plan Button */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(amenity, e)}
                        aria-pressed={isPinned}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer select-none ${
                          isPinned
                            ? `bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] shadow-xs ${
                                isJustPinned ? 'animate-apple-check-pop' : ''
                              }`
                            : 'bg-card dark:bg-white/[0.08] text-ink-secondary hover:text-ink hover:bg-chip'
                        }`}
                        title={isPinned ? t('unpinStop') : t('pinToPlan')}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isPinned ? 'text-[#4d5200] fill-current' : 'text-current'
                          }`}
                        />
                        <span className="hidden min-[480px]:inline">
                          {isPinned ? t('pinnedStop') : t('pinToPlan')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer matching Settings Bottom Sheet ── */}
        <div className="flex items-center justify-center gap-1.5 pt-2.5 pb-0.5 text-[11px] text-ink-muted font-mono tnum shrink-0 border-t border-ink/[0.06] dark:border-white/[0.06]">
          <span>{t('appName')}</span>
          <span aria-hidden="true">·</span>
          <span>v2.6</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
