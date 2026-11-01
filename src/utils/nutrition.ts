import { NutritionPhase } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';

/**
 * Returns the exact 4-phase Real-Food Nutrition Protocol
 * adhering strictly to the rule: NO POWDERS / NO MILK / NO BANANAS.
 */
export function getRealFoodNutritionPlan(
  lockerArrivalTime: string = '08:30',
  breakRoomTime: string = '08:50',
  departureTime: string = '07:35',
  lang: Language = getCurrentLanguage()
): NutritionPhase[] {
  const isFr = lang === 'fr';
  return [
    {
      phaseId: 'pre-ride',
      title: isFr ? 'Petit-Déjeuner Pré-Sortie' : 'Pre-Ride Breakfast',
      timeWindow: `${subtractMinutesFromTime(departureTime, 45)} – ${departureTime}`,
      location: isFr ? 'Cuisine Domicile' : 'Home Kitchen',
      rules: isFr
        ? 'Glucides rapides à IG élevé, zéro graisses laitières, confort digestif maximal. Terminer 35-45 min avant le départ.'
        : 'High glycemic fast carbs, zero dairy fats, high gastro-comfort. Complete 35-45m prior to rollout.',
      items: [
        {
          name: isFr ? 'Baguette Blanche Grillée / Pain de Campagne' : 'Toasted White Baguette / Country Loaf',
          quantity: isFr ? '75 g (2 tranches)' : '75g (2 thick slices)',
          carbsGrams: 41,
          proteinGrams: 6,
          fatsGrams: 1,
          kcals: 200,
          notes: isFr ? 'Vidange gastrique rapide, sans fibres irritantes.' : 'Rapid gastric emptying, zero resistant fiber.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? "Miel Pur d'Acacia ou de Fleurs" : 'Pure Acacia or Wildflower Honey',
          quantity: isFr ? '25 g (1,5 c.à.s)' : '25g (1.5 tbsp)',
          carbsGrams: 21,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 85,
          notes: isFr ? 'Ratio 50/50 glucose-fructose pour assimilation directe.' : '50/50 glucose-fructose ratio for cellular uptake.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Double Ristretto / Expresso' : 'Double Ristretto / Espresso',
          quantity: isFr ? '60 ml (2 doses)' : '60ml (2 shots)',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 5,
          notes: isFr ? '~140 mg caféine, mobilisation des acides gras.' : '~140mg caffeine, adenosine blocker, fatty acid mobilization.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Eau de Source + Pincée de Sel de Guérande' : 'Spring Water with Pinch of Celtic Salt',
          quantity: '300ml',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 0,
          notes: isFr ? 'Pré-hydratation avec électrolytes naturels.' : 'Pre-hydration volume with trace electrolytes.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'on-bike',
      title: isFr ? 'Ravito Naturel en Selle' : 'On-Bike Real-Food Fueling',
      timeWindow: isFr ? 'Du départ à l’arrivée (boire toutes les 15-20 min)' : 'Rollout to Arrival (sip every 15-20 min)',
      location: isFr ? 'En Route / Cockpit' : 'On Route / Cockpit',
      rules: isFr
        ? 'ZÉRO poudre industrielle, ZÉRO maltodextrine. Sucres naturels bruts uniquement.'
        : 'NO engineered powders, NO sticky maltodextrin. Pure whole food sugars.',
      items: [
        {
          name: isFr ? '50/50 Eau & Pur Jus de Pomme/Raisin Pressé' : '50/50 Water & 100% Pressed Apple/Grape Juice',
          quantity: isFr ? 'Bidon 650 ml' : '650ml bidon',
          carbsGrams: 36,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 145,
          notes: isFr ? 'Solution isotonique naturelle ~6 % de glucides.' : 'Isotonic ~6% natural carbohydrate solution, effortless stomach transit.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Dattes Medjool (Dénoyautées)' : 'Medjool Dates (Pitted)',
          quantity: isFr ? '2 dattes (48 g)' : '2 plump dates (48g)',
          carbsGrams: 34,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 135,
          notes: isFr ? 'Riches en potassium naturel, texture fondante.' : 'Rich in natural potassium, melt-in-mouth chewability.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Figues Séchées Naturelles' : 'Sun-Dried Turkish Figs',
          quantity: isFr ? '2 pièces (38 g)' : '2 pieces (38g)',
          carbsGrams: 24,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 100,
          notes: isFr ? 'Énergie progressive et durable.' : 'Crunchy crunch seeds, steady sustained glycemic release.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Pâtes de Fruits Artisanales' : 'Artisanal Pâte de Fruits (Fruit Pastes)',
          quantity: isFr ? '2 carrés (30 g)' : '2 squares (30g)',
          carbsGrams: 23,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 92,
          notes: isFr ? 'Coup de fouet pectine + saccharose face au vent.' : 'Fruit pectin + sucrose burst for headwind segments.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'locker-refuel',
      title: isFr ? 'Phase 1 : Ravito Vestiaire' : 'Phase 1: Locker Refuel',
      timeWindow: `${lockerArrivalTime} – ${addMinutesToTime(lockerArrivalTime, 10)}`,
      location: isFr ? 'Vestiaires Sous-Sol (Après Porte 17)' : 'Basement Locker Bay (Post-Gate 17)',
      rules: isFr
        ? 'Fenêtre métabolique immédiate post-effort. Consommé directement sur le banc du vestiaire.'
        : 'Immediate post-effort anabolic window. Zero blender noise, eaten directly at locker bench.',
      items: [
        {
          name: isFr ? 'Skyr 0 % Nature' : 'Skyr 0% Natural (Thick Icelandic Strained)',
          quantity: isFr ? 'Pot de 200 g' : '200g tub',
          carbsGrams: 8,
          proteinGrams: 22,
          fatsGrams: 0,
          kcals: 120,
          notes: isFr ? 'Apport protéiné pur caséine & lactosérum sans graisses.' : 'Lactose-strained pure casein & whey matrix, spoonable without mess.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Pur Jus de Raisin Noir 100 %' : '100% Pure Dark Concord Grape Juice',
          quantity: isFr ? 'Flasque 250 ml' : '250ml flask',
          carbsGrams: 38,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 155,
          notes: isFr ? 'Recharge rapide du glycogène musculaire.' : 'High glycemic index spiked insulin for rapid glycogen synthase recharge.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'break-room',
      title: isFr ? 'Phase 2 : Petit-Déjeuner Salle de Pause' : 'Phase 2: Break Room Breakfast',
      timeWindow: `${breakRoomTime} – ${addMinutesToTime(breakRoomTime, 15)}`,
      location: isFr ? 'Salle de Pause Dédiée (3e étage)' : '3rd Floor Dedicated Break Room',
      rules: isFr
        ? 'RÈGLE STRICTE : Aucun repas autorisé au poste de travail en open space.'
        : 'STRICT OFFICE POLICY: Absolutely no eating at desks or in open-space. Sit at break room counter.',
      items: [
        {
          name: isFr ? "Overnight Oats au Lait d'Avoine & Chia" : 'Oat Milk Overnight Oats with Chia',
          quantity: isFr ? 'Bocal 250 g' : '250g jar',
          carbsGrams: 42,
          proteinGrams: 8,
          fatsGrams: 6,
          kcals: 255,
          notes: isFr ? 'Fibres bêta-glucanes infusées à froid.' : 'Beta-glucan complex fibers soaked overnight in barista oat milk.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? '1 Pomme Granny Smith Croquante' : '1 Whole Crisp Grated Granny Smith Apple',
          quantity: '140g',
          carbsGrams: 19,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 75,
          notes: isFr ? 'Fraîcheur acide malique et pectine.' : 'Tart malic acid freshness, pectin, enzymes.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Cerneaux de Noix Concassés' : 'Lightly Crushed Raw Walnuts',
          quantity: '20g',
          carbsGrams: 3,
          proteinGrams: 3,
          fatsGrams: 13,
          kcals: 130,
          notes: isFr ? 'Oméga-3 ALA anti-inflammatoires.' : 'Omega-3 ALA anti-inflammatory neuro-protection.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? '1/2 Sandwich Baguette Fraîche (Dinde ou Avocat)' : '1/2 Fresh Baguette Sandwich (Turkey or Avocado)',
          quantity: isFr ? '100 g (demi-baguette)' : '100g half sandwich',
          carbsGrams: 36,
          proteinGrams: 14,
          fatsGrams: 5,
          kcals: 245,
          notes: isFr ? 'Satiété salée et énergie stable toute la matinée.' : 'Savory satiation and slow-release starch for full morning focus.',
          isRealFoodVerified: true,
        },
        {
          name: isFr ? 'Café Filtre ou Allongé' : 'Fresh Office Filter Coffee or Long Black',
          quantity: isFr ? 'Tasse 200 ml' : '200ml mug',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 2,
          notes: isFr ? 'Vigilance cognitive avant le standup de 09:00.' : 'Second phase alertness boost before 09:00 standup.',
          isRealFoodVerified: true,
        },
      ],
    },
  ];
}

// Helpers for timeline math
export function subtractMinutesFromTime(timeStr: string, minutesToSub: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  let totalMin = h * 60 + m - minutesToSub;
  while (totalMin < 0) totalMin += 1440;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  let totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}
