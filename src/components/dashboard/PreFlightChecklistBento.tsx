import React, { useState, useEffect, useMemo } from 'react';
import { Check, ArrowCounterClockwise, EyeSlash, Eye } from '@/components/icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import { TripProfile, ChecklistItem, generateTripChecklist } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { useTranslation, getChecklistItemLabel } from '../../context/LanguageContext';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { loadRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';

interface PreFlightChecklistBentoProps {
  trip: TripProfile;
  onUpdateTrip?: (updated: TripProfile) => void;
  riderSpecs?: RiderBikeSpecs;
}

type ChecklistCategoryFilter = 'all' | 'critical' | 'mechanics' | 'gear' | 'food' | 'security';

function matchesChecklistFilter(item: ChecklistItem, filter: ChecklistCategoryFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'critical':
      return Boolean(item.critical);
    case 'mechanics':
      return item.category === 'mechanics' || item.id.startsWith('tire-setup-');
    case 'gear':
      return item.category === 'gear';
    case 'food':
      return item.category === 'nutrition';
    case 'security':
      return (
        item.category === 'logistics' ||
        /lock|badge|lights|night|first-aid|radar/i.test(item.id)
      );
  }
}

export const PreFlightChecklistBento: React.FC<PreFlightChecklistBentoProps> = ({
  trip,
  onUpdateTrip,
  riderSpecs: riderSpecsProp,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const riderSpecs = riderSpecsProp || loadRiderBikeSpecs();
  const activeBike = getActiveBike(riderSpecs);
  const isTubeless = Boolean(activeBike?.isTubeless);

  const effectiveMode = getArchetypeFromTag(trip.tag, trip.name);
  const effectiveTag = effectiveMode === 'COMMUTE' ? 'VÉLOTAF' : effectiveMode;
  const totalDays = trip.stages?.length || 1;

  const getInitialItems = (): ChecklistItem[] => {
    const fresh = generateTripChecklist(effectiveTag, trip.route?.distanceKm, trip.weather, {
      lang,
      customChips: trip.customChips,
      totalDays,
      isTubeless,
      carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
      nutritionPreference: riderSpecs.nutritionPreference,
    });

    const tireSetupItem: ChecklistItem = {
      id: isTubeless ? 'tire-setup-tubeless' : 'tire-setup-tube',
      label: isTubeless
        ? isFr
          ? `Kit mèches Tubeless + cartouche CO2 & niveau préventif (${activeBike.name})`
          : `Tubeless tire plugs (bacon strips) + CO2 & sealant check (${activeBike.name})`
        : isFr
        ? `Chambre à air de secours + démonte-pneus & mini-pompe (${activeBike.name})`
        : `Spare inner tube + tire levers & mini-pump (${activeBike.name})`,
      category: 'gear',
      checked: false,
      critical: true,
    };

    const existing = trip.checklist || [];
    const checkedMap = new Map(existing.map((item) => [item.id, item.checked]));

    const mergedFresh = [
      tireSetupItem,
      ...fresh.filter((i) => !i.id.startsWith('tire-setup-')),
    ];

    return mergedFresh.map((item) => ({
      ...item,
      checked: checkedMap.has(item.id) ? Boolean(checkedMap.get(item.id)) : item.checked,
    }));
  };

  const [items, setItems] = useState<ChecklistItem[]>(getInitialItems);
  const [activeFilter, setActiveFilter] = useState<ChecklistCategoryFilter>('all');
  const [hideChecked, setHideChecked] = useState<boolean>(false);

  useEffect(() => {
    setItems(getInitialItems());
  }, [
    trip.id,
    trip.tag,
    trip.name,
    trip.route?.distanceKm,
    JSON.stringify(trip.customChips),
    trip.stages?.length,
    activeBike?.id,
    activeBike?.name,
    isTubeless,
    riderSpecs.carbTargetGPerHr,
    riderSpecs.nutritionPreference,
    lang,
  ]);

  const completedCount = items.filter((i) => i.checked).length;
  const criticalCount = items.filter((i) => i.critical).length;
  const pendingCount = items.length - completedCount;
  const isAllReady = items.length > 0 && completedCount === items.length;
  const segmentTotal = Math.max(5, Math.min(8, items.length || 6));
  const activeSegments = Math.round((completedCount / Math.max(1, items.length)) * segmentTotal);

  const categoryFilteredItems = useMemo(
    () => items.filter((item) => matchesChecklistFilter(item, activeFilter)),
    [items, activeFilter]
  );

  const visibleItems = useMemo(
    () => (hideChecked ? categoryFilteredItems.filter((item) => !item.checked) : categoryFilteredItems),
    [categoryFilteredItems, hideChecked]
  );

  const hiddenInCategoryCount = categoryFilteredItems.length - visibleItems.length;

  const filterPills: Array<{ id: ChecklistCategoryFilter; label: string }> = [
    { id: 'all', label: t('checklistFilterAll', { count: items.length }) },
    { id: 'critical', label: t('checklistFilterCritical', { count: criticalCount }) },
    { id: 'mechanics', label: t('checklistFilterMechanics') },
    { id: 'gear', label: t('checklistFilterGear') },
    { id: 'food', label: t('checklistFilterFood') },
    { id: 'security', label: t('checklistFilterSecurity') },
  ];

  const handleToggle = (id: string) => {
    const updatedChecklist = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedChecklist);
    if (onUpdateTrip) {
      onUpdateTrip({ ...trip, checklist: updatedChecklist });
    }
  };

  const handleRegenerate = () => {
    const fresh = generateTripChecklist(effectiveTag, trip.route?.distanceKm, trip.weather, {
      lang,
      customChips: trip.customChips,
      totalDays,
      isTubeless,
      carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
      nutritionPreference: riderSpecs.nutritionPreference,
    });
    const tireSetupItem: ChecklistItem = {
      id: isTubeless ? 'tire-setup-tubeless' : 'tire-setup-tube',
      label: isTubeless
        ? isFr
          ? `Kit mèches Tubeless + cartouche CO2 & niveau préventif (${activeBike.name})`
          : `Tubeless tire plugs (bacon strips) + CO2 & sealant check (${activeBike.name})`
        : isFr
        ? `Chambre à air de secours + démonte-pneus & mini-pompe (${activeBike.name})`
        : `Spare inner tube + tire levers & mini-pump (${activeBike.name})`,
      category: 'gear',
      checked: false,
      critical: true,
    };
    const nextList = [tireSetupItem, ...fresh.filter((i) => !i.id.startsWith('tire-setup-'))];
    setItems(nextList);
    if (onUpdateTrip) {
      onUpdateTrip({ ...trip, checklist: nextList });
    }
  };

  return (
    <Card
      title={t('checklistTitle')}
      subtitle={t('checklistSub', { done: completedCount, total: items.length, tag: effectiveTag })}
      badge={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isTubeless ? 'emerald' : 'zinc'} size="sm" className="tnum">
            {isTubeless
              ? isFr
                ? 'Montage Tubeless'
                : 'Tubeless Setup'
              : isFr
              ? 'Chambre à air'
              : 'Inner Tube'}
          </Badge>

          <button
            type="button"
            onClick={handleRegenerate}
            title={t('resetChecklistTitle')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full hover:brightness-[0.97] dark:hover:brightness-110 transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <ArrowCounterClockwise className="w-4 h-4 text-current" />
            <span>{t('resetBtn')}</span>
          </button>

          <Badge
            variant={isAllReady ? 'emerald' : 'yellow-vest'}
            size="md"
            dot
            className="py-1.5 px-3 tnum"
          >
            {isAllReady ? t('readyStatus') : t('pendingCountStatus', { count: pendingCount })}
          </Badge>
        </div>
      }
    >
      {/* Segmented Asphalt Road-Lane Progress Dashes */}
      <div className="flex items-center gap-1.5 mb-3" aria-hidden="true">
        {Array.from({ length: segmentTotal }).map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              idx < activeSegments
                ? isAllReady
                  ? CHIP_TOKENS.emerald.dot
                  : CHIP_TOKENS['yellow-vest'].dot
                : 'bg-pod dark:bg-chip'
            }`}
          />
        ))}
      </div>

      {/* Category Filter Pill Bar + Hide Checked Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div
          role="tablist"
          aria-label={t('checklistFilterAria')}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1"
        >
          {filterPills.map((pill) => {
            const isSelected = activeFilter === pill.id;
            const isCriticalPill = pill.id === 'critical';
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-rounded font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer select-none tnum ${CHIP_RING_BASE} ${
                  isSelected
                    ? isCriticalPill
                      ? `${CHIP_TOKENS.orange.surface} ${CHIP_TOKENS.orange.primary} ${CHIP_TOKENS.orange.selectedRing}`
                      : `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                    : `bg-pod hover:bg-chip text-ink-secondary hover:text-ink ${CHIP_RING_UNSELECTED}`
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setHideChecked((prev) => !prev)}
          aria-pressed={hideChecked}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-rounded font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer select-none tnum ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            hideChecked
              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
              : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_UNSELECTED} hover:text-ink`
          }`}
        >
          {hideChecked ? (
            <Eye className="w-3.5 h-3.5 text-current shrink-0" />
          ) : (
            <EyeSlash className="w-3.5 h-3.5 text-current shrink-0" />
          )}
          <span>{t('checklistHideChecked')}</span>
          {hideChecked && completedCount > 0 && (
            <span className="font-mono text-[11px] opacity-80">({completedCount})</span>
          )}
        </button>
      </div>

      {/* Bounded Scroll Viewport: Full-Radius Chain-Link Checklist Capsules */}
      <div className="max-h-[320px] overflow-y-auto pr-1.5 space-y-2 scrollbar-thin">
        {visibleItems.length === 0 ? (
          <div className="rounded-pod bg-pod p-4 text-center text-xs text-ink-muted space-y-2">
            <p className="tnum">
              {categoryFilteredItems.length === 0
                ? t('checklistEmptyCategory')
                : t('checklistEmptyAllPacked', { count: hiddenInCategoryCount })}
            </p>
            {categoryFilteredItems.length > 0 && hideChecked && (
              <button
                type="button"
                onClick={() => setHideChecked(false)}
                className="px-3 py-1 rounded-full text-xs font-rounded font-semibold bg-card hover:bg-chip text-ink transition-colors cursor-pointer tnum"
              >
                {t('checklistShowChecked', { count: hiddenInCategoryCount })}
              </button>
            )}
          </div>
        ) : (
          visibleItems.map((item) => {
            const displayLabel = item.id.startsWith('tire-setup-')
              ? item.label
              : getChecklistItemLabel(item, trip.route?.distanceKm, lang, {
                  isTubeless,
                  carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
                  nutritionPreference: riderSpecs.nutritionPreference,
                });
            return (
              <div
                key={item.id}
                role="checkbox"
                aria-checked={item.checked}
                tabIndex={0}
                onClick={() => handleToggle(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(item.id);
                  }
                }}
                className={`flex items-start sm:items-center gap-3 pl-3 pr-3.5 sm:pr-5 py-2.5 rounded-2xl sm:rounded-full text-[13px] cursor-pointer select-none transition-all duration-150 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30 ${
                  item.checked
                    ? 'bg-pod/70 text-ink-secondary hover:bg-pod'
                    : 'bg-pod hover:bg-chip/80 text-ink'
                }`}
              >
                {item.checked ? (
                  <div className="animate-apple-check-pop">
                    <IconBadge
                      theme="emerald"
                      icon={Check}
                      size="xs"
                      isSelected
                      solidBacker
                      className="mt-0.5 sm:mt-0"
                      iconClassName="stroke-[2.8]"
                    />
                  </div>
                ) : (
                  <span className="w-6 h-6 mt-0.5 sm:mt-0 rounded-full flex items-center justify-center shrink-0 bg-card ring-2 ring-inset ring-zinc-300/70 dark:bg-chip dark:ring-zinc-600/60 transition-colors" />
                )}

                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span
                    className={`leading-snug ${
                      item.checked ? 'text-ink-muted line-through decoration-ink-muted/40' : 'font-medium text-ink'
                    }`}
                  >
                    {displayLabel}
                  </span>
                  {item.critical && !item.checked && (
                    <Badge variant="orange" size="xs" className="shrink-0">
                      {t('requiredBadge')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 6 && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-between text-xs text-ink-muted">
          <span>{t('checklistFooterHint')}</span>
          <span className="font-mono tnum">
            {completedCount}/{items.length}
          </span>
        </div>
      )}
    </Card>
  );
};
