import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WarningCircle,
  CheckCircle,
  Warning,
  XCircle,
  ArrowsClockwise,
  Wind,
  SunHorizon,
  Sun,
  Moon,
  CloudFog,
  Flashlight,
  Bike,
  Flag,
  Gauge,
  Lightning,
  Shield,
  FaceSmile,
  CloudSun,
} from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { getKitRecommendation } from '../../utils/kitAdvisor';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import {
  fetchHourlyWeather,
  checkForecastHorizon,
  getLocalTodayIso,
  computeRouteBearing,
  degreesToCompassCardinal,
} from '../../services/weatherService';
import {
  calculateRideVisibility,
  getSolarElevation,
  minutesToHHMM,
  hhmmToMinutes,
  getApproxTimezoneOffset,
} from '../../utils/solarVisibility';
import { useTranslation } from '../../context/LanguageContext';

interface AtmosphereCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  onUpdateTrip: (updated: TripProfile) => void;
  hardRolloutTime?: string;
}

export const AtmosphereCard: React.FC<AtmosphereCardProps> = ({
  trip,
  physicsResult,
  onUpdateTrip,
  hardRolloutTime,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const [activeTab, setActiveTab] = useState<'wind' | 'visibility'>('wind');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  // Collapsed summary view by default when opening the Cockpit
  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(false);
  const [isKitOpen, setIsKitOpen] = useState<boolean>(false);
  const toggleCardExpanded = () => setIsCardExpanded((prev) => !prev);
  const toggleKitOpen = () => setIsKitOpen((prev) => !prev);

  // Measure stage width dynamically so SVG coordinates and CSS pixels align 1:1 without distortion
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState<number>(400);

  useEffect(() => {
    if (!stageRef.current) return;
    const updateWidth = () => {
      if (stageRef.current && stageRef.current.clientWidth > 0) {
        setStageWidth(stageRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [activeTab, isCardExpanded]);

  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const currentDateStr = trip.departureDate || getLocalTodayIso();
  const currentTimeStr = hardRolloutTime || trip.departureTime || trip.office.targetGateArrivalTime || '07:30';
  const horizon = checkForecastHorizon(currentDateStr);
  const isBeyondHorizon = trip.weather.isBeyondForecastWindow ?? !horizon.isAvailable;

  // Wind metrics
  const isHeadwind = trip.weather.isHeadwindActive;
  const windSpeed = trip.weather.baseWindSpeedKmH || 0;
  const windDegrees = Math.round(trip.weather.windDirectionDegrees || 245);
  const windCardinal = degreesToCompassCardinal(windDegrees, lang);
  const temperature = trip.weather.temperatureC ?? 11;
  const rho = Number((trip.weather.airDensityRho ?? trip.physics.rho ?? 1.225).toFixed(3));
  const maxGust = trip.weather.estuaryGustKmH || (isHeadwind ? Math.round(windSpeed * 1.5) : 4);

  const aeroPenalty = Math.round(physicsResult?.powerDeltaWatts || 0);
  const pacingMode = physicsResult?.pacingMode || (trip.route.pacingMode === 'effort' ? 'effort' : 'speed');
  const effectiveSpeed = physicsResult?.effectiveSpeedKmH ?? Math.max(5, trip.route.targetSpeedKmH || 25);
  const windDelayMin = physicsResult?.windDelayMinutes ?? 0;
  const cappedWatts = Math.round(physicsResult?.legWatts || 160);
  const powerZone = physicsResult?.powerZone || 'Z2';
  const goStatus = physicsResult?.goStatus || 'GO';
  const goReason = physicsResult?.goStatusReason || t('goReasonCalm');

  const handlePacingModeChange = (mode: 'speed' | 'effort') => {
    const defaultCapWatts =
      trip.route.targetEffortWatts && trip.route.targetEffortWatts > 0
        ? trip.route.targetEffortWatts
        : Math.max(85, Math.round(physicsResult?.baselineLegWatts || (physicsResult?.ftpWatts || 210) * 0.68));
    onUpdateTrip({
      ...trip,
      route: {
        ...trip.route,
        pacingMode: mode,
        targetEffortWatts: mode === 'effort' ? defaultCapWatts : trip.route.targetEffortWatts,
      },
    });
  };

  // Compute visibility analysis directly on planned trip schedule
  const visibilityAnalysis = useMemo(() => {
    return calculateRideVisibility(trip, currentDateStr, currentTimeStr, effectiveSpeed);
  }, [trip, currentDateStr, currentTimeStr, effectiveSpeed]);

  const kitAdvice = useMemo(() => {
    return getKitRecommendation(trip.weather, visibilityAnalysis.rolloutPhase, lang);
  }, [trip.weather, visibilityAnalysis.rolloutPhase, lang]);

  const formattedSchedule = (() => {
    try {
      const [year, month, day] = currentDateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const dayPart = d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `${dayPart} · ${currentTimeStr}`;
    } catch {
      return `${currentDateStr} · ${currentTimeStr}`;
    }
  })();

  const handleWindSpeedChange = (newSpeed: number) => {
    setIsManualOverride(true);
    onUpdateTrip({
      ...trip,
      weather: {
        ...trip.weather,
        source: 'simulated',
        effectiveHeadwindKmH: undefined,
        windDirection: newSpeed > 0 ? 'headwind' : 'calm',
        isHeadwindActive: newSpeed > 0,
        baseWindSpeedKmH: newSpeed,
        estuaryGustKmH: newSpeed > 0 ? Math.round(newSpeed * 1.5) : 4,
      },
    });
  };

  const handleSyncForecast = async () => {
    setIsSyncing(true);
    setIsManualOverride(false);
    try {
      const coords =
        trip.route.coordinates?.[Math.floor((trip.route.coordinates?.length || 1) / 2)] || [47.25, -1.88];
      const bearing = computeRouteBearing(trip.route.coordinates);
      const live = await fetchHourlyWeather(coords[0], coords[1], currentDateStr, currentTimeStr, bearing);

      onUpdateTrip({
        ...trip,
        weather: {
          ...trip.weather,
          source: live.source,
          temperatureC: live.temperatureC,
          baseWindSpeedKmH: live.windSpeedKmH,
          effectiveHeadwindKmH: live.effectiveHeadwindKmH,
          windDirectionDegrees: live.windDirectionDegrees,
          windDirection:
            live.effectiveHeadwindKmH > 2
              ? 'headwind'
              : live.effectiveHeadwindKmH < -2
              ? 'tailwind'
              : 'calm',
          estuaryGustKmH: live.windGustsKmH,
          airDensityRho: live.airDensityRho,
          isHeadwindActive: live.effectiveHeadwindKmH > 2,
          isBeyondForecastWindow: live.isBeyondForecastWindow,
          targetTimestampFormatted: live.timestamp,
          visibilityKm: live.visibilityKm,
          weatherCode: live.weatherCode,
          isDay: live.isDay,
          sunrise: live.sunriseIso,
          sunset: live.sunsetIso,
        },
        physics: {
          ...trip.physics,
          rho: live.airDensityRho,
        },
      });
    } catch (e) {
      console.error('Weather re-sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fillPercent = Math.min(100, Math.max(0, (windSpeed / 45) * 100));
  const activeBarColor = windSpeed >= 30 ? '#FF3B30' : isDarkMode ? '#F2F455' : '#111111';
  const trackEmptyColor = isDarkMode ? '#2D2D34' : '#EBE9E3';

  // ── PRECISE SOLAR ELEVATION & VISUAL CORRIDOR CALCULATIONS ──
  const coords: [number, number] = trip.route.coordinates?.[0] || [47.2184, -1.5536];
  const lat = coords[0];
  const lon = coords[1];
  const tz = getApproxTimezoneOffset(currentDateStr, lon);

  // Time corridor: 05:00 (300m) to 21:00 (1260m) = 960 minutes
  const dayStartMin = 5 * 60; // 05:00
  const dayEndMin = 21 * 60;   // 21:00
  const totalDayMin = dayEndMin - dayStartMin; // 960 min

  const gfxH = 170; // Height of the graphics stage
  const progressBarY = gfxH - 44; // 126px, placing the 44px progress bar flush at the bottom of the graphics stage
  const horizonY = 108; // 0° Horizon line
  const apexY = 16;     // Solar curve apex reaches near top inner margin bound
  const nadirY = 132;   // Night solar elevation baseline

  const svgW = Math.max(180, stageWidth || 280);
  const svgH = gfxH;

  // Smooth cubic Bezier spline builder from points (Catmull-Rom formulation)
  const bezierSplineFromPoints = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom to Cubic Bezier control points (tension = 0.5)
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  // Solar coordinates solver with smooth continuous transition into night
  const getCurveYAtMinute = (min: number): number => {
    const clamped = Math.max(dayStartMin, Math.min(dayEndMin, min));
    const timeStr = minutesToHHMM(clamped);
    const elev = getSolarElevation(lat, lon, currentDateStr, timeStr, tz);
    const maxElev = Math.max(20, visibilityAnalysis.solar.maxSolarElevationDeg);
    if (elev >= 0) {
      return horizonY - (elev / maxElev) * (horizonY - apexY);
    } else {
      const norm = Math.abs(elev) / 18;
      return horizonY + Math.tanh(norm) * (nadirY - horizonY);
    }
  };

  const getCurveYAtX = (x: number): number => {
    const min = dayStartMin + (x / svgW) * totalDayMin;
    return getCurveYAtMinute(min);
  };

  // 1. Full day solar trajectory path: Flowing cubic Bezier curve (fills card from x = 0 to x = svgW)
  const numCurveSamples = 14;
  const curvePts: { x: number; y: number }[] = [];
  for (let i = 0; i <= numCurveSamples; i++) {
    const x = (i / numCurveSamples) * svgW;
    curvePts.push({ x, y: getCurveYAtX(x) });
  }
  const curvePathD = bezierSplineFromPoints(curvePts);

  // Timestamps in minutes
  const rolloutMin = hhmmToMinutes(visibilityAnalysis.rolloutTime);
  const arrivalMin = (rolloutMin + visibilityAnalysis.movingMinutes) % 1440;

  // Percentage mapping across card width (comfortably padded to prevent badge & timestamp clipping on narrow phones)
  const minEdgeMarginPercent = Math.max(10, (24 / svgW) * 100);
  const leftMarginPercent = minEdgeMarginPercent;
  const rightMarginPercent = 100 - minEdgeMarginPercent;
  const effectiveSpan = Math.max(20, rightMarginPercent - leftMarginPercent);

  const rawStartFrac = (rolloutMin - dayStartMin) / totalDayMin;
  const rawEndFrac = (arrivalMin - dayStartMin) / totalDayMin;

  let startPercent = leftMarginPercent + Math.max(0, Math.min(1, rawStartFrac)) * effectiveSpan;
  let endPercent = leftMarginPercent + Math.max(0, Math.min(1, rawEndFrac)) * effectiveSpan;

  // Ensure minimum visual badge gap so cyclist and flag never collide (52px minimum center-to-center)
  const minBadgeGapPercent = Math.max(14, (52 / svgW) * 100);
  if (endPercent - startPercent < minBadgeGapPercent) {
    if (startPercent + minBadgeGapPercent <= rightMarginPercent) {
      endPercent = startPercent + minBadgeGapPercent;
    } else {
      startPercent = Math.max(leftMarginPercent, rightMarginPercent - minBadgeGapPercent);
      endPercent = rightMarginPercent;
    }
  }

  // Exact coordinates for badge centers (in 1:1 pixel space)
  const startDotX = (startPercent / 100) * svgW;
  const endDotX = (endPercent / 100) * svgW;

  // Exact boundaries of the progress bar linking rectangle (22px radius from badge centers)
  const barLeftX = Math.max(0, startDotX - 22);
  const barRightX = Math.min(svgW, endDotX + 22);

  // 2. Flat light grey bike duration area path:
  // Top edge: flowing cubic Bezier curve following the sun path between barLeftX and barRightX
  // Bottom edge: clipped directly by the top perimeter of the progress bar
  const numDurationSamples = 8;
  const durationPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= numDurationSamples; i++) {
    const x = barLeftX + (i / numDurationSamples) * (barRightX - barLeftX);
    durationPts.push({ x, y: getCurveYAtX(x) });
  }

  let bikeDurationPathD = bezierSplineFromPoints(durationPts);
  // Right vertical line drops down to right cap of progress bar:
  bikeDurationPathD += ` L ${barRightX.toFixed(2)} ${(progressBarY + 22).toFixed(2)}`;
  // Top arc of right circular cap:
  bikeDurationPathD += ` A 22 22 0 0 0 ${(barRightX - 22).toFixed(2)} ${progressBarY.toFixed(2)}`;
  // Flat top edge of progress bar:
  bikeDurationPathD += ` L ${(barLeftX + 22).toFixed(2)} ${progressBarY.toFixed(2)}`;
  // Top arc of left circular cap:
  bikeDurationPathD += ` A 22 22 0 0 0 ${barLeftX.toFixed(2)} ${(progressBarY + 22).toFixed(2)}`;
  // Close back to top-left start:
  bikeDurationPathD += ' Z';

  const isCriticalOptical = visibilityAnalysis.opticalHazardLevel === 'critical';

  const phaseLabel = (() => {
    switch (visibilityAnalysis.rolloutPhase) {
      case 'deep-night':
        return t('phaseDeepNight');
      case 'nautical-twilight':
        return t('phaseNauticalTwilight');
      case 'civil-twilight':
        return t('phaseCivilTwilight');
      case 'golden-hour':
        return t('phaseGoldenHour');
      case 'daylight':
        return t('phaseDaylight');
      default:
        return t('phaseDaylight');
    }
  })();

  return (
    <div className="rounded-card bg-card text-ink p-4 flex flex-col justify-between transition-colors">
      {/* ── 1. HEADER (TITLE, SUBTITLE, SYNC + COLLAPSE BUTTONS) ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-[17px] font-semibold font-rounded tracking-tight text-ink">
              {t('weatherCardTitle')}
            </h2>

            {isManualOverride ? (
              <Badge variant="zinc" size="sm" dot>
                {t('badgeManual')}
              </Badge>
            ) : isBeyondHorizon ? (
              <Badge variant="amber" size="sm" dot>
                {t('badgeBaseline')}
              </Badge>
            ) : (
              <Badge variant="emerald" size="sm" icon={CloudSun}>
                {t('badgeLive')}
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {formattedSchedule} &middot;{' '}
            {isManualOverride
              ? t('subSimulatedOverride')
              : isBeyondHorizon
              ? t('subSeasonalModel')
              : t('subOpenMeteoSync')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSyncForecast}
            disabled={isSyncing}
            title={t('syncForecastTitle')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:brightness-[0.97] dark:hover:brightness-110 transition-all cursor-pointer select-none disabled:opacity-50 ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <ArrowsClockwise className={`w-4 h-4 text-current ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? t('syncingBtn') : t('syncBtn')}</span>
          </button>

          <button
            type="button"
            onClick={toggleCardExpanded}
            aria-expanded={isCardExpanded}
            aria-label={isCardExpanded ? t('bannerHide') : t('bannerDetails')}
            className="rounded-full bg-pod hover:bg-chip p-0.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
          >
            <DisclosureChevron open={isCardExpanded} />
          </button>
        </div>
      </div>

      {/* Compact Collapsed Summary Strip */}
      <Collapsible open={!isCardExpanded} innerClassName="pt-3">
        <button
          type="button"
          onClick={toggleCardExpanded}
          className="w-full p-2.5 px-3 rounded-pod bg-pod hover:bg-chip/60 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap tnum text-xs">
            <Badge
              variant={
                goStatus === 'GO' ? 'emerald' : goStatus === 'CAUTION' ? 'yellow-vest' : 'rose'
              }
              size="xs"
              dot
            >
              {goStatus}
            </Badge>
            <span className="font-semibold text-ink">{temperature}&deg;C</span>
            <span className="text-ink-muted">&middot;</span>
            <span className="font-mono text-ink-secondary">
              {windSpeed} km/h {windCardinal}
            </span>
            <span className="text-ink-muted hidden min-[400px]:inline">&middot;</span>
            <Badge variant={kitAdvice.tierTheme} size="xs" className="hidden min-[400px]:inline-flex">
              {kitAdvice.tierBadge}
            </Badge>
          </div>
          <span className="text-xs font-rounded font-semibold text-ink-secondary shrink-0">
            {t('bannerDetails')}
          </span>
        </button>
      </Collapsible>

      <Collapsible open={isCardExpanded} innerClassName="pt-3">
      {/* ── 2. ELEGANT CONCENTRIC TAB SWITCHER: [ WIND & AERO ] / [ LIGHT & VISIBILITY ] ── */}
      <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-2xl sm:rounded-full bg-pod mb-4 w-full sm:w-auto self-stretch sm:self-start">
        <button
          type="button"
          onClick={() => setActiveTab('wind')}
          className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            activeTab === 'wind'
              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
              : `${CHIP_RING_UNSELECTED} text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200`
          }`}
        >
          <Wind className="w-4 h-4 shrink-0 text-current" />
          <span className="truncate">{t('weatherTabWind')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('visibility')}
          className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            activeTab === 'visibility'
              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
              : `${CHIP_RING_UNSELECTED} text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200`
          }`}
        >
          <SunHorizon className="w-4 h-4 shrink-0 text-current" />
          <span className="truncate">{t('weatherTabVisibility')}</span>
          {isCriticalOptical && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-beacon-pulse ${CHIP_TOKENS.rose.dot}`} />
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          TAB 1: WIND CONDITIONS & HEADWIND MODELING
         ════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'wind' && (
        <div className="animate-apple-step-in flex flex-col justify-between">
          {/* Status Chain-Link Capsule Callout */}
          <div className="flex items-start sm:items-center gap-3 pl-3 pr-4 sm:pr-5 py-3 sm:py-2.5 rounded-2xl sm:rounded-full bg-pod mb-3">
            <IconBadge
              theme={
                goStatus === 'GO'
                  ? 'emerald'
                  : goStatus === 'CAUTION'
                  ? 'yellow-vest'
                  : 'rose'
              }
              icon={
                goStatus === 'GO'
                  ? CheckCircle
                  : goStatus === 'CAUTION'
                  ? Warning
                  : XCircle
              }
              size="spine"
              isSelected
              solidBacker
              className="w-9 h-9 sm:w-9 sm:h-9 shrink-0 mt-0.5 sm:mt-0"
            />

            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink leading-tight">
                {goStatus === 'GO'
                  ? t('clearanceGo')
                  : goStatus === 'CAUTION'
                  ? t('clearanceCaution')
                  : t('clearanceNoGo')}
              </div>
              <p className="text-xs text-ink-secondary leading-snug mt-0.5">
                {goReason}
              </p>
            </div>
          </div>

          {/* Warm Pre-Ride Reassurance & Stress-Reducing Coach Note (Arthur Notes 8 & 9) */}
          {goStatus !== 'NO-GO' && (
            <div className="rounded-pod bg-pod/80 px-3.5 py-2.5 mb-4 border border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <FaceSmile
                  className={`w-4 h-4 shrink-0 mt-0.5 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                />
                <p className="text-xs text-ink-secondary leading-relaxed">
                  {!isHeadwind || windSpeed < 8
                    ? t('weatherReassuranceCalm')
                    : windSpeed < 16
                    ? t('weatherReassuranceBreeze')
                    : pacingMode === 'effort'
                    ? t('weatherReassuranceHeadwindEffort', {
                        watts: cappedWatts,
                        zone: powerZone,
                      })
                    : t('weatherReassuranceHeadwindSpeed')}
                </p>
              </div>
              {isHeadwind && windSpeed >= 12 && pacingMode === 'speed' && (
                <button
                  type="button"
                  onClick={() => handlePacingModeChange('effort')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`}
                >
                  {t('weatherSwitchToEffortCapBtn')}
                </button>
              )}
            </div>
          )}

          {/* Road Compass Instrument Pod */}
          <div className="rounded-pod bg-pod p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 mb-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-ink/15 dark:border-white/15 bg-card flex items-center justify-center shrink-0">
              <span className="absolute top-1.5 text-[10px] font-semibold text-ink-muted">N</span>
              <span className="absolute bottom-1.5 text-[10px] font-semibold text-ink-muted">S</span>
              <span className="absolute left-2 text-[10px] font-semibold text-ink-muted">{t('compassWest')}</span>
              <span className="absolute right-2 text-[10px] font-semibold text-ink-muted">E</span>

              <div
                className="transition-transform duration-500 ease-out flex items-center justify-center"
                style={{ transform: `rotate(${windDegrees}deg)` }}
              >
                <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-8 sm:h-8" fill="none">
                  <path
                    d="M 20 7 L 30 30 L 20 24.5 L 10 30 Z"
                    fill="none"
                    stroke={
                      windSpeed >= 30
                        ? '#F43F5E'
                        : isHeadwind
                        ? (isDarkMode ? '#FBBF24' : '#92400E')
                        : (isDarkMode ? '#DFFF00' : '#4D5200')
                    }
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-ink-muted block">
                {t('corridorWindVector')}
              </span>
              <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                <span className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight tnum font-sans">
                  {windSpeed} km/h
                </span>
                <span className="text-xs text-ink-muted tnum">
                  {windDegrees}&deg; {windCardinal} &middot; {t('corridorDir')}
                </span>
              </div>

              {isHeadwind ? (
                pacingMode === 'effort' ? (
                  <Badge variant="emerald" size="md" icon={Lightning} className="mt-2.5 tnum">
                    {t('dragHoldEffortPill', {
                      watts: cappedWatts,
                      zone: powerZone,
                      speed: effectiveSpeed,
                      min: windDelayMin,
                    })}
                  </Badge>
                ) : (
                  <Badge variant="amber" size="md" icon={WarningCircle} className="mt-2.5 tnum">
                    {t('dragHoldSpeedPill', {
                      watts: aeroPenalty,
                      speed: effectiveSpeed,
                    })}
                  </Badge>
                )
              ) : (
                <Badge variant="emerald" size="md" icon={CheckCircle} className="mt-2.5 tnum">
                  {t('zeroPenaltyPill')}
                </Badge>
              )}
            </div>
          </div>

          {/* Pacing Strategy Toggle: Hold Speed vs Hold Effort (Cap Watts) */}
          <div className="rounded-pod bg-pod p-2.5 mb-4">
            <div className="flex items-center justify-between gap-2 px-1 mb-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                {t('pacingModeLabel')}
              </span>
              <span className="text-[11px] font-medium text-ink-secondary tnum truncate">
                {pacingMode === 'effort'
                  ? `${cappedWatts}W (${powerZone}) → ${effectiveSpeed} km/h`
                  : `${effectiveSpeed} km/h → ${cappedWatts}W (${powerZone})`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handlePacingModeChange('speed')}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  pacingMode === 'speed'
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                }`}
              >
                <Gauge className="w-3.5 h-3.5 shrink-0 text-current" />
                <span className="truncate">{t('pacingHoldSpeed')}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePacingModeChange('effort')}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  pacingMode === 'effort'
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                }`}
              >
                <Lightning className="w-3.5 h-3.5 shrink-0 text-current" />
                <span className="truncate">{t('pacingHoldEffort')}</span>
              </button>
            </div>
          </div>

          {/* Metric Pods */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-4">
            <div className="px-3.5 py-2.5 sm:p-3 rounded-pod bg-pod flex items-center justify-between gap-3 sm:block">
              <span className="text-[11px] font-medium text-ink-muted sm:block sm:truncate">
                {t('airTempDensityLabel')}
              </span>
              <div className="text-sm font-semibold text-ink sm:mt-0.5 tnum shrink-0 sm:truncate">
                {temperature}&deg;C <span className="text-[10px] font-normal text-ink-muted">({rho})</span>
              </div>
            </div>

            <div className="px-3.5 py-2.5 sm:p-3 rounded-pod bg-pod flex items-center justify-between gap-3 sm:block">
              <span className="text-[11px] font-medium text-ink-muted sm:block sm:truncate">
                {t('maxGustEnvelope')}
              </span>
              <div className="text-sm font-semibold text-ink sm:mt-0.5 tnum shrink-0 sm:truncate">
                {maxGust} km/h
              </div>
            </div>

            <div className="px-3.5 py-2.5 sm:p-3 rounded-pod bg-pod flex items-center justify-between gap-3 sm:block">
              <span className="text-[11px] font-medium text-ink-muted sm:block sm:truncate">
                {t('metricVisRange')}
              </span>
              <div className="text-sm font-semibold text-ink sm:mt-0.5 tnum shrink-0 sm:truncate">
                {trip.weather.visibilityKm ?? 15} km
              </div>
            </div>
          </div>

          {/* Full-Radius Wind Simulation Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2.5">
              <span className="text-ink-secondary font-medium">{t('windSimulationLabel')}</span>
              <span className="px-3 py-0.5 rounded-full bg-pod font-semibold text-ink tnum">
                {windSpeed} km/h
              </span>
            </div>

            <div className="relative py-1 flex items-center">
              <input
                type="range"
                aria-label={t('manualWindSimAria')}
                min="0"
                max="45"
                step="1"
                value={windSpeed}
                onChange={(e) => handleWindSpeedChange(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, ${activeBarColor} 0%, ${activeBarColor} ${fillPercent}%, ${trackEmptyColor} ${fillPercent}%, ${trackEmptyColor} 100%)`,
                }}
                className="w-full peloton-slider focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mt-3">
              <button
                type="button"
                onClick={() => handleWindSpeedChange(0)}
                className={`py-1.5 px-3 rounded-full transition-all cursor-pointer font-semibold tnum ${CHIP_RING_BASE} ${
                  windSpeed === 0
                    ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip text-ink-secondary`
                }`}
              >
                {t('presetCalm')}
              </button>
              <button
                type="button"
                onClick={() => handleWindSpeedChange(15)}
                className={`py-1.5 px-3 rounded-full transition-all cursor-pointer font-semibold tnum ${CHIP_RING_BASE} ${
                  windSpeed === 15
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip text-ink-secondary`
                }`}
              >
                {t('presetModerate')}
              </button>
              <button
                type="button"
                onClick={() => handleWindSpeedChange(35)}
                className={`py-1.5 px-3 rounded-full transition-all cursor-pointer font-semibold tnum ${CHIP_RING_BASE} ${
                  windSpeed >= 35
                    ? `${CHIP_TOKENS.rose.surface} ${CHIP_TOKENS.rose.primary} ${CHIP_TOKENS.rose.selectedRing}`
                    : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip text-ink-secondary`
                }`}
              >
                {t('presetGale')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════
          TAB 2: SOLAR ELEVATION & VISIBILITY DIRECTIVES (EXACT MOCKUP IMPLEMENTATION)
         ════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'visibility' && (
        <div className="animate-apple-step-in flex flex-col justify-between">
          {/* Section Header: Keyline Duotone Sun + Title */}
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <Sun className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
            <h3 className="text-sm font-semibold tracking-tight text-ink">
              {t('solarElevationDuringRide')}
            </h3>
          </div>

          {/* ── THE SOLAR ELEVATION CARD (FLAT DESIGN, 15PX INNER MARGINS, 8PX GRAPHICS-TO-TIMESTAMP GAP) ── */}
          <div className="rounded-pod bg-card border border-ink/10 dark:border-white/10 p-[15px] mb-3.5 relative overflow-hidden transition-colors">
            {/* 1. Main Graphics Stage: Fills width and height up to inner margins bounds */}
            <div ref={stageRef} className="w-full relative h-[170px] select-none">
              <svg
                viewBox={`0 0 ${svgW} ${gfxH}`}
                preserveAspectRatio="none"
                className="w-full h-full absolute inset-0 overflow-hidden pointer-events-none"
              >
                <defs>
                  {/* Smooth multi-stop curve gradient: Slate -> Mint -> Warm Yellow -> Mint -> Slate */}
                  <linearGradient id="userSolarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="18%" stopColor="#94A3B8" />
                    <stop offset="32%" stopColor="#A5DCD0" />
                    <stop offset="50%" stopColor="#FEF08A" />
                    <stop offset="68%" stopColor="#A5DCD0" />
                    <stop offset="82%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>

                </defs>

                {/* Subtle horizontal 0° Horizon Line spanning full inner bounds from x=0 to x=svgW */}
                <line
                  x1="0"
                  y1={horizonY}
                  x2={svgW}
                  y2={horizonY}
                  stroke={isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'}
                  strokeWidth="1.2"
                />

                {/* 1. Area Covering Bike Duration: Flat Light Grey, flowing Bezier top, clipped by progress bar at bottom */}
                <path
                  d={bikeDurationPathD}
                  fill={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}
                />

                {/* 2. The Solar Path Trajectory Curve spanning full inner bounds */}
                <path
                  d={curvePathD}
                  fill="none"
                  stroke="url(#userSolarGradient)"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />

                {/* 3. The Two Points: Situated at the intersection of the solar path curve and the area covering the bike duration (light grey) */}
                <circle
                  cx={barLeftX}
                  cy={getCurveYAtX(barLeftX)}
                  r="5"
                  fill="#8EA5C8"
                  stroke={isDarkMode ? '#1E1E24' : '#FFFFFF'}
                  strokeWidth="1.5"
                />

                <circle
                  cx={barRightX}
                  cy={getCurveYAtX(barRightX)}
                  r="5"
                  fill="#E4EB9E"
                  stroke={isDarkMode ? '#1E1E24' : '#FFFFFF'}
                  strokeWidth="1.5"
                />

                {/* 4. The Progress Bar / Rectangle Linking the Two Icons (In SVG for 100% boundary alignment) */}
                <rect
                  x={barLeftX}
                  y={progressBarY}
                  width={Math.max(44, barRightX - barLeftX)}
                  height={44}
                  rx={22}
                  fill={isDarkMode ? 'rgba(254, 240, 138, 0.25)' : 'rgba(254, 240, 138, 0.55)'}
                />
              </svg>

              {/* ── 5. START ROLLOUT BADGE (CYCLIST - LAYERED YELLOW-VEST TOKEN) ── */}
              <IconBadge
                theme="yellow-vest"
                icon={Bike}
                size="xl"
                isSelected
                solidBacker
                style={{ left: `${barLeftX}px`, top: `${progressBarY}px` }}
                className="absolute w-11 h-11 sm:w-11 sm:h-11 z-10"
                iconClassName="w-6 h-6 sm:w-6 sm:h-6"
              />

              {/* ── 6. ARRIVAL FINISH BADGE (FLAG - LAYERED ORANGE TOKEN) ── */}
              <IconBadge
                theme="orange"
                icon={Flag}
                size="xl"
                isSelected
                solidBacker
                style={{ left: `${barRightX - 44}px`, top: `${progressBarY}px` }}
                className="absolute w-11 h-11 sm:w-11 sm:h-11 z-10"
                iconClassName="w-6 h-6 sm:w-6 sm:h-6"
              />
            </div>

            {/* ── 7. TIMESTAMPS ROW (EXACT 8PX GAP FROM GRAPHICS, REACHING BOTTOM INNER BOUND) ── */}
            <div className="relative w-full mt-[8px] h-[16px] select-none">
              <div
                style={{ left: `${startDotX}px` }}
                className="absolute -translate-x-1/2 pointer-events-none"
              >
                <span className="text-[14px] sm:text-[15px] font-extrabold font-sans text-ink tnum tracking-tight block text-center whitespace-nowrap leading-none">
                  {visibilityAnalysis.rolloutTime}
                </span>
              </div>

              <div
                style={{ left: `${endDotX}px` }}
                className="absolute -translate-x-1/2 pointer-events-none"
              >
                <span className="text-[14px] sm:text-[15px] font-extrabold font-sans text-ink tnum tracking-tight block text-center whitespace-nowrap leading-none">
                  {visibilityAnalysis.arrivalTime}
                </span>
              </div>
            </div>
          </div>

          {/* ── 3. ESSENTIAL METRICS IN MEDIUM-LARGE ROUND TYPEFACE ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-3.5">
            {/* 1. Required Lumens (clean, non-truncating text) */}
            <div className="p-3 rounded-pod bg-pod flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-3 sm:gap-0">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider sm:block sm:truncate">
                {t('visibilityMetricLighting')}
              </span>
              <div className="text-right sm:text-left sm:mt-1 min-w-0">
                <div className={`text-base sm:text-xl font-bold font-sans tracking-tight tnum sm:truncate whitespace-nowrap ${CHIP_TOKENS['yellow-vest'].primary}`}>
                  {visibilityAnalysis.lightingGear.recommendedLumens}
                </div>
                <div className="text-[11px] text-ink-secondary mt-0.5 truncate font-medium">
                  {isFr
                    ? visibilityAnalysis.lightingGear.beamModeFr.split('(')[0].trim()
                    : visibilityAnalysis.lightingGear.beamModeEn.split('(')[0].trim()}
                </div>
              </div>
            </div>

            {/* 2. Ambient Phase & Sun Elevation */}
            <div className="p-3 rounded-pod bg-pod flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-3 sm:gap-0">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider sm:block sm:truncate">
                {t('visibilityMetricPhase')}
              </span>
              <div className="text-right sm:text-left sm:mt-1 min-w-0">
                <div className="text-base sm:text-lg font-bold font-sans tracking-tight text-ink flex items-center justify-end sm:justify-start gap-1.5 min-w-0">
                  {visibilityAnalysis.rolloutElevationDeg < -6 ? (
                    <Moon className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.purple.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  ) : visibilityAnalysis.rolloutElevationDeg < 0 ? (
                    <SunHorizon className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.orange.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  ) : (
                    <Sun className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                  )}
                  <span className="truncate">{phaseLabel}</span>
                </div>
                <div className="text-[11px] text-ink-secondary mt-0.5 truncate font-medium tnum">
                  {visibilityAnalysis.rolloutElevationDeg > 0 ? '+' : ''}
                  {visibilityAnalysis.rolloutElevationDeg}&deg; {t('solarElevShort')}
                </div>
              </div>
            </div>

            {/* 3. Meteorological Clarity */}
            <div className="p-3 rounded-pod bg-pod flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-3 sm:gap-0">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider sm:block sm:truncate">
                {t('visibilityMetricClarity')}
              </span>
              <div className="text-right sm:text-left sm:mt-1 min-w-0">
                <div className="text-lg sm:text-2xl font-bold font-sans tracking-tight text-ink tnum sm:truncate">
                  {visibilityAnalysis.visibilityKm} km
                </div>
                <div className="text-[11px] text-ink-secondary mt-0.5 truncate font-medium">
                  {isFr ? visibilityAnalysis.weatherDescFr : visibilityAnalysis.weatherDescEn}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. SUMMARIZED RECOMMENDATION UNDERNEATH ── */}
          <div className="p-3.5 rounded-pod bg-pod flex items-start gap-3 transition-colors">
            <IconBadge
              theme="yellow-vest"
              icon={Flashlight}
              size="md"
              solidBacker
              className="mt-0.5"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-ink tracking-tight uppercase">
                  {t('visibilityRecommendationTitle')}
                </h4>
                <Badge variant="yellow-vest" size="xs" className="font-mono font-bold shrink-0">
                  {visibilityAnalysis.lightingGear.recommendedLumens}
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed mt-1">
                {isFr ? visibilityAnalysis.summaryRecommendationFr : visibilityAnalysis.summaryRecommendationEn}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. WEATHER-DRIVEN KIT & LAYERING DIRECTIVE (COLLAPSIBLE POD) ── */}
      <div className="mt-4 pt-3.5 border-t border-dashed border-ink/10 dark:border-white/10">
        <div className="rounded-pod bg-pod overflow-hidden">
          <button
            type="button"
            onClick={toggleKitOpen}
            aria-expanded={isKitOpen}
            className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2 hover:bg-chip/60 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
          >
            <div className="flex items-center gap-2 min-w-0">
              <IconBadge theme={kitAdvice.tierTheme} icon={Shield} size="sm" solidBacker />
              <span className="text-xs font-bold font-rounded text-ink tracking-tight truncate">
                {t('kitDirectiveTitle')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={kitAdvice.tierTheme} size="xs" className="tnum">
                {kitAdvice.tierBadge}
              </Badge>
              <span className="text-[11px] font-semibold text-ink-muted tnum hidden min-[380px]:inline">
                {t('kitFeelsLike', { temp: kitAdvice.feelsLikeC })}
              </span>
              <DisclosureChevron open={isKitOpen} />
            </div>
          </button>

          <Collapsible
            open={isKitOpen}
            innerClassName="px-3.5 pb-3.5 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 text-xs space-y-1.5"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted w-20 shrink-0">
                {t('kitUpperShort')}
              </span>
              <span className="text-ink font-medium leading-snug">{kitAdvice.upperBody}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted w-20 shrink-0">
                {t('kitLowerShort')}
              </span>
              <span className="text-ink-secondary leading-snug">{kitAdvice.lowerAndExtremities}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted w-20 shrink-0">
                {t('kitOpticsShort')}
              </span>
              <span className="text-ink-secondary leading-snug">{kitAdvice.opticsAndShield}</span>
            </div>
          </Collapsible>
        </div>
      </div>
      </Collapsible>
    </div>
  );
};
