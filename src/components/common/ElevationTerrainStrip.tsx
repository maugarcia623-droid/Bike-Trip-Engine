import React, { useState, useMemo, useRef } from 'react';
import { Mountains, Upload, Route } from '@/components/icons';
import { RouteParams, PhysicsCalculationResult, SurfaceSegment } from '../../types/trip';
import { synthesizeRouteElevationProfile } from '../../utils/gpxParser';
import { computeSurfaceBreakdown, SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useOsmSurface } from '../../services/osmSurfaceService';
import { getPowerZone } from '../../utils/physics';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from './Badge';
import { IconBadge } from './IconBadge';
import { SurfaceProfileBar } from './SurfaceProfileBar';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface ElevationTerrainStripProps {
  route: RouteParams;
  physicsResult?: PhysicsCalculationResult;
  crr?: number;
  customChips?: string[];
  activeSegmentId?: string | null;
  onSelectSurfaceSegment?: (segment: SurfaceSegment | null) => void;
  compact?: boolean;
  onUploadGpxFile?: (file: File) => void;
}

export const ElevationTerrainStrip: React.FC<ElevationTerrainStripProps> = ({
  route,
  physicsResult,
  crr,
  customChips,
  activeSegmentId,
  onSelectSurfaceSegment,
  compact = false,
  onUploadGpxFile,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const isGpx = Boolean(route.elevationProfile && route.elevationProfile.length >= 3);
  const { elevationProfile, terrainSummary } = useMemo(
    () => synthesizeRouteElevationProfile(route),
    [route]
  );

  const canQueryOsm =
    route.routeMode !== 'manual-radius' &&
    Boolean(route.coordinates && route.coordinates.length >= 2);
  const {
    osmData,
    status: osmStatus,
    error: osmError,
    refresh: refreshOsm,
  } = useOsmSurface(route.coordinates, route.distanceKm, canQueryOsm);

  const surfaceBreakdown = useMemo(
    () =>
      computeSurfaceBreakdown(
        {
          ...route,
          elevationProfile,
        },
        {
          crr,
          customChips,
          osmData,
          isLoadingOsm: canQueryOsm && osmStatus === 'loading',
          osmError,
        }
      ),
    [route, elevationProfile, crr, customChips, osmData, canQueryOsm, osmStatus, osmError]
  );

  const elevGain =
    typeof route.elevationGainM === 'number'
      ? route.elevationGainM
      : Math.round((route.distanceKm || 30) * 6.5);

  const difficultyLabel = (() => {
    switch (terrainSummary.difficultyLevel) {
      case 'alpine':
        return { text: isFr ? 'Montagne / Exigeant' : 'Alpine / Steep', variant: 'rose' as const };
      case 'challenging':
        return { text: isFr ? 'Sportif / Vallonné' : 'Challenging', variant: 'amber' as const };
      case 'moderate':
        return { text: isFr ? 'Modéré & Accessible' : 'Moderate', variant: 'yellow-vest' as const };
      default:
        return { text: isFr ? 'Facile & Roulant' : 'Easy & Smooth', variant: 'emerald' as const };
    }
  })();

  const surfaceInfo = (() => {
    const unpavedPct = surfaceBreakdown.gravelPct + surfaceBreakdown.singletrackPct;
    if (unpavedPct >= 50) return isFr ? 'Chemins & Gravel' : 'Gravel & Trail';
    if (unpavedPct >= 10) return isFr ? 'Mixte Bitume & Gravel' : 'Mixed Paved & Gravel';
    return isFr ? 'Asphalte / Route' : 'Paved Road';
  })();

  // Build SVG path in normalized 600 x 90 viewBox
  const chartW = 600;
  const chartH = compact ? 68 : 88;
  const padTop = 10;
  const padBot = 10;

  const { linePath, areaPath, coords } = useMemo(() => {
    if (!elevationProfile.length) {
      return { linePath: '', areaPath: '', coords: [] as { x: number; y: number }[] };
    }
    const eles = elevationProfile.map((p) => p.eleM);
    const minE = Math.min(...eles);
    const maxE = Math.max(...eles, minE + 15);
    const spanE = Math.max(15, maxE - minE);
    const maxD = Math.max(0.1, elevationProfile[elevationProfile.length - 1].distKm);

    const pts = elevationProfile.map((p) => {
      const x = (p.distKm / maxD) * chartW;
      const y = chartH - padBot - ((p.eleM - minE) / spanE) * (chartH - padTop - padBot);
      return { x, y };
    });

    const dLine = pts
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    const dArea = `${dLine} L ${chartW} ${chartH} L 0 ${chartH} Z`;
    return { linePath: dLine, areaPath: dArea, coords: pts };
  }, [elevationProfile, chartH]);

  const hoveredPoint =
    hoverIdx !== null && elevationProfile[hoverIdx] ? elevationProfile[hoverIdx] : null;
  const hoveredCoord = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;

  const hoveredZone = useMemo(() => {
    if (!hoveredPoint) return null;
    const baseW = physicsResult?.legWatts || 155;
    const ftp = physicsResult?.ftpWatts || 210;
    const g = hoveredPoint.gradePct;
    const estW =
      g < -1.5
        ? baseW * 0.55
        : g <= 1.5
        ? baseW * 0.9
        : g <= 4
        ? baseW * 1.12
        : baseW * Math.min(1.55, 1.2 + (g - 4) * 0.06);
    return {
      watts: Math.round(estW),
      zone: getPowerZone(Math.round((estW / ftp) * 100)),
    };
  }, [hoveredPoint, physicsResult]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!elevationProfile.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const idx = Math.round(frac * (elevationProfile.length - 1));
    setHoverIdx(idx);
    const pct = frac * 100;
    const seg =
      surfaceBreakdown.segments.find((s) => pct >= s.startPct && pct <= s.endPct) ?? null;
    if (seg) {
      onSelectSurfaceSegment?.(seg);
    }
  };

  const hoveredSurfaceMeta = useMemo(() => {
    if (hoverIdx === null) return null;
    const st = surfaceBreakdown.pointSurfaces[hoverIdx] ?? 'paved';
    return SURFACE_VISUAL_META[st];
  }, [hoverIdx, surfaceBreakdown]);

  return (
    <div className="rounded-card bg-card text-ink p-3.5 sm:p-4 transition-colors">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <IconBadge theme="emerald" icon={Mountains} size="sm" solidBacker />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-semibold text-ink tracking-tight">
                {t('terrainOverviewTitle')}
              </h3>
              <Badge variant={difficultyLabel.variant} size="xs" dot>
                {difficultyLabel.text}
              </Badge>
              <Badge variant="zinc" size="xs" icon={Route}>
                {surfaceInfo}
              </Badge>
              {isGpx && (
                <Badge variant="emerald" size="xs" className="tnum">
                  {route.gpxFileName ? `GPX · ${route.gpxFileName}` : t('gpxLoadedBadge')}
                </Badge>
              )}
            </div>
            {!compact && (
              <p className="text-[11px] text-ink-muted mt-0.5 break-words leading-relaxed">
                {isGpx
                  ? isFr
                    ? `Profil réel extrait de votre trace GPX (+${elevGain} m D+ · pente max ${terrainSummary.maxGradePct}%)`
                    : `True elevation extracted from your GPX trace (+${elevGain} m D+ · max ${terrainSummary.maxGradePct}% grade)`
                  : isFr
                  ? `Aperçu topographique (+${elevGain} m D+) — importez un fichier .GPX pour le relief exact mètre par mètre`
                  : `Topographic preview (+${elevGain} m D+) — upload a .GPX file for exact meter-by-meter slope`}
              </p>
            )}
          </div>
        </div>

        {onUploadGpxFile && (
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,application/gpx+xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onUploadGpxFile(f);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Upload className="w-3.5 h-3.5 text-current" />
              <span>{t('gpxUploadBtn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Elevation Area Chart */}
      <div className="relative rounded-pod bg-pod px-3 pt-2.5 pb-2 mb-2.5 overflow-hidden select-none">
        <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1 tnum">
          <span>
            {hoveredPoint
              ? `${hoveredPoint.distKm} km · ${Math.round(hoveredPoint.eleM)} m · ${
                  hoveredPoint.gradePct > 0 ? '+' : ''
                }${hoveredPoint.gradePct}%${
                  hoveredSurfaceMeta
                    ? ` · ${isFr ? hoveredSurfaceMeta.labelFr : hoveredSurfaceMeta.labelEn}`
                    : ''
                }`
              : `0 km · ${t('terrainAltitudeSpan', {
                  min: terrainSummary.minEleM,
                  max: terrainSummary.maxEleM,
                })}`}
          </span>
          <span className="font-semibold text-ink">
            {hoveredZone
              ? `~${hoveredZone.watts}W (${hoveredZone.zone})`
              : `+${elevGain} m D+ · ${t('terrainMaxGrade', { pct: terrainSummary.maxGradePct })}`}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          preserveAspectRatio="none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className={`w-full ${compact ? 'h-14' : 'h-20'} cursor-crosshair block`}
        >
          <defs>
            <linearGradient id="elevFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#elevFillGrad)" />}
          {/* Color-coded surface baseline strip synchronized with elevation x-axis */}
          {surfaceBreakdown.segments.map((seg) => {
            const x1 = (seg.startPct / 100) * chartW;
            const x2 = (seg.endPct / 100) * chartW;
            const meta = SURFACE_VISUAL_META[seg.type];
            return (
              <rect
                key={seg.id}
                x={x1}
                y={chartH - 5}
                width={Math.max(2, x2 - x1 - 1)}
                height={4}
                rx={1.5}
                fill={meta.colorDark}
                opacity={activeSegmentId === seg.id ? 1 : 0.85}
              />
            );
          })}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {hoveredCoord && (
            <>
              <line
                x1={hoveredCoord.x}
                y1={0}
                x2={hoveredCoord.x}
                y2={chartH}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="4.5"
                fill={hoveredSurfaceMeta ? hoveredSurfaceMeta.colorDark : '#10B981'}
                stroke="#FFFFFF"
                strokeWidth="1.8"
              />
            </>
          )}
        </svg>
      </div>

      {/* 4 Compact Terrain Breakdown Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
        <div className="px-3 py-2 rounded-sub-pod bg-pod flex items-center justify-between gap-2">
          <span className="text-ink-muted flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CHIP_TOKENS.emerald.dot}`} />
            {t('terrainFlat')}
          </span>
          <span className="font-bold text-ink tnum">
            {terrainSummary.flatPct + terrainSummary.descentPct}%
          </span>
        </div>

        <div className="px-3 py-2 rounded-sub-pod bg-pod flex items-center justify-between gap-2">
          <span className="text-ink-muted flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CHIP_TOKENS['yellow-vest'].dot}`} />
            {t('terrainRolling')}
          </span>
          <span className="font-bold text-ink tnum">{terrainSummary.rollingPct}%</span>
        </div>

        <div className="px-3 py-2 rounded-sub-pod bg-pod flex items-center justify-between gap-2">
          <span className="text-ink-muted flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CHIP_TOKENS.amber.dot}`} />
            {t('terrainClimb')}
          </span>
          <span className="font-bold text-ink tnum">{terrainSummary.climbPct}%</span>
        </div>

        <div className="px-3 py-2 rounded-sub-pod bg-pod flex items-center justify-between gap-2">
          <span className="text-ink-muted">{isFr ? 'Pente max' : 'Peak slope'}</span>
          <span className="font-bold text-ink tnum">{terrainSummary.maxGradePct}%</span>
        </div>
      </div>

      {/* Interactive Surface & Road Type Profile Bar + 38c Gravel Suitability */}
      <SurfaceProfileBar
        breakdown={surfaceBreakdown}
        activeSegmentId={activeSegmentId}
        onSelectSegment={onSelectSurfaceSegment}
        onRefreshOsm={canQueryOsm ? refreshOsm : undefined}
        compact={compact}
      />
    </div>
  );
};
