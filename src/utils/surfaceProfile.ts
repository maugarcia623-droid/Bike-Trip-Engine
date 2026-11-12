import {
  ElevationProfilePoint,
  GravelSuitabilityAssessment,
  GravelSuitabilityLevel,
  RouteParams,
  SectorTechnicality,
  SurfaceBreakdown,
  SurfaceSegment,
  SurfaceType,
} from '../types/trip';
import { loadRiderBikeSpecs } from './specsStorage';
import {
  EdgeOsmMatch,
  OsmSurfaceRouteData,
  matchPolylineEdgesToOsmWays,
} from '../services/osmSurfaceService';

export interface SurfaceVisualMeta {
  type: SurfaceType;
  colorLight: string;
  colorDark: string;
  casingLight: string;
  casingDark: string;
  dashArray?: string;
  barBgClass: string;
  dotBgClass: string;
  textClass: string;
  badgeClass: string;
  labelEn: string;
  labelFr: string;
  shortLabelEn: string;
  shortLabelFr: string;
}

export const SURFACE_VISUAL_META: Record<SurfaceType, SurfaceVisualMeta> = {
  paved: {
    type: 'paved',
    colorLight: '#0284C7', // Crisp Sky / Tarmac Blue
    colorDark: '#38BDF8',
    casingLight: '#0F172A',
    casingDark: '#082F49',
    dashArray: undefined,
    barBgClass: 'bg-sky-500 dark:bg-sky-400',
    dotBgClass: 'bg-sky-500 dark:bg-sky-400',
    textClass: 'text-sky-600 dark:text-sky-400',
    badgeClass:
      'bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/25',
    labelEn: 'Paved Road',
    labelFr: 'Route bitumée',
    shortLabelEn: 'Paved',
    shortLabelFr: 'Bitume',
  },
  gravel: {
    type: 'gravel',
    colorLight: '#D97706', // High-Vis Ochre / Gravel Amber
    colorDark: '#F59E0B',
    casingLight: '#1E293B',
    casingDark: '#451A03',
    dashArray: '10, 6',
    barBgClass: 'bg-amber-500 dark:bg-amber-400',
    dotBgClass: 'bg-amber-500 dark:bg-amber-400',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeClass:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30',
    labelEn: 'Unpaved / Gravel',
    labelFr: 'Chemin / Gravel',
    shortLabelEn: 'Gravel',
    shortLabelFr: 'Gravel',
  },
  singletrack: {
    type: 'singletrack',
    colorLight: '#E11D48', // Vivid Rose / Trail Singletrack
    colorDark: '#FB7185',
    casingLight: '#1E293B',
    casingDark: '#4C0519',
    dashArray: '4, 6',
    barBgClass: 'bg-rose-500 dark:bg-rose-400',
    dotBgClass: 'bg-rose-500 dark:bg-rose-400',
    textClass: 'text-rose-600 dark:text-rose-400',
    badgeClass:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30',
    labelEn: 'Path / Singletrack',
    labelFr: 'Sentier / Singletrack',
    shortLabelEn: 'Singletrack',
    shortLabelFr: 'Sentier',
  },
};

interface SectorBlueprint {
  type: SurfaceType;
  sharePct: number; // relative weight, normalized to 100
  nameEn: string;
  nameFr: string;
  surfaceDetailEn: string;
  surfaceDetailFr: string;
  technicality: SectorTechnicality;
  suitability38c: 'ideal' | 'capable' | 'caution';
  riderNoteEn: string;
  riderNoteFr: string;
}

const DEFAULT_CORRIDOR_COORDS: [number, number][] = [
  [47.2184, -1.5536],
  [47.205, -1.6],
  [47.235, -1.72],
  [47.25, -1.86],
  [47.28, -2.05],
  [47.273, -2.18],
  [47.284, -2.208],
];

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ensures the coordinate array has enough resolution (at least ~64 vertices)
 * so short surface sectors (e.g. 6% singletrack) slice cleanly along the polyline.
 */
export function densifyRouteCoordinates(
  coords: [number, number][] | undefined,
  minPoints: number = 64
): [number, number][] {
  const source =
    coords && coords.length >= 2 ? coords : DEFAULT_CORRIDOR_COORDS;
  if (source.length >= minPoints) return source;

  const segDists: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < source.length; i++) {
    const d = Math.max(0.001, haversineKm(source[i - 1], source[i]));
    segDists.push(d);
    totalLen += d;
  }

  if (totalLen <= 0) return source;

  const result: [number, number][] = [];
  for (let i = 0; i < source.length - 1; i++) {
    const start = source[i];
    const end = source[i + 1];
    const share = segDists[i] / totalLen;
    const steps = Math.max(2, Math.round(share * minPoints));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([
        Number((start[0] + (end[0] - start[0]) * t).toFixed(6)),
        Number((start[1] + (end[1] - start[1]) * t).toFixed(6)),
      ]);
    }
  }
  result.push(source[source.length - 1]);
  return result;
}

/**
 * Builds deterministic sector blueprints tailored to the route's geography,
 * preset archetype, and active surface chips.
 */
function selectSectorBlueprints(
  route: Partial<RouteParams>,
  customChips: string[] = []
): SectorBlueprint[] {
  const hay = [
    route.origin ?? '',
    route.destination ?? '',
    route.gpxFileName ?? '',
    ...(route.waypoints ?? []).map((w) => w.name),
  ]
    .join(' ')
    .toLowerCase();

  const hasGravelChip =
    customChips.includes('gravel-trail-master') ||
    customChips.includes('off-road-exploration');
  const hasBikepackingChip =
    customChips.includes('bivouac-camp') ||
    customChips.includes('mountain-adventure');

  // 1. Grande Brière Gravel Loop (48% Paved, 40% Gravel, 12% Singletrack)
  if (hay.includes('brière') || hay.includes('briere') || hay.includes('kerhinet')) {
    return [
      {
        type: 'paved',
        sharePct: 18,
        nameEn: 'Saint-Nazaire Rollout & Marsh Approach',
        nameFr: 'Sortie de Saint-Nazaire & Approche Brière',
        surfaceDetailEn: 'Smooth regional cycleway & quiet backroads',
        surfaceDetailFr: 'Piste cyclable lisse & petites routes de marais',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Fast warm-up tarmac before entering the marsh tracks.',
        riderNoteFr: 'Bitume roulant idéal pour s’échauffer avant les marais.',
      },
      {
        type: 'gravel',
        sharePct: 24,
        nameEn: 'Chaussée de Rozé & White Shell Causeway',
        nameFr: 'Chaussée de Rozé & Chemin Blanc des Chalandiers',
        surfaceDetailEn: 'Compacted limestone & crushed oyster-shell doubletrack',
        surfaceDetailFr: 'Calcaire compacté & chemin blanc coquillier',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Prime 38c territory — firm, flat, and reassuringly wide.',
        riderNoteFr: 'Terrain rêvé en 38c : ferme, plat et très rassurant.',
      },
      {
        type: 'singletrack',
        sharePct: 12,
        nameEn: 'Kerhinet Reedbed & Oak Singletrack',
        nameFr: 'Sentier Monotrace de Kerhinet & Chênaie',
        surfaceDetailEn: 'Narrow packed-earth trail with exposed tree roots & ruts',
        surfaceDetailFr: 'Sentier étroit en terre battue avec racines affleurantes',
        technicality: 'technical',
        suitability38c: 'caution',
        riderNoteEn: 'Watch line choice on 38c tires — unweight the front wheel over roots.',
        riderNoteFr: 'Vigilance en 38c : soulagez la roue avant sur les racines.',
      },
      {
        type: 'paved',
        sharePct: 16,
        nameEn: 'Saint-Lyphard Thatch Village Connector',
        nameFr: 'Liaison Village de Chaumières (Saint-Lyphard)',
        surfaceDetailEn: 'Quiet country lane with clean tarmac',
        surfaceDetailFr: 'Petite route communale au bitume propre',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Smooth recovery section between off-road sectors.',
        riderNoteFr: 'Portion bitumée reposante entre deux secteurs gravel.',
      },
      {
        type: 'gravel',
        sharePct: 16,
        nameEn: 'Île de Fédrun Perimeter Track',
        nameFr: 'Chemin de Ronde de l’Île de Fédrun',
        surfaceDetailEn: 'Fine gravel & grassy meadow track',
        surfaceDetailFr: 'Gravier fin & chemin de prairie',
        technicality: 'moderate',
        suitability38c: 'capable',
        riderNoteEn: 'Slightly softer after rain — keep steady seated cadence on 38c.',
        riderNoteFr: 'Un peu souple après la pluie — pédalez souple assis en 38c.',
      },
      {
        type: 'paved',
        sharePct: 14,
        nameEn: 'Estuary Return Boulevard',
        nameFr: 'Retour Voie Vélo Estuaire',
        surfaceDetailEn: 'Dedicated cycle path back to finish',
        surfaceDetailFr: 'Voie verte bitumée jusqu’à l’arrivée',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Easy spin home on smooth cycleway.',
        riderNoteFr: 'Retour fluide sur piste cyclable.',
      },
    ];
  }

  // 2. Canal de Nantes à Brest / Redon (56% Paved, 38% Gravel, 6% Singletrack)
  if (hay.includes('canal') || hay.includes('redon') || hay.includes('blain') || hay.includes('nort')) {
    return [
      {
        type: 'paved',
        sharePct: 24,
        nameEn: 'Erdre Valley Paved Greenway',
        nameFr: 'Voie Verte Bitumée de la Vallée de l’Erdre',
        surfaceDetailEn: 'Smooth riverside asphalt cycleway',
        surfaceDetailFr: 'Enrobé lisse le long de l’Erdre',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Effortless rolling on sheltered cycle path.',
        riderNoteFr: 'Rendement optimal sur voie verte abritée.',
      },
      {
        type: 'gravel',
        sharePct: 22,
        nameEn: 'Quiheix to Blain Historic Towpath',
        nameFr: 'Chemin de Halage Historique (Quiheix – Blain)',
        surfaceDetailEn: 'Stabilized fine quarry sand & compacted gravel',
        surfaceDetailFr: 'Sable de carrière stabilisé & gravier compacté',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Zero anxiety for 38c tires — flat, car-free, and predictable.',
        riderNoteFr: 'Zéro stress en 38c : plat, sans voitures et très régulier.',
      },
      {
        type: 'paved',
        sharePct: 18,
        nameEn: 'Château de Blain & Lock Crossings',
        nameFr: 'Traversée de Blain & Passerelles d’Écluses',
        surfaceDetailEn: 'Paved lock aprons & quiet village roads',
        surfaceDetailFr: 'Abords d’écluses bitumés & petites routes',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Clean tarmac with gentle lock-bridge ramps.',
        riderNoteFr: 'Bitume propre avec petites rampes de ponts d’écluses.',
      },
      {
        type: 'singletrack',
        sharePct: 6,
        nameEn: 'Forêt du Gâvre Woodland Detour',
        nameFr: 'Sentier Forestier du Gâvre',
        surfaceDetailEn: 'Forest singletrack with pine needles & scattered stones',
        surfaceDetailFr: 'Sentier sous-bois avec aiguilles de pin & pierres',
        technicality: 'moderate',
        suitability38c: 'capable',
        riderNoteEn: 'Narrow forest path — keep two fingers on the brakes on 38c.',
        riderNoteFr: 'Sentier étroit en sous-bois — gardez deux doigts sur les freins.',
      },
      {
        type: 'gravel',
        sharePct: 16,
        nameEn: 'Oust Confluence Gravel Halage',
        nameFr: 'Halage Gravel de la Confluence de l’Oust',
        surfaceDetailEn: 'Rolled limestone towpath into Redon',
        surfaceDetailFr: 'Chemin de halage en calcaire roulé vers Redon',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Fast, scenic gravel glide into Redon basin.',
        riderNoteFr: 'Glisse fluide sur gravier roulant jusqu’au bassin de Redon.',
      },
      {
        type: 'paved',
        sharePct: 14,
        nameEn: 'Redon Port & Station Approach',
        nameFr: 'Approche Port & Gare de Redon',
        surfaceDetailEn: 'Urban cycle lanes & dockside cobblestones',
        surfaceDetailFr: 'Bandes cyclables urbaines & quais aménagés',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Smooth final approach to port and train hub.',
        riderNoteFr: 'Approche finale aisée vers le port et la gare.',
      },
    ];
  }

  // 3. Drôme & Vercors Alpine / Bikepacking (62% Paved, 26% Gravel, 12% Singletrack)
  if (hay.includes('vercors') || hay.includes('drôme') || hay.includes('drome') || hay.includes('die') || hay.includes('roussillon')) {
    return [
      {
        type: 'paved',
        sharePct: 30,
        nameEn: 'Valence to Crest Valley Warmup',
        nameFr: 'Vallée de la Drôme (Valence – Crest)',
        surfaceDetailEn: 'Secondary departmental road with grippy tarmac',
        surfaceDetailFr: 'Route départementale secondaire au bitume adhérent',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: '38c tires roll smoothly here while saving energy for the climbs.',
        riderNoteFr: 'Les pneus 38c filtrent les vibrations avant les cols.',
      },
      {
        type: 'gravel',
        sharePct: 16,
        nameEn: 'Drôme Riverbank Limestone Track',
        nameFr: 'Piste Calcaire des Berges de la Drôme',
        surfaceDetailEn: 'Coarse white river gravel & farm track',
        surfaceDetailFr: 'Gravier blanc de rivière & piste agricole',
        technicality: 'moderate',
        suitability38c: 'capable',
        riderNoteEn: 'Chunkier stones in spots — lower pressure to ~2.4 bar helps 38c grip.',
        riderNoteFr: 'Graviers plus gros par endroits — ~2,4 bar améliore le grip en 38c.',
      },
      {
        type: 'paved',
        sharePct: 32,
        nameEn: 'Col de Rousset Foothill Switchbacks',
        nameFr: 'Lacets d’Approche du Vercors',
        surfaceDetailEn: 'Mountain tarmac climb & sweeping descent',
        surfaceDetailFr: 'Ascension sur bitume de montagne & lacets',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: '38c width gives extra cornering confidence on alpine descents.',
        riderNoteFr: 'La section 38c sécurise les trajectoires en descente.',
      },
      {
        type: 'singletrack',
        sharePct: 12,
        nameEn: 'Plateau du Vercors Rocky Traverse',
        nameFr: 'Traversée Rocailleuse du Plateau du Vercors',
        surfaceDetailEn: 'Rocky alpine trail with loose limestone slabs',
        surfaceDetailFr: 'Sentier d’altitude avec dalles calcaires et pierres mobiles',
        technicality: 'technical',
        suitability38c: 'caution',
        riderNoteEn: 'Technical for 38c entry-level gravel — take it slow or walk rocky steps.',
        riderNoteFr: 'Technique pour du 38c : réduisez l’allure sur les marches rocheuses.',
      },
      {
        type: 'gravel',
        sharePct: 10,
        nameEn: 'High Meadow Forest Fire Road',
        nameFr: 'Piste Forestière des Hauts Plateaux',
        surfaceDetailEn: 'Packed forest dirt & fine gravel',
        surfaceDetailFr: 'Terre forestière battue & gravier fin',
        technicality: 'smooth',
        suitability38c: 'ideal',
        riderNoteEn: 'Wide forest track with forgiving grip.',
        riderNoteFr: 'Piste forestière large et très tolérante.',
      },
    ];
  }

  // 4. Default / Mixed Corridor Signature: 72% Paved Road, 22% Unpaved/Gravel, 6% Path/Singletrack
  // Adjusts dynamically if gravel or bikepacking chips are toggled!
  const gravelBoost = hasGravelChip ? 12 : hasBikepackingChip ? 6 : 0;
  const singletrackBoost = hasGravelChip ? 4 : hasBikepackingChip ? 2 : 0;

  const s1Paved = Math.max(12, 28 - Math.round(gravelBoost * 0.5));
  const s2Gravel = 14 + Math.round(gravelBoost * 0.6);
  const s3Paved = Math.max(12, 26 - Math.round((gravelBoost + singletrackBoost) * 0.5));
  const s4Singletrack = 6 + singletrackBoost;
  const s5Gravel = 8 + Math.round(gravelBoost * 0.4);
  const s6Paved = Math.max(10, 100 - (s1Paved + s2Gravel + s3Paved + s4Singletrack + s5Gravel));

  return [
    {
      type: 'paved',
      sharePct: s1Paved,
      nameEn: 'Urban Exit & Cycleway Rollout',
      nameFr: 'Sortie Urbaine & Voie Cyclable',
      surfaceDetailEn: 'Smooth asphalt cycle track & quiet collector road',
      surfaceDetailFr: 'Piste cyclable bitumée & route secondaire fluide',
      technicality: 'smooth',
      suitability38c: 'ideal',
      riderNoteEn: 'Smooth, fast tarmac — easy warm-up for 38 mm tires.',
      riderNoteFr: 'Bitume lisse et roulant — mise en jambes idéale en 38 mm.',
    },
    {
      type: 'gravel',
      sharePct: s2Gravel,
      nameEn: 'Riverside Compacted Towpath',
      nameFr: 'Chemin de Halage Compacté',
      surfaceDetailEn: 'Stabilized white limestone gravel (Voie Verte)',
      surfaceDetailFr: 'Calcaire blanc stabilisé & gravier fin roulé',
      technicality: 'smooth',
      suitability38c: 'ideal',
      riderNoteEn: 'Ideal for 38c entry-level gravel — firm surface with zero loose ruts.',
      riderNoteFr: 'Idéal pour débuter en gravel 38c : sol ferme sans ornières.',
    },
    {
      type: 'paved',
      sharePct: s3Paved,
      nameEn: 'Bocage Country Lane Transition',
      nameFr: 'Liaison Petites Routes du Bocage',
      surfaceDetailEn: 'Low-traffic rural tarmac with gentle rollers',
      surfaceDetailFr: 'Petites routes de campagne à faible trafic',
      technicality: 'smooth',
      suitability38c: 'ideal',
      riderNoteEn: 'Quiet paved sector connecting the two unpaved stretches.',
      riderNoteFr: 'Portion bitumée calme reliant les deux secteurs non-revêtus.',
    },
    {
      type: 'singletrack',
      sharePct: s4Singletrack,
      nameEn: 'Woodland & Marsh Edge Singletrack',
      nameFr: 'Sentier Monotrace de Lisière',
      surfaceDetailEn: 'Narrow dirt path with tree roots & occasional stones',
      surfaceDetailFr: 'Sentier étroit en terre avec quelques racines et pierres',
      technicality: 'technical',
      suitability38c: 'caution',
      riderNoteEn: 'Most technical sector of the ride — relax your elbows & pick a clean line on 38c.',
      riderNoteFr: 'Secteur le plus technique : fléchissez les coudes et soignez vos trajectoires en 38c.',
    },
    {
      type: 'gravel',
      sharePct: s5Gravel,
      nameEn: 'Estuary Meadow Gravel Track',
      nameFr: 'Piste Gravel des Prairies d’Estuaire',
      surfaceDetailEn: 'Fine crushed gravel with slight washboard texture',
      surfaceDetailFr: 'Gravier concassé fin avec léger grain',
      technicality: 'moderate',
      suitability38c: 'capable',
      riderNoteEn: '38c tires handle this well — stay seated on any short rises for rear traction.',
      riderNoteFr: 'Très bien géré en 38c — restez assis dans les relances pour garder l’adhérence.',
    },
    {
      type: 'paved',
      sharePct: s6Paved,
      nameEn: 'Final Destination Approach',
      nameFr: 'Approche Finale Bitumée',
      surfaceDetailEn: 'Protected bike lane & smooth boulevard tarmac',
      surfaceDetailFr: 'Bande cyclable protégée & bitume lisse jusqu’à l’arrivée',
      technicality: 'smooth',
      suitability38c: 'ideal',
      riderNoteEn: 'Clean paved finish all the way to destination.',
      riderNoteFr: 'Fin de parcours 100 % bitumée jusqu’à destination.',
    },
  ];
}

interface ResolvedEdge {
  startCoordIdx: number;
  endCoordIdx: number;
  distKm: number;
  cumStartKm: number;
  cumEndKm: number;
  matched: EdgeOsmMatch | null;
  type: SurfaceType;
  technicality: SectorTechnicality;
  suitability38c: 'ideal' | 'capable' | 'caution';
  effectiveCrr: number;
  isInferredFromHighway: boolean;
  detailEn: string;
  detailFr: string;
  riderNoteEn: string;
  riderNoteFr: string;
}

interface OsmEdgeBlock {
  type: SurfaceType;
  edges: ResolvedEdge[];
}

function subdivideRouteForOsm(
  coords: [number, number][] | undefined,
  maxEdgeKm: number = 0.22
): [number, number][] {
  const source =
    coords && coords.length >= 2 ? coords : DEFAULT_CORRIDOR_COORDS;
  const result: [number, number][] = [];

  for (let i = 0; i < source.length - 1; i++) {
    const start = source[i];
    const end = source[i + 1];
    const dKm = haversineKm(start, end);
    const steps = dKm > maxEdgeKm ? Math.min(18, Math.max(2, Math.ceil(dKm / maxEdgeKm))) : 1;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([
        Number((start[0] + (end[0] - start[0]) * t).toFixed(6)),
        Number((start[1] + (end[1] - start[1]) * t).toFixed(6)),
      ]);
    }
  }
  result.push(source[source.length - 1]);
  return result;
}

function pickWeightedValue<T extends string | undefined>(
  edges: ResolvedEdge[],
  getter: (edge: ResolvedEdge) => T
): string | undefined {
  const weights = new Map<string, number>();
  for (const e of edges) {
    const val = getter(e);
    if (!val) continue;
    weights.set(val, (weights.get(val) || 0) + Math.max(0.01, e.distKm));
  }
  let bestVal: string | undefined;
  let bestWeight = 0;
  weights.forEach((w, val) => {
    if (w > bestWeight) {
      bestWeight = w;
      bestVal = val;
    }
  });
  return bestVal;
}

function collectTopRoadNames(edges: ResolvedEdge[], limit: number = 2): string[] {
  const weights = new Map<string, number>();
  for (const e of edges) {
    const name = e.matched?.way.tags.name?.trim();
    const ref = e.matched?.way.tags.ref?.trim();
    const label = name || ref;
    if (!label) continue;
    weights.set(label, (weights.get(label) || 0) + Math.max(0.01, e.distKm));
  }
  return Array.from(weights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function formatSectorTitleFromOsm(
  type: SurfaceType,
  edges: ResolvedEdge[],
  sectorNumber: number,
  osmRef?: string
): { nameEn: string; nameFr: string } {
  const topNames = collectTopRoadNames(edges, 2);
  if (topNames.length > 0) {
    const primary = topNames[0];
    const joined =
      topNames.length > 1 && primary.length + topNames[1].length <= 34
        ? `${primary} · ${topNames[1]}`
        : primary;
    const prefixRef =
      osmRef && !joined.includes(osmRef) && joined.length <= 26
        ? `${joined} (${osmRef})`
        : joined;
    return { nameEn: prefixRef, nameFr: prefixRef };
  }

  if (osmRef) {
    if (type === 'paved') {
      return { nameEn: `${osmRef} Paved Road`, nameFr: `Route ${osmRef}` };
    }
    if (type === 'gravel') {
      return { nameEn: `${osmRef} Gravel Track`, nameFr: `Piste gravel ${osmRef}` };
    }
    return { nameEn: `${osmRef} Trail`, nameFr: `Sentier ${osmRef}` };
  }

  if (type === 'paved') {
    return {
      nameEn: `Paved Stretch #${sectorNumber}`,
      nameFr: `Tronçon bitumé #${sectorNumber}`,
    };
  }
  if (type === 'gravel') {
    return {
      nameEn: `Rural Gravel Track #${sectorNumber}`,
      nameFr: `Chemin gravier #${sectorNumber}`,
    };
  }
  return {
    nameEn: `Natural Path #${sectorNumber}`,
    nameFr: `Sentier naturel #${sectorNumber}`,
  };
}

function coalesceOsmBlocks(edges: ResolvedEdge[]): OsmEdgeBlock[] {
  if (edges.length === 0) return [];

  // Pass 1: group consecutive edges by SurfaceType
  let blocks: OsmEdgeBlock[] = [];
  for (const edge of edges) {
    const prev = blocks[blocks.length - 1];
    if (prev && prev.type === edge.type) {
      prev.edges.push(edge);
    } else {
      blocks.push({ type: edge.type, edges: [edge] });
    }
  }

  const blockDist = (b: OsmEdgeBlock) =>
    b.edges.reduce((acc, e) => acc + e.distKm, 0);
  const totalRouteKm = edges.reduce((acc, e) => acc + e.distKm, 0);
  const frameThresholdKm = totalRouteKm >= 25 ? 0.25 : 0.16;

  // Pass 2: absorb tiny intersection slivers (< frameThresholdKm) when framed by matching surface
  // and eliminate micro-blips (< 0.15km) so every sector is >= 0.2km cleanly
  for (let pass = 0; pass < 2 && blocks.length >= 2; pass++) {
    const nextBlocks: OsmEdgeBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const curr = blocks[i];
      const d = blockDist(curr);
      const hasTech = curr.edges.some((e) => e.technicality === 'technical');
      const prev = nextBlocks[nextBlocks.length - 1];
      const next = blocks[i + 1];

      const isFramedSliver =
        d < frameThresholdKm && !hasTech && prev && next && prev.type === next.type;
      const isTinyMicroBlip =
        d < 0.15 && (prev || next);

      if (isFramedSliver || isTinyMicroBlip) {
        if (prev && (!next || blockDist(prev) >= blockDist(next) || (next && prev.type === next.type))) {
          prev.edges.push(...curr.edges);
        } else if (next) {
          next.edges.unshift(...curr.edges);
        }
        continue;
      }

      if (prev && prev.type === curr.type) {
        prev.edges.push(...curr.edges);
      } else {
        nextBlocks.push({ type: curr.type, edges: [...curr.edges] });
      }
    }
    blocks = nextBlocks;
  }

  // Pass 3: if the entire route resolved into 1-2 ultra-long uniform blocks (> 12km),
  // split on major OSM name/ref milestones near thirds so the sector inspector stays useful
  if (blocks.length <= 2) {
    const splitBlocks: OsmEdgeBlock[] = [];
    for (const block of blocks) {
      const len = blockDist(block);
      if (len >= 12 && block.edges.length >= 9) {
        const thirdLen = len / 3;
        let currentChunk: ResolvedEdge[] = [];
        let accLen = 0;
        let partsCreated = 0;

        for (let i = 0; i < block.edges.length; i++) {
          const edge = block.edges[i];
          currentChunk.push(edge);
          accLen += edge.distKm;

          const nextEdge = block.edges[i + 1];
          const currLabel = edge.matched?.way.tags.name || edge.matched?.way.tags.ref;
          const nextLabel = nextEdge?.matched?.way.tags.name || nextEdge?.matched?.way.tags.ref;
          const labelChanged = currLabel && nextLabel && currLabel !== nextLabel;

          if (
            partsCreated < 2 &&
            accLen >= thirdLen * 0.85 &&
            (labelChanged || accLen >= thirdLen * 1.15) &&
            i < block.edges.length - 2
          ) {
            splitBlocks.push({ type: block.type, edges: currentChunk });
            currentChunk = [];
            accLen = 0;
            partsCreated++;
          }
        }
        if (currentChunk.length > 0) {
          splitBlocks.push({ type: block.type, edges: currentChunk });
        }
      } else {
        splitBlocks.push(block);
      }
    }
    blocks = splitBlocks;
  }

  return blocks;
}

function buildOsmSegmentsFromRoute(
  route: Partial<RouteParams>,
  osmData: OsmSurfaceRouteData,
  profilePoints: ElevationProfilePoint[],
  totalDistKm: number
): {
  segments: SurfaceSegment[];
  denseCoords: [number, number][];
  osmCoveragePct: number;
  explicitTagPct: number;
} | null {
  if (!route.coordinates || route.coordinates.length < 2 || osmData.ways.length === 0) {
    return null;
  }

  const denseCoords = subdivideRouteForOsm(route.coordinates, 0.22);
  if (denseCoords.length < 2) return null;

  const rawEdgeMatches = matchPolylineEdgesToOsmWays(denseCoords, osmData.ways);
  const edgeCount = denseCoords.length - 1;

  const edgeDistsKm: number[] = [];
  let rawTotalKm = 0;
  let directMatchedKm = 0;
  let explicitTaggedKm = 0;

  for (let i = 0; i < edgeCount; i++) {
    const d = Math.max(0.005, haversineKm(denseCoords[i], denseCoords[i + 1]));
    edgeDistsKm.push(d);
    rawTotalKm += d;
    const m = rawEdgeMatches[i];
    if (m) {
      directMatchedKm += d;
      if (!m.classified.isInferredFromHighway) {
        explicitTaggedKm += d;
      }
    }
  }

  const osmCoveragePct =
    rawTotalKm > 0 ? Math.round((directMatchedKm / rawTotalKm) * 100) : 0;
  if (osmCoveragePct < 15 || rawTotalKm <= 0) {
    return null;
  }

  const explicitTagPct =
    directMatchedKm > 0 ? Math.round((explicitTaggedKm / directMatchedKm) * 100) : 0;

  // Interpolate rare unmatched edges from closest neighbor match along the route
  let cumKm = 0;
  const resolvedEdges: ResolvedEdge[] = [];
  for (let i = 0; i < edgeCount; i++) {
    let match = rawEdgeMatches[i];
    if (!match) {
      for (let offset = 1; offset <= 5; offset++) {
        if (i - offset >= 0 && rawEdgeMatches[i - offset]) {
          match = rawEdgeMatches[i - offset];
          break;
        }
        if (i + offset < edgeCount && rawEdgeMatches[i + offset]) {
          match = rawEdgeMatches[i + offset];
          break;
        }
      }
    }

    const segDist = (edgeDistsKm[i] / rawTotalKm) * totalDistKm;
    const cumStartKm = (cumKm / rawTotalKm) * totalDistKm;
    cumKm += edgeDistsKm[i];
    const cumEndKm = (cumKm / rawTotalKm) * totalDistKm;

    const c = match?.classified;
    resolvedEdges.push({
      startCoordIdx: i,
      endCoordIdx: i + 1,
      distKm: segDist,
      cumStartKm,
      cumEndKm,
      matched: match,
      type: c?.surfaceType || 'paved',
      technicality: c?.technicality || 'smooth',
      suitability38c: c?.suitability38c || 'ideal',
      effectiveCrr: c?.effectiveCrr ?? 0.0046,
      isInferredFromHighway: c?.isInferredFromHighway ?? true,
      detailEn: c?.detailEn || 'Paved Road',
      detailFr: c?.detailFr || 'Route bitumée',
      riderNoteEn:
        c?.riderNoteEn ||
        'Smooth paved road — steady rhythm on all-road tires.',
      riderNoteFr:
        c?.riderNoteFr ||
        'Route bitumée roulante — rythme fluide sans à-coups.',
    });
  }

  const blocks = coalesceOsmBlocks(resolvedEdges);
  if (blocks.length === 0) return null;

  const techRank: Record<SectorTechnicality, number> = {
    smooth: 0,
    moderate: 1,
    technical: 2,
  };
  const suitRank: Record<'ideal' | 'capable' | 'caution', number> = {
    ideal: 0,
    capable: 1,
    caution: 2,
  };

  let cursorPct = 0;
  const segments: SurfaceSegment[] = blocks.map((block, idx) => {
    const isLast = idx === blocks.length - 1;
    const firstEdge = block.edges[0];
    const lastEdge = block.edges[block.edges.length - 1];

    const rawStartKm = firstEdge.cumStartKm;
    const rawEndKm = isLast ? totalDistKm : lastEdge.cumEndKm;
    const blockDistKm = Math.max(0.05, rawEndKm - rawStartKm);

    const startPct = cursorPct;
    const sharePct = totalDistKm > 0 ? (blockDistKm / totalDistKm) * 100 : 100 / blocks.length;
    const endPct = isLast ? 100 : Math.min(100, cursorPct + sharePct);
    cursorPct = endPct;

    const startKm = Number(rawStartKm.toFixed(1));
    const endKm = Number((isLast ? totalDistKm : rawEndKm).toFixed(1));
    const distanceKm = Number(Math.max(0.1, endKm - startKm).toFixed(1));

    const startCoordIdx = firstEdge.startCoordIdx;
    const endCoordIdx = lastEdge.endCoordIdx;
    const segCoords = denseCoords.slice(startCoordIdx, endCoordIdx + 1);

    const matchingPoints = profilePoints.filter((pt) => {
      const ptPct = totalDistKm > 0 ? (pt.distKm / totalDistKm) * 100 : 0;
      return ptPct >= startPct - 1 && ptPct <= endPct + 1;
    });
    const grades =
      matchingPoints.length > 0
        ? matchingPoints.map((p) => Math.abs(p.gradePct))
        : [1.2];
    const avgGradePct = Number(
      (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)
    );
    const maxGradePct = Number(Math.max(...grades, 1.5).toFixed(1));

    // Weighted physical Crr & worst technicality inside block
    let crrWeightedSum = 0;
    let totalBlockWeight = 0;
    let inferredWeight = 0;
    let worstTech: SectorTechnicality = 'smooth';
    let worstSuit: 'ideal' | 'capable' | 'caution' = 'ideal';
    let dominantDetailEn = firstEdge.detailEn;
    let dominantDetailFr = firstEdge.detailFr;
    let dominantNoteEn = firstEdge.riderNoteEn;
    let dominantNoteFr = firstEdge.riderNoteFr;
    let longestSingleEdge = -1;

    const wayIdsSet = new Set<number>();
    for (const e of block.edges) {
      const w = Math.max(0.01, e.distKm);
      crrWeightedSum += e.effectiveCrr * w;
      totalBlockWeight += w;
      if (e.isInferredFromHighway) inferredWeight += w;
      if (techRank[e.technicality] > techRank[worstTech]) worstTech = e.technicality;
      if (suitRank[e.suitability38c] > suitRank[worstSuit]) worstSuit = e.suitability38c;
      if (e.matched?.way.id) wayIdsSet.add(e.matched.way.id);
      if (w > longestSingleEdge) {
        longestSingleEdge = w;
        dominantDetailEn = e.detailEn;
        dominantDetailFr = e.detailFr;
        dominantNoteEn = e.riderNoteEn;
        dominantNoteFr = e.riderNoteFr;
      }
    }

    const osmHighway = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.highway);
    const osmSurfaceTag = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.surface);
    const osmTrackType = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.tracktype);
    const osmSmoothness = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.smoothness);
    const osmMtbScale = pickWeightedValue(block.edges, (e) => e.matched?.way.tags['mtb:scale']);
    const osmSacScale = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.sac_scale);
    const osmName = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.name);
    const osmRef = pickWeightedValue(block.edges, (e) => e.matched?.way.tags.ref);

    const { nameEn, nameFr } = formatSectorTitleFromOsm(
      block.type,
      block.edges,
      idx + 1,
      osmRef
    );

    const isInferredFromHighway =
      totalBlockWeight > 0 ? inferredWeight / totalBlockWeight > 0.65 : true;

    return {
      id: `surf-seg-${idx + 1}`,
      type: block.type,
      startKm,
      endKm,
      distanceKm,
      startPct: Math.round(startPct),
      endPct: isLast ? 100 : Math.round(endPct),
      startCoordIdx,
      endCoordIdx,
      coordinates:
        segCoords.length >= 2
          ? segCoords
          : [denseCoords[0], denseCoords[denseCoords.length - 1]],
      nameEn,
      nameFr,
      surfaceDetailEn: dominantDetailEn,
      surfaceDetailFr: dominantDetailFr,
      avgGradePct,
      maxGradePct,
      effectiveCrr: Number(
        (totalBlockWeight > 0 ? crrWeightedSum / totalBlockWeight : 0.0052).toFixed(4)
      ),
      technicality: worstTech,
      suitability38c: worstSuit,
      riderNoteEn: dominantNoteEn,
      riderNoteFr: dominantNoteFr,
      osmWayIds: Array.from(wayIdsSet),
      osmHighway,
      osmSurfaceTag,
      osmTrackType,
      osmSmoothness,
      osmMtbScale,
      osmSacScale,
      osmName,
      osmRef,
      isInferredFromHighway,
    };
  });

  return {
    segments,
    denseCoords,
    osmCoveragePct,
    explicitTagPct,
  };
}

/**
 * Infers rider tire width in mm from Crr or saved bike profile.
 * Default Van Rysel GRVL AF SWORD (crr = 0.0055) -> 38c.
 */
export function inferTireWidthMm(crr?: number, explicitWidthMm?: number): number {
  if (explicitWidthMm && explicitWidthMm >= 23 && explicitWidthMm <= 60) {
    return explicitWidthMm;
  }
  if (typeof crr === 'number' && Number.isFinite(crr)) {
    if (crr <= 0.0045) return 28;
    if (crr <= 0.0062) return 38;
    return 42;
  }
  return 38;
}

/**
 * Computes surface breakdown, color-coded map segments, elevation point mapping,
 * and Elodie-focused gravel suitability assessment — preferring real OpenStreetMap
 * way data when available and falling back gracefully to corridor heuristics.
 */
export function computeSurfaceBreakdown(
  route: Partial<RouteParams>,
  options?: {
    crr?: number;
    tireWidthMm?: number;
    isTubeless?: boolean;
    riderWeightKg?: number;
    bikeWeightKg?: number;
    luggageWeightKg?: number;
    customChips?: string[];
    osmData?: OsmSurfaceRouteData | null;
    isLoadingOsm?: boolean;
    osmError?: string;
  }
): SurfaceBreakdown {
  const storedSpecs = loadRiderBikeSpecs();
  const activeBike =
    storedSpecs.bikes.find((b) => b.id === storedSpecs.activeBikeId) ??
    storedSpecs.bikes[0];

  const effectiveCrr = options?.crr ?? activeBike?.crr ?? 0.0055;
  const tireWidthMm = inferTireWidthMm(
    effectiveCrr,
    options?.tireWidthMm ?? activeBike?.tireWidthMm
  );
  const isTubeless = options?.isTubeless ?? activeBike?.isTubeless ?? true;
  const systemMassKg =
    (options?.riderWeightKg ?? storedSpecs.riderWeightKg ?? 68) +
    (options?.bikeWeightKg ?? activeBike?.weightKg ?? 10.9) +
    (options?.luggageWeightKg ?? 2);

  const totalDistKm = Math.max(1, route.distanceKm || 22);
  const profilePoints: ElevationProfilePoint[] = route.elevationProfile ?? [];

  // Prefer real OpenStreetMap surface data when route geometry & Overpass ways exist
  const osmBuilt = options?.osmData
    ? buildOsmSegmentsFromRoute(route, options.osmData, profilePoints, totalDistKm)
    : null;

  let segments: SurfaceSegment[];
  let dataSource: 'osm-overpass' | 'heuristic-fallback' = 'heuristic-fallback';
  let osmCoveragePct: number | undefined;
  let explicitTagPct: number | undefined;
  let osmWayCount: number | undefined;
  let osmFetchedAt: string | undefined;

  if (osmBuilt) {
    segments = osmBuilt.segments;
    dataSource = 'osm-overpass';
    osmCoveragePct = osmBuilt.osmCoveragePct;
    explicitTagPct = osmBuilt.explicitTagPct;
    osmWayCount = options?.osmData?.wayCount;
    osmFetchedAt = options?.osmData?.fetchedAt;
  } else {
    const denseCoords = densifyRouteCoordinates(route.coordinates, 72);
    const blueprints = selectSectorBlueprints(route, options?.customChips ?? []);
    const rawTotalShare = blueprints.reduce((acc, b) => acc + b.sharePct, 0) || 100;

    let cursorPct = 0;
    segments = blueprints.map((bp, idx) => {
      const isLast = idx === blueprints.length - 1;
      const normShare = (bp.sharePct / rawTotalShare) * 100;
      const startPct = cursorPct;
      const endPct = isLast ? 100 : Math.min(100, cursorPct + normShare);
      cursorPct = endPct;

      const startKm = Number(((startPct / 100) * totalDistKm).toFixed(1));
      const endKm = Number(((endPct / 100) * totalDistKm).toFixed(1));
      const distanceKm = Number(Math.max(0.2, endKm - startKm).toFixed(1));

      const maxIdx = denseCoords.length - 1;
      const startCoordIdx = Math.min(
        maxIdx,
        Math.max(0, Math.floor((startPct / 100) * maxIdx))
      );
      const endCoordIdx = isLast
        ? maxIdx
        : Math.min(
            maxIdx,
            Math.max(startCoordIdx + 1, Math.round((endPct / 100) * maxIdx))
          );

      const segCoords = denseCoords.slice(startCoordIdx, endCoordIdx + 1);

      const matchingPoints = profilePoints.filter((pt) => {
        const ptPct = totalDistKm > 0 ? (pt.distKm / totalDistKm) * 100 : 0;
        return ptPct >= startPct - 1 && ptPct <= endPct + 1;
      });

      const grades =
        matchingPoints.length > 0
          ? matchingPoints.map((p) => Math.abs(p.gradePct))
          : [1.2];
      const avgGradePct = Number(
        (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)
      );
      const maxGradePct = Number(Math.max(...grades, 1.5).toFixed(1));

      const segCrr =
        bp.type === 'paved'
          ? 0.0042
          : bp.type === 'gravel'
          ? 0.0064
          : 0.0096;

      return {
        id: `surf-seg-${idx + 1}`,
        type: bp.type,
        startKm,
        endKm,
        distanceKm,
        startPct: Math.round(startPct),
        endPct: Math.round(endPct),
        startCoordIdx,
        endCoordIdx,
        coordinates:
          segCoords.length >= 2
            ? segCoords
            : [denseCoords[0], denseCoords[denseCoords.length - 1]],
        nameEn: bp.nameEn,
        nameFr: bp.nameFr,
        surfaceDetailEn: bp.surfaceDetailEn,
        surfaceDetailFr: bp.surfaceDetailFr,
        avgGradePct,
        maxGradePct,
        effectiveCrr: segCrr,
        technicality: bp.technicality,
        suitability38c: bp.suitability38c,
        riderNoteEn: bp.riderNoteEn,
        riderNoteFr: bp.riderNoteFr,
      };
    });
  }

  // Aggregate distances & exact percentages summing to 100%
  const actualSegTotalKm =
    segments.reduce((acc, s) => acc + Math.max(0.05, s.endKm - s.startKm), 0) ||
    totalDistKm;

  let rawPaved = 0;
  let rawGravel = 0;
  let rawSingle = 0;
  let weightedCrrSum = 0;

  for (const s of segments) {
    const segLen = Math.max(0.05, s.endKm - s.startKm);
    const pctSpan = (segLen / actualSegTotalKm) * 100;
    weightedCrrSum += s.effectiveCrr * (segLen / actualSegTotalKm);
    if (s.type === 'paved') rawPaved += pctSpan;
    else if (s.type === 'gravel') rawGravel += pctSpan;
    else rawSingle += pctSpan;
  }

  let singletrackPct = Math.max(0, Math.round(rawSingle));
  let gravelPct = Math.max(0, Math.round(rawGravel));
  if (singletrackPct + gravelPct > 100) {
    singletrackPct = Math.max(0, 100 - gravelPct);
  }
  const pavedPct = Math.max(0, 100 - gravelPct - singletrackPct);

  const pavedKm = Number(((pavedPct / 100) * totalDistKm).toFixed(1));
  const gravelKm = Number(((gravelPct / 100) * totalDistKm).toFixed(1));
  const singletrackKm = Number(
    Math.max(0, totalDistKm - pavedKm - gravelKm).toFixed(1)
  );

  const weightedCrr = Number(weightedCrrSum.toFixed(4));

  // Map each elevationProfile point accurately by km position along segments
  const sampleSource: Array<Partial<ElevationProfilePoint> | undefined> =
    profilePoints.length > 0
      ? profilePoints
      : Array.from({ length: 49 }, () => undefined);

  const pointSurfaces: SurfaceType[] = sampleSource.map((pt, i, arr) => {
    const km =
      pt && typeof pt.distKm === 'number'
        ? pt.distKm
        : (i / Math.max(1, arr.length - 1)) * totalDistKm;
    const found =
      segments.find((s) => km >= s.startKm - 0.05 && km <= s.endKm + 0.05) ??
      segments[segments.length - 1];
    return found ? found.type : 'paved';
  });

  // Compute recommended tire pressures (in bar) for the active tire width & tubeless setup
  const unpavedRatio = (gravelPct + singletrackPct) / 100;
  const baseBar =
    tireWidthMm <= 30
      ? 4.6
      : tireWidthMm <= 39
      ? 2.55 // 38c sweet spot
      : 2.15; // 42c+ sweet spot
  const massAdj = (systemMassKg - 80) * 0.012;
  const tubeAdj = isTubeless ? 0 : 0.35;
  const surfaceAdj = unpavedRatio > 0.2 ? -0.15 : 0.1;

  const recommendedFrontBar = Number(
    Math.max(1.8, Math.min(6.0, baseBar + massAdj + tubeAdj + surfaceAdj - 0.1)).toFixed(1)
  );
  const recommendedRearBar = Number(
    Math.max(1.9, Math.min(6.2, recommendedFrontBar + 0.2)).toFixed(1)
  );

  const unpavedSegments = segments.filter((s) => s.type !== 'paved');
  const technicalSegments = segments.filter(
    (s) => s.technicality === 'technical' || s.suitability38c === 'caution'
  );
  const maxUnpavedStretchKm =
    unpavedSegments.length > 0
      ? Number(
          Math.max(...unpavedSegments.map((s) => s.distanceKm)).toFixed(1)
        )
      : 0;

  let overallLevel: GravelSuitabilityLevel = 'ideal';
  let scorePct = 95;

  if (tireWidthMm <= 30 && unpavedRatio > 0.15) {
    overallLevel = 'technical-caution';
    scorePct = 58;
  } else if (singletrackPct >= 10 || technicalSegments.length >= 1) {
    overallLevel = singletrackPct >= 12 || technicalSegments.length >= 3 ? 'technical-caution' : 'good-with-care';
    scorePct = overallLevel === 'technical-caution' ? 76 : 88;
  } else {
    overallLevel = 'ideal';
    scorePct = unpavedRatio === 0 && tireWidthMm <= 30 ? 98 : 95;
  }

  const firstTech = technicalSegments[0] ?? unpavedSegments[0];
  const techRangeStr = firstTech
    ? `km ${firstTech.startKm}–${firstTech.endKm}`
    : '';
  const watchCount = technicalSegments.length || unpavedSegments.length;

  let headlineEn = `Ideal for ${tireWidthMm}c Gravel Setup`;
  let headlineFr = `Idéal pour montage Gravel ${tireWidthMm}c`;
  let summaryEn =
    gravelPct + singletrackPct === 0
      ? `100% paved route rolls fast and effortlessly on ${tireWidthMm}c tires (${recommendedFrontBar}/${recommendedRearBar} bar).`
      : `${pavedPct}% paved and ${gravelPct}% compacted gravel roll smoothly on ${tireWidthMm}c tires (${recommendedFrontBar}/${recommendedRearBar} bar).`;
  let summaryFr =
    gravelPct + singletrackPct === 0
      ? `Parcours 100 % bitumé très fluide en pneus ${tireWidthMm}c (${String(recommendedFrontBar).replace('.', ',')}/${String(recommendedRearBar).replace('.', ',')} bar).`
      : `${pavedPct} % de bitume et ${gravelPct} % de chemin compacté passent avec fluidité en pneus ${tireWidthMm}c (${String(recommendedFrontBar).replace('.', ',')}/${String(recommendedRearBar).replace('.', ',')} bar).`;

  if (tireWidthMm <= 30 && unpavedRatio > 0.15) {
    headlineEn = `Caution on ${tireWidthMm}c Road Slicks · 38c+ Gravel Tires Advised`;
    headlineFr = `Attention en pneus route ${tireWidthMm}c · Pneus Gravel 38c+ conseillés`;
    summaryEn = `${gravelPct + singletrackPct}% of this route is unpaved (${unpavedSegments.length} sectors). Switch to 38c gravel tires for puncture protection and grip.`;
    summaryFr = `${gravelPct + singletrackPct} % du parcours est non-revêtu (${unpavedSegments.length} secteurs). Privilégiez des pneus gravel 38c pour l’adhérence et éviter les crevaisons.`;
  } else if (overallLevel === 'good-with-care') {
    headlineEn = `Great for ${tireWidthMm}c Gravel · ${watchCount} Trail Sector${watchCount > 1 ? 's' : ''} to Watch (${techRangeStr})`;
    headlineFr = `Adapté au Gravel ${tireWidthMm}c · ${watchCount} secteur${watchCount > 1 ? 's' : ''} à surveiller (${techRangeStr})`;
    summaryEn = `Gravel sectors (${gravelKm} km) are confidence-inspiring on ${tireWidthMm}c tires. Ease off slightly on natural trail sectors (${techRangeStr}) for clean line choice.`;
    summaryFr = `Les secteurs gravel (${gravelKm} km) sont rassurants en ${tireWidthMm}c. Réduisez simplement l’allure sur les passages naturels (${techRangeStr}) pour choisir une belle trace.`;
  } else if (overallLevel === 'technical-caution') {
    headlineEn = `Technical Trail Sectors (${singletrackPct}%) · Line Care Needed on ${tireWidthMm}c`;
    headlineFr = `Sentiers techniques (${singletrackPct} %) · Vigilance requise en ${tireWidthMm}c`;
    summaryEn = `While ${pavedPct + gravelPct}% is smoother tarmac & gravel, ${singletrackKm} km (${techRangeStr}) features uneven trail. Run ${recommendedFrontBar}/${recommendedRearBar} bar and stay light on the bars.`;
    summaryFr = `Si ${pavedPct + gravelPct} % du tracé est roulant, ${singletrackKm} km (${techRangeStr}) empruntent un sentier irrégulier. Gonflez à ${String(recommendedFrontBar).replace('.', ',')}/${String(recommendedRearBar).replace('.', ',')} bar et relâchez les bras.`;
  }

  const suitability: GravelSuitabilityAssessment = {
    overallLevel,
    scorePct,
    tireWidthMm,
    isTubeless,
    recommendedFrontBar,
    recommendedRearBar,
    headlineEn,
    headlineFr,
    summaryEn,
    summaryFr,
    unpavedCount: unpavedSegments.length,
    technicalCount: technicalSegments.length,
    maxUnpavedStretchKm,
  };

  return {
    pavedPct,
    gravelPct,
    singletrackPct,
    pavedKm,
    gravelKm,
    singletrackKm,
    weightedCrr,
    segments,
    pointSurfaces,
    suitability,
    dataSource,
    isLoadingOsm: options?.isLoadingOsm,
    osmCoveragePct,
    explicitTagPct,
    osmWayCount,
    osmError: options?.osmError,
    osmFetchedAt,
  };
}
