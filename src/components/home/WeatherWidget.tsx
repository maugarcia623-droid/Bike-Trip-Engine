import React from 'react';
import { Wind, Thermometer, CloudRain, AlertTriangle, CheckCircle, Navigation2 } from 'lucide-react';
import { WeatherCondition } from '../../types/trip';

interface WeatherWidgetProps {
  weather: WeatherCondition;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
  speedKmH: number;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  onUpdateWeather,
  speedKmH,
}) => {
  const toggleHeadwind = () => {
    onUpdateWeather({
      ...weather,
      isHeadwindActive: !weather.isHeadwindActive,
      windDirection: !weather.isHeadwindActive ? 'headwind' : 'calm',
    });
  };

  const handleWindSpeedChange = (speed: number) => {
    onUpdateWeather({
      ...weather,
      baseWindSpeedKmH: speed,
      isHeadwindActive: speed > 0,
    });
  };

  // Status
  const isHighWind = weather.baseWindSpeedKmH >= 30;
  const isCaution = weather.isHeadwindActive && weather.baseWindSpeedKmH >= 8;

  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 mb-8 shadow-sm dark:shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              QUICK WEATHER CHECK &middot; ESTUARY BRIDGE CORRIDOR
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            Real-time atmospheric telemetry and dynamic GO / NO-GO aerodynamic evaluation.
          </p>
        </div>

        {/* Global GO / CAUTION Status Banner */}
        <div className="flex items-center gap-3">
          {isHighWind ? (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>NO-GO &middot; GALE HAZARD</span>
            </div>
          ) : isCaution ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>CAUTION &middot; HEADWIND ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>GO &middot; OPTIMAL CONDITIONS</span>
            </div>
          )}

          {/* Quick Toggle Button */}
          <button
            onClick={toggleHeadwind}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              weather.isHeadwindActive
                ? 'bg-amber-500 text-zinc-950 shadow-glow-amber'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>{weather.isHeadwindActive ? '8 km/h Headwind ON' : 'Calm Mode'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Weather Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Wind Vector */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
            <span>Estuary Vector</span>
            <Navigation2
              className={`w-3.5 h-3.5 transform transition-transform ${
                weather.isHeadwindActive ? 'text-amber-500 dark:text-amber-400 rotate-180' : 'text-emerald-600 dark:text-emerald-400 rotate-45'
              }`}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">
              {weather.baseWindSpeedKmH}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">km/h</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
            {weather.isHeadwindActive ? 'Opposing Headwind (245° WSW)' : 'Negligible Drag'}
          </p>
        </div>

        {/* Temperature & Air Density */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
            <span>Air Temp / Rho</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400">
              {weather.temperatureC}°C
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">1.225 kg/m³</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
            Crisp morning air (ideal drag)
          </p>
        </div>

        {/* Gust Envelope */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
            <span>Bridge Gusts</span>
            <Wind className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">
              {weather.isHeadwindActive ? weather.estuaryGustKmH : 5}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">km/h max</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
            Lateral stability: Safe
          </p>
        </div>

        {/* Rain Risk & Road Grip */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">
            <span>Precipitation</span>
            <CloudRain className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">
              {weather.precipitationRiskPercent}%
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">dry tarmac</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
            Crr nominal: 0.006 (Gravel)
          </p>
        </div>
      </div>

      {/* Interactive Wind Tuning Slider */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-600 dark:text-zinc-400">Tuning Slider:</span>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={weather.baseWindSpeedKmH}
            onChange={(e) => handleWindSpeedChange(Number(e.target.value))}
            className="w-40 sm:w-56 accent-emerald-500 cursor-pointer"
          />
          <span className="font-bold text-slate-900 dark:text-white min-w-[50px]">
            {weather.baseWindSpeedKmH} km/h
          </span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-zinc-400">
          Target Speed: <span className="text-slate-800 dark:text-zinc-200 font-bold">{speedKmH} km/h</span> &middot;{' '}
          {weather.isHeadwindActive ? (
            <span className="text-amber-600 dark:text-amber-400 font-bold">+22W aero penalty factored in</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Standard baseline profile</span>
          )}
        </div>
      </div>
    </div>
  );
};
