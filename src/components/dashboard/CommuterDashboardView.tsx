import React from 'react';
import { Clock, Wind, CheckSquare, Utensils, AlertTriangle, CheckCircle, ShieldCheck, ArrowRight, CheckCircle2, Square, RotateCcw, Coffee, Shield } from 'lucide-react';
import { Card } from '../common/Card';
import { TripProfile, PhysicsCalculationResult, ChecklistItem } from '../../types/trip';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { getRealFoodNutritionPlan } from '../../utils/nutrition';

interface CommuterDashboardViewProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  timelineResult: ReverseTimelineCalculation;
  onToggleHeadwind: () => void;
  onToggleChecklistItem: (id: string) => void;
  onCheckAllChecklist: () => void;
  onResetChecklist: () => void;
}

export const CommuterDashboardView: React.FC<CommuterDashboardViewProps> = ({
  trip,
  physicsResult,
  timelineResult,
  onToggleHeadwind,
  onToggleChecklistItem,
  onCheckAllChecklist,
  onResetChecklist,
}) => {
  const isHeadwind = trip.weather.isHeadwindActive;
  const checkedCount = trip.checklist.filter((c) => c.checked).length;
  const totalChecklist = trip.checklist.length;
  const checklistPercent = Math.round((checkedCount / Math.max(1, totalChecklist)) * 100);
  const isAllChecked = checkedCount === totalChecklist;

  const nutritionPhases = getRealFoodNutritionPlan(
    trip.office.targetGateArrivalTime || '08:30',
    '08:50',
    timelineResult.hardDepartureTime
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* CARD A: TIMELINE & HARD DEPARTURE */}
      <Card
        title="CARD A: DEPARTURE &amp; TRANSIT TIMELINE"
        subtitle="Reverse-calculated from shift start &amp; gate security checkpoints"
        icon={<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        badge={
          <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
            ZERO DELAY TOLERANCE
          </span>
        }
        glow="emerald"
        className="col-span-1"
      >
        {/* Giant Hard Departure Display */}
        <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-4 text-center">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-1">
            HARD DEPARTURE TIME
          </div>
          <div className="text-5xl sm:text-6xl font-mono font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {timelineResult.hardDepartureTime}
          </div>
          <div className="mt-2 text-xs font-mono text-slate-600 dark:text-zinc-400">
            Roll out on gravel bike to reach{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{trip.office.gateName}</strong> by{' '}
            <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{trip.office.targetGateArrivalTime}</strong>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-around text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Transit</span>
              <span className="font-bold text-slate-900 dark:text-white">{timelineResult.pureMovingMinutes}m</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Traffic Buffer</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{timelineResult.bufferMinutes}m</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Shift Lock</span>
              <span className="font-bold text-slate-900 dark:text-white">{trip.office.shiftStartTime}</span>
            </div>
          </div>
        </div>

        {/* Visual Step Timeline */}
        <div className="space-y-2.5 flex-1 flex flex-col justify-between">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
            <span>Critical Commute Milestones</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">
              Door-to-Desk: {timelineResult.totalDoorToDeskMinutes}m
            </span>
          </div>

          <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
            {timelineResult.steps.slice(1, 9).map((step) => {
              const isDeparture = step.id === 'hard-departure';
              const isGate = step.id === 'locker-refuel' || step.id === 'gate-security';
              const isBreakRoom = step.id === 'breakroom-breakfast';

              return (
                <div key={step.id} className="relative group">
                  <div
                    className={`absolute -left-[1.5rem] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                      isDeparture
                        ? 'bg-emerald-500 border-white dark:border-zinc-950 ring-2 ring-emerald-500/20'
                        : isGate
                        ? 'bg-cyan-500 border-white dark:border-zinc-950 ring-2 ring-cyan-500/20'
                        : isBreakRoom
                        ? 'bg-amber-500 border-white dark:border-zinc-950'
                        : 'bg-slate-400 dark:bg-zinc-600 border-white dark:border-zinc-900'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white min-w-[42px]">
                        {step.time}
                      </span>
                      <span className={`truncate max-w-[170px] ${isDeparture ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                      {step.location.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950/60 text-[11px] font-mono text-slate-600 dark:text-zinc-400 mt-2">
            Strict Desk Policy: Zero eating in open space. Desk lock at{' '}
            <strong className="text-slate-900 dark:text-white">{trip.office.shiftStartTime}</strong>.
          </div>
        </div>
      </Card>

      {/* CARD B: CONDITIONS & GEAR CHECKLIST */}
      <Card
        title="CARD B: CONDITIONS &amp; PRE-FLIGHT GEAR"
        subtitle="Live atmospheric advisory and stateful bike inspection"
        icon={<Wind className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
        badge={
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
              isHeadwind
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isHeadwind ? 'HEADWIND ACTIVE' : 'CALM CORRIDOR'}
          </span>
        }
        glow={isHeadwind ? 'amber' : 'emerald'}
        className="col-span-1"
      >
        {/* Weather Status & Advisory Banner */}
        <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {isHeadwind ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {isHeadwind ? '8 km/h Estuary Headwind Active' : 'Calm Morning Flight Profile'}
              </span>
            </div>

            <button
              onClick={onToggleHeadwind}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded font-bold transition-all ${
                isHeadwind
                  ? 'bg-amber-500 text-zinc-950 shadow-glow-amber'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isHeadwind ? 'Headwind: ON' : 'Toggle Wind'}
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            {isHeadwind
              ? 'Estuary bridge crossing has an opposing breeze. Maintain low aero hoods posture; +3-4 minutes buffer has been added to departure time.'
              : 'Negligible wind resistance across the bridge. Smooth cruising conditions at standard target speed.'}
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-zinc-400">
            <span>Air Temp: <strong className="text-slate-900 dark:text-white">{trip.weather.temperatureC}°C</strong></span>
            <span>Precipitation: <strong className="text-slate-900 dark:text-white">{trip.weather.precipitationRiskPercent}%</strong> (Dry)</span>
            <span>Bridge Gusts: <strong className="text-slate-900 dark:text-white">{isHeadwind ? trip.weather.estuaryGustKmH : 5} km/h</strong></span>
          </div>
        </div>

        {/* Pre-Flight Checklist Preview */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pre-Flight Inspection ({checkedCount}/{totalChecklist})</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={onCheckAllChecklist}
                className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              >
                All
              </button>
              <button
                onClick={onResetChecklist}
                className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-200 dark:border-zinc-800">
            <div
              style={{ width: `${checklistPercent}%` }}
              className={`h-full transition-all duration-300 ${
                isAllChecked ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
            />
          </div>

          {/* Key checklist items */}
          <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
            {trip.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleChecklistItem(item.id)}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 border transition-all flex items-center gap-2.5 select-none text-xs ${
                  item.checked
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-500/30 text-slate-600 dark:text-zinc-300'
                    : 'bg-white dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-800 dark:text-zinc-200 shadow-xs'
                }`}
              >
                <button
                  type="button"
                  className={`flex-shrink-0 ${item.checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}`}
                >
                  {item.checked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className={`text-[11px] font-mono truncate ${item.checked ? 'line-through opacity-75' : 'font-medium'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] font-mono text-slate-500 dark:text-zinc-400 text-center">
            {isAllChecked ? '✓ All 16 verification checks cleared for rollout' : 'Tap any item to mark ready'}
          </div>
        </div>
      </Card>

      {/* CARD C: REAL-FOOD FUELING */}
      <Card
        title="CARD C: REAL-FOOD NUTRITION SCHEDULE"
        subtitle="100% whole food protocol &middot; Zero powders &middot; Zero desk food"
        icon={<Utensils className="w-4 h-4 text-amber-500" />}
        badge={
          <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
            NO POWDER / NO MILK / NO BANANA
          </span>
        }
        glow="emerald"
        className="col-span-1"
      >
        {/* Clean Meal Timeline */}
        <div className="space-y-3.5 flex-1 flex flex-col justify-between">
          {/* 1. Pre-Ride Ignition */}
          <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white">
                  1. Pre-Ride Ignition (Home)
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 px-1.5 py-0.5 rounded">
                -45m Before Rollout
              </span>
            </div>
            <ul className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
              <li>White baguette / country bread + pure wildflower honey</li>
              <li>Double espresso (rich caffeine mobilization)</li>
              <li>300ml fresh spring water with pinch of salt</li>
            </ul>
          </div>

          {/* 2. On-Bike Cockpit */}
          <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white">
                  2. On-Bike Pocket Fuel
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                En Route
              </span>
            </div>
            <ul className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
              <li>50/50 water &amp; pressed grape/apple juice bidon (isotonic)</li>
              <li>2 Medjool dates + 2 dried Turkish figs</li>
              <li>2 artisanal pâte de fruits fruit pastes</li>
            </ul>
          </div>

          {/* 3. Phase 1 Locker Refuel */}
          <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white">
                  3. Phase 1 Locker Refuel
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-900 dark:text-white font-bold bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {trip.office.targetGateArrivalTime || '08:30'} Bench
              </span>
            </div>
            <ul className="text-xs text-slate-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
              <li>200g Skyr 0% tub (pure natural dairy protein)</li>
              <li>250ml 100% pure Concord grape juice</li>
            </ul>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 italic">
              Consumed at locker bench before heading to shower.
            </div>
          </div>

          {/* 4. Phase 2 Break Room Breakfast */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/30 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase text-amber-900 dark:text-amber-300">
                  4. Break Room Breakfast
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/50 px-1.5 py-0.5 rounded">
                08:50 – 09:05
              </span>
            </div>
            <ul className="text-xs text-slate-800 dark:text-zinc-200 space-y-1 list-disc list-inside">
              <li>Oat milk overnight oats + chia</li>
              <li>1 crisp grated Granny Smith apple + raw walnuts</li>
              <li>1/2 fresh baguette sandwich + filter coffee</li>
            </ul>
            <div className="text-[10px] text-amber-800 dark:text-amber-400 mt-1.5 font-bold">
              POLICY: Break room only &mdash; Absolutely zero eating at desk.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
