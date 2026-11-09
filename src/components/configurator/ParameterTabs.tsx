import React, { useState } from 'react';
import {
  Gauge,
  Path,
  Wind,
  Scales,
  CheckCircle,
  ArrowsClockwise,
  Lightning,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { calculatePhysics } from '../../utils/physics';
import { useTranslation } from '../../context/LanguageContext';
import { loadRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface ParameterTabsProps {
  trip: TripProfile;
  onChange: (updatedTrip: TripProfile) => void;
  initialTab?: 'physics' | 'route' | 'weather';
  visibleTabs?: ('physics' | 'route' | 'weather')[];
}

export const ParameterTabs: React.FC<ParameterTabsProps> = ({
  trip,
  onChange,
  initialTab = 'physics',
  visibleTabs,
}) => {
  const { lang, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'physics' | 'route' | 'weather'>(
    visibleTabs && visibleTabs.length > 0 && !visibleTabs.includes(initialTab)
      ? visibleTabs[0]
      : initialTab
  );
  const [autofillFeedback, setAutofillFeedback] = useState(false);

  const isFr = lang === 'fr';

  const updatePhysics = (field: keyof TripProfile['physics'], value: number) => {
    onChange({
      ...trip,
      physics: {
        ...trip.physics,
        [field]: value,
      },
    });
  };

  const updateRoute = (field: keyof TripProfile['route'], value: any) => {
    onChange({
      ...trip,
      route: {
        ...trip.route,
        [field]: value,
      },
    });
  };

  const livePhysics = calculatePhysics(trip.physics, trip.route, trip.weather, lang);
  const currentPacingMode = trip.route.pacingMode === 'effort' ? 'effort' : 'speed';
  const z2PresetWatts = Math.max(75, Math.round(livePhysics.ftpWatts * 0.68));
  const tempoPresetWatts = Math.max(95, Math.round(livePhysics.ftpWatts * 0.82));
  const calmPresetWatts = Math.max(75, Math.round(livePhysics.baselineLegWatts));

  const handleSelectPacingMode = (mode: 'speed' | 'effort') => {
    const nextCap =
      trip.route.targetEffortWatts && trip.route.targetEffortWatts > 0
        ? trip.route.targetEffortWatts
        : calmPresetWatts;
    onChange({
      ...trip,
      route: {
        ...trip.route,
        pacingMode: mode,
        targetEffortWatts: mode === 'effort' ? nextCap : trip.route.targetEffortWatts,
      },
    });
  };

  const updateWeather = (field: keyof TripProfile['weather'], value: any) => {
    const nextWeather = {
      ...trip.weather,
      [field]: value,
    };
    let nextPhysics = trip.physics;

    if (field === 'isHeadwindActive') {
      nextWeather.windDirection = value ? 'headwind' : 'calm';
      nextWeather.effectiveHeadwindKmH = undefined;
    } else if (field === 'baseWindSpeedKmH') {
      nextWeather.effectiveHeadwindKmH = undefined;
      if (value <= 0) {
        nextWeather.isHeadwindActive = false;
        nextWeather.windDirection = 'calm';
      }
    } else if (field === 'temperatureC' && Number.isFinite(value)) {
      const computedRho = Number((101325 / (287.05 * (value + 273.15))).toFixed(3));
      nextWeather.airDensityRho = computedRho;
      nextPhysics = { ...trip.physics, rho: computedRho };
    }

    onChange({
      ...trip,
      weather: nextWeather,
      physics: nextPhysics,
    });
  };

  const handleAutofillSpecs = () => {
    const specs = loadRiderBikeSpecs();
    const activeBike = getActiveBike(specs);

    onChange({
      ...trip,
      physics: {
        ...trip.physics,
        riderWeightKg: specs.riderWeightKg || trip.physics.riderWeightKg,
        bikeWeightKg: activeBike.weightKg || trip.physics.bikeWeightKg,
        cda: activeBike.cda || trip.physics.cda,
        crr: activeBike.crr || trip.physics.crr,
      },
    });

    setAutofillFeedback(true);
    setTimeout(() => setAutofillFeedback(false), 2200);
  };

  const systemMass = Number(
    (trip.physics.riderWeightKg + trip.physics.bikeWeightKg + trip.physics.gearWeightKg).toFixed(1)
  );

  const allTabs = [
    { id: 'physics' as const, label: t('tabPhysics'), icon: Gauge },
    { id: 'route' as const, label: t('tabRoute'), icon: Path },
    { id: 'weather' as const, label: t('tabWeather'), icon: Wind },
  ];

  const tabs = visibleTabs && visibleTabs.length > 0
    ? allTabs.filter((tab) => visibleTabs.includes(tab.id))
    : allTabs;

  const effectiveActiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0].id;

  return (
    <div className="bg-card text-ink rounded-card p-4 sm:p-5 border border-ink/5 dark:border-white/5 shadow-xs transition-colors">
      {/* Header or Full-Radius Segmented Pill Switcher */}
      {tabs.length === 1 ? (
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <IconBadge
              theme="yellow-vest"
              icon={tabs[0].icon}
              size="md"
              solidBacker
            />
            <div>
              <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink font-rounded">
                {tabs[0].label}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {tabs[0].id === 'route'
                  ? isFr
                    ? 'Stratégie d’allure, vitesse cible et marges de sécurité'
                    : 'Pacing strategy, cruising speed & security buffers'
                  : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`grid ${
            tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          } gap-1 p-1 rounded-2xl sm:rounded-full bg-pod mb-4`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = effectiveActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2 text-[11px] sm:text-[13px] font-semibold text-center leading-tight sm:whitespace-nowrap transition-all duration-150 active:scale-[0.97] rounded-xl sm:rounded-full cursor-pointer min-w-0 ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  isActive
                    ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                    : `${CHIP_RING_UNSELECTED} text-zinc-500 hover:text-zinc-800 hover:bg-card/40 dark:text-zinc-400 dark:hover:text-zinc-200`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-current" />
                <span className="max-w-full break-words text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Panels */}
      <div>
        {/* ── TAB 1: Physics & mass ── */}
        {effectiveActiveTab === 'physics' && (
          <div className="space-y-6 animate-apple-step-in">
            {/* Full-Radius System Mass Callout */}
            <div className="bg-pod rounded-2xl sm:rounded-full pl-2.5 pr-4 sm:pr-5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <IconBadge
                  theme="yellow-vest"
                  icon={Scales}
                  size="spine"
                  solidBacker
                  className="w-9 h-9 sm:w-9 sm:h-9"
                />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-ink block leading-tight">
                    {t('totalSystemMassTitle')}
                  </span>
                  <span className="text-xs text-ink-muted break-words block tnum">
                    {t('systemMassFormula', {
                      rider: trip.physics.riderWeightKg,
                      bike: trip.physics.bikeWeightKg,
                      gear: trip.physics.gearWeightKg,
                    })}
                  </span>
                </div>
              </div>
              <div className="text-xl font-semibold text-ink shrink-0 tnum">
                {systemMass} <span className="text-xs font-normal text-ink-muted">kg</span>
              </div>
            </div>

            {/* Mass Inputs Row: Rider, Bike, Gear & pack mass */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('riderMassInputLabel')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="140"
                  value={trip.physics.riderWeightKg}
                  onChange={(e) => updatePhysics('riderWeightKg', parseFloat(e.target.value) || 74)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('bikeMassInputLabel')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="30"
                  value={trip.physics.bikeWeightKg}
                  onChange={(e) => updatePhysics('bikeWeightKg', parseFloat(e.target.value) || 9.4)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('gearMassInputLabel')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={trip.physics.gearWeightKg}
                  onChange={(e) => updatePhysics('gearWeightKg', parseFloat(e.target.value) || 0)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>
            </div>

            {/* Aerodynamic & Mechanical Constants Section with Autofill Button */}
            <div className="pt-4 border-t border-dashed border-ink/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                <h4 className="text-sm font-semibold text-ink">
                  {t('aeroMechConstantsHeading')}
                </h4>
                <button
                  type="button"
                  onClick={handleAutofillSpecs}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    autofillFeedback
                      ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                      : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:brightness-[0.97] dark:hover:brightness-110`
                  }`}
                  title="Autofill aerodynamic constants from configured Rider & Bike Specs"
                >
                  {autofillFeedback ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-current" />
                      <span>{t('autofilledFeedback')}</span>
                    </>
                  ) : (
                    <>
                      <ArrowsClockwise className="w-4 h-4 text-current" />
                      <span>{t('autofillBtn')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-pod bg-pod p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-ink-secondary">
                      {t('dragAreaLabel')}
                    </label>
                    <span className="text-xs font-mono font-semibold text-ink tnum">
                      {trip.physics.cda} m&sup2;
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 0.32, label: t('postureAeroPill') },
                      { val: 0.38, label: t('postureHoodsPill') },
                      { val: 0.44, label: t('postureUprightPill') },
                    ].map((preset) => {
                      const active = Math.abs(trip.physics.cda - preset.val) < 0.015;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => updatePhysics('cda', preset.val)}
                          className={`py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer break-words leading-tight tnum text-center ${CHIP_RING_BASE} ${
                            active
                              ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                              : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.cda}
                    onChange={(e) => updatePhysics('cda', parseFloat(e.target.value) || 0.40)}
                    className="w-full h-10 bg-card rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>

                <div className="rounded-pod bg-pod p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-ink-secondary">
                      {t('rollingResLabel')}
                    </label>
                    <span className="text-xs font-mono font-semibold text-ink tnum">
                      Crr {trip.physics.crr}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 0.004, label: t('tireRoadPill') },
                      { val: 0.0055, label: t('tireGravelPill') },
                      { val: 0.007, label: t('tireTouringPill') },
                    ].map((preset) => {
                      const active = Math.abs(trip.physics.crr - preset.val) < 0.0006;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => updatePhysics('crr', preset.val)}
                          className={`py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer break-words leading-tight tnum text-center ${CHIP_RING_BASE} ${
                            active
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                              : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="number"
                    step="0.0005"
                    value={trip.physics.crr}
                    onChange={(e) => updatePhysics('crr', parseFloat(e.target.value) || 0.006)}
                    className="w-full h-10 bg-card rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {t('drivetrainEffLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.drivetrainEfficiency}
                    onChange={(e) => updatePhysics('drivetrainEfficiency', parseFloat(e.target.value) || 0.95)}
                    className="w-full h-10 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                  <span className="text-[11px] text-ink-muted mt-1 px-1 block">
                    {isFr ? '0.95 chaîne propre' : '0.95 clean chain'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {t('muscularEffLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trip.physics.grossMechanicalEfficiency}
                    onChange={(e) => updatePhysics('grossMechanicalEfficiency', parseFloat(e.target.value) || 0.21)}
                    className="w-full h-10 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                  <span className="text-[11px] text-ink-muted mt-1 px-1 block">
                    {isFr ? '0.21 rendement humain brut' : '0.21 human gross eff'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Route & pace ── */}
        {effectiveActiveTab === 'route' && (
          <div className="space-y-5 animate-apple-step-in">
            {/* Pacing Strategy Selector: Hold Speed vs Hold Effort (Cap Watts) */}
            <div className="rounded-pod bg-pod p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-ink">
                  {t('pacingModeLabel')}
                </span>
                <span className="text-xs text-ink-muted tnum">
                  {currentPacingMode === 'effort'
                    ? t('pacingHoldEffortHint', {
                        watts: Math.round(livePhysics.legWatts),
                        zone: livePhysics.powerZone,
                        speed: livePhysics.effectiveSpeedKmH,
                      })
                    : t('pacingHoldSpeedHint', { speed: trip.route.targetSpeedKmH })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPacingMode('speed')}
                  className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    currentPacingMode === 'speed'
                      ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                      : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                  }`}
                >
                  <Gauge className="w-4 h-4 shrink-0 text-current" />
                  <span>{t('pacingHoldSpeed')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPacingMode('effort')}
                  className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                    currentPacingMode === 'effort'
                      ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                      : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                  }`}
                >
                  <Lightning className="w-4 h-4 shrink-0 text-current" />
                  <span>{t('pacingHoldEffort')}</span>
                </button>
              </div>

              {currentPacingMode === 'effort' && (
                <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {[
                      { watts: z2PresetWatts, label: t('effortPresetZ2', { watts: z2PresetWatts }) },
                      { watts: calmPresetWatts, label: t('effortPresetCalm', { watts: calmPresetWatts }) },
                      { watts: tempoPresetWatts, label: t('effortPresetTempo', { watts: tempoPresetWatts }) },
                    ].map((preset) => {
                      const active = Math.abs((trip.route.targetEffortWatts || calmPresetWatts) - preset.watts) <= 3;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateRoute('targetEffortWatts', preset.watts)}
                          className={`py-1.5 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer break-words leading-tight tnum text-center ${CHIP_RING_BASE} ${
                            active
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                              : `${CHIP_RING_UNSELECTED} bg-card text-ink-secondary hover:text-ink`
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('routeDistInputLabel')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="250"
                  value={trip.route.distanceKm}
                  onChange={(e) => updateRoute('distanceKm', parseFloat(e.target.value) || 22)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              {currentPacingMode === 'effort' ? (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {t('targetEffortWattsLabel')}
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="50"
                    max="450"
                    value={trip.route.targetEffortWatts || calmPresetWatts}
                    onChange={(e) => updateRoute('targetEffortWatts', parseInt(e.target.value, 10) || calmPresetWatts)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                    {t('targetCruisingSpeedLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    max="50"
                    value={trip.route.targetSpeedKmH}
                    onChange={(e) => updateRoute('targetSpeedKmH', parseFloat(e.target.value) || 27.5)}
                    className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('trafficBufferLabel')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="60"
                  value={trip.route.urbanTrafficDelayMinutes}
                  onChange={(e) => updateRoute('urbanTrafficDelayMinutes', parseInt(e.target.value, 10) || 8)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
                <span className="text-[11px] text-ink-muted mt-1 px-1 block">
                  {t('trafficBufferHint')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('gateBufferLabel')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="30"
                  value={trip.route.gateSecurityDelayMinutes}
                  onChange={(e) => updateRoute('gateSecurityDelayMinutes', parseInt(e.target.value, 10) || 5)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
                <span className="text-[11px] text-ink-muted mt-1 px-1 block">
                  {t('gateBufferHint')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: Wind & weather ── */}
        {effectiveActiveTab === 'weather' && (
          <div className="space-y-6 animate-apple-step-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-pod rounded-pod p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-ink">
                    {t('opposingHeadwindTitle')}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateWeather('isHeadwindActive', !trip.weather.isHeadwindActive)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${CHIP_RING_BASE} ${
                      trip.weather.isHeadwindActive
                        ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                        : `${CHIP_RING_UNSELECTED} bg-card text-ink-muted`
                    }`}
                  >
                    {trip.weather.isHeadwindActive ? t('headwindActiveBtn') : t('headwindCalmBtn')}
                  </button>
                </div>
                <p className="text-xs text-ink-secondary">
                  {t('opposingHeadwindDesc')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('baseWindSpeedLabel')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="45"
                  value={trip.weather.baseWindSpeedKmH}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    updateWeather('baseWindSpeedKmH', Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                  }}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('ambientTempLabel')}
                </label>
                <input
                  type="number"
                  step="1"
                  value={trip.weather.temperatureC}
                  onChange={(e) => updateWeather('temperatureC', parseFloat(e.target.value) || 11)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('precipRiskLabel')}
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  value={trip.weather.precipitationRiskPercent}
                  onChange={(e) => updateWeather('precipitationRiskPercent', parseInt(e.target.value, 10) || 15)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5 px-1">
                  {t('visibilityDistanceLabel')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="50"
                  value={trip.weather.visibilityKm ?? 15}
                  onChange={(e) => updateWeather('visibilityKm', parseFloat(e.target.value) || 15)}
                  className="w-full h-11 bg-pod rounded-full px-4 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors tnum"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
