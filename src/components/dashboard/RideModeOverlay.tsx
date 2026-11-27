import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from "@/components/arc/button/button";
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
  BatteryCharging,
  BellRing,
  CircleStop,
  Compass,
  Droplet,
  Flag,
  Flashlight,
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
  Wind,
  Wrench,
} from '@/components/icons';
import { calculateRideVisibility } from '../../utils/solarVisibility';
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
  speakRideCueSequence,
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

  const explicitPinnedStops = useMemo<StageAmenity[]>(() => {
    if (trip.pinnedAmenities && trip.pinnedAmenities.length > 0) {
      return trip.pinnedAmenities;
    }
    return loadedAmenities.filter((a) => a.isPinned);
  }, [trip.pinnedAmenities, loadedAmenities]);

  const hasExplicitPinnedStops = explicitPinnedStops.length > 0;

  // Fall back to nearest unpinned water / cemetery stops when no stops are pinned
  const pinnedStops = useMemo<StageAmenity[]>(() => {
    if (explicitPinnedStops.length > 0) {
      return explicitPinnedStops;
    }
    return [...loadedAmenities]
      .filter((a) => a.category === 'water' || a.category === 'cemetery')
      .sort((a, b) => a.routeKm - b.routeKm || a.detourMeters - b.detourMeters);
  }, [explicitPinnedStops, loadedAmenities]);

  const targetSpeedKmH =
    physicsResult.effectiveSpeedKmH ||
    physicsResult.calmSpeedKmH ||
    trip.route.targetSpeedKmH ||
    24;

  const rideVisibility = useMemo(
    () =>
      calculateRideVisibility(
        trip,
        trip.departureDate,
        trip.departureTime,
        targetSpeedKmH
      ),
    [trip, targetSpeedKmH]
  );

  const baseWindKmH = trip.weather?.baseWindSpeedKmH ?? 0;
  const maxGust = Math.round(
    trip.weather?.estuaryGustKmH ||
      (trip.weather?.isHeadwindActive
        ? Math.round(baseWindKmH * 1.5)
        : Math.round(baseWindKmH * 1.4))
  );
  const tempC = trip.weather?.temperatureC ?? (rideVisibility.isWinterTrip ? 2 : 14);
  const isColdBatteryWarning = tempC <= 6;

  const cueEntries = useMemo<CueSheetEntry[]>(() => {
    return buildStageCueSheet({
      route: trip.route,
      coords: routeCoords,
      pinnedAmenities: pinnedStops,
      departureTime: trip.departureTime || '08:00',
      speedKmH: targetSpeedKmH,
      lang,
    });
  }, [
    trip.route,
    routeCoords,
    pinnedStops,
    trip.departureTime,
    targetSpeedKmH,
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
    const carbCeiling = riderSpecs.carbTargetGPerHr || 60;
    const isLockedCarbTarget =
      riderSpecs?.carbPacingMode === 'locked' ||
      (riderSpecs?.carbPacingMode !== 'auto' &&
        riderSpecs?.riderLevel === 'pro' &&
        carbCeiling >= 60);
    const carbTarget = calculateIntensityModulatedCarbTarget({
      rideHours,
      pctFtp,
      carbOxidationGramPerHour: physicsResult.carbOxidationGramPerHour || 45,
      gutCeilingGPerHr: carbCeiling,
      totalDays,
      activeChips,
      isLockedCarbTarget,
    });
    const hydration = calculateHydrationPlan({
      rideHours,
      tempC: trip.weather?.temperatureC ?? 18,
      legWatts: physicsResult.legWatts,
      bidonSizeMl: riderSpecs.bidonSizeMl ?? 650,
      frameBottleSlots: riderSpecs.frameBottleSlots ?? 2,
      isShortRide: isShortRide && !isLockedCarbTarget,
      activeChips,
    });
    return computeFuelingIntervals({
      targetFluidMlPerHr: hydration.targetFluidMlPerHr,
      carbTargetPerHour: carbTarget.effectiveHourlyRateG,
      isShortRide: isShortRide && !isLockedCarbTarget,
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
  const [mutedSimulateNotice, setMutedSimulateNotice] = useState<boolean>(false);
  const hasUserPrimedAudioRef = useRef<boolean>(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (!isMuted) {
      setMutedSimulateNotice(false);
    }
  }, [isMuted]);

  const primeAudioOnGesture = useCallback(() => {
    if (!hasUserPrimedAudioRef.current) {
      hasUserPrimedAudioRef.current = true;
      primeRideAudio();
    }
  }, []);
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
    primeRideAudio();

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
      setFuelSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Trigger fueling / hydration voice cue outside state updater when timer hits 0
  useEffect(() => {
    if (fuelSecondsLeft > 0 || intervalSeconds <= 0) return;
    const cueType = fuelingIntervals.carbIntervalMin === 0 ? 'drink' : 'both';
    const spoken = formatFuelingVoiceCue(cueType, lang);
    const alert: RideAlertEvent = {
      id: `fuel-${Date.now()}`,
      kind: 'fuel',
      title:
        cueType === 'drink'
          ? isFr
            ? 'Rappel hydratation'
            : 'Hydration Cue'
          : tRef.current('rideModeDrinkFuelTitle'),
      spokenText: spoken,
    };
    setLastAlert(alert);
    speakRideCue(spoken, { lang, muted: isMutedRef.current, chime: true });
    setFuelSecondsLeft(intervalSeconds);
  }, [fuelSecondsLeft, intervalSeconds, fuelingIntervals.carbIntervalMin, lang, isFr]);

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
          const combinedAlert: RideAlertEvent =
            alerts.length === 1
              ? alerts[0]
              : {
                  id: alerts.map((a) => a.id).join('+'),
                  kind: alerts[0].kind,
                  title: alerts.map((a) => a.title).join(' · '),
                  spokenText: alerts.map((a) => a.spokenText).join(' '),
                  distanceMeters: alerts[0].distanceMeters,
                };
          setLastAlert(combinedAlert);
          speakRideCueSequence(
            alerts.map((a) => a.spokenText),
            { lang, muted: isMutedRef.current, chime: true, queue: true }
          );
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
    primeRideAudio();
    hasUserPrimedAudioRef.current = true;
    const sim = buildSimulatedAlert(lang, nextStop, nextTurn);
    setLastAlert(sim);
    if (isMuted) {
      setMutedSimulateNotice(true);
      return;
    }
    setMutedSimulateNotice(false);
    speakRideCue(sim.spokenText, { lang, muted: false, chime: true });
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
      onPointerDown={primeAudioOnGesture}
      onClick={primeAudioOnGesture}
      className="fixed inset-0 z-[1200] h-[100dvh] max-h-[100dvh] w-full overflow-y-auto overscroll-contain touch-pan-y select-none bg-canvas text-ink"
    >
      <div
        className="w-full max-w-3xl mx-auto flex flex-col gap-1.5 sm:gap-3 min-h-full"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.875rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.875rem, env(safe-area-inset-right))',
        }}
      >
        {/* ── TOP HUD HEADER BAR (SAFE-AREA AWARE, ZERO TRUNCATION) ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-extrabold uppercase tracking-wider shrink-0 ${YELLOW_VEST_SOLID_CTA_CLASSES}`}
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 text-current" />
              <span>{t('rideModeTitle')}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-rounded font-bold min-w-0 ${gpsBadge.cls}`}
            >
              {gpsBadge.icon}
              <span className="whitespace-nowrap">{gpsBadge.label}</span>
            </span>
          </div>

          <div className="grid grid-cols-[1.25fr_1fr_0.95fr] sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            {/* Wake Lock Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="ride-mode-wakelock-btn"
              onClick={toggleWakeLock}
              disabled={wakeLockStatus === 'unsupported'}
              className={`min-h-[44px] px-2 sm:px-3.5 rounded-full inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-rounded font-bold transition-all cursor-pointer whitespace-nowrap ${
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
              <span>
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
                if (isMuted) {
                  primeRideAudio();
                  hasUserPrimedAudioRef.current = true;
                  setMutedSimulateNotice(false);
                }
                setIsMuted((prev) => !prev);
              }}
              className={`min-h-[44px] px-2 sm:px-3.5 rounded-full inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-rounded font-bold transition-all cursor-pointer whitespace-nowrap ${
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
              <span>
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
              className="min-h-[44px] px-2 sm:px-4 rounded-full inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-rounded font-extrabold bg-ink text-ink-inverse hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
            >
              <CircleStop className="w-3.5 h-3.5 shrink-0 text-current" />
              <span>{t('rideModeExit')}</span>
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

        {/* ── HAZARD-DRIVEN RIDE CONDITIONS STRIP ── */}
        {(() => {
          const showGustHazard =
            maxGust >= 25 || (trip.weather?.effectiveHeadwindKmH ?? 0) >= 18;
          const showLightHazard =
            (rideVisibility.nightPercent ?? 0) > 0 ||
            (rideVisibility.twilightPercent ?? 0) > 0 ||
            (trip.weather?.visibilityKm ?? 15) < 5;
          const showColdHazard = isColdBatteryWarning || tempC <= 6;
          const hasAnyHazard = showGustHazard || showLightHazard || showColdHazard;

          return (
            <div
              data-testid="ride-mode-conditions-strip"
              className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-pod bg-card border border-ink/15 dark:border-white/15 shadow-xs shrink-0 text-xs font-rounded font-bold text-ink"
            >
              {!hasAnyHazard ? (
                <span className="text-xs font-rounded font-semibold text-ink-secondary">
                  {isFr ? 'Conditions calmes · Plein jour' : 'Calm conditions · Daylight'}
                </span>
              ) : (
                <>
                  {showGustHazard && (
                    <span
                      data-testid="ride-mode-gusts-badge"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pod text-ink border border-ink/10 dark:border-white/10 tnum"
                    >
                      <Wind className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                      <span>
                        {isFr ? `Rafales ${maxGust} km/h` : `Gusts ${maxGust} km/h`}
                      </span>
                    </span>
                  )}

                  {showLightHazard && (
                    <span
                      data-testid="ride-mode-lumens-badge"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pod text-ink border border-ink/10 dark:border-white/10 tnum"
                    >
                      <Flashlight className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        {isFr ? 'Phare' : 'Light'} {rideVisibility.lightingGear.recommendedLumens}
                      </span>
                    </span>
                  )}

                  {showColdHazard && (
                    <span
                      data-testid="ride-mode-cold-battery-badge"
                      title={
                        isFr
                          ? rideVisibility.lightingGear.batteryNoticeFr
                          : rideVisibility.lightingGear.batteryNoticeEn
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full tnum ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                    >
                      <BatteryCharging className="w-3.5 h-3.5 shrink-0 text-current" />
                      <span>
                        {isFr
                          ? `Batterie < 5°C (-30%) · ${Math.round(tempC)}°C`
                          : `Sub-5°C battery (-30%) · ${Math.round(tempC)}°C`}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ── MAIN PROPORTIONAL STACK (FILLS VIEWPORT, SCROLLABLE ON COMPACT SCREENS) ── */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-3">
          {/* 1. Primary Telemetry: Live Speed & Distance Remaining (Full-width stacked on mobile, 2-col on sm+) */}
          <section className="flex-[2.2] sm:flex-[1.3] flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3.5">
            {/* Live Speed */}
            <div className="flex-1 min-w-0 bg-card rounded-card px-4 py-2.5 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-ink" />
                  <span>{t('rideModeSpeedLabel')}</span>
                </span>
                <span data-testid="ride-mode-target-speed" className="tnum">
                  {t('rideModeTargetPrefix')}{' '}
                  {Math.round(physicsResult.effectiveSpeedKmH ?? physicsResult.calmSpeedKmH)} km/h
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
            <div className="flex-1 min-w-0 bg-card rounded-card px-4 py-2.5 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col justify-between">
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

          {/* 2. Next Turn & Next Pinned / Fallback Resupply Stop */}
          <section className="flex-[1.7] sm:flex-1 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3.5">
            {/* Next Turn */}
            <div className="flex-1 min-w-0 bg-card rounded-card px-4 py-2.5 sm:p-4 border border-ink/10 dark:border-white/10 flex items-center gap-3.5">
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

            {/* Next Pinned / Fallback Resupply Stop */}
            <div className="flex-1 min-w-0 bg-card rounded-card px-4 py-2.5 sm:p-4 border border-ink/10 dark:border-white/10 flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-pod bg-pod flex items-center justify-center shrink-0">
                <StopCategoryIcon amenity={nextStop?.amenity} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-rounded font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5 flex-wrap">
                  <span>{t('rideModeNextStopLabel')}</span>
                  {!hasExplicitPinnedStops && nextStop?.amenity && (
                    <span className="text-[10px] font-bold normal-case tracking-normal px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                      {isFr ? 'Eau auto' : 'Nearest water'}
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-lg font-rounded font-extrabold text-ink truncate">
                  {nextStop ? nextStop.amenity?.name || nextStop.shortName : t('rideModeNoStopPinned')}
                </div>
                <div className="text-xs sm:text-sm font-rounded font-bold tnum text-ink-secondary">
                  {nextStop ? formatDistanceCountdown(distanceToStopKm) : '--'}
                </div>
                {nextStop?.cmt && (
                  <div
                    data-testid="ride-mode-next-stop-cmt"
                    className="text-[11px] font-rounded font-medium text-ink-secondary leading-snug break-words"
                  >
                    {nextStop.cmt}
                  </div>
                )}
                {nextStop?.amenity?.category === 'cemetery' &&
                  (rideVisibility.isWinterTrip || tempC <= 4) && (
                    <div
                      data-testid="ride-mode-cemetery-shutoff-note"
                      className="mt-0.5 text-[11px] font-rounded font-semibold leading-snug text-amber-700 dark:text-amber-300"
                    >
                      {isFr
                        ? 'Risque coupure hivernale : robinet parfois fermé hors gel'
                        : 'Winter shutoff risk: cemetery water may be turned off for frost'}
                    </div>
                  )}
              </div>
            </div>
          </section>

          {/* 3. Fueling & Hydration Timer Countdown */}
          <section className="flex-[1.35] sm:flex-1 bg-card rounded-card px-4 py-3 sm:p-5 border border-ink/10 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
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
                  {fuelingIntervals.carbIntervalMin === 0
                    ? isFr
                      ? `Prochain rappel hydratation dans ${fuelMinutesLeft} min`
                      : `Next drink cue in ${fuelMinutesLeft} min`
                    : t('rideModeNextCueIn', { min: fuelMinutesLeft })}
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
                onClick={() => {
                  primeRideAudio();
                  hasUserPrimedAudioRef.current = true;
                  setFuelSecondsLeft(intervalSeconds);
                }}
                className="min-h-[44px] sm:min-h-[48px] px-5 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-xs sm:text-sm font-rounded font-extrabold text-ink inline-flex items-center gap-1.5 cursor-pointer"
              >
                <TimerReset className="w-4 h-4 shrink-0" />
                <span>{t('rideModeResetTimer')}</span>
              </Button>
            </div>
          </section>
        </div>

        {/* ── COMPACT ALERT FOOTER ── */}
        <footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          {(lastAlert || (mutedSimulateNotice && isMuted)) && (
            <div className="flex-1 min-w-0 bg-pod rounded-pod px-4 py-2 border border-ink/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-rounded font-bold uppercase tracking-wider text-ink-secondary">
                  {t('rideModeLastAlertLabel')}
                </span>
                {mutedSimulateNotice && isMuted && (
                  <span
                    role="status"
                    data-testid="ride-mode-muted-feedback"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-rounded font-bold ${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary}`}
                  >
                    <VolumeX className="w-3 h-3 shrink-0 text-current" />
                    <span>
                      {isFr
                        ? 'Son coupé : réactivez la voix pour entendre les alertes'
                        : 'Voice muted: unmute above to hear spoken alerts'}
                    </span>
                  </span>
                )}
              </div>
              {lastAlert && (
                <div
                  data-testid="ride-mode-last-alert"
                  className="text-xs sm:text-sm font-rounded font-semibold text-ink line-clamp-2"
                >
                  {lastAlert.spokenText}
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="ride-mode-test-alert-btn"
            onClick={handleSimulateAlert}
            className="min-h-[40px] px-4 rounded-full bg-pod hover:bg-chip border border-ink/10 dark:border-white/10 text-xs font-rounded font-semibold text-ink-secondary hover:text-ink inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-[0.98]"
          >
            <BellRing className="w-3.5 h-3.5 shrink-0 text-current" />
            <span>{t('rideModeTestAlertBtn')}</span>
          </Button>
        </footer>
      </div>
    </div>
  );
};
