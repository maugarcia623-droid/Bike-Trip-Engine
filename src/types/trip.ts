export interface WeatherCondition {
  isHeadwindActive: boolean;
  baseWindSpeedKmH: number;
  windDirection: 'headwind' | 'cross-headwind' | 'tailwind' | 'calm';
  windDirectionDegrees: number;
  temperatureC: number;
  precipitationRiskPercent: number;
  estuaryGustKmH: number;
  visibilityKm: number;
}

export interface PhysicsParams {
  riderWeightKg: number;
  bikeWeightKg: number;
  gearWeightKg: number;
  cda: number;
  crr: number;
  rho: number;
  drivetrainEfficiency: number;
  grossMechanicalEfficiency: number;
  gradientPercent: number;
}

export interface RouteParams {
  origin?: string;
  destination?: string;
  distanceKm: number;
  targetSpeedKmH: number;
  urbanTrafficDelayMinutes: number;
  gateSecurityDelayMinutes: number;
  coordinates?: [number, number][];
}

export interface OfficeConstraints {
  shiftStartTime: string;
  targetGateArrivalTime: string;
  gateName: string;
  lockerRefuelMinutes: number;
  showerChangeMinutes: number;
  breakRoomBreakfastMinutes: number;
  strictNoFoodInOpenSpace: boolean;
  badgeRequiredForGate: boolean;
  notes: string;
}

export interface NutritionItem {
  name: string;
  quantity: string;
  carbsGrams: number;
  proteinGrams: number;
  fatsGrams: number;
  kcals: number;
  notes?: string;
  isRealFoodVerified: boolean;
}

export interface NutritionPhase {
  phaseId: 'pre-ride' | 'on-bike' | 'locker-refuel' | 'break-room';
  title: string;
  timeWindow: string;
  location: string;
  rules: string;
  items: NutritionItem[];
}

export interface TimelineStep {
  id: string;
  time: string;
  formattedDuration?: string;
  title: string;
  location: string;
  category: 'prep' | 'ride' | 'transit' | 'nutrition' | 'office';
  isCrucialCheckpoint: boolean;
  description: string;
  iconName: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'mechanics' | 'gear' | 'nutrition' | 'logistics';
  checked: boolean;
  critical: boolean;
}

export interface TripProfile {
  id: string;
  name: string;
  tag: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  physics: PhysicsParams;
  route: RouteParams;
  office: OfficeConstraints;
  weather: WeatherCondition;
  checklist: ChecklistItem[];
}

export interface PhysicsCalculationResult {
  systemMassKg: number;
  groundSpeedMs: number;
  airSpeedMs: number;
  rollingResistanceWatts: number;
  aerodynamicDragWatts: number;
  gravityWatts: number;
  wheelWatts: number;
  legWatts: number;
  movingTimeSeconds: number;
  movingTimeFormatted: string;
  totalWorkKj: number;
  totalKcalBurn: number;
  carbOxidationGramPerHour: number;
  totalCarbsBurnedGrams: number;
  speedDeltaKmH: number;
  powerDeltaWatts: number;
  goStatus: 'GO' | 'CAUTION' | 'NO-GO';
  goStatusReason: string;
}
