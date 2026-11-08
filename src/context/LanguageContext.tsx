import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { en, TranslationKey } from '../locales/en';
import { fr } from '../locales/fr';
import { ChecklistItem, TripProfile } from '../types/trip';
import { PRESET_TRIP_TRANSLATIONS } from '../utils/presetTrips';
import { loadRiderBikeSpecs, getActiveBike } from '../utils/specsStorage';

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
      name: 'Morning Estuary Commute (Gate 17)',
      description:
        '22 km daily gravel commute crossing the Saint-Nazaire estuary bridge to secure Gate 17. Planned office timing: Locker refuel at 08:30, Break room breakfast at 08:50, Shift start 09:00.',
      gateName: 'Gate 17',
    },
    fr: {
      name: 'Vélotaf Matinal Estuaire (Porte 17)',
      description:
        'Trajet vélotaf gravel quotidien de 22 km par le pont de Saint-Nazaire vers la Porte 17. Organisation bureau : ravito vestiaire à 08:30, petit-déjeuner salle de pause à 08:50, prise de poste à 09:00.',
      gateName: 'Porte 17',
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
        'Self-supported multi-day adventure with full rig loading (~12kg gear). Stage 1 rolls towards the coastal pine forest bivouac before dusk.',
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
  const builtin = BUILTIN_TRIP_TRANSLATIONS[trip.id];
  if (!builtin) {
    let gateName = trip.office?.gateName || 'Gate';
    if (lang === 'fr') {
      gateName = gateName.replace(/^Gate\b/i, 'Porte');
      if (gateName === 'Hotel Reception') gateName = 'Réception Hôtel';
    } else {
      gateName = gateName.replace(/^Porte\b/i, 'Gate');
      if (gateName === 'Réception Hôtel') gateName = 'Hotel Reception';
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

  return {
    name: isDefaultName ? builtin[lang].name : trip.name,
    description: isDefaultDesc ? builtin[lang].description : trip.description,
    gateName: isDefaultGate ? builtin[lang].gateName : (trip.office?.gateName || builtin[lang].gateName),
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
  }
): string {
  const specs = loadRiderBikeSpecs();
  const activeBike = getActiveBike(specs);
  const isTubeless = options?.isTubeless ?? Boolean(activeBike?.isTubeless);
  const carbTarget = options?.carbTargetGPerHr ?? specs.carbTargetGPerHr ?? 60;
  const nutritionPref = options?.nutritionPreference ?? specs.nutritionPreference ?? 'real-food';
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
      en: 'Bidon: 650ml 50/50 Water & 100% Pressed Grape/Apple juice',
      fr: 'Bidon : 650 ml 50/50 eau & pur jus de raisin/pomme pressé',
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
      en: 'Commute Pack: 200g Skyr 0% in insulated cooler pouch for Locker Bay',
      fr: 'Sac vélotaf : 200 g de Skyr 0 % en pochette isotherme pour le vestiaire',
    },
    'chk-oats': {
      en: 'Commute Pack: Jar of oat milk overnight oats + apple + walnuts',
      fr: "Sac vélotaf : Bocal d'overnight oats au lait d'avoine + pomme + noix",
    },
    'chk-badge': {
      en: 'Gate 17 RFID Security Badge & Subterranean Shelter Token',
      fr: 'Badge RFID Porte 17 & jeton du local vélo sécurisé',
    },
    'chk-padlock': {
      en: 'Locker Bay Heavy-Duty Master Padlock + Cable',
      fr: 'Cadenas renforcé vestiaire + câble antivol',
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
        ? 'Multi-tool, 2x tire levers, spare tube & mini pump'
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
      en: 'Hotel reservation booking & national ID',
      fr: "Confirmation de réservation d'hôtel & pièce d'identité",
    },
    'esc-clothes': {
      en: 'Casual off-bike evening clothes & walking shoes',
      fr: 'Tenue civile pour le soir & chaussures de marche légères',
    },
    'esc-charge': {
      en: 'Phone charger & portable power bank',
      fr: 'Chargeur téléphone & batterie externe',
    },
    'esc-lock': {
      en: 'Compact bike lock for hotel storage',
      fr: 'Antivol compact pour le local vélo de l’hôtel',
    },
    'esc-fuel': {
      en:
        distanceKm > 40
          ? '2x 650ml bidons + energy snacks'
          : '1x Bidon + snack',
      fr:
        distanceKm > 40
          ? '2 bidons de 650 ml + encas ravito'
          : '1 bidon + encas ravito',
    },
    'esc-lights': {
      en: 'Front headlight & rear safety flasher',
      fr: 'Éclairage avant & feu arrière flash de sécurité',
    },
    'sport-fuel': {
      en:
        nutritionPref === 'real-food'
          ? `Whole-food ride fuel (~${carbTarget}g/hr: dates, fruit chews) & electrolyte bidons`
          : `Carb mix in bottles (~${carbTarget}g/hr) & energy gels`,
      fr:
        nutritionPref === 'real-food'
          ? `Ravito aliments vrais (~${carbTarget}g/h : dattes, pâtes de fruits) & bidons isotoniques`
          : `Boisson glucidique en bidons (~${carbTarget}g/h) & gels ravito`,
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
    'bp-sleep': {
      en: 'Bivouac bag / compact tent & sleeping pad',
      fr: 'Sac de bivouac / tente compacte & matelas isolant',
    },
    'bp-power': {
      en: 'High-capacity 20,000mAh power bank & cables',
      fr: 'Batterie externe haute capacité 20 000 mAh & câbles',
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
      fr: 'Ravito de récupération vestiaire prêt dans le sac',
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
      en: `Calibrated carb drink mix (~${carbTarget}g/hr) & sodium salt tabs`,
      fr: `Mélange glucidique calibré (~${carbTarget}g/h) & capsules de sodium`,
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
