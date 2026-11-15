import * as React from 'react';
import styles from './floating-button-group.module.css';

export type FloatingButtonGroupSize = 'sm' | 'md' | 'lg';

export interface FloatingButtonGroupItem {
  key: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
}

export interface FloatingButtonGroupProps {
  items: FloatingButtonGroupItem[];
  size?: FloatingButtonGroupSize;
  className?: string;
  'aria-label'?: string;
}

export const FloatingButtonGroup = React.forwardRef<HTMLDivElement, FloatingButtonGroupProps>(
  ({ items, size = 'md', className, 'aria-label': ariaLabel }, ref) => {
    const groupClasses = [styles.toolbar, styles[size], className].filter(Boolean).join(' ');

    return (
      <div ref={ref} role="toolbar" aria-label={ariaLabel} className={groupClasses}>
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

FloatingButtonGroup.displayName = 'FloatingButtonGroup';
export default FloatingButtonGroup;
