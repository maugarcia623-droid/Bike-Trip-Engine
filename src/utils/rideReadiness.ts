/**
 * Ride Readiness Score
 * ────────────────────
 * A single 0–100 number answering "are conditions aligned enough to commit to this ride?"
 *
 * Six factors are scored independently (0–100 each), blended by weight, then passed through
 * "weakest-link" caps so one badly-off factor can never hide behind five good ones.
 *
 *   Factor            Weight   What it looks at
 *   ───────────────   ──────   ──────────────────────────────────────────────────────
 *   Weather             25     rain risk, wind / gusts, headwind, feels-like temperature
 *   Bike & terrain      20     bike category + tyre width vs gravel / singletrack share
 *   Effort              20     intensity (% FTP) × duration → training load, rider level
 *   Checklist           15     ticked items, critical items weighted heavier
 *   Daylight            10     share of the ride in darkness / twilight
 *   Route & stops       10     closed stops, water gaps, sector headwinds (brief problems)
 *
 * Bands:  0–44 "Needs a change" · 45–74 "Worth a tweak" · 75–100 "Good to go"
 *
 * Pure & dependency-free (types only) so it can be unit-tested in isolation.
 */
import type { BikeCategory, RiderLevel } from '../types/specs';
import type { GravelSuitabilityLevel } from '../types/trip';

export type ReadinessLevel = 'needs-change' | 'worth-tweak' | 'good-to-go';
export type ReadinessFactorId = 'weather' | 'terrain' | 'effort' | 'checklist' | 'light' | 'route';
export type ReadinessProblemSeverity = 'critical' | 'warning' | 'info' | 'clear';

/** Score bands (inclusive lower bounds). */
export const READINESS_BANDS: Record<ReadinessLevel, { min: number; max: number }> = {
  'needs-change': { min: 0, max: 44 },
  'worth-tweak': { min: 45, max: 74 },
  'good-to-go': { min: 75, max: 100 },
};

const FACTOR_WEIGHTS: Record<ReadinessFactorId, number> = {
  weather: 25,
  terrain: 20,
  effort: 20,
  checklist: 15,
  light: 10,
  route: 10,
};

export interface RideReadinessInput {
  lang?: 'en' | 'fr';
  weather: {
    rainRiskPct: number;
    baseWindKmH: number;
    gustKmH: number;
    headwindKmH: number;
    feelsLikeC: number;
  };
  bike: {
    name?: string;
    category?: BikeCategory;
    tireWidthMm: number;
    isTubeless: boolean;
  };
  terrain: {
    /** Whether real surface data exists for this route (OSM / GPX). */
    hasSurfaceData: boolean;
    gravelPct: number;
    singletrackPct: number;
    suitabilityLevel?: GravelSuitabilityLevel;
  };
  effort: {
    ftpPercent: number;
    movingHours: number;
    powerZone?: string;
    riderLevel?: RiderLevel;
  };
  checklist: {
    total: number;
    checked: number;
    criticalTotal: number;
    criticalChecked: number;
  };
  light: {
    nightPercent: number;
    twilightPercent: number;
  };
  route: {
    worstSeverity: ReadinessProblemSeverity;
    /** Number of critical/warning problems detected (including the first). */
    issueCount: number;
    headline?: string;
  };
  goStatus: 'GO' | 'CAUTION' | 'NO-GO';
}

export interface ReadinessFactor {
  id: ReadinessFactorId;
  label: string;
  /** 0–100 sub-score. */
  score: number;
  /** Normalised weight share (0–1) after excluding non-applicable factors. */
  weight: number;
  /** Points this factor costs the overall score (before caps). */
  pointsLost: number;
  /** Short human summary of the inputs, e.g. "Rain 60% · gusts 34 km/h". */
  note: string;
  /** Suggested action to recover points, when there's something to fix. */
  tip?: string;
  applicable: boolean;
}

export interface RideReadiness {
  score: number;
  level: ReadinessLevel;
  label: string;
  summary: string;
  factors: ReadinessFactor[];
  /** The single change that would recover the most points. */
  topLift?: { factorId: ReadinessFactorId; tip: string; gain: number };
  /** Set when a weakest-link / NO-GO cap pulled the score down. */
  capReason?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Piecewise-linear interpolation over sorted [x, y] stops. */
function interpolate(x: number, stops: Array<[number, number]>): number {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = stops[i];
    if (x <= x1) {
      const [x0, y0] = stops[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return stops[stops.length - 1][1];
}

export function getReadinessLevel(score: number): ReadinessLevel {
  if (score >= READINESS_BANDS['good-to-go'].min) return 'good-to-go';
  if (score >= READINESS_BANDS['worth-tweak'].min) return 'worth-tweak';
  return 'needs-change';
}

function formatHours(h: number): string {
  const total = Math.max(1, Math.round(h * 60));
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}` : `${mm} min`;
}

// ── factor scorers ─────────────────────────────────────────────────────────

function scoreWeather(w: RideReadinessInput['weather'], isFr: boolean) {
  const rainPen = w.rainRiskPct <= 5 ? 0 : (w.rainRiskPct - 5) * 0.65; // 20% → 10, 60% → 36, 100% → 62
  const gustPen = clamp((w.gustKmH - 18) * 1.25, 0, 50); // 25 → 9, 40 → 27.5, 58 → 50
  const basePen = clamp((w.baseWindKmH - 10) * 1.4, 0, 45); // 15 → 7, 25 → 21, 32 → 31
  const headPen = clamp((w.headwindKmH - 8) * 0.7, 0, 18);
  const windPen = Math.max(gustPen, basePen) + headPen * 0.45;
  const t = w.feelsLikeC;
  const tempPen = t < 12 ? clamp((12 - t) * 2.2, 0, 40) : t > 24 ? clamp((t - 24) * 3.2, 0, 40) : 0;
  const score = clamp(100 - (rainPen + windPen + tempPen));

  const parts: string[] = [];
  parts.push(isFr ? `Pluie ${Math.round(w.rainRiskPct)}%` : `Rain ${Math.round(w.rainRiskPct)}%`);
  parts.push(isFr ? `rafales ${Math.round(w.gustKmH)} km/h` : `gusts ${Math.round(w.gustKmH)} km/h`);
  parts.push(isFr ? `ressenti ${Math.round(t)}°C` : `feels ${Math.round(t)}°C`);

  // Tip targets the biggest weather penalty.
  let tip: string | undefined;
  const worst = Math.max(rainPen, windPen, tempPen);
  if (worst >= 8) {
    if (worst === rainPen) {
      tip = isFr ? 'Décalez la sortie ou prenez une veste imperméable' : 'Shift the window or pack a rain shell';
    } else if (worst === windPen) {
      tip = isFr ? 'Choisissez un créneau moins venté' : 'Pick a calmer window';
    } else {
      tip =
        t < 8
          ? isFr
            ? 'Partez plus tard dans la journée ou couvrez-vous'
            : 'Ride later in the day or layer up'
          : isFr
          ? 'Partez plus tôt, à la fraîche'
          : 'Ride earlier, before the heat';
    }
  }
  return { score, note: parts.join(' · '), tip };
}

/** Max gravel share (%) a tyre width handles comfortably. */
const GRAVEL_TOLERANCE_BY_WIDTH: Array<[number, number]> = [
  [23, 2],
  [25, 4],
  [28, 8],
  [32, 20],
  [35, 35],
  [38, 55],
  [40, 70],
  [45, 90],
  [50, 100],
];

function scoreTerrain(
  bike: RideReadinessInput['bike'],
  terrain: RideReadinessInput['terrain'],
  isFr: boolean
) {
  const cat = bike.category;
  const width = bike.tireWidthMm || 32;
  const gravel = Math.max(0, terrain.gravelPct);
  const single = Math.max(0, terrain.singletrackPct);
  const unpaved = gravel + single;

  let gravelTol = interpolate(width, GRAVEL_TOLERANCE_BY_WIDTH);
  if (cat === 'road' && width < 32) gravelTol = Math.min(gravelTol, 10);
  if (cat === 'gravel') gravelTol += 10;
  if (cat === 'mtb') gravelTol = 100;

  let singleTol = 3;
  if (cat === 'mtb') singleTol = 100;
  else if (width >= 45) singleTol = 45;
  else if (width >= 40) singleTol = 25;
  else if (width >= 35) singleTol = 10;
  if (cat === 'road') singleTol = Math.min(singleTol, 2);

  let penalty =
    Math.max(0, gravel - gravelTol) * 1.8 + Math.max(0, single - singleTol) * 3;

  // Puncture exposure on rough ground without tubeless.
  if (!bike.isTubeless && unpaved >= 20 && cat !== 'mtb') penalty += 8;

  // Overkill in the other direction: an MTB on pure tarmac is slow, not unsafe.
  if (cat === 'mtb' && unpaved < 10) penalty += 10;

  // Respect the detailed per-sector suitability assessment as a floor.
  if (terrain.suitabilityLevel === 'technical-caution') penalty = Math.max(penalty, 35);
  else if (terrain.suitabilityLevel === 'good-with-care') penalty = Math.max(penalty, 12);

  const score = clamp(100 - penalty);
  const catLabel = cat
    ? isFr
      ? { road: 'Route', gravel: 'Gravel', mtb: 'VTT', urban: 'Ville', touring: 'Rando' }[cat]
      : { road: 'Road', gravel: 'Gravel', mtb: 'MTB', urban: 'City', touring: 'Touring' }[cat]
    : bike.name || (isFr ? 'Vélo' : 'Bike');
  const surface = !terrain.hasSurfaceData
    ? isFr
      ? 'surface supposée goudron'
      : 'surface assumed paved'
    : unpaved < 1
    ? isFr
      ? '100% goudron'
      : '100% paved'
    : isFr
    ? `${Math.round(unpaved)}% chemins`
    : `${Math.round(unpaved)}% unpaved`;
  const note = `${catLabel} ${Math.round(width)} mm · ${surface}`;

  let tip: string | undefined;
  if (score < 92) {
    if (cat === 'mtb' && unpaved < 10) {
      tip = isFr ? 'Un vélo route ou gravel irait plus vite ici' : 'A road or gravel bike would be faster here';
    } else if (single > singleTol) {
      tip = isFr ? 'Prenez un VTT ou des pneus ≥ 45 mm' : 'Take an MTB or ≥ 45 mm tyres';
    } else if (gravel > gravelTol) {
      const needed = gravel > 70 ? 45 : gravel > 45 ? 40 : gravel > 25 ? 35 : 32;
      tip = isFr ? `Passez à des pneus ≥ ${needed} mm` : `Switch to ≥ ${needed} mm tyres`;
    } else if (!bike.isTubeless && unpaved >= 20) {
      tip = isFr ? 'Emportez chambres et rustines' : 'Carry spare tubes and a patch kit';
    } else {
      tip = isFr ? 'Roulez prudemment sur les secteurs techniques' : 'Take the technical sectors steady';
    }
  }
  return { score, note, tip };
}

function scoreEffort(e: RideReadinessInput['effort'], isFr: boolean) {
  const IF = Math.max(0, e.ftpPercent) / 100;
  const hours = Math.max(0.1, e.movingHours);
  const tss = Math.round(hours * IF * IF * 100);
  const levelFactor = e.riderLevel === 'pro' ? 1.5 : e.riderLevel === 'occasional' ? 0.7 : 1;

  // Sustained intensity above endurance (0.70 IF) scales with duration.
  const intensityPen = Math.max(0, IF - 0.70) * 135 * clamp(hours, 0.5, 1.5);
  // Overall load (TSS): comfortable up to ~70 for a regular rider, then scales smoothly.
  const loadStart = 70 * levelFactor;
  const loadPen = clamp((tss - loadStart) * (0.24 / levelFactor), 0, 55);
  const score = clamp(100 - (intensityPen + loadPen));

  const zone = e.powerZone ? `${e.powerZone} · ` : '';
  const note = `${zone}${formatHours(hours)} · ${Math.round(e.ftpPercent)}% FTP`;
  let tip: string | undefined;
  if (score < 90) {
    tip =
      intensityPen >= loadPen
        ? isFr
          ? 'Baissez l’allure d’une zone'
          : 'Ease the pace by one zone'
        : isFr
        ? 'Raccourcissez la trace ou prévoyez une pause longue'
        : 'Shorten the route or plan a long stop';
  }
  return { score, note, tip };
}

function scoreChecklist(c: RideReadinessInput['checklist'], isFr: boolean) {
  if (c.total <= 0) {
    return {
      score: 100,
      applicable: false,
      note: isFr ? 'Aucune check-list' : 'No checklist',
      tip: undefined as string | undefined,
    };
  }
  const critLeft = Math.max(0, c.criticalTotal - c.criticalChecked);
  const nonCritTotal = Math.max(0, c.total - c.criticalTotal);
  const nonCritLeft = Math.max(0, nonCritTotal - (c.checked - c.criticalChecked));
  let score: number;
  if (c.criticalTotal > 0 && nonCritTotal > 0) {
    score = 100 - (critLeft / c.criticalTotal) * 70 - (nonCritLeft / nonCritTotal) * 30;
  } else {
    score = (c.checked / c.total) * 100;
  }
  score = clamp(score);
  const note = isFr
    ? `${c.checked} sur ${c.total} cochés${critLeft > 0 ? ` · ${critLeft} essentiel${critLeft > 1 ? 's' : ''}` : ''}`
    : `${c.checked} of ${c.total} checked${critLeft > 0 ? ` · ${critLeft} essential left` : ''}`;
  const left = c.total - c.checked;
  const tip =
    left === 0
      ? undefined
      : critLeft > 0
      ? isFr
        ? `Cochez ${critLeft} élément${critLeft > 1 ? 's' : ''} essentiel${critLeft > 1 ? 's' : ''}`
        : `Tick ${critLeft} essential item${critLeft > 1 ? 's' : ''}`
      : isFr
      ? `Finissez la check-list (${left} restant${left > 1 ? 's' : ''})`
      : `Finish your checklist (${left} left)`;
  return { score, applicable: true, note, tip };
}

function scoreLight(l: RideReadinessInput['light'], isFr: boolean) {
  const night = clamp(l.nightPercent);
  const twilight = clamp(l.twilightPercent);
  const score = clamp(100 - (night * 0.55 + twilight * 0.2));
  const daylight = clamp(100 - night - twilight);
  const note =
    night >= 1
      ? isFr
        ? `${Math.round(night)}% de nuit`
        : `${Math.round(night)}% in the dark`
      : twilight >= 1
      ? isFr
        ? `${Math.round(twilight)}% pénombre`
        : `${Math.round(twilight)}% twilight`
      : isFr
      ? `${Math.round(daylight)}% de jour`
      : `${Math.round(daylight)}% daylight`;
  const tip =
    score < 92
      ? isFr
        ? 'Partez plus tôt ou chargez vos éclairages'
        : 'Leave earlier or charge your lights'
      : undefined;
  return { score, note, tip };
}

function scoreRoute(r: RideReadinessInput['route'], isFr: boolean) {
  const base =
    r.worstSeverity === 'critical' ? 30 : r.worstSeverity === 'warning' ? 65 : r.worstSeverity === 'info' ? 88 : 100;
  const extras = Math.max(0, r.issueCount - 1) * 6;
  const score = clamp(base - extras);
  const note =
    r.worstSeverity === 'clear'
      ? isFr
        ? 'Aucun point bloquant'
        : 'No blockers'
      : r.issueCount > 0
      ? isFr
        ? `${r.issueCount} point${r.issueCount > 1 ? 's' : ''} à vérifier`
        : `${r.issueCount} issue${r.issueCount > 1 ? 's' : ''} flagged`
      : isFr
      ? 'Info à noter'
      : 'Minor note';
  const tip =
    score < 90
      ? isFr
        ? 'Réglez le point signalé sur la trace'
        : 'Sort the flagged stop or water gap'
      : undefined;
  return { score, note, tip };
}

// ── main ───────────────────────────────────────────────────────────────────

export function computeRideReadiness(input: RideReadinessInput): RideReadiness {
  const isFr = input.lang === 'fr';

  const weather = scoreWeather(input.weather, isFr);
  const terrain = scoreTerrain(input.bike, input.terrain, isFr);
  const effort = scoreEffort(input.effort, isFr);
  const checklist = scoreChecklist(input.checklist, isFr);
  const light = scoreLight(input.light, isFr);
  const route = scoreRoute(input.route, isFr);

  const raw: Array<Omit<ReadinessFactor, 'weight' | 'pointsLost'>> = [
    { id: 'weather', label: isFr ? 'Météo' : 'Weather', applicable: true, ...weather },
    { id: 'terrain', label: isFr ? 'Vélo & terrain' : 'Bike & terrain', applicable: true, ...terrain },
    { id: 'effort', label: isFr ? 'Effort' : 'Effort', applicable: true, ...effort },
    { id: 'checklist', label: isFr ? 'Check-list' : 'Checklist', ...checklist },
    { id: 'light', label: isFr ? 'Lumière' : 'Daylight', applicable: true, ...light },
    { id: 'route', label: isFr ? 'Trace & arrêts' : 'Route & stops', applicable: true, ...route },
  ];

  const totalWeight = raw.reduce((s, f) => s + (f.applicable ? FACTOR_WEIGHTS[f.id] : 0), 0) || 1;
  const factors: ReadinessFactor[] = raw.map((f) => {
    const weight = f.applicable ? FACTOR_WEIGHTS[f.id] / totalWeight : 0;
    const score = Math.round(f.score);
    return { ...f, score, weight, pointsLost: weight * (100 - score) };
  });

  const weighted = factors.reduce((s, f) => s + f.weight * f.score, 0);
  let score = Math.round(weighted);
  let capReason: string | undefined;

  // Smooth weakest-link drag: a low factor (< 50) pulls the score down proportionally
  // instead of snapping to a hard ceiling (44 / 74), preserving granularity.
  const applicable = factors.filter((f) => f.applicable);
  const weakest = applicable.reduce((m, f) => (f.score < m.score ? f : m), applicable[0]);
  if (weakest && weakest.score < 50) {
    const drag = Math.round((50 - weakest.score) * 0.45);
    if (drag >= 2) {
      score = Math.max(weakest.score, score - drag);
      capReason = isFr
        ? `Freiné par ${weakest.label.toLowerCase()} (${weakest.score}/100)`
        : `Pulled down by ${weakest.label.toLowerCase()} (${weakest.score}/100)`;
    }
  }
  if (input.goStatus === 'NO-GO' && score > 40) {
    score = 40;
    capReason = isFr ? 'Conditions de vent sévères' : 'Severe wind conditions';
  }
  score = clamp(score);

  const level = getReadinessLevel(score);
  const label =
    level === 'good-to-go'
      ? isFr
        ? 'Prêt à rouler'
        : 'Good to go'
      : level === 'worth-tweak'
      ? isFr
        ? 'À ajuster'
        : 'Worth a tweak'
      : isFr
      ? 'À revoir'
      : 'Needs a change';
  const summary =
    level === 'good-to-go'
      ? isFr
        ? 'Les conditions sont alignées. Vous pouvez y aller.'
        : 'Conditions line up. Commit to it.'
      : level === 'worth-tweak'
      ? isFr
        ? 'Faisable — un ou deux ajustements la rendront meilleure.'
        : 'Rideable. A tweak or two will make it better.'
      : isFr
      ? 'Trop de points à revoir avant de vous engager.'
      : 'Too much is off. Adjust before you commit.';

  // Biggest single lift, among factors that offer an actionable tip.
  const liftable = factors
    .filter((f) => f.applicable && f.tip && f.pointsLost >= 1)
    .sort((a, b) => b.pointsLost - a.pointsLost)[0];
  const topLift = liftable
    ? { factorId: liftable.id, tip: liftable.tip!, gain: Math.max(1, Math.round(liftable.pointsLost)) }
    : undefined;

  return { score, level, label, summary, factors, topLift, capReason };
}
