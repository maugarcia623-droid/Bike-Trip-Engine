export type AmenityCategory = 'water' | 'cemetery' | 'food' | 'mechanix';

export interface StageAmenity {
  /** Deterministic POI identifier (e.g. "node/123456" or "way/789012") */
  id: string;
  /** Primary resupply category */
  category: AmenityCategory;
  /** Raw OSM sub-type (e.g. 'drinking_water', 'water_tap', 'spring', 'cemetery', 'bakery', 'supermarket', 'cafe', 'bicycle', 'bicycle_repair_station', 'shelter') */
  subType: string;
  /** Curated name or bilingual fallback */
  name: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Snapped kilometer mark along the active route polyline */
  routeKm: number;
  /** Perpendicular Haversine detour in meters from the nearest route vertex */
  detourMeters: number;
  /** Elevation in meters inherited from nearest GPX vertex */
  elevationMeters?: number;
  /** Raw OSM opening_hours string if available */
  openingHours?: string;
  /** Whether the rider has pinned/starred this stop to their active ride plan */
  isPinned?: boolean;
}

export type WaterGapSeverity = 'clear' | 'caution' | 'critical';

export interface WaterGapAlert {
  startKm: number;
  endKm: number;
  distanceKm: number;
  severity: WaterGapSeverity;
  recommendedBidons?: number;
}

export interface WaterGapsSummary {
  status: WaterGapSeverity;
  maxGapKm: number;
  gaps: WaterGapAlert[];
  cautionGaps: WaterGapAlert[];
  criticalGaps: WaterGapAlert[];
  totalWaterPoints: number;
}
