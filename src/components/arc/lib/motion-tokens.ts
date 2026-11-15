/**
 * Arc Motion Tokens
 * Shared spring physics, durations, easings, staggers, and blur steps.
 */
export const motionTokens = {
  spring: {
    /** 0.4s, bounce 0 — Panels, height, drawers, progress, layout shifts. Never overshoots. */
    smooth: {
      type: "spring" as const,
       visualDuration: 0.4,
      bounce: 0,
    },
    /** 0.26s, bounce 0.12 — Press feedback, small indicators, icon swaps. */
    snappy: {
      type: "spring" as const,
      visualDuration: 0.26,
      bounce: 0.12,
    },
    /** 0.42s, bounce 0.16 — Shared highlights (layoutId), width that follows new content, shape morphs. */
    morph: {
      type: "spring" as const,
      visualDuration: 0.42,
      bounce: 0.16,
    },
    /** Fast, damped spring for crisp interactive transitions. */
    responsive: {
      type: "spring" as const,
      stiffness: 520,
      damping: 44,
    },
    /** Soft, settled spring for gentle transitions. */
    gentle: {
      type: "spring" as const,
      stiffness: 340,
      damping: 34,
    },
  },
  duration: {
    instant: 0.12,
    fast: 0.16,
    exit: 0.18,
    standard: 0.24,
    considered: 0.48,
  },
  ease: {
    enter: [0.16, 1, 0.3, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
    standard: [0.2, 0, 0, 1] as const,
    inOut: [0.45, 0, 0.55, 1] as const,
  },
  stagger: {
    item: 0.035,
    line: 0.08,
    word: 0.04,
    char: 0.016,
  },
  blur: {
    subtle: "2px",
    soft: "4px",
    text: "8px",
  },
} as const;

export const springs = motionTokens.spring;

