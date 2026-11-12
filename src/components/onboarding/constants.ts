import { BikeOption, PaceTier, PurposeDefinition } from './types';

export const PURPOSES: PurposeDefinition[] = [
  {
    id: 'commute',
    name: 'Commute',
    nameFr: 'Vélotaf (Trajet Pro)',
    subtitle: 'Get to work, class or an appointment on time.',
    subtitleFr: 'Arrivez au travail, en cours ou à un rendez-vous à l’heure.',
    contextTitle: 'For your commute',
    contextTitleFr: 'Pour votre vélotaf',
    contextBody:
      'Plan around an arrival or departure time, choose a comfortable pace, and allow a little time to park your bike.',
    contextBodyFr:
      'Planifiez selon une heure d’arrivée ou de départ, choisissez une allure confortable et prévoyez un temps de stationnement.',
    tag: 'Commute',
    defaultPaceTier: 'steady',
    defaultBufferMin: 5,
    defaultOrigin: 'Trentemoult, Rezé',
    defaultDestination: 'Nantes gare, Nantes',
    defaultDistanceKm: 6.0,
  },
  {
    id: 'sport',
    name: 'Sport',
    nameFr: 'Sport (Gran Fondo)',
    subtitle: 'Plan a training ride at your own pace.',
    subtitleFr: 'Planifiez une sortie d’entraînement à votre propre rythme.',
    contextTitle: 'For your sport ride',
    contextTitleFr: 'Pour votre sortie sportive',
    contextBody:
      'Focus on sustained tempo watts, efficient fueling, and minimal transit delays.',
    contextBodyFr:
      'Privilégiez les watts soutenus, un ravitaillement régulier et des arrêts réduits au minimum.',
    tag: 'Sport',
    defaultPaceTier: 'brisk',
    defaultBufferMin: 0,
    defaultOrigin: 'Nantes Quai de la Fosse',
    defaultDestination: 'Pornic Château',
    defaultDistanceKm: 48.0,
  },
  {
    id: 'bikepacking',
    name: 'Bikepacking',
    nameFr: 'Bikepacking (Aventure)',
    subtitle: 'Make room for longer days and loaded riding.',
    subtitleFr: 'Prévoyez des journées plus longues et du matériel chargé.',
    contextTitle: 'For your bikepacking adventure',
    contextTitleFr: 'Pour votre aventure bikepacking',
    contextBody:
      'Account for loaded luggage weight, steady cruising pacing, and bivouac checkpoints.',
    contextBodyFr:
      'Prenez en compte le poids des sacoches, une allure de croisière régulière et les étapes bivouac.',
    tag: 'Bikepacking',
    defaultPaceTier: 'steady',
    defaultBufferMin: 15,
    defaultOrigin: 'Saint-Brevin Trailhead',
    defaultDestination: 'Pornic Bivouac Cove',
    defaultDistanceKm: 65.0,
  },
  {
    id: 'leisure',
    name: 'Leisure',
    nameFr: 'Balade & Échappée',
    subtitle: 'Enjoy an easy outing, with time to explore.',
    subtitleFr: 'Profitez d’une sortie détendue avec du temps pour explorer.',
    contextTitle: 'For your leisure outing',
    contextTitleFr: 'Pour votre sortie détente',
    contextBody:
      'Keep things relaxed with scenic paths, generous stops, and zero time pressure.',
    contextBodyFr:
      'Gardez le rythme léger avec des voies douces, des pauses régulières et zéro pression horaire.',
    tag: 'Leisure',
    defaultPaceTier: 'easy',
    defaultBufferMin: 10,
    defaultOrigin: 'Nantes Île de Versailles',
    defaultDestination: 'Sucé-sur-Erdre Port',
    defaultDistanceKm: 22.0,
  },
];

export const PACE_TIERS: PaceTier[] = [
  {
    id: 'easy',
    name: 'Easy',
    nameFr: 'Tranquille',
    speedKmH: 12,
    description: 'Easy: relaxed, gentle pedaling.',
    descriptionFr: 'Tranquille : pédalage détendu sans effort intense.',
  },
  {
    id: 'steady',
    name: 'Steady',
    nameFr: 'Régulier',
    speedKmH: 18,
    description: 'Steady: comfortable, purposeful riding. Change it any time.',
    descriptionFr: 'Régulier : allure confortable et efficace. Modifiable à tout moment.',
  },
  {
    id: 'brisk',
    name: 'Brisk',
    nameFr: 'Soutenu',
    speedKmH: 24,
    description: 'Brisk: active tempo riding with sustained momentum.',
    descriptionFr: 'Soutenu : cadence active et effort de tempo continu.',
  },
];

export const BIKE_OPTIONS: BikeOption[] = [
  {
    id: 'city',
    name: 'City / hybrid bike',
    nameFr: 'Vélo de ville / VTC hybride',
    weightKg: 12.5,
    cda: 0.42,
    crr: 0.0065,
    isTubeless: false,
    drivetrainEfficiency: 0.95,
  },
  {
    id: 'road',
    name: 'Road / race bike',
    nameFr: 'Vélo de route / Course',
    weightKg: 8.2,
    cda: 0.32,
    crr: 0.0040,
    isTubeless: true,
    drivetrainEfficiency: 0.97,
  },
  {
    id: 'gravel',
    name: 'Gravel bike',
    nameFr: 'Vélo Gravel polyvalent',
    weightKg: 10.2,
    cda: 0.38,
    crr: 0.0055,
    isTubeless: true,
    drivetrainEfficiency: 0.96,
  },
  {
    id: 'touring',
    name: 'Touring / bikepacking bike',
    nameFr: 'Vélo de voyage / Randonneuse',
    weightKg: 13.5,
    cda: 0.45,
    crr: 0.0060,
    isTubeless: false,
    drivetrainEfficiency: 0.94,
  },
  {
    id: 'cargo',
    name: 'Cargo / commuter bike',
    nameFr: 'Vélo cargo / Longtail',
    weightKg: 22.0,
    cda: 0.52,
    crr: 0.0070,
    isTubeless: false,
    drivetrainEfficiency: 0.93,
  },
  {
    id: 'ebike',
    name: 'E-bike (electric assist)',
    nameFr: 'Vélo à assistance électrique (VAE)',
    weightKg: 21.0,
    cda: 0.44,
    crr: 0.0060,
    isTubeless: false,
    drivetrainEfficiency: 0.95,
  },
];

// Curated realistic schematic route coordinates for Trentemoult -> Nantes Gare (6.0 km)
export const DEFAULT_NANTES_ROUTE_COORDS: [number, number][] = [
  [47.1944, -1.5833], // Trentemoult Rezé
  [47.1991, -1.5794],
  [47.2032, -1.5731], // Pont des Trois Continents approach
  [47.2065, -1.5694], // Loire crossing south branch
  [47.2081, -1.5645], // Île de Nantes
  [47.2115, -1.5583], // Pont Anne de Bretagne
  [47.2142, -1.5512], // Quai de la Fosse
  [47.2161, -1.5463], // Canal Saint-Félix
  [47.2173, -1.5422], // Gare de Nantes (Nord)
];
