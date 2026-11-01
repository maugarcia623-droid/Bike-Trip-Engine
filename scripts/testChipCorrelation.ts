import {
  INITIAL_PROFILES,
  PRESET_TRIP_POOL,
  generateRandomPresetTrips,
} from '../src/utils/storage';
import {
  toggleArchetypeChip,
  findChipDef,
  getArchetypeFromTag,
  ARCHETYPE_CHIP_DEFINITIONS,
} from '../src/utils/archetypeChips';
import { calculateReverseTimeline } from '../src/utils/timeline';
import { calculatePhysics } from '../src/utils/physics';
import { generateTripChecklist } from '../src/types/trip';
import { getChecklistItemLabel, getLocalizedTripMeta } from '../src/context/LanguageContext';

console.log('=== VERIFYING RANDOMIZED PRESET TRIPS & CHIP CORRELATION ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 0: 3 Randomized Preset Trip Projects & Full 12-Project Curated Pool
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 0: 3 Randomized Preset Trip Projects & Pre-Fetched Routes ---');
assert(INITIAL_PROFILES.length === 3, `INITIAL_PROFILES has 3 projects (got ${INITIAL_PROFILES.length})`);
assert(PRESET_TRIP_POOL.length === 12, `PRESET_TRIP_POOL has 12 curated projects (got ${PRESET_TRIP_POOL.length})`);

const initialArchetypes = new Set(INITIAL_PROFILES.map((t) => getArchetypeFromTag(t.tag, t.name)));
assert(initialArchetypes.size === 3, `INITIAL_PROFILES spans 3 distinct archetypes: ${Array.from(initialArchetypes).join(', ')}`);

// Verify exclusion / re-roll produces 3 distinct fresh projects
const rerolled = generateRandomPresetTrips(3, INITIAL_PROFILES.map((t) => t.id));
assert(rerolled.length === 3, 'generateRandomPresetTrips(3, excludeIds) returns 3 projects');
assert(
  rerolled.every((r) => !INITIAL_PROFILES.some((init) => init.id === r.id)),
  'Re-rolling with excludeIds avoids all previously active project IDs'
);

// Audit every single one of the 12 preset trip projects
for (const preset of PRESET_TRIP_POOL) {
  const coordsLen = preset.route.coordinates?.length ?? 0;
  assert(coordsLen >= 80, `[${preset.id}] pre-fetched OSRM coordinates loaded (${coordsLen} pts)`);
  assert((preset.route.elevationGainM ?? 0) > 0, `[${preset.id}] pre-fetched DEM elevation gain (+${preset.route.elevationGainM}m)`);
  assert((preset.customChips?.length ?? 0) >= 3, `[${preset.id}] preloaded thematic chips (${preset.customChips?.join(', ')})`);

  const expectedArchetype = getArchetypeFromTag(preset.tag, preset.name);
  for (const chipId of preset.customChips || []) {
    const def = findChipDef(chipId);
    assert(Boolean(def) && def?.archetype === expectedArchetype, `[${preset.id}] chip "${chipId}" belongs to ${expectedArchetype}`);
    for (const field of def?.settingsFields || []) {
      assert(
        preset.ruleSettings !== undefined && preset.ruleSettings[field.id] !== undefined,
        `[${preset.id}] ruleSettings["${field.id}"] preloaded (${JSON.stringify(preset.ruleSettings?.[field.id])})`
      );
    }
  }

  const phys = calculatePhysics(preset.physics, preset.route, preset.weather, 'en');
  assert(phys.goStatus !== 'NO-GO' && Number.isFinite(phys.legWatts), `[${preset.id}] valid physics (${Math.round(phys.legWatts)}W · ${phys.goStatus})`);

  const metaEn = getLocalizedTripMeta(preset, 'en');
  const metaFr = getLocalizedTripMeta(preset, 'fr');
  assert(metaEn.name !== metaFr.name, `[${preset.id}] bilingual EN/FR localization registered`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Bikepacking + "mountain-adventure"
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST 1: Bikepacking + "mountain-adventure" ---');
const baseBp = PRESET_TRIP_POOL.find((t) => t.id === 'bikepacking-jade-coast')!;
const updatedBp = toggleArchetypeChip({ ...baseBp, customChips: [] }, 'mountain-adventure', 'en');

assert(updatedBp.customChips?.includes('mountain-adventure') === true, 'customChips includes mountain-adventure');
assert(updatedBp.physics.gearWeightKg === 12.0, 'Gear weight adjusted to 12.0 kg for mountain expedition');

const mountainPlugsItem = updatedBp.checklist.find((i) => i.id === 'chip-mountain-plugs');
const mountainTopoItem = updatedBp.checklist.find((i) => i.id === 'chip-mountain-topo');
assert(Boolean(mountainPlugsItem), 'Checklist contains "chip-mountain-plugs"');
assert(Boolean(mountainTopoItem), 'Checklist contains "chip-mountain-topo"');
if (mountainPlugsItem) {
  const labelEn = getChecklistItemLabel(mountainPlugsItem, 40, 'en');
  const labelFr = getChecklistItemLabel(mountainPlugsItem, 40, 'fr');
  assert(labelEn.includes('tubeless plug'), `EN Label rendered: ${labelEn}`);
  assert(labelFr.includes('Mèches tubeless'), `FR Label rendered: ${labelFr}`);
}

const bpTimeline = calculateReverseTimeline(
  updatedBp.route,
  updatedBp.office,
  updatedBp.weather,
  updatedBp.tag,
  updatedBp.route.destination,
  'en',
  0,
  updatedBp.customChips
);
const colStep = bpTimeline.steps.find((s) => s.id === 'bp-mountain-col-clearance');
const duskArrivalStep = bpTimeline.steps.find((s) => s.id === 'bp-destination-arrive');
assert(Boolean(colStep), 'Timeline contains "bp-mountain-col-clearance" milestone');
assert(duskArrivalStep?.title.includes('Mountain Bivouac') === true, 'Timeline arrival step is Mountain Bivouac specific');

let isSorted = true;
for (let i = 0; i < bpTimeline.steps.length - 1; i++) {
  if (bpTimeline.steps[i].time > bpTimeline.steps[i + 1].time) {
    isSorted = false;
    break;
  }
}
assert(isSorted, 'Timeline steps are strictly chronological');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Commute + "coffee-stop"
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST 2: Commute + "coffee-stop" ---');
const baseCommute = PRESET_TRIP_POOL.find((t) => getArchetypeFromTag(t.tag, t.name) === 'COMMUTE')!;
const commuteTrip = { ...baseCommute, customChips: [] };
const updatedCommute = toggleArchetypeChip(commuteTrip, 'coffee-stop', 'fr');

assert(updatedCommute.customChips?.includes('coffee-stop') === true, 'customChips includes coffee-stop');
const coffeeChecklistItem = updatedCommute.checklist.find((i) => i.id === 'chip-coffee-lock');
assert(Boolean(coffeeChecklistItem), 'Checklist contains "chip-coffee-lock"');

const commuteTimeline = calculateReverseTimeline(
  updatedCommute.route,
  updatedCommute.office,
  updatedCommute.weather,
  updatedCommute.tag,
  updatedCommute.route.destination,
  'fr',
  15,
  updatedCommute.customChips
);
const coffeeStep = commuteTimeline.steps.find((s) => s.id === 'commute-coffee-pause');
assert(Boolean(coffeeStep), 'Timeline contains "commute-coffee-pause" step');
assert(coffeeStep?.title.includes('Pause Café') === true, `Coffee step title is localized in French: "${coffeeStep?.title}"`);

const toggledOffCommute = toggleArchetypeChip(updatedCommute, 'coffee-stop', 'fr');
assert(!toggledOffCommute.customChips?.includes('coffee-stop'), 'Toggling off removes coffee-stop from customChips');
assert(!toggledOffCommute.checklist.some((i) => i.id === 'chip-coffee-lock'), 'Toggling off removes chip-coffee-lock from checklist');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Escapade + "picnic-outing" + "local-gastronomy"
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST 3: Escapade + "picnic-outing" + "local-gastronomy" ---');
const escTrip = {
  ...PRESET_TRIP_POOL.find((t) => getArchetypeFromTag(t.tag, t.name) === 'ESCAPADE')!,
  customChips: [],
};
let updatedEsc = toggleArchetypeChip(escTrip, 'picnic-outing', 'en');
updatedEsc = toggleArchetypeChip(updatedEsc, 'local-gastronomy', 'en');

assert(updatedEsc.customChips?.includes('picnic-outing') === true, 'customChips includes picnic-outing');
assert(updatedEsc.customChips?.includes('local-gastronomy') === true, 'customChips includes local-gastronomy');

const picnicChecklistItem = updatedEsc.checklist.find((i) => i.id === 'chip-picnic-pannier');
const wineChecklistItem = updatedEsc.checklist.find((i) => i.id === 'chip-wine-sleeves');
assert(Boolean(picnicChecklistItem), 'Checklist contains "chip-picnic-pannier"');
assert(Boolean(wineChecklistItem), 'Checklist contains "chip-wine-sleeves"');

const escTimeline = calculateReverseTimeline(
  updatedEsc.route,
  updatedEsc.office,
  updatedEsc.weather,
  updatedEsc.tag,
  updatedEsc.route.destination,
  'en',
  0,
  updatedEsc.customChips
);
const picnicStep = escTimeline.steps.find((s) => s.id === 'esc-picnic-lunch');
const diningStep = escTimeline.steps.find((s) => s.id === 'town-explore');
assert(Boolean(picnicStep), 'Timeline contains "esc-picnic-lunch" 45-min milestone');
assert(diningStep?.title.includes('Gastronomy & Terroir Dining') === true, `Town explore step upgraded to Terroir Dining: "${diningStep?.title}"`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Sport + "climbing-kom-hunt" + "hydration-electrolytes"
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST 4: Sport + "climbing-kom-hunt" + "hydration-electrolytes" ---');
const sportTrip = {
  ...PRESET_TRIP_POOL.find((t) => getArchetypeFromTag(t.tag, t.name) === 'SPORT')!,
  customChips: [],
};
let updatedSport = toggleArchetypeChip(sportTrip, 'climbing-kom-hunt', 'en');
updatedSport = toggleArchetypeChip(updatedSport, 'hydration-electrolytes', 'en');

assert(updatedSport.customChips?.includes('climbing-kom-hunt') === true, 'customChips includes climbing-kom-hunt');
assert(updatedSport.customChips?.includes('hydration-electrolytes') === true, 'customChips includes hydration-electrolytes');

const komChecklistItem = updatedSport.checklist.find((i) => i.id === 'chip-kom-climb');
const hydrationChecklistItem = updatedSport.checklist.find((i) => i.id === 'chip-hydration-fuel');
assert(Boolean(komChecklistItem), 'Checklist contains "chip-kom-climb"');
assert(Boolean(hydrationChecklistItem), 'Checklist contains "chip-hydration-fuel"');

const sportTimeline = calculateReverseTimeline(
  updatedSport.route,
  updatedSport.office,
  updatedSport.weather,
  updatedSport.tag,
  updatedSport.route.destination,
  'en',
  0,
  updatedSport.customChips
);
const komStep = sportTimeline.steps.find((s) => s.id === 'sport-kom-repeats');
const fuelStep = sportTimeline.steps.find((s) => s.id === 'sport-mid-fuel');
assert(Boolean(komStep), 'Timeline contains "sport-kom-repeats"');
assert(fuelStep?.title.includes('High-Carb Pacing') === true, `Fuel step upgraded to 80-90g/hr: "${fuelStep?.title}"`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Comprehensive coverage of all defined chips
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST 5: All Defined Chips produce valid checklist items & translations ---');
for (const [archetype, chips] of Object.entries(ARCHETYPE_CHIP_DEFINITIONS)) {
  for (const chip of chips) {
    const list = generateTripChecklist(archetype, 45, undefined, { lang: 'en', customChips: [chip.id] });
    assert(list.length > 0, `Archetype ${archetype} chip "${chip.id}" generates checklist items`);
  }
}

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed.`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
}
