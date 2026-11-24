import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from '@/components/icons';
import { Button } from "@/components/arc/button/button";
import {
  TripProfile,
  RouteWaypoint,
  ElevationProfilePoint,
  WeatherCondition,
  generateTripChecklist,
} from '../types/trip';
import { useTranslation } from '../context/LanguageContext';
import { OnboardingHeader } from './onboarding/OnboardingHeader';
import { Screen1Welcome } from './onboarding/Screen1Welcome';
import { Screen2Purpose } from './onboarding/Screen2Purpose';
import { Screen3Route } from './onboarding/Screen3Route';
import {
  Screen4TimingPace,
  computeOnboardingChronometry,
  derivePrecipRiskFromWeatherCode,
  normalizeOnboardingChipId,
} from './onboarding/Screen4TimingPace';
import { Screen5RiderBike } from './onboarding/Screen5RiderBike';
import { Screen6RideReady } from './onboarding/Screen6RideReady';
import { Screen7SaveSync } from './onboarding/Screen7SaveSync';
import {
  PURPOSES,
  PACE_TIERS,
  BIKE_OPTIONS,
  DEFAULT_NANTES_ROUTE_COORDS,
  ONBOARDING_SPEED_BOUNDS,
} from './onboarding/constants';
import { RidePurposeId } from './onboarding/types';
import { saveUserProfile } from '../utils/userProfileStorage';
import { loadRiderBikeSpecs, saveRiderBikeSpecs } from '../utils/specsStorage';
import { subtractMinutesFromTime } from '../utils/nutrition';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (calibratedTrip: TripProfile) => void;
}

function formatRideDate(dateStr: string, isFr: boolean, includeYear: boolean = false): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);

      const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daysFr = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

      const dayName = isFr ? daysFr[d.getDay()] : daysEn[d.getDay()];
      const monthName = isFr ? monthsFr[d.getMonth()] : monthsEn[d.getMonth()];

      if (includeYear) {
        return `${dayName}, ${day} ${monthName} ${year}`;
      }
      return `${dayName}, ${day} ${monthName}`;
    }
  } catch {
    // Fallback
  }
  return dateStr;
}

function getLocalTomorrowIso(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  // Modal Step State:
  // 0 = Welcome, 1 = Purpose, 2 = Route, 3 = Timing/Pace, 4 = Rider/Bike, 5 = Ready, 6 = Save/Sync
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Purpose State (neutral global default: leisure)
  const [purpose, setPurpose] = useState<RidePurposeId>('leisure');

  // Route State
  const [routeMode, setRouteMode] = useState<'from-to' | 'distance' | 'gpx'>('from-to');
  const [origin, setOrigin] = useState<string>('Old Town Square');
  const [destination, setDestination] = useState<string>('Riverside Cafe');
  const [distanceKm, setDistanceKm] = useState<number>(25.0);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [elevationGainM, setElevationGainM] = useState<number | undefined>();
  const [elevationLossM, setElevationLossM] = useState<number | undefined>();
  const [elevationProfile, setElevationProfile] = useState<ElevationProfilePoint[] | undefined>();
  const [gpxFileName, setGpxFileName] = useState<string | undefined>();
  const [isRouteReady, setIsRouteReady] = useState<boolean>(true);

  // Timing & Pace State
  const [targetMode, setTargetMode] = useState<'arrive' | 'depart'>('depart');
  const [rideDate, setRideDate] = useState<string>(() => getLocalTomorrowIso());
  const [targetTime, setTargetTime] = useState<string>('08:30');
  const [paceTier, setPaceTier] = useState<'easy' | 'steady' | 'brisk'>('steady');
  const [customSpeedKmH, setCustomSpeedKmH] = useState<number | null>(null);
  const [targetEffortWatts, setTargetEffortWatts] = useState<number | null>(null);
  const [parkingBufferMin, setParkingBufferMin] = useState<number>(10);

  // Archetype Chips
  const [selectedChips, setSelectedChips] = useState<string[]>(['bakery-raid']);

  // Weather & Physics parameters
  const [isWeatherFetched, setIsWeatherFetched] = useState<boolean>(false);
  const [weatherSummary, setWeatherSummary] = useState<string | undefined>();
  const [headwindKmH, setHeadwindKmH] = useState<number>(9);
  const [gradientPercent, setGradientPercent] = useState<number>(0.3);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>({
    temperatureC: 14,
    baseWindSpeedKmH: 9,
    windDirectionDegrees: 245,
    windDirection: 'headwind',
    isHeadwindActive: true,
    precipitationRiskPercent: 10,
    estuaryGustKmH: 15,
    visibilityKm: 16,
  });

  // Rider & Bike State
  const [riderWeightKg, setRiderWeightKg] = useState<number>(75);
  const [luggageWeightKg, setLuggageWeightKg] = useState<number>(0);
  const [selectedBikeId, setSelectedBikeId] = useState<string>('city');
  const [bikeWeightKg, setBikeWeightKg] = useState<number>(12.5);
  const [tireWidthMm, setTireWidthMm] = useState<number>(40);
  const [isTubeless, setIsTubeless] = useState<boolean>(false);
  const [cda, setCda] = useState<number>(0.42);
  const [crr, setCrr] = useState<number>(0.0065);
  const [drivetrainEfficiency, setDrivetrainEfficiency] = useState<number>(0.95);
  const [usePowerWatts, setUsePowerWatts] = useState<boolean>(false);
  const [ftpWatts, setFtpWatts] = useState<number>(210);

  // Focus trap / escape key listener & scroll refs
  const outerDialogRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLElement>(null);

  // Whenever the window step changes or the modal opens, always snap to the top of the contents
  useEffect(() => {
    if (scrollContentRef.current) {
      scrollContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (outerDialogRef.current) {
      outerDialogRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle purpose selection
  const handleSelectPurpose = (newPurpose: RidePurposeId) => {
    setPurpose(newPurpose);
    const def = PURPOSES.find((p) => p.id === newPurpose);
    if (def) {
      setPaceTier(def.defaultPaceTier);
      setParkingBufferMin(def.defaultBufferMin);
      setOrigin(def.defaultOrigin);
      setDestination(def.defaultDestination);
      setDistanceKm(def.defaultDistanceKm);
      setCoordinates([]);
      setWaypoints([]);
      setElevationGainM(undefined);
      setElevationLossM(undefined);
      setElevationProfile(undefined);
      setIsRouteReady(false);
    }

    if (newPurpose === 'commute') {
      setTargetMode('arrive');
      setTargetTime('09:00');
      setSelectedChips([]);
      setCustomSpeedKmH(null);
      setTargetEffortWatts(null);
      setUsePowerWatts(false);
    } else if (newPurpose === 'sport') {
      setTargetMode('depart');
      setTargetTime('08:00');
      setSelectedChips(['warmup-rollout']);
      setCustomSpeedKmH(28);
      setUsePowerWatts(true);
    } else if (newPurpose === 'bikepacking') {
      setTargetMode('depart');
      setTargetTime('08:00');
      setSelectedChips(['water-resupply']);
      setCustomSpeedKmH(null);
      setTargetEffortWatts(null);
      setUsePowerWatts(false);
    } else {
      setTargetMode('depart');
      setTargetTime('08:30');
      setSelectedChips(['bakery-raid']);
      setCustomSpeedKmH(null);
      setTargetEffortWatts(null);
      setUsePowerWatts(false);
    }
  };

  // Toggle archetype chips
  const handleToggleChip = (chipId: string) => {
    const canonicalId = normalizeOnboardingChipId(chipId);
    setSelectedChips((prev) =>
      prev.includes(canonicalId)
        ? prev.filter((id) => id !== canonicalId)
        : [...prev, canonicalId]
    );
  };

  // Speed calculation (respects custom target speed up to 45 km/h)
  const selectedPaceDef = PACE_TIERS.find((p) => p.id === paceTier) || PACE_TIERS[1];
  const speedKmH =
    customSpeedKmH !== null && Number.isFinite(customSpeedKmH)
      ? Math.min(
          ONBOARDING_SPEED_BOUNDS.maxKmH,
          Math.max(ONBOARDING_SPEED_BOUNDS.minKmH, Math.round(customSpeedKmH))
        )
      : selectedPaceDef.speedKmH;

  // Chronometry calculation aligned with BentoDashboard reverse timeline
  const chronometry = computeOnboardingChronometry({
    purposeId: purpose,
    targetMode,
    targetTime,
    distanceKm,
    speedKmH,
    parkingBufferMin,
    selectedChips,
    rideDate,
    coordinates,
  });
  const {
    ridingMinutes,
    officePrepMin,
    leaveTimeFormatted,
    arriveTimeFormatted,
    readyTimeFormatted,
  } = chronometry;

  // Compile final calibrated TripProfile
  const compileCalibratedTrip = (customOverrides?: Partial<TripProfile>): TripProfile => {
    const chosenBike = BIKE_OPTIONS.find((b) => b.id === selectedBikeId) || BIKE_OPTIONS[0];
    const purposeDef = PURPOSES.find((p) => p.id === purpose) || PURPOSES[0];

    const originShort = origin.split(',')[0].trim() || (isFr ? 'Départ' : 'Start');
    const destShort = destination.split(',')[0].trim() || (isFr ? 'Arrivée' : 'Finish');
    const tripName = `${originShort} → ${destShort}`;
    const tripTag = purposeDef.tag;

    const resolvedFtp = usePowerWatts
      ? Math.max(80, Math.min(600, Math.round(Number(ftpWatts) || 210)))
      : 210;
    const isDataDrivenSport = purpose === 'sport';
    const resolvedTelemetryMode: 'quantitative' | 'fuel-first' =
      usePowerWatts || isDataDrivenSport ? 'quantitative' : 'fuel-first';
    const resolvedCockpitMode: 'pro' | 'essential' =
      usePowerWatts || isDataDrivenSport ? 'pro' : 'essential';
    const resolvedPacingInputMode: 'power' | 'feel' =
      usePowerWatts || (isDataDrivenSport && targetEffortWatts !== null) ? 'power' : 'feel';
    const paceLabel =
      customSpeedKmH !== null
        ? isFr
          ? 'Perso'
          : 'Custom'
        : isFr
        ? selectedPaceDef.nameFr
        : selectedPaceDef.name;

    // Persist profile preferences
    try {
      const existingSpecs = loadRiderBikeSpecs();
      saveRiderBikeSpecs({
        ...existingSpecs,
        riderWeightKg: Number(riderWeightKg) || 75,
        cockpitViewMode: resolvedCockpitMode,
        telemetryMode: resolvedTelemetryMode,
        pacingInputMode: resolvedPacingInputMode,
        ftpWatts: usePowerWatts ? resolvedFtp : existingSpecs.ftpWatts,
      });

      saveUserProfile({
        name: isFr ? 'Cycliste' : 'Rider',
        weightKg: Number(riderWeightKg) || 75,
        bikeType: selectedBikeId,
        bikeName: chosenBike.name,
        bikeWeightKg: bikeWeightKg,
        isTubeless: Boolean(isTubeless),
      });
    } catch (e) {
      console.warn('Storage sync skipped during onboarding compile', e);
    }

    const { office: overrideOffice, customChips: overrideChips, ...restOverrides } =
      customOverrides || {};
    const effectiveCustomChips = Array.from(
      new Set((overrideChips ?? selectedChips).map(normalizeOnboardingChipId))
    );
    const tripChronometry = overrideChips
      ? computeOnboardingChronometry({
          purposeId: purpose,
          targetMode,
          targetTime,
          distanceKm,
          speedKmH,
          parkingBufferMin,
          selectedChips: effectiveCustomChips,
          rideDate,
          coordinates,
        })
      : chronometry;

    const hasShowerLocker = effectiveCustomChips.includes('shower-locker');
    const lockerRefuelMinutes =
      overrideOffice?.lockerRefuelMinutes ?? tripChronometry.parkingBufferMin;
    const showerChangeMinutes =
      overrideOffice?.showerChangeMinutes ?? (hasShowerLocker ? 15 : 0);
    const breakRoomBreakfastMinutes =
      overrideOffice?.breakRoomBreakfastMinutes ?? 0;
    const officeShiftStart =
      overrideOffice?.shiftStartTime ?? tripChronometry.readyTimeFormatted;
    const officePrepMinutes =
      Math.max(0, lockerRefuelMinutes) +
      Math.max(0, showerChangeMinutes) +
      Math.max(0, breakRoomBreakfastMinutes);
    const resolvedGateArrival =
      overrideOffice?.targetGateArrivalTime ??
      (purpose === 'commute' && targetMode === 'arrive'
        ? officePrepMinutes > 0
          ? subtractMinutesFromTime(officeShiftStart, officePrepMinutes)
          : officeShiftStart
        : tripChronometry.arriveTimeFormatted);

    const trip: TripProfile = {
      id: `trip-calibrated-${Date.now()}`,
      name: tripName,
      tag: tripTag,
      description: isFr
        ? `Sortie ${purposeDef.nameFr} de ${distanceKm.toFixed(1)} km avec ${chosenBike.nameFr}. Allure : ${speedKmH} km/h (${paceLabel}).`
        : `${distanceKm.toFixed(1)} km ${purposeDef.name.toLowerCase()} ride with ${chosenBike.name}. Pace: ${speedKmH} km/h (${paceLabel}).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departureTime: tripChronometry.leaveTimeFormatted,
      departureDate: rideDate,
      physics: {
        riderWeightKg: Number(riderWeightKg) || 75,
        bikeWeightKg: bikeWeightKg,
        gearWeightKg: Number(luggageWeightKg) || 0,
        cda: cda,
        crr: crr,
        rho: 1.225,
        drivetrainEfficiency: drivetrainEfficiency,
        grossMechanicalEfficiency: 0.22,
        gradientPercent: gradientPercent,
      },
      route: {
        origin,
        destination,
        distanceKm,
        elevationGainM,
        elevationLossM,
        elevationProfile,
        targetSpeedKmH: speedKmH,
        pacingMode: targetEffortWatts ? 'effort' : 'speed',
        targetEffortWatts: targetEffortWatts ?? undefined,
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
        coordinates: coordinates.length > 0 ? coordinates : undefined,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        routeMode:
          coordinates.length >= 2
            ? routeMode === 'gpx'
              ? 'gpx'
              : 'corridor'
            : 'manual-radius',
        radiusMeters:
          coordinates.length < 2
            ? Math.max(1000, Math.round((distanceKm / 2) * 1000))
            : undefined,
      },
      office: {
        gateName: destShort,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: purpose === 'commute',
        notes: '',
        ...(overrideOffice || {}),
        shiftStartTime: officeShiftStart,
        targetGateArrivalTime: resolvedGateArrival,
        lockerRefuelMinutes,
        showerChangeMinutes,
        breakRoomBreakfastMinutes,
      },
      weather: weatherCondition,
      checklist: generateTripChecklist(tripTag, distanceKm, weatherCondition, {
        lang: isFr ? 'fr' : 'en',
        includeExtraRavito: effectiveCustomChips.includes('real-food'),
        customChips: effectiveCustomChips,
        isTubeless,
        carbTargetGPerHr: 60,
        nutritionPreference: effectiveCustomChips.includes('real-food') ? 'real-food' : 'mixed',
      }),
      customChips: effectiveCustomChips,
      arriveAtMode: targetMode === 'arrive',
      ...restOverrides,
    };

    (trip as any).__onboardingSpecs = {
      purpose,
      isTubeless,
      tireWidthMm,
      bikeCategory: chosenBike.bikeCategory,
      riderLevel: isDataDrivenSport ? 'regular' : 'occasional',
      ftpWatts: resolvedFtp,
      cockpitViewMode: resolvedCockpitMode,
      telemetryMode: resolvedTelemetryMode,
      pacingInputMode: resolvedPacingInputMode,
      carbTargetGPerHr: 60,
      nutritionPreference: effectiveCustomChips.includes('real-food') ? 'real-food' : 'mixed',
    };

    return trip;
  };

  // Launch a ready-to-explore local sample ride in calm Guided view
  const handleTryExampleInstant = () => {
    const exampleTag = isFr ? 'Vélotaf' : 'Commute';
    const exampleTrip: TripProfile = {
      id: `trip-example-${Date.now()}`,
      name: 'Trentemoult → Nantes gare',
      tag: exampleTag,
      description: isFr
        ? 'Trajet vélotaf exemplaire de 6.0 km à Nantes avec données pré-chargées et météo en direct.'
        : 'Exemplary 6.0 km commute in Nantes with pre-fetched route telemetry and live weather.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departureTime: '08:35',
      departureDate: getLocalTomorrowIso(),
      physics: {
        riderWeightKg: 75,
        bikeWeightKg: 12.5,
        gearWeightKg: 2.5,
        cda: 0.42,
        crr: 0.0065,
        rho: 1.225,
        drivetrainEfficiency: 0.95,
        grossMechanicalEfficiency: 0.22,
        gradientPercent: 0.3,
      },
      route: {
        origin: 'Trentemoult, Rezé',
        destination: 'Nantes gare, Nantes',
        distanceKm: 6.0,
        targetSpeedKmH: 18,
        pacingMode: 'speed',
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
        coordinates: DEFAULT_NANTES_ROUTE_COORDS,
        routeMode: 'corridor',
      },
      office: {
        shiftStartTime: '09:00',
        targetGateArrivalTime: '08:55',
        gateName: 'Gare de Nantes Nord',
        lockerRefuelMinutes: 5,
        showerChangeMinutes: 0,
        breakRoomBreakfastMinutes: 15,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: true,
        notes: 'Pre-fetched commute example',
      },
      weather: {
        isHeadwindActive: true,
        baseWindSpeedKmH: 12,
        windDirection: 'headwind',
        windDirectionDegrees: 245,
        temperatureC: 14,
        precipitationRiskPercent: 10,
        estuaryGustKmH: 18,
        visibilityKm: 16,
      },
      checklist: generateTripChecklist(exampleTag, 6.0, undefined, {
        lang: isFr ? 'fr' : 'en',
        includeExtraRavito: false,
        customChips: ['coffee-stop'],
        isTubeless: false,
        carbTargetGPerHr: 60,
        nutritionPreference: 'mixed',
      }),
      customChips: ['coffee-stop'],
      arriveAtMode: true,
    };

    (exampleTrip as any).__onboardingSpecs = {
      isTubeless: false,
      riderLevel: 'regular',
      ftpWatts: 210,
      cockpitViewMode: 'essential',
      telemetryMode: 'fuel-first',
      pacingInputMode: 'feel',
      carbTargetGPerHr: 60,
      nutritionPreference: 'mixed',
    };

    onLaunch(exampleTrip);
  };

  const handleLaunchDirect = () => {
    const calibratedTrip = compileCalibratedTrip();
    onLaunch(calibratedTrip);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={outerDialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={isFr ? 'Assistant d’accueil Cadence' : 'Cadence Onboarding Wizard'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-6 overflow-hidden animate-apple-fade-in select-none"
    >
      <div className="relative w-full h-full sm:h-auto max-w-5xl max-h-none sm:max-h-[90vh] sm:max-h-[90dvh] bg-card text-ink rounded-none sm:rounded-card shadow-2xl border-0 sm:border sm:border-black/10 sm:dark:border-white/10 flex flex-col overflow-hidden animate-apple-modal">
        {/* Top Header & Progress Stepper */}
        <OnboardingHeader
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
          onClose={onClose}
        />

        {/* Dynamic Wizard Body - Always Snaps to Top of Content */}
        <main
          ref={scrollContentRef}
          tabIndex={-1}
          className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain scroll-smooth focus:outline-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div key={currentStep} className="flex-1 flex flex-col pb-6 sm:pb-8 animate-apple-step-in">
            {currentStep === 0 && <Screen1Welcome />}

            {currentStep === 1 && (
              <Screen2Purpose
                selectedPurpose={purpose}
                onSelectPurpose={handleSelectPurpose}
              />
            )}

            {currentStep === 2 && (
              <Screen3Route
                routeMode={routeMode}
                onChangeRouteMode={setRouteMode}
                origin={origin}
                destination={destination}
                distanceKm={distanceKm}
                coordinates={coordinates}
                waypoints={waypoints}
                isRouteReady={isRouteReady}
                gpxFileName={gpxFileName}
                onUpdateOrigin={setOrigin}
                onUpdateDestination={setDestination}
                onUpdateDistance={setDistanceKm}
                onUpdateCoordinates={setCoordinates}
                onUpdateWaypoints={setWaypoints}
                onUpdateElevation={(dem) => {
                  setElevationGainM(dem.elevationGainM);
                  setElevationLossM(dem.elevationLossM);
                  setElevationProfile(dem.elevationProfile);
                }}
                onGpxLoaded={(parsed) => {
                  setOrigin(parsed.name);
                  setDistanceKm(parsed.distanceKm);
                  setCoordinates(parsed.coordinates);
                  setWaypoints([]);
                  setGpxFileName(`${parsed.name}.gpx`);
                  setIsRouteReady(true);
                }}
              />
            )}

            {currentStep === 3 && (
              <Screen4TimingPace
                purposeId={purpose}
                targetMode={targetMode}
                onChangeTargetMode={setTargetMode}
                rideDate={rideDate}
                onChangeRideDate={setRideDate}
                targetTime={targetTime}
                onChangeTargetTime={setTargetTime}
                paceTier={paceTier}
                onChangePaceTier={setPaceTier}
                customSpeedKmH={customSpeedKmH}
                onChangeCustomSpeedKmH={setCustomSpeedKmH}
                targetEffortWatts={targetEffortWatts}
                onChangeTargetEffortWatts={setTargetEffortWatts}
                parkingBufferMin={parkingBufferMin}
                onChangeParkingBuffer={setParkingBufferMin}
                selectedChips={selectedChips}
                onToggleChip={handleToggleChip}
                distanceKm={distanceKm}
                coordinates={coordinates}
                headwindKmH={headwindKmH}
                onChangeHeadwind={setHeadwindKmH}
                gradientPercent={gradientPercent}
                onChangeGradient={setGradientPercent}
                onWeatherFetched={(weatherData) => {
                  setIsWeatherFetched(true);
                  setWeatherSummary(`${weatherData.tempC}°C · ${weatherData.windKmH} km/h ${weatherData.windDirection}`);
                  setWeatherCondition((prev) => {
                    const nextWeatherCode =
                      typeof weatherData.weatherCode === 'number'
                        ? weatherData.weatherCode
                        : prev.weatherCode;
                    const nextPrecipRisk =
                      typeof weatherData.precipitationRiskPercent === 'number'
                        ? weatherData.precipitationRiskPercent
                        : typeof weatherData.weatherCode === 'number'
                        ? derivePrecipRiskFromWeatherCode(weatherData.weatherCode)
                        : prev.precipitationRiskPercent;
                    const nextGusts =
                      typeof weatherData.windGustsKmH === 'number'
                        ? weatherData.windGustsKmH
                        : Math.max(prev.estuaryGustKmH, Math.round(weatherData.windKmH * 1.4));
                    const nextWindDirection: WeatherCondition['windDirection'] =
                      weatherData.headwindKmH > 2
                        ? 'headwind'
                        : weatherData.headwindKmH < -2
                        ? 'tailwind'
                        : 'calm';

                    return {
                      ...prev,
                      temperatureC: weatherData.tempC,
                      baseWindSpeedKmH: weatherData.windKmH,
                      effectiveHeadwindKmH: weatherData.headwindKmH,
                      isHeadwindActive:
                        typeof weatherData.isHeadwindActive === 'boolean'
                          ? weatherData.isHeadwindActive
                          : weatherData.headwindKmH > 2,
                      windDirection: nextWindDirection,
                      ...(typeof weatherData.windDirectionDegrees === 'number'
                        ? { windDirectionDegrees: weatherData.windDirectionDegrees }
                        : {}),
                      precipitationRiskPercent: nextPrecipRisk,
                      estuaryGustKmH: nextGusts,
                      ...(typeof nextWeatherCode === 'number' ? { weatherCode: nextWeatherCode } : {}),
                      ...(typeof weatherData.isDay === 'boolean' ? { isDay: weatherData.isDay } : {}),
                      ...(typeof weatherData.visibilityKm === 'number'
                        ? { visibilityKm: weatherData.visibilityKm }
                        : {}),
                      ...(typeof weatherData.airDensityRho === 'number'
                        ? { airDensityRho: weatherData.airDensityRho }
                        : {}),
                      ...(weatherData.source ? { source: weatherData.source } : {}),
                      ...(typeof weatherData.isBeyondForecastWindow === 'boolean'
                        ? { isBeyondForecastWindow: weatherData.isBeyondForecastWindow }
                        : {}),
                      ...(weatherData.sunrise ? { sunrise: weatherData.sunrise } : {}),
                      ...(weatherData.sunset ? { sunset: weatherData.sunset } : {}),
                    };
                  });
                }}
              />
            )}

            {currentStep === 4 && (
              <Screen5RiderBike
                purposeId={purpose}
                riderWeightKg={riderWeightKg}
                onChangeRiderWeight={setRiderWeightKg}
                luggageWeightKg={luggageWeightKg}
                onChangeLuggageWeight={setLuggageWeightKg}
                selectedBikeId={selectedBikeId}
                onChangeSelectedBike={setSelectedBikeId}
                bikeWeightKg={bikeWeightKg}
                onChangeBikeWeight={setBikeWeightKg}
                tireWidthMm={tireWidthMm}
                onChangeTireWidth={setTireWidthMm}
                isTubeless={isTubeless}
                onChangeIsTubeless={setIsTubeless}
                cda={cda}
                onChangeCda={setCda}
                crr={crr}
                onChangeCrr={setCrr}
                drivetrainEfficiency={drivetrainEfficiency}
                onChangeDrivetrainEfficiency={setDrivetrainEfficiency}
                usePowerWatts={usePowerWatts}
                onChangeUsePowerWatts={setUsePowerWatts}
                ftpWatts={ftpWatts}
                onChangeFtpWatts={setFtpWatts}
                estimatedMinutes={ridingMinutes}
                selectedSpeedKmH={speedKmH}
              />
            )}

            {currentStep === 5 && (
              <Screen6RideReady
                origin={origin}
                destination={destination}
                distanceKm={distanceKm}
                coordinates={coordinates}
                waypoints={waypoints}
                ridingMinutes={ridingMinutes}
                speedKmH={speedKmH}
                rideDateFormatted={formatRideDate(rideDate, isFr, false)}
                leaveTimeFormatted={leaveTimeFormatted}
                arriveTimeFormatted={arriveTimeFormatted}
                readyTimeFormatted={readyTimeFormatted}
                parkingBufferMin={officePrepMin}
                targetMode={targetMode}
                isWeatherFetched={isWeatherFetched}
                weatherSummary={weatherSummary}
                purpose={PURPOSES.find((p) => p.id === purpose)?.name}
                selectedBikeName={BIKE_OPTIONS.find((b) => b.id === selectedBikeId)?.name}
                onEditRoute={() => setCurrentStep(2)}
                onEditTiming={() => setCurrentStep(3)}
                onEditSetup={() => setCurrentStep(4)}
              />
            )}

            {currentStep === 6 && (
              <Screen7SaveSync
                origin={origin}
                destination={destination}
                distanceKm={distanceKm}
                ridingMinutes={ridingMinutes}
                onAuthenticatedAndLaunch={handleLaunchDirect}
              />
            )}
          </div>
        </main>

        {/* Unified Sticky Shell Footer (outside animated step wrapper) */}
        <footer className="shrink-0 bg-card/95 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.28)]">
          {currentStep === 0 && (
            <>
              <span className="text-xs text-ink-muted font-body order-2 sm:order-1 text-center sm:text-left">
                {isFr ? 'Sans profil. Sans inscription. Juste votre sortie.' : 'No profile. No signup. Just a ride.'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end order-1 sm:order-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTryExampleInstant}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Explorer l’exemple' : 'Try an example'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Commencer' : 'Start planning'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(0)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Accueil' : 'Welcome'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Vous pourrez modifier cela plus tard.' : 'You can change this later.'}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep(2)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer vers le parcours' : 'Continue to route'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(1)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body font-medium text-center tnum">
                {isFr ? `Parcours · ${distanceKm.toFixed(1)} km` : `Route · ${distanceKm.toFixed(1)} km`}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep(3)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Utiliser cet itinéraire' : 'Use this route'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(2)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body tnum">
                {targetMode === 'arrive'
                  ? isFr
                    ? `Départ calculé : ${leaveTimeFormatted}`
                    : `Calculated departure: ${leaveTimeFormatted}`
                  : isFr
                  ? `Arrivée calculée : ${arriveTimeFormatted}`
                  : `Calculated arrival: ${arriveTimeFormatted}`}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep(4)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer vers le vélo' : 'Continue to rider & bike'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(3)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Optionnel · modifiable à tout moment' : 'Optional · editable any time'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Passer' : 'Skip'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Voir l’aperçu' : 'View preview'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(4)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Modifier la config' : 'Edit setup'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Votre sortie est prête · aucune inscription requise' : 'Your ride is ready · no signup required'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLaunchDirect}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Ouvrir le plan' : 'View ride plan'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCurrentStep(6)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Enregistrer & synchroniser' : 'Save & sync'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 6 && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(5)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour à l’aperçu' : 'Back to ride preview'}</span>
              </Button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Aucun compte requis pour utiliser votre plan de route' : 'No account required to use your ride plan'}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={handleLaunchDirect}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer sans compte' : 'Continue without account'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};
