import type { CHIP_TOKENS } from '../tokens/chipTokens';

export type ToolChipTheme = keyof typeof CHIP_TOKENS;

export type FreeWebToolId =
  | 'hub'
  | 'fuel-plan'
  | 'flip-my-loop'
  | 'water-bakery'
  | 'stem-sticker'
  | 'tyre-pressure'
  | 'what-to-wear'
  | 'leave-by'
  | 'wind';

export type FreeWebToolSlug = Exclude<FreeWebToolId, 'hub'>;

export interface ToolCatalogEntry {
  id: FreeWebToolSlug;
  slug: string;
  legacyQueryAliases?: string[];
  theme: ToolChipTheme;
  featured: boolean;
  requiresGpx: boolean;
  titleEn: string;
  titleFr: string;
  shortLabelEn: string;
  shortLabelFr: string;
  taglineEn: string;
  taglineFr: string;
  badgeEn: string;
  badgeFr: string;
  seoTitleEn: string;
  seoTitleFr: string;
  seoDescriptionEn: string;
  seoDescriptionFr: string;
}

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    id: 'fuel-plan',
    slug: 'fuel-plan',
    legacyQueryAliases: ['fuel', 'nutrition'],
    theme: 'emerald',
    featured: true,
    requiresGpx: false,
    titleEn: 'Real-Food Fuel & Bottle Planner',
    titleFr: 'Carburant Aliments Vrais & Bidons',
    shortLabelEn: 'Fuel & Bottles',
    shortLabelFr: 'Nutrition & Bidons',
    taglineEn: 'Exact bottles, real-food portions & grocery list — zero gels required.',
    taglineFr: 'Bidons, portions d’aliments vrais & liste de courses — sans gels imposés.',
    badgeEn: 'No gels needed',
    badgeFr: 'Sans gels',
    seoTitleEn: 'Cycling Real-Food Fuel & Bottle Calculator (Free) — Cadence',
    seoTitleFr: 'Calculateur Nutrition Vélo Aliments Vrais & Bidons (Gratuit) — Cadence',
    seoDescriptionEn:
      'Calculate exact cycling carbs, bottles, and real-food portions (dates, oat bars, bananas, vegan/GF options) with a copyable grocery list. Free, no login.',
    seoDescriptionFr:
      'Calculez vos glucides, bidons et portions d’aliments vrais à vélo (dattes, barres, sans gluten/végan) avec liste de courses. Gratuit, sans compte.',
  },
  {
    id: 'flip-my-loop',
    slug: 'flip-my-loop',
    legacyQueryAliases: ['flip', 'loop-wind'],
    theme: 'sky',
    featured: true,
    requiresGpx: true,
    titleEn: 'Loop Wind-Flipper (CW vs. CCW)',
    titleFr: 'Sens optimal de boucle (Vent)',
    shortLabelEn: 'Flip My Loop',
    shortLabelFr: 'Sens du Vent',
    taglineEn: 'Drop a loop GPX to see whether clockwise or counter-clockwise saves minutes & watts.',
    taglineFr: 'Déposez un GPX en boucle pour savoir quel sens évite le vent de face au retour.',
    badgeEn: 'Tailwind home',
    badgeFr: 'Vent de dos retour',
    seoTitleEn: 'Cycling Loop Wind Direction Checker: Clockwise or Counter-Clockwise? — Cadence',
    seoTitleFr: 'Sens de boucle vélo selon le vent : horaire ou anti-horaire ? — Cadence',
    seoDescriptionEn:
      'Drop any cycling loop GPX and compare clockwise vs. counter-clockwise wind cost in minutes and watts saved. Instant browser tool, free.',
    seoDescriptionFr:
      'Déposez votre boucle GPX et comparez le coût du vent en sens horaire ou anti-horaire (minutes et watts économisés). Gratuit, sans inscription.',
  },
  {
    id: 'water-bakery',
    slug: 'water-bakery',
    legacyQueryAliases: ['water', 'bakery', 'resupply'],
    theme: 'teal',
    featured: true,
    requiresGpx: true,
    titleEn: 'Water Desert & Open Bakery Scanner',
    titleFr: 'Radar Eau & Boulangeries Ouvertes',
    shortLabelEn: 'Water & Bakeries',
    shortLabelFr: 'Eau & Boulangeries',
    taglineEn: 'Spot dry stretches against your bottles and check which bakeries are open at your ETA.',
    taglineFr: 'Repérez les tronçons sans eau et vérifiez quelles boulangeries seront ouvertes à votre passage.',
    badgeEn: 'Open at arrival',
    badgeFr: 'Ouvert à l’arrivée',
    seoTitleEn: 'GPX Water Fountain & Open Bakery Scanner for Cycling — Cadence',
    seoTitleFr: 'Scanner GPX Points d’Eau & Boulangeries Ouvertes à Vélo — Cadence',
    seoDescriptionEn:
      'Scan any GPX cycling route for drinking water taps, cemetery spigots, water deserts, and bakeries open when you actually arrive. Free, no signup.',
    seoDescriptionFr:
      'Scannez un GPX vélo pour trouver fontaines, points d’eau de cimetière, zones sèches et boulangeries ouvertes à votre heure d’arrivée.',
  },
  {
    id: 'stem-sticker',
    slug: 'stem-sticker',
    legacyQueryAliases: ['sticker', 'top-tube', 'cue-sticker'],
    theme: 'yellow-vest',
    featured: true,
    requiresGpx: true,
    titleEn: 'Printable Top-Tube Stem Sticker',
    titleFr: 'Sticker Cadre / Potence Imprimable',
    shortLabelEn: 'Stem Sticker',
    shortLabelFr: 'Sticker Cadre',
    taglineEn: 'Generate a real-size cut-and-tape cheat sheet with climbs, water stops & eat cues.',
    taglineFr: 'Générez une bande prête à imprimer et scotcher sur le cadre : cols, eau et ravitaillement.',
    badgeEn: 'Print & tape',
    badgeFr: 'Imprimer & coller',
    seoTitleEn: 'Free Cycling Top-Tube Cue Sticker Generator (Printable) — Cadence',
    seoTitleFr: 'Générateur Gratuit de Sticker Cadre / Potence Vélo (Imprimable) — Cadence',
    seoDescriptionEn:
      'Turn any GPX route into a real-scale printable top-tube stem sticker with climb splits, open water/bakery markers, and fueling cues.',
    seoDescriptionFr:
      'Transformez n’importe quel GPX en sticker de cadre vélo à taille réelle avec cols, points d’eau, boulangeries et rappels ravitaillement.',
  },
  {
    id: 'tyre-pressure',
    slug: 'tyre-pressure',
    legacyQueryAliases: ['pressure'],
    theme: 'blue',
    featured: false,
    requiresGpx: false,
    titleEn: '15% Drop Tyre Pressure Calculator',
    titleFr: 'Pression Pneus (Règle 15 %)',
    shortLabelEn: 'Tyre Pressure',
    shortLabelFr: 'Pression Pneus',
    taglineEn: 'Front/rear bar & PSI with hookless 5-bar cap — or drop a GPX to auto-read tarmac/gravel mix.',
    taglineFr: 'Pression avant/arrière en bar & PSI (cap hookless 5 bar) avec lecture surface GPX en option.',
    badgeEn: 'Hookless safe',
    badgeFr: 'Sécurité hookless',
    seoTitleEn: 'Road & Gravel Cycling Tyre Pressure Calculator (ETRTO Hookless Safe) — Cadence',
    seoTitleFr: 'Calculateur Pression Pneus Vélo Route & Gravel (Bar / PSI) — Cadence',
    seoDescriptionEn:
      'Calculate front and rear road or gravel tyre pressure using the 15% drop method, ETRTO 5-bar hookless cap, and optional GPX surface detection.',
    seoDescriptionFr:
      'Calculez la pression idéale de vos pneus route ou gravel (méthode 15 %, sécurité hookless 5 bar) avec détection de surface GPX.',
  },
  {
    id: 'what-to-wear',
    slug: 'what-to-wear',
    legacyQueryAliases: ['wear', 'kit'],
    theme: 'purple',
    featured: false,
    requiresGpx: false,
    titleEn: 'What Should I Wear? (Kit & Lights)',
    titleFr: 'Quelle Tenue Porter ? (Kit & Feux)',
    shortLabelEn: 'What to Wear',
    shortLabelFr: 'Tenue & Feux',
    taglineEn: 'Apparel layers & lumen check adjusted for wind chill at riding speed and sunset.',
    taglineFr: 'Couches vestimentaires et puissance d’éclairage selon le vent ressenti à vitesse vélo et le coucher du soleil.',
    badgeEn: 'Wind chill + lights',
    badgeFr: 'Ressenti + feux',
    seoTitleEn: 'What to Wear Cycling Calculator (Wind Chill & Bike Lights) — Cadence',
    seoTitleFr: 'Quelle Tenue Vélo Porter ? Calculateur Météo, Vent & Éclairage — Cadence',
    seoDescriptionEn:
      'Get exact cycling clothing layers and front light lumen advice based on temperature, wind chill at riding speed, rain risk, and twilight.',
    seoDescriptionFr:
      'Obtenez la tenue vélo idéale et les lumens recommandés selon la température, le vent ressenti, la pluie et la tombée de la nuit.',
  },
  {
    id: 'leave-by',
    slug: 'leave-by',
    legacyQueryAliases: ['commute-clock'],
    theme: 'amber',
    featured: false,
    requiresGpx: false,
    titleEn: 'Leave-By Commute & Meetup Clock',
    titleFr: 'Calculateur Heure de Départ',
    shortLabelEn: 'Leave-By Clock',
    shortLabelFr: 'Heure de Départ',
    taglineEn: 'Count backwards from your meeting, train, or café meetup with headwind & prep buffers.',
    taglineFr: 'Remontez le temps depuis votre rendez-vous, bureau ou train avec marge vent et douche.',
    badgeEn: 'Reverse countdown',
    badgeFr: 'Compte à rebours',
    seoTitleEn: 'Bike Commute Leave-By Time Calculator (With Wind & Shower Buffer) — Cadence',
    seoTitleFr: 'Calculateur Heure de Départ Vélo & Vélotaf (Vent & Douche) — Cadence',
    seoDescriptionEn:
      'Know the exact minute to leave by bike so you arrive on time with headwind slowdown, coffee stop, and locker/shower buffer built in.',
    seoDescriptionFr:
      'Connaissez l’heure exacte de départ à vélo pour arriver à l’heure en intégrant vent de face, pause café et temps de douche.',
  },
  {
    id: 'wind',
    slug: 'wind-cost',
    legacyQueryAliases: ['wind', 'wind-cost'],
    theme: 'orange',
    featured: false,
    requiresGpx: false,
    titleEn: 'Wind Cost Calculator (Watts & Min)',
    titleFr: 'Coût du Vent (Watts & Minutes)',
    shortLabelEn: 'Wind Cost',
    shortLabelFr: 'Coût du Vent',
    taglineEn: 'Price any headwind or tailwind into exact watts, kcal, and extra minutes without a power meter.',
    taglineFr: 'Convertissez n’importe quel vent en watts, kcal et minutes de trajet sans capteur de puissance.',
    badgeEn: 'CdA physics',
    badgeFr: 'Physique CdA',
    seoTitleEn: 'Cycling Headwind Cost Calculator (Watts & Minutes) — Cadence',
    seoTitleFr: 'Calculateur Coût du Vent à Vélo (Watts & Minutes) — Cadence',
    seoDescriptionEn:
      'See how many watts and minutes a headwind, crosswind, or tailwind costs on your road, gravel, or commuter bike using real aerodynamic physics.',
    seoDescriptionFr:
      'Calculez le coût exact en watts et minutes d’un vent de face, de travers ou de dos grâce à la physique aérodynamique.',
  },
];

export const TOOL_HUB_META = {
  seoTitleEn: 'Cadence Free Cycling Tools — Fuel, Wind Flipper, Water Radar & Stem Sticker',
  seoTitleFr: 'Outils Vélo Gratuits Cadence — Nutrition, Vent, Radar Eau & Sticker Cadre',
  seoDescriptionEn:
    'Free browser-only cycling tools with zero signup: real-food fueling planner, clockwise vs. counter-clockwise loop wind flipper, GPX water & bakery scanner, printable top-tube stem sticker, tyre pressure, and kit advisor.',
  seoDescriptionFr:
    'Outils vélo 100 % navigateur et gratuits sans compte : nutrition aliments vrais, sens de boucle selon le vent, scanner GPX eau & boulangeries, sticker cadre imprimable, pression pneus et tenue.',
};

export function findToolEntryById(id: string | null | undefined): ToolCatalogEntry | null {
  if (!id) return null;
  const clean = id.trim().toLowerCase();
  return (
    TOOL_CATALOG.find(
      (entry) =>
        entry.id === clean ||
        entry.slug === clean ||
        (entry.legacyQueryAliases && entry.legacyQueryAliases.includes(clean))
    ) || null
  );
}

export function getToolPath(toolId: FreeWebToolId): string {
  if (toolId === 'hub') return '/tools';
  const entry = findToolEntryById(toolId);
  return entry ? `/tools/${entry.slug}` : '/tools';
}

export function parseToolFromLocation(
  loc: Pick<Location, 'pathname' | 'search' | 'hash'>
): { isToolsRoute: boolean; toolId: FreeWebToolId } {
  const pathname = (loc.pathname || '/').replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(loc.search || '');
  const hash = (loc.hash || '').toLowerCase();

  // Clean URL paths: /tools or /tools/<slug>
  if (pathname === '/tools') {
    const queryTool = searchParams.get('tool');
    const matched = findToolEntryById(queryTool);
    return { isToolsRoute: true, toolId: matched ? matched.id : 'hub' };
  }

  const pathMatch = pathname.match(/^\/tools\/([a-z0-9-]+)$/i);
  if (pathMatch?.[1]) {
    const matched = findToolEntryById(pathMatch[1]);
    return { isToolsRoute: true, toolId: matched ? matched.id : 'hub' };
  }

  // Legacy query/hash URLs: ?tool=..., ?view=tools, #tools
  const queryTool = searchParams.get('tool');
  if (queryTool) {
    const matched = findToolEntryById(queryTool);
    return { isToolsRoute: true, toolId: matched ? matched.id : 'hub' };
  }

  if (searchParams.get('view') === 'tools' || hash === '#tools') {
    return { isToolsRoute: true, toolId: 'hub' };
  }

  return { isToolsRoute: false, toolId: 'hub' };
}

export function applyToolDocumentMeta(toolId: FreeWebToolId | null, lang: 'en' | 'fr'): void {
  if (typeof document === 'undefined') return;
  const isFr = lang === 'fr';
  let title: string;
  let description: string;

  if (toolId === null) {
    title = isFr
      ? 'Cadence — Météo de sortie, ravitaillement & nutrition vélo (Gratuit)'
      : 'Cadence — Smart Ride Weather, Stops & Fueling (Free)';
    description = isFr
      ? 'Planifiez vos sorties vélo avec météo par secteur, radar points d’eau & boulangeries, nutrition aliments vrais et export .FIT/.GPX gratuit.'
      : 'Plan smarter bike rides with live route weather, resupply radar for water taps & bakeries, simple fueling plans, and free .FIT, .GPX & .TCX export.';
  } else if (toolId === 'hub') {
    title = isFr ? TOOL_HUB_META.seoTitleFr : TOOL_HUB_META.seoTitleEn;
    description = isFr ? TOOL_HUB_META.seoDescriptionFr : TOOL_HUB_META.seoDescriptionEn;
  } else {
    const entry = findToolEntryById(toolId);
    title = entry
      ? isFr
        ? entry.seoTitleFr
        : entry.seoTitleEn
      : isFr
      ? TOOL_HUB_META.seoTitleFr
      : TOOL_HUB_META.seoTitleEn;
    description = entry
      ? isFr
        ? entry.seoDescriptionFr
        : entry.seoDescriptionEn
      : isFr
      ? TOOL_HUB_META.seoDescriptionFr
      : TOOL_HUB_META.seoDescriptionEn;
  }

  document.title = title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute('content', description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);
}
