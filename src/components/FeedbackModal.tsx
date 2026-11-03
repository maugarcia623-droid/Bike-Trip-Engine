import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bug,
  Calculator,
  LightbulbSparkles,
  Send,
  SpinnerGap as Loader2,
  CheckCircle as CheckCircle2,
  WarningCircle as AlertCircle,
  CircleUser,
  Mail,
  BadgeInfo,
} from '@/components/icons';
import {
  CHIP_TOKENS,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_DUOTONE_ISOLATION_CLASSES,
} from '../tokens/chipTokens';
import { useTranslation } from '../context/LanguageContext';

export type FeedbackCategory = 'Bug' | 'Physics/Math Tweak' | 'Feature Idea';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName?: string;
}

interface CategoryOption {
  id: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  theme: 'rose' | 'amber' | 'emerald';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  tripName,
}) => {
  const { lang, t } = useTranslation();
  const [category, setCategory] = useState<FeedbackCategory>('Bug');
  const [message, setMessage] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories: CategoryOption[] = [
    {
      id: 'Bug',
      label: t('feedbackCategoryBug'),
      description: t('feedbackCategoryBugDesc'),
      icon: Bug,
      theme: 'rose',
    },
    {
      id: 'Physics/Math Tweak',
      label: t('feedbackCategoryPhysics'),
      description: t('feedbackCategoryPhysicsDesc'),
      icon: Calculator,
      theme: 'amber',
    },
    {
      id: 'Feature Idea',
      label: t('feedbackCategoryFeature'),
      description: t('feedbackCategoryFeatureDesc'),
      icon: LightbulbSparkles,
      theme: 'emerald',
    },
  ];

  // Lock background scrolling when modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setIsSuccess(false);
      setErrorMessage(null);
    }, 300);
  };

  const handleResetForm = () => {
    setMessage('');
    setName('');
    setEmail('');
    setIsSuccess(false);
    setErrorMessage(null);
    setCategory('Bug');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setErrorMessage(t('feedbackErrorEmpty'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, string> = {
        category,
        categoryLabel: categories.find((c) => c.id === category)?.label || category,
        message: trimmedMsg,
        language: lang,
        source: 'FlightDeck',
        submittedAt: new Date().toISOString(),
      };

      if (tripName) {
        payload.tripName = tripName;
      }
      if (name.trim()) {
        payload.name = name.trim();
      }
      if (email.trim()) {
        payload.email = email.trim();
      }

      const response = await fetch('https://formspree.io/f/xljjadqj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
        setMessage('');
      } else {
        const data = await response.json().catch(() => null);
        let errorMsg = t('feedbackErrorSubmit');
        if (data && data.errors && Array.isArray(data.errors)) {
          errorMsg = data.errors.map((err: any) => err.message).join(', ');
        } else if (data && data.error) {
          errorMsg = data.error;
        }
        setErrorMessage(errorMsg);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t('feedbackErrorNetwork'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const messagePlaceholder =
    category === 'Bug'
      ? t('feedbackPlaceholderBug')
      : category === 'Physics/Math Tweak'
      ? t('feedbackPlaceholderPhysics')
      : t('feedbackPlaceholderFeature');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] bg-black/75 dark:bg-black/85 backdrop-blur-sm animate-apple-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-card text-ink rounded-card p-5 sm:p-6 shadow-2xl border border-ink/10 dark:border-white/10 transition-colors my-auto overflow-hidden animate-apple-modal">
        {/* ── Modal Header with High-Contrast Purple Brand Accent ── */}
        <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-ink/5 dark:border-white/10 shrink-0 animate-apple-in stagger-1">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${CHIP_TOKENS.purple.surface} ${CHIP_TOKENS.purple.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.purple.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} shadow-xs`}
            >
              <BadgeInfo size={20} className="w-5 h-5 text-current shrink-0" />
            </div>
            <div className="min-w-0">
              <h2
                id="feedback-modal-title"
                className="text-base sm:text-lg font-bold font-rounded text-ink tracking-tight truncate"
              >
                {t('feedbackModalTitle')}
              </h2>
              <p className="text-xs text-ink-muted truncate">
                {t('feedbackModalSub')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-chip transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            aria-label={t('menuClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        {isSuccess ? (
          <div className="py-6 sm:py-8 flex flex-col items-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30 flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-rounded text-ink tracking-tight mb-2">
              {t('feedbackConfirmation')}
            </h3>

            <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto mb-6 leading-relaxed">
              {t('feedbackSuccessSub')}
            </p>

            <div className="flex items-center justify-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-5 py-2.5 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs sm:text-sm cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all shadow-xs"
              >
                {t('feedbackDoneBtn')}
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink font-rounded font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {t('feedbackSendAnotherBtn')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                {t('feedbackCategoryLabel')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  const tokens = CHIP_TOKENS[cat.theme];
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-start gap-1 p-2.5 sm:p-3 rounded-pod text-left transition-all duration-150 cursor-pointer ${CHIP_RING_BASE} ${
                        isSelected
                          ? `${tokens.surface} ${tokens.primary} ${tokens.selectedRing} shadow-xs font-semibold`
                          : `${CHIP_RING_UNSELECTED} bg-pod hover:bg-chip text-ink-secondary hover:text-ink`
                      }`}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-current" />
                        <span className="font-rounded font-bold text-xs truncate">
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-[10px] leading-tight opacity-75 hidden sm:block">
                        {cat.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message Notice */}
            {errorMessage && (
              <div className="p-3 rounded-pod bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                <span>{t('feedbackMessageLabel')}</span>
                <span className="text-[11px] font-sans normal-case text-ink-muted/80">
                  {t('feedbackRequiredTag')}
                </span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={messagePlaceholder}
                className="w-full p-3 rounded-pod bg-pod border border-ink/10 dark:border-white/10 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-volt font-body text-xs sm:text-sm leading-relaxed transition-colors resize-none"
              />
            </div>

            {/* Optional Contact Fields (Name & Email) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                  {t('feedbackNameLabel')}{' '}
                  <span className="font-sans normal-case text-ink-muted/80 font-normal">
                    {t('feedbackOptionalTag')}
                  </span>
                </label>
                <div className="relative">
                  <CircleUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('feedbackNamePlaceholder')}
                    className="w-full pl-9 pr-3 py-2 rounded-pod bg-pod border border-ink/10 dark:border-white/10 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-volt font-body text-xs sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                  {t('feedbackEmailLabel')}{' '}
                  <span className="font-sans normal-case text-ink-muted/80 font-normal">
                    {t('feedbackOptionalTag')}
                  </span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('feedbackEmailPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 rounded-pod bg-pod border border-ink/10 dark:border-white/10 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-volt font-body text-xs sm:text-sm transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-ink/5 dark:border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink font-rounded text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('feedbackCancelBtn')}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] font-rounded font-bold text-xs sm:text-sm cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                    <span>{t('feedbackSendingBtn')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-current" />
                    <span>{t('feedbackSubmitBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
