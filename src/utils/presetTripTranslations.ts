import type { PresetTripTranslationEntry } from './presetTrips';

export const PRESET_TRIP_TRANSLATIONS: Record<string, PresetTripTranslationEntry> = {
  'commute-nantes-atlantis': {
      en: {
        name: 'Loire Quay Morning Commute (Atlantis)',
        description:
          '9.4 km segregated riverside commute from Gare de Nantes to Saint-Herblain Atlantis with espresso stop, waterproof laptop pannier, and 08:30 arrival shower break.',
        gateName: 'Atlantis Campus',
      },
      fr: {
        name: 'Vélotaf Quais de Loire (Campus Atlantis)',
        description:
          'Trajet vélotaf sécurisé de 9,4 km depuis la Gare de Nantes vers Saint-Herblain Atlantis avec pause expresso, sacoche ordinateur étanche et pause douche à 08:30.',
        gateName: 'Campus Atlantis',
      },
    },
  'commute-paris-seine': {
      en: {
        name: 'Seine Express Cycleway (Bastille → La Défense)',
        description:
          '16.1 km dawn urban transit along the Seine cycleways and Neuilly bridge with 800+ lm lighting, EN ISO 20471 yellow vest, and peak rush-hour cushion.',
        gateName: 'Tour Majunga Bike Bay',
      },
      fr: {
        name: 'Axe Seine Express (Bastille → La Défense)',
        description:
          'Traversée matinale de 16,1 km par les voies sur berges et le pont de Neuilly avec éclairage 800+ lm, gilet jaune homologué et marge heure de pointe.',
        gateName: 'Parking Vélo Tour Majunga',
      },
    },
  'commute-lyon-saone': {
      en: {
        name: 'Saône Valley Tempo Commute (Part-Dieu)',
        description:
          '38.3 km endurance commuter express from Villefranche along the Saône towpath into Lyon Part-Dieu, pairing Zone 3 fitness intervals with full splash-guard protection.',
        gateName: 'Part-Dieu Secure Bike Hub',
      },
      fr: {
        name: 'Vélotaf Tempo Val de Saône (Lyon Part-Dieu)',
        description:
          'Vélotaf longue distance de 38,3 km le long de la Saône vers Lyon Part-Dieu, combinant allure cardio Zone 3, garde-boue intégraux et protocole douche complet.',
        gateName: 'Consigne Vélo Part-Dieu',
      },
    },
  'sport-cote-sauvage': {
      en: {
        name: 'Côte Sauvage Aero Paceline (Piriac)',
        description:
          '23.3 km Atlantic coastal chain-gang sprint from Pornichet to Piriac-sur-Mer in tight echelon rotation at 33.5 km/h with 80 g/h isotonic carbohydrate fueling.',
        gateName: 'Piriac Lighthouse Finish',
      },
      fr: {
        name: 'Bordures Aéro Côte Sauvage (Piriac)',
        description:
          'Sortie peloton rythmée de 23,3 km entre Pornichet et Piriac-sur-Mer en relais serrés à 33,5 km/h avec protocole glucidique isotonique à 80 g/h.',
        gateName: 'Arrivée Phare de Piriac',
      },
    },
  'sport-annecy-forclaz': {
      en: {
        name: 'Col de la Forclaz KOM Ascent (Annecy)',
        description:
          '17.7 km Alpine climbing benchmark (+790 m D+) from Lake Annecy up to Col de la Forclaz with structured threshold intervals and 85 g/h high-carb pacing.',
        gateName: 'Col de la Forclaz Summit (1150 m)',
      },
      fr: {
        name: 'Ascension KOM Col de la Forclaz (Annecy)',
        description:
          'Montée référence de 17,7 km (+790 m D+) depuis le Pâquier d’Annecy jusqu’au Col de la Forclaz avec séries au seuil et apport glucidique à 85 g/h.',
        gateName: 'Sommet Col de la Forclaz (1150 m)',
      },
    },
  'sport-briere-gravel': {
      en: {
        name: 'Brière Gravel Tempo (Guérande → Vilaine)',
        description:
          '25.2 km mixed-surface gravel tempo across the Brière Regional Park to La Roche-Bernard with 2.5 bar tubeless setup, sweetspot surges, and zero-waste fueling.',
        gateName: 'La Roche-Bernard Old Harbour',
      },
      fr: {
        name: 'Gravel Tempo Brière (Guérande → Vilaine)',
        description:
          'Parcours gravel rapide de 25,2 km à travers le Parc de Brière vers La Roche-Bernard en tubeless 2,5 bar, séries sweetspot et charte zéro déchet.',
        gateName: 'Vieux Port de La Roche-Bernard',
      },
    },
  'bikepacking-jade-coast': {
      en: {
        name: 'Jade Coast & Oyster Marsh Bivouac',
        description:
          '41.0 km self-supported Vélodyssée stage from Saint-Brevin to Port du Bec across coastal pine trails and salt marshes with full bivouac kit and 20,000mAh power reserve.',
        gateName: 'Port du Bec Marsh Bivouac',
      },
      fr: {
        name: 'Bivouac Côte de Jade & Marais Breton',
        description:
          'Étape Vélodyssée en autonomie de 41,0 km de Saint-Brevin au Port du Bec entre pinèdes côtières et marais ostréicoles avec kit bivouac et batterie 20 000 mAh.',
        gateName: 'Bivouac du Port du Bec',
      },
    },
  'bikepacking-canal-redon': {
      en: {
        name: 'Nantes–Brest Canal Towpath Expedition',
        description:
          '70.3 km traffic-free towpath expedition from Nort-sur-Erdre to Redon past historic lock houses and Blain Castle, paced at a steady 20 km/h cruise before camp curfew.',
        gateName: 'Redon Canal Basin Camp',
      },
      fr: {
        name: 'Expédition Canal de Nantes à Brest (Redon)',
        description:
          'Traversée de 70,3 km sur le chemin de halage de Nort-sur-Erdre à Redon au fil des écluses et du château de Blain, régulée à 20 km/h avant le bivouac.',
        gateName: 'Campement Bassin de Redon',
      },
    },
  'bikepacking-drome-vercors': {
      en: {
        name: 'Drôme Valley & Vercors Foothills Haul',
        description:
          '58.5 km mountain bikepacking stage (+1,331 m D+) from Valence to Die via Crest, equipped with 12.2 kg alpine rig, wilderness trauma kit, and pre-dusk camp curfew.',
        gateName: 'Die Vercors Highland Bivouac',
      },
      fr: {
        name: 'Bikepacking Vallée de la Drôme & Vercors',
        description:
          'Étape montagne de 58,5 km (+1 331 m D+) de Valence à Die par la tour de Crest avec chargement alpin de 12,2 kg, trousse secours et couvre-feu bivouac.',
        gateName: 'Bivouac Piémont du Vercors (Die)',
      },
    },
  'escapade-clisson-spa': {
      en: {
        name: 'Sèvre Vineyard & Clisson Spa Escapade',
        description:
          '30.5 km scenic vineyard ride from Nantes Castle to Hôtel Villa Saint-Antoine overlooking Clisson fortress, timed for a 50-minute spa session and 19:45 terroir dinner.',
        gateName: 'Villa Saint-Antoine Reception',
      },
      fr: {
        name: 'Escapade Vignoble & Spa à Clisson',
        description:
          'Balade panoramique de 30,5 km du Château de Nantes à l’Hôtel Villa Saint-Antoine face à la forteresse de Clisson, calée pour 50 min de spa et le dîner à 19:45.',
        gateName: 'Réception Villa Saint-Antoine',
      },
    },
  'escapade-saumur-chinon': {
      en: {
        name: 'Royal Loire Châteaux (Saumur → Chinon)',
        description:
          '27.7 km Loire à Vélo riverside tour linking Saumur Castle, Montsoreau confluence, and Chinon Royal Fortress with an insulated riverside picnic and 17:00 B&B greeting.',
        gateName: 'Clos de la Vienne B&B Courtyard',
      },
      fr: {
        name: 'Châteaux de la Loire (Saumur → Chinon)',
        description:
          'Échappée Loire à Vélo de 27,7 km reliant le Château de Saumur, Montsoreau et la Forteresse de Chinon avec pique-nique sur berge et accueil chambre d’hôtes à 17:00.',
        gateName: 'Cour Fermée Maison d’Hôtes Chinon',
      },
    },
  'escapade-annecy-aix': {
      en: {
        name: 'Savoyard Lakes & Thermal Aix Escapade',
        description:
          '34.7 km Alpine valley tour from Annecy Old Town canals to Aix-les-Bains thermal baths with audio heritage stops, golden-hour Lake Bourget views, and Savoyard dining.',
        gateName: 'Grand Hôtel du Parc Reception',
      },
      fr: {
        name: 'Escapade Lacs de Savoie & Aix Thermal',
        description:
          'Randonnée cyclo de 34,7 km des canaux d’Annecy jusqu’aux Thermes d’Aix-les-Bains avec étapes audio patrimoine, lumière dorée sur le lac du Bourget et table savoyarde.',
        gateName: 'Réception Grand Hôtel du Parc',
      },
    },
};
