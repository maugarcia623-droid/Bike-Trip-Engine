import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  glow?: 'emerald' | 'amber' | 'cyan' | 'volt' | 'red' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  badge,
  action,
  icon,
}) => {
  return (
    <div
      className={`bento-card bg-card text-ink rounded-card p-4 transition-colors duration-200 relative overflow-hidden flex flex-col ${className}`}
    >
      {(title || action || icon || badge) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-full bg-pod flex items-center justify-center text-ink shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[13px] text-ink-muted mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {(badge || action) && (
            <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
              {badge}
              {action}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
