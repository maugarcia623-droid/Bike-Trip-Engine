import React from 'react';
import { Wind, Printer, AlertTriangle, CheckCircle, ShieldCheck, Bike, Activity } from 'lucide-react';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';

export type DashboardViewMode = 'commuter' | 'telemetry';

interface FlightDeckHeaderProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  hardDepartureTime: string;
  onToggleHeadwind: () => void;
  onPrint: () => void;
  checklistProgress: { checked: number; total: number; percent: number };
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
}

export const FlightDeckHeader: React.FC<FlightDeckHeaderProps> = ({
  trip,
  physicsResult,
  hardDepartureTime,
  onToggleHeadwind,
  onPrint,
  viewMode,
  onViewModeChange,
}) => {
  const isGo = physicsResult.goStatus === 'GO';
  const isCaution = physicsResult.goStatus === 'CAUTION';

  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 mb-6 shadow-sm dark:shadow-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Mission Identification */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              {trip.tag}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              ID: {trip.id}
            </span>
            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {trip.office.gateName} Protocol
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {trip.name}
          </h1>

          <p className="text-slate-600 dark:text-zinc-400 text-xs mt-1 max-w-2xl leading-relaxed">
            {trip.description}
          </p>
        </div>

        {/* View Switcher Toggle, Status, Weather & Print Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* VIEW SWITCHER TOGGLE: Commuter View vs Telemetry View */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 text-xs font-mono shadow-xs">
            <button
              type="button"
              onClick={() => onViewModeChange('commuter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-semibold ${
                viewMode === 'commuter'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Commuter View</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-semibold ${
                viewMode === 'telemetry'
                  ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetry View</span>
            </button>
          </div>

          {/* Operational Decision Badge */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
              isGo
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400'
                : isCaution
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-400'
                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-400'
            }`}
          >
            {isGo ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <div className="text-[9px] opacity-75 uppercase">Decision</div>
              <div className="text-xs tracking-wide">{physicsResult.goStatus} // ROLLOUT</div>
            </div>
          </div>

          {/* Dynamic 8 km/h Headwind Toggle */}
          <button
            onClick={onToggleHeadwind}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              trip.weather.isHeadwindActive
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-glow-amber'
                : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
            }`}
          >
            <Wind className={`w-3.5 h-3.5 ${trip.weather.isHeadwindActive ? 'text-zinc-950' : 'text-slate-500 dark:text-zinc-400'}`} />
            <div className="text-left">
              <div className="text-[9px] uppercase tracking-wider opacity-80">Wind Vector</div>
              <div>{trip.weather.isHeadwindActive ? '8k Headwind' : 'Calm'}</div>
            </div>
          </button>

          {/* Print / Export PDF button */}
          <button
            onClick={onPrint}
            title="Export Clean A4 Flight Deck PDF"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono font-bold text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <div className="text-left">
              <div className="text-[9px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Sheet</div>
              <div>Print A4</div>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Status Sub-Strip */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-600 dark:text-zinc-400">
          <div>
            Hard Departure:{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{hardDepartureTime}</strong>
          </div>
          <div>
            Gate Target:{' '}
            <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{trip.office.targetGateArrivalTime}</strong> ({trip.office.gateName})
          </div>
          <div>
            Shift Lock:{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{trip.office.shiftStartTime}</strong>
          </div>
          {viewMode === 'telemetry' && (
            <div>
              Target Power:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.round(physicsResult.legWatts)} W</strong>
            </div>
          )}
        </div>

        <div className="text-slate-500 dark:text-zinc-400">
          Mode: <span className="text-slate-800 dark:text-zinc-300 font-bold uppercase">{viewMode} Mode</span>
        </div>
      </div>
    </div>
  );
};
