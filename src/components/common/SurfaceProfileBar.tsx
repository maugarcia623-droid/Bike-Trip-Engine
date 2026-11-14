import React, { useState } from 'react';
import { SurfaceBreakdown, SurfaceSegment } from '../../types/trip';
import { SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from './Badge';
import { CheckCircle2, TriangleAlert, Info, ShieldCheck, RefreshCw, LoaderCircle } from '../icons';

/* ──────────────────────────────────────────────────────────────────────────────
 * Road surfaces & tire suitability — coloured flat design
 * One route-ordered track (where), one 3-column legend (how much), one sector
 * readout (what it means). No nested surfaces beyond the bar track (bg-chip).
 * ────────────────────────────────────────────────────────────────────────────── */

interface SurfaceProfileBarProps {
  breakdown: SurfaceBreakdown;
  activeSegmentId?: string | null;
  onSelectSegment?: (segment: SurfaceSegment | null) => void;
  onRefreshOsm?: () => void;
  compact?: boolean;
  /** Render without its own pod surface/padding (when already placed on a pod). */
  bare?: boolean;
  className?: string;
}

const EYEBROW = 'text-[10px] font-rounded font-bold uppercase tracking-[0.14em] text-ink-muted';

export const SurfaceProfileBar: React.FC<SurfaceProfileBarProps> = ({
  breakdown,
  activeSegmentId,
  onSelectSegment,
  onRefreshOsm,
  compact = false,
  bare = false,
  className = '',
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [internalSegmentId, setInternalSegmentId] = useState<string | null>(null);

  const effectiveSegmentId = activeSegmentId !== undefined ? activeSegmentId : internalSegmentId;

  const unpavedSegments = breakdown.segments.filter((s) => s.type !== 'paved');
  const highlighted =
    breakdown.segments.find((s) => s.id === effectiveSegmentId) ??
    unpavedSegments.find((s) => s.suitability38c === 'caution') ??
    unpavedSegments[0] ??
    breakdown.segments[0];

  const handleSegmentInteract = (seg: SurfaceSegment | null) => {
    setInternalSegmentId(seg ? seg.id : null);
    onSelectSegment?.(seg);
  };

  const { suitability } = breakdown;
  const num = (v: number, d = 1) => (isFr ? v.toFixed(d).replace('.', ',') : v.toFixed(d));
  const pct = (v: number) => (isFr ? `${v}\u00A0%` : `${v}%`);
  const tireLabel = `${suitability.tireWidthMm}c ${
    suitability.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tubes'
  }`;

  const totalKm = breakdown.pavedKm + breakdown.gravelKm + breakdown.singletrackKm;
  const composition = [
    { type: 'paved' as const, pct: breakdown.pavedPct, km: breakdown.pavedKm },
    { type: 'gravel' as const, pct: breakdown.gravelPct, km: breakdown.gravelKm },
    { type: 'singletrack' as const, pct: breakdown.singletrackPct, km: breakdown.singletrackKm },
  ];

  const fitTheme =
    suitability.overallLevel === 'ideal'
      ? 'emerald'
      : suitability.overallLevel === 'good-with-care'
      ? 'amber'
      : 'rose';

  const verdictCopy =
    suitability.overallLevel === 'ideal'
      ? isFr
        ? 'Parfait pour ce parcours.'
        : 'A perfect match for this route.'
      : suitability.overallLevel === 'good-with-care'
      ? isFr
        ? 'Passe partout — prudence sur les secteurs techniques.'
        : 'Will cope — take care on technical sectors.'
      : isFr
      ? 'Secteurs trop techniques — envisagez des pneus plus larges.'
      : 'Too technical in places — consider going wider.';

  const sectorTheme =
    highlighted?.suitability38c === 'ideal'
      ? 'emerald'
      : highlighted?.suitability38c === 'capable'
      ? 'amber'
      : 'rose';

  return (
    <div className={`${bare ? '' : 'rounded-pod bg-pod p-3.5'} ${className}`}>
      {/* ── Tire verdict ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={EYEBROW}>{isFr ? 'Vos pneus' : 'Your tires'}</p>
          <p className="mt-1 text-[15px] font-rounded font-bold text-ink leading-tight">{tireLabel}</p>
          <p className="mt-0.5 text-[11px] font-body text-ink-secondary leading-snug">{verdictCopy}</p>
        </div>
        <Badge
          variant={fitTheme}
          size="sm"
          icon={suitability.overallLevel === 'ideal' ? ShieldCheck : TriangleAlert}
          className="tnum shrink-0"
        >
          {pct(suitability.scorePct)} {isFr ? 'adapté' : 'fit'}
        </Badge>
      </div>

      {/* ── Route-ordered surface track (where) ── */}
      <div className="mt-4">
        <div
          className="relative h-6 w-full rounded-full bg-chip p-[3px] flex items-stretch gap-[2px]"
          onMouseLeave={() => {
            if (activeSegmentId === undefined) setInternalSegmentId(null);
          }}
        >
          {breakdown.segments.map((seg) => {
            const meta = SURFACE_VISUAL_META[seg.type];
            const widthPct = Math.max(3, seg.endPct - seg.startPct);
            const isSelected = highlighted?.id === seg.id;
            return (
              <button
                key={seg.id}
                type="button"
                style={{ width: `${widthPct}%` }}
                onMouseEnter={() => handleSegmentInteract(seg)}
                onClick={() => handleSegmentInteract(effectiveSegmentId === seg.id ? null : seg)}
                title={`${isFr ? seg.nameFr : seg.nameEn} (km ${seg.startKm}–${seg.endKm})`}
                aria-label={`${isFr ? meta.shortLabelFr : meta.shortLabelEn} · km ${seg.startKm}–${seg.endKm}`}
                aria-pressed={isSelected}
                className={`relative h-full min-w-[6px] rounded-full cursor-pointer ring-2 ring-inset transition-shadow ${
                  meta.barBgClass
                } ${seg.type !== 'paved' ? 'paint-hatch' : ''} ${isSelected ? 'ring-ink' : 'ring-transparent'}`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-rounded font-semibold text-ink-muted tnum">
          <span>0 km</span>
          <span>{isFr ? 'Touchez un secteur' : 'Tap a sector'}</span>
          <span>{num(totalKm)} km</span>
        </div>
      </div>

      {/* ── Legend (how much) ── */}
      <dl className="mt-3 grid grid-cols-3 divide-x divide-ink/10">
        {composition.map((item, i) => {
          const meta = SURFACE_VISUAL_META[item.type];
          const empty = item.km <= 0.05;
          return (
            <div key={item.type} className={`${i === 0 ? 'pr-2.5' : 'px-2.5'} min-w-0 ${empty ? 'opacity-50' : ''}`}>
              <dt className="flex items-center gap-1.5 text-[10px] font-rounded font-bold text-ink-secondary">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.barBgClass} ${
                    item.type !== 'paved' ? 'paint-hatch' : ''
                  }`}
                />
                <span className="truncate">{isFr ? meta.shortLabelFr : meta.shortLabelEn}</span>
              </dt>
              <dd className="mt-1 text-[15px] leading-none font-rounded font-bold text-ink tnum whitespace-nowrap">
                {pct(item.pct)}
              </dd>
              <dd className="mt-0.5 text-[10px] font-rounded font-semibold text-ink-muted tnum">{num(item.km)} km</dd>
            </div>
          );
        })}
      </dl>

      {/* ── Selected sector (what it means) ── */}
      {!compact && highlighted && (
        <>
          <div className="lane-divider my-3.5" aria-hidden="true" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={EYEBROW}>
                {isFr ? 'Secteur' : 'Sector'} · km {highlighted.startKm}–{highlighted.endKm}
              </p>
              <p className="mt-1 text-[13px] font-rounded font-bold text-ink leading-snug break-words">
                {isFr ? highlighted.nameFr : highlighted.nameEn}
              </p>
            </div>
            <Badge
              variant={sectorTheme}
              size="xs"
              icon={
                highlighted.suitability38c === 'ideal'
                  ? CheckCircle2
                  : highlighted.suitability38c === 'capable'
                  ? Info
                  : TriangleAlert
              }
              className="shrink-0"
            >
              {highlighted.suitability38c === 'ideal'
                ? isFr
                  ? 'Idéal'
                  : 'Ideal'
                : highlighted.suitability38c === 'capable'
                ? isFr
                  ? 'Adapté'
                  : 'Capable'
                : isFr
                ? 'Technique'
                : 'Technical'}
            </Badge>
          </div>

          <p className="mt-1.5 text-[11px] font-body text-ink-secondary leading-relaxed">
            <span className="font-semibold text-ink">
              {isFr ? highlighted.surfaceDetailFr : highlighted.surfaceDetailEn}
            </span>{' '}
            — {isFr ? highlighted.riderNoteFr : highlighted.riderNoteEn}
          </p>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-ink/10">
            {[
              {
                l: isFr ? 'Pression AV/AR' : 'Pressure F/R',
                v: `${num(suitability.recommendedFrontBar)}/${num(suitability.recommendedRearBar)}`,
                u: 'bar',
              },
              { l: 'Crr', v: highlighted.effectiveCrr.toFixed(4), u: '' },
              { l: isFr ? 'Pente max' : 'Max grade', v: pct(highlighted.maxGradePct), u: '' },
            ].map((s, i) => (
              <div key={s.l} className={`${i === 0 ? 'pr-2.5' : 'px-2.5'} min-w-0`}>
                <dt className="text-[10px] font-rounded font-semibold text-ink-muted truncate">{s.l}</dt>
                <dd className="mt-0.5 text-[13px] font-rounded font-bold text-ink tnum whitespace-nowrap">
                  {s.v}
                  {s.u && <span className="ml-0.5 text-[10px] font-semibold text-ink-muted">{s.u}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {/* ── Data source footnote ── */}
      <div className="mt-3.5 flex items-center gap-1.5 text-[10px] font-rounded font-semibold text-ink-muted tnum">
        {breakdown.isLoadingOsm ? (
          <>
            <LoaderCircle className="w-3 h-3 animate-spin" />
            <span>{isFr ? 'Analyse des routes…' : 'Checking road surfaces…'}</span>
          </>
        ) : breakdown.dataSource === 'osm-overpass' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {isFr ? 'Carte vérifiée' : 'Verified map'} · {pct(breakdown.osmCoveragePct ?? 100)}
            </span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-ink/30" />
            <span title={breakdown.osmError || undefined}>
              {isFr ? 'Estimé selon le type de parcours' : 'Estimated from route geometry'}
            </span>
          </>
        )}
        {onRefreshOsm && !breakdown.isLoadingOsm && (
          <button
            type="button"
            onClick={onRefreshOsm}
            className="ml-auto inline-flex items-center gap-1 min-h-[28px] px-1.5 rounded-full text-ink-secondary hover:text-ink cursor-pointer transition-colors"
            title={isFr ? 'Actualiser les surfaces de la carte' : 'Refresh road surface details'}
          >
            <RefreshCw className="w-3 h-3" />
            {isFr ? 'Actualiser' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
};
