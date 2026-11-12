import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Clock,
  ArrowUpRight,
  Wind,
  NavigationArrow,
  ThermometerSimple,
  CloudRain,
  CheckCircle,
  Warning,
  Bike,
  Zap,
  Calendar,
  ChevronDown,
  CaretDown,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes, getArchetypeFromTag } from '../../utils/archetypeChips';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { degreesToCompassCardinal } from '../../services/weatherService';
import { loadRiderBikeSpecs, getActiveBike, getEffectiveRiderSpecs } from '../../utils/specsStorage';
import { calculateRideVisibility } from '../../utils/solarVisibility';
import { calculateDynamicCarbTarget } from '../../utils/nutrition';
import { Collapsible } from '../common/Collapsible';
import { Badge } from '../common/Badge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

interface UpcomingTripCardProps {
  trip: TripProfile;
  allTrips: TripProfile[];
  onSelectTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onEditTrip?: (trip: TripProfile) => void;
  defaultExpanded?: boolean;
}

export function getTripDateDetails(trip: TripProfile, lang: 'en' | 'fr' = 'en') {
  const now = new Date();
  let departureDateStr = trip.departureDate;
  if (!departureDateStr && trip.stages && trip.stages.length > 0) {
    departureDateStr = trip.stages[0].departureDate;
  }

  let targetDate: Date;
  if (departureDateStr) {
    const timeStr = trip.departureTime || '08:00';
    targetDate = new Date(`${departureDateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`);
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
    }
  } else {
    // Default to tomorrow 08:00 if no date is set
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0);
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const formattedDate = targetDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  let countdownText = '';
  let countdownCode = '';
  let countdownVariant: 'yellow-vest' | 'emerald' | 'amber' | 'blue' | 'purple' | 'zinc' = 'yellow-vest';

  if (diffDays === 0) {
    countdownCode = 'TODAY';
    countdownText = lang === 'fr' ? 'Départ aujourd’hui' : 'Leave today';
    countdownVariant = 'yellow-vest';
  } else if (diffDays === 1) {
    countdownCode = 'TOMORROW';
    countdownText = lang === 'fr' ? 'Demain' : 'Tomorrow';
    countdownVariant = 'yellow-vest';
  } else if (diffDays > 1) {
    countdownCode = `IN ${diffDays}D`;
    countdownText = lang === 'fr' ? `Dans ${diffDays} j` : `In ${diffDays} days`;
    countdownVariant = diffDays <= 3 ? 'blue' : 'purple';
  } else {
    countdownCode = 'PAST';
    countdownText = lang === 'fr' ? `Passé (${Math.abs(diffDays)} j)` : `${Math.abs(diffDays)}d ago`;
    countdownVariant = 'zinc';
  }

  return {
    targetDate,
    diffDays,
    formattedDate,
    countdownText,
    countdownCode,
    countdownVariant,
    timeFormatted: trip.departureTime || '08:00',
  };
}

export const UpcomingTripCard: React.FC<UpcomingTripCardProps> = ({
  trip,
  allTrips,
  onSelectTrip,
  onLaunchDashboard,
  onEditTrip,
  defaultExpanded = true,
}) => {
  const { lang, t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cadence_upcoming_trip_expanded');
      return saved !== null ? saved === 'true' : defaultExpanded;
    } catch {
      return defaultExpanded;
    }
  });
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close switcher on click outside or Escape
  useEffect(() => {
    if (!isSwitcherOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSwitcherOpen]);

  const toggleExpanded = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    try {
      localStorage.setItem('cadence_upcoming_trip_expanded', String(nextState));
    } catch {
      // ignore
    }
  };

  const meta = getLocalizedTripMeta(trip, lang);
  const archetype = getArchetypeFromTag(trip.tag, trip.name);
  const dateInfo = useMemo(() => getTripDateDetails(trip, lang), [trip, lang]);

  // Active rider garage specs
  const specs = useMemo(() => loadRiderBikeSpecs(), []);
  const effectiveSpecs = useMemo(() => getEffectiveRiderSpecs(specs), [specs]);
  const activeBike = useMemo(() => getActiveBike(specs), [specs]);

  // Solved physics calculations
  const physicsResult = useMemo(
    () => calculatePhysics(trip.physics, trip.route, trip.weather, lang, specs?.ftpWatts),
    [trip.physics, trip.route, trip.weather, lang, specs?.ftpWatts]
  );

  const dynamicCarb = useMemo(() => {
    return calculateDynamicCarbTarget(
      physicsResult.movingTimeSeconds / 3600,
      physicsResult.ftpPercent,
      physicsResult.carbOxidationGramPerHour,
      effectiveSpecs.carbTargetGPerHr ?? 60,
      trip.stages?.length || 1,
      trip.customChips || []
    );
  }, [
    physicsResult.movingTimeSeconds,
    physicsResult.ftpPercent,
    physicsResult.carbOxidationGramPerHour,
    effectiveSpecs.carbTargetGPerHr,
    trip.stages?.length,
    trip.customChips,
  ]);

  // Solved reverse timeline
  const extraBufferMinutes = useMemo(() => getChipsExtraBufferMinutes(trip), [trip]);
  const timelineResult = useMemo(
    () =>
      calculateReverseTimeline(
        trip.route,
        trip.office,
        trip.weather,
        trip.tag,
        trip.route?.destination,
        lang,
        extraBufferMinutes,
        trip.customChips || [],
        {
          effectiveSpeedKmH: physicsResult.effectiveSpeedKmH,
          calmSpeedKmH: physicsResult.calmSpeedKmH,
          arriveAtMode: trip.arriveAtMode,
          departureTime: trip.departureTime,
          pinnedAmenities: trip.pinnedAmenities,
        }
      ),
    [trip, physicsResult, extraBufferMinutes, lang]
  );

  // Solar and visibility ephemeris
  const visibility = useMemo(() => {
    try {
      return calculateRideVisibility(trip);
    } catch {
      return null;
    }
  }, [trip]);

  // Pre-flight M-Check status
  const checkedChecklistCount = (trip.checklist || []).filter((c) => c.checked).length;
  const totalChecklistCount = Math.max(1, (trip.checklist || []).length);
  const activeCheckSegments = Math.round((checkedChecklistCount / totalChecklistCount) * 5);

  // Atmospheric constants & calculations
  const rhoNum = trip.weather.airDensityRho ?? trip.physics.rho ?? 1.225;
  const windDeg = Math.round(trip.weather.windDirectionDegrees ?? 245);
  const windCardinal = degreesToCompassCardinal(windDeg, lang);
  const peakGust = trip.weather.estuaryGustKmH || Math.round(trip.weather.baseWindSpeedKmH * 1.4);
  const aeroDeltaWatts = Math.max(1, Math.round(physicsResult.powerDeltaWatts));

  const isHighWind = physicsResult.goStatus === 'NO-GO';
  const isCaution = physicsResult.goStatus === 'CAUTION';

  // Archetype color styling
  const archetypeBadgeVariant =
    archetype === 'COMMUTE'
      ? 'yellow-vest'
      : archetype === 'SPORT'
      ? 'rose'
      : archetype === 'BIKEPACKING'
      ? 'emerald'
      : 'purple';

  return (
    <div
      className={`rounded-card bg-card p-4 sm:p-5 shadow-xs border border-ink/5 dark:border-white/5 transition-all ${
        isSwitcherOpen ? 'relative z-30' : 'relative z-10'
      }`}
    >
      {/* ── Top Header: Day Countdown, Next Trip Title, Controls & Collapse Button ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Prominent Day Countdown Badge (Uniform h-9 px-4 padding matching other chips) */}
            <div
              className={`h-9 px-4 rounded-full font-semibold text-xs tracking-wide tnum flex items-center gap-2 shadow-xs transition-all ${
                dateInfo.countdownVariant === 'yellow-vest'
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : dateInfo.countdownVariant === 'blue'
                  ? `${CHIP_TOKENS.blue.surface} ${CHIP_TOKENS.blue.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.blue.selectedRing}`
                  : dateInfo.countdownVariant === 'purple'
                  ? `${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing}`
                  : 'bg-pod text-ink-secondary'
              } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Calendar className="w-4 h-4 text-current shrink-0" />
              <span>{dateInfo.countdownText}</span>
            </div>

            <Badge variant={archetypeBadgeVariant} size="md" className="h-9 px-3.5 py-1.5 text-xs font-semibold">
              {trip.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : trip.tag}
            </Badge>

            {trip.stages && trip.stages.length > 1 && (
              <Badge variant="yellow-vest" size="md" className="h-9 px-3.5 py-1.5 text-xs font-semibold">
                {t('tourBadgeLabel', { count: trip.stages.length })}
              </Badge>
            )}

            {trip.route?.waypoints && trip.route.waypoints.length > 0 && (
              <Badge variant="sky" size="md" className="h-9 px-3.5 py-1.5 text-xs font-semibold">
                +{trip.route.waypoints.length} via
              </Badge>
            )}

            <Badge
              variant={
                physicsResult.goStatus === 'GO'
                  ? 'emerald'
                  : physicsResult.goStatus === 'CAUTION'
                  ? 'amber'
                  : 'rose'
              }
              size="sm"
              dot
              title={`${t('rideFeasibility')}: ${physicsResult.goStatus === 'GO' ? t('feasibilityOptimal') : physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')} — ${physicsResult.goStatusReason}`}
              className="h-9 px-3 text-xs font-semibold"
            >
              {physicsResult.goStatus === 'GO' ? t('feasibilityOptimal') : physicsResult.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}
            </Badge>

            {/* Profile Switcher dropdown if multiple profiles exist */}
            {allTrips.length > 1 && (
              <div
                ref={switcherRef}
                className={`relative inline-block text-left ${isSwitcherOpen ? 'z-40' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                  aria-expanded={isSwitcherOpen}
                  aria-haspopup="true"
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} hover:brightness-95 dark:hover:brightness-110 transition-all cursor-pointer`}
                  title={t('switchActiveProfile')}
                >
                  <span>{t('switchActiveProfile')}</span>
                  <CaretDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSwitcherOpen && (
                  <>
                    {/* Transparent Click-Away Overlay to dismiss dropdown */}
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      aria-hidden="true"
                      onClick={() => setIsSwitcherOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-card border border-ink/15 dark:border-white/15 shadow-xl py-1.5 z-40 animate-apple-popover">
                      <div className="px-3 py-1.5 text-[11px] font-medium text-ink-muted tracking-tight">
                        {t('switchActiveProfile')}
                      </div>
                      {allTrips.map((p) => {
                        const pMeta = getLocalizedTripMeta(p, lang);
                        const isCurrent = p.id === trip.id;
                        const pDate = getTripDateDetails(p, lang);
                        const pPhysics = calculatePhysics(p.physics, p.route, p.weather, lang, specs?.ftpWatts);
                        const pIsGo = pPhysics.goStatus === 'GO';
                        const pIsCaution = pPhysics.goStatus === 'CAUTION';
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectTrip(p.id);
                              setIsSwitcherOpen(false);
                            }}
                            title={`${pMeta.name} — ${pIsGo ? t('feasibilityOptimal') : pIsCaution ? t('feasibilityCaution') : t('feasibilitySevere')}: ${pPhysics.goStatusReason}`}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-pod transition-colors cursor-pointer ${
                              isCurrent ? 'font-semibold text-ink bg-pod/60' : 'text-ink-secondary'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-medium min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    pIsGo
                                      ? CHIP_TOKENS.emerald.dot
                                      : pIsCaution
                                      ? CHIP_TOKENS.amber.dot
                                      : CHIP_TOKENS.rose.dot
                                  }`}
                                />
                                <span className="break-words leading-tight">{pMeta.name}</span>
                              </div>
                              <span className="text-[10px] text-ink-muted">
                                <span className="font-semibold mr-1">
                                  {pIsGo ? t('feasibilityOptimal') : pIsCaution ? t('feasibilityCaution') : t('feasibilitySevere')}
                                </span>
                                · {pDate.formattedDate} · {p.route.distanceKm} km · {p.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : p.tag}
                              </span>
                            </div>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-volt shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title & Route summary with full untruncated trip name */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink leading-snug break-words">
              <span className="text-ink-secondary font-medium">{t('upcomingTripTitle')}: </span>
              <span className="font-semibold text-ink">{meta.name || t('defaultTripName')}</span>
            </h2>
            <span className="text-xs text-ink-muted leading-relaxed">
              {dateInfo.formattedDate} &middot; <strong className="text-ink font-semibold tnum">{timelineResult.hardDepartureTime}</strong> &middot;{' '}
              {trip.route.origin || (lang === 'fr' ? 'Départ' : 'Start')} &rarr;{' '}
              {trip.route.destination || (lang === 'fr' ? 'Arrivée' : 'Finish')} &middot;{' '}
              <strong className="text-ink font-semibold tnum">{trip.route.distanceKm} km</strong>
              {trip.route.elevationGainM ? ` · +${trip.route.elevationGainM} m` : ''}
            </span>
          </div>
        </div>

        {/* Readiness Badge, Edit, Ride Plan Launch CTA & Collapse Button */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {isHighWind ? (
            <Badge variant="rose" size="md" icon={Warning} className="py-2 px-3 text-xs" title={physicsResult.goStatusReason}>
              {t('statusNoGoGale')}
            </Badge>
          ) : isCaution ? (
            <Badge variant="amber" size="md" icon={Warning} className="py-2 px-3 text-xs" title={physicsResult.goStatusReason}>
              {t('statusCautionHeadwind')}
            </Badge>
          ) : (
            <Badge variant="emerald" size="md" icon={CheckCircle} className="py-2 px-3 text-xs" title={physicsResult.goStatusReason}>
              {t('statusGoOptimal')}
            </Badge>
          )}

          {onEditTrip && (
            <button
              type="button"
              onClick={() => onEditTrip(trip)}
              className="inline-flex items-center gap-1.5 min-h-[44px] h-10 px-4 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink font-medium text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <span>{lang === 'fr' ? 'Modifier' : 'Edit'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onLaunchDashboard(trip.id)}
            className={`flex items-center gap-1.5 min-h-[44px] h-10 px-5 rounded-full font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing} hover:brightness-95 dark:hover:brightness-110`}
          >
            <span>{t('launchCockpitBtn')}</span>
            <ArrowUpRight className="w-4 h-4 text-current stroke-[2.2]" />
          </button>

          {/* Collapsible Accordion Toggle */}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('collapseUpcomingCard') : t('expandUpcomingCard')}
            title={isExpanded ? t('collapseUpcomingCard') : t('expandUpcomingCard')}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 text-current transition-transform duration-300 ease-out ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Collapsible Body: 4 Concentric Bento Pods ── */}
      <Collapsible open={isExpanded} innerClassName="pt-4 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* POD 1: Schedule & Reverse Timeline */}
          <div className="bg-pod rounded-pod p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>
                  {t(
                    ({
                      COMMUTE: 'timelineScheduleCommute',
                      ESCAPADE: 'timelineScheduleEscapade',
                      BIKEPACKING: 'timelineScheduleBikepacking',
                      SPORT: 'timelineScheduleSport',
                    } as const)[archetype]
                  )}
                </span>
                <Clock className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.amber.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>

              <div className="mt-2.5">
                <span className="text-3xl font-semibold tracking-tight text-ink tnum leading-none block">
                  {timelineResult.hardDepartureTime}
                </span>
                <span className="text-[11px] font-medium text-ink-muted tracking-tight block mt-1">
                  {dateInfo.formattedDate} &middot; {t('hardRollout')}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between text-ink-secondary tnum">
                <span>{t('arrivalTimeLabel', { time: timelineResult.gateArrivalTime })}</span>
                <span className="font-semibold text-ink">{timelineResult.pureMovingMinutes} min</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted tnum">
                <span>{t('bufferPlus', { min: timelineResult.bufferMinutes })}</span>
                <span>{meta.gateName}</span>
              </div>
            </div>
          </div>

          {/* POD 2: Pacing & Metabolic Fueling (Guided vs Power mode) */}
          <div className="bg-pod rounded-pod p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>
                  {effectiveSpecs.cockpitViewMode === 'pro'
                    ? t('pacingAndWattsLabel')
                    : (lang === 'fr' ? 'Allure & Énergie' : 'Pace & Fueling')}
                </span>
                <Zap className={`w-4 h-4 shrink-0 ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>

              {effectiveSpecs.cockpitViewMode === 'pro' ? (
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-ink tnum leading-none">
                    {Math.round(physicsResult.legWatts)}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">W</span>
                  <Badge variant="zinc" size="sm" className="ml-auto tnum">
                    {effectiveSpecs.telemetryMode === 'quantitative'
                      ? `${physicsResult.powerZone} · ${physicsResult.wattsPerKg} W/kg`
                      : physicsResult.powerZone}
                  </Badge>
                </div>
              ) : (
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-ink tnum leading-none">
                    {trip.route.targetSpeedKmH}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">km/h</span>
                  <Badge variant="zinc" size="sm" className="ml-auto tnum">
                    ~{timelineResult.pureMovingMinutes} min
                  </Badge>
                </div>
              )}
            </div>

            <div className="mt-4 pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between text-ink-secondary tnum">
                {effectiveSpecs.cockpitViewMode === 'pro' ? (
                  <>
                    <span>{t('cruisingPaceLabel')}</span>
                    <span className="font-semibold text-ink">{trip.route.targetSpeedKmH} km/h</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'fr' ? 'Rythme prévu' : 'Effort feel'}</span>
                    <span className="font-semibold text-ink">
                      {physicsResult.powerZone === 'Z1' || physicsResult.powerZone === 'Z2'
                        ? (lang === 'fr' ? 'Endurance fluide' : 'Steady endurance')
                        : (lang === 'fr' ? 'Allure soutenue' : 'Brisk tempo')}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted tnum">
                {effectiveSpecs.cockpitViewMode === 'pro' && effectiveSpecs.telemetryMode === 'quantitative' ? (
                  <>
                    <span>{t('carbTargetBurn')}: ~{Math.round(physicsResult.carbOxidationGramPerHour)} g/h</span>
                    <span>~{Math.round(physicsResult.totalKcalBurn)} kcal</span>
                  </>
                ) : effectiveSpecs.telemetryMode === 'fuel-first' ? (
                  <>
                    <span>
                      {t('carbTargetBurn')}: ~{Math.max(1, Math.round(dynamicCarb.effectiveHourlyRateG / 20))}{' '}
                      {lang === 'fr' ? 'portions/h' : 'portions/h'}
                    </span>
                    <span>{t('steadyFuelingRhythm')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('guidancePhilosophyTitle')}</span>
                    <span>{t('intuitiveRhythmBadge')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* POD 3: Atmosphere & Wind (Calm vs Pro aero detail) */}
          <div className="bg-pod rounded-pod p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>{t('windAndAtmosphereLabel')}</span>
                <div className="flex items-center gap-1.5">
                  <NavigationArrow
                    className={`w-4 h-4 shrink-0 transform transition-transform ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                      trip.weather.isHeadwindActive ? CHIP_TOKENS.amber.primary : CHIP_TOKENS.emerald.primary
                    }`}
                    style={{ transform: `rotate(${windDeg - 45}deg)` }}
                  />
                  <Wind className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.sky.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-semibold tracking-tight text-ink tnum leading-none">
                  {trip.weather.baseWindSpeedKmH}
                </span>
                <span className="text-xs font-medium text-ink-muted">km/h</span>
                <span className="text-xs text-ink-secondary ml-auto tnum">
                  {windDeg}&deg; {windCardinal}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between text-ink-secondary tnum">
                <span>
                  {effectiveSpecs.cockpitViewMode === 'pro'
                    ? t('airTempDensityLabel')
                    : (lang === 'fr' ? 'Température' : 'Temperature')}
                </span>
                <span className="font-semibold text-ink">
                  {effectiveSpecs.cockpitViewMode === 'pro'
                    ? `${trip.weather.temperatureC}°C · ${rhoNum.toFixed(3)} kg/m³`
                    : `${trip.weather.temperatureC}°C`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted tnum">
                <span>{trip.weather.precipitationRiskPercent}% {t('riskUnit')}</span>
                <span className={trip.weather.isHeadwindActive ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                  {effectiveSpecs.cockpitViewMode === 'pro'
                    ? `+${aeroDeltaWatts} W ${lang === 'fr' ? 'aéro' : 'aero drag'}`
                    : trip.weather.isHeadwindActive
                    ? (lang === 'fr' ? 'Vent de face' : 'Headwind')
                    : (lang === 'fr' ? 'Vent favorable' : 'Calm / tailwind')}
                </span>
              </div>
            </div>
          </div>

          {/* POD 4: Bike & Safety Readiness */}
          <div className="bg-pod rounded-pod p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>
                  {effectiveSpecs.cockpitViewMode === 'pro'
                    ? t('pilotRigLabel')
                    : (lang === 'fr' ? 'Vélo & État' : 'Bike & Readiness')}
                </span>
                <Bike className={`w-4 h-4 shrink-0 ${CHIP_TOKENS.emerald.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
              </div>

              <div className="mt-2.5">
                <span className="text-base sm:text-[17px] font-semibold tracking-tight text-ink break-words block leading-snug">
                  {activeBike.name}
                </span>
                <div className="flex items-center gap-2 mt-1 text-xs text-ink-muted tnum flex-wrap">
                  {effectiveSpecs.cockpitViewMode === 'pro' && (
                    <>
                      <span>{physicsResult.systemMassKg.toFixed(1)} kg {lang === 'fr' ? 'total' : 'total'}</span>
                      <span>&middot;</span>
                    </>
                  )}
                  <span className="text-ink-secondary">
                    {activeBike.isTubeless
                      ? (lang === 'fr' ? 'Pneus tubeless' : 'Tubeless tires')
                      : (lang === 'fr' ? 'Pneus standard' : 'Standard tires')}
                  </span>
                </div>
              </div>
            </div>

          <div className="mt-4 pt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between text-ink-secondary">
              <span>
                {effectiveSpecs.cockpitViewMode === 'pro'
                  ? t('mCheckReadinessLabel')
                  : (lang === 'fr' ? 'Liste de contrôle' : 'Pre-ride checks')}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-3 rounded-full ${
                      idx < activeCheckSegments
                        ? CHIP_TOKENS.emerald.dot
                        : 'bg-chip'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted tnum gap-2 flex-wrap">
              <span>{t('readyCountLabel', { checked: checkedChecklistCount, total: totalChecklistCount })}</span>
              <span className="break-words">
                {visibility?.solar?.daylightHoursFormatted
                  ? `${visibility.solar.daylightHoursFormatted} ${lang === 'fr' ? 'de jour' : 'daylight'}`
                  : (lang === 'fr' ? 'Lumière favorable' : 'Good daylight')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Collapsible>
  </div>
);
};
