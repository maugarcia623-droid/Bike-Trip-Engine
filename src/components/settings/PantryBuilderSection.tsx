import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash,
  Sparkle,
  ForkKnife,
  Leaf,
  ShieldCheck,
  Droplets,
  Bottle,
  Baguette,
  Package,
  TriangleAlert,
  X,
} from '@/components/icons';
import {
  RiderBikeSpecs,
  DietaryFilter,
  PantrySlot,
  FlavorProfile,
  PantryItem,
  NutritionPreference,
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
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
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
  const [customCompliance, setCustomCompliance] = useState<Record<DietaryFilter, boolean>>({
    vegan: true,
    'gluten-free': true,
    'dairy-free': true,
    'nut-free': true,
    'low-fodmap': false,
  });

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

    // Ensure currently selected items remain compliant
    const compliant = resolveCompliantPantry({
      ...specs,
      dietaryFilters: nextFilters,
      activePantryIds,
    });

    const validatedIds = [
      compliant.preRide.id,
      compliant.onBikeLiquid.id,
      ...compliant.onBikeSolids.map((s) => s.id),
      compliant.postRide.id,
    ];

    onChange({
      ...specs,
      dietaryFilters: nextFilters,
      activePantryIds: validatedIds,
    });
  };

  // ── Single-Select Slot Toggle (pre-ride, liquid, post-ride) ──
  const handleSelectSingleSlot = (item: PantryItem) => {
    if (!isItemCompliant(item, activeFilters)) return;

    // Remove existing item for this slot, add selected item
    const otherSlotIds = activePantryIds.filter((id) => {
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

    const currentSolidIds = activePantryIds.filter((id) => {
      const match = fullCatalog.find((c) => c.id === id);
      return match?.slot === 'on-bike-solid';
    });

    let nextSolidIds: string[];
    if (currentSolidIds.includes(item.id)) {
      // Must keep at least 1 solid
      if (currentSolidIds.length <= 1) return;
      nextSolidIds = currentSolidIds.filter((id) => id !== item.id);
    } else {
      // Max 3 solids
      if (currentSolidIds.length >= 3) {
        nextSolidIds = [...currentSolidIds.slice(1), item.id];
      } else {
        nextSolidIds = [...currentSolidIds, item.id];
      }
    }

    const nonSolidIds = activePantryIds.filter((id) => {
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
      portionLabelFr: customPortionFr.trim() || '1 portion sur mesure',
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

    // Reset Form
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

  // Filter Catalog by Slots
  const preRideCatalog = fullCatalog.filter((i) => i.slot === 'pre-ride');
  const liquidCatalog = fullCatalog.filter((i) => i.slot === 'on-bike-liquid');
  const solidCatalog = fullCatalog.filter((i) => i.slot === 'on-bike-solid');
  const postRideCatalog = fullCatalog.filter((i) => i.slot === 'post-ride-recovery');

  const DIETARY_FILTERS_CONFIG: { id: DietaryFilter; labelKey: TranslationKey; icon: string }[] = [
    { id: 'vegan', labelKey: 'filterVegan', icon: '🌱' },
    { id: 'gluten-free', labelKey: 'filterGlutenFree', icon: '🌾' },
    { id: 'dairy-free', labelKey: 'filterDairyFree', icon: '🥛' },
    { id: 'nut-free', labelKey: 'filterNutFree', icon: '🥜' },
    { id: 'low-fodmap', labelKey: 'filterLowFodmap', icon: '🌿' },
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

  return (
    <div className="space-y-4">
      {/* ── 1. STYLE PRESETS ── */}
      <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
        <div className="flex items-center gap-2">
          <IconBadge theme="yellow-vest" icon={ForkKnife} size="sm" solidBacker />
          <div>
            <div className="text-xs font-bold text-ink">
              {t('pantryBuilderTitle')}
            </div>
            <div className="text-[11px] text-ink-muted">
              {t('pantryBuilderSubtitle')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STYLE_PRESETS.map((preset) => {
            const isSavory = preset.key === 'savory-endurance';
            const isActive = isSavory
              ? activePantryIds.includes('sol-salted-baby-potatoes') ||
                activePantryIds.includes('pre-savory-potato-hash')
              : specs.nutritionPreference === preset.key &&
                !activePantryIds.includes('sol-salted-baby-potatoes');

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleSelectStyle(preset.key)}
                className={`p-2.5 rounded-pod text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isActive
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                    : 'bg-pod text-ink-secondary hover:text-ink'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {t(preset.labelKey)}
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5 leading-snug">
                    {t(preset.subKey)}
                  </div>
                </div>
                {isActive && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span>{isFr ? 'Actif' : 'Active'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. DIETARY & ALLERGEN GUARDRAILS ── */}
      <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <IconBadge theme="lime" icon={ShieldCheck} size="sm" solidBacker />
            <div>
              <div className="text-xs font-bold text-ink">
                {t('dietaryGuardrailsHeading')}
              </div>
              <div className="text-[11px] text-ink-muted">
                {t('dietaryGuardrailsHint')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {DIETARY_FILTERS_CONFIG.map((filter) => {
            const active = activeFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleToggleFilter(filter.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-volt-lime/20 text-volt-lime border border-volt-lime/40 shadow-xs'
                    : 'bg-pod text-ink-muted hover:text-ink border border-ink/5 dark:border-white/5'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{t(filter.labelKey)}</span>
                {active && <Check className="w-3 h-3 text-volt-lime ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2.5 FUEL DELIVERY & PALATE STRATEGY (PHASE 9) ── */}
      <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <IconBadge theme="sky" icon={Droplets} size="sm" solidBacker />
          <div>
            <div className="text-xs font-bold text-ink">
              {t('fuelSplitTitle')}
            </div>
            <div className="text-[11px] text-ink-muted">
              {t('fuelSplitSubtitle')}
            </div>
          </div>
        </div>

        {/* Liquid vs Pocket Solid Split Slider */}
        <div className="space-y-1.5 p-2.5 rounded-pod bg-pod/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">
              {t('liquidRatioLabel')}
            </span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
              {Math.round((specs.liquidCarbRatio ?? 0.35) * 100)}% {isFr ? 'Liquide' : 'Liquid'} · {Math.round((1 - (specs.liquidCarbRatio ?? 0.35)) * 100)}% {isFr ? 'Solide' : 'Pocket Solids'}
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
            className="w-full accent-sky-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-ink-muted font-mono">
            <span>15% {isFr ? 'Liquide' : 'Liquid'}</span>
            <span>50 / 50</span>
            <span>85% {isFr ? 'Liquide' : 'Liquid'}</span>
          </div>
        </div>

        {/* Auto-Modulate Liquid Toggle */}
        <div className="flex items-start justify-between gap-3 p-2.5 rounded-pod bg-pod/60">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-ink">
              {t('autoModulateLiquidLabel')}
            </div>
            <div className="text-[11px] text-ink-muted leading-relaxed">
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
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${
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
        <div className="flex items-start justify-between gap-3 p-2.5 rounded-pod bg-pod/60">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-ink">
              {t('savoryResetLabel')}
            </div>
            <div className="text-[11px] text-ink-muted leading-relaxed">
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
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${
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

      {/* ── 3. SLOT CHECKLISTS ── */}
      <div className="space-y-3">
        {/* SLOT 1: PRE-RIDE */}
        <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">☕</span>
              <div>
                <div className="text-xs font-bold text-ink">
                  {t('slotPreRide')}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {t('slotPreRideSub')}
                </div>
              </div>
            </div>
            <Badge variant="zinc" size="xs">
              {isFr ? '1 choix' : 'Select 1'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {preRideCatalog.map((item) => {
              const compliant = isItemCompliant(item, activeFilters);
              const isSelected = activePantryIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => compliant && handleSelectSingleSlot(item)}
                  className={`p-2.5 rounded-sub-pod flex items-center justify-between gap-2 transition-all ${
                    !compliant
                      ? 'opacity-40 bg-pod/40 cursor-not-allowed border border-dashed border-red-500/30'
                      : isSelected
                      ? 'bg-volt-lime/10 border border-volt-lime/40 text-ink cursor-pointer'
                      : 'bg-pod/70 hover:bg-pod text-ink-secondary hover:text-ink cursor-pointer border border-ink/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-volt-lime border-volt-lime text-black'
                          : 'border-ink/20 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] animate-apple-check-pop" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{isFr ? item.nameFr : item.nameEn}</span>
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
                      <div className="text-[10px] text-ink-muted">
                        {isFr ? item.portionLabelFr : item.portionLabelEn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderFlavorBadge(item.flavor)}
                    <span className="text-[11px] font-mono font-medium text-ink-muted tnum">
                      {item.carbsG}g C · {item.kcal} kcal
                    </span>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomItem(item.id);
                        }}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLOT 2: ON-BIKE LIQUID */}
        <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">💧</span>
              <div>
                <div className="text-xs font-bold text-ink">
                  {t('slotLiquid')}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {t('slotLiquidSub')}
                </div>
              </div>
            </div>
            <Badge variant="zinc" size="xs">
              {isFr ? '1 choix' : 'Select 1'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {liquidCatalog.map((item) => {
              const compliant = isItemCompliant(item, activeFilters);
              const isSelected = activePantryIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => compliant && handleSelectSingleSlot(item)}
                  className={`p-2.5 rounded-sub-pod flex items-center justify-between gap-2 transition-all ${
                    !compliant
                      ? 'opacity-40 bg-pod/40 cursor-not-allowed border border-dashed border-red-500/30'
                      : isSelected
                      ? 'bg-volt-lime/10 border border-volt-lime/40 text-ink cursor-pointer'
                      : 'bg-pod/70 hover:bg-pod text-ink-secondary hover:text-ink cursor-pointer border border-ink/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-volt-lime border-volt-lime text-black'
                          : 'border-ink/20 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] animate-apple-check-pop" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{isFr ? item.nameFr : item.nameEn}</span>
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
                      <div className="text-[10px] text-ink-muted">
                        {isFr ? item.portionLabelFr : item.portionLabelEn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderFlavorBadge(item.flavor)}
                    <span className="text-[11px] font-mono font-medium text-ink-muted tnum">
                      {item.carbsG}g C / bidon
                    </span>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomItem(item.id);
                        }}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLOT 3: POCKET SOLIDS */}
        <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🥖</span>
              <div>
                <div className="text-xs font-bold text-ink">
                  {t('slotSolid')}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {t('slotSolidSub')}
                </div>
              </div>
            </div>
            <Badge variant="yellow-vest" size="xs">
              {isFr ? '1 à 3 choix' : '1 to 3 items'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {solidCatalog.map((item) => {
              const compliant = isItemCompliant(item, activeFilters);
              const isSelected = activePantryIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => compliant && handleToggleSolidSlot(item)}
                  className={`p-2.5 rounded-sub-pod flex items-center justify-between gap-2 transition-all ${
                    !compliant
                      ? 'opacity-40 bg-pod/40 cursor-not-allowed border border-dashed border-red-500/30'
                      : isSelected
                      ? 'bg-volt-lime/10 border border-volt-lime/40 text-ink cursor-pointer'
                      : 'bg-pod/70 hover:bg-pod text-ink-secondary hover:text-ink cursor-pointer border border-ink/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-volt-lime border-volt-lime text-black'
                          : 'border-ink/20 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] animate-apple-check-pop" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{isFr ? item.nameFr : item.nameEn}</span>
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
                      <div className="text-[10px] text-ink-muted">
                        {isFr ? item.portionLabelFr : item.portionLabelEn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderFlavorBadge(item.flavor)}
                    <span className="text-[11px] font-mono font-medium text-ink-muted tnum">
                      {item.carbsG}g C · {item.kcal} kcal
                    </span>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomItem(item.id);
                        }}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLOT 4: POST-RIDE RECOVERY */}
        <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🫐</span>
              <div>
                <div className="text-xs font-bold text-ink">
                  {t('slotPostRide')}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {t('slotPostRideSub')}
                </div>
              </div>
            </div>
            <Badge variant="zinc" size="xs">
              {isFr ? '1 choix' : 'Select 1'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {postRideCatalog.map((item) => {
              const compliant = isItemCompliant(item, activeFilters);
              const isSelected = activePantryIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => compliant && handleSelectSingleSlot(item)}
                  className={`p-2.5 rounded-sub-pod flex items-center justify-between gap-2 transition-all ${
                    !compliant
                      ? 'opacity-40 bg-pod/40 cursor-not-allowed border border-dashed border-red-500/30'
                      : isSelected
                      ? 'bg-volt-lime/10 border border-volt-lime/40 text-ink cursor-pointer'
                      : 'bg-pod/70 hover:bg-pod text-ink-secondary hover:text-ink cursor-pointer border border-ink/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-volt-lime border-volt-lime text-black'
                          : 'border-ink/20 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3] animate-apple-check-pop" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{isFr ? item.nameFr : item.nameEn}</span>
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
                      <div className="text-[10px] text-ink-muted">
                        {isFr ? item.portionLabelFr : item.portionLabelEn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderFlavorBadge(item.flavor)}
                    <span className="text-[11px] font-mono font-medium text-ink-muted tnum">
                      {item.carbsG}g C · {item.proteinG}g P · {item.kcal} kcal
                    </span>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomItem(item.id);
                        }}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. CUSTOM ITEM CREATOR MODAL / FORM ── */}
      <div className="pt-1">
        {!showCustomForm ? (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="w-full py-2.5 px-3 rounded-pod border border-dashed border-ink/15 dark:border-white/15 hover:border-volt-lime/60 hover:bg-volt-lime/5 text-ink-secondary hover:text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-volt-lime" />
            <span>{t('addCustomItem')}</span>
          </button>
        ) : (
          <form
            onSubmit={handleAddCustomItem}
            className="p-3.5 rounded-pod bg-card border border-volt-lime/30 space-y-3 animate-apple-step-in"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink">
                {t('addCustomItemTitle')}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="text-ink-muted hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemNameEn')}
                </label>
                <input
                  type="text"
                  required
                  value={customNameEn}
                  onChange={(e) => setCustomNameEn(e.target.value)}
                  placeholder="e.g. Electrolyte Chew"
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemNameFr')}
                </label>
                <input
                  type="text"
                  value={customNameFr}
                  onChange={(e) => setCustomNameFr(e.target.value)}
                  placeholder="ex. Gomme électrolyte"
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemSlot')}
                </label>
                <select
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value as PantrySlot)}
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime"
                >
                  <option value="pre-ride">{t('slotPreRide')}</option>
                  <option value="on-bike-liquid">{t('slotLiquid')}</option>
                  <option value="on-bike-solid">{t('slotSolid')}</option>
                  <option value="post-ride-recovery">{t('slotPostRide')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemCarbs')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={customCarbsG}
                  onChange={(e) => setCustomCarbsG(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime tnum"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemProtein')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={customProteinG}
                  onChange={(e) => setCustomProteinG(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime tnum"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemKcal')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="800"
                  value={customKcal}
                  onChange={(e) => setCustomKcal(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime tnum"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemFlavor')}
                </label>
                <select
                  value={customFlavor}
                  onChange={(e) => setCustomFlavor(e.target.value as FlavorProfile)}
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime"
                >
                  <option value="sweet">{t('flavorSweet')}</option>
                  <option value="savory">{t('flavorSavory')}</option>
                  <option value="neutral">{t('flavorNeutral')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  {t('customItemPortionEn')}
                </label>
                <input
                  type="text"
                  value={customPortionEn}
                  onChange={(e) => setCustomPortionEn(e.target.value)}
                  placeholder="1 bar / 1 chew"
                  className="w-full text-xs p-2 rounded-sub-pod bg-pod border border-ink/10 dark:border-white/10 text-ink focus:outline-none focus:ring-1 focus:ring-volt-lime"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-muted mb-1">
                {t('customItemComplianceTitle')}
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {DIETARY_FILTERS_CONFIG.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-1.5 text-xs text-ink cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={customCompliance[f.id]}
                      onChange={(e) =>
                        setCustomCompliance((prev) => ({
                          ...prev,
                          [f.id]: e.target.checked,
                        }))
                      }
                      className="rounded border-ink/20 accent-volt-lime"
                    />
                    <span>{f.icon} {t(f.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="px-3 py-1.5 rounded-pod text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                {t('customItemCancel')}
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-pod bg-volt-lime text-black font-bold text-xs hover:bg-volt-lime/90 transition-all cursor-pointer"
              >
                {t('customItemSave')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
