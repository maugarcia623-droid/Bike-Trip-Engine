import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStageSlicesToTrip,
  clampAndSortCuts,
  computeDefaultCutDistances,
  extractFullTourSpine,
  findNearestDistanceOnSpine,
  interpolateCoordAtDistance,
  mergeTourStagesToSingleDay,
  moveSingleCut,
  sliceRouteIntoStagePreviews,
  suggestDayCount,
} from '../gpxSlicer';
import { exportStageToGpx } from '../gpxExporter';
import { addNextStage } from '../stageManager';
import { condensePlaceLabel } from '../../services/overnightFinder';
import type { ElevationProfilePoint, TripProfile } from '../../types/trip';

/** Builds a realistic 400 km Brittany/Loire GPX trip with a big hilly Day-2 middle section. */
function make400KmKomootTrip(options?: { hillyMiddle?: boolean }): TripProfile {
  const totalKm = 400;
  const count = 201; // 2 km per point
  const coords: [number, number][] = [];
  const profile: ElevationProfilePoint[] = [];

  for (let i = 0; i < count; i++) {
    const distKm = (i / (count - 1)) * totalKm;
    // Westward trajectory across Brittany: Nantes -> Brest-ish
    const lat = 47.22 + (i / (count - 1)) * 1.15;
    const lng = -1.55 - (i / (count - 1)) * 2.85;
    coords.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);

    let eleM = 30;
    if (options?.hillyMiddle) {
      // Flat first 150 km, big mountain climbs between km 150 and 260, flat finish
      if (distKm >= 150 && distKm <= 260) {
        const phase = ((distKm - 150) / 110) * Math.PI * 4;
        eleM = 60 + Math.abs(Math.sin(phase)) * 620;
      } else {
        eleM = 35 + Math.sin(distKm * 0.08) * 12;
      }
    } else {
      eleM = 40 + Math.sin(distKm * 0.07) * 55 + Math.cos(distKm * 0.19) * 28;
    }

    let gradePct = 0;
    if (i > 0) {
      const prev = profile[i - 1];
      gradePct = Number((((eleM - prev.eleM) / ((distKm - prev.distKm) * 1000)) * 100).toFixed(1));
    }
    profile.push({
      distKm: Number(distKm.toFixed(2)),
      eleM: Number(eleM.toFixed(1)),
      gradePct,
    });
  }

  return {
    id: 'komoot-400-test',
    name: 'Nantes → Finistère Bikepacking',
    tag: 'BIKEPACKING',
    description: 'Single-day free-tier Komoot export',
    departureDate: '2026-07-10',
    departureTime: '08:30',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 11,
      gearWeightKg: 8,
      luggageWeightKg: 8,
      cda: 0.38,
      crr: 0.0055,
      rho: 1.225,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.8,
    },
    route: {
      origin: 'Nantes',
      destination: 'Brest',
      originCoords: coords[0],
      destCoords: coords[coords.length - 1],
      distanceKm: totalKm,
      elevationGainM: options?.hillyMiddle ? 2800 : 1850,
      elevationLossM: options?.hillyMiddle ? 2750 : 1820,
      targetSpeedKmH: 20,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      routeMode: 'gpx',
      gpxFileName: 'komoot-400km.gpx',
      coordinates: coords,
      elevationProfile: profile,
    },
    office: {
      shiftStartTime: '18:00',
      targetGateArrivalTime: '18:00',
      gateName: 'Brest',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      source: 'live',
      effectiveHeadwindKmH: 14,
      isHeadwindActive: true,
      baseWindSpeedKmH: 20,
      windDirection: 'headwind',
      windDirectionDegrees: 280,
      temperatureC: 22,
      precipitationRiskPercent: 60,
      estuaryGustKmH: 32,
      visibilityKm: 12,
      weatherCode: 61,
      targetTimestampFormatted: '2026-07-10T09:00',
    },
    checklist: [],
  };
}

describe('gpxSlicer.ts — Multi-Day Komoot/GPX Slicer Engine', () => {
  it('recommends realistic bikepacking day counts based on distance & climbing', () => {
    assert.equal(suggestDayCount(130, 600), 2);
    assert.equal(suggestDayCount(400, 1800), 3);
    assert.equal(suggestDayCount(410, 5200), 4);
    assert.equal(suggestDayCount(950, 8000), 9);
  });

  it('balances hilly days shorter in effort mode vs equal-km mode', () => {
    const hillyTrip = make400KmKomootTrip({ hillyMiddle: true });
    const spine = extractFullTourSpine(hillyTrip);
    assert.ok(spine, 'Expected valid tour spine');

    const distCuts = computeDefaultCutDistances(spine, 3, 'distance');
    const effortCuts = computeDefaultCutDistances(spine, 3, 'effort');

    assert.equal(distCuts.length, 2);
    assert.equal(effortCuts.length, 2);

    // Distance mode gives ~133.3 km each
    const distMiddleLen = distCuts[1] - distCuts[0];
    assert.ok(Math.abs(distMiddleLen - 133.3) < 1.5, `Expected ~133 km middle, got ${distMiddleLen}`);

    // Effort mode must shorten the mountainous middle section relative to flat Day 1 / Day 3
    const effortDay1 = effortCuts[0];
    const effortDay2 = effortCuts[1] - effortCuts[0];
    assert.ok(
      effortDay2 < effortDay1,
      `Expected mountainous Day 2 (${effortDay2} km) to be shorter than flat Day 1 (${effortDay1} km)`
    );
  });

  it('enforces non-crossing cut boundaries when dragging handles', () => {
    const cuts = [130, 265];
    const pushedPastNext = moveSingleCut(cuts, 0, 310, 400);
    assert.ok(pushedPastNext[0] < pushedPastNext[1], 'Cut 1 must stay strictly before Cut 2');
    assert.ok(pushedPastNext[1] - pushedPastNext[0] >= 10, 'Minimum stage gap preserved');

    const clamped = clampAndSortCuts([-10, 420, 200], 400);
    assert.equal(clamped.length, 3);
    assert.ok(clamped[0] >= 10);
    assert.ok(clamped[0] < clamped[1] && clamped[1] < clamped[2]);
    assert.ok(clamped[2] <= 390);
  });

  it('slices a 400 km GPX trace into 3 contiguous stages with exact boundary continuity & Day 2+ weather reset', () => {
    const trip = make400KmKomootTrip();
    const spine = extractFullTourSpine(trip)!;
    const cuts = computeDefaultCutDistances(spine, 3, 'distance');

    const previews = sliceRouteIntoStagePreviews(spine, cuts, {
      startDateIso: '2026-07-10',
      dailyStartTime: '08:30',
      physics: trip.physics,
      targetSpeedKmH: 20,
      weather: trip.weather,
      lang: 'en',
      cutLabels: { 0: 'Redon', 1: 'Pontivy' },
      cutAccommodationNotes: { 0: 'Camp · Camping Municipal (0.4 km off route)' },
    });

    assert.equal(previews.length, 3);
    assert.equal(previews[0].originLabel, 'Nantes');
    assert.equal(previews[0].destLabel, 'Redon');
    assert.equal(previews[1].originLabel, 'Redon');
    assert.equal(previews[1].destLabel, 'Pontivy');
    assert.equal(previews[2].originLabel, 'Pontivy');
    assert.equal(previews[2].destLabel, 'Brest');

    // Sum of stage distances matches 400 km within 0.3 km rounding
    const totalSlicedKm = previews.reduce((acc, s) => acc + s.distanceKm, 0);
    assert.ok(Math.abs(totalSlicedKm - 400) < 0.3, `Total sliced km ${totalSlicedKm} != 400`);

    // Exact coordinate continuity: Day 1 end === Day 2 start, Day 2 end === Day 3 start
    assert.deepEqual(previews[0].destCoords, previews[1].originCoords);
    assert.deepEqual(previews[1].destCoords, previews[2].originCoords);

    // Every stage elevation profile starts at distKm === 0
    for (const p of previews) {
      assert.equal(p.elevationProfile[0].distKm, 0);
      assert.ok(p.elevationProfile.length >= 24);
      assert.ok(p.movingTimeMinutes > 180);
      assert.match(p.sunsetHHMM, /^\d{2}:\d{2}$/);
    }

    // Commit to TripProfile
    const slicedTrip = applyStageSlicesToTrip(trip, spine, previews);
    assert.equal(slicedTrip.tag, 'BIKEPACKING');
    assert.equal(slicedTrip.arriveAtMode, false);
    assert.equal(slicedTrip.stages?.length, 3);
    assert.equal(slicedTrip.activeStageIndex, 0);
    assert.equal(slicedTrip.stages![0].departureDate, '2026-07-10');
    assert.equal(slicedTrip.stages![1].departureDate, '2026-07-11');
    assert.equal(slicedTrip.stages![2].departureDate, '2026-07-12');
    assert.equal(slicedTrip.stages![0].accommodationNote, 'Camp · Camping Municipal (0.4 km off route)');

    // Day 1 retains original date live weather; Day 2 & Day 3 MUST reset to simulated weather
    assert.equal(slicedTrip.stages![0].weather.source, 'live');
    assert.equal(slicedTrip.stages![1].weather.source, 'simulated');
    assert.equal(slicedTrip.stages![2].weather.source, 'simulated');
    assert.equal(slicedTrip.stages![1].weather.weatherCode, undefined);
    assert.notEqual(slicedTrip.stages![1].weather.precipitationRiskPercent, 60);

    // Per-stage GPX export generates valid standalone GPX for Day 2
    const day2Gpx = exportStageToGpx(slicedTrip, 1);
    assert.ok(day2Gpx.includes('<gpx version="1.1"'));
    assert.ok(day2Gpx.includes('Day 2 (Redon → Pontivy)'));
    assert.ok(day2Gpx.includes('<trkpt '));

    // Re-extracting full spine from the already-sliced 3-day tour reconstructs 400 km & existing cuts!
    const reconstructed = extractFullTourSpine(slicedTrip)!;
    assert.ok(Math.abs(reconstructed.totalDistanceKm - 400) < 0.4);
    assert.equal(reconstructed.initialCutDistancesKm?.length, 2);
    assert.deepEqual(reconstructed.initialCutLabels, ['Redon', 'Pontivy']);
    assert.equal(reconstructed.originLabel, 'Nantes');
    assert.equal(reconstructed.destLabel, 'Brest');

    // Merging back into 1 day restores single-stage route cleanly
    const merged = mergeTourStagesToSingleDay(slicedTrip);
    assert.equal(merged.stages, undefined);
    assert.ok(Math.abs(merged.route.distanceKm - 400) < 0.4);
    assert.equal(merged.route.origin, 'Nantes');
    assert.equal(merged.route.destination, 'Brest');
  });

  it('projects geographic clicks onto the constrained route window accurately', () => {
    const trip = make400KmKomootTrip();
    const spine = extractFullTourSpine(trip)!;
    const midCoord = interpolateCoordAtDistance(spine, 200);
    const projected = findNearestDistanceOnSpine(spine, midCoord[0] + 0.01, midCoord[1], 100, 300);
    assert.ok(Math.abs(projected.distKm - 200) < 3, `Expected ~200 km, got ${projected.distKm}`);
    assert.ok(projected.offRouteKm < 2);
  });

  it('condenses verbose street reverse-geocodes down to crisp town labels', () => {
    assert.equal(condensePlaceLabel('Rue de la Gare (Redon)'), 'Redon');
    assert.equal(condensePlaceLabel('12 Avenue Jean Jaurès, Vannes'), 'Vannes');
    assert.equal(condensePlaceLabel('47.2184°N, -1.5536°E'), '');
    assert.equal(condensePlaceLabel('La Roche-Bernard'), 'La Roche-Bernard');
  });

  it('extracts Day 1 full GPX spine even when an empty Day 2 placeholder stage is active', () => {
    const trip = make400KmKomootTrip();
    const withEmptyDay2 = addNextStage(trip);
    assert.equal(withEmptyDay2.activeStageIndex, 1);
    assert.equal(withEmptyDay2.route.coordinates, undefined);

    const spine = extractFullTourSpine(withEmptyDay2);
    assert.ok(spine, 'Expected spine to be extracted from Day 1 while Day 2 is active');
    assert.equal(spine.totalDistanceKm, 400);
    assert.equal(spine.initialCutDistancesKm, undefined);
    assert.equal(spine.originLabel, 'Nantes');
    assert.equal(spine.destLabel, 'Brest');
  });
});
