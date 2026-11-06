import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';

export type BadgeVariant =
  | ChipTheme
  | 'zinc'
  | 'volt'
  | 'red';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeTonalTokens {
  /** Layer 1: Unified-hue surface classes (Light + Dark) */
  surface: string;
  /** Layer 2: Unified-hue primary text & icon foreground classes (Light + Dark) */
  primary: string;
  /** Layer 4: Selected 2px inset ring classes (Light + Dark) */
  selectedRing: string;
  /** Optional status indicator dot */
  dot: string;
  // Backward-compatible aliases
  container: string;
  text: string;
  border: string;
  hover: string;
  unselectedBg: string;
  unselectedText: string;
  unselectedHover: string;
  selectedBorder: string;
  selectedBg: string;
  selectedText: string;
  selectedHover: string;
}

function fromChipTheme(theme: ChipTheme): BadgeTonalTokens {
  const token = CHIP_TOKENS[theme];
  const interactiveHover = 'hover:brightness-[0.97] dark:hover:brightness-110';
  return {
    surface: token.surface,
    primary: token.primary,
    selectedRing: token.selectedRing,
    dot: token.dot,
    container: token.surface,
    text: token.primary,
    border: token.selectedRing,
    hover: interactiveHover,
    unselectedBg: token.surface,
    unselectedText: token.primary,
    unselectedHover: interactiveHover,
    selectedBorder: token.selectedRing,
    selectedBg: token.surface,
    selectedText: token.primary,
    selectedHover: interactiveHover,
  };
}

/**
 * Strict 4-Layer Visual Hierarchy & Zero-Shift Ring Token Map:
 * - Layer 1 (Surface): Ultra-soft tinted pastel background (Light) / Recessed translucent dark tint (Dark).
 * - Layer 2 (Primary Details): Icon foreground path + Label typography at 100% saturation.
 * - Layer 3 (Secondary Details): Icon backdrop path at ~30% visual weight (`currentColor`).
 * - Layer 4 (Selection Ring): High-contrast `ring-2 ring-inset` visible ONLY when active/selected (`ring-transparent` when unselected).
 */
export const BADGE_TONAL_MAP: Record<BadgeVariant, BadgeTonalTokens> = {
  amber: fromChipTheme('amber'),
  blue: fromChipTheme('blue'),
  purple: fromChipTheme('purple'),
  emerald: fromChipTheme('emerald'),
  orange: fromChipTheme('orange'),
  teal: fromChipTheme('teal'),
  lime: fromChipTheme('lime'),
  sky: fromChipTheme('sky'),
  rose: fromChipTheme('rose'),
  'yellow-vest': fromChipTheme('yellow-vest'),
  zinc: {
    surface: 'bg-zinc-100 dark:bg-zinc-900/50',
    primary: 'text-zinc-700 dark:text-zinc-300',
    selectedRing: 'ring-zinc-700 dark:ring-zinc-400',
    dot: 'bg-zinc-500 dark:bg-zinc-400',
    container: 'bg-zinc-100 dark:bg-zinc-900/50',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'ring-zinc-700 dark:ring-zinc-400',
    hover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    unselectedBg: 'bg-zinc-100 dark:bg-zinc-900/50',
    unselectedText: 'text-zinc-700 dark:text-zinc-300',
    unselectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    selectedBorder: 'ring-zinc-700 dark:ring-zinc-400',
    selectedBg: 'bg-zinc-100 dark:bg-zinc-900/50',
    selectedText: 'text-zinc-700 dark:text-zinc-300',
    selectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
  },
  volt: {
    surface: 'bg-[#faffcb] dark:bg-[#1f2203]/60',
    primary: 'text-[#4d5200] dark:text-[#dfff00]',
    selectedRing: 'ring-[#a3b300] dark:ring-[#dfff00]',
    dot: 'bg-[#a3b300] dark:bg-[#dfff00]',
    container: 'bg-[#faffcb] dark:bg-[#1f2203]/60',
    text: 'text-[#4d5200] dark:text-[#dfff00]',
    border: 'ring-[#a3b300] dark:ring-[#dfff00]',
    hover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    unselectedBg: 'bg-[#faffcb] dark:bg-[#1f2203]/60',
    unselectedText: 'text-[#4d5200] dark:text-[#dfff00]',
    unselectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    selectedBorder: 'ring-[#a3b300] dark:ring-[#dfff00]',
    selectedBg: 'bg-[#faffcb] dark:bg-[#1f2203]/60',
    selectedText: 'text-[#4d5200] dark:text-[#dfff00]',
    selectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
  },
  red: {
    surface: 'bg-red-50 dark:bg-red-950/40',
    primary: 'text-red-700 dark:text-red-300',
    selectedRing: 'ring-red-600 dark:ring-red-400',
    dot: 'bg-red-500 dark:bg-red-400',
    container: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'ring-red-600 dark:ring-red-400',
    hover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    unselectedBg: 'bg-red-50 dark:bg-red-950/40',
    unselectedText: 'text-red-700 dark:text-red-300',
    unselectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
    selectedBorder: 'ring-red-600 dark:ring-red-400',
    selectedBg: 'bg-red-50 dark:bg-red-950/40',
    selectedText: 'text-red-700 dark:text-red-300',
    selectedHover: 'hover:brightness-[0.97] dark:hover:brightness-110',
  },
};

const SIZE_MAP: Record<BadgeSize, { pill: string; icon: string; iconSize: number }> = {
  xs: {
    pill: 'px-2 py-0.5 text-[10px] gap-1',
    icon: 'w-4 h-4',
    iconSize: 16,
  },
  sm: {
    pill: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    icon: 'w-4 h-4',
    iconSize: 16,
  },
  md: {
    pill: 'px-3 py-1 text-xs gap-1.5',
    icon: 'w-5 h-5',
    iconSize: 20,
  },
  lg: {
    pill: 'px-4 py-1.5 text-sm gap-2',
    icon: 'w-5 h-5',
    iconSize: 20,
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  interactive?: boolean;
  selected?: boolean;
  asButton?: boolean;
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'zinc',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  interactive = false,
  selected,
  asButton = false,
  dot = false,
  className,
  children,
  onClick,
  ...rest
}) => {
  const tokens = BADGE_TONAL_MAP[variant] || BADGE_TONAL_MAP.zinc;
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const isInteractive = interactive || asButton || Boolean(onClick);
  const isSelectable = isInteractive || selected !== undefined;
  const isSelected = Boolean(selected);

  const Component = isInteractive ? 'button' : 'span';

  const iconElement = Icon ? (
    <Icon
      size={sizeConfig.iconSize}
      className={clsx(sizeConfig.icon, 'flex-shrink-0 text-current')}
      aria-hidden="true"
    />
  ) : null;

  return (
    <Component
      {...(isInteractive ? { type: 'button' } : {})}
      {...(isSelectable && isInteractive ? { 'aria-pressed': isSelected } : {})}
      onClick={onClick}
      className={twMerge(
        clsx(
          'inline-flex items-center max-w-full min-w-0 rounded-full font-rounded font-semibold leading-none whitespace-nowrap transition-all duration-150 ease-out',
          // Layer 1 (Surface) & Layer 2 (Primary Details)
          tokens.surface,
          tokens.primary,
          // Layer 3 (Keyline Rounded Duotone Icon Isolation)
          CHIP_DUOTONE_ISOLATION_CLASSES,
          // Layer 4 (Zero-Layout-Shift 2px Inset Selection Ring)
          CHIP_RING_BASE,
          isSelectable && isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED,
          sizeConfig.pill,
          isInteractive && [
            tokens.hover,
            'cursor-pointer select-none active:scale-[0.98]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
          ],
          className
        )
      )}
      {...(rest as any)}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', tokens.dot)}
          aria-hidden="true"
        />
      )}
      {iconPosition === 'left' && iconElement}
      {children && <span className="break-words leading-none">{children}</span>}
      {iconPosition === 'right' && iconElement}
    </Component>
  );
};

export default Badge;
