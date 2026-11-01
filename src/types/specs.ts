export type NutritionPreference = 'real-food' | 'mixed' | 'sports-fuel';
export type RiderLevel = 'occasional' | 'regular' | 'pro';
export type CockpitViewMode = 'essential' | 'pro';

export interface BikeSpec {
  id: string;
  name: string;
  weightKg: number;
  crr: number;
  cda: number;
  isTubeless: boolean;
}

export interface RiderBikeSpecs {
  riderWeightKg: number;
  riderHeightCm: number;
  ftpWatts: number;
  carbTargetGPerHr: number;
  nutritionPreference: NutritionPreference;
  riderLevel: RiderLevel;
  cockpitViewMode?: CockpitViewMode;
  activeBikeId: string;
  bikes: BikeSpec[];
}

export const DEFAULT_RIDER_BIKE_SPECS: RiderBikeSpecs = {
  riderWeightKg: 68,
  riderHeightCm: 178,
  ftpWatts: 210,
  carbTargetGPerHr: 60,
  nutritionPreference: 'real-food',
  riderLevel: 'regular',
  cockpitViewMode: 'pro',
  activeBikeId: 'bike-sword',
  bikes: [
    {
      id: 'bike-sword',
      name: 'Van Rysel GRVL AF SWORD',
      weightKg: 10.9,
      crr: 0.0055,
      cda: 0.38,
      isTubeless: true,
    },
    {
      id: 'bike-aeroad',
      name: 'Canyon Aeroad CF SLX',
      weightKg: 7.6,
      crr: 0.0040,
      cda: 0.32,
      isTubeless: true,
    },
    {
      id: 'bike-urban',
      name: 'Omnium Urban Utility',
      weightKg: 12.8,
      crr: 0.0070,
      cda: 0.44,
      isTubeless: false,
    },
  ],
};
