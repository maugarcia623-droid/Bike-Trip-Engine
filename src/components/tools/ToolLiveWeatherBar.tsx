import React, { useEffect, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  CloudSun,
  LocateFixed,
  LoaderCircle,
  Wind,
  Thermometer,
  CloudRain,
  RefreshCw,
} from '@/components/icons';
import { LocationAutocompleteInput } from '../configurator/LocationAutocompleteInput';
import {
  LocationSuggestion,
  reverseGeocodeLocation,
} from '../../services/locationService';
import {
  degreesToCompassCardinal,
  fetchHourlyWeather,
  getLocalTodayIso,
  TelemetryWeather,
} from '../../services/weatherService';
import { CHIP_TOKENS } from '../../tokens/chipTokens';

const SESSION_LOC_KEY = 'cadence_tool_weather_loc_v1';

export interface StoredToolLocation {
  label: string;
  coords: [number, number];
}

export function loadStoredToolLocation(): StoredToolLocation | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LOC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.label === 'string' &&
      Array.isArray(parsed.coords) &&
      parsed.coords.length === 2 &&
      Number.isFinite(parsed.coords[0]) &&
      Number.isFinite(parsed.coords[1])
    ) {
      return { label: parsed.label, coords: [parsed.coords[0], parsed.coords[1]] };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveStoredToolLocation(loc: StoredToolLocation): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_LOC_KEY, JSON.stringify(loc));
  } catch {
    // ignore
  }
}

export interface LiveWeatherPayload {
  locationLabel: string;
  coords: [number, number];
  date: string;
  time: string;
  weather: TelemetryWeather;
  rainRiskPct: number;
}

export interface ToolLiveWeatherBarProps {
  lang: 'en' | 'fr';
  date: string;
  time: string;
  timeLabelEn?: string;
  timeLabelFr?: string;
  routeBearingDeg?: number;
  titleEn?: string;
  titleFr?: string;
  subtitleEn?: string;
  subtitleFr?: string;
  onDateChange: (nextDate: string) => void;
  onTimeChange: (nextTime: string) => void;
  onWeatherFetched: (payload: LiveWeatherPayload) => void;
}

function estimateRainRiskPct(w: TelemetryWeather): number {
  if ((w.recentPrecipitationMm ?? 0) > 0.5 || w.weatherCode >= 61) return 75;
  if (w.weatherCode >= 51 || (w.recentPrecipitationMm ?? 0) > 0.1) return 45;
  if (w.weatherCode >= 3) return 20;
  return 5;
}

/**
 * Shared live weather & global location bar powering Multi-Tool calculators.
 * Clean 2-row layout:
 * - Row 1: 1:1 GPS locate button all the way on the left + full-width city search input (zero truncation)
 * - Row 2: Generous 2-column Date & Time capsules (zero truncated digits)
 */
export const ToolLiveWeatherBar: React.FC<ToolLiveWeatherBarProps> = ({
  lang,
  date,
  time,
  timeLabelEn = 'Start time',
  timeLabelFr = 'Départ',
  routeBearingDeg = 0,
  titleEn = 'Fetch live forecast for your ride',
  titleFr = 'Charger la météo pour ta sortie',
  subtitleEn = 'Powered by Cadence’s hourly weather engine — type any city or use GPS.',
  subtitleFr = 'Moteur météo horaire Cadence — tape une ville ou utilise ta position.',
  onDateChange,
  onTimeChange,
  onWeatherFetched,
}) => {
  const isFr = lang === 'fr';
  const [stored] = useState<StoredToolLocation | null>(() => loadStoredToolLocation());
  const [queryText, setQueryText] = useState<string>(() => stored?.label || '');
  const [selectedLoc, setSelectedLoc] = useState<StoredToolLocation | null>(stored);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchForLocation = async (
    loc: StoredToolLocation,
    targetDate: string,
    targetTime: string
  ) => {
    setIsLoadingWeather(true);
    setStatusError(null);
    try {
      const w = await fetchHourlyWeather(
        loc.coords[0],
        loc.coords[1],
        targetDate || getLocalTodayIso(),
        targetTime || '08:30',
        routeBearingDeg
      );
      const payload: LiveWeatherPayload = {
        locationLabel: loc.label,
        coords: loc.coords,
        date: targetDate,
        time: targetTime,
        weather: w,
        rainRiskPct: estimateRainRiskPct(w),
      };
      setLiveWeather(payload);
      onWeatherFetched(payload);
    } catch {
      setStatusError(
        isFr
          ? 'Météo indisponible pour le moment — tu peux ajuster les réglages ci-dessous.'
          : 'Forecast temporarily unavailable — you can adjust the settings below.'
      );
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    if (!selectedLoc) return;
    const timer = window.setTimeout(() => {
      void fetchForLocation(selectedLoc, date, time);
    }, 150);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoc?.coords[0], selectedLoc?.coords[1], date, time, routeBearingDeg]);

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    const shortName = s.name.split(',')[0].trim() || s.name;
    const next: StoredToolLocation = { label: shortName, coords: s.coordinates };
    setQueryText(shortName);
    setSelectedLoc(next);
    saveStoredToolLocation(next);
  };

  const handleUseGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusError(
        isFr
          ? 'Géolocalisation non prise en charge sur ce navigateur.'
          : 'Geolocation is not available in this browser.'
      );
      return;
    }
    setIsLocating(true);
    setStatusError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const label = await reverseGeocodeLocation(lat, lon, lang);
          const shortLabel = label.split('(')[0].split(',')[0].trim() || label;
          const next: StoredToolLocation = { label: shortLabel, coords: [lat, lon] };
          setQueryText(shortLabel);
          setSelectedLoc(next);
          saveStoredToolLocation(next);
        } catch {
          const next: StoredToolLocation = {
            label: isFr ? 'Ma position' : 'My location',
            coords: [lat, lon],
          };
          setQueryText(next.label);
          setSelectedLoc(next);
          saveStoredToolLocation(next);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setStatusError(
          isFr
            ? 'Accès position refusé — tape simplement ta ville ci-dessus.'
            : 'Location access declined — simply type your city above.'
        );
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 }
    );
  };

  return (
    <div className="rounded-pod bg-pod/80 dark:bg-pod p-3.5 sm:p-4 space-y-3 ring-1 ring-inset ring-ink/[0.05] dark:ring-white/[0.07]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-ink">
            <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{isFr ? titleFr : titleEn}</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">
            {isFr ? subtitleFr : subtitleEn}
          </p>
        </div>

        {liveWeather && !isLoadingWeather && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold tnum shrink-0 ${
              liveWeather.weather.source === 'simulated'
                ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`
                : `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveWeather.weather.source === 'simulated'
                  ? CHIP_TOKENS.amber.dot
                  : CHIP_TOKENS.emerald.dot
              }`}
            />
            <span>
              {liveWeather.weather.source === 'simulated'
                ? isFr
                  ? 'Estimation saisonnière'
                  : 'Seasonal estimate'
                : isFr
                ? 'Météo en direct'
                : 'Live forecast'}
            </span>
          </span>
        )}
      </div>

      {/* Row 1: GPS Locate button all the way to the left + full-width city search */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={isLocating}
          onClick={handleUseGps}
          title={isFr ? 'Utiliser ma position GPS' : 'Use my current location'}
          aria-label={isFr ? 'Utiliser ma position GPS' : 'Use my current location'}
          className="aspect-square w-11 h-11 min-w-[44px] min-h-[44px] p-0 rounded-full bg-card hover:bg-chip text-ink shrink-0 cursor-pointer ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]"
        >
          {isLocating ? (
            <LoaderCircle className="w-4 h-4 animate-spin text-sky-500" />
          ) : (
            <LocateFixed className="w-4 h-4 text-ink-secondary" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <LocationAutocompleteInput
            compact
            hidePresetHubs
            inputBgClassName="bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]"
            value={queryText}
            placeholder={
              isFr
                ? 'Ville (ex. Lyon, Nice, Montréal…)'
                : 'Search city (e.g. Lyon, Boulder…)'
            }
            onChange={(v) => setQueryText(v)}
            onSelectLocation={handleSelectSuggestion}
          />
        </div>
      </div>

      {/* Row 2: Generous, untruncated Date & Time inputs */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-sub-pod bg-card px-3.5 py-2 ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]">
          <label className="block text-[10px] font-rounded font-semibold text-ink-muted leading-none mb-1">
            {isFr ? 'Date' : 'Date'}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full bg-transparent text-base sm:text-xs font-rounded font-bold text-ink tnum focus:outline-none"
          />
        </div>

        <div className="rounded-sub-pod bg-card px-3.5 py-2 ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]">
          <label className="block text-[10px] font-rounded font-semibold text-ink-muted leading-none mb-1">
            {isFr ? timeLabelFr : timeLabelEn}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full bg-transparent text-base sm:text-xs font-rounded font-bold text-ink tnum focus:outline-none"
          />
        </div>
      </div>

      {/* Live Weather Readout Strip */}
      {isLoadingWeather && (
        <div className="flex items-center gap-2 text-xs text-ink-muted pt-0.5">
          <LoaderCircle className="w-3.5 h-3.5 animate-spin text-sky-500" />
          <span>
            {isFr
              ? `Chargement de la météo horaire pour ${selectedLoc?.label || 'ta ville'}…`
              : `Fetching hourly weather for ${selectedLoc?.label || 'your city'}…`}
          </span>
        </div>
      )}

      {!isLoadingWeather && liveWeather && (
        <div className="rounded-sub-pod bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 tnum">
            <span className="font-rounded font-bold text-ink">{liveWeather.locationLabel}</span>
            <span className="inline-flex items-center gap-1 text-ink-secondary font-semibold">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              {liveWeather.weather.temperatureC} °C
            </span>
            <span className="inline-flex items-center gap-1 text-ink-secondary font-semibold">
              <Wind className="w-3.5 h-3.5 text-sky-500" />
              {liveWeather.weather.windSpeedKmH} km/h{' '}
              {degreesToCompassCardinal(liveWeather.weather.windDirectionDegrees, lang)}
              {liveWeather.weather.windGustsKmH > liveWeather.weather.windSpeedKmH + 4 && (
                <span className="text-ink-muted font-normal">
                  ({isFr ? 'raf.' : 'gusts'} {liveWeather.weather.windGustsKmH})
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-ink-secondary font-semibold">
              <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              {liveWeather.rainRiskPct}%
            </span>
          </div>
          {selectedLoc && (
            <button
              type="button"
              onClick={() => void fetchForLocation(selectedLoc, date, time)}
              className="inline-flex items-center gap-1 text-[11px] font-rounded font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
              title={isFr ? 'Actualiser la météo' : 'Refresh forecast'}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isFr ? 'Actualiser' : 'Refresh'}</span>
            </button>
          )}
        </div>
      )}

      {statusError && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">{statusError}</p>
      )}
    </div>
  );
};
