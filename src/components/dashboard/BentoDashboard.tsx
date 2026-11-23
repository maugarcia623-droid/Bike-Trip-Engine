import React from 'react';
import { Button } from '@/components/arc';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs, CockpitViewMode } from '../../types/specs';
import { loadRiderBikeSpecs, getActiveBike, getEffectiveRiderSpecs } from '../../utils/specsStorage';
import { calculatePhysics, buildPhysicsEnvironmentContext } from '../../utils/physics';
import { useOsmSurface } from '../../services/osmSurfaceService';
import { computeSurfaceBreakdown } from '../../utils/surfaceProfile';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes } from '../../utils/archetypeChips';
import { parseRouteFile } from '../../utils/routeFileParser';
import { fetchDemElevationProfile } from '../../services/elevationService';
import { HeroRouteCard } from './HeroRouteCard';
const RideModeOverlay = React.lazy(() =>
  import('./RideModeOverlay').then((m) => ({ default: m.RideModeOverlay }))
);
const GpxStageSlicerModal = React.lazy(() =>
  import('../tour/GpxStageSlicerModal').then((m) => ({ default: m.GpxStageSlicerModal }))
);
import { LongRouteChoiceModal } from '../tour/LongRouteChoiceModal';
import { suggestDayCount } from '../../utils/gpxSlicer';
import { AtmosphereCard } from './AtmosphereCard';
import { PhysicsEngineCard } from './PhysicsEngineCard';
import { ReverseTimelineBento } from './ReverseTimelineBento';
import { getTripArchetype } from './TimelineContextualBanner';
import { PreFlightChecklistBento } from './PreFlightChecklistBento';
import { NutritionBento } from './NutritionBento';
import { AmenityCategory, StageAmenity } from '../../types/amenities';
import { ShareTelemetryModal } from '../ShareTelemetryModal';
import { FeedbackModal } from '../FeedbackModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Collapsible } from '../common/Collapsible';
import { TourOverviewCard } from '../configurator/TourOverviewCard';
import { RideBriefCard } from './RideBriefCard';
import { ResupplyRadarOverlay } from './ResupplyRadarOverlay';
import { PartnerAdaptBanner, GroupSyncCheckPod } from './PartnerSyncCard';
import { buildRideBrief } from '../../utils/rideBrief';
import {
  buildPlanShareUrl,
  computeGroupSyncCheck,
  SenderBaseline,
  SharedPlanMeta,
} from '../../utils/planShare';
import { getCachedRouteSectorForecast } from '../../services/routeWeatherService';
import { getLocalTodayIso } from '../../services/weatherService';
import {
  calculateWaterGaps,
  getCachedScan,
  getRouteHashKey,
} from '../../services/overpassCorridor';
import {
  BadgeInfo,
  Banana,
  Calendar,
  CheckCircle2,
  Download,
  Link2,
  X,
  CloudSun,
  Clock,
  GridCirclesCheck,
  Mountain,
  Radar,
  Route,
  SlidersHorizontal,
} from '@/components/icons';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { switchActiveStage, getExpeditionTotals } from '../../utils/stageManager';
import { downloadEntireTourGpx } from '../../utils/gpxExporter';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../../tokens/chipTokens';

interface BentoDashboardProps {
  trip: TripProfile;
  onUpdateTrip: (updated: TripProfile) => void;
  onToggleHeadwind: () => void;
  onPrint: () => void;
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  riderSpecs?: RiderBikeSpecs;
  onUpdateRiderSpecs?: (updated: RiderBikeSpecs) => void;
  onSelectBike?: (bikeId: string) => void;
  onOpenSpecs?: () => void;
  onOpenConfigurator?: () => void;
  isRideBriefOpen?: boolean;
  onOpenRideBrief?: () => void;
  onCloseRideBrief?: () => void;
  onOpenTools?: (tab?: 'wind' | 'leave-by' | 'pressure') => void;
  sharedPlanBanner?: ({ name: string; needsPersonalization?: boolean } & SharedPlanMeta) | null;
  onApplyPartnerPersonalization?: (nextSpecs: RiderBikeSpecs, luggageWeightKg: number) => void;
  onDismissSharedPlanBanner?: () => void;
  autoOpenSlicer?: boolean;
  onAutoOpenSlicerConsumed?: () => void;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = (e?: MediaQueryListEvent) => {
      setIsDesktop(e ? e.matches : media.matches);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  trip,
  onUpdateTrip,
  onPrint,
  onShareReceipt: onShareReceiptProp,
  onOpenFeedback,
  riderSpecs,
  onUpdateRiderSpecs,
  onSelectBike,
  onOpenSpecs,
  onOpenConfigurator,
  isRideBriefOpen: externalRideBriefOpen,
  onOpenRideBrief,
  onCloseRideBrief,
  onOpenTools,
  sharedPlanBanner,
  onApplyPartnerPersonalization,
  onDismissSharedPlanBanner,
  autoOpenSlicer,
  onAutoOpenSlicerConsumed,
}) => {
  const { lang, t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [isShareModalOpen, setIsShareModalOpen] = React.useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState<boolean>(false);
  const [isRideModeOpen, setIsRideModeOpen] = React.useState<boolean>(false);
  const [isSlicerOpen, setIsSlicerOpen] = React.useState<boolean>(false);
  const [isLongRouteChoiceOpen, setIsLongRouteChoiceOpen] = React.useState<boolean>(false);
  const [slicerInitialDays, setSlicerInitialDays] = React.useState<number | undefined>(undefined);
  const [dismissedSlicerBannerTripId, setDismissedSlicerBannerTripId] = React.useState<string | null>(null);
  const [gpxErrorMsg, setGpxErrorMsg] = React.useState<string | null>(null);
  const [loadedAmenities, setLoadedAmenities] = React.useState<StageAmenity[]>([]);
  const [activeRadarCategories, setActiveRadarCategories] = React.useState<Set<AmenityCategory>>(
    () => new Set<AmenityCategory>(['water', 'cemetery', 'food', 'mechanix', 'essentials', 'bailout'])
  );

  const openStageSlicer = React.useCallback((days?: number) => {
    setSlicerInitialDays(days);
    setIsSlicerOpen(true);
  }, []);

  React.useEffect(() => {
    if (!autoOpenSlicer) return;
    const canSlice =
      Boolean(trip.route.coordinates && trip.route.coordinates.length >= 2) &&
      (trip.route.distanceKm >= 10 || (trip.stages && trip.stages.length > 1));
    if (canSlice) {
      setIsLongRouteChoiceOpen(true);
    }
    onAutoOpenSlicerConsumed?.();
  }, [autoOpenSlicer, trip.route.coordinates, trip.route.distanceKm, trip.stages, onAutoOpenSlicerConsumed]);
  const [activeLayer2Tab, setActiveLayer2Tab] = React.useState<
    'schedule' | 'resupply' | 'fuel-packing' | 'weather-physics'
  >('schedule');
  const [dashboardLayout, setDashboardLayout] = React.useState<'tabs' | 'all'>(() => {
    try {
      return localStorage.getItem('cadence_dashboard_layout_v1') === 'all' ? 'all' : 'tabs';
    } catch {
      return 'tabs';
    }
  });

  const handleToggleDashboardLayout = React.useCallback(() => {
    setDashboardLayout((prev) => {
      const next = prev === 'tabs' ? 'all' : 'tabs';
      try {
        localStorage.setItem('cadence_dashboard_layout_v1', next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const [isBriefExpanded, setIsBriefExpanded] = React.useState<boolean>(true);

  const toggleBriefExpanded = React.useCallback(() => {
    setIsBriefExpanded((prev) => !prev);
  }, []);

  const handleShareReceipt = React.useCallback(() => {
    if (onShareReceiptProp) {
      onShareReceiptProp();
    } else {
      setIsShareModalOpen(true);
    }
  }, [onShareReceiptProp]);

  const handleJumpToSection = React.useCallback(
    (sectionId: string) => {
      if (dashboardLayout === 'tabs') {
        if (sectionId === 'bento-timeline') setActiveLayer2Tab('schedule');
        else if (sectionId === 'bento-resupply') setActiveLayer2Tab('resupply');
        else if (sectionId === 'bento-nutrition' || sectionId === 'bento-checklist') {
          setActiveLayer2Tab('fuel-packing');
        } else if (sectionId === 'bento-weather' || sectionId === 'bento-physics') {
          setActiveLayer2Tab('weather-physics');
        }
      }
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 20;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }, 60);
    },
    [dashboardLayout]
  );

  React.useEffect(() => {
    if (!externalRideBriefOpen) return;
    setIsBriefExpanded(true);
    try {
      const key = isDesktop ? 'cadence_ride_brief_expanded' : 'cadence_ride_brief_expanded_mobile';
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore storage errors
    }
    const target = document.getElementById('ride-brief-card');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onCloseRideBrief?.();
  }, [externalRideBriefOpen, onCloseRideBrief, isDesktop]);

  const openRideBrief = () => {
    setIsBriefExpanded(true);
    try {
      const key = isDesktop ? 'cadence_ride_brief_expanded' : 'cadence_ride_brief_expanded_mobile';
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore storage errors
    }
    const target = document.getElementById('ride-brief-card');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (onOpenRideBrief) {
      onOpenRideBrief();
    }
  };
  const [selectedAmenity, setSelectedAmenity] = React.useState<StageAmenity | null>(null);
  const [showTourOverview, setShowTourOverview] = React.useState<boolean>(false);
  const effectiveSpecs = riderSpecs || loadRiderBikeSpecs();
  const viewMode: CockpitViewMode = effectiveSpecs.cockpitViewMode ?? 'essential';

  const handleSetViewMode = (mode: CockpitViewMode) => {
    if (onUpdateRiderSpecs) {
      onUpdateRiderSpecs({
        ...effectiveSpecs,
        cockpitViewMode: mode,
      });
    }
  };

  const handleUploadGpxInCockpit = async (file: File) => {
    try {
      const parsed = await parseRouteFile(file);
      const avgGradePct =
        parsed.distanceKm > 0
          ? Number(((parsed.elevationGainM / (parsed.distanceKm * 1000)) * 100).toFixed(2))
          : 0;
      onUpdateTrip({
        ...trip,
        updatedAt: new Date().toISOString(),
        physics: {
          ...trip.physics,
          gradientPercent: Math.min(8, Math.max(0, avgGradePct * 0.35)),
        },
        route: {
          ...trip.route,
          routeMode: 'gpx',
          gpxFileName: file.name,
          origin: parsed.originLabel,
          destination: parsed.destLabel,
          distanceKm: parsed.distanceKm,
          elevationGainM: parsed.elevationGainM,
          elevationLossM: parsed.elevationLossM,
          coordinates: parsed.coordinates,
          elevationProfile: parsed.elevationProfile,
          terrainSummary: parsed.terrainSummary,
          radiusMeters: undefined,
        },
      });
      if (parsed.distanceKm >= 180 && parsed.coordinates.length >= 2) {
        setIsLongRouteChoiceOpen(true);
      }
    } catch (err) {
      setGpxErrorMsg(
        lang === 'fr'
          ? `Impossible de lire ce fichier GPX : ${(err as Error).message}`
          : `Could not parse GPX file: ${(err as Error).message}`
      );
    }
  };

  const activeStageIdx = Math.max(
    0,
    Math.min(trip.activeStageIndex ?? 0, (trip.stages?.length || 1) - 1)
  );
  const activeStage =
    trip.stages && trip.stages.length > 0 ? trip.stages[activeStageIdx] : undefined;

  const failedDemKeysRef = React.useRef<Set<string>>(new Set());
  const latestTripRef = React.useRef<TripProfile>(trip);
  latestTripRef.current = trip;

  React.useEffect(() => {
    const route = trip.route;
    const coords = route?.coordinates;
    if (
      !route ||
      route.routeMode !== 'corridor' ||
      !coords ||
      coords.length < 2 ||
      (route.elevationProfile && route.elevationProfile.length >= 3)
    ) {
      return;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const key = `${trip.id}:${route.routeMode}:${coords.length}:${first[0].toFixed(4)},${first[1].toFixed(4)}-${last[0].toFixed(4)},${last[1].toFixed(4)}`;
    if (failedDemKeysRef.current.has(key)) {
      return;
    }

    let cancelled = false;
    fetchDemElevationProfile(coords, route.distanceKm).then((dem) => {
      if (cancelled) return;
      if (!dem) {
        failedDemKeysRef.current.add(key);
        return;
      }
      const currentTrip = latestTripRef.current;
      const curCoords = currentTrip.route?.coordinates;
      if (
        !curCoords ||
        curCoords.length < 2 ||
        currentTrip.id !== trip.id ||
        currentTrip.route.routeMode !== 'corridor'
      ) {
        return;
      }
      const curFirst = curCoords[0];
      const curLast = curCoords[curCoords.length - 1];
      const curKey = `${currentTrip.id}:${currentTrip.route.routeMode}:${curCoords.length}:${curFirst[0].toFixed(4)},${curFirst[1].toFixed(4)}-${curLast[0].toFixed(4)},${curLast[1].toFixed(4)}`;
      if (curKey !== key) return;

      const updatedRoute = {
        ...currentTrip.route,
        elevationProfile: dem.elevationProfile,
        elevationGainM: dem.elevationGainM,
        elevationLossM: dem.elevationLossM,
        terrainSummary: undefined,
      };
      let updatedStages = currentTrip.stages;
      if (currentTrip.stages && currentTrip.stages.length > 0) {
        const sIdx = Math.max(
          0,
          Math.min(currentTrip.activeStageIndex ?? 0, currentTrip.stages.length - 1)
        );
        updatedStages = currentTrip.stages.map((st, i) =>
          i === sIdx ? { ...st, route: { ...st.route, ...updatedRoute } } : st
        );
      }

      onUpdateTrip({
        ...currentTrip,
        route: updatedRoute,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    trip.id,
    trip.route?.routeMode,
    trip.route?.coordinates,
    trip.route?.elevationProfile,
    trip.route?.distanceKm,
    onUpdateTrip,
  ]);

  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const activeBike = React.useMemo(() => getActiveBike(effectiveSpecs), [effectiveSpecs]);
  const canQueryOsmSurface =
    trip.route.routeMode !== 'manual-radius' &&
    Boolean(trip.route.coordinates && trip.route.coordinates.length >= 2);
  const { osmData } = useOsmSurface(
    trip.route.coordinates,
    trip.route.distanceKm,
    canQueryOsmSurface
  );
  const surfaceBreakdown = React.useMemo(
    () =>
      osmData
        ? computeSurfaceBreakdown(trip.route, {
            crr: trip.physics.crr ?? activeBike?.crr,
            tireWidthMm: activeBike?.tireWidthMm,
            isTubeless: activeBike?.isTubeless ?? true,
            riderWeightKg: trip.physics.riderWeightKg,
            bikeWeightKg: trip.physics.bikeWeightKg,
            luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg,
            customChips: trip.customChips ?? [],
            osmData,
          })
        : null,
    [
      trip.route,
      trip.physics.crr,
      trip.physics.riderWeightKg,
      trip.physics.bikeWeightKg,
      trip.physics.luggageWeightKg,
      trip.physics.gearWeightKg,
      trip.customChips,
      activeBike?.crr,
      activeBike?.tireWidthMm,
      activeBike?.isTubeless,
      osmData,
    ]
  );
  const physicsEnvContext = React.useMemo(
    () =>
      buildPhysicsEnvironmentContext(trip, {
        surfaceBreakdown,
        isTubeless: activeBike?.isTubeless,
        departureDate: activeStage?.departureDate || trip.departureDate,
        extraBufferMinutes,
      }),
    [
      trip,
      surfaceBreakdown,
      activeBike?.isTubeless,
      activeStage?.departureDate,
      extraBufferMinutes,
    ]
  );

  const physicsResult = React.useMemo(
    () =>
      calculatePhysics(
        trip.physics,
        trip.route,
        trip.weather,
        lang,
        effectiveSpecs.ftpWatts,
        physicsEnvContext
      ),
    [trip.physics, trip.route, trip.weather, lang, effectiveSpecs.ftpWatts, physicsEnvContext]
  );
  const timelineResult = React.useMemo(
    () =>
      calculateReverseTimeline(
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
          movingTimeSeconds: physicsResult.movingTimeSeconds,
          logistics: trip.ruleSettings,
          pinnedAmenities: trip.pinnedAmenities,
          departureDate: activeStage?.departureDate || trip.departureDate,
          isMultiDayTour: Boolean(trip.stages && trip.stages.length > 1),
        }
      ),
    [
      trip.route,
      trip.office,
      trip.weather,
      trip.tag,
      lang,
      extraBufferMinutes,
      trip.customChips,
      physicsResult.effectiveSpeedKmH,
      physicsResult.calmSpeedKmH,
      physicsResult.movingTimeSeconds,
      trip.arriveAtMode,
      trip.departureTime,
      trip.ruleSettings,
      trip.pinnedAmenities,
      activeStage?.departureDate,
      trip.departureDate,
    ]
  );
  const meta = React.useMemo(() => getLocalizedTripMeta(trip, lang), [trip, lang]);

  const archetype = getTripArchetype(trip.tag, trip.name);
  const isSport = archetype === 'sport';
  const isBikepacking = archetype === 'bikepacking';
  const isEscapade = archetype === 'escapade';

  const heroBadge = isSport
    ? t('heroBadgeSport')
    : isBikepacking
    ? t('heroBadgeBikepacking')
    : isEscapade
    ? t('heroBadgeEscapade')
    : t('heroBadgeCommute');

  const heroTarget = isEscapade
    ? t('heroTargetEscapade', { dest: trip.route.destination || 'Clisson' })
    : isSport
    ? t('heroTargetSport', {
        dest: trip.route.destination || 'Finish',
        time: timelineResult.gateArrivalTime,
      })
    : isBikepacking
    ? t('heroTargetBikepacking', {
        dest: trip.route.destination || 'Camp',
        time: timelineResult.gateArrivalTime,
      })
    : `${meta.gateName} · ${timelineResult.gateArrivalTime}`;

  const heroTargetLabel = isEscapade
    ? t('heroTargetLabelEscapade')
    : isSport
    ? t('heroTargetLabelSport')
    : isBikepacking
    ? t('heroTargetLabelBikepacking')
    : t('heroTargetLabelCommute');

  const heroTargetValue =
    isEscapade || isSport || isBikepacking
      ? timelineResult.gateArrivalTime
      : timelineResult.shiftStartTime;

  const isFr = lang === 'fr';
  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const expeditionTotals = React.useMemo(() => getExpeditionTotals(trip), [trip]);

  const briefDate =
    trip.stages?.[trip.activeStageIndex ?? 0]?.departureDate ||
    trip.departureDate ||
    getLocalTodayIso();
  const briefRollout = timelineResult.hardDepartureTime || trip.departureTime || '08:00';
  const briefSectorCache = getCachedRouteSectorForecast(trip, briefDate, briefRollout, lang);
  const quickBrief = React.useMemo(
    () =>
      buildRideBrief({
        trip,
        physics: physicsResult,
        timeline: timelineResult,
        riderSpecs: effectiveSpecs,
        sectorForecast: briefSectorCache,
        amenities: loadedAmenities,
        lang,
      }),
    [trip, physicsResult, timelineResult, effectiveSpecs, briefSectorCache, loadedAmenities, lang]
  );

  const resupplyBadge = React.useMemo(() => {
    const coords = trip.route?.coordinates;
    const dist = trip.route?.distanceKm || 45;
    const stageId = activeStage?.id || trip.id;
    const cacheKey = coords && coords.length >= 2 ? getRouteHashKey(coords, stageId, dist) : '';
    const cached = cacheKey ? getCachedScan(cacheKey) : undefined;
    const sourceAmenities = loadedAmenities.length > 0 ? loadedAmenities : cached || [];
    if (sourceAmenities.length > 0) {
      const gaps = calculateWaterGaps(sourceAmenities, dist, {
        bidonSizeMl: effectiveSpecs.bidonSizeMl || 650,
        sectorSpeedKmH: physicsResult.effectiveSpeedKmH,
        frameBottleSlots: effectiveSpecs.frameBottleSlots || 2,
      });
      if (gaps.criticalGaps.length > 0) {
        const count = gaps.criticalGaps.length;
        return {
          text: isFr
            ? `${count} zone${count > 1 ? 's' : ''} sèche${count > 1 ? 's' : ''}`
            : `${count} dry gap${count > 1 ? 's' : ''}`,
          tone: 'critical' as const,
        };
      }
      if (gaps.cautionGaps.length > 0) {
        const count = gaps.cautionGaps.length;
        return {
          text: isFr
            ? `${count} zone${count > 1 ? 's' : ''} sèche${count > 1 ? 's' : ''}`
            : `${count} dry gap${count > 1 ? 's' : ''}`,
          tone: 'caution' as const,
        };
      }
    }
    const pinnedCount = trip.pinnedAmenities?.length || 0;
    if (pinnedCount > 0) {
      return {
        text: `${pinnedCount}`,
        tone: 'neutral' as const,
      };
    }
    return null;
  }, [
    trip.route?.coordinates,
    trip.route?.distanceKm,
    trip.id,
    trip.pinnedAmenities?.length,
    activeStage?.id,
    loadedAmenities,
    effectiveSpecs.bidonSizeMl,
    effectiveSpecs.frameBottleSlots,
    physicsResult.effectiveSpeedKmH,
  ]);

  const [copiedTourLink, setCopiedTourLink] = React.useState(false);

  const senderBaseline = React.useMemo<SenderBaseline>(() => {
    const eff = getEffectiveRiderSpecs(effectiveSpecs);
    return {
      name: effectiveSpecs.riderName?.trim() || (isFr ? 'Partenaire' : 'Partner'),
      riderWeightKg: trip.physics.riderWeightKg ?? eff.riderWeightKg,
      bikeWeightKg: trip.physics.bikeWeightKg ?? activeBike.weightKg,
      luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0,
      cda: trip.physics.cda ?? activeBike.cda,
      crr: trip.physics.crr ?? activeBike.crr,
      ftpWatts: eff.ftpWatts,
      bikeName: activeBike.name,
      bikeCategory: activeBike.bikeCategory,
    };
  }, [effectiveSpecs, activeBike, trip.physics, isFr]);

  const groupSyncCheck = React.useMemo(() => {
    if (!sharedPlanBanner?.senderBaseline) return null;
    return computeGroupSyncCheck(
      trip,
      sharedPlanBanner.senderBaseline,
      effectiveSpecs,
      timelineResult.hardDepartureTime || trip.departureTime || '08:00',
      lang === 'fr' ? 'fr' : 'en'
    );
  }, [sharedPlanBanner?.senderBaseline, trip, effectiveSpecs, timelineResult.hardDepartureTime, lang]);

  const handleAdoptGroupSpeed = React.useCallback(
    (nextSpeedKmH: number) => {
      const updatedStages = trip.stages?.map((st, idx) =>
        idx === activeStageIdx
          ? { ...st, route: { ...st.route, targetSpeedKmH: nextSpeedKmH, pacingMode: 'speed' as const } }
          : st
      );
      onUpdateTrip({
        ...trip,
        updatedAt: new Date().toISOString(),
        route: {
          ...trip.route,
          targetSpeedKmH: nextSpeedKmH,
          pacingMode: 'speed',
        },
        ...(updatedStages ? { stages: updatedStages } : {}),
      });
    },
    [trip, activeStageIdx, onUpdateTrip]
  );

  const handleCopyTourShareLink = React.useCallback(async () => {
    const shareUrl = buildPlanShareUrl(trip, {
      leaveByHHMM: quickBrief.leaveByHHMM,
      arrivalHHMM: quickBrief.arrivalHHMM,
      goStatus: quickBrief.verdict,
      bikeName: quickBrief.bikeName,
      senderBaseline,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedTourLink(true);
      window.setTimeout(() => setCopiedTourLink(false), 2400);
    } catch {
      window.prompt(isFr ? 'Copiez le lien du tour :' : 'Copy tour link:', shareUrl);
    }
  }, [trip, quickBrief, senderBaseline, isFr]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 pt-2 pb-28 sm:pb-28 no-print">
      {/* ── SHARED GROUP PLAN / 10-SECOND PARTNER ADAPTATION (WHEN LOADED FROM ?plan= URL) ── */}
      {sharedPlanBanner && (
        <PartnerAdaptBanner
          sharedPlanBanner={sharedPlanBanner}
          riderSpecs={effectiveSpecs}
          lang={lang === 'fr' ? 'fr' : 'en'}
          onApplyPersonalization={(nextSpecs, luggageWeightKg) => {
            if (onApplyPartnerPersonalization) {
              onApplyPartnerPersonalization(nextSpecs, luggageWeightKg);
            } else {
              onUpdateRiderSpecs?.(nextSpecs);
            }
          }}
          onOpenSpecs={onOpenSpecs}
          onDismiss={onDismissSharedPlanBanner}
        />
      )}

      {/* ── SMART SINGLE-DAY LONG ROUTE MULTI-DAY SLICER NUDGE ── */}
      {!hasMultipleStages &&
        trip.route.coordinates &&
        trip.route.coordinates.length >= 2 &&
        trip.route.distanceKm >= 115 &&
        dismissedSlicerBannerTripId !== trip.id && (() => {
          const suggestedDays = suggestDayCount(
            trip.route.distanceKm,
            trip.route.elevationGainM || 0
          );
          const quickDayChoices = Array.from(
            new Set([
              Math.max(2, suggestedDays - 1),
              suggestedDays,
              Math.min(10, suggestedDays + 1),
            ])
          ).sort((a, b) => a - b);

          return (
            <div
              data-testid="multi-day-slicer-banner"
              className="mb-4 rounded-pod bg-card border border-black/8 dark:border-white/10 px-3.5 py-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-flight-deck-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-volt text-[#111111] flex items-center justify-center shrink-0">
                  <Route className="w-4 h-4" />
                </span>
                <div className="min-w-0 text-xs leading-snug">
                  <div className="font-rounded font-bold text-ink">
                    {isFr
                      ? `Trace longue de ${Math.round(trip.route.distanceKm)} km sur 1 seul jour`
                      : `${Math.round(trip.route.distanceKm)} km single-day track detected`}
                  </div>
                  <div className="text-ink-muted">
                    {isFr
                      ? 'Découpez votre trace Komoot / GPX en étapes équilibrées avec bivouacs et GPX par jour.'
                      : 'Slice your Komoot / GPX trace into balanced daily stages with overnight stops & per-day GPX.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {quickDayChoices.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => openStageSlicer(days)}
                    className={`h-8 px-3 rounded-full text-xs font-bold font-rounded tnum transition-all cursor-pointer ${
                      days === suggestedDays
                        ? 'bg-volt text-[#111111] hover:bg-volt-lime ring-1 ring-inset ring-black/10'
                        : 'bg-pod hover:bg-chip text-ink'
                    }`}
                  >
                    {days} {isFr ? 'j' : 'd'}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => openStageSlicer(suggestedDays)}
                  className="h-8 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold font-rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>{isFr ? 'Découper' : 'Open Slicer'}</span>
                </Button>
                <button
                  type="button"
                  aria-label={isFr ? 'Masquer' : 'Dismiss'}
                  onClick={() => setDismissedSlicerBannerTripId(trip.id)}
                  className="w-8 h-8 rounded-full text-ink-muted hover:text-ink hover:bg-pod flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── UNIFIED MULTI-STAGE TOUR CARD (SINGLE CARD, ROUNDED-CARD, NO DROP SHADOW) ── */}
      {hasMultipleStages && (
        <div className="mb-5 rounded-card bg-card text-ink transition-colors animate-flight-deck-in overflow-hidden">
          <div className="p-4 sm:px-5 sm:py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left: Mountain icon matching Configurator Tour button + Totals */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="w-8 h-8 rounded-full bg-volt text-[#111111] flex items-center justify-center shrink-0">
                  <Mountain className="w-4 h-4 shrink-0" />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-[13px] font-bold text-ink tracking-tight font-rounded tnum">
                    {isFr
                      ? `Tour · ${expeditionTotals.totalDays} jours · ${expeditionTotals.totalDistanceKm} km`
                      : `Tour · ${expeditionTotals.totalDays} days · ${expeditionTotals.totalDistanceKm} km`}
                  </span>
                  <span className="text-[11px] font-medium text-ink-muted tnum hidden sm:inline">
                    (+{expeditionTotals.totalElevationM} m)
                  </span>
                </div>
              </div>

              {/* Middle + Right: Scrollable Stage Pills with Right Opacity Mask + Actions (Hide timeline far right) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0 flex-1 lg:justify-end">
                <div className="relative min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pl-0 pr-10 sm:pl-6 py-0.5">
                    {trip.stages!.map((stage, idx) => {
                      const isActive = idx === activeStageIdx;
                      const origin = stage.route?.origin || '...';
                      const dest = stage.route?.destination || '...';
                      const dist = stage.route?.distanceKm || 0;

                      return (
                        <Button
                          variant="ghost"
                          key={stage.id || `stage-${idx}`}
                          type="button"
                          onClick={() => {
                            if (idx !== activeStageIdx) {
                              onUpdateTrip(switchActiveStage(trip, idx));
                            }
                          }}
                          className={`group inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer select-none ${
                            isActive
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                              : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                          }`}
                        >
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] leading-none font-extrabold uppercase font-rounded shrink-0 ${
                              isActive
                                ? 'bg-volt text-[#111111]'
                                : 'bg-card text-ink-secondary group-hover:text-ink'
                            }`}
                          >
                            {t('stageDayPill', { day: stage.dayNumber })}
                          </span>
                          <span className="whitespace-nowrap font-medium min-w-0">
                            {origin} → {dest}
                          </span>
                          <span
                            className={`text-[11px] font-bold tnum shrink-0 ${
                              isActive
                                ? 'text-[#4d5200] dark:text-[#dfff00]'
                                : 'text-ink-muted group-hover:text-ink-secondary'
                            }`}
                          >
                            {dist} km
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  {/* Left & right opacity gradient masks signaling horizontal scroll */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-card via-card/85 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card via-card/85 to-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={handleCopyTourShareLink}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[34px] px-3 py-1.5 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer"
                  >
                    {copiedTourLink ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {copiedTourLink
                        ? isFr
                          ? 'Lien copié !'
                          : 'Copied!'
                        : isFr
                        ? 'Partager'
                        : 'Share'}
                    </span>
                  </Button>

                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => openStageSlicer(undefined)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[34px] px-3 py-1.5 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>{isFr ? 'Coupes' : 'Edit cuts'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => downloadEntireTourGpx(trip)}
                    title={t('exportEntireTourGpxBtn')}
                    className={`order-4 sm:order-3 col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 shrink-0 cursor-pointer active:scale-95 ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} hover:brightness-95 dark:hover:brightness-110`}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('exportEntireTourGpxBtn')}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setShowTourOverview((prev) => !prev)}
                    className={`order-3 sm:order-4 col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                      showTourOverview
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : 'bg-pod hover:bg-chip text-ink'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {showTourOverview ? t('tourToggleDetailsHide') : t('tourToggleDetailsShow')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Collapsible
            open={showTourOverview}
            id="tour-overview-panel"
            innerClassName="border-t border-black/6 dark:border-white/8"
          >
            <TourOverviewCard
              trip={trip}
              activeStageIdx={activeStageIdx}
              onSelectStage={(idx) => onUpdateTrip(switchActiveStage(trip, idx))}
              hideHeaderActions
              embedded
              ftpWatts={effectiveSpecs.ftpWatts}
            />
          </Collapsible>
        </div>
      )}

      {/* ── LAYER 1: 5-SECOND GLANCE (HERO MAP + EXPANDED RIDE BRIEF SIDECAR) ── */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 mb-5 ${
          isBriefExpanded ? 'lg:items-stretch' : 'lg:items-start'
        }`}
      >
        <div
          id="bento-route"
          className="lg:col-span-3 flex flex-col cadence-map-host scroll-mt-3 animate-flight-deck-in deck-stagger-1 min-w-0"
        >
          <HeroRouteCard
            trip={trip}
            physicsResult={physicsResult}
            timelineResult={timelineResult}
            meta={meta}
            heroBadge={heroBadge}
            heroTarget={heroTarget}
            heroTargetLabel={heroTargetLabel}
            heroTargetValue={heroTargetValue}
            onUpdateTrip={onUpdateTrip}
            riderSpecs={effectiveSpecs}
            onSelectBike={onSelectBike}
            onOpenSpecs={onOpenSpecs}
            onOpenConfigurator={onOpenConfigurator}
            onUploadGpxFile={handleUploadGpxInCockpit}
            onPrint={onPrint}
            onShareReceipt={handleShareReceipt}
            amenities={loadedAmenities}
            visibleAmenityCategories={activeRadarCategories}
            onVisibleAmenityCategoriesChange={setActiveRadarCategories}
            selectedAmenity={selectedAmenity}
            onSelectAmenity={setSelectedAmenity}
            onAmenitiesLoaded={setLoadedAmenities}
            onStartRideMode={() => setIsRideModeOpen(true)}
            onOpenStageSlicer={() => openStageSlicer(undefined)}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col min-w-0 animate-flight-deck-in deck-stagger-2">
          <RideBriefCard
            trip={trip}
            physics={physicsResult}
            timeline={timelineResult}
            riderSpecs={effectiveSpecs}
            amenities={loadedAmenities}
            brief={quickBrief}
            isExpanded={isBriefExpanded}
            onToggleExpand={toggleBriefExpanded}
            layout={isDesktop ? 'sidecar' : 'full'}
            senderBaseline={senderBaseline}
            partnerSyncSlot={
              groupSyncCheck ? (
                <GroupSyncCheckPod
                  sync={groupSyncCheck}
                  lang={lang === 'fr' ? 'fr' : 'en'}
                  onAdoptGroupSpeed={handleAdoptGroupSpeed}
                />
              ) : undefined
            }
            onOpenTools={onOpenTools}
            onUpdateTrip={onUpdateTrip}
            onSelectBike={onSelectBike}
            onOpenSpecs={onOpenSpecs}
            onOpenConfigurator={onOpenConfigurator}
            onJumpToSection={handleJumpToSection}
          />
        </div>
      </div>

      {/* ── LAYER 2: DEEP-DIVE WORKSPACE (SHOW ALL ON LEFT + 1-LINE 4-TAB SWITCHER) ── */}
      <div className="flex flex-row items-center gap-2 mb-4 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleToggleDashboardLayout}
          data-testid="toggle-dashboard-layout"
          className="inline-flex items-center gap-1.5 h-[46px] px-4 rounded-full bg-card hover:bg-pod text-ink-secondary hover:text-ink text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <GridCirclesCheck className="w-3.5 h-3.5 shrink-0" />
          <span>
            {dashboardLayout === 'tabs'
              ? isFr
                ? 'Tout afficher'
                : 'Show all cards'
              : isFr
              ? 'Vue par onglets'
              : 'Tabbed view'}
          </span>
        </Button>

        {dashboardLayout === 'tabs' ? (
          <div
            role="tablist"
            aria-label={isFr ? 'Sections détaillées du plan' : 'Ride plan sections'}
            data-testid="layer2-tab-bar"
            className="inline-flex items-center gap-1 p-1.5 h-[46px] rounded-full bg-card shadow-xs overflow-x-auto no-scrollbar flex-1 min-w-0 sm:flex-initial sm:max-w-full"
          >
            {(
              [
                { id: 'schedule' as const, label: isFr ? 'Horaires' : 'Schedule', icon: Clock },
                { id: 'resupply' as const, label: isFr ? 'Eau & Ravito' : 'Resupply & Water', icon: Radar },
                { id: 'fuel-packing' as const, label: isFr ? 'Nutrition & Check-list' : 'Fuel & Packing', icon: Banana },
                { id: 'weather-physics' as const, label: isFr ? 'Météo & Physique' : 'Weather & Physics', icon: CloudSun },
              ] as const
            ).map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeLayer2Tab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveLayer2Tab(tab.id)}
                  className={`inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-full text-xs font-rounded font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    isActive
                      ? `${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : 'ring-0 border-0 text-ink-secondary hover:text-ink hover:bg-pod'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{tab.label}</span>
                  {tab.id === 'resupply' && resupplyBadge && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-extrabold tnum ${
                        resupplyBadge.tone === 'critical'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : resupplyBadge.tone === 'caution'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          : 'bg-ink/10 dark:bg-white/15 text-ink'
                      }`}
                    >
                      {resupplyBadge.text}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-rounded font-bold uppercase tracking-wider text-ink-muted px-2 truncate">
            {isFr ? 'Vue complète' : 'All Ride Plan Cards'}
          </div>
        )}
      </div>

      {dashboardLayout === 'tabs' ? (
        <div className="min-w-0">
          {activeLayer2Tab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start animate-apple-step-in">
              <div id="bento-timeline" className="lg:col-span-3 scroll-mt-3 min-w-0">
                <ReverseTimelineBento
                  trip={trip}
                  timeline={timelineResult}
                  riderSpecs={effectiveSpecs}
                />
              </div>
              <div id="bento-weather" className="lg:col-span-2 scroll-mt-3 min-w-0">
                <AtmosphereCard
                  trip={trip}
                  physicsResult={physicsResult}
                  onUpdateTrip={onUpdateTrip}
                  hardRolloutTime={timelineResult.hardDepartureTime}
                />
              </div>
            </div>
          )}

          {activeLayer2Tab === 'resupply' && (
            <div id="bento-resupply" className="scroll-mt-3 animate-apple-step-in min-w-0">
              <ResupplyRadarOverlay
                embedded
                embeddedLayout="split"
                isOpen
                onClose={() => {}}
                trip={trip}
                hardDepartureTime={timelineResult.hardDepartureTime}
                effectiveSpeedKmH={physicsResult.effectiveSpeedKmH}
                legWatts={physicsResult.legWatts}
                onUpdateTrip={onUpdateTrip}
                selectedAmenity={selectedAmenity}
                onSelectAmenity={setSelectedAmenity}
                onAmenitiesLoaded={setLoadedAmenities}
                activeCategories={activeRadarCategories}
                onActiveCategoriesChange={setActiveRadarCategories}
                onJumpToMap={() => handleJumpToSection('bento-route')}
              />
            </div>
          )}

          {activeLayer2Tab === 'fuel-packing' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start animate-apple-step-in">
              <div id="bento-nutrition" className="lg:col-span-3 scroll-mt-3 min-w-0">
                <NutritionBento
                  trip={trip}
                  hardDepartureTime={timelineResult.hardDepartureTime}
                  gateArrivalTime={timelineResult.gateArrivalTime}
                  physicsResult={physicsResult}
                  riderSpecs={effectiveSpecs}
                  onOpenSpecs={onOpenSpecs}
                  onUpdateTrip={onUpdateTrip}
                />
              </div>
              <div id="bento-checklist" className="lg:col-span-2 scroll-mt-3 min-w-0">
                <PreFlightChecklistBento
                  trip={trip}
                  onUpdateTrip={onUpdateTrip}
                  riderSpecs={effectiveSpecs}
                />
              </div>
            </div>
          )}

          {activeLayer2Tab === 'weather-physics' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start animate-apple-step-in">
              <div id="bento-physics" className="lg:col-span-3 scroll-mt-3 min-w-0">
                <PhysicsEngineCard
                  trip={trip}
                  physicsResult={physicsResult}
                  viewMode={viewMode}
                  onToggleViewMode={handleSetViewMode}
                  riderSpecs={effectiveSpecs}
                />
              </div>
              <div id="bento-weather" className="lg:col-span-2 scroll-mt-3 min-w-0">
                <AtmosphereCard
                  trip={trip}
                  physicsResult={physicsResult}
                  onUpdateTrip={onUpdateTrip}
                  hardRolloutTime={timelineResult.hardDepartureTime}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Show All Cards: 2 independent vertical columns (3 left / 2 right) — zero row-height voids, zero over-stretched cards */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 items-start min-w-0">
          <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-5 min-w-0">
            <div id="bento-timeline" className="scroll-mt-3 min-w-0">
              <ReverseTimelineBento
                trip={trip}
                timeline={timelineResult}
                riderSpecs={effectiveSpecs}
              />
            </div>
            <div id="bento-resupply" className="scroll-mt-3 min-w-0">
              <ResupplyRadarOverlay
                embedded
                embeddedLayout="stacked"
                isOpen
                onClose={() => {}}
                trip={trip}
                hardDepartureTime={timelineResult.hardDepartureTime}
                effectiveSpeedKmH={physicsResult.effectiveSpeedKmH}
                legWatts={physicsResult.legWatts}
                onUpdateTrip={onUpdateTrip}
                selectedAmenity={selectedAmenity}
                onSelectAmenity={setSelectedAmenity}
                onAmenitiesLoaded={setLoadedAmenities}
                activeCategories={activeRadarCategories}
                onActiveCategoriesChange={setActiveRadarCategories}
                onJumpToMap={() => handleJumpToSection('bento-route')}
              />
            </div>
            <div id="bento-physics" className="scroll-mt-3 min-w-0">
              <PhysicsEngineCard
                trip={trip}
                physicsResult={physicsResult}
                viewMode={viewMode}
                onToggleViewMode={handleSetViewMode}
                riderSpecs={effectiveSpecs}
              />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-5 min-w-0">
            <div id="bento-weather" className="scroll-mt-3 min-w-0">
              <AtmosphereCard
                trip={trip}
                physicsResult={physicsResult}
                onUpdateTrip={onUpdateTrip}
                hardRolloutTime={timelineResult.hardDepartureTime}
              />
            </div>
            <div id="bento-checklist" className="scroll-mt-3 min-w-0">
              <PreFlightChecklistBento
                trip={trip}
                onUpdateTrip={onUpdateTrip}
                riderSpecs={effectiveSpecs}
              />
            </div>
            <div id="bento-nutrition" className="scroll-mt-3 min-w-0">
              <NutritionBento
                trip={trip}
                hardDepartureTime={timelineResult.hardDepartureTime}
                gateArrivalTime={timelineResult.gateArrivalTime}
                physicsResult={physicsResult}
                riderSpecs={effectiveSpecs}
                onOpenSpecs={onOpenSpecs}
                onUpdateTrip={onUpdateTrip}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Cadence Bottom Telemetry / Feedback Dock Corner ── */}
      <div className="flex items-center justify-between pt-5 mt-5 text-xs text-ink-muted border-t border-dashed border-ink/20 dark:border-white/15">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volt-lime animate-pulse" />
          <span className="font-rounded font-medium text-xs">{t('feedbackFooterDock')}</span>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={onOpenFeedback || (() => setIsFeedbackModalOpen(true))}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-rounded font-semibold transition-all cursor-pointer ${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} hover:brightness-[0.98] dark:hover:brightness-110 shadow-xs hover:shadow-sm`}
          title={t('sendFeedbackBtn')}
        >
          <BadgeInfo size={15} className="w-4 h-4 shrink-0 text-current" />
          <span>{t('sendFeedbackBtn')}</span>
        </Button>
      </div>

      {/* ── Sortie Telemetry Share Receipt Modal ── */}
      <ShareTelemetryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trip={trip}
        physicsResult={physicsResult}
        leaveByHHMM={timelineResult.hardDepartureTime}
        arrivalHHMM={timelineResult.gateArrivalTime}
      />

      {/* ── Cadence Feedback Modal ── */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        tripName={trip.name}
      />

      {/* ── GPX Error Dialog ── */}
      <ConfirmModal
        isOpen={Boolean(gpxErrorMsg)}
        title={isFr ? 'Impossible d’exporter le tracé' : 'Could not export route'}
        description={gpxErrorMsg ?? ''}
        confirmLabel={isFr ? 'Compris' : 'OK'}
        isAlertOnly
        onClose={() => setGpxErrorMsg(null)}
        onConfirm={() => setGpxErrorMsg(null)}
      />

      {/* ── In-Ride "Ride Mode" HUD Overlay ── */}
      {isRideModeOpen && (
        <React.Suspense fallback={null}>
          <RideModeOverlay
            trip={trip}
            physicsResult={physicsResult}
            riderSpecs={effectiveSpecs}
            loadedAmenities={loadedAmenities}
            onClose={() => setIsRideModeOpen(false)}
          />
        </React.Suspense>
      )}

      {/* ── Long Route Setup Choice Prompt ("Cut it for me" vs "Let me fine-tune") ── */}
      <LongRouteChoiceModal
        isOpen={isLongRouteChoiceOpen}
        trip={trip}
        onCutForMe={(suggestedDays) => {
          setIsLongRouteChoiceOpen(false);
          openStageSlicer(suggestedDays);
        }}
        onFineTune={() => {
          setIsLongRouteChoiceOpen(false);
          onOpenConfigurator?.();
        }}
        onKeepSingleDay={() => {
          setIsLongRouteChoiceOpen(false);
        }}
      />

      {/* ── Full-Canvas Multi-Day GPX Stage Slicer ── */}
      {isSlicerOpen && (
        <React.Suspense fallback={null}>
          <GpxStageSlicerModal
            isOpen={isSlicerOpen}
            trip={trip}
            riderSpecs={effectiveSpecs}
            initialDays={slicerInitialDays}
            onClose={() => setIsSlicerOpen(false)}
            onApply={(updatedTrip) => {
              onUpdateTrip(updatedTrip);
              if (updatedTrip.stages && updatedTrip.stages.length > 1) {
                setShowTourOverview(true);
              }
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};
