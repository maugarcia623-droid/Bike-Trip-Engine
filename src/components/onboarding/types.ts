export type RidePurposeId = 'commute' | 'sport' | 'bikepacking' | 'leisure';

export interface PurposeDefinition {
  id: RidePurposeId;
  name: string;
  nameFr: string;
  subtitle: string;
  subtitleFr: string;
  contextTitle: string;
  contextTitleFr: string;
  contextBody: string;
  contextBodyFr: string;
  tag: string;
  defaultPaceTier: 'easy' | 'steady' | 'brisk';
  defaultBufferMin: number;
  defaultOrigin: string;
  defaultDestination: string;
  defaultDistanceKm: number;
}

export interface PaceTier {
  id: 'easy' | 'steady' | 'brisk';
  name: string;
  nameFr: string;
  speedKmH: number;
  description: string;
  descriptionFr: string;
}

export interface BikeOption {
  id: string;
  name: string;
  nameFr: string;
  weightKg: number;
  cda: number;
  crr: number;
  isTubeless: boolean;
  drivetrainEfficiency: number;
}

export interface OnboardingState {
  // Navigation
  currentStep: number; // 0 = Welcome, 1 = Purpose, 2 = Route, 3 = Timing/Pace, 4 = Rider/Bike, 5 = Ready, 6 = Save/Sync

  // Purpose
  purpose: RidePurposeId;

  // Route
  routeMode: 'from-to' | 'distance' | 'gpx';
  origin: string;
  destination: string;
  distanceKm: number;
  coordinates: [number, number][];
  isRouteReady: boolean;
  gpxFileName?: string;

  // Timing & Pace
  targetMode: 'arrive' | 'depart';
  rideDate: string; // ISO date string e.g. 2026-11-09
  targetTime: string; // HH:mm e.g. 09:00
  paceTier: 'easy' | 'steady' | 'brisk';
  parkingBufferMin: number;

  // Optional Physics override in timing
  headwindKmH: number;
  gradientPercent: number;

  // Rider & Bike
  riderWeightKg: number;
  luggageWeightKg: number;
  selectedBikeId: string;
  isTubeless: boolean;
  cdaOverride?: number;
  crrOverride?: number;
}
