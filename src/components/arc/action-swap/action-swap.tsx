import React, { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { clsx } from "clsx";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./action-swap.module.css";

export type ActionSwapTone = "neutral" | "accent" | "success" | "warning" | "quiet";

export interface ActionSwapState {
  /** Stable id used by value and onValueChange. */
  id: string;
  /** Visible label and accessible name. */
  label: string;
  /** Leading icon, sized at 16px. */
  icon?: React.ReactNode;
  /** Fill color. Default: "neutral" */
  tone?: ActionSwapTone;
  /** Shown while onAction runs on the way into this state. */
  pendingLabel?: string;
  /** Milliseconds to hold this state before advancing on its own. */
  holdFor?: number;
}

export interface ActionSwapProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick" | "onChange" | "value"
  > {
  /** Ordered states. Each press moves to the next and wraps around. */
  states: ActionSwapState[];
  /** Controlled state id. */
  value?: string;
  /** Initial state id when uncontrolled. */
  defaultValue?: string;
  /** Called when the control commits to a new state. */
  onValueChange?: (value: string, state: ActionSwapState) => void;
  /** Runs on press. Return a promise to show a working phase. */
  onAction?: (next: ActionSwapState, current: ActionSwapState) => void | PromiseLike<unknown>;
  /** Label shown for 1.8s after onAction rejects or throws. Default: "Try again" */
  failureLabel?: string;
  /** Height and padding. Default: "md" */
  size?: "sm" | "md" | "lg";
}

export const ActionSwap = forwardRef<HTMLButtonElement, ActionSwapProps>(function ActionSwap(
  {
    states,
    value,
    defaultValue,
    onValueChange,
    onAction,
    failureLabel = "Try again",
    size = "md",
    disabled = false,
    className,
    ...props
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const [internalId, setInternalId] = useState<string>(
    defaultValue ?? states[0]?.id ?? ""
  );
  const [phase, setPhase] = useState<"idle" | "pending" | "failed">("idle");
  const [targetState, setTargetState] = useState<ActionSwapState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeId = value !== undefined ? value : internalId;
  const currentIndex = Math.max(
    0,
    states.findIndex((s) => s.id === activeId)
  );
  const currentState = states[currentIndex] ?? states[0];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "idle" && currentState?.holdFor && states.length > 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const nextIdx = (currentIndex + 1) % states.length;
        const nextSt = states[nextIdx];
        if (value === undefined) setInternalId(nextSt.id);
        onValueChange?.(nextSt.id, nextSt);
      }, currentState.holdFor);
    }
  }, [currentIndex, currentState, phase, states, value, onValueChange]);

  const handleClick = async () => {
    if (disabled || phase === "pending" || states.length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const nextIdx = (currentIndex + 1) % states.length;
    const nextState = states[nextIdx];

    if (onAction) {
      const result = onAction(nextState, currentState);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        setTargetState(nextState);
        setPhase("pending");
        try {
          await result;
          setPhase("idle");
          setTargetState(null);
          if (value === undefined) setInternalId(nextState.id);
          onValueChange?.(nextState.id, nextState);
        } catch {
          setPhase("failed");
          setTargetState(null);
          timerRef.current = setTimeout(() => setPhase("idle"), 1800);
        }
        return;
      }
    }

    if (value === undefined) setInternalId(nextState.id);
    onValueChange?.(nextState.id, nextState);
  };

  const tone: ActionSwapTone =
    phase === "failed" ? "warning" : currentState?.tone ?? "neutral";
  const displayLabel =
    phase === "pending"
      ? targetState?.pendingLabel ?? currentState?.label ?? ""
      : phase === "failed"
      ? failureLabel
      : currentState?.label ?? "";

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || states.length < 2}
      aria-label={displayLabel}
      aria-busy={phase === "pending" || undefined}
      aria-disabled={disabled || phase === "pending" || states.length < 2 || undefined}
      data-arc-control=""
      onClick={handleClick}
      className={clsx(styles.root, styles[size], styles[tone], className)}
      {...props}
    >
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {displayLabel}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${phase}-${activeId}-${displayLabel}`}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
          transition={
            reduceMotion ? { duration: motionTokens.duration.instant } : motionTokens.spring.morph
          }
          aria-hidden="true"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          {phase === "pending" ? (
            <span className={styles.spinner} />
          ) : (
            currentState?.icon
          )}
          <span>{displayLabel}</span>
        </motion.span>
      </AnimatePresence>
    </button>
  );
});

export default ActionSwap;
