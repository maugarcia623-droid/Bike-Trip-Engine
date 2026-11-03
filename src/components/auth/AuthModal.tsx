import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  CHIP_RING_BASE,
} from '../../tokens/chipTokens';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    signIn,
    signUp,
    signInWithMagicLink,
    resetPassword,
  } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reset errors and notice when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMessage(null);
      setSuccessNotice(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleMagicLink = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('enterEmailFirstError'));
      return;
    }

    setIsMagicLinkLoading(true);
    try {
      const { error } = await signInWithMagicLink(cleanEmail);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessNotice(t('magicLinkSentNotice'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send magic link.');
    } finally {
      setIsMagicLinkLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('enterEmailFirstError'));
      return;
    }

    setIsResetLoading(true);
    try {
      const { error } = await resetPassword(cleanEmail);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessNotice(t('resetPasswordSentNotice'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset link.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('enterEmailFirstError'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage(t('passwordPlaceholder'));
      return;
    }

    setIsLoading(true);

    try {
      if (authModalMode === 'login') {
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          closeAuthModal();
        }
      } else {
        const { error, unconfirmed } = await signUp(cleanEmail, password);
        if (error) {
          setErrorMessage(error.message);
        } else if (unconfirmed) {
          setSuccessNotice(t('authCheckEmail'));
        } else {
          closeAuthModal();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))] overflow-y-auto animate-apple-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-card text-ink border border-ink/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative my-auto animate-apple-modal">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={closeAuthModal}
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
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-ink">
              {t('authModalTitle')}
            </h2>
            <p className="text-xs text-ink-muted">
              Supabase Cloud Sync
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-[13px] text-ink-secondary mb-6 leading-relaxed">
          {t('authModalSubtitle')}
        </p>

        {/* Tab Switcher: Log In vs Sign Up */}
        <div className="flex rounded-full bg-pod p-1 mb-6 border border-ink/5">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              authModalMode === 'login'
                ? 'bg-card text-ink shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('logIn')}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              authModalMode === 'signup'
                ? 'bg-card text-ink shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t('signUp')}
          </button>
        </div>

        {/* Status / Feedback Banners */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-pod dark:bg-canvas border border-ink/10 dark:border-white/10 focus:border-volt focus:ring-1 focus:ring-volt outline-none text-sm text-ink placeholder:text-ink-muted transition-colors font-sans"
              />
            </div>
          </div>

          {/* Magic Link (No Password) Trigger Button */}
          {authModalMode === 'login' && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isMagicLinkLoading || isLoading || isResetLoading}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-[13px] bg-pod dark:bg-canvas hover:bg-chip text-ink border border-ink/10 dark:border-white/10 hover:border-volt/60 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
              >
                {isMagicLinkLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted" />
                    <span>{t('sendingMagicLink')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-volt group-hover:rotate-12 transition-transform" />
                    <span>{t('sendMagicLinkBtn')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Divider between Magic Link & Password Flow */}
          {authModalMode === 'login' && (
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-ink/10 dark:border-white/10 w-full" />
              <span className="bg-card px-2.5 text-[10px] font-mono uppercase tracking-wider text-ink-muted absolute">
                {t('orDivider')}
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                {t('passwordLabel')}
              </label>
              {authModalMode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetLoading || isMagicLinkLoading || isLoading}
                  className="text-[11px] text-ink-muted hover:text-ink hover:underline decoration-ink/30 cursor-pointer focus:outline-none transition-colors"
                >
                  {isResetLoading ? t('sendingResetLink') : t('forgotPasswordBtn')}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={authModalMode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-pod dark:bg-canvas border border-ink/10 dark:border-white/10 focus:border-volt focus:ring-1 focus:ring-volt outline-none text-sm text-ink placeholder:text-ink-muted transition-colors font-sans"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-volt text-[#111111] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm font-sans"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{authModalMode === 'login' ? t('logIn') : t('signUp')}...</span>
              </>
            ) : (
              <span>{authModalMode === 'login' ? t('logInBtn') : t('createAccountBtn')}</span>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode(authModalMode === 'login' ? 'signup' : 'login');
              setErrorMessage(null);
            }}
            className="text-xs text-ink-secondary hover:text-ink underline decoration-ink/30 underline-offset-4 cursor-pointer focus:outline-none transition-colors"
          >
            {authModalMode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
          </button>
        </div>

        {/* Subtitle helper note */}
        <div className="mt-6 pt-4 border-t border-ink/5 text-center">
          <p className="text-[11px] text-ink-muted leading-relaxed">
            {t('cloudSyncHelp')}
          </p>
        </div>
      </div>
    </div>
  );
};
