import { TripProfile } from '../types/trip';

/**
 * Intelligent natural language parser for trip & office prompts.
 * Extracts distances, target speeds, shift and gate times, rider/bike masses,
 * gate designations, and constraints.
 */
export function parseTripDescription(
  text: string,
  baseTrip: TripProfile
): {
  parsedValues: Partial<TripProfile>;
  extractedSummary: string[];
} {
  const extractedSummary: string[] = [];
  const updatedPhysics = { ...baseTrip.physics };
  const updatedRoute = { ...baseTrip.route };
  const updatedOffice = { ...baseTrip.office };
  const updatedWeather = { ...baseTrip.weather };

  const lower = text.toLowerCase();

  // 1. Distance extraction: "22km", "25 km", "18.5 kilometers"
  const distMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers|kilos)\b/i);
  if (distMatch) {
    const val = parseFloat(distMatch[1]);
    if (val > 0 && val < 500) {
      updatedRoute.distanceKm = val;
      extractedSummary.push(`Route Distance: ${val} km`);
    }
  }

  // 2. Speed extraction: "28km/h", "27 kmh", "target speed 26"
  const speedMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|kmh|kph)\b/i) ||
                     text.match(/(?:speed|pace|cruising)\s*(?:of|at|around)?\s*(\d+(?:\.\d+)?)/i);
  if (speedMatch) {
    const val = parseFloat(speedMatch[1]);
    if (val >= 10 && val <= 60) {
      updatedRoute.targetSpeedKmH = val;
      extractedSummary.push(`Target Speed: ${val} km/h`);
    }
  }

  // 3. Shift start time: "09:00 shift", "start at 9am", "9:00 start", "shift at 08:30"
  const shiftMatch = text.match(/(?:shift|work|office|desk)\s*(?:start|at|by)?\s*(\d{1,2})[:h](\d{2})?/i) ||
                     text.match(/(\d{1,2})[:h](\d{2})?\s*(?:am)?\s*(?:shift|work)/i);
  if (shiftMatch) {
    const h = parseInt(shiftMatch[1], 10);
    const m = shiftMatch[2] ? parseInt(shiftMatch[2], 10) : 0;
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    updatedOffice.shiftStartTime = formatted;
    extractedSummary.push(`Shift Start: ${formatted}`);
  }

  // 4. Gate arrival: "arriving at 08:30", "arrival at 8h30", "08:30 at gate"
  const arrivalMatch = text.match(/(?:arriv(?:ing|al)|reach|at gate)\s*(?:at|strictly|by)?\s*(\d{1,2})[:h](\d{2})/i) ||
                       text.match(/(\d{1,2})[:h](\d{2})\s*(?:gate arrival|arrival)/i);
  if (arrivalMatch) {
    const h = parseInt(arrivalMatch[1], 10);
    const m = parseInt(arrivalMatch[2], 10);
    const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    updatedOffice.targetGateArrivalTime = formatted;
    extractedSummary.push(`Target Gate Arrival: ${formatted}`);
  }

  // 5. Gate designation: "Gate 17", "Gate 4", "Porte 12"
  const gateMatch = text.match(/\b(gate|porte|portillon|entrance)\s*([a-z0-9\-]+)\b/i);
  if (gateMatch) {
    const gateName = `Gate ${gateMatch[2].toUpperCase()}`;
    updatedOffice.gateName = gateName;
    extractedSummary.push(`Checkpoint Location: ${gateName}`);
  }

  // 6. Rider weight: "rider 74kg", "72 kg rider", "weight 75"
  const riderMatch = text.match(/(?:rider|body|me|i weigh)\s*(?:weight)?\s*(?:is|around|of)?\s*(\d+(?:\.\d+)?)\s*kg/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*kg\s*rider/i);
  if (riderMatch) {
    const val = parseFloat(riderMatch[1]);
    if (val >= 40 && val <= 160) {
      updatedPhysics.riderWeightKg = val;
      extractedSummary.push(`Rider Mass: ${val} kg`);
    }
  }

  // 7. Bike weight: "bike 9.5kg", "gravel bike 10kg", "9kg bike"
  const bikeMatch = text.match(/(?:bike|gravel|frame)\s*(?:weight)?\s*(?:is|around|of)?\s*(\d+(?:\.\d+)?)\s*kg/i) ||
                    text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:bike|gravel)/i);
  if (bikeMatch) {
    const val = parseFloat(bikeMatch[1]);
    if (val >= 5 && val <= 35) {
      updatedPhysics.bikeWeightKg = val;
      extractedSummary.push(`Bike Mass: ${val} kg`);
    }
  }

  // 8. Gear weight: "4kg gear", "backpack 3.5kg", "gear 5kg"
  const gearMatch = text.match(/(?:gear|backpack|kit|luggage|pannier)\s*(?:weight)?\s*(?:is|around|of)?\s*(\d+(?:\.\d+)?)\s*kg/i) ||
                    text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:gear|backpack|kit)/i);
  if (gearMatch) {
    const val = parseFloat(gearMatch[1]);
    if (val >= 1 && val <= 30) {
      updatedPhysics.gearWeightKg = val;
      extractedSummary.push(`Gear/Backpack Mass: ${val} kg`);
    }
  }

  // 9. Weather clues: "headwind", "estuary wind", "gusts"
  if (lower.includes('headwind') || lower.includes('estuary wind') || lower.includes('vent de face')) {
    updatedWeather.isHeadwindActive = true;
    const windMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|kmh)?\s*(?:headwind|wind)/i);
    if (windMatch) {
      updatedWeather.baseWindSpeedKmH = parseFloat(windMatch[1]);
    } else {
      updatedWeather.baseWindSpeedKmH = 8;
    }
    extractedSummary.push(`Headwind Condition: Active (${updatedWeather.baseWindSpeedKmH} km/h)`);
  }

  // 10. Office constraints detection
  if (lower.includes('no food') || lower.includes('open space') || lower.includes('desk policy')) {
    updatedOffice.strictNoFoodInOpenSpace = true;
    extractedSummary.push(`Strict Office Rule: No food at open-space desk`);
  }

  if (extractedSummary.length === 0) {
    extractedSummary.push("Applied smart defaults (22 km @ 27 km/h, 08:30 Gate 17, 09:00 Shift)");
  }

  return {
    parsedValues: {
      physics: updatedPhysics,
      route: updatedRoute,
      office: updatedOffice,
      weather: updatedWeather,
    },
    extractedSummary,
  };
}
