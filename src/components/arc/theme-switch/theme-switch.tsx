import React, { forwardRef, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "../button/button";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./theme-switch.module.css";

export type Theme = "light" | "dark";
export type ThemeSwitchVariant = "reveal" | "eclipse" | "split" | "rise";

export interface ThemeSwitchProps {
  /** The current theme. Drives the icon and aria-pressed. */
  theme: Theme;
  /** Called on press with the opposite theme, the variant, and the button. */
  onThemeChange: (next: Theme, variant: ThemeSwitchVariant, trigger: HTMLElement) => void;
  /** Names the page transition and sets the small icon nudge that matches it. Default: "reveal" */
  variant?: ThemeSwitchVariant;
  /** Accessible name. Defaults to "Switch to dark mode" or "Switch to light mode". */
  label?: string;
  /** Hides the text and renders a 38px square button. Default: false */
  iconOnly?: boolean;
  /** Optional className on the underlying Button. */
  className?: string;
}

export const ThemeSwitch = forwardRef<HTMLButtonElement, ThemeSwitchProps>(function ThemeSwitch(
  {
    theme,
    onThemeChange,
    variant = "reveal",
    label,
    iconOnly = false,
    className,
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";
  const resolvedLabel =
    label ?? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode");

  return (
    <Button
      ref={ref}
      variant="secondary"
      size="sm"
      aria-pressed={theme === "dark"}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      onClick={(e) => onThemeChange(nextTheme, variant, e.currentTarget)}
      className={clsx(iconOnly && styles.iconOnly, className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          initial={
            !hydrated || reduceMotion
              ? { opacity: 1 }
              : { opacity: 0, rotate: -45, scale: 0.75, filter: "blur(2px)" }
          }
          animate={{ opacity: 1, rotate: 0, scale: 1, filter: "blur(0px)" }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, rotate: 45, scale: 0.75, filter: "blur(2px)" }
          }
          transition={
            !hydrated || reduceMotion
              ? { duration: 0 }
              : motionTokens.spring.snappy
          }
          aria-hidden="true"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          {theme === "dark" ? (
            <Moon size={16} strokeWidth={1.85} />
          ) : (
            <Sun size={16} strokeWidth={1.85} />
          )}
        </motion.span>
      </AnimatePresence>
      {!iconOnly && <span>{theme === "dark" ? "Dark" : "Light"}</span>}
    </Button>
  );
});

export default ThemeSwitch;
