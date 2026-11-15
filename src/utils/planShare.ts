import { generateTripChecklist, TripProfile, WeatherCondition } from '../types/trip';
import { AmenityCategory, StageAmenity } from '../types/amenities';
import { synthesizeRouteElevationProfile } from './gpxParser';
import { buildDefaultNewTripTemplate } from './storage';

const VALID_AMENITY_CATS = new Set<AmenityCategory>([
  'water',
  'cemetery',
  'food',
  'mechanix',
  'essentials',
  'bailout',
]);

export interface SharedPlanMeta {
  leaveBy: string;
  arrival: string;
  goStatus: 'GO' | 'CAUTION' | 'NO-GO';
  bikeName?: string;
  pinnedCount: number;
}

interface CompactPlanPayload {
  v: 1;
  n: string;
  tag?: string;
  o: string;
  x: string;
  km: number;
  el: number;
  sp: number;
  dd?: string;
  dt?: string;
  lb?: string;
  ar?: string;
  am?: boolean;
  go: 'GO' | 'CAUTION' | 'NO-GO';
  bk?: string;
  pl?: string;
  w: {
    t: number;
    wd: number;
    ws: number;
    pr: number;
    wc?: number;
  };
  ph: {
    rw: number;
    bw: number;
    cda: number;
    crr: number;
  };
  st?: Array<
    [
      string, // name
      string, // category
      number, // routeKm
      number, // lat
      number, // lon
      string?, // openingHours
      number? // detourMeters
    ]
  >;
}

/** Downsamples polyline coordinates while preserving start, end, and route geometry. */
export function downsampleCoordinates(
  coords: [number, number][],
  maxPoints = 96
): [number, number][] {
  if (!coords || coords.length <= maxPoints) return coords || [];
  const step = (coords.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

/** Standard Google Encoded Polyline Algorithm (1e5 precision) for compact share URLs. */
export function encodePolyline(coords: [number, number][]): string {
  let prevLat = 0;
  let prevLon = 0;
  let output = '';

  const encodeValue = (num: number) => {
    let sgnNum = num < 0 ? ~(num << 1) : num << 1;
    while (sgnNum >= 0x20) {
      output += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
      sgnNum >>= 5;
    }
    output += String.fromCharCode(sgnNum + 63);
  };

  for (const [lat, lon] of coords) {
    const eLat = Math.round(lat * 1e5);
    const eLon = Math.round(lon * 1e5);
    encodeValue(eLat - prevLat);
    encodeValue(eLon - prevLon);
    prevLat = eLat;
    prevLon = eLon;
  }

  return output;
}

export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      if (index >= encoded.length) return coords;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      if (index >= encoded.length) return coords;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coords.push([Number((lat / 1e5).toFixed(5)), Number((lon / 1e5).toFixed(5))]);
  }

  return coords;
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function hashTokenShort(token: string): string {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function encodePlanShareToken(
  trip: TripProfile,
  extras: {
    leaveByHHMM: string;
    arrivalHHMM: string;
    goStatus: 'GO' | 'CAUTION' | 'NO-GO';
    bikeName?: string;
  }
): string {
  const coords = trip.route?.coordinates || [];
  const sampled = downsampleCoordinates(coords, 90);
  const pl = sampled.length >= 2 ? encodePolyline(sampled) : undefined;

  const pinned = (trip.pinnedAmenities || []).slice(0, 12).map((a) => {
    const entry: [string, string, number, number, number, string?, number?] = [
      a.name.slice(0, 60),
      a.category,
      Number(a.routeKm.toFixed(1)),
      Number(a.lat.toFixed(5)),
      Number(a.lon.toFixed(5)),
    ];
    if (a.openingHours) {
      entry[5] = a.openingHours.slice(0, 48);
    }
    if (typeof a.detourMeters === 'number') {
      entry[6] = Math.round(a.detourMeters);
    }
    return entry;
  });

  const payload: CompactPlanPayload = {
    v: 1,
    n: (trip.name || 'Cadence Ride').slice(0, 90),
    tag: trip.tag,
    o: (trip.route.origin || '').slice(0, 60),
    x: (trip.route.destination || '').slice(0, 60),
    km: Number((trip.route.distanceKm || 30).toFixed(1)),
    el: Math.round(trip.route.elevationGainM || 0),
    sp: Number((trip.route.targetSpeedKmH || 24).toFixed(1)),
    dd: trip.departureDate,
    dt: trip.departureTime,
    lb: extras.leaveByHHMM,
    ar: extras.arrivalHHMM,
    am: trip.arriveAtMode,
    go: extras.goStatus,
    bk: extras.bikeName?.slice(0, 50),
    pl,
    w: {
      t: Math.round(trip.weather.temperatureC),
      wd: Math.round(trip.weather.windDirectionDegrees),
      ws: Math.round(trip.weather.baseWindSpeedKmH),
      pr: Math.round(trip.weather.precipitationRiskPercent ?? 0),
      wc: trip.weather.weatherCode,
    },
    ph: {
      rw: Number(trip.physics.riderWeightKg.toFixed(1)),
      bw: Number(trip.physics.bikeWeightKg.toFixed(1)),
      cda: Number(trip.physics.cda.toFixed(3)),
      crr: Number(trip.physics.crr.toFixed(4)),
    },
    ...(pinned.length > 0 ? { st: pinned } : {}),
  };

  return utf8ToBase64Url(JSON.stringify(payload));
}

export function buildPlanShareUrl(
  trip: TripProfile,
  extras: {
    leaveByHHMM: string;
    arrivalHHMM: string;
    goStatus: 'GO' | 'CAUTION' | 'NO-GO';
    bikeName?: string;
  },
  baseUrl?: string
): string {
  const token = encodePlanShareToken(trip, extras);
  const origin =
    baseUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://cadence.app/');
  const sep = origin.includes('?') ? '&' : '?';
  return `${origin}${sep}plan=${token}`;
}

export function decodePlanShareToken(
  token: string,
  lang: 'en' | 'fr' = 'en'
): { trip: TripProfile; sharedMeta: SharedPlanMeta } | null {
  try {
    if (!token || token.length < 10) return null;
    const json = base64UrlToUtf8(token.trim());
    const parsed = JSON.parse(json) as CompactPlanPayload;
    if (!parsed || parsed.v !== 1 || !parsed.n || !parsed.km) {
      return null;
    }

    const base = buildDefaultNewTripTemplate(lang);
    const coords = parsed.pl ? decodePolyline(parsed.pl) : [];
    const routeMode = coords.length >= 2 ? 'corridor' : 'manual-radius';

    const synthesized = synthesizeRouteElevationProfile({
      ...base.route,
      routeMode,
      origin: parsed.o || base.route.origin,
      destination: parsed.x || base.route.destination,
      distanceKm: parsed.km,
      elevationGainM: parsed.el,
      targetSpeedKmH: parsed.sp,
      coordinates: coords.length >= 2 ? coords : undefined,
    });

    const pinnedAmenities: StageAmenity[] = (parsed.st || []).map((row, idx) => {
      const cat = VALID_AMENITY_CATS.has(row[1] as AmenityCategory)
        ? (row[1] as AmenityCategory)
        : 'water';
      return {
        id: `shared-stop-${idx}-${row[3]?.toFixed(4) ?? 0}-${row[4]?.toFixed(4) ?? 0}`,
        name: row[0] || 'Pinned Stop',
        category: cat,
        subType: cat,
        routeKm: Number(row[2] ?? 0),
        lat: Number(row[3] ?? 0),
        lon: Number(row[4] ?? 0),
        detourMeters: typeof row[6] === 'number' ? row[6] : 0,
        openingHours: row[5] || undefined,
        isPinned: true,
      };
    });

    const resolvedTag = parsed.tag || 'SPORT';
    const resolvedOrigin = parsed.o || base.route.origin || 'Start';
    const resolvedDest = parsed.x || base.route.destination || 'Finish';
    const resolvedLeaveBy = parsed.lb || parsed.dt || base.departureTime || '08:00';
    const resolvedArrival = parsed.ar || parsed.dt || '10:30';
    const resolvedWindSpeed = parsed.w?.ws ?? base.weather.baseWindSpeedKmH;
    const resolvedWeather: WeatherCondition = {
      ...base.weather,
      temperatureC: parsed.w?.t ?? base.weather.temperatureC,
      windDirectionDegrees: parsed.w?.wd ?? base.weather.windDirectionDegrees,
      baseWindSpeedKmH: resolvedWindSpeed,
      precipitationRiskPercent: parsed.w?.pr ?? base.weather.precipitationRiskPercent,
      weatherCode: parsed.w?.wc ?? base.weather.weatherCode,
      isHeadwindActive: resolvedWindSpeed >= 8,
    };

    const generatedDescription =
      lang === 'fr'
        ? `${parsed.km} km · ${resolvedOrigin} → ${resolvedDest} (+${parsed.el} m) · Plan de groupe (${pinnedAmenities.length} arrêt${pinnedAmenities.length > 1 ? 's' : ''})`
        : `${parsed.km} km · ${resolvedOrigin} → ${resolvedDest} (+${parsed.el} m) · Shared Group Plan (${pinnedAmenities.length} stop${pinnedAmenities.length === 1 ? '' : 's'})`;

    const deterministicId = `shared-plan-${hashTokenShort(token)}`;
    const trip: TripProfile = {
      ...base,
      id: deterministicId,
      name: parsed.n,
      tag: resolvedTag,
      description: generatedDescription,
      updatedAt: new Date().toISOString(),
      departureDate: parsed.dd || base.departureDate,
      departureTime: resolvedLeaveBy,
      arriveAtMode: typeof parsed.am === 'boolean' ? parsed.am : false,
      customChips: [],
      ruleSettings: {},
      office: {
        ...base.office,
        gateName: parsed.x || parsed.n,
        shiftStartTime: resolvedArrival,
        targetGateArrivalTime: resolvedArrival,
        lockerRefuelMinutes: 0,
        showerChangeMinutes: 0,
        breakRoomBreakfastMinutes: 0,
        strictNoFoodInOpenSpace: false,
        badgeRequiredForGate: false,
        notes: '',
      },
      route: {
        ...base.route,
        routeMode,
        origin: resolvedOrigin,
        destination: resolvedDest,
        distanceKm: parsed.km,
        elevationGainM: parsed.el,
        targetSpeedKmH: parsed.sp,
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
        coordinates: coords.length >= 2 ? coords : undefined,
        elevationProfile: synthesized.elevationProfile,
        terrainSummary: synthesized.terrainSummary,
      },
      weather: resolvedWeather,
      physics: {
        ...base.physics,
        riderWeightKg: parsed.ph?.rw ?? base.physics.riderWeightKg,
        bikeWeightKg: parsed.ph?.bw ?? base.physics.bikeWeightKg,
        cda: parsed.ph?.cda ?? base.physics.cda,
        crr: parsed.ph?.crr ?? base.physics.crr,
      },
      checklist: generateTripChecklist(resolvedTag, parsed.km, resolvedWeather, {
        lang,
        customChips: [],
      }),
      pinnedAmenities,
    };

    return {
      trip,
      sharedMeta: {
        leaveBy: parsed.lb || trip.departureTime || '08:00',
        arrival: parsed.ar || trip.office.targetGateArrivalTime || '09:30',
        goStatus: parsed.go || 'GO',
        bikeName: parsed.bk,
        pinnedCount: pinnedAmenities.length,
      },
    };
  } catch (err) {
    console.warn('Failed to decode shared plan URL token:', err);
    return null;
  }
}
