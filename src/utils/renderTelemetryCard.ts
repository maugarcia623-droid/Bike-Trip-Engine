/**
 * Native HTML5 Canvas 2D Peloton Flight Receipt Generator
 *
 * Tactile Peloton Flight Receipt inspired by Uber's split receipt,
 * Strava's typographic grid, and the Flight Deck Design System (DESIGN_SYSTEM.md):
 *
 * 1. Surface & Concentric Ticket Geometry:
 *    - 1080x1920px (9:16 Story format).
 *    - Viewport background: Light Mode --ds-canvas (#E5E3DD Warm Stone Grey).
 *    - Main ticket card: --ds-card (#FFFFFF Crisp White) with rounded-card (64px radius at 2x scale).
 *    - Two semicircular ticket-punch cutouts (r=24px filled with #E5E3DD) at y=1080.
 *    - Horizontal dashed .lane-divider (6px dash, 6px gap in #DBD8D1) splitting Upper & Lower halves.
 * 2. Typography:
 *    - Strictly dual-voice: Rounded Voice ("SF Pro Rounded", "Nunito", "Inter") for numbers,
 *      titles, and pills (with tabular numerals); Body Voice ("Inter", -apple-system) for labels.
 *    - Zero monospace terminal fonts.
 * 3. Top Header Cap & Multi-Line Route Title:
 *    - Solid #111111 top banner (h=120px) with Volt (#F2F455) brand mark + 'FlightDeck' & ride date.
 *    - Route Title in 64px extrabold rounded #111111 with word-wrapping (max 2 lines, no '...').
 *    - 3 compact pills (bg-chip #EBE9E3, text-ink #111111) for Distance, Elevation, Avg Power.
 * 4. Uber-Style Total & Itemized Physics Ledger:
 *    - Hero invoice row: Left 'Total Work' in 44px bold with Volt badge, right 88px value ('787 kJ').
 *    - 2x2 Strava-style typographic grid of 4 recessed pods (bg-pod #F4F3EF, rounded-pod 32px):
 *      Wind Tax (Watts), Carb Burn (g/h), Air Density (kg/m³), Effort Zone (4-layer palette matrix).
 * 5. Bottom Half: Uber Timeline Spine + Clean Route Pod:
 *    - Left: Vertical dashed road spine (.lane-spine 2px wide, 7px dash) with 3 waypoint nodes
 *      (Green start dot, Amber peak elevation dot, Ink finish square) and muted captions.
 *    - Right: Recessed route pod (w=516px, h=620px) with aspect-corrected GPX polyline (6px tarmac
 *      with 14px Volt highlight underlay) and bottom architectural elevation profile (#EBE9E3 fill,
 *      3px #66645E stroke — zero neon green).
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

export type { TelemetryCardMode, TelemetryShareData };


export interface RenderTelemetryCardOptions {
  mode?: TelemetryCardMode;
  heroMetric?: 'work' | 'power';
  customTimestamp?: string;
  ftpWatts?: number;
}

// ─── Canvas Dimensions & Geometric Grid (1080 x 1920 px, 9:16) ───
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

// Card Geometry (Outer margins: 48px X, 64px Y)
const CARD_X = 48;
const CARD_Y = 64;
const CARD_WIDTH = 984; // 1080 - 48 * 2
const CARD_HEIGHT = 1792; // 1920 - 64 * 2
const CARD_RADIUS = 64; // rounded-card (32px * 2 for retina canvas)

// Split Notch Position (Uber Receipt Ticket Cutouts)
const NOTCH_Y = 1080;
const NOTCH_RADIUS = 24;

// Content Inset (48px inside card edges)
const CONTENT_X = CARD_X + 48; // 96px
const CONTENT_WIDTH = CARD_WIDTH - 96; // 888px
const CONTENT_RIGHT = CONTENT_X + CONTENT_WIDTH; // 984px

// ─── Design System Tokens (DESIGN_SYSTEM.md Sections 2, 3, 4, 5) ───
const COLOR_CANVAS = '#E5E3DD'; // Light Mode --ds-canvas (Warm Stone Grey)
const COLOR_WELL = '#DBD8D1'; // --ds-well (Divider / spine dashes)
const COLOR_CARD = '#FFFFFF'; // --ds-card (Crisp White)
const COLOR_POD = '#F4F3EF'; // --ds-pod (Warm White Recessed Pod)
const COLOR_CHIP = '#EBE9E3'; // --ds-chip (Muted Warm Pill)
const COLOR_INK = '#111111'; // --ds-ink (Primary Deep Tarmac)
const COLOR_INK_SECONDARY = '#3D3C38'; // --ds-ink-secondary
const COLOR_INK_MUTED = '#66645E'; // --ds-ink-muted
const COLOR_VOLT = '#F2F455'; // Signature Volt Brand Highlight
const COLOR_HEADER_BANNER = '#111111'; // Top Cap Solid Banner
const COLOR_HEADER_DATE = '#A8A8AE'; // Header Date Muted Text

// 4-Layer Palette Matrix for Effort Zones (DESIGN_SYSTEM.md Section 5)
interface ZonePalette {
  bg: string;
  text: string;
  ring: string;
  name: string;
}

const ZONE_PALETTES: Record<PowerZoneCode, ZonePalette> = {
  Z1: { bg: '#ECFDF5', text: '#047857', ring: '#10B981', name: 'Z1 Recovery' },
  Z2: { bg: '#F7FEE7', text: '#4D7C0F', ring: '#84CC16', name: 'Z2 Endurance' },
  Z3: { bg: '#FFFBEB', text: '#92400E', ring: '#F59E0B', name: 'Z3 Tempo' },
  Z4: { bg: '#FFF7ED', text: '#C2410C', ring: '#F97316', name: 'Z4 Threshold' },
  Z5: { bg: '#FFF1F2', text: '#BE123C', ring: '#F43F5E', name: 'Z5 VO2 Max' },
};

// ─── Dual-Voice Typography Stacks (DESIGN_SYSTEM.md Section 6) ───
// The Rounded Voice for numbers, titles, and pills (with tabular numerals)
const FONT_ROUNDED =
  'ui-rounded, -apple-system-rounded, "SF Pro Rounded", "Nunito", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// The Body Voice for labels, captions, and secondary details
const FONT_BODY =
  '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// Fallback Route Coordinates (Guérande / Brière Gravel Loop)
const DEFAULT_ROUTE_COORDS: [number, number][] = [
  [47.3275, -2.4285],
  [47.3420, -2.3950],
  [47.3680, -2.3500],
  [47.3850, -2.2800],
  [47.3910, -2.2150],
  [47.3700, -2.1800],
  [47.3450, -2.2200],
  [47.3200, -2.3100],
  [47.3275, -2.4285],
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
  heroMetric: 'work' | 'power';
  dateStr: string;
  coordinates: [number, number][];
  elevationPoints: Array<{ distKm: number; eleM: number }>;
  minEleM: number;
  maxEleM: number;
}

/**
 * Resolves Coggan Power Zone from average watts and rider FTP
 */
function resolveCogganZone(watts: number, ftpWatts: number): PowerZoneCode {
  if (ftpWatts <= 0) return 'Z2';
  const pct = (watts / ftpWatts) * 100;
  if (pct < 55) return 'Z1';
  if (pct <= 75) return 'Z2';
  if (pct <= 90) return 'Z3';
  if (pct <= 105) return 'Z4';
  return 'Z5';
}

/**
 * Format date string (e.g. "02 NOV 2026")
 */
function formatDateSwiss(rawDate?: string, customTimestamp?: string): string {
  if (customTimestamp) return customTimestamp.toUpperCase();
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const day = String(validDate.getDate()).padStart(2, '0');
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const month = monthNames[validDate.getMonth()];
  const year = validDate.getFullYear();

  return `${day} ${month} ${year}`;
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

  return result.length >= 2 ? result : DEFAULT_ROUTE_COORDS;
}

/**
 * Normalizes elevation profile data
 */
function normalizeElevationProfile(
  rawProfile: any,
  distanceKm: number,
  elevationM: number
): Array<{ distKm: number; eleM: number }> {
  if (Array.isArray(rawProfile) && rawProfile.length >= 2) {
    return rawProfile.map((p: any) => ({
      distKm: Number(p.distKm ?? 0),
      eleM: Number(p.eleM ?? 0),
    }));
  }

  const baseM = 48;
  const peakM = baseM + Math.max(20, elevationM);
  const segments = 28;

  const heights = [
    0.05, 0.10, 0.18, 0.32, 0.45, 0.60, 0.78, 0.92, 1.00, 0.88, 0.70, 0.58,
    0.62, 0.75, 0.84, 0.65, 0.48, 0.38, 0.42, 0.35, 0.28, 0.22, 0.16, 0.10,
    0.08, 0.06, 0.04, 0.02,
  ];

  return heights.map((h, i) => ({
    distKm: Number(((i / (segments - 1)) * distanceKm).toFixed(1)),
    eleM: Math.round(baseM + h * (peakM - baseM)),
  }));
}

/**
 * Normalizes loose telemetry input data into strict rounded values
 */
function normalizeData(
  data: TelemetryShareData,
  options?: RenderTelemetryCardOptions
): NormalizedData {
  const routeName = (
    data.routeName ||
    data.name ||
    'Brière Gravel Tempo (Guérande)'
  ).trim();

  const rawDist = data.distanceKm ?? data.distance ?? 0;
  const distanceKm = typeof rawDist === 'number' ? rawDist : parseFloat(String(rawDist)) || 0;

  const rawElev = data.elevationGainM ?? data.elevationM ?? data.elevation ?? 0;
  const elevationM = typeof rawElev === 'number' ? rawElev : parseFloat(String(rawElev)) || 0;

  const rawPower = data.avgPowerWatts ?? data.averagePower ?? data.avgPower ?? 0;
  const avgPower = Math.max(0, Math.round(Number(rawPower) || 0));

  const rawWindTax = data.windTaxWatts ?? data.powerDeltaWatts ?? data.windTax ?? 0;
  const windTax = Math.round(Number(rawWindTax) || 0);

  const rawRho = data.airDensityRho ?? data.airDensity ?? data.rho ?? 1.225;
  const airDensity = Number(rawRho) || 1.225;

  const rawCarb = data.carbBurnGramsPerHour ?? data.carbBurnGPerHour ?? data.carbBurn ?? 0;
  const carbBurn = Math.max(0, Math.round(Number(rawCarb) || 0));

  const rawKj = data.totalWorkKj ?? data.totalKj ?? 0;
  const totalKj = Math.max(0, Math.round(Number(rawKj) || 0));

  const ftpWatts = options?.ftpWatts ?? data.ftpWatts ?? 210;
  const powerZone = data.powerZone ?? resolveCogganZone(avgPower, ftpWatts);

  const heroMetric = options?.heroMetric ?? data.heroMetric ?? (totalKj > 0 ? 'work' : 'power');
  const dateStr = formatDateSwiss(data.departureDate, options?.customTimestamp ?? data.timestamp);

  const coordinates = normalizeCoordinates(data.coordinates);
  const elevationPoints = normalizeElevationProfile(data.elevationProfile, distanceKm, elevationM);

  const eleValues = elevationPoints.map((p) => p.eleM);
  const minEleM = Math.min(...eleValues);
  const maxEleM = Math.max(...eleValues);

  return {
    routeName,
    distanceKm: Number(distanceKm.toFixed(1)),
    elevationM: Math.round(elevationM),
    avgPower,
    windTax,
    airDensity: Number(airDensity.toFixed(3)),
    carbBurn,
    totalKj,
    powerZone,
    heroMetric,
    dateStr,
    coordinates,
    elevationPoints,
    minEleM,
    maxEleM,
  };
}

/**
 * Universal Canvas rounded-rect helper supporting uniform or 4-corner radii [tl, tr, br, bl]
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | [number, number, number, number]
): void {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radii);
  } else {
    const [tl, tr, br, bl] = Array.isArray(radii)
      ? radii
      : [radii, radii, radii, radii];
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}

/**
 * Multi-line clean word wrapper: splits into words, wraps up to maxLines without ever truncating with '...'
 */
function wrapTitleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      if (lines.length >= maxLines - 1) {
        // Collect all remaining words into the last allowed line
        currentLine = words.slice(i).join(' ');
        break;
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, maxLines);
}

/**
 * Draw official FlightDeck Twin Sprocket Chain Emblem in signature Volt (#F2F455)
 */
function drawFlightDeckVoltLogo(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = COLOR_VOLT;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';

  // Left sprocket circle
  ctx.beginPath();
  ctx.arc(10, 14, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Right sprocket circle
  ctx.beginPath();
  ctx.arc(32, 14, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Top connecting chain link
  ctx.beginPath();
  ctx.moveTo(14, 7);
  ctx.lineTo(28, 7);
  ctx.stroke();

  // Bottom connecting chain link
  ctx.beginPath();
  ctx.moveTo(14, 21);
  ctx.lineTo(28, 21);
  ctx.stroke();

  // Sprocket center pins
  ctx.fillStyle = COLOR_VOLT;
  ctx.beginPath();
  ctx.arc(10, 14, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(32, 14, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Section 1: Surface & Concentric Ticket Geometry (DESIGN_SYSTEM.md Sections 2 & 3)
 * Draws Warm Stone Grey canvas (#E5E3DD), Crisp White Card (#FFFFFF, r=64px),
 * semicircular ticket-punch cutouts at y=1080 (r=24px), and dashed .lane-divider.
 */
function drawReceiptCardBase(
  ctx: CanvasRenderingContext2D,
  mode: TelemetryCardMode
): void {
  ctx.save();

  // 1. Viewport Canvas Background
  if (mode === 'transparent') {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.fillStyle = COLOR_CANVAS; // #E5E3DD
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // 2. Main Ticket Card with Concentric Geometry (r=64px) & Soft Tactile Drop Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 14;

  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  ctx.fillStyle = COLOR_CARD; // #FFFFFF
  ctx.fill();
  ctx.restore();

  // 3. Ticket-Punch Semicircular Cutouts on Left and Right Card Edges (r=24px at y=1080)
  if (mode === 'transparent') {
    // Punch real alpha holes through the white card
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CARD_X, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CARD_X + CARD_WIDTH, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Fill cutouts with the Warm Stone Grey canvas background (#E5E3DD)
    ctx.fillStyle = COLOR_CANVAS;
    ctx.beginPath();
    ctx.arc(CARD_X, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CARD_X + CARD_WIDTH, NOTCH_Y, NOTCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Horizontal Dashed .lane-divider Connecting Cutouts (6px dash, 6px gap in #DBD8D1)
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = COLOR_WELL; // #DBD8D1
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARD_X + NOTCH_RADIUS, NOTCH_Y);
  ctx.lineTo(CARD_X + CARD_WIDTH - NOTCH_RADIUS, NOTCH_Y);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Section 2: Top Header Cap & Multi-Line Route Title (y=64 to 460)
 * - Solid #111111 banner (h=120px) with top corners rounded 64px.
 * - Left: Volt (#F2F455) brand mark + 'FlightDeck' (32px bold rounded white text).
 * - Right: Ride date in #A8A8AE (26px).
 * - Multi-line Route Title in 64px extrabold rounded #111111 (clean word-wrapping, max 2 lines).
 * - 3 compact pills (bg-chip #EBE9E3, text-ink #111111, h=52px) for Distance, Elevation, Avg Power.
 */
function drawTopHeaderAndTitle(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData
): number {
  ctx.save();

  // 1. Solid #111111 Top Header Banner (h=120px, top corners rounded 64px, bottom square)
  const bannerH = 120;
  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_WIDTH, bannerH, [CARD_RADIUS, CARD_RADIUS, 0, 0]);
  ctx.fillStyle = COLOR_HEADER_BANNER;
  ctx.fill();

  const bannerCenterY = CARD_Y + bannerH / 2;

  // Left: Volt (#F2F455) FlightDeck Brand Mark
  drawFlightDeckVoltLogo(ctx, CONTENT_X, bannerCenterY - 14);

  // 'FlightDeck' text in bold rounded white
  ctx.font = `800 32px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_CARD; // #FFFFFF
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FlightDeck', CONTENT_X + 56, bannerCenterY);

  // Right: Ride Date in #A8A8AE
  ctx.font = `600 24px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_HEADER_DATE;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.dateStr, CONTENT_RIGHT, bannerCenterY);

  // 2. Multi-Line Route Title (y=230, 64px extrabold rounded #111111)
  let titleFontSize = 64;
  ctx.font = `800 ${titleFontSize}px ${FONT_ROUNDED}`;

  let lines = wrapTitleText(ctx, data.routeName, CONTENT_WIDTH, 2);

  // If the second line is still wider than container, scale font down gracefully
  while (lines.some((l) => ctx.measureText(l).width > CONTENT_WIDTH) && titleFontSize > 44) {
    titleFontSize -= 2;
    ctx.font = `800 ${titleFontSize}px ${FONT_ROUNDED}`;
    lines = wrapTitleText(ctx, data.routeName, CONTENT_WIDTH, 2);
  }

  const titleStartY = CARD_Y + bannerH + 48; // y = 232
  const lineHeight = titleFontSize * 1.16;

  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], CONTENT_X, titleStartY + i * lineHeight);
  }

  const titleEndY = titleStartY + lines.length * lineHeight;

  // 3. Three Compact Rounded-Full Pills (bg-chip #EBE9E3, text-ink #111111, h=52px)
  const pillsY = titleEndY + 28;
  const pillHeight = 52;
  const pillRadius = pillHeight / 2;

  const pillItems = [
    `${data.distanceKm.toFixed(1)} km`,
    `+${data.elevationM} m`,
    `${data.avgPower} W`,
  ];

  ctx.font = `700 22px ${FONT_ROUNDED}`;
  let currentPillX = CONTENT_X;

  for (const item of pillItems) {
    const textW = ctx.measureText(item).width;
    const pillW = textW + 48; // 24px padding on each side

    // Pill background (#EBE9E3)
    drawRoundedRect(ctx, currentPillX, pillsY, pillW, pillHeight, pillRadius);
    ctx.fillStyle = COLOR_CHIP;
    ctx.fill();

    // Pill text (#111111)
    ctx.fillStyle = COLOR_INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item, currentPillX + pillW / 2, pillsY + pillHeight / 2);

    currentPillX += pillW + 16;
  }

  ctx.restore();
  return pillsY + pillHeight;
}

/**
 * Section 3: The "Uber-Style" Total & Itemized Physics Ledger (y=480 to 1080)
 * - Hero invoice row: Left-aligned 'Total Work' in 44px bold with Volt pill badge,
 *   and right-aligned massive 88px extrabold rounded #111111 value ('787 kJ').
 * - 2px #EBE9E3 horizontal divider.
 * - 2x2 Strava-style typographic grid of 4 recessed pods (bg-pod #F4F3EF, rounded-pod 32px radius, 16px gap):
 *   Pod 1: Wind Tax (WATTS)
 *   Pod 2: Carb Burn (G / H)
 *   Pod 3: Air Density (KG / M³)
 *   Pod 4: Effort Zone (4-layer palette matrix, e.g. amber #FFFBEB bg, #92400E text, #F59E0B ring for Z3)
 */
function drawInvoiceAndPhysicsLedger(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData,
  topContentBottomY: number
): void {
  ctx.save();

  // 1. Hero Invoice Row
  const heroRowCenterY = Math.max(500, topContentBottomY + 54);

  // Left: 'Total Work' in 44px Bold Rounded #111111
  ctx.font = `800 44px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total Work', CONTENT_X, heroRowCenterY);

  const totalWorkTextWidth = ctx.measureText('Total Work').width;

  // Volt Pill Badge next to 'Total Work' (#FAFFCB fill, #4D5200 text, #A3B300 2px inset border)
  const badgeH = 34;
  const badgeText = 'MECHANICAL';
  ctx.font = `800 15px ${FONT_ROUNDED}`;
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = badgeTextW + 24;
  const badgeX = CONTENT_X + totalWorkTextWidth + 18;
  const badgeY = heroRowCenterY - badgeH / 2;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = '#FAFFCB'; // Yellow-vest pastel background
  ctx.fill();

  ctx.strokeStyle = '#A3B300'; // Yellow-vest 2px selection ring
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#4D5200'; // Yellow-vest high-contrast text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeW / 2, heroRowCenterY);

  // Right: Massive 88px Extrabold Rounded #111111 Value ('787 kJ' or '174 W')
  const heroValueStr =
    data.heroMetric === 'work' && data.totalKj > 0
      ? `${data.totalKj.toLocaleString()} kJ`
      : `${data.avgPower} W`;

  ctx.font = `800 84px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(heroValueStr, CONTENT_RIGHT, heroRowCenterY);

  // 2. Horizontal 2px #EBE9E3 Divider Line
  const dividerY = heroRowCenterY + 56;
  ctx.fillStyle = COLOR_CHIP; // #EBE9E3
  ctx.fillRect(CONTENT_X, dividerY, CONTENT_WIDTH, 2);

  // 3. 2x2 Strava-Style Typographic Grid of 4 Recessed Pods
  const gridStartY = dividerY + 24; // y ~ 580
  const gridEndY = NOTCH_Y - 48; // y = 1032
  const gridGap = 16;
  const podH = (gridEndY - gridStartY - gridGap) / 2; // ~215px
  const podW = (CONTENT_WIDTH - gridGap) / 2; // 436px
  const podRadius = 32; // rounded-pod

  // Pod 1 (Top-Left): Aero Wind Tax
  const p1X = CONTENT_X;
  const p1Y = gridStartY;
  drawRoundedRect(ctx, p1X, p1Y, podW, podH, podRadius);
  ctx.fillStyle = COLOR_POD;
  ctx.fill();

  ctx.font = `600 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('WIND TAX', p1X + 28, p1Y + 28);

  ctx.font = `500 18px ${FONT_BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText('WATTS', p1X + podW - 28, p1Y + 28);

  const taxSign = data.windTax > 0 ? '+' : '';
  const taxDisplay = `${taxSign}${data.windTax}`;
  ctx.font = `800 54px ${FONT_ROUNDED}`;
  ctx.fillStyle = data.windTax > 0 ? '#4D5200' : data.windTax < 0 ? '#10B981' : COLOR_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(taxDisplay, p1X + 28, p1Y + podH - 30);

  // Pod 2 (Top-Right): Carb Oxidation
  const p2X = CONTENT_X + podW + gridGap;
  const p2Y = gridStartY;
  drawRoundedRect(ctx, p2X, p2Y, podW, podH, podRadius);
  ctx.fillStyle = COLOR_POD;
  ctx.fill();

  ctx.font = `600 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('CARB BURN', p2X + 28, p2Y + 28);

  ctx.font = `500 18px ${FONT_BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText('G / H', p2X + podW - 28, p2Y + 28);

  ctx.font = `800 54px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${data.carbBurn}`, p2X + 28, p2Y + podH - 30);

  // Pod 3 (Bottom-Left): Air Density
  const p3X = CONTENT_X;
  const p3Y = gridStartY + podH + gridGap;
  drawRoundedRect(ctx, p3X, p3Y, podW, podH, podRadius);
  ctx.fillStyle = COLOR_POD;
  ctx.fill();

  ctx.font = `600 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('AIR DENSITY', p3X + 28, p3Y + 28);

  ctx.font = `500 18px ${FONT_BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText('KG / M³', p3X + podW - 28, p3Y + 28);

  ctx.font = `800 54px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${data.airDensity.toFixed(3)}`, p3X + 28, p3Y + podH - 30);

  // Pod 4 (Bottom-Right): Effort Zone (4-Layer Palette Matrix)
  const p4X = CONTENT_X + podW + gridGap;
  const p4Y = gridStartY + podH + gridGap;
  const zone = ZONE_PALETTES[data.powerZone] || ZONE_PALETTES.Z2;

  drawRoundedRect(ctx, p4X, p4Y, podW, podH, podRadius);
  ctx.fillStyle = zone.bg; // Tinted pastel background
  ctx.fill();

  ctx.strokeStyle = zone.ring; // 2px selection ring
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = `700 20px ${FONT_BODY}`;
  ctx.fillStyle = zone.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EFFORT ZONE', p4X + 28, p4Y + 28);

  ctx.font = `800 22px ${FONT_ROUNDED}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${data.avgPower} W`, p4X + podW - 28, p4Y + 28);

  ctx.font = `800 46px ${FONT_ROUNDED}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(zone.name, p4X + 28, p4Y + podH - 30);

  ctx.restore();
}

/**
 * Section 4: Bottom Half: Uber Timeline Spine + Clean Route Pod (y=1120 to 1810)
 * - DELETE the neon green mountain completely.
 * - Split into two columns:
 *   Left Column (Width 340px) — Vertical .lane-spine Summary:
 *   2px wide, 7px dash in #DBD8D1 connecting 3 waypoints with solid-backed circular badges:
 *   - Top node (Green #10B981 dot): 'START', '0.0 km', 'Base {minEleM}m'
 *   - Middle node (Amber #F59E0B dot): 'PEAK ELEVATION', '{maxEleM} m', '+{elevationGainM}m cumulative'
 *   - Bottom node (Ink #111111 square): 'FINISH', '{distanceKm} km', '{avgPower} W avg pace'
 *   Right Column (Width 516px, Height 620px) — Recessed Route Pod (#F4F3EF, rounded-pod 32px):
 *   - Aspect-corrected (Math.cos(lat)) GPX vector polyline (6px tarmac stroke with 14px Volt highlight underlay).
 *   - Start marker (#3D9A00 green circle with white ring) & Finish marker (#111111 pill tag).
 *   - Bottom inside edge (h=80px): architectural elevation profile with soft #EBE9E3 fill & 3px #66645E stroke.
 */
function drawBottomTimelineAndRoutePod(
  ctx: CanvasRenderingContext2D,
  data: NormalizedData
): void {
  ctx.save();

  const bottomStartY = NOTCH_Y + 48; // y = 1128
  const leftColW = 340;
  const rightColW = 516;
  const colGap = 32;

  const leftColX = CONTENT_X; // 96px
  const rightColX = leftColX + leftColW + colGap; // 468px
  const podH = 620; // y = 1140 to 1760

  // ══════════════════════════════════════════════════════════════════
  // LEFT COLUMN: VERTICAL .LANE-SPINE SUMMARY
  // ══════════════════════════════════════════════════════════════════
  const spineX = leftColX + 20; // 116px
  const nodeTopY = bottomStartY + 70; // ~1198
  const nodeMidY = bottomStartY + 270; // ~1398
  const nodeBotY = bottomStartY + 470; // ~1598

  // 1. Vertical Dashed Road Spine (2px wide, 7px dash, 7px gap in #DBD8D1)
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = COLOR_WELL; // #DBD8D1
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(spineX, nodeTopY);
  ctx.lineTo(spineX, nodeBotY);
  ctx.stroke();
  ctx.restore();

  const waypointTextX = spineX + 28;

  // Waypoint 1: START Node (Green #10B981 dot with solid white backer)
  ctx.save();
  ctx.fillStyle = COLOR_CARD; // Solid white backer
  ctx.beginPath();
  ctx.arc(spineX, nodeTopY, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10B981'; // Green dot
  ctx.beginPath();
  ctx.arc(spineX, nodeTopY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `600 18px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('START', waypointTextX, nodeTopY - 12);

  ctx.font = `800 30px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.fillText('0.0 km', waypointTextX, nodeTopY + 22);

  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.fillText(`Base ${Math.round(data.minEleM)}m`, waypointTextX, nodeTopY + 50);
  ctx.restore();

  // Waypoint 2: PEAK ELEVATION Node (Amber #F59E0B dot with solid white backer)
  ctx.save();
  ctx.fillStyle = COLOR_CARD;
  ctx.beginPath();
  ctx.arc(spineX, nodeMidY, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F59E0B'; // Amber dot
  ctx.beginPath();
  ctx.arc(spineX, nodeMidY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `600 18px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PEAK ELEVATION', waypointTextX, nodeMidY - 12);

  ctx.font = `800 30px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(`${Math.round(data.maxEleM)} m`, waypointTextX, nodeMidY + 22);

  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.fillText(`+${data.elevationM}m cumulative`, waypointTextX, nodeMidY + 50);
  ctx.restore();

  // Waypoint 3: FINISH Node (Ink #111111 rounded square with solid white backer)
  ctx.save();
  ctx.fillStyle = COLOR_CARD;
  ctx.beginPath();
  ctx.arc(spineX, nodeBotY, 14, 0, Math.PI * 2);
  ctx.fill();

  drawRoundedRect(ctx, spineX - 8, nodeBotY - 8, 16, 16, 4);
  ctx.fillStyle = COLOR_INK; // #111111 square
  ctx.fill();

  ctx.font = `600 18px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FINISH', waypointTextX, nodeBotY - 12);

  ctx.font = `800 30px ${FONT_ROUNDED}`;
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(`${data.distanceKm.toFixed(1)} km`, waypointTextX, nodeBotY + 22);

  ctx.font = `500 20px ${FONT_BODY}`;
  ctx.fillStyle = COLOR_INK_MUTED;
  ctx.fillText(`${data.avgPower} W avg pace`, waypointTextX, nodeBotY + 50);
  ctx.restore();

  // ══════════════════════════════════════════════════════════════════
  // RIGHT COLUMN: RECESSED ROUTE POD (#F4F3EF, rounded-pod 32px)
  // ══════════════════════════════════════════════════════════════════
  const podY = bottomStartY + 12; // y = 1140

  drawRoundedRect(ctx, rightColX, podY, rightColW, podH, 32);
  ctx.fillStyle = COLOR_POD;
  ctx.fill();

  // Clip all polyline & profile graphics to inside the recessed pod
  ctx.save();
  drawRoundedRect(ctx, rightColX, podY, rightColW, podH, 32);
  ctx.clip();

  // 2. Architectural Elevation Profile at Bottom Edge of Pod (h=80px)
  // Soft #EBE9E3 fill and 3px #66645E top stroke (no neon fills)
  const profileH = 80;
  const profileBaseY = podY + podH;
  const profilePeakY = profileBaseY - profileH + 10;
  const profilePoints = data.elevationPoints;

  if (profilePoints.length >= 2) {
    const minE = data.minEleM;
    const spanE = Math.max(10, data.maxEleM - minE);

    ctx.beginPath();
    ctx.moveTo(rightColX, profileBaseY);

    const stepX = rightColW / (profilePoints.length - 1);
    for (let i = 0; i < profilePoints.length; i++) {
      const px = rightColX + i * stepX;
      const py = profileBaseY - ((profilePoints[i].eleM - minE) / spanE) * (profileH - 14);
      if (i === 0) ctx.lineTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.lineTo(rightColX + rightColW, profileBaseY);
    ctx.closePath();

    ctx.fillStyle = COLOR_CHIP; // #EBE9E3
    ctx.fill();

    // 3px Top Stroke in #66645E
    ctx.beginPath();
    for (let i = 0; i < profilePoints.length; i++) {
      const px = rightColX + i * stepX;
      const py = profileBaseY - ((profilePoints[i].eleM - minE) / spanE) * (profileH - 14);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = COLOR_INK_MUTED; // #66645E
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle Peak Altitude Tag
    ctx.font = `700 13px ${FONT_ROUNDED}`;
    ctx.fillStyle = COLOR_INK_MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`▲ MAX ${Math.round(data.maxEleM)}M`, rightColX + rightColW - 18, profilePeakY + 4);
  }

  // 3. Aspect-Corrected GPX Vector Polyline (6px tarmac with 14px Volt highlight underlay)
  const coords = data.coordinates;
  if (coords.length >= 2) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const [lat, lon] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    const midLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos((midLat * Math.PI) / 180);

    const spanLat = Math.max(0.005, maxLat - minLat);
    const spanLon = Math.max(0.005, (maxLon - minLon) * cosLat);

    const padX = 48;
    const padTop = 44;
    const padBot = profileH + 34; // Ensure clean clearance above elevation profile

    const availW = rightColW - padX * 2;
    const availH = podH - (padTop + padBot);
    const scale = Math.min(availW / spanLon, availH / spanLat);

    const projW = spanLon * scale;
    const projH = spanLat * scale;
    const originX = rightColX + padX + (availW - projW) / 2;
    const originY = podY + padTop + (availH - projH) / 2;

    const projected = coords.map(([lat, lon]) => ({
      x: originX + (lon - minLon) * cosLat * scale,
      y: originY + (maxLat - lat) * scale,
    }));

    // Underlay: 14px Volt Highlight Stroke at 35% opacity
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      ctx.lineTo(projected[i].x, projected[i].y);
    }
    ctx.strokeStyle = 'rgba(242, 244, 85, 0.40)'; // Volt highlight
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Foreground: Crisp 6px #111111 Tarmac Stroke
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      ctx.lineTo(projected[i].x, projected[i].y);
    }
    ctx.strokeStyle = COLOR_INK; // #111111
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Start Marker: #3D9A00 Green circle (r=10px with white ring)
    const startPt = projected[0];
    ctx.fillStyle = '#3D9A00';
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLOR_CARD; // White ring
    ctx.lineWidth = 3;
    ctx.stroke();

    // Finish Marker: #111111 Pill Tag ('FINISH')
    const finishPt = projected[projected.length - 1];
    const finishTagW = 62;
    const finishTagH = 26;
    const finishTagX = Math.max(
      rightColX + 16,
      Math.min(rightColX + rightColW - finishTagW - 16, finishPt.x + 12)
    );
    const finishTagY = Math.max(
      podY + 16,
      Math.min(podY + podH - profileH - finishTagH - 12, finishPt.y - finishTagH / 2)
    );

    drawRoundedRect(ctx, finishTagX, finishTagY, finishTagW, finishTagH, finishTagH / 2);
    ctx.fillStyle = COLOR_INK;
    ctx.fill();

    ctx.font = `800 12px ${FONT_ROUNDED}`;
    ctx.fillStyle = COLOR_CARD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', finishTagX + finishTagW / 2, finishTagY + finishTagH / 2);
  }

  ctx.restore(); // Release pod clip
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
 * Internal Canvas Renderer: Paints the 1080x1920px (9:16) Peloton Flight Receipt
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

  // Create 1080x1920px (9:16 Story) Canvas
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

  // 1. Surface & Concentric Ticket Geometry (Canvas + White Card + Ticket Cutouts + Dashed Divider)
  drawReceiptCardBase(ctx, mode);

  // 2. Top Header Cap & Multi-Line Route Title (Header banner, route title, and 3 pills)
  const topBottomY = drawTopHeaderAndTitle(ctx, normalized);

  // 3. Uber-Style Total & Itemized Physics Ledger (Hero row + 2x2 Strava grid of pods)
  drawInvoiceAndPhysicsLedger(ctx, normalized, topBottomY);

  // 4. Bottom Half: Uber Timeline Spine + Clean Route Pod
  drawBottomTimelineAndRoutePod(ctx, normalized);

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
  fileName = 'flightdeck-telemetry.png'
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
): TelemetryShareData {
  const dist = trip.route?.distanceKm;
  const elev = trip.route?.elevationGainM;
  const rho = trip.weather?.airDensityRho ?? trip.physics?.rho ?? 1.225;

  return {
    routeName: trip.name || 'Brière Gravel Tempo (Guérande)',
    distanceKm: typeof dist === 'number' ? Number(dist.toFixed(1)) : 0,
    elevationGainM: typeof elev === 'number' ? Math.round(elev) : 0,
    avgPowerWatts:
      typeof physicsResult?.legWatts === 'number'
        ? Math.round(physicsResult.legWatts)
        : 0,
    windTaxWatts:
      typeof physicsResult?.powerDeltaWatts === 'number'
        ? Math.round(physicsResult.powerDeltaWatts)
        : 0,
    airDensityRho: typeof rho === 'number' ? Number(rho.toFixed(3)) : 1.225,
    carbBurnGramsPerHour:
      typeof physicsResult?.carbOxidationGramPerHour === 'number'
        ? Math.round(physicsResult.carbOxidationGramPerHour)
        : 0,
    totalWorkKj:
      typeof physicsResult?.totalWorkKj === 'number'
        ? Math.round(physicsResult.totalWorkKj)
        : 0,
    ftpWatts: physicsResult?.ftpWatts ?? 210,
    powerZone: physicsResult?.powerZone,
    departureDate: trip.departureDate,
    coordinates: trip.route?.coordinates,
    elevationProfile: trip.route?.elevationProfile,
    movingTimeFormatted: physicsResult?.movingTimeFormatted,
    avgSpeedKmH: physicsResult?.effectiveSpeedKmH ?? trip.route?.targetSpeedKmH,
  };
}
