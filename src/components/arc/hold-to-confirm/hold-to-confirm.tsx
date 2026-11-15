import React, { forwardRef, useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import styles from "./hold-to-confirm.module.css";

export interface HoldToConfirmProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  /** Instruction and action, such as "Hold to delete project". */
  label: string;
  /** Called once when the hold completes. */
  onConfirm: () => void;
  /** Label after the hold completes. Default: "Done" */
  confirmedLabel?: string;
  /** Hold length in milliseconds. Default: 1200 */
  duration?: number;
  /** Leading icon. Replaced by a drawn check when done. */
  icon?: React.ReactNode;
  /** Fill color. Default: "danger" */
  tone?: "danger" | "neutral";
  /** Controls the done state. */
  confirmed?: boolean;
  /** Reports when a hold starts and ends. */
  onHoldChange?: (holding: boolean) => void;
}

export const HoldToConfirm = forwardRef<HTMLButtonElement, HoldToConfirmProps>(
  function HoldToConfirm(
    {
      label,
      onConfirm,
      confirmedLabel = "Done",
      duration = 1200,
      icon,
      tone = "danger",
      confirmed: controlledConfirmed,
      onHoldChange,
      disabled = false,
      className,
      ...props
    },
    ref
  ) {
    const hintId = useId();
    const [internalConfirmed, setInternalConfirmed] = useState(false);
    const [holding, setHolding] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isDone =
      controlledConfirmed !== undefined ? controlledConfirmed : internalConfirmed;

    const startHold = () => {
      if (disabled || isDone || holding) return;
      setHolding(true);
      onHoldChange?.(true);
      timerRef.current = setTimeout(() => {
        setHolding(false);
        onHoldChange?.(false);
        if (controlledConfirmed === undefined) setInternalConfirmed(true);
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(12);
          } catch {
            // ignore
          }
        }
        onConfirm();
      }, duration);
    };

    const stopHold = () => {
      if (!holding) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setHolding(false);
      onHoldChange?.(false);
    };

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const activeLabel = isDone ? confirmedLabel : label;

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={activeLabel}
        aria-describedby={hintId}
        aria-disabled={disabled || isDone || undefined}
        data-arc-control=""
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            stopHold();
          }
        }}
        onBlur={stopHold}
        className={clsx(styles.root, styles[tone], className)}
        {...props}
      >
        <span id={hintId} className={styles.srOnly}>
          Press and hold for {(duration / 1000).toFixed(1)} seconds to confirm. With a keyboard, hold Space or Enter.
        </span>
        <span role="status" aria-live="polite" className={styles.srOnly}>
          {isDone ? confirmedLabel : ""}
        </span>
        <motion.span
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isDone ? 1 : holding ? 1 : 0 }}
          transition={
            holding
              ? { duration: duration / 1000, ease: "linear" }
              : { duration: 0.2, ease: "easeOut" }
          }
          className={clsx(
            styles.fill,
            tone === "danger" ? styles.fillDanger : styles.fillNeutral
          )}
        />
        <span
          className={styles.content}
          style={
            isDone || holding
              ? { color: tone === "danger" ? "#FFFFFF" : "#4D5200" }
              : undefined
          }
          aria-hidden="true"
        >
          {isDone ? (
            <Check size={15} strokeWidth={2.2} />
          ) : (
            icon ?? <Trash2 size={15} strokeWidth={1.85} />
          )}
          <span>{activeLabel}</span>
        </span>
      </button>
    );
  }
);

export default HoldToConfirm;
