import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { clsx } from "clsx";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./icon-morph.module.css";

export type IconMorphName =
  | "menu"
  | "play"
  | "plus"
  | "copy"
  | "theme"
  | "chevron"
  | "bell"
  | "heart";

export interface IconMorphBaseProps
  extends Omit<React.SVGProps<SVGSVGElement>, "ref" | "children"> {
  /** The second state: menu to close, play to pause, plus/copy to check, sun to moon, chevron turned, bell on, heart liked. */
  state?: boolean;
  /** Rendered size in px. Default: 24 */
  size?: number;
  /** Stroke width in the 24 unit grid. Default: 1.75 */
  strokeWidth?: number;
}

export interface ChevronIconProps extends IconMorphBaseProps {
  /** Degrees the chevron turns when state is true. Default: 180 */
  turn?: number;
  /** Where the chevron points at rest. Default: "down" */
  pointing?: "down" | "right";
}

export interface IconMorphProps extends ChevronIconProps {
  /** Which icon to render. */
  name: IconMorphName;
}

export function MenuIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.svg, className)}
      {...props}
    >
      <motion.line
        x1="4"
        x2="20"
        animate={state ? { y1: 12, y2: 12, rotate: 45 } : { y1: 6, y2: 6, rotate: 0 }}
        transition={transition}
        style={{ originX: "12px", originY: "12px" }}
      />
      <motion.line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        animate={state ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }}
        transition={transition}
      />
      <motion.line
        x1="4"
        x2="20"
        animate={state ? { y1: 12, y2: 12, rotate: -45 } : { y1: 18, y2: 18, rotate: 0 }}
        transition={transition}
        style={{ originX: "12px", originY: "12px" }}
      />
    </svg>
  );
}

export function PlayPauseIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.svg, className)}
      {...props}
    >
      {state ? (
        <motion.g initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={transition}>
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </motion.g>
      ) : (
        <motion.polygon
          points="6 4 20 12 6 20 6 4"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={transition}
        />
      )}
    </svg>
  );
}

export function PlusCheckIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.svg, className)}
      {...props}
    >
      {state ? (
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={transition}
        />
      ) : (
        <motion.g initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={transition}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </motion.g>
      )}
    </svg>
  );
}

export function CopyCheckIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.svg, className)}
      {...props}
    >
      {state ? (
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={transition}
        />
      ) : (
        <motion.g initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={transition}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </motion.g>
      )}
    </svg>
  );
}

export function SunMoonIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.svg, className)}
      {...props}
    >
      {state ? (
        <motion.path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          initial={{ rotate: -30, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={transition}
        />
      ) : (
        <motion.g
          initial={{ rotate: 30, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={transition}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </motion.g>
      )}
    </svg>
  );
}

export function ChevronIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  turn = 180,
  pointing = "down",
  className,
  ...props
}: ChevronIconProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  const baseRotation = pointing === "right" ? -90 : 0;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      animate={{ rotate: baseRotation + (state ? turn : 0) }}
      transition={transition}
      className={clsx(styles.svg, className)}
      {...(props as any)}
    >
      <polyline points="6 9 12 15 18 9" />
    </motion.svg>
  );
}

export function BellIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      animate={state && !reduce ? { rotate: [0, -10, 10, -5, 0] } : { rotate: 0 }}
      transition={transition}
      className={clsx(styles.svg, className)}
      {...(props as any)}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {!state && <line x1="2" y1="2" x2="22" y2="22" />}
    </motion.svg>
  );
}

export function HeartIcon({
  state = false,
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: IconMorphBaseProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : motionTokens.spring.snappy;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={state ? "var(--icon-morph-like, var(--danger, #FF3B30))" : "none"}
      stroke={state ? "var(--icon-morph-like, var(--danger, #FF3B30))" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      animate={state && !reduce ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={transition}
      className={clsx(styles.svg, className)}
      {...(props as any)}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </motion.svg>
  );
}

export function IconMorph({ name, ...props }: IconMorphProps) {
  switch (name) {
    case "menu":
      return <MenuIcon {...props} />;
    case "play":
      return <PlayPauseIcon {...props} />;
    case "plus":
      return <PlusCheckIcon {...props} />;
    case "copy":
      return <CopyCheckIcon {...props} />;
    case "theme":
      return <SunMoonIcon {...props} />;
    case "chevron":
      return <ChevronIcon {...props} />;
    case "bell":
      return <BellIcon {...props} />;
    case "heart":
      return <HeartIcon {...props} />;
  }
}

export default IconMorph;
