import React from 'react';
import { Check, X, Sun, Moon } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CHIP_TOKENS, CHIP_RING_BASE } from '../../tokens/chipTokens';

interface OnboardingHeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  onClose: () => void;
}

const STEP_LABELS = [
  { step: 1, label: 'Purpose', labelFr: 'Profil' },
  { step: 2, label: 'Route', labelFr: 'Parcours' },
  { step: 3, label: 'Timing & pace', labelFr: 'Allure & horaires' },
  { step: 4, label: 'Rider & bike', labelFr: 'Vélo & équipement' },
];

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  currentStep,
  onStepClick,
  onClose,
}) => {
  const { lang, setLang } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const isFr = lang === 'fr';

  const isWelcome = currentStep === 0;
  const isRideReady = currentStep === 5;
  const isSaveSync = currentStep === 6;

  return (
    <header className="w-full shrink-0 border-b border-black/5 dark:border-white/10 bg-card select-none">
      {/* Top Bar: Brand, Reassurance Tag & Controls */}
      <div className="px-4 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 border-b border-black/5 dark:border-white/5">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <span className="font-rounded font-extrabold text-xl sm:text-2xl text-ink tracking-tight">
            cadence
          </span>
          <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-volt-lime"></span>
          <span className="hidden md:inline text-[11px] font-mono tracking-wider text-ink-muted uppercase">
            {isFr ? 'Planificateur de sortie' : 'Ride planner'}
          </span>
        </div>

        {/* Guest Reassurance Caption & Utilities */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-medium text-ink-muted">
            {isFr ? 'Planification invité · aucun compte requis' : 'Guest planning · no account needed'}
          </span>

          {/* Language Selector Pill */}
          <div
            role="group"
            aria-label={isFr ? 'Sélecteur de langue' : 'Language selector'}
            className="flex items-center rounded-full bg-pod p-0.5 border border-black/5 dark:border-white/10 text-xs font-bold"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                lang === 'en'
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="Switch to English"
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                lang === 'fr'
                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="Passer en Français"
              aria-pressed={lang === 'fr'}
            >
              FR
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-pod hover:bg-chip flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer border border-black/5 dark:border-white/10 text-ink"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun size={15} className="shrink-0 text-current" />
            ) : (
              <Moon size={15} className="shrink-0 text-current" />
            )}
          </button>

          {/* Dismiss Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-pod hover:bg-chip flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer border border-black/5 dark:border-white/10 text-ink-muted hover:text-ink"
            title={isFr ? 'Fermer l’assistant' : 'Close and dismiss'}
            aria-label={isFr ? 'Fermer l’assistant' : 'Close and dismiss'}
          >
            <X size={16} className="shrink-0 text-current" />
          </button>
        </div>
      </div>

      {/* Sub-Header Shelf: Stepper Timeline */}
      <div className="px-4 sm:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 bg-pod/40 dark:bg-card/40">
        {/* Status / Step Title */}
        <div className="text-xs font-semibold font-rounded text-ink tracking-tight shrink-0">
          {isWelcome && (isFr ? '4 étapes vers votre sortie' : '4 steps to your ride')}
          {currentStep === 1 && (isFr ? 'Étape 1 sur 4' : 'Step 1 of 4')}
          {currentStep === 2 && (isFr ? 'Étape 2 sur 4' : 'Step 2 of 4')}
          {currentStep === 3 && (isFr ? 'Étape 3 sur 4' : 'Step 3 of 4')}
          {currentStep === 4 && (isFr ? 'Étape 4 sur 4' : 'Step 4 of 4')}
          {isRideReady && (isFr ? '4 sur 4 · Terminé' : '4 of 4 · complete')}
          {isSaveSync && (isFr ? 'Optionnel · Enregistrer & synchroniser' : 'Optional · save & sync')}
        </div>

        {/* Stepper Dots & Labels */}
        {!isSaveSync ? (
          <nav
            aria-label="Onboarding Steps"
            className="flex items-center gap-2 sm:gap-4 flex-wrap text-xs font-medium"
          >
            {STEP_LABELS.map((item) => {
              const stepNum = item.step;
              const isCurrent = currentStep === stepNum;
              const isCompleted = currentStep > stepNum || isRideReady;
              const isPastOrCurrent = currentStep >= stepNum;

              return (
                <button
                  key={stepNum}
                  type="button"
                  onClick={() => onStepClick && isCompleted && onStepClick(stepNum)}
                  disabled={!isCompleted && !isCurrent}
                  className={`inline-flex items-center gap-1.5 transition-all ${
                    isCurrent
                      ? 'text-ink font-bold'
                      : isCompleted
                      ? 'text-ink hover:text-ink cursor-pointer font-medium'
                      : 'text-ink-muted/60 cursor-default'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-rounded font-bold transition-all ${
                      isCurrent
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : isCompleted
                        ? 'bg-ink text-canvas dark:bg-white dark:text-black'
                        : 'border border-ink/20 dark:border-white/20 text-ink-muted'
                    }`}
                  >
                    {isCompleted && !isWelcome ? (
                      <Check size={12} className="stroke-[3] animate-apple-check-pop" />
                    ) : (
                      stepNum
                    )}
                  </span>
                  <span className="hidden sm:inline">
                    {isFr ? item.labelFr : item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="text-xs text-ink-muted">
            {isFr
              ? 'Votre aperçu de sortie est déjà disponible. Ce choix n’est pas une étape obligatoire.'
              : 'Your ride preview is already available. This choice is not a planning step.'}
          </div>
        )}
      </div>
    </header>
  );
};
