import React, { useState } from 'react';
import { Check, Eye, EyeOff, SpinnerGap, Mail } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface Screen7SaveSyncProps {
  origin: string;
  destination: string;
  distanceKm: number;
  ridingMinutes: number;
  onAuthenticatedAndLaunch: () => void;
}

export const Screen7SaveSync: React.FC<Screen7SaveSyncProps> = ({
  origin,
  destination,
  distanceKm,
  ridingMinutes,
  onAuthenticatedAndLaunch,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const { signIn, signUp, signInWithMagicLink } = useAuth();

  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'magic'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const originShort = origin.split(',')[0].trim() || 'Trentemoult';
  const destShort = destination.split(',')[0].trim() || 'Nantes gare';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError(isFr ? 'Veuillez saisir votre adresse email.' : 'Please enter your email.');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'magic') {
        const { error } = await signInWithMagicLink(cleanEmail);
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess(
            isFr
              ? 'Lien de connexion envoyé ! Vérifiez votre boîte de réception.'
              : 'Magic sign-in link sent! Check your email inbox.'
          );
        }
      } else if (authMode === 'signup') {
        if (!password || password.length < 6) {
          setAuthError(
            isFr
              ? 'Le mot de passe doit comporter au moins 6 caractères.'
              : 'Password must be at least 6 characters.'
          );
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(cleanEmail, password);
        if (error) {
          setAuthError(error.message);
        } else {
          onAuthenticatedAndLaunch();
        }
      } else {
        // Login mode
        if (!password) {
          setAuthError(isFr ? 'Veuillez saisir votre mot de passe.' : 'Please enter your password.');
          setIsLoading(false);
          return;
        }
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          setAuthError(error.message);
        } else {
          onAuthenticatedAndLaunch();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || (isFr ? 'Erreur d’authentification.' : 'Authentication failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* Top Narrative Banner */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
          <span>{isFr ? 'Étape optionnelle' : 'Optional step'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-2">
          {isFr ? 'Emportez cette sortie. Ou restez ici.' : 'Take this ride with you. Or stay here.'}
        </h2>

        <p className="text-sm text-ink-secondary font-body">
          {isFr
            ? 'Votre aperçu est prêt dans les deux cas. Choisissez comment synchroniser ou enregistrer votre trajet.'
            : 'Your ride preview is ready either way. Choose how you want to keep planning.'}
        </p>
      </div>

      {/* 2 Parallel Comparison Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1 mb-6">
        {/* Card 1: Save to an Account (In-Window Direct Sign-In / Sign-Up Form) */}
        <div className="bento-card bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-rounded font-bold text-ink mb-2">
              {isFr ? 'Enregistrer sur un compte' : 'Save to an account'}
            </h3>

            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed mb-4 font-body">
              {isFr
                ? 'Connectez-vous ou créez un compte directement ici pour synchroniser ce trajet sur vos appareils.'
                : 'Sign in or create an account right here to sync this ride to your other devices.'}
            </p>

            {/* In-Window Segmented Auth Tabs (Pill Shaped with Consistent Margins) */}
            <div
              role="tablist"
              aria-label={isFr ? "Mode d'authentification" : 'Authentication mode'}
              className="grid grid-cols-3 p-1 gap-1 rounded-full bg-pod border border-black/5 dark:border-white/10 mb-5 text-xs font-rounded font-bold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                  authMode === 'signup'
                    ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
                }`}
              >
                {isFr ? 'Créer un compte' : 'Create account'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                  authMode === 'login'
                    ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
                }`}
              >
                {isFr ? 'Se connecter' : 'Sign in'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'magic'}
                onClick={() => {
                  setAuthMode('magic');
                  setAuthError(null);
                }}
                className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                  authMode === 'magic'
                    ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
                }`}
              >
                {isFr ? 'Lien e-mail' : 'Email link'}
              </button>
            </div>

            {/* Direct In-Window Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1 font-body">
                  Email
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cycliste@cadence.app"
                    className="w-full min-h-[44px] px-3.5 pr-10 rounded-pod bg-pod border border-black/10 dark:border-white/15 text-ink text-base sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink dark:focus:ring-white shadow-xs"
                  />
                  <Mail size={14} className="absolute right-3 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {authMode !== 'magic' && (
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1 font-body">
                    {isFr ? 'Mot de passe' : 'Password'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] px-3.5 pr-10 rounded-pod bg-pod border border-black/10 dark:border-white/15 text-ink text-base sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink dark:focus:ring-white shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="relative before:content-[''] before:absolute before:-inset-2 absolute right-3 text-ink-muted hover:text-ink cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-2 rounded-pod bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-[11.5px] text-amber-800 dark:text-amber-300 font-medium">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="p-2 rounded-pod bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-[11.5px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <Check size={13} className="stroke-[3]" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] px-4 py-2 mt-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isLoading && <SpinnerGap size={14} className="animate-spin" />}
                <span>
                  {authMode === 'signup'
                    ? isFr ? 'Créer mon compte & lancer' : 'Create account & launch'
                    : authMode === 'login'
                    ? isFr ? 'Se connecter & lancer' : 'Sign in & launch'
                    : isFr ? 'Envoyer le lien par e-mail' : 'Send sign-in link'}
                </span>
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-black/5 dark:border-white/10 mt-3 text-xs text-ink-muted font-body">
            {isFr
              ? 'Vos sorties sont synchronisées et sauvegardées de façon sécurisée.'
              : 'Your rides sync securely across your signed-in devices.'}
          </div>
        </div>

        {/* Card 2: Continue on This Device (informational — primary launch CTA sits in footer) */}
        <div className="bento-card bg-pod/60 dark:bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-rounded font-bold text-ink mb-2">
              {isFr ? 'Continuer sur cet appareil' : 'Stay on this device'}
            </h3>

            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed mb-4 font-body">
              {isFr
                ? 'Conservez cette sortie dans le stockage local de ce navigateur, sans créer de compte. Elle ne sera pas synchronisée ailleurs.'
                : 'Keep this ride in this browser’s local storage, without creating an account. It won’t sync to your other devices.'}
            </p>

            <p className="text-xs text-ink-muted leading-relaxed font-body mb-4">
              {isFr
                ? 'La suppression des données de navigation ou le mode privé peuvent effacer les trajets locaux.'
                : 'Clearing browser data or using private browsing may remove local rides. Another browser or device won’t have this local copy.'}
            </p>

            <div className="flex items-center gap-2 text-xs font-rounded font-semibold text-ink">
              <Check size={14} className="stroke-[3] text-emerald-700 dark:text-emerald-400" />
              <span>{isFr ? 'Vous pourrez créer un compte plus tard depuis le menu.' : 'You can sign in any time later from Settings.'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Row Strip */}
      <div className="p-3.5 rounded-pod bg-card border border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">
          {isFr ? 'Cette sortie' : 'This ride'}
        </span>
        <span className="text-xs sm:text-sm font-rounded font-bold text-ink tnum">
          {originShort} → {destShort} · {distanceKm.toFixed(1)} km · {isFr ? `estimé à ${ridingMinutes} min` : `estimated ${ridingMinutes} min riding`}
        </span>
      </div>
    </div>
  );
};
