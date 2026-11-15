import * as React from 'react';
import styles from './toggle-group.module.css';

export type ToggleGroupSize = 'sm' | 'md';

export interface ToggleGroupItem {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface ToggleGroupSingleProps {
  type?: 'single';
  items: ToggleGroupItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: ToggleGroupSize;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export interface ToggleGroupMultipleProps {
  type: 'multiple';
  items: ToggleGroupItem[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  size?: ToggleGroupSize;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>((props, ref) => {
  const { items, size = 'md', disabled = false, className, 'aria-label': ariaLabel } = props;
  const isMultiple = props.type === 'multiple';

  const [internalSingle, setInternalSingle] = React.useState<string>(
    !isMultiple ? (props.defaultValue ?? '') : ''
  );
  const [internalMulti, setInternalMulti] = React.useState<string[]>(
    isMultiple ? (props.defaultValue ?? []) : []
  );

  const isPressed = (itemValue: string) => {
    if (isMultiple) {
      const current = props.value !== undefined ? props.value : internalMulti;
      return current.includes(itemValue);
    }
    const current = props.value !== undefined ? props.value : internalSingle;
    return current === itemValue;
  };

  const handleToggle = (itemValue: string) => {
    if (isMultiple) {
      const current = props.value !== undefined ? props.value : internalMulti;
      const next = current.includes(itemValue)
        ? current.filter((v) => v !== itemValue)
        : [...current, itemValue];
      if (props.value === undefined) setInternalMulti(next);
      props.onValueChange?.(next);
    } else {
      const current = props.value !== undefined ? props.value : internalSingle;
      const next = current === itemValue ? '' : itemValue;
      if (props.value === undefined) setInternalSingle(next);
      props.onValueChange?.(next);
    }
  };

  const rootClasses = [styles.root, styles[size], className].filter(Boolean).join(' ');

  return (
    <div ref={ref} role="group" aria-label={ariaLabel} className={rootClasses}>
      {items.map((item) => {
        const pressed = isPressed(item.value);
        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled || item.disabled}
            aria-pressed={pressed}
            aria-label={item['aria-label']}
            onClick={() => handleToggle(item.value)}
            className={[styles.item, pressed ? styles.pressed : ''].filter(Boolean).join(' ')}
          >
            {item.icon && (
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label && <span className={styles.label}>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
});

ToggleGroup.displayName = 'ToggleGroup';
export default ToggleGroup;
