import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWaterGaps,
  computeCumulativeDistances,
  snapToPolyline,
} from '../../services/overpassCorridor';
import type { StageAmenity } from '../../types/amenities';

describe('overpassCorridor.ts', () => {
  it('snapToPolyline snaps to nearest vertex, computes routeKm/detourMeters, and matches elevation', () => {
    const coords: [number, number][] = [
      [47.2184, -1.5536],
      [47.25, -1.45],
      [47.28, -1.35],
    ];
    const cumMeters = computeCumulativeDistances(coords);
    const elev = [
      { distKm: 0, eleM: 12 },
      { distKm: Math.round((cumMeters[1] / 1000) * 10) / 10, eleM: 48 },
      { distKm: Math.round((cumMeters[2] / 1000) * 10) / 10, eleM: 22 },
    ];

    // Query point right next to vertex 1
    const snapped = snapToPolyline(47.2505, -1.45, coords, cumMeters, elev);

    assert.equal(snapped.nearestIdx, 1);
    assert.equal(snapped.routeKm, Number((cumMeters[1] / 1000).toFixed(1)));
    assert.ok(snapped.detourMeters > 0 && snapped.detourMeters < 150);
    assert.equal(snapped.elevationMeters, 48);
  });

  it('calculateWaterGaps flags >60 km without water as critical and ignores non-water amenities', () => {
    const amenities: StageAmenity[] = [
      {
        id: 'cafe-1',
        name: 'Midway Cafe',
        category: 'food',
        subType: 'cafe',
        lat: 47.25,
        lon: -1.45,
        routeKm: 40,
        detourMeters: 20,
      },
    ];

    const summary = calculateWaterGaps(amenities, 80, {
      sectorSpeedKmH: 25,
      targetFluidMlPerHr: 500,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });

    assert.equal(summary.totalWaterPoints, 0);
    assert.equal(summary.status, 'critical');
    assert.equal(summary.maxGapKm, 80);
    assert.equal(summary.criticalGaps.length, 1);
  });

  it('calculateWaterGaps classifies gaps physiologically by onboard bidon depletion', () => {
    const waterStops: StageAmenity[] = [
      {
        id: 'w1',
        name: 'Town Fountain',
        category: 'water',
        subType: 'drinking_water',
        lat: 47.25,
        lon: -1.45,
        routeKm: 30,
        detourMeters: 10,
      },
      {
        id: 'w2',
        name: 'Cemetery Tap',
        category: 'cemetery',
        subType: 'cemetery',
        lat: 47.28,
        lon: -1.35,
        routeKm: 60,
        detourMeters: 10,
      },
    ];

    // 30 km @ 25 km/h = 1.2 h * 700 mL/h = 840 mL; 2x650 mL = 1300 mL -> 65% depletion (caution)
    const cautionSummary = calculateWaterGaps(waterStops, 90, {
      sectorSpeedKmH: 25,
      targetFluidMlPerHr: 700,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });

    assert.equal(cautionSummary.totalWaterPoints, 2);
    assert.equal(cautionSummary.status, 'caution');
    assert.equal(cautionSummary.cautionGaps.length, 3);

    // Same route with lower fluid need (400 mL/h -> 480 mL / 1300 mL = 37%) -> clear
    const clearSummary = calculateWaterGaps(waterStops, 90, {
      sectorSpeedKmH: 25,
      targetFluidMlPerHr: 400,
      bidonSizeMl: 650,
      frameBottleSlots: 2,
    });
    assert.equal(clearSummary.status, 'clear');
  });
});
