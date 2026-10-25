import { PhysicsParams, RouteParams, WeatherCondition, PhysicsCalculationResult } from '../types/trip';

const GRAVITY = 9.81; // m/s^2

/**
 * Calculates high-precision cycling physics on flat/rolling tarmac
 * based on standard aero drag, rolling resistance, drivetrain loss,
 * and gross metabolic efficiency.
 */
export function calculatePhysics(
  physics: PhysicsParams,
  route: RouteParams,
  weather: WeatherCondition
): PhysicsCalculationResult {
  const {
    riderWeightKg,
    bikeWeightKg,
    gearWeightKg,
    cda,
    crr,
    rho,
    drivetrainEfficiency,
    grossMechanicalEfficiency,
    gradientPercent,
  } = physics;

  // 1. Total System Mass (Rider + Bike + Gear)
  const systemMassKg = Math.max(10, riderWeightKg + bikeWeightKg + gearWeightKg);

  // 2. Velocities (m/s)
  const targetSpeedKmH = Math.max(5, route.targetSpeedKmH);
  const groundSpeedMs = targetSpeedKmH / 3.6;

  // Wind speed conversion
  // If headwind is active, wind opposes rider movement directly
  const windSpeedKmH = weather.isHeadwindActive ? weather.baseWindSpeedKmH : 0;
  const windSpeedMs = windSpeedKmH / 3.6;
  const airSpeedMs = groundSpeedMs + windSpeedMs;

  // 3. Resistance Components
  // Rolling resistance: P_roll = Crr * M * g * v_ground
  const rollingResistanceWatts = crr * systemMassKg * GRAVITY * groundSpeedMs;

  // Aerodynamic drag: P_aero = 0.5 * rho * CdA * (v_air)^2 * v_ground
  const aerodynamicDragWatts = 0.5 * rho * cda * Math.pow(airSpeedMs, 2) * groundSpeedMs;

  // Gradient resistance: P_climb = M * g * sin(arctan(grade)) * v_ground
  const gradeFraction = gradientPercent / 100;
  const gravityWatts = systemMassKg * GRAVITY * Math.sin(Math.atan(gradeFraction)) * groundSpeedMs;

  // Total power at wheel
  const wheelWatts = Math.max(0, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts);

  // Total power produced by rider's legs (accounting for drivetrain loss, e.g. 95% = 0.95)
  const eff = Math.min(0.99, Math.max(0.70, drivetrainEfficiency));
  const legWatts = wheelWatts / eff;

  // Baseline power without headwind (to calculate delta)
  const baselineAirSpeedMs = groundSpeedMs;
  const baselineAeroWatts = 0.5 * rho * cda * Math.pow(baselineAirSpeedMs, 2) * groundSpeedMs;
  const baselineLegWatts = (rollingResistanceWatts + baselineAeroWatts + gravityWatts) / eff;
  const powerDeltaWatts = weather.isHeadwindActive ? legWatts - baselineLegWatts : 0;

  // 4. Moving Time
  // Moving time in seconds = distance (m) / ground speed (m/s)
  const distanceMeters = route.distanceKm * 1000;
  const movingTimeSeconds = distanceMeters / groundSpeedMs;

  const hours = Math.floor(movingTimeSeconds / 3600);
  const minutes = Math.floor((movingTimeSeconds % 3600) / 60);
  const seconds = Math.floor(movingTimeSeconds % 60);
  const movingTimeFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  // 5. Total Mechanical Work (kJ)
  // Work = Power (W) * time (s) / 1000
  const totalWorkKj = (legWatts * movingTimeSeconds) / 1000;

  // 6. Total Caloric Burn (kcal)
  // 1 kcal = 4.184 kJ
  // Caloric Burn = Work (kJ) / (Gross Mechanical Efficiency * 4.184)
  const grossEff = Math.min(0.26, Math.max(0.15, grossMechanicalEfficiency)); // 21%
  const totalKcalBurn = totalWorkKj / (grossEff * 4.184);

  // 7. Carbohydrate Oxidation Rate (g/hr)
  // Based on validated exercise physiology models:
  // At lower power (~100-150W), carbs represent ~50-60% of substrate oxidation.
  // At endurance/tempo (~180-250W), carbs ramp up to 70-85%.
  // 1 gram of carbohydrate = ~4 kcal.
  const hourlyBurnKcal = (totalKcalBurn / (movingTimeSeconds / 3600));
  // Dynamic carbohydrate contribution fraction based on power
  const carbFraction = Math.min(0.85, Math.max(0.45, 0.45 + (legWatts / 450) * 0.40));
  const carbOxidationGramPerHour = Math.round((hourlyBurnKcal * carbFraction) / 4);
  const totalCarbsBurnedGrams = Math.round((carbOxidationGramPerHour * (movingTimeSeconds / 3600)));

  // Speed delta if rider kept baseline power into headwind instead of holding speed
  // If holding baseline watts into headwind:
  // P_base = Crr*M*g*v_new + 0.5*rho*CdA*(v_new + v_wind)^2 * v_new
  // Approximation of speed reduction:
  const speedDeltaKmH = weather.isHeadwindActive ? Number(((windSpeedKmH * 0.38)).toFixed(1)) : 0;

  // 8. GO / CAUTION / NO-GO status evaluation
  let goStatus: 'GO' | 'CAUTION' | 'NO-GO' = 'GO';
  let goStatusReason = 'All telemetry within optimal commuting envelope.';

  const windKmh = weather.isHeadwindActive ? (weather.baseWindSpeedKmH || 0) : 0;

  if (windKmh >= 30 || (weather.estuaryGustKmH && weather.estuaryGustKmH >= 50)) {
    goStatus = 'NO-GO';
    goStatusReason = `Severe estuary gale (${windKmh} km/h). Cross-bridge gust hazard.`;
  } else if (windKmh >= 15 || legWatts > 225) {
    goStatus = 'CAUTION';
    if (windKmh >= 15) {
      goStatusReason = `Stiff headwind (${windKmh} km/h). +${Math.round(powerDeltaWatts)}W aerodynamic surcharge on exposed segments.`;
    } else {
      goStatusReason = `Sustained power demand (${Math.round(legWatts)}W) exceeds typical endurance tempo.`;
    }
  } else {
    goStatus = 'GO';
    goStatusReason = windKmh > 0 
      ? `Manageable breeze (${windKmh} km/h). All telemetry within nominal commuting envelope.`
      : `Calm conditions. Pure rolling resistance pacing.`;
  }

  return {
    systemMassKg,
    groundSpeedMs,
    airSpeedMs,
    rollingResistanceWatts,
    aerodynamicDragWatts,
    gravityWatts,
    wheelWatts,
    legWatts,
    movingTimeSeconds,
    movingTimeFormatted,
    totalWorkKj,
    totalKcalBurn,
    carbOxidationGramPerHour,
    totalCarbsBurnedGrams,
    speedDeltaKmH,
    powerDeltaWatts,
    goStatus,
    goStatusReason,
  };
}
