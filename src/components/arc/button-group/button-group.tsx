import * as React from 'react';
import styles from './button-group.module.css';

export type ButtonGroupSize = 'sm' | 'md' | 'lg';
export type ButtonGroupVariant = 'secondary' | 'ghost';

export interface ButtonGroupItem {
  key: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
}

export interface ButtonGroupProps {
  items: ButtonGroupItem[];
  size?: ButtonGroupSize;
  variant?: ButtonGroupVariant;
  className?: string;
  'aria-label'?: string;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ items, size = 'md', variant = 'secondary', className, 'aria-label': ariaLabel }, ref) => {
    const groupClasses = [
      styles.group,
      styles[size],
      styles[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} role="group" aria-label={ariaLabel} className={groupClasses}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            aria-label={item['aria-label']}
            aria-pressed={item.active}
            onClick={item.onClick}
            className={[
              styles.item,
              item.active ? styles.active : '',
              !item.label && item.icon ? styles.iconOnly : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.icon && (
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label && <span className={styles.label}>{item.label}</span>}
          </button>
        ))}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';
export default ButtonGroup;
