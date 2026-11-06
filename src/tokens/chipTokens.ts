/**
 * Layered Design Token System for Interactive Chips & Badges
 *
 * Visual Layer Architecture (4 unified-hue layers):
 * - Layer 1 (Surface): Ultra-soft tinted pastel background (Light) / Recessed translucent dark tint (Dark)
 * - Layer 2 (Primary Details): Icon foreground path + Label typography at 100% saturation
 * - Layer 3 (Secondary Details): Icon backdrop path at ~30% visual weight (`opacity: 0.3`, matching unified hue)
 * - Layer 4 (Selection Ring): High-contrast 2px inset stroke visible ONLY when active/selected (zero layout shift)
 */

export const CHIP_THEMES = [
  'amber',
  'blue',
  'purple',
  'emerald',
  'orange',
  'teal',
  'lime',
  'sky',
  'rose',
  'yellow-vest',
] as const;

export type ChipTheme = (typeof CHIP_THEMES)[number];

export interface ChipModeTokens {
  /** Layer 1: Tinted surface background class */
  surface: string;
  /** Layer 2: Primary label & icon foreground saturation class */
  primary: string;
  /** Layer 4: Selected 2px inset ring color class */
  selectedRing: string;
}

export interface ChipThemeTokens {
  light: ChipModeTokens;
  dark: ChipModeTokens;
  /** Combined Light + Dark Layer 1 surface classes */
  surface: string;
  /** Combined Light + Dark Layer 2 text & primary icon classes */
  primary: string;
  /** Combined Light + Dark Layer 4 selected inset ring classes */
  selectedRing: string;
  /** Accent dot utility for optional status indicators */
  dot: string;
}

/**
 * Layer 4 Zero-Layout-Shift Ring Primitives
 * Always uses `ring-2 ring-inset` so toggling between unselected (`ring-transparent`)
 * and selected (`theme.selectedRing`) never alters box dimensions by a single pixel.
 */
export const CHIP_RING_BASE = 'ring-2 ring-inset';
export const CHIP_RING_UNSELECTED = 'ring-transparent';

/**
 * Layer 2 & Layer 3 Keyline Rounded Duotone Icon Isolation
 * - Sets `--icon-secondary: currentColor` and `--icon-secondary-opacity: 0.3` to isolate
 *   Keyline Duotone backdrop paths (`[fill-opacity="0.4"]`, `[stroke-opacity="0.4"]`)
 *   from global theme overrides and lock secondary weight to ~30% of the unified chip hue.
 * - Provides direct attribute fallbacks for standalone rendering.
 * - Isolates generic 2-path duotone SVGs (`svg:not(.keyline-icon)`) where `path:first-child`
 *   is the 100% foreground detail and `path:last-child` is the 30% backdrop shape.
 */
export const CHIP_ICON_ROOT_CLASSES = 'w-5 h-5 flex-shrink-0 text-current';

export const CHIP_DUOTONE_ISOLATION_CLASSES = [
  '[--icon-secondary:currentColor]',
  '[--icon-secondary-opacity:0.3]',
  '[&_svg_[fill-opacity="0.4"]]:fill-current',
  '[&_svg_[fill-opacity="0.4"]]:[fill-opacity:0.3]',
  '[&_svg_[stroke-opacity="0.4"]]:stroke-current',
  '[&_svg_[stroke-opacity="0.4"]]:[stroke-opacity:0.3]',
  '[&_svg:not(.keyline-icon):not([stroke])_path:first-child]:fill-current',
  '[&_svg:not(.keyline-icon)[stroke]_path:first-child]:stroke-current',
  '[&_svg:not(.keyline-icon)_path:first-child]:opacity-100',
  '[&_svg:not(.keyline-icon)_path:last-child:not(:first-child)]:fill-current',
  '[&_svg:not(.keyline-icon)_path:last-child:not(:first-child)]:opacity-30',
].join(' ');

/**
 * Complete 10-Palette Token Matrix
 * Strict static Tailwind class literals calibrated for perceptual luminance balance
 * across standard hues and the high-visibility `yellow-vest` brand theme.
 */
export const CHIP_TOKENS: Record<ChipTheme, ChipThemeTokens> = {
  amber: {
    light: {
      surface: 'bg-amber-50',
      primary: 'text-amber-800',
      selectedRing: 'ring-amber-500',
    },
    dark: {
      surface: 'dark:bg-amber-950/40',
      primary: 'dark:text-amber-300',
      selectedRing: 'dark:ring-amber-400',
    },
    surface: 'bg-amber-50 dark:bg-amber-950/40',
    primary: 'text-amber-800 dark:text-amber-300',
    selectedRing: 'ring-amber-500 dark:ring-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  blue: {
    light: {
      surface: 'bg-blue-50',
      primary: 'text-blue-700',
      selectedRing: 'ring-blue-600',
    },
    dark: {
      surface: 'dark:bg-blue-950/40',
      primary: 'dark:text-blue-300',
      selectedRing: 'dark:ring-blue-500',
    },
    surface: 'bg-blue-50 dark:bg-blue-950/40',
    primary: 'text-blue-700 dark:text-blue-300',
    selectedRing: 'ring-blue-600 dark:ring-blue-500',
    dot: 'bg-blue-600 dark:bg-blue-500',
  },
  purple: {
    light: {
      surface: 'bg-purple-50',
      primary: 'text-purple-700',
      selectedRing: 'ring-purple-600',
    },
    dark: {
      surface: 'dark:bg-purple-950/40',
      primary: 'dark:text-purple-300',
      selectedRing: 'dark:ring-purple-400',
    },
    surface: 'bg-purple-50 dark:bg-purple-950/40',
    primary: 'text-purple-700 dark:text-purple-300',
    selectedRing: 'ring-purple-600 dark:ring-purple-400',
    dot: 'bg-purple-600 dark:bg-purple-400',
  },
  emerald: {
    light: {
      surface: 'bg-emerald-50',
      primary: 'text-emerald-700',
      selectedRing: 'ring-emerald-600',
    },
    dark: {
      surface: 'dark:bg-emerald-950/40',
      primary: 'dark:text-emerald-300',
      selectedRing: 'dark:ring-emerald-500',
    },
    surface: 'bg-emerald-50 dark:bg-emerald-950/40',
    primary: 'text-emerald-700 dark:text-emerald-300',
    selectedRing: 'ring-emerald-600 dark:ring-emerald-500',
    dot: 'bg-emerald-600 dark:bg-emerald-500',
  },
  orange: {
    light: {
      surface: 'bg-orange-50',
      primary: 'text-orange-700',
      selectedRing: 'ring-orange-500',
    },
    dark: {
      surface: 'dark:bg-orange-950/40',
      primary: 'dark:text-orange-300',
      selectedRing: 'dark:ring-orange-400',
    },
    surface: 'bg-orange-50 dark:bg-orange-950/40',
    primary: 'text-orange-700 dark:text-orange-300',
    selectedRing: 'ring-orange-500 dark:ring-orange-400',
    dot: 'bg-orange-500 dark:bg-orange-400',
  },
  teal: {
    light: {
      surface: 'bg-teal-50',
      primary: 'text-teal-800',
      selectedRing: 'ring-teal-600',
    },
    dark: {
      surface: 'dark:bg-teal-950/40',
      primary: 'dark:text-teal-300',
      selectedRing: 'dark:ring-teal-400',
    },
    surface: 'bg-teal-50 dark:bg-teal-950/40',
    primary: 'text-teal-800 dark:text-teal-300',
    selectedRing: 'ring-teal-600 dark:ring-teal-400',
    dot: 'bg-teal-600 dark:bg-teal-400',
  },
  lime: {
    light: {
      surface: 'bg-lime-50',
      primary: 'text-lime-800',
      selectedRing: 'ring-lime-600',
    },
    dark: {
      surface: 'dark:bg-lime-950/40',
      primary: 'dark:text-lime-300',
      selectedRing: 'dark:ring-lime-400',
    },
    surface: 'bg-lime-50 dark:bg-lime-950/40',
    primary: 'text-lime-800 dark:text-lime-300',
    selectedRing: 'ring-lime-600 dark:ring-lime-400',
    dot: 'bg-lime-600 dark:bg-lime-400',
  },
  sky: {
    light: {
      surface: 'bg-sky-50',
      primary: 'text-sky-700',
      selectedRing: 'ring-sky-500',
    },
    dark: {
      surface: 'dark:bg-sky-950/40',
      primary: 'dark:text-sky-300',
      selectedRing: 'dark:ring-sky-400',
    },
    surface: 'bg-sky-50 dark:bg-sky-950/40',
    primary: 'text-sky-700 dark:text-sky-300',
    selectedRing: 'ring-sky-500 dark:ring-sky-400',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  rose: {
    light: {
      surface: 'bg-rose-50',
      primary: 'text-rose-700',
      selectedRing: 'ring-rose-500',
    },
    dark: {
      surface: 'dark:bg-rose-950/40',
      primary: 'dark:text-rose-300',
      selectedRing: 'dark:ring-rose-400',
    },
    surface: 'bg-rose-50 dark:bg-rose-950/40',
    primary: 'text-rose-700 dark:text-rose-300',
    selectedRing: 'ring-rose-500 dark:ring-rose-400',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  'yellow-vest': {
    light: {
      surface: 'bg-[#faffcb]',
      primary: 'text-[#4d5200]',
      selectedRing: 'ring-[#a3b300]',
    },
    dark: {
      surface: 'dark:bg-[#1f2203]',
      primary: 'dark:text-[#dfff00]',
      selectedRing: 'dark:ring-[#dfff00]',
    },
    surface: 'bg-[#faffcb] dark:bg-[#1f2203]',
    primary: 'text-[#4d5200] dark:text-[#dfff00]',
    selectedRing: 'ring-[#a3b300] dark:ring-[#dfff00]',
    dot: 'bg-[#a3b300] dark:bg-[#dfff00]',
  },
};

/**
 * Neutral Greyscale Token Set (for inactive navigation, "i" info icons, and neutral badges)
 * Shares the same 4-layer architecture: soft neutral surface, high-contrast greyscale foreground,
 * 30% greyscale secondary duotone backdrop, and zero-shift 2px inset ring.
 */
export const GREYSCALE_TOKENS: ChipThemeTokens = {
  light: {
    surface: 'bg-zinc-100',
    primary: 'text-zinc-600',
    selectedRing: 'ring-zinc-500',
  },
  dark: {
    surface: 'dark:bg-zinc-800/70',
    primary: 'dark:text-zinc-300',
    selectedRing: 'dark:ring-zinc-400',
  },
  surface: 'bg-zinc-100 dark:bg-zinc-800/70',
  primary: 'text-zinc-600 dark:text-zinc-300',
  selectedRing: 'ring-zinc-500 dark:ring-zinc-400',
  dot: 'bg-zinc-500 dark:bg-zinc-400',
};

/**
 * High-Visibility Solid Yellow-Vest Brand Button Primitives
 * For primary brand CTA buttons that remain bright yellow-vest (`bg-volt` / `bg-[#faffcb]`)
 * across both Light and Dark modes, ensuring text and duotone icons always inherit `#4d5200`
 * (100% foreground + 30% `#4d5200` backdrop) with zero-shift `#a3b300` ring.
 */
export const YELLOW_VEST_SOLID_CTA_CLASSES = [
  'bg-volt',
  'text-[#4d5200]',
  CHIP_RING_BASE,
  'ring-[#a3b300]',
  CHIP_DUOTONE_ISOLATION_CLASSES,
].join(' ');

export type LayeredTokenTheme = ChipTheme | 'greyscale';

export function getLayeredThemeTokens(theme: LayeredTokenTheme): ChipThemeTokens {
  return theme === 'greyscale' ? GREYSCALE_TOKENS : CHIP_TOKENS[theme];
}

export function isChipTheme(value: string): value is ChipTheme {
  return Object.prototype.hasOwnProperty.call(CHIP_TOKENS, value);
}
