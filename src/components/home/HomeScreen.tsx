import React, { useState, useMemo } from 'react';
import {
  Plus,
  ArrowCounterClockwise,
  ShieldCheck,
  Sparkle,
  BookOpen2,
  Send,
  Grid2x2,
  Briefcase,
  Lightning,
  Backpack,
  Compass,
  Cloud,
} from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { TripCard } from './TripCard';
import { UpcomingTripCard } from './UpcomingTripCard';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../utils/userProfileStorage';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import { FeedbackModal } from '../FeedbackModal';

interface HomeScreenProps {
  trips: TripProfile[];
  activeTrip?: TripProfile | null;
  onSelectTrip: (id: string) => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripProfile) => void;
  onDuplicateTrip: (trip: TripProfile) => void;
  onDeleteTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
  onResetDefaults: () => void;
  onOpenOnboarding?: () => void;
  onLoadDemoTrip?: () => void;
  onOpenFeedback?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onCreateNewTrip,
  onEditTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onLaunchDashboard,
  onUpdateWeather,
  onResetDefaults,
  onOpenOnboarding,
  onLoadDemoTrip,
  onOpenFeedback,
}) => {
  const { lang, t } = useTranslation();
  const { userProfile, username } = useUserProfile();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const { user, openAuthModal, lastSyncedAt } = useAuth();

  const syncedDisplayTime = (lastSyncedAt || new Date()).toLocaleTimeString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  // Archetype distribution counts
  const archetypeCounts = useMemo(() => {
    const counts = { all: trips.length, COMMUTE: 0, SPORT: 0, BIKEPACKING: 0, ESCAPADE: 0 };
    for (const tr of trips) {
      const arch = getArchetypeFromTag(tr.tag, tr.name);
      if (counts[arch] !== undefined) {
        counts[arch]++;
      }
    }
    return counts;
  }, [trips]);

  // Filtered trips list according to active archetype tab
  const filteredTrips = useMemo(() => {
    if (selectedArchetype === 'all') return trips;
    return trips.filter((tr) => getArchetypeFromTag(tr.tag, tr.name) === selectedArchetype);
  }, [trips, selectedArchetype]);

  // Find the next upcoming trip based on departureDate, or fallback to activeTrip / first trip
  const nextUpcomingTrip = useMemo(() => {
    if (trips.length === 0) return null;

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Map trips with day difference
    const tripsWithDiff = trips.map((tr) => {
      const dateStr = tr.departureDate || tr.stages?.[0]?.departureDate;
      if (dateStr) {
        const timeStr = tr.departureTime || '08:00';
        const d = new Date(`${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`);
        if (!isNaN(d.getTime())) {
          const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
          return { tr, diffDays };
        }
      }
      return { tr, diffDays: 9999 };
    });

    // If activeTrip exists and has an upcoming date >= 0, prioritize user selection
    if (activeTrip) {
      const activeItem = tripsWithDiff.find((x) => x.tr.id === activeTrip.id);
      if (activeItem && activeItem.diffDays >= 0) {
        return activeItem.tr;
      }
    }

    // Chronologically next future trip
    const futureTrips = tripsWithDiff
      .filter((item) => item.diffDays >= 0)
      .sort((a, b) => a.diffDays - b.diffDays);

    if (futureTrips.length > 0) {
      return futureTrips[0].tr;
    }

    return activeTrip || trips[0];
  }, [trips, activeTrip]);

  // Dynamic filter tabs with icons, brand colors, and consistent padding
  const filterTabs = useMemo(
    () =>
      [
        {
          id: 'all',
          label: t('allProfilesFilter'),
          count: archetypeCounts.all,
          icon: Grid2x2,
          iconColor: 'text-ink-secondary',
          selectedClasses: 'bg-[#111111] text-white dark:bg-[#F5F5F7] dark:text-[#111111] shadow-xs',
        },
        {
          id: 'COMMUTE',
          label: t('filterArchetypeCommute'),
          count: archetypeCounts.COMMUTE,
          icon: Briefcase,
          iconColor: 'text-[#7A8A00] dark:text-[#DFFF00]',
          selectedClasses: `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`,
        },
        {
          id: 'SPORT',
          label: t('filterArchetypeSport'),
          count: archetypeCounts.SPORT,
          icon: Lightning,
          iconColor: 'text-rose-600 dark:text-rose-400',
          selectedClasses: `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.rose.selectedRing}`,
        },
        {
          id: 'BIKEPACKING',
          label: t('filterArchetypeBikepacking'),
          count: archetypeCounts.BIKEPACKING,
          icon: Backpack,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          selectedClasses: `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`,
        },
        {
          id: 'ESCAPADE',
          label: t('filterArchetypeEscapade'),
          count: archetypeCounts.ESCAPADE,
          icon: Compass,
          iconColor: 'text-purple-600 dark:text-purple-400',
          selectedClasses: `${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing}`,
        },
      ].filter((tab) => tab.id === 'all' || tab.count > 0),
    [archetypeCounts, t]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
      {/* ── Top Page Header (Greeting Phrase, Number of Profiles, Action Buttons Kept) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 animate-apple-in stagger-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight leading-tight">
              {username ? t('homeGreetingUser', { name: username, username }) : t('homeTitle')}
            </h1>
            <Badge variant="yellow-vest" size="md" className="py-1 px-3 tnum">
              {t('homeProfilesCount', { count: trips.length })}
            </Badge>
          </div>
          <p className="text-ink-muted text-[13px] mt-1 max-w-2xl leading-relaxed">
            {t('homeSubtitle')}
          </p>
        </div>

        {/* Action Controls (All 4 Preserved) */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenFeedback || (() => setIsFeedbackOpen(true))}
            title={t('sendFeedbackBtn')}
            className={`flex items-center gap-2 h-10 px-4 text-[13px] font-semibold rounded-full transition-all duration-150 cursor-pointer ${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} hover:brightness-[0.98] dark:hover:brightness-110 active:scale-[0.98] ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Send size={16} className="w-4 h-4 text-current shrink-0" />
            <span>{t('sendFeedbackBtn')}</span>
          </button>

          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className={`flex items-center gap-2 h-10 px-4 text-[13px] font-semibold rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} hover:brightness-[0.98] dark:hover:brightness-110 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <BookOpen2 className="w-4 h-4 text-current shrink-0" />
              <span>{t('calibrationWizardBtn')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetDefaults}
            title={t('resetDefaultsTitle')}
            className={`flex items-center gap-2 h-10 px-4 text-[13px] font-medium bg-card hover:bg-pod rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] ${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <ArrowCounterClockwise className="w-4 h-4 text-current" />
            <span>{t('resetDefaultsBtn')}</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewTrip}
            className={`flex items-center gap-1.5 h-10 px-5 bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] font-medium text-[13px] rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Plus className="w-4 h-4 text-current stroke-[2.2]" />
            <span>{t('createNewTripBtn')}</span>
          </button>
        </div>
      </div>

      {/* ── "Your upcoming trip" Card (Collapsible, Day Countdown, Pre-Flight Telemetry) ── */}
      {nextUpcomingTrip && (
        <div className="animate-apple-in stagger-2">
          <UpcomingTripCard
            trip={nextUpcomingTrip}
            allTrips={trips}
            onSelectTrip={onSelectTrip}
            onLaunchDashboard={onLaunchDashboard}
            onEditTrip={onEditTrip}
            defaultExpanded={true}
          />
        </div>
      )}

      {/* ── Archetype Quick-Filter Bar (Icons, Brand Colors, Consistent Padding, No Fleet Summary) ── */}
      {trips.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none animate-apple-in stagger-3">
          {filterTabs.map((tab) => {
            const isSelected = selectedArchetype === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedArchetype(tab.id)}
                className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 ${
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
                    isSelected
                      ? 'bg-current/15 text-current'
                      : 'bg-pod text-ink-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Saved Trip Profiles Section (Trip Cards Kept) ── */}
      <div className="space-y-4 animate-apple-in stagger-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              {t('savedProfilesHeading')}
            </h2>
            {selectedArchetype !== 'all' && (
              <Badge variant="zinc" size="sm" className="tnum">
                {filteredTrips.length} / {trips.length}
              </Badge>
            )}
          </div>
          <span className="text-xs text-ink-muted">
            {t('savedProfilesHint')}
          </span>
        </div>

        {/* Trip Cards Grid */}
        {filteredTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrips.map((trip, idx) => (
              <div
                key={trip.id}
                className="animate-apple-in"
                style={{ animationDelay: `${Math.min(idx * 60 + 100, 420)}ms` }}
              >
                <TripCard
                  trip={trip}
                  isActive={activeTrip ? trip.id === activeTrip.id : false}
                  onSelect={onSelectTrip}
                  onEdit={onEditTrip}
                  onDuplicate={onDuplicateTrip}
                  onDelete={onDeleteTrip}
                  onLaunch={onLaunchDashboard}
                />
              </div>
            ))}
          </div>
        ) : trips.length > 0 ? (
          /* Empty state for filtered archetype */
          <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-8 text-center shadow-xs space-y-3">
            <h3 className="text-base font-semibold text-ink">
              {t('noFilteredProfilesTitle')}
            </h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {t('noFilteredProfilesDesc')}
            </p>
            <button
              type="button"
              onClick={() => setSelectedArchetype('all')}
              className="mt-2 px-4 py-2 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold transition-all cursor-pointer"
            >
              {t('clearFilterBtn')}
            </button>
          </div>
        ) : (
          /* Global Empty State (No trips at all) */
          <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-8 sm:p-12 text-center shadow-xs space-y-4 animate-apple-in stagger-3">
            <div className="w-12 h-12 rounded-full bg-pod flex items-center justify-center mx-auto text-ink-muted">
              <Sparkle className="w-6 h-6 text-volt-dim dark:text-volt" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink">
                {lang === 'fr' ? 'Aucun profil de trajet' : 'No Trip Profiles Saved'}
              </h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                {lang === 'fr'
                  ? 'Configurez votre première sortie personnalisée ou chargez un profil démo pour explorer le cockpit Cadence.'
                  : 'Create your first custom ride or load a demo profile to explore the Cadence cockpit telemetry.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={onCreateNewTrip}
                className={`flex items-center gap-1.5 h-10 px-5 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} font-semibold text-xs rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer`}
              >
                <Plus className="w-4 h-4 text-current stroke-[2.2]" />
                <span>{t('createNewTripBtn')}</span>
              </button>
              {onLoadDemoTrip && (
                <button
                  type="button"
                  onClick={onLoadDemoTrip}
                  className="flex items-center gap-1.5 h-10 px-5 bg-pod hover:bg-chip text-ink border border-black/10 dark:border-white/15 font-semibold text-xs rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <Sparkle className="w-4 h-4 text-volt-dim dark:text-volt" />
                  <span>{lang === 'fr' ? 'Charger un trajet démo' : 'Load Sample Trip (Demo)'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Concentric Chain-Link Persistence Callout ── */}
      <div className="mt-8 px-3.5 sm:pl-3 sm:pr-4 py-3 sm:py-2.5 rounded-2xl lg:rounded-full bg-card border border-ink/5 dark:border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs text-ink-secondary animate-apple-in stagger-5">
        <div className="flex items-center gap-3 min-w-0">
          {user ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
          ) : (
            <IconBadge theme="emerald" icon={ShieldCheck} size="md" solidBacker />
          )}
          <span className="leading-relaxed">
            {user ? t('cloudSyncNotice') : t('localStorageNotice')}
          </span>
        </div>
        <div className="flex items-center gap-2.5 w-full lg:w-auto lg:shrink-0 flex-wrap justify-start lg:justify-end">
          {!user && (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="py-1 px-3 rounded-full bg-volt text-[#111111] text-xs font-semibold hover:brightness-105 transition-all cursor-pointer shadow-xs"
            >
              {t('logInOrSignUp')}
            </button>
          )}
          {onOpenOnboarding && (
            <Badge
              variant="yellow-vest"
              size="md"
              icon={BookOpen2}
              interactive
              onClick={onOpenOnboarding}
              className="py-1.5 px-3.5 max-w-full"
              title={lang === 'fr' ? 'Ouvrir l’assistant de calibrage interactif' : 'Test Drive: Interactive Calibration Wizard'}
            >
              {lang === 'fr' ? 'Essai : Assistant de calibrage interactif' : 'Test Drive: Interactive Calibration Wizard'}
            </Badge>
          )}
          <span className="px-3 py-1 rounded-full bg-pod text-ink-muted tnum shrink-0 whitespace-nowrap">
            {t('syncedAt', { time: syncedDisplayTime })}
          </span>
        </div>
      </div>

      {/* Standalone User Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        tripName={activeTrip?.name}
      />
    </div>
  );
};
