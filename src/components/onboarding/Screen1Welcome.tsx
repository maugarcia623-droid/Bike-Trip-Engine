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
              ? 'Partez de zéro ou explorez un exemple de sortie prêt à rouler. Vous pourrez modifier chaque paramètre par la suite.'
              : 'Start from scratch, or explore a short sample ride anywhere in the world. You can change every choice later.'}
          </p>
        </div>

        {/* Right Column: Ride Plan Screenshot Mockup */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative rounded-card overflow-hidden border border-black/5 dark:border-white/10 shadow-sm bg-card max-h-[420px] sm:max-h-[460px]">
            <img
              src="/images/ride-plan-light.jpg"
              alt={isFr ? 'Aperçu du plan de sortie Cadence' : 'Cadence ride plan preview'}
              className="w-full h-auto object-cover object-top block dark:hidden"
            />
            <img
              src="/images/ride-plan-dark.jpg"
              alt={isFr ? 'Aperçu du plan de sortie Cadence' : 'Cadence ride plan preview'}
              className="w-full h-auto object-cover object-top hidden dark:block"
            />
            {/* Soft blur & opacity gradient fade at the bottom */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/80 to-transparent backdrop-blur-[2px]"
              style={{
                maskImage: 'linear-gradient(to top, black 25%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 25%, transparent 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
