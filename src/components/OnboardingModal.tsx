import React, { useState, useEffect, useRef } from 'react';
import { TripProfile } from '../types/trip';
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
      } else {
        setOrigin('Trentemoult, Rezé');
        setDestination('Nantes gare, Nantes');
        setDistanceKm(6.0);
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

    // Persist to specs storage
    try {
      const existingSpecs = loadRiderBikeSpecs();
      saveRiderBikeSpecs({
        ...existingSpecs,
        riderWeightKg: Number(riderWeightKg) || 75,
      });

      saveUserProfile({
        name: isFr ? 'Pilote' : 'Rider',
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
      ftpWatts: 200,
      carbTargetGPerHr: 60,
      nutritionPreference: selectedChips.includes('real-food') ? 'real-food' : 'mixed',
    };

    return trip;
  };

  // Remark 1: "Try an example" instantly launches an example ride with pre-fetched data directly into the cockpit!
  const handleTryExampleInstant = () => {
    const exampleTrip: TripProfile = {
      id: `trip-example-${Date.now()}`,
      name: 'Trentemoult → Nantes gare',
      tag: 'VÉLOTAF',
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
      checklist: generateTripChecklist('VÉLOTAF', 6.0, undefined, {
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
      ftpWatts: 200,
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
            {currentStep === 0 && (
              <Screen1Welcome
                onStartPlanning={() => setCurrentStep(1)}
                onTryExample={handleTryExampleInstant}
              />
            )}

            {currentStep === 1 && (
              <Screen2Purpose
                selectedPurpose={purpose}
                onSelectPurpose={handleSelectPurpose}
                onBack={() => setCurrentStep(0)}
                onContinue={() => setCurrentStep(2)}
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
                isRouteReady={isRouteReady}
                gpxFileName={gpxFileName}
                onUpdateOrigin={setOrigin}
                onUpdateDestination={setDestination}
                onUpdateDistance={setDistanceKm}
                onUpdateCoordinates={setCoordinates}
                onGpxLoaded={(parsed) => {
                  setOrigin(parsed.name);
                  setDistanceKm(parsed.distanceKm);
                  setCoordinates(parsed.coordinates);
                  setGpxFileName(`${parsed.name}.gpx`);
                  setIsRouteReady(true);
                }}
                onBack={() => setCurrentStep(1)}
                onContinue={() => setCurrentStep(3)}
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
                onBack={() => setCurrentStep(2)}
                onContinue={() => setCurrentStep(4)}
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
                estimatedMinutes={ridingMinutes}
                selectedSpeedKmH={speedKmH}
                onBack={() => setCurrentStep(3)}
                onSkip={() => setCurrentStep(5)}
                onContinue={() => setCurrentStep(5)}
              />
            )}

            {currentStep === 5 && (
              <Screen6RideReady
                origin={origin}
                destination={destination}
                distanceKm={distanceKm}
                coordinates={coordinates}
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
                onContinueToCockpit={handleLaunchDirect}
                onGoToSaveSync={() => setCurrentStep(6)}
              />
            )}

            {currentStep === 6 && (
              <Screen7SaveSync
                origin={origin}
                destination={destination}
                distanceKm={distanceKm}
                ridingMinutes={ridingMinutes}
                onBackToPreview={() => setCurrentStep(5)}
                onContinueOnDevice={handleLaunchDirect}
                onAuthenticatedAndLaunch={handleLaunchDirect}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
