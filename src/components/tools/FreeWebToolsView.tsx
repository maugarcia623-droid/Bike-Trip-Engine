import React, { useMemo, useState } from 'react';
import {
  Wind,
  Clock,
  Gauge,
  Zap,
  Flame,
  ArrowLeft,
  ShieldCheck,
  TriangleAlert,
} from '@/components/icons';
import { Button } from '@/components/arc';
import { useTranslation } from '../../context/LanguageContext';
import { TripProfile } from '../../types/trip';
import { BikeCategory, CasingType, PressureUnit, RiderBikeSpecs } from '../../types/specs';
import { calculatePhysics } from '../../utils/physics';
import { barToPsi, calculateTyrePressure } from '../../utils/tyrePressure';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { calculateReverseTimeline } from '../../utils/timeline';
import { calculateAirDensity } from '../../services/weatherService';
import { CHIP_DUOTONE_ISOLATION_CLASSES, CHIP_RING_BASE, CHIP_TOKENS } from '../../tokens/chipTokens';

export type FreeWebToolTab = 'wind' | 'leave-by' | 'pressure';

export interface FreeWebToolsViewProps {
  initialTab?: FreeWebToolTab;
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onBackToCockpit: () => void;
}

const BIKE_PROFILE_PRESETS = [
  { id: 'aero-road', labelEn: 'Aero Road', labelFr: 'Route Aéro', cda: 0.285, crr: 0.0038, tw: 28, bikeKg: 7.8 },
  { id: 'endurance', labelEn: 'Endurance Road', labelFr: 'Route Endurance', cda: 0.34, crr: 0.0044, tw: 32, bikeKg: 8.8 },
  { id: 'gravel', labelEn: 'Gravel 38c', labelFr: 'Gravel 38c', cda: 0.38, crr: 0.0062, tw: 38, bikeKg: 10.6 },
  { id: 'urban', labelEn: 'Commuter / Cargo', labelFr: 'Urbain / Vélotaf', cda: 0.48, crr: 0.0068, tw: 42, bikeKg: 14.5 },
] as const;

const WIND_ANGLE_PRESETS = [
  { deg: 0, labelEn: 'Direct Headwind (0°)', labelFr: 'Face pur (0°)' },
  { deg: 45, labelEn: 'Cross-Head (45°)', labelFr: 'Trois-quarts face (45°)' },
  { deg: 90, labelEn: 'Crosswind (90°)', labelFr: 'Vent de travers (90°)' },
  { deg: 180, labelEn: 'Tailwind (180°)', labelFr: 'Vent de dos (180°)' },
] as const;

export const FreeWebToolsView: React.FC<FreeWebToolsViewProps> = ({
  initialTab = 'wind',
  activeTrip,
  riderSpecs,
  onBackToCockpit,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [activeTab, setActiveTab] = useState<FreeWebToolTab>(initialTab);

  // ── 1. Wind Cost Calculator state ──────────────────────────────────────────
  const [distanceKm, setDistanceKm] = useState<number>(() => activeTrip?.route?.distanceKm ?? 35);
  const [elevGainM, setElevGainM] = useState<number>(() => activeTrip?.route?.elevationGainM ?? 220);
  const [speedKmH, setSpeedKmH] = useState<number>(() => activeTrip?.route?.targetSpeedKmH ?? 25);
  const [riderMassKg, setRiderMassKg] = useState<number>(() => riderSpecs?.riderWeightKg ?? activeTrip?.physics?.riderWeightKg ?? 75);
  const [bikePresetId, setBikePresetId] = useState<string>('gravel');
  const [windSpeedKmH, setWindSpeedKmH] = useState<number>(() => activeTrip?.weather?.baseWindSpeedKmH ?? 22);
  const [windAngleDeg, setWindAngleDeg] = useState<number>(0);
  const [tempC, setTempC] = useState<number>(() => activeTrip?.weather?.temperatureC ?? 14);

  const selectedBikePreset =
    BIKE_PROFILE_PRESETS.find((b) => b.id === bikePresetId) || BIKE_PROFILE_PRESETS[2];

  const windCostResult = useMemo(() => {
    const rho = calculateAirDensity(tempC, 1013);
    const avgGradePct =
      distanceKm > 0 ? Math.min(8, Math.max(0, (elevGainM / (distanceKm * 1000)) * 100 * 0.45)) : 0;

    // Bearing north (0°) so windAngleDeg directly sets wind relative direction:
    // In weatherService/physics, windDirectionDegrees=0 blows FROM North onto a Northbound rider (headwind).
    const phys = calculatePhysics(
      {
        riderWeightKg: riderMassKg,
        bikeWeightKg: selectedBikePreset.bikeKg,
        gearWeightKg: 1.5,
        luggageWeightKg: 1.5,
        cda: selectedBikePreset.cda,
        crr: selectedBikePreset.crr,
        rho,
        drivetrainEfficiency: 0.96,
        grossMechanicalEfficiency: 0.24,
        gradientPercent: avgGradePct,
      },
      {
        origin: 'Start',
        destination: 'Finish',
        distanceKm,
        elevationGainM: elevGainM,
        targetSpeedKmH: speedKmH,
        pacingMode: 'speed',
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
      },
      {
        temperatureC: tempC,
        windDirectionDegrees: windAngleDeg,
        windDirection:
          windAngleDeg <= 45 ? 'headwind' : windAngleDeg <= 100 ? 'cross-headwind' : 'tailwind',
        baseWindSpeedKmH: windSpeedKmH,
        precipitationRiskPercent: 10,
        estuaryGustKmH: Math.round(windSpeedKmH * 1.35),
        visibilityKm: 10,
        isHeadwindActive: windAngleDeg < 90 && windSpeedKmH > 5,
        airDensityRho: rho,
        effectiveHeadwindKmH: Number((windSpeedKmH * Math.cos((windAngleDeg * Math.PI) / 180)).toFixed(1)),
      },
      lang,
      riderSpecs?.ftpWatts ?? 230
    );

    const effectiveHeadwind = windSpeedKmH * Math.cos((windAngleDeg * Math.PI) / 180);
    const airSpeedTotalKmH = Math.max(0, speedKmH + effectiveHeadwind);

    return { phys, rho, effectiveHeadwind, airSpeedTotalKmH };
  }, [distanceKm, elevGainM, speedKmH, riderMassKg, selectedBikePreset, windSpeedKmH, windAngleDeg, tempC, riderSpecs?.ftpWatts, lang]);

  // ── 2. Leave-By Calculator state ───────────────────────────────────────────
  const [targetArrivalTime, setTargetArrivalTime] = useState<string>(
    () => activeTrip?.office?.targetGateArrivalTime || '10:30'
  );
  const [lbDistKm, setLbDistKm] = useState<number>(() => activeTrip?.route?.distanceKm ?? 30);
  const [lbSpeedKmH, setLbSpeedKmH] = useState<number>(() => activeTrip?.route?.targetSpeedKmH ?? 24);
  const [lbHeadwindKmH, setLbHeadwindKmH] = useState<number>(() => activeTrip?.weather?.baseWindSpeedKmH ?? 14);
  const [lbCoffeeMin, setLbCoffeeMin] = useState<number>(15);
  const [lbPrepMin, setLbPrepMin] = useState<number>(10);

  const leaveByTimeline = useMemo(() => {
    const adjustedSpeed = Math.max(10, lbSpeedKmH - lbHeadwindKmH * 0.22);
    const movingSecs = Math.round((lbDistKm / adjustedSpeed) * 3600);
    const res = calculateReverseTimeline(
      {
        origin: isFr ? 'Départ' : 'Home',
        destination: isFr ? 'Arrivée' : 'Target',
        distanceKm: lbDistKm,
        elevationGainM: Math.round(lbDistKm * 6),
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
        showerChangeMinutes: 0,
        breakRoomBreakfastMinutes: lbPrepMin,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: false,
        notes: '',
      },
      {
        temperatureC: 14,
        windDirectionDegrees: 0,
        windDirection: lbHeadwindKmH > 5 ? 'headwind' : 'calm',
        baseWindSpeedKmH: lbHeadwindKmH,
        precipitationRiskPercent: 10,
        estuaryGustKmH: Math.round(lbHeadwindKmH * 1.3),
        visibilityKm: 10,
        isHeadwindActive: lbHeadwindKmH > 5,
        airDensityRho: 1.225,
        effectiveHeadwindKmH: lbHeadwindKmH,
      },
      'SPORT',
      isFr ? 'Rendez-vous' : 'Target',
      lang,
      lbCoffeeMin,
      lbCoffeeMin > 0 ? ['coffee-stop'] : [],
      {
        effectiveSpeedKmH: adjustedSpeed,
        calmSpeedKmH: lbSpeedKmH,
        arriveAtMode: true,
        movingTimeSeconds: movingSecs,
        logistics: {
          coffeeDurationMin: lbCoffeeMin,
          preRideStyle: 'light-liquid',
        },
      }
    );
    return { res, adjustedSpeed };
  }, [targetArrivalTime, lbDistKm, lbSpeedKmH, lbHeadwindKmH, lbCoffeeMin, lbPrepMin, isFr, lang]);

  // ── 3. Tyre Pressure Calculator state ──────────────────────────────────────
  const [tpSystemKg, setTpSystemKg] = useState<number>(85);
  const [tpWidthMm, setTpWidthMm] = useState<number>(38);
  const [tpCategory, setTpCategory] = useState<BikeCategory>('gravel');
  const [tpCasing, setTpCasing] = useState<CasingType>('standard');
  const [tpTubeless, setTpTubeless] = useState<boolean>(true);
  const [tpHookless, setTpHookless] = useState<boolean>(false);
  const [tpSurfaceMix, setTpSurfaceMix] = useState<'paved' | 'mixed' | 'gravel'>('mixed');
  const [tpWet, setTpWet] = useState<boolean>(false);
  const [tpUnit, setTpUnit] = useState<PressureUnit>(() => {
    const src = riderSpecs || loadRiderBikeSpecs();
    return src.pressureUnit === 'psi' ? 'psi' : 'bar';
  });

  const tpResult = useMemo(() => {
    const surfacePcts =
      tpSurfaceMix === 'paved'
        ? { pavedPct: 100, gravelPct: 0, singletrackPct: 0 }
        : tpSurfaceMix === 'mixed'
        ? { pavedPct: 55, gravelPct: 40, singletrackPct: 5 }
        : { pavedPct: 15, gravelPct: 65, singletrackPct: 20 };

    return calculateTyrePressure({
      systemMassKg: tpSystemKg,
      tireWidthMm: tpWidthMm,
      bikeCategory: tpCategory,
      casingType: tpCasing,
      isTubeless: tpTubeless,
      isHookless: tpHookless,
      ...surfacePcts,
      gearWeightKg: tpCategory === 'touring' ? 7 : 1.5,
    });
  }, [tpSystemKg, tpWidthMm, tpCategory, tpCasing, tpTubeless, tpHookless, tpSurfaceMix]);

  const displayedFrontBar = Number(Math.max(1.2, tpResult.frontBar - (tpWet ? 0.2 : 0)).toFixed(1));
  const displayedRearBar = Number(Math.max(1.3, tpResult.rearBar - (tpWet ? 0.2 : 0)).toFixed(1));

  const tabs: { id: FreeWebToolTab; label: string; icon: React.ElementType; theme: 'sky' | 'amber' | 'teal' }[] = [
    {
      id: 'wind',
      label: isFr ? 'Coût du vent (W & min)' : 'Wind cost calculator',
      icon: Wind,
      theme: 'sky',
    },
    {
      id: 'leave-by',
      label: isFr ? 'Calculateur départ (Leave-by)' : 'Leave-by calculator',
      icon: Clock,
      theme: 'amber',
    },
    {
      id: 'pressure',
      label: isFr ? 'Pression pneus 15 %' : '15% drop tyre pressure',
      icon: Gauge,
      theme: 'teal',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-3 pb-16 space-y-5 animate-apple-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[11px] font-rounded font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isFr ? 'Outils gratuits 100% navigateur · Sans compte' : 'Free in-browser physics tools · No signup'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-rounded text-ink tracking-tight">
            {isFr ? 'Calculateurs tactiques Cadence' : 'Cadence free cycling tools'}
          </h1>
        </div>

        <Button
          variant="secondary"
          type="button"
          onClick={onBackToCockpit}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-card dark:bg-pod hover:bg-chip text-xs font-rounded font-bold text-ink shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isFr ? 'Accueil' : 'Home'}</span>
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const tokens = CHIP_TOKENS[tab.theme];
          return (
            <Button
              key={tab.id}
              variant="ghost"
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 min-h-[42px] px-4 rounded-full text-xs sm:text-[13px] font-rounded font-bold transition-all cursor-pointer shrink-0 ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                active
                  ? `${tokens.surface} ${tokens.primary} ${tokens.selectedRing} shadow-xs`
                  : 'bg-card dark:bg-pod text-ink-secondary hover:text-ink ring-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-current" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </div>

      {/* ═══════════════ TAB 1: WIND COST CALCULATOR ═══════════════ */}
      {activeTab === 'wind' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Inputs */}
          <div className="lg:col-span-7 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold font-rounded text-ink">
                {isFr
                  ? 'Combien vous coûte le vent en watts et en minutes ?'
                  : 'What does today’s wind cost you in watts and minutes?'}
              </h2>
              <p className="text-xs text-ink-muted font-rounded mt-0.5">
                {isFr
                  ? 'Calcule l’impact réel sur votre puissance (CdA, Crr, densité de l’air ρ) sans capteur.'
                  : 'Calculates exact aerodynamic drag penalty (CdA, Crr & air density ρ) without a power meter.'}
              </p>
            </div>

            {/* Bike Profile */}
            <div>
              <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                {isFr ? 'Type de vélo / Position' : 'Bike profile / Aero stance'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {BIKE_PROFILE_PRESETS.map((bp) => {
                  const sel = bikePresetId === bp.id;
                  return (
                    <Button
                      key={bp.id}
                      variant="ghost"
                      type="button"
                      onClick={() => setBikePresetId(bp.id)}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-sub-pod text-xs font-rounded font-semibold cursor-pointer ${
                        sel
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ring-2 ring-inset ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : 'bg-pod text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {isFr ? bp.labelFr : bp.labelEn}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Numeric Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Distance' : 'Distance'}</span>
                  <strong className="text-ink tnum">{distanceKm} km</strong>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Vitesse cible' : 'Target speed'}</span>
                  <strong className="text-ink tnum">{speedKmH} km/h</strong>
                </div>
                <input
                  type="range"
                  min={14}
                  max={40}
                  step={1}
                  value={speedKmH}
                  onChange={(e) => setSpeedKmH(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Vent (km/h)' : 'Wind speed'}</span>
                  <strong className="text-ink tnum">{windSpeedKmH} km/h</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={55}
                  step={1}
                  value={windSpeedKmH}
                  onChange={(e) => setWindSpeedKmH(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Dénivelé D+' : 'Elevation gain'}</span>
                  <strong className="text-ink tnum">+{elevGainM} m</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2500}
                  step={50}
                  value={elevGainM}
                  onChange={(e) => setElevGainM(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Poids cycliste' : 'Rider weight'}</span>
                  <strong className="text-ink tnum">{riderMassKg} kg</strong>
                </div>
                <input
                  type="range"
                  min={45}
                  max={125}
                  step={1}
                  value={riderMassKg}
                  onChange={(e) => setRiderMassKg(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Température air' : 'Air temperature'}</span>
                  <strong className="text-ink tnum">{tempC}°C</strong>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={38}
                  step={1}
                  value={tempC}
                  onChange={(e) => setTempC(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>
            </div>

            {/* Wind Angle Presets */}
            <div>
              <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                {isFr ? 'Angle du vent' : 'Wind direction relative to bike'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {WIND_ANGLE_PRESETS.map((wa) => {
                  const sel = windAngleDeg === wa.deg;
                  return (
                    <Button
                      key={wa.deg}
                      variant="ghost"
                      type="button"
                      onClick={() => setWindAngleDeg(wa.deg)}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-sub-pod text-[11px] font-rounded font-semibold cursor-pointer ${
                        sel
                          ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ring-2 ring-inset ${CHIP_TOKENS.sky.selectedRing}`
                          : 'bg-pod text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {isFr ? wa.labelFr : wa.labelEn}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div className="lg:col-span-5 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-rounded font-bold uppercase tracking-wider text-ink-muted">
                {isFr ? 'Coût réel mesuré' : 'Calculated wind impact'}
              </span>
              <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum">
                ρ {windCostResult.rho.toFixed(3)} kg/m³
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-pod p-4 bg-volt/20 dark:bg-volt/15 ring-1 ring-inset ring-volt-lime/40">
                <div className="text-[11px] font-rounded font-bold text-ink-secondary uppercase">
                  {isFr ? 'Taxe vent' : 'Wind power delta'}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-rounded text-ink tnum mt-1">
                  {windCostResult.phys.powerDeltaWatts >= 0 ? '+' : ''}
                  {Math.round(windCostResult.phys.powerDeltaWatts)} W
                </div>
                <div className="text-[11px] text-ink-muted font-rounded mt-0.5 tnum">
                  vs {Math.round(windCostResult.phys.baselineLegWatts)} W {isFr ? 'sans vent' : 'calm'}
                </div>
              </div>

              <div className="rounded-pod p-4 bg-pod">
                <div className="text-[11px] font-rounded font-bold text-ink-secondary uppercase">
                  {isFr ? 'Temps perdu / gagné' : 'Time delay'}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-rounded text-ink tnum mt-1">
                  {windCostResult.phys.windDelayMinutes > 0 ? '+' : ''}
                  {Math.round(windCostResult.phys.windDelayMinutes)} min
                </div>
                <div className="text-[11px] text-ink-muted font-rounded mt-0.5 tnum">
                  {windCostResult.phys.movingTimeFormatted} {isFr ? 'total' : 'total moving'}
                </div>
              </div>
            </div>

            <div className="rounded-pod bg-pod p-3.5 space-y-2 text-xs font-rounded">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {isFr ? 'Puissance totale requise' : 'Total leg power needed'}
                </span>
                <strong className="text-ink tnum">
                  {Math.round(windCostResult.phys.legWatts)} W ({windCostResult.phys.powerZone})
                </strong>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>{isFr ? 'Décomposition (Aéro + Roulement + Gravité)' : 'Split (Aero + Rolling + Gravity)'}</span>
                <span className="tnum font-semibold text-ink">
                  {Math.round(windCostResult.phys.aerodynamicDragWatts)} +{' '}
                  {Math.round(windCostResult.phys.rollingResistanceWatts)} +{' '}
                  {Math.round(windCostResult.phys.gravityWatts)} W
                </span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {isFr ? 'Glucides / heure' : 'Carb burn'}
                </span>
                <strong className="tnum text-ink">
                  {Math.round(windCostResult.phys.carbOxidationGramPerHour)} g/h
                </strong>
              </div>
            </div>

            <p className="text-xs text-ink-muted font-rounded leading-relaxed">
              {isFr
                ? `À ${speedKmH} km/h face à un vent apparent de ${Math.round(windCostResult.airSpeedTotalKmH)} km/h, la traînée aérodynamique absorbe ${Math.round(windCostResult.phys.aerodynamicDragWatts)} W (puissance cubique de la vitesse air).`
                : `At ${speedKmH} km/h ground speed into ${Math.round(windCostResult.airSpeedTotalKmH)} km/h relative airspeed, aerodynamic drag consumes ${Math.round(windCostResult.phys.aerodynamicDragWatts)} W because drag scales with the cube of airspeed.`}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: LEAVE-BY CALCULATOR ═══════════════ */}
      {activeTab === 'leave-by' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold font-rounded text-ink">
                {isFr
                  ? 'À quelle heure partir pour arriver à l’heure ?'
                  : 'When should you clip in to arrive on time?'}
              </h2>
              <p className="text-xs text-ink-muted font-rounded mt-0.5">
                {isFr
                  ? 'Rétro-planning automatique intégrant vent, pause café et marge de préparation.'
                  : 'Works backward from your target finish including wind slowdown, coffee dwell, and rollout prep.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-pod bg-pod p-3">
                <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1">
                  {isFr ? 'Arrivée cible (HH:MM)' : 'Target arrival time'}
                </label>
                <input
                  type="time"
                  value={targetArrivalTime}
                  onChange={(e) => setTargetArrivalTime(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-sub-pod bg-card text-sm font-bold text-ink tnum"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Distance' : 'Distance'}</span>
                  <strong className="text-ink tnum">{lbDistKm} km</strong>
                </div>
                <input
                  type="range"
                  min={5}
                  max={180}
                  step={5}
                  value={lbDistKm}
                  onChange={(e) => setLbDistKm(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Allure calme' : 'Calm speed'}</span>
                  <strong className="text-ink tnum">{lbSpeedKmH} km/h</strong>
                </div>
                <input
                  type="range"
                  min={14}
                  max={36}
                  step={1}
                  value={lbSpeedKmH}
                  onChange={(e) => setLbSpeedKmH(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Vent de face moy.' : 'Avg headwind'}</span>
                  <strong className="text-ink tnum">{lbHeadwindKmH} km/h</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={2}
                  value={lbHeadwindKmH}
                  onChange={(e) => setLbHeadwindKmH(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Pause café / ravitaillement' : 'Coffee / stop time'}</span>
                  <strong className="text-ink tnum">{lbCoffeeMin} min</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={lbCoffeeMin}
                  onChange={(e) => setLbCoffeeMin(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Marge sécurité / portail' : 'Finish margin'}</span>
                  <strong className="text-ink tnum">{lbPrepMin} min</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={5}
                  value={lbPrepMin}
                  onChange={(e) => setLbPrepMin(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="rounded-pod p-4 bg-volt/25 dark:bg-volt/15 ring-1 ring-inset ring-volt-lime/40 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                  {isFr ? 'Départ impératif (Leave-By)' : 'Recommended Leave-By'}
                </div>
                <div className="text-3xl font-extrabold font-rounded text-ink tnum mt-0.5">
                  {leaveByTimeline.res.hardDepartureTime}
                </div>
              </div>
              <div className="text-right tnum font-rounded text-xs">
                <div className="font-bold text-ink">
                  {leaveByTimeline.res.pureMovingMinutes} min {isFr ? 'de selle' : 'saddle'} + {lbCoffeeMin} min
                </div>
                <div className="text-ink-muted">
                  {isFr ? 'Allure réelle' : 'Effective pace'}: {leaveByTimeline.adjustedSpeed.toFixed(1)} km/h
                </div>
              </div>
            </div>

            <div className="rounded-pod bg-pod divide-y divide-ink/[0.06] dark:divide-white/[0.06]">
              {leaveByTimeline.res.steps.slice(0, 6).map((step) => (
                <div key={step.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-rounded">
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{step.title}</div>
                    <div className="text-[11px] text-ink-muted truncate">{step.description || step.location}</div>
                  </div>
                  <span className="font-extrabold text-ink tnum shrink-0">{step.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: TYRE PRESSURE CALCULATOR ═══════════════ */}
      {activeTab === 'pressure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold font-rounded text-ink">
                {isFr
                  ? 'Pression continue à 15 % d’écrasement (Berto / Silca + ETRTO)'
                  : '15% Tyre-Drop Pressure Model (Wheel-Load + Surface + Hookless)'}
              </h2>
              <p className="text-xs text-ink-muted font-rounded mt-0.5">
                {isFr
                  ? 'Calcule la pression avant et arrière exacte selon la répartition de masse par vélo, la carcasse et la surface.'
                  : 'Continuous width scaling with category wheel-load split, casing stiffness, surface mix & 5.0 bar hookless limit.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Masse totale (cycliste + vélo)' : 'Total system mass'}</span>
                  <strong className="text-ink tnum">{tpSystemKg} kg</strong>
                </div>
                <input
                  type="range"
                  min={50}
                  max={145}
                  step={1}
                  value={tpSystemKg}
                  onChange={(e) => setTpSystemKg(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>

              <div className="rounded-pod bg-pod p-3 space-y-1">
                <div className="flex justify-between text-xs font-rounded">
                  <span className="text-ink-secondary font-semibold">{isFr ? 'Largeur mesurée' : 'Measured width'}</span>
                  <strong className="text-ink tnum">{tpWidthMm} mm</strong>
                </div>
                <input
                  type="range"
                  min={23}
                  max={60}
                  step={1}
                  value={tpWidthMm}
                  onChange={(e) => setTpWidthMm(Number(e.target.value))}
                  className="w-full peloton-slider accent-volt cursor-pointer"
                />
              </div>
            </div>

            {/* Category + Casing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                  {isFr ? 'Catégorie vélo' : 'Bike category'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['road', 'gravel', 'touring', 'mtb', 'urban'] as BikeCategory[]).map((cat) => (
                    <Button
                      key={cat}
                      variant="ghost"
                      type="button"
                      onClick={() => setTpCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-rounded font-semibold capitalize cursor-pointer ${
                        tpCategory === cat
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ring-2 ring-inset ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : 'bg-pod text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
                  {isFr ? 'Carcasse' : 'Tyre casing'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['supple', 'standard', 'reinforced'] as CasingType[]).map((cas) => (
                    <Button
                      key={cas}
                      variant="ghost"
                      type="button"
                      onClick={() => setTpCasing(cas)}
                      className={`px-3 py-1.5 rounded-full text-xs font-rounded font-semibold capitalize cursor-pointer ${
                        tpCasing === cas
                          ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} ring-2 ring-inset ${CHIP_TOKENS.teal.selectedRing}`
                          : 'bg-pod text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {cas}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Surface + Toggles */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(
                [
                  { id: 'paved', label: isFr ? '100% Bitume' : '100% Tarmac' },
                  { id: 'mixed', label: isFr ? 'Mixte Route/Gravel' : 'Mixed Road / Gravel' },
                  { id: 'gravel', label: isFr ? 'Gravel / Sentier' : 'Rough Gravel / Trail' },
                ] as const
              ).map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  type="button"
                  onClick={() => setTpSurfaceMix(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-rounded font-semibold cursor-pointer ${
                    tpSurfaceMix === s.id
                      ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ring-2 ring-inset ${CHIP_TOKENS.amber.selectedRing}`
                      : 'bg-pod text-ink-secondary hover:text-ink'
                  }`}
                >
                  {s.label}
                </Button>
              ))}

              <Button
                variant="ghost"
                type="button"
                onClick={() => setTpTubeless((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                  tpTubeless
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ring-2 ring-inset ${CHIP_TOKENS.emerald.selectedRing}`
                    : 'bg-pod text-ink-secondary'
                }`}
              >
                {tpTubeless ? 'Tubeless' : isFr ? 'Chambre à air' : 'Inner Tube'}
              </Button>

              <Button
                variant="ghost"
                type="button"
                onClick={() => setTpHookless((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                  tpHookless
                    ? `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ring-2 ring-inset ${CHIP_TOKENS.rose.selectedRing}`
                    : 'bg-pod text-ink-secondary'
                }`}
              >
                Hookless
              </Button>

              <Button
                variant="ghost"
                type="button"
                onClick={() => setTpWet((v) => !v)}
                className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-full text-xs font-rounded font-bold cursor-pointer ${
                  tpWet
                    ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ring-2 ring-inset ${CHIP_TOKENS.sky.selectedRing}`
                    : 'bg-pod text-ink-secondary'
                }`}
              >
                {tpUnit === 'psi'
                  ? isFr
                    ? 'Chaussée mouillée (−3 PSI)'
                    : 'Wet roads (−3 PSI)'
                  : isFr
                  ? 'Chaussée mouillée (−0,2 bar)'
                  : 'Wet roads (−0.2 bar)'}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-card bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-rounded font-bold text-ink-muted block">
                {isFr ? 'Pression recommandée' : 'Recommended pressure'}
              </span>
              <div className="inline-flex items-center p-1 rounded-full bg-pod" role="group" aria-label={isFr ? 'Unité pression pneus' : 'Tyre pressure unit'}>
                {(['bar', 'psi'] as const).map((unitOpt) => {
                  const activeUnit = tpUnit === unitOpt;
                  return (
                    <Button
                      key={unitOpt}
                      variant="ghost"
                      type="button"
                      onClick={() => setTpUnit(unitOpt)}
                      className={`min-h-[36px] sm:min-h-[28px] px-3 py-1 rounded-full text-xs font-rounded font-bold transition-colors cursor-pointer ${
                        activeUnit
                          ? 'bg-card text-ink shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {unitOpt === 'psi' ? 'PSI' : 'bar'}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-pod p-4 bg-pod">
                <div className="text-[11px] font-rounded font-bold text-ink-secondary">
                  {isFr ? 'Pneu avant' : 'Front tyre'} ({tpResult.frontLoadPct}%)
                </div>
                <div className="text-3xl font-extrabold font-rounded text-ink tnum mt-1">
                  {tpUnit === 'psi' ? (
                    <>
                      {barToPsi(displayedFrontBar)} <span className="text-sm font-bold text-ink-muted">PSI</span>
                    </>
                  ) : (
                    <>
                      {displayedFrontBar.toFixed(1)} <span className="text-sm font-bold text-ink-muted">bar</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-ink-muted font-rounded tnum mt-0.5">
                  {tpUnit === 'psi' ? `${displayedFrontBar.toFixed(1)} bar` : `${barToPsi(displayedFrontBar)} PSI`}
                </div>
              </div>

              <div className="rounded-pod p-4 bg-volt/20 dark:bg-volt/15 ring-1 ring-inset ring-volt-lime/40">
                <div className="text-[11px] font-rounded font-bold text-ink-secondary">
                  {isFr ? 'Pneu arrière' : 'Rear tyre'} ({tpResult.rearLoadPct}%)
                </div>
                <div className="text-3xl font-extrabold font-rounded text-ink tnum mt-1">
                  {tpUnit === 'psi' ? (
                    <>
                      {barToPsi(displayedRearBar)} <span className="text-sm font-bold text-ink-muted">PSI</span>
                    </>
                  ) : (
                    <>
                      {displayedRearBar.toFixed(1)} <span className="text-sm font-bold text-ink-muted">bar</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-ink-muted font-rounded tnum mt-0.5">
                  {tpUnit === 'psi' ? `${displayedRearBar.toFixed(1)} bar` : `${barToPsi(displayedRearBar)} PSI`}
                </div>
              </div>
            </div>

            {tpResult.hooklessCapped && (
              <div className="rounded-pod p-3 bg-rose-500/[0.1] text-rose-800 dark:text-rose-200 text-xs font-rounded flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>
                  {isFr
                    ? 'Plafond ETRTO Hookless appliqué à 5,0 bar (72,5 PSI) maximum pour éviter le déjantage.'
                    : 'ETRTO 5.0 bar (72.5 PSI) hookless rim ceiling applied to prevent blow-off.'}
                </span>
              </div>
            )}

            <p className="text-xs text-ink-muted font-rounded leading-relaxed">
              {isFr
                ? `Répartition de charge ${tpResult.frontLoadPct}% AV / ${tpResult.rearLoadPct}% AR pour catégorie « ${tpResult.bikeCategory} » (${tpTubeless ? 'Tubeless' : '+0,3 bar chambre'}).`
                : `Load split ${tpResult.frontLoadPct}% front / ${tpResult.rearLoadPct}% rear for ${tpResult.bikeCategory} stance (${tpTubeless ? 'Tubeless' : '+0.3 bar tube margin'}).`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
