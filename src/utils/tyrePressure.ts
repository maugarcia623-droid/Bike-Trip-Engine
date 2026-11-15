import { BikeCategory, BikeSpec, CasingType } from '../types/specs';

export interface TyrePressureInput {
  systemMassKg: number;
  tireWidthMm: number;
  isTubeless: boolean;
  pavedPct: number;
  gravelPct: number;
  singletrackPct: number;
  gearWeightKg?: number;
  bikeCategory?: BikeCategory;
  casingType?: CasingType;
  isHookless?: boolean;
  bikeName?: string;
}

export interface TyrePressureResult {
  frontBar: number;
  rearBar: number;
  frontLoadPct: number;
  rearLoadPct: number;
  bikeCategory: BikeCategory;
  casingType: CasingType;
  isHookless: boolean;
  hooklessCapped: boolean;
}

export function inferBikeCategory(
  tireWidthMm: number,
  bikeName?: string,
  explicitCategory?: BikeCategory,
  gearWeightKg = 0
): BikeCategory {
  if (explicitCategory) return explicitCategory;
  const lower = (bikeName || '').toLowerCase();
  if (gearWeightKg >= 5 || lower.includes('tour') || lower.includes('randon')) {
    return 'touring';
  }
  if (lower.includes('mtb') || lower.includes('vtt') || lower.includes('xc') || tireWidthMm >= 48) {
    return 'mtb';
  }
  if (lower.includes('urban') || lower.includes('city') || lower.includes('commut') || lower.includes('omnium')) {
    return 'urban';
  }
  if (lower.includes('grvl') || lower.includes('gravel') || tireWidthMm >= 34) {
    return 'gravel';
  }
  return 'road';
}

export function getWheelLoadSplit(category: BikeCategory, gearWeightKg = 0): {
  frontPct: number;
  rearPct: number;
} {
  switch (category) {
    case 'road':
      return { frontPct: 45, rearPct: 55 };
    case 'gravel':
      return gearWeightKg >= 4 ? { frontPct: 42, rearPct: 58 } : { frontPct: 44, rearPct: 56 };
    case 'touring':
      return { frontPct: 42, rearPct: 58 };
    case 'mtb':
    case 'urban':
    default:
      return { frontPct: 41, rearPct: 59 };
  }
}

/**
 * Continuous 15% tyre-drop pressure model (Frank Berto / Silca-inspired)
 * replacing coarse width buckets with per-wheel load split, continuous width scaling,
 * casing stiffness, OSM surface mix, inner-tube margin, and ETRTO 5.0 bar hookless cap.
 */
export function calculateTyrePressure(input: TyrePressureInput): TyrePressureResult {
  const widthMm = Math.max(23, Math.min(65, input.tireWidthMm || 38));
  const totalMassKg = Math.max(45, Math.min(180, input.systemMassKg || 80));
  const gearKg = Math.max(0, input.gearWeightKg || 0);

  const bikeCategory = inferBikeCategory(widthMm, input.bikeName, input.bikeCategory, gearKg);
  const casingType: CasingType = input.casingType ?? (bikeCategory === 'road' ? 'supple' : 'standard');
  const isHookless = Boolean(input.isHookless);

  const { frontPct, rearPct } = getWheelLoadSplit(bikeCategory, gearKg);
  const frontLoadKg = totalMassKg * (frontPct / 100);
  const rearLoadKg = totalMassKg * (rearPct / 100);

  // Continuous 15% drop base curve calibrated for standard 35 mm reference
  const computeWheelBar = (wheelLoadKg: number) =>
    3.55 * Math.pow(wheelLoadKg / 40, 0.75) * Math.pow(35 / widthMm, 1.65);

  const casingFactor =
    casingType === 'supple' ? 0.97 : casingType === 'reinforced' ? 1.05 : 1.0;

  const totalPct = Math.max(1, input.pavedPct + input.gravelPct + input.singletrackPct);
  const gravelRatio = Math.max(0, Math.min(1, input.gravelPct / totalPct));
  const singletrackRatio = Math.max(0, Math.min(1, input.singletrackPct / totalPct));

  // Unpaved surfaces benefit from lower pressure for grip & lower impedance
  const surfaceFactor = Math.max(
    0.76,
    1.0 - gravelRatio * 0.14 - singletrackRatio * 0.24
  );

  const tubeFactor = input.isTubeless ? 1.0 : 1.08;
  const tubeFloorBonus = input.isTubeless ? 0 : 0.2;

  let rawFront = computeWheelBar(frontLoadKg) * casingFactor * surfaceFactor * tubeFactor + tubeFloorBonus * 0.5;
  let rawRear = computeWheelBar(rearLoadKg) * casingFactor * surfaceFactor * tubeFactor + tubeFloorBonus * 0.5;

  const minSafeBar = input.isTubeless ? 1.4 : 1.7;
  const maxSafeBar = isHookless ? 5.0 : 7.5;
  const hooklessCapped = isHookless && (rawFront > 5.0 || rawRear > 5.0);

  const frontBar = Number(Math.max(minSafeBar, Math.min(maxSafeBar, rawFront)).toFixed(1));
  const rearBar = Number(Math.max(minSafeBar + 0.1, Math.min(maxSafeBar, rawRear)).toFixed(1));

  return {
    frontBar,
    rearBar,
    frontLoadPct: frontPct,
    rearLoadPct: rearPct,
    bikeCategory,
    casingType,
    isHookless,
    hooklessCapped,
  };
}

export function buildTyrePressureInputFromBike(
  bike: BikeSpec | undefined,
  systemMassKg: number,
  gearWeightKg: number,
  pavedPct: number,
  gravelPct: number,
  singletrackPct: number
): TyrePressureInput {
  return {
    systemMassKg,
    tireWidthMm: bike?.tireWidthMm ?? 38,
    isTubeless: bike?.isTubeless ?? true,
    pavedPct,
    gravelPct,
    singletrackPct,
    gearWeightKg,
    bikeCategory: bike?.bikeCategory,
    casingType: bike?.casingType,
    isHookless: bike?.isHookless,
    bikeName: bike?.name,
  };
}
