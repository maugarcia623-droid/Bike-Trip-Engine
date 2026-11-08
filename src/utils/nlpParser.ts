import { TripProfile } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';

export interface ParsedFeedback {
  tripMode?: string;
  arrivalTarget?: string;
  rolloutTime?: string;
  speed?: number;
  date?: string;
  distance?: number;
  cargo?: number;
  riderMass?: number;
  bikeMass?: number;
  gate?: string;
  origin?: string;
  destination?: string;
  headwind?: string;
  strictFoodRule?: boolean;
  ravito?: string;
  puncturePrep?: string;
  includePunctureKit?: boolean;
  includeExtraRavito?: boolean;
}

export interface ParseTripResult {
  parsedValues: Partial<TripProfile>;
  detected: ParsedFeedback;
  extractedSummary: string[];
}

function parseDecimal(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

function cleanPlacePhrase(raw: string): string {
  let cleaned = raw
    .trim()
    .replace(/^[,.;:!\-–—]+|[,.;:!\-–—]+$/g, '')
    .trim();

  // Unwrap French/English venue wrappers while preserving town names like "La Baule" or "Le Croisic"
  // e.g., "un hôtel à Clisson" -> "Clisson", "l'hôtel de Clisson" -> "Clisson", "un bivouac à Pornic" -> "Pornic"
  const venuePrefixMatch = cleaned.match(
    /^(?:(?:un|une|le|la|l'|l’|mon|notre|the|a|an)\s+)?(?:h[ôo]tel|bivouac|camp(?:ing)?|g[îi]te|auberge|bistro|resto|restaurant|bureau|travail|boulot)\s+(?:à|a|au|aux|de\s+la|du|des|de|d'|d’|en|in|at|near)\s+(.+)$/i
  );
  if (venuePrefixMatch) {
    cleaned = venuePrefixMatch[1].trim();
  }

  // Unwrap trailing generic venue word e.g. "Clisson hotel" -> "Clisson"
  const venueSuffixMatch = cleaned.match(/^(.+?)\s+(?:h[ôo]tel|bivouac)$/i);
  if (venueSuffixMatch && venueSuffixMatch[1].trim().length >= 2) {
    cleaned = venueSuffixMatch[1].trim();
  }

  // Capitalize first letter if typed all-lowercase (e.g. "clisson" -> "Clisson")
  if (cleaned.length > 0 && cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .split(/(\s+|-)/)
      .map((part) => {
        if (/^[a-zà-ÿ]+$/i.test(part) && !['de', 'du', 'des', 'sur', 'en', 'sous'].includes(part.toLowerCase())) {
          return part.charAt(0).toUpperCase() + part.slice(1);
        }
        return part;
      })
      .join('');
  }

  return cleaned;
}

/**
 * Bilingual (EN + FR) natural language parser for cycling trip & commute prompts.
 * Understands English and French cycling terminology natively (Vélotaf, allure, ravito, crève,
 * check-in à, arrivée à, rendez-vous à, partir à, French dates/months, decimal commas, etc.).
 */
export function parseTripDescription(
  text: string,
  baseTrip?: TripProfile,
  lang: Language = getCurrentLanguage()
): ParseTripResult {
  const isFr = lang === 'fr';
  const lower = text.toLowerCase();
  const norm = lower
    .replace(/[’‘]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const currentYear = new Date().getFullYear();

  const parsedValues: Partial<TripProfile> = {
    physics: { ...(baseTrip?.physics || ({} as any)) },
    route: { ...(baseTrip?.route || ({} as any)) },
    office: { ...(baseTrip?.office || ({} as any)) },
    weather: { ...(baseTrip?.weather || ({} as any)) },
  };
  const detected: ParsedFeedback = {};
  const extractedSummary: string[] = [];

  // Month lookup table (English + French full & abbreviated, accent-stripped)
  const monthMap: Record<string, number> = {
    jan: 1, janv: 1, january: 1, janvier: 1,
    feb: 2, fev: 2, fevr: 2, february: 2, fevrier: 2,
    mar: 3, march: 3, mars: 3,
    apr: 4, avr: 4, april: 4, avril: 4,
    may: 5, mai: 5,
    jun: 6, june: 6, juin: 6,
    jul: 7, juil: 7, july: 7, juillet: 7,
    aug: 8, august: 8, aout: 8,
    sep: 9, sept: 9, september: 9, septembre: 9,
    oct: 10, october: 10, octobre: 10,
    nov: 11, november: 11, novembre: 11,
    dec: 12, december: 12, decembre: 12,
  };
  const monthNamesPattern = Object.keys(monthMap)
    .sort((a, b) => b.length - a.length)
    .join('|');

  // Helper to parse HH:MM, H am/pm, HhMM, H h MM, Hh, midi, minuit, et quart, moins le quart
  function parseTimeString(timeStr?: string, meridian?: string): string | null {
    if (!timeStr) return null;
    const trimmed = timeStr.trim().toLowerCase();
    if (trimmed === 'midi' || trimmed === 'noon') return '12:00';
    if (trimmed === 'minuit' || trimmed === 'midnight') return '00:00';

    let hours = 0;
    let minutes = 0;

    const etQuartMatch = trimmed.match(/^(\d{1,2})\s*h\s*et\s*quart\b/);
    const etDemieMatch = trimmed.match(/^(\d{1,2})\s*h\s*et\s*demie?\b/);
    const moinsLeQuartMatch = trimmed.match(/^(\d{1,2})\s*h\s*moins\s*le\s*quart\b/);
    const qPastMatch = trimmed.match(/^quarter\s*past\s*(\d{1,2})\b/);
    const qToMatch = trimmed.match(/^quarter\s*to\s*(\d{1,2})\b/);
    const hPastMatch = trimmed.match(/^half\s*past\s*(\d{1,2})\b/);

    if (etQuartMatch) {
      hours = parseInt(etQuartMatch[1], 10);
      minutes = 15;
    } else if (etDemieMatch) {
      hours = parseInt(etDemieMatch[1], 10);
      minutes = 30;
    } else if (moinsLeQuartMatch) {
      hours = parseInt(moinsLeQuartMatch[1], 10) - 1;
      if (hours < 0) hours = 23;
      minutes = 45;
    } else if (qPastMatch) {
      hours = parseInt(qPastMatch[1], 10);
      minutes = 15;
    } else if (qToMatch) {
      hours = parseInt(qToMatch[1], 10) - 1;
      if (hours < 0) hours = 23;
      minutes = 45;
    } else if (hPastMatch) {
      hours = parseInt(hPastMatch[1], 10);
      minutes = 30;
    } else {
      const hFormat = trimmed.match(/^(\d{1,2})\s*h(?:\s*(\d{2}))?$/i);
      const colonFormat = trimmed.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
      const plainH = trimmed.match(/^(\d{1,2})$/);

      if (hFormat) {
        hours = parseInt(hFormat[1], 10);
        minutes = hFormat[2] ? parseInt(hFormat[2], 10) : 0;
      } else if (colonFormat) {
        hours = parseInt(colonFormat[1], 10);
        minutes = parseInt(colonFormat[2], 10);
      } else if (plainH) {
        hours = parseInt(plainH[1], 10);
        minutes = 0;
      } else {
        return null;
      }
    }

    if (meridian) {
      const mer = meridian.toLowerCase();
      if (mer === 'pm' && hours < 12) hours += 12;
      if (mer === 'am' && hours === 12) hours = 0;
    } else if (/après-midi|apres-midi|du\s+soir/.test(norm) && hours >= 1 && hours <= 11) {
      // e.g. "3h de l'après-midi" -> 15:00
      hours += 12;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // ── 1. SPEED / ALLURE EXTRACTION ──
  // Mask wind speeds first to prevent e.g. "vent 20 kmh" from falsely setting cycling cruising speed
  const normWithoutWind = norm.replace(
    /\b(?:vent(?:\s+de\s+face|\s+contraire)?|wind|gusts?|rafales?)\s*(?:de|d'|a|is|at|of)?\s*\d+(?:[.,]\d+)?\s*(?:km\s*\/\s*h|kph|kmh)\b/gi,
    'wind_speed_token'
  );

  const speedMatch =
    normWithoutWind.match(
      /(?:cruising\s*(?:speed|pace)?\s*(?:would\s+be|is|around|at)?|target\s*(?:speed|pace)\s*(?:of|is|at)?|vitesse\s*(?:de\s*croisiere|cible|moyenne)?\s*(?:de|d'|a|autour\s*de|environ)?|allure\s*(?:cible|moyenne|de\s*croisiere)?\s*(?:de|d'|a|autour\s*de|environ)?|moyenne\s*(?:de|d'|a)?|rythme\s*(?:de|d'|a)?|speed\s*(?:of|is|around)?|pace\s*(?:of|is|around)?|holding\s*|rouler\s*a\s*|a\s*|at\s*)(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b/i
    ) ||
    normWithoutWind.match(/(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b/i) ||
    normWithoutWind.match(/(\d+(?:[.,]\d+)?)\s*(?:de\s*moyenne|km\s*\/\s*h\s*de\s*moyenne)\b/i) ||
    normWithoutWind.match(
      /\b(?:target\s*speed|cruising\s*speed|vitesse\s*(?:cible|moyenne|de\s*croisiere)|allure\s*(?:cible|moyenne)?|moyenne\s*de|rythme\s*de)\s*(?:is|of|at|around|de|d'|a)?\s*(\d+(?:[.,]\d+)?)\b/i
    );

  let targetSpeed = baseTrip?.route?.targetSpeedKmH || 25;
  if (speedMatch) {
    const val = parseDecimal(speedMatch[1]);
    if (val >= 10 && val <= 60) {
      targetSpeed = val;
      parsedValues.route!.targetSpeedKmH = val;
      detected.speed = val;
      extractedSummary.push(`Target Speed: ${val} km/h`);
    }
  }

  // ── 2. DISTANCE EXTRACTION ──
  const distMatch =
    norm.match(
      /(?:distance|route|ride|commute|length|parcours|trajet|etape|sortie|boucle)?\s*(?:of|is|around|over|for|de|d'|sur)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)/i
    ) ||
    norm.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)/i);

  let distanceKm = baseTrip?.route?.distanceKm || 35;
  if (distMatch) {
    const val = parseDecimal(distMatch[1]);
    if (val > 0 && val < 500) {
      distanceKm = val;
      parsedValues.route!.distanceKm = val;
      detected.distance = val;
      extractedSummary.push(`Route Distance: ${val} km`);
    }
  }

  // ── 3. RIDER MASS ──
  const riderMatch =
    norm.match(
      /\b(?:rider|cyclist|body|i\s+weigh|je\s+pese|pesant|mon\s+poids|cycliste|poids\s*du\s*cycliste)\s*(?:weight|mass|poids|est\s*de|de|is|around|of|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
    ) ||
    norm.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:rider|cyclist|cycliste)\b/i);
  if (riderMatch) {
    const val = parseDecimal(riderMatch[1]);
    if (val >= 40 && val <= 160) {
      parsedValues.physics!.riderWeightKg = val;
      detected.riderMass = val;
      extractedSummary.push(`Rider Mass: ${val} kg`);
    }
  }

  // ── 4. BIKE MASS ──
  const bikeMatch =
    norm.match(
      /\b(?:bike|bicycle|gravel|frame|velo|monture)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
    ) ||
    norm.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:bike|bicycle|gravel|frame|velo|monture)\b/i);
  if (bikeMatch) {
    const val = parseDecimal(bikeMatch[1]);
    if (val >= 4 && val <= 35) {
      parsedValues.physics!.bikeWeightKg = val;
      detected.bikeMass = val;
      extractedSummary.push(`Bike Mass: ${val} kg`);
    }
  }

  // ── 5. GEAR & BACKPACK MASS ──
  const zeroCargo =
    /\b(?:zero\s*(?:bag|sac)s?|no\s*bags?|nothing\s*on\s*(?:the\s*)?bike|without\s*(?:bags?|luggage)|sans\s*(?:bagages?|sacoches?|sacs?|chargement)|a\s*vide|0\s*kg\s*(?:gear|backpack|bags?|sac|sacoches?|bagages?))\b/i.test(
      norm
    );
  const gearMatch =
    norm.match(
      /\b(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
    ) ||
    norm.match(
      /\b(?:carrying|hauling|with|pack(?:ing)?|setup\s*with|avec|portant|charge\s*de)\s*(?:[a-zà-ÿ0-9'’\- ]{1,25}?\s+)?(\d+(?:[.,]\d+)?)\s*kg\b/i
    ) ||
    norm.match(
      /(\d+(?:[.,]\d+)?)\s*kg\s*(?:of\s*|de\s*|d')?(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|tent|tente|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\b/i
    );

  if (zeroCargo) {
    parsedValues.physics!.gearWeightKg = 0;
    detected.cargo = 0;
    extractedSummary.push(`Gear/Backpack Mass: 0 kg`);
  } else if (gearMatch) {
    const val = parseDecimal(gearMatch[1]);
    if (val >= 0 && val <= 40) {
      parsedValues.physics!.gearWeightKg = val;
      detected.cargo = val;
      extractedSummary.push(`Gear/Backpack Mass: ${val} kg`);
    }
  }

  // ── 6. GATE DESIGNATION ──
  const gateRegex =
    /\b(?:(north|south|east|west|main|nord|sud|est|ouest|principale?)\s+)?(gate|porte|portillon|entrance|acces|entree)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b/i;
  const rawGateMatch = norm.match(gateRegex);
  if (rawGateMatch && rawGateMatch[3]) {
    const direction = rawGateMatch[1];
    const noun = rawGateMatch[2].toLowerCase();
    const id = rawGateMatch[3].toUpperCase();
    const isFrenchNoun = ['porte', 'portillon', 'acces', 'entree'].includes(noun) || isFr;
    const baseLabel = isFrenchNoun ? 'Porte' : 'Gate';
    const gateName = direction
      ? `${direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase()} ${baseLabel} ${id}`
      : `${baseLabel} ${id}`;
    parsedValues.office!.gateName = gateName;
    detected.gate = gateName;
    extractedSummary.push(`Checkpoint: ${gateName}`);
  } else if (/\b(?:gate|portillon)\b/i.test(norm) && rawGateMatch) {
    const direction = rawGateMatch[1];
    const gateName = direction
      ? `${direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase()} ${isFr ? 'Porte' : 'Gate'}`
      : isFr
      ? 'Porte'
      : 'Gate';
    parsedValues.office!.gateName = gateName;
    detected.gate = gateName;
    extractedSummary.push(`Checkpoint: ${gateName}`);
  }

  // ── 7. FRENCH CYCLING TERMINOLOGY: RAVITO & CRÈVE / BUFFER ──
  const explicitBufferMatch = norm.match(
    /(?:(\d{1,2})\s*-?\s*(?:minute|min)s?\s*(?:de\s*)?(?:buffer|marge|securite)|(?:buffer|marge(?:\s*de\s*securite)?)\s*(?:of|de)?\s*(\d{1,2})\s*(?:min|minutes?))/i
  );
  let extraBufferMinutes = 0;

  // Ravito / Ravitaillement detection
  if (/\b(?:ravitos?|ravitaillements?|pause\s+cafe|arret\s+boulangerie)\b/i.test(norm)) {
    const ravitoMinMatch =
      norm.match(
        /\b(?:pause\s+|arret\s+)?(?:ravitos?|ravitaillements?|pause\s+cafe)\s*(?:de|d'|of|for)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)/i
      ) ||
      norm.match(
        /(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s*)?(?:pause\s+)?(?:ravitos?|ravitaillements?)/i
      );

    if (/\b(?:ravitos?|ravitaillements?)\s+(?:au\s+)?(?:vestiaires?|lockers?)\b/i.test(norm)) {
      const mins = ravitoMinMatch ? parseInt(ravitoMinMatch[1], 10) : 10;
      parsedValues.office!.lockerRefuelMinutes = mins;
      detected.ravito = isFr ? `Vestiaire (${mins}m)` : `Locker (${mins}m)`;
    } else if (ravitoMinMatch) {
      const mins = parseInt(ravitoMinMatch[1], 10);
      extraBufferMinutes += mins;
      detected.ravito = `+${mins} min`;
      detected.includeExtraRavito = true;
    } else if (/\bsans\s+ravito\b/i.test(norm)) {
      detected.ravito = isFr ? 'Sans arrêt' : 'Non-stop';
    } else {
      extraBufferMinutes += 10;
      detected.ravito = isFr ? 'Prévu (+10 min)' : 'Planned (+10 min)';
      detected.includeExtraRavito = true;
    }
    extractedSummary.push(`Fueling / Ravito: ${detected.ravito}`);
  }

  // Crève / Crevaison (Puncture safety margin & kit)
  if (
    /\b(?:anti[\s\-]?creve|anti[\s\-]?crevaison|creves?|crevaisons?|crever|kit\s+meches|chambre\s+a\s+air|puncture|flat\s+tire)\b/i.test(
      norm
    )
  ) {
    detected.includePunctureKit = true;
    const creveMinMatch =
      norm.match(
        /(?:marge|buffer)?\s*(?:anti[\s\-]?creve|anti[\s\-]?crevaison|en\s+cas\s+de\s+creve|creve|crevaison)\s*(?:de|of)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)/i
      ) ||
      norm.match(
        /(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s*)?(?:marge\s*)?(?:de\s*)?(?:anti[\s\-]?creve|anti[\s\-]?crevaison|en\s+cas\s+de\s+creve|creve|crevaison|puncture)/i
      );

    if (creveMinMatch) {
      const mins = parseInt(creveMinMatch[1], 10);
      extraBufferMinutes += mins;
      detected.puncturePrep = `+${mins} min`;
    } else if (/\b(?:marge|en\s+cas\s+de|risque\s+de|buffer)\b.*?\b(?:creve|crevaison|puncture)\b/i.test(norm)) {
      extraBufferMinutes += 10;
      detected.puncturePrep = isFr ? 'Marge +10m & kit' : '+10m & kit';
    } else {
      detected.puncturePrep = isFr ? 'Kit anti-crève' : 'Puncture kit';
    }
    extractedSummary.push(`Puncture Prep: ${detected.puncturePrep}`);
  }

  const baseBufferMinutes = explicitBufferMatch
    ? parseInt(explicitBufferMatch[1] || explicitBufferMatch[2], 10)
    : 15;
  const totalBufferMinutes = baseBufferMinutes + extraBufferMinutes;
  if (extraBufferMinutes > 0) {
    parsedValues.route!.urbanTrafficDelayMinutes =
      (baseTrip?.route?.urbanTrafficDelayMinutes ?? 8) + extraBufferMinutes;
  }

  // ── 8. TIME EXTRACTION (Departure, Arrival, Check-in, Rendez-vous, Shift) ──
  const timeSearchText = norm.replace(
    /\b(?:(?:north|south|east|west|main|nord|sud|est|ouest)\s+)?(gate|porte|portillon|entrance)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b/gi,
    'gate_checkpoint'
  );

  // Strict time token: prevents speeds ("25 km/h"), distances ("15 km"), weights ("12 kg"), or dates ("15 decembre") from matching as hours
  const timeTokenPattern = `(midi|minuit|noon|midnight|quarter\\s*(?:past|to)\\s*\\d{1,2}|half\\s*past\\s*\\d{1,2}|\\d{1,2}(?:\\s*:\\s*\\d{2}|\\s*h(?:\\s*(?:et\\s*quart|et\\s*demie?|moins\\s*le\\s*quart|\\d{2}))?(?!\\s*\\/)|(?=\\s*(?:am|pm)\\b|\\b)))(?!\\d|\\s*(?:[.,]\\d|\\/|km|kph|kmh|kilo|bornes|kg|g\\b|w\\b|watt|min|sec|%|°|deg|bar|ans\\b|jours?\\b|${monthNamesPattern}))\\s*(am|pm)?`;

  // Departure: "partir à", "je pars à", "on part à", "départ à", "leaving at", "rollout at", "setting off at", etc.
  const depRegex = new RegExp(
    `\\b(?:roll(?:ing)?\\s*out|leav(?:e|ing)|depart(?:ing|ure)?|out\\s*the\\s*door|setting\\s*off|take-?off|partir|je\\s+pars|on\\s+part|en\\s+partant|decollage|mise\\s+en\\s+route)(?:\\s+(?:de|from)\\s+[a-zà-ÿ'’\\- ]+?\\s+)?\\s*(?:imperativement\\s+|prevu\\s+|vers\\s+|autour\\s+de\\s+|at\\s+|around\\s+|by\\s+|d[e']s\\s+|pour\\s+|a\\s+)?${timeTokenPattern}`,
    'i'
  );
  const depMatch = timeSearchText.match(depRegex);

  // Arrival: "check-in à", "arrivée à", "arriver à/avant/pour", "rendez-vous à", "rdv à", "check-in is at", "arrive by", etc.
  const arrRegex = new RegExp(
    `\\b(?:check\\s*-?\\s*in|enregistrement|arriv(?:e|ing|al|ee|er)|etre\\s+(?:arrive|la|sur\\s+place)|reach(?:ing)?|rendez\\s*-?\\s*vous|rdv|reunion|hotel\\s*by|bistro\\s*by|reservation|meeting|appointment|at\\s*gate_checkpoint)` +
      `(?:\\s+(?:prevu(?:e)?|imperative(?:ment)?|strictly))?` +
      `(?:\\s+(?:at|a|au|aux|en|in|to)\\s+(?:gate_checkpoint|(?:(?:un|une|le|la|mon|notre|the)\\s+|l')?(?!midi\\b|minuit\\b|noon\\b|midnight\\b)[a-z'’_\\-]{2,24}))?` +
      `\\s*(?:is\\s*(?:at|by)?|strictly\\s*(?:at|by)?|by|at|around|before|for|vers|avant|pour|d[e']s|a)?\\s*${timeTokenPattern}`,
    'i'
  );
  const arrMatch = timeSearchText.match(arrRegex);

  // Shift / Work start: "prise de poste à 9h", "embauche à 8h30", "09:00 shift", "work starts at 9", etc.
  const shiftAfterKeyword = new RegExp(
    `\\b(?:prise\\s+de\\s+poste|embauche|debut\\s+(?:du\\s+)?(?:travail|poste|service)|shift|work|office|desk|bureau|boulot|taf)\\s*(?:starts?|lock|badge\\s*in)?\\s*(?:strictly|by|at|is\\s*(?:at|by)?|prevu(?:e)?\\s*a|avant|pour|a)\\s*${timeTokenPattern}`,
    'i'
  );
  const shiftBeforeKeyword = new RegExp(
    `${timeTokenPattern}\\s*(?:shift|work|prise\\s+de\\s+poste)`,
    'i'
  );
  const shiftMatch =
    timeSearchText.match(shiftAfterKeyword) || timeSearchText.match(shiftBeforeKeyword);

  let explicitDepTime: string | null = null;
  let explicitArrTime: string | null = null;
  let explicitShiftTime: string | null = null;

  if (depMatch) {
    explicitDepTime = parseTimeString(depMatch[1], depMatch[2]);
  }
  if (arrMatch) {
    explicitArrTime = parseTimeString(arrMatch[1], arrMatch[2]);
  }
  if (shiftMatch) {
    explicitShiftTime = parseTimeString(shiftMatch[1], shiftMatch[2]);
  }

  if (!explicitDepTime) {
    if (norm.includes('quarter past seven') || norm.includes('7h et quart') || norm.includes('sept heures et quart')) {
      explicitDepTime = '07:15';
    } else if (norm.includes('quarter to eight') || norm.includes('8h moins le quart') || norm.includes('huit heures moins le quart')) {
      explicitDepTime = '07:45';
    }
  }

  const rideDurationMinutes = Math.round((distanceKm / targetSpeed) * 60) + totalBufferMinutes;

  if (explicitDepTime) {
    parsedValues.departureTime = explicitDepTime;
    detected.rolloutTime = explicitDepTime;
    extractedSummary.push(`Rollout Time: ${explicitDepTime}`);
  }

  if (explicitArrTime) {
    parsedValues.office!.targetGateArrivalTime = explicitArrTime;
    detected.arrivalTarget = explicitArrTime;
    extractedSummary.push(`Target Arrival: ${explicitArrTime}`);
  }

  if (explicitShiftTime) {
    parsedValues.office!.shiftStartTime = explicitShiftTime;
    extractedSummary.push(`Shift Start: ${explicitShiftTime}`);
  }

  // If shift start was specified without an explicit gate arrival time, set gate arrival 30 min prior
  let effectiveArrTime = explicitArrTime;
  if (!effectiveArrTime && explicitShiftTime) {
    const [shH, shM] = explicitShiftTime.split(':').map(Number);
    let gateTotal = shH * 60 + shM - 30;
    if (gateTotal < 0) gateTotal += 24 * 60;
    const gH = Math.floor(gateTotal / 60);
    const gM = gateTotal % 60;
    effectiveArrTime = `${gH.toString().padStart(2, '0')}:${gM.toString().padStart(2, '0')}`;
    parsedValues.office!.targetGateArrivalTime = effectiveArrTime;
    detected.arrivalTarget = effectiveArrTime;
    extractedSummary.push(`Target Gate Arrival: ${effectiveArrTime}`);
  }

  // If arrival specified in prompt (or derived from shift) but no explicit departure -> reverse timeline
  if (effectiveArrTime && !explicitDepTime) {
    const [arrH, arrM] = effectiveArrTime.split(':').map(Number);
    let depTotal = arrH * 60 + arrM - rideDurationMinutes;
    if (depTotal < 0) depTotal += 24 * 60;
    const depH = Math.floor(depTotal / 60);
    const depM = depTotal % 60;
    const calculatedDep = `${depH.toString().padStart(2, '0')}:${depM.toString().padStart(2, '0')}`;
    parsedValues.departureTime = calculatedDep;
    detected.rolloutTime = calculatedDep;
    extractedSummary.push(`Est. Rollout: ${calculatedDep}`);
  }

  // If departure specified in prompt but no arrival/shift -> forward timeline
  if (explicitDepTime && !effectiveArrTime) {
    const [depH, depM] = explicitDepTime.split(':').map(Number);
    let arrTotal = depH * 60 + depM + rideDurationMinutes;
    if (arrTotal >= 24 * 60) arrTotal -= 24 * 60;
    const arrH = Math.floor(arrTotal / 60);
    const arrM = arrTotal % 60;
    const calculatedArr = `${arrH.toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')}`;
    parsedValues.office!.targetGateArrivalTime = calculatedArr;
    parsedValues.office!.shiftStartTime = calculatedArr;
    detected.arrivalTarget = calculatedArr;
    extractedSummary.push(`Est. Arrival: ${calculatedArr}`);
  }

  // Sync shiftStartTime to explicit arrival when no separate shift time was provided
  if (explicitArrTime && !explicitShiftTime) {
    parsedValues.office!.shiftStartTime = explicitArrTime;
  }

  // ── 9. DATE EXTRACTION (EN & FR months, 1er, relative days, weekdays) ──
  const monthFirstMatch = norm.match(
    new RegExp(
      `\\b(${monthNamesPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?(?:,?\\s*(\\d{4}))?\\b`,
      'i'
    )
  );
  const dayFirstMatch = norm.match(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?\\s*(?:of\\s*)?(${monthNamesPattern})\\.?(?:,?\\s*(\\d{4}))?\\b`,
      'i'
    )
  );
  const isoDateMatch = norm.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  const slashDateMatch =
    norm.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/) ||
    norm.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);

  let pYear = currentYear;
  let pMonth: number | null = null;
  let pDay: number | null = null;

  if (monthFirstMatch) {
    pMonth = monthMap[monthFirstMatch[1].toLowerCase()];
    pDay = parseInt(monthFirstMatch[2], 10);
    if (monthFirstMatch[3]) pYear = parseInt(monthFirstMatch[3], 10);
  } else if (dayFirstMatch) {
    pDay = parseInt(dayFirstMatch[1], 10);
    pMonth = monthMap[dayFirstMatch[2].toLowerCase()];
    if (dayFirstMatch[3]) pYear = parseInt(dayFirstMatch[3], 10);
  } else if (isoDateMatch) {
    pYear = parseInt(isoDateMatch[1], 10);
    pMonth = parseInt(isoDateMatch[2], 10);
    pDay = parseInt(isoDateMatch[3], 10);
  } else if (slashDateMatch) {
    pDay = parseInt(slashDateMatch[1], 10);
    pMonth = parseInt(slashDateMatch[2], 10);
    if (slashDateMatch[3]) pYear = parseInt(slashDateMatch[3], 10);
  } else if (norm.includes('apres-demain') || norm.includes('apres demain') || norm.includes('day after tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    pYear = d.getFullYear();
    pMonth = d.getMonth() + 1;
    pDay = d.getDate();
  } else if (norm.includes('tomorrow') || norm.includes('demain')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    pYear = tomorrow.getFullYear();
    pMonth = tomorrow.getMonth() + 1;
    pDay = tomorrow.getDate();
  } else if (norm.includes('today') || norm.includes('aujourd') || norm.includes('ce matin') || norm.includes('ce soir')) {
    const today = new Date();
    pYear = today.getFullYear();
    pMonth = today.getMonth() + 1;
    pDay = today.getDate();
  } else {
    // Weekday matching (e.g. "samedi", "lundi prochain", "next friday")
    const weekdayMap: Record<string, number> = {
      sunday: 0, dimanche: 0,
      monday: 1, lundi: 1,
      tuesday: 2, mardi: 2,
      wednesday: 3, mercredi: 3,
      thursday: 4, jeudi: 4,
      friday: 5, vendredi: 5,
      saturday: 6, samedi: 6,
    };
    const wdMatch = norm.match(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (wdMatch) {
      const targetDow = weekdayMap[wdMatch[1].toLowerCase()];
      const d = new Date();
      const currentDow = d.getDay();
      let delta = (targetDow - currentDow + 7) % 7;
      if (delta === 0) delta = 7;
      d.setDate(d.getDate() + delta);
      pYear = d.getFullYear();
      pMonth = d.getMonth() + 1;
      pDay = d.getDate();
    }
  }

  const monthShortFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const monthShortEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (pMonth && pDay && pMonth >= 1 && pMonth <= 12 && pDay >= 1 && pDay <= 31) {
    const formattedDate = `${pYear}-${pMonth.toString().padStart(2, '0')}-${pDay.toString().padStart(2, '0')}`;
    parsedValues.departureDate = formattedDate;
    detected.date = isFr
      ? `${pDay.toString().padStart(2, '0')} ${monthShortFr[pMonth - 1]} ${pYear}`
      : `${monthShortEn[pMonth - 1]} ${pDay.toString().padStart(2, '0')}, ${pYear}`;
    extractedSummary.push(`Departure Date: ${detected.date}`);
  }

  // ── 10. RIDE ARCHETYPE ──
  if (
    /\b(?:bikepack(?:ing)?|bivouac|multi-?day|tent|tente|towpath|self-?supported|autonomie|itinerance)\b/i.test(
      norm
    )
  ) {
    parsedValues.tag = 'BIKEPACKING';
    detected.tripMode = isFr ? 'Bikepacking / Bivouac' : 'Bikepacking / Adventure';
    extractedSummary.push(`Trip Mode: Bikepacking`);
  } else if (
    /\b(?:sport|gran\s*fondo|cyclosportive|peloton|tempo|paceline|zone\s*[345]|training|intervals?|fractionne|foncier|race|fast\s*sunrise|grinder|entrainement|course)\b/i.test(
      norm
    )
  ) {
    parsedValues.tag = 'SPORT';
    detected.tripMode = 'Sport / Gran Fondo';
    extractedSummary.push(`Trip Mode: Sport / Gran Fondo`);
  } else if (
    /\b(?:escapade|hotel|check\s*-?\s*in|enregistrement|touring|cyclotourisme|bistro|dinner|diner|leisure|vacation|vacances|getaway|week\s*-?\s*end|echappee|sejour|gite|auberge)\b/i.test(
      norm
    )
  ) {
    parsedValues.tag = 'ESCAPADE';
    detected.tripMode = isFr ? 'Escapade / Séjour' : 'Escapade / Leisure Stay';
    if (!detected.gate) {
      parsedValues.office!.gateName = isFr ? 'Réception Hôtel' : 'Hotel Reception';
    }
    extractedSummary.push(`Trip Mode: Escapade`);
  } else if (
    /\b(?:commute|velotaf|taf|boulot|work|shift|office|desk|locker|vestiaire|badge|travail|bureau|prise\s+de\s+poste|embauche|domicile[\s\-]travail)\b/i.test(
      norm
    )
  ) {
    parsedValues.tag = 'VÉLOTAF';
    detected.tripMode = isFr ? 'Trajet Vélotaf' : 'Commute Ride';
    extractedSummary.push(`Trip Mode: Commute`);
  }

  // ── 11. ORIGIN & DESTINATION (Bilingual EN & FR Corridors) ──
  const stopLookahead =
    `(?=$|[,.;!?]|\\s+(?:` +
    `le\\s+(?:\\d|1er|premier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|soir)|` +
    `ce\\s+(?:matin|soir|week)|demain|aujourd|apr[eè]s-demain|apres-demain|tomorrow|today|` +
    `lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|` +
    `on\\b|with\\b|without\\b|at\\b|by\\b|for\\b|around\\b|` +
    `check\\s*-?\\s*in|enregistrement|arriv[eéi]|rendez\\s*-?\\s*vous|rdv|partir|je\\s+pars|d[eé]part|leaving|rolling|setting|` +
    `prise\\s+de\\s+poste|embauche|pour\\s+un|pour\\s+une|` +
    `[àa]\\s*\\d|allure|vitesse|moyenne|rythme|pace|speed|cruising|target|` +
    `avec|sans|sous|vent|headwind|ravito|marge|en\\s+\\d|sur\\s+\\d|\\d+\\s*(?:km|kg|h\\b)` +
    `))`;

  const origDestRegex = new RegExp(
    `\\b(?:from|leaving\\s+from|starting\\s+from|depuis|au\\s+d[eé]part\\s+de|partir\\s+de|en\\s+partant\\s+de|de)\\s+` +
      `([A-Za-zÀ-ÿ'’\\- ]{2,40}?)\\s+` +
      `(?:to|toward|towards|vers|jusqu'à|jusqu’à|jusqu'a|direction|(?:à|a)(?!\\s*(?:\\d{1,2}(?:\\s*h|\\s*:)|midi\\b|minuit\\b)))\\s+` +
      `([A-Za-zÀ-ÿ'’0-9\\- ]{2,55}?)${stopLookahead}`,
    'i'
  );

  const destOnlyVerbRegex = new RegExp(
    `\\b(?:rouler|aller|p[eé]daler|filer|sortie|balade|vir[eé]e|escapade|week-?end|v[eé]lotaf|velotaf|trajet|itin[eé]raire|parcours|randonn[eé]e|[eé]tape|rendez-?vous|rdv|ride|riding|cycling|commut(?:e|ing)|heading|going|trip|tour)` +
      `(?:\\s+[àa]\\s+v[eé]lo)?\\s+` +
      `(?:to|toward|towards|vers|jusqu'à|jusqu’à|jusqu'a|direction|sur|(?:à|a)(?!\\s*(?:\\d{1,2}(?:\\s*h|\\s*:)|midi\\b|minuit\\b)))\\s+` +
      `([A-Za-zÀ-ÿ'’0-9\\- ]{2,55}?)${stopLookahead}`,
    'i'
  );

  const destOnlyDirectRegex = new RegExp(
    `\\b(?:direction|cap\\s+sur|destination)\\s+([A-Za-zÀ-ÿ'’0-9\\- ]{2,45}?)${stopLookahead}`,
    'i'
  );

  const nonPlaceWords = /^(?:vitesse|allure|moyenne|rythme|pause|marge|plus|moins|autour|environ|sac|sacoches?|bagages?|chargement|matos|[eé]quipement|velo|v[eé]lo|face|croisi[eè]re|pluie|\d|midi|minuit|pour\b)/i;

  const rawOrigDestMatch = text.match(origDestRegex);
  const origDestMatch =
    rawOrigDestMatch && !nonPlaceWords.test(rawOrigDestMatch[1].trim())
      ? rawOrigDestMatch
      : null;
  const destVerbMatch = !origDestMatch ? text.match(destOnlyVerbRegex) : null;
  const destDirectMatch = !origDestMatch && !destVerbMatch ? text.match(destOnlyDirectRegex) : null;

  if (origDestMatch) {
    const orig = cleanPlacePhrase(origDestMatch[1]);
    const dest = cleanPlacePhrase(origDestMatch[2]);
    const isGateOnly = /^(?:gate|porte|portillon)\s*\d*$/i.test(dest);

    if (orig && dest && !isGateOnly) {
      parsedValues.route!.origin = orig;
      parsedValues.route!.destination = dest;
      parsedValues.name = isFr ? `${orig} → ${dest}` : `${orig} → ${dest} Tour`;
      detected.origin = orig;
      detected.destination = dest;
      extractedSummary.push(`Route: ${orig} → ${dest}`);
    }
  } else if (destVerbMatch || destDirectMatch) {
    const rawDest = (destVerbMatch ? destVerbMatch[1] : destDirectMatch![1]).trim();
    const dest = cleanPlacePhrase(rawDest);
    const isGateOnly = /^(?:gate|porte|portillon)\s*\d*$/i.test(dest);

    if (dest && !nonPlaceWords.test(dest) && !isGateOnly) {
      parsedValues.route!.destination = dest;
      parsedValues.name = isFr
        ? parsedValues.tag === 'ESCAPADE'
          ? `Escapade à ${dest}`
          : `Trajet vers ${dest}`
        : `Ride to ${dest}`;
      detected.destination = dest;
      extractedSummary.push(`Destination: ${dest}`);
    }
  }

  // ── 12. WEATHER / WIND / TEMPERATURE / RAIN ──
  if (/\b(?:sans\s+vent|pas\s+de\s+vent|vent\s+calme|no\s+wind|calm\s+wind)\b/i.test(norm)) {
    parsedValues.weather!.isHeadwindActive = false;
    parsedValues.weather!.windDirection = 'calm';
    parsedValues.weather!.baseWindSpeedKmH = 2;
    detected.headwind = isFr ? 'Calme' : 'Calm';
    extractedSummary.push('Wind: Calm');
  } else if (
    norm.includes('headwind') ||
    norm.includes('estuary wind') ||
    norm.includes('vent de face') ||
    norm.includes('vent contraire') ||
    norm.includes('gusts') ||
    norm.includes('rafales')
  ) {
    parsedValues.weather!.isHeadwindActive = true;
    parsedValues.weather!.windDirection = 'headwind';
    let windSpeed = 8;
    const m1 = norm.match(
      /(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?\s*(?:de\s+)?(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)/i
    );
    const m2 = norm.match(
      /(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)\s*(?:of|de|d'|at|a|is|around)?\s*(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?/i
    );
    if (m1) {
      windSpeed = parseDecimal(m1[1]);
    } else if (m2) {
      windSpeed = parseDecimal(m2[1]);
    }
    parsedValues.weather!.baseWindSpeedKmH = windSpeed;
    detected.headwind = `${windSpeed} km/h`;
    extractedSummary.push(`Headwind: Active (${windSpeed} km/h)`);
  }

  // Ambient temperature e.g. "8°C", "il fait 6 degrés"
  const tempMatch = norm.match(/(-?\d{1,2})\s*(?:°\s*c?|degres?\b)/i);
  if (tempMatch) {
    const tempVal = parseInt(tempMatch[1], 10);
    if (tempVal >= -15 && tempVal <= 45) {
      parsedValues.weather!.temperatureC = tempVal;
      extractedSummary.push(`Temperature: ${tempVal}°C`);
    }
  }

  // Rain / precipitation
  if (/\b(?:pluie|averses?|orage|rain|wet)\b/i.test(norm)) {
    const rainPctMatch = norm.match(/(\d{1,3})\s*%\s*(?:de\s*)?(?:pluie|rain)/i) ||
                         norm.match(/(?:pluie|rain)\s*(?:a\s*)?(\d{1,3})\s*%/i);
    parsedValues.weather!.precipitationRiskPercent = rainPctMatch
      ? Math.min(100, parseInt(rainPctMatch[1], 10))
      : 65;
  }

  // ── 13. OFFICE RULES ──
  if (
    norm.includes('no food') ||
    norm.includes('open space') ||
    norm.includes('desk policy') ||
    norm.includes('pas de nourriture') ||
    norm.includes('pas de bouffe') ||
    norm.includes('pas de repas') ||
    norm.includes('interdit de manger')
  ) {
    parsedValues.office!.strictNoFoodInOpenSpace = true;
    detected.strictFoodRule = true;
    extractedSummary.push(`Office guideline: Dedicated break-room refuel`);
  }

  return {
    parsedValues,
    detected,
    extractedSummary,
  };
}
