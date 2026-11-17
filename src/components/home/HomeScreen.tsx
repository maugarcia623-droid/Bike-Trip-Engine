import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ArrowCounterClockwise,
  ArrowRight,
  ChevronRight,
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
  Wind,
  Clock,
  Gauge,
  X,
} from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { TripCard } from './TripCard';
import { UpcomingTripCard, getTripDateDetails } from './UpcomingTripCard';
import { WeatherWidget } from './WeatherWidget';
import { QuickRideBuilder } from './QuickRideBuilder';
import { CompactTripCard } from './CompactTripCard';
import { MobileTripsView } from './MobileTripsView';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { ModalPortal } from '../common/ModalPortal';
import { Button } from '@/components/arc';
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
import { calculatePhysics } from '../../utils/physics';
import {
  fetchWeeklyWeather,
  getCachedWeeklyWeather,
  WeeklyForecast,
} from '../../services/weatherService';
import { summarizeWeeklyWeather } from '../../utils/weeklyWeatherSummary';
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
  onOpenTools?: (tab?: 'wind' | 'leave-by' | 'pressure') => void;
  onQuickCreateTrip?: (trip: TripProfile, targetView: 'dashboard' | 'configurator') => void;
  riderSpecs?: RiderBikeSpecs;
  mobileView?: 'home' | 'trips';
  onMobileViewChange?: (view: 'home' | 'trips') => void;
  isMobileWeatherOpen?: boolean;
  onMobileWeatherOpenChange?: (open: boolean) => void;
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
  onOpenTools,
  onQuickCreateTrip,
  riderSpecs,
  mobileView: controlledMobileView,
  onMobileViewChange,
  isMobileWeatherOpen: controlledWeatherOpen,
  onMobileWeatherOpenChange,
}) => {
  const { lang, t } = useTranslation();
  const { userProfile, username } = useUserProfile();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [internalMobileView, setInternalMobileView] = useState<'home' | 'trips'>('home');
  const mobileView = controlledMobileView ?? internalMobileView;
  const setMobileView = (view: 'home' | 'trips') => {
    setInternalMobileView(view);
    onMobileViewChange?.(view);
  };
  const [internalWeatherOpen, setInternalWeatherOpen] = useState(false);
  const isMobileWeatherOpen = controlledWeatherOpen ?? internalWeatherOpen;
  const setIsMobileWeatherOpen = (open: boolean) => {
    setInternalWeatherOpen(open);
    onMobileWeatherOpenChange?.(open);
  };
  const { user, openAuthModal, lastSyncedAt } = useAuth();

  const navigateMobileView = (view: 'home' | 'trips') => {
    setMobileView(view);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

    // Chronologically next future trip (regardless of which trip is active)
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

  const greetingTitle = useMemo(() => {
    const trimmed = (username || '').trim();
    const isGenericName = !trimmed || trimmed === 'Rider' || trimmed === 'Cycliste';
    if (!isGenericName) {
      return t('homeGreetingUser', { name: trimmed, username: trimmed });
    }
    return lang === 'fr' ? 'Où va-t-on ?' : 'Where to?';
  }, [username, t, lang]);

  const weatherCoords = useMemo<[number, number]>(() => {
    const coords =
      currentConditionTrip?.route?.originCoords ||
      currentConditionTrip?.route?.coordinates?.[0] ||
      currentConditionTrip?.stages?.[0]?.route?.originCoords ||
      currentConditionTrip?.stages?.[0]?.route?.coordinates?.[0];
    if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      return coords;
    }
    return [47.2184, -1.5536];
  }, [currentConditionTrip]);

  const weatherLat = weatherCoords[0];
  const weatherLon = weatherCoords[1];

  const [weeklyForecast, setWeeklyForecast] = useState<WeeklyForecast | null>(() =>
    getCachedWeeklyWeather(weatherLat, weatherLon)
  );
  const [isWeeklyLoading, setIsWeeklyLoading] = useState<boolean>(
    () => !getCachedWeeklyWeather(weatherLat, weatherLon)
  );

  useEffect(() => {
    const cached = getCachedWeeklyWeather(weatherLat, weatherLon);
    if (cached) {
      setWeeklyForecast(cached);
      setIsWeeklyLoading(false);
      return;
    }

    let cancelled = false;
    setIsWeeklyLoading(true);
    fetchWeeklyWeather(weatherLat, weatherLon)
      .then((forecast) => {
        if (!cancelled) {
          setWeeklyForecast(forecast);
        }
      })
      .catch(() => {
        // Fallback to default subtitle when offline or forecast unavailable
      })
      .finally(() => {
        if (!cancelled) {
          setIsWeeklyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [weatherLat, weatherLon]);

  const weeklyWeatherOverview = useMemo(() => {
    if (weeklyForecast && weeklyForecast.days.length > 0) {
      return summarizeWeeklyWeather(weeklyForecast, lang);
    }
    return '';
  }, [weeklyForecast, lang]);

  const headerSubtitleContent = weeklyWeatherOverview ? (
    weeklyWeatherOverview
  ) : isWeeklyLoading ? (
    <span
      className="inline-block h-3.5 w-64 max-w-full rounded-full bg-pod animate-pulse align-middle"
      aria-hidden="true"
    />
  ) : (
    t('homeSubtitle')
  );

  const weatherStatusDotClass = useMemo(() => {
    if (!currentConditionTrip) return CHIP_TOKENS.emerald.dot;
    const res = calculatePhysics(
      currentConditionTrip.physics,
      currentConditionTrip.route,
      currentConditionTrip.weather,
      lang,
      riderSpecs?.ftpWatts
    );
    if (res.goStatus === 'NO-GO') return CHIP_TOKENS.rose.dot;
    if (res.goStatus === 'CAUTION') return CHIP_TOKENS.amber.dot;
    return CHIP_TOKENS.emerald.dot;
  }, [currentConditionTrip, lang, riderSpecs?.ftpWatts]);

  const plannedMobileTrips = useMemo(() => {
    const dated: { trip: TripProfile; time: number }[] = [];
    const undated: TripProfile[] = [];
    for (const tr of trips) {
      const dateStr = tr.departureDate || tr.stages?.[0]?.departureDate;
      if (dateStr) {
        const info = getTripDateDetails(tr, lang);
        if (info.diffDays >= 0) {
          dated.push({ trip: tr, time: info.targetDate.getTime() });
        }
      } else {
        undated.push(tr);
      }
    }
    dated.sort((a, b) => a.time - b.time);
    const list = [...dated.map((x) => x.trip), ...undated];
    return list.length > 0 ? list : trips;
  }, [trips, lang]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 pt-2 pb-24 sm:pb-20 space-y-5">
      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE NATIVE-APP LAYOUT (< md) — Matches Figma Wireframe
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-5">
        {mobileView === 'trips' ? (
          <MobileTripsView
            trips={trips}
            filteredTrips={filteredTrips}
            activeTrip={activeTrip}
            nextUpcomingTrip={nextUpcomingTrip}
            selectedArchetype={selectedArchetype}
            onSelectArchetype={setSelectedArchetype}
            filterTabs={filterTabs}
            onBackHome={() => navigateMobileView('home')}
            onSelectTrip={onSelectTrip}
            onCreateNewTrip={onCreateNewTrip}
            onEditTrip={onEditTrip}
            onDuplicateTrip={onDuplicateTrip}
            onDeleteTrip={onDeleteTrip}
            onLaunchDashboard={onLaunchDashboard}
            onLoadDemoTrip={onLoadDemoTrip}
          />
        ) : (
          <>
            {/* Greeting Header */}
            <div className="animate-apple-in stagger-1">
              <h1 className="text-2xl font-semibold text-ink tracking-tight leading-tight">
                {greetingTitle}
              </h1>
              <p className="text-ink-muted text-[13px] mt-1 leading-relaxed">
                {headerSubtitleContent}
              </p>
            </div>

            {/* Your Planned Trips Carousel Section */}
            <div className="space-y-3 animate-apple-in stagger-2">
              <button
                type="button"
                onClick={() => navigateMobileView('trips')}
                className="w-full flex items-center justify-between gap-2 py-1 text-left cursor-pointer group"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Compass className="w-5 h-5 text-ink shrink-0" />
                  <span className="text-lg font-semibold tracking-tight text-ink truncate">
                    {lang === 'fr' ? 'Vos trajets prévus' : 'Your planned trips'}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-ink transition-colors shrink-0" />
              </button>

              {plannedMobileTrips.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-1 -mx-3.5 px-3.5 scroll-pl-3.5 sm:-mx-5 sm:px-5 sm:scroll-pl-5 snap-x snap-mandatory no-scrollbar">
                  {plannedMobileTrips.map((trip) => (
                    <CompactTripCard
                      key={trip.id}
                      trip={trip}
                      isActive={activeTrip ? trip.id === activeTrip.id : false}
                      variant="carousel"
                      onClick={() => onLaunchDashboard(trip.id)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => navigateMobileView('trips')}
                    className="w-[132px] shrink-0 snap-start rounded-card p-4 bg-card hover:bg-pod text-ink border border-ink/5 dark:border-white/5 shadow-xs flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span>{lang === 'fr' ? 'Tout voir' : 'See all'}</span>
                    <ArrowRight className="w-4 h-4 text-current shrink-0" />
                  </button>
                </div>
              ) : (
                <div className="rounded-card bg-card border border-ink/5 dark:border-white/5 p-5 text-center shadow-xs space-y-3">
                  <p className="text-xs text-ink-muted">
                    {lang === 'fr'
                      ? 'Aucune sortie enregistrée pour le moment.'
                      : 'No trips saved yet.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onCreateNewTrip}
                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-semibold cursor-pointer ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <Plus className="w-3.5 h-3.5 text-current" />
                      <span>{t('createNewTripBtn')}</span>
                    </Button>
                    {onLoadDemoTrip && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onLoadDemoTrip}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-pod text-ink text-xs font-semibold cursor-pointer"
                      >
                        <Sparkle className="w-3.5 h-3.5 text-volt-dim dark:text-volt" />
                        <span>{lang === 'fr' ? 'Trajet démo' : 'Load Demo'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-ink/5 dark:border-white/5" />

            {/* Quick-Start Composer + Horizontal 1-Tap Recipes + Drop & Go */}
            {onQuickCreateTrip && (
              <QuickRideBuilder
                riderSpecs={riderSpecs}
                currentWeather={activeTrip?.weather}
                onCreateTrip={onQuickCreateTrip}
                onOpenOnboarding={onOpenOnboarding}
              />
            )}

            {/* Pre-ride Physics Tools Card */}
            {onOpenTools && (
              <div className="p-4 rounded-card bg-card border border-ink/5 dark:border-white/5 flex flex-col gap-2.5 text-xs text-ink-secondary shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-rounded font-bold text-ink">
                    {lang === 'fr' ? 'Calculateurs tactiques gratuits' : 'Pre-ride physics tools'}
                  </span>
                  <span className="text-[10px] font-rounded font-semibold px-2 py-0.5 rounded-full bg-pod text-ink-muted">
                    {lang === 'fr' ? '100 % navigateur' : '100% browser'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenTools('wind')}
                    className={`inline-flex items-center gap-1.5 min-h-[44px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary}`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? 'Coût du Vent' : 'Wind Cost'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenTools('leave-by')}
                    className={`inline-flex items-center gap-1.5 min-h-[44px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? 'Heure de départ' : 'Leave-By'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenTools('pressure')}
                    className={`inline-flex items-center gap-1.5 min-h-[44px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary}`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? 'Pression Pneus' : 'Tyre Pressure'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Persistence & Sync Callout */}
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
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAuthModal('login')}
                      className="py-1 px-3 rounded-full bg-volt text-[#111111] text-xs font-semibold hover:brightness-105 transition-all cursor-pointer shadow-xs"
                    >
                      {t('logInOrSignUp')}
                    </Button>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full bg-pod text-ink-muted tnum shrink-0 whitespace-nowrap">
                  {t('syncedAt', { time: syncedDisplayTime })}
                </span>
              </div>
            </div>

            {/* Mobile Footer */}
            <footer className="pt-4 mt-2 border-t border-ink/5 dark:border-white/5 flex flex-col gap-3 text-xs text-ink-muted">
              <span>
                {lang === 'fr'
                  ? 'Planificateur local · Physique cycliste & ravitaillement 100 % navigateur'
                  : 'Local-first cycling physics & nutrition planner'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenFeedback || (() => setIsFeedbackOpen(true))}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-card border border-ink/5 dark:border-white/5 text-xs font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer shadow-xs"
                >
                  <Send size={14} className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>{t('sendFeedbackBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  title={t('resetDefaultsTitle')}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-card border border-ink/5 dark:border-white/5 text-xs font-medium transition-colors cursor-pointer shadow-xs ${GREYSCALE_TOKENS.primary} hover:text-ink`}
                >
                  <ArrowCounterClockwise className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>{t('resetDefaultsBtn')}</span>
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP & TABLET LAYOUT (>= md) — Preserved Unchanged
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block space-y-5">
        {/* ── Top Page Header (3-Column Span matching Mockup: Greeting Phrase, Number of Profiles, Action Bar Below) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 animate-apple-in stagger-1">
        <div className="lg:col-span-3 space-y-3.5 min-w-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight leading-tight">
                {greetingTitle}
              </h1>
              <Badge variant="yellow-vest" size="md" className="py-1 px-3 tnum">
                {trips.length === 1 ? (lang === 'fr' ? '1 trajet' : '1 trip') : t('homeProfilesCount', { count: trips.length })}
              </Badge>
            </div>
            <p className="text-ink-muted text-[13px] mt-1 max-w-2xl leading-relaxed">
              {headerSubtitleContent}
            </p>
          </div>

          {/* Primary Action Controls Bar (clean: Guided Setup + Create New Trip) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenOnboarding && (
              <Button
                variant="secondary"
                size="md"
                onClick={onOpenOnboarding}
                className={`flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-4 text-[13px] font-semibold rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} hover:brightness-[0.98] dark:hover:brightness-110 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <BookOpen2 className="w-4 h-4 text-current shrink-0" />
                <span>{t('calibrationWizardBtn')}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="md"
              onClick={onCreateNewTrip}
              className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-5 bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] border-0 ring-0 font-medium text-[13px] rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98] ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Plus className="w-4 h-4 text-current stroke-[2.2]" />
              <span>{t('createNewTripBtn')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Zero-AI Quick-Start Ride Composer, 1-Tap Recipes & Drop & Go Importer ── */}
      {onQuickCreateTrip && (
        <QuickRideBuilder
          riderSpecs={riderSpecs}
          currentWeather={activeTrip?.weather}
          onCreateTrip={onQuickCreateTrip}
          onOpenOnboarding={onOpenOnboarding}
        />
      )}

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
                      <Button
                        key={tab.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedArchetype(tab.id)}
                        className={`min-h-[44px] sm:min-h-[36px] py-1.5 px-4 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 ${
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
                              ? 'bg-black/10 dark:bg-white/15 text-current'
                              : 'bg-pod text-ink-muted'
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedArchetype('all')}
                  className="mt-2 px-4 py-2 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold transition-all cursor-pointer"
                >
                  {t('clearFilterBtn')}
                </Button>
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
                      <span>{lang === 'fr' ? 'Charger un trajet démo' : 'Load Sample Trip (Demo)'}</span>
                    </Button>
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
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openAuthModal('login')}
                    className="py-1 px-3 rounded-full bg-volt text-[#111111] text-xs font-semibold hover:brightness-105 transition-all cursor-pointer shadow-xs"
                  >
                    {t('logInOrSignUp')}
                  </Button>
                )}
                {onOpenOnboarding && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenOnboarding}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full text-xs font-medium text-ink-secondary hover:text-ink hover:bg-pod transition-colors cursor-pointer"
                  >
                    <BookOpen2 className="w-3.5 h-3.5 text-current shrink-0" />
                    <span>{lang === 'fr' ? 'Ouvrir l’assistant de démarrage' : 'Run guided setup'}</span>
                  </Button>
                )}
              </div>
              <span className="px-3 py-1 rounded-full bg-pod text-ink-muted tnum shrink-0 whitespace-nowrap">
                {t('syncedAt', { time: syncedDisplayTime })}
              </span>
            </div>
          </div>

          {onOpenTools && (
            <div className="p-4 rounded-card bg-card border border-ink/5 dark:border-white/5 flex flex-col gap-2.5 text-xs text-ink-secondary shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-rounded font-bold text-ink">
                  {lang === 'fr' ? 'Calculateurs tactiques gratuits' : 'Free pre-ride physics tools'}
                </span>
                <span className="text-[10px] font-rounded font-semibold px-2 py-0.5 rounded-full bg-pod text-ink-muted">
                  {lang === 'fr' ? '100 % navigateur' : '100% browser'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenTools('wind')}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary}`}
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>{lang === 'fr' ? 'Coût du Vent' : 'Wind Cost'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenTools('leave-by')}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lang === 'fr' ? 'Heure de départ' : 'Leave-By'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenTools('pressure')}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{lang === 'fr' ? 'Pression Pneus' : 'Tyre Pressure'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtle Secondary Utilities Footer (Feedback + Reset Defaults) */}
      <footer className="pt-4 mt-2 border-t border-ink/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
        <span>
          {lang === 'fr'
            ? 'Planificateur local · Physique cycliste & ravitaillement 100 % navigateur'
            : 'Local-first cycling physics & nutrition planner'}
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenFeedback || (() => setIsFeedbackOpen(true))}
            className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <Send size={14} className="w-3.5 h-3.5 text-current shrink-0" />
            <span>{t('sendFeedbackBtn')}</span>
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            title={t('resetDefaultsTitle')}
            className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-2 text-xs font-medium transition-colors cursor-pointer ${GREYSCALE_TOKENS.primary} hover:text-ink`}
          >
            <ArrowCounterClockwise className="w-3.5 h-3.5 text-current shrink-0" />
            <span>{t('resetDefaultsBtn')}</span>
          </button>
        </div>
      </footer>
      </div>

      {/* Mobile Weather Conditions Modal */}
      <ModalPortal
        isOpen={isMobileWeatherOpen}
        onClose={() => setIsMobileWeatherOpen(false)}
        panelClassName="w-full max-w-lg bg-card text-ink rounded-card p-4 sm:p-5 shadow-2xl animate-apple-modal max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2 pb-3 px-1">
          <span className="text-sm font-semibold text-ink">{t('weatherCardTitle')}</span>
          <button
            type="button"
            onClick={() => setIsMobileWeatherOpen(false)}
            aria-label={t('closeModalAria') || 'Close'}
            className="w-8 h-8 rounded-full bg-pod hover:bg-chip flex items-center justify-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {currentConditionTrip && (
          <WeatherWidget
            trip={currentConditionTrip}
            weather={currentConditionTrip.weather}
            onUpdateWeather={onUpdateWeather}
            speedKmH={currentConditionTrip.route.targetSpeedKmH}
            embedded={true}
          />
        )}
      </ModalPortal>

      {/* Standalone User Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        tripName={activeTrip?.name}
      />
    </div>
  );
};
