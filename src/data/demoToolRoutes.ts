import {
  buildTerrainSummaryFromProfile,
  GpxParseResult,
  synthesizeRouteElevationProfile,
} from '../utils/gpxParser';
import { ElevationProfilePoint, TripProfile } from '../types/trip';
import { RiderBikeSpecs } from '../types/specs';
import { getActiveBike, getEffectiveRiderSpecs } from '../utils/specsStorage';
import { buildDefaultNewTripTemplate } from '../utils/storage';
import { getLocalTodayIso } from '../services/weatherService';

/**
 * Bundled preset trip IDs from presetTrips.ts — never treated as user-created rides
 * inside Multi-Tool so first-time visitors never see fake pre-loaded French trips.
 */
const BUNDLED_PRESET_TRIP_IDS = new Set([
  'commute-nantes-atlantis',
  'commute-paris-seine',
  'commute-lyon-saone',
  'sport-cote-sauvage',
  'sport-annecy-forclaz',
  'sport-briere-gravel',
  'bikepacking-jade-coast',
  'bikepacking-canal-redon',
  'bikepacking-drome-vercors',
  'escapade-clisson-spa',
  'escapade-saumur-chinon',
  'escapade-annecy-aix',
]);

export function isUserCreatedTrip(trip?: TripProfile | null): trip is TripProfile {
  if (!trip || !trip.id) return false;
  if (BUNDLED_PRESET_TRIP_IDS.has(trip.id)) return false;
  if (trip.id.startsWith('preset-')) return false;
  return Boolean(trip.route?.coordinates && trip.route.coordinates.length >= 2 && trip.route.distanceKm > 0);
}

export interface DemoToolRoute {
  id: string;
  labelEn: string;
  labelFr: string;
  subtitleEn: string;
  subtitleFr: string;
  badgeEn: string;
  badgeFr: string;
  isLoop: boolean;
  defaultSpeedKmH: number;
  defaultSurface: 'paved' | 'mixed' | 'gravel';
  parsed: GpxParseResult;
}

function buildElevationTrace(
  totalDistanceKm: number,
  anchors: Array<{ km: number; eleM: number }>,
  samples = 90
): ElevationProfilePoint[] {
  if (anchors.length < 2) {
    return Array.from({ length: samples }, (_, i) => ({
      distKm: Number(((i / Math.max(1, samples - 1)) * totalDistanceKm).toFixed(2)),
      eleM: 50,
      gradePct: 0,
    }));
  }
  const raw: Array<{ distKm: number; eleM: number }> = [];
  for (let i = 0; i < samples; i++) {
    const distKm = Number(((i / (samples - 1)) * totalDistanceKm).toFixed(2));
    let segIdx = 0;
    for (let j = 0; j < anchors.length - 1; j++) {
      if (distKm >= anchors[j].km) segIdx = j;
    }
    const a = anchors[segIdx];
    const b = anchors[Math.min(anchors.length - 1, segIdx + 1)];
    const span = Math.max(0.01, b.km - a.km);
    const t = Math.max(0, Math.min(1, (distKm - a.km) / span));
    const smoothT = t * t * (3 - 2 * t);
    const eleM = Math.round(a.eleM + (b.eleM - a.eleM) * smoothT);
    raw.push({ distKm, eleM });
  }
  return raw.map((pt, idx) => {
    if (idx === 0) return { ...pt, gradePct: 0 };
    const prev = raw[idx - 1];
    const dKm = Math.max(0.01, pt.distKm - prev.distKm);
    const gradePct = Number((((pt.eleM - prev.eleM) / (dKm * 1000)) * 100).toFixed(1));
    return { ...pt, gradePct };
  });
}

function makeDemoParsed(params: {
  trackName: string;
  originLabel: string;
  destLabel: string;
  distanceKm: number;
  elevationGainM: number;
  coordinates: [number, number][];
  anchors: Array<{ km: number; eleM: number }>;
}): GpxParseResult {
  const elevationProfile = buildElevationTrace(params.distanceKm, params.anchors);
  const terrainSummary = buildTerrainSummaryFromProfile(
    elevationProfile,
    params.distanceKm,
    params.elevationGainM,
    params.trackName,
    params.coordinates
  );
  return {
    trackName: params.trackName,
    originLabel: params.originLabel,
    destLabel: params.destLabel,
    distanceKm: params.distanceKm,
    elevationGainM: params.elevationGainM,
    elevationLossM: params.elevationGainM,
    coordinates: params.coordinates,
    elevationProfile,
    terrainSummary,
  };
}

export function buildParsedRouteFromTrip(trip: TripProfile, lang: 'en' | 'fr'): GpxParseResult {
  const isFr = lang === 'fr';
  const synth = synthesizeRouteElevationProfile(trip.route);
  return {
    trackName: trip.name,
    originLabel: trip.route.origin || (isFr ? 'Départ' : 'Start'),
    destLabel: trip.route.destination || (isFr ? 'Arrivée' : 'Finish'),
    distanceKm: trip.route.distanceKm,
    elevationGainM: trip.route.elevationGainM || 0,
    elevationLossM: trip.route.elevationLossM ?? trip.route.elevationGainM ?? 0,
    coordinates: trip.route.coordinates || [],
    elevationProfile: synth.elevationProfile,
    terrainSummary: trip.route.terrainSummary || synth.terrainSummary,
  };
}

// 1. Canal de Nantes à Brest Gravel Loop (~54 km closed loop, Sucé ↔ Casson ↔ Quiheix ↔ Nort ↔ Sucé)
const CANAL_COORDS: [number, number][] = [
  [47.3446, -1.5293], // Sucé-sur-Erdre Port
  [47.3635, -1.5512], // Toward Casson
  [47.3861, -1.5594], // Casson
  [47.4122, -1.5768], // Canal de Nantes à Brest west
  [47.4342, -1.5582], // Écluse de Quiheix
  [47.4418, -1.5245], // Canal towpath east
  [47.4395, -1.4987], // Nort-sur-Erdre / Port-Mulon
  [47.4241, -1.4712], // Joué-sur-Erdre lane
  [47.4026, -1.4545], // Erdre east bank
  [47.3792, -1.4628], // Petit-Mars countryside
  [47.3588, -1.4795], // Saint-Mars-du-Désert edge
  [47.3442, -1.5038], // Erdre valley return
  [47.3446, -1.5293], // Back to Sucé-sur-Erdre
];

// 2. Mont Ventoux Classic Loop (~58 km, Bédoin → Chalet Reynard → Sommet 1909m → Malaucène → Bédoin)
const VENTOUX_COORDS: [number, number][] = [
  [44.1235, 5.1795], // Bédoin (305 m)
  [44.1422, 5.2112], // Sainte-Colombe
  [44.1495, 5.2368], // Saint-Estève (540 m)
  [44.1605, 5.2632], // Forest steep ramps (980 m)
  [44.1568, 5.2852], // Chalet Reynard (1417 m)
  [44.1682, 5.2824], // Col des Tempêtes (1825 m)
  [44.1736, 5.2787], // Sommet du Mont Ventoux (1909 m)
  [44.1842, 5.2495], // Mont Serein north descent (1420 m)
  [44.1935, 5.2098], // Groseau valley (850 m)
  [44.1742, 5.1322], // Malaucène (320 m)
  [44.1462, 5.1495], // Col de la Madeleine (448 m)
  [44.1235, 5.1795], // Back to Bédoin (305 m)
];

// 3. Loire River & Vineyards Sunday Loop (~66 km, Nantes → Mauves → Champtoceaux → Ancenis → Loire South → Nantes)
const LOIRE_COORDS: [number, number][] = [
  [47.2184, -1.5536], // Nantes center
  [47.2465, -1.4822], // Sainte-Luce-sur-Loire
  [47.2948, -1.3924], // Mauves-sur-Loire
  [47.3345, -1.3186], // Oudon
  [47.3652, -1.1782], // Ancenis bridge
  [47.3504, -1.1864], // Liré / Loire south bank
  [47.3368, -1.2668], // Champtoceaux overlook
  [47.2912, -1.3442], // La Varenne vineyards
  [47.2564, -1.4125], // Divatte-sur-Loire
  [47.2248, -1.4712], // Saint-Julien-de-Concelles
  [47.2184, -1.5536], // Back to Nantes
];

export const DEMO_TOOL_ROUTES: DemoToolRoute[] = [
  {
    id: 'canal-gravel-loop',
    labelEn: 'Canal Gravel Loop',
    labelFr: 'Boucle Gravel du Canal',
    subtitleEn: '54 km · +340 m · Sucé ↔ Nort-sur-Erdre',
    subtitleFr: '54 km · +340 m · Sucé ↔ Nort-sur-Erdre',
    badgeEn: 'Gravel loop',
    badgeFr: 'Boucle gravel',
    isLoop: true,
    defaultSpeedKmH: 22,
    defaultSurface: 'gravel',
    parsed: makeDemoParsed({
      trackName: 'Canal de Nantes à Brest — Gravel Loop',
      originLabel: 'Sucé-sur-Erdre',
      destLabel: 'Sucé-sur-Erdre',
      distanceKm: 54.2,
      elevationGainM: 340,
      coordinates: CANAL_COORDS,
      anchors: [
        { km: 0, eleM: 12 },
        { km: 9, eleM: 46 },
        { km: 18, eleM: 22 },
        { km: 27, eleM: 18 },
        { km: 35, eleM: 64 },
        { km: 43, eleM: 38 },
        { km: 49, eleM: 58 },
        { km: 54.2, eleM: 12 },
      ],
    }),
  },
  {
    id: 'mont-ventoux-bedoin',
    labelEn: 'Mont Ventoux Classic',
    labelFr: 'Mont Ventoux (Bédoin)',
    subtitleEn: '58 km · +1,640 m · HC Climb Loop',
    subtitleFr: '58 km · +1 640 m · Boucle Col HC',
    badgeEn: 'HC climb',
    badgeFr: 'Col HC',
    isLoop: true,
    defaultSpeedKmH: 19,
    defaultSurface: 'paved',
    parsed: makeDemoParsed({
      trackName: 'Mont Ventoux Classic — Bédoin Loop',
      originLabel: 'Bédoin',
      destLabel: 'Bédoin',
      distanceKm: 57.8,
      elevationGainM: 1640,
      coordinates: VENTOUX_COORDS,
      anchors: [
        { km: 0, eleM: 305 },
        { km: 5.5, eleM: 540 },
        { km: 15.2, eleM: 1417 },
        { km: 21.4, eleM: 1909 },
        { km: 32, eleM: 1120 },
        { km: 42.5, eleM: 320 },
        { km: 50.2, eleM: 448 },
        { km: 57.8, eleM: 305 },
      ],
    }),
  },
  {
    id: 'loire-vineyards-loop',
    labelEn: 'Loire Bakery Loop',
    labelFr: 'Boucle Loire & Vignes',
    subtitleEn: '66 km · +480 m · Nantes ↔ Ancenis',
    subtitleFr: '66 km · +480 m · Nantes ↔ Ancenis',
    badgeEn: 'Sunday loop',
    badgeFr: 'Sortie dimanche',
    isLoop: true,
    defaultSpeedKmH: 25,
    defaultSurface: 'mixed',
    parsed: makeDemoParsed({
      trackName: 'Loire River & Vineyards Sunday Loop',
      originLabel: 'Nantes',
      destLabel: 'Nantes',
      distanceKm: 66.5,
      elevationGainM: 480,
      coordinates: LOIRE_COORDS,
      anchors: [
        { km: 0, eleM: 14 },
        { km: 14, eleM: 38 },
        { km: 24, eleM: 62 },
        { km: 34, eleM: 18 },
        { km: 43, eleM: 88 },
        { km: 53, eleM: 44 },
        { km: 66.5, eleM: 14 },
      ],
    }),
  },
];

export function reverseParsedRoute(parsed: GpxParseResult): GpxParseResult {
  const reversedCoords = [...parsed.coordinates].reverse();
  const totalKm = parsed.distanceKm;
  const reversedProfile: ElevationProfilePoint[] = [...(parsed.elevationProfile || [])]
    .reverse()
    .map((pt, idx, arr) => {
      const distKm = Number(Math.max(0, totalKm - pt.distKm).toFixed(2));
      const prev = idx > 0 ? arr[idx - 1] : null;
      const prevDist = prev ? Math.max(0, totalKm - prev.distKm) : distKm;
      const dKm = Math.max(0.01, distKm - prevDist);
      const gradePct = prev
        ? Number((((pt.eleM - prev.eleM) / (dKm * 1000)) * 100).toFixed(1))
        : 0;
      return {
        ...pt,
        distKm,
        gradePct,
      };
    });

  return {
    ...parsed,
    originLabel: parsed.destLabel,
    destLabel: parsed.originLabel,
    elevationGainM: parsed.elevationLossM ?? parsed.elevationGainM,
    elevationLossM: parsed.elevationGainM,
    coordinates: reversedCoords,
    elevationProfile: reversedProfile,
  };
}

export function buildTripFromToolRoute(params: {
  parsed?: GpxParseResult | null;
  name?: string;
  distanceKm?: number;
  elevationGainM?: number;
  speedKmH?: number;
  departureDate?: string;
  departureTime?: string;
  arriveAtMode?: boolean;
  targetArrivalTime?: string;
  temperatureC?: number;
  windSpeedKmH?: number;
  tag?: string;
  riderSpecs?: RiderBikeSpecs;
  lang: 'en' | 'fr';
  reverseDirection?: boolean;
}): TripProfile {
  const {
    parsed: rawParsed,
    name,
    distanceKm,
    elevationGainM,
    speedKmH = 24,
    departureDate,
    departureTime = '08:30',
    arriveAtMode = false,
    targetArrivalTime = '11:00',
    temperatureC,
    windSpeedKmH,
    tag,
    riderSpecs,
    lang,
    reverseDirection = false,
  } = params;

  const parsed = rawParsed && reverseDirection ? reverseParsedRoute(rawParsed) : rawParsed;
  const base = buildDefaultNewTripTemplate(lang);
  const activeBike = riderSpecs ? getActiveBike(riderSpecs) : null;
  const effectiveSpecs = riderSpecs ? getEffectiveRiderSpecs(riderSpecs) : null;

  const dist = Math.max(1, Number((parsed?.distanceKm ?? distanceKm ?? base.route.distanceKm).toFixed(1)));
  const gain = Math.max(0, Math.round(parsed?.elevationGainM ?? elevationGainM ?? Math.round(dist * 6)));
  const avgGradePct = dist > 0 ? Number(Math.min(8, Math.max(0, (gain / (dist * 1000)) * 100 * 0.4)).toFixed(2)) : 0;

  const tripName =
    name ||
    (parsed?.trackName
      ? reverseDirection
        ? `${parsed.trackName} (${lang === 'fr' ? 'inversé' : 'flipped'})`
        : parsed.trackName
      : lang === 'fr'
      ? `Sortie ${dist} km`
      : `${dist} km Ride`);

  const tripTag = tag || (arriveAtMode ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : 'Sport');

  return {
    ...base,
    id: `trip-tool-${Date.now()}`,
    name: tripName,
    tag: tripTag,
    departureDate: departureDate || getLocalTodayIso(),
    departureTime,
    arriveAtMode,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    office: {
      ...base.office,
      targetGateArrivalTime: arriveAtMode ? targetArrivalTime : base.office.targetGateArrivalTime,
    },
    physics: {
      ...base.physics,
      riderWeightKg: effectiveSpecs?.riderWeightKg ?? base.physics.riderWeightKg,
      bikeWeightKg: activeBike?.weightKg ?? base.physics.bikeWeightKg,
      cda: activeBike?.cda ?? base.physics.cda,
      crr: activeBike?.crr ?? base.physics.crr,
      gradientPercent: avgGradePct,
    },
    weather: {
      ...base.weather,
      temperatureC: temperatureC ?? base.weather.temperatureC,
      baseWindSpeedKmH: windSpeedKmH ?? base.weather.baseWindSpeedKmH,
    },
    route: {
      ...base.route,
      routeMode: parsed ? 'gpx' : 'corridor',
      origin: parsed?.originLabel || base.route.origin,
      destination: parsed?.destLabel || base.route.destination,
      distanceKm: dist,
      elevationGainM: gain,
      elevationLossM: parsed?.elevationLossM ?? gain,
      targetSpeedKmH: speedKmH,
      coordinates: parsed?.coordinates || base.route.coordinates,
      elevationProfile:
        parsed?.elevationProfile ||
        synthesizeRouteElevationProfile({
          ...base.route,
          distanceKm: dist,
          elevationGainM: gain,
          elevationProfile: undefined,
        }).elevationProfile,
    },
  };
}
