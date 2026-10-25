import { RouteParams, OfficeConstraints, WeatherCondition, TimelineStep } from '../types/trip';
import { subtractMinutesFromTime, addMinutesToTime } from './nutrition';

export interface ReverseTimelineCalculation {
  shiftStartTime: string;
  gateArrivalTime: string;
  hardDepartureTime: string;
  preRideMealTime: string;
  wakeUpTime: string;
  totalDoorToDeskMinutes: number;
  pureMovingMinutes: number;
  bufferMinutes: number;
  steps: TimelineStep[];
  weatherHeadwindImpactMinutes: number;
}

/**
 * Calculates the exact reverse timeline working backwards from
 * the user's shift start time and gate arrival constraints.
 */
export function calculateReverseTimeline(
  route: RouteParams,
  office: OfficeConstraints,
  weather: WeatherCondition
): ReverseTimelineCalculation {
  // Moving time in minutes
  const speed = Math.max(5, route.targetSpeedKmH);
  const rawMovingMinutes = Math.round((route.distanceKm / speed) * 60);

  // Weather headwind penalty: if 8 km/h headwind active, adds roughly 3 to 6 mins
  const windKmh = weather.isHeadwindActive ? (weather.baseWindSpeedKmH || 0) : 0;
  // Dynamic aero drag: speed drops ~0.30 km/h per 1 km/h opposing headwind
  const speedPenaltyKmH = windKmh * 0.30;
  const effectiveSpeedKmH = Math.max(8, speed - speedPenaltyKmH);
  const actualMovingMinutes = Math.round((route.distanceKm / effectiveSpeedKmH) * 60);
  const weatherHeadwindImpactMinutes = Math.max(0, actualMovingMinutes - rawMovingMinutes);

  const totalRideMinutes = rawMovingMinutes + weatherHeadwindImpactMinutes;
  const urbanBuffer = route.urbanTrafficDelayMinutes || 8;
  const securityBuffer = route.gateSecurityDelayMinutes || 5;

  // The critical anchor is Gate Arrival: targetGateArrivalTime (e.g. "08:30")
  // Or if shift is 09:00, arrival at Gate 17 is calculated backwards from shift:
  // Shift (09:00) minus Break Room (15m) minus Shower (10m) minus Locker Skyr (10m) = 08:25
  const gateArrivalAnchor = office.targetGateArrivalTime || '08:30';

  // Security gate clearance time: Gate Arrival minus security clearance buffer
  const gateTurnstileTime = subtractMinutesFromTime(gateArrivalAnchor, securityBuffer);

  // Hard Departure Time from Home = gateTurnstileTime minus (totalRideMinutes + urbanBuffer)
  const totalEnRouteMinutes = totalRideMinutes + urbanBuffer;
  const hardDepartureTime = subtractMinutesFromTime(gateTurnstileTime, totalEnRouteMinutes);

  // Pre-rollout bike prep (15 min before departure)
  const bikePrepTime = subtractMinutesFromTime(hardDepartureTime, 15);

  // Pre-ride ignition meal (45 min before departure)
  const preRideMealTime = subtractMinutesFromTime(hardDepartureTime, 45);

  // Wake up time (60 min before departure)
  const wakeUpTime = subtractMinutesFromTime(hardDepartureTime, 60);

  // Office Steps forward from Gate Arrival:
  // 1. Locker Refuel: e.g. 08:30 to 08:40
  const lockerRefuelEnd = addMinutesToTime(gateArrivalAnchor, office.lockerRefuelMinutes || 10);
  // 2. Shower & Grooming: e.g. 08:40 to 08:50
  const showerEnd = addMinutesToTime(lockerRefuelEnd, office.showerChangeMinutes || 10);
  // 3. Break Room Breakfast: e.g. 08:50 to 09:05 (or 09:00 desk lock)
  const breakRoomEnd = addMinutesToTime(showerEnd, office.breakRoomBreakfastMinutes || 15);

  const steps: TimelineStep[] = [
    {
      id: 'wake-prep',
      time: wakeUpTime,
      title: 'Wake Up & Hydration Primer',
      location: 'Home Base',
      category: 'prep',
      isCrucialCheckpoint: false,
      description: 'Drink 300ml fresh water with pinch of salt. Systems boot.',
      iconName: 'AlarmClock',
    },
    {
      id: 'pre-ride-fuel',
      time: preRideMealTime,
      title: 'Pre-Ride Ignition Meal',
      location: 'Kitchen Counter',
      category: 'nutrition',
      isCrucialCheckpoint: true,
      description: 'White toasted baguette + wildflower honey + double espresso. Zero milk/powders.',
      iconName: 'Utensils',
    },
    {
      id: 'garage-rollout',
      time: bikePrepTime,
      title: 'Pre-Flight Cockpit & Tire Check',
      location: 'Garage / Staging Area',
      category: 'prep',
      isCrucialCheckpoint: false,
      description: 'Verify 3.2 bar gravel tire pressure, Di2 battery green, bottles mounted, badge in pocket.',
      iconName: 'CheckCircle2',
    },
    {
      id: 'hard-departure',
      time: hardDepartureTime,
      title: 'HARD DEPARTURE (Zero Delay Tolerance)',
      location: 'Rollout Point',
      category: 'ride',
      isCrucialCheckpoint: true,
      description: `Roll out at steady target pace (${route.targetSpeedKmH} km/h). Headwind buffer: +${weatherHeadwindImpactMinutes}m.`,
      iconName: 'Navigation',
    },
    {
      id: 'estuary-transit',
      time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.45)),
      title: 'Estuary Bridge & Open Flat Crossing',
      location: 'Bridge Sector',
      category: 'ride',
      isCrucialCheckpoint: false,
      description: weather.isHeadwindActive
        ? `Estuary headwind detected (${windKmh} km/h). Hold aero tuck on hoods to conserve ~${Math.round(windKmh * 3.5)}W.`
        : 'Estuary crossing calm. Cruise at steady endurance cadence (88-92 RPM).',
      iconName: 'Wind',
    },
    {
      id: 'gate-security',
      time: gateTurnstileTime,
      title: `Arrival at Security Perimeter (${office.gateName})`,
      location: office.gateName,
      category: 'transit',
      isCrucialCheckpoint: true,
      description: `Badge scan at ${office.gateName}. Lock gravel bike in secure subterranean shelter.`,
      iconName: 'ShieldCheck',
    },
    {
      id: 'locker-refuel',
      time: gateArrivalAnchor,
      title: 'Phase 1 Locker Refuel (Directly at Locker)',
      location: 'Basement Locker Area',
      category: 'nutrition',
      isCrucialCheckpoint: true,
      description: 'Eat 200g Skyr 0% tub + 250ml pure grape juice immediately before heading to shower.',
      iconName: 'Zap',
    },
    {
      id: 'shower-groom',
      time: lockerRefuelEnd,
      title: 'Shower, Cool Down & Executive Kit Change',
      location: 'Locker Showers',
      category: 'office',
      isCrucialCheckpoint: false,
      description: 'Fast contrast shower. Swap into clean office kit. Pack damp kit in aerated dry-bag.',
      iconName: 'ShowerHead',
    },
    {
      id: 'breakroom-breakfast',
      time: showerEnd,
      title: 'Phase 2: Break Room Breakfast',
      location: '3rd Floor Dedicated Break Room',
      category: 'nutrition',
      isCrucialCheckpoint: true,
      description: 'POLICY MANDATE: Break room only! Enjoy oat milk overnight oats, grated apple, walnuts, baguette & coffee.',
      iconName: 'Coffee',
    },
    {
      id: 'shift-start',
      time: office.shiftStartTime,
      title: 'Shift Start / On-Desk Presence',
      location: 'Engineering Open-Space Desk',
      category: 'office',
      isCrucialCheckpoint: true,
      description: 'Desk clear of food (strict rule). Fully fueled, bathed, and zero cortisol spike.',
      iconName: 'Briefcase',
    },
  ];

  // Total door-to-desk duration
  const totalDoorToDeskMinutes =
    60 + totalRideMinutes + urbanBuffer + securityBuffer + 10 + 10 + 15;

  return {
    shiftStartTime: office.shiftStartTime,
    gateArrivalTime: gateArrivalAnchor,
    hardDepartureTime,
    preRideMealTime,
    wakeUpTime,
    totalDoorToDeskMinutes,
    pureMovingMinutes: rawMovingMinutes,
    bufferMinutes: urbanBuffer + securityBuffer + weatherHeadwindImpactMinutes,
    steps,
    weatherHeadwindImpactMinutes,
  };
}
