# Flight Deck & Peloton Design System Guidelines
> **Target Audience**: AI coding assistants, autonomous frontend agents, and design engineers.
> **Scope**: Architecture, geometric laws, tokens, color matrix, typography, component blueprints, and code implementation rules for the **Bike Trip Engine (Flight Deck & Telemetry)** application.
> **Version**: 2.0 (Production Verified)

---

## 1. System Philosophy & Metaphor

The **Flight Deck** design system merges two distinct visual disciplines:
1. **High-Precision Aviation Telemetry**: Dense, scannable, HUD-inspired data presentation where critical metrics (watts, rollouts, headwinds, solar altitude) are prioritized using luminous beacons and tabular figures.
2. **Professional Peloton & Tarmac Aesthetics**: Warm stone asphalt surfaces, painted lane markers, chevron road hatching, and high-visibility safety apparel (*"yellow-vest"* brand accent).

### Core Directives for Any AI Generating UI
* **No Generic Dashboards**: Do not generate standard SaaS cards with grey borders and generic blue buttons. Adhere strictly to the concentric geometry, 4-layer tonal architecture, and dual-tone keyline icons described below.
* **Zero Layout Shift (CLS = 0)**: Interactive selection states MUST NEVER change element outer dimensions. Borders must not toggle between `0px` and `2px`; use `ring-2 ring-inset` exclusively.
* **Concentric Corner Geometry**: Nested elements must follow the mathematical concentricity formula: $\text{Outer Radius} = \text{Inner Radius} + \text{Padding}$.
* **Dual-Voice Typography**: Use the **Rounded Voice** (SF Pro Rounded / Nunito) for numbers, headers, badges, and chips; use the **Body Voice** (Inter) for prose and form inputs.

---

## 2. Geometric Laws & Concentric Pod Architecture

Cards and containers inside the application follow a strict nested radius hierarchy to ensure perfectly concentric, parallel curves.

$$\text{Outer Radius} = \text{Inner Radius} + \text{Padding} \iff \text{Inner Radius} = \text{Outer Radius} - \text{Padding}$$

```
┌─────────────────────────────────────────────────────────────┐  rounded-card (32px / 2rem)
│  Padding: 16px (p-4 / 1rem)                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  rounded-pod (16px / 1rem)                            │  │  [32px - 16px = 16px]
│  │  Padding: 8px (p-2 / 0.5rem)                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  rounded-sub-pod (8px / 0.5rem)                 │  │  │  [16px - 8px = 8px]
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Radius Token Reference

| Token Class | Value | Computed Pixel Size | Typical Usage |
| :--- | :--- | :--- | :--- |
| `rounded-card` | `2rem` | `32px` | Primary outer cards, bento grid containers, modals |
| `rounded-pod` | `1rem` | `16px` | Nested sub-cards inside cards, metric blocks, parameter tabs |
| `rounded-sub-pod` | `0.5rem` | `8px` | Tertiary nested items inside pods (e.g. inner input fields) |
| `rounded-full` | `9999px` | Fully rounded pill | Chips, badges, action buttons, icon circles, slider tracks |

---

## 3. Surface & Canvas Tokens (Light & Dark Mode)

The interface supports smooth, high-contrast Light and Dark modes. Tokens are injected as CSS variables in RGB channel format to enable dynamic Tailwind opacity (`rgb(var(--ds-*) / <alpha-value>)`).

### Surface Elevation Levels

```
Light Mode Hierarchy:
[--ds-canvas (#E5E3DD)] → [--ds-well (#DBD8D1)] → [--ds-card (#FFFFFF)] → [--ds-pod (#F4F3EF)] → [--ds-chip (#EBE9E3)]

Dark Mode Hierarchy:
[--ds-canvas (#000000)] → [--ds-well (#0D0D0F)] → [--ds-card (#161618)] → [--ds-pod (#202023)] → [--ds-chip (#2C2C30)]
```

### Exact Surface Color Mapping

| Token Name | Tailwind Class | Light Mode Value | Dark Mode Value | Semantic Role |
| :--- | :--- | :--- | :--- | :--- |
| `--ds-canvas` | `bg-canvas` | `#E5E3DD` (Warm Grey) | `#000000` (Pitch Black) | Viewport background |
| `--ds-well` | `bg-well` | `#DBD8D1` (Recessed) | `#0D0D0F` (Dark Well) | Outer track wells, scroll trays |
| `--ds-card` | `bg-card` | `#FFFFFF` (Crisp White) | `#161618` (Carbon Grey) | Primary bento cards (borderless) |
| `--ds-pod` | `bg-pod` | `#F4F3EF` (Warm White) | `#202023` (Recessed Pod) | Sub-cards, metric containers |
| `--ds-chip` | `bg-chip` | `#EBE9E3` (Muted Warm) | `#2C2C30` (Input Pill) | Interactive pill background |
| `--ds-chip-hover` | `hover:bg-chip-hover` | `#E0DDD5` | `#38383D` | Hover state for pills |
| `--ds-elevated` | `bg-elevated` | `#111111` (Dark Accent) | `#303034` (Elevated Pod) | Active tab or elevated capsule |

### Ink & Typography Hierarchy (WCAG AAA/AA Compliant)

| Token Name | Tailwind Class | Light Mode Value | Dark Mode Value | Contrast Ratio & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--ds-ink` | `text-ink` | `#111111` | `#F5F5F7` | Primary headlines, critical KPIs (18.8:1 Light / 16.5:1 Dark) |
| `--ds-ink-secondary` | `text-ink-secondary` | `#3D3C38` | `#A8A8AE` | Secondary values, subheadings (10.9:1 Light / 7.8:1 Dark) |
| `--ds-ink-muted` | `text-ink-muted` | `#66645E` | `#84848C` | Captions, units, disabled states (5.8:1 Light / 4.9:1 Dark) |
| `--ds-ink-inverse` | `text-ink-inverse` | `#FFFFFF` | `#0C0C0E` | High-contrast inverse text |

---

## 4. Accent, Beacon & Brand Palette

### The Volt & Yellow-Vest System
The signature brand color is **Volt** (`#F2F455`), complemented by the high-visibility **Yellow-Vest** palette inspired by road safety apparel:

```typescript
volt: {
  DEFAULT: '#F2F455', // Primary highlight, live calculation indicator
  dim:     '#E2E442', // Pressed / muted volt
  lime:    '#CAF164', // High-energy aero indicator
}
```

* **Solid Yellow-Vest Brand Button CTA**:
  ```html
  <button class="bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold px-4 py-2 rounded-full cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all">
    Confirm Action
  </button>
  ```
* **Yellow-Vest Pill / Chip**:
  - Light Mode: `bg-[#FAFFCB] text-[#4D5200] ring-[#A3B300]`
  - Dark Mode: `dark:bg-[#1F2203]/60 dark:text-[#DFFF00] dark:ring-[#DFFF00]`

### Beacon Status Matrix
Beacons indicate mechanical clearance, weather cautions, and flight clearance:

| Beacon State | Hex Color | Glow Shadow Utility | Meaning |
| :--- | :--- | :--- | :--- |
| **Beacon Green** | `#3D9A00` / `#10B981` | — | "GO" Status, cleared checklist, optimal pacing |
| **Beacon Amber** | `#F59E0B` | `shadow-beacon-amber` | Headwind caution, high temperature, steep gradient |
| **Beacon Red** | `#FF3B30` | `shadow-beacon-red` | Critical cutoff violation, night ride missing lumens |
| **Beacon Volt** | `#F2F455` | `shadow-beacon-volt` | Live telemetry active, current stage underway |
| **Beacon Lime** | `#CAF164` | `shadow-beacon-lime` | Drivetrain efficiency bonus, aero tuck active |

Shadow definitions:
```css
box-shadow: {
  'beacon-volt':  '0 0 12px 0 rgba(242, 244, 85, 0.45)',
  'beacon-lime':  '0 0 12px 0 rgba(202, 241, 100, 0.45)',
  'beacon-amber': '0 0 12px 0 rgba(245, 158, 11, 0.45)',
  'beacon-red':   '0 0 12px 0 rgba(255, 59, 48, 0.50)',
}
```

---

## 5. 10-Palette Layered Token Matrix (Chips & Badges)

Interactive chips and telemetry badges adhere to a strict **4-layer unified-hue system**:

1. **Layer 1 (Surface)**: Ultra-soft tinted pastel background (Light: `bg-*-50`) / Translucent dark tint (Dark: `dark:bg-*-950/40`).
2. **Layer 2 (Primary Details)**: 100% saturation label text + icon primary stroke (`text-*-700/800`, `dark:text-*-300`).
3. **Layer 3 (Secondary Details)**: Icon backdrop path isolated at ~30% visual weight (`currentColor` with `opacity: 0.3`).
4. **Layer 4 (Selection Ring)**: Zero-layout-shift `ring-2 ring-inset` toggling between `ring-transparent` (unselected) and `ring-*-500/600` (selected).

### Palette Matrix Reference Table

| Theme Key | Light Surface (`bg`) | Light Primary (`text`) | Selected Ring (`ring`) | Dark Surface (`dark:bg`) | Dark Primary (`dark:text`) | Dark Ring (`dark:ring`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `amber` | `bg-amber-50` | `text-amber-800` | `ring-amber-500` | `dark:bg-amber-950/40` | `dark:text-amber-300` | `dark:ring-amber-400` |
| `blue` | `bg-blue-50` | `text-blue-700` | `ring-blue-600` | `dark:bg-blue-950/40` | `dark:text-blue-300` | `dark:ring-blue-500` |
| `purple` | `bg-purple-50` | `text-purple-700` | `ring-purple-600` | `dark:bg-purple-950/40` | `dark:text-purple-300` | `dark:ring-purple-400` |
| `emerald`| `bg-emerald-50` | `text-emerald-700`| `ring-emerald-600` | `dark:bg-emerald-950/40` | `dark:text-emerald-300` | `dark:ring-emerald-500` |
| `orange` | `bg-orange-50` | `text-orange-700` | `ring-orange-500` | `dark:bg-orange-950/40` | `dark:text-orange-300` | `dark:ring-orange-400` |
| `teal` | `bg-teal-50` | `text-teal-800` | `ring-teal-600` | `dark:bg-teal-950/40` | `dark:text-teal-300` | `dark:ring-teal-400` |
| `lime` | `bg-lime-50` | `text-lime-800` | `ring-lime-600` | `dark:bg-lime-950/40` | `dark:text-lime-300` | `dark:ring-lime-400` |
| `sky` | `bg-sky-50` | `text-sky-700` | `ring-sky-500` | `dark:bg-sky-950/40` | `dark:text-sky-300` | `dark:ring-sky-400` |
| `rose` | `bg-rose-50` | `text-rose-700` | `ring-rose-500` | `dark:bg-rose-950/40` | `dark:text-rose-300` | `dark:ring-rose-400` |
| `yellow-vest`| `bg-[#FAFFCB]` | `text-[#4D5200]` | `ring-[#A3B300]` | `dark:bg-[#1F2203]/60` | `dark:text-[#DFFF00]` | `dark:ring-[#DFFF00]` |
| `zinc` | `bg-zinc-100` | `text-zinc-700` | `ring-zinc-600` | `dark:bg-zinc-900/50` | `dark:text-zinc-300` | `dark:ring-zinc-400` |

---

## 6. Typography & Tabular Numerals

### The Dual-Voice Typography System

1. **The Rounded Voice (`.font-rounded`)**:
   - **Stack**: `ui-rounded, -apple-system-rounded, "SF Pro Rounded", Nunito, Inter, sans-serif`
   - **Weights**: Semibold (`700`), Bold (`800`), Extrabold (`800`)
   - **Usage**: ALL telemetry data, big metrics, card titles (`h1`-`h4`), chips, badges, and status labels.
2. **The Body Voice (`font-body`)**:
   - **Stack**: `'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
   - **Letter Spacing**: `-0.01em`
   - **Usage**: Paragraphs, explanatory copy, checklists, form input fields, and tooltips.

### Strict Tabular Numerals Requirement (`.tnum`)
Every single numerical readout (watts, speeds, distances, countdown timers, elevation meters, percentages) MUST carry `.tnum` (`font-variant-numeric: tabular-nums`). This prevents UI jitter during live recalculations.

```html
<!-- Correct Implementation -->
<span class="text-3xl font-bold font-rounded tracking-tight tnum text-ink">
  248 <span class="text-xs font-medium text-ink-muted">W</span>
</span>
```

---

## 7. Asphalt & Road Graphic Elements

To reinforce the cycling tarmac metaphor, use these built-in road graphic utilities:

### 1. Horizontal Dashed Lane Divider (`.lane-divider`)
Used as subtle visual separators between telemetry sections on matching surfaces:
```css
.lane-divider {
  height: 1px;
  width: 100%;
  background-image: repeating-linear-gradient(
    to right,
    var(--lane-dash) 0px,
    var(--lane-dash) 6px,
    transparent 6px,
    transparent 12px
  );
}
```

### 2. Vertical Timeline Spine (`.lane-spine`)
The vertical dashed road center-line running through the Reverse Timeline Bento:
```css
.lane-spine {
  width: 2px;
  background-image: repeating-linear-gradient(
    to bottom,
    var(--lane-dash-strong) 0px,
    var(--lane-dash-strong) 7px,
    transparent 7px,
    transparent 14px
  );
}
```

### 3. Diagonal Chevron Asphalt Hatch (`.tarmac-hatch`)
Used for lane buffers, construction zones, or neutral road accents:
```css
.tarmac-hatch {
  background-image: repeating-linear-gradient(
    -45deg,
    var(--tarmac-hatch-stroke) 0px,
    var(--tarmac-hatch-stroke) 1.5px,
    transparent 1.5px,
    transparent 7px
  );
  box-shadow: inset 0 0 0 1px var(--tarmac-hatch-border);
}
```

### 4. Peloton Slider (`input[type='range'].peloton-slider`)
Tire-inspired full-radius range slider with 20px round thumb:
```html
<input
  type="range"
  class="peloton-slider w-full"
  min="15"
  max="45"
  step="0.5"
/>
```

---

## 8. Duotone Icon Token Isolation (Keyline Icons)

The system uses `@keyline-icons/react` (or custom SVG paths) with a 2-tone duotone architecture. To guarantee visual cohesion across color palettes, the secondary backdrop plate MUST be isolated to inherit `currentColor` at 30% opacity.

### The Required Tailwind Duotone Isolation Utility
Whenever rendering an icon inside a chip, badge, or button, include these classes:

```typescript
export const CHIP_DUOTONE_ISOLATION_CLASSES = [
  '[--icon-secondary:currentColor]',
  '[--icon-secondary-opacity:0.3]',
  '[&_svg_[fill-opacity="0.4"]]:fill-current',
  '[&_svg_[fill-opacity="0.4"]]:[fill-opacity:0.3]',
  '[&_svg_[stroke-opacity="0.4"]]:stroke-current',
  '[&_svg_[stroke-opacity="0.4"]]:[stroke-opacity:0.3]',
  '[&_svg:not(.keyline-icon):not([stroke])_path:first-child]:fill-current',
  '[&_svg:not(.keyline-icon)[stroke]_path:first-child]:stroke-current',
  '[&_svg:not(.keyline-icon)_path:first-child]:opacity-100',
  '[&_svg:not(.keyline-icon)_path:last-child:not(:first-child)]:fill-current',
  '[&_svg:not(.keyline-icon)_path:last-child:not(:first-child)]:opacity-30',
].join(' ');
```

---

## 9. Component Specifications & Code Blueprints

### Blueprint 1: Bento Card (`Card`)
Primary container component for high-level dashboard modules.

```tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  badge,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bento-card bg-card text-ink rounded-card p-4 transition-colors duration-200 relative overflow-hidden flex flex-col ${className}`}
    >
      {(title || action || icon || badge) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-full bg-pod flex items-center justify-center text-ink shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base sm:text-[17px] font-semibold font-rounded tracking-tight text-ink leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[13px] text-ink-muted mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {(badge || action) && (
            <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
              {badge}
              {action}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
```

---

### Blueprint 2: Interactive Layered Chip (`Chip`)
The standard interactive selector for archetypes, presets, and filters.

```tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_ICON_ROOT_CLASSES,
  ChipTheme,
} from '@/tokens/chipTokens';

export interface ChipProps {
  label: string;
  theme: ChipTheme;
  icon: React.ElementType;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  theme,
  icon: Icon,
  isSelected = false,
  onClick,
  disabled = false,
  className,
}) => {
  const tokens = CHIP_TOKENS[theme] ?? CHIP_TOKENS.amber;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        clsx(
          // Geometry: 32px height, full pill
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
          'font-rounded text-xs sm:text-[13px] font-semibold leading-none whitespace-nowrap',
          'transition-all duration-150 ease-out select-none',
          // Layer 1 & 2
          tokens.surface,
          tokens.primary,
          // Layer 3 (Icon Duotone Isolation)
          CHIP_DUOTONE_ISOLATION_CLASSES,
          // Layer 4 (Zero-Layout-Shift 2px Ring)
          CHIP_RING_BASE,
          isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED,
          // Interaction feedback
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110 active:scale-[0.98]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
          className
        )
      )}
    >
      <Icon size={20} className={CHIP_ICON_ROOT_CLASSES} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
```

---

### Blueprint 3: Telemetry Metric Pill (`MetricPill`)
Used inside bento cards to display dense numbers, units, and status indicators.

```tsx
import React from 'react';

interface MetricPillProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  variant?: 'volt' | 'lime' | 'amber' | 'red' | 'zinc';
  icon?: React.ReactNode;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  unit,
  subValue,
  variant = 'zinc',
  icon,
}) => {
  const isVoltHero = variant === 'volt';
  const isAmber = variant === 'amber';
  const isRed = variant === 'red';

  const containerStyle = isVoltHero
    ? 'bg-volt dark:bg-pod text-[#111111] dark:text-ink'
    : 'bg-pod text-ink';

  const dotColor = isVoltHero
    ? 'bg-[#111111] dark:bg-volt dark:shadow-beacon-volt'
    : isAmber
    ? 'bg-beacon-amber dark:shadow-beacon-amber'
    : isRed
    ? 'bg-beacon-red dark:shadow-beacon-red'
    : 'bg-ink-muted/60';

  const valueColor = isVoltHero
    ? 'text-[#111111] dark:text-ink'
    : isRed
    ? 'text-beacon-orange dark:text-beacon-red'
    : 'text-ink';

  const mutedTextColor = isVoltHero
    ? 'text-[#111111]/70 dark:text-ink-muted'
    : 'text-ink-muted';

  return (
    <div className={`rounded-pod p-4 sm:p-5 flex flex-col justify-between transition-colors relative ${containerStyle}`}>
      <div className={`flex items-center justify-between gap-2 text-xs font-medium ${mutedTextColor}`}>
        <span className="flex items-center gap-1.5 truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate font-rounded">{label}</span>
        </span>
        {icon && <span className="opacity-80 shrink-0">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl sm:text-3xl font-semibold tracking-tight tnum font-rounded ${valueColor}`}>
            {value}
          </span>
          {unit && <span className={`text-xs font-medium ${mutedTextColor}`}>{unit}</span>}
        </div>
        {subValue && (
          <span className={`text-xs font-medium tnum truncate ${mutedTextColor}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
```

---

### Blueprint 4: Icon Badge with Solid Backer (`IconBadge`)
For timeline waypoints or circular avatars. When placed above dashed road spines, use `solidBacker` to prevent lines from bleeding through translucent dark mode backgrounds.

```tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  LayeredTokenTheme,
  getLayeredThemeTokens,
} from '@/tokens/chipTokens';

export interface IconBadgeProps {
  theme: LayeredTokenTheme;
  icon: React.ElementType;
  size?: 'xs' | 'sm' | 'md' | 'spine' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  isSelected?: boolean;
  solidBacker?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs:    { box: 'w-6 h-6', icon: 'w-3.5 h-3.5' },
  sm:    { box: 'w-7 h-7', icon: 'w-4 h-4' },
  md:    { box: 'w-8 h-8', icon: 'w-4 h-4' },
  spine: { box: 'w-9 h-9 sm:w-10 sm:h-10', icon: 'w-4 h-4 sm:w-5 sm:h-5' },
  lg:    { box: 'w-10 h-10', icon: 'w-5 h-5' },
  xl:    { box: 'w-12 h-12', icon: 'w-6 h-6' },
};

export const IconBadge: React.FC<IconBadgeProps> = ({
  theme,
  icon: Icon,
  size = 'md',
  shape = 'circle',
  isSelected = false,
  solidBacker = false,
  className = '',
}) => {
  const tokens = getLayeredThemeTokens(theme);
  const sizeSpec = SIZE_MAP[size];
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  const surface = (
    <div
      className={twMerge(
        clsx(
          'flex items-center justify-center shrink-0 transition-all duration-150',
          solidBacker ? 'w-full h-full' : sizeSpec.box,
          radiusClass,
          tokens.surface,
          tokens.primary,
          CHIP_DUOTONE_ISOLATION_CLASSES,
          CHIP_RING_BASE,
          isSelected ? tokens.selectedRing : CHIP_RING_UNSELECTED,
          !solidBacker && className
        )
      )}
    >
      <Icon className={clsx(sizeSpec.icon, 'flex-shrink-0 text-current')} aria-hidden="true" />
    </div>
  );

  if (solidBacker) {
    return (
      <div className={twMerge(clsx('bg-card shrink-0', sizeSpec.box, radiusClass, className))}>
        {surface}
      </div>
    );
  }

  return surface;
};
```

---

### Blueprint 5: Zero-JS Collapsible (`Collapsible`)
Fluid accordion region leveraging CSS grid rows animation (`0fr` → `1fr`) without measuring DOM heights:

```tsx
import React from 'react';

interface CollapsibleProps {
  open: boolean;
  children: React.ReactNode;
  id?: string;
  className?: string;
  innerClassName?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  open,
  children,
  id,
  className = '',
  innerClassName = '',
}) => (
  <div
    id={id}
    aria-hidden={!open}
    className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
      open ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'
    } ${className}`}
  >
    <div className="min-h-0 overflow-hidden">
      <div className={innerClassName}>{children}</div>
    </div>
  </div>
);
```

---

## 10. Page & Bento Grid Layout Hierarchy

### Standard Two-Column Bento Layout (7 Cols / 5 Cols)

The command deck uses a 12-column responsive grid on large screens:

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8">
  {/* Full-Width Cinematic Hero Card (Map + Route Corridor + 5 Big KPIs) */}
  <div className="animate-flight-deck-in deck-stagger-1 mb-5">
    <HeroRouteCard />
  </div>

  {/* Two-Column Command Deck */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
    {/* Left Column (7 Columns): Dynamic Timeline & Aerodynamic Physics */}
    <div className="lg:col-span-7 flex flex-col gap-5">
      <div className="animate-flight-deck-in deck-stagger-2">
        <ReverseTimelineBento />
      </div>
      <div className="animate-flight-deck-in deck-stagger-4">
        <PhysicsEngineCard />
      </div>
    </div>

    {/* Right Column (5 Columns): Weather Conditions, Checklist & Nutrition */}
    <div className="lg:col-span-5 flex flex-col gap-5">
      <div className="animate-flight-deck-in deck-stagger-3">
        <AtmosphereCard />
      </div>
      <div className="animate-flight-deck-in deck-stagger-5">
        <PreFlightChecklistBento />
      </div>
      <div className="animate-flight-deck-in deck-stagger-6">
        <NutritionBento />
      </div>
    </div>
  </div>
</div>
```

---

## 11. Motion Graphics & Animation Architecture (Apple-Inspired)

The application uses an **Apple-inspired motion graphics system** for typography, graphic elements, and progressive reveals. Motion is subtle, elegant, expressive, and refined, adhering strictly to industry standards for high-performance web applications.

### Core Motion Principles
1. **Fluid Spring Deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`)**: Immediate velocity that settles naturally with zero abrupt stops.
2. **Subtle Amplitudes**: Translations use subtle offsets (8px–14px, never floaty 20px+ jumps) so content feels grounded and fast.
3. **Where to Animate**:
   - **View & Screen Transitions**: Cascading staggered entrance across Home, Configurator, and Flight Deck (`animate-apple-in stagger-1` ... `stagger-6`).
   - **Modals & Dialogs**: Backdrops fade smoothly (`animate-apple-fade-in`), dialog windows scale up gently (`animate-apple-modal`, `scale(0.96) translateY(12px) → scale(1) translateY(0)`).
   - **Multi-Step Wizards (Onboarding)**: Seamless step changes with `animate-apple-step-in`.
   - **Receipt Window (`ShareTelemetryModal`)**: Floating 9:16 canvas preview (`animate-apple-receipt`) with realistic ambient depth and smooth mode transitions.
   - **Dropdowns & Popovers**: Gentle scale and slide (`animate-apple-popover`).
   - **Interactive Tactile Feedback**: `active:scale-[0.98]` or `active:scale-[0.97]` on buttons and chips for tactile physical response.
   - **Checkmarks & Toggles**: Micro-pop bounce (`animate-apple-check-pop`) on checklist completion or copy actions.
4. **Where to Keep UI Elements Static (Crucial Best Practices)**:
   - **Live Telemetry & Figures**: Numeric readouts (watts, air density, wind tax, calories) during slider drag MUST remain static without CSS transition lag to guarantee 60fps real-time physics calculation.
   - **Fixed Navigation Chrome**: The top bar and dynamic island shell remain anchored without constant re-animation.
   - **No Ambient Eye-Distractions**: No continuous bouncing or swinging; live status beacons use a slow, gentle luminous breathing (`beacon-pulse` 2.4s).
   - **Accessibility**: Full `@media (prefers-reduced-motion: reduce)` override disables all transforms and animations for users with motion sensitivity.

### Animation Token Reference

```css
/* Curves */
--ease-apple:        cubic-bezier(0.16, 1, 0.3, 1);
--ease-apple-spring: cubic-bezier(0.2, 0.9, 0.3, 1);
--ease-apple-snappy: cubic-bezier(0.25, 1, 0.5, 1);

/* Utility Classes */
.animate-apple-in       /* Staggered page block reveal (0.42s) */
.animate-apple-fade-in  /* Clean backdrop fade (0.22s) */
.animate-apple-modal    /* Modal scale & slide entrance (0.34s) */
.animate-apple-popover  /* Popover / dropdown reveal (0.22s) */
.animate-apple-step-in  /* Wizard step / tab transition (0.28s) */
.animate-apple-receipt  /* Floating receipt card entrance (0.45s) */
.animate-apple-check-pop/* Checkmark micro-spring bounce (0.25s) */
.animate-beacon-breath  /* Luminous beacon breathing (2.4s infinite) */

/* Progressive Stagger System */
.stagger-1 { animation-delay: 35ms; }
.stagger-2 { animation-delay: 80ms; }
.stagger-3 { animation-delay: 130ms; }
.stagger-4 { animation-delay: 180ms; }
.stagger-5 { animation-delay: 230ms; }
.stagger-6 { animation-delay: 280ms; }
```

---

## 12. Strict Rules & Anti-Patterns for AI Coders

### ❌ Strict Anti-Patterns (DO NOT DO)
1. **Never toggle borders between states** (e.g. `border border-transparent` to `border-2 border-amber-500`). This causes a 2px layout jitter. Always use `ring-2 ring-inset`.
2. **Never mix non-concentric radii**. Placing a `rounded-lg` (8px) card directly inside a `rounded-3xl` (24px) container with `p-4` (16px) breaks the parallel geometry. Always adhere to `rounded-card (32px)` containing `rounded-pod (16px)` with `p-4`.
3. **Never render raw numerical metrics without `.tnum`**. Every dynamic number must include tabular numerals.
4. **Never introduce hardcoded neon borders or glowing SaaS outlines** unless using the validated beacon shadow tokens (`shadow-beacon-volt`, etc.).
5. **Never use standard Lucide blue (`#2563EB`) as the default brand color**. The primary brand accent is `Volt` (`#F2F455`) and `Yellow-Vest` (`#FAFFCB` / `#4D5200`).
6. **Never allow mobile input font sizes to drop below 16px** on viewports `< 640px`. Mobile Safari will forcefully zoom into the page.

### ✅ Mandatory Best Practices (ALWAYS DO)
1. **Use semantic CSS variables for surfaces**: `bg-card`, `bg-pod`, `bg-canvas`, `text-ink`, `text-ink-secondary`, `text-ink-muted`.
2. **Apply `.font-rounded` to all KPIs, headers, and badges**: Ensure SF Pro Rounded / Nunito voice is active for telemetry.
3. **Use `active:scale-[0.98]`** on interactive pills and buttons for tactile physical feedback.
4. **Isolate duotone icons with `CHIP_DUOTONE_ISOLATION_CLASSES`** so secondary layers render at 30% visual weight.
5. **Provide a `solidBacker` for icon badges placed over dashed timeline spines** to prevent background lines showing through translucent dark surfaces.
