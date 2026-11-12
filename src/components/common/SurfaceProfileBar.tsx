import React, { useState } from 'react';
import { SurfaceBreakdown, SurfaceSegment } from '../../types/trip';
import { SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useTranslation } from '../../context/LanguageContext';
import {
  CheckCircle2,
  TriangleAlert,
  Info,
  Gauge,
  Compass,
  ShieldCheck,
  RefreshCw,
  LoaderCircle,
  Map as MapIcon,
} from '../icons';

interface SurfaceProfileBarProps {
  breakdown: SurfaceBreakdown;
  activeSegmentId?: string | null;
  onSelectSegment?: (segment: SurfaceSegment | null) => void;
  onRefreshOsm?: () => void;
  compact?: boolean;
  className?: string;
}

export const SurfaceProfileBar: React.FC<SurfaceProfileBarProps> = ({
  breakdown,
  activeSegmentId,
  onSelectSegment,
  onRefreshOsm,
  compact = false,
  className = '',
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [internalSegmentId, setInternalSegmentId] = useState<string | null>(null);
  const [showAllUnpaved, setShowAllUnpaved] = useState<boolean>(false);

  const effectiveSegmentId =
    activeSegmentId !== undefined ? activeSegmentId : internalSegmentId;

  const unpavedSegments = breakdown.segments.filter((s) => s.type !== 'paved');
  const defaultHighlightedSegment =
    breakdown.segments.find((s) => s.id === effectiveSegmentId) ??
    unpavedSegments.find((s) => s.suitability38c === 'caution') ??
    unpavedSegments[0] ??
    breakdown.segments[0];

  const handleSegmentInteract = (seg: SurfaceSegment | null) => {
    setInternalSegmentId(seg ? seg.id : null);
    onSelectSegment?.(seg);
  };

  const { suitability } = breakdown;

  const suitabilityBadgeTone =
    suitability.overallLevel === 'ideal'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
      : suitability.overallLevel === 'good-with-care'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30'
      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30';

  const formatBar = (val: number) =>
    isFr ? String(val.toFixed(1)).replace('.', ',') : val.toFixed(1);

  return (
    <div
      className={`rounded-pod bg-pod/90 dark:bg-white/[0.04] p-3 ring-1 ring-inset ring-ink/8 dark:ring-white/10 ${className}`}
    >
      {/* Top Row: Title + 38c Gravel Suitability Verdict Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-rounded font-bold text-ink">
            {isFr
              ? 'Profil des surfaces & compatibilité pneus'
              : 'Road surfaces & tire suitability'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {breakdown.isLoadingOsm ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-rounded font-semibold bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/25">
              <LoaderCircle className="w-3 h-3 animate-spin" />
              <span>{isFr ? 'Analyse des routes…' : 'Checking road surfaces…'}</span>
            </span>
          ) : breakdown.dataSource === 'osm-overpass' ? (
            <span
              title={
                isFr
                  ? `Données cartographiques : ${breakdown.osmWayCount ?? 0} tronçons · ${breakdown.osmCoveragePct ?? 100}% du tracé couvert`
                  : `Map coverage: ${breakdown.osmWayCount ?? 0} road segments · ${breakdown.osmCoveragePct ?? 100}% mapped`
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-rounded font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25 tnum"
            >
              <MapIcon className="w-3 h-3 shrink-0" />
              <span>
                {isFr ? 'Carte vérifiée' : 'Verified map'} · {breakdown.osmCoveragePct ?? 100}%
              </span>
              {onRefreshOsm && (
                <button
                  type="button"
                  onClick={onRefreshOsm}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  title={
                    isFr
                      ? 'Actualiser les surfaces de la carte'
                      : 'Refresh road surface details'
                  }
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ) : (
            <span
              title={
                breakdown.osmError ||
                (isFr
                  ? 'Estimation des surfaces basée sur le type de parcours'
                  : 'Estimated surface breakdown from route geometry')
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-rounded font-semibold bg-ink/5 dark:bg-white/10 text-ink-muted ring-1 ring-inset ring-ink/10 dark:ring-white/15"
            >
              <span>{isFr ? 'Estimation' : 'Estimated'}</span>
              {onRefreshOsm && (
                <button
                  type="button"
                  onClick={onRefreshOsm}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-ink/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
                  title={
                    isFr
                      ? 'Vérifier les surfaces sur la carte'
                      : 'Check road surface data'
                  }
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rounded font-bold tnum ${suitabilityBadgeTone}`}
          >
            {suitability.overallLevel === 'ideal' ? (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {suitability.tireWidthMm}c{' '}
              {suitability.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tube'} ·{' '}
              {suitability.scorePct}%
            </span>
          </span>
        </div>
      </div>

      {/* 3-Category Breakdown Summary Pills (e.g. 72% Paved Road, 22% Unpaved/Gravel, 6% Path/Singletrack) */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {(
          [
            {
              type: 'paved' as const,
              pct: breakdown.pavedPct,
              km: breakdown.pavedKm,
            },
            {
              type: 'gravel' as const,
              pct: breakdown.gravelPct,
              km: breakdown.gravelKm,
            },
            {
              type: 'singletrack' as const,
              pct: breakdown.singletrackPct,
              km: breakdown.singletrackKm,
            },
          ] as const
        ).map((item) => {
          const meta = SURFACE_VISUAL_META[item.type];
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                const firstOfType = breakdown.segments.find(
                  (s) => s.type === item.type
                );
                if (firstOfType) handleSegmentInteract(firstOfType);
              }}
              className="flex flex-col justify-between rounded-sub-pod bg-card/85 dark:bg-black/30 px-2.5 py-1.5 text-left ring-1 ring-inset ring-ink/6 dark:ring-white/10 hover:ring-ink/20 dark:hover:ring-white/25 transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${meta.dotBgClass}`}
                  />
                  <span className="text-[11px] font-rounded font-semibold text-ink-secondary truncate">
                    {isFr ? meta.labelFr : meta.labelEn}
                  </span>
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <span
                  className={`text-sm sm:text-base font-rounded font-extrabold tnum ${meta.textClass}`}
                >
                  {item.pct}%
                </span>
                <span className="text-[11px] text-ink-muted tnum">
                  {item.km} km
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Route-Ordered Surface Timeline Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-rounded font-semibold text-ink-muted tnum px-0.5">
          <span>0 km</span>
          <span className="uppercase tracking-wider">
            {isFr
              ? 'Survolez ou cliquez un secteur pour localiser sur la carte'
              : 'Hover or tap a sector to highlight on map'}
          </span>
          <span>
            {(
              breakdown.pavedKm +
              breakdown.gravelKm +
              breakdown.singletrackKm
            ).toFixed(1)}{' '}
            km
          </span>
        </div>

        <div
          className="relative h-4 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10 p-0.5 flex items-stretch gap-0.5"
          onMouseLeave={() => {
            if (activeSegmentId === undefined) {
              setInternalSegmentId(null);
            }
          }}
        >
          {breakdown.segments.map((seg) => {
            const meta = SURFACE_VISUAL_META[seg.type];
            const widthPct = Math.max(4, seg.endPct - seg.startPct);
            const isSelected = defaultHighlightedSegment?.id === seg.id;

            return (
              <button
                key={seg.id}
                type="button"
                style={{ width: `${widthPct}%` }}
                onMouseEnter={() => handleSegmentInteract(seg)}
                onClick={() =>
                  handleSegmentInteract(
                    effectiveSegmentId === seg.id ? null : seg
                  )
                }
                title={`${isFr ? seg.nameFr : seg.nameEn} (km ${seg.startKm}–${seg.endKm})`}
                className={`relative h-full first:rounded-l-full last:rounded-r-full transition-opacity cursor-pointer ${
                  meta.barBgClass
                } ${
                  isSelected
                    ? 'ring-2 ring-inset ring-white dark:ring-volt-lime opacity-100'
                    : 'opacity-85 hover:opacity-100'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Unpaved Sector Quick-Jump Pills (Shows exact km of every gravel/singletrack stretch) */}
      {unpavedSegments.length > 0 && (() => {
        const MAX_PILLS = 7;
        let visibleUnpaved = unpavedSegments;
        if (!showAllUnpaved && unpavedSegments.length > MAX_PILLS) {
          const prioritized = [...unpavedSegments]
            .sort((a, b) => {
              if (a.id === defaultHighlightedSegment?.id) return -1;
              if (b.id === defaultHighlightedSegment?.id) return 1;
              const aRank = a.suitability38c === 'caution' ? 2 : a.type === 'singletrack' ? 1 : 0;
              const bRank = b.suitability38c === 'caution' ? 2 : b.type === 'singletrack' ? 1 : 0;
              if (aRank !== bRank) return bRank - aRank;
              return b.distanceKm - a.distanceKm;
            })
            .slice(0, MAX_PILLS);
          const ids = new Set(prioritized.map((s) => s.id));
          visibleUnpaved = unpavedSegments.filter((s) => ids.has(s.id));
        }
        const hiddenCount = unpavedSegments.length - visibleUnpaved.length;

        return (
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            <span className="text-[11px] font-rounded font-semibold text-ink-muted">
              {isFr ? 'Secteurs non-revêtus :' : 'Unpaved sectors:'}
            </span>
            {visibleUnpaved.map((seg) => {
              const meta = SURFACE_VISUAL_META[seg.type];
              const isActive = defaultHighlightedSegment?.id === seg.id;
              const isCaution = seg.suitability38c === 'caution';
              return (
                <button
                  key={seg.id}
                  type="button"
                  onMouseEnter={() => handleSegmentInteract(seg)}
                  onClick={() => handleSegmentInteract(seg)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-rounded font-bold tnum transition-all cursor-pointer ${
                    meta.badgeClass
                  } ${
                    isActive
                      ? 'ring-2 ring-inset ring-ink dark:ring-volt-lime'
                      : ''
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${meta.dotBgClass}`}
                  />
                  <span>
                    km {seg.startKm}–{seg.endKm}
                  </span>
                  <span className="opacity-80">
                    ({isFr ? meta.shortLabelFr : meta.shortLabelEn})
                  </span>
                  {isCaution && (
                    <TriangleAlert className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllUnpaved(true)}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-rounded font-bold tnum bg-ink/8 dark:bg-white/10 text-ink hover:bg-ink/15 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                +{hiddenCount}
              </button>
            )}
            {showAllUnpaved && unpavedSegments.length > MAX_PILLS && (
              <button
                type="button"
                onClick={() => setShowAllUnpaved(false)}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-rounded font-bold bg-ink/8 dark:bg-white/10 text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                {isFr ? 'Réduire' : 'Show fewer'}
              </button>
            )}
          </div>
        );
      })()}

      {/* Active Sector Detail & 38c Suitability Advisor Pod */}
      {!compact && defaultHighlightedSegment && (
        <div className="mt-2.5 rounded-sub-pod bg-card/90 dark:bg-black/35 p-2.5 ring-1 ring-inset ring-ink/8 dark:ring-white/10 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  SURFACE_VISUAL_META[defaultHighlightedSegment.type].dotBgClass
                }`}
              />
              <span className="text-xs font-rounded font-bold text-ink truncate">
                {isFr
                  ? defaultHighlightedSegment.nameFr
                  : defaultHighlightedSegment.nameEn}
              </span>
              <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum shrink-0">
                · km {defaultHighlightedSegment.startKm}–
                {defaultHighlightedSegment.endKm} (
                {defaultHighlightedSegment.distanceKm} km)
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-rounded font-bold uppercase tracking-wide ${
                defaultHighlightedSegment.suitability38c === 'ideal'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                  : defaultHighlightedSegment.suitability38c === 'capable'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30'
              }`}
            >
              {defaultHighlightedSegment.suitability38c === 'ideal' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  {isFr
                    ? `Idéal en ${suitability.tireWidthMm}c`
                    : `Ideal on ${suitability.tireWidthMm}c`}
                </>
              ) : defaultHighlightedSegment.suitability38c === 'capable' ? (
                <>
                  <Info className="w-3 h-3" />
                  {isFr
                    ? `Adapté en ${suitability.tireWidthMm}c`
                    : `Capable on ${suitability.tireWidthMm}c`}
                </>
              ) : (
                <>
                  <TriangleAlert className="w-3 h-3" />
                  {isFr
                    ? `Technique en ${suitability.tireWidthMm}c`
                    : `Technical on ${suitability.tireWidthMm}c`}
                </>
              )}
            </span>
          </div>

          <p className="text-[11px] text-ink-secondary leading-snug">
            <span className="font-semibold text-ink">
              {isFr
                ? defaultHighlightedSegment.surfaceDetailFr
                : defaultHighlightedSegment.surfaceDetailEn}
              {' — '}
            </span>
            {isFr
              ? defaultHighlightedSegment.riderNoteFr
              : defaultHighlightedSegment.riderNoteEn}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-ink-muted tnum">
            <span className="inline-flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isFr ? 'Pression conseillée' : 'Recommended pressure'}{' '}
                <strong className="text-ink font-rounded">
                  {formatBar(suitability.recommendedFrontBar)} /{' '}
                  {formatBar(suitability.recommendedRearBar)} bar
                </strong>{' '}
                ({suitability.tireWidthMm}c{' '}
                {suitability.isTubeless
                  ? 'Tubeless'
                  : isFr
                  ? 'Chambre'
                  : 'Tubes'}
                )
              </span>
            </span>

            <span>
              Crr{' '}
              <strong className="text-ink font-rounded">
                {defaultHighlightedSegment.effectiveCrr.toFixed(4)}
              </strong>{' '}
              · {isFr ? 'Pente max' : 'Max grade'}{' '}
              <strong className="text-ink font-rounded">
                {defaultHighlightedSegment.maxGradePct}%
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
