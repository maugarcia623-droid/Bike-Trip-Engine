import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Clock,
  Path,
  Flame,
  Mountains,
  MapPin,
  Bicycle,
  CaretDown,
  CaretUp,
  ArrowsLeftRight,
  SlidersHorizontal,
  X,
  Check,
} from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getActiveBike } from '../../utils/specsStorage';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { useTranslation } from '../../context/LanguageContext';
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
}

type ActiveHeroPopover = 'bike' | 'target' | 'route' | 'pace' | null;

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

const DEFAULT_CORRIDOR: [number, number][] = [
  [47.2184, -1.5536],
  [47.2050, -1.6000],
  [47.2350, -1.7200],
  [47.2500, -1.8600],
  [47.2800, -2.0500],
  [47.2730, -2.1800],
  [47.2840, -2.2080],
];

/** Formats minutes into 00:00 format (e.g. 04:12, 00:48) to match the Hard Rollout time */
const formatTimeHHMM = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const padH = String(hrs).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');
  return `${padH}:${padM}`;
};

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
}) => {
  const { lang, t } = useTranslation();
  const heroRootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lowerContentRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activePopover, setActivePopover] = useState<ActiveHeroPopover>(null);

  const activeBike = riderSpecs ? getActiveBike(riderSpecs) : null;
  const isInteractive = Boolean(onUpdateTrip);
  const isDepartAtMode = trip.arriveAtMode === false;
  const currentTargetGateTime = isDepartAtMode
    ? trip.departureTime || timelineResult.hardDepartureTime || '07:30'
    : trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';

  // Close active popover on outside click or Escape
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
        windDirectionDegrees: ((trip.weather.windDirectionDegrees || 0) + 180) % 360,
        effectiveHeadwindKmH: nextEffectiveHeadwind,
        isHeadwindActive: nextHeadwind,
        windDirection: nextWindDir,
      },
    });
  };

  const handleSetDistanceKm = (nextDistanceRaw: number) => {
    if (!onUpdateTrip || Number.isNaN(nextDistanceRaw)) return;
    const clampedKm = Math.max(2, Math.min(350, Math.round(nextDistanceRaw * 10) / 10));
    const oldKm = Math.max(1, trip.route.distanceKm || 1);
    const oldElev = trip.route.elevationGainM ?? Math.round(oldKm * 6.6);
    const scaledElev = Math.max(0, Math.round(oldElev * (clampedKm / oldKm)));
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      route: {
        ...trip.route,
        distanceKm: clampedKm,
        elevationGainM: scaledElev,
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

  const activeCoordinates =
    trip.route.coordinates && trip.route.coordinates.length > 0
      ? trip.route.coordinates
      : DEFAULT_CORRIDOR;

  const movingMinutes = timelineResult?.pureMovingMinutes ?? 48;
  const bufferMinutes = timelineResult?.bufferMinutes ?? 18;
  const totalKcal = Math.round(physicsResult.totalKcalBurn || 832).toLocaleString(
    lang === 'fr' ? 'fr-FR' : 'en-US'
  );

  // Elevation data (replaces Leg output per user request)
  const elevationGainM =
    trip.route.elevationGainM ?? (trip.route.distanceKm ? Math.round(trip.route.distanceKm * 6.6) : 145);
  const maxGradientPercent = trip.physics.gradientPercent
    ? (trip.physics.gradientPercent * 14).toFixed(1)
    : '4.2';

  // Compact single-line label for Tile 1 cutoff/shift target
  const targetShortLabel = (() => {
    const raw = heroTargetLabel.toLowerCase();
    if (raw.includes('camp') || raw.includes('bivouac') || raw.includes('cutoff')) return lang === 'fr' ? 'bivouac' : 'cutoff';
    if (raw.includes('shift') || raw.includes('poste')) return lang === 'fr' ? 'poste' : 'shift';
    if (raw.includes('finish') || raw.includes('fin')) return lang === 'fr' ? 'arrivée' : 'finish';
    if (raw.includes('check-in') || raw.includes('hôtel')) return lang === 'fr' ? 'hôtel' : 'hotel';
    return heroTargetLabel.split(' ')[0].toLowerCase();
  })();

  // Check dark mode
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Initialize and manage Leaflet map inside hero background
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const isDark = document.documentElement.classList.contains('dark');

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });

    mapInstanceRef.current = map;

    const getTileUrl = (dark: boolean) =>
      dark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(getTileUrl(isDark), {
      maxZoom: 16,
      attribution: 'Esri',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Glowing casing & route trace lines
    const casingLine = L.polyline(activeCoordinates, {
      color: isDark ? '#007AFF' : '#111111',
      weight: isDark ? 7 : 5,
      opacity: isDark ? 0.35 : 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const routeLine = L.polyline(activeCoordinates, {
      color: isDark ? '#38BDF8' : '#F2F455',
      weight: 3.2,
      opacity: 1,
      dashArray: isDark ? undefined : '7, 5',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Watch dark mode for tile & line styles
    const observer = new MutationObserver(() => {
      const currentlyDark = document.documentElement.classList.contains('dark');
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(getTileUrl(currentlyDark));
      }
      casingLine.setStyle({
        color: currentlyDark ? '#007AFF' : '#111111',
        weight: currentlyDark ? 7 : 5,
        opacity: currentlyDark ? 0.35 : 0.85,
      });
      routeLine.setStyle({
        color: currentlyDark ? '#38BDF8' : '#F2F455',
        dashArray: currentlyDark ? undefined : '7, 5',
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Waypoint Markers
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

    const fitRouteInClearArea = () => {
      if (activeCoordinates.length === 0 || !mapInstanceRef.current || !mapContainerRef.current) return;
      const containerH = mapContainerRef.current.clientHeight || 480;
      const lowerH = lowerContentRef.current?.offsetHeight || 240;
      const isNarrow = window.innerWidth < 640;
      const padX = isNarrow ? 24 : 40;
      const padTop = isNarrow ? 48 : 44;
      const padBottom = Math.min(Math.max(180, containerH - 95), lowerH + (isNarrow ? 20 : 28));
      mapInstanceRef.current.fitBounds(routeLine.getBounds(), {
        paddingTopLeft: [padX, padTop],
        paddingBottomRight: [padX, padBottom],
        maxZoom: 13,
      });
    };

    if (activeCoordinates.length > 0) {
      L.marker(activeCoordinates[0], { icon: startIcon }).addTo(map);
      L.marker(activeCoordinates[activeCoordinates.length - 1], { icon: endIcon }).addTo(map);

      // Frame the entire route strictly in the clear upper area of the card
      fitRouteInClearArea();
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
      fitRouteInClearArea();
    });
    resizeObserver.observe(mapContainerRef.current);

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        fitRouteInClearArea();
      }
    }, 250);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeCoordinates]);

  return (
    <div
      ref={heroRootRef}
      className="relative rounded-card bg-card text-ink border border-ink/5 dark:border-white/5 mb-6 transition-colors shadow-sm min-h-[460px] sm:min-h-[490px] lg:min-h-[520px]"
    >
      {/* ── CLIPPED BACKGROUND SHELL (LAYERS 1–3) ── */}
      <div className="absolute inset-0 z-0 rounded-card overflow-hidden">
        {/* ── LAYER 1: MAP BACKGROUND CANVAS (WITH AMPLE OVERHEAD) ── */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[460px] sm:min-h-[490px] lg:min-h-[520px] dark:[filter:brightness(0.82)_contrast(1.22)_saturate(1.15)]"
          />
        </div>

        {/* ── LAYER 2: PROGRESSIVE GRADIENT BLEND (PURE WHITE IN LIGHT MODE, CARBON IN DARK MODE) ── */}
        <div
          className="absolute inset-0 z-1 pointer-events-none transition-colors"
          style={{
            background: isDarkMode
              ? 'linear-gradient(to bottom, rgba(10, 10, 11, 0) 0%, rgba(10, 10, 11, 0) 35%, rgba(10, 10, 11, 0.45) 50%, rgba(10, 10, 11, 0.9) 70%, rgba(10, 10, 11, 1) 100%)'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.92) 70%, rgba(255, 255, 255, 1) 100%)',
          }}
        />

        {/* ── LAYER 3: PROGRESSIVE BACKDROP BLUR (MASKED SO THE WHOLE ROUTE REMAINS CRYSTAL CLEAR) ── */}
        <div
          className="absolute inset-0 z-2 pointer-events-none backdrop-blur-[7px]"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 52%, black 68%, black 100%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 52%, black 68%, black 100%)',
          }}
        />
      </div>

      {/* ── LAYER 4: HERO FOREGROUND CONTENT ── */}
      <div className="relative z-20 p-4 flex flex-col justify-between min-h-[460px] sm:min-h-[490px] lg:min-h-[520px] pointer-events-none">
        {/* Top Overlay Controls: Corridor Direction Pill + Active Bike Garage Switcher */}
        <div className="flex items-center justify-between gap-2 mb-32 sm:mb-20 lg:mb-20 pointer-events-none">
          {isInteractive ? (
            <button
              type="button"
              onClick={handleFlipRouteDirection}
              title={`${t('heroFlipReturnBtn')} — ${t('heroFlipReturnSub')}`}
              className={`inline-flex items-center gap-1.5 min-w-0 px-3 py-1 rounded-full text-[11px] font-medium bg-card/85 hover:bg-card text-ink-secondary hover:text-ink backdrop-blur-md border border-ink/5 dark:border-white/10 hover:border-ink/20 dark:hover:border-white/25 transition-all pointer-events-auto cursor-pointer select-none shadow-xs ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS.emerald.dot}`} />
              <span className="truncate">
                {trip.route.origin || 'Nord-sur-Erdre'}
              </span>
              <ArrowsLeftRight className="w-3 h-3 shrink-0 opacity-75 text-current" />
              <span className="truncate">
                {trip.route.destination || meta.gateName || 'Redon'}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 min-w-0 px-3 py-1 rounded-full text-[11px] font-medium bg-card/85 text-ink-secondary backdrop-blur-md border border-ink/5 dark:border-white/10 pointer-events-auto select-none">
              <span className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS.emerald.dot}`} />
              <span className="truncate">{trip.route.origin || 'Nord-sur-Erdre'} → {trip.route.destination || meta.gateName || 'Redon'}</span>
            </span>
          )}

          {riderSpecs && activeBike ? (
            <div className="relative shrink-0 pointer-events-auto">
              <button
                type="button"
                onClick={() => setActivePopover((prev) => (prev === 'bike' ? null : 'bike'))}
                aria-expanded={activePopover === 'bike'}
                aria-label={t('heroBikeSwitchAria')}
                title={t('heroBikeSwitchAria')}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold bg-card/90 hover:bg-card text-ink backdrop-blur-md border border-ink/10 dark:border-white/15 hover:border-ink/25 dark:hover:border-white/30 transition-all cursor-pointer shadow-xs ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Bicycle className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS['yellow-vest'].primary}`} />
                <span className="max-w-[115px] sm:max-w-[180px] truncate">{activeBike.name}</span>
                <span className="hidden min-[420px]:inline font-mono text-[10px] text-ink-muted tnum">
                  · {activeBike.weightKg}kg
                </span>
                <CaretDown
                  className={`w-3 h-3 shrink-0 text-ink-muted transition-transform duration-150 ${
                    activePopover === 'bike' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activePopover === 'bike' && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-40 rounded-pod p-3 bg-card/95 dark:bg-[#16161A]/95 backdrop-blur-xl border border-ink/10 dark:border-white/15 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      {t('bikeGarageHeading', { count: riderSpecs.bikes.length })}
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
                    {riderSpecs.bikes.map((bike) => {
                      const selected = bike.id === activeBike.id;
                      return (
                        <button
                          key={bike.id}
                          type="button"
                          onClick={() => onSelectBike?.(bike.id)}
                          className={`w-full rounded-control px-3 py-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            selected
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                              : `bg-pod/80 hover:bg-chip text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{bike.name}</div>
                            <div className="text-[10px] font-mono tnum opacity-80 mt-0.5">
                              {bike.weightKg}kg · CdA {bike.cda} · Crr {bike.crr}
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
                      className={`mt-2.5 w-full pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
                      <span>{t('heroManageGarageBtn')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-card/85 text-ink-muted backdrop-blur-md border border-ink/5 dark:border-white/10 pointer-events-auto">
              {t('activeTrackBadge') || 'ACTIVE TRACK'}
            </span>
          )}
        </div>

        {/* ── LOWER SECTION: FIRST DATA CONTAINER + 5 TILES GROUPED CLOSELY ── */}
        <div ref={lowerContentRef} className="mt-auto flex flex-col gap-3.5 sm:gap-4 pointer-events-auto">
          {/* First Data Container: Title, Description & Status Badges */}
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
              {/* 1. Commute / Pace badge */}
              <Badge variant="emerald" size="md" dot className="py-1.5 px-3 sm:px-3.5 backdrop-blur-md">
                {heroBadge}
              </Badge>

              {/* 2. Target gate / destination badge */}
              <Badge variant="rose" size="md" icon={MapPin} className="py-1.5 px-3 sm:px-3.5 backdrop-blur-md">
                {heroTarget}
              </Badge>

              {/* 3. Tag badge */}
              <Badge variant="yellow-vest" size="md" className="py-1.5 px-3 sm:px-3.5 backdrop-blur-md">
                {trip.tag || 'BIKEPACKING'}
              </Badge>
            </div>
          </div>

          {/* ── 5 REARRANGED KPI BENTO BOXES (UNIFORM HEIGHT & BASELINE ALIGNED) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. Trip Start Time (Hard rollout) — Interactive Target Time Scrubber */}
            <div className="relative col-span-2 sm:col-span-1">
              {activePopover === 'target' && isInteractive && (
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card/95 dark:bg-[#16161A]/95 backdrop-blur-xl border border-ink/10 dark:border-white/15 shadow-2xl animate-fade-in">
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
                          ? lang === 'fr'
                            ? 'Mode Arrivée'
                            : 'Arrive mode'
                          : lang === 'fr'
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
                      className="flex-1 h-9 px-3 rounded-control bg-pod text-ink font-mono font-bold text-sm tnum border border-ink/10 dark:border-white/10 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[-30, -15, 15, 30].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => handleNudgeTargetTime(delta)}
                        className="h-8 rounded-control bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum transition-colors cursor-pointer"
                      >
                        {delta > 0 ? `+${delta}m` : `${delta}m`}
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
                className={`h-full rounded-pod p-3.5 sm:p-4.5 backdrop-blur-md flex flex-col justify-between min-h-[100px] sm:min-h-[114px] transition-all hover:brightness-[0.98] dark:hover:brightness-110 ${
                  isInteractive ? 'cursor-pointer select-none group' : ''
                } ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-semibold shrink-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full animate-beacon-pulse shrink-0 ${CHIP_TOKENS['yellow-vest'].dot}`} />
                    <span className="truncate font-bold">{t('hardRollout')}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 text-current opacity-60 group-hover:opacity-100 transition-transform ${
                          activePopover === 'target' ? 'rotate-180 opacity-100' : ''
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
                    className="text-[11px] font-bold tnum opacity-85 truncate sm:w-full xl:w-auto text-right sm:text-left xl:text-right min-w-0 whitespace-nowrap"
                    title={`${heroTargetLabel} ${heroTargetValue}`}
                  >
                    {heroTargetValue ? `${heroTargetValue} ${targetShortLabel}` : '09:00'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trip Length (Route distance & Outbound/Return Flip) */}
            <div className="relative">
              {activePopover === 'route' && isInteractive && (
                <div className="absolute left-0 bottom-full mb-2.5 w-[min(19.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card/95 dark:bg-[#16161A]/95 backdrop-blur-xl border border-ink/10 dark:border-white/15 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold text-ink">{t('heroQuickRouteTitle')}</span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      aria-label={t('closeModalAria')}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pod cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFlipRouteDirection}
                    className={`w-full rounded-control p-2.5 mb-2.5 text-left flex items-center gap-2.5 transition-all cursor-pointer ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                  >
                    <ArrowsLeftRight className="w-4 h-4 shrink-0 text-current" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight">{t('heroFlipReturnBtn')}</div>
                      <div className="text-[10px] opacity-80 leading-snug mt-0.5">{t('heroFlipReturnSub')}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {[-5, -1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSetDistanceKm((trip.route.distanceKm || 10) + d)}
                        className="h-8 px-2.5 rounded-control bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <div className="flex-1 flex items-center justify-center gap-1 h-8 px-2 rounded-control bg-pod border border-ink/10 dark:border-white/10">
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
                        className="h-8 px-2.5 rounded-control bg-pod hover:bg-chip text-xs font-mono font-semibold text-ink tnum cursor-pointer"
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
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
                className={`h-full rounded-pod p-3.5 sm:p-4.5 bg-pod/90 dark:bg-[#141418]/85 text-ink backdrop-blur-md border flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all ${
                  activePopover === 'route'
                    ? 'border-ink/30 dark:border-white/30'
                    : 'border-ink/5 dark:border-white/5 hover:border-ink/15 dark:hover:border-white/15'
                } ${isInteractive ? 'cursor-pointer select-none group' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="truncate">{t('routeLength')}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 opacity-55 group-hover:opacity-100 transition-transform ${
                          activePopover === 'route' ? 'rotate-180 opacity-100 text-ink' : ''
                        }`}
                      />
                    )}
                    <Path className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
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
                    className="text-[11px] font-medium text-ink-muted truncate w-full xl:w-auto text-left xl:text-right min-w-0 whitespace-nowrap"
                    title={trip.route.origin || 'Nord-sur-Erdre'}
                  >
                    {trip.route.origin || 'Nord-sur-Erdre'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Moving Time — Interactive Live Pace & Effort Scrubber */}
            <div className="relative">
              {activePopover === 'pace' && isInteractive && (
                <div className="absolute right-0 lg:left-0 lg:right-auto bottom-full mb-2.5 w-[min(20.5rem,calc(100vw-3rem))] z-40 rounded-pod p-3.5 bg-card/95 dark:bg-[#16161A]/95 backdrop-blur-xl border border-ink/10 dark:border-white/15 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
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

                  {/* Hold Speed vs Hold Effort Toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-control bg-pod mb-3">
                    <button
                      type="button"
                      onClick={() => handleUpdatePacing({ pacingMode: 'speed' })}
                      className={`py-1.5 px-2 rounded-control text-[11px] font-semibold transition-all cursor-pointer ${
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
                      className={`py-1.5 px-2 rounded-control text-[11px] font-semibold transition-all cursor-pointer ${
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
                            className="flex-1 h-7 rounded-control bg-pod hover:bg-chip text-[11px] font-mono font-semibold text-ink tnum cursor-pointer"
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
                            className="flex-1 h-7 rounded-control bg-pod hover:bg-chip text-[11px] font-mono font-semibold text-ink tnum cursor-pointer"
                          >
                            {dv > 0 ? `+${dv}` : `${dv}`} km/h
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {onOpenConfigurator && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopover(null);
                        onOpenConfigurator();
                      }}
                      className={`mt-2.5 w-full pt-2 border-t border-dashed border-ink/10 dark:border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
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
                title={isInteractive ? t('heroClickToTweakHint') : undefined}
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
                className={`h-full rounded-pod p-3.5 sm:p-4.5 bg-pod/90 dark:bg-[#141418]/85 text-ink backdrop-blur-md border flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all ${
                  activePopover === 'pace'
                    ? 'border-ink/30 dark:border-white/30'
                    : 'border-ink/5 dark:border-white/5 hover:border-ink/15 dark:hover:border-white/15'
                } ${isInteractive ? 'cursor-pointer select-none group' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                  <span className="truncate">{t('pureRolling')}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isInteractive && (
                      <CaretUp
                        className={`w-3 h-3 opacity-55 group-hover:opacity-100 transition-transform ${
                          activePopover === 'pace' ? 'rotate-180 opacity-100 text-ink' : ''
                        }`}
                      />
                    )}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS.emerald.dot}`} />
                  </span>
                </div>
                <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink shrink-0">
                    {formatTimeHHMM(movingMinutes)}
                  </span>
                  <span className={`text-[11px] font-medium tnum truncate w-full xl:w-auto text-left xl:text-right min-w-0 whitespace-nowrap ${CHIP_TOKENS.emerald.primary}`}>
                    +{bufferMinutes}m buffer
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Energy Burned */}
            <div className="rounded-pod p-3.5 sm:p-4.5 bg-pod/90 dark:bg-[#141418]/85 text-ink backdrop-blur-md border border-ink/5 dark:border-white/5 flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all hover:border-ink/15 dark:hover:border-white/15">
              <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                <span className="truncate">{t('energyBurn')}</span>
                <Flame className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>
              <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink">
                    {totalKcal}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">kcal</span>
                </div>
                <span className="text-[11px] font-medium text-ink-muted tnum truncate w-full xl:w-auto text-left xl:text-right min-w-0 whitespace-nowrap">
                  {physicsResult.carbOxidationGramPerHour}g/h
                </span>
              </div>
            </div>

            {/* 5. Elevation Gain (formerly Leg output, per user preference) */}
            <div className="rounded-pod p-3.5 sm:p-4.5 bg-pod/90 dark:bg-[#141418]/85 text-ink backdrop-blur-md border border-ink/5 dark:border-white/5 flex flex-col justify-between min-h-[108px] sm:min-h-[114px] transition-all hover:border-ink/15 dark:hover:border-white/15">
              <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted shrink-0">
                <span className="truncate">{t('elevationGain') || 'Elevation gain'}</span>
                <Mountains className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>
              <div className="mt-auto pt-2 flex flex-col xl:flex-row items-start xl:items-baseline justify-between gap-1 min-w-0">
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-2xl sm:text-[28px] xl:text-[30px] font-bold tracking-tight tnum leading-none text-ink">
                    +{elevationGainM}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">m</span>
                </div>
                <span className="text-[11px] font-medium text-ink-muted tnum truncate w-full xl:w-auto text-left xl:text-right min-w-0 whitespace-nowrap">
                  Max {maxGradientPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
