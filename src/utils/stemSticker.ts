import { TripProfile } from '../types/trip';
import { RiderBikeSpecs } from '../types/specs';
import { StageAmenity } from '../types/amenities';
import { getActiveBike } from './specsStorage';
import { calculatePhysics } from './physics';
import {
  buildClimbAdjustedPacingCurve,
  computeClimbSplitsAndFueling,
  formatClimbCategoryLabel,
} from './climbSplits';
import {
  calculateAmenityEtaDetails,
  calculateWaterGaps,
} from '../services/overpassCorridor';
import { evaluateOpeningHoursAtArrival } from './openingHours';
import { calculateHydrationPlan } from './nutrition';
import { barToPsi, calculateTyrePressure } from './tyrePressure';
import { computeSurfaceBreakdown } from './surfaceProfile';

export type StemStickerPresetId = 'road' | 'gravel';

export interface StemStickerPreset {
  id: StemStickerPresetId;
  widthMm: number;
  minHeightMm: number;
  maxRows: number;
  labelEn: string;
  labelFr: string;
  dimLabel: string;
}

export const STEM_STICKER_PRESETS: Record<StemStickerPresetId, StemStickerPreset> = {
  road: {
    id: 'road',
    widthMm: 36,
    minHeightMm: 140,
    maxRows: 10,
    labelEn: 'Narrow Road',
    labelFr: 'Route fin',
    dimLabel: '3.6 × 14 cm',
  },
  gravel: {
    id: 'gravel',
    widthMm: 46,
    minHeightMm: 155,
    maxRows: 13,
    labelEn: 'Wide Gravel',
    labelFr: 'Gravel large',
    dimLabel: '4.6 × 15.5 cm',
  },
};

export type StemStickerRowKind =
  | 'start'
  | 'climb'
  | 'bakery'
  | 'water'
  | 'warning'
  | 'fuel'
  | 'custom'
  | 'finish';

export interface StemStickerRow {
  id: string;
  km: number;
  etaHHMM?: string;
  kind: StemStickerRowKind;
  title: string;
  detail?: string;
  tag?: string;
  emphasis?: boolean;
}

export interface CustomStickerNote {
  id: string;
  km: number;
  label: string;
}

export interface StemStickerData {
  title: string;
  subtitle: string;
  distanceKm: number;
  elevationGainM: number;
  startTime: string;
  finishHHMM: string;
  movingLabel: string;
  fuelCueLine: string;
  tyrePressureLine: string;
  rows: StemStickerRow[];
}

export function buildStemStickerData(params: {
  trip: TripProfile;
  riderSpecs?: RiderBikeSpecs;
  amenities?: StageAmenity[];
  /**
   * When provided, ONLY amenities whose ID is in this list are placed on the sticker
   * (gives the rider explicit control over which scanned stops make the cut).
   * Water-gap analysis still uses the full scanned `amenities` array when available.
   */
  selectedAmenityIds?: string[];
  customNotes?: CustomStickerNote[];
  presetId?: StemStickerPresetId;
  includeFuelCues?: boolean;
  includeClimbs?: boolean;
  lang: 'en' | 'fr';
}): StemStickerData {
  const {
    trip,
    riderSpecs,
    amenities = [],
    selectedAmenityIds,
    customNotes = [],
    presetId = 'gravel',
    includeFuelCues = true,
    includeClimbs = true,
    lang,
  } = params;

  const isFr = lang === 'fr';
  const preset = STEM_STICKER_PRESETS[presetId];
  const activeBike = riderSpecs ? getActiveBike(riderSpecs) : null;

  const distKm = Math.max(1, Number(trip.route.distanceKm || 30));
  const elevGainM = Math.max(0, Math.round(trip.route.elevationGainM || 0));
  const startTime = trip.departureTime || '08:30';
  const targetSpeedKmH = Math.max(10, trip.route.targetSpeedKmH || 23);
  const rideDate =
    trip.stages?.[trip.activeStageIndex ?? 0]?.departureDate ||
    trip.departureDate ||
    new Date().toISOString().split('T')[0];

  const phys = calculatePhysics(
    trip.physics,
    trip.route,
    trip.weather,
    lang,
    riderSpecs?.ftpWatts
  );
  const effectiveSpeed = Math.max(10, phys.effectiveSpeedKmH || targetSpeedKmH);
  const rideHours = Math.max(0.5, phys.movingTimeSeconds / 3600);

  const systemMassKg =
    (trip.physics.riderWeightKg || riderSpecs?.riderWeightKg || 72) +
    (trip.physics.bikeWeightKg || activeBike?.weightKg || 10) +
    (trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg ?? 2);

  const pacingCurve =
    trip.route.elevationProfile && trip.route.elevationProfile.length >= 2
      ? buildClimbAdjustedPacingCurve(
          trip.route.elevationProfile,
          distKm,
          effectiveSpeed,
          systemMassKg
        )
      : undefined;

  const finishEta = calculateAmenityEtaDetails(startTime, distKm, effectiveSpeed, pacingCurve);

  // Tyre pressure summary
  const surface =
    trip.route.surfaceBreakdown ||
    computeSurfaceBreakdown(trip.route, {
      crr: trip.physics.crr ?? activeBike?.crr,
      tireWidthMm: activeBike?.tireWidthMm ?? 38,
      isTubeless: activeBike?.isTubeless ?? true,
    });
  const pressure = calculateTyrePressure({
    systemMassKg,
    tireWidthMm: activeBike?.tireWidthMm ?? 38,
    bikeCategory: activeBike?.bikeCategory ?? 'gravel',
    casingType: activeBike?.casingType ?? 'standard',
    isTubeless: activeBike?.isTubeless ?? true,
    isHookless: activeBike?.isHookless ?? false,
    pavedPct: surface.pavedPct,
    gravelPct: surface.gravelPct,
    singletrackPct: surface.singletrackPct,
  });
  const tyrePressureLine =
    riderSpecs?.pressureUnit === 'psi'
      ? `${barToPsi(pressure.frontBar)}/${barToPsi(pressure.rearBar)} PSI`
      : `${pressure.frontBar.toFixed(1)}/${pressure.rearBar.toFixed(1)} bar`;

  // Hydration & Fuel rhythm line
  const bidonSizeMl = riderSpecs?.bidonSizeMl ?? 650;
  const slots = riderSpecs?.frameBottleSlots ?? 2;
  const hydration = calculateHydrationPlan({
    rideHours,
    tempC: trip.weather?.temperatureC ?? 16,
    legWatts: phys.legWatts,
    bidonSizeMl,
    frameBottleSlots: slots,
  });
  const carbGPerHr = riderSpecs?.carbTargetGPerHr ?? 60;
  const sipMin = (trip.weather?.temperatureC ?? 16) >= 24 ? 12 : 15;
  const eatMin = carbGPerHr >= 65 ? 20 : 25;
  const fuelCueLine =
    rideHours < 0.75
      ? isFr
        ? `1×${bidonSizeMl} ml · Eau seule`
        : `1×${bidonSizeMl} ml · Water only`
      : isFr
      ? `Manger /${eatMin}m · Boire /${sipMin}m · ${hydration.carriedOnFrameBidons}×${bidonSizeMl}ml`
      : `Eat /${eatMin}m · Sip /${sipMin}m · ${hydration.carriedOnFrameBidons}×${bidonSizeMl}ml`;

  const movingMinTotal = Math.round(phys.movingTimeSeconds / 60);
  const movH = Math.floor(movingMinTotal / 60);
  const movM = movingMinTotal % 60;
  const movingLabel = movH > 0 ? `${movH}h${String(movM).padStart(2, '0')}` : `${movM} min`;

  const middleRows: StemStickerRow[] = [];

  // 1. Climbs from elevation profile (only if route actually has meaningful climbing)
  if (
    includeClimbs &&
    elevGainM >= 150 &&
    trip.route.elevationProfile &&
    trip.route.elevationProfile.length >= 2
  ) {
    const splits = computeClimbSplitsAndFueling(trip, phys, lang, {
      ftpWatts: riderSpecs?.ftpWatts ?? 220,
      carbTargetGPerHr: carbGPerHr,
      departureTimeHHMM: startTime,
    });

    splits.climbs.slice(0, 5).forEach((climb, idx) => {
      const catTag = formatClimbCategoryLabel(climb.category, lang);
      const climbEta = calculateAmenityEtaDetails(
        startTime,
        climb.startKm,
        effectiveSpeed,
        pacingCurve
      );
      middleRows.push({
        id: `climb-${idx}`,
        km: climb.startKm,
        etaHHMM: climbEta.etaHHMM,
        kind: 'climb',
        title: `${catTag} · ${climb.lengthKm.toFixed(1)} km @ ${climb.avgGradePct.toFixed(1)}%`,
        detail: `+${Math.round(climb.elevationGainM)} m → km ${climb.endKm.toFixed(1)}`,
        tag: '▲',
        emphasis: climb.category === 'HC' || climb.category === '1' || climb.category === '2',
      });
    });
  }

  // 2. Stops — explicit rider selection when `selectedAmenityIds` is provided, else pinned + spaced auto-pick
  const mergedAmenities: StageAmenity[] = [];
  const seenIds = new Set<string>();
  for (const a of [...(trip.pinnedAmenities || []), ...amenities]) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      mergedAmenities.push(a);
    }
  }

  const pinnedIds = new Set((trip.pinnedAmenities || []).map((p) => p.id));

  // Water gaps warning if scanned amenities exist
  if (mergedAmenities.length > 0) {
    const gaps = calculateWaterGaps(mergedAmenities, distKm, {
      sectorSpeedKmH: effectiveSpeed,
      targetFluidMlPerHr: hydration.targetFluidMlPerHr,
      bidonSizeMl,
      frameBottleSlots: slots,
    });
    const worstGap = gaps.criticalGaps[0] || gaps.cautionGaps[0];
    if (worstGap) {
      middleRows.push({
        id: `gap-${worstGap.startKm}`,
        km: worstGap.startKm,
        kind: 'warning',
        title: isFr
          ? `SEC ${worstGap.distanceKm.toFixed(0)} km (→ km ${worstGap.endKm.toFixed(0)})`
          : `DRY ${worstGap.distanceKm.toFixed(0)} km (→ km ${worstGap.endKm.toFixed(0)})`,
        detail: isFr ? 'Remplir tous les bidons' : 'Fill all bottles here',
        tag: '!',
        emphasis: true,
      });
    }
  }

  let chosenFood: StageAmenity[] = [];
  let chosenWater: StageAmenity[] = [];

  if (selectedAmenityIds !== undefined) {
    const allowedSet = new Set(selectedAmenityIds);
    const chosen = mergedAmenities
      .filter((a) => allowedSet.has(a.id))
      .sort((a, b) => a.routeKm - b.routeKm);
    chosenFood = chosen.filter((a) => a.category === 'food');
    chosenWater = chosen.filter((a) => a.category === 'water' || a.category === 'cemetery');
  } else {
    const foodCandidates = mergedAmenities
      .filter((a) => a.category === 'food')
      .sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)) || a.routeKm - b.routeKm);

    let lastFoodKm = -999;
    for (const a of foodCandidates) {
      if (pinnedIds.has(a.id) || a.routeKm - lastFoodKm >= Math.max(12, distKm / 4)) {
        chosenFood.push(a);
        lastFoodKm = a.routeKm;
        if (chosenFood.length >= 3) break;
      }
    }

    const waterCandidates = mergedAmenities
      .filter((a) => a.category === 'water' || a.category === 'cemetery')
      .sort((a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)) || a.routeKm - b.routeKm);

    let lastWaterKm = 0;
    const waterSpacing = Math.max(15, distKm / 3.5);
    for (const a of waterCandidates) {
      if (pinnedIds.has(a.id) || (a.routeKm - lastWaterKm >= waterSpacing && distKm - a.routeKm >= 8)) {
        chosenWater.push(a);
        lastWaterKm = a.routeKm;
        if (chosenWater.length >= 3) break;
      }
    }
  }

  chosenFood.forEach((a) => {
    const eta = calculateAmenityEtaDetails(startTime, a.routeKm, effectiveSpeed, pacingCurve);
    const verdict = evaluateOpeningHoursAtArrival(a.openingHours, rideDate, eta.etaHHMM, lang);
    const openNote =
      verdict?.status === 'open'
        ? isFr
          ? 'Ouvert ✓'
          : 'Open ✓'
        : verdict?.status === 'closed'
        ? isFr
          ? 'Fermé ✗'
          : 'Closed ✗'
        : verdict?.status === 'closing-soon'
        ? isFr
          ? 'Ferme bientôt'
          : 'Closing soon'
        : undefined;

    middleRows.push({
      id: `food-${a.id}`,
      km: a.routeKm,
      etaHHMM: eta.etaHHMM,
      kind: 'bakery',
      title: a.name.slice(0, 22),
      detail: openNote,
      tag: '☕',
      emphasis: verdict?.status === 'closed',
    });
  });

  chosenWater.forEach((a) => {
    const eta = calculateAmenityEtaDetails(startTime, a.routeKm, effectiveSpeed, pacingCurve);
    middleRows.push({
      id: `water-${a.id}`,
      km: a.routeKm,
      etaHHMM: eta.etaHHMM,
      kind: 'water',
      title: a.name.slice(0, 22),
      detail:
        a.category === 'cemetery'
          ? isFr
            ? 'Robinet cimetière'
            : 'Cemetery tap'
          : isFr
          ? 'Point d’eau'
          : 'Water tap',
      tag: '💧',
    });
  });

  // 3. Custom rider notes (always prioritized!)
  customNotes.forEach((note) => {
    const eta = calculateAmenityEtaDetails(startTime, note.km, effectiveSpeed, pacingCurve);
    middleRows.push({
      id: `custom-${note.id}`,
      km: note.km,
      etaHHMM: eta.etaHHMM,
      kind: 'custom',
      title: note.label.slice(0, 26),
      tag: '★',
      emphasis: true,
    });
  });

  // 4. Optional periodic snack & bottle checkpoint reminders
  if (includeFuelCues && rideHours >= 1.25 && middleRows.length < preset.maxRows - 3) {
    const stepKm = distKm >= 120 ? 30 : distKm >= 70 ? 25 : 20;
    for (let km = stepKm; km < distKm - 8; km += stepKm) {
      const hasNearby = middleRows.some((r) => Math.abs(r.km - km) < 5);
      if (!hasNearby) {
        const eta = calculateAmenityEtaDetails(startTime, km, effectiveSpeed, pacingCurve);
        middleRows.push({
          id: `fuel-${km}`,
          km,
          etaHHMM: eta.etaHHMM,
          kind: 'fuel',
          title: isFr ? 'Manger & boire' : 'Eat snack & sip water',
          tag: '●',
        });
      }
    }
  }

  // Sort middle rows by km and trim cleanly to fit physical strip height
  const sortedMiddle = middleRows
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.max(2, preset.maxRows - 2));

  const rows: StemStickerRow[] = [
    {
      id: 'start',
      km: 0,
      etaHHMM: startTime,
      kind: 'start',
      title: (trip.route.origin || (isFr ? 'Départ' : 'Roll out')).slice(0, 22),
      tag: 'GO',
    },
    ...sortedMiddle,
    {
      id: 'finish',
      km: Number(distKm.toFixed(1)),
      etaHHMM: finishEta.etaHHMM,
      kind: 'finish',
      title: (trip.route.destination || (isFr ? 'Arrivée' : 'Finish')).slice(0, 22),
      tag: 'FIN',
    },
  ];

  return {
    title: trip.name || (isFr ? 'Ma sortie vélo' : 'My Bike Ride'),
    subtitle: `${distKm.toFixed(1)} km · +${elevGainM} m · ${movingLabel}`,
    distanceKm: distKm,
    elevationGainM: elevGainM,
    startTime,
    finishHHMM: finishEta.etaHHMM,
    movingLabel,
    fuelCueLine,
    tyrePressureLine,
    rows,
  };
}
