import { generateTripChecklist, TripProfile, TripStage, WeatherCondition } from '../types/trip';
import { AmenityCategory, StageAmenity } from '../types/amenities';
import { BikeCategory, RiderBikeSpecs } from '../types/specs';
import { getActiveBike, getEffectiveRiderSpecs } from './specsStorage';
import { calculatePhysics, getPowerZone, PowerZoneCode } from './physics';
import { addMinutesToTime } from './nutrition';
import { synthesizeRouteElevationProfile } from './gpxParser';
import { buildDefaultNewTripTemplate } from './storage';
import { getApproxTimezoneOffset, getSolarEphemeris } from './solarVisibility';

const VALID_AMENITY_CATS = new Set<AmenityCategory>([
  'water',
  'cemetery',
  'food',
  'mechanix',
  'essentials',
  'bailout',
]);

export interface SenderBaseline {
  name: string;
  riderWeightKg: number;
  bikeWeightKg: number;
  luggageWeightKg: number;
  cda: number;
  crr: number;
  ftpWatts: number;
  bikeName?: string;
  bikeCategory?: BikeCategory;
}

export interface SharedPlanMeta {
  version: 1 | 2;
  leaveBy: string;
  arrival: string;
  goStatus: 'GO' | 'CAUTION' | 'NO-GO';
  bikeName?: string;
  pinnedCount: number;
  stageCount: number;
  sharedGroupSpeedKmH: number;
  senderBaseline?: SenderBaseline;
}

export interface GroupSyncRiderMetrics {
  label: string;
  avgWatts: number;
  ftpWatts: number;
  ftpPercent: number;
  zone: PowerZoneCode;
  kcal: number;
  movingTimeFormatted: string;
  arrivalHHMM: string;
}

export interface GroupSyncCheckResult {
  groupSpeedKmH: number;
  sender: GroupSyncRiderMetrics;
  receiver: GroupSyncRiderMetrics;
  effortGapPct: number;
  harderRider: 'sender' | 'receiver' | 'balanced';
  isBalanced: boolean;
  recommendedGroupSpeedKmH: number | null;
  recommendedArrivalHHMM: string | null;
  recommendedDurationDeltaMin: number;
  takeaway: string;
}

type CompactAmenityTuple = [
  string, // name
  string, // category
  number, // routeKm
  number, // lat
  number, // lon
  string?, // openingHours
  number? // detourMeters
];

interface CompactStagePayload {
  o: string;
  x: string;
  km: number;
  el: number;
  dd?: string;
  dt?: string;
  pl?: string;
  nt?: string;
  st?: CompactAmenityTuple[];
}

interface CompactPlanPayloadV1 {
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
  st?: CompactAmenityTuple[];
}

interface CompactPlanPayloadV2 {
  v: 2;
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
    lw?: number;
    cda: number;
    crr: number;
  };
  sn?: {
    n: string;
    rw: number;
    bw: number;
    lw: number;
    cda: number;
    crr: number;
    ftp: number;
    bk?: string;
    bc?: BikeCategory;
  };
  sg?: CompactStagePayload[];
  st?: CompactAmenityTuple[];
}

type CompactPlanPayload = CompactPlanPayloadV1 | CompactPlanPayloadV2;

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

function serializeAmenities(amenities?: StageAmenity[]): CompactAmenityTuple[] {
  return (amenities || []).slice(0, 12).map((a) => {
    const entry: CompactAmenityTuple = [
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
}

function deserializeAmenities(rows: CompactAmenityTuple[] | undefined, prefix: string): StageAmenity[] {
  return (rows || []).map((row, idx) => {
    const cat = VALID_AMENITY_CATS.has(row[1] as AmenityCategory)
      ? (row[1] as AmenityCategory)
      : 'water';
    return {
      id: `${prefix}-${idx}-${row[3]?.toFixed(4) ?? 0}-${row[4]?.toFixed(4) ?? 0}`,
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
}

export interface PlanShareExtras {
  leaveByHHMM: string;
  arrivalHHMM: string;
  goStatus: 'GO' | 'CAUTION' | 'NO-GO';
  bikeName?: string;
  senderBaseline?: SenderBaseline;
}

export interface PlanShareSummaryMeta {
  title: string;
  summary: string;
  distanceKm: number;
  elevationM: number;
  stageCount: number;
}

export type ExtractedSharedPlanRef =
  | { kind: 'short'; code: string }
  | { kind: 'token'; token: string }
  | null;

const SHORT_CODE_REGEX = /^[a-z0-9]{6,16}$/i;
const SHORT_PATH_REGEX = /^\/p\/([a-z0-9]{6,16})\/?$/i;

export function buildPlanShareSummaryMeta(
  trip: TripProfile,
  extras: PlanShareExtras
): PlanShareSummaryMeta {
  const hasMultiStage = Boolean(trip.stages && trip.stages.length > 1);
  const stageCount = hasMultiStage ? trip.stages!.length : 1;

  const totalDistanceKm = hasMultiStage
    ? trip.stages!.reduce((sum, st) => sum + (st.route?.distanceKm || 0), 0)
    : trip.route?.distanceKm || 0;
  const totalElevationM = hasMultiStage
    ? trip.stages!.reduce((sum, st) => sum + (st.route?.elevationGainM || 0), 0)
    : trip.route?.elevationGainM || 0;

  const distanceKm = Number(Math.max(0, totalDistanceKm).toFixed(1));
  const elevationM = Math.max(0, Math.round(totalElevationM));
  const kmLabel = distanceKm >= 100 ? `${Math.round(distanceKm)}` : `${distanceKm}`;
  const title = (trip.name || 'Cadence Ride Plan').trim().slice(0, 120) || 'Cadence Ride Plan';

  const parts: string[] = [];
  if (stageCount > 1) {
    parts.push(`${stageCount}-day tour`);
  }
  if (distanceKm > 0) {
    parts.push(`${kmLabel} km`);
  }
  if (elevationM > 0) {
    parts.push(`+${elevationM} m`);
  }
  if (stageCount === 1 && extras.leaveByHHMM) {
    parts.push(
      extras.arrivalHHMM
        ? `${extras.leaveByHHMM} → ${extras.arrivalHHMM}`
        : `Start ${extras.leaveByHHMM}`
    );
  }
  const pinnedCount = hasMultiStage
    ? trip.stages!.reduce((sum, st) => sum + (st.pinnedAmenities?.length || 0), 0)
    : trip.pinnedAmenities?.length || 0;
  if (pinnedCount > 0) {
    parts.push(`${pinnedCount} stop${pinnedCount === 1 ? '' : 's'}`);
  }

  const summary = (parts.join(' · ') || 'Shared cycling plan on Cadence').slice(0, 240);

  return {
    title,
    summary,
    distanceKm,
    elevationM,
    stageCount,
  };
}

export function buildShortPlanShareUrl(code: string, baseUrl?: string): string {
  const cleanCode = code.trim().toLowerCase();
  const rawOrigin =
    baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://cadence.app');
  const origin = rawOrigin.replace(/\/+$/, '');
  return `${origin}/p/${cleanCode}`;
}

export function extractSharedPlanFromLocation(loc: {
  pathname?: string;
  search?: string;
  hash?: string;
}): ExtractedSharedPlanRef {
  const pathname = (loc.pathname || '').trim();
  const pathMatch = pathname.match(SHORT_PATH_REGEX);
  if (pathMatch?.[1]) {
    return { kind: 'short', code: pathMatch[1].toLowerCase() };
  }

  const searchParams = new URLSearchParams(loc.search || '');
  const hashRaw = loc.hash || '';
  const hashParams = new URLSearchParams(hashRaw.startsWith('#') ? hashRaw.slice(1) : hashRaw);

  const shortParam = (searchParams.get('p') || hashParams.get('p') || '').trim();
  if (shortParam && SHORT_CODE_REGEX.test(shortParam)) {
    return { kind: 'short', code: shortParam.toLowerCase() };
  }

  const planToken = (searchParams.get('plan') || hashParams.get('plan') || '').trim();
  if (planToken) {
    return { kind: 'token', token: planToken };
  }

  return null;
}

export function encodePlanShareToken(
  trip: TripProfile,
  extras: PlanShareExtras
): string {
  const hasMultiStage = Boolean(trip.stages && trip.stages.length > 1);
  const stageCount = hasMultiStage ? trip.stages!.length : 1;
  const maxStagePoints = Math.max(24, Math.min(72, Math.floor(210 / stageCount)));

  const coords = trip.route?.coordinates || [];
  const sampled = downsampleCoordinates(coords, hasMultiStage ? maxStagePoints : 90);
  const pl = sampled.length >= 2 ? encodePolyline(sampled) : undefined;
  const pinned = serializeAmenities(trip.pinnedAmenities);

  const stagesPayload: CompactStagePayload[] | undefined = hasMultiStage
    ? trip.stages!.map((stage) => {
        const sCoords = stage.route?.coordinates || [];
        const sSampled = downsampleCoordinates(sCoords, maxStagePoints);
        const sPl = sSampled.length >= 2 ? encodePolyline(sSampled) : undefined;
        const sPinned = serializeAmenities(stage.pinnedAmenities);
        return {
          o: (stage.route?.origin || '').slice(0, 60),
          x: (stage.route?.destination || '').slice(0, 60),
          km: Number((stage.route?.distanceKm || 30).toFixed(1)),
          el: Math.round(stage.route?.elevationGainM || 0),
          ...(stage.departureDate ? { dd: stage.departureDate } : {}),
          ...(stage.departureTime ? { dt: stage.departureTime } : {}),
          ...(sPl ? { pl: sPl } : {}),
          ...(stage.accommodationNote ? { nt: stage.accommodationNote.slice(0, 80) } : {}),
          ...(sPinned.length > 0 ? { st: sPinned } : {}),
        };
      })
    : undefined;

  const sender = extras.senderBaseline;
  const luggageKg = Number(
    (trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0).toFixed(1)
  );

  const payload: CompactPlanPayloadV2 = {
    v: 2,
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
      lw: luggageKg,
      cda: Number(trip.physics.cda.toFixed(3)),
      crr: Number(trip.physics.crr.toFixed(4)),
    },
    ...(sender
      ? {
          sn: {
            n: (sender.name || 'Partner').slice(0, 32),
            rw: Number(sender.riderWeightKg.toFixed(1)),
            bw: Number(sender.bikeWeightKg.toFixed(1)),
            lw: Number(sender.luggageWeightKg.toFixed(1)),
            cda: Number(sender.cda.toFixed(3)),
            crr: Number(sender.crr.toFixed(4)),
            ftp: Math.round(sender.ftpWatts),
            ...(sender.bikeName ? { bk: sender.bikeName.slice(0, 40) } : {}),
            ...(sender.bikeCategory ? { bc: sender.bikeCategory } : {}),
          },
        }
      : {}),
    ...(stagesPayload ? { sg: stagesPayload } : {}),
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
    senderBaseline?: SenderBaseline;
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
    if (!parsed || (parsed.v !== 1 && parsed.v !== 2) || !parsed.n || !parsed.km) {
      return null;
    }

    const base = buildDefaultNewTripTemplate(lang);
    const resolvedTag = parsed.tag || 'SPORT';
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

    const deterministicId = `shared-plan-${hashTokenShort(token)}`;
    const parsedV2 = parsed.v === 2 ? parsed : null;

    // Reconstruct multi-day stages if v2 includes sg[]
    let stages: TripStage[] | undefined;
    if (parsedV2?.sg && parsedV2.sg.length > 1) {
      stages = parsedV2.sg.map((st, idx) => {
        const stCoords = st.pl ? decodePolyline(st.pl) : [];
        const stMode = stCoords.length >= 2 ? 'corridor' : 'manual-radius';
        const stSynth = synthesizeRouteElevationProfile({
          ...base.route,
          routeMode: stMode,
          origin: st.o || `Stage ${idx + 1}`,
          destination: st.x || `Finish ${idx + 1}`,
          distanceKm: st.km,
          elevationGainM: st.el,
          targetSpeedKmH: parsed.sp,
          coordinates: stCoords.length >= 2 ? stCoords : undefined,
        });
        return {
          id: `${deterministicId}-day-${idx + 1}`,
          dayNumber: idx + 1,
          departureDate: st.dd || parsed.dd || base.departureDate || '',
          departureTime: st.dt || parsed.dt || parsed.lb || '08:00',
          accommodationNote: st.nt,
          pinnedAmenities: deserializeAmenities(st.st, `${deterministicId}-d${idx + 1}-stop`),
          office: {
            ...base.office,
            gateName: st.x || `Stage ${idx + 1}`,
          },
          customChips: [],
          weather: resolvedWeather,
          route: {
            ...base.route,
            routeMode: stMode,
            origin: st.o || `Stage ${idx + 1}`,
            destination: st.x || `Finish ${idx + 1}`,
            distanceKm: st.km,
            elevationGainM: st.el,
            targetSpeedKmH: parsed.sp,
            urbanTrafficDelayMinutes: 0,
            gateSecurityDelayMinutes: 0,
            coordinates: stCoords.length >= 2 ? stCoords : undefined,
            elevationProfile: stSynth.elevationProfile,
            terrainSummary: stSynth.terrainSummary,
          },
        };
      });
    }

    const firstStage = stages?.[0];
    const coords = firstStage?.route.coordinates ?? (parsed.pl ? decodePolyline(parsed.pl) : []);
    const routeMode = coords.length >= 2 ? 'corridor' : 'manual-radius';

    const synthesized = firstStage
      ? {
          elevationProfile: firstStage.route.elevationProfile,
          terrainSummary: firstStage.route.terrainSummary,
        }
      : synthesizeRouteElevationProfile({
          ...base.route,
          routeMode,
          origin: parsed.o || base.route.origin,
          destination: parsed.x || base.route.destination,
          distanceKm: parsed.km,
          elevationGainM: parsed.el,
          targetSpeedKmH: parsed.sp,
          coordinates: coords.length >= 2 ? coords : undefined,
        });

    const pinnedAmenities: StageAmenity[] =
      firstStage?.pinnedAmenities && firstStage.pinnedAmenities.length > 0
        ? firstStage.pinnedAmenities
        : deserializeAmenities(parsed.st, 'shared-stop');

    const resolvedOrigin = firstStage?.route.origin || parsed.o || base.route.origin || 'Start';
    const resolvedDest = firstStage?.route.destination || parsed.x || base.route.destination || 'Finish';
    const resolvedKm = firstStage?.route.distanceKm ?? parsed.km;
    const resolvedEl = firstStage?.route.elevationGainM ?? parsed.el;
    const resolvedLeaveBy = parsed.lb || firstStage?.departureTime || parsed.dt || base.departureTime || '08:00';
    const resolvedArrival = parsed.ar || parsed.dt || '10:30';

    const stageCount = stages?.length ?? 1;
    const totalPinnedCount = stages
      ? stages.reduce((sum, s) => sum + (s.pinnedAmenities?.length || 0), 0) || pinnedAmenities.length
      : pinnedAmenities.length;

    const generatedDescription =
      stageCount > 1
        ? lang === 'fr'
          ? `Tour ${stageCount} jours · ${Math.round(stages!.reduce((s, st) => s + st.route.distanceKm, 0))} km · Plan partagé`
          : `${stageCount}-day tour · ${Math.round(stages!.reduce((s, st) => s + st.route.distanceKm, 0))} km · Shared blueprint`
        : lang === 'fr'
        ? `${resolvedKm} km · ${resolvedOrigin} → ${resolvedDest} (+${resolvedEl} m) · Plan de groupe (${pinnedAmenities.length} arrêt${pinnedAmenities.length > 1 ? 's' : ''})`
        : `${resolvedKm} km · ${resolvedOrigin} → ${resolvedDest} (+${resolvedEl} m) · Shared Group Plan (${pinnedAmenities.length} stop${pinnedAmenities.length === 1 ? '' : 's'})`;

    const luggageWeightKg = parsedV2?.ph?.lw ?? base.physics.luggageWeightKg ?? base.physics.gearWeightKg;

    const trip: TripProfile = {
      ...base,
      id: deterministicId,
      name: parsed.n,
      tag: resolvedTag,
      description: generatedDescription,
      updatedAt: new Date().toISOString(),
      departureDate: firstStage?.departureDate || parsed.dd || base.departureDate,
      departureTime: resolvedLeaveBy,
      arriveAtMode: typeof parsed.am === 'boolean' ? parsed.am : false,
      customChips: [],
      ruleSettings: {},
      office: {
        ...base.office,
        gateName: resolvedDest || parsed.n,
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
        distanceKm: resolvedKm,
        elevationGainM: resolvedEl,
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
        luggageWeightKg,
        gearWeightKg: luggageWeightKg,
        cda: parsed.ph?.cda ?? base.physics.cda,
        crr: parsed.ph?.crr ?? base.physics.crr,
      },
      checklist: generateTripChecklist(resolvedTag, resolvedKm, resolvedWeather, {
        lang,
        customChips: [],
      }),
      pinnedAmenities,
      ...(stages ? { stages, activeStageIndex: 0 } : {}),
    };

    const senderBaseline: SenderBaseline | undefined = parsedV2?.sn
      ? {
          name: parsedV2.sn.n || 'Partner',
          riderWeightKg: parsedV2.sn.rw,
          bikeWeightKg: parsedV2.sn.bw,
          luggageWeightKg: parsedV2.sn.lw,
          cda: parsedV2.sn.cda,
          crr: parsedV2.sn.crr,
          ftpWatts: parsedV2.sn.ftp,
          bikeName: parsedV2.sn.bk,
          bikeCategory: parsedV2.sn.bc,
        }
      : undefined;

    return {
      trip,
      sharedMeta: {
        version: parsed.v,
        leaveBy: resolvedLeaveBy,
        arrival: resolvedArrival,
        goStatus: parsed.go || 'GO',
        bikeName: parsed.bk,
        pinnedCount: totalPinnedCount,
        stageCount,
        sharedGroupSpeedKmH: parsed.sp,
        senderBaseline,
      },
    };
  } catch (err) {
    console.warn('Failed to decode shared plan URL token:', err);
    return null;
  }
}

/**
 * Applies the receiving rider's own bike, weight, tyres, and luggage onto a shared blueprint
 * without mutating the shared route geometry, stage cuts, dates, start time, group speed, or pinned stops.
 */
export function applyPersonalLensToSharedTrip(
  sharedTrip: TripProfile,
  receiverSpecs: RiderBikeSpecs,
  options?: { luggageWeightKg?: number; lang?: 'en' | 'fr' }
): TripProfile {
  const effective = getEffectiveRiderSpecs(receiverSpecs);
  const activeBike = getActiveBike(receiverSpecs);
  const lang = options?.lang ?? 'en';
  const resolvedRiderWeightKg =
    typeof receiverSpecs.riderWeightKg === 'number' &&
    Number.isFinite(receiverSpecs.riderWeightKg) &&
    receiverSpecs.riderWeightKg > 25
      ? receiverSpecs.riderWeightKg
      : effective.riderWeightKg;
  const luggageKg =
    typeof options?.luggageWeightKg === 'number' && Number.isFinite(options.luggageWeightKg)
      ? Math.max(0, options.luggageWeightKg)
      : sharedTrip.physics.luggageWeightKg ?? sharedTrip.physics.gearWeightKg ?? 0;

  return {
    ...sharedTrip,
    updatedAt: new Date().toISOString(),
    physics: {
      ...sharedTrip.physics,
      riderWeightKg: resolvedRiderWeightKg,
      bikeWeightKg: activeBike.weightKg,
      luggageWeightKg: luggageKg,
      gearWeightKg: luggageKg,
      cda: activeBike.cda,
      crr: activeBike.crr,
    },
    checklist: generateTripChecklist(sharedTrip.tag, sharedTrip.route.distanceKm, sharedTrip.weather, {
      lang,
      customChips: sharedTrip.customChips,
      isTubeless: activeBike.isTubeless,
      totalDays: sharedTrip.stages?.length ?? 1,
    }),
  };
}

/**
 * Compares Sender vs. Receiver effort on the active stage at the shared group pace,
 * and suggests a comfortable group pace if one rider is pushed into Z3+/Z4 or effort diverges.
 */
export function computeGroupSyncCheck(
  trip: TripProfile,
  sender: SenderBaseline,
  receiverSpecs: RiderBikeSpecs,
  departureHHMM: string,
  lang: 'en' | 'fr' = 'en'
): GroupSyncCheckResult {
  const isFr = lang === 'fr';
  const groupSpeedKmH = Math.max(10, Number((trip.route.targetSpeedKmH || 20).toFixed(1)));
  const activeBike = getActiveBike(receiverSpecs);
  const effectiveReceiver = getEffectiveRiderSpecs(receiverSpecs);
  const receiverLabel = receiverSpecs.riderName?.trim() || (isFr ? 'Vous' : 'You');
  const senderLabel = sender.name || (isFr ? 'Partenaire' : 'Partner');
  const receiverWeightKg =
    typeof receiverSpecs.riderWeightKg === 'number' &&
    Number.isFinite(receiverSpecs.riderWeightKg) &&
    receiverSpecs.riderWeightKg > 25
      ? receiverSpecs.riderWeightKg
      : effectiveReceiver.riderWeightKg;
  const receiverFtpWatts =
    typeof receiverSpecs.ftpWatts === 'number' &&
    Number.isFinite(receiverSpecs.ftpWatts) &&
    receiverSpecs.ftpWatts >= 80
      ? receiverSpecs.ftpWatts
      : effectiveReceiver.ftpWatts;

  const routeAtSpeed = (spd: number) => ({
    ...trip.route,
    pacingMode: 'speed' as const,
    targetSpeedKmH: spd,
  });

  const senderPhysicsBase = {
    ...trip.physics,
    riderWeightKg: sender.riderWeightKg,
    bikeWeightKg: sender.bikeWeightKg,
    luggageWeightKg: sender.luggageWeightKg,
    gearWeightKg: sender.luggageWeightKg,
    cda: sender.cda,
    crr: sender.crr,
  };

  const receiverPhysicsBase = {
    ...trip.physics,
    riderWeightKg: receiverWeightKg,
    bikeWeightKg: activeBike.weightKg,
    luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0,
    gearWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 0,
    cda: activeBike.cda,
    crr: activeBike.crr,
  };

  const sCalc = calculatePhysics(
    senderPhysicsBase,
    routeAtSpeed(groupSpeedKmH),
    trip.weather,
    lang,
    sender.ftpWatts
  );
  const rCalc = calculatePhysics(
    receiverPhysicsBase,
    routeAtSpeed(groupSpeedKmH),
    trip.weather,
    lang,
    receiverFtpWatts
  );

  const sFtpPct = Math.round(sCalc.ftpPercent);
  const rFtpPct = Math.round(rCalc.ftpPercent);
  const sZone = getPowerZone(sFtpPct);
  const rZone = getPowerZone(rFtpPct);
  const sArr = addMinutesToTime(departureHHMM, Math.round(sCalc.movingTimeSeconds / 60));
  const rArr = addMinutesToTime(departureHHMM, Math.round(rCalc.movingTimeSeconds / 60));

  const effortGapPct = Math.abs(sFtpPct - rFtpPct);
  const harderRider: 'sender' | 'receiver' | 'balanced' =
    effortGapPct < 6 && Math.max(sFtpPct, rFtpPct) <= 75
      ? 'balanced'
      : rFtpPct >= sFtpPct
      ? 'receiver'
      : 'sender';

  const needsAdjustment =
    Math.max(sFtpPct, rFtpPct) > 75 || (effortGapPct >= 12 && Math.max(sFtpPct, rFtpPct) > 70);

  let recommendedGroupSpeedKmH: number | null = null;
  let recommendedArrivalHHMM: string | null = null;
  let recommendedDurationDeltaMin = 0;

  if (needsAdjustment) {
    const minSpeed = Math.max(12, groupSpeedKmH - 8);
    for (let cand = Number((groupSpeedKmH - 0.5).toFixed(1)); cand >= minSpeed; cand = Number((cand - 0.5).toFixed(1))) {
      const sCand = calculatePhysics(
        senderPhysicsBase,
        routeAtSpeed(cand),
        trip.weather,
        lang,
        sender.ftpWatts
      );
      const rCand = calculatePhysics(
        receiverPhysicsBase,
        routeAtSpeed(cand),
        trip.weather,
        lang,
        receiverFtpWatts
      );
      if (Math.max(sCand.ftpPercent, rCand.ftpPercent) <= 74) {
        recommendedGroupSpeedKmH = cand;
        const candMin = Math.round(rCand.movingTimeSeconds / 60);
        const baseMin = Math.round(rCalc.movingTimeSeconds / 60);
        recommendedDurationDeltaMin = Math.max(0, candMin - baseMin);
        recommendedArrivalHHMM = addMinutesToTime(departureHHMM, candMin);
        break;
      }
    }
  }

  const isBalanced = !needsAdjustment;

  const formatSunsetMargin = (arrivalHHMM: string): string => {
    const coords = trip.route?.coordinates?.[0] || [47.2184, -1.5536];
    const dateStr = trip.departureDate || new Date().toISOString().split('T')[0];
    const tz = getApproxTimezoneOffset(dateStr, coords[1]);
    const solar = getSolarEphemeris(coords[0], coords[1], dateStr, tz);
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const diffMin = toMin(solar.sunset) - toMin(arrivalHHMM);
    if (Math.abs(diffMin) >= 60) {
      const hrs = Math.round((Math.abs(diffMin) / 60) * 10) / 10;
      if (diffMin > 0) {
        return isFr ? `, ${hrs}h avant le coucher` : `, ${hrs}h before sunset`;
      }
      return isFr ? `, ${hrs}h après la nuit` : `, ${hrs}h after sunset`;
    }
    if (diffMin > 0) {
      return isFr ? `, ${diffMin} min avant la nuit` : `, ${diffMin} min before sunset`;
    }
    return isFr ? `, ${Math.abs(diffMin)} min après la nuit` : `, ${Math.abs(diffMin)} min after sunset`;
  };

  let takeaway: string;
  if (isBalanced) {
    takeaway = isFr
      ? `À ${groupSpeedKmH} km/h, vous roulez tous les deux en ${rZone}/${sZone} confortable (${Math.round(rCalc.legWatts)} W vs ${Math.round(sCalc.legWatts)} W).`
      : `At ${groupSpeedKmH} km/h, both riders stay in a comfortable ${rZone}/${sZone} endurance groove (${Math.round(rCalc.legWatts)} W vs ${Math.round(sCalc.legWatts)} W).`;
  } else if (recommendedGroupSpeedKmH !== null && recommendedArrivalHHMM) {
    const harderName = harderRider === 'receiver' ? receiverLabel : senderLabel;
    const harderPct = harderRider === 'receiver' ? rFtpPct : sFtpPct;
    const harderZone = harderRider === 'receiver' ? rZone : sZone;
    const sunsetNote = formatSunsetMargin(recommendedArrivalHHMM);
    takeaway = isFr
      ? `À ${groupSpeedKmH} km/h, ${harderName} monte à ${harderPct}% FTP (${harderZone}). Passez à ${recommendedGroupSpeedKmH} km/h pour finir frais tous les deux (arrivée ${recommendedArrivalHHMM}${sunsetNote}).`
      : `At ${groupSpeedKmH} km/h, ${harderName} hits ${harderPct}% FTP (${harderZone}). Ease to ${recommendedGroupSpeedKmH} km/h so you both finish fresh (arrival ${recommendedArrivalHHMM}${sunsetNote}).`;
  } else {
    takeaway = isFr
      ? `Écart d’effort de ${effortGapPct}% FTP entre vous deux à ${groupSpeedKmH} km/h — prévoyez des relais doux en bosse.`
      : `${effortGapPct}% FTP effort gap at ${groupSpeedKmH} km/h — take turns gently on climbs so nobody cooks early.`;
  }

  return {
    groupSpeedKmH,
    sender: {
      label: senderLabel,
      avgWatts: Math.round(sCalc.legWatts),
      ftpWatts: Math.round(sender.ftpWatts),
      ftpPercent: sFtpPct,
      zone: sZone,
      kcal: Math.round(sCalc.totalKcalBurn),
      movingTimeFormatted: sCalc.movingTimeFormatted,
      arrivalHHMM: sArr,
    },
    receiver: {
      label: receiverLabel,
      avgWatts: Math.round(rCalc.legWatts),
      ftpWatts: Math.round(receiverFtpWatts),
      ftpPercent: rFtpPct,
      zone: rZone,
      kcal: Math.round(rCalc.totalKcalBurn),
      movingTimeFormatted: rCalc.movingTimeFormatted,
      arrivalHHMM: rArr,
    },
    effortGapPct,
    harderRider,
    isBalanced,
    recommendedGroupSpeedKmH,
    recommendedArrivalHHMM,
    recommendedDurationDeltaMin,
    takeaway,
  };
}
