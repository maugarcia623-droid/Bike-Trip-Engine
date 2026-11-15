import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/components/arc/lib/motion-tokens';
import styles from './expanding-button-group.module.css';

export type ExpandingButtonGroupSize = 'sm' | 'md' | 'lg';
export type ExpandingButtonGroupVariant = 'secondary' | 'ghost';

export interface ExpandingButtonGroupItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
}

export interface ExpandingButtonGroupProps {
  items: ExpandingButtonGroupItem[];
  size?: ExpandingButtonGroupSize;
  variant?: ExpandingButtonGroupVariant;
  className?: string;
  'aria-label'?: string;
}

export const ExpandingButtonGroup = React.forwardRef<HTMLDivElement, ExpandingButtonGroupProps>(
  ({ items, size = 'md', variant = 'secondary', className, 'aria-label': ariaLabel }, ref) => {
    const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

    const groupClasses = [styles.group, styles[size], styles[variant], className]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} role="group" aria-label={ariaLabel} className={groupClasses}>
        {items.map((item) => {
          const isExpanded = hoveredKey === item.key || item.active;
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              aria-label={item.label}
              onClick={item.onClick}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey((prev) => (prev === item.key ? null : prev))}
              onFocus={() => setHoveredKey(item.key)}
              onBlur={() => setHoveredKey((prev) => (prev === item.key ? null : prev))}
              className={[styles.item, item.active ? styles.active : ''].filter(Boolean).join(' ')}
            >
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.span
                    key="label"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={springs.snappy}
                    className={styles.labelWrapper}
                  >
                    <span className={styles.label}>{item.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    );
  }
);

ExpandingButtonGroup.displayName = 'ExpandingButtonGroup';
export default ExpandingButtonGroup;
