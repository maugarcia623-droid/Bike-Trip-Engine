import React from 'react';

export type CadenceInsightTone = 'cadence' | 'emerald' | 'amber' | 'rose' | 'sky';

export interface CadenceInsightProps {
  /** Primary insight statement — what the numbers actually mean for this ride */
  headline: React.ReactNode;
  /** Optional secondary real-world context or gentle tip */
  detail?: React.ReactNode;
  /** Semantic text accent color (schedule, resupply, food, weather, alert) */
  tone?: CadenceInsightTone;
  /** Slightly tighter typography for inline or popover contexts */
  compact?: boolean;
  /** Optional right-side slot */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Understated, text-only Cadence Intelligence copy block.
 * No boxes, gradients, icons, or loud colors — just clear,
 * plain-spoken cycling insight sitting directly on the surface.
 */
export const CadenceInsight: React.FC<CadenceInsightProps> = ({
  headline,
  detail,
  compact = false,
  trailing,
  className = '',
}) => {
  return (
    <div className={`min-w-0 flex items-start justify-between gap-3 ${className}`.trim()}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={`${
            compact ? 'text-xs sm:text-[13px]' : 'text-[13px] sm:text-sm'
          } font-semibold font-rounded leading-snug tnum no-orphan text-ink`}
        >
          {headline}
        </p>
        {detail && (
          <p
            className={`${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs'
            } text-ink-secondary leading-relaxed tnum no-orphan`}
          >
            {detail}
          </p>
        )}
      </div>

      {trailing && <div className="shrink-0 self-center">{trailing}</div>}
    </div>
  );
};
