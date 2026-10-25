import { NutritionPhase } from '../types/trip';

/**
 * Returns the exact 4-phase Real-Food Nutrition Protocol
 * adhering strictly to the rule: NO POWDERS / NO MILK / NO BANANAS.
 */
export function getRealFoodNutritionPlan(
  lockerArrivalTime: string = '08:30',
  breakRoomTime: string = '08:50',
  departureTime: string = '07:35'
): NutritionPhase[] {
  return [
    {
      phaseId: 'pre-ride',
      title: 'Pre-Ride Ignition',
      timeWindow: `${subtractMinutesFromTime(departureTime, 45)} – ${departureTime}`,
      location: 'Home Kitchen',
      rules: 'High glycemic fast carbs, zero dairy fats, high gastro-comfort. Complete 35-45m prior to rollout.',
      items: [
        {
          name: 'Toasted White Baguette / Country Loaf',
          quantity: '75g (2 thick slices)',
          carbsGrams: 41,
          proteinGrams: 6,
          fatsGrams: 1,
          kcals: 200,
          notes: 'Rapid gastric emptying, zero resistant fiber.',
          isRealFoodVerified: true,
        },
        {
          name: 'Pure Acacia or Wildflower Honey',
          quantity: '25g (1.5 tbsp)',
          carbsGrams: 21,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 85,
          notes: '50/50 glucose-fructose ratio for cellular uptake.',
          isRealFoodVerified: true,
        },
        {
          name: 'Double Ristretto / Espresso',
          quantity: '60ml (2 shots)',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 5,
          notes: '~140mg caffeine, adenosine blocker, fatty acid mobilization.',
          isRealFoodVerified: true,
        },
        {
          name: 'Spring Water with Pinch of Celtic Salt',
          quantity: '300ml',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 0,
          notes: 'Pre-hydration volume with trace electrolytes.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'on-bike',
      title: 'On-Bike Real-Food Fueling',
      timeWindow: 'Rollout to Arrival (sip every 15-20 min)',
      location: 'On Route / Cockpit',
      rules: 'NO engineered powders, NO sticky maltodextrin. Pure whole food sugars.',
      items: [
        {
          name: '50/50 Water & 100% Pressed Apple/Grape Juice',
          quantity: '650ml bidon',
          carbsGrams: 36,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 145,
          notes: 'Isotonic ~6% natural carbohydrate solution, effortless stomach transit.',
          isRealFoodVerified: true,
        },
        {
          name: 'Medjool Dates (Pitted)',
          quantity: '2 plump dates (48g)',
          carbsGrams: 34,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 135,
          notes: 'Rich in natural potassium, melt-in-mouth chewability.',
          isRealFoodVerified: true,
        },
        {
          name: 'Sun-Dried Turkish Figs',
          quantity: '2 pieces (38g)',
          carbsGrams: 24,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 100,
          notes: 'Crunchy crunch seeds, steady sustained glycemic release.',
          isRealFoodVerified: true,
        },
        {
          name: 'Artisanal Pâte de Fruits (Fruit Pastes)',
          quantity: '2 squares (30g)',
          carbsGrams: 23,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 92,
          notes: 'Fruit pectin + sucrose burst for headwind segments.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'locker-refuel',
      title: 'Phase 1: Locker Refuel',
      timeWindow: `${lockerArrivalTime} – ${addMinutesToTime(lockerArrivalTime, 10)}`,
      location: 'Basement Locker Bay (Post-Gate 17)',
      rules: 'Immediate post-effort anabolic window. Zero blender noise, eaten directly at locker bench.',
      items: [
        {
          name: 'Skyr 0% Natural (Thick Icelandic Strained)',
          quantity: '200g tub',
          carbsGrams: 8,
          proteinGrams: 22,
          fatsGrams: 0,
          kcals: 120,
          notes: 'Lactose-strained pure casein & whey matrix, spoonable without mess.',
          isRealFoodVerified: true,
        },
        {
          name: '100% Pure Dark Concord Grape Juice',
          quantity: '250ml flask',
          carbsGrams: 38,
          proteinGrams: 1,
          fatsGrams: 0,
          kcals: 155,
          notes: 'High glycemic index spiked insulin for rapid glycogen synthase recharge.',
          isRealFoodVerified: true,
        },
      ],
    },
    {
      phaseId: 'break-room',
      title: 'Phase 2: Break Room Breakfast',
      timeWindow: `${breakRoomTime} – ${addMinutesToTime(breakRoomTime, 15)}`,
      location: '3rd Floor Dedicated Break Room',
      rules: 'STRICT OFFICE POLICY: Absolutely no eating at desks or in open-space. Sit at break room counter.',
      items: [
        {
          name: 'Oat Milk Overnight Oats with Chia',
          quantity: '250g jar',
          carbsGrams: 42,
          proteinGrams: 8,
          fatsGrams: 6,
          kcals: 255,
          notes: 'Beta-glucan complex fibers soaked overnight in barista oat milk.',
          isRealFoodVerified: true,
        },
        {
          name: '1 Whole Crisp Grated Granny Smith Apple',
          quantity: '140g',
          carbsGrams: 19,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 75,
          notes: 'Tart malic acid freshness, pectin, enzymes.',
          isRealFoodVerified: true,
        },
        {
          name: 'Lightly Crushed Raw Walnuts',
          quantity: '20g',
          carbsGrams: 3,
          proteinGrams: 3,
          fatsGrams: 13,
          kcals: 130,
          notes: 'Omega-3 ALA anti-inflammatory neuro-protection.',
          isRealFoodVerified: true,
        },
        {
          name: '1/2 Fresh Baguette Sandwich (Turkey or Avocado)',
          quantity: '100g half sandwich',
          carbsGrams: 36,
          proteinGrams: 14,
          fatsGrams: 5,
          kcals: 245,
          notes: 'Savory satiation and slow-release starch for full morning focus.',
          isRealFoodVerified: true,
        },
        {
          name: 'Fresh Office Filter Coffee or Long Black',
          quantity: '200ml mug',
          carbsGrams: 0,
          proteinGrams: 0,
          fatsGrams: 0,
          kcals: 2,
          notes: 'Second phase alertness boost before 09:00 standup.',
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
