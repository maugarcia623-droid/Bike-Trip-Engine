import { RiderBikeSpecsModal } from "./components/settings/RiderBikeSpecsModal";
import { loadRiderBikeSpecs, saveRiderBikeSpecs, getActiveBike } from "./utils/specsStorage";
import { RiderBikeSpecs } from "./types/specs";
import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { IconContext } from '@/components/icons';
import { generateTripChecklist, TripProfile, WeatherCondition } from "./types/trip";
import {
  loadTrips,
  saveTrips,
  getActiveTripId,
  setActiveTripId as saveActiveTripId,
  INITIAL_PROFILES,
  generateRandomPresetTrips,
  buildDefaultNewTripTemplate,
} from './utils/storage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  Language,
  LanguageProvider,
  STORAGE_KEY_LANG,
  loadInitialLanguage,
  useTranslation,
} from './context/LanguageContext';
import { TopTelemetryBar } from './components/navigation/TopTelemetryBar';
import { DynamicIslandNav } from './components/navigation/DynamicIslandNav';
import { HomeScreen } from './components/home/HomeScreen';
import { ConfiguratorScreen } from './components/configurator/ConfiguratorScreen';
import { BentoDashboard } from './components/dashboard/BentoDashboard';
import { DashboardEmptyState } from './components/dashboard/DashboardEmptyState';
import { PrintFlightSheet } from './components/print/PrintFlightSheet';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';
import { fetchCloudUserState, saveCloudUserState, isCloudDataEmpty } from './services/cloudSync';
import { AppDataPayload } from './types/auth';

const STORAGE_KEY_ONBOARDED = 'bike_trip_engine_onboarded_v1';

function hasPotentialSupabaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('sb-') || key.includes('supabase.auth.token')) &&
        key.endsWith('-auth-token')
      ) {
        const item = localStorage.getItem(key);
        if (item && item.includes('access_token')) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

interface CockpitErrorBoundaryProps {
  children: React.ReactNode;
  onResetCockpit: () => void;
}

interface CockpitErrorBoundaryState {
  error: Error | null;
}

class CockpitErrorBoundary extends React.Component<
  CockpitErrorBoundaryProps,
  CockpitErrorBoundaryState
> {
  constructor(props: CockpitErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): CockpitErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Cockpit render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="rounded-card bg-card text-ink p-6 border border-ink/10 dark:border-white/10 shadow-lg space-y-3">
            <h2 className="text-lg font-bold text-ink">
              Cockpit display interrupted
            </h2>
            <p className="text-xs text-ink-muted font-mono break-words">
              {this.state.error.message}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  this.props.onResetCockpit();
                }}
                className="px-4 py-2 rounded-full bg-volt text-[#111111] text-xs font-bold cursor-pointer"
              >
                Reset &amp; Reload Cockpit
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
  } catch (e) {
    console.error('Error saving onboarding state:', e);
  }
}

function AppContent() {
  const { isDark } = useTheme();
  const { lang, t } = useTranslation();
  const { user, setSyncStatus, setLastSyncedAt, registerForceSync } = useAuth();
  const [trips, setTrips] = useState<TripProfile[]>(() => loadTrips());
  const [activeTripId, setActiveTripId] = useState<string>(() =>
    getActiveTripId(trips)
  );
  const [riderSpecs, setRiderSpecs] = useState(loadRiderBikeSpecs);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);

  const isCloudApplyingRef = React.useRef(false);
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedPayloadHashRef = React.useRef<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    const search = window.location.search;
    if (
      hash === '#configurator' ||
      hash === '#home' ||
      search.includes('view=configurator') ||
      search.includes('view=home')
    ) {
      return false;
    }
    // Returning user with Supabase session: skip onboarding
    if (hasPotentialSupabaseSession()) {
      return false;
    }
    try {
      return localStorage.getItem(STORAGE_KEY_ONBOARDED) !== 'true';
    } catch {
      return false;
    }
  });

  // If user is already logged in or logs in to Supabase, skip onboarding completely
  useEffect(() => {
    if (user) {
      markOnboardingSeen();
      setIsOnboardingOpen(false);
    }
  }, [user]);

  const [currentView, setCurrentView] = useState<'home' | 'configurator' | 'dashboard'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#configurator' || window.location.search.includes('view=configurator')) {
        return 'configurator';
      }
      if (window.location.hash === '#home' || window.location.search.includes('view=home')) {
        return 'home';
      }
    }
    return 'dashboard';
  });

  // Trip being edited in configurator
  const [configuratorTrip, setConfiguratorTrip] = useState<TripProfile | null>(null);
  const [isNewTrip, setIsNewTrip] = useState<boolean>(false);

  // Active trip object (null if 0 trips created yet)
  const activeTrip = trips.find((tripItem) => tripItem.id === activeTripId) || trips[0] || null;

  // Persist to localStorage whenever trips change
  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  // Cloud sync on user login or initial session
  useEffect(() => {
    if (!user) {
      setSyncStatus('idle');
      return;
    }

    const currentUserId = user.id;
    let isMounted = true;
    setSyncStatus('loading');

    async function handleLoginSync() {
      try {
        const { data, error } = await fetchCloudUserState(currentUserId);
        if (!isMounted) return;

        if (error) {
          console.error('Error fetching Supabase cloud user_state:', error);
          setSyncStatus('error');
          return;
        }

        const cloudAppData = data?.app_data;
        const cloudEmpty = isCloudDataEmpty(cloudAppData);

        if (cloudEmpty) {
          // If logged in and cloud account is empty, upload local data into cloud account ONLY if user actually has trips
          if (trips.length > 0) {
            const initialPayload: AppDataPayload = {
              trips,
              riderSpecs,
              activeTripId,
              updatedAt: new Date().toISOString(),
            };

            const { error: uploadError } = await saveCloudUserState(currentUserId, initialPayload);
            if (!isMounted) return;

            if (uploadError) {
              console.error('Error uploading initial local data to Supabase:', uploadError);
              setSyncStatus('error');
            } else {
              lastSyncedPayloadHashRef.current = JSON.stringify({ trips, riderSpecs, activeTripId });
              setSyncStatus('synced');
              setLastSyncedAt(new Date());
            }
          } else {
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          }
        } else if (cloudAppData) {
          // Cloud account has existing data; load app_data from Supabase
          isCloudApplyingRef.current = true;
          const incomingTrips = cloudAppData.trips;
          const incomingSpecs = cloudAppData.riderSpecs;
          const incomingActiveId = cloudAppData.activeTripId;

          if (Array.isArray(incomingTrips) && incomingTrips.length > 0) {
            setTrips(incomingTrips);
            saveTrips(incomingTrips);
          }

          if (incomingSpecs && typeof incomingSpecs === 'object') {
            setRiderSpecs(incomingSpecs);
            saveRiderBikeSpecs(incomingSpecs);
          }

          const resolvedActiveId =
            incomingActiveId && incomingTrips?.some((t: TripProfile) => t.id === incomingActiveId)
              ? incomingActiveId
              : incomingTrips?.[0]?.id || activeTripId;

          if (resolvedActiveId) {
            setActiveTripId(resolvedActiveId);
            saveActiveTripId(resolvedActiveId);
          }

          lastSyncedPayloadHashRef.current = JSON.stringify({
            trips: incomingTrips,
            riderSpecs: incomingSpecs || riderSpecs,
            activeTripId: resolvedActiveId,
          });

          setSyncStatus('synced');
          setLastSyncedAt(data?.updated_at ? new Date(data.updated_at) : new Date());
        }
      } catch (err) {
        console.error('Exception during Supabase cloud login sync:', err);
        if (isMounted) setSyncStatus('error');
      }
    }

    handleLoginSync();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Auto-save changes to Supabase user_state while logged in
  useEffect(() => {
    if (!user) return;

    const currentUserId = user.id;

    if (isCloudApplyingRef.current) {
      isCloudApplyingRef.current = false;
      return;
    }

    const currentHash = JSON.stringify({ trips, riderSpecs, activeTripId });
    if (currentHash === lastSyncedPayloadHashRef.current) {
      return;
    }

    setSyncStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload: AppDataPayload = {
          trips,
          riderSpecs,
          activeTripId,
          updatedAt: new Date().toISOString(),
        };

        const { error } = await saveCloudUserState(currentUserId, payload);
        if (error) {
          console.error('Error auto-saving changes to Supabase user_state:', error);
          setSyncStatus('error');
        } else {
          lastSyncedPayloadHashRef.current = currentHash;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.error('Exception during auto-save to Supabase:', err);
        setSyncStatus('error');
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [trips, riderSpecs, activeTripId, user]);

  // Register manual force-sync trigger
  useEffect(() => {
    registerForceSync(async () => {
      if (!user) return;
      const currentUserId = user.id;
      setSyncStatus('saving');
      try {
        const payload: AppDataPayload = {
          trips,
          riderSpecs,
          activeTripId,
          updatedAt: new Date().toISOString(),
        };
        const { error } = await saveCloudUserState(currentUserId, payload);
        if (error) {
          setSyncStatus('error');
        } else {
          lastSyncedPayloadHashRef.current = JSON.stringify({ trips, riderSpecs, activeTripId });
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        setSyncStatus('error');
      }
    });
  }, [user, trips, riderSpecs, activeTripId, registerForceSync, setSyncStatus, setLastSyncedAt]);

  // Ensure scroll position resets to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  // Persist active id
  const handleSelectTrip = (id: string) => {
    setActiveTripId(id);
    saveActiveTripId(id);
    setTrips((currentTrips) => {
      const found = currentTrips.find((tripItem) => tripItem.id === id);
      if (found) {
        setConfiguratorTrip(found);
        setIsNewTrip(false);
      }
      return currentTrips;
    });
  };

  const handleLaunchDashboard = (id: string) => {
    handleSelectTrip(id);
    setCurrentView('dashboard');
  };

  const handleCreateNewTrip = () => {
    const newId = `trip-${Date.now()}`;
    const activeBike = getActiveBike(riderSpecs);
    const baseTemplate = buildDefaultNewTripTemplate(lang);
    const newProfile: TripProfile = {
      ...baseTemplate,
      id: newId,
      name: t('newTripDefaultName', { num: trips.length + 1 }),
      tag: "VÉLOTAF",
      description: t('newTripDefaultDesc'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checklist: generateTripChecklist("VÉLOTAF", baseTemplate.route.distanceKm, baseTemplate.weather, {
        lang,
        customChips: baseTemplate.customChips,
        isTubeless: activeBike.isTubeless,
        carbTargetGPerHr: riderSpecs.carbTargetGPerHr,
        nutritionPreference: riderSpecs.nutritionPreference,
      }),
      physics: {
        ...baseTemplate.physics,
        riderWeightKg: riderSpecs.riderWeightKg,
        bikeWeightKg: activeBike.weightKg,
        crr: activeBike.crr,
        cda: activeBike.cda,
      },
    };
    setConfiguratorTrip(newProfile);
    setIsNewTrip(true);
    setCurrentView("configurator");
  };

  const handleEditTrip = (trip: TripProfile) => {
    setConfiguratorTrip(trip);
    setIsNewTrip(false);
    setCurrentView('configurator');
  };

  const handleDuplicateTrip = (trip: TripProfile) => {
    const duplicated: TripProfile = {
      ...trip,
      id: `trip-${Date.now()}`,
      name: `${trip.name} ${t('copySuffix')}`,
      tag: t('duplicateTag'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checklist: (trip.checklist || []).map((c) => ({ ...c })),
    };
    const updated = [duplicated, ...trips];
    setTrips(updated);
    handleSelectTrip(duplicated.id);
  };

  const handleDeleteTrip = (id: string) => {
    if (trips.length <= 1) {
      alert(t('minOneProfileAlert'));
      return;
    }
    const target = trips.find((tripItem) => tripItem.id === id);
    const label = target?.name || id;
    if (!window.confirm(t('deleteProfileConfirm', { name: label }))) {
      return;
    }
    const filtered = trips.filter((tripItem) => tripItem.id !== id);
    setTrips(filtered);
    if (activeTripId === id) {
      handleSelectTrip(filtered[0].id);
    }
  };

  const handleUpdateActiveTrip = (updated: TripProfile) => {
    const updatedList = trips.map((tripItem) => (tripItem.id === updated.id ? updated : tripItem));
    setTrips(updatedList);
  };

  const handleToggleHeadwind = () => {
    const newHeadwind = !activeTrip.weather.isHeadwindActive;
    const updated: TripProfile = {
      ...activeTrip,
      weather: {
        ...activeTrip.weather,
        effectiveHeadwindKmH: undefined,
        isHeadwindActive: newHeadwind,
        windDirection: newHeadwind ? 'headwind' : 'calm',
        baseWindSpeedKmH: newHeadwind ? 8 : 2,
      },
    };
    handleUpdateActiveTrip(updated);
  };

  const handleUpdateWeather = (newWeather: WeatherCondition) => {
    const updated: TripProfile = {
      ...activeTrip,
      weather: newWeather,
    };
    handleUpdateActiveTrip(updated);
  };

  const handleSaveConfiguratorTrip = (tripToSave: TripProfile) => {
    setTrips((prev) => {
      const exists = prev.some((tripItem) => tripItem.id === tripToSave.id);
      const updated = exists
        ? prev.map((tripItem) => (tripItem.id === tripToSave.id ? tripToSave : tripItem))
        : [...prev, tripToSave];
      saveTrips(updated);
      return updated;
    });
    setActiveTripId(tripToSave.id);
    saveActiveTripId(tripToSave.id);
    setConfiguratorTrip(tripToSave);
    setIsNewTrip(false);
  };

  const handleLaunchFromConfigurator = (tripToLaunch?: TripProfile) => {
    const target = tripToLaunch || configuratorTrip || activeTrip;
    if (target) {
      handleSaveConfiguratorTrip(target);
    }
    setCurrentView("dashboard");
  };

  const applySpecsToActiveTrip = (nextSpecs: RiderBikeSpecs) => {
    const selectedBike = getActiveBike(nextSpecs);
    const freshChecklist = generateTripChecklist(
      activeTrip.tag,
      activeTrip.route?.distanceKm,
      activeTrip.weather,
      {
        lang,
        includeExtraRavito: (activeTrip.customChips || []).includes('real-food'),
        customChips: activeTrip.customChips || [],
        isTubeless: Boolean(selectedBike.isTubeless),
        carbTargetGPerHr: nextSpecs.carbTargetGPerHr ?? 60,
        nutritionPreference: nextSpecs.nutritionPreference ?? 'mixed',
      }
    );
    const checkedMap = new Map((activeTrip.checklist || []).map((item) => [item.id, item.checked]));
    const syncedChecklist = freshChecklist.map((item) => ({
      ...item,
      checked: checkedMap.has(item.id) ? Boolean(checkedMap.get(item.id)) : item.checked,
    }));

    const updatedActive: TripProfile = {
      ...activeTrip,
      updatedAt: new Date().toISOString(),
      checklist: syncedChecklist,
      physics: {
        ...activeTrip.physics,
        riderWeightKg: nextSpecs.riderWeightKg,
        bikeWeightKg: selectedBike.weightKg,
        cda: selectedBike.cda,
        crr: selectedBike.crr,
      },
    };
    setTrips((prev) =>
      prev.map((tripItem) => (tripItem.id === updatedActive.id ? updatedActive : tripItem))
    );
    if (configuratorTrip && configuratorTrip.id === updatedActive.id) {
      setConfiguratorTrip(updatedActive);
    }
  };

  const handleSaveRiderSpecs = (updated: RiderBikeSpecs) => {
    saveRiderBikeSpecs(updated);
    setRiderSpecs(updated);
    applySpecsToActiveTrip(updated);
  };

  const handleQuickSelectBike = (bikeId: string) => {
    const nextSpecs: RiderBikeSpecs = {
      ...riderSpecs,
      activeBikeId: bikeId,
    };
    saveRiderBikeSpecs(nextSpecs);
    setRiderSpecs(nextSpecs);
    applySpecsToActiveTrip(nextSpecs);
  };

  const handleCloseOnboarding = () => {
    markOnboardingSeen();
    setIsOnboardingOpen(false);
  };

  const handleLaunchFromOnboarding = (calibratedTrip: TripProfile) => {
    markOnboardingSeen();

    const onboardingSpecsHint = (calibratedTrip as any).__onboardingSpecs as
      | {
          isTubeless?: boolean;
          riderLevel?: 'occasional' | 'regular' | 'pro';
          carbTargetGPerHr?: number;
          nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
          ftpWatts?: number;
        }
      | undefined;
    if ((calibratedTrip as any).__onboardingSpecs) {
      delete (calibratedTrip as any).__onboardingSpecs;
    }

    if (calibratedTrip.id.startsWith('trip-calibrated-') || onboardingSpecsHint) {
      const matchedBike =
        riderSpecs.bikes.find((b) => Math.abs(b.cda - calibratedTrip.physics.cda) <= 0.03) ||
        getActiveBike(riderSpecs);
      const nextLevel = onboardingSpecsHint?.riderLevel ?? riderSpecs.riderLevel;
      const syncedSpecs: RiderBikeSpecs = {
        ...riderSpecs,
        riderWeightKg: calibratedTrip.physics.riderWeightKg || riderSpecs.riderWeightKg,
        ftpWatts: onboardingSpecsHint?.ftpWatts ?? riderSpecs.ftpWatts,
        riderLevel: nextLevel,
        cockpitViewMode:
          onboardingSpecsHint?.riderLevel !== undefined
            ? nextLevel === 'occasional'
              ? 'essential'
              : 'pro'
            : riderSpecs.cockpitViewMode,
        carbTargetGPerHr: onboardingSpecsHint?.carbTargetGPerHr ?? riderSpecs.carbTargetGPerHr,
        nutritionPreference:
          onboardingSpecsHint?.nutritionPreference ?? riderSpecs.nutritionPreference,
        activeBikeId: matchedBike.id,
        bikes: riderSpecs.bikes.map((b) =>
          b.id === matchedBike.id
            ? {
                ...b,
                weightKg: calibratedTrip.physics.bikeWeightKg,
                cda: calibratedTrip.physics.cda,
                crr: calibratedTrip.physics.crr,
                isTubeless:
                  typeof onboardingSpecsHint?.isTubeless === 'boolean'
                    ? onboardingSpecsHint.isTubeless
                    : b.isTubeless,
              }
            : b
        ),
      };
      saveRiderBikeSpecs(syncedSpecs);
      setRiderSpecs(syncedSpecs);
    }

    setTrips((prev) => {
      const exists = prev.some((t) => t.id === calibratedTrip.id);
      const updated = exists
        ? prev.map((t) => (t.id === calibratedTrip.id ? calibratedTrip : t))
        : [calibratedTrip, ...prev];
      saveTrips(updated);
      return updated;
    });
    setActiveTripId(calibratedTrip.id);
    saveActiveTripId(calibratedTrip.id);
    setConfiguratorTrip(calibratedTrip);
    setIsNewTrip(false);
    setIsOnboardingOpen(false);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleResetDefaults = () => {
    if (window.confirm(t('resetDefaultsConfirm'))) {
      const freshPresets = generateRandomPresetTrips(
        3,
        trips.map((tripItem) => tripItem.id),
        lang
      );
      setTrips(freshPresets);
      setActiveTripId(freshPresets[0].id);
      saveActiveTripId(freshPresets[0].id);
      setConfiguratorTrip(freshPresets[0]);
      setIsNewTrip(false);
      saveTrips(freshPresets);
    }
  };

  const handleLoadDemoTrips = () => {
    const sampleTrips = generateRandomPresetTrips(3, [], lang);
    setTrips(sampleTrips);
    setActiveTripId(sampleTrips[0].id);
    saveActiveTripId(sampleTrips[0].id);
    setConfiguratorTrip(sampleTrips[0]);
    setIsNewTrip(false);
    saveTrips(sampleTrips);
    setCurrentView('dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'dark' : 'light'
      } bg-canvas text-ink flex flex-col font-sans selection:bg-volt selection:text-[#111111] transition-colors duration-200`}
    >
      {/* High-End Minimalist Top Telemetry Bar */}
      <TopTelemetryBar
        activeTrip={activeTrip}
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'configurator' && !isNewTrip) {
            setConfiguratorTrip(activeTrip);
          }
          setCurrentView(view);
        }}
        onOpenSpecs={() => setIsSpecsModalOpen(true)}
        onPrint={handlePrint}
        riderSpecs={riderSpecs}
      />

      {/* Screen Views (with ample bottom padding for the floating navigation island & iOS safe area) */}
      <main className="flex-1 w-full max-w-full pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-32 print:hidden no-print">
        {currentView === 'home' && (
          <HomeScreen
            trips={trips}
            activeTrip={activeTrip}
            onSelectTrip={handleSelectTrip}
            onCreateNewTrip={handleCreateNewTrip}
            onEditTrip={handleEditTrip}
            onDuplicateTrip={handleDuplicateTrip}
            onDeleteTrip={handleDeleteTrip}
            onLaunchDashboard={handleLaunchDashboard}
            onUpdateWeather={handleUpdateWeather}
            onResetDefaults={handleResetDefaults}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onLoadDemoTrip={handleLoadDemoTrips}
          />
        )}

        {currentView === 'configurator' && (
          <ConfiguratorScreen
            key={(configuratorTrip || activeTrip)?.id || 'new-trip'}
            initialTrip={configuratorTrip || activeTrip || buildDefaultNewTripTemplate(lang)}
            isNew={isNewTrip}
            onSave={handleSaveConfiguratorTrip}
            onAutoSync={handleSaveConfiguratorTrip}
            onCancel={() => {
              setIsNewTrip(false);
              setCurrentView('dashboard');
            }}
            onLaunch={(savedTrip) => handleLaunchFromConfigurator(savedTrip || configuratorTrip || activeTrip)}
          />
        )}

        {currentView === 'dashboard' && (
          !activeTrip || trips.length === 0 ? (
            <DashboardEmptyState
              onCreateFirstTrip={handleCreateNewTrip}
              onLoadDemoTrip={handleLoadDemoTrips}
            />
          ) : (
            <CockpitErrorBoundary
              key={activeTrip.id}
              onResetCockpit={() => {
                const freshPresets = generateRandomPresetTrips(3, [], lang);
                setTrips(freshPresets);
                setActiveTripId(freshPresets[0].id);
                saveActiveTripId(freshPresets[0].id);
                setConfiguratorTrip(freshPresets[0]);
                saveTrips(freshPresets);
              }}
            >
              <BentoDashboard
                trip={activeTrip}
                onUpdateTrip={handleUpdateActiveTrip}
                onToggleHeadwind={handleToggleHeadwind}
                onPrint={handlePrint}
                riderSpecs={riderSpecs}
                onUpdateRiderSpecs={handleSaveRiderSpecs}
                onSelectBike={handleQuickSelectBike}
                onOpenSpecs={() => setIsSpecsModalOpen(true)}
                onOpenConfigurator={() => handleEditTrip(activeTrip)}
              />
            </CockpitErrorBoundary>
          )
        )}
      </main>

      {/* Floating Dynamic Island Navigation Pill */}
      <DynamicIslandNav
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'configurator' && !isNewTrip) {
            setConfiguratorTrip(activeTrip);
          }
          setCurrentView(view);
        }}
        activeTrip={activeTrip}
        allTrips={trips}
        onSelectTrip={handleSelectTrip}
        onCreateNew={handleCreateNewTrip}
        onPrint={handlePrint}
        onOpenSpecs={() => setIsSpecsModalOpen(true)}
        onResetDefaults={handleResetDefaults}
      />

      {/* Printable A4 Flight Sheet Layout (Hidden on Screen, Active on Print) */}
      <RiderBikeSpecsModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
        specs={riderSpecs}
        onSave={handleSaveRiderSpecs}
      />

      {/* Standalone Interactive Onboarding & Calibration Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onLaunch={handleLaunchFromOnboarding}
      />

      {/* Supabase Authentication & Cloud Sync Modal */}
      <AuthModal />

      {/* Supabase Password Recovery Modal */}
      <ResetPasswordModal />

      {activeTrip && (
        <div className="hidden print:block print-only">
          <PrintFlightSheet trip={activeTrip} riderSpecs={riderSpecs} />
        </div>
      )}
    </div>
  );
}

export function App() {
  const [lang, setLang] = useState<Language>(loadInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch (e) {
      console.error('Error saving language to localStorage', e);
    }
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ThemeProvider>
      <LanguageProvider lang={lang} setLang={setLang}>
        <AuthProvider>
          <IconContext.Provider value={{ weight: 'duotone' }}>
            <AppContent />
            <Analytics />
          </IconContext.Provider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
