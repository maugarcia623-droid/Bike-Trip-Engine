import { useCallback, useEffect, useRef, useState } from "react";

export type CopyFeedbackState = "idle" | "copied" | "failed";

export interface UseCopyFeedbackOptions {
  resetAfterMs?: number;
  onCopied?: () => void;
}

export function useCopyFeedback(options: UseCopyFeedbackOptions = {}) {
  const { resetAfterMs = 2000, onCopied } = options;
  const [state, setState] = useState<CopyFeedbackState>("idle");
  const [copyCount, setCopyCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else if (typeof document !== "undefined") {
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        } else {
          throw new Error("Clipboard unavailable");
        }

        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(8);
          } catch {
            // ignore
          }
        }

        setState("copied");
        setCopyCount((c) => c + 1);
        onCopied?.();
      } catch {
        setState("failed");
      }

      if (resetAfterMs > 0) {
        timerRef.current = setTimeout(() => {
          setState("idle");
        }, resetAfterMs);
      }
    },
    [resetAfterMs, onCopied]
  );

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setState("idle");
  }, []);

  return { state, copyCount, copy, reset };
}
