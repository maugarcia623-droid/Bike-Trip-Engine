import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPersonalLensToSharedTrip,
  computeGroupSyncCheck,
  decodePlanShareToken,
  encodePlanShareToken,
  SenderBaseline,
} from '../planShare';
import { buildDefaultNewTripTemplate } from '../storage';
import { DEFAULT_RIDER_BIKE_SPECS, RiderBikeSpecs } from '../../types/specs';

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

describe('planShare v2 Multi-Player Blueprints & Group Sync', () => {
  it('decodes legacy v1 tokens cleanly', () => {
    const legacyPayload = {
      v: 1,
      n: 'Morning Spin',
      tag: 'SPORT',
      o: 'Nantes',
      x: 'Clisson',
      km: 58.4,
      el: 420,
      sp: 26,
      dd: '2026-06-12',
      dt: '08:00',
      lb: '08:00',
      ar: '10:15',
      go: 'GO',
      w: { t: 18, wd: 180, ws: 10, pr: 5, wc: 2 },
      ph: { rw: 72, bw: 9, cda: 0.34, crr: 0.0045 },
    };
    const token = toBase64Url(JSON.stringify(legacyPayload));

    const decoded = decodePlanShareToken(token, 'en');
    assert.ok(decoded !== null);
    assert.equal(decoded.sharedMeta.version, 1);
    assert.equal(decoded.sharedMeta.stageCount, 1);
    assert.equal(decoded.trip.name, 'Morning Spin');
    assert.equal(decoded.trip.route.distanceKm, 58.4);
  });

  it('round-trips a 3-stage v2 bikepacking tour with senderBaseline and pinned stops', () => {
    const base = buildDefaultNewTripTemplate('en');
    const multiStageTrip = {
      ...base,
      name: 'Brittany 3-Day Tour',
      tag: 'BIKEPACKING',
      route: {
        ...base.route,
        origin: 'Nantes',
        destination: 'Redon',
        distanceKm: 135,
        elevationGainM: 820,
        targetSpeedKmH: 20,
        coordinates: [
          [47.2184, -1.5536] as [number, number],
          [47.45, -1.8] as [number, number],
          [47.651, -2.085] as [number, number],
        ],
      },
      pinnedAmenities: [
        {
          id: 'stop-1',
          name: 'Boulangerie Blain',
          category: 'food' as const,
          subType: 'bakery',
          routeKm: 42.5,
          lat: 47.476,
          lon: -1.763,
          detourMeters: 40,
          isPinned: true,
        },
      ],
      stages: [
        {
          id: 'stage-1',
          dayNumber: 1,
          departureDate: '2026-07-10',
          departureTime: '08:00',
          accommodationNote: 'Camping Municipal Redon',
          office: base.office,
          weather: base.weather,
          customChips: [],
          pinnedAmenities: [
            {
              id: 'stop-1',
              name: 'Boulangerie Blain',
              category: 'food' as const,
              subType: 'bakery',
              routeKm: 42.5,
              lat: 47.476,
              lon: -1.763,
              detourMeters: 40,
              isPinned: true,
            },
          ],
          route: {
            ...base.route,
            origin: 'Nantes',
            destination: 'Redon',
            distanceKm: 135,
            elevationGainM: 820,
            targetSpeedKmH: 20,
            coordinates: [
              [47.2184, -1.5536] as [number, number],
              [47.45, -1.8] as [number, number],
              [47.651, -2.085] as [number, number],
            ],
          },
        },
        {
          id: 'stage-2',
          dayNumber: 2,
          departureDate: '2026-07-11',
          departureTime: '08:00',
          office: base.office,
          weather: base.weather,
          customChips: [],
          route: {
            ...base.route,
            origin: 'Redon',
            destination: 'Vannes',
            distanceKm: 142,
            elevationGainM: 950,
            targetSpeedKmH: 20,
            coordinates: [
              [47.651, -2.085] as [number, number],
              [47.66, -2.4] as [number, number],
              [47.658, -2.76] as [number, number],
            ],
          },
        },
        {
          id: 'stage-3',
          dayNumber: 3,
          departureDate: '2026-07-12',
          departureTime: '08:00',
          office: base.office,
          weather: base.weather,
          customChips: [],
          route: {
            ...base.route,
            origin: 'Vannes',
            destination: 'Nantes',
            distanceKm: 130,
            elevationGainM: 640,
            targetSpeedKmH: 20,
            coordinates: [
              [47.658, -2.76] as [number, number],
              [47.4, -2.2] as [number, number],
              [47.2184, -1.5536] as [number, number],
            ],
          },
        },
      ],
    };

    const sender: SenderBaseline = {
      name: 'Mau',
      riderWeightKg: 68,
      bikeWeightKg: 9.5,
      luggageWeightKg: 6,
      cda: 0.36,
      crr: 0.005,
      ftpWatts: 270,
      bikeName: 'Gravel Pro',
      bikeCategory: 'gravel',
    };

    const token = encodePlanShareToken(multiStageTrip, {
      leaveByHHMM: '08:00',
      arrivalHHMM: '15:30',
      goStatus: 'GO',
      bikeName: 'Gravel Pro',
      senderBaseline: sender,
    });

    const decoded = decodePlanShareToken(token, 'en');
    assert.ok(decoded !== null);
    assert.equal(decoded.sharedMeta.version, 2);
    assert.equal(decoded.sharedMeta.stageCount, 3);
    assert.equal(decoded.trip.stages?.length, 3);
    assert.equal(decoded.trip.stages![1].route.origin, 'Redon');
    assert.equal(decoded.trip.stages![1].route.destination, 'Vannes');
    assert.equal(decoded.trip.stages![0].accommodationNote, 'Camping Municipal Redon');
    assert.equal(decoded.trip.pinnedAmenities?.length, 1);
    assert.equal(decoded.sharedMeta.senderBaseline?.name, 'Mau');
    assert.equal(decoded.sharedMeta.senderBaseline?.ftpWatts, 270);
  });

  it('applyPersonalLensToSharedTrip preserves shared route & stops while applying receiver specs', () => {
    const base = buildDefaultNewTripTemplate('en');
    const receiverSpecs: RiderBikeSpecs = {
      ...DEFAULT_RIDER_BIKE_SPECS,
      riderName: 'Alex',
      riderWeightKg: 86,
      ftpWatts: 210,
      activeBikeId: 'bike-tour',
      bikes: [
        {
          id: 'bike-tour',
          name: 'Steel Tourer',
          weightKg: 13.8,
          crr: 0.0068,
          cda: 0.45,
          isTubeless: false,
          tireWidthMm: 42,
          bikeCategory: 'touring',
        },
      ],
    };

    const personalized = applyPersonalLensToSharedTrip(base, receiverSpecs, {
      luggageWeightKg: 10,
      lang: 'en',
    });

    assert.equal(personalized.route.distanceKm, base.route.distanceKm);
    assert.equal(personalized.route.targetSpeedKmH, base.route.targetSpeedKmH);
    assert.equal(personalized.physics.riderWeightKg, 86);
    assert.equal(personalized.physics.bikeWeightKg, 13.8);
    assert.equal(personalized.physics.luggageWeightKg, 10);
    assert.equal(personalized.physics.cda, 0.45);
    assert.equal(personalized.physics.crr, 0.0068);
  });

  it('computeGroupSyncCheck detects effort gap and recommends a calmer group speed', () => {
    const base = buildDefaultNewTripTemplate('en');
    const hillyTrip = {
      ...base,
      route: {
        ...base.route,
        distanceKm: 110,
        elevationGainM: 1200,
        targetSpeedKmH: 23,
        pacingMode: 'speed' as const,
      },
      physics: {
        ...base.physics,
        luggageWeightKg: 8,
        gearWeightKg: 8,
      },
    };

    const strongSender: SenderBaseline = {
      name: 'Mau',
      riderWeightKg: 66,
      bikeWeightKg: 9.2,
      luggageWeightKg: 5,
      cda: 0.34,
      crr: 0.0048,
      ftpWatts: 290,
      bikeName: 'Fast Gravel',
    };

    const heavierReceiver: RiderBikeSpecs = {
      ...DEFAULT_RIDER_BIKE_SPECS,
      riderName: 'Alex',
      riderWeightKg: 88,
      ftpWatts: 195,
      activeBikeId: 'bike-alex',
      bikes: [
        {
          id: 'bike-alex',
          name: 'Loaded Tourer',
          weightKg: 13.5,
          crr: 0.0068,
          cda: 0.44,
          isTubeless: false,
          tireWidthMm: 42,
          bikeCategory: 'touring',
        },
      ],
    };

    const sync = computeGroupSyncCheck(hillyTrip, strongSender, heavierReceiver, '08:00', 'en');
    assert.ok(sync.receiver.ftpPercent > sync.sender.ftpPercent);
    assert.equal(sync.isBalanced, false);
    assert.ok(sync.recommendedGroupSpeedKmH !== null);
    assert.ok(sync.recommendedGroupSpeedKmH! < 23);
    assert.ok(sync.takeaway.includes('Alex'));
  });
});
