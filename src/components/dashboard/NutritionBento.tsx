import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/arc/button/button';
import { Timeline, type TimelineEvent, type TimelineGroupMeta } from '@/components/arc/timeline/timeline';
import {
  ForkKnife,
  Compass,
  Coffee,
  Apple,
  Banana,
  Lightning,
  Package,
  Flame2,
  Trophy,
  Mountains,
  Wine,
  Droplets,
  TriangleAlert,
  Check,
  MapPin,
  Baguette,
  Leaf,
  Shower,
  Plus,
  Clock,
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
  ChecklistItem,
  LogisticsSettings,
  PreRideStyle,
} from '../../types/trip';
import { RiderBikeSpecs, TelemetryMode, formatFuelTarget } from '../../types/specs';
import { useTranslation } from '../../context/LanguageContext';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { resolveCompliantPantry } from '../../data/pantryCatalog';
import { solveTripTimeline, SolvedTripTimeline } from '../../utils/timeline';
import {
  getStationaryRecoveryRuleForTrip,
  resolveEffectiveRestStopMinutes,
} from '../../utils/stationaryRecovery';
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
import { computeClimbSplitsAndFueling } from '../../utils/climbSplits';
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

  // Logistics Settings (meal prep, destination fridge, locations)
  const [localLogistics, setLocalLogistics] = useState<LogisticsSettings>(() => ({
    preRideStyle: trip.ruleSettings?.preRideStyle ?? 'full-breakfast',
    hasDestinationFridge: trip.ruleSettings?.hasDestinationFridge ?? true,
    splitPostRideRecovery: trip.ruleSettings?.splitPostRideRecovery ?? Boolean(trip.customChips?.includes('shower-locker')),
    stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel,
    stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel,
    coffeeDurationMin: trip.ruleSettings?.coffeeDurationMin ?? 15,
    cafeName: trip.ruleSettings?.cafeName,
    rationType: trip.ruleSettings?.rationType,
    plannedLongStopMin: trip.ruleSettings?.plannedLongStopMin,
    plannedLongStopLabel: trip.ruleSettings?.plannedLongStopLabel,
  }));

  useEffect(() => {
    setLocalLogistics({
      preRideStyle: trip.ruleSettings?.preRideStyle ?? 'full-breakfast',
      hasDestinationFridge: trip.ruleSettings?.hasDestinationFridge ?? true,
      splitPostRideRecovery: trip.ruleSettings?.splitPostRideRecovery ?? Boolean(trip.customChips?.includes('shower-locker')),
      stage1LocationLabel: trip.ruleSettings?.stage1LocationLabel,
      stage2LocationLabel: trip.ruleSettings?.stage2LocationLabel,
      coffeeDurationMin: trip.ruleSettings?.coffeeDurationMin ?? 15,
      cafeName: trip.ruleSettings?.cafeName,
      rationType: trip.ruleSettings?.rationType,
      plannedLongStopMin: trip.ruleSettings?.plannedLongStopMin,
      plannedLongStopLabel: trip.ruleSettings?.plannedLongStopLabel,
    });
  }, [trip.id, trip.ruleSettings]);

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
  const telemetryMode: TelemetryMode = riderSpecs.telemetryMode ?? 'fuel-first';
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
  const estimatedBurnKcalNum = Math.round(
    physicsResult?.totalKcalBurn && physicsResult.totalKcalBurn > 0
      ? physicsResult.totalKcalBurn
      : Math.round(distance * 28)
  );
  const estimatedBurnKcal = estimatedBurnKcalNum.toLocaleString(isFr ? 'fr-FR' : 'en-US');

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
        ? `${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydrationPlan.plannedRefillBidons} recharge${hydrationPlan.plannedRefillBidons > 1 ? 's' : ''}`
        : `${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydrationPlan.plannedRefillBidons} refill${hydrationPlan.plannedRefillBidons > 1 ? 's' : ''}`
      : `${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml`;
  void recommendedBidons;

  // Deterministic Timeline Windows using the configurator's planned departure/arrival times
  const solvedTimeline = useMemo(() => {
    const movingSecs = physicsResult?.movingTimeSeconds || movingMinutes * 60;
    return solveTripTimeline(movingSecs, activeChips, localLogistics, {
      departureTimeHHMM: hardDepartureTime || trip.departureTime,
      arrivalTimeHHMM: gateArrivalTime || trip.office?.targetGateArrivalTime,
    });
  }, [
    physicsResult?.movingTimeSeconds,
    movingMinutes,
    activeChips,
    localLogistics,
    hardDepartureTime,
    trip.departureTime,
    gateArrivalTime,
    trip.office?.targetGateArrivalTime,
  ]);

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
  const isLockedCarbTarget =
    riderSpecs?.carbPacingMode === 'locked' ||
    (riderSpecs?.carbPacingMode !== 'auto' &&
      riderSpecs?.riderLevel === 'pro' &&
      carbTarget >= 60);
  const dynamicCarb = calculateIntensityModulatedCarbTarget({
    rideHours: movingMinutes / 60,
    pctFtp,
    carbOxidationGramPerHour:
      physicsResult?.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
    gutCeilingGPerHr: carbTarget,
    totalDays,
    activeChips,
    isLockedCarbTarget,
  });
  const effectiveCeilingGPerHr = dynamicCarb.effectiveCeilingGPerHr;
  const recommendedGPerHr = isLockedCarbTarget
    ? effectiveCeilingGPerHr
    : dynamicCarb.recommendedGPerHr;
  const targetOnBikeCarbsG = isLockedCarbTarget
    ? Math.round(recommendedGPerHr * Math.max(0.5, movingMinutes / 60))
    : dynamicCarb.targetOnBikeCarbsG;
  const pacingTier = dynamicCarb.pacingTier;
  const isEmergencySurge = pctFtp > 105;

  const [showFullProtocol, setShowFullProtocol] = useState(false);
  const [showLogisticsForm, setShowLogisticsForm] = useState<boolean>(false);
  const [manifestOpen, setManifestOpen] = useState<boolean>(false);
  const [showFuelCheckpoints, setShowFuelCheckpoints] = useState<boolean>(false);
  const toggleManifest = useCallback(() => setManifestOpen((prev) => !prev), []);

  useEffect(() => {
    setShowFullProtocol(false);
    setShowLogisticsForm(false);
    setManifestOpen(false);
    setShowFuelCheckpoints(false);
  }, [trip.id]);

  // Fuel Delivery & Palate Strategy (Phase 9)
  const fuelSplit = resolveEffectiveFuelSplit({
    rideHours: movingMinutes / 60,
    pctFtp,
    tempC: trip.weather?.temperatureC ?? 18,
    liquidCarbRatio: riderSpecs.liquidCarbRatio,
    autoModulateLiquidInHeatOrEffort: riderSpecs.autoModulateLiquidInHeatOrEffort,
    enableSavoryPalateResets: riderSpecs.enableSavoryPalateResets,
    isMultiDayTour: totalDays > 1,
  });

  const fuelingCheckpoints = useMemo(() => {
    if (movingMinutes < 90 || !physicsResult) return [];
    return computeClimbSplitsAndFueling(trip, physicsResult, lang, {
      ftpWatts: riderSpecs.ftpWatts,
      carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
      isLockedCarbTarget,
      carbPacingMode: riderSpecs.carbPacingMode,
      riderLevel: riderSpecs.riderLevel,
      nutritionPreference: riderSpecs.nutritionPreference,
      departureTimeHHMM: hardDepartureTime || trip.departureTime,
      bidonSizeMl,
      frameBottleSlots,
    }).checkpoints;
  }, [
    movingMinutes,
    physicsResult,
    trip,
    lang,
    riderSpecs.ftpWatts,
    riderSpecs.carbTargetGPerHr,
    isLockedCarbTarget,
    riderSpecs.carbPacingMode,
    riderSpecs.riderLevel,
    riderSpecs.nutritionPreference,
    hardDepartureTime,
    bidonSizeMl,
    frameBottleSlots,
  ]);

  // Fetch structured nutrition plan items with quantitative & portion labels
  const planPhases = getRealFoodNutritionPlan(
    solvedTimeline.arrivalTimeHHMM,
    solvedTimeline.postRideMealWindow?.split(' – ')[0] ?? '08:50',
    solvedTimeline.departureTimeHHMM,
    lang,
    {
      carbTargetGPerHr: carbTarget,
      isLockedCarbTarget,
      carbPacingMode: riderSpecs?.carbPacingMode,
      riderLevel: riderSpecs?.riderLevel,
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
    ? `~${onBikeKcal} kcal · ${actualAllocatedCarbsG} g C · ${hydrationBadgeLabel}`
    : `${actualFuelUnits} · ${hydrationBadgeLabel}`;

  const hasEscapadeOvernightChip =
    activeChips.includes('hotel-stay') ||
    activeChips.includes('bed-and-breakfast') ||
    activeChips.includes('long-distance-endurance') ||
    activeChips.includes('local-gastronomy') ||
    activeChips.includes('wine-tasting') ||
    activeChips.includes('spa-wellness');
  const isEscapadeCoffeeDay =
    isEscapade &&
    totalDays <= 1 &&
    activeChips.includes('coffee-stop') &&
    !hasEscapadeOvernightChip;

  const defaultStage1Loc = isEscapadeCoffeeDay
    ? isFr
      ? 'Arrivée / Retour'
      : 'Finish / Return'
    : isEscapade
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
    ? 'Destination'
    : 'Destination';

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
          <Badge variant="amber" size="md" icon={Flame2} className="py-1.5 px-3 tnum">
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
    const activeRollout = localLogistics.preRideStyle;
    const isCommuteMode = mode === 'COMMUTE';
    const rolloutLabel =
      activeRollout === 'full-breakfast'
        ? t('logisticsFullMeal')
        : activeRollout === 'light-liquid'
        ? t('logisticsLightLiquid')
        : t('logisticsFasted');

    const totalSweatLiters = Number(
      ((hydrationPlan.sweatRateMlPerHr * (movingMinutes / 60)) / 1000).toFixed(1)
    );
    const croissantsEarned = Number((estimatedBurnKcalNum / 260).toFixed(1));

    return (
      <div className="rounded-pod bg-pod mb-3 p-3 sm:p-3.5 transition-colors">
        {estimatedBurnKcalNum >= 260 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-ink/[0.06] dark:border-white/[0.06] text-xs tnum">
            <span className="inline-flex items-center gap-1.5 text-ink-secondary font-medium">
              <Flame2 className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold text-ink">
                  ~{estimatedBurnKcal} kcal
                </strong>{' '}
                {isFr ? 'brûlées' : 'burned'}{' '}
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  (≈ {croissantsEarned} croissant{croissantsEarned >= 1.5 ? 's' : ''})
                </span>
              </span>
            </span>
            {totalSweatLiters >= 0.3 && (
              <span className="inline-flex items-center gap-1 text-ink-muted font-semibold">
                <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />
                <span>
                  ~{totalSweatLiters} L {isFr ? 'de sueur' : 'sweat lost'}
                </span>
              </span>
            )}
          </div>
        )}
        {/* Compact Read-First Summary Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap text-xs text-ink-secondary tnum">
            <span className="font-semibold text-ink">{rolloutLabel}</span>
            {localLogistics.hasDestinationFridge && (
              <>
                <span className="text-ink-muted hidden sm:inline">·</span>
                <span className="hidden sm:inline text-ink-muted">{t('logisticsFridgeOnSite')}</span>
              </>
            )}
          </div>

          <Button variant="ghost"
            type="button"
            onClick={() => setShowLogisticsForm((v) => !v)}
            aria-expanded={showLogisticsForm}
            className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full bg-card hover:bg-chip text-xs font-rounded font-semibold text-ink transition-colors cursor-pointer shrink-0"
          >
            <span>
              {showLogisticsForm
                ? isFr
                  ? 'Fermer les options'
                  : 'Hide options'
                : isFr
                ? 'Ajuster repas & logistique'
                : 'Adjust meal & logistics'}
            </span>
            <DisclosureChevron open={showLogisticsForm} />
          </Button>
        </div>

        <Collapsible open={showLogisticsForm} innerClassName="pt-3 space-y-2.5">
          <div className="lane-divider mb-2.5" aria-hidden="true" />
          {/* Rollout Style & Pre-Ride Window */}
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <Button variant="ghost"
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => updateLogistics({ preRideStyle: opt.id })}
                    className={`min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-full text-xs font-rounded font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                        : `bg-card text-ink-secondary hover:bg-chip hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>

            <div className="text-xs text-ink-muted tnum">
              <span className="font-rounded font-medium mr-1">{isFr ? 'Créneau :' : 'Window:'}</span>
              <span className="font-semibold text-ink">{solvedTimeline.preRideWindow}</span>
            </div>
          </div>

          <div className="lane-divider" aria-hidden="true" />

          {/* Third Row: Destination Logistics (Fridge & Split Recovery & Locations) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Fridge Toggle */}
              <Button variant="ghost"
                type="button"
                aria-pressed={localLogistics.hasDestinationFridge}
                onClick={() => updateLogistics({ hasDestinationFridge: !localLogistics.hasDestinationFridge })}
                className={`min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  localLogistics.hasDestinationFridge
                    ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                    : `bg-card text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <span>{t('logisticsFridgeOnSite')}</span>
                {localLogistics.hasDestinationFridge && <Check className="w-3 h-3 text-current" />}
              </Button>

              {/* Split Recovery vs Single Meal Toggle (Commute / Workplace routine) */}
              {isCommuteMode && (
                <Button variant="ghost"
                  type="button"
                  aria-pressed={localLogistics.splitPostRideRecovery}
                  onClick={() => updateLogistics({ splitPostRideRecovery: !localLogistics.splitPostRideRecovery })}
                  className={`min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
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
                </Button>
              )}
            </div>
          </div>
        </Collapsible>
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
          ? `Jour ${currentDay}/${totalDays} · ~${totalManifestCarbs} g C (${totalManifestKcal} kcal)`
          : `Day ${currentDay}/${totalDays} · ~${totalManifestCarbs} g carbs (${totalManifestKcal} kcal)`)
      : isFuelFirst
      ? (isFr
          ? `Jour ${currentDay}/${totalDays} · ~${totalManifestUnits} unités totales`
          : `Day ${currentDay}/${totalDays} · ~${totalManifestUnits} total units`)
      : (isFr
          ? `Jour ${currentDay}/${totalDays} · ${recommendedBidons} bidons / étape`
          : `Day ${currentDay}/${totalDays} · ${recommendedBidons} bottles / stage`);

    const manifestSub = isQuantitative
      ? isEmergencySurge
        ? isFr
          ? `${recommendedGPerHr} g/h (Effort intense) · ${prefBadgeLabel}`
          : `${recommendedGPerHr} g/h (High effort) · ${prefBadgeLabel}`
        : recommendedGPerHr === effectiveCeilingGPerHr
        ? isFr
          ? `Max glucides/h (${recommendedGPerHr} g/h) · ${prefBadgeLabel}`
          : `Max carbs/hr (${recommendedGPerHr} g/h) · ${prefBadgeLabel}`
        : isFr
        ? `${recommendedGPerHr} g/h (${powerZoneLabel} · max ${effectiveCeilingGPerHr} g/h) · ${prefBadgeLabel}`
        : `${recommendedGPerHr} g/h target (${powerZoneLabel} pace · ${effectiveCeilingGPerHr} g/h max) · ${prefBadgeLabel}`
      : isFuelFirst
      ? `${fuelUnitsPerHour} ${isFr ? 'unités/h' : 'fuel units/h'} · ${prefBadgeLabel}`
      : `${isFr ? 'Rythme régulier' : 'Steady rhythm'} · ${prefBadgeLabel}`;

    return (
      <div className="rounded-pod bg-pod mb-3 overflow-hidden transition-colors">
        <Button variant="ghost"
          type="button"
          onClick={toggleManifest}
          aria-expanded={manifestOpen}
          className="w-full min-h-[44px] rounded-none p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconBadge theme="amber" icon={Flame2} size="sm" solidBacker />
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
              {isFr ? 'Liste de ravitaillement' : 'Tour packing list'}
            </Badge>
            <DisclosureChevron open={manifestOpen} />
          </div>
        </Button>

        <Collapsible
          open={manifestOpen}
          innerClassName="px-3.5 pb-3.5 pt-1 space-y-3"
        >
          <div className="lane-divider mb-2" aria-hidden="true" />
          {/* Cumulative Ration Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {solidRations.map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-sub-pod bg-card flex flex-col justify-between"
              >
                <span className="text-[11px] font-semibold text-ink-muted line-clamp-1">
                  {r.name}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                  {r.totalUnits}×
                </span>
                <span className="text-[10px] text-ink-muted tnum">
                  {isQuantitative
                    ? `~${r.totalKcal} kcal (${r.totalCarbs} g C)`
                    : `${r.totalUnits} ${r.portionLabel}`}
                </span>
              </div>
            ))}

            <div className="p-2.5 rounded-sub-pod bg-card flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-ink-muted">
                {isFr ? 'Doses électrolytes' : 'Electrolyte tabs'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {electrolyteTabsCount}×
              </span>
              <span className="text-[10px] text-ink-muted tnum">
                {isQuantitative
                  ? `~${electrolyteTabsCount * 500} mg Na+`
                  : `${electrolyteTabsCount} ${isFr ? 'doses bidons' : 'bottle doses'}`}
              </span>
            </div>
          </div>

          {/* Daily Morning Resupply Notice */}
          <div className="lane-divider" aria-hidden="true" />
          <div className={`pt-0.5 flex items-center gap-2 text-xs text-ink-secondary ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
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

  const getShoppingItemId = (name: string) =>
    `shop-${name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

  const shoppingItemIds = useMemo(
    () =>
      new Set(
        (trip.checklist || [])
          .filter((item) => item.isShoppingItem || item.id.startsWith('shop-'))
          .map((item) => item.id)
      ),
    [trip.checklist]
  );

  const handleToggleShoppingItem = (itm: NutritionItem, displayLabel: string) => {
    if (!onUpdateTrip) return;
    const id = getShoppingItemId(itm.name);
    const existingChecklist = trip.checklist || [];
    const exists = existingChecklist.some((c) => c.id === id);

    const nextChecklist: ChecklistItem[] = exists
      ? existingChecklist.filter((c) => c.id !== id)
      : [
          ...existingChecklist,
          {
            id,
            label: isFr ? `Acheter ${displayLabel}` : `Buy ${displayLabel}`,
            category: 'nutrition',
            checked: false,
            critical: false,
            isShoppingItem: true,
          },
        ];

    onUpdateTrip({ ...trip, checklist: nextChecklist });
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
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {groupItems.map((itm, iIdx) => {
            const displayLabel = isFuelFirst
              ? itm.portionLabel || itm.name
              : itm.quantitativeLabel || `${itm.name} (${itm.quantity})`;
            const shopId = getShoppingItemId(itm.name);
            const isInShoppingList = shoppingItemIds.has(shopId);

            return (
              <li
                key={`${itm.name}-${iIdx}`}
                className="py-1.5 px-1 text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block font-rounded font-bold text-ink break-words tnum">
                    {displayLabel}
                  </span>
                  {itm.notes && (
                    <span className="block text-[11px] text-ink-muted leading-snug">{itm.notes}</span>
                  )}
                </div>
                {onUpdateTrip && (
                  <button
                    type="button"
                    onClick={() => handleToggleShoppingItem(itm, displayLabel)}
                    aria-label={
                      isInShoppingList
                        ? isFr
                          ? `Retirer ${displayLabel} de la liste de courses`
                          : `Remove ${displayLabel} from shopping list`
                        : isFr
                        ? `Ajouter « Acheter ${displayLabel} » à la checklist`
                        : `Add "Buy ${displayLabel}" to checklist`
                    }
                    title={
                      isInShoppingList
                        ? isFr
                          ? 'Dans la liste de courses (cliquer pour retirer)'
                          : 'In shopping list (click to remove)'
                        : isFr
                        ? 'Ajouter à la liste de courses'
                        : 'Add to shopping list'
                    }
                    className={`shrink-0 inline-flex items-center gap-1 min-h-[36px] px-3 py-1 rounded-full text-[11px] font-rounded font-bold transition-colors cursor-pointer ${
                      isInShoppingList
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-chip hover:bg-chip-hover text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {isInShoppingList ? (
                      <>
                        <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{isFr ? 'Ajouté' : 'Added'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{isFr ? 'Acheter' : 'Buy'}</span>
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderPhaseAccordion = (phases: NutritionPhaseSpec[]) => {
    const groupLabels: Record<string, TimelineGroupMeta> = {};
    const events: TimelineEvent[] = phases.map((phase, idx) => {
      const hasItems = Boolean(phase.items && phase.items.length > 0);
      const groupKey = phase.stageLabel || `phase-${idx + 1}`;
      const isOnBike = idx === 1;
      const borderAccentClass =
        phase.theme === 'yellow-vest' || phase.theme === 'lime'
          ? 'border-[#a3b300]/60 dark:border-[#dfff00]/45'
          : phase.theme === 'emerald'
          ? 'border-emerald-500/50 dark:border-emerald-400/50'
          : phase.theme === 'rose'
          ? 'border-rose-500/50 dark:border-rose-400/50'
          : 'border-amber-500/50 dark:border-amber-400/50';

      if (!groupLabels[groupKey]) {
        const tokens = CHIP_TOKENS[phase.theme];
        groupLabels[groupKey] = {
          label: phase.stageLabel,
          showDivider: true,
          header: (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rounded font-semibold shrink-0 ${tokens.surface} ${tokens.primary}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tokens.dot}`} />
              {phase.stageLabel}
            </span>
          ),
        };
      }

      return {
        id: phase.id,
        group: groupKey,
        title: `${idx + 1}. ${phase.title}`,
        meta: phase.macroHeadline,
        timeLabel: phase.timingLabel,
        timeFull: `${phase.timingLabel} — ${phase.title}`,
        highlight: isOnBike,
        emphasis: isOnBike ? 'accent' : 'strong',
        marker: (
          <IconBadge
            theme={phase.theme}
            icon={phase.icon}
            size="md"
            isSelected={isOnBike}
            solidBacker
            className="transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          />
        ),
        badge: phase.liquidShiftPill ? (
          <Badge variant="sky" size="xs" dot className="hidden min-[400px]:inline-flex">
            {phase.liquidShiftPill}
          </Badge>
        ) : undefined,
        detail: (
          <div className={`space-y-2.5 pl-2.5 border-l-2 ${borderAccentClass}`}>
            {!hasItems && phase.body && (
              <p className="text-xs sm:text-[13px] text-ink-secondary leading-relaxed">
                {phase.body}
              </p>
            )}

            {hasItems && phase.items && (
              <div className="space-y-2.5">
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
          </div>
        ),
      };
    });

    return (
      <div className="mt-2 space-y-3">
        <Timeline
          key={`nutri-${trip.id}-${phases.map((p) => p.id).join('-')}`}
          events={events}
          label={isFr ? 'Chronologie nutrition' : 'Nutrition timeline'}
          groupBy="custom"
          sortOrder="preserve"
          groupLabels={groupLabels}
          showGroupCount={false}
          connectorStyle="dashed"
          markerSize="md"
          scrollToNew={false}
        />

        {fuelingCheckpoints.length > 0 && (
          <div className="rounded-pod bg-pod overflow-hidden">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowFuelCheckpoints((v) => !v)}
              aria-expanded={showFuelCheckpoints}
              className="w-full min-h-[44px] rounded-none px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left"
            >
              <span className="inline-flex items-center gap-2 text-xs font-rounded font-bold text-ink">
                <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>
                  {isFr
                    ? `Rappels ravito km par km (${fuelingCheckpoints.length})`
                    : `Km-by-km fueling checkpoints (${fuelingCheckpoints.length})`}
                </span>
              </span>
              <DisclosureChevron open={showFuelCheckpoints} />
            </Button>
            <Collapsible open={showFuelCheckpoints} innerClassName="px-3.5 pb-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {fuelingCheckpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className="rounded-sub-pod bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08] px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-ink tnum">{cp.label}</div>
                      <div className="text-[10px] text-ink-muted leading-snug mt-0.5">{cp.detail}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-ink-muted tnum whitespace-nowrap">
                      <Clock className="w-3 h-3 shrink-0" />
                      {cp.etaHHMM || `${cp.elapsedMinutes}m`}
                    </span>
                  </div>
                ))}
              </div>
            </Collapsible>
          </div>
        )}
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
    ? `~${p1Kcal} kcal · ${p1Carbs} g C, ${p1Protein} g P`
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
    ? `~${arrKcal} kcal · ${arrCarbs} g C, ${arrProtein} g P`
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
        stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
        timingLabel: isFr ? '20 min avant' : '20 min before',
        timingVariant: 'zinc',
        macroHeadline: isQuantitative
          ? isFr
            ? '0 g glucides · 350–500 ml d’eau'
            : '0 g carbs · 350–500 ml water'
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
        macroIcon: isQuantitative ? Flame2 : Coffee,
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
              <Badge variant="amber" size="md" icon={Flame2} className="py-1.5 px-3 tnum">
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
        {renderPhaseAccordion(shortPhases)}

        <div className="mt-3 flex justify-end">
          <Button variant="ghost"
            type="button"
            onClick={() => setShowFullProtocol(true)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110`}
          >
            {t('nutriShowFullBtn')}
          </Button>
        </div>
      </Card>
    );
  }

  const compactReturnBtn =
    isShortRide && showFullProtocol ? (
      <Button variant="ghost"
        type="button"
        onClick={() => setShowFullProtocol(false)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110`}
      >
        {t('nutriShowCompactBtn', { min: movingMinutes })}
      </Button>
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
        stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
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
        stageLabel: isFr ? 'En selle' : 'On the bike',
        timingLabel: isKom
          ? isFr
            ? `Bosses · ${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`}`
            : `KOM · ${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`}`
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
              ? `Ravito naturel sur mesure (${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`})`
              : `Real-food fueling (${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`})`
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
                ? `Hydratation régulière + ~${hydrationPlan.sodiumMgPerL} mg sodium/litre pour garder le rythme avec un bon confort digestif.`
                : `Steady hydration + ~${hydrationPlan.sodiumMgPerL} mg sodium/liter to keep energy flowing comfortably.`
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
        macroIcon: isQuantitative ? Flame2 : ForkKnife,
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
        title={t('nutriSportTitle')}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            {renderPacingBadge('yellow-vest')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame2} className="py-1.5 px-3 tnum">
                {estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}× {isFr ? 'bidons' : 'bottles'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
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
        stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
        timingLabel: isMountain ? (isFr ? 'Matin alpin' : 'Alpine morning') : solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline: p1MacroHeadline,
        macroIcon: isQuantitative ? Flame2 : Coffee,
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
        icon: Apple,
        theme: 'lime',
        stageLabel: isFr ? 'En route' : 'On the road',
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
            ? 'Énergie & électrolytes en montée'
            : 'Climbing fuel & electrolytes'
          : isResupply
          ? isFr
            ? 'Halte boulangerie & produits frais'
            : 'Village bakery & fresh snacks'
          : t('nutriBp2Title'),
        body: isMountain
          ? isFr
            ? dietaryFilters.includes('nut-free')
              ? 'Toutes les 20 min : dattes, pâtes de fruits et bidon électrolytes (100 % sans fruits à coque) pour soutenir la montée.'
              : 'Toutes les 20 min : dattes, pâtes d’amandes et bidon électrolytes pour compenser la sueur en montée.'
            : dietaryFilters.includes('nut-free')
            ? 'Every 20 min: dates, fruit chews, and an electrolyte bottle (100% nut-free) to fuel the climb.'
            : 'Every 20 min: dates, almond paste, and an electrolyte bottle to replace climbing sweat.'
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
        macroIcon: isQuantitative ? Flame2 : Package,
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
        title={t('nutriBpTitle')}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            {renderPacingBadge('orange')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame2} className="py-1.5 px-3 tnum">
                ~{estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}× {isFr ? 'bidons' : 'bottles'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderPhaseAccordion(bpPhases)}
      </Card>
    );
  }

  const isCoffee = activeChips.includes('coffee-stop');
  const customCafeName = trip.ruleSettings?.cafeName ? String(trip.ruleSettings.cafeName) : '';
  const rawRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';
  // Older trips carry the chip's old "almond pastry" default: treat it as no custom choice
  const customRation = isLegacyRationDefault(rawRation) ? '' : rawRation;
  const cafeSnack = getCafeSnackSuggestion(dietaryFilters, lang);
  const recoveryRule = getStationaryRecoveryRuleForTrip(trip, solvedTimeline.departureTimeHHMM);
  const coffeeMin = resolveEffectiveRestStopMinutes(
    localLogistics.coffeeDurationMin ?? 15,
    recoveryRule
  );

  // 3. ESCAPADE / LEISURE STAY PROTOCOL
  if (isEscapade) {
    const isPicnic = activeChips.includes('picnic-outing') && !recoveryRule.disableLunchBreak;
    const isGastro =
      activeChips.includes('local-gastronomy') || activeChips.includes('wine-tasting');
    const isSpa = activeChips.includes('spa-wellness');

    const escPhases: NutritionPhaseSpec[] = [
      {
        id: 'esc-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
        timingLabel: solvedTimeline.preRideWindow,
        timingVariant: 'zinc',
        macroHeadline: p1MacroHeadline,
        macroIcon: isQuantitative ? Flame2 : Coffee,
        macroTheme: 'amber',
        title: localLogistics.preRideStyle === 'full-breakfast' ? t('nutriEsc1Title') : preRideTitle,
        body: preRideBody,
        items: preRideItems,
      },
      {
        id: 'esc-2',
        icon: isPicnic ? ForkKnife : isEscapadeCoffeeDay ? Coffee : Compass,
        theme: isPicnic ? 'orange' : isEscapadeCoffeeDay ? 'amber' : 'teal',
        stageLabel: isFr ? 'En route' : 'On the road',
        timingLabel: isPicnic
          ? isFr
            ? 'Pique-nique · 45 min'
            : 'Picnic · 45 min'
          : isEscapadeCoffeeDay
          ? isFr
            ? `Pause café · ${coffeeMin} min`
            : `Café stop · ${coffeeMin} min`
          : isFr
          ? 'En route'
          : 'On the road',
        timingVariant: isPicnic ? 'orange' : isEscapadeCoffeeDay ? 'amber' : 'teal',
        macroHeadline:
          isPicnic && isQuantitative
            ? isFr
              ? '~650 kcal · Pique-nique équilibré'
              : '~650 kcal · Balanced picnic'
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
          : isEscapadeCoffeeDay
          ? customCafeName || (isFr ? 'Pause café en route' : 'Café stop on the way')
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
          : isEscapadeCoffeeDay
          ? isFr
            ? `Pause café prévue (${coffeeMin} min) : ${customRation || cafeSnack}.`
            : `Planned café stop (${coffeeMin} min): ${customRation || cafeSnack}.`
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
          : isEscapadeCoffeeDay
          ? solvedTimeline.postRideConsolidatedWindow || (isFr ? 'Récupération' : 'Recovery')
          : solvedTimeline.postRideConsolidatedWindow || 'Check-in',
        timingVariant: isGastro ? 'rose' : 'emerald',
        macroHeadline: arrMacroHeadline,
        macroIcon: isQuantitative ? Flame2 : ForkKnife,
        macroTheme: isGastro ? 'rose' : 'amber',
        title: isGastro
          ? isFr
            ? 'Étape terroir & dîner gastronomique du soir'
            : 'Evening vineyard dining & terroir table'
          : isSpa
          ? isFr
            ? 'Hydratation spa & dîner récupérateur'
            : 'Spa hydration & restorative dinner'
          : isEscapadeCoffeeDay
          ? isFr
            ? 'Récupération post-sortie & collation'
            : 'Post-ride recovery & snack'
          : t('nutriEsc3Title'),
        body: isGastro
          ? isFr
            ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} après l’étape, puis table réservée avec cuisine de saison.`
            : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} after the ride, followed by seasonal local dining.`
          : isSpa
          ? isFr
            ? `À ${stage1Loc} : eau minérale et infusion après le bain chaud, suivi de ${resolvedPostRidePantry.nameFr} et d’un dîner léger.`
            : `At ${stage1Loc}: mineral water & herbal tea after the thermal bath, followed by ${resolvedPostRidePantry.nameEn} and a light dinner.`
          : isEscapadeCoffeeDay
          ? isFr
            ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et réhydratation fraîche après la sortie café.`
            : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and cool rehydration after your coffee spin.`
          : isFr
          ? `À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et repas complet pour récupérer sereinement.`
          : `At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and a relaxed meal to restore your energy.`,
        items: arrivalItems,
      },
    ];

    return (
      <Card
        title={t('nutriEscTitle')}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            {renderPacingBadge('emerald')}
            {isQuantitative ? (
              <Badge variant="amber" size="md" icon={Flame2} className="py-1.5 px-3 tnum">
                ~{estimatedBurnKcal} kcal
              </Badge>
            ) : (
              <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
                {recommendedBidons}× {isFr ? 'bidons' : 'bottles'}
              </Badge>
            )}
          </div>
        }
      >
        {renderLogisticsControlBar()}
        {renderExpeditionManifest()}
        {renderPhaseAccordion(escPhases)}
      </Card>
    );
  }

  // 4. VÉLOTAF / COMMUTE DEFAULT PROTOCOL (Real Food Items with Dynamic Macros & Logistics)
  const isTempo = activeChips.includes('fitness-boost');
  const isShower = activeChips.includes('shower-locker');

  const commutePhases: NutritionPhaseSpec[] = [
    {
      id: 'com-1',
      icon: Coffee,
      theme: 'amber',
      stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
      timingLabel: solvedTimeline.preRideWindow,
      timingVariant: 'zinc',
      macroHeadline: p1MacroHeadline,
      macroIcon: isQuantitative ? Flame2 : Coffee,
      macroTheme: 'amber',
      title: preRideTitle,
      body: preRideBody,
      items: preRideItems,
    },
    {
      id: 'com-2',
      icon: isCoffee ? Coffee : Banana,
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
          ? `~${p3Kcal} kcal · ${p3Carbs} g C, ${p3Protein} g P`
          : isFuelFirst
          ? formatFuelTarget(p3Carbs, 'fuel-first', lang)
          : isFr
          ? resolvedPostRidePantry.portionLabelFr
          : resolvedPostRidePantry.portionLabelEn,
        macroIcon: isQuantitative ? Flame2 : Package,
        macroTheme: 'yellow-vest',
        title: isShower
          ? isFr
            ? `Collation rapide avant la douche (${stage1Loc})`
            : `Quick snack before your shower (${stage1Loc})`
          : isFr
          ? `Collation de récupération (${stage1Loc})`
          : `Immediate recovery snack (${stage1Loc})`,
        body: isFr
          ? `${resolvedPostRidePantry.nameFr} dès l’arrivée (${stage1Loc}) pour refaire tes réserves tranquillement.`
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
          ? `~${p4Kcal} kcal · ${p4Carbs} g C, ${p4Protein} g P`
          : isFuelFirst
          ? formatFuelTarget(p4Carbs, 'fuel-first', lang)
          : isFr
          ? 'Collation repas au bureau'
          : 'Seated workplace breakfast',
        macroIcon: isQuantitative ? Flame2 : ForkKnife,
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
      macroIcon: isQuantitative ? Flame2 : ForkKnife,
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
      title={t('nutriComTitle')}
      badge={
        <div className="inline-flex items-center gap-2 flex-wrap">
          {compactReturnBtn}
          {renderPacingBadge('yellow-vest')}
          <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
            {hydrationBadgeLabel}
          </Badge>
        </div>
      }
    >
      {renderLogisticsControlBar()}
      {renderExpeditionManifest()}
      {renderPhaseAccordion(commutePhases)}
    </Card>
  );
};
