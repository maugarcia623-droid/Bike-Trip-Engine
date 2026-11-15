import React, { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./confirm-morph.module.css";

export type ConfirmMorphState = "idle" | "confirming" | "pending" | "done" | "error";

export interface ConfirmMorphProps {
  /** The resting label, such as "Delete project". */
  label: React.ReactNode;
  /** A plain icon before the resting label. */
  icon?: React.ReactNode;
  /** The question while confirming, such as "Delete 3 files?". */
  prompt?: React.ReactNode;
  /** Confirm button label. Default: "Delete" */
  confirmLabel?: string;
  /** Cancel button label. Default: "Cancel" */
  cancelLabel?: string;
  /** Shown beside the spinner while onConfirm resolves. Default: "Deleting" */
  pendingLabel?: string;
  /** Result label. Default: "Deleted" */
  doneLabel?: string;
  /** Error label. Default: "Couldn’t finish" */
  errorLabel?: string;
  /** Retry button label on the error face. Default: "Retry" */
  retryLabel?: string;
  /** Undo button label. Default: "Undo" */
  undoLabel?: string;
  /** Shown beside the spinner while onUndo resolves. Default: "Restoring" */
  undoingLabel?: string;
  /** danger gives the confirm button the danger colour; neutral gives it the accent. Default: "danger" */
  tone?: "danger" | "neutral";
  /** press, hold, or countdown. Default: "press" */
  confirmMode?: "press" | "hold" | "countdown";
  /** Milliseconds the confirm button must be held in hold mode. Default: 1000 */
  holdDuration?: number;
  /** Seconds counted down before the action runs in countdown mode. Default: 3 */
  countdown?: number;
  /** Text before the seconds in countdown mode. */
  countdownLabel?: string;
  /** Runs on confirm. */
  onConfirm?: () => void | Promise<unknown>;
  /** Adds Undo to the result. */
  onUndo?: () => void | Promise<unknown>;
  /** Called when the question is cancelled. */
  onCancel?: () => void;
  /** Controlled state. */
  state?: ConfirmMorphState;
  /** Starting state when uncontrolled. Default: "idle" */
  defaultState?: ConfirmMorphState;
  /** Called on every state change. */
  onStateChange?: (state: ConfirmMorphState) => void;
  /** Milliseconds before an unanswered question returns to rest. Default: 6000 */
  confirmTimeout?: number;
  /** Milliseconds a result stays before returning to rest. Default: 5000 */
  resultTimeout?: number;
  /** A press outside the control cancels an open question. Default: true */
  cancelOnOutsidePress?: boolean;
  /** Disables the resting button. Default: false */
  disabled?: boolean;
  /** Class on the root. */
  className?: string;
}

export const ConfirmMorph = forwardRef<HTMLDivElement, ConfirmMorphProps>(function ConfirmMorph(
  {
    label,
    icon,
    prompt,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    pendingLabel = "Deleting",
    doneLabel = "Deleted",
    errorLabel = "Couldn’t finish",
    retryLabel = "Retry",
    undoLabel = "Undo",
    tone = "danger",
    onConfirm,
    onUndo,
    onCancel,
    state: controlledState,
    defaultState = "idle",
    onStateChange,
    confirmTimeout = 6000,
    resultTimeout = 5000,
    cancelOnOutsidePress = true,
    disabled = false,
    className,
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const [internalState, setInternalState] = useState<ConfirmMorphState>(defaultState);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentState = controlledState !== undefined ? controlledState : internalState;

  const updateState = (next: ConfirmMorphState) => {
    if (controlledState === undefined) setInternalState(next);
    onStateChange?.(next);
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (currentState === "confirming" && confirmTimeout > 0) {
      timerRef.current = setTimeout(() => {
        updateState("idle");
        onCancel?.();
      }, confirmTimeout);
    } else if (currentState === "done" && resultTimeout > 0) {
      timerRef.current = setTimeout(() => {
        updateState("idle");
      }, resultTimeout);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentState, confirmTimeout, resultTimeout]);

  useEffect(() => {
    if (currentState !== "confirming" || !cancelOnOutsidePress) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        updateState("idle");
        onCancel?.();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        updateState("idle");
        onCancel?.();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentState, cancelOnOutsidePress]);

  const handleConfirm = async () => {
    if (!onConfirm) {
      updateState("done");
      return;
    }
    updateState("pending");
    try {
      await onConfirm();
      updateState("done");
    } catch {
      updateState("error");
    }
  };

  const handleUndo = async () => {
    if (!onUndo) return;
    updateState("pending");
    try {
      await onUndo();
      updateState("idle");
    } catch {
      updateState("error");
    }
  };

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={clsx(styles.root, className)}
    >
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {currentState === "confirming"
          ? typeof prompt === "string"
            ? prompt
            : `${String(label)}?`
          : currentState === "pending"
          ? pendingLabel
          : currentState === "done"
          ? doneLabel
          : currentState === "error"
          ? errorLabel
          : ""}
      </span>

      <AnimatePresence mode="popLayout" initial={false}>
        {currentState === "idle" && (
          <motion.button
            key="idle"
            type="button"
            disabled={disabled}
            data-arc-control=""
            onClick={() => updateState("confirming")}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={
              reduceMotion ? { duration: 0 } : motionTokens.spring.morph
            }
            className={styles.trigger}
          >
            {icon}
            <span>{label}</span>
          </motion.button>
        )}

        {currentState === "confirming" && (
          <motion.div
            key="confirming"
            role="group"
            aria-label={typeof prompt === "string" ? prompt : `${String(label)}?`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={
              reduceMotion ? { duration: 0 } : motionTokens.spring.morph
            }
            className={styles.bar}
          >
            <span className={styles.prompt}>{prompt ?? `${String(label)}?`}</span>
            <button
              type="button"
              data-arc-control=""
              onClick={() => {
                updateState("idle");
                onCancel?.();
              }}
              className={styles.cancelBtn}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              data-arc-control=""
              onClick={handleConfirm}
              className={clsx(
                styles.confirmBtn,
                tone === "danger" ? styles.confirmDanger : styles.confirmNeutral
              )}
            >
              {confirmLabel}
            </button>
          </motion.div>
        )}

        {currentState === "pending" && (
          <motion.div
            key="pending"
            aria-busy="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.bar}
          >
            <span className={styles.spinner} aria-hidden="true" />
            <span className={styles.prompt}>{pendingLabel}</span>
          </motion.div>
        )}

        {currentState === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.bar}
          >
            <Check size={14} strokeWidth={2.2} style={{ color: "var(--success, #3D9A00)" }} />
            <span className={styles.prompt}>{doneLabel}</span>
            {onUndo && (
              <button
                type="button"
                data-arc-control=""
                onClick={handleUndo}
                className={styles.cancelBtn}
              >
                {undoLabel}
              </button>
            )}
          </motion.div>
        )}

        {currentState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.bar}
          >
            <AlertCircle size={14} style={{ color: "var(--danger, #FF3B30)" }} />
            <span className={styles.prompt}>{errorLabel}</span>
            <button
              type="button"
              data-arc-control=""
              onClick={handleConfirm}
              className={clsx(styles.confirmBtn, styles.confirmDanger)}
            >
              {retryLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ConfirmMorph;
