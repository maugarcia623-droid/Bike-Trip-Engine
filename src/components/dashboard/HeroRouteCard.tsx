import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from "@/components/arc/button/button";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus,
  Minus,
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
  CloudArrowDown,
  CloudCheck,
  ShareNetwork,
  Download,
  ShieldCheck,
  TriangleAlert,
  LoaderCircle,
  Printer,
  Send,
  Compass,
  Play,
  Luggage,
  Maximize2,
  Minimize2,
  Droplets,
  Skull,
  Croissant,
  Shield,
  Train,
  Wrench,
  CheckCircle,
  ThumbsUp,
} from '@/components/icons';
import { downloadTripGpx, downloadTripTcx } from '../../utils/gpxExporter';
import { downloadTripFit } from '../../utils/fitExporter';
import {
  getCachedHeadUnitStatuses,
  HEADUNIT_PUSH_ENABLED,
  HeadUnitProvider,
  pushCourseToHeadUnit,
  startHeadUnitOAuthConnect,
} from '../../services/headUnitIntegration';
import {
  getExpeditionPackStatus,
  OfflineExpeditionPackMeta,
  saveExpeditionPack,
} from '../../services/offlinePackService';
import { TripProfile, PhysicsCalculationResult, SurfaceType } from '../../types/trip';
import { AmenityCategory, StageAmenity } from '../../types/amenities';
import { RiderBikeSpecs, resolveBikeTireWidthMm } from '../../types/specs';
import { getActiveBike, loadRiderBikeSpecs } from '../../utils/specsStorage';
import { synthesizeRouteElevationProfile } from '../../utils/gpxParser';
import { computeSurfaceBreakdown, SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useOsmSurface } from '../../services/osmSurfaceService';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { calculateDynamicCarbTarget } from '../../utils/nutrition';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
  ChipTheme,
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
  onPrint?: () => void;
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  amenities?: StageAmenity[];
  visibleAmenityCategories?: Set<AmenityCategory>;
  onVisibleAmenityCategoriesChange?: (next: Set<AmenityCategory>) => void;
  selectedAmenity?: StageAmenity | null;
  onSelectAmenity?: (amenity: StageAmenity) => void;
  onTogglePinAmenity?: (amenity: StageAmenity) => void;
  onAmenitiesLoaded?: (amenities: StageAmenity[]) => void;
  showMapDots?: boolean;
  onToggleShowMapDots?: () => void;
  onStartRideMode?: () => void;
  onOpenStageSlicer?: () => void;
  onJumpToSection?: (sectionId: string) => void;
}

type ActiveHeroPopover = 'bike' | 'load' | 'tripType' | 'target' | 'route' | 'pace' | 'export' | null;

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
  onPrint,
  onShareReceipt,
  onOpenFeedback,
  amenities,
  visibleAmenityCategories,
  onVisibleAmenityCategoriesChange,
  selectedAmenity,
  onSelectAmenity,
  onTogglePinAmenity,
  onAmenitiesLoaded,
  showMapDots: propShowMapDots,
  onToggleShowMapDots: propOnToggleShowMapDots,
  onStartRideMode,
  onOpenStageSlicer,
  onJumpToSection,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const heroRootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const isMapFullscreenRef = useRef(false);
  isMapFullscreenRef.current = isMapFullscreen;
  const hasToggledFullscreenRef = useRef(false);

  useEffect(() => {
    if (!isMapFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('cadence-map-fullscreen');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('cadence-map-fullscreen');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapFullscreen]);

  useEffect(() => {
    if (!hasToggledFullscreenRef.current) {
      hasToggledFullscreenRef.current = true;
      return;
    }
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isMapFullscreen) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    } else {
      if (L.Browser.mobile) map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
    }

    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false });
      const {
        isRadiusMode: rMode,
        radiusCenter: rCenter,
        activeCoordinates: aCoords,
      } = latestRouteRef.current;
      fitRouteInClearArea(rMode, rCenter, aCoords);
    }, 60);
    return () => clearTimeout(timer);
  }, [isMapFullscreen]);
  const lowerContentRef = useRef<HTMLDivElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
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
  const [includeFitFuelCues, setIncludeFitFuelCues] = useState<boolean>(true);
  const [exportFeedback, setExportFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const exportToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exportToastTimerRef.current) {
        clearTimeout(exportToastTimerRef.current);
      }
    };
  }, []);

  const showExportToast = (kind: 'ok' | 'err', msg: string) => {
    if (exportToastTimerRef.current) {
      clearTimeout(exportToastTimerRef.current);
    }
    setExportFeedback({ kind, msg });
    exportToastTimerRef.current = setTimeout(() => {
      setExportFeedback(null);
    }, 2400);
  };

  const runFileExport = (formatLabel: string, exporter: () => void) => {
    try {
      exporter();
      setActivePopover(null);
      showExportToast(
        'ok',
        isFr ? `${formatLabel} téléchargé` : `${formatLabel} downloaded`
      );
    } catch (err) {
      showExportToast(
        'err',
        err instanceof Error
          ? err.message
          : isFr
          ? `Export ${formatLabel} indisponible`
          : `${formatLabel} export unavailable`
      );
    }
  };
  const [internalShowMapDots, setInternalShowMapDots] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cadence_show_map_amenity_dots');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  const showMapDots = propShowMapDots ?? internalShowMapDots;

  const handleToggleShowMapDots = () => {
    if (propOnToggleShowMapDots) {
      propOnToggleShowMapDots();
      return;
    }
    setInternalShowMapDots((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cadence_show_map_amenity_dots', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [activeSurfaceSegmentId, setActiveSurfaceSegmentId] = useState<string | null>(null);
  const surfaceHighlightLayerRef = useRef<L.Polyline | null>(null);

  const effectiveSpecs = riderSpecs || loadRiderBikeSpecs();
  const activeBike = getActiveBike(effectiveSpecs);
  const isInteractive = Boolean(onUpdateTrip);
  const isDepartAtMode = trip.arriveAtMode === false;
  const [offlinePack, setOfflinePack] = useState<OfflineExpeditionPackMeta | null>(null);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let active = true;
    getExpeditionPackStatus(trip.id).then((meta) => {
      if (active) setOfflinePack(meta);
    });
    return () => {
      active = false;
    };
  }, [trip.id]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleSaveOfflinePack = async () => {
    if (isSavingOffline) return;
    setIsSavingOffline(true);
    try {
      const meta = await saveExpeditionPack(trip, lang, effectiveSpecs.ftpWatts);
      setOfflinePack(meta);
    } finally {
      setIsSavingOffline(false);
    }
  };
  const currentTargetGateTime = isDepartAtMode
    ? trip.departureTime || timelineResult.hardDepartureTime || '07:30'
    : trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';

  useEffect(() => {
    if (!activePopover) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (heroRootRef.current && !heroRootRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
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
    const wpCount = trip.route.waypoints?.length || 0;
    const distKey = trip.route.distanceKm || 0;
    if (isRadiusMode) {
      return `radius:${radiusCenter[0].toFixed(5)},${radiusCenter[1].toFixed(5)}:${loopRadiusMeters}:${distKey}:${wpCount}`;
    }
    const len = activeCoordinates.length;
    const start =
      len > 0 ? `${activeCoordinates[0][0].toFixed(5)},${activeCoordinates[0][1].toFixed(5)}` : '';
    const end =
      len > 1
        ? `${activeCoordinates[len - 1][0].toFixed(5)},${activeCoordinates[len - 1][1].toFixed(5)}`
        : '';
    return `corridor:${len}:${start}:${end}:${distKey}:${wpCount}`;
  }, [
    isRadiusMode,
    radiusCenter,
    loopRadiusMeters,
    activeCoordinates,
    trip.route.distanceKm,
    trip.route.waypoints?.length,
  ]);

  const handleSetDistanceKm = (nextDistanceRaw: number) => {
    if (!onUpdateTrip || Number.isNaN(nextDistanceRaw)) return;
    const clampedKm = Math.max(2, Math.min(350, Math.round(nextDistanceRaw * 10) / 10));
    const oldKm = Math.max(1, trip.route.distanceKm || 1);
    const oldElev = trip.route.elevationGainM ?? Math.round(oldKm * 6.6);
    const scaledElev = Math.max(0, Math.round(oldElev * (clampedKm / oldKm)));
    const nextLoopKm = Math.round((clampedKm / 2) * 10) / 10;
    const originShort = (trip.route.origin || 'Start').split(',')[0].trim();
    const isAutoLoopTitle =
      !trip.name?.trim() ||
      /^.+ · (\d+(\.\d+)? km Loop|Boucle de \d+(\.\d+)? km)$/i.test(trip.name.trim());
    const updatedName = isRadiusMode && isAutoLoopTitle
      ? (isFr ? `${originShort} · Boucle de ${clampedKm} km` : `${originShort} · ${clampedKm} km Loop`)
      : trip.name;
    const updatedDesc = trip.description
      ? trip.description.replace(/^\d+(\.\d+)?\s*km\b/i, `${clampedKm.toFixed(1)} km`)
      : `${clampedKm.toFixed(1)} km ride`;

    onUpdateTrip({
      ...trip,
      name: updatedName,
      description: updatedDesc,
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

  const canQueryOsmSurface =
    trip.route.routeMode !== 'manual-radius' && activeCoordinates.length >= 2;
  const {
    osmData,
    status: osmStatus,
    error: osmError,
    refresh: refreshOsmSurface,
  } = useOsmSurface(activeCoordinates, trip.route.distanceKm, canQueryOsmSurface);

  const surfaceBreakdown = useMemo(
    () =>
      computeSurfaceBreakdown(
        {
          ...trip.route,
          coordinates: activeCoordinates,
          elevationProfile: elevationData.elevationProfile,
        },
        {
          crr: trip.physics.crr ?? activeBike?.crr ?? 0.0055,
          tireWidthMm: activeBike?.tireWidthMm,
          isTubeless: activeBike?.isTubeless ?? true,
          riderWeightKg: trip.physics.riderWeightKg,
          bikeWeightKg: trip.physics.bikeWeightKg,
          luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg,
          customChips: trip.customChips ?? [],
          osmData,
          isLoadingOsm: canQueryOsmSurface && osmStatus === 'loading',
          osmError,
        }
      ),
    [
      trip.route,
      activeCoordinates,
      elevationData.elevationProfile,
      trip.physics.crr,
      trip.physics.riderWeightKg,
      trip.physics.bikeWeightKg,
      trip.physics.luggageWeightKg,
      trip.physics.gearWeightKg,
      activeBike?.crr,
      activeBike?.tireWidthMm,
      activeBike?.isTubeless,
      trip.customChips,
      osmData,
      canQueryOsmSurface,
      osmStatus,
      osmError,
    ]
  );

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
      const isNarrow = window.innerWidth < 640;
      const padX = isNarrow ? 24 : 40;
      const padTop = isNarrow ? 56 : 56;
      const padBottom = isMapFullscreenRef.current
        ? isNarrow
          ? 24
          : 40
        : (() => {
            const lowerH = lowerContentRef.current?.offsetHeight || 240;
            const maxBottomPad = Math.max(120, containerH - padTop - 64);
            return Math.min(maxBottomPad, Math.max(160, lowerH + (isNarrow ? 20 : 28)));
          })();
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

    const isLoopOverlap =
      !radiusMode &&
      coords.length > 1 &&
      Math.hypot(
        coords[0][0] - coords[coords.length - 1][0],
        coords[0][1] - coords[coords.length - 1][1]
      ) < 0.0015;

    const startIcon = L.divIcon({
      className: 'custom-hero-start-marker',
      html: `
        <div style="position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #10B981; width: 14px; height: 14px; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(16, 185, 129, 0.75);"></div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [isLoopOverlap ? 15 : 7, 7],
    });

    const endIcon = L.divIcon({
      className: 'custom-hero-end-marker',
      html: `
        <div style="background-color: #FF3B30; width: 13px; height: 13px; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(255, 59, 48, 0.8);"></div>
      `,
      iconSize: [13, 13],
      iconAnchor: [isLoopOverlap ? -1 : 6.5, 6.5],
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
        color: currentDark ? '#0B132B' : '#111111',
        weight: currentDark ? 7.5 : 6,
        opacity: currentDark ? 0.65 : 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const routeLine = L.polyline(coords, {
        color: currentDark ? '#38BDF8' : '#0284C7',
        weight: 3.5,
        opacity: 0.01, // Invisible bounds anchor; color-coded surface segments render on top
        lineCap: 'round',
        lineJoin: 'round',
      });

      group.addLayer(casingLine);
      group.addLayer(routeLine);

      // Render color-coded surface segments along the route trace
      for (const seg of surfaceBreakdown.segments) {
        if (!seg.coordinates || seg.coordinates.length < 2) continue;
        const meta = SURFACE_VISUAL_META[seg.type];
        const segColor = currentDark ? meta.colorDark : meta.colorLight;
        const segLine = L.polyline(seg.coordinates, {
          color: segColor,
          weight: seg.type === 'paved' ? 3.8 : 4.4,
          opacity: 0.96,
          dashArray: meta.dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        });

        const suitabilityText =
          seg.suitability38c === 'ideal'
            ? isFr
              ? `Idéal en ${surfaceBreakdown.suitability.tireWidthMm}c`
              : `Ideal on ${surfaceBreakdown.suitability.tireWidthMm}c`
            : seg.suitability38c === 'capable'
            ? isFr
              ? `Adapté en ${surfaceBreakdown.suitability.tireWidthMm}c`
              : `Capable on ${surfaceBreakdown.suitability.tireWidthMm}c`
            : isFr
            ? `Technique en ${surfaceBreakdown.suitability.tireWidthMm}c`
            : `Technical on ${surfaceBreakdown.suitability.tireWidthMm}c`;

        const SuitabilityIcon =
          seg.suitability38c === 'ideal'
            ? CheckCircle
            : seg.suitability38c === 'capable'
            ? ThumbsUp
            : TriangleAlert;

        const tooltipEl = document.createElement('div');
        tooltipEl.style.cssText = 'font-family:ui-rounded,Nunito,sans-serif;padding:2px 4px;';
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:800;font-size:11px;';
        titleEl.textContent = isFr ? seg.nameFr : seg.nameEn;
        const metaEl = document.createElement('div');
        metaEl.style.cssText = 'font-size:10px;opacity:0.85;';
        metaEl.textContent = `km ${seg.startKm}–${seg.endKm} (${seg.distanceKm} km) · ${
          isFr ? meta.labelFr : meta.labelEn
        }`;
        const suitEl = document.createElement('div');
        suitEl.style.cssText = 'font-size:10px;font-weight:700;margin-top:2px;display:flex;align-items:center;gap:4px;';
        const suitIconWrap = document.createElement('span');
        suitIconWrap.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0;';
        suitIconWrap.innerHTML = renderToStaticMarkup(
          <SuitabilityIcon size={12} strokeWidth={2.2} aria-hidden="true" />
        );
        const suitLabelSpan = document.createElement('span');
        suitLabelSpan.textContent = suitabilityText;
        suitEl.appendChild(suitIconWrap);
        suitEl.appendChild(suitLabelSpan);
        tooltipEl.appendChild(titleEl);
        tooltipEl.appendChild(metaEl);
        tooltipEl.appendChild(suitEl);

        segLine.bindTooltip(tooltipEl, { sticky: true, direction: 'top', offset: [0, -8] });

        segLine.on('mouseover', () => {
          setActiveSurfaceSegmentId(seg.id);
        });
        segLine.on('mouseout', () => {
          setActiveSurfaceSegmentId((prev) => (prev === seg.id ? null : prev));
        });

        group.addLayer(segLine);
      }

      let startMarker: L.Marker | undefined;
      let endMarker: L.Marker | undefined;

      if (coords.length > 0) {
        startMarker = L.marker(coords[0], { icon: startIcon });
        group.addLayer(startMarker);

        // Render intermediate waypoints on hero map
        if (trip.route.waypoints && trip.route.waypoints.length > 0) {
          trip.route.waypoints.forEach((wp, idx) => {
            if (wp.coordinates) {
              const wpIcon = L.divIcon({
                className: 'custom-map-marker',
                html: `<div style="background-color: #F2F455; color: #111111; width: 18px; height: 18px; border-radius: 9999px; border: 2px solid #111111; display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:800; font-family:ui-rounded,Nunito,sans-serif; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${idx + 1}</div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              });
              const wpMarker = L.marker(wp.coordinates, { icon: wpIcon });
              const wpTooltipEl = document.createElement('div');
              const wpTitleEl = document.createElement('div');
              wpTitleEl.style.cssText = 'font-weight:700;font-size:11px;';
              wpTitleEl.textContent = wp.name;
              wpTooltipEl.appendChild(wpTitleEl);
              if (wp.distanceFromStartKm) {
                const wpDistEl = document.createElement('div');
                wpDistEl.style.cssText = 'font-size:10px;color:#666;';
                wpDistEl.textContent = `km ${wp.distanceFromStartKm}`;
                wpTooltipEl.appendChild(wpDistEl);
              }
              wpMarker.bindTooltip(wpTooltipEl, { direction: 'top', offset: [0, -9] });
              group.addLayer(wpMarker);
            }
          });
        }

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
      preferCanvas: false,
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
      maxNativeZoom: 16,
      maxZoom: 19,
      attribution: 'Esri',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const vectorGroup = L.featureGroup().addTo(map);
    routeLayersGroupRef.current = vectorGroup;

    const amenityGroup = L.featureGroup().addTo(map);
    amenityLayersGroupRef.current = amenityGroup;

    updateVectorLayers(isDark, rMode, rCenter, aCoords, rMeters);

    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeDebounceTimer !== null) {
        clearTimeout(resizeDebounceTimer);
      }
      resizeDebounceTimer = setTimeout(() => {
        resizeDebounceTimer = null;
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.invalidateSize();
        const current = latestRouteRef.current;
        fitRouteInClearArea(current.isRadiusMode, current.radiusCenter, current.activeCoordinates);
      }, 120);
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
      if (resizeDebounceTimer !== null) {
        clearTimeout(resizeDebounceTimer);
      }
      resizeObserver.disconnect();
      if (surfaceHighlightLayerRef.current) {
        surfaceHighlightLayerRef.current.remove();
        surfaceHighlightLayerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayersGroupRef.current = null;
      amenityLayersGroupRef.current = null;
      amenityMarkersMapRef.current.clear();
      vectorLayersRef.current = {};
    };
  }, []);

  // 2. Update vector route layers when route geometry/mode or surface breakdown changes
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
  }, [routeFingerprint, surfaceBreakdown, isDarkMode]);

  // 2b. Highlight active/hovered surface segment on map (reuses single persistent polyline)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!surfaceHighlightLayerRef.current) {
      surfaceHighlightLayerRef.current = L.polyline([], {
        weight: 7,
        opacity: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(map);
    }

    const poly = surfaceHighlightLayerRef.current;
    const targetSegId = activeSurfaceSegmentId;

    if (!targetSegId || isRadiusMode) {
      poly.setStyle({ opacity: 0 });
      poly.setLatLngs([]);
      return;
    }

    const seg = surfaceBreakdown.segments.find((s) => s.id === targetSegId);
    if (!seg || !seg.coordinates || seg.coordinates.length < 2) {
      poly.setStyle({ opacity: 0 });
      poly.setLatLngs([]);
      return;
    }

    const meta = SURFACE_VISUAL_META[seg.type];
    poly.setStyle({
      color: isDarkMode ? meta.colorDark : meta.colorLight,
      weight: 7,
      opacity: 0.95,
    });
    poly.setLatLngs(seg.coordinates);
    poly.bringToFront();
  }, [activeSurfaceSegmentId, surfaceBreakdown.segments, isDarkMode, isRadiusMode]);

  // 3. Update map tiles & layer styles when theme changes (no map recreation)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(getTileUrl(isDarkMode));
    }
    const current = vectorLayersRef.current;
    if (current.casingLine && current.routeLine) {
      current.casingLine.setStyle({
        color: isDarkMode ? '#18181B' : '#111111',
        weight: isDarkMode ? 7 : 5,
        opacity: isDarkMode ? 0.55 : 0.85,
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

    const pinnedIds = new Set((trip.pinnedAmenities || []).map((p) => p.id));

    const allAmenities = (amenities || []).filter((a) =>
      visibleAmenityCategories ? visibleAmenityCategories.has(a.category) || pinnedIds.has(a.id) : true
    );
    if (trip.pinnedAmenities) {
      for (const pinned of trip.pinnedAmenities) {
        if (!allAmenities.some((a) => a.id === pinned.id)) {
          allAmenities.push(pinned);
        }
      }
    }

    if (allAmenities.length === 0) return;

    allAmenities.forEach((amenity) => {
      const isPinned = pinnedIds.has(amenity.id) || Boolean(amenity.isPinned);

      const CategoryIcon =
        amenity.category === 'water'
          ? Droplets
          : amenity.category === 'cemetery'
          ? Skull
          : amenity.category === 'food'
          ? Croissant
          : amenity.category === 'essentials'
          ? Shield
          : amenity.category === 'bailout'
          ? Train
          : Wrench;

      const iconSvg = renderToStaticMarkup(
        <CategoryIcon size={isPinned ? 14 : 11} strokeWidth={2.2} aria-hidden="true" />
      );

      const catBg =
        amenity.category === 'water'
          ? '#0284c7'
          : amenity.category === 'cemetery'
          ? '#7c3aed'
          : amenity.category === 'food'
          ? '#d97706'
          : amenity.category === 'essentials'
          ? '#4f46e5'
          : amenity.category === 'bailout'
          ? '#475569'
          : '#0d9488';

      const catLabel =
        amenity.category === 'water'
          ? (isFr ? 'Point d\'eau' : 'Water Tap')
          : amenity.category === 'cemetery'
          ? (isFr ? 'Cimetière' : 'Cemetery')
          : amenity.category === 'food'
          ? (isFr ? 'Ravitaillement' : 'Food')
          : amenity.category === 'essentials'
          ? (isFr ? 'WC / Pharm. / Station' : 'Toilet / Med / Fuel')
          : amenity.category === 'bailout'
          ? (isFr ? 'Gare (Repli)' : 'Train Bailout')
          : (isFr ? 'Atelier vélo' : 'Bike Repair');

      const html = isPinned
        ? `<div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(242, 244, 85, 0.45); box-shadow: 0 0 10px rgba(242, 244, 85, 0.85); animation: pulse 2s infinite;"></div>
            <div style="background-color: #F2F455; color: #111111; width: 26px; height: 26px; border-radius: 9999px; border: 2.5px solid #111111; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
              ${iconSvg}
            </div>
          </div>`
        : `<div style="width: 20px; height: 20px; border-radius: 9999px; background-color: ${catBg}; color: #ffffff; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.25); cursor: pointer;">
            ${iconSvg}
          </div>`;

      const icon = L.divIcon({
        className: `custom-amenity-${amenity.category}-${isPinned ? 'pinned' : 'unpinned'}`,
        html,
        iconSize: isPinned ? [28, 28] : [20, 20],
        iconAnchor: isPinned ? [14, 14] : [10, 10],
      });

      const marker = L.marker([amenity.lat, amenity.lon], { icon });

      const popupEl = document.createElement('div');
      popupEl.style.cssText =
        'padding: 4px; font-family: ui-sans-serif, system-ui, sans-serif; min-width: 160px; line-height: 1.3;';

      const headerRow = document.createElement('div');
      headerRow.style.cssText =
        'display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;';
      const catSpan = document.createElement('span');
      catSpan.style.cssText = `font-size: 10px; font-weight: 700; color: ${catBg}; letter-spacing: 0.2px;`;
      catSpan.textContent = catLabel;
      const kmSpan = document.createElement('span');
      kmSpan.style.cssText =
        'font-size: 10px; font-weight: 700; background: #eee; color: #111; padding: 1px 6px; border-radius: 9999px; font-variant-numeric: tabular-nums;';
      kmSpan.textContent = `${amenity.routeKm} km`;
      headerRow.appendChild(catSpan);
      headerRow.appendChild(kmSpan);

      const nameDiv = document.createElement('div');
      nameDiv.style.cssText =
        'font-weight: 700; font-size: 12px; color: #111; margin-bottom: 3px;';
      nameDiv.textContent = amenity.name;

      const footerRow = document.createElement('div');
      footerRow.style.cssText =
        'font-size: 10px; color: #666; display: flex; align-items: center; justify-content: space-between;';
      const detourSpan = document.createElement('span');
      detourSpan.textContent =
        amenity.detourMeters < 75
          ? isFr
            ? 'Sur la trace'
            : 'On route'
          : `+${amenity.detourMeters} m ${isFr ? 'détour' : 'detour'}`;
      footerRow.appendChild(detourSpan);
      if (isPinned) {
        const pinnedSpan = document.createElement('span');
        pinnedSpan.style.cssText =
          'font-weight: 800; color: #4d5200; background: #f2f455; padding: 1px 4px; border-radius: 4px;';
        pinnedSpan.textContent = isFr ? 'Épinglé' : 'Pinned';
        footerRow.appendChild(pinnedSpan);
      }

      popupEl.appendChild(headerRow);
      popupEl.appendChild(nameDiv);
      popupEl.appendChild(footerRow);

      marker.bindPopup(popupEl, {
        closeButton: false,
        className: 'cadence-amenity-popup',
      });

      marker.on('click', () => {
        onSelectAmenity?.(amenity);
      });

      group.addLayer(marker);
      amenityMarkersMapRef.current.set(amenity.id, marker);
    });
  }, [amenities, visibleAmenityCategories, trip.pinnedAmenities, isFr, isDarkMode, showMapDots]);

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
      data-map-fullscreen={isMapFullscreen ? 'true' : undefined}
      style={isMapFullscreen ? { zIndex: 1150 } : undefined}
      className={
        isMapFullscreen
          ? 'fixed inset-0 z-[1150] bg-card text-ink transition-colors'
          : 'relative max-w-full min-w-0 h-full flex flex-col rounded-card bg-card text-ink transition-colors shadow-sm min-h-[460px] sm:min-h-[490px] lg:min-h-[520px]'
      }
    >
      <div
        className={`absolute inset-0 z-0 overflow-hidden ${
          isMapFullscreen ? 'rounded-none isolate' : 'rounded-card isolate [transform:translateZ(0)]'
        }`}
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full bg-[#E5E3DD] dark:bg-[#121214] dark:[filter:brightness(0.82)_contrast(1.22)_saturate(1.15)]"
          />
        </div>

        {!isMapFullscreen && (
          <div
            className="absolute inset-0 z-1 pointer-events-none transition-colors"
            style={{
              background: isDarkMode
                ? 'linear-gradient(to bottom, rgba(10, 10, 11, 0) 0%, rgba(10, 10, 11, 0) 35%, rgba(10, 10, 11, 0.45) 50%, rgba(10, 10, 11, 0.9) 70%, rgba(10, 10, 11, 1) 100%)'
                : 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.92) 70%, rgba(255, 255, 255, 1) 100%)',
            }}
          />
        )}
      </div>

      <div
        className={`relative z-20 p-4 flex flex-col justify-between pointer-events-none ${
          isMapFullscreen
            ? 'h-full pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)]'
            : 'h-full flex-1 min-h-[600px] sm:min-h-[500px] lg:min-h-[520px]'
        }`}
      >
        <div className="relative z-30 flex flex-wrap items-center justify-start gap-2 mb-48 sm:mb-20 pointer-events-none max-w-full">
          {/* ── UNIFIED MULTI-TOOL RIBBON (6 UNIFORM 1:1 ICON BUTTONS) ── */}
          <div className="relative inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-card/95 dark:bg-[#161618]/95 backdrop-blur-md text-ink dark:text-white shadow-sm sm:shadow-md pointer-events-auto select-none transition-colors">
            {/* 1. Route Direction / Flip Button */}
            <Button variant="ghost"
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
              className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${isInteractive ? 'cursor-pointer' : 'opacity-60 cursor-default'} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              {isRadiusMode ? (
                <Path className="w-4 h-4 text-current" />
              ) : (
                <ArrowsLeftRight className="w-4 h-4 text-current transition-transform duration-200 active:-rotate-180" />
              )}
            </Button>

            {/* 2. Rider Bike Garage Button */}
            <Button variant="ghost"
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
                  ? `${activeBike.name} · ${activeBike.weightKg} kg · ${activeBike.isTubeless ? 'TL' : 'Tube'} (${t('heroBikeSwitchAria')})`
                  : t('heroBikeSwitchAria')
              }
              className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Bicycle className="w-4 h-4 text-current shrink-0" />
            </Button>

            {/* 4. Ride Mode Button */}
            {onStartRideMode && (
              <Button
                variant="ghost"
                type="button"
                data-testid="hero-start-ride-mode-btn"
                onClick={onStartRideMode}
                aria-label={isFr ? 'Mode Vélo' : 'Ride Mode'}
                title={t('startRideModeBtn')}
                className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Play className="w-4 h-4 shrink-0 text-current" />
              </Button>
            )}

            {/* 5. Save Offline Pack Button */}
            <Button
              variant="ghost"
              type="button"
              data-testid="hero-offline-pack-btn"
              disabled={isSavingOffline}
              onClick={() => {
                void handleSaveOfflinePack();
              }}
              aria-label={
                offlinePack
                  ? isFr
                    ? 'Hors ligne prêt'
                    : 'Offline Ready'
                  : isFr
                  ? 'Sauver hors ligne'
                  : 'Save Offline'
              }
              title={
                offlinePack
                  ? isFr
                    ? `Pack hors ligne enregistré (${offlinePack.amenitiesCount} arrêts, carte & météo)`
                    : `Offline pack saved (${offlinePack.amenitiesCount} stops, map & weather)`
                  : isFr
                  ? 'Enregistrer carte, arrêts, surface et météo pour rouler sans réseau'
                  : 'Save map, stops, surface & weather for zero-signal rides'
              }
              className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              {isSavingOffline ? (
                <LoaderCircle className="w-4 h-4 shrink-0 animate-spin text-current" />
              ) : offlinePack ? (
                <CloudCheck className="w-4 h-4 shrink-0 text-current" />
              ) : (
                <CloudArrowDown className="w-4 h-4 shrink-0 text-current" />
              )}
            </Button>

            {/* 6. Export / Send Route Button */}
            <Button
              variant="ghost"
              type="button"
              data-testid="hero-export-btn"
              onClick={() => {
                setActivePopover((prev) => (prev === 'export' ? null : 'export'));
              }}
              aria-expanded={activePopover === 'export'}
              aria-haspopup="menu"
              aria-label={isFr ? 'Exporter ou envoyer le parcours' : 'Export or send route'}
              title={isFr ? 'Exporter ou envoyer le parcours' : 'Export or send route'}
              className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <ShareNetwork className="w-4 h-4 shrink-0 text-current" />
            </Button>

            {/* 7. Fullscreen Map Toggle Button */}
            <Button variant="ghost"
              type="button"
              onClick={() => {
                setActivePopover(null);
                setIsMapFullscreen((prev) => !prev);
              }}
              aria-label={
                isMapFullscreen
                  ? isFr
                    ? 'Quitter le plein écran'
                    : 'Exit fullscreen'
                  : isFr
                  ? 'Carte en plein écran'
                  : 'Fullscreen map'
              }
              title={
                isMapFullscreen
                  ? isFr
                    ? 'Quitter le plein écran (Échap)'
                    : 'Exit fullscreen (Esc)'
                  : isFr
                  ? 'Carte en plein écran'
                  : 'Fullscreen map'
              }
              className={`relative w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              {isMapFullscreen ? (
                <Minimize2 className="w-4 h-4 shrink-0 text-current" />
              ) : (
                <Maximize2 className="w-4 h-4 shrink-0 text-current" />
              )}
            </Button>

            {/* ── Bike Garage Popover (anchored to the unified ribbon, above all lower content) ── */}
            {activePopover === 'bike' && effectiveSpecs && activeBike && (
              <>
                {/* Full-screen click-outside dismiss shield */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setActivePopover(null)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 z-50 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                    <span className="text-xs font-bold text-ink-muted">
                      {t('bikeGarageHeading', { count: effectiveSpecs.bikes.length })}
                    </span>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {effectiveSpecs.bikes.map((bike) => {
                      const selected = bike.id === activeBike.id;
                      return (
                        <Button variant="ghost"
                          key={bike.id}
                          type="button"
                          onClick={() => {
                            onSelectBike?.(bike.id);
                            setActivePopover(null);
                          }}
                          className={`w-full min-h-[44px] rounded-full px-4 py-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            selected
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                              : `bg-pod hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold break-words leading-tight">{bike.name}</div>
                            <div className="text-[11px] tnum opacity-80 mt-0.5">
                              {bike.weightKg} kg · {bike.isTubeless ? 'Tubeless' : 'Tube'} · {resolveBikeTireWidthMm(bike)} mm
                            </div>
                          </div>
                          {selected && <Check className="w-3.5 h-3.5 shrink-0 text-current" />}
                        </Button>
                      );
                    })}
                  </div>

                  {onOpenSpecs && (
                    <Button variant="ghost"
                      type="button"
                      onClick={() => {
                        setActivePopover(null);
                        onOpenSpecs();
                      }}
                      className={`mt-2.5 w-full min-h-[44px] sm:min-h-[36px] px-3 rounded-full bg-pod hover:bg-chip flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
                      <span>{t('heroManageGarageBtn')}</span>
                    </Button>
                  )}
                </div>
              </>
            )}

            {exportFeedback && exportFeedback.kind === 'ok' && (
              <span
                role="status"
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 h-9 rounded-full text-[11px] font-rounded font-bold shadow-xs ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} animate-apple-popover`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{exportFeedback.msg}</span>
              </span>
            )}

            {activePopover === 'export' && (() => {
              const pinnedStopCount = trip.pinnedAmenities?.length || 0;
              const stopSuffix =
                pinnedStopCount > 0
                  ? isFr
                    ? ` · ${pinnedStopCount} arrêt${pinnedStopCount > 1 ? 's' : ''}`
                    : ` · ${pinnedStopCount} stop${pinnedStopCount > 1 ? 's' : ''}`
                  : '';

              const exportActions: Array<{
                id: string;
                theme: ChipTheme;
                icon: React.ElementType;
                title: string;
                sub: string;
                badge?: string;
                onSelect: () => void;
              }> = [
                {
                  id: 'fit',
                  theme: 'amber',
                  icon: Download,
                  title: 'Garmin / Wahoo .FIT',
                  sub: includeFitFuelCues
                    ? isFr
                      ? `Parcours + cols & alertes nutrition${stopSuffix}`
                      : `Course + climb & fueling alerts${stopSuffix}`
                    : isFr
                    ? `Parcours binaire + virages${stopSuffix}`
                    : `Binary course + Up Ahead cues${stopSuffix}`,
                  badge: '.FIT',
                  onSelect: () => {
                    const fitSpecs = riderSpecs ?? loadRiderBikeSpecs();
                    runFileExport('.FIT', () =>
                      downloadTripFit(trip, {
                        includeFuelingCues: includeFitFuelCues,
                        includeClimbCues: includeFitFuelCues,
                        lang,
                        ftpWatts: fitSpecs.ftpWatts,
                        carbTargetGPerHr: fitSpecs.carbTargetGPerHr,
                        carbPacingMode: fitSpecs.carbPacingMode,
                        riderLevel: fitSpecs.riderLevel,
                        nutritionPreference: fitSpecs.nutritionPreference,
                      })
                    );
                  },
                },
                {
                  id: 'gpx',
                  theme: 'sky',
                  icon: MapIcon,
                  title: isFr ? 'GPS .GPX' : 'GPS .GPX',
                  sub: isFr
                    ? `Trace GPS universelle & repères${stopSuffix}`
                    : `Universal GPS track & waypoints${stopSuffix}`,
                  badge: '.GPX',
                  onSelect: () => {
                    const gpxSpecs = riderSpecs ?? loadRiderBikeSpecs();
                    runFileExport('.GPX', () =>
                      downloadTripGpx(trip, {
                        ftpWatts: gpxSpecs.ftpWatts,
                        carbTargetGPerHr: gpxSpecs.carbTargetGPerHr,
                        carbPacingMode: gpxSpecs.carbPacingMode,
                        riderLevel: gpxSpecs.riderLevel,
                        nutritionPreference: gpxSpecs.nutritionPreference,
                      })
                    );
                  },
                },
                {
                  id: 'tcx',
                  theme: 'emerald',
                  icon: Compass,
                  title: isFr ? 'Entraînement .TCX' : 'Training .TCX',
                  sub: isFr
                    ? 'Parcours avec dénivelé, allure & watts'
                    : 'Course with elevation, pace & power',
                  badge: '.TCX',
                  onSelect: () => {
                    const tcxSpecs = riderSpecs ?? loadRiderBikeSpecs();
                    runFileExport('.TCX', () =>
                      downloadTripTcx(trip, {
                        ftpWatts: tcxSpecs.ftpWatts,
                        carbTargetGPerHr: tcxSpecs.carbTargetGPerHr,
                        carbPacingMode: tcxSpecs.carbPacingMode,
                        riderLevel: tcxSpecs.riderLevel,
                        nutritionPreference: tcxSpecs.nutritionPreference,
                      })
                    );
                  },
                },
                ...(HEADUNIT_PUSH_ENABLED
                  ? (
                      [
                        { id: 'wahoo', label: 'Wahoo' },
                        { id: 'hammerhead', label: 'Hammerhead' },
                        { id: 'garmin', label: 'Garmin' },
                      ] as Array<{ id: HeadUnitProvider; label: string }>
                    )
                  : []
                ).map((hu) => {
                  const isConnected = getCachedHeadUnitStatuses()[hu.id];
                  return {
                    id: `push-${hu.id}`,
                    theme: 'amber' as ChipTheme,
                    icon: ShareNetwork,
                    title: isFr ? `Envoyer vers ${hu.label}` : `Send to ${hu.label}`,
                    sub: isConnected
                      ? isFr
                        ? `Synchroniser le .FIT sans fil vers ${hu.label}`
                        : `Wireless .FIT course push to ${hu.label}`
                      : isFr
                      ? `Connecter ${hu.label} pour l'envoi en 1 clic`
                      : `Connect ${hu.label} for 1-tap wireless push`,
                    badge: isConnected ? (isFr ? 'Prêt' : 'Push') : 'OAuth',
                    onSelect: () => {
                      if (!isConnected) {
                        startHeadUnitOAuthConnect(hu.id);
                        return;
                      }
                      const fitSpecs = riderSpecs ?? loadRiderBikeSpecs();
                      void pushCourseToHeadUnit(trip, hu.id, {
                        includeFuelingCues: includeFitFuelCues,
                        includeClimbCues: includeFitFuelCues,
                        lang,
                        ftpWatts: fitSpecs.ftpWatts,
                        carbTargetGPerHr: fitSpecs.carbTargetGPerHr,
                        carbPacingMode: fitSpecs.carbPacingMode,
                        riderLevel: fitSpecs.riderLevel,
                        nutritionPreference: fitSpecs.nutritionPreference,
                      }).then((res) => {
                        setExportFeedback(
                          res.ok
                            ? {
                                kind: 'ok',
                                msg: isFr ? `Envoyé vers ${hu.label}` : `Sent to ${hu.label}`,
                              }
                            : {
                                kind: 'err',
                                msg: isFr
                                  ? `Échec ${hu.label} (${res.reason || 'erreur'})`
                                  : `${hu.label} push failed (${res.reason || 'error'})`,
                              }
                        );
                      });
                    },
                  };
                }),
              ];

              if (onPrint) {
                exportActions.push({
                  id: 'print',
                  theme: 'blue',
                  icon: Printer,
                  title: isFr ? 'Imprimer feuille de route A4' : 'Print A4 Ride Sheet',
                  sub: isFr
                    ? 'Carnet de route et check-list imprimables'
                    : 'Printable A4 summary & cue sheet',
                  onSelect: () => {
                    setActivePopover(null);
                    requestAnimationFrame(() => onPrint());
                  },
                });
              }

              if (onShareReceipt) {
                exportActions.push({
                  id: 'share',
                  theme: 'purple',
                  icon: Send,
                  title: isFr ? 'Partager lien groupe / Carte' : 'Share Group Link / Receipt',
                  sub: isFr
                    ? 'Lien du plan groupe + carte story PNG'
                    : 'Copy group plan URL + PNG ride card',
                  onSelect: () => {
                    setActivePopover(null);
                    onShareReceipt();
                  },
                });
              }

              return (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActivePopover(null)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label={isFr ? 'Options d’export et partage' : 'Export and share options'}
                    data-testid="hero-export-popover"
                    className="absolute left-0 top-full mt-2 w-[min(21.5rem,calc(100vw-3.5rem))] sm:w-80 z-50 rounded-pod p-3.5 bg-card ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover text-ink"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                      <span className="text-xs font-rounded font-bold text-ink">
                        {isFr ? 'Exporter & envoyer le parcours' : 'Export & send route'}
                      </span>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setActivePopover(null)}
                        aria-label={t('closeModalAria')}
                        className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="mb-2.5 px-0.5 space-y-1.5">
                      <Badge
                        variant="emerald"
                        size="xs"
                        icon={ShieldCheck}
                        className="font-rounded font-bold"
                      >
                        {isFr
                          ? '100% Gratuit — Sans abonnement Pro'
                          : '100% Free — No Pro paywall'}
                      </Badge>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={includeFitFuelCues}
                        onClick={() => setIncludeFitFuelCues((v) => !v)}
                        className="w-full rounded-pod px-2.5 py-1.5 bg-pod hover:bg-chip flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Flame className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.amber.primary}`} />
                          <span className="text-[11px] font-semibold text-ink truncate">
                            {isFr
                              ? 'Alertes nutrition & cols (.FIT)'
                              : 'Nutrition & climb cues (.FIT)'}
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                            includeFitFuelCues
                              ? 'bg-volt text-[#4d5200]'
                              : 'bg-card text-ink-muted ring-1 ring-ink/15'
                          }`}
                        >
                          {includeFitFuelCues ? <Check className="w-2.5 h-2.5" /> : null}
                        </span>
                      </button>

                      {!HEADUNIT_PUSH_ENABLED && (
                        <p
                          data-testid="hero-export-sideload-note"
                          className="text-[11px] font-medium text-ink-secondary leading-tight px-0.5"
                        >
                          {isFr
                            ? 'Garmin / Wahoo : téléchargez le .FIT ci-dessous'
                            : 'Garmin / Wahoo: download .FIT below'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {exportActions.map((action) => (
                        <Button
                          key={action.id}
                          variant="ghost"
                          type="button"
                          role="menuitem"
                          onClick={action.onSelect}
                          className="w-full min-h-[46px] rounded-2xl px-2.5 py-2 bg-pod hover:bg-chip text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <IconBadge
                              theme={action.theme}
                              icon={action.icon}
                              size="md"
                              shape="circle"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-ink leading-tight break-words">
                                {action.title}
                              </div>
                              <div className="text-[11px] text-ink-muted leading-snug mt-0.5 break-words">
                                {action.sub}
                              </div>
                            </div>
                          </div>
                          {action.badge && (
                            <span className="text-[10px] font-rounded font-extrabold tnum px-2 py-0.5 rounded-full bg-card text-ink-secondary shrink-0">
                              {action.badge}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>

                    {exportFeedback && exportFeedback.kind === 'err' && (
                      <p className="mt-2 px-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {exportFeedback.msg}
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div
          ref={lowerContentRef}
          className={
            isMapFullscreen
              ? 'hidden'
              : 'mt-auto flex flex-col gap-3.5 sm:gap-4 pointer-events-auto'
          }
        >
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
                    className="h-8 py-0 px-3.5"
                  >
                    {heroBadge}
                  </Badge>
                );
              })()}

              <Badge variant="rose" size="md" icon={MapPin} className="h-8 py-0 px-3.5">
                {heroTarget}
              </Badge>

              {/* Inline Quick Pill: Luggage Load */}
              <div className="relative">
                <button
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => setActivePopover((prev) => (prev === 'load' ? null : 'load'))}
                  aria-expanded={activePopover === 'load'}
                  data-testid="hero-quick-load-pill"
                  className={`inline-flex items-center gap-1.5 rounded-full h-8 px-3.5 text-xs font-rounded font-bold transition-all tnum ${
                    activePopover === 'load'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : 'bg-card/90 dark:bg-[#161618]/90 text-ink hover:bg-card shadow-xs'
                  } ${isInteractive ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
                >
                  <Luggage className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{Number((trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0).toFixed(1))} kg</span>
                  {isInteractive && (
                    <CaretDown
                      className={`w-3 h-3 opacity-60 transition-transform ${
                        activePopover === 'load' ? 'rotate-180 opacity-100' : ''
                      }`}
                    />
                  )}
                </button>

                {activePopover === 'load' && isInteractive && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActivePopover(null)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 bottom-full mb-2.5 w-[min(19rem,calc(100vw-3rem))] z-50 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          {isFr ? 'Charge & sacoches' : 'Luggage load'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          aria-label={t('closeModalAria')}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { kg: 1.5, en: 'Light', fr: 'Léger' },
                          { kg: 4, en: 'Daypack', fr: 'Sac léger' },
                          { kg: 8, en: 'Bikepacking', fr: 'Bikepacking' },
                          { kg: 14, en: 'Heavy tour', fr: 'Voyage chargé' },
                        ].map((preset) => {
                          const currentKg = trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0;
                          const selected = Math.abs(currentKg - preset.kg) < 0.25;
                          return (
                            <button
                              key={preset.kg}
                              type="button"
                              onClick={() => {
                                onUpdateTrip?.({
                                  ...trip,
                                  physics: {
                                    ...trip.physics,
                                    gearWeightKg: preset.kg,
                                    luggageWeightKg: preset.kg,
                                  },
                                });
                                setActivePopover(null);
                              }}
                              className={`min-h-[38px] px-2.5 py-1.5 rounded-sub-pod text-left transition-all cursor-pointer ${
                                selected
                                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                  : 'bg-pod hover:bg-chip text-ink font-medium'
                              }`}
                            >
                              <div className="text-xs leading-tight">{isFr ? preset.fr : preset.en}</div>
                              <div className="text-[10.5px] opacity-75 tnum">{preset.kg} kg</div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pt-1.5 border-t border-dashed border-ink/15 dark:border-white/15 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-ink-secondary">
                          {isFr ? 'Personnalisé (kg)' : 'Custom (kg)'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={35}
                          step={0.5}
                          value={trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(35, parseFloat(e.target.value) || 0));
                            onUpdateTrip?.({
                              ...trip,
                              physics: {
                                ...trip.physics,
                                gearWeightKg: val,
                                luggageWeightKg: val,
                              },
                            });
                          }}
                          className="w-20 h-8 rounded-full bg-pod px-2.5 text-xs font-semibold text-ink text-right tnum focus:outline-none focus:ring-2 focus:ring-ink/20"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Inline Quick Pill: Trip Type */}
              <div className="relative">
                <button
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => setActivePopover((prev) => (prev === 'tripType' ? null : 'tripType'))}
                  aria-expanded={activePopover === 'tripType'}
                  data-testid="hero-quick-type-pill"
                  className={`inline-flex items-center gap-1 rounded-full h-8 px-3.5 text-xs font-rounded font-bold transition-all ${
                    activePopover === 'tripType'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                  } ${isInteractive ? 'cursor-pointer hover:brightness-95' : 'opacity-80 cursor-default'}`}
                >
                  <span>{trip.tag || 'BIKEPACKING'}</span>
                  {isInteractive && (
                    <CaretDown
                      className={`w-3 h-3 opacity-75 transition-transform ${
                        activePopover === 'tripType' ? 'rotate-180 opacity-100' : ''
                      }`}
                    />
                  )}
                </button>

                {activePopover === 'tripType' && isInteractive && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActivePopover(null)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 bottom-full mb-2.5 w-[min(17rem,calc(100vw-3rem))] z-50 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          {isFr ? 'Type de sortie' : 'Ride type'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          aria-label={t('closeModalAria')}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {[
                          { tag: 'BIKEPACKING', en: 'Bikepacking', fr: 'Bikepacking', arriveAt: false },
                          { tag: 'SPORTIVE', en: 'Big-Day / Sportive', fr: 'Grande sortie / Sportive', arriveAt: false },
                          { tag: 'COFFEE', en: 'Coffee Spin', fr: 'Sortie Café', arriveAt: false },
                          { tag: 'COMMUTE', en: 'Commute / Vélotaf', fr: 'Vélotaf / Trajet', arriveAt: true },
                        ].map((opt) => {
                          const selected = (trip.tag || 'BIKEPACKING').toUpperCase().includes(opt.tag);
                          return (
                            <button
                              key={opt.tag}
                              type="button"
                              onClick={() => {
                                onUpdateTrip?.({
                                  ...trip,
                                  tag: opt.tag,
                                  arriveAtMode: opt.arriveAt,
                                });
                                setActivePopover(null);
                              }}
                              className={`w-full min-h-[38px] px-3 py-1.5 rounded-full text-left flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                                selected
                                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                  : 'bg-pod hover:bg-chip text-ink font-medium'
                              }`}
                            >
                              <span>{isFr ? opt.fr : opt.en}</span>
                              {selected && <Check className="w-3.5 h-3.5 shrink-0 text-current" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. Trip Start Time (Hard rollout) */}
            <div className="relative col-span-2 sm:col-span-1">
              {activePopover === 'target' && isInteractive && (
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-ink">
                      {isDepartAtMode ? t('rolloutTimeLabel') : t('heroQuickTargetTitle')}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost"
                        type="button"
                        onClick={handleToggleChronometryMode}
                        className="px-2.5 py-1 rounded-full bg-pod hover:bg-chip text-[11px] font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                      >
                        {isDepartAtMode
                          ? isFr
                            ? 'Mode Arrivée'
                            : 'Arrive mode'
                          : isFr
                          ? 'Mode Départ'
                          : 'Depart mode'}
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setActivePopover(null)}
                        aria-label={t('closeModalAria')}
                        className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="time"
                      value={currentTargetGateTime}
                      onChange={(e) => handleSetDirectTargetTime(e.target.value)}
                      className="flex-1 min-h-[44px] sm:min-h-[38px] px-3.5 rounded-full bg-pod text-ink font-bold text-base sm:text-sm tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[-30, -15, 15, 30].map((delta) => (
                      <Button variant="ghost"
                        key={delta}
                        type="button"
                        onClick={() => handleNudgeTargetTime(delta)}
                        className="min-h-[44px] sm:min-h-[34px] rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink tnum transition-colors cursor-pointer"
                      >
                        {delta > 0 ? `+${delta} min` : `${delta} min`}
                      </Button>
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
                className={`h-full rounded-pod p-3 sm:p-3.5 flex flex-col justify-between min-h-[100px] sm:min-h-[112px] transition-all hover:brightness-[0.98] dark:hover:brightness-110 ${
                  isInteractive ? 'cursor-pointer select-none group' : ''
                } bg-[#faffcb] dark:bg-[#1f2203] ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] xl:text-xs font-semibold shrink-0">
                  <span className="flex items-center gap-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS['yellow-vest'].dot}`} />
                    <span className="whitespace-nowrap truncate font-bold">{t('hardRollout')}</span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 text-current transition-transform ${
                          activePopover === 'target' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                    <Clock className="w-3.5 h-3.5 text-current shrink-0" />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-col items-start justify-between gap-1 min-w-0">
                  <span className="text-xl sm:text-2xl xl:text-[26px] font-extrabold tracking-tight tnum leading-none shrink-0">
                    {timelineResult.hardDepartureTime}
                  </span>
                  <span
                    className="text-[11px] font-bold tnum break-words w-full text-left min-w-0 leading-tight"
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
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <MapIcon className={`w-3.5 h-3.5 shrink-0 text-beacon-red dark:text-rose-400 dual-tone-rose ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                      {t('heroQuickRouteTitle')}
                    </span>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {isRadiusMode ? (
                    <div className="rounded-2xl px-3.5 py-2.5 mb-2.5 bg-pod text-[11px] text-ink-secondary leading-snug">
                      <div className="font-bold text-ink mb-0.5">
                        {trip.route.origin || 'Nantes'}
                      </div>
                      <div className="text-[11px] tnum">
                        {t('radiusLoopReachSub', {
                          loop: Math.round((loopRadiusMeters / 1000) * 10) / 10,
                          oneWay: trip.route.distanceKm,
                        })}
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost"
                      type="button"
                      onClick={handleFlipRouteDirection}
                      className={`w-full min-h-[44px] rounded-full px-4 py-2.5 mb-2.5 text-left flex items-center gap-2.5 transition-all cursor-pointer ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <ArrowsLeftRight className="w-4 h-4 shrink-0 text-current" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{t('heroFlipReturnBtn')}</div>
                        <div className="text-[11px] opacity-80 leading-snug mt-0.5">{t('heroFlipReturnSub')}</div>
                      </div>
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {[-5, -1].map((d) => (
                      <Button variant="ghost"
                        key={d}
                        type="button"
                        onClick={() => handleSetDistanceKm((trip.route.distanceKm || 10) + d)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink tnum cursor-pointer"
                      >
                        {d}
                      </Button>
                    ))}
                    <div className="flex-1 flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[36px] px-3 rounded-full bg-pod focus-within:ring-2 focus-within:ring-ink dark:focus-within:ring-white">
                      <input
                        type="number"
                        min={2}
                        max={350}
                        step={0.5}
                        value={trip.route.distanceKm}
                        onChange={(e) => handleSetDistanceKm(parseFloat(e.target.value))}
                        className="w-12 text-center bg-transparent text-base sm:text-xs font-bold text-ink tnum focus:outline-none"
                      />
                      <span className="text-[11px] text-ink-muted">km</span>
                    </div>
                    {[1, 5].map((d) => (
                      <Button variant="ghost"
                        key={d}
                        type="button"
                        onClick={() => handleSetDistanceKm((trip.route.distanceKm || 10) + d)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink tnum cursor-pointer"
                      >
                        +{d}
                      </Button>
                    ))}
                  </div>

                  {onUploadGpxFile && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-ink/15 dark:border-white/15">
                      <input
                        ref={gpxInputRef}
                        type="file"
                        accept=".gpx,.tcx,.fit,application/gpx+xml,text/xml,application/xml,application/octet-stream"
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
                      <Button variant="ghost"
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
                      </Button>

                      <div className="flex items-center gap-1.5 mt-2">
                        <Button variant="primary"
                          type="button"
                          onClick={() => {
                            const gpxSpecs = riderSpecs ?? loadRiderBikeSpecs();
                            downloadTripGpx(trip, {
                              ftpWatts: gpxSpecs.ftpWatts,
                              carbTargetGPerHr: gpxSpecs.carbTargetGPerHr,
                              carbPacingMode: gpxSpecs.carbPacingMode,
                              riderLevel: gpxSpecs.riderLevel,
                              nutritionPreference: gpxSpecs.nutritionPreference,
                            });
                            setActivePopover(null);
                          }}
                          className={`flex-1 h-8 px-3 rounded-full bg-volt text-[#4d5200] ring-1 ring-inset ring-[#a3b300] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-xs`}
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span className="break-words leading-tight">
                            {t('exportGpxBtn')}
                          </span>
                        </Button>
                        <Button variant="ghost"
                          type="button"
                          onClick={() => {
                            const fitSpecs = riderSpecs ?? loadRiderBikeSpecs();
                            downloadTripFit(trip, {
                              includeFuelingCues: includeFitFuelCues,
                              includeClimbCues: includeFitFuelCues,
                              lang,
                              ftpWatts: fitSpecs.ftpWatts,
                              carbTargetGPerHr: fitSpecs.carbTargetGPerHr,
                              carbPacingMode: fitSpecs.carbPacingMode,
                              riderLevel: fitSpecs.riderLevel,
                              nutritionPreference: fitSpecs.nutritionPreference,
                            });
                            setActivePopover(null);
                          }}
                          className={`h-8 px-3 rounded-full bg-pod hover:bg-chip text-xs font-bold text-ink flex items-center justify-center gap-1 transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                        >
                          <Download className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.amber.primary}`} />
                          <span>.FIT</span>
                        </Button>
                      </div>

                      {onOpenStageSlicer &&
                        trip.route.coordinates &&
                        trip.route.coordinates.length >= 2 &&
                        (trip.route.distanceKm >= 20 || (trip.stages && trip.stages.length > 1)) && (
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              setActivePopover(null);
                              onOpenStageSlicer();
                            }}
                            className={`mt-2 w-full h-8 px-3.5 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                          >
                            <Path className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.emerald.primary}`} />
                            <span>
                              {trip.stages && trip.stages.length > 1
                                ? isFr
                                  ? 'Ajuster les étapes multi-jours'
                                  : 'Edit multi-day stage cuts'
                                : isFr
                                ? 'Découper en plusieurs jours'
                                : 'Split into multi-day stages'}
                            </span>
                          </Button>
                        )}
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
                className={`h-full rounded-pod p-3 sm:p-3.5 bg-pod dark:bg-[#161618] text-ink flex flex-col justify-between min-h-[100px] sm:min-h-[112px] transition-all ${
                  activePopover === 'route'
                    ? 'ring-2 ring-inset ring-ink/35 dark:ring-white/35'
                    : 'hover:bg-chip/60'
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
                <div className="mt-auto pt-2 flex flex-col items-start justify-between gap-1 min-w-0">
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-xl sm:text-2xl xl:text-[26px] font-bold tracking-tight tnum leading-none text-ink">
                      {trip.route.distanceKm}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">km</span>
                  </div>
                  <span
                    className="text-[11px] font-medium text-ink-muted break-words w-full text-left min-w-0 leading-tight"
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
                <div className="absolute right-0 lg:left-0 lg:right-auto bottom-full mb-2.5 w-[min(21.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card dark:bg-[#161618] ring-1 ring-inset ring-ink/10 dark:ring-white/15 shadow-2xl animate-apple-popover">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-ink">{t('heroQuickPaceTitle')}</span>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Explicit Moving vs Buffer Time Breakdown Box */}
                  <div className="p-3 rounded-2xl bg-pod mb-2.5 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-ink-secondary">
                      <span>{isFr ? 'Temps en selle (hors pauses) :' : 'Saddle time (excl. pauses):'}</span>
                      <span className="font-bold text-ink tnum">{formatTimeHHMM(movingMinutes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-secondary">
                      <span>{isFr ? 'Marge pauses & imprévus :' : 'Pause & buffer allowance:'}</span>
                      <span className={`font-bold tnum ${CHIP_TOKENS.emerald.primary}`}>+{bufferMinutes} min</span>
                    </div>
                    <div className="lane-divider my-1" aria-hidden="true" />
                    <div className="pt-0.5 flex items-center justify-between font-semibold text-ink">
                      <span>{isFr ? 'Durée totale estimée :' : 'Total elapsed time:'}</span>
                      <span className="font-bold tnum">{formatTimeHHMM(totalElapsedMinutes)}</span>
                    </div>
                  </div>

                  {/* Hold Speed vs Hold Effort Toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-pod mb-3">
                    <Button variant="ghost"
                      type="button"
                      onClick={() => handleUpdatePacing({ pacingMode: 'speed' })}
                      className={`min-h-[44px] sm:min-h-[34px] py-1.5 px-3 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        trip.route.pacingMode !== 'effort'
                          ? 'bg-card text-ink shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('pacingHoldSpeed')}
                    </Button>
                    <Button variant="ghost"
                      type="button"
                      onClick={() =>
                        handleUpdatePacing({
                          pacingMode: 'effort',
                          targetEffortWatts:
                            trip.route.targetEffortWatts || Math.round(physicsResult.legWatts || 160),
                        })
                      }
                      className={`min-h-[44px] sm:min-h-[34px] py-1.5 px-3 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        trip.route.pacingMode === 'effort'
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('pacingHoldEffort')}
                    </Button>
                  </div>

                  {trip.route.pacingMode === 'effort' ? (
                    (() => {
                      const ftpWatts = Math.max(80, Math.round(physicsResult.ftpWatts || 210));
                      const currentWatts = trip.route.targetEffortWatts || 160;
                      const currentFtpPct = Math.round((currentWatts / ftpWatts) * 100);
                      const clampedFtpPct = Math.max(45, Math.min(120, currentFtpPct));
                      return (
                        <div className="space-y-2.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-lg font-bold tnum text-ink">
                              {currentWatts} W{' '}
                              <span className="text-xs font-semibold text-ink-secondary">
                                ({currentFtpPct}% FTP)
                              </span>
                            </span>
                            <span className="text-[11px] tnum text-ink-secondary">
                              → {physicsResult.effectiveSpeedKmH} km/h · {physicsResult.powerZone}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={80}
                            max={450}
                            step={5}
                            value={currentWatts}
                            onChange={(e) =>
                              handleUpdatePacing({ targetEffortWatts: parseInt(e.target.value, 10) || 160 })
                            }
                            aria-label={isFr ? 'Puissance cible (Watts)' : 'Target power (Watts)'}
                            className="peloton-slider w-full cursor-pointer"
                          />
                          <div className="space-y-1.5 pt-1 border-t border-dashed border-ink/15 dark:border-white/15">
                            <div className="flex items-center justify-between text-[11px] text-ink-secondary tnum">
                              <span className="font-semibold">
                                {isFr ? 'Allure % FTP' : '% FTP Pacing'}
                              </span>
                              <span>
                                {currentFtpPct}% · {ftpWatts} W FTP
                              </span>
                            </div>
                            <input
                              type="range"
                              min={45}
                              max={120}
                              step={1}
                              value={clampedFtpPct}
                              onChange={(e) => {
                                const pct = parseInt(e.target.value, 10) || 75;
                                const nextWatts = Math.max(80, Math.min(450, Math.round((pct / 100) * ftpWatts)));
                                handleUpdatePacing({ targetEffortWatts: nextWatts });
                              }}
                              aria-label={isFr ? 'Allure cible (% FTP)' : 'Target pacing (% FTP)'}
                              className="peloton-slider w-full cursor-pointer"
                            />
                            <div className="flex items-center justify-between gap-1.5">
                              {[65, 75, 85, 95].map((pct) => {
                                const active = Math.abs(currentFtpPct - pct) <= 1;
                                return (
                                  <Button
                                    variant="ghost"
                                    key={pct}
                                    type="button"
                                    onClick={() =>
                                      handleUpdatePacing({
                                        targetEffortWatts: Math.max(
                                          80,
                                          Math.min(450, Math.round((pct / 100) * ftpWatts))
                                        ),
                                      })
                                    }
                                    className={`flex-1 min-h-[44px] sm:min-h-[34px] rounded-full text-[11px] font-semibold tnum cursor-pointer ${
                                      active
                                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                                        : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                                    }`}
                                  >
                                    {pct}%
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            {[-15, -5, 5, 15].map((dw) => (
                              <Button variant="ghost"
                                key={dw}
                                type="button"
                                onClick={() =>
                                  handleUpdatePacing({
                                    targetEffortWatts: Math.max(
                                      80,
                                      Math.min(450, currentWatts + dw)
                                    ),
                                  })
                                }
                                className="flex-1 min-h-[44px] sm:min-h-[34px] rounded-full bg-pod hover:bg-chip text-[11px] font-semibold text-ink tnum cursor-pointer"
                              >
                                {dw > 0 ? `+${dw} W` : `${dw} W`}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-bold tnum text-ink">
                          {trip.route.targetSpeedKmH} km/h
                        </span>
                        <span className="text-[11px] tnum text-ink-secondary">
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
                          <Button variant="ghost"
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
                            className="flex-1 min-h-[44px] sm:min-h-[34px] rounded-full bg-pod hover:bg-chip text-[11px] font-semibold text-ink tnum cursor-pointer"
                          >
                            {dv > 0 ? `+${dv}` : `${dv}`} km/h
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Didactic Effort Explanation */}
                  <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-ink-muted leading-snug">
                    <BadgeInfo className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-secondary" />
                    <span>{wattsDidacticNote}</span>
                  </p>

                  {onOpenConfigurator && (
                    <Button variant="ghost"
                      type="button"
                      onClick={() => {
                        setActivePopover(null);
                        onOpenConfigurator();
                      }}
                      className={`mt-2.5 w-full min-h-[44px] sm:min-h-[36px] px-3 rounded-full bg-pod hover:bg-chip flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
                      <span>{t('heroOpenFullConfigBtn')}</span>
                    </Button>
                  )}
                </div>
              )}

              <div
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-expanded={isInteractive ? activePopover === 'pace' : undefined}
                title={
                  isFr
                    ? `En selle : ${formatTimeHHMM(movingMinutes)} (hors pauses) + ${bufferMinutes} min pauses = ${formatTimeHHMM(totalElapsedMinutes)} total`
                    : `Saddle time: ${formatTimeHHMM(movingMinutes)} (excl. pauses) + ${bufferMinutes} min buffer = ${formatTimeHHMM(totalElapsedMinutes)} total`
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
                className={`h-full rounded-pod p-3 sm:p-3.5 bg-pod dark:bg-[#161618] text-ink flex flex-col justify-between min-h-[100px] sm:min-h-[112px] transition-all ${
                  activePopover === 'pace'
                    ? 'ring-2 ring-inset ring-ink/35 dark:ring-white/35'
                    : 'hover:bg-chip/60'
                } ${isInteractive ? 'cursor-pointer select-none group' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="break-words">
                    {isFr ? 'Temps de selle' : 'Saddle time'}
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
                <div className="mt-auto pt-2 flex flex-col items-start justify-between gap-1 min-w-0">
                  <span className="text-xl sm:text-2xl xl:text-[26px] font-bold tracking-tight tnum leading-none text-ink shrink-0">
                    {formatTimeHHMM(movingMinutes)}
                  </span>
                  <span
                    className={`text-[11px] font-medium tnum break-words w-full text-left min-w-0 leading-tight ${CHIP_TOKENS.emerald.primary}`}
                  >
                    +{bufferMinutes} min → {formatTimeHHMM(totalElapsedMinutes)} {isFr ? 'tot.' : 'total'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Energy Burned / Fuel Units (Jumps to Fuel & Resupply Tab) */}
            {(() => {
              const totalFuelUnits = Math.max(1, Math.round(dynamicCarb.targetOnBikeCarbsG / 20));
              const fuelUnitsPerHr = Math.max(1, Math.round(dynamicCarb.effectiveHourlyRateG / 20));
              const isShortFuelRide = movingMinutes < 45;
              const unitWord = isFr
                ? totalFuelUnits === 1
                  ? 'unité'
                  : 'unités'
                : totalFuelUnits === 1
                ? 'unit'
                : 'units';
              const unitPerHrWord = isFr
                ? fuelUnitsPerHr === 1
                  ? 'unité/h'
                  : 'unités/h'
                : fuelUnitsPerHr === 1
                ? 'unit/h'
                : 'units/h';

              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActivePopover(null);
                    onJumpToSection?.('bento-nutrition');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePopover(null);
                      onJumpToSection?.('bento-nutrition');
                    }
                  }}
                  title={isFr ? 'Ouvrir Nutrition & Ravito' : 'Open Fuel & Resupply'}
                  className="h-full rounded-pod p-3 sm:p-3.5 bg-pod dark:bg-[#161618] hover:bg-chip/60 text-ink flex flex-col justify-between min-h-[100px] sm:min-h-[112px] transition-all cursor-pointer select-none group"
                >
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
                  <div className="mt-auto pt-2 flex flex-col items-start justify-between gap-1 min-w-0">
                    <div className="flex items-baseline gap-1 flex-wrap min-w-0">
                      <span className="text-lg sm:text-xl xl:text-[22px] font-bold tracking-tight tnum leading-none text-ink">
                        {effectiveSpecs.telemetryMode === 'quantitative'
                          ? totalKcal
                          : effectiveSpecs.telemetryMode === 'fuel-first'
                          ? totalFuelUnits
                          : isFr
                          ? 'Régulier'
                          : 'Steady'}
                      </span>
                      {effectiveSpecs.telemetryMode === 'quantitative' ? (
                        <span className="text-xs font-medium text-ink-muted">kcal</span>
                      ) : effectiveSpecs.telemetryMode === 'fuel-first' ? (
                        <span className="text-xs font-medium text-ink-muted">{unitWord}</span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-medium text-ink-muted tnum break-words w-full text-left min-w-0 leading-tight">
                      {effectiveSpecs.telemetryMode === 'quantitative'
                        ? `${dynamicCarb.effectiveHourlyRateG} g/h ${isFr ? 'ravito' : 'carbs'}`
                        : effectiveSpecs.telemetryMode === 'fuel-first'
                        ? isShortFuelRide
                          ? isFr
                            ? 'Eau seule suffit'
                            : 'Water only needed'
                          : `${fuelUnitsPerHr} ${unitPerHrWord}`
                        : isFr
                        ? '1 gorgée / 20 min'
                        : 'Sip every 20 min'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 5. Elevation & Surface (Jumps to Weather & Effort Tab) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setActivePopover(null);
                onJumpToSection?.('bento-physics');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActivePopover(null);
                  onJumpToSection?.('bento-physics');
                }
              }}
              title={isFr ? 'Ouvrir Météo & Effort' : 'Open Weather & Effort'}
              className="h-full rounded-pod p-3 sm:p-3.5 bg-pod dark:bg-[#161618] hover:bg-chip/60 text-ink flex flex-col justify-between min-h-[100px] sm:min-h-[112px] transition-all cursor-pointer select-none group"
            >
              <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                <span className="break-words">{t('elevationGain') || 'Elevation gain'}</span>
                <Mountains className={`w-4 h-4 shrink-0 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>
              <div className="mt-auto pt-2 flex flex-col items-start justify-between gap-1.5 min-w-0">
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-xl sm:text-2xl xl:text-[26px] font-bold tracking-tight tnum leading-none text-ink">
                    +{elevationGainM}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">m</span>
                </div>
                <div className="w-full space-y-1">
                  <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/10 dark:bg-white/10">
                    <div
                      style={{ width: `${surfaceBreakdown.pavedPct}%` }}
                      className="h-full bg-sky-500 dark:bg-sky-400"
                    />
                    <div
                      style={{ width: `${surfaceBreakdown.gravelPct}%` }}
                      className="h-full bg-amber-500 dark:bg-amber-400"
                    />
                    <div
                      style={{ width: `${surfaceBreakdown.singletrackPct}%` }}
                      className="h-full bg-rose-500 dark:bg-rose-400"
                    />
                  </div>
                  <span className="text-[10.5px] font-medium text-ink-muted tnum break-words w-full text-left min-w-0 leading-tight block">
                    {surfaceBreakdown.pavedPct}% {isFr ? 'bitume' : 'paved'} ·{' '}
                    {surfaceBreakdown.gravelPct + surfaceBreakdown.singletrackPct}%{' '}
                    {isFr ? 'gravel/sentier' : 'unpaved'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isMapFullscreen && (
          <div className="mt-auto flex items-end justify-end pointer-events-none">
            <div className="pointer-events-auto inline-flex flex-col items-center gap-1 p-1 rounded-full bg-card/95 dark:bg-[#161618]/95 backdrop-blur-md text-ink dark:text-white shadow-md select-none">
              <Button
                variant="ghost"
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                aria-label={isFr ? 'Zoomer' : 'Zoom in'}
                title={isFr ? 'Zoomer' : 'Zoom in'}
                className={`w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`}
              >
                <Plus className="w-4 h-4 shrink-0 text-current" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                aria-label={isFr ? 'Dézoomer' : 'Zoom out'}
                title={isFr ? 'Dézoomer' : 'Zoom out'}
                className={`w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`}
              >
                <Minus className="w-4 h-4 shrink-0 text-current" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  const {
                    isRadiusMode: rMode,
                    radiusCenter: rCenter,
                    activeCoordinates: aCoords,
                  } = latestRouteRef.current;
                  fitRouteInClearArea(rMode, rCenter, aCoords);
                }}
                aria-label={isFr ? 'Recentrer sur l’itinéraire' : 'Fit route bounds'}
                title={isFr ? 'Recentrer sur l’itinéraire' : 'Fit route bounds'}
                className={`w-11 h-11 sm:w-9 sm:h-9 aspect-square rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 hover:bg-pod dark:hover:bg-white/10 text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Compass className="w-4 h-4 shrink-0 text-current" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
