import React, { useState } from 'react';
import { Button } from '@/components/arc';
import {
  Bike,
  CheckCircle2,
  Gauge,
  SlidersHorizontal,
  Sparkle,
  Users,
  X,
} from '@/components/icons';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  BIKE_CATEGORY_DEFAULTS,
  BikeCategory,
  NutritionPreference,
  RiderBikeSpecs,
} from '../../types/specs';
import { GroupSyncCheckResult, SharedPlanMeta } from '../../utils/planShare';
import { getActiveBike, getEffectiveRiderSpecs } from '../../utils/specsStorage';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

export interface PartnerAdaptBannerProps {
  sharedPlanBanner: { name: string; needsPersonalization?: boolean } & SharedPlanMeta;
  riderSpecs: RiderBikeSpecs;
  lang: 'en' | 'fr';
  onApplyPersonalization: (
    nextSpecs: RiderBikeSpecs,
    luggageWeightKg: number
  ) => void;
  onOpenSpecs?: () => void;
  onDismiss?: () => void;
}

const BIKE_CATEGORY_CHOICES: Array<{
  id: BikeCategory;
  labelEn: string;
  labelFr: string;
  subEn: string;
  subFr: string;
}> = [
  { id: 'road', labelEn: 'Road', labelFr: 'Route', subEn: '28 mm', subFr: '28 mm' },
  { id: 'gravel', labelEn: 'Gravel', labelFr: 'Gravel', subEn: '38 mm', subFr: '38 mm' },
  { id: 'touring', labelEn: 'Touring', labelFr: 'Voyage', subEn: '42 mm', subFr: '42 mm' },
  { id: 'mtb', labelEn: 'MTB', labelFr: 'VTT', subEn: '54 mm', subFr: '54 mm' },
];

const LOAD_CHOICES: Array<{ kg: number; labelEn: string; labelFr: string }> = [
  { kg: 2, labelEn: 'Light · 2 kg', labelFr: 'Léger · 2 kg' },
  { kg: 8, labelEn: 'Bikepacking · 8 kg', labelFr: 'Sacoches · 8 kg' },
  { kg: 14, labelEn: 'Heavy · 14 kg', labelFr: 'Chargé · 14 kg' },
];

const FUEL_CHOICES: Array<{ id: NutritionPreference; labelEn: string; labelFr: string }> = [
  { id: 'real-food', labelEn: 'Real food', labelFr: 'Vrais aliments' },
  { id: 'mixed', labelEn: 'Mixed', labelFr: 'Mixte' },
  { id: 'sports-fuel', labelEn: 'Sports fuel', labelFr: 'Sport' },
];

export const PartnerAdaptBanner: React.FC<PartnerAdaptBannerProps> = ({
  sharedPlanBanner,
  riderSpecs,
  lang,
  onApplyPersonalization,
  onOpenSpecs,
  onDismiss,
}) => {
  const isFr = lang === 'fr';
  const activeBike = getActiveBike(riderSpecs);
  const effective = getEffectiveRiderSpecs(riderSpecs);

  const [partnerName, setPartnerName] = useState(riderSpecs.riderName || '');
  const [weightKg, setWeightKg] = useState<number>(effective.riderWeightKg || 74);
  const [bikeCategory, setBikeCategory] = useState<BikeCategory>(
    activeBike.bikeCategory || 'gravel'
  );
  const [luggageKg, setLuggageKg] = useState<number>(
    sharedPlanBanner.senderBaseline?.luggageWeightKg ?? 8
  );
  const [nutritionPref, setNutritionPref] = useState<NutritionPreference>(
    riderSpecs.nutritionPreference || 'mixed'
  );

  const senderName =
    sharedPlanBanner.senderBaseline?.name || (isFr ? 'Votre partenaire' : 'Your partner');

  if (!sharedPlanBanner.needsPersonalization) {
    return (
      <div
        data-testid="shared-plan-banner"
        className="relative mb-4 rounded-card bg-card px-4 py-3.5 sm:px-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-flight-deck-in"
      >
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0 pr-9 sm:pr-0">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            aria-hidden="true"
          >
            <Users className="w-4 h-4 text-current" />
          </span>
          <div className="flex-1 min-w-0 text-xs text-ink leading-snug">
            <div className="font-rounded font-bold break-words">
              {isFr
                ? `Plan partagé par ${senderName} · Recalculé pour votre ${activeBike.name} (${effective.riderWeightKg} kg)`
                : `Shared by ${senderName} · Recalculated for your ${activeBike.name} (${effective.riderWeightKg} kg)`}
            </div>
            <div className="text-ink-secondary tnum mt-0.5">
              {sharedPlanBanner.stageCount > 1
                ? `${sharedPlanBanner.stageCount} ${isFr ? 'jours' : 'days'} · `
                : ''}
              {isFr ? 'Départ' : 'Leave by'} {sharedPlanBanner.leaveBy} → {sharedPlanBanner.arrival}
              {sharedPlanBanner.pinnedCount > 0
                ? ` · ${sharedPlanBanner.pinnedCount} ${isFr ? 'arrêts' : 'stops'}`
                : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSpecs && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onOpenSpecs}
              className="h-8 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isFr ? 'Mon profil' : 'Edit profile'}</span>
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              aria-label={isFr ? 'Fermer' : 'Dismiss'}
              onClick={onDismiss}
              className="absolute top-3 right-3 sm:static w-8 h-8 p-0 rounded-full text-ink-muted hover:text-ink hover:bg-pod cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaults = BIKE_CATEGORY_DEFAULTS[bikeCategory];
    const existingBike = riderSpecs.bikes[0];
    const bikeLabel =
      BIKE_CATEGORY_CHOICES.find((c) => c.id === bikeCategory)?.[
        isFr ? 'labelFr' : 'labelEn'
      ] || 'Gravel';

    const updatedBike = {
      ...(existingBike || { id: 'bike-partner-1' }),
      id: existingBike?.id || 'bike-partner-1',
      name: isFr ? `Mon vélo ${bikeLabel}` : `My ${bikeLabel} Bike`,
      bikeCategory,
      weightKg: defaults.weightKg,
      crr: defaults.crr,
      cda: defaults.cda,
      isTubeless: defaults.isTubeless,
      tireWidthMm: defaults.tireWidthMm,
      casingType: defaults.casingType,
    };

    const nextSpecs: RiderBikeSpecs = {
      ...riderSpecs,
      riderName: partnerName.trim() || undefined,
      riderWeightKg: Math.min(160, Math.max(40, Number(weightKg) || 74)),
      nutritionPreference: nutritionPref,
      activeBikeId: updatedBike.id,
      bikes: [
        updatedBike,
        ...riderSpecs.bikes.filter((b) => b.id !== updatedBike.id),
      ],
    };

    onApplyPersonalization(nextSpecs, luggageKg);
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="partner-adapt-card"
      className="mb-4 rounded-card bg-card border border-ink/10 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-4 animate-flight-deck-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
          >
            <Sparkle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
              {isFr ? 'Plan partagé · Personnalisation 10 s' : 'Shared blueprint · 10-second setup'}
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-ink font-rounded leading-snug">
              {isFr
                ? `${senderName} vous a partagé « ${sharedPlanBanner.name} » — adaptez-le à votre vélo`
                : `${senderName} shared “${sharedPlanBanner.name}” — adapt it to your bike & weight`}
            </h2>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={isFr ? 'Ignorer' : 'Skip'}
            className="w-8 h-8 rounded-full text-ink-muted hover:text-ink hover:bg-pod flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Your name */}
        <div className="rounded-pod bg-pod p-3 space-y-1.5">
          <label
            htmlFor="partner-adapt-name"
            className="block text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted"
          >
            {isFr ? 'Votre prénom' : 'Your name'}
          </label>
          <input
            id="partner-adapt-name"
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder={isFr ? 'Ex : Alex' : 'e.g. Alex'}
            className="w-full min-h-[38px] px-3 rounded-xl bg-card border border-ink/10 dark:border-white/10 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        {/* 2. Your weight */}
        <div className="rounded-pod bg-pod p-3 space-y-1.5">
          <label
            htmlFor="partner-adapt-weight"
            className="block text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted"
          >
            {isFr ? 'Votre poids (kg)' : 'Your weight (kg)'}
          </label>
          <input
            id="partner-adapt-weight"
            type="number"
            min={40}
            max={160}
            step={1}
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="w-full min-h-[38px] px-3 rounded-xl bg-card border border-ink/10 dark:border-white/10 text-sm font-bold tnum text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        {/* 3. Bike & tyres */}
        <div className="rounded-pod bg-pod p-3 space-y-1.5">
          <span className="block text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
            {isFr ? 'Vélo & pneus' : 'Bike & tyres'}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {BIKE_CATEGORY_CHOICES.map((opt) => {
              const selected = bikeCategory === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBikeCategory(opt.id)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold text-left transition-all cursor-pointer ${CHIP_RING_BASE} ${
                    selected
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : `bg-card text-ink-secondary hover:text-ink ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  <div className="font-bold leading-tight">{isFr ? opt.labelFr : opt.labelEn}</div>
                  <div className="text-[10px] opacity-80 tnum">{isFr ? opt.subFr : opt.subEn}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Bags & fuel */}
        <div className="rounded-pod bg-pod p-3 space-y-2">
          <span className="block text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
            {isFr ? 'Bagages & nutrition' : 'Bags & fuel'}
          </span>
          <div className="flex flex-wrap gap-1">
            {LOAD_CHOICES.map((opt) => {
              const selected = luggageKg === opt.kg;
              return (
                <button
                  key={opt.kg}
                  type="button"
                  onClick={() => setLuggageKg(opt.kg)}
                  className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer tnum ${CHIP_RING_BASE} ${
                    selected
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : `bg-card text-ink-secondary hover:text-ink ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  {isFr ? opt.labelFr : opt.labelEn}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {FUEL_CHOICES.map((opt) => {
              const selected = nutritionPref === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNutritionPref(opt.id)}
                  className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${CHIP_RING_BASE} ${
                    selected
                      ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} ${CHIP_TOKENS.teal.selectedRing}`
                      : `bg-card text-ink-secondary hover:text-ink ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  {isFr ? opt.labelFr : opt.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-ink-muted">
          {isFr
            ? 'Aucune création de compte requise · Vos réglages restent enregistrés localement.'
            : 'Zero signup required · Your profile stays saved on this device.'}
        </span>
        <div className="flex items-center gap-2">
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="min-h-[38px] px-3.5 rounded-full bg-pod hover:bg-chip text-ink-secondary text-xs font-semibold cursor-pointer"
            >
              {isFr ? 'Passer' : 'Skip for now'}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="min-h-[38px] px-4 rounded-full bg-volt hover:bg-[#E2E443] text-[#111111] ring-1 ring-inset ring-black/10 text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>{isFr ? 'Adapter le plan à mon profil' : 'Adapt plan to me'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
};

export interface GroupSyncCheckPodProps {
  sync: GroupSyncCheckResult;
  lang: 'en' | 'fr';
  onAdoptGroupSpeed?: (speedKmH: number) => void;
}

export const GroupSyncCheckPod: React.FC<GroupSyncCheckPodProps> = ({
  sync,
  lang,
  onAdoptGroupSpeed,
}) => {
  const isFr = lang === 'fr';
  const [adopted, setAdopted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!sync.isBalanced);

  const balanceTooltip = isFr
    ? 'Les deux cyclistes restent dans une zone d’endurance confortable (≤ 75 % FTP) avec un écart d’effort limité.'
    : 'Both riders stay in a comfortable endurance zone (≤ 75% FTP) with a small effort gap.';

  return (
    <div
      data-testid="group-sync-check-pod"
      className="rounded-pod bg-pod p-3.5 border border-dashed border-ink/20 dark:border-white/15"
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Users className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-rounded font-bold text-ink leading-tight">
              {isFr ? 'Synchro duo' : 'Group Sync Check'}
            </div>
            <div className="text-[11px] text-ink-muted tnum">
              {isFr ? `Allure commune · ${sync.groupSpeedKmH} km/h` : `Shared pace · ${sync.groupSpeedKmH} km/h`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-rounded font-bold ${
              sync.isBalanced
                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                : `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`
            }`}
          >
            {sync.isBalanced ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Gauge className="w-3 h-3" />
            )}
            <span>
              {sync.isBalanced
                ? isFr
                  ? 'Effort équilibré'
                  : 'Even effort'
                : isFr
                ? 'Ajustement conseillé'
                : 'Pace tweak suggested'}
            </span>
            <InfoTooltip content={balanceTooltip} size="sm" />
          </span>
          <DisclosureChevron open={isExpanded} />
        </div>
      </button>

      <Collapsible open={isExpanded} innerClassName="pt-2.5 space-y-2.5">
        {/* Two side-by-side rider effort pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[sync.sender, sync.receiver].map((rider, i) => (
            <div
              key={`${rider.label}-${i}`}
              className="rounded-xl bg-card px-3 py-2 flex items-center justify-between gap-2 border border-ink/5 dark:border-white/5"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-ink truncate">{rider.label}</div>
                <div className="text-[11px] text-ink-muted tnum">
                  {rider.avgWatts} W · {rider.kcal} kcal
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-rounded font-bold tnum shrink-0 ${
                  rider.ftpPercent > 75
                    ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`
                    : `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                }`}
              >
                {rider.zone} · {rider.ftpPercent}%
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs font-medium text-ink-secondary leading-snug">{sync.takeaway}</p>

        {sync.recommendedGroupSpeedKmH !== null && onAdoptGroupSpeed && (
          <div className="pt-0.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onAdoptGroupSpeed(sync.recommendedGroupSpeedKmH!);
                setAdopted(true);
              }}
              className="min-h-[34px] px-3.5 rounded-full bg-volt hover:bg-[#E2E443] text-[#111111] ring-1 ring-inset ring-black/10 text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer tnum"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>
                {adopted
                  ? isFr
                    ? `Allure réglée à ${sync.recommendedGroupSpeedKmH} km/h`
                    : `Group pace set to ${sync.recommendedGroupSpeedKmH} km/h`
                  : isFr
                  ? `Passer l’allure du groupe à ${sync.recommendedGroupSpeedKmH} km/h`
                  : `Set group pace to ${sync.recommendedGroupSpeedKmH} km/h`}
              </span>
            </Button>
          </div>
        )}
      </Collapsible>
    </div>
  );
};
