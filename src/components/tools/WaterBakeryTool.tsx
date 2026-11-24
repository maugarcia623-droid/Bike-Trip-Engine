import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Droplets,
  Bakery,
  Cemetery,
  LoaderCircle,
  TriangleAlert,
  ShieldCheck,
  Clock,
  ArrowRight,
  MapPin,
  Route,
  Upload,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { StageAmenity } from '../../types/amenities';
import { fetchHourlyWeather, getLocalTodayIso } from '../../services/weatherService';
import {
  calculateAmenityEtaDetails,
  calculateWaterGaps,
  scanCorridorAmenities,
} from '../../services/overpassCorridor';
import { evaluateOpeningHoursAtArrival } from '../../utils/openingHours';
import { calculateHydrationPlan } from '../../utils/nutrition';
import { buildClimbAdjustedPacingCurve } from '../../utils/climbSplits';
import { formatCriticalGapAdvice, formatGapDetail } from '../../utils/waterGapCopy';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { buildTerrainSummaryFromProfile } from '../../utils/gpxParser';
import { LocationSuggestion } from '../../services/locationService';
import { LocationAutocompleteInput } from '../configurator/LocationAutocompleteInput';
import { LoadedToolRoute, ToolRouteDropzone } from './ToolRouteDropzone';
import {
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';

export interface WaterBakeryToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

type StopFilter = 'all' | 'food' | 'water';

const ACTIVE_PILL_CLS =
  'bg-[#111111] text-white dark:bg-chip dark:text-ink dark:ring-1 dark:ring-inset dark:ring-white/20 shadow-xs';
const INACTIVE_PILL_CLS = 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink';

export const WaterBakeryTool: React.FC<WaterBakeryToolProps> = ({
  lang,
  activeTrip,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const [inputMode, setInputMode] = useState<'ab' | 'gpx'>('ab');

  // Quick A → B route state (No GPX required!)
  const [originText, setOriginText] = useState('');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destText, setDestText] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [isRoutingAB, setIsRoutingAB] = useState(false);

  const [loadedRoute, setLoadedRoute] = useState<LoadedToolRoute | null>(null);
  const [rideDate, setRideDate] = useState<string>(() => getLocalTodayIso());
  const [startTime, setStartTime] = useState<string>('08:30');
  const [speedKmH, setSpeedKmH] = useState<number>(22);
  const [tempC, setTempC] = useState<number>(18);
  const [bottleSlots, setBottleSlots] = useState<1 | 2 | 3>(2);
  const [bidonSizeMl, setBidonSizeMl] = useState<500 | 650 | 750>(650);
  const [filter, setFilter] = useState<StopFilter>('all');

  const [amenities, setAmenities] = useState<StageAmenity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runScan = async (target: LoadedToolRoute, forceFresh = false) => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const startPt = target.parsed.coordinates[0];
      if (startPt) {
        fetchHourlyWeather(startPt[0], startPt[1], rideDate, startTime, 0)
          .then((w) => setTempC(Math.round(w.temperatureC)))
          .catch(() => {});
      }

      const results = await scanCorridorAmenities({
        coordinates: target.parsed.coordinates,
        totalDistanceKm: target.parsed.distanceKm,
        elevationProfile: target.parsed.elevationProfile,
        lang,
        forceFresh,
      });
      setAmenities(results);
      setHasScanned(true);
    } catch {
      setErrorMsg(
        isFr
          ? 'Le serveur cartographique répond lentement — réessayez dans quelques secondes.'
          : 'OpenStreetMap corridor scan timed out — retry in a few seconds.'
      );
      setAmenities([]);
      setHasScanned(false);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!loadedRoute) {
      setAmenities([]);
      setHasScanned(false);
      setErrorMsg(null);
      return;
    }
    void runScan(loadedRoute, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedRoute, lang]);

  const handlePlanABRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originText.trim() || !destText.trim()) return;
    setIsRoutingAB(true);
    setErrorMsg(null);
    try {
      const { calculateAutoBikeRoute } = await import('../../utils/routing');
      const calculated = await calculateAutoBikeRoute(
        originText.trim(),
        destText.trim(),
        originCoords,
        destCoords
      );
      if (!calculated || !calculated.coordinates || calculated.coordinates.length < 2) {
        throw new Error(
          isFr
            ? 'Impossible de calculer un itinéraire vélo entre ces deux lieux.'
            : 'Could not calculate a bike route between those two places.'
        );
      }
      const shortOrigin = originText.split(',')[0].trim();
      const shortDest = destText.split(',')[0].trim();
      const elevProfile = calculated.elevationProfile || [];
      const elevGain = Math.round(calculated.elevationGainM ?? 0);
      const terrainSummary = buildTerrainSummaryFromProfile(
        elevProfile,
        calculated.distanceKm,
        elevGain,
        `${shortOrigin} → ${shortDest}`,
        calculated.coordinates
      );
      setLoadedRoute({
        source: 'auto-route',
        parsed: {
          trackName: `${shortOrigin} → ${shortDest}`,
          originLabel: shortOrigin,
          destLabel: shortDest,
          distanceKm: calculated.distanceKm,
          elevationGainM: elevGain,
          elevationLossM: Math.round(calculated.elevationLossM ?? elevGain),
          coordinates: calculated.coordinates,
          elevationProfile: elevProfile,
          terrainSummary,
        },
      });
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isFr
            ? 'Itinéraire introuvable — vérifiez les noms ou déposez un fichier GPX.'
            : 'Could not route those places — pick suggestions from the list or drop a GPX.')
      );
    } finally {
      setIsRoutingAB(false);
    }
  };

  const analysis = useMemo(() => {
    if (!loadedRoute) return null;
    const distKm = loadedRoute.parsed.distanceKm;
    const rideHours = Math.max(0.5, distKm / Math.max(10, speedKmH));
    const hydration = calculateHydrationPlan({
      rideHours,
      tempC,
      legWatts: 165,
      bidonSizeMl,
      frameBottleSlots: bottleSlots,
    });

    const pacingCurve =
      loadedRoute.parsed.elevationProfile && loadedRoute.parsed.elevationProfile.length >= 2
        ? buildClimbAdjustedPacingCurve(
            loadedRoute.parsed.elevationProfile,
            distKm,
            speedKmH,
            (riderSpecs?.riderWeightKg ?? 72) + 10
          )
        : undefined;

    const waterGaps = hasScanned
      ? calculateWaterGaps(amenities, distKm, {
          sectorSpeedKmH: speedKmH,
          targetFluidMlPerHr: hydration.targetFluidMlPerHr,
          bidonSizeMl,
          frameBottleSlots: bottleSlots,
        })
      : null;

    const enrichedStops = amenities
      .filter((a) => a.category === 'food' || a.category === 'water' || a.category === 'cemetery')
      .map((a) => {
        const eta = calculateAmenityEtaDetails(startTime, a.routeKm, speedKmH, pacingCurve);
        const openingVerdict = evaluateOpeningHoursAtArrival(
          a.openingHours,
          rideDate,
          eta.etaHHMM,
          lang
        );
        return {
          amenity: a,
          etaHHMM: eta.etaHHMM,
          openingVerdict,
        };
      })
      .sort((a, b) => a.amenity.routeKm - b.amenity.routeKm);

    const foodStops = enrichedStops.filter((s) => s.amenity.category === 'food');
    const waterStops = enrichedStops.filter(
      (s) => s.amenity.category === 'water' || s.amenity.category === 'cemetery'
    );
    const openBakeriesCount = foodStops.filter(
      (s) => s.openingVerdict?.status === 'open' || s.openingVerdict?.status === 'closing-soon'
    ).length;
    const closedBakeriesCount = foodStops.filter(
      (s) => s.openingVerdict?.status === 'closed'
    ).length;

    return {
      hydration,
      waterGaps,
      enrichedStops,
      foodStops,
      waterStops,
      openBakeriesCount,
      closedBakeriesCount,
    };
  }, [
    loadedRoute,
    amenities,
    hasScanned,
    speedKmH,
    tempC,
    bidonSizeMl,
    bottleSlots,
    startTime,
    rideDate,
    lang,
    riderSpecs?.riderWeightKg,
  ]);

  const visibleStops = useMemo(() => {
    if (!analysis) return [];
    if (filter === 'food') return analysis.foodStops;
    if (filter === 'water') return analysis.waterStops;
    return analysis.enrichedStops;
  }, [analysis, filter]);

  const handleOpenFullPlan = () => {
    if (!onOpenTripInCadence || !loadedRoute) return;
    const trip = buildTripFromToolRoute({
      parsed: loadedRoute.parsed,
      speedKmH,
      departureDate: rideDate,
      departureTime: startTime,
      temperatureC: tempC,
      riderSpecs,
      lang,
    });
    onOpenTripInCadence(trip);
  };

  return (
    <div className="space-y-5">
      {/* Concentric full-radius 2-mode pill switcher with calm dark-mode contrast */}
      <div className="rounded-[28px] sm:rounded-full bg-card p-1.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-1.5 ring-1 ring-inset ring-ink/[0.05] dark:ring-white/[0.07]">
        <button
          type="button"
          onClick={() => setInputMode('ab')}
          className={`min-h-[50px] px-5 py-2.5 rounded-full text-left flex items-center gap-3 transition-all cursor-pointer ${
            inputMode === 'ab'
              ? ACTIVE_PILL_CLS
              : 'bg-transparent hover:bg-pod text-ink-secondary hover:text-ink'
          }`}
        >
          <Route className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-rounded font-extrabold leading-tight truncate">
              {isFr ? 'Trajet A → B (sans GPX)' : 'Quick A → B route (No GPX)'}
            </div>
            <div className="text-[11px] opacity-75 truncate">
              {isFr ? 'Tapez départ & arrivée' : 'Type start & destination'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setInputMode('gpx')}
          className={`min-h-[50px] px-5 py-2.5 rounded-full text-left flex items-center gap-3 transition-all cursor-pointer ${
            inputMode === 'gpx'
              ? ACTIVE_PILL_CLS
              : 'bg-transparent hover:bg-pod text-ink-secondary hover:text-ink'
          }`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-rounded font-extrabold leading-tight truncate">
              {isFr ? 'Importer GPX ou lien' : 'Upload GPX or link'}
            </div>
            <div className="text-[11px] opacity-75 truncate">
              {isFr ? 'Komoot, Strava, .GPX, .FIT' : 'Komoot, Strava, .GPX, .FIT'}
            </div>
          </div>
        </button>
      </div>

      {/* Mode A: Quick A -> B Route Composer */}
      {inputMode === 'ab' && (
        <form
          onSubmit={(e) => void handlePlanABRoute(e)}
          className="rounded-card bg-card p-4 sm:p-5 space-y-3.5 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pod text-ink text-[10px] font-rounded font-extrabold">
              {isFr ? 'Étape 1' : 'Step 1'}
            </span>
            <h3 className="text-sm font-rounded font-bold text-ink">
              {isFr
                ? 'Tu roules où ? Cadence trace l’itinéraire vélo et scanne les arrêts.'
                : 'Where are you riding? Cadence maps the bike route & checks open stops.'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LocationAutocompleteInput
              compact
              hidePresetHubs
              label={isFr ? 'Point de départ' : 'Start from'}
              value={originText}
              placeholder={isFr ? 'Ex : Nantes, Lyon, Bordeaux…' : 'e.g. Boulder, London, Austin…'}
              onChange={(v) => {
                setOriginText(v);
                setOriginCoords(null);
              }}
              onSelectLocation={(s: LocationSuggestion) => {
                setOriginText(s.name);
                setOriginCoords(s.coordinates);
              }}
            />
            <LocationAutocompleteInput
              compact
              hidePresetHubs
              dropdownAlign="right"
              label={isFr ? 'Destination (ou mi-parcours)' : 'Destination (or turnaround)'}
              value={destText}
              placeholder={isFr ? 'Ex : Clisson, Beaujolais…' : 'e.g. Lyons CO, Box Hill…'}
              biasCoords={originCoords || undefined}
              onChange={(v) => {
                setDestText(v);
                setDestCoords(null);
              }}
              onSelectLocation={(s: LocationSuggestion) => {
                setDestText(s.name);
                setDestCoords(s.coordinates);
              }}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isRoutingAB || isScanning || !originText.trim() || !destText.trim()}
            className={`w-full min-h-[48px] rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
          >
            {isRoutingAB ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Bakery className="w-4 h-4" />
            )}
            <span>
              {isRoutingAB
                ? isFr
                  ? 'Calcul du tracé vélo…'
                  : 'Mapping cycling route…'
                : isFr
                ? 'Trouver les boulangeries ouvertes & points d’eau'
                : 'Find open bakeries & water stops'}
            </span>
          </Button>
        </form>
      )}

      {/* Mode B: GPX / Link Dropzone */}
      {inputMode === 'gpx' && (
        <ToolRouteDropzone
          toolId="water-bakery"
          lang={lang}
          route={loadedRoute}
          activeTrip={activeTrip}
          primaryAction
          stepBadge={isFr ? 'Étape 1' : 'Step 1'}
          headlineEn="Upload your GPX / FIT file or paste a Komoot / Strava link"
          headlineFr="Importe ton fichier GPX / FIT ou colle un lien Komoot / Strava"
          onRouteLoaded={(r) => setLoadedRoute(r)}
          onClear={() => setLoadedRoute(null)}
        />
      )}

      {/* Timing & Bottle Controls */}
      <div className="rounded-card bg-card p-4 sm:p-5 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-pod bg-pod p-3">
          <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
            {isFr ? 'Date' : 'Ride date'}
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
            {isFr ? 'Départ' : 'Start time'}
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
            <span>{isFr ? 'Allure' : 'Pace'}</span>
            <span className="text-ink font-bold tnum">{speedKmH} km/h</span>
          </div>
          <input
            type="range"
            min={14}
            max={34}
            step={1}
            value={speedKmH}
            onChange={(e) => setSpeedKmH(Number(e.target.value))}
            className="peloton-slider w-full mt-1"
          />
        </div>
        <div className="rounded-pod bg-pod p-3">
          <div className="flex items-center justify-between text-[11px] font-rounded font-semibold text-ink-muted mb-1">
            <span>{isFr ? 'Bidons / °C' : 'Bottles / °C'}</span>
            <span className="text-ink font-bold tnum">
              {bottleSlots}×{bidonSizeMl} · {tempC}°
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBottleSlots(n)}
                className={`flex-1 min-h-[30px] rounded-full text-[11px] font-rounded font-bold tnum cursor-pointer ${
                  bottleSlots === n ? ACTIVE_PILL_CLS : 'bg-card text-ink-muted hover:text-ink'
                }`}
              >
                {n}×
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setBidonSizeMl((prev) => (prev === 500 ? 650 : prev === 650 ? 750 : 500))
              }
              className="px-2 min-h-[30px] rounded-full bg-card text-[11px] font-rounded font-bold text-ink tnum cursor-pointer"
            >
              {bidonSizeMl}ml
            </button>
            <button
              type="button"
              onClick={() => setTempC((prev) => (prev >= 28 ? 10 : prev + 6))}
              className="px-2 min-h-[30px] rounded-full bg-card text-[11px] font-rounded font-bold text-ink tnum cursor-pointer"
            >
              {tempC}°
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {(isScanning || isRoutingAB) && (
        <div className="rounded-card bg-card p-8 text-center space-y-2 shadow-xs">
          <LoaderCircle className="w-7 h-7 animate-spin mx-auto text-amber-500" />
          <p className="text-sm font-rounded font-bold text-ink">
            {isRoutingAB
              ? isFr
                ? 'Calcul de ton itinéraire cyclable…'
                : 'Building your cycling route…'
              : isFr
              ? 'Scan des boulangeries, cafés, fontaines et cimetières le long du parcours…'
              : 'Scanning bakeries, cafés, fountains, and cemetery taps along your route…'}
          </p>
        </div>
      )}

      {/* Error */}
      {errorMsg && !isScanning && !isRoutingAB && (
        <div className="rounded-card bg-rose-500/10 text-rose-700 dark:text-rose-300 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {loadedRoute && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runScan(loadedRoute, true)}
              className="min-h-[36px] px-3.5 rounded-full bg-card text-ink text-xs font-rounded font-bold cursor-pointer"
            >
              {isFr ? 'Réessayer' : 'Retry scan'}
            </Button>
          )}
        </div>
      )}

      {/* Empty prompt */}
      {!loadedRoute && !isScanning && !isRoutingAB && (
        <div className="rounded-card bg-card p-6 sm:p-8 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-pod mx-auto flex items-center justify-center text-amber-500">
            <Bakery className="w-6 h-6" />
          </div>
          <h3 className="text-base font-rounded font-bold text-ink">
            {isFr
              ? 'Arrêtez de trouver la boulangerie du village fermée à 13 h 15'
              : 'Stop rolling up to closed village bakeries at 1:15 PM'}
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
            {isFr
              ? 'Entre simplement un départ et une arrivée ci-dessus (ou importe un GPX) : Cadence vérifie les horaires d’ouverture à ton heure de passage réelle et signale les tronçons sans eau.'
              : 'Type any start and destination above (no GPX needed!) or drop a route file — Cadence checks opening hours at your actual arrival ETA and flags water deserts.'}
          </p>
        </div>
      )}

      {/* Results */}
      {hasScanned && analysis && loadedRoute && !isScanning && (
        <div className="rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted tnum">
            <span className="font-rounded font-bold text-ink">
              {loadedRoute.parsed.trackName} ({loadedRoute.parsed.distanceKm.toFixed(1)} km)
            </span>
            <span>
              {startTime} · {speedKmH} km/h · {tempC} °C
            </span>
          </div>

          {analysis.waterGaps && (
            <div
              className={`rounded-pod p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                analysis.waterGaps.status === 'critical'
                  ? 'bg-rose-500/12 text-rose-800 dark:text-rose-200 ring-1 ring-inset ring-rose-500/30'
                  : analysis.waterGaps.status === 'caution'
                  ? 'bg-amber-500/12 text-amber-900 dark:text-amber-200 ring-1 ring-inset ring-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {analysis.waterGaps.status === 'clear' ? (
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="text-sm font-rounded font-bold">
                    {analysis.waterGaps.status === 'critical'
                      ? isFr
                        ? 'Attention : long tronçon sans eau'
                        : 'Heads up: long dry stretch ahead'
                      : analysis.waterGaps.status === 'caution'
                      ? isFr
                        ? 'Tronçon sec : remplissez bien avant'
                        : 'Dry stretch: top off bottles beforehand'
                      : isFr
                      ? 'Eau bien répartie sur le parcours'
                      : 'Water stops look well spaced'}
                  </div>
                  <div className="text-xs opacity-90 tnum">
                    {analysis.waterGaps.criticalGaps[0]
                      ? formatCriticalGapAdvice(analysis.waterGaps.criticalGaps[0], lang)
                      : analysis.waterGaps.cautionGaps[0]
                      ? formatGapDetail(analysis.waterGaps.cautionGaps[0], lang)
                      : isFr
                      ? `Plus grand écart : ${analysis.waterGaps.maxGapKm.toFixed(1)} km · ${analysis.waterStops.length} points d’eau détectés.`
                      : `Longest stretch without water: ${analysis.waterGaps.maxGapKm.toFixed(1)} km · ${analysis.waterStops.length} water points found.`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-rounded font-bold tnum shrink-0">
                <span className="px-3 py-1.5 rounded-full bg-card/80 text-ink">
                  {analysis.foodStops.length} {isFr ? 'boulangeries / cafés' : 'bakeries / cafés'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-card/80 text-ink">
                  {analysis.waterStops.length} {isFr ? 'points d’eau' : 'water taps'}
                </span>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `${isFr ? 'Tout' : 'All'} (${analysis.enrichedStops.length})` },
                  {
                    id: 'food',
                    label: `${isFr ? 'Boulangeries & cafés' : 'Bakeries & cafés'} (${analysis.foodStops.length})`,
                  },
                  {
                    id: 'water',
                    label: `${isFr ? 'Eau & cimetières' : 'Water & cemeteries'} (${analysis.waterStops.length})`,
                  },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-bold tnum cursor-pointer ${
                    filter === tab.id ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {analysis.foodStops.length > 0 && (
              <div className="text-[11px] text-ink-muted tnum">
                {analysis.openBakeriesCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {analysis.openBakeriesCount} {isFr ? 'ouvert(s) à l’arrivée' : 'open at ETA'}
                  </span>
                )}
                {analysis.openBakeriesCount > 0 && analysis.closedBakeriesCount > 0 && ' · '}
                {analysis.closedBakeriesCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {analysis.closedBakeriesCount} {isFr ? 'fermé(s)' : 'closed'}
                  </span>
                )}
              </div>
            )}
          </div>

          {visibleStops.length === 0 ? (
            <div className="rounded-pod bg-pod p-6 text-center text-xs text-ink-muted">
              {isFr
                ? 'Aucun point trouvé dans cette catégorie sur le tracé — prévois ton autonomie au départ.'
                : 'No mapped stops found in this category along the corridor — pack self-sufficiently.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {visibleStops.slice(0, 36).map(({ amenity, etaHHMM, openingVerdict }) => {
                const isFood = amenity.category === 'food';
                const isCemetery = amenity.category === 'cemetery';
                const Icon = isFood ? Bakery : isCemetery ? Cemetery : Droplets;
                const badgeTheme = isFood ? CHIP_TOKENS.amber : CHIP_TOKENS.sky;

                return (
                  <div
                    key={amenity.id}
                    className="rounded-pod bg-pod p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${badgeTheme.surface} ${badgeTheme.primary}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-rounded font-bold text-ink truncate">
                          {amenity.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted tnum mt-0.5">
                          <span className="font-semibold text-ink-secondary">
                            km {amenity.routeKm.toFixed(1)}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {etaHHMM}
                          </span>
                          {amenity.detourMeters > 30 && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />+{Math.round(amenity.detourMeters)} m
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {openingVerdict ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-rounded font-bold shrink-0 ${
                          openingVerdict.status === 'open'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : openingVerdict.status === 'closing-soon'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : openingVerdict.status === 'closed'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            : 'bg-card text-ink-muted'
                        }`}
                        title={openingVerdict.rawHours}
                      >
                        {openingVerdict.badgeLabel}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-card text-[10px] text-ink-muted shrink-0">
                        {isCemetery
                          ? isFr
                            ? 'Robinet'
                            : 'Tap'
                          : isFood
                          ? isFr
                            ? 'Horaires n/d'
                            : 'Hours n/a'
                          : isFr
                          ? 'Eau'
                          : 'Water'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-ink-muted">
            {isFr
              ? 'Données communautaires cartographiques : traitez chaque point comme une piste utile, pas une garantie absolue (surtout en hiver).'
              : 'Community map data: treat stops as reliable leads rather than a guarantee, especially seasonal fountains in winter.'}
          </p>

          {onOpenTripInCadence && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleOpenFullPlan}
              className={`w-full min-h-[48px] px-5 rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
            >
              <span>
                {isFr
                  ? 'Ouvrir le plan complet & exporter en .FIT'
                  : 'Open full Ride Plan & export .FIT'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
