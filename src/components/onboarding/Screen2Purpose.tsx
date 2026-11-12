import React from 'react';
import { Check } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { CHIP_TOKENS, CHIP_RING_BASE } from '../../tokens/chipTokens';
import { PURPOSES } from './constants';
import { RidePurposeId } from './types';

interface Screen2PurposeProps {
  selectedPurpose: RidePurposeId;
  onSelectPurpose: (purpose: RidePurposeId) => void;
}

export const Screen2Purpose: React.FC<Screen2PurposeProps> = ({
  selectedPurpose,
  onSelectPurpose,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  const activeDef = PURPOSES.find((p) => p.id === selectedPurpose) || PURPOSES[0];

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1">
        {/* Left Column: Purpose Selection Form */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
            <span>{isFr ? 'Profil de sortie' : 'Ride purpose'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-3">
            {isFr ? 'Pourquoi roulez-vous aujourd’hui ?' : 'What are you riding for?'}
          </h2>

          <p className="text-sm text-ink-secondary mb-6 font-body">
            {isFr
              ? 'Choisissez le profil le plus proche. Les étapes suivantes s’adapteront à votre pratique.'
              : 'Choose the closest fit. We’ll keep the next choices relevant to your ride.'}
          </p>

          {/* Radio Options Grid */}
          <div
            role="radiogroup"
            aria-label={isFr ? 'Choisir l’objectif de votre sortie' : 'Choose ride purpose'}
            className="space-y-3"
          >
            {PURPOSES.map((purpose) => {
              const isSelected = selectedPurpose === purpose.id;

              return (
                <div
                  key={purpose.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => onSelectPurpose(purpose.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onSelectPurpose(purpose.id);
                    }
                  }}
                  className={`relative flex items-center justify-between p-4 rounded-pod transition-all cursor-pointer select-none active:scale-[0.99] min-h-[58px] ${
                    isSelected
                      ? 'bg-card text-ink ring-2 ring-inset ring-[#4D7C0F] dark:ring-volt shadow-xs'
                      : 'bg-card hover:bg-pod/60 text-ink ring-1 ring-inset ring-black/10 dark:ring-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    {/* Concentric Radio Circle */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-2 border-[#4D7C0F] dark:border-volt'
                          : 'border border-ink/40 dark:border-white/40'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
                      )}
                    </div>

                    {/* Purpose Text Details */}
                    <div className="min-w-0">
                      <div className="text-sm font-rounded font-bold text-ink leading-snug">
                        {isFr ? purpose.nameFr : purpose.name}
                      </div>
                      <div className="text-xs text-ink-muted leading-tight mt-0.5 font-body break-words">
                        {isFr ? purpose.subtitleFr : purpose.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Selected Pill Badge */}
                  {isSelected && (
                    <span className={`shrink-0 text-[11px] font-rounded font-bold px-2 py-0.5 rounded-full ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}>
                      {isFr ? 'Sélectionné' : 'Selected'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Context Preview Pod */}
        <div className="lg:col-span-5 flex flex-col justify-start">
          <div className="bento-card bg-pod/60 dark:bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <h3 className="text-base font-rounded font-bold text-ink mb-3 leading-snug">
              {isFr ? activeDef.contextTitleFr : activeDef.contextTitle}
            </h3>

            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed mb-4 font-body">
              {isFr ? activeDef.contextBodyFr : activeDef.contextBody}
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check size={14} className="stroke-[3]" />
              <span>
                {isFr
                  ? `${activeDef.nameFr} sélectionné`
                  : `${activeDef.name} selected`}
              </span>
            </div>
          </div>

          <p className="text-xs text-ink-muted font-body leading-relaxed mt-4 px-1">
            {isFr
              ? 'Aucun profil sportif ni connaissance technique requise. Votre objectif adapte les options utiles, pas une vitesse imposée.'
              : 'No fitness profile or technical knowledge needed. Your purpose sets up helpful choices, not a fixed riding speed.'}
          </p>
        </div>
      </div>
    </div>
  );
};
