import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Wind,
  RefreshCcw,
  ArrowRight,
  LoaderCircle,
  TriangleAlert,
  Compass,
  Navigation,
  Zap,
  Clock,
  Flame,
  Mountain,
  SlidersHorizontal,
  ChevronDown,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getLocalTodayIso } from '../../services/weatherService';
import {
  fetchRouteSectorForecast,
  RouteWeatherAnalysis,
} from '../../services/routeWeatherService';
import { calculateHumanWindImpact } from '../../utils/windInsights';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { LoadedToolRoute, ToolRouteDropzone } from './ToolRouteDropzone';
import { LiveWeatherPayload, ToolLiveWeatherBar } from './ToolLiveWeatherBar';
import {
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';

export interface LoopWindFlipperToolProps {
  lang: 'en' | 'fr';
  initialMode?: 'loop' | 'wind-tax';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

const BIKE_PROFILE_PRESETS = [
  { id: 'aero-road', labelEn: 'Road bike', labelFr: 'Route', cda: 0.295, crr: 0.0038, bikeKg: 8.2 },
  { id: 'gravel', labelEn: 'Gravel 38 mm', labelFr: 'Gravel 38 mm', cda: 0.38, crr: 0.006, bikeKg: 10.4 },
  { id: 'urban', labelEn: 'City / Commuter', labelFr: 'Ville / Vélotaf', cda: 0.48, crr: 0.0068, bikeKg: 14.5 },
] as const;

const WIND_ANGLE_PRESETS = [
  { deg: 0, labelEn: 'Headwind', labelFr: 'Vent de face' },
  { deg: 45, labelEn: 'Cross-head', labelFr: '3/4 face' },
  { deg: 90, labelEn: 'Crosswind', labelFr: 'Travers' },
  { deg: 180, labelEn: 'Tailwind', labelFr: 'Vent de dos' },
] as const;

const ACTIVE_PILL_CLS =
  'bg-[#111111] text-white dark:bg-chip dark:text-ink dark:ring-1 dark:ring-inset dark:ring-white/20 shadow-xs';
const INACTIVE_PILL_CLS = 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink';
const HERO_ACCENT_CARD_CLS =
  'bg-[#faffcb] text-[#3a3f00] ring-1 ring-inset ring-[#a3b300]/35 dark:bg-[#1e2108] dark:text-[#e3ff00] dark:ring-[#dfff00]/30';

export const LoopWindFlipperTool: React.FC<LoopWindFlipperToolProps> = ({
  lang,
  initialMode = 'loop',
  activeTrip,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const [mode, setMode] = useState<'loop' | 'wind-tax'>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // ── Shared timing state ──
  const [rideDate, setRideDate] = useState<string>(() => getLocalTodayIso());
  const [startTime, setStartTime] = useState<string>('08:30');
  const [speedKmH, setSpeedKmH] = useState<number>(25);

  // ── Mode 1: Flip a Loop GPX state ──
  const [loadedRoute, setLoadedRoute] = useState<LoadedToolRoute | null>(null);
  const [analysis, setAnalysis] = useState<RouteWeatherAnalysis | null>(null);
  const [isLoadingLoop, setIsLoadingLoop] = useState(false);
  const [loopErrorMsg, setLoopErrorMsg] = useState<string | null>(null);

  // ── Mode 2: Today's Wind & Invisible Hill (No GPX needed) state ──
  const [distanceKm, setDistanceKm] = useState<number>(35);
  const [riderMassKg, setRiderMassKg] = useState<number>(() => riderSpecs?.riderWeightKg ?? 74);
  const [bikeId, setBikeId] = useState<string>('gravel');
  const [windSpeedKmH, setWindSpeedKmH] = useState<number>(20);
  const [windAngleDeg, setWindAngleDeg] = useState<number>(0);
  const [liveLocation, setLiveLocation] = useState<string | null>(null);
  const [liveWindFromDeg, setLiveWindFromDeg] = useState<number | null>(null);
  const [liveTempC, setLiveTempC] = useState<number>(15);
  const [liveGustsKmH, setLiveGustsKmH] = useState<number | null>(null);
  const [showManualWind, setShowManualWind] = useState(false);

  const runLoopAnalysis = async (
    targetRoute: LoadedToolRoute,
    date: string,
    depTime: string,
    speed: number
  ) => {
    setIsLoadingLoop(true);
    setLoopErrorMsg(null);
    try {
      const syntheticTrip = buildTripFromToolRoute({
        parsed: targetRoute.parsed,
        speedKmH: speed,
        departureDate: date,
        departureTime: depTime,
        riderSpecs,
        lang,
      });
      const result = await fetchRouteSectorForecast(
        syntheticTrip,
        date,
        depTime,
        lang,
        riderSpecs?.ftpWatts ?? 220
      );
      if (!result) {
        throw new Error(
          isFr
            ? 'Impossible de récupérer la météo sur ce parcours.'
            : 'Could not fetch live sector weather for this route.'
        );
      }
      setAnalysis(result);
    } catch (err: any) {
      setLoopErrorMsg(
        err?.message ||
          (isFr
            ? 'Prévision météo temporairement indisponible.'
            : 'Live wind forecast temporarily unavailable.')
      );
      setAnalysis(null);
    } finally {
      setIsLoadingLoop(false);
    }
  };

  useEffect(() => {
    if (!loadedRoute) {
      setAnalysis(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runLoopAnalysis(loadedRoute, rideDate, startTime, speedKmH);
    }, 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedRoute, rideDate, startTime, speedKmH, lang]);

  const handleWeatherFetched = (payload: LiveWeatherPayload) => {
    setLiveLocation(payload.locationLabel);
    setWindSpeedKmH(Math.min(55, Math.round(payload.weather.windSpeedKmH)));
    setLiveWindFromDeg(payload.weather.windDirectionDegrees);
    setLiveTempC(Math.round(payload.weather.temperatureC));
    setLiveGustsKmH(Math.round(payload.weather.windGustsKmH));
    setShowManualWind(false);
  };

  // ── Mode 2 Computation: Human "Invisible Hill" Wind Impact ──
  const bike = BIKE_PROFILE_PRESETS.find((b) => b.id === bikeId) || BIKE_PROFILE_PRESETS[1];
  const windInsight = useMemo(
    () =>
      calculateHumanWindImpact({
        distanceKm,
        targetSpeedKmH: speedKmH,
        riderWeightKg: riderMassKg,
        bikeWeightKg: bike.bikeKg,
        cda: bike.cda,
        crr: bike.crr,
        windSpeedKmH,
        windRelativeAngleDeg: windAngleDeg,
        windFromDegrees: liveWindFromDeg ?? undefined,
        temperatureC: liveTempC,
        ftpWatts: riderSpecs?.ftpWatts ?? 220,
        lang,
      }),
    [distanceKm, speedKmH, riderMassKg, bike, windSpeedKmH, windAngleDeg, liveWindFromDeg, liveTempC, riderSpecs?.ftpWatts, lang]
  );

  // ── Mode 1 Derived Labels ──
  const loop = analysis?.loopComparison;
  const forwardLabel =
    loop?.forwardOrientation === 'clockwise'
      ? isFr
        ? 'Sens horaire'
        : 'Clockwise'
      : loop?.forwardOrientation === 'anticlockwise'
      ? isFr
        ? 'Sens anti-horaire'
        : 'Counter-clockwise'
      : isFr
      ? 'Sens original'
      : 'Original direction';

  const reverseLabel =
    loop?.forwardOrientation === 'clockwise'
      ? isFr
        ? 'Sens anti-horaire'
        : 'Counter-clockwise'
      : loop?.forwardOrientation === 'anticlockwise'
      ? isFr
        ? 'Sens horaire'
        : 'Clockwise'
      : isFr
      ? 'Sens inversé'
      : 'Reversed direction';

  const shouldFlip = loop?.recommendedDirection === 'reverse';
  const minutesSaved = loop ? Math.abs(Math.round(loop.minutesSaved)) : 0;
  const wattsSaved = loop ? Math.abs(Math.round(loop.wattsSaved)) : 0;

  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const rem = Math.round(m % 60);
    return h > 0 ? `${h} h ${String(rem).padStart(2, '0')} min` : `${rem} min`;
  };

  const handleOpenFullLoopPlan = () => {
    if (!onOpenTripInCadence || !loadedRoute) return;
    const trip = buildTripFromToolRoute({
      parsed: loadedRoute.parsed,
      speedKmH,
      departureDate: rideDate,
      departureTime: startTime,
      riderSpecs,
      lang,
      reverseDirection: shouldFlip,
    });
    onOpenTripInCadence(trip);
  };

  return (
    <div className="space-y-5">
      {/* Concentric full-radius 2-Mode Pill Switcher (calm dark-mode contrast, zero blinding white!) */}
      <div className="rounded-[28px] sm:rounded-full bg-card p-1.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-1.5 ring-1 ring-inset ring-ink/[0.05] dark:ring-white/[0.07]">
        <button
          type="button"
          onClick={() => setMode('loop')}
          className={`min-h-[52px] px-5 py-2.5 rounded-full text-left flex items-center gap-3 transition-all cursor-pointer ${
            mode === 'loop'
              ? ACTIVE_PILL_CLS
              : 'bg-transparent hover:bg-pod text-ink-secondary hover:text-ink'
          }`}
        >
          <RefreshCcw className="w-4.5 h-4.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-rounded font-extrabold leading-tight">
              {isFr ? 'Comparer les 2 sens d’une boucle (GPX)' : 'Flip a loop GPX (CW vs. CCW)'}
            </div>
            <div className="text-[11px] opacity-75 truncate mt-0.5">
              {isFr
                ? 'Déposez une boucle pour éviter le vent de face au retour'
                : 'Drop a loop to see which direction gives a tailwind home'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('wind-tax')}
          className={`min-h-[52px] px-5 py-2.5 rounded-full text-left flex items-center gap-3 transition-all cursor-pointer ${
            mode === 'wind-tax'
              ? ACTIVE_PILL_CLS
              : 'bg-transparent hover:bg-pod text-ink-secondary hover:text-ink'
          }`}
        >
          <Wind className="w-4.5 h-4.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-rounded font-extrabold leading-tight">
              {isFr
                ? 'Pas de GPX ? Vent du jour & côte invisible'
                : 'No GPX? Check today’s wind & best direction'}
            </div>
            <div className="text-[11px] opacity-75 truncate mt-0.5">
              {isFr
                ? 'Boussole vent en direct, pente équivalente & temps perdu'
                : 'Live city wind compass, invisible hill grade & time impact'}
            </div>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODE 1: FLIP A LOOP GPX (CLOCKWISE VS COUNTER-CLOCKWISE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'loop' && (
        <div className="space-y-5 animate-apple-step-in">
          <ToolRouteDropzone
            toolId="flip-my-loop"
            lang={lang}
            route={loadedRoute}
            activeTrip={activeTrip}
            primaryAction
            stepBadge={isFr ? 'Étape 1' : 'Step 1'}
            headlineEn="Upload your loop GPX or paste a Komoot / Strava link"
            headlineFr="Importe ta boucle GPX ou colle un lien Komoot / Strava"
            sublineEn="Cadence samples the hourly wind along both directions so you finish with the wind at your back."
            sublineFr="Cadence analyse le vent heure par heure dans les deux sens pour finir vent de dos."
            onRouteLoaded={(r) => setLoadedRoute(r)}
            onClear={() => setLoadedRoute(null)}
          />

          {/* Step 2: Timing & Pace Strip + Explicit Analyze CTA */}
          <div className="rounded-card bg-card p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pod text-ink text-[10px] font-rounded font-extrabold">
                  {isFr ? 'Étape 2' : 'Step 2'}
                </span>
                <span className="text-xs font-rounded font-bold text-ink">
                  {isFr ? 'Tu pars quand et à quelle allure ?' : 'When are you rolling out?'}
                </span>
              </div>
              {loadedRoute && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isLoadingLoop}
                  onClick={() => void runLoopAnalysis(loadedRoute, rideDate, startTime, speedKmH)}
                  className={`min-h-[38px] px-4 rounded-full text-xs font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
                >
                  {isLoadingLoop ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5" />
                  )}
                  <span>{isFr ? 'Comparer les 2 sens' : 'Compare CW vs. CCW'}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-pod bg-pod p-3">
                <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                  {isFr ? 'Date de la sortie' : 'Ride date'}
                </label>
                <input
                  type="date"
                  value={rideDate}
                  onChange={(e) => setRideDate(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-sm font-rounded font-bold text-ink tnum focus:outline-none"
                />
              </div>
              <div className="rounded-pod bg-pod p-3">
                <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                  {isFr ? 'Heure de départ' : 'Start time'}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-sm font-rounded font-bold text-ink tnum focus:outline-none"
                />
              </div>
              <div className="rounded-pod bg-pod p-3">
                <div className="flex items-center justify-between text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                  <span>{isFr ? 'Allure cible' : 'Target pace'}</span>
                  <span className="text-ink font-bold tnum">{speedKmH} km/h</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={36}
                  step={1}
                  value={speedKmH}
                  onChange={(e) => setSpeedKmH(Number(e.target.value))}
                  className="peloton-slider w-full mt-1"
                />
              </div>
            </div>
          </div>

          {isLoadingLoop && (
            <div className="rounded-card bg-card p-8 text-center space-y-2 shadow-xs">
              <LoaderCircle className="w-7 h-7 animate-spin mx-auto text-sky-500" />
              <p className="text-sm font-rounded font-bold text-ink">
                {isFr
                  ? 'Analyse du vent heure par heure dans les deux sens…'
                  : 'Sampling hourly wind along both loop directions…'}
              </p>
            </div>
          )}

          {loopErrorMsg && !isLoadingLoop && (
            <div className="rounded-card bg-rose-500/10 text-rose-700 dark:text-rose-300 p-4 text-xs flex items-center gap-2.5">
              <TriangleAlert className="w-4 h-4 shrink-0" />
              <span>{loopErrorMsg}</span>
            </div>
          )}

          {!loadedRoute && !isLoadingLoop && (
            <div className="rounded-card bg-card p-6 sm:p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-pod mx-auto flex items-center justify-center text-sky-500">
                <Wind className="w-6 h-6" />
              </div>
              <h3 className="text-base font-rounded font-bold text-ink">
                {isFr
                  ? 'Ne finis plus jamais tes derniers kilomètres vent de face'
                  : 'Never suffer a brutal headwind on the final kilometers home'}
              </h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                {isFr
                  ? 'Importe une boucle GPX ci-dessus pour comparer le sens horaire et anti-horaire heure par heure. Pas de fichier sous la main ? Teste le vent en direct dans ta ville !'
                  : 'Drop a loop GPX or link above and Cadence automatically tests clockwise vs. counter-clockwise wind at your exact arrival time on every sector. No GPX handy? Check live wind from your city instead.'}
              </p>
              <div className="pt-1">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setMode('wind-tax')}
                  className="min-h-[44px] px-5 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-sky-500" />
                  <span>
                    {isFr
                      ? 'Pas de GPX ? Voir la meilleure direction dans ma ville'
                      : 'No GPX? Check best direction in my city'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Loop Verdict Result */}
          {analysis && loop && !isLoadingLoop && loadedRoute && (
            <div className="rounded-card bg-card p-4 sm:p-6 space-y-5 shadow-xs">
              <div
                className={`rounded-pod p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  shouldFlip
                    ? HERO_ACCENT_CARD_CLS
                    : loop.recommendedDirection === 'forward'
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                    : 'bg-pod text-ink'
                }`}
              >
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-rounded font-bold opacity-80">
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>
                      {analysis.source === 'simulated'
                        ? isFr
                          ? 'Estimation saisonnière (>14 j)'
                          : 'Seasonal estimate (>14 days out)'
                        : isFr
                        ? 'Verdict météo horaire par secteur'
                        : 'Hourly sector wind verdict'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-rounded tracking-tight">
                    {loop.recommendedDirection === 'neutral'
                      ? isFr
                        ? 'Vent équilibré dans les deux sens'
                        : 'Balanced wind in both directions'
                      : shouldFlip
                      ? isFr
                        ? `Inversez la boucle (${reverseLabel})`
                        : `Flip the loop (${reverseLabel})`
                      : isFr
                      ? `Gardez ce sens (${forwardLabel})`
                      : `Keep this direction (${forwardLabel})`}
                  </h3>
                  <p className="text-xs opacity-85">
                    {loop.recommendedDirection === 'neutral'
                      ? isFr
                        ? 'Moins de 2 minutes d’écart entre les deux sens — choisis selon tes bosses ou tes cafés.'
                        : 'Less than 2 min difference — pick whichever way puts your climbs or coffee stop where you want.'
                      : minutesSaved >= 1 && wattsSaved >= 1
                      ? isFr
                        ? `Économise environ ${minutesSaved} min et ${wattsSaved} W d’effort moyen sur ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`
                        : `Saves roughly ${minutesSaved} min and ${wattsSaved} W average effort over ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`
                      : wattsSaved >= 1
                      ? isFr
                        ? `Économise environ ${wattsSaved} W d’effort moyen sur ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`
                        : `Saves roughly ${wattsSaved} W average effort over ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`
                      : isFr
                      ? `Économise environ ${minutesSaved} min sur ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`
                      : `Saves roughly ${minutesSaved} min over ${loadedRoute.parsed.distanceKm.toFixed(1)} km.`}
                  </p>
                </div>

                {loop.recommendedDirection !== 'neutral' && (minutesSaved >= 1 || wattsSaved >= 1) && (
                  <div className="flex items-center gap-3 shrink-0">
                    {minutesSaved >= 1 && (
                      <div className="rounded-sub-pod bg-black/10 dark:bg-white/10 px-3.5 py-2 text-center">
                        <div className="text-xl font-extrabold font-rounded tnum">
                          −{minutesSaved} min
                        </div>
                        <div className="text-[10px] font-semibold opacity-80">
                          {isFr ? 'Gagné' : 'Saved'}
                        </div>
                      </div>
                    )}
                    {wattsSaved >= 1 && (
                      <div className="rounded-sub-pod bg-black/10 dark:bg-white/10 px-3.5 py-2 text-center">
                        <div className="text-xl font-extrabold font-rounded tnum">−{wattsSaved} W</div>
                        <div className="text-[10px] font-semibold opacity-80">
                          {isFr ? 'Effort' : 'Effort'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'forward',
                    label: forwardLabel,
                    totalMin: loop.forwardTotalMin,
                    avgW: loop.forwardAvgWatts,
                    isWinner: loop.recommendedDirection === 'forward',
                  },
                  {
                    key: 'reverse',
                    label: reverseLabel,
                    totalMin: loop.reverseTotalMin,
                    avgW: loop.reverseAvgWatts,
                    isWinner: loop.recommendedDirection === 'reverse',
                  },
                ].map((side) => (
                  <div
                    key={side.key}
                    className={`rounded-pod p-4 space-y-2 ${
                      side.isWinner
                        ? 'bg-pod ring-2 ring-inset ring-emerald-500/45'
                        : 'bg-pod/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-ink-secondary" />
                        <span>{side.label}</span>
                      </span>
                      {side.isWinner && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-rounded font-bold">
                          {isFr ? 'Meilleur vent' : 'Better wind'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-4 pt-1">
                      <div>
                        <div className="text-[11px] text-ink-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{isFr ? 'Temps roulé' : 'Moving time'}</span>
                        </div>
                        <div className="text-lg font-extrabold font-rounded text-ink tnum">
                          {formatMin(side.totalMin)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-ink-muted flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{isFr ? 'Effort moy.' : 'Avg effort'}</span>
                        </div>
                        <div className="text-lg font-extrabold font-rounded text-ink tnum">
                          {Math.round(side.avgW)} W
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {analysis.sectors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-rounded font-bold text-ink-secondary">
                    {isFr ? 'Vent par secteur (sens original)' : 'Wind by route sector (original direction)'}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {analysis.sectors.slice(0, 8).map((sec) => {
                      const isHead = sec.effectiveHeadwindKmH > 4;
                      const isTail = sec.effectiveHeadwindKmH < -4;
                      return (
                        <div key={sec.index} className="rounded-sub-pod bg-pod p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-ink-muted tnum">
                            <span>
                              km {Math.round(sec.startKm)}–{Math.round(sec.endKm)}
                            </span>
                            <span>{sec.etaHHMM}</span>
                          </div>
                          <div
                            className={`font-rounded font-bold tnum ${
                              isHead
                                ? 'text-rose-600 dark:text-rose-400'
                                : isTail
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-ink'
                            }`}
                          >
                            {isHead
                              ? `${isFr ? 'Face' : 'Head'} +${Math.round(sec.effectiveHeadwindKmH)} km/h`
                              : isTail
                              ? `${isFr ? 'Dos' : 'Tail'} ${Math.abs(Math.round(sec.effectiveHeadwindKmH))} km/h`
                              : `${isFr ? 'Travers' : 'Cross'} ${Math.round(sec.windSpeedKmH)} km/h`}
                          </div>
                          <div className="text-[11px] text-ink-muted tnum">
                            {sec.temperatureC} °C · {sec.windCardinal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {onOpenTripInCadence && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleOpenFullLoopPlan}
                  className={`w-full min-h-[48px] px-5 rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
                >
                  <span>
                    {shouldFlip
                      ? isFr
                        ? 'Ouvrir le plan complet (boucle inversée)'
                        : 'Open full Ride Plan (flipped direction)'
                      : isFr
                      ? 'Ouvrir le plan complet dans Cadence'
                      : 'Open full Ride Plan in Cadence'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODE 2: TODAY'S WIND & "THE INVISIBLE HILL" (ZERO POWER METER NEEDED!)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'wind-tax' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-apple-step-in">
          {/* Left: Live Weather + Rider Controls */}
          <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
                {isFr
                  ? 'Quel mur invisible le vent crée-t-il aujourd’hui ?'
                  : 'What invisible hill is today’s wind creating?'}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                {isFr
                  ? 'Charge la météo de ta ville pour savoir dans quel sens partir (vent de dos au retour) et voir ce que le vent coûte vraiment en pente, temps et énergie.'
                  : 'Pull live wind for your city to see which way to head out for a tailwind home, and what today’s wind really feels like in hill grade, time, and food.'}
              </p>
            </div>

            <ToolLiveWeatherBar
              lang={lang}
              date={rideDate}
              time={startTime}
              titleEn="Fetch live wind speed & compass direction"
              titleFr="Charger le vent réel et sa direction"
              subtitleEn="Shows which direction to head out into so you roll home with a tailwind."
              subtitleFr="Indique vers quel cap partir pour rentrer avec le vent dans le dos."
              onDateChange={setRideDate}
              onTimeChange={setStartTime}
              onWeatherFetched={handleWeatherFetched}
            />

            {/* Bike type */}
            <div className="grid grid-cols-3 gap-2">
              {BIKE_PROFILE_PRESETS.map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setBikeId(p.id)}
                  className={`min-h-[42px] px-3 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                    bikeId === p.id ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                  }`}
                >
                  {isFr ? p.labelFr : p.labelEn}
                </Button>
              ))}
            </div>

            {/* Ride distance & usual speed — about you, not the weather */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-pod bg-pod p-3.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-rounded font-semibold text-ink-secondary">
                    {isFr ? 'Distance' : 'Ride distance'}
                  </span>
                  <span className="font-rounded font-bold text-ink tnum">{distanceKm} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={160}
                  step={5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="peloton-slider w-full"
                />
              </div>

              <div className="rounded-pod bg-pod p-3.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-rounded font-semibold text-ink-secondary">
                    {isFr ? 'Ton allure habituelle' : 'Your usual speed'}
                  </span>
                  <span className="font-rounded font-extrabold text-ink tnum">{speedKmH} km/h</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={40}
                  step={1}
                  value={speedKmH}
                  onChange={(e) => setSpeedKmH(Number(e.target.value))}
                  className="peloton-slider w-full"
                />
              </div>
            </div>

            {/* When live weather is loaded: simple human direction pick */}
            {liveLocation && windInsight.outboundIntoWindCardinal && (
              <div>
                <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                  {isFr ? 'Tu pars dans quel sens ?' : 'Which way are you heading out?'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        deg: 0,
                        labelEn: `Into ${windInsight.outboundIntoWindCardinal}`,
                        labelFr: `Face au ${windInsight.outboundIntoWindCardinal}`,
                      },
                      { deg: 90, labelEn: 'Crosswind', labelFr: 'Travers' },
                      {
                        deg: 180,
                        labelEn: `With ${windInsight.outboundIntoWindCardinal}`,
                        labelFr: `Dos au ${windInsight.outboundIntoWindCardinal}`,
                      },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.deg}
                      variant="ghost"
                      size="sm"
                      onClick={() => setWindAngleDeg(opt.deg)}
                      className={`min-h-[40px] px-2.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                        windAngleDeg === opt.deg ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                      }`}
                    >
                      {isFr ? opt.labelFr : opt.labelEn}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible manual wind & weight controls — tucked out of sight unless needed */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowManualWind((v) => !v)}
                aria-expanded={showManualWind}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-pod bg-pod/70 hover:bg-pod text-xs font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {liveLocation
                      ? isFr
                        ? 'Simuler un autre vent ou ajuster ton poids'
                        : 'Tweak wind or rider weight manually'
                      : isFr
                      ? 'Ou régler le vent et ton poids manuellement'
                      : 'Or set wind & rider weight manually'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted tnum shrink-0">
                  <span>
                    {windSpeedKmH} km/h · {riderMassKg} kg
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showManualWind ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </button>

              {showManualWind && (
                <div className="space-y-3 animate-apple-fade-in">
                  <div>
                    <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                      {isFr ? 'Orientation du vent par rapport à toi' : 'Wind relative to your bike'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {WIND_ANGLE_PRESETS.map((a) => (
                        <Button
                          key={a.deg}
                          variant="ghost"
                          size="sm"
                          onClick={() => setWindAngleDeg(a.deg)}
                          className={`min-h-[40px] px-3 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                            windAngleDeg === a.deg ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                          }`}
                        >
                          {isFr ? a.labelFr : a.labelEn}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-pod bg-pod p-3.5">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-rounded font-semibold text-ink-secondary">
                          {liveLocation
                            ? `${isFr ? 'Vent' : 'Wind'} (${liveLocation})`
                            : isFr
                            ? 'Force du vent'
                            : 'Wind speed'}
                        </span>
                        <span className="font-rounded font-extrabold text-ink tnum">{windSpeedKmH} km/h</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={55}
                        step={1}
                        value={windSpeedKmH}
                        onChange={(e) => setWindSpeedKmH(Number(e.target.value))}
                        className="peloton-slider w-full"
                      />
                    </div>

                    <div className="rounded-pod bg-pod p-3.5">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-rounded font-semibold text-ink-secondary">
                          {isFr ? 'Ton poids' : 'Rider weight'}
                        </span>
                        <span className="font-rounded font-bold text-ink tnum">{riderMassKg} kg</span>
                      </div>
                      <input
                        type="range"
                        min={45}
                        max={125}
                        step={1}
                        value={riderMassKg}
                        onChange={(e) => setRiderMassKg(Number(e.target.value))}
                        className="peloton-slider w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Authentic, Screenshot-Worthy Invisible Hill Card (Calm obsidian-volt in dark mode!) */}
          <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-sky-600 dark:text-sky-400">
                <Mountain className="w-4 h-4" />
                <span>{isFr ? 'L’effet côte invisible' : 'The Invisible Hill effect'}</span>
              </span>
              <span className="text-[11px] text-ink-muted tnum">
                {windSpeedKmH} km/h · {distanceKm} km
                {liveGustsKmH && liveGustsKmH > windSpeedKmH + 4
                  ? ` · ${isFr ? 'raf.' : 'gusts'} ${liveGustsKmH}`
                  : ''}
              </span>
            </div>

            {/* Live Compass "Smartest Direction to Ride Out" Banner */}
            {windInsight.outboundIntoWindCardinal && windInsight.returnTailwindCardinal && (
              <div className="rounded-pod bg-sky-500/10 text-sky-900 dark:text-sky-200 p-3.5 flex items-center gap-3 ring-1 ring-inset ring-sky-500/20">
                <div className="w-11 h-11 rounded-full bg-card ring-1 ring-inset ring-sky-500/20 flex items-center justify-center shrink-0">
                  <Navigation
                    className="w-5 h-5 text-sky-600 dark:text-sky-400 transition-transform duration-300"
                    style={{ transform: `rotate(${windInsight.outboundIntoWindDeg ?? 0}deg)` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-rounded font-extrabold leading-snug">
                    {isFr
                      ? `Pars vers ${windInsight.outboundIntoWindCardinal} → rentre vent de dos (${windInsight.returnTailwindCardinal})`
                      : `Head out ${windInsight.outboundIntoWindCardinal} → roll home with a ${windInsight.returnTailwindCardinal} tailwind`}
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug mt-0.5">
                    {isFr
                      ? `À ${liveLocation}, le vent souffle de ${windInsight.outboundIntoWindCardinal} (${windSpeedKmH} km/h). Affronte-le à l’aller tant que les jambes sont fraîches.`
                      : `In ${liveLocation}, wind blows from the ${windInsight.outboundIntoWindCardinal} (${windSpeedKmH} km/h). Face it early while fresh, then enjoy the spin home.`}
                  </p>
                </div>
              </div>
            )}

            {/* Refined Obsidian-Volt Hero Invisible Hill Card (Zero radioactive burn in Dark Mode!) */}
            <div className={`rounded-pod p-5 space-y-3 ${HERO_ACCENT_CARD_CLS}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-rounded font-bold opacity-80">
                    {windInsight.equivalentGradePct >= 0.2
                      ? isFr
                        ? 'Sur le plat, ce vent donne la sensation de grimper :'
                        : 'On flat ground, this wind feels like climbing:'
                      : windInsight.equivalentGradePct <= -0.2
                      ? isFr
                        ? 'Coup de pouce gratuit — sensation de descente :'
                        : 'Free tailwind push — feels like rolling downhill:'
                      : isFr
                      ? 'Impact sur le plat :'
                      : 'Flat-road impact:'}
                  </div>
                  <div className="text-4xl sm:text-5xl font-extrabold font-rounded tnum tracking-tight mt-1 leading-none">
                    {windInsight.equivalentGradePct >= 0 ? '+' : ''}
                    {windInsight.equivalentGradePct.toFixed(1)}%
                    <span className="text-base sm:text-lg font-bold ml-2 opacity-80">
                      {isFr ? 'de pente' : 'grade'}
                    </span>
                  </div>
                </div>

                {/* Miniature visual slope SVG inheriting refined currentColor */}
                <svg viewBox="0 0 90 48" className="w-20 h-11 shrink-0" aria-hidden="true">
                  <line
                    x1="4"
                    y1="40"
                    x2="86"
                    y2="40"
                    stroke="currentColor"
                    strokeOpacity="0.28"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d={
                      windInsight.equivalentGradePct >= 0
                        ? `M 4 40 L 86 ${Math.max(8, 40 - Math.min(30, windInsight.equivalentGradePct * 8))} L 86 40 Z`
                        : `M 4 14 L 86 ${Math.min(40, 14 + Math.min(26, Math.abs(windInsight.equivalentGradePct) * 8))} L 86 40 L 4 40 Z`
                    }
                    fill="currentColor"
                    fillOpacity="0.16"
                  />
                  <line
                    x1="4"
                    y1={windInsight.equivalentGradePct >= 0 ? 40 : 14}
                    x2="86"
                    y2={
                      windInsight.equivalentGradePct >= 0
                        ? Math.max(8, 40 - Math.min(30, windInsight.equivalentGradePct * 8))
                        : Math.min(40, 14 + Math.min(26, Math.abs(windInsight.equivalentGradePct) * 8))
                    }
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold opacity-95 tnum">
                  {windInsight.ghostElevationM >= 0
                    ? isFr
                      ? `= +${windInsight.ghostElevationM} m de dénivelé fantôme sur tes ${distanceKm} km`
                      : `= +${windInsight.ghostElevationM} m of ghost climbing across your ${distanceKm} km`
                    : isFr
                    ? `= ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite sur tes ${distanceKm} km`
                    : `= ${Math.abs(windInsight.ghostElevationM)} m of free downhill across your ${distanceKm} km`}
                </div>
                {windInsight.iconicClimbComparison && (
                  <div className="text-[11px] font-rounded font-semibold opacity-80">
                    {windInsight.iconicClimbComparison}
                  </div>
                )}
              </div>
            </div>

            {/* 2 Unambiguous Human Insight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-pod bg-pod p-3.5 space-y-1">
                <div className="text-[11px] text-ink-muted flex items-center gap-1 font-rounded font-semibold">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isFr ? 'À ton effort habituel' : 'At your normal effort'}</span>
                </div>
                <div className="text-xl font-extrabold font-rounded text-ink tnum">
                  {windInsight.sameEffortSpeedKmH} km/h
                  <span
                    className={`text-xs font-bold ml-1.5 ${
                      windInsight.speedDeltaKmH < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    ({windInsight.speedDeltaKmH >= 0 ? '+' : ''}
                    {windInsight.speedDeltaKmH} km/h)
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted tnum">
                  {windInsight.timeDeltaMin > 0
                    ? isFr
                      ? `+${windInsight.timeDeltaMin} min de plus (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTimeMin)} sans vent)`
                      : `+${windInsight.timeDeltaMin} min slower (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTimeMin)} calm)`
                    : windInsight.timeDeltaMin < 0
                    ? isFr
                      ? `${Math.abs(windInsight.timeDeltaMin)} min gagnées (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTimeMin)})`
                      : `${Math.abs(windInsight.timeDeltaMin)} min faster (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTimeMin)})`
                    : isFr
                    ? `Temps identique (${formatMin(windInsight.calmTimeMin)})`
                    : `Same ride time (${formatMin(windInsight.calmTimeMin)})`}
                </div>
              </div>

              <div className="rounded-pod bg-pod p-3.5 space-y-1">
                <div className="text-[11px] text-ink-muted flex items-center gap-1 font-rounded font-semibold">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    {windInsight.extraWindKcal >= 0
                      ? isFr
                        ? 'Brûlé en plus par le vent seul'
                        : 'Extra burned by wind alone'
                      : isFr
                      ? 'Économisé grâce au vent de dos'
                      : 'Energy saved by tailwind'}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xl font-extrabold font-rounded text-ink tnum">
                  <span>
                    {windInsight.extraWindKcal >= 0 ? '+' : ''}
                    {windInsight.extraWindKcal} kcal
                  </span>
                  {windInsight.extraCroissants >= 0.4 && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      ≈ {windInsight.extraCroissants} croissant{windInsight.extraCroissants >= 1.5 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-muted tnum">
                  {isFr
                    ? `Total sortie : ${windInsight.totalRideKcal} kcal (${windInsight.calmRideKcal} sans vent)`
                    : `Total ride burn: ${windInsight.totalRideKcal} kcal (${windInsight.calmRideKcal} calm)`}
                </div>
              </div>
            </div>

            {/* Plain-English Air Resistance + Optional Power-Meter Badge */}
            <div className="rounded-pod bg-pod p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-rounded font-bold text-ink">
                  {isFr
                    ? `Résistance de l’air : ${windInsight.airResistanceSharePct} % de ton effort`
                    : `Pushing through air: ${windInsight.airResistanceSharePct}% of your total effort`}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {isFr
                    ? 'Part de ton pédalage consacrée uniquement à fendre le vent (le reste étant les pneus).'
                    : 'How much of your pedaling goes strictly into fighting the wind (the rest is tyre rolling).'}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-card text-[11px] font-rounded font-bold text-ink-secondary tnum inline-flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>
                  {isFr ? 'Capteur puissance :' : 'Power meter:'}{' '}
                  {windInsight.deltaWatts >= 0 ? `+${windInsight.deltaWatts}` : windInsight.deltaWatts} W (
                  {windInsight.windyWatts} W)
                </span>
              </span>
            </div>

            {onOpenTripInCadence && (
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  onOpenTripInCadence(
                    buildTripFromToolRoute({
                      distanceKm,
                      speedKmH,
                      departureDate: rideDate,
                      departureTime: startTime,
                      windSpeedKmH,
                      temperatureC: liveTempC,
                      riderSpecs,
                      lang,
                    })
                  )
                }
                className={`w-full min-h-[48px] rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
              >
                <span>
                  {isFr ? 'Ouvrir le plan complet dans Cadence' : 'Open full Ride Plan in Cadence'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
