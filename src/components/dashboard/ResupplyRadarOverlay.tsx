import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/arc/button/button";
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
  Shield,
  TrainSimple,
  Sparkle,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { StageAmenity, AmenityCategory } from '../../types/amenities';
import {
  scanCorridorAmenities,
  calculateWaterGaps,
  calculateAmenityEta,
  getRouteHashKey,
  getCachedScan,
  autoMarkResupplyStops,
} from '../../services/overpassCorridor';
import { useTranslation } from '../../context/LanguageContext';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { calculateHydrationPlan } from '../../utils/nutrition';
import { formatKm, formatCriticalGapAdvice, formatGapDetail } from '../../utils/waterGapCopy';
import { estimateAmenityDetourKm } from '../../utils/cueSheet';
import { downloadTripFit } from '../../utils/fitExporter';
import {
  isAmenityInRoute,
  removeAmenityFromRoute,
  rerouteTripThroughAmenity,
  togglePinnedAmenityOnTrip,
} from '../../utils/routing';
import { downloadEntireTourGpx, downloadTripGpx } from '../../utils/gpxExporter';
import { evaluateOpeningHoursAtArrival, ArrivalOpeningVerdict } from '../../utils/openingHours';
import { CadenceInsight } from '../common/CadenceInsight';

function getOsmElementUrl(amenityId: string): string | null {
  const match = amenityId.match(/^(node|way|relation)\/(\d+)$/);
  return match ? `https://www.openstreetmap.org/${match[1]}/${match[2]}` : null;
}

const OPENING_BADGE_CLASSES: Record<ArrivalOpeningVerdict['status'], string> = {
  open: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
  'closing-soon': 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25',
  closed: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25',
  unknown: 'bg-card dark:bg-black/30 text-ink-muted',
};
import {
  AmenityInRouteBadge,
  AmenityReroutePrompt,
  AmenityRouteSubAction,
} from './AmenityReroutePrompt';
import { InfoTooltip } from '../common/InfoTooltip';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
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
  activeCategories?: Set<AmenityCategory>;
  onActiveCategoriesChange?: (next: Set<AmenityCategory>) => void;
  showMapDots?: boolean;
  onToggleShowMapDots?: () => void;
  /** When true, renders inline inside the Layer 2 dashboard tab instead of a portal modal. */
  embedded?: boolean;
  /** Desktop layout when embedded: 'split' uses a 2+3 grid (Tabbed view), 'stacked' uses a single column (Show All 3-col stack). */
  embeddedLayout?: 'split' | 'stacked';
  /** Optional callback used in embedded mode when clicking "View on map". */
  onJumpToMap?: () => void;
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
  activeCategories: controlledActiveCategories,
  onActiveCategoriesChange,
  showMapDots = true,
  onToggleShowMapDots,
  embedded = false,
  embeddedLayout = 'split',
  onJumpToMap,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  // Category filters (controlled when shared with BentoDashboard/HeroRouteCard so map dots stay in sync)
  const [localActiveCategories, setLocalActiveCategories] = useState<Set<AmenityCategory>>(
    () => new Set<AmenityCategory>(['water', 'cemetery', 'food', 'mechanix', 'essentials', 'bailout'])
  );
  const activeCategories = controlledActiveCategories ?? localActiveCategories;
  const setActiveCategories = (
    updater: Set<AmenityCategory> | ((prev: Set<AmenityCategory>) => Set<AmenityCategory>)
  ) => {
    const next = typeof updater === 'function' ? updater(activeCategories) : updater;
    if (onActiveCategoriesChange) {
      onActiveCategoriesChange(next);
    } else {
      setLocalActiveCategories(next);
    }
  };
  const [expandedCategoryGroups, setExpandedCategoryGroups] = useState<Set<string>>(() => new Set());
  const [detourOnly250m, setDetourOnly250m] = useState<boolean>(false);
  const [autoMarkMsg, setAutoMarkMsg] = useState<string | null>(null);
  const [autoMarkedIds, setAutoMarkedIds] = useState<string[]>([]);

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
    if (!isOpen || embedded) return;

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
  }, [isOpen, embedded, onClose]);

  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const activeDateStr = activeStage?.departureDate || trip.departureDate;

  const hasValidCorridorCoords = Boolean(
    trip.route?.routeMode !== 'manual-radius' &&
      trip.route?.coordinates &&
      trip.route.coordinates.length >= 2
  );
  const currentCoords = useMemo(() => {
    return hasValidCorridorCoords ? trip.route!.coordinates! : [];
  }, [hasValidCorridorCoords, trip.route?.coordinates]);
  const totalDistanceKm = trip.route?.distanceKm || 45;
  const stageId = activeStage?.id || trip.id;

  const routeCacheKey = useMemo(
    () => (currentCoords.length >= 2 ? getRouteHashKey(currentCoords, stageId, totalDistanceKm) : ''),
    [currentCoords, stageId, totalDistanceKm]
  );

  // Auto-load from in-memory Tier-1 cache if previously scanned
  useEffect(() => {
    if (!routeCacheKey) {
      setAmenities([]);
      setHasScanned(false);
      setScanError(null);
      return;
    }
    const cached = getCachedScan(routeCacheKey);
    if (cached !== undefined) {
      setAmenities(cached);
      setHasScanned(true);
      setScanError(null);
      if (onAmenitiesLoaded && cached.length > 0) {
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

  // Toggle category filter (Water & Cemeteries are merged into a single Water filter pill)
  const toggleCategory = (cat: AmenityCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      const targets: AmenityCategory[] = cat === 'water' ? ['water', 'cemetery'] : [cat];
      const allActive = targets.every((t) => next.has(t));
      if (allActive) {
        if (next.size > targets.length) {
          targets.forEach((t) => next.delete(t));
        }
      } else {
        targets.forEach((t) => next.add(t));
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

  const isAutoMarkActive = useMemo(
    () => autoMarkedIds.length > 0 && autoMarkedIds.some((id) => pinnedIds.has(id)),
    [autoMarkedIds, pinnedIds]
  );

  // Auto-Mark water gaps & 25 km stops (toggles ON/OFF like a light switch)
  const handleAutoMarkStops = (intervalKm = 25) => {
    if (isAutoMarkActive) {
      const autoSet = new Set(autoMarkedIds);
      const remainingPinned = pinnedAmenities.filter((p) => !autoSet.has(p.id));
      let updatedStages = trip.stages;
      if (trip.stages && trip.stages.length > 0) {
        const activeIdx = Math.max(
          0,
          Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
        );
        updatedStages = trip.stages.map((st, idx) =>
          idx === activeIdx ? { ...st, pinnedAmenities: remainingPinned } : st
        );
      }
      onUpdateTrip({
        ...trip,
        pinnedAmenities: remainingPinned,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      });
      setAutoMarkedIds([]);
      setAutoMarkMsg(isFr ? 'Arrêts auto retirés' : 'Auto-marked stops cleared');
      setTimeout(() => setAutoMarkMsg(null), 2400);
      return;
    }

    if (amenities.length === 0) return;
    const { selectedStops, addedStops } = autoMarkResupplyStops({
      amenities,
      totalDistanceKm,
      existingPinned: pinnedAmenities,
      departureTime: hardDepartureTime,
      targetDate: activeDateStr,
      effectiveSpeedKmH,
      intervalKm,
    });

    if (addedStops.length === 0) {
      setAutoMarkMsg(
        isFr ? 'Tous les intervalles sont déjà couverts.' : 'All intervals are already covered.'
      );
      setTimeout(() => setAutoMarkMsg(null), 2600);
      return;
    }

    let updatedStages = trip.stages;
    if (trip.stages && trip.stages.length > 0) {
      const activeIdx = Math.max(
        0,
        Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1)
      );
      updatedStages = trip.stages.map((st, idx) =>
        idx === activeIdx ? { ...st, pinnedAmenities: selectedStops } : st
      );
    }

    onUpdateTrip({
      ...trip,
      pinnedAmenities: selectedStops,
      stages: updatedStages,
      updatedAt: new Date().toISOString(),
    });
    setAutoMarkedIds(addedStops.map((s) => s.id));

    setAutoMarkMsg(
      isFr
        ? `+${addedStops.length} arrêt${addedStops.length > 1 ? 's' : ''} épinglé${addedStops.length > 1 ? 's' : ''}`
        : `+${addedStops.length} stop${addedStops.length > 1 ? 's' : ''} auto-marked`
    );
    setTimeout(() => setAutoMarkMsg(null), 2600);
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
          : await removeAmenityFromRoute(trip, amenity, amenities, {
              ...options,
              unpin: options?.unpin ?? true,
            });
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
    if (!hasScanned) {
      return {
        maxGapKm: 0,
        criticalGaps: [],
        cautionGaps: [],
        gaps: [],
        status: 'ok' as const,
      };
    }
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
    hasScanned,
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
    theme: 'sky' | 'purple' | 'amber' | 'teal' | 'blue' | 'orange';
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
    {
      id: 'essentials',
      label: isFr ? 'WC / Pharm. / Carb.' : 'WC / Med / Fuel',
      theme: 'blue',
      icon: Shield,
    },
    {
      id: 'bailout',
      label: isFr ? 'Gares (Repli)' : 'Train Bailout',
      theme: 'orange',
      icon: TrainSimple,
    },
  ];

  if (!embedded && !isOpen) return null;
  if (!embedded && typeof document === 'undefined') return null;

  const yellowVest = CHIP_TOKENS['yellow-vest'];

  const radarContent = (
    <div
      ref={embedded ? undefined : sheetRef}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="resupply-radar-title"
      className={
        embedded
          ? 'w-full bg-card dark:bg-[#18181B] rounded-card p-4 sm:p-5 lg:p-6 shadow-xs border border-ink/5 dark:border-white/5'
          : 'relative z-10 pointer-events-auto w-full max-w-lg sm:max-w-xl max-h-[85vh] max-h-[85dvh] bg-card dark:bg-[#18181B] rounded-[32px] px-4 sm:px-5 pb-4 sm:pb-5 pt-0 shadow-2xl overflow-y-auto overscroll-contain touch-pan-y animate-apple-modal'
      }
      style={embedded ? undefined : { WebkitOverflowScrolling: 'touch' }}
    >
      {/* ── Header: Grabber (modal only) + Identity & 1:1 action buttons ── */}
      <div
        className={
          embedded
            ? 'pb-2.5'
            : 'sticky top-0 z-20 bg-card dark:bg-[#18181B] -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-2.5 rounded-t-[32px]'
        }
      >
        {/* Grabber handle pill (touch handle on mobile modal only) */}
        {!embedded && (
          <div className="w-10 h-1 bg-ink/15 dark:bg-white/20 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />
        )}

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

          {/* Right actions: 1:1 Map Dots Toggle + Re-scan + 1:1 Close Button (modal only) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1:1 Map Dots Visibility Toggle */}
            {onToggleShowMapDots && (
              <Button variant="ghost"
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
              </Button>
            )}

            {/* Re-scan button: ONLY shown after scanned */}
            {hasScanned && (
              <Button variant="ghost"
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
              </Button>
            )}

            {/* 1:1 Close button (modal only) */}
            {!embedded && (
              <Button variant="ghost"
                type="button"
                onClick={onClose}
                className="relative before:content-[''] before:absolute before:-inset-1 sm:before:inset-0 w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0 select-none"
                aria-label={t('closeRadarModal')}
              >
                <X size={18} />
              </Button>
            )}
          </div>
        </div>
        <div className="lane-divider mt-2.5" aria-hidden="true" />
      </div>

        {/* ── Body Content (2+3 Desktop Split in Tabbed Embedded mode; Stacked in Modal or Masonry column) ── */}
        <div
          className={
            embedded && embeddedLayout === 'split'
              ? 'grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start pt-3'
              : 'flex flex-col gap-2.5 pt-2.5'
          }
        >
          <div className={embedded && embeddedLayout === 'split' ? 'lg:col-span-2 flex flex-col gap-2.5 min-w-0' : 'contents'}>
          {/* 1. INFORMATION BANNER */}
          <div className="shrink-0 px-0.5 py-0.5">
            {!hasScanned ? null : waterGaps.status === 'critical' ? (
              <CadenceInsight
                compact
                tone="rose"
                headline={t('hydrationCritical', {
                  gap: formatKm(waterGaps.criticalGaps[0]?.distanceKm || waterGaps.maxGapKm, lang),
                  start: formatKm(waterGaps.criticalGaps[0]?.startKm || 0, lang),
                  end: formatKm(waterGaps.criticalGaps[0]?.endKm || totalDistanceKm, lang),
                  advice: formatCriticalGapAdvice(waterGaps.criticalGaps[0], lang),
                })}
                detail={
                  waterGaps.criticalGaps[0]
                    ? formatGapDetail(waterGaps.criticalGaps[0], lang)
                    : undefined
                }
              />
            ) : waterGaps.status === 'caution' ? (
              <CadenceInsight
                compact
                tone="amber"
                headline={t('hydrationCaution', {
                  gap: formatKm(waterGaps.cautionGaps[0]?.distanceKm || waterGaps.maxGapKm, lang),
                  start: formatKm(waterGaps.cautionGaps[0]?.startKm || 0, lang),
                  end: formatKm(waterGaps.cautionGaps[0]?.endKm || totalDistanceKm, lang),
                })}
                detail={
                  waterGaps.cautionGaps[0]
                    ? formatGapDetail(waterGaps.cautionGaps[0], lang)
                    : undefined
                }
              />
            ) : (
              <CadenceInsight
                compact
                tone="emerald"
                headline={
                  waterGaps.maxGapKm <= 5
                    ? isFr
                      ? `Tu es large côté eau — des points d’eau tous les ${formatKm(waterGaps.maxGapKm, lang)} km, tes bidons couvrent tout.`
                      : `You’re well covered on water — taps within ${formatKm(waterGaps.maxGapKm, lang)} km, your bottles easily handle it.`
                    : t('hydrationStatusGo', { maxGap: formatKm(waterGaps.maxGapKm, lang) })
                }
                detail={(() => {
                  const openFood = amenities.filter((a) => a.category === 'food').length;
                  if (openFood > 0) {
                    return isFr
                      ? `${openFood} boulangerie${openFood > 1 ? 's' : ''} / café${openFood > 1 ? 's' : ''} repéré${openFood > 1 ? 's' : ''} sur ton parcours — zéro stress pour te ravitailler.`
                      : `${openFood} bakery / café stop${openFood > 1 ? 's' : ''} spotted along your route — zero resupply stress.`;
                  }
                  return isFr
                    ? 'Aucun secteur sec préoccupant sur ta trace.'
                    : 'No dry stretches to worry about along your route.';
                })()}
              />
            )}
          </div>

          {/* 2. CATEGORY FILTERS & DETOUR TOGGLE */}
          <div className="px-2 pt-2 pb-1 text-xs font-semibold text-ink-muted font-rounded shrink-0">
            {isFr ? 'Filtres de ravitaillement' : 'Resupply filters'}
          </div>
          <div
            className={
              embedded && embeddedLayout === 'split'
                ? 'flex flex-wrap items-center gap-1.5 py-0.5 shrink-0'
                : 'flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0'
            }
          >
            {categoryConfig
              .filter((cat) => cat.id !== 'cemetery')
              .map((cat) => {
              const isSelected = activeCategories.has(cat.id);
              const tokens = CHIP_TOKENS[cat.theme];
              const IconComponent = cat.icon;

              return (
                <div key={cat.id} className="relative inline-flex items-center shrink-0">
                  <Button variant="ghost"
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
                  </Button>
                  {cat.tooltip && (
                    <div className="ml-0.5">
                      <InfoTooltip content={cat.tooltip} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick toggle pill: < 250m detour only */}
            <Button variant="ghost"
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
            </Button>
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
                    : amenity.category === 'essentials'
                    ? 'bg-blue-500'
                    : amenity.category === 'bailout'
                    ? 'bg-orange-500'
                    : 'bg-teal-500';

                if (isPinned) {
                  return (
                    <Button variant="primary"
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
                  <Button variant="ghost"
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
          </div>

          <div className={embedded && embeddedLayout === 'split' ? 'lg:col-span-3 flex flex-col gap-2.5 min-w-0' : 'contents'}>
          {/* 4. CORRIDOR FEED / EMPTY STATE */}
          <div className="px-2 pt-2 pb-1 flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <span className="text-xs font-semibold text-ink-muted font-rounded">
              {isFr ? 'Points de passage' : 'Checkpoints'}
            </span>
            {hasScanned && amenities.length > 0 && (
              <div className="flex items-center gap-2">
                {autoMarkMsg && (
                  <span className="text-[11px] font-rounded font-semibold text-emerald-600 dark:text-emerald-400">
                    {autoMarkMsg}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-pressed={isAutoMarkActive}
                  onClick={() => handleAutoMarkStops(25)}
                  className={`inline-flex items-center gap-1.5 min-h-[30px] px-3 py-1 rounded-full text-[11px] font-rounded font-bold transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${
                    isAutoMarkActive
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                  }`}
                  title={
                    isAutoMarkActive
                      ? isFr
                        ? 'Cliquer pour retirer les arrêts auto-marqués'
                        : 'Click to clear auto-marked stops'
                      : isFr
                      ? 'Épingle automatiquement les points d’eau ouverts tous les ~25 km et une halte café'
                      : 'Automatically pin open water taps every ~25 km and a mid-route café stop'
                  }
                >
                  <Sparkle className="w-3 h-3 shrink-0 text-current" />
                  <span>{isFr ? 'Auto-Marquer (25 km)' : 'Auto-Mark (25 km)'}</span>
                </Button>
              </div>
            )}
          </div>

          {scanError ? (
            <div className="rounded-[22px] p-4 text-center bg-rose-500/[0.1] text-rose-700 dark:text-rose-300 text-xs font-medium space-y-2 shrink-0">
              <p>{scanError}</p>
              <Button variant="ghost"
                type="button"
                onClick={() => handleScanCorridor(true)}
                className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-bold hover:brightness-105 cursor-pointer text-xs"
              >
                {isFr ? 'Réessayer le scan' : 'Retry Scan'}
              </Button>
            </div>
          ) : !hasScanned ? (
            /* Empty state card designed like the "Sync your rides" card in Settings sheet */
            <div className="rounded-[22px] p-5 bg-pod/70 dark:bg-white/[0.045] text-center flex flex-col items-center gap-3 shrink-0">
              <div className="w-12 h-12 rounded-full bg-card dark:bg-[#18181B] flex items-center justify-center text-ink shadow-xs">
                <Radar className="w-6 h-6 text-current" />
              </div>
              <p className="text-[13px] text-ink-muted max-w-sm leading-relaxed">
                {hasValidCorridorCoords
                  ? t('emptyRadarState')
                  : isFr
                  ? 'Tracez un corridor A→B ou importez un fichier GPX pour scanner les ravitaillements le long du parcours.'
                  : 'Build a Corridor A→B route or import a GPX track to scan stops along your route.'}
              </p>
              <Button variant="primary"
                type="button"
                onClick={() => handleScanCorridor(false)}
                disabled={isScanning || !hasValidCorridorCoords}
                className={`mt-1 inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-all active:scale-[0.99] shadow-xs bg-volt hover:bg-[#E2E443] text-[#111111] ring-1 ring-inset ring-black/10 ${
                  embedded ? 'w-full sm:w-auto sm:min-w-[220px] px-6 h-11' : 'w-full h-12'
                }`}
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
              </Button>
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div className="rounded-[22px] p-5 text-center text-xs text-ink-muted bg-pod/70 dark:bg-white/[0.045] shrink-0">
              {amenities.length === 0
                ? isFr
                  ? 'Aucun point d’eau, boulangerie ou atelier vélo répertorié dans OpenStreetMap le long de ce corridor (1,2 km).'
                  : 'No water taps, bakeries, or bike repair stops mapped on OpenStreetMap along this corridor (1.2 km).'
                : t('emptyFilteredRadarState')}
            </div>
          ) : (
            <div className="space-y-2 shrink-0">
              {(() => {
                const accordionGroups = [
                  {
                    id: 'water',
                    label: t('catWater'),
                    theme: 'sky' as const,
                    icon: Droplets,
                    items: filteredAmenities.filter((a) => a.category === 'water' || a.category === 'cemetery'),
                  },
                  {
                    id: 'food',
                    label: t('catFood'),
                    theme: 'amber' as const,
                    icon: Baguette,
                    items: filteredAmenities.filter((a) => a.category === 'food'),
                  },
                  {
                    id: 'mechanix',
                    label: t('catMechanix'),
                    theme: 'teal' as const,
                    icon: Wrench,
                    items: filteredAmenities.filter((a) => a.category === 'mechanix'),
                  },
                  {
                    id: 'essentials',
                    label: isFr ? 'WC / Pharm. / Carb.' : 'WC / Med / Fuel',
                    theme: 'blue' as const,
                    icon: Shield,
                    items: filteredAmenities.filter((a) => a.category === 'essentials'),
                  },
                  {
                    id: 'bailout',
                    label: isFr ? 'Gares (Repli)' : 'Train Bailout',
                    theme: 'orange' as const,
                    icon: TrainSimple,
                    items: filteredAmenities.filter((a) => a.category === 'bailout'),
                  },
                ].filter((g) => g.items.length > 0);

                return accordionGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const groupTokens = CHIP_TOKENS[group.theme];
                  const isGroupOpen =
                    accordionGroups.length === 1 || expandedCategoryGroups.has(group.id);
                  const pinnedInGroup = group.items.filter((a) => pinnedIds.has(a.id)).length;

                  return (
                    <div
                      key={group.id}
                      className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] overflow-hidden"
                    >
                      <button
                        type="button"
                        aria-expanded={isGroupOpen}
                        onClick={() =>
                          setExpandedCategoryGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(group.id)) next.delete(group.id);
                            else next.add(group.id);
                            return next;
                          })
                        }
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-pod dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${groupTokens.surface} ${groupTokens.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                          >
                            <GroupIcon className="w-3.5 h-3.5 text-current" />
                          </span>
                          <span className="font-rounded font-bold text-xs text-ink truncate">
                            {group.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-card dark:bg-black/30 text-[10px] font-bold text-ink-secondary tnum shrink-0">
                            {group.items.length}
                          </span>
                          {pinnedInGroup > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-volt text-[#111111] text-[10px] font-bold tnum shrink-0">
                              {pinnedInGroup} ★
                            </span>
                          )}
                        </div>
                        <DisclosureChevron open={isGroupOpen} />
                      </button>

                      <Collapsible open={isGroupOpen}>
                        <div className="divide-y divide-ink/[0.06] dark:divide-white/[0.06] border-t border-dashed border-ink/15 dark:border-white/10 touch-pan-y">
                          {group.items.map((amenity, idx) => {
                const isLast = idx === group.items.length - 1;
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
                const openVerdict = evaluateOpeningHoursAtArrival(
                  amenity.openingHours,
                  activeDateStr,
                  eta,
                  lang
                );
                const osmUrl = getOsmElementUrl(amenity.id);

                const categoryDetails = categoryConfig.find((c) => c.id === amenity.category);
                const tokens = CHIP_TOKENS[categoryDetails?.theme || 'sky'];
                const IconComp = categoryDetails?.icon || Droplets;

                return (
                  <div
                    key={amenity.id}
                    onClick={() => onSelectAmenity?.(amenity)}
                    className={`p-3 transition-colors cursor-pointer touch-pan-y ${
                      isLast ? 'rounded-b-[22px]' : ''
                    } ${
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
                            {openVerdict && (
                              <span
                                className={`text-[10px] font-rounded font-semibold px-1.5 py-0.5 rounded-full shrink-0 tnum ${OPENING_BADGE_CLASSES[openVerdict.status]}`}
                                title={openVerdict.detailLabel}
                              >
                                {openVerdict.badgeLabel}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-ink-muted capitalize mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{amenity.subType.replace(/_/g, ' ')}</span>
                            {osmUrl && (
                              <a
                                href={osmUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="normal-case text-[10px] font-rounded font-semibold text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                                title={isFr ? 'Voir la fiche OpenStreetMap' : 'Inspect on OpenStreetMap'}
                              >
                                OSM ↗
                              </a>
                            )}
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
                        <Button variant="ghost"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAmenity?.(amenity);
                            if (embedded) {
                              onJumpToMap?.();
                            } else {
                              onClose();
                            }
                          }}
                          className="relative before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 w-9 h-9 rounded-full bg-card dark:bg-white/[0.08] hover:bg-chip flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer transition-colors"
                          title={t('viewOnMap')}
                          aria-label={t('viewOnMap')}
                        >
                          <MapPin className="w-3.5 h-3.5 text-current" />
                        </Button>

                        {/* Pin to Ride Plan Button */}
                        <Button variant="primary"
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
                        </Button>
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
                      </Collapsible>
                    </div>
                  );
                });
              })()}

              <p className="px-2 pt-0.5 text-[10px] text-ink-muted leading-relaxed">
                {isFr
                  ? 'Source : contributeurs OpenStreetMap · Données communautaires — traitez ces arrêts comme des pistes et vérifiez les horaires avant un ravitaillement critique.'
                  : 'Source: OpenStreetMap contributors · Community-mapped data — treat stops as leads and verify hours before relying on a critical resupply.'}
              </p>
            </div>
          )}

          {/* GPX / TCX Export Readiness Bar when stops are pinned */}
          {pinnedAmenities.length > 0 && (
            <div className="rounded-[20px] bg-pod/70 dark:bg-white/[0.045] px-3.5 py-2.5 flex items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] font-rounded text-ink-secondary leading-snug">
                {t('gpxExportReadyNote')}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="primary"
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
                    {trip.stages && trip.stages.length > 1 ? 'Tour .gpx' : '.gpx'}
                  </span>
                </Button>
                <Button variant="ghost"
                  type="button"
                  onClick={() => downloadTripFit(trip)}
                  className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-full bg-ink/10 dark:bg-white/10 text-ink font-rounded font-bold text-xs shrink-0 cursor-pointer hover:bg-ink/15 dark:hover:bg-white/15 active:scale-[0.98] transition-all"
                  title={isFr ? 'Parcours .FIT avec arrêts épinglés pour Garmin Up Ahead' : 'Garmin .FIT course with pinned stops for Up Ahead'}
                >
                  <Download className="w-3.5 h-3.5 text-current" />
                  <span>.fit</span>
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* ── Footer matching Settings Bottom Sheet (modal only) ── */}
        {!embedded && (
          <>
            <div className="lane-divider mt-3" aria-hidden="true" />
            <div className="flex items-center justify-center gap-1.5 pt-2.5 pb-0.5 text-[11px] text-ink-muted tnum shrink-0">
              <span>{t('appName')}</span>
              <span aria-hidden="true">·</span>
              <span>v2.6</span>
            </div>
          </>
        )}
      </div>
  );

  if (embedded) {
    return radarContent;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-3.5 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 no-print print:hidden pointer-events-none">
      {/* ── Solid dark backdrop (NO blur effects, matching settings bottom sheet) ── */}
      <div
        className="fixed inset-0 bg-black/85 animate-apple-fade-in touch-none pointer-events-auto"
        onClick={onClose}
      />
      {radarContent}
    </div>,
    document.body
  );
};
