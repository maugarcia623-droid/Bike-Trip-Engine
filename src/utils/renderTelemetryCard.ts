/**
 * Native HTML5 Canvas 2D Peloton Flight Receipt Generator
 *
 * Strict implementation of Figma Ticket Mockup & DESIGN_SYSTEM.md Tokens:
 * 1. 1080x1920px (9:16 Instagram Story) Viewport with Safe-Zone Ticket Geometry:
 *    - Viewport background: --ds-canvas (#E5E3DD Warm Stone Grey).
 *    - Ticket card: x = 44, y = 240, w = 992, h = 1440, r = 64px, fill #FFFFFF.
 *    - Ticket Perforation (y = 890): Cutouts at cx = 44 and cx = 1036 (r = 34px) in #E5E3DD.
 *    - Dashed .lane-divider: x = 96 to 984 at y = 890 (strokeStyle = '#D5D3CD', lineWidth = 4, dash = [18, 16]).
 * 2. Top-Left Metric Chips (y = 320):
 *    - 3 pills (h = 48px, padX = 24px, gap = 14px) at x = 116 in #EBE9E3 with 22px bold #111111.
 * 3. Top-Right Serrated Passport Stamp (Clipped to Card):
 *    - cx = 875, cy = 385, tilted -15deg, stroke/fill = '#DCDBD6'.
 *    - Outer scalloped postage seal (r = 165px, 36 wave teeth, lineWidth = 2.5).
 *    - Two concentric inner rings (r = 146px and r = 96px, lineWidth = 2).
 *    - Circular curved text along r = 114px: '• Cadence - Nutrition - Weather / Aerodynamics '.
 *    - Geometric cyclist glyph centered in the seal.
 * 4. Centered Editorial Title & Date (y = 495 to 625):
 *    - Route title centered at x = 540 in 60px extrabold rounded #111111 (lineHeight 72px, max 2 lines).
 *    - Uppercase date string centered at x = 540 in 21px medium Inter #66645E (letterSpacing 0.04em).
 * 5. Top Route Trace — Real GPX Path & Yellow-Vest Badges (y = 660 to 840):
 *    - Real aspect-corrected GPX coordinates, auto-oriented left-to-right (width 710px, height 160px).
 *    - Subtle under-glow (10px rgba(163, 179, 0, 0.18)) + crisp main stroke (5px #94A814).
 *    - Yellow-Vest badges (r = 28px, fill #F2F455, stroke #94A814 2.5px):
 *      Left badge at (126, y clamped 700-790) with solid filled pennant flag icon.
 *      Right badge at (954, y clamped 700-790) with crisp filled play triangle.
 * 6. Enriched Middle Receipt Ledger (Eliminate Empty White Space, y = 935 to 1383):
 *    - 4 structured rows (h = 112px) with 2px solid #EBE9E3 horizontal dividers.
 *    - Row 1: WIND TAX + 'Aerodynamic drag surcharge' -> signed watts (+51 or 0) WATTS.
 *    - Row 2: CARB BURN + 'Hourly glycogen oxidation' -> value G/H.
 *    - Row 3: AIR DENSITY + 'Barometric air resistance (ρ)' -> value KG/M³.
 *    - Row 4: EFFORT ZONE + Coggan Zone pill badge directly below on left (h = 46px, r = 23px) -> value W.
 * 7. 3-Column Peloton Summary Pod (y = 1430 to 1626):
 *    - Recessed container: x = 92, y = 1430, w = 896, h = 196, r = 32px (#F4F3EF).
 *    - Two vertical 2px #E2E0D8 hairlines dividing into 3 equal columns:
 *      Col 1 (x = 136): 'MECHANICAL WORK' (18px), value kJ (46px), 'Total crank output' (18px).
 *      Col 2 (x = 425): 'HYDRATION PLAN' (18px), value 1x Bidon (46px), '~650 ml fluid target' (18px).
 *      Col 3 (x = 715): 'FUEL CLEARANCE' (18px), 'Cleared' (46px #3D9A00), 'Pre-flight verified' (18px).
 *
 * Zero external dependencies (no html2canvas). Pure browser Canvas 2D API.
 */

import {
  TripProfile,
  PhysicsCalculationResult,
  ElevationProfilePoint,
  PowerZoneCode,
  TelemetryCardMode,
  TelemetryShareData,
} from '../types/trip';
import { loadRiderBikeSpecs } from './specsStorage';

export type { TelemetryCardMode, TelemetryShareData };

export interface RenderTelemetryCardOptions {
  mode?: TelemetryCardMode;
  heroMetric?: 'work' | 'power';
  customTimestamp?: string;
  ftpWatts?: number;
  lang?: 'en' | 'fr';
}

// ─── Canvas & Ticket Safe-Zone Architecture (1080 x 1920 px, 9:16) ───
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

// Main Ticket Dimensions inside Instagram Safe-Zone
const TICKET_X = 44;
const TICKET_Y = 240;
const TICKET_WIDTH = 992;
const TICKET_HEIGHT = 1440;
const TICKET_RADIUS = 64; // rounded-card token

// Ticket Perforation (y = 890)
const NOTCH_Y = 890;
const NOTCH_RADIUS = 34;
const NOTCH_LEFT_CX = 44;
const NOTCH_RIGHT_CX = 1036;

// ─── Design System Color Tokens (DESIGN_SYSTEM.md) ───
const COLOR_CANVAS = '#E5E3DD'; // --ds-canvas (Warm Stone Grey)
const COLOR_CARD = '#FFFFFF'; // --ds-card (Crisp White)
const COLOR_POD = '#F4F3EF'; // --ds-pod (Warm White Recessed Pod)
const COLOR_CHIP = '#EBE9E3'; // --ds-chip (Muted Warm Pill)
const COLOR_INK = '#111111'; // --ds-ink (Deep Tarmac)
const COLOR_INK_SECONDARY = '#3D3C38'; // --ds-ink-secondary
const COLOR_INK_MUTED = '#66645E'; // --ds-ink-muted
const COLOR_UNIT = '#84848C'; // Ledger unit text color
const COLOR_LANE_DASH = '#D5D3CD'; // Perforation dashed line
const COLOR_RIBBON_GREEN = '#94A814'; // Elevation ribbon stroke
const COLOR_VOLT = '#F2F455'; // Volt highlight
const COLOR_STAMP = '#DCDBD6'; // Rotary seal stamp tint
const COLOR_BEACON_GREEN = '#3D9A00'; // Fuel clearance beacon green

// 4-Layer Token Matrix for Coggan Power Zones (DESIGN_SYSTEM.md Section 5)
interface ZoneToken {
  bg: string;
  ring: string;
  text: string;
  name: string;
}

const ZONE_TOKENS: Record<PowerZoneCode, ZoneToken> = {
  Z1: { bg: '#ECFDF5', ring: '#059669', text: '#047857', name: 'Z1 Recovery' },
  Z2: { bg: '#F7FEE7', ring: '#65A30D', text: '#4D7C0F', name: 'Z2 Endurance' },
  Z3: { bg: '#FFFBEB', ring: '#D97706', text: '#92400E', name: 'Z3 Tempo' },
  Z4: { bg: '#FFF7ED', ring: '#EA580C', text: '#C2410C', name: 'Z4 Threshold' },
  Z5: { bg: '#FFF1F2', ring: '#E11D48', text: '#BE123C', name: 'Z5 VO2 Max' },
};

const ZONE_LABELS_FR: Record<PowerZoneCode, string> = {
  Z1: 'Z1 Récupération',
  Z2: 'Z2 Endurance',
  Z3: 'Z3 Tempo',
  Z4: 'Z4 Seuil',
  Z5: 'Z5 VO2 Max',
};

// ─── Dual-Voice Typography (DESIGN_SYSTEM.md Section 6) ───
// The Rounded Voice for numbers, titles, and pills (strictly tabular numerals)
const FONT_ROUNDED =
  'ui-rounded, -apple-system-rounded, "SF Pro Rounded", "Nunito", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// The Body Voice for labels, row descriptions, and dates
const FONT_BODY =
  '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// Default Route Corridor (Paris / Seine Express Bastille -> La Défense)
const DEFAULT_ROUTE_COORDS: [number, number][] = [
  [48.8530, 2.3690],
  [48.8540, 2.3550],
  [48.8570, 2.3470],
  [48.8600, 2.3350],
  [48.8620, 2.3200],
  [48.8640, 2.3000],
  [48.8670, 2.2850],
  [48.8750, 2.2700],
  [48.8850, 2.2500],
  [48.8920, 2.2380],
];

interface NormalizedData {
  routeName: string;
  distanceKm: number;
  elevationM: number;
  avgPower: number;
  windTax: number;
  airDensity: number;
  carbBurn: number;
  totalKj: number;
  powerZone: PowerZoneCode;
  dateStr: string;
  coordinates: [number, number][];
}

/**
 * Resolves Coggan Power Zone from average watts and rider FTP
 */
function resolveCogganZone(watts: number, ftpWatts: number): PowerZoneCode {
  if (ftpWatts <= 0) return 'Z1';
  const pct = (watts / ftpWatts) * 100;
  if (pct < 55) return 'Z1';
  if (pct <= 75) return 'Z2';
  if (pct <= 90) return 'Z3';
  if (pct <= 105) return 'Z4';
  return 'Z5';
}

/**
 * Format date string into uppercase editorial format (e.g. "THURSDAY, NOVEMBER 3RD")
 */
function formatEditorialDate(
  rawDate?: string,
  customTimestamp?: string,
  lang: 'en' | 'fr' = 'en'
): string {
  if (customTimestamp) return customTimestamp.toUpperCase();
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  if (lang === 'fr') {
    const daysFr = [
      'DIMANCHE',
      'LUNDI',
      'MARDI',
      'MERCREDI',
      'JEUDI',
      'VENDREDI',
      'SAMEDI',
    ];
    const monthsFr = [
      'JANVIER',
      'FÉVRIER',
      'MARS',
      'AVRIL',
      'MAI',
      'JUIN',
      'JUILLET',
      'AOÛT',
      'SEPTEMBRE',
      'OCTOBRE',
      'NOVEMBRE',
      'DÉCEMBRE',
    ];
    return `${daysFr[validDate.getDay()]} ${validDate.getDate()} ${monthsFr[validDate.getMonth()]}`;
  }

  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  const dayOfWeek = days[validDate.getDay()];
  const monthName = months[validDate.getMonth()];
  const dayNum = validDate.getDate();

  const getOrdinal = (n: number) => {
    const s = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${dayOfWeek}, ${monthName} ${getOrdinal(dayNum)}`;
}

/**
 * Normalizes input coordinates into standard [lat, lon] tuples
 */
function normalizeCoordinates(
  raw?: [number, number][] | Array<{ lat: number; lon: number; ele?: number }>
): [number, number][] {
  if (!raw || !Array.isArray(raw) || raw.length < 2) {
    return DEFAULT_ROUTE_COORDS;
  }

  const result: [number, number][] = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2) {
      const lat = Number(item[0]);
      const lon = Number(item[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        result.push([lat, lon]);
      }
    } else if (item && typeof item === 'object' && 'lat' in item && 'lon' in item) {
      const lat = Number((item as any).lat);
      const lon = Number((item as any).lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        result.push([lat, lon]);
      }
    }
  }

  if (result.length < 2) return DEFAULT_ROUTE_COORDS;

  // Downsample very dense GPS recordings (>1200 points) to ~1000 points while keeping endpoints
  if (result.length > 1200) {
    const step = Math.ceil(result.length / 1000);
    const sampled: [number, number][] = [result[0]];
    for (let i = 1; i < result.length - 1; i += step) {
      sampled.push(result[i]);
    }
    sampled.push(result[result.length - 1]);
    return sampled;
  }

  return result;
}

/**
 * Normalizes telemetry input data
 */
function normalizeData(
  data: TelemetryShareData,
  options?: RenderTelemetryCardOptions
): NormalizedData {
  const routeName = (
    data.routeName ||
    data.name ||
    'Seine Express Cycleway\n(Bastille → La Défense)'
  ).trim();

  const rawDist = data.distanceKm ?? data.distance ?? 63.2;
  const distanceKm = typeof rawDist === 'number' ? rawDist : parseFloat(String(rawDist)) || 63.2;

  const rawElev = data.elevationGainM ?? data.elevationM ?? data.elevation ?? 411;
  const elevationM = typeof rawElev === 'number' ? rawElev : parseFloat(String(rawElev)) || 411;

  const rawPower = data.avgPowerWatts ?? data.averagePower ?? data.avgPower ?? 100;
  const avgPower = Math.max(0, Math.round(Number(rawPower) || 100));

  const rawWindTax = data.windTaxWatts ?? data.powerDeltaWatts ?? data.windTax ?? 0;
  const windTax = Math.round(Number(rawWindTax) || 0);

  const rawRho = data.airDensityRho ?? data.airDensity ?? data.rho ?? 1.23;
  const airDensity = Number(rawRho) || 1.23;

  const rawCarb = data.carbBurnGramsPerHour ?? data.carbBurnGPerHour ?? data.carbBurn ?? 0;
  const carbBurn = Math.max(0, Math.round(Number(rawCarb) || 0));

  const rawKj = data.totalWorkKj ?? data.totalKj ?? 935;
  const totalKj = Math.max(0, Math.round(Number(rawKj) || 935));

  const ftpWatts = options?.ftpWatts ?? data.ftpWatts ?? 210;
  const powerZone = data.powerZone ?? resolveCogganZone(avgPower, ftpWatts);

  const dateStr = formatEditorialDate(
    data.departureDate,
    options?.customTimestamp ?? data.timestamp,
    options?.lang ?? 'en'
  );

  const coordinates = normalizeCoordinates(data.coordinates);

  return {
    routeName,
    distanceKm: Number(distanceKm.toFixed(1)),
    elevationM: Math.round(elevationM),
    avgPower,
    windTax,
    airDensity: Number(airDensity.toFixed(2)),
    carbBurn,
    totalKj,
    powerZone,
    dateStr,
    coordinates,
  };
}

/**
 * Universal Canvas rounded-rect helper
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * 1. Canvas & Instagram Safe-Zone Ticket Geometry (DESIGN_SYSTEM.md Sections 2 & 3)
 */
function drawTicketGeometry(
  ctx: CanvasRenderingContext2D,
  mode: TelemetryCardMode
): void {
  ctx.save();

  // 1. Fill Viewport with Warm Stone Grey (#E5E3DD) in solid mode
  if (mode === 'transparent') {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.fillStyle = COLOR_CANVAS;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // 2. Draw Main White Ticket Card centered in Safe Zone (x=44, y=240, w=992, h=1440, r=64)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  drawRoundedRect(ctx, TICKET_X, TICKET_Y, TICKET_WIDTH, TICKET_HEIGHT, TICKET_RADIUS);
  ctx.fillStyle = COLOR_CARD;
  ctx.fill();
  ctx.restore();

  // 3. Ticket Perforation & Semicircular Cutouts (y = 890, r = 34px)
  if (mode === 'transparent') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(NOTCH_LEFT_CX, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(NOTCH_RIGHT_CX, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = COLOR_CANVAS;
    ctx.beginPath();
    ctx.arc(NOTCH_LEFT_CX, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(NOTCH_RIGHT_CX, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Horizontal Dashed .lane-divider (x = 96 to 984, strokeStyle = '#D5D3CD', lineWidth = 4, dash = [18, 16])
  ctx.save();
  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = COLOR_LANE_DASH;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(96, NOTCH_Y);
  ctx.lineTo(984, NOTCH_Y);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * 2. Top-Left Metric Chips (y = 320):
 * Starting at x = 116, 3 compact rounded-full pills (height = 48px, paddingX = 24px, gap = 14px)
 * filled with --ds-chip (#EBE9E3) and #111111 bold rounded text (22px).
 */
function drawTopMetricChips(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData
): void {
  ctx.save();

  const chipsY = 320;
  const chipHeight = 48;
  const chipRadius = chipHeight / 2;
  const gap = 14;

  const items = [
    `${data.distanceKm.toFixed(1)} km`,
    `+${Math.round(data.elevationM)} m`,
    `${Math.round(data.avgPower)} W`,
  ];

  ctx.font = `700 22px ${FONT_ROUNDED}`;
  let curX = 116;

  for (const label of items) {
    const textW = ctx.measureText(label).width;
    const chipW = textW + 48; // 24px padding on each side

    drawRoundedRect(ctx, curX, chipsY, chipW, chipHeight, chipRadius);
    ctx.fillStyle = COLOR_CHIP; // #EBE9E3
    ctx.fill();

    ctx.fillStyle = COLOR_INK; // #111111
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, curX + chipW / 2, chipsY + chipHeight / 2);

    curX += chipW + gap;
  }

  ctx.restore();
}

/**
 * 3. Top-Right Serrated Passport Stamp (Clipped to Card Boundary):
 * Centered at cx = 875, cy = 385 (tilted -15deg, stroke/fill = '#DCDBD6')
 */
function drawPassportStamp(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Clip to White Ticket Card boundary (x=44, y=240, w=992, h=1440, r=64)
  drawRoundedRect(ctx, TICKET_X, TICKET_Y, TICKET_WIDTH, TICKET_HEIGHT, TICKET_RADIUS);
  ctx.clip();

  // Translate to Stamp Center & Tilt -15deg
  const cx = 875;
  const cy = 385;
  ctx.translate(cx, cy);
  ctx.rotate((-15 * Math.PI) / 180);

  // 1. Outer Scalloped / Serrated Postage Seal (r = 165px, 36 wave teeth, lineWidth = 2.5)
  const outerR = 165;
  const teeth = 36;
  const toothDepth = 5.5;
  const angleStep = (Math.PI * 2) / teeth;

  ctx.strokeStyle = COLOR_STAMP;
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  for (let i = 0; i < teeth; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const am = (i + 0.5) * angleStep;

    const x1 = outerR * Math.cos(a1);
    const y1 = outerR * Math.sin(a1);
    const x2 = outerR * Math.cos(a2);
    const y2 = outerR * Math.sin(a2);

    const cpR = outerR + toothDepth;
    const cpX = cpR * Math.cos(am);
    const cpY = cpR * Math.sin(am);

    if (i === 0) ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cpX, cpY, x2, y2);
  }
  ctx.closePath();
  ctx.stroke();

  // 2. Two Concentric Inner Rings (r = 146px and r = 96px, lineWidth = 2)
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 146, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Curved Circular Text along r = 114px path (22px bold rounded)
  const textRadius = 120;
  const stampText = '• Cadence - Nutrition - Weather / Aerodynamics ';
  ctx.font = `800 20px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_STAMP;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = stampText.split('');
  let currentAngle = -Math.PI / 2 - 0.2;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charW = ctx.measureText(char).width;
    const charAngle = (charW / textRadius) * 1.04;
    const midAngle = currentAngle + charAngle / 2;

    ctx.save();
    ctx.rotate(midAngle);
    ctx.translate(0, -textRadius);
    ctx.fillText(char, 0, 0);
    ctx.restore();

    currentAngle += charAngle;
  }

  // 4. Center Minimal Geometric Cyclist Glyph (#DCDBD6)
  ctx.strokeStyle = COLOR_STAMP;
  ctx.fillStyle = COLOR_STAMP;
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Rear Wheel (r = 14px)
  ctx.beginPath();
  ctx.arc(-26, 18, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Front Wheel (r = 14px)
  ctx.beginPath();
  ctx.arc(32, 18, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom Bracket pin
  ctx.beginPath();
  ctx.arc(3, 18, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Frame Tubes
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.lineTo(3, 18); // Chainstay
  ctx.lineTo(-8, -4); // Seat tube
  ctx.lineTo(-26, 18); // Seatstay
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3, 18);
  ctx.lineTo(20, -4); // Down tube
  ctx.lineTo(-8, -4); // Top tube
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, -4);
  ctx.lineTo(32, 18); // Fork
  ctx.stroke();

  // Rider Head (r = 10px filled circle)
  ctx.beginPath();
  ctx.arc(26, -26, 9.5, 0, Math.PI * 2);
  ctx.fill();

  // Rider Torso, Arms & Legs
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(18, -16); // Back/torso
  ctx.lineTo(26, -5); // Arm to handlebar
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(8, 4); // Thigh
  ctx.lineTo(3, 18); // Shin to pedal
  ctx.stroke();

  ctx.restore();
}

/**
 * 4. Centered Editorial Title & Date (y = 495 to 625):
 * Centered horizontally at x = 540 in 60px extrabold (800) rounded #111111,
 * followed by uppercase date in 21px medium Inter #66645E.
 */
function drawTitleAndDate(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData
): number {
  ctx.save();

  const centerX = 540;
  const maxTitleW = 860;
  const lineHeight = 72;

  // Split title intelligently on explicit \n or wrap up to 2 lines
  let lines: string[] = [];
  if (data.routeName.includes('\n')) {
    lines = data.routeName.split('\n').filter(Boolean).slice(0, 2);
  } else {
    // If title has parentheses, break naturally before parentheses
    const parenIdx = data.routeName.indexOf('(');
    if (parenIdx > 0 && ctx.measureText(data.routeName).width > maxTitleW) {
      lines = [
        data.routeName.slice(0, parenIdx).trim(),
        data.routeName.slice(parenIdx).trim(),
      ];
    } else {
      // Standard word wrap
      const words = data.routeName.split(/\s+/).filter(Boolean);
      let curLine = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = `${curLine} ${words[i]}`;
        ctx.font = `800 60px ${FONT_ROUNDED}`;
        if (ctx.measureText(test).width <= maxTitleW) {
          curLine = test;
        } else {
          lines.push(curLine);
          curLine = words.slice(i).join(' ');
          break;
        }
      }
      if (curLine) lines.push(curLine);
    }
  }

  // Draw Title Lines centered at x = 540
  ctx.font = `800 60px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const startY = lines.length === 1 ? 520 : 495;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineHeight);
  }

  const titleBottomY = startY + lines.length * lineHeight;

  // Uppercase Date String (marginTop = 24px)
  const dateY = titleBottomY + 20;
  ctx.font = `500 21px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(data.dateStr, centerX, dateY);

  ctx.restore();
  return dateY + 28;
}

/**
 * 5. Top Route Trace — Render the REAL GPX Path (y = 660 to 840)
 *
 * Aspect-corrected (x = lon * Math.cos(avgLat), y = -lat), auto-oriented left-to-right,
 * scaled to fit inside slot (x = 185 to 895, y = 665 to 830).
 * Subtle under-glow (lineWidth = 10, strokeStyle = 'rgba(163, 179, 0, 0.18)') + crisp main stroke (lineWidth = 5, strokeStyle = '#94A814').
 * Yellow-Vest Badges at (126, firstPoint.y clamped 700-790) with filled pennant flag and (954, lastPoint.y clamped 700-790) with play triangle.
 */
function drawTopRouteTrace(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData
): void {
  ctx.save();

  const coords = data.coordinates;
  if (!coords || coords.length < 2) {
    ctx.restore();
    return;
  }

  // 1. Compute aspect correction factor (cosLat)
  let sumLat = 0;
  for (const [lat] of coords) sumLat += lat;
  const avgLat = sumLat / coords.length;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);

  // 2. Project to 2D Cartesian plane
  const pts = coords.map(([lat, lon]) => ({
    x: lon * cosLat,
    y: -lat,
  }));

  // 3. Horizontal Auto-Orientation:
  // Rotate point cloud so start-to-end vector runs left-to-right
  const p0 = pts[0];
  const pLast = pts[pts.length - 1];
  const dx = pLast.x - p0.x;
  const dy = pLast.y - p0.y;
  const distStartEnd = Math.hypot(dx, dy);

  let rotAngle = 0;
  if (distStartEnd > 1e-5) {
    rotAngle = -Math.atan2(dy, dx);
  } else {
    // Closed loop route: inspect bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (maxY - minY > maxX - minX) {
      rotAngle = -Math.PI / 2; // Rotate 90 degrees if taller than wide
    }
  }

  const cosRot = Math.cos(rotAngle);
  const sinRot = Math.sin(rotAngle);
  let rotated = pts.map((p) => ({
    x: p.x * cosRot - p.y * sinRot,
    y: p.x * sinRot + p.y * cosRot,
  }));

  // Ensure start is on left and end is on right
  if (rotated[rotated.length - 1].x < rotated[0].x) {
    rotated = rotated.map((p) => ({
      x: -p.x,
      y: p.y,
    }));
  }

  // 4. Fit into target slot (x = 185 to 895, y = 665 to 830)
  let minRx = Infinity, maxRx = -Infinity, minRy = Infinity, maxRy = -Infinity;
  for (const p of rotated) {
    if (p.x < minRx) minRx = p.x;
    if (p.x > maxRx) maxRx = p.x;
    if (p.y < minRy) minRy = p.y;
    if (p.y > maxRy) maxRy = p.y;
  }
  const spanRx = Math.max(1e-6, maxRx - minRx);
  const spanRy = Math.max(1e-6, maxRy - minRy);

  const slotX = 185;
  const slotY = 665;
  const slotW = 710; // 895 - 185 = 710
  const slotH = 160; // 825 / 830 - 665 = 160

  const scale = Math.min(slotW / spanRx, slotH / spanRy);
  const drawW = spanRx * scale;
  const drawH = spanRy * scale;

  const offX = slotX + (slotW - drawW) / 2;
  const offY = slotY + (slotH - drawH) / 2;

  const screenPts = rotated.map((p) => ({
    x: offX + (p.x - minRx) * scale,
    y: offY + (p.y - minRy) * scale,
  }));

  const firstPt = screenPts[0];
  const lastPt = screenPts[screenPts.length - 1];

  // 5. Connect Endpoints to Badges
  // Left Yellow-Vest badge anchored near x = 126, y = firstPt.y (clamped between 700 and 790)
  const badgeLeftX = 126;
  const badgeLeftY = Math.max(700, Math.min(790, firstPt.y));

  // Right Yellow-Vest badge anchored at x = 954, y = lastPt.y (clamped between 700 and 790)
  const badgeRightX = 954;
  const badgeRightY = Math.max(700, Math.min(790, lastPt.y));

  // 6. Under-Glow Stroke (lineWidth = 10, strokeStyle = 'rgba(163, 179, 0, 0.18)')
  ctx.save();
  ctx.strokeStyle = 'rgba(163, 179, 0, 0.18)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(badgeLeftX, badgeLeftY);
  ctx.lineTo(firstPt.x, firstPt.y);
  for (let i = 1; i < screenPts.length; i++) {
    ctx.lineTo(screenPts[i].x, screenPts[i].y);
  }
  ctx.lineTo(badgeRightX, badgeRightY);
  ctx.stroke();
  ctx.restore();

  // 7. Main GPX Line (lineWidth = 5, strokeStyle = '#94A814', lineJoin = 'round', lineCap = 'round')
  ctx.save();
  ctx.strokeStyle = COLOR_RIBBON_GREEN; // #94A814
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(badgeLeftX, badgeLeftY);
  ctx.lineTo(firstPt.x, firstPt.y);
  for (let i = 1; i < screenPts.length; i++) {
    ctx.lineTo(screenPts[i].x, screenPts[i].y);
  }
  ctx.lineTo(badgeRightX, badgeRightY);
  ctx.stroke();
  ctx.restore();

  // 8. Badges (r = 28px, fill #F2F455, 2.5px stroke #94A814)
  const badgeR = 28;

  // ── Left Badge (Start Flag) ──
  ctx.beginPath();
  ctx.arc(badgeLeftX, badgeLeftY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_VOLT; // #F2F455
  ctx.fill();
  ctx.strokeStyle = COLOR_RIBBON_GREEN; // #94A814
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Filled Pennant Flag (vertical pole 2.5px wide + solid pennant flag—NOT a bent line)
  const poleX = badgeLeftX - 6;
  const poleTopY = badgeLeftY - 11;
  const poleBottomY = badgeLeftY + 12;

  // Flagpole
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(poleX, poleTopY);
  ctx.lineTo(poleX, poleBottomY);
  ctx.stroke();

  // Finial knob on top of pole
  ctx.fillStyle = COLOR_INK;
  ctx.beginPath();
  ctx.arc(poleX, poleTopY, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Solid triangular pennant flag extending rightward from pole
  const flagTopY = poleTopY + 1;
  const flagBottomY = poleTopY + 13;
  const flagTipX = badgeLeftX + 9;
  const flagTipY = (flagTopY + flagBottomY) / 2;

  ctx.beginPath();
  ctx.moveTo(poleX, flagTopY);
  ctx.lineTo(flagTipX, flagTipY);
  ctx.lineTo(poleX, flagBottomY);
  ctx.closePath();
  ctx.fillStyle = COLOR_INK;
  ctx.fill();

  // ── Right Badge (Finish Play Triangle) ──
  ctx.beginPath();
  ctx.arc(badgeRightX, badgeRightY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_VOLT; // #F2F455
  ctx.fill();
  ctx.strokeStyle = COLOR_RIBBON_GREEN; // #94A814
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Crisp filled play triangle
  ctx.fillStyle = COLOR_INK;
  ctx.beginPath();
  ctx.moveTo(badgeRightX - 5, badgeRightY - 9);
  ctx.lineTo(badgeRightX + 9, badgeRightY);
  ctx.lineTo(badgeRightX - 5, badgeRightY + 9);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * 6. Enriched Middle Receipt Ledger (Eliminate Empty White Space, y = 935 to 1383):
 * 4 structured receipt rows (rowHeight = 112px, starting at y = 935, paddingX = 100px).
 * 2px solid #EBE9E3 horizontal divider line at bottom of rows 1, 2, and 3 (x = 100 to 980).
 * Row 1 (WIND TAX): 'WIND TAX' (22px bold #111111), 'Aerodynamic drag surcharge' (19px medium #84848C), signed watts (68px #111111), 'WATTS' (22px #84848C).
 * Row 2 (CARB BURN): 'CARB BURN', 'Hourly glycogen oxidation', value (68px), 'G/H'.
 * Row 3 (AIR DENSITY): 'AIR DENSITY', 'Barometric air resistance (ρ)', value (68px), 'KG/M³'.
 * Row 4 (EFFORT ZONE): 'EFFORT ZONE', Coggan Zone pill badge directly below on left (x = 100, h = 46px, r = 23px), value (68px), 'W'.
 */
function drawPhysicsLedger(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData,
  lang: 'en' | 'fr' = 'en'
): void {
  ctx.save();
  const isFr = lang === 'fr';

  const startY = 935;
  const rowHeight = 112;

  // Signed Wind Impact formatting
  const windTaxVal = Math.round(data.windTax);
  const windTaxStr = windTaxVal > 0 ? `+${windTaxVal}` : `${windTaxVal}`;

  const rows = [
    {
      title: isFr ? 'EFFET DU VENT' : 'WIND IMPACT',
      caption: isFr ? 'Résistance aérodynamique du vent' : 'Aero wind resistance',
      value: windTaxStr,
      unit: 'WATTS',
    },
    {
      title: isFr ? 'GLUCIDES' : 'CARB BURN',
      caption: isFr ? 'Dépense horaire estimée' : 'Hourly carb energy',
      value: String(Math.round(data.carbBurn)),
      unit: 'G/H',
    },
    {
      title: isFr ? 'DENSITÉ DE L’AIR' : 'AIR DENSITY',
      caption: isFr ? 'Densité atmosphérique locale (ρ)' : 'Local air density (ρ)',
      value: data.airDensity.toFixed(2),
      unit: 'KG/M³',
    },
    {
      title: isFr ? 'ZONE D’EFFORT' : 'EFFORT ZONE',
      caption: '', // Custom Coggan pill badge rendered below title
      value: `${Math.round(data.avgPower)}`,
      unit: 'W',
    },
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowY = startY + i * rowHeight;
    const baselineY = rowY + 74;

    // 1. Left Title: 22px bold Inter #111111
    ctx.font = `700 22px ${FONT_BODY}`;
    ctx.fillStyle = COLOR_INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (i < 3) {
      // Rows 1, 2, 3: Title + Sub-caption (28px below)
      ctx.fillText(row.title, 100, rowY + 44);

      ctx.font = `500 19px ${FONT_BODY}`;
      ctx.fillStyle = '#84848C';
      ctx.fillText(row.caption, 100, rowY + 72);
    } else {
      // Row 4: Title + Coggan Zone Pill Badge directly below on the left (x = 100)
      ctx.fillText(row.title, 100, rowY + 34);

      const zoneToken = ZONE_TOKENS[data.powerZone] || ZONE_TOKENS.Z1;
      const zoneLabel = isFr
        ? ZONE_LABELS_FR[data.powerZone] || ZONE_LABELS_FR.Z1
        : zoneToken.name;
      const pillX = 100;
      const pillY = rowY + 46;
      const pillHeight = 46;
      const pillRadius = 23;

      ctx.font = `700 24px ${FONT_ROUNDED}`;
      const zoneTextW = ctx.measureText(zoneLabel).width;
      const pillW = zoneTextW + 36; // 18px padding on each side

      drawRoundedRect(ctx, pillX, pillY, pillW, pillHeight, pillRadius);
      ctx.fillStyle = zoneToken.bg;
      ctx.fill();

      ctx.strokeStyle = zoneToken.ring;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = zoneToken.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zoneLabel, pillX + pillW / 2, pillY + pillHeight / 2);
    }

    // 2. Right Big Number at x = 855 (right-aligned, 68px extrabold rounded #111111)
    ctx.font = `800 68px ${FONT_ROUNDED}`;
    ctx.fillStyle = COLOR_INK;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(row.value, 855, baselineY);

    // 3. Right Unit at x = 875 (left-aligned, 22px semibold Inter #84848C)
    ctx.font = `600 22px ${FONT_BODY}`;
    ctx.fillStyle = '#84848C';
    ctx.textAlign = 'left';
    ctx.fillText(row.unit, 875, baselineY - 4);

    // 4. Horizontal Divider Line at bottom of rows 1, 2, and 3 (2px solid #EBE9E3, x = 100 to 980)
    if (i < 3) {
      ctx.save();
      ctx.strokeStyle = '#EBE9E3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, rowY + 112);
      ctx.lineTo(980, rowY + 112);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * 7. 3-Column Peloton Summary Pod (y = 1430 to 1626):
 * Recessed container (x = 92, y = 1430, w = 896, h = 196, r = 32px, fill = #F4F3EF).
 * Two vertical 2px #E2E0D8 hairlines dividing into 3 equal columns (y = 1466 to 1590):
 * Column 1 (x = 136): 'MECHANICAL WORK' (18px #66645E), '446 kJ' (46px #111111), 'Total crank output' (18px #84848C).
 * Column 2 (x = 425): 'HYDRATION PLAN' (18px #66645E), '1x Bidon' (46px #111111), '~650 ml fluid target' (18px #84848C).
 * Column 3 (x = 715): 'FUEL CLEARANCE' (18px #66645E), 'Cleared' (46px #3D9A00 Beacon Green), 'Pre-flight verified' (18px #84848C).
 */
function drawBottomFooterPod(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData,
  lang: 'en' | 'fr' = 'en'
): void {
  ctx.save();
  const isFr = lang === 'fr';

  const podX = 92;
  const podY = 1430;
  const podW = 896;
  const podH = 196;
  const podR = 32;

  // 1. Recessed Container in --ds-pod (#F4F3EF)
  drawRoundedRect(ctx, podX, podY, podW, podH, podR);
  ctx.fillStyle = COLOR_POD;
  ctx.fill();

  // 2. Two Vertical 2px #E2E0D8 Hairlines (y = 1466 to 1590)
  const dividerY1 = 1466;
  const dividerY2 = 1590;
  const colDivider1X = 391;
  const colDivider2X = 689;

  ctx.strokeStyle = '#E2E0D8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(colDivider1X, dividerY1);
  ctx.lineTo(colDivider1X, dividerY2);
  ctx.moveTo(colDivider2X, dividerY1);
  ctx.lineTo(colDivider2X, dividerY2);
  ctx.stroke();

  // 3. Column Data
  const bidons = Math.max(1, Math.round(data.distanceKm / 35));
  const bidonDisplay = isFr
    ? `${bidons}× Bidon${bidons > 1 ? 's' : ''}`
    : `${bidons}× Bottle${bidons > 1 ? 's' : ''}`;
  const totalKjDisplay = `${Math.round(data.totalKj)} kJ`;

  const columns = [
    {
      x: 136,
      label: isFr ? 'TRAVAIL TOTAL' : 'TOTAL WORK',
      value: totalKjDisplay,
      subLabel: isFr ? 'Énergie dépensée' : 'Energy spent',
      valueColor: COLOR_INK,
    },
    {
      x: 425,
      label: isFr ? 'HYDRATATION' : 'HYDRATION',
      value: bidonDisplay,
      subLabel: isFr
        ? `~${(data as any).bottleVolumeMl || 650} ml par bidon`
        : `~${(data as any).bottleVolumeMl || 650} ml / bottle`,
      valueColor: COLOR_INK,
    },
    {
      x: 715,
      label: isFr ? 'RAVITAILLEMENT' : 'FUELING',
      value: isFr ? 'Prêt' : 'Ready',
      subLabel: isFr ? 'Plan vérifié' : 'Plan ready',
      valueColor: COLOR_BEACON_GREEN, // #3D9A00
    },
  ];

  ctx.textBaseline = 'alphabetic';

  for (const col of columns) {
    // Label: 18px semibold #66645E
    ctx.font = `600 18px ${FONT_BODY}`;
    ctx.fillStyle = COLOR_INK_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(col.label, col.x, podY + 50);

    // Value: 46px extrabold .font-rounded
    ctx.font = `800 46px ${FONT_ROUNDED}`;
    ctx.fillStyle = col.valueColor;
    ctx.fillText(col.value, col.x, podY + 110);

    // Sub-label: 18px #84848C
    ctx.font = `500 18px ${FONT_BODY}`;
    ctx.fillStyle = '#84848C';
    ctx.fillText(col.subLabel, col.x, podY + 148);
  }

  ctx.restore();
}

/**
 * Ensure web fonts are completely loaded before rasterizing canvas
 */
async function ensureFontsReady(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Gracefully continue
    }
  }
}

/**
 * Internal Canvas Renderer: Paints the 1080x1920px (9:16) Exact Figma Ticket Mockup
 */
export async function renderTelemetryCardToCanvas(
  data: TelemetryShareData,
  modeOrOptions: TelemetryCardMode | RenderTelemetryCardOptions = 'solid'
): Promise<HTMLCanvasElement> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error(
      'renderTelemetryCard requires a browser environment with HTML5 2D Canvas support.'
    );
  }

  const options: RenderTelemetryCardOptions =
    typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions || {};
  const mode: TelemetryCardMode = options.mode === 'transparent' ? 'transparent' : 'solid';

  await ensureFontsReady();

  // Create 1080x1920px (9:16 Instagram Story) Canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Unable to acquire HTML5 2D Canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const normalized = normalizeData(data, options);

  // 1. Canvas & Ticket Geometry (Warm Stone Grey canvas, white card, cutouts, dashed line)
  drawTicketGeometry(ctx, mode);

  // 2. Top-Left Metric Chips (63.2 km, +411 m, 100 W)
  drawTopMetricChips(ctx, normalized);

  // 3. Top-Right Serrated Passport Stamp (Clipped to card)
  drawPassportStamp(ctx);

  // 4. Centered Editorial Title & Uppercase Date
  drawTitleAndDate(ctx, normalized);

  // 5. Top Route Trace — Real GPX Path & Yellow-Vest Badges (y = 660 to 840)
  drawTopRouteTrace(ctx, normalized);

  const lang = options.lang ?? 'en';

  // 6. Enriched Middle Receipt Ledger (Eliminate empty white space, y = 935 to 1383)
  drawPhysicsLedger(ctx, normalized, lang);

  // 7. 3-Column Peloton Summary Pod (y = 1430 to 1626)
  drawBottomFooterPod(ctx, normalized, lang);

  return canvas;
}

/**
 * Primary export: Renders 1080x1920px (9:16) PNG Blob using native HTML5 2D Canvas API.
 */
export async function renderTelemetryCard(
  data: TelemetryShareData,
  modeOrOptions: TelemetryCardMode | RenderTelemetryCardOptions = 'solid'
): Promise<Blob> {
  const canvas = await renderTelemetryCardToCanvas(data, modeOrOptions);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode Canvas into PNG Blob.'));
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Helper to generate a data URL (image/png) for quick preview or testing
 */
export async function renderTelemetryCardToDataUrl(
  data: TelemetryShareData,
  modeOrOptions: TelemetryCardMode | RenderTelemetryCardOptions = 'solid'
): Promise<string> {
  const canvas = await renderTelemetryCardToCanvas(data, modeOrOptions);
  return canvas.toDataURL('image/png');
}

/**
 * Helper to trigger immediate browser file download of the card
 */
export async function downloadTelemetryCard(
  data: TelemetryShareData,
  modeOrOptions: TelemetryCardMode | RenderTelemetryCardOptions = 'solid',
  fileName = 'cadence-telemetry.png'
): Promise<void> {
  const blob = await renderTelemetryCard(data, modeOrOptions);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Utility helper to extract TelemetryShareData cleanly from an active TripProfile and PhysicsCalculationResult
 */
export function extractTelemetryShareData(
  trip: Partial<TripProfile>,
  physicsResult?: Partial<PhysicsCalculationResult>
): TelemetryShareData & { bottleVolumeMl?: number } {
  const dist = trip.route?.distanceKm;
  const elev = trip.route?.elevationGainM;
  const rho = trip.weather?.airDensityRho ?? trip.physics?.rho ?? 1.23;
  const specs = loadRiderBikeSpecs();
  const bottleVolumeMl = specs.bidonSizeMl || 650;
  const lockedCarb =
    specs.carbPacingMode === 'locked' && specs.carbTargetGPerHr
      ? specs.carbTargetGPerHr
      : undefined;

  return {
    routeName: trip.name || 'Seine Express Cycleway\n(Bastille → La Défense)',
    distanceKm: typeof dist === 'number' ? Number(dist.toFixed(1)) : 63.2,
    elevationGainM: typeof elev === 'number' ? Math.round(elev) : 411,
    avgPowerWatts:
      typeof physicsResult?.legWatts === 'number'
        ? Math.round(physicsResult.legWatts)
        : 100,
    windTaxWatts:
      typeof physicsResult?.powerDeltaWatts === 'number'
        ? Math.round(physicsResult.powerDeltaWatts)
        : 0,
    airDensityRho: typeof rho === 'number' ? Number(rho.toFixed(2)) : 1.23,
    carbBurnGramsPerHour:
      lockedCarb !== undefined
        ? Math.round(lockedCarb)
        : typeof physicsResult?.carbOxidationGramPerHour === 'number'
          ? Math.round(physicsResult.carbOxidationGramPerHour)
          : 0,
    totalWorkKj:
      typeof physicsResult?.totalWorkKj === 'number'
        ? Math.round(physicsResult.totalWorkKj)
        : 935,
    ftpWatts: physicsResult?.ftpWatts ?? specs.ftpWatts ?? 210,
    powerZone: physicsResult?.powerZone,
    departureDate: trip.departureDate,
    coordinates: trip.route?.coordinates,
    elevationProfile: trip.route?.elevationProfile,
    movingTimeFormatted: physicsResult?.movingTimeFormatted,
    avgSpeedKmH: physicsResult?.effectiveSpeedKmH ?? trip.route?.targetSpeedKmH,
    bottleVolumeMl,
  };
}
