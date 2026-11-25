import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from "@/components/arc/button/button";
import {
  ArrowRight,
  Bed,
  Bike,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  LocateFixed,
  Luggage,
  MapPin,
  Minus,
  Moon,
  Mountains,
  Pen,
  Plus,
  Route,
  Sparkle,
  SpinnerGap,
  Sunset,
  Tent,
  Train,
  TriangleAlert,
  X,
  type IconProps,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { getLocalTodayIso } from '../../services/weatherService';
import {
  applyStageSlicesToTrip,
  clampAndSortCuts,
  computeDefaultCutDistances,
  extractFullTourSpine,
  findNearestDistanceOnSpine,
  FullTourSpine,
  getMinStageDistanceKm,
  interpolateCoordAtDistance,
  interpolateElevationAtDistance,
  mergeTourStagesToSingleDay,
  moveSingleCut,
  SlicedStagePreview,
  sliceRouteIntoStagePreviews,
  StageSliceBalanceMode,
  suggestDayCount,
} from '../../utils/gpxSlicer';
import {
  findOvernightSpotsNearCut,
  OvernightSpot,
  OvernightSpotKind,
  resolveCutTownName,
} from '../../services/overnightFinder';
import {
  CHIP_RING_BASE,
  CHIP_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';

export interface GpxStageSlicerModalProps {
  isOpen: boolean;
  trip: TripProfile;
  riderSpecs?: RiderBikeSpecs;
  /** Optional initial number of days (e.g. from quick "2d / 3d / 4d" banner buttons). */
  initialDays?: number;
  onClose: () => void;
  onApply: (updatedTrip: TripProfile) => void;
}

interface PacePreset {
  id: 'relaxed' | 'steady' | 'moderate' | 'fast';
  labelEn: string;
  labelFr: string;
  speedKmH: number;
}

const PACE_PRESETS: PacePreset[] = [
  { id: 'relaxed', labelEn: 'Relaxed', labelFr: 'Cool', speedKmH: 17 },
  { id: 'steady', labelEn: 'Steady', labelFr: 'Régulier', speedKmH: 20 },
  { id: 'moderate', labelEn: 'Moderate', labelFr: 'Soutenu', speedKmH: 23 },
  { id: 'fast', labelEn: 'Fast', labelFr: 'Rapide', speedKmH: 26 },
];

interface LoadPreset {
  id: 'light' | 'daypack' | 'bikepacking' | 'expedition';
  labelEn: string;
  labelFr: string;
  luggageKg: number;
}

const LOAD_PRESETS: LoadPreset[] = [
  { id: 'light', labelEn: 'Light', labelFr: 'Léger', luggageKg: 1.5 },
  { id: 'daypack', labelEn: 'Daypack', labelFr: 'Sac léger', luggageKg: 4 },
  { id: 'bikepacking', labelEn: 'Bikepacking', labelFr: 'Bikepacking', luggageKg: 8 },
  { id: 'expedition', labelEn: 'Heavy tour', labelFr: 'Voyage chargé', luggageKg: 14 },
];

const START_TIME_PRESETS = ['07:30', '08:00', '08:30', '09:00', '09:30'];

function getBasemapUrls(dark: boolean): { base: string; ref: string } {
  return dark
    ? {
        base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ref: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      }
    : {
        base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ref: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      };
}

function formatShortDate(iso: string, lang: 'en' | 'fr'): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function closestLoadPresetKg(currentKg: number): number {
  if (!Number.isFinite(currentKg) || currentKg <= 2.5) return 8; // Default bikepacking for multi-day
  let best = LOAD_PRESETS[2].luggageKg;
  let bestDiff = Infinity;
  for (const p of LOAD_PRESETS) {
    const diff = Math.abs(p.luggageKg - currentKg);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.luggageKg;
    }
  }
  return best;
}

function getSpotKindIcon(kind: OvernightSpotKind) {
  switch (kind) {
    case 'campsite':
      return Tent;
    case 'lodging':
      return Bed;
    case 'station':
      return Train;
    default:
      return MapPin;
  }
}

function looksLikeGenericTrackLabel(label: string, tripName: string, gpxFileName?: string): boolean {
  const clean = (label || '').trim().toLowerCase();
  if (!clean) return true;
  if (/\((loop|start|finish|départ|arrivée|boucle)\)$/i.test(clean)) return true;
  if (/^(route start|route finish|départ trace|arrivée trace|start|finish)$/i.test(clean)) return true;
  const cleanTrip = (tripName || '').trim().toLowerCase();
  if (cleanTrip && clean === cleanTrip) return true;
  if (gpxFileName) {
    const stem = gpxFileName.replace(/\.(gpx|tcx|fit)$/i, '').replace(/[_-]+/g, ' ').trim().toLowerCase();
    if (stem && (clean === stem || clean.includes(stem))) return true;
  }
  return false;
}

export const GpxStageSlicerModal: React.FC<GpxStageSlicerModalProps> = ({
  isOpen,
  trip,
  riderSpecs,
  initialDays,
  onClose,
  onApply,
}) => {
  const { isDark } = useTheme();
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  // Extract full tour spine once when opened (or when trip changes)
  const spine: FullTourSpine | null = useMemo(
    () => (isOpen ? extractFullTourSpine(trip) : null),
    [isOpen, trip]
  );

  const isAlreadyMultiDay = Boolean(trip.stages && trip.stages.length > 1);

  // Core slicer state
  const [dayCount, setDayCount] = useState<number>(3);
  const [balanceMode, setBalanceMode] = useState<StageSliceBalanceMode>('effort');
  const [cutDistancesKm, setCutDistancesKm] = useState<number[]>([]);
  const [cutLabels, setCutLabels] = useState<Record<number, string>>({});
  const [startLabel, setStartLabel] = useState<string>('');
  const [endLabel, setEndLabel] = useState<string>('');
  const [cutAccommodationNotes, setCutAccommodationNotes] = useState<Record<number, string>>({});

  // Ride settings tucked in the Komoot-style bottom popover
  const [startDateIso, setStartDateIso] = useState<string>(trip.departureDate || getLocalTodayIso());
  const [dailyStartTime, setDailyStartTime] = useState<string>(trip.departureTime || '08:30');
  const [targetSpeedKmH, setTargetSpeedKmH] = useState<number>(
    Math.min(28, Math.max(15, Math.round(trip.route.targetSpeedKmH || 20)))
  );
  const [luggageWeightKg, setLuggageWeightKg] = useState<number>(() =>
    closestLoadPresetKg(trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 8)
  );
  const [showRideSettingsPopover, setShowRideSettingsPopover] = useState<boolean>(false);

  // Interactive UI state
  const [focusedStageIdx, setFocusedStageIdx] = useState<number | null>(null);
  const [activeCutIdx, setActiveCutIdx] = useState<number | null>(null);
  const [draggingCutIdx, setDraggingCutIdx] = useState<number | null>(null);
  const [hoverDistKm, setHoverDistKm] = useState<number | null>(null);
  const [isStagePanelExpanded, setIsStagePanelExpanded] = useState<boolean>(true);
  const [editingLocKey, setEditingLocKey] = useState<'start' | 'end' | number | null>(null);

  // Overnight spot discovery state per cut index
  const [overnightSpotsByCut, setOvernightSpotsByCut] = useState<Record<number, OvernightSpot[]>>({});
  const [loadingSpotsCutIdx, setLoadingSpotsCutIdx] = useState<number | null>(null);
  const [emptySpotsCutIdx, setEmptySpotsCutIdx] = useState<number | null>(null);

  // Refs for Leaflet map & elevation chart
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const refTileRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const endpointsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const cutMarkersRef = useRef<L.Marker[]>([]);
  const draggingMapCutRef = useRef<number | null>(null);
  const spotsLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const elevContainerRef = useRef<HTMLDivElement | null>(null);
  const elevPointerDownRef = useRef<{ x: number; y: number } | null>(null);

  // Keep latest state accessible to Leaflet imperative drag callbacks
  const cutsRef = useRef<number[]>(cutDistancesKm);
  cutsRef.current = cutDistancesKm;
  const spineRef = useRef<FullTourSpine | null>(spine);
  spineRef.current = spine;

  // Initialize state cleanly every time modal opens
  useEffect(() => {
    if (!isOpen || !spine) return;

    const existingCuts = spine.initialCutDistancesKm;
    let nextDays: number;
    let nextCuts: number[];
    const nextLabels: Record<number, string> = {};
    const nextNotes: Record<number, string> = {};

    if (!initialDays && existingCuts && existingCuts.length > 0) {
      nextDays = existingCuts.length + 1;
      nextCuts = existingCuts;
      (spine.initialCutLabels || []).forEach((lbl, i) => {
        if (lbl) nextLabels[i] = lbl;
      });
      (spine.initialAccommodationNotes || []).forEach((note, i) => {
        if (note) nextNotes[i] = note;
      });
    } else {
      nextDays = initialDays
        ? Math.max(2, Math.min(10, initialDays))
        : suggestDayCount(spine.totalDistanceKm, spine.totalElevationGainM);
      nextCuts = computeDefaultCutDistances(spine, nextDays, 'effort');
    }

    setDayCount(nextDays);
    setBalanceMode('effort');
    setCutDistancesKm(nextCuts);
    setCutLabels(nextLabels);
    setStartLabel(
      looksLikeGenericTrackLabel(spine.originLabel, trip.name, spine.gpxFileName)
        ? ''
        : spine.originLabel
    );
    setEndLabel(
      looksLikeGenericTrackLabel(spine.destLabel, trip.name, spine.gpxFileName)
        ? ''
        : spine.destLabel
    );
    setCutAccommodationNotes(nextNotes);
    setStartDateIso(trip.departureDate || getLocalTodayIso());
    setDailyStartTime(trip.departureTime || '08:30');
    setTargetSpeedKmH(
      Math.min(28, Math.max(15, Math.round(trip.route.targetSpeedKmH || 20)))
    );
    setLuggageWeightKg(
      closestLoadPresetKg(trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 8)
    );
    setFocusedStageIdx(null);
    setActiveCutIdx(null);
    setDraggingCutIdx(null);
    setHoverDistKm(null);
    setOvernightSpotsByCut({});
    setLoadingSpotsCutIdx(null);
    setEmptySpotsCutIdx(null);
    setShowRideSettingsPopover(false);
    setEditingLocKey(null);
    // On narrow phones, start with the floating stage drawer collapsed so map + slider take over
    if (typeof window !== 'undefined') {
      setIsStagePanelExpanded(window.innerWidth >= 768);
    }
  }, [isOpen, spine, initialDays, trip.name, trip.departureDate, trip.departureTime, trip.route.targetSpeedKmH, trip.physics.luggageWeightKg, trip.physics.gearWeightKg]);

  // Reverse-geocode Start and Finish coordinates when their labels were generic GPX/file names
  useEffect(() => {
    if (!isOpen || !spine || spine.coordinates.length < 2) return;
    const needStart = looksLikeGenericTrackLabel(spine.originLabel, trip.name, spine.gpxFileName);
    const needEnd = looksLikeGenericTrackLabel(spine.destLabel, trip.name, spine.gpxFileName);
    if (!needStart && !needEnd) return;

    let cancelled = false;
    const startPt = spine.coordinates[0];
    const endPt = spine.coordinates[spine.coordinates.length - 1];

    (async () => {
      if (needStart) {
        const resolvedStart = await resolveCutTownName(startPt[0], startPt[1], lang);
        if (!cancelled && resolvedStart) {
          setStartLabel((prev) => (prev.trim() ? prev : resolvedStart));
        }
      }
      if (needEnd) {
        const resolvedEnd = await resolveCutTownName(endPt[0], endPt[1], lang);
        if (!cancelled && resolvedEnd) {
          setEndLabel((prev) => (prev.trim() ? prev : resolvedEnd));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, spine, trip.name, lang]);

  // Body scroll lock & Escape handler while open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRideSettingsPopover) {
          setShowRideSettingsPopover(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, showRideSettingsPopover]);

  // Effective physics with the chosen bikepacking load preset
  const effectivePhysics = useMemo(
    () => ({
      ...trip.physics,
      luggageWeightKg,
      gearWeightKg: luggageWeightKg,
    }),
    [trip.physics, luggageWeightKg]
  );

  // Live sliced stage previews
  const stagePreviews: SlicedStagePreview[] = useMemo(() => {
    if (!spine || cutDistancesKm.length === 0) return [];
    return sliceRouteIntoStagePreviews(spine, cutDistancesKm, {
      startDateIso,
      dailyStartTime,
      physics: effectivePhysics,
      targetSpeedKmH,
      weather: trip.weather,
      lang,
      ftpWatts: riderSpecs?.ftpWatts,
      cutLabels,
      originLabelOverride: startLabel || undefined,
      destLabelOverride: endLabel || undefined,
      cutAccommodationNotes,
    });
  }, [
    spine,
    cutDistancesKm,
    startDateIso,
    dailyStartTime,
    effectivePhysics,
    targetSpeedKmH,
    trip.weather,
    lang,
    riderSpecs?.ftpWatts,
    cutLabels,
    startLabel,
    endLabel,
    cutAccommodationNotes,
  ]);

  // Debounced automatic reverse-geocoding for unnamed cut points when dragging stops
  const cutSignature = cutDistancesKm.map((d) => Math.round(d)).join(',');
  useEffect(() => {
    if (!isOpen || !spine || draggingCutIdx !== null || cutDistancesKm.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      for (let i = 0; i < cutDistancesKm.length; i++) {
        if (cancelled) return;
        const coord = interpolateCoordAtDistance(spine, cutDistancesKm[i]);
        const resolved = await resolveCutTownName(coord[0], coord[1], lang);
        if (cancelled || !resolved) continue;
        setCutLabels((prev) => {
          // Only overwrite if empty or previously auto-filled (never clobber active manual edit)
          if (prev[i] && prev[i].trim().length > 0) return prev;
          return { ...prev, [i]: resolved };
        });
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, spine, cutSignature, balanceMode, dayCount, draggingCutIdx, lang]);

  // Helper: clear a cut's auto-label when user drags it significantly so reverse-geocode refreshes
  const updateCutDistance = useCallback(
    (cutIdx: number, nextDistKm: number, clearLabel = true) => {
      const s = spineRef.current;
      if (!s) return;
      setCutDistancesKm((prev) => moveSingleCut(prev, cutIdx, nextDistKm, s.totalDistanceKm));
      if (clearLabel) {
        setCutLabels((prev) => {
          if (!prev[cutIdx]) return prev;
          const copy = { ...prev };
          delete copy[cutIdx];
          return copy;
        });
        setCutAccommodationNotes((prev) => {
          if (!prev[cutIdx]) return prev;
          const copy = { ...prev };
          delete copy[cutIdx];
          return copy;
        });
      }
    },
    []
  );

  // Change day count cleanly
  const handleChangeDays = useCallback(
    (delta: number) => {
      if (!spine) return;
      const nextDays = Math.max(2, Math.min(10, dayCount + delta));
      if (nextDays === dayCount) return;
      setDayCount(nextDays);
      setCutDistancesKm(computeDefaultCutDistances(spine, nextDays, balanceMode));
      setCutLabels({});
      setCutAccommodationNotes({});
      setOvernightSpotsByCut({});
      setActiveCutIdx(null);
      setFocusedStageIdx(null);
    },
    [spine, dayCount, balanceMode]
  );

  // Switch between Effort-Balanced and Equal-Distance cuts
  const handleSelectBalanceMode = useCallback(
    (mode: StageSliceBalanceMode) => {
      if (!spine) return;
      setBalanceMode(mode);
      setCutDistancesKm(computeDefaultCutDistances(spine, dayCount, mode));
      setCutLabels({});
      setCutAccommodationNotes({});
      setOvernightSpotsByCut({});
    },
    [spine, dayCount]
  );

  // Insert a new overnight split directly at a clicked distance on the elevation curve
  const handleInsertCutAtDistance = useCallback(
    (distKm: number) => {
      if (!spine || dayCount >= 10) return;
      const gap = getMinStageDistanceKm(spine.totalDistanceKm, dayCount + 1);
      // Ignore clicks too close to start, finish, or an existing cut
      if (distKm < gap || distKm > spine.totalDistanceKm - gap) return;
      if (cutDistancesKm.some((c) => Math.abs(c - distKm) < gap)) return;

      const insertIdx = cutDistancesKm.filter((c) => c < distKm).length;
      const nextCuts = clampAndSortCuts([...cutDistancesKm, distKm], spine.totalDistanceKm);

      // Shift existing cut labels & accommodation notes past insertIdx
      setCutLabels((prev) => {
        const shifted: Record<number, string> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const i = Number(k);
          shifted[i >= insertIdx ? i + 1 : i] = v;
        });
        return shifted;
      });
      setCutAccommodationNotes((prev) => {
        const shifted: Record<number, string> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const i = Number(k);
          shifted[i >= insertIdx ? i + 1 : i] = v;
        });
        return shifted;
      });
      setDayCount(nextCuts.length + 1);
      setCutDistancesKm(nextCuts);
      setActiveCutIdx(insertIdx);
      setOvernightSpotsByCut({});
    },
    [spine, dayCount, cutDistancesKm]
  );

  // Remove a specific overnight split when dayCount > 2
  const handleRemoveCut = useCallback(
    (cutIdx: number) => {
      if (!spine || cutDistancesKm.length <= 1) return;
      const nextCuts = cutDistancesKm.filter((_, i) => i !== cutIdx);
      setCutLabels((prev) => {
        const shifted: Record<number, string> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const i = Number(k);
          if (i < cutIdx) shifted[i] = v;
          else if (i > cutIdx) shifted[i - 1] = v;
        });
        return shifted;
      });
      setCutAccommodationNotes((prev) => {
        const shifted: Record<number, string> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const i = Number(k);
          if (i < cutIdx) shifted[i] = v;
          else if (i > cutIdx) shifted[i - 1] = v;
        });
        return shifted;
      });
      setDayCount(nextCuts.length + 1);
      setCutDistancesKm(nextCuts);
      setActiveCutIdx(null);
      setOvernightSpotsByCut({});
    },
    [spine, cutDistancesKm]
  );

  // Search Overpass + Photon for real campsites / hotels / train stations / towns near cutIdx
  const handleFindOvernightSpots = useCallback(
    async (cutIdx: number) => {
      if (!spine || cutIdx < 0 || cutIdx >= cutDistancesKm.length) return;
      // Toggle closed if already showing results for this cut
      if (activeCutIdx === cutIdx && overnightSpotsByCut[cutIdx] && loadingSpotsCutIdx !== cutIdx) {
        setActiveCutIdx(null);
        return;
      }
      setActiveCutIdx(cutIdx);
      setEmptySpotsCutIdx(null);
      setLoadingSpotsCutIdx(cutIdx);
      try {
        const coord = interpolateCoordAtDistance(spine, cutDistancesKm[cutIdx]);
        const spots = await findOvernightSpotsNearCut(coord[0], coord[1], 9000);
        setOvernightSpotsByCut((prev) => ({ ...prev, [cutIdx]: spots }));
        if (spots.length === 0) {
          setEmptySpotsCutIdx(cutIdx);
        }
        // Gently pan map toward the cut so overnight pins are visible
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coord[0], coord[1]], Math.max(mapInstanceRef.current.getZoom(), 11), {
            duration: 0.45,
          });
        }
      } finally {
        setLoadingSpotsCutIdx((curr) => (curr === cutIdx ? null : curr));
      }
    },
    [spine, cutDistancesKm, activeCutIdx, overnightSpotsByCut, loadingSpotsCutIdx]
  );

  // Snap a cut to the closest point on the route to a chosen campsite / hotel / station / town
  const handleSnapCutToSpot = useCallback(
    (cutIdx: number, spot: OvernightSpot) => {
      if (!spine) return;
      const gap = getMinStageDistanceKm(spine.totalDistanceKm, dayCount);
      const minKm = cutIdx === 0 ? gap : cutDistancesKm[cutIdx - 1] + gap;
      const maxKm =
        cutIdx === cutDistancesKm.length - 1
          ? spine.totalDistanceKm - gap
          : cutDistancesKm[cutIdx + 1] - gap;
      const projected = findNearestDistanceOnSpine(spine, spot.lat, spot.lng, minKm, maxKm);

      setCutDistancesKm((prev) =>
        moveSingleCut(prev, cutIdx, projected.distKm, spine.totalDistanceKm)
      );
      setCutLabels((prev) => ({ ...prev, [cutIdx]: spot.name }));

      const kindNote =
        spot.kind === 'campsite'
          ? isFr
            ? 'Camping'
            : 'Camp'
          : spot.kind === 'lodging'
          ? isFr
            ? 'Hébergement'
            : 'Lodging'
          : spot.kind === 'station'
          ? isFr
            ? 'Gare'
            : 'Train'
          : isFr
          ? 'Bourg'
          : 'Town';
      const offStr =
        projected.offRouteKm <= 0.2
          ? isFr
            ? 'sur la trace'
            : 'on route'
          : isFr
          ? `à ${projected.offRouteKm} km de la trace`
          : `${projected.offRouteKm} km off route`;
      setCutAccommodationNotes((prev) => ({
        ...prev,
        [cutIdx]: `${kindNote} · ${spot.name} (${offStr})`,
      }));
    },
    [spine, dayCount, cutDistancesKm, isFr]
  );

  // Fit entire tour on map
  const handleFitFullTour = useCallback(() => {
    if (!mapInstanceRef.current || !spine || spine.coordinates.length < 2) return;
    setFocusedStageIdx(null);
    const bounds = L.latLngBounds(spine.coordinates);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    mapInstanceRef.current.fitBounds(bounds, {
      paddingTopLeft: isDesktop ? [385, 48] : [28, 72],
      paddingBottomRight: isDesktop ? [48, 225] : [28, 220],
      maxZoom: 13,
      animate: true,
    });
  }, [spine]);

  // Fit a specific stage on map
  const handleFocusStage = useCallback(
    (idx: number) => {
      const stage = stagePreviews[idx];
      setFocusedStageIdx((prev) => (prev === idx ? null : idx));
      if (!stage || !mapInstanceRef.current || stage.coordinates.length < 2) return;
      const bounds = L.latLngBounds(stage.coordinates);
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: isDesktop ? [385, 56] : [30, 80],
        paddingBottomRight: isDesktop ? [56, 230] : [30, 225],
        maxZoom: 13,
        animate: true,
      });
    },
    [stagePreviews]
  );

  // Initialize Leaflet map when modal opens
  useEffect(() => {
    if (!isOpen || !spine || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    });
    mapInstanceRef.current = map;

    const urls = getBasemapUrls(isDark);
    const baseLayer = L.tileLayer(urls.base, { maxNativeZoom: 16, maxZoom: 19 }).addTo(map);
    const refLayer = L.tileLayer(urls.ref, { maxNativeZoom: 16, maxZoom: 19, opacity: 0.92 }).addTo(map);
    baseTileRef.current = baseLayer;
    refTileRef.current = refLayer;

    routeLayerRef.current = L.layerGroup().addTo(map);
    spotsLayerRef.current = L.layerGroup().addTo(map);
    endpointsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    cutMarkersRef.current = [];
    draggingMapCutRef.current = null;

    // Start & Finish pins (static for this spine)
    const startPt = spine.coordinates[0];
    const endPt = spine.coordinates[spine.coordinates.length - 1];
    const startIcon = L.divIcon({
      className: 'cadence-slicer-pin',
      html: `<div style="width:28px;height:28px;border-radius:999px;background:#111111;color:#F2F455;border:2.5px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;font-family:Nunito,sans-serif;">A</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker(startPt, { icon: startIcon, interactive: false, zIndexOffset: 200 }).addTo(
      endpointsLayerRef.current
    );

    const endIcon = L.divIcon({
      className: 'cadence-slicer-pin',
      html: `<div style="width:28px;height:28px;border-radius:999px;background:#F2F455;color:#111111;border:2.5px solid #111111;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;font-family:Nunito,sans-serif;">B</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker(endPt, { icon: endIcon, interactive: false, zIndexOffset: 200 }).addTo(
      endpointsLayerRef.current
    );

    const bounds = L.latLngBounds(spine.coordinates);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    map.fitBounds(bounds, {
      paddingTopLeft: isDesktop ? [385, 48] : [28, 72],
      paddingBottomRight: isDesktop ? [48, 225] : [28, 220],
      maxZoom: 13,
    });

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 80);

    return () => {
      window.clearTimeout(resizeTimer);
      hoverMarkerRef.current = null;
      cutMarkersRef.current = [];
      draggingMapCutRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
      baseTileRef.current = null;
      refTileRef.current = null;
      routeLayerRef.current = null;
      endpointsLayerRef.current = null;
      markersLayerRef.current = null;
      spotsLayerRef.current = null;
    };
  }, [isOpen, spine]);

  // React to theme toggle on live map tiles
  useEffect(() => {
    if (!baseTileRef.current || !refTileRef.current) return;
    const urls = getBasemapUrls(isDark);
    baseTileRef.current.setUrl(urls.base);
    refTileRef.current.setUrl(urls.ref);
  }, [isDark]);

  // 1. Render color-coded stage polylines whenever cuts, focus, or theme change
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer || !spine || stagePreviews.length === 0) return;

    routeLayer.clearLayers();
    const casingColor = isDark ? '#0B0B0D' : '#FFFFFF';

    stagePreviews.forEach((stage, idx) => {
      const isFocused = focusedStageIdx === idx;
      const isDimmed = focusedStageIdx !== null && focusedStageIdx !== idx;

      L.polyline(stage.coordinates, {
        color: casingColor,
        weight: isFocused ? 10 : 8,
        opacity: isDimmed ? 0.35 : 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer);

      const line = L.polyline(stage.coordinates, {
        color: stage.color,
        weight: isFocused ? 6.5 : 4.75,
        opacity: isDimmed ? 0.45 : 0.98,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer);

      line.on('click', () => {
        setFocusedStageIdx((prev) => (prev === idx ? null : idx));
      });
    });
  }, [spine, stagePreviews, focusedStageIdx, isDark]);

  // 2. Sync persistent draggable Overnight Cut markers IN PLACE so dragging on the map never drops mid-gesture
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer || !spine || stagePreviews.length === 0) return;

    const buildCutIcon = (cutIdx: number, cutKm: number) => {
      const color = stagePreviews[cutIdx]?.color || '#10B981';
      const isSelected = activeCutIdx === cutIdx || draggingCutIdx === cutIdx;
      const badgeLabel = `N${cutIdx + 1}`;
      const shortPlace = cutLabels[cutIdx]
        ? cutLabels[cutIdx].slice(0, 14) + (cutLabels[cutIdx].length > 14 ? '…' : '')
        : `${Math.round(cutKm)} km`;

      return L.divIcon({
        className: 'cadence-slicer-cut-pin',
        html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px 3px 6px;border-radius:999px;background:${isSelected ? '#111111' : color};color:#FFFFFF;border:2.5px solid ${isSelected ? '#F2F455' : '#FFFFFF'};box-shadow:0 4px 14px rgba(0,0,0,0.38);font-family:Nunito,sans-serif;font-weight:800;font-size:11px;white-space:nowrap;cursor:grab;transform:translate(-50%,-50%);">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;background:rgba(0,0,0,0.22);font-size:9.5px;">${badgeLabel}</span>
          <span>${shortPlace}</span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    };

    // Recreate marker instances ONLY when number of cuts changes
    if (cutMarkersRef.current.length !== cutDistancesKm.length) {
      markersLayer.clearLayers();
      cutMarkersRef.current = cutDistancesKm.map((cutKm, cutIdx) => {
        const coord = interpolateCoordAtDistance(spine, cutKm);
        const marker = L.marker(coord, {
          icon: buildCutIcon(cutIdx, cutKm),
          draggable: true,
          zIndexOffset: 500,
        }).addTo(markersLayer);

        marker.on('dragstart', () => {
          draggingMapCutRef.current = cutIdx;
          setDraggingCutIdx(cutIdx);
          setActiveCutIdx(cutIdx);
        });

        marker.on('drag', (evt: L.LeafletEvent) => {
          const ll = (evt.target as L.Marker).getLatLng();
          const curSpine = spineRef.current;
          const curCuts = cutsRef.current;
          if (!curSpine) return;
          const gap = getMinStageDistanceKm(curSpine.totalDistanceKm, curCuts.length + 1);
          const minKm = cutIdx === 0 ? gap : curCuts[cutIdx - 1] + gap;
          const maxKm =
            cutIdx === curCuts.length - 1
              ? curSpine.totalDistanceKm - gap
              : curCuts[cutIdx + 1] - gap;
          const projected = findNearestDistanceOnSpine(curSpine, ll.lat, ll.lng, minKm, maxKm);
          (evt.target as L.Marker).setLatLng(projected.coord);
          updateCutDistance(cutIdx, projected.distKm, true);
        });

        marker.on('dragend', () => {
          draggingMapCutRef.current = null;
          setDraggingCutIdx(null);
        });

        marker.on('click', () => {
          setActiveCutIdx((prev) => (prev === cutIdx ? null : cutIdx));
          setIsStagePanelExpanded(true);
        });

        return marker;
      });
      return;
    }

    // Otherwise update existing marker positions & badges in place (skipping the active map-dragged marker's icon swap mid-drag)
    cutDistancesKm.forEach((cutKm, cutIdx) => {
      const marker = cutMarkersRef.current[cutIdx];
      if (!marker) return;
      if (draggingMapCutRef.current === cutIdx) return;
      const coord = interpolateCoordAtDistance(spine, cutKm);
      marker.setLatLng(coord);
      marker.setIcon(buildCutIcon(cutIdx, cutKm));
      marker.setZIndexOffset(activeCutIdx === cutIdx || draggingCutIdx === cutIdx ? 700 : 500);
    });
  }, [
    spine,
    stagePreviews,
    cutDistancesKm,
    cutLabels,
    activeCutIdx,
    draggingCutIdx,
    updateCutDistance,
  ]);

  // Render discovered overnight spots on map for activeCutIdx
  useEffect(() => {
    const spotsLayer = spotsLayerRef.current;
    if (!spotsLayer) return;
    spotsLayer.clearLayers();
    if (activeCutIdx === null) return;
    const spots = overnightSpotsByCut[activeCutIdx];
    if (!spots || spots.length === 0) return;

    const kindColor: Record<OvernightSpotKind, string> = {
      campsite: '#10B981',
      lodging: '#6366F1',
      station: '#F59E0B',
      town: '#64748B',
    };
    const kindIcon: Record<OvernightSpotKind, React.FC<IconProps>> = {
      campsite: Tent,
      lodging: Bed,
      station: Train,
      town: MapPin,
    };

    spots.forEach((spot) => {
      const SpotIcon = kindIcon[spot.kind];
      const spotIconSvg = renderToStaticMarkup(
        <SpotIcon size={12} strokeWidth={2.2} aria-hidden="true" />
      );
      const icon = L.divIcon({
        className: 'cadence-overnight-spot-pin',
        html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;background:#FFFFFF;color:#111111;border:2px solid ${kindColor[spot.kind]};box-shadow:0 3px 10px rgba(0,0,0,0.28);font-size:10.5px;font-weight:700;font-family:Inter,sans-serif;white-space:nowrap;cursor:pointer;transform:translate(-50%,-100%);">
          <span style="display:inline-flex;align-items:center;color:${kindColor[spot.kind]};">${spotIconSvg}</span>
          <span>${spot.name.slice(0, 18)}</span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const m = L.marker([spot.lat, spot.lng], { icon, zIndexOffset: 420 }).addTo(spotsLayer);
      m.on('click', () => {
        handleSnapCutToSpot(activeCutIdx, spot);
      });
    });
  }, [activeCutIdx, overnightSpotsByCut, handleSnapCutToSpot]);

  // Sync live elevation hover dot on Leaflet map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !spine) return;

    if (hoverDistKm === null) {
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
      return;
    }

    const coord = interpolateCoordAtDistance(spine, hoverDistKm);
    if (!hoverMarkerRef.current) {
      hoverMarkerRef.current = L.circleMarker(coord, {
        radius: 7,
        fillColor: '#F2F455',
        color: '#111111',
        weight: 2.5,
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      hoverMarkerRef.current.setLatLng(coord);
    }
  }, [hoverDistKm, spine]);

  // Elevation SVG geometry (normalized 900 x 84 coordinate space)
  const elevGeom = useMemo(() => {
    if (!spine || spine.elevationProfile.length < 2) return null;
    const w = 900;
    const h = 84;
    const padTop = 10;
    const padBot = 6;
    const usableH = h - padTop - padBot;

    let minEle = spine.elevationProfile[0].eleM;
    let maxEle = minEle;
    for (const pt of spine.elevationProfile) {
      if (pt.eleM < minEle) minEle = pt.eleM;
      if (pt.eleM > maxEle) maxEle = pt.eleM;
    }
    const spanEle = Math.max(25, maxEle - minEle);

    const toX = (distKm: number) =>
      spine.totalDistanceKm > 0 ? (distKm / spine.totalDistanceKm) * w : 0;
    const toY = (eleM: number) =>
      padTop + usableH - ((eleM - minEle) / spanEle) * usableH;

    // Build per-stage SVG area & ridge paths so each day gets its own color slice
    const stagePaths = stagePreviews.map((stage) => {
      const pts: { x: number; y: number }[] = [];
      const startEle = interpolateElevationAtDistance(spine.elevationProfile, stage.startKm).eleM;
      pts.push({ x: toX(stage.startKm), y: toY(startEle) });

      for (const pt of spine.elevationProfile) {
        if (pt.distKm > stage.startKm && pt.distKm < stage.endKm) {
          pts.push({ x: toX(pt.distKm), y: toY(pt.eleM) });
        }
      }

      const endEle = interpolateElevationAtDistance(spine.elevationProfile, stage.endKm).eleM;
      pts.push({ x: toX(stage.endKm), y: toY(endEle) });

      const line = pts
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');
      const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;
      return { line, area, color: stage.color };
    });

    return { w, h, minEle, maxEle, toX, toY, stagePaths };
  }, [spine, stagePreviews]);

  // Pointer drag handling on the elevation strip container
  const pointerClientXToDistKm = useCallback(
    (clientX: number): number | null => {
      if (!elevContainerRef.current || !spine) return null;
      const rect = elevContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return null;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * spine.totalDistanceKm;
    },
    [spine]
  );

  const handleElevPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingCutIdx !== null) return;
    elevPointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleElevPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dist = pointerClientXToDistKm(e.clientX);
    if (dist === null) return;
    setHoverDistKm(dist);
    if (draggingCutIdx !== null) {
      updateCutDistance(draggingCutIdx, dist, true);
    }
  };

  const handleElevPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingCutIdx !== null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
      setDraggingCutIdx(null);
      elevPointerDownRef.current = null;
      return;
    }

    // Click-to-slice on the elevation curve when pointer did not drag
    if (elevPointerDownRef.current) {
      const dx = e.clientX - elevPointerDownRef.current.x;
      const dy = e.clientY - elevPointerDownRef.current.y;
      elevPointerDownRef.current = null;
      if (Math.hypot(dx, dy) < 6) {
        const dist = pointerClientXToDistKm(e.clientX);
        if (dist !== null) {
          handleInsertCutAtDistance(dist);
        }
      }
    }
  };

  const handleStartDragCut = (cutIdx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingCutIdx(cutIdx);
    setActiveCutIdx(cutIdx);
    if (elevContainerRef.current) {
      try {
        elevContainerRef.current.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic events
      }
    }
  };

  const handleApplyTour = () => {
    if (!spine || stagePreviews.length === 0) return;
    const updated = applyStageSlicesToTrip(trip, spine, stagePreviews, {
      physics: effectivePhysics,
      targetSpeedKmH,
    });
    onApply(updated);
    onClose();
  };

  const handleMergeToSingleDay = () => {
    const merged = mergeTourStagesToSingleDay(trip);
    onApply(merged);
    onClose();
  };

  if (!isOpen || !spine || typeof document === 'undefined') {
    return null;
  }

  const hoverInfo =
    hoverDistKm !== null
      ? {
          distKm: hoverDistKm,
          ...interpolateElevationAtDistance(spine.elevationProfile, hoverDistKm),
        }
      : null;

  const currentPacePreset =
    PACE_PRESETS.reduce((best, p) =>
      Math.abs(p.speedKmH - targetSpeedKmH) < Math.abs(best.speedKmH - targetSpeedKmH) ? p : best
    );
  const currentLoadPreset =
    LOAD_PRESETS.reduce((best, p) =>
      Math.abs(p.luggageKg - luggageWeightKg) < Math.abs(best.luggageKg - luggageWeightKg) ? p : best
    );

  const sunsetAlertCount = stagePreviews.filter((s) => s.arrivesAfterSunset).length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFr ? 'Découper la trace en étapes' : 'Multi-day stage slicer'}
      className="fixed inset-0 z-[1200] bg-canvas text-ink overflow-hidden select-none"
    >
      {/* ── FULL-BLEED INTERACTIVE MAP CANVAS ── */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* ── FLOATING TOP-RIGHT MINIMAL CONTROLS ── */}
      <div
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[600] flex items-center gap-2"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={handleFitFullTour}
          title={isFr ? 'Centrer tout le parcours' : 'Fit full route'}
          className="h-10 px-3 rounded-full bg-card/92 dark:bg-[#161618]/92 backdrop-blur-md text-ink shadow-lg border border-black/10 dark:border-white/12 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-card"
        >
          <LocateFixed className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{isFr ? 'Tout voir' : 'Fit all'}</span>
        </Button>

        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          aria-label={isFr ? 'Fermer' : 'Close'}
          className="w-10 h-10 p-0 rounded-full bg-card/92 dark:bg-[#161618]/92 backdrop-blur-md text-ink shadow-lg border border-black/10 dark:border-white/12 flex items-center justify-center cursor-pointer hover:bg-card"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* ── FLOATING TOP-LEFT STAGE LIST CARD (KOMOOT-STYLE CLEAN PANEL) ── */}
      <div
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[600] w-[calc(100vw-116px)] sm:w-[348px] max-w-[360px] flex flex-col pointer-events-none"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="pointer-events-auto rounded-[24px] bg-card/95 dark:bg-[#161618]/95 backdrop-blur-md shadow-2xl border border-black/10 dark:border-white/12 overflow-hidden flex flex-col max-h-[calc(100vh-235px)] sm:max-h-[calc(100vh-40px)]">
          {/* Panel Header */}
          <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-black/6 dark:border-white/8">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-volt text-[#111111] shrink-0">
                  <Route className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-bold font-rounded tracking-tight text-ink truncate">
                  {trip.name || (isFr ? 'Découpage Multi-Jours' : 'Multi-Day Slicer')}
                </h2>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-secondary tnum pl-7">
                <span className="font-semibold text-ink">{spine.totalDistanceKm} km</span>
                <span>·</span>
                <span>+{spine.totalElevationGainM.toLocaleString()} m</span>
                <span>·</span>
                <span className="font-semibold">
                  {dayCount} {isFr ? 'jours' : 'days'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsStagePanelExpanded((v) => !v)}
              aria-label={isStagePanelExpanded ? 'Collapse stages' : 'Expand stages'}
              className="w-8 h-8 rounded-full hover:bg-pod flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer shrink-0 transition-colors"
            >
              {isStagePanelExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Expandable Stage List */}
          {isStagePanelExpanded && (
            <>
              <div className="overflow-y-auto px-3 py-2.5 space-y-1.5">
                {sunsetAlertCount > 0 && (
                  <div className="rounded-xl bg-amber-500/12 border border-amber-500/25 px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isFr
                        ? `${sunsetAlertCount} étape(s) arrivent après le coucher du soleil — ajoutez un jour ou partez plus tôt.`
                        : `${sunsetAlertCount} stage(s) finish after sunset — add a day or start earlier.`}
                    </span>
                  </div>
                )}

                {stagePreviews.map((stage, idx) => {
                  const isFocused = focusedStageIdx === idx;
                  const cutIdx = idx; // Overnight cut AFTER stage idx
                  const hasOvernightAfter = idx < stagePreviews.length - 1;
                  const spotsForCut = hasOvernightAfter ? overnightSpotsByCut[cutIdx] : undefined;
                  const isSpotsOpen = activeCutIdx === cutIdx;
                  const isSpotsLoading = loadingSpotsCutIdx === cutIdx;

                  return (
                    <React.Fragment key={`slice-day-${stage.dayNumber}`}>
                      {/* Stage Card */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleFocusStage(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleFocusStage(idx);
                          }
                        }}
                        className={`rounded-2xl p-2.5 transition-all cursor-pointer border ${
                          isFocused
                            ? 'bg-pod border-ink/20 dark:border-white/25 shadow-xs'
                            : 'bg-pod/65 hover:bg-pod border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-black/50"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-[11px] font-extrabold uppercase font-rounded tracking-wide text-ink">
                              {isFr ? `Jour ${stage.dayNumber}` : `Day ${stage.dayNumber}`}
                            </span>
                            <span className="text-[11px] text-ink-muted tnum">
                              {formatShortDate(stage.departureDate, lang)}
                            </span>
                          </div>

                          {/* Daylight / Sunset Pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tnum shrink-0 ${
                              stage.arrivesAfterSunset
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                : stage.arrivesNearSunset
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                            }`}
                            title={
                              isFr
                                ? `Coucher du soleil : ${stage.sunsetHHMM}`
                                : `Sunset: ${stage.sunsetHHMM}`
                            }
                          >
                            <Sunset className="w-2.5 h-2.5 shrink-0" />
                            <span>→ {stage.estimatedArrivalHHMM}</span>
                          </span>
                        </div>

                        {/* Origin -> Destination (with inline hover edit on every start/end location) */}
                        {(() => {
                          const originKey: 'start' | number = idx === 0 ? 'start' : idx - 1;
                          const destKey: 'end' | number = idx === stagePreviews.length - 1 ? 'end' : idx;
                          const commitLocEdit = (key: 'start' | 'end' | number, value: string) => {
                            const trimmed = value.trim();
                            if (key === 'start') {
                              setStartLabel(trimmed);
                            } else if (key === 'end') {
                              setEndLabel(trimmed);
                            } else {
                              setCutLabels((prev) => ({ ...prev, [key]: trimmed }));
                            }
                            setEditingLocKey(null);
                          };
                          const renderEditableLoc = (
                            locKey: 'start' | 'end' | number,
                            displayVal: string,
                            placeholder: string
                          ) => {
                            if (editingLocKey === locKey) {
                              return (
                                <input
                                  type="text"
                                  autoFocus
                                  defaultValue={displayVal}
                                  placeholder={placeholder}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => commitLocEdit(locKey, e.target.value)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      commitLocEdit(locKey, (e.target as HTMLInputElement).value);
                                    } else if (e.key === 'Escape') {
                                      setEditingLocKey(null);
                                    }
                                  }}
                                  className="min-w-[84px] max-w-[130px] text-xs font-semibold px-1.5 py-0.5 rounded-md bg-card text-ink border border-ink/25 focus:outline-none focus:ring-2 focus:ring-volt/60"
                                />
                              );
                            }
                            return (
                              <span className="group/loc inline-flex items-center gap-1 min-w-0 max-w-[46%]">
                                <span className="truncate">{displayVal}</span>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLocKey(locKey);
                                  }}
                                  title={isFr ? 'Modifier le lieu' : 'Rename location'}
                                  aria-label={isFr ? `Modifier ${displayVal}` : `Edit ${displayVal}`}
                                  className="opacity-0 group-hover/loc:opacity-100 focus:opacity-100 w-4 h-4 rounded-full hover:bg-card flex items-center justify-center text-ink-muted hover:text-ink transition-opacity shrink-0 cursor-pointer"
                                >
                                  <Pen className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            );
                          };

                          return (
                            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink pl-4 min-w-0">
                              {renderEditableLoc(
                                originKey,
                                stage.originLabel,
                                isFr ? 'Départ' : 'Start'
                              )}
                              <ArrowRight className="w-3 h-3 shrink-0 text-ink-muted" />
                              {renderEditableLoc(
                                destKey,
                                stage.destLabel,
                                isFr ? 'Arrivée' : 'Destination'
                              )}
                            </div>
                          );
                        })()}

                        {/* Metrics line */}
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-secondary tnum pl-4 flex-wrap">
                          <span className="font-bold text-ink">{stage.distanceKm} km</span>
                          <span>+{stage.elevationGainM} m</span>
                          <span>·</span>
                          <span>{stage.movingTimeFormatted}</span>
                        </div>

                        {stage.accommodationNote && (
                          <div className="mt-1 pl-4 text-[10.5px] text-emerald-700 dark:text-emerald-300 truncate">
                            {stage.accommodationNote}
                          </div>
                        )}
                      </div>

                      {/* Overnight Cut Connector (between Day idx+1 and Day idx+2) */}
                      {hasOvernightAfter && (
                        <div className="pl-3 pr-1 py-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-300 shrink-0" />
                              <button
                                type="button"
                                onClick={() => setEditingLocKey(cutIdx)}
                                title={isFr ? 'Cliquer pour renommer l’étape' : 'Click to rename stop'}
                                className="group/cut inline-flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink truncate text-left cursor-pointer"
                              >
                                <span className="font-semibold tnum">
                                  N{cutIdx + 1} · km {Math.round(cutDistancesKm[cutIdx])}
                                </span>
                                {cutLabels[cutIdx] && (
                                  <span className="truncate">· {cutLabels[cutIdx]}</span>
                                )}
                                <Pen className="w-2.5 h-2.5 opacity-0 group-hover/cut:opacity-100 shrink-0 text-ink-muted transition-opacity" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleFindOvernightSpots(cutIdx)}
                                disabled={isSpotsLoading}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors cursor-pointer shrink-0 ${
                                  isSpotsOpen
                                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                                    : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                                }`}
                              >
                                {isSpotsLoading ? (
                                  <SpinnerGap className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Tent className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span>{isFr ? 'Dormir ici' : 'Sleep stops'}</span>
                              </button>

                              {dayCount > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCut(cutIdx)}
                                  title={isFr ? 'Supprimer cette coupure' : 'Remove this split'}
                                  aria-label={isFr ? `Supprimer coupure N${cutIdx + 1}` : `Remove split N${cutIdx + 1}`}
                                  className="w-6 h-6 rounded-full hover:bg-pod text-ink-muted hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Loading indicator for Sleep Stops */}
                          {isSpotsOpen && isSpotsLoading && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ink-muted pl-4">
                              <SpinnerGap className="w-3 h-3 animate-spin shrink-0" />
                              <span>
                                {isFr
                                  ? 'Recherche de campings, hôtels & gares à proximité…'
                                  : 'Searching nearby campsites, hotels & stations…'}
                              </span>
                            </div>
                          )}

                          {/* Clickable Nearby Sleep Stop Chips */}
                          {isSpotsOpen && !isSpotsLoading && spotsForCut && spotsForCut.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5 pb-1 pl-4">
                              {spotsForCut.slice(0, 6).map((spot) => {
                                const SpotIcon = getSpotKindIcon(spot.kind);
                                return (
                                  <button
                                    key={spot.id}
                                    type="button"
                                    onClick={() => handleSnapCutToSpot(cutIdx, spot)}
                                    title={
                                      isFr
                                        ? `Caler la coupure sur ${spot.name} (${spot.distanceFromCutKm} km)`
                                        : `Snap cut to ${spot.name} (${spot.distanceFromCutKm} km)`
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card hover:bg-volt/25 border border-black/10 dark:border-white/12 text-[10.5px] font-medium text-ink transition-colors cursor-pointer max-w-full"
                                  >
                                    <SpotIcon className="w-3 h-3 shrink-0 text-ink-secondary" />
                                    <span className="truncate max-w-[130px]">{spot.name}</span>
                                    <span className="text-[9.5px] text-ink-muted tnum shrink-0">
                                      {spot.distanceFromCutKm}km
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {isSpotsOpen && emptySpotsCutIdx === cutIdx && !isSpotsLoading && (
                            <div className="mt-1.5 pl-4 text-[10.5px] text-ink-muted">
                              {isFr
                                ? 'Aucun camping ou hôtel trouvé dans 9 km — glissez le repère vers un village.'
                                : 'No camp/lodging found within 9 km — drag the pin toward a nearby town.'}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Quiet Single-Day Escape / Merge Footer (generous padding) */}
              <div className="px-4 py-3 gap-3 border-t border-black/6 dark:border-white/8 flex items-center justify-between text-[11px] text-ink-muted">
                <span className="leading-snug">
                  {isFr
                    ? 'Cliquez sur le profil pour couper · Glissez N1, N2'
                    : 'Click curve to split · Drag N1, N2 to adjust'}
                </span>
                {isAlreadyMultiDay ? (
                  <button
                    type="button"
                    onClick={handleMergeToSingleDay}
                    className="font-semibold text-ink-secondary hover:text-ink underline underline-offset-2 cursor-pointer shrink-0"
                  >
                    {isFr ? 'Fusionner en 1 jour' : 'Merge to 1 day'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="font-semibold text-ink-secondary hover:text-ink underline underline-offset-2 cursor-pointer shrink-0"
                  >
                    {isFr ? 'Garder en 1 jour' : 'Keep 1 day'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── FLOATING BOTTOM DOCK: INTERACTIVE ELEVATION SLICER + KOMOOT-STYLE SETTINGS BAR ── */}
      <div
        className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 lg:left-[376px] z-[650]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="relative rounded-[24px] bg-card/95 dark:bg-[#161618]/95 backdrop-blur-md shadow-2xl border border-black/10 dark:border-white/12 p-3 sm:p-3.5 space-y-2.5">
          {/* ── UPPER TIER: INTERACTIVE MULTI-DAY ELEVATION PROFILE (CLICK TO SLICE + DRAG HANDLES) ── */}
          {elevGeom && (
            <div className="relative rounded-2xl bg-pod/70 dark:bg-black/30 px-2 pt-5 pb-1.5">
              {/* Subtle top readout bar inside chart */}
              <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between text-[10.5px] text-ink-muted pointer-events-none tnum">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Mountains className="w-3 h-3 shrink-0" />
                  <span>
                    {Math.round(elevGeom.minEle)} m – {Math.round(elevGeom.maxEle)} m
                  </span>
                </span>
                {hoverInfo ? (
                  <span className="font-semibold text-ink">
                    km {hoverInfo.distKm.toFixed(1)} · {Math.round(hoverInfo.eleM)} m ({hoverInfo.gradePct > 0 ? '+' : ''}
                    {hoverInfo.gradePct}%)
                    {dayCount < 10 && draggingCutIdx === null && (
                      <span className="ml-1.5 text-ink-muted font-normal hidden sm:inline">
                        · {isFr ? 'cliquer pour couper' : 'click to split'}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="hidden sm:inline">
                    {isFr
                      ? 'Cliquez sur le profil pour ajouter une coupure · Glissez les poignées'
                      : 'Click profile to add a split · Drag handles to adjust'}
                  </span>
                )}
              </div>

              <div
                ref={elevContainerRef}
                onPointerDown={handleElevPointerDown}
                onPointerMove={handleElevPointerMove}
                onPointerUp={handleElevPointerUp}
                onPointerCancel={handleElevPointerUp}
                onPointerLeave={() => {
                  if (draggingCutIdx === null) setHoverDistKm(null);
                }}
                className="relative w-full h-[78px] sm:h-[88px] touch-none"
              >
                <svg
                  viewBox={`0 0 ${elevGeom.w} ${elevGeom.h}`}
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible cursor-crosshair"
                >
                  {/* Per-day tinted elevation areas & ridge lines */}
                  {elevGeom.stagePaths.map((sp, idx) => {
                    const isDimmed = focusedStageIdx !== null && focusedStageIdx !== idx;
                    return (
                      <g key={`elev-stage-${idx}`} opacity={isDimmed ? 0.35 : 1}>
                        <path d={sp.area} fill={sp.color} fillOpacity={0.22} />
                        <path
                          d={sp.line}
                          fill="none"
                          stroke={sp.color}
                          strokeWidth={2.5}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}

                  {/* Hover crosshair vertical line */}
                  {hoverDistKm !== null && draggingCutIdx === null && (
                    <line
                      x1={elevGeom.toX(hoverDistKm)}
                      y1={0}
                      x2={elevGeom.toX(hoverDistKm)}
                      y2={elevGeom.h}
                      stroke="currentColor"
                      strokeOpacity={0.35}
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>

                {/* Interactive HTML Draggable Cut Handles overlay (crisp typography + 44px touch target) */}
                {cutDistancesKm.map((cutKm, cutIdx) => {
                  const pct =
                    spine.totalDistanceKm > 0
                      ? Math.max(0, Math.min(100, (cutKm / spine.totalDistanceKm) * 100))
                      : 50;
                  const color = stagePreviews[cutIdx]?.color || '#10B981';
                  const isDragging = draggingCutIdx === cutIdx;
                  const isSelected = activeCutIdx === cutIdx;

                  return (
                    <div
                      key={`cut-handle-${cutIdx}`}
                      role="slider"
                      tabIndex={0}
                      aria-label={
                        isFr
                          ? `Coupure Nuit ${cutIdx + 1}`
                          : `Night ${cutIdx + 1} split`
                      }
                      aria-valuemin={0}
                      aria-valuemax={Math.round(spine.totalDistanceKm)}
                      aria-valuenow={Math.round(cutKm)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          updateCutDistance(cutIdx, cutKm - 5, true);
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          updateCutDistance(cutIdx, cutKm + 5, true);
                        }
                      }}
                      onPointerDown={(e) => handleStartDragCut(cutIdx, e)}
                      style={{ left: `${pct}%` }}
                      className="absolute top-0 bottom-0 -translate-x-1/2 w-11 flex flex-col items-center justify-between cursor-ew-resize touch-none group z-20"
                    >
                      {/* Tactile Grab Pill */}
                      <div
                        style={{
                          backgroundColor: isDragging || isSelected ? '#111111' : color,
                          borderColor: isDragging || isSelected ? '#F2F455' : '#FFFFFF',
                        }}
                        className={`-mt-2.5 px-2 py-0.5 rounded-full border-2 text-[10px] font-extrabold font-rounded text-white shadow-md whitespace-nowrap tnum transition-transform ${
                          isDragging ? 'scale-110' : 'group-hover:scale-105'
                        }`}
                      >
                        N{cutIdx + 1} · {Math.round(cutKm)}k
                      </div>

                      {/* Vertical Cut Line */}
                      <div
                        style={{ backgroundColor: isDragging ? '#F2F455' : color }}
                        className="w-[2.5px] flex-1 opacity-90 shadow-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LOWER TIER: KOMOOT-STYLE COMPACT CONTROLS BAR + PRIMARY APPLY CTA ── */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Days Stepper Pill */}
              <div className="inline-flex items-center rounded-full bg-pod p-0.5 border border-black/6 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleChangeDays(-1)}
                  disabled={dayCount <= 2}
                  aria-label={isFr ? 'Un jour de moins' : 'Fewer days'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-card disabled:opacity-35 cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-extrabold font-rounded text-ink tnum whitespace-nowrap">
                  {dayCount} {isFr ? 'jours' : 'days'}
                </span>
                <button
                  type="button"
                  onClick={() => handleChangeDays(1)}
                  disabled={dayCount >= 10}
                  aria-label={isFr ? 'Un jour de plus' : 'More days'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-card disabled:opacity-35 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2. Effort vs Equal Distance Balance Pill */}
              <div
                className="inline-flex items-center rounded-full bg-pod p-0.5 border border-black/6 dark:border-white/10"
                role="group"
                aria-label={isFr ? 'Mode de répartition' : 'Split balance mode'}
              >
                <button
                  type="button"
                  onClick={() => handleSelectBalanceMode('effort')}
                  title={
                    isFr
                      ? 'Raccourcit les journées avec beaucoup de dénivelé'
                      : 'Shortens hilly days so daily effort stays balanced'
                  }
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                    balanceMode === 'effort'
                      ? 'bg-card text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Sparkle className="w-3 h-3 shrink-0 text-amber-500" />
                  <span>{isFr ? 'Effort égal' : 'Balanced effort'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBalanceMode('distance')}
                  className={`h-8 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                    balanceMode === 'distance'
                      ? 'bg-card text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isFr ? 'Km égaux' : 'Equal km'}
                </button>
              </div>

              {/* 3. Komoot-style Compact Ride Settings Popover Trigger + Anchored Popover */}
              <div className="relative">
                {showRideSettingsPopover && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowRideSettingsPopover(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute bottom-full left-0 mb-2.5 z-30 w-[min(340px,calc(100vw-32px))] rounded-[20px] bg-card dark:bg-[#1C1C1F] shadow-2xl border border-black/12 dark:border-white/15 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-rounded text-ink">
                          {isFr ? 'Paramètres du tour' : 'Tour pace & timing'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRideSettingsPopover(false)}
                          className="w-6 h-6 rounded-full hover:bg-pod flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Start Date & Rollout Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10.5px] font-semibold text-ink-muted flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            {isFr ? 'Date départ' : 'Start date'}
                          </span>
                          <input
                            type="date"
                            value={startDateIso}
                            onChange={(e) => e.target.value && setStartDateIso(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-xl bg-pod text-ink text-xs font-medium tnum border border-black/8 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-volt/60"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[10.5px] font-semibold text-ink-muted flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            {isFr ? 'Départ / jour' : 'Daily rollout'}
                          </span>
                          <input
                            type="time"
                            value={dailyStartTime}
                            onChange={(e) => e.target.value && setDailyStartTime(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-xl bg-pod text-ink text-xs font-medium tnum border border-black/8 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-volt/60"
                          />
                        </label>
                      </div>

                      {/* Quick Rollout Time Chips (Design-system Yellow-Vest active token) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {START_TIME_PRESETS.map((tm) => (
                          <button
                            key={tm}
                            type="button"
                            onClick={() => setDailyStartTime(tm)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-rounded font-semibold tnum cursor-pointer transition-all ${
                              dailyStartTime === tm
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                : 'bg-pod text-ink-secondary hover:bg-chip hover:text-ink'
                            }`}
                          >
                            {tm}
                          </button>
                        ))}
                      </div>

                      {/* Pace Presets */}
                      <div>
                        <span className="text-[10.5px] font-semibold text-ink-muted flex items-center gap-1 mb-1.5">
                          <Bike className="w-3 h-3" />
                          {isFr ? 'Allure de croisière' : 'Cruising pace'}
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {PACE_PRESETS.map((p) => {
                            const active = currentPacePreset.id === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTargetSpeedKmH(p.speedKmH)}
                                className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer ${
                                  active
                                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                    : 'bg-pod text-ink-secondary hover:bg-chip hover:text-ink font-medium'
                                }`}
                              >
                                <div className="text-[10.5px] leading-tight">
                                  {isFr ? p.labelFr : p.labelEn}
                                </div>
                                <div className="text-[9.5px] opacity-80 tnum">{p.speedKmH} km/h</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Load / Bikepacking Bags Presets */}
                      <div>
                        <span className="text-[10.5px] font-semibold text-ink-muted flex items-center gap-1 mb-1.5">
                          <Luggage className="w-3 h-3" />
                          {isFr ? 'Chargement sacoches' : 'Luggage load'}
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {LOAD_PRESETS.map((lp) => {
                            const active = currentLoadPreset.id === lp.id;
                            return (
                              <button
                                key={lp.id}
                                type="button"
                                onClick={() => setLuggageWeightKg(lp.luggageKg)}
                                className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer ${
                                  active
                                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} font-bold`
                                    : 'bg-pod text-ink-secondary hover:bg-chip hover:text-ink font-medium'
                                }`}
                              >
                                <div className="text-[10px] leading-tight truncate">
                                  {isFr ? lp.labelFr : lp.labelEn}
                                </div>
                                <div className="text-[9.5px] opacity-80 tnum">{lp.luggageKg} kg</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowRideSettingsPopover((v) => !v)}
                  aria-expanded={showRideSettingsPopover}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-semibold tnum transition-all cursor-pointer ${
                    showRideSettingsPopover
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : 'bg-pod hover:bg-chip text-ink border border-black/6 dark:border-white/10'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">
                    {dailyStartTime} · {isFr ? currentPacePreset.labelFr : currentPacePreset.labelEn} · {luggageWeightKg} kg
                  </span>
                  <ChevronUp
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      showRideSettingsPopover ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 4. Primary Apply CTA */}
            <Button
              variant="primary"
              type="button"
              onClick={handleApplyTour}
              data-testid="apply-stage-slicer-btn"
              className={`h-10 px-4 sm:px-5 rounded-full text-xs sm:text-[13px] font-extrabold font-rounded inline-flex items-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] transition-all ml-auto ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>
                {isFr
                  ? `Créer le tour (${dayCount} jours)`
                  : `Apply ${dayCount}-Day Tour`}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
