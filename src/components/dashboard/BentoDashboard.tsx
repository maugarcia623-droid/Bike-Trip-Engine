import React from 'react';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes } from '../../utils/archetypeChips';
import { HeroRouteCard } from './HeroRouteCard';
import { AtmosphereCard } from './AtmosphereCard';
import { PhysicsEngineCard } from './PhysicsEngineCard';
import { ReverseTimelineBento } from './ReverseTimelineBento';
import { getTripArchetype } from './TimelineContextualBanner';
import { PreFlightChecklistBento } from './PreFlightChecklistBento';
import { NutritionBento } from './NutritionBento';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { switchActiveStage, getExpeditionTotals } from '../../utils/stageManager';
import { CHIP_TOKENS, CHIP_RING_BASE } from '../../tokens/chipTokens';

interface BentoDashboardProps {
  trip: TripProfile;
  onUpdateTrip: (updated: TripProfile) => void;
  onToggleHeadwind: () => void;
  onPrint: () => void;
  riderSpecs?: RiderBikeSpecs;
  onSelectBike?: (bikeId: string) => void;
  onOpenSpecs?: () => void;
  onOpenConfigurator?: () => void;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  trip,
  onUpdateTrip,
  riderSpecs,
  onSelectBike,
  onOpenSpecs,
  onOpenConfigurator,
}) => {
  const { lang, t } = useTranslation();
  const physicsResult = calculatePhysics(
    trip.physics,
    trip.route,
    trip.weather,
    lang,
    riderSpecs?.ftpWatts
  );
  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const timelineResult = calculateReverseTimeline(
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
    }
  );
  const meta = getLocalizedTripMeta(trip, lang);

  const archetype = getTripArchetype(trip.tag, trip.name);
  const isSport = archetype === 'sport';
  const isBikepacking = archetype === 'bikepacking';
  const isEscapade = archetype === 'escapade';

  const heroBadge = isSport
    ? t('heroBadgeSport')
    : isBikepacking
    ? t('heroBadgeBikepacking')
    : isEscapade
    ? t('heroBadgeEscapade')
    : t('heroBadgeCommute');

  const heroTarget = isEscapade
    ? t('heroTargetEscapade', { dest: trip.route.destination || 'Clisson' })
    : isSport
    ? t('heroTargetSport', {
        dest: trip.route.destination || 'Finish',
        time: timelineResult.gateArrivalTime,
      })
    : isBikepacking
    ? t('heroTargetBikepacking', {
        dest: trip.route.destination || 'Camp',
        time: timelineResult.gateArrivalTime,
      })
    : `${meta.gateName} @ ${timelineResult.gateArrivalTime}`;

  const heroTargetLabel = isEscapade
    ? t('heroTargetLabelEscapade')
    : isSport
    ? t('heroTargetLabelSport')
    : isBikepacking
    ? t('heroTargetLabelBikepacking')
    : t('heroTargetLabelCommute');

  const heroTargetValue = isEscapade || isSport || isBikepacking
    ? timelineResult.gateArrivalTime
    : timelineResult.shiftStartTime;

  const isFr = lang === 'fr';
  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const expeditionTotals = getExpeditionTotals(trip);
  const activeStageIdx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, (trip.stages?.length || 1) - 1));

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 no-print">
      {/* ── EXPEDITION STAGE SEQUENCER BAR (WHEN MULTI-DAY EXPEDITION) ── */}
      {hasMultipleStages && (
        <div className="rounded-full bg-card text-ink p-2 sm:p-2.5 mb-5 shadow-sm border border-ink/5 dark:border-white/5 animate-flight-deck-in transition-colors">
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            {/* Left side: Expedition Badge */}
            <div className="flex items-center gap-2.5 shrink-0 pl-1 sm:pl-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-volt ring-4 ring-volt/25 animate-pulse" />
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-[13px] font-bold text-ink tracking-tight font-rounded uppercase tnum">
                  {isFr
                    ? `EXPÉDITION · ${expeditionTotals.totalDays} JOURS · ${expeditionTotals.totalDistanceKm} KM TOTAL`
                    : `EXPEDITION · ${expeditionTotals.totalDays} DAYS · ${expeditionTotals.totalDistanceKm} KM TOTAL`}
                </span>
                <span className="text-[11px] font-medium text-ink-muted tnum hidden sm:inline">
                  (+{expeditionTotals.totalElevationM} m)
                </span>
              </div>
            </div>

            {/* Center / Right: Interactive Stage Pills */}
            <div className="flex items-center gap-2 shrink-0 pr-1 sm:pr-1.5">
              {trip.stages!.map((stage, idx) => {
                const isActive = idx === activeStageIdx;
                const origin = stage.route?.origin || '...';
                const dest = stage.route?.destination || '...';
                const dist = stage.route?.distanceKm || 0;

                return (
                  <button
                    key={stage.id || `stage-${idx}`}
                    type="button"
                    onClick={() => {
                      if (idx !== activeStageIdx) {
                        onUpdateTrip(switchActiveStage(trip, idx));
                      }
                    }}
                    className={`group inline-flex items-center gap-2 p-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer select-none ${
                      isActive
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} shadow-xs`
                        : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                    }`}
                  >
                    <span
                      className={`p-1 rounded-full text-[10px] leading-none font-extrabold uppercase font-rounded shrink-0 shadow-xs ${
                        isActive
                          ? 'bg-volt text-[#111111]'
                          : 'bg-card text-ink-secondary group-hover:text-ink'
                      }`}
                    >
                      {t('stageDayPill', { day: stage.dayNumber })}
                    </span>
                    <span className="truncate min-w-0 max-w-[150px] sm:max-w-[200px]">
                      {origin} → {dest}
                    </span>
                    <span
                      className={`text-[11px] font-bold tnum shrink-0 ${
                        isActive ? 'text-[#4d5200] dark:text-[#dfff00]' : 'text-ink-muted group-hover:text-ink-secondary'
                      }`}
                    >
                      {dist} km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CINEMATIC HERO DECK (MAP BACKGROUND + PROGRESSIVE BLUR & GRADIENT + 5 KPI BOXES) ── */}
      <div className="animate-flight-deck-in deck-stagger-1">
        <HeroRouteCard
          trip={trip}
          physicsResult={physicsResult}
          timelineResult={timelineResult}
          meta={meta}
          heroBadge={heroBadge}
          heroTarget={heroTarget}
          heroTargetLabel={heroTargetLabel}
          heroTargetValue={heroTargetValue}
          onUpdateTrip={onUpdateTrip}
          riderSpecs={riderSpecs}
          onSelectBike={onSelectBike}
          onOpenSpecs={onOpenSpecs}
          onOpenConfigurator={onOpenConfigurator}
        />
      </div>

      {/* ── TWO-COLUMN BENTO COMMAND DECK (7 COLS / 5 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* ════════ LEFT COLUMN (7 COLS): TIMELINE & TELEMETRY ════════ */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 1. Dynamic Reverse Timeline */}
          <div className="animate-flight-deck-in deck-stagger-2">
            <ReverseTimelineBento trip={trip} timeline={timelineResult} />
          </div>

          {/* 2. Telemetry Dock: Aerodynamic & Rolling Physics Engine */}
          <div className="animate-flight-deck-in deck-stagger-4">
            <PhysicsEngineCard
              trip={trip}
              physicsResult={physicsResult}
            />
          </div>
        </div>

        {/* ════════ RIGHT COLUMN (5 COLS): CONDITIONS, INSPECTION & BASELINE DOCK ════════ */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 3. Weather Conditions: Wind & Aero / Light & Visibility Tabs */}
          <div className="animate-flight-deck-in deck-stagger-3">
            <AtmosphereCard
              trip={trip}
              physicsResult={physicsResult}
              onUpdateTrip={onUpdateTrip}
              hardRolloutTime={timelineResult.hardDepartureTime}
            />
          </div>

          {/* 4. Pre-Flight Inspection Checklist */}
          <div className="animate-flight-deck-in deck-stagger-5">
            <PreFlightChecklistBento trip={trip} onUpdateTrip={onUpdateTrip} />
          </div>

          {/* 5. Baseline Dock: Real-Food Nutrition & Recovery Protocol */}
          <div className="animate-flight-deck-in deck-stagger-6">
            <NutritionBento
              trip={trip}
              hardDepartureTime={timelineResult.hardDepartureTime}
              gateArrivalTime={timelineResult.gateArrivalTime}
              physicsResult={physicsResult}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
