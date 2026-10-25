import React from 'react';
import { Play, Copy, Trash2, Edit3, Clock, Shield, Wind } from 'lucide-react';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';

interface TripCardProps {
  trip: TripProfile;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (trip: TripProfile) => void;
  onDuplicate: (trip: TripProfile) => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onLaunch,
}) => {
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather);
  const timelineResult = calculateReverseTimeline(trip.route, trip.office, trip.weather);

  const checkedCount = trip.checklist.filter((c) => c.checked).length;
  const totalChecklist = trip.checklist.length;
  const checklistPercent = Math.round((checkedCount / Math.max(1, totalChecklist)) * 100);

  return (
    <div
      className={`group relative rounded-xl p-6 transition-all duration-200 flex flex-col justify-between shadow-sm dark:shadow-none ${
        isActive
          ? 'border-2 border-emerald-500/70 shadow-glow-emerald bg-gradient-to-b from-emerald-50/50 to-white dark:from-[#16161b] dark:to-[#111114]'
          : 'bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Top Bar: Tag & Actions */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
              {trip.tag}
            </span>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onDuplicate(trip)}
              title="Duplicate trip"
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(trip)}
              title="Edit parameters"
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(trip.id)}
              title="Delete profile"
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
          {trip.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 mb-4 leading-relaxed">
          {trip.description}
        </p>

        {/* Dominant Departure Time Hero Container */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Hard Departure</span>
            </span>
            <span className="font-medium">Gate Target: {trip.office.targetGateArrivalTime}</span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-4xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              {timelineResult.hardDepartureTime}
            </div>
            <div className="text-right font-mono">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 block">
                {Math.round(physicsResult.legWatts)} W
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-500 block">
                @{trip.route.targetSpeedKmH} km/h
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-500">
            <span>Shift: <strong className="text-slate-800 dark:text-zinc-300">{trip.office.shiftStartTime}</strong> ({trip.office.gateName})</span>
            <span title="Calculated from Gross Mechanical Efficiency: 21%">
              Work: <strong className="text-slate-800 dark:text-zinc-300">{Math.round(physicsResult.totalWorkKj)} kJ</strong>
            </span>
          </div>
        </div>

        {/* Quick Route & Weather Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
          <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded">
            Dist: <strong className="text-slate-900 dark:text-white">{trip.route.distanceKm} km</strong>
          </span>
          <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded">
            Mass: <strong className="text-slate-900 dark:text-white">{physicsResult.systemMassKg} kg</strong>
          </span>
          <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded flex items-center gap-1">
            <Wind className={`w-3 h-3 ${trip.weather.isHeadwindActive ? 'text-amber-500' : 'text-slate-400 dark:text-zinc-500'}`} />
            {trip.weather.isHeadwindActive ? `Headwind ${trip.weather.baseWindSpeedKmH}k` : 'Calm Wind'}
          </span>
          <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Checklist: <strong className="text-emerald-600 dark:text-emerald-400">{checklistPercent}%</strong>
          </span>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-2">
        <button
          onClick={() => onLaunch(trip.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch Flight Deck</span>
        </button>

        {!isActive && (
          <button
            onClick={() => onSelect(trip.id)}
            className="text-xs font-mono text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-100 dark:bg-zinc-900 px-3 py-2.5 rounded-lg transition-all"
          >
            Set Active
          </button>
        )}
      </div>
    </div>
  );
};
