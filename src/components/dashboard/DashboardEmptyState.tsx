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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in">
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              {isFr ? 'Aucun profil de trajet pour le moment' : 'No Trip Profiles Yet'}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              {isFr
                ? 'Votre Flight Deck est prêt. Calibrez votre première sortie avec aérodynamisme CdA, rétro-planning horaire et ravitaillement en aliments bruts, ou explorez immédiatement avec une sortie démo.'
                : 'Your Flight Deck is ready. Calibrate your first ride with CdA aerodynamics, exact reverse schedule, and whole-food fueling, or instantly explore with a verified demo trip.'}
            </p>
          </div>

          {/* 3 Core Capability Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <Lightning className="w-4 h-4 text-volt-dim dark:text-volt" />
                <span>{isFr ? 'Aéro & Watts' : 'Aero & Watts'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr ? 'Calcul CdA, Crr et résistance au vent de face.' : 'CdA drag, rolling resistance & headwind physics.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{isFr ? 'Rétro-planning' : 'Reverse Timeline'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr ? 'Heure exacte de départ selon vos marges vestiaire.' : 'Exact hard rollout backward from your target.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-pod border border-black/5 dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <ForkKnife className="w-4 h-4 text-emerald-500" />
                <span>{isFr ? 'Carburant brut' : 'Real-Food Fueling'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">
                {isFr ? 'Dattes Medjool, figues, Skyr 0%, zéro gel chimique.' : 'Medjool dates, Turkish figs, 0% Skyr, zero synthetic gels.'}
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
