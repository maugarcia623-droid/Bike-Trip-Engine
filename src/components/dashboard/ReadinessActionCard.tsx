import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/arc';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { StageAmenity } from '../../types/amenities';
import { RideBriefData, buildRideBrief } from '../../utils/rideBrief';
import { ReadinessActionKind } from '../../utils/rideReadiness';
import { calculatePhysics } from '../../utils/physics';
import {
  calculateReverseTimeline,
  ReverseTimelineCalculation,
  parseHHMM,
  formatHHMM,
} from '../../utils/timeline';
import { getChipsExtraBufferMinutes, toggleArchetypeChip } from '../../utils/archetypeChips';
import { buildEffectiveChecklist } from '../../utils/effectiveChecklist';
import { getChecklistItemLabel } from '../../context/LanguageContext';
import { calculateRideVisibility } from '../../utils/solarVisibility';
import {
  fetchHourlyWeather,
  computeRouteBearing,
  getLocalTodayIso,
} from '../../services/weatherService';
import { READINESS_TOKENS } from './RideReadinessGauge';
import {
  X,
  Coffee,
  Route,
  Gauge,
  Check,
  CheckCircle2,
  Clock,
  CloudRain,
  Sun,
  Bike,
  MapPin,
  ArrowRight,
  Sliders,
  Loader2,
  Trash,
} from '@/components/icons';

export interface ReadinessActionAppliedInfo {
  summary: string;
  previousTrip?: TripProfile;
  jumpSectionId?: string;
  jumpLabel?: string;
}

export interface ReadinessActionCardProps {
  action: ReadinessActionKind;
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  timeline: ReverseTimelineCalculation;
  riderSpecs: RiderBikeSpecs;
  amenities?: StageAmenity[];
  brief: RideBriefData;
  lang: 'en' | 'fr';
  onUpdateTrip: (updated: TripProfile) => void;
  onSelectBike?: (bikeId: string) => void;
  onOpenSpecs?: () => void;
  onOpenConfigurator?: () => void;
  onJumpToSection?: (sectionId: string) => void;
  onApplied: (info: ReadinessActionAppliedInfo) => void;
  onClose: () => void;
}

function mirrorStageUpdate(trip: TripProfile, updated: TripProfile): TripProfile {
  if (!trip.stages || trip.stages.length === 0) return updated;
  const idx = Math.max(0, Math.min(trip.activeStageIndex ?? 0, trip.stages.length - 1));
  return {
    ...updated,
    stages: trip.stages.map((st, i) =>
      i === idx
        ? {
            ...st,
            route: { ...st.route, ...updated.route },
            office: { ...st.office, ...updated.office },
            weather: { ...st.weather, ...updated.weather },
            departureTime: updated.departureTime ?? st.departureTime,
            customChips: updated.customChips ?? st.customChips,
            pinnedAmenities: updated.pinnedAmenities ?? st.pinnedAmenities,
          }
        : st
    ),
  };
}

function buildShortenedTrip(trip: TripProfile, targetDistanceKm: number, isFr: boolean): TripProfile {
  const clampedKm = Math.max(2, Math.min(350, Math.round(targetDistanceKm * 10) / 10));
  const oldKm = Math.max(1, trip.route.distanceKm || 1);
  const oldElev = trip.route.elevationGainM ?? Math.round(oldKm * 6.6);
  const scaledElev = Math.max(0, Math.round(oldElev * (clampedKm / oldKm)));
  const isRadiusMode =
    trip.route.routeMode === 'manual-radius' ||
    Boolean(trip.route.radiusMeters && trip.route.radiusMeters > 0);
  const nextLoopKm = Math.round((clampedKm / 2) * 10) / 10;
  const updatedDesc = trip.description
    ? trip.description.replace(/^\d+(\.\d+)?\s*km\b/i, `${clampedKm.toFixed(1)} km`)
    : `${clampedKm.toFixed(1)} km ride`;

  return mirrorStageUpdate(trip, {
    ...trip,
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
}

function buildLongStopTrip(trip: TripProfile, minutes: number, label: string): TripProfile {
  const nextRules = { ...(trip.ruleSettings || {}) };
  if (minutes > 0) {
    nextRules.plannedLongStopMin = minutes;
    nextRules.plannedLongStopLabel = label.trim() || undefined;
  } else {
    delete nextRules.plannedLongStopMin;
    delete nextRules.plannedLongStopLabel;
  }
  return mirrorStageUpdate(trip, {
    ...trip,
    updatedAt: new Date().toISOString(),
    ruleSettings: nextRules,
  });
}

function buildShiftedTimeTrip(trip: TripProfile, deltaMinutes: number, currentTimeline: ReverseTimelineCalculation): TripProfile {
  const isDepartAt = trip.arriveAtMode === false && Boolean(trip.departureTime);
  if (isDepartAt) {
    const base = parseHHMM(trip.departureTime || currentTimeline.hardDepartureTime || '08:00');
    const next = formatHHMM(base + deltaMinutes);
    return mirrorStageUpdate(trip, {
      ...trip,
      updatedAt: new Date().toISOString(),
      departureTime: next,
    });
  }
  const baseGate = trip.office.targetGateArrivalTime || trip.office.shiftStartTime || '08:30';
  const baseShift = trip.office.shiftStartTime || baseGate;
  return mirrorStageUpdate(trip, {
    ...trip,
    updatedAt: new Date().toISOString(),
    office: {
      ...trip.office,
      targetGateArrivalTime: formatHHMM(parseHHMM(baseGate) + deltaMinutes),
      shiftStartTime: formatHHMM(parseHHMM(baseShift) + deltaMinutes),
    },
  });
}

function evaluateCandidate(
  candidateTrip: TripProfile,
  specs: RiderBikeSpecs,
  amenities: StageAmenity[] | undefined,
  lang: 'en' | 'fr'
) {
  const phys = calculatePhysics(
    candidateTrip.physics,
    candidateTrip.route,
    candidateTrip.weather,
    lang,
    specs.ftpWatts
  );
  const extraBuf = getChipsExtraBufferMinutes(candidateTrip);
  const activeStage =
    candidateTrip.stages && candidateTrip.activeStageIndex !== undefined
      ? candidateTrip.stages[candidateTrip.activeStageIndex]
      : undefined;
  const tl = calculateReverseTimeline(
    candidateTrip.route,
    candidateTrip.office,
    candidateTrip.weather,
    candidateTrip.tag,
    candidateTrip.route?.destination,
    lang,
    extraBuf,
    candidateTrip.customChips || [],
    {
      effectiveSpeedKmH: phys.effectiveSpeedKmH,
      calmSpeedKmH: phys.calmSpeedKmH,
      arriveAtMode: candidateTrip.arriveAtMode,
      departureTime: candidateTrip.departureTime,
      movingTimeSeconds: phys.movingTimeSeconds,
      logistics: candidateTrip.ruleSettings,
      pinnedAmenities: candidateTrip.pinnedAmenities,
      departureDate: activeStage?.departureDate || candidateTrip.departureDate,
    }
  );
  const candidateBrief = buildRideBrief({
    trip: candidateTrip,
    physics: phys,
    timeline: tl,
    riderSpecs: specs,
    amenities,
    lang,
  });
  return {
    physics: phys,
    timeline: tl,
    brief: candidateBrief,
    readiness: candidateBrief.readiness,
  };
}

const ScoreDeltaPill: React.FC<{
  currentScore: number;
  nextScore: number;
  nextLevel: RideBriefData['readiness']['level'];
  isFr: boolean;
}> = ({ currentScore, nextScore, nextLevel, isFr }) => {
  const diff = nextScore - currentScore;
  const tokens = READINESS_TOKENS[nextLevel];
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-rounded font-bold text-ink tnum ring-1 ring-inset ring-ink/10 dark:ring-white/10">
      <span className="text-ink-muted font-medium">{isFr ? 'Score prévu' : 'Projected'}</span>
      <span className="text-ink-secondary">{currentScore}</span>
      <ArrowRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${tokens.dot}`} aria-hidden="true" />
        <span className="text-ink">{nextScore}</span>
      </span>
      {diff > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">+{diff}</span>
      )}
    </div>
  );
};

export const ReadinessActionCard: React.FC<ReadinessActionCardProps> = ({
  action,
  trip,
  physics,
  timeline,
  riderSpecs,
  amenities,
  brief,
  lang,
  onUpdateTrip,
  onSelectBike,
  onOpenSpecs,
  onOpenConfigurator,
  onJumpToSection,
  onApplied,
  onClose,
}) => {
  const isFr = lang === 'fr';
  const currentScore = brief.readiness.score;

  // ── Effort-load state (Add long stop vs Shorten route) ──
  const existingStopMin = Math.max(0, Math.round(Number(trip.ruleSettings?.plannedLongStopMin ?? 0)));
  const [effortTab, setEffortTab] = useState<'stop' | 'shorten'>(
    existingStopMin >= 45 ? 'shorten' : 'stop'
  );
  const [stopMinutes, setStopMinutes] = useState<number>(existingStopMin > 0 ? existingStopMin : 45);
  const [stopLabel, setStopLabel] = useState<string>(
    trip.ruleSettings?.plannedLongStopLabel ||
      (isFr ? 'Pause déjeuner & récupération' : 'Mid-ride lunch & recovery')
  );
  const currentDistKm = Math.max(2, Number((trip.route.distanceKm || 30).toFixed(1)));
  const defaultShortKm = Math.max(2, Math.round(currentDistKm * 0.75 * 10) / 10);
  const [targetDistKm, setTargetDistKm] = useState<number>(defaultShortKm);

  // ── Effort-pace state ──
  const ftp = riderSpecs.ftpWatts || physics.ftpWatts || 210;
  const [targetFtpRatio, setTargetFtpRatio] = useState<number>(0.70);

  // ── Time shift state (weather / daylight) ──
  const [shiftDeltaMin, setShiftDeltaMin] = useState<number>(action === 'daylight-window' ? 60 : 60);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);

  // Sync defaults when trip or action changes
  useEffect(() => {
    const curStop = Math.max(0, Math.round(Number(trip.ruleSettings?.plannedLongStopMin ?? 0)));
    setStopMinutes(curStop > 0 ? curStop : 45);
    setStopLabel(
      trip.ruleSettings?.plannedLongStopLabel ||
        (isFr ? 'Pause déjeuner & récupération' : 'Mid-ride lunch & recovery')
    );
    setEffortTab(curStop >= 45 ? 'shorten' : 'stop');
    setTargetDistKm(Math.max(2, Math.round((trip.route.distanceKm || 30) * 0.75 * 10) / 10));
  }, [trip.id, action, trip.route.distanceKm, trip.ruleSettings?.plannedLongStopMin, trip.ruleSettings?.plannedLongStopLabel, isFr]);

  // ── Previews ──
  const stopPreview = useMemo(() => {
    if (action !== 'effort-load') return null;
    const cand = buildLongStopTrip(trip, stopMinutes, stopLabel);
    return { trip: cand, ...evaluateCandidate(cand, riderSpecs, amenities, lang) };
  }, [action, trip, stopMinutes, stopLabel, riderSpecs, amenities, lang]);

  const shortenPreview = useMemo(() => {
    if (action !== 'effort-load') return null;
    const cand = buildShortenedTrip(trip, targetDistKm, isFr);
    return { trip: cand, ...evaluateCandidate(cand, riderSpecs, amenities, lang) };
  }, [action, trip, targetDistKm, isFr, riderSpecs, amenities, lang]);

  const pacePreview = useMemo(() => {
    if (action !== 'effort-pace') return null;
    const nextWatts = Math.max(85, Math.round(ftp * targetFtpRatio));
    const cand = mirrorStageUpdate(trip, {
      ...trip,
      updatedAt: new Date().toISOString(),
      route: {
        ...trip.route,
        pacingMode: 'effort',
        targetEffortWatts: nextWatts,
      },
    });
    return { trip: cand, targetWatts: nextWatts, ...evaluateCandidate(cand, riderSpecs, amenities, lang) };
  }, [action, trip, ftp, targetFtpRatio, riderSpecs, amenities, lang]);

  const shiftPreview = useMemo(() => {
    if (action !== 'weather-window' && action !== 'daylight-window') return null;
    const cand = buildShiftedTimeTrip(trip, shiftDeltaMin, timeline);
    const evalRes = evaluateCandidate(cand, riderSpecs, amenities, lang);
    const activeStage =
      cand.stages && cand.activeStageIndex !== undefined
        ? cand.stages[cand.activeStageIndex]
        : undefined;
    const vis = calculateRideVisibility(
      cand,
      activeStage?.departureDate || cand.departureDate,
      evalRes.timeline.hardDepartureTime,
      evalRes.physics.effectiveSpeedKmH
    );
    return { trip: cand, vis, ...evalRes };
  }, [action, trip, shiftDeltaMin, timeline, riderSpecs, amenities, lang]);

  // Checklist items for inline ticking
  const effectiveChecklist = useMemo(() => {
    if (action !== 'checklist') return [];
    return buildEffectiveChecklist(trip, riderSpecs, lang);
  }, [action, trip, riderSpecs, lang]);

  const uncheckedChecklist = useMemo(() => {
    return effectiveChecklist
      .filter((item) => !item.checked)
      .sort((a, b) => Number(b.critical) - Number(a.critical));
  }, [effectiveChecklist]);

  // Bike options for bike-terrain
  const bikeOptions = useMemo(() => {
    if (action !== 'bike-terrain') return [];
    const bikes = riderSpecs.bikes || [];
    return bikes.map((bike) => {
      const altSpecs: RiderBikeSpecs = { ...riderSpecs, activeBikeId: bike.id };
      const altTrip: TripProfile = {
        ...trip,
        physics: {
          ...trip.physics,
          bikeWeightKg: bike.weightKg,
          crr: bike.crr,
          cda: bike.cda,
        },
      };
      const res = evaluateCandidate(altTrip, altSpecs, amenities, lang);
      return {
        bike,
        isActive: bike.id === riderSpecs.activeBikeId,
        score: res.readiness.score,
        level: res.readiness.level,
        terrainScore: res.readiness.factors.find((f) => f.id === 'terrain')?.score ?? 100,
      };
    });
  }, [action, riderSpecs, trip, amenities, lang]);

  // ── Apply handlers ──
  const handleApplyLongStop = () => {
    if (!stopPreview) return;
    onUpdateTrip(stopPreview.trip);
    onApplied({
      summary: isFr
        ? `Pause de ${stopMinutes} min ajoutée — horaires, arrivée (${stopPreview.timeline.gateArrivalTime}) et score mis à jour`
        : `Added ${stopMinutes} min stop — timeline, finish (${stopPreview.timeline.gateArrivalTime}) & readiness updated`,
      previousTrip: trip,
      jumpSectionId: 'bento-timeline',
      jumpLabel: isFr ? 'Voir la timeline' : 'View timeline',
    });
  };

  const handleRemoveLongStop = () => {
    const cleaned = buildLongStopTrip(trip, 0, '');
    onUpdateTrip(cleaned);
    onApplied({
      summary: isFr
        ? 'Pause longue retirée du plan de route'
        : 'Removed planned long stop from ride plan',
      previousTrip: trip,
    });
  };

  const handleApplyShorten = () => {
    if (!shortenPreview) return;
    onUpdateTrip(shortenPreview.trip);
    onApplied({
      summary: isFr
        ? `Distance ajustée à ${targetDistKm} km — temps de selle (${shortenPreview.physics.movingTimeFormatted}), ravito et score mis à jour`
        : `Route adjusted to ${targetDistKm} km — saddle time (${shortenPreview.physics.movingTimeFormatted}), fueling & readiness updated`,
      previousTrip: trip,
      jumpSectionId: 'bento-route',
      jumpLabel: isFr ? 'Voir la carte' : 'View route',
    });
  };

  const handleApplyPace = () => {
    if (!pacePreview) return;
    onUpdateTrip(pacePreview.trip);
    onApplied({
      summary: isFr
        ? `Allure réglée en effort régulier (${pacePreview.physics.powerZone} · ${pacePreview.targetWatts} W) — horaires et score mis à jour`
        : `Switched to steady effort (${pacePreview.physics.powerZone} · ${pacePreview.targetWatts} W) — timeline & readiness updated`,
      previousTrip: trip,
      jumpSectionId: 'bento-physics',
      jumpLabel: isFr ? 'Voir l’effort' : 'View effort',
    });
  };

  const handleTickChecklistItem = (itemId: string) => {
    const nextList = effectiveChecklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    onUpdateTrip({
      ...trip,
      updatedAt: new Date().toISOString(),
      checklist: nextList,
    });
  };

  const handleApplyTimeShift = async () => {
    if (!shiftPreview) return;
    setIsRefreshingWeather(true);
    let nextTrip = shiftPreview.trip;
    try {
      const coords =
        nextTrip.route.coordinates?.[Math.floor((nextTrip.route.coordinates?.length || 1) / 2)] ||
        [47.25, -1.88];
      const bearing = computeRouteBearing(nextTrip.route.coordinates);
      const activeStage =
        nextTrip.stages && nextTrip.activeStageIndex !== undefined
          ? nextTrip.stages[nextTrip.activeStageIndex]
          : undefined;
      const dateStr = activeStage?.departureDate || nextTrip.departureDate || getLocalTodayIso();
      const targetTime = shiftPreview.timeline.hardDepartureTime;
      const live = await fetchHourlyWeather(coords[0], coords[1], dateStr, targetTime, bearing);
      nextTrip = mirrorStageUpdate(nextTrip, {
        ...nextTrip,
        weather: {
          ...nextTrip.weather,
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
          ...nextTrip.physics,
          rho: live.airDensityRho,
        },
      });
    } catch {
      // Keep shifted time even if offline/weather fetch fails
    } finally {
      setIsRefreshingWeather(false);
    }
    onUpdateTrip(nextTrip);
    onApplied({
      summary: isFr
        ? `Départ décalé à ${shiftPreview.timeline.hardDepartureTime} — météo, luminosité et timeline actualisées`
        : `Shifted rollout to ${shiftPreview.timeline.hardDepartureTime} — weather, daylight & timeline refreshed`,
      previousTrip: trip,
      jumpSectionId: action === 'weather-window' ? 'bento-weather' : 'bento-timeline',
      jumpLabel: action === 'weather-window'
        ? (isFr ? 'Voir la météo' : 'View weather')
        : (isFr ? 'Voir la timeline' : 'View timeline'),
    });
  };

  const handleTogglePrepChip = (chipId: 'bad-weather-prep' | 'night-ride') => {
    const updated = toggleArchetypeChip(trip, chipId, lang);
    onUpdateTrip(updated);
    const label =
      chipId === 'bad-weather-prep'
        ? isFr
          ? 'Kit pluie & marge chaussée humide ajoutés'
          : 'Wet-weather gear & safety buffer added'
        : isFr
        ? 'Contrôle éclairage & marge nuit ajoutés'
        : 'Night-ride lights check & buffer added';
    onApplied({
      summary: label,
      previousTrip: trip,
      jumpSectionId: 'bento-checklist',
      jumpLabel: isFr ? 'Voir la check-list' : 'View checklist',
    });
  };

  const handlePinAlternativeStop = () => {
    const alt = brief.firstProblem.alternativeStop;
    if (!alt) return;
    const existing = trip.pinnedAmenities || [];
    if (existing.some((a) => a.id === alt.id)) return;
    const nextTrip = mirrorStageUpdate(trip, {
      ...trip,
      updatedAt: new Date().toISOString(),
      pinnedAmenities: [...existing, alt],
    });
    onUpdateTrip(nextTrip);
    onApplied({
      summary: isFr
        ? `${alt.name} épinglé sur la trace (km ${alt.routeKm}) — carte et timeline mises à jour`
        : `Pinned ${alt.name} at km ${alt.routeKm} — map, timeline & brief updated`,
      previousTrip: trip,
      jumpSectionId: 'bento-timeline',
      jumpLabel: isFr ? 'Voir la timeline' : 'View timeline',
    });
  };

  // ── Header metadata per action ──
  const headerMeta: Record<ReadinessActionKind, { icon: React.ElementType; title: string; subtitle: string }> = {
    'effort-load': {
      icon: Coffee,
      title: isFr ? 'Alléger la charge de la sortie' : 'Ease the overall ride load',
      subtitle: isFr
        ? 'Planifiez une pause longue ou ajustez la distance — tout votre plan de route (horaires, arrivée, nutrition et score) se met à jour automatiquement.'
        : 'Add a planned recovery stop or trim the distance — your timeline, finish time, nutrition windows, and readiness score update everywhere.',
    },
    'effort-pace': {
      icon: Gauge,
      title: isFr ? 'Passer à une allure plus soutenable' : 'Dial back the pace',
      subtitle: isFr
        ? 'Passez en mode effort régulier une zone plus bas pour préserver vos jambes sur toute la distance.'
        : 'Switch to steady effort one zone lower to keep the ride comfortable from start to finish.',
    },
    checklist: {
      icon: CheckCircle2,
      title: isFr ? 'Finaliser les essentiels avant le départ' : 'Finish essential pre-ride checks',
      subtitle: isFr
        ? 'Cochez les éléments restants ici — votre check-list et votre score de préparation se mettent à jour en direct.'
        : 'Tick remaining items right here — your checklist card and readiness score update live.',
    },
    'weather-window': {
      icon: CloudRain,
      title: isFr ? 'Ajuster le créneau météo' : 'Adjust your weather window',
      subtitle: isFr
        ? 'Décalez l’horaire pour actualiser la météo heure par heure, ou ajoutez le kit pluie à votre check-list et vos marges.'
        : 'Shift your schedule to pull a fresh hourly forecast, or add wet-weather prep to your checklist and timeline.',
    },
    'bike-terrain': {
      icon: Bike,
      title: isFr ? 'Adapter le vélo au terrain' : 'Match your bike to the surface',
      subtitle: isFr
        ? 'Choisissez un vélo mieux adapté au revêtement de cette trace, ou ajustez vos pneus dans vos réglages.'
        : 'Pick a bike better suited to this route’s surface, or adjust tyre width in your bike setup.',
    },
    'daylight-window': {
      icon: Sun,
      title: isFr ? 'Gagner en visibilité de jour' : 'Improve daylight visibility',
      subtitle: isFr
        ? 'Décalez le départ vers le jour ou activez la préparation nuit (phares 800+ lm et marge de prudence).'
        : 'Shift your rollout toward daylight, or turn on night-ride prep (lights check and safety buffer).',
    },
    'route-stops': {
      icon: MapPin,
      title: isFr ? 'Régler le point signalé sur la trace' : 'Resolve the flagged route stop',
      subtitle: isFr
        ? 'Épinglez une alternative ouverte ou ouvrez le radar sur la carte pour vérifier l’eau et les horaires.'
        : 'Pin an open alternative stop or inspect the corridor on the map.',
    },
  };

  const { icon: HeaderIcon, title, subtitle } = headerMeta[action];

  return (
    <div
      data-testid="readiness-action-card"
      className="rounded-pod bg-pod p-4 sm:p-4.5 ring-1 ring-inset ring-ink/10 dark:ring-white/10 space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full bg-volt text-[#111111] flex items-center justify-center shrink-0 mt-0.5">
            <HeaderIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <h4 className="text-[15px] font-bold font-rounded tracking-tight text-ink leading-snug">
              {title}
            </h4>
            <p className="text-xs font-medium text-ink-secondary font-body leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={isFr ? 'Fermer les suggestions' : 'Close guidance'}
          className="w-8 h-8 rounded-full bg-card hover:bg-chip text-ink-muted hover:text-ink flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 1. EFFORT LOAD: PLAN LONG STOP / SHORTEN ROUTE ── */}
      {action === 'effort-load' && (
        <div className="space-y-3.5">
          {/* Mode selector pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEffortTab('stop')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer active:scale-[0.98] ${
                effortTab === 'stop'
                  ? 'bg-ink text-ink-inverse shadow-xs'
                  : 'bg-card text-ink-secondary hover:text-ink hover:bg-chip'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{isFr ? 'Planifier une pause longue' : 'Plan a long stop'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEffortTab('shorten')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer active:scale-[0.98] ${
                effortTab === 'shorten'
                  ? 'bg-ink text-ink-inverse shadow-xs'
                  : 'bg-card text-ink-secondary hover:text-ink hover:bg-chip'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>{isFr ? 'Raccourcir la distance' : 'Shorten the route'}</span>
            </button>
          </div>

          {effortTab === 'stop' && stopPreview && (
            <div className="rounded-pod bg-card p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1.5">
                  <span className="text-[12px] font-semibold font-rounded text-ink-secondary block">
                    {isFr ? 'Durée de la pause à mi-parcours' : 'Mid-ride stop duration'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[30, 45, 60].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setStopMinutes(min)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-rounded font-bold tnum transition-all cursor-pointer active:scale-[0.98] ${
                          stopMinutes === min
                            ? 'bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300]'
                            : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 sm:max-w-xs space-y-1.5">
                  <label
                    htmlFor="readiness-stop-label"
                    className="text-[12px] font-semibold font-rounded text-ink-secondary block"
                  >
                    {isFr ? 'Libellé sur la timeline' : 'Timeline stop label'}
                  </label>
                  <input
                    id="readiness-stop-label"
                    type="text"
                    value={stopLabel}
                    onChange={(e) => setStopLabel(e.target.value)}
                    placeholder={isFr ? 'Ex. Pause déjeuner & récup' : 'e.g. Mid-ride lunch & recovery'}
                    className="w-full rounded-full bg-pod px-3.5 py-2 sm:py-1.5 text-base sm:text-xs font-body text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-volt"
                  />
                </div>
              </div>

              {/* Live cascade summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-chip dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ScoreDeltaPill
                    currentScore={currentScore}
                    nextScore={stopPreview.readiness.score}
                    nextLevel={stopPreview.readiness.level}
                    isFr={isFr}
                  />
                  <span className="text-xs font-medium text-ink-muted font-body tnum">
                    {isFr ? 'Départ' : 'Leave'} {stopPreview.timeline.hardDepartureTime} →{' '}
                    {isFr ? 'Fin' : 'Finish'} {stopPreview.timeline.gateArrivalTime} ·{' '}
                    {stopPreview.brief.totalDurationFormatted}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {existingStopMin > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={handleRemoveLongStop}
                      className="min-h-[40px] sm:h-9 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-rose-600 dark:hover:text-rose-400 text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Retirer la pause' : 'Remove stop'}</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={handleApplyLongStop}
                    className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>
                      {existingStopMin > 0
                        ? isFr
                          ? `Mettre à jour (${stopMinutes} min)`
                          : `Update stop (${stopMinutes} min)`
                        : isFr
                        ? `Ajouter la pause (${stopMinutes} min)`
                        : `Add ${stopMinutes} min stop`}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {effortTab === 'shorten' && shortenPreview && (
            <div className="rounded-pod bg-card p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-semibold font-rounded text-ink-secondary">
                  {isFr ? 'Nouvelle distance cible' : 'Target route distance'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { pct: 0.85, label: '−15%' },
                    { pct: 0.75, label: '−25%' },
                    { pct: 0.65, label: '−35%' },
                  ].map((preset) => {
                    const km = Math.max(2, Math.round(currentDistKm * preset.pct * 10) / 10);
                    const active = Math.abs(targetDistKm - km) < 0.2;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTargetDistKm(km)}
                        className={`px-3 py-1 rounded-full text-xs font-rounded font-bold tnum transition-all cursor-pointer active:scale-[0.98] ${
                          active
                            ? 'bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300]'
                            : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {preset.label} ({km} km)
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={Math.max(2, Math.round(currentDistKm * 0.35))}
                  max={Math.max(5, Math.round(currentDistKm))}
                  step={1}
                  value={Math.round(targetDistKm)}
                  onChange={(e) => setTargetDistKm(Number(e.target.value))}
                  aria-label={isFr ? 'Distance cible en km' : 'Target distance in km'}
                  className="peloton-slider flex-1"
                />
                <span className="text-sm font-bold font-rounded text-ink tnum min-w-[70px] text-right">
                  {targetDistKm} km
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-chip dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ScoreDeltaPill
                    currentScore={currentScore}
                    nextScore={shortenPreview.readiness.score}
                    nextLevel={shortenPreview.readiness.level}
                    isFr={isFr}
                  />
                  <span className="text-xs font-medium text-ink-muted font-body tnum">
                    {currentDistKm} km → {targetDistKm} km · {shortenPreview.physics.movingTimeFormatted}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onOpenConfigurator && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={onOpenConfigurator}
                      className="min-h-[40px] sm:h-9 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Modifier le tracé' : 'Edit in Trip Setup'}</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={handleApplyShorten}
                    className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer tnum"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>
                      {isFr ? `Passer à ${targetDistKm} km` : `Set route to ${targetDistKm} km`}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. EFFORT PACE: EASE BY ONE ZONE ── */}
      {action === 'effort-pace' && pacePreview && (
        <div className="rounded-pod bg-card p-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                ratio: 0.65,
                label: isFr ? 'Endurance cool (Z2 · 65% FTP)' : 'Easy endurance (Z2 · 65% FTP)',
              },
              {
                ratio: 0.72,
                label: isFr ? 'Endurance active (Z2 · 72% FTP)' : 'Steady endurance (Z2 · 72% FTP)',
              },
              {
                ratio: 0.80,
                label: isFr ? 'Tempo maîtrisé (Z3 · 80% FTP)' : 'Controlled tempo (Z3 · 80% FTP)',
              },
            ].map((opt) => (
              <button
                key={opt.ratio}
                type="button"
                onClick={() => setTargetFtpRatio(opt.ratio)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-rounded font-bold tnum transition-all cursor-pointer active:scale-[0.98] ${
                  targetFtpRatio === opt.ratio
                    ? 'bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300]'
                    : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-chip dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              <ScoreDeltaPill
                currentScore={currentScore}
                nextScore={pacePreview.readiness.score}
                nextLevel={pacePreview.readiness.level}
                isFr={isFr}
              />
              <span className="text-xs font-medium text-ink-muted font-body tnum">
                {Math.round(physics.legWatts)} W ({physics.powerZone}) → {pacePreview.targetWatts} W (
                {pacePreview.physics.powerZone}) · {pacePreview.physics.effectiveSpeedKmH.toFixed(1)} km/h ·{' '}
                {pacePreview.physics.movingTimeFormatted}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleApplyPace}
              className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{isFr ? 'Appliquer cette allure' : 'Apply steadier pace'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. CHECKLIST: TICK REMAINING ITEMS INLINE ── */}
      {action === 'checklist' && (
        <div className="rounded-pod bg-card p-3.5 space-y-3">
          {uncheckedChecklist.length === 0 ? (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-rounded">
              {isFr ? 'Tous les éléments sont cochés !' : 'Every item is checked off!'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uncheckedChecklist.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTickChecklistItem(item.id)}
                  className="flex items-center gap-2.5 rounded-pod bg-pod hover:bg-chip px-3 py-2 text-left transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full border-2 border-ink/25 dark:border-white/25 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 opacity-0" />
                  </span>
                  <span className="text-xs font-medium text-ink font-body leading-snug flex-1 min-w-0 truncate">
                    {getChecklistItemLabel(item, trip.route.distanceKm, lang)}
                  </span>
                  {item.critical && (
                    <span className="text-[10px] font-bold font-rounded px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 shrink-0">
                      {isFr ? 'Essentiel' : 'Essential'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-chip dark:border-white/10">
            <span className="text-xs font-medium text-ink-muted font-body tnum">
              {uncheckedChecklist.length > 6
                ? isFr
                  ? `+${uncheckedChecklist.length - 6} autres éléments dans la check-list`
                  : `+${uncheckedChecklist.length - 6} more items in full checklist`
                : isFr
                ? `${effectiveChecklist.length - uncheckedChecklist.length} sur ${effectiveChecklist.length} cochés`
                : `${effectiveChecklist.length - uncheckedChecklist.length} of ${effectiveChecklist.length} checked`}
            </span>
            {onJumpToSection && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToSection('bento-checklist');
                }}
                className="min-h-[36px] sm:h-8 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isFr ? 'Ouvrir toute la check-list' : 'Jump to full checklist'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── 4 & 6. WEATHER WINDOW / DAYLIGHT WINDOW ── */}
      {(action === 'weather-window' || action === 'daylight-window') && shiftPreview && (
        <div className="rounded-pod bg-card p-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {[-120, -60, -30, 30, 60, 120].map((delta) => {
              const label =
                delta < 0
                  ? delta % 60 === 0
                    ? `−${Math.abs(delta) / 60}h`
                    : `−${Math.abs(delta)} min`
                  : delta % 60 === 0
                  ? `+${delta / 60}h`
                  : `+${delta} min`;
              return (
                <button
                  key={delta}
                  type="button"
                  onClick={() => setShiftDeltaMin(delta)}
                  className={`px-3 py-1.5 rounded-full text-xs font-rounded font-bold tnum transition-all cursor-pointer active:scale-[0.98] ${
                    shiftDeltaMin === delta
                      ? 'bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300]'
                      : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-chip dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              {action === 'daylight-window' && (
                <ScoreDeltaPill
                  currentScore={currentScore}
                  nextScore={shiftPreview.readiness.score}
                  nextLevel={shiftPreview.readiness.level}
                  isFr={isFr}
                />
              )}
              <span className="text-xs font-medium text-ink-muted font-body tnum">
                {isFr ? 'Départ' : 'Leave'} {timeline.hardDepartureTime} →{' '}
                <strong className="text-ink">{shiftPreview.timeline.hardDepartureTime}</strong>
                {action === 'daylight-window'
                  ? ` · ${Math.round(shiftPreview.vis.daylightPercent)}% ${isFr ? 'de jour' : 'daylight'}`
                  : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {action === 'weather-window' && !(trip.customChips || []).includes('bad-weather-prep') && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => handleTogglePrepChip('bad-weather-prep')}
                  className="min-h-[40px] sm:h-9 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Ajouter kit pluie' : 'Add rain prep'}</span>
                </Button>
              )}
              {action === 'daylight-window' && !(trip.customChips || []).includes('night-ride') && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => handleTogglePrepChip('night-ride')}
                  className="min-h-[40px] sm:h-9 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Activer prépa nuit' : 'Add night-ride prep'}</span>
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                type="button"
                disabled={isRefreshingWeather}
                onClick={handleApplyTimeShift}
                className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isRefreshingWeather ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>
                  {isFr
                    ? `Décaler à ${shiftPreview.timeline.hardDepartureTime}`
                    : `Shift to ${shiftPreview.timeline.hardDepartureTime}`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. BIKE & TERRAIN: SWITCH BIKE OR EDIT SPECS ── */}
      {action === 'bike-terrain' && (
        <div className="rounded-pod bg-card p-3.5 space-y-3">
          {bikeOptions.length > 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {bikeOptions.map(({ bike, isActive, score, level, terrainScore }) => {
                const diff = score - currentScore;
                const tokens = READINESS_TOKENS[level];
                return (
                  <button
                    key={bike.id}
                    type="button"
                    disabled={isActive || !onSelectBike}
                    onClick={() => {
                      if (!onSelectBike) return;
                      onSelectBike(bike.id);
                      onApplied({
                        summary: isFr
                          ? `Vélo changé pour ${bike.name} — pression, physique et score mis à jour`
                          : `Switched bike to ${bike.name} — pressure, physics & readiness updated`,
                      });
                    }}
                    className={`rounded-pod p-3 text-left flex flex-col gap-1 transition-all ${
                      isActive
                        ? 'bg-pod ring-2 ring-inset ring-ink/15 dark:ring-white/15 opacity-75 cursor-default'
                        : 'bg-pod hover:bg-chip cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-rounded text-ink truncate">
                        {bike.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-rounded font-bold tnum shrink-0">
                        <span className={`w-2 h-2 rounded-full ${tokens.dot}`} />
                        <span>{score}</span>
                        {!isActive && diff > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">+{diff}</span>
                        )}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-ink-muted font-body tnum">
                      {bike.tireWidthMm ?? 32} mm {bike.isTubeless ? 'TL' : isFr ? 'chambre' : 'tubes'} ·{' '}
                      {isFr ? 'Terrain' : 'Terrain'} {terrainScore}/100
                      {isActive ? (isFr ? ' · Actuel' : ' · Active') : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-medium text-ink-secondary font-body">
              {isFr
                ? 'Ajustez la largeur de pneus ou ajoutez un deuxième vélo dans vos réglages vélo.'
                : 'Update tyre width / tubeless setup or add another bike in your bike specs.'}
            </p>
          )}

          {onOpenSpecs && (
            <div className="flex justify-end pt-2 border-t border-chip dark:border-white/10">
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSpecs();
                }}
                className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>{isFr ? 'Réglages vélo & pneus' : 'Edit bike & tyres'}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 7. ROUTE & STOPS: PIN OPEN ALTERNATIVE OR OPEN RADAR ── */}
      {action === 'route-stops' && (
        <div className="rounded-pod bg-card p-3.5 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-bold font-rounded text-ink">{brief.firstProblem.headline}</p>
            <p className="text-xs font-medium text-ink-secondary font-body leading-relaxed">
              {brief.firstProblem.detail}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-chip dark:border-white/10">
            {onJumpToSection && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToSection('bento-route');
                }}
                className="min-h-[40px] sm:h-9 sm:min-h-0 px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isFr ? 'Ouvrir la carte & arrêts' : 'Inspect on map'}</span>
              </Button>
            )}
            {brief.firstProblem.alternativeStop && (
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handlePinAlternativeStop}
                className="min-h-[40px] sm:h-9 sm:min-h-0 px-4 rounded-full bg-volt text-[#111111] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {isFr
                    ? `Épingler ${brief.firstProblem.alternativeStop.name}`
                    : `Pin ${brief.firstProblem.alternativeStop.name}`}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
