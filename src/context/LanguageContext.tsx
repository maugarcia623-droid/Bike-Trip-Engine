import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { en, TranslationKey } from '../locales/en';
import { fr } from '../locales/fr';
import { ChecklistItem, TripProfile } from '../types/trip';
import { PRESET_TRIP_TRANSLATIONS } from '../utils/presetTrips';
import { loadRiderBikeSpecs, getActiveBike } from '../utils/specsStorage';
import { calculateHydrationPlan } from '../utils/nutrition';
import { getArchetypeFromTag } from '../utils/archetypeChips';

export type Language = 'en' | 'fr';

export const STORAGE_KEY_LANG = 'velotaf_lang';

export function loadInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
    if (typeof navigator !== 'undefined') {
      const navLang = (
        navigator.language ||
        (navigator.languages && navigator.languages[0]) ||
        ''
      ).toLowerCase();
      if (navLang.startsWith('fr')) {
        return 'fr';
      }
    }
  } catch (e) {
    console.error('Error reading language from localStorage', e);
  }
  return 'en';
}

export function getCurrentLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved === 'fr' || saved === 'en') {
      return saved;
    }
    if (typeof navigator !== 'undefined') {
      const navLang = (
        navigator.language ||
        (navigator.languages && navigator.languages[0]) ||
        ''
      ).toLowerCase();
      if (navLang.startsWith('fr')) {
        return 'fr';
      }
    }
  } catch {
    // ignore
  }
  return 'en';
}

export function translate(
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = lang === 'fr' ? fr : en;
  let str: string = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  lang,
  setLang,
  children,
}) => {
  const toggleLang = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  }, [lang, setLang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

// ── Built-in Profile & Checklist Bilingual Resolvers ──

const BUILTIN_TRIP_TRANSLATIONS: Record<
  string,
  {
    en: { name: string; description: string; gateName: string };
    fr: { name: string; description: string; gateName: string };
  }
> = {
  ...PRESET_TRIP_TRANSLATIONS,
  'estuary-gate17-morning': {
    en: {
      name: 'Morning Estuary Commute',
      description:
        '22 km daily gravel commute crossing the Saint-Nazaire estuary bridge to Saint-Nazaire Harbour. Arrival snack at 08:30, breakfast break at 08:50, shift start 09:00.',
      gateName: 'Harbour Office',
    },
    fr: {
      name: 'Vélotaf Matinal Estuaire',
      description:
        'Trajet vélotaf gravel quotidien de 22 km par le pont de Saint-Nazaire vers le port. Collation à 08:30, petit-déjeuner à 08:50, prise de poste à 09:00.',
      gateName: 'Port Saint-Nazaire',
    },
  },
  'gravel-sport-granfondo': {
    en: {
      name: 'Gravel Aero Gran Fondo (Fast Pace)',
      description:
        'Aggressive aero posture for compressed high-tempo transit. Pushing 31.5 km/h with low profile tuck, fast carbohydrate burn, and calibrated on-the-bike nutrition.',
      gateName: 'Pacing Finish Line',
    },
    fr: {
      name: 'Gran Fondo Gravel Aéro (Allure Rapide)',
      description:
        'Position aéro engagée pour une sortie à haute intensité. Allure de 31,5 km/h mains en bas, oxydation glucidique rapide et ravito calibré en selle.',
      gateName: "Ligne d'Arrivée",
    },
  },
  'bikepacking-loire-adventure': {
    en: {
      name: 'Loire Estuary 2-Day Bikepacking',
      description:
        'Self-supported multi-day adventure with full rig loading (~12 kg gear). Stage 1 rolls towards the coastal pine forest bivouac before dusk.',
      gateName: 'Bivouac Staging Site',
    },
    fr: {
      name: 'Bikepacking Estuaire de la Loire (2 Jours)',
      description:
        'Aventure en autonomie sur plusieurs jours avec chargement complet (~12 kg de sacoches). Étape 1 vers le bivouac en forêt de pins côtière avant le crépuscule.',
      gateName: 'Zone de Bivouac',
    },
  },
  'escapade-clisson-touring': {
    en: {
      name: 'Weekend Escapade to Clisson',
      description:
        'Relaxed scenic getaway along the Sèvre Nantaise vineyards toward boutique hotel check-in at 15:00, with secure bike parking and evening dining.',
      gateName: 'Hotel Reception',
    },
    fr: {
      name: 'Escapade Week-end à Clisson',
      description:
        'Échappée panoramique le long du vignoble de la Sèvre Nantaise vers un hôtel de charme avec check-in à 15:00, local vélo sécurisé et dîner sur place.',
      gateName: 'Réception Hôtel',
    },
  },
};

export function getLocalizedTripMeta(
  trip: TripProfile,
  lang: Language
): { name: string; description: string; gateName: string } {
  const arch = getArchetypeFromTag(trip.tag, trip.name);
  const builtin = BUILTIN_TRIP_TRANSLATIONS[trip.id];
  const fallbackGateByArch: Record<string, string> = {
    COMMUTE: lang === 'fr' ? 'Porte' : 'Gate',
    ESCAPADE: lang === 'fr' ? 'Réception Hôtel / Étape' : 'Hotel Check-in / Stage Lodging',
    BIKEPACKING: lang === 'fr' ? 'Zone de Bivouac / Camp' : 'Camp / Bivouac Site',
    SPORT: lang === 'fr' ? 'Ligne d’arrivée / Club' : 'Finish Line / Clubhouse',
  };
  const isStaleCommuterGate = (g?: string) =>
    !g?.trim() || /gate\s*(b|17)|porte\s*(b|17)|atlantis|campus|office|bureau|workplace|entreprise/i.test(g);

  if (!builtin) {
    let gateName = trip.office?.gateName || fallbackGateByArch[arch];
    if (arch !== 'COMMUTE' && isStaleCommuterGate(trip.office?.gateName)) {
      gateName = fallbackGateByArch[arch];
    } else if (lang === 'fr') {
      gateName = gateName.replace(/^Gate\b/i, 'Porte');
      if (gateName === 'Hotel Reception') gateName = 'Réception Hôtel';
      if (gateName === 'Hotel Check-in / Stage Lodging') gateName = 'Réception Hôtel / Étape';
      if (gateName === 'Camp / Bivouac Site') gateName = 'Zone de Bivouac / Camp';
      if (gateName === 'Finish Line / Clubhouse') gateName = 'Ligne d’arrivée / Club';
    } else {
      gateName = gateName.replace(/^Porte\b/i, 'Gate');
      if (gateName === 'Réception Hôtel') gateName = 'Hotel Reception';
      if (gateName === 'Réception Hôtel / Étape') gateName = 'Hotel Check-in / Stage Lodging';
      if (gateName === 'Zone de Bivouac / Camp') gateName = 'Camp / Bivouac Site';
      if (gateName === 'Ligne d’arrivée / Club') gateName = 'Finish Line / Clubhouse';
    }
    return {
      name: trip.name,
      description: trip.description,
      gateName,
    };
  }

  const isDefaultName =
    trip.name === builtin.en.name || trip.name === builtin.fr.name;
  const isDefaultDesc =
    trip.description === builtin.en.description ||
    trip.description === builtin.fr.description;
  const isDefaultGate =
    trip.office?.gateName === builtin.en.gateName ||
    trip.office?.gateName === builtin.fr.gateName;

  const resolvedGate =
    arch !== 'COMMUTE' && !isDefaultGate && isStaleCommuterGate(trip.office?.gateName)
      ? fallbackGateByArch[arch]
      : isDefaultGate
      ? builtin[lang].gateName
      : trip.office?.gateName || builtin[lang].gateName;

  return {
    name: isDefaultName ? builtin[lang].name : trip.name,
    description: isDefaultDesc ? builtin[lang].description : trip.description,
    gateName: resolvedGate,
  };
}

export function getChecklistItemLabel(
  item: ChecklistItem,
  distanceKm: number = 35,
  lang: Language = 'en',
  options?: {
    isTubeless?: boolean;
    carbTargetGPerHr?: number;
    nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
    bidonSizeMl?: number;
    frameBottleSlots?: number;
    tempC?: number;
    rideHours?: number;
    legWatts?: number;
  }
): string {
  const specs = loadRiderBikeSpecs();
  const activeBike = getActiveBike(specs);
  const isTubeless = options?.isTubeless ?? Boolean(activeBike?.isTubeless);
  const carbTarget = options?.carbTargetGPerHr ?? specs.carbTargetGPerHr ?? 60;
  const nutritionPref = options?.nutritionPreference ?? specs.nutritionPreference ?? 'real-food';
  const bidonSizeMl = options?.bidonSizeMl ?? specs.bidonSizeMl ?? 650;
  const frameBottleSlots = options?.frameBottleSlots ?? specs.frameBottleSlots ?? 2;
  const rideHours = options?.rideHours ?? Math.max(0.25, distanceKm / 25);
  const hydrationPlan = calculateHydrationPlan({
    rideHours,
    tempC: options?.tempC ?? 18,
    legWatts: options?.legWatts ?? 150,
    bidonSizeMl,
    frameBottleSlots,
    isShortRide: rideHours < 0.75,
  });
  const hydrationEn =
    hydrationPlan.plannedRefillBidons === 0
      ? `${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml bottle(s) on bike (${hydrationPlan.totalFluidNeedMl} ml target)`
      : `${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml bottle(s) on frame + ${hydrationPlan.plannedRefillBidons} planned refill(s) en route`;
  const hydrationFr =
    hydrationPlan.plannedRefillBidons === 0
      ? `${hydrationPlan.carriedOnFrameBidons}× bidon(s) de ${bidonSizeMl} ml sur le vélo (${hydrationPlan.totalFluidNeedMl} ml cible)`
      : `${hydrationPlan.carriedOnFrameBidons}× bidon(s) de ${bidonSizeMl} ml sur cadre + ${hydrationPlan.plannedRefillBidons} recharge(s) prévue(s) en route`;
  const bar = isTubeless
    ? distanceKm > 60
      ? '2.4'
      : '2.6'
    : distanceKm > 60
    ? '3.0'
    : '3.2';

  const map: Record<string, { en: string; fr: string }> = {
    // DEFAULT_CHECKLIST (Gate 17 preset)
    'chk-tire': {
      en: isTubeless
        ? `Tire Pressure: ${bar} bar (Tubeless setup & sealant checked)`
        : `Tire Pressure: ${bar} bar (Inner tube setup calibrated)`,
      fr: isTubeless
        ? `Pression des pneus : ${bar.replace('.', ',')} bar (Montage Tubeless & préventif vérifiés)`
        : `Pression des pneus : ${bar.replace('.', ',')} bar (Chambre à air calibrée)`,
    },
    'chk-chain': {
      en: 'Drivetrain: Degreased & Silca hot-melt / ceramic wax lubricated',
      fr: 'Transmission : Dégraissée & lubrifiée à la cire céramique',
    },
    'chk-battery': {
      en: 'Batteries: Di2 shifter > 80% & Garmin Varia Radar fully charged',
      fr: 'Batteries : Dérailleur Di2 > 80 % & radar Garmin Varia chargé à 100 %',
    },
    'chk-brakes': {
      en: 'Brakes: Pad bite checked, rotors degreased with isopropyl',
      fr: 'Freins : Mordant des plaquettes vérifié, disques dégraissés',
    },
    'chk-vest': {
      en: 'High-Vis Aero Wind Vest & Reflective Ankle Bands',
      fr: 'Gilet coupe-vent haute visibilité & bandes réfléchissantes chevilles',
    },
    'chk-glasses': {
      en: 'Photochromic / Clear Hydrophobic Lenses (Estuary spray protection)',
      fr: 'Lunettes photochromiques / verres hydrophobes (embruns estuaire)',
    },
    'chk-lights': {
      en: 'Front 800lm Beam mounted in strobe/steady daytime mode',
      fr: 'Phare avant 800 lm monté en mode flash diurne / fixe',
    },
    'chk-shell': {
      en: 'Gore-Tex Shakedry emergency shell stowed in middle pocket',
      fr: 'Veste pluie compacte Gore-Tex rangée dans la poche centrale',
    },
    'chk-bidon': {
      en: hydrationEn,
      fr: hydrationFr,
    },
    'chk-dates': {
      en: 'Pocket Fuel: 2 Medjool dates + 2 dried Turkish figs',
      fr: 'Ravito poche : 2 dattes Medjool + 2 figues séchées',
    },
    'chk-pate': {
      en: 'Pocket Fuel: 2 artisanal pâte de fruits squares',
      fr: 'Ravito poche : 2 pâtes de fruits artisanales',
    },
    'chk-skyr': {
      en: 'Commute Pack: 200 g plain yogurt in insulated cooler pouch',
      fr: 'Sac vélotaf : 200 g de yaourt nature en pochette isotherme',
    },
    'chk-oats': {
      en: 'Commute Pack: Jar of oat milk overnight oats + apple + walnuts',
      fr: "Sac vélotaf : Bocal d'overnight oats au lait d'avoine + pomme + noix",
    },
    'chk-badge': {
      en: 'Office RFID Security Badge & Bike Shelter Token',
      fr: 'Badge RFID bureau & jeton du local vélo sécurisé',
    },
    'chk-padlock': {
      en: 'Bike Shelter Heavy-Duty Padlock + Cable',
      fr: 'Cadenas renforcé local vélo + câble antivol',
    },
    'chk-shirt': {
      en: 'Ironed Oxford shirt & lightweight office trousers in dry pack',
      fr: 'Chemise repassée & pantalon de bureau en sac étanche',
    },
    'chk-towel': {
      en: 'Microfiber quick-dry bath towel + natural cedar deodorant',
      fr: 'Serviette microfibre séchage rapide + nécessaire de douche',
    },

    // Dynamic generateTripChecklist items
    'mech-pressure': {
      en: isTubeless
        ? `Tubeless tire pressure calibrated to ${bar} bar & sealant checked`
        : `Tire pressure calibrated to ${bar} bar`,
      fr: isTubeless
        ? `Pression Tubeless calibrée à ${bar.replace('.', ',')} bar & préventif vérifié`
        : `Pression des pneus calibrée à ${bar.replace('.', ',')} bar`,
    },
    'mech-spares': {
      en: isTubeless
        ? distanceKm > 50
          ? 'Multi-tool, tubeless plug darts, CO2 inflator & backup micro-tube'
          : 'Multi-tool, tubeless plug kit & CO2 / mini pump'
        : distanceKm > 50
        ? 'Multi-tool, 2× tire levers, spare tube & mini pump'
        : 'Multi-tool & spare tube',
      fr: isTubeless
        ? distanceKm > 50
          ? 'Multi-outil, mèches tubeless, cartouche CO2 & chambre de secours'
          : 'Multi-outil, mèches tubeless & gonfleur CO2 / mini-pompe'
        : distanceKm > 50
        ? 'Multi-outil, 2 démonte-pneus, chambre à air & mini-pompe (kit anti-crève)'
        : 'Multi-outil & kit anti-crève (chambre à air)',
    },
    'mech-puncture-kit': {
      en: 'Full anti-puncture kit: tubeless plugs, CO2 cartridge & spare tube',
      fr: 'Kit anti-crève renforcé : mèches tubeless, cartouche CO2 & chambre à air',
    },
    'gear-thermal': {
      en: 'Thermal windproof gloves & neck gaiter',
      fr: 'Gants thermiques coupe-vent & tour de cou',
    },
    'esc-id': {
      en: 'Hotel Check-in: booking confirmation, ID & payment card',
      fr: 'Check-in Hôtel : confirmation de réservation, pièce d’identité & CB',
    },
    'esc-pannier': {
      en: 'Pannier / Saddlebag weight distribution & dry-bag waterproofing',
      fr: 'Répartition du poids sacoches / sac de selle & sac étanche',
    },
    'esc-clothes': {
      en: 'Casual off-bike evening clothes & lightweight walking shoes',
      fr: 'Tenue civile pour le soir & chaussures de marche légères',
    },
    'esc-charge': {
      en: 'Evening charging & recovery (GPS, lights, power bank & recovery kit)',
      fr: 'Recharge du soir & récupération (GPS, phares, batterie & étirements)',
    },
    'esc-lock': {
      en: 'Compact bike lock for hotel storage',
      fr: 'Antivol compact pour le local vélo de l’hôtel',
    },
    'esc-fuel': {
      en: hydrationEn,
      fr: hydrationFr,
    },
    'esc-lights': {
      en: 'Front headlight & rear safety flasher',
      fr: 'Éclairage avant & feu arrière flash de sécurité',
    },
    'sport-fuel': {
      en:
        nutritionPref === 'real-food'
          ? `Whole-food ride fuel (~${carbTarget} g/h: dates, fruit chews) & electrolyte bottles`
          : `Carb mix in bottles (~${carbTarget} g/h) & energy gels`,
      fr:
        nutritionPref === 'real-food'
          ? `Ravito aliments vrais (~${carbTarget} g/h : dattes, pâtes de fruits) & bidons isotoniques`
          : `Boisson glucidique en bidons (~${carbTarget} g/h) & gels ravito`,
    },
    'sport-computer': {
      en: 'GPS computer synced with sensors',
      fr: 'Compteur GPS synchronisé avec capteurs',
    },
    'sport-kit': {
      en: 'Aero kit & lightweight wind gilet',
      fr: 'Tenue aéro ajustée & gilet coupe-vent léger',
    },
    'sport-plugs': {
      en: 'Tubeless plug kit & CO2 inflator',
      fr: 'Kit mèches tubeless anti-crève & gonfleur CO2',
    },
    'bp-pannier': {
      en: 'Pannier / Saddlebag weight distribution (balanced load)',
      fr: 'Répartition du poids sacoches / sac de selle (équilibre du vélo)',
    },
    'bp-sleep': {
      en: 'Bivouac bag / compact tent & sleeping pad',
      fr: 'Sac de bivouac / tente compacte & matelas isolant',
    },
    'bp-power': {
      en: 'Evening charging & recovery (20,000mAh power bank, cables & rest kit)',
      fr: 'Recharge du soir & récupération (batterie 20 000 mAh, câbles & kit repos)',
    },
    'bp-charging-autonomy': {
      en: 'Evening charging & autonomy: multi-port USB-C splitter for GPS, radar & 800-1000lm lights',
      fr: 'Recharge du soir multi-étapes : chargeur multi-ports USB-C (GPS, radar, phares)',
    },
    'bp-multiday-logistics': {
      en: 'Hotel Check-in / bivouac stops & rail bike passes saved offline',
      fr: 'Check-in Hôtel / bivouacs & billets train vélo sauvegardés hors-ligne',
    },
    'bp-water': {
      en: 'Water filtration flask + 2L hydration capacity',
      fr: 'Flasque filtrante + capacité hydrique de 2 L',
    },
    'bp-chain': {
      en: 'Chain tool, quick-links & spare hanger',
      fr: 'Dérive-chaîne, maillons rapides & patte de dérailleur',
    },
    'com-badge': {
      en: 'Facility security badge & credentials',
      fr: "Badge d'accès entreprise & identifiants",
    },
    'com-laptop': {
      en: 'Work laptop & USB-C charger',
      fr: 'Ordinateur portable pro & chargeur USB-C',
    },
    'com-clothes': {
      en: 'Clean work clothes packed in dry-bag',
      fr: 'Tenue de travail propre rangée en sac étanche',
    },
    'com-shower': {
      en: 'Shower kit & microfiber quick-dry towel',
      fr: 'Trousse de douche & serviette microfibre séchage rapide',
    },
    'com-lock': {
      en: 'Heavy-duty U-Lock for bike shelter',
      fr: 'Antivol U haute sécurité pour le parking vélo',
    },
    'com-recovery': {
      en: 'Post-arrival recovery nutrition packed',
      fr: 'Collation de récupération prête dans le sac',
    },
    'ravito-extra': {
      en: 'Extra whole-food fueling rations & electrolytes packed',
      fr: 'Rations ravito supplémentaires (pâtes de fruits, dattes & électrolytes)',
    },
    'chip-mountain-plugs': {
      en: 'High-mountain tubeless plug darts, spare brake pads & CO2 canisters',
      fr: 'Mèches tubeless haute montagne, plaquettes de rechange & cartouches CO2',
    },
    'chip-mountain-topo': {
      en: 'Offline topographic GPS trail maps & emergency contacts',
      fr: 'Tracés GPS topographiques hors-ligne & secours montagne',
    },
    'chip-night-beam': {
      en: 'High-beam headlight (800+ lumens) fully charged & rear flasher',
      fr: 'Phare avant 800+ lumens chargé & feu arrière clignotant puissant',
    },
    'chip-night-hivis': {
      en: 'Reflective sash/vest & reflective ankle bands',
      fr: 'Baudrier / gilet haute visibilité & bandes réfléchissantes de cheville',
    },
    'chip-coffee-lock': {
      en: 'Compact cafe frame lock & contactless payment for coffee pause',
      fr: 'Antivol de cadre rapide & moyen de paiement pour la pause café',
    },
    'chip-picnic-pannier': {
      en: 'Insulated picnic pannier with fresh provisions, cutlery & folding knife',
      fr: 'Sacoche isotherme avec victuailles fraîches, couverts & couteau pliant',
    },
    'chip-wine-sleeves': {
      en: 'Padded bottle protective sleeves for pannier wine transport',
      fr: 'Manchons de protection matelassés pour bouteilles de vin en sacoche',
    },
    'chip-first-aid': {
      en: 'Wilderness trauma kit: sterile dressings, antiseptic & space blanket',
      fr: 'Trousse de secours : pansements compressifs, antiseptique & couverture de survie',
    },
    'chip-solar-bank': {
      en: 'Rugged 20,000mAh battery pack & weatherproof charging cables',
      fr: 'Batterie externe 20 000 mAh renforcée & faisceau de câbles étanches',
    },
    'chip-bad-weather': {
      en: 'Full mudguards inspected & Gore-Tex Shakedry rain shell stowed',
      fr: 'Garde-boue intégraux vérifiés & veste pluie Gore-Tex Shakedry',
    },
    'chip-bivouac-kit': {
      en: 'Ultralight bivouac shelter, insulated sleeping pad & water filter flask',
      fr: 'Abri bivouac ultraléger, matelas gonflable isolant & flasque filtrante',
    },
    'chip-hydration-fuel': {
      en: `Calibrated carb drink mix (~${carbTarget} g/h) & sodium salt tabs`,
      fr: `Mélange glucidique calibré (~${carbTarget} g/h) & capsules de sodium`,
    },
    'chip-cargo-laptop': {
      en: '15" Work laptop inside IPX6 waterproof dry sleeve & USB-C charger',
      fr: 'Ordinateur pro 15" dans housse étanche IPX6 & chargeur USB-C',
    },
    'chip-gravel-pressure': {
      en: 'Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted',
      fr: 'Pression tout-terrain ajustée à 2,4–2,8 bar & outil mèches prêt',
    },
    'chip-paceline-radar': {
      en: 'Rear Garmin Varia radar charged & peloton hand signals briefed',
      fr: 'Radar arrière Garmin Varia chargé & signaux de peloton synchronisés',
    },
    'chip-shower-kit': {
      en: 'Microfiber quick-dry towel, toiletries & fresh change of clothes in dry bag',
      fr: 'Serviette microfibre, trousse de toilette & tenue propre sous sac étanche',
    },
    'chip-historical-shoes': {
      en: 'Comfortable walking shoes & secure bike lock for monuments',
      fr: 'Chaussures confortables pour la marche & antivol sécurisé de visite',
    },
    'chip-camera-bag': {
      en: 'Handlebar weatherproof camera bag, lens cloth & spare battery',
      fr: 'Sacoche appareil photo étanche de guidon & lingette microfibre',
    },
    'chip-spa-pack': {
      en: 'Swimsuit, sandals & recovery compression socks for thermal spa',
      fr: 'Maillot de bain, sandales & chaussettes de récupération pour le spa',
    },
    'chip-interval-workout': {
      en: 'Structured threshold interval workout synced to GPS head unit',
      fr: 'Séance de fractionné par intervalles synchronisée sur le compteur GPS',
    },
    'chip-kom-climb': {
      en: 'Low-ratio climbing cog checked (32/34T) & freshly waxed chain',
      fr: 'Grand pignon de montagne vérifié (32/34D) & chaîne dégraissée',
    },
  };

  if (map[item.id]) {
    return map[item.id][lang];
  }
  return item.label;
}

export function getChecklistCategoryLabel(
  category: ChecklistItem['category'],
  lang: Language
): string {
  if (lang === 'fr') {
    switch (category) {
      case 'mechanics':
        return 'MÉCANIQUE';
      case 'gear':
        return 'ÉQUIPEMENT';
      case 'nutrition':
        return 'RAVITO';
      case 'logistics':
        return 'LOGISTIQUE';
    }
  }
  return category.toUpperCase();
}
