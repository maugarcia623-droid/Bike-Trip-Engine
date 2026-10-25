import React, { useState } from 'react';
import { 
  Save, 
  ArrowLeft, 
  Play, 
  Clock, 
  Zap, 
  Shield, 
  Navigation, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';
import { TripProfile } from '../../types/trip';
import { NaturalLanguagePrompt } from './NaturalLanguagePrompt';
import { ParameterTabs } from './ParameterTabs';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { calculateAutoBikeRoute } from '../../utils/routing';

interface ConfiguratorScreenProps {
  initialTrip: TripProfile;
  isNew: boolean;
  onSave: (trip: TripProfile) => void;
  onCancel: () => void;
  onLaunch: (trip: TripProfile) => void;
}

export const ConfiguratorScreen: React.FC<ConfiguratorScreenProps> = ({
  initialTrip,
  isNew,
  onSave,
  onCancel,
  onLaunch,
}) => {
  const [trip, setTrip] = useState<TripProfile>(initialTrip);

  // Route Search States
  const [originInput, setOriginInput] = useState(trip.route.origin || 'Nantes');
  const [destInput, setDestInput] = useState(trip.route.destination || trip.office.gateName || 'Saint-Nazaire');
  const [isRouting, setIsRouting] = useState(false);
  const [routeSuccess, setRouteSuccess] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Compute live physics & timeline as user tunes values
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather);
  const timelineResult = calculateReverseTimeline(trip.route, trip.office, trip.weather);

  const handleApplyParsed = (updated: Partial<TripProfile>) => {
    setTrip((prev) => ({
      ...prev,
      ...updated,
      physics: { ...prev.physics, ...(updated.physics || {}) },
      route: { ...prev.route, ...(updated.route || {}) },
      office: { ...prev.office, ...(updated.office || {}) },
      weather: { ...prev.weather, ...(updated.weather || {}) },
    }));
  };

  const handleCalculateRoute = async () => {
    if (!originInput.trim() || !destInput.trim()) return;
    setIsRouting(true);
    setRouteError(null);
    setRouteSuccess(false);

    try {
      const result = await calculateAutoBikeRoute(originInput, destInput);
      if (result) {
        setTrip((prev) => ({
          ...prev,
          name: `${originInput} → ${destInput} Tour`,
          route: {
            ...prev.route,
            origin: originInput,
            destination: destInput,
            distanceKm: result.distanceKm,
            coordinates: result.coordinates,
          },
        }));
        setRouteSuccess(true);
      }
    } catch (err: any) {
      setRouteError(err.message || 'Error calculating bike route.');
    } finally {
      setIsRouting(false);
    }
  };

  const handleSave = () => {
    const updated = {
      ...trip,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
  };

  const handleLaunchDirect = () => {
    handleSave();
    onLaunch(trip);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in">
      {/* ── Top Navigation & Action Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Mission Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isNew ? 'Create New Trip Profile' : `Tune Flight Parameters: ${trip.name}`}
            </h1>
            <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded uppercase font-bold">
              LIVE MATH
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-lg transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Save Profile</span>
          </button>

          <button
            onClick={handleLaunchDirect}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-all shadow-glow-emerald"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Save &amp; Launch Bento Deck</span>
          </button>
        </div>
      </div>

      {/* ── 1. Profile Metadata Header Inputs ── */}
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xs">
        <div>
          <label className="block text-xs font-mono text-slate-600 dark:text-zinc-400 mb-1">
            Trip Mission Name
          </label>
          <input
            type="text"
            value={trip.name}
            onChange={(e) => setTrip({ ...trip, name: e.target.value })}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-sans font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g. Morning Estuary Commute (Gate 17)"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-600 dark:text-zinc-400 mb-1">
            Mission Classification Tag
          </label>
          <input
            type="text"
            value={trip.tag}
            onChange={(e) => setTrip({ ...trip, tag: e.target.value.toUpperCase() })}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm font-mono font-bold text-cyan-600 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
            placeholder="e.g. COMMUTE PROTOCOL"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-600 dark:text-zinc-400 mb-1">
            Mission Operational Notes
          </label>
          <input
            type="text"
            value={trip.description}
            onChange={(e) => setTrip({ ...trip, description: e.target.value })}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-cyan-500"
            placeholder="Short route summary and operational notes..."
          />
        </div>
      </div>

      {/* ── 2. Route Corridor Generator (OSRM Live Routing) ── */}
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 mb-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Navigation className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-white">
            Geographic Corridor Generator
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-slate-500 dark:text-zinc-400 mb-1">
              Origin (Departure Address or City)
            </label>
            <input
              type="text"
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="e.g. Nantes"
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-slate-500 dark:text-zinc-400 mb-1">
              Destination (Arrival Landmark or City)
            </label>
            <input
              type="text"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="e.g. Saint-Nazaire"
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="sm:col-span-1 flex items-end">
            <button
              type="button"
              onClick={handleCalculateRoute}
              disabled={isRouting}
              className="w-full h-[38px] flex items-center justify-center gap-2 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 rounded-lg text-xs font-mono font-bold transition-all shadow-xs"
            >
              {isRouting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Routing...</span>
                </>
              ) : (
                <span>Fetch Path</span>
              )}
            </button>
          </div>
        </div>

        {routeSuccess && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Path found: {trip.route.distanceKm} km &middot; GPS line loaded for map banner</span>
          </div>
        )}

        {routeError && (
          <p className="mt-2 text-xs font-mono text-rose-500">
            {routeError}
          </p>
        )}
      </div>

      {/* ── 3. Natural Language Prompt Wizard Box ── */}
      <div className="mb-8">
        <NaturalLanguagePrompt
          currentTrip={trip}
          onApplyParsed={handleApplyParsed}
        />
      </div>

      {/* ── 4. Main Layout: Parameter Tabs + Full Telemetry Engine Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Step-by-Step Parameter Tuning Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <ParameterTabs
            trip={trip}
            onChange={(updated) => setTrip(updated)}
          />
        </div>

        {/* Right Col: Full Real-Time Telemetry Engine Sidebar */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 sticky top-20 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  LIVE ENGINE TELEMETRY
                </h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                physicsResult.goStatus === 'GO'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
              }`}>
                {physicsResult.goStatus} STATUS
              </span>
            </div>

            {/* Calculated Hard Departure Callout */}
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3.5 mb-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
                <span>Calculated Hard Departure</span>
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">
                  {timelineResult.hardDepartureTime}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                  for {trip.office.targetGateArrivalTime} arrival
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
                Moving: {physicsResult.movingTimeFormatted} + Buffers: {timelineResult.bufferMinutes}m
              </p>
            </div>

            {/* Power Matrix & Mechanical Breakdown */}
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3.5 mb-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
                <span>Mechanical Power Required</span>
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  {Math.round(physicsResult.legWatts)}
                </span>
                <span className="text-sm font-mono text-slate-500 dark:text-zinc-400">Watts</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800/80 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Aero Drag (CdA {trip.physics.cda}):</span>
                  <span className="text-slate-900 dark:text-zinc-200 font-bold">{Math.round(physicsResult.aerodynamicDragWatts)} W</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Rolling (Crr {trip.physics.crr}):</span>
                  <span className="text-slate-900 dark:text-zinc-200 font-bold">{Math.round(physicsResult.rollingResistanceWatts)} W</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Drivetrain Loss (95%):</span>
                  <span className="text-slate-900 dark:text-zinc-200 font-bold">{Math.round(physicsResult.legWatts - physicsResult.wheelWatts)} W</span>
                </div>
                {trip.weather.isHeadwindActive && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold pt-1 border-t border-slate-200 dark:border-zinc-800/60">
                    <span>Headwind Surcharge:</span>
                    <span>+{Math.round(physicsResult.powerDeltaWatts)} W</span>
                  </div>
                )}
              </div>
            </div>

            {/* Caloric & Glycogen Oxidation */}
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3.5 mb-4 text-[11px] font-mono space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-bold mb-1">
                METABOLIC WORK &amp; FUELING
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Total Mechanical Work:</span>
                <span className="text-slate-900 dark:text-white font-bold">{Math.round(physicsResult.totalWorkKj)} kJ</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Total Caloric Burn:</span>
                <span className="text-slate-900 dark:text-white font-bold">{Math.round(physicsResult.totalKcalBurn)} kcal</span>
              </div>
              <div className="flex justify-between text-cyan-700 dark:text-cyan-400 font-bold">
                <span>Carb Oxidation Rate:</span>
                <span>{physicsResult.carbOxidationGramPerHour} g/hr</span>
              </div>
            </div>

            {/* Strict Office Protocol Indicator */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-[11px] font-mono flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-900 dark:text-zinc-200 font-bold">Desk Food Ban: Enforced</span>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px] mt-0.5">
                  Phase 1 Skyr refuel at {trip.office.targetGateArrivalTime} in locker, Phase 2 oats in break room at 08:50.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
