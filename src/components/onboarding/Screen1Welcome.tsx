import React from 'react';
import { Check, ArrowRight } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { SchematicRouteMap } from './SchematicRouteMap';

interface Screen1WelcomeProps {
  onStartPlanning: () => void;
  onTryExample: () => void;
}

export const Screen1Welcome: React.FC<Screen1WelcomeProps> = ({
  onStartPlanning,
  onTryExample,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        {/* Left Column: Narrative & Value Propositions */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-volt" />
            <span>{isFr ? 'VOTRE PROCHAINE SORTIE, EN TOUTE CLARTÉ' : 'YOUR NEXT RIDE, MADE CLEAR'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-rounded tracking-tight text-ink leading-tight sm:leading-none mb-4">
            {isFr ? (
              <>
                Sachez quand partir.<br />
                Profitez du trajet.
              </>
            ) : (
              <>
                Know when to leave.<br />
                Enjoy the ride.
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed mb-6 font-body max-w-xl">
            {isFr
              ? 'Choisissez un itinéraire et une allure confortable. Cadence estime votre temps de trajet et synchronise votre heure d’arrivée.'
              : 'Choose a route and a comfortable pace. Cadence helps you estimate your ride time and plan your arrival.'}
          </p>

          {/* Checklist */}
          <ul className="space-y-3 mb-6 font-body text-sm text-ink-secondary">
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                <Check size={12} className="stroke-[3]" />
              </span>
              <span>
                {isFr
                  ? 'Planifiez un trajet vélotaf, une séance sportive ou une balade'
                  : 'Plan a commute, workout or day out'}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                <Check size={12} className="stroke-[3]" />
              </span>
              <span>
                {isFr
                  ? 'Consultez un aperçu complet avant de créer un compte'
                  : 'See a useful ride preview before signing up'}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                <Check size={12} className="stroke-[3]" />
              </span>
              <span>
                {isFr
                  ? 'Ajoutez votre matériel et profil uniquement si vous le souhaitez'
                  : 'Add rider and bike details only if you want'}
              </span>
            </li>
          </ul>

          <p className="text-xs text-ink-muted leading-relaxed font-body">
            {isFr
              ? 'Partez de zéro ou découvrez un exemple de vélotaf nantais. Vous pourrez modifier chaque paramètre par la suite.'
              : 'Start from scratch, or explore a short example commute in Nantes. You can change every choice later.'}
          </p>
        </div>

        {/* Right Column: Example Preview Bento */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bento-card bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold tracking-wider text-ink-muted uppercase">
                {isFr ? 'APERÇU EXEMPLE' : 'EXAMPLE PREVIEW'}
              </span>
              <span className="w-2 h-2 rounded-full bg-volt-lime"></span>
            </div>

            <h3 className="text-base sm:text-lg font-rounded font-bold text-ink mb-3">
              Trentemoult → Nantes gare
            </h3>

            {/* Schematic Route Canvas */}
            <SchematicRouteMap
              originLabel="Trentemoult"
              destinationLabel="Nantes gare"
              distanceKm={6.0}
              estimatedMinutes={20}
              className="mb-4"
            />

            {/* Telemetry Metrics */}
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {isFr ? 'Distance exemple' : 'Example distance'}
                </span>
                <span className="text-sm font-rounded font-bold text-ink tnum">
                  6.0 km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {isFr ? 'Temps de pédalage estimé' : 'Estimated riding time'}
                </span>
                <span className="text-sm font-rounded font-bold text-ink tnum">
                  20 min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar - Sticky Mobile Bar */}
      <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-md pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] -mx-4 sm:-mx-8 md:-mx-10 px-4 sm:px-8 md:px-10 mt-auto">
        <span className="text-xs text-ink-muted font-body order-2 sm:order-1 text-center sm:text-left">
          {isFr ? 'Sans profil. Sans inscription. Juste votre sortie.' : 'No profile. No signup. Just a ride.'}
        </span>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end order-1 sm:order-2">
          {/* Secondary Outline Button */}
          <button
            type="button"
            onClick={onTryExample}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
          >
            {isFr ? 'Explorer l’exemple' : 'Try an example'}
          </button>

          {/* Primary Solid Button */}
          <button
            type="button"
            onClick={onStartPlanning}
            className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{isFr ? 'Commencer la planification' : 'Start planning'}</span>
            <ArrowRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
