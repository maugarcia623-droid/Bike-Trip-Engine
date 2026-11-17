import type { PhysicsCalculationResult, TripProfile } from '../types/trip';
import type { ReverseTimelineCalculation } from './timeline';
import { computeRideReadiness, RideReadiness } from './rideReadiness';
import { loadRiderBikeSpecs, getActiveBike } from './specsStorage';
import { calculateRideVisibility } from './solarVisibility';
import { getKitRecommendation } from './kitAdvisor';
import { buildEffectiveChecklist } from './effectiveChecklist';

/**
 * Lightweight readiness calculation for home-page trip cards (no Overpass/sector-weather lookup).
 */
export function computeTripReadiness(
  trip: TripProfile,
  physics: PhysicsCalculationResult,
  timeline: ReverseTimelineCalculation,
  lang: 'en' | 'fr'
): RideReadiness {
  const riderSpecs = loadRiderBikeSpecs();
  const activeBike = getActiveBike(riderSpecs);
  const activeStage =
    trip.stages && trip.activeStageIndex !== undefined
      ? trip.stages[trip.activeStageIndex]
      : undefined;
  const departureDate = activeStage?.departureDate || trip.departureDate;

  const vis = calculateRideVisibility(
    trip,
    departureDate,
    timeline.hardDepartureTime,
    physics.effectiveSpeedKmH
  );
  const kit = getKitRecommendation(trip.weather, 'daylight', lang, {
    ridingSpeedKmH: physics.effectiveSpeedKmH,
  });

  const realSurface = trip.route?.terrainSummary?.surfaceBreakdown ?? trip.route?.surfaceBreakdown;
  const gravelPct = realSurface?.gravelPct ?? trip.route?.terrainSummary?.gravelPct;
  const singletrackPct = realSurface?.singletrackPct ?? trip.route?.terrainSummary?.singletrackPct;

  const checklistItems = buildEffectiveChecklist(trip, riderSpecs, lang);
  const criticalItems = checklistItems.filter((c) => c.critical);
  const baseWindKmH = trip.weather?.baseWindSpeedKmH ?? 0;

  return computeRideReadiness({
    lang,
    weather: {
      rainRiskPct: trip.weather?.precipitationRiskPercent ?? 0,
      baseWindKmH,
      gustKmH: trip.weather?.estuaryGustKmH ?? Math.round(baseWindKmH * 1.4),
      headwindKmH:
        trip.weather?.effectiveHeadwindKmH ?? (trip.weather?.isHeadwindActive ? baseWindKmH : 0),
      feelsLikeC: kit.feelsLikeC ?? trip.weather?.temperatureC ?? 14,
    },
    bike: {
      name: activeBike.name,
      category: activeBike.bikeCategory,
      tireWidthMm: activeBike.tireWidthMm ?? 32,
      isTubeless: activeBike.isTubeless,
    },
    terrain: {
      hasSurfaceData: gravelPct !== undefined || singletrackPct !== undefined,
      gravelPct: gravelPct ?? 0,
      singletrackPct: singletrackPct ?? 0,
      suitabilityLevel: realSurface?.suitability?.overallLevel,
    },
    effort: {
      ftpPercent: physics.ftpPercent ?? 70,
      movingHours: Math.max(0.25, (physics.movingTimeSeconds || 3600) / 3600),
      powerZone: physics.powerZone,
      riderLevel: riderSpecs.riderLevel,
    },
    checklist: {
      total: checklistItems.length,
      checked: checklistItems.filter((c) => c.checked).length,
      criticalTotal: criticalItems.length,
      criticalChecked: criticalItems.filter((c) => c.checked).length,
    },
    light: {
      nightPercent: vis.nightPercent,
      twilightPercent: vis.twilightPercent,
    },
    route: {
      worstSeverity: 'clear',
      issueCount: 0,
    },
    goStatus: physics.goStatus,
  });
}
