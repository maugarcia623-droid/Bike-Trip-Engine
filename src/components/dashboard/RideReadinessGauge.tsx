import React from 'react';
import type { ReadinessActionKind, ReadinessLevel, RideReadiness } from '../../utils/rideReadiness';
import { ArrowRight, ChevronDown, OctagonX, Eye, CircleDashedCheck } from '@/components/icons';

// ── Geometry ──────────────────────────────────────────────────────────────────
// Angles are "clock" degrees: 0° = 12 o'clock, increasing clockwise.
// Three 68° segments with 28° gaps (round caps eat ~7.5° each side), leaving a
// 100° opening at the bottom where the status bubble sits — matching the mock.
const VB = 120;
const C = VB / 2;
const R = 46;
const STROKE = 12;
const SEGMENTS: Array<{ level: ReadinessLevel; start: number; end: number; lo: number; hi: number }> = [
  { level: 'needs-change', start: 230, end: 298, lo: 0, hi: 44 },
  { level: 'worth-tweak', start: 326, end: 394, lo: 45, hi: 74 },
  { level: 'good-to-go', start: 422, end: 490, lo: 75, hi: 100 },
];

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [C + R * Math.sin(rad), C - R * Math.cos(rad)];
}

function arcPath(start: number, end: number): string {
  const [x0, y0] = polar(start);
  const [x1, y1] = polar(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Knob angle: position within the active level's segment, proportional to score. */
export function readinessKnobAngle(score: number): number {
  const seg = SEGMENTS.find((s) => score <= s.hi) ?? SEGMENTS[SEGMENTS.length - 1];
  const t = Math.min(1, Math.max(0, (score - seg.lo) / Math.max(1, seg.hi - seg.lo)));
  return seg.start + t * (seg.end - seg.start);
}

// ── Level tokens (full literal class strings so Tailwind picks them up) ──────
export const READINESS_TOKENS: Record<
  ReadinessLevel,
  { segment: string; knob: string; bubble: string; glyph: string; dot: string; bar: string }
> = {
  'needs-change': {
    segment: 'stroke-rose-400 dark:stroke-rose-500',
    knob: 'fill-rose-800 dark:fill-rose-950',
    bubble: 'bg-rose-400 dark:bg-rose-500',
    glyph: 'text-rose-950',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  'worth-tweak': {
    segment: 'stroke-amber-300 dark:stroke-amber-400',
    knob: 'fill-amber-600 dark:fill-amber-950',
    bubble: 'bg-amber-300 dark:bg-amber-400',
    glyph: 'text-amber-900 dark:text-amber-950',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  'good-to-go': {
    segment: 'stroke-emerald-500 dark:stroke-emerald-400',
    knob: 'fill-emerald-900 dark:fill-emerald-950',
    bubble: 'bg-emerald-500 dark:bg-emerald-400',
    glyph: 'text-white dark:text-emerald-950',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
  },
};

const StatusGlyph: React.FC<{ level: ReadinessLevel; className?: string }> = ({ level, className }) => {
  if (level === 'needs-change') return <OctagonX className={className} aria-hidden="true" />;
  if (level === 'worth-tweak') return <Eye className={className} aria-hidden="true" />;
  return <CircleDashedCheck className={className} aria-hidden="true" />;
};

// ── Gauge ────────────────────────────────────────────────────────────────────
export interface ReadinessGaugeProps {
  score: number;
  level: ReadinessLevel;
  label: string;
  /** Rendered pixel size (square). */
  size?: number;
  /** Whether to show the status icon bubble at the bottom of the ring. */
  showIcon?: boolean;
  className?: string;
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({
  score,
  level,
  label,
  size = 112,
  showIcon = true,
  className = '',
}) => {
  const tokens = READINESS_TOKENS[level];
  const target = readinessKnobAngle(score);

  // One-shot entrance sweep: knob starts at the gauge origin and glides to its score.
  const [angle, setAngle] = React.useState(SEGMENTS[0].start);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setAngle(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const scale = size / VB;
  const bubble = Math.round(26 * Math.max(0.85, scale));
  const bubbleTop = (C + R) * scale - bubble / 2;
  const fontSize = Math.round((score >= 100 ? 28 : 32) * scale);

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-valuetext={`${score} / 100 · ${label}`}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        shapeRendering="geometricPrecision"
        className="absolute inset-0"
        aria-hidden="true"
      >
        {SEGMENTS.map((seg) => (
          <path
            key={seg.level}
            d={arcPath(seg.start, seg.end)}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={`transition-colors duration-300 ${
              seg.level === level ? tokens.segment : 'stroke-chip dark:stroke-white/10'
            }`}
          />
        ))}
        <g
          className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' }}
        >
          <circle cx={C} cy={C - R} r={7.5} className={`transition-colors duration-300 ${tokens.knob}`} />
        </g>
      </svg>

      <span
        className="absolute inset-x-0 text-center font-rounded font-bold tracking-tight tnum text-ink leading-none"
        style={{ top: showIcon ? C * scale - fontSize * 0.58 : C * scale - fontSize * 0.5, fontSize }}
      >
        {score}
      </span>

      {showIcon && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center ${tokens.bubble}`}
          style={{ top: bubbleTop, width: bubble, height: bubble }}
        >
          <StatusGlyph level={level} className={`w-[62%] h-[62%] ${tokens.glyph}`} />
        </span>
      )}
    </div>
  );
};

// ── Panel (lives in the Ride Brief top row) ──────────────────────────────────
export interface RideReadinessPanelProps {
  readiness: RideReadiness;
  isFr: boolean;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  breakdownId: string;
  activeAction?: ReadinessActionKind | null;
  onTriggerAction?: (action: ReadinessActionKind) => void;
  actionCardId?: string;
}

export const RideReadinessPanel: React.FC<RideReadinessPanelProps> = ({
  readiness,
  isFr,
  showBreakdown,
  onToggleBreakdown,
  breakdownId,
  activeAction,
  onTriggerAction,
  actionCardId,
}) => {
  const topLift = readiness.topLift;
  const isTopActionOpen = Boolean(topLift && activeAction === topLift.action);

  return (
    <div
      data-testid="ride-readiness-panel"
      className="w-full py-1 flex items-center gap-3.5 min-w-0"
    >
      <ReadinessGauge
        score={readiness.score}
        level={readiness.level}
        label={readiness.label}
        size={104}
      />
      <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
        <span className="text-[12px] font-medium text-ink-muted font-body leading-tight">
          {isFr ? 'Prêt à partir' : 'Ride readiness'}
        </span>
        <span className="text-[19px] font-bold font-rounded tracking-tight text-ink leading-tight">
          {readiness.label}
        </span>
        <p className="text-xs font-medium text-ink-secondary font-body leading-snug">
          {topLift ? (
            <>
              {topLift.tip}{' '}
              <span className="font-rounded font-bold text-ink tnum whitespace-nowrap">
                +{topLift.gain}
              </span>
            </>
          ) : (
            readiness.summary
          )}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1">
          {topLift && onTriggerAction && (
            <button
              type="button"
              data-testid="readiness-top-cta"
              onClick={() => onTriggerAction(topLift.action)}
              aria-expanded={isTopActionOpen}
              aria-controls={actionCardId}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 sm:py-1 min-h-[34px] sm:min-h-0 text-[12px] font-bold font-rounded transition-all cursor-pointer active:scale-[0.98] ${
                isTopActionOpen
                  ? 'bg-ink text-ink-inverse shadow-xs'
                  : 'bg-volt text-[#111111] ring-1 ring-inset ring-[#a3b300]/70 hover:brightness-105'
              }`}
            >
              <span>{topLift.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleBreakdown}
            aria-expanded={showBreakdown}
            aria-controls={breakdownId}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 min-h-[34px] sm:min-h-0 text-[12px] font-semibold font-rounded text-ink-secondary hover:text-ink hover:bg-chip transition-colors cursor-pointer active:scale-[0.98]"
          >
            {isFr ? 'Détail du score' : 'Why this score'}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Breakdown strip (full width under the top row) ───────────────────────────
function levelForSubScore(score: number): ReadinessLevel {
  return score >= 75 ? 'good-to-go' : score >= 45 ? 'worth-tweak' : 'needs-change';
}

export const RideReadinessBreakdown: React.FC<{
  readiness: RideReadiness;
  isFr: boolean;
  activeAction?: ReadinessActionKind | null;
  onTriggerAction?: (action: ReadinessActionKind) => void;
}> = ({ readiness, isFr, activeAction, onTriggerAction }) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex overflow-x-auto gap-2.5 pb-1 no-scrollbar snap-x">
      {readiness.factors.map((f) => {
        const tone = READINESS_TOKENS[levelForSubScore(f.score)];
        const lost = Math.round(f.pointsLost);
        const canAct = Boolean(f.applicable && f.action && f.ctaLabel && lost >= 1 && onTriggerAction);
        const isOpen = Boolean(canAct && activeAction === f.action);
        return (
          <div
            key={f.id}
            className={`w-[164px] shrink-0 snap-start rounded-pod bg-pod p-3 flex flex-col justify-between gap-1.5 transition-shadow ${
              isOpen ? 'ring-2 ring-inset ring-volt' : ''
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold font-rounded text-ink-secondary truncate">{f.label}</span>
                <span className="text-[14px] font-bold font-rounded text-ink tnum shrink-0">
                  {f.applicable ? f.score : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-chip dark:bg-white/10 overflow-hidden" aria-hidden="true">
                {f.applicable && (
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(4, f.score)}%` }} />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-muted font-body leading-snug line-clamp-2">
                  {f.note}
                </span>
                {f.applicable && lost >= 1 && (
                  <span className="text-[11px] font-bold font-rounded text-ink-muted tnum shrink-0">
                    −{lost}
                  </span>
                )}
              </div>
            </div>
            {canAct && f.action && f.ctaLabel && onTriggerAction && (
              <button
                type="button"
                onClick={() => onTriggerAction(f.action!)}
                className="mt-1 -mx-1 px-2 py-1 rounded-full bg-card hover:bg-chip text-[11px] font-bold font-rounded text-ink inline-flex items-center justify-between gap-1 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <span className="truncate">{f.ctaLabel}</span>
                <ArrowRight className="w-3 h-3 shrink-0 text-ink-muted" />
              </button>
            )}
          </div>
        );
      })}
    </div>
    <p className="text-[11px] font-medium text-ink-muted font-body leading-snug">
      {readiness.capReason ? `${readiness.capReason}. ` : ''}
      {isFr
        ? 'Pondération : météo 25 · vélo & terrain 20 · effort 20 · check-list 15 · lumière 10 · arrêts 10. 75+ prêt à rouler, 45–74 à ajuster.'
        : 'Weighted: weather 25 · bike & terrain 20 · effort 20 · checklist 15 · daylight 10 · stops 10. 75+ is good to go, 45–74 worth a tweak.'}
    </p>
  </div>
);
