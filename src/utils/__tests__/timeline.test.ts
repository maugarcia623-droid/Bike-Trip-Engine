import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateReverseTimeline, isOffHoursCommercialWindow } from '../timeline';
import type { RouteParams, OfficeConstraints, WeatherCondition } from '../../types/trip';
import type { StageAmenity } from '../../types/amenities';

const BASE_WEATHER: WeatherCondition = {
  isHeadwindActive: false,
  baseWindSpeedKmH: 5,
  windDirection: 'calm',
  windDirectionDegrees: 0,
  temperatureC: 16,
  precipitationRiskPercent: 0,
  estuaryGustKmH: 10,
  visibilityKm: 10,
};

const BASE_OFFICE: OfficeConstraints = {
  shiftStartTime: '09:00',
  targetGateArrivalTime: '08:30',
  gateName: 'Main Gate',
  lockerRefuelMinutes: 10,
  showerChangeMinutes: 10,
  breakRoomBreakfastMinutes: 10,
  strictNoFoodInOpenSpace: false,
  badgeRequiredForGate: false,
  notes: '',
};

function makeRoute(overrides: Partial<RouteParams> = {}): RouteParams {
  return {
    origin: 'Start',
    destination: 'Finish',
    distanceKm: 30,
    targetSpeedKmH: 30,
    elevationGainM: 100,
    urbanTrafficDelayMinutes: 5,
    gateSecurityDelayMinutes: 5,
    ...overrides,
  };
}

describe('timeline.ts commercial waypoint off-hours handling', () => {
  it('detects [19:00, 07:00) as off-hours commercial window', () => {
    assert.equal(isOffHoursCommercialWindow('18:59'), false);
    assert.equal(isOffHoursCommercialWindow('19:00'), true);
    assert.equal(isOffHoursCommercialWindow('23:45'), true);
    assert.equal(isOffHoursCommercialWindow('00:00'), true);
    assert.equal(isOffHoursCommercialWindow('06:59'), true);
    assert.equal(isOffHoursCommercialWindow('07:00'), false);
    assert.equal(isOffHoursCommercialWindow('12:30'), false);
  });

  it('replaces commute coffee-stop with Self-Supported Fuel Stop between 19:00 and 07:00', () => {
    const evening = calculateReverseTimeline(
      makeRoute(),
      BASE_OFFICE,
      BASE_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      ['coffee-stop'],
      {
        effectiveSpeedKmH: 30,
        calmSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '19:15',
      }
    );
    const eveningCoffee = evening.steps.find((s) => s.id === 'commute-coffee-pause');
    assert.ok(eveningCoffee);
    assert.equal(eveningCoffee.title, 'Self-Supported Fuel Stop');

    const earlyMorning = calculateReverseTimeline(
      makeRoute(),
      BASE_OFFICE,
      BASE_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      ['coffee-stop'],
      {
        effectiveSpeedKmH: 30,
        calmSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '05:30',
      }
    );
    const earlyCoffee = earlyMorning.steps.find((s) => s.id === 'commute-coffee-pause');
    assert.ok(earlyCoffee);
    assert.equal(earlyCoffee.title, 'Self-Supported Fuel Stop');

    const daytime = calculateReverseTimeline(
      makeRoute(),
      BASE_OFFICE,
      BASE_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      ['coffee-stop'],
      {
        effectiveSpeedKmH: 30,
        calmSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '08:00',
      }
    );
    const dayCoffee = daytime.steps.find((s) => s.id === 'commute-coffee-pause');
    assert.ok(dayCoffee);
    assert.equal(dayCoffee.title, 'Cafe Waypoint & Espresso Pause');
  });

  it('replaces bikepacking bakery resupply-points with Self-Supported Fuel Stop between 19:00 and 07:00', () => {
    const nightBp = calculateReverseTimeline(
      makeRoute({ distanceKm: 60, targetSpeedKmH: 20 }),
      BASE_OFFICE,
      BASE_WEATHER,
      'BIKEPACKING',
      'Bivouac',
      'en',
      0,
      ['resupply-points'],
      {
        effectiveSpeedKmH: 20,
        calmSpeedKmH: 20,
        arriveAtMode: false,
        departureTime: '20:00',
      }
    );
    const nightResupply = nightBp.steps.find((s) => s.id === 'bp-resupply-stop');
    assert.ok(nightResupply);
    assert.equal(nightResupply.title, 'Self-Supported Fuel Stop');

    const dayBp = calculateReverseTimeline(
      makeRoute({ distanceKm: 60, targetSpeedKmH: 20 }),
      BASE_OFFICE,
      BASE_WEATHER,
      'BIKEPACKING',
      'Bivouac',
      'en',
      0,
      ['resupply-points'],
      {
        effectiveSpeedKmH: 20,
        calmSpeedKmH: 20,
        arriveAtMode: false,
        departureTime: '10:00',
      }
    );
    const dayResupply = dayBp.steps.find((s) => s.id === 'bp-resupply-stop');
    assert.ok(dayResupply);
    assert.equal(dayResupply.title, 'Village Bakery & Spring Water Resupply');
  });

  it('handles pinned amenities and route waypoints based on calculated arrival time', () => {
    const pinnedAmenities: StageAmenity[] = [
      {
        id: 'node/bakery-1',
        category: 'food',
        subType: 'bakery',
        name: 'Boulangerie du Port',
        lat: 47.2,
        lon: -1.5,
        routeKm: 15,
        detourMeters: 50,
        isPinned: true,
      },
      {
        id: 'node/water-1',
        category: 'water',
        subType: 'drinking_water',
        name: 'Village Fountain',
        lat: 47.21,
        lon: -1.51,
        routeKm: 20,
        detourMeters: 10,
        isPinned: true,
      },
      {
        id: 'node/bike-shop-1',
        category: 'mechanix',
        subType: 'bicycle',
        name: 'Cycles du Centre',
        lat: 47.22,
        lon: -1.52,
        routeKm: 25,
        detourMeters: 80,
        isPinned: true,
      },
    ];

    const route = makeRoute({
      distanceKm: 30,
      targetSpeedKmH: 30,
      waypoints: [
        {
          id: 'wp-roastery',
          name: 'Blue Bottle Roastery',
          distanceFromStartKm: 10,
        },
      ],
    });

    // Depart 19:30 -> all stops arrive between 19:50 and 20:20
    const nightTimeline = calculateReverseTimeline(
      route,
      BASE_OFFICE,
      BASE_WEATHER,
      'ESCAPADE',
      'Hotel',
      'en',
      0,
      [],
      {
        effectiveSpeedKmH: 30,
        calmSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '19:30',
        pinnedAmenities,
      }
    );

    const roasteryStep = nightTimeline.steps.find((s) => s.id === 'intermediate-stop-wp-wp-roastery');
    assert.ok(roasteryStep);
    assert.equal(roasteryStep.title, 'Self-Supported Fuel Stop');
    assert.equal(roasteryStep.location, 'KM 10.0');

    const bakeryStep = nightTimeline.steps.find((s) => s.id === 'intermediate-stop-poi-node/bakery-1');
    assert.ok(bakeryStep);
    assert.equal(bakeryStep.title, 'Self-Supported Fuel Stop');
    assert.equal(bakeryStep.location, 'KM 15.0');

    // Public water fountain stays intact at night
    const waterStep = nightTimeline.steps.find((s) => s.id === 'intermediate-stop-poi-node/water-1');
    assert.ok(waterStep);
    assert.equal(waterStep.title, 'Village Fountain');

    // Closed non-food retail shop (bicycle shop) is removed from schedule
    const bikeShopStep = nightTimeline.steps.find((s) => s.id === 'intermediate-stop-poi-node/bike-shop-1');
    assert.equal(bikeShopStep, undefined);

    // Depart 10:00 -> all commercial waypoints stay open
    const dayTimeline = calculateReverseTimeline(
      route,
      BASE_OFFICE,
      BASE_WEATHER,
      'ESCAPADE',
      'Hotel',
      'en',
      0,
      [],
      {
        effectiveSpeedKmH: 30,
        calmSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '10:00',
        pinnedAmenities,
      }
    );

    assert.equal(
      dayTimeline.steps.find((s) => s.id === 'intermediate-stop-wp-wp-roastery')?.title,
      'Blue Bottle Roastery'
    );
    assert.equal(
      dayTimeline.steps.find((s) => s.id === 'intermediate-stop-poi-node/bakery-1')?.title,
      'Boulangerie du Port'
    );
    assert.equal(
      dayTimeline.steps.find((s) => s.id === 'intermediate-stop-poi-node/bike-shop-1')?.title,
      'Cycles du Centre'
    );
  });
});

describe('timeline.ts severe headwind warning', () => {
  const HEADWIND_WEATHER: WeatherCondition = {
    ...BASE_WEATHER,
    isHeadwindActive: true,
    baseWindSpeedKmH: 45,
    windDirection: 'headwind',
  };

  it('triggers severeHeadwindWarning and train/reconsider copy when penalty > 45 min on route < 100 km', () => {
    // 80 km @ 25 km/h calm = 192 min; @ 18 km/h effective = 267 min -> +75 min penalty
    const res = calculateReverseTimeline(
      makeRoute({ distanceKm: 80, targetSpeedKmH: 25 }),
      BASE_OFFICE,
      HEADWIND_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      [],
      {
        calmSpeedKmH: 25,
        effectiveSpeedKmH: 18,
      }
    );

    assert.equal(res.weatherHeadwindImpactMinutes, 75);
    assert.equal(res.severeHeadwindWarning, true);

    const transitStep = res.steps.find((s) => s.id === 'estuary-transit');
    assert.ok(transitStep);
    assert.equal(transitStep.isCrucialCheckpoint, true);
    assert.equal(transitStep.iconName, 'AlertTriangle');
    assert.match(transitStep.description, /reconsidering the route or taking the train/i);
    assert.equal(/low riding posture/i.test(transitStep.description), false);
  });

  it('keeps low posture advice when penalty is <= 45 min on route < 100 km', () => {
    // 30 km @ 25 km/h calm = 72 min; @ 20 km/h effective = 90 min -> +18 min penalty
    const res = calculateReverseTimeline(
      makeRoute({ distanceKm: 30, targetSpeedKmH: 25 }),
      BASE_OFFICE,
      HEADWIND_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      [],
      {
        calmSpeedKmH: 25,
        effectiveSpeedKmH: 20,
      }
    );

    assert.equal(res.weatherHeadwindImpactMinutes, 18);
    assert.equal(res.severeHeadwindWarning, false);

    const transitStep = res.steps.find((s) => s.id === 'estuary-transit');
    assert.ok(transitStep);
    assert.equal(transitStep.iconName, 'Wind');
    assert.match(transitStep.description, /low riding posture/i);
  });

  it('does not trigger severeHeadwindWarning when route is >= 100 km', () => {
    // 100 km @ 25 km/h calm = 240 min; @ 18 km/h effective = 333 min -> +93 min penalty, but >= 100 km
    const res = calculateReverseTimeline(
      makeRoute({ distanceKm: 100, targetSpeedKmH: 25 }),
      BASE_OFFICE,
      HEADWIND_WEATHER,
      'VÉLOTAF',
      'Office',
      'en',
      0,
      [],
      {
        calmSpeedKmH: 25,
        effectiveSpeedKmH: 18,
      }
    );

    assert.equal(res.weatherHeadwindImpactMinutes, 93);
    assert.equal(res.severeHeadwindWarning, false);
  });
});

describe('timeline.ts Single Day vs Multi-Day Tour nutrition alerts', () => {
  it('strips Palate Reset alerts and emits Carb Intake reminders every 45 min on Single Day rides', () => {
    // 90 km @ 30 km/h = 180 min moving (+ 10 min buffers = 190 min total)
    const singleDay = calculateReverseTimeline(
      makeRoute({ distanceKm: 90, targetSpeedKmH: 30, urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0 }),
      BASE_OFFICE,
      BASE_WEATHER,
      'SPORT',
      'Finish',
      'en',
      0,
      [],
      {
        calmSpeedKmH: 30,
        effectiveSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '08:00',
        movingTimeSeconds: 180 * 60,
        isMultiDayTour: false,
      }
    );

    const palateResets = singleDay.steps.filter((s) => s.id.startsWith('savory-palate-reset-'));
    const carbReminders = singleDay.steps.filter((s) => s.id.startsWith('carb-intake-'));

    assert.equal(palateResets.length, 0);
    assert.deepEqual(
      carbReminders.map((s) => s.id),
      ['carb-intake-45', 'carb-intake-90', 'carb-intake-135']
    );
    assert.equal(carbReminders[0].title, 'Carb Intake (T + 45 min)');
  });

  it('generates Palate Reset alerts only when Multi-Day Tour mode is active', () => {
    const multiDay = calculateReverseTimeline(
      makeRoute({ distanceKm: 90, targetSpeedKmH: 30, urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0 }),
      BASE_OFFICE,
      BASE_WEATHER,
      'TOURING',
      'Stage 1 Finish',
      'en',
      0,
      [],
      {
        calmSpeedKmH: 30,
        effectiveSpeedKmH: 30,
        arriveAtMode: false,
        departureTime: '08:00',
        movingTimeSeconds: 180 * 60,
        isMultiDayTour: true,
      }
    );

    const palateResets = multiDay.steps.filter((s) => s.id.startsWith('savory-palate-reset-'));
    const carbReminders = multiDay.steps.filter((s) => s.id.startsWith('carb-intake-'));

    assert.equal(carbReminders.length, 0);
    assert.deepEqual(
      palateResets.map((s) => s.id),
      ['savory-palate-reset-90']
    );
  });
});
