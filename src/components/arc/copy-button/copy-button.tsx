import React, { forwardRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useCopyFeedback } from "../lib/use-copy-feedback";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./copy-button.module.css";

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** The text to copy. */
  value: string;
  /** Idle label and accessible name. Default: "Copy" */
  label?: string;
  /** Optional custom copied label. Default: "Copied" */
  copiedLabel?: string;
  /** Hides the text and shows only the icon. Default: false */
  iconOnly?: boolean;
  /** Bordered or borderless. Default: "outline" */
  variant?: "outline" | "plain";
  /** Disables the button. */
  disabled?: boolean;
  /** Called after a successful copy. */
  onCopied?: () => void;
  /** Extra class on the button. */
  className?: string;
}

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    label = "Copy",
    copiedLabel = "Copied",
    iconOnly = false,
    variant = "outline",
    disabled = false,
    onCopied,
    onClick,
    className,
    ...props
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const { state, copyCount, copy } = useCopyFeedback({ onCopied });

  const visibleText =
    state === "copied" ? copiedLabel : state === "failed" ? "Failed" : label;

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    await copy(value);
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={label}
      data-arc-control=""
      data-state={state}
      onClick={handleClick}
      className={clsx(
        styles.root,
        styles[variant],
        iconOnly && styles.iconOnly,
        className
      )}
      {...props}
    >
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {state === "copied"
          ? `${label}: ${copiedLabel}`
          : state === "failed"
          ? `${label}: Could not copy`
          : ""}
      </span>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${state}-${copyCount}`}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: motionTokens.duration.fast }}
          aria-hidden="true"
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
        >
          {state === "copied" ? (
            <Check size={15} strokeWidth={2.2} />
          ) : state === "failed" ? (
            <AlertCircle size={15} strokeWidth={2} />
          ) : (
            <Copy size={15} strokeWidth={1.85} />
          )}
        </motion.span>
      </AnimatePresence>

      {!iconOnly && (
        <span className={styles.labelGrid} aria-hidden="true">
          <span className={styles.ghostReserve}>{label}</span>
          <span className={styles.ghostReserve}>{copiedLabel}</span>
          <span className={styles.ghostReserve}>Failed</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.duration.fast }}
            >
              {visibleText}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    </button>
  );
});

export default CopyButton;
