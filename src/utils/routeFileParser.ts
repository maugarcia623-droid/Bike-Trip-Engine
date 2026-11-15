import { ElevationProfilePoint } from '../types/trip';
import {
  buildTerrainSummaryFromProfile,
  GpxParseResult,
  parseGpxFileContent,
} from './gpxParser';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildResultFromPoints(
  points: Array<{ lat: number; lng: number; ele?: number }>,
  trackName: string | undefined,
  fileName: string
): GpxParseResult {
  const coordinates: [number, number][] = [];
  const rawEle: number[] = [];
  const cumDistKm: number[] = [];
  let totalDistKm = 0;
  let hasRealEle = false;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) continue;
    if (coordinates.length > 0) {
      const prev = coordinates[coordinates.length - 1];
      totalDistKm += haversineKm(prev[0], prev[1], pt.lat, pt.lng);
    }
    coordinates.push([pt.lat, pt.lng]);
    cumDistKm.push(totalDistKm);
    if (typeof pt.ele === 'number' && Number.isFinite(pt.ele)) {
      hasRealEle = true;
      rawEle.push(pt.ele);
    } else {
      rawEle.push(rawEle.length > 0 ? rawEle[rawEle.length - 1] : 18);
    }
  }

  if (coordinates.length < 2) {
    throw new Error('Route file contains fewer than 2 valid GPS coordinates.');
  }

  // Smooth raw elevation with 3-point moving average to suppress GPS/DEM jitter
  const smoothedEle = rawEle.map((e, i) => {
    if (i === 0 || i === rawEle.length - 1) return e;
    return 0.25 * rawEle[i - 1] + 0.5 * e + 0.25 * rawEle[i + 1];
  });

  let elevationGainM = 0;
  let elevationLossM = 0;
  if (hasRealEle) {
    let anchor = smoothedEle[0];
    for (let i = 1; i < smoothedEle.length; i++) {
      const diff = smoothedEle[i] - anchor;
      if (diff >= 2.0) {
        elevationGainM += diff;
        anchor = smoothedEle[i];
      } else if (diff <= -2.0) {
        elevationLossM += Math.abs(diff);
        anchor = smoothedEle[i];
      }
    }
  } else {
    elevationGainM = Math.round(totalDistKm * 6.5);
    elevationLossM = Math.round(totalDistKm * 6.5);
  }

  // Downsample elevationProfile to <= 120 points for chart performance
  const targetSamples = Math.min(120, coordinates.length);
  const step = Math.max(1, Math.floor(coordinates.length / targetSamples));
  const elevationProfile: ElevationProfilePoint[] = [];

  for (let i = 0; i < coordinates.length; i += step) {
    const dist = Number(cumDistKm[i].toFixed(2));
    const ele = Number(smoothedEle[i].toFixed(1));
    let gradePct = 0;
    if (elevationProfile.length > 0) {
      const prev = elevationProfile[elevationProfile.length - 1];
      const dMeters = Math.max(15, (dist - prev.distKm) * 1000);
      gradePct = Number(
        Math.max(-25, Math.min(25, ((ele - prev.eleM) / dMeters) * 100)).toFixed(1)
      );
    }
    elevationProfile.push({ distKm: dist, eleM: ele, gradePct });
  }

  const lastIdx = coordinates.length - 1;
  if (
    elevationProfile.length > 0 &&
    elevationProfile[elevationProfile.length - 1].distKm < Number(totalDistKm.toFixed(2))
  ) {
    const prev = elevationProfile[elevationProfile.length - 1];
    const dist = Number(totalDistKm.toFixed(2));
    const ele = Number(smoothedEle[lastIdx].toFixed(1));
    const dMeters = Math.max(15, (dist - prev.distKm) * 1000);
    const gradePct = Number(
      Math.max(-25, Math.min(25, ((ele - prev.eleM) / dMeters) * 100)).toFixed(1)
    );
    elevationProfile.push({ distKm: dist, eleM: ele, gradePct });
  }

  // Downsample stored polyline to <= 450 coordinates
  let storedCoords = coordinates;
  if (coordinates.length > 450) {
    const cStep = Math.ceil(coordinates.length / 450);
    storedCoords = coordinates.filter((_, idx) => idx % cStep === 0 || idx === coordinates.length - 1);
  }

  const roundedDistKm = Math.max(0.5, Number(totalDistKm.toFixed(1)));
  const roundedGainM = Math.round(elevationGainM);
  const roundedLossM = Math.round(elevationLossM);

  const cleanFileName = fileName.replace(/\.(gpx|tcx|fit)$/i, '');
  let originLabel = cleanFileName || 'Route Start';
  let destLabel = cleanFileName ? `${cleanFileName} Finish` : 'Route Finish';

  if (trackName) {
    const arrowMatch = trackName.split(/\s*(?:->|→|↔|-|to|vers)\s*/i);
    if (arrowMatch.length >= 2 && arrowMatch[0].trim() && arrowMatch[1].trim()) {
      originLabel = arrowMatch[0].trim();
      destLabel = arrowMatch[arrowMatch.length - 1].trim();
    } else {
      originLabel = trackName;
      destLabel = trackName;
    }
  }

  const terrainSummary = buildTerrainSummaryFromProfile(
    elevationProfile,
    roundedDistKm,
    roundedGainM,
    `${trackName || ''} ${fileName}`,
    storedCoords
  );

  return {
    trackName,
    originLabel,
    destLabel,
    coordinates: storedCoords,
    distanceKm: roundedDistKm,
    elevationGainM: roundedGainM,
    elevationLossM: roundedLossM,
    elevationProfile,
    terrainSummary,
  };
}

/**
 * Parses a Garmin Training Center XML (.tcx) course or activity file.
 */
export function parseTcxFileContent(xmlText: string, fileName = 'route.tcx'): GpxParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    throw new Error('Invalid TCX XML format.');
  }

  const nameNode =
    doc.querySelector('Course > Name') ||
    doc.querySelector('Activity > Notes') ||
    doc.querySelector('Activity > Id');
  const trackName = nameNode?.textContent?.trim() || undefined;

  const trackpoints = Array.from(doc.querySelectorAll('Trackpoint'));
  const points: Array<{ lat: number; lng: number; ele?: number }> = [];

  for (const tp of trackpoints) {
    const latStr = tp.querySelector('Position > LatitudeDegrees')?.textContent;
    const lonStr = tp.querySelector('Position > LongitudeDegrees')?.textContent;
    if (!latStr || !lonStr) continue;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const altStr = tp.querySelector('AltitudeMeters')?.textContent;
    const ele = altStr !== null && altStr !== undefined ? parseFloat(altStr) : undefined;
    points.push({
      lat,
      lng,
      ele: ele !== undefined && Number.isFinite(ele) ? ele : undefined,
    });
  }

  return buildResultFromPoints(points, trackName, fileName);
}

interface FitFieldDef {
  fieldNum: number;
  size: number;
  baseType: number;
}

interface FitDefMessage {
  globalMsgNum: number;
  littleEndian: boolean;
  fields: FitFieldDef[];
  devBytes: number;
}

const SEMICIRCLES_TO_DEG = 180 / 2147483648; // 180 / 2^31

function readFitString(view: DataView, offset: number, length: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < length; i++) {
    const b = view.getUint8(offset + i);
    if (b === 0) break;
    bytes.push(b);
  }
  if (bytes.length === 0) return '';
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes)).trim();
  } catch {
    return String.fromCharCode(...bytes).trim();
  }
}

function readFitUint(view: DataView, offset: number, size: number, le: boolean): number | null {
  if (size === 1) {
    const v = view.getUint8(offset);
    return v === 0xff ? null : v;
  }
  if (size === 2) {
    const v = view.getUint16(offset, le);
    return v === 0xffff ? null : v;
  }
  if (size === 4) {
    const v = view.getUint32(offset, le);
    return v === 0xffffffff ? null : v;
  }
  return null;
}

function readFitSint32(view: DataView, offset: number, le: boolean): number | null {
  const v = view.getInt32(offset, le);
  return v === 0x7fffffff ? null : v;
}

/**
 * Pure TypeScript Garmin FIT binary decoder supporting Course and Activity files.
 * Extracts GPS `record` messages (global msg 20) and `course` name (global msg 31).
 */
export function parseFitFileBuffer(buffer: ArrayBuffer, fileName = 'route.fit'): GpxParseResult {
  if (buffer.byteLength < 14) {
    throw new Error('FIT file is too short.');
  }

  const view = new DataView(buffer);
  const headerSize = view.getUint8(0);
  if (headerSize < 12 || headerSize > buffer.byteLength) {
    throw new Error('Invalid FIT header size.');
  }

  const sig =
    String.fromCharCode(view.getUint8(8)) +
    String.fromCharCode(view.getUint8(9)) +
    String.fromCharCode(view.getUint8(10)) +
    String.fromCharCode(view.getUint8(11));
  if (sig !== '.FIT') {
    throw new Error('Not a valid Garmin .FIT binary file.');
  }

  const dataSize = view.getUint32(4, true);
  const dataEnd = Math.min(buffer.byteLength, headerSize + dataSize);
  let pos = headerSize;

  const definitions = new Map<number, FitDefMessage>();
  const points: Array<{ lat: number; lng: number; ele?: number }> = [];
  let courseName: string | undefined;

  while (pos < dataEnd) {
    const recordHeader = view.getUint8(pos);
    pos += 1;

    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;
    const isDefinition = !isCompressedTimestamp && (recordHeader & 0x40) !== 0;
    const hasDevFields = !isCompressedTimestamp && (recordHeader & 0x20) !== 0;
    const localMsgType = isCompressedTimestamp
      ? (recordHeader >> 5) & 0x03
      : recordHeader & 0x0f;

    if (isDefinition) {
      if (pos + 5 > dataEnd) break;
      pos += 1; // reserved
      const arch = view.getUint8(pos);
      const littleEndian = arch === 0;
      pos += 1;
      const globalMsgNum = view.getUint16(pos, littleEndian);
      pos += 2;
      const numFields = view.getUint8(pos);
      pos += 1;

      const fields: FitFieldDef[] = [];
      for (let f = 0; f < numFields; f++) {
        if (pos + 3 > dataEnd) break;
        fields.push({
          fieldNum: view.getUint8(pos),
          size: view.getUint8(pos + 1),
          baseType: view.getUint8(pos + 2),
        });
        pos += 3;
      }

      let devBytes = 0;
      if (hasDevFields && pos < dataEnd) {
        const numDevFields = view.getUint8(pos);
        pos += 1;
        for (let d = 0; d < numDevFields; d++) {
          if (pos + 3 > dataEnd) break;
          devBytes += view.getUint8(pos + 1);
          pos += 3;
        }
      }

      definitions.set(localMsgType, {
        globalMsgNum,
        littleEndian,
        fields,
        devBytes,
      });
    } else {
      const def = definitions.get(localMsgType);
      if (!def) break;

      const msgStart = pos;
      let fieldOffset = msgStart;
      let lat: number | undefined;
      let lng: number | undefined;
      let ele: number | undefined;
      let enhEle: number | undefined;

      for (const f of def.fields) {
        if (fieldOffset + f.size > dataEnd) {
          fieldOffset = dataEnd;
          break;
        }

        if (def.globalMsgNum === 20) {
          // Record message
          if (f.fieldNum === 0 && f.size === 4) {
            const raw = readFitSint32(view, fieldOffset, def.littleEndian);
            if (raw !== null) lat = raw * SEMICIRCLES_TO_DEG;
          } else if (f.fieldNum === 1 && f.size === 4) {
            const raw = readFitSint32(view, fieldOffset, def.littleEndian);
            if (raw !== null) lng = raw * SEMICIRCLES_TO_DEG;
          } else if (f.fieldNum === 2 && f.size === 2) {
            const raw = readFitUint(view, fieldOffset, 2, def.littleEndian);
            if (raw !== null) ele = raw / 5 - 500;
          } else if (f.fieldNum === 78 && f.size === 4) {
            const raw = readFitUint(view, fieldOffset, 4, def.littleEndian);
            if (raw !== null) enhEle = raw / 5 - 500;
          }
        } else if (def.globalMsgNum === 31 && f.fieldNum === 5) {
          // Course name
          const name = readFitString(view, fieldOffset, f.size);
          if (name) courseName = name;
        }

        fieldOffset += f.size;
      }

      if (def.globalMsgNum === 20 && lat !== undefined && lng !== undefined) {
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          points.push({
            lat,
            lng,
            ele: enhEle ?? ele,
          });
        }
      }

      pos = fieldOffset + def.devBytes;
    }
  }

  return buildResultFromPoints(points, courseName, fileName);
}

/**
 * Parses a `.gpx`, `.tcx`, or `.fit` route File into a normalized GpxParseResult.
 */
export async function parseRouteFile(file: File): Promise<GpxParseResult> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.fit')) {
    const buf = await file.arrayBuffer();
    return parseFitFileBuffer(buf, file.name);
  }
  if (lowerName.endsWith('.tcx')) {
    const text = await file.text();
    return parseTcxFileContent(text, file.name);
  }

  // Fallback: inspect magic bytes or XML root tag when extension is missing/generic
  const buf = await file.arrayBuffer();
  if (buf.byteLength >= 12) {
    const bytes = new Uint8Array(buf, 8, 4);
    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (sig === '.FIT') {
      return parseFitFileBuffer(buf, file.name);
    }
  }

  const text = new TextDecoder('utf-8').decode(buf);
  if (/<TrainingCenterDatabase\b/i.test(text)) {
    return parseTcxFileContent(text, file.name);
  }
  return parseGpxFileContent(text, file.name);
}
