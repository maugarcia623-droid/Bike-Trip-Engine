import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import styles from "./split-button.module.css";

export interface SplitButtonAction {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
}

export interface SplitButtonProps {
  /** Main action label. */
  label: string;
  /** Menu items. */
  actions: SplitButtonAction[];
  /** Runs the main action. */
  onClick?: () => void;
  /** Leading icon on the main half. */
  icon?: React.ReactNode;
  /** Visual weight of both halves. Default: "primary" */
  variant?: "primary" | "secondary";
  /** Disables both the main action and the menu trigger. */
  disabled?: boolean;
  /** Extra class on the root. */
  className?: string;
}

export function SplitButton({
  label,
  actions,
  onClick,
  icon,
  variant = "primary",
  disabled = false,
  className,
}: SplitButtonProps) {
  return (
    <div className={clsx(styles.root, styles[variant], className)}>
      <button
        type="button"
        disabled={disabled}
        data-arc-control=""
        onClick={onClick}
        className={styles.mainBtn}
      >
        {icon}
        <span>{label}</span>
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            data-arc-control=""
            aria-label={`${label} more actions`}
            className={styles.menuBtn}
          >
            <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className={styles.menu}
          >
            {actions.map((action, idx) => (
              <DropdownMenu.Item
                key={`${action.label}-${idx}`}
                disabled={action.disabled}
                data-destructive={action.destructive || undefined}
                onSelect={() => action.onSelect?.()}
                className={styles.item}
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export default SplitButton;
