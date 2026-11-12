import React from 'react';
import { Bicycle, Plus, Sparkle, Lightning, Clock, ForkKnife } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { CHIP_TOKENS, CHIP_RING_BASE, CHIP_DUOTONE_ISOLATION_CLASSES } from '../../tokens/chipTokens';

interface DashboardEmptyStateProps {
  onCreateFirstTrip: () => void;
  onLoadDemoTrip: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onCreateFirstTrip,
  onLoadDemoTrip,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 py-10 sm:py-16 animate-apple-in">
      <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-6 sm:p-12 text-center shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-volt/10 dark:bg-volt/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          {/* Brand Icon Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-volt text-[#111111] shadow-md mx-auto">
            <Bicycle size={36} className="w-9 h-9 sm:w-11 sm:h-11 text-[#111111]" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2">
            <h2 className="font-rounded text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {isFr ? 'Aucune sortie planifiée' : 'No rides planned yet'}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              {isFr
                ? 'Votre espace Cadence est prêt. Planifiez votre première sortie avec météo en direct, timing d’arrivée serein et ravitaillement simple, ou découvrez l’application avec un exemple.'
                : 'Your Cadence planner is ready. Set up your first ride with live weather, calm arrival timing, and simple fueling, or explore right away with an example trip.'}
            </p>
          </div>

          {/* 3 Core Capability Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <Lightning className="w-4 h-4 text-volt-dim dark:text-volt" />
                <span>{isFr ? 'Allure & Vent' : 'Pace & Wind'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr ? 'Estimation de l’allure, du relief et du vent sur le parcours.' : 'Realistic pace, elevation & wind impact along your route.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{isFr ? 'Rétro-planning' : 'Reverse Timeline'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr ? 'Heure exacte de départ selon vos marges et préparatifs.' : 'Exact departure time backward from your target.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <ForkKnife className="w-4 h-4 text-emerald-500" />
                <span>{isFr ? 'Carburant brut' : 'Real-Food Fueling'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr
                  ? 'Dattes, bananes, barres simples — adaptées à vos préférences.'
                  : 'Real whole foods like dates, figs, and simple bars tailored to you.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Primary & Secondary */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {/* Primary Button: Create Your First Trip */}
            <button
              type="button"
              onClick={onCreateFirstTrip}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} font-bold text-sm transition-all shadow-md hover:brightness-[0.98] dark:hover:brightness-110 cursor-pointer active:scale-95`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isFr ? 'Créer votre premier trajet' : 'Create Your First Trip'}</span>
            </button>

            {/* Secondary Button: Load Sample Trip (Demo) */}
            <button
              type="button"
              onClick={onLoadDemoTrip}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-pod hover:bg-chip text-ink border border-black/10 dark:border-white/15 font-semibold text-sm transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Sparkle className="w-4 h-4 text-volt-dim dark:text-volt" />
              <span>{isFr ? 'Charger un trajet exemple (Démo)' : 'Load Sample Trip (Demo)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
