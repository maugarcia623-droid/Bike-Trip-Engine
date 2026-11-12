import React from 'react';
import {
  Coffee as PhCoffee,
  Moon as PhMoon,
  Lightning as PhLightning,
  Mountains as PhMountains,
  Drop as PhDrop,
  CloudRain as PhCloudRain,
  Sun as PhSun,
  Timer as PhTimer,
  Compass as PhCompass,
  Tent as PhTent,
  ForkKnife as PhForkKnife,
  NavigationArrow as PhNavigationArrow,
  Smiley as PhSmiley,
  Leaf as PhLeaf,
  Buildings as PhBuildings,
  Users as PhUsers,
  Flame as PhFlame,
  Bank as PhBank,
  Gauge as PhGauge,
  Camera as PhCamera,
  Sparkle as PhSparkle,
  Wine as PhWine,
  BatteryCharging as PhBatteryCharging,
  Heartbeat as PhHeartbeat,
  Trophy as PhTrophy,
  Waves as PhWaves,
  Bed as PhBed,
  Headphones as PhHeadphones,
  Clock as PhClock,
  Briefcase as PhBriefcase,
  ShieldCheck as PhShieldCheck,
  Flashlight as PhFlashlight,
  BikeFast as PhBikeFast,
  Flame2 as PhFlame2,
  CloudSun as PhCloudSun,
  IconProps,
} from '@/components/icons';
import { TripProfile, generateTripChecklist } from '../types/trip';
import { getActiveBike, loadRiderBikeSpecs } from './specsStorage';
import { subtractMinutesFromTime } from './nutrition';
import { CHIP_TOKENS, ChipTheme } from '../tokens/chipTokens';

export type ArchetypeMode = 'BIKEPACKING' | 'SPORT' | 'COMMUTE' | 'ESCAPADE';

export type ChipColorKey = ChipTheme;

export interface ChipColorStyle {
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
  border: string;
  darkBorder: string;
  circleBg: string;
  ring: string;
  badgeBg?: string;
  darkBadgeBg?: string;
}

export const CHIP_COLOR_STYLES: Record<ChipColorKey, ChipColorStyle> = {
  amber: {
    bg: CHIP_TOKENS.amber.light.surface,
    darkBg: CHIP_TOKENS.amber.dark.surface,
    text: CHIP_TOKENS.amber.light.primary,
    darkText: CHIP_TOKENS.amber.dark.primary,
    border: CHIP_TOKENS.amber.light.selectedRing,
    darkBorder: CHIP_TOKENS.amber.dark.selectedRing,
    circleBg: 'bg-amber-100 dark:bg-amber-900/40',
    ring: CHIP_TOKENS.amber.selectedRing,
    badgeBg: CHIP_TOKENS.amber.light.surface,
    darkBadgeBg: CHIP_TOKENS.amber.dark.surface,
  },
  blue: {
    bg: CHIP_TOKENS.blue.light.surface,
    darkBg: CHIP_TOKENS.blue.dark.surface,
    text: CHIP_TOKENS.blue.light.primary,
    darkText: CHIP_TOKENS.blue.dark.primary,
    border: CHIP_TOKENS.blue.light.selectedRing,
    darkBorder: CHIP_TOKENS.blue.dark.selectedRing,
    circleBg: 'bg-blue-100 dark:bg-blue-900/40',
    ring: CHIP_TOKENS.blue.selectedRing,
    badgeBg: CHIP_TOKENS.blue.light.surface,
    darkBadgeBg: CHIP_TOKENS.blue.dark.surface,
  },
  purple: {
    bg: CHIP_TOKENS.purple.light.surface,
    darkBg: CHIP_TOKENS.purple.dark.surface,
    text: CHIP_TOKENS.purple.light.primary,
    darkText: CHIP_TOKENS.purple.dark.primary,
    border: CHIP_TOKENS.purple.light.selectedRing,
    darkBorder: CHIP_TOKENS.purple.dark.selectedRing,
    circleBg: 'bg-purple-100 dark:bg-purple-900/40',
    ring: CHIP_TOKENS.purple.selectedRing,
    badgeBg: CHIP_TOKENS.purple.light.surface,
    darkBadgeBg: CHIP_TOKENS.purple.dark.surface,
  },
  emerald: {
    bg: CHIP_TOKENS.emerald.light.surface,
    darkBg: CHIP_TOKENS.emerald.dark.surface,
    text: CHIP_TOKENS.emerald.light.primary,
    darkText: CHIP_TOKENS.emerald.dark.primary,
    border: CHIP_TOKENS.emerald.light.selectedRing,
    darkBorder: CHIP_TOKENS.emerald.dark.selectedRing,
    circleBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    ring: CHIP_TOKENS.emerald.selectedRing,
    badgeBg: CHIP_TOKENS.emerald.light.surface,
    darkBadgeBg: CHIP_TOKENS.emerald.dark.surface,
  },
  orange: {
    bg: CHIP_TOKENS.orange.light.surface,
    darkBg: CHIP_TOKENS.orange.dark.surface,
    text: CHIP_TOKENS.orange.light.primary,
    darkText: CHIP_TOKENS.orange.dark.primary,
    border: CHIP_TOKENS.orange.light.selectedRing,
    darkBorder: CHIP_TOKENS.orange.dark.selectedRing,
    circleBg: 'bg-orange-100 dark:bg-orange-900/40',
    ring: CHIP_TOKENS.orange.selectedRing,
    badgeBg: CHIP_TOKENS.orange.light.surface,
    darkBadgeBg: CHIP_TOKENS.orange.dark.surface,
  },
  teal: {
    bg: CHIP_TOKENS.teal.light.surface,
    darkBg: CHIP_TOKENS.teal.dark.surface,
    text: CHIP_TOKENS.teal.light.primary,
    darkText: CHIP_TOKENS.teal.dark.primary,
    border: CHIP_TOKENS.teal.light.selectedRing,
    darkBorder: CHIP_TOKENS.teal.dark.selectedRing,
    circleBg: 'bg-teal-100 dark:bg-teal-900/40',
    ring: CHIP_TOKENS.teal.selectedRing,
    badgeBg: CHIP_TOKENS.teal.light.surface,
    darkBadgeBg: CHIP_TOKENS.teal.dark.surface,
  },
  lime: {
    bg: CHIP_TOKENS.lime.light.surface,
    darkBg: CHIP_TOKENS.lime.dark.surface,
    text: CHIP_TOKENS.lime.light.primary,
    darkText: CHIP_TOKENS.lime.dark.primary,
    border: CHIP_TOKENS.lime.light.selectedRing,
    darkBorder: CHIP_TOKENS.lime.dark.selectedRing,
    circleBg: 'bg-lime-100 dark:bg-lime-900/40',
    ring: CHIP_TOKENS.lime.selectedRing,
    badgeBg: CHIP_TOKENS.lime.light.surface,
    darkBadgeBg: CHIP_TOKENS.lime.dark.surface,
  },
  sky: {
    bg: CHIP_TOKENS.sky.light.surface,
    darkBg: CHIP_TOKENS.sky.dark.surface,
    text: CHIP_TOKENS.sky.light.primary,
    darkText: CHIP_TOKENS.sky.dark.primary,
    border: CHIP_TOKENS.sky.light.selectedRing,
    darkBorder: CHIP_TOKENS.sky.dark.selectedRing,
    circleBg: 'bg-sky-100 dark:bg-sky-900/40',
    ring: CHIP_TOKENS.sky.selectedRing,
    badgeBg: CHIP_TOKENS.sky.light.surface,
    darkBadgeBg: CHIP_TOKENS.sky.dark.surface,
  },
  rose: {
    bg: CHIP_TOKENS.rose.light.surface,
    darkBg: CHIP_TOKENS.rose.dark.surface,
    text: CHIP_TOKENS.rose.light.primary,
    darkText: CHIP_TOKENS.rose.dark.primary,
    border: CHIP_TOKENS.rose.light.selectedRing,
    darkBorder: CHIP_TOKENS.rose.dark.selectedRing,
    circleBg: 'bg-rose-100 dark:bg-rose-900/40',
    ring: CHIP_TOKENS.rose.selectedRing,
    badgeBg: CHIP_TOKENS.rose.light.surface,
    darkBadgeBg: CHIP_TOKENS.rose.dark.surface,
  },
  'yellow-vest': {
    bg: CHIP_TOKENS['yellow-vest'].light.surface,
    darkBg: CHIP_TOKENS['yellow-vest'].dark.surface,
    text: CHIP_TOKENS['yellow-vest'].light.primary,
    darkText: CHIP_TOKENS['yellow-vest'].dark.primary,
    border: CHIP_TOKENS['yellow-vest'].light.selectedRing,
    darkBorder: CHIP_TOKENS['yellow-vest'].dark.selectedRing,
    circleBg: 'bg-[#faffcb] dark:bg-[#1f2203]/60',
    ring: CHIP_TOKENS['yellow-vest'].selectedRing,
    badgeBg: CHIP_TOKENS['yellow-vest'].light.surface,
    darkBadgeBg: CHIP_TOKENS['yellow-vest'].dark.surface,
  },
};

const createDuotone = (
  Component: React.ComponentType<IconProps>
): React.FC<{ className?: string; size?: number | string; weight?: string }> => {
  return ({ className, size, ...rest }) =>
    React.createElement(Component, { weight: 'duotone', className, size, ...(rest as any) });
};

export const CHIP_ICONS: Record<
  string,
  React.FC<{ className?: string; size?: number | string; weight?: string }>
> = {
  Coffee: createDuotone(PhCoffee),
  Moon: createDuotone(PhMoon),
  Zap: createDuotone(PhLightning),
  Mountain: createDuotone(PhMountains),
  Droplets: createDuotone(PhDrop),
  CloudRain: createDuotone(PhCloudRain),
  Sun: createDuotone(PhSun),
  Timer: createDuotone(PhTimer),
  Compass: createDuotone(PhCompass),
  Tent: createDuotone(PhTent),
  UtensilsCrossed: createDuotone(PhForkKnife),
  Navigation: createDuotone(PhNavigationArrow),
  Smile: createDuotone(PhSmiley),
  Leaf: createDuotone(PhLeaf),
  Building2: createDuotone(PhBuildings),
  Users: createDuotone(PhUsers),
  Flame: createDuotone(PhFlame),
  Landmark: createDuotone(PhBank),
  Utensils: createDuotone(PhForkKnife),
  Gauge: createDuotone(PhGauge),
  Camera: createDuotone(PhCamera),
  Sparkles: createDuotone(PhSparkle),
  Wine: createDuotone(PhWine),
  BatteryCharging: createDuotone(PhBatteryCharging),
  HeartPulse: createDuotone(PhHeartbeat),
  Trophy: createDuotone(PhTrophy),
  Waves: createDuotone(PhWaves),
  Bed: createDuotone(PhBed),
  Headphones: createDuotone(PhHeadphones),
  Clock: createDuotone(PhClock),
  Briefcase: createDuotone(PhBriefcase),
  Shield: createDuotone(PhShieldCheck),
  Flashlight: createDuotone(PhFlashlight),
  BikeFast: createDuotone(PhBikeFast),
  Flame2: createDuotone(PhFlame2),
  CloudSun: createDuotone(PhCloudSun),
};

export interface ChipPresetSetting {
  id: string;
  labelEn: string;
  labelFr: string;
  type: 'time' | 'number' | 'text' | 'boolean' | 'select';
  defaultValue: any;
  options?: { value: string; labelEn: string; labelFr: string }[];
  unit?: string;
}

export interface ArchetypeChipDef {
  id: string;
  labelEn: string;
  labelFr: string;
  archetype: ArchetypeMode;
  iconName: string;
  colorKey: ChipColorKey;
  descriptionEn: string;
  descriptionFr: string;
  ruleTitleEn: string;
  ruleTitleFr: string;
  ruleDescriptionEn: string;
  ruleDescriptionFr: string;
  defaultSettings: Record<string, any>;
  settingsFields: ChipPresetSetting[];
  applyPresets: (prev: TripProfile) => Partial<TripProfile>;
}

export const ARCHETYPE_CHIP_DEFINITIONS: Record<ArchetypeMode, ArchetypeChipDef[]> = {
  COMMUTE: [
    {
      id: 'coffee-stop',
      labelEn: 'Coffee stop',
      labelFr: 'Pause café',
      archetype: 'COMMUTE',
      iconName: 'Coffee',
      colorKey: 'amber',
      descriptionEn: 'Scheduled morning espresso pause along the commute corridor',
      descriptionFr: 'Arrêt café matinal planifié le long du parcours',
      ruleTitleEn: 'Coffee Stop & Cafe Pause',
      ruleTitleFr: 'Pause café & arrêt sur le parcours',
      ruleDescriptionEn: 'Incorporates a dedicated coffee shop dwell time into the reverse timeline countdown.',
      ruleDescriptionFr: 'Intègre une durée d’arrêt café dédiée dans le compte à rebours de départ.',
      defaultSettings: {
        coffeeDurationMin: 15,
        cafeName: '',
        rationType: '',
      },
      settingsFields: [
        {
          id: 'cafeName',
          labelEn: 'Cafe stop location / name',
          labelFr: 'Nom / lieu de la pause café',
          type: 'text',
          defaultValue: '',
        },
        {
          id: 'coffeeDurationMin',
          labelEn: 'Cafe stop duration (min)',
          labelFr: 'Durée de la pause (min)',
          type: 'number',
          defaultValue: 15,
          unit: 'min',
        },
        {
          id: 'rationType',
          labelEn: 'Morning fuel item',
          labelFr: 'Collation matinale',
          type: 'text',
          defaultValue: '',
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'night-ride',
      labelEn: 'Night ride',
      labelFr: 'Trajet nocturne',
      archetype: 'COMMUTE',
      iconName: 'Moon',
      colorKey: 'blue',
      descriptionEn: 'Low-light safety prep with high-output lighting and reflective gear',
      descriptionFr: 'Visibilité réduite, éclairage puissant et gilet haute visibilité',
      ruleTitleEn: 'Night Riding & Lights',
      ruleTitleFr: 'Sécurité de nuit & éclairage',
      ruleDescriptionEn: 'Guides front and rear lights, reflective gear, and adds extra time for wet or dark roads.',
      ruleDescriptionFr: 'Conseille un bon éclairage avant et arrière, un gilet réfléchissant et ajoute une marge pour la nuit.',
      defaultSettings: {
        headlightLumens: '800+ lm (High beam)',
        hiVisMandate: true,
        nightCautionBufferMin: 10,
      },
      settingsFields: [
        {
          id: 'headlightLumens',
          labelEn: 'Headlight output mode',
          labelFr: 'Puissance feu avant',
          type: 'select',
          defaultValue: '800+ lm (High beam)',
          options: [
            { value: '500 lm (City)', labelEn: '500 lm (Urban)', labelFr: '500 lm (Urbain)' },
            { value: '800+ lm (High beam)', labelEn: '800+ lm (High beam)', labelFr: '800+ lm (Plein phare)' },
            { value: '1200 lm (Unlit road)', labelEn: '1200 lm (Unlit road)', labelFr: '1200 lm (Route noire)' },
          ],
        },
        {
          id: 'nightCautionBufferMin',
          labelEn: 'Night safety buffer (min)',
          labelFr: 'Marge de sécurité nuit (min)',
          type: 'number',
          defaultValue: 10,
          unit: 'min',
        },
        {
          id: 'hiVisMandate',
          labelEn: 'Recommended packing: Hi-vis reflective sash',
          labelFr: 'Équipement conseillé : baudrier réfléchissant',
          type: 'boolean',
          defaultValue: true,
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'fitness-boost',
      labelEn: 'Fitness boost',
      labelFr: 'Boost cardio / tempo',
      archetype: 'COMMUTE',
      iconName: 'Zap',
      colorKey: 'rose',
      descriptionEn: 'High-intensity interval pacing to turn the commute into a quality training session',
      descriptionFr: 'Allure soutenue tempo pour transformer le trajet en entraînement',
      ruleTitleEn: 'Fitness Boost & Brisk Pace',
      ruleTitleFr: 'Allure cardio & rythme soutenu',
      ruleDescriptionEn: 'Elevates cruising speed targets and models sustained Zone 3 aerobic power output.',
      ruleDescriptionFr: 'Augmente la vitesse de croisière cible et modélise une puissance Zone 3 soutenue.',
      defaultSettings: {
        targetWattsFloor: 260,
        warmupDurationMin: 10,
        electrolyteElectrolyteRequired: true,
      },
      settingsFields: [
        {
          id: 'targetWattsFloor',
          labelEn: 'Target leg output (Watts)',
          labelFr: 'Puissance cible aux jambes (W)',
          type: 'number',
          defaultValue: 260,
          unit: 'W',
        },
        {
          id: 'warmupDurationMin',
          labelEn: 'Zone 1 warmup spin (min)',
          labelFr: 'Échauffement Zone 1 (min)',
          type: 'number',
          defaultValue: 10,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: Math.max(prev.route.targetSpeedKmH, 30.5),
        },
      }),
    },
    {
      id: 'hill-climb',
      labelEn: 'Hill climb',
      labelFr: 'Passage de côtes',
      archetype: 'COMMUTE',
      iconName: 'Mountain',
      colorKey: 'orange',
      descriptionEn: 'Steep bridge and ridge gradients factoring low-gear cadence',
      descriptionFr: 'Côtes et dénivelés de pont avec braquet adapté',
      ruleTitleEn: 'Hill Climb & Gradient Pacing',
      ruleTitleFr: 'Allure en côte & dénivelé',
      ruleDescriptionEn: 'Calibrates mechanical resistance on climbs and adds a climbing buffer to ensure zero gate tardiness.',
      ruleDescriptionFr: 'Calibre la résistance mécanique en côte et ajoute une marge pour éviter tout retard au portillon.',
      defaultSettings: {
        targetVam: 750,
        climbingBufferMin: 8,
        gradientPercent: 3.5,
      },
      settingsFields: [
        {
          id: 'targetVam',
          labelEn: 'Target VAM (m/h)',
          labelFr: 'VAM cible (m/h)',
          type: 'number',
          defaultValue: 750,
          unit: 'm/h',
        },
        {
          id: 'climbingBufferMin',
          labelEn: 'Climb buffer (min)',
          labelFr: 'Marge côte (min)',
          type: 'number',
          defaultValue: 8,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gradientPercent: 3.5,
        },
      }),
    },
    {
      id: 'shower-locker',
      labelEn: 'Arrival Break & Shower',
      labelFr: 'Collation & douche',
      archetype: 'COMMUTE',
      iconName: 'Droplets',
      colorKey: 'teal',
      descriptionEn: 'Work shower, fresh work clothes and a quick recovery snack',
      descriptionFr: 'Douche à l’arrivée, tenue civile et collation express',
      ruleTitleEn: 'Shower & Recovery Break',
      ruleTitleFr: 'Douche, tenue & collation',
      ruleDescriptionEn: 'Opens post-ride recovery window and adds time for a hot shower and changing clothes.',
      ruleDescriptionFr: 'Ouvre la fenêtre de récupération et planifie le temps de douche et changement de tenue.',
      defaultSettings: {
        showerMinutes: 12,
        lockerRefuelMinutes: 10,
        towelKitVerified: true,
      },
      settingsFields: [
        {
          id: 'showerMinutes',
          labelEn: 'Shower & grooming duration (min)',
          labelFr: 'Durée douche & toilette (min)',
          type: 'number',
          defaultValue: 12,
          unit: 'min',
        },
        {
          id: 'lockerRefuelMinutes',
          labelEn: 'Arrival snack window (min)',
          labelFr: 'Collation à l’arrivée (min)',
          type: 'number',
          defaultValue: 10,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        office: {
          ...prev.office,
          showerChangeMinutes: 12,
          lockerRefuelMinutes: 10,
        },
      }),
    },
    {
      id: 'bad-weather-prep',
      labelEn: 'Rain & Splash guard',
      labelFr: 'Équipement pluie & garde-boue',
      archetype: 'COMMUTE',
      iconName: 'CloudRain',
      colorKey: 'sky',
      descriptionEn: 'Wet weather readiness with full mudguards, waterproof booties and brake pad check',
      descriptionFr: 'Protection pluie avec garde-boue intégraux, couvre-chaussures et patins vérifiés',
      ruleTitleEn: 'Wet Weather & Splash Guard Readiness',
      ruleTitleFr: 'Protection météo pluvieuse & garde-boue',
      ruleDescriptionEn: 'Adds a wet pavement traction buffer and maintains waterproof shell pack readiness.',
      ruleDescriptionFr: 'Ajoute une marge d’adhérence sur sol mouillé et recommande la veste imperméable.',
      defaultSettings: {
        wetRoadBufferMin: 6,
        mudguardFitted: true,
      },
      settingsFields: [
        {
          id: 'wetRoadBufferMin',
          labelEn: 'Wet road deceleration buffer (min)',
          labelFr: 'Marge prudence sol mouillé (min)',
          type: 'number',
          defaultValue: 6,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: prev.physics.gearWeightKg + 0.8,
        },
      }),
    },
    {
      id: 'bike-lane-priority',
      labelEn: 'Protected bike path',
      labelFr: 'Piste cyclable protégée',
      archetype: 'COMMUTE',
      iconName: 'Shield',
      colorKey: 'emerald',
      descriptionEn: '100% segregated cycle tracks avoiding motor vehicle traffic congestion',
      descriptionFr: 'Voies cyclables 100% sécurisées à l’écart des embouteillages',
      ruleTitleEn: 'Protected Cycleways & Bike Paths',
      ruleTitleFr: 'Pistes cyclables protégées',
      ruleDescriptionEn: 'Prioritizes dedicated greenways and factors pedestrian crossing interactions.',
      ruleDescriptionFr: 'Privilégie les voies vertes et intègre la cohabitation piétons.',
      defaultSettings: {
        segregatedTrackPct: 90,
      },
      settingsFields: [
        {
          id: 'segregatedTrackPct',
          labelEn: 'Target segregated path ratio (%)',
          labelFr: 'Part de pistes protégées (%)',
          type: 'number',
          defaultValue: 90,
          unit: '%',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          urbanTrafficDelayMinutes: Math.max(5, (prev.route.urbanTrafficDelayMinutes || 8) - 2),
        },
      }),
    },
    {
      id: 'rush-hour-buffer',
      labelEn: 'Rush hour buffer',
      labelFr: 'Marge heure de pointe',
      archetype: 'COMMUTE',
      iconName: 'Clock',
      colorKey: 'purple',
      descriptionEn: 'Extra cushion for bridge bottlenecks and urban gate security during peak 08:00–08:45 rush',
      descriptionFr: 'Marge pour goulets d’étranglement et accès portillon en pleine heure de pointe',
      ruleTitleEn: 'Peak Traffic Congestion Cushion',
      ruleTitleFr: 'Marge de congestion heure de pointe',
      ruleDescriptionEn: 'Adds deliberate timing margin to guarantee gate arrival even during maximum bridge transit density.',
      ruleDescriptionFr: 'Garantit l’arrivée à la porte même en cas de saturation maximale du franchissement.',
      defaultSettings: {
        peakRushBufferMin: 12,
      },
      settingsFields: [
        {
          id: 'peakRushBufferMin',
          labelEn: 'Peak hour buffer allowance (min)',
          labelFr: 'Marge heure de pointe (min)',
          type: 'number',
          defaultValue: 12,
          unit: 'min',
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'cargo-laptop-pack',
      labelEn: 'Laptop & office cargo',
      labelFr: 'Sacoche ordi & bagages',
      archetype: 'COMMUTE',
      iconName: 'Briefcase',
      colorKey: 'lime',
      descriptionEn: 'Carrying 15" work laptop, charger, notebook and change of clothes in waterproof pannier',
      descriptionFr: 'Transport ordinateur portable 15", chargeur et tenue de rechange dans sacoche étanche',
      ruleTitleEn: 'Office Cargo & Electronics Staging',
      ruleTitleFr: 'Transport matériel informatique & sacoches',
      ruleDescriptionEn: 'Factors laptop and business gear mass into total system rolling resistance.',
      ruleDescriptionFr: 'Intègre la charge informatique et tenue dans la résistance au roulement.',
      defaultSettings: {
        laptopCargoMassKg: 3.5,
        waterproofPannierCheck: true,
      },
      settingsFields: [
        {
          id: 'laptopCargoMassKg',
          labelEn: 'Computer & pack payload (kg)',
          labelFr: 'Poids sacoche & ordinateur (kg)',
          type: 'number',
          defaultValue: 3.5,
          unit: 'kg',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: Math.max(prev.physics.gearWeightKg, 4.5),
        },
      }),
    },
    {
      id: 'hi-vis-vest',
      labelEn: 'Yellow safety vest',
      labelFr: 'Gilet haute visibilité',
      archetype: 'COMMUTE',
      iconName: 'Flashlight',
      colorKey: 'yellow-vest',
      descriptionEn: 'High-visibility yellow vest and reflective gear for low light',
      descriptionFr: 'Gilet jaune haute visibilité et bandes réfléchissantes par faible luminosité',
      ruleTitleEn: 'Yellow Safety Vest',
      ruleTitleFr: 'Gilet jaune de sécurité',
      ruleDescriptionEn: 'Wear a yellow vest and reflective ankle bands on dark stretches.',
      ruleDescriptionFr: 'Portez un gilet jaune et des bandes réfléchissantes aux chevilles sur les sections sombres.',
      defaultSettings: {
        isoVestVerified: true,
        reflectiveAnkleBands: true,
      },
      settingsFields: [
        {
          id: 'isoVestVerified',
          labelEn: 'EN ISO 20471 yellow vest staged',
          labelFr: 'Gilet jaune EN ISO 20471 prêt',
          type: 'boolean',
          defaultValue: true,
        },
        {
          id: 'reflectiveAnkleBands',
          labelEn: 'Reflective ankle straps packed',
          labelFr: 'Serre-pantalons réfléchissants',
          type: 'boolean',
          defaultValue: true,
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: prev.physics.gearWeightKg + 0.2,
        },
      }),
    },
  ],

  BIKEPACKING: [
    {
      id: 'leisure-cruise',
      labelEn: 'Leisure cruise',
      labelFr: 'Croisière loisir',
      archetype: 'BIKEPACKING',
      iconName: 'Sun',
      colorKey: 'emerald',
      descriptionEn: 'Gentle cadence prioritizing recovery, scenery, and daylight cushion',
      descriptionFr: 'Allure douce privilégiant la récupération et les pauses au soleil',
      ruleTitleEn: 'Leisure Cruise & Stint Limits',
      ruleTitleFr: 'Rythme loisir & durée des relais',
      ruleDescriptionEn: 'Caps rolling speed and plans daylight safety intervals before camp pitching.',
      ruleDescriptionFr: 'Conseille une vitesse modérée et planifie une marge diurne avant le montage du camp.',
      defaultSettings: {
        speedLimitKmH: 20,
        maxContinuousRidingMin: 75,
      },
      settingsFields: [
        {
          id: 'speedLimitKmH',
          labelEn: 'Cruising speed cap (km/h)',
          labelFr: 'Plafond vitesse de croisière (km/h)',
          type: 'number',
          defaultValue: 20,
          unit: 'km/h',
        },
        {
          id: 'maxContinuousRidingMin',
          labelEn: 'Max stint without break (min)',
          labelFr: 'Relais max sans pause (min)',
          type: 'number',
          defaultValue: 75,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 20,
        },
      }),
    },
    {
      id: 'mountain-adventure',
      labelEn: 'Mountain adventure',
      labelFr: 'Aventure montagne',
      archetype: 'BIKEPACKING',
      iconName: 'Mountain',
      colorKey: 'orange',
      descriptionEn: 'High-altitude rough terrain with heavy luggage and bivouac curfew',
      descriptionFr: 'Terrain alpin accidenté, sacoches complètes et couvre-feu bivouac',
      ruleTitleEn: 'Mountain Expedition & Bivouac Curfew',
      ruleTitleFr: 'Expédition montagne & couvre-feu bivouac',
      ruleDescriptionEn: 'Accounts for loaded bikepacking packs, rough gravel rolling drag, and pre-dusk camp curfew.',
      ruleDescriptionFr: 'Prend en compte les sacoches chargées, la résistance des chemins et l’installation avant la nuit.',
      defaultSettings: {
        bivouacCurfewTime: '19:30',
        campBreakdownMin: 30,
      },
      settingsFields: [
        {
          id: 'bivouacCurfewTime',
          labelEn: 'Bivouac camp pitch curfew',
          labelFr: 'Heure limite montage bivouac',
          type: 'time',
          defaultValue: '19:30',
        },
        {
          id: 'campBreakdownMin',
          labelEn: 'Camp setup & gear pack-down (min)',
          labelFr: 'Montage camp & sacoches (min)',
          type: 'number',
          defaultValue: 30,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: 12.0,
          crr: 0.0075,
        },
        office: {
          ...prev.office,
          targetGateArrivalTime: String(prev.ruleSettings?.bivouacCurfewTime || '19:30'),
        },
      }),
    },
    {
      id: 'speed-challenge',
      labelEn: 'Speed challenge',
      labelFr: 'Défi vitesse',
      archetype: 'BIKEPACKING',
      iconName: 'Timer',
      colorKey: 'rose',
      descriptionEn: 'Ultra-distance endurance race pacing with minimal resupply stoppage',
      descriptionFr: 'Allure ultra-distance type course avec arrêts ravitaillement réduits au minimum',
      ruleTitleEn: 'Ultra-Distance Challenge Pace',
      ruleTitleFr: 'Défi vitesse ultra-distance',
      ruleDescriptionEn: 'Streamlines kit weight, trims bag CdA drag, and targets 10-minute resupply stops.',
      ruleDescriptionFr: 'Allège la charge, optimise le profil des sacoches et vise des arrêts de 10 minutes.',
      defaultSettings: {
        maxResupplyStopMin: 10,
        targetPowerFloorWatts: 210,
      },
      settingsFields: [
        {
          id: 'maxResupplyStopMin',
          labelEn: 'Max resupply stop duration (min)',
          labelFr: 'Arrêt ravitaillement max (min)',
          type: 'number',
          defaultValue: 10,
          unit: 'min',
        },
        {
          id: 'targetPowerFloorWatts',
          labelEn: 'Sustained endurance power floor (W)',
          labelFr: 'Plancher de puissance (W)',
          type: 'number',
          defaultValue: 210,
          unit: 'W',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 26,
        },
        physics: {
          ...prev.physics,
          cda: 0.36,
          gearWeightKg: 6.5,
        },
      }),
    },
    {
      id: 'scenic-route',
      labelEn: 'Scenic route',
      labelFr: 'Route panoramique',
      archetype: 'BIKEPACKING',
      iconName: 'Compass',
      colorKey: 'lime',
      descriptionEn: 'Greenways and scenic vistas with scheduled photography and landmark intervals',
      descriptionFr: 'Voies vertes et belvédères avec fenêtres de contemplation programmées',
      ruleTitleEn: 'Scenic Route & Landmarks',
      ruleTitleFr: 'Itinéraire panoramique & belvédères',
      ruleDescriptionEn: 'Allocates deliberate timing buffers for photo stops and cultural sightseeing.',
      ruleDescriptionFr: 'Alloue des marges dédiées aux prises de vue et aux visites remarquables.',
      defaultSettings: {
        photoStopsTotalMin: 30,
      },
      settingsFields: [
        {
          id: 'photoStopsTotalMin',
          labelEn: 'Photo stops total allowance (min)',
          labelFr: 'Marge totale pauses photo (min)',
          type: 'number',
          defaultValue: 30,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 21,
        },
      }),
    },
    {
      id: 'bivouac-camp',
      labelEn: 'Wild bivouac',
      labelFr: 'Bivouac sauvage',
      archetype: 'BIKEPACKING',
      iconName: 'Tent',
      colorKey: 'amber',
      descriptionEn: 'Self-sufficient overnight wild camping with leave-no-trace principles',
      descriptionFr: 'Campement sauvage autonome avec respect strict de l’environnement',
      ruleTitleEn: 'Wild Camping & Leave No Trace',
      ruleTitleFr: 'Bivouac sauvage & zéro trace',
      ruleDescriptionEn: 'Schedules shelter pitch time and ensures water filter purification supplies.',
      ruleDescriptionFr: 'Planifie le montage de l’abri et vérifie les réserves de filtration d’eau.',
      defaultSettings: {
        bivouacCurfew: '19:30',
      },
      settingsFields: [
        {
          id: 'bivouacCurfew',
          labelEn: 'Camp pitch curfew',
          labelFr: 'Heure limite bivouac',
          type: 'time',
          defaultValue: '19:30',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: Math.max(prev.physics.gearWeightKg, 10.5),
        },
        office: {
          ...prev.office,
          targetGateArrivalTime: String(prev.ruleSettings?.bivouacCurfew || '19:30'),
        },
      }),
    },
    {
      id: 'resupply-points',
      labelEn: 'Food & Water resupply',
      labelFr: 'Ravitaillement eau & vivres',
      archetype: 'BIKEPACKING',
      iconName: 'UtensilsCrossed',
      colorKey: 'blue',
      descriptionEn: 'Planned village water fountains and bakery stops along remote sectors',
      descriptionFr: 'Points d’eau et haltes boulangerie planifiés sur les secteurs isolés',
      ruleTitleEn: 'Water & Bakery Resupply Strategy',
      ruleTitleFr: 'Stratégie ravitaillement eau & boulangerie',
      ruleDescriptionEn: 'Calculates water consumption intervals and stops every 35-45 km.',
      ruleDescriptionFr: 'Calibre la consommation d’eau et prévoit des haltes tous les 35 à 45 km.',
      defaultSettings: {
        resupplyIntervalKm: 40,
      },
      settingsFields: [
        {
          id: 'resupplyIntervalKm',
          labelEn: 'Resupply waypoint interval (km)',
          labelFr: 'Intervalle ravitaillement (km)',
          type: 'number',
          defaultValue: 40,
          unit: 'km',
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'gravel-trail-master',
      labelEn: 'Off-grid trail sector',
      labelFr: 'Sentier hors-piste',
      archetype: 'BIKEPACKING',
      iconName: 'Navigation',
      colorKey: 'teal',
      descriptionEn: 'Technical dirt tracks requiring tubeless repair darts and lower tire pressures',
      descriptionFr: 'Pistes techniques de terre nécessitant mèches tubeless et basse pression',
      ruleTitleEn: 'Unpaved Trails & Gravel',
      ruleTitleFr: 'Secteur chemin de terre & gravel',
      ruleDescriptionEn: 'Adjusts rolling friction for unpaved terrain and factors trail navigation buffers.',
      ruleDescriptionFr: 'Adapte le roulement pour sol meuble et intègre la navigation sur sentier.',
      defaultSettings: {
        trailSectorBufferMin: 12,
      },
      settingsFields: [
        {
          id: 'trailSectorBufferMin',
          labelEn: 'Trail buffer (min)',
          labelFr: 'Marge prudence sentier (min)',
          type: 'number',
          defaultValue: 12,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          crr: 0.0078,
        },
      }),
    },
    {
      id: 'solar-power-recharge',
      labelEn: 'Power bank reserve',
      labelFr: 'Batterie & réserve énergie',
      archetype: 'BIKEPACKING',
      iconName: 'BatteryCharging',
      colorKey: 'purple',
      descriptionEn: 'Carrying 20,000mAh external battery to keep GPS, front light and phone charged 48h+',
      descriptionFr: 'Batterie externe 20 000 mAh pour garantir charge GPS, phare et téléphone sur 48h+',
      ruleTitleEn: 'Electronics & Battery Backup',
      ruleTitleFr: 'Autonomie électrique & GPS',
      ruleDescriptionEn: 'Ensures electronic navigation redundancy across multi-day off-grid stretches.',
      ruleDescriptionFr: 'Garantit l’alimentation du GPS et des feux en autonomie complète.',
      defaultSettings: {
        powerBankMassKg: 0.6,
      },
      settingsFields: [
        {
          id: 'powerBankMassKg',
          labelEn: 'Battery bank weight (kg)',
          labelFr: 'Poids batterie de secours (kg)',
          type: 'number',
          defaultValue: 0.6,
          unit: 'kg',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: prev.physics.gearWeightKg + 0.6,
        },
      }),
    },
    {
      id: 'emergency-first-aid',
      labelEn: 'Emergency first aid kit',
      labelFr: 'Trousse premiers secours',
      archetype: 'BIKEPACKING',
      iconName: 'HeartPulse',
      colorKey: 'rose',
      descriptionEn: 'Emergency trauma bandages, antiseptic, space blanket and satellite beacon check',
      descriptionFr: 'Pansements compressifs, antiseptique, couverture de survie et balise satellite',
      ruleTitleEn: 'Wilderness Medical Readiness',
      ruleTitleFr: 'Secours & sécurité en milieu isolé',
      ruleDescriptionEn: 'Verifies first aid kit supplies and emergency contact details.',
      ruleDescriptionFr: 'Vérifie la trousse de secours et les contacts d’urgence.',
      defaultSettings: {
        medicalKitChecked: true,
      },
      settingsFields: [
        {
          id: 'medicalKitChecked',
          labelEn: 'Wilderness first-aid kit verified',
          labelFr: 'Trousse médicale vérifiée',
          type: 'boolean',
          defaultValue: true,
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: prev.physics.gearWeightKg + 0.4,
        },
      }),
    },
  ],

  SPORT: [
    {
      id: 'off-road-exploration',
      labelEn: 'Off-road exploration',
      labelFr: 'Exploration hors-piste',
      archetype: 'SPORT',
      iconName: 'Navigation',
      colorKey: 'orange',
      descriptionEn: 'Gravel tracks, forest trails and rough tarmac requiring tire pressure vigilance',
      descriptionFr: 'Pistes gravel, chemins de terre et bitume dégradé nécessitant vigilance pneus',
      ruleTitleEn: 'Off-Road & Gravel Tire Management',
      ruleTitleFr: 'Gestion pneus gravel & hors-piste',
      ruleDescriptionEn: 'Adjusts rolling resistance for unpaved sectors · Recommended packing: puncture repair kit.',
      ruleDescriptionFr: 'Ajuste le Crr pour les pistes · Équipement conseillé : kit mèches tubeless prêt à l’emploi.',
      defaultSettings: {
        tirePressureBar: 2.6,
      },
      settingsFields: [
        {
          id: 'tirePressureBar',
          labelEn: 'Gravel tire pressure (bar)',
          labelFr: 'Pression des pneus gravel (bar)',
          type: 'number',
          defaultValue: 2.6,
          unit: 'bar',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          crr: 0.0070,
        },
      }),
    },
    {
      id: 'family-friendly',
      labelEn: 'Family-friendly',
      labelFr: 'Sortie conviviale',
      archetype: 'SPORT',
      iconName: 'Smile',
      colorKey: 'emerald',
      descriptionEn: 'Accessible group pace with frequent regroup pauses and traffic-free bike paths',
      descriptionFr: 'Allure accessible en groupe avec regroupements fréquents et pistes sécurisées',
      ruleTitleEn: 'Group & Family Regroup Pacing',
      ruleTitleFr: 'Allure conviviale & regroupements',
      ruleDescriptionEn: 'Caps maximum rolling speeds and schedules regroup intervals every 10–15 km.',
      ruleDescriptionFr: 'Plafonne la vitesse de croisière et planifie des pauses de regroupement régulières.',
      defaultSettings: {
        speedCapKmH: 19,
      },
      settingsFields: [
        {
          id: 'speedCapKmH',
          labelEn: 'Group pace ceiling (km/h)',
          labelFr: 'Plafond vitesse peloton (km/h)',
          type: 'number',
          defaultValue: 19,
          unit: 'km/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 19,
          urbanTrafficDelayMinutes: Math.max(prev.route.urbanTrafficDelayMinutes, 12),
        },
      }),
    },
    {
      id: 'eco-friendly-path',
      labelEn: 'Eco-friendly path',
      labelFr: 'Voie verte & éco',
      archetype: 'SPORT',
      iconName: 'Leaf',
      colorKey: 'lime',
      descriptionEn: 'Nature reserve routes with zero single-use plastics and wildlife speed caps',
      descriptionFr: 'Voies protégées avec zéro déchet plastique et respect de la faune',
      ruleTitleEn: 'Zero-Waste & Ecological Greenway Rules',
      ruleTitleFr: 'Règles éco-responsables & zéro déchet',
      ruleDescriptionEn: 'Prioritizes reusable food packaging and respects 20 km/h shared path speed guidelines.',
      ruleDescriptionFr: 'Privilégie les emballages réutilisables et adopte l’allure à 20 km/h en zone partagée.',
      defaultSettings: {
        sharedPathSpeedLimitKmH: 20,
      },
      settingsFields: [
        {
          id: 'sharedPathSpeedLimitKmH',
          labelEn: 'Shared greenway speed limit (km/h)',
          labelFr: 'Limitation voie partagée (km/h)',
          type: 'number',
          defaultValue: 20,
          unit: 'km/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 22,
        },
      }),
    },
    {
      id: 'urban-discovery',
      labelEn: 'Urban discovery',
      labelFr: 'Découverte urbaine',
      archetype: 'SPORT',
      iconName: 'Building2',
      colorKey: 'blue',
      descriptionEn: 'City center crossings, pedestrian zones, and high-frequency traffic light buffers',
      descriptionFr: 'Traversées urbaines, zones piétonnes et marge pour feux tricolores',
      ruleTitleEn: 'City Streets & Pedestrian Zones',
      ruleTitleFr: 'Traversée urbaine & feux',
      ruleDescriptionEn: 'Factors city traffic stops · Recommended packing: sturdy bike lock.',
      ruleDescriptionFr: 'Prend en compte les arrêts aux feux · Équipement conseillé : antivol de haute sécurité.',
      defaultSettings: {
        urbanTrafficBufferMin: 14,
      },
      settingsFields: [
        {
          id: 'urbanTrafficBufferMin',
          labelEn: 'Traffic light buffer (min)',
          labelFr: 'Marge feux & intersections (min)',
          type: 'number',
          defaultValue: 14,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          urbanTrafficDelayMinutes: 14,
        },
      }),
    },
    {
      id: 'paceline-drafting',
      labelEn: 'Paceline & Drafting',
      labelFr: 'Peloton & relais',
      archetype: 'SPORT',
      iconName: 'Users',
      colorKey: 'purple',
      descriptionEn: 'Organized paceline rotation reducing aerodynamic drag by 15-20%',
      descriptionFr: 'Rotation organisée en relais réduisant la traînée aéro de 15 à 20%',
      ruleTitleEn: 'Paceline Dynamics & Drafting Benefit',
      ruleTitleFr: 'Dynamique de peloton & relais',
      ruleDescriptionEn: 'Applies aerodynamic savings from drafting in echelon formations at speed.',
      ruleDescriptionFr: 'Applique le gain aérodynamique de l’aspiration en peloton à haute vitesse.',
      defaultSettings: {
        targetPacelineSpeedKmH: 33,
      },
      settingsFields: [
        {
          id: 'targetPacelineSpeedKmH',
          labelEn: 'Paceline cruising speed (km/h)',
          labelFr: 'Vitesse de croisière peloton (km/h)',
          type: 'number',
          defaultValue: 33,
          unit: 'km/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 33,
        },
        physics: {
          ...prev.physics,
          cda: Math.max(0.28, prev.physics.cda * 0.85),
        },
      }),
    },
    {
      id: 'interval-training',
      labelEn: 'Threshold intervals',
      labelFr: 'Fractionné au seuil',
      archetype: 'SPORT',
      iconName: 'Flame2',
      colorKey: 'rose',
      descriptionEn: 'Structured high-intensity sweetspot / VO2max intervals with high glycogen demand',
      descriptionFr: 'Intervalles au seuil / VO2max avec forte dépense glycogénique',
      ruleTitleEn: 'Interval Training & Power Surges',
      ruleTitleFr: 'Entraînement par intervalles & watts cibles',
      ruleDescriptionEn: 'Targets 300W+ repetitions and accelerates hourly carbohydrate burning model.',
      ruleDescriptionFr: 'Cible des séries à 300W+ et accélère l’oxydation des glucides.',
      defaultSettings: {
        intervalWatts: 310,
      },
      settingsFields: [
        {
          id: 'intervalWatts',
          labelEn: 'Target interval wattage (W)',
          labelFr: 'Puissance cible des séries (W)',
          type: 'number',
          defaultValue: 310,
          unit: 'W',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: Math.max(prev.route.targetSpeedKmH, 32),
        },
      }),
    },
    {
      id: 'climbing-kom-hunt',
      labelEn: 'KOM & Hill repeats',
      labelFr: 'Chasse aux cols & KOM',
      archetype: 'SPORT',
      iconName: 'Trophy',
      colorKey: 'amber',
      descriptionEn: 'Segment sprints, steep punchy climbs and sustained hill climbing efforts',
      descriptionFr: 'Sprints sur segments, côtes raides et répétitions d’efforts en montée',
      ruleTitleEn: 'Hill Climbing & Peak Power',
      ruleTitleFr: 'Intensité en bosse & puissance de grimpe',
      ruleDescriptionEn: 'Factors aggressive climbing power surges and pacing over category climbs.',
      ruleDescriptionFr: 'Intègre les accélérations en côte et la gestion de puissance dans les cols.',
      defaultSettings: {
        komPeakWatts: 380,
      },
      settingsFields: [
        {
          id: 'komPeakWatts',
          labelEn: 'Target climb power surge (W)',
          labelFr: 'Puissance d’attaque en côte (W)',
          type: 'number',
          defaultValue: 380,
          unit: 'W',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gradientPercent: 4.2,
        },
      }),
    },
    {
      id: 'hydration-electrolytes',
      labelEn: 'Hydration & carb pacing',
      labelFr: 'Hydratation & glucides adaptés',
      archetype: 'SPORT',
      iconName: 'Droplets',
      colorKey: 'teal',
      descriptionEn: 'Personalized food and drink plan: hourly carbs & hydration matched to your pace',
      descriptionFr: 'Plan d’alimentation personnalisé : glucides/h et hydratation adaptés à votre allure',
      ruleTitleEn: 'Rider-Scaled Carbohydrate & Fluid Pacing',
      ruleTitleFr: 'Apport glucidique horaire & hydratation calibrés',
      ruleDescriptionEn: 'Calibrates hourly carb intake to your rider profile without gastrointestinal overload.',
      ruleDescriptionFr: 'Adapte l’apport énergétique à votre profil cycliste sans surcharge digestive.',
      defaultSettings: {
        carbTargetGramHour: 60,
      },
      settingsFields: [
        {
          id: 'carbTargetGramHour',
          labelEn: 'Target carb intake (g/h)',
          labelFr: 'Cible glucides par heure (g/h)',
          type: 'number',
          defaultValue: 60,
          unit: 'g/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: Math.max(prev.route.targetSpeedKmH, 31),
        },
      }),
    },
    {
      id: 'fast-group-ride',
      labelEn: 'Grand Fondo pacing',
      labelFr: 'Allure Gran Fondo',
      archetype: 'SPORT',
      iconName: 'BikeFast',
      colorKey: 'sky',
      descriptionEn: 'High-tempo Saturday group training ride maintaining 33-36 km/h on flats',
      descriptionFr: 'Entraînement de club à haute allure maintenant 33-36 km/h sur le plat',
      ruleTitleEn: 'Fast Group Ride Pacing',
      ruleTitleFr: 'Sortie rapide en club',
      ruleDescriptionEn: 'Applies peloton pace standards and group safety turnaround checkpoints.',
      ruleDescriptionFr: 'Applique les standards de vitesse de club et les consignes de sécurité.',
      defaultSettings: {
        pelotonAvgSpeedKmH: 34,
      },
      settingsFields: [
        {
          id: 'pelotonAvgSpeedKmH',
          labelEn: 'Peloton speed target (km/h)',
          labelFr: 'Vitesse cible de peloton (km/h)',
          type: 'number',
          defaultValue: 34,
          unit: 'km/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 34,
        },
      }),
    },
  ],

  ESCAPADE: [
    {
      id: 'historical-tour',
      labelEn: 'Historical tour',
      labelFr: 'Circuit historique',
      archetype: 'ESCAPADE',
      iconName: 'Landmark',
      colorKey: 'amber',
      descriptionEn: 'Castles, heritage sites, and guided walking pauses along the route',
      descriptionFr: 'Châteaux, monuments et visites à pied le long du parcours',
      ruleTitleEn: 'Heritage & Sightseeing Stops',
      ruleTitleFr: 'Visite patrimoine & châteaux',
      ruleDescriptionEn: 'Allocates timing for cultural visits and requires verified bike parking.',
      ruleDescriptionFr: 'Alloue du temps pour les visites culturelles et requiert un parking vélo surveillé.',
      defaultSettings: {
        monumentPauseMin: 30,
      },
      settingsFields: [
        {
          id: 'monumentPauseMin',
          labelEn: 'Monument visit pause (min)',
          labelFr: 'Pause visite monument (min)',
          type: 'number',
          defaultValue: 30,
          unit: 'min',
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'picnic-outing',
      labelEn: 'Picnic outing',
      labelFr: 'Sortie pique-nique',
      archetype: 'ESCAPADE',
      iconName: 'Utensils',
      colorKey: 'orange',
      descriptionEn: 'Scenic waterside lunch break with insulated pannier payload',
      descriptionFr: 'Pause déjeuner au bord de l’eau avec sacoche isotherme chargée',
      ruleTitleEn: 'Picnic & Meal Breaks',
      ruleTitleFr: 'Pique-nique & repas au vert',
      ruleDescriptionEn: 'Accounts for food payload mass and plans a 45-minute relaxation window.',
      ruleDescriptionFr: 'Prend en compte le poids des victuailles et planifie une pause détente de 45 min.',
      defaultSettings: {
        picnicDurationMin: 45,
      },
      settingsFields: [
        {
          id: 'picnicDurationMin',
          labelEn: 'Picnic break duration (min)',
          labelFr: 'Durée de la pause (min)',
          type: 'number',
          defaultValue: 45,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: Math.max(prev.physics.gearWeightKg, 5.5),
        },
      }),
    },
    {
      id: 'long-distance-endurance',
      labelEn: 'Long-distance endurance',
      labelFr: 'Endurance longue distance',
      archetype: 'ESCAPADE',
      iconName: 'Gauge',
      colorKey: 'blue',
      descriptionEn: 'Dawn departure to secure evening hotel check-in over 60+ km touring distances',
      descriptionFr: 'Départ à l’aube pour rallier l’hôtel à l’heure sur plus de 60 km',
      ruleTitleEn: 'Endurance Touring & Check-In Buffer',
      ruleTitleFr: 'Endurance cyclotouriste & marge check-in',
      ruleDescriptionEn: 'Supports steady cruising pace, hourly hydration pacing, and an early hotel check-in margin.',
      ruleDescriptionFr: 'Favorise une allure régulière, des rappels hydratation et une marge d’arrivée sereine à l’hôtel.',
      defaultSettings: {
        hotelCheckinDeadline: '18:00',
      },
      settingsFields: [
        {
          id: 'hotelCheckinDeadline',
          labelEn: 'Hotel reception cutoff time',
          labelFr: 'Heure limite accueil hôtel',
          type: 'time',
          defaultValue: '18:00',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 24,
        },
        office: {
          ...prev.office,
          targetGateArrivalTime: String(prev.ruleSettings?.hotelCheckinDeadline || '18:00'),
        },
      }),
    },
    {
      id: 'photography-spots',
      labelEn: 'Photography spots',
      labelFr: 'Spots photo',
      archetype: 'ESCAPADE',
      iconName: 'Camera',
      colorKey: 'sky',
      descriptionEn: 'Golden hour timing optimization with handlebar camera bag payload',
      descriptionFr: 'Optimisation lumière dorée et charge sacoche photo sur guidon',
      ruleTitleEn: 'Photography Stops & Golden Hour Sync',
      ruleTitleFr: 'Spots photo & synchronisation heure dorée',
      ruleDescriptionEn: 'Synchronizes route arrival with scenic evening light and factors camera gear mass.',
      ruleDescriptionFr: 'Synchronise l’arrivée avec la lumière du soir et intègre le matériel photo.',
      defaultSettings: {
        goldenHourTarget: '18:15',
      },
      settingsFields: [
        {
          id: 'goldenHourTarget',
          labelEn: 'Golden hour target arrival',
          labelFr: 'Heure dorée d’arrivée cible',
          type: 'time',
          defaultValue: '18:15',
        },
      ],
      applyPresets: (prev) => ({
        physics: {
          ...prev.physics,
          gearWeightKg: Math.max(prev.physics.gearWeightKg, 5.0),
        },
        office: {
          ...prev.office,
          targetGateArrivalTime: String(prev.ruleSettings?.goldenHourTarget || '18:15'),
        },
      }),
    },
    {
      id: 'spa-wellness',
      labelEn: 'Hotel spa & recovery',
      labelFr: 'Spa hôtel & récupération',
      archetype: 'ESCAPADE',
      iconName: 'Sparkles',
      colorKey: 'purple',
      descriptionEn: 'Post-ride thermal spa session, sauna and refreshing drinks',
      descriptionFr: 'Séance spa thermal après sortie, sauna et réhydratation',
      ruleTitleEn: 'Hotel Spa & Evening Recovery Staging',
      ruleTitleFr: 'Détente spa hôtel & récupération',
      ruleDescriptionEn: 'Guarantees arriving with plenty of time for evening thermal relaxation.',
      ruleDescriptionFr: 'Garantit une arrivée confortable pour profiter des thermes en soirée.',
      defaultSettings: {
        spaSessionDurationMin: 45,
      },
      settingsFields: [
        {
          id: 'spaSessionDurationMin',
          labelEn: 'Spa recovery duration (min)',
          labelFr: 'Durée détente spa (min)',
          type: 'number',
          defaultValue: 45,
          unit: 'min',
        },
      ],
      applyPresets: (prev) => ({
        office: {
          ...prev.office,
          lockerRefuelMinutes: 20,
        },
      }),
    },
    {
      id: 'local-gastronomy',
      labelEn: 'Wine & Gastronomy',
      labelFr: 'Terroir & gastronomie',
      archetype: 'ESCAPADE',
      iconName: 'Wine',
      colorKey: 'rose',
      descriptionEn: 'Scheduled evening culinary dining reservation and vineyard stops',
      descriptionFr: 'Réservation dîner du terroir et étapes vignobles',
      ruleTitleEn: 'Regional Gastronomy & Evening Reservation',
      ruleTitleFr: 'Gastronomie de terroir & dîner',
      ruleDescriptionEn: 'Schedules prompt check-in ahead of evening restaurant table reservations.',
      ruleDescriptionFr: 'Planifie l’arrivée pour être à l’heure aux réservations du soir.',
      defaultSettings: {
        dinnerReservationTime: '19:45',
      },
      settingsFields: [
        {
          id: 'dinnerReservationTime',
          labelEn: 'Dinner reservation time',
          labelFr: 'Heure réservation dîner',
          type: 'time',
          defaultValue: '19:45',
        },
      ],
      applyPresets: () => ({}),
    },
    {
      id: 'scenic-waterways',
      labelEn: 'Canal & Coastline paths',
      labelFr: 'Canaux & voies côtières',
      archetype: 'ESCAPADE',
      iconName: 'Waves',
      colorKey: 'teal',
      descriptionEn: 'Cruising flat riverbanks, estuary towpaths and scenic ocean dykes',
      descriptionFr: 'Randonnée le long des fleuves, berges fluviales et digues côtières',
      ruleTitleEn: 'Waterway & Coastal Towpaths',
      ruleTitleFr: 'Voies sur berges & littoral',
      ruleDescriptionEn: 'Applies smooth low-friction towpath pacing and models scenic bridge vistas.',
      ruleDescriptionFr: 'Calibre l’allure régulière sur chemins de halage et vues panoramiques.',
      defaultSettings: {
        waterwaySpeedCapKmH: 22,
      },
      settingsFields: [
        {
          id: 'waterwaySpeedCapKmH',
          labelEn: 'Towpath cruising pace (km/h)',
          labelFr: 'Allure de croisière halage (km/h)',
          type: 'number',
          defaultValue: 22,
          unit: 'km/h',
        },
      ],
      applyPresets: (prev) => ({
        route: {
          ...prev.route,
          targetSpeedKmH: 22,
        },
      }),
    },
    {
      id: 'bed-and-breakfast',
      labelEn: 'Charming B&B check-in',
      labelFr: 'Accueil chambre d’hôtes',
      archetype: 'ESCAPADE',
      iconName: 'Bed',
      colorKey: 'lime',
      descriptionEn: 'Personal greeting by local hosts with secured bike courtyard and regional breakfast',
      descriptionFr: 'Accueil personnalisé chez l’habitant avec cour fermée et petit-déjeuner maison',
      ruleTitleEn: 'Bed & Breakfast Arrival Staging',
      ruleTitleFr: 'Accueil chambre d’hôtes & hébergement',
      ruleDescriptionEn: 'Aligns arrival timing with host greeting windows and secure indoor courtyard lockup.',
      ruleDescriptionFr: 'Planifie l’heure d’arrivée avec la fenêtre de remise des clés.',
      defaultSettings: {
        hostGreetingTime: '17:30',
      },
      settingsFields: [
        {
          id: 'hostGreetingTime',
          labelEn: 'Host check-in time',
          labelFr: 'Heure d’accueil hôte',
          type: 'time',
          defaultValue: '17:30',
        },
      ],
      applyPresets: (prev) => ({
        office: {
          ...prev.office,
          targetGateArrivalTime: '17:30',
        },
      }),
    },
    {
      id: 'cultural-audio-guide',
      labelEn: 'Cultural audio tour',
      labelFr: 'Guide audio & patrimoine',
      archetype: 'ESCAPADE',
      iconName: 'Headphones',
      colorKey: 'emerald',
      descriptionEn: 'Listening to historical landmark stories and local architecture episodes en route',
      descriptionFr: 'Écoute d’histoires du patrimoine et architecture locale au fil des étapes',
      ruleTitleEn: 'Cultural Audio & Waypoint Listening',
      ruleTitleFr: 'Parcours audio culturel & pauses patrimoine',
      ruleDescriptionEn: 'Allocates timing buffers for audio tour stops and landmark exploration.',
      ruleDescriptionFr: 'Prévoit des marges pour les arrêts audio et la découverte patrimoniale.',
      defaultSettings: {
        audioStopBufferMin: 15,
      },
      settingsFields: [
        {
          id: 'audioStopBufferMin',
          labelEn: 'Audio stop allowance (min)',
          labelFr: 'Temps d’écoute & découverte (min)',
          type: 'number',
          defaultValue: 15,
          unit: 'min',
        },
      ],
      applyPresets: () => ({}),
    },
  ],
};

export function getArchetypeFromTag(tag?: string, name?: string): ArchetypeMode {
  // 1. Tag takes strict priority over name
  const cleanTag = (tag || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (
    cleanTag.includes('VELOTAF') ||
    cleanTag.includes('COMMUTE') ||
    cleanTag.includes('TAF') ||
    cleanTag.includes('BOULOT') ||
    cleanTag.includes('TRAVAIL') ||
    cleanTag.includes('WORK') ||
    cleanTag.includes('OFFICE')
  ) {
    return 'COMMUTE';
  }
  if (
    cleanTag.includes('BIKEPACK') ||
    cleanTag.includes('BIVOUAC') ||
    cleanTag.includes('ADVENTURE') ||
    cleanTag.includes('AVENTURE')
  ) {
    return 'BIKEPACKING';
  }
  if (
    cleanTag.includes('SPORT') ||
    cleanTag.includes('FONDO') ||
    cleanTag.includes('TEMPO') ||
    cleanTag.includes('TRAINING') ||
    cleanTag.includes('ENTRAINEMENT') ||
    cleanTag.includes('CYCLOSPORTIVE') ||
    cleanTag.includes('COURSE') ||
    cleanTag.includes('RACE')
  ) {
    return 'SPORT';
  }
  if (
    cleanTag.includes('ESCAPADE') ||
    cleanTag.includes('HOTEL') ||
    cleanTag.includes('LEISURE') ||
    cleanTag.includes('WEEKEND') ||
    cleanTag.includes('WEEK-END') ||
    cleanTag.includes('TOURING') ||
    cleanTag.includes('SEJOUR') ||
    cleanTag.includes('ECHAPPEE')
  ) {
    return 'ESCAPADE';
  }

  // 2. Only if tag does not determine archetype, fall back to inspecting trip name
  const cleanName = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (
    cleanName.includes('VELOTAF') ||
    cleanName.includes('COMMUTE') ||
    cleanName.includes('TAF') ||
    cleanName.includes('BOULOT') ||
    cleanName.includes('TRAVAIL') ||
    cleanName.includes('WORK') ||
    cleanName.includes('OFFICE')
  ) {
    return 'COMMUTE';
  }
  if (
    cleanName.includes('BIKEPACK') ||
    cleanName.includes('BIVOUAC') ||
    cleanName.includes('ADVENTURE') ||
    cleanName.includes('AVENTURE')
  ) {
    return 'BIKEPACKING';
  }
  if (
    cleanName.includes('SPORT') ||
    cleanName.includes('FONDO') ||
    cleanName.includes('TEMPO') ||
    cleanName.includes('TRAINING') ||
    cleanName.includes('ENTRAINEMENT') ||
    cleanName.includes('CYCLOSPORTIVE') ||
    cleanName.includes('COURSE') ||
    cleanName.includes('RACE')
  ) {
    return 'SPORT';
  }
  if (
    cleanName.includes('ESCAPADE') ||
    cleanName.includes('HOTEL') ||
    cleanName.includes('LEISURE') ||
    cleanName.includes('WEEKEND') ||
    cleanName.includes('WEEK-END') ||
    cleanName.includes('TOURING') ||
    cleanName.includes('SEJOUR') ||
    cleanName.includes('ECHAPPEE')
  ) {
    return 'ESCAPADE';
  }

  return 'COMMUTE';
}

export function getAllChipsForArchetype(archetype: ArchetypeMode): ArchetypeChipDef[] {
  return ARCHETYPE_CHIP_DEFINITIONS[archetype] || ARCHETYPE_CHIP_DEFINITIONS.COMMUTE;
}

export function findChipDef(chipId: string): ArchetypeChipDef | undefined {
  for (const list of Object.values(ARCHETYPE_CHIP_DEFINITIONS)) {
    const found = list.find((c) => c.id === chipId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Calculates extra buffer minutes introduced by currently active custom chips
 */
export function getChipsExtraBufferMinutes(trip: TripProfile): number {
  if (!trip.customChips || trip.customChips.length === 0) return 0;
  let extra = 0;
  const ruleSettings = trip.ruleSettings || {};

  for (const chipId of trip.customChips) {
    if (chipId === 'coffee-stop') {
      extra += Number(ruleSettings['coffeeDurationMin'] ?? 15);
    } else if (chipId === 'night-ride') {
      extra += Number(ruleSettings['nightCautionBufferMin'] ?? 10);
    } else if (chipId === 'hill-climb') {
      extra += Number(ruleSettings['climbingBufferMin'] ?? 8);
    } else if (chipId === 'bad-weather-prep') {
      extra += Number(ruleSettings['wetRoadBufferMin'] ?? 6);
    } else if (chipId === 'rush-hour-buffer') {
      extra += Number(ruleSettings['peakRushBufferMin'] ?? 12);
    } else if (chipId === 'historical-tour') {
      extra += Number(ruleSettings['monumentPauseMin'] ?? 30);
    } else if (chipId === 'photography-spots') {
      extra += Number(ruleSettings['shootingPausesTotalMin'] ?? 15);
    } else if (chipId === 'scenic-route') {
      extra += Number(ruleSettings['photoStopsTotalMin'] ?? 30);
    } else if (chipId === 'resupply-points') {
      extra += 12;
    } else if (chipId === 'spa-wellness') {
      extra += 20;
    } else if (chipId === 'gravel-trail-master') {
      extra += Number(ruleSettings['trailSectorBufferMin'] ?? 12);
    } else if (chipId === 'climbing-kom-hunt') {
      extra += 8;
    } else if (chipId === 'cultural-audio-guide') {
      extra += Number(ruleSettings['audioStopBufferMin'] ?? 15);
    } else if (chipId === 'picnic-outing') {
      extra += Number(ruleSettings['picnicDurationMin'] ?? 45);
    } else if (chipId === 'local-gastronomy') {
      extra += 10;
    }
  }
  return extra;
}

interface ChipPrevSnapshot {
  physics: TripProfile['physics'];
  route: Pick<TripProfile['route'], 'targetSpeedKmH' | 'urbanTrafficDelayMinutes' | 'targetEffortWatts'>;
  office: Pick<TripProfile['office'], 'showerChangeMinutes' | 'lockerRefuelMinutes' | 'targetGateArrivalTime'>;
}

const ADDITIVE_CHIP_IDS = new Set([
  'bad-weather-prep',
  'hi-vis-vest',
  'solar-power-recharge',
  'emergency-first-aid',
  'bike-lane-priority',
  'paceline-drafting',
]);

function syncCommuteGateArrivalFromShift(office: TripProfile['office']): TripProfile['office'] {
  if (!office.shiftStartTime) return office;
  const postGateMinutes = Math.max(
    10,
    (office.lockerRefuelMinutes ?? 10) +
      (office.showerChangeMinutes ?? 0) +
      (office.breakRoomBreakfastMinutes ?? 10)
  );
  return {
    ...office,
    targetGateArrivalTime: subtractMinutesFromTime(office.shiftStartTime, postGateMinutes),
  };
}

/**
 * Cascades predetermined settings when chips change (fully reversible on toggle off)
 */
export function toggleArchetypeChip(
  trip: TripProfile,
  chipId: string,
  lang: 'en' | 'fr' = 'en'
): TripProfile {
  const currentChips = trip.customChips ? [...trip.customChips] : [];
  const exists = currentChips.includes(chipId);
  const nextChips = exists
    ? currentChips.filter((id) => id !== chipId)
    : [...currentChips, chipId];

  const chipDef = findChipDef(chipId);
  const effectiveMode = getArchetypeFromTag(trip.tag, trip.name);
  const prevSnapshots: Record<string, ChipPrevSnapshot> = {
    ...(trip.ruleSettings?.__chipPrev || {}),
  };
  const nextRuleSettings: Record<string, any> = {
    ...(trip.ruleSettings || {}),
    __chipPrev: prevSnapshots,
  };

  let updatedTrip: TripProfile = {
    ...trip,
    customChips: nextChips,
    ruleSettings: nextRuleSettings,
    physics: { ...trip.physics },
    route: { ...trip.route },
    office: { ...trip.office },
  };

  if (!exists && chipDef) {
    // Capture pre-activation snapshot for clean reversal later
    prevSnapshots[chipId] = {
      physics: { ...trip.physics },
      route: {
        targetSpeedKmH: trip.route.targetSpeedKmH,
        urbanTrafficDelayMinutes: trip.route.urbanTrafficDelayMinutes,
        targetEffortWatts: trip.route.targetEffortWatts,
      },
      office: {
        showerChangeMinutes: trip.office.showerChangeMinutes,
        lockerRefuelMinutes: trip.office.lockerRefuelMinutes,
        targetGateArrivalTime: trip.office.targetGateArrivalTime,
      },
    };
    Object.assign(nextRuleSettings, chipDef.defaultSettings);

    const changes = chipDef.applyPresets(updatedTrip);
    updatedTrip = {
      ...updatedTrip,
      ...changes,
      physics: {
        ...updatedTrip.physics,
        ...(changes.physics || {}),
      },
      route: {
        ...updatedTrip.route,
        ...(changes.route || {}),
      },
      office: {
        ...updatedTrip.office,
        ...(changes.office || {}),
      },
    };

    if (chipId === 'shower-locker' && effectiveMode === 'COMMUTE') {
      updatedTrip.office = syncCommuteGateArrivalFromShift(updatedTrip.office);
    }
  } else if (exists) {
    const snap = prevSnapshots[chipId];
    delete prevSnapshots[chipId];

    // 1. Revert additive / multiplicative chips cleanly
    if (chipId === 'bad-weather-prep') {
      updatedTrip.physics.gearWeightKg = Math.max(0, Number((updatedTrip.physics.gearWeightKg - 0.8).toFixed(2)));
    } else if (chipId === 'hi-vis-vest') {
      updatedTrip.physics.gearWeightKg = Math.max(0, Number((updatedTrip.physics.gearWeightKg - 0.2).toFixed(2)));
    } else if (chipId === 'solar-power-recharge') {
      const bankMass = Number(trip.ruleSettings?.powerBankMassKg ?? 0.6);
      updatedTrip.physics.gearWeightKg = Math.max(0, Number((updatedTrip.physics.gearWeightKg - bankMass).toFixed(2)));
    } else if (chipId === 'emergency-first-aid') {
      updatedTrip.physics.gearWeightKg = Math.max(0, Number((updatedTrip.physics.gearWeightKg - 0.4).toFixed(2)));
    } else if (chipId === 'bike-lane-priority') {
      updatedTrip.route.urbanTrafficDelayMinutes = snap
        ? snap.route.urbanTrafficDelayMinutes
        : (updatedTrip.route.urbanTrafficDelayMinutes || 6) + 2;
    } else if (chipId === 'paceline-drafting') {
      updatedTrip.physics.cda = snap
        ? snap.physics.cda
        : Number(Math.min(0.45, updatedTrip.physics.cda / 0.85).toFixed(3));
      updatedTrip.route.targetSpeedKmH = snap ? snap.route.targetSpeedKmH : 28;
    } else {
      // 2. Revert non-additive overrides using snapshot or archetype baseline
      const defaultSpeed =
        effectiveMode === 'SPORT'
          ? 28
          : effectiveMode === 'COMMUTE'
          ? 24
          : effectiveMode === 'ESCAPADE'
          ? 21
          : 20;
      const defaultArrival =
        effectiveMode === 'SPORT'
          ? '11:00'
          : effectiveMode === 'BIKEPACKING'
          ? '18:00'
          : effectiveMode === 'ESCAPADE'
          ? '15:00'
          : '08:30';

      if (chipId === 'cargo-laptop-pack') {
        const laptopMass = Number(trip.ruleSettings?.laptopCargoMassKg ?? 3.5);
        updatedTrip.physics.gearWeightKg = snap
          ? snap.physics.gearWeightKg
          : Math.max(1.0, Number((updatedTrip.physics.gearWeightKg - laptopMass).toFixed(2)));
      } else if (chipId === 'mountain-adventure') {
        updatedTrip.physics.gearWeightKg = snap ? snap.physics.gearWeightKg : 8.0;
        updatedTrip.physics.crr = snap ? snap.physics.crr : 0.006;
        updatedTrip.office.targetGateArrivalTime = snap ? snap.office.targetGateArrivalTime : defaultArrival;
      } else if (chipId === 'speed-challenge') {
        updatedTrip.physics.gearWeightKg = snap ? snap.physics.gearWeightKg : 8.0;
        updatedTrip.physics.cda = snap ? snap.physics.cda : 0.4;
        updatedTrip.route.targetSpeedKmH = snap ? snap.route.targetSpeedKmH : defaultSpeed;
      } else if (chipId === 'bivouac-camp') {
        updatedTrip.physics.gearWeightKg = snap ? snap.physics.gearWeightKg : 8.0;
        updatedTrip.office.targetGateArrivalTime = snap ? snap.office.targetGateArrivalTime : defaultArrival;
      } else if (chipId === 'picnic-outing' || chipId === 'photography-spots') {
        updatedTrip.physics.gearWeightKg = snap ? snap.physics.gearWeightKg : 2.5;
        if (chipId === 'photography-spots') {
          updatedTrip.office.targetGateArrivalTime = snap ? snap.office.targetGateArrivalTime : defaultArrival;
        }
      } else if (chipId === 'hill-climb' || chipId === 'climbing-kom-hunt') {
        updatedTrip.physics.gradientPercent = snap ? snap.physics.gradientPercent : 0.5;
      } else if (chipId === 'gravel-trail-master' || chipId === 'off-road-exploration') {
        updatedTrip.physics.crr = snap ? snap.physics.crr : 0.0055;
      } else if (chipId === 'family-friendly' || chipId === 'urban-discovery') {
        updatedTrip.route.urbanTrafficDelayMinutes = snap ? snap.route.urbanTrafficDelayMinutes : 8;
        if (chipId === 'family-friendly') {
          updatedTrip.route.targetSpeedKmH = snap ? snap.route.targetSpeedKmH : defaultSpeed;
        }
      } else if (
        chipId === 'fitness-boost' ||
        chipId === 'leisure-cruise' ||
        chipId === 'scenic-route' ||
        chipId === 'eco-friendly-path' ||
        chipId === 'interval-training' ||
        chipId === 'hydration-electrolytes' ||
        chipId === 'fast-group-ride' ||
        chipId === 'long-distance-endurance' ||
        chipId === 'scenic-waterways'
      ) {
        updatedTrip.route.targetSpeedKmH = snap ? snap.route.targetSpeedKmH : defaultSpeed;
        if (chipId === 'long-distance-endurance') {
          updatedTrip.office.targetGateArrivalTime = snap ? snap.office.targetGateArrivalTime : defaultArrival;
        }
      } else if (chipId === 'shower-locker') {
        updatedTrip.office.showerChangeMinutes = 0;
        if (effectiveMode === 'COMMUTE') {
          updatedTrip.office = syncCommuteGateArrivalFromShift(updatedTrip.office);
        }
      } else if (chipId === 'spa-wellness') {
        updatedTrip.office.lockerRefuelMinutes = snap ? snap.office.lockerRefuelMinutes : 10;
      } else if (chipId === 'bed-and-breakfast') {
        updatedTrip.office.targetGateArrivalTime = snap ? snap.office.targetGateArrivalTime : defaultArrival;
      }

      // Re-apply remaining active non-additive chips so overlapping active presets win cleanly
      for (const activeId of nextChips) {
        if (ADDITIVE_CHIP_IDS.has(activeId)) continue;
        const activeDef = findChipDef(activeId);
        if (!activeDef) continue;
        const activeChanges = activeDef.applyPresets(updatedTrip);
        updatedTrip = {
          ...updatedTrip,
          physics: { ...updatedTrip.physics, ...(activeChanges.physics || {}) },
          route: { ...updatedTrip.route, ...(activeChanges.route || {}) },
          office: { ...updatedTrip.office, ...(activeChanges.office || {}) },
        };
      }
    }
  }

  const resolvedMode = getArchetypeFromTag(updatedTrip.tag, updatedTrip.name);
  const effectiveTag = resolvedMode === 'COMMUTE' ? 'VÉLOTAF' : resolvedMode;
  const savedSpecs = loadRiderBikeSpecs();
  const savedBike = getActiveBike(savedSpecs);
  const freshChecklist = generateTripChecklist(
    effectiveTag,
    updatedTrip.route?.distanceKm,
    updatedTrip.weather,
    {
      lang,
      customChips: nextChips,
      isTubeless: Boolean(savedBike?.isTubeless),
      carbTargetGPerHr: savedSpecs.carbTargetGPerHr ?? 60,
      nutritionPreference: savedSpecs.nutritionPreference ?? 'mixed',
      bidonSizeMl: savedSpecs.bidonSizeMl,
      frameBottleSlots: savedSpecs.frameBottleSlots,
    }
  );
  const checkedMap = new Map((updatedTrip.checklist || []).map((item) => [item.id, item.checked]));
  updatedTrip.checklist = freshChecklist.map((item) => ({
    ...item,
    checked: checkedMap.has(item.id) ? Boolean(checkedMap.get(item.id)) : item.checked,
  }));

  return updatedTrip;
}

/**
 * Live-syncs edits inside active Chip Rule Cards directly into physics, route, and office state
 */
export function applyRuleSettingChange(trip: TripProfile, key: string, value: any): TripProfile {
  const prevSettings = trip.ruleSettings || {};
  const nextSettings = { ...prevSettings, [key]: value };
  const effectiveMode = getArchetypeFromTag(trip.tag, trip.name);

  let nextPhysics = { ...trip.physics };
  let nextRoute = { ...trip.route };
  let nextOffice = { ...trip.office };

  if (key === 'laptopCargoMassKg') {
    const prevMass = Number(prevSettings.laptopCargoMassKg ?? 3.5);
    const nextMass = Math.max(0, Number(value) || 0);
    const delta = nextMass - prevMass;
    nextPhysics.gearWeightKg = Math.max(0, Number((nextPhysics.gearWeightKg + delta).toFixed(2)));
  } else if (key === 'powerBankMassKg') {
    const prevMass = Number(prevSettings.powerBankMassKg ?? 0.6);
    const nextMass = Math.max(0, Number(value) || 0);
    const delta = nextMass - prevMass;
    nextPhysics.gearWeightKg = Math.max(0, Number((nextPhysics.gearWeightKg + delta).toFixed(2)));
  } else if (
    key === 'speedLimitKmH' ||
    key === 'speedCapKmH' ||
    key === 'sharedPathSpeedLimitKmH' ||
    key === 'targetPacelineSpeedKmH' ||
    key === 'pelotonAvgSpeedKmH' ||
    key === 'waterwaySpeedCapKmH'
  ) {
    const speed = Number(value);
    if (Number.isFinite(speed) && speed >= 5) {
      nextRoute.targetSpeedKmH = speed;
    }
  } else if (
    key === 'targetWattsFloor' ||
    key === 'targetPowerFloorWatts' ||
    key === 'intervalWatts' ||
    key === 'komPeakWatts'
  ) {
    const watts = Number(value);
    if (Number.isFinite(watts) && watts >= 60) {
      nextRoute.targetEffortWatts = watts;
    }
  } else if (key === 'urbanTrafficBufferMin') {
    const buf = Number(value);
    if (Number.isFinite(buf) && buf >= 0) {
      nextRoute.urbanTrafficDelayMinutes = buf;
    }
  } else if (key === 'showerMinutes') {
    const mins = Math.max(0, Number(value) || 0);
    nextOffice.showerChangeMinutes = mins;
    if (effectiveMode === 'COMMUTE') {
      nextOffice = syncCommuteGateArrivalFromShift(nextOffice);
    }
  } else if (key === 'lockerRefuelMinutes' || key === 'campBreakdownMin') {
    const mins = Math.max(0, Number(value) || 0);
    nextOffice.lockerRefuelMinutes = mins;
    if (effectiveMode === 'COMMUTE' && key === 'lockerRefuelMinutes') {
      nextOffice = syncCommuteGateArrivalFromShift(nextOffice);
    }
  } else if (
    key === 'bivouacCurfewTime' ||
    key === 'bivouacCurfew' ||
    key === 'hotelCheckinDeadline' ||
    key === 'goldenHourTarget' ||
    key === 'hostGreetingTime'
  ) {
    if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
      nextOffice.targetGateArrivalTime = value;
    }
  } else if (key === 'dinnerReservationTime') {
    if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
      nextOffice.targetGateArrivalTime = subtractMinutesFromTime(value, 60);
    }
  }

  return {
    ...trip,
    ruleSettings: nextSettings,
    physics: nextPhysics,
    route: nextRoute,
    office: nextOffice,
  };
}
