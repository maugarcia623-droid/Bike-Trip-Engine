import React, { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./action-button.module.css";

export interface ActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Idle label and accessible name. */
  label: string;
  /** Runs on press. The pending state lasts until the promise settles. */
  onAction: () => void | Promise<void>;
  /** Label while onAction runs. Default: "Saving" */
  pendingLabel?: string;
  /** Label after onAction resolves. Default: "Saved" */
  successLabel?: string;
  /** Delay before returning to idle after success. 0 keeps the success state. Default: 2400 */
  resetAfterMs?: number;
  /** Called when onAction rejects; the button returns to idle. */
  onActionError?: (error: unknown) => void;
  /** Optional custom leading icon in idle state. */
  icon?: React.ReactNode;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    label,
    onAction,
    pendingLabel = "Saving",
    successLabel = "Saved",
    resetAfterMs = 2400,
    onActionError,
    icon,
    disabled = false,
    type = "button",
    className,
    ...props
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<"idle" | "pending" | "success">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const currentLabel =
    status === "pending" ? pendingLabel : status === "success" ? successLabel : label;

  const handlePress = async () => {
    if (disabled || status === "pending") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("pending");
    try {
      await onAction();
      setStatus("success");
      if (resetAfterMs > 0) {
        timerRef.current = setTimeout(() => {
          setStatus("idle");
        }, resetAfterMs);
      }
    } catch (error) {
      setStatus("idle");
      onActionError?.(error);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={status === "pending" || undefined}
      aria-disabled={disabled || status === "pending" || undefined}
      data-arc-control=""
      data-state={status}
      onClick={handlePress}
      className={clsx(styles.root, className)}
      {...props}
    >
      <span className={styles.srOnly}>{label}</span>
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {status !== "idle" ? currentLabel : ""}
      </span>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status + currentLabel}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
          transition={
            reduceMotion ? { duration: motionTokens.duration.instant } : motionTokens.spring.snappy
          }
          aria-hidden="true"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
        >
          {status === "pending" ? (
            <span className={styles.spinner} />
          ) : status === "success" ? (
            <Check size={16} strokeWidth={2.25} />
          ) : (
            icon
          )}
          <span>{currentLabel}</span>
          {status === "idle" && !icon && <ArrowRight size={15} strokeWidth={2} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
});

export default ActionButton;
