import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, Coffee, Shield, Zap, Navigation, ShowerHead, AlarmClock, Utensils } from 'lucide-react';
import { Card } from '../common/Card';
import { ReverseTimelineCalculation } from '../../utils/timeline';

interface ReverseTimelineBentoProps {
  timeline: ReverseTimelineCalculation;
  gateName: string;
}

export const ReverseTimelineBento: React.FC<ReverseTimelineBentoProps> = ({
  timeline,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'AlarmClock':
        return <AlarmClock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />;
      case 'Utensils':
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'Navigation':
        return <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'Wind':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'ShieldCheck':
        return <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'ShowerHead':
        return <ShowerHead className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'Coffee':
        return <Coffee className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />;
    }
  };

  return (
    <Card
      title="REVERSE TIMELINE STEPPER &middot; OFFICE CONSTRAINTS"
      subtitle="Working backwards from shift start and gate arrival checkpoints"
      icon={<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      badge={
        <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
          HARD DEPARTURE: {timeline.hardDepartureTime}
        </span>
      }
      glow="emerald"
      className="col-span-1 lg:col-span-3"
    >
      {/* Strict Office Mandate Alert Bar */}
      <div className="bg-amber-50/80 dark:bg-zinc-950/90 border border-amber-300 dark:border-amber-500/30 rounded-xl p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="text-amber-900 dark:text-amber-300 font-bold uppercase tracking-wider">
              OFFICE POLICY MANDATE: ZERO FOOD IN OPEN-SPACE
            </span>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
              Phase 1 Locker Refuel strictly at 08:30 (bench). Phase 2 Break Room Breakfast at 08:50 before 09:00 shift lock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-400 text-[11px]">
          <span>Moving: <strong className="text-slate-900 dark:text-white">{timeline.pureMovingMinutes}m</strong></span>
          <span>Buffers: <strong className="text-cyan-700 dark:text-cyan-400">{timeline.bufferMinutes}m</strong></span>
          <span>Door-to-Desk: <strong className="text-emerald-700 dark:text-emerald-400">{timeline.totalDoorToDeskMinutes}m</strong></span>
        </div>
      </div>

      {/* Stepper Timeline: Clean Visual Flow */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
        {timeline.steps.map((step) => {
          const isHardDeparture = step.id === 'hard-departure';
          const isGateArrival = step.id === 'gate-security' || step.id === 'locker-refuel';
          const isShiftStart = step.id === 'shift-start';
          const isBreakRoom = step.id === 'breakroom-breakfast';

          let dotColor = 'bg-slate-400 border-white dark:bg-zinc-700 dark:border-zinc-900';
          let borderHighlight = 'border-slate-200 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-950/40';

          if (isHardDeparture) {
            dotColor = 'bg-emerald-500 border-white dark:border-emerald-950 ring-4 ring-emerald-500/20';
            borderHighlight = 'border-emerald-400 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/10 shadow-glow-emerald';
          } else if (isGateArrival) {
            dotColor = 'bg-cyan-500 border-white dark:border-cyan-950 ring-4 ring-cyan-500/20';
            borderHighlight = 'border-cyan-400 dark:border-cyan-500/40 bg-cyan-50/60 dark:bg-cyan-950/10';
          } else if (isShiftStart) {
            dotColor = 'bg-slate-900 dark:bg-white border-white dark:border-zinc-900 ring-4 ring-slate-400/20 dark:ring-white/10';
            borderHighlight = 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 shadow-xs';
          } else if (isBreakRoom) {
            dotColor = 'bg-amber-500 border-white dark:border-amber-950';
            borderHighlight = 'border-amber-300 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/10';
          }

          return (
            <div key={step.id} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-[1.85rem] top-3 w-3.5 h-3.5 rounded-full border-2 transition-all ${dotColor}`}
              />

              {/* Step Card */}
              <div
                className={`border rounded-xl p-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${borderHighlight}`}
              >
                <div className="flex items-start md:items-center gap-3">
                  {/* Time Badge */}
                  <div className="font-mono text-base font-extrabold tracking-tight text-slate-900 dark:text-white min-w-[58px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded text-center shadow-xs">
                    {step.time}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-zinc-200">
                        {getIcon(step.iconName)}
                        <span>{step.title}</span>
                      </div>
                      {step.isCrucialCheckpoint && (
                        <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.2 rounded font-bold">
                          CRITICAL CHECKPOINT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Location & Category Tag */}
                <div className="flex items-center gap-2 text-right self-end md:self-center font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded text-slate-700 dark:text-zinc-300 shadow-xs">
                    {step.location}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
