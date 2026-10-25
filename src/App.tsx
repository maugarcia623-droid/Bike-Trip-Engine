import React, { useState, useEffect } from 'react';
import { TripProfile, WeatherCondition } from './types/trip';
import {
  loadTrips,
  saveTrips,
  getActiveTripId,
  setActiveTripId,
  INITIAL_PROFILES,
  DEFAULT_CHECKLIST,
} from './utils/storage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { HomeScreen } from './components/home/HomeScreen';
import { ConfiguratorScreen } from './components/configurator/ConfiguratorScreen';
import { BentoDashboard } from './components/dashboard/BentoDashboard';
import { PrintFlightSheet } from './components/print/PrintFlightSheet';

function AppContent() {
  const { isDark } = useTheme();
  const [trips, setTrips] = useState<TripProfile[]>(() => loadTrips());
  const [activeTripId, setActiveTripIdState] = useState<string>(() =>
    getActiveTripId(loadTrips())
  );
  const [currentView, setCurrentView] = useState<'home' | 'configurator' | 'dashboard'>('dashboard');
  
  // Trip being edited in configurator
  const [configuratorTrip, setConfiguratorTrip] = useState<TripProfile | null>(null);
  const [isNewTrip, setIsNewTrip] = useState<boolean>(false);

  // Active trip object
  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || INITIAL_PROFILES[0];

  // Persist to localStorage whenever trips change
  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  // Persist active id
  const handleSelectTrip = (id: string) => {
    setActiveTripIdState(id);
    setActiveTripId(id);
  };

  const handleLaunchDashboard = (id: string) => {
    handleSelectTrip(id);
    setCurrentView('dashboard');
  };

  const handleCreateNewTrip = () => {
    const newId = `trip-${Date.now()}`;
    const newProfile: TripProfile = {
      ...INITIAL_PROFILES[0],
      id: newId,
      name: `Custom Commute Mission #${trips.length + 1}`,
      tag: 'NEW FLIGHT',
      description: 'Custom engineered commute profile with aerodynamic and office timeline constraints.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
    };
    setConfiguratorTrip(newProfile);
    setIsNewTrip(true);
    setCurrentView('configurator');
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
      name: `${trip.name} (Copy)`,
      tag: 'DUPLICATE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checklist: trip.checklist.map((c) => ({ ...c })),
    };
    const updated = [duplicated, ...trips];
    setTrips(updated);
    handleSelectTrip(duplicated.id);
  };

  const handleDeleteTrip = (id: string) => {
    if (trips.length <= 1) {
      alert("At least one trip profile must be preserved in the system.");
      return;
    }
    const filtered = trips.filter((t) => t.id !== id);
    setTrips(filtered);
    if (activeTripId === id) {
      handleSelectTrip(filtered[0].id);
    }
  };

  const handleUpdateActiveTrip = (updated: TripProfile) => {
    const updatedList = trips.map((t) => (t.id === updated.id ? updated : t));
    setTrips(updatedList);
  };

  const handleToggleHeadwind = () => {
    const newHeadwind = !activeTrip.weather.isHeadwindActive;
    const updated: TripProfile = {
      ...activeTrip,
      weather: {
        ...activeTrip.weather,
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

  const handleSaveConfiguratorTrip = (saved: TripProfile) => {
    const exists = trips.some((t) => t.id === saved.id);
    let updatedList: TripProfile[];
    if (exists) {
      updatedList = trips.map((t) => (t.id === saved.id ? saved : t));
    } else {
      updatedList = [saved, ...trips];
    }
    setTrips(updatedList);
    handleSelectTrip(saved.id);
  };

  const handleLaunchFromConfigurator = (saved: TripProfile) => {
    handleSaveConfiguratorTrip(saved);
    setCurrentView('dashboard');
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all profiles to factory engineering defaults? Any custom edits will be re-initialized.")) {
      setTrips(INITIAL_PROFILES);
      handleSelectTrip(INITIAL_PROFILES[0].id);
      saveTrips(INITIAL_PROFILES);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'dark bg-[#09090b] text-zinc-100' : 'light bg-slate-50 text-slate-900'
      } flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-300 transition-colors duration-200`}
    >
      {/* Sticky High-Tech Navigation Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeTrip={activeTrip}
        allTrips={trips}
        onSelectTrip={handleSelectTrip}
        onCreateNew={handleCreateNewTrip}
        onPrint={handlePrint}
      />

      {/* Screen Views */}
      <main className="flex-1 pb-16">
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
          />
        )}

        {currentView === 'configurator' && (
          <ConfiguratorScreen
            initialTrip={configuratorTrip || activeTrip}
            isNew={isNewTrip}
            onSave={handleSaveConfiguratorTrip}
            onCancel={() => setCurrentView('dashboard')}
            onLaunch={handleLaunchFromConfigurator}
          />
        )}

        {currentView === 'dashboard' && (
          <BentoDashboard
            trip={activeTrip}
            onUpdateTrip={handleUpdateActiveTrip}
            onToggleHeadwind={handleToggleHeadwind}
            onPrint={handlePrint}
          />
        )}
      </main>

      {/* Printable A4 Flight Sheet Layout (Hidden on Screen, Active on Print) */}
      <PrintFlightSheet trip={activeTrip} />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
