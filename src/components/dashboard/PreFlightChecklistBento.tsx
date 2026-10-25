import React, { useState } from 'react';
import { CheckSquare, Square, CheckCircle, RotateCcw, Wrench, Shield, Utensils, Briefcase } from 'lucide-react';
import { Card } from '../common/Card';
import { ChecklistItem } from '../../types/trip';

interface PreFlightChecklistBentoProps {
  checklist: ChecklistItem[];
  onToggleItem: (id: string) => void;
  onCheckAll: () => void;
  onResetAll: () => void;
}

export const PreFlightChecklistBento: React.FC<PreFlightChecklistBentoProps> = ({
  checklist,
  onToggleItem,
  onCheckAll,
  onResetAll,
}) => {
  const [filter, setFilter] = useState<'all' | 'mechanics' | 'gear' | 'nutrition' | 'logistics'>('all');

  const filteredItems = checklist.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const checkedCount = checklist.filter((c) => c.checked).length;
  const totalCount = checklist.length;
  const percent = Math.round((checkedCount / Math.max(1, totalCount)) * 100);
  const isFullyCleared = checkedCount === totalCount;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mechanics':
        return <Wrench className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'gear':
        return <Shield className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />;
      case 'nutrition':
        return <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'logistics':
        return <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <Card
      title="PRE-FLIGHT SYSTEMS CHECKLIST &middot; STATEFUL PERSISTENCE"
      subtitle="Complete before departing home base &middot; Stored locally in browser"
      icon={<CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      badge={
        <span
          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
            isFullyCleared
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
          }`}
        >
          {checkedCount} / {totalCount} ({percent}%) CLEARED
        </span>
      }
      glow={isFullyCleared ? 'emerald' : 'none'}
      className="col-span-1 lg:col-span-3"
    >
      {/* Top Filter and Progress Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-zinc-700 font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-transparent'
            }`}
          >
            All ({checklist.length})
          </button>
          <button
            onClick={() => setFilter('mechanics')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'mechanics'
                ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-transparent'
            }`}
          >
            Mechanics
          </button>
          <button
            onClick={() => setFilter('gear')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'gear'
                ? 'bg-slate-900 text-white dark:bg-zinc-700 font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-transparent'
            }`}
          >
            Kit &amp; Gear
          </button>
          <button
            onClick={() => setFilter('nutrition')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'nutrition'
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-transparent'
            }`}
          >
            Real Food Pack
          </button>
          <button
            onClick={() => setFilter('logistics')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'logistics'
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-transparent'
            }`}
          >
            Gate Logistics
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={onCheckAll}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
          >
            Check All
          </button>
          <button
            onClick={onResetAll}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-zinc-800">
        <div
          style={{ width: `${percent}%` }}
          className={`h-full transition-all duration-300 ${
            isFullyCleared ? 'bg-emerald-500' : 'bg-cyan-500'
          }`}
        />
      </div>

      {/* Interactive Checkbox List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onToggleItem(item.id)}
            className={`cursor-pointer rounded-lg p-3 border transition-all flex items-start gap-3 select-none ${
              item.checked
                ? 'bg-emerald-50/70 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-500/30 text-slate-800 dark:text-zinc-200'
                : 'bg-white dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-400 shadow-xs'
            }`}
          >
            <button
              type="button"
              className={`mt-0.5 rounded transition-colors flex-shrink-0 ${
                item.checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'
              }`}
            >
              {item.checked ? (
                <CheckCircle className="w-4 h-4 fill-emerald-500/20" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${item.checked ? 'text-slate-500 dark:text-zinc-300 line-through opacity-80' : 'text-slate-900 dark:text-zinc-100 font-medium'}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500 dark:text-zinc-500 uppercase">
                <span className="flex items-center gap-1">
                  {getCategoryIcon(item.category)}
                  {item.category}
                </span>
                {item.critical && (
                  <span className="text-amber-600 dark:text-amber-500 font-bold">&middot; CRITICAL</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
