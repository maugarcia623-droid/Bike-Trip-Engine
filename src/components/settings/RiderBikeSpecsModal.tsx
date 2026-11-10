import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Bicycle,
  Check,
  Plus,
  Trash,
  Sparkle,
  Lightning,
  Sliders,
  Droplets,
  ForkKnife,
} from '@/components/icons';
import {
  RiderBikeSpecs,
  BikeSpec,
  NutritionPreference,
  RiderLevel,
  TelemetryMode,
  BidonSizeMl,
  FrameBottleSlots,
} from '../../types/specs';
import { saveRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';
import { saveUserProfile } from '../../utils/userProfileStorage';
import { useTranslation } from '../../context/LanguageContext';
import { IconBadge } from '../common/IconBadge';
import { Badge } from '../common/Badge';
import { PantryBuilderSection } from './PantryBuilderSection';
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
  onOpenCalibration?: () => void;
}

export const RiderBikeSpecsModal: React.FC<RiderBikeSpecsModalProps> = ({
  isOpen,
  onClose,
  specs,
  onSave,
  onOpenCalibration,
}) => {
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';
  const [localSpecs, setLocalSpecs] = useState<RiderBikeSpecs>(specs);
  const [hasSaved, setHasSaved] = useState(false);
  const [mobileTab, setMobileTab] = useState<'rider' | 'bike'>('rider');
  const [showFtpEstimator, setShowFtpEstimator] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSpecs(specs);
      setShowFtpEstimator(false);
    }
  }, [isOpen, specs]);

  if (!isOpen) return null;

  const activeBike = getActiveBike(localSpecs);
  const currentWkg = Number(
    ((localSpecs.ftpWatts || 210) / Math.max(35, localSpecs.riderWeightKg || 68)).toFixed(2)
  );

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
      isTubeless: true,
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

  const handleToggleTubeless = (nextTubeless: boolean) => {
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => {
        if (b.id !== prev.activeBikeId) return b;
        // Gently adjust rolling resistance baseline when switching between tubeless & inner tube
        const prevTubeless = Boolean(b.isTubeless);
        let nextCrr = b.crr;
        if (prevTubeless !== nextTubeless) {
          nextCrr = Number(
            Math.max(0.003, Math.min(0.009, b.crr + (nextTubeless ? -0.0005 : 0.0005))).toFixed(4)
          );
        }
        return { ...b, isTubeless: nextTubeless, crr: nextCrr };
      }),
    }));
  };

  const handleSelectRiderLevel = (level: RiderLevel) => {
    const suggestedView = level === 'occasional' ? 'essential' : 'pro';
    setLocalSpecs((prev) => {
      const mode = prev.telemetryMode ?? 'quantitative';
      const suggestedCarbs =
        mode === 'fuel-first'
          ? level === 'occasional'
            ? 45
            : level === 'pro'
            ? 85
            : 60
          : mode === 'intuitive'
          ? 60
          : level === 'occasional'
          ? 40
          : level === 'pro'
          ? 90
          : 60;
      return {
        ...prev,
        riderLevel: level,
        carbTargetGPerHr: suggestedCarbs,
        cockpitViewMode: suggestedView,
      };
    });
  };

  const handleApplyEstimatedFtp = (wkgMultiplier: number, levelToSync?: RiderLevel) => {
    const weight = Math.max(40, localSpecs.riderWeightKg || 68);
    const estFtp = Math.round((weight * wkgMultiplier) / 5) * 5;
    setLocalSpecs((prev) => ({
      ...prev,
      ftpWatts: estFtp,
      ...(levelToSync ? { riderLevel: levelToSync } : {}),
    }));
    setShowFtpEstimator(false);
  };

  const handleSave = () => {
    saveRiderBikeSpecs(localSpecs);
    if (localSpecs.riderName) {
      saveUserProfile({ name: localSpecs.riderName });
    }
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
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))] bg-black/60 dark:bg-black/80 animate-apple-fade-in"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] max-h-[92dvh] flex flex-col bg-card text-ink rounded-card p-4 sm:p-6 overflow-hidden animate-apple-modal shadow-2xl border border-ink/10 dark:border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0 animate-apple-in stagger-1">
          <div className="flex items-center gap-3 min-w-0">
            <IconBadge theme="yellow-vest" icon={User} size="lg" isSelected solidBacker />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="specs-modal-title" className="text-base sm:text-lg font-semibold text-ink tracking-tight font-rounded">
                  {isFr ? 'Profil Cycliste & Garage Vélo' : 'Rider Profile & Bike Garage'}
                </h2>
                <Badge
                  variant={
                    localSpecs.telemetryMode === 'intuitive'
                      ? 'lime'
                      : localSpecs.telemetryMode === 'fuel-first'
                      ? 'amber'
                      : 'emerald'
                  }
                  size="xs"
                  className="tnum"
                >
                  {localSpecs.telemetryMode === 'intuitive'
                    ? `${t('telemetryModeIntuitive')} · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`
                    : localSpecs.telemetryMode === 'fuel-first'
                    ? `${t('telemetryModeFuelFirst')} · max ~${Math.max(1, Math.round((localSpecs.carbTargetGPerHr || 60) / 20))} ${isFr ? 'unités/h' : 'units/h'} · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`
                    : `${localSpecs.ftpWatts}W · ${localSpecs.carbTargetGPerHr}g/h · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`}
                </Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {t('specsModalSub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenCalibration && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCalibration();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                title={t('cockpitCalibration')}
              >
                <Sliders className="w-3.5 h-3.5 text-current shrink-0" />
                <span className="hidden sm:inline">{t('cockpitCalibration')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label={t('closeModalAria')}
              className={`w-9 h-9 shrink-0 rounded-full hover:text-ink hover:bg-chip flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <X className="w-4 h-4 text-current" />
            </button>
          </div>
        </div>

        {/* Desktop & Mobile Segmented Tab Switcher */}
        <div
          role="tablist"
          aria-label={isFr ? 'Sections du profil et garage' : 'Profile and garage sections'}
          className="grid grid-cols-2 gap-1.5 p-1.5 rounded-full bg-pod mb-4 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'rider'}
            onClick={() => setMobileTab('rider')}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs sm:text-[13px] font-rounded transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              mobileTab === 'rider'
                ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                : 'text-ink-muted hover:text-ink font-semibold'
            }`}
          >
            <User className="w-4 h-4 text-current shrink-0" />
            <span>{isFr ? 'Profil Cycliste & Nutrition' : 'Rider Profile & Nutrition'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'bike'}
            onClick={() => setMobileTab('bike')}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs sm:text-[13px] font-rounded transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              mobileTab === 'bike'
                ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                : 'text-ink-muted hover:text-ink font-semibold'
            }`}
          >
            <Bicycle className="w-4 h-4 text-current shrink-0" />
            <span>{isFr ? `Garage Vélo (${localSpecs.bikes.length})` : `Bike Garage (${localSpecs.bikes.length})`}</span>
          </button>
        </div>

        {/* Segmented Tabbed Workspace (Full-Width on Desktop & Mobile) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-0.5">
          {/* ── TAB 1: DEDICATED RIDER PROFILE & NUTRITION ── */}
          {mobileTab === 'rider' && (
            <div
              role="tabpanel"
              className="space-y-4 rounded-pod bg-pod/45 p-3.5 sm:p-4 border border-ink/5 dark:border-white/5 animate-apple-fade-in"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconBadge theme="emerald" icon={User} size="sm" solidBacker />
                  <div>
                    <div className="text-xs sm:text-[13px] font-rounded font-bold text-ink">
                      {isFr ? 'Profil Physiologique & Nutrition' : 'Rider Physiology & Nutrition'}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {isFr
                        ? 'FTP, niveau, tolérance glucidique & préférences alimentaires'
                        : 'FTP, experience tier, gut carb capacity & fueling style'}
                    </div>
                  </div>
                </div>
                {localSpecs.telemetryMode === 'quantitative' && (
                  <Badge variant="zinc" size="xs" className="tnum font-mono">
                    {currentWkg} W/kg
                  </Badge>
                )}
                {localSpecs.telemetryMode === 'fuel-first' && (
                  <Badge variant="amber" size="xs" className="tnum font-mono">
                    max ~{Math.max(1, Math.round((localSpecs.carbTargetGPerHr || 60) / 20))} {isFr ? 'unités/h' : 'units/h'}
                  </Badge>
                )}
                {localSpecs.telemetryMode === 'intuitive' && (
                  <Badge variant="lime" size="xs" className="tnum font-mono">
                    {isFr ? 'Rythme régulier' : 'Steady rhythm'}
                  </Badge>
                )}
              </div>

              {/* Balanced 2-Column Top Grid on Desktop: Rider Identity & Power (Left) + Guidance & Digestion (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                {/* Left Sub-Column: Name, Experience Tier & Biometrics */}
                <div className="space-y-3.5">
                  {/* Rider Call-Sign / Name */}
                  <div className="space-y-1.5 rounded-pod bg-card p-3.5 border border-ink/5 dark:border-white/5">
                    <label className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-ink-muted" />
                      <span>{isFr ? 'Prénom / Nom du cycliste' : 'Rider name / call-sign'}</span>
                    </label>
                    <input
                      type="text"
                      value={localSpecs.riderName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalSpecs((prev) => ({ ...prev, riderName: val }));
                      }}
                      placeholder={isFr ? 'ex. Mauricio' : 'e.g. Mauricio'}
                      className="w-full h-9 px-3 rounded-sub-pod bg-pod border border-black/10 dark:border-white/10 text-base sm:text-xs font-rounded font-semibold text-ink outline-none focus:border-[#a3b300] dark:focus:border-[#dfff00]"
                    />
                  </div>

                  {/* Rider Level Selector */}
                  <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2">
                    <label className="block text-xs font-rounded font-bold text-ink">
                      {isFr ? 'Profil d’expérience cycliste' : 'Rider experience profile'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        {
                          id: 'occasional',
                          label: isFr ? 'Occasionnel' : 'Occasional',
                          sub:
                            localSpecs.telemetryMode === 'quantitative'
                              ? isFr
                                ? 'Guidé · 40g/h'
                                : 'Guided · 40g/h'
                              : localSpecs.telemetryMode === 'fuel-first'
                              ? isFr
                                ? 'Guidé · ~2 unités/h'
                                : 'Guided · ~2 units/h'
                              : isFr
                              ? 'Guidé · Balade'
                              : 'Guided · Relaxed',
                        },
                        {
                          id: 'regular',
                          label: isFr ? 'Régulier' : 'Regular',
                          sub:
                            localSpecs.telemetryMode === 'quantitative'
                              ? isFr
                                ? 'Endurance · 60g/h'
                                : 'Endurance · 60g/h'
                              : localSpecs.telemetryMode === 'fuel-first'
                              ? isFr
                                ? 'Endurance · ~3 unités/h'
                                : 'Endurance · ~3 units/h'
                              : isFr
                              ? 'Endurance · Régulier'
                              : 'Endurance · Steady',
                        },
                        {
                          id: 'pro',
                          label: isFr ? 'Performance' : 'Data / Pro',
                          sub:
                            localSpecs.telemetryMode === 'quantitative'
                              ? isFr
                                ? 'Intensif · 90g/h'
                                : 'High-output · 90g/h'
                              : localSpecs.telemetryMode === 'fuel-first'
                              ? isFr
                                ? 'Intensif · ~4 unités/h'
                                : 'High-output · ~4 units/h'
                              : isFr
                              ? 'Sport · Soutenu'
                              : 'Sport · Brisk',
                        },
                      ] as const).map((tier) => {
                        const isSelected = (localSpecs.riderLevel || 'regular') === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => handleSelectRiderLevel(tier.id)}
                            className={`rounded-pod p-2.5 text-left transition-all cursor-pointer ${
                              isSelected
                                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                                : `bg-pod text-ink hover:bg-chip ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            <div className="text-xs font-rounded font-bold break-words leading-tight">{tier.label}</div>
                            <div className="text-[10px] opacity-80 mt-0.5 break-words leading-tight tnum">{tier.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weight, Height & FTP (Shown ONLY in 'quantitative' mode) */}
                  {localSpecs.telemetryMode === 'quantitative' && (
                    <>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                          <label className="block text-[11px] font-rounded text-ink-muted mb-1">
                            {t('weightLabel')}
                          </label>
                          <div className="flex items-baseline gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={localSpecs.riderWeightKg}
                              onChange={(e) =>
                                setLocalSpecs((prev) => ({
                                  ...prev,
                                  riderWeightKg: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-full text-lg sm:text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                            />
                            <span className="text-xs text-ink-muted">kg</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                          <label className="block text-[11px] font-rounded text-ink-muted mb-1">
                            {t('heightLabel')}
                          </label>
                          <div className="flex items-baseline gap-1">
                            <input
                              type="number"
                              step="1"
                              value={localSpecs.riderHeightCm}
                              onChange={(e) =>
                                setLocalSpecs((prev) => ({
                                  ...prev,
                                  riderHeightCm: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full text-lg sm:text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                            />
                            <span className="text-xs text-ink-muted">cm</span>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-pod ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <label className="block text-[11px] font-rounded opacity-85 break-words">
                              {t('ftpBaselineLabel')}
                            </label>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <input
                              type="number"
                              step="5"
                              value={localSpecs.ftpWatts}
                              onChange={(e) =>
                                setLocalSpecs((prev) => ({
                                  ...prev,
                                  ftpWatts: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full text-lg sm:text-xl font-semibold text-current bg-transparent focus:outline-none tnum"
                            />
                            <span className="text-xs opacity-80">W</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive FTP Estimator Helper */}
                      <div className="rounded-pod bg-card p-3 border border-ink/5 dark:border-white/5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-ink-secondary">
                            {isFr
                              ? 'Pas de capteur de puissance ? Estimez votre FTP :'
                              : "Don't know your FTP? Estimate from your weight:"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFtpEstimator((v) => !v)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                          >
                            <Sparkle className="w-3 h-3 text-current" />
                            <span>{showFtpEstimator ? (isFr ? 'Masquer' : 'Hide') : isFr ? 'Estimer FTP' : 'Estimate FTP'}</span>
                          </button>
                        </div>
                        {showFtpEstimator && (
                          <div className="mt-2.5 pt-2.5 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2 animate-fade-in">
                            <p className="text-[11px] text-ink-muted leading-snug">
                              {isFr
                                ? `La FTP est la puissance max soutenable 1h. Basé sur ${localSpecs.riderWeightKg || 68} kg :`
                                : `FTP is your 1-hour sustainable pedal power. Based on ${localSpecs.riderWeightKg || 68}kg:`}
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                {
                                  wkg: 2.0,
                                  lvl: 'occasional' as RiderLevel,
                                  label: isFr ? 'Balade / Débutant' : 'Casual / Touring',
                                },
                                {
                                  wkg: 2.9,
                                  lvl: 'regular' as RiderLevel,
                                  label: isFr ? 'Cycliste Régulier' : 'Active Club',
                                },
                                {
                                  wkg: 3.9,
                                  lvl: 'pro' as RiderLevel,
                                  label: isFr ? 'Entraîné / Cyclosport' : 'Trained / Racer',
                                },
                              ].map((est) => {
                                const valW =
                                  Math.round(((localSpecs.riderWeightKg || 68) * est.wkg) / 5) * 5;
                                return (
                                  <button
                                    key={est.wkg}
                                    type="button"
                                    onClick={() => handleApplyEstimatedFtp(est.wkg, est.lvl)}
                                    className="p-2 rounded-sub-pod bg-pod hover:bg-chip text-left transition-colors cursor-pointer"
                                  >
                                    <div className="text-xs font-mono font-bold text-ink tnum">{valW} W</div>
                                    <div className="text-[10px] text-ink-muted break-words leading-tight">{est.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Right Sub-Column: Guidance Philosophy & Carbohydrate Digestion Capacity */}
                <div className="space-y-3.5">
                  {/* Guidance Philosophy Segmented Control */}
                  <div className="space-y-2 rounded-pod bg-card p-3.5 border border-ink/5 dark:border-white/5">
                    <div className="flex items-center justify-between gap-1.5">
                      <label className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{t('guidancePhilosophyTitle')}</span>
                      </label>
                      <Badge
                        variant={
                          localSpecs.telemetryMode === 'intuitive'
                            ? 'lime'
                            : localSpecs.telemetryMode === 'fuel-first'
                            ? 'amber'
                            : 'emerald'
                        }
                        size="xs"
                        className="font-rounded text-[10px]"
                      >
                        {localSpecs.telemetryMode === 'intuitive'
                          ? t('telemetryModeIntuitive')
                          : localSpecs.telemetryMode === 'fuel-first'
                          ? t('telemetryModeFuelFirst')
                          : t('telemetryModeQuantitative')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-pod bg-pod">
                      {(
                        [
                          {
                            id: 'quantitative' as TelemetryMode,
                            label: t('telemetryModeQuantitative'),
                            sub: t('telemetryModeQuantitativeSub'),
                            icon: Lightning,
                          },
                          {
                            id: 'fuel-first' as TelemetryMode,
                            label: t('telemetryModeFuelFirst'),
                            sub: t('telemetryModeFuelFirstSub'),
                            icon: ForkKnife,
                          },
                          {
                            id: 'intuitive' as TelemetryMode,
                            label: t('telemetryModeIntuitive'),
                            sub: t('telemetryModeIntuitiveSub'),
                            icon: Droplets,
                          },
                        ] as const
                      ).map((modeOpt) => {
                        const isSelected = (localSpecs.telemetryMode || 'quantitative') === modeOpt.id;
                        const ModeIcon = modeOpt.icon;
                        return (
                          <button
                            key={modeOpt.id}
                            type="button"
                            onClick={() => {
                              setLocalSpecs((prev) => ({
                                ...prev,
                                telemetryMode: modeOpt.id,
                                carbTargetGPerHr: modeOpt.id === 'intuitive' ? 60 : prev.carbTargetGPerHr || 60,
                              }));
                            }}
                            className={`flex flex-col items-start p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                              isSelected
                                ? 'bg-card text-ink shadow-xs ring-1 ring-ink/10 dark:ring-white/10'
                                : 'text-ink-muted hover:text-ink hover:bg-card/40'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <ModeIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-500' : 'text-current'}`} />
                              <span className="text-xs font-rounded font-bold truncate">{modeOpt.label}</span>
                            </div>
                            <span className="text-[10px] leading-tight opacity-75 mt-1 line-clamp-2">
                              {modeOpt.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantitative Mode: Raw Carb Slider (25–120 g/h) */}
                  {localSpecs.telemetryMode === 'quantitative' && (
                    <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-rounded font-bold text-ink block">
                            {isFr
                              ? 'Capacité de digestion glucidique'
                              : 'Carbohydrate digestion capacity'}
                          </label>
                          <span className="text-[11px] text-ink-muted">
                            {localSpecs.carbTargetGPerHr <= 45
                              ? isFr
                                ? 'Estomac doux · zéro surcharge digestive (idéal randonnée)'
                                : 'Gentle on the stomach · zero GI stress (ideal for touring)'
                              : localSpecs.carbTargetGPerHr <= 70
                              ? isFr
                                ? 'Endurance équilibrée · standard sorties longues'
                                : 'Balanced endurance · standard multi-hour fueling'
                              : isFr
                              ? 'Haute assimilation · nécessite un entraînement digestif (gut training)'
                              : 'High gut-trained intake · for intense Gran Fondo / race pace'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold tnum shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}>
                          {localSpecs.carbTargetGPerHr ?? 60} g/h
                        </span>
                      </div>

                      <input
                        type="range"
                        min={30}
                        max={105}
                        step={5}
                        value={localSpecs.carbTargetGPerHr ?? 60}
                        onChange={(e) =>
                          setLocalSpecs((prev) => ({
                            ...prev,
                            carbTargetGPerHr: parseInt(e.target.value, 10) || 60,
                          }))
                        }
                        aria-label={isFr ? 'Tolérance glucides par heure' : 'Carb digestion grams per hour'}
                        className="w-full peloton-slider accent-amber-500 cursor-pointer"
                      />

                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 35, label: isFr ? '35g Léger' : '35g Gentle' },
                          { val: 50, label: isFr ? '50g Rando' : '50g Touring' },
                          { val: 65, label: isFr ? '65g Sport' : '65g Steady' },
                          { val: 90, label: isFr ? '90g Pro' : '90g Gut-Pro' },
                        ].map((opt) => {
                          const active = Math.abs((localSpecs.carbTargetGPerHr ?? 60) - opt.val) <= 3;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                setLocalSpecs((prev) => ({ ...prev, carbTargetGPerHr: opt.val }))
                              }
                              className={`py-1.5 px-2 rounded-full text-[11px] font-rounded font-semibold transition-colors cursor-pointer tnum break-words leading-tight text-center ${
                                active
                                  ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                                  : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fuel-First Mode: 3-Tier Digestion Comfort Selector */}
                  {localSpecs.telemetryMode === 'fuel-first' && (
                    <div className="p-3.5 rounded-pod bg-card space-y-2.5 border border-ink/5 dark:border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-rounded font-bold text-ink block">
                            {t('digestionComfortTitle')}
                          </label>
                          <span className="text-[11px] text-ink-muted">
                            {localSpecs.carbTargetGPerHr <= 45
                              ? t('digestionComfortGentleSub')
                              : localSpecs.carbTargetGPerHr <= 70
                              ? t('digestionComfortBalancedSub')
                              : t('digestionComfortHighIntakeSub')}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold tnum shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                        >
                          ~{Math.max(1, Math.round((localSpecs.carbTargetGPerHr || 60) / 20))} {isFr ? 'unités/h' : 'fuel units/h'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            {
                              tier: 45,
                              label: t('digestionComfortGentle'),
                              sub: isFr ? 'Doux · ~2 unités/h' : 'Gentle · ~2 units/h',
                            },
                            {
                              tier: 60,
                              label: t('digestionComfortBalanced'),
                              sub: isFr ? 'Équilibré · ~3 unités/h' : 'Balanced · ~3 units/h',
                            },
                            {
                              tier: 85,
                              label: t('digestionComfortHighIntake'),
                              sub: isFr ? 'Intensif · ~4 unités/h' : 'High intake · ~4 units/h',
                            },
                          ] as const
                        ).map((tierOpt) => {
                          const carbVal = localSpecs.carbTargetGPerHr || 60;
                          const active =
                            tierOpt.tier === 45
                              ? carbVal <= 50
                              : tierOpt.tier === 60
                              ? carbVal > 50 && carbVal <= 72
                              : carbVal > 72;
                          return (
                            <button
                              key={tierOpt.tier}
                              type="button"
                              onClick={() =>
                                setLocalSpecs((prev) => ({
                                  ...prev,
                                  carbTargetGPerHr: tierOpt.tier,
                                }))
                              }
                              className={`p-2.5 rounded-pod text-left transition-all cursor-pointer ${
                                active
                                  ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                                  : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                              }`}
                            >
                              <div className="text-xs font-rounded font-semibold break-words leading-tight">{tierOpt.label}</div>
                              <div className="text-[10px] opacity-80 mt-0.5 break-words leading-tight tnum">{tierOpt.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Intuitive Mode: Hydration & Timing Clock Only */}
                  {localSpecs.telemetryMode === 'intuitive' && (
                    <div className="p-3.5 rounded-pod bg-card space-y-2 border border-ink/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <IconBadge theme="lime" icon={Droplets} size="sm" solidBacker />
                        <div>
                          <div className="text-xs font-rounded font-bold text-ink">{isFr ? 'Régularité & Hydratation' : 'Rhythm & hydration cues'}</div>
                          <div className="text-[11px] text-ink-muted">{t('intuitiveModeNotice')}</div>
                        </div>
                      </div>
                      <ul className="space-y-1.5 pt-1 text-xs text-ink-secondary">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0" />
                          <span>{t('intuitiveCueT45')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0" />
                          <span>{t('intuitiveCueEvery20')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0" />
                          <span>{t('intuitiveCueArrival')}</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Pantry & Dietary Guardrails (Phase 4) */}
              <PantryBuilderSection
                specs={localSpecs}
                onChange={(updated) => setLocalSpecs(updated)}
              />
            </div>
          )}

          {/* ── TAB 2: DEDICATED BIKE PROFILE & GARAGE ── */}
          {mobileTab === 'bike' && (
            <div
              role="tabpanel"
              className="space-y-4 rounded-pod bg-pod/45 p-3.5 sm:p-4 border border-ink/5 dark:border-white/5 animate-apple-fade-in"
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <IconBadge theme="yellow-vest" icon={Bicycle} size="sm" solidBacker className="shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-rounded font-bold text-ink">
                      {t('bikeGarageHeading', { count: localSpecs.bikes.length })}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {isFr
                        ? 'Montage Tubeless, masse, résistance Crr & profil CdA'
                        : 'Tubeless setup, build weight, rolling Crr & aero CdA'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddBike}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-rounded font-semibold bg-card hover:bg-chip text-ink-secondary hover:text-ink transition-colors cursor-pointer shrink-0 whitespace-nowrap ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  <Plus className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>{t('addBikeBtn')}</span>
                </button>
              </div>

              {/* Bike Garage Selector Pods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
                      className={`relative rounded-pod p-3 text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                          : `bg-card text-ink hover:bg-chip ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-rounded font-bold break-words leading-tight pr-5">
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
                      <div className="flex items-center justify-between gap-1 mt-1.5 text-[11px] font-mono tnum opacity-85">
                        <span>{bike.weightKg}kg</span>
                        <span>{bike.isTubeless ? 'Tubeless' : 'Tube'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Bike Details in a Balanced 2-Column Desktop Sub-Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                {/* Left Bike Sub-Column: Model Name + Tire & Sealant Configuration */}
                <div className="space-y-3.5">
                  <div className="px-4 py-3 rounded-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                    <label className="text-xs font-rounded text-ink-muted shrink-0">
                      {t('modelNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={activeBike.name}
                      onChange={(e) => handleUpdateActiveBike('name', e.target.value)}
                      className="w-full text-base sm:text-sm font-rounded font-semibold text-ink text-left sm:text-right bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* Dedicated Tubeless vs. Inner Tube Config Card */}
                  <div className="p-3.5 rounded-pod bg-card border border-ink/5 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-rounded font-bold text-ink block">
                          {isFr ? 'Configuration pneumatique' : 'Tire & sealant configuration'}
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          {activeBike.isTubeless
                            ? isFr
                              ? 'Basse pression confort (2,4–2,6 bar) · kit mèches + préventif dans la checklist'
                              : 'Lower comfort pressure (2.4–2.6 bar) · syncs plug kit & sealant check'
                            : isFr
                            ? 'Pression standard (3,0–3,2 bar) · chambre à air + démonte-pneus dans la checklist'
                            : 'Standard pressure (3.0–3.2 bar) · syncs spare inner tube & levers'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          val: true,
                          title: isFr ? 'Tubeless (Préventif)' : 'Tubeless Ready',
                          sub: isFr ? 'Rendement optimal · anti-pincement' : 'Lower Crr · pinch-flat immune',
                        },
                        {
                          val: false,
                          title: isFr ? 'Chambre à air' : 'Inner Tube',
                          sub: isFr ? 'Montage classique · réparation simple' : 'Classic setup · spare tube',
                        },
                      ].map((opt) => {
                        const active = Boolean(activeBike.isTubeless) === opt.val;
                        return (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => handleToggleTubeless(opt.val)}
                            className={`p-2.5 rounded-pod text-left transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                              active
                                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                                : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            <div className="text-xs font-rounded font-bold flex items-center gap-1.5 flex-wrap">
                              <Lightning className="w-3.5 h-3.5 text-current shrink-0" />
                              <span className="break-words leading-tight">{opt.title}</span>
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5 break-words leading-tight">{opt.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Bike Sub-Column: Weight / Crr / CdA + Bottle Size & Frame Cage Slots */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                      <label className="block text-[11px] font-rounded text-ink-muted mb-1">
                        {t('bicycleBuildRow')}
                      </label>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={activeBike.weightKg}
                          onChange={(e) =>
                            handleUpdateActiveBike('weightKg', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-lg sm:text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                        />
                        <span className="text-xs text-ink-muted">kg</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                      <label className="block text-[11px] font-rounded text-ink-muted mb-1">
                        {t('tireCrrLabel')}
                      </label>
                      <input
                        type="number"
                        step="0.0005"
                        value={activeBike.crr}
                        onChange={(e) =>
                          handleUpdateActiveBike('crr', parseFloat(e.target.value) || 0.0055)
                        }
                        className="w-full text-lg sm:text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
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
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                                active
                                  ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                                  : 'bg-pod text-ink-muted hover:text-ink'
                              }`}
                            >
                              {p.short}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                      <label className="block text-[11px] font-rounded text-ink-muted mb-1">
                        {t('aeroCdaLabel')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={activeBike.cda}
                        onChange={(e) =>
                          handleUpdateActiveBike('cda', parseFloat(e.target.value) || 0.38)
                        }
                        className="w-full text-lg sm:text-xl font-semibold text-ink bg-transparent focus:outline-none tnum"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
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
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                                active
                                  ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`
                                  : 'bg-pod text-ink-muted hover:text-ink'
                              }`}
                            >
                              {p.short}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Phase 7: Bottle Size & Frame Cage Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-rounded font-semibold text-ink-secondary flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-sky-500" />
                          {isFr ? 'Volume bidon' : 'Bottle size'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 tnum">
                          {localSpecs.bidonSizeMl ?? 650}ml
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {([500, 550, 650, 750, 950] as BidonSizeMl[]).map((sz) => {
                          const active = (localSpecs.bidonSizeMl ?? 650) === sz;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() =>
                                setLocalSpecs((prev) => ({ ...prev, bidonSizeMl: sz }))
                              }
                              className={`px-2 py-1 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                                active
                                  ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                                  : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                              }`}
                            >
                              {sz}ml
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 rounded-pod bg-card border border-ink/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-rounded font-semibold text-ink-secondary">
                          {isFr ? 'Porte-bidons cadre' : 'Frame cage slots'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 tnum">
                          {(localSpecs.frameBottleSlots ?? 2) * (localSpecs.bidonSizeMl ?? 650)}ml max
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([1, 2, 3] as FrameBottleSlots[]).map((slots) => {
                          const active = (localSpecs.frameBottleSlots ?? 2) === slots;
                          return (
                            <button
                              key={slots}
                              type="button"
                              onClick={() =>
                                setLocalSpecs((prev) => ({
                                  ...prev,
                                  frameBottleSlots: slots,
                                }))
                              }
                              className={`py-1 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                                active
                                  ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                                  : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                              }`}
                            >
                              {slots}x
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3.5 border-t border-dashed border-ink/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-ink-muted">
            {t('syncActiveTripNotice')}
          </span>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-10 px-5 text-[13px] font-medium rounded-full text-ink-secondary bg-pod hover:bg-chip transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-5 text-[13px] font-medium rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              {hasSaved ? (
                <div className="flex items-center gap-1.5 animate-apple-check-pop">
                  <Check className="w-4 h-4" />
                  <span>{t('savedBtn')}</span>
                </div>
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
