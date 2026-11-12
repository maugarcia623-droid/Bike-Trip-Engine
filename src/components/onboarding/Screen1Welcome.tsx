import React from 'react';
import { Check } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { SchematicRouteMap } from './SchematicRouteMap';

export const Screen1Welcome: React.FC = () => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        {/* Left Column: Narrative & Value Propositions */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
            <span>{isFr ? 'Votre prochaine sortie, en toute clarté' : 'Your next ride, made clear'}</span>
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
              <span className="text-xs font-rounded font-semibold text-ink-muted">
                {isFr ? 'Aperçu exemple' : 'Example preview'}
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
    </div>
  );
};
