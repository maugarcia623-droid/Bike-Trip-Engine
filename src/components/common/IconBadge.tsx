import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  LayeredTokenTheme,
  getLayeredThemeTokens,
} from '../../tokens/chipTokens';

export type IconBadgeSize = 'xs' | 'sm' | 'md' | 'spine' | 'lg' | 'xl';
export type IconBadgeShape = 'circle' | 'rounded';

const SIZE_CONFIG: Record<IconBadgeSize, { box: string; icon: string }> = {
  xs: {
    box: 'w-6 h-6',
    icon: 'w-3.5 h-3.5',
  },
  sm: {
    box: 'w-7 h-7',
    icon: 'w-4 h-4',
  },
  md: {
    box: 'w-8 h-8',
    icon: 'w-4 h-4',
  },
  spine: {
    box: 'w-9 h-9 sm:w-10 sm:h-10',
    icon: 'w-4 h-4 sm:w-5 sm:h-5',
  },
  lg: {
    box: 'w-10 h-10',
    icon: 'w-5 h-5',
  },
  xl: {
    box: 'w-11 h-11 sm:w-12 sm:h-12',
    icon: 'w-5 h-5 sm:w-6 sm:h-6',
  },
};

export interface IconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  theme: LayeredTokenTheme;
  icon: React.ElementType;
  size?: IconBadgeSize;
  shape?: IconBadgeShape;
  isSelected?: boolean;
  /**
   * Renders an opaque card-surface backing behind the tinted dark surface
   * so underlying spine lines or chart bars never bleed through `dark:bg-*-950/40`.
   */
  solidBacker?: boolean;
  iconClassName?: string;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  theme,
  icon: Icon,
  size = 'md',
  shape = 'circle',
  isSelected = false,
  solidBacker = false,
  iconClassName,
  className,
  ...rest
}) => {
  const tokens = getLayeredThemeTokens(theme);
  const sizeSpec = SIZE_CONFIG[size];
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  const innerSurface = (
    <div
      className={twMerge(
        clsx(
          'flex items-center justify-center shrink-0 transition-all duration-150',
          solidBacker ? 'w-full h-full' : sizeSpec.box,
          radiusClass,
          tokens.surface,
          tokens.primary,
          CHIP_DUOTONE_ISOLATION_CLASSES,
          CHIP_RING_BASE,
          isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED,
          !solidBacker && className
        )
      )}
      {...(!solidBacker ? rest : {})}
    >
      <Icon
        className={twMerge(clsx(sizeSpec.icon, 'flex-shrink-0 text-current', iconClassName))}
        aria-hidden="true"
      />
    </div>
  );

  if (solidBacker) {
    return (
      <div
        className={twMerge(
          clsx('bg-card shrink-0', sizeSpec.box, radiusClass, className)
        )}
        {...rest}
      >
        {innerSurface}
      </div>
    );
  }

  return innerSurface;
};

export default IconBadge;
