import React from 'react';
import { Path, Check, X, SpinnerGap } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';

interface AmenityInRouteBadgeProps {
  isUpdating: boolean;
  disabled: boolean;
  onRemove: (e: React.MouseEvent) => void;
}

/**
 * Clickable status pill shown next to POIs already added to the route, allowing 1-click removal.
 */
export const AmenityInRouteBadge: React.FC<AmenityInRouteBadgeProps> = ({
  isUpdating,
  disabled,
  onRemove,
}) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      title={t('rerouteRemoveBtn')}
      aria-label={t('rerouteRemoveBtn')}
      className="group inline-flex items-center gap-1 text-[10px] font-rounded font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
    >
      {isUpdating ? (
        <SpinnerGap className="w-2.5 h-2.5 animate-spin text-current" />
      ) : (
        <>
          <Check className="w-2.5 h-2.5 text-current group-hover:hidden" />
          <X className="w-2.5 h-2.5 text-current hidden group-hover:inline" />
        </>
      )}
      <span>{t('rerouteAddedBadge')}</span>
      <X className="w-2.5 h-2.5 text-current opacity-65" />
    </button>
  );
};

interface AmenityRouteSubActionProps {
  inRoute: boolean;
  isPinned: boolean;
  isPromptOpen: boolean;
  isUpdating: boolean;
  disabled: boolean;
  reroutePromptText: string;
  onAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

/**
 * Inline subtitle action allowing 1-click addition (when pinned) or removal (when in route).
 */
export const AmenityRouteSubAction: React.FC<AmenityRouteSubActionProps> = ({
  inRoute,
  isPinned,
  isPromptOpen,
  isUpdating,
  disabled,
  reroutePromptText,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();

  if (inRoute) {
    return (
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="normal-case inline-flex items-center gap-1 text-[10px] font-rounded font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
      >
        {isUpdating ? (
          <>
            <SpinnerGap className="w-3 h-3 animate-spin text-current" />
            <span>{t('rerouteRemoving')}</span>
          </>
        ) : (
          <>
            <X className="w-3 h-3 text-current" />
            <span>{t('rerouteRemoveBtn')}</span>
          </>
        )}
      </button>
    );
  }

  if (isPinned && !isPromptOpen) {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="normal-case inline-flex items-center gap-1 text-[10px] font-rounded font-bold text-[#4d5200] dark:text-volt hover:underline cursor-pointer disabled:opacity-50"
      >
        <Path className="w-3 h-3 text-current" />
        <span>{reroutePromptText}</span>
      </button>
    );
  }

  return null;
};

interface AmenityReroutePromptProps {
  promptText: string;
  isOpen: boolean;
  isRerouting: boolean;
  disabled: boolean;
  feedback?: { message: string; isError?: boolean } | null;
  onConfirm: (e: React.MouseEvent) => void;
  onDismiss: (e: React.MouseEvent) => void;
}

/**
 * 1-click inline prompt offering to insert a pinned Resupply Radar POI into the route
 * as an intermediate waypoint with estimated detour distance.
 */
export const AmenityReroutePrompt: React.FC<AmenityReroutePromptProps> = ({
  promptText,
  isOpen,
  isRerouting,
  disabled,
  feedback,
  onConfirm,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 rounded-2xl bg-volt/15 dark:bg-volt/10 ring-1 ring-inset ring-[#a3b300]/30 px-3 py-2 flex items-center justify-between gap-2.5 animate-apple-fade-in"
        >
          <div className="flex items-center gap-2 min-w-0 text-xs font-rounded font-semibold text-ink">
            <Path className="w-3.5 h-3.5 text-[#4d5200] dark:text-volt shrink-0" />
            <span className="break-words leading-snug">{promptText}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-full bg-volt text-[#111111] font-rounded font-bold text-[11px] hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isRerouting ? (
                <>
                  <SpinnerGap className="w-3 h-3 animate-spin text-current" />
                  <span>{t('rerouteAdding')}</span>
                </>
              ) : (
                <span>{t('rerouteConfirmBtn')}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('closeRadarModal')}
              className="relative before:content-[''] before:absolute before:-inset-1.5 w-8 h-8 rounded-full hover:bg-ink/10 dark:hover:bg-white/10 flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mt-2 rounded-xl px-2.5 py-1.5 text-[11px] font-rounded font-semibold flex items-center gap-1.5 ${
            feedback.isError
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <Check className="w-3 h-3 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}
    </>
  );
};
