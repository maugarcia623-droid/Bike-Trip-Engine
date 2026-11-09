import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Clock,
  Path,
  Map as MapIcon,
  Flame,
  Flame2,
  Mountains,
  MapPin,
  Bicycle,
  BikeFast,
  Timer,
  CaretDown,
  CaretUp,
  CircleChevronDown,
  CircleChevronUp,
  ArrowsLeftRight,
  SlidersHorizontal,
  Upload,
  X,
  Check,
  BadgeInfo,
  Radar,
} from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { StageAmenity } from '../../types/amenities';
import { ResupplyRadarOverlay } from './ResupplyRadarOverlay';
import { RiderBikeSpecs } from '../../types/specs';
import { getActiveBike, loadRiderBikeSpecs } from '../../utils/specsStorage';
import { synthesizeRouteElevationProfile } from '../../utils/gpxParser';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { calculateDynamicCarbTarget } from '../../utils/nutrition';
import { Badge } from '../common/Badge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface HeroRouteCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  timelineResult: ReverseTimelineCalculation;
  meta: {
    name?: string;
    description?: string;
    gateName?: string;
  };
  heroBadge: string;
  heroTarget: string;
  heroTargetLabel: string;
  heroTargetValue: string;
  onUpdateTrip?: (updated: TripProfile) => void;
  riderSpecs?: RiderBikeSpecs;
  onSelectBike?: (bikeId: string) => void;
  onOpenSpecs?: () => void;
  onOpenConfigurator?: () => void;
  onUploadGpxFile?: (file: File) => void;
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  amenities?: StageAmenity[];
  selectedAmenity?: StageAmenity | null;
  onSelectAmenity?: (amenity: StageAmenity) => void;
  onTogglePinAmenity?: (amenity: StageAmenity) => void;
  onAmenitiesLoaded?: (amenities: StageAmenity[]) => void;
}

type ActiveHeroPopover = 'bike' | 'target' | 'route' | 'pace' | 'elevation' | null;

const ELEV_MATRIX_COLS = 38;
const ELEV_MATRIX_ROWS = 13;

function shiftTimeHHMM(timeStr: string, deltaMinutes: number): string {
  const [hRaw, mRaw] = (timeStr || '08:30').split(':');
  const h = parseInt(hRaw, 10) || 0;
  const m = parseInt(mRaw, 10) || 0;
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

function parseMinutesHHMM(timeStr: string): number {
  const [hRaw, mRaw] = (timeStr || '08:30').split(':');
  return (parseInt(hRaw, 10) || 0) * 60 + (parseInt(mRaw, 10) || 0);
}

export const DEFAULT_CORRIDOR: [number, number][] = [
  [47.2184, -1.5536],
  [47.2050, -1.6000],
  [47.2350, -1.7200],
  [47.2500, -1.8600],
  [47.2800, -2.0500],
  [47.2730, -2.1800],
  [47.2840, -2.2080],
];

function isValidLatLngTuple(coord: unknown): coord is [number, number] {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    typeof coord[0] === 'number' &&
    typeof coord[1] === 'number' &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  );
}

const formatTimeHHMM = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const padH = String(hrs).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');
  return `${padH}:${padM}`;
};

function getTileUrl(dark: boolean): string {
  return dark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
}

export const HeroRouteCard: React.FC<HeroRouteCardProps> = ({
  trip,
  physicsResult,
  timelineResult,
  meta,
  heroBadge,
  heroTarget,
  heroTargetLabel,
  heroTargetValue,
  onUpdateTrip,
  riderSpecs,
  onSelectBike,
  onOpenSpecs,
  onOpenConfigurator,
  onUploadGpxFile,
  onShareReceipt,
  onOpenFeedback,
  amenities,
  selectedAmenity,
  onSelectAmenity,
  onTogglePinAmenity,
  onAmenitiesLoaded,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const heroRootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lowerContentRef = useRef<HTMLDivElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const elevHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersGroupRef = useRef<L.FeatureGroup | null>(null);
  const amenityLayersGroupRef = useRef<L.FeatureGroup | null>(null);
  const amenityMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const vectorLayersRef = useRef<{
    casingLine?: L.Polyline;
    routeLine?: L.Polyline;
    loopCircle?: L.Circle;
    outerReachCircle?: L.Circle;
    startMarker?: L.Marker;
    endMarker?: L.Marker;
  }>({});

  const [activePopover, setActivePopover] = useState<ActiveHeroPopover>(null);
  const [isRadarOpen, setIsRadarOpen] = useState<boolean>(false);
  const [showMapDots, setShowMapDots] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cadence_show_map_amenity_dots');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleShowMapDots = () => {
    setShowMapDots((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cadence_show_map_amenity_dots', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [isElevationHovered, setIsElevationHovered] = useState<boolean>(false);
  const [hoveredElevCol, setHoveredElevCol] = useState<number | null>(null);

  const effectiveSpecs = riderSpecs || loadRiderBikeSpecs();
  const activeBike = getActiveBike(effectiveSpecs);
  const isInteractive = Boolean(onUpdateTrip);
  const isDepartAtMode = trip.arriveAtMode === false;
  const currentTargetGateTime = isDepartAtMode
    ? trip.departureTime || timelineResult.hardDepartureTime || '07:30'
    : trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';

  useEffect(() => {
    return () => {
      if (elevHoverTimeoutRef.current) {
        clearTimeout(elevHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activePopover) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (heroRootRef.current && !heroRootRef.current.contains(e.target as Node)) {
        setActivePopover(null);
        setIsElevationHovered(false);
        setHoveredElevCol(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
        setIsElevationHovered(false);
        setHoveredElevCol(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopover]);

  const handleNudgeTargetTime = (deltaMinutes: number) => {
    if (!onUpdateTrip) return;
    if (isDepartAtMode) {
      const baseDep = trip.departureTime || timelineResult.hardDepartureTime || '07:30';
      onUpdateTrip({
        ...trip,
        updatedAt: new Date().toISOString(),
        departureTime: shiftTimeHHMM(baseDep, deltaMinutes),
      });
      return;
    }
    const baseGate = trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';
    const baseShift = trip.office.shiftStartTime || baseGate;
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      office: {
        ...trip.office,
        targetGateArrivalTime: shiftTimeHHMM(baseGate, deltaMinutes),
        shiftStartTime: shiftTimeHHMM(baseShift, deltaMinutes),
      },
    });
  };

  const handleSetDirectTargetTime = (newTime: string) => {
    if (!onUpdateTrip || !newTime || !newTime.includes(':')) return;
    if (isDepartAtMode) {
      onUpdateTrip({
        ...trip,
        updatedAt: new Date().toISOString(),
        departureTime: newTime,
      });
      return;
    }
    const baseGate = trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';
    const baseShift = trip.office.shiftStartTime || baseGate;
    const delta = parseMinutesHHMM(newTime) - parseMinutesHHMM(baseGate);
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      office: {
        ...trip.office,
        targetGateArrivalTime: newTime,
        shiftStartTime: shiftTimeHHMM(baseShift, delta),
      },
    });
  };

  const handleToggleChronometryMode = () => {
    if (!onUpdateTrip) return;
    const nextArriveAt = !isDepartAtMode ? false : true;
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      arriveAtMode: nextArriveAt,
      departureTime: nextArriveAt
        ? trip.departureTime
        : trip.departureTime || timelineResult.hardDepartureTime,
      office: nextArriveAt
        ? {
            ...trip.office,
            targetGateArrivalTime: timelineResult.gateArrivalTime,
            shiftStartTime: timelineResult.shiftStartTime,
          }
        : trip.office,
    });
  };

  const handleFlipRouteDirection = () => {
    if (!onUpdateTrip) return;
    const prevOrigin = trip.route.origin || 'Nord-sur-Erdre';
    const prevDest = trip.route.destination || meta.gateName || 'Redon';
    const nextCoords = (
      trip.route.coordinates && trip.route.coordinates.length > 0
        ? [...trip.route.coordinates]
        : [...DEFAULT_CORRIDOR]
    ).reverse() as [number, number][];

    const hasMeasurableWind = (trip.weather.baseWindSpeedKmH || 0) > 2;
    const nextEffectiveHeadwind =
      typeof trip.weather.effectiveHeadwindKmH === 'number'
        ? Number((-trip.weather.effectiveHeadwindKmH).toFixed(1))
        : undefined;
    const nextHeadwind =
      nextEffectiveHeadwind !== undefined
        ? nextEffectiveHeadwind > 2
        : hasMeasurableWind
        ? !trip.weather.isHeadwindActive
        : trip.weather.isHeadwindActive;
    const nextWindDir =
      nextEffectiveHeadwind !== undefined
        ? nextEffectiveHeadwind > 2
          ? 'headwind'
          : nextEffectiveHeadwind < -2
          ? 'tailwind'
          : 'calm'
        : hasMeasurableWind
        ? nextHeadwind
          ? 'headwind'
          : 'tailwind'
        : trip.weather.windDirection;

    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      route: {
        ...trip.route,
        origin: prevDest,
        destination: prevOrigin,
        coordinates: nextCoords,
      },
      weather: {
        ...trip.weather,
        windDirectionDegrees: ((trip.weather.windDirectionDegrees || 0) + 180) % 360,
        effectiveHeadwindKmH: nextEffectiveHeadwind,
        isHeadwindActive: nextHeadwind,
        windDirection: nextWindDir,
      },
    });
  };

  const isRadiusMode =
    trip.route.routeMode === 'manual-radius' ||
    Boolean(trip.route.radiusMeters && trip.route.radiusMeters > 0);

  const sanitizedCoords = useMemo<[number, number][]>(() => {
    return Array.isArray(trip.route.coordinates)
      ? trip.route.coordinates.filter(isValidLatLngTuple)
      : [];
  }, [trip.route.coordinates]);

  const radiusCenter = useMemo<[number, number]>(() => {
    return isValidLatLngTuple(trip.route.originCoords)
      ? trip.route.originCoords
      : sanitizedCoords.length > 0
      ? sanitizedCoords[0]
      : [47.2186, -1.5541];
  }, [trip.route.originCoords, sanitizedCoords]);

  const loopRadiusMeters = useMemo(() => {
    return typeof trip.route.radiusMeters === 'number' &&
      Number.isFinite(trip.route.radiusMeters) &&
      trip.route.radiusMeters > 0
      ? trip.route.radiusMeters
      : Math.max(1000, Math.round(((trip.route.distanceKm || 30) / 2) * 1000));
  }, [trip.route.radiusMeters, trip.route.distanceKm]);

  const activeCoordinates = useMemo<[number, number][]>(() => {
    return sanitizedCoords.length > 0 ? sanitizedCoords : DEFAULT_CORRIDOR;
  }, [sanitizedCoords]);

  const routeFingerprint = useMemo(() => {
    if (isRadiusMode) {
      return `radius:${radiusCenter[0].toFixed(5)},${radiusCenter[1].toFixed(5)}:${loopRadiusMeters}`;
    }
    const len = activeCoordinates.length;
    const start =
      len > 0 ? `${activeCoordinates[0][0].toFixed(5)},${activeCoordinates[0][1].toFixed(5)}` : '';
    const end =
      len > 1
        ? `${activeCoordinates[len - 1][0].toFixed(5)},${activeCoordinates[len - 1][1].toFixed(5)}`
        : '';
    return `corridor:${len}:${start}:${end}`;
  }, [isRadiusMode, radiusCenter, loopRadiusMeters, activeCoordinates]);

  const handleSetDistanceKm = (nextDistanceRaw: number) => {
    if (!onUpdateTrip || Number.isNaN(nextDistanceRaw)) return;
    const clampedKm = Math.max(2, Math.min(350, Math.round(nextDistanceRaw * 10) / 10));
    const oldKm = Math.max(1, trip.route.distanceKm || 1);
    const oldElev = trip.route.elevationGainM ?? Math.round(oldKm * 6.6);
    const scaledElev = Math.max(0, Math.round(oldElev * (clampedKm / oldKm)));
    const nextLoopKm = Math.round((clampedKm / 2) * 10) / 10;
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      route: {
        ...trip.route,
        distanceKm: clampedKm,
        elevationGainM: scaledElev,
        ...(isRadiusMode
          ? {
              radiusMeters: Math.max(1000, Math.round((clampedKm / 2) * 1000)),
              destination: isFr
                ? `Rayon boucle ${nextLoopKm} km`
                : `${nextLoopKm} km loop radius`,
            }
          : {}),
      },
    });
  };

  const handleUpdatePacing = (patch: Partial<TripProfile['route']>) => {
    if (!onUpdateTrip) return;
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      route: {
        ...trip.route,
        ...patch,
      },
    });
  };


  const movingMinutes = timelineResult?.pureMovingMinutes ?? 48;
  const bufferMinutes = timelineResult?.bufferMinutes ?? 18;
  const totalElapsedMinutes = movingMinutes + bufferMinutes;
  const totalKcal = Math.round(physicsResult.totalKcalBurn || 832).toLocaleString(
    isFr ? 'fr-FR' : 'en-US'
  );

  const dynamicCarb = useMemo(() => {
    return calculateDynamicCarbTarget(
      movingMinutes / 60,
      physicsResult?.ftpPercent ?? 72,
      physicsResult?.carbOxidationGramPerHour ?? Math.round((effectiveSpecs.carbTargetGPerHr ?? 60) * 1.8),
      effectiveSpecs.carbTargetGPerHr ?? 60,
      trip.stages?.length || 1,
      trip.customChips || []
    );
  }, [
    movingMinutes,
    physicsResult?.ftpPercent,
    physicsResult?.carbOxidationGramPerHour,
    effectiveSpecs.carbTargetGPerHr,
    trip.stages?.length,
    trip.customChips,
  ]);

  const elevationData = useMemo(() => synthesizeRouteElevationProfile(trip.route), [trip.route]);
  const terrainSummary = elevationData.terrainSummary;

  const elevationColumns = useMemo(() => {
    const pts = elevationData.elevationProfile;
    if (!pts || pts.length === 0) {
      return Array.from({ length: ELEV_MATRIX_COLS }, (_, idx) => ({
        distKm: Number((((idx / (ELEV_MATRIX_COLS - 1)) * (trip.route.distanceKm || 30))).toFixed(1)),
        eleM: 20,
        gradePct: 0,
        filledRows: 4,
      }));
    }

    const totalDist = Math.max(0.5, pts[pts.length - 1].distKm || trip.route.distanceKm || 30);
    const sampled: { distKm: number; eleM: number; gradePct: number }[] = [];
    let cursor = 0;

    for (let c = 0; c < ELEV_MATRIX_COLS; c++) {
      const targetDist = (c / (ELEV_MATRIX_COLS - 1)) * totalDist;
      while (cursor < pts.length - 2 && pts[cursor + 1].distKm < targetDist) {
        cursor++;
      }
      const p0 = pts[cursor];
      const p1 = pts[Math.min(pts.length - 1, cursor + 1)];
      const span = p1.distKm - p0.distKm;
      const ratio = span > 0.0001 ? Math.max(0, Math.min(1, (targetDist - p0.distKm) / span)) : 0;
      sampled.push({
        distKm: targetDist,
        eleM: p0.eleM + (p1.eleM - p0.eleM) * ratio,
        gradePct: p0.gradePct + (p1.gradePct - p0.gradePct) * ratio,
      });
    }

    let minEle = sampled[0].eleM;
    let maxEle = sampled[0].eleM;
    for (const s of sampled) {
      if (s.eleM < minEle) minEle = s.eleM;
      if (s.eleM > maxEle) maxEle = s.eleM;
    }
    const eleSpan = maxEle - minEle;

    return sampled.map((s) => {
      const filledRows =
        eleSpan < 1.5
          ? 4
          : Math.max(
              2,
              Math.min(
                ELEV_MATRIX_ROWS - 2,
                Math.round(2 + ((s.eleM - minEle) / eleSpan) * (ELEV_MATRIX_ROWS - 4))
              )
            );
      return {
        ...s,
        filledRows,
      };
    });
  }, [elevationData.elevationProfile, trip.route.distanceKm]);

  const elevationGainM =
    trip.route.elevationGainM ?? (trip.route.distanceKm ? Math.round(trip.route.distanceKm * 6.6) : 145);
  const maxGradientPercent =
    typeof trip.route.terrainSummary?.maxGradePct === 'number' && trip.route.terrainSummary.maxGradePct > 0
      ? trip.route.terrainSummary.maxGradePct.toFixed(1)
      : terrainSummary.maxGradePct > 0
      ? terrainSummary.maxGradePct.toFixed(1)
      : trip.physics.gradientPercent
      ? (trip.physics.gradientPercent * 14).toFixed(1)
      : '4.2';

  const surfaceLabel =
    terrainSummary.surfaceLabel === 'gravel'
      ? isFr
        ? 'Chemins & Gravel'
        : 'Gravel & Trail'
      : terrainSummary.surfaceLabel === 'mixed'
      ? isFr
        ? 'Voie verte & Bitume'
        : 'Cycleway & Mixed'
      : isFr
      ? 'Asphalte / Route'
      : 'Paved Road';

  const difficultyLabel =
    terrainSummary.difficultyLevel === 'alpine'
      ? isFr
        ? 'Montagne / Exigeant'
        : 'Alpine / Steep'
      : terrainSummary.difficultyLevel === 'challenging'
      ? isFr
        ? 'Sportif / Vallonné'
        : 'Challenging'
      : terrainSummary.difficultyLevel === 'moderate'
      ? isFr
        ? 'Modéré'
        : 'Moderate'
      : isFr
      ? 'Facile & Roulant'
      : 'Easy & Smooth';

  const showElevationOverlay =
    activePopover === 'elevation' || (isElevationHovered && activePopover === null);
  const hoveredElevPoint =
    hoveredElevCol !== null && elevationColumns[hoveredElevCol]
      ? elevationColumns[hoveredElevCol]
      : null;

  const targetShortLabel = (() => {
    const raw = heroTargetLabel.toLowerCase();
    if (raw.includes('camp') || raw.includes('bivouac') || raw.includes('cutoff')) return isFr ? 'bivouac' : 'cutoff';
    if (raw.includes('shift') || raw.includes('poste')) return isFr ? 'poste' : 'shift';
    if (raw.includes('finish') || raw.includes('fin')) return isFr ? 'arrivée' : 'finish';
    if (raw.includes('check-in') || raw.includes('hôtel')) return isFr ? 'hôtel' : 'hotel';
    return heroTargetLabel.split(' ')[0].toLowerCase();
  })();

  const { theme, isDark: themeIsDark } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  );

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, [theme, themeIsDark]);

  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const latestRouteRef = useRef({
    isRadiusMode,
    radiusCenter,
    activeCoordinates,
    loopRadiusMeters,
  });

  useEffect(() => {
    latestRouteRef.current = {
      isRadiusMode,
      radiusCenter,
      activeCoordinates,
      loopRadiusMeters,
    };
  }, [isRadiusMode, radiusCenter, activeCoordinates, loopRadiusMeters]);

  const fitRouteInClearArea = (
    radiusMode: boolean = latestRouteRef.current.isRadiusMode,
    center: [number, number] = latestRouteRef.current.radiusCenter,
    coords: [number, number][] = latestRouteRef.current.activeCoordinates
  ) => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;
    try {
      const { outerReachCircle, routeLine } = vectorLayersRef.current;
      const bounds = radiusMode
        ? outerReachCircle?.getBounds()
        : routeLine?.getBounds() || routeLayersGroupRef.current?.getBounds();

      if (!bounds || !bounds.isValid()) return;

      if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
        mapInstanceRef.current.setView(bounds.getCenter(), 12, { animate: false });
        return;
      }

      const containerH = mapContainerRef.current.clientHeight || 480;
      const lowerH = lowerContentRef.current?.offsetHeight || 240;
      const isNarrow = window.innerWidth < 640;
      const padX = isNarrow ? 24 : 40;
      const padTop = isNarrow ? 48 : 44;
      const maxBottomPad = Math.max(120, containerH - padTop - 64);
      const padBottom = Math.min(maxBottomPad, Math.max(160, lowerH + (isNarrow ? 20 : 28)));
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [padX, padTop],
        paddingBottomRight: [padX, padBottom],
        maxZoom: 13,
        animate: false,
      });
    } catch {
      mapInstanceRef.current.setView(
        radiusMode ? center : coords[0] || [47.2184, -1.5536],
        11,
        { animate: false }
      );
    }
  };

  const updateVectorLayers = (
    currentDark: boolean,
    radiusMode: boolean = latestRouteRef.current.isRadiusMode,
    center: [number, number] = latestRouteRef.current.radiusCenter,
    coords: [number, number][] = latestRouteRef.current.activeCoordinates,
    radiusMeters: number = latestRouteRef.current.loopRadiusMeters
  ) => {
    const map = mapInstanceRef.current;
    const group = routeLayersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const startIcon = L.divIcon({
      className: 'custom-hero-start-marker',
      html: `
        <div style="position: relative; width: 14px; height: 14px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(0, 122, 255, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #007AFF; width: 14px; height: 14px; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(0, 122, 255, 0.8);"></div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const endIcon = L.divIcon({
      className: 'custom-hero-end-marker',
      html: `
        <div style="background-color: #FF3B30; width: 13px; height: 13px; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(255, 59, 48, 0.8);"></div>
      `,
      iconSize: [13, 13],
      iconAnchor: [6.5, 6.5],
    });

    if (radiusMode) {
      const startMarker = L.marker(center, { icon: startIcon });
      const outerReachCircle = L.circle(center, {
        radius: radiusMeters * 2,
        color: currentDark ? '#94A3B8' : '#52525B',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: currentDark ? '#38BDF8' : '#10B981',
        fillOpacity: 0.03,
      });

      const loopCircle = L.circle(center, {
        radius: radiusMeters,
        color: currentDark ? '#38BDF8' : '#10B981',
        weight: 2.6,
        fillColor: currentDark ? '#38BDF8' : '#10B981',
        fillOpacity: currentDark ? 0.14 : 0.16,
      });

      group.addLayer(startMarker);
      group.addLayer(outerReachCircle);
      group.addLayer(loopCircle);

      vectorLayersRef.current = {
        outerReachCircle,
        loopCircle,
        startMarker,
      };
    } else {
      const casingLine = L.polyline(coords, {
        color: currentDark ? '#007AFF' : '#111111',
        weight: currentDark ? 7 : 5,
        opacity: currentDark ? 0.35 : 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const routeLine = L.polyline(coords, {
        color: currentDark ? '#38BDF8' : '#F2F455',
        weight: 3.2,
        opacity: 1,
        dashArray: currentDark ? undefined : '7, 5',
        lineCap: 'round',
        lineJoin: 'round',
      });

      group.addLayer(casingLine);
      group.addLayer(routeLine);

      let startMarker: L.Marker | undefined;
      let endMarker: L.Marker | undefined;

      if (coords.length > 0) {
        startMarker = L.marker(coords[0], { icon: startIcon });
        group.addLayer(startMarker);
        if (coords.length > 1) {
          endMarker = L.marker(coords[coords.length - 1], { icon: endIcon });
          group.addLayer(endMarker);
        }
      }

      vectorLayersRef.current = {
        casingLine,
        routeLine,
        startMarker,
        endMarker,
      };
    }

    fitRouteInClearArea(radiusMode, center, coords);
  };

  // 1. Initialize Leaflet map once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const {
      isRadiusMode: rMode,
      radiusCenter: rCenter,
      activeCoordinates: aCoords,
      loopRadiusMeters: rMeters,
    } = latestRouteRef.current;

    const initialCenter: [number, number] = rMode
      ? rCenter
      : aCoords[0] || [47.2184, -1.5536];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });

    mapInstanceRef.current = map;

    const isDark = document.documentElement.classList.contains('dark');

    const tileLayer = L.tileLayer(getTileUrl(isDark), {
      maxZoom: 16,
      attribution: 'Esri',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const vectorGroup = L.featureGroup().addTo(map);
    routeLayersGroupRef.current = vectorGroup;

    const amenityGroup = L.featureGroup().addTo(map);
    amenityLayersGroupRef.current = amenityGroup;

    updateVectorLayers(isDark, rMode, rCenter, aCoords, rMeters);

    const resizeObserver = new ResizeObserver(() => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize();
      const current = latestRouteRef.current;
      fitRouteInClearArea(current.isRadiusMode, current.radiusCenter, current.activeCoordinates);
    });
    resizeObserver.observe(mapContainerRef.current);

    const initFitTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        const current = latestRouteRef.current;
        fitRouteInClearArea(current.isRadiusMode, current.radiusCenter, current.activeCoordinates);
      }
    }, 250);

    return () => {
      clearTimeout(initFitTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayersGroupRef.current = null;
      amenityLayersGroupRef.current = null;
      amenityMarkersMapRef.current.clear();
      vectorLayersRef.current = {};
    };
  }, []);

  // 2. Update vector route layers ONLY when route geometry/mode changes
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!mapInstanceRef.current || !routeLayersGroupRef.current) return;
    updateVectorLayers(
      isDarkMode,
      isRadiusMode,
      radiusCenter,
      activeCoordinates,
      loopRadiusMeters
    );
  }, [routeFingerprint]);

  // 3. Update map tiles & layer styles when theme changes (no map recreation)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(getTileUrl(isDarkMode));
    }
    const current = vectorLayersRef.current;
    if (current.casingLine && current.routeLine) {
      current.casingLine.setStyle({
        color: isDarkMode ? '#007AFF' : '#111111',
        weight: isDarkMode ? 7 : 5,
        opacity: isDarkMode ? 0.35 : 0.85,
      });
      current.routeLine.setStyle({
        color: isDarkMode ? '#38BDF8' : '#F2F455',
        dashArray: isDarkMode ? undefined : '7, 5',
      });
    }
    if (current.loopCircle && current.outerReachCircle) {
      current.loopCircle.setStyle({
        color: isDarkMode ? '#38BDF8' : '#10B981',
        fillColor: isDarkMode ? '#38BDF8' : '#10B981',
        fillOpacity: isDarkMode ? 0.14 : 0.16,
      });
      current.outerReachCircle.setStyle({
        color: isDarkMode ? '#94A3B8' : '#52525B',
        fillColor: isDarkMode ? '#38BDF8' : '#10B981',
      });
    }
  }, [isDarkMode]);

  // 4. Update amenity markers when amenities or pinned stops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = amenityLayersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    amenityMarkersMapRef.current.clear();

    if (!showMapDots) {
      return;
    }

    const allAmenities = [...(amenities || [])];
    if (trip.pinnedAmenities) {
      for (const pinned of trip.pinnedAmenities) {
        if (!allAmenities.some((a) => a.id === pinned.id)) {
          allAmenities.push(pinned);
        }
      }
    }

    if (allAmenities.length === 0) return;

    const pinnedIds = new Set((trip.pinnedAmenities || []).map((p) => p.id));

    allAmenities.forEach((amenity) => {
      const isPinned = pinnedIds.has(amenity.id) || Boolean(amenity.isPinned);

      const symbol =
        amenity.category === 'water'
          ? '💧'
          : amenity.category === 'cemetery'
          ? '🪦'
          : amenity.category === 'food'
          ? '🥖'
          : '🔧';

      const catBg =
        amenity.category === 'water'
          ? '#0284c7'
          : amenity.category === 'cemetery'
          ? '#7c3aed'
          : amenity.category === 'food'
          ? '#d97706'
          : '#0d9488';

      const catLabel =
        amenity.category === 'water'
          ? (isFr ? 'Point d\'eau' : 'Water Tap')
          : amenity.category === 'cemetery'
          ? (isFr ? 'Cimetière' : 'Cemetery')
          : amenity.category === 'food'
          ? (isFr ? 'Ravitaillement' : 'Food')
          : (isFr ? 'Atelier vélo' : 'Bike Repair');

      const html = isPinned
        ? `<div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(242, 244, 85, 0.45); box-shadow: 0 0 10px rgba(242, 244, 85, 0.85); animation: pulse 2s infinite;"></div>
            <div style="background-color: #F2F455; width: 26px; height: 26px; border-radius: 9999px; border: 2.5px solid #111111; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
              ${symbol}
            </div>
          </div>`
        : `<div style="width: 20px; height: 20px; border-radius: 9999px; background-color: ${catBg}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.25); cursor: pointer;">
            ${symbol}
          </div>`;

      const icon = L.divIcon({
        className: `custom-amenity-${amenity.category}-${isPinned ? 'pinned' : 'unpinned'}`,
        html,
        iconSize: isPinned ? [28, 28] : [20, 20],
        iconAnchor: isPinned ? [14, 14] : [10, 10],
      });

      const marker = L.marker([amenity.lat, amenity.lon], { icon });

      const popupHtml = `
        <div style="padding: 4px; font-family: ui-sans-serif, system-ui, sans-serif; min-width: 160px; line-height: 1.3;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${catBg}; letter-spacing: 0.5px;">
              ${catLabel}
            </span>
            <span style="font-size: 10px; font-weight: 700; background: #eee; color: #111; padding: 1px 6px; border-radius: 9999px; font-variant-numeric: tabular-nums;">
              KM ${amenity.routeKm}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #111; margin-bottom: 3px;">
            ${amenity.name}
          </div>
          <div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: space-between;">
            <span>${amenity.detourMeters < 75 ? (isFr ? 'Sur la trace' : 'On route') : `+${amenity.detourMeters}m detour`}</span>
            ${isPinned ? `<span style="font-weight: 800; color: #4d5200; background: #f2f455; padding: 1px 4px; border-radius: 4px;">${isFr ? 'Épinglé' : 'Pinned'}</span>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'cadence-amenity-popup',
      });

      marker.on('click', () => {
        onSelectAmenity?.(amenity);
      });

      group.addLayer(marker);
      amenityMarkersMapRef.current.set(amenity.id, marker);
    });
  }, [amenities, trip.pinnedAmenities, isFr, isDarkMode, showMapDots]);

  // 5. Center map and open popup when selectedAmenity changes
  useEffect(() => {
    if (!selectedAmenity || !mapInstanceRef.current) return;
    const marker = amenityMarkersMapRef.current.get(selectedAmenity.id);
    mapInstanceRef.current.panTo([selectedAmenity.lat, selectedAmenity.lon], { animate: true });
    if (marker) {
      marker.openPopup();
    }
  }, [selectedAmenity]);

  const currentWatts = Math.round(
    trip.route.pacingMode === 'effort'
      ? trip.route.targetEffortWatts || 160
      : physicsResult.legWatts || 160
  );
  const wattsDidacticNote =
    currentWatts < 140
      ? isFr
        ? 'Allure balade : conversation fluide sans essoufflement.'
        : 'Easy cruise: effortless breathing, full conversation pace.'
      : currentWatts < 200
      ? isFr
        ? 'Allure endurance : effort régulier soutenable plusieurs heures.'
        : 'Endurance tempo: steady pressure you can hold for hours.'
      : isFr
      ? 'Effort soutenu : respiration marquée, sollicitation musculaire élevée.'
      : 'Punchy effort: deep breathing, strong muscular engagement.';

  return (
    <div
      ref={heroRootRef}
      className="relative rounded-card bg-card text-ink border border-ink/5 dark:border-white/5 transition-colors shadow-sm min-h-[460px] sm:min-h-[490px] lg:min-h-[520px]"
    >
      <div className="absolute inset-0 z-0 rounded-card overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[460px] sm:min-h-[490px] lg:min-h-[520px] bg-[#E5E3DD] dark:bg-[#121214] dark:[filter:brightness(0.82)_contrast(1.22)_saturate(1.15)]"
          />
        </div>

        <div
          className="absolute inset-0 z-1 pointer-events-none transition-colors"
          style={{
            background: isDarkMode
              ? 'linear-gradient(to bottom, rgba(10, 10, 11, 0) 0%, rgba(10, 10, 11, 0) 35%, rgba(10, 10, 11, 0.45) 50%, rgba(10, 10, 11, 0.9) 70%, rgba(10, 10, 11, 1) 100%)'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.92) 70%, rgba(255, 255, 255, 1) 100%)',
          }}
        />
      </div>

      <div className="relative z-20 p-4 flex flex-col justify-between min-h-[460px] sm:min-h-[490px] lg:min-h-[520px] pointer-events-none">
        <div className="relative z-30 flex items-center justify-start gap-2 mb-32 sm:mb-20 lg:mb-20 pointer-events-none">
          {/* ── MINI DYNAMIC ISLAND PILL (1:1 ICON BUTTONS: ROUTE, RESUPPLY RADAR, BIKE SPECS) ── */}
          <div className="relative inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-card dark:bg-[#161618] text-ink dark:text-white border border-ink/10 dark:border-white/15 shadow-sm sm:shadow-md pointer-events-auto select-none transition-colors">
            {/* 1. Route Direction / Flip Button (1:1 format, icon only) */}
            <button
              type="button"
              disabled={!isInteractive}
              onClick={
                isInteractive
                  ? isRadiusMode
                    ? () => setActivePopover((prev) => (prev === 'route' ? null : 'route'))
                    : handleFlipRouteDirection
                  : undefined
              }
              aria-label={
                isRadiusMode
                  ? t('heroQuickRouteTitle')
                  : `${t('heroFlipReturnBtn')} — ${trip.route.origin || 'Nord-sur-Erdre'} ⇄ ${trip.route.destination || meta.gateName || 'Redon'}`
              }
              title={
                isRadiusMode
                  ? t('radiusLoopReachSub', {
                      loop: Math.round((loopRadiusMeters / 1000) * 10) / 10,
                      oneWay: trip.route.distanceKm,
                    })
                  : `${trip.route.origin || 'Nord-sur-Erdre'} ⇄ ${trip.route.destination || meta.gateName || 'Redon'} (${t('heroFlipReturnBtn')})`
              }
              className={`relative w-8 h-8 sm:w-8.5 sm:h-8.5 aspect-square rounded-full flex items-center justify-center transition-all duration-150 select-none active:scale-95 shrink-0 ${
                isRadiusMode && activePopover === 'route'
                  ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                  : `hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
              } ${isInteractive ? 'cursor-pointer' : 'opacity-60 cursor-default'} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              {isRadiusMode ? (
                <Path className="w-4 h-4 text-current" />
              ) : (
                <ArrowsLeftRight className="w-4 h-4 text-current transition-transform duration-200 active:-rotate-180" />
              )}
            </button>

            {/* 2. Corridor Resupply Radar Button (1:1 format, icon only) */}
            <button
              type="button"
              onClick={() => setIsRadarOpen((prev) => !prev)}
              aria-expanded={isRadarOpen}
              aria-label={t('resupplyRadarTitle')}
              title={`${t('resupplyRadarTitle')}${
                trip.pinnedAmenities && trip.pinnedAmenities.length > 0
                  ? ` (${trip.pinnedAmenities.length} ${t('pinnedStop')})`
                  : ''
              }`}
              className={`relative w-8 h-8 sm:w-8.5 sm:h-8.5 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 ${
                isRadarOpen || (trip.pinnedAmenities && trip.pinnedAmenities.length > 0)
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : `hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
              } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Radar className="w-4 h-4 text-current" />
              {trip.pinnedAmenities && trip.pinnedAmenities.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-volt text-[#111111] font-rounded font-extrabold text-[10px] leading-none flex items-center justify-center shadow-xs ring-1 ring-card tnum">
                  {trip.pinnedAmenities.length}
                </span>
              )}
            </button>

            {/* 3. Rider Bike Garage Button (1:1 format, icon only) */}
            <button
              type="button"
              onClick={() => {
                if (effectiveSpecs && activeBike) {
                  setActivePopover((prev) => (prev === 'bike' ? null : 'bike'));
                } else if (onOpenSpecs) {
                  onOpenSpecs();
                }
              }}
              aria-expanded={activePopover === 'bike'}
              aria-label={t('heroBikeSwitchAria')}
              title={
                activeBike
                  ? `${activeBike.name} · ${activeBike.weightKg}kg · ${activeBike.isTubeless ? 'TL' : 'Tube'} (${t('heroBikeSwitchAria')})`
                  : t('heroBikeSwitchAria')
              }
              className={`relative w-8 h-8 sm:w-8.5 sm:h-8.5 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 ${
                activePopover === 'bike'
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : `hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
              } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Bicycle className="w-4 h-4 text-current shrink-0" />
            </button>

            {/* ── Bike Garage Popover (anchored to the mini dynamic island pill, above all lower content) ── */}
            {activePopover === 'bike' && effectiveSpecs && activeBike && (
              <>
                {/* Full-screen click-outside dismiss shield */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setActivePopover(null)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 z-50 rounded-pod p-3 bg-card dark:bg-[#161618] border border-ink/15 dark:border-white/20 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      {t('bikeGarageHeading', { count: effectiveSpecs.bikes.length })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {effectiveSpecs.bikes.map((bike) => {
                      const selected = bike.id === activeBike.id;
                      return (
                        <button
                          key={bike.id}
                          type="button"
                          onClick={() => {
                            onSelectBike?.(bike.id);
                            setActivePopover(null);
                          }}
                          className={`w-full rounded-full px-4 py-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            selected
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                              : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold break-words leading-tight">{bike.name}</div>
                            <div className="text-[10px] font-mono tnum opacity-80 mt-0.5">
                              {bike.weightKg}kg · {bike.isTubeless ? 'Tubeless' : 'Tube'} · CdA {bike.cda}
                            </div>
                          </div>
                          {selected && <Check className="w-3.5 h-3.5 shrink-0 text-current" />}
                        </button>
                      );
                    })}
                  </div>

                  {onOpenSpecs && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopover(null);
                        onOpenSpecs();
                      }}
                      className={`mt-2.5 w-full h-8 px-3 rounded-full bg-pod hover:bg-chip flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
                      <span>{t('heroManageGarageBtn')}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div ref={lowerContentRef} className="mt-auto flex flex-col gap-3.5 sm:gap-4 pointer-events-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 min-w-0">
            <div className="max-w-3xl min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-ink leading-tight break-words">
                {meta.name || trip.name || t('defaultTripName')}
              </h1>
              <p className="text-[13px] sm:text-sm text-ink-secondary mt-1 leading-relaxed max-w-2xl">
                {meta.description || trip.description || t('defaultTripDesc')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
              {(() => {
                const isSportTrip =
                  (trip.tag || '').toUpperCase().includes('SPORT') ||
                  (trip.tag || '').toUpperCase().includes('FONDO') ||
                  heroBadge.toLowerCase().includes('fondo');
                return (
                  <Badge
                    variant="emerald"
                    size="md"
                    icon={isSportTrip ? BikeFast : undefined}
                    dot={!isSportTrip}
                    className="py-1.5 px-3 sm:px-3.5"
                  >
                    {heroBadge}
                  </Badge>
                );
              })()}

              <Badge variant="rose" size="md" icon={MapPin} className="py-1.5 px-3 sm:px-3.5">
                {heroTarget}
              </Badge>

              <Badge variant="yellow-vest" size="md" className="py-1.5 px-3 sm:px-3.5">
                {trip.tag || 'BIKEPACKING'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. Trip Start Time (Hard rollout) */}
            <div className="relative col-span-2 sm:col-span-1">
              {activePopover === 'target' && isInteractive && (
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] border border-ink/10 dark:border-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-ink">
                      {isDepartAtMode ? t('rolloutTimeLabel') : t('heroQuickTargetTitle')}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleToggleChronometryMode}
                        className="px-2 py-0.5 rounded-full bg-pod hover:bg-chip text-[10px] font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                      >
                        {isDepartAtMode
                          ? isFr
                            ? 'Mode Arrivée'
                            : 'Arrive mode'
                          : isFr
                          ? 'Mode Départ'
                          : 'Depart mode'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        aria-label={t('closeModalAria')}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="time"
                      value={currentTargetGateTime}
                      onChange={(e) => handleSetDirectTargetTime(e.target.value)}
                      className="flex-1 h-9 px-3.5 rounded-full bg-pod text-ink font-mono font-bold text-sm tnum border border-ink/10 dark:border-white/10 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[-30, -15, 15, 30].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => handleNudgeTargetTime(delta)}
                        className="h-8 rounded-full bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum transition-colors cursor-pointer"
                      >
                        {delta > 0 ? `+${delta} min` : `${delta} min`}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-ink-muted leading-snug tnum">
                    {t('heroQuickTargetHint', { rollout: timelineResult.hardDepartureTime })}
                  </p>
                </div>
              )}

              <div
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-expanded={isInteractive ? activePopover === 'target' : undefined}
                title={isInteractive ? t('heroClickToTweakHint') : undefined}
                onClick={
                  isInteractive
                    ? () => setActivePopover((prev) => (prev === 'target' ? null : 'target'))
                    : undefined
                }
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActivePopover((prev) => (prev === 'target' ? null : 'target'));
                        }
                      }
                    : undefined
                }
                className={`h-full rounded-pod p-3.5 sm:p-4.5 flex flex-col justify-between min-h-[100px] sm:min-h-[114px] transition-all hover:brightness-[0.98] dark:hover:brightness-110 ${
                  isInteractive ? 'cursor-pointer select-none group' : ''
                } bg-[#faffcb] dark:bg-[#1f2203] ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-semibold shrink-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS['yellow-vest'].dot}`} />
                    <span className="break-words font-bold">{t('hardRollout')}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 text-current transition-transform ${
                          activePopover === 'target' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                    <Clock className="w-4 h-4 text-current shrink-0" />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-row sm:flex-col xl:flex-row items-baseline sm:items-start xl:items-baseline justify-between gap-1 min-w-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-extrabold tracking-tight tnum leading-none shrink-0">
                    {timelineResult.hardDepartureTime}
                  </span>
                  <span
                    className="text-[11px] font-bold tnum break-words sm:w-full xl:w-auto text-right sm:text-left xl:text-right min-w-0 leading-tight"
                    title={`${heroTargetLabel} ${heroTargetValue}`}
                  >
                    {heroTargetValue ? `${heroTargetValue} ${targetShortLabel}` : '09:00'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trip Length */}
            <div className="relative">
              {activePopover === 'route' && isInteractive && (
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] border border-ink/10 dark:border-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <MapIcon className={`w-3.5 h-3.5 shrink-0 text-beacon-red dark:text-rose-400 dual-tone-rose ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                      {t('heroQuickRouteTitle')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isRadiusMode ? (
                    <div className="rounded-2xl px-3.5 py-2.5 mb-2.5 bg-pod/90 border border-ink/5 dark:border-white/5 text-[11px] text-ink-secondary leading-snug">
                      <div className="font-bold text-ink mb-0.5">
                        {trip.route.origin || 'Nantes'}
                      </div>
                      <div className="font-mono text-[10px] tnum">
                        {t('radiusLoopReachSub', {
                          loop: Math.round((loopRadiusMeters / 1000) * 10) / 10,
                          oneWay: trip.route.distanceKm,
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFlipRouteDirection}
                      className={`w-full rounded-full px-4 py-2.5 mb-2.5 text-left flex items-center gap-2.5 transition-all cursor-pointer ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <ArrowsLeftRight className="w-4 h-4 shrink-0 text-current" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{t('heroFlipReturnBtn')}</div>
                        <div className="text-[10px] opacity-80 leading-snug mt-0.5">{t('heroFlipReturnSub')}</div>
                      </div>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {[-5, -1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSetDistanceKm((trip.route.distanceKm || 10) + d)}
                        className="h-8 px-3 rounded-full bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <div className="flex-1 flex items-center justify-center gap-1 h-8 px-3 rounded-full bg-pod border border-ink/10 dark:border-white/10">
                      <input
                        type="number"
                        min={2}
                        max={350}
                        step={0.5}
                        value={trip.route.distanceKm}
                        onChange={(e) => handleSetDistanceKm(parseFloat(e.target.value))}
                        className="w-12 text-center bg-transparent text-xs font-mono font-bold text-ink tnum focus:outline-none"
                      />
                      <span className="text-[10px] text-ink-muted">km</span>
                    </div>
                    {[1, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSetDistanceKm((trip.route.distanceKm || 10) + d)}
                        className="h-8 px-3 rounded-full bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum cursor-pointer"
                      >
                        +{d}
                      </button>
                    ))}
                  </div>

                  {onUploadGpxFile && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10">
                      <input
                        ref={gpxInputRef}
                        type="file"
                        accept=".gpx,application/gpx+xml,text/xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUploadGpxFile(file);
                            setActivePopover(null);
                          }
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => gpxInputRef.current?.click()}
                        className={`w-full h-8 px-3.5 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                      >
                        <Upload className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.sky.primary}`} />
                        <span className="break-words leading-tight">
                          {trip.route.gpxFileName
                            ? `${t('gpxLoadedBadge')} · ${trip.route.gpxFileName}`
                            : t('gpxUploadBtn')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-expanded={isInteractive ? activePopover === 'route' : undefined}
                title={isInteractive ? t('heroClickToTweakHint') : undefined}
                onClick={
                  isInteractive
                    ? () => setActivePopover((prev) => (prev === 'route' ? null : 'route'))
                    : undefined
                }
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActivePopover((prev) => (prev === 'route' ? null : 'route'));
                        }
                      }
                    : undefined
                }
                className={`h-full rounded-pod p-3.5 sm:p-4.5 bg-pod dark:bg-[#161618] text-ink border flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all ${
                  activePopover === 'route'
                    ? 'border-ink/30 dark:border-white/30'
                    : 'border-ink/5 dark:border-white/5 hover:border-ink/15 dark:hover:border-white/15'
                } ${isInteractive ? 'cursor-pointer select-none group' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="break-words">{t('routeLength')}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 opacity-55 group-hover:opacity-100 transition-transform ${
                          activePopover === 'route' ? 'rotate-180 opacity-100 text-ink' : ''
                        }`}
                      />
                    )}
                    <MapIcon className={`w-4 h-4 shrink-0 text-beacon-red dark:text-rose-400 dual-tone-rose ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink">
                      {trip.route.distanceKm}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">km</span>
                  </div>
                  <span
                    className="text-[11px] font-medium text-ink-muted break-words w-full xl:w-auto text-left xl:text-right min-w-0 leading-tight"
                    title={trip.route.origin || 'Nord-sur-Erdre'}
                  >
                    {trip.route.origin || 'Nord-sur-Erdre'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Moving Time — Clarifies Saddle Time (Excl. Pauses) vs Total Time (Incl. Buffer) */}
            <div className="relative">
              {activePopover === 'pace' && isInteractive && (
                <div className="absolute right-0 lg:left-0 lg:right-auto bottom-full mb-2.5 w-[min(21.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] border border-ink/10 dark:border-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-ink">{t('heroQuickPaceTitle')}</span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Explicit Moving vs Buffer Time Breakdown Box */}
                  <div className="p-3 rounded-2xl bg-pod/90 mb-2.5 text-[11px] space-y-1 border border-ink/5 dark:border-white/5">
                    <div className="flex items-center justify-between text-ink-secondary">
                      <span>{isFr ? 'Temps en selle (hors pauses) :' : 'Saddle time (excl. pauses):'}</span>
                      <span className="font-mono font-bold text-ink tnum">{formatTimeHHMM(movingMinutes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-secondary">
                      <span>{isFr ? 'Marge pauses & imprévus :' : 'Pause & buffer allowance:'}</span>
                      <span className={`font-mono font-bold tnum ${CHIP_TOKENS.emerald.primary}`}>+{bufferMinutes} min</span>
                    </div>
                    <div className="pt-1 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-between font-semibold text-ink">
                      <span>{isFr ? 'Durée totale estimée :' : 'Total elapsed time:'}</span>
                      <span className="font-mono font-extrabold tnum">{formatTimeHHMM(totalElapsedMinutes)}</span>
                    </div>
                  </div>

                  {/* Hold Speed vs Hold Effort Toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-pod mb-3">
                    <button
                      type="button"
                      onClick={() => handleUpdatePacing({ pacingMode: 'speed' })}
                      className={`py-1.5 px-3 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        trip.route.pacingMode !== 'effort'
                          ? 'bg-card text-ink shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('pacingHoldSpeed')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePacing({
                          pacingMode: 'effort',
                          targetEffortWatts:
                            trip.route.targetEffortWatts || Math.round(physicsResult.legWatts || 160),
                        })
                      }
                      className={`py-1.5 px-3 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        trip.route.pacingMode === 'effort'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('pacingHoldEffort')}
                    </button>
                  </div>

                  {trip.route.pacingMode === 'effort' ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-extrabold font-mono tnum text-ink">
                          {trip.route.targetEffortWatts || 160} W
                        </span>
                        <span className="text-[11px] font-mono tnum text-ink-secondary">
                          → {physicsResult.effectiveSpeedKmH} km/h · {physicsResult.powerZone}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={80}
                        max={360}
                        step={5}
                        value={trip.route.targetEffortWatts || 160}
                        onChange={(e) =>
                          handleUpdatePacing({ targetEffortWatts: parseInt(e.target.value, 10) || 160 })
                        }
                        className="w-full accent-[#a3b300] dark:accent-[#dfff00] cursor-pointer"
                      />
                      <div className="flex items-center justify-between gap-1.5">
                        {[-15, -5, 5, 15].map((dw) => (
                          <button
                            key={dw}
                            type="button"
                            onClick={() =>
                              handleUpdatePacing({
                                targetEffortWatts: Math.max(
                                  80,
                                  Math.min(360, (trip.route.targetEffortWatts || 160) + dw)
                                ),
                              })
                            }
                            className="flex-1 h-8 rounded-full bg-pod hover:bg-chip text-[11px] font-mono font-semibold text-ink tnum cursor-pointer"
                          >
                            {dw > 0 ? `+${dw}W` : `${dw}W`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-extrabold font-mono tnum text-ink">
                          {trip.route.targetSpeedKmH} km/h
                        </span>
                        <span className="text-[11px] font-mono tnum text-ink-secondary">
                          → {Math.round(physicsResult.legWatts)} W · {physicsResult.powerZone}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={14}
                        max={42}
                        step={0.5}
                        value={trip.route.targetSpeedKmH}
                        onChange={(e) =>
                          handleUpdatePacing({ targetSpeedKmH: parseFloat(e.target.value) || 25 })
                        }
                        className="w-full accent-[#10b981] cursor-pointer"
                      />
                      <div className="flex items-center justify-between gap-1.5">
                        {[-2, -1, 1, 2].map((dv) => (
                          <button
                            key={dv}
                            type="button"
                            onClick={() =>
                              handleUpdatePacing({
                                targetSpeedKmH: Math.max(
                                  14,
                                  Math.min(42, Number(((trip.route.targetSpeedKmH || 25) + dv).toFixed(1)))
                                ),
                              })
                            }
                            className="flex-1 h-8 rounded-full bg-pod hover:bg-chip text-[11px] font-mono font-semibold text-ink tnum cursor-pointer"
                          >
                            {dv > 0 ? `+${dv}` : `${dv}`} km/h
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Didactic Watts Explanation */}
                  <p className="mt-2.5 text-[11px] text-ink-muted leading-snug">
                    💡 {wattsDidacticNote}
                  </p>

                  {onOpenConfigurator && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopover(null);
                        onOpenConfigurator();
                      }}
                      className={`mt-2.5 w-full h-8 px-3 rounded-full bg-pod hover:bg-chip flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
                      <span>{t('heroOpenFullConfigBtn')}</span>
                    </button>
                  )}
                </div>
              )}

              <div
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-expanded={isInteractive ? activePopover === 'pace' : undefined}
                title={
                  isFr
                    ? `En selle : ${formatTimeHHMM(movingMinutes)} (hors pauses) + ${bufferMinutes}m pauses = ${formatTimeHHMM(totalElapsedMinutes)} total`
                    : `Saddle time: ${formatTimeHHMM(movingMinutes)} (excl. pauses) + ${bufferMinutes}m buffer = ${formatTimeHHMM(totalElapsedMinutes)} total`
                }
                onClick={
                  isInteractive
                    ? () => setActivePopover((prev) => (prev === 'pace' ? null : 'pace'))
                    : undefined
                }
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActivePopover((prev) => (prev === 'pace' ? null : 'pace'));
                        }
                      }
                    : undefined
                }
                className={`h-full rounded-pod p-3.5 sm:p-4.5 bg-pod dark:bg-[#161618] text-ink border flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all ${
                  activePopover === 'pace'
                    ? 'border-ink/30 dark:border-white/30'
                    : 'border-ink/5 dark:border-white/5 hover:border-ink/15 dark:hover:border-white/15'
                } ${isInteractive ? 'cursor-pointer select-none group' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="break-words">
                    {isFr ? 'En selle (hors pauses)' : 'Saddle (excl. pauses)'}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 opacity-55 group-hover:opacity-100 transition-transform ${
                          activePopover === 'pace' ? 'rotate-180 opacity-100 text-ink' : ''
                        }`}
                      />
                    )}
                    <Timer className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink shrink-0">
                    {formatTimeHHMM(movingMinutes)}
                  </span>
                  <span
                    className={`text-[11px] font-medium tnum break-words w-full xl:w-auto text-left xl:text-right min-w-0 leading-tight ${CHIP_TOKENS.emerald.primary}`}
                  >
                    +{bufferMinutes}m → {formatTimeHHMM(totalElapsedMinutes)} tot.
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Energy Burned / Fuel Units */}
            <div className="rounded-pod p-3.5 sm:p-4.5 bg-pod dark:bg-[#161618] text-ink border border-ink/5 dark:border-white/5 flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all hover:border-ink/15 dark:hover:border-white/15">
              <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                <span className="break-words">
                  {effectiveSpecs.telemetryMode === 'quantitative'
                    ? t('energyBurn')
                    : effectiveSpecs.telemetryMode === 'fuel-first'
                    ? isFr
                      ? 'Unités Ravito'
                      : 'Fuel Units'
                    : isFr
                    ? 'Rythme Ravito'
                    : 'Fueling Rhythm'}
                </span>
                <Flame2 className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>
              <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink">
                    {effectiveSpecs.telemetryMode === 'quantitative'
                      ? totalKcal
                      : effectiveSpecs.telemetryMode === 'fuel-first'
                      ? Math.max(1, Math.round(dynamicCarb.targetOnBikeCarbsG / 20))
                      : isFr
                      ? 'Régulier'
                      : 'Steady'}
                  </span>
                  {effectiveSpecs.telemetryMode === 'quantitative' ? (
                    <span className="text-xs font-medium text-ink-muted">kcal</span>
                  ) : effectiveSpecs.telemetryMode === 'fuel-first' ? (
                    <span className="text-xs font-medium text-ink-muted">{isFr ? 'unités' : 'units'}</span>
                  ) : null}
                </div>
                <span
                  className="text-[11px] font-medium text-ink-muted tnum break-words w-full xl:w-auto text-left xl:text-right min-w-0 leading-tight"
                  title={
                    effectiveSpecs.telemetryMode === 'quantitative'
                      ? isFr
                        ? `Cible ravito : ${dynamicCarb.effectiveHourlyRateG}g/h`
                        : `Fueling target: ${dynamicCarb.effectiveHourlyRateG}g/h`
                      : effectiveSpecs.telemetryMode === 'fuel-first'
                      ? `${Math.max(1, Math.round(dynamicCarb.effectiveHourlyRateG / 20))} ${isFr ? 'unités / h' : 'fuel units / hr'}`
                      : isFr
                      ? 'Hydratation régulière'
                      : 'Steady hydration'
                  }
                >
                  {effectiveSpecs.telemetryMode === 'quantitative'
                    ? `${dynamicCarb.effectiveHourlyRateG}g/h ${isFr ? 'ravito' : 'carbs'}`
                    : effectiveSpecs.telemetryMode === 'fuel-first'
                    ? `${Math.max(1, Math.round(dynamicCarb.effectiveHourlyRateG / 20))} ${isFr ? 'unités/h' : 'units/h'}`
                    : isFr
                    ? '1 gorgée / 20 min'
                    : 'Sip every 20m'}
                </span>
              </div>
            </div>

            {/* 5. Elevation Gain (Hover / Click Dot-Matrix Brand Overlay) */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (elevHoverTimeoutRef.current) {
                  clearTimeout(elevHoverTimeoutRef.current);
                  elevHoverTimeoutRef.current = null;
                }
                setIsElevationHovered(true);
              }}
              onMouseLeave={() => {
                if (elevHoverTimeoutRef.current) {
                  clearTimeout(elevHoverTimeoutRef.current);
                }
                elevHoverTimeoutRef.current = setTimeout(() => {
                  setIsElevationHovered(false);
                  setHoveredElevCol(null);
                }, 130);
              }}
            >
              {showElevationOverlay && (
                <div className="absolute right-0 bottom-full mb-2.5 w-[min(22.5rem,calc(100vw-3rem))] z-40 rounded-pod p-4 sm:p-4.5 bg-[#faffcb] text-[#4d5200] dark:bg-[#191C06] dark:text-[#dfff00] border border-[#8ea000]/30 dark:border-[#dfff00]/25 shadow-2xl animate-apple-popover">
                  {/* Top Header Row modeled after reference card (Title left | Primary + Secondary % right) */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="min-w-0">
                      <div className="text-lg sm:text-[21px] font-bold tracking-tight uppercase leading-none">
                        {isFr ? 'DÉNIVELÉ' : 'ELEVATION'}
                      </div>
                      <div className="text-[11px] font-medium opacity-75 mt-1.5 break-words tnum">
                        {hoveredElevPoint
                          ? `km ${hoveredElevPoint.distKm.toFixed(1)} · Alt ${Math.round(hoveredElevPoint.eleM)} m`
                          : `${surfaceLabel} · ${difficultyLabel} · ${trip.route.distanceKm} km`}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg sm:text-[21px] font-bold font-mono tracking-tight tnum leading-none">
                        {hoveredElevPoint ? `${Math.round(hoveredElevPoint.eleM)}m` : `+${elevationGainM}m`}
                      </div>
                      <div className="text-xs font-mono font-semibold tnum opacity-80 mt-1">
                        {hoveredElevPoint
                          ? `${hoveredElevPoint.gradePct >= 0 ? '↑' : '↓'}${Math.abs(hoveredElevPoint.gradePct).toFixed(1)}%`
                          : `↑${maxGradientPercent}%`}
                      </div>
                    </div>
                  </div>

                  {/* Dot-Matrix Elevation Silhouette (38 cols × 13 rows) */}
                  <svg
                    viewBox={`0 0 ${ELEV_MATRIX_COLS * 8} ${ELEV_MATRIX_ROWS * 8}`}
                    className="w-full h-auto block select-none cursor-crosshair"
                    role="img"
                    aria-label={isFr ? 'Aperçu du dénivelé et du terrain' : 'Elevation and terrain overview'}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (rect.width <= 0) return;
                      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const col = Math.min(
                        ELEV_MATRIX_COLS - 1,
                        Math.max(0, Math.round(relX * (ELEV_MATRIX_COLS - 1)))
                      );
                      setHoveredElevCol(col);
                    }}
                    onMouseLeave={() => setHoveredElevCol(null)}
                  >
                    {elevationColumns.map((colData, colIdx) => {
                      const isColHovered = hoveredElevCol === colIdx;
                      return Array.from({ length: ELEV_MATRIX_ROWS }, (_, rowFromTop) => {
                        const rowFromBottom = ELEV_MATRIX_ROWS - 1 - rowFromTop;
                        const isFilled = rowFromBottom < colData.filledRows;
                        const fill = isFilled
                          ? isColHovered
                            ? isDarkMode
                              ? '#FFFFFF'
                              : '#4D5200'
                            : isDarkMode
                            ? '#DFFF00'
                            : '#8EA000'
                          : isDarkMode
                          ? 'rgba(223, 255, 0, 0.15)'
                          : 'rgba(77, 82, 0, 0.14)';

                        return (
                          <circle
                            key={`${colIdx}-${rowFromTop}`}
                            cx={colIdx * 8 + 4}
                            cy={rowFromTop * 8 + 4}
                            r={3.3}
                            fill={fill}
                          />
                        );
                      });
                    })}
                  </svg>

                  {/* Compact Monochrome Terrain Split Footer (no Upload .GPX button) */}
                  <div className="mt-3 pt-2.5 border-t border-[#4d5200]/15 dark:border-[#dfff00]/15 flex items-center justify-between gap-2 text-[10px] font-mono font-semibold opacity-80 tnum">
                    <span className="break-words leading-tight">
                      {isFr ? 'Plat' : 'Flat'} {terrainSummary.flatPct}% ·{' '}
                      {isFr ? 'Vallonné' : 'Rolling'} {terrainSummary.rollingPct}% ·{' '}
                      {isFr ? 'Bosses' : 'Climb'} {terrainSummary.climbPct}%
                    </span>
                    <span className="shrink-0">
                      {Math.round(terrainSummary.minEleM)}–{Math.round(terrainSummary.maxEleM)}m
                    </span>
                  </div>
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                aria-expanded={showElevationOverlay}
                onClick={() => {
                  if (activePopover === 'elevation') {
                    setActivePopover(null);
                    setIsElevationHovered(false);
                    setHoveredElevCol(null);
                  } else {
                    setActivePopover('elevation');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (activePopover === 'elevation') {
                      setActivePopover(null);
                      setIsElevationHovered(false);
                      setHoveredElevCol(null);
                    } else {
                      setActivePopover('elevation');
                    }
                  }
                }}
                className={`h-full rounded-pod p-3.5 sm:p-4.5 bg-pod dark:bg-[#161618] text-ink border flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all cursor-pointer select-none group ${
                  showElevationOverlay
                    ? 'border-[#8ea000]/50 dark:border-[#dfff00]/45'
                    : 'border-ink/5 dark:border-white/5 hover:border-ink/15 dark:hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="break-words">{t('elevationGain') || 'Elevation gain'}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <CaretUp
                      className={`w-3 h-3 opacity-55 group-hover:opacity-100 transition-transform ${
                        showElevationOverlay ? 'rotate-180 opacity-100 text-ink' : ''
                      }`}
                    />
                    <Mountains className={`w-4 h-4 shrink-0 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink">
                      +{elevationGainM}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">m</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted tnum break-words w-full xl:w-auto text-left xl:text-right min-w-0 leading-tight">
                    Max {maxGradientPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Corridor Resupply Radar Overlay Menu (Accessible via 1:1 button) ── */}
      <ResupplyRadarOverlay
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        trip={trip}
        hardDepartureTime={timelineResult.hardDepartureTime}
        effectiveSpeedKmH={physicsResult.effectiveSpeedKmH}
        onUpdateTrip={onUpdateTrip || (() => {})}
        selectedAmenity={selectedAmenity}
        onSelectAmenity={onSelectAmenity}
        onAmenitiesLoaded={onAmenitiesLoaded}
        showMapDots={showMapDots}
        onToggleShowMapDots={handleToggleShowMapDots}
      />
    </div>
  );
};
