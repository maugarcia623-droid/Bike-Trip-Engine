import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/arc';
import { TripProfile, PhysicsCalculationResult, RouteCueDirection } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { StageAmenity } from '../../types/amenities';
import { buildStageCueSheet, CueSheetEntry } from '../../utils/cueSheet';
import { calculateIntensityModulatedCarbTarget, calculateHydrationPlan } from '../../utils/nutrition';
import { haversineDistanceMeters } from '../../services/overpassCorridor';
import { useTranslation } from '../../context/LanguageContext';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Baguette,
  BellRing,
  CircleStop,
  Compass,
  Droplet,
  Flag,
  Gauge,
  LocateFixed,
  LocateOff,
  Lock,
  Navigation,
  Shield,
  Timer,
  TimerReset,
  Train,
  TriangleAlert,
  Unlock,
  Volume,
  VolumeX,
  Wrench,
} from '@/components/icons';
import {
  buildSimulatedAlert,
  computeFuelingIntervals,
  evaluateProximityAlerts,
  findNextStopAndTurn,
  formatFuelingVoiceCue,
  primeRideAudio,
  projectPositionOntoRoute,
  RideAlertEvent,
  speakRideCue,
} from '../../utils/rideVoiceAlerts';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
  YELLOW_VEST_SOLID_CTA_CLASSES,
} from '../../tokens/chipTokens';

interface RideModeOverlayProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  riderSpecs: RiderBikeSpecs;
  loadedAmenities?: StageAmenity[];
  onClose: () => void;
}

type GpsStatus = 'searching' | 'locked' | 'denied' | 'unsupported';
type WakeLockStatus = 'active' | 'off' | 'unsupported';

function formatCountdownClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDistanceCountdown(km: number | null): string {
  if (km === null || !Number.isFinite(km)) return '--';
  if (km < 1) {
    const meters = Math.max(0, Math.round((km * 1000) / 10) * 10);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

function TurnDirectionIcon({ direction }: { direction: RouteCueDirection | undefined }) {
  const cls = 'w-6 h-6 sm:w-7 sm:h-7 shrink-0 text-current';
  switch (direction) {
    case 'left':
    case 'sharp-left':
      return <ArrowLeft className={cls} />;
    case 'slight-left':
      return <ArrowUpLeft className={cls} />;
    case 'right':
    case 'sharp-right':
      return <ArrowRight className={cls} />;
    case 'slight-right':
      return <ArrowUpRight className={cls} />;
    case 'arrive':
      return <Flag className={cls} />;
    case 'straight':
      return <ArrowUp className={cls} />;
    default:
      return <Navigation className={cls} />;
  }
}

function StopCategoryIcon({ amenity }: { amenity?: StageAmenity }) {
  const cls = 'w-6 h-6 shrink-0';
  if (!amenity) return <Compass className={`${cls} text-ink`} />;
  switch (amenity.category) {
    case 'water':
    case 'cemetery':
      return <Droplet className={`${cls} text-sky-500`} />;
    case 'food':
      return <Baguette className={`${cls} text-amber-500`} />;
    case 'mechanix':
      return <Wrench className={`${cls} text-orange-500`} />;
    case 'bailout':
      return <Train className={`${cls} text-indigo-500`} />;
    case 'essentials':
    default:
      return <Shield className={`${cls} text-emerald-500`} />;
  }
}

export const RideModeOverlay: React.FC<RideModeOverlayProps> = ({
  trip,
  physicsResult,
  riderSpecs,
  loadedAmenities = [],
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const routeCoords = useMemo<[number, number][]>(() => {
    if (trip.route.coordinates && trip.route.coordinates.length >= 2) {
      return trip.route.coordinates;
    }
    return [];
  }, [trip.route.coordinates]);

  const totalDistanceKm = Math.max(0.1, trip.route.distanceKm || 1);

  const pinnedStops = useMemo<StageAmenity[]>(() => {
    if (trip.pinnedAmenities && trip.pinnedAmenities.length > 0) {
      return trip.pinnedAmenities;
    }
    return loadedAmenities.filter((a) => a.isPinned);
  }, [trip.pinnedAmenities, loadedAmenities]);

  const cueEntries = useMemo<CueSheetEntry[]>(() => {
    return buildStageCueSheet({
      route: trip.route,
      coords: routeCoords,
      pinnedAmenities: pinnedStops,
      departureTime: trip.departureTime || '08:00',
      speedKmH: physicsResult.calmSpeedKmH || trip.route.targetSpeedKmH || 24,
      lang,
    });
  }, [
    trip.route,
    routeCoords,
    pinnedStops,
    trip.departureTime,
    physicsResult.calmSpeedKmH,
    lang,
  ]);

  // Fueling & Hydration intervals from nutrition.ts
  const fuelingIntervals = useMemo(() => {
    const rideHours = Math.max(0.25, (physicsResult.movingTimeSeconds || 3600) / 3600);
    const totalDays = trip.stages?.length || 1;
    const isShortRide = rideHours < 0.75 && totalDays <= 1;
    const activeChips = trip.customChips || [];
    const ftpWatts = Math.max(80, riderSpecs.ftpWatts || 200);
    const pctFtp =
      physicsResult.ftpPercent ?? ((physicsResult.legWatts || 150) / ftpWatts) * 100;
    const carbTarget = calculateIntensityModulatedCarbTarget({
      rideHours,
      pctFtp,
      carbOxidationGramPerHour: physicsResult.carbOxidationGramPerHour || 45,
      gutCeilingGPerHr: riderSpecs.carbTargetGPerHr || 60,
      totalDays,
      activeChips,
    });
    const hydration = calculateHydrationPlan({
      rideHours,
      tempC: trip.weather?.temperatureC ?? 18,
      legWatts: physicsResult.legWatts,
      bidonSizeMl: riderSpecs.bidonSizeMl ?? 650,
      frameBottleSlots: riderSpecs.frameBottleSlots ?? 2,
      isShortRide,
      activeChips,
    });
    return computeFuelingIntervals({
      targetFluidMlPerHr: hydration.targetFluidMlPerHr,
      carbTargetPerHour: carbTarget.effectiveHourlyRateG,
      isShortRide,
    });
  }, [
    physicsResult.movingTimeSeconds,
    physicsResult.legWatts,
    physicsResult.carbOxidationGramPerHour,
    riderSpecs,
    trip.stages?.length,
    trip.weather?.temperatureC,
    trip.customChips,
  ]);

  // Live GPS & Route Progress State
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'searching' : 'unsupported'
  );
  const [liveSpeedKmH, setLiveSpeedKmH] = useState<number | null>(null);
  const [distanceCoveredKm, setDistanceCoveredKm] = useState<number>(0);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number>(totalDistanceKm);
  const [offRouteMeters, setOffRouteMeters] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);

  // Voice & Alerts State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const [lastAlert, setLastAlert] = useState<RideAlertEvent | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const triggeredAlertsRef = useRef<Set<string>>(new Set());
  const prevFixRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Wake Lock State
  const [wakeLockStatus, setWakeLockStatus] = useState<WakeLockStatus>(() =>
    typeof navigator !== 'undefined' && 'wakeLock' in navigator ? 'off' : 'unsupported'
  );
  const wakeLockSentinelRef = useRef<{ release: () => Promise<void> } | null>(null);
  const wantWakeLockRef = useRef<boolean>(true);

  // Fueling Countdown State (seconds)
  const intervalSeconds = fuelingIntervals.primaryCueIntervalMin * 60;
  const [fuelSecondsLeft, setFuelSecondsLeft] = useState<number>(intervalSeconds);

  useEffect(() => {
    setFuelSecondsLeft(intervalSeconds);
  }, [intervalSeconds]);

  // Wake Lock acquisition & visibility re-acquire
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setWakeLockStatus('unsupported');
      return;
    }
    try {
      const nav = navigator as unknown as {
        wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void>; addEventListener?: (ev: string, cb: () => void) => void }> };
      };
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setWakeLockStatus('active');
      if (sentinel.addEventListener) {
        sentinel.addEventListener('release', () => {
          setWakeLockStatus('off');
        });
      }
    } catch {
      setWakeLockStatus('off');
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    wantWakeLockRef.current = false;
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {
        // ignore
      }
      wakeLockSentinelRef.current = null;
    }
    if (wakeLockStatus !== 'unsupported') {
      setWakeLockStatus('off');
    }
  }, [wakeLockStatus]);

  const toggleWakeLock = useCallback(() => {
    if (wakeLockStatus === 'unsupported') return;
    if (wakeLockStatus === 'active') {
      void releaseWakeLock();
    } else {
      wantWakeLockRef.current = true;
      void requestWakeLock();
    }
  }, [wakeLockStatus, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    wantWakeLockRef.current = true;
    void requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wantWakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.removeEventListener('visibilitychange', handleVisibility);
      wantWakeLockRef.current = false;
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release().catch(() => {});
        wakeLockSentinelRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [requestWakeLock]);

  // Fueling & Hydration 1s Countdown Timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setFuelSecondsLeft((prev) => {
        if (prev <= 1) {
          const spoken = formatFuelingVoiceCue('both', lang);
          const alert: RideAlertEvent = {
            id: `fuel-${Date.now()}`,
            kind: 'fuel',
            title: isFr ? 'Rappel hydratation & énergie' : 'Drink & Fuel Cue',
            spokenText: spoken,
          };
          setLastAlert(alert);
          speakRideCue(spoken, { lang, muted: isMutedRef.current, chime: true });
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [intervalSeconds, lang, isFr]);

  // Live GPS Watch
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('locked');
        const { latitude, longitude, speed } = pos.coords;
        const now = pos.timestamp || Date.now();

        let computedSpeedKmH: number | null = null;
        if (typeof speed === 'number' && Number.isFinite(speed) && speed >= 0) {
          computedSpeedKmH = Math.round(speed * 3.6 * 10) / 10;
        } else if (prevFixRef.current) {
          const dtSec = (now - prevFixRef.current.timestamp) / 1000;
          if (dtSec >= 1.5 && dtSec <= 60) {
            const distM = haversineDistanceMeters(
              prevFixRef.current.lat,
              prevFixRef.current.lng,
              latitude,
              longitude
            );
            const kmh = (distM / dtSec) * 3.6;
            if (kmh >= 0 && kmh < 120) {
              computedSpeedKmH = Math.round(kmh * 10) / 10;
            }
          }
        }
        prevFixRef.current = { lat: latitude, lng: longitude, timestamp: now };
        if (computedSpeedKmH !== null) {
          setLiveSpeedKmH(computedSpeedKmH);
        }

        const projection = projectPositionOntoRoute(
          latitude,
          longitude,
          routeCoords,
          totalDistanceKm
        );
        setDistanceCoveredKm(projection.distanceCoveredKm);
        setDistanceRemainingKm(projection.distanceRemainingKm);
        setOffRouteMeters(projection.offRouteMeters);
        setProgressPct(projection.progressPct);

        const { alerts, newlyTriggeredKeys } = evaluateProximityAlerts({
          distanceCoveredKm: projection.distanceCoveredKm,
          cueEntries,
          triggeredKeys: triggeredAlertsRef.current,
          lang,
        });

        for (const key of newlyTriggeredKeys) {
          triggeredAlertsRef.current.add(key);
        }

        if (alerts.length > 0) {
          const primary = alerts[0];
          setLastAlert(primary);
          speakRideCue(primary.spokenText, { lang, muted: isMutedRef.current, chime: true });
        }
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('searching');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [routeCoords, totalDistanceKm, cueEntries, lang]);

  const { nextTurn, distanceToTurnKm, nextStop, distanceToStopKm } = useMemo(
    () => findNextStopAndTurn(distanceCoveredKm, cueEntries),
    [distanceCoveredKm, cueEntries]
  );

  const handleSimulateAlert = () => {
    const sim = buildSimulatedAlert(lang, nextStop, nextTurn);
    setLastAlert(sim);
    speakRideCue(sim.spokenText, { lang, muted: isMuted, chime: true });
  };

  const fuelMinutesLeft = Math.max(1, Math.ceil(fuelSecondsLeft / 60));

  const gpsBadge = (() => {
    switch (gpsStatus) {
      case 'locked':
        return {
          icon: <LocateFixed className="w-3.5 h-3.5 shrink-0 text-current" />,
          label: t('rideModeGpsLocked'),
          cls: `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`,
        };
      case 'denied':
        return {
          icon: <LocateOff className="w-3.5 h-3.5 shrink-0 text-current" />,
          label: t('rideModeGpsDenied'),
          cls: `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.rose.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`,
        };
      case 'unsupported':
        return {
          icon: <LocateOff className="w-3.5 h-3.5 shrink-0 text-current" />,
          label: t('rideModeGpsUnsupported'),
          cls: `bg-pod text-ink-secondary ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} ${CHIP_DUOTONE_ISOLATION_CLASSES}`,
        };
      case 'searching':
      default:
        return {
          icon: <LocateFixed className="w-3.5 h-3.5 shrink-0 text-current animate-pulse" />,
          label: t('rideModeGpsSearching'),
          cls: `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`,
        };
    }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('rideModeTitle')}
      data-testid="ride-mode-overlay"
      className="fixed inset-0 z-[1200] h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-none touch-none select-none bg-canvas text-ink flex flex-col"
    >
      <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-4 flex flex-col gap-2 sm:gap-3 h-full overflow-hidden">
        {/* ── TOP HUD HEADER BAR (MATCHING INITIAL LAYOUT, ZERO OVERFLOW) ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-rounded font-extrabold uppercase tracking-wider shrink-0 ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 text-current" />
              <span>{t('rideModeTitle')}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-rounded font-bold min-w-0 truncate ${gpsBadge.cls}`}
            >
              {gpsBadge.icon}
              <span className="truncate">{gpsBadge.label}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Wake Lock Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="ride-mode-wakelock-btn"
              onClick={toggleWakeLock}
              disabled={wakeLockStatus === 'unsupported'}
              className={`min-h-[44px] px-2.5 sm:px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-rounded font-bold transition-all cursor-pointer min-w-0 ${
                wakeLockStatus === 'active'
                  ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`
                  : `bg-card hover:bg-pod text-ink-secondary ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} border border-ink/10 dark:border-white/10 ${CHIP_DUOTONE_ISOLATION_CLASSES}`
              }`}
            >
              {wakeLockStatus === 'active' ? (
                <Lock className="w-3.5 h-3.5 shrink-0 text-current" />
              ) : (
                <Unlock className="w-3.5 h-3.5 shrink-0 text-current" />
              )}
              <span className="truncate">
                {wakeLockStatus === 'unsupported'
                  ? t('rideModeWakeLockUnsupported')
                  : wakeLockStatus === 'active'
                  ? t('rideModeWakeLockOn')
                  : t('rideModeWakeLockOff')}
              </span>
            </Button>

            {/* Mute / Unmute Voice Alerts */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="ride-mode-mute-btn"
              onClick={() => {
                setIsMuted((prev) => {
                  const next = !prev;
                  if (!next) primeRideAudio();
                  return next;
                });
              }}
              className={`min-h-[44px] px-2.5 sm:px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-rounded font-bold transition-all cursor-pointer min-w-0 ${
                isMuted
                  ? `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.rose.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`
                  : `bg-card hover:bg-pod text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED} border border-ink/10 dark:border-white/10`
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 shrink-0 text-current" />
              ) : (
                <Volume className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              )}
              <span className="truncate">
                {isMuted ? t('rideModeVoiceMuted') : t('rideModeVoiceOn')}
              </span>
            </Button>

            {/* Exit Ride Mode */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="ride-mode-exit-btn"
              onClick={onClose}
              className="min-h-[44px] px-2.5 sm:px-4 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-rounded font-extrabold bg-ink text-ink-inverse hover:opacity-90 transition-all cursor-pointer min-w-0"
            >
              <CircleStop className="w-3.5 h-3.5 shrink-0 text-current" />
              <span className="truncate">{t('rideModeExit')}</span>
            </Button>
          </div>
        </header>

        {/* Off-route warning if GPS is locked and > 150m away */}
        {gpsStatus === 'locked' && offRouteMeters > 150 && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-pod text-xs font-rounded font-bold shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`}
          >
            <TriangleAlert className="w-4 h-4 shrink-0 text-current" />
            <span className="truncate">
              {t('rideModeOffRouteWarning', { meters: offRouteMeters })}
            </span>
          </div>
        )}

        {/* ── MAIN PROPORTIONAL STACK (FILLS SCREEN WITH ZERO DEAD SPACE & ZERO SCROLL) ── */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3">
          {/* 1. Primary Telemetry: Live Speed & Distance Remaining (Full-width stacked on mobile, 2-col on sm+) */}
          <section className="flex-[2.2] sm:flex-[1.3] min-h-0 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3.5">
            {/* Live Speed */}
            <div className="flex-1 min-h-0 bg-card rounded-card px-4 py-2.5 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-ink" />
                  <span>{t('rideModeSpeedLabel')}</span>
                </span>
                <span className="tnum">
                  {isFr ? 'Cible' : 'Target'} {Math.round(physicsResult.calmSpeedKmH)} km/h
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="ride-mode-speed"
                  className="text-5xl sm:text-7xl font-rounded font-extrabold tracking-tight tnum leading-none text-ink"
                >
                  {liveSpeedKmH !== null ? liveSpeedKmH.toFixed(1) : '0.0'}
                </span>
                <span className="text-base sm:text-lg font-rounded font-bold text-ink-secondary">
                  km/h
                </span>
              </div>
            </div>

            {/* Distance Remaining / Covered */}
            <div className="flex-1 min-h-0 bg-card rounded-card px-4 py-2.5 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                <span>{t('rideModeRemainingLabel')}</span>
                <span className="tnum">
                  {t('rideModeCoveredLabel')}: {distanceCoveredKm.toFixed(1)} km
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="ride-mode-remaining"
                  className="text-5xl sm:text-7xl font-rounded font-extrabold tracking-tight tnum leading-none text-ink"
                >
                  {distanceRemainingKm.toFixed(1)}
                </span>
                <span className="text-base sm:text-lg font-rounded font-bold text-ink-secondary">
                  km
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-pod overflow-hidden">
                <div
                  className="h-full bg-volt transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(2, progressPct))}%` }}
                />
              </div>
            </div>
          </section>

          {/* 2. Next Turn & Next Pinned Resupply Stop (Full-width stacked on mobile so text never truncates) */}
          <section className="flex-[1.7] sm:flex-1 min-h-0 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3.5">
            {/* Next Turn */}
            <div className="flex-1 min-h-0 bg-card rounded-card px-4 py-2.5 sm:p-4 border border-ink/10 dark:border-white/10 flex items-center gap-3.5">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-pod flex items-center justify-center shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <TurnDirectionIcon direction={nextTurn?.direction} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                  {t('rideModeNextTurnLabel')}
                </div>
                <div className="text-sm sm:text-lg font-rounded font-extrabold text-ink truncate">
                  {nextTurn ? nextTurn.instruction : t('rideModeNoTurnFallback')}
                </div>
                <div className="text-xs sm:text-sm font-rounded font-bold tnum text-ink-secondary">
                  {formatDistanceCountdown(distanceToTurnKm)}
                </div>
              </div>
            </div>

            {/* Next Pinned Resupply Stop */}
            <div className="flex-1 min-h-0 bg-card rounded-card px-4 py-2.5 sm:p-4 border border-ink/10 dark:border-white/10 flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-pod bg-pod flex items-center justify-center shrink-0">
                <StopCategoryIcon amenity={nextStop?.amenity} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                  {t('rideModeNextStopLabel')}
                </div>
                <div className="text-sm sm:text-lg font-rounded font-extrabold text-ink truncate">
                  {nextStop ? nextStop.amenity?.name || nextStop.shortName : t('rideModeNoStopPinned')}
                </div>
                <div className="text-xs sm:text-sm font-rounded font-bold tnum text-ink-secondary">
                  {nextStop ? formatDistanceCountdown(distanceToStopKm) : '--'}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Fueling & Hydration Timer Countdown (Full-width stacked layout matching first iteration) */}
          <section className="flex-[1.35] sm:flex-1 min-h-0 bg-card rounded-card px-4 py-3 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-pod bg-pod flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-ink" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                  {t('rideModeFuelTimerLabel')}
                </div>
                <div
                  data-testid="ride-mode-fuel-cue"
                  className="text-sm sm:text-lg font-rounded font-extrabold text-ink leading-snug"
                >
                  {t('rideModeNextCueIn', { min: fuelMinutesLeft })}
                </div>
                <div className="text-xs font-rounded text-ink-secondary truncate">
                  {t('rideModeDrinkEvery', { min: fuelingIntervals.drinkIntervalMin })}
                  {fuelingIntervals.carbIntervalMin > 0 &&
                    ` · ${t('rideModeCarbEvery', { min: fuelingIntervals.carbIntervalMin })}`}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span
                data-testid="ride-mode-fuel-countdown"
                className="text-3xl sm:text-4xl font-rounded font-extrabold tnum text-ink leading-none"
              >
                {formatCountdownClock(fuelSecondsLeft)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="md"
                data-testid="ride-mode-reset-timer-btn"
                onClick={() => setFuelSecondsLeft(intervalSeconds)}
                className="min-h-[44px] sm:min-h-[48px] px-5 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-xs sm:text-sm font-rounded font-extrabold text-ink inline-flex items-center gap-1.5 cursor-pointer"
              >
                <TimerReset className="w-4 h-4 shrink-0" />
                <span>{t('rideModeResetTimer')}</span>
              </Button>
            </div>
          </section>
        </div>

        {/* ── LAST SPOKEN ALERT + SIMULATE / TEST ALERT CTA ── */}
        <footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex-1 min-w-0 bg-pod rounded-pod px-4 py-2.5 border border-ink/10 dark:border-white/10">
            <div className="text-[10px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
              {t('rideModeLastAlertLabel')}
            </div>
            <div
              data-testid="ride-mode-last-alert"
              className="text-xs sm:text-sm font-rounded font-semibold text-ink truncate"
            >
              {lastAlert
                ? lastAlert.spokenText
                : isFr
                ? 'Les alertes vocales s’afficheront ici à l’approche des points clés.'
                : 'Voice cues will appear here as you approach stops, turns, and fuel timers.'}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            data-testid="ride-mode-test-alert-btn"
            onClick={handleSimulateAlert}
            className={`min-h-[48px] sm:min-h-[52px] px-6 rounded-full text-sm font-rounded font-extrabold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 transition-all active:scale-[0.98] ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
          >
            <BellRing className="w-4 h-4 shrink-0 text-current" />
            <span>{t('rideModeTestAlertBtn')}</span>
          </Button>
        </footer>
      </div>
    </div>
  );
};
