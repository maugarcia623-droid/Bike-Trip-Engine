import React, { useState, useEffect } from 'react';
import { Button } from '@/components/arc';
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
  BikeCategory,
  CasingType,
  RiderLevel,
  TelemetryMode,
  BidonSizeMl,
  FrameBottleSlots,
  BIKE_CATEGORY_DEFAULTS,
  TIRE_WIDTH_PRESETS,
  estimateCrrFromTire,
  resolveBikeTireWidthMm,
} from '../../types/specs';
import { saveRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';
import { calculateTyrePressure, formatTyrePressurePair, inferBikeCategory } from '../../utils/tyrePressure';
import { saveUserProfile } from '../../utils/userProfileStorage';
import {
  disconnectStravaAccount,
  fetchStravaConnectionStatus,
  getCachedStravaStatus,
  startStravaOAuthConnect,
  StravaConnectionStatus,
  subscribeStravaStatus,
} from '../../services/stravaIntegration';
import {
  disconnectHeadUnit,
  fetchHeadUnitStatuses,
  getCachedHeadUnitStatuses,
  HEADUNIT_PUSH_ENABLED,
  HeadUnitProvider,
  HeadUnitStatuses,
  startHeadUnitOAuthConnect,
  subscribeHeadUnitStatuses,
} from '../../services/headUnitIntegration';
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
  const [tireWidthDraft, setTireWidthDraft] = useState<string>('');
  const [customCrrBikeIds, setCustomCrrBikeIds] = useState<Record<string, boolean>>({});
  const [hasCustomizedCarbs, setHasCustomizedCarbs] = useState(false);
  const [stravaStatus, setStravaStatus] = useState<StravaConnectionStatus>(() =>
    getCachedStravaStatus()
  );
  const [isDisconnectingStrava, setIsDisconnectingStrava] = useState(false);
  const [headUnitStatuses, setHeadUnitStatuses] = useState<HeadUnitStatuses>(() =>
    getCachedHeadUnitStatuses()
  );

  useEffect(() => {
    const unsubStrava = subscribeStravaStatus(() => setStravaStatus(getCachedStravaStatus()));
    const unsubHeadUnits = subscribeHeadUnitStatuses(() =>
      setHeadUnitStatuses(getCachedHeadUnitStatuses())
    );
    return () => {
      unsubStrava();
      unsubHeadUnits();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalSpecs(specs);
      setActiveTab('rider');
      setShowFtpEstimator(false);
      setShowAdvancedBike(false);
      setCustomCrrBikeIds({});
      setHasCustomizedCarbs(false);
      void fetchStravaConnectionStatus().then((status) => setStravaStatus(status));
      void fetchHeadUnitStatuses().then((statuses) => setHeadUnitStatuses(statuses));
    }
  }, [isOpen, specs]);

  const activeBike = getActiveBike(localSpecs);
  const activeTireWidthMm = resolveBikeTireWidthMm(activeBike);
  const activeBikeCategory = inferBikeCategory(
    activeTireWidthMm,
    activeBike.name,
    activeBike.bikeCategory
  );

  useEffect(() => {
    setTireWidthDraft(String(activeTireWidthMm));
  }, [activeBike.id, activeTireWidthMm]);

  if (!isOpen) return null;

  const previewPressure = calculateTyrePressure({
    systemMassKg: (localSpecs.riderWeightKg || 68) + (activeBike.weightKg || 10) + 1.5,
    tireWidthMm: activeTireWidthMm,
    isTubeless: Boolean(activeBike.isTubeless),
    pavedPct: activeBikeCategory === 'road' || activeBikeCategory === 'urban' ? 95 : 65,
    gravelPct: activeBikeCategory === 'road' || activeBikeCategory === 'urban' ? 5 : 30,
    singletrackPct: activeBikeCategory === 'mtb' ? 35 : activeBikeCategory === 'road' || activeBikeCategory === 'urban' ? 0 : 5,
    gearWeightKg: 1.5,
    bikeCategory: activeBikeCategory,
    casingType: activeBike.casingType,
    isHookless: activeBike.isHookless,
    bikeName: activeBike.name,
  });

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
    const defaults = BIKE_CATEGORY_DEFAULTS.gravel;
    const newBike: BikeSpec = {
      id: newId,
      name: t('newBikeDefaultName', { num: localSpecs.bikes.length + 1 }),
      weightKg: defaults.weightKg,
      crr: defaults.crr,
      cda: defaults.cda,
      isTubeless: defaults.isTubeless,
      tireWidthMm: defaults.tireWidthMm,
      bikeCategory: 'gravel',
      casingType: defaults.casingType,
      isHookless: false,
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

  const isBikeCrrAutoEstimated = (bike: BikeSpec): boolean => {
    if (customCrrBikeIds[bike.id]) return false;
    const widthMm = resolveBikeTireWidthMm(bike);
    const cat = inferBikeCategory(widthMm, bike.name, bike.bikeCategory);
    const catDefaultCrr = BIKE_CATEGORY_DEFAULTS[cat]?.crr;
    const estCurrent = estimateCrrFromTire(
      widthMm,
      Boolean(bike.isTubeless),
      bike.casingType ?? 'standard'
    );
    const estDefaultCasing = estimateCrrFromTire(
      widthMm,
      Boolean(bike.isTubeless),
      BIKE_CATEGORY_DEFAULTS[cat]?.casingType ?? 'standard'
    );
    return (
      Math.abs(bike.crr - estCurrent) < 0.00015 ||
      Math.abs(bike.crr - estDefaultCasing) < 0.00015 ||
      (catDefaultCrr !== undefined && Math.abs(bike.crr - catDefaultCrr) < 0.00015) ||
      (bike.id === 'bike-urban' && Math.abs(bike.crr - 0.007) < 0.00015)
    );
  };

  const getSuggestedCarbsForLevel = (level: RiderLevel, mode: TelemetryMode): number => {
    if (mode === 'fuel-first') {
      return level === 'occasional' ? 45 : level === 'pro' ? 85 : 60;
    }
    if (mode === 'intuitive') {
      return 60;
    }
    return level === 'occasional' ? 40 : level === 'pro' ? 90 : 60;
  };

  const handleUpdateActiveBike = (field: keyof BikeSpec, value: any) => {
    if (field === 'crr') {
      setCustomCrrBikeIds((prev) => ({ ...prev, [activeBike.id]: true }));
    }
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) =>
        b.id === prev.activeBikeId ? { ...b, [field]: value } : b
      ),
    }));
  };

  const handleSelectBikeCategory = (nextCat: BikeCategory) => {
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => {
        if (b.id !== prev.activeBikeId) return b;
        const prevCat = inferBikeCategory(resolveBikeTireWidthMm(b), b.name, b.bikeCategory);
        const prevDefault = BIKE_CATEGORY_DEFAULTS[prevCat];
        const nextDefault = BIKE_CATEGORY_DEFAULTS[nextCat];
        const currentWidth = resolveBikeTireWidthMm(b);
        const shouldAdoptWidth =
          b.tireWidthMm === undefined || currentWidth === prevDefault.tireWidthMm;
        const nextWidth = shouldAdoptWidth ? nextDefault.tireWidthMm : currentWidth;
        const nextTubeless = shouldAdoptWidth ? nextDefault.isTubeless : Boolean(b.isTubeless);
        const nextCasing = b.casingType ?? nextDefault.casingType;
        return {
          ...b,
          bikeCategory: nextCat,
          tireWidthMm: nextWidth,
          isTubeless: nextTubeless,
          casingType: nextCasing,
          cda: Math.abs(b.cda - prevDefault.cda) < 0.02 ? nextDefault.cda : b.cda,
          crr: isBikeCrrAutoEstimated(b)
            ? estimateCrrFromTire(nextWidth, nextTubeless, nextCasing)
            : b.crr,
        };
      }),
    }));
  };

  const handleUpdateTireWidth = (nextWidthRaw: number) => {
    const clamped = Math.max(23, Math.min(65, Math.round(nextWidthRaw)));
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => {
        if (b.id !== prev.activeBikeId) return b;
        return {
          ...b,
          tireWidthMm: clamped,
          crr: isBikeCrrAutoEstimated(b)
            ? estimateCrrFromTire(clamped, Boolean(b.isTubeless), b.casingType ?? 'standard')
            : b.crr,
        };
      }),
    }));
  };

  const handleToggleTubeless = (nextTubeless: boolean) => {
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => {
        if (b.id !== prev.activeBikeId) return b;
        const widthMm = resolveBikeTireWidthMm(b);
        return {
          ...b,
          isTubeless: nextTubeless,
          crr: isBikeCrrAutoEstimated(b)
            ? estimateCrrFromTire(widthMm, nextTubeless, b.casingType ?? 'standard')
            : b.crr,
        };
      }),
    }));
  };

  const handleSelectCasing = (nextCasing: CasingType) => {
    setLocalSpecs((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => {
        if (b.id !== prev.activeBikeId) return b;
        const widthMm = resolveBikeTireWidthMm(b);
        return {
          ...b,
          casingType: nextCasing,
          crr: isBikeCrrAutoEstimated(b)
            ? estimateCrrFromTire(widthMm, Boolean(b.isTubeless), nextCasing)
            : b.crr,
        };
      }),
    }));
  };

  const handleSelectRiderLevel = (level: RiderLevel) => {
    setLocalSpecs((prev) => {
      const mode = prev.telemetryMode ?? 'fuel-first';
      const currentCarbs = prev.carbTargetGPerHr;
      const prevLevel = prev.riderLevel ?? 'regular';
      const matchesPrevDefault =
        currentCarbs === undefined ||
        currentCarbs === getSuggestedCarbsForLevel(prevLevel, mode) ||
        currentCarbs === getSuggestedCarbsForLevel(prevLevel, 'fuel-first') ||
        currentCarbs === getSuggestedCarbsForLevel(prevLevel, 'quantitative');
      const isCustomized = hasCustomizedCarbs || !matchesPrevDefault;
      const suggestedCarbs = getSuggestedCarbsForLevel(level, mode);
      return {
        ...prev,
        riderLevel: level,
        carbTargetGPerHr: isCustomized ? currentCarbs ?? suggestedCarbs : suggestedCarbs,
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

        <Button variant="ghost"
          type="button"
          onClick={onClose}
          aria-label={t('closeModalAria')}
          className={`w-11 h-11 sm:w-9 sm:h-9 shrink-0 rounded-full hover:text-ink hover:bg-chip flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
        >
          <X className="w-4 h-4 text-current" />
        </Button>
      </div>

      {/* 3-Tab Segmented Navigation: Rider & View / Bikes / Snacks & Drinks */}
      <div
        role="tablist"
        aria-label={isFr ? 'Sections des réglages' : 'Settings sections'}
        className="grid grid-cols-3 gap-1.5 p-1.5 rounded-full bg-pod mb-4 shrink-0"
      >
        <Button variant="ghost"
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
        </Button>
        <Button variant="ghost"
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
        </Button>
        <Button variant="ghost"
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
        </Button>
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
                      <Button variant="ghost"
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
                        {isFr ? 'Vue guidée' : 'Guided view'}
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        onClick={() =>
                          setLocalSpecs((prev) => ({
                            ...prev,
                            cockpitViewMode: 'pro',
                            telemetryMode: 'quantitative',
                            pacingInputMode: 'power',
                          }))
                        }
                        className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-sub-pod text-xs font-rounded font-semibold transition-all cursor-pointer ${
                          isProView
                            ? 'bg-card text-ink shadow-xs ring-1 ring-inset ring-ink/10 dark:ring-white/10'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {isFr ? 'Mode Pro (Données)' : 'Pro mode (Data)'}
                      </Button>
                    </div>
                  </div>

                  <div className="lane-divider my-2.5" aria-hidden="true" />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-rounded font-bold text-ink">
                      {isFr ? 'Mesure de l’effort' : 'How you pace your effort'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-sub-pod bg-pod">
                      <Button variant="ghost"
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
                      </Button>
                      <Button variant="ghost"
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
                      </Button>
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
                        <Button variant="ghost"
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
                        </Button>
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
                        <Button variant="ghost"
                          type="button"
                          onClick={() => setShowFtpEstimator((v) => !v)}
                          className={`inline-flex items-center gap-1 px-3 min-h-[44px] sm:min-h-[32px] rounded-full text-xs font-rounded font-semibold cursor-pointer transition-colors shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                        >
                          <Sparkle className="w-3 h-3 text-current" />
                          <span>{showFtpEstimator ? (isFr ? 'Masquer' : 'Hide') : isFr ? 'Estimer FTP' : 'Estimate FTP'}</span>
                        </Button>
                      </div>
                      {showFtpEstimator && (
                        <>
                          <div className="lane-divider my-2.5" aria-hidden="true" />
                          <div className="space-y-2 animate-fade-in">
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
                                <Button variant="ghost"
                                  key={est.wkg}
                                  type="button"
                                  onClick={() => handleApplyEstimatedFtp(est.wkg, est.lvl)}
                                  className="min-h-[44px] p-2 rounded-sub-pod bg-pod hover:bg-chip text-left transition-colors cursor-pointer"
                                >
                                  <div className="text-xs font-rounded font-bold text-ink tnum">{valW} W</div>
                                  <div className="text-[10px] text-ink-muted break-words leading-tight">{est.label}</div>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        </>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-pod bg-pod">
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
                        <Button variant="ghost"
                          key={modeOpt.id}
                          type="button"
                          onClick={() => {
                            setLocalSpecs((prev) => ({
                              ...prev,
                              telemetryMode: modeOpt.id,
                              carbTargetGPerHr: prev.carbTargetGPerHr || 60,
                            }));
                          }}
                          className={`flex flex-col items-start justify-start h-full min-h-[44px] p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                            isSelected
                              ? 'bg-card text-ink shadow-xs ring-1 ring-ink/10 dark:ring-white/10'
                              : 'text-ink-muted hover:text-ink hover:bg-card/40'
                          }`}
                        >
                          <div className="flex items-start gap-1.5 w-full min-w-0">
                            <ModeIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-amber-500' : 'text-current'}`} />
                            <span className="text-xs font-rounded font-bold leading-tight break-words whitespace-normal">{modeOpt.label}</span>
                          </div>
                          <span className="text-[10px] leading-tight opacity-75 mt-1 break-words whitespace-normal">
                            {modeOpt.sub}
                          </span>
                        </Button>
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
                      onChange={(e) => {
                        setHasCustomizedCarbs(true);
                        setLocalSpecs((prev) => ({
                          ...prev,
                          carbTargetGPerHr: parseInt(e.target.value, 10) || 60,
                        }));
                      }}
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
                          <Button variant="ghost"
                            key={opt.val}
                            type="button"
                            onClick={() => {
                              setHasCustomizedCarbs(true);
                              setLocalSpecs((prev) => ({ ...prev, carbTargetGPerHr: opt.val }));
                            }}
                            className={`min-h-[44px] sm:min-h-[34px] px-2 rounded-full text-[11px] font-rounded font-semibold transition-colors cursor-pointer tnum break-words leading-tight text-center ${
                              active
                                ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                                : `bg-pod text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {opt.label}
                          </Button>
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
                          <Button variant="ghost"
                            key={tierOpt.tier}
                            type="button"
                            onClick={() => {
                              setHasCustomizedCarbs(true);
                              setLocalSpecs((prev) => ({
                                ...prev,
                                carbTargetGPerHr: tierOpt.tier,
                              }));
                            }}
                            className={`min-h-[44px] p-2.5 rounded-sub-pod text-left transition-all cursor-pointer ${
                              active
                                ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                                : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            <div className="text-xs font-rounded font-semibold break-words leading-tight">{tierOpt.label}</div>
                            <div className="text-[10px] opacity-80 mt-0.5 break-words leading-tight tnum">{tierOpt.sub}</div>
                          </Button>
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
                <Button variant="ghost"
                  type="button"
                  onClick={() => setActiveTab('pantry')}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-pod bg-card hover:bg-chip flex items-center justify-between text-xs font-rounded font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ForkKnife className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{isFr ? 'Personnaliser vos collations & boissons' : 'Customize snacks, bottles & diet preferences'}</span>
                  </span>
                  <span className="text-[11px] text-ink-muted">→</span>
                </Button>

                {/* Connected Apps: Strava OAuth */}
                <div className="p-3.5 rounded-pod bg-card space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FC4C02] shrink-0" />
                        <span>{isFr ? 'Applications connectées' : 'Connected Apps'}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                        {stravaStatus.connected
                          ? isFr
                            ? `Strava connecté (${stravaStatus.athleteName || 'Athlète'}) — import direct des parcours`
                            : `Strava connected (${stravaStatus.athleteName || 'Rider'}) — direct route import enabled`
                          : isFr
                          ? 'Connectez Strava pour importer vos liens de parcours en 1 clic.'
                          : 'Connect Strava to import route links directly in 1 click.'}
                      </p>
                      {stravaStatus.error && !stravaStatus.connected && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          {stravaStatus.error === 'missing_strava_secrets'
                            ? isFr
                              ? 'L’import Strava n’est pas encore activé sur ce serveur — importez un fichier .GPX/.FIT depuis Strava.'
                              : 'Strava import isn’t enabled on this server yet — export a .GPX/.FIT from Strava instead.'
                            : isFr
                            ? `Connexion Strava interrompue (${stravaStatus.error}).`
                            : `Strava connection failed (${stravaStatus.error}).`}
                        </p>
                      )}
                    </div>

                    {stravaStatus.connected ? (
                      <Button
                        variant="ghost"
                        type="button"
                        disabled={isDisconnectingStrava}
                        onClick={async () => {
                          setIsDisconnectingStrava(true);
                          await disconnectStravaAccount();
                          setIsDisconnectingStrava(false);
                        }}
                        className="min-h-[44px] sm:min-h-[34px] px-3.5 rounded-full bg-pod hover:bg-chip text-xs font-rounded font-semibold text-ink-secondary hover:text-ink shrink-0 cursor-pointer"
                      >
                        {isFr ? 'Déconnecter' : 'Disconnect'}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={startStravaOAuthConnect}
                        className="min-h-[44px] sm:min-h-[34px] px-3.5 rounded-full bg-[#B83500] hover:bg-[#9E2D00] text-white text-xs font-rounded font-semibold shrink-0 cursor-pointer transition-colors"
                      >
                        {isFr ? 'Connecter Strava' : 'Connect Strava'}
                      </Button>
                    )}
                  </div>

                  {/* Bike Computers: Wahoo / Hammerhead / Garmin (shelved until API keys are added) */}
                  {HEADUNIT_PUSH_ENABLED && (
                    <div className="pt-2 border-t border-ink/5 dark:border-white/5 flex flex-wrap items-center gap-1.5">
                      {(['wahoo', 'hammerhead', 'garmin'] as HeadUnitProvider[]).map((hu) => {
                        const isConnected = headUnitStatuses[hu];
                        const label =
                          hu === 'wahoo' ? 'Wahoo' : hu === 'hammerhead' ? 'Hammerhead' : 'Garmin';
                        return (
                          <Button
                            key={hu}
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              isConnected
                                ? void disconnectHeadUnit(hu)
                                : startHeadUnitOAuthConnect(hu)
                            }
                            className={`min-h-[36px] px-3 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors ${
                              isConnected
                                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                                : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                            }`}
                          >
                            {isConnected
                              ? `${label} ✓`
                              : isFr
                              ? `Connecter ${label}`
                              : `Connect ${label}`}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
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

              <Button variant="ghost"
                type="button"
                onClick={handleAddBike}
                className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[34px] rounded-full text-xs font-rounded font-semibold bg-card hover:bg-chip text-ink-secondary hover:text-ink transition-colors cursor-pointer shrink-0 whitespace-nowrap ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
              >
                <Plus className="w-3.5 h-3.5 text-current shrink-0" />
                <span>{t('addBikeBtn')}</span>
              </Button>
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
                        <Button variant="ghost"
                          type="button"
                          onClick={(e) => handleRemoveBike(bike.id, e)}
                          title={t('removeBikeTitle')}
                          aria-label={t('removeBikeTitle')}
                          className={`absolute top-1.5 right-1.5 w-11 h-11 sm:w-7 sm:h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                        >
                          <Trash className="w-3.5 h-3.5 text-current" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-1.5 text-[11px] font-rounded tnum opacity-85">
                      <span>{bike.weightKg} kg · {resolveBikeTireWidthMm(bike)} mm</span>
                      <span>{bike.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tube'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Bike Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* Left Column: Model Name, Bike Style & Friendly Tires Card */}
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-pod bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
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

                  <div className="lane-divider" aria-hidden="true" />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-rounded font-bold text-ink">
                        {isFr ? 'Type de vélo' : 'Bike style'}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {isFr ? 'Adapte les valeurs par défaut' : 'Sets smart defaults'}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          { id: 'road' as BikeCategory, label: isFr ? 'Route' : 'Road' },
                          { id: 'gravel' as BikeCategory, label: 'Gravel' },
                          { id: 'urban' as BikeCategory, label: isFr ? 'Ville' : 'City' },
                          { id: 'touring' as BikeCategory, label: isFr ? 'Rando' : 'Tour' },
                          { id: 'mtb' as BikeCategory, label: isFr ? 'VTT' : 'MTB' },
                        ] as const
                      ).map((catOpt) => {
                        const active = activeBikeCategory === catOpt.id;
                        return (
                          <Button
                            variant="ghost"
                            key={catOpt.id}
                            type="button"
                            onClick={() => handleSelectBikeCategory(catOpt.id)}
                            className={`min-h-[40px] sm:min-h-[32px] px-1.5 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors text-center truncate ${
                              active
                                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                                : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {catOpt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Friendly Tire Width & Setup Card */}
                <div className="p-3.5 rounded-pod bg-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-rounded font-bold text-ink block">
                        {isFr ? 'Largeur & montage des pneus' : 'Tires & width'}
                      </span>
                      <span className="text-[11px] text-ink-muted leading-snug block mt-0.5">
                        {isFr
                          ? 'Indiqué sur le flanc (ex. 28 ou 38), ou choisissez au plus proche'
                          : 'Printed on the tire sidewall (e.g. 28 or 38), or pick closest'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-sub-pod bg-pod shrink-0">
                      <input
                        type="number"
                        min={23}
                        max={65}
                        step={1}
                        aria-label={isFr ? 'Largeur du pneu en mm' : 'Tire width in mm'}
                        value={tireWidthDraft}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setTireWidthDraft(raw);
                          const parsed = parseInt(raw, 10);
                          if (Number.isFinite(parsed) && parsed >= 23 && parsed <= 65) {
                            handleUpdateTireWidth(parsed);
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(tireWidthDraft, 10);
                          if (Number.isFinite(parsed)) {
                            const clamped = Math.max(23, Math.min(65, parsed));
                            handleUpdateTireWidth(clamped);
                            setTireWidthDraft(String(clamped));
                          } else {
                            setTireWidthDraft(String(activeTireWidthMm));
                          }
                        }}
                        className="w-10 text-right text-sm font-rounded font-bold text-ink bg-transparent focus:outline-none tnum"
                      />
                      <span className="text-[11px] font-rounded font-semibold text-ink-muted">mm</span>
                    </div>
                  </div>

                  {/* Quick Sidewall Presets */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {TIRE_WIDTH_PRESETS.map((preset) => {
                      const active = Math.abs(activeTireWidthMm - preset.widthMm) <= 2;
                      return (
                        <Button
                          variant="ghost"
                          key={preset.widthMm}
                          type="button"
                          onClick={() => handleUpdateTireWidth(preset.widthMm)}
                          className={`min-h-[44px] sm:min-h-[40px] px-1 py-1.5 rounded-sub-pod text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            active
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                              : `bg-pod text-ink-secondary hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                          }`}
                        >
                          <span className="text-[11px] font-rounded font-bold tnum leading-tight">
                            {preset.widthMm}
                          </span>
                          <span className="text-[9px] opacity-80 leading-tight truncate max-w-full">
                            {isFr ? preset.hintFr : preset.hintEn}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <div className="lane-divider" aria-hidden="true" />

                  {/* Tubeless vs Inner Tube Toggle + Live Pressure Preview + bar/PSI unit switch */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-rounded font-semibold text-ink-secondary">
                        {isFr ? 'Chambre à air ou Tubeless ?' : 'Inner tube or Tubeless?'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="sky" size="xs" className="tnum font-rounded">
                          ~{formatTyrePressurePair(previewPressure.frontBar, previewPressure.rearBar, localSpecs.pressureUnit ?? 'bar', lang)}
                        </Badge>
                        <div className="inline-flex items-center p-0.5 rounded-full bg-chip" role="group" aria-label={isFr ? 'Unité pression pneus' : 'Tyre pressure unit'}>
                          {(['bar', 'psi'] as const).map((unitOpt) => {
                            const activeUnit = (localSpecs.pressureUnit ?? 'bar') === unitOpt;
                            return (
                              <Button
                                key={unitOpt}
                                variant="ghost"
                                type="button"
                                onClick={() =>
                                  setLocalSpecs((prev) => ({ ...prev, pressureUnit: unitOpt }))
                                }
                                className={`min-h-[32px] px-2.5 py-0.5 rounded-full text-[10px] font-rounded font-bold transition-colors cursor-pointer ${
                                  activeUnit
                                    ? 'bg-card text-ink shadow-xs'
                                    : 'text-ink-muted hover:text-ink'
                                }`}
                              >
                                {unitOpt === 'psi' ? 'PSI' : 'bar'}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          val: true,
                          title: 'Tubeless',
                          sub: isFr ? 'Sans chambre · basse pression' : 'No tube · supple ride',
                        },
                        {
                          val: false,
                          title: isFr ? 'Chambre à air' : 'Inner tube',
                          sub: isFr ? 'Le plus courant · simple' : 'Most common · classic',
                        },
                      ].map((opt) => {
                        const active = Boolean(activeBike.isTubeless) === opt.val;
                        return (
                          <Button
                            variant="ghost"
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
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-ink-muted leading-snug">
                      {isFr
                        ? 'Pas sûr ? La plupart des vélos de ville ou loisir ont une chambre à air.'
                        : 'Not sure? Most city and entry-level bikes use inner tubes.'}
                    </p>
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
                          <Button variant="ghost"
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
                          </Button>
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
                          <Button variant="ghost"
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
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Bike & Tire Settings (tucked neatly away) */}
                <div className="rounded-pod bg-card p-3.5">
                  <Button variant="ghost"
                    type="button"
                    aria-expanded={showAdvancedBike}
                    onClick={() => setShowAdvancedBike((v) => !v)}
                    className="w-full min-h-[44px] sm:min-h-[34px] rounded-sub-pod px-2 flex items-center justify-between gap-2 text-xs font-rounded font-bold text-ink-secondary hover:text-ink cursor-pointer"
                  >
                    <span>
                      {isFr
                        ? 'Réglages avancés (carcasse · hookless · Crr · CdA)'
                        : 'Advanced tire & aero settings (optional)'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        showAdvancedBike ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>

                  {showAdvancedBike && (
                    <>
                      <div className="lane-divider my-3" aria-hidden="true" />
                      <div className="space-y-3 animate-apple-fade-in">
                        {/* Casing Stiffness */}
                        <div className="p-3 rounded-sub-pod bg-pod space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-rounded font-semibold text-ink-secondary">
                              {isFr ? 'Carcasse du pneu' : 'Tire casing'}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              {isFr ? 'Souple vs renforcée' : 'Race supple vs reinforced'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: 'supple' as CasingType, label: isFr ? 'Souple' : 'Supple' },
                                { id: 'standard' as CasingType, label: 'Standard' },
                                { id: 'reinforced' as CasingType, label: isFr ? 'Renforcée' : 'Reinforced' },
                              ] as const
                            ).map((cOpt) => {
                              const currentCasing =
                                activeBike.casingType ??
                                (activeBikeCategory === 'road' ? 'supple' : 'standard');
                              const active = currentCasing === cOpt.id;
                              return (
                                <Button
                                  variant="ghost"
                                  key={cOpt.id}
                                  type="button"
                                  onClick={() => handleSelectCasing(cOpt.id)}
                                  className={`min-h-[36px] px-2 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors ${
                                    active
                                      ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.emerald.selectedRing}`
                                      : `bg-card text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                                  }`}
                                >
                                  {cOpt.label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Hookless Rim Toggle */}
                        <div className="p-3 rounded-sub-pod bg-pod flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-rounded font-semibold text-ink-secondary block">
                              {isFr ? 'Jantes Hookless (sans crochets)' : 'Hookless rims'}
                            </span>
                            <span className="text-[10px] text-ink-muted block leading-tight">
                              {isFr ? 'Plafonne la pression à 5,0 bar (ETRTO)' : 'Caps pressure at 5.0 bar ETRTO limit'}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              handleUpdateActiveBike('isHookless', !Boolean(activeBike.isHookless))
                            }
                            className={`min-h-[36px] px-3 rounded-full text-[11px] font-rounded font-semibold cursor-pointer transition-colors shrink-0 ${
                              activeBike.isHookless
                                ? `${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary} ${CHIP_RING_BASE} ${CHIP_TOKENS.amber.selectedRing}`
                                : `bg-card text-ink-muted hover:text-ink ${CHIP_RING_BASE} ${CHIP_RING_UNSELECTED}`
                            }`}
                          >
                            {activeBike.isHookless
                              ? isFr
                                ? 'Hookless (5 bar)'
                                : 'Hookless (5 bar)'
                              : isFr
                              ? 'Standard'
                              : 'Hooked'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
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
                                { val: 0.004, short: isFr ? 'Rapide' : 'Fast' },
                                { val: 0.0055, short: isFr ? 'Mixte' : 'Mixed' },
                                { val: 0.007, short: isFr ? 'Robuste' : 'Rugged' },
                              ].map((p) => {
                                const active = Math.abs(activeBike.crr - p.val) < 0.0006;
                                return (
                                  <Button variant="ghost"
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
                                  </Button>
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
                                  <Button variant="ghost"
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
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
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
      <div className="lane-divider mt-4 mb-3.5" aria-hidden="true" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-ink-muted">
          {t('syncActiveTripNotice')}
        </span>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <Button variant="ghost"
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial min-h-[44px] px-5 text-[13px] font-medium rounded-full text-ink-secondary bg-pod hover:bg-chip transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            {t('cancelBtn')}
          </Button>
          <Button variant="ghost"
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
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
};
