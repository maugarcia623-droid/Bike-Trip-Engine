import React, { forwardRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { clsx } from "clsx";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Use one primary action per surface. Default: "primary" */
  variant?: ButtonVariant;
  /** Height and padding. Default: "md" */
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy, and swallows clicks while keeping focus. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    type = "button",
    onClick,
    className,
    children,
    ...props
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const isPrimitiveLabel = typeof children === "string" || typeof children === "number";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || disabled || undefined}
      data-arc-control=""
      data-variant={variant}
      data-size={size}
      onClick={handleClick}
      className={clsx(styles.button, styles[variant], styles[size], className)}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {isPrimitiveLabel ? (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(children)}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(2px)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
            transition={
              reduceMotion
                ? { duration: motionTokens.duration.instant }
                : motionTokens.spring.snappy
            }
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
          >
            {children}
          </motion.span>
        </AnimatePresence>
      ) : (
        children
      )}
    </button>
  );
});

export default Button;
