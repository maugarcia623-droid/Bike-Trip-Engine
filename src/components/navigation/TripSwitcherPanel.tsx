import React, { useMemo, useState } from 'react';
import { Check, Plus, Search, X } from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { Button } from '@/components/arc/button/button';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { calculatePhysics } from '../../utils/physics';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

export interface TripSwitcherPanelProps {
  activeTrip?: TripProfile | null;
  allTrips: TripProfile[];
  riderSpecs?: RiderBikeSpecs;
  onSelectTrip: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
  mobile?: boolean;
}

export const TripSwitcherPanel: React.FC<TripSwitcherPanelProps> = ({
  activeTrip,
  allTrips,
  riderSpecs,
  onSelectTrip,
  onCreateNew,
  onClose,
  mobile = false,
}) => {
  const { lang, t } = useTranslation();
  const [query, setQuery] = useState('');
  const yellowVest = CHIP_TOKENS['yellow-vest'];

  const activePhysics = useMemo(() => {
    if (!activeTrip) return null;
    return calculatePhysics(
      activeTrip.physics,
      activeTrip.route,
      activeTrip.weather,
      lang,
      riderSpecs?.ftpWatts
    );
  }, [activeTrip, lang, riderSpecs?.ftpWatts]);

  const isGo = activePhysics?.goStatus === 'GO';
  const isCaution = activePhysics?.goStatus === 'CAUTION';

  const tripEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allTrips
      .map((tripItem) => {
        const meta = getLocalizedTripMeta(tripItem, lang);
        const itemPhysics = calculatePhysics(
          tripItem.physics,
          tripItem.route,
          tripItem.weather,
          lang,
          riderSpecs?.ftpWatts
        );
        return { tripItem, meta, itemPhysics };
      })
      .filter(({ tripItem, meta }) => {
        if (!normalizedQuery) return true;
        const haystack = `${meta.name} ${tripItem.tag} ${tripItem.route.origin || ''} ${
          tripItem.route.destination || ''
        }`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
  }, [allTrips, lang, query, riderSpecs?.ftpWatts]);

  return (
    <div role="listbox" aria-label={t('activeTripAria')} className="w-full text-ink select-none">
      {/* Header with Active Trip Count & New Trip Action */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-chip px-1">
        <span className="text-xs font-rounded text-ink-muted font-semibold tnum">
          {t('activeTripAria')} ({allTrips.length})
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onCreateNew();
            }}
            className={`${
              mobile ? 'min-h-[40px] px-3.5' : 'min-h-[34px] px-3'
            } text-xs font-bold py-1.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-[0.96] hover:brightness-[0.97] dark:hover:brightness-110 ${
              yellowVest.surface
            } ${yellowVest.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Plus className="w-3.5 h-3.5 text-current stroke-[2.5] shrink-0" />
            <span>{t('newTripButton')}</span>
          </Button>
          {mobile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              aria-label={t('menuCloseAria')}
              className="w-10 h-10 p-0 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
            >
              <X size={17} />
            </Button>
          )}
        </div>
      </div>

      {/* Inline filter when user has 6+ saved trips */}
      {allTrips.length >= 6 && (
        <div className="relative mb-2.5">
          <Search
            className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('filterTripsPlaceholder')}
            className="w-full h-10 sm:h-9 pl-8 pr-3 rounded-full bg-pod text-base sm:text-xs font-body text-ink placeholder:text-ink-muted focus:outline-none ring-2 ring-inset ring-transparent focus:ring-ink/20 dark:focus:ring-white/20"
          />
        </div>
      )}

      {/* Active Trip Feasibility Insight Capsule */}
      {activePhysics && activeTrip && !query.trim() && (
        <div className="mb-2.5 p-2.5 rounded-pod bg-pod">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-rounded uppercase tracking-wider text-ink-muted font-bold">
              {t('rideFeasibility')}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-rounded font-bold tnum px-2 py-0.5 rounded-full ${
                isGo
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : isCaution
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isGo
                    ? CHIP_TOKENS.emerald.dot
                    : isCaution
                    ? CHIP_TOKENS.amber.dot
                    : CHIP_TOKENS.rose.dot
                }`}
              />
              {isGo
                ? t('feasibilityOptimal')
                : isCaution
                ? t('feasibilityCaution')
                : t('feasibilitySevere')}
            </span>
          </div>
          <p className="text-[11px] text-ink-secondary leading-snug">{activePhysics.goStatusReason}</p>
        </div>
      )}

      {/* Scrollable Trip Options */}
      <div
        className={`${
          mobile ? 'max-h-[48dvh]' : 'max-h-64'
        } overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar`}
      >
        {tripEntries.length > 0 ? (
          tripEntries.map(({ tripItem, meta, itemPhysics }) => {
            const isSelected = activeTrip ? tripItem.id === activeTrip.id : false;
            const itemIsGo = itemPhysics.goStatus === 'GO';
            const itemIsCaution = itemPhysics.goStatus === 'CAUTION';

            return (
              <Button
                key={tripItem.id}
                variant="ghost"
                size="sm"
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTrip(tripItem.id);
                  onClose();
                }}
                title={`${meta.name} — ${
                  itemIsGo
                    ? t('feasibilityOptimal')
                    : itemIsCaution
                    ? t('feasibilityCaution')
                    : t('feasibilitySevere')
                }: ${itemPhysics.goStatusReason}`}
                className={`w-full ${
                  mobile ? 'min-h-[52px]' : 'min-h-[44px]'
                } flex items-center justify-between px-3.5 py-2.5 rounded-pod text-[13px] text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  isSelected
                    ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip text-ink`
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 font-semibold whitespace-normal break-words leading-snug">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        itemIsGo
                          ? CHIP_TOKENS.emerald.dot
                          : itemIsCaution
                          ? CHIP_TOKENS.amber.dot
                          : CHIP_TOKENS.rose.dot
                      }`}
                      aria-hidden="true"
                    />
                    <span className="break-words leading-tight">{meta.name || t('defaultTripName')}</span>
                  </div>
                  <div
                    className={`text-[11px] tnum mt-0.5 break-words leading-tight ${
                      isSelected ? 'opacity-80' : 'text-ink-muted'
                    }`}
                  >
                    <span className="font-medium mr-1">
                      {itemIsGo
                        ? t('feasibilityOptimal')
                        : itemIsCaution
                        ? t('feasibilityCaution')
                        : t('feasibilitySevere')}
                    </span>
                    ·{' '}
                    {tripItem.tag === 'VÉLOTAF'
                      ? lang === 'fr'
                        ? 'Vélotaf'
                        : 'Commute'
                      : tripItem.tag}{' '}
                    · {tripItem.route.distanceKm} km · +
                    {tripItem.route.elevationGainM ?? Math.round(tripItem.route.distanceKm * 6.5)} m
                  </div>
                </div>
                {isSelected && (
                  <div className="animate-apple-check-pop shrink-0">
                    <Check className="w-4 h-4 text-current stroke-[2.5]" />
                  </div>
                )}
              </Button>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-ink-muted">{t('quickSwitchEmpty')}</div>
        )}
      </div>

      {/* Status Legend Footer */}
      <div className="mt-2.5 pt-2 border-t border-chip px-1 flex items-center justify-between text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.emerald.dot}`} />
          {t('feasibilityOptimal')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.amber.dot}`} />
          {t('feasibilityCaution')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.rose.dot}`} />
          {t('feasibilitySevere')}
        </span>
      </div>
    </div>
  );
};
