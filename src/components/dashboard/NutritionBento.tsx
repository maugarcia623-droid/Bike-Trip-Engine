import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ForkKnife,
  Compass,
  Coffee,
  AppleLogo,
  Lightning,
  Package,
  Flame,
  Trophy,
  Mountains,
  Wine,
  Droplets,
  TriangleAlert,
  Clock,
  Check,
  MapPin,
} from '@/components/icons';
import { Card } from '../common/Card';
import { Badge, BadgeVariant } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';
import {
  TripProfile,
  PhysicsCalculationResult,
  NutritionItem,
  LogisticsSettings,
  PreRideStyle,
  TimelineAnchorMode,
} from '../../types/trip';
import { RiderBikeSpecs, TelemetryMode, formatFuelTarget } from '../../types/specs';
import { useTranslation } from '../../context/LanguageContext';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { resolveCompliantPantry } from '../../data/pantryCatalog';
import { solveTripTimeline, SolvedTripTimeline } from '../../utils/timeline';
import {
  getRealFoodNutritionPlan,
  calculateDynamicCarbTarget,
  calculateIntensityModulatedCarbTarget,
  calculateHydrationPlan,
  resolveEffectiveFuelSplit,
  getBottomUpPortionCounts,
  MEDJOOL_DATE,
  FRUIT_CHEW_PIECE,
  ENERGY_GEL_UNIT,
} from '../../utils/nutrition';
import {
  calculateWaterGaps,
  getRouteHashKey,
  getCachedScan,
} from '../../services/overpassCorridor';
import { DEFAULT_CORRIDOR } from './HeroRouteCard';

interface NutritionBentoProps {
  trip: TripProfile;
  hardDepartureTime?: string;
  gateArrivalTime?: string;
  physicsResult?: PhysicsCalculationResult;
  riderSpecs?: RiderBikeSpecs;
  onOpenSpecs?: () => void;
  onUpdateTrip?: (updated: TripProfile) => void;
}

interface NutritionPhaseSpec {
  id: string;
  icon: React.ElementType;
  theme: ChipTheme;
  /** Short stage/phase badge label shown alongside the phase number */
  stageLabel: string;
  /** Timing window pill on the right (e.g. "T − 45m", "En route", "Arrival") */
  timingLabel: string;
  timingVariant: BadgeVariant;
  /** Headline macro summary pill on the right */
  macroHeadline: string;
  macroIcon?: React.ElementType;
  macroTheme: ChipTheme;
  /** Full descriptive title inside the phase */
  title: string;
  /** Detailed protocol guidance split into scannable bullets when expanded */
  body: string;
  items?: NutritionItem[];
  liquidShiftPill?: string;
}

function splitIntoBullets(text: string): string[] {
  const parts = text
    .split(/(?<=[.!])\s+(?=[A-ZÀ-ÖØ-Ý0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

export const NutritionBento: React.FC<NutritionBentoProps> = ({
  trip,
  hardDepartureTime,
  gateArrivalTime,
  physicsResult,
  riderSpecs: riderSpecsProp,
  onOpenSpecs,
  onUpdateTrip,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const mode = getArchetypeFromTag(trip.tag, trip.name);
  const isEscapade = mode === 'ESCAPADE';
  const isSport = mode === 'SPORT';
  const isBikepacking = mode === 'BIKEPACKING';

  // Logistics & Single-Anchor Timeline Settings (Phase 5)
  const [localLogistics, setLocalLogistics] = useState<LogisticsSettings>(() => ({
    preRideStyle: trip.ruleSettings?.preRideStyle ?? 'full-breakfast',
    hasDestinationFridge: trip.ruleSettings?.hasDestinationFridge ?? true,
    splitPostRideRecovery: trip.ruleSettings?.splitPostRideRecovery ?? Boolean(trip.customChips?.includes('shower-locker')),
    timelineAnchorMode: trip.ruleSettings?.timelineAnchorMode ?? (mode === 'COMMUTE' ? 'arrive-by' : 'depart-at'),
    anchorTimeHHMM: trip.ruleSettings?.anchorTimeHHMM ?? (mode === 'COMMUTE' ? (gateArrivalTime || trip.office?.targetGateArrivalTime || '08:30') : (hardDepartureTime || trip.departureTime || '07:35')),
    stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel ?? (isFr ? 'Destination / Vestiaire' : 'Destination / Locker'),
    stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel ?? (isFr ? 'Salle de Pause / Bureau' : 'Break Room / Workspace'),
    coffeeDurationMin: trip.ruleSettings?.coffeeDurationMin ?? 15,
    cafeName: trip.ruleSettings?.cafeName,
    rationType: trip.ruleSettings?.rationType,
  }));

  useEffect(() => {
    setLocalLogistics({
      preRideStyle: trip.ruleSettings?.preRideStyle ?? 'full-breakfast',
      hasDestinationFridge: trip.ruleSettings?.hasDestinationFridge ?? true,
      splitPostRideRecovery: trip.ruleSettings?.splitPostRideRecovery ?? Boolean(trip.customChips?.includes('shower-locker')),
      timelineAnchorMode: trip.ruleSettings?.timelineAnchorMode ?? (mode === 'COMMUTE' ? 'arrive-by' : 'depart-at'),
      anchorTimeHHMM: trip.ruleSettings?.anchorTimeHHMM ?? (mode === 'COMMUTE' ? (gateArrivalTime || trip.office?.targetGateArrivalTime || '08:30') : (hardDepartureTime || trip.departureTime || '07:35')),
      stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel ?? (isFr ? 'Destination / Vestiaire' : 'Destination / Locker'),
      stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel ?? (isFr ? 'Salle de Pause / Bureau' : 'Break Room / Workspace'),
      coffeeDurationMin: trip.ruleSettings?.coffeeDurationMin ?? 15,
      cafeName: trip.ruleSettings?.cafeName,
      rationType: trip.ruleSettings?.rationType,
    });
  }, [trip.id, trip.ruleSettings, mode, gateArrivalTime, hardDepartureTime, isFr]);

  const handleUpdateLogistics = useCallback((partial: Partial<LogisticsSettings>) => {
    setLocalLogistics((prev) => {
      const updated = { ...prev, ...partial };
      if (onUpdateTrip) {
        onUpdateTrip({
          ...trip,
          ruleSettings: {
            ...trip.ruleSettings,
            ...updated,
          },
        });
      }
      return updated;
    });
  }, [trip, onUpdateTrip]);

  // Reactive rider gut absorption & telemetry philosophy settings
  const riderSpecs = riderSpecsProp || loadRiderBikeSpecs();
  const dietaryFilters = riderSpecs.dietaryFilters || [];
  const telemetryMode: TelemetryMode = riderSpecs.telemetryMode ?? 'quantitative';
  const isQuantitative = telemetryMode === 'quantitative';
  const isFuelFirst = telemetryMode === 'fuel-first';
  const isIntuitive = telemetryMode === 'intuitive';

  const carbTarget = riderSpecs.carbTargetGPerHr || 60;
  const nutPref = riderSpecs.nutritionPreference || 'real-food';

  const prefBadgeLabel =
    nutPref === 'real-food'
      ? isFr
        ? 'Vrai Aliment'
        : 'Real Food'
      : nutPref === 'mixed'
      ? isFr
        ? 'Mixte'
        : 'Mixed Fuel'
      : isFr
      ? 'Gels & Iso'
      : 'Gels & Iso';
  void onOpenSpecs;

  const activeChips = trip.customChips || [];
  const distance = trip.route?.distanceKm || 35;
  const estimatedBurnKcal = Math.round(
    physicsResult?.totalKcalBurn && physicsResult.totalKcalBurn > 0
      ? physicsResult.totalKcalBurn
      : Math.round(distance * 28)
  ).toLocaleString(isFr ? 'fr-FR' : 'en-US');

  const totalDays = trip.stages?.length || 1;
  const currentDay = (trip.activeStageIndex || 0) + 1;

  const movingMinutes = Math.max(
    5,
    Math.round(
      (physicsResult?.movingTimeSeconds ||
        (distance / Math.max(10, trip.route?.targetSpeedKmH || 25)) * 3600) / 60
    )
  );
  const isShortRide = movingMinutes < 45 && totalDays <= 1;

  // Phase 7: Sweat-Driven Hydration Solver
  const bidonSizeMl = riderSpecs.bidonSizeMl ?? 650;
  const frameBottleSlots = riderSpecs.frameBottleSlots ?? 2;
  const hydrationPlan = useMemo(
    () =>
      calculateHydrationPlan({
        rideHours: movingMinutes / 60,
        tempC: trip.weather?.temperatureC ?? 18,
        legWatts: physicsResult?.legWatts ?? 150,
        bidonSizeMl,
        frameBottleSlots,
        isShortRide,
        activeChips,
      }),
    [
      movingMinutes,
      trip.weather?.temperatureC,
      physicsResult?.legWatts,
      bidonSizeMl,
      frameBottleSlots,
      isShortRide,
      activeChips,
    ]
  );
  const recommendedBidons = hydrationPlan.totalBidonsNeeded;
  const hydrationBadgeLabel =
    hydrationPlan.plannedRefillBidons > 0
      ? isFr
        ? `${hydrationPlan.carriedOnFrameBidons}x ${bidonSizeMl}ml + ${hydrationPlan.plannedRefillBidons} recharge${hydrationPlan.plannedRefillBidons > 1 ? 's' : ''}`
        : `${hydrationPlan.carriedOnFrameBidons}x ${bidonSizeMl}ml + ${hydrationPlan.plannedRefillBidons} refill${hydrationPlan.plannedRefillBidons > 1 ? 's' : ''}`
      : `${hydrationPlan.carriedOnFrameBidons}x ${bidonSizeMl}ml`;
  void recommendedBidons;

  // Single-Anchor Deterministic Timeline Solver (INP-20 upgrade)
  const solvedTimeline = useMemo(() => {
    const movingSecs = physicsResult?.movingTimeSeconds || movingMinutes * 60;
    return solveTripTimeline(movingSecs, activeChips, localLogistics);
  }, [physicsResult?.movingTimeSeconds, movingMinutes, activeChips, localLogistics]);

  // Fridge-compliant pantry resolution
  const compliantPantry = useMemo(
    () => resolveCompliantPantry(riderSpecs, { hasDestinationFridge: localLogistics.hasDestinationFridge }),
    [riderSpecs, localLogistics.hasDestinationFridge]
  );

  const resolvedPostRidePantry =
    !localLogistics.hasDestinationFridge && compliantPantry.postRide.requiresFridge
      ? resolveCompliantPantry(riderSpecs, { hasDestinationFridge: false }).postRide
      : compliantPantry.postRide;

  // Intensity-modulated carbohydrate target (EQ-13 upgrade)
  const pctFtp = physicsResult?.ftpPercent ?? 72;
  const powerZoneLabel = physicsResult?.powerZone || 'Z2';
  const dynamicCarb = calculateIntensityModulatedCarbTarget({
    rideHours: movingMinutes / 60,
    pctFtp,
    carbOxidationGramPerHour:
      physicsResult?.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
    gutCeilingGPerHr: carbTarget,
    totalDays,
    activeChips,
  });
  const recommendedGPerHr = dynamicCarb.recommendedGPerHr;
  const effectiveCeilingGPerHr = dynamicCarb.effectiveCeilingGPerHr;
  const targetOnBikeCarbsG = dynamicCarb.targetOnBikeCarbsG;
  const pacingTier = dynamicCarb.pacingTier;
  const isEmergencySurge = pctFtp > 105;

  const [showFullProtocol, setShowFullProtocol] = useState(false);
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({});
  const [manifestOpen, setManifestOpen] = useState<boolean>(false);
  const toggleManifest = useCallback(() => setManifestOpen((prev) => !prev), []);

  useEffect(() => {
    setShowFullProtocol(false);
    setOpenPhases({});
    setManifestOpen(false);
  }, [trip.id]);

  const togglePhase = useCallback((idx: number) => {
    setOpenPhases((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Fuel Delivery & Palate Strategy (Phase 9)
  const fuelSplit = resolveEffectiveFuelSplit({
    rideHours: movingMinutes / 60,
    pctFtp,
    tempC: trip.weather?.temperatureC ?? 18,
    liquidCarbRatio: riderSpecs.liquidCarbRatio,
    autoModulateLiquidInHeatOrEffort: riderSpecs.autoModulateLiquidInHeatOrEffort,
    enableSavoryPalateResets: riderSpecs.enableSavoryPalateResets,
  });

  const liquidShiftPill = fuelSplit.isLiquidShifted
    ? isFr
      ? `Glucides liquides majorés (+${fuelSplit.liquidShiftPct}%)`
      : `Liquid-shifted (+${fuelSplit.liquidShiftPct}%)`
    : undefined;

  // Water desert radar sectional gap analysis (Phase 8)
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
  const cachedAmenities = useMemo(() => {
    return getCachedScan(routeCacheKey) || [];
  }, [routeCacheKey]);

  const waterGaps = useMemo(() => {
    const allWaterItems = [...cachedAmenities];
    if (trip.pinnedAmenities) {
      for (const pinned of trip.pinnedAmenities) {
        if (!allWaterItems.some((a) => a.id === pinned.id)) {
          allWaterItems.push(pinned);
        }
      }
    }
    const sectorSpeed = physicsResult?.effectiveSpeedKmH || trip.route?.targetSpeedKmH || 25;
    return calculateWaterGaps(allWaterItems, totalDistanceKm, {
      sectorSpeedKmH: sectorSpeed,
      targetFluidMlPerHr: hydrationPlan.targetFluidMlPerHr,
      bidonSizeMl,
      frameBottleSlots,
    });
  }, [cachedAmenities, trip.pinnedAmenities, totalDistanceKm, physicsResult?.effectiveSpeedKmH, trip.route?.targetSpeedKmH, hydrationPlan.targetFluidMlPerHr, bidonSizeMl, frameBottleSlots]);

  // Fetch structured nutrition plan items with quantitative & portion labels
  const planPhases = getRealFoodNutritionPlan(
    solvedTimeline.arrivalTimeHHMM,
    solvedTimeline.postRideMealWindow?.split(' – ')[0] ?? '08:50',
    solvedTimeline.departureTimeHHMM,
    lang,
    {
      carbTargetGPerHr: carbTarget,
      rideHours: movingMinutes / 60,
      nutritionPreference: nutPref,
      pctFtp,
      carbOxidationGramPerHour:
        physicsResult?.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
      totalDays,
      activeChips,
      compliantPantry,
      logistics: localLogistics,
      solvedTimeline,
      tempC: trip.weather?.temperatureC ?? 18,
      legWatts: physicsResult?.legWatts ?? 150,
      bidonSizeMl,
      frameBottleSlots,
      hydrationPlan,
      fuelSplit,
    }
  );

  const onBikePhase = planPhases.find((p) => p.phaseId === 'on-bike');
  const onBikeItems = onBikePhase?.items || [];
  const actualAllocatedCarbsG = onBikeItems.reduce((sum, item) => sum + item.carbsGrams, 0);

  // Exact snacks badge matching card item count in fuel-first mode
  const actualFuelUnits = formatFuelTarget(actualAllocatedCarbsG, 'fuel-first', lang);
  const fuelUnitsPerHour = Math.max(1, Math.round(recommendedGPerHr / 20));

  // Supportive pacing label for Fuel-First mode
  const supportivePacingLabel =
    pacingTier === 'light-cruising'
      ? t('nutriPacingLightCruising')
      : pacingTier === 'steady-endurance'
      ? t('nutriPacingSteadyEndurance')
      : t('nutriPacingHighOutput');

  // Unified Phase 2 On-Bike macro headline
  const onBikeMacroHeadline = isQuantitative
    ? isEmergencySurge
      ? t('nutriEmergencySurge', { carbs: recommendedGPerHr })
      : recommendedGPerHr === effectiveCeilingGPerHr
      ? t('nutriMaxGutCeiling', { carbs: recommendedGPerHr })
      : t('nutriQuantTargetPace', {
          carbs: recommendedGPerHr,
          zone: powerZoneLabel,
          cap: carbTarget,
        })
    : `${actualFuelUnits} (~${fuelUnitsPerHour} ${isFr ? 'unités/h' : 'units/h'})`;

  // Unified on-bike pacing badge according to telemetryMode
  const renderPacingBadge = (defaultVariant: BadgeVariant = 'yellow-vest') => {
    if (isIntuitive) {
      return (
        <Badge variant="lime" size="md" dot className="py-1.5 px-3">
          {t('nutriIntuitiveCadenceCue')}
        </Badge>
      );
    }

    if (isFuelFirst) {
      const fuelFirstText = isFr
        ? `${fuelUnitsPerHour} ${fuelUnitsPerHour > 1 ? 'unités' : 'unité'} / h · ${supportivePacingLabel}`
        : `${fuelUnitsPerHour} Fuel Units / hr · ${supportivePacingLabel}`;
      return (
        <Badge variant={defaultVariant} size="md" dot className="py-1.5 px-3 tnum">
          {fuelFirstText}
        </Badge>
      );
    }

    // Quantitative mode
    if (isEmergencySurge) {
      return (
        <>
          <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
            {t('nutriEmergencySurge', { carbs: recommendedGPerHr })}
          </Badge>
          <Badge variant="red" size="md" icon={TriangleAlert} className="py-1.5 px-3">
            {t('nutriSwitchToEffortCaution')}
          </Badge>
        </>
      );
    }

    if (recommendedGPerHr === effectiveCeilingGPerHr) {
      return (
        <Badge variant={defaultVariant} size="md" dot className="py-1.5 px-3 tnum">
          {t('nutriMaxGutCeiling', { carbs: recommendedGPerHr })}
        </Badge>
      );
    }

    return (
      <Badge variant={defaultVariant} size="md" dot className="py-1.5 px-3 tnum">
        {t('nutriQuantTargetPace', {
          carbs: recommendedGPerHr,
          zone: powerZoneLabel,
          cap: carbTarget,
        })}
      </Badge>
    );
  };

  const renderLogisticsControlBar = () => {
    const updateLogistics = handleUpdateLogistics;
    const isArriveBy = localLogistics.timelineAnchorMode === 'arrive-by';
    const activeRollout = localLogistics.preRideStyle;

    return (
      <div className="rounded-pod bg-pod mb-3 border border-ink/5 dark:border-white/5 p-3 sm:p-3.5 space-y-2.5 transition-colors">
        {/* Top Row: Anchor Toggle & Time Input & Live Timeline Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-sub-pod bg-card p-0.5 border border-ink/5 dark:border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => updateLogistics({ timelineAnchorMode: 'arrive-by' })}
                className={`px-2.5 py-1 rounded-sub-pod transition-all cursor-pointer ${
                  isArriveBy
                    ? 'bg-ink text-paper dark:bg-white dark:text-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t('logisticsArriveBy')}
              </button>
              <button
                type="button"
                onClick={() => updateLogistics({ timelineAnchorMode: 'depart-at' })}
                className={`px-2.5 py-1 rounded-sub-pod transition-all cursor-pointer ${
                  !isArriveBy
                    ? 'bg-ink text-paper dark:bg-white dark:text-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t('logisticsDepartAt')}
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-sub-pod border border-ink/5 dark:border-white/5 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <input
                type="time"
                value={localLogistics.anchorTimeHHMM || (isArriveBy ? '08:30' : '07:35')}
                onChange={(e) => {
                  if (e.target.value) {
                    updateLogistics({ anchorTimeHHMM: e.target.value });
                  }
                }}
                className="bg-transparent text-ink font-bold focus:outline-none cursor-pointer"
                aria-label={t('logisticsAnchorLabel')}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary font-mono flex-wrap">
            {isArriveBy ? (
              <Badge variant="zinc" size="sm" className="tnum">
                {isFr ? 'Départ' : 'Rollout'} <strong className="ml-1 text-ink">{solvedTimeline.departureTimeHHMM}</strong>
              </Badge>
            ) : (
              <Badge variant="zinc" size="sm" className="tnum">
                {isFr ? 'Arrivée' : 'Arrival'} <strong className="ml-1 text-ink">{solvedTimeline.arrivalTimeHHMM}</strong>
              </Badge>
            )}
            <span className="text-[10px] text-ink-muted">
              ({solvedTimeline.movingMin}m {isFr ? 'vélo' : 'ride'}{solvedTimeline.dwellMin > 0 ? ` + ${solvedTimeline.dwellMin}m pause` : ''})
            </span>
          </div>
        </div>

        {/* Second Row: Rollout Style & Pre-Ride Window */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mr-1">
              {t('logisticsRolloutLabel')}:
            </span>
            <button
              type="button"
              onClick={() => updateLogistics({ preRideStyle: 'full-breakfast' })}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                activeRollout === 'full-breakfast'
                  ? 'bg-ink text-paper dark:bg-white dark:text-ink shadow-xs'
                  : 'bg-card text-ink-secondary border border-ink/5 dark:border-white/5 hover:border-ink/20'
              }`}
            >
              {t('logisticsFullMeal')}
            </button>
            <button
              type="button"
              onClick={() => updateLogistics({ preRideStyle: 'light-liquid' })}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                activeRollout === 'light-liquid'
                  ? 'bg-ink text-paper dark:bg-white dark:text-ink shadow-xs'
                  : 'bg-card text-ink-secondary border border-ink/5 dark:border-white/5 hover:border-ink/20'
              }`}
            >
              {t('logisticsLightLiquid')}
            </button>
            <button
              type="button"
              onClick={() => updateLogistics({ preRideStyle: 'fasted-rollout' })}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                activeRollout === 'fasted-rollout'
                  ? 'bg-ink text-paper dark:bg-white dark:text-ink shadow-xs'
                  : 'bg-card text-ink-secondary border border-ink/5 dark:border-white/5 hover:border-ink/20'
              }`}
            >
              {t('logisticsFasted')}
            </button>
          </div>

          <div className="text-[11px] font-mono text-ink-muted">
            <span className="text-[10px] uppercase mr-1">{isFr ? 'Créneau :' : 'Window:'}</span>
            <span className="font-semibold text-ink">{solvedTimeline.preRideWindow}</span>
          </div>
        </div>

        {/* Third Row: Destination Logistics (Fridge & Split Recovery & Locations) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fridge Toggle */}
            <button
              type="button"
              onClick={() => updateLogistics({ hasDestinationFridge: !localLogistics.hasDestinationFridge })}
              className={`px-2.5 py-1 rounded-sub-pod text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                localLogistics.hasDestinationFridge
                  ? 'bg-emerald/10 text-emerald-800 dark:text-emerald-300 border-emerald/30'
                  : 'bg-card text-ink-muted border-ink/10 dark:border-white/10'
              }`}
            >
              <span>{localLogistics.hasDestinationFridge ? '❄️' : '🧊'}</span>
              <span>{t('logisticsFridgeOnSite')}</span>
              {localLogistics.hasDestinationFridge && <Check className="w-3 h-3 ml-0.5" />}
            </button>

            {/* Split Recovery vs Single Meal Toggle */}
            <button
              type="button"
              onClick={() => updateLogistics({ splitPostRideRecovery: !localLogistics.splitPostRideRecovery })}
              className={`px-2.5 py-1 rounded-sub-pod text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                localLogistics.splitPostRideRecovery
                  ? 'bg-amber/10 text-amber-800 dark:text-amber-300 border-amber/30'
                  : 'bg-card text-ink-muted border-ink/10 dark:border-white/10'
              }`}
            >
              <span>{localLogistics.splitPostRideRecovery ? '🚿' : '🍽️'}</span>
              <span>
                {localLogistics.splitPostRideRecovery
                  ? t('logistics2StageLocker')
                  : t('logisticsSingleArrival')}
              </span>
            </button>
          </div>

          {/* Location inputs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-card px-2 py-0.5 rounded-sub-pod border border-ink/5 dark:border-white/5 text-[11px]">
              <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
              <input
                type="text"
                value={localLogistics.stage1LocationLabel ?? ''}
                placeholder={isFr ? 'Lieu Arrivée' : 'Stage 1 Location'}
                onChange={(e) => updateLogistics({ stage1LocationLabel: e.target.value })}
                className="bg-transparent text-ink placeholder:text-ink-muted w-28 sm:w-36 focus:outline-none"
                title={t('logisticsStage1Location')}
              />
            </div>

            {localLogistics.splitPostRideRecovery && (
              <div className="flex items-center gap-1 bg-card px-2 py-0.5 rounded-sub-pod border border-ink/5 dark:border-white/5 text-[11px]">
                <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
                <input
                  type="text"
                  value={localLogistics.stage2LocationLabel ?? ''}
                  placeholder={isFr ? 'Lieu Étape 2' : 'Stage 2 Location'}
                  onChange={(e) => updateLogistics({ stage2LocationLabel: e.target.value })}
                  className="bg-transparent text-ink placeholder:text-ink-muted w-28 sm:w-36 focus:outline-none"
                  title={t('logisticsStage2Location')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExpeditionManifest = () => {
    if (totalDays <= 1) return null;

    const solidItems = compliantPantry.onBikeSolids;
    const solidRations = solidItems.slice(0, 3).map((item) => {
      const allocated = onBikeItems.find((it) => it.name === (isFr ? item.nameFr : item.nameEn));
      const dailyUnits = allocated ? Math.max(1, Math.round(allocated.carbsGrams / Math.max(1, item.carbsG))) : 2;
      const totalUnits = dailyUnits * totalDays;
      return {
        id: item.id,
        name: isFr ? item.nameFr : item.nameEn,
        portionLabel: isFr ? item.portionLabelFr : item.portionLabelEn,
        totalUnits,
        totalCarbs: totalUnits * item.carbsG,
        totalKcal: totalUnits * item.kcal,
      };
    });

    const electrolyteTabsCount = totalDays * 2;
    const totalManifestCarbs = solidRations.reduce((sum, r) => sum + r.totalCarbs, 0);
    const totalManifestKcal = solidRations.reduce((sum, r) => sum + r.totalKcal, 0);
    const totalManifestUnits = Math.max(1, Math.round(totalManifestCarbs / 20));

    const manifestTitle = isQuantitative
      ? (isFr
          ? `Jour ${currentDay}/${totalDays} · ~${totalManifestCarbs}g C (${totalManifestKcal} kcal)`
          : `Day ${currentDay}/${totalDays} · ~${totalManifestCarbs}g carbs (${totalManifestKcal} kcal)`)
      : isFuelFirst
      ? (isFr
          ? `Jour ${currentDay}/${totalDays} · ~${totalManifestUnits} unités totales`
          : `Day ${currentDay}/${totalDays} · ~${totalManifestUnits} total units`)
      : (isFr
          ? `Jour ${currentDay}/${totalDays} · ${recommendedBidons} bidons / étape`
          : `Day ${currentDay}/${totalDays} · ${recommendedBidons} bidons / stage`);

    const manifestSub = isQuantitative
      ? isEmergencySurge
        ? isFr
          ? `${recommendedGPerHr} g/h (Surrégime d'urgence) · ${prefBadgeLabel}`
          : `${recommendedGPerHr} g/h (Surge) · ${prefBadgeLabel}`
        : recommendedGPerHr === effectiveCeilingGPerHr
        ? isFr
          ? `${recommendedGPerHr} g/h (Plafond max) · ${prefBadgeLabel}`
          : `${recommendedGPerHr} g/h (Max gut cap) · ${prefBadgeLabel}`
        : isFr
        ? `${recommendedGPerHr} g/h (${powerZoneLabel} · max ${effectiveCeilingGPerHr} g/h) · ${prefBadgeLabel}`
        : `${recommendedGPerHr} g/h target (${powerZoneLabel} pace · ${effectiveCeilingGPerHr} g/h gut cap) · ${prefBadgeLabel}`
      : isFuelFirst
      ? `${fuelUnitsPerHour} ${isFr ? 'unités/h' : 'fuel units/h'} · ${prefBadgeLabel}`
      : `${isFr ? 'Rythme régulier' : 'Steady rhythm'} · ${prefBadgeLabel}`;

    return (
      <div className="rounded-pod bg-pod mb-3 border border-ink/5 dark:border-white/5 overflow-hidden transition-colors">
        <button
          type="button"
          onClick={toggleManifest}
          aria-expanded={manifestOpen}
          className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconBadge theme="amber" icon={Flame} size="sm" solidBacker />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-bold text-ink font-rounded uppercase tracking-tight break-words tnum">
                {manifestTitle}
              </h4>
              <p className="text-[11px] text-ink-muted break-words tnum">
                {manifestSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="yellow-vest"
              size="sm"
              className="hidden sm:inline-flex font-rounded uppercase"
            >
              {isFr ? 'Manifeste Expédition' : 'Expedition Manifest'}
            </Badge>
            <DisclosureChevron open={manifestOpen} />
          </div>
        </button>

        <Collapsible
          open={manifestOpen}
          innerClassName="px-3.5 pb-3.5 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 space-y-3"
        >
          {/* Cumulative Ration Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {solidRations.map((r) => (
              <div
                key={r.id}
                className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold text-ink-muted uppercase line-clamp-1">
                  {r.name}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                  {r.totalUnits}x
                </span>
                <span className="text-[10px] text-ink-muted tnum">
                  {isQuantitative
                    ? `~${r.totalKcal} kcal (${r.totalCarbs}g C)`
                    : `${r.totalUnits} ${r.portionLabel}`}
                </span>
              </div>
            ))}

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {isFr ? 'Doses Électrolytes' : 'Electrolyte Tabs'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {electrolyteTabsCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">
                {isQuantitative
                  ? `~${electrolyteTabsCount * 500}mg Na+`
                  : `${electrolyteTabsCount} ${isFr ? 'doses bidons' : 'bottle doses'}`}
              </span>
            </div>
          </div>

          {/* Daily Morning Resupply Notice */}
          <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center gap-2 text-xs text-ink-secondary">
            <span className="text-sm">{dietaryFilters.includes('gluten-free') ? '🌾' : '🥖'}</span>
            <span className="text-[11px] sm:text-xs">
              {dietaryFilters.includes('gluten-free')
                ? isFr
                  ? 'Ravitaillement matin : pain ou galettes sans gluten + fruits frais locaux au départ d’étape.'
                  : 'Daily morning resupply: fresh gluten-free bread & fresh local fruit at each stage start.'
                : dietaryFilters.includes('vegan')
                ? isFr
                  ? 'Ravitaillement matin : pain au levain végétal + fruits frais locaux au départ d’étape.'
                  : 'Daily morning bakery resupply: fresh sourdough & fresh local fruit at each stage start.'
                : isFr
                ? 'Ravitaillement boulangerie : 1 baguette fraîche + fruits frais chaque matin au départ d’étape.'
                : 'Daily morning bakery resupply: 1 fresh baguette + fresh local fruit at each stage start.'}
            </span>
          </div>
        </Collapsible>
      </div>
    );
  };

  const renderPhaseAccordion = (phases: NutritionPhaseSpec[]) => (
    <div className="space-y-2.5">
      {phases.map((phase, idx) => {
        const isOpen = Boolean(openPhases[idx]);
        const panelId = `nutrition-phase-${trip.id}-${phase.id}`;
        const bullets = splitIntoBullets(phase.body);
        const MacroIcon = phase.macroIcon;

        return (
          <div
            key={phase.id}
            className="rounded-pod bg-pod border border-ink/5 dark:border-white/5 overflow-hidden transition-colors"
          >
            {/* Collapsible Phase Header */}
            <button
              type="button"
              onClick={() => togglePhase(idx)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <IconBadge
                  theme={phase.theme}
                  icon={phase.icon}
                  size="sm"
                  solidBacker
                  className="shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-[13px] sm:text-sm font-bold font-rounded text-ink leading-snug break-words tnum">
                      {idx + 1}. {phase.title}
                    </span>
                    {phase.liquidShiftPill && (
                      <Badge variant="sky" size="xs" dot className="font-semibold text-[10px]">
                        {phase.liquidShiftPill}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-muted flex-wrap tnum">
                    <span className="font-rounded font-semibold uppercase tracking-wide text-[10px]">
                      {phase.stageLabel}
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <span className="font-mono font-semibold text-ink-secondary break-words">
                      {phase.macroHeadline}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={phase.timingVariant} size="xs" className="tnum">
                  {phase.timingLabel}
                </Badge>

                <DisclosureChevron open={isOpen} />
              </div>
            </button>

            {/* Expandable Bullet Protocol Details */}
            <Collapsible
              open={isOpen}
              id={panelId}
              innerClassName="px-3.5 pb-3.5 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2.5"
            >
              <ul className="space-y-1.5 text-[13px] text-ink-secondary leading-relaxed">
                {bullets.map((sentence, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${CHIP_TOKENS[phase.theme].dot}`}
                    />
                    <span>{sentence}</span>
                  </li>
                ))}
              </ul>

              {/* Portion-Label or Quantitative-Label Food Items List */}
              {phase.items && phase.items.length > 0 && (
                <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2">
                  {phase.items.some((i) => i.isSavoryReset) ? (
                    <div className="space-y-2.5">
                      {/* Sub-group 1: Sweet / Fast Energy */}
                      {phase.items.filter((i) => !i.isSavoryReset).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>⚡</span>
                            <span>{t('sweetFastEnergy')}</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {phase.items
                              .filter((i) => !i.isSavoryReset)
                              .map((itm, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="p-2 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex items-center justify-between gap-1.5 text-xs"
                                >
                                  <span className="font-medium text-ink break-words">
                                    {isFuelFirst
                                      ? itm.portionLabel || itm.name
                                      : itm.quantitativeLabel || `${itm.name} (${itm.quantity})`}
                                  </span>
                                  {itm.notes && (
                                    <span className="text-[10px] text-ink-muted truncate max-w-[40%] text-right">
                                      {itm.notes}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-group 2: Savory Palate Resets */}
                      {phase.items.filter((i) => i.isSavoryReset).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>🧂</span>
                            <span>{t('savoryPalateResets')}</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {phase.items
                              .filter((i) => i.isSavoryReset)
                              .map((itm, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="p-2 rounded-sub-pod bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-1.5 text-xs"
                                >
                                  <span className="font-medium text-emerald-800 dark:text-emerald-300 break-words">
                                    {isFuelFirst
                                      ? itm.portionLabel || itm.name
                                      : itm.quantitativeLabel || `${itm.name} (${itm.quantity})`}
                                  </span>
                                  {itm.notes && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate max-w-[40%] text-right">
                                      {itm.notes}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                        {isFuelFirst
                          ? isFr
                            ? 'Portions Repères'
                            : 'Portion Guidance'
                          : isFr
                          ? 'Détail des Aliments'
                          : 'Prescribed Food Items'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {phase.items.map((itm, iIdx) => (
                          <div
                            key={iIdx}
                            className="p-2 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex items-center justify-between gap-1.5 text-xs"
                          >
                            <span className="font-medium text-ink break-words">
                              {isFuelFirst
                                ? itm.portionLabel || itm.name
                                : itm.quantitativeLabel || `${itm.name} (${itm.quantity})`}
                            </span>
                            {itm.notes && (
                              <span className="text-[10px] text-ink-muted truncate max-w-[40%] text-right">
                                {itm.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="px-3 py-2 rounded-sub-pod bg-card flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <span className="text-[11px] font-mono text-ink-muted uppercase">
                  {phase.stageLabel}
                </span>
                <span
                  className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS[phase.macroTheme].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  {MacroIcon && <MacroIcon className="w-4 h-4 text-current shrink-0" />}
                  <span>{phase.macroHeadline}</span>
                </span>
              </div>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );

  const renderWaterGapAlertBanner = () => {
    if (!waterGaps || (waterGaps.status !== 'critical' && waterGaps.status !== 'caution')) {
      return null;
    }

    const targetGap =
      waterGaps.criticalGaps[0] ||
      waterGaps.cautionGaps[0] ||
      waterGaps.gaps.find((g) => g.distanceKm === waterGaps.maxGapKm) ||
      waterGaps.gaps[0];

    if (!targetGap) return null;

    const isCritical = waterGaps.status === 'critical';
    const gapDist = targetGap.distanceKm;
    const gapHours = targetGap.gapHours ?? 0;
    const gapFluid = targetGap.gapFluidNeedMl ?? 0;
    const depletion = targetGap.depletionPct ?? 0;

    return (
      <div
        className={`mb-3 p-3 rounded-pod border flex items-start gap-2.5 ${
          isCritical
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
        }`}
      >
        <TriangleAlert
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            isCritical ? 'text-rose-500' : 'text-amber-500'
          }`}
        />
        <div className="min-w-0 flex-1 space-y-0.5 text-xs">
          <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
            <span>
              {isCritical
                ? isFr
                  ? 'Alerte Désert Hydrique Critique'
                  : 'Critical Water Desert Warning'
                : isFr
                ? 'Zone d’Attention Hydrique'
                : 'Caution: Extended Water Gap'}
            </span>
            <span className="font-mono font-bold text-[11px]">
              {gapDist.toFixed(1)} km (~{Math.round(gapHours * 60)} min) · {gapFluid} ml ({depletion}% {isFr ? 'capacité' : 'capacity'})
            </span>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed">
            {isFr
              ? `Section sans point d'eau entre km ${targetGap.startKm.toFixed(1)} et km ${targetGap.endKm.toFixed(1)}. Prévoyez de remplir vos ${targetGap.recommendedBidonsForGap ?? 2} bidons au préalable.`
              : `Long water gap between km ${targetGap.startKm.toFixed(1)} and km ${targetGap.endKm.toFixed(1)}. Plan to top up ${targetGap.recommendedBidonsForGap ?? 2} bidons before entering.`}
          </p>
        </div>
      </div>
    );
  };

  // ── INTUITIVE MODE: CHRONOLOGICAL RHYTHM CUES & HYDRATION RADAR ONLY ──
  if (isIntuitive) {
    const intuitivePhases: NutritionPhaseSpec[] = [
      {
        id: 'int-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Avant de partir' : 'Pre-ride base',
        timingLabel: 'T − 45m',
        timingVariant: 'zinc',
        macroHeadline: isFr ? 'Repas digeste et hydratation au calme' : 'Comfortable pre-ride meal',
        macroIcon: Coffee,
        macroTheme: 'amber',
        title: isFr ? 'T-45m : Repas digeste avant le départ' : 'T-45m: Comfortable pre-ride meal',
        body: isFr
          ? 'Prenez un repas léger et confortable (pain grillé, compote ou flocons d’avoine, café/thé) au moins 35 à 45 minutes avant d’enfourcher votre vélo. Buvez un grand verre d’eau pour partir bien hydraté.'
          : 'Enjoy a comfortable, easily-digested pre-ride meal (toasted bread, oatmeal, fruit, coffee/tea) 35-45 minutes before rollout. Drink a tall glass of water to start fully hydrated.',
      },
      {
        id: 'int-2',
        icon: Droplets,
        theme: 'sky',
        stageLabel: isFr ? 'En selle' : 'In the saddle',
        timingLabel: isFr ? 'Toutes les 20m' : 'Every 20m',
        timingVariant: 'sky',
        macroHeadline: isFr ? '1 gorgée régulière & petite bouchée' : 'Sip water & take a small bite',
        macroIcon: Droplets,
        macroTheme: 'sky',
        title: isFr ? 'Toutes les 20m : Boire une gorgée d’eau & petite bouchée' : 'Every 20m: Sip water & take a small bite',
        body: isFr
          ? 'Réglez un rappel régulier : buvez une gorgée d’eau toutes les 15-20 minutes. Pour les sorties de plus d’une heure, prenez une petite bouchée (datte, figue ou collation) à intervalles réguliers pour maintenir une énergie fluide et constante sans surcharger l’estomac.'
          : 'Take a comfortable sip of water every 15-20 minutes. On rides over an hour, take a small bite of fruit or a snack at steady intervals to keep energy smooth and constant without heavy stomach load.',
      },
      {
        id: 'int-3',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: isFr ? 'Arrivée' : 'At destination',
        timingLabel: isFr ? 'Arrivée + 45m' : 'Arrival + 45m',
        timingVariant: 'emerald',
        macroHeadline: isFr ? 'Réhydratation & collation de récupération' : 'Rehydrate & recovery meal',
        macroIcon: ForkKnife,
        macroTheme: 'emerald',
        title: isFr ? 'Arrivée : Se réhydrater & repas de récupération sous 45m' : 'Arrival: Rehydrate & recovery meal within 45m',
        body: isFr
          ? 'Dès l’arrivée, buvez de l’eau pour compenser la transpiration et prenez une collation rassasiante (yaourt, sandwich frais, fruits ou repas équilibré) dans les 45 minutes pour reconstituer vos forces sereinement.'
          : 'Rehydrate with fresh water upon arrival and enjoy a satisfying meal or snack (yogurt, fresh sandwich, fruit) within 45 minutes to restore energy comfortably.',
      },
    ];

    return (
      <Card
        title={isFr ? 'Guidage & Rythme Intuitif' : 'Intuitive Rhythm & Hydration'}
        subtitle={
          isFr
            ? `Repères chronologiques & hydratation (${distance} km) sans comptage de calories`
            : `Chronological rhythm cues & hydration pacing (${distance} km) free from calorie counting`
        }
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            <Badge variant="lime" size="md" dot className="py-1.5 px-3">
              {t('nutriIntuitiveCadenceCue')}
            </Badge>
            <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
              {hydrationBadgeLabel}
            </Badge>
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderWaterGapAlertBanner()}
        {renderPhaseAccordion(intuitivePhases)}
      </Card>
    );
  }

  // 0. SHORT-DURATION RIDE (< 45 MIN): HYDRATION & ARRIVAL ONLY
  if (isShortRide && !showFullProtocol) {
    const shortPhases: NutritionPhaseSpec[] = [
      {
        id: 'short-1',
        icon: Droplets,
        theme: 'sky',
        stageLabel: isFr ? 'En selle' : 'On-bike intake',
        timingLabel: 'T − 20m',
        timingVariant: 'zinc',
        macroHeadline: isQuantitative
          ? '0g carbs · 350–500ml H2O'
          : isFr
          ? 'Hydratation · 1 bidon d’eau'
          : 'Hydration · 1 water bottle',
        macroTheme: 'sky',
        title: t('nutriShort1Title'),
        body: t('nutriShort1Body'),
      },
      {
        id: 'short-2',
        icon: Coffee,
        theme: 'emerald',
        stageLabel: isFr ? 'Post-trajet' : 'Post-ride',
        timingLabel: isFr ? 'Arrivée' : 'Arrival',
        timingVariant: 'emerald',
        macroHeadline: isQuantitative
          ? '~250 kcal · ~20g protein'
          : isFr
          ? 'Collation protéinée ou petit-déjeuner'
          : 'Post-ride protein snack or breakfast',
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'emerald',
        title: t('nutriShort2Title'),
        body: t('nutriShort2Body'),
      },
    ];

    return (
      <Card
        title={t('nutriShortTitle')}
        subtitle={t('nutriShortSub', { min: movingMinutes, dist: distance })}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            <Badge variant="sky" size="md" dot className="py-1.5 px-3 tnum">
              {t('nutriShortBadge')}
            </Badge>
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
                ~{estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="amber" size="md" icon={Lightning} className="py-1.5 px-3 tnum">
                {fuelUnitsPerHour} {isFr ? 'unités/h' : 'fuel units/h'}
              </Badge>
            )}
            <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
              {hydrationBadgeLabel}
            </Badge>
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderWaterGapAlertBanner()}
        {renderPhaseAccordion(shortPhases)}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowFullProtocol(true)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110`}
          >
            {t('nutriShowFullBtn')}
          </button>
        </div>
      </Card>
    );
  }

  const compactReturnBtn =
    isShortRide && showFullProtocol ? (
      <button
        type="button"
        onClick={() => setShowFullProtocol(false)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110`}
      >
        {t('nutriShowCompactBtn', { min: movingMinutes })}
      </button>
    ) : null;

  // 1. SPORT / GRAN FONDO PROTOCOL
  if (isSport) {
    const isKom = activeChips.includes('climbing-kom-hunt');
    const isHydration = activeChips.includes('hydration-electrolytes');

    const sportPhases: NutritionPhaseSpec[] = [
      {
        id: 'sport-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Apport glucides' : 'Pre-load carbs',
        timingLabel: 'T − 60m',
        timingVariant: 'zinc',
        macroHeadline: isQuantitative
          ? '~75g · ~350 kcal'
          : isFr
          ? 'Collation glucidique d’avant-départ'
          : 'Pre-ride fuel portion',
        macroIcon: Lightning,
        macroTheme: 'yellow-vest',
        title: t('nutriSport1Title'),
        body: t('nutriSport1Body'),
      },
      {
        id: 'sport-2',
        icon: isKom ? Trophy : Lightning,
        theme: isKom ? 'amber' : 'yellow-vest',
        stageLabel: isFr ? 'Débit horaire en selle' : 'On-bike hourly rate',
        timingLabel: isKom
          ? isFr
            ? `Bosses · ${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`}`
            : `KOM · ${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`}`
          : isQuantitative
          ? `${recommendedGPerHr} g/h`
          : `${fuelUnitsPerHour} ${isFr ? 'unités/h' : 'fuel units/h'}`,
        timingVariant: 'yellow-vest',
        macroHeadline: onBikeMacroHeadline,
        macroIcon: Lightning,
        macroTheme: 'yellow-vest',
        items: onBikeItems,
        liquidShiftPill,
        title:
          nutPref === 'real-food'
            ? isFr
              ? `Ravito Naturel Calibré (${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`})`
              : `Calibrated Real-Food Fueling (${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`})`
            : isHydration
            ? isFr
              ? 'Stratégie Glucides & Recharge Sodium'
              : 'Carb & Sodium Hydration Protocol'
            : isKom
            ? isFr
              ? 'Glycogène Rapide pour Répétitions en Côte'
              : 'High-Rate Glycogen for Punchy Climbs'
            : t('nutriSport2Title'),
        body:
          nutPref === 'real-food'
            ? isFr
              ? `Profil ajusté sans produits industriels : ${compliantPantry.onBikeLiquid.nameFr} et collations de poche (${compliantPantry.onBikeSolids.map((s) => s.nameFr).join(', ')}).`
              : `Adjusted to steady fueling using whole foods: ${compliantPantry.onBikeLiquid.nameEn} and pocket snacks (${compliantPantry.onBikeSolids.map((s) => s.nameEn).join(', ')}).`
            : isHydration
            ? isFr
              ? `Apport régulier + 750 mg sodium/litre pour maximiser l’absorption intestinale sans troubles digestifs.`
              : `Hydration pacing + 750mg sodium/liter to match your gut absorption rate comfortably.`
            : t('nutriSport2Body'),
      },
      {
        id: 'sport-3',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: isFr ? 'Ratio récupération' : 'Recovery target',
        timingLabel: t('nutriSport3Badge'),
        timingVariant: 'emerald',
        macroHeadline: isQuantitative
          ? '3:1 Glycogen · ~400 kcal'
          : isFr
          ? 'Collation de récupération'
          : 'Recovery refuel portion',
        macroIcon: isQuantitative ? Flame : ForkKnife,
        macroTheme: 'emerald',
        title: t('nutriSport3Title'),
        body: t('nutriSport3Body'),
      },
    ];

    return (
      <Card
        title={isFr ? t('nutritionTitle') : t('nutriSportTitle')}
        subtitle={t('nutriSportSub', { dist: distance })}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            <Badge variant="emerald" size="md" className="py-1.5 px-3 tnum">
              {prefBadgeLabel}
            </Badge>
            {renderPacingBadge('yellow-vest')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
                {estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}x {isFr ? 'bidons' : 'bidons'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderWaterGapAlertBanner()}
        {renderPhaseAccordion(sportPhases)}
      </Card>
    );
  }

  // 2. BIKEPACKING / MULTI-DAY TOUR PROTOCOL
  if (isBikepacking) {
    const isMountain = activeChips.includes('mountain-adventure');
    const isResupply = activeChips.includes('resupply-points');
    const isBivouac = activeChips.includes('bivouac-camp');

    const bpPhases: NutritionPhaseSpec[] = [
      {
        id: 'bp-1',
        icon: isMountain ? Mountains : Coffee,
        theme: isMountain ? 'sky' : 'amber',
        stageLabel: isFr ? 'Charge matin' : 'Staging energy',
        timingLabel: isMountain ? (isFr ? 'Matin Alpin' : 'Alpine Morning') : 'Camp Morning',
        timingVariant: 'zinc',
        macroHeadline: isQuantitative
          ? isMountain
            ? '~750 kcal · High carb'
            : '~650 kcal · High carb'
          : isFr
          ? 'Petit-déjeuner copieux au camp'
          : 'Hearty camp breakfast',
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'amber',
        title: isMountain
          ? isFr
            ? 'Charge Métabolique Haute Altitude'
            : 'High-Altitude Metabolic Pre-Load'
          : t('nutriBp1Title'),
        body: isMountain
          ? isFr
            ? 'Gruau dense aux fruits oléagineux, miel de montagne et caféine pour résister aux températures fraîches des cols.'
            : 'Dense nut-butter oatmeal, mountain honey & double caffeine to combat cold morning col temperatures.'
          : t('nutriBp1Body'),
      },
      {
        id: 'bp-2',
        icon: AppleLogo,
        theme: 'lime',
        stageLabel: isFr ? 'Cadence horaire' : 'Rolling intake',
        timingLabel: isMountain ? (isFr ? 'Pentes Fortes' : 'Steep Pitches') : 'Every 25m',
        timingVariant: 'lime',
        macroHeadline: onBikeMacroHeadline,
        macroIcon: Lightning,
        macroTheme: 'lime',
        items: onBikeItems,
        liquidShiftPill,
        title: isMountain
          ? isFr
            ? 'Rations Roulantes & Électrolytes en Montée'
            : 'Ascent Grazing & Electrolyte Buffer'
          : isResupply
          ? isFr
            ? 'Ravitaillement Boulangerie & Produits Frais'
            : 'Village Bakery & Fresh Resupply Grazing'
          : t('nutriBp2Title'),
        body: isMountain
          ? isFr
            ? dietaryFilters.includes('nut-free')
              ? 'Prise toutes les 20 min : dattes, pâtes de fruits artisanales et bidon électrolytes (garanti sans fruits à coque).'
              : 'Prise toutes les 20 min : dattes, pâtes d’amandes et bidon électrolytes pour compenser la forte sudation en côte.'
            : dietaryFilters.includes('nut-free')
            ? 'Intake every 20 min: dates, artisanal fruit chews, and sodium bottle (100% nut-free electrolyte buffer).'
            : 'Intake every 20 min: dates, almond paste, and sodium bottle to offset heavy climbing sweat rates.'
          : isResupply
          ? isFr
            ? dietaryFilters.includes('gluten-free')
              ? 'Halte ravitaillement villageois : gâteaux ou galettes de riz sans gluten, fruits frais et ravitaillement en eau.'
              : dietaryFilters.includes('vegan')
              ? 'Halte boulangerie villageoise : pain au levain végétal, fruits frais et ravitaillement à la fontaine.'
              : 'Halte boulangerie villageoise : pain d’épices, fruits frais et ravitaillement à la fontaine d’eau potable.'
            : dietaryFilters.includes('gluten-free')
            ? 'Village resupply halt: gluten-free baked treats, fresh fruit, and icy fountain water.'
            : dietaryFilters.includes('vegan')
            ? 'Village bakery halt: plant-based sourdough, fresh fruit, and icy fountain water.'
            : 'Village bakery halt: spiced honey cake, fresh fruit, and icy spring fountain water.'
          : t('nutriBp2Body'),
      },
      {
        id: 'bp-3',
        icon: Package,
        theme: 'orange',
        stageLabel: isFr ? 'Dîner bivouac' : 'Camp reload',
        timingLabel: isMountain ? (isFr ? 'Camp Bivouac' : 'Bivouac Dusk') : 'Evening',
        timingVariant: 'orange',
        macroHeadline: isQuantitative
          ? isMountain
            ? '~1,100 kcal · Dense recovery'
            : '~950 kcal · High protein'
          : isFr
          ? 'Repas chaud de bivouac'
          : 'Warm camp recovery stew',
        macroIcon: isQuantitative ? Flame : Package,
        macroTheme: 'orange',
        title: isMountain
          ? isFr
            ? 'Dîner Bivouac de Montagne au Réchaud'
            : 'Mountain Bivouac High-Calorie Camp Stew'
          : isBivouac
          ? isFr
            ? 'Festin Bivouac Sauvage & Eau Purifiée'
            : 'Wild Bivouac Feast & Filtered Water'
          : t('nutriBp3Title'),
        body: isMountain
          ? isFr
            ? 'Plat lyophilisé chaud (bœuf/lentilles ou riz curry), chocolat noir et infusion chaude pour la thermorégulation nocturne.'
            : 'Hot freeze-dried stew, dark chocolate & herbal tea for overnight thermoregulation in sub-alpine air.'
          : isBivouac
          ? isFr
            ? 'Filtration de l’eau à la flasque, réchaud allumé pour repas chaud riche en glucides et protéines.'
            : 'Gravity-filtered water, camp stove stew packed with wholesome carbs and complete recovery proteins.'
          : t('nutriBp3Body'),
      },
    ];

    return (
      <Card
        title={isFr ? t('nutritionTitle') : t('nutriBpTitle')}
        subtitle={t('nutriBpSub', { dist: distance })}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            {renderPacingBadge('orange')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
                ~{estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}x {isFr ? 'bidons' : 'bidons'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderWaterGapAlertBanner()}
        {renderPhaseAccordion(bpPhases)}
      </Card>
    );
  }

  // 3. ESCAPADE / LEISURE STAY PROTOCOL
  if (isEscapade) {
    const isPicnic = activeChips.includes('picnic-outing');
    const isGastro =
      activeChips.includes('local-gastronomy') || activeChips.includes('wine-tasting');
    const isSpa = activeChips.includes('spa-wellness');

    const escPhases: NutritionPhaseSpec[] = [
      {
        id: 'esc-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Départ' : 'Rollout base',
        timingLabel: '−45 min',
        timingVariant: 'zinc',
        macroHeadline: isQuantitative
          ? '~350 kcal'
          : isFr
          ? 'Petit-déjeuner avant départ'
          : 'Morning rollout breakfast',
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'amber',
        title: t('nutriEsc1Title'),
        body: t('nutriEsc1Body'),
      },
      {
        id: 'esc-2',
        icon: isPicnic ? ForkKnife : Compass,
        theme: isPicnic ? 'orange' : 'teal',
        stageLabel: isFr ? 'Hydratation' : 'Cruising fuel',
        timingLabel: isPicnic
          ? isFr
            ? 'Pique-Nique 45 min'
            : 'Picnic Feast'
          : isFr
          ? 'En route'
          : 'On the road',
        timingVariant: isPicnic ? 'orange' : 'teal',
        macroHeadline:
          isPicnic && isQuantitative
            ? '~650 kcal · Balanced feast'
            : isPicnic && !isQuantitative
            ? isFr
              ? 'Pique-nique du terroir'
              : 'Artisanal picnic feast'
            : onBikeMacroHeadline,
        macroIcon: Lightning,
        macroTheme: 'emerald',
        items: onBikeItems,
        liquidShiftPill,
        title: isPicnic
          ? isFr
            ? 'Déjeuner Pique-Nique du Terroir au Bord de l’Eau'
            : 'Artisanal Waterside Picnic Feast'
          : t('nutriEsc2Title', { carbs: recommendedGPerHr }),
        body: isPicnic
          ? isFr
            ? dietaryFilters.includes('gluten-free')
              ? 'Pain sans gluten aux graines, tartinade végétale, avocat, tomates fraîches, fruits secs et eau minérale fraîche au soleil.'
              : dietaryFilters.includes('vegan') || dietaryFilters.includes('dairy-free')
              ? 'Pain au levain frais, houmous fermier, avocat, tomates fraîches, dattes et eau minérale fraîche au soleil.'
              : 'Pain au levain frais, fromage de chèvre fermier, avocat, tomates fraîches, dattes et eau minérale fraîche au soleil.'
            : dietaryFilters.includes('gluten-free')
            ? 'Seeded gluten-free artisan bread, plant-based spread, avocado, fresh tomatoes, figs & chilled spring water.'
            : dietaryFilters.includes('vegan') || dietaryFilters.includes('dairy-free')
            ? 'Crusty sourdough baguette, artisan hummus, avocado, fresh tomatoes, figs & chilled spring water.'
            : 'Crusty sourdough baguette, local farm goat cheese, avocado, fresh tomatoes, figs & chilled spring water.'
          : t('nutriEsc2Body'),
      },
      {
        id: 'esc-3',
        icon: isGastro ? Wine : ForkKnife,
        theme: isGastro ? 'rose' : 'emerald',
        stageLabel: isFr ? 'Dîner hôtel' : 'Evening dining',
        timingLabel: isGastro
          ? isFr
            ? 'Dîner 19:45'
            : 'Dining 19:45'
          : isSpa
          ? isFr
            ? 'Spa & Dîner'
            : 'Spa & Dining'
          : 'Check-in',
        timingVariant: isGastro ? 'rose' : 'emerald',
        macroHeadline: isQuantitative
          ? isGastro
            ? '~850 kcal · Culinary reload'
            : 'Balanced reload'
          : isFr
          ? 'Dîner régional à l’hôtel'
          : 'Regional evening dinner',
        macroIcon: isQuantitative ? Flame : ForkKnife,
        macroTheme: isGastro ? 'rose' : 'amber',
        title: isGastro
          ? isFr
            ? 'Étape Terroir & Dîner Gastronomique du Soir'
            : 'Evening Vineyard Dining & Terroir Table'
          : isSpa
          ? isFr
            ? 'Boisson Drainante Spa & Dîner Récupérateur'
            : 'Spa Detox Hydration & Restorative Dinner'
          : t('nutriEsc3Title'),
        body: isGastro
          ? isFr
            ? 'Table gastronomique réservée : cuisine de saison, dégustation de vins régionaux et reconstitution des réserves sans hâte.'
            : 'Reserved table at regional bistro: seasonal cuisine, local wine tasting, and relaxed glycogen recovery.'
          : isSpa
          ? isFr
            ? 'Infusion détox et eau minérale magnésienne après les bains chauds, suivi d’un dîner léger riche en oméga-3.'
            : 'Magnesium mineral water & herbal tea after thermal bath, followed by an omega-3 rich light dinner.'
          : t('nutriEsc3Body'),
      },
    ];

    return (
      <Card
        title={isFr ? t('nutritionTitle') : t('nutriEscTitle')}
        subtitle={t('nutriEscSub', { dest: trip.route?.destination || 'destination' })}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            {renderPacingBadge('emerald')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
                ~{estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}x {isFr ? 'bidons' : 'bidons'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderWaterGapAlertBanner()}
        {renderPhaseAccordion(escPhases)}
      </Card>
    );
  }

  // 4. VÉLOTAF / COMMUTE DEFAULT PROTOCOL (Real Food Items with Dynamic Macros & Logistics)
  const isCoffee = activeChips.includes('coffee-stop');
  const isTempo = activeChips.includes('fitness-boost');
  const isShower = activeChips.includes('shower-locker');
  const customCafeName = trip.ruleSettings?.cafeName ? String(trip.ruleSettings.cafeName) : '';
  const customRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';

  const preRideItems = planPhases.find((p) => p.phaseId === 'pre-ride')?.items || [];
  const p1Kcal = preRideItems.reduce((s, it) => s + it.kcals, 0);
  const p1Carbs = preRideItems.reduce((s, it) => s + it.carbsGrams, 0);
  const p1Protein = preRideItems.reduce((s, it) => s + it.proteinGrams, 0);

  const stage1Loc = localLogistics.stage1LocationLabel || (isFr ? 'Destination / Vestiaire' : 'Destination / Locker');
  const stage2Loc = localLogistics.stage2LocationLabel || (isFr ? 'Salle de Pause / Espace Bureau' : 'Break Room / Workspace');

  const commutePhases: NutritionPhaseSpec[] = [
    {
      id: 'com-1',
      icon: Coffee,
      theme: 'amber',
      stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
      timingLabel: solvedTimeline.preRideWindow,
      timingVariant: 'zinc',
      macroHeadline: isQuantitative
        ? `~${p1Kcal} kcal · ${p1Carbs}g C, ${p1Protein}g P`
        : isFuelFirst
        ? p1Carbs > 0
          ? formatFuelTarget(p1Carbs, 'fuel-first', lang)
          : isFr
          ? 'Hydratation seule'
          : 'Hydration only'
        : isFr
        ? 'Repas digeste au calme'
        : 'Digestible morning meal',
      macroIcon: isQuantitative ? Flame : Coffee,
      macroTheme: 'amber',
      title:
        localLogistics.preRideStyle === 'fasted-rollout'
          ? isFr
            ? 'Départ à Jeun & Hydratation'
            : 'Fasted Rollout & Hydration'
          : localLogistics.preRideStyle === 'light-liquid'
          ? isFr
            ? 'Collation Liquide Rapide (T-20m)'
            : 'Light Liquid Primer (T-20m)'
          : isFr
          ? 'Petit-Déjeuner Avant Départ'
          : 'Breakfast Before You Ride',
      body:
        localLogistics.preRideStyle === 'fasted-rollout'
          ? isFr
            ? 'Double expresso et hydratation à l’eau de source avec pincée de sel minéral 15 minutes avant le départ. Zéro glucides solides, stimulation douce de l’oxydation des graisses.'
            : 'Double espresso and spring water with trace mineral salt 15 minutes before rollout. Zero solid calories, gentle stimulation of fat oxidation.'
          : localLogistics.preRideStyle === 'light-liquid'
          ? isFr
            ? 'Pur jus pressé ou boisson légère (250 ml), double expresso et eau minérale 20 minutes avant le départ. Assimilation cellulaire ultra-rapide sans surcharge gastrique.'
            : 'Pure pressed juice or light carbohydrate primer (250ml), double espresso and spring water 20 minutes before rollout. Rapid cellular uptake with zero stomach heaviness.'
          : isFr
          ? `${compliantPantry.preRide.nameFr}, double expresso et grand verre d’eau avec pincée de sel 45 minutes avant le départ pour stabiliser la glycémie.`
          : `${compliantPantry.preRide.nameEn}, double espresso and tall glass of water with mineral salt 45 minutes before rollout for stable morning blood glucose.`,
      items: preRideItems,
    },
    {
      id: 'com-2',
      icon: isCoffee ? Coffee : AppleLogo,
      theme: isCoffee ? 'amber' : 'lime',
      stageLabel: isFr ? 'En route' : 'On the road',
      timingLabel: isCoffee
        ? isFr
          ? 'Pause Roaster'
          : 'Roastery Pause'
        : isTempo
        ? isFr
          ? 'Boost Tempo'
          : 'Tempo Fuel'
        : `${solvedTimeline.departureTimeHHMM} – ${solvedTimeline.arrivalTimeHHMM}`,
      timingVariant: isCoffee ? 'amber' : 'lime',
      macroHeadline:
        isCoffee && isQuantitative
          ? '~320 kcal · Espresso + pastry'
          : isCoffee && !isQuantitative
          ? isFr
            ? 'Pause café & viennoiserie'
            : 'Espresso & pastry'
          : onBikeMacroHeadline,
      macroIcon: Lightning,
      macroTheme: 'lime',
      title: isCoffee
        ? customCafeName ||
          (isFr ? 'Arrêt Café de Spécialité & Viennoiserie' : 'Specialty Roastery Espresso & Pastry')
        : isTempo
        ? isFr
          ? 'Carburant Effort Soutenu Zone 3'
          : 'Sustained Zone 3 Tempo Fueling'
        : t('nutriCom2Title'),
      body: isCoffee
        ? customRation
          ? isFr
            ? `Collation planifiée (${localLogistics.coffeeDurationMin ?? 15} min) : ${customRation}.`
            : `Scheduled coffee pause (${localLogistics.coffeeDurationMin ?? 15} min): ${customRation}.`
          : isFr
          ? dietaryFilters.includes('nut-free') && dietaryFilters.includes('gluten-free')
            ? 'Double expresso fraîchement extrait + collation moelleuse artisanale sans gluten ni fruits à coque.'
            : dietaryFilters.includes('nut-free')
            ? 'Double expresso fraîchement extrait + chausson aux pommes ou viennoiserie pur beurre (100% sans amandes).'
            : dietaryFilters.includes('vegan')
            ? 'Double expresso fraîchement extrait + viennoiserie végétale au levain.'
            : 'Double expresso fraîchement extrait + viennoiserie aux amandes pour booster la vigilance et l’énergie avant la prise de poste.'
          : dietaryFilters.includes('nut-free') && dietaryFilters.includes('gluten-free')
          ? 'Freshly pulled double espresso + artisan gluten-free, nut-free bakery treat for cognitive focus.'
          : dietaryFilters.includes('nut-free')
          ? 'Freshly pulled double espresso + warm apple turnover (100% nut-free) for morning focus.'
          : dietaryFilters.includes('vegan')
          ? 'Freshly pulled double espresso + plant-based sourdough pastry for morning fuel.'
          : 'Freshly pulled double espresso + artisanal almond pastry for sharp cognitive focus and rapid morning fuel.'
        : isTempo
        ? isFr
          ? `Bidon eau/pur jus ${bidonSizeMl} ml + collation en selle pour maintenir un rythme soutenu sans baisse de régime.`
          : `${bidonSizeMl}ml 50/50 juice bottle + fruit chew in the saddle to maintain steady tempo without mid-commute fading.`
        : t('nutriCom2Body'),
      items: onBikeItems,
      liquidShiftPill,
    },
  ];

  if (localLogistics.splitPostRideRecovery) {
    const lockerItems = planPhases.find((p) => p.phaseId === 'locker-refuel')?.items || [];
    const p3Kcal = lockerItems.reduce((s, it) => s + it.kcals, 0);
    const p3Carbs = lockerItems.reduce((s, it) => s + it.carbsGrams, 0);
    const p3Protein = lockerItems.reduce((s, it) => s + it.proteinGrams, 0);

    const breakRoomItems = planPhases.find((p) => p.phaseId === 'break-room')?.items || [];
    const p4Kcal = breakRoomItems.reduce((s, it) => s + it.kcals, 0);
    const p4Carbs = breakRoomItems.reduce((s, it) => s + it.carbsGrams, 0);
    const p4Protein = breakRoomItems.reduce((s, it) => s + it.proteinGrams, 0);

    commutePhases.push(
      {
        id: 'com-3',
        icon: Package,
        theme: 'yellow-vest',
        stageLabel: stage1Loc,
        timingLabel: solvedTimeline.postRideImmediateWindow || '08:30 – 08:40',
        timingVariant: 'yellow-vest',
        macroHeadline: isQuantitative
          ? `~${p3Kcal} kcal · ${p3Carbs}g C, ${p3Protein}g P`
          : isFuelFirst
          ? formatFuelTarget(p3Carbs, 'fuel-first', lang)
          : isFr
          ? resolvedPostRidePantry.portionLabelFr
          : resolvedPostRidePantry.portionLabelEn,
        macroIcon: isQuantitative ? Flame : Package,
        macroTheme: 'yellow-vest',
        title: isShower
          ? isFr
            ? `Ouvre la fenêtre de récupération (${stage1Loc})`
            : `Opens post-ride recovery window (${stage1Loc})`
          : isFr
          ? `Collation de Récupération (${stage1Loc})`
          : `Immediate Recovery Snack (${stage1Loc})`,
        body: isFr
          ? `${resolvedPostRidePantry.nameFr} consommé dès l’arrivée (${stage1Loc}) pour recharger les réserves et favoriser la régénération musculaire.`
          : `${resolvedPostRidePantry.nameEn} consumed upon arrival (${stage1Loc}) to replenish glycogen and support muscular recovery.`,
        items: lockerItems,
      },
      {
        id: 'com-4',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: stage2Loc,
        timingLabel: solvedTimeline.postRideMealWindow || '08:50 – 09:05',
        timingVariant: 'emerald',
        macroHeadline: isQuantitative
          ? `~${p4Kcal} kcal · ${p4Carbs}g C, ${p4Protein}g P`
          : isFuelFirst
          ? formatFuelTarget(p4Carbs, 'fuel-first', lang)
          : isFr
          ? 'Collation repas au bureau'
          : 'Seated workplace breakfast',
        macroIcon: isQuantitative ? Flame : ForkKnife,
        macroTheme: 'emerald',
        title: isFr
          ? `Repas & Café du Matin (${stage2Loc})`
          : `Morning Meal & Coffee (${stage2Loc})`,
        body: isFr
          ? 'Repas complet et équilibré au calme : flocons d’avoine, fruit frais, oléagineux, sandwich frais et café chaud pour une énergie stable tout au long de la matinée.'
          : 'Complete balanced seated meal: overnight oats, fresh fruit, nuts or seeds, fresh sandwich, and warm coffee for sustained morning focus.',
        items: breakRoomItems,
      }
    );
  } else {
    const arrivalItems = planPhases.find((p) => p.phaseId === 'arrival-recovery')?.items || [];
    const arrKcal = arrivalItems.reduce((s, it) => s + it.kcals, 0);
    const arrCarbs = arrivalItems.reduce((s, it) => s + it.carbsGrams, 0);
    const arrProtein = arrivalItems.reduce((s, it) => s + it.proteinGrams, 0);

    commutePhases.push({
      id: 'com-arrival',
      icon: ForkKnife,
      theme: 'emerald',
      stageLabel: stage1Loc,
      timingLabel: solvedTimeline.postRideConsolidatedWindow || '08:40 – 09:00',
      timingVariant: 'emerald',
      macroHeadline: isQuantitative
        ? `~${arrKcal} kcal · ${arrCarbs}g C, ${arrProtein}g P`
        : isFuelFirst
        ? formatFuelTarget(arrCarbs, 'fuel-first', lang)
        : isFr
        ? 'Repas de récupération complet'
        : 'Consolidated recovery meal',
      macroIcon: isQuantitative ? Flame : ForkKnife,
      macroTheme: 'emerald',
      title: isFr
        ? `Repas Récupérateur d’Arrivée (${stage1Loc})`
        : `Arrival Recovery Meal (${stage1Loc})`,
      body: isFr
        ? `Repas complet regroupant votre collation (${resolvedPostRidePantry.nameFr}), sandwich frais, fruit de saison, graines et café chaud pour reconstituer vos réserves en une seule fois.`
        : `Consolidated recovery meal combining your post-ride portion (${resolvedPostRidePantry.nameEn}), fresh sandwich, seasonal fruit, seeds, and warm coffee to replenish all reserves at once.`,
      items: arrivalItems,
    });
  }

  return (
    <Card
      title={isFr ? t('nutritionTitle') : t('nutriComTitle')}
      subtitle={t('nutriComSub')}
      badge={
        <div className="inline-flex items-center gap-2 flex-wrap">
          {compactReturnBtn}
          {isCoffee && (
            <Badge variant="amber" size="md" dot className="py-1.5 px-3 tnum">
              {isFr ? 'Café Roaster' : 'Espresso reload'}
            </Badge>
          )}
          {renderPacingBadge('yellow-vest')}
          {isQuantitative && (
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              {estimatedBurnKcal} kcal
            </Badge>
          )}
          <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
            {hydrationBadgeLabel}
          </Badge>
        </div>
      }
    >
      {renderLogisticsControlBar()}
      {renderExpeditionManifest()}
      {renderWaterGapAlertBanner()}
      {renderPhaseAccordion(commutePhases)}
    </Card>
  );
};
