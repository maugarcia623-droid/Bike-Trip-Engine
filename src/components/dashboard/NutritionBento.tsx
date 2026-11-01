import React, { useState, useEffect } from 'react';
import { ForkKnife, Compass, Coffee, AppleLogo, Lightning, Package, Flame, Trophy, Mountains, Wine, Droplets } from '@/components/icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { CHIP_DUOTONE_ISOLATION_CLASSES, CHIP_TOKENS, GREYSCALE_TOKENS } from '../../tokens/chipTokens';
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
      ? isFr ? 'Vrai Aliment' : 'Real Food'
      : nutPref === 'mixed'
      ? isFr ? 'Mixte' : 'Mixed Fuel'
      : isFr ? 'Gels & Iso' : 'Gels & Iso';
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

  useEffect(() => {
    setShowFullProtocol(false);
  }, [trip.id]);

  const renderExpeditionManifest = () => {
    if (totalDays <= 1) return null;

    const datesCount = Math.max(2, Math.round(totalDays * 4 * carbScale));
    const figsCount = Math.max(2, Math.round(totalDays * 3 * carbScale));
    const fruitPastesCount = Math.max(1, Math.round(totalDays * 2 * carbScale));

    return (
      <div className="p-3.5 sm:p-4 rounded-pod bg-pod mb-4 border border-ink/5 dark:border-white/5 space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed border-ink/10 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <IconBadge theme="amber" icon={Flame} size="sm" solidBacker />
            <div>
              <h4 className="text-xs sm:text-[13px] font-bold text-ink font-rounded uppercase tracking-tight">
                {isFr
                  ? `Jour ${currentDay}/${totalDays} · Dépense Étape : ~${estimatedBurnKcal} kcal`
                  : `Day ${currentDay}/${totalDays} Stage Burn: ~${estimatedBurnKcal} kcal`}
              </h4>
              <p className="text-[11px] text-ink-muted">
                {isFr
                  ? `Rations calibrées sur votre profil digestif (${carbTarget}g/h · ${prefBadgeLabel})`
                  : `Rations calibrated to your gut profile (${carbTarget}g/h · ${prefBadgeLabel})`}
              </p>
            </div>
          </div>

          <Badge variant="yellow-vest" size="sm" className="self-start sm:self-auto font-rounded uppercase">
            {isFr ? 'Manifeste Expédition' : 'Expedition Manifest'}
          </Badge>
        </div>

        {/* 4-Item Cumulative Ration Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-ink-muted uppercase">
              {isFr ? 'Dattes Medjool' : 'Medjool Dates'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
              {datesCount}x
            </span>
            <span className="text-[10px] text-ink-muted">
              ~{datesCount * 66} kcal
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-ink-muted uppercase">
              {isFr ? 'Figues Séchées' : 'Turkish Figs'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
              {figsCount}x
            </span>
            <span className="text-[10px] text-ink-muted">
              ~{figsCount * 48} kcal
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-ink-muted uppercase">
              {nutPref === 'sports-fuel'
                ? isFr ? 'Gels Isotoniques' : 'Isotonic Gels'
                : isFr ? 'Pâtes de Fruits' : 'Pâte de Fruits'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
              {fruitPastesCount}x
            </span>
            <span className="text-[10px] text-ink-muted">
              ~{fruitPastesCount * 75} kcal
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-ink-muted uppercase">
              {isFr ? 'Doses Électrolytes' : 'Electrolyte Tabs'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-ink tnum mt-0.5">
              {totalDays * 2}x
            </span>
            <span className="text-[10px] text-ink-muted">
              ~{totalDays * 2 * 500}mg Na+
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
      </div>
    );
  };

  // 0. SHORT-DURATION RIDE (< 45 MIN): HYDRATION & ARRIVAL ONLY
  if (isShortRide && !showFullProtocol) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="sky" icon={Droplets} size="md" solidBacker />
                <Badge variant="zinc" size="sm" className="tnum">
                  T &minus; 20m
                </Badge>
              </div>
              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {t('nutriShort1Title')}
              </h4>
              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {t('nutriShort1Body')}
              </p>
            </div>
            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'En selle' : 'On-bike intake'}
              </span>
              <span className={`font-mono font-bold text-xs tnum ${CHIP_TOKENS.sky.primary}`}>
                0g carbs &middot; 350–500ml H2O
              </span>
            </div>
          </div>

          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="emerald" icon={Coffee} size="md" solidBacker />
                <Badge variant="emerald" size="sm" className="tnum">
                  {isFr ? 'Arrivée' : 'Arrival'}
                </Badge>
              </div>
              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {t('nutriShort2Title')}
              </h4>
              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {t('nutriShort2Body')}
              </p>
            </div>
            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Post-trajet' : 'Post-ride'}
              </span>
              <span className={`font-mono font-bold text-xs tnum ${CHIP_TOKENS.emerald.primary}`}>
                ~250 kcal &middot; ~20g protein
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex justify-end">
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

  const compactReturnBtn = isShortRide && showFullProtocol ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phase 1: Pre-race loading */}
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="amber" icon={Coffee} size="md" solidBacker />
                <Badge variant="zinc" size="sm" className="tnum">
                  T &minus; 60m
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {t('nutriSport1Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {t('nutriSport1Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Apport glucides' : 'Pre-load carbs'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Lightning className="w-4 h-4 text-current" />
                ~{Math.round(75 * carbScale)}g &middot; ~{Math.round(350 * carbScale)} kcal
              </span>
            </div>
          </div>

          {/* Phase 2: On-the-bike glycogen */}
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge
                  theme={isKom ? 'amber' : 'yellow-vest'}
                  icon={isKom ? Trophy : Lightning}
                  size="md"
                  solidBacker
                />
                <Badge variant="yellow-vest" size="sm" className="tnum font-bold">
                  {isKom
                    ? isFr
                      ? `Bosses · ${carbTarget}g/h`
                      : `KOM · ${carbTarget}g/h`
                    : `${minCarbRange}–${carbTarget}g/h`}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {nutPref === 'real-food'
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
                  : t('nutriSport2Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {nutPref === 'real-food'
                  ? isFr
                    ? `Profil ajusté à ${carbTarget}g/h sans produits industriels : bidon 50/50 jus pressé + eau salée, dattes Medjool et pâtes de fruits artisanales.`
                    : `Adjusted to your ${carbTarget}g/h gut target using whole foods: 50/50 pressed juice bidon with pinch of salt, Medjool dates & artisanal fruit pastes.`
                  : isHydration
                  ? isFr
                    ? `Apport calibré à ${carbTarget}g/h + 750 mg sodium/litre pour maximiser l’absorption intestinale sans troubles digestifs.`
                    : `Calibrated to ${carbTarget}g/h + 750mg sodium/liter to match your gut absorption rate without GI distress.`
                  : t('nutriSport2Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Débit horaire en selle' : 'On-bike hourly rate'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Lightning className="w-4 h-4 text-current" />
                {`${carbTarget}g/h (~${hourlyKcal} kcal/h)`}
              </span>
            </div>
          </div>

          {/* Phase 3: Post-ride recovery */}
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors sm:col-span-2">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="emerald" icon={ForkKnife} size="md" solidBacker />
                <Badge variant="emerald" size="sm" className="tnum">
                  {t('nutriSport3Badge')}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {t('nutriSport3Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {t('nutriSport3Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Ratio récupération' : 'Recovery target'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Flame className="w-4 h-4 text-current" />
                3:1 Glycogen &middot; ~400 kcal
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 2. BIKEPACKING / MULTI-DAY TOUR PROTOCOL
  if (isBikepacking) {
    const isMountain = activeChips.includes('mountain-adventure');
    const isResupply = activeChips.includes('resupply-points');
    const isBivouac = activeChips.includes('bivouac-camp');
    const bpHourlyCarbs = Math.max(35, Math.round(carbTarget * 0.85));

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge
                  theme={isMountain ? 'sky' : 'amber'}
                  icon={isMountain ? Mountains : Coffee}
                  size="md"
                  solidBacker
                />
                <Badge variant="zinc" size="sm" className="tnum">
                  {isMountain ? (isFr ? 'Matin Alpin' : 'Alpine Morning') : 'Camp Morning'}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {isMountain
                  ? (isFr ? 'Charge Métabolique Haute Altitude' : 'High-Altitude Metabolic Pre-Load')
                  : t('nutriBp1Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {isMountain
                  ? (isFr
                      ? 'Gruau dense aux fruits oléagineux, miel de montagne et caféine pour résister aux températures fraîches des cols.'
                      : 'Dense nut-butter oatmeal, mountain honey & double caffeine to combat cold morning col temperatures.')
                  : t('nutriBp1Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Charge matin' : 'Staging energy'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Flame className="w-4 h-4 text-current" />
                {isMountain ? '~750 kcal · High carb' : '~650 kcal · High carb'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="lime" icon={AppleLogo} size="md" solidBacker />
                <Badge variant="lime" size="sm" className="tnum">
                  {isMountain ? (isFr ? 'Pentes Fortes' : 'Steep Pitches') : 'Every 25m'}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {isMountain
                  ? (isFr ? 'Rations Roulantes & Électrolytes en Montée' : 'Ascent Grazing & Electrolyte Buffer')
                  : isResupply
                  ? (isFr ? 'Ravitaillement Boulangerie & Produits Frais' : 'Village Bakery & Fresh Resupply Grazing')
                  : t('nutriBp2Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {isMountain
                  ? (isFr
                      ? 'Prise toutes les 20 min : dattes, pâtes d’amandes et bidon électrolytes pour compenser la forte sudation en côte.'
                      : 'Intake every 20m: dates, almond paste, and sodium bidon to offset heavy climbing sweat rates.')
                  : isResupply
                  ? (isFr
                      ? 'Halte boulangerie villageoise : pain d’épices, fruits frais et ravitaillement à la fontaine d’eau potable.'
                      : 'Village bakery halt: spiced honey cake, fresh fruit, and icy spring fountain water.')
                  : t('nutriBp2Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Cadence horaire' : 'Rolling intake'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.lime.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Lightning className="w-4 h-4 text-current" />
                {`~${bpHourlyCarbs}g/h carbs (${prefBadgeLabel})`}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors sm:col-span-2">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="orange" icon={Package} size="md" solidBacker />
                <Badge variant="orange" size="sm" className="tnum">
                  {isMountain ? (isFr ? 'Camp Bivouac' : 'Bivouac Dusk') : 'Evening'}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {isMountain
                  ? (isFr ? 'Dîner Bivouac de Montagne au Réchaud' : 'Mountain Bivouac High-Calorie Camp Stew')
                  : isBivouac
                  ? (isFr ? 'Festin Bivouac Sauvage & Eau Purifiée' : 'Wild Bivouac Feast & Filtered Water')
                  : t('nutriBp3Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {isMountain
                  ? (isFr
                      ? 'Plat lyophilisé chaud (bœuf/lentilles ou riz curry), chocolat noir et infusion chaude pour la thermorégulation nocturne.'
                      : 'Hot freeze-dried chili stew, dark chocolate & herbal tea for overnight thermoregulation in sub-alpine air.')
                  : isBivouac
                  ? (isFr
                      ? 'Filtration de l’eau à la flasque, réchaud allumé pour repas chaud riche en glucides lents et protéines.'
                      : 'Gravity-filtered water, camp stove stew packed with slow carbs and complete recovery proteins.')
                  : t('nutriBp3Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Dîner bivouac' : 'Camp reload'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.orange.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Flame className="w-4 h-4 text-current" />
                {isMountain ? '~1,100 kcal · Dense recovery' : '~950 kcal · High protein'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 3. ESCAPADE / LEISURE STAY PROTOCOL
  if (isEscapade) {
    const isPicnic = activeChips.includes('picnic-outing');
    const isGastro = activeChips.includes('local-gastronomy') || activeChips.includes('wine-tasting');
    const isSpa = activeChips.includes('spa-wellness');
    const escCarbs = Math.min(carbTarget, 50);

    return (
      <Card
        title={isFr ? t('nutritionTitle') : t('nutriEscTitle')}
        subtitle={t('nutriEscSub', { dest: trip.route?.destination || 'destination' })}
        badge={
          <div className="inline-flex items-center gap-2 flex-wrap">
            {compactReturnBtn}
            <Badge variant="emerald" size="md" dot className="py-1.5 px-3 tnum">
              {isModerateRide ? t('nutriModCarbBadge', { min: movingMinutes }) : `~${escCarbs}g carbs/h`}
            </Badge>
            <Badge variant="amber" size="md" icon={Flame} className="py-1.5 px-3 tnum">
              ~{estimatedBurnKcal} kcal
            </Badge>
          </div>
        }
      >
        {renderExpeditionManifest()}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge theme="amber" icon={Coffee} size="md" solidBacker />
                <Badge variant="zinc" size="sm" className="tnum">
                  T &minus; 45m
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {t('nutriEsc1Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {t('nutriEsc1Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Départ' : 'Rollout base'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Flame className="w-4 h-4 text-current" />
                ~350 kcal
              </span>
            </div>
          </div>

          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge
                  theme={isPicnic ? 'orange' : 'teal'}
                  icon={isPicnic ? ForkKnife : Compass}
                  size="md"
                  solidBacker
                />
                <Badge variant={isPicnic ? 'orange' : 'teal'} size="sm" className="tnum">
                  {isPicnic ? (isFr ? 'Pique-Nique 45m' : 'Picnic Feast') : 'En route'}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {isPicnic
                  ? (isFr ? 'Déjeuner Pique-Nique du Terroir au Bord de l’Eau' : 'Artisanal Waterside Picnic Feast')
                  : t('nutriEsc2Title', { carbs: escCarbs })}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {isPicnic
                  ? (isFr
                      ? 'Pain au levain frais, fromage de chèvre fermier, avocat, tomates fraîches, dattes et eau minérale fraîche au soleil.'
                      : 'Crusty sourdough baguette, local farm goat cheese, avocado, fresh tomatoes, figs & chilled spring water.')
                  : t('nutriEsc2Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Hydratation' : 'Cruising fuel'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Lightning className="w-4 h-4 text-current" />
                {isPicnic ? '~650 kcal · Balanced feast' : `~${escCarbs}g/h carbs`}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors sm:col-span-2">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <IconBadge
                  theme={isGastro ? 'rose' : 'emerald'}
                  icon={isGastro ? Wine : ForkKnife}
                  size="md"
                  solidBacker
                />
                <Badge variant={isGastro ? 'rose' : 'emerald'} size="sm" className="tnum">
                  {isGastro ? (isFr ? 'Dîner 19:45' : 'Dining 19:45') : isSpa ? (isFr ? 'Spa & Dîner' : 'Spa & Dining') : 'Check-in'}
                </Badge>
              </div>

              <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
                {isGastro
                  ? (isFr ? 'Étape Terroir & Dîner Gastronomique du Soir' : 'Evening Vineyard Dining & Terroir Table')
                  : isSpa
                  ? (isFr ? 'Boisson Drainante Spa & Dîner Récupérateur' : 'Spa Detox Hydration & Restorative Dinner')
                  : t('nutriEsc3Title')}
              </h4>

              <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
                {isGastro
                  ? (isFr
                      ? 'Table gastronomique réservée : cuisine de saison, dégustation de vins régionaux et reconstitution des réserves sans hâte.'
                      : 'Reserved table at regional bistro: seasonal cuisine, local wine tasting, and relaxed glycogen recovery.')
                  : isSpa
                  ? (isFr
                      ? 'Infusion détox et eau minérale magnésienne après les bains chauds, suivi d’un dîner léger riche en oméga-3.'
                      : 'Magnesium mineral water & herbal tea after thermal bath, followed by an omega-3 rich light dinner.')
                  : t('nutriEsc3Body')}
              </p>
            </div>

            <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {isFr ? 'Dîner hôtel' : 'Evening dining'}
              </span>
              <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS[isGastro ? 'rose' : 'amber'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <Flame className="w-4 h-4 text-current" />
                {isGastro ? '~850 kcal · Culinary reload' : 'Balanced reload'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 4. VÉLOTAF / COMMUTE DEFAULT PROTOCOL
  const isCoffee = activeChips.includes('coffee-stop');
  const isTempo = activeChips.includes('fitness-boost');
  const isShower = activeChips.includes('shower-locker');
  const resolvedLockerTime = gateArrivalTime || trip.office.targetGateArrivalTime || '08:30';
  const customCafeName = trip.ruleSettings?.cafeName ? String(trip.ruleSettings.cafeName) : '';
  const customRation = trip.ruleSettings?.rationType ? String(trip.ruleSettings.rationType) : '';

  return (
    <Card
      title={isFr ? t('nutritionTitle') : t('nutriComTitle')}
      subtitle={t('nutriComSub')}
      badge={
        <div className="inline-flex items-center gap-2 flex-wrap">
          {compactReturnBtn}
          <Badge variant="yellow-vest" size="md" dot className="py-1.5 px-3 tnum">
            {isCoffee
              ? (isFr ? 'Café Roaster' : 'Espresso reload')
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <IconBadge theme="amber" icon={Coffee} size="md" solidBacker />
              <Badge variant="zinc" size="sm" className="tnum">
                &minus;45m
              </Badge>
            </div>

            <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
              {t('nutriCom1Title')}
            </h4>

            <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
              {t('nutriCom1Body')}
            </p>
          </div>

          <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-ink-muted uppercase">
              {isFr ? 'Ignition' : 'Fuel base'}
            </span>
            <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
              <Flame className="w-4 h-4 text-current" />
              ~300 kcal &middot; Baguette + honey
            </span>
          </div>
        </div>

        <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <IconBadge
                theme={isCoffee ? 'amber' : 'lime'}
                icon={isCoffee ? Coffee : AppleLogo}
                size="md"
                solidBacker
              />
              <Badge variant={isCoffee ? 'amber' : 'lime'} size="sm">
                {isCoffee ? (isFr ? 'Pause Roaster' : 'Roastery Pause') : isTempo ? (isFr ? 'Boost Tempo' : 'Tempo Fuel') : t('nutriCom2Badge')}
              </Badge>
            </div>

            <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
              {isCoffee
                ? customCafeName ||
                  (isFr ? 'Arrêt Café de Spécialité & Viennoiserie' : 'Specialty Roastery Espresso & Pastry')
                : isTempo
                ? (isFr ? 'Carburant Effort Soutenu Zone 3' : 'Sustained Zone 3 Tempo Fueling')
                : t('nutriCom2Title')}
            </h4>

            <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
              {isCoffee
                ? customRation
                  ? (isFr
                      ? `Collation planifiée (${trip.ruleSettings?.coffeeDurationMin ?? 15} min) : ${customRation}.`
                      : `Scheduled coffee pause (${trip.ruleSettings?.coffeeDurationMin ?? 15} min): ${customRation}.`)
                  : (isFr
                      ? 'Double expresso fraîchement extrait + viennoiserie aux amandes pour booster la vigilance et l’énergie avant la prise de poste.'
                      : 'Freshly pulled double espresso + artisanal almond pastry for sharp cognitive focus and rapid morning fuel.')
                : isTempo
                ? (isFr
                    ? 'Bidon eau/pur jus 650 ml + pâte de fruits en selle pour maintenir 260W sans baisse de régime.'
                    : '650ml 50/50 juice bidon + fruit chew in the saddle to maintain 260W without mid-commute fading.')
                : t('nutriCom2Body')}
            </p>
          </div>

          <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-ink-muted uppercase">
              {isFr ? 'En selle' : 'On-bike carbs'}
            </span>
            <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.lime.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
              <Lightning className="w-4 h-4 text-current" />
              {isCoffee ? '~320 kcal · Espresso + pastry' : `~${Math.min(carbTarget, 60)}g carbs · Bidon + dates`}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <IconBadge theme="yellow-vest" icon={Package} size="md" solidBacker />
              <Badge variant="yellow-vest" size="sm" className="font-bold tnum">
                {isShower
                  ? (isFr ? `Vestiaire ${resolvedLockerTime}` : `Locker ${resolvedLockerTime}`)
                  : t('nutriCom3Badge')}
              </Badge>
            </div>

            <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
              {isShower
                ? (isFr ? 'Fenêtre Métabolique Immédiate au Casier' : 'Immediate Locker Bay Protein Window')
                : t('nutriCom3Title')}
            </h4>

            <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
              {isShower
                ? (isFr
                    ? '200g de Skyr 0% frais avec une cuillère de miel de fleurs consommé dès l’arrivée au vestiaire avant la douche chaude (zéro poudre).'
                    : '200g chilled Skyr 0% with wildflower honey consumed immediately upon locker bay entry before hot shower (zero powders).')
                : t('nutriCom3Body')}
            </p>
          </div>

          <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-ink-muted uppercase">
              {isFr ? 'Récup vestiaire' : 'Locker reload'}
            </span>
            <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
              <Flame className="w-4 h-4 text-current" />
              25g protein &middot; 200g Skyr
            </span>
          </div>
        </div>

        <div className="p-4 rounded-pod bg-pod flex flex-col justify-between gap-3 border border-ink/5 dark:border-white/5 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <IconBadge theme="emerald" icon={ForkKnife} size="md" solidBacker />
              <Badge variant="emerald" size="sm">
                {t('nutriCom4Badge')}
              </Badge>
            </div>

            <h4 className="text-sm sm:text-[15px] font-bold text-ink leading-snug w-full">
              {t('nutriCom4Title')}
            </h4>

            <p className="text-[13px] text-ink-secondary leading-relaxed mt-2">
              {t('nutriCom4Body')}
            </p>
          </div>

          <div className="pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-ink-muted uppercase">
              {isFr ? 'Petit-déj bureau' : 'Desk lock fuel'}
            </span>
            <span className={`font-mono font-bold text-xs tnum flex items-center gap-1 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
              <Flame className="w-4 h-4 text-current" />
              ~420 kcal &middot; Overnight oats
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
