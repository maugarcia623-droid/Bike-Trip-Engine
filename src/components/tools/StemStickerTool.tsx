import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/arc/button/button';
import {
  Scissors,
  Printer,
  Plus,
  X,
  Droplets,
  Bakery,
  Cemetery,
  LoaderCircle,
  ArrowRight,
  Check,
  Sparkle,
  Pen,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { StageAmenity } from '../../types/amenities';
import {
  calculateAmenityEtaDetails,
  scanCorridorAmenities,
} from '../../services/overpassCorridor';
import { evaluateOpeningHoursAtArrival } from '../../utils/openingHours';
import { getLocalTodayIso } from '../../services/weatherService';
import {
  buildStemStickerData,
  CustomStickerNote,
  STEM_STICKER_PRESETS,
  StemStickerPresetId,
} from '../../utils/stemSticker';
import {
  TopTubeStickerPrintSheet,
  TopTubeStickerStrip,
} from '../print/TopTubeStickerSheet';
import {
  buildParsedRouteFromTrip,
  buildTripFromToolRoute,
  isUserCreatedTrip,
} from '../../data/demoToolRoutes';
import { LoadedToolRoute, ToolRouteDropzone } from './ToolRouteDropzone';
import { CHIP_TOKENS, YELLOW_VEST_SOLID_CTA_CLASSES } from '../../tokens/chipTokens';
import { trackCadenceEvent } from '../../utils/analytics';

export interface StemStickerToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

const ACTIVE_PILL_CLS =
  'bg-[#111111] text-white dark:bg-chip dark:text-ink dark:ring-1 dark:ring-inset dark:ring-white/20 shadow-xs';
const INACTIVE_PILL_CLS = 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink';

export const StemStickerTool: React.FC<StemStickerToolProps> = ({
  lang,
  activeTrip,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const userTrip = isUserCreatedTrip(activeTrip) ? activeTrip : null;

  const [loadedRoute, setLoadedRoute] = useState<LoadedToolRoute | null>(() =>
    userTrip
      ? {
          source: 'active-trip',
          parsed: buildParsedRouteFromTrip(userTrip, lang),
        }
      : null
  );

  // 100% Editable Sticker Metadata (works with OR without a GPX!)
  const [rideTitle, setRideTitle] = useState<string>(() =>
    userTrip?.name || (isFr ? 'Sortie du dimanche' : 'Sunday Coffee Loop')
  );
  const [distanceKm, setDistanceKm] = useState<number>(() =>
    userTrip?.route?.distanceKm ? Number(userTrip.route.distanceKm.toFixed(1)) : 65
  );
  const [elevationGainM, setElevationGainM] = useState<number>(() =>
    userTrip?.route?.elevationGainM ? Math.round(userTrip.route.elevationGainM) : 450
  );
  const [originLabel, setOriginLabel] = useState<string>(() =>
    userTrip?.route?.origin || (isFr ? 'Départ' : 'Roll out')
  );
  const [destLabel, setDestLabel] = useState<string>(() =>
    userTrip?.route?.destination || (isFr ? 'Arrivée' : 'Finish')
  );

  const [presetId, setPresetId] = useState<StemStickerPresetId>('gravel');
  const [copies, setCopies] = useState<1 | 2>(2);
  const [rideDate] = useState<string>(() => getLocalTodayIso());
  const [startTime, setStartTime] = useState<string>(() => userTrip?.departureTime || '08:00');
  const [speedKmH, setSpeedKmH] = useState<number>(() => userTrip?.route?.targetSpeedKmH || 22);
  const [includeFuelCues, setIncludeFuelCues] = useState<boolean>(true);

  const [scannedAmenities, setScannedAmenities] = useState<StageAmenity[]>([]);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [stopPickerFilter, setStopPickerFilter] = useState<'all' | 'food' | 'water'>('all');
  const [isScanningStops, setIsScanningStops] = useState(false);
  const [stopsScanned, setStopsScanned] = useState(false);

  const [customNotes, setCustomNotes] = useState<CustomStickerNote[]>([]);
  const [newNoteKm, setNewNoteKm] = useState<string>('');
  const [newNoteLabel, setNewNoteLabel] = useState<string>('');

  // Keep print-mode body class active while Stem Sticker tool is open (only affects @media print),
  // guaranteeing zero blank leading page for both the Print button AND Cmd/Ctrl+P!
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('cadence-print-sticker');
    return () => {
      document.body.classList.remove('cadence-print-sticker');
    };
  }, []);

  const handleRouteChange = (next: LoadedToolRoute) => {
    setLoadedRoute(next);
    setRideTitle(next.parsed.trackName || `${next.parsed.originLabel} → ${next.parsed.destLabel}`);
    setDistanceKm(Number(next.parsed.distanceKm.toFixed(1)));
    setElevationGainM(Math.round(next.parsed.elevationGainM || 0));
    setOriginLabel(next.parsed.originLabel || (isFr ? 'Départ' : 'Roll out'));
    setDestLabel(next.parsed.destLabel || (isFr ? 'Arrivée' : 'Finish'));
    setScannedAmenities([]);
    setSelectedStopIds([]);
    setStopsScanned(false);
  };

  const handleScanStops = async () => {
    if (!loadedRoute) return;
    setIsScanningStops(true);
    try {
      const results = await scanCorridorAmenities({
        coordinates: loadedRoute.parsed.coordinates,
        totalDistanceKm: loadedRoute.parsed.distanceKm,
        elevationProfile: loadedRoute.parsed.elevationProfile,
        lang,
      });
      const relevant = results
        .filter((a) => a.category === 'food' || a.category === 'water' || a.category === 'cemetery')
        .sort((a, b) => a.routeKm - b.routeKm);
      setScannedAmenities(relevant);
      setSelectedStopIds([]);
      setStopsScanned(true);
    } catch {
      setStopsScanned(false);
    } finally {
      setIsScanningStops(false);
    }
  };

  const toggleStopSelection = (id: string) => {
    setSelectedStopIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAutoPickBalancedStops = () => {
    const picked: string[] = [];
    const food = scannedAmenities.filter((a) => a.category === 'food');
    const water = scannedAmenities.filter(
      (a) => a.category === 'water' || a.category === 'cemetery'
    );
    const minSpacing = Math.max(12, distanceKm / 4);
    let lastFood = -999;
    for (const f of food) {
      if (f.routeKm - lastFood >= minSpacing) {
        picked.push(f.id);
        lastFood = f.routeKm;
        if (picked.length >= 2) break;
      }
    }
    let lastWater = 0;
    for (const w of water) {
      if (w.routeKm - lastWater >= Math.max(15, distanceKm / 3.5) && distanceKm - w.routeKm >= 8) {
        picked.push(w.id);
        lastWater = w.routeKm;
        if (picked.length >= 4) break;
      }
    }
    setSelectedStopIds(picked);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const km = Number(newNoteKm);
    const label = newNoteLabel.trim();
    if (!Number.isFinite(km) || km < 0 || !label) return;
    setCustomNotes((prev) => [
      ...prev,
      { id: `n-${Date.now()}`, km: Number(km.toFixed(1)), label },
    ]);
    setNewNoteKm('');
    setNewNoteLabel('');
  };

  const syntheticTrip = useMemo(() => {
    const trip = buildTripFromToolRoute({
      parsed: loadedRoute?.parsed,
      name: rideTitle.trim() || (isFr ? 'Ma sortie vélo' : 'My Bike Ride'),
      distanceKm: Math.max(1, distanceKm),
      elevationGainM: Math.max(0, elevationGainM),
      speedKmH,
      departureTime: startTime,
      riderSpecs,
      lang,
    });
    trip.route.origin = originLabel.trim() || (isFr ? 'Départ' : 'Roll out');
    trip.route.destination = destLabel.trim() || (isFr ? 'Arrivée' : 'Finish');
    trip.route.distanceKm = Math.max(1, distanceKm);
    trip.route.elevationGainM = Math.max(0, elevationGainM);
    if (loadedRoute?.source === 'active-trip' && userTrip?.pinnedAmenities) {
      trip.pinnedAmenities = userTrip.pinnedAmenities;
    }
    return trip;
  }, [
    loadedRoute,
    rideTitle,
    distanceKm,
    elevationGainM,
    originLabel,
    destLabel,
    speedKmH,
    startTime,
    riderSpecs,
    lang,
    isFr,
    userTrip?.pinnedAmenities,
  ]);

  const stickerData = useMemo(
    () =>
      buildStemStickerData({
        trip: syntheticTrip,
        riderSpecs,
        amenities: scannedAmenities,
        selectedAmenityIds: stopsScanned ? selectedStopIds : undefined,
        customNotes,
        presetId,
        includeFuelCues,
        lang,
      }),
    [
      syntheticTrip,
      riderSpecs,
      scannedAmenities,
      stopsScanned,
      selectedStopIds,
      customNotes,
      presetId,
      includeFuelCues,
      lang,
    ]
  );

  const handlePrintSticker = () => {
    trackCadenceEvent('stem_sticker_printed', {
      source: 'tool',
      preset: presetId,
      stops_count: stickerData.rows.length,
    });
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const visiblePickerStops = useMemo(() => {
    return scannedAmenities.filter((a) => {
      if (stopPickerFilter === 'food') return a.category === 'food';
      if (stopPickerFilter === 'water') return a.category === 'water' || a.category === 'cemetery';
      return true;
    });
  }, [scannedAmenities, stopPickerFilter]);

  return (
    <div className="space-y-5">
      <ToolRouteDropzone
        toolId="stem-sticker"
        lang={lang}
        route={loadedRoute}
        activeTrip={activeTrip}
        headlineEn="Optional: drop a GPX or Komoot/Strava link to auto-fill climbs & scan stops"
        headlineFr="Optionnel : déposez un GPX ou lien Komoot/Strava pour importer cols et arrêts"
        sublineEn="No GPX handy? Build your custom top-tube sticker manually below — every field is editable."
        sublineFr="Pas de GPX ? Crée ton sticker sur mesure directement ci-dessous — tout est modifiable."
        onRouteLoaded={handleRouteChange}
        onClear={() => {
          setLoadedRoute(null);
          setScannedAmenities([]);
          setSelectedStopIds([]);
          setStopsScanned(false);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Fully Editable Sticker Builder */}
        <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
              {isFr
                ? 'Personnalise ton pense-bête de cadre'
                : 'Customize your top-tube cheat sheet'}
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {isFr
                ? 'Modifie librement le titre, les chiffres et tes repères, imprime à 100 %, découpe et fixe sur le tube supérieur avec du scotch transparent.'
                : 'Edit the title, numbers, and exact stops you want, print at 100%, cut along the dashed border, and seal onto your top tube with clear tape.'}
            </p>
          </div>

          {/* 100% Editable Ride Info Block */}
          <div className="rounded-pod bg-pod p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-rounded font-bold text-ink-secondary">
              <Pen className="w-3.5 h-3.5 text-ink-muted" />
              <span>{isFr ? 'En-tête du sticker (modifiable)' : 'Sticker header (editable)'}</span>
            </div>

            <input
              type="text"
              maxLength={42}
              value={rideTitle}
              onChange={(e) => setRideTitle(e.target.value)}
              placeholder={isFr ? 'Nom de ta sortie…' : 'Name your ride…'}
              aria-label={isFr ? 'Nom de la sortie' : 'Ride title'}
              className="w-full min-h-[42px] px-3.5 rounded-full bg-card text-ink text-base sm:text-sm font-rounded font-bold focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/25"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-sub-pod bg-card px-3 py-2">
                <label className="block text-[10px] font-rounded font-semibold text-ink-muted">
                  {isFr ? 'Distance (km)' : 'Distance (km)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  step="0.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full bg-transparent text-base sm:text-xs font-rounded font-extrabold text-ink tnum focus:outline-none mt-0.5"
                />
              </div>
              <div className="rounded-sub-pod bg-card px-3 py-2">
                <label className="block text-[10px] font-rounded font-semibold text-ink-muted">
                  {isFr ? 'Dénivelé (+m)' : 'Climbing (+m)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={10}
                  value={elevationGainM}
                  onChange={(e) => setElevationGainM(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-transparent text-base sm:text-xs font-rounded font-extrabold text-ink tnum focus:outline-none mt-0.5"
                />
              </div>
              <div className="rounded-sub-pod bg-card px-3 py-2">
                <label className="block text-[10px] font-rounded font-semibold text-ink-muted">
                  {isFr ? 'Départ (label)' : 'Start label'}
                </label>
                <input
                  type="text"
                  maxLength={22}
                  value={originLabel}
                  onChange={(e) => setOriginLabel(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-xs font-rounded font-bold text-ink focus:outline-none mt-0.5"
                />
              </div>
              <div className="rounded-sub-pod bg-card px-3 py-2">
                <label className="block text-[10px] font-rounded font-semibold text-ink-muted">
                  {isFr ? 'Arrivée (label)' : 'Finish label'}
                </label>
                <input
                  type="text"
                  maxLength={22}
                  value={destLabel}
                  onChange={(e) => setDestLabel(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-xs font-rounded font-bold text-ink focus:outline-none mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Physical strip width preset */}
          <div>
            <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-2">
              {isFr ? 'Format du tube supérieur' : 'Top-tube strip width'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['road', 'gravel'] as const).map((id) => {
                const p = STEM_STICKER_PRESETS[id];
                const active = presetId === id;
                return (
                  <Button
                    key={id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPresetId(id)}
                    className={`min-h-[54px] px-4 py-2 rounded-pod flex flex-col items-start justify-center cursor-pointer ${
                      active ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                    }`}
                  >
                    <span className="text-xs font-rounded font-bold">
                      {isFr ? p.labelFr : p.labelEn}
                    </span>
                    <span className="text-[11px] opacity-75 tnum">{p.dimLabel}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Start time, pace, copies */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-pod bg-pod p-3">
              <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                {isFr ? 'Départ' : 'Start'}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-transparent text-base sm:text-sm font-rounded font-bold text-ink tnum focus:outline-none"
              />
            </div>

            <div className="rounded-pod bg-pod p-3">
              <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                {isFr ? 'Allure (km/h)' : 'Pace (km/h)'}
              </label>
              <input
                type="number"
                min={10}
                max={42}
                value={speedKmH}
                onChange={(e) =>
                  setSpeedKmH(Math.max(10, Math.min(42, Number(e.target.value) || 20)))
                }
                className="w-full bg-transparent text-base sm:text-sm font-rounded font-bold text-ink tnum focus:outline-none"
              />
            </div>

            <div className="rounded-pod bg-pod p-3">
              <label className="block text-[11px] font-rounded font-semibold text-ink-muted mb-1">
                {isFr ? 'Exemplaires' : 'Copies'}
              </label>
              <div className="flex gap-1 mt-0.5">
                {([1, 2] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCopies(c)}
                    className={`flex-1 min-h-[30px] rounded-full text-xs font-rounded font-bold tnum cursor-pointer ${
                      copies === c ? ACTIVE_PILL_CLS : 'bg-card text-ink-muted hover:text-ink'
                    }`}
                  >
                    {c}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear Auto Snack & Drink Reminders Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={includeFuelCues}
            onClick={() => setIncludeFuelCues((v) => !v)}
            className="w-full rounded-pod bg-pod hover:bg-chip/70 p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-rounded font-bold text-ink">
                {isFr ? 'Rappels manger & boire automatiques' : 'Auto eat & drink reminders'}
              </div>
              <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                {isFr
                  ? 'Ajoute une ligne « Manger & boire » tous les 20–30 km entre tes arrêts.'
                  : 'Adds “Eat snack & sip water” rows every 20–30 km between your chosen stops.'}
              </div>
            </div>
            <span
              className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                includeFuelCues ? 'bg-emerald-500 justify-end' : 'bg-chip justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </span>
          </button>

          {/* Interactive GPX Stop Scanner + User-Controlled Stop Picker */}
          {loadedRoute && (
            <div className="rounded-pod bg-pod p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-rounded font-bold text-ink">
                    {isFr ? 'Arrêts eau & boulangeries sur ta trace' : 'Bakeries & water taps on your route'}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {stopsScanned
                      ? isFr
                        ? `${scannedAmenities.length} trouvés · coche uniquement ceux que tu veux sur le sticker (${selectedStopIds.length} sélectionnés).`
                        : `${scannedAmenities.length} found · pick the exact stops you want on your sticker (${selectedStopIds.length} selected).`
                      : isFr
                      ? 'Scanne la carte puis choisis toi-même les arrêts à imprimer.'
                      : 'Scan OpenStreetMap along your GPX, then choose which stops go onto the strip.'}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isScanningStops}
                  onClick={() => void handleScanStops()}
                  className="min-h-[38px] px-3.5 rounded-full bg-card hover:bg-chip text-ink text-xs font-rounded font-bold cursor-pointer shrink-0"
                >
                  {isScanningStops ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin text-teal-500" />
                  ) : (
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  )}
                  <span>
                    {isScanningStops
                      ? isFr
                        ? 'Scan…'
                        : 'Scanning…'
                      : stopsScanned
                      ? isFr
                        ? 'Rescanner'
                        : 'Rescan'
                      : isFr
                      ? 'Scanner les arrêts'
                      : 'Scan route stops'}
                  </span>
                </Button>
              </div>

              {stopsScanned && scannedAmenities.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'all', label: isFr ? 'Tout' : 'All' },
                          { id: 'food', label: isFr ? 'Boulangeries' : 'Bakeries' },
                          { id: 'water', label: isFr ? 'Eau' : 'Water' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStopPickerFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold cursor-pointer ${
                            stopPickerFilter === tab.id
                              ? ACTIVE_PILL_CLS
                              : 'bg-card text-ink-muted hover:text-ink'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-rounded font-semibold">
                      <button
                        type="button"
                        onClick={handleAutoPickBalancedStops}
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <Sparkle className="w-3 h-3" />
                        <span>{isFr ? 'Suggérer 3–4 arrêts' : 'Auto-pick 3–4 stops'}</span>
                      </button>
                      {selectedStopIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStopIds([])}
                          className="text-ink-muted hover:text-ink cursor-pointer"
                        >
                          {isFr ? 'Tout décocher' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {visiblePickerStops.slice(0, 40).map((a) => {
                      const checked = selectedStopIds.includes(a.id);
                      const eta = calculateAmenityEtaDetails(startTime, a.routeKm, speedKmH);
                      const verdict =
                        a.category === 'food'
                          ? evaluateOpeningHoursAtArrival(a.openingHours, rideDate, eta.etaHHMM, lang)
                          : null;
                      const Icon =
                        a.category === 'food'
                          ? Bakery
                          : a.category === 'cemetery'
                          ? Cemetery
                          : Droplets;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleStopSelection(a.id)}
                          className={`w-full px-3 py-2 rounded-[14px] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                            checked
                              ? `${CHIP_TOKENS.emerald.surface} ring-1 ring-inset ring-emerald-500/40`
                              : 'bg-card hover:bg-chip/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-pod text-transparent ring-1 ring-ink/15 dark:ring-white/20'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                            <Icon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-rounded font-bold text-ink truncate">
                                {a.name}
                              </div>
                              <div className="text-[10px] text-ink-muted tnum">
                                km {a.routeKm.toFixed(1)} · {eta.etaHHMM}
                              </div>
                            </div>
                          </div>
                          {verdict && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-rounded font-bold shrink-0 ${
                                verdict.status === 'open'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : verdict.status === 'closed'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                  : 'bg-pod text-ink-muted'
                              }`}
                            >
                              {verdict.badgeLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick-add custom waypoint note */}
          <div className="space-y-2">
            <label className="block text-xs font-rounded font-semibold text-ink-secondary">
              {isFr
                ? 'Ajouter un repère perso (ex. boulangerie, col, ravito)'
                : 'Add a custom cue (e.g. bakery, climb, feed zone)'}
            </label>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="number"
                step="0.5"
                min={0}
                max={600}
                value={newNoteKm}
                onChange={(e) => setNewNoteKm(e.target.value)}
                placeholder="km"
                className="w-20 min-h-[44px] px-3 rounded-full bg-pod text-ink text-base sm:text-xs font-rounded font-bold tnum focus:outline-none"
              />
              <input
                type="text"
                maxLength={28}
                value={newNoteLabel}
                onChange={(e) => setNewNoteLabel(e.target.value)}
                placeholder={isFr ? 'Ex : Café Place du Port' : 'e.g. Village bakery'}
                className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-full bg-pod text-ink text-base sm:text-xs focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                disabled={!newNoteKm || !newNoteLabel.trim()}
                className="min-h-[44px] px-3.5 rounded-full bg-pod hover:bg-chip text-ink cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            {customNotes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customNotes.map((n) => (
                  <span
                    key={n.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-xs text-ink font-rounded font-semibold tnum"
                  >
                    <span>
                      km {n.km} · {n.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomNotes((prev) => prev.filter((x) => x.id !== n.id))}
                      aria-label="Remove note"
                      className="text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Primary Print CTA + Full Ride Plan */}
          <div className="space-y-2.5 pt-1">
            <Button
              variant="primary"
              size="lg"
              onClick={handlePrintSticker}
              className={`w-full min-h-[48px] rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
            >
              <Printer className="w-4 h-4" />
              <span>
                {isFr
                  ? `Imprimer / PDF à taille réelle (${copies}×)`
                  : `Print / Save PDF at actual size (${copies}×)`}
              </span>
            </Button>

            {onOpenTripInCadence && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenTripInCadence(syntheticTrip)}
                className="w-full min-h-[44px] rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold cursor-pointer"
              >
                <span>{isFr ? 'Ouvrir le plan complet dans Cadence' : 'Open full Ride Plan in Cadence'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Live 1:1 Tactile Preview Mat */}
        <div className="lg:col-span-6 rounded-card bg-card p-5 sm:p-7 shadow-xs flex flex-col items-center space-y-4">
          <div className="w-full flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-rounded font-bold text-ink">
              <Scissors className="w-4 h-4 text-ink-secondary" />
              <span>{isFr ? 'Aperçu taille réelle' : 'Actual-size preview'}</span>
            </span>
            <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum">
              {STEM_STICKER_PRESETS[presetId].dimLabel} · {stickerData.rows.length}{' '}
              {isFr ? 'repères' : 'cues'}
            </span>
          </div>

          <div className="w-full rounded-pod bg-[#1C1C1F] p-6 sm:p-8 flex items-center justify-center overflow-x-auto">
            <TopTubeStickerStrip
              data={stickerData}
              presetId={presetId}
              lang={lang}
              showCutMarks
              className="shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            />
          </div>

          <p className="text-[11px] text-ink-muted text-center max-w-sm leading-relaxed">
            {isFr
              ? 'Astuce : laisse l’échelle sur « 100 % » (Taille réelle) dans ta boîte d’impression et vérifie la règle 5 cm avant de découper.'
              : 'Tip: keep print scale at “100%” (Actual Size) and check the 5 cm calibration ruler before cutting.'}
          </p>
        </div>
      </div>

      {/* Portaled Print-Only Sheet — Page 1 IS this sheet because body.cadence-print-sticker hides #root */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="hidden print:block print-only">
            <TopTubeStickerPrintSheet
              data={stickerData}
              presetId={presetId}
              copies={copies}
              lang={lang}
            />
          </div>,
          document.body
        )}
    </div>
  );
};
