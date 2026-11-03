import React from 'react';
import { ChevronDown } from '@/components/icons';

interface CollapsibleProps {
  /** Whether the region is expanded. */
  open: boolean;
  children: React.ReactNode;
  /** DOM id so the controlling button can reference it via `aria-controls`. */
  id?: string;
  /** Classes applied to the animated outer grid wrapper. */
  className?: string;
  /**
   * Classes applied to the innermost content wrapper. Put spacing (e.g. `pt-3`) here rather
   * than on the outer wrapper so the region collapses to a true 0px height.
   */
  innerClassName?: string;
}

/**
 * Smooth height-animated disclosure region.
 *
 * Uses the CSS grid `grid-template-rows: 0fr → 1fr` technique, so no JS height measurement is
 * required and content of any length animates fluidly. `visibility` is transitioned alongside
 * opacity, which removes collapsed content from the tab order / accessibility tree once the
 * closing animation finishes.
 */
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
    className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
      open ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'
    } ${className}`}
  >
    <div className="min-h-0 overflow-hidden">
      <div className={innerClassName}>{children}</div>
    </div>
  </div>
);

interface DisclosureChevronProps {
  open: boolean;
  className?: string;
}

/** Rotating `ChevronDown` affordance shared by every cockpit accordion header. */
export const DisclosureChevron: React.FC<DisclosureChevronProps> = ({ open, className = '' }) => (
  <span
    aria-hidden="true"
    className={`w-7 h-7 rounded-full bg-card text-ink-secondary flex items-center justify-center shrink-0 transition-colors ${className}`}
  >
    <ChevronDown
      className={`w-4 h-4 text-current transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
    />
  </span>
);
