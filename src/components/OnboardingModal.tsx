import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from '@/components/icons';
import { TripProfile, RouteWaypoint } from '../types/trip';
import { generateTripChecklist } from '../types/trip';
import { useTranslation } from '../context/LanguageContext';
import { OnboardingHeader } from './onboarding/OnboardingHeader';
import { Screen1Welcome } from './onboarding/Screen1Welcome';
import { Screen2Purpose } from './onboarding/Screen2Purpose';
import { Screen3Route } from './onboarding/Screen3Route';
import { Screen4TimingPace } from './onboarding/Screen4TimingPace';
import { Screen5RiderBike } from './onboarding/Screen5RiderBike';
import { Screen6RideReady } from './onboarding/Screen6RideReady';
import { Screen7SaveSync } from './onboarding/Screen7SaveSync';
import {
  PURPOSES,
  PACE_TIERS,
  BIKE_OPTIONS,
  DEFAULT_NANTES_ROUTE_COORDS,
} from './onboarding/constants';
import { RidePurposeId } from './onboarding/types';
import { saveUserProfile } from '../utils/userProfileStorage';
import { loadRiderBikeSpecs, saveRiderBikeSpecs } from '../utils/specsStorage';

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

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

  // Purpose State
  const [purpose, setPurpose] = useState<RidePurposeId>('commute');

  // Route State
  const [routeMode, setRouteMode] = useState<'from-to' | 'distance' | 'gpx'>('from-to');
  const [origin, setOrigin] = useState<string>('Trentemoult, Rezé');
  const [destination, setDestination] = useState<string>('Nantes gare, Nantes');
  const [distanceKm, setDistanceKm] = useState<number>(6.0);
  const [coordinates, setCoordinates] = useState<[number, number][]>(DEFAULT_NANTES_ROUTE_COORDS);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [gpxFileName, setGpxFileName] = useState<string | undefined>();
  const [isRouteReady, setIsRouteReady] = useState<boolean>(true);

  // Timing & Pace State
  const [targetMode, setTargetMode] = useState<'arrive' | 'depart'>('arrive');
  const [rideDate, setRideDate] = useState<string>('2026-11-09'); // Default to Mon, 9 Nov 2026
  const [targetTime, setTargetTime] = useState<string>('09:00');
  const [paceTier, setPaceTier] = useState<'easy' | 'steady' | 'brisk'>('steady');
  const [parkingBufferMin, setParkingBufferMin] = useState<number>(5);

  // Archetype Chips
  const [selectedChips, setSelectedChips] = useState<string[]>(['coffee-stop']);

  // Weather & Physics parameters
  const [isWeatherFetched, setIsWeatherFetched] = useState<boolean>(false);
  const [weatherSummary, setWeatherSummary] = useState<string | undefined>();
  const [headwindKmH, setHeadwindKmH] = useState<number>(9);
  const [gradientPercent, setGradientPercent] = useState<number>(0.3);
  const [weatherCondition, setWeatherCondition] = useState({
    temperatureC: 14,
    baseWindSpeedKmH: 9,
    windDirectionDegrees: 245,
    windDirection: 'headwind' as const,
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
      if (newPurpose !== 'commute') {
        setOrigin(def.defaultOrigin);
        setDestination(def.defaultDestination);
        setDistanceKm(def.defaultDistanceKm);
        setCoordinates([]);
        setWaypoints([]);
        setIsRouteReady(false);
      } else {
        setOrigin('Trentemoult, Rezé');
        setDestination('Nantes gare, Nantes');
        setDistanceKm(6.0);
        setCoordinates(DEFAULT_NANTES_ROUTE_COORDS);
        setWaypoints([]);
        setIsRouteReady(true);
      }
    }
  };

  // Toggle archetype chips
  const handleToggleChip = (chipId: string) => {
    setSelectedChips((prev) =>
      prev.includes(chipId) ? prev.filter((id) => id !== chipId) : [...prev, chipId]
    );
  };

  // Speed calculation
  const selectedPaceDef = PACE_TIERS.find((p) => p.id === paceTier) || PACE_TIERS[1];
  const speedKmH = selectedPaceDef.speedKmH;
  const ridingMinutes = Math.max(1, Math.round((distanceKm / speedKmH) * 60));

  // Chronometry calculation
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

  // Compile final calibrated TripProfile
  const compileCalibratedTrip = (customOverrides?: Partial<TripProfile>): TripProfile => {
    const chosenBike = BIKE_OPTIONS.find((b) => b.id === selectedBikeId) || BIKE_OPTIONS[0];
    const purposeDef = PURPOSES.find((p) => p.id === purpose) || PURPOSES[0];

    const originShort = origin.split(',')[0].trim() || 'Trentemoult';
    const destShort = destination.split(',')[0].trim() || 'Nantes gare';
    const tripName = `${originShort} → ${destShort}`;
    const tripTag = purposeDef.tag;

    const resolvedFtp = usePowerWatts
      ? Math.max(80, Math.min(600, Math.round(Number(ftpWatts) || 210)))
      : 210;

    // Persist profile preferences
    try {
      const existingSpecs = loadRiderBikeSpecs();
      saveRiderBikeSpecs({
        ...existingSpecs,
        riderWeightKg: Number(riderWeightKg) || 75,
        cockpitViewMode: usePowerWatts ? 'pro' : 'essential',
        telemetryMode: usePowerWatts ? 'quantitative' : 'fuel-first',
        pacingInputMode: usePowerWatts ? 'power' : 'feel',
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

    const trip: TripProfile = {
      id: `trip-calibrated-${Date.now()}`,
      name: tripName,
      tag: tripTag,
      description: isFr
        ? `Sortie ${purposeDef.nameFr} de ${distanceKm.toFixed(1)} km avec ${chosenBike.nameFr}. Allure : ${speedKmH} km/h (${selectedPaceDef.nameFr}).`
        : `${distanceKm.toFixed(1)} km ${purposeDef.name.toLowerCase()} ride with ${chosenBike.name}. Pace: ${speedKmH} km/h (${selectedPaceDef.name}).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departureTime: leaveTimeFormatted,
      departureDate: rideDate,
      physics: {
        riderWeightKg: Number(riderWeightKg) || 75,
        bikeWeightKg: bikeWeightKg,
        gearWeightKg: Number(luggageWeightKg) || 0,
        cda: cda,
        crr: isTubeless ? Math.max(0.0035, crr - 0.0008) : crr,
        rho: 1.225,
        drivetrainEfficiency: drivetrainEfficiency,
        grossMechanicalEfficiency: 0.22,
        gradientPercent: gradientPercent,
      },
      route: {
        origin,
        destination,
        distanceKm,
        targetSpeedKmH: speedKmH,
        pacingMode: 'speed',
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
        coordinates: coordinates.length > 0 ? coordinates : DEFAULT_NANTES_ROUTE_COORDS,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        routeMode: routeMode === 'from-to' ? 'corridor' : routeMode === 'distance' ? 'manual-radius' : 'gpx',
      },
      office: {
        shiftStartTime: readyTimeFormatted,
        targetGateArrivalTime: arriveTimeFormatted,
        gateName: destShort,
        lockerRefuelMinutes: parkingBufferMin,
        showerChangeMinutes: selectedChips.includes('shower-buffer') ? 15 : 0,
        breakRoomBreakfastMinutes: selectedChips.includes('coffee-stop') ? 15 : 0,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: purpose === 'commute',
        notes: '',
      },
      weather: weatherCondition,
      checklist: generateTripChecklist(tripTag, distanceKm, undefined, {
        lang: isFr ? 'fr' : 'en',
        includeExtraRavito: selectedChips.includes('real-food'),
        customChips: selectedChips,
        isTubeless,
        carbTargetGPerHr: 60,
        nutritionPreference: selectedChips.includes('real-food') ? 'real-food' : 'mixed',
      }),
      customChips: selectedChips,
      arriveAtMode: targetMode === 'arrive',
      ...customOverrides,
    };

    (trip as any).__onboardingSpecs = {
      isTubeless,
      riderLevel: purpose === 'sport' ? 'regular' : 'occasional',
      ftpWatts: resolvedFtp,
      cockpitViewMode: usePowerWatts ? 'pro' : 'essential',
      telemetryMode: usePowerWatts ? 'quantitative' : 'fuel-first',
      pacingInputMode: usePowerWatts ? 'power' : 'feel',
      carbTargetGPerHr: 60,
      nutritionPreference: selectedChips.includes('real-food') ? 'real-food' : 'mixed',
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
      departureDate: '2026-11-09',
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
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 overflow-hidden animate-apple-fade-in select-none"
    >
      <div className="relative w-full max-w-5xl max-h-[85vh] max-h-[85dvh] sm:max-h-[90vh] sm:max-h-[90dvh] bg-card text-ink rounded-[28px] sm:rounded-card shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden animate-apple-modal">
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
          <div key={currentStep} className="flex-1 min-h-0 flex flex-col animate-apple-step-in">
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
                  setWeatherCondition((prev) => ({
                    ...prev,
                    temperatureC: weatherData.tempC,
                    baseWindSpeedKmH: weatherData.windKmH,
                  }));
                }}
              />
            )}

            {currentStep === 4 && (
              <Screen5RiderBike
                riderWeightKg={riderWeightKg}
                onChangeRiderWeight={setRiderWeightKg}
                luggageWeightKg={luggageWeightKg}
                onChangeLuggageWeight={setLuggageWeightKg}
                selectedBikeId={selectedBikeId}
                onChangeSelectedBike={setSelectedBikeId}
                bikeWeightKg={bikeWeightKg}
                onChangeBikeWeight={setBikeWeightKg}
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
                parkingBufferMin={parkingBufferMin}
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
                <button
                  type="button"
                  onClick={handleTryExampleInstant}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Explorer l’exemple' : 'Try an example'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Commencer' : 'Start planning'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Accueil' : 'Welcome'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Vous pourrez modifier cela plus tard.' : 'You can change this later.'}
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer vers le parcours' : 'Continue to route'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body font-medium text-center tnum">
                {isFr ? `Parcours · ${distanceKm.toFixed(1)} km` : `Route · ${distanceKm.toFixed(1)} km`}
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Utiliser cet itinéraire' : 'Use this route'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body tnum">
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
                onClick={() => setCurrentStep(4)}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer vers le vélo' : 'Continue to rider & bike'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour' : 'Back'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Optionnel · modifiable à tout moment' : 'Optional · editable any time'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Passer' : 'Skip'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Voir l’aperçu' : 'View preview'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Modifier la config' : 'Edit setup'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Votre sortie est prête · aucune inscription requise' : 'Your ride is ready · no signup required'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleLaunchDirect}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-surface-active text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isFr ? 'Ouvrir le plan' : 'View ride plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{isFr ? 'Enregistrer & synchroniser' : 'Save & sync'}</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </>
          )}

          {currentStep === 6 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <ArrowLeft size={14} />
                <span>{isFr ? 'Retour à l’aperçu' : 'Back to ride preview'}</span>
              </button>
              <span className="hidden sm:inline text-xs text-ink-muted font-body text-center">
                {isFr ? 'Aucun compte requis pour utiliser votre plan de route' : 'No account required to use your ride plan'}
              </span>
              <button
                type="button"
                onClick={handleLaunchDirect}
                className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <span>{isFr ? 'Continuer sans compte' : 'Continue without account'}</span>
                <ArrowRight size={14} className="stroke-[2.5]" />
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};
