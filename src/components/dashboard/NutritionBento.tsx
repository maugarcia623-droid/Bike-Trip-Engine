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
  Baguette,
  Leaf,
  Shower,
} from '@/components/icons';
import { Card } from '../common/Card';
import { Badge, BadgeVariant } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
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
  subscribeScanCache,
} from '../../services/overpassCorridor';
import { DEFAULT_CORRIDOR } from './HeroRouteCard';
import { formatKm, formatCriticalGapAdvice, formatGapDetail } from '../../utils/waterGapCopy';
import { getCafeSnackSuggestion, isLegacyRationDefault } from '../../utils/cafeSnack';

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
    stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel,
    stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel,
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
      stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel,
      stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel,
      coffeeDurationMin: trip.ruleSettings?.coffeeDurationMin ?? 15,
      cafeName: trip.ruleSettings?.cafeName,
      rationType: trip.ruleSettings?.rationType,
    });
  }, [trip.id, trip.ruleSettings, mode, gateArrivalTime, hardDepartureTime]);

  const handleUpdateLogistics = useCallback((partial: Partial<LogisticsSettings>) => {
    const updated: LogisticsSettings = { ...localLogistics, ...partial };
    setLocalLogistics(updated);
    if (onUpdateTrip) {
      onUpdateTrip({
        ...trip,
        ruleSettings: {
          ...trip.ruleSettings,
          ...updated,
        },
      });
    }
  }, [localLogistics, trip, onUpdateTrip]);

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
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [manifestOpen, setManifestOpen] = useState<boolean>(false);
  const toggleManifest = useCallback(() => setManifestOpen((prev) => !prev), []);

  useEffect(() => {
    setShowFullProtocol(false);
    setOpenPhases({});
    setManifestOpen(false);
  }, [trip.id]);

  const togglePhase = useCallback((phaseId: string) => {
    setOpenPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
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
  // Live scan results: refresh whenever a corridor scan lands anywhere in the UI (Phase 8)
  const [cachedAmenities, setCachedAmenities] = useState(() => getCachedScan(routeCacheKey) || []);
  useEffect(() => {
    setCachedAmenities(getCachedScan(routeCacheKey) || []);
    return subscribeScanCache((key) => {
      if (key === routeCacheKey || key === '*') {
        setCachedAmenities(getCachedScan(routeCacheKey) || []);
      }
    });
  }, [routeCacheKey]);
  const hasWaterScan = cachedAmenities.length > 0;

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

  // Exact snacks badge matching the card's item count in fuel-first mode (Phase 2 §5):
  // count discrete units (carb bottles + snacks) rather than grams / 20.
  const hasUnitCounts = onBikeItems.some((item) => typeof item.unitCount === 'number');
  const allocatedUnitCount = hasUnitCounts
    ? onBikeItems.reduce((sum, item) => sum + (item.unitCount ?? 0), 0)
    : Math.max(1, Math.round(actualAllocatedCarbsG / 20));
  const actualFuelUnits = isFr
    ? `${allocatedUnitCount} ${allocatedUnitCount > 1 ? 'unités de ravito' : 'unité de ravito'}`
    : `${allocatedUnitCount} fuel unit${allocatedUnitCount > 1 ? 's' : ''}`;

  // Liquid-shift pill reflects the share actually delivered by bottles, not just the intent
  // (fluid volume can cap carb bottles, in which case no shift is claimed).
  const liquidCarbsG = onBikeItems
    .filter((item) => item.isLiquid)
    .reduce((sum, item) => sum + item.carbsGrams, 0);
  const actualLiquidPct =
    actualAllocatedCarbsG > 0 ? Math.round((liquidCarbsG / actualAllocatedCarbsG) * 100) : 0;
  const baselineLiquidPct = Math.round(fuelSplit.baselineLiquidRatio * 100);
  const liquidShiftPill =
    fuelSplit.isLiquidShifted && actualLiquidPct > baselineLiquidPct
      ? isFr
        ? `Plus de liquide aujourd’hui : ${actualLiquidPct} % (${baselineLiquidPct} % d’habitude)`
        : `More from drinks today: ${actualLiquidPct}% (usually ${baselineLiquidPct}%)`
      : undefined;
  const fuelUnitsPerHour = Math.max(1, Math.round(recommendedGPerHr / 20));

  // Supportive pacing label for Fuel-First mode
  const supportivePacingLabel =
    pacingTier === 'light-cruising'
      ? t('nutriPacingLightCruising')
      : pacingTier === 'steady-endurance'
      ? t('nutriPacingSteadyEndurance')
      : t('nutriPacingHighOutput');

  // Unified Phase 2 On-Bike macro headline (shows actual allocated intake + bidons rather than repeating the top pacing badge)
  const onBikeKcal = onBikeItems.reduce((sum, item) => sum + item.kcals, 0);
  const onBikeMacroHeadline = isQuantitative
    ? `~${onBikeKcal} kcal · ${actualAllocatedCarbsG}g C · ${hydrationBadgeLabel}`
    : `${actualFuelUnits} · ${hydrationBadgeLabel}`;

  const defaultStage1Loc = isEscapade
    ? isFr
      ? 'Hôtel / Table d’étape'
      : 'Hotel / Dining'
    : isBikepacking
    ? isFr
      ? 'Camp / Bivouac'
      : 'Camp / Bivouac'
    : isSport
    ? isFr
      ? 'Arrivée d’étape'
      : 'Stage finish'
    : isFr
    ? 'Destination / Vestiaire'
    : 'Destination / Locker';

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
    const isCommuteMode = mode === 'COMMUTE';

    return (
      <div className="rounded-pod bg-pod mb-3 border border-ink/5 dark:border-white/5 p-3 sm:p-3.5 space-y-2.5 transition-colors">
        {/* Top Row: Anchor Toggle & Time Input & Live Timeline Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-full bg-chip/70 p-1 gap-1 text-xs font-rounded font-semibold">
              <button
                type="button"
                aria-pressed={isArriveBy}
                onClick={() =>
                  updateLogistics({
                    timelineAnchorMode: 'arrive-by',
                    anchorTimeHHMM: solvedTimeline.arrivalTimeHHMM,
                  })
                }
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  isArriveBy
                    ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t('logisticsArriveBy')}
              </button>
              <button
                type="button"
                aria-pressed={!isArriveBy}
                onClick={() =>
                  updateLogistics({
                    timelineAnchorMode: 'depart-at',
                    anchorTimeHHMM: solvedTimeline.departureTimeHHMM,
                  })
                }
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  !isArriveBy
                    ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t('logisticsDepartAt')}
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full ring-1 ring-inset ring-ink/10 dark:ring-white/10 font-mono">
              <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <input
                type="time"
                value={localLogistics.anchorTimeHHMM || (isArriveBy ? '08:30' : '07:35')}
                onChange={(e) => {
                  if (e.target.value) {
                    updateLogistics({ anchorTimeHHMM: e.target.value });
                  }
                }}
                className="bg-transparent text-ink text-base sm:text-xs font-bold focus:outline-none cursor-pointer tnum"
                aria-label={t('logisticsAnchorLabel')}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary font-mono flex-wrap tnum">
            {isArriveBy ? (
              <Badge variant="zinc" size="sm" className="tnum">
                {isFr ? 'Départ' : 'Rollout'} <strong className="ml-1 text-ink">{solvedTimeline.departureTimeHHMM}</strong>
              </Badge>
            ) : (
              <Badge variant="zinc" size="sm" className="tnum">
                {isFr ? 'Arrivée' : 'Arrival'} <strong className="ml-1 text-ink">{solvedTimeline.arrivalTimeHHMM}</strong>
              </Badge>
            )}
            <span className="text-[11px] font-rounded text-ink-muted">
              ({solvedTimeline.movingMin} min {isFr ? 'vélo' : 'ride'}{solvedTimeline.dwellMin > 0 ? ` + ${solvedTimeline.dwellMin} min pause` : ''})
            </span>
          </div>
        </div>

        {/* Second Row: Rollout Style & Pre-Ride Window */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-rounded font-semibold text-ink-secondary mr-1">
              {t('logisticsRolloutLabel')}:
            </span>
            {(
              [
                { id: 'full-breakfast' as PreRideStyle, label: t('logisticsFullMeal') },
                { id: 'light-liquid' as PreRideStyle, label: t('logisticsLightLiquid') },
                { id: 'fasted-rollout' as PreRideStyle, label: t('logisticsFasted') },
              ] as const
            ).map((opt) => {
              const isSelected = activeRollout === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => updateLogistics({ preRideStyle: opt.id })}
                  className={`px-3 py-1 rounded-full text-xs font-rounded font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                      : `bg-card text-ink-secondary hover:bg-chip hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-ink-muted tnum">
            <span className="font-rounded font-medium mr-1">{isFr ? 'Créneau :' : 'Window:'}</span>
            <span className="font-semibold text-ink">{solvedTimeline.preRideWindow}</span>
          </div>
        </div>

        {/* Third Row: Destination Logistics (Fridge & Split Recovery & Locations) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fridge Toggle (Text-only chip with Check indicator) */}
            <button
              type="button"
              aria-pressed={localLogistics.hasDestinationFridge}
              onClick={() => updateLogistics({ hasDestinationFridge: !localLogistics.hasDestinationFridge })}
              className={`px-3 py-1 rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                localLogistics.hasDestinationFridge
                  ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                  : `bg-card text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
              }`}
            >
              <span>{t('logisticsFridgeOnSite')}</span>
              {localLogistics.hasDestinationFridge && <Check className="w-3 h-3 text-current" />}
            </button>

            {/* Split Recovery vs Single Meal Toggle (Commute / Workplace routine) */}
            {isCommuteMode && (
              <button
                type="button"
                aria-pressed={localLogistics.splitPostRideRecovery}
                onClick={() => updateLogistics({ splitPostRideRecovery: !localLogistics.splitPostRideRecovery })}
                className={`px-3 py-1 rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  localLogistics.splitPostRideRecovery
                    ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                    : `bg-card text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                {localLogistics.splitPostRideRecovery ? (
                  <Shower className="w-3.5 h-3.5 text-current shrink-0" />
                ) : (
                  <ForkKnife className="w-3.5 h-3.5 text-current shrink-0" />
                )}
                <span>
                  {localLogistics.splitPostRideRecovery
                    ? t('logistics2StageLocker')
                    : t('logisticsSingleArrival')}
                </span>
              </button>
            )}
          </div>

          {/* Location inputs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full ring-1 ring-inset ring-ink/10 dark:ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-500">
              <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <input
                type="text"
                value={localLogistics.stage1LocationLabel ?? ''}
                placeholder={defaultStage1Loc}
                onChange={(e) => updateLogistics({ stage1LocationLabel: e.target.value })}
                className="bg-transparent text-ink text-base sm:text-xs font-rounded placeholder:text-ink-muted w-32 sm:w-36 focus:outline-none"
                title={t('logisticsStage1Location')}
              />
            </div>

            {isCommuteMode && localLogistics.splitPostRideRecovery && (
              <div className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full ring-1 ring-inset ring-ink/10 dark:ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-500">
                <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <input
                  type="text"
                  value={localLogistics.stage2LocationLabel ?? ''}
                  placeholder={isFr ? 'Salle de Pause / Bureau' : 'Break Room / Workspace'}
                  onChange={(e) => updateLogistics({ stage2LocationLabel: e.target.value })}
                  className="bg-transparent text-ink text-base sm:text-xs font-rounded placeholder:text-ink-muted w-32 sm:w-36 focus:outline-none"
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
          ? `${recommendedGPerHr} g/h (Surrégime d’urgence) · ${prefBadgeLabel}`
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
              <h4 className="text-xs sm:text-[13px] font-bold text-ink font-rounded tracking-tight break-words tnum">
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
              className="hidden sm:inline-flex font-rounded"
            >
              {isFr ? 'Manifeste expédition' : 'Expedition manifest'}
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
                <span className="text-[11px] font-semibold text-ink-muted line-clamp-1">
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
              <span className="text-[11px] font-semibold text-ink-muted">
                {isFr ? 'Doses électrolytes' : 'Electrolyte tabs'}
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
          <div className={`pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center gap-2 text-xs text-ink-secondary ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
            {dietaryFilters.includes('gluten-free') ? (
              <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Baguette className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
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

  // Shared food item group (heading + item cards) used by every phase accordion
  const renderItemGroup = (
    heading: string,
    HeadingIcon: React.ElementType | undefined,
    theme: ChipTheme,
    groupItems: NutritionItem[]
  ) => {
    if (groupItems.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <span
          className={`text-[11px] font-semibold font-rounded flex items-center gap-1.5 ${
            HeadingIcon ? CHIP_TOKENS[theme].primary : 'text-ink-muted'
          } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
        >
          {HeadingIcon && <HeadingIcon className="w-4 h-4 shrink-0 text-current" aria-hidden="true" />}
          <span>{heading}</span>
        </span>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {groupItems.map((itm, iIdx) => (
            <li
              key={`${itm.name}-${iIdx}`}
              className="p-2 rounded-sub-pod bg-card text-xs space-y-0.5"
            >
              <span className="block font-medium text-ink break-words tnum">
                {isFuelFirst
                  ? itm.portionLabel || itm.name
                  : itm.quantitativeLabel || `${itm.name} (${itm.quantity})`}
              </span>
              {itm.notes && (
                <span className="block text-[11px] text-ink-muted leading-snug">{itm.notes}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderPhaseAccordion = (phases: NutritionPhaseSpec[]) => (
    <div className="space-y-2.5">
      {phases.map((phase, idx) => {
        const isOpen = Boolean(openPhases[phase.id]);
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
              onClick={() => togglePhase(phase.id)}
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
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-muted flex-wrap tnum">
                    <span className="px-2 py-0.5 rounded-full bg-card font-rounded font-semibold text-ink-muted text-[11px]">
                      {phase.stageLabel}
                    </span>
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
                <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2.5">
                  {phase.items.some((i) => i.isSavoryReset) ? (
                    <>
                      {renderItemGroup(t('nutriGroupBottles'), Droplets, 'sky', phase.items.filter((i) => i.isLiquid))}
                      {renderItemGroup(
                        t('sweetFastEnergy'),
                        Lightning,
                        'amber',
                        phase.items.filter((i) => !i.isSavoryReset && !i.isLiquid)
                      )}
                      {renderItemGroup(t('savoryPalateResets'), ForkKnife, 'emerald', phase.items.filter((i) => i.isSavoryReset))}
                    </>
                  ) : (
                    renderItemGroup(
                      isFuelFirst ? t('nutriGroupPortions') : t('nutriGroupFoodPlan'),
                      undefined,
                      phase.theme,
                      phase.items
                    )
                  )}
                </div>
              )}

              <div className="px-3 py-2 rounded-sub-pod bg-card flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <span className="text-[11px] font-rounded font-semibold text-ink-muted">
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
    // Without a corridor scan the whole route reads as one dry gap: never alert on that.
    if (!hasWaterScan || !waterGaps || (waterGaps.status !== 'critical' && waterGaps.status !== 'caution')) {
      return null;
    }

    const targetGap =
      waterGaps.criticalGaps[0] ||
      waterGaps.cautionGaps[0] ||
      waterGaps.gaps.find((g) => g.distanceKm === waterGaps.maxGapKm) ||
      waterGaps.gaps[0];

    if (!targetGap) return null;

    const isCritical = waterGaps.status === 'critical';
    const startKm = formatKm(targetGap.startKm, lang);
    const endKm = formatKm(targetGap.endKm, lang);

    return (
      <div
        role="status"
        className={`mb-3 p-3 rounded-pod flex items-start gap-2.5 ring-1 ring-inset ${
          isCritical
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-rose-500/40 shadow-beacon-red'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-amber-500/40 shadow-beacon-amber'
        }`}
      >
        <TriangleAlert
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        />
        <div className="min-w-0 flex-1 space-y-0.5 text-xs">
          <div className="font-bold font-rounded">
            {isCritical
              ? t('hydrationCritical', {
                  gap: formatKm(targetGap.distanceKm, lang),
                  start: startKm,
                  end: endKm,
                  advice: formatCriticalGapAdvice(targetGap, lang),
                })
              : t('hydrationCaution', {
                  gap: formatKm(targetGap.distanceKm, lang),
                  start: startKm,
                  end: endKm,
                })}
          </div>
          <div className="text-[11px] font-rounded tnum opacity-90">
            {formatGapDetail(targetGap, lang)}
          </div>
        </div>
      </div>
    );
  };

  // Shared Pre-Ride & Post-Ride Pantry + Logistics bindings across all archetypes (Phase 4 & 5)
  const preRideItems = planPhases.find((p) => p.phaseId === 'pre-ride')?.items || [];
  const p1Kcal = preRideItems.reduce((s, it) => s + it.kcals, 0);
  const p1Carbs = preRideItems.reduce((s, it) => s + it.carbsGrams, 0);
  const p1Protein = preRideItems.reduce((s, it) => s + it.proteinGrams, 0);

  const lockerItems = planPhases.find((p) => p.phaseId === 'locker-refuel')?.items || [];
  const breakRoomItems = planPhases.find((p) => p.phaseId === 'break-room')?.items || [];
  const rawArrivalItems = planPhases.find((p) => p.phaseId === 'arrival-recovery')?.items;
  const arrivalItems = rawArrivalItems || [...lockerItems, ...breakRoomItems];
  const arrKcal = arrivalItems.reduce((s, it) => s + it.kcals, 0);
  const arrCarbs = arrivalItems.reduce((s, it) => s + it.carbsGrams, 0);
  const arrProtein = arrivalItems.reduce((s, it) => s + it.proteinGrams, 0);

  const stage1Loc = localLogistics.stage1LocationLabel || defaultStage1Loc;
  const stage2Loc = localLogistics.stage2LocationLabel || (isFr ? 'Salle de Pause / Espace Bureau' : 'Break Room / Workspace');

  const p1MacroHeadline = isQuantitative
    ? `~${p1Kcal} kcal · ${p1Carbs}g C, ${p1Protein}g P`
    : isFuelFirst
    ? p1Carbs > 0
      ? formatFuelTarget(p1Carbs, 'fuel-first', lang)
      : isFr
      ? 'Hydratation seule'
      : 'Hydration only'
    : isFr
    ? 'Repas digeste au calme'
    : 'Comfortable pre-ride meal';

  const arrMacroHeadline = isQuantitative
    ? `~${arrKcal} kcal · ${arrCarbs}g C, ${arrProtein}g P`
    : isFuelFirst
    ? formatFuelTarget(arrCarbs, 'fuel-first', lang)
    : isFr
    ? 'Repas de récupération complet'
    : 'Consolidated recovery meal';

  const preRideTitle =
    localLogistics.preRideStyle === 'fasted-rollout'
      ? isFr
        ? 'Départ léger et hydratation'
        : 'Light start and hydration'
      : localLogistics.preRideStyle === 'light-liquid'
      ? isFr
        ? 'Petite boisson avant de partir'
        : 'Quick drink before you leave'
      : isFr
      ? 'Petit-déjeuner avant de partir'
      : 'Breakfast before you ride';

  const preRideBody =
    localLogistics.preRideStyle === 'fasted-rollout'
      ? isFr
        ? 'Un expresso et un verre d’eau avec une pincée de sel, 15 min avant de partir. Vous mangerez en roulant.'
        : 'An espresso and a glass of water with a pinch of salt, 15 min before you leave. You’ll eat once you’re rolling.'
      : localLogistics.preRideStyle === 'light-liquid'
      ? isFr
        ? 'Un petit verre de jus ou de boisson légère, un expresso et de l’eau, 20 min avant de partir. Léger pour l’estomac.'
        : 'A small glass of juice or a light drink, an espresso and some water, 20 min before you leave. Easy on the stomach.'
      : isFr
      ? `${compliantPantry.preRide.nameFr}, un expresso et un grand verre d’eau avec une pincée de sel, environ 45 min avant de partir.`
      : `${compliantPantry.preRide.nameEn}, an espresso and a tall glass of water with a pinch of salt, about 45 min before you leave.`;

  const primarySolidName = isFr
    ? compliantPantry.onBikeSolids[0]?.nameFr || 'collation de poche'
    : compliantPantry.onBikeSolids[0]?.nameEn || 'pocket snack';

  // ── INTUITIVE MODE: CHRONOLOGICAL RHYTHM CUES & HYDRATION RADAR ONLY ──
  if (isIntuitive) {
    const intuitivePhases: NutritionPhaseSpec[] = [
      {
        id: 'int-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
        timingLabel: solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline:
          localLogistics.preRideStyle === 'fasted-rollout'
            ? isFr
              ? 'Hydratation & café au calme'
              : 'Light hydration & coffee'
            : localLogistics.preRideStyle === 'light-liquid'
            ? isFr
              ? 'Boisson légère avant départ'
              : 'Light drink before rollout'
            : isFr
            ? 'Repas digeste et hydratation au calme'
            : 'Comfortable pre-ride meal',
        macroIcon: Coffee,
        macroTheme: 'amber',
        title: preRideTitle,
        body: preRideBody,
      },
      {
        id: 'int-2',
        icon: Droplets,
        theme: 'sky',
        stageLabel: isFr ? 'En selle' : 'In the saddle',
        timingLabel: isFr ? 'Toutes les 15–20 min' : 'Every 15–20 min',
        timingVariant: 'sky',
        macroHeadline: isFr ? '1 gorgée régulière & petite bouchée' : 'Sip water & take a small bite',
        macroIcon: Droplets,
        macroTheme: 'sky',
        title: isFr
          ? 'Toutes les 15–20 min : une gorgée d’eau et une petite bouchée'
          : 'Every 15–20 min: sip water & take a small bite',
        body: isFr
          ? `Buvez une gorgée d’eau toutes les 15 à 20 min. Pour les sorties de plus d’une heure, prenez une petite bouchée (${primarySolidName}) à intervalles réguliers pour garder une énergie constante sans alourdir l’estomac.`
          : `Take a comfortable sip of water every 15–20 min. On rides over an hour, take a small bite (${primarySolidName}) at steady intervals to keep energy smooth without weighing down your stomach.`,
      },
      {
        id: 'int-3',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: stage1Loc,
        timingLabel: isFr ? 'Sous 30 min' : 'Within 30 min',
        timingVariant: 'emerald',
        macroHeadline: isFr ? 'Réhydratation & repas de récupération' : 'Rehydrate & recovery meal',
        macroIcon: ForkKnife,
        macroTheme: 'emerald',
        title: isFr
          ? 'À l’arrivée : boire et manger dans les 30 min'
          : 'At arrival: rehydrate & eat within 30 min',
        body: isFr
          ? `Dès l’arrivée (${stage1Loc}), buvez un grand verre d’eau et prenez votre collation de récupération (${resolvedPostRidePantry.nameFr}) dans les 30 min pour refaire vos forces sereinement.`
          : `Upon arrival (${stage1Loc}), drink a tall glass of water and enjoy your recovery meal or snack (${resolvedPostRidePantry.nameEn}) within 30 min to restore energy comfortably.`,
      },
    ];

    return (
      <Card
        title={isFr ? 'Guidage & rythme intuitif' : 'Intuitive rhythm & hydration'}
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
        timingLabel: 'T − 20 min',
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
        stageLabel: stage1Loc,
        timingLabel: solvedTimeline.arrivalTimeHHMM || (isFr ? 'Arrivée' : 'Arrival'),
        timingVariant: 'emerald',
        macroHeadline: arrMacroHeadline,
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'emerald',
        title: t('nutriShort2Title'),
        body: isFr
          ? `${resolvedPostRidePantry.nameFr} à l’arrivée (${stage1Loc}) avec un grand verre d’eau et un café ou thé.`
          : `${resolvedPostRidePantry.nameEn} upon arrival (${stage1Loc}) with a glass of water and coffee or tea.`,
        items: arrivalItems,
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
        stageLabel: isFr ? 'Avant de partir' : 'Pre-load carbs',
        timingLabel: solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline: p1MacroHeadline,
        macroIcon: Lightning,
        macroTheme: 'yellow-vest',
        title: localLogistics.preRideStyle === 'full-breakfast' ? t('nutriSport1Title') : preRideTitle,
        body: preRideBody,
        items: preRideItems,
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
              ? `Ravito naturel calibré (${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`})`
              : `Calibrated real-food fueling (${isQuantitative ? `${recommendedGPerHr}g/h` : `${fuelUnitsPerHour} un/h`})`
            : isHydration
            ? isFr
              ? 'Glucides & recharge électrolytes'
              : 'Carb & electrolyte hydration'
            : isKom
            ? isFr
              ? 'Énergie rapide pour les bosses'
              : 'Quick energy for punchy climbs'
            : t('nutriSport2Title'),
        body:
          nutPref === 'real-food'
            ? isFr
              ? `Ravito régulier avec des aliments simples : ${compliantPantry.onBikeLiquid.nameFr} et collations de poche (${compliantPantry.onBikeSolids.map((s) => s.nameFr).join(', ')}).`
              : `Steady fueling using whole foods: ${compliantPantry.onBikeLiquid.nameEn} and pocket snacks (${compliantPantry.onBikeSolids.map((s) => s.nameEn).join(', ')}).`
            : isHydration
            ? isQuantitative
              ? isFr
                ? `Apport régulier + ~${hydrationPlan.sodiumMgPerL} mg sodium/litre pour faciliter l’absorption sans inconfort digestif.`
                : `Steady hydration + ~${hydrationPlan.sodiumMgPerL}mg sodium/liter to match your digestion rate comfortably.`
              : isFr
              ? 'Buvez par petites gorgées régulières avec des électrolytes pour rester bien hydraté.'
              : 'Sip steadily with electrolytes to stay comfortably hydrated.'
            : t('nutriSport2Body'),
      },
      {
        id: 'sport-3',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: stage1Loc,
        timingLabel: solvedTimeline.postRideConsolidatedWindow || t('nutriSport3Badge'),
        timingVariant: 'emerald',
        macroHeadline: arrMacroHeadline,
        macroIcon: isQuantitative ? Flame : ForkKnife,
        macroTheme: 'emerald',
        title: t('nutriSport3Title'),
        body: isFr
          ? `À l’arrivée (${stage1Loc}), prenez votre collation de récupération (${resolvedPostRidePantry.nameFr}) et un repas complet avec de l’eau fraîche.`
          : `At ${stage1Loc}, enjoy your recovery portion (${resolvedPostRidePantry.nameEn}) and a balanced meal with fresh water.`,
        items: arrivalItems,
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
        timingLabel: isMountain ? (isFr ? 'Matin alpin' : 'Alpine morning') : solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline: p1MacroHeadline,
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'amber',
        title:
          localLogistics.preRideStyle !== 'full-breakfast'
            ? preRideTitle
            : isMountain
            ? isFr
              ? 'Petit-déjeuner de montagne avant les cols'
              : 'Mountain breakfast before the climbs'
            : t('nutriBp1Title'),
        body:
          localLogistics.preRideStyle !== 'full-breakfast'
            ? preRideBody
            : isMountain
            ? isFr
              ? `${compliantPantry.preRide.nameFr}, un café chaud et un grand verre d’eau pour aborder les températures fraîches des cols.`
              : `${compliantPantry.preRide.nameEn}, hot coffee and a tall glass of water to tackle cold morning col temperatures.`
            : preRideBody,
        items: preRideItems,
      },
      {
        id: 'bp-2',
        icon: AppleLogo,
        theme: 'lime',
        stageLabel: isFr ? 'Cadence horaire' : 'Rolling intake',
        timingLabel: isMountain
          ? isFr
            ? 'Pentes fortes'
            : 'Steep pitches'
          : isFr
          ? 'Toutes les 25 min'
          : 'Every 25 min',
        timingVariant: 'lime',
        macroHeadline: onBikeMacroHeadline,
        macroIcon: Lightning,
        macroTheme: 'lime',
        items: onBikeItems,
        liquidShiftPill,
        title: isMountain
          ? isFr
            ? 'Rations roulantes & électrolytes en montée'
            : 'Ascent grazing & electrolyte buffer'
          : isResupply
          ? isFr
            ? 'Ravitaillement boulangerie & produits frais'
            : 'Village bakery & fresh resupply grazing'
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
        stageLabel: stage1Loc,
        timingLabel: isMountain ? (isFr ? 'Camp bivouac' : 'Bivouac dusk') : solvedTimeline.postRideConsolidatedWindow || (isFr ? 'Soirée' : 'Evening'),
        timingVariant: 'orange',
        macroHeadline: arrMacroHeadline,
        macroIcon: isQuantitative ? Flame : Package,
        macroTheme: 'orange',
        title: isMountain
          ? isFr
            ? 'Dîner bivouac de montagne au réchaud'
            : 'Mountain bivouac warm camp dinner'
          : isBivouac
          ? isFr
            ? 'Repas bivouac & eau filtrée'
            : 'Wild bivouac meal & filtered water'
          : t('nutriBp3Title'),
        body: isMountain
          ? isFr
            ? dietaryFilters.includes('vegan')
              ? `À ${stage1Loc} : plat chaud végétal (lentilles corail & riz curry), ${resolvedPostRidePantry.nameFr} et infusion chaude pour la nuit.`
              : `À ${stage1Loc} : plat chaud au réchaud, ${resolvedPostRidePantry.nameFr}, chocolat noir et infusion chaude pour la nuit.`
            : dietaryFilters.includes('vegan')
            ? `At ${stage1Loc}: hot plant-based lentil & curry rice stew, ${resolvedPostRidePantry.nameEn} and herbal tea for the night.`
            : `At ${stage1Loc}: hot camp stew, ${resolvedPostRidePantry.nameEn}, dark chocolate & herbal tea for the night.`
          : isBivouac
          ? isFr
            ? `Eau filtrée au camp (${stage1Loc}), repas chaud avec ${resolvedPostRidePantry.nameFr} pour bien récupérer avant le lendemain.`
            : `Filtered water at camp (${stage1Loc}), warm meal with ${resolvedPostRidePantry.nameEn} to recover well for tomorrow.`
          : isFr
          ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et repas complet du soir pour recharger vos réserves avant l’étape suivante.`
          : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and a hearty evening meal to refuel for tomorrow’s stage.`,
        items: arrivalItems,
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
        timingLabel: solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline: p1MacroHeadline,
        macroIcon: isQuantitative ? Flame : Coffee,
        macroTheme: 'amber',
        title: localLogistics.preRideStyle === 'full-breakfast' ? t('nutriEsc1Title') : preRideTitle,
        body: preRideBody,
        items: preRideItems,
      },
      {
        id: 'esc-2',
        icon: isPicnic ? ForkKnife : Compass,
        theme: isPicnic ? 'orange' : 'teal',
        stageLabel: isFr ? 'Hydratation' : 'Cruising fuel',
        timingLabel: isPicnic
          ? isFr
            ? 'Pique-nique · 45 min'
            : 'Picnic · 45 min'
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
            ? 'Déjeuner pique-nique du terroir au bord de l’eau'
            : 'Artisanal waterside picnic feast'
          : isQuantitative
          ? t('nutriEsc2Title', { carbs: recommendedGPerHr })
          : isFr
          ? `Ravito de balade (~${fuelUnitsPerHour} unités/h)`
          : `Cruising fuel (~${fuelUnitsPerHour} fuel units/h)`,
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
        stageLabel: stage1Loc,
        timingLabel: isGastro
          ? isFr
            ? 'Dîner 19:45'
            : 'Dining 19:45'
          : isSpa
          ? isFr
            ? 'Spa & dîner'
            : 'Spa & dining'
          : solvedTimeline.postRideConsolidatedWindow || 'Check-in',
        timingVariant: isGastro ? 'rose' : 'emerald',
        macroHeadline: arrMacroHeadline,
        macroIcon: isQuantitative ? Flame : ForkKnife,
        macroTheme: isGastro ? 'rose' : 'amber',
        title: isGastro
          ? isFr
            ? 'Étape terroir & dîner gastronomique du soir'
            : 'Evening vineyard dining & terroir table'
          : isSpa
          ? isFr
            ? 'Hydratation spa & dîner récupérateur'
            : 'Spa hydration & restorative dinner'
          : t('nutriEsc3Title'),
        body: isGastro
          ? isFr
            ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} après l’étape, puis table réservée avec cuisine de saison.`
            : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} after the ride, followed by seasonal local dining.`
          : isSpa
          ? isFr
            ? `À ${stage1Loc} : eau minérale et infusion après le bain chaud, suivi de ${resolvedPostRidePantry.nameFr} et d’un dîner léger.`
            : `At ${stage1Loc}: mineral water & herbal tea after the thermal bath, followed by ${resolvedPostRidePantry.nameEn} and a light dinner.`
          : isFr
          ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et repas complet pour récupérer sereinement.`
          : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and a relaxed meal to restore your energy.`,
        items: arrivalItems,
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
  const rawRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';
  // Older trips carry the chip's old "almond pastry" default: treat it as no custom choice
  const customRation = isLegacyRationDefault(rawRation) ? '' : rawRation;
  const cafeSnack = getCafeSnackSuggestion(dietaryFilters, lang);
  const coffeeMin = localLogistics.coffeeDurationMin ?? 15;

  const commutePhases: NutritionPhaseSpec[] = [
    {
      id: 'com-1',
      icon: Coffee,
      theme: 'amber',
      stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
      timingLabel: solvedTimeline.preRideWindow,
      timingVariant: 'zinc',
      macroHeadline: p1MacroHeadline,
      macroIcon: isQuantitative ? Flame : Coffee,
      macroTheme: 'amber',
      title: preRideTitle,
      body: preRideBody,
      items: preRideItems,
    },
    {
      id: 'com-2',
      icon: isCoffee ? Coffee : AppleLogo,
      theme: isCoffee ? 'amber' : 'lime',
      stageLabel: isFr ? 'En route' : 'On the road',
      timingLabel: isCoffee
        ? isFr
          ? `Pause café · ${coffeeMin} min`
          : `Café stop · ${coffeeMin} min`
        : `${solvedTimeline.departureTimeHHMM} – ${solvedTimeline.arrivalTimeHHMM}`,
      timingVariant: isCoffee ? 'amber' : 'lime',
      macroHeadline: onBikeMacroHeadline,
      macroIcon: Lightning,
      macroTheme: 'lime',
      title: isCoffee
        ? customCafeName || (isFr ? 'Pause café en route' : 'Café stop on the way')
        : isTempo
        ? isFr
          ? 'Ravito allure soutenue'
          : 'Steady-pace fuel'
        : t('nutriCom2Title'),
      body: isCoffee
        ? isFr
          ? `Pause café prévue (${coffeeMin} min) : ${customRation || cafeSnack}.`
          : `Planned café stop (${coffeeMin} min): ${customRation || cafeSnack}.`
        : isTempo
        ? isFr
          ? `${compliantPantry.onBikeLiquid.nameFr} et une petite collation régulière pour garder le rythme.`
          : `${compliantPantry.onBikeLiquid.nameEn} and a small snack at regular intervals to hold your pace.`
        : t('nutriCom2Body'),
      items: onBikeItems,
      liquidShiftPill,
    },
  ];

  if (localLogistics.splitPostRideRecovery) {
    const p3Kcal = lockerItems.reduce((s, it) => s + it.kcals, 0);
    const p3Carbs = lockerItems.reduce((s, it) => s + it.carbsGrams, 0);
    const p3Protein = lockerItems.reduce((s, it) => s + it.proteinGrams, 0);

    const p4Kcal = breakRoomItems.reduce((s, it) => s + it.kcals, 0);
    const p4Carbs = breakRoomItems.reduce((s, it) => s + it.carbsGrams, 0);
    const p4Protein = breakRoomItems.reduce((s, it) => s + it.proteinGrams, 0);
    const breakRoomNames = breakRoomItems.map((it) => it.name).join(', ');

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
            ? `Collation rapide avant la douche (${stage1Loc})`
            : `Quick snack before your shower (${stage1Loc})`
          : isFr
          ? `Collation de récupération (${stage1Loc})`
          : `Immediate recovery snack (${stage1Loc})`,
        body: isFr
          ? `${resolvedPostRidePantry.nameFr} dès l’arrivée (${stage1Loc}) pour refaire vos réserves tranquillement.`
          : `${resolvedPostRidePantry.nameEn} upon arrival (${stage1Loc}) to start refueling comfortably.`,
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
          ? `Repas & café du matin (${stage2Loc})`
          : `Morning meal & coffee (${stage2Loc})`,
        body: isFr
          ? `Repas complet au calme (${stage2Loc}) : ${breakRoomNames}.`
          : `Balanced seated meal (${stage2Loc}): ${breakRoomNames}.`,
        items: breakRoomItems,
      }
    );
  } else {
    const arrivalNames = arrivalItems.map((it) => it.name).join(', ');

    commutePhases.push({
      id: 'com-arrival',
      icon: ForkKnife,
      theme: 'emerald',
      stageLabel: stage1Loc,
      timingLabel: solvedTimeline.postRideConsolidatedWindow || '08:40 – 09:00',
      timingVariant: 'emerald',
      macroHeadline: arrMacroHeadline,
      macroIcon: isQuantitative ? Flame : ForkKnife,
      macroTheme: 'emerald',
      title: isFr
        ? `Repas d’arrivée (${stage1Loc})`
        : `Arrival recovery meal (${stage1Loc})`,
      body: isFr
        ? `Repas complet à l’arrivée (${stage1Loc}) : ${arrivalNames}.`
        : `Complete recovery meal upon arrival (${stage1Loc}): ${arrivalNames}.`,
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
