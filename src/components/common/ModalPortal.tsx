import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Module-level ref counter so closing a stacked modal never restores body scroll too early. */
let openModalCount = 0;
let previousBodyOverflow = '';

export interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy?: string;
  zIndexClass?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared accessible modal portal handling body scroll locking, Escape key dismissal,
 * safe-area viewport inset padding, and backdrop click-outside closure.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  labelledBy,
  zIndexClass = 'z-[1100]',
  closeOnBackdrop = true,
  closeOnEscape = true,
  backdropClassName = 'bg-black/65 dark:bg-black/80 backdrop-blur-sm',
  panelClassName = 'w-full max-w-md bg-card text-ink rounded-card p-5 sm:p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-apple-modal',
  children,
}) => {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={closeOnBackdrop ? onClose : undefined}
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-6 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))] animate-apple-fade-in ${backdropClassName}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[92vh] max-h-[92dvh] ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
