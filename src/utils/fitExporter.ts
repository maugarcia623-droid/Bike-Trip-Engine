import { TripProfile } from '../types/trip';
import { Language } from '../context/LanguageContext';
import { NutritionPreference } from '../types/specs';
import { computeCumulativeDistances, snapToPolyline } from '../services/overpassCorridor';
import { calculatePhysics } from './physics';
import { ClimbCategory, computeClimbSplitsAndFueling } from './climbSplits';

export interface FitExportOptions {
  /** Inject periodic nutrition/hydration course_points (every 30-45 min). Default true. */
  includeFuelingCues?: boolean;
  /** Inject detected climb start markers into Garmin/Wahoo Up Ahead list. Default true. */
  includeClimbCues?: boolean;
  /** Periodic fueling interval in minutes (default 35 min). */
  fuelIntervalMinutes?: number;
  /** Copy language ('en' | 'fr'). */
  lang?: Language;
  /** Optional FTP override (W). */
  ftpWatts?: number;
  /** Optional rider carb target override (g/hr). */
  carbTargetGPerHr?: number;
  /** Optional rider fueling preference. */
  nutritionPreference?: NutritionPreference;
}

// Garmin FIT epoch: 1989-12-31T00:00:00Z in Unix seconds
const FIT_EPOCH_OFFSET_SEC = 631065600;
const DEG_TO_SEMICIRCLES = 2147483648 / 180;

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

function computeFitCrc16(bytes: Uint8Array, start = 0, end = bytes.length): number {
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

class FitByteWriter {
  private buf: number[] = [];

  writeUint8(v: number): void {
    this.buf.push(v & 0xff);
  }

  writeUint16LE(v: number): void {
    this.buf.push(v & 0xff, (v >> 8) & 0xff);
  }

  writeUint32LE(v: number): void {
    this.buf.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  }

  writeSint32LE(v: number): void {
    const i = Math.round(v) | 0;
    this.writeUint32LE(i >>> 0);
  }

  writeFixedString(text: string, byteLen: number): void {
    const encoder = new TextEncoder();
    const maxBytes = Math.max(0, byteLen - 1);
    const bytes: number[] = [];
    for (const ch of text) {
      const chBytes = encoder.encode(ch);
      if (bytes.length + chBytes.length > maxBytes) break;
      for (const b of chBytes) bytes.push(b);
    }
    for (let i = 0; i < byteLen; i++) {
      this.buf.push(i < bytes.length ? bytes[i] : 0);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

function degToSemicircles(deg: number): number {
  return Math.round(deg * DEG_TO_SEMICIRCLES);
}

function mapAmenityToCoursePointType(category: string): number {
  // Garmin FIT course_point enum: 10=food, 11=water, 14=service, 0=generic
  switch (category) {
    case 'water':
    case 'cemetery':
      return 11;
    case 'food':
      return 10;
    case 'mechanix':
    case 'essentials':
      return 14;
    case 'bailout':
      return 0;
    default:
      return 0;
  }
}

function mapCueToCoursePointType(direction: string): number {
  switch (direction) {
    case 'left':
      return 6;
    case 'right':
      return 7;
    case 'slight-left':
      return 19;
    case 'sharp-left':
      return 20;
    case 'slight-right':
      return 21;
    case 'sharp-right':
      return 22;
    case 'straight':
      return 23;
    default:
      return 0;
  }
}

function mapClimbCategoryToCoursePointType(category: ClimbCategory): number {
  switch (category) {
    case 'HC':
      return 31; // hors_category
    case '1':
      return 30; // first_category
    case '2':
      return 29; // second_category
    case '3':
      return 28; // third_category
    case '4':
    default:
      return 27; // fourth_category
  }
}

function interpolateCoordAtDistM(
  coords: [number, number][],
  cumMeters: number[],
  rawTotalM: number,
  targetTotalM: number,
  distM: number
): [number, number] {
  if (coords.length === 0) return [47.2184, -1.5536];
  if (coords.length === 1) return coords[0];
  const scale = targetTotalM > 0 && rawTotalM > 0 ? rawTotalM / targetTotalM : 1;
  const rawDistM = Math.max(0, Math.min(rawTotalM, distM * scale));
  for (let i = 1; i < coords.length; i++) {
    if (cumMeters[i] >= rawDistM) {
      const span = cumMeters[i] - cumMeters[i - 1];
      const t = span > 0 ? (rawDistM - cumMeters[i - 1]) / span : 0;
      return [
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ];
    }
  }
  return coords[coords.length - 1];
}

function interpolateElevation(
  distKm: number,
  profile?: Array<{ distKm: number; eleM: number }>
): number {
  if (!profile || profile.length === 0) return 20;
  if (distKm <= profile[0].distKm) return profile[0].eleM;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i].distKm >= distKm) {
      const p0 = profile[i - 1];
      const p1 = profile[i];
      const span = p1.distKm - p0.distKm;
      const t = span > 0 ? (distKm - p0.distKm) / span : 0;
      return p0.eleM + (p1.eleM - p0.eleM) * t;
    }
  }
  return profile[profile.length - 1].eleM;
}

/**
 * Encodes a TripProfile (track polyline + pinned Resupply Radar stops + turn cues)
 * into a Garmin-compatible binary `.fit` Course file for Up Ahead alerts.
 */
export function exportTripToFit(
  trip: TripProfile,
  options: FitExportOptions = {}
): Uint8Array {
  const {
    includeFuelingCues = true,
    includeClimbCues = true,
    fuelIntervalMinutes = 35,
    lang = 'en',
    ftpWatts,
    carbTargetGPerHr,
    nutritionPreference,
  } = options;
  const coords =
    trip.route.coordinates && trip.route.coordinates.length >= 2
      ? trip.route.coordinates
      : [
          [47.2184, -1.5536] as [number, number],
          [47.2734, -2.2139] as [number, number],
        ];

  const cumMeters = computeCumulativeDistances(coords);
  const rawTotalM = cumMeters[cumMeters.length - 1] || 1000;
  const targetTotalM = Math.max(rawTotalM, (trip.route.distanceKm || 0) * 1000);
  const speedMs = Math.max(2, (trip.route.targetSpeedKmH || 22) / 3.6);
  const totalElapsedSec = Math.max(60, Math.round(targetTotalM / speedMs));
  const nowFitSec = Math.max(1, Math.floor(Date.now() / 1000) - FIT_EPOCH_OFFSET_SEC);

  const w = new FitByteWriter();

  // Local msg 0: file_id (global 0)
  w.writeUint8(0x40); // def local 0
  w.writeUint8(0); // reserved
  w.writeUint8(0); // LE
  w.writeUint16LE(0); // global file_id
  w.writeUint8(5); // 5 fields
  w.writeUint8(0); w.writeUint8(1); w.writeUint8(0); // type (enum)
  w.writeUint8(1); w.writeUint8(2); w.writeUint8(132); // manufacturer (uint16)
  w.writeUint8(2); w.writeUint8(2); w.writeUint8(132); // product (uint16)
  w.writeUint8(3); w.writeUint8(4); w.writeUint8(140); // serial_number (uint32z)
  w.writeUint8(4); w.writeUint8(4); w.writeUint8(134); // time_created (uint32)

  w.writeUint8(0x00); // data local 0
  w.writeUint8(6); // file_type = 6 (course)
  w.writeUint16LE(1); // Garmin
  w.writeUint16LE(1);
  w.writeUint32LE(0x20261115);
  w.writeUint32LE(nowFitSec);

  // Local msg 1: course (global 31)
  w.writeUint8(0x41);
  w.writeUint8(0);
  w.writeUint8(0);
  w.writeUint16LE(31); // course
  w.writeUint8(1);
  w.writeUint8(5); w.writeUint8(24); w.writeUint8(7); // name (string, 24 bytes)

  w.writeUint8(0x01);
  w.writeFixedString(trip.name || 'Cadence Route', 24);

  // Local msg 2: lap (global 19)
  w.writeUint8(0x42);
  w.writeUint8(0);
  w.writeUint8(0);
  w.writeUint16LE(19);
  w.writeUint8(9);
  w.writeUint8(253); w.writeUint8(4); w.writeUint8(134); // timestamp
  w.writeUint8(2); w.writeUint8(4); w.writeUint8(134); // start_time
  w.writeUint8(3); w.writeUint8(4); w.writeUint8(133); // start_position_lat
  w.writeUint8(4); w.writeUint8(4); w.writeUint8(133); // start_position_long
  w.writeUint8(5); w.writeUint8(4); w.writeUint8(133); // end_position_lat
  w.writeUint8(6); w.writeUint8(4); w.writeUint8(133); // end_position_long
  w.writeUint8(7); w.writeUint8(4); w.writeUint8(134); // total_elapsed_time (ms)
  w.writeUint8(8); w.writeUint8(4); w.writeUint8(134); // total_timer_time (ms)
  w.writeUint8(9); w.writeUint8(4); w.writeUint8(134); // total_distance (cm)

  w.writeUint8(0x02);
  w.writeUint32LE(nowFitSec);
  w.writeUint32LE(nowFitSec);
  w.writeSint32LE(degToSemicircles(coords[0][0]));
  w.writeSint32LE(degToSemicircles(coords[0][1]));
  w.writeSint32LE(degToSemicircles(coords[coords.length - 1][0]));
  w.writeSint32LE(degToSemicircles(coords[coords.length - 1][1]));
  w.writeUint32LE(totalElapsedSec * 1000);
  w.writeUint32LE(totalElapsedSec * 1000);
  w.writeUint32LE(Math.round(targetTotalM * 100));

  // Local msg 3: event (global 21)
  w.writeUint8(0x43);
  w.writeUint8(0);
  w.writeUint8(0);
  w.writeUint16LE(21);
  w.writeUint8(3);
  w.writeUint8(253); w.writeUint8(4); w.writeUint8(134); // timestamp
  w.writeUint8(0); w.writeUint8(1); w.writeUint8(0); // event
  w.writeUint8(1); w.writeUint8(1); w.writeUint8(0); // event_type

  // Timer start
  w.writeUint8(0x03);
  w.writeUint32LE(nowFitSec);
  w.writeUint8(0);
  w.writeUint8(0);

  // Local msg 4: record (global 20)
  w.writeUint8(0x44);
  w.writeUint8(0);
  w.writeUint8(0);
  w.writeUint16LE(20);
  w.writeUint8(5);
  w.writeUint8(253); w.writeUint8(4); w.writeUint8(134); // timestamp
  w.writeUint8(0); w.writeUint8(4); w.writeUint8(133); // position_lat
  w.writeUint8(1); w.writeUint8(4); w.writeUint8(133); // position_long
  w.writeUint8(5); w.writeUint8(4); w.writeUint8(134); // distance (cm)
  w.writeUint8(2); w.writeUint8(2); w.writeUint8(132); // altitude (scale 5, offset 500)

  const distScale = rawTotalM > 0 ? targetTotalM / rawTotalM : 1;
  for (let i = 0; i < coords.length; i++) {
    const distM = cumMeters[i] * distScale;
    const tSec = nowFitSec + Math.round((distM / targetTotalM) * totalElapsedSec);
    const eleM = interpolateElevation(distM / 1000, trip.route.elevationProfile);
    const rawAlt = Math.max(0, Math.min(65534, Math.round((eleM + 500) * 5)));

    w.writeUint8(0x04);
    w.writeUint32LE(tSec);
    w.writeSint32LE(degToSemicircles(coords[i][0]));
    w.writeSint32LE(degToSemicircles(coords[i][1]));
    w.writeUint32LE(Math.round(distM * 100));
    w.writeUint16LE(rawAlt);
  }

  // Course points (pinned Resupply Radar stops + cue sheet turns) for Garmin Up Ahead
  interface FitCoursePoint {
    lat: number;
    lon: number;
    distM: number;
    type: number;
    name: string;
  }

  const coursePoints: FitCoursePoint[] = [];
  for (const stop of trip.pinnedAmenities || []) {
    const snapped = snapToPolyline(stop.lat, stop.lon, coords, cumMeters);
    const distM = Math.max(0, Math.min(targetTotalM, snapped.routeKm * 1000 * distScale));
    coursePoints.push({
      lat: stop.lat,
      lon: stop.lon,
      distM,
      type: mapAmenityToCoursePointType(stop.category),
      name: stop.name || stop.category,
    });
  }

  for (const cue of trip.route.cueSheet || []) {
    if (cue.direction === 'depart' || cue.direction === 'arrive') continue;
    coursePoints.push({
      lat: cue.lat,
      lon: cue.lng,
      distM: Math.max(0, Math.min(targetTotalM, cue.distKm * 1000)),
      type: mapCueToCoursePointType(cue.direction),
      name: cue.streetName || cue.instruction,
    });
  }

  if (includeFuelingCues || includeClimbCues) {
    const physicsResult = calculatePhysics(
      trip.physics,
      trip.route,
      trip.weather,
      lang,
      ftpWatts
    );
    const splitSummary = computeClimbSplitsAndFueling(trip, physicsResult, lang, {
      ftpWatts,
      carbTargetGPerHr,
      nutritionPreference,
      checkpointIntervalMinutes: fuelIntervalMinutes,
      departureTimeHHMM: trip.departureTime,
    });

    if (includeClimbCues) {
      for (const climb of splitSummary.climbs) {
        const distM = Math.max(0, Math.min(targetTotalM, climb.startKm * 1000));
        const [lat, lon] = interpolateCoordAtDistM(
          coords,
          cumMeters,
          rawTotalM,
          targetTotalM,
          distM
        );
        const catTag =
          climb.category === 'HC'
            ? 'HC'
            : climb.category === 'hill'
            ? 'Climb'
            : `C${climb.category}`;
        const shortName = `${catTag} ${climb.lengthKm}km ${Math.round(climb.avgGradePct)}%`.slice(
          0,
          15
        );
        coursePoints.push({
          lat,
          lon,
          distM,
          type: mapClimbCategoryToCoursePointType(climb.category),
          name: shortName,
        });
      }
    }

    if (includeFuelingCues) {
      for (const cp of splitSummary.checkpoints) {
        const distM = Math.max(0, Math.min(targetTotalM, cp.distKm * 1000));
        const [lat, lon] = interpolateCoordAtDistM(
          coords,
          cumMeters,
          rawTotalM,
          targetTotalM,
          distM
        );
        coursePoints.push({
          lat,
          lon,
          distM,
          type: cp.kind === 'hydration' ? 11 : 10,
          name: cp.shortFitCue.slice(0, 15),
        });
      }
    }
  }

  coursePoints.sort((a, b) => a.distM - b.distM);

  if (coursePoints.length > 0) {
    // Local msg 5: course_point (global 32)
    w.writeUint8(0x45);
    w.writeUint8(0);
    w.writeUint8(0);
    w.writeUint16LE(32);
    w.writeUint8(6);
    w.writeUint8(1); w.writeUint8(4); w.writeUint8(134); // timestamp
    w.writeUint8(2); w.writeUint8(4); w.writeUint8(133); // position_lat
    w.writeUint8(3); w.writeUint8(4); w.writeUint8(133); // position_long
    w.writeUint8(4); w.writeUint8(4); w.writeUint8(134); // distance (cm)
    w.writeUint8(5); w.writeUint8(1); w.writeUint8(0);   // type (enum)
    w.writeUint8(6); w.writeUint8(16); w.writeUint8(7);  // name (16-byte string)

    for (const cp of coursePoints) {
      const tSec = nowFitSec + Math.round((cp.distM / targetTotalM) * totalElapsedSec);
      w.writeUint8(0x05);
      w.writeUint32LE(tSec);
      w.writeSint32LE(degToSemicircles(cp.lat));
      w.writeSint32LE(degToSemicircles(cp.lon));
      w.writeUint32LE(Math.round(cp.distM * 100));
      w.writeUint8(cp.type);
      w.writeFixedString(cp.name, 16);
    }
  }

  // Timer stop event
  w.writeUint8(0x03);
  w.writeUint32LE(nowFitSec + totalElapsedSec);
  w.writeUint8(0);
  w.writeUint8(1);

  const dataBytes = w.toUint8Array();
  const dataSize = dataBytes.length;

  // Build 14-byte header + data + 2-byte file CRC
  const totalBytes = new Uint8Array(14 + dataSize + 2);
  const hdrView = new DataView(totalBytes.buffer);
  hdrView.setUint8(0, 14); // header size
  hdrView.setUint8(1, 0x20); // protocol 2.0
  hdrView.setUint16(2, 2132, true); // profile version
  hdrView.setUint32(4, dataSize, true);
  totalBytes[8] = '.'.charCodeAt(0);
  totalBytes[9] = 'F'.charCodeAt(0);
  totalBytes[10] = 'I'.charCodeAt(0);
  totalBytes[11] = 'T'.charCodeAt(0);

  const headerCrc = computeFitCrc16(totalBytes, 0, 12);
  hdrView.setUint16(12, headerCrc, true);

  totalBytes.set(dataBytes, 14);
  const fileCrc = computeFitCrc16(totalBytes, 0, 14 + dataSize);
  hdrView.setUint16(14 + dataSize, fileCrc, true);

  return totalBytes;
}

export function downloadTripFit(trip: TripProfile, options?: FitExportOptions): void {
  if (typeof document === 'undefined') return;
  const bytes = exportTripToFit(trip, options);
  const baseName =
    (trip.name || 'cadence-route')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'cadence-route';
  const filename = `${baseName}-${Math.round(trip.route.distanceKm || 0)}km.fit`;
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
