import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, SlidersHorizontal } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { BIKE_OPTIONS } from './constants';

interface Screen5RiderBikeProps {
  riderWeightKg: number;
  onChangeRiderWeight: (kg: number) => void;
  luggageWeightKg: number;
  onChangeLuggageWeight: (kg: number) => void;
  selectedBikeId: string;
  onChangeSelectedBike: (bikeId: string) => void;
  bikeWeightKg: number;
  onChangeBikeWeight: (kg: number) => void;
  isTubeless: boolean;
  onChangeIsTubeless: (tubeless: boolean) => void;
  cda: number;
  onChangeCda: (cda: number) => void;
  crr: number;
  onChangeCrr: (crr: number) => void;
  drivetrainEfficiency: number;
  onChangeDrivetrainEfficiency: (eff: number) => void;
  estimatedMinutes: number;
  selectedSpeedKmH: number;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}

export const Screen5RiderBike: React.FC<Screen5RiderBikeProps> = ({
  riderWeightKg,
  onChangeRiderWeight,
  luggageWeightKg,
  onChangeLuggageWeight,
  selectedBikeId,
  onChangeSelectedBike,
  bikeWeightKg,
  onChangeBikeWeight,
  isTubeless,
  onChangeIsTubeless,
  cda,
  onChangeCda,
  crr,
  onChangeCrr,
  drivetrainEfficiency,
  onChangeDrivetrainEfficiency,
  estimatedMinutes,
  selectedSpeedKmH,
  onBack,
  onSkip,
  onContinue,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [isTechOpen, setIsTechOpen] = useState(false);

  const currentBike = BIKE_OPTIONS.find((b) => b.id === selectedBikeId) || BIKE_OPTIONS[0];

  const handleBikeChange = (newBikeId: string) => {
    onChangeSelectedBike(newBikeId);
    const bikeDef = BIKE_OPTIONS.find((b) => b.id === newBikeId);
    if (bikeDef) {
      onChangeBikeWeight(bikeDef.weightKg);
      onChangeCda(bikeDef.cda);
      onChangeCrr(bikeDef.crr);
      onChangeIsTubeless(bikeDef.isTubeless);
      onChangeDrivetrainEfficiency(bikeDef.drivetrainEfficiency);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1">
        {/* Left Column: Setup Form */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-volt" />
            <span>{isFr ? 'VÉLO & CYCLISTE · OPTIONNEL' : 'RIDER & BIKE · OPTIONAL'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-3">
            {isFr ? 'Un peu de configuration, si vous le souhaitez.' : 'A little setup, only if you want.'}
          </h2>

          <p className="text-sm text-ink-secondary mb-5 font-body">
            {isFr
              ? 'Conservez les réglages par défaut ou ajustez votre monture. Aucun profil personnel n’est requis.'
              : 'Keep these defaults or fine-tune your bike specs. You can plan this ride without a personal profile.'}
          </p>

          {/* Informational Notice Box */}
          <div className="p-4 rounded-pod bg-pod border border-black/5 dark:border-white/10 mb-5 text-xs text-ink-secondary font-body leading-relaxed">
            {isFr
              ? 'Les valeurs par défaut sont affichées ci-dessous. Ajustez le poids ou affinez les spécifications techniques de votre vélo si utile.'
              : 'Example defaults are shown below. Adjust weights or fine-tune your bike specifications if helpful.'}
          </div>

          {/* 2-Column Weights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Rider Weight */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
                {isFr ? 'Poids du cycliste' : 'Rider weight'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="35"
                  max="160"
                  value={riderWeightKg}
                  onChange={(e) => onChangeRiderWeight(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3.5 pr-12 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-rounded font-bold tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
                />
                <span className="absolute right-3 text-xs font-medium text-ink-muted font-body pointer-events-none">
                  kg
                </span>
              </div>
              <span className="block text-[11px] text-ink-muted font-body mt-1">
                {isFr ? 'Par défaut · ajustable' : 'Default · adjust if useful'}
              </span>
            </div>

            {/* Luggage Weight */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
                {isFr ? 'Poids des bagages' : 'Luggage weight'}
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={luggageWeightKg}
                  onChange={(e) => onChangeLuggageWeight(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3.5 pr-12 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-rounded font-bold tnum focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
                />
                <span className="absolute right-3 text-xs font-medium text-ink-muted font-body pointer-events-none">
                  kg
                </span>
              </div>
              <span className="block text-[11px] text-ink-muted font-body mt-1">
                {isFr ? 'Par défaut · sans bagages' : 'Default · no luggage'}
              </span>
            </div>
          </div>

          {/* Bike Selection Dropdown */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
              {isFr ? 'Type de vélo' : 'Bike'}
            </label>
            <div className="relative">
              <select
                value={selectedBikeId}
                onChange={(e) => handleBikeChange(e.target.value)}
                className="w-full min-h-[46px] px-3.5 pr-10 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-body appearance-none focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs cursor-pointer"
              >
                {BIKE_OPTIONS.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {isFr ? bike.nameFr : bike.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
                ▾
              </div>
            </div>
            <span className="block text-[11px] text-ink-muted font-body mt-1">
              {isFr
                ? 'Par défaut · choisissez un autre vélo si nécessaire'
                : 'Default · choose a different bike if needed'}
            </span>
          </div>

          {/* Collapsible Technical Bike Details / Fine-Tuning */}
          <div className="pt-2 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsTechOpen(!isTechOpen)}
              className="text-xs font-rounded font-bold text-ink hover:underline flex items-center gap-1.5 py-1.5 cursor-pointer"
            >
              <SlidersHorizontal size={13} className="text-current" />
              <span>
                {isFr
                  ? 'Affiner les données techniques du vélo · optionnel'
                  : 'Fine-tune technical bike details · optional'}
              </span>
              <span>{isTechOpen ? '▾' : '▸'}</span>
            </button>

            {isTechOpen && (
              <div className="mt-3 p-4 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-4 animate-apple-step-in text-xs">
                {/* Bike Weight Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <span className="text-ink-secondary font-medium font-body">
                    {isFr ? 'Poids du vélo (cadre + composants)' : 'Bike weight (frame + parts)'}
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      max="35"
                      value={bikeWeightKg}
                      onChange={(e) => onChangeBikeWeight(Number(e.target.value))}
                      className="w-full min-h-[38px] px-3 pr-10 rounded-sub-pod bg-card border border-black/15 dark:border-white/20 text-ink text-xs font-rounded font-bold tnum focus:outline-none focus:ring-1 focus:ring-ink dark:focus:ring-white shadow-2xs"
                    />
                    <span className="absolute right-3 text-[11px] font-medium text-ink-muted font-body pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                {/* Tubeless Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-ink font-medium block">
                      {isFr ? 'Montage Tubeless' : 'Tubeless setup'}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {isFr ? 'Réduit la résistance au roulement Crr' : 'Lowers rolling resistance Crr'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeIsTubeless(!isTubeless)}
                    className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer ${
                      isTubeless
                        ? 'bg-ink text-canvas dark:bg-white dark:text-black shadow-xs'
                        : 'bg-card border border-black/15 dark:border-white/20 text-ink'
                    }`}
                  >
                    {isTubeless ? (isFr ? 'Tubeless Actif' : 'Tubeless Active') : (isFr ? 'Chambre à air' : 'Inner Tube')}
                  </button>
                </div>

                {/* Aerodynamic Drag Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>{isFr ? 'Traînée aérodynamique (CdA)' : 'Aerodynamic drag (CdA)'}</span>
                    <span className="font-rounded font-bold text-ink tnum">{cda.toFixed(2)} m²</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.55"
                    step="0.01"
                    value={cda}
                    onChange={(e) => onChangeCda(Number(e.target.value))}
                    className="peloton-slider w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>{isFr ? 'Aéro CLM (0.28)' : 'Aero TT (0.28)'}</span>
                    <span>{isFr ? 'Gravel (0.38)' : 'Gravel (0.38)'}</span>
                    <span>{isFr ? 'Urbain relevé (0.48)' : 'Upright Urban (0.48)'}</span>
                  </div>
                </div>

                {/* Rolling Resistance Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>{isFr ? 'Résistance au roulement (Crr)' : 'Rolling resistance (Crr)'}</span>
                    <span className="font-rounded font-bold text-ink tnum">{crr.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0035"
                    max="0.0080"
                    step="0.0001"
                    value={crr}
                    onChange={(e) => onChangeCrr(Number(e.target.value))}
                    className="peloton-slider w-full cursor-pointer"
                  />
                </div>

                {/* Drivetrain Efficiency Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>{isFr ? 'Rendement de transmission' : 'Drivetrain efficiency'}</span>
                    <span className="font-rounded font-bold text-ink tnum">
                      {Math.round(drivetrainEfficiency * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.90"
                    max="0.99"
                    step="0.01"
                    value={drivetrainEfficiency}
                    onChange={(e) => onChangeDrivetrainEfficiency(Number(e.target.value))}
                    className="peloton-slider w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>{isFr ? 'Standard (93%)' : 'Standard (93%)'}</span>
                    <span>{isFr ? 'Nettoyé (95%)' : 'Cleaned (95%)'}</span>
                    <span>{isFr ? 'Cire Course (97-98%)' : 'Race Wax (97-98%)'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reassurance Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bento-card bg-pod/60 dark:bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <h3 className="text-base font-rounded font-bold text-ink mb-3 leading-snug">
              {isFr ? 'Votre sortie reste simple' : 'Your ride stays simple'}
            </h3>

            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed mb-4 font-body">
              {isFr
                ? `Cet aperçu utilise l’allure choisie (${selectedSpeedKmH} km/h). Les détails du cycliste et du vélo n’altèrent pas votre allure cible.`
                : `This preview uses the pace you chose. Rider and bike details don’t change your selected ${selectedSpeedKmH} km/h pace.`}
            </p>

            <div className="flex items-center justify-between py-2 border-y border-black/5 dark:border-white/10 text-xs font-medium mb-4">
              <span className="text-ink-muted">
                {isFr ? 'Temps de pédalage estimé' : 'Estimated riding time'}
              </span>
              <span className="text-sm font-rounded font-bold text-ink tnum">
                {estimatedMinutes} min
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check size={14} className="stroke-[3]" />
              <span>
                {isFr ? 'Valeurs par défaut sélectionnées' : 'Example defaults selected'}
              </span>
            </div>
          </div>

          <p className="text-xs text-ink-muted font-body leading-relaxed mt-4 px-1">
            {isFr
              ? 'L’option « Passer pour l’instant » conserve ces réglages par défaut et ouvre immédiatement l’aperçu. Vous pourrez y revenir à tout moment.'
              : 'Skip for now keeps these defaults and opens your ride preview. You can revisit this setup from the preview whenever you need it.'}
          </p>
        </div>
      </div>

      {/* Footer Navigation Bar - Sticky Mobile Bar */}
      <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-md pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] -mx-4 sm:-mx-8 md:-mx-10 px-4 sm:px-8 md:px-10 mt-auto">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <ArrowLeft size={14} />
          <span>{isFr ? 'Retour' : 'Back'}</span>
        </button>

        <span className="text-xs text-ink-muted font-body text-center">
          {isFr
            ? 'Optionnel · les deux actions ouvrent votre aperçu'
            : 'Optional · both actions open your preview'}
        </span>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Secondary Skip for now button */}
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-pod hover:bg-chip text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer"
          >
            {isFr ? 'Passer pour l’instant' : 'Skip for now'}
          </button>

          {/* Primary View Ride Button */}
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 sm:flex-none min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{isFr ? 'Appliquer et voir la sortie' : 'Apply setup & view ride'}</span>
            <ArrowRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
