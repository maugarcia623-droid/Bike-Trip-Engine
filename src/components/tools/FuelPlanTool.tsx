import React, { useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Utensils,
  Droplets,
  Flame,
  ShoppingBag,
  Check,
  ArrowRight,
  Clock,
  Sparkle,
  SlidersHorizontal,
  ChevronDown,
} from '@/components/icons';
import {
  DietaryFilter,
  NutritionPreference,
  RiderBikeSpecs,
} from '../../types/specs';
import { TripProfile } from '../../types/trip';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import {
  calculateHydrationPlan,
  calculateIntensityModulatedCarbTarget,
  getRealFoodNutritionPlan,
} from '../../utils/nutrition';
import { resolveCompliantPantry } from '../../data/pantryCatalog';
import { getLocalTodayIso } from '../../services/weatherService';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { LoadedToolRoute, ToolRouteDropzone } from './ToolRouteDropzone';
import { LiveWeatherPayload, ToolLiveWeatherBar } from './ToolLiveWeatherBar';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';
import { trackCadenceEvent } from '../../utils/analytics';

export interface FuelPlanToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

type EffortPresetId = 'easy' | 'steady' | 'brisk' | 'race';

const EFFORT_PRESETS: Array<{
  id: EffortPresetId;
  labelEn: string;
  labelFr: string;
  subEn: string;
  subFr: string;
  pctFtp: number;
  watts: number;
  speedKmH: number;
  gutCeiling: number;
}> = [
  {
    id: 'easy',
    labelEn: 'Easy spin',
    labelFr: 'Balade cool',
    subEn: 'Chatting pace',
    subFr: 'Allure discussion',
    pctFtp: 58,
    watts: 125,
    speedKmH: 20,
    gutCeiling: 45,
  },
  {
    id: 'steady',
    labelEn: 'Steady endurance',
    labelFr: 'Endurance régulière',
    subEn: 'All-day rhythm',
    subFr: 'Rythme longue sortie',
    pctFtp: 72,
    watts: 165,
    speedKmH: 24,
    gutCeiling: 60,
  },
  {
    id: 'brisk',
    labelEn: 'Brisk tempo',
    labelFr: 'Rythme soutenu',
    subEn: 'Group / hilly effort',
    subFr: 'Groupe / vallonné',
    pctFtp: 82,
    watts: 205,
    speedKmH: 28,
    gutCeiling: 75,
  },
  {
    id: 'race',
    labelEn: 'Fast / Sportive',
    labelFr: 'Cyclosportive',
    subEn: 'High carb demand',
    subFr: 'Forte intensité',
    pctFtp: 90,
    watts: 245,
    speedKmH: 32,
    gutCeiling: 90,
  },
];

const DIET_FILTER_CHIPS: Array<{ id: DietaryFilter; labelEn: string; labelFr: string }> = [
  { id: 'vegan', labelEn: 'Vegan', labelFr: 'Végan' },
  { id: 'gluten-free', labelEn: 'Gluten-free', labelFr: 'Sans gluten' },
  { id: 'dairy-free', labelEn: 'Dairy-free', labelFr: 'Sans lait' },
  { id: 'nut-free', labelEn: 'Nut-free', labelFr: 'Sans fruits à coque' },
  { id: 'low-fodmap', labelEn: 'Gentle stomach', labelFr: 'Digestion douce' },
];

function getDistinctFuelToolPantryIds(pref: NutritionPreference): string[] {
  switch (pref) {
    case 'sports-fuel':
      return [
        'pre-rice-porridge-jam',
        'liq-isotonic-36',
        'sol-gel-standard-25',
        'sol-gel-pro-high-40',
        'rec-pea-rice-shake-banana',
      ];
    case 'mixed':
      return [
        'pre-baguette-honey',
        'liq-isotonic-36',
        'sol-maple-oat-bar',
        'sol-gel-standard-25',
        'rec-skyr-grape',
      ];
    case 'real-food':
    default:
      return [
        'pre-oats-maple-banana',
        'liq-pressed-apple-grape',
        'sol-medjool-date',
        'sol-ripe-banana',
        'rec-skyr-grape',
      ];
  }
}

const FUEL_STYLE_DESCRIPTIONS: Record<NutritionPreference, { en: string; fr: string }> = {
  'real-food': {
    en: '100% kitchen food & fruit-juice bottles — zero gels or powders.',
    fr: '100 % aliments vrais & jus naturel dilué — aucun gel ni poudre.',
  },
  mixed: {
    en: 'Real food solids (oat bars & toast) paired with isotonic drink mix & climb gels.',
    fr: 'Solides naturels (barres avoine & pain) + boisson isotonique & gels pour les bosses.',
  },
  'sports-fuel': {
    en: 'Fast race nutrition: isotonic carb drink mix & hydrogel energy gels, minimal chewing.',
    fr: 'Nutrition course rapide : boisson isotonique & gels hydrogel, quasiment rien à mâcher.',
  },
};

const ACTIVE_PILL_CLS =
  'bg-[#111111] text-white dark:bg-chip dark:text-ink dark:ring-1 dark:ring-inset dark:ring-white/20 shadow-xs';
const INACTIVE_PILL_CLS = 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink';
const HERO_ACCENT_CARD_CLS =
  'bg-[#faffcb] text-[#3a3f00] ring-1 ring-inset ring-[#a3b300]/35 dark:bg-[#1e2108] dark:text-[#e3ff00] dark:ring-[#dfff00]/30';

export const FuelPlanTool: React.FC<FuelPlanToolProps> = ({
  lang,
  activeTrip,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const baseSpecs = useMemo(() => riderSpecs || loadRiderBikeSpecs(), [riderSpecs]);

  const [loadedRoute, setLoadedRoute] = useState<LoadedToolRoute | null>(null);
  const [rideDate, setRideDate] = useState<string>(() => getLocalTodayIso());
  const [startTime, setStartTime] = useState<string>('08:30');
  const [weatherLocation, setWeatherLocation] = useState<string | null>(null);
  const [showManualTemp, setShowManualTemp] = useState<boolean>(false);

  const [rideHours, setRideHours] = useState<number>(3);
  const [effortId, setEffortId] = useState<EffortPresetId>('steady');
  const [tempC, setTempC] = useState<number>(18);
  const [fuelPref, setFuelPref] = useState<NutritionPreference>('real-food');
  const [dietFilters, setDietFilters] = useState<DietaryFilter[]>(
    () => baseSpecs.dietaryFilters || []
  );
  const [bidonSizeMl, setBidonSizeMl] = useState<500 | 650 | 750 | 950>(650);
  const [bottleSlots, setBottleSlots] = useState<1 | 2 | 3>(2);
  const [groceryCopied, setGroceryCopied] = useState(false);
  const [showGroceryPreview, setShowGroceryPreview] = useState(false);

  const effort = EFFORT_PRESETS.find((e) => e.id === effortId) || EFFORT_PRESETS[1];

  const handleWeatherFetched = (payload: LiveWeatherPayload) => {
    setTempC(Math.round(payload.weather.temperatureC));
    setWeatherLocation(payload.locationLabel);
    setShowManualTemp(false);
  };

  const handleRouteLoaded = (loaded: LoadedToolRoute) => {
    setLoadedRoute(loaded);
    const climbFactorMin = (loaded.parsed.elevationGainM / 100) * 4.5;
    const estHours = Math.max(
      0.5,
      Math.min(
        10,
        Number((loaded.parsed.distanceKm / effort.speedKmH + climbFactorMin / 60).toFixed(1))
      )
    );
    setRideHours(estHours);
  };

  const toggleDietFilter = (id: DietaryFilter) => {
    setDietFilters((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const plan = useMemo(() => {
    const tempSpecs: RiderBikeSpecs = {
      ...baseSpecs,
      nutritionPreference: fuelPref,
      dietaryFilters: dietFilters,
      activePantryIds: getDistinctFuelToolPantryIds(fuelPref),
      carbTargetGPerHr: effort.gutCeiling,
      bidonSizeMl,
      frameBottleSlots: bottleSlots,
    };

    const compliantPantry = resolveCompliantPantry(tempSpecs, { hasDestinationFridge: true });
    const isShortRide = rideHours < 0.75;

    const hydration = calculateHydrationPlan({
      rideHours,
      tempC,
      legWatts: effort.watts,
      bidonSizeMl,
      frameBottleSlots: bottleSlots,
      isShortRide,
    });

    const carbMod = calculateIntensityModulatedCarbTarget({
      gutCeilingGPerHr: effort.gutCeiling,
      pctFtp: effort.pctFtp,
      rideHours,
      carbOxidationGramPerHour: Math.round(effort.gutCeiling * 1.85),
    });

    const phases = getRealFoodNutritionPlan('12:00', '12:25', startTime || '09:00', lang, {
      carbTargetGPerHr: effort.gutCeiling,
      rideHours,
      nutritionPreference: fuelPref,
      pctFtp: effort.pctFtp,
      carbOxidationGramPerHour: Math.round(effort.gutCeiling * 1.85),
      compliantPantry,
      tempC,
      legWatts: effort.watts,
      bidonSizeMl,
      frameBottleSlots: bottleSlots,
      hydrationPlan: hydration,
      logistics: {
        preRideStyle: rideHours >= 2 ? 'full-breakfast' : 'light-liquid',
        hasDestinationFridge: true,
        splitPostRideRecovery: false,
      },
    });

    const prePhase = phases.find((p) => p.phaseId === 'pre-ride');
    const onBikePhase = phases.find((p) => p.phaseId === 'on-bike');
    const recoveryPhase =
      phases.find((p) => p.phaseId === 'arrival-recovery') ||
      phases.find((p) => p.phaseId === 'break-room');

    const totalCarbsOnBike = onBikePhase
      ? onBikePhase.items.reduce((sum, item) => sum + (item.carbsGrams || 0), 0)
      : Math.round(carbMod.recommendedGPerHr * rideHours);

    const eatEveryMin =
      carbMod.recommendedGPerHr >= 65 ? 20 : carbMod.recommendedGPerHr >= 45 ? 25 : 30;
    const sipEveryMin = tempC >= 24 ? 12 : tempC >= 16 ? 15 : 20;

    // Brag / grind intelligence: total energy burn & sweat loss (24% gross metabolic efficiency)
    const estimatedTotalKcal = Math.round(((effort.watts * 3.6) / 0.24) * rideHours);
    const croissantsEarned = Number((estimatedTotalKcal / 260).toFixed(1));
    const totalSweatLiters = Number(((hydration.sweatRateMlPerHr * rideHours) / 1000).toFixed(1));

    const groceryLines: string[] = [];
    const seen = new Set<string>();
    const addItem = (name: string, qty: string) => {
      const line = `${qty} — ${name}`.trim();
      if (!seen.has(line)) {
        seen.add(line);
        groceryLines.push(line);
      }
    };
    prePhase?.items.forEach((it) => addItem(it.name, it.quantity));
    onBikePhase?.items.forEach((it) => addItem(it.name, it.quantity));
    recoveryPhase?.items.forEach((it) => addItem(it.name, it.quantity));

    return {
      hydration,
      carbMod,
      prePhase,
      onBikePhase,
      recoveryPhase,
      totalCarbsOnBike,
      eatEveryMin,
      sipEveryMin,
      estimatedTotalKcal,
      croissantsEarned,
      totalSweatLiters,
      groceryLines,
      isShortRide,
    };
  }, [baseSpecs, fuelPref, dietFilters, effort, rideHours, tempC, bidonSizeMl, bottleSlots, startTime, lang]);

  const hoursLabel =
    rideHours % 1 === 0
      ? `${rideHours} h`
      : `${Math.floor(rideHours)} h ${Math.round((rideHours % 1) * 60)} min`;

  const groceryListText = useMemo(() => {
    const header = isFr
      ? `Liste ravitaillement vélo (${hoursLabel} · ${tempC} °C${weatherLocation ? ` · ${weatherLocation}` : ''}) — Cadence`
      : `Bike Ride Fuel Grocery List (${hoursLabel} · ${tempC}°C${weatherLocation ? ` · ${weatherLocation}` : ''}) — Cadence`;
    const body = plan.groceryLines.map((l) => `• ${l}`).join('\n');
    return `${header}\n${body}`;
  }, [hoursLabel, tempC, weatherLocation, plan.groceryLines, isFr]);

  const handleCopyGrocery = async () => {
    setShowGroceryPreview(true);
    try {
      await navigator.clipboard.writeText(groceryListText);
      setGroceryCopied(true);
      trackCadenceEvent('tool_result_shared', { tool: 'fuel-plan', method: 'grocery' });
      window.setTimeout(() => setGroceryCopied(false), 1800);
    } catch {
      // Preview still opens so user can select & copy manually
    }
  };

  const handleOpenFullPlan = () => {
    if (!onOpenTripInCadence) return;
    const trip = buildTripFromToolRoute({
      parsed: loadedRoute?.parsed,
      distanceKm: loadedRoute ? loadedRoute.parsed.distanceKm : Math.round(rideHours * effort.speedKmH),
      elevationGainM: loadedRoute
        ? loadedRoute.parsed.elevationGainM
        : Math.round(rideHours * effort.speedKmH * 8),
      speedKmH: effort.speedKmH,
      departureDate: rideDate,
      departureTime: startTime,
      temperatureC: tempC,
      riderSpecs: {
        ...baseSpecs,
        nutritionPreference: fuelPref,
        dietaryFilters: dietFilters,
        carbTargetGPerHr: effort.gutCeiling,
        bidonSizeMl,
        frameBottleSlots: bottleSlots,
      },
      lang,
    });
    onOpenTripInCadence(trip);
  };

  return (
    <div className="space-y-5">
      <ToolRouteDropzone
        toolId="fuel-plan"
        lang={lang}
        route={loadedRoute}
        activeTrip={activeTrip}
        headlineEn="Optional: drop a route file or Komoot/Strava link to auto-size your ride time"
        headlineFr="Optionnel : dépose un fichier ou lien Komoot/Strava pour estimer la durée automatiquement"
        onRouteLoaded={handleRouteLoaded}
        onClear={() => setLoadedRoute(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
              {isFr
                ? 'Combien manger et boire à vélo — sans gels imposés'
                : 'What to eat & drink on your ride — real food first'}
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {isFr
                ? 'Charge la météo de ta ville pour calibrer tes bidons et ta transpiration, puis règle ta durée et ton allure.'
                : 'Pull live forecast temperatures for your ride time to calibrate sweat rate and bottles, then set your time and pace.'}
            </p>
          </div>

          <ToolLiveWeatherBar
            lang={lang}
            date={rideDate}
            time={startTime}
            titleEn="Use live forecast temperature for your ride"
            titleFr="Charger la température prévue pour ta sortie"
            subtitleEn="Calibrates sweat rate, bottle count & electrolyte target automatically."
            subtitleFr="Calibre automatiquement ta transpiration, tes bidons et les électrolytes."
            onDateChange={setRideDate}
            onTimeChange={setStartTime}
            onWeatherFetched={handleWeatherFetched}
          />

          <div className="space-y-3">
            <div className="rounded-pod bg-pod p-3.5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Durée sur la selle' : 'Riding time'}
                </span>
                <span className="font-rounded font-extrabold text-ink tnum">{hoursLabel}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={rideHours}
                onChange={(e) => setRideHours(Number(e.target.value))}
                className="peloton-slider w-full"
              />
              <div className="flex justify-between text-[10px] text-ink-muted tnum mt-1">
                <span>30 min</span>
                <span>3 h</span>
                <span>8 h</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowManualTemp((v) => !v)}
              aria-expanded={showManualTemp}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-pod bg-pod/70 hover:bg-pod text-xs font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {weatherLocation
                    ? isFr
                      ? `Température (${weatherLocation}) · Ajuster manuellement`
                      : `Temperature (${weatherLocation}) · Adjust manually`
                    : isFr
                    ? 'Ou régler la température manuellement'
                    : 'Or set forecast temperature manually'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted tnum shrink-0">
                <span>{tempC} °C</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showManualTemp ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            {showManualTemp && (
              <div className="rounded-pod bg-pod p-3.5 animate-apple-fade-in">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-rounded font-semibold text-ink-secondary">
                    {weatherLocation
                      ? isFr
                        ? `Température (${weatherLocation})`
                        : `Temp (${weatherLocation})`
                      : isFr
                      ? 'Température prévue'
                      : 'Forecast temp'}
                  </span>
                  <span className="font-rounded font-extrabold text-ink tnum">{tempC} °C</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={36}
                  step={1}
                  value={tempC}
                  onChange={(e) => setTempC(Number(e.target.value))}
                  className="peloton-slider w-full"
                />
                <div className="flex justify-between text-[10px] text-ink-muted tnum mt-1">
                  <span>0 °C</span>
                  <span>18 °C</span>
                  <span>36 °C</span>
                </div>
              </div>
            )}
          </div>

          {/* Effort feel */}
          <div>
            <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-2">
              {isFr ? 'Intensité prévue' : 'Effort level'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EFFORT_PRESETS.map((preset) => {
                const active = effortId === preset.id;
                return (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setEffortId(preset.id)}
                    className={`min-h-[52px] px-3.5 py-2 rounded-pod text-left flex flex-col items-start justify-center cursor-pointer transition-all ${CHIP_RING_BASE} ${
                      active
                        ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_TOKENS.amber.selectedRing}`
                        : 'bg-pod hover:bg-chip text-ink ring-transparent'
                    }`}
                  >
                    <span className="text-xs font-rounded font-bold leading-tight">
                      {isFr ? preset.labelFr : preset.labelEn}
                    </span>
                    <span className="text-[11px] opacity-75 leading-tight mt-0.5">
                      {isFr ? preset.subFr : preset.subEn}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Food style */}
          <div className="space-y-2">
            <label className="block text-xs font-rounded font-semibold text-ink-secondary">
              {isFr ? 'Style de ravitaillement' : 'Fuel style'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'real-food', en: 'Real food', fr: 'Aliments vrais' },
                  { id: 'mixed', en: 'Mixed', fr: 'Mixte' },
                  { id: 'sports-fuel', en: 'Gels & mix', fr: 'Gels & boisson' },
                ] as const
              ).map((opt) => {
                const active = fuelPref === opt.id;
                return (
                  <Button
                    key={opt.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFuelPref(opt.id)}
                    className={`min-h-[44px] px-3 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                      active ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                    }`}
                  >
                    {isFr ? opt.fr : opt.en}
                  </Button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-muted leading-snug px-1">
              {isFr ? FUEL_STYLE_DESCRIPTIONS[fuelPref].fr : FUEL_STYLE_DESCRIPTIONS[fuelPref].en}
            </p>
          </div>

          {/* Bottles & cages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                {isFr ? 'Taille des bidons' : 'Bottle size'}
              </label>
              <div className="flex gap-1.5">
                {([500, 650, 750] as const).map((sz) => (
                  <Button
                    key={sz}
                    variant="ghost"
                    size="sm"
                    onClick={() => setBidonSizeMl(sz)}
                    className={`flex-1 min-h-[44px] rounded-full text-xs font-rounded font-bold tnum cursor-pointer ${
                      bidonSizeMl === sz ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                    }`}
                  >
                    {sz} ml
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                {isFr ? 'Porte-bidons sur le vélo' : 'Cages on bike'}
              </label>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((cnt) => (
                  <Button
                    key={cnt}
                    variant="ghost"
                    size="sm"
                    onClick={() => setBottleSlots(cnt)}
                    className={`flex-1 min-h-[44px] rounded-full text-xs font-rounded font-bold tnum cursor-pointer ${
                      bottleSlots === cnt ? ACTIVE_PILL_CLS : INACTIVE_PILL_CLS
                    }`}
                  >
                    {cnt}×
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Dietary filters */}
          <div>
            <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-2">
              {isFr ? 'Filtres alimentaires (optionnel)' : 'Dietary needs (optional)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIET_FILTER_CHIPS.map((chip) => {
                const active = dietFilters.includes(chip.id);
                return (
                  <Button
                    key={chip.id}
                    variant="ghost"
                    size="sm"
                    aria-pressed={active}
                    onClick={() => toggleDietFilter(chip.id)}
                    className={`min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-semibold cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                      active
                        ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} ${CHIP_TOKENS.teal.selectedRing}`
                        : 'bg-pod hover:bg-chip text-ink-secondary ring-transparent'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{isFr ? chip.labelFr : chip.labelEn}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Instant Result & Grocery List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-yellow-700 dark:text-yellow-300">
                <Utensils className="w-4 h-4" />
                <span>{isFr ? 'Ton plan carburant' : 'Your fueling blueprint'}</span>
              </span>
              <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum">
                {hoursLabel} · {tempC} °C
              </span>
            </div>

            {/* 3 Hero KPI Pods (Calm Obsidian-Volt instead of blinding yellow in Dark Mode) */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className={`rounded-pod p-3.5 ${HERO_ACCENT_CARD_CLS}`}>
                <div className="text-[11px] font-rounded font-bold opacity-80">
                  {isFr ? 'Glucides / h' : 'Carbs / hr'}
                </div>
                <div className="text-2xl font-extrabold font-rounded tnum mt-0.5 leading-none">
                  {plan.isShortRide ? '0' : plan.carbMod.recommendedGPerHr}
                  <span className="text-xs font-bold ml-1">g</span>
                </div>
                <div className="text-[11px] font-medium opacity-80 tnum mt-1">
                  {plan.isShortRide
                    ? isFr
                      ? 'Eau seule'
                      : 'Water only'
                    : `${plan.totalCarbsOnBike} g ${isFr ? 'total' : 'total'}`}
                </div>
              </div>

              <div className="rounded-pod bg-pod p-3.5">
                <div className="text-[11px] font-rounded font-semibold text-ink-muted flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isFr ? 'Bidons' : 'Bottles'}</span>
                </div>
                <div className="text-2xl font-extrabold font-rounded text-ink tnum mt-0.5 leading-none">
                  {plan.hydration.carriedOnFrameBidons}
                  <span className="text-xs font-semibold text-ink-muted ml-1">×{bidonSizeMl}</span>
                </div>
                <div className="text-[11px] text-ink-muted tnum mt-1">
                  {plan.hydration.plannedRefillBidons > 0
                    ? isFr
                      ? `+ ${plan.hydration.plannedRefillBidons} recharge(s)`
                      : `+ ${plan.hydration.plannedRefillBidons} refill(s)`
                    : isFr
                    ? 'Sans recharge'
                    : 'No refill needed'}
                </div>
              </div>

              <div className="rounded-pod bg-pod p-3.5">
                <div className="text-[11px] font-rounded font-semibold text-ink-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isFr ? 'Rythme' : 'Rhythm'}</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-rounded text-ink tnum mt-1 leading-tight">
                  {plan.sipEveryMin} min
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {plan.isShortRide
                    ? isFr
                      ? 'Gorgées régulières'
                      : 'Regular sips'
                    : isFr
                    ? `Bouchée / ${plan.eatEveryMin} min`
                    : `Bite / ${plan.eatEveryMin} min`}
                </div>
              </div>
            </div>

            {/* Brag / Grind Reality Strip: Total Burn in Croissants + Sweat Lost */}
            {!plan.isShortRide && (
              <div className="rounded-pod bg-pod px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-rounded font-bold text-ink tnum">
                  <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    {isFr
                      ? `~${plan.estimatedTotalKcal.toLocaleString()} kcal brûlées (≈ ${plan.croissantsEarned} croissants mérités)`
                      : `~${plan.estimatedTotalKcal.toLocaleString()} kcal burned (≈ ${plan.croissantsEarned} croissants earned)`}
                  </span>
                </span>
                <span className="text-[11px] font-rounded font-semibold text-sky-600 dark:text-sky-400 tnum">
                  {isFr ? `~${plan.totalSweatLiters} L de sueur` : `~${plan.totalSweatLiters} L sweat lost`}
                </span>
              </div>
            )}

            {plan.isShortRide && (
              <div className="rounded-pod bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 px-3.5 py-2.5 text-xs flex items-center gap-2">
                <Sparkle className="w-4 h-4 shrink-0" />
                <span>
                  {isFr
                    ? 'Sous 45 min, tes réserves suffisent largement — prends juste un bidon d’eau, pas besoin de gel.'
                    : 'Under 45 min, your stored energy is plenty — bring one water bottle, no gels needed.'}
                </span>
              </div>
            )}

            {/* Phase breakdown */}
            <div className="space-y-2.5">
              {[
                {
                  key: 'pre',
                  label: isFr ? 'Avant le départ' : 'Before you roll out',
                  phase: plan.prePhase,
                  accent: 'text-amber-600 dark:text-amber-400',
                },
                {
                  key: 'bike',
                  label: isFr ? 'Dans tes poches & bidons' : 'In your pockets & bottles',
                  phase: plan.onBikePhase,
                  accent: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  key: 'after',
                  label: isFr ? 'À l’arrivée (récupération)' : 'After the ride (recovery)',
                  phase: plan.recoveryPhase,
                  accent: 'text-sky-600 dark:text-sky-400',
                },
              ].map(({ key, label, phase, accent }) =>
                phase && phase.items.length > 0 ? (
                  <div key={key} className="rounded-pod bg-pod p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-rounded font-bold ${accent}`}>{label}</span>
                      <span className="text-[11px] text-ink-muted tnum">
                        {phase.items.reduce((s, i) => s + (i.carbsGrams || 0), 0)} g C
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {phase.items.map((item, idx) => (
                        <li
                          key={`${key}-${idx}`}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <span className="text-ink font-medium leading-snug">
                            <span className="font-bold tnum">{item.quantity}</span> · {item.name}
                          </span>
                          <span className="text-ink-muted tnum shrink-0">
                            {item.carbsGrams > 0 ? `${item.carbsGrams} g` : `${item.kcals} kcal`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>

            {/* Electrolyte note */}
            {plan.hydration.sodiumMgPerL > 0 && (
              <div className="rounded-pod bg-pod px-3.5 py-2.5 text-xs text-ink-secondary flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>{isFr ? 'Sodium recommandé' : 'Electrolyte target'}</span>
                </span>
                <span className="font-rounded font-bold text-ink tnum">
                  ~{plan.hydration.sodiumMgPerL} mg/L ({plan.hydration.targetFluidMlPerHr} ml/h)
                </span>
              </div>
            )}

            {/* Utility Action: Copy Grocery List (with transparent preview) */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => void handleCopyGrocery()}
              className="w-full min-h-[44px] px-4 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold cursor-pointer"
            >
              {groceryCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              <span>
                {groceryCopied
                  ? isFr
                    ? 'Liste de courses copiée !'
                    : 'Grocery list copied!'
                  : isFr
                  ? 'Copier la liste de courses'
                  : 'Copy grocery list'}
              </span>
            </Button>

            {showGroceryPreview && (
              <div className="rounded-pod bg-pod p-3 space-y-1.5 animate-apple-fade-in">
                <div className="flex items-center justify-between text-[11px] font-rounded font-bold text-ink-muted">
                  <span>{isFr ? 'Copié dans ton presse-papiers :' : 'Copied to clipboard:'}</span>
                  <button
                    type="button"
                    onClick={() => setShowGroceryPreview(false)}
                    className="hover:text-ink cursor-pointer"
                  >
                    {isFr ? 'Masquer' : 'Hide'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[11px] font-body text-ink-secondary leading-relaxed">
                  {groceryListText}
                </pre>
              </div>
            )}

            {onOpenTripInCadence && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleOpenFullPlan}
                className={`w-full min-h-[48px] rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
              >
                <span>
                  {isFr
                    ? 'Ouvrir le plan complet dans Cadence (Gratuit)'
                    : 'Open full Ride Plan in Cadence (Free)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
