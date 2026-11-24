import React, { useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Gauge,
  TriangleAlert,
  ShieldCheck,
  LoaderCircle,
  ArrowRight,
} from '@/components/icons';
import {
  BikeCategory,
  CasingType,
  PressureUnit,
  RiderBikeSpecs,
} from '../../types/specs';
import { TripProfile } from '../../types/trip';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { barToPsi, calculateTyrePressure } from '../../utils/tyrePressure';
import { fetchOsmSurfaceForRoute } from '../../services/osmSurfaceService';
import { computeSurfaceBreakdown } from '../../utils/surfaceProfile';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { LoadedToolRoute, ToolRouteDropzone } from './ToolRouteDropzone';
import { YELLOW_VEST_SOLID_CTA_CLASSES } from '../../tokens/chipTokens';

export interface TyrePressureToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

const ACTIVE_PILL_CLS =
  'bg-[#111111] text-white dark:bg-chip dark:text-ink dark:ring-1 dark:ring-inset dark:ring-white/20 shadow-xs';
const INACTIVE_PILL_CLS = 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink';
const HERO_ACCENT_CARD_CLS =
  'bg-[#faffcb] text-[#3a3f00] ring-1 ring-inset ring-[#a3b300]/35 dark:bg-[#1e2108] dark:text-[#e3ff00] dark:ring-[#dfff00]/30';

export const TyrePressureTool: React.FC<TyrePressureToolProps> = ({
  lang,
  activeTrip,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const [loadedRoute, setLoadedRoute] = useState<LoadedToolRoute | null>(null);
  const [isScanningSurface, setIsScanningSurface] = useState(false);
  const [detectedMix, setDetectedMix] = useState<{
    pavedPct: number;
    gravelPct: number;
    singletrackPct: number;
  } | null>(null);

  const [riderKg, setRiderKg] = useState<number>(() => riderSpecs?.riderWeightKg ?? 74);
  const [bikeKg, setBikeKg] = useState<number>(10);
  const [luggageKg, setLuggageKg] = useState<number>(2);
  const [widthMm, setWidthMm] = useState<number>(38);
  const [category, setCategory] = useState<BikeCategory>('gravel');
  const [casing, setCasing] = useState<CasingType>('standard');
  const [isTubeless, setIsTubeless] = useState<boolean>(true);
  const [isHookless, setIsHookless] = useState<boolean>(false);
  const [surfaceMix, setSurfaceMix] = useState<'paved' | 'mixed' | 'gravel'>('mixed');
  const [isWet, setIsWet] = useState<boolean>(false);
  const [unit, setUnit] = useState<PressureUnit>(() => {
    const src = riderSpecs || loadRiderBikeSpecs();
    return src.pressureUnit === 'psi' ? 'psi' : 'bar';
  });

  const handleRouteLoaded = async (loaded: LoadedToolRoute) => {
    setLoadedRoute(loaded);
    setDetectedMix(null);
    setIsScanningSurface(true);
    try {
      const osmData = await fetchOsmSurfaceForRoute({
        coordinates: loaded.parsed.coordinates,
        distanceKm: loaded.parsed.distanceKm,
      });
      const breakdown = computeSurfaceBreakdown(
        {
          origin: loaded.parsed.originLabel,
          destination: loaded.parsed.destLabel,
          distanceKm: loaded.parsed.distanceKm,
          elevationGainM: loaded.parsed.elevationGainM,
          targetSpeedKmH: 24,
          pacingMode: 'speed',
          urbanTrafficDelayMinutes: 0,
          gateSecurityDelayMinutes: 0,
          coordinates: loaded.parsed.coordinates,
        },
        {
          osmData,
          tireWidthMm: widthMm,
          isTubeless,
        }
      );
      setDetectedMix({
        pavedPct: breakdown.pavedPct,
        gravelPct: breakdown.gravelPct,
        singletrackPct: breakdown.singletrackPct,
      });
    } catch {
      setDetectedMix(null);
    } finally {
      setIsScanningSurface(false);
    }
  };

  const totalSystemKg = Number((riderKg + bikeKg + luggageKg).toFixed(1));

  const tpResult = useMemo(() => {
    const surfacePcts = detectedMix
      ? detectedMix
      : surfaceMix === 'paved'
      ? { pavedPct: 100, gravelPct: 0, singletrackPct: 0 }
      : surfaceMix === 'mixed'
      ? { pavedPct: 55, gravelPct: 40, singletrackPct: 5 }
      : { pavedPct: 15, gravelPct: 65, singletrackPct: 20 };

    return calculateTyrePressure({
      systemMassKg: totalSystemKg,
      tireWidthMm: widthMm,
      bikeCategory: category,
      casingType: casing,
      isTubeless,
      isHookless,
      ...surfacePcts,
      gearWeightKg: luggageKg,
    });
  }, [totalSystemKg, widthMm, category, casing, isTubeless, isHookless, surfaceMix, detectedMix, luggageKg]);

  const frontBar = Number(Math.max(1.2, tpResult.frontBar - (isWet ? 0.2 : 0)).toFixed(1));
  const rearBar = Number(Math.max(1.3, tpResult.rearBar - (isWet ? 0.2 : 0)).toFixed(1));
  const diffBar = Number((rearBar - frontBar).toFixed(1));

  return (
    <div className="space-y-5">
      <ToolRouteDropzone
        toolId="tyre-pressure"
        lang={lang}
        route={loadedRoute}
        activeTrip={activeTrip}
        headlineEn="Have a route file or link? Auto-detect paved vs. gravel roads"
        headlineFr="Tu as un parcours ? Détecte automatiquement la part de bitume et de chemins"
        sublineEn="Optional — drop a .GPX/.FIT or paste a Komoot/Strava link to read real surfaces, or pick your terrain manually below."
        sublineFr="Optionnel — dépose un .GPX/.FIT ou colle un lien Komoot/Strava pour lire le terrain, ou choisis manuellement ci-dessous."
        onRouteLoaded={(r) => void handleRouteLoaded(r)}
        onClear={() => {
          setLoadedRoute(null);
          setDetectedMix(null);
        }}
      />

      {isScanningSurface && (
        <div className="rounded-pod bg-card px-4 py-3 text-xs text-ink-secondary flex items-center gap-2 shadow-xs">
          <LoaderCircle className="w-4 h-4 animate-spin text-teal-500" />
          <span>
            {isFr
              ? 'Lecture des revêtements réels sur ton parcours…'
              : 'Reading real road & trail surfaces along your route…'}
          </span>
        </div>
      )}

      {detectedMix && !isScanningSurface && (
        <div className="rounded-pod bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-rounded font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {isFr ? 'Surface détectée sur ton parcours :' : 'Detected route surfaces:'}
            </span>
          </span>
          <span className="tnum font-semibold">
            {detectedMix.pavedPct}% {isFr ? 'bitume' : 'paved'} · {detectedMix.gravelPct}% gravel ·{' '}
            {detectedMix.singletrackPct}% {isFr ? 'sentier' : 'trail'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Inputs */}
        <div className="lg:col-span-7 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
                {isFr
                  ? 'Ton vélo & ton chargement'
                  : 'Your rider, bike & luggage setup'}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {isFr
                  ? 'Méthode de déformation à 15 %, répartition avant/arrière et plafond de sécurité hookless 5,0 bar.'
                  : '15% tyre-drop math, front/rear load split, and ETRTO 5.0 bar hookless safety cap.'}
              </p>
            </div>
            <div className="inline-flex rounded-full bg-pod p-1">
              {(['bar', 'psi'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`min-h-[34px] px-3 rounded-full text-xs font-rounded font-bold uppercase cursor-pointer ${
                    unit === u ? ACTIVE_PILL_CLS : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-pod bg-pod p-3.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Ton poids' : 'Your weight'}
                </span>
                <span className="font-rounded font-extrabold text-ink tnum">{riderKg} kg</span>
              </div>
              <input
                type="range"
                min={45}
                max={130}
                step={1}
                value={riderKg}
                onChange={(e) => setRiderKg(Number(e.target.value))}
                className="peloton-slider w-full"
              />
            </div>

            <div className="rounded-pod bg-pod p-3.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Poids du vélo' : 'Bike weight'}
                </span>
                <span className="font-rounded font-extrabold text-ink tnum">{bikeKg} kg</span>
              </div>
              <input
                type="range"
                min={6}
                max={25}
                step={0.5}
                value={bikeKg}
                onChange={(e) => setBikeKg(Number(e.target.value))}
                className="peloton-slider w-full"
              />
            </div>

            <div className="rounded-pod bg-pod p-3.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Bagages / sacoches' : 'Luggage / bags'}
                </span>
                <span className="font-rounded font-extrabold text-ink tnum">{luggageKg} kg</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={0.5}
                value={luggageKg}
                onChange={(e) => setLuggageKg(Number(e.target.value))}
                className="peloton-slider w-full"
              />
            </div>
          </div>

          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Largeur de pneu mesurée' : 'Tyre width'}
              </span>
              <span className="font-rounded font-extrabold text-ink tnum">{widthMm} mm</span>
            </div>
            <input
              type="range"
              min={23}
              max={60}
              step={1}
              value={widthMm}
              onChange={(e) => setWidthMm(Number(e.target.value))}
              className="peloton-slider w-full"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[28, 32, 38, 42, 45, 50].map((mm) => (
                <button
                  key={mm}
                  type="button"
                  onClick={() => setWidthMm(mm)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold tnum cursor-pointer ${
                    widthMm === mm ? ACTIVE_PILL_CLS : 'bg-card text-ink-muted hover:text-ink'
                  }`}
                >
                  {mm} mm
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'road', en: 'Road', fr: 'Route' },
                { id: 'gravel', en: 'Gravel', fr: 'Gravel' },
                { id: 'touring', en: 'Loaded / Touring', fr: 'Voyage / Chargé' },
                { id: 'mtb', en: 'MTB', fr: 'VTT' },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.id}
                variant="ghost"
                size="sm"
                onClick={() => setCategory(opt.id)}
                className={`min-h-[42px] px-3 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                  category === opt.id ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                }`}
              >
                {isFr ? opt.fr : opt.en}
              </Button>
            ))}
          </div>

          {!detectedMix && (
            <div>
              <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                {isFr ? 'Terrain dominant' : 'Terrain'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'paved', en: 'Smooth tarmac', fr: 'Bitume' },
                    { id: 'mixed', en: 'Mixed / All-road', fr: 'Mixte / Chemins' },
                    { id: 'gravel', en: 'Rough gravel', fr: 'Gravel / Sentiers' },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSurfaceMix(opt.id)}
                    className={`min-h-[42px] px-3 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                      surfaceMix === opt.id ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                    }`}
                  >
                    {isFr ? opt.fr : opt.en}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isTubeless}
              onClick={() => setIsTubeless((v) => !v)}
              className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                isTubeless ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
              }`}
            >
              {isTubeless ? 'Tubeless' : isFr ? 'Chambre à air' : 'Inner tube'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isHookless}
              onClick={() => setIsHookless((v) => !v)}
              className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                isHookless ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
              }`}
            >
              {isFr ? 'Jante Hookless (max 5 bar)' : 'Hookless rim (5 bar max)'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isWet}
              onClick={() => setIsWet((v) => !v)}
              className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                isWet ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
              }`}
            >
              {isFr ? 'Route mouillée (−0,2 bar)' : 'Wet roads (−0.2 bar)'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCasing((c) => (c === 'supple' ? 'standard' : c === 'standard' ? 'reinforced' : 'supple'))
              }
              className="min-h-[40px] px-3.5 rounded-full bg-pod hover:bg-chip text-xs font-rounded font-semibold text-ink cursor-pointer"
            >
              {isFr ? 'Carcasse :' : 'Casing:'}{' '}
              {casing === 'supple'
                ? isFr
                  ? 'Souple'
                  : 'Supple'
                : casing === 'reinforced'
                ? isFr
                  ? 'Renforcée'
                  : 'Reinforced'
                : 'Standard'}
            </Button>
          </div>
        </div>

        {/* Right: Pressure Output */}
        <div className="lg:col-span-5 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-teal-600 dark:text-teal-400">
              <Gauge className="w-4 h-4" />
              <span>{isFr ? 'Pression recommandée' : 'Recommended pressure'}</span>
            </span>
            <span className="text-[11px] text-ink-muted tnum">
              {totalSystemKg.toFixed(1)} kg · {widthMm} mm
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-pod p-4 ${HERO_ACCENT_CARD_CLS}`}>
              <div className="text-[11px] font-rounded font-bold opacity-80">
                {isFr ? 'Pneu avant' : 'Front tyre'}
              </div>
              <div className="text-3xl font-extrabold font-rounded tnum mt-1 leading-none">
                {unit === 'psi' ? barToPsi(frontBar) : frontBar.toFixed(1)}
                <span className="text-sm font-bold ml-1">{unit === 'psi' ? 'PSI' : 'bar'}</span>
              </div>
              <div className="text-[11px] opacity-80 tnum mt-1.5">
                {unit === 'psi' ? `${frontBar.toFixed(1)} bar` : `${barToPsi(frontBar)} PSI`}
              </div>
            </div>

            <div className="rounded-pod bg-pod p-4">
              <div className="text-[11px] font-rounded font-semibold text-ink-muted">
                {isFr ? 'Pneu arrière' : 'Rear tyre'}
              </div>
              <div className="text-3xl font-extrabold font-rounded text-ink tnum mt-1 leading-none">
                {unit === 'psi' ? barToPsi(rearBar) : rearBar.toFixed(1)}
                <span className="text-sm font-semibold text-ink-muted ml-1">
                  {unit === 'psi' ? 'PSI' : 'bar'}
                </span>
              </div>
              <div className="text-[11px] text-ink-muted tnum mt-1.5">
                {unit === 'psi' ? `${rearBar.toFixed(1)} bar` : `${barToPsi(rearBar)} PSI`}
              </div>
            </div>
          </div>

          {tpResult.hooklessCapped && (
            <div className="rounded-pod bg-amber-500/12 text-amber-900 dark:text-amber-200 px-3.5 py-2.5 text-xs flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isFr
                  ? 'Plafonné à 5,0 bar (72,5 PSI) selon la norme de sécurité ETRTO Hookless.'
                  : 'Capped at 5.0 bar (72.5 PSI) per ETRTO hookless rim safety limits.'}
              </span>
            </div>
          )}

          {/* Visual Front / Rear Weight Split + Smart Grip Insight */}
          <div className="rounded-pod bg-pod p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-rounded font-bold text-ink-secondary tnum">
              <span>
                {Math.round(tpResult.frontLoadPct)}% {isFr ? 'avant' : 'front'}
              </span>
              <span>
                {Math.round(tpResult.rearLoadPct)}% {isFr ? 'arrière' : 'rear'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-chip overflow-hidden flex">
              <div
                className="h-full bg-teal-500 rounded-l-full transition-all duration-300"
                style={{ width: `${Math.round(tpResult.frontLoadPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-secondary leading-snug pt-0.5">
              {diffBar > 0
                ? isFr
                  ? `Gonfler ${diffBar.toFixed(1)} bar de moins à l’avant absorbe les vibrations et garde le guidon collé en virage tout en évitant le pincement à l’arrière sur tes ${totalSystemKg} kg.`
                  : `Running ${diffBar.toFixed(1)} bar softer up front keeps steering planted over rough chatter while preventing pinch flats at the rear on your ${totalSystemKg} kg setup.`
                : isFr
                ? `Masse totale ${totalSystemKg} kg (${riderKg} + ${bikeKg} + ${luggageKg} kg). Ajuste ±0,2 bar selon ton confort.`
                : `Total system ${totalSystemKg} kg (${riderKg} + ${bikeKg} + ${luggageKg} kg). Fine-tune ±0.2 bar for feel.`}
            </p>
          </div>

          {onOpenTripInCadence && (
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                onOpenTripInCadence(
                  buildTripFromToolRoute({
                    parsed: loadedRoute?.parsed,
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
    </div>
  );
};
