import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash,
  ForkKnife,
  ShieldCheck,
  Droplets,
  Baguette,
  Coffee,
  X,
} from '@/components/icons';
import {
  RiderBikeSpecs,
  DietaryFilter,
  PantrySlot,
  FlavorProfile,
  PantryItem,
  NutritionPreference,
  formatFuelTarget,
} from '../../types/specs';
import {
  DEFAULT_PANTRY_CATALOG,
  isItemCompliant,
  getDefaultPantryIdsForPreference,
  resolveCompliantPantry,
} from '../../data/pantryCatalog';
import { useTranslation } from '../../context/LanguageContext';
import { TranslationKey } from '../../locales/en';
import { IconBadge } from '../common/IconBadge';
import { Badge } from '../common/Badge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';

interface PantryBuilderSectionProps {
  specs: RiderBikeSpecs;
  onChange: (updatedSpecs: RiderBikeSpecs) => void;
}

export const PantryBuilderSection: React.FC<PantryBuilderSectionProps> = ({
  specs,
  onChange,
}) => {
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';

  const [activeSlot, setActiveSlot] = useState<PantrySlot>('pre-ride');
  const [solidFlavorFilter, setSolidFlavorFilter] = useState<'all' | FlavorProfile>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom Item Form state
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameFr, setCustomNameFr] = useState('');
  const [customSlot, setCustomSlot] = useState<PantrySlot>('on-bike-solid');
  const [customCarbsG, setCustomCarbsG] = useState(25);
  const [customProteinG, setCustomProteinG] = useState(0);
  const [customKcal, setCustomKcal] = useState(100);
  const [customFlavor, setCustomFlavor] = useState<FlavorProfile>('sweet');
  const [customPortionEn, setCustomPortionEn] = useState('1 pocket snack');
  const [customPortionFr, setCustomPortionFr] = useState('1 collation de poche');
  // Unknown until the rider confirms: custom items never pass an allergen guardrail by default
  const [customCompliance, setCustomCompliance] = useState<Record<DietaryFilter, boolean>>({
    vegan: false,
    'gluten-free': false,
    'dairy-free': false,
    'nut-free': false,
    'low-fodmap': false,
  });

  const telemetryMode = specs.telemetryMode ?? 'quantitative';
  const isQuantitative = telemetryMode === 'quantitative';
  const isFuelFirst = telemetryMode === 'fuel-first';

  const activeFilters = useMemo(
    () => specs.dietaryFilters || [],
    [specs.dietaryFilters]
  );

  const activePantryIds = useMemo(() => {
    if (specs.activePantryIds && specs.activePantryIds.length > 0) {
      return specs.activePantryIds;
    }
    return getDefaultPantryIdsForPreference(specs.nutritionPreference);
  }, [specs.activePantryIds, specs.nutritionPreference]);

  // Resolved compliant pantry so toggling a dietary filter on/off never destroys the user's underlying selection
  const resolvedPantry = useMemo(() => resolveCompliantPantry(specs), [specs]);
  const effectiveActiveIds = useMemo(
    () => [
      resolvedPantry.preRide.id,
      resolvedPantry.onBikeLiquid.id,
      ...resolvedPantry.onBikeSolids.map((s) => s.id),
      resolvedPantry.postRide.id,
    ],
    [resolvedPantry]
  );

  const customItems = useMemo(
    () => specs.customPantryItems || [],
    [specs.customPantryItems]
  );

  const fullCatalog = useMemo(
    () => [...DEFAULT_PANTRY_CATALOG, ...customItems],
    [customItems]
  );

  // ── Style Preset Handler ──
  const handleSelectStyle = (
    styleKey: 'real-food' | 'mixed' | 'savory-endurance' | 'sports-fuel'
  ) => {
    const seededIds = getDefaultPantryIdsForPreference(styleKey);
    const updatedNutritionPref: NutritionPreference =
      styleKey === 'savory-endurance' ? 'real-food' : styleKey;

    // Filter seeded IDs against active dietary guardrails
    const compliant = resolveCompliantPantry({
      ...specs,
      nutritionPreference: updatedNutritionPref,
      activePantryIds: seededIds,
    });

    const validatedIds = [
      compliant.preRide.id,
      compliant.onBikeLiquid.id,
      ...compliant.onBikeSolids.map((s) => s.id),
      compliant.postRide.id,
    ];

    onChange({
      ...specs,
      nutritionPreference: updatedNutritionPref,
      activePantryIds: validatedIds,
    });
  };

  // ── Dietary Filter Toggle ──
  const handleToggleFilter = (filter: DietaryFilter) => {
    const current = specs.dietaryFilters || [];
    const nextFilters = current.includes(filter)
      ? current.filter((f) => f !== filter)
      : [...current, filter];

    onChange({
      ...specs,
      dietaryFilters: nextFilters,
    });
  };

  // ── Single-Select Slot Toggle (pre-ride, liquid, post-ride) ──
  const handleSelectSingleSlot = (item: PantryItem) => {
    if (!isItemCompliant(item, activeFilters)) return;

    const otherSlotIds = effectiveActiveIds.filter((id) => {
      const match = fullCatalog.find((c) => c.id === id);
      return match ? match.slot !== item.slot : true;
    });

    onChange({
      ...specs,
      activePantryIds: [...otherSlotIds, item.id],
    });
  };

  // ── Multi-Select Slot Toggle (on-bike-solid) ──
  const handleToggleSolidSlot = (item: PantryItem) => {
    if (!isItemCompliant(item, activeFilters)) return;

    const currentSolidIds = effectiveActiveIds.filter((id) => {
      const match = fullCatalog.find((c) => c.id === id);
      return match?.slot === 'on-bike-solid';
    });

    let nextSolidIds: string[];
    if (currentSolidIds.includes(item.id)) {
      if (currentSolidIds.length <= 1) return;
      nextSolidIds = currentSolidIds.filter((id) => id !== item.id);
    } else {
      if (currentSolidIds.length >= 3) {
        nextSolidIds = [...currentSolidIds.slice(1), item.id];
      } else {
        nextSolidIds = [...currentSolidIds, item.id];
      }
    }

    const nonSolidIds = effectiveActiveIds.filter((id) => {
      const match = fullCatalog.find((c) => c.id === id);
      return match?.slot !== 'on-bike-solid';
    });

    onChange({
      ...specs,
      activePantryIds: [...nonSolidIds, ...nextSolidIds],
    });
  };

  // ── Create Custom Item ──
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNameEn = customNameEn.trim() || 'Custom Fuel Unit';
    const finalNameFr = customNameFr.trim() || finalNameEn;

    const newItem: PantryItem = {
      id: `custom-${Date.now()}`,
      slot: customSlot,
      nameEn: finalNameEn,
      nameFr: finalNameFr,
      portionLabelEn: customPortionEn.trim() || '1 custom serving',
      portionLabelFr: customPortionFr.trim() || customPortionEn.trim() || '1 portion sur mesure',
      carbsG: Math.max(0, Math.round(customCarbsG)),
      proteinG: Math.max(0, Math.round(customProteinG)),
      kcal: Math.max(0, Math.round(customKcal)),
      flavor: customFlavor,
      compliance: customCompliance,
      isCustom: true,
    };

    const nextCustomItems = [...customItems, newItem];
    let nextActiveIds = [...activePantryIds];

    if (customSlot === 'on-bike-solid') {
      const currentSolidIds = activePantryIds.filter((id) => {
        const match = [...fullCatalog, newItem].find((c) => c.id === id);
        return match?.slot === 'on-bike-solid';
      });
      if (currentSolidIds.length >= 3) {
        nextActiveIds = [
          ...activePantryIds.filter((id) => id !== currentSolidIds[0]),
          newItem.id,
        ];
      } else {
        nextActiveIds = [...activePantryIds, newItem.id];
      }
    } else {
      const nonSlotIds = activePantryIds.filter((id) => {
        const match = [...fullCatalog, newItem].find((c) => c.id === id);
        return match ? match.slot !== customSlot : true;
      });
      nextActiveIds = [...nonSlotIds, newItem.id];
    }

    onChange({
      ...specs,
      customPantryItems: nextCustomItems,
      activePantryIds: nextActiveIds,
    });

    // Switch active tab to the created item's slot & reset form
    setActiveSlot(customSlot);
    setCustomNameEn('');
    setCustomNameFr('');
    setCustomCarbsG(25);
    setCustomProteinG(0);
    setCustomKcal(100);
    setShowCustomForm(false);
  };

  // ── Delete Custom Item ──
  const handleDeleteCustomItem = (itemId: string) => {
    const nextCustom = customItems.filter((i) => i.id !== itemId);
    const compliant = resolveCompliantPantry({
      ...specs,
      customPantryItems: nextCustom,
      activePantryIds: activePantryIds.filter((id) => id !== itemId),
    });

    const validatedIds = [
      compliant.preRide.id,
      compliant.onBikeLiquid.id,
      ...compliant.onBikeSolids.map((s) => s.id),
      compliant.postRide.id,
    ];

    onChange({
      ...specs,
      customPantryItems: nextCustom,
      activePantryIds: validatedIds,
    });
  };

  // Text-only dietary guardrail chips (zero emojis)
  const DIETARY_FILTERS_CONFIG: { id: DietaryFilter; labelKey: TranslationKey }[] = [
    { id: 'vegan', labelKey: 'filterVegan' },
    { id: 'gluten-free', labelKey: 'filterGlutenFree' },
    { id: 'dairy-free', labelKey: 'filterDairyFree' },
    { id: 'nut-free', labelKey: 'filterNutFree' },
    { id: 'low-fodmap', labelKey: 'filterLowFodmap' },
  ];

  const STYLE_PRESETS: {
    key: 'real-food' | 'mixed' | 'savory-endurance' | 'sports-fuel';
    labelKey: TranslationKey;
    subKey: TranslationKey;
  }[] = [
    {
      key: 'real-food',
      labelKey: 'stylePresetWholeFoods',
      subKey: 'stylePresetWholeFoodsSub',
    },
    {
      key: 'mixed',
      labelKey: 'stylePresetHybrid',
      subKey: 'stylePresetHybridSub',
    },
    {
      key: 'savory-endurance',
      labelKey: 'stylePresetSavory',
      subKey: 'stylePresetSavorySub',
    },
    {
      key: 'sports-fuel',
      labelKey: 'stylePresetSports',
      subKey: 'stylePresetSportsSub',
    },
  ];

  const SLOT_TABS: {
    slot: PantrySlot;
    icon: React.ElementType;
    theme: ChipTheme;
    titleKey: TranslationKey;
    subKey: TranslationKey;
    badgeLabel: string;
    activeSummary: string;
  }[] = [
    {
      slot: 'pre-ride',
      icon: Coffee,
      theme: 'amber',
      titleKey: 'slotPreRide',
      subKey: 'slotPreRideSub',
      badgeLabel: '1/1',
      activeSummary: isFr ? resolvedPantry.preRide.nameFr : resolvedPantry.preRide.nameEn,
    },
    {
      slot: 'on-bike-liquid',
      icon: Droplets,
      theme: 'sky',
      titleKey: 'slotLiquid',
      subKey: 'slotLiquidSub',
      badgeLabel: '1/1',
      activeSummary: isFr
        ? resolvedPantry.onBikeLiquid.nameFr
        : resolvedPantry.onBikeLiquid.nameEn,
    },
    {
      slot: 'on-bike-solid',
      icon: Baguette,
      theme: 'yellow-vest',
      titleKey: 'slotSolid',
      subKey: 'slotSolidSub',
      badgeLabel: `${resolvedPantry.onBikeSolids.length}/3`,
      activeSummary: resolvedPantry.onBikeSolids
        .map((s) => (isFr ? s.nameFr : s.nameEn))
        .join(' · '),
    },
    {
      slot: 'post-ride-recovery',
      icon: ForkKnife,
      theme: 'emerald',
      titleKey: 'slotPostRide',
      subKey: 'slotPostRideSub',
      badgeLabel: '1/1',
      activeSummary: isFr ? resolvedPantry.postRide.nameFr : resolvedPantry.postRide.nameEn,
    },
  ];

  const currentSlotConfig = SLOT_TABS.find((s) => s.slot === activeSlot) || SLOT_TABS[0];
  const currentSlotItems = useMemo(() => {
    const items = fullCatalog.filter((i) => i.slot === activeSlot);
    if (activeSlot === 'on-bike-solid' && solidFlavorFilter !== 'all') {
      return items.filter((i) => i.flavor === solidFlavorFilter);
    }
    return items;
  }, [fullCatalog, activeSlot, solidFlavorFilter]);

  const renderFlavorBadge = (flavor: FlavorProfile) => {
    switch (flavor) {
      case 'savory':
        return (
          <Badge variant="emerald" size="xs">
            {t('flavorSavory')}
          </Badge>
        );
      case 'sweet':
        return (
          <Badge variant="amber" size="xs">
            {t('flavorSweet')}
          </Badge>
        );
      case 'neutral':
      default:
        return (
          <Badge variant="zinc" size="xs">
            {t('flavorNeutral')}
          </Badge>
        );
    }
  };

  const renderItemMetric = (item: PantryItem) => {
    if (isQuantitative) {
      if (item.slot === 'on-bike-liquid') {
        return `${item.carbsG} g C / bidon`;
      }
      if (item.slot === 'post-ride-recovery') {
        return `${item.carbsG} g C · ${item.proteinG} g P · ${item.kcal} kcal`;
      }
      return `${item.carbsG} g C · ${item.kcal} kcal`;
    }
    if (isFuelFirst) {
      return formatFuelTarget(item.carbsG, 'fuel-first', lang);
    }
    return null;
  };

  const renderSlotItemCard = (item: PantryItem, isMultiSelect: boolean) => {
    const compliant = isItemCompliant(item, activeFilters);
    const isSelected = effectiveActiveIds.includes(item.id);
    const metricText = renderItemMetric(item);

    return (
      <div key={item.id} className="flex items-stretch gap-1.5">
        <button
          type="button"
          role={isMultiSelect ? 'checkbox' : 'radio'}
          aria-checked={isSelected}
          disabled={!compliant}
          onClick={() =>
            compliant &&
            (isMultiSelect ? handleToggleSolidSlot(item) : handleSelectSingleSlot(item))
          }
          className={`flex-1 p-2.5 rounded-pod flex flex-col justify-between gap-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40 ${
            !compliant
              ? 'opacity-40 bg-pod/40 cursor-not-allowed ring-1 ring-inset ring-red-500/30'
              : isSelected
              ? `${CHIP_TOKENS.lime.surface} ${CHIP_RING_BASE} ${CHIP_TOKENS.lime.selectedRing} text-ink cursor-pointer`
              : `bg-pod/75 hover:bg-pod text-ink-secondary hover:text-ink cursor-pointer ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
          }`}
        >
          <div className="flex items-start gap-2 min-w-0">
            <div
              className={`w-4 h-4 mt-0.5 ${
                isMultiSelect ? 'rounded-md' : 'rounded-full'
              } flex items-center justify-center shrink-0 ring-1 ring-inset transition-colors ${
                isSelected
                  ? 'bg-[#DFFF00] ring-[#A3B300] text-[#4D5200]'
                  : 'ring-ink/20 dark:ring-white/20 bg-card/60'
              }`}
            >
              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] animate-apple-check-pop" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-rounded font-bold text-ink leading-snug flex items-center gap-1.5 flex-wrap">
                <span className="break-words">{isFr ? item.nameFr : item.nameEn}</span>
                {item.isCustom && (
                  <Badge variant="sky" size="xs">
                    {t('itemCustomBadge')}
                  </Badge>
                )}
                {!compliant && (
                  <Badge variant="red" size="xs">
                    {t('itemIncompatibleBadge')}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5 leading-tight">
                {isFr ? item.portionLabelFr : item.portionLabelEn}
              </div>
            </div>
          </div>

          <div className="lane-divider my-1.5" aria-hidden="true" />
<div className="flex items-center justify-between gap-2 pl-6">
            {renderFlavorBadge(item.flavor)}
            {metricText && (
              <span className="text-[11px] font-rounded font-semibold text-ink-secondary tnum">
                {metricText}
              </span>
            )}
          </div>
        </button>

        {item.isCustom && (
          <button
            type="button"
            onClick={() => handleDeleteCustomItem(item.id)}
            aria-label={`${isFr ? 'Supprimer' : 'Delete'} ${isFr ? item.nameFr : item.nameEn}`}
            className="min-w-[44px] min-h-[44px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2.5 rounded-pod transition-colors cursor-pointer shrink-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 1. STYLE PRESETS & DIETARY GUARDRAILS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Style Presets */}
        <div className="p-3.5 rounded-pod bg-card space-y-2.5">
          <div className="flex items-center gap-2">
            <IconBadge theme="yellow-vest" icon={ForkKnife} size="sm" solidBacker />
            <div>
              <div className="text-xs font-rounded font-bold text-ink">
                {t('pantryBuilderTitle')}
              </div>
              <div className="text-[11px] text-ink-muted">
                {t('pantryBuilderSubtitle')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => {
              const isSavory = preset.key === 'savory-endurance';
              const isActive = isSavory
                ? effectiveActiveIds.includes('sol-salted-baby-potatoes') ||
                  effectiveActiveIds.includes('pre-savory-potato-hash')
                : specs.nutritionPreference === preset.key &&
                  !effectiveActiveIds.includes('sol-salted-baby-potatoes');

              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectStyle(preset.key)}
                  className={`min-h-[44px] p-2.5 rounded-sub-pod text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isActive
                      ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                      : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                  }`}
                >
                  <div>
                    <div className="text-xs font-rounded font-bold leading-tight">
                      {t(preset.labelKey)}
                    </div>
                    <div className="text-[10px] opacity-80 mt-0.5 leading-snug line-clamp-2">
                      {t(preset.subKey)}
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-rounded font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check className="w-3 h-3 text-current" />
                      <span>{isFr ? 'Actif' : 'Active'}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary & Allergen Guardrails + Fuel Delivery Strategy */}
        <div className="space-y-3.5">
          <div className="p-3.5 rounded-pod bg-card space-y-2.5">
            <div className="flex items-center gap-2">
              <IconBadge theme="lime" icon={ShieldCheck} size="sm" solidBacker />
              <div>
                <div className="text-xs font-rounded font-bold text-ink">
                  {t('dietaryGuardrailsHeading')}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {t('dietaryGuardrailsHint')}
                </div>
              </div>
            </div>

            {/* Text-Only Dietary Guardrail Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {DIETARY_FILTERS_CONFIG.map((filter) => {
                const active = activeFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleToggleFilter(filter.id)}
                    className={`px-3 min-h-[44px] sm:min-h-[34px] rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${
                      active
                        ? `${CHIP_TOKENS.lime.surface} ${CHIP_TOKENS.lime.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.lime.selectedRing}`
                        : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    <span>{t(filter.labelKey)}</span>
                    {active && <Check className="w-3 h-3 text-current" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuel Delivery & Palate Strategy */}
          <div className="p-3.5 rounded-pod bg-card space-y-2.5">
            <div className="flex items-center gap-2">
              <IconBadge theme="sky" icon={Droplets} size="sm" solidBacker />
              <div>
                <div className="text-xs font-rounded font-bold text-ink">
                  {t('fuelSplitTitle')}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {t('fuelSplitSubtitle')}
                </div>
              </div>
            </div>

            {/* Liquid vs Pocket Solid Split Slider */}
            <div className="space-y-1.5 p-2.5 rounded-sub-pod bg-pod/60">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-rounded font-semibold text-ink">
                  {t('liquidRatioLabel')}
                </span>
                <span className="font-rounded font-bold text-sky-600 dark:text-sky-400 tnum">
                  {Math.round((specs.liquidCarbRatio ?? 0.35) * 100)}% {isFr ? 'Liquide' : 'Liquid'} · {Math.round((1 - (specs.liquidCarbRatio ?? 0.35)) * 100)}% {isFr ? 'Solide' : 'Solids'}
                </span>
              </div>

              <input
                type="range"
                min={0.15}
                max={0.85}
                step={0.05}
                value={specs.liquidCarbRatio ?? 0.35}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({
                    ...specs,
                    liquidCarbRatio: Math.min(0.85, Math.max(0.15, Math.round(val * 100) / 100)),
                  });
                }}
                aria-label={t('liquidRatioLabel')}
                className="w-full peloton-slider accent-sky-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-ink-muted font-rounded tnum">
                <span>15% {isFr ? 'Liquide' : 'Liquid'}</span>
                <span>50 / 50</span>
                <span>85% {isFr ? 'Liquide' : 'Liquid'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Auto-Modulate Liquid Toggle */}
              <div className="flex items-start justify-between gap-2.5 p-2.5 rounded-sub-pod bg-pod/60">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-rounded font-semibold text-ink leading-snug">
                    {t('autoModulateLiquidLabel')}
                  </div>
                  <div className="text-[10px] text-ink-muted leading-snug">
                    {t('autoModulateLiquidHint')}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={specs.autoModulateLiquidInHeatOrEffort !== false}
                  onClick={() => {
                    onChange({
                      ...specs,
                      autoModulateLiquidInHeatOrEffort: !(specs.autoModulateLiquidInHeatOrEffort !== false),
                    });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 before:content-[''] before:absolute before:-inset-2 sm:before:inset-0 ${
                    specs.autoModulateLiquidInHeatOrEffort !== false ? 'bg-sky-500' : 'bg-ink/20 dark:bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                      specs.autoModulateLiquidInHeatOrEffort !== false ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Savory Palate Resets Toggle */}
              <div className="flex items-start justify-between gap-2.5 p-2.5 rounded-sub-pod bg-pod/60">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-rounded font-semibold text-ink leading-snug">
                    {t('savoryResetLabel')}
                  </div>
                  <div className="text-[10px] text-ink-muted leading-snug">
                    {t('savoryResetHint')}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={specs.enableSavoryPalateResets !== false}
                  onClick={() => {
                    onChange({
                      ...specs,
                      enableSavoryPalateResets: !(specs.enableSavoryPalateResets !== false),
                    });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 before:content-[''] before:absolute before:-inset-2 sm:before:inset-0 ${
                    specs.enableSavoryPalateResets !== false ? 'bg-emerald-500' : 'bg-ink/20 dark:bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                      specs.enableSavoryPalateResets !== false ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SMART 4-SLOT SEGMENTED PANTRY SELECTOR ── */}
      <div className="p-3.5 sm:p-4 rounded-pod bg-card space-y-3.5">
        {/* 4-Slot Segmented Overview Bar */}
        <div
          role="tablist"
          aria-label={t('pantryBuilderTitle')}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {SLOT_TABS.map((tab) => {
            const isActiveTab = activeSlot === tab.slot;
            const TabIcon = tab.icon;
            const token = CHIP_TOKENS[tab.theme];

            return (
              <button
                key={tab.slot}
                type="button"
                role="tab"
                aria-selected={isActiveTab}
                onClick={() => setActiveSlot(tab.slot)}
                className={`min-h-[44px] p-2.5 rounded-sub-pod text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  isActiveTab
                    ? `${token.surface} ${token.primary} ${CHIP_RING_BASE} ${token.selectedRing}`
                    : `bg-pod/70 hover:bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TabIcon className="w-4 h-4 text-current shrink-0" />
                    <span className="text-xs font-rounded font-bold truncate">
                      {t(tab.titleKey)}
                    </span>
                  </div>
                  <span className="text-[10px] font-rounded font-bold opacity-80 tnum shrink-0">
                    {tab.badgeLabel}
                  </span>
                </div>

                <div className="text-[11px] font-rounded opacity-85 line-clamp-1 w-full">
                  {tab.activeSummary}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Slot Header + Flavor Filter (for Pocket Solids) + Add Custom CTA */}
        <div className="lane-divider my-2.5" aria-hidden="true" />
<div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <IconBadge
              theme={currentSlotConfig.theme}
              icon={currentSlotConfig.icon}
              size="sm"
              solidBacker
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-[13px] font-rounded font-bold text-ink">
                  {t(currentSlotConfig.titleKey)}
                </span>
                <Badge
                  variant={activeSlot === 'on-bike-solid' ? 'yellow-vest' : 'zinc'}
                  size="xs"
                >
                  {activeSlot === 'on-bike-solid'
                    ? isFr
                      ? '1 à 3 choix'
                      : '1 to 3 items'
                    : isFr
                    ? '1 choix'
                    : 'Select 1'}
                </Badge>
              </div>
              <div className="text-[11px] text-ink-muted">
                {t(currentSlotConfig.subKey)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeSlot === 'on-bike-solid' && (
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-pod">
                {(
                  [
                    { id: 'all', label: isFr ? 'Tous' : 'All' },
                    { id: 'sweet', label: t('flavorSweet') },
                    { id: 'savory', label: t('flavorSavory') },
                    { id: 'neutral', label: t('flavorNeutral') },
                  ] as const
                ).map((flt) => {
                  const isFltActive = solidFlavorFilter === flt.id;
                  return (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => setSolidFlavorFilter(flt.id)}
                      className={`px-3 min-h-[36px] sm:min-h-[28px] rounded-full text-[11px] font-rounded font-semibold transition-all cursor-pointer ${
                        isFltActive
                          ? 'bg-card text-ink shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {flt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {!showCustomForm && (
              <button
                type="button"
                onClick={() => {
                  setCustomSlot(activeSlot);
                  setShowCustomForm(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[34px] rounded-full text-xs font-rounded font-semibold transition-all cursor-pointer ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} hover:brightness-[0.97]`}
              >
                <Plus className="w-3.5 h-3.5 text-current shrink-0" />
                <span>{t('addCustomItem')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Slot 2-Column Item Grid */}
        <div
          role={activeSlot === 'on-bike-solid' ? 'group' : 'radiogroup'}
          aria-label={t(currentSlotConfig.titleKey)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {currentSlotItems.map((item) =>
            renderSlotItemCard(item, activeSlot === 'on-bike-solid')
          )}
        </div>
      </div>

      {/* ── 4. DESIGN-SYSTEM CUSTOM PANTRY ITEM CREATOR ── */}
      {showCustomForm && (
        <form
          onSubmit={handleAddCustomItem}
          className={`p-4 rounded-pod bg-card ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} space-y-4 animate-apple-step-in`}
        >
          {/* Form Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <IconBadge theme="yellow-vest" icon={Plus} size="sm" solidBacker />
              <div>
                <div className="text-xs sm:text-sm font-rounded font-bold text-ink">
                  {t('addCustomItemTitle')}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {isFr
                    ? 'Ajoutez votre propre barre, gel, boisson ou collation maison'
                    : 'Add your own bar, gel, bottle mix, or homemade snack'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              aria-label={t('customItemCancel')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer hover:bg-chip ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary}`}
            >
              <X className="w-4 h-4 text-current" />
            </button>
          </div>

          {/* Slot Pill Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-rounded font-semibold text-ink-secondary">
              {t('customItemSlot')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SLOT_TABS.map((slotOpt) => {
                const isSelected = customSlot === slotOpt.slot;
                const SlotIcon = slotOpt.icon;
                const token = CHIP_TOKENS[slotOpt.theme];
                return (
                  <button
                    key={slotOpt.slot}
                    type="button"
                    onClick={() => setCustomSlot(slotOpt.slot)}
                    className={`px-3 py-2 rounded-pod text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                      isSelected
                        ? `${token.surface} ${token.primary} ${CHIP_RING_BASE} ${token.selectedRing}`
                        : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    <SlotIcon className="w-3.5 h-3.5 text-current shrink-0" />
                    <span className="truncate">{t(slotOpt.titleKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Names & Portion Label Pods */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-pod bg-pod space-y-1">
              <label className="block text-[11px] font-rounded font-medium text-ink-muted">
                {t('customItemNameEn')}
              </label>
              <input
                type="text"
                required
                value={customNameEn}
                onChange={(e) => setCustomNameEn(e.target.value)}
                placeholder="e.g. Electrolyte Chew"
                className="w-full text-base sm:text-xs font-rounded font-semibold text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/60"
              />
            </div>

            <div className="p-2.5 rounded-pod bg-pod space-y-1">
              <label className="block text-[11px] font-rounded font-medium text-ink-muted">
                {t('customItemNameFr')}
              </label>
              <input
                type="text"
                value={customNameFr}
                onChange={(e) => setCustomNameFr(e.target.value)}
                placeholder="ex. Gomme électrolyte"
                className="w-full min-h-[36px] text-base sm:text-sm font-rounded font-semibold text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/60"
              />
            </div>

            <div className="p-2.5 rounded-pod bg-pod space-y-1">
              <label className="block text-[11px] font-rounded font-medium text-ink-muted">
                {t('customItemPortionEn')}
              </label>
              <input
                type="text"
                value={customPortionEn}
                onChange={(e) => {
                  setCustomPortionEn(e.target.value);
                  setCustomPortionFr(e.target.value);
                }}
                placeholder="1 bar / 1 chew"
                className="w-full min-h-[36px] text-base sm:text-sm font-rounded font-semibold text-ink bg-transparent focus:outline-none placeholder:text-ink-muted/60"
              />
            </div>
          </div>

          {/* Macros or Portion Units + Flavor Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isQuantitative ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-pod bg-pod">
                  <label className="block text-[11px] font-rounded text-ink-muted mb-0.5">
                    {t('customItemCarbs')}
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={customCarbsG}
                      onChange={(e) => setCustomCarbsG(Number(e.target.value))}
                      className="w-full min-h-[36px] text-base sm:text-lg font-rounded font-bold text-ink bg-transparent focus:outline-none tnum"
                    />
                    <span className="text-[11px] text-ink-muted font-rounded">g</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-pod bg-pod">
                  <label className="block text-[11px] font-rounded text-ink-muted mb-0.5">
                    {t('customItemProtein')}
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={customProteinG}
                      onChange={(e) => setCustomProteinG(Number(e.target.value))}
                      className="w-full min-h-[36px] text-base sm:text-lg font-rounded font-bold text-ink bg-transparent focus:outline-none tnum"
                    />
                    <span className="text-[11px] text-ink-muted font-rounded">g</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-pod bg-pod">
                  <label className="block text-[11px] font-rounded text-ink-muted mb-0.5">
                    {t('customItemKcal')}
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      min="0"
                      max="800"
                      value={customKcal}
                      onChange={(e) => setCustomKcal(Number(e.target.value))}
                      className="w-full min-h-[36px] text-base sm:text-lg font-rounded font-bold text-ink bg-transparent focus:outline-none tnum"
                    />
                    <span className="text-[10px] text-ink-muted font-rounded">kcal</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Taille de portion' : 'Portion size'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { carbs: 20, label: isFr ? '1 unité' : '1 unit', sub: isFr ? 'Collation' : 'Snack' },
                      { carbs: 40, label: isFr ? '2 unités' : '2 units', sub: isFr ? 'Moyenne' : 'Regular' },
                      { carbs: 60, label: isFr ? '3 unités' : '3 units', sub: isFr ? 'Repas' : 'Full meal' },
                    ] as const
                  ).map((uOpt) => {
                    const currentBucket = customCarbsG <= 25 ? 20 : customCarbsG <= 45 ? 40 : 60;
                    const active = currentBucket === uOpt.carbs;
                    return (
                      <button
                        key={uOpt.carbs}
                        type="button"
                        onClick={() => {
                          setCustomCarbsG(uOpt.carbs);
                          setCustomKcal(uOpt.carbs * 4);
                        }}
                        className={`min-h-[44px] p-2 rounded-sub-pod text-left transition-all cursor-pointer tnum ${
                          active
                            ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                            : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                        }`}
                      >
                        <div className="text-xs font-rounded font-bold">{uOpt.label}</div>
                        <div className="text-[10px] opacity-80">{uOpt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flavor Profile Pill Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-rounded font-semibold text-ink-secondary">
                {t('customItemFlavor')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'sweet' as FlavorProfile, label: t('flavorSweet'), theme: 'amber' as ChipTheme },
                    { id: 'savory' as FlavorProfile, label: t('flavorSavory'), theme: 'emerald' as ChipTheme },
                    { id: 'neutral' as FlavorProfile, label: t('flavorNeutral'), theme: 'sky' as ChipTheme },
                  ] as const
                ).map((flav) => {
                  const active = customFlavor === flav.id;
                  const token = CHIP_TOKENS[flav.theme];
                  return (
                    <button
                      key={flav.id}
                      type="button"
                      onClick={() => setCustomFlavor(flav.id)}
                      className={`min-h-[44px] py-2.5 px-3 rounded-sub-pod text-xs font-rounded font-semibold text-center transition-all cursor-pointer ${
                        active
                          ? `${token.surface} ${token.primary} ${CHIP_RING_BASE} ${token.selectedRing}`
                          : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      {flav.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dietary Compliance Text-Only Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-rounded font-semibold text-ink-secondary">
              {t('customItemComplianceTitle')}
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DIETARY_FILTERS_CONFIG.map((f) => {
                const checked = customCompliance[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() =>
                      setCustomCompliance((prev) => ({
                        ...prev,
                        [f.id]: !prev[f.id],
                      }))
                    }
                    className={`px-3 min-h-[44px] sm:min-h-[34px] rounded-full text-xs font-rounded font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      checked
                        ? `${CHIP_TOKENS.lime.surface} ${CHIP_TOKENS.lime.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.lime.selectedRing}`
                        : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    <span>{t(f.labelKey)}</span>
                    {checked && <Check className="w-3 h-3 text-current" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="lane-divider my-2.5" aria-hidden="true" />
<div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-full text-xs font-rounded font-semibold bg-pod hover:bg-chip text-ink-secondary hover:text-ink transition-all cursor-pointer"
            >
              {t('customItemCancel')}
            </button>
            <button
              type="submit"
              className={`min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer hover:brightness-[0.97] active:scale-[0.98] ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}
            >
              {t('customItemSave')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
