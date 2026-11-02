export interface WeatherCondition {
  source?: "live" | "planned" | "simulated";
  airDensityRho?: number;
  effectiveHeadwindKmH?: number;
  isBeyondForecastWindow?: boolean;
  targetTimestampFormatted?: string;
  isHeadwindActive: boolean;
  baseWindSpeedKmH: number;
  windDirection: 'headwind' | 'cross-headwind' | 'tailwind' | 'calm';
  windDirectionDegrees: number;
  temperatureC: number;
  precipitationRiskPercent: number;
  estuaryGustKmH: number;
  visibilityKm: number;
  weatherCode?: number;
  isDay?: boolean;
  sunrise?: string;
  sunset?: string;
}

export interface PhysicsParams {
  clothesWeightKg?: number;
  luggageWeightKg?: number;
  mechanicalLossFraction?: number;
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

export interface ElevationProfilePoint {
  distKm: number;
  eleM: number;
  gradePct: number;
}

export interface TerrainSummary {
  flatPct: number;
  rollingPct: number;
  climbPct: number;
  descentPct: number;
  maxGradePct: number;
  minEleM: number;
  maxEleM: number;
  surfaceLabel?: 'road' | 'mixed' | 'gravel';
  difficultyLevel?: 'easy' | 'moderate' | 'challenging' | 'alpine';
}

export interface RouteParams {
  elevationGainM?: number;
  elevationLossM?: number;
  origin?: string;
  destination?: string;
  distanceKm: number;
  targetSpeedKmH: number;
  pacingMode?: 'speed' | 'effort';
  targetEffortWatts?: number;
  urbanTrafficDelayMinutes: number;
  gateSecurityDelayMinutes: number;
  coordinates?: [number, number][];
  routeMode?: 'corridor' | 'manual-radius' | 'gpx';
  originCoords?: [number, number];
  radiusMeters?: number;
  gpxFileName?: string;
  elevationProfile?: ElevationProfilePoint[];
  terrainSummary?: TerrainSummary;
}

export interface OfficeConstraints {
  deskSetupMinutes?: number;
  showerBufferMinutes?: number;
  walkFromGateMinutes?: number;
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

export interface TripStage {
  id: string;
  dayNumber: number;
  departureDate: string;
  departureTime: string;
  targetMode?: 'arrive' | 'depart';
  route: RouteParams;
  office: OfficeConstraints;
  weather: WeatherCondition;
  customChips: string[];
  accommodationNote?: string;
}

export interface TripProfile {
  departureDate?: string;
  departureTime?: string;
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
  customChips?: string[];
  ruleSettings?: Record<string, any>;
  arriveAtMode?: boolean;
  stages?: TripStage[];
  activeStageIndex?: number;
}

export interface PhysicsCalculationResult {
  systemMassKg: number;
  groundSpeedMs: number;
  airSpeedMs: number;
  effectiveSpeedKmH: number;
  calmSpeedKmH: number;
  baselineLegWatts: number;
  rollingResistanceWatts: number;
  aerodynamicDragWatts: number;
  gravityWatts: number;
  wheelWatts: number;
  legWatts: number;
  wattsPerKg: number;
  ftpWatts: number;
  ftpPercent: number;
  powerZone: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
  pacingMode: 'speed' | 'effort';
  windDelayMinutes: number;
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

export type PhysicsParameters = PhysicsParams;

export type PowerZoneCode = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export type TelemetryCardMode = 'solid' | 'transparent';

export interface TelemetryShareData {
  /** Route name / sortie title */
  routeName?: string;
  name?: string;

  /** Total route distance in km (e.g. 42.5) */
  distance?: number | string;
  distanceKm?: number;

  /** Total elevation gain in meters (e.g. 680) */
  elevation?: number | string;
  elevationGainM?: number;
  elevationM?: number;

  /** Average mechanical power in watts (e.g. 215) */
  avgPower?: number;
  avgPowerWatts?: number;
  averagePower?: number;

  /** Wind tax / aero penalty in watts (e.g. +34 or -12) */
  windTax?: number;
  windTaxWatts?: number;
  powerDeltaWatts?: number;

  /** Air density (rho) in kg/m³ (e.g. 1.204 or 1.225) */
  airDensity?: number;
  rho?: number;
  airDensityRho?: number;

  /** Carb burn / oxidation rate in g/h (e.g. 65) */
  carbBurn?: number;
  carbBurnGramsPerHour?: number;
  carbBurnGPerHour?: number;

  /** Total mechanical crank work in kJ (e.g. 1450) */
  totalKj?: number;
  totalWorkKj?: number;

  /** Optional timestamp or date string */
  timestamp?: string;

  /** Optional rider FTP in watts */
  ftpWatts?: number;

  /** Optional explicit power zone override */
  powerZone?: PowerZoneCode;

  /** Optional elevation profile array */
  elevationProfile?: ElevationProfilePoint[] | Array<{ distKm: number; eleM: number; gradePct?: number }>;

  /** Optional route coordinates array for spatial vector trace */
  coordinates?: [number, number][] | Array<{ lat: number; lon: number; ele?: number }>;

  /** Optional date override */
  departureDate?: string;

  /** Primary hero metric choice: 'work' (total kJ) or 'power' (avg watts) */
  heroMetric?: 'work' | 'power';

  /** Optional moving time formatted (e.g. "1h 42m") */
  movingTimeFormatted?: string;

  /** Optional average ground speed in km/h */
  avgSpeedKmH?: number;
}

export function generateTripChecklist(
  tag: string = "VÉLOTAF",
  distanceKm: number = 35,
  weather?: WeatherCondition,
  options?: {
    lang?: 'en' | 'fr';
    includePunctureKit?: boolean;
    includeExtraRavito?: boolean;
    customChips?: string[];
    totalDays?: number;
    isTubeless?: boolean;
    carbTargetGPerHr?: number;
    nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
  }
): ChecklistItem[] {
  const isFr = options?.lang === 'fr';
  const totalDays = options?.totalDays || 1;
  const isTubeless = options?.isTubeless ?? false;
  const carbTarget = options?.carbTargetGPerHr ?? 60;
  const nutritionPref = options?.nutritionPreference ?? 'real-food';
  const t = (tag || "")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const isCommute = t.includes("VELOTAF") || t.includes("COMMUTE") || t.includes("TAF") || t.includes("BOULOT") || t.includes("WORK") || t.includes("OFFICE");
  const isEscapade = !isCommute && (t.includes("ESCAPADE") || t.includes("HOTEL") || t.includes("LEISURE") || t.includes("WEEKEND") || t.includes("WEEK-END") || t.includes("TOURING") || t.includes("SEJOUR") || t.includes("ECHAPPEE"));
  const isSport = !isCommute && (t.includes("SPORT") || t.includes("TRAINING") || t.includes("RACE") || t.includes("FONDO") || t.includes("TEMPO"));
  const isBikepacking = !isCommute && (t.includes("BIKEPACKING") || t.includes("BIVOUAC"));

  const bar = isTubeless
    ? distanceKm > 60 ? "2.4" : "2.6"
    : distanceKm > 60 ? "3.0" : "3.2";

  const items: ChecklistItem[] = [
    {
      id: "mech-pressure",
      label: isTubeless
        ? isFr
          ? `Pression Tubeless calibrée à ${bar.replace('.', ',')} bar & préventif vérifié`
          : `Tubeless tire pressure calibrated to ${bar} bar & sealant checked`
        : isFr
        ? `Pression des pneus calibrée à ${bar.replace('.', ',')} bar`
        : `Tire pressure calibrated to ${bar} bar`,
      checked: false,
      category: "mechanics",
      critical: true,
    },
    {
      id: "mech-spares",
      label: isTubeless
        ? isFr
          ? distanceKm > 50
            ? "Multi-outil, mèches tubeless, cartouche CO2 & chambre de secours"
            : "Multi-outil, mèches tubeless & gonfleur CO2 / mini-pompe"
          : distanceKm > 50
          ? "Multi-tool, tubeless plug darts, CO2 inflator & backup micro-tube"
          : "Multi-tool, tubeless plug kit & CO2 / mini pump"
        : isFr
        ? distanceKm > 50
          ? "Multi-outil, 2 démonte-pneus, chambre à air & mini-pompe (kit anti-crève)"
          : "Multi-outil & kit anti-crève (chambre à air)"
        : distanceKm > 50
        ? "Multi-tool, 2x tire levers, spare tube & mini pump"
        : "Multi-tool & spare tube",
      checked: false,
      category: "mechanics",
      critical: true,
    },
  ];

  if (options?.includePunctureKit) {
    items.push({
      id: "mech-puncture-kit",
      label: isFr
        ? "Kit anti-crève renforcé : mèches tubeless, cartouche CO2 & chambre à air"
        : "Full anti-puncture kit: tubeless plugs, CO2 cartridge & spare tube",
      checked: false,
      category: "mechanics",
      critical: true,
    });
  }

  if (weather?.temperatureC !== undefined && weather.temperatureC < 9) {
    items.push({
      id: "gear-thermal",
      label: isFr
        ? "Gants thermiques coupe-vent & tour de cou"
        : "Thermal windproof gloves & neck gaiter",
      checked: false,
      category: "gear",
      critical: true,
    });
  }

  if (isEscapade) {
    items.push(
      { id: "esc-id", label: isFr ? "Confirmation de réservation d'hôtel & pièce d'identité" : "Hotel reservation booking & national ID", checked: false, category: "logistics", critical: true },
      { id: "esc-clothes", label: isFr ? "Tenue civile pour le soir & chaussures de marche légères" : "Casual off-bike evening clothes & walking shoes", checked: false, category: "gear", critical: true },
      { id: "esc-charge", label: isFr ? "Chargeur téléphone & batterie externe" : "Phone charger & portable power bank", checked: false, category: "gear", critical: true },
      { id: "esc-lock", label: isFr ? "Antivol compact pour le local vélo de l’hôtel" : "Compact bike lock for hotel storage", checked: false, category: "mechanics", critical: true },
      { id: "esc-fuel", label: isFr ? (distanceKm > 40 ? "2 bidons de 650 ml + encas ravito" : "1 bidon + encas ravito") : (distanceKm > 40 ? "2x 650ml bidons + energy snacks" : "1x Bidon + snack"), checked: false, category: "nutrition", critical: true },
      { id: "esc-lights", label: isFr ? "Éclairage avant & feu arrière flash de sécurité" : "Front headlight & rear safety flasher", checked: false, category: "mechanics", critical: true }
    );
  } else if (isSport) {
    items.push(
      {
        id: "sport-fuel",
        label:
          nutritionPref === 'real-food'
            ? isFr
              ? `Ravito aliments vrais (~${carbTarget}g/h : dattes, pâtes de fruits) & bidons isotoniques`
              : `Whole-food ride fuel (~${carbTarget}g/hr: dates, fruit chews) & electrolyte bidons`
            : isFr
            ? `Boisson glucidique en bidons (~${carbTarget}g/h) & gels ravito`
            : `Carb mix in bottles (~${carbTarget}g/hr) & energy gels`,
        checked: false,
        category: "nutrition",
        critical: true,
      },
      { id: "sport-computer", label: isFr ? "Compteur GPS synchronisé avec capteurs" : "GPS computer synced with sensors", checked: false, category: "gear", critical: true },
      { id: "sport-kit", label: isFr ? "Tenue aéro ajustée & gilet coupe-vent léger" : "Aero kit & lightweight wind gilet", checked: false, category: "gear", critical: true }
    );
    if (!isTubeless) {
      items.push({ id: "sport-plugs", label: isFr ? "Cartouche CO2 rapide & démonte-pneus ultra-plats" : "Quick CO2 inflator & low-profile tire levers", checked: false, category: "mechanics", critical: true });
    }
  } else if (isBikepacking) {
    items.push(
      { id: "bp-sleep", label: isFr ? "Sac de bivouac / tente compacte & matelas isolant" : "Bivouac bag / compact tent & sleeping pad", checked: false, category: "gear", critical: true },
      { id: "bp-power", label: isFr ? "Batterie externe haute capacité 20 000 mAh & câbles" : "High-capacity 20,000mAh power bank & cables", checked: false, category: "gear", critical: true },
      { id: "bp-water", label: isFr ? "Flasque filtrante + capacité hydrique de 2 L" : "Water filtration flask + 2L hydration capacity", checked: false, category: "nutrition", critical: true },
      { id: "bp-chain", label: isFr ? "Dérive-chaîne, maillons rapides & patte de dérailleur" : "Chain tool, quick-links & spare hanger", checked: false, category: "mechanics", critical: true }
    );

    if (totalDays > 1) {
      items.push(
        {
          id: "bp-kit-rotation",
          label: isFr
            ? `Rotation textile (${totalDays} jours) : rechanges cuissard, crème chamois & tenue de soir en sac étanche`
            : `Multi-day kit rotation: ${totalDays}x base layers / chamois cream & evening camp clothes in dry-bag`,
          checked: false,
          category: "gear",
          critical: true,
        },
        {
          id: "bp-charging-autonomy",
          label: isFr
            ? `Autonomie électrique (${totalDays} jours) : chargeur secteur multi-ports USB-C pour GPS, radar & phares 800-1000lm`
            : `Charging autonomy for ${totalDays} days: wall plug adapter + multi-port USB-C splitter for GPS, radar & 800-1000lm lights`,
          checked: false,
          category: "gear",
          critical: true,
        },
        {
          id: "bp-multiday-logistics",
          label: isFr
            ? `Réservations hébergements & billet train vélo téléchargés hors-ligne (${totalDays} étapes)`
            : `Accommodation & transit confirmations saved offline (${totalDays} stages + TER train bike reservation)`,
          checked: false,
          category: "logistics",
          critical: true,
        }
      );
    }
  } else {
    items.push(
      { id: "com-badge", label: isFr ? "Badge d'accès entreprise & identifiants" : "Facility security badge & credentials", checked: false, category: "logistics", critical: true },
      { id: "com-laptop", label: isFr ? "Ordinateur portable pro & chargeur USB-C" : "Work laptop & USB-C charger", checked: false, category: "gear", critical: true },
      { id: "com-clothes", label: isFr ? "Tenue de travail propre rangée en sac étanche" : "Clean work clothes packed in dry-bag", checked: false, category: "gear", critical: true },
      { id: "com-shower", label: isFr ? "Trousse de douche & serviette microfibre séchage rapide" : "Shower kit & microfiber quick-dry towel", checked: false, category: "gear", critical: true },
      { id: "com-lock", label: isFr ? "Antivol U haute sécurité pour le parking vélo" : "Heavy-duty U-Lock for bike shelter", checked: false, category: "mechanics", critical: true },
      { id: "com-recovery", label: isFr ? "Ravito de récupération vestiaire prêt dans le sac" : "Post-arrival recovery nutrition packed", checked: false, category: "nutrition", critical: true }
    );
  }

  if (options?.includeExtraRavito) {
    items.push({
      id: "ravito-extra",
      label: isFr
        ? "Rations ravito supplémentaires (pâtes de fruits, dattes & électrolytes)"
        : "Extra whole-food fueling rations & electrolytes packed",
      checked: false,
      category: "nutrition",
      critical: false,
    });
  }

  const activeChips = options?.customChips || [];

  if (activeChips.includes('mountain-adventure')) {
    items.push(
      {
        id: 'chip-mountain-plugs',
        label: isFr
          ? 'Mèches tubeless haute montagne, plaquettes de rechange & cartouches CO2'
          : 'High-mountain tubeless plug darts, spare brake pads & CO2 canisters',
        checked: false,
        category: 'mechanics',
        critical: true,
      },
      {
        id: 'chip-mountain-topo',
        label: isFr
          ? 'Tracés GPS topographiques hors-ligne & secours montagne'
          : 'Offline topographic GPS trail maps & emergency contacts',
        checked: false,
        category: 'gear',
        critical: true,
      }
    );
  }

  if (activeChips.includes('night-ride')) {
    items.push(
      {
        id: 'chip-night-beam',
        label: isFr
          ? 'Phare avant 800+ lumens chargé & feu arrière clignotant puissant'
          : 'High-beam headlight (800+ lumens) fully charged & rear flasher',
        checked: false,
        category: 'mechanics',
        critical: true,
      },
      {
        id: 'chip-night-hivis',
        label: isFr
          ? 'Baudrier / gilet haute visibilité & bandes réfléchissantes de cheville'
          : 'Reflective sash/vest & reflective ankle bands',
        checked: false,
        category: 'gear',
        critical: true,
      }
    );
  }

  if (activeChips.includes('coffee-stop')) {
    items.push({
      id: 'chip-coffee-lock',
      label: isFr
        ? 'Antivol de cadre rapide & moyen de paiement pour la pause café'
        : 'Compact cafe frame lock & contactless payment for coffee pause',
      checked: false,
      category: 'logistics',
      critical: false,
    });
  }

  if (activeChips.includes('picnic-outing')) {
    items.push({
      id: 'chip-picnic-pannier',
      label: isFr
        ? 'Sacoche isotherme avec victuailles fraîches, couverts & couteau pliant'
        : 'Insulated picnic pannier with fresh provisions, cutlery & folding knife',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('wine-tasting') || activeChips.includes('local-gastronomy')) {
    items.push({
      id: 'chip-wine-sleeves',
      label: isFr
        ? 'Manchons de protection matelassés pour bouteilles de vin en sacoche'
        : 'Padded bottle protective sleeves for pannier wine transport',
      checked: false,
      category: 'gear',
      critical: false,
    });
  }

  if (activeChips.includes('emergency-first-aid')) {
    items.push({
      id: 'chip-first-aid',
      label: isFr
        ? 'Trousse de secours : pansements compressifs, antiseptique & couverture de survie'
        : 'Wilderness trauma kit: sterile dressings, antiseptic & space blanket',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('solar-power-recharge')) {
    items.push({
      id: 'chip-solar-bank',
      label: isFr
        ? 'Batterie externe 20 000 mAh renforcée & faisceau de câbles étanches'
        : 'Rugged 20,000mAh battery pack & weatherproof charging cables',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('bad-weather-prep')) {
    items.push({
      id: 'chip-bad-weather',
      label: isFr
        ? 'Garde-boue intégraux vérifiés & veste pluie Gore-Tex Shakedry'
        : 'Full mudguards inspected & Gore-Tex Shakedry rain shell stowed',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('bivouac-camp')) {
    items.push({
      id: 'chip-bivouac-kit',
      label: isFr
        ? 'Abri bivouac ultraléger, matelas gonflable isolant & flasque filtrante'
        : 'Ultralight bivouac shelter, insulated sleeping pad & water filter flask',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('hydration-electrolytes')) {
    items.push({
      id: 'chip-hydration-fuel',
      label: isFr
        ? `Mélange glucidique calibré (~${carbTarget}g/h) & capsules de sodium`
        : `Calibrated carb drink mix (~${carbTarget}g/hr) & sodium salt tabs`,
      checked: false,
      category: 'nutrition',
      critical: true,
    });
  }

  if (activeChips.includes('cargo-laptop-pack')) {
    items.push({
      id: 'chip-cargo-laptop',
      label: isFr
        ? 'Ordinateur pro 15" dans housse étanche IPX6 & chargeur USB-C'
        : '15" Work laptop inside IPX6 waterproof dry sleeve & USB-C charger',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('gravel-trail-master') || activeChips.includes('off-road-exploration')) {
    items.push({
      id: 'chip-gravel-pressure',
      label: isFr
        ? 'Pression tout-terrain ajustée à 2,4–2,8 bar & outil mèches prêt'
        : 'Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted',
      checked: false,
      category: 'mechanics',
      critical: true,
    });
  }

  if (activeChips.includes('paceline-drafting') || activeChips.includes('fast-group-ride')) {
    items.push({
      id: 'chip-paceline-radar',
      label: isFr
        ? 'Radar arrière Garmin Varia chargé & signaux de peloton synchronisés'
        : 'Rear Garmin Varia radar charged & peloton hand signals briefed',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('shower-locker')) {
    items.push({
      id: 'chip-shower-kit',
      label: isFr
        ? 'Serviette microfibre, trousse de toilette & tenue propre sous sac étanche'
        : 'Microfiber quick-dry towel, toiletries & fresh change of clothes in dry bag',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  if (activeChips.includes('historical-tour')) {
    items.push({
      id: 'chip-historical-shoes',
      label: isFr
        ? 'Chaussures confortables pour la marche & antivol sécurisé de visite'
        : 'Comfortable walking shoes & secure bike lock for monuments',
      checked: false,
      category: 'logistics',
      critical: false,
    });
  }

  if (activeChips.includes('photography-spots')) {
    items.push({
      id: 'chip-camera-bag',
      label: isFr
        ? 'Sacoche appareil photo étanche de guidon & lingette microfibre'
        : 'Handlebar weatherproof camera bag, lens cloth & spare battery',
      checked: false,
      category: 'gear',
      critical: false,
    });
  }

  if (activeChips.includes('spa-wellness')) {
    items.push({
      id: 'chip-spa-pack',
      label: isFr
        ? 'Maillot de bain, sandales & chaussettes de récupération pour le spa'
        : 'Swimsuit, sandals & recovery compression socks for thermal spa',
      checked: false,
      category: 'gear',
      critical: false,
    });
  }

  if (activeChips.includes('interval-training')) {
    items.push({
      id: 'chip-interval-workout',
      label: isFr
        ? 'Séance de fractionné par intervalles synchronisée sur le compteur GPS'
        : 'Structured threshold interval workout synced to GPS head unit',
      checked: false,
      category: 'gear',
      critical: false,
    });
  }

  if (activeChips.includes('climbing-kom-hunt')) {
    items.push({
      id: 'chip-kom-climb',
      label: isFr
        ? 'Grand pignon de montagne vérifié (32/34D) & chaîne dégraissée'
        : 'Low-ratio climbing cog checked (32/34T) & freshly waxed chain',
      checked: false,
      category: 'mechanics',
      critical: true,
    });
  }

  // Weather-triggered low-visibility & darkness safety items
  const isLowVisibilityOrDark =
    (weather?.visibilityKm !== undefined && weather.visibilityKm < 5) ||
    weather?.isDay === false;

  if (isLowVisibilityOrDark && !items.some((i) => i.id === 'chip-night-beam' || i.id === 'chk-lights')) {
    items.push({
      id: 'vis-lowlight-beam',
      label: isFr
        ? 'Éclairage puissant 800–1000 lm & équipement réfléchissant (visibilité réduite météo)'
        : 'High-output 800–1000 lm headlight & reflective gear (low weather visibility)',
      checked: false,
      category: 'gear',
      critical: true,
    });
  }

  return items;
}
