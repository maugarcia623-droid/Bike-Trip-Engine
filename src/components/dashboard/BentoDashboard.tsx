import React from 'react';
import { 
  Clock, 
  CheckSquare, 
  Utensils, 
  MapPin, 
  CheckCircle2, 
  Square
} from 'lucide-react';
import { Card } from '../common/Card';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { RouteMapBanner } from './RouteMapBanner';
import { AtmosphereCard } from './AtmosphereCard';
import { PhysicsEngineCard } from './PhysicsEngineCard';

interface BentoDashboardProps {
  trip: TripProfile;
  onUpdateTrip: (updated: TripProfile) => void;
  onToggleHeadwind: () => void;
  onPrint: () => void;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  trip,
  onUpdateTrip,
}) => {
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather);
  const timelineResult = calculateReverseTimeline(trip.route, trip.office, trip.weather);

  const movingMinutes = timelineResult?.pureMovingMinutes || 48;
  const bufferMinutes = timelineResult?.bufferMinutes || 15;

  const checkedCount = trip.checklist.filter((c) => c.checked).length;
  const totalChecklist = trip.checklist.length;
  const checklistPercent = Math.round((checkedCount / Math.max(1, totalChecklist)) * 100);
  const isAllChecked = checkedCount === totalChecklist && totalChecklist > 0;

  const handleToggleChecklistItem = (id: string) => {
    const updatedChecklist = trip.checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onUpdateTrip({ ...trip, checklist: updatedChecklist });
  };

  const handleCheckAll = () => {
    onUpdateTrip({
      ...trip,
      checklist: trip.checklist.map((item) => ({ ...item, checked: true })),
    });
  };

  const handleResetChecklist = () => {
    onUpdateTrip({
      ...trip,
      checklist: trip.checklist.map((item) => ({ ...item, checked: false })),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in no-print">
      
      {/* ── TOP NAV HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
              Vélotaf Engine &middot; Active Trip
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            {trip.name || 'Commute Route'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800">
            {trip.tag || 'COMMUTE PROTOCOL'}
          </span>
        </div>
      </div>

      {/* ── TWO-COLUMN COMMAND DECK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ════════ LEFT COLUMN (7 COLS): FLIGHT, TIMELINE & COMPLETE PHYSICS ════════ */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 1. HERO CARD: HARD DEPARTURE (Dual Theme) */}
          <div className="rounded-2xl bg-white dark:bg-[#0e0e11] text-slate-900 dark:text-white p-7 border border-slate-200 dark:border-zinc-800 shadow-xs dark:shadow-xl flex flex-col justify-between relative overflow-hidden transition-colors">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md">
                  Zero Delay Tolerance
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Target: {trip.office.gateName} @ {trip.office.targetGateArrivalTime}
                </span>
              </div>

              <div className="my-4">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-semibold block">
                  Hard Rollout Time
                </span>
                <div className="text-6xl sm:text-7xl font-mono font-black tracking-tighter text-emerald-600 dark:text-emerald-400 mt-1">
                  {timelineResult.hardDepartureTime}
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Route Length</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{trip.route.distanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Pure Rolling</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{movingMinutes}m</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Traffic Buffer</span>
                <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">+{bufferMinutes}m</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Shift Presence</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">{trip.office.shiftStartTime}</span>
              </div>
            </div>
          </div>

          {/* 2. REVERSE ITINERARY STEPPER */}
          <Card 
            title="Commute Timeline Milestones" 
            subtitle="Door-to-desk reverse calculated transit checkpoints"
            icon={<Clock className="w-4 h-4 text-emerald-500" />}
          >
            <div className="relative pl-6 space-y-3.5 py-2 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
              {timelineResult.steps.map((step) => {
                const isDeparture = step.id === 'hard-departure';
                const isArrival = step.id === 'gate-security' || step.id === 'locker-refuel';
                const isDesk = step.id === 'shift-start';

                return (
                  <div key={step.id} className="relative group">
                    <div className={`absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full border-2 ${
                      isDeparture 
                        ? 'bg-emerald-500 border-white dark:border-zinc-950 ring-4 ring-emerald-500/20' 
                        : isArrival 
                        ? 'bg-cyan-500 border-white dark:border-zinc-950 ring-4 ring-cyan-500/20' 
                        : isDesk 
                        ? 'bg-amber-500 border-white dark:border-zinc-950' 
                        : 'bg-slate-300 dark:bg-zinc-700 border-white dark:border-zinc-950'
                    }`} />
                    
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white min-w-[44px]">
                          {step.time}
                        </span>
                        <span className={`text-xs ${isDeparture || isDesk ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                          {step.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 px-2 py-0.5 rounded">
                        {step.location}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3. COMPLETE AERODYNAMIC & ROLLING PHYSICS ENGINE */}
          <PhysicsEngineCard
            trip={trip}
            physicsResult={physicsResult}
          />
        </div>

        {/* ════════ RIGHT COLUMN (5 COLS): SENSORS, RIG CHECK & ROUTE MAP ════════ */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 4. ATMOSPHERE & ESTUARY VECTOR CARD */}
          <AtmosphereCard
            trip={trip}
            physicsResult={physicsResult}
            onUpdateTrip={onUpdateTrip}
          />

          {/* 5. PRE-FLIGHT GEAR CHECKLIST */}
          <Card 
            title="Gear & Rig Inspection" 
            subtitle={`${checkedCount} of ${totalChecklist} checks confirmed`}
            icon={<CheckSquare className="w-4 h-4 text-emerald-500" />}
            badge={
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <button 
                  onClick={handleCheckAll}
                  className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase font-bold transition-colors"
                >
                  All
                </button>
                <span className="text-slate-300 dark:text-zinc-700">&middot;</span>
                <button 
                  onClick={handleResetChecklist}
                  className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase font-bold transition-colors"
                >
                  Reset
                </button>
              </div>
            }
          >
            <div>
              <div className="w-full bg-slate-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-200/50 dark:border-zinc-800">
                <div 
                  style={{ width: `${checklistPercent}%` }} 
                  className={`h-full transition-all duration-300 ${isAllChecked ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                />
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1.5 [scrollbar-width:thin] [scrollbar-color:#27272a_transparent]">
                {trip.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className={`cursor-pointer rounded-xl px-3 py-2 border transition-all flex items-center gap-3 text-xs select-none ${
                      item.checked
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-300/60 dark:border-emerald-500/30 text-slate-500 dark:text-zinc-400'
                        : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    <button type="button" className="flex-shrink-0">
                      {item.checked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-zinc-600" />
                      )}
                    </button>
                    <span className={`font-mono text-xs truncate ${item.checked ? 'line-through text-slate-400 dark:text-zinc-500' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-mono text-slate-500 dark:text-zinc-400 text-center">
                {isAllChecked ? '✓ Complete kit verified for departure' : 'Tap item to mark packed'}
              </div>
            </div>
          </Card>

          {/* 6. ROUTE MAP BANNER */}
          <RouteMapBanner 
            originName={trip.route.origin || 'Nantes'}
            destinationName={trip.route.destination || trip.office.gateName}
            distanceKm={trip.route.distanceKm} 
            coordinates={trip.route.coordinates}
          />
        </div>

        {/* ════════ BASELINE DOCK (12 COLS): NUTRITION PROTOCOL ════════ */}
        <div className="lg:col-span-12">
          <Card 
            title="Whole-Food Fueling & Recovery Protocol" 
            subtitle="Zero synthetic powders &middot; Pure whole-food glycogen replenishment"
            icon={<Utensils className="w-4 h-4 text-amber-500" />}
            badge={
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                Clean Nutrition
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-[10px] text-amber-600 dark:text-amber-400 uppercase">
                    1. Pre-Ride Ignition
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">-45m Home</span>
                </div>
                <ul className="text-slate-600 dark:text-zinc-300 space-y-1.5 list-disc list-inside text-[11px]">
                  <li>White baguette with wildflower honey</li>
                  <li>Double espresso (caffeine mobilization)</li>
                  <li>300ml water with pinch of sea salt</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                    2. Pocket Fuel
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">En Route</span>
                </div>
                <ul className="text-slate-600 dark:text-zinc-300 space-y-1.5 list-disc list-inside text-[11px]">
                  <li>50/50 diluted grape juice bidon (isotonic)</li>
                  <li>2 Medjool dates + 2 dried figs</li>
                  <li>2 artisanal pâte de fruits pastes</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-[10px] text-cyan-600 dark:text-cyan-400 uppercase">
                    3. Locker Refuel
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">08:30 Bench</span>
                </div>
                <ul className="text-slate-600 dark:text-zinc-300 space-y-1.5 list-disc list-inside text-[11px]">
                  <li>200g Skyr 0% tub (clean dairy protein)</li>
                  <li>250ml pure Concord grape juice</li>
                  <li>Fast glycogen + amino intake before shower</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-[10px] text-amber-700 dark:text-amber-400 uppercase">
                    4. Break Room Meal
                  </span>
                  <span className="text-[10px] font-mono text-amber-600">08:50 – 09:05</span>
                </div>
                <ul className="text-slate-700 dark:text-zinc-300 space-y-1.5 list-disc list-inside text-[11px]">
                  <li>Overnight oats with chia & oat milk</li>
                  <li>1 crisp grated Granny Smith apple + walnuts</li>
                  <li>1/2 fresh baguette sandwich + coffee</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
