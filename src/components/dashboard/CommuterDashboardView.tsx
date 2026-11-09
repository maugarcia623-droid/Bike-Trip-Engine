import React from 'react';
import { Clock, Wind, CheckSquare, ForkKnife, Warning, CheckCircle, ShieldCheck, Check, Coffee, Shield } from '@/components/icons';
import { Card } from '../common/Card';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { ReverseTimelineCalculation } from '../../utils/timeline';

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-apple-in">
      {/* CARD A: TIMELINE & DEPARTURE */}
      <Card
        title="Your morning, step by step"
        subtitle="Timed around your morning routine and arrival target"
        icon={<Clock className="w-5 h-5 text-ink dark:text-volt" />}
        badge={
          <span className="text-[10px] font-mono uppercase bg-volt text-[#111111] dark:bg-volt/15 dark:text-volt px-3 py-0.5 rounded-full font-bold">
            On schedule
          </span>
        }
        className="col-span-1"
      >
        {/* Giant Leave By Pod */}
        <div className="bg-volt text-[#111111] dark:bg-pod dark:text-ink rounded-pod p-5 mb-5 text-center">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#111111]/75 dark:text-ink-muted font-bold mb-1">
            LEAVE BY
          </div>
          <div className="text-5xl sm:text-6xl font-mono font-extrabold tracking-tight text-[#111111] dark:text-volt">
            {timelineResult.hardDepartureTime}
          </div>
          <div className="mt-2 text-xs font-mono text-[#111111]/80 dark:text-ink-secondary">
            Ride to reach{' '}
            <strong className="font-bold">{trip.office.gateName}</strong> by{' '}
            <strong className="font-bold">{trip.office.targetGateArrivalTime}</strong>
          </div>

          <div className="lane-divider my-3" aria-hidden="true" />

          <div className="flex items-center justify-around text-xs font-mono">
            <div>
              <span className="text-[10px] opacity-70 block uppercase">Ride time</span>
              <span className="font-bold">{timelineResult.pureMovingMinutes} min</span>
            </div>
            <div>
              <span className="text-[10px] opacity-70 block uppercase">Buffer</span>
              <span className="font-bold">+{timelineResult.bufferMinutes} min</span>
            </div>
            <div>
              <span className="text-[10px] opacity-70 block uppercase">Work starts</span>
              <span className="font-bold">{trip.office.shiftStartTime}</span>
            </div>
          </div>
        </div>

        {/* Visual Step Timeline with Asphalt Dashed Spine */}
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink mb-1 flex items-center justify-between">
            <span>Your morning timeline</span>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-pod text-ink-secondary">
              Door-to-Desk: {timelineResult.totalDoorToDeskMinutes} min
            </span>
          </div>

          <div className="relative space-y-3">
            <div className="lane-spine absolute left-[19px] top-4 bottom-4 pointer-events-none" aria-hidden="true" />
            {timelineResult.steps.slice(1, 9).map((step) => {
              const isDeparture = step.id === 'hard-departure';

              return (
                <div key={step.id} className="relative flex items-center gap-3 group">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#F3BB70] flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5 text-[#92400E] shrink-0" weight="regular" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2 bg-pod rounded-2xl px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-ink bg-card px-2.5 py-1 rounded-xl shrink-0">
                        {step.time}
                      </span>
                      <span className={`break-words leading-tight ${isDeparture ? 'font-bold text-ink dark:text-volt' : 'text-ink-secondary'}`}>
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-ink-muted bg-card px-2 py-0.5 rounded-full shrink-0">
                      {step.location.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 rounded-full bg-pod text-[11px] font-mono text-ink-secondary mt-2 text-center">
            No food in open space &middot; Work starts at{' '}
            <strong className="text-ink">{trip.office.shiftStartTime}</strong>
          </div>
        </div>
      </Card>

      {/* CARD B: CONDITIONS & GEAR CHECKLIST */}
      <Card
        title="Conditions &amp; gear"
        subtitle="Live weather advisory and bike check"
        icon={<Wind className="w-5 h-5 text-ink dark:text-volt" />}
        badge={
          <span
            className={`text-[10px] font-mono uppercase px-3 py-0.5 rounded-full font-bold ${
              isHeadwind
                ? 'bg-volt text-[#111111] dark:bg-beacon-amber/15 dark:text-beacon-amber'
                : 'bg-volt-lime text-[#111111] dark:bg-volt-lime/15 dark:text-volt-lime'
            }`}
          >
            {isHeadwind ? 'HEADWIND ACTIVE' : 'CALM ROUTE'}
          </span>
        }
        className="col-span-1"
      >
        <div className="bg-pod rounded-pod p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {isHeadwind ? (
                <Warning className="w-4 h-4 text-beacon-amber" />
              ) : (
                <CheckCircle className="w-4 h-4 text-[#45A400] dark:text-volt-lime" />
              )}
              <span className="text-xs font-mono font-bold text-ink">
                {isHeadwind ? '8 km/h Estuary Headwind Active' : 'Calm Morning Ride Profile'}
              </span>
            </div>

            <button
              onClick={onToggleHeadwind}
              className={`text-[10px] font-mono uppercase px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                isHeadwind
                  ? 'bg-[#111111] text-volt dark:bg-elevated dark:text-beacon-amber'
                  : 'bg-card text-ink hover:bg-chip'
              }`}
            >
              {isHeadwind ? 'Headwind: ON' : 'Toggle Wind'}
            </button>
          </div>

          <p className="text-xs text-ink-secondary leading-relaxed">
            {isHeadwind
              ? 'Estuary bridge crossing has an opposing breeze. Maintain low aero hoods posture; +3-4 minutes buffer has been added to departure time.'
              : 'Negligible wind resistance across the bridge. Smooth cruising conditions at standard target speed.'}
          </p>

          <div className="lane-divider my-3" aria-hidden="true" />

          <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary">
            <span>Temp: <strong className="text-ink">{trip.weather.temperatureC}°C</strong></span>
            <span>Precip: <strong className="text-ink">{trip.weather.precipitationRiskPercent}%</strong></span>
            <span>Gusts: <strong className="text-ink">{isHeadwind ? trip.weather.estuaryGustKmH : 5} km/h</strong></span>
          </div>
        </div>

        {/* Pre-Flight Checklist Preview */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ink">
              <CheckSquare className="w-4 h-4 text-ink dark:text-volt" />
              <span>Checklist ({checkedCount}/{totalChecklist})</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                onClick={onCheckAllChecklist}
                className="px-2.5 py-0.5 rounded-full bg-pod hover:bg-chip text-[10px] font-bold text-ink-secondary hover:text-ink cursor-pointer"
              >
                All
              </button>
              <button
                onClick={onResetChecklist}
                className="px-2.5 py-0.5 rounded-full bg-pod hover:bg-chip text-[10px] font-bold text-ink-secondary hover:text-ink cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="w-full bg-pod h-2 rounded-full overflow-hidden mb-3">
            <div
              style={{ width: `${checklistPercent}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                isAllChecked ? 'bg-[#45A400] dark:bg-volt-lime' : 'bg-[#111111] dark:bg-volt'
              }`}
            />
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
            {trip.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleChecklistItem(item.id)}
                className={`cursor-pointer rounded-full px-3.5 py-2 transition-all flex items-center gap-2.5 select-none text-xs ${
                  item.checked
                    ? 'bg-pod/60 text-ink-muted'
                    : 'bg-pod hover:bg-chip text-ink'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    item.checked
                      ? 'bg-[#111111] text-volt dark:bg-volt-lime dark:text-[#0A0A0B]'
                      : 'bg-card border border-ink/25 dark:border-white/25'
                  }`}
                >
                  {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                </span>
                <span className={`text-[11px] font-mono break-words leading-tight ${item.checked ? 'line-through' : 'font-medium'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] font-mono text-ink-muted text-center">
            {isAllChecked ? '✓ All items checked and ready to roll' : 'Tap each item as you pack it'}
          </div>
        </div>
      </Card>

      {/* CARD C: REAL-FOOD FUELING */}
      <Card
        title="Your food plan"
        subtitle="Real food timed around your commute and workday"
        icon={<ForkKnife className="w-5 h-5 text-beacon-amber" />}
        badge={
          <span className="text-[10px] font-mono uppercase bg-pod text-ink px-3 py-0.5 rounded-full font-bold">
            Real food
          </span>
        }
        className="col-span-1"
      >
        <div className="space-y-3.5 flex-1 flex flex-col justify-between">
          <div className="bg-pod rounded-pod p-4">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-beacon-amber" />
                <span className="text-xs font-mono font-bold uppercase text-ink">
                  1. Pre-Ride Breakfast
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink font-bold bg-card px-2.5 py-0.5 rounded-full">
                -45m
              </span>
            </div>
            <ul className="text-xs text-ink-secondary space-y-1 list-disc list-inside">
              <li>White baguette / country bread + pure wildflower honey</li>
              <li>Double espresso (rich caffeine mobilization)</li>
              <li>300ml fresh spring water with pinch of salt</li>
            </ul>
          </div>

          <div className="bg-pod rounded-pod p-4">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-ink dark:text-volt" />
                <span className="text-xs font-mono font-bold uppercase text-ink">
                  2. On-Bike Pocket Fuel
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink dark:text-volt font-bold bg-card px-2.5 py-0.5 rounded-full">
                On the road
              </span>
            </div>
            <ul className="text-xs text-ink-secondary space-y-1 list-disc list-inside">
              <li>50/50 water &amp; pressed grape/apple juice bottle (isotonic)</li>
              <li>2 Medjool dates + 2 dried Turkish figs</li>
              <li>2 artisanal pâte de fruits fruit pastes</li>
            </ul>
          </div>

          <div className="bg-pod rounded-pod p-4">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#45A400] dark:text-volt-lime" />
                <span className="text-xs font-mono font-bold uppercase text-ink">
                  3. Locker Room Refuel
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink font-bold bg-card px-2.5 py-0.5 rounded-full">
                {trip.office.targetGateArrivalTime || '08:30'} Bench
              </span>
            </div>
            <ul className="text-xs text-ink-secondary space-y-1 list-disc list-inside">
              <li>200g Skyr 0% tub (pure natural dairy protein)</li>
              <li>250ml 100% pure Concord grape juice</li>
            </ul>
          </div>

          <div className="bg-volt text-[#111111] dark:bg-elevated dark:text-ink rounded-pod p-4">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <ForkKnife className="w-4 h-4 text-[#111111] dark:text-beacon-amber" />
                <span className="text-xs font-mono font-bold uppercase text-[#111111] dark:text-beacon-amber">
                  4. Break Room Breakfast
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#111111]/10 dark:bg-card px-2.5 py-0.5 rounded-full">
                08:50 – 09:05
              </span>
            </div>
            <ul className="text-xs text-[#111111]/85 dark:text-ink-secondary space-y-1 list-disc list-inside">
              <li>Oat milk overnight oats + chia</li>
              <li>1 crisp grated Granny Smith apple + raw walnuts</li>
              <li>1/2 fresh baguette sandwich + filter coffee</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
