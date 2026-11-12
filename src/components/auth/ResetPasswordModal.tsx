import React, { useState, useEffect, useId } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { ModalPortal } from '../common/ModalPortal';
import { KeyRound, Eye, EyeOff, Loader2, X, CheckCircle2, AlertCircle } from '@/components/icons';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  CHIP_RING_BASE,
} from '../../tokens/chipTokens';

export const ResetPasswordModal: React.FC = () => {
  const { isPasswordRecoveryOpen, setIsPasswordRecoveryOpen, updatePassword } = useAuth();
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';
  const titleId = useId();

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
    <ModalPortal
      isOpen={isPasswordRecoveryOpen}
      onClose={() => {
        if (!isLoading) setIsPasswordRecoveryOpen(false);
      }}
      closeOnEscape={!isLoading}
      closeOnBackdrop={!isLoading}
      labelledBy={titleId}
      zIndexClass="z-[1000]"
      panelClassName="bg-card text-ink border border-black/10 dark:border-white/10 rounded-card p-6 sm:p-8 max-w-md w-full shadow-2xl relative my-auto overflow-y-auto animate-apple-modal"
    >
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => setIsPasswordRecoveryOpen(false)}
        className="relative before:content-[''] before:absolute before:-inset-1.5 w-9 h-9 rounded-full bg-pod dark:bg-canvas hover:bg-surface-active flex items-center justify-center text-ink-muted hover:text-ink transition-all duration-150 active:scale-95 cursor-pointer focus:outline-none ml-auto float-right"
        aria-label={isFr ? 'Fermer' : 'Close'}
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
          <h2 id={titleId} className="text-lg sm:text-xl font-bold font-rounded tracking-tight text-ink">
            {t('newPasswordModalTitle')}
          </h2>
          <p className="text-xs text-ink-muted font-body">
            {isFr ? 'Récupération du compte' : 'Account recovery'}
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
            <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
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
                className="w-full min-h-[44px] pl-4 pr-11 py-2.5 rounded-pod bg-pod dark:bg-canvas border border-black/10 dark:border-white/10 focus:border-transparent focus:ring-2 focus:ring-inset focus:ring-volt outline-none text-base sm:text-sm text-ink placeholder:text-ink-muted transition-colors font-body"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="relative before:content-[''] before:absolute before:-inset-2 absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink focus:outline-none cursor-pointer"
                aria-label={showPassword ? (isFr ? 'Masquer' : 'Hide password') : (isFr ? 'Afficher' : 'Show password')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-rounded font-semibold text-ink-secondary mb-1.5">
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
                className="w-full min-h-[44px] pl-4 pr-11 py-2.5 rounded-pod bg-pod dark:bg-canvas border border-black/10 dark:border-white/10 focus:border-transparent focus:ring-2 focus:ring-inset focus:ring-volt outline-none text-base sm:text-sm text-ink placeholder:text-ink-muted transition-colors font-body"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full min-h-[46px] mt-2 py-3 px-4 rounded-pod font-rounded font-bold text-sm bg-volt text-[#111111] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
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
    </ModalPortal>
  );
};
