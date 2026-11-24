import React, { useRef, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Upload,
  Link2,
  Route,
  X,
  LoaderCircle,
  TriangleAlert,
  Mountain,
} from '@/components/icons';
import { GpxParseResult } from '../../utils/gpxParser';
import { TripProfile } from '../../types/trip';
import { buildParsedRouteFromTrip, isUserCreatedTrip } from '../../data/demoToolRoutes';
import {
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';
import { trackCadenceEvent } from '../../utils/analytics';

export interface LoadedToolRoute {
  source: 'file' | 'url' | 'auto-route' | 'active-trip';
  fileName?: string;
  parsed: GpxParseResult;
}

export interface ToolRouteDropzoneProps {
  toolId: string;
  lang: 'en' | 'fr';
  route: LoadedToolRoute | null;
  activeTrip?: TripProfile | null;
  /** When true, highlights Browse GPX in Volt yellow-vest CTA style; when false (optional), uses calm secondary style */
  primaryAction?: boolean;
  /** Optional step badge e.g. "Step 1" */
  stepBadge?: string;
  headlineEn?: string;
  headlineFr?: string;
  sublineEn?: string;
  sublineFr?: string;
  onRouteLoaded: (loaded: LoadedToolRoute) => void;
  onClear?: () => void;
}

export const ToolRouteDropzone: React.FC<ToolRouteDropzoneProps> = ({
  toolId,
  lang,
  route,
  activeTrip,
  primaryAction = false,
  stepBadge,
  headlineEn,
  headlineFr,
  sublineEn,
  sublineFr,
  onRouteLoaded,
  onClear,
}) => {
  const isFr = lang === 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Only offer the user's active trip if THEY actually created or imported it (never bundled sample presets!)
  const userTrip = isUserCreatedTrip(activeTrip) ? activeTrip : null;

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const { parseRouteFile } = await import('../../utils/routeFileParser');
      const parsed = await parseRouteFile(file);
      if (!parsed || parsed.distanceKm <= 0 || parsed.coordinates.length < 2) {
        throw new Error(
          isFr
            ? 'Impossible de lire une trace GPS valide dans ce fichier.'
            : 'Could not read a valid GPS track from this file.'
        );
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'gpx';
      trackCadenceEvent('tool_gpx_loaded', { tool: toolId, format: ext });
      onRouteLoaded({
        source: 'file',
        fileName: file.name,
        parsed,
      });
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isFr
            ? 'Erreur lors de la lecture du fichier (.GPX, .TCX ou .FIT).'
            : 'Could not parse route file (.GPX, .TCX, or .FIT).')
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const { importRouteFromUrl } = await import('../../utils/routeUrlImporter');
      const outcome = await importRouteFromUrl(raw);
      if (!outcome.ok || !outcome.parsed || outcome.parsed.coordinates.length < 2) {
        throw new Error(
          (isFr ? outcome.guidanceFr : outcome.guidanceEn) ||
            (isFr
              ? 'Lien non reconnu ou privé — exportez le .GPX et déposez-le ici.'
              : 'Could not import that link — export the .GPX file and drop it here.')
        );
      }
      trackCadenceEvent('tool_gpx_loaded', { tool: toolId, format: outcome.provider || 'url' });
      onRouteLoaded({
        source: 'url',
        fileName: outcome.fileName,
        parsed: outcome.parsed,
      });
      setUrlInput('');
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isFr ? 'Import impossible pour ce lien.' : 'Could not import this route link.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseUserTrip = () => {
    if (!userTrip) return;
    setErrorMsg(null);
    onRouteLoaded({
      source: 'active-trip',
      parsed: buildParsedRouteFromTrip(userTrip, lang),
    });
  };

  if (route) {
    return (
      <div className="rounded-pod bg-pod p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`}
          >
            <Route className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-rounded font-bold text-ink truncate">
              {route.parsed.trackName || `${route.parsed.originLabel} → ${route.parsed.destLabel}`}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted tnum mt-0.5">
              <span className="font-semibold text-ink-secondary">
                {route.parsed.distanceKm.toFixed(1)} km
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5" />
                +{Math.round(route.parsed.elevationGainM)} m
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,.tcx,.fit,application/gpx+xml,application/xml,text/xml"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-3.5 rounded-full bg-card hover:bg-chip text-xs font-rounded font-semibold text-ink cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isFr ? 'Changer de GPX' : 'Swap GPX'}</span>
          </Button>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              aria-label={isFr ? 'Effacer le parcours' : 'Clear route'}
              className="aspect-square w-10 h-10 min-w-[40px] min-h-[40px] p-0 rounded-full bg-card hover:bg-chip text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-card bg-card p-4 sm:p-5 space-y-3.5 shadow-xs transition-all ring-2 ring-inset ${
        isDragging
          ? 'ring-emerald-500 bg-emerald-500/[0.04]'
          : 'ring-ink/[0.06] dark:ring-white/[0.08]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,.tcx,.fit,application/gpx+xml,application/xml,text/xml"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {stepBadge && (
              <span className="px-2.5 py-0.5 rounded-full bg-volt text-[#111111] text-[10px] font-rounded font-extrabold">
                {stepBadge}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-rounded font-bold text-ink leading-snug">
              {isFr
                ? headlineFr || 'Dépose ton parcours (.GPX, .TCX, .FIT) ou colle un lien'
                : headlineEn || 'Drop a route (.GPX, .TCX, .FIT) or paste a link'}
            </h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
            {isFr
              ? sublineFr || 'Ton fichier reste 100 % dans ton navigateur — aucun compte requis.'
              : sublineEn || 'Your file never leaves your browser — zero account needed.'}
          </p>
        </div>

        <Button
          variant={primaryAction ? 'primary' : 'secondary'}
          size="md"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className={`min-h-[44px] px-4 rounded-full text-xs font-rounded font-bold cursor-pointer shrink-0 ${
            primaryAction
              ? YELLOW_VEST_SOLID_CTA_CLASSES
              : 'bg-pod hover:bg-chip text-ink ring-1 ring-inset ring-ink/10 dark:ring-white/15'
          }`}
        >
          {isLoading ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{isFr ? 'Choisir un GPX / FIT' : 'Browse GPX / FIT'}</span>
        </Button>
      </div>

      {/* Komoot / Strava / RideWithGPS / Bikemap link box — ALWAYS available */}
      <form onSubmit={handleImportUrl} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Link2 className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              isFr
                ? 'Ou collez un lien Komoot, Strava, RideWithGPS ou Bikemap…'
                : 'Or paste a Komoot, Strava, RideWithGPS, or Bikemap link…'
            }
            className="w-full min-h-[44px] pl-10 pr-3.5 rounded-full bg-pod text-ink placeholder:text-ink-muted text-base sm:text-xs font-body focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/25"
          />
        </div>
        <Button
          variant="secondary"
          size="md"
          type="submit"
          disabled={isLoading || !urlInput.trim()}
          className="min-h-[44px] px-4 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold cursor-pointer shrink-0"
        >
          {isFr ? 'Importer le lien' : 'Import link'}
        </Button>
      </form>

      {errorMsg && (
        <div className="rounded-pod bg-rose-500/10 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 text-xs flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Only show saved ride shortcut if the user actually created/imported one */}
      {userTrip && (
        <div className="pt-0.5 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUseUserTrip}
            className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="truncate max-w-[260px]">
              {isFr ? 'Utiliser ma sortie enregistrée :' : 'Use my saved ride:'} {userTrip.name} (
              {userTrip.route.distanceKm} km)
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};
