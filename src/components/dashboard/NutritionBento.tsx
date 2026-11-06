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
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { useTranslation } from '../../context/LanguageContext';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';

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
  /** Short stage/phase badge label shown alongside the phase number (e.g. "Ignition / Fuel base") */
  stageLabel: string;
  /** Timing window pill on the right (e.g. "T − 45m", "En route", "Arrival") */
  timingLabel: string;
  timingVariant: BadgeVariant;
  /** Headline macro summary pill on the right (e.g. "~300 kcal · Baguette + honey") */
  macroHeadline: string;
  macroIcon?: React.ElementType;
  macroTheme: ChipTheme;
  /** Full descriptive title inside the phase */
  title: string;
  /** Detailed protocol guidance split into scannable bullets when expanded */
  body: string;
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

  // Reactive rider gut absorption & nutrition preferences (synced with Rider Profile modal)
  const riderSpecs = riderSpecsProp || loadRiderBikeSpecs();
  const carbTarget = riderSpecs.carbTargetGPerHr || 60;
  const carbScale = carbTarget / 60;
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
  const isModerateRide = movingMinutes >= 45 && movingMinutes < 90;

  const [showFullProtocol, setShowFullProtocol] = useState(false);
  // Collapsed summary view by default: all phase accordions start tucked until tapped
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

  const renderExpeditionManifest = () => {
    if (totalDays <= 1) return null;

    const datesCount = Math.max(2, Math.round(totalDays * 4 * carbScale));
    const figsCount = Math.max(2, Math.round(totalDays * 3 * carbScale));
    const fruitPastesCount = Math.max(1, Math.round(totalDays * 2 * carbScale));

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
                {isFr
                  ? `Jour ${currentDay}/${totalDays} · ~${estimatedBurnKcal} kcal`
                  : `Day ${currentDay}/${totalDays} · ~${estimatedBurnKcal} kcal`}
              </h4>
              <p className="text-[11px] text-ink-muted break-words tnum">
                {isFr
                  ? `${carbTarget}g/h · ${prefBadgeLabel}`
                  : `${carbTarget}g/h · ${prefBadgeLabel}`}
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
              <span className="text-[10px] text-ink-muted tnum">~{datesCount * 66} kcal</span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {isFr ? 'Figues Séchées' : 'Turkish Figs'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {figsCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">~{figsCount * 48} kcal</span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {nutPref === 'sports-fuel'
                  ? isFr
                    ? 'Gels Isotoniques'
                    : 'Isotonic Gels'
                  : isFr
                  ? 'Pâtes de Fruits'
                  : 'Pâte de Fruits'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {fruitPastesCount}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">~{fruitPastesCount * 75} kcal</span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-ink-muted uppercase">
                {isFr ? 'Doses Électrolytes' : 'Electrolyte Tabs'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
                {totalDays * 2}x
              </span>
              <span className="text-[10px] text-ink-muted tnum">~{totalDays * 2 * 500}mg Na+</span>
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
            {/* Collapsible Phase Header: Phase # + Badge Title · Timing & Headline Macro Pill · ChevronDown */}
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

                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card text-[11px] font-mono font-bold tnum ${CHIP_TOKENS[phase.macroTheme].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  {MacroIcon && <MacroIcon className="w-3.5 h-3.5 text-current shrink-0" />}
                  <span className="break-words">{phase.macroHeadline}</span>
                </span>

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
        macroHeadline: '0g carbs · 350–500ml H2O',
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
        macroHeadline: '~250 kcal · ~20g protein',
        macroIcon: Flame,
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
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              ~{estimatedBurnKcal} kcal
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

  // 1. SPORT / GRAN FONDO PROTOCOL (Dynamically scaled to Rider Carb Target)
  if (isSport) {
    const isKom = activeChips.includes('climbing-kom-hunt');
    const isHydration = activeChips.includes('hydration-electrolytes');
    const minCarbRange = Math.max(30, carbTarget - 10);
    const sportCarbLabel = isModerateRide
      ? t('nutriModCarbBadge', { min: movingMinutes })
      : `${minCarbRange}–${carbTarget}g carbs/h`;
    const hourlyKcal = Math.round(carbTarget * 4);

    const sportPhases: NutritionPhaseSpec[] = [
      {
        id: 'sport-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Apport glucides' : 'Pre-load carbs',
        timingLabel: 'T − 60m',
        timingVariant: 'zinc',
        macroHeadline: `~${Math.round(75 * carbScale)}g · ~${Math.round(350 * carbScale)} kcal`,
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
            ? `Bosses · ${carbTarget}g/h`
            : `KOM · ${carbTarget}g/h`
          : `${minCarbRange}–${carbTarget}g/h`,
        timingVariant: 'yellow-vest',
        macroHeadline: `${carbTarget}g/h (~${hourlyKcal} kcal/h)`,
        macroIcon: Lightning,
        macroTheme: 'yellow-vest',
        title:
          nutPref === 'real-food'
            ? isFr
              ? `Ravito Naturel Calibré (${carbTarget}g/h)`
              : `Calibrated Real-Food Fueling (${carbTarget}g/h)`
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
              ? `Profil ajusté à ${carbTarget}g/h sans produits industriels : bidon 50/50 jus pressé + eau salée, dattes Medjool et pâtes de fruits artisanales.`
              : `Adjusted to your ${carbTarget}g/h gut target using whole foods: 50/50 pressed juice bidon with pinch of salt, Medjool dates & artisanal fruit pastes.`
            : isHydration
            ? isFr
              ? `Apport calibré à ${carbTarget}g/h + 750 mg sodium/litre pour maximiser l’absorption intestinale sans troubles digestifs.`
              : `Calibrated to ${carbTarget}g/h + 750mg sodium/liter to match your gut absorption rate without GI distress.`
            : t('nutriSport2Body'),
      },
      {
        id: 'sport-3',
        icon: ForkKnife,
        theme: 'emerald',
        stageLabel: isFr ? 'Ratio récupération' : 'Recovery target',
        timingLabel: t('nutriSport3Badge'),
        timingVariant: 'emerald',
        macroHeadline: '3:1 Glycogen · ~400 kcal',
        macroIcon: Flame,
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
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              {estimatedBurnKcal} kcal
            </Badge>
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
    const bpHourlyCarbs = Math.max(35, Math.round(carbTarget * 0.85));

    const bpPhases: NutritionPhaseSpec[] = [
      {
        id: 'bp-1',
        icon: isMountain ? Mountains : Coffee,
        theme: isMountain ? 'sky' : 'amber',
        stageLabel: isFr ? 'Charge matin' : 'Staging energy',
        timingLabel: isMountain ? (isFr ? 'Matin Alpin' : 'Alpine Morning') : 'Camp Morning',
        timingVariant: 'zinc',
        macroHeadline: isMountain ? '~750 kcal · High carb' : '~650 kcal · High carb',
        macroIcon: Flame,
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
        macroHeadline: `~${bpHourlyCarbs}g/h carbs (${prefBadgeLabel})`,
        macroIcon: Lightning,
        macroTheme: 'lime',
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
            : 'Intake every 20m: dates, almond paste, and sodium bidon to offset heavy climbing sweat rates.'
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
        macroHeadline: isMountain ? '~1,100 kcal · Dense recovery' : '~950 kcal · High protein',
        macroIcon: Flame,
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
            : 'Hot freeze-dried chili stew, dark chocolate & herbal tea for overnight thermoregulation in sub-alpine air.'
          : isBivouac
          ? isFr
            ? 'Filtration de l’eau à la flasque, réchaud allumé pour repas chaud riche en glucides lents et protéines.'
            : 'Gravity-filtered water, camp stove stew packed with slow carbs and complete recovery proteins.'
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
              {isMountain ? (isFr ? 'Régime Alpin' : 'Alpine Grazing') : `~${bpHourlyCarbs}g carbs/h`}
            </Badge>
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              ~{estimatedBurnKcal} kcal
            </Badge>
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
    const escCarbs = Math.min(carbTarget, 50);

    const escPhases: NutritionPhaseSpec[] = [
      {
        id: 'esc-1',
        icon: Coffee,
        theme: 'amber',
        stageLabel: isFr ? 'Départ' : 'Rollout base',
        timingLabel: 'T − 45m',
        timingVariant: 'zinc',
        macroHeadline: '~350 kcal',
        macroIcon: Flame,
        macroTheme: 'amber',
        title: t('nutriEsc1Title'),
        body: t('nutriEsc1Body'),
      },
      {
        id: 'esc-2',
        icon: isPicnic ? ForkKnife : Compass,
        theme: isPicnic ? 'orange' : 'teal',
        stageLabel: isFr ? 'Hydratation' : 'Cruising fuel',
        timingLabel: isPicnic ? (isFr ? 'Pique-Nique 45m' : 'Picnic Feast') : 'En route',
        timingVariant: isPicnic ? 'orange' : 'teal',
        macroHeadline: isPicnic ? '~650 kcal · Balanced feast' : `~${escCarbs}g/h carbs`,
        macroIcon: Lightning,
        macroTheme: 'emerald',
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
        macroHeadline: isGastro ? '~850 kcal · Culinary reload' : 'Balanced reload',
        macroIcon: Flame,
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
              {isModerateRide
                ? t('nutriModCarbBadge', { min: movingMinutes })
                : `~${escCarbs}g carbs/h`}
            </Badge>
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              ~{estimatedBurnKcal} kcal
            </Badge>
          </div>
        }
      >
        {renderExpeditionManifest()}
        {renderPhaseAccordion(escPhases)}
      </Card>
    );
  }

  // 4. VÉLOTAF / COMMUTE DEFAULT PROTOCOL (4 Meal Phases)
  const isCoffee = activeChips.includes('coffee-stop');
  const isTempo = activeChips.includes('fitness-boost');
  const isShower = activeChips.includes('shower-locker');
  const resolvedLockerTime = gateArrivalTime || trip.office.targetGateArrivalTime || '08:30';
  const customCafeName = trip.ruleSettings?.cafeName ? String(trip.ruleSettings.cafeName) : '';
  const customRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';

  const commutePhases: NutritionPhaseSpec[] = [
    {
      id: 'com-1',
      icon: Coffee,
      theme: 'amber',
      stageLabel: isFr ? 'Ignition' : 'Ignition / Fuel base',
      timingLabel: '−45m',
      timingVariant: 'zinc',
      macroHeadline: '~300 kcal · Baguette + honey',
      macroIcon: Flame,
      macroTheme: 'amber',
      title: t('nutriCom1Title'),
      body: t('nutriCom1Body'),
    },
    {
      id: 'com-2',
      icon: isCoffee ? Coffee : AppleLogo,
      theme: isCoffee ? 'amber' : 'lime',
      stageLabel: isFr ? 'En selle' : 'On-bike carbs',
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
      macroHeadline: isCoffee
        ? '~320 kcal · Espresso + pastry'
        : `~${Math.min(carbTarget, 60)}g carbs · Bidon + dates`,
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
          ? 'Bidon eau/pur jus 650 ml + pâte de fruits en selle pour maintenir 260W sans baisse de régime.'
          : '650ml 50/50 juice bidon + fruit chew in the saddle to maintain 260W without mid-commute fading.'
        : t('nutriCom2Body'),
    },
    {
      id: 'com-3',
      icon: Package,
      theme: 'yellow-vest',
      stageLabel: isFr ? 'Phase 1 · Vestiaire' : 'Phase 1 · Arrival',
      timingLabel: isShower
        ? isFr
          ? `Vestiaire ${resolvedLockerTime}`
          : `Locker ${resolvedLockerTime}`
        : t('nutriCom3Badge'),
      timingVariant: 'yellow-vest',
      macroHeadline: '25g protein · 200g Skyr',
      macroIcon: Flame,
      macroTheme: 'yellow-vest',
      title: isShower
        ? isFr
          ? 'Fenêtre Métabolique Immédiate au Casier'
          : 'Immediate Locker Bay Protein Window'
        : t('nutriCom3Title'),
      body: isShower
        ? isFr
          ? '200g de Skyr 0% frais avec une cuillère de miel de fleurs consommé dès l’arrivée au vestiaire avant la douche chaude (zéro poudre).'
          : '200g chilled Skyr 0% with wildflower honey consumed immediately upon locker bay entry before hot shower (zero powders).'
        : t('nutriCom3Body'),
    },
    {
      id: 'com-4',
      icon: ForkKnife,
      theme: 'emerald',
      stageLabel: isFr ? 'Phase 2 · Bureau' : 'Phase 2 · Desk',
      timingLabel: t('nutriCom4Badge'),
      timingVariant: 'emerald',
      macroHeadline: '~420 kcal · Overnight oats',
      macroIcon: Flame,
      macroTheme: 'emerald',
      title: t('nutriCom4Title'),
      body: t('nutriCom4Body'),
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
              : isModerateRide
              ? t('nutriModCarbBadge', { min: movingMinutes })
              : `${carbTarget}g/h · ${prefBadgeLabel}`}
          </Badge>
          <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
            {estimatedBurnKcal} kcal
          </Badge>
        </div>
      }
    >
      {renderExpeditionManifest()}
      {renderPhaseAccordion(commutePhases)}
    </Card>
  );
};
