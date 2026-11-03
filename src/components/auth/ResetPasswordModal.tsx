import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { KeyRound, Eye, EyeOff, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  CHIP_RING_BASE,
} from '../../tokens/chipTokens';

export const ResetPasswordModal: React.FC = () => {
  const { isPasswordRecoveryOpen, setIsPasswordRecoveryOpen, updatePassword } = useAuth();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isPasswordRecoveryOpen) {
      setPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isPasswordRecoveryOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isPasswordRecoveryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPasswordRecoveryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPasswordRecoveryOpen, setIsPasswordRecoveryOpen]);

  if (!isPasswordRecoveryOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage(t('passwordPlaceholder'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          setIsPasswordRecoveryOpen(false);
        }, 1800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))] overflow-y-auto animate-apple-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) setIsPasswordRecoveryOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-modal-title"
    >
      <div className="bg-card text-ink border border-ink/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative my-auto animate-apple-modal">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsPasswordRecoveryOpen(false)}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-pod dark:bg-canvas hover:bg-chip flex items-center justify-center text-ink-muted hover:text-ink transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
          aria-label="Close modal"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Brand Icon Header */}
        <div className="flex items-center gap-3 mb-5 animate-apple-in stagger-1">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="reset-password-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-ink">
              {t('newPasswordModalTitle')}
            </h2>
            <p className="text-xs text-ink-muted">
              Supabase Password Recovery
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-[13px] text-ink-secondary mb-6 leading-relaxed">
          {t('newPasswordModalSubtitle')}
        </p>

        {/* Status / Feedback Banners */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t('passwordUpdatedSuccess')}</span>
          </div>
        )}

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
              {t('newPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-pod dark:bg-canvas border border-ink/10 dark:border-white/10 focus:border-volt focus:ring-1 focus:ring-volt outline-none text-sm text-ink placeholder:text-ink-muted transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
              {t('confirmPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-pod dark:bg-canvas border border-ink/10 dark:border-white/10 focus:border-volt focus:ring-1 focus:ring-volt outline-none text-sm text-ink placeholder:text-ink-muted transition-colors font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-volt text-[#111111] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm font-sans"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('savingNewPassword')}</span>
              </>
            ) : (
              <span>{t('saveNewPasswordBtn')}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
