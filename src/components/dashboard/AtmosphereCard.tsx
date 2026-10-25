import React, { useState, useEffect } from 'react';
import { Wind, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';

interface AtmosphereCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  onUpdateTrip: (updated: TripProfile) => void;
}

export const AtmosphereCard: React.FC<AtmosphereCardProps> = ({
  trip,
  physicsResult,
  onUpdateTrip,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isHeadwind = trip.weather.isHeadwindActive;
  const windSpeed = isHeadwind ? (trip.weather.baseWindSpeedKmH || 8) : 0;
  const windDegrees = trip.weather.windDirectionDegrees || 245;
  const temperature = trip.weather.temperatureC ?? 11;
  const rho = trip.physics.rho ?? 1.225;
  const maxGust = trip.weather.estuaryGustKmH || (isHeadwind ? Math.round(windSpeed * 1.75) : 4);

  const aeroPenalty = Math.round(physicsResult?.powerDeltaWatts || (isHeadwind ? 77 : 0));
  const bufferMinutes = isHeadwind ? 3 : 0;
  const goStatus = physicsResult?.goStatus || 'GO';
  const goReason = physicsResult?.goStatusReason || 'Standard cruising clearance across the estuary.';

  const handleWindSpeedChange = (newSpeed: number) => {
    const active = newSpeed > 0;
    onUpdateTrip({
      ...trip,
      weather: {
        ...trip.weather,
        isHeadwindActive: active,
        baseWindSpeedKmH: newSpeed,
        estuaryGustKmH: active ? Math.round(newSpeed * 1.75) : 4,
      },
    });
  };

  const handleToggleState = () => {
    if (isHeadwind) {
      handleWindSpeedChange(0);
    } else {
      handleWindSpeedChange(8);
    }
  };

  const fillPercent = Math.min(100, Math.max(0, (windSpeed / 35) * 100));
  const trackEmptyColor = isDarkMode ? '#27272a' : '#e2e8f0';

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-zinc-800 p-6 shadow-xs dark:shadow-xl flex flex-col justify-between transition-colors">
      
      {/* ── 1. HEADER & STATE TOGGLE ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
            isHeadwind 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500' 
              : 'bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-white">
              ATMOSPHERE &amp; ESTUARY VECTOR
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
              Dynamic headwind modeling across the bridge corridor
            </p>
          </div>
        </div>

        {/* Master State Pill */}
        <button
          type="button"
          onClick={handleToggleState}
          className={`shrink-0 px-3 py-1.5 rounded-lg font-mono font-black text-center leading-tight transition-all cursor-pointer select-none border ${
            isHeadwind
              ? 'bg-[#f59e0b] hover:bg-[#d97706] text-zinc-950 border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700/80'
          }`}
        >
          <span className="block text-[11px] uppercase tracking-wide">
            {isHeadwind ? `${windSpeed} KM/H` : 'CALM (0 KM/H)'}
          </span>
          <span className={`block text-[9px] tracking-wider uppercase font-extrabold ${isHeadwind ? 'text-zinc-950' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isHeadwind ? 'HEADWIND: ON' : 'WIND: CALM'}
          </span>
        </button>
      </div>

      {/* ── 2. FLIGHT STATUS BANNER ── */}
      <div className={`p-3 rounded-xl border mb-4 font-mono transition-colors ${
        goStatus === 'GO'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25'
          : goStatus === 'CAUTION'
          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25'
          : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25'
      }`}>
        <div className={`flex items-center gap-2 text-xs font-bold tracking-wider ${
          goStatus === 'GO' 
            ? 'text-emerald-700 dark:text-emerald-400' 
            : goStatus === 'CAUTION' 
            ? 'text-amber-700 dark:text-amber-400' 
            : 'text-rose-700 dark:text-rose-400'
        }`}>
          {goStatus === 'GO' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {goStatus === 'CAUTION' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {goStatus === 'NO-GO' && <XCircle className="w-4 h-4 shrink-0" />}
          <span>STATUS: {goStatus} &middot; {goStatus === 'GO' ? '100% PASS' : 'ADJUST RIG'}</span>
        </div>
        
        <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed pl-6">
          {goReason}
        </p>
      </div>

      {/* ── 3. HERO COMPASS INSTRUMENT POD ── */}
      <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 p-5 flex flex-col items-center justify-center mb-4 transition-colors">
        
        {/* Dashed Orbit Ring */}
        <div className="relative w-28 h-28 rounded-full border border-dashed border-slate-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-950/40 flex items-center justify-center mb-3 shadow-xs dark:shadow-none">
          <span className="absolute top-1 text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-400">N</span>
          <span className="absolute bottom-1 text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">S</span>
          <span className="absolute left-1.5 text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">W</span>
          <span className="absolute right-1.5 text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">E</span>

          {/* Hollow Chevron Vector Needle */}
          <div
            className="transition-transform duration-500 ease-out flex items-center justify-center"
            style={{ transform: `rotate(${isHeadwind ? windDegrees : 90}deg)` }}
          >
            <svg viewBox="0 0 40 40" className="w-11 h-11" fill="none">
              <path
                d="M 20 6 L 31 31 L 20 25 L 9 31 Z"
                fill="none"
                stroke={isHeadwind ? '#f59e0b' : (isDarkMode ? '#10b981' : '#059669')}
                strokeWidth="2.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Readout */}
        <div className="text-center font-mono">
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {windSpeed} km/h
          </span>
          <span className="text-xs text-slate-500 dark:text-zinc-400 ml-2 font-normal">
            ({isHeadwind ? `${windDegrees}° WSW Headwind` : 'Calm Air / Neutral'})
          </span>
        </div>

        {/* Dynamic Drag Penalty Banner */}
        {isHeadwind ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-mono font-bold mt-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>+{aeroPenalty}W Aero Penalty &middot; +{bufferMinutes}m Buffer</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-bold mt-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>0W Aero Drag Penalty &middot; Pure Rolling Pace</span>
          </div>
        )}
      </div>

      {/* ── 4. METRIC PODS (TEMP & GUSTS) ── */}
      <div className="grid grid-cols-2 gap-3 font-mono mb-5">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 transition-colors">
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">
            AIR TEMP &amp; RHO
          </span>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {temperature}&deg;C <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">({rho})</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 transition-colors">
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">
            MAX GUST ENVELOPE
          </span>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {maxGust} km/h <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">max</span>
          </div>
        </div>
      </div>

      {/* ── 5. ESTUARY WIND VELOCITY SLIDER ── */}
      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 font-mono">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-600 dark:text-zinc-400">Estuary Wind Velocity:</span>
          <span className="font-bold text-slate-900 dark:text-white">{windSpeed} km/h</span>
        </div>

        <div className="relative py-1 flex items-center">
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={windSpeed}
            onChange={(e) => handleWindSpeedChange(Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${fillPercent}%, ${trackEmptyColor} ${fillPercent}%, ${trackEmptyColor} 100%)`,
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-hidden accent-slate-900 dark:accent-white"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-500 mt-2 font-mono">
          <button
            type="button"
            onClick={() => handleWindSpeedChange(0)}
            className={`hover:text-slate-900 dark:hover:text-zinc-300 transition-colors ${windSpeed === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}
          >
            0 km/h (Calm)
          </button>
          <button
            type="button"
            onClick={() => handleWindSpeedChange(8)}
            className={`hover:text-slate-900 dark:hover:text-zinc-300 transition-colors ${windSpeed === 8 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}`}
          >
            8 km/h (Baseline)
          </button>
          <button
            type="button"
            onClick={() => handleWindSpeedChange(35)}
            className={`hover:text-slate-900 dark:hover:text-zinc-300 transition-colors ${windSpeed === 35 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}
          >
            35 km/h (Gale)
          </button>
        </div>
      </div>

    </div>
  );
};
