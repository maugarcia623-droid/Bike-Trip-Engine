import React from 'react';
import { Plus, RotateCcw, Layers, ShieldCheck } from 'lucide-react';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { TripCard } from './TripCard';
import { WeatherWidget } from './WeatherWidget';

interface HomeScreenProps {
  trips: TripProfile[];
  activeTrip: TripProfile;
  onSelectTrip: (id: string) => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripProfile) => void;
  onDuplicateTrip: (trip: TripProfile) => void;
  onDeleteTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
  onResetDefaults: () => void;
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
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
              FLIGHT PLANNING ENGINE &middot; v2.6
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              {trips.length} Saved Profiles
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bike Trip Flight Deck
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 text-sm mt-1 max-w-2xl">
            Precision aerodynamic math, reverse timeline scheduling for strict office checkpoints,
            and real-food fueling without compromise.
          </p>
        </div>

        {/* Primary CTA and Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onResetDefaults}
            title="Reset to default sample profiles"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={onCreateNewTrip}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-glow-emerald"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Trip</span>
          </button>
        </div>
      </div>

      {/* Quick Weather Check Widget */}
      <WeatherWidget
        weather={activeTrip.weather}
        onUpdateWeather={onUpdateWeather}
        speedKmH={activeTrip.route.targetSpeedKmH}
      />

      {/* Saved Profiles Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200">
            SAVED TRIP PROFILES &amp; MISSION CARDS
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
          Click any card to launch Bento Deck
        </span>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            isActive={trip.id === activeTrip.id}
            onSelect={onSelectTrip}
            onEdit={onEditTrip}
            onDuplicate={onDuplicateTrip}
            onDelete={onDeleteTrip}
            onLaunch={onLaunchDashboard}
          />
        ))}
      </div>

      {/* Security & Local Storage Guarantee Footer */}
      <div className="mt-12 p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600 dark:text-zinc-400 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Local Storage Persistence Active: Your profiles, checklists, and biometric inputs remain 100% in your browser.</span>
        </div>
        <div className="text-slate-500 dark:text-zinc-400">
          Last synchronized: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
