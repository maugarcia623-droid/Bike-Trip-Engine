import React, { useState, useEffect } from 'react';
import {
  FloppyDisk,
  ArrowLeft,
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
} from '@/components/icons';
import {
  fetchHourlyWeather,
  checkForecastHorizon,
  getLocalTodayIso,
  computeRouteBearing,
} from '../../services/weatherService';
import { TripProfile, TripStage, generateTripChecklist } from '../../types/trip';
import {
  downsampleCoordinates,
  switchActiveStage,
  addNextStage,
  removeStage,
  getExpeditionTotals,
} from '../../utils/stageManager';
import { ParameterTabs } from './ParameterTabs';
import { PresetRuleCard } from './PresetRuleCard';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { POPULAR_CYCLING_HUBS } from '../../services/locationService';
import { parseGpxFileContent } from '../../utils/gpxParser';
import { getActiveBike, loadRiderBikeSpecs } from '../../utils/specsStorage';
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
  const [trip, setTrip] = useState<TripProfile>(initialTrip);
  const tripRef = React.useRef<TripProfile>(trip);
  tripRef.current = trip;

  const commitTrip = (updater: TripProfile | ((prev: TripProfile) => TripProfile)): TripProfile => {
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
    onAutoSync?.(stamped);
    return stamped;
  };

  const [originInput, setOriginInput] = useState(trip.route.origin || 'Nantes');
  const [destInput, setDestInput] = useState(trip.route.destination || trip.office.gateName || 'Saint-Nazaire');
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
  const [isArriveAtMode, setIsArriveAtMode] = useState<boolean>(trip.arriveAtMode !== false);
  const [routeGenMode, setRouteGenMode] = useState<'corridor' | 'manual-radius' | 'gpx'>(() => {
    const initialMode = getArchetypeFromTag(initialTrip.tag, initialTrip.name);
    if (initialMode === 'BIKEPACKING') return 'corridor';
    if (initialTrip.route?.routeMode === 'gpx' || initialTrip.route?.gpxFileName) return 'gpx';
    if (initialTrip.route?.routeMode === 'manual-radius' || initialTrip.route?.radiusMeters) return 'manual-radius';
    return 'corridor';
  });
  const gpxConfigInputRef = React.useRef<HTMLInputElement>(null);

  const isFr = lang === 'fr';

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
      }
    }
  }, [initialTrip]);

  const handleSwapCorridor = () => {
    const prevOrigin = originInput;
    const prevDest = destInput;
    const prevOriginCoords = originCoords;
    const prevDestCoords = destCoords;

    setOriginInput(prevDest);
    setDestInput(prevOrigin);
    setOriginCoords(prevDestCoords);
    setDestCoords(prevOriginCoords);
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
  const physicsResult = calculatePhysics(trip.physics, trip.route, trip.weather, lang);
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
    }
  );
  const archetype = getTripArchetype(trip.tag, trip.name);
  const activeArchetypeMode = getArchetypeFromTag(trip.tag, trip.name);
  const localizedMeta = getLocalizedTripMeta(trip, lang);

  const effectiveDateStr = trip.departureDate || getLocalTodayIso();
  const forecastHorizon = checkForecastHorizon(effectiveDateStr);
  const daysOffset = forecastHorizon.daysOffset;
  const formattedDaysOffset = daysOffset >= 0 ? `T+${daysOffset}d` : `T${daysOffset}d`;

  const handleCalculateRoute = async () => {
    if (!originInput.trim() || !destInput.trim()) return;
    setIsRouting(true);
    setRouteError(null);
    setRouteSuccess(false);

    try {
      const result = await calculateAutoBikeRoute(
        originInput,
        destInput,
        originCoords,
        destCoords
      );
      if (result) {
        commitTrip((prev) => {
          const hasMultipleStages = Boolean(prev.stages && prev.stages.length > 1);
          let newName = prev.name;
          if (!hasMultipleStages) {
            newName = lang === 'fr' ? `${originInput} → ${destInput}` : `${originInput} → ${destInput} Tour`;
          } else {
            const isSingleStagePattern =
              !prev.name ||
              prev.name.includes('→') ||
              prev.name.startsWith('Custom') ||
              prev.name.startsWith('Vélotaf');
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
    const clampedKm = Math.max(5, Math.min(250, Math.round((nextDistanceRaw || 30) * 10) / 10));
    const center = resolveStartHubCoords(nextOrigin, nextCoords);
    const loopKm = Math.round((clampedKm / 2) * 10) / 10;
    const radiusMeters = Math.max(1000, Math.round((clampedKm / 2) * 1000));
    const destLabel = isFr ? `Rayon boucle ${loopKm} km` : `${loopKm} km loop radius`;

    setOriginInput(nextOriginRaw);
    if (nextCoords) setOriginCoords(nextCoords);
    setDestInput(destLabel);
    setRouteError(null);

    commitTrip((prev) => ({
      ...prev,
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
    }));
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
          name: parsed.trackName || prev.name,
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

      return {
        ...prev,
        tag: effectiveTag,
        checklist: syncedChecklist,
        customChips: retainedChips,
        ruleSettings: mergedRuleSettings,
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
          targetGateArrivalTime: defaultArrival,
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
    const updated = commitTrip((prev) => ({
      ...prev,
      arriveAtMode: isArriveAtMode,
    }));
    onSave(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
    return updated;
  };

  const handleLaunchDirect = () => {
    const updated = handleSave();
    onLaunch(updated);
  };

  const isBikepacking = activeArchetypeMode === 'BIKEPACKING';
  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const showStageSequencer = isBikepacking || hasMultipleStages;
  const isMultiDayBikepacking = isBikepacking && hasMultipleStages;

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
    const updated = commitTrip((prev) => addNextStage(prev));
    const nextOrigin = updated.route.origin || '';
    setOriginInput(nextOrigin);
    setDestInput('');
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
    const nextOrigin = updated.route.origin || '';
    const nextDest = updated.route.destination || '';
    setOriginInput(nextOrigin);
    setDestInput(nextDest);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 animate-fade-in space-y-5">
      {/* ── Top Page Header Bar with Editable Title & Summary ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink bg-card hover:bg-pod px-3.5 py-1.5 rounded-full transition-colors mb-2.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('backToFlightDeck')}</span>
          </button>

          {/* Editable Main Title at the top to gain space */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <input
                type="text"
                value={trip.name}
                onChange={(e) => commitTrip((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={isNew ? t('createNewProfileHeading') : t('tripNamePlaceholder')}
                className="w-full sm:w-auto sm:min-w-[260px] max-w-full text-xl sm:text-[28px] font-semibold text-ink tracking-tight bg-transparent border-b border-dashed border-ink/15 hover:border-ink/35 focus:border-solid focus:border-ink/60 focus:outline-none transition-colors"
                title="Click to rename trip"
              />
              <Badge variant="yellow-vest" size="md" dot className="shrink-0">
                {t('liveCalculationBadge')}
              </Badge>
              <Badge variant="zinc" size="md" className="shrink-0">
                {trip.tag || activeArchetypeMode}
              </Badge>
            </div>

            {/* Optional Summary Text Field directly underneath title */}
            <input
              type="text"
              value={trip.description || ''}
              onChange={(e) => commitTrip((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={isFr ? 'Ajouter des notes opérationnelles ou un résumé de route (optionnel)...' : 'Add an optional operational summary or route notes...'}
              className="w-full max-w-2xl text-xs sm:text-[13px] text-ink-muted placeholder:text-ink-muted/50 bg-transparent border-b border-transparent hover:border-ink/15 focus:border-ink/30 focus:text-ink focus:outline-none transition-colors py-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto shrink-0 self-start md:mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-10 px-4 text-[13px] font-medium text-ink bg-card hover:bg-pod rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap"
          >
            {hasSaved ? (
              <div className={`flex items-center gap-2 animate-fade-in ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                <CheckCircle className="w-4 h-4 text-current" />
                <span>{t('savedBtn')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 animate-fade-in">
                <FloppyDisk className={`w-4 h-4 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                <span>{t('saveProfileBtn')}</span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={handleLaunchDirect}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-4 sm:px-5 text-[13px] font-medium bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] rounded-full transition-all cursor-pointer whitespace-nowrap"
          >
            <span>{t('saveAndOpenBtn')}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── BENTO ROW 1: Route Generator (Left) + Schedule & Weather Sync (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Route Generator */}
        <div className="rounded-card bg-card text-ink p-4 flex flex-col justify-between transition-colors">
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

          {/* Multi-Day Stage Sequencer Bar */}
          {showStageSequencer && (
            <div className="rounded-pod bg-pod p-3 sm:p-3.5 mb-4 space-y-2.5 transition-colors border border-ink/5 dark:border-white/5">
              {/* Header & Expedition Summary Strip */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-volt ring-2 ring-volt/40 animate-pulse" />
                  <span className="text-xs font-bold text-ink tracking-tight font-rounded uppercase">
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

                      {/* Origin -> Destination text */}
                      <span className="text-xs font-semibold truncate min-w-0 max-w-[130px] sm:max-w-[190px]">
                        {originText} → {destText || '...'}
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
            </div>
          )}

          {/* Route Mode Body: Corridor (OSRM) | Start + Radius | Import .GPX */}
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 animate-fade-in">
                {/* Origin Input */}
                <div className="flex-1 relative min-w-0">
                  <LocationAutocompleteInput
                    id="origin-input"
                    label={t('originCityLabel')}
                    value={originInput}
                    dropdownAlign="left"
                    onChange={(val) => {
                      setOriginInput(val);
                      setOriginCoords(null);
                      setRouteSuccess(false);
                      setRouteError(null);
                      commitTrip((prev) => ({
                        ...prev,
                        route: { ...prev.route, origin: val },
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
                    }}
                    onKeyDownEnter={handleCalculateRoute}
                    placeholder={isFr ? 'ex. Nantes Quai, Gare...' : 'e.g. Nantes Quai, Station...'}
                  />
                </div>

                {/* Swap Button */}
                <div className="flex items-center justify-center self-center sm:self-end pb-0.5">
                  <button
                    type="button"
                    onClick={handleSwapCorridor}
                    title={t('swapCorridorBtn')}
                    className="h-11 w-11 flex items-center justify-center rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
                  >
                    <ArrowsLeftRight className="w-4 h-4 transition-transform duration-300" />
                  </button>
                </div>

                {/* Destination Input */}
                <div className="flex-1 relative min-w-0">
                  <LocationAutocompleteInput
                    id="destination-input"
                    label={t('destinationLabel')}
                    value={destInput}
                    dropdownAlign="right"
                    onChange={(val) => {
                      setDestInput(val);
                      setDestCoords(null);
                      setRouteSuccess(false);
                      setRouteError(null);
                      commitTrip((prev) => ({
                        ...prev,
                        route: { ...prev.route, destination: val },
                      }));
                    }}
                    onSelectLocation={(loc) => {
                      setDestInput(loc.name);
                      setDestCoords(loc.coordinates);
                      setRouteSuccess(false);
                      setRouteError(null);
                      commitTrip((prev) => ({
                        ...prev,
                        route: { ...prev.route, destination: loc.name },
                      }));
                    }}
                    onKeyDownEnter={handleCalculateRoute}
                    placeholder={isFr ? 'ex. Gate 17 Campus, Pornic...' : 'e.g. Gate 17 Campus, Clisson...'}
                  />
                </div>

                {/* Fetch Button in the same line */}
                <div className="self-stretch sm:self-end pb-0.5">
                  <button
                    type="button"
                    onClick={handleCalculateRoute}
                    disabled={isRouting}
                    className="h-11 px-5 w-full sm:w-auto flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#262626] text-white dark:bg-chip dark:hover:bg-chip-hover dark:text-ink disabled:opacity-50 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    {isRouting ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <span>{t('fetchRouteBtn')}</span>}
                  </button>
                </div>
              </div>
            )}

            {!isBikepacking && routeGenMode === 'manual-radius' && (
              <div className="space-y-3.5 animate-fade-in">
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
                      <span>{t('routeDistInputLabel')}</span>
                      <span className="font-mono font-bold tnum">{trip.route.distanceKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={200}
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
                      {[20, 40, 60, 90, 130].map((kmPreset) => (
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tnum cursor-pointer transition-colors ${
                            Math.round(trip.route.distanceKm) === kmPreset
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                              : 'bg-card hover:bg-chip text-ink-muted hover:text-ink'
                          }`}
                        >
                          {kmPreset}km
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`rounded-pod px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0 text-current" />
                    <span className="font-semibold truncate">
                      {originInput || trip.route.origin || 'Nantes'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold tnum shrink-0">
                    {t('radiusLoopReachSub', {
                      loop: Math.round(((trip.route.distanceKm || 30) / 2) * 10) / 10,
                      oneWay: trip.route.distanceKm,
                    })}
                  </span>
                </div>
              </div>
            )}

            {!isBikepacking && routeGenMode === 'gpx' && (
              <div className="animate-fade-in">
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
                <div className={`flex items-center gap-2 text-xs font-medium tnum animate-fade-in ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}>
                  <CheckCircle className="w-4 h-4 shrink-0 text-current" />
                  <span className="truncate">{t('routeUpdatedMsg', { dist: trip.route.distanceKm })}</span>
                </div>
              ) : routeError ? (
                <p className={`text-xs font-medium animate-fade-in ${CHIP_TOKENS.rose.primary}`}>{routeError}</p>
              ) : (
                <p className="text-xs text-ink-muted tnum truncate animate-fade-in">
                  {isFr ? 'Itinéraire actif' : 'Active route'} : {trip.route.origin || originInput} &gt; {trip.route.destination || destInput} ({trip.route.distanceKm} km
                  {trip.route.elevationGainM ? ` · +${trip.route.elevationGainM}m` : ''}
                  {trip.route.routeMode === 'gpx' && trip.route.gpxFileName
                    ? ` · ${trip.route.gpxFileName}`
                    : trip.route.routeMode === 'manual-radius'
                    ? isFr
                      ? ' · Rayon boucle sur carte'
                      : ' · Map radius circle'
                    : (trip.route.coordinates?.length || 0) > 1
                    ? isFr
                      ? ' · Tracé GPS préchargé'
                      : ' · Pre-fetched GPS trace'
                    : ''}
                  )
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Schedule & Weather Sync */}
        <div className="rounded-card bg-card text-ink p-4 flex flex-col justify-between transition-colors">
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod hover:bg-chip text-xs font-semibold text-ink-secondary hover:text-ink transition-all duration-150 cursor-pointer active:scale-95"
                title="Toggle between Target Arrival and Rollout Time calculation"
              >
                <ArrowsClockwise className={`w-4 h-4 text-ink-muted transition-transform duration-300 ${isArriveAtMode ? 'rotate-0' : 'rotate-180'}`} />
                <span>
                  {isArriveAtMode
                    ? isMultiDayBikepacking
                      ? t('stageCutoffLabel')
                      : isFr
                      ? 'Arrivée à :'
                      : 'Arrive at :'
                    : isFr
                    ? 'Départ à :'
                    : 'Depart at :'}
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
                  className={`flex items-center gap-1.5 text-xs font-medium animate-fade-in ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
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
                <p className="text-xs text-ink-muted tnum animate-fade-in">
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
      </div>

      {/* ── BENTO ROW 2: Ride Archetype & Identity with Nested Constraints & Rules ── */}
      <div className="rounded-card bg-card text-ink p-4 transition-colors space-y-6">
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
            {t('modeBadge', { tag: trip.tag || 'VÉLOTAF' })}
          </Badge>
        </div>

        {/* 1. Trip Archetype Selector Pills (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <div className="text-[13px] font-semibold tracking-tight truncate">
                    {col.label}
                  </div>
                  <div className={`text-xs truncate transition-colors duration-200 ${isArchetypeActive ? 'opacity-80' : 'text-ink-muted'}`}>
                    {col.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 2. Constraints & Rules */}
        <div className="pt-5 border-t border-dashed border-ink/10 dark:border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className={`w-4 h-4 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                <h3 className="text-sm sm:text-base font-semibold tracking-tight text-ink">
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
              <div key="commute-baseline" className="space-y-4 animate-fade-in">
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
                      <span className="text-[11px] text-ink-muted line-clamp-2 sm:truncate block mt-0.5 sm:mt-0">
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
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
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
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                      {t('checkpointGateLabel')}
                    </label>
                    <input
                      type="text"
                      value={trip.office?.gateName || (isFr ? 'Porte 17' : 'Gate 17')}
                      onChange={(e) => updateOffice('gateName', e.target.value)}
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
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
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
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
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
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
                      className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BIKEPACKING Baseline */}
            {activeArchetypeMode === 'BIKEPACKING' && (
              <div key="bikepacking-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Couvre-feu camp / bivouac' : 'Camp pitch curfew'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '18:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Démontage camp matinal (min)' : 'Morning camp breakdown (min)'}
                  </label>
                  <input
                    type="number"
                    value={trip.office.lockerRefuelMinutes || 25}
                    onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 25)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Point de bivouac cible' : 'Bivouac destination / zone'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || 'Bivouac Site'}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* SPORT / FONDO Baseline */}
            {activeArchetypeMode === 'SPORT' && (
              <div key="sport-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Arrivée d’étape / Barrière horaire' : 'Stage finish cutoff target'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '11:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
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
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Ligne d’arrivée / SAS' : 'Stage finish line / Gate'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || 'Finish Line'}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* ESCAPADE Baseline */}
            {activeArchetypeMode === 'ESCAPADE' && (
              <div key="escapade-baseline" className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Heure limite accueil hôtel' : 'Hotel check-in cutoff'}
                  </label>
                  <input
                    type="time"
                    value={trip.office.targetGateArrivalTime || '15:00'}
                    onChange={(e) => updateOffice('targetGateArrivalTime', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Dépôt bagages & local vélo (min)' : 'Luggage drop & room staging (min)'}
                  </label>
                  <input
                    type="number"
                    value={trip.office.lockerRefuelMinutes || 15}
                    onChange={(e) => updateOffice('lockerRefuelMinutes', parseInt(e.target.value, 10) || 15)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {isFr ? 'Hôtel / Hébergement d’arrivée' : 'Destination hotel / B&B'}
                  </label>
                  <input
                    type="text"
                    value={trip.office.gateName || 'Hôtel de la Paix'}
                    onChange={(e) => updateOffice('gateName', e.target.value)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Preset chips for the selected archetype */}
        <div className="py-2.5 px-1 space-y-2.5 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="text-center">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              {isFr
                ? `Badges de personnalisation (${activeArchetypeMode.toLowerCase()}) :`
                : `Preset chips for ${activeArchetypeMode.toLowerCase()} :`}
            </span>
          </div>

          <div
            key={activeArchetypeMode}
            className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto py-1 animate-fade-in"
          >
            {ARCHETYPE_CHIP_DEFINITIONS[activeArchetypeMode].map((chip) => {
              const isSelected = (trip.customChips || []).includes(chip.id);
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
                  className="h-8 font-bold text-xs"
                />
              );
            })}
          </div>
        </div>

        {/* 4. Dynamic preset rules & constraints */}
        <div className="space-y-4 pt-5 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
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
            <div key="empty-rules" className="rounded-pod border border-dashed border-ink/15 dark:border-white/15 p-5 text-center animate-fade-in">
              <Info className="w-5 h-5 mx-auto text-zinc-400 dark:text-zinc-500 [--icon-secondary:currentColor] [--icon-secondary-opacity:0.3] mb-2" />
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                {t('noChipsActiveNotice')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* ── BENTO ROW 3: Parameter Tabs (Physics, Route, Weather) + Live Telemetry Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ParameterTabs
            trip={trip}
            onChange={(updated) => commitTrip(updated)}
            initialTab="physics"
          />
        </div>

        {/* Right Col: Sticky Live Telemetry Engine */}
        <div>
          <div className="bg-card text-ink rounded-card p-4 sticky top-20 transition-colors space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-ink">
                {t('liveTelemetryHeading')}
              </h3>
              <Badge
                variant={
                  physicsResult.goStatus === 'GO'
                    ? 'emerald'
                    : physicsResult.goStatus === 'CAUTION'
                    ? 'yellow-vest'
                    : 'rose'
                }
                size="md"
                dot
              >
                {physicsResult.goStatus}
              </Badge>
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
                    : 'Scheduled rollout'}
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
              <div className="mt-2.5 pt-2 border-t border-current/15 text-[11px] space-y-0.5 tnum opacity-90">
                <div className="flex items-center justify-between">
                  <span>{t('timeSaddleExclPauses')}</span>
                  <span className="font-mono font-bold">{physicsResult.movingTimeFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('timePausesAndBuffers')}</span>
                  <span className="font-mono font-bold">+{timelineResult.bufferMinutes}m</span>
                </div>
              </div>
            </div>

            {/* Power Matrix Breakdown */}
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
                  {physicsResult.wattsPerKg} W/kg &middot; @{physicsResult.effectiveSpeedKmH} km/h
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
                  <span className="text-ink-secondary">{t('drivetrainLossRow')}</span>
                  <span className="text-ink font-semibold tnum">{Math.round(physicsResult.legWatts - physicsResult.wheelWatts)} W</span>
                </div>
                {trip.weather.isHeadwindActive && (
                  <>
                    <div className="lane-divider mt-2" aria-hidden="true" />
                    {physicsResult.pacingMode === 'effort' ? (
                      <div className={`flex items-center justify-between pt-2 font-semibold ${CHIP_TOKENS.emerald.primary}`}>
                        <span>{t('headwindSlowdownRow')}</span>
                        <span className="tnum">
                          &minus;{physicsResult.speedDeltaKmH} km/h (+{physicsResult.windDelayMinutes}m)
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

            {/* Metabolic Fueling Summary */}
            <div className="bg-pod rounded-pod p-4 sm:p-5 text-xs">
              <div className="font-semibold text-ink mb-2">
                {t('metabolicExpenditureHeading')}
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-ink-secondary">{t('mechanicalWorkRow')}</span>
                <span className="text-ink font-semibold tnum">{Math.round(physicsResult.totalWorkKj)} kJ</span>
              </div>
              <div className="lane-divider" aria-hidden="true" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-ink-secondary">{t('caloricBurnRow')}</span>
                <span className="text-ink font-semibold tnum">{Math.round(physicsResult.totalKcalBurn)} kcal</span>
              </div>
              <div className="lane-divider" aria-hidden="true" />
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-ink-secondary">{t('carbOxidationRow')}</span>
                <span className={`font-semibold tnum ${CHIP_TOKENS.lime.primary}`}>{physicsResult.carbOxidationGramPerHour} g/h</span>
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
                <span className="text-ink font-semibold block truncate">
                  {(trip.customChips || []).includes('coffee-stop')
                    ? (isFr ? 'Pause café : Activée (+15 min)' : 'Coffee stop: Scheduled (+15m)')
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
                <span className="text-ink-muted block truncate">
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
