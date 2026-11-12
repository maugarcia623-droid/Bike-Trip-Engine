import React, { useId } from 'react';
import { X } from '@/components/icons';
import { ModalPortal } from './ModalPortal';
import { useTranslation } from '../../context/LanguageContext';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'neutral' | 'danger';
  /** When true, displays a single dismiss button (replacement for window.alert). */
  isAlertOnly?: boolean;
}

/**
 * Calm modal replacement for native window.confirm and window.alert dialogs,
 * using concentric Cadence surfaces and clear action hierarchy.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'neutral',
  isAlertOnly = false,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const titleId = useId();

  const resolvedConfirmLabel =
    confirmLabel ?? (isAlertOnly ? (isFr ? 'Compris' : 'Got it') : isFr ? 'Confirmer' : 'Confirm');
  const resolvedCancelLabel = cancelLabel ?? (isFr ? 'Annuler' : 'Cancel');

  const confirmButtonClasses =
    tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400'
      : 'bg-[#111111] text-white hover:bg-[#262626] dark:bg-white dark:text-[#111111] dark:hover:bg-zinc-200';

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      zIndexClass="z-[1200]"
      panelClassName="w-full max-w-md bg-card text-ink rounded-card p-5 sm:p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-apple-modal"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id={titleId}
          className="font-rounded font-bold text-lg sm:text-xl text-ink tracking-tight leading-snug"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={isFr ? 'Fermer' : 'Close'}
          className="relative before:content-[''] before:absolute before:-inset-1.5 w-9 h-9 rounded-full bg-surface-active text-ink-muted hover:text-ink flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-2.5 text-sm text-ink-secondary font-body leading-relaxed">
        {description}
      </p>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        {!isAlertOnly && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-full bg-pod hover:bg-surface-active text-sm font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
          >
            {resolvedCancelLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onConfirm?.();
            onClose();
          }}
          className={`min-h-[44px] px-5 rounded-full text-sm font-rounded font-bold transition-colors cursor-pointer ${confirmButtonClasses}`}
        >
          {resolvedConfirmLabel}
        </button>
      </div>
    </ModalPortal>
  );
};
