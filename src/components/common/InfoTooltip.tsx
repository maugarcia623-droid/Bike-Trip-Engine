import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from '@/components/icons';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface InfoTooltipProps {
  title?: string;
  content: string;
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md';
  placement?: 'top' | 'bottom' | 'auto';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  className = '',
  iconClassName = '',
  size = 'md',
  placement = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    actualPlacement: 'top' | 'bottom';
  }>({
    top: 0,
    left: 0,
    arrowLeft: 12,
    actualPlacement: 'top',
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 260;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 90;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Determine vertical placement
    let actualPlacement: 'top' | 'bottom' = 'top';
    if (placement === 'bottom') {
      actualPlacement = 'bottom';
    } else if (placement === 'top') {
      actualPlacement = 'top';
    } else {
      // auto
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      actualPlacement =
        spaceAbove >= tooltipHeight + 12
          ? 'top'
          : spaceBelow >= tooltipHeight + 12
          ? 'bottom'
          : spaceAbove > spaceBelow
          ? 'top'
          : 'bottom';
    }

    // Horizontal centering relative to trigger
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let left = triggerCenterX - tooltipWidth / 2;

    // Clamp inside viewport with 12px margin
    const minLeft = 12;
    const maxLeft = Math.max(12, viewportWidth - tooltipWidth - 12);
    left = Math.max(minLeft, Math.min(maxLeft, left));

    // Arrow position relative to tooltip box
    const arrowLeft = Math.max(14, Math.min(tooltipWidth - 14, triggerCenterX - left));

    // Vertical position clamped to viewport bounds
    const rawTop =
      actualPlacement === 'top'
        ? triggerRect.top - tooltipHeight - 8
        : triggerRect.bottom + 8;
    const top = Math.max(8, Math.min(rawTop, viewportHeight - tooltipHeight - 8));

    setCoords({
      top,
      left,
      arrowLeft,
      actualPlacement,
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, content, title]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const canHover = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const handleMouseEnter = () => {
    if (!canHover()) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!canHover()) return;
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const iconSizeClass = size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={title ? `${title} · Information` : 'Information'}
        aria-expanded={isOpen}
        className={`relative before:content-[''] before:absolute before:-inset-3 inline-flex items-center justify-center p-0.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 [--icon-secondary:currentColor] [--icon-secondary-opacity:0.3] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 dark:focus-visible:ring-white/40 transition-colors cursor-help shrink-0 align-middle ${className}`}
      >
        <Info className={`${iconSizeClass} text-current ${iconClassName}`} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              maxWidth: 'calc(100vw - 24px)',
            }}
            className="fixed z-[9999] w-64 sm:w-72 rounded-xl bg-[#161618] text-[#F5F5F7] border border-white/10 shadow-2xl p-3 text-xs leading-relaxed font-sans pointer-events-auto animate-apple-popover select-text"
          >
            {/* Arrow caret */}
            <div
              style={{ left: `${coords.arrowLeft}px` }}
              className={`absolute w-2.5 h-2.5 bg-[#161618] border-white/10 rotate-45 transform -translate-x-1/2 ${
                coords.actualPlacement === 'top'
                  ? 'bottom-[-5px] border-b border-r'
                  : 'top-[-5px] border-t border-l'
              }`}
            />

            {title && (
              <div className="font-semibold text-[12px] text-[#F5F5F7] tracking-tight mb-1 flex items-center justify-between">
                <span>{title}</span>
              </div>
            )}
            <p className="text-neutral-300 text-[11.5px] leading-relaxed">
              {content}
            </p>
          </div>,
          document.body
        )}
    </>
  );
};
