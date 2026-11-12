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
  ChevronDown,
} from '@/components/icons';
import {
  RiderBikeSpecs,
  BikeSpec,
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
import { ModalPortal } from '../common/ModalPortal';
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
}

export const RiderBikeSpecsModal: React.FC<RiderBikeSpecsModalProps> = ({
  isOpen,
  onClose,
  specs,
  onSave,
}) => {
  const { t, lang } = useTranslation();
  const isFr = lang === 'fr';
  const [localSpecs, setLocalSpecs] = useState<RiderBikeSpecs>(specs);
  const [hasSaved, setHasSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rider' | 'bike' | 'pantry'>('rider');
  const [showFtpEstimator, setShowFtpEstimator] = useState(false);
  const [showAdvancedBike, setShowAdvancedBike] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSpecs(specs);
      setActiveTab('rider');
      setShowFtpEstimator(false);
      setShowAdvancedBike(false);
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
    setLocalSpecs((prev) => {
      const mode = prev.telemetryMode ?? 'fuel-first';
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

  const isProView = (localSpecs.cockpitViewMode ?? 'essential') === 'pro';
  const isPowerMode =
    (localSpecs.pacingInputMode ?? 'feel') === 'power' ||
    localSpecs.telemetryMode === 'quantitative';

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="specs-modal-title"
      zIndexClass="z-[1000]"
      backdropClassName="bg-black/60 dark:bg-black/80 backdrop-blur-sm"
      panelClassName="relative w-full max-w-4xl max-h-[92vh] max-h-[92dvh] flex flex-col bg-card text-ink rounded-card p-4 sm:p-6 overflow-hidden animate-apple-modal shadow-2xl ring-1 ring-inset ring-black/10 dark:ring-white/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0 animate-apple-in stagger-1">
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge theme="yellow-vest" icon={User} size="lg" isSelected solidBacker />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="specs-modal-title" className="text-base sm:text-lg font-semibold text-ink tracking-tight font-rounded">
                {isFr ? 'Profil cycliste & réglages' : 'Rider profile & settings'}
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
                className="tnum font-rounded"
              >
                {isProView
                  ? `${isFr ? 'Vue pro' : 'Pro view'} · ${localSpecs.ftpWatts} W · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`
                  : isPowerMode
                  ? `${isFr ? 'Guidé' : 'Guided'} · ${localSpecs.ftpWatts} W · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`
                  : `${isFr ? 'Guidé' : 'Guided'} · ${activeBike.isTubeless ? 'Tubeless' : 'Tube'}`}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {t('specsModalSub')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeModalAria')}
          className={`relative w-9 h-9 shrink-0 rounded-full hover:text-ink hover:bg-chip flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer before:content-[''] before:absolute before:-inset-1.5 sm:before:inset-0 ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
        >
          <X className="w-4 h-4 text-current" />
        </button>
      </div>

      {/* 3-Tab Segmented Navigation: Rider & View / Bikes / Snacks & Drinks */}
      <div
        role="tablist"
        aria-label={isFr ? 'Sections des réglages' : 'Settings sections'}
        className="grid grid-cols-3 gap-1.5 p-1.5 rounded-full bg-pod mb-4 shrink-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rider'}
          onClick={() => setActiveTab('rider')}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 sm:px-4 rounded-full text-xs sm:text-[13px] font-rounded transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            activeTab === 'rider'
              ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
              : 'text-ink-muted hover:text-ink font-semibold'
          }`}
        >
          <User className="w-4 h-4 text-current shrink-0" />
          <span className="truncate">{isFr ? 'Cycliste & Vue' : 'Rider & View'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bike'}
          onClick={() => setActiveTab('bike')}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 sm:px-4 rounded-full text-xs sm:text-[13px] font-rounded transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            activeTab === 'bike'
              ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
              : 'text-ink-muted hover:text-ink font-semibold'
          }`}
        >
          <Bicycle className="w-4 h-4 text-current shrink-0" />
          <span className="truncate">{isFr ? `Vélos (${localSpecs.bikes.length})` : `Bikes (${localSpecs.bikes.length})`}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pantry'}
          onClick={() => setActiveTab('pantry')}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 sm:px-4 rounded-full text-xs sm:text-[13px] font-rounded transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
            activeTab === 'pantry'
              ? 'bg-card text-ink font-bold shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
              : 'text-ink-muted hover:text-ink font-semibold'
          }`}
        >
          <ForkKnife className="w-4 h-4 text-current shrink-0" />
          <span className="truncate">{isFr ? 'Ravitaillement' : 'Snacks & Drinks'}</span>
        </button>
      </div>

      {/* Segmented Tabbed Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-0.5">
        {/* ── TAB 1: RIDER & VIEW ── */}
        {activeTab === 'rider' && (
          <div
            role="tabpanel"
            className="space-y-4 rounded-pod bg-pod p-3.5 sm:p-4 animate-apple-fade-in"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconBadge theme="emerald" icon={User} size="sm" solidBacker />
                <div>
                  <div className="text-xs sm:text-[13px] font-rounded font-bold text-ink">
                    {isFr ? 'Cycliste, affichage & rythme' : 'Rider, view & effort style'}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {isFr
                      ? 'Mode d’affichage, expérience, puissance en watts et nutrition'
                      : 'Display detail, riding experience, optional watts and fueling comfort'}
                  </div>
                </div>
              </div>
              {isPowerMode ? (
                <Badge variant="zinc" size="xs" className="tnum font-rounded">
                  {currentWkg} W/kg
                </Badge>
              ) : localSpecs.telemetryMode === 'fuel-first' ? (
                <Badge variant="amber" size="xs" className="tnum font-rounded">
                  ~{Math.max(1, Math.round((localSpecs.carbTargetGPerHr || 60) / 20))} {isFr ? 'collations/h' : 'snacks/h'}
                </Badge>
              ) : (
                <Badge variant="lime" size="xs" className="tnum font-rounded">
                  {isFr ? 'Rythme régulier' : 'Steady rhythm'}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* Left Column: View & Power Toggles + Name + Experience + Biometrics */}
              <div className="space-y-3.5">
                {/* Ride Plan View & Effort Style */}
                <div className="p-3.5 rounded-pod bg-card space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{isFr ? 'Affichage du plan de sortie' : 'Ride plan detail'}</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-sub-pod bg-pod">
                      <button
                        type="button"
                        onClick={() =>
                          setLocalSpecs((prev) => ({ ...prev, cockpitViewMode: 'essential' }))
                        }
                        className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-sub-pod text-xs font-rounded font-semibold transition-all cursor-pointer ${
                          !isProView
                            ? 'bg-card text-ink shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {isFr ? 'Guidé (Calme)' : 'Guided (Calm)'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalSpecs((prev) => ({ ...prev, cockpitViewMode: 'pro' }))
                        }
                        className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-sub-pod text-xs font-rounded font-semibold transition-all cursor-pointer ${
                          isProView
                            ? 'bg-card text-ink shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {isFr ? 'Pro (Technique)' : 'Pro (Data)'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2.5 lane-divider space-y-1.5">
                    <label className="block text-xs font-rounded font-bold text-ink">
                      {isFr ? 'Mesure de l’effort' : 'How you pace your effort'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-sub-pod bg-pod">
                      <button
                        type="button"
                        onClick={() =>
                          setLocalSpecs((prev) => ({ ...prev, pacingInputMode: 'feel' }))
                        }
                        className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-sub-pod text-xs font-rounded font-semibold transition-all cursor-pointer ${
                          (localSpecs.pacingInputMode ?? 'feel') === 'feel'
                            ? 'bg-card text-ink shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {isFr ? 'Aux sensations' : 'By effort feel'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalSpecs((prev) => ({ ...prev, pacingInputMode: 'power' }))
                        }
                        className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-sub-pod text-xs font-rounded font-semibold transition-all cursor-pointer ${
                          localSpecs.pacingInputMode === 'power'
                            ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {isFr ? 'Puissance (Watts / FTP)' : 'Power / Watts (FTP)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rider Name */}
                <div className="space-y-1.5 rounded-pod bg-card p-3.5">
                  <label className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{isFr ? 'Prénom / Nom du cycliste' : 'Rider name'}</span>
                  </label>
                  <input
                    type="text"
                    value={localSpecs.riderName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalSpecs((prev) => ({ ...prev, riderName: val }));
                    }}
                    placeholder={isFr ? 'ex. Mauricio' : 'e.g. Mauricio'}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 rounded-sub-pod bg-pod ring-1 ring-inset ring-black/5 dark:ring-white/10 text-base sm:text-sm font-rounded font-semibold text-ink outline-none focus:ring-2 focus:ring-ink/40"
                  />
                </div>

                {/* Rider Level Selector */}
                <div className="p-3.5 rounded-pod bg-card space-y-2">
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
                              ? 'Guidé · 40 g/h'
                              : 'Guided · 40 g/h'
                            : localSpecs.telemetryMode === 'fuel-first'
                            ? isFr
                              ? 'Guidé · ~2/h'
                              : 'Guided · ~2/h'
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
                              ? 'Endurance · 60 g/h'
                              : 'Endurance · 60 g/h'
                            : localSpecs.telemetryMode === 'fuel-first'
                            ? isFr
                              ? 'Endurance · ~3/h'
                              : 'Endurance · ~3/h'
                            : isFr
                            ? 'Endurance · Régulier'
                            : 'Endurance · Steady',
                      },
                      {
                        id: 'pro',
                        label: isFr ? 'Performance' : 'Sportive',
                        sub:
                          localSpecs.telemetryMode === 'quantitative'
                            ? isFr
                              ? 'Intensif · 90 g/h'
                              : 'High-output · 90 g/h'
                            : localSpecs.telemetryMode === 'fuel-first'
                            ? isFr
                              ? 'Intensif · ~4/h'
                              : 'High-output · ~4/h'
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
                          className={`min-h-[44px] rounded-sub-pod p-2.5 text-left transition-all cursor-pointer ${
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

                {/* Weight, Height & FTP (Shown when Power / Quantitative mode is enabled) */}
                {isPowerMode && (
                  <>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-pod bg-card">
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
                            className="w-full min-h-[44px] sm:min-h-[34px] text-base sm:text-lg font-semibold text-ink bg-transparent focus:outline-none tnum"
                          />
                          <span className="text-xs text-ink-muted">kg</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-pod bg-card">
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
                            className="w-full min-h-[44px] sm:min-h-[34px] text-base sm:text-lg font-semibold text-ink bg-transparent focus:outline-none tnum"
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
                            className="w-full min-h-[44px] sm:min-h-[34px] text-base sm:text-lg font-semibold text-current bg-transparent focus:outline-none tnum"
                          />
                          <span className="text-xs opacity-80">W</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive FTP Estimator Helper */}
                    <div className="rounded-pod bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-ink-secondary">
                          {isFr
                            ? 'Pas de capteur de puissance ? Estimez votre FTP :'
                            : "Don't know your FTP? Estimate from your weight:"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFtpEstimator((v) => !v)}
                          className={`inline-flex items-center gap-1 px-3 min-h-[44px] sm:min-h-[32px] rounded-full text-xs font-rounded font-semibold cursor-pointer transition-colors shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                        >
                          <Sparkle className="w-3 h-3 text-current" />
                          <span>{showFtpEstimator ? (isFr ? 'Masquer' : 'Hide') : isFr ? 'Estimer FTP' : 'Estimate FTP'}</span>
                        </button>
                      </div>
                      {showFtpEstimator && (
                        <div className="mt-2.5 pt-2.5 lane-divider space-y-2 animate-fade-in">
                          <p className="text-[11px] text-ink-muted leading-snug">
                            {isFr
                              ? `La FTP est la puissance max soutenable 1 h. Basé sur ${localSpecs.riderWeightKg || 68} kg :`
                              : `FTP is your 1-hour sustainable pedal power. Based on ${localSpecs.riderWeightKg || 68} kg:`}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              {
                                wkg: 2.0,
                                lvl: 'occasional' as RiderLevel,
                                label: isFr ? 'Balade / Loisir' : 'Casual / Touring',
                              },
                              {
                                wkg: 2.9,
                                lvl: 'regular' as RiderLevel,
                                label: isFr ? 'Cycliste régulier' : 'Active club',
                              },
                              {
                                wkg: 3.9,
                                lvl: 'pro' as RiderLevel,
                                label: isFr ? 'Entraîné / Sportif' : 'Trained / Sportive',
                              },
                            ].map((est) => {
                              const valW =
                                Math.round(((localSpecs.riderWeightKg || 68) * est.wkg) / 5) * 5;
                              return (
                                <button
                                  key={est.wkg}
                                  type="button"
                                  onClick={() => handleApplyEstimatedFtp(est.wkg, est.lvl)}
                                  className="min-h-[44px] p-2 rounded-sub-pod bg-pod hover:bg-chip text-left transition-colors cursor-pointer"
                                >
                                  <div className="text-xs font-rounded font-bold text-ink tnum">{valW} W</div>
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

              {/* Right Column: Guidance Philosophy & Carbohydrate Digestion Capacity */}
              <div className="space-y-3.5">
                <div className="space-y-2.5 rounded-pod bg-card p-3.5">
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
                      const isSelected = (localSpecs.telemetryMode || 'fuel-first') === modeOpt.id;
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
                          className={`flex flex-col items-start min-h-[44px] p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
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

                {/* Quantitative Mode: Raw Carb Slider (25–105 g/h) */}
                {localSpecs.telemetryMode === 'quantitative' && (
                  <div className="p-3.5 rounded-pod bg-card space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-rounded font-bold text-ink block">
                          {isFr
                            ? 'Capacité d’assimilation glucidique'
                            : 'Carbohydrate intake target'}
                        </label>
                        <span className="text-[11px] text-ink-muted">
                          {localSpecs.carbTargetGPerHr <= 45
                            ? isFr
                              ? 'Estomac doux · zéro surcharge digestive'
                              : 'Gentle on the stomach · easy digestion'
                            : localSpecs.carbTargetGPerHr <= 70
                            ? isFr
                              ? 'Endurance équilibrée · sorties longues'
                              : 'Balanced endurance · multi-hour rides'
                            : isFr
                            ? 'Haute assimilation · rythme sportif soutenu'
                            : 'High intake · sustained sporty efforts'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-rounded font-bold tnum shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}>
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
                      aria-label={isFr ? 'Glucides par heure' : 'Carbohydrates per hour'}
                      className="w-full peloton-slider accent-amber-500 cursor-pointer"
                    />

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { val: 35, label: isFr ? '35 g Doux' : '35 g Gentle' },
                        { val: 50, label: isFr ? '50 g Rando' : '50 g Touring' },
                        { val: 65, label: isFr ? '65 g Sport' : '65 g Steady' },
                        { val: 90, label: isFr ? '90 g Pro' : '90 g Sportive' },
                      ].map((opt) => {
                        const active = Math.abs((localSpecs.carbTargetGPerHr ?? 60) - opt.val) <= 3;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() =>
                              setLocalSpecs((prev) => ({ ...prev, carbTargetGPerHr: opt.val }))
                            }
                            className={`min-h-[44px] sm:min-h-[34px] px-2 rounded-full text-[11px] font-rounded font-semibold transition-colors cursor-pointer tnum break-words leading-tight text-center ${
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
                {(localSpecs.telemetryMode ?? 'fuel-first') === 'fuel-first' && (
                  <div className="p-3.5 rounded-pod bg-card space-y-2.5">
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
                        className={`px-2.5 py-1 rounded-full text-xs font-rounded font-bold tnum shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                      >
                        ~{Math.max(1, Math.round((localSpecs.carbTargetGPerHr || 60) / 20))} {isFr ? 'collations/h' : 'snacks/h'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          {
                            tier: 45,
                            label: t('digestionComfortGentle'),
                            sub: isFr ? 'Doux · ~2/h' : 'Gentle · ~2/h',
                          },
                          {
                            tier: 60,
                            label: t('digestionComfortBalanced'),
                            sub: isFr ? 'Équilibré · ~3/h' : 'Balanced · ~3/h',
                          },
                          {
                            tier: 85,
                            label: t('digestionComfortHighIntake'),
                            sub: isFr ? 'Intensif · ~4/h' : 'High intake · ~4/h',
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
                            className={`min-h-[44px] p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${
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
                  <div className="p-3.5 rounded-pod bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <IconBadge theme="lime" icon={Droplets} size="sm" solidBacker />
                      <div>
                        <div className="text-xs font-rounded font-bold text-ink">{isFr ? 'Régularité & hydratation' : 'Rhythm & hydration cues'}</div>
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

                {/* Quick button into Snacks & Drinks tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pantry')}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-pod bg-card hover:bg-chip flex items-center justify-between text-xs font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ForkKnife className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{isFr ? 'Personnaliser vos collations & boissons' : 'Customize snacks, bottles & diet preferences'}</span>
                  </span>
                  <span className="text-[11px] text-ink-muted">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: BIKES & TIRES ── */}
        {activeTab === 'bike' && (
          <div
            role="tabpanel"
            className="space-y-4 rounded-pod bg-pod p-3.5 sm:p-4 animate-apple-fade-in"
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
                      ? 'Pneus, poids, bidons et réglages avancés du vélo'
                      : 'Tires, weight, bottle setup and optional bike physics settings'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddBike}
                className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[34px] rounded-full text-xs font-rounded font-semibold bg-card hover:bg-chip text-ink-secondary hover:text-ink transition-colors cursor-pointer shrink-0 whitespace-nowrap ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
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
                      <span className="text-xs font-rounded font-bold break-words leading-tight pr-7">
                        {bike.name}
                      </span>
                      {localSpecs.bikes.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBike(bike.id, e)}
                          title={t('removeBikeTitle')}
                          aria-label={t('removeBikeTitle')}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity cursor-pointer before:content-[''] before:absolute before:-inset-2 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                        >
                          <Trash className="w-3.5 h-3.5 text-current" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-1.5 text-[11px] font-rounded tnum opacity-85">
                      <span>{bike.weightKg} kg</span>
                      <span>{bike.isTubeless ? 'Tubeless' : 'Tube'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Bike Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* Left Column: Model Name + Tire & Sealant Configuration */}
              <div className="space-y-3.5">
                <div className="px-4 py-2.5 rounded-pod bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                  <label className="text-xs font-rounded text-ink-muted shrink-0">
                    {t('modelNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={activeBike.name}
                    onChange={(e) => handleUpdateActiveBike('name', e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[34px] text-base sm:text-sm font-rounded font-semibold text-ink text-left sm:text-right bg-transparent focus:outline-none"
                  />
                </div>

                {/* Tire & Sealant Config Card */}
                <div className="p-3.5 rounded-pod bg-card space-y-2.5">
                  <div>
                    <span className="text-xs font-rounded font-bold text-ink block">
                      {isFr ? 'Type de pneus' : 'Tire setup'}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {activeBike.isTubeless
                        ? isFr
                          ? 'Basse pression confort (2,4–2,6 bar) · mèches & préventif dans la check-list'
                          : 'Comfortable lower pressure (2.4–2.6 bar) · includes plug kit reminder'
                        : isFr
                        ? 'Pression classique (3,0–3,2 bar) · chambre à air & démonte-pneus'
                        : 'Standard pressure (3.0–3.2 bar) · includes spare tube reminder'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        val: true,
                        title: isFr ? 'Tubeless' : 'Tubeless Ready',
                        sub: isFr ? 'Confort · anti-pincement' : 'Lower drag · pinch resistant',
                      },
                      {
                        val: false,
                        title: isFr ? 'Chambre à air' : 'Inner Tube',
                        sub: isFr ? 'Classique · simple' : 'Classic setup · spare tube',
                      },
                    ].map((opt) => {
                      const active = Boolean(activeBike.isTubeless) === opt.val;
                      return (
                        <button
                          key={String(opt.val)}
                          type="button"
                          onClick={() => handleToggleTubeless(opt.val)}
                          className={`min-h-[44px] p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
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

              {/* Right Column: Weight, Bottles & Collapsible Advanced Bike Physics */}
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-pod bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-rounded font-bold text-ink">
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
                        className="w-20 min-h-[44px] sm:min-h-[34px] text-right text-base sm:text-lg font-semibold text-ink bg-transparent focus:outline-none tnum"
                      />
                      <span className="text-xs text-ink-muted">kg</span>
                    </div>
                  </div>
                </div>

                {/* Bottle Size & Frame Cage Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-pod bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-rounded font-semibold text-ink-secondary flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-sky-500" />
                        {isFr ? 'Volume bidon' : 'Bottle size'}
                      </span>
                      <span className="text-[11px] font-rounded font-bold text-sky-600 dark:text-sky-400 tnum">
                        {localSpecs.bidonSizeMl ?? 650} ml
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {([500, 550, 650, 750, 950] as BidonSizeMl[]).map((sz) => {
                        const active = (localSpecs.bidonSizeMl ?? 650) === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() =>
                              setLocalSpecs((prev) => ({ ...prev, bidonSizeMl: sz }))
                            }
                            className={`px-2.5 min-h-[44px] sm:min-h-[32px] rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                              active
                                ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                                : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {sz} ml
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-pod bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-rounded font-semibold text-ink-secondary">
                        {isFr ? 'Porte-bidons cadre' : 'Frame cages'}
                      </span>
                      <span className="text-[11px] font-rounded font-bold text-sky-600 dark:text-sky-400 tnum">
                        {(localSpecs.frameBottleSlots ?? 2) * (localSpecs.bidonSizeMl ?? 650)} ml max
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
                            className={`min-h-[44px] sm:min-h-[32px] rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
                              active
                                ? `${CHIP_TOKENS.sky.surface} ${CHIP_TOKENS.sky.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.sky.selectedRing}`
                                : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {slots}×
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Bike Settings (Crr / CdA tucked neatly away) */}
                <div className="rounded-pod bg-card p-3.5">
                  <button
                    type="button"
                    aria-expanded={showAdvancedBike}
                    onClick={() => setShowAdvancedBike((v) => !v)}
                    className="w-full min-h-[44px] sm:min-h-[34px] flex items-center justify-between gap-2 text-xs font-rounded font-bold text-ink-secondary hover:text-ink cursor-pointer"
                  >
                    <span>{isFr ? 'Réglages vélo avancés (Crr · CdA)' : 'Advanced bike settings (Crr · CdA)'}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        showAdvancedBike ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showAdvancedBike && (
                    <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 lane-divider animate-apple-fade-in">
                      <div className="p-3 rounded-sub-pod bg-pod">
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
                          className="w-full min-h-[44px] sm:min-h-[32px] text-base sm:text-lg font-semibold text-ink bg-transparent focus:outline-none tnum"
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
                                className={`px-2 py-1 rounded-full text-[10px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
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

                      <div className="p-3 rounded-sub-pod bg-pod">
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
                          className="w-full min-h-[44px] sm:min-h-[32px] text-base sm:text-lg font-semibold text-ink bg-transparent focus:outline-none tnum"
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
                                className={`px-2 py-1 rounded-full text-[10px] font-rounded font-semibold cursor-pointer transition-colors tnum ${
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
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: SNACKS & DRINKS ── */}
        {activeTab === 'pantry' && (
          <div
            role="tabpanel"
            className="space-y-4 rounded-pod bg-pod p-3.5 sm:p-4 animate-apple-fade-in"
          >
            <PantryBuilderSection
              specs={localSpecs}
              onChange={(updated) => setLocalSpecs(updated)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3.5 lane-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-ink-muted">
          {t('syncActiveTripNotice')}
        </span>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial min-h-[44px] px-5 text-[13px] font-medium rounded-full text-ink-secondary bg-pod hover:bg-chip transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            {t('cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 min-h-[44px] px-5 text-[13px] font-medium rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] transition-all duration-150 active:scale-[0.98] cursor-pointer"
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
    </ModalPortal>
  );
};
