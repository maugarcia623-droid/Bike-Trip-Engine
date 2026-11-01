import React, { useState, useEffect } from 'react';
import { X, User, Bicycle, Check, Plus, Trash } from '@/components/icons';
import { RiderBikeSpecs, BikeSpec } from '../../types/specs';
import { saveRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';
import { useTranslation } from '../../context/LanguageContext';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface RiderBikeSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: RiderBikeSpecs;
  onSave: (updated: RiderBikeSpecs) => void;
}

export const RiderBikeSpecsModal: React.FC<RiderBikeSpecsModalProps> = ({
  isOpen,
  onClose,
  specs,
  onSave,
}) => {
  const { t } = useTranslation();
  const [localSpecs, setLocalSpecs] = useState<RiderBikeSpecs>(specs);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSpecs(specs);
    }
  }, [isOpen, specs]);

  if (!isOpen) return null;

  const activeBike = getActiveBike(localSpecs);

  const handleSelectBike = (bikeId: string) => {
    setLocalSpecs((prev) => ({
      ...prev,
      activeBikeId: bikeId,
    }));
  };

  const handleAddBike = () => {
    const newId = `bike-${Date.now()}`;
    const newBike: BikeSpec = {
      id: newId,
      name: t('newBikeDefaultName', { num: localSpecs.bikes.length + 1 }),
      weightKg: 9.5,
      crr: 0.0055,
      cda: 0.38,
    };
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: [...prev.bikes, newBike],
      activeBikeId: newId,
    }));
  };

  const handleRemoveBike = (bikeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSpecs((prev) => {
      if (prev.bikes.length <= 1) return prev;
      const remaining = prev.bikes.filter((b) => b.id !== bikeId);
      const nextActiveId = prev.activeBikeId === bikeId ? remaining[0].id : prev.activeBikeId;
      return {
        ...prev,
        bikes: remaining,
        activeBikeId: nextActiveId,
      };
    });
  };

  const handleUpdateActiveBike = (field: keyof BikeSpec, value: any) => {
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) =>
        b.id === prev.activeBikeId ? { ...b, [field]: value } : b
      ),
    }));
  };

  const handleSave = () => {
    saveRiderBikeSpecs(localSpecs);
    onSave(localSpecs);
    setHasSaved(true);
    setTimeout(() => {
      setHasSaved(false);
      onClose();
    }, 450);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 dark:bg-black/75 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] max-h-[90dvh] flex flex-col bg-card text-ink rounded-card p-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <IconBadge theme="yellow-vest" icon={User} size="lg" isSelected solidBacker />
            <div className="min-w-0">
              <h2 id="specs-modal-title" className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                {t('specsModalTitle')}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('specsModalSub')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalAria')}
            className={`w-9 h-9 shrink-0 rounded-full hover:text-ink hover:bg-chip flex items-center justify-center transition-colors cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <X className="w-4 h-4 text-current" />
          </button>
        </div>

        <div className="space-y-5 sm:space-y-6 flex-1 min-h-0 overflow-y-auto pr-0.5">
          {/* SECTION 1: RIDER METRICS */}
          <div>
            <div className="text-xs font-semibold text-ink-secondary mb-2.5">
              {t('riderPhysiologyHeading')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3.5 sm:p-4 rounded-pod bg-pod">
                <label className="block text-xs text-ink-muted mb-1 sm:mb-1.5">
                  {t('weightLabel')}
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={localSpecs.riderWeightKg}
                    onChange={(e) =>
                      setLocalSpecs((prev) => ({ ...prev, riderWeightKg: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                  />
                  <span className="text-xs text-ink-muted">kg</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-pod bg-pod">
                <label className="block text-xs text-ink-muted mb-1 sm:mb-1.5">
                  {t('heightLabel')}
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="1"
                    value={localSpecs.riderHeightCm}
                    onChange={(e) =>
                      setLocalSpecs((prev) => ({ ...prev, riderHeightCm: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                  />
                  <span className="text-xs text-ink-muted">cm</span>
                </div>
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-pod ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}
              >
                <label className="block text-xs opacity-80 mb-1 sm:mb-1.5">
                  {t('ftpBaselineLabel')}
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="5"
                    value={localSpecs.ftpWatts}
                    onChange={(e) =>
                      setLocalSpecs((prev) => ({ ...prev, ftpWatts: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full text-xl font-semibold text-current bg-transparent focus:outline-none tnum"
                  />
                  <span className="text-xs opacity-80">W</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: MULTI-BIKE GARAGE & ACTIVE SPECIFICATION */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <Bicycle className={`w-4 h-4 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
                <span>{t('bikeGarageHeading', { count: localSpecs.bikes.length })}</span>
              </div>

              <button
                type="button"
                onClick={handleAddBike}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-pod hover:bg-chip text-ink-secondary hover:text-ink transition-colors cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Plus className="w-3.5 h-3.5 text-current" />
                <span>{t('addBikeBtn')}</span>
              </button>
            </div>

            {/* Bike Garage Selector Pods */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3.5">
              {localSpecs.bikes.map((bike) => {
                const isSelected = bike.id === activeBike.id;
                return (
                  <div
                    key={bike.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectBike(bike.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectBike(bike.id);
                      }
                    }}
                    className={`relative rounded-pod p-2.5 text-left transition-all cursor-pointer select-none ${
                      isSelected
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : `bg-pod text-ink hover:bg-chip ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold truncate pr-5">
                        {bike.name}
                      </span>
                      {localSpecs.bikes.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBike(bike.id, e)}
                          title={t('removeBikeTitle')}
                          aria-label={t('removeBikeTitle')}
                          className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                        >
                          <Trash className="w-3 h-3 text-current" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-1 text-[11px] font-mono tnum opacity-80">
                      <span>{bike.weightKg}kg</span>
                      <span>CdA {bike.cda}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
              {t('activeBikeBuildHeading')}
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="px-4 py-3 rounded-2xl sm:rounded-full bg-pod flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                <label className="text-xs text-ink-muted shrink-0">
                  {t('modelNameLabel')}
                </label>
                <input
                  type="text"
                  value={activeBike.name}
                  onChange={(e) => handleUpdateActiveBike('name', e.target.value)}
                  className="w-full text-sm font-semibold text-ink text-left sm:text-right bg-transparent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3.5 sm:p-4 rounded-pod bg-pod">
                  <label className="block text-xs text-ink-muted mb-1 sm:mb-1.5">
                    {t('bicycleBuildRow')}
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={activeBike.weightKg}
                      onChange={(e) => handleUpdateActiveBike('weightKg', parseFloat(e.target.value) || 0)}
                      className="w-full text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                    />
                    <span className="text-xs text-ink-muted">kg</span>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-pod bg-pod">
                  <label className="block text-xs text-ink-muted mb-1 sm:mb-1.5">
                    {t('tireCrrLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.0005"
                    value={activeBike.crr}
                    onChange={(e) => handleUpdateActiveBike('crr', parseFloat(e.target.value) || 0.0055)}
                    className="w-full text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { val: 0.004, short: '28c' },
                      { val: 0.0055, short: '38c' },
                      { val: 0.007, short: '42c' },
                    ].map((p) => {
                      const active = Math.abs(activeBike.crr - p.val) < 0.0006;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => handleUpdateActiveBike('crr', p.val)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors tnum ${
                            active
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                              : 'bg-card text-ink-muted hover:text-ink'
                          }`}
                        >
                          {p.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-pod bg-pod">
                  <label className="block text-xs text-ink-muted mb-1 sm:mb-1.5">
                    {t('aeroCdaLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={activeBike.cda}
                    onChange={(e) => handleUpdateActiveBike('cda', parseFloat(e.target.value) || 0.38)}
                    className="w-full text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { val: 0.32, short: '0.32' },
                      { val: 0.38, short: '0.38' },
                      { val: 0.44, short: '0.44' },
                    ].map((p) => {
                      const active = Math.abs(activeBike.cda - p.val) < 0.015;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => handleUpdateActiveBike('cda', p.val)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors tnum ${
                            active
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                              : 'bg-card text-ink-muted hover:text-ink'
                          }`}
                        >
                          {p.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 pt-3.5 sm:pt-4 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-ink-muted">
            {t('syncActiveTripNotice')}
          </span>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-10 px-5 text-[13px] font-medium rounded-full text-ink-secondary bg-pod hover:bg-chip transition-colors cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-5 text-[13px] font-medium rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] transition-colors cursor-pointer"
            >
              {hasSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('savedBtn')}</span>
                </>
              ) : (
                <span>{t('saveSpecsBtn')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
