import React from 'react';
import { Gauge, Zap, Activity, Flame, Scale } from 'lucide-react';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';

interface PhysicsEngineCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
}

export const PhysicsEngineCard: React.FC<PhysicsEngineCardProps> = ({
  trip,
  physicsResult,
}) => {
  const cda = trip.physics.cda ?? 0.4;
  const crr = trip.physics.crr ?? 0.006;
  const rho = trip.physics.rho ?? 1.225;
  const gmePercent = Math.round((trip.physics.grossMechanicalEfficiency ?? 0.21) * 100);
  const drivetrainEffPercent = Math.round((trip.physics.drivetrainEfficiency ?? 0.95) * 100);
  const drivetrainLossPercent = 100 - drivetrainEffPercent;

  const riderMass = trip.physics.riderWeightKg ?? 74;
  const bikeMass = trip.physics.bikeWeightKg ?? 9.4;
  const gearMass = trip.physics.gearWeightKg ?? 4.2;
  const totalSystemMass = Number((riderMass + bikeMass + gearMass).toFixed(1));

  const legWatts = Math.round(physicsResult.legWatts || 175);
  const aeroWatts = Math.round(physicsResult.aerodynamicDragWatts || 110);
  const rollingWatts = Math.round(physicsResult.rollingResistanceWatts || 32);
  const drivetrainLossWatts = Math.max(0, Math.round(legWatts - (physicsResult.wheelWatts || legWatts * 0.95)));

  const totalResistiveWatts = Math.max(1, aeroWatts + rollingWatts + drivetrainLossWatts);
  const aeroPercent = Math.round((aeroWatts / totalResistiveWatts) * 100);
  const rollingPercent = Math.round((rollingWatts / totalResistiveWatts) * 100);

  const totalCarbs = physicsResult.totalCarbsBurnedGrams || Math.round(
    physicsResult.carbOxidationGramPerHour * ((physicsResult.movingTimeSeconds || 2880) / 3600)
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-zinc-800 p-6 shadow-xs dark:shadow-xl flex flex-col gap-5 font-mono transition-colors">
      
      {/* ── 1. HEADER ── */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-cyan-600 dark:text-cyan-400 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-white">
                AERODYNAMIC &amp; ROLLING PHYSICS ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
                CDA {cda} M² &middot; CRR {crr}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Standard road/gravel power model with mechanical efficiency
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. TOP 4 METRIC PODS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Leg Output */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-semibold">
            <span>Leg Output</span>
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{legWatts}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">W</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500">
            Target: {(trip.route.targetSpeedKmH || 27.5).toFixed(1)} km/h
          </span>
        </div>

        {/* Total Work */}
        <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/10 border border-cyan-200 dark:border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-semibold">
            <span>Total Work</span>
            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{Math.round(physicsResult.totalWorkKj)}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">kJ</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">
            Duration: {physicsResult.movingTimeFormatted || '48m 00s'}
          </span>
        </div>

        {/* Caloric Burn */}
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-semibold">
            <span>Caloric Burn</span>
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{Math.round(physicsResult.totalKcalBurn)}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500">
            Gross Mech Eff: {gmePercent}%
          </span>
        </div>

        {/* Carb Oxidation */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-semibold">
            <span>Carb Oxidation</span>
            <Flame className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{physicsResult.carbOxidationGramPerHour}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">g/hr</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500">
            Total trip: ~{totalCarbs}g
          </span>
        </div>
      </div>

      {/* ── 3. RESISTIVE FORCE DISTRIBUTION SECTION ── */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-xs mb-2.5">
          <span className="text-slate-800 dark:text-zinc-300 font-bold">Resistive Force Distribution</span>
          <span className="text-xs">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">Aero: {aeroPercent}%</span>
            <span className="text-slate-400 dark:text-zinc-600 mx-1.5">&middot;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rolling: {rollingPercent}%</span>
          </span>
        </div>

        {/* Dual-color bar */}
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-950 overflow-hidden flex mb-4 border border-slate-300/60 dark:border-zinc-800/60">
          <div style={{ width: `${aeroPercent}%` }} className="h-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-300" />
          <div style={{ width: `${rollingPercent}%` }} className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300" />
        </div>

        {/* 3 Formula Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold block">
              Aerodynamic Drag (P_Aero)
            </span>
            <div className="my-1">
              <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{aeroWatts}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">Watts</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono leading-tight">
              0.5 &times; &rho;({rho}) &times; CdA({cda}) &times; v&sup3;
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold block">
              Rolling Resistance (P_Roll)
            </span>
            <div className="my-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{rollingWatts}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">Watts</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono leading-tight">
              Crr({crr}) &times; M({totalSystemMass}kg) &times; 9.81 &times; v
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold block">
              Drivetrain Loss ({drivetrainLossPercent}%)
            </span>
            <div className="my-1">
              <span className="text-xl font-bold text-slate-800 dark:text-zinc-200">{drivetrainLossWatts}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 ml-1">Watts</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono leading-tight">
              {drivetrainEffPercent}% clean efficiency (P_wheel / 0.95)
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM DUAL PANELS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* System Mass */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/60 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-300 font-bold">
              <Scale className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>SYSTEM MASS DECOMPOSITION</span>
            </div>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              {totalSystemMass} KG
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Rider Mass:</span>
              <span className="text-slate-900 dark:text-white font-bold">{riderMass} kg</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Gravel Bike:</span>
              <span className="text-slate-900 dark:text-white font-bold">{bikeMass} kg</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Gear &amp; Commute Pack:</span>
              <span className="text-slate-900 dark:text-white font-bold">{gearMass} kg</span>
            </div>
          </div>
        </div>

        {/* Energy Substrate */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/60 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-300 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>ENERGY SUBSTRATE ENGINE</span>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {gmePercent}% EFFICIENCY
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Mechanical Work:</span>
              <span className="text-slate-900 dark:text-white font-bold">{Math.round(physicsResult.totalWorkKj)} kJ</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Gross Metabolic Energy:</span>
              <span className="text-slate-900 dark:text-white font-bold">{Math.round(physicsResult.totalKcalBurn)} kcal</span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
              <span>Carb Oxidation Demand:</span>
              <span>{physicsResult.carbOxidationGramPerHour} g/hr (~{totalCarbs}g total)</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
