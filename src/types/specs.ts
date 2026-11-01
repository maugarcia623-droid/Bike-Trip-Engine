export interface BikeSpec {
  id: string;
  name: string;
  weightKg: number;
  crr: number; // Rolling resistance (0.0040 Road, 0.0055 Gravel, 0.0070 Commuter)
  cda: number; // Aerodynamic drag area (0.32 Drops, 0.38 Hoods, 0.44 Upright)
}

export interface RiderBikeSpecs {
  riderWeightKg: number;
  riderHeightCm: number;
  ftpWatts: number;
  activeBikeId: string;
  bikes: BikeSpec[];
}

export const DEFAULT_RIDER_BIKE_SPECS: RiderBikeSpecs = {
  riderWeightKg: 68,
  riderHeightCm: 178,
  ftpWatts: 210,
  activeBikeId: 'bike-sword',
  bikes: [
    {
      id: 'bike-sword',
      name: 'Van Rysel GRVL AF SWORD',
      weightKg: 10.9,
      crr: 0.0055,
      cda: 0.38,
    },
    {
      id: 'bike-aeroad',
      name: 'Canyon Aeroad CF SLX',
      weightKg: 7.6,
      crr: 0.0040,
      cda: 0.32,
    },
    {
      id: 'bike-urban',
      name: 'Omnium Urban Utility',
      weightKg: 12.8,
      crr: 0.0070,
      cda: 0.44,
    },
  ],
};
