import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findToolEntryById,
  getToolPath,
  parseToolFromLocation,
} from '../toolCatalog';
import {
  buildStemStickerData,
  STEM_STICKER_PRESETS,
} from '../stemSticker';
import {
  calculateHumanWindImpact,
  calculateTripWindInsight,
  formatElevationRealWorldScale,
} from '../windInsights';
import {
  buildTripFromToolRoute,
  DEMO_TOOL_ROUTES,
  isUserCreatedTrip,
} from '../../data/demoToolRoutes';
import { StageAmenity } from '../../types/amenities';

describe('toolCatalog URL routing, windInsights, and stemSticker generator', () => {
  it('resolves clean /tools paths and legacy aliases', () => {
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/tools', search: '', hash: '' }),
      { isToolsRoute: true, toolId: 'hub' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/tools/fuel-plan', search: '', hash: '' }),
      { isToolsRoute: true, toolId: 'fuel-plan' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/tools/flip-my-loop/', search: '', hash: '' }),
      { isToolsRoute: true, toolId: 'flip-my-loop' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/tools/stem-sticker', search: '', hash: '' }),
      { isToolsRoute: true, toolId: 'stem-sticker' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/', search: '?tool=pressure', hash: '' }),
      { isToolsRoute: true, toolId: 'tyre-pressure' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/', search: '?tool=wind', hash: '' }),
      { isToolsRoute: true, toolId: 'wind' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/', search: '', hash: '#tools' }),
      { isToolsRoute: true, toolId: 'hub' }
    );
    assert.deepEqual(
      parseToolFromLocation({ pathname: '/', search: '', hash: '' }),
      { isToolsRoute: false, toolId: 'hub' }
    );
  });

  it('returns canonical clean URLs for every catalog entry', () => {
    assert.equal(getToolPath('hub'), '/tools');
    assert.equal(getToolPath('fuel-plan'), '/tools/fuel-plan');
    assert.equal(getToolPath('flip-my-loop'), '/tools/flip-my-loop');
    assert.equal(getToolPath('water-bakery'), '/tools/water-bakery');
    assert.equal(getToolPath('stem-sticker'), '/tools/stem-sticker');
    assert.equal(getToolPath('tyre-pressure'), '/tools/tyre-pressure');
    assert.equal(getToolPath('what-to-wear'), '/tools/what-to-wear');
    assert.equal(getToolPath('leave-by'), '/tools/leave-by');
    assert.equal(getToolPath('wind'), '/tools/wind-cost');
    assert.ok(findToolEntryById('pressure')?.id === 'tyre-pressure');
  });

  it('distinguishes bundled preset trips from user-created trips', () => {
    const ventoux = DEMO_TOOL_ROUTES.find((d) => d.id === 'mont-ventoux-bedoin')!;
    const userTrip = buildTripFromToolRoute({
      parsed: ventoux.parsed,
      lang: 'en',
    });
    assert.equal(isUserCreatedTrip(userTrip), true);

    const presetTrip = { ...userTrip, id: 'escapade-clisson-spa' };
    assert.equal(isUserCreatedTrip(presetTrip), false);
    assert.equal(isUserCreatedTrip(null), false);
  });

  it('produces bounded, chronologically sorted cue rows and respects explicit stop selection', () => {
    const ventoux = DEMO_TOOL_ROUTES.find((d) => d.id === 'mont-ventoux-bedoin')!;
    const trip = buildTripFromToolRoute({
      parsed: ventoux.parsed,
      speedKmH: 20,
      departureTime: '08:00',
      lang: 'en',
    });

    const mockStops: StageAmenity[] = [
      {
        id: 'stop-a',
        name: 'Boulangerie A',
        category: 'food',
        subType: 'bakery',
        lat: 44.14,
        lon: 5.21,
        routeKm: 10,
        detourMeters: 20,
      },
      {
        id: 'stop-b',
        name: 'Fontaine B',
        category: 'water',
        subType: 'drinking_water',
        lat: 44.16,
        lon: 5.26,
        routeKm: 28,
        detourMeters: 10,
      },
    ];

    const selectiveData = buildStemStickerData({
      trip,
      presetId: 'gravel',
      amenities: mockStops,
      selectedAmenityIds: ['stop-b'],
      customNotes: [{ id: 'c1', km: 15.2, label: 'Chalet Reynard Coffee' }],
      lang: 'en',
    });

    assert.equal(selectiveData.rows[0].kind, 'start');
    assert.equal(selectiveData.rows[selectiveData.rows.length - 1].kind, 'finish');
    assert.ok(selectiveData.rows.length <= STEM_STICKER_PRESETS.gravel.maxRows);
    assert.ok(selectiveData.rows.some((r) => r.kind === 'climb'), 'Expected climb row on Mont Ventoux');
    assert.ok(
      selectiveData.rows.some((r) => r.title.includes('Chalet Reynard')),
      'Expected custom note on sticker'
    );
    assert.ok(
      selectiveData.rows.some((r) => r.title.includes('Fontaine B')),
      'Expected explicitly selected stop on sticker'
    );
    assert.ok(
      !selectiveData.rows.some((r) => r.title.includes('Boulangerie A')),
      'Unselected stop must not be auto-added when selectedAmenityIds is provided'
    );

    for (let i = 1; i < selectiveData.rows.length; i++) {
      assert.ok(
        selectiveData.rows[i].km >= selectiveData.rows[i - 1].km,
        `Rows must be sorted by km (${selectiveData.rows[i - 1].km} <= ${selectiveData.rows[i].km})`
      );
    }
  });

  it('translates headwind and tailwind into human invisible-hill metrics and compass advice', () => {
    const headwind = calculateHumanWindImpact({
      distanceKm: 40,
      targetSpeedKmH: 25,
      riderWeightKg: 74,
      bikeWeightKg: 10,
      cda: 0.38,
      crr: 0.006,
      windSpeedKmH: 22,
      windRelativeAngleDeg: 0,
      windFromDegrees: 245,
      lang: 'en',
    });

    assert.ok(headwind.equivalentGradePct > 1.5, 'Headwind should create a positive invisible hill grade');
    assert.ok(headwind.ghostElevationM > 500, 'Expected substantial ghost climbing over 40 km');
    assert.ok(headwind.sameEffortSpeedKmH < 25, 'Same effort speed must drop in headwind');
    assert.ok(headwind.timeDeltaMin > 5, 'Headwind should add moving minutes at same effort');
    assert.ok(headwind.extraWindKcal > 100, 'Extra wind burn must be positive and separate from total');
    assert.equal(headwind.totalRideKcal - headwind.calmRideKcal, headwind.extraWindKcal);
    assert.equal(headwind.outboundIntoWindCardinal, 'WSW');
    assert.equal(headwind.returnTailwindCardinal, 'ENE');
    assert.ok(
      headwind.iconicClimbComparison && headwind.iconicClimbComparison.length > 0,
      'Expected iconic climb comparison for substantial ghost climbing'
    );

    const tailwind = calculateHumanWindImpact({
      distanceKm: 40,
      targetSpeedKmH: 25,
      riderWeightKg: 74,
      bikeWeightKg: 10,
      cda: 0.38,
      crr: 0.006,
      windSpeedKmH: 22,
      windRelativeAngleDeg: 180,
      lang: 'en',
    });

    assert.ok(tailwind.equivalentGradePct < 0, 'Tailwind should act like a negative downhill grade');
    assert.ok(tailwind.sameEffortSpeedKmH > 25, 'Tailwind should boost same-effort speed');
    assert.ok(tailwind.timeDeltaMin < 0, 'Tailwind should save riding minutes');
  });

  it('calculateTripWindInsight derives Invisible Hill ghost climbing from trip weather', () => {
    const res = calculateTripWindInsight({
      distanceKm: 50,
      targetSpeedKmH: 25,
      windSpeedKmH: 24,
      effectiveHeadwindKmH: 22,
      windDirection: 'headwind',
      windFromDegrees: 270,
      temperatureC: 14,
      lang: 'fr',
    });
    assert.ok(res.equivalentGradePct > 1.5, 'Expected clear positive invisible grade');
    assert.ok(res.ghostElevationM > 600, 'Expected substantial ghost elevation');
    assert.ok(res.iconicClimbComparison && res.iconicClimbComparison.length > 0);
    assert.equal(res.outboundIntoWindCardinal, 'O');
  });

  it('formatElevationRealWorldScale puts every climbing height into vivid real-life context', () => {
    assert.equal(formatElevationRealWorldScale(5, 'en'), null);
    assert.match(formatElevationRealWorldScale(27, 'en')!, /flights of stairs/);
    assert.match(formatElevationRealWorldScale(27, 'fr')!, /étages d’escaliers/);
    assert.match(formatElevationRealWorldScale(50, 'en')!, /Arc de Triomphe/);
    assert.match(formatElevationRealWorldScale(95, 'en')!, /Statue of Liberty/);
    assert.match(formatElevationRealWorldScale(135, 'en')!, /Montmartre/);
    assert.match(formatElevationRealWorldScale(310, 'en')!, /Eiffel Tower/);
    assert.match(formatElevationRealWorldScale(1071, 'en')!, /Alpe d’Huez/);
    assert.match(formatElevationRealWorldScale(1610, 'fr')!, /Mont Ventoux/);
  });
});
