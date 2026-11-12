import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Download,
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
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { calculateHydrationPlan } from '../../utils/nutrition';
import { formatKm, formatCriticalGapAdvice, formatGapDetail } from '../../utils/waterGapCopy';
import { estimateAmenityDetourKm } from '../../utils/cueSheet';
import {
  isAmenityInRoute,
  removeAmenityFromRoute,
  rerouteTripThroughAmenity,
  togglePinnedAmenityOnTrip,
} from '../../utils/routing';
import { downloadEntireTourGpx, downloadTripGpx } from '../../utils/gpxExporter';
import {
  AmenityInRouteBadge,
  AmenityReroutePrompt,
  AmenityRouteSubAction,
} from './AmenityReroutePrompt';
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
  /** Rider leg power from physics, so gap fluid needs match the nutrition card */
  legWatts?: number;
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
  legWatts,
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
  const [reroutePromptAmenityId, setReroutePromptAmenityId] = useState<string | null>(null);
  const [reroutingAmenityId, setReroutingAmenityId] = useState<string | null>(null);
  const [rerouteFeedback, setRerouteFeedback] = useState<{
    id: string;
    message: string;
    isError?: boolean;
  } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock background page scroll while overlay is active (iOS Safari bulletproof lock)
  useEffect(() => {
    if (!isOpen) return;

    // Save scroll position and original body/html inline styles
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // Pin body to exact position to prevent iOS mobile viewport rubber-banding/scroll bleed
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Intercept touchmove so touches outside the card never scroll the page
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow touches inside the sheet card
      if (sheetRef.current && sheetRef.current.contains(target)) {
        return;
      }

      // Prevent touches on backdrop / outer edges from scrolling the window
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchmove', handleTouchMove);

      // Restore body/html styles and restore previous scroll position
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.scrollTo(0, scrollY);
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
      console.error('Corridor stop scan error:', err);
      setScanError(
        isFr
          ? 'Impossible de charger les points de passage. Vérifiez votre connexion et réessayez.'
          : 'Could not load route stops. Please check your connection and retry.'
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
    // If already added as a route detour, unpinning also cleanly removes it from the route
    if (pinnedIds.has(amenity.id) && isAmenityInRoute(trip.route, amenity)) {
      void runRouteStopMutation(amenity, 'remove', e, { unpin: true });
      return;
    }

    const { updatedTrip, isNowPinned } = togglePinnedAmenityOnTrip(trip, amenity);

    if (isNowPinned) {
      setJustPinnedId(amenity.id);
      setTimeout(() => setJustPinnedId(null), 1200);
      if (!isAmenityInRoute(trip.route, amenity)) {
        setReroutePromptAmenityId(amenity.id);
      }
    } else if (reroutePromptAmenityId === amenity.id) {
      setReroutePromptAmenityId(null);
    }

    onUpdateTrip(updatedTrip);
  };

  // Add or remove a Radar POI as an intermediate route stop
  const runRouteStopMutation = async (
    amenity: StageAmenity,
    action: 'add' | 'remove',
    e?: React.MouseEvent,
    options?: { unpin?: boolean }
  ) => {
    e?.stopPropagation();
    if (reroutingAmenityId) return;

    setReroutingAmenityId(amenity.id);
    setRerouteFeedback(null);

    try {
      const result =
        action === 'add'
          ? await rerouteTripThroughAmenity(trip, amenity, amenities)
          : await removeAmenityFromRoute(trip, amenity, amenities, options);
      setAmenities(result.updatedAmenities);
      if (onAmenitiesLoaded) {
        onAmenitiesLoaded(result.updatedAmenities);
      }
      onUpdateTrip(result.updatedTrip);
      setReroutePromptAmenityId(null);
      setRerouteFeedback({
        id: amenity.id,
        message:
          action === 'add'
            ? result.actualDetourKm > 0
              ? t('rerouteSuccessMsg', {
                  name: amenity.name,
                  delta: result.actualDetourKm.toFixed(1),
                })
              : t('rerouteSuccessOnRouteMsg', { name: amenity.name })
            : result.actualDetourKm > 0
            ? t('rerouteRemovedMsg', {
                name: amenity.name,
                delta: result.actualDetourKm.toFixed(1),
              })
            : t('rerouteRemovedOnRouteMsg', { name: amenity.name }),
      });
      setTimeout(() => {
        setRerouteFeedback((curr) => (curr?.id === amenity.id ? null : curr));
      }, 3500);
    } catch (err) {
      console.error('Route stop mutation error:', err);
      setRerouteFeedback({
        id: amenity.id,
        isError: true,
        message:
          action === 'add'
            ? isFr
              ? 'Impossible de recalculer cet arrêt pour le moment.'
              : 'Could not reroute through this stop right now.'
            : isFr
            ? 'Impossible de retirer cet arrêt pour le moment.'
            : 'Could not remove this stop from the route right now.',
      });
    } finally {
      setReroutingAmenityId(null);
    }
  };

  // Filtered amenities according to category & detour pills
  const filteredAmenities = useMemo(() => {
    return amenities.filter((item) => {
      if (!activeCategories.has(item.category)) return false;
      if (detourOnly250m && item.detourMeters > 250) return false;
      return true;
    });
  }, [amenities, activeCategories, detourOnly250m]);

  // Water gap analysis (bottle setup read each render so spec edits apply immediately)
  const radarSpecs = loadRiderBikeSpecs();
  const radarBidonSizeMl = radarSpecs.bidonSizeMl ?? 650;
  const radarFrameSlots = radarSpecs.frameBottleSlots ?? 2;
  const radarActiveChips = trip.customChips;
  const radarTotalDays = trip.stages?.length || 1;
  const waterGaps = useMemo(() => {
    const allWaterItems = [...amenities];
    for (const pinned of pinnedAmenities) {
      if (!allWaterItems.some((a) => a.id === pinned.id)) {
        allWaterItems.push(pinned);
      }
    }
    const sectorSpeed = effectiveSpeedKmH || trip.route?.targetSpeedKmH || 25;
    const rideHours = totalDistanceKm / Math.max(8, sectorSpeed);
    const hydration = calculateHydrationPlan({
      rideHours,
      tempC: trip.weather?.temperatureC ?? 18,
      legWatts: legWatts ?? 150,
      bidonSizeMl: radarBidonSizeMl,
      frameBottleSlots: radarFrameSlots,
      isShortRide: rideHours < 0.75 && radarTotalDays === 1,
      activeChips: radarActiveChips || [],
    });
    return calculateWaterGaps(allWaterItems, totalDistanceKm, {
      sectorSpeedKmH: sectorSpeed,
      targetFluidMlPerHr: hydration.targetFluidMlPerHr,
      bidonSizeMl: radarBidonSizeMl,
      frameBottleSlots: radarFrameSlots,
    });
  }, [
    amenities,
    pinnedAmenities,
    totalDistanceKm,
    effectiveSpeedKmH,
    legWatts,
    trip.route?.targetSpeedKmH,
    trip.weather?.temperatureC,
    radarBidonSizeMl,
    radarFrameSlots,
    radarActiveChips,
    radarTotalDays,
  ]);

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
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-3.5 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 no-print print:hidden pointer-events-none">
      {/* ── Solid dark backdrop (NO blur effects, matching settings bottom sheet) ── */}
      <div
        className="fixed inset-0 bg-black/85 animate-apple-fade-in touch-none pointer-events-auto"
        onClick={onClose}
      />

      {/* ── Modal Card (Floating bottom sheet on mobile, Centered dialog on desktop) ── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resupply-radar-title"
        className="relative z-10 pointer-events-auto w-full max-w-lg sm:max-w-xl max-h-[85vh] max-h-[85dvh] bg-card dark:bg-[#18181B] rounded-[32px] px-4 sm:px-5 pb-4 sm:pb-5 pt-0 shadow-2xl overflow-y-auto overscroll-contain touch-pan-y animate-apple-modal"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* ── Sticky Header: Grabber + Identity & 1:1 action buttons ── */}
        <div className="sticky top-0 z-20 bg-card dark:bg-[#18181B] -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-2.5 rounded-t-[32px]">
          {/* Grabber handle pill (touch handle on mobile only) */}
          <div className="w-10 h-1 bg-ink/15 dark:bg-white/20 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`}
            >
              <Radar className="w-6 h-6 text-current" />
            </div>

            <div className="min-w-0 flex-1">
              <div id="resupply-radar-title" className="text-[17px] font-semibold text-ink tracking-tight break-words font-rounded">
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
                  className={`relative before:content-[''] before:absolute before:-inset-1 sm:before:inset-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors shrink-0 select-none ${
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
                  className="relative before:content-[''] before:absolute before:-inset-1 sm:before:inset-0 w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0 select-none"
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
                className="relative before:content-[''] before:absolute before:-inset-1 sm:before:inset-0 w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0 select-none"
                aria-label={t('closeRadarModal')}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="lane-divider mt-2.5" aria-hidden="true" />
        </div>

        {/* ── Scrollable Body Content ── */}
        <div className="flex flex-col gap-2.5 pt-2.5">
          {/* 1. INFORMATION BANNER */}
          <div className="shrink-0">
            {!hasScanned ? null : waterGaps.status === 'critical' ? (
              <div className="rounded-[22px] p-3.5 sm:p-4 bg-rose-500/[0.1] dark:bg-rose-500/[0.15] text-rose-900 dark:text-rose-200 flex items-start gap-3 transition-colors shadow-none">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <TriangleAlert className="w-4 h-4 text-current" />
                </div>
                <div className="text-xs min-w-0 flex-1 leading-snug space-y-1">
                  <span className="font-semibold font-rounded block">
                    {t('hydrationCritical', {
                      gap: formatKm(waterGaps.criticalGaps[0]?.distanceKm || waterGaps.maxGapKm, lang),
                      start: formatKm(waterGaps.criticalGaps[0]?.startKm || 0, lang),
                      end: formatKm(waterGaps.criticalGaps[0]?.endKm || totalDistanceKm, lang),
                      advice: formatCriticalGapAdvice(waterGaps.criticalGaps[0], lang),
                    })}
                  </span>
                  {waterGaps.criticalGaps[0] && (
                    <div className="text-[11px] font-rounded tnum opacity-90">
                      {formatGapDetail(waterGaps.criticalGaps[0], lang)}
                    </div>
                  )}
                </div>
              </div>
            ) : waterGaps.status === 'caution' ? (
              <div className="rounded-[22px] p-3.5 sm:p-4 bg-amber-500/[0.1] dark:bg-amber-500/[0.15] text-amber-900 dark:text-amber-200 border border-amber-500/25 dark:border-amber-400/25 flex items-start gap-3 transition-colors shadow-none">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4 text-current" />
                </div>
                <div className="text-xs min-w-0 flex-1 leading-snug space-y-1">
                  <span className="font-semibold font-rounded block">
                    {t('hydrationCaution', {
                      gap: formatKm(waterGaps.cautionGaps[0]?.distanceKm || waterGaps.maxGapKm, lang),
                      start: formatKm(waterGaps.cautionGaps[0]?.startKm || 0, lang),
                      end: formatKm(waterGaps.cautionGaps[0]?.endKm || totalDistanceKm, lang),
                    })}
                  </span>
                  {waterGaps.cautionGaps[0] && (
                    <div className="text-[11px] font-rounded tnum opacity-90">
                      {formatGapDetail(waterGaps.cautionGaps[0], lang)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] p-3 sm:p-3.5 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 transition-colors shadow-none">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-current" />
                </div>
                <span className="text-xs font-medium font-rounded">
                  {t('hydrationStatusGo', { maxGap: formatKm(waterGaps.maxGapKm, lang) })}
                </span>
              </div>
            )}
          </div>

          {/* 2. CATEGORY FILTERS & DETOUR TOGGLE */}
          <div className="px-2 pt-2 pb-1 text-xs font-semibold text-ink-muted font-rounded shrink-0">
            {isFr ? 'Filtres de ravitaillement' : 'Resupply filters'}
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
                    className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-full font-rounded text-xs font-semibold select-none transition-all cursor-pointer ${
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
              className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-full font-rounded text-xs font-semibold select-none transition-all cursor-pointer shrink-0 ${CHIP_RING_BASE} ${
                detourOnly250m
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : `bg-pod dark:bg-white/[0.045] text-ink-muted hover:text-ink hover:bg-chip ${CHIP_RING_UNSELECTED}`
              }`}
            >
              <span>{t('radarDetourOnly')}</span>
            </button>
          </div>

          {/* 3. CORRIDOR HORIZON BAR */}
          <div className="px-2 pt-2 pb-1 text-xs font-semibold text-ink-muted font-rounded shrink-0">
            {t('corridorHorizonTitle', { total: totalDistanceKm })}
          </div>
          <div className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] p-3.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted mb-2 tnum">
              <span>0 km → {totalDistanceKm} km</span>
              <span>{filteredAmenities.length} {isFr ? 'points' : 'stops'}</span>
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
            <div className="flex justify-between text-[10px] text-ink-muted mt-1.5 tnum">
              <span>0 km</span>
              <span>{Math.round(totalDistanceKm * 0.25)} km</span>
              <span>{Math.round(totalDistanceKm * 0.5)} km</span>
              <span>{Math.round(totalDistanceKm * 0.75)} km</span>
              <span>{totalDistanceKm} km</span>
            </div>
          </div>

          {/* 4. CORRIDOR FEED / EMPTY STATE */}
          <div className="px-2 pt-2 pb-1 text-xs font-semibold text-ink-muted font-rounded shrink-0">
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
            /* Grouped card container with smooth native touch pan */
            <div className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] divide-y divide-ink/[0.06] dark:divide-white/[0.06] touch-pan-y">
              {filteredAmenities.map((amenity, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === filteredAmenities.length - 1;
                const isPinned = pinnedIds.has(amenity.id);
                const isSelected = selectedAmenity?.id === amenity.id;
                const isJustPinned = justPinnedId === amenity.id;
                const inRoute = isAmenityInRoute(trip.route, amenity);
                const detourKm = estimateAmenityDetourKm(amenity.detourMeters);
                const reroutePromptText =
                  detourKm >= 0.1
                    ? t('reroutePrompt', { detour: detourKm.toFixed(1) })
                    : t('reroutePromptOnRoute');
                const isPromptOpen = isPinned && !inRoute && reroutePromptAmenityId === amenity.id;
                const isReroutingThis = reroutingAmenityId === amenity.id;
                const rowFeedback = rerouteFeedback?.id === amenity.id ? rerouteFeedback : null;

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
                    className={`p-3 transition-colors cursor-pointer touch-pan-y ${
                      isFirst ? 'rounded-t-[22px]' : ''
                    } ${isLast ? 'rounded-b-[22px]' : ''} ${
                      isSelected
                        ? 'bg-pod dark:bg-white/[0.08]'
                        : 'hover:bg-pod/80 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                            {inRoute && (
                              <AmenityInRouteBadge
                                isUpdating={isReroutingThis}
                                disabled={Boolean(reroutingAmenityId)}
                                onRemove={(e) => runRouteStopMutation(amenity, 'remove', e)}
                              />
                            )}
                            {amenity.openingHours && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-card dark:bg-black/30 text-ink-muted shrink-0 hidden sm:inline tnum"
                                title={amenity.openingHours}
                              >
                                {amenity.openingHours.length > 15
                                  ? `${amenity.openingHours.slice(0, 15)}...`
                                  : amenity.openingHours}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-ink-muted capitalize mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{amenity.subType.replace(/_/g, ' ')}</span>
                            <AmenityRouteSubAction
                              inRoute={inRoute}
                              isPinned={isPinned}
                              isPromptOpen={isPromptOpen}
                              isUpdating={isReroutingThis}
                              disabled={Boolean(reroutingAmenityId)}
                              reroutePromptText={reroutePromptText}
                              onAdd={(e) => runRouteStopMutation(amenity, 'add', e)}
                              onRemove={(e) => runRouteStopMutation(amenity, 'remove', e)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Telemetry Cluster, Map Action & Pin CTA */}
                      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        {/* Snapped KM & Reverse-timeline ETA */}
                        <div className="text-right tnum">
                          <div className="font-rounded font-bold text-xs text-ink">
                            {amenity.routeKm} km
                          </div>
                          <div className="text-[10px] text-ink-muted">
                            {eta}
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
                          className="relative before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 w-9 h-9 rounded-full bg-card dark:bg-white/[0.08] hover:bg-chip flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer transition-colors"
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
                          className={`inline-flex items-center gap-1 min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer select-none ${
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

                    {/* 1-Click Intermediate Stop Reroute Prompt & Feedback */}
                    <AmenityReroutePrompt
                      promptText={reroutePromptText}
                      isOpen={isPromptOpen}
                      isRerouting={isReroutingThis}
                      disabled={Boolean(reroutingAmenityId)}
                      feedback={rowFeedback}
                      onConfirm={(e) => runRouteStopMutation(amenity, 'add', e)}
                      onDismiss={(e) => {
                        e.stopPropagation();
                        setReroutePromptAmenityId(null);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* GPX / TCX Export Readiness Bar when stops are pinned */}
          {pinnedAmenities.length > 0 && (
            <div className="rounded-[20px] bg-pod/70 dark:bg-white/[0.045] px-3.5 py-2.5 flex items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] font-rounded text-ink-secondary leading-snug">
                {t('gpxExportReadyNote')}
              </span>
              <button
                type="button"
                onClick={() =>
                  trip.stages && trip.stages.length > 1
                    ? downloadEntireTourGpx(trip)
                    : downloadTripGpx(trip)
                }
                className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full bg-volt text-[#111111] font-rounded font-bold text-xs shrink-0 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-current" />
                <span>
                  {trip.stages && trip.stages.length > 1 ? 'Tour .gpx' : 'Download .gpx'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ── Footer matching Settings Bottom Sheet ── */}
        <div className="lane-divider mt-3" aria-hidden="true" />
        <div className="flex items-center justify-center gap-1.5 pt-2.5 pb-0.5 text-[11px] text-ink-muted tnum shrink-0">
          <span>{t('appName')}</span>
          <span aria-hidden="true">·</span>
          <span>v2.6</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
