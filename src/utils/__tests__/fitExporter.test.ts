import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportTripToFit } from '../fitExporter';
import type { TripProfile } from '../../types/trip';

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

function computeCrc16(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0;
  for (let i = start; i < end; i++) {
    const byte = bytes[i];
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xf];

    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc & 0xffff;
}

function makeBaseTrip(): TripProfile {
  return {
    id: 'test-trip',
    name: 'Loire Valley Test',
    tag: 'Test',
    description: 'Unit test trip',
    createdAt: '2026-11-15T00:00:00Z',
    updatedAt: '2026-11-15T00:00:00Z',
    physics: {
      riderWeightKg: 70,
      bikeWeightKg: 9,
      gearWeightKg: 2,
      cda: 0.32,
      crr: 0.0045,
      rho: 1.225,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0,
    },
    route: {
      distanceKm: 20,
      targetSpeedKmH: 25,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: [
        [47.2184, -1.5536],
        [47.24, -1.45],
        [47.27, -1.35],
      ],
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:45',
      gateName: 'Main',
      lockerRefuelMinutes: 5,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 10,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: false,
      notes: '',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 0,
      windDirection: 'calm',
      windDirectionDegrees: 0,
      temperatureC: 18,
      precipitationRiskPercent: 0,
      estuaryGustKmH: 0,
      visibilityKm: 20,
    },
    checklist: [],
  };
}

describe('fitExporter.ts', () => {
  it('writes a valid 14-byte .FIT header and matching header/file CRC16 checksums', () => {
    const trip = makeBaseTrip();
    const bytes = exportTripToFit(trip);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    assert.equal(bytes[0], 14); // header size
    assert.equal(bytes[1], 0x20); // protocol 2.0
    assert.equal(view.getUint16(2, true), 2132); // profile version
    const dataSize = view.getUint32(4, true);
    assert.equal(dataSize, bytes.length - 16);

    const magic = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    assert.equal(magic, '.FIT');

    const expectedHeaderCrc = computeCrc16(bytes, 0, 12);
    assert.equal(view.getUint16(12, true), expectedHeaderCrc);

    const expectedFileCrc = computeCrc16(bytes, 0, 14 + dataSize);
    assert.equal(view.getUint16(14 + dataSize, true), expectedFileCrc);
  });

  it('appends course_point records for pinnedAmenities and turn cues (excluding depart/arrive)', () => {
    const bareBytes = exportTripToFit(makeBaseTrip());

    const tripWithCues = makeBaseTrip();
    tripWithCues.pinnedAmenities = [
      {
        id: 'w1',
        name: 'Fountain Square',
        category: 'water',
        subType: 'drinking_water',
        lat: 47.24,
        lon: -1.45,
        routeKm: 9,
        detourMeters: 15,
      },
    ];
    tripWithCues.route.cueSheet = [
      {
        instruction: 'Depart',
        direction: 'depart',
        distKm: 0,
        lat: 47.2184,
        lng: -1.5536,
      },
      {
        instruction: 'Turn right onto Rue Haute',
        direction: 'right',
        streetName: 'Rue Haute',
        distKm: 10,
        lat: 47.24,
        lng: -1.45,
      },
    ];

    const withCuesBytes = exportTripToFit(tripWithCues);
    assert.ok(withCuesBytes.length > bareBytes.length);

    const ascii = new TextDecoder('latin1').decode(withCuesBytes);
    assert.match(ascii, /Fountain Square/);
    assert.match(ascii, /Rue Haute/);

    // Verify file CRC16 still holds with course_point messages included
    const view = new DataView(withCuesBytes.buffer, withCuesBytes.byteOffset, withCuesBytes.byteLength);
    const dataSize = view.getUint32(4, true);
    assert.equal(
      view.getUint16(14 + dataSize, true),
      computeCrc16(withCuesBytes, 0, 14 + dataSize)
    );
  });

  it('injects periodic fueling and climb start course_points when enriched cues are enabled', () => {
    const trip = makeBaseTrip();
    trip.route.distanceKm = 65;
    trip.route.elevationGainM = 850;
    trip.route.targetSpeedKmH = 22;
    trip.route.elevationProfile = [
      { distKm: 0, eleM: 100, gradePct: 0 },
      { distKm: 20, eleM: 120, gradePct: 0.1 },
      { distKm: 28, eleM: 640, gradePct: 6.5 },
      { distKm: 45, eleM: 320, gradePct: -1.8 },
      { distKm: 65, eleM: 250, gradePct: -0.3 },
    ];

    const plainBytes = exportTripToFit(trip, {
      includeFuelingCues: false,
      includeClimbCues: false,
    });
    const enrichedBytes = exportTripToFit(trip, {
      includeFuelingCues: true,
      includeClimbCues: true,
      lang: 'en',
    });

    assert.ok(enrichedBytes.length > plainBytes.length);

    const ascii = new TextDecoder('latin1').decode(enrichedBytes);
    assert.match(ascii, /(Km|Gel|Fuel|Pre|Bidon|Hydr|H2O|Dates|Water)/i);
    assert.match(ascii, /(C1|C2|C3|C4|HC|Climb)/);

    const view = new DataView(
      enrichedBytes.buffer,
      enrichedBytes.byteOffset,
      enrichedBytes.byteLength
    );
    const dataSize = view.getUint32(4, true);
    assert.equal(
      view.getUint16(14 + dataSize, true),
      computeCrc16(enrichedBytes, 0, 14 + dataSize)
    );
  });

  it('truncates multi-byte UTF-8 course point names at character boundaries and scales amenity distances', () => {
    const trip = makeBaseTrip();
    trip.route.distanceKm = 40; // ~2.44x raw polyline (~16.4 km)
    trip.pinnedAmenities = [
      {
        id: 'utf8-stop',
        name: 'Stop 1234567 €€€',
        category: 'food',
        subType: 'bakery',
        lat: 47.24,
        lon: -1.45,
        routeKm: 8.2,
        detourMeters: 0,
        isPinned: true,
      },
    ];

    const bytes = exportTripToFit(trip, {
      includeFuelingCues: false,
      includeClimbCues: false,
    });

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataSize = view.getUint32(4, true);
    assert.equal(
      view.getUint16(14 + dataSize, true),
      computeCrc16(bytes, 0, 14 + dataSize)
    );

    // Locate local msg 5 (global msg 32 = course_point) definition header
    let defOffset = -1;
    for (let i = 14; i < 14 + dataSize - 24; i++) {
      if (
        bytes[i] === 0x45 &&
        bytes[i + 1] === 0 &&
        bytes[i + 2] === 0 &&
        bytes[i + 3] === 32 &&
        bytes[i + 4] === 0 &&
        bytes[i + 5] === 6
      ) {
        defOffset = i;
        break;
      }
    }
    assert.ok(defOffset >= 14);

    const recOffset = defOffset + 24;
    assert.equal(bytes[recOffset], 0x05);
    const courseDistM = view.getUint32(recOffset + 13, true) / 100;
    assert.ok(courseDistM > 15000 && courseDistM < 25000);

    const rawName = bytes.slice(recOffset + 18, recOffset + 34);
    assert.equal(rawName[15], 0);
    const nullIdx = rawName.indexOf(0);
    const trimmed = nullIdx >= 0 ? rawName.slice(0, nullIdx) : rawName;
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(trimmed);
    assert.equal(decoded, 'Stop 1234567 ');
  });
});
