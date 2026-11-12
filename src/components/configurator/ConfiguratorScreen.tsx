import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowsLeftRight,
  Clock,
  Lightning,
  ShieldCheck,
  SpinnerGap,
  CheckCircle,
  Backpack,
  Briefcase,
  Compass,
  ArrowsClockwise,
  WarningCircle,
  Coffee,
  Check,
  SlidersHorizontal,
  Info,
  Plus,
  Upload,
  MapPin,
  X,
  Map as MapIcon,
  Settings,
  Bicycle,
  Mountain,
} from '@/components/icons';
import {
  fetchHourlyWeather,
  checkForecastHorizon,
  getLocalTodayIso,
  computeRouteBearing,
} from '../../services/weatherService';
import { TripProfile, TripStage, RouteWaypoint, generateTripChecklist } from '../../types/trip';
import {
  downsampleCoordinates,
  switchActiveStage,
  addNextStage,
  removeStage,
  getExpeditionTotals,
  addDaysToIso,
} from '../../utils/stageManager';
import { ParameterTabs } from './ParameterTabs';
import { PresetRuleCard } from './PresetRuleCard';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { InteractiveRouteMap } from './InteractiveRouteMap';
import { TourOverviewCard } from './TourOverviewCard';
import { ElevationTerrainStrip } from '../common/ElevationTerrainStrip';
import { POPULAR_CYCLING_HUBS } from '../../services/locationService';
import { parseGpxFileContent } from '../../utils/gpxParser';
import { computeSurfaceBreakdown, SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useOsmSurface } from '../../services/osmSurfaceService';
import { getActiveBike, loadRiderBikeSpecs, getEffectiveRiderSpecs } from '../../utils/specsStorage';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { subtractMinutesFromTime, addMinutesToTime } from '../../utils/nutrition';
import { calculateAutoBikeRoute } from '../../utils/routing';
import { getTripArchetype } from '../dashboard/TimelineContextualBanner';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { Chip } from '../common/Chip';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import {
  ARCHETYPE_CHIP_DEFINITIONS,
  ArchetypeMode,
  getArchetypeFromTag,
  toggleArchetypeChip,
  applyRuleSettingChange,
  getChipsExtraBufferMinutes,
  CHIP_ICONS,
  findChipDef,
} from '../../utils/archetypeChips';

const GripDotsIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="5" cy="3.5" r="1.3" />
    <circle cx="11" cy="3.5" r="1.3" />
    <circle cx="5" cy="8" r="1.3" />
    <circle cx="11" cy="8" r="1.3" />
    <circle cx="5" cy="12.5" r="1.3" />
    <circle cx="11" cy="12.5" r="1.3" />
  </svg>
);

interface ConfiguratorScreenProps {
  initialTrip: TripProfile;
  isNew: boolean;
  onSave: (trip: TripProfile) => void;
  onAutoSync?: (trip: TripProfile) => void;
  onCancel: () => void;
  onLaunch: (trip: TripProfile) => void;
}

export const ConfiguratorScreen: React.FC<ConfiguratorScreenProps> = ({
  initialTrip,
  isNew,
  onSave,
  onAutoSync,
  onCancel,
  onLaunch,
}) => {
  const { lang, t } = useTranslation();
  const initialSnapshotRef = useRef<TripProfile>(JSON.parse(JSON.stringify(initialTrip)));
  const [hasModified, setHasModified] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const [trip, setTrip] = useState<TripProfile>(initialTrip);
  const tripRef = React.useRef<TripProfile>(trip);
  tripRef.current = trip;

  const commitTripInternal = (
    updater: TripProfile | ((prev: TripProfile) => TripProfile),
    markModified = true
  ): TripProfile => {
    const resolved = typeof updater === 'function' ? updater(tripRef.current) : updater;

    let syncedStages = resolved.stages;
    if (resolved.stages && resolved.stages.length > 0) {
      const activeIdx = Math.max(0, Math.min(resolved.activeStageIndex ?? 0, resolved.stages.length - 1));
      const targetMode: 'arrive' | 'depart' | undefined =
        resolved.arriveAtMode !== undefined
          ? (resolved.arriveAtMode ? 'arrive' : 'depart')
          : resolved.stages[activeIdx].targetMode;

      syncedStages = resolved.stages.map((st, idx) => {
        if (idx === activeIdx) {
          return {
            ...st,
            departureDate: resolved.departureDate || st.departureDate,
            departureTime: resolved.departureTime || st.departureTime,
            targetMode,
            route: {
              ...st.route,
              ...resolved.route,
              coordinates: downsampleCoordinates(resolved.route?.coordinates),
              waypoints: resolved.route?.waypoints ? resolved.route.waypoints.map((w) => ({ ...w })) : undefined,
            },
            office: { ...resolved.office },
            weather: { ...resolved.weather },
            customChips: [...(resolved.customChips || [])],
          };
        }
        return st;
      });
    }

    const stamped: TripProfile = {
      ...resolved,
      stages: syncedStages,
      updatedAt: new Date().toISOString(),
    };
    tripRef.current = stamped;
    setTrip(stamped);
    if (markModified) {
      setHasModified(true);
    }
    onAutoSync?.(stamped);
    return stamped;
  };

  const commitTrip = (updater: TripProfile | ((prev: TripProfile) => TripProfile)): TripProfile =>
    commitTripInternal(updater, true);

  const [originInput, setOriginInput] = useState(trip.route.origin || 'Nantes');
  const initialDest = trip.route.destination || trip.office.gateName || 'Saint-Nazaire';
  const isInitialDestRadius = Boolean(initialDest.match(/loop radius|rayon boucle/i));
  const [destInput, setDestInput] = useState(isInitialDestRadius ? 'Saint-Nazaire' : initialDest);
  const lastCorridorDestRef = useRef<string>(isInitialDestRadius ? 'Saint-Nazaire' : initialDest);
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(() => {
    if (initialTrip.route?.coordinates && initialTrip.route.coordinates.length > 0) {
      return initialTrip.route.coordinates[0];
    }
    return null;
  });
  const [destCoords, setDestCoords] = useState<[number, number] | null>(() => {
    if (initialTrip.route?.coordinates && initialTrip.route.coordinates.length > 1) {
      return initialTrip.route.coordinates[initialTrip.route.coordinates.length - 1];
    }
    return null;
  });
  const [waypoints, setWaypoints] = useState<
    Array<{ id: string; name: string; coordinates?: [number, number] | null; distanceFromStartKm?: number }>
  >(() => {
    if (initialTrip.route?.waypoints && initialTrip.route.waypoints.length > 0) {
      return initialTrip.route.waypoints.map((w, idx) => ({
        id: w.id || `wp-${Date.now()}-${idx}`,
        name: w.name,
        coordinates: w.coordinates || null,
        distanceFromStartKm: w.distanceFromStartKm,
      }));
    }
    return [];
  });
  const [draggedWaypointIdx, setDraggedWaypointIdx] = useState<number | null>(null);
  const [isMultiDayFormat, setIsMultiDayFormat] = useState<boolean>(() => {
    return Boolean(initialTrip.stages && initialTrip.stages.length > 1);
  });
  const [isMapCollapsed, setIsMapCollapsed] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeSuccess, setRouteSuccess] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isUpdatingWeather, setIsUpdatingWeather] = useState(false);
  const [weatherFeedback, setWeatherFeedback] = useState<{
    message: string;
    status: boolean;
    isError?: boolean;
  } | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [activeStep, setActiveStep] = useState<'date-time' | 'trip-style' | 'cycling-pace'>('date-time');
  const [isArriveAtMode, setIsArriveAtMode] = useState<boolean>(trip.arriveAtMode !== false);
  const [routeGenMode, setRouteGenMode] = useState<'corridor' | 'manual-radius' | 'gpx'>(() => {
    const initialMode = getArchetypeFromTag(initialTrip.tag, initialTrip.name);
    if (initialMode === 'BIKEPACKING') return 'corridor';
    if (initialTrip.route?.routeMode === 'gpx' || initialTrip.route?.gpxFileName) return 'gpx';
    if (initialTrip.route?.routeMode === 'manual-radius' || initialTrip.route?.radiusMeters) return 'manual-radius';
    return 'corridor';
  });
  const gpxConfigInputRef = React.useRef<HTMLInputElement>(null);
  const [activeSurfaceSegmentId, setActiveSurfaceSegmentId] = useState<string | null>(null);

  const isFr = lang === 'fr';

  const canQueryOsmSurface =
    trip.route.routeMode !== 'manual-radius' &&
    Boolean(trip.route.coordinates && trip.route.coordinates.length >= 2);
  const {
    osmData,
    status: osmStatus,
    error: osmError,
  } = useOsmSurface(trip.route.coordinates, trip.route.distanceKm, canQueryOsmSurface);

  const surfaceBreakdown = useMemo(
    () =>
      computeSurfaceBreakdown(trip.route, {
        crr: trip.physics.crr,
        riderWeightKg: trip.physics.riderWeightKg,
        bikeWeightKg: trip.physics.bikeWeightKg,
        luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg,
        customChips: trip.customChips ?? [],
        osmData,
        isLoadingOsm: canQueryOsmSurface && osmStatus === 'loading',
        osmError,
      }),
    [
      trip.route,
      trip.physics.crr,
      trip.physics.riderWeightKg,
      trip.physics.bikeWeightKg,
      trip.physics.luggageWeightKg,
      trip.physics.gearWeightKg,
      trip.customChips,
      osmData,
      canQueryOsmSurface,
      osmStatus,
      osmError,
    ]
  );

  useEffect(() => {
    if (
      initialTrip.id !== tripRef.current.id ||
      initialTrip.updatedAt !== tripRef.current.updatedAt
    ) {
      const idChanged = initialTrip.id !== tripRef.current.id;
      tripRef.current = initialTrip;
      setTrip(initialTrip);
      if (idChanged) {
        setIsArriveAtMode(initialTrip.arriveAtMode !== false);
        setOriginInput(initialTrip.route.origin || 'Nantes');
        setDestInput(initialTrip.route.destination || initialTrip.office.gateName || 'Saint-Nazaire');
        const nextArchetype = getArchetypeFromTag(initialTrip.tag, initialTrip.name);
        if (nextArchetype === 'BIKEPACKING') {
          setRouteGenMode('corridor');
        } else if (initialTrip.route?.routeMode === 'gpx' || initialTrip.route?.gpxFileName) {
          setRouteGenMode('gpx');
        } else if (initialTrip.route?.routeMode === 'manual-radius' || initialTrip.route?.radiusMeters) {
          setRouteGenMode('manual-radius');
        } else {
          setRouteGenMode('corridor');
        }
        if (initialTrip.route?.coordinates && initialTrip.route.coordinates.length > 1) {
          setOriginCoords(initialTrip.route.coordinates[0]);
          setDestCoords(initialTrip.route.coordinates[initialTrip.route.coordinates.length - 1]);
        } else {
          setOriginCoords(initialTrip.route?.originCoords || null);
          setDestCoords(null);
        }
        if (initialTrip.route?.waypoints) {
          setWaypoints(
            initialTrip.route.waypoints.map((w, idx) => ({
              id: w.id || `wp-${Date.now()}-${idx}`,
              name: w.name,
              coordinates: w.coordinates || null,
              distanceFromStartKm: w.distanceFromStartKm,
            }))
          );
        } else {
          setWaypoints([]);
        }
        setIsMultiDayFormat(Boolean(initialTrip.stages && initialTrip.stages.length > 1));
      }
    }
  }, [initialTrip]);

  const handleSwapCorridor = () => {
    const prevOrigin = originInput;
    const prevDest = destInput;
    const prevOriginCoords = originCoords;
    const prevDestCoords = destCoords;
    const reversedWaypoints = [...waypoints].reverse();

    setOriginInput(prevDest);
    setDestInput(prevOrigin);
    setOriginCoords(prevDestCoords);
    setDestCoords(prevOriginCoords);
    setWaypoints(reversedWaypoints);
    setRouteSuccess(false);
    setRouteError(null);

    commitTrip((prev) => {
      const reversedCoords = prev.route.coordinates ? [...prev.route.coordinates].reverse() : undefined;
      const curDir = prev.weather.windDirection;
      const nextWindDir =
        curDir === 'headwind' ? 'tailwind' : curDir === 'tailwind' ? 'headwind' : curDir;
      const nextIsHeadwind =
        curDir === 'tailwind' ? true : curDir === 'headwind' ? false : prev.weather.isHeadwindActive;
      const nextDeg = ((prev.weather.windDirectionDegrees || 0) + 180) % 360;
      const nextEffectiveWind =
        typeof prev.weather.effectiveHeadwindKmH === 'number'
          ? Number((-prev.weather.effectiveHeadwindKmH).toFixed(1))
          : undefined;

      return {
        ...prev,
        route: {
          ...prev.route,
          origin: prevDest,
          destination: prevOrigin,
          coordinates: reversedCoords,
          waypoints: reversedWaypoints,
        },
        weather: {
          ...prev.weather,
          windDirection: nextWindDir,
          isHeadwindActive: nextIsHeadwind,
          windDirectionDegrees: nextDeg,
          effectiveHeadwindKmH: nextEffectiveWind,
        },
      };
    });
  };

  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const riderSpecs = useMemo(() => loadRiderBikeSpecs(), []);
  const effectiveSpecs = useMemo(() => getEffectiveRiderSpecs(riderSpecs), [riderSpecs]);
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather, lang, effectiveSpecs.ftpWatts);
  const timelineResult = calculateReverseTimeline(
    trip.route,
    trip.office,
    trip.weather,
    trip.tag,
    trip.route.destination,
    lang,
    extraBufferMinutes,
    trip.customChips || [],
    {
      effectiveSpeedKmH: physicsResult.effectiveSpeedKmH,
      calmSpeedKmH: physicsResult.calmSpeedKmH,
      arriveAtMode: isArriveAtMode,
      departureTime: trip.departureTime,
      pinnedAmenities: trip.pinnedAmenities,
    }
  );
  const archetype = getTripArchetype(trip.tag, trip.name);
  const activeArchetypeMode = getArchetypeFromTag(trip.tag, trip.name);
  const localizedMeta = getLocalizedTripMeta(trip, lang);

  const effectiveDateStr = trip.departureDate || getLocalTodayIso();
  const forecastHorizon = checkForecastHorizon(effectiveDateStr);
  const daysOffset = forecastHorizon.daysOffset;
  const formattedDaysOffset =
    daysOffset === 0
      ? (lang === 'fr' ? 'Aujourd’hui' : 'Today')
      : daysOffset === 1
      ? (lang === 'fr' ? 'Demain' : 'Tomorrow')
      : daysOffset > 1
      ? (lang === 'fr' ? `Dans ${daysOffset} jours` : `In ${daysOffset} days`)
      : (lang === 'fr' ? `Passé (${Math.abs(daysOffset)} j)` : `${Math.abs(daysOffset)} days ago`);

  const handleCalculateRoute = async (customWaypoints?: typeof waypoints) => {
    if (!originInput.trim() || !destInput.trim()) return;
    if (destInput.match(/loop radius|rayon boucle/i)) {
      setRouteError(isFr ? 'Veuillez saisir une destination valide pour le corridor.' : 'Please enter a valid destination for corridor routing.');
      return;
    }
    setIsRouting(true);
    setRouteError(null);
    setRouteSuccess(false);

    const activeWps = customWaypoints !== undefined ? customWaypoints : waypoints;

    try {
      const result = await calculateAutoBikeRoute(
        originInput,
        destInput,
        originCoords,
        destCoords,
        activeWps
      );
      if (result) {
        if (result.resolvedWaypoints) {
          setWaypoints(result.resolvedWaypoints);
        }
        commitTrip((prev) => {
          const hasMultipleStages = Boolean(prev.stages && prev.stages.length > 1);
          let newName = prev.name;
          const isTitleBlank = !prev.name || !prev.name.trim();
          if (!hasMultipleStages) {
            if (isTitleBlank) {
              const hasWps = (result.resolvedWaypoints || activeWps).length > 0;
              const viaSummary = hasWps
                ? ` (via ${(result.resolvedWaypoints || activeWps).map((w) => w.name.split(',')[0].trim()).join(', ')})`
                : '';
              newName = lang === 'fr'
                ? `${originInput.split(',')[0].trim()} → ${destInput.split(',')[0].trim()}${viaSummary}`
                : `${originInput.split(',')[0].trim()} → ${destInput.split(',')[0].trim()}${viaSummary} Tour`;
            }
          } else {
            const isSingleStagePattern = isTitleBlank;
            if (isSingleStagePattern) {
              const totals = getExpeditionTotals({
                ...prev,
                route: {
                  ...prev.route,
                  origin: originInput,
                  destination: destInput,
                  distanceKm: result.distanceKm,
                  elevationGainM: Math.round(result.distanceKm * 6.5),
                  coordinates: result.coordinates,
                  waypoints: result.resolvedWaypoints || activeWps,
                },
              });
              const dayCount = prev.stages!.length;
              const daysLabel = lang === 'fr' ? `${dayCount} Jours` : `${dayCount} Days`;
              newName = `${totals.originCity || originInput} → ${totals.finalDestinationCity || destInput} (${daysLabel})`;
            }
          }

          return {
            ...prev,
            name: newName,
            route: {
              ...prev.route,
              routeMode: 'corridor',
              radiusMeters: undefined,
              gpxFileName: undefined,
              elevationProfile: undefined,
              terrainSummary: undefined,
              origin: originInput,
              destination: destInput,
              distanceKm: result.distanceKm,
              elevationGainM: Math.round(result.distanceKm * 6.5),
              coordinates: result.coordinates,
              waypoints: result.resolvedWaypoints || activeWps,
              cueSheet: result.cueSheet,
            },
          };
        });
        if (result.coordinates && result.coordinates.length > 1) {
          setOriginCoords(result.coordinates[0]);
          setDestCoords(result.coordinates[result.coordinates.length - 1]);
        }
        setRouteSuccess(true);
      }
    } catch (err: any) {
      setRouteError(err.message || t('routeErrorDefault'));
    } finally {
      setIsRouting(false);
    }
  };

  const handleAddWaypoint = () => {
    const newId = `wp-${Date.now()}`;
    const newWp = {
      id: newId,
      name: '',
      coordinates: null,
    };
    const nextWps = [...waypoints, newWp];
    setWaypoints(nextWps);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    setTimeout(() => {
      const inputElem = document.getElementById(`waypoint-${newId}`);
      if (inputElem) inputElem.focus();
    }, 50);
  };

  const handleRemoveWaypoint = (id: string) => {
    const nextWps = waypoints.filter((w) => w.id !== id);
    setWaypoints(nextWps);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    if (originInput.trim() && destInput.trim()) {
      handleCalculateRoute(nextWps);
    }
  };

  const handleUpdateWaypointName = (id: string, name: string) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name, coordinates: null } : w))
    );
    setRouteSuccess(false);
    setRouteError(null);
  };

  const handleSelectWaypointLocation = (
    id: string,
    loc: { name: string; coordinates: [number, number] }
  ) => {
    const nextWps = waypoints.map((w) =>
      w.id === id ? { ...w, name: loc.name, coordinates: loc.coordinates } : w
    );
    setWaypoints(nextWps);
    setRouteSuccess(false);
    setRouteError(null);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    if (originInput.trim() && destInput.trim()) {
      handleCalculateRoute(nextWps);
    }
  };

  const handleMoveWaypoint = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= waypoints.length) return;
    const nextWps = [...waypoints];
    const [moved] = nextWps.splice(index, 1);
    nextWps.splice(targetIdx, 0, moved);
    setWaypoints(nextWps);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    if (originInput.trim() && destInput.trim()) {
      handleCalculateRoute(nextWps);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedWaypointIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedWaypointIdx === null || draggedWaypointIdx === dropIndex) return;
    const nextWps = [...waypoints];
    const [moved] = nextWps.splice(draggedWaypointIdx, 1);
    nextWps.splice(dropIndex, 0, moved);
    setDraggedWaypointIdx(null);
    setWaypoints(nextWps);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    if (originInput.trim() && destInput.trim()) {
      handleCalculateRoute(nextWps);
    }
  };

  const handleMapClickAddWaypoint = async (coords: [number, number], reverseName?: string) => {
    const newId = `wp-${Date.now()}`;
    const defaultLabel = reverseName || `${coords[0].toFixed(4)}°N, ${coords[1].toFixed(4)}°E`;
    const newWp = {
      id: newId,
      name: defaultLabel,
      coordinates: coords,
    };
    const nextWps = [...waypoints, newWp];
    setWaypoints(nextWps);
    commitTrip((prev) => ({
      ...prev,
      route: {
        ...prev.route,
        waypoints: nextWps,
      },
    }));
    if (originInput.trim() && destInput.trim()) {
      handleCalculateRoute(nextWps);
    }
  };

  const handleSetTripFormat = (mode: 'single' | 'multi') => {
    if (mode === 'single') {
      setIsMultiDayFormat(false);
      commitTrip((prev) => {
        const activeStage =
          prev.stages && typeof prev.activeStageIndex === 'number' && prev.stages[prev.activeStageIndex]
            ? prev.stages[prev.activeStageIndex]
            : prev.stages?.[0];

        return {
          ...prev,
          stages: undefined,
          activeStageIndex: undefined,
          route: activeStage ? activeStage.route : prev.route,
        };
      });
    } else {
      setIsMultiDayFormat(true);
      commitTrip((prev) => {
        if (!prev.stages || prev.stages.length < 2) {
          return addNextStage(prev);
        }
        return prev;
      });
    }
  };

  const resolveStartHubCoords = (
    label: string,
    explicitCoords?: [number, number] | null
  ): [number, number] => {
    if (explicitCoords) return explicitCoords;
    if (trip.route.originCoords) return trip.route.originCoords;
    const normalized = (label || '').trim().toLowerCase();
    const match = POPULAR_CYCLING_HUBS.find(
      (h) => h.name.toLowerCase() === normalized || normalized.includes(h.name.toLowerCase())
    );
    if (match) return match.coordinates;
    if (trip.route.coordinates && trip.route.coordinates.length > 0) {
      return trip.route.coordinates[0];
    }
    return [47.2186, -1.5541];
  };

  const handleUpdateRadiusRoute = (
    nextOriginRaw: string,
    nextCoords: [number, number] | null,
    nextDistanceRaw: number
  ) => {
    const nextOrigin = nextOriginRaw.trim() || 'Nantes';
    const clampedKm = Math.max(5, Math.min(300, Math.round((nextDistanceRaw || 30) * 10) / 10));
    const center = resolveStartHubCoords(nextOrigin, nextCoords);
    const loopKm = Math.round((clampedKm / 2) * 10) / 10;
    const radiusMeters = Math.max(1000, Math.round((clampedKm / 2) * 1000));
    const destLabel = isFr ? `Rayon boucle ${loopKm} km` : `${loopKm} km loop radius`;

    setOriginInput(nextOriginRaw);
    if (nextCoords) setOriginCoords(nextCoords);
    setRouteError(null);

    const originShort = nextOrigin.split(',')[0].trim();
    const newName = isFr
      ? `${originShort} · Boucle de ${clampedKm} km`
      : `${originShort} · ${clampedKm} km Loop`;
    const newDesc = isFr
      ? `Sortie de ${clampedKm.toFixed(1)} km en boucle au départ de ${originShort}.`
      : `${clampedKm.toFixed(1)} km loop ride starting from ${originShort}.`;

    commitTrip((prev) => {
      const updatedDesc = prev.description
        ? prev.description.replace(/^\d+(\.\d+)?\s*km\b/i, `${clampedKm.toFixed(1)} km`)
        : newDesc;
      const shouldUpdateLoopTitle =
        !prev.name?.trim() ||
        /^.+ · (\d+(\.\d+)? km Loop|Boucle de \d+(\.\d+)? km)$/i.test(prev.name.trim());
      return {
        ...prev,
        name: shouldUpdateLoopTitle ? newName : prev.name,
        description: updatedDesc,
        route: {
          ...prev.route,
          routeMode: 'manual-radius',
          origin: nextOrigin,
          destination: destLabel,
          originCoords: center,
          radiusMeters,
          distanceKm: clampedKm,
          elevationGainM: Math.round(clampedKm * 6.5),
          coordinates: [center],
          gpxFileName: undefined,
          elevationProfile: undefined,
          terrainSummary: undefined,
        },
      };
    });
  };

  const handleConfigGpxUpload = async (file: File) => {
    if (!file) return;
    setRouteError(null);
    setRouteSuccess(false);
    try {
      const xmlText = await file.text();
      const parsed = parseGpxFileContent(xmlText, file.name);
      const curMode = getArchetypeFromTag(tripRef.current.tag, tripRef.current.name);
      setRouteGenMode(curMode === 'BIKEPACKING' ? 'corridor' : 'gpx');
      setOriginInput(parsed.originLabel);
      setDestInput(parsed.destLabel);
      if (parsed.coordinates.length > 1) {
        setOriginCoords(parsed.coordinates[0]);
        setDestCoords(parsed.coordinates[parsed.coordinates.length - 1]);
      }
      setRouteSuccess(true);

      commitTrip((prev) => {
        const bearing =
          parsed.coordinates.length >= 2
            ? computeRouteBearing(parsed.coordinates)
            : prev.weather.windDirectionDegrees || 0;
        return {
          ...prev,
          name: prev.name.trim() ? prev.name : (parsed.trackName || prev.name),
          route: {
            ...prev.route,
            routeMode: 'gpx',
            gpxFileName: file.name,
            radiusMeters: undefined,
            origin: parsed.originLabel,
            destination: parsed.destLabel,
            distanceKm: parsed.distanceKm,
            elevationGainM: parsed.elevationGainM,
            elevationLossM: parsed.elevationLossM,
            coordinates: parsed.coordinates,
            elevationProfile: parsed.elevationProfile,
            terrainSummary: parsed.terrainSummary,
          },
          weather: {
            ...prev.weather,
            windDirectionDegrees: Math.round(bearing),
          },
        };
      });
    } catch (err: any) {
      setRouteError(err?.message || (isFr ? 'Fichier GPX invalide.' : 'Invalid GPX trace file.'));
    }
  };

  const handleSelectArchetype = (mode: ArchetypeMode) => {
    const effectiveTag = mode === 'COMMUTE' ? 'VÉLOTAF' : mode;
    // Filter active chips so only chips belonging to the newly selected archetype are preserved
    const validChipIds = new Set(ARCHETYPE_CHIP_DEFINITIONS[mode].map((c) => c.id));
    let retainedChips = (trip.customChips || []).filter((id) => validChipIds.has(id));

    // Provide helpful preset default chips if transitioning to an archetype with no matching active chips
    if (retainedChips.length === 0) {
      if (mode === 'COMMUTE') retainedChips = ['coffee-stop', 'rush-hour-buffer'];
      else if (mode === 'SPORT') retainedChips = ['hydration-electrolytes', 'paceline-drafting'];
      else if (mode === 'BIKEPACKING') retainedChips = ['bivouac-camp', 'resupply-points'];
      else if (mode === 'ESCAPADE') retainedChips = ['historical-tour', 'local-gastronomy'];
    }

    const savedSpecs = loadRiderBikeSpecs();
    const savedBike = getActiveBike(savedSpecs);
    const freshChecklist = generateTripChecklist(effectiveTag, trip.route?.distanceKm, trip.weather, {
      lang,
      customChips: retainedChips,
      isTubeless: Boolean(savedBike?.isTubeless),
      carbTargetGPerHr: savedSpecs.carbTargetGPerHr ?? 60,
      nutritionPreference: savedSpecs.nutritionPreference ?? 'mixed',
    });
    const checkedMap = new Map((trip.checklist || []).map((item) => [item.id, item.checked]));
    const syncedChecklist = freshChecklist.map((item) => ({
      ...item,
      checked: checkedMap.has(item.id) ? Boolean(checkedMap.get(item.id)) : item.checked,
    }));

    const defaultArrival =
      mode === 'SPORT'
        ? '11:00'
        : mode === 'BIKEPACKING'
        ? '18:00'
        : mode === 'ESCAPADE'
        ? '15:00'
        : '08:30';

    if (mode === 'BIKEPACKING' && routeGenMode !== 'corridor') {
      setRouteGenMode('corridor');
      setRouteError(null);
      setRouteSuccess(false);
    }

    commitTrip((prev) => {
      const mergedRuleSettings = { ...(prev.ruleSettings || {}) };
      for (const chipId of retainedChips) {
        const def = findChipDef(chipId);
        if (def) {
          for (const [k, v] of Object.entries(def.defaultSettings)) {
            if (mergedRuleSettings[k] === undefined) {
              mergedRuleSettings[k] = v;
            }
          }
        }
      }
      const shouldResetRadius =
        mode === 'BIKEPACKING' &&
        (prev.route.routeMode === 'manual-radius' || Boolean(prev.route.radiusMeters));
      const sanitizedDest =
        shouldResetRadius &&
        (prev.route.destination?.toLowerCase().includes('radius') ||
          prev.route.destination?.toLowerCase().includes('rayon'))
          ? 'Redon'
          : prev.route.destination;
      if (shouldResetRadius && sanitizedDest) {
        setDestInput(sanitizedDest);
      }

      const prevGate = prev.office?.gateName || '';
      const isCommuterGate =
        !prevGate.trim() ||
        /gate\s*(b|17)|porte\s*(b|17)|atlantis|campus|office|bureau|workplace|entreprise/i.test(prevGate);
      const isOtherArchetypeGate =
        /bivouac|camp|finish\s*line|clubhouse|ligne d[’']arriv[ée]e|sas|h[ôo]tel|r[ée]ception|auberge|h[ée]bergement|lodge|checkpoint/i.test(
          prevGate
        );
      const defaultGateByMode: Record<ArchetypeMode, string> = {
        COMMUTE: isFr ? 'Bureau · Accueil' : 'Main Office',
        ESCAPADE: isFr ? 'Réception Hôtel / Étape' : 'Hotel Check-in / Stage Lodging',
        BIKEPACKING: isFr ? 'Zone de Bivouac / Camp' : 'Camp / Bivouac Site',
        SPORT: isFr ? 'Ligne d’arrivée / Club' : 'Finish Line / Clubhouse',
      };
      const defaultCutoffByMode: Record<ArchetypeMode, string> = {
        COMMUTE: '09:00',
        SPORT: '11:30',
        ESCAPADE: '16:00',
        BIKEPACKING: '18:30',
      };
      const shouldReplaceGate =
        mode === 'COMMUTE'
          ? !prevGate.trim() || isOtherArchetypeGate
          : isCommuterGate || isOtherArchetypeGate;
      const sanitizedGateName = shouldReplaceGate ? defaultGateByMode[mode] : prevGate;

      const cleanedRuleSettings = { ...mergedRuleSettings };
      if (mode !== 'COMMUTE') {
        cleanedRuleSettings.splitPostRideRecovery = false;
        if (
          cleanedRuleSettings.stage1LocationLabel &&
          /locker|vestiaire|break\s*room|desk|bureau|office|open\s*space/i.test(
            cleanedRuleSettings.stage1LocationLabel
          )
        ) {
          delete cleanedRuleSettings.stage1LocationLabel;
        }
        if (
          cleanedRuleSettings.stage2LocationLabel &&
          /locker|vestiaire|break\s*room|desk|bureau|office|open\s*space/i.test(
            cleanedRuleSettings.stage2LocationLabel
          )
        ) {
          delete cleanedRuleSettings.stage2LocationLabel;
        }
      }

      const prevNotes = prev.office?.notes || '';
      const hasCommuterNotes =
        /open[-\s]?space|locker|vestiaire|badge|shift|poste|atlantis|campus|office|bureau|pantry|cafeteria|skyr/i.test(
          prevNotes
        );
      const sanitizedNotes = mode !== 'COMMUTE' && hasCommuterNotes ? '' : prevNotes;

      const prevDesc = prev.description || '';
      const hasCommuterDesc =
        /commute|v[ée]lotaf|morning|matinal|shift|prise de poste|atlantis|bureau|estuary|estuaire/i.test(
          prevDesc
        );
      const defaultDescByMode: Record<ArchetypeMode, string> = {
        COMMUTE: prevDesc || t('newTripDefaultDesc'),
        ESCAPADE: isFr
          ? 'Étape cyclotourisme avec check-in hôtel, sacoches équilibrées et récupération.'
          : 'Touring stage paced for hotel check-in, balanced panniers, and evening recovery.',
        BIKEPACKING: isFr
          ? 'Expédition autonome calibrée pour bivouac, sacoches et gestion hydrique.'
          : 'Self-supported bikepacking expedition calibrated for saddlebag load and dusk camp.',
        SPORT: isFr
          ? 'Sortie sportive rythmée avec cibles de puissance, vent et ravitaillement.'
          : 'Training ride tuned for power pacing, wind resistance, and fueling.',
      };
      const sanitizedDescription =
        mode !== 'COMMUTE' && (!prevDesc.trim() || hasCommuterDesc)
          ? defaultDescByMode[mode]
          : prevDesc;

      return {
        ...prev,
        tag: effectiveTag,
        description: sanitizedDescription,
        checklist: syncedChecklist,
        customChips: retainedChips,
        ruleSettings: cleanedRuleSettings,
        route: shouldResetRadius
          ? {
              ...prev.route,
              routeMode: 'corridor',
              radiusMeters: undefined,
              destination: sanitizedDest,
            }
          : prev.route,
        office: {
          ...prev.office,
          gateName: sanitizedGateName,
          targetGateArrivalTime: defaultArrival,
          shiftStartTime: defaultCutoffByMode[mode],
          strictNoFoodInOpenSpace: mode === 'COMMUTE' ? Boolean(prev.office?.strictNoFoodInOpenSpace) : false,
          badgeRequiredForGate: mode === 'COMMUTE',
          notes: sanitizedNotes,
        },
      };
    });
  };

  const handleToggleChip = (chipId: string) => {
    const updated = toggleArchetypeChip(tripRef.current, chipId, lang);
    commitTrip(updated);
  };

  const updateOffice = (field: keyof TripProfile['office'], value: any) => {
    commitTrip((prev) => {
      const nextOffice = {
        ...prev.office,
        [field]: value,
      };
      const isCommute = getArchetypeFromTag(prev.tag, prev.name) === 'COMMUTE';
      if (isCommute) {
        const postGateMinutes = Math.max(
          10,
          (nextOffice.lockerRefuelMinutes ?? 10) +
            (nextOffice.showerChangeMinutes ?? 10) +
            (nextOffice.breakRoomBreakfastMinutes ?? 10)
        );
        if (
          field === 'shiftStartTime' ||
          field === 'lockerRefuelMinutes' ||
          field === 'showerChangeMinutes' ||
          field === 'breakRoomBreakfastMinutes'
        ) {
          if (nextOffice.shiftStartTime) {
            nextOffice.targetGateArrivalTime = subtractMinutesFromTime(
              nextOffice.shiftStartTime,
              postGateMinutes
            );
          }
        } else if (field === 'targetGateArrivalTime' && typeof value === 'string' && value) {
          nextOffice.shiftStartTime = addMinutesToTime(value, postGateMinutes);
        }
      }
      return {
        ...prev,
        office: nextOffice,
      };
    });
  };

  const updateRuleSetting = (key: string, value: any) => {
    commitTrip((prev) => applyRuleSettingChange(prev, key, value));
  };

  const activeChips = trip.customChips || [];
  const activeChipDefs = activeChips
    .map((id) => findChipDef(id))
    .filter((def): def is NonNullable<typeof def> => Boolean(def));

  const handleSave = (): TripProfile => {
    const updated = commitTrip((prev) => {
      const isRadius =
        prev.route.routeMode === 'manual-radius' || Boolean(prev.route.radiusMeters);
      const dist = prev.route.distanceKm || 30;
      let syncName = prev.name;
      if (!prev.name.trim()) {
        const originShort = (prev.route.origin || 'Start').split(',')[0].trim();
        if (isRadius) {
          syncName = isFr
            ? `${originShort} · Boucle de ${dist} km`
            : `${originShort} · ${dist} km Loop`;
        } else if (prev.stages && prev.stages.length > 1 && prev.route.origin && prev.route.destination) {
          const destShort = prev.route.destination.split(',')[0].trim();
          const daysLabel = isFr ? `${prev.stages.length} jours` : `${prev.stages.length} days`;
          syncName = `${originShort} → ${destShort} (${daysLabel})`;
        } else if (prev.route.origin && prev.route.destination) {
          const destShort = prev.route.destination.split(',')[0].trim();
          syncName = isFr
            ? `${originShort} → ${destShort}`
            : `${originShort} → ${destShort} Tour`;
        } else {
          syncName = t('defaultTripName');
        }
      }
      const syncDesc = prev.description
        ? prev.description.replace(/^\d+(\.\d+)?\s*km\b/i, `${dist.toFixed(1)} km`)
        : `${dist.toFixed(1)} km ride`;

      return {
        ...prev,
        name: syncName,
        description: syncDesc,
        arriveAtMode: isArriveAtMode,
      };
    });
    onSave(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
    return updated;
  };

  const handleLaunchDirect = () => {
    const updated = handleSave();
    onLaunch(updated);
  };

  const handleRevertChanges = () => {
    const snap: TripProfile = JSON.parse(JSON.stringify(initialSnapshotRef.current));
    setHasModified(false);
    setOriginInput(snap.route.origin || '');
    setDestInput(snap.route.destination || snap.office.gateName || '');
    setOriginCoords(snap.route.coordinates?.[0] ?? null);
    setDestCoords(
      snap.route.coordinates && snap.route.coordinates.length > 1
        ? snap.route.coordinates[snap.route.coordinates.length - 1]
        : null
    );
    setWaypoints(
      (snap.route.waypoints || []).map((w, idx) => ({
        id: w.id || `wp-${Date.now()}-${idx}`,
        name: w.name,
        coordinates: w.coordinates || null,
        distanceFromStartKm: w.distanceFromStartKm,
      }))
    );
    setIsMultiDayFormat(Boolean(snap.stages && snap.stages.length > 1));
    setIsArriveAtMode(snap.arriveAtMode !== false);
    setRouteSuccess(false);
    setRouteError(null);
    commitTripInternal(snap, false);
  };

  const isBikepacking = activeArchetypeMode === 'BIKEPACKING';
  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const isMultiDayTrip = isMultiDayFormat || hasMultipleStages;
  const showStageSequencer = isMultiDayTrip;
  const isMultiDayBikepacking = isMultiDayTrip && isBikepacking;

  const displayStages: TripStage[] =
    trip.stages && trip.stages.length > 0
      ? trip.stages
      : [
          {
            id: 'stage-1',
            dayNumber: 1,
            departureDate: trip.departureDate || getLocalTodayIso(),
            departureTime: trip.departureTime || '08:00',
            route: trip.route,
            office: trip.office,
            weather: trip.weather,
            customChips: trip.customChips || [],
            targetMode: trip.arriveAtMode !== false ? 'arrive' : 'depart',
          },
        ];

  const activeStageIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, displayStages.length - 1));
  const expeditionTotals = getExpeditionTotals(trip);

  const handleSelectStage = (idx: number) => {
    if (idx === (trip.activeStageIndex ?? 0)) return;
    const updated = commitTrip((prev) => switchActiveStage(prev, idx));
    const nextOrigin = updated.route.origin || '';
    const nextDest = updated.route.destination || '';
    setOriginInput(nextOrigin);
    setDestInput(nextDest);
    const nextWps = (updated.route.waypoints || []).map((w, wIdx) => ({
      id: w.id || `wp-${Date.now()}-${wIdx}`,
      name: w.name,
      coordinates: w.coordinates || null,
      distanceFromStartKm: w.distanceFromStartKm,
    }));
    setWaypoints(nextWps);
    if (updated.route.coordinates && updated.route.coordinates.length > 1) {
      setOriginCoords(updated.route.coordinates[0]);
      setDestCoords(updated.route.coordinates[updated.route.coordinates.length - 1]);
    } else {
      setOriginCoords(null);
      setDestCoords(null);
    }
    setIsArriveAtMode(updated.arriveAtMode !== false);
    setRouteSuccess(false);
    setRouteError(null);
  };

  const handleAddDay = () => {
    setIsMultiDayFormat(true);
    const updated = commitTrip((prev) => addNextStage(prev));
    const nextOrigin = updated.route.origin || '';
    setOriginInput(nextOrigin);
    setDestInput('');
    setWaypoints([]);
    setOriginCoords(null);
    setDestCoords(null);
    setRouteSuccess(false);
    setRouteError(null);
    setIsArriveAtMode(true);
    setTimeout(() => {
      const destElem = document.getElementById('destination-input');
      if (destElem) {
        destElem.focus();
      }
    }, 50);
  };

  const handleRemoveStage = (idxToRemove: number) => {
    const updated = commitTrip((prev) => removeStage(prev, idxToRemove));
    if (!updated.stages || updated.stages.length <= 1) {
      setIsMultiDayFormat(false);
    }
    const nextOrigin = updated.route.origin || '';
    const nextDest = updated.route.destination || '';
    setOriginInput(nextOrigin);
    setDestInput(nextDest);
    const nextWps = (updated.route.waypoints || []).map((w, wIdx) => ({
      id: w.id || `wp-${Date.now()}-${wIdx}`,
      name: w.name,
      coordinates: w.coordinates || null,
      distanceFromStartKm: w.distanceFromStartKm,
    }));
    setWaypoints(nextWps);
    if (updated.route.coordinates && updated.route.coordinates.length > 1) {
      setOriginCoords(updated.route.coordinates[0]);
      setDestCoords(updated.route.coordinates[updated.route.coordinates.length - 1]);
    } else {
      setOriginCoords(null);
      setDestCoords(null);
    }
    setIsArriveAtMode(updated.arriveAtMode !== false);
    setRouteSuccess(false);
    setRouteError(null);
  };

  const archetypeColumns: {
    id: ArchetypeMode;
    label: string;
    icon: any;
    desc: string;
  }[] = [
    { id: 'BIKEPACKING', label: t('archBikepackingLabel'), icon: Backpack, desc: t('archBikepackingDesc') },
    { id: 'SPORT', label: t('archSportLabel'), icon: Lightning, desc: t('archSportDesc') },
    { id: 'COMMUTE', label: t('archCommuteLabel'), icon: Briefcase, desc: t('archCommuteDesc') },
    { id: 'ESCAPADE', label: t('archEscapadeLabel'), icon: Compass, desc: t('archEscapadeDesc') },
  ];

  const stepOptions = [
    {
      id: 'date-time' as const,
      label: isFr ? 'Date & Heure' : 'Date & Time',
      icon: Clock,
    },
    {
      id: 'trip-style' as const,
      label: isFr ? 'Style de sortie' : 'Trip Style',
      icon: Compass,
    },
    {
      id: 'cycling-pace' as const,
      label: isFr ? 'Allure vélo' : 'Cycling Pace',
      icon: Lightning,
    },
  ];

  const currentStepTitle =
    activeStep === 'date-time'
      ? isFr
        ? 'Où et quand ?'
        : 'Where & when?'
      : activeStep === 'trip-style'
      ? isFr
        ? 'Style de sortie & règles'
        : 'Trip style & rules'
      : isFr
      ? 'Allure vélo & physique'
      : 'Cycling pace & physics';

  return (
    <div className="w-full max-w-[1720px] min-w-0 mx-auto px-3.5 sm:px-5 lg:px-7 pt-2 pb-28 sm:pb-20 space-y-5">
      {/* ── Centered Top Step Switcher Pill (Date & Time | Trip Style | Cycling Pace) ── */}
      <div className="flex justify-center w-full min-w-0 animate-apple-in stagger-1">
        <div
          role="tablist"
          aria-label={isFr ? 'Étapes de configuration' : 'Configuration steps'}
          className="grid grid-cols-3 sm:inline-flex items-center p-1 sm:p-1.5 gap-1 sm:gap-1.5 rounded-2xl sm:rounded-full bg-card dark:bg-pod shadow-xs w-full sm:w-auto max-w-full"
        >
          {stepOptions.map((step) => {
            const StepIcon = step.icon;
            const isStepActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isStepActive}
                onClick={() => setActiveStep(step.id)}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[42px] sm:min-h-[40px] sm:h-9 px-2 py-1.5 sm:py-0 sm:px-4 rounded-xl sm:rounded-full text-[11px] sm:text-[13px] leading-tight text-center font-semibold transition-all duration-150 cursor-pointer min-w-0 whitespace-normal sm:whitespace-nowrap active:scale-[0.98] ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  isStepActive
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                    : `${CHIP_RING_UNSELECTED} text-ink-secondary hover:text-ink hover:bg-pod/60`
                }`}
              >
                <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-current" />
                <span className="truncate sm:overflow-visible">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section Header Bar (Left: Back + Editable Trip Title | Right: Live Auto-Save & Done) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-apple-in stagger-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onCancel}
            title={isFr ? 'Retour à la sortie' : 'Back to ride plan'}
            aria-label={isFr ? 'Retour à la sortie' : 'Back to ride plan'}
            className="inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-full text-ink-secondary hover:text-ink bg-card hover:bg-pod transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-baseline gap-2.5 min-w-0 flex-wrap">
            <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight leading-tight font-rounded shrink-0">
              {currentStepTitle}
            </h1>
            <span className="hidden sm:inline text-ink-muted">·</span>
            <input
              type="text"
              value={trip.name}
              onChange={(e) => commitTrip((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={(() => {
                const arch = getArchetypeFromTag(trip.tag, trip.name);
                if (arch === 'ESCAPADE') return t('tripNamePlaceholderEscapade');
                if (arch === 'BIKEPACKING') return t('tripNamePlaceholderBikepacking');
                if (arch === 'SPORT') return t('tripNamePlaceholderSport');
                return t('tripNamePlaceholderCommute');
              })()}
              className="w-full sm:w-auto sm:min-w-[300px] lg:min-w-[360px] max-w-full min-h-[44px] text-base sm:text-lg font-semibold text-ink-secondary focus:text-ink tracking-tight bg-transparent border-b border-dashed border-ink/15 hover:border-ink/35 focus:border-solid focus:border-ink/60 focus:outline-none transition-colors"
              title={isFr ? 'Renommer la sortie' : 'Click to rename ride'}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-auto flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium bg-card text-ink-secondary ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.emerald.primary}`} />
            <span>{isFr ? 'Enregistré auto' : 'Auto-saved'}</span>
          </span>

          {hasModified && (
            <button
              type="button"
              onClick={handleRevertChanges}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] h-9 sm:h-10 px-3.5 text-xs sm:text-[13px] font-medium text-ink-secondary hover:text-ink bg-card hover:bg-pod rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <ArrowsClockwise className="w-3.5 h-3.5 shrink-0" />
              <span>{isFr ? 'Rétablir' : 'Revert'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLaunchDirect}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] h-10 px-4 sm:px-5 text-xs sm:text-[13px] font-medium bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap shadow-xs"
          >
            <span>{isFr ? 'Terminé · Voir la sortie' : 'Done · Back to ride plan'}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── MAIN 5-COLUMN GRID: Left 3 Cols (2 Stacked Step Cards) + Right 2 Cols (Live Results) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 items-start">
        {/* Left 3 Columns: Active Step 2-Card Stack */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 sm:gap-4 lg:gap-5 min-w-0">
          {activeStep === 'date-time' && (
            <>
              {/* Card 1: Route Generator (Elevated Stacking Context so Autocomplete Floats Cleanly Over Card 2) */}
              <div className="rounded-card bg-card text-ink p-4 sm:p-5 border border-ink/5 dark:border-white/5 shadow-xs flex flex-col justify-between transition-colors animate-apple-step-in relative z-20 focus-within:z-30">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-4">
            <div>
              <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink font-rounded">
                {isFr ? 'Générateur d’itinéraire' : 'Route generator'}
              </h2>
              <p className="text-[13px] text-ink-muted mt-0.5">
                {t('corridorGeneratorSub')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {isBikepacking ? (
                <button
                  type="button"
                  onClick={() => gpxConfigInputRef.current?.click()}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-pod hover:bg-chip text-ink-secondary hover:text-ink transition-all cursor-pointer whitespace-nowrap border border-ink/5 dark:border-white/10 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  <Upload className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.sky.primary}`} />
                  <span>
                    {trip.route.gpxFileName
                      ? `${t('gpxLoadedBadge')} · ${trip.route.gpxFileName}`
                      : t('routeModeGpx')}
                  </span>
                </button>
              ) : (
                <div className="inline-flex items-center p-1 rounded-full bg-pod border border-ink/5 dark:border-white/10">
                  {(
                    [
                      { id: 'corridor', label: t('routeModeCorridor') },
                      { id: 'manual-radius', label: t('routeModeRadius') },
                      { id: 'gpx', label: t('routeModeGpx') },
                    ] as const
                  ).map((modeOpt) => {
                    const active = routeGenMode === modeOpt.id;
                    return (
                      <button
                        key={modeOpt.id}
                        type="button"
                        onClick={() => {
                          setRouteGenMode(modeOpt.id);
                          setRouteError(null);
                          setRouteSuccess(false);
                          if (modeOpt.id === 'manual-radius') {
                            handleUpdateRadiusRoute(
                              originInput || trip.route.origin || 'Nantes',
                              originCoords,
                              trip.route.distanceKm || 35
                            );
                          } else if (modeOpt.id === 'corridor') {
                            let sanitized = destInput;
                            if (!sanitized || sanitized.match(/loop radius|rayon boucle/i)) {
                              sanitized = lastCorridorDestRef.current && !lastCorridorDestRef.current.match(/loop radius|rayon boucle/i)
                                ? lastCorridorDestRef.current
                                : 'Saint-Nazaire';
                              setDestInput(sanitized);
                            }
                            commitTrip((prev) => ({
                              ...prev,
                              route: {
                                ...prev.route,
                                routeMode: 'corridor',
                                destination: sanitized,
                              },
                            }));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-card text-ink shadow-xs'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {modeOpt.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <Badge variant="zinc" size="md" className="tnum shrink-0">
                {trip.route.distanceKm} km
              </Badge>
            </div>
          </div>

          {/* Trip Format Switcher: Single Day vs Multi-Day Expedition (Evident & Upfront) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-pod bg-pod border border-ink/5 dark:border-white/10 mb-4 transition-colors">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-ink-muted mr-1 font-body">
                {t('tripFormatHeading')} :
              </span>
              <button
                type="button"
                onClick={() => handleSetTripFormat('single')}
                className={`px-3 py-1.5 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isMultiDayTrip
                    ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-ink-muted hover:text-ink hover:bg-card/40'
                }`}
              >
                <Bicycle className="w-4 h-4 shrink-0 text-current" />
                <span>{t('tripFormatSingleDay')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTripFormat('multi')}
                className={`px-3 py-1.5 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMultiDayTrip
                    ? 'bg-volt text-[#111111] shadow-xs ring-1 ring-black/10'
                    : 'text-ink-muted hover:text-ink hover:bg-card/40'
                }`}
              >
                <Mountain className="w-4 h-4 shrink-0 text-current" />
                <span>{t('tripFormatMultiDay')}</span>
              </button>
            </div>
          </div>

          {/* Multi-Day Stage Sequencer Bar */}
          {showStageSequencer && (
            <div className="rounded-pod bg-pod p-3 sm:p-3.5 mb-4 space-y-2.5 transition-colors">
              {/* Header & Expedition Summary Strip */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-volt ring-2 ring-volt/40 animate-pulse" />
                  <span className="text-xs font-semibold text-ink tracking-tight font-rounded">
                    {t('stageSequencerHeading')}
                  </span>
                  <span className="text-[11px] font-medium text-ink-muted p-1.5 rounded-full bg-card/60 tnum leading-none">
                    {t('stageCounter', {
                      cur: activeStageIdx + 1,
                      total: displayStages.length,
                    })}
                  </span>
                </div>

                {/* Expedition Summary Strip when stages.length > 1 */}
                {displayStages.length > 1 && (
                  <div className="flex items-center gap-1.5 p-2 rounded-full bg-card text-[11px] font-semibold text-ink shadow-xs tnum border border-ink/5 dark:border-white/5">
                    <span className="text-ink-muted font-medium">
                      {t('totalExpeditionLabel')}
                    </span>
                    <span className="text-ink font-bold">
                      {t('daysCountUnit', { count: expeditionTotals.totalDays })}
                    </span>
                    <span className="text-ink-muted">·</span>
                    <span className="text-ink font-bold">
                      {expeditionTotals.totalDistanceKm} km
                    </span>
                    <span className="text-ink-muted">·</span>
                    <span className="text-ink font-bold">
                      +{expeditionTotals.totalElevationM} m
                    </span>
                  </div>
                )}
              </div>

              {/* Horizontal scrollable stage pills strip */}
              <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
                {displayStages.map((stage, idx) => {
                  const isActive = idx === activeStageIdx;
                  const dayNum = stage.dayNumber;
                  const originText = isActive
                    ? trip.route.origin || originInput || '...'
                    : stage.route.origin || '...';
                  const destText = isActive
                    ? trip.route.destination || destInput || '...'
                    : stage.route.destination || '...';
                  const distKm = isActive
                    ? trip.route.distanceKm || 0
                    : stage.route.distanceKm || 0;
                  const viaCount = isActive
                    ? waypoints.length
                    : stage.route.waypoints?.length || 0;

                  return (
                    <div
                      key={stage.id || `stage-${idx}`}
                      onClick={() => handleSelectStage(idx)}
                      className={`group relative flex items-center gap-2 p-1.5 rounded-full cursor-pointer transition-all duration-150 shrink-0 select-none ${
                        isActive
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} shadow-xs`
                          : 'bg-card hover:bg-chip text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {/* Day Label Pill */}
                      <span
                        className={`p-1 rounded-full text-[10px] leading-none font-extrabold uppercase tracking-wider font-rounded shrink-0 shadow-xs ${
                          isActive
                            ? 'bg-volt text-[#111111]'
                            : 'bg-pod text-ink-muted group-hover:text-ink'
                        }`}
                      >
                        {t('stageDayPill', { day: dayNum })}
                      </span>

                      {/* Origin -> Destination text with via count */}
                      <span className="text-xs font-semibold whitespace-nowrap min-w-0">
                        {originText} → {destText || '...'}
                        {viaCount > 0 && (
                          <span className="ml-1 text-[10px] opacity-75 font-rounded tnum">
                            (+{viaCount} via)
                          </span>
                        )}
                      </span>

                      {/* Distance */}
                      <span
                        className={`text-[11px] font-bold tnum shrink-0 ${
                          isActive
                            ? 'text-[#4d5200] dark:text-[#dfff00]'
                            : 'text-ink-muted group-hover:text-ink-secondary'
                        }`}
                      >
                        {distKm} km
                      </span>

                      {/* Delete button (only if stages > 1) */}
                      {displayStages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStage(idx);
                          }}
                          title={t('deleteStageTitle', { day: dayNum })}
                          className={`p-1 rounded-full transition-all cursor-pointer shrink-0 ${
                            isActive
                              ? 'text-[#4d5200]/70 hover:text-[#4d5200] dark:text-[#dfff00]/70 dark:hover:text-[#dfff00] hover:bg-[#a3b300]/15 dark:hover:bg-white/10'
                              : 'text-ink-muted hover:text-ink hover:bg-pod/80'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* + Add Day button */}
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="inline-flex items-center gap-1.5 p-2 rounded-full bg-volt hover:bg-volt-lime text-[#111111] text-xs font-bold tracking-tight transition-all duration-150 shrink-0 cursor-pointer shadow-xs active:scale-95 font-rounded whitespace-nowrap ring-1 ring-inset ring-black/10 dark:ring-white/10"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('addDayBtn')}</span>
                </button>
              </div>

              {/* Tours & Stages Cumulative Summary, Daily Timeline & Full Tour GPX Export */}
              <TourOverviewCard
                trip={trip}
                activeStageIdx={activeStageIdx}
                onSelectStage={handleSelectStage}
                ftpWatts={effectiveSpecs.ftpWatts}
              />
            </div>
          )}

          {/* Route Mode Body: Multi-Stop Corridor (OSRM) | Start + Radius | Import .GPX */}
          <div className="space-y-4 mt-auto">
            <input
              ref={gpxConfigInputRef}
              type="file"
              accept=".gpx,application/gpx+xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleConfigGpxUpload(file);
                }
                e.target.value = '';
              }}
            />

            {(isBikepacking || routeGenMode === 'corridor') && (
              <div className="space-y-4 animate-apple-step-in">
                {/* Flexible Multi-Stop & Waypoint Builder */}
                <div className="space-y-3 rounded-pod bg-pod p-3 sm:p-4 border border-ink/5 dark:border-white/10">
                  {/* Stop A: Start / Origin */}
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white font-rounded font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white dark:ring-black">
                      A
                    </span>
                    <div className="flex-1 min-w-0">
                      <LocationAutocompleteInput
                        id="origin-input"
                        label={t('stopOrigin')}
                        value={originInput}
                        dropdownAlign="left"
                        onChange={(val) => {
                          setOriginInput(val);
                          setOriginCoords(null);
                          setRouteSuccess(false);
                          setRouteError(null);
                          commitTrip((prev) => ({
                            ...prev,
                            route: {
                              ...prev.route,
                              origin: val,
                              coordinates: undefined,
                              elevationGainM: 0,
                            },
                          }));
                        }}
                        onSelectLocation={(loc) => {
                          setOriginInput(loc.name);
                          setOriginCoords(loc.coordinates);
                          setRouteSuccess(false);
                          setRouteError(null);
                          commitTrip((prev) => ({
                            ...prev,
                            route: { ...prev.route, origin: loc.name },
                          }));
                          if (destInput.trim()) {
                            handleCalculateRoute();
                          }
                        }}
                        onKeyDownEnter={() => handleCalculateRoute()}
                        placeholder={isFr ? 'Point de départ (ex. Saint-Raphaël, Nice, Nantes...)' : 'Start location (e.g. Saint-Raphaël, Nice...)'}
                      />
                    </div>
                  </div>

                  {/* Intermediate Stops (Waypoints) List with Drag-to-Reorder and Up/Down Handles */}
                  {waypoints.map((wp, idx) => (
                    <div
                      key={wp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`flex items-center gap-2 p-2 rounded-pod bg-card border border-ink/5 dark:border-white/10 shadow-xs transition-all duration-150 group ${
                        draggedWaypointIdx === idx ? 'opacity-40 scale-[0.98]' : ''
                      }`}
                    >
                      {/* Drag Grip Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink p-1 shrink-0 select-none"
                        title={t('dragToReorderHint')}
                      >
                        <GripDotsIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Accessible Reorder Shift Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveWaypoint(idx, -1)}
                          disabled={idx === 0}
                          className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title={t('moveWaypointUp')}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveWaypoint(idx, 1)}
                          disabled={idx === waypoints.length - 1}
                          className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title={t('moveWaypointDown')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Numbered Via Badge */}
                      <span className="w-6 h-6 rounded-full bg-[#F2F455] text-[#111111] font-rounded font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/10">
                        {idx + 1}
                      </span>

                      {/* Autocomplete Input for Intermediate Stop */}
                      <div className="flex-1 min-w-0">
                        <LocationAutocompleteInput
                          id={`waypoint-${wp.id}`}
                          label={`${t('waypointViaBadge', { num: idx + 1 })}${
                            wp.distanceFromStartKm ? ` · km ${wp.distanceFromStartKm}` : ''
                          }`}
                          value={wp.name}
                          dropdownAlign="left"
                          onChange={(val) => handleUpdateWaypointName(wp.id, val)}
                          onSelectLocation={(loc) => handleSelectWaypointLocation(wp.id, loc)}
                          onKeyDownEnter={() => handleCalculateRoute()}
                          placeholder={t('intermediateStopPlaceholder')}
                        />
                      </div>

                      {/* Delete Stop Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveWaypoint(wp.id)}
                        className="p-1.5 text-ink-muted hover:text-rose-600 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                        title={t('removeWaypointTitle')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Stop B: Destination / Finish */}
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-rounded font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-[#F2F455]">
                      B
                    </span>
                    <div className="flex-1 min-w-0">
                      <LocationAutocompleteInput
                        id="destination-input"
                        label={t('stopDestination')}
                        value={destInput}
                        dropdownAlign="right"
                        onChange={(val) => {
                          setDestInput(val);
                          if (!val.match(/loop radius|rayon boucle/i)) {
                            lastCorridorDestRef.current = val;
                          }
                          setDestCoords(null);
                          setRouteSuccess(false);
                          setRouteError(null);
                          commitTrip((prev) => ({
                            ...prev,
                            route: {
                              ...prev.route,
                              destination: val,
                              coordinates: undefined,
                              elevationGainM: 0,
                            },
                          }));
                        }}
                        onSelectLocation={(loc) => {
                          setDestInput(loc.name);
                          lastCorridorDestRef.current = loc.name;
                          setDestCoords(loc.coordinates);
                          setRouteSuccess(false);
                          setRouteError(null);
                          commitTrip((prev) => ({
                            ...prev,
                            route: { ...prev.route, destination: loc.name },
                          }));
                          if (originInput.trim()) {
                            handleCalculateRoute();
                          }
                        }}
                        onKeyDownEnter={() => handleCalculateRoute()}
                        placeholder={isFr ? 'Point d’arrivée (ex. Sainte-Maxime, Hyères, Saint-Nazaire...)' : 'Destination (e.g. Sainte-Maxime, Hyères...)'}
                      />
                    </div>
                  </div>

                  {/* Multi-Stop Action Toolbar: + Add Stop | Reverse | Clear | Calculate */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 flex-wrap border-t border-dashed border-ink/10 dark:border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* + Add Stop Button */}
                      <button
                        type="button"
                        onClick={handleAddWaypoint}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-volt hover:bg-volt-lime text-[#111111] text-xs font-rounded font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t('addIntermediateStopBtn')}</span>
                      </button>

                      {/* Reverse Route Button */}
                      <button
                        type="button"
                        onClick={handleSwapCorridor}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-chip text-ink text-xs font-semibold border border-ink/10 dark:border-white/10 transition-colors cursor-pointer"
                        title={t('reverseRouteBtn')}
                      >
                        <ArrowsLeftRight className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('reverseRouteBtn')}</span>
                      </button>

                      {/* Clear Stops Button */}
                      {waypoints.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setWaypoints([]);
                            commitTrip((prev) => ({
                              ...prev,
                              route: { ...prev.route, waypoints: [] },
                            }));
                            handleCalculateRoute([]);
                          }}
                          className="px-2 py-1 text-xs text-ink-muted hover:text-ink cursor-pointer transition-colors"
                        >
                          {t('clearIntermediateStopsBtn')}
                        </button>
                      )}
                    </div>

                    {/* Primary Calculate Route Button */}
                    <button
                      type="button"
                      onClick={() => handleCalculateRoute()}
                      disabled={isRouting}
                      className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white dark:bg-chip dark:hover:bg-chip-hover dark:text-ink disabled:opacity-50 rounded-full text-xs font-rounded font-bold tracking-wide transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                    >
                      {isRouting ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                      <span>{t('fetchRouteBtn')}</span>
                    </button>
                  </div>
                </div>

                {/* Integrated Interactive Route Map with Click-to-Add Waypoint */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink px-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-volt-dim" />
                      <span>{t('interactiveMapToggle')}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-muted font-normal hidden sm:inline">
                        {t('clickMapToAddWaypointPrompt')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsMapCollapsed((prev) => !prev)}
                        className="text-[11px] font-semibold text-ink-muted hover:text-ink cursor-pointer"
                      >
                        {isMapCollapsed ? t('showMapBtn') : t('hideMapBtn')}
                      </button>
                    </div>
                  </div>

                  {!isMapCollapsed && (
                    <div className="space-y-3">
                      <InteractiveRouteMap
                        originName={originInput}
                        originCoords={originCoords}
                        destinationName={destInput}
                        destCoords={destCoords}
                        waypoints={waypoints}
                        coordinates={trip.route.coordinates}
                        distanceKm={trip.route.distanceKm}
                        surfaceBreakdown={surfaceBreakdown}
                        activeSurfaceSegmentId={activeSurfaceSegmentId}
                        onSelectSurfaceSegment={(seg) =>
                          setActiveSurfaceSegmentId(seg ? seg.id : null)
                        }
                        onMapClickAddWaypoint={handleMapClickAddWaypoint}
                        onRemoveWaypoint={handleRemoveWaypoint}
                        isRouting={isRouting}
                      />

                      <ElevationTerrainStrip
                        route={trip.route}
                        physicsResult={physicsResult}
                        crr={trip.physics.crr}
                        customChips={trip.customChips}
                        activeSegmentId={activeSurfaceSegmentId}
                        onSelectSurfaceSegment={(seg) =>
                          setActiveSurfaceSegmentId(seg ? seg.id : null)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isBikepacking && routeGenMode === 'manual-radius' && (
              <div className="space-y-3.5 animate-apple-step-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="min-w-0">
                    <LocationAutocompleteInput
                      id="radius-origin-input"
                      label={t('radiusStartPointLabel')}
                      value={originInput}
                      dropdownAlign="left"
                      onChange={(val) => {
                        handleUpdateRadiusRoute(val, null, trip.route.distanceKm || 35);
                      }}
                      onSelectLocation={(loc) => {
                        handleUpdateRadiusRoute(loc.name, loc.coordinates, trip.route.distanceKm || 35);
                      }}
                      placeholder={isFr ? 'ex. Nantes, Clisson, Pornic...' : 'e.g. Nantes, Clisson, Pornic...'}
                    />
                  </div>

                  <div className="rounded-pod bg-pod p-3 border border-ink/5 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MapIcon className={`w-3.5 h-3.5 text-beacon-red dark:text-rose-400 dual-tone-rose shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                        {t('routeDistInputLabel')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={5}
                          max={300}
                          step={1}
                          value={trip.route.distanceKm}
                          onChange={(e) =>
                            handleUpdateRadiusRoute(
                              originInput || trip.route.origin || 'Nantes',
                              originCoords || trip.route.originCoords || null,
                              parseFloat(e.target.value) || 30
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-card text-ink font-rounded font-bold text-base sm:text-xs text-right tnum ring-1 ring-inset ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="font-rounded font-bold tnum">km</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={250}
                      step={5}
                      value={trip.route.distanceKm}
                      onChange={(e) =>
                        handleUpdateRadiusRoute(
                          originInput || trip.route.origin || 'Nantes',
                          originCoords || trip.route.originCoords || null,
                          parseFloat(e.target.value) || 30
                        )
                      }
                      className="w-full accent-[#10b981] cursor-pointer"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {[30, 60, 100, 150, 200].map((kmPreset) => (
                        <button
                          key={kmPreset}
                          type="button"
                          onClick={() =>
                            handleUpdateRadiusRoute(
                              originInput || trip.route.origin || 'Nantes',
                              originCoords || trip.route.originCoords || null,
                              kmPreset
                            )
                          }
                          className={`relative before:content-[''] before:absolute before:-inset-1.5 px-2.5 py-1 rounded-full text-[10px] font-rounded font-semibold tnum cursor-pointer transition-colors ${
                            Math.round(trip.route.distanceKm) === kmPreset
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                              : 'bg-card hover:bg-chip text-ink-muted hover:text-ink'
                          }`}
                        >
                          {kmPreset} km
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`rounded-pod px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0 text-current" />
                    <span className="font-semibold break-words leading-tight">
                      {originInput || trip.route.origin || 'Nantes'}
                    </span>
                  </div>
                  <span className="font-rounded text-[11px] font-bold tnum shrink-0">
                    {t('radiusLoopReachSub', {
                      loop: Math.round(((trip.route.distanceKm || 30) / 2) * 10) / 10,
                      oneWay: trip.route.distanceKm,
                    })}
                  </span>
                </div>
              </div>
            )}

            {!isBikepacking && routeGenMode === 'gpx' && (
              <div className="animate-apple-step-in">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => gpxConfigInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      gpxConfigInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleConfigGpxUpload(file);
                  }}
                  className={`rounded-pod border border-dashed border-ink/20 dark:border-white/20 hover:border-ink/40 dark:hover:border-white/40 bg-pod/70 hover:bg-pod p-4 text-center transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-1.5 ${CHIP_TOKENS.sky.primary}`} />
                  <div className="text-xs font-bold text-ink">
                    {trip.route.gpxFileName
                      ? `${t('gpxLoadedBadge')} · ${trip.route.gpxFileName}`
                      : t('gpxUploadBtn')}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {t('gpxDropPrompt')}
                  </p>
                </div>
              </div>
            )}

            {/* Status footer with dashed divider */}
            <div className="pt-3 border-t border-dashed border-ink/10 dark:border-white/10 transition-colors">
              {routeSuccess ? (
                <div className={`flex items-center gap-2 text-xs font-medium tnum animate-apple-fade-in ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                  <CheckCircle className="w-4 h-4 shrink-0 text-current" />
                  <span className="break-words leading-tight">
                    {waypoints.length > 0
                      ? t('routeCalculatedWithWaypoints', {
                          dist: trip.route.distanceKm,
                          stops: waypoints.length + 2,
                          time: Math.round(physicsResult.movingTimeSeconds / 60 || (trip.route.distanceKm / 24) * 60),
                        })
                      : t('routeUpdatedMsg', { dist: trip.route.distanceKm })}
                  </span>
                </div>
              ) : routeError ? (
                <p className={`text-xs font-medium animate-apple-fade-in ${CHIP_TOKENS.rose.primary}`}>{routeError}</p>
              ) : (
                <p className="text-xs text-ink-muted tnum break-words leading-relaxed animate-apple-fade-in">
                  {isFr ? 'Itinéraire actif :' : 'Active route:'} {trip.route.origin || originInput}
                  {waypoints.length > 0 && (
                    <span className="font-semibold text-ink-secondary">
                      {' '}via {waypoints.map((w) => w.name.split(',')[0].trim()).join(' · ')}
                    </span>
                  )}{' '}
                  → {trip.route.destination || destInput} ({trip.route.distanceKm} km
                  {trip.route.elevationGainM ? ` · +${trip.route.elevationGainM} m` : ''}
                  {trip.route.routeMode === 'gpx' && trip.route.gpxFileName
                    ? ` · ${trip.route.gpxFileName}`
                    : trip.route.routeMode === 'manual-radius'
                    ? isFr
                      ? ' · Rayon boucle sur carte'
                      : ' · Map radius circle'
                    : (trip.route.coordinates?.length || 0) > 1
                    ? isFr
                      ? ' · Tracé GPS optimisé'
                      : ' · Optimized cycling trace'
                    : ''}
                  )
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Schedule & Weather Sync */}
        <div className="rounded-card bg-card text-ink p-4 sm:p-5 border border-ink/5 dark:border-white/5 shadow-xs flex flex-col justify-between transition-colors animate-apple-step-in relative z-10">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
                  {t('scheduleWeatherHeading')}
                </h2>
                <p className="text-[13px] text-ink-muted mt-0.5">
                  {t('scheduleWeatherSub')}
                </p>
              </div>
              <Badge
                variant={!forecastHorizon.isAvailable ? 'zinc' : daysOffset === 0 ? 'emerald' : 'sky'}
                size="md"
                className="tnum shrink-0"
              >
                {!forecastHorizon.isAvailable
                  ? t('horizonBaseline', { offset: formattedDaysOffset })
                  : daysOffset === 0
                  ? t('horizonLiveToday')
                  : t('horizonPlanned', { offset: formattedDaysOffset })}
              </Badge>
            </div>

            {/* Arrive At / Depart At Toggle Pill Button */}
            <div className="mb-3.5">
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isArriveAtMode;
                  setIsArriveAtMode(nextMode);
                  commitTrip((prev) => ({
                    ...prev,
                    arriveAtMode: nextMode,
                    departureTime: nextMode
                      ? prev.departureTime
                      : prev.departureTime || timelineResult.hardDepartureTime,
                    office: nextMode
                      ? {
                          ...prev.office,
                          targetGateArrivalTime: timelineResult.gateArrivalTime,
                        }
                      : prev.office,
                  }));
                }}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink-secondary hover:text-ink transition-all duration-150 cursor-pointer active:scale-95"
                title={isFr ? 'Basculer entre calcul heure d’arrivée et heure de départ' : 'Toggle between target arrival and departure time calculation'}
              >
                <ArrowsClockwise className={`w-4 h-4 text-ink-muted transition-transform duration-300 ${isArriveAtMode ? 'rotate-0' : 'rotate-180'}`} />
                <span>
                  {isArriveAtMode
                    ? isMultiDayBikepacking
                      ? t('stageCutoffLabel')
                      : isFr
                      ? 'Arrivée à :'
                      : 'Arrive at:'
                    : isFr
                    ? 'Départ à :'
                    : 'Depart at:'}
                </span>
              </button>
            </div>

            {/* Inputs: Departure Date + Rollout/Arrival Time + Sync Weather Button */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('departureDateLabel')}
                </label>
                <input
                  type="date"
                  value={trip.departureDate || ''}
                  onChange={(e) => commitTrip((prev) => ({ ...prev, departureDate: e.target.value }))}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {isArriveAtMode
                    ? isMultiDayBikepacking
                      ? t('stageCutoffInputLabel')
                      : t('targetArrivalInputLabel')
                    : t('rolloutTimeLabel')}
                </label>
                <input
                  type="time"
                  value={isArriveAtMode ? (trip.office.targetGateArrivalTime || '08:30') : (trip.departureTime || timelineResult.hardDepartureTime || '07:24')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isArriveAtMode) {
                      updateOffice('targetGateArrivalTime', val);
                    } else {
                      commitTrip((prev) => ({
                        ...prev,
                        arriveAtMode: false,
                        departureTime: val,
                      }));
                    }
                  }}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isUpdatingWeather}
                  onClick={async () => {
                    const targetDate = trip.departureDate || getLocalTodayIso();
                    const targetTime = timelineResult.hardDepartureTime || trip.departureTime || '08:00';
                    const midIdx = Math.floor((trip.route?.coordinates?.length || 1) / 2);
                    const coords = trip.route?.coordinates?.[midIdx] || [47.2184, -1.5536];
                    const bearing = computeRouteBearing(trip.route?.coordinates);

                    setIsUpdatingWeather(true);
                    setWeatherFeedback(null);
                    try {
                      const w = await fetchHourlyWeather(coords[0], coords[1], targetDate, targetTime, bearing);
                      commitTrip((prev) => ({
                        ...prev,
                        departureDate: prev.departureDate || targetDate,
                        departureTime: prev.departureTime || targetTime,
                        weather: {
                          ...prev.weather,
                          source: w.source,
                          temperatureC: w.temperatureC,
                          baseWindSpeedKmH: w.windSpeedKmH,
                          effectiveHeadwindKmH: w.effectiveHeadwindKmH,
                          windDirectionDegrees: w.windDirectionDegrees,
                          windDirection:
                            w.effectiveHeadwindKmH > 2
                              ? 'headwind'
                              : w.effectiveHeadwindKmH < -2
                              ? 'tailwind'
                              : 'calm',
                          estuaryGustKmH: w.windGustsKmH,
                          airDensityRho: w.airDensityRho,
                          isHeadwindActive: w.isHeadwindActive,
                          isBeyondForecastWindow: w.isBeyondForecastWindow,
                          targetTimestampFormatted: w.timestamp,
                          visibilityKm: w.visibilityKm,
                          weatherCode: w.weatherCode,
                          isDay: w.isDay,
                          sunrise: w.sunriseIso,
                          sunset: w.sunsetIso,
                        },
                        physics: {
                          ...prev.physics,
                          rho: w.airDensityRho,
                        },
                      }));
                      setWeatherFeedback({
                        message: w.isBeyondForecastWindow
                          ? t('weatherBaselineApplied', { offset: formattedDaysOffset })
                          : t('weatherSyncedMsg', { date: targetDate, time: targetTime }),
                        status: !w.isBeyondForecastWindow,
                      });
                    } catch {
                      setWeatherFeedback({
                        message: t('weatherSyncUnavailable'),
                        status: false,
                        isError: true,
                      });
                    } finally {
                      setIsUpdatingWeather(false);
                    }
                  }}
                  className="w-full h-11 flex items-center justify-center gap-1.5 px-4 bg-pod hover:bg-chip disabled:opacity-60 rounded-full text-xs font-medium text-ink transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowsClockwise className={`w-4 h-4 ${isUpdatingWeather ? 'animate-spin' : 'text-ink-muted'}`} />
                  <span>{isUpdatingWeather ? t('syncingBtn') : t('syncWeatherBtn')}</span>
                </button>
              </div>
            </div>

            {/* Status line with dashed separator */}
            <div className="mt-4 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 transition-colors">
              {weatherFeedback ? (
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium animate-apple-fade-in ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    weatherFeedback.isError
                      ? CHIP_TOKENS.rose.primary
                      : weatherFeedback.status
                      ? CHIP_TOKENS.emerald.primary
                      : CHIP_TOKENS.amber.primary
                  }`}
                >
                  {weatherFeedback.status ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-current" />
                  ) : (
                    <WarningCircle className="w-4 h-4 shrink-0 text-current" />
                  )}
                  <span>{weatherFeedback.message}</span>
                </div>
              ) : (
                <p className="text-xs text-ink-muted tnum animate-apple-fade-in">
                  {t('currentConditionsSummary', {
                    temp: trip.weather.temperatureC,
                    wind: trip.weather.baseWindSpeedKmH,
                    rho: trip.physics.rho,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </>
    )}

    {activeStep === 'trip-style' && (
      <>
        {/* Card 1: Ride Archetype & Preset Chips */}
        <div className="rounded-card bg-card text-ink p-4 sm:p-5 border border-ink/5 dark:border-white/5 shadow-xs transition-colors space-y-5 animate-apple-step-in relative z-20 focus-within:z-30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
                {t('archetypeHeading')}
              </h2>
              <p className="text-[13px] text-ink-muted mt-0.5">
                {t('archetypeSub')}
              </p>
            </div>
            <Badge variant="zinc" size="md" className="shrink-0">
              {t('modeBadge', {
                tag: {
                  COMMUTE: t('archCommuteLabel'),
                  ESCAPADE: t('archEscapadeLabel'),
                  BIKEPACKING: t('archBikepackingLabel'),
                  SPORT: t('archSportLabel'),
                }[getArchetypeFromTag(trip.tag, trip.name)],
              })}
            </Badge>
          </div>

          {/* 1. Trip Archetype Selector Pills (2x2 grid inside 3-col layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {archetypeColumns.map((col) => {
              const isArchetypeActive = activeArchetypeMode === col.id;
              const Icon = col.icon;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleSelectArchetype(col.id)}
                  className={`flex items-center gap-3 pl-2.5 pr-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer text-left active:scale-[0.98] ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    isArchetypeActive
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} shadow-xs`
                      : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip/80 text-ink`
                  }`}
                >
                  <IconBadge
                    theme={isArchetypeActive ? 'yellow-vest' : 'greyscale'}
                    icon={Icon}
                    size="spine"
                    isSelected={isArchetypeActive}
                    solidBacker
                    className="w-9 h-9 sm:w-9 sm:h-9"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold tracking-tight break-words leading-tight">
                      {col.label}
                    </div>
                    <div className={`text-xs break-words leading-tight transition-colors duration-200 mt-0.5 ${isArchetypeActive ? 'opacity-80' : 'text-ink-muted'}`}>
                      {col.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 2. Preset chips for the selected archetype */}
          <div className="pt-4 px-1 space-y-2.5">
            <div className="text-center">
              <span className="text-xs font-medium text-ink-muted">
                {isFr ? 'Options suggérées' : 'Suggested ride options'}
              </span>
            </div>

            {(() => {
              const allForArch = ARCHETYPE_CHIP_DEFINITIONS[activeArchetypeMode];
              const selectedSet = new Set(trip.customChips || []);
              const visibleChips = showAllChips
                ? allForArch
                : allForArch.filter((c, i) => i < 4 || selectedSet.has(c.id));
              const hiddenCount = allForArch.length - visibleChips.length;

              return (
                <div
                  key={activeArchetypeMode}
                  className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto py-1 animate-apple-step-in"
                >
                  {visibleChips.map((chip) => {
                    const isSelected = selectedSet.has(chip.id);
                    const Icon = CHIP_ICONS[chip.iconName] || Lightning;

                    return (
                      <Chip
                        key={chip.id}
                        label={isFr ? chip.labelFr : chip.labelEn}
                        theme={chip.colorKey}
                        icon={Icon}
                        isSelected={isSelected}
                        onClick={() => handleToggleChip(chip.id)}
                        title={isFr ? chip.descriptionFr : chip.descriptionEn}
                        className="h-9 font-semibold text-xs"
                      />
                    );
                  })}

                  {(hiddenCount > 0 || showAllChips) && (
                    <button
                      type="button"
                      onClick={() => setShowAllChips((v) => !v)}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-pod hover:bg-chip text-xs font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                    >
                      <span>
                        {showAllChips
                          ? (isFr ? 'Moins d’options' : 'Fewer options')
                          : (isFr ? `Plus d’options (+${hiddenCount})` : `More ride options (+${hiddenCount})`)}
                      </span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Card 2: Constraints & Rules + Dynamic Preset Rules */}
        <div className="rounded-card bg-card text-ink p-4 sm:p-5 shadow-xs transition-colors space-y-5 animate-apple-step-in relative z-10">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className={`w-4 h-4 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  <h3 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
                    {t('tabConstraintsRules')}
                  </h3>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isFr
                    ? `Paramètres horaires et contraintes opérationnelles calibrés pour le mode ${trip.tag || activeArchetypeMode}`
                    : `Schedule timings and operational constraints calibrated for ${trip.tag || activeArchetypeMode} mode`}
                </p>
              </div>
            </div>

            {/* Baseline Ride Protocol for Active Archetype */}
            <div className="space-y-4">
            {/* COMMUTE / VELOTAF Baseline */}
            {activeArchetypeMode === 'COMMUTE' && (
              <div key="commute-baseline" className="space-y-4 animate-apple-step-in">
                {/* Food Restriction Toggle Capsule */}
                <div className="bg-pod rounded-2xl sm:rounded-full pl-3 pr-3.5 sm:pr-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconBadge
                      theme={trip.office?.strictNoFoodInOpenSpace ? 'yellow-vest' : 'greyscale'}
                      icon={ShieldCheck}
                      size="md"
                      isSelected={Boolean(trip.office?.strictNoFoodInOpenSpace)}
                      solidBacker
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-ink block leading-tight">
                        {t('openSpaceRestrictionTitle')}
                      </span>
                      <span className="text-[11px] text-ink-muted break-words leading-tight block mt-0.5 sm:mt-0">
                        {t('openSpaceRestrictionDesc')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateOffice('strictNoFoodInOpenSpace', !trip.office?.strictNoFoodInOpenSpace)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${CHIP_RING_BASE} ${
                      trip.office?.strictNoFoodInOpenSpace
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    {trip.office?.strictNoFoodInOpenSpace ? t('enforcedState') : t('advisoryState')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('shiftStartInputLabel')}
                    </label>
                    <input
                      type="time"
                      value={trip.office?.shiftStartTime || '09:00'}
                      onChange={(e) => updateOffice('shiftStartTime', e.target.value)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('targetArrivalInputLabel')}
                    </label>
                    <input
                      type="time"
                      value={trip.office?.targetGateArrivalTime || '08:30'}
                      onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('checkpointGateLabel')}
                    </label>
                    <input
                      type="text"
                      value={trip.office?.gateName || (isFr ? 'Entrée du site' : 'Workplace entrance')}
                      onChange={(e) => updateOffice('gateName', e.target.value)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('lockerRefuelInputLabel')}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={trip.office?.lockerRefuelMinutes ?? 10}
                      onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 10)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('showerChangeInputLabel')}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={trip.office?.showerChangeMinutes ?? 10}
                      onChange={(e) => updateOffice('showerChangeMinutes', parseInt(e.target.value, 10) || 10)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('breakRoomMealInputLabel')}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="45"
                      value={trip.office?.breakRoomBreakfastMinutes ?? 15}
                      onChange={(e) => updateOffice('breakRoomBreakfastMinutes', parseInt(e.target.value, 10) || 15)}
                      className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BIKEPACKING Baseline */}
            {activeArchetypeMode === 'BIKEPACKING' && (
              <div key="bikepacking-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-apple-step-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Couvre-feu camp / bivouac' : 'Camp pitch curfew'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '18:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Préparation camp & sacoches (min)' : 'Camp setup & bag prep (min)'}
                  </label>
                  <input
                    type="number"
                    value={trip.office.lockerRefuelMinutes || 25}
                    onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 25)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Point de bivouac cible' : 'Bivouac destination / zone'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || (isFr ? 'Zone de Bivouac / Camp' : 'Camp / Bivouac Site')}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* SPORT / FONDO Baseline */}
            {activeArchetypeMode === 'SPORT' && (
              <div key="sport-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-apple-step-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Arrivée d’étape / Barrière horaire' : 'Stage finish cutoff target'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '11:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Échauffement progressif (min)' : 'Progressive warmup spin (min)'}
                  </label>
                  <input
                    type="number"
                    value={trip.office.lockerRefuelMinutes || 15}
                    onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 15)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Ligne d’arrivée / Club' : 'Finish Line / Clubhouse'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || 'Finish Line'}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* ESCAPADE Baseline */}
            {activeArchetypeMode === 'ESCAPADE' && (
              <div key="escapade-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-apple-step-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Heure limite Check-in Hôtel' : 'Hotel Check-in cutoff'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '15:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Check-in hôtel, bagages & recharge (min)' : 'Hotel Check-in, luggage & charging (min)'}
                  </label>
                  <input
                    type="number"
                    value={trip.office.lockerRefuelMinutes || 15}
                    onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 15)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Hôtel / Hébergement d’arrivée' : 'Destination hotel / B&B'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || (isFr ? 'Réception Hôtel / Étape' : 'Hotel Check-in / Stage Lodging')}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full min-h-[44px] h-11 bg-pod rounded-full px-4 text-base sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic preset rules & constraints */}
        <div className="space-y-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">
                {t('presetRulesHeading')}
              </h4>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('presetRulesSub')}
              </p>
            </div>
            {activeChipDefs.length > 0 && (
              <Badge variant="yellow-vest" size="md" className="shrink-0">
                {t('chipsCountBadge', { count: activeChipDefs.length })}
              </Badge>
            )}
          </div>

          {activeChipDefs.length === 0 ? (
            <div key="empty-rules" className="rounded-pod border border-dashed border-ink/15 dark:border-white/15 p-5 text-center animate-apple-fade-in">
              <Info className="w-5 h-5 mx-auto text-zinc-400 dark:text-zinc-500 [--icon-secondary:currentColor] [--icon-secondary-opacity:0.3] mb-2" />
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                {t('noChipsActiveNotice')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeChipDefs.map((def) => (
                <PresetRuleCard
                  key={def.id}
                  def={def}
                  ruleSettings={trip.ruleSettings || {}}
                  isFr={isFr}
                  onUpdateSetting={updateRuleSetting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )}

  {activeStep === 'cycling-pace' && (
    <>
      {/* Card 1: Route & Pace Strategy */}
      <div className="relative z-20 focus-within:z-30 animate-apple-step-in">
        <ParameterTabs
          trip={trip}
          onChange={(updated) => commitTrip(updated)}
          initialTab="route"
          visibleTabs={['route']}
        />
      </div>

      {/* Card 2: Physics, Mass & Weather */}
      <div className="relative z-10 animate-apple-step-in">
        <ParameterTabs
          trip={trip}
          onChange={(updated) => commitTrip(updated)}
          initialTab="physics"
          visibleTabs={['physics', 'weather']}
        />
      </div>
    </>
  )}
</div>

{/* Right 2 Columns: Sticky Live Results Card */}
<div className="lg:col-span-2 min-w-0 lg:sticky lg:top-5 animate-apple-in stagger-3 relative z-10">
  <div className="bg-card text-ink rounded-card p-4 sm:p-5 shadow-xs transition-colors space-y-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
        {isFr ? 'Aperçu en direct' : 'Live ride summary'}
      </h3>
              <Badge
                variant={
                  physicsResult.goStatus === 'GO'
                    ? 'emerald'
                    : physicsResult.goStatus === 'CAUTION'
                    ? 'amber'
                    : 'rose'
                }
                size="md"
                dot
                title={physicsResult.goStatusReason}
              >
                {physicsResult.goStatus === 'GO' ? t('feasibilityOptimal') : physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}
              </Badge>
            </div>

            {/* Live Ride Conditions Banner */}
            <div
              className={`p-2.5 rounded-pod text-xs flex items-start gap-2 ${
                physicsResult.goStatus === 'GO'
                  ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : physicsResult.goStatus === 'CAUTION'
                  ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-500/10 text-rose-900 dark:text-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${
                  physicsResult.goStatus === 'GO'
                    ? CHIP_TOKENS.emerald.dot
                    : physicsResult.goStatus === 'CAUTION'
                    ? CHIP_TOKENS.amber.dot
                    : CHIP_TOKENS.rose.dot
                }`}
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold block">
                  {isFr ? 'Conditions météo' : 'Ride conditions'}:{' '}
                  {physicsResult.goStatus === 'GO'
                    ? t('feasibilityOptimal')
                    : physicsResult.goStatus === 'CAUTION'
                    ? t('feasibilityCaution')
                    : t('feasibilitySevere')}
                </span>
                <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                  {physicsResult.goStatusReason}
                </p>
              </div>
            </div>

            {/* Hero Hard Departure Pod (4-Layer Yellow-Vest Brand Surface) */}
            <div
              className={`${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} rounded-pod p-4 sm:p-5 transition-colors`}
            >
              <div className="flex items-center justify-between text-xs font-medium opacity-80">
                <span>
                  {isArriveAtMode
                    ? t('calculatedHardRollout')
                    : isFr
                    ? 'Départ programmé'
                    : 'Scheduled departure'}
                </span>
                <Clock className="w-4 h-4 text-current shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-3xl sm:text-4xl font-semibold text-current tracking-tight tnum">
                  {timelineResult.hardDepartureTime}
                </span>
                <span className="text-xs font-medium opacity-80 tnum">
                  {t('targetTimeLabel', { time: timelineResult.gateArrivalTime })}
                </span>
              </div>
              <div className="mt-2.5 pt-2 lane-divider text-[11px] space-y-0.5 tnum opacity-90">
                <div className="flex items-center justify-between">
                  <span>{t('timeSaddleExclPauses')}</span>
                  <span className="font-rounded font-semibold">{physicsResult.movingTimeFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('timePausesAndBuffers')}</span>
                  <span className="font-rounded font-semibold">+{timelineResult.bufferMinutes} min</span>
                </div>
              </div>
            </div>

            {/* Pace & Effort Breakdown (Guided vs Power mode) */}
            {effectiveSpecs.cockpitViewMode === 'pro' ? (
              <div className="bg-pod rounded-pod p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                  <span>{t('requiredLegOutput')}</span>
                  <Badge
                    variant={
                      physicsResult.powerZone === 'Z1'
                        ? 'emerald'
                        : physicsResult.powerZone === 'Z2'
                        ? 'lime'
                        : physicsResult.powerZone === 'Z3'
                        ? 'yellow-vest'
                        : physicsResult.powerZone === 'Z4'
                        ? 'amber'
                        : 'rose'
                    }
                    size="xs"
                    className="tnum font-bold"
                  >
                    {physicsResult.powerZone} &middot; {physicsResult.ftpPercent}% FTP
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2 mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold text-ink tracking-tight tnum">
                      {Math.round(physicsResult.legWatts)}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
                  </div>
                  <span className="text-xs font-semibold text-ink-secondary tnum">
                    {physicsResult.wattsPerKg} W/kg &middot; {physicsResult.effectiveSpeedKmH} km/h
                  </span>
                </div>

                <div className="text-xs">
                  <div className="lane-divider" aria-hidden="true" />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary">{t('aeroDragRow', { cda: trip.physics.cda })}</span>
                    <span className="text-ink font-semibold tnum">{Math.round(physicsResult.aerodynamicDragWatts)} W</span>
                  </div>
                  <div className="lane-divider" aria-hidden="true" />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary">{t('rollingRow', { crr: trip.physics.crr })}</span>
                    <span className="text-ink font-semibold tnum">{Math.round(physicsResult.rollingResistanceWatts)} W</span>
                  </div>
                  {Math.abs(Math.round(physicsResult.gravityWatts)) >= 2 && (
                    <>
                      <div className="lane-divider" aria-hidden="true" />
                      <div className="flex items-center justify-between py-2">
                        <span className="text-ink-secondary">
                          {isFr
                            ? `Pente (${trip.physics.gradientPercent}%)`
                            : `Grade (${trip.physics.gradientPercent}%)`}
                        </span>
                        <span className="text-ink font-semibold tnum">
                          {physicsResult.gravityWatts < 0 ? '−' : ''}
                          {Math.abs(Math.round(physicsResult.gravityWatts))} W
                        </span>
                      </div>
                    </>
                  )}
                  <div className="lane-divider" aria-hidden="true" />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-ink-secondary flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                      {t('drivetrainLossRow')}
                    </span>
                    <span className="text-ink font-semibold tnum">{Math.round(physicsResult.legWatts - physicsResult.wheelWatts)} W</span>
                  </div>
                  {trip.weather.isHeadwindActive && (
                    <>
                      <div className="lane-divider mt-2" aria-hidden="true" />
                      {physicsResult.pacingMode === 'effort' ? (
                        <div className={`flex items-center justify-between pt-2 font-semibold ${CHIP_TOKENS.emerald.primary}`}>
                          <span>
                            {lang === 'fr'
                              ? `Le vent vous ralentit de ${physicsResult.speedDeltaKmH} km/h (+${physicsResult.windDelayMinutes} min)`
                              : `Headwind slows you by ${physicsResult.speedDeltaKmH} km/h (adds ${physicsResult.windDelayMinutes} min)`}
                          </span>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-between pt-2 font-semibold ${CHIP_TOKENS.amber.primary}`}>
                          <span>{t('headwindSurchargeRow')}</span>
                          <span className="tnum">+{Math.round(physicsResult.powerDeltaWatts)} W</span>
                        </div>
                      )}
                    </>
                  )}
                  {!trip.weather.isHeadwindActive &&
                    trip.weather.windDirection === 'tailwind' &&
                    physicsResult.powerDeltaWatts < -1 && (
                      <>
                        <div className="lane-divider mt-2" aria-hidden="true" />
                        <div className={`flex items-center justify-between pt-2 font-semibold ${CHIP_TOKENS.emerald.primary}`}>
                          <span>{isFr ? 'Gain vent arrière' : 'Tailwind assist'}</span>
                          <span className="tnum">{Math.round(physicsResult.powerDeltaWatts)} W</span>
                        </div>
                      </>
                    )}
                </div>
              </div>
            ) : (
              <div className="bg-pod rounded-pod p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                  <span>{isFr ? 'Allure & Effort estimé' : 'Pace & Effort'}</span>
                  <Badge variant="zinc" size="xs" className="tnum font-semibold">
                    {physicsResult.powerZone === 'Z1' || physicsResult.powerZone === 'Z2'
                      ? (isFr ? 'Endurance fluide' : 'Steady endurance')
                      : (isFr ? 'Rythme soutenu' : 'Brisk effort')}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold text-ink tracking-tight tnum">
                      {physicsResult.effectiveSpeedKmH}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">km/h</span>
                  </div>
                  <span className="text-xs font-medium text-ink-secondary tnum">
                    {trip.weather.isHeadwindActive
                      ? (isFr ? `Vent de face · +${physicsResult.windDelayMinutes} min` : `Headwind · +${physicsResult.windDelayMinutes} min`)
                      : (isFr ? 'Vent modéré' : 'Moderate wind')}
                  </span>
                </div>
              </div>
            )}

            {/* Surface & 38c Gravel Suitability Summary Pod */}
            <div className="bg-pod rounded-pod p-4 sm:p-5 text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-rounded font-semibold text-ink">
                    {isFr ? 'Surfaces & Gravel' : 'Surface & Gravel Suitability'}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-rounded font-bold tnum ${
                      surfaceBreakdown.isLoadingOsm
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                        : surfaceBreakdown.dataSource === 'osm-overpass'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-ink/8 dark:bg-white/10 text-ink-muted'
                    }`}
                  >
                    {surfaceBreakdown.isLoadingOsm
                      ? (isFr ? 'Analyse…' : 'Syncing…')
                      : surfaceBreakdown.dataSource === 'osm-overpass'
                      ? `${isFr ? 'Carte' : 'Map'} · ${surfaceBreakdown.osmCoveragePct ?? 100}%`
                      : isFr
                      ? 'Estimé'
                      : 'Est.'}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-rounded font-bold tnum ${
                    surfaceBreakdown.suitability.overallLevel === 'ideal'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                      : surfaceBreakdown.suitability.overallLevel === 'good-with-care'
                      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30'
                  }`}
                >
                  {surfaceBreakdown.suitability.tireWidthMm}c ·{' '}
                  {surfaceBreakdown.suitability.scorePct}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10 p-0.5 flex items-stretch gap-0.5">
                {surfaceBreakdown.segments.map((seg) => {
                  const meta = SURFACE_VISUAL_META[seg.type];
                  const w = Math.max(4, seg.endPct - seg.startPct);
                  return (
                    <div
                      key={seg.id}
                      style={{ width: `${w}%` }}
                      title={`${isFr ? seg.nameFr : seg.nameEn} (km ${seg.startKm}–${seg.endKm})`}
                      className={`h-full first:rounded-l-full last:rounded-r-full ${meta.barBgClass}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] font-rounded font-semibold text-ink-secondary tnum">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                  {surfaceBreakdown.pavedPct}% {isFr ? 'Bitume' : 'Paved'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                  {surfaceBreakdown.gravelPct}% Gravel
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                  {surfaceBreakdown.singletrackPct}% {isFr ? 'Sentier' : 'Trail'}
                </span>
              </div>

              <p className="text-[11px] text-ink-muted leading-snug">
                {isFr
                  ? surfaceBreakdown.suitability.headlineFr
                  : surfaceBreakdown.suitability.headlineEn}{' '}
                ·{' '}
                <span className="font-rounded font-semibold text-ink tnum">
                  {surfaceBreakdown.suitability.recommendedFrontBar}/
                  {surfaceBreakdown.suitability.recommendedRearBar} bar
                </span>
              </p>
            </div>

            {/* Metabolic Fueling Summary */}
            <div className="bg-pod rounded-pod p-4 sm:p-5 text-xs">
              <div className="font-semibold text-ink mb-2">
                {t('metabolicExpenditureHeading')}
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-ink-secondary">{t('mechanicalWorkRow')}</span>
                <span className="text-ink font-semibold tnum">{Math.round(physicsResult.totalWorkKj)} kJ</span>
              </div>
              {effectiveSpecs.telemetryMode === 'quantitative' && (
                <>
                  <div className="lane-divider" aria-hidden="true" />
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-secondary">{t('caloricBurnRow')}</span>
                    <span className="text-ink font-semibold tnum">{Math.round(physicsResult.totalKcalBurn)} kcal</span>
                  </div>
                </>
              )}
              <div className="lane-divider" aria-hidden="true" />
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-ink-secondary">{t('carbOxidationRow')}</span>
                <span className={`font-semibold tnum ${CHIP_TOKENS.lime.primary}`}>
                  {effectiveSpecs.telemetryMode === 'quantitative'
                    ? `${physicsResult.carbOxidationGramPerHour} g/h`
                    : effectiveSpecs.telemetryMode === 'fuel-first'
                    ? `${Math.max(1, Math.round(physicsResult.carbOxidationGramPerHour / 20))} ${isFr ? 'unités/h' : 'fuel units/h'}`
                    : isFr
                    ? 'Rythme régulier'
                    : 'Steady rhythm'}
                </span>
              </div>
            </div>

            {/* Concise Protocol Capsule */}
            <div className="pl-2.5 pr-4 py-2.5 rounded-2xl sm:rounded-full bg-pod flex items-center gap-3">
              <IconBadge
                theme={(trip.customChips || []).includes('coffee-stop') ? 'amber' : 'yellow-vest'}
                icon={(trip.customChips || []).includes('coffee-stop') ? Coffee : ShieldCheck}
                size="md"
                solidBacker
              />
              <div className="min-w-0 text-xs">
                <span className="text-ink font-semibold block break-words leading-tight">
                  {(trip.customChips || []).includes('coffee-stop')
                    ? (isFr ? 'Pause café : Activée (+15 min)' : 'Coffee stop: Scheduled (+15 min)')
                    : archetype === 'sport'
                    ? t('protocolSport')
                    : archetype === 'bikepacking'
                    ? t('protocolBikepacking')
                    : archetype === 'escapade'
                    ? t('protocolEscapade')
                    : t('protocolDeskFoodBan', {
                        state: trip.office.strictNoFoodInOpenSpace ? t('enforcedState') : t('advisoryState'),
                      })}
                </span>
                <span className="text-ink-muted block break-words leading-tight mt-0.5">
                  {t('targetWithBuffer', {
                    time: timelineResult.gateArrivalTime,
                    buffer: timelineResult.bufferMinutes,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
