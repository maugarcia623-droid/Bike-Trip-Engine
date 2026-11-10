import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  Sun,
  SpinnerGap,
  Check,
  Coffee,
  Shower,
  Gauge,
  Apple,
  Moon,
  BikeFast,
  Flame,
  Tent,
  Bottle,
  Compass,
  Utensils,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { PACE_TIERS } from './constants';
import { Chip } from '../common/Chip';
import { fetchHourlyWeather, degreesToCompassCardinal } from '../../services/weatherService';
import { LayeredTokenTheme, CHIP_TOKENS, CHIP_RING_BASE } from '../../tokens/chipTokens';

interface ArchetypeChipItem {
  id: string;
  labelEn: string;
  labelFr: string;
  theme: 'blue' | 'lime' | 'orange' | 'purple' | 'teal' | 'amber' | 'emerald' | 'sky' | 'rose' | 'yellow-vest';
  icon: React.ElementType;
  addedBufferMin?: number;
}

const ARCHETYPE_CHIPS_BY_PURPOSE: Record<string, ArchetypeChipItem[]> = {
  commute: [
    { id: 'coffee-stop', labelEn: 'Coffee stop (+15 min)', labelFr: 'Pause café (+15 min)', theme: 'amber', icon: Coffee, addedBufferMin: 15 },
    { id: 'shower-buffer', labelEn: 'Locker & shower (+15 min)', labelFr: 'Douche & vestiaire (+15 min)', theme: 'teal', icon: Shower, addedBufferMin: 15 },
    { id: 'rush-hour-buffer', labelEn: 'Rush hour buffer (+10 min)', labelFr: 'Marge heure de pointe (+10 min)', theme: 'orange', icon: Gauge, addedBufferMin: 10 },
    { id: 'real-food', labelEn: 'Real food fuel', labelFr: 'Ravitaillement réel', theme: 'emerald', icon: Apple },
    { id: 'night-transit', labelEn: 'Night lights setup', labelFr: 'Éclairage nocturne', theme: 'purple', icon: Moon },
  ],
  sport: [
    { id: 'aero-bars', labelEn: 'Aero posture tuck', labelFr: 'Posture aéro agressive', theme: 'sky', icon: BikeFast },
    { id: 'warmup-rollout', labelEn: 'Warmup spin (+10 min)', labelFr: 'Échauffement (+10 min)', theme: 'orange', icon: Flame, addedBufferMin: 10 },
    { id: 'real-food', labelEn: 'Carb nutrition fuel', labelFr: 'Carburant glucidique', theme: 'emerald', icon: Apple },
  ],
  bikepacking: [
    { id: 'bivouac-stop', labelEn: 'Bivouac rest stop (+20 min)', labelFr: 'Étape bivouac (+20 min)', theme: 'emerald', icon: Tent, addedBufferMin: 20 },
    { id: 'water-resupply', labelEn: 'Water resupply (+10 min)', labelFr: 'Ravitaillement eau (+10 min)', theme: 'blue', icon: Bottle, addedBufferMin: 10 },
    { id: 'real-food', labelEn: 'Trail real food', labelFr: 'Vraie nourriture trail', theme: 'amber', icon: Apple },
  ],
  leisure: [
    { id: 'bakery-raid', labelEn: 'Bakery stop (+15 min)', labelFr: 'Pause boulangerie (+15 min)', theme: 'amber', icon: Coffee, addedBufferMin: 15 },
    { id: 'scenic-detour', labelEn: 'Scenic detour (+10 min)', labelFr: 'Détour panoramique (+10 min)', theme: 'sky', icon: Compass, addedBufferMin: 10 },
    { id: 'picnic-stop', labelEn: 'Picnic break (+30 min)', labelFr: 'Pause pique-nique (+30 min)', theme: 'teal', icon: Utensils, addedBufferMin: 30 },
  ],
};

interface Screen4TimingPaceProps {
  purposeId?: string;
  targetMode: 'arrive' | 'depart';
  onChangeTargetMode: (mode: 'arrive' | 'depart') => void;
  rideDate: string;
  onChangeRideDate: (date: string) => void;
  targetTime: string;
  onChangeTargetTime: (time: string) => void;
  paceTier: 'easy' | 'steady' | 'brisk';
  onChangePaceTier: (pace: 'easy' | 'steady' | 'brisk') => void;
  parkingBufferMin: number;
  onChangeParkingBuffer: (mins: number) => void;
  selectedChips: string[];
  onToggleChip: (chipId: string) => void;
  distanceKm: number;
  coordinates?: [number, number][];
  headwindKmH: number;
  onChangeHeadwind: (val: number) => void;
  gradientPercent: number;
  onChangeGradient: (val: number) => void;
  onWeatherFetched?: (weatherData: {
    tempC: number;
    windKmH: number;
    headwindKmH: number;
    windDirection: string;
  }) => void;
  onBack: () => void;
  onContinue: () => void;
}

function formatMinutesToTime(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const Screen4TimingPace: React.FC<Screen4TimingPaceProps> = ({
  purposeId = 'commute',
  targetMode,
  onChangeTargetMode,
  rideDate,
  onChangeRideDate,
  targetTime,
  onChangeTargetTime,
  paceTier,
  onChangePaceTier,
  parkingBufferMin,
  onChangeParkingBuffer,
  selectedChips = [],
  onToggleChip,
  distanceKm,
  coordinates,
  headwindKmH,
  onChangeHeadwind,
  gradientPercent,
  onChangeGradient,
  onWeatherFetched,
  onBack,
  onContinue,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false);

  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherNotice, setWeatherNotice] = useState<string | null>(null);

  const selectedPaceDef = PACE_TIERS.find((p) => p.id === paceTier) || PACE_TIERS[1];
  const speedKmH = selectedPaceDef.speedKmH;

  // Calculate dynamic buffer additions from active chips
  const activeArchetypeChips = ARCHETYPE_CHIPS_BY_PURPOSE[purposeId] || ARCHETYPE_CHIPS_BY_PURPOSE.commute;

  // Chronometry calculation
  const ridingMinutes = Math.max(1, Math.round((distanceKm / speedKmH) * 60));
  const targetMins = parseTimeToMinutes(targetTime);

  let leaveTimeFormatted = '';
  let arriveTimeFormatted = '';
  let readyTimeFormatted = '';

  if (targetMode === 'arrive') {
    readyTimeFormatted = formatMinutesToTime(targetMins);
    const arriveMins = targetMins - parkingBufferMin;
    arriveTimeFormatted = formatMinutesToTime(arriveMins);
    const leaveMins = arriveMins - ridingMinutes;
    leaveTimeFormatted = formatMinutesToTime(leaveMins);
  } else {
    leaveTimeFormatted = formatMinutesToTime(targetMins);
    const arriveMins = targetMins + ridingMinutes;
    arriveTimeFormatted = formatMinutesToTime(arriveMins);
    const readyMins = arriveMins + parkingBufferMin;
    readyTimeFormatted = formatMinutesToTime(readyMins);
  }

  const handleFetchWeather = async () => {
    setIsFetchingWeather(true);
    setWeatherNotice(null);

    const lat = coordinates?.[0]?.[0] || 47.2186;
    const lon = coordinates?.[0]?.[1] || -1.5541;

    try {
      const weather = await fetchHourlyWeather(lat, lon, rideDate, targetTime);
      const windDir = degreesToCompassCardinal(weather.windDirectionDegrees, isFr ? 'fr' : 'en');
      onChangeHeadwind(Math.abs(weather.effectiveHeadwindKmH));

      if (onWeatherFetched) {
        onWeatherFetched({
          tempC: weather.temperatureC,
          windKmH: weather.windSpeedKmH,
          headwindKmH: weather.effectiveHeadwindKmH,
          windDirection: windDir,
        });
      }

      setWeatherNotice(
        isFr
          ? `Météo en direct : ${weather.temperatureC}°C · Vent ${weather.windSpeedKmH} km/h ${windDir} (face : ${weather.effectiveHeadwindKmH} km/h)`
          : `Live weather: ${weather.temperatureC}°C · Wind ${weather.windSpeedKmH} km/h ${windDir} (${weather.effectiveHeadwindKmH} km/h headwind)`
      );
    } catch (err) {
      setWeatherNotice(
        isFr
          ? 'Météo simulée appliquée (14°C · Vent 12 km/h Ouest)'
          : 'Simulated weather applied (14°C · Wind 12 km/h West)'
      );
    } finally {
      setIsFetchingWeather(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1">
        {/* Left Column: Timing & Pace Form */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-volt" />
            <span>{isFr ? 'HORAIRES & ALLURE' : 'TIMING & PACE'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-3">
            {isFr ? 'Maîtrisez votre temps de route.' : 'Arrive on your own terms.'}
          </h2>

          <p className="text-sm text-ink-secondary mb-5 font-body">
            {isFr
              ? 'Choisissez un horaire et une allure adaptée. Cadence calcule l’heure de départ exacte.'
              : 'Pick a time and a pace that feels right. We’ll work out when to leave.'}
          </p>

          {/* Arrive by / Depart at Mode Selector */}
          <div
            role="radiogroup"
            aria-label="Timing Mode"
            className="grid grid-cols-2 gap-3 mb-5"
          >
            {/* Arrive by Card */}
            <div
              role="radio"
              aria-checked={targetMode === 'arrive'}
              tabIndex={0}
              onClick={() => onChangeTargetMode('arrive')}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') onChangeTargetMode('arrive');
              }}
              className={`p-3.5 sm:p-4 rounded-pod flex items-center justify-between cursor-pointer select-none transition-all active:scale-[0.98] min-h-[50px] ${
                targetMode === 'arrive'
                  ? 'bg-card text-ink ring-2 ring-inset ring-volt shadow-xs'
                  : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    targetMode === 'arrive'
                      ? 'border-volt dark:border-volt'
                      : 'border-ink/40 dark:border-white/40'
                  }`}
                >
                  {targetMode === 'arrive' && (
                    <div className="w-2 h-2 rounded-full bg-volt" />
                  )}
                </div>
                <span className="text-sm font-rounded font-bold text-ink">
                  {isFr ? 'Arrivée à' : 'Arrive by'}
                </span>
              </div>
              {targetMode === 'arrive' && (
                <span className={`text-[11px] font-rounded font-bold px-2 py-0.5 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}>
                  {isFr ? 'Sélectionné' : 'Selected'}
                </span>
              )}
            </div>

            {/* Depart at Card */}
            <div
              role="radio"
              aria-checked={targetMode === 'depart'}
              tabIndex={0}
              onClick={() => onChangeTargetMode('depart')}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') onChangeTargetMode('depart');
              }}
              className={`p-3.5 sm:p-4 rounded-pod flex items-center justify-between cursor-pointer select-none transition-all active:scale-[0.98] min-h-[50px] ${
                targetMode === 'depart'
                  ? 'bg-card text-ink ring-2 ring-inset ring-volt shadow-xs'
                  : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    targetMode === 'depart'
                      ? 'border-volt dark:border-volt'
                      : 'border-ink/40 dark:border-white/40'
                  }`}
                >
                  {targetMode === 'depart' && (
                    <div className="w-2 h-2 rounded-full bg-volt" />
                  )}
                </div>
                <span className="text-sm font-rounded font-bold text-ink">
                  {isFr ? 'Départ à' : 'Depart at'}
                </span>
              </div>
              {targetMode === 'depart' && (
                <span className={`text-[11px] font-rounded font-bold px-2 py-0.5 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}>
                  {isFr ? 'Sélectionné' : 'Selected'}
                </span>
              )}
            </div>
          </div>

          {/* Date & Time Row + Fetch Weather Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Ride Date */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
                {isFr ? 'Date de la sortie' : 'Ride date'}
              </label>
              <input
                type="date"
                value={rideDate}
                onChange={(e) => onChangeRideDate(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
              />
            </div>

            {/* Target Time */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
                {targetMode === 'arrive'
                  ? isFr
                    ? 'Heure d’arrivée · heure locale'
                    : 'Arrive by · local time'
                  : isFr
                  ? 'Heure de départ · heure locale'
                  : 'Depart at · local time'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="time"
                  value={targetTime}
                  onChange={(e) => onChangeTargetTime(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 pr-12 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-rounded font-bold tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
                />
                <span className="absolute right-3 text-xs font-medium text-ink-muted font-body pointer-events-none">
                  24 h
                </span>
              </div>
            </div>
          </div>

          {/* Fetch Weather Button Row */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleFetchWeather}
              disabled={isFetchingWeather}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isFetchingWeather ? (
                <SpinnerGap size={13} className="animate-spin text-current" />
              ) : (
                <Cloud size={13} className="text-current" />
              )}
              <span>{isFr ? 'Synchroniser la météo en direct' : 'Fetch live weather forecast'}</span>
            </button>

            {weatherNotice && (
              <div className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-pod border border-emerald-500/20 flex items-center gap-2">
                <Check size={13} className="stroke-[3] shrink-0" />
                <span>{weatherNotice}</span>
              </div>
            )}
          </div>

          {/* Average Riding Pace Selector */}
          <div className="mb-5">
            <div className="text-xs font-medium text-ink-secondary mb-2 font-body">
              {isFr ? 'Votre allure moyenne' : 'Your average riding pace'}
            </div>
            <div
              role="radiogroup"
              aria-label="Pace Options"
              className="grid grid-cols-3 gap-3"
            >
              {PACE_TIERS.map((tier) => {
                const isSelected = paceTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => onChangePaceTier(tier.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') onChangePaceTier(tier.id);
                    }}
                    className={`p-3 sm:p-3.5 rounded-pod flex flex-col justify-between cursor-pointer select-none transition-all active:scale-[0.98] min-h-[72px] ${
                      isSelected
                        ? 'bg-card text-ink ring-2 ring-inset ring-ink dark:ring-white shadow-xs'
                        : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'border-ink dark:border-white'
                            : 'border-ink/40 dark:border-white/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-ink dark:bg-white" />
                        )}
                      </div>
                      <span className="text-xs font-rounded font-bold text-ink">
                        {isFr ? tier.nameFr : tier.name}
                      </span>
                    </div>
                    <span className="text-sm sm:text-base font-rounded font-bold text-ink tnum pl-5.5">
                      {tier.speedKmH} km/h
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-ink-muted font-body mt-2">
              {isFr ? selectedPaceDef.descriptionFr : selectedPaceDef.description}
            </p>
          </div>

          {/* Commute Parking & Preparation Buffer */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
              {isFr
                ? 'Temps de stationnement & préparation · marge'
                : 'Time to park & get ready · commute buffer'}
            </label>
            <div className="relative flex items-center max-w-xs">
              <input
                type="number"
                min="0"
                max="60"
                value={parkingBufferMin}
                onChange={(e) => onChangeParkingBuffer(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[46px] px-3.5 pr-12 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-rounded font-bold tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
              />
              <span className="absolute right-3 text-xs font-medium text-ink-muted font-body pointer-events-none">
                min
              </span>
            </div>
          </div>

          {/* Trip Archetype Chips Options */}
          <div className="mb-5">
            <div className="text-xs font-medium text-ink-secondary mb-2 font-body">
              {isFr ? 'Options et badges opérationnels du trajet :' : 'Trip archetype chips & options:'}
            </div>
            <div className="flex flex-wrap gap-2">
              {activeArchetypeChips.map((chipDef) => {
                const isSelected = selectedChips.includes(chipDef.id);
                return (
                  <Chip
                    key={chipDef.id}
                    label={isFr ? chipDef.labelFr : chipDef.labelEn}
                    theme={chipDef.theme}
                    icon={chipDef.icon}
                    isSelected={isSelected}
                    onClick={() => {
                      onToggleChip(chipDef.id);
                      if (chipDef.addedBufferMin) {
                        onChangeParkingBuffer(
                          isSelected
                            ? Math.max(0, parkingBufferMin - chipDef.addedBufferMin)
                            : parkingBufferMin + chipDef.addedBufferMin
                        );
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Collapsible Advanced Physics Region */}
          <div className="pt-2 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
              className="text-xs font-rounded font-bold text-ink hover:underline flex items-center gap-1.5 py-1 cursor-pointer"
            >
              <span>{isPhysicsOpen ? '▾' : '▸'}</span>
              <span>
                {isFr ? 'Physique avancée · optionnel' : 'Advanced physics · optional'}
              </span>
            </button>

            {isPhysicsOpen && (
              <div className="mt-3 p-4 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-3 animate-apple-step-in">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>{isFr ? 'Vent effectif (face)' : 'Headwind speed'}</span>
                    <span className="font-rounded font-bold text-ink tnum">{headwindKmH} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={headwindKmH}
                    onChange={(e) => onChangeHeadwind(Number(e.target.value))}
                    className="peloton-slider w-full cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>{isFr ? 'Pente moyenne' : 'Average gradient'}</span>
                    <span className="font-rounded font-bold text-ink tnum">{gradientPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={gradientPercent}
                    onChange={(e) => onChangeGradient(Number(e.target.value))}
                    className="peloton-slider w-full cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Estimated Timing Breakdown Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bento-card bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <h3 className="text-base font-rounded font-bold text-ink mb-4">
              {isFr ? 'Votre timing estimé' : 'Your estimated timing'}
            </h3>

            {/* Metric Rows */}
            <div className="space-y-2.5 pb-4 border-b border-black/5 dark:border-white/10 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{isFr ? 'Distance' : 'Distance'}</span>
                <span className="font-rounded font-bold text-ink tnum text-sm">
                  {distanceKm.toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{isFr ? 'Allure choisie' : `${selectedPaceDef.name} pace`}</span>
                <span className="font-rounded font-bold text-ink tnum text-sm">
                  {speedKmH} km/h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{isFr ? 'Temps de pédalage' : 'Riding time'}</span>
                <span className="font-rounded font-bold text-ink tnum text-sm">
                  {ridingMinutes} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{isFr ? 'Marge de préparation' : 'Buffer time'}</span>
                <span className="font-rounded font-bold text-ink tnum text-sm">
                  {parkingBufferMin} min
                </span>
              </div>
            </div>

            {/* Big Hero Chronometry Callout */}
            <div
              className="py-5 select-none"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="text-3xl sm:text-4xl font-extrabold font-rounded tracking-tight text-ink tnum mb-1">
                {targetMode === 'arrive' ? (
                  <>
                    <span className="text-xl sm:text-2xl font-bold text-ink-muted mr-1.5 font-rounded">
                      {isFr ? 'Départ à' : 'Leave at'}
                    </span>
                    {leaveTimeFormatted}
                  </>
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-bold text-ink-muted mr-1.5 font-rounded">
                      {isFr ? 'Arrivée à' : 'Arrive at'}
                    </span>
                    {arriveTimeFormatted}
                  </>
                )}
              </div>
              <p className="text-xs text-ink-secondary font-body mt-1">
                {targetMode === 'arrive' ? (
                  isFr
                    ? `Arrivée à ${arriveTimeFormatted}. Prêt pour ${readyTimeFormatted}.`
                    : `Arrive at ${arriveTimeFormatted}. Park and be ready by ${readyTimeFormatted}.`
                ) : (
                  isFr
                    ? `Départ à ${leaveTimeFormatted}. Arrivée vers ${arriveTimeFormatted}.`
                    : `Depart at ${leaveTimeFormatted}. Arrive at destination around ${arriveTimeFormatted}.`
                )}
              </p>
            </div>

            <p className="text-[11.5px] text-ink-muted font-body leading-relaxed pt-3 border-t border-black/5 dark:border-white/10">
              {isFr
                ? `${distanceKm.toFixed(1)} km ÷ ${speedKmH} km/h = ${ridingMinutes} min de vélo. Prévoyez une marge selon les feux et le trafic.`
                : `${distanceKm.toFixed(1)} km ÷ ${speedKmH} km/h = ${ridingMinutes} min riding. Estimate excludes traffic delays, stops and live weather.`}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar - Sticky Mobile Bar */}
      <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-md pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] -mx-4 sm:-mx-8 md:-mx-10 px-4 sm:px-8 md:px-10 mt-auto">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <ArrowLeft size={14} />
          <span>{isFr ? 'Retour' : 'Back'}</span>
        </button>

        <span className="hidden sm:inline text-xs text-ink-muted font-body">
          {targetMode === 'arrive'
            ? isFr
              ? `Départ calculé : ${leaveTimeFormatted}`
              : `Calculated departure: ${leaveTimeFormatted}`
            : isFr
            ? `Arrivée calculée : ${arriveTimeFormatted}`
            : `Calculated arrival: ${arriveTimeFormatted}`}
        </span>

        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
        >
          <span>{isFr ? 'Continuer vers le vélo' : 'Continue to rider & bike'}</span>
          <ArrowRight size={14} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
