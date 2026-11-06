import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface MetricPillProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  variant?: 'volt' | 'lime' | 'amber' | 'red' | 'emerald' | 'cyan' | 'zinc';
  icon?: React.ReactNode;
  tooltip?: string;
  infoTitle?: string;
  infoContent?: string;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  unit,
  subValue,
  variant = 'zinc',
  icon,
  tooltip,
  infoTitle,
  infoContent,
}) => {
  const isVoltHero = variant === 'volt' || variant === 'emerald';
  const isAmber = variant === 'amber';
  const isRed = variant === 'red';

  const containerStyle = isVoltHero
    ? 'bg-volt dark:bg-pod text-[#111111] dark:text-ink'
    : 'bg-pod text-ink';

  const dotColor = isVoltHero
    ? 'bg-[#111111] dark:bg-volt dark:shadow-beacon-volt'
    : isAmber
    ? 'bg-beacon-amber dark:shadow-beacon-amber'
    : isRed
    ? 'bg-beacon-red dark:shadow-beacon-red'
    : 'bg-ink-muted/60';

  const valueColor = isVoltHero
    ? 'text-[#111111] dark:text-ink'
    : isRed
    ? 'text-beacon-orange dark:text-beacon-red'
    : 'text-ink';

  const mutedTextColor = isVoltHero
    ? 'text-[#111111]/70 dark:text-ink-muted'
    : 'text-ink-muted';

  return (
    <div
      title={tooltip}
      className={`rounded-pod p-4 sm:p-5 flex flex-col justify-between transition-colors group relative ${containerStyle}`}
    >
      <div className={`flex items-center justify-between gap-2 text-xs font-medium ${mutedTextColor}`}>
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="break-words leading-tight">{label}</span>
          {infoContent && (
            <InfoTooltip
              title={infoTitle || label}
              content={infoContent}
              size="sm"
              iconClassName={
                isVoltHero
                  ? 'text-[#111111]/70 dark:text-ink-muted hover:text-[#111111] dark:hover:text-volt'
                  : undefined
              }
            />
          )}
        </span>
        {icon && <span className="opacity-80 shrink-0">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl sm:text-3xl font-semibold tracking-tight tnum ${valueColor}`}>
            {value}
          </span>
          {unit && <span className={`text-xs font-medium ${mutedTextColor}`}>{unit}</span>}
        </div>
        {subValue && (
          <span className={`text-xs font-medium tnum break-words leading-tight text-right ${mutedTextColor}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
