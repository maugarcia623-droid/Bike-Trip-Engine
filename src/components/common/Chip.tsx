import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_ICON_ROOT_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';

export type { ChipTheme };

export interface ChipProps {
  label: string;
  theme:
    | 'amber'
    | 'blue'
    | 'purple'
    | 'emerald'
    | 'orange'
    | 'teal'
    | 'lime'
    | 'sky'
    | 'rose'
    | 'yellow-vest';
  icon: React.ElementType;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}

/**
 * Interactive Layered Chip Component
 *
 * Implements the 4-layer unified-hue visual hierarchy:
 * 1. Layer 1 (Surface): Soft pastel tint (Light) / Recessed translucent dark tint (Dark)
 * 2. Layer 2 (Primary Details): 100% saturated label + icon foreground path (`currentColor`)
 * 3. Layer 3 (Secondary Details): Duotone icon backdrop path isolated at 30% opacity (`currentColor`)
 * 4. Layer 4 (Selection Ring): Zero-shift `ring-2 ring-inset` (`ring-transparent` -> `theme.selectedRing`)
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  theme,
  icon: Icon,
  isSelected = false,
  onClick,
  className,
  title,
  disabled = false,
}) => {
  const tokens = CHIP_TOKENS[theme] ?? CHIP_TOKENS.amber;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={twMerge(
        clsx(
          // Base pill geometry & typography
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
          'font-rounded text-xs sm:text-[13px] font-semibold leading-none whitespace-nowrap',
          'transition-all duration-150 ease-out select-none',
          // Layer 1 (Surface) & Layer 2 (Primary Details)
          tokens.surface,
          tokens.primary,
          // Layer 3 (Keyline Rounded Duotone Icon Isolation)
          CHIP_DUOTONE_ISOLATION_CLASSES,
          // Layer 4 (Zero-Layout-Shift 2px Selection Ring)
          CHIP_RING_BASE,
          isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED,
          // Interactive states (preserving ring-2 ring-inset integrity on focus)
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110 active:scale-[0.98]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
          className
        )
      )}
    >
      <Icon
        size={20}
        className={CHIP_ICON_ROOT_CLASSES}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
};

export default Chip;
