import React, { useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  Hanger,
  Flashlight,
  CloudRain,
  Wind,
  Thermometer,
  Sun,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getLocalTodayIso } from '../../services/weatherService';
import { getKitRecommendation } from '../../utils/kitAdvisor';
import { calculateRideVisibility } from '../../utils/solarVisibility';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { LiveWeatherPayload, ToolLiveWeatherBar } from './ToolLiveWeatherBar';
import {
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';

export interface WhatToWearToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

const HERO_ACCENT_CARD_CLS =
  'bg-[#faffcb] text-[#3a3f00] ring-1 ring-inset ring-[#a3b300]/35 dark:bg-[#1e2108] dark:text-[#e3ff00] dark:ring-[#dfff00]/30';

export const WhatToWearTool: React.FC<WhatToWearToolProps> = ({
  lang,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [coords, setCoords] = useState<[number, number]>([48.8566, 2.3522]);
  const [rideDate, setRideDate] = useState<string>(() => getLocalTodayIso());
  const [startTime, setStartTime] = useState<string>('08:00');
  const [rideHours, setRideHours] = useState<number>(2);
  const [speedKmH, setSpeedKmH] = useState<number>(24);

  const [tempC, setTempC] = useState<number>(11);
  const [windKmH, setWindKmH] = useState<number>(16);
  const [rainRisk, setRainRisk] = useState<number>(20);
  const [hasLiveWeather, setHasLiveWeather] = useState(false);
  const [showManualSliders, setShowManualSliders] = useState(false);

  const handleWeatherFetched = (payload: LiveWeatherPayload) => {
    setLocationLabel(payload.locationLabel);
    setCoords(payload.coords);
    setTempC(Math.round(payload.weather.temperatureC));
    setWindKmH(Math.round(payload.weather.windSpeedKmH));
    setRainRisk(payload.rainRiskPct);
    setHasLiveWeather(true);
    setShowManualSliders(false);
  };

  const result = useMemo(() => {
    const distKm = Math.max(5, Math.round(rideHours * speedKmH));
    const syntheticTrip = buildTripFromToolRoute({
      name: locationLabel ? `${locationLabel} ${distKm} km` : `${distKm} km Ride`,
      distanceKm: distKm,
      speedKmH,
      departureDate: rideDate,
      departureTime: startTime,
      temperatureC: tempC,
      windSpeedKmH: windKmH,
      riderSpecs,
      lang,
    });
    syntheticTrip.route.coordinates = [coords, [coords[0] + 0.05, coords[1] + 0.05]];
    syntheticTrip.weather = {
      ...syntheticTrip.weather,
      temperatureC: tempC,
      baseWindSpeedKmH: windKmH,
      effectiveHeadwindKmH: Math.round(windKmH * 0.6),
      precipitationRiskPercent: rainRisk,
      visibilityKm: rainRisk >= 50 ? 4 : 15,
    };

    const visibility = calculateRideVisibility(syntheticTrip, rideDate, startTime, speedKmH);
    const solarPhase =
      visibility.nightPercent > 0
        ? 'deep-night'
        : visibility.twilightPercent > 0
        ? 'civil-twilight'
        : 'daylight';

    const kit = getKitRecommendation(syntheticTrip.weather, solarPhase, lang, {
      ridingSpeedKmH: speedKmH,
    });

    const windChillDropC = Math.max(0, Math.round(tempC - kit.feelsLikeC));
    return { kit, visibility, syntheticTrip, windChillDropC };
  }, [locationLabel, coords, rideDate, startTime, rideHours, speedKmH, tempC, windKmH, rainRisk, riderSpecs, lang]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left: Live Weather Search & Riding Profile */}
      <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
            {isFr ? 'Météo de ta sortie' : 'Live weather for your ride'}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
            {isFr
              ? 'Cherche ta ville pour charger la température, le vent, la pluie et les heures de jour en direct.'
              : 'Search any city worldwide (or tap GPS) to fetch real hourly temperature, wind, rain risk, and daylight windows.'}
          </p>
        </div>

        <ToolLiveWeatherBar
          lang={lang}
          date={rideDate}
          time={startTime}
          titleEn="Search location for live forecast"
          titleFr="Chercher un lieu pour la météo en direct"
          subtitleEn="Automatically adjusts outfit layers & headlight lumens to your exact start time."
          subtitleFr="Adapte automatiquement les couches et l’éclairage à ton heure de départ."
          onDateChange={setRideDate}
          onTimeChange={setStartTime}
          onWeatherFetched={handleWeatherFetched}
        />

        {/* Ride duration & riding speed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Durée prévue' : 'Ride length'}
              </span>
              <span className="font-rounded font-extrabold text-ink tnum">{rideHours} h</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={7}
              step={0.5}
              value={rideHours}
              onChange={(e) => setRideHours(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>

          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Ta vitesse moyenne' : 'Your riding speed'}
              </span>
              <span className="font-rounded font-extrabold text-ink tnum">{speedKmH} km/h</span>
            </div>
            <input
              type="range"
              min={14}
              max={36}
              step={1}
              value={speedKmH}
              onChange={(e) => setSpeedKmH(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>
        </div>

        {/* Collapsible manual weather override */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowManualSliders((v) => !v)}
            aria-expanded={showManualSliders}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-pod bg-pod/70 hover:bg-pod text-xs font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {hasLiveWeather
                  ? isFr
                    ? 'Ajuster température / vent / pluie manuellement'
                    : 'Fine-tune weather manually'
                  : isFr
                  ? 'Ou régler la météo manuellement'
                  : 'Or set weather conditions manually'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted tnum shrink-0">
              <span>
                {tempC}°C · {windKmH} km/h · {rainRisk}%
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showManualSliders ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {showManualSliders && (
            <div className="space-y-3 animate-apple-fade-in">
              <div className="rounded-pod bg-pod p-3.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-rounded font-semibold text-ink-secondary inline-flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5" />
                    {isFr ? 'Température air' : 'Air temperature'}
                  </span>
                  <span className="font-rounded font-extrabold text-ink tnum">{tempC} °C</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={34}
                  step={1}
                  value={tempC}
                  onChange={(e) => setTempC(Number(e.target.value))}
                  className="peloton-slider w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-pod bg-pod p-3.5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-rounded font-semibold text-ink-secondary inline-flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5" />
                      {isFr ? 'Vent' : 'Wind'}
                    </span>
                    <span className="font-rounded font-bold text-ink tnum">{windKmH} km/h</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={1}
                    value={windKmH}
                    onChange={(e) => setWindKmH(Number(e.target.value))}
                    className="peloton-slider w-full"
                  />
                </div>

                <div className="rounded-pod bg-pod p-3.5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-rounded font-semibold text-ink-secondary inline-flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5" />
                      {isFr ? 'Risque pluie' : 'Rain chance'}
                    </span>
                    <span className="font-rounded font-bold text-ink tnum">{rainRisk} %</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={rainRisk}
                    onChange={(e) => setRainRisk(Number(e.target.value))}
                    className="peloton-slider w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Kit Recommendation */}
      <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-purple-600 dark:text-purple-400">
            <Hanger className="w-4 h-4" />
            <span>{isFr ? 'Tenue recommandée' : 'Recommended kit'}</span>
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-rounded font-bold ${CHIP_TOKENS[result.kit.tierTheme].surface} ${CHIP_TOKENS[result.kit.tierTheme].primary}`}
          >
            {result.kit.tierBadge}
          </span>
        </div>

        {/* Hero Feels-Like Pod (Calm Obsidian-Volt + Wind-Chill Drop Reality) */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-pod p-4 ${HERO_ACCENT_CARD_CLS}`}>
            <div className="text-[11px] font-rounded font-bold opacity-80">
              {isFr ? `Ressenti à ${speedKmH} km/h` : `Feels like at ${speedKmH} km/h`}
            </div>
            <div className="text-3xl font-extrabold font-rounded tnum mt-0.5 leading-none">
              {result.kit.feelsLikeC} °C
            </div>
            <div className="text-[11px] opacity-85 tnum mt-1.5 font-semibold">
              {result.windChillDropC >= 2
                ? isFr
                  ? `−${result.windChillDropC} °C de moins sur le vélo que l’air (${tempC} °C)`
                  : `−${result.windChillDropC}°C colder on the bike than air (${tempC}°C)`
                : isFr
                ? `Air ${tempC} °C · Vent ${windKmH} km/h`
                : `Air ${tempC}°C · Wind ${windKmH} km/h`}
            </div>
          </div>

          <div className="rounded-pod bg-pod p-4">
            <div className="text-[11px] font-rounded font-semibold text-ink-muted flex items-center gap-1">
              <Flashlight className="w-3.5 h-3.5 text-amber-500" />
              <span>{isFr ? 'Éclairage & jour' : 'Lights & daylight'}</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold font-rounded text-ink tnum mt-1 leading-tight">
              {result.visibility.lightingGear.recommendedLumens}
            </div>
            <div className="text-[11px] text-ink-muted tnum mt-1 inline-flex items-center gap-1">
              <Sun className="w-3 h-3" />
              <span>
                {result.visibility.solar.sunrise} – {result.visibility.solar.sunset}
              </span>
            </div>
          </div>
        </div>

        {/* Layer Cards */}
        <div className="space-y-2.5">
          <div className="rounded-pod bg-pod p-3.5">
            <div className="text-[11px] font-rounded font-bold text-ink-muted mb-1">
              {isFr ? 'Haut du corps' : 'Upper body'}
            </div>
            <div className="text-sm font-medium text-ink leading-snug">{result.kit.upperBody}</div>
          </div>
          <div className="rounded-pod bg-pod p-3.5">
            <div className="text-[11px] font-rounded font-bold text-ink-muted mb-1">
              {isFr ? 'Jambes, mains & pieds' : 'Legs, hands & feet'}
            </div>
            <div className="text-sm font-medium text-ink leading-snug">
              {result.kit.lowerAndExtremities}
            </div>
          </div>
          <div className="rounded-pod bg-pod p-3.5">
            <div className="text-[11px] font-rounded font-bold text-ink-muted mb-1">
              {isFr ? 'Pluie & lunettes' : 'Rain & eyewear'}
            </div>
            <div className="text-sm font-medium text-ink leading-snug">
              {result.kit.opticsAndShield}
            </div>
          </div>
        </div>

        {onOpenTripInCadence && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => onOpenTripInCadence(result.syntheticTrip)}
            className={`w-full min-h-[48px] px-5 rounded-full text-sm font-rounded font-bold cursor-pointer ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
          >
            <span>
              {isFr ? 'Planifier cette sortie dans Cadence' : 'Plan this ride in Cadence'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
