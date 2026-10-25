import React from 'react';
import { Wind, Navigation2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../common/Card';
import { WeatherCondition, PhysicsCalculationResult } from '../../types/trip';

interface WeatherBentoProps {
  weather: WeatherCondition;
  physicsResult: PhysicsCalculationResult;
  onToggleHeadwind: () => void;
  onSetWindSpeed: (speed: number) => void;
}

export const WeatherBento: React.FC<WeatherBentoProps> = ({
  weather,
  physicsResult,
  onToggleHeadwind,
  onSetWindSpeed,
}) => {
  const isHeadwind = weather.isHeadwindActive;

  return (
    <Card
      title="ATMOSPHERE &amp; ESTUARY VECTOR"
      subtitle="Dynamic headwind modeling across the bridge corridor"
      icon={<Wind className="w-4 h-4 text-amber-500" />}
      badge={
        <button
          onClick={onToggleHeadwind}
          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold transition-all ${
            isHeadwind
              ? 'bg-amber-500 text-zinc-950 shadow-glow-amber'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700'
          }`}
        >
          {isHeadwind ? '8 km/h Headwind: ON' : 'Calm: OFF'}
        </button>
      }
      glow={isHeadwind ? 'amber' : 'emerald'}
      className="col-span-1"
    >
      {/* Central Visual Compass Vector Gauge */}
      <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-4 flex flex-col items-center justify-center text-center">
        <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
          {/* Compass circle */}
          <div className="absolute inset-0 rounded-full border border-slate-300 dark:border-zinc-800 border-dashed" />
          <div className="absolute top-1 text-[9px] font-mono text-slate-500 dark:text-zinc-400">N</div>
          <div className="absolute bottom-1 text-[9px] font-mono text-slate-500 dark:text-zinc-400">S</div>
          <div className="absolute left-1.5 text-[9px] font-mono text-slate-500 dark:text-zinc-400">W</div>
          <div className="absolute right-1.5 text-[9px] font-mono text-slate-500 dark:text-zinc-400">E</div>

          {/* Wind Arrow Vector */}
          <div
            style={{
              transform: `rotate(${isHeadwind ? 245 : 45}deg)`,
            }}
            className="transition-transform duration-500 flex flex-col items-center"
          >
            <Navigation2
              className={`w-10 h-10 ${
                isHeadwind ? 'text-amber-500 fill-amber-500/20' : 'text-emerald-600 dark:text-emerald-400 fill-emerald-500/20'
              }`}
            />
          </div>
        </div>

        <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
          {weather.baseWindSpeedKmH} km/h{' '}
          <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
            {isHeadwind ? '(245° WSW Headwind)' : '(Calm / Mild Vector)'}
          </span>
        </div>

        {/* Dynamic Penalty Banner */}
        {isHeadwind ? (
          <div className="mt-2 text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>+{Math.round(physicsResult.powerDeltaWatts)}W Aero Penalty &middot; +3m Buffer</span>
          </div>
        ) : (
          <div className="mt-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Optimal Commute Corridor &middot; Zero Headwind Penalty</span>
          </div>
        )}
      </div>

      {/* Atmospheric Secondary Readouts */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
        <div className="bg-white dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-2.5 shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">Air Temp &amp; Rho</div>
          <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
            {weather.temperatureC}°C <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">(1.225)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-2.5 shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">Max Gust Envelope</div>
          <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
            {isHeadwind ? weather.estuaryGustKmH : 6} km/h max
          </div>
        </div>
      </div>

      {/* Interactive Wind Slider */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-zinc-400 mb-1.5">
          <span>Estuary Wind Velocity:</span>
          <span className="text-slate-900 dark:text-white font-bold">{weather.baseWindSpeedKmH} km/h</span>
        </div>
        <input
          type="range"
          min="0"
          max="35"
          step="1"
          value={weather.baseWindSpeedKmH}
          onChange={(e) => onSetWindSpeed(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
          <span>0 km/h (Calm)</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">8 km/h (Baseline)</span>
          <span>35 km/h (Gale)</span>
        </div>
      </div>
    </Card>
  );
};
