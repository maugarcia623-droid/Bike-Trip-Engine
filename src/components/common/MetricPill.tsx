import React from 'react';

interface MetricPillProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  variant?: 'emerald' | 'amber' | 'cyan' | 'zinc';
  icon?: React.ReactNode;
  tooltip?: string;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  unit,
  subValue,
  variant = 'zinc',
  icon,
  tooltip,
}) => {
  const variantStyles = {
    emerald: 'border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400',
    cyan: 'border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-400',
    zinc: 'border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 text-slate-800 dark:text-zinc-300',
  }[variant];

  const valueColor = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    cyan: 'text-cyan-700 dark:text-cyan-300',
    zinc: 'text-slate-900 dark:text-white',
  }[variant];

  return (
    <div
      title={tooltip}
      className={`border rounded-xl p-3.5 flex flex-col justify-between transition-all group relative ${variantStyles}`}
    >
      <div className="flex items-center justify-between gap-1 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        <span>{label}</span>
        {icon && <span className="opacity-75">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`text-xl font-mono font-bold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-500 dark:text-zinc-500">{unit}</span>}
      </div>
      {subValue && (
        <div className="mt-1 text-xs font-mono text-slate-500 dark:text-zinc-500 truncate">
          {subValue}
        </div>
      )}
    </div>
  );
};
