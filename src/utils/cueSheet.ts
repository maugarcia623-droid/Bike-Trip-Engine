import { RouteCueDirection, RouteCueStep, RouteParams } from '../types/trip';
import { StageAmenity } from '../types/amenities';
import { calculateAmenityEta, haversineDistanceMeters } from '../services/overpassCorridor';

/**
 * Estimates the round-trip road detour in kilometers (to leave the route, visit the POI, and rejoin).
 * For example, a 700 m perpendicular offset yields +1.4 km.
 */
export function estimateAmenityDetourKm(detourMeters: number): number {
  if (!Number.isFinite(detourMeters) || detourMeters < 25) {
    return 0;
  }
  return Math.max(0.1, Math.round(((detourMeters * 2) / 1000) * 10) / 10);
}

/**
 * Formats a concise localized label for an amenity category.
 */
export function formatAmenityCategoryLabel(
  category: StageAmenity['category'],
  lang: 'en' | 'fr' = 'en'
): string {
  const isFr = lang === 'fr';
  switch (category) {
    case 'water':
      return isFr ? "Point d'eau" : 'Water';
    case 'cemetery':
      return isFr ? 'Cimetière (Eau)' : 'Cemetery Water';
    case 'food':
      return isFr ? 'Ravitaillement' : 'Food';
    case 'mechanix':
      return isFr ? 'Atelier / Abri' : 'Repair / Shelter';
  }
}

/**
 * Standard Garmin/GPX <sym> icon names recognized by bike computers & map apps.
 */
export function getAmenityGpxSymbol(category: StageAmenity['category']): string {
  switch (category) {
    case 'water':
    case 'cemetery':
      return 'Drinking Water';
    case 'food':
      return 'Restaurant';
    case 'mechanix':
      return 'Repair Service';
  }
}

/**
 * Official Garmin TrainingCenterDatabasev2 PointType_t enum for resupply stops.
 */
export function getAmenityTcxPointType(
  category: StageAmenity['category']
): 'Water' | 'Food' | 'First Aid' | 'Generic' {
  switch (category) {
    case 'water':
    case 'cemetery':
      return 'Water';
    case 'food':
      return 'Food';
    case 'mechanix':
      return 'First Aid';
  }
}

/**
 * Official Garmin TrainingCenterDatabasev2 PointType_t enum for turn-by-turn maneuvers.
 */
export function getCueDirectionTcxPointType(
  direction: RouteCueDirection
): 'Left' | 'Right' | 'Straight' | 'Generic' | 'Water' | 'Food' {
  switch (direction) {
    case 'left':
    case 'slight-left':
    case 'sharp-left':
      return 'Left';
    case 'right':
    case 'slight-right':
    case 'sharp-right':
      return 'Right';
    case 'straight':
      return 'Straight';
    default:
      return 'Generic';
  }
}

function mapOsrmModifierToDirection(
  type: string,
  modifier?: string
): RouteCueDirection {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (type === 'roundabout' || type === 'rotary') return 'roundabout';

  switch (modifier) {
    case 'left':
      return 'left';
    case 'slight left':
      return 'slight-left';
    case 'sharp left':
      return 'sharp-left';
    case 'right':
      return 'right';
    case 'slight right':
      return 'slight-right';
    case 'sharp right':
      return 'sharp-right';
    case 'straight':
    default:
      return 'straight';
  }
}

function buildOsrmInstruction(type: string, modifier?: string, streetName?: string): string {
  const road = streetName && streetName.trim() ? ` onto ${streetName.trim()}` : '';
  if (type === 'depart') {
    return streetName?.trim() ? `Depart on ${streetName.trim()}` : 'Depart';
  }
  if (type === 'arrive') {
    return 'Arrive at destination';
  }
  if (type === 'roundabout' || type === 'rotary') {
    return `Enter roundabout${road}`;
  }

  const actionMap: Record<string, string> = {
    left: 'Turn left',
    'slight left': 'Keep left',
    'sharp left': 'Sharp left',
    right: 'Turn right',
    'slight right': 'Keep right',
    'sharp right': 'Sharp right',
    straight: 'Continue straight',
    uturn: 'Make a U-turn',
  };

  if (type === 'fork') {
    const forkSide = modifier?.includes('left') ? 'left' : 'right';
    return `Take ${forkSide} fork${road}`;
  }

  const verb = (modifier && actionMap[modifier]) || 'Continue';
  return `${verb}${road}`;
}

/**
 * Extracts compact turn-by-turn cue steps from OSRM `routes[0].legs` (when `steps=true`).
 */
export function parseOsrmRouteSteps(legs: any[]): RouteCueStep[] {
  if (!Array.isArray(legs) || legs.length === 0) return [];

  const steps: RouteCueStep[] = [];
  let runningMeters = 0;

  for (let legIdx = 0; legIdx < legs.length; legIdx++) {
    const leg = legs[legIdx];
    const rawSteps = Array.isArray(leg?.steps) ? leg.steps : [];

    for (let sIdx = 0; sIdx < rawSteps.length; sIdx++) {
      const step = rawSteps[sIdx];
      const maneuver = step?.maneuver;
      const loc = maneuver?.location;
      if (!Array.isArray(loc) || loc.length < 2) {
        runningMeters += step?.distance || 0;
        continue;
      }

      const type: string = maneuver?.type || 'continue';
      const modifier: string | undefined = maneuver?.modifier;
      const streetName: string = typeof step?.name === 'string' ? step.name.trim() : '';
      const distKm = Math.round((runningMeters / 1000) * 10) / 10;

      // Skip intermediate leg arrive/depart noise except first depart & final arrive
      const isFirstDepart = legIdx === 0 && type === 'depart';
      const isFinalArrive = legIdx === legs.length - 1 && type === 'arrive';
      const isIntermediateStop = legIdx > 0 && type === 'depart';

      if (type === 'arrive' && !isFinalArrive) {
        runningMeters += step?.distance || 0;
        continue;
      }

      // Skip trivial straight continuations without a meaningful maneuver or name change
      const isTrivialContinue =
        (type === 'continue' || type === 'new name') &&
        (!modifier || modifier === 'straight') &&
        !streetName;

      if (!isTrivialContinue || isFirstDepart || isFinalArrive || isIntermediateStop) {
        const direction = isIntermediateStop
          ? 'waypoint'
          : mapOsrmModifierToDirection(type, modifier);
        const instruction = isIntermediateStop
          ? `Continue past intermediate stop${streetName ? ` onto ${streetName}` : ''}`
          : buildOsrmInstruction(type, modifier, streetName);

        steps.push({
          lat: Number(loc[1].toFixed(6)),
          lng: Number(loc[0].toFixed(6)),
          distKm,
          instruction,
          direction,
          ...(streetName ? { streetName } : {}),
        });
      }

      runningMeters += step?.distance || 0;
    }
  }

  return steps;
}

function initialBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function signedBearingDelta(fromDeg: number, toDeg: number): number {
  let delta = ((toDeg - fromDeg + 540) % 360) - 180;
  return delta;
}

/**
 * Synthesizes geometric turn-by-turn cues directly from a polyline when OSRM steps
 * are not stored (e.g., uploaded GPX tracks or preset routes).
 */
export function synthesizeCueSheetFromCoordinates(
  coords: [number, number][],
  totalDistanceKm: number,
  originLabel?: string,
  destLabel?: string
): RouteCueStep[] {
  if (!coords || coords.length < 2) return [];

  const cumMeters: number[] = [0];
  let rawTotalMeters = 0;
  for (let i = 1; i < coords.length; i++) {
    rawTotalMeters += haversineDistanceMeters(
      coords[i - 1][0],
      coords[i - 1][1],
      coords[i][0],
      coords[i][1]
    );
    cumMeters.push(rawTotalMeters);
  }

  const targetMeters = (totalDistanceKm || rawTotalMeters / 1000 || 1) * 1000;
  const scale = rawTotalMeters > 10 ? targetMeters / rawTotalMeters : 1;

  const steps: RouteCueStep[] = [
    {
      lat: coords[0][0],
      lng: coords[0][1],
      distKm: 0,
      instruction: `Depart ${originLabel || 'Start'}`,
      direction: 'depart',
    },
  ];

  let lastCueMeters = 0;
  const minCueSpacingMeters = 250;

  for (let i = 1; i < coords.length - 1; i++) {
    const currMeters = cumMeters[i] * scale;
    if (currMeters - lastCueMeters < minCueSpacingMeters) continue;

    // Look back and ahead >= 45m where possible to filter single-vertex GPS jitter
    let prevIdx = i - 1;
    while (prevIdx > 0 && (cumMeters[i] - cumMeters[prevIdx]) < 45) {
      prevIdx--;
    }
    let nextIdx = i + 1;
    while (nextIdx < coords.length - 1 && (cumMeters[nextIdx] - cumMeters[i]) < 45) {
      nextIdx++;
    }

    const bIn = initialBearingDeg(
      coords[prevIdx][0],
      coords[prevIdx][1],
      coords[i][0],
      coords[i][1]
    );
    const bOut = initialBearingDeg(
      coords[i][0],
      coords[i][1],
      coords[nextIdx][0],
      coords[nextIdx][1]
    );
    const delta = signedBearingDelta(bIn, bOut);
    const absDelta = Math.abs(delta);

    if (absDelta >= 35) {
      let direction: RouteCueDirection;
      let instruction: string;

      if (delta > 0) {
        if (absDelta >= 115) {
          direction = 'sharp-right';
          instruction = 'Sharp right';
        } else if (absDelta >= 55) {
          direction = 'right';
          instruction = 'Turn right';
        } else {
          direction = 'slight-right';
          instruction = 'Keep right';
        }
      } else {
        if (absDelta >= 115) {
          direction = 'sharp-left';
          instruction = 'Sharp left';
        } else if (absDelta >= 55) {
          direction = 'left';
          instruction = 'Turn left';
        } else {
          direction = 'slight-left';
          instruction = 'Keep left';
        }
      }

      steps.push({
        lat: coords[i][0],
        lng: coords[i][1],
        distKm: Math.round((currMeters / 1000) * 10) / 10,
        instruction,
        direction,
      });
      lastCueMeters = currMeters;
    }
  }

  const last = coords[coords.length - 1];
  steps.push({
    lat: last[0],
    lng: last[1],
    distKm: Math.round((targetMeters / 1000) * 10) / 10,
    instruction: `Arrive at ${destLabel || 'Finish'}`,
    direction: 'arrive',
  });

  return steps;
}

export interface CueSheetEntry extends RouteCueStep {
  shortName: string;
  cmt: string;
  desc: string;
  sym: string;
  typeLabel: string;
  tcxPointType: 'Water' | 'Food' | 'First Aid' | 'Left' | 'Right' | 'Straight' | 'Generic';
  amenity?: StageAmenity;
}

/**
 * Formats a concise, informative cue note for a pinned resupply/safety stop.
 */
export function formatAmenityCueNote(
  amenity: StageAmenity,
  eta: string,
  lang: 'en' | 'fr' = 'en'
): { cmt: string; desc: string } {
  const isFr = lang === 'fr';
  const catLabel = formatAmenityCategoryLabel(amenity.category, lang);
  const detourKm = estimateAmenityDetourKm(amenity.detourMeters);
  const detourText =
    amenity.detourMeters < 75
      ? isFr
        ? 'Sur la trace'
        : 'On route'
      : detourKm >= 0.1
      ? `+${amenity.detourMeters} m (${isFr ? `+${detourKm.toFixed(1)} km détour` : `+${detourKm.toFixed(1)} km detour`})`
      : `+${amenity.detourMeters} m`;

  const hoursPart = amenity.openingHours
    ? ` · ${isFr ? 'Horaires' : 'Hours'}: ${amenity.openingHours}`
    : '';

  const cmt = `km ${amenity.routeKm} · ${isFr ? 'Passage' : 'Est.'} ${eta} · ${detourText}${hoursPart}`;
  const actionHint =
    amenity.category === 'water' || amenity.category === 'cemetery'
      ? isFr
        ? 'Remplir les bidons'
        : 'Refill water bottles'
      : amenity.category === 'food'
      ? isFr
        ? 'Ravitaillement alimentation / eau'
        : 'Resupply food & water'
      : isFr
      ? 'Point mécanique / abri'
      : 'Bike repair / shelter stop';

  const desc = `[${catLabel}] ${amenity.name} — KM ${amenity.routeKm} (ETA ${eta}) · ${detourText}${hoursPart} · Cue: ${actionHint}`;
  return { cmt, desc };
}

/**
 * Builds the complete chronological cue sheet combining turn-by-turn directions,
 * intermediate via-points, and all pinned resupply/safety stops.
 */
export function buildStageCueSheet(params: {
  route: RouteParams;
  coords: [number, number][];
  pinnedAmenities?: StageAmenity[];
  departureTime?: string;
  speedKmH?: number;
  dayPrefix?: string;
  lang?: 'en' | 'fr';
}): CueSheetEntry[] {
  const {
    route,
    coords,
    pinnedAmenities = [],
    departureTime = '08:00',
    speedKmH = route.targetSpeedKmH || 24,
    dayPrefix,
    lang = 'en',
  } = params;

  const baseTurns =
    route.cueSheet && route.cueSheet.length >= 2
      ? route.cueSheet
      : synthesizeCueSheetFromCoordinates(
          coords,
          route.distanceKm || 30,
          route.origin,
          route.destination
        );

  const entries: CueSheetEntry[] = baseTurns.map((step) => ({
    ...step,
    shortName: dayPrefix ? `${dayPrefix} ${step.instruction}` : step.instruction,
    cmt: `KM ${step.distKm.toFixed(1)}`,
    desc: `${step.instruction} at KM ${step.distKm.toFixed(1)}`,
    sym:
      step.direction === 'depart'
        ? 'Flag, Green'
        : step.direction === 'arrive'
        ? 'Flag, Red'
        : 'Waypoint',
    typeLabel:
      step.direction === 'depart'
        ? 'Start'
        : step.direction === 'arrive'
        ? 'Finish'
        : 'Cue',
    tcxPointType: getCueDirectionTcxPointType(step.direction),
  }));

  // Add pinned resupply / safety stops
  for (const amenity of pinnedAmenities) {
    const eta = calculateAmenityEta(departureTime, amenity.routeKm, speedKmH);
    const { cmt, desc } = formatAmenityCueNote(amenity, eta, lang);
    const catLabel = formatAmenityCategoryLabel(amenity.category, lang);

    entries.push({
      lat: amenity.lat,
      lng: amenity.lon,
      distKm: amenity.routeKm,
      instruction: `Stop: ${amenity.name} (${catLabel})`,
      direction: 'resupply',
      shortName: dayPrefix ? `${dayPrefix} ${amenity.name}` : amenity.name,
      cmt,
      desc,
      sym: getAmenityGpxSymbol(amenity.category),
      typeLabel: catLabel,
      tcxPointType: getAmenityTcxPointType(amenity.category),
      amenity,
    });
  }

  // Add intermediate waypoints that are not already represented by a pinned amenity
  if (route.waypoints && route.waypoints.length > 0) {
    route.waypoints.forEach((wp, idx) => {
      if (!wp.coordinates) return;
      const matchesPinned = pinnedAmenities.some(
        (p) =>
          wp.sourceAmenityId === p.id ||
          wp.id === `wp-poi-${p.id}` ||
          haversineDistanceMeters(p.lat, p.lon, wp.coordinates![0], wp.coordinates![1]) < 60
      );
      if (matchesPinned) return;

      const distKm = wp.distanceFromStartKm ?? 0;
      const eta = calculateAmenityEta(departureTime, distKm, speedKmH);
      entries.push({
        lat: wp.coordinates[0],
        lng: wp.coordinates[1],
        distKm,
        instruction: `Via ${idx + 1}: ${wp.name}`,
        direction: 'waypoint',
        shortName: dayPrefix ? `${dayPrefix} Via ${idx + 1}: ${wp.name}` : `Via: ${wp.name}`,
        cmt: `KM ${distKm.toFixed(1)} · ETA ${eta}`,
        desc: `Intermediate stop ${idx + 1}: ${wp.name} (KM ${distKm.toFixed(1)}, ETA ${eta})`,
        sym: 'Flag, Blue',
        typeLabel: 'Waypoint',
        tcxPointType: 'Generic',
      });
    });
  }

  return entries.sort((a, b) => a.distKm - b.distKm);
}
