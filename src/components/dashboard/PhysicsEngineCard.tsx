import React, { useState, useMemo, useId } from 'react';
import {
  Lightning,
  Info,
  Sparkle,
  Mountains,
  Eye,
  Gauge,
  Flame,
  Wind,
} from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { CockpitViewMode } from '../../types/specs';
import {
  calculateSectionalEnergyBreakdown,
  getWattsDidacticExplanation,
  PowerZoneCode,
} from '../../utils/physics';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { InfoTooltip } from '../common/InfoTooltip';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import { useTranslation } from '../../context/LanguageContext';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  ChipTheme,
} from '../../tokens/chipTokens';

interface PhysicsEngineCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
  viewMode?: CockpitViewMode;
  onToggleViewMode?: (mode: CockpitViewMode) => void;
}

function getZoneChipTheme(zone: PowerZoneCode): ChipTheme {
  switch (zone) {
    case 'Z1':
      return 'emerald';
    case 'Z2':
      return 'lime';
    case 'Z3':
      return 'yellow-vest';
    case 'Z4':
      return 'amber';
    default:
      return 'rose';
  }
}

function getZoneBarColor(zone: PowerZoneCode): string {
  switch (zone) {
    case 'Z1':
      return '#10B981';
    case 'Z2':
      return '#84CC16';
    case 'Z3':
      return '#EAB308';
    case 'Z4':
      return '#F59E0B';
    default:
      return '#F43F5E';
  }
}

export const PhysicsEngineCard: React.FC<PhysicsEngineCardProps> = ({
  trip,
  physicsResult,
  viewMode = 'pro',
  onToggleViewMode,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const isEssential = viewMode === 'essential';
  const didacticPanelId = useId();
  const sectionalPanelId = useId();
  const telemetryDrawerId = useId();

  // Collapsed summary view by default: 4 headline KPIs visible, deep drawers tucked until clicked
  const [showDidactics, setShowDidactics] = useState<boolean>(false);
  const [showSectional, setShowSectional] = useState<boolean>(false);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);

  const cda = trip.physics.cda ?? 0.4;
  const crr = trip.physics.crr ?? 0.006;
  const rho = trip.physics.rho ?? 1.225;
  const gmePercent = Math.round((trip.physics.grossMechanicalEfficiency ?? 0.21) * 100);
  const drivetrainEffPercent = Math.round((trip.physics.drivetrainEfficiency ?? 0.95) * 100);

  const riderMass = trip.physics.riderWeightKg ?? 74;
  const bikeMass = trip.physics.bikeWeightKg ?? 9.4;
  const gearMass = trip.physics.gearWeightKg ?? 4.2;
  const totalSystemMass = Number((riderMass + bikeMass + gearMass).toFixed(1));

  const legWatts = Math.round(physicsResult.legWatts || 175);
  const aeroWatts = Math.round(physicsResult.aerodynamicDragWatts || 110);
  const rollingOnlyWatts = Math.round(physicsResult.rollingResistanceWatts || 32);
  const gravityWatts = Math.round(physicsResult.gravityWatts || 0);
  const surfaceAndGradeWatts = Math.max(0, rollingOnlyWatts + gravityWatts);
  const drivetrainLossWatts = Math.max(
    0,
    Math.round(legWatts - (physicsResult.wheelWatts || legWatts * 0.95))
  );

  const totalResistiveWatts = Math.max(1, aeroWatts + surfaceAndGradeWatts + drivetrainLossWatts);
  const aeroPercent = Math.round((aeroWatts / totalResistiveWatts) * 100);
  const rollingPercent = Math.round((surfaceAndGradeWatts / totalResistiveWatts) * 100);
  const lossPercent = Math.max(1, 100 - aeroPercent - rollingPercent);

  const totalWorkKj = Math.round(physicsResult.totalWorkKj);
  const totalBurnKcal = Math.round(physicsResult.totalKcalBurn);
  const totalCarbs =
    physicsResult.totalCarbsBurnedGrams ||
    Math.round(
      physicsResult.carbOxidationGramPerHour * ((physicsResult.movingTimeSeconds || 2880) / 3600)
    );

  const wattsPerKg =
    physicsResult.wattsPerKg ?? Number((legWatts / Math.max(40, riderMass)).toFixed(2));
  const ftpPercent = physicsResult.ftpPercent ?? Math.round((legWatts / 210) * 100);
  const ftpWatts = physicsResult.ftpWatts ?? 210;
  const powerZone = physicsResult.powerZone ?? 'Z2';
  const effectiveSpeed = physicsResult.effectiveSpeedKmH ?? trip.route.targetSpeedKmH;

  const zoneTheme = getZoneChipTheme(powerZone);
  const zoneLabel =
    powerZone === 'Z1'
      ? t('ftpZoneZ1')
      : powerZone === 'Z2'
      ? t('ftpZoneZ2')
      : powerZone === 'Z3'
      ? t('ftpZoneZ3')
      : powerZone === 'Z4'
      ? t('ftpZoneZ4')
      : t('ftpZoneZ5');

  const didactics = useMemo(
    () => getWattsDidacticExplanation(legWatts, ftpWatts, riderMass, lang),
    [legWatts, ftpWatts, riderMass, lang]
  );

  const sectional = useMemo(
    () =>
      calculateSectionalEnergyBreakdown(
        trip.physics,
        trip.route,
        trip.weather,
        physicsResult,
        lang
      ),
    [trip.physics, trip.route, trip.weather, physicsResult, lang]
  );

  return (
    <Card
      title={t('physicsCardTitle')}
      subtitle={isEssential ? t('cockpitViewEssentialHint') : t('physicsCardSub')}
      badge={
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <Badge variant={zoneTheme} size="md" dot className="tnum">
            {zoneLabel}
          </Badge>
          <button
            type="button"
            onClick={() => setShowDidactics((v) => !v)}
            aria-expanded={showDidactics}
            aria-controls={didacticPanelId}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-rounded font-semibold transition-colors cursor-pointer ${
              showDidactics
                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:text-ink`
            } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Info className="w-3.5 h-3.5 text-current" />
            <span>
              {showDidactics ? t('didacticWattsToggleHide') : t('didacticWattsToggleShow')}
            </span>
          </button>
        </div>
      }
    >
      {/* ── CONCENTRIC TELEMETRY VIEW SWITCHER: [ GUIDED VIEW ] / [ PRO TELEMETRY ] ── */}
      {onToggleViewMode && (
        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-full bg-pod mb-3.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setShowDidactics(false);
              setShowSectional(false);
              setShowTelemetryDrawer(false);
              onToggleViewMode('essential');
            }}
            title={t('cockpitViewEssentialHint')}
            className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              viewMode === 'essential'
                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-current" />
            <span className="truncate">{t('cockpitViewEssential')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDidactics(false);
              setShowSectional(true);
              setShowTelemetryDrawer(true);
              onToggleViewMode('pro');
            }}
            title={t('cockpitViewProHint')}
            className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              viewMode === 'pro'
                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
            }`}
          >
            <Gauge className="w-3.5 h-3.5 shrink-0 text-current" />
            <span className="truncate">{t('cockpitViewPro')}</span>
          </button>
        </div>
      )}

      {/* ── PRIMARY HEADLINE KPI PODS (4-UP GRID, ALWAYS VISIBLE) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-3.5">
        {/* KPI 1: Target Leg Power (W) */}
        <div className="rounded-pod bg-pod p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 border border-ink/5 dark:border-white/5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-rounded font-semibold uppercase tracking-wide text-ink-muted truncate">
              {t('physicsKpiLegPower')}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${CHIP_TOKENS[zoneTheme].dot}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-baseline gap-1 tnum">
            <span className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-ink">
              {legWatts}
            </span>
            <span className="text-xs font-semibold text-ink-muted">W</span>
          </div>
          <span className="text-[11px] text-ink-secondary font-mono tnum truncate">
            {wattsPerKg} W/kg &middot; {ftpPercent}% FTP
          </span>
        </div>

        {/* KPI 2: Total Work (kJ) */}
        <div className="rounded-pod bg-pod p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 border border-ink/5 dark:border-white/5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-rounded font-semibold uppercase tracking-wide text-ink-muted truncate">
              {t('physicsKpiWork')}
            </span>
            <InfoTooltip
              title={t('mechanicalWorkTooltipTitle')}
              content={t('mechanicalWorkTooltipContent', { work: totalWorkKj })}
              size="sm"
            />
          </div>
          <div className="flex items-baseline gap-1 tnum">
            <span className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-ink">
              {totalWorkKj}
            </span>
            <span className="text-xs font-semibold text-ink-muted">kJ</span>
          </div>
          <span className="text-[11px] text-ink-secondary font-mono tnum truncate">
            {t('physicsKpiWorkSub', { pct: gmePercent })} &middot; @{effectiveSpeed} km/h
          </span>
        </div>

        {/* KPI 3: Est. Burn (kcal) */}
        <div className="rounded-pod bg-pod p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 border border-ink/5 dark:border-white/5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-rounded font-semibold uppercase tracking-wide text-ink-muted truncate">
              {t('physicsKpiBurn')}
            </span>
            <InfoTooltip
              title={t('metabolicBurnTooltipTitle')}
              content={t('metabolicBurnTooltipContent')}
              size="sm"
            />
          </div>
          <div className="flex items-baseline gap-1 tnum">
            <span className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-ink">
              {totalBurnKcal}
            </span>
            <span className="text-xs font-semibold text-ink-muted">kcal</span>
          </div>
          <span className="text-[11px] text-ink-secondary font-mono tnum inline-flex items-center gap-1 truncate">
            <Flame className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.amber.primary}`} />
            <span className="truncate">
              {t('physicsKpiBurnSub')} &middot; {t('ftpRefLabel', { ftp: ftpWatts })}
            </span>
          </span>
        </div>

        {/* KPI 4: Carb Burn (g/h) */}
        <div className="rounded-pod bg-pod p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 border border-ink/5 dark:border-white/5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-rounded font-semibold uppercase tracking-wide text-ink-muted truncate">
              {t('physicsKpiCarb')}
            </span>
            <InfoTooltip
              title={t('glycogenDemandTooltipTitle')}
              content={t('glycogenDemandTooltipContent')}
              size="sm"
            />
          </div>
          <div className="flex items-baseline gap-1 tnum">
            <span
              className={`text-2xl sm:text-[26px] font-bold font-mono tracking-tight ${CHIP_TOKENS.lime.primary}`}
            >
              {physicsResult.carbOxidationGramPerHour}
            </span>
            <span className="text-xs font-semibold text-ink-muted">g/h</span>
          </div>
          <span className="text-[11px] text-ink-secondary font-mono tnum inline-flex items-center gap-1 truncate">
            <Lightning className={`w-3.5 h-3.5 shrink-0 ${CHIP_TOKENS.lime.primary}`} />
            <span className="truncate">{t('physicsKpiCarbSub', { total: totalCarbs })}</span>
          </span>
        </div>
      </div>

      {/* ── DIDACTIC WATTS & POWER ZONES EXPLAINER (COLLAPSIBLE) ── */}
      <Collapsible open={showDidactics} id={didacticPanelId} innerClassName="pb-3.5">
        <div className="rounded-pod bg-pod p-3.5 sm:p-4 border border-emerald-500/20 space-y-3">
          <div className="flex items-start gap-2.5">
            <IconBadge
              theme="emerald"
              icon={Sparkle}
              size="sm"
              solidBacker
              className="shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold font-rounded text-ink leading-snug">
                {didactics.headline}
              </h4>
              <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                <strong>{isFr ? 'Test du souffle :' : 'Breathing check:'}</strong>{' '}
                {didactics.breathingCue} {didactics.everydayAnalogy}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2.5 rounded-sub-pod bg-card">
              <span className="font-bold font-rounded text-ink block mb-0.5">
                {isFr ? 'C’est quoi les Watts ?' : 'What are Watts?'}
              </span>
              <span className="text-ink-secondary leading-snug">{didactics.whatIsWatts}</span>
            </div>
            <div className="p-2.5 rounded-sub-pod bg-card">
              <span className="font-bold font-rounded text-ink block mb-0.5 tnum">
                {isFr ? `Votre FTP (${ftpWatts} W)` : `Your FTP (${ftpWatts}W)`}
              </span>
              <span className="text-ink-secondary leading-snug">{didactics.whatIsFtp}</span>
            </div>
            <div className="p-2.5 rounded-sub-pod bg-card">
              <span className="font-bold font-rounded text-ink block mb-0.5">
                {isFr ? 'Le ratio W/kg' : 'Why W/kg matters'}
              </span>
              <span className="text-ink-secondary leading-snug">{didactics.whatIsWkg}</span>
            </div>
          </div>

          {/* Personal 5-Zone Watt Scale */}
          <div className="pt-2 border-t border-dashed border-ink/10 dark:border-white/10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5 tnum">
              {isFr
                ? `Vos 5 zones personnelles (calibrées sur FTP ${ftpWatts} W)`
                : `Your 5 personal effort zones (calibrated to ${ftpWatts}W FTP)`}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {sectional.zoneShares.map((zs) => {
                const isCurrent = zs.zone === powerZone;
                const zTheme = getZoneChipTheme(zs.zone);
                return (
                  <div
                    key={zs.zone}
                    className={`px-2.5 py-1.5 rounded-sub-pod text-[11px] tnum ${
                      isCurrent
                        ? `${CHIP_TOKENS[zTheme].surface} ${CHIP_TOKENS[zTheme].primary} font-bold`
                        : 'bg-card text-ink-secondary'
                    }`}
                  >
                    <div className="font-semibold">{zs.zone}</div>
                    <div className="text-[10px] opacity-85 font-mono">{zs.wattsRange}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Collapsible>

      {/* ── VARIABLE SECTIONAL ENERGY & MULTI-ZONE PROFILE (COLLAPSIBLE POD) ── */}
      <div className="bg-pod rounded-pod mb-3 border border-ink/5 dark:border-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSectional((v) => !v)}
          aria-expanded={showSectional}
          aria-controls={sectionalPanelId}
          className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconBadge theme="amber" icon={Mountains} size="sm" solidBacker />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-[13px] font-bold font-rounded text-ink">
                  {t('sectionalEnergyHeading')}
                </h4>
                <Badge variant={getZoneChipTheme(sectional.peakZone)} size="xs" className="tnum">
                  {isFr
                    ? `Pic bosses : ~${sectional.peakClimbWatts}W (${sectional.peakZone})`
                    : `Climb peak: ~${sectional.peakClimbWatts}W (${sectional.peakZone})`}
                </Badge>
              </div>
              <p className="text-[11px] text-ink-muted truncate">
                {sectional.isFromGpx ? t('sectionalEnergySubGpx') : t('sectionalEnergySubSynth')}
              </p>
            </div>
          </div>

          <DisclosureChevron open={showSectional} />
        </button>

        <Collapsible
          open={showSectional}
          id={sectionalPanelId}
          innerClassName="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 space-y-3"
        >
          {/* Stacked Multi-Zone Ride Time Distribution Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-ink-secondary mb-1.5 gap-2 flex-wrap">
              <span className="font-medium">
                {isFr ? 'Répartition réelle dans les zones :' : 'Time across effort zones:'}
              </span>
              <div className="flex items-center gap-2 flex-wrap tnum font-mono text-[10px]">
                {sectional.zoneShares
                  .filter((z) => z.pctTime > 0)
                  .map((z) => (
                    <span key={z.zone} className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: getZoneBarColor(z.zone) }}
                      />
                      <strong>{z.zone}</strong> {z.pctTime}%
                    </span>
                  ))}
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-card overflow-hidden flex gap-0.5 p-0.5">
              {sectional.zoneShares
                .filter((z) => z.pctTime > 0)
                .map((z) => (
                  <div
                    key={z.zone}
                    style={{
                      width: `${Math.max(4, z.pctTime)}%`,
                      backgroundColor: getZoneBarColor(z.zone),
                    }}
                    title={`${z.zone} (${z.wattsRange}): ${z.pctTime}% (~${z.minutes} min)`}
                    className="h-full rounded-full transition-all duration-300"
                  />
                ))}
            </div>
          </div>

          {/* 3 Terrain Intensity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {sectional.bands.map((band) => {
              const bTheme = getZoneChipTheme(band.zone);
              return (
                <div
                  key={band.id}
                  className="p-3 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5 flex flex-col justify-between gap-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold font-rounded text-ink leading-tight">
                        {band.title}
                      </span>
                      <Badge variant={bTheme} size="xs" className="tnum shrink-0">
                        {band.zone}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-ink-muted mt-0.5">{band.subtitle}</p>
                  </div>

                  <div className="pt-1.5 border-t border-dashed border-ink/10 dark:border-white/10 flex items-baseline justify-between gap-1 tnum">
                    <span className="text-sm font-extrabold text-ink font-mono">
                      ~{band.avgWatts}W
                    </span>
                    <span className="text-[10px] text-ink-secondary font-mono">
                      {band.pctDistance}% ({band.distanceKm} km) &middot; {band.kcalShare} kcal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Collapsible>
      </div>

      {/* ── COLLAPSIBLE DEEP TELEMETRY DRAWER: P_aero, P_rolling, P_gravity, CdA, Crr, Mass & Loss ── */}
      <div className="rounded-pod bg-pod border border-ink/5 dark:border-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTelemetryDrawer((v) => !v)}
          aria-expanded={showTelemetryDrawer}
          aria-controls={telemetryDrawerId}
          className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <IconBadge theme="yellow-vest" icon={Wind} size="sm" solidBacker />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-bold font-rounded text-ink leading-snug truncate">
                {t('physicsTelemetryDrawer')}
              </h4>
              <p className="text-[11px] text-ink-muted truncate font-mono tnum">
                {t('physicsTelemetryDrawerSub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="zinc" size="xs" className="hidden md:inline-flex font-mono tnum">
              CdA {cda}
            </Badge>
            <Badge variant="zinc" size="xs" className="hidden md:inline-flex font-mono tnum">
              Crr {crr}
            </Badge>
            <Badge variant="zinc" size="xs" className="hidden sm:inline-flex font-mono tnum">
              {totalSystemMass} kg
            </Badge>
            <DisclosureChevron open={showTelemetryDrawer} />
          </div>
        </button>

        <Collapsible
          open={showTelemetryDrawer}
          id={telemetryDrawerId}
          innerClassName="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-3 border-t border-dashed border-ink/10 dark:border-white/10 space-y-3.5"
        >
          {/* Aerodynamic & Rolling Coefficient Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-card text-ink tnum">
                <span>CdA {cda}</span>
                <InfoTooltip
                  title={t('cdaTooltipTitle')}
                  content={t('cdaTooltipContent')}
                  size="sm"
                />
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-card text-ink tnum">
                <span>Crr {crr}</span>
                <InfoTooltip
                  title={t('crrTooltipTitle')}
                  content={t('crrTooltipContent')}
                  size="sm"
                />
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-card text-ink-secondary tnum">
                &rho; {rho} kg/m&sup3;
              </span>
            </div>

            <span className="text-[11px] font-mono text-ink-muted tnum">
              P_gravity: {gravityWatts >= 0 ? `+${gravityWatts}` : gravityWatts} W (
              {trip.physics.gradientPercent ?? 0}%)
            </span>
          </div>

          {/* 1. RESISTIVE POWER PIPELINE SUB-PODS (P_aero, P_rolling + P_gravity, Drivetrain Loss) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Stage 1: Aerodynamic Drag (P_aero) */}
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col border border-ink/5 dark:border-white/5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS['yellow-vest'].dot}`} />
                  <span>{t('aeroDragPill')}</span>
                  <InfoTooltip
                    title={t('aeroDragTooltipTitle')}
                    content={t('aeroDragTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </span>
                <span className="text-xs font-medium text-ink-muted tnum">{aeroPercent}%</span>
              </div>

              <div className="h-10 sm:h-16 flex items-end mb-2.5">
                <div
                  style={{ height: `${Math.max(30, aeroPercent)}%` }}
                  className="w-full rounded-sub-pod tarmac-hatch transition-all duration-300"
                />
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink tnum">
                    {aeroWatts}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1 tnum">
                  <p className="truncate" title={`0.5 × ρ(${rho}) × CdA(${cda}) × v³`}>
                    0.5 &middot; &rho;({rho}) &middot; CdA({cda}) &middot; v&sup3;
                  </p>
                  <InfoTooltip
                    title={t('aeroFormulaTooltipTitle')}
                    content={t('aeroFormulaTooltipContent', { rho, cda })}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Stage 2: Rolling Resistance + Gravity (P_rolling + P_gravity) */}
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col border border-ink/5 dark:border-white/5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.emerald.dot}`} />
                  <span>{t('tireRollingPill')}</span>
                  <InfoTooltip
                    title={t('rollingTooltipTitle')}
                    content={t('rollingTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </span>
                <span className="text-xs font-medium text-ink-muted tnum">{rollingPercent}%</span>
              </div>

              <div className="h-10 sm:h-16 flex items-end mb-2.5">
                <div
                  style={{ height: `${Math.max(24, rollingPercent * 1.45)}%` }}
                  className="w-full rounded-sub-pod tarmac-hatch transition-all duration-300"
                />
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-semibold tracking-tight text-ink tnum">
                    {surfaceAndGradeWatts}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
                  <span className="text-[11px] font-mono text-ink-secondary tnum">
                    ({rollingOnlyWatts}W + {gravityWatts}W)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1 tnum">
                  <p className="truncate" title={`Crr(${crr}) × ${totalSystemMass}kg × g × v`}>
                    Crr({crr}) &middot; {totalSystemMass}kg &middot; g &middot; v
                  </p>
                  <InfoTooltip
                    title={t('rollingFormulaTooltipTitle')}
                    content={t('rollingFormulaTooltipContent', { crr, mass: totalSystemMass })}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Stage 3: Drivetrain Loss */}
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col border border-ink/5 dark:border-white/5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.amber.dot}`} />
                  <span>{t('drivetrainPill')}</span>
                  <InfoTooltip
                    title={t('drivetrainTooltipTitle')}
                    content={t('drivetrainTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </span>
                <span className="text-xs font-medium text-ink-muted tnum">
                  {t('effShort', { pct: drivetrainEffPercent })}
                </span>
              </div>

              <div className="h-8 sm:h-16 flex items-end mb-2.5">
                <div className="w-full h-3.5 rounded-full bg-pod flex items-center overflow-hidden">
                  <div
                    style={{ width: `${drivetrainEffPercent}%` }}
                    className={`h-full rounded-full ${CHIP_TOKENS['yellow-vest'].dot}`}
                  />
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink tnum">
                    {drivetrainLossWatts}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{t('wattsLossUnit')}</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1 tnum">
                  <p className="truncate">{t('chainFrictionLoss', { pct: lossPercent })}</p>
                  <InfoTooltip
                    title={t('drivetrainLossTooltipTitle')}
                    content={t('drivetrainLossTooltipContent')}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. SYSTEM MASS & SUBSTRATE BREAKDOWN SUB-PODS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* System Mass */}
            <div className="p-3.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                <span className="text-sm font-semibold font-rounded text-ink flex items-center gap-1.5">
                  <span>{t('systemMassHeading')}</span>
                  <InfoTooltip
                    title={t('systemMassTooltipTitle')}
                    content={t('systemMassTooltipContent')}
                    size="sm"
                  />
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pod text-ink tnum">
                  {t('totalKgBadge', { mass: totalSystemMass })}
                </span>
              </div>

              <div className="text-[13px]">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('riderMassRow')}</span>
                    <InfoTooltip
                      title={t('riderMassTooltipTitle')}
                      content={t('riderMassTooltipContent')}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{riderMass} kg</span>
                </div>
                <div className="lane-divider" aria-hidden="true" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('bicycleBuildRow')}</span>
                    <InfoTooltip
                      title={t('bicycleBuildTooltipTitle')}
                      content={t('bicycleBuildTooltipContent')}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{bikeMass} kg</span>
                </div>
                <div className="lane-divider" aria-hidden="true" />
                <div className="flex items-center justify-between pt-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('gearPayloadRow')}</span>
                    <InfoTooltip
                      title={t('gearPayloadTooltipTitle')}
                      content={t('gearPayloadTooltipContent')}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{gearMass} kg</span>
                </div>
              </div>
            </div>

            {/* Energy Substrate */}
            <div className="p-3.5 rounded-sub-pod bg-card border border-ink/5 dark:border-white/5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                <span className="text-sm font-semibold font-rounded text-ink flex items-center gap-1.5">
                  <span>{t('energySubstrateHeading')}</span>
                  <InfoTooltip
                    title={t('energySubstrateTooltipTitle')}
                    content={t('energySubstrateTooltipContent')}
                    size="sm"
                  />
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pod text-ink tnum">
                  {t('grossEffBadge', { pct: gmePercent })}
                </span>
              </div>

              <div className="text-[13px]">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('mechanicalWorkRow')}</span>
                    <InfoTooltip
                      title={t('mechanicalWorkTooltipTitle')}
                      content={t('mechanicalWorkTooltipContent', { work: totalWorkKj })}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{totalWorkKj} kJ</span>
                </div>
                <div className="lane-divider" aria-hidden="true" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('metabolicBurnRow')}</span>
                    <InfoTooltip
                      title={t('metabolicBurnTooltipTitle')}
                      content={t('metabolicBurnTooltipContent')}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{totalBurnKcal} kcal</span>
                </div>
                <div className="lane-divider" aria-hidden="true" />
                <div className="flex items-center justify-between pt-1.5">
                  <span className="text-ink-secondary flex items-center gap-1.5">
                    <span>{t('glycogenDemandRow')}</span>
                    <InfoTooltip
                      title={t('glycogenDemandTooltipTitle')}
                      content={t('glycogenDemandTooltipContent')}
                      size="sm"
                    />
                  </span>
                  <span className={`font-semibold tnum ${CHIP_TOKENS.lime.primary}`}>
                    {physicsResult.carbOxidationGramPerHour} g/h (~{totalCarbs}g)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Collapsible>
      </div>
    </Card>
  );
};
