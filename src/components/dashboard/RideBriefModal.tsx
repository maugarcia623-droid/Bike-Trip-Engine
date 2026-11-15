import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Download,
  Clock,
  TriangleAlert,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Send,
  Zap,
  Flame,
  Gauge,
  Droplets,
  Wind,
} from '@/components/icons';
import { Button } from '@/components/arc';
import { ModalPortal } from '../common/ModalPortal';
import { PhysicsCalculationResult, TripProfile } from '../../types/trip';
import { StageAmenity } from '../../types/amenities';
import { RiderBikeSpecs } from '../../types/specs';
import { useTranslation } from '../../context/LanguageContext';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { buildRideBrief } from '../../utils/rideBrief';
import { buildPlanShareUrl } from '../../utils/planShare';
import { downloadTripFit } from '../../utils/fitExporter';
import { downloadTripGpx } from '../../utils/gpxExporter';
import {
  fetchRouteSectorForecast,
  getCachedRouteSectorForecast,
  RouteWeatherAnalysis,
} from '../../services/routeWeatherService';
import { getLocalTodayIso } from '../../services/weatherService';
import { CHIP_DUOTONE_ISOLATION_CLASSES, CHIP_TOKENS } from '../../tokens/chipTokens';

export interface RideBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  timeline: ReverseTimelineCalculation;
  riderSpecs?: RiderBikeSpecs;
  amenities?: StageAmenity[];
  onOpenResupplyRadar?: () => void;
}

export const RideBriefModal: React.FC<RideBriefModalProps> = ({
  isOpen,
  onClose,
  trip,
  physics,
  timeline,
  riderSpecs,
  amenities,
  onOpenResupplyRadar,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [copiedLink, setCopiedLink] = useState(false);

  const activeDate =
    trip.stages?.[trip.activeStageIndex ?? 0]?.departureDate ||
    trip.departureDate ||
    getLocalTodayIso();
  const rolloutTime = timeline.hardDepartureTime || trip.departureTime || '08:00';

  const [sectorAnalysis, setSectorAnalysis] = useState<RouteWeatherAnalysis | null>(() =>
    getCachedRouteSectorForecast(trip, activeDate, rolloutTime, lang)
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const cached = getCachedRouteSectorForecast(trip, activeDate, rolloutTime, lang);
    if (cached) {
      setSectorAnalysis(cached);
      return;
    }
    if (!trip.route?.coordinates || trip.route.coordinates.length < 2) {
      setSectorAnalysis(null);
      return;
    }
    fetchRouteSectorForecast(trip, activeDate, rolloutTime, lang, riderSpecs?.ftpWatts)
      .then((res) => {
        if (!cancelled && res) setSectorAnalysis(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, trip, activeDate, rolloutTime, lang, riderSpecs?.ftpWatts]);

  const brief = useMemo(
    () =>
      buildRideBrief({
        trip,
        physics,
        timeline,
        riderSpecs,
        sectorForecast: sectorAnalysis,
        amenities,
        lang,
      }),
    [trip, physics, timeline, riderSpecs, sectorAnalysis, amenities, lang]
  );

  const shareUrl = useMemo(
    () =>
      buildPlanShareUrl(trip, {
        leaveByHHMM: brief.leaveByHHMM,
        arrivalHHMM: brief.arrivalHHMM,
        goStatus: brief.verdict,
        bikeName: brief.bikeName,
      }),
    [trip, brief.leaveByHHMM, brief.arrivalHHMM, brief.verdict, brief.bikeName]
  );

  const handleCopyGroupLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const el = document.createElement('textarea');
        el.value = shareUrl;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const handleNativeShareLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Cadence · ${trip.name}`,
          text: isFr
            ? `${trip.name} (${brief.distanceKm} km) · Départ ${brief.leaveByHHMM} → Arrivée ${brief.arrivalHHMM}`
            : `${trip.name} (${brief.distanceKm} km) · Leave by ${brief.leaveByHHMM} → Finish ${brief.arrivalHHMM}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User canceled native share or unavailable; fall through to copy
      }
    }
    await handleCopyGroupLink();
  };

  const verdictBadgeClasses =
    brief.verdict === 'GO'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25'
      : brief.verdict === 'CAUTION'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/25'
      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/25';

  const verdictLabel =
    brief.verdict === 'GO'
      ? isFr ? 'Feu vert (GO)' : 'GO for ride'
      : brief.verdict === 'CAUTION'
      ? isFr ? 'Vigilance' : 'Caution'
      : isFr ? 'Déconseillé' : 'No-Go';

  const problemBoxClasses =
    brief.firstProblem.severity === 'critical'
      ? 'bg-rose-500/[0.1] dark:bg-rose-500/[0.14] text-rose-950 dark:text-rose-100 ring-1 ring-inset ring-rose-500/25'
      : brief.firstProblem.severity === 'warning'
      ? 'bg-amber-500/[0.1] dark:bg-amber-500/[0.14] text-amber-950 dark:text-amber-100 ring-1 ring-inset ring-amber-500/25'
      : brief.firstProblem.severity === 'info'
      ? 'bg-sky-500/[0.1] dark:bg-sky-500/[0.14] text-sky-950 dark:text-sky-100 ring-1 ring-inset ring-sky-500/25'
      : 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] text-emerald-950 dark:text-emerald-100 ring-1 ring-inset ring-emerald-500/20';

  const loopComp = brief.loopComparison;
  const loopText =
    loopComp && loopComp.isLoop
      ? loopComp.recommendedDirection === 'neutral'
        ? isFr
          ? `Boucle ${loopComp.forwardOrientation === 'clockwise' ? 'sens horaire' : 'sens antihoraire'} équilibrée`
          : `Loop balanced (${loopComp.forwardOrientation})`
        : isFr
        ? `Meilleur sens : ${
            (loopComp.recommendedDirection === 'forward' && loopComp.forwardOrientation === 'clockwise') ||
            (loopComp.recommendedDirection === 'reverse' && loopComp.forwardOrientation === 'anticlockwise')
              ? 'horaire'
              : 'antihoraire'
          } (économise ${loopComp.minutesSaved} min · ${loopComp.wattsSaved} W)`
        : `Optimal direction: ${
            (loopComp.recommendedDirection === 'forward' && loopComp.forwardOrientation === 'clockwise') ||
            (loopComp.recommendedDirection === 'reverse' && loopComp.forwardOrientation === 'anticlockwise')
              ? 'clockwise'
              : 'anticlockwise'
          } (saves ${loopComp.minutesSaved} min · ${loopComp.wattsSaved} W)`
      : null;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="ride-brief-title"
      panelClassName="w-full max-w-2xl max-h-[90vh] max-h-[90dvh] overflow-y-auto overscroll-contain bg-card dark:bg-[#161618] text-ink rounded-[30px] p-4 sm:p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-apple-modal"
    >
      <div className="space-y-4">
        {/* ── 1. HEADER & VERDICT ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-rounded font-extrabold uppercase tracking-wide ${verdictBadgeClasses}`}>
                <span className={`w-2 h-2 rounded-full ${brief.verdict === 'GO' ? 'bg-emerald-500' : brief.verdict === 'CAUTION' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                {verdictLabel}
              </span>
              <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum">
                {brief.distanceKm.toFixed(1)} km · +{brief.elevationGainM} m
                {brief.departureDate ? ` · ${brief.departureDate}` : ''}
              </span>
            </div>
            <h2 id="ride-brief-title" className="text-lg sm:text-xl font-bold font-rounded text-ink tracking-tight leading-snug break-words">
              {trip.name}
            </h2>
            <p className="text-xs text-ink-muted font-rounded break-words">
              {brief.bikeName} · {Math.round(physics.legWatts)} W ({physics.powerZone}) ·{' '}
              {physics.effectiveSpeedKmH.toFixed(1)} km/h
              {loopText ? ` · ${loopText}` : ''}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={isFr ? 'Fermer le brief' : 'Close ride brief'}
            className="w-9 h-9 p-0 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── 2. LEAVE-BY & FINISH WINDOW HERO ── */}
        <div className="rounded-[22px] p-3.5 sm:p-4 bg-volt/20 dark:bg-volt/15 ring-1 ring-inset ring-volt-lime/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-volt text-[#111111] flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                {isFr ? 'Départ impératif (Leave-By)' : 'Rollout / Leave-By'}
              </div>
              <div className="text-2xl sm:text-[26px] font-extrabold font-rounded text-ink tnum leading-none mt-0.5">
                {brief.leaveByHHMM}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right tnum">
            <div>
              <div className="text-[11px] font-rounded font-semibold text-ink-muted">
                {isFr ? 'Temps de selle' : 'Saddle time'}
              </div>
              <div className="text-sm font-bold text-ink font-rounded">
                {brief.movingTimeFormatted}
                {brief.totalStopsMin > 0 && (
                  <span className="text-xs font-medium text-ink-muted ml-1">
                    (+{brief.totalStopsMin}m)
                  </span>
                )}
              </div>
            </div>
            <div className="pl-3 border-l border-ink/10 dark:border-white/10">
              <div className="text-[11px] font-rounded font-semibold text-ink-muted">
                {isFr ? 'Arrivée cible' : 'Target finish'}
              </div>
              <div className="text-sm font-extrabold text-ink font-rounded">
                {brief.arrivalHHMM}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. THE THREE NUMBERS THAT MATTER ── */}
        <div>
          <div className="px-1 mb-1.5 text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
            {isFr ? 'Les 3 chiffres clés' : 'The 3 numbers that matter'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Pressure */}
            <div className="rounded-[20px] p-3.5 bg-pod/80 dark:bg-white/[0.045] flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-xs font-rounded font-semibold text-ink-secondary">
                <Gauge className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{isFr ? 'Pression pneus' : 'Tyre pressure'}</span>
              </div>
              <div className="text-xl font-extrabold font-rounded text-ink tnum">
                {brief.tyrePressure.frontBar.toFixed(1)} / {brief.tyrePressure.rearBar.toFixed(1)}{' '}
                <span className="text-xs font-bold text-ink-muted">bar</span>
              </div>
              <div className="text-[11px] text-ink-muted font-rounded leading-tight">
                {isFr ? 'AV / AR' : 'Front / Rear'} · {brief.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tube'}
                {brief.tyrePressure.hooklessCapped ? ' · ETRTO 5.0 cap' : ''}
              </div>
            </div>

            {/* Carbs/h */}
            <div className="rounded-[20px] p-3.5 bg-pod/80 dark:bg-white/[0.045] flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-xs font-rounded font-semibold text-ink-secondary">
                <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{isFr ? 'Glucides / h' : 'Carbs / hour'}</span>
              </div>
              <div className="text-xl font-extrabold font-rounded text-ink tnum">
                {brief.carbsPerHr}{' '}
                <span className="text-xs font-bold text-ink-muted">g/h</span>
              </div>
              <div className="text-[11px] text-ink-muted font-rounded leading-tight tnum">
                {isFr ? `Total à emporter : ${brief.totalCarbsG} g` : `Pack ${brief.totalCarbsG} g on bike`}
              </div>
            </div>

            {/* Bottles */}
            <div className="rounded-[20px] p-3.5 bg-pod/80 dark:bg-white/[0.045] flex flex-col justify-between gap-1">
              <div className="flex items-center gap-1.5 text-xs font-rounded font-semibold text-ink-secondary">
                <Droplets className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{isFr ? 'Bidons & eau' : 'Bottles'}</span>
              </div>
              <div className="text-xl font-extrabold font-rounded text-ink tnum">
                {brief.bottles.badgeLabel}
              </div>
              <div className="text-[11px] text-ink-muted font-rounded leading-tight tnum">
                {brief.pinnedCount > 0
                  ? isFr
                    ? `${brief.pinnedCount} arrêt(s) épinglé(s)`
                    : `${brief.pinnedCount} stop(s) pinned`
                  : isFr
                  ? 'Aucun arrêt épinglé'
                  : 'No stops pinned yet'}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. FIRST PROBLEM ON THE ROUTE ── */}
        <div>
          <div className="px-1 mb-1.5 text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
            {isFr ? 'Premier point d’attention sur la route' : 'First problem on the route'}
          </div>
          <div className={`rounded-[22px] p-3.5 sm:p-4 space-y-2 ${problemBoxClasses}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {brief.firstProblem.severity === 'critical' ? (
                  <TriangleAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                ) : brief.firstProblem.severity === 'warning' ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : brief.firstProblem.severity === 'info' ? (
                  <Wind className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-bold font-rounded leading-snug">
                  {brief.firstProblem.headline}
                </div>
                <p className="text-xs opacity-90 font-rounded leading-relaxed">
                  {brief.firstProblem.detail}
                </p>
              </div>
            </div>

            {brief.secondaryProblems.length > 0 && (
              <div className="pt-2 border-t border-current/10 space-y-1">
                {brief.secondaryProblems.map((p) => (
                  <div key={p.id} className="text-xs font-rounded opacity-90 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span>{p.headline}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 5. NIGHT-BEFORE KIT CALL ── */}
        <div className="rounded-[22px] p-3.5 sm:p-4 bg-pod/80 dark:bg-white/[0.045] space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-rounded font-bold text-ink">
              <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{isFr ? 'Tenue recommandée' : 'What to wear'}</span>
            </div>
            <span
              className={`text-[11px] font-rounded font-bold px-2.5 py-0.5 rounded-full ${CHIP_TOKENS[brief.kit.tierTheme].surface} ${CHIP_TOKENS[brief.kit.tierTheme].primary}`}
            >
              {brief.kit.tierBadge} · {isFr ? 'ressenti' : 'feels'} {brief.kit.feelsLikeC}°C
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-rounded">
            <div className="rounded-2xl bg-card dark:bg-black/25 p-2.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted block">
                {isFr ? 'Buste' : 'Torso'}
              </span>
              <span className="text-ink font-medium leading-snug block mt-0.5">
                {brief.kit.upperBody}
              </span>
            </div>
            <div className="rounded-2xl bg-card dark:bg-black/25 p-2.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted block">
                {isFr ? 'Jambes & mains' : 'Legs & hands'}
              </span>
              <span className="text-ink font-medium leading-snug block mt-0.5">
                {brief.kit.lowerAndExtremities}
              </span>
            </div>
            <div className="rounded-2xl bg-card dark:bg-black/25 p-2.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted block">
                {isFr ? 'Pluie & verres' : 'Shell & lens'}
              </span>
              <span className="text-ink font-medium leading-snug block mt-0.5">
                {brief.kit.opticsAndShield}
              </span>
            </div>
          </div>
          {brief.kit.sectorNote && (
            <p className="text-[11px] text-ink-muted font-rounded pt-0.5">
              {brief.kit.sectorNote}
            </p>
          )}
        </div>

        {/* ── 6. ONE-TAP GROUP SHARE & HEAD-UNIT ACTIONS ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="primary"
            type="button"
            onClick={handleNativeShareLink}
            className={`flex-1 min-w-[180px] min-h-[42px] px-4 py-2 rounded-full bg-volt text-[#111111] font-rounded font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:brightness-95 active:scale-[0.98] transition-all`}
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{isFr ? 'Lien du groupe copié !' : 'Group plan link copied!'}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{isFr ? 'Partager le plan (lien groupe)' : 'Share group plan link'}</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={handleCopyGroupLink}
            title={isFr ? 'Copier le lien du plan' : 'Copy plan URL'}
            className="min-h-[42px] px-3.5 py-2 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink font-rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>{isFr ? 'Copier URL' : 'Copy URL'}</span>
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => downloadTripFit(trip)}
            className="min-h-[42px] px-3.5 py-2 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink font-rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
            <span>.FIT</span>
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => downloadTripGpx(trip)}
            className="min-h-[42px] px-3.5 py-2 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink font-rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.sky.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
            <span>.GPX</span>
          </Button>

          {onOpenResupplyRadar && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                onClose();
                onOpenResupplyRadar();
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink font-rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Radar</span>
            </Button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
