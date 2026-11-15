import * as React from 'react';
import { motion } from 'motion/react';
import { springs } from '@/components/arc/lib/motion-tokens';
import styles from './segmented-control.module.css';

export type SegmentedControlSize = 'sm' | 'md';

export interface SegmentedControlItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  items: SegmentedControlItem<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  size?: SegmentedControlSize;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function SegmentedControl<T extends string = string>({
  items,
  value: controlledValue,
  defaultValue,
  onChange,
  size = 'md',
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const layoutId = React.useId();
  const [internalValue, setInternalValue] = React.useState<T | undefined>(
    defaultValue ?? items[0]?.value
  );
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleSelect = (val: T) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

  const rootClasses = [
    styles.root,
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={rootClasses}>
      {items.map((item) => {
        const isSelected = item.value === activeValue;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={item['aria-label']}
            disabled={item.disabled}
            onClick={() => handleSelect(item.value)}
            className={[styles.option, isSelected ? styles.selected : '']
              .filter(Boolean)
              .join(' ')}
          >
            {isSelected && (
              <motion.span
                layoutId={`arc-seg-indicator-${layoutId}`}
                transition={springs.snappy}
                className={styles.indicator}
                aria-hidden="true"
              />
            )}
            <span className={styles.content}>
              {item.icon && (
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label && <span className={styles.label}>{item.label}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
