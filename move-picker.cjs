const fs = require('fs');
const file = 'src/components/configurator/ConfiguratorScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Extract the Planned Departure card block from its current location
const markerComment = '{/* ── Planned Departure & Atmospheric Window ── */}';
const startIdx = code.indexOf(markerComment);

if (startIdx === -1) {
  console.error('Could not find Planned Departure card in code.');
  process.exit(1);
}

// Find the end of this card block (matching 4 closing divs or next comment/section)
let depth = 0;
let endIdx = startIdx;
let foundDiv = false;
for (let i = startIdx; i < code.length; i++) {
  if (code.startsWith('<div', i)) {
    depth++;
    foundDiv = true;
  }
  if (code.startsWith('</div>', i)) {
    depth--;
    if (foundDiv && depth === 0) {
      endIdx = i + 6;
      break;
    }
  }
}

const pickerCardBlock = code.slice(startIdx, endIdx);

// Remove it from its current location
code = code.slice(0, startIdx) + code.slice(endIdx);

// 2. Find the target destination: right after the Natural Language Parser / Extracted Parameters block
// Let us search for "EXTRACTED MISSION PARAMETERS" or the closing div of the NLP parser section
const targetMarker = 'EXTRACTED MISSION PARAMETERS';
const targetIdx = code.indexOf(targetMarker);

if (targetIdx === -1) {
  console.error('Could not find Extracted Mission Parameters target anchor.');
  process.exit(1);
}

// Find the end of that container block (look for the next major section like Physics tabs)
const physicsMarker = '1. PHYSICS & SYSTEM MASS';
const physicsIdx = code.indexOf(physicsMarker, targetIdx);

if (physicsIdx === -1) {
  console.error('Could not find Physics section marker.');
  process.exit(1);
}

// Find the closing div container right before the physics section wrapper
const insertPos = code.lastIndexOf('</div>', physicsIdx);

// Insert the picker card right there
code = code.slice(0, insertPos) + '\n\n      ' + pickerCardBlock + '\n\n      ' + code.slice(insertPos);

fs.writeFileSync(file, code, 'utf8');
console.log('✓ Successfully relocated Planned Departure card below the Natural Language Parser.');
