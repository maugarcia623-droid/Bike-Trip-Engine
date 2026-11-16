import React from 'react';
import { Button } from '@/components/arc';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs, CockpitViewMode } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes } from '../../utils/archetypeChips';
import { parseRouteFile } from '../../utils/routeFileParser';
import { fetchDemElevationProfile } from '../../services/elevationService';
import { HeroRouteCard } from './HeroRouteCard';
const RideModeOverlay = React.lazy(() =>
  import('./RideModeOverlay').then((m) => ({ default: m.RideModeOverlay }))
);
import { AtmosphereCard } from './AtmosphereCard';
import { PhysicsEngineCard } from './PhysicsEngineCard';
import { ReverseTimelineBento } from './ReverseTimelineBento';
import { getTripArchetype } from './TimelineContextualBanner';
import { PreFlightChecklistBento } from './PreFlightChecklistBento';
import { NutritionBento } from './NutritionBento';
import { StageAmenity } from '../../types/amenities';
import { ShareTelemetryModal } from '../ShareTelemetryModal';
import { FeedbackModal } from '../FeedbackModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { TourOverviewCard } from '../configurator/TourOverviewCard';
import { RideBriefCard } from './RideBriefCard';
import { buildRideBrief } from '../../utils/rideBrief';
import { SharedPlanMeta } from '../../utils/planShare';
import { getCachedRouteSectorForecast } from '../../services/routeWeatherService';
import { getLocalTodayIso } from '../../services/weatherService';
import {
  BadgeInfo,
  Calendar,
  Download,
  X,
  Compass,
  Map as MapIcon,
  CloudSun,
  Clock,
  CheckCircle2,
  ForkKnife,
  Gauge,
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
  sharedPlanBanner?: ({ name: string } & SharedPlanMeta) | null;
  onDismissSharedPlanBanner?: () => void;
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
  onDismissSharedPlanBanner,
}) => {
  const { lang, t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [isShareModalOpen, setIsShareModalOpen] = React.useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState<boolean>(false);
  const [isRideModeOpen, setIsRideModeOpen] = React.useState<boolean>(false);
  const [gpxErrorMsg, setGpxErrorMsg] = React.useState<string | null>(null);
  const [loadedAmenities, setLoadedAmenities] = React.useState<StageAmenity[]>([]);
  const [activeQuickJump, setActiveQuickJump] = React.useState<string>('bento-route');

  const getInitialBriefExpanded = React.useCallback((desktop: boolean): boolean => {
    try {
      const key = desktop ? 'cadence_ride_brief_expanded' : 'cadence_ride_brief_expanded_mobile';
      const saved = localStorage.getItem(key);
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {
      // Ignore storage errors
    }
    return desktop;
  }, []);

  const [isBriefExpanded, setIsBriefExpanded] = React.useState<boolean>(() =>
    getInitialBriefExpanded(isDesktop)
  );

  const prevIsDesktopRef = React.useRef<boolean>(isDesktop);
  React.useEffect(() => {
    if (prevIsDesktopRef.current !== isDesktop) {
      prevIsDesktopRef.current = isDesktop;
      setIsBriefExpanded(getInitialBriefExpanded(isDesktop));
    }
  }, [isDesktop, getInitialBriefExpanded]);

  const toggleBriefExpanded = React.useCallback(() => {
    setIsBriefExpanded((prev) => {
      const next = !prev;
      try {
        const key = isDesktop ? 'cadence_ride_brief_expanded' : 'cadence_ride_brief_expanded_mobile';
        localStorage.setItem(key, next ? 'true' : 'false');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [isDesktop]);

  const handleShareReceipt = React.useCallback(() => {
    if (onShareReceiptProp) {
      onShareReceiptProp();
    } else {
      setIsShareModalOpen(true);
    }
  }, [onShareReceiptProp]);

  const handleQuickJump = React.useCallback((targetId: string) => {
    setActiveQuickJump(targetId);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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

  const physicsResult = calculatePhysics(
    trip.physics,
    trip.route,
    trip.weather,
    lang,
    effectiveSpecs.ftpWatts
  );
  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const timelineResult = calculateReverseTimeline(
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
    }
  );
  const meta = getLocalizedTripMeta(trip, lang);

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
  const expeditionTotals = getExpeditionTotals(trip);

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

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 pt-2 pb-12 sm:pb-20 no-print">
      {/* ── SHARED GROUP PLAN BANNER (WHEN LOADED FROM ?plan= URL) ── */}
      {sharedPlanBanner && (
        <div
          data-testid="shared-plan-banner"
          className="mb-3.5 rounded-pod bg-card border border-volt/40 dark:border-volt/30 px-3.5 py-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-flight-deck-in"
        >
          <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold shrink-0 ${
                sharedPlanBanner.goStatus === 'GO'
                  ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                  : sharedPlanBanner.goStatus === 'CAUTION'
                  ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`
                  : `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary}`
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              {sharedPlanBanner.goStatus}
            </span>
            <div className="flex-1 min-w-0 text-xs text-ink leading-snug">
              <div className="font-rounded font-bold break-words">
                {isFr ? 'Plan de groupe partagé' : 'Shared Group Plan'} · {sharedPlanBanner.name}
              </div>
              <div className="text-ink-secondary tnum mt-0.5">
                {isFr ? 'Départ' : 'Leave by'} {sharedPlanBanner.leaveBy} → {sharedPlanBanner.arrival}
                {sharedPlanBanner.pinnedCount > 0
                  ? ` · ${sharedPlanBanner.pinnedCount} ${isFr ? 'arrêts' : 'stops'}`
                  : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={openRideBrief}
              className="h-8 px-3 rounded-full bg-volt text-[#111111] font-rounded font-bold text-xs cursor-pointer"
            >
              {isFr ? 'Ouvrir le Briefing' : 'Open Ride Brief'}
            </Button>
            {onDismissSharedPlanBanner && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={isFr ? 'Fermer' : 'Dismiss'}
                onClick={onDismissSharedPlanBanner}
                className="w-8 h-8 p-0 rounded-full text-ink-muted hover:text-ink hover:bg-pod cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── TOUR STAGE SEQUENCER BAR (WHEN MULTI-STAGE TOUR) ── */}
      {hasMultipleStages && (
        <div className="space-y-3 mb-5 animate-flight-deck-in">
          <div className="rounded-pod bg-card text-ink p-3 sm:px-4 sm:py-3 shadow-sm transition-colors">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-volt ring-4 ring-volt/25 animate-pulse" />
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

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                {trip.stages!.map((stage, idx) => {
                const isActive = idx === activeStageIdx;
                const origin = stage.route?.origin || '...';
                const dest = stage.route?.destination || '...';
                const dist = stage.route?.distanceKm || 0;

                return (
                  <Button variant="ghost"
                    key={stage.id || `stage-${idx}`}
                    type="button"
                    onClick={() => {
                      if (idx !== activeStageIdx) {
                        onUpdateTrip(switchActiveStage(trip, idx));
                      }
                    }}
                    className={`group inline-flex items-center gap-2 p-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer select-none ${
                      isActive
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} shadow-xs`
                        : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                    }`}
                  >
                    <span
                      className={`p-1 rounded-full text-[10px] leading-none font-extrabold uppercase font-rounded shrink-0 shadow-xs ${
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

                <Button variant="ghost"
                  type="button"
                  onClick={() => setShowTourOverview((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                    showTourOverview
                      ? 'bg-[#111111] text-volt ring-1 ring-inset ring-black/10 dark:bg-elevated dark:text-volt dark:ring-white/15'
                      : 'bg-pod hover:bg-chip text-ink'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {showTourOverview ? t('tourToggleDetailsHide') : t('tourToggleDetailsShow')}
                  </span>
                </Button>

                <Button variant="primary"
                  type="button"
                  onClick={() => downloadEntireTourGpx(trip)}
                  title={t('exportEntireTourGpxBtn')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-volt hover:bg-volt-lime text-[#111111] text-xs font-bold transition-all duration-150 shrink-0 cursor-pointer ring-1 ring-inset ring-black/10 dark:ring-white/10 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('exportEntireTourGpxBtn')}</span>
                </Button>
              </div>
            </div>
          </div>

          {showTourOverview && (
            <TourOverviewCard
              trip={trip}
              activeStageIdx={activeStageIdx}
              onSelectStage={(idx) => onUpdateTrip(switchActiveStage(trip, idx))}
              ftpWatts={effectiveSpecs.ftpWatts}
            />
          )}
        </div>
      )}

      {/* ── FULL-WIDTH COLLAPSIBLE RIDE BRIEF CARD ── */}
      <RideBriefCard
        trip={trip}
        physics={physicsResult}
        timeline={timelineResult}
        riderSpecs={effectiveSpecs}
        amenities={loadedAmenities}
        brief={quickBrief}
        isExpanded={isBriefExpanded}
        onToggleExpand={toggleBriefExpanded}
        onOpenTools={onOpenTools}
      />

      {/* ── 5-COLUMN BENTO COMMAND DECK (3 COLS LEFT / 2 COLS RIGHT) ── */}
      {/* On desktop (lg+), 2 independent vertical columns (3 cols left, 2 cols right) with 20px (gap-5) gutters */}
      {/* align Hero Card and Weather Card at the top and prevent row-height blank spaces when cards collapse. */}
      {isDesktop ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 items-start">
          {/* Left Column (Desktop: 3 of 5 cols) - Hero Card, Reverse Timeline & Power/Resistance */}
          <div className="lg:col-span-3 flex flex-col gap-3.5 sm:gap-4 lg:gap-5 min-w-0">
            <div id="bento-route" className="scroll-mt-3 animate-flight-deck-in deck-stagger-1 min-w-0">
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
                selectedAmenity={selectedAmenity}
                onSelectAmenity={setSelectedAmenity}
                onAmenitiesLoaded={setLoadedAmenities}
                onStartRideMode={() => setIsRideModeOpen(true)}
              />
            </div>
            <div id="bento-timeline" className="scroll-mt-3 animate-flight-deck-in deck-stagger-2 min-w-0">
              <ReverseTimelineBento
                trip={trip}
                timeline={timelineResult}
                riderSpecs={effectiveSpecs}
              />
            </div>
            <div id="bento-physics" className="scroll-mt-3 animate-flight-deck-in deck-stagger-3 min-w-0">
              <PhysicsEngineCard
                trip={trip}
                physicsResult={physicsResult}
                viewMode={viewMode}
                onToggleViewMode={handleSetViewMode}
                riderSpecs={effectiveSpecs}
              />
            </div>
          </div>

          {/* Right Column (Desktop: 2 of 5 cols) - Weather Card, Checklist & Nutrition */}
          <div className="lg:col-span-2 flex flex-col gap-3.5 sm:gap-4 lg:gap-5 min-w-0">
            <div id="bento-weather" className="scroll-mt-3 animate-flight-deck-in deck-stagger-2 min-w-0">
              <AtmosphereCard
                trip={trip}
                physicsResult={physicsResult}
                onUpdateTrip={onUpdateTrip}
                hardRolloutTime={timelineResult.hardDepartureTime}
              />
            </div>
            <div id="bento-checklist" className="scroll-mt-3 animate-flight-deck-in deck-stagger-4 min-w-0">
              <PreFlightChecklistBento
                trip={trip}
                onUpdateTrip={onUpdateTrip}
                riderSpecs={effectiveSpecs}
              />
            </div>
            <div id="bento-nutrition" className="scroll-mt-3 animate-flight-deck-in deck-stagger-5 min-w-0">
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
      ) : (
        /* Mobile Linear Stack (< 1024px) with Quick-Jump Pill Bar & 20px (gap-5) vertical spacing */
        <div className="flex flex-col gap-5 min-w-0">
          {/* Mobile Quick-Jump Pill Bar */}
          <nav
            aria-label={isFr ? 'Accès rapide aux sections' : 'Quick jump to sections'}
            data-testid="mobile-quick-jump-bar"
            className="-mx-1 px-1 -mb-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar snap-x"
          >
            {[
              { id: 'bento-route', label: isFr ? 'Carte' : 'Map', icon: MapIcon },
              { id: 'bento-weather', label: isFr ? 'Météo' : 'Weather', icon: CloudSun },
              { id: 'bento-timeline', label: isFr ? 'Horaires' : 'Timeline', icon: Clock },
              { id: 'bento-checklist', label: isFr ? 'Check-list' : 'Checklist', icon: CheckCircle2 },
              { id: 'bento-nutrition', label: isFr ? 'Ravito' : 'Fuel', icon: ForkKnife },
              { id: 'bento-physics', label: 'Stats', icon: Gauge },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeQuickJump === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickJump(item.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-full inline-flex items-center gap-1.5 text-xs font-rounded font-bold whitespace-nowrap shrink-0 snap-start transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    isActive
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : `bg-card hover:bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_UNSELECTED} shadow-xs`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* 1. Hero Route Card */}
          <div id="bento-route" className="scroll-mt-3 animate-flight-deck-in deck-stagger-1 min-w-0">
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
              selectedAmenity={selectedAmenity}
              onSelectAmenity={setSelectedAmenity}
              onAmenitiesLoaded={setLoadedAmenities}
              onStartRideMode={() => setIsRideModeOpen(true)}
            />
          </div>

          {/* 2. Weather Bento */}
          <div id="bento-weather" className="scroll-mt-3 animate-flight-deck-in deck-stagger-2">
            <AtmosphereCard
              trip={trip}
              physicsResult={physicsResult}
              onUpdateTrip={onUpdateTrip}
              hardRolloutTime={timelineResult.hardDepartureTime}
            />
          </div>

          {/* 3. Dynamic Reverse Timeline */}
          <div id="bento-timeline" className="scroll-mt-3 animate-flight-deck-in deck-stagger-3">
            <ReverseTimelineBento
              trip={trip}
              timeline={timelineResult}
              riderSpecs={effectiveSpecs}
            />
          </div>

          {/* 4. Pre-Flight Inspection Checklist */}
          <div id="bento-checklist" className="scroll-mt-3 animate-flight-deck-in deck-stagger-4">
            <PreFlightChecklistBento
              trip={trip}
              onUpdateTrip={onUpdateTrip}
              riderSpecs={effectiveSpecs}
            />
          </div>

          {/* 5. Baseline Dock: Real-Food Nutrition */}
          <div id="bento-nutrition" className="scroll-mt-3 animate-flight-deck-in deck-stagger-5">
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

          {/* 6. Telemetry Dock: Aerodynamic & Rolling Physics Engine */}
          <div id="bento-physics" className="scroll-mt-3 animate-flight-deck-in deck-stagger-6">
            <PhysicsEngineCard
              trip={trip}
              physicsResult={physicsResult}
              viewMode={viewMode}
              onToggleViewMode={handleSetViewMode}
              riderSpecs={effectiveSpecs}
            />
          </div>
        </div>
      )}

      {/* ── Cadence Bottom Telemetry / Feedback Dock Corner ── */}
      <div className="flex items-center justify-between pt-5 mt-5 text-xs text-ink-muted border-t border-dashed border-ink/10 dark:border-white/10">
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
    </div>
  );
};
