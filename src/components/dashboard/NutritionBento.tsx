import React, { useState, useEffect, useCallback } from 'react';
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
import { TripProfile, PhysicsCalculationResult, NutritionItem } from '../../types/trip';
import { RiderBikeSpecs, TelemetryMode, formatFuelTarget } from '../../types/specs';
import { useTranslation } from '../../context/LanguageContext';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import {
  getRealFoodNutritionPlan,
  calculateDynamicCarbTarget,
  getBottomUpPortionCounts,
  MEDJOOL_DATE,
  FRUIT_CHEW_PIECE,
  ENERGY_GEL_UNIT,
} from '../../utils/nutrition';

interface NutritionBentoProps {
  trip: TripProfile;
  hardDepartureTime?: string;
  gateArrivalTime?: string;
  physicsResult?: PhysicsCalculationResult;
  riderSpecs?: RiderBikeSpecs;
  onOpenSpecs?: () => void;
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
  gateArrivalTime,
  physicsResult,
  riderSpecs: riderSpecsProp,
  onOpenSpecs,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const mode = getArchetypeFromTag(trip.tag, trip.name);
  const isEscapade = mode === 'ESCAPADE';
  const isSport = mode === 'SPORT';
  const isBikepacking = mode === 'BIKEPACKING';

  // Reactive rider gut absorption & telemetry philosophy settings
  const riderSpecs = riderSpecsProp || loadRiderBikeSpecs();
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

  // Hydration calculation: 1 bidon per ~45 km or 1.5h
  const recommendedBidons = Math.min(3, Math.max(1, Math.ceil(distance / 45)));

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
  const isModerateRide = movingMinutes >= 45 && movingMinutes < 90;

  // Intensity-modulated carbohydrate target (EQ-13 upgrade)
  const pctFtp = physicsResult?.ftpPercent ?? 72;
  const powerZoneLabel = physicsResult?.powerZone || 'Z2';
  const dynamicCarb = calculateDynamicCarbTarget(
    movingMinutes / 60,
    pctFtp,
    physicsResult?.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
    carbTarget,
    totalDays
  );
  const effectiveHourlyRateG = dynamicCarb.effectiveHourlyRateG;
  const targetOnBikeCarbsG = dynamicCarb.targetOnBikeCarbsG;

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

  // Fetch structured nutrition plan items with quantitative & portion labels
  const planPhases = getRealFoodNutritionPlan(
    gateArrivalTime || trip.office?.targetGateArrivalTime || '08:30',
    trip.office?.shiftStartTime || '09:00',
    trip.departureTime || '07:35',
    lang,
    {
      carbTargetGPerHr: carbTarget,
      rideHours: movingMinutes / 60,
      nutritionPreference: nutPref,
      pctFtp,
      carbOxidationGramPerHour: physicsResult?.carbOxidationGramPerHour ?? Math.round(carbTarget * 1.8),
      totalDays,
    }
  );

  const onBikePhase = planPhases.find((p) => p.phaseId === 'on-bike');
  const onBikeItems = onBikePhase?.items || [];
  const actualAllocatedCarbsG = onBikeItems.reduce((sum, item) => sum + item.carbsGrams, 0);

  // Exact snacks badge matching card item count in fuel-first mode
  const actualFuelUnits = formatFuelTarget(actualAllocatedCarbsG, 'fuel-first', lang);
  const fuelUnitsPerHour = Math.max(1, Math.round(effectiveHourlyRateG / 20));

  const renderExpeditionManifest = () => {
    if (totalDays <= 1) return null;

    const dailyPortions = getBottomUpPortionCounts(targetOnBikeCarbsG, nutPref, movingMinutes / 60);

    // Multi-day ration totals: multiply daily bottom-up integer unit counts by totalDays
    const dailyDates = Math.max(2, dailyPortions.datesCount);
    const dailyFigs = Math.max(2, Math.round(dailyPortions.chewsCount > 0 ? dailyPortions.chewsCount : 2));
    const dailyPastes = Math.max(
      1,
      Math.round(
        nutPref === 'sports-fuel'
          ? dailyPortions.gelsCount
          : dailyPortions.chewsCount > 0
          ? dailyPortions.chewsCount
          : 1
      )
    );

    const datesCount = dailyDates * totalDays;
    const figsCount = dailyFigs * totalDays;
    const fruitPastesCount = dailyPastes * totalDays;
    const electrolyteTabsCount = totalDays * 2;

    // Derive manifest totals strictly from integer counts
    const manifestDatesCarbs = datesCount * MEDJOOL_DATE.carbsG;
    const manifestDatesKcal = datesCount * MEDJOOL_DATE.kcal;

    const manifestFigsCarbs = figsCount * FRUIT_CHEW_PIECE.carbsG;
    const manifestFigsKcal = figsCount * FRUIT_CHEW_PIECE.kcal;

    const pasteUnitCarbs = nutPref === 'sports-fuel' ? ENERGY_GEL_UNIT.carbsG : FRUIT_CHEW_PIECE.carbsG;
    const pasteUnitKcal = nutPref === 'sports-fuel' ? ENERGY_GEL_UNIT.kcal : FRUIT_CHEW_PIECE.kcal;
    const manifestPastesCarbs = fruitPastesCount * pasteUnitCarbs;
    const manifestPastesKcal = fruitPastesCount * pasteUnitKcal;

    const totalManifestCarbs = manifestDatesCarbs + manifestFigsCarbs + manifestPastesCarbs;
    const totalManifestKcal = manifestDatesKcal + manifestFigsKcal + manifestPastesKcal;
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
      ? effectiveHourlyRateG < carbTarget
        ? isFr
          ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h) · ${prefBadgeLabel}`
          : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap) · ${prefBadgeLabel}`
        : `${effectiveHourlyRateG}g/h · ${prefBadgeLabel}`
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
          {/* 4-Item Cumulative Ration Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {isFr ? 'Dattes Medjool' : 'Medjool Dates'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {datesCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">
                {isQuantitative
                  ? `~${manifestDatesKcal} kcal (${manifestDatesCarbs}g C)`
                  : `${datesCount} ${isFr ? 'fruits' : 'fruit snacks'}`}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {isFr ? 'Figues Séchées' : 'Turkish Figs'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {figsCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">
                {isQuantitative
                  ? `~${manifestFigsKcal} kcal (${manifestFigsCarbs}g C)`
                  : `${figsCount} ${isFr ? 'fruits' : 'fruit snacks'}`}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {nutPref === 'sports-fuel'
                  ? isFr
                    ? 'Gels Énergétiques'
                    : 'Energy Gels'
                  : isFr
                  ? 'Pâtes de Fruits'
                  : 'Fruit Chews'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {fruitPastesCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">
                {isQuantitative
                  ? `~${manifestPastesKcal} kcal (${manifestPastesCarbs}g C)`
                  : `${fruitPastesCount} ${isFr ? 'snacks de poche' : 'pocket snacks'}`}
              </span>
            </div>

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

          {/* Daily Morning Bakery Resupply Notice */}
          <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center gap-2 text-xs text-ink-secondary">
            <span className="text-sm">🥖</span>
            <span className="text-[11px] sm:text-xs">
              {isFr
                ? `Ravitaillement boulangerie : 1 baguette fraîche + fruits frais chaque matin au départ d’étape.`
                : `Daily morning bakery resupply: 1 fresh baguette + fresh local fruit at each stage start.`}
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] sm:text-sm font-bold font-rounded text-ink leading-snug break-words tnum">
                      {idx + 1}. {phase.title}
                    </span>
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
                <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 space-y-1.5">
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
              {isFr ? 'Rythme régulier' : 'Steady rhythm'}
            </Badge>
            <Badge variant="sky" size="md" icon={Droplets} className="py-1.5 px-3 tnum">
              {recommendedBidons}x {isFr ? 'bidons' : 'bidons'}
            </Badge>
          </div>
        }
      >
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
              {recommendedBidons}x {isFr ? 'bidons' : 'bidons'}
            </Badge>
          </div>
        }
      >
        {renderExpeditionManifest()}
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
    const minCarbRange = Math.max(25, effectiveHourlyRateG - 10);
    const sportCarbLabel = isQuantitative
      ? isModerateRide
        ? t('nutriModCarbBadge', { min: movingMinutes })
        : effectiveHourlyRateG < carbTarget
        ? isFr
          ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
          : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
        : `${minCarbRange}–${effectiveHourlyRateG}g carbs/h`
      : actualFuelUnits;

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
            ? `Bosses · ${isQuantitative ? `${effectiveHourlyRateG}g/h` : `${Math.max(1, Math.round(effectiveHourlyRateG / 20))} un/h`}`
            : `KOM · ${isQuantitative ? `${effectiveHourlyRateG}g/h` : `${Math.max(1, Math.round(effectiveHourlyRateG / 20))} un/h`}`
          : isQuantitative
          ? `${effectiveHourlyRateG} g/h`
          : `${Math.max(1, Math.round(effectiveHourlyRateG / 20))} ${isFr ? 'unités/h' : 'fuel units/h'}`,
        timingVariant: 'yellow-vest',
        macroHeadline: isQuantitative
          ? effectiveHourlyRateG < carbTarget
            ? isFr
              ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
              : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
            : `${effectiveHourlyRateG}g/h (~${Math.round(effectiveHourlyRateG * 4)} kcal/h)`
          : `${actualFuelUnits} (~${Math.max(1, Math.round(effectiveHourlyRateG / 20))} ${isFr ? 'unités/h' : 'units/h'})`,
        macroIcon: Lightning,
        macroTheme: 'yellow-vest',
        items: onBikeItems,
        title:
          nutPref === 'real-food'
            ? isFr
              ? `Ravito Naturel Calibré (${isQuantitative ? `${effectiveHourlyRateG}g/h` : `${Math.max(1, Math.round(effectiveHourlyRateG / 20))} un/h`})`
              : `Calibrated Real-Food Fueling (${isQuantitative ? `${effectiveHourlyRateG}g/h` : `${Math.max(1, Math.round(effectiveHourlyRateG / 20))} un/h`})`
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
              ? `Profil ajusté sans produits industriels : bidon 50/50 jus pressé + eau salée, dattes Medjool et pâtes de fruits artisanales.`
              : `Adjusted to steady fueling using whole foods: 50/50 pressed juice bottle with pinch of salt, Medjool dates & artisanal fruit pastes.`
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
            <Badge variant="yellow-vest" size="md" dot className="py-1.5 px-3 tnum">
              {sportCarbLabel}
            </Badge>
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
    const bpHourlyCarbs = effectiveHourlyRateG;
    const bpFuelUnits = Math.max(1, Math.round(bpHourlyCarbs / 20));

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
        macroHeadline: isQuantitative
          ? effectiveHourlyRateG < carbTarget
            ? isFr
              ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
              : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
            : `~${bpHourlyCarbs}g/h carbs (${prefBadgeLabel})`
          : `${actualFuelUnits} (${prefBadgeLabel})`,
        macroIcon: Lightning,
        macroTheme: 'lime',
        items: onBikeItems,
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
            ? 'Prise toutes les 20 min : dattes, pâtes d’amandes et bidon électrolytes pour compenser la forte sudation en côte.'
            : 'Intake every 20 min: dates, almond paste, and sodium bottle to offset heavy climbing sweat rates.'
          : isResupply
          ? isFr
            ? 'Halte boulangerie villageoise : pain d’épices, fruits frais et ravitaillement à la fontaine d’eau potable.'
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
            <Badge variant="orange" size="md" dot className="py-1.5 px-3 tnum">
              {isQuantitative
                ? isMountain
                  ? isFr
                    ? 'Régime Alpin'
                    : 'Alpine Grazing'
                  : effectiveHourlyRateG < carbTarget
                  ? isFr
                    ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
                    : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
                  : `~${bpHourlyCarbs}g carbs/h`
                : actualFuelUnits}
            </Badge>
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
        {renderExpeditionManifest()}
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
    const escCarbs = effectiveHourlyRateG;
    const escUnits = Math.max(1, Math.round(escCarbs / 20));

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
        macroHeadline: isQuantitative
          ? isPicnic
            ? '~650 kcal · Balanced feast'
            : effectiveHourlyRateG < carbTarget
            ? isFr
              ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
              : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
            : `~${escCarbs}g/h carbs`
          : isPicnic
          ? isFr
            ? 'Pique-nique du terroir'
            : 'Artisanal picnic feast'
          : actualFuelUnits,
        macroIcon: Lightning,
        macroTheme: 'emerald',
        items: onBikeItems,
        title: isPicnic
          ? isFr
            ? 'Déjeuner Pique-Nique du Terroir au Bord de l’Eau'
            : 'Artisanal Waterside Picnic Feast'
          : t('nutriEsc2Title', { carbs: escCarbs }),
        body: isPicnic
          ? isFr
            ? 'Pain au levain frais, fromage de chèvre fermier, avocat, tomates fraîches, dattes et eau minérale fraîche au soleil.'
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
            <Badge variant="emerald" size="md" dot className="py-1.5 px-3 tnum">
              {isQuantitative
                ? isModerateRide
                  ? t('nutriModCarbBadge', { min: movingMinutes })
                  : effectiveHourlyRateG < carbTarget
                  ? isFr
                    ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
                    : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
                  : `~${escCarbs}g carbs/h`
                : actualFuelUnits}
            </Badge>
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
        {renderExpeditionManifest()}
        {renderPhaseAccordion(escPhases)}
      </Card>
    );
  }

  // 4. VÉLOTAF / COMMUTE DEFAULT PROTOCOL (4 Meal Phases with Real Food Items)
  const isCoffee = activeChips.includes('coffee-stop');
  const isTempo = activeChips.includes('fitness-boost');
  const isShower = activeChips.includes('shower-locker');
  const resolvedLockerTime = gateArrivalTime || trip.office.targetGateArrivalTime || '08:30';
  const customCafeName = trip.ruleSettings?.cafeName ? String(trip.ruleSettings.cafeName) : '';
  const customRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';

  const preRideItems = planPhases.find((p) => p.phaseId === 'pre-ride')?.items;
  const lockerItems = planPhases.find((p) => p.phaseId === 'locker-refuel')?.items;
  const breakRoomItems = planPhases.find((p) => p.phaseId === 'break-room')?.items;

  const commutePhases: NutritionPhaseSpec[] = [
    {
      id: 'com-1',
      icon: Coffee,
      theme: 'amber',
      stageLabel: isFr ? 'Avant de partir' : 'Before you ride',
      timingLabel: '−45 min',
      timingVariant: 'zinc',
      macroHeadline: isQuantitative
        ? '~300 kcal · Baguette + honey'
        : isFr
        ? '2 tranches de pain & miel'
        : '2 slices bread & honey',
      macroIcon: isQuantitative ? Flame : Coffee,
      macroTheme: 'amber',
      title: t('nutriCom1Title'),
      body: t('nutriCom1Body'),
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
        : t('nutriCom2Badge'),
      timingVariant: isCoffee ? 'amber' : 'lime',
      macroHeadline: isQuantitative
        ? isCoffee
          ? '~320 kcal · Espresso + pastry'
          : effectiveHourlyRateG < carbTarget
          ? isFr
            ? `${effectiveHourlyRateG} g/h cible (allure ${powerZoneLabel} · max ${carbTarget} g/h)`
            : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
          : `~${effectiveHourlyRateG}g carbs · Bottle + dates`
        : isCoffee
        ? isFr
          ? 'Pause café & viennoiserie'
          : 'Espresso & pastry'
        : `${actualFuelUnits} · ${isFr ? 'bidon & dattes' : 'bottle & dates'}`,
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
            ? `Collation planifiée (${trip.ruleSettings?.coffeeDurationMin ?? 15} min) : ${customRation}.`
            : `Scheduled coffee pause (${trip.ruleSettings?.coffeeDurationMin ?? 15} min): ${customRation}.`
          : isFr
          ? 'Double expresso fraîchement extrait + viennoiserie aux amandes pour booster la vigilance et l’énergie avant la prise de poste.'
          : 'Freshly pulled double espresso + artisanal almond pastry for sharp cognitive focus and rapid morning fuel.'
        : isTempo
        ? isFr
          ? 'Bidon eau/pur jus 650 ml + collation en selle pour maintenir un rythme soutenu sans baisse de régime.'
          : '650ml 50/50 juice bottle + fruit chew in the saddle to maintain steady tempo without mid-commute fading.'
        : t('nutriCom2Body'),
      items: onBikeItems,
    },
    {
      id: 'com-3',
      icon: Package,
      theme: 'yellow-vest',
      stageLabel: isFr ? 'Au travail · Vestiaire' : 'At work · Locker room',
      timingLabel: isShower
        ? isFr
          ? `Vestiaire ${resolvedLockerTime}`
          : `Locker room ${resolvedLockerTime}`
        : t('nutriCom3Badge'),
      timingVariant: 'yellow-vest',
      macroHeadline: isQuantitative
        ? '25g protein · 200g Skyr'
        : isFr
        ? '1 bol yaourt & jus de fruit'
        : '1 bowl yogurt & fruit juice',
      macroIcon: isQuantitative ? Flame : Package,
      macroTheme: 'yellow-vest',
      title: isShower
        ? isFr
          ? 'Collation Protéinée au Vestiaire'
          : 'Immediate Locker Room Protein Window'
        : t('nutriCom3Title'),
      body: isShower
        ? isFr
          ? 'Yaourt ou Skyr frais avec une cuillère de miel de fleurs consommé dès l’arrivée au vestiaire avant la douche chaude (zéro poudre).'
          : 'Chilled Skyr or yogurt with wildflower honey consumed immediately upon arriving at the locker room before hot shower (zero powders).'
        : t('nutriCom3Body'),
      items: lockerItems,
    },
    {
      id: 'com-4',
      icon: ForkKnife,
      theme: 'emerald',
      stageLabel: isFr ? 'Au travail · Collation bureau' : 'At work · Desk snack',
      timingLabel: t('nutriCom4Badge'),
      timingVariant: 'emerald',
      macroHeadline: isQuantitative
        ? '~420 kcal · Overnight oats'
        : isFr
        ? '1 bocal avoine & 1/2 sandwich'
        : '1 jar oats & 1/2 sandwich',
      macroIcon: isQuantitative ? Flame : ForkKnife,
      macroTheme: 'emerald',
      title: t('nutriCom4Title'),
      body: t('nutriCom4Body'),
      items: breakRoomItems,
    },
  ];

  return (
    <Card
      title={isFr ? t('nutritionTitle') : t('nutriComTitle')}
      subtitle={t('nutriComSub')}
      badge={
        <div className="inline-flex items-center gap-2 flex-wrap">
          {compactReturnBtn}
          <Badge variant="yellow-vest" size="md" dot className="py-1.5 px-3 tnum">
            {isCoffee
              ? isFr
                ? 'Café Roaster'
                : 'Espresso reload'
              : isQuantitative
              ? isModerateRide
                ? t('nutriModCarbBadge', { min: movingMinutes })
                : effectiveHourlyRateG < carbTarget
                ? isFr
                  ? `${effectiveHourlyRateG} g/h (${powerZoneLabel} · max ${carbTarget} g/h)`
                  : `${effectiveHourlyRateG} g/h target (${powerZoneLabel} pace · ${carbTarget} g/h gut cap)`
                : `${effectiveHourlyRateG}g/h · ${prefBadgeLabel}`
              : actualFuelUnits}
          </Badge>
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
      {renderExpeditionManifest()}
      {renderPhaseAccordion(commutePhases)}
    </Card>
  );
};
