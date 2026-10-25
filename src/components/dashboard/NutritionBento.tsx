import React from 'react';
import { Utensils, ShieldCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { getRealFoodNutritionPlan } from '../../utils/nutrition';
import { OfficeConstraints } from '../../types/trip';

interface NutritionBentoProps {
  office: OfficeConstraints;
  hardDepartureTime: string;
}

export const NutritionBento: React.FC<NutritionBentoProps> = ({
  office,
  hardDepartureTime,
}) => {
  const nutritionPhases = getRealFoodNutritionPlan(
    office.targetGateArrivalTime || '08:30',
    '08:50',
    hardDepartureTime
  );

  // Compute total macros across all 4 phases
  const totalMacros = nutritionPhases.reduce(
    (acc, phase) => {
      phase.items.forEach((item) => {
        acc.carbs += item.carbsGrams;
        acc.protein += item.proteinGrams;
        acc.fats += item.fatsGrams;
        acc.kcals += item.kcals;
      });
      return acc;
    },
    { carbs: 0, protein: 0, fats: 0, kcals: 0 }
  );

  return (
    <Card
      title="REAL-FOOD NUTRITION ENGINE &middot; ZERO INDUSTRIAL COMPROMISE"
      subtitle="Whole food glycogen fueling &middot; Strict desk policy alignment"
      icon={<Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      badge={
        <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
          NO POWDERS &middot; NO MILK &middot; NO BANANAS
        </span>
      }
      glow="emerald"
      className="col-span-1 lg:col-span-3"
    >
      {/* Real-Food Guarantee Header Strip */}
      <div className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                100% REAL-FOOD FUELING ENGINE
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                VERIFIED ZERO POWDER
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              Engineered exclusively with natural fructose, complex beta-glucans, honey, dates, skyr, and sourdough starch.
            </p>
          </div>
        </div>

        {/* Global Macro Sums */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Total Carbs</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalMacros.carbs}g</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Protein</span>
            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{totalMacros.protein}g</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Fats</span>
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-300">{totalMacros.fats}g</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase">Total Fuel</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{totalMacros.kcals} kcal</span>
          </div>
        </div>
      </div>

      {/* 4 Nutrition Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {nutritionPhases.map((phase) => {
          const phaseCarbs = phase.items.reduce((s, i) => s + i.carbsGrams, 0);
          const phaseProtein = phase.items.reduce((s, i) => s + i.proteinGrams, 0);
          const phaseKcals = phase.items.reduce((s, i) => s + i.kcals, 0);

          return (
            <div
              key={phase.phaseId}
              className="bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div>
                {/* Phase Title & Window */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white truncate">
                    {phase.title}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {phase.timeWindow.split('–')[0].trim()}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mb-2 truncate">
                  Loc: <span className="text-slate-800 dark:text-zinc-300 font-semibold">{phase.location}</span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mb-3 italic leading-relaxed">
                  {phase.rules}
                </p>

                {/* Items Manifest */}
                <div className="space-y-2 mb-4 border-t border-slate-200 dark:border-zinc-800/80 pt-2.5">
                  {phase.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-lg p-2 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900 dark:text-zinc-200 text-xs">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                        Qty: {item.quantity}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                        <span>{item.carbsGrams}g C</span>
                        <span className="text-slate-300 dark:text-zinc-500">&middot;</span>
                        <span className="text-cyan-700 dark:text-cyan-400">{item.proteinGrams}g P</span>
                        <span className="text-slate-300 dark:text-zinc-500">&middot;</span>
                        <span className="text-amber-700 dark:text-amber-400">{item.kcals} kcal</span>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 italic">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase Footer Summary */}
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                <span>Phase Macro:</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  {phaseCarbs}g C &middot; {phaseProtein}g P &middot; {phaseKcals} kcal
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
