import fs from 'node:fs';
import path from 'node:path';

// ── 1. Node Runtime Bootstrap: In-memory localStorage polyfill ─────────────────
// Note: installed synchronously BEFORE any dynamic import('../src/...') in main()
// so module-level initializers (e.g. demoToolRoutes.ts) never hit ReferenceError.
const memStore: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => (key in memStore ? memStore[key] : null),
    setItem: (key: string, value: string) => {
      memStore[key] = String(value);
    },
    removeItem: (key: string) => {
      delete memStore[key];
    },
    clear: () => {
      for (const k of Object.keys(memStore)) {
        delete memStore[k];
      }
    },
    key: (index: number) => Object.keys(memStore)[index] ?? null,
    get length() {
      return Object.keys(memStore).length;
    },
  } as Storage;
}

import type { RiderBikeSpecs } from '../src/types/specs';
import type {
  ElevationProfilePoint,
  OfficeConstraints,
  PhysicsParams,
  RouteParams,
  TripProfile,
  WeatherCondition,
} from '../src/types/trip';
import type { StageAmenity } from '../src/types/amenities';
import type { RideReadinessInput } from '../src/utils/rideReadiness';
import type { SenderBaseline } from '../src/utils/planShare';
import type { DailyForecastDay, WeeklyForecast } from '../src/services/weatherService';

// Load runtime modules AFTER globalThis.localStorage polyfill is installed
const { DEFAULT_RIDER_BIKE_SPECS } =
  require('../src/types/specs') as typeof import('../src/types/specs');
const { saveRiderBikeSpecs } =
  require('../src/utils/specsStorage') as typeof import('../src/utils/specsStorage');
const { ensureLocaleLoaded, STORAGE_KEY_LANG } =
  require('../src/context/LanguageContext') as typeof import('../src/context/LanguageContext');

const {
  buildPhysicsEnvironmentContext,
  calculatePhysics,
  calculateSectionalEnergyBreakdown,
  classifyRoadSurfaceCondition,
  formatCautionPaceSummary,
  getPowerZone,
  getWattsDidacticExplanation,
} = require('../src/utils/physics') as typeof import('../src/utils/physics');
const {
  allocatePhase2OnBikeItems,
  calculateDynamicCarbTarget,
  calculateHydrationPlan,
  calculateIntensityModulatedCarbTarget,
  getBottomUpPortionCounts,
  getRealFoodNutritionPlan,
  resolveEffectiveFuelSplit,
} = require('../src/utils/nutrition') as typeof import('../src/utils/nutrition');
const { DEFAULT_PANTRY_CATALOG, resolveCompliantPantry } =
  require('../src/data/pantryCatalog') as typeof import('../src/data/pantryCatalog');
const {
  calculateDwellMinutes,
  calculateReverseTimeline,
  formatHHMM,
  isOffHoursCommercialWindow,
  parseHHMM,
  solveTripTimeline,
} = require('../src/utils/timeline') as typeof import('../src/utils/timeline');
const {
  BAR_TO_PSI,
  barToPsi,
  buildTyrePressureInputFromBike,
  calculateTyrePressure,
  formatTyrePressurePair,
  getWheelLoadSplit,
  inferBikeCategory,
} = require('../src/utils/tyrePressure') as typeof import('../src/utils/tyrePressure');
const {
  buildClimbAdjustedPacingCurve,
  computeClimbSplitsAndFueling,
  detectClimbs,
  formatClimbCategoryLabel,
  interpolateDistKmAtSeconds,
  interpolateElapsedSecondsAtKm,
} = require('../src/utils/climbSplits') as typeof import('../src/utils/climbSplits');
const {
  buildTerrainSummaryFromProfile,
  parseGpxFileContent,
  synthesizeRouteElevationProfile,
} = require('../src/utils/gpxParser') as typeof import('../src/utils/gpxParser');
const { parseFitFileBuffer } =
  require('../src/utils/routeFileParser') as typeof import('../src/utils/routeFileParser');
const {
  applyStageSlicesToTrip,
  clampAndSortCuts,
  computeDefaultCutDistances,
  extractFullTourSpine,
  findNearestDistanceOnSpine,
  getMinStageDistanceKm,
  getStageColor,
  interpolateCoordAtDistance,
  interpolateElevationAtDistance,
  mergeTourStagesToSingleDay,
  moveSingleCut,
  sliceRouteIntoStagePreviews,
  STAGE_COLORS,
  suggestDayCount,
} = require('../src/utils/gpxSlicer') as typeof import('../src/utils/gpxSlicer');
const { exportTripToFit } =
  require('../src/utils/fitExporter') as typeof import('../src/utils/fitExporter');
const { evaluateOpeningHoursAtArrival } =
  require('../src/utils/openingHours') as typeof import('../src/utils/openingHours');
const {
  autoMarkResupplyStops,
  calculateAmenityEta,
  calculateAmenityEtaDetails,
  calculateWaterGaps,
  computeCumulativeDistances,
  haversineDistanceMeters,
  resnapAmenitiesToRoute,
  snapToPolyline,
} = require('../src/services/overpassCorridor') as typeof import('../src/services/overpassCorridor');
const {
  applyPersonalLensToSharedTrip,
  buildPlanShareSummaryMeta,
  buildPlanShareUrl,
  buildShortPlanShareUrl,
  computeGroupSyncCheck,
  decodePlanShareToken,
  decodePolyline,
  downsampleCoordinates,
  encodePlanShareToken,
  encodePolyline,
  extractSharedPlanFromLocation,
} = require('../src/utils/planShare') as typeof import('../src/utils/planShare');
const {
  computeRideReadiness,
  getReadinessLevel,
  READINESS_BANDS,
} = require('../src/utils/rideReadiness') as typeof import('../src/utils/rideReadiness');
const {
  calculateRideVisibility,
  getAmbientLightPhase,
  getApproxTimezoneOffset,
  getSolarElevation,
  getSolarEphemeris,
  getVisibilityCategory,
  getWmoWeatherDescription,
  hhmmToMinutes,
  minutesToHHMM,
} = require('../src/utils/solarVisibility') as typeof import('../src/utils/solarVisibility');
const {
  calculateHumanWindImpact,
  calculateTripWindInsight,
  formatElevationRealWorldScale,
} = require('../src/utils/windInsights') as typeof import('../src/utils/windInsights');
const { buildStemStickerData, STEM_STICKER_PRESETS } =
  require('../src/utils/stemSticker') as typeof import('../src/utils/stemSticker');
const { DEMO_TOOL_ROUTES, buildTripFromToolRoute } =
  require('../src/data/demoToolRoutes') as typeof import('../src/data/demoToolRoutes');
const {
  estimateTripRolloutTimeHHMM,
  getStationaryRecoveryRule,
  getStationaryRecoveryRuleForTrip,
  LUNCH_BREAK_MIN_DURATION,
  PRE_DAWN_WINTER_MAX_REST_MIN,
  resolveEffectiveRestStopMinutes,
} = require('../src/utils/stationaryRecovery') as typeof import('../src/utils/stationaryRecovery');
const { summarizeWeeklyWeather } =
  require('../src/utils/weeklyWeatherSummary') as typeof import('../src/utils/weeklyWeatherSummary');

// ── 2. Determinism Utilities ───────────────────────────────────────────────────
export const FROZEN_UTC_ISO = '2026-11-26T12:00:00.000Z';
export const FROZEN_EPOCH_MS = 1_795_694_400_000; // Date.parse('2026-11-26T12:00:00.000Z')

function resetEnvironment(
  specsOverride?: Partial<RiderBikeSpecs>,
  lang: 'en' | 'fr' = 'en'
): void {
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem(STORAGE_KEY_LANG, lang);
  saveRiderBikeSpecs({
    ...DEFAULT_RIDER_BIKE_SPECS,
    ...specsOverride,
  });
}

function withFrozenTime<T>(isoUtc: string, fn: () => T): T {
  const RealDate = globalThis.Date;
  const fixedMs = RealDate.parse(isoUtc);
  class MockDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(fixedMs);
      } else {
        super(...(args as [any]));
      }
    }
    static now(): number {
      return fixedMs;
    }
  }
  Object.setPrototypeOf(MockDate, RealDate);
  globalThis.Date = MockDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

interface GoldenCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expected: unknown;
}

interface GoldenDocument {
  schemaVersion: 1;
  engine: string;
  sourceFiles: string[];
  determinism: {
    frozenUtc: string;
    timezone: string;
  };
  cases: GoldenCase[];
}

function writeGoldenFixture(
  outDir: string,
  fileName: string,
  engine: string,
  sourceFiles: string[],
  cases: GoldenCase[]
): void {
  const doc: GoldenDocument = {
    schemaVersion: 1,
    engine,
    sourceFiles,
    determinism: {
      frozenUtc: FROZEN_UTC_ISO,
      timezone: 'Europe/Paris',
    },
    cases,
  };
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

// ── 3. Shared Test Fixtures ────────────────────────────────────────────────────
const BASE_PHYSICS: PhysicsParams = {
  riderWeightKg: 70,
  bikeWeightKg: 9,
  gearWeightKg: 2,
  cda: 0.32,
  crr: 0.0045,
  rho: 1.225,
  drivetrainEfficiency: 0.97,
  grossMechanicalEfficiency: 0.22,
  gradientPercent: 0,
};

const BASE_ROUTE: RouteParams = {
  origin: 'Nantes',
  destination: 'Ancenis',
  distanceKm: 50,
  targetSpeedKmH: 28,
  pacingMode: 'speed',
  urbanTrafficDelayMinutes: 0,
  gateSecurityDelayMinutes: 0,
  coordinates: [
    [47.2184, -1.5536],
    [47.29, -1.35],
    [47.3667, -1.1833],
  ],
};

const CALM_WEATHER: WeatherCondition = {
  isHeadwindActive: false,
  baseWindSpeedKmH: 0,
  windDirection: 'calm',
  windDirectionDegrees: 0,
  temperatureC: 18,
  precipitationRiskPercent: 0,
  estuaryGustKmH: 0,
  visibilityKm: 20,
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

function makeBaseTrip(overrides: Partial<TripProfile> = {}): TripProfile {
  return {
    id: 'golden-base-trip',
    name: 'Loire Valley Reference',
    tag: 'SPORT',
    description: 'Deterministic reference trip',
    departureDate: '2026-11-26',
    departureTime: '08:00',
    createdAt: '2026-11-15T00:00:00Z',
    updatedAt: '2026-11-15T00:00:00Z',
    physics: { ...BASE_PHYSICS },
    route: { ...BASE_ROUTE },
    office: { ...BASE_OFFICE },
    weather: { ...CALM_WEATHER },
    checklist: [],
    ...overrides,
  };
}

function makeClimbingTrip(): TripProfile {
  const elevationProfile: ElevationProfilePoint[] = [
    { distKm: 0, eleM: 210, gradePct: 0 },
    { distKm: 10, eleM: 225, gradePct: 0.15 },
    { distKm: 12, eleM: 345, gradePct: 6.0 },
    { distKm: 15, eleM: 555, gradePct: 7.0 },
    { distKm: 18, eleM: 765, gradePct: 7.0 },
    { distKm: 28, eleM: 420, gradePct: -3.4 },
    { distKm: 35, eleM: 430, gradePct: 0.14 },
    { distKm: 39, eleM: 650, gradePct: 5.5 },
    { distKm: 55, eleM: 310, gradePct: -2.1 },
    { distKm: 62, eleM: 320, gradePct: 0.14 },
  ];

  return makeBaseTrip({
    id: 'alpine-loop',
    name: 'Col Loop',
    tag: 'SPORT',
    description: 'Mountain pacing reference',
    departureDate: '2026-07-15',
    departureTime: '08:00',
    physics: {
      ...BASE_PHYSICS,
      bikeWeightKg: 8.5,
      gearWeightKg: 2.5,
      cda: 0.34,
      gradientPercent: 1.8,
    },
    route: {
      origin: 'Bourg',
      destination: 'Col Loop',
      distanceKm: 62,
      elevationGainM: 820,
      targetSpeedKmH: 23,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      coordinates: [
        [45.05, 6.02],
        [45.09, 6.08],
        [45.14, 6.13],
      ],
      elevationProfile,
    },
    office: {
      ...BASE_OFFICE,
      shiftStartTime: '12:00',
      targetGateArrivalTime: '11:30',
      gateName: 'Col Summit Cafe',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
    },
    weather: {
      ...CALM_WEATHER,
      baseWindSpeedKmH: 8,
      windDirection: 'cross-headwind',
      windDirectionDegrees: 240,
      temperatureC: 24,
      estuaryGustKmH: 12,
    },
  });
}

function make400KmKomootTrip(options?: { hillyMiddle?: boolean }): TripProfile {
  const totalKm = 400;
  const count = 201;
  const coords: [number, number][] = [];
  const profile: ElevationProfilePoint[] = [];

  for (let i = 0; i < count; i++) {
    const distKm = (i / (count - 1)) * totalKm;
    const lat = 47.22 + (i / (count - 1)) * 1.15;
    const lng = -1.55 - (i / (count - 1)) * 2.85;
    coords.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);

    let eleM = 30;
    if (options?.hillyMiddle) {
      if (distKm >= 150 && distKm <= 260) {
        const phase = ((distKm - 150) / 110) * Math.PI * 4;
        eleM = 60 + Math.abs(Math.sin(phase)) * 620;
      } else {
        eleM = 35 + Math.sin(distKm * 0.08) * 12;
      }
    } else {
      eleM = 40 + Math.sin(distKm * 0.07) * 55 + Math.cos(distKm * 0.19) * 28;
    }

    let gradePct = 0;
    if (i > 0) {
      const prev = profile[i - 1];
      gradePct = Number((((eleM - prev.eleM) / ((distKm - prev.distKm) * 1000)) * 100).toFixed(1));
    }
    profile.push({
      distKm: Number(distKm.toFixed(2)),
      eleM: Number(eleM.toFixed(1)),
      gradePct,
    });
  }

  return makeBaseTrip({
    id: 'komoot-400-test',
    name: 'Nantes → Finistère Bikepacking',
    tag: 'BIKEPACKING',
    description: 'Single-day free-tier Komoot export',
    departureDate: '2026-07-10',
    departureTime: '08:30',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    physics: {
      riderWeightKg: 74,
      bikeWeightKg: 11,
      gearWeightKg: 8,
      luggageWeightKg: 8,
      cda: 0.38,
      crr: 0.0055,
      rho: 1.225,
      drivetrainEfficiency: 0.96,
      grossMechanicalEfficiency: 0.21,
      gradientPercent: 0.8,
    },
    route: {
      origin: 'Nantes',
      destination: 'Brest',
      originCoords: coords[0],
      destCoords: coords[coords.length - 1],
      distanceKm: totalKm,
      elevationGainM: options?.hillyMiddle ? 2800 : 1850,
      elevationLossM: options?.hillyMiddle ? 2750 : 1820,
      targetSpeedKmH: 20,
      urbanTrafficDelayMinutes: 0,
      gateSecurityDelayMinutes: 0,
      routeMode: 'gpx',
      gpxFileName: 'komoot-400km.gpx',
      coordinates: coords,
      elevationProfile: profile,
    },
    office: {
      ...BASE_OFFICE,
      shiftStartTime: '18:00',
      targetGateArrivalTime: '18:00',
      gateName: 'Brest',
      lockerRefuelMinutes: 0,
      showerChangeMinutes: 0,
      breakRoomBreakfastMinutes: 0,
    },
    weather: {
      source: 'live',
      effectiveHeadwindKmH: 14,
      isHeadwindActive: true,
      baseWindSpeedKmH: 20,
      windDirection: 'headwind',
      windDirectionDegrees: 280,
      temperatureC: 22,
      precipitationRiskPercent: 60,
      estuaryGustKmH: 32,
      visibilityKm: 12,
      weatherCode: 61,
      targetTimestampFormatted: '2026-07-10T09:00',
    },
  });
}

// ── 4. FIT Binary Inspector (Engine 8) ─────────────────────────────────────────
const FIT_CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

function computeFitCrc16(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0;
  for (let i = start; i < end; i++) {
    const byte = bytes[i];
    let tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[byte & 0xf];
    tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc & 0xffff;
}

function inspectFitBinary(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = bytes[0];
  const protocolVersion = bytes[1];
  const profileVersion = view.getUint16(2, true);
  const dataSize = view.getUint32(4, true);
  const magic = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  const headerCrc16 = view.getUint16(12, true);
  const fileCrc16 = view.getUint16(14 + dataSize, true);

  if (magic !== '.FIT') {
    throw new Error(`Invalid FIT magic: ${magic}`);
  }
  if (bytes.length !== 14 + dataSize + 2) {
    throw new Error(`FIT byteLength mismatch: ${bytes.length} vs ${14 + dataSize + 2}`);
  }
  if (computeFitCrc16(bytes, 0, 12) !== headerCrc16) {
    throw new Error('FIT header CRC16 mismatch');
  }
  if (computeFitCrc16(bytes, 0, 14 + dataSize) !== fileCrc16) {
    throw new Error('FIT file CRC16 mismatch');
  }

  const defs = new Map<number, { globalMsgNum: number; dataLen: number }>();
  const countsByGlobal: Record<number, number> = {};

  let pos = headerSize;
  const endOfRecords = headerSize + dataSize;
  while (pos < endOfRecords) {
    const hdr = bytes[pos++];
    if ((hdr & 0x80) !== 0) {
      // Compressed timestamp header (bits 5..6 = localMsgType)
      const localMsgType = (hdr >> 5) & 0x03;
      const def = defs.get(localMsgType);
      if (!def) throw new Error(`Missing FIT definition for compressed localMsgType ${localMsgType}`);
      countsByGlobal[def.globalMsgNum] = (countsByGlobal[def.globalMsgNum] ?? 0) + 1;
      pos += def.dataLen;
      continue;
    }

    const localMsgType = hdr & 0x0f;
    if ((hdr & 0x40) !== 0) {
      // Definition message
      pos += 1; // reserved
      const littleEndian = bytes[pos++] === 0;
      const globalMsgNum = view.getUint16(pos, littleEndian);
      pos += 2;
      const numFields = bytes[pos++];
      let dataLen = 0;
      for (let f = 0; f < numFields; f++) {
        dataLen += bytes[pos + f * 3 + 1];
      }
      pos += numFields * 3;
      if ((hdr & 0x20) !== 0) {
        const numDev = bytes[pos++];
        for (let d = 0; d < numDev; d++) {
          dataLen += bytes[pos + d * 3 + 1];
        }
        pos += numDev * 3;
      }
      defs.set(localMsgType, { globalMsgNum, dataLen });
    } else {
      // Data message
      const def = defs.get(localMsgType);
      if (!def) throw new Error(`Missing FIT definition for localMsgType ${localMsgType}`);
      countsByGlobal[def.globalMsgNum] = (countsByGlobal[def.globalMsgNum] ?? 0) + 1;
      pos += def.dataLen;
    }
  }

  if (pos !== endOfRecords) {
    throw new Error(`FIT record cursor ended at ${pos}, expected ${endOfRecords}`);
  }

  const fileId = countsByGlobal[0] ?? 0;
  const lap = countsByGlobal[19] ?? 0;
  const record = countsByGlobal[20] ?? 0;
  const event = countsByGlobal[21] ?? 0;
  const course = countsByGlobal[31] ?? 0;
  const coursePoint = countsByGlobal[32] ?? 0;
  const total = Object.values(countsByGlobal).reduce((acc, n) => acc + n, 0);

  return {
    byteLength: bytes.length,
    headerSize,
    protocolVersion,
    profileVersion,
    dataSize,
    headerCrc16,
    fileCrc16,
    messageCounts: {
      fileId,
      course,
      lap,
      event,
      record,
      coursePoint,
      total,
    },
    base64: Buffer.from(bytes).toString('base64'),
  };
}

// ── 5. Individual Engine Exporters (1–17) ──────────────────────────────────────

function exportPhysics(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  cases.push({
    id: 'power-zones',
    description: 'Coggan power zone mapping across Z1–Z5',
    input: { ftpPercents: [50, 68, 85, 100, 115] },
    expected: [50, 68, 85, 100, 115].map((pct) => ({ pct, zone: getPowerZone(pct) })),
  });

  resetEnvironment();
  const flatCalm = calculatePhysics(BASE_PHYSICS, BASE_ROUTE, CALM_WEATHER, 'en', 240, {
    isTubeless: true,
  });
  cases.push({
    id: 'flat-calm-speed',
    description: 'Flat 50 km calm speed pacing with tubeless baseline',
    input: {
      physics: BASE_PHYSICS,
      route: BASE_ROUTE,
      weather: CALM_WEATHER,
      lang: 'en',
      ftpOverride: 240,
      envContext: { isTubeless: true },
    },
    expected: {
      result: flatCalm,
      didactic: getWattsDidacticExplanation(flatCalm.legWatts, 240, BASE_PHYSICS.riderWeightKg, 'en'),
    },
  });

  resetEnvironment(undefined, 'fr');
  const headwindWeatherFr: WeatherCondition = {
    ...CALM_WEATHER,
    isHeadwindActive: true,
    baseWindSpeedKmH: 25,
    effectiveHeadwindKmH: 25,
    windDirection: 'headwind',
  };
  const headwindFr = calculatePhysics(BASE_PHYSICS, BASE_ROUTE, headwindWeatherFr, 'fr', 240, {
    isTubeless: true,
  });
  cases.push({
    id: 'headwind-speed-fr',
    description: 'Strong headwind in speed pacing mode with French locale dictionary',
    input: {
      physics: BASE_PHYSICS,
      route: BASE_ROUTE,
      weather: headwindWeatherFr,
      lang: 'fr',
      ftpOverride: 240,
      envContext: { isTubeless: true },
    },
    expected: {
      result: headwindFr,
      didactic: getWattsDidacticExplanation(headwindFr.legWatts, 240, BASE_PHYSICS.riderWeightKg, 'fr'),
    },
  });

  resetEnvironment();
  const effortRoute: RouteParams = {
    ...BASE_ROUTE,
    pacingMode: 'effort',
    targetEffortWatts: 180,
  };
  const headwindWeather20: WeatherCondition = {
    ...CALM_WEATHER,
    isHeadwindActive: true,
    baseWindSpeedKmH: 20,
    effectiveHeadwindKmH: 20,
    windDirection: 'headwind',
  };
  cases.push({
    id: 'headwind-effort',
    description: 'Effort pacing mode (180 W target) under 20 km/h headwind',
    input: {
      physics: BASE_PHYSICS,
      route: effortRoute,
      weather: headwindWeather20,
      lang: 'en',
      ftpOverride: 240,
    },
    expected: calculatePhysics(BASE_PHYSICS, effortRoute, headwindWeather20, 'en', 240),
  });

  resetEnvironment();
  const tailwindWeather: WeatherCondition = {
    ...CALM_WEATHER,
    baseWindSpeedKmH: 20,
    effectiveHeadwindKmH: -15,
    windDirection: 'tailwind',
  };
  cases.push({
    id: 'tailwind-speed',
    description: 'Tailwind speed pacing reduces power and aero drag',
    input: {
      physics: BASE_PHYSICS,
      route: BASE_ROUTE,
      weather: tailwindWeather,
      lang: 'en',
      ftpOverride: 240,
    },
    expected: calculatePhysics(BASE_PHYSICS, BASE_ROUTE, tailwindWeather, 'en', 240),
  });

  resetEnvironment();
  const climbPhysics = { ...BASE_PHYSICS, gradientPercent: 6.5 };
  const descentPhysics = { ...BASE_PHYSICS, gradientPercent: -3.0 };
  cases.push({
    id: 'climb-and-descent',
    description: 'Steep 6.5% climb vs -3.0% descent gradient scaling',
    input: { climbPhysics, descentPhysics, route: BASE_ROUTE, weather: CALM_WEATHER, ftpOverride: 240 },
    expected: {
      climb: calculatePhysics(climbPhysics, BASE_ROUTE, CALM_WEATHER, 'en', 240),
      descent: calculatePhysics(descentPhysics, BASE_ROUTE, CALM_WEATHER, 'en', 240),
    },
  });

  resetEnvironment();
  const coldWetWeather: WeatherCondition = {
    ...CALM_WEATHER,
    temperatureC: 6,
    relativeHumidity: 96,
    recentPrecipitationMm: 1.5,
    precipitationRiskPercent: 45,
  };
  const coldWetEnv = { isTubeless: false, nightPercent: 56, twilightPercent: 30 };
  const coldWetEn = calculatePhysics(BASE_PHYSICS, BASE_ROUTE, coldWetWeather, 'en', 240, coldWetEnv);
  resetEnvironment(undefined, 'fr');
  const coldWetFr = calculatePhysics(BASE_PHYSICS, BASE_ROUTE, coldWetWeather, 'fr', 240, coldWetEnv);
  cases.push({
    id: 'cold-wet-dark-caution',
    description: 'Cold wet dark caution pace factor, road surface classification, and EN/FR summaries',
    input: { physics: BASE_PHYSICS, route: BASE_ROUTE, weather: coldWetWeather, envContext: coldWetEnv },
    expected: {
      roadCondition: classifyRoadSurfaceCondition(coldWetWeather),
      en: coldWetEn,
      cautionSummaryEn: formatCautionPaceSummary(coldWetEn, 'en'),
      fr: coldWetFr,
      cautionSummaryFr: formatCautionPaceSummary(coldWetFr, 'fr'),
    },
  });

  resetEnvironment();
  const climbingTrip = makeClimbingTrip();
  const climbingEnv = buildPhysicsEnvironmentContext(climbingTrip, {
    departureDate: '2026-07-15',
    isTubeless: true,
  });
  const climbingPhys = calculatePhysics(
    climbingTrip.physics,
    climbingTrip.route,
    climbingTrip.weather,
    'en',
    260,
    climbingEnv
  );
  cases.push({
    id: 'sectional-energy-breakdown',
    description: 'Sectional energy breakdown across flat, rolling, climbing, and descent bands',
    input: {
      tripId: climbingTrip.id,
      departureDate: '2026-07-15',
      isTubeless: true,
      ftpOverride: 260,
    },
    expected: {
      envContext: climbingEnv,
      physics: climbingPhys,
      sectional: calculateSectionalEnergyBreakdown(
        climbingTrip.physics,
        climbingTrip.route,
        climbingTrip.weather,
        climbingPhys,
        'en',
        climbingEnv
      ),
    },
  });

  resetEnvironment();
  const zeroRoute = { ...BASE_ROUTE, distanceKm: 0 };
  const zeroPhys = calculatePhysics(BASE_PHYSICS, zeroRoute, CALM_WEATHER, 'en', 240);
  cases.push({
    id: 'zero-distance-guard',
    description: 'Zero-distance division guard on physics and sectional breakdown',
    input: { physics: BASE_PHYSICS, route: zeroRoute, weather: CALM_WEATHER },
    expected: {
      physics: zeroPhys,
      sectional: calculateSectionalEnergyBreakdown(BASE_PHYSICS, zeroRoute, CALM_WEATHER, zeroPhys, 'en'),
    },
  });

  return cases;
}

function exportNutrition(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  const shortAuto = {
    rideHours: 0.5,
    pctFtp: 75,
    carbOxidationGramPerHour: 120,
    gutCeilingGPerHr: 90,
    totalDays: 1,
  };
  cases.push({
    id: 'short-hydration-only',
    description: 'Single-day ride <45 min defaults to short-hydration-only with 0g carbs',
    input: shortAuto,
    expected: calculateIntensityModulatedCarbTarget(shortAuto),
  });

  resetEnvironment();
  const multidayShort = { ...shortAuto, totalDays: 2 };
  cases.push({
    id: 'multiday-short-segment',
    description: 'Multi-day tour keeps carbs active even on <45 min stage',
    input: multidayShort,
    expected: calculateIntensityModulatedCarbTarget(multidayShort),
  });

  resetEnvironment();
  const enduranceAuto = {
    rideHours: 3.0,
    pctFtp: 62,
    carbOxidationGramPerHour: 110,
    gutCeilingGPerHr: 80,
    totalDays: 1,
  };
  const dynamicLegacy = calculateDynamicCarbTarget(3.0, 62, 110, 80, 1);
  cases.push({
    id: 'endurance-auto-modulated',
    description: '3h Z2 endurance ride modulated by intensity + dynamic helper + portion counts',
    input: enduranceAuto,
    expected: {
      modulated: calculateIntensityModulatedCarbTarget(enduranceAuto),
      dynamicCarbTarget: dynamicLegacy,
      portionsRealFood: getBottomUpPortionCounts(dynamicLegacy.targetOnBikeCarbsG, 'real-food', 3.0),
      portionsSportsFuel: getBottomUpPortionCounts(dynamicLegacy.targetOnBikeCarbsG, 'sports-fuel', 3.0),
    },
  });

  resetEnvironment();
  const surge = {
    rideHours: 2.0,
    pctFtp: 110,
    carbOxidationGramPerHour: 220,
    gutCeilingGPerHr: 80,
  };
  cases.push({
    id: 'emergency-surge',
    description: 'Over-threshold (>105% FTP) expands effective ceiling by +20 g/h',
    input: surge,
    expected: calculateIntensityModulatedCarbTarget(surge),
  });

  resetEnvironment();
  const lockedLow = {
    rideHours: 2.0,
    pctFtp: 58,
    carbOxidationGramPerHour: 110,
    gutCeilingGPerHr: 80,
    totalDays: 1,
    isLockedCarbTarget: true,
  };
  const lockedShort = {
    rideHours: 0.5,
    pctFtp: 65,
    carbOxidationGramPerHour: 110,
    gutCeilingGPerHr: 70,
    totalDays: 1,
    isLockedCarbTarget: true,
  };
  cases.push({
    id: 'locked-low-intensity',
    description: 'carbPacingMode locked holds exact gutCeilingGPerHr on low-intensity and <45m rides',
    input: { lockedLow, lockedShort },
    expected: {
      lockedLow: calculateIntensityModulatedCarbTarget(lockedLow),
      lockedShort: calculateIntensityModulatedCarbTarget(lockedShort),
    },
  });

  resetEnvironment();
  const hotParams = { rideHours: 4, tempC: 28, legWatts: 200, bidonSizeMl: 650, frameBottleSlots: 2 };
  const coolParams = { rideHours: 1.5, tempC: 12, legWatts: 120, bidonSizeMl: 650, frameBottleSlots: 2 };
  const shortHydrationParams = { rideHours: 0.5, tempC: 20, legWatts: 180, bidonSizeMl: 650, frameBottleSlots: 2 };
  cases.push({
    id: 'hydration-hot-vs-cool',
    description: 'Hydration plan across hot 4h, cool 1.5h, and <45m baseline rides',
    input: { hotParams, coolParams, shortHydrationParams },
    expected: {
      hot: calculateHydrationPlan(hotParams),
      cool: calculateHydrationPlan(coolParams),
      short: calculateHydrationPlan(shortHydrationParams),
    },
  });

  resetEnvironment();
  const splitSingle = {
    rideHours: 4,
    pctFtp: 88,
    tempC: 28,
    liquidCarbRatio: 0.35,
    autoModulateLiquidInHeatOrEffort: true,
    enableSavoryPalateResets: true,
    isMultiDayTour: false,
  };
  const splitMulti = { ...splitSingle, isMultiDayTour: true };
  cases.push({
    id: 'fuel-split-single-vs-multiday',
    description: 'Liquid/solid split heat modulation and single-day vs multi-day savory palate resets',
    input: { splitSingle, splitMulti },
    expected: {
      singleDay: resolveEffectiveFuelSplit(splitSingle),
      multiDay: resolveEffectiveFuelSplit(splitMulti),
      phase2Items: allocatePhase2OnBikeItems(
        240,
        'mixed',
        4,
        'en',
        undefined,
        calculateHydrationPlan({ rideHours: 4, tempC: 28, legWatts: 210, bidonSizeMl: 650, frameBottleSlots: 2 }),
        resolveEffectiveFuelSplit(splitMulti)
      ),
    },
  });

  resetEnvironment();
  const locked80Plan = getRealFoodNutritionPlan('09:30', '09:50', '07:30', 'en', {
    carbTargetGPerHr: 80,
    carbPacingMode: 'locked',
    riderLevel: 'regular',
    rideHours: 2,
    pctFtp: 55,
    carbOxidationGramPerHour: 95,
    nutritionPreference: 'sports-fuel',
    logistics: { preRideStyle: 'light-liquid' },
  });
  resetEnvironment();
  const autoProPlan = getRealFoodNutritionPlan('09:30', '09:50', '07:30', 'en', {
    carbTargetGPerHr: 90,
    carbPacingMode: 'auto',
    riderLevel: 'pro',
    rideHours: 2,
    pctFtp: 55,
    carbOxidationGramPerHour: 95,
    nutritionPreference: 'sports-fuel',
  });
  resetEnvironment();
  const lockedFloor25Plan = getRealFoodNutritionPlan('09:30', '09:50', '07:30', 'en', {
    carbTargetGPerHr: 25,
    carbPacingMode: 'locked',
    riderLevel: 'regular',
    rideHours: 2,
    pctFtp: 55,
    carbOxidationGramPerHour: 95,
    nutritionPreference: 'sports-fuel',
  });
  cases.push({
    id: 'plan-locked-vs-auto-pro',
    description: 'getRealFoodNutritionPlan honors carbPacingMode locked (80g/h & 25g/h floor) and auto over riderLevel pro',
    input: {
      arrival: '09:30',
      breakRoom: '09:50',
      departure: '07:30',
      locked80: { carbTargetGPerHr: 80, carbPacingMode: 'locked', riderLevel: 'regular', preRideStyle: 'light-liquid' },
      autoPro90: { carbTargetGPerHr: 90, carbPacingMode: 'auto', riderLevel: 'pro' },
      lockedFloor25: { carbTargetGPerHr: 25, carbPacingMode: 'locked', riderLevel: 'regular' },
    },
    expected: {
      locked80Plan,
      autoProPlan,
      lockedFloor25Plan,
    },
  });

  const veganSpecs: Partial<RiderBikeSpecs> = {
    dietaryFilters: ['vegan', 'gluten-free', 'nut-free'],
    telemetryMode: 'quantitative',
  };
  resetEnvironment(veganSpecs, 'fr');
  const resolvedPantry = resolveCompliantPantry(
    { ...DEFAULT_RIDER_BIKE_SPECS, ...veganSpecs },
    { hasDestinationFridge: false }
  );
  const veganPlanFr = getRealFoodNutritionPlan('08:30', '08:50', '07:35', 'fr', {
    rideHours: 2.5,
    pctFtp: 74,
    totalDays: 1,
    compliantPantry: resolvedPantry,
    logistics: {
      preRideStyle: 'fasted-rollout',
      hasDestinationFridge: false,
      splitPostRideRecovery: true,
    },
  });
  cases.push({
    id: 'plan-dietary-vegan-gf-nofridge-fr',
    description: 'French dietary-filtered plan (vegan, gluten-free, nut-free, no fridge, split recovery)',
    input: {
      dietaryFilters: veganSpecs.dietaryFilters,
      lang: 'fr',
      catalogCount: DEFAULT_PANTRY_CATALOG.length,
      logistics: { preRideStyle: 'fasted-rollout', hasDestinationFridge: false, splitPostRideRecovery: true },
    },
    expected: {
      compliantLiquidId: resolvedPantry.onBikeLiquid.id,
      compliantSolidIds: resolvedPantry.onBikeSolids.map((s) => s.id),
      compliantPostRideId: resolvedPantry.postRide.id,
      phases: veganPlanFr,
    },
  });

  return cases;
}

function exportTimeline(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  cases.push({
    id: 'parse-and-format-hhmm',
    description: 'HH:MM parser, formatter, off-hours commercial check, and dwell minutes',
    input: {
      times: ['00:00', '06:59', '07:00', '18:59', '19:00', '23:45'],
      minutes: [0, 450, 1439, 1500, -15],
      dwellChips: ['coffee-stop', 'picnic-outing'],
    },
    expected: {
      parsed: ['00:00', '06:59', '07:00', '18:59', '19:00', '23:45'].map((t) => ({
        time: t,
        minutes: parseHHMM(t),
        isOffHours: isOffHoursCommercialWindow(t),
      })),
      formatted: [0, 450, 1439, 1500, -15].map((m) => ({ min: m, hhmm: formatHHMM(m) })),
      dwellMinutes: calculateDwellMinutes(['coffee-stop', 'picnic-outing'], { coffeeDurationMin: 15 }),
    },
  });

  resetEnvironment();
  cases.push({
    id: 'solve-arrive-by-coffee',
    description: 'solveTripTimeline arrive-by mode with coffee stop in summer',
    input: {
      movingSeconds: 3600,
      chips: ['coffee-stop'],
      logistics: { timelineAnchorMode: 'arrive-by', anchorTimeHHMM: '08:30', preRideStyle: 'full-breakfast', coffeeDurationMin: 15 },
      context: { departureDate: '2026-07-10', coordinates: [47.2184, -1.5536] },
    },
    expected: solveTripTimeline(
      3600,
      ['coffee-stop'],
      {
        timelineAnchorMode: 'arrive-by',
        anchorTimeHHMM: '08:30',
        preRideStyle: 'full-breakfast',
        coffeeDurationMin: 15,
      },
      undefined,
      { departureDate: '2026-07-10', coordinates: [47.2184, -1.5536] }
    ),
  });

  resetEnvironment();
  cases.push({
    id: 'solve-predawn-winter-cap',
    description: 'solveTripTimeline pre-dawn winter stationary recovery 5-min cap',
    input: {
      movingSeconds: 3600,
      chips: ['coffee-stop', 'picnic-outing'],
      logistics: {
        timelineAnchorMode: 'depart-at',
        anchorTimeHHMM: '06:30',
        preRideStyle: 'fasted-rollout',
        splitPostRideRecovery: true,
        plannedLongStopMin: 30,
      },
      context: { departureDate: '2026-12-15', coordinates: [47.2184, -1.5536] },
    },
    expected: solveTripTimeline(
      3600,
      ['coffee-stop', 'picnic-outing'],
      {
        timelineAnchorMode: 'depart-at',
        anchorTimeHHMM: '06:30',
        preRideStyle: 'fasted-rollout',
        splitPostRideRecovery: true,
        plannedLongStopMin: 30,
      },
      undefined,
      { departureDate: '2026-12-15', coordinates: [47.2184, -1.5536] }
    ),
  });

  resetEnvironment();
  const commuteRoute: RouteParams = {
    origin: 'Start',
    destination: 'Finish',
    distanceKm: 30,
    targetSpeedKmH: 30,
    elevationGainM: 100,
    urbanTrafficDelayMinutes: 5,
    gateSecurityDelayMinutes: 5,
  };
  cases.push({
    id: 'reverse-commute-offhours-coffee',
    description: 'Commute reverse timeline off-hours (19:15) vs daytime (08:00) coffee stop',
    input: {
      route: commuteRoute,
      departureDate: '2026-07-10',
      eveningDeparture: '19:15',
      morningDeparture: '08:00',
    },
    expected: {
      evening: calculateReverseTimeline(
        commuteRoute,
        BASE_OFFICE,
        CALM_WEATHER,
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
          departureDate: '2026-07-10',
        }
      ),
      daytime: calculateReverseTimeline(
        commuteRoute,
        BASE_OFFICE,
        CALM_WEATHER,
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
          departureDate: '2026-07-10',
        }
      ),
    },
  });

  resetEnvironment(undefined, 'fr');
  const headwindRoute80 = { ...commuteRoute, distanceKm: 80, targetSpeedKmH: 25 };
  const severeWindWeather: WeatherCondition = {
    ...CALM_WEATHER,
    isHeadwindActive: true,
    baseWindSpeedKmH: 45,
    windDirection: 'headwind',
  };
  cases.push({
    id: 'reverse-commute-severe-headwind-fr',
    description: 'French commute reverse timeline triggering severeHeadwindWarning (>45 min penalty on <100 km)',
    input: {
      route: headwindRoute80,
      weather: severeWindWeather,
      lang: 'fr',
      calmSpeedKmH: 25,
      effectiveSpeedKmH: 18,
      departureDate: '2026-07-10',
    },
    expected: calculateReverseTimeline(
      headwindRoute80,
      BASE_OFFICE,
      severeWindWeather,
      'VÉLOTAF',
      'Bureau',
      'fr',
      0,
      [],
      {
        calmSpeedKmH: 25,
        effectiveSpeedKmH: 18,
        departureDate: '2026-07-10',
      }
    ),
  });

  resetEnvironment();
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
      openingHours: 'Apr-Oct Mo-Su 08:00-19:00',
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
  const waypointRoute: RouteParams = {
    ...commuteRoute,
    waypoints: [{ id: 'wp-roastery', name: 'Blue Bottle Roastery', distanceFromStartKm: 10 }],
  };
  cases.push({
    id: 'reverse-escapade-waypoints-and-opening-hours',
    description: 'Escapade reverse timeline with waypoints and pinned amenities evaluated at arrival ETA',
    input: {
      route: waypointRoute,
      pinnedAmenities,
      departureTime: '10:00',
      departureDate: '2026-07-15',
    },
    expected: calculateReverseTimeline(
      waypointRoute,
      BASE_OFFICE,
      CALM_WEATHER,
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
        departureDate: '2026-07-15',
        pinnedAmenities,
      }
    ),
  });

  resetEnvironment();
  const enduranceRoute90: RouteParams = {
    ...commuteRoute,
    distanceKm: 90,
    targetSpeedKmH: 30,
    urbanTrafficDelayMinutes: 0,
    gateSecurityDelayMinutes: 0,
  };
  cases.push({
    id: 'reverse-sport-singleday-vs-bikepacking-multiday',
    description: 'Single-day carb-intake-45/90/135 reminders vs multi-day savory-palate-reset-90 alert',
    input: { route: enduranceRoute90, departureDate: '2026-07-15', departureTime: '08:00' },
    expected: {
      singleDay: calculateReverseTimeline(
        enduranceRoute90,
        BASE_OFFICE,
        CALM_WEATHER,
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
          departureDate: '2026-07-15',
          movingTimeSeconds: 180 * 60,
          isMultiDayTour: false,
        }
      ),
      multiDay: calculateReverseTimeline(
        enduranceRoute90,
        BASE_OFFICE,
        CALM_WEATHER,
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
          departureDate: '2026-07-15',
          movingTimeSeconds: 180 * 60,
          isMultiDayTour: true,
        }
      ),
    },
  });

  return cases;
}

function exportTyrePressure(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  const roadHookless = {
    systemMassKg: 95,
    tireWidthMm: 28,
    isTubeless: true,
    pavedPct: 100,
    gravelPct: 0,
    singletrackPct: 0,
    bikeCategory: 'road' as const,
    isHookless: true,
  };
  cases.push({
    id: 'road-28mm-hookless-capped',
    description: '28 mm road hookless rim pressure capped at 5.0 bar ETRTO limit',
    input: roadHookless,
    expected: calculateTyrePressure(roadHookless),
  });

  const gravelMixed = {
    systemMassKg: 82,
    tireWidthMm: 38,
    isTubeless: true,
    pavedPct: 40,
    gravelPct: 50,
    singletrackPct: 10,
    bikeCategory: 'gravel' as const,
    casingType: 'standard' as const,
  };
  cases.push({
    id: 'gravel-38mm-mixed',
    description: '38 mm tubeless gravel bike on 40/50/10 paved/gravel/singletrack mix',
    input: gravelMixed,
    expected: calculateTyrePressure(gravelMixed),
  });

  const touringLoaded = {
    systemMassKg: 105,
    tireWidthMm: 42,
    isTubeless: false,
    pavedPct: 70,
    gravelPct: 30,
    singletrackPct: 0,
    gearWeightKg: 14,
    bikeCategory: 'touring' as const,
    casingType: 'reinforced' as const,
  };
  cases.push({
    id: 'touring-42mm-loaded-tubes',
    description: 'Loaded 42 mm inner-tube reinforced touring setup with 14 kg cargo',
    input: touringLoaded,
    expected: calculateTyrePressure(touringLoaded),
  });

  const mtbSingletrack = {
    systemMassKg: 85,
    tireWidthMm: 54,
    isTubeless: true,
    pavedPct: 10,
    gravelPct: 30,
    singletrackPct: 60,
    bikeCategory: 'mtb' as const,
  };
  cases.push({
    id: 'mtb-54mm-singletrack',
    description: '54 mm MTB tubeless setup on 60% singletrack',
    input: mtbSingletrack,
    expected: calculateTyrePressure(mtbSingletrack),
  });

  const builtFromBike = buildTyrePressureInputFromBike(
    DEFAULT_RIDER_BIKE_SPECS.bikes[0],
    80,
    2,
    60,
    35,
    5
  );
  cases.push({
    id: 'build-from-bike-and-infer',
    description: 'buildTyrePressureInputFromBike, inferBikeCategory, and getWheelLoadSplit helpers',
    input: {
      bike: DEFAULT_RIDER_BIKE_SPECS.bikes[0],
      systemMassKg: 80,
      gearWeightKg: 2,
    },
    expected: {
      BAR_TO_PSI,
      builtInput: builtFromBike,
      pressure: calculateTyrePressure(builtFromBike),
      inferredCategory: inferBikeCategory(38, 'Van Rysel GRVL AF SWORD', undefined, 2),
      wheelLoadSplitRoad: getWheelLoadSplit('road', 0),
      wheelLoadSplitGravelLoaded: getWheelLoadSplit('gravel', 6),
    },
  });

  cases.push({
    id: 'formatting-en-fr-psi',
    description: 'barToPsi and EN/FR bar/PSI pressure pair formatting',
    input: { frontBar: 3.2, rearBar: 3.8, sampleBars: [2.4, 3.2, 5.0] },
    expected: {
      psiValues: [2.4, 3.2, 5.0].map((b) => ({ bar: b, psi: barToPsi(b) })),
      barEn: formatTyrePressurePair(3.2, 3.8, 'bar', 'en'),
      barFr: formatTyrePressurePair(3.2, 3.8, 'bar', 'fr'),
      psiEn: formatTyrePressurePair(3.2, 3.8, 'psi', 'en'),
    },
  });

  return cases;
}

function exportClimbSplits(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  const alpineTrip = makeClimbingTrip();
  const alpinePhysics260 = calculatePhysics(
    alpineTrip.physics,
    alpineTrip.route,
    alpineTrip.weather,
    'en',
    260
  );
  cases.push({
    id: 'alpine-loop-auto-en',
    description: 'Climb detection and climb splits/checkpoints on 62 km alpine loop (auto EN)',
    input: {
      tripId: alpineTrip.id,
      ftpWatts: 260,
      carbTargetGPerHr: 60,
      carbPacingMode: 'auto',
      nutritionPreference: 'sports-fuel',
      departureTimeHHMM: '08:00',
      checkpointIntervalMinutes: 35,
    },
    expected: {
      detectedClimbs: detectClimbs(alpineTrip.route.elevationProfile),
      categoryLabels: {
        hcEn: formatClimbCategoryLabel('HC', 'en'),
        hcFr: formatClimbCategoryLabel('HC', 'fr'),
        cat1En: formatClimbCategoryLabel('1', 'en'),
        cat2Fr: formatClimbCategoryLabel('2', 'fr'),
      },
      summary: computeClimbSplitsAndFueling(alpineTrip, alpinePhysics260, 'en', {
        ftpWatts: 260,
        carbTargetGPerHr: 60,
        carbPacingMode: 'auto',
        nutritionPreference: 'sports-fuel',
        departureTimeHHMM: '08:00',
        checkpointIntervalMinutes: 35,
      }),
    },
  });

  resetEnvironment();
  const slowAlpineTrip = makeClimbingTrip();
  slowAlpineTrip.route.targetSpeedKmH = 18;
  const slowAlpinePhys300 = calculatePhysics(
    slowAlpineTrip.physics,
    slowAlpineTrip.route,
    slowAlpineTrip.weather,
    'en',
    300
  );
  const locked80Summary = computeClimbSplitsAndFueling(slowAlpineTrip, slowAlpinePhys300, 'en', {
    ftpWatts: 300,
    carbTargetGPerHr: 80,
    carbPacingMode: 'locked',
    riderLevel: 'regular',
    nutritionPreference: 'sports-fuel',
    checkpointIntervalMinutes: 35,
  });
  const locked25FloorSummary = computeClimbSplitsAndFueling(slowAlpineTrip, slowAlpinePhys300, 'en', {
    ftpWatts: 300,
    carbTargetGPerHr: 25,
    carbPacingMode: 'locked',
    riderLevel: 'regular',
    nutritionPreference: 'sports-fuel',
    checkpointIntervalMinutes: 35,
  });
  cases.push({
    id: 'alpine-loop-locked-80-en',
    description: 'carbPacingMode locked preserves exact 80 g/h and 25 g/h floor at low intensity',
    input: {
      targetSpeedKmH: 18,
      ftpWatts: 300,
      locked80: { carbTargetGPerHr: 80, carbPacingMode: 'locked', riderLevel: 'regular' },
      lockedFloor25: { carbTargetGPerHr: 25, carbPacingMode: 'locked', riderLevel: 'regular' },
    },
    expected: {
      locked80Summary,
      locked25FloorSummary,
    },
  });

  resetEnvironment();
  const proAutoSummary = computeClimbSplitsAndFueling(slowAlpineTrip, slowAlpinePhys300, 'en', {
    ftpWatts: 300,
    carbTargetGPerHr: 90,
    carbPacingMode: 'auto',
    riderLevel: 'pro',
    nutritionPreference: 'sports-fuel',
  });
  cases.push({
    id: 'pro-auto-override-check',
    description: 'carbPacingMode auto prevents riderLevel pro from auto-locking at 90 g/h',
    input: {
      targetSpeedKmH: 18,
      ftpWatts: 300,
      carbTargetGPerHr: 90,
      carbPacingMode: 'auto',
      riderLevel: 'pro',
    },
    expected: proAutoSummary,
  });

  resetEnvironment(undefined, 'fr');
  const flatTrip = makeClimbingTrip();
  flatTrip.route.elevationProfile = [
    { distKm: 0, eleM: 25, gradePct: 0 },
    { distKm: 25, eleM: 28, gradePct: 0.01 },
    { distKm: 50, eleM: 26, gradePct: 0 },
  ];
  flatTrip.route.elevationGainM = 20;
  flatTrip.route.distanceKm = 50;
  const flatPhysFr = calculatePhysics(flatTrip.physics, flatTrip.route, flatTrip.weather, 'fr', 230);
  cases.push({
    id: 'flat-ride-fr',
    description: 'Flat 50 km ride in French emits 0 climbs while keeping periodic fueling checkpoints',
    input: { distanceKm: 50, lang: 'fr', ftpWatts: 230, checkpointIntervalMinutes: 35 },
    expected: computeClimbSplitsAndFueling(flatTrip, flatPhysFr, 'fr', {
      ftpWatts: 230,
      checkpointIntervalMinutes: 35,
    }),
  });

  resetEnvironment();
  const curveProfile: ElevationProfilePoint[] = [
    { distKm: 0, eleM: 100, gradePct: 0 },
    { distKm: 10, eleM: 100, gradePct: 0 },
    { distKm: 20, eleM: 1000, gradePct: 9.0 },
  ];
  const curve = buildClimbAdjustedPacingCurve(curveProfile, 20, 28, 78);
  cases.push({
    id: 'climb-pacing-curve-and-interpolation',
    description: 'Climb-adjusted pacing curve and forward/inverse distance-time interpolation',
    input: { profile: curveProfile, totalDistanceKm: 20, avgFlatSpeedKmH: 28, totalMassKg: 78 },
    expected: {
      curve,
      elapsedAt10KmSec: interpolateElapsedSecondsAtKm(curve, 10),
      elapsedAt20KmSec: interpolateElapsedSecondsAtKm(curve, 20),
      distAt1500SecKm: interpolateDistKmAtSeconds(curve, 1500),
    },
  });

  return cases;
}

function exportGpxParser(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  // Note: <name> inside <trk> only (no <metadata><name>) so Node regex fallback matches browser DOMParser
  resetEnvironment();
  const pointToPointGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CadenceTest">
  <trk>
    <name>Nantes -&gt; Ancenis</name>
    <trkseg>
      <trkpt lat="47.2184" lon="-1.5536"><ele>10</ele></trkpt>
      <trkpt lat="47.2400" lon="-1.4500"><ele>120</ele></trkpt>
      <trkpt lat="47.2600" lon="-1.3500"><ele>150</ele></trkpt>
      <trkpt lat="47.2900" lon="-1.2800"><ele>40</ele></trkpt>
      <trkpt lat="47.3200" lon="-1.2200"><ele>20</ele></trkpt>
      <trkpt lat="47.3667" lon="-1.1833"><ele>90</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
  cases.push({
    id: 'gpx-point-to-point-arrow',
    description: 'GPX point-to-point track with arrow-delimited name and elevation points',
    input: { fileNameHint: 'nantes_ancenis.gpx', gpxText: pointToPointGpx },
    expected: parseGpxFileContent(pointToPointGpx, 'nantes_ancenis.gpx'),
  });

  resetEnvironment();
  const loopNoEleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Sunday Loop</name>
    <trkseg>
      <trkpt lat="47.2184" lon="-1.5536"></trkpt>
      <trkpt lat="47.2550" lon="-1.4950"></trkpt>
      <trkpt lat="47.2350" lon="-1.4600"></trkpt>
      <trkpt lat="47.2190" lon="-1.5530"></trkpt>
    </trkseg>
  </trk>
</gpx>`;
  cases.push({
    id: 'gpx-loop-no-ele',
    description: 'Closed loop GPX (>4 km) without <ele> tags triggering synthetic profile fallback',
    input: { gpxText: loopNoEleGpx },
    expected: parseGpxFileContent(loopNoEleGpx),
  });

  resetEnvironment();
  const synthRoute: RouteParams = {
    origin: 'Nantes',
    destination: 'Clisson',
    distanceKm: 42,
    elevationGainM: 380,
    targetSpeedKmH: 24,
    urbanTrafficDelayMinutes: 5,
    gateSecurityDelayMinutes: 0,
  };
  const synthResult = synthesizeRouteElevationProfile(synthRoute);
  cases.push({
    id: 'synthesize-route-profile',
    description: 'Synthetic elevation profile and terrain summary generation from RouteParams',
    input: { route: synthRoute },
    expected: {
      synthesized: synthResult,
      terrainSummary: buildTerrainSummaryFromProfile(
        synthResult.elevationProfile,
        synthRoute.distanceKm,
        synthRoute.elevationGainM ?? 0,
        `${synthRoute.origin} -> ${synthRoute.destination}`
      ),
    },
  });

  resetEnvironment();
  const sampleTrip = makeClimbingTrip();
  const fitBytes = exportTripToFit(sampleTrip, {
    exportTimestampMs: FROZEN_EPOCH_MS,
    includeFuelingCues: false,
    includeClimbCues: false,
  });
  const fitArrayBuffer = fitBytes.buffer.slice(
    fitBytes.byteOffset,
    fitBytes.byteOffset + fitBytes.byteLength
  );
  cases.push({
    id: 'fit-roundtrip-decode',
    description: 'Binary .FIT export round-trip decoded via parseFitFileBuffer',
    input: {
      sourceTripId: sampleTrip.id,
      exportTimestampMs: FROZEN_EPOCH_MS,
      fileName: 'alpine-loop.fit',
    },
    expected: parseFitFileBuffer(fitArrayBuffer, 'alpine-loop.fit'),
  });

  return cases;
}

function exportGpxSlicer(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  cases.push({
    id: 'suggest-day-counts',
    description: 'Recommended stage counts and min-stage distance across tour lengths/gains',
    input: {
      pairs: [
        { totalDistanceKm: 130, totalElevationGainM: 600 },
        { totalDistanceKm: 400, totalElevationGainM: 1800 },
        { totalDistanceKm: 410, totalElevationGainM: 5200 },
        { totalDistanceKm: 950, totalElevationGainM: 8000 },
      ],
    },
    expected: {
      stageColors: STAGE_COLORS,
      day2Color: getStageColor(1),
      suggestions: [
        { km: 130, gain: 600, days: suggestDayCount(130, 600), minStageKm: getMinStageDistanceKm(130, 2) },
        { km: 400, gain: 1800, days: suggestDayCount(400, 1800), minStageKm: getMinStageDistanceKm(400, 3) },
        { km: 410, gain: 5200, days: suggestDayCount(410, 5200), minStageKm: getMinStageDistanceKm(410, 4) },
        { km: 950, gain: 8000, days: suggestDayCount(950, 8000), minStageKm: getMinStageDistanceKm(950, 9) },
      ],
    },
  });

  resetEnvironment();
  const hillyTrip = make400KmKomootTrip({ hillyMiddle: true });
  const hillySpine = extractFullTourSpine(hillyTrip)!;
  const distCuts = computeDefaultCutDistances(hillySpine, 3, 'distance');
  const effortCuts = computeDefaultCutDistances(hillySpine, 3, 'effort');
  cases.push({
    id: 'hilly-400km-effort-vs-distance',
    description: '400 km hilly tour equal-distance cuts vs effort-balanced cuts and boundary clamping',
    input: { totalDistanceKm: hillySpine.totalDistanceKm, dayCount: 3 },
    expected: {
      distanceCutsKm: distCuts,
      effortCutsKm: effortCuts,
      movedCut0To310: moveSingleCut([130, 265], 0, 310, 400),
      clampedCuts: clampAndSortCuts([-10, 420, 200], 400),
      midCoord200Km: interpolateCoordAtDistance(hillySpine, 200),
      midEle200Km: interpolateElevationAtDistance(hillySpine.elevationProfile, 200),
      nearestToMidOffset: findNearestDistanceOnSpine(
        hillySpine,
        interpolateCoordAtDistance(hillySpine, 200)[0] + 0.01,
        interpolateCoordAtDistance(hillySpine, 200)[1],
        100,
        300
      ),
    },
  });

  resetEnvironment();
  const tourTripWithin = make400KmKomootTrip();
  tourTripWithin.departureDate = '2026-12-01';
  const spineWithin = extractFullTourSpine(tourTripWithin)!;
  const cutsWithin = computeDefaultCutDistances(spineWithin, 3, 'distance');
  const previewsWithin = sliceRouteIntoStagePreviews(spineWithin, cutsWithin, {
    startDateIso: '2026-12-01',
    dailyStartTime: '08:30',
    physics: tourTripWithin.physics,
    targetSpeedKmH: 20,
    weather: tourTripWithin.weather,
    lang: 'en',
    cutLabels: { 0: 'Redon', 1: 'Pontivy' },
    cutAccommodationNotes: { 0: 'Camp · Camping Municipal (0.4 km off route)' },
  });
  const slicedWithin = applyStageSlicesToTrip(tourTripWithin, spineWithin, previewsWithin);

  resetEnvironment();
  const tourTripBeyond = make400KmKomootTrip();
  const spineBeyond = extractFullTourSpine(tourTripBeyond)!;
  const cutsBeyond = computeDefaultCutDistances(spineBeyond, 3, 'distance');
  const previewsBeyond = sliceRouteIntoStagePreviews(spineBeyond, cutsBeyond, {
    startDateIso: '2026-07-10',
    dailyStartTime: '08:30',
    physics: tourTripBeyond.physics,
    targetSpeedKmH: 20,
    weather: tourTripBeyond.weather,
    lang: 'en',
    cutLabels: { 0: 'Redon', 1: 'Pontivy' },
  });
  const slicedBeyond = applyStageSlicesToTrip(tourTripBeyond, spineBeyond, previewsBeyond);
  const reconstructed = extractFullTourSpine(slicedBeyond)!;
  const remerged = mergeTourStagesToSingleDay(slicedBeyond);

  cases.push({
    id: 'slice-and-commit-and-remerge',
    description: '3-stage slicing, commit within/beyond 14-day forecast horizon, spine reconstruction, and re-merge',
    input: {
      withinHorizonStart: '2026-12-01',
      beyondHorizonStart: '2026-07-10',
      cuts: cutsBeyond,
    },
    expected: {
      withinHorizonStages: slicedWithin.stages?.map((s) => ({
        id: s.id,
        dayNumber: s.dayNumber,
        departureDate: s.departureDate,
        distanceKm: s.route.distanceKm,
        origin: s.route.origin,
        destination: s.route.destination,
        weatherSource: s.weather.source,
        isBeyondForecastWindow: s.weather.isBeyondForecastWindow,
      })),
      beyondHorizonStages: slicedBeyond.stages?.map((s) => ({
        id: s.id,
        dayNumber: s.dayNumber,
        departureDate: s.departureDate,
        distanceKm: s.route.distanceKm,
        weatherSource: s.weather.source,
        isBeyondForecastWindow: s.weather.isBeyondForecastWindow,
      })),
      reconstructedMeta: {
        totalDistanceKm: reconstructed.totalDistanceKm,
        initialCutDistancesKm: reconstructed.initialCutDistancesKm,
        initialCutLabels: reconstructed.initialCutLabels,
        originLabel: reconstructed.originLabel,
        destLabel: reconstructed.destLabel,
      },
      remergedMeta: {
        stagesDefined: remerged.stages !== undefined,
        distanceKm: remerged.route.distanceKm,
        origin: remerged.route.origin,
        destination: remerged.route.destination,
      },
    },
  });

  return cases;
}

function exportFitExporter(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  const minimalTrip = makeBaseTrip({
    route: {
      ...BASE_ROUTE,
      distanceKm: 20,
      targetSpeedKmH: 25,
    },
  });
  const minimalBytes = exportTripToFit(minimalTrip, {
    includeFuelingCues: false,
    includeClimbCues: false,
    exportTimestampMs: FROZEN_EPOCH_MS,
  });
  cases.push({
    id: 'minimal-route',
    description: 'Minimal 20 km .FIT export with fueling and climb cues disabled',
    input: {
      distanceKm: 20,
      targetSpeedKmH: 25,
      includeFuelingCues: false,
      includeClimbCues: false,
      exportTimestampMs: FROZEN_EPOCH_MS,
    },
    expected: inspectFitBinary(minimalBytes),
  });

  resetEnvironment();
  const utf8Trip = makeBaseTrip({
    route: {
      ...BASE_ROUTE,
      distanceKm: 40,
      targetSpeedKmH: 25,
      cueSheet: [
        { instruction: 'Depart', direction: 'depart', distKm: 0, lat: 47.2184, lng: -1.5536 },
        {
          instruction: 'Turn right onto Rue Haute',
          direction: 'right',
          streetName: 'Rue Haute',
          distKm: 10,
          lat: 47.29,
          lng: -1.35,
        },
      ],
    },
    pinnedAmenities: [
      {
        id: 'utf8-stop',
        name: 'Stop 1234567 €€€',
        category: 'food',
        subType: 'bakery',
        lat: 47.29,
        lon: -1.35,
        routeKm: 8.2,
        detourMeters: 0,
        isPinned: true,
      },
    ],
  });
  const utf8Bytes = exportTripToFit(utf8Trip, {
    includeFuelingCues: false,
    includeClimbCues: false,
    exportTimestampMs: FROZEN_EPOCH_MS,
  });
  cases.push({
    id: 'amenities-and-cues-utf8',
    description: 'Course points with UTF-8 multi-byte boundary truncation and turn cues (excluding depart)',
    input: {
      distanceKm: 40,
      pinnedAmenityName: 'Stop 1234567 €€€',
      cueDirections: ['depart', 'right'],
      exportTimestampMs: FROZEN_EPOCH_MS,
    },
    expected: inspectFitBinary(utf8Bytes),
  });

  resetEnvironment();
  const alpineLockedTrip = makeClimbingTrip();
  alpineLockedTrip.route.distanceKm = 65;
  alpineLockedTrip.route.targetSpeedKmH = 18;
  alpineLockedTrip.route.coordinates = [
    [45.05, 6.02],
    [45.09, 6.08],
    [45.14, 6.13],
  ];
  const alpineLockedBytes = exportTripToFit(alpineLockedTrip, {
    includeFuelingCues: true,
    includeClimbCues: true,
    fuelIntervalMinutes: 35,
    lang: 'en',
    ftpWatts: 300,
    carbTargetGPerHr: 80,
    carbPacingMode: 'locked',
    riderLevel: 'regular',
    nutritionPreference: 'sports-fuel',
    exportTimestampMs: FROZEN_EPOCH_MS,
  });
  cases.push({
    id: 'alpine-locked-80-en',
    description: 'Alpine route with carbPacingMode locked at 80 g/h (45g+H2O cues) and climb markers',
    input: {
      distanceKm: 65,
      targetSpeedKmH: 18,
      includeFuelingCues: true,
      includeClimbCues: true,
      fuelIntervalMinutes: 35,
      lang: 'en',
      ftpWatts: 300,
      carbTargetGPerHr: 80,
      carbPacingMode: 'locked',
      riderLevel: 'regular',
      nutritionPreference: 'sports-fuel',
      exportTimestampMs: FROZEN_EPOCH_MS,
    },
    expected: inspectFitBinary(alpineLockedBytes),
  });

  resetEnvironment(undefined, 'fr');
  const alpineProAutoBytes = exportTripToFit(alpineLockedTrip, {
    includeFuelingCues: true,
    includeClimbCues: true,
    fuelIntervalMinutes: 35,
    lang: 'fr',
    ftpWatts: 300,
    carbTargetGPerHr: 90,
    carbPacingMode: 'auto',
    riderLevel: 'pro',
    nutritionPreference: 'real-food',
    exportTimestampMs: FROZEN_EPOCH_MS,
  });
  cases.push({
    id: 'alpine-auto-pro-fr',
    description: 'French alpine route with carbPacingMode auto preventing pro auto-lock at 90 g/h',
    input: {
      distanceKm: 65,
      targetSpeedKmH: 18,
      includeFuelingCues: true,
      includeClimbCues: true,
      fuelIntervalMinutes: 35,
      lang: 'fr',
      ftpWatts: 300,
      carbTargetGPerHr: 90,
      carbPacingMode: 'auto',
      riderLevel: 'pro',
      nutritionPreference: 'real-food',
      exportTimestampMs: FROZEN_EPOCH_MS,
    },
    expected: inspectFitBinary(alpineProAutoBytes),
  });

  return cases;
}

function exportOpeningHours(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  cases.push({
    id: 'always-open-24-7',
    description: '24/7 and Mo-Su 00:00-24:00 in EN and FR',
    input: {
      a: ['24/7', '2026-07-15', '03:15', 'en'],
      b: ['Mo-Su 00:00-24:00', '2026-07-15', '23:50', 'fr'],
    },
    expected: {
      a: evaluateOpeningHoursAtArrival('24/7', '2026-07-15', '03:15', 'en'),
      b: evaluateOpeningHoursAtArrival('Mo-Su 00:00-24:00', '2026-07-15', '23:50', 'fr'),
    },
  });

  cases.push({
    id: 'weekday-open-closing-closed',
    description: 'Weekday hours evaluated at open, closing-soon (20 min left), closed, and Sunday',
    input: {
      hours: 'Mo-Fr 07:00-19:30',
      checks: [
        { date: '2026-07-15', eta: '12:00', lang: 'en' },
        { date: '2026-07-15', eta: '19:10', lang: 'en' },
        { date: '2026-07-15', eta: '19:35', lang: 'fr' },
        { date: '2026-07-19', eta: '12:00', lang: 'en' },
      ],
    },
    expected: [
      evaluateOpeningHoursAtArrival('Mo-Fr 07:00-19:30', '2026-07-15', '12:00', 'en'),
      evaluateOpeningHoursAtArrival('Mo-Fr 07:00-19:30', '2026-07-15', '19:10', 'en'),
      evaluateOpeningHoursAtArrival('Mo-Fr 07:00-19:30', '2026-07-15', '19:35', 'fr'),
      evaluateOpeningHoursAtArrival('Mo-Fr 07:00-19:30', '2026-07-19', '12:00', 'en'),
    ],
  });

  cases.push({
    id: 'overnight-window',
    description: 'Overnight opening window Mo-Su 18:00-02:00',
    input: { hours: 'Mo-Su 18:00-02:00', date: '2026-07-15', times: ['23:30', '01:40'] },
    expected: {
      at2330: evaluateOpeningHoursAtArrival('Mo-Su 18:00-02:00', '2026-07-15', '23:30', 'en'),
      at0140: evaluateOpeningHoursAtArrival('Mo-Su 18:00-02:00', '2026-07-15', '01:40', 'en'),
    },
  });

  cases.push({
    id: 'seasonal-apr-oct',
    description: 'Seasonal month range Apr-Oct open in July and closed in January',
    input: { hours: 'Apr-Oct Mo-Su 08:00-19:00', dates: ['2026-07-15', '2026-01-15'] },
    expected: {
      july: evaluateOpeningHoursAtArrival('Apr-Oct Mo-Su 08:00-19:00', '2026-07-15', '12:00', 'en'),
      january: evaluateOpeningHoursAtArrival('Apr-Oct Mo-Su 08:00-19:00', '2026-01-15', '12:00', 'fr'),
    },
  });

  cases.push({
    id: 'unknown-and-empty',
    description: 'Unsupported/ambiguous syntax returns unknown and empty/undefined returns null',
    input: { samples: ['PH off', 'sunset-22:00', undefined] },
    expected: {
      phOff: evaluateOpeningHoursAtArrival('PH off', '2026-07-15', '12:00', 'en'),
      sunset: evaluateOpeningHoursAtArrival('sunset-22:00', '2026-07-15', '20:00', 'en'),
      empty: evaluateOpeningHoursAtArrival(undefined, '2026-07-15', '12:00', 'en'),
    },
  });

  return cases;
}

function exportOverpassWaterGaps(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  const coords: [number, number][] = [
    [47.2184, -1.5536],
    [47.25, -1.45],
    [47.28, -1.35],
    [47.31, -1.25],
  ];
  const cumMeters = computeCumulativeDistances(coords);
  cases.push({
    id: 'haversine-and-cumulative',
    description: 'Haversine point-to-point distance and cumulative polyline distances',
    input: { coords },
    expected: {
      firstLegMeters: haversineDistanceMeters(coords[0][0], coords[0][1], coords[1][0], coords[1][1]),
      cumulativeMeters: cumMeters,
    },
  });

  const elev = [
    { distKm: 0, eleM: 12 },
    { distKm: Math.round((cumMeters[1] / 1000) * 10) / 10, eleM: 48 },
    { distKm: Math.round((cumMeters[2] / 1000) * 10) / 10, eleM: 22 },
    { distKm: Math.round((cumMeters[3] / 1000) * 10) / 10, eleM: 35 },
  ];
  const unsortedAmenities: StageAmenity[] = [
    {
      id: 'w-far',
      name: 'Far Tap',
      category: 'water',
      subType: 'drinking_water',
      lat: 47.309,
      lon: -1.251,
      routeKm: 0,
      detourMeters: 0,
    },
    {
      id: 'w-near',
      name: 'Mid Fountain',
      category: 'water',
      subType: 'drinking_water',
      lat: 47.2505,
      lon: -1.45,
      routeKm: 0,
      detourMeters: 0,
    },
  ];
  cases.push({
    id: 'snap-and-resnap',
    description: 'snapToPolyline with elevation matching and resnapAmenitiesToRoute sorting by routeKm',
    input: { queryLat: 47.2505, queryLon: -1.45, coords, elev, amenities: unsortedAmenities },
    expected: {
      snapped: snapToPolyline(47.2505, -1.45, coords, cumMeters, elev),
      resnapped: resnapAmenitiesToRoute(unsortedAmenities, coords, elev),
    },
  });

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
  const cafeOnly: StageAmenity[] = [
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
  cases.push({
    id: 'water-gaps-clear-caution-critical',
    description: 'Water gap classification across clear, caution, critical, and legacy positional args',
    input: { totalDistanceKm: 90, waterStops, cafeOnly },
    expected: {
      clear: calculateWaterGaps(waterStops, 90, {
        sectorSpeedKmH: 25,
        targetFluidMlPerHr: 400,
        bidonSizeMl: 650,
        frameBottleSlots: 2,
      }),
      caution: calculateWaterGaps(waterStops, 90, {
        sectorSpeedKmH: 25,
        targetFluidMlPerHr: 700,
        bidonSizeMl: 650,
        frameBottleSlots: 2,
      }),
      criticalNoWater: calculateWaterGaps(cafeOnly, 80, {
        sectorSpeedKmH: 25,
        targetFluidMlPerHr: 500,
        bidonSizeMl: 650,
        frameBottleSlots: 2,
      }),
      legacyPositional: calculateWaterGaps(waterStops, 90, 25, 45, 650),
    },
  });

  const pacingCurve = [
    { distKm: 0, elapsedSec: 0 },
    { distKm: 20, elapsedSec: 3600 },
    { distKm: 40, elapsedSec: 8400 },
  ];
  cases.push({
    id: 'amenity-eta-midnight-and-pacing',
    description: 'Amenity ETA formatting across 00:15 start, 23:00 rollover dayOffset=1, and pacing curve',
    input: { pacingCurve },
    expected: {
      midnightStart: calculateAmenityEtaDetails('00:15', 12, 24),
      midnightEtaString: calculateAmenityEta('00:15', 12, 24),
      rollover: calculateAmenityEtaDetails('23:00', 48, 24),
      curved: calculateAmenityEtaDetails('08:00', 30, 20, pacingCurve),
    },
  });

  const corridorAmenities: StageAmenity[] = [
    {
      id: 'w-24km',
      name: 'Fontaine Place',
      category: 'water',
      subType: 'drinking_water',
      lat: 47.24,
      lon: -1.46,
      routeKm: 24,
      detourMeters: 25,
    },
    {
      id: 'cem-26km',
      name: 'Cimetière Nord',
      category: 'cemetery',
      subType: 'cemetery',
      lat: 47.245,
      lon: -1.45,
      routeKm: 26,
      detourMeters: 10,
    },
    {
      id: 'bak-closed-30km',
      name: 'Boulangerie Fermée Mercredi',
      category: 'food',
      subType: 'bakery',
      lat: 47.25,
      lon: -1.44,
      routeKm: 30,
      detourMeters: 15,
      openingHours: 'Mo-Tu 07:00-13:00',
    },
    {
      id: 'bak-open-32km',
      name: 'Boulangerie Ouverte',
      category: 'food',
      subType: 'bakery',
      lat: 47.255,
      lon: -1.43,
      routeKm: 32,
      detourMeters: 30,
      openingHours: 'Mo-Su 07:00-19:00',
    },
    {
      id: 'w-52km',
      name: 'Source du Parc',
      category: 'water',
      subType: 'drinking_water',
      lat: 47.29,
      lon: -1.32,
      routeKm: 52,
      detourMeters: 15,
    },
  ];
  cases.push({
    id: 'auto-mark-resupply-open-hours',
    description: 'autoMarkResupplyStops filtering closed bakeries by arrival ETA on 2026-07-15',
    input: {
      totalDistanceKm: 75,
      departureTime: '08:00',
      targetDate: '2026-07-15',
      effectiveSpeedKmH: 25,
      intervalKm: 25,
      amenities: corridorAmenities,
    },
    expected: autoMarkResupplyStops({
      amenities: corridorAmenities,
      totalDistanceKm: 75,
      departureTime: '08:00',
      targetDate: '2026-07-15',
      effectiveSpeedKmH: 25,
      intervalKm: 25,
    }),
  });

  return cases;
}

function exportPlanShare(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  const coords: [number, number][] = [
    [47.2184, -1.5536],
    [47.31, -1.72],
    [47.45, -1.8],
    [47.55, -1.94],
    [47.651, -2.085],
  ];
  const downsampled = downsampleCoordinates(coords, 3);
  const encodedPoly = encodePolyline(coords);
  cases.push({
    id: 'polyline-downsample-roundtrip',
    description: 'Coordinate downsampling and Google encoded polyline round-trip',
    input: { coords, maxPoints: 3 },
    expected: {
      downsampled,
      encodedPoly,
      decodedPoly: decodePolyline(encodedPoly),
    },
  });

  cases.push({
    id: 'short-url-and-location-extract',
    description: 'Short plan URL builder and location extraction across path/query/hash/invalid',
    input: { code: 'K8m4P2x9', baseUrl: 'https://cadence.app/' },
    expected: {
      shortUrl: buildShortPlanShareUrl('K8m4P2x9', 'https://cadence.app/'),
      fromPath: extractSharedPlanFromLocation({ pathname: '/p/K8m4P2x9/', search: '', hash: '' }),
      fromShortQuery: extractSharedPlanFromLocation({ pathname: '/', search: '?p=abc12345', hash: '' }),
      fromTokenQuery: extractSharedPlanFromLocation({ pathname: '/', search: '?plan=eyJ2IjoyfQ', hash: '' }),
      fromHash: extractSharedPlanFromLocation({ pathname: '/', search: '', hash: '#plan=eyJ2IjoxfQ' }),
      invalidShort: extractSharedPlanFromLocation({ pathname: '/', search: '?p=bad!', hash: '' }),
    },
  });

  resetEnvironment();
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
  const legacyToken = Buffer.from(JSON.stringify(legacyPayload), 'utf8').toString('base64url');
  cases.push({
    id: 'legacy-v1-decode',
    description: 'Legacy v1 base64url token decoding in EN and FR under frozen Date',
    input: { legacyPayload, token: legacyToken },
    expected: {
      en: decodePlanShareToken(legacyToken, 'en'),
      fr: decodePlanShareToken(legacyToken, 'fr'),
    },
  });

  resetEnvironment();
  const baseTrip = makeBaseTrip({
    name: 'Brittany 3-Day Tour',
    tag: 'BIKEPACKING',
    departureDate: '2026-07-10',
    departureTime: '08:00',
    route: {
      ...BASE_ROUTE,
      origin: 'Nantes',
      destination: 'Redon',
      distanceKm: 135,
      elevationGainM: 820,
      targetSpeedKmH: 20,
      coordinates: [
        [47.2184, -1.5536],
        [47.45, -1.8],
        [47.651, -2.085],
      ],
    },
    pinnedAmenities: [
      {
        id: 'stop-1',
        name: 'Boulangerie Blain',
        category: 'food',
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
        office: { ...BASE_OFFICE },
        weather: { ...CALM_WEATHER },
        customChips: [],
        pinnedAmenities: [
          {
            id: 'stop-1',
            name: 'Boulangerie Blain',
            category: 'food',
            subType: 'bakery',
            routeKm: 42.5,
            lat: 47.476,
            lon: -1.763,
            detourMeters: 40,
            isPinned: true,
          },
        ],
        route: {
          ...BASE_ROUTE,
          origin: 'Nantes',
          destination: 'Redon',
          distanceKm: 135,
          elevationGainM: 820,
          targetSpeedKmH: 20,
          coordinates: [
            [47.2184, -1.5536],
            [47.45, -1.8],
            [47.651, -2.085],
          ],
        },
      },
      {
        id: 'stage-2',
        dayNumber: 2,
        departureDate: '2026-07-11',
        departureTime: '08:00',
        office: { ...BASE_OFFICE },
        weather: { ...CALM_WEATHER },
        customChips: [],
        route: {
          ...BASE_ROUTE,
          origin: 'Redon',
          destination: 'Vannes',
          distanceKm: 142,
          elevationGainM: 950,
          targetSpeedKmH: 20,
          coordinates: [
            [47.651, -2.085],
            [47.66, -2.4],
            [47.658, -2.76],
          ],
        },
      },
    ],
  });
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
  const extras = {
    leaveByHHMM: '08:00',
    arrivalHHMM: '15:30',
    goStatus: 'GO' as const,
    bikeName: 'Gravel Pro',
    senderBaseline: sender,
  };
  const v2Token = encodePlanShareToken(baseTrip, extras);
  cases.push({
    id: 'v2-multistage-encode-decode-and-meta',
    description: 'v2 multi-stage token round-trip, full URL builder, and summary metadata',
    input: { tripName: baseTrip.name, stageCount: 2, extras, baseUrl: 'https://ridecadence.cc/' },
    expected: {
      token: v2Token,
      url: buildPlanShareUrl(baseTrip, extras, 'https://ridecadence.cc/'),
      summaryMeta: buildPlanShareSummaryMeta(baseTrip, extras),
      decodedEn: decodePlanShareToken(v2Token, 'en'),
    },
  });

  resetEnvironment();
  const hillySharedTrip = makeBaseTrip({
    name: 'Group Hill Test',
    departureDate: '2026-07-10',
    departureTime: '08:00',
    route: {
      ...BASE_ROUTE,
      distanceKm: 110,
      elevationGainM: 1200,
      targetSpeedKmH: 23,
      pacingMode: 'speed',
    },
    physics: {
      ...BASE_PHYSICS,
      luggageWeightKg: 8,
      gearWeightKg: 8,
    },
  });
  const receiverSpecs: RiderBikeSpecs = {
    ...DEFAULT_RIDER_BIKE_SPECS,
    riderName: 'Alex',
    riderWeightKg: 88,
    ftpWatts: 195,
    telemetryMode: 'quantitative',
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
  cases.push({
    id: 'personal-lens-and-group-sync',
    description: 'applyPersonalLensToSharedTrip and computeGroupSyncCheck effort gap in EN and FR',
    input: { tripName: hillySharedTrip.name, sender, receiverSpecs, departureHHMM: '08:00' },
    expected: {
      personalizedEn: applyPersonalLensToSharedTrip(hillySharedTrip, receiverSpecs, {
        luggageWeightKg: 10,
        lang: 'en',
      }),
      groupSyncEn: computeGroupSyncCheck(hillySharedTrip, sender, receiverSpecs, '08:00', 'en'),
      groupSyncFr: computeGroupSyncCheck(hillySharedTrip, sender, receiverSpecs, '08:00', 'fr'),
    },
  });

  return cases;
}

function exportRideReadiness(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  const makeInput = (
    overrides: Partial<{ [K in keyof RideReadinessInput]: Partial<RideReadinessInput[K]> }> = {}
  ): RideReadinessInput => {
    const base: RideReadinessInput = {
      lang: 'en',
      weather: { rainRiskPct: 5, baseWindKmH: 8, gustKmH: 14, headwindKmH: 0, feelsLikeC: 17 },
      bike: { name: 'Road', category: 'road', tireWidthMm: 28, isTubeless: true },
      terrain: { hasSurfaceData: true, gravelPct: 0, singletrackPct: 0 },
      effort: { ftpPercent: 65, movingHours: 1.5, powerZone: 'Z2', riderLevel: 'regular' },
      checklist: { total: 10, checked: 10, criticalTotal: 4, criticalChecked: 4 },
      light: { nightPercent: 0, twilightPercent: 0 },
      route: { worstSeverity: 'clear', issueCount: 0 },
      goStatus: 'GO',
    };
    const out = { ...base } as RideReadinessInput;
    for (const key of Object.keys(overrides) as (keyof RideReadinessInput)[]) {
      const v = overrides[key];
      (out as any)[key] = typeof v === 'object' && v !== null ? { ...(base as any)[key], ...v } : v;
    }
    return out;
  };

  cases.push({
    id: 'readiness-bands',
    description: 'READINESS_BANDS constants and boundary score level mapping',
    input: { scores: [0, 44, 45, 74, 75, 100] },
    expected: {
      bands: READINESS_BANDS,
      levels: [0, 44, 45, 74, 75, 100].map((score) => ({ score, level: getReadinessLevel(score) })),
    },
  });

  const perfectEn = makeInput();
  const perfectFr = makeInput({ lang: 'fr' as any });
  cases.push({
    id: 'perfect-en-and-fr',
    description: 'Perfect 100/100 setup in English and French',
    input: { en: perfectEn, fr: perfectFr },
    expected: {
      en: computeRideReadiness(perfectEn),
      fr: computeRideReadiness(perfectFr),
    },
  });

  const roadOnGravel = makeInput({ terrain: { gravelPct: 55, singletrackPct: 5 } });
  const gravelOnGravel = makeInput({
    bike: { category: 'gravel', tireWidthMm: 42, isTubeless: true },
    terrain: { gravelPct: 55, singletrackPct: 5 },
  });
  cases.push({
    id: 'terrain-mismatch-vs-gravel',
    description: '28mm road tire mismatch vs 42mm tubeless gravel bike on 55% gravel',
    input: { roadOnGravel, gravelOnGravel },
    expected: {
      roadOnGravel: computeRideReadiness(roadOnGravel),
      gravelOnGravel: computeRideReadiness(gravelOnGravel),
    },
  });

  const critMissing = makeInput({ checklist: { checked: 7, criticalChecked: 1 } });
  const optMissing = makeInput({ checklist: { checked: 7, criticalChecked: 4 } });
  const emptyChecklist = makeInput({
    checklist: { total: 0, checked: 0, criticalTotal: 0, criticalChecked: 0 },
  });
  cases.push({
    id: 'checklist-critical-and-empty',
    description: 'Critical vs optional unticked items and non-applicable empty checklist',
    input: { critMissing, optMissing, emptyChecklist },
    expected: {
      critMissing: computeRideReadiness(critMissing),
      optMissing: computeRideReadiness(optMissing),
      emptyChecklist: computeRideReadiness(emptyChecklist),
    },
  });

  const longWithoutStop = makeInput({ effort: { ftpPercent: 72, movingHours: 5 } });
  const longWithStop = makeInput({ effort: { ftpPercent: 72, movingHours: 5, plannedStopMinutes: 45 } });
  const preDawnWinter = makeInput({
    effort: { ftpPercent: 72, movingHours: 2.5, isPreDawnWinter: true },
    light: { nightPercent: 60, twilightPercent: 25 },
  });
  cases.push({
    id: 'effort-stop-relief-and-predawn',
    description: 'Planned 45-min stop effort relief and pre-dawn winter factor',
    input: { longWithoutStop, longWithStop, preDawnWinter },
    expected: {
      longWithoutStop: computeRideReadiness(longWithoutStop),
      longWithStop: computeRideReadiness(longWithStop),
      preDawnWinter: computeRideReadiness(preDawnWinter),
    },
  });

  const criticalRoute = makeInput({ route: { worstSeverity: 'critical', issueCount: 3 } });
  const stormNoGo = makeInput({
    weather: { rainRiskPct: 90, baseWindKmH: 34, gustKmH: 58, headwindKmH: 30, feelsLikeC: 4 },
    goStatus: 'NO-GO',
  });
  cases.push({
    id: 'weakest-link-drag-and-nogo-cap',
    description: 'Weakest-link critical route drag and NO-GO storm cap (<=40)',
    input: { criticalRoute, stormNoGo },
    expected: {
      criticalRoute: computeRideReadiness(criticalRoute),
      stormNoGo: computeRideReadiness(stormNoGo),
    },
  });

  return cases;
}

function exportSolarVisibility(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  cases.push({
    id: 'ephemeris-and-elevation-explicit-tz',
    description: 'Nantes winter solstice (UTC+1) and summer solstice (UTC+2) ephemeris and solar elevation',
    input: {
      lat: 47.2184,
      lon: -1.5536,
      winterDate: '2026-12-21',
      summerDate: '2026-06-21',
    },
    expected: {
      winterEphemeris: getSolarEphemeris(47.2184, -1.5536, '2026-12-21', 1),
      winterElev0715: getSolarElevation(47.2184, -1.5536, '2026-12-21', '07:15', 1),
      winterElev1230: getSolarElevation(47.2184, -1.5536, '2026-12-21', '12:30', 1),
      summerEphemeris: getSolarEphemeris(47.2184, -1.5536, '2026-06-21', 2),
      summerElev1300: getSolarElevation(47.2184, -1.5536, '2026-06-21', '13:00', 2),
    },
  });

  cases.push({
    id: 'approx-tz-paris',
    description: 'getApproxTimezoneOffset across CET winter, DST transition day, and CEST summer under TZ=Europe/Paris',
    input: { dates: ['2026-12-21', '2026-03-29', '2026-06-21'], lon: -1.5536 },
    expected: ['2026-12-21', '2026-03-29', '2026-06-21'].map((dateStr) => ({
      dateStr,
      tzOffsetHours: getApproxTimezoneOffset(dateStr, -1.5536),
    })),
  });

  const winterTrip = makeBaseTrip({
    departureDate: '2026-12-21',
    departureTime: '06:45',
    route: { ...BASE_ROUTE, distanceKm: 30, targetSpeedKmH: 24 },
    weather: { ...CALM_WEATHER, temperatureC: 1.5, precipitationRiskPercent: 50, visibilityKm: 3.0, weatherCode: 45 },
  });
  cases.push({
    id: 'ride-visibility-winter-predawn-black-ice',
    description: 'Pre-dawn winter ride visibility with fog and black-ice risk',
    input: { date: '2026-12-21', rollout: '06:45', temperatureC: 1.5, visibilityKm: 3.0, weatherCode: 45 },
    expected: calculateRideVisibility(winterTrip, '2026-12-21', '06:45', 24),
  });

  const novTrip = makeBaseTrip({
    route: { ...BASE_ROUTE, distanceKm: 25, targetSpeedKmH: 25 },
    weather: { ...CALM_WEATHER, temperatureC: 14, visibilityKm: 18, weatherCode: 1 },
  });
  cases.push({
    id: 'ride-visibility-dawn-dusk-daylight',
    description: 'Twilight dawn, twilight dusk, and summer daylight visibility profiles',
    input: {
      dawn: { date: '2026-11-15', rollout: '07:30' },
      dusk: { date: '2026-11-15', rollout: '16:45' },
      daylight: { date: '2026-06-21', rollout: '11:00' },
    },
    expected: {
      dawn: calculateRideVisibility(novTrip, '2026-11-15', '07:30', 25),
      dusk: calculateRideVisibility(novTrip, '2026-11-15', '16:45', 25),
      daylight: calculateRideVisibility(novTrip, '2026-06-21', '11:00', 25),
    },
  });

  cases.push({
    id: 'classification-helpers',
    description: 'Ambient light phase, visibility category, WMO descriptions, and HH:MM converters',
    input: {
      elevations: [-15, -9, -3, 8, 30],
      visibilities: [0.5, 2.5, 6.0, 15.0, 25.0],
      wmoCodes: [0, 2, 3, 45, 53, 63, 73, 81, 99],
      minutes: [-30, 435, 1455],
    },
    expected: {
      lightPhases: [-15, -9, -3, 8, 30].map((deg) => ({ deg, phase: getAmbientLightPhase(deg) })),
      visibilityCategories: [0.5, 2.5, 6.0, 15.0, 25.0].map((km) => ({ km, cat: getVisibilityCategory(km) })),
      wmoDescriptions: [0, 2, 3, 45, 53, 63, 73, 81, 99].map((code) => ({
        code,
        desc: getWmoWeatherDescription(code),
      })),
      minutesToHHMM: [-30, 435, 1455].map((m) => ({ min: m, hhmm: minutesToHHMM(m) })),
      hhmmToMinutes: ['00:00', '07:15', '23:45'].map((t) => ({ hhmm: t, min: hhmmToMinutes(t) })),
    },
  });

  return cases;
}

function exportWindInsights(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  const baseWindInput = {
    distanceKm: 40,
    targetSpeedKmH: 25,
    riderWeightKg: 74,
    bikeWeightKg: 10,
    cda: 0.38,
    crr: 0.006,
    windSpeedKmH: 22,
    windFromDegrees: 245,
  };
  cases.push({
    id: 'human-wind-headwind-crosswind-tailwind',
    description: 'Human wind impact at 0°, 90°, and 180° relative angles in EN and FR',
    input: { baseWindInput, anglesDeg: [0, 90, 180] },
    expected: {
      headwindEn: calculateHumanWindImpact({ ...baseWindInput, windRelativeAngleDeg: 0, lang: 'en' }),
      crosswindEn: calculateHumanWindImpact({ ...baseWindInput, windRelativeAngleDeg: 90, lang: 'en' }),
      tailwindEn: calculateHumanWindImpact({ ...baseWindInput, windRelativeAngleDeg: 180, lang: 'en' }),
      headwindFr: calculateHumanWindImpact({ ...baseWindInput, windRelativeAngleDeg: 0, lang: 'fr' }),
    },
  });

  resetEnvironment(undefined, 'fr');
  const tripWindInput = {
    distanceKm: 50,
    targetSpeedKmH: 25,
    windSpeedKmH: 24,
    effectiveHeadwindKmH: 22,
    windDirection: 'headwind' as const,
    windFromDegrees: 270,
    temperatureC: 14,
    lang: 'fr' as const,
  };
  cases.push({
    id: 'trip-wind-insight-fr',
    description: 'calculateTripWindInsight ghost climbing and French compass direction',
    input: tripWindInput,
    expected: calculateTripWindInsight(tripWindInput),
  });

  const elevations = [5, 27, 50, 75, 95, 135, 210, 310, 1071, 1610];
  cases.push({
    id: 'elevation-scale-thresholds',
    description: 'Real-world elevation landmark metaphors across all height thresholds in EN and FR',
    input: { elevations },
    expected: elevations.map((meters) => ({
      meters,
      en: formatElevationRealWorldScale(meters, 'en'),
      fr: formatElevationRealWorldScale(meters, 'fr'),
    })),
  });

  return cases;
}

function exportStemSticker(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  resetEnvironment();
  const ventouxDemo = DEMO_TOOL_ROUTES.find((d) => d.id === 'mont-ventoux-bedoin')!;
  const ventouxTrip = buildTripFromToolRoute({
    parsed: ventouxDemo.parsed,
    speedKmH: 20,
    departureTime: '08:00',
    lang: 'en',
  });
  ventouxTrip.departureDate = '2026-07-15';
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
  cases.push({
    id: 'ventoux-gravel-selected-stops-en',
    description: 'Mont Ventoux gravel stem sticker with explicit stop selection and custom note',
    input: {
      demoRouteId: ventouxDemo.id,
      departureDate: '2026-07-15',
      departureTime: '08:00',
      presetId: 'gravel',
      selectedAmenityIds: ['stop-b'],
      customNotes: [{ id: 'c1', km: 15.2, label: 'Chalet Reynard Coffee' }],
      lang: 'en',
    },
    expected: {
      presets: STEM_STICKER_PRESETS,
      sticker: buildStemStickerData({
        trip: ventouxTrip,
        presetId: 'gravel',
        amenities: mockStops,
        selectedAmenityIds: ['stop-b'],
        customNotes: [{ id: 'c1', km: 15.2, label: 'Chalet Reynard Coffee' }],
        lang: 'en',
      }),
    },
  });

  resetEnvironment({ pressureUnit: 'psi' }, 'fr');
  const dryTourTrip = makeBaseTrip({
    name: 'Boucle Sèche 95 km',
    departureDate: '2026-07-15',
    departureTime: '07:30',
    route: {
      ...BASE_ROUTE,
      distanceKm: 95,
      elevationGainM: 650,
      targetSpeedKmH: 26,
    },
    weather: { ...CALM_WEATHER, temperatureC: 27 },
  });
  cases.push({
    id: 'road-preset-water-gap-fr',
    description: 'Narrow road preset (maxRows 10) in French with PSI tyre pressure and critical water-gap row',
    input: {
      distanceKm: 95,
      presetId: 'road',
      pressureUnit: 'psi',
      temperatureC: 27,
      lang: 'fr',
    },
    expected: buildStemStickerData({
      trip: dryTourTrip,
      riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, pressureUnit: 'psi' },
      amenities: [],
      presetId: 'road',
      lang: 'fr',
    }),
  });

  resetEnvironment();
  const shortRideTrip = makeBaseTrip({
    name: 'Short Interval Spin',
    departureDate: '2026-07-15',
    departureTime: '08:00',
    route: {
      ...BASE_ROUTE,
      distanceKm: 12,
      elevationGainM: 80,
      targetSpeedKmH: 25,
    },
  });
  const autoShortSticker = buildStemStickerData({
    trip: shortRideTrip,
    riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, carbTargetGPerHr: 80, carbPacingMode: 'auto' },
    presetId: 'road',
    lang: 'en',
  });
  const lockedShortSticker = buildStemStickerData({
    trip: shortRideTrip,
    riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, carbTargetGPerHr: 80, carbPacingMode: 'locked' },
    presetId: 'road',
    lang: 'en',
  });
  cases.push({
    id: 'short-ride-carb-locked-vs-auto',
    description: '12 km (<45m) ride comparing carbPacingMode auto (Water only) vs locked (Eat /20m)',
    input: { distanceKm: 12, targetSpeedKmH: 25, carbTargetGPerHr: 80 },
    expected: {
      autoShortSticker,
      lockedShortSticker,
    },
  });

  return cases;
}

function exportStationaryRecovery(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  const winterPreDawn0630 = getStationaryRecoveryRule({
    rolloutTimeHHMM: '06:30',
    departureDate: '2026-12-15',
    coordinates: [47.2184, -1.5536],
  });
  const winterPreDawn0715 = getStationaryRecoveryRule({
    rolloutTimeHHMM: '07:15',
    departureDate: '2026-12-21',
    coordinates: [47.2184, -1.5536],
  });
  const winterPostDawn0930 = getStationaryRecoveryRule({
    rolloutTimeHHMM: '09:30',
    departureDate: '2026-12-15',
    coordinates: [47.2184, -1.5536],
  });
  const summerEarly0630 = getStationaryRecoveryRule({
    rolloutTimeHHMM: '06:30',
    departureDate: '2026-06-21',
    coordinates: [47.2184, -1.5536],
  });
  cases.push({
    id: 'winter-predawn-vs-postdawn-vs-summer',
    description: 'Pre-dawn winter restriction vs winter post-dawn vs summer early morning',
    input: {
      constants: { PRE_DAWN_WINTER_MAX_REST_MIN, LUNCH_BREAK_MIN_DURATION },
      probes: [
        { rolloutTimeHHMM: '06:30', departureDate: '2026-12-15' },
        { rolloutTimeHHMM: '07:15', departureDate: '2026-12-21' },
        { rolloutTimeHHMM: '09:30', departureDate: '2026-12-15' },
        { rolloutTimeHHMM: '06:30', departureDate: '2026-06-21' },
      ],
    },
    expected: {
      winterPreDawn0630,
      winterPreDawn0715,
      winterPostDawn0930,
      summerEarly0630,
    },
  });

  const durations = [3, 5, 15, 29, 30, 45, 60];
  cases.push({
    id: 'resolve-rest-stop-caps',
    description: 'Rest stop cap (<=5m) and >=30m lunch break disabling under restricted vs unrestricted rules',
    input: { durations },
    expected: {
      restricted: durations.map((d) => ({
        requested: d,
        effective: resolveEffectiveRestStopMinutes(d, winterPreDawn0630),
      })),
      unrestricted: durations.map((d) => ({
        requested: d,
        effective: resolveEffectiveRestStopMinutes(d, winterPostDawn0930),
      })),
    },
  });

  const departModeTrip = makeBaseTrip({
    tag: 'ESCAPADE',
    departureDate: '2026-12-15',
    departureTime: '06:30',
    arriveAtMode: false,
    route: { ...BASE_ROUTE, distanceKm: 30, targetSpeedKmH: 25 },
  });
  const arriveModeTrip = makeBaseTrip({
    tag: 'VÉLOTAF',
    departureDate: '2026-12-15',
    arriveAtMode: true,
    route: {
      ...BASE_ROUTE,
      distanceKm: 30,
      targetSpeedKmH: 25,
      urbanTrafficDelayMinutes: 8,
      gateSecurityDelayMinutes: 5,
    },
    office: { ...BASE_OFFICE, targetGateArrivalTime: '08:00' },
  });
  cases.push({
    id: 'trip-rollout-and-rule',
    description: 'estimateTripRolloutTimeHHMM and getStationaryRecoveryRuleForTrip for depart-at vs arrive-by',
    input: { departTripId: departModeTrip.id, arriveTripId: arriveModeTrip.id },
    expected: {
      departMode: {
        rolloutHHMM: estimateTripRolloutTimeHHMM(departModeTrip),
        rule: getStationaryRecoveryRuleForTrip(departModeTrip),
      },
      arriveMode: {
        rolloutHHMM: estimateTripRolloutTimeHHMM(arriveModeTrip),
        rule: getStationaryRecoveryRuleForTrip(arriveModeTrip),
      },
    },
  });

  return cases;
}

function exportWeeklyWeatherSummary(): GoldenCase[] {
  const baseDates = [
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
  ];
  const makeForecast = (days: Partial<DailyForecastDay>[]): WeeklyForecast => ({
    latitude: 47.2184,
    longitude: -1.5536,
    fetchedAt: '2026-11-16T10:00:00Z',
    days: days.map((d, i) => ({
      date: d.date ?? baseDates[i % baseDates.length],
      weatherCode: d.weatherCode ?? 1,
      tempMaxC: d.tempMaxC ?? 15,
      tempMinC: d.tempMinC ?? 8,
      precipitationSumMm: d.precipitationSumMm ?? 0,
      precipitationProbMax: d.precipitationProbMax ?? 10,
      windSpeedMaxKmH: d.windSpeedMaxKmH ?? 14,
    })),
  });

  const scenarios: Array<{ id: string; description: string; forecast: WeeklyForecast }> = [
    {
      id: 'snow-freeze',
      description: 'Sub-zero/snow forecast in EN and FR',
      forecast: makeForecast([
        { weatherCode: 73, precipitationSumMm: 4, precipitationProbMax: 80, tempMaxC: 1, tempMinC: -3 },
        { weatherCode: 71, precipitationSumMm: 2, precipitationProbMax: 65, tempMaxC: 2, tempMinC: -2 },
        { weatherCode: 3, tempMaxC: 3, tempMinC: -1 },
        { weatherCode: 1, tempMaxC: 4, tempMinC: -1 },
        { weatherCode: 1, tempMaxC: 3, tempMinC: -2 },
        { weatherCode: 2, tempMaxC: 2, tempMinC: -2 },
        { weatherCode: 71, precipitationSumMm: 3, precipitationProbMax: 70, tempMaxC: 1, tempMinC: -3 },
      ]),
    },
    {
      id: 'all-rain-stormy',
      description: 'All-week rain with high winds',
      forecast: makeForecast(
        baseDates.map(() => ({
          weatherCode: 63,
          precipitationSumMm: 8,
          precipitationProbMax: 85,
          tempMaxC: 11,
          tempMinC: 7,
          windSpeedMaxKmH: 38,
        }))
      ),
    },
    {
      id: 'all-rain-calm',
      description: 'All-week rain with calm winds',
      forecast: makeForecast(
        baseDates.map(() => ({
          weatherCode: 61,
          precipitationSumMm: 6,
          precipitationProbMax: 80,
          tempMaxC: 11,
          tempMinC: 7,
          windSpeedMaxKmH: 14,
        }))
      ),
    },
    {
      id: 'very-rainy-driest-day',
      description: 'Mostly rainy week calling out driest day (Friday)',
      forecast: makeForecast([
        { weatherCode: 63, precipitationSumMm: 8, precipitationProbMax: 85, tempMaxC: 12 },
        { weatherCode: 61, precipitationSumMm: 5, precipitationProbMax: 75, tempMaxC: 13 },
        { weatherCode: 61, precipitationSumMm: 4, precipitationProbMax: 70, tempMaxC: 12 },
        { weatherCode: 63, precipitationSumMm: 9, precipitationProbMax: 90, tempMaxC: 11 },
        { weatherCode: 1, precipitationSumMm: 0, precipitationProbMax: 10, tempMaxC: 14 },
        { weatherCode: 80, precipitationSumMm: 4, precipitationProbMax: 65, tempMaxC: 12 },
        { weatherCode: 2, precipitationSumMm: 0.2, precipitationProbMax: 25, tempMaxC: 13 },
      ]),
    },
    {
      id: 'mixed-2-rainy',
      description: 'Mixed week with 2 rainy days (Tue & Thu)',
      forecast: makeForecast([
        { weatherCode: 1, tempMaxC: 16 },
        { weatherCode: 61, precipitationSumMm: 3, precipitationProbMax: 70, tempMaxC: 14 },
        { weatherCode: 2, tempMaxC: 15 },
        { weatherCode: 80, precipitationSumMm: 2.5, precipitationProbMax: 65, tempMaxC: 14 },
        { weatherCode: 0, tempMaxC: 17 },
        { weatherCode: 1, tempMaxC: 18 },
        { weatherCode: 1, tempMaxC: 17 },
      ]),
    },
    {
      id: 'single-shower-today-and-later',
      description: 'Single rainy day tested both on day 0 (today) and day 3 (later)',
      forecast: makeForecast([
        { weatherCode: 61, precipitationSumMm: 3.5, precipitationProbMax: 75, tempMaxC: 15 },
        { weatherCode: 1, tempMaxC: 16 },
        { weatherCode: 0, tempMaxC: 17 },
        { weatherCode: 1, tempMaxC: 17 },
        { weatherCode: 1, tempMaxC: 18 },
        { weatherCode: 0, tempMaxC: 18 },
        { weatherCode: 1, tempMaxC: 17 },
      ]),
    },
    {
      id: 'windy-dry',
      description: 'Mostly dry but windy week (44 km/h)',
      forecast: makeForecast([
        { weatherCode: 2, windSpeedMaxKmH: 38, tempMaxC: 14 },
        { weatherCode: 1, windSpeedMaxKmH: 44, tempMaxC: 15 },
        { weatherCode: 2, windSpeedMaxKmH: 35, tempMaxC: 14 },
        { weatherCode: 1, windSpeedMaxKmH: 22, tempMaxC: 16 },
        { weatherCode: 0, windSpeedMaxKmH: 18, tempMaxC: 16 },
        { weatherCode: 1, windSpeedMaxKmH: 20, tempMaxC: 15 },
        { weatherCode: 2, windSpeedMaxKmH: 24, tempMaxC: 15 },
      ]),
    },
    {
      id: 'cold-dry',
      description: 'Cold dry winter week (< 8°C)',
      forecast: makeForecast(baseDates.map(() => ({ weatherCode: 1, tempMaxC: 6, tempMinC: 0 }))),
    },
    {
      id: 'hot-dry',
      description: 'Hot dry summer week (>= 27°C)',
      forecast: makeForecast(baseDates.map(() => ({ weatherCode: 0, tempMaxC: 31, tempMinC: 18 }))),
    },
    {
      id: 'clear-sunny-mild',
      description: 'Clear mild week (~18°C)',
      forecast: makeForecast([
        { weatherCode: 0, tempMaxC: 17, tempMinC: 9 },
        { weatherCode: 1, tempMaxC: 18, tempMinC: 10 },
        { weatherCode: 0, tempMaxC: 19, tempMinC: 10 },
        { weatherCode: 1, tempMaxC: 18, tempMinC: 9 },
        { weatherCode: 0, tempMaxC: 20, tempMinC: 11 },
        { weatherCode: 1, tempMaxC: 19, tempMinC: 10 },
        { weatherCode: 0, tempMaxC: 18, tempMinC: 9 },
      ]),
    },
    {
      id: 'empty-days',
      description: 'Empty days array returns empty string',
      forecast: makeForecast([]),
    },
  ];

  // Also add single-shower-later variant explicitly
  const singleShowerLater = makeForecast([
    { weatherCode: 1, tempMaxC: 16 },
    { weatherCode: 1, tempMaxC: 16 },
    { weatherCode: 0, tempMaxC: 17 },
    { weatherCode: 61, precipitationSumMm: 3.5, precipitationProbMax: 75, tempMaxC: 15 },
    { weatherCode: 1, tempMaxC: 18 },
    { weatherCode: 0, tempMaxC: 18 },
    { weatherCode: 1, tempMaxC: 17 },
  ]);
  scenarios.push({
    id: 'single-shower-later',
    description: 'Single rainy day later in week (Thursday)',
    forecast: singleShowerLater,
  });

  return scenarios.map((sc) => ({
    id: sc.id,
    description: sc.description,
    input: { forecast: sc.forecast },
    expected: {
      en: summarizeWeeklyWeather(sc.forecast, 'en'),
      fr: summarizeWeeklyWeather(sc.forecast, 'fr'),
    },
  }));
}

// ── 6. Main Entrypoint ─────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // CRITICAL in Node: preload French dictionary before calling translate('fr', ...)
  await ensureLocaleLoaded('fr');

  const outDir = path.join(process.cwd(), 'contracts', 'golden-fixtures');
  fs.mkdirSync(outDir, { recursive: true });

  withFrozenTime(FROZEN_UTC_ISO, () => {
    const runners: Array<{
      file: string;
      engine: string;
      sourceFiles: string[];
      run: () => GoldenCase[];
    }> = [
      {
        file: 'physics.golden.json',
        engine: 'physics',
        sourceFiles: ['src/utils/physics.ts', 'src/utils/surfaceProfile.ts'],
        run: exportPhysics,
      },
      {
        file: 'nutrition.golden.json',
        engine: 'nutrition',
        sourceFiles: ['src/utils/nutrition.ts', 'src/data/pantryCatalog.ts'],
        run: exportNutrition,
      },
      {
        file: 'timeline.golden.json',
        engine: 'timeline',
        sourceFiles: ['src/utils/timeline.ts', 'src/utils/stationaryRecovery.ts'],
        run: exportTimeline,
      },
      {
        file: 'tyrePressure.golden.json',
        engine: 'tyrePressure',
        sourceFiles: ['src/utils/tyrePressure.ts'],
        run: exportTyrePressure,
      },
      {
        file: 'climbSplits.golden.json',
        engine: 'climbSplits',
        sourceFiles: ['src/utils/climbSplits.ts'],
        run: exportClimbSplits,
      },
      {
        file: 'gpxParser.golden.json',
        engine: 'gpxParser',
        sourceFiles: ['src/utils/gpxParser.ts', 'src/utils/routeFileParser.ts'],
        run: exportGpxParser,
      },
      {
        file: 'gpxSlicer.golden.json',
        engine: 'gpxSlicer',
        sourceFiles: ['src/utils/gpxSlicer.ts'],
        run: exportGpxSlicer,
      },
      {
        file: 'fitExporter.golden.json',
        engine: 'fitExporter',
        sourceFiles: ['src/utils/fitExporter.ts'],
        run: exportFitExporter,
      },
      {
        file: 'openingHours.golden.json',
        engine: 'openingHours',
        sourceFiles: ['src/utils/openingHours.ts'],
        run: exportOpeningHours,
      },
      {
        file: 'overpassWaterGaps.golden.json',
        engine: 'overpassWaterGaps',
        sourceFiles: ['src/services/overpassCorridor.ts'],
        run: exportOverpassWaterGaps,
      },
      {
        file: 'planShare.golden.json',
        engine: 'planShare',
        sourceFiles: ['src/utils/planShare.ts'],
        run: exportPlanShare,
      },
      {
        file: 'rideReadiness.golden.json',
        engine: 'rideReadiness',
        sourceFiles: ['src/utils/rideReadiness.ts'],
        run: exportRideReadiness,
      },
      {
        file: 'solarVisibility.golden.json',
        engine: 'solarVisibility',
        sourceFiles: ['src/utils/solarVisibility.ts'],
        run: exportSolarVisibility,
      },
      {
        file: 'windInsights.golden.json',
        engine: 'windInsights',
        sourceFiles: ['src/utils/windInsights.ts'],
        run: exportWindInsights,
      },
      {
        file: 'stemSticker.golden.json',
        engine: 'stemSticker',
        sourceFiles: ['src/utils/stemSticker.ts'],
        run: exportStemSticker,
      },
      {
        file: 'stationaryRecovery.golden.json',
        engine: 'stationaryRecovery',
        sourceFiles: ['src/utils/stationaryRecovery.ts'],
        run: exportStationaryRecovery,
      },
      {
        file: 'weeklyWeatherSummary.golden.json',
        engine: 'weeklyWeatherSummary',
        sourceFiles: ['src/utils/weeklyWeatherSummary.ts'],
        run: exportWeeklyWeatherSummary,
      },
    ];

    for (const item of runners) {
      const cases = item.run();
      writeGoldenFixture(outDir, item.file, item.engine, item.sourceFiles, cases);
    }

    console.log(`Exported ${runners.length} deterministic golden fixture files to ${outDir}.`);
  });
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
