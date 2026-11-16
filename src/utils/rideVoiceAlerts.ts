import { CueSheetEntry } from './cueSheet';
import { haversineDistanceMeters } from '../services/overpassCorridor';
import { StageAmenity } from '../types/amenities';

export type RideAlertKind = 'stop-approach' | 'stop-arrival' | 'turn' | 'fuel' | 'test';

export interface RideAlertEvent {
  id: string;
  kind: RideAlertKind;
  title: string;
  spokenText: string;
  distanceMeters?: number;
}

export interface RouteProjectionResult {
  distanceCoveredKm: number;
  distanceRemainingKm: number;
  offRouteMeters: number;
  progressPct: number;
}

export interface NextNavigationTargets {
  nextTurn: CueSheetEntry | null;
  distanceToTurnKm: number | null;
  nextStop: CueSheetEntry | null;
  distanceToStopKm: number | null;
}

export interface FuelingIntervals {
  drinkIntervalMin: number;
  carbIntervalMin: number;
  primaryCueIntervalMin: number;
}

/**
 * Computes physiological drink and carb reminder intervals (in minutes)
 * from the route's hydration and carbohydrate targets.
 */
export function computeFuelingIntervals(params: {
  targetFluidMlPerHr: number;
  carbTargetPerHour: number;
  isShortRide?: boolean;
}): FuelingIntervals {
  const { targetFluidMlPerHr, carbTargetPerHour, isShortRide = false } = params;

  if (isShortRide) {
    return {
      drinkIntervalMin: 20,
      carbIntervalMin: 0,
      primaryCueIntervalMin: 20,
    };
  }

  const drinkIntervalMin =
    targetFluidMlPerHr >= 750 ? 12 : targetFluidMlPerHr >= 550 ? 15 : 20;

  const carbIntervalMin =
    carbTargetPerHour >= 75 ? 20 : carbTargetPerHour >= 45 ? 25 : carbTargetPerHour > 0 ? 30 : 0;

  const primaryCueIntervalMin =
    carbIntervalMin > 0 ? Math.min(drinkIntervalMin, carbIntervalMin) : drinkIntervalMin;

  return {
    drinkIntervalMin,
    carbIntervalMin,
    primaryCueIntervalMin,
  };
}

/**
 * Projects a live GPS coordinate onto the nearest segment of the route polyline
 * to estimate distance covered, distance remaining, and off-route offset.
 */
export function projectPositionOntoRoute(
  lat: number,
  lng: number,
  coords: [number, number][],
  totalDistanceKm: number
): RouteProjectionResult {
  const safeTotalKm = Math.max(0.1, totalDistanceKm || 0);
  if (!coords || coords.length === 0) {
    return {
      distanceCoveredKm: 0,
      distanceRemainingKm: safeTotalKm,
      offRouteMeters: 0,
      progressPct: 0,
    };
  }

  if (coords.length === 1) {
    const d = haversineDistanceMeters(lat, lng, coords[0][0], coords[0][1]);
    return {
      distanceCoveredKm: 0,
      distanceRemainingKm: safeTotalKm,
      offRouteMeters: Math.round(d),
      progressPct: 0,
    };
  }

  let bestProjKm = 0;
  let bestDistMeters = Infinity;
  const cumKm: number[] = new Array(coords.length).fill(0);

  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const segM = haversineDistanceMeters(a[0], a[1], b[0], b[1]);
    cumKm[i] = cumKm[i - 1] + segM / 1000;

    const midLat = (a[0] + b[0]) * 0.5;
    const cosLat = Math.max(0.01, Math.cos((midLat * Math.PI) / 180));
    const dx = (b[1] - a[1]) * cosLat;
    const dy = b[0] - a[0];
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      const px = (lng - a[1]) * cosLat;
      const py = lat - a[0];
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }

    const projLat = a[0] + t * (b[0] - a[0]);
    const projLng = a[1] + t * (b[1] - a[1]);
    const distM = haversineDistanceMeters(lat, lng, projLat, projLng);

    if (distM < bestDistMeters) {
      bestDistMeters = distM;
      bestProjKm = cumKm[i - 1] + t * (segM / 1000);
    }
  }

  const polylineTotalKm = cumKm[coords.length - 1];
  const scale = polylineTotalKm > 0.05 ? safeTotalKm / polylineTotalKm : 1;
  const distanceCoveredKm = Math.min(
    safeTotalKm,
    Math.max(0, Math.round(bestProjKm * scale * 100) / 100)
  );
  const distanceRemainingKm = Math.max(
    0,
    Math.round((safeTotalKm - distanceCoveredKm) * 100) / 100
  );
  const progressPct = Math.min(100, Math.max(0, (distanceCoveredKm / safeTotalKm) * 100));

  return {
    distanceCoveredKm,
    distanceRemainingKm,
    offRouteMeters: Math.round(bestDistMeters),
    progressPct,
  };
}

/**
 * Finds the next upcoming turn cue and next upcoming resupply/via stop
 * relative to the rider's current distance covered along the route.
 */
export function findNextStopAndTurn(
  distanceCoveredKm: number,
  cueEntries: CueSheetEntry[]
): NextNavigationTargets {
  let nextTurn: CueSheetEntry | null = null;
  let distanceToTurnKm: number | null = null;
  let nextStop: CueSheetEntry | null = null;
  let distanceToStopKm: number | null = null;

  for (const entry of cueEntries) {
    if (entry.distKm + 0.02 < distanceCoveredKm) continue;
    const deltaKm = Math.max(0, entry.distKm - distanceCoveredKm);

    if (entry.direction === 'resupply' || entry.direction === 'waypoint') {
      if (!nextStop) {
        nextStop = entry;
        distanceToStopKm = Math.round(deltaKm * 100) / 100;
      }
    } else if (entry.direction !== 'depart') {
      if (!nextTurn) {
        nextTurn = entry;
        distanceToTurnKm = Math.round(deltaKm * 100) / 100;
      }
    }

    if (nextTurn && nextStop) break;
  }

  return {
    nextTurn,
    distanceToTurnKm,
    nextStop,
    distanceToStopKm,
  };
}

function getStopCategorySpeechLabel(
  amenity: StageAmenity | undefined,
  lang: 'en' | 'fr'
): string {
  const isFr = lang === 'fr';
  if (!amenity) return isFr ? 'Arrêt prévu' : 'Planned stop';
  switch (amenity.category) {
    case 'water':
      return isFr ? "Point d'eau" : 'Water stop';
    case 'cemetery':
      return isFr ? "Point d'eau cimetière" : 'Cemetery water stop';
    case 'food':
      return isFr ? 'Ravitaillement' : 'Food stop';
    case 'mechanix':
      return isFr ? 'Atelier vélo ou abri' : 'Bike shop or shelter';
    case 'essentials':
      return isFr ? 'Services' : 'Essentials stop';
    case 'bailout':
      return isFr ? 'Gare de repli' : 'Train station';
  }
}

/**
 * Evaluates upcoming stops and turns against proximity thresholds and
 * returns deduplicated alerts that have not yet been spoken.
 */
export function evaluateProximityAlerts(params: {
  distanceCoveredKm: number;
  cueEntries: CueSheetEntry[];
  triggeredKeys: Set<string>;
  lang: 'en' | 'fr';
}): { alerts: RideAlertEvent[]; newlyTriggeredKeys: string[] } {
  const { distanceCoveredKm, cueEntries, triggeredKeys, lang } = params;
  const isFr = lang === 'fr';
  const alerts: RideAlertEvent[] = [];
  const newlyTriggeredKeys: string[] = [];

  for (let i = 0; i < cueEntries.length; i++) {
    const entry = cueEntries[i];
    const deltaKm = entry.distKm - distanceCoveredKm;
    if (deltaKm < -0.05) continue;

    if (entry.direction === 'resupply' || entry.direction === 'waypoint') {
      const baseId = entry.amenity?.id || `${entry.shortName}-${entry.distKm.toFixed(2)}`;
      const stopLabel = getStopCategorySpeechLabel(entry.amenity, lang);
      const stopName = entry.amenity?.name || entry.shortName;

      // 1 km approach alert
      const approachKey = `stop-1km:${baseId}`;
      if (deltaKm <= 1.05 && deltaKm > 0.25 && !triggeredKeys.has(approachKey)) {
        newlyTriggeredKeys.push(approachKey);
        alerts.push({
          id: approachKey,
          kind: 'stop-approach',
          title: isFr ? `${stopLabel} dans 1 km` : `${stopLabel} in 1 km`,
          spokenText: isFr
            ? `${stopLabel} dans 1 kilomètre : ${stopName}.`
            : `${stopLabel} in 1 kilometer: ${stopName}.`,
          distanceMeters: Math.round(deltaKm * 1000),
        });
      }

      // Arrival alert (within 200 m)
      const arrivalKey = `stop-arr:${baseId}`;
      if (deltaKm <= 0.2 && deltaKm >= -0.05 && !triggeredKeys.has(arrivalKey)) {
        newlyTriggeredKeys.push(arrivalKey);
        alerts.push({
          id: arrivalKey,
          kind: 'stop-arrival',
          title: isFr ? `${stopLabel} à proximité` : `${stopLabel} ahead`,
          spokenText: isFr
            ? `${stopLabel} juste devant : ${stopName}.`
            : `${stopLabel} right ahead: ${stopName}.`,
          distanceMeters: Math.max(0, Math.round(deltaKm * 1000)),
        });
      }
    } else if (entry.direction !== 'depart') {
      // Turn cue alert (within 250 m)
      const turnKey = `turn:${i}:${entry.distKm.toFixed(2)}`;
      if (deltaKm <= 0.28 && deltaKm > 0.02 && !triggeredKeys.has(turnKey)) {
        newlyTriggeredKeys.push(turnKey);
        const meters = Math.max(50, Math.round((deltaKm * 1000) / 50) * 50);
        alerts.push({
          id: turnKey,
          kind: 'turn',
          title: entry.instruction,
          spokenText: isFr
            ? `Dans ${meters} mètres, ${entry.instruction}.`
            : `In ${meters} meters, ${entry.instruction}.`,
          distanceMeters: meters,
        });
      }
    }
  }

  return { alerts, newlyTriggeredKeys };
}

/**
 * Formats a concise fueling / hydration voice reminder.
 */
export function formatFuelingVoiceCue(
  type: 'drink' | 'carb' | 'both',
  lang: 'en' | 'fr'
): string {
  const isFr = lang === 'fr';
  if (type === 'drink') {
    return isFr
      ? 'Rappel hydratation : buvez quelques gorgées.'
      : 'Hydration cue: take a few sips from your bottle.';
  }
  if (type === 'carb') {
    return isFr
      ? 'Rappel ravitaillement : prenez une portion de glucides.'
      : 'Fueling cue: take a carb bite or gel.';
  }
  return isFr
    ? 'Rappel hydratation et énergie : buvez et prenez une bouchée.'
    : 'Drink and fuel cue: sip water and take a carb bite.';
}

/**
 * Builds a realistic test alert for the "Simulate / Test Alert" button.
 */
export function buildSimulatedAlert(
  lang: 'en' | 'fr',
  nextStop: CueSheetEntry | null,
  nextTurn: CueSheetEntry | null
): RideAlertEvent {
  const isFr = lang === 'fr';
  if (nextStop) {
    const label = getStopCategorySpeechLabel(nextStop.amenity, lang);
    const name = nextStop.amenity?.name || nextStop.shortName;
    return {
      id: `sim-stop-${Date.now()}`,
      kind: 'test',
      title: isFr ? `Test : ${label} dans 1 km` : `Test: ${label} in 1 km`,
      spokenText: isFr
        ? `${label} dans 1 kilomètre : ${name}. Pensez aussi à boire.`
        : `${label} in 1 kilometer: ${name}. Also remember to take a sip.`,
      distanceMeters: 1000,
    };
  }
  if (nextTurn) {
    return {
      id: `sim-turn-${Date.now()}`,
      kind: 'test',
      title: isFr ? `Test : ${nextTurn.instruction}` : `Test: ${nextTurn.instruction}`,
      spokenText: isFr
        ? `Dans 250 mètres, ${nextTurn.instruction}.`
        : `In 250 meters, ${nextTurn.instruction}.`,
      distanceMeters: 250,
    };
  }
  return {
    id: `sim-fuel-${Date.now()}`,
    kind: 'test',
    title: isFr ? 'Test : Rappel hydratation & point d’eau' : 'Test: Water & fueling cue',
    spokenText: isFr
      ? "Point d'eau dans 1 kilomètre. Buvez quelques gorgées."
      : 'Water stop in 1 kilometer. Take a few sips from your bottle.',
    distanceMeters: 1000,
  };
}

/**
 * Plays a gentle two-tone Web Audio chime without any external audio assets.
 */
export function playGentleChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playTone(587.33, 0, 0.14); // D5
    playTone(880, 0.11, 0.22); // A5

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Speaks a concise ride cue using the browser's built-in SpeechSynthesis API.
 * Returns true if speech synthesis was triggered.
 */
export function speakRideCue(
  text: string,
  options: { lang: 'en' | 'fr'; muted?: boolean; chime?: boolean }
): boolean {
  const { lang, muted = false, chime = true } = options;
  if (muted || !text.trim()) return false;

  if (chime) {
    playGentleChime();
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    const voices = synth.getVoices ? synth.getVoices() : [];
    const targetPrefix = lang === 'fr' ? 'fr' : 'en';
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(targetPrefix)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
