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
import { WeatherWidget } from './WeatherWidget';
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

  const currentConditionTrip = nextUpcomingTrip || activeTrip || trips[0] || null;

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 pt-2 pb-24 sm:pb-20 space-y-5">
      {/* ── Top Page Header (3-Column Span matching Mockup: Greeting Phrase, Number of Profiles, Action Bar Below) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 animate-apple-in stagger-1">
        <div className="lg:col-span-3 space-y-3.5 min-w-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight leading-tight">
                {(() => {
                  const trimmed = (username || '').trim();
                  const isGenericName = !trimmed || trimmed === 'Rider' || trimmed === 'Cycliste';
                  if (!isGenericName) {
                    return t('homeGreetingUser', { name: trimmed, username: trimmed });
                  }
                  return lang === 'fr' ? 'Où va-t-on ?' : 'Where to?';
                })()}
              </h1>
              <Badge variant="yellow-vest" size="md" className="py-1 px-3 tnum">
                {trips.length === 1 ? (lang === 'fr' ? '1 trajet' : '1 trip') : t('homeProfilesCount', { count: trips.length })}
              </Badge>
            </div>
            <p className="text-ink-muted text-[13px] mt-1 max-w-2xl leading-relaxed">
              {t('homeSubtitle')}
            </p>
          </div>

          {/* Action Controls Bar (All 4 Preserved, spanning left 3 columns under greeting) */}
          <div className="flex items-center gap-2.5 flex-wrap">
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
              className={`flex items-center gap-1.5 h-10 px-5 bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] font-medium text-[13px] rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] sm:ml-auto ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Plus className="w-4 h-4 text-current stroke-[2.2]" />
              <span>{t('createNewTripBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 5-Column Layout Grid (3 Cols Left: Main Card + Saved Trips | 2 Cols Right: Current Conditions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 items-start">
        {/* Left Column (3 of 5 Columns) */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 sm:gap-4 lg:gap-5 min-w-0">
          {/* 1. Main Card ("Your upcoming trip" Card) */}
          {nextUpcomingTrip && (
            <div className="animate-apple-in stagger-2 relative z-20">
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

          {/* 2. Saved Trips Section (Heading + Subtitle + Filter Pills + 2-Col Trip Cards Grid) */}
          <div className="space-y-5 animate-apple-in stagger-3">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink">
                    {t('savedProfilesHeading')}
                  </h2>
                  {selectedArchetype !== 'all' && (
                    <Badge variant="zinc" size="sm" className="tnum">
                      {filteredTrips.length} / {trips.length}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {t('savedProfilesHint')}
                </p>
              </div>

              {/* Archetype Quick-Filter Bar directly beneath Saved Trips subtitle */}
              {trips.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
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
            </div>

            {/* Trip Cards 2-Column Grid */}
            {filteredTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5">
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
                    {lang === 'fr' ? 'Aucune sortie enregistrée' : 'No trips saved yet'}
                  </h3>
                  <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                    {lang === 'fr'
                      ? 'Configurez votre première sortie personnalisée ou chargez un profil démo pour explorer votre plan de route Cadence.'
                      : 'Create your first custom ride or load a demo profile to explore your Cadence ride plan.'}
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
        </div>

        {/* Right Column (2 of 5 Columns: Current Conditions + Persistence Callout) */}
        <div className="lg:col-span-2 flex flex-col gap-3.5 sm:gap-4 lg:gap-5 min-w-0 lg:sticky lg:top-5 animate-apple-in stagger-2">
          {currentConditionTrip && (
            <WeatherWidget
              trip={currentConditionTrip}
              weather={currentConditionTrip.weather}
              onUpdateWeather={onUpdateWeather}
              speedKmH={currentConditionTrip.route.targetSpeedKmH}
            />
          )}

          {/* Concentric Chain-Link Persistence Callout */}
          <div className="p-4 rounded-card bg-card border border-ink/5 dark:border-white/5 flex flex-col gap-3 text-xs text-ink-secondary shadow-xs">
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
            <div className="flex items-center gap-2 flex-wrap justify-between pt-2 border-t border-ink/5 dark:border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
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
                  <button
                    type="button"
                    onClick={onOpenOnboarding}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full text-xs font-medium text-ink-secondary hover:text-ink hover:bg-pod transition-colors cursor-pointer"
                  >
                    <BookOpen2 className="w-3.5 h-3.5 text-current shrink-0" />
                    <span>{lang === 'fr' ? 'Ouvrir l’assistant de démarrage' : 'Run guided setup'}</span>
                  </button>
                )}
              </div>
              <span className="px-3 py-1 rounded-full bg-pod text-ink-muted tnum shrink-0 whitespace-nowrap">
                {t('syncedAt', { time: syncedDisplayTime })}
              </span>
            </div>
          </div>
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
