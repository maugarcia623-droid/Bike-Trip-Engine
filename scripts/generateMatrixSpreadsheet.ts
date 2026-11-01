import * as fs from 'fs';
import * as path from 'path';

interface ChipMatrixRow {
  archetype: string;
  chipId: string;
  labelEn: string;
  labelFr: string;
  iconName: string;
  colorKey: string;
  physicsImpact: string;
  timelineImpact: string;
  checklistImpact: string;
  nutritionImpact: string;
  bannerImpact: string;
}

const MATRIX_DATA: ChipMatrixRow[] = [
  // ── COMMUTE ──
  {
    archetype: 'COMMUTE',
    chipId: 'coffee-stop',
    labelEn: 'Coffee stop',
    labelFr: 'Pause café',
    iconName: 'Coffee',
    colorKey: 'amber',
    physicsImpact: 'Buffer: +15m; Route delay: +15m',
    timelineImpact: 'Injects "commute-coffee-pause" at ~35% ride time (15-min scheduled espresso & pastry pause en route)',
    checklistImpact: 'Injects [Logistics] "Compact cafe frame lock & contactless payment for coffee pause"',
    nutritionImpact: 'Phase 2: Specialty Roastery Espresso & Pastry (~320 kcal, double espresso + almond pastry)',
    bannerImpact: 'Coffee stop buffer & morning espresso waypoint protocol'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'night-ride',
    labelEn: 'Night ride',
    labelFr: 'Trajet nocturne',
    iconName: 'Moon',
    colorKey: 'blue',
    physicsImpact: 'Buffer: +10m; Route delay: min 10m',
    timelineImpact: 'Upgrades rollout to "Night Ride Clearance & 800+ lm Check" (high beam lumens verification, hi-vis sash, radar armed)',
    checklistImpact: 'Injects [Mechanics, Critical] "High-beam headlight (800+ lumens) fully charged & rear flasher" + [Gear, Critical] "Reflective sash/vest & reflective ankle bands"',
    nutritionImpact: 'Emphasizes pre-ride wakefulness ignition & warm hydration',
    bannerImpact: 'High-output lighting mandate & nighttime transit caution buffer'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'fitness-boost',
    labelEn: 'Fitness boost',
    labelFr: 'Boost cardio / tempo',
    iconName: 'Zap',
    colorKey: 'rose',
    physicsImpact: 'Target speed: min 30.5 km/h',
    timelineImpact: 'Upgrades transit to "Tempo Cadence & Cardio Surge Sector" (sustained Zone 3 ~260W to turn commute into structured workout)',
    checklistImpact: 'Standard aero commute cockpit check',
    nutritionImpact: 'Phase 2: Sustained Zone 3 Tempo Fueling (650ml 50/50 juice bidon + fruit chew to sustain 260W without fading)',
    bannerImpact: 'Elevates speed targets & sustained threshold aerobic power'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'hill-climb',
    labelEn: 'Hill climb',
    labelFr: 'Passage de côtes',
    iconName: 'Mountain',
    colorKey: 'orange',
    physicsImpact: 'Buffer: +8m; Gradient: 3.5%',
    timelineImpact: 'Factors climbing grade resistance, low-gear cadence (85-90 RPM), and gradient margin into countdown',
    checklistImpact: 'Low-ratio climbing gears & chain wax bite verified',
    nutritionImpact: 'Accelerated hourly carbohydrate burning model factoring incline mechanical resistance',
    bannerImpact: 'Climbing gradient pacing & bridge incline buffer'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'shower-locker',
    labelEn: 'Locker & Shower',
    labelFr: 'Vestiaire & douche',
    iconName: 'Droplets',
    colorKey: 'teal',
    physicsImpact: 'Buffer: +15m; Shower: 12m; Locker refuel: 10m',
    timelineImpact: 'Dedicates 12m shower + 10m locker reload window before shift start time',
    checklistImpact: 'Injects [Gear, Critical] "Microfiber quick-dry towel, toiletries & fresh change of clothes in dry bag"',
    nutritionImpact: 'Phase 3: Immediate Locker Bay Protein Window (25g protein, 200g Skyr consumed immediately upon locker bay entry before shower)',
    bannerImpact: 'Strict locker room transit protocol ahead of desk presence'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'bad-weather-prep',
    labelEn: 'Rain & Splash guard',
    labelFr: 'Équipement pluie & garde-boue',
    iconName: 'CloudRain',
    colorKey: 'sky',
    physicsImpact: 'Buffer: +6m; Gear weight: +0.8 kg',
    timelineImpact: 'Wet road deceleration caution buffer added to rollout countdown',
    checklistImpact: 'Injects [Gear, Critical] "Full mudguards inspected & Gore-Tex Shakedry rain shell stowed"',
    nutritionImpact: 'Thermoregulation fuel & electrolyte hydration against rain cooling',
    bannerImpact: 'Wet pavement traction buffer & waterproof shell pack readiness'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'bike-lane-priority',
    labelEn: 'Protected bike path',
    labelFr: 'Piste cyclable protégée',
    iconName: 'Shield',
    colorKey: 'emerald',
    physicsImpact: 'Route delay: -2m (min 5m)',
    timelineImpact: 'Pacing calibrated for segregated cycleways and pedestrian crossing interactions',
    checklistImpact: 'Audible bell & courtesy greenway passing check',
    nutritionImpact: 'Steady commuter carbohydrate grazing',
    bannerImpact: 'Segregated cycle track routing & greenway intersection navigation'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'rush-hour-buffer',
    labelEn: 'Rush hour buffer',
    labelFr: 'Marge heure de pointe',
    iconName: 'Clock',
    colorKey: 'purple',
    physicsImpact: 'Buffer: +12m; Route delay: +8m',
    timelineImpact: 'Upgrades gate arrival step to "Arrival with Peak Rush Buffer (+12m)" factoring bridge chokepoint transit density',
    checklistImpact: 'High-security parking lock verified',
    nutritionImpact: 'Clean glycogen base for stop-and-go acceleration efficiency',
    bannerImpact: 'Peak bridge transit density buffer & gate arrival guarantee'
  },
  {
    archetype: 'COMMUTE',
    chipId: 'cargo-laptop-pack',
    labelEn: 'Laptop & office cargo',
    labelFr: 'Sacoche ordi & bagages',
    iconName: 'Briefcase',
    colorKey: 'lime',
    physicsImpact: 'Gear weight: min 4.5 kg (+3.5 kg payload)',
    timelineImpact: 'Rollout step verifies 15" work laptop secured in IPX6 waterproof pannier',
    checklistImpact: 'Injects [Gear, Critical] "15\\" Work laptop inside IPX6 waterproof dry sleeve & USB-C charger"',
    nutritionImpact: 'Commuter breakfast and desk-side energy staging',
    bannerImpact: 'Work electronics payload mass factored into total rolling resistance'
  },

  // ── BIKEPACKING ──
  {
    archetype: 'BIKEPACKING',
    chipId: 'leisure-cruise',
    labelEn: 'Leisure cruise',
    labelFr: 'Croisière loisir',
    iconName: 'Sun',
    colorKey: 'emerald',
    physicsImpact: 'Target speed: capped at 20 km/h',
    timelineImpact: 'Pacing calibrated for recovery and daylight cushion before bivouac curfew',
    checklistImpact: 'Daylight touring comfort items & sunglasses',
    nutritionImpact: 'All-day relaxed grazing, whole food nuts and dried fruits',
    bannerImpact: 'Gentle cadence prioritizing daylight cushion & stint limits'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'mountain-adventure',
    labelEn: 'Mountain adventure',
    labelFr: 'Aventure montagne',
    iconName: 'Mountain',
    colorKey: 'orange',
    physicsImpact: 'Gear weight: 12.0 kg; Crr: 0.0075 (rough mountain trail)',
    timelineImpact: 'Injects "bp-mountain-col-clearance" at 45% time (Alpine Col Clearance & Brake Pad Check); Arrival step anchors to Mountain Bivouac Dusk Curfew (19:30)',
    checklistImpact: 'Injects [Mechanics, Critical] "High-mountain tubeless plug darts, spare brake pads & CO2 canisters" + [Gear, Critical] "Offline topographic GPS trail maps & emergency contacts"',
    nutritionImpact: 'Phase 1: Alpine Morning Pre-Load (~750 kcal oatmeal + nut butter), Phase 2: Steep Pitches Grazing (55–65g/h carbs + sodium), Phase 3: Mountain Bivouac High-Calorie Camp Stew (~1,100 kcal freeze-dried chili stew + dark chocolate)',
    bannerImpact: 'High-altitude loaded packs, rough trail friction & pre-dusk curfew'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'speed-challenge',
    labelEn: 'Speed challenge',
    labelFr: 'Défi vitesse',
    iconName: 'Timer',
    colorKey: 'rose',
    physicsImpact: 'Target speed: 26 km/h; CdA: 0.36; Gear weight: 6.5 kg',
    timelineImpact: 'Resupply stops capped to 10 min max; sustained 210W+ endurance power floor',
    checklistImpact: 'Ultralight race kit, fast repair darts & mini pump',
    nutritionImpact: 'Rapid-flow liquid carbs (60g/h), minimal stoppage rations',
    bannerImpact: 'Ultra-distance race pacing & stripped luggage aerodynamics'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'scenic-route',
    labelEn: 'Scenic route',
    labelFr: 'Route panoramique',
    iconName: 'Compass',
    colorKey: 'lime',
    physicsImpact: 'Buffer: +15m; Target speed: 21 km/h; Route delay: +15m',
    timelineImpact: 'Allocates scheduled photography and scenic overlook contemplation pauses',
    checklistImpact: 'Camera mount, scenic trail map & lens wipes',
    nutritionImpact: 'Scenic viewpoint trail mix and local bakery pastry stops',
    bannerImpact: 'Scenic corridor sightseeing & landmark photo stops'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'bivouac-camp',
    labelEn: 'Wild bivouac',
    labelFr: 'Bivouac sauvage',
    iconName: 'Tent',
    colorKey: 'amber',
    physicsImpact: 'Gear weight: min 10.5 kg',
    timelineImpact: 'Camp step upgrades to "Wild Bivouac: Leave-No-Trace & Gravity Filter" (pitch shelter before 19:30 curfew)',
    checklistImpact: 'Injects [Gear, Critical] "Ultralight bivouac shelter, insulated sleeping pad & water filter flask"',
    nutritionImpact: 'Phase 3: Wild Bivouac Feast & Filtered Water (gravity-filtered water, camp stove stew packed with slow carbs & complete proteins)',
    bannerImpact: 'Self-sufficient wild camping with leave-no-trace protocol'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'resupply-points',
    labelEn: 'Food & Water resupply',
    labelFr: 'Ravitaillement eau & vivres',
    iconName: 'UtensilsCrossed',
    colorKey: 'blue',
    physicsImpact: 'Buffer: +12m; Route delay: +12m',
    timelineImpact: 'Injects "bp-resupply-stop" at ~35% time (Village Bakery & Spring Water Resupply, 2L water top-off, fresh bread, dried fruit)',
    checklistImpact: 'Dual water bladders & cash/card for village bakeries',
    nutritionImpact: 'Phase 2: Village Bakery & Fresh Resupply Grazing (spiced honey cake, fresh bananas, spring fountain water)',
    bannerImpact: 'Water consumption intervals & bakery resupply stops'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'gravel-trail-master',
    labelEn: 'Off-grid trail sector',
    labelFr: 'Sentier hors-piste',
    iconName: 'Navigation',
    colorKey: 'teal',
    physicsImpact: 'Buffer: +12m; Crr: 0.0078 (unpaved dirt friction)',
    timelineImpact: 'Cockpit check upgrades to "Off-Grid Trail Pressure & Tubeless Dart Check" (pressure lowered to 2.4 bar)',
    checklistImpact: 'Injects [Mechanics, Critical] "Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted"',
    nutritionImpact: 'Digestion-friendly trail fuel (chews, electrolytes) adapted to heavy bike vibration',
    bannerImpact: 'Unpaved trail rolling friction & off-grid navigation buffer'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'solar-power-recharge',
    labelEn: 'Power bank reserve',
    labelFr: 'Batterie & réserve énergie',
    iconName: 'BatteryCharging',
    colorKey: 'purple',
    physicsImpact: 'Gear weight: +0.6 kg',
    timelineImpact: 'Evening camp routine stages recharging GPS computer, front light and phone via 20,000mAh battery',
    checklistImpact: 'Injects [Gear, Critical] "Rugged 20,000mAh battery pack & weatherproof charging cables"',
    nutritionImpact: 'Camp power autonomy staging',
    bannerImpact: '48h+ off-grid electronics navigation & illumination redundancy'
  },
  {
    archetype: 'BIKEPACKING',
    chipId: 'emergency-first-aid',
    labelEn: 'Emergency first aid kit',
    labelFr: 'Trousse premiers secours',
    iconName: 'HeartPulse',
    colorKey: 'rose',
    physicsImpact: 'Gear weight: +0.4 kg',
    timelineImpact: 'Pre-flight check verifies wilderness medical supplies and satellite beacon check-in',
    checklistImpact: 'Injects [Gear, Critical] "Wilderness trauma kit: sterile dressings, antiseptic & space blanket"',
    nutritionImpact: 'Emergency electrolyte bouillon & calorie reserve',
    bannerImpact: 'Wilderness trauma readiness & satellite emergency protocol'
  },

  // ── SPORT ──
  {
    archetype: 'SPORT',
    chipId: 'off-road-exploration',
    labelEn: 'Off-road exploration',
    labelFr: 'Exploration hors-piste',
    iconName: 'Navigation',
    colorKey: 'orange',
    physicsImpact: 'Crr: 0.0070 (gravel/dirt resistance)',
    timelineImpact: 'Pacing adapted for gravel tracks, forest trails and rough tarmac transitions',
    checklistImpact: 'Injects [Mechanics, Critical] "Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted"',
    nutritionImpact: 'High-vibration stomach comfort fueling',
    bannerImpact: 'Off-road rolling resistance & gravel tire pressure vigilance'
  },
  {
    archetype: 'SPORT',
    chipId: 'family-friendly',
    labelEn: 'Family-friendly',
    labelFr: 'Sortie conviviale',
    iconName: 'Smile',
    colorKey: 'emerald',
    physicsImpact: 'Target speed: capped at 19 km/h; Route delay: min 12m',
    timelineImpact: 'Pacing ceiling at 19 km/h with scheduled regroups every 10–15 km on car-free greenways',
    checklistImpact: 'Peloton safety bell & shared-path courtesy',
    nutritionImpact: 'Natural whole-food energy bites, fruit bars and hydration',
    bannerImpact: 'Accessible group pace & frequent regroup pauses'
  },
  {
    archetype: 'SPORT',
    chipId: 'eco-friendly-path',
    labelEn: 'Eco-friendly path',
    labelFr: 'Voie verte & éco',
    iconName: 'Leaf',
    colorKey: 'lime',
    physicsImpact: 'Target speed: 22 km/h (shared path limit: 20 km/h)',
    timelineImpact: 'Nature reserve 20 km/h courtesy speed limit respected on shared greenway sectors',
    checklistImpact: 'Zero single-use plastics mandate & reusable packaging check',
    nutritionImpact: 'Organic bulk trail mix, dried fruit and reusable bottles',
    bannerImpact: 'Zero-waste & ecological reserve greenway rules'
  },
  {
    archetype: 'SPORT',
    chipId: 'urban-discovery',
    labelEn: 'Urban discovery',
    labelFr: 'Découverte urbaine',
    iconName: 'Building2',
    colorKey: 'blue',
    physicsImpact: 'Route delay: 14m',
    timelineImpact: 'City traffic lights and pedestrian zone stops factored into stage finish time',
    checklistImpact: 'High-security bicycle lock & urban bell',
    nutritionImpact: 'Urban roastery espresso & quick carbohydrate fuel',
    bannerImpact: 'City signalization stops & pedestrian zone protocol'
  },
  {
    archetype: 'SPORT',
    chipId: 'paceline-drafting',
    labelEn: 'Paceline & Drafting',
    labelFr: 'Peloton & relais',
    iconName: 'Users',
    colorKey: 'purple',
    physicsImpact: 'Target speed: 33 km/h; CdA: -15% drag reduction (min 0.28)',
    timelineImpact: 'Injects "sport-paceline-echelon" at 60% time (Paceline Echelon Rotations, 20-30s pulls at 33 km/h with 15-20% watt savings)',
    checklistImpact: 'Injects [Gear, Critical] "Rear Garmin Varia radar charged & peloton hand signals briefed"',
    nutritionImpact: 'Rapid-intake on-the-wheel fuel (liquid carbs & gels without hands-off-bars hazard)',
    bannerImpact: 'Organized paceline rotation reducing aerodynamic drag by 15-20%'
  },
  {
    archetype: 'SPORT',
    chipId: 'interval-training',
    labelEn: 'Threshold intervals',
    labelFr: 'Fractionné au seuil',
    iconName: 'Flame',
    colorKey: 'rose',
    physicsImpact: 'Target speed: min 32 km/h; Target power: 310W+',
    timelineImpact: 'Injects "sport-threshold-intervals" at 35% time (Threshold VO2max Interval Sets, holding 310W+ at 95-100 RPM)',
    checklistImpact: 'Injects [Gear] "Structured threshold interval workout synced to GPS head unit"',
    nutritionImpact: 'High-rate glycogen oxidation fueling (~80g/h fast-acting carbs & electrolytes)',
    bannerImpact: 'Structured sweetspot/VO2max intervals & accelerated carbohydrate burn'
  },
  {
    archetype: 'SPORT',
    chipId: 'climbing-kom-hunt',
    labelEn: 'KOM & Hill repeats',
    labelFr: 'Chasse aux cols & KOM',
    iconName: 'Trophy',
    colorKey: 'amber',
    physicsImpact: 'Buffer: +8m; Gradient: 4.2%; Surge power: 380W',
    timelineImpact: 'Injects "sport-kom-repeats" at 40% time (KOM Segment Attacks & Ridge Climbs, punchy 380W+ surges & aero descents)',
    checklistImpact: 'Injects [Mechanics, Critical] "Low-ratio climbing cog checked (32/34T) & freshly waxed chain"',
    nutritionImpact: 'Phase 2: High-Rate Glycogen for Punchy Climbs (Rapid isotonic gels prior to ramps to prevent bonking at 380W+)',
    bannerImpact: 'Segment sprints, steep punchy climbs & aggressive power surges'
  },
  {
    archetype: 'SPORT',
    chipId: 'hydration-electrolytes',
    labelEn: 'High-carb fueling (90g/h)',
    labelFr: 'Hydratation & 90g glucides/h',
    iconName: 'Droplets',
    colorKey: 'teal',
    physicsImpact: 'Target speed: min 31 km/h; Target carbs: 80-90 g/h',
    timelineImpact: 'Mid-ride fuel step upgrades to "High-Carb Pacing (80-90g/hr) & Electrolytes" (dual maltodextrin/fructose in bidons + 750mg sodium)',
    checklistImpact: 'Injects [Nutrition, Critical] "High-concentration carb drink mix (80-90g/hr) & sodium salt tabs"',
    nutritionImpact: 'Phase 2: Dual-Source Carb & Sodium Protocol (1:0.8 maltodextrin/fructose + 750mg sodium/L, 85g/h ~340 kcal/h for maximum gut absorption)',
    bannerImpact: 'Scientific sports fueling: 60-90g/h maltodextrin/fructose & sodium reload'
  },
  {
    archetype: 'SPORT',
    chipId: 'fast-group-ride',
    labelEn: 'Chain gang peloton',
    labelFr: 'Sortie rapide peloton',
    iconName: 'Zap',
    colorKey: 'sky',
    physicsImpact: 'Target speed: 34 km/h',
    timelineImpact: 'Applies peloton pace standards (33-36 km/h on flats) and group safety turnaround checkpoints',
    checklistImpact: 'Injects [Gear, Critical] "Rear Garmin Varia radar charged & peloton hand signals briefed"',
    nutritionImpact: 'High-speed liquid nutrition & post-ride team recovery protocol',
    bannerImpact: 'High-tempo Saturday club ride standards & echelon safety'
  },

  // ── ESCAPADE ──
  {
    archetype: 'ESCAPADE',
    chipId: 'historical-tour',
    labelEn: 'Historical tour',
    labelFr: 'Circuit historique',
    iconName: 'Landmark',
    colorKey: 'amber',
    physicsImpact: 'Buffer: +20m; Route delay: +20m',
    timelineImpact: 'Injects "esc-historical-chateau" at 35% time (Château & Heritage Site Visit, 30 min secure bike lockup & walking tour)',
    checklistImpact: 'Injects [Logistics] "Comfortable walking shoes & secure bike lock for monuments"',
    nutritionImpact: 'Heritage pause hydration and regional pastry tasting',
    bannerImpact: 'Castles, heritage sites, and guided walking pauses along route'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'picnic-outing',
    labelEn: 'Picnic outing',
    labelFr: 'Sortie pique-nique',
    iconName: 'Utensils',
    colorKey: 'orange',
    physicsImpact: 'Gear weight: min 5.5 kg (cooler & food payload)',
    timelineImpact: 'Injects "esc-picnic-lunch" at 50% time (Waterside Scenic Picnic Lunch, 45-min pause for local sourdough, farm cheese & fresh fruit)',
    checklistImpact: 'Injects [Gear, Critical] "Insulated picnic pannier with fresh provisions, cutlery & folding knife"',
    nutritionImpact: 'Phase 2: Artisanal Waterside Picnic Feast (~650 kcal crusty sourdough baguette, local goat cheese, avocado, fresh tomatoes, figs & chilled spring water)',
    bannerImpact: 'Scenic waterside lunch break with insulated pannier payload'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'long-distance-endurance',
    labelEn: 'Long-distance endurance',
    labelFr: 'Endurance longue distance',
    iconName: 'Gauge',
    colorKey: 'blue',
    physicsImpact: 'Target speed: 24 km/h',
    timelineImpact: 'Dawn departure calibrated to secure evening hotel check-in deadline (18:00) over 60+ km touring',
    checklistImpact: 'Dual 650ml bidons, spare tubes & hotel confirmation booking',
    nutritionImpact: 'Steady 45g/h cruising carbohydrates and early hotel arrival hydration',
    bannerImpact: 'Dawn departure to secure evening hotel check-in over 60+ km touring'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'photography-spots',
    labelEn: 'Photography spots',
    labelFr: 'Spots photo',
    iconName: 'Camera',
    colorKey: 'sky',
    physicsImpact: 'Buffer: +15m; Gear weight: min 5.0 kg',
    timelineImpact: 'Injects "esc-golden-hour-photo" at 75% time (Golden Hour Scenic Photography Stop, 15m pause for evening low-light panoramas)',
    checklistImpact: 'Injects [Gear] "Handlebar weatherproof camera bag, lens cloth & spare battery"',
    nutritionImpact: 'Golden hour scenic hydration & pocket snack',
    bannerImpact: 'Golden hour arrival timing sync & handlebar camera bag payload'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'spa-wellness',
    labelEn: 'Hotel spa & recovery',
    labelFr: 'Spa hôtel & récupération',
    iconName: 'Sparkles',
    colorKey: 'purple',
    physicsImpact: 'Buffer: +20m; Locker/relax: 20m',
    timelineImpact: 'Freshen-up step upgrades to "Thermal Spa, Sauna & Muscle Recovery" (45m hot soak to release muscle fatigue before dinner)',
    checklistImpact: 'Injects [Gear] "Swimsuit, sandals & recovery compression socks for thermal spa"',
    nutritionImpact: 'Phase 3: Spa Detox Hydration & Restorative Dinner (magnesium mineral water & herbal tea after thermal bath, followed by light omega-3 dinner)',
    bannerImpact: 'Post-ride thermal spa session, sauna and rehydration protocol'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'local-gastronomy',
    labelEn: 'Wine & Gastronomy',
    labelFr: 'Terroir & gastronomie',
    iconName: 'Wine',
    colorKey: 'rose',
    physicsImpact: 'Buffer: +10m; Route delay: +10m',
    timelineImpact: 'Town explore step upgrades to "Regional Gastronomy & Terroir Dining" (Table booked for 19:45, local wine pairings, regional farm-to-table cuisine)',
    checklistImpact: 'Injects [Gear] "Padded bottle protective sleeves for pannier wine transport"',
    nutritionImpact: 'Phase 3: Evening Vineyard Dining & Terroir Table (~850 kcal seasonal cuisine, regional wine tasting, and relaxed glycogen recovery)',
    bannerImpact: 'Scheduled evening culinary dining reservation and vineyard stops'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'scenic-waterways',
    labelEn: 'Canal & Coastline paths',
    labelFr: 'Canaux & voies côtières',
    iconName: 'Waves',
    colorKey: 'teal',
    physicsImpact: 'Target speed: capped at 22 km/h',
    timelineImpact: 'Smooth low-friction towpath pacing along riverbanks and scenic coastal dykes',
    checklistImpact: 'Waterway navigation & anti-glare sunglasses',
    nutritionImpact: 'River towpath steady hydration & pocket fuel',
    bannerImpact: 'Waterway & coastal towpath protocol with flat smooth pacing'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'bed-and-breakfast',
    labelEn: 'Charming B&B check-in',
    labelFr: 'Accueil chambre d’hôtes',
    iconName: 'Bed',
    colorKey: 'lime',
    physicsImpact: 'Target arrival: 17:30',
    timelineImpact: 'Aligns arrival timing with host greeting window at 17:30 and indoor courtyard lockup',
    checklistImpact: 'Host contact details & secure bike courtyard lock',
    nutritionImpact: 'Regional homemade breakfast staging & host greeting refreshment',
    bannerImpact: 'Bed & Breakfast greeting window and secure indoor courtyard lockup'
  },
  {
    archetype: 'ESCAPADE',
    chipId: 'cultural-audio-guide',
    labelEn: 'Cultural audio tour',
    labelFr: 'Guide audio & patrimoine',
    iconName: 'Headphones',
    colorKey: 'emerald',
    physicsImpact: 'Buffer: +15m; Route delay: +15m',
    timelineImpact: 'Waypoint listening pauses for architectural stories and local heritage episodes',
    checklistImpact: 'Bluetooth earbuds & offline audio guide episodes',
    nutritionImpact: 'Audio waypoint hydration pauses',
    bannerImpact: 'Cultural audio tour stops and architectural landmark exploration'
  }
];

// 1. Generate CSV spreadsheet
function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvHeaders = [
  'Archetype',
  'Chip ID',
  'Label (EN)',
  'Label (FR)',
  'Icon',
  'Color Style',
  'Physics & Telemetry Impact',
  'Reverse Timeline Milestones Impact',
  'Readiness Checklist Impact',
  'Real-Food Nutrition Bento Impact',
  'Contextual Banner Directive'
];

const csvRows = MATRIX_DATA.map((row) => [
  escapeCsv(row.archetype),
  escapeCsv(row.chipId),
  escapeCsv(row.labelEn),
  escapeCsv(row.labelFr),
  escapeCsv(row.iconName),
  escapeCsv(row.colorKey),
  escapeCsv(row.physicsImpact),
  escapeCsv(row.timelineImpact),
  escapeCsv(row.checklistImpact),
  escapeCsv(row.nutritionImpact),
  escapeCsv(row.bannerImpact)
].join(','));

const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

const csvWorkspacePath = path.resolve(
  '/Users/mau/Documents/📑 All Documents/[1] 🙎🏻‍♂️ Mauricio/2026/Perso/Antigravity Folder 1/flight_deck_chips_reference_matrix.csv'
);
fs.writeFileSync(csvWorkspacePath, csvContent, 'utf-8');
console.log(`[CSV Generated] ${csvWorkspacePath} (${MATRIX_DATA.length} chips)`);

// 2. Generate Markdown Artifact
const artifactDir = '/Users/mau/.gemini/antigravity/brain/ad4bb82a-53b6-4c93-aa08-dc1012c3f2ba';
const artifactPath = path.join(artifactDir, 'flight_deck_chip_matrix.md');

let mdContent = `# Flight Deck Customization Matrix: 36 Archetype Chips Reference

> [!NOTE]
> This master spreadsheet documents how **all 36 customizable preset chips** correlate to the 4 Flight Deck command modules:
> 1. **Reverse Commute Timeline** (\`ReverseTimelineBento\`)
> 2. **Readiness Checklist** (\`PreFlightChecklistBento\`)
> 3. **Real-Food Nutrition Bento** (\`NutritionBento\`)
> 4. **Contextual Directive Banner** (\`TimelineContextualBanner\`)
>
> 📥 **Downloadable CSV SpreadSheet File:** [flight_deck_chips_reference_matrix.csv](file://${csvWorkspacePath})

---

## Summary Overview by Archetype

| Archetype | Chips Count | Primary Focus | Key Flight Deck Interventions |
| :--- | :---: | :--- | :--- |
| **COMMUTE** | 9 | Punctuality, traffic margins, office hygiene & cargo | Cafe pauses, 800lm night checks, tempo surges, shower/skyr timing, waterproof laptop sleeves |
| **BIKEPACKING** | 9 | Self-sufficiency, alpine terrain, bivouac curfews & battery reserves | Alpine col clearance, leave-no-trace shelter pitch, high-altitude stews, tubeless repair plugs |
| **SPORT** | 9 | Watts, aerodynamic drafting, high-rate glycogen & KOM segments | Paceline echelons (33 km/h), 310W+ intervals, 380W+ KOM surges, 80-90g/h dual carb bidons |
| **ESCAPADE** | 9 | Leisure, scenic dwell, gourmet dining & hospitality | 45m waterside picnics, château heritage pauses, vineyard dinners, thermal spa recovery |

---

`;

const archetypes = ['COMMUTE', 'BIKEPACKING', 'SPORT', 'ESCAPADE'];

for (const arch of archetypes) {
  const chips = MATRIX_DATA.filter((c) => c.archetype === arch);
  mdContent += `\n## Archetype: ${arch} (${chips.length} Chips)\n\n`;
  mdContent += `| Chip | Presets & Physics | Reverse Timeline Milestones | Readiness Checklist Items | Nutrition Bento Protocol | Contextual Banner Directive |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const c of chips) {
    mdContent += `| **${c.labelEn}**<br>_(${c.labelFr})_<br>\`${c.chipId}\` | ${c.physicsImpact.replace(/;/g, '<br>')} | ${c.timelineImpact} | ${c.checklistImpact} | ${c.nutritionImpact} | ${c.bannerImpact} |\n`;
  }
}

fs.writeFileSync(artifactPath, mdContent, 'utf-8');
console.log(`[Artifact Generated] ${artifactPath}`);
