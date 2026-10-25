import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  glow?: 'emerald' | 'amber' | 'cyan' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  badge,
  action,
  icon,
  glow = 'none',
}) => {
  const glowClasses = {
    emerald: 'hover:border-emerald-500/50 hover:shadow-glow-emerald',
    amber: 'hover:border-amber-500/50 hover:shadow-glow-amber',
    cyan: 'hover:border-cyan-500/50 hover:shadow-glow-cyan',
    none: 'hover:border-slate-300 dark:hover:border-zinc-700',
  }[glow];

  return (
    <div
      className={`bento-card bg-white dark:bg-[#121215]/90 border border-slate-200 dark:border-zinc-800/90 rounded-xl p-6 transition-all duration-200 relative overflow-hidden flex flex-col shadow-sm dark:shadow-none text-slate-900 dark:text-zinc-100 ${glowClasses} ${className}`}
    >
      {(title || action || icon || badge) && (
        <div className="flex items-start justify-between gap-3 mb-5 border-b border-slate-100 dark:border-zinc-800/60 pb-3.5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                {title && (
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-700 dark:text-zinc-300">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-zinc-500 font-sans mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
