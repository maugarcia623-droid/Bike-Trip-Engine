import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from "@/components/arc/button/button";
import {
  ArrowRight,
  Bakery,
  Bike,
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Coffee,
  Feather,
  Gauge,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  SpinnerGap,
  Tent,
  TrainSimple,
  Upload,
  X,
  Zap,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { CHIP_TOKENS } from '../../tokens/chipTokens';
import { getActiveBike, loadRiderBikeSpecs } from '../../utils/specsStorage';
import { getEffectiveRiderSpecs, RiderBikeSpecs } from '../../types/specs';
import {
  generateTripChecklist,
  TripProfile,
  WeatherCondition,
} from '../../types/trip';
import { buildDefaultNewTripTemplate } from '../../utils/storage';
import { parseRouteFile } from '../../utils/routeFileParser';
import {
  getCachedStravaStatus,
  startStravaOAuthConnect,
} from '../../services/stravaIntegration';
import { GpxParseResult } from '../../utils/gpxParser';
import { calculateAutoBikeRoute } from '../../utils/routing';
import { geocodeLocation, LocationSuggestion } from '../../services/locationService';
import { getLocalTodayIso } from '../../services/weatherService';
import { LocationAutocompleteInput } from '../configurator/LocationAutocompleteInput';
import { Collapsible } from '../common/Collapsible';
import { addMinutesToTime, subtractMinutesFromTime } from '../../utils/nutrition';
import { ArchetypeMode, getChipsExtraBufferMinutes } from '../../utils/archetypeChips';

export type QuickRideTypeId = 'coffee' | 'sport' | 'gravel' | 'commute';
export type QuickDeparturePresetId =
  | 'today-next-hour'
  | 'tomorrow-08'
  | 'tomorrow-09'
  | 'weekday-09'
  | 'sat-0830'
  | 'custom';
export type QuickPacePresetId = 'easy' | 'steady' | 'brisk' | 'fast' | 'custom';
export type QuickOpenPopover = 'type' | 'distance' | 'departure' | 'pace' | null;

export interface QuickRideBuilderProps {
  riderSpecs?: RiderBikeSpecs;
  currentWeather?: WeatherCondition;
  onCreateTrip: (
    trip: TripProfile,
    targetView: 'dashboard' | 'configurator',
    options?: { autoOpenSlicer?: boolean }
  ) => void;
  onOpenOnboarding?: () => void;
}

interface RideTypeOption {
  id: QuickRideTypeId;
  tag: 'ESCAPADE' | 'SPORT' | 'BIKEPACKING' | 'VÉLOTAF';
  labelEn: string;
  labelFr: string;
  defaultPaceId: Exclude<QuickPacePresetId, 'custom'>;
  defaultSpeedKmH: number;
  defaultLuggageKg: number;
  baseChips: string[];
}

interface PacePresetOption {
  id: Exclude<QuickPacePresetId, 'custom'>;
  labelEn: string;
  labelFr: string;
  speedKmH: number;
  hintEn: string;
  hintFr: string;
}

interface RecipePreset {
  id: string;
  typeId: QuickRideTypeId;
  tag: 'ESCAPADE' | 'SPORT' | 'BIKEPACKING' | 'VÉLOTAF';
  titleEn: string;
  titleFr: string;
  metaEn: string;
  metaFr: string;
  distanceKm: number;
  speedKmH: number;
  chips: string[];
  luggageWeightKg: number;
  circular: boolean;
  schedule: 'saturday-0830' | 'saturday-0730' | 'tomorrow-0800' | 'weekday-0800';
}

const RIDE_TYPE_OPTIONS: RideTypeOption[] = [
  {
    id: 'coffee',
    tag: 'ESCAPADE',
    labelEn: 'Coffee Spin',
    labelFr: 'Sortie café',
    defaultPaceId: 'steady',
    defaultSpeedKmH: 20,
    defaultLuggageKg: 1.5,
    baseChips: ['leisure-cruise', 'scenic-route'],
  },
  {
    id: 'sport',
    tag: 'SPORT',
    labelEn: 'Sportive',
    labelFr: 'Sportive',
    defaultPaceId: 'brisk',
    defaultSpeedKmH: 28,
    defaultLuggageKg: 0.8,
    baseChips: ['hydration-electrolytes'],
  },
  {
    id: 'gravel',
    tag: 'BIKEPACKING',
    labelEn: 'Gravel Adventure',
    labelFr: 'Aventure gravel',
    defaultPaceId: 'steady',
    defaultSpeedKmH: 21,
    defaultLuggageKg: 4.5,
    baseChips: ['gravel-trail-master', 'resupply-points'],
  },
  {
    id: 'commute',
    tag: 'VÉLOTAF',
    labelEn: 'Commute',
    labelFr: 'Vélotaf',
    defaultPaceId: 'steady',
    defaultSpeedKmH: 22,
    defaultLuggageKg: 3.5,
    baseChips: ['rush-hour-buffer'],
  },
];

const DISTANCE_PRESETS = [15, 30, 60, 100];
const COMMUTE_DISTANCE_PRESETS = [10, 15, 30, 60];

const PACE_PRESETS: PacePresetOption[] = [
  { id: 'easy', labelEn: 'Easy', labelFr: 'Cool', speedKmH: 15, hintEn: 'Conversational spin', hintFr: 'Allure détente' },
  { id: 'steady', labelEn: 'Steady', labelFr: 'Modéré', speedKmH: 21, hintEn: 'Rhythmic cruising', hintFr: 'Rythme régulier' },
  { id: 'brisk', labelEn: 'Brisk', labelFr: 'Soutenu', speedKmH: 26, hintEn: 'Tempo endurance', hintFr: 'Endurance active' },
  { id: 'fast', labelEn: 'Fast', labelFr: 'Rapide', speedKmH: 32, hintEn: 'Peloton / sportive', hintFr: 'Peloton / sportive' },
];

const RIDE_RECIPES: RecipePreset[] = [
  {
    id: 'recipe-coffee-28',
    typeId: 'coffee',
    tag: 'ESCAPADE',
    titleEn: 'Weekend Coffee Loop',
    titleFr: 'Boucle Café Week-end',
    metaEn: '28 km · 20 km/h',
    metaFr: '28 km · 20 km/h',
    distanceKm: 28,
    speedKmH: 20,
    chips: ['coffee-stop', 'leisure-cruise', 'scenic-route'],
    luggageWeightKg: 1.0,
    circular: true,
    schedule: 'saturday-0830',
  },
  {
    id: 'recipe-sportive-100',
    typeId: 'sport',
    tag: 'SPORT',
    titleEn: 'Sportive Century',
    titleFr: 'Sportive 100 km',
    metaEn: '100 km · 30 km/h',
    metaFr: '100 km · 30 km/h',
    distanceKm: 100,
    speedKmH: 30,
    chips: ['hydration-electrolytes', 'paceline-drafting'],
    luggageWeightKg: 0.8,
    circular: true,
    schedule: 'saturday-0730',
  },
  {
    id: 'recipe-gravel-65',
    typeId: 'gravel',
    tag: 'BIKEPACKING',
    titleEn: 'Gravel Explorer',
    titleFr: 'Explorateur Gravel',
    metaEn: '65 km · 21 km/h',
    metaFr: '65 km · 21 km/h',
    distanceKm: 65,
    speedKmH: 21,
    chips: ['gravel-trail-master', 'resupply-points'],
    luggageWeightKg: 4.0,
    circular: true,
    schedule: 'tomorrow-0800',
  },
  {
    id: 'recipe-commute-12',
    typeId: 'commute',
    tag: 'VÉLOTAF',
    titleEn: 'Morning Commute',
    titleFr: 'Vélotaf Matinal',
    metaEn: '12 km · 22 km/h',
    metaFr: '12 km · 22 km/h',
    distanceKm: 12,
    speedKmH: 22,
    chips: ['rush-hour-buffer', 'bike-lane-priority'],
    luggageWeightKg: 3.5,
    circular: false,
    schedule: 'weekday-0800',
  },
];

function formatLocalDateIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getLocalTomorrowIso(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return formatLocalDateIso(next);
}

function getNextHourSchedule(): { dateIso: string; timeStr: string } {
  const now = new Date();
  const nextHour = now.getHours() + 1;
  if (nextHour >= 24) {
    return { dateIso: getLocalTomorrowIso(), timeStr: '08:00' };
  }
  return {
    dateIso: formatLocalDateIso(now),
    timeStr: `${String(nextHour).padStart(2, '0')}:00`,
  };
}

function getNextSaturdayIso(targetHour = 8): string {
  const now = new Date();
  const day = now.getDay();
  let offset = (6 - day + 7) % 7;
  if (offset === 0 && now.getHours() >= targetHour) {
    offset = 7;
  }
  const sat = new Date(now);
  sat.setDate(now.getDate() + offset);
  return formatLocalDateIso(sat);
}

function getNextWeekdayIso(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return formatLocalDateIso(next);
}

function offsetLatLng(origin: [number, number], distanceKm: number, bearingDeg: number): [number, number] {
  const [lat, lng] = origin;
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (distanceKm / 111.32) * Math.cos(rad);
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLng = (distanceKm / (111.32 * cosLat)) * Math.sin(rad);
  return [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))];
}

function renderRideTypeIcon(id: QuickRideTypeId, className = 'w-4 h-4') {
  switch (id) {
    case 'coffee':
      return <Coffee className={className} weight="duotone" />;
    case 'sport':
      return <Zap className={className} weight="duotone" />;
    case 'gravel':
      return <Tent className={className} weight="duotone" />;
    case 'commute':
      return <TrainSimple className={className} weight="duotone" />;
  }
}

function cleanFileBaseName(fileName: string): string {
  return fileName.replace(/\.(gpx|tcx|fit|xml)$/i, '').replace(/[_-]+/g, ' ').trim();
}

/**
 * Deterministic Zero-AI Quick-Start Ride Composer, 1-Tap Recipes & Drop-and-Go Importer.
 * Lets any rider generate and launch a calibrated TripProfile directly from HomeScreen.
 */
export const QuickRideBuilder: React.FC<QuickRideBuilderProps> = ({
  riderSpecs: propSpecs,
  currentWeather,
  onCreateTrip,
  onOpenOnboarding,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const specs = propSpecs ?? loadRiderBikeSpecs();
  const activeBike = getActiveBike(specs);
  const effectiveRider = getEffectiveRiderSpecs(specs);

  // Composer state
  const [rideTypeId, setRideTypeId] = useState<QuickRideTypeId>('coffee');
  const [distanceKm, setDistanceKm] = useState<number>(30);
  const [isCustomDistance, setIsCustomDistance] = useState<boolean>(false);
  const [customDistanceDraft, setCustomDistanceDraft] = useState<string>('45');
  const [distanceManuallySet, setDistanceManuallySet] = useState<boolean>(false);

  const [arriveAtMode, setArriveAtMode] = useState<boolean>(false);
  const [departurePreset, setDeparturePreset] = useState<QuickDeparturePresetId>('tomorrow-08');
  const [customDate, setCustomDate] = useState<string>(() => getLocalTomorrowIso());
  const [customTime, setCustomTime] = useState<string>('08:00');

  const [pacePreset, setPacePreset] = useState<QuickPacePresetId>('steady');
  const [customSpeedKmH, setCustomSpeedKmH] = useState<number>(21);
  const [paceManuallySet, setPaceManuallySet] = useState<boolean>(false);

  const [startLocationText, setStartLocationText] = useState<string>('');
  const [startLocationCoords, setStartLocationCoords] = useState<[number, number] | null>(null);
  const [destLocationText, setDestLocationText] = useState<string>('');
  const [destLocationCoords, setDestLocationCoords] = useState<[number, number] | null>(null);

  // Optional 1-tap vibe toggles
  const [vibeBakeryStop, setVibeBakeryStop] = useState<boolean>(false);
  const [vibeCircularLoop, setVibeCircularLoop] = useState<boolean>(true);
  const [vibeLightPack, setVibeLightPack] = useState<boolean>(false);

  // UI state
  const [openPopover, setOpenPopover] = useState<QuickOpenPopover>(null);
  const [isBuilding, setIsBuilding] = useState<'dashboard' | 'configurator' | null>(null);

  // Drop & Go Import state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isImportingRoute, setIsImportingRoute] = useState<boolean>(false);
  const [routeLinkInput, setRouteLinkInput] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessName, setImportSuccessName] = useState<string | null>(null);

  const composerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (ev: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(ev.target as Node)) {
        setOpenPopover(null);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeType = useMemo(
    () => RIDE_TYPE_OPTIONS.find((item) => item.id === rideTypeId) || RIDE_TYPE_OPTIONS[0],
    [rideTypeId]
  );

  const nextHourSchedule = useMemo(() => getNextHourSchedule(), []);

  const resolvedSchedule = useMemo(() => {
    switch (departurePreset) {
      case 'today-next-hour':
        return { date: nextHourSchedule.dateIso, time: nextHourSchedule.timeStr };
      case 'tomorrow-08':
        return { date: getLocalTomorrowIso(), time: '08:00' };
      case 'tomorrow-09':
        return { date: getLocalTomorrowIso(), time: '09:00' };
      case 'weekday-09':
        return { date: getNextWeekdayIso(), time: '09:00' };
      case 'sat-0830':
        return { date: getNextSaturdayIso(8), time: '08:30' };
      case 'custom':
        return {
          date: customDate || getLocalTomorrowIso(),
          time: customTime || (arriveAtMode ? '09:00' : '08:00'),
        };
    }
  }, [departurePreset, nextHourSchedule, customDate, customTime, arriveAtMode]);

  const resolvedSpeedKmH = useMemo(() => {
    if (pacePreset === 'custom') {
      return Math.min(45, Math.max(10, Math.round(customSpeedKmH)));
    }
    const found = PACE_PRESETS.find((p) => p.id === pacePreset);
    return found ? found.speedKmH : 21;
  }, [pacePreset, customSpeedKmH]);

  const buildBaseTrip = (params: {
    name: string;
    tag: 'ESCAPADE' | 'SPORT' | 'BIKEPACKING' | 'VÉLOTAF';
    description: string;
    distKm: number;
    speedKmH: number;
    dateIso: string;
    timeStr: string;
    arriveAtMode?: boolean;
    originLabel: string;
    destLabel: string;
    gateName?: string;
    chips: string[];
    luggageWeightKg: number;
    routeMode: 'manual-radius' | 'corridor' | 'gpx';
    coordinates?: [number, number][];
    originCoords?: [number, number];
    destCoords?: [number, number];
    elevationGainM?: number;
    elevationLossM?: number;
    elevationProfile?: TripProfile['route']['elevationProfile'];
    terrainSummary?: TripProfile['route']['terrainSummary'];
    gpxFileName?: string;
    cueSheet?: TripProfile['route']['cueSheet'];
  }): TripProfile => {
    const base = buildDefaultNewTripTemplate(lang);
    const weather: WeatherCondition = currentWeather ? { ...currentWeather } : { ...base.weather };

    const safeDist = Math.max(1, Number(params.distKm.toFixed(1)));
    const safeSpeed = Math.min(45, Math.max(8, Math.round(params.speedKmH)));
    const ridingMinutes = Math.max(5, Math.round((safeDist / safeSpeed) * 60));
    const isCommute = params.tag === 'VÉLOTAF';
    const isArriveAt = Boolean(params.arriveAtMode);
    const urbanDelay = isCommute ? 8 : 3;
    const gateDelay = isCommute ? 4 : 0;
    const lockerRefuelMinutes = isCommute ? 5 : 0;
    const showerChangeMinutes = params.chips.includes('shower-locker') ? 15 : 0;
    const breakRoomBreakfastMinutes = 0;
    const postGateMinutes = lockerRefuelMinutes + showerChangeMinutes + breakRoomBreakfastMinutes;

    const archetype: ArchetypeMode = isCommute
      ? 'COMMUTE'
      : params.tag === 'SPORT'
      ? 'SPORT'
      : params.tag === 'BIKEPACKING'
      ? 'BIKEPACKING'
      : 'ESCAPADE';
    const chipsExtraMin = getChipsExtraBufferMinutes(archetype, params.chips);
    const totalEnRouteMin = ridingMinutes + urbanDelay + gateDelay + chipsExtraMin;

    let departureTimeStr: string;
    let targetGateArrivalTimeStr: string;
    let shiftStartTimeStr: string;

    if (isArriveAt) {
      shiftStartTimeStr = params.timeStr;
      targetGateArrivalTimeStr = subtractMinutesFromTime(shiftStartTimeStr, postGateMinutes);
      departureTimeStr = subtractMinutesFromTime(targetGateArrivalTimeStr, totalEnRouteMin);
    } else {
      departureTimeStr = params.timeStr;
      targetGateArrivalTimeStr = addMinutesToTime(departureTimeStr, totalEnRouteMin);
      shiftStartTimeStr = addMinutesToTime(targetGateArrivalTimeStr, postGateMinutes);
    }

    const checklist = generateTripChecklist(params.tag, safeDist, weather, {
      lang,
      customChips: params.chips,
      totalDays: 1,
      isTubeless: Boolean(activeBike.isTubeless),
      carbTargetGPerHr: effectiveRider.carbTargetGPerHr,
      nutritionPreference: specs.nutritionPreference,
      bidonSizeMl: specs.bidonSizeMl,
      frameBottleSlots: specs.frameBottleSlots,
      rideHours: safeDist / safeSpeed,
    });

    const nowIso = new Date().toISOString();

    return {
      ...base,
      id: `trip-quick-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: params.name,
      tag: params.tag,
      description: params.description,
      departureDate: params.dateIso,
      departureTime: departureTimeStr,
      arriveAtMode: isArriveAt,
      customChips: params.chips,
      weather,
      route: {
        ...base.route,
        origin: params.originLabel,
        destination: params.destLabel,
        distanceKm: safeDist,
        targetSpeedKmH: safeSpeed,
        pacingMode: 'speed',
        urbanTrafficDelayMinutes: urbanDelay,
        gateSecurityDelayMinutes: gateDelay,
        routeMode: params.routeMode,
        radiusMeters:
          params.routeMode === 'manual-radius'
            ? Math.max(1000, Math.round((safeDist / 2) * 1000))
            : undefined,
        coordinates: params.coordinates ?? (params.originCoords ? [params.originCoords] : []),
        originCoords: params.originCoords,
        destCoords: params.destCoords,
        elevationGainM: params.elevationGainM ?? Math.round(safeDist * (params.tag === 'BIKEPACKING' ? 11 : 6)),
        elevationLossM: params.elevationLossM ?? Math.round(safeDist * (params.tag === 'BIKEPACKING' ? 11 : 6)),
        elevationProfile: params.elevationProfile,
        terrainSummary: params.terrainSummary,
        gpxFileName: params.gpxFileName,
        cueSheet: params.cueSheet,
      },
      office: {
        ...base.office,
        shiftStartTime: shiftStartTimeStr,
        targetGateArrivalTime: targetGateArrivalTimeStr,
        ...(params.gateName
          ? { gateName: params.gateName }
          : isCommute
          ? { gateName: params.destLabel }
          : {}),
        lockerRefuelMinutes,
        showerChangeMinutes,
        breakRoomBreakfastMinutes,
        badgeRequiredForGate: isCommute,
      },
      physics: {
        ...base.physics,
        riderWeightKg: effectiveRider.riderWeightKg,
        bikeWeightKg: activeBike.weightKg,
        gearWeightKg: params.luggageWeightKg,
        luggageWeightKg: params.luggageWeightKg,
        cda: activeBike.cda,
        crr: activeBike.crr,
      },
      checklist,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const handleSelectRideType = (option: RideTypeOption) => {
    setRideTypeId(option.id);
    if (!paceManuallySet) {
      setPacePreset(option.defaultPaceId);
      setCustomSpeedKmH(option.defaultSpeedKmH);
    }
    if (option.id === 'commute') {
      setVibeCircularLoop(false);
      setArriveAtMode(true);
      setDeparturePreset('tomorrow-09');
      setCustomDate(getLocalTomorrowIso());
      setCustomTime('09:00');
      if (!distanceManuallySet) {
        setDistanceKm(10);
        setIsCustomDistance(false);
      }
    } else {
      setArriveAtMode(false);
      if (departurePreset === 'tomorrow-09' || departurePreset === 'weekday-09') {
        setDeparturePreset('tomorrow-08');
        setCustomTime('08:00');
      }
      if (!distanceManuallySet) {
        setDistanceKm(30);
        setIsCustomDistance(false);
      }
      if (option.id === 'coffee' || option.id === 'gravel') {
        setVibeCircularLoop(true);
      }
    }
    setOpenPopover(null);
  };

  const handleBuildFromComposer = async (targetView: 'dashboard' | 'configurator') => {
    if (isBuilding) return;
    setIsBuilding(targetView);
    setImportError(null);

    try {
      const chips = Array.from(
        new Set([
          ...activeType.baseChips,
          ...(vibeBakeryStop ? ['coffee-stop'] : []),
          ...(vibeLightPack ? ['leisure-cruise'] : []),
        ])
      );
      const luggageKg = vibeLightPack ? 0.5 : activeType.defaultLuggageKg;
      const trimmedStart = startLocationText.trim();
      const trimmedDest = destLocationText.trim();
      const isPointToPoint = !vibeCircularLoop;

      let originCoords = startLocationCoords;
      if (!originCoords && trimmedStart.length >= 2) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        originCoords = await Promise.race([geocodeLocation(trimmedStart, lang), timeoutPromise]);
      }

      let resolvedDestCoords = isPointToPoint ? destLocationCoords : null;
      if (isPointToPoint && !resolvedDestCoords && trimmedDest.length >= 2) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        resolvedDestCoords = await Promise.race([geocodeLocation(trimmedDest, lang), timeoutPromise]);
      }

      const originLabel = trimmedStart || (isFr ? 'Point de départ' : 'Starting point');
      const destLabel = vibeCircularLoop
        ? trimmedStart || (isFr ? `Boucle ${distanceKm} km` : `${distanceKm} km Loop`)
        : trimmedDest ||
          (rideTypeId === 'commute'
            ? isFr
              ? 'Destination bureau'
              : 'Work destination'
            : isFr
              ? `Aller simple (${distanceKm} km)`
              : `Point-to-point (${distanceKm} km)`);

      let routeMode: 'manual-radius' | 'corridor' = 'manual-radius';
      let finalCoords: [number, number][] | undefined = originCoords ? [originCoords] : [];
      let destCoords: [number, number] | undefined = vibeCircularLoop
        ? originCoords ?? undefined
        : resolvedDestCoords ?? undefined;
      let finalDistKm = distanceKm;
      let elevGain: number | undefined;
      let elevLoss: number | undefined;
      let elevProfile: TripProfile['route']['elevationProfile'];
      let terrainSummary: TripProfile['route']['terrainSummary'];
      let cueSheet: TripProfile['route']['cueSheet'];

      // Attempt fast deterministic OSRM bike route (true A->B when destination is provided, else loop/out-and-back)
      if (originCoords && isPointToPoint && resolvedDestCoords) {
        const osrmRace = await Promise.race([
          calculateAutoBikeRoute(originLabel, destLabel, originCoords, resolvedDestCoords),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500)),
        ]);

        if (osrmRace && osrmRace.coordinates.length >= 2) {
          routeMode = 'corridor';
          finalCoords = osrmRace.coordinates;
          destCoords = resolvedDestCoords;
          finalDistKm = osrmRace.distanceKm > 0.5 ? Number(osrmRace.distanceKm.toFixed(1)) : distanceKm;
          elevGain = osrmRace.elevationGainM;
          elevLoss = osrmRace.elevationLossM;
          elevProfile = osrmRace.elevationProfile;
          cueSheet = osrmRace.cueSheet;
        }
      } else if (originCoords && distanceKm >= 4) {
        const radiusKm = vibeCircularLoop
          ? Math.max(1.2, distanceKm / 4.2)
          : rideTypeId === 'commute'
            ? Math.max(1.2, distanceKm / 1.25)
            : Math.max(1.5, distanceKm / 2.2);
        const wp1Coords = offsetLatLng(originCoords, radiusKm, 35);
        const wp2Coords = vibeCircularLoop ? offsetLatLng(originCoords, radiusKm, 105) : null;
        const routeWaypoints = wp2Coords
          ? [
              { id: 'wp-1', name: isFr ? 'Cap Nord-Est' : 'North-East turn', coordinates: wp1Coords },
              { id: 'wp-2', name: isFr ? 'Cap Sud-Est' : 'South-East turn', coordinates: wp2Coords },
            ]
          : undefined;
        const targetDestCoords = vibeCircularLoop ? originCoords : wp1Coords;

        const osrmRace = await Promise.race([
          calculateAutoBikeRoute(
            originLabel,
            destLabel,
            originCoords,
            targetDestCoords,
            routeWaypoints
          ),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500)),
        ]);

        if (osrmRace && osrmRace.coordinates.length >= 2) {
          routeMode = 'corridor';
          finalCoords = osrmRace.coordinates;
          destCoords = targetDestCoords;
          finalDistKm = osrmRace.distanceKm > 1 ? Number(osrmRace.distanceKm.toFixed(1)) : distanceKm;
          elevGain = osrmRace.elevationGainM;
          elevLoss = osrmRace.elevationLossM;
          elevProfile = osrmRace.elevationProfile;
          cueSheet = osrmRace.cueSheet;
        }
      }

      const originShort = trimmedStart.split(',')[0].trim();
      const destShort = trimmedDest.split(',')[0].trim();
      const tripName =
        isPointToPoint && originShort && destShort
          ? `${originShort} → ${destShort} (${Math.round(finalDistKm)} km)`
          : isPointToPoint && destShort
          ? `${isFr ? activeType.labelFr : activeType.labelEn} → ${destShort} (${Math.round(finalDistKm)} km)`
          : originShort
          ? `${isFr ? activeType.labelFr : activeType.labelEn} · ${originShort} (${Math.round(finalDistKm)} km)`
          : `${isFr ? activeType.labelFr : activeType.labelEn} · ${Math.round(finalDistKm)} km`;

      const builtTrip = buildBaseTrip({
        name: tripName,
        tag: activeType.tag,
        description: isFr
          ? `${activeType.labelFr} planifiée à ${resolvedSpeedKmH} km/h${vibeBakeryStop ? ' avec pause boulangerie' : ''}.`
          : `${activeType.labelEn} planned at ${resolvedSpeedKmH} km/h${vibeBakeryStop ? ' with bakery stop' : ''}.`,
        distKm: finalDistKm,
        speedKmH: resolvedSpeedKmH,
        dateIso: resolvedSchedule.date,
        timeStr: resolvedSchedule.time,
        arriveAtMode,
        originLabel,
        destLabel,
        gateName: destShort || undefined,
        chips,
        luggageWeightKg: luggageKg,
        routeMode,
        coordinates: finalCoords,
        originCoords: originCoords ?? undefined,
        destCoords,
        elevationGainM: elevGain,
        elevationLossM: elevLoss,
        elevationProfile: elevProfile,
        terrainSummary,
        cueSheet,
      });

      onCreateTrip(builtTrip, targetView);
    } finally {
      setIsBuilding(null);
    }
  };

  const handleLaunchRecipe = async (recipe: RecipePreset) => {
    setImportError(null);
    const dateIso =
      recipe.schedule === 'saturday-0830'
        ? getNextSaturdayIso(8)
        : recipe.schedule === 'saturday-0730'
          ? getNextSaturdayIso(7)
          : recipe.schedule === 'tomorrow-0800'
            ? getLocalTomorrowIso()
            : getNextWeekdayIso();
    const timeStr =
      recipe.schedule === 'saturday-0830'
        ? '08:30'
        : recipe.schedule === 'saturday-0730'
          ? '07:30'
          : '08:00';

    const trimmedStart = startLocationText.trim();
    const originLabel = trimmedStart || (isFr ? 'Départ local' : 'Local start');
    const destLabel = recipe.circular
      ? trimmedStart || (isFr ? `Boucle ${recipe.distanceKm} km` : `${recipe.distanceKm} km Loop`)
      : isFr
        ? 'Destination bureau'
        : 'Work destination';

    let coords: [number, number][] = startLocationCoords ? [startLocationCoords] : [];
    let resolvedDistKm = recipe.distanceKm;
    let routeMode: 'gpx' | 'manual-radius' = 'manual-radius';
    let elevationGainM: number | undefined;
    let elevationProfile: import('../../types/trip').ElevationProfilePoint[] | undefined;
    let cueSheet: typeof loopResultFallbackCueSheet = undefined;
    type LoopCue = Awaited<ReturnType<typeof import('../../utils/routing')['generateBikeLoopRoute']>>['cueSheet'];
    const loopResultFallbackCueSheet: LoopCue = undefined;

    if (recipe.circular && startLocationCoords) {
      try {
        const { generateBikeLoopRoute } = await import('../../utils/routing');
        const loopResult = await generateBikeLoopRoute(
          originLabel,
          recipe.distanceKm
        );
        if (loopResult.coordinates.length >= 2) {
          coords = loopResult.coordinates;
          resolvedDistKm = Number(loopResult.distanceKm.toFixed(1));
          routeMode = 'gpx';
          elevationGainM = loopResult.elevationGainM;
          elevationProfile = loopResult.elevationProfile;
          cueSheet = loopResult.cueSheet;
        }
      } catch {
        // Fallback to manual-radius if OSRM loop generation is unavailable
      }
    }

    const builtTrip = buildBaseTrip({
      name: isFr ? recipe.titleFr : recipe.titleEn,
      tag: recipe.tag,
      description: `${isFr ? recipe.titleFr : recipe.titleEn} (${isFr ? recipe.metaFr : recipe.metaEn})`,
      distKm: resolvedDistKm,
      speedKmH: recipe.speedKmH,
      dateIso,
      timeStr,
      originLabel,
      destLabel,
      chips: recipe.chips,
      luggageWeightKg: recipe.luggageWeightKg,
      routeMode,
      coordinates: coords,
      originCoords: startLocationCoords ?? undefined,
      elevationGainM,
      elevationProfile,
      cueSheet,
    });

    onCreateTrip(builtTrip, 'dashboard');
  };

  const launchFromParsedRoute = (parsed: GpxParseResult, sourceLabel: string) => {
    const cleanName = parsed.trackName?.trim() || cleanFileBaseName(sourceLabel) || (isFr ? 'Trace importée' : 'Imported route');
    const isLikelyMultiDayTour = parsed.distanceKm >= 160;
    const shouldAutoOpenSlicer = parsed.distanceKm >= 180 && parsed.coordinates.length >= 2;
    const resolvedTag = isLikelyMultiDayTour ? 'BIKEPACKING' : activeType.tag;
    const resolvedLuggageKg = isLikelyMultiDayTour
      ? Math.max(8, activeType.defaultLuggageKg)
      : vibeLightPack
      ? 0.5
      : activeType.defaultLuggageKg;
    const trip = buildBaseTrip({
      name: cleanName,
      tag: resolvedTag,
      description: isFr
        ? `Trace GPS importée (${sourceLabel}) · ${parsed.distanceKm.toFixed(1)} km`
        : `Imported GPS route (${sourceLabel}) · ${parsed.distanceKm.toFixed(1)} km`,
      distKm: parsed.distanceKm,
      speedKmH: isLikelyMultiDayTour ? Math.min(resolvedSpeedKmH, 21) : resolvedSpeedKmH,
      dateIso: resolvedSchedule.date,
      timeStr: resolvedSchedule.time,
      arriveAtMode: isLikelyMultiDayTour ? false : arriveAtMode,
      originLabel: parsed.originLabel || (isFr ? 'Départ trace' : 'Route start'),
      destLabel: parsed.destLabel || (isFr ? 'Arrivée trace' : 'Route finish'),
      gateName: parsed.destLabel || undefined,
      chips: Array.from(new Set([...activeType.baseChips, ...(vibeBakeryStop ? ['coffee-stop'] : [])])),
      luggageWeightKg: resolvedLuggageKg,
      routeMode: 'gpx',
      coordinates: parsed.coordinates,
      originCoords: parsed.coordinates[0],
      destCoords: parsed.coordinates[parsed.coordinates.length - 1],
      elevationGainM: parsed.elevationGainM,
      elevationLossM: parsed.elevationLossM,
      elevationProfile: parsed.elevationProfile,
      terrainSummary: parsed.terrainSummary,
      gpxFileName: sourceLabel,
    });
    setImportSuccessName(cleanName);
    onCreateTrip(trip, 'dashboard', { autoOpenSlicer: shouldAutoOpenSlicer });
  };

  const handleFileImport = async (file: File) => {
    setImportError(null);
    setImportSuccessName(null);
    setIsImportingRoute(true);
    try {
      const parsed = await parseRouteFile(file);
      launchFromParsedRoute(parsed, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setImportError(
        message ||
          (isFr
            ? 'Impossible de lire ce fichier. Vérifiez qu’il s’agit d’une trace .gpx, .tcx ou .fit valide.'
            : 'Could not read this route file. Please verify it is a valid .gpx, .tcx, or .fit track.')
      );
    } finally {
      setIsImportingRoute(false);
    }
  };

  const handleRouteUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeLinkInput.trim() || isImportingRoute) return;
    setImportError(null);
    setImportSuccessName(null);
    setIsImportingRoute(true);
    try {
      const { importRouteFromUrl } = await import('../../utils/routeUrlImporter');
      const outcome = await importRouteFromUrl(routeLinkInput.trim());
      if (outcome.ok && outcome.parsed) {
        launchFromParsedRoute(
          outcome.parsed,
          outcome.fileName || outcome.parsed.trackName || `${outcome.provider || 'route'}.gpx`
        );
        setRouteLinkInput('');
      } else {
        setImportError(
          (isFr ? outcome.guidanceFr : outcome.guidanceEn) ||
            (isFr
              ? 'Import via URL impossible depuis le navigateur (CORS/accès). Exportez en .GPX et déposez le fichier ci-contre.'
              : 'Direct import from this link is restricted (CORS/auth). Export as .GPX and drop the file next to this box.')
        );
      }
    } catch {
      setImportError(
        isFr
          ? 'Import via URL impossible depuis le navigateur (CORS/accès). Exportez en .GPX et déposez le fichier juste à côté.'
          : 'Browser import from this URL was blocked (CORS/login). Export as .GPX and drop the file next to this box.'
      );
    } finally {
      setIsImportingRoute(false);
    }
  };

  const departurePillLabel = useMemo(() => {
    if (departurePreset === 'today-next-hour') {
      return isFr ? `Aujourd'hui · ${nextHourSchedule.timeStr}` : `Today · ${nextHourSchedule.timeStr}`;
    }
    if (departurePreset === 'tomorrow-08') {
      return isFr ? 'Demain · 08:00' : 'Tomorrow · 08:00';
    }
    if (departurePreset === 'tomorrow-09') {
      return isFr ? 'Demain · 09:00' : 'Tomorrow · 09:00';
    }
    if (departurePreset === 'weekday-09') {
      return isFr ? 'Prochain ouvré · 09:00' : 'Next weekday · 09:00';
    }
    if (departurePreset === 'sat-0830') {
      return isFr ? 'Sam · 08:30' : 'Sat · 08:30';
    }
    return `${resolvedSchedule.date} · ${resolvedSchedule.time}`;
  }, [departurePreset, nextHourSchedule.timeStr, resolvedSchedule, isFr]);

  const activeDistancePresets =
    rideTypeId === 'commute' ? COMMUTE_DISTANCE_PRESETS : DISTANCE_PRESETS;
  const showDestinationInput = !vibeCircularLoop;

  const vibeToggleGroup = (
    <div className={`flex flex-wrap items-center gap-1.5 ${showDestinationInput ? '' : 'pb-0.5'}`}>
      <button
        type="button"
        aria-pressed={vibeBakeryStop}
        onClick={() => setVibeBakeryStop((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
          vibeBakeryStop
            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} border-teal-500/40`
            : 'bg-pod hover:bg-chip border-ink/10 dark:border-white/10 text-ink-secondary hover:text-ink'
        }`}
      >
        <Bakery className="w-3.5 h-3.5" />
        <span>{isFr ? 'Arrêt boulangerie' : 'Bakery stop'}</span>
      </button>

      <button
        type="button"
        aria-pressed={vibeCircularLoop}
        onClick={() => setVibeCircularLoop((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
          vibeCircularLoop
            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} border-teal-500/40`
            : 'bg-pod hover:bg-chip border-ink/10 dark:border-white/10 text-ink-secondary hover:text-ink'
        }`}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>{isFr ? 'Boucle' : 'Circular loop'}</span>
      </button>

      <button
        type="button"
        aria-pressed={vibeLightPack}
        onClick={() => setVibeLightPack((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
          vibeLightPack
            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} border-teal-500/40`
            : 'bg-pod hover:bg-chip border-ink/10 dark:border-white/10 text-ink-secondary hover:text-ink'
        }`}
      >
        <Feather className="w-3.5 h-3.5" />
        <span>{isFr ? 'Sac léger' : 'Light pack'}</span>
      </button>
    </div>
  );

  const pacePillLabel = useMemo(() => {
    if (pacePreset === 'custom') {
      return isFr ? `Perso · ${resolvedSpeedKmH} km/h` : `Custom · ${resolvedSpeedKmH} km/h`;
    }
    const found = PACE_PRESETS.find((p) => p.id === pacePreset) || PACE_PRESETS[1];
    return `${isFr ? found.labelFr : found.labelEn} · ${found.speedKmH} km/h`;
  }, [pacePreset, resolvedSpeedKmH, isFr]);

  return (
    <section
      aria-label={isFr ? 'Importer une trace ou esquisser une sortie' : 'Import Route or Quick Ride Builder'}
      className="relative z-30 min-w-0 max-w-full bg-card border border-ink/5 dark:border-white/5 rounded-card p-4 sm:p-6 shadow-xs overflow-visible animate-apple-in"
    >
      {/* Top Badge & Optional Guided Setup Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-rounded font-bold uppercase tracking-wider ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isFr ? 'Importer une trace' : 'Drop a route'}</span>
          </span>
          <span className="text-xs text-ink-muted">
            {isFr
              ? 'Komoot, Strava, RideWithGPS, Bikemap ou fichier .GPX / .TCX / .FIT'
              : 'Komoot, Strava, RideWithGPS, Bikemap or .GPX / .TCX / .FIT file'}
          </span>
        </div>
        {onOpenOnboarding && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-xs font-medium text-ink-secondary hover:text-ink underline underline-offset-4 transition-colors cursor-pointer min-h-[36px] inline-flex items-center"
          >
            {isFr ? 'Ou lancer l’assistant guidé' : 'Prefer step-by-step guided setup?'}
          </button>
        )}
      </div>

      {/* ── 1. IMPORT-FIRST HERO (URL Paste + Drag-and-Drop Dropzone) ── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg sm:text-[22px] font-bold tracking-tight text-ink font-rounded leading-snug">
            {isFr ? 'Déposez une trace pour bâtir votre plan de sortie' : 'Drop a route to build your ride plan'}
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-secondary mt-0.5 leading-relaxed">
            {isFr
              ? 'Collez un lien Komoot ou déposez un fichier GPX : météo par secteur, points d’eau, nutrition et découpage multi-jours calculés instantanément.'
              : 'Paste a Komoot link or drop a GPX file — get instant weather, water gaps, fueling, and multi-day stage cuts.'}
          </p>
        </div>

        {/* Prominent Route URL paste form */}
        <form onSubmit={handleRouteUrlSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <input
              type="url"
              value={routeLinkInput}
              onChange={(e) => {
                setRouteLinkInput(e.target.value);
                if (importError) setImportError(null);
              }}
              aria-label={isFr ? 'Coller un lien Komoot, Bikemap, RideWithGPS ou Strava' : 'Paste Komoot, Bikemap, RideWithGPS or Strava link'}
              placeholder={
                isFr
                  ? 'Coller un lien Komoot / Strava / RideWithGPS / Bikemap…'
                  : 'Paste Komoot, Strava, RideWithGPS or Bikemap link…'
              }
              className="w-full min-h-[46px] px-4 rounded-pod bg-pod border border-ink/10 dark:border-white/10 text-base sm:text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
          <Button
            type="submit"
            variant="ghost"
            size="md"
            loading={isImportingRoute}
            disabled={!routeLinkInput.trim() || isImportingRoute}
            className={`min-h-[46px] shrink-0 px-5 rounded-full ring-1 ring-inset text-xs sm:text-[13px] font-rounded font-bold cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 disabled:opacity-50 ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} ${CHIP_TOKENS.teal.selectedRing}`}
          >
            {isFr ? 'Importer' : 'Import Link'}
          </Button>
        </form>

        {/* Single-line Drag-and-drop file dropzone (never wraps Browse onto a second line) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              void handleFileImport(file);
            }
          }}
          className={`flex flex-row flex-nowrap items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 rounded-pod border border-dashed min-w-0 max-w-full overflow-hidden transition-colors ${
            isDragOver
              ? 'ring-1 ring-inset ring-teal-500/60 border-teal-500/50 bg-teal-500/10'
              : 'bg-pod hover:bg-chip border-ink/15 dark:border-white/15'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,.tcx,.fit"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleFileImport(file);
              }
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary}`}
            >
              {isImportingRoute ? (
                <SpinnerGap className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs sm:text-[13px] font-bold text-ink truncate">
                <span className="sm:hidden">
                  {isFr ? 'Fichier .GPX, .TCX, .FIT' : 'Drop .GPX, .TCX, or .FIT'}
                </span>
                <span className="hidden sm:inline">
                  {isFr ? 'Déposez un fichier .GPX, .TCX ou .FIT ici' : 'Drop a .GPX, .TCX, or .FIT file here'}
                </span>
              </div>
              <div className="text-[11px] text-ink-muted truncate">
                {importSuccessName
                  ? isFr
                    ? `Prêt : ${importSuccessName}`
                    : `Loaded: ${importSuccessName}`
                  : isFr
                    ? 'Glissez ou parcourez — ouverture directe'
                    : 'Drag & drop or browse — launches straight into your ride plan'}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={isImportingRoute}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[36px] px-3.5 sm:px-4 rounded-full bg-card hover:bg-chip-hover text-ink border border-ink/10 dark:border-white/10 shrink-0 whitespace-nowrap text-xs font-semibold cursor-pointer"
          >
            {isFr ? 'Parcourir' : 'Browse'}
          </Button>
        </div>

        {/* Inline Route Import / CORS Guidance Feedback */}
        {importError && (
          <div
            role="alert"
            className="flex flex-wrap items-start justify-between gap-2.5 rounded-pod bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-ink"
          >
            <div className="flex items-start gap-2 flex-1 min-w-[200px]">
              <CircleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {(/strava/i.test(routeLinkInput) || /strava/i.test(importError)) &&
                !getCachedStravaStatus().connected && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={startStravaOAuthConnect}
                    className="min-h-[44px] sm:min-h-[34px] px-3 rounded-full bg-[#B83500] hover:bg-[#9E2D00] text-white text-[11px] font-rounded font-semibold cursor-pointer"
                  >
                    {isFr ? 'Connecter Strava' : 'Connect Strava'}
                  </Button>
                )}
              <button
                type="button"
                onClick={() => setImportError(null)}
                aria-label={isFr ? 'Fermer l’avertissement' : 'Dismiss warning'}
                className="text-ink-muted hover:text-ink p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. SECONDARY DISCLOSURE: SKETCH FROM SCRATCH & 1-TAP RECIPES ── */}
      <div className="mt-4 pt-3.5 border-t border-dashed border-ink/15 dark:border-white/15 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsComposerOpen((prev) => !prev)}
          aria-expanded={isComposerOpen}
          data-testid="sketch-from-scratch-toggle"
          className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 min-h-[40px] px-4 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink border border-ink/5 dark:border-white/5 text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate">
              {isFr
                ? 'Pas encore de trace ? Esquisser une sortie rapide'
                : 'No route yet? Sketch a quick ride from scratch'}
            </span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isComposerOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <Collapsible open={isComposerOpen} allowOverflowWhenOpen innerClassName="pt-4 min-w-0 max-w-full">
        {/* 3-Tap Interactive Mad-Libs Sentence Composer */}
        <div ref={composerRef} className="relative z-40 pt-0.5 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-2 text-[14px] sm:text-[17px] font-rounded font-medium text-ink leading-relaxed max-w-full">
            <span>{isFr ? 'Je pars sur une' : 'I want a'}</span>

            {/* Pill 1: Ride Type */}
            <div className="relative inline-block max-w-full">
              <button
                type="button"
                aria-expanded={openPopover === 'type'}
                aria-haspopup="listbox"
                onClick={() => setOpenPopover(openPopover === 'type' ? null : 'type')}
                className={`inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-full border border-teal-500/30 font-semibold text-xs sm:text-base transition-colors cursor-pointer ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} hover:brightness-95 dark:hover:brightness-110`}
              >
                <span aria-hidden="true">{renderRideTypeIcon(activeType.id, 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0')}</span>
                <span>{isFr ? activeType.labelFr : activeType.labelEn}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openPopover === 'type' && (
                <div
                  role="listbox"
                  aria-label={isFr ? 'Type de sortie' : 'Ride type'}
                  className="absolute left-0 top-full mt-2 w-64 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#161618] border border-ink/10 dark:border-white/10 rounded-pod shadow-xl p-1.5 z-50"
                >
                  {RIDE_TYPE_OPTIONS.map((opt) => {
                    const selected = opt.id === rideTypeId;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelectRideType(opt)}
                        className={`w-full flex items-center justify-between gap-2 px-3 min-h-[44px] sm:min-h-[38px] rounded-xl text-left text-sm transition-colors cursor-pointer ${
                          selected
                            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} font-semibold`
                            : 'text-ink hover:bg-pod'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {renderRideTypeIcon(opt.id, 'w-4 h-4 shrink-0')}
                          <span>{isFr ? opt.labelFr : opt.labelEn}</span>
                        </span>
                        {selected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span>{isFr ? 'de' : 'of'}</span>

            {/* Pill 2: Distance */}
            <div className="relative inline-block">
              <button
                type="button"
                aria-expanded={openPopover === 'distance'}
                aria-haspopup="listbox"
                onClick={() => setOpenPopover(openPopover === 'distance' ? null : 'distance')}
                className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 sm:px-3.5 py-1 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-ink tnum font-bold text-xs sm:text-base transition-colors cursor-pointer"
              >
                <span>{distanceKm} km</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              {openPopover === 'distance' && (
                <div
                  role="listbox"
                  aria-label={isFr ? 'Distance' : 'Distance'}
                  className="absolute left-0 top-full mt-2 w-64 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#161618] border border-ink/10 dark:border-white/10 rounded-pod shadow-xl p-2.5 z-50 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {activeDistancePresets.map((km) => {
                      const selected = !isCustomDistance && distanceKm === km;
                      return (
                        <button
                          key={km}
                          type="button"
                          onClick={() => {
                            setIsCustomDistance(false);
                            setDistanceKm(km);
                            setDistanceManuallySet(true);
                            setOpenPopover(null);
                          }}
                          className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-xl tnum text-sm font-bold border transition-colors cursor-pointer ${
                            selected
                              ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} border-teal-500/40`
                              : 'bg-pod border-ink/5 dark:border-white/5 text-ink hover:bg-chip'
                          }`}
                        >
                          {km} km
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-ink/10 dark:border-white/10 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={3}
                      max={400}
                      value={customDistanceDraft}
                      onChange={(e) => setCustomDistanceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parsed = Number(customDistanceDraft);
                          if (Number.isFinite(parsed) && parsed >= 3) {
                            setIsCustomDistance(true);
                            setDistanceKm(Math.min(400, Math.max(3, Math.round(parsed))));
                            setDistanceManuallySet(true);
                            setOpenPopover(null);
                          }
                        }
                      }}
                      aria-label={isFr ? 'Distance personnalisée en km' : 'Custom distance in km'}
                      placeholder={isFr ? 'Perso km' : 'Custom km'}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-2.5 rounded-xl bg-pod border border-ink/10 dark:border-white/10 text-base sm:text-sm tnum text-ink focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const parsed = Number(customDistanceDraft);
                        if (Number.isFinite(parsed) && parsed >= 3) {
                          setIsCustomDistance(true);
                          setDistanceKm(Math.min(400, Math.max(3, Math.round(parsed))));
                          setDistanceManuallySet(true);
                          setOpenPopover(null);
                        }
                      }}
                    >
                      OK
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <span>
              {arriveAtMode
                ? isFr
                  ? 'arrivée pour'
                  : 'arriving by'
                : isFr
                ? 'prévue'
                : 'leaving'}
            </span>

            {/* Pill 3: Timing (Arrive by / Depart at) */}
            <div className="relative inline-block">
              <button
                type="button"
                aria-expanded={openPopover === 'departure'}
                aria-haspopup="listbox"
                onClick={() => setOpenPopover(openPopover === 'departure' ? null : 'departure')}
                className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 sm:px-3.5 py-1 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-ink text-xs sm:text-base font-semibold transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="tnum">{departurePillLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              {openPopover === 'departure' && (
                <div
                  role="listbox"
                  aria-label={
                    arriveAtMode
                      ? isFr
                        ? 'Heure d’arrivée cible'
                        : 'Target arrival schedule'
                      : isFr
                      ? 'Heure de départ'
                      : 'Departure schedule'
                  }
                  className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#161618] border border-ink/10 dark:border-white/10 rounded-pod shadow-xl p-2 z-50 space-y-1"
                >
                  <div
                    role="radiogroup"
                    aria-label={isFr ? 'Mode horaire' : 'Schedule mode'}
                    className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-pod mb-1.5"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={arriveAtMode}
                      onClick={() => {
                        setArriveAtMode(true);
                        if (departurePreset === 'tomorrow-08' || departurePreset === 'sat-0830') {
                          setDeparturePreset('tomorrow-09');
                          setCustomTime('09:00');
                        }
                      }}
                      className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        arriveAtMode
                          ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} shadow-xs`
                          : 'text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {isFr ? 'Arrivée à' : 'Arrive by'}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!arriveAtMode}
                      onClick={() => {
                        setArriveAtMode(false);
                        if (departurePreset === 'tomorrow-09' || departurePreset === 'weekday-09') {
                          setDeparturePreset('tomorrow-08');
                          setCustomTime('08:00');
                        }
                      }}
                      className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        !arriveAtMode
                          ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} shadow-xs`
                          : 'text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {isFr ? 'Départ à' : 'Depart at'}
                    </button>
                  </div>

                  {(arriveAtMode
                    ? [
                        {
                          id: 'tomorrow-09' as const,
                          label: isFr ? 'Demain · 09:00' : 'Tomorrow · 09:00',
                        },
                        {
                          id: 'weekday-09' as const,
                          label: isFr ? 'Prochain ouvré · 09:00' : 'Next weekday · 09:00',
                        },
                        {
                          id: 'today-next-hour' as const,
                          label: isFr ? `Aujourd'hui · ${nextHourSchedule.timeStr}` : `Today · ${nextHourSchedule.timeStr}`,
                        },
                      ]
                    : [
                        {
                          id: 'today-next-hour' as const,
                          label: isFr ? `Aujourd'hui · ${nextHourSchedule.timeStr}` : `Today · ${nextHourSchedule.timeStr}`,
                        },
                        {
                          id: 'tomorrow-08' as const,
                          label: isFr ? 'Demain · 08:00' : 'Tomorrow · 08:00',
                        },
                        {
                          id: 'sat-0830' as const,
                          label: isFr ? 'Sam · 08:30' : 'Sat · 08:30',
                        },
                      ]
                  ).map((item) => {
                    const selected = departurePreset === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDeparturePreset(item.id);
                          setOpenPopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 min-h-[44px] sm:min-h-[36px] rounded-xl text-sm cursor-pointer transition-colors ${
                          selected
                            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} font-semibold`
                            : 'text-ink hover:bg-pod'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="tnum">{item.label}</span>
                        </span>
                        {selected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}

                  <div className="pt-2 mt-1 border-t border-ink/10 dark:border-white/10 space-y-1.5 px-1">
                    <span className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                      {isFr ? 'Date & heure personnalisées' : 'Custom Date / Time'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        min={getLocalTodayIso()}
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                          setDeparturePreset('custom');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] px-2 rounded-xl bg-pod border border-ink/10 dark:border-white/10 text-base sm:text-xs tnum text-ink"
                      />
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => {
                          setCustomTime(e.target.value);
                          setDeparturePreset('custom');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] px-2 rounded-xl bg-pod border border-ink/10 dark:border-white/10 text-base sm:text-xs tnum text-ink"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span>{isFr ? 'à un rythme' : 'at a'}</span>

            {/* Pill 4: Pace */}
            <div className="relative inline-block">
              <button
                type="button"
                aria-expanded={openPopover === 'pace'}
                aria-haspopup="listbox"
                onClick={() => setOpenPopover(openPopover === 'pace' ? null : 'pace')}
                className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 sm:px-3.5 py-1 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-ink text-xs sm:text-base font-semibold transition-colors cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="tnum">{pacePillLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              {openPopover === 'pace' && (
                <div
                  role="listbox"
                  aria-label={isFr ? 'Allure cible' : 'Target pace'}
                  className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#161618] border border-ink/10 dark:border-white/10 rounded-pod shadow-xl p-2 z-50 space-y-1"
                >
                  {PACE_PRESETS.map((opt) => {
                    const selected = pacePreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPacePreset(opt.id);
                          setCustomSpeedKmH(opt.speedKmH);
                          setPaceManuallySet(true);
                          setOpenPopover(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 min-h-[44px] sm:min-h-[38px] rounded-xl text-sm cursor-pointer transition-colors ${
                          selected
                            ? `${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary} font-semibold`
                            : 'text-ink hover:bg-pod'
                        }`}
                      >
                        <div className="text-left">
                          <div>{isFr ? opt.labelFr : opt.labelEn}</div>
                          <div className="text-[11px] text-ink-muted font-normal">
                            {isFr ? opt.hintFr : opt.hintEn}
                          </div>
                        </div>
                        <span className="tnum text-xs font-bold">
                          {opt.speedKmH} km/h
                        </span>
                      </button>
                    );
                  })}

                  <div className="pt-2 mt-1 border-t border-ink/10 dark:border-white/10 px-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                      <span>{isFr ? 'Vitesse perso (10–45 km/h)' : 'Custom target speed'}</span>
                      <span className="tnum font-bold text-ink">{customSpeedKmH} km/h</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={45}
                      step={1}
                      value={customSpeedKmH}
                      onChange={(e) => {
                        setCustomSpeedKmH(Number(e.target.value));
                        setPacePreset('custom');
                        setPaceManuallySet(true);
                      }}
                      className="w-full peloton-slider accent-teal-600 dark:accent-teal-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {!isFr && <span>pace.</span>}
          </div>
        </div>

        {/* Optional Start/Destination Location + Vibe Pills + Build CTAs */}
        <div className="mt-4 pt-4 border-t border-dashed border-ink/15 dark:border-white/15 flex flex-col lg:flex-row lg:items-end gap-3 justify-between min-w-0">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div
              className={`grid grid-cols-1 gap-3 items-end min-w-0 ${
                showDestinationInput ? 'sm:grid-cols-2' : 'md:grid-cols-[minmax(220px,1fr)_auto]'
              }`}
            >
              <div className="relative z-30 focus-within:z-50 min-w-0">
                <LocationAutocompleteInput
                  id="quick-ride-start-location"
                  label={
                    showDestinationInput
                      ? isFr
                        ? 'Départ (A · optionnel)'
                        : 'Start (A · optional)'
                      : isFr
                      ? 'Départ (optionnel)'
                      : 'Start Location (optional)'
                  }
                  value={startLocationText}
                  placeholder={isFr ? 'Ville ou adresse (ex: Lyon, Annecy…)' : 'City or trailhead (e.g. Portland, Ghent…)'}
                  onChange={(val) => {
                    setStartLocationText(val);
                    setStartLocationCoords(null);
                  }}
                  onSelectLocation={(suggestion: LocationSuggestion) => {
                    setStartLocationText(suggestion.name);
                    setStartLocationCoords(suggestion.coordinates);
                  }}
                  onKeyDownEnter={() => {
                    void handleBuildFromComposer('dashboard');
                  }}
                />
              </div>

              {showDestinationInput && (
                <div className="relative z-20 focus-within:z-50">
                  <LocationAutocompleteInput
                    id="quick-ride-dest-location"
                    label={isFr ? 'Destination (B · optionnel)' : 'Destination (B · optional)'}
                    value={destLocationText}
                    biasCoords={startLocationCoords ?? undefined}
                    dropdownAlign="right"
                    placeholder={isFr ? 'Bureau, gare, adresse…' : 'Work, station, address…'}
                    onChange={(val) => {
                      setDestLocationText(val);
                      setDestLocationCoords(null);
                    }}
                    onSelectLocation={(suggestion: LocationSuggestion) => {
                      setDestLocationText(suggestion.name);
                      setDestLocationCoords(suggestion.coordinates);
                    }}
                    onKeyDownEnter={() => {
                      void handleBuildFromComposer('dashboard');
                    }}
                  />
                </div>
              )}

              {!showDestinationInput && vibeToggleGroup}
            </div>

            {showDestinationInput && vibeToggleGroup}
          </div>

          {/* Build Actions */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            <Button
              variant="secondary"
              size="md"
              loading={isBuilding === 'configurator'}
              disabled={Boolean(isBuilding)}
              onClick={() => {
                void handleBuildFromComposer('configurator');
              }}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[40px] px-4 rounded-full bg-pod hover:bg-chip text-ink border border-ink/10 dark:border-white/10 gap-1.5 font-semibold text-xs sm:text-[13px] cursor-pointer justify-center"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate">{isFr ? 'Affiner' : 'Fine-tune'}</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isBuilding === 'dashboard'}
              disabled={Boolean(isBuilding)}
              onClick={() => {
                void handleBuildFromComposer('dashboard');
              }}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[40px] px-4 sm:px-5 rounded-full gap-1.5 bg-volt hover:bg-[#E2E443] text-[#111111] ring-1 ring-inset ring-black/10 font-rounded font-bold text-xs sm:text-[13px] cursor-pointer justify-center"
            >
              <Bike className="w-4 h-4 shrink-0" />
              <span className="truncate">{isFr ? 'Créer mon plan' : 'Build Ride Plan'}</span>
              <ArrowRight className="w-4 h-4 shrink-0 hidden sm:inline" />
            </Button>
          </div>
        </div>

        {/* 1-Tap Ride Recipes */}
        <div className="mt-5 pt-4 border-t border-dashed border-ink/15 dark:border-white/15 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
              {isFr ? 'Recettes en 1 clic' : '1-Tap Ride Recipes'}
            </span>
            <span className="text-[11px] text-ink-muted">
              {isFr ? 'Ouvre le plan de sortie instantanément' : 'Launches straight into ride plan'}
            </span>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 -mx-4 px-4 scroll-pl-4 snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-2 xl:grid-cols-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
            {RIDE_RECIPES.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleLaunchRecipe(recipe)}
                className="group min-w-[215px] shrink-0 snap-start md:min-w-0 flex items-center justify-between gap-2 text-left min-h-[44px] px-3.5 py-2.5 rounded-pod bg-pod hover:bg-chip border border-ink/5 dark:border-white/5 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${CHIP_TOKENS.teal.surface} ${CHIP_TOKENS.teal.primary}`}
                  >
                    {renderRideTypeIcon(recipe.typeId, 'w-4 h-4')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">
                      {isFr ? recipe.titleFr : recipe.titleEn}
                    </div>
                    <div className="text-[11px] tnum text-ink-secondary truncate">
                      {isFr ? recipe.metaFr : recipe.metaEn}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </Collapsible>
    </section>
  );
};
