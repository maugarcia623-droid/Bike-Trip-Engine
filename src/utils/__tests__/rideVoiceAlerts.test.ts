import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSimulatedAlert,
  computeFuelingIntervals,
  evaluateProximityAlerts,
  findNextStopAndTurn,
  projectPositionOntoRoute,
} from '../rideVoiceAlerts';
import type { CueSheetEntry } from '../cueSheet';

const sampleCoords: [number, number][] = [
  [47.2184, -1.5536],
  [47.2274, -1.5536], // ~1.0 km north
  [47.2364, -1.5536], // ~2.0 km north
  [47.2454, -1.5536], // ~3.0 km north
];

const sampleCues: CueSheetEntry[] = [
  {
    lat: 47.2184,
    lng: -1.5536,
    distKm: 0,
    instruction: 'Depart Start',
    direction: 'depart',
    shortName: 'Depart',
    cmt: 'KM 0.0',
    desc: 'Start',
    sym: 'Flag, Green',
    typeLabel: 'Start',
    tcxPointType: 'Generic',
  },
  {
    lat: 47.2274,
    lng: -1.5536,
    distKm: 1.0,
    instruction: 'Turn right onto Rue de la Loire',
    direction: 'right',
    shortName: 'Turn right',
    cmt: 'KM 1.0',
    desc: 'Turn right',
    sym: 'Waypoint',
    typeLabel: 'Cue',
    tcxPointType: 'Right',
  },
  {
    lat: 47.2364,
    lng: -1.5536,
    distKm: 2.0,
    instruction: 'Stop: Fontaine du Parc (Water)',
    direction: 'resupply',
    shortName: 'Fontaine du Parc',
    cmt: 'KM 2.0',
    desc: 'Water stop',
    sym: 'Drinking Water',
    typeLabel: 'Water',
    tcxPointType: 'Water',
    amenity: {
      id: 'node/999',
      category: 'water',
      subType: 'drinking_water',
      name: 'Fontaine du Parc',
      lat: 47.2364,
      lon: -1.5536,
      routeKm: 2.0,
      detourMeters: 20,
      isPinned: true,
    },
  },
];

describe('rideVoiceAlerts', () => {
  it('computes physiological fueling intervals for hot/intense, normal, and short rides', () => {
    const hot = computeFuelingIntervals({
      targetFluidMlPerHr: 850,
      carbTargetPerHour: 80,
      isShortRide: false,
    });
    assert.equal(hot.drinkIntervalMin, 12);
    assert.equal(hot.carbIntervalMin, 20);
    assert.equal(hot.primaryCueIntervalMin, 12);

    const moderate = computeFuelingIntervals({
      targetFluidMlPerHr: 500,
      carbTargetPerHour: 50,
      isShortRide: false,
    });
    assert.equal(moderate.drinkIntervalMin, 20);
    assert.equal(moderate.carbIntervalMin, 25);
    assert.equal(moderate.primaryCueIntervalMin, 20);

    const shortRide = computeFuelingIntervals({
      targetFluidMlPerHr: 0,
      carbTargetPerHour: 0,
      isShortRide: true,
    });
    assert.equal(shortRide.drinkIntervalMin, 20);
    assert.equal(shortRide.carbIntervalMin, 0);
    assert.equal(shortRide.primaryCueIntervalMin, 20);
  });

  it('projects GPS position onto route polyline and computes remaining distance', () => {
    const mid = projectPositionOntoRoute(47.2274, -1.5536, sampleCoords, 3.0);
    assert.ok(Math.abs(mid.distanceCoveredKm - 1.0) < 0.05);
    assert.ok(Math.abs(mid.distanceRemainingKm - 2.0) < 0.05);
    assert.equal(mid.offRouteMeters, 0);
  });

  it('finds next upcoming turn and next upcoming resupply stop', () => {
    const next = findNextStopAndTurn(0.5, sampleCues);
    assert.equal(next.nextTurn?.instruction, 'Turn right onto Rue de la Loire');
    assert.equal(next.distanceToTurnKm, 0.5);
    assert.equal(next.nextStop?.amenity?.name, 'Fontaine du Parc');
    assert.equal(next.distanceToStopKm, 1.5);
  });

  it('evaluates proximity alerts and deduplicates triggered keys', () => {
    const triggered = new Set<string>();

    // At 0.8 km: within 250 m of Turn right (at 1.0 km)
    const first = evaluateProximityAlerts({
      distanceCoveredKm: 0.8,
      cueEntries: sampleCues,
      triggeredKeys: triggered,
      lang: 'en',
    });
    assert.equal(first.alerts.length, 1);
    assert.equal(first.alerts[0].kind, 'turn');
    assert.ok(first.alerts[0].spokenText.includes('200 meters'));
    first.newlyTriggeredKeys.forEach((k) => triggered.add(k));

    // Re-evaluating at 0.82 km does not duplicate turn alert
    const repeat = evaluateProximityAlerts({
      distanceCoveredKm: 0.82,
      cueEntries: sampleCues,
      triggeredKeys: triggered,
      lang: 'en',
    });
    assert.equal(repeat.alerts.length, 0);

    // At 1.05 km: within 1 km of Water stop (at 2.0 km), French localization
    const stopApproach = evaluateProximityAlerts({
      distanceCoveredKm: 1.05,
      cueEntries: sampleCues,
      triggeredKeys: triggered,
      lang: 'fr',
    });
    assert.equal(stopApproach.alerts.length, 1);
    assert.equal(stopApproach.alerts[0].kind, 'stop-approach');
    assert.ok(stopApproach.alerts[0].spokenText.includes('Fontaine du Parc'));
  });

  it('builds a simulated alert for indoor testing', () => {
    const sim = buildSimulatedAlert('en', sampleCues[2], sampleCues[1]);
    assert.equal(sim.kind, 'test');
    assert.ok(sim.spokenText.includes('Fontaine du Parc'));
  });
});
