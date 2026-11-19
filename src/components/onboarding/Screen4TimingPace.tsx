import React, { useState } from 'react';
import {
  Cloud,
  SpinnerGap,
  Check,
  Coffee,
  Shower,
  CloudRain,
  Gauge,
  Apple,
  Moon,
  BikeFast,
  Flame,
  Tent,
  Bottle,
  Compass,
  Utensils,
  Lightning,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { Button } from '@/components/arc';
import { ONBOARDING_SPEED_BOUNDS, PACE_TIERS } from './constants';
import { Chip } from '../common/Chip';
import {
  fetchHourlyWeather,
  degreesToCompassCardinal,
  getCachedWeeklyWeather,
} from '../../services/weatherService';
import { getChipsExtraBufferMinutes } from '../../utils/archetypeChips';
import { CHIP_TOKENS, CHIP_RING_BASE } from '../../tokens/chipTokens';

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
    { id: 'coffee-stop', labelEn: 'Coffee stop (+15 min)', labelFr: 'Pause café (+15 min)', theme: 'amber', icon: Coffee },
    { id: 'shower-locker', labelEn: 'Shower & changing (+15 min)', labelFr: 'Douche & changement (+15 min)', theme: 'teal', icon: Shower },
    { id: 'rush-hour-buffer', labelEn: 'Rush hour buffer (+12 min)', labelFr: 'Marge heure de pointe (+12 min)', theme: 'orange', icon: Gauge },
    { id: 'bad-weather-prep', labelEn: 'Rain & Splash guard (+6 min)', labelFr: 'Équipement pluie & garde-boue (+6 min)', theme: 'sky', icon: CloudRain },
    { id: 'real-food', labelEn: 'Real food fuel', labelFr: 'Aliments naturels', theme: 'emerald', icon: Apple },
    { id: 'night-ride', labelEn: 'Night lights setup (+10 min)', labelFr: 'Éclairage nocturne (+10 min)', theme: 'purple', icon: Moon },
  ],
  sport: [
    { id: 'aero-bars', labelEn: 'Aero riding position', labelFr: 'Position aérodynamique', theme: 'sky', icon: BikeFast },
    { id: 'warmup-rollout', labelEn: 'Warmup spin (+10 min)', labelFr: 'Échauffement (+10 min)', theme: 'orange', icon: Flame, addedBufferMin: 10 },
    { id: 'real-food', labelEn: 'Real food fuel', labelFr: 'Aliments naturels', theme: 'emerald', icon: Apple },
  ],
  bikepacking: [
    { id: 'bivouac-stop', labelEn: 'Bivouac rest stop (+20 min)', labelFr: 'Étape bivouac (+20 min)', theme: 'emerald', icon: Tent, addedBufferMin: 20 },
    { id: 'water-resupply', labelEn: 'Water refill stop (+10 min)', labelFr: 'Point d’eau (+10 min)', theme: 'blue', icon: Bottle, addedBufferMin: 10 },
    { id: 'real-food', labelEn: 'Trail real food', labelFr: 'Aliments naturels', theme: 'amber', icon: Apple },
  ],
  leisure: [
    { id: 'bakery-raid', labelEn: 'Bakery stop (+15 min)', labelFr: 'Pause boulangerie (+15 min)', theme: 'amber', icon: Coffee, addedBufferMin: 15 },
    { id: 'scenic-detour', labelEn: 'Scenic detour (+10 min)', labelFr: 'Détour panoramique (+10 min)', theme: 'sky', icon: Compass, addedBufferMin: 10 },
    { id: 'picnic-stop', labelEn: 'Picnic break (+30 min)', labelFr: 'Pause pique-nique (+30 min)', theme: 'teal', icon: Utensils, addedBufferMin: 30 },
  ],
};

export interface OnboardingWeatherFetchedData {
  tempC: number;
  windKmH: number;
  headwindKmH: number;
  windDirection: string;
  windDirectionDegrees?: number;
  isHeadwindActive?: boolean;
  precipitationRiskPercent?: number;
  weatherCode?: number;
  windGustsKmH?: number;
  isDay?: boolean;
  visibilityKm?: number;
  airDensityRho?: number;
  source?: 'live' | 'planned' | 'simulated';
  isBeyondForecastWindow?: boolean;
  sunrise?: string;
  sunset?: string;
}

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
  customSpeedKmH?: number | null;
  onChangeCustomSpeedKmH?: (speed: number | null) => void;
  targetEffortWatts?: number | null;
  onChangeTargetEffortWatts?: (watts: number | null) => void;
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
  onWeatherFetched?: (weatherData: OnboardingWeatherFetchedData) => void;
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

/**
 * Normalizes legacy onboarding chip identifiers to canonical TripProfile chip IDs.
 */
export function normalizeOnboardingChipId(chipId: string): string {
  if (chipId === 'shower-buffer') return 'shower-locker';
  if (chipId === 'night-transit') return 'night-ride';
  return chipId;
}

/**
 * Maps a WMO weather code to an estimated precipitation probability percentage.
 */
export function derivePrecipRiskFromWeatherCode(weatherCode?: number): number {
  if (typeof weatherCode !== 'number' || !Number.isFinite(weatherCode)) return 10;
  if (weatherCode === 0) return 5;
  if (weatherCode === 1 || weatherCode === 2) return 10;
  if (weatherCode === 3) return 20;
  if (weatherCode === 45 || weatherCode === 48) return 30;
  if (weatherCode >= 51 && weatherCode <= 55) return 60;
  if (weatherCode >= 56 && weatherCode <= 57) return 70;
  if (weatherCode >= 61 && weatherCode <= 65) return 85;
  if (weatherCode >= 66 && weatherCode <= 67) return 90;
  if (weatherCode >= 71 && weatherCode <= 77) return 85;
  if (weatherCode >= 80 && weatherCode <= 82) return 80;
  if (weatherCode >= 85 && weatherCode <= 86) return 85;
  if (weatherCode >= 95) return 95;
  return 25;
}

export interface OnboardingChronometryInput {
  purposeId: string;
  targetMode: 'arrive' | 'depart';
  targetTime: string;
  distanceKm: number;
  speedKmH: number;
  parkingBufferMin: number;
  selectedChips: string[];
  rideDate?: string;
  coordinates?: [number, number][];
}

export interface OnboardingChronometryResult {
  normalizedChips: string[];
  ridingMinutes: number;
  parkingBufferMin: number;
  showerPrepMin: number;
  officePrepMin: number;
  chipsExtraBufferMin: number;
  leaveTimeFormatted: string;
  arriveTimeFormatted: string;
  readyTimeFormatted: string;
}

/**
 * Computes onboarding chronometry aligned minute-for-minute with BentoDashboard's reverse timeline.
 */
export function computeOnboardingChronometry({
  purposeId,
  targetMode,
  targetTime,
  distanceKm,
  speedKmH,
  parkingBufferMin,
  selectedChips,
  rideDate,
  coordinates,
}: OnboardingChronometryInput): OnboardingChronometryResult {
  const normalizedChips = Array.from(
    new Set((selectedChips || []).map(normalizeOnboardingChipId))
  );
  const ridingMinutes = Math.max(1, Math.round((distanceKm / Math.max(5, speedKmH)) * 60));
  const targetMins = parseTimeToMinutes(targetTime);
  const safeParkingMin = Math.max(0, Number(parkingBufferMin) || 0);

  const isCommute = purposeId === 'commute';
  const showerPrepMin = isCommute && normalizedChips.includes('shower-locker') ? 15 : 0;
  const officePrepMin = safeParkingMin + showerPrepMin;

  let chipsExtraBufferMin = 0;
  if (isCommute) {
    const estimatedRolloutMins =
      targetMode === 'arrive'
        ? targetMins - officePrepMin - ridingMinutes
        : targetMins;
    chipsExtraBufferMin = getChipsExtraBufferMinutes(
      'COMMUTE',
      normalizedChips,
      rideDate
        ? {
            rolloutTimeHHMM: formatMinutesToTime(estimatedRolloutMins),
            departureDate: rideDate,
            coordinates: coordinates?.[0],
          }
        : undefined
    );
  } else {
    const archetypeChips = ARCHETYPE_CHIPS_BY_PURPOSE[purposeId] || [];
    chipsExtraBufferMin = archetypeChips.reduce(
      (sum, chip) =>
        normalizedChips.includes(chip.id) && chip.addedBufferMin
          ? sum + chip.addedBufferMin
          : sum,
      0
    );
  }

  let leaveTimeFormatted = '';
  let arriveTimeFormatted = '';
  let readyTimeFormatted = '';

  if (targetMode === 'arrive') {
    readyTimeFormatted = formatMinutesToTime(targetMins);
    const arriveMins = targetMins - officePrepMin;
    arriveTimeFormatted = formatMinutesToTime(arriveMins);
    const leaveMins = arriveMins - ridingMinutes - chipsExtraBufferMin;
    leaveTimeFormatted = formatMinutesToTime(leaveMins);
  } else {
    leaveTimeFormatted = formatMinutesToTime(targetMins);
    const arriveMins = targetMins + ridingMinutes + chipsExtraBufferMin;
    arriveTimeFormatted = formatMinutesToTime(arriveMins);
    const readyMins = arriveMins + officePrepMin;
    readyTimeFormatted = formatMinutesToTime(readyMins);
  }

  return {
    normalizedChips,
    ridingMinutes,
    parkingBufferMin: safeParkingMin,
    showerPrepMin,
    officePrepMin,
    chipsExtraBufferMin,
    leaveTimeFormatted,
    arriveTimeFormatted,
    readyTimeFormatted,
  };
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
  customSpeedKmH = null,
  onChangeCustomSpeedKmH,
  targetEffortWatts = null,
  onChangeTargetEffortWatts,
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
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false);

  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherNotice, setWeatherNotice] = useState<string | null>(null);

  const selectedPaceDef = PACE_TIERS.find((p) => p.id === paceTier) || PACE_TIERS[1];
  const isCustomSpeedActive = typeof customSpeedKmH === 'number' && Number.isFinite(customSpeedKmH);
  const speedKmH = isCustomSpeedActive
    ? Math.min(ONBOARDING_SPEED_BOUNDS.maxKmH, Math.max(ONBOARDING_SPEED_BOUNDS.minKmH, Math.round(customSpeedKmH!)))
    : selectedPaceDef.speedKmH;

  // Calculate dynamic buffer additions from active chips
  const activeArchetypeChips = ARCHETYPE_CHIPS_BY_PURPOSE[purposeId] || ARCHETYPE_CHIPS_BY_PURPOSE.commute;

  // Chronometry calculation aligned with BentoDashboard reverse timeline
  const {
    normalizedChips,
    ridingMinutes,
    showerPrepMin,
    chipsExtraBufferMin,
    leaveTimeFormatted,
    arriveTimeFormatted,
    readyTimeFormatted,
  } = computeOnboardingChronometry({
    purposeId,
    targetMode,
    targetTime,
    distanceKm,
    speedKmH,
    parkingBufferMin,
    selectedChips,
    rideDate,
    coordinates,
  });

  const handleFetchWeather = async () => {
    setIsFetchingWeather(true);
    setWeatherNotice(null);

    const lat = coordinates?.[0]?.[0] || 47.2186;
    const lon = coordinates?.[0]?.[1] || -1.5541;

    try {
      const weather = await fetchHourlyWeather(lat, lon, rideDate, targetTime);
      const windDir = degreesToCompassCardinal(weather.windDirectionDegrees, isFr ? 'fr' : 'en');
      onChangeHeadwind(Math.abs(weather.effectiveHeadwindKmH));

      const cachedWeekly = getCachedWeeklyWeather(lat, lon);
      const cachedDayPrecip = cachedWeekly?.days?.find((d) => d.date === rideDate)?.precipitationProbMax;
      const rawPrecip =
        (weather as { precipitationRiskPercent?: number; precipitationProbability?: number }).precipitationRiskPercent ??
        (weather as { precipitationProbability?: number }).precipitationProbability;
      const codePrecip = derivePrecipRiskFromWeatherCode(weather.weatherCode);
      const resolvedPrecipRisk =
        typeof rawPrecip === 'number' && Number.isFinite(rawPrecip)
          ? Math.max(0, Math.min(100, Math.round(rawPrecip)))
          : typeof cachedDayPrecip === 'number' && Number.isFinite(cachedDayPrecip)
          ? Math.max(0, Math.min(100, Math.round(Math.max(cachedDayPrecip, weather.weatherCode >= 45 ? codePrecip : 0))))
          : codePrecip;

      if (onWeatherFetched) {
        onWeatherFetched({
          tempC: weather.temperatureC,
          windKmH: weather.windSpeedKmH,
          headwindKmH: weather.effectiveHeadwindKmH,
          windDirection: windDir,
          windDirectionDegrees: weather.windDirectionDegrees,
          isHeadwindActive: weather.isHeadwindActive,
          precipitationRiskPercent: resolvedPrecipRisk,
          weatherCode: weather.weatherCode,
          windGustsKmH: weather.windGustsKmH,
          isDay: weather.isDay,
          visibilityKm: weather.visibilityKm,
          airDensityRho: weather.airDensityRho,
          source: weather.source,
          isBeyondForecastWindow: weather.isBeyondForecastWindow,
          sunrise: weather.sunriseIso,
          sunset: weather.sunsetIso,
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
          <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
            <span>{isFr ? 'Horaires & allure' : 'Timing & pace'}</span>
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
                  ? 'bg-card text-ink ring-2 ring-inset ring-[#4D7C0F] dark:ring-volt shadow-xs'
                  : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    targetMode === 'arrive'
                      ? 'border-2 border-[#4D7C0F] dark:border-volt'
                      : 'border-ink/40 dark:border-white/40'
                  }`}
                >
                  {targetMode === 'arrive' && (
                    <div className="w-2 h-2 rounded-full bg-[#4D7C0F] dark:bg-volt" />
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
                  ? 'bg-card text-ink ring-2 ring-inset ring-[#4D7C0F] dark:ring-volt shadow-xs'
                  : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    targetMode === 'depart'
                      ? 'border-2 border-[#4D7C0F] dark:border-volt'
                      : 'border-ink/40 dark:border-white/40'
                  }`}
                >
                  {targetMode === 'depart' && (
                    <div className="w-2 h-2 rounded-full bg-[#4D7C0F] dark:bg-volt" />
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
            <Button
              type="button"
              variant="secondary"
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
            </Button>

            {weatherNotice && (
              <div className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-pod border border-emerald-500/20 flex items-center gap-2">
                <Check size={13} className="stroke-[3] shrink-0" />
                <span>{weatherNotice}</span>
              </div>
            )}
          </div>

          {/* Average Riding Pace Selector (with Custom Speed up to 45 km/h & optional Sport Watts) */}
          <div className="mb-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs font-medium text-ink-secondary font-body">
                {isFr ? 'Votre allure moyenne' : 'Your average riding pace'}
              </div>
              {onChangeCustomSpeedKmH && (
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomSpeedActive) {
                      onChangeCustomSpeedKmH(null);
                    } else {
                      const starter = purposeId === 'sport' ? 30 : Math.max(selectedPaceDef.speedKmH, 22);
                      onChangeCustomSpeedKmH(starter);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-[11px] font-rounded font-bold border transition-colors cursor-pointer ${
                    isCustomSpeedActive
                      ? 'bg-ink text-card border-ink dark:bg-white dark:text-[#111111] dark:border-white'
                      : 'bg-card hover:bg-pod border-black/10 dark:border-white/15 text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Gauge size={12} />
                  <span>
                    {isFr ? `Vitesse perso (jusqu’à ${ONBOARDING_SPEED_BOUNDS.maxKmH} km/h)` : `Custom speed (up to ${ONBOARDING_SPEED_BOUNDS.maxKmH} km/h)`}
                  </span>
                </button>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label="Pace Options"
              className="grid grid-cols-3 gap-3"
            >
              {PACE_TIERS.map((tier) => {
                const isSelected = !isCustomSpeedActive && paceTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => {
                      onChangeCustomSpeedKmH?.(null);
                      onChangePaceTier(tier.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        onChangeCustomSpeedKmH?.(null);
                        onChangePaceTier(tier.id);
                      }
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

            {isCustomSpeedActive && onChangeCustomSpeedKmH && (
              <div className="mt-3 p-3.5 rounded-pod bg-card border border-black/10 dark:border-white/15 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="onboarding-custom-speed"
                    className="text-xs font-rounded font-bold text-ink"
                  >
                    {isFr ? 'Vitesse cible personnalisée' : 'Custom target speed'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="onboarding-custom-speed"
                      type="number"
                      min={ONBOARDING_SPEED_BOUNDS.minKmH}
                      max={ONBOARDING_SPEED_BOUNDS.maxKmH}
                      step={1}
                      value={speedKmH}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val)) {
                          onChangeCustomSpeedKmH(
                            Math.min(ONBOARDING_SPEED_BOUNDS.maxKmH, Math.max(ONBOARDING_SPEED_BOUNDS.minKmH, Math.round(val)))
                          );
                        }
                      }}
                      className="w-20 min-h-[38px] px-2.5 rounded-xl bg-pod border border-black/10 dark:border-white/15 text-sm font-rounded font-bold tnum text-ink text-right focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white"
                    />
                    <span className="text-xs font-medium text-ink-muted">km/h</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label={isFr ? 'Curseur de vitesse cible en km/h' : 'Custom target speed slider in km/h'}
                  min={ONBOARDING_SPEED_BOUNDS.minKmH}
                  max={ONBOARDING_SPEED_BOUNDS.maxKmH}
                  step={1}
                  value={speedKmH}
                  onChange={(e) => onChangeCustomSpeedKmH(Number(e.target.value))}
                  className="w-full accent-[#111111] dark:accent-volt cursor-pointer"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {[26, 30, 34, 38, 42].map((presetSpd) => (
                    <button
                      key={presetSpd}
                      type="button"
                      onClick={() => onChangeCustomSpeedKmH(presetSpd)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold tnum border transition-colors cursor-pointer ${
                        speedKmH === presetSpd
                          ? 'bg-ink text-card border-ink dark:bg-white dark:text-[#111111]'
                          : 'bg-pod border-black/10 dark:border-white/10 text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {presetSpd} km/h
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Target Power (Watts) for Sport rides or custom high-speed pacing */}
            {onChangeTargetEffortWatts && (purposeId === 'sport' || isCustomSpeedActive) && (
              <div className="mt-3 p-3.5 rounded-pod bg-card border border-black/10 dark:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-pod flex items-center justify-center shrink-0 text-ink mt-0.5">
                    <Lightning size={14} />
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor="onboarding-target-watts"
                      className="block text-xs font-rounded font-bold text-ink"
                    >
                      {isFr ? 'Puissance cible (optionnel · Watts)' : 'Target effort power (optional · Watts)'}
                    </label>
                    <p className="text-[11px] text-ink-muted font-body">
                      {isFr
                        ? 'Laissez vide pour viser la vitesse, ou entrez une cible en Watts.'
                        : 'Leave blank to pace by speed, or enter normalized power watts.'}
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center w-full sm:w-36 shrink-0">
                  <input
                    id="onboarding-target-watts"
                    type="number"
                    min={80}
                    max={500}
                    step={5}
                    placeholder={isFr ? 'ex: 220' : 'e.g. 220'}
                    value={targetEffortWatts ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        onChangeTargetEffortWatts(null);
                        return;
                      }
                      const num = Number(raw);
                      if (Number.isFinite(num)) {
                        onChangeTargetEffortWatts(Math.min(500, Math.max(80, Math.round(num))));
                      }
                    }}
                    className="w-full min-h-[42px] px-3 pr-9 rounded-xl bg-pod border border-black/10 dark:border-white/15 text-ink text-sm font-rounded font-bold tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white"
                  />
                  <span className="absolute right-3 text-xs font-medium text-ink-muted pointer-events-none">
                    W
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-ink-muted font-body mt-2">
              {isCustomSpeedActive
                ? isFr
                  ? `Allure personnalisée calibrée à ${speedKmH} km/h${targetEffortWatts ? ` · cible ${targetEffortWatts} W` : ''}.`
                  : `Custom target speed set to ${speedKmH} km/h${targetEffortWatts ? ` · target ${targetEffortWatts} W` : ''}.`
                : isFr
                  ? selectedPaceDef.descriptionFr
                  : selectedPaceDef.description}
            </p>
          </div>

          {/* Commute Parking & Preparation Buffer */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
              {purposeId === 'leisure'
                ? isFr
                  ? 'Pause café, visite ou déchargement · marge'
                  : 'Stopover, sightseeing & bike parking buffer'
                : purposeId === 'bikepacking'
                ? isFr
                  ? 'Installation bivouac, recharge soir & rangement · marge'
                  : 'Camp setup, evening charging & gear buffer'
                : purposeId === 'sport'
                ? isFr
                  ? 'Retour au calme, rangement vélo & marge d’arrivée'
                  : 'Cooldown, bike check & arrival buffer'
                : isFr
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
              {isFr ? 'Options pour cette sortie' : 'Helpful ride options'}
            </div>
            <div className="flex flex-wrap gap-2">
              {activeArchetypeChips.map((chipDef) => {
                const isSelected = normalizedChips.includes(chipDef.id);
                return (
                  <Chip
                    key={chipDef.id}
                    label={isFr ? chipDef.labelFr : chipDef.labelEn}
                    theme={chipDef.theme}
                    icon={chipDef.icon}
                    isSelected={isSelected}
                    onClick={() => onToggleChip(chipDef.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Collapsible Advanced Physics Region */}
          <div className="pt-2 border-t border-black/5 dark:border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
              className="text-xs font-rounded font-bold text-ink hover:underline flex items-center gap-1.5 py-1 cursor-pointer"
            >
              <span>{isPhysicsOpen ? '▾' : '▸'}</span>
              <span>
                {isFr ? 'Physique avancée · optionnel' : 'Advanced physics · optional'}
              </span>
            </Button>

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
                <span className="text-ink-muted">
                  {isCustomSpeedActive
                    ? isFr
                      ? 'Allure perso'
                      : 'Custom pace'
                    : isFr
                      ? 'Allure choisie'
                      : `${selectedPaceDef.name} pace`}
                </span>
                <span className="font-rounded font-bold text-ink tnum text-sm">
                  {speedKmH} km/h{targetEffortWatts ? ` · ${targetEffortWatts} W` : ''}
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
              {showerPrepMin > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">{isFr ? 'Douche & changement' : 'Shower & changing'}</span>
                  <span className="font-rounded font-bold text-ink tnum text-sm">
                    +{showerPrepMin} min
                  </span>
                </div>
              )}
              {chipsExtraBufferMin > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">{isFr ? 'Marges options trajet' : 'Ride options buffer'}</span>
                  <span className="font-rounded font-bold text-ink tnum text-sm">
                    +{chipsExtraBufferMin} min
                  </span>
                </div>
              )}
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
    </div>
  );
};
