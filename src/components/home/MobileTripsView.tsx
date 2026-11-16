import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Sparkle,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { Button } from '@/components/arc';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';
import { TripCard } from './TripCard';
import { CompactTripCard } from './CompactTripCard';
import { UpcomingTripCard, getTripDateDetails } from './UpcomingTripCard';

export interface FilterTabItem {
  id: string;
  label: string;
  count: number;
  icon: React.ElementType;
  iconColor: string;
  selectedClasses: string;
}

interface MobileTripsViewProps {
  trips: TripProfile[];
  filteredTrips: TripProfile[];
  activeTrip?: TripProfile | null;
  nextUpcomingTrip: TripProfile | null;
  selectedArchetype: string;
  onSelectArchetype: (id: string) => void;
  filterTabs: FilterTabItem[];
  onBackHome: () => void;
  onSelectTrip: (id: string) => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripProfile) => void;
  onDuplicateTrip: (trip: TripProfile) => void;
  onDeleteTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onLoadDemoTrip?: () => void;
}

export const MobileTripsView: React.FC<MobileTripsViewProps> = ({
  trips,
  filteredTrips,
  activeTrip,
  nextUpcomingTrip,
  selectedArchetype,
  onSelectArchetype,
  filterTabs,
  onBackHome,
  onSelectTrip,
  onCreateNewTrip,
  onEditTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onLaunchDashboard,
  onLoadDemoTrip,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  // All trip cards start collapsed by default; tapping expands/collapses in-place
  const [expandedTripIds, setExpandedTripIds] = useState<Set<string>>(() => new Set());

  const toggleExpandTrip = (id: string) => {
    setExpandedTripIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Split filteredTrips into planned (soonest -> farthest, then undated) and completed (most recent -> oldest)
  const { plannedTrips, completedTrips } = useMemo(() => {
    const datedPlanned: { trip: TripProfile; time: number }[] = [];
    const undatedPlanned: TripProfile[] = [];
    const datedCompleted: { trip: TripProfile; time: number }[] = [];

    for (const tr of filteredTrips) {
      const dateStr = tr.departureDate || tr.stages?.[0]?.departureDate;
      if (dateStr) {
        const info = getTripDateDetails(tr, lang);
        if (info.diffDays < 0) {
          datedCompleted.push({ trip: tr, time: info.targetDate.getTime() });
        } else {
          datedPlanned.push({ trip: tr, time: info.targetDate.getTime() });
        }
      } else {
        undatedPlanned.push(tr);
      }
    }

    datedPlanned.sort((a, b) => a.time - b.time);
    datedCompleted.sort((a, b) => b.time - a.time);

    return {
      plannedTrips: [...datedPlanned.map((x) => x.trip), ...undatedPlanned],
      completedTrips: datedCompleted.map((x) => x.trip),
    };
  }, [filteredTrips, lang]);

  const renderTripItem = (trip: TripProfile) => {
    const isExpanded = expandedTripIds.has(trip.id);
    const isActive = activeTrip ? trip.id === activeTrip.id : false;

    if (isExpanded) {
      return (
        <div
          key={trip.id}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
              toggleExpandTrip(trip.id);
            }
          }}
          className="cursor-pointer"
        >
          <TripCard
            trip={trip}
            isActive={isActive}
            onSelect={onSelectTrip}
            onEdit={onEditTrip}
            onDuplicate={onDuplicateTrip}
            onDelete={onDeleteTrip}
            onLaunch={onLaunchDashboard}
          />
        </div>
      );
    }

    return (
      <CompactTripCard
        key={trip.id}
        trip={trip}
        isActive={isActive}
        variant="list"
        onClick={() => toggleExpandTrip(trip.id)}
        onDuplicate={onDuplicateTrip}
        onEdit={onEditTrip}
        onDelete={onDeleteTrip}
      />
    );
  };

  return (
    <div className="pt-3 space-y-5 animate-apple-in">
      {/* Top Row: Back to Home Pill + New Trip Button */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 min-h-[44px] h-10 px-4 rounded-full bg-card hover:bg-pod text-ink border border-ink/5 dark:border-white/5 text-xs font-semibold shadow-xs cursor-pointer active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4 text-current shrink-0" />
          <span>{isFr ? 'Accueil' : 'Home'}</span>
        </Button>

        <Button
          variant="ghost"
          size="md"
          onClick={onCreateNewTrip}
          className={`inline-flex items-center gap-1.5 min-h-[44px] h-10 px-5 rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] border-0 ring-0 text-[13px] font-medium cursor-pointer active:scale-[0.98] ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
        >
          <Plus className="w-4 h-4 text-current stroke-[2.2]" />
          <span>{t('createNewTripBtn')}</span>
        </Button>
      </div>

      {/* Page Heading */}
      <h1 className="text-2xl font-semibold text-ink tracking-tight leading-tight">
        {isFr ? 'Trajets' : 'Trips'}
      </h1>

      {/* Your Upcoming Trip Card (Original UpcomingTripCard design, collapsed by default on mobile) */}
      {nextUpcomingTrip && (
        <div className="relative z-20">
          <UpcomingTripCard
            trip={nextUpcomingTrip}
            allTrips={trips}
            onSelectTrip={onSelectTrip}
            onLaunchDashboard={onLaunchDashboard}
            onEditTrip={onEditTrip}
            defaultExpanded={false}
          />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-ink/5 dark:border-white/5" />

      {/* Saved Trips Section */}
      <div className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {t('savedProfilesHeading')}
              </h2>
              {selectedArchetype !== 'all' && (
                <Badge variant="zinc" size="sm" className="tnum">
                  {filteredTrips.length} / {trips.length}
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{t('savedProfilesHint')}</p>
          </div>

          {/* Horizontal Scrollable Filter Pills */}
          {trips.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3.5 px-3.5 scroll-pl-3.5 sm:-mx-5 sm:px-5 sm:scroll-pl-5 no-scrollbar">
              {filterTabs.map((tab) => {
                const isSelected = selectedArchetype === tab.id;
                const IconComponent = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectArchetype(tab.id)}
                    className={`min-h-[44px] py-1.5 px-4 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 ${
                      isSelected
                        ? tab.selectedClasses
                        : 'bg-card hover:bg-pod text-ink-secondary hover:text-ink border border-ink/5 dark:border-white/5'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isSelected ? 'text-current' : tab.iconColor
                      } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tnum transition-colors ${
                        isSelected ? 'bg-current/15 text-current' : 'bg-pod text-ink-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chronological Trip List (All Collapsed by Default; Tap Expands In-Place) */}
        {plannedTrips.length > 0 ? (
          <div className="space-y-3.5">
            {plannedTrips.map(renderTripItem)}
          </div>
        ) : trips.length > 0 && completedTrips.length === 0 ? (
          <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-8 text-center shadow-xs space-y-3">
            <h3 className="text-base font-semibold text-ink">{t('noFilteredProfilesTitle')}</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">{t('noFilteredProfilesDesc')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectArchetype('all')}
              className="mt-2 px-4 py-2 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold transition-all cursor-pointer"
            >
              {t('clearFilterBtn')}
            </Button>
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-8 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-pod flex items-center justify-center mx-auto text-ink-muted">
              <Sparkle className="w-6 h-6 text-volt-dim dark:text-volt" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink">
                {isFr ? 'Aucune sortie enregistrée' : 'No trips saved yet'}
              </h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                {isFr
                  ? 'Configurez votre première sortie personnalisée ou chargez un profil démo pour explorer votre plan de route Cadence.'
                  : 'Create your first custom ride or load a demo profile to explore your Cadence ride plan.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <Button
                variant="primary"
                size="md"
                onClick={onCreateNewTrip}
                className={`flex items-center gap-1.5 h-10 px-5 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} font-semibold text-xs rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer`}
              >
                <Plus className="w-4 h-4 text-current stroke-[2.2]" />
                <span>{t('createNewTripBtn')}</span>
              </Button>
              {onLoadDemoTrip && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onLoadDemoTrip}
                  className="flex items-center gap-1.5 h-10 px-5 bg-pod hover:bg-chip text-ink border border-black/10 dark:border-white/15 font-semibold text-xs rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <Sparkle className="w-4 h-4 text-volt-dim dark:text-volt" />
                  <span>{isFr ? 'Charger un trajet démo' : 'Load Sample Trip (Demo)'}</span>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Your Completed Trips Section */}
      {completedTrips.length > 0 && (
        <div className="space-y-3.5 pt-2">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            {isFr ? 'Vos trajets terminés' : 'Your completed trips'}
          </h2>
          <div className="space-y-3.5">
            {completedTrips.map(renderTripItem)}
          </div>
        </div>
      )}
    </div>
  );
};
