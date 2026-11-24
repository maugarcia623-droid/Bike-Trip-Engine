import React, { useMemo, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import { Clock, ArrowRight, Wind, SlidersHorizontal, ChevronDown } from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getLocalTodayIso } from '../../services/weatherService';
import { buildTripFromToolRoute } from '../../data/demoToolRoutes';
import { LiveWeatherPayload, ToolLiveWeatherBar } from './ToolLiveWeatherBar';
import { YELLOW_VEST_SOLID_CTA_CLASSES } from '../../tokens/chipTokens';

export interface LeaveByToolProps {
  lang: 'en' | 'fr';
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onOpenTripInCadence?: (trip: TripProfile) => void;
}

const HERO_ACCENT_CARD_CLS =
  'bg-[#faffcb] text-[#3a3f00] ring-1 ring-inset ring-[#a3b300]/35 dark:bg-[#1e2108] dark:text-[#e3ff00] dark:ring-[#dfff00]/30';

export const LeaveByTool: React.FC<LeaveByToolProps> = ({
  lang,
  riderSpecs,
  onOpenTripInCadence,
}) => {
  const isFr = lang === 'fr';
  const [rideDate, setRideDate] = useState<string>(() => getLocalTodayIso());
  const [targetArrivalTime, setTargetArrivalTime] = useState<string>('09:00');
  const [distanceKm, setDistanceKm] = useState<number>(15);
  const [speedKmH, setSpeedKmH] = useState<number>(21);
  const [headwindKmH, setHeadwindKmH] = useState<number>(12);
  const [stopMin, setStopMin] = useState<number>(0);
  const [prepMin, setPrepMin] = useState<number>(10);
  const [liveTempC, setLiveTempC] = useState<number>(14);
  const [liveLocation, setLiveLocation] = useState<string | null>(null);
  const [showManualWind, setShowManualWind] = useState<boolean>(false);

  const handleWeatherFetched = (payload: LiveWeatherPayload) => {
    setHeadwindKmH(Math.min(45, Math.round(payload.weather.windSpeedKmH)));
    setLiveTempC(Math.round(payload.weather.temperatureC));
    setLiveLocation(payload.locationLabel);
    setShowManualWind(false);
  };

  const leaveBy = useMemo(() => {
    const adjustedSpeed = Math.max(10, speedKmH - headwindKmH * 0.22);
    const movingSecs = Math.round((distanceKm / adjustedSpeed) * 3600);
    const res = calculateReverseTimeline(
      {
        origin: isFr ? 'Départ' : 'Home',
        destination: isFr ? 'Arrivée' : 'Target',
        distanceKm,
        elevationGainM: Math.round(distanceKm * 5),
        targetSpeedKmH: adjustedSpeed,
        pacingMode: 'speed',
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
      },
      {
        gateName: isFr ? 'Rendez-vous' : 'Arrival',
        shiftStartTime: targetArrivalTime,
        targetGateArrivalTime: targetArrivalTime,
        lockerRefuelMinutes: 0,
        showerChangeMinutes: prepMin,
        breakRoomBreakfastMinutes: 0,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: false,
        notes: '',
      },
      {
        temperatureC: liveTempC,
        windDirectionDegrees: 0,
        windDirection: headwindKmH > 5 ? 'headwind' : 'calm',
        baseWindSpeedKmH: headwindKmH,
        precipitationRiskPercent: 10,
        estuaryGustKmH: Math.round(headwindKmH * 1.3),
        visibilityKm: 10,
        isHeadwindActive: headwindKmH > 5,
        airDensityRho: 1.225,
        effectiveHeadwindKmH: headwindKmH,
      },
      'COMMUTE',
      isFr ? 'Rendez-vous' : 'Target',
      lang,
      stopMin,
      stopMin > 0 ? ['coffee-stop'] : [],
      {
        effectiveSpeedKmH: adjustedSpeed,
        calmSpeedKmH: speedKmH,
        arriveAtMode: true,
        movingTimeSeconds: movingSecs,
        logistics: {
          coffeeDurationMin: stopMin,
          preRideStyle: 'light-liquid',
        },
      }
    );
    const movingMin = Math.round(movingSecs / 60);
    const calmMin = Math.round((distanceKm / Math.max(10, speedKmH)) * 60);
    const windPenaltyMin = Math.max(0, movingMin - calmMin);
    return { res, adjustedSpeed, movingMin, windPenaltyMin };
  }, [targetArrivalTime, distanceKm, speedKmH, headwindKmH, stopMin, prepMin, liveTempC, isFr, lang]);

  const totalBuffersMin = leaveBy.res.bufferMinutes + prepMin;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-rounded text-ink">
            {isFr
              ? 'Calcule ton heure de départ exacte'
              : 'Count backwards with live wind & buffers'}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
            {isFr
              ? 'Charge le vent réel dans ta ville pour estimer le ralentissement, puis ajoute tes marges douche, cadenas ou café.'
              : 'Pull live wind for your city to account for real headwind slowdown, plus shower, lock-up, and coffee buffers.'}
          </p>
        </div>

        <ToolLiveWeatherBar
          lang={lang}
          date={rideDate}
          time={targetArrivalTime}
          timeLabelEn="Arrive by"
          timeLabelFr="Arrivée"
          titleEn="Fetch live wind for your commute / meetup"
          titleFr="Charger le vent réel pour ton trajet"
          subtitleEn="Auto-fills forecast wind speed so a headwind never makes you late."
          subtitleFr="Remplit automatiquement le vent prévu pour éviter de courir."
          onDateChange={setRideDate}
          onTimeChange={setTargetArrivalTime}
          onWeatherFetched={handleWeatherFetched}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Distance' : 'Distance'}
              </span>
              <span className="font-rounded font-extrabold text-ink tnum">{distanceKm} km</span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>

          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Ton allure habituelle' : 'Usual speed'}
              </span>
              <span className="font-rounded font-bold text-ink tnum">{speedKmH} km/h</span>
            </div>
            <input
              type="range"
              min={12}
              max={36}
              step={1}
              value={speedKmH}
              onChange={(e) => setSpeedKmH(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Douche / changement / cadenas' : 'Lock bike, shower & change'}
              </span>
              <span className="font-rounded font-bold text-ink tnum">{prepMin} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={35}
              step={5}
              value={prepMin}
              onChange={(e) => setPrepMin(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>

          <div className="rounded-pod bg-pod p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-rounded font-semibold text-ink-secondary">
                {isFr ? 'Pause café / marge sécurité' : 'Coffee stop / extra buffer'}
              </span>
              <span className="font-rounded font-bold text-ink tnum">{stopMin} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={45}
              step={5}
              value={stopMin}
              onChange={(e) => setStopMin(Number(e.target.value))}
              className="peloton-slider w-full"
            />
          </div>
        </div>

        {/* Collapsible manual wind override */}
        <div className="space-y-2.5">
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
                    ? `Vent prévu (${liveLocation}) · Ajuster manuellement`
                    : `Live wind (${liveLocation}) · Adjust manually`
                  : isFr
                  ? 'Ou régler le vent de face manuellement'
                  : 'Or set headwind manually'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted tnum shrink-0">
              <span>{headwindKmH} km/h</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showManualWind ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {showManualWind && (
            <div className="rounded-pod bg-pod p-3.5 animate-apple-fade-in">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-rounded font-semibold text-ink-secondary inline-flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isFr ? 'Vent de face' : 'Headwind'}</span>
                </span>
                <span className="font-rounded font-bold text-ink tnum">{headwindKmH} km/h</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                step={1}
                value={headwindKmH}
                onChange={(e) => setHeadwindKmH(Number(e.target.value))}
                className="peloton-slider w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Result */}
      <div className="lg:col-span-5 rounded-card bg-card p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-rounded font-bold text-orange-600 dark:text-orange-400">
            <Clock className="w-4 h-4" />
            <span>{isFr ? 'Heure de départ conseillée' : 'Recommended leave-by time'}</span>
          </span>
          <span className="text-[11px] text-ink-muted tnum">→ {targetArrivalTime}</span>
        </div>

        <div className={`rounded-pod p-5 text-center ${HERO_ACCENT_CARD_CLS}`}>
          <div className="text-xs font-rounded font-bold opacity-80">
            {isFr ? 'Pars au plus tard à' : 'Roll out no later than'}
          </div>
          <div className="text-5xl font-extrabold font-rounded tnum tracking-tight mt-1 leading-none">
            {leaveBy.res.hardDepartureTime}
          </div>
          <div className="text-xs font-semibold opacity-85 tnum mt-2">
            {leaveBy.movingMin} min {isFr ? 'roulé' : 'riding'}
            {leaveBy.windPenaltyMin > 0
              ? isFr
                ? ` (dont +${leaveBy.windPenaltyMin} min vent)`
                : ` (incl. +${leaveBy.windPenaltyMin} min wind)`
              : ''}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-pod bg-pod p-3.5">
            <div className="text-[11px] text-ink-muted">
              {isFr ? 'Vitesse réelle' : 'Effective speed'}
            </div>
            <div className="text-lg font-extrabold font-rounded text-ink tnum mt-0.5">
              {leaveBy.adjustedSpeed.toFixed(1)} km/h
            </div>
          </div>
          <div className="rounded-pod bg-pod p-3.5">
            <div className="text-[11px] text-ink-muted">
              {isFr ? 'Marges incluses' : 'Buffers included'}
            </div>
            <div className="text-lg font-extrabold font-rounded text-ink tnum mt-0.5">
              +{totalBuffersMin} min
            </div>
          </div>
        </div>

        {onOpenTripInCadence && (
          <Button
            variant="primary"
            size="lg"
            onClick={() =>
              onOpenTripInCadence(
                buildTripFromToolRoute({
                  name: isFr ? `Trajet ${distanceKm} km` : `${distanceKm} km Commute`,
                  distanceKm,
                  speedKmH,
                  departureDate: rideDate,
                  windSpeedKmH: headwindKmH,
                  temperatureC: liveTempC,
                  arriveAtMode: true,
                  targetArrivalTime,
                  tag: isFr ? 'Vélotaf' : 'Commute',
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
  );
};
