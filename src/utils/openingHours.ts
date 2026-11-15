export type ArrivalOpenStatus = 'open' | 'closing-soon' | 'closed' | 'unknown';

export interface ArrivalOpeningVerdict {
  status: ArrivalOpenStatus;
  badgeLabel: string;
  detailLabel: string;
  rawHours: string;
}

const DAY_INDEX_MAP: Record<string, number> = {
  mo: 0,
  tu: 1,
  we: 2,
  th: 3,
  fr: 4,
  sa: 5,
  su: 6,
};

const ALL_DAYS = new Set<number>([0, 1, 2, 3, 4, 5, 6]);

function truncateHours(raw: string, maxLen = 18): string {
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}

function formatMinutesAsHHMM(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveOsmTargetDay(targetDateStr?: string): number {
  let dateObj: Date | null = null;
  if (targetDateStr && /^\d{4}-\d{2}-\d{2}/.test(targetDateStr)) {
    const parsed = new Date(`${targetDateStr.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  if (!dateObj) {
    dateObj = new Date();
  }
  // JS getDay(): 0=Su..6=Sa -> OSM index: 0=Mo..6=Su
  return (dateObj.getDay() + 6) % 7;
}

function parseDaySelectors(prefix: string): {
  valid: boolean;
  days: Set<number>;
  hasExplicitDays: boolean;
  phOnly: boolean;
} {
  const trimmed = prefix.trim().toLowerCase();
  if (!trimmed) {
    return { valid: true, days: new Set(ALL_DAYS), hasExplicitDays: false, phOnly: false };
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const days = new Set<number>();
  let sawWeekday = false;
  let sawPh = false;

  for (const part of parts) {
    if (part === 'ph' || part === 'sh') {
      sawPh = true;
      continue;
    }
    if (part in DAY_INDEX_MAP) {
      days.add(DAY_INDEX_MAP[part]);
      sawWeekday = true;
      continue;
    }
    const rangeMatch = part.match(/^([a-z]{2})\s*-\s*([a-z]{2})$/);
    if (rangeMatch && rangeMatch[1] in DAY_INDEX_MAP && rangeMatch[2] in DAY_INDEX_MAP) {
      const start = DAY_INDEX_MAP[rangeMatch[1]];
      const end = DAY_INDEX_MAP[rangeMatch[2]];
      let cur = start;
      for (let step = 0; step < 7; step++) {
        days.add(cur);
        if (cur === end) break;
        cur = (cur + 1) % 7;
      }
      sawWeekday = true;
      continue;
    }
    // Unsupported selector (e.g., month/week ordinal or condition)
    return { valid: false, days: new Set(), hasExplicitDays: false, phOnly: false };
  }

  return {
    valid: true,
    days,
    hasExplicitDays: sawWeekday || sawPh,
    phOnly: !sawWeekday && sawPh,
  };
}

interface ParsedRule {
  days: Set<number>;
  hasExplicitDays: boolean;
  phOnly: boolean;
  isOff: boolean;
  intervals: Array<[number, number]>;
}

function parseSingleRule(ruleRaw: string): ParsedRule | null {
  const cleaned = ruleRaw.trim();
  if (!cleaned) return null;

  // Reject comments in quotes, sunrise/sunset keywords, fallback operators, or open "+" durations
  if (/["|+]/.test(cleaned) || /\b(sunrise|sunset|dawn|dusk)\b/i.test(cleaned)) {
    return null;
  }

  const lower = cleaned.toLowerCase();
  if (lower === '24/7' || lower === 'open') {
    return {
      days: new Set(ALL_DAYS),
      hasExplicitDays: false,
      phOnly: false,
      isOff: false,
      intervals: [[0, 1440]],
    };
  }
  if (lower === 'off' || lower === 'closed') {
    return {
      days: new Set(ALL_DAYS),
      hasExplicitDays: false,
      phOnly: false,
      isOff: true,
      intervals: [],
    };
  }

  // Split optional leading day selector from time/status selector
  const dayAndTimeMatch = cleaned.match(
    /^(?:([a-z,\-\s]+?)\s+)?(\d{1,2}:\d{2}\s*-.*|off|closed|open|24\/7)$/i
  );
  if (!dayAndTimeMatch) {
    return null;
  }

  const dayPart = dayAndTimeMatch[1] || '';
  const timePart = dayAndTimeMatch[2].trim().toLowerCase();

  const parsedDays = parseDaySelectors(dayPart);
  if (!parsedDays.valid) {
    return null;
  }

  if (timePart === 'off' || timePart === 'closed') {
    return {
      days: parsedDays.days,
      hasExplicitDays: parsedDays.hasExplicitDays,
      phOnly: parsedDays.phOnly,
      isOff: true,
      intervals: [],
    };
  }

  if (timePart === 'open' || timePart === '24/7') {
    return {
      days: parsedDays.days,
      hasExplicitDays: parsedDays.hasExplicitDays,
      phOnly: parsedDays.phOnly,
      isOff: false,
      intervals: [[0, 1440]],
    };
  }

  const intervalChunks = timePart
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (intervalChunks.length === 0) return null;

  const intervals: Array<[number, number]> = [];
  for (const chunk of intervalChunks) {
    const m = chunk.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h1 = Number(m[1]);
    const m1 = Number(m[2]);
    const h2 = Number(m[3]);
    const m2 = Number(m[4]);
    if (h1 > 24 || m1 > 59 || h2 > 24 || m2 > 59) return null;
    const startMin = h1 * 60 + m1;
    const endMin = h2 * 60 + m2;
    if (startMin === 0 && endMin === 0) return null;
    intervals.push([startMin, endMin]);
  }

  return {
    days: parsedDays.days,
    hasExplicitDays: parsedDays.hasExplicitDays,
    phOnly: parsedDays.phOnly,
    isOff: false,
    intervals,
  };
}

/**
 * Evaluates an OpenStreetMap `opening_hours` tag against the planned ride date
 * and the rider's arrival ETA (`HH:MM`).
 * Returns `null` when no `opening_hours` string is present.
 * Falls back cleanly to `status: 'unknown'` when a rule uses unsupported syntax.
 */
export function evaluateOpeningHoursAtArrival(
  openingHours: string | undefined,
  targetDateStr: string | undefined,
  arrivalTimeHHMM: string | undefined,
  lang: 'en' | 'fr' = 'en'
): ArrivalOpeningVerdict | null {
  if (!openingHours || !openingHours.trim()) {
    return null;
  }

  const rawHours = openingHours.replace(/\s+/g, ' ').trim();
  const isFr = lang === 'fr';

  if (rawHours.toLowerCase() === '24/7' || rawHours.toLowerCase() === 'mo-su 00:00-24:00') {
    return {
      status: 'open',
      badgeLabel: '24/7',
      detailLabel: isFr ? 'Ouvert 24h/24' : 'Open 24/7',
      rawHours,
    };
  }

  const etaMatch = arrivalTimeHHMM?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!etaMatch) {
    return {
      status: 'unknown',
      badgeLabel: truncateHours(rawHours),
      detailLabel: rawHours,
      rawHours,
    };
  }

  const etaHour = Number(etaMatch[1]);
  const etaMinute = Number(etaMatch[2]);
  if (etaHour > 23 || etaMinute > 59) {
    return {
      status: 'unknown',
      badgeLabel: truncateHours(rawHours),
      detailLabel: rawHours,
      rawHours,
    };
  }
  const arrivalMinutes = etaHour * 60 + etaMinute;
  const formattedEta = `${String(etaHour).padStart(2, '0')}:${String(etaMinute).padStart(2, '0')}`;

  const rawRules = rawHours
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean);

  if (rawRules.length === 0) {
    return null;
  }

  const parsedRules: ParsedRule[] = [];
  for (const r of rawRules) {
    const parsed = parseSingleRule(r);
    if (!parsed) {
      return {
        status: 'unknown',
        badgeLabel: truncateHours(rawHours),
        detailLabel: rawHours,
        rawHours,
      };
    }
    parsedRules.push(parsed);
  }

  const osmTargetDay = resolveOsmTargetDay(targetDateStr);
  let activeRule: ParsedRule | null = null;

  for (const rule of parsedRules) {
    if (rule.phOnly) {
      continue;
    }
    if (!rule.hasExplicitDays || rule.days.has(osmTargetDay)) {
      activeRule = rule;
    }
  }

  if (!activeRule) {
    return {
      status: 'closed',
      badgeLabel: isFr ? `Fermé à ${formattedEta}` : `Closed at ${formattedEta}`,
      detailLabel: isFr
        ? `Fermé ce jour (horaires : ${rawHours})`
        : `Closed on ride day (hours: ${rawHours})`,
      rawHours,
    };
  }

  if (activeRule.isOff || activeRule.intervals.length === 0) {
    return {
      status: 'closed',
      badgeLabel: isFr ? `Fermé à ${formattedEta}` : `Closed at ${formattedEta}`,
      detailLabel: isFr
        ? `Fermé à l'heure d'arrivée estimée (${formattedEta}) · ${rawHours}`
        : `Closed at estimated arrival (${formattedEta}) · ${rawHours}`,
      rawHours,
    };
  }

  if (
    activeRule.intervals.some(([startMin, endMin]) => startMin === 0 && endMin === 1440)
  ) {
    return {
      status: 'open',
      badgeLabel: '24/7',
      detailLabel: isFr ? 'Ouvert 24h/24' : 'Open 24/7',
      rawHours,
    };
  }

  for (const [startMin, endMin] of activeRule.intervals) {
    if (endMin > startMin) {
      if (arrivalMinutes >= startMin && arrivalMinutes < endMin) {
        const remainingMin = endMin - arrivalMinutes;
        const closingHHMM = formatMinutesAsHHMM(endMin);
        if (remainingMin <= 30 && endMin < 1440) {
          return {
            status: 'closing-soon',
            badgeLabel: isFr
              ? `Ferme bientôt (${closingHHMM})`
              : `Closing soon (${closingHHMM})`,
            detailLabel: isFr
              ? `Ferme dans ${remainingMin} min à ${closingHHMM} (arrivée ${formattedEta}) · ${rawHours}`
              : `Closes in ${remainingMin} min at ${closingHHMM} (arrival ${formattedEta}) · ${rawHours}`,
            rawHours,
          };
        }
        return {
          status: 'open',
          badgeLabel: isFr ? `Ouvert à ${formattedEta}` : `Open at ${formattedEta}`,
          detailLabel: isFr
            ? `Ouvert à ${formattedEta} (jusqu'à ${closingHHMM}) · ${rawHours}`
            : `Open at ${formattedEta} (until ${closingHHMM}) · ${rawHours}`,
          rawHours,
        };
      }
    } else if (endMin < startMin) {
      // Overnight interval (e.g. 18:00-02:00)
      if (arrivalMinutes >= startMin || arrivalMinutes < endMin) {
        const remainingMin =
          arrivalMinutes >= startMin
            ? 1440 - arrivalMinutes + endMin
            : endMin - arrivalMinutes;
        const closingHHMM = formatMinutesAsHHMM(endMin);
        if (remainingMin <= 30) {
          return {
            status: 'closing-soon',
            badgeLabel: isFr
              ? `Ferme bientôt (${closingHHMM})`
              : `Closing soon (${closingHHMM})`,
            detailLabel: isFr
              ? `Ferme dans ${remainingMin} min à ${closingHHMM} (arrivée ${formattedEta}) · ${rawHours}`
              : `Closes in ${remainingMin} min at ${closingHHMM} (arrival ${formattedEta}) · ${rawHours}`,
            rawHours,
          };
        }
        return {
          status: 'open',
          badgeLabel: isFr ? `Ouvert à ${formattedEta}` : `Open at ${formattedEta}`,
          detailLabel: isFr
            ? `Ouvert à ${formattedEta} (jusqu'à ${closingHHMM}) · ${rawHours}`
            : `Open at ${formattedEta} (until ${closingHHMM}) · ${rawHours}`,
          rawHours,
        };
      }
    }
  }

  return {
    status: 'closed',
    badgeLabel: isFr ? `Fermé à ${formattedEta}` : `Closed at ${formattedEta}`,
    detailLabel: isFr
      ? `Fermé à ${formattedEta} · ${rawHours}`
      : `Closed at ${formattedEta} · ${rawHours}`,
    rawHours,
  };
}
