import React, { useState, useEffect } from 'react';
import { Check, ArrowCounterClockwise } from '@/components/icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
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
  const pendingCount = items.length - completedCount;
  const isAllReady = items.length > 0 && completedCount === items.length;
  const segmentTotal = Math.max(5, Math.min(8, items.length || 6));
  const activeSegments = Math.round((completedCount / Math.max(1, items.length)) * segmentTotal);

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
      <div className="flex items-center gap-1.5 mb-4" aria-hidden="true">
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

      {/* Full-Radius Chain-Link Checklist Capsules */}
      <div className="space-y-2">
        {items.map((item) => {
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
              className={`flex items-start sm:items-center gap-3 pl-3 pr-3.5 sm:pr-5 py-2.5 rounded-2xl sm:rounded-full text-[13px] cursor-pointer select-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30 ${
                item.checked
                  ? 'bg-pod/70 text-ink-secondary hover:bg-pod'
                  : 'bg-pod hover:bg-chip/80 text-ink'
              }`}
            >
              {item.checked ? (
                <IconBadge
                  theme="emerald"
                  icon={Check}
                  size="xs"
                  isSelected
                  solidBacker
                  className="mt-0.5 sm:mt-0"
                  iconClassName="stroke-[2.8]"
                />
              ) : (
                <span className="w-6 h-6 mt-0.5 sm:mt-0 rounded-full flex items-center justify-center shrink-0 bg-card ring-2 ring-inset ring-zinc-300/70 dark:bg-chip dark:ring-zinc-600/60 transition-colors" />
              )}

              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className={`leading-snug ${item.checked ? 'text-ink-muted' : 'font-medium text-ink'}`}>
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
        })}
      </div>

      {items.length > 6 && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-between text-xs text-ink-muted">
          <span>{t('checklistFooterHint')}</span>
          <span className="font-mono tnum">{completedCount}/{items.length}</span>
        </div>
      )}
    </Card>
  );
};
