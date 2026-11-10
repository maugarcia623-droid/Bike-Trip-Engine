import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import { Badge } from '../common/Badge';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../../tokens/chipTokens';

interface ResupplyRadarBentoProps {
  trip: TripProfile;
  hardDepartureTime: string;
  effectiveSpeedKmH: number;
  onUpdateTrip: (updated: TripProfile) => void;
  selectedAmenity?: StageAmenity | null;
  onSelectAmenity?: (amenity: StageAmenity) => void;
  onAmenitiesLoaded?: (amenities: StageAmenity[]) => void;
}

const STORAGE_KEY_RADAR_COLLAPSED = 'cadence_resupply_radar_collapsed';

export const ResupplyRadarBento: React.FC<ResupplyRadarBentoProps> = ({
  trip,
  hardDepartureTime,
  effectiveSpeedKmH,
  onUpdateTrip,
  selectedAmenity,
  onSelectAmenity,
  onAmenitiesLoaded,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RADAR_COLLAPSED);
      return saved !== 'true';
    } catch {
      return true;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_RADAR_COLLAPSED, String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  const activeStage = trip.stages && trip.activeStageIndex !== undefined
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
    // Combine scanned water amenities with any pinned water stops
    const allWaterItems = [...amenities];
    for (const pinned of pinnedAmenities) {
      if (!allWaterItems.some((a) => a.id === pinned.id)) {
        allWaterItems.push(pinned);
      }
    }
    const specs = loadRiderBikeSpecs();
    const sectorSpeed = effectiveSpeedKmH || trip.route?.targetSpeedKmH || 25;
    const hydration = calculateHydrationPlan({
      rideHours: totalDistanceKm / Math.max(8, sectorSpeed),
      tempC: trip.weather?.temperatureC ?? 18,
      legWatts: 150,
      bidonSizeMl: specs.bidonSizeMl ?? 650,
      frameBottleSlots: specs.frameBottleSlots ?? 2,
    });
    return calculateWaterGaps(allWaterItems, totalDistanceKm, {
      sectorSpeedKmH: sectorSpeed,
      targetFluidMlPerHr: hydration.targetFluidMlPerHr,
      bidonSizeMl: specs.bidonSizeMl ?? 650,
      frameBottleSlots: specs.frameBottleSlots ?? 2,
    });
  }, [
    amenities,
    pinnedAmenities,
    totalDistanceKm,
    effectiveSpeedKmH,
    trip.route?.targetSpeedKmH,
    trip.weather?.temperatureC,
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

  return (
    <div className="bento-card bg-card text-ink rounded-card p-4 transition-colors duration-200 relative overflow-hidden flex flex-col shadow-xs">
      {/* ── CARD HEADER & SCAN TRIGGER ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-pod flex items-center justify-center text-ink shrink-0 mt-0.5">
            <Radar className="w-5 h-5 text-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-[17px] font-semibold font-rounded tracking-tight text-ink">
                {t('resupplyRadarTitle')}
              </h2>
              {hasScanned && (
                <Badge variant="zinc" size="xs" className="tnum">
                  {t('scannedCountBadge', { count: filteredAmenities.length })}
                </Badge>
              )}
              {pinnedAmenities.length > 0 && (
                <Badge variant="volt" size="xs" className="tnum">
                  {t('pinnedCountBadge', { count: pinnedAmenities.length })}
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-ink-muted mt-0.5 break-words leading-snug">
              {t('resupplyRadarSub')}
            </p>
          </div>
        </div>

        {/* Action button & disclosure chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleScanCorridor(hasScanned)}
            disabled={isScanning}
            className="bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold px-3 py-1.5 rounded-full text-xs cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 select-none"
            title={hasScanned ? t('reScanCorridor') : t('scanCorridor')}
          >
            {isScanning ? (
              <>
                <SpinnerGap className="w-3.5 h-3.5 animate-spin text-current shrink-0" />
                <span className="hidden sm:inline">{t('scanningCorridor')}</span>
              </>
            ) : hasScanned ? (
              <>
                <ArrowsClockwise className="w-3.5 h-3.5 text-current shrink-0" />
                <span>{t('reScanCorridor')}</span>
              </>
            ) : (
              <>
                <Radar className="w-3.5 h-3.5 text-current shrink-0" />
                <span>{t('scanCorridor')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            className="rounded-full bg-pod hover:bg-chip p-1 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
          >
            <DisclosureChevron open={isExpanded} />
          </button>
        </div>
      </div>

      {/* ── COLLAPSED SUMMARY STRIP (WHEN MINIMIZED) ── */}
      <Collapsible open={!isExpanded} innerClassName="pt-1">
        <button
          type="button"
          onClick={toggleExpanded}
          className="w-full p-2.5 px-3 rounded-pod bg-pod hover:bg-chip/60 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap tnum text-xs">
            <Badge
              variant={
                !hasScanned
                  ? 'zinc'
                  : waterGaps.status === 'clear'
                  ? 'emerald'
                  : waterGaps.status === 'caution'
                  ? 'amber'
                  : 'rose'
              }
              size="xs"
              dot
            >
              {!hasScanned
                ? isFr
                  ? 'Eau : scannez le parcours'
                  : 'Water: scan the route'
                : waterGaps.status === 'clear'
                ? isFr
                  ? `Eau : tout est prêt (max ${formatKm(waterGaps.maxGapKm, lang)} km)`
                  : `Water: all good (max ${formatKm(waterGaps.maxGapKm, lang)} km)`
                : waterGaps.status === 'caution'
                ? t('hydrationCautionShort', { gap: formatKm(waterGaps.maxGapKm, lang) })
                : t('hydrationCriticalShort', { gap: formatKm(waterGaps.maxGapKm, lang) })}
            </Badge>

            <span className="text-ink-secondary font-medium">
              {filteredAmenities.length} POIs &middot; {pinnedAmenities.length}{' '}
              {isFr ? 'épinglés' : 'pinned'}
            </span>
          </div>
          <span className="text-xs font-rounded font-semibold text-ink-secondary shrink-0">
            {isFr ? 'Ouvrir radar' : 'Expand radar'}
          </span>
        </button>
      </Collapsible>

      {/* ── EXPANDED RADAR CONTENT ── */}
      <Collapsible open={isExpanded} innerClassName="space-y-3 pt-1">
        {/* ── 1. BEACON WATER DESERT / DRY-GAP ALERTS ── */}
        {hasScanned && (
          <div>
            {waterGaps.status === 'critical' ? (
              <div className="rounded-pod p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/40 flex items-start gap-2.5 shadow-beacon-red transition-all">
                <TriangleAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs min-w-0 space-y-1">
                  <span className="font-bold font-rounded block">
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
              <div className="rounded-pod p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/40 flex items-start gap-2.5 shadow-beacon-amber transition-all">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs min-w-0 space-y-1">
                  <span className="font-bold font-rounded block">
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
              <div className="rounded-pod p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30 flex items-center gap-2 transition-all">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium font-rounded">
                  {t('hydrationStatusGo', { maxGap: formatKm(waterGaps.maxGapKm, lang) })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 2. MATERIAL DESIGN 32PX CATEGORY CHIPS & DETOUR TOGGLE ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                : 'bg-pod text-ink-muted hover:text-ink hover:bg-chip ring-1 ring-inset ring-ink/10 dark:ring-white/10'
            }`}
          >
            <span>{t('radarDetourOnly')}</span>
          </button>
        </div>

        {/* ── 3. CORRIDOR HORIZON BAR (0 -> TOTAL KM) ── */}
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2 tnum">
            <span>{t('corridorHorizonTitle', { total: totalDistanceKm })}</span>
            <span>{filteredAmenities.length} POIs</span>
          </div>

          <div className="relative w-full h-3 bg-well rounded-full overflow-hidden flex items-center">
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
                    className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-volt ring-2 ring-[#4d5200] z-20 hover:scale-125 transition-transform cursor-pointer shadow-beacon-volt"
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

        {/* ── 4. TACTICAL CORRIDOR FEED & PINNING ── */}
        {scanError ? (
          <div className="rounded-pod p-4 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs font-medium space-y-2">
            <p>{scanError}</p>
            <button
              type="button"
              onClick={() => handleScanCorridor(true)}
              className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold hover:brightness-105 cursor-pointer text-xs"
            >
              {isFr ? 'Réessayer le scan' : 'Retry Scan'}
            </button>
          </div>
        ) : !hasScanned ? (
          <div className="rounded-pod p-6 text-center bg-pod/60 space-y-3">
            <div className="w-10 h-10 rounded-full bg-card mx-auto flex items-center justify-center text-ink-secondary">
              <Radar className="w-5 h-5 text-current" />
            </div>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              {t('emptyRadarState')}
            </p>
            <button
              type="button"
              onClick={() => handleScanCorridor(false)}
              disabled={isScanning}
              className="bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold px-4 py-2 rounded-full text-xs cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center gap-2 shadow-xs"
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
          <div className="rounded-pod p-5 text-center text-xs text-ink-muted">
            {t('emptyFilteredRadarState')}
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-1.5 no-scrollbar">
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
                  className={`rounded-sub-pod p-2.5 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-pod ring-2 ring-inset ring-ink/20 dark:ring-white/30 shadow-xs'
                      : 'bg-chip/50 hover:bg-chip'
                  }`}
                >
                  {/* Left: Category Icon & Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tokens.surface} ${tokens.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <IconComp className="w-4 h-4 text-current" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-rounded font-bold text-xs sm:text-[13px] text-ink break-words leading-tight">
                          {amenity.name}
                        </span>
                        {amenity.openingHours && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-ink-muted shrink-0 hidden sm:inline"
                            title={amenity.openingHours}
                          >
                            {amenity.openingHours.length > 15
                              ? `${amenity.openingHours.slice(0, 15)}...`
                              : amenity.openingHours}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-ink-muted capitalize">
                        {amenity.subType.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Right: Telemetry Cluster & Pin CTA */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium font-rounded bg-card text-ink-secondary tnum">
                          {t('detourDist', { detour: amenity.detourMeters })}
                        </span>
                      )}
                    </div>

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
                          : 'bg-card text-ink-secondary hover:text-ink hover:bg-pod ring-1 ring-inset ring-ink/10 dark:ring-white/10'
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
      </Collapsible>
    </div>
  );
};
