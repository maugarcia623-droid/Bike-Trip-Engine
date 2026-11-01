import { NutritionPhase } from '../types/trip';
import { Language, getCurrentLanguage } from '../context/LanguageContext';
import { loadRiderBikeSpecs } from './specsStorage';

/**
 * Returns the 4-phase Nutrition Protocol scaled dynamically to the rider's
 * carbohydrate digestion capacity (carbTargetGPerHr) and fuel preference.
 */
export function getRealFoodNutritionPlan(
  lockerArrivalTime: string = '08:30',
  breakRoomTime: string = '08:50',
  departureTime: string = '07:35',
  lang: Language = getCurrentLanguage(),
  options?: {
    carbTargetGPerHr?: number;
    rideHours?: number;
    nutritionPreference?: 'real-food' | 'mixed' | 'sports-fuel';
  }
): NutritionPhase[] {
  const isFr = lang === 'fr';
  const storedSpecs = loadRiderBikeSpecs();
  const carbTargetGPerHr = Math.max(25, Math.min(120, options?.carbTargetGPerHr ?? storedSpecs.carbTargetGPerHr ?? 60));
  const rideHours = Math.max(0.6, options?.rideHours ?? 1.5);
  const pref = options?.nutritionPreference ?? storedSpecs.nutritionPreference ?? 'real-food';
  // Baseline on-bike items below total 117g carbs; scale factor matches rider's gut target * ride duration
  const targetOnBikeCarbs = Math.max(30, Math.round(carbTargetGPerHr * rideHours));
  const carbScale = targetOnBikeCarbs / 117;
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
      title:
        pref === 'sports-fuel'
          ? isFr
            ? `Ravito Sportif en Selle (${carbTargetGPerHr} g/h)`
            : `On-Bike Sports Fueling (${carbTargetGPerHr}g/h)`
          : pref === 'mixed'
          ? isFr
            ? `Ravito Hybride en Selle (${carbTargetGPerHr} g/h)`
            : `On-Bike Mixed Fueling (${carbTargetGPerHr}g/h)`
          : isFr
          ? `Ravito Naturel en Selle (${carbTargetGPerHr} g/h)`
          : `On-Bike Real-Food Fueling (${carbTargetGPerHr}g/h)`,
      timeWindow: isFr ? 'Du départ à l’arrivée (boire toutes les 15-20 min)' : 'Rollout to Arrival (sip every 15-20 min)',
      location: isFr ? 'En Route / Cockpit' : 'On Route / Cockpit',
      rules:
        pref === 'sports-fuel'
          ? isFr
            ? `Calibré sur votre tolérance digestive (${carbTargetGPerHr} g/h) : boisson isotonique + gels rapides.`
            : `Calibrated to your gut target (${carbTargetGPerHr}g/h): isotonic drink mix + fast energy gels.`
          : pref === 'mixed'
          ? isFr
            ? `Calibré sur ${carbTargetGPerHr} g/h : aliments naturels en croisière + 1 gel de secours pour les bosses.`
            : `Calibrated to ${carbTargetGPerHr}g/h: whole foods for steady cruising + 1 gel backup for climbs.`
          : isFr
          ? `Calibré sur ${carbTargetGPerHr} g/h — ZÉRO poudre industrielle, sucres naturels bruts uniquement.`
          : `Calibrated to ${carbTargetGPerHr}g/h — NO engineered powders, pure whole-food sugars.`,
      items:
        pref === 'sports-fuel'
          ? [
              {
                name: isFr ? 'Boisson Glucidique Isotonique + Électrolytes' : 'Isotonic Carb Drink Mix + Electrolytes',
                quantity: isFr ? `${Math.max(1, Math.round(rideHours))}x Bidon 650 ml` : `${Math.max(1, Math.round(rideHours))}x 650ml bidon`,
                carbsGrams: Math.round(targetOnBikeCarbs * 0.55),
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Math.round(targetOnBikeCarbs * 0.55 * 4),
                notes: isFr ? 'Assimilation liquide rapide sans mastication.' : 'Rapid liquid gastric uptake without chewing.',
                isRealFoodVerified: false,
              },
              {
                name: isFr ? 'Gels Énergétiques Glucose/Fructose' : 'Dual-Source Energy Gels',
                quantity: `${Math.max(1, Math.round((targetOnBikeCarbs * 0.45) / 25))}x gel (25g)`,
                carbsGrams: Math.max(20, Math.round(targetOnBikeCarbs * 0.45)),
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Math.max(80, Math.round(targetOnBikeCarbs * 0.45 * 4)),
                notes: isFr ? 'À prendre avant les côtes ou sections exposées.' : 'Take ahead of climbs or exposed headwind sections.',
                isRealFoodVerified: false,
              },
            ]
          : [
              {
                name: isFr ? '50/50 Eau & Pur Jus de Pomme/Raisin Pressé' : '50/50 Water & 100% Pressed Apple/Grape Juice',
                quantity: isFr ? `${Math.max(1, Math.round(carbScale))}x Bidon 650 ml` : `${Math.max(1, Math.round(carbScale))}x 650ml bidon`,
                carbsGrams: Math.max(18, Math.round(36 * carbScale)),
                proteinGrams: 0,
                fatsGrams: 0,
                kcals: Math.max(72, Math.round(145 * carbScale)),
                notes: isFr ? 'Solution isotonique naturelle ~6 % de glucides.' : 'Isotonic ~6% natural carbohydrate solution, effortless stomach transit.',
                isRealFoodVerified: true,
              },
              {
                name: isFr ? 'Dattes Medjool (Dénoyautées)' : 'Medjool Dates (Pitted)',
                quantity: isFr ? `${Math.max(1, Math.round(2 * carbScale))} dattes` : `${Math.max(1, Math.round(2 * carbScale))} plump dates`,
                carbsGrams: Math.max(15, Math.round(34 * carbScale)),
                proteinGrams: 1,
                fatsGrams: 0,
                kcals: Math.max(60, Math.round(135 * carbScale)),
                notes: isFr ? 'Riches en potassium naturel, texture fondante.' : 'Rich in natural potassium, melt-in-mouth chewability.',
                isRealFoodVerified: true,
              },
              {
                name:
                  pref === 'mixed'
                    ? isFr
                      ? 'Gel Énergétique Rapide (Secours Bosses)'
                      : 'Fast Energy Gel (Climb Backup)'
                    : isFr
                    ? 'Pâtes de Fruits Artisanales & Figues'
                    : 'Artisanal Fruit Chews & Dried Figs',
                quantity:
                  pref === 'mixed'
                    ? `${Math.max(1, Math.round((47 * carbScale) / 25))}x gel`
                    : isFr
                    ? `${Math.max(2, Math.round(4 * carbScale))} portions`
                    : `${Math.max(2, Math.round(4 * carbScale))} pieces`,
                carbsGrams: Math.max(18, Math.round(47 * carbScale)),
                proteinGrams: pref === 'mixed' ? 0 : 1,
                fatsGrams: 0,
                kcals: Math.max(75, Math.round(192 * carbScale)),
                notes: isFr ? 'Énergie progressive et coup de boost dans les côtes.' : 'Steady release plus quick boost for climbs and headwinds.',
                isRealFoodVerified: pref !== 'mixed',
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
