import React from 'react';
import { Zap, Gauge, Flame, Scale, Activity } from 'lucide-react';
import { Card } from '../common/Card';
import { MetricPill } from '../common/MetricPill';
import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../../types/trip';

interface PhysicsBentoProps {
  physics: PhysicsParams;
  route: RouteParams;
  weather: WeatherCondition;
  result: PhysicsCalculationResult;
}

export const PhysicsBento: React.FC<PhysicsBentoProps> = ({
  physics,
  route,
  weather,
  result,
}) => {
  // Aero vs Rolling proportions
  const totalDragWatts = result.aerodynamicDragWatts + result.rollingResistanceWatts + result.gravityWatts;
  const aeroPercent = Math.round((result.aerodynamicDragWatts / Math.max(1, totalDragWatts)) * 100);
  const rollPercent = Math.round((result.rollingResistanceWatts / Math.max(1, totalDragWatts)) * 100);

  return (
    <Card
      title="AERODYNAMIC &amp; ROLLING PHYSICS ENGINE"
      subtitle="Standard road/gravel power model with mechanical efficiency"
      icon={<Gauge className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
      badge={
        <span className="text-[10px] font-mono uppercase bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
          CdA {physics.cda} m² &middot; Crr {physics.crr}
        </span>
      }
      glow="cyan"
      className="col-span-1 lg:col-span-2"
    >
      {/* Top Main Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricPill
          label="Leg Output"
          value={Math.round(result.legWatts)}
          unit="W"
          subValue={`Target: ${route.targetSpeedKmH} km/h`}
          variant="emerald"
          icon={<Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
        />

        <MetricPill
          label="Total Work"
          value={Math.round(result.totalWorkKj)}
          unit="kJ"
          subValue={`Duration: ${result.movingTimeFormatted}`}
          variant="cyan"
          icon={<Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        />

        <MetricPill
          label="Caloric Burn"
          value={Math.round(result.totalKcalBurn)}
          unit="kcal"
          subValue="Gross Mech Eff: 21%"
          variant="amber"
          icon={<Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
        />

        <MetricPill
          label="Carb Oxidation"
          value={result.carbOxidationGramPerHour}
          unit="g/hr"
          subValue={`Total trip: ~${result.totalCarbsBurnedGrams}g`}
          variant="zinc"
          icon={<Flame className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />}
        />
      </div>

      {/* Power Breakdown Bar & Component Analysis */}
      <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-zinc-300 mb-2">
          <span>Resistive Force Distribution</span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            Aero: <strong className="text-cyan-600 dark:text-cyan-400">{aeroPercent}%</strong> &middot; Rolling: <strong className="text-slate-800 dark:text-zinc-200">{rollPercent}%</strong>
          </span>
        </div>

        {/* Visual segmented bar */}
        <div className="w-full h-3 bg-slate-200 dark:bg-zinc-900 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-300 dark:border-zinc-800 mb-3">
          <div
            style={{ width: `${aeroPercent}%` }}
            className="bg-cyan-500 rounded-l-full transition-all duration-300"
            title={`Aerodynamic Drag: ${Math.round(result.aerodynamicDragWatts)}W`}
          />
          <div
            style={{ width: `${rollPercent}%` }}
            className="bg-emerald-500 rounded-r-full transition-all duration-300"
            title={`Rolling Resistance: ${Math.round(result.rollingResistanceWatts)}W`}
          />
        </div>

        {/* Detailed Component Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="border border-slate-200 dark:border-zinc-800/80 rounded-lg p-2.5 bg-white dark:bg-zinc-900/40 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">Aerodynamic Drag (P_aero)</div>
            <div className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {Math.round(result.aerodynamicDragWatts)} <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">Watts</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              0.5 &times; ρ({physics.rho}) &times; CdA({physics.cda}) &times; v² &times; v
            </div>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800/80 rounded-lg p-2.5 bg-white dark:bg-zinc-900/40 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">Rolling Resistance (P_roll)</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {Math.round(result.rollingResistanceWatts)} <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">Watts</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              Crr({physics.crr}) &times; M({result.systemMassKg}kg) &times; 9.81 &times; v
            </div>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800/80 rounded-lg p-2.5 bg-white dark:bg-zinc-900/40 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">Drivetrain Loss (5%)</div>
            <div className="text-base font-bold text-slate-800 dark:text-zinc-300 mt-0.5">
              {Math.round(result.legWatts - result.wheelWatts)} <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">Watts</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              95% clean efficiency (P_wheel / 0.95)
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-grid: Mass Decomposition & Physical Coefficients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        {/* System Mass Matrix */}
        <div className="border border-slate-200 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 uppercase font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>System Mass Decomposition</span>
            </span>
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">{result.systemMassKg} kg</span>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-zinc-400 text-[11px]">
            <div className="flex justify-between">
              <span>Rider Mass:</span>
              <span className="text-slate-900 dark:text-zinc-200 font-bold">{physics.riderWeightKg} kg</span>
            </div>
            <div className="flex justify-between">
              <span>Gravel Bike:</span>
              <span className="text-slate-900 dark:text-zinc-200 font-bold">{physics.bikeWeightKg} kg</span>
            </div>
            <div className="flex justify-between">
              <span>Gear &amp; Commute Pack:</span>
              <span className="text-slate-900 dark:text-zinc-200 font-bold">{physics.gearWeightKg} kg</span>
            </div>
          </div>
        </div>

        {/* Metabolic Substrate Conversion */}
        <div className="border border-slate-200 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 uppercase font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Energy Substrate Engine</span>
            </span>
            <span className="text-amber-700 dark:text-amber-300 font-bold">21% Efficiency</span>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-zinc-400 text-[11px]">
            <div className="flex justify-between">
              <span>Mechanical Work:</span>
              <span className="text-slate-900 dark:text-zinc-200 font-bold">{Math.round(result.totalWorkKj)} kJ</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Metabolic Energy:</span>
              <span className="text-slate-900 dark:text-zinc-200 font-bold">{Math.round(result.totalKcalBurn)} kcal</span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold">
              <span>Carb Oxidation Demand:</span>
              <span>{result.carbOxidationGramPerHour} g/hr (~{result.totalCarbsBurnedGrams}g total)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
