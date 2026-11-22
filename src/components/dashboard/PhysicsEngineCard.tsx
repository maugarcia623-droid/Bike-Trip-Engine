import React, { useState, useMemo, useId, useEffect } from 'react';
import { Button } from '@/components/arc';
import {
  Lightning,
  Info,
  Sparkle,
  Mountains,
  Eye,
  Gauge,
  Wind,
  HandClosed,
  CircleArrowUpRight,
  Settings,
  Flame,
  Droplet,
  Clock,
} from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { getArchetypeFromTag } from '../../utils/archetypeChips';
import {
  buildPhysicsEnvironmentContext,
  calculateSectionalEnergyBreakdown,
  formatCautionPaceSummary,
  getWattsDidacticExplanation,
  PowerZoneCode,
} from '../../utils/physics';
import {
  computeClimbSplitsAndFueling,
  formatClimbCategoryLabel,
} from '../../utils/climbSplits';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { InfoTooltip } from '../common/InfoTooltip';
import { Collapsible, DisclosureChevron } from '../common/Collapsible';
import { SurfaceProfileBar } from '../common/SurfaceProfileBar';
import { TerrainEffortStory } from './TerrainEffortStory';
import { computeSurfaceBreakdown } from '../../utils/surfaceProfile';
import { useOsmSurface } from '../../services/osmSurfaceService';
import { useTranslation } from '../../context/LanguageContext';
import { CockpitViewMode, RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
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
  riderSpecs?: RiderBikeSpecs;
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


export const PhysicsEngineCard: React.FC<PhysicsEngineCardProps> = ({
  trip,
  physicsResult,
  viewMode = 'essential',
  onToggleViewMode,
  riderSpecs: riderSpecsProp,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const isEssential = viewMode === 'essential';
  const specs = riderSpecsProp || loadRiderBikeSpecs();
  const showWattsInGuided = specs.pacingInputMode === 'power';
  const didacticPanelId = useId();
  const sectionalPanelId = useId();
  const climbSplitsPanelId = useId();
  const telemetryDrawerId = useId();

  // Collapsed summary view by default: 4 headline KPIs visible, deep drawers tucked until clicked
  const [showDidactics, setShowDidactics] = useState<boolean>(false);
  const [showSectional, setShowSectional] = useState<boolean>(false);
  const [showClimbSplits, setShowClimbSplits] = useState<boolean>(() => !isEssential);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);

  const carbTargetGPerHr = specs.carbTargetGPerHr ?? 60;
  const isLockedCarbTarget =
    specs.carbPacingMode === 'locked' ||
    (specs.carbPacingMode !== 'auto' &&
      specs.riderLevel === 'pro' &&
      carbTargetGPerHr >= 60);

  const climbSplits = useMemo(
    () =>
      computeClimbSplitsAndFueling(trip, physicsResult, lang, {
        ftpWatts: specs.ftpWatts,
        carbTargetGPerHr: specs.carbTargetGPerHr,
        isLockedCarbTarget,
        carbPacingMode: specs.carbPacingMode,
        riderLevel: specs.riderLevel,
        nutritionPreference: specs.nutritionPreference,
        departureTimeHHMM: trip.departureTime,
        bidonSizeMl: specs.bidonSizeMl,
        frameBottleSlots: specs.frameBottleSlots,
      }),
    [
      trip,
      physicsResult,
      lang,
      specs.ftpWatts,
      specs.carbTargetGPerHr,
      isLockedCarbTarget,
      specs.carbPacingMode,
      specs.riderLevel,
      specs.nutritionPreference,
      specs.bidonSizeMl,
      specs.frameBottleSlots,
    ]
  );

  useEffect(() => {
    if (isEssential) {
      setShowClimbSplits(false);
      setShowTelemetryDrawer(false);
    } else {
      setShowClimbSplits(true);
    }
  }, [isEssential]);

  const cda = trip.physics.cda ?? 0.4;
  const crr = physicsResult.effectiveCrr ?? trip.physics.crr ?? 0.006;
  const formattedCrr = typeof crr === 'number' ? Number(crr.toFixed(4)) : crr;
  const cautionSummary = formatCautionPaceSummary(physicsResult, lang);
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

  const positiveGravityWatts = Math.max(0, gravityWatts);
  const totalBudgetW = Math.max(
    1,
    aeroWatts + rollingOnlyWatts + positiveGravityWatts + drivetrainLossWatts
  );
  const aeroBudgetPct = Math.round((aeroWatts / totalBudgetW) * 100);
  const rollingBudgetPct = Math.round((rollingOnlyWatts / totalBudgetW) * 100);
  const gravityBudgetPct =
    positiveGravityWatts > 0 ? Math.round((positiveGravityWatts / totalBudgetW) * 100) : 0;
  const lossBudgetPct = Math.max(
    0,
    100 - aeroBudgetPct - rollingBudgetPct - gravityBudgetPct
  );
  const showWattsBudget = !isEssential || showWattsInGuided;

  const totalWorkKj = Math.round(physicsResult.totalWorkKj);

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

  const activeBike =
    specs.bikes.find((b) => b.id === specs.activeBikeId) ?? specs.bikes[0];

  const canQueryOsmSurface =
    trip.route.routeMode !== 'manual-radius' &&
    Boolean(trip.route.coordinates && trip.route.coordinates.length >= 2);
  const {
    osmData,
    status: osmStatus,
    error: osmError,
    refresh: refreshOsmSurface,
  } = useOsmSurface(trip.route.coordinates, trip.route.distanceKm, canQueryOsmSurface);

  const surfaceBreakdown = useMemo(
    () =>
      computeSurfaceBreakdown(trip.route, {
        crr: trip.physics.crr ?? activeBike?.crr,
        tireWidthMm: activeBike?.tireWidthMm,
        isTubeless: activeBike?.isTubeless ?? true,
        riderWeightKg: trip.physics.riderWeightKg,
        bikeWeightKg: trip.physics.bikeWeightKg,
        luggageWeightKg: trip.physics.luggageWeightKg ?? trip.physics.gearWeightKg,
        customChips: trip.customChips ?? [],
        osmData,
        isLoadingOsm: canQueryOsmSurface && osmStatus === 'loading',
        osmError,
      }),
    [
      trip.route,
      trip.physics.crr,
      trip.physics.riderWeightKg,
      trip.physics.bikeWeightKg,
      trip.physics.luggageWeightKg,
      trip.physics.gearWeightKg,
      activeBike?.crr,
      activeBike?.tireWidthMm,
      activeBike?.isTubeless,
      trip.customChips,
      osmData,
      canQueryOsmSurface,
      osmStatus,
      osmError,
    ]
  );

  const physicsEnvContext = useMemo(
    () =>
      buildPhysicsEnvironmentContext(trip, {
        surfaceBreakdown,
        isTubeless: activeBike?.isTubeless,
      }),
    [trip, surfaceBreakdown, activeBike?.isTubeless]
  );

  const sectional = useMemo(
    () =>
      calculateSectionalEnergyBreakdown(
        trip.physics,
        trip.route,
        trip.weather,
        physicsResult,
        lang,
        physicsEnvContext
      ),
    [trip.physics, trip.route, trip.weather, physicsResult, lang, physicsEnvContext]
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
          {cautionSummary && (
            <Badge
              variant={physicsResult.cautionReasons?.includes('dark') ? 'purple' : 'amber'}
              size="md"
              className="tnum"
              title={
                isFr
                  ? `Crr effectif ${formattedCrr} (×${(physicsResult.crrMultiplier ?? 1).toFixed(2)})${(physicsResult.cautionDelayMinutes ?? 0) > 0 ? ` · +${physicsResult.cautionDelayMinutes} min d'allure prudente` : ''}`
                  : `Effective Crr ${formattedCrr} (×${(physicsResult.crrMultiplier ?? 1).toFixed(2)})${(physicsResult.cautionDelayMinutes ?? 0) > 0 ? ` · +${physicsResult.cautionDelayMinutes} min caution pace` : ''}`
              }
            >
              {cautionSummary}
            </Badge>
          )}
          <Button variant="ghost"
            type="button"
            onClick={() => setShowDidactics((v) => !v)}
            aria-expanded={showDidactics}
            aria-controls={didacticPanelId}
            className={`inline-flex items-center gap-1 min-h-[44px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-rounded font-semibold transition-colors cursor-pointer ${
              showDidactics
                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`
                : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} hover:text-ink`
            } ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Info className="w-3.5 h-3.5 text-current" />
            <span>
              {showDidactics ? t('didacticWattsToggleHide') : t('didacticWattsToggleShow')}
            </span>
          </Button>
        </div>
      }
    >
      {/* ── CONCENTRIC TELEMETRY VIEW SWITCHER: [ GUIDED VIEW ] / [ PRO TELEMETRY ] ── */}
      {onToggleViewMode && (
        <div className="flex justify-start mb-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-pod w-fit max-w-full">
          <Button variant="ghost"
            type="button"
            onClick={() => {
              setShowDidactics(false);
              setShowSectional(false);
              setShowClimbSplits(false);
              setShowTelemetryDrawer(false);
              onToggleViewMode('essential');
            }}
            title={t('cockpitViewEssentialHint')}
            className={`min-h-[44px] sm:min-h-[34px] px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              viewMode === 'essential'
                ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ${CHIP_TOKENS.emerald.selectedRing}`
                : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-current" />
            <span>{t('cockpitViewEssential')}</span>
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={() => {
              setShowDidactics(false);
              setShowSectional(true);
              setShowClimbSplits(true);
              setShowTelemetryDrawer(true);
              onToggleViewMode('pro');
            }}
            title={t('cockpitViewProHint')}
            className={`min-h-[44px] sm:min-h-[34px] px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              viewMode === 'pro'
                ? `${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_TOKENS['yellow-vest'].selectedRing}`
                : `${CHIP_RING_UNSELECTED} text-ink-muted hover:text-ink`
            }`}
          >
            <Gauge className="w-3.5 h-3.5 shrink-0 text-current" />
            <span>{t('cockpitViewPro')}</span>
          </Button>
          </div>
        </div>
      )}

      {/* ── PRIMARY HEADLINE KPI PODS (GUIDED CALM VIEW vs PRO TELEMETRY) ── */}
      {isEssential ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-3.5">
          {/* Guided KPI 1: Pace */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
              {isFr ? 'Allure estimée' : 'Target pace'}
            </span>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                {effectiveSpeed}
              </span>
              <span className="text-xs font-semibold text-ink-muted">km/h</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {cautionSummary ?? (isFr ? 'Ajustée au vent et au relief' : 'Wind & terrain adjusted')}
            </span>
          </div>

          {/* Guided KPI 2: Effort Feel (or Watts if opted in Step 4) */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
              {showWattsInGuided ? t('physicsKpiLegPower') : isFr ? 'Niveau d’effort' : 'Effort feel'}
            </span>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                {showWattsInGuided ? legWatts : powerZone}
              </span>
              {showWattsInGuided && (
                <span className="text-xs font-semibold text-ink-muted">W</span>
              )}
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {zoneLabel}
            </span>
          </div>

          {/* Guided KPI 3: Hills & Surface */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
              {isFr ? 'Relief & route' : 'Hills & surface'}
            </span>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                +{Math.round(trip.route.elevationGainM || 0)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">m</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {surfaceBreakdown.pavedPct}% {isFr ? 'Bitume' : 'Paved'} · {surfaceBreakdown.gravelPct}% Gravel
            </span>
          </div>

          {/* Guided KPI 4: Air vs Rolling Balance */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
              {isFr ? 'Vent vs route' : 'Wind vs road'}
            </span>
            <div className="flex items-baseline gap-1 tnum">
              <span className={`text-2xl sm:text-[26px] font-bold tracking-tight ${CHIP_TOKENS.lime.primary}`}>
                {aeroPercent}%
              </span>
              <span className="text-xs font-semibold text-ink-muted">
                {isFr ? 'air' : 'air'}
              </span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {rollingPercent}% {isFr ? 'pneus & pente' : 'rolling & hills'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-3.5">
          {/* Pro KPI 1: Target Leg Power (W) */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
                {t('physicsKpiLegPower')}
              </span>
              <InfoTooltip
                title={t('targetLegPowerTooltipTitle')}
                content={t('targetLegPowerTooltipContent', {
                  wkg: wattsPerKg,
                  ftpPct: ftpPercent,
                  ftp: ftpWatts,
                  zone: zoneLabel,
                })}
                size="sm"
              />
            </div>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                {legWatts}
              </span>
              <span className="text-xs font-semibold text-ink-muted">W</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {wattsPerKg} W/kg · {ftpPercent}% FTP
            </span>
          </div>

          {/* Pro KPI 2: Total Mechanical Work (kJ) */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
                {t('physicsKpiWork')}
              </span>
              <InfoTooltip
                title={t('mechanicalWorkTooltipTitle')}
                content={t('mechanicalWorkTooltipContent', { work: totalWorkKj })}
                size="sm"
              />
            </div>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                {totalWorkKj}
              </span>
              <span className="text-xs font-semibold text-ink-muted">kJ</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {t('physicsKpiWorkSub', { pct: gmePercent })} &middot; {effectiveSpeed} km/h
            </span>
          </div>

          {/* Pro KPI 3: Aerodynamic Drag (W) */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
                {t('aeroDragPill')}
              </span>
              <InfoTooltip
                title={t('aeroDragTooltipTitle')}
                content={t('aeroDragTooltipContent')}
                size="sm"
              />
            </div>
            <div className="flex items-baseline gap-1 tnum">
              <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
                {aeroWatts}
              </span>
              <span className="text-xs font-semibold text-ink-muted">W</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {aeroPercent}% &middot; {effectiveSpeed} km/h
            </span>
          </div>

          {/* Pro KPI 4: Rolling & Gravity (W) */}
          <div className="rounded-pod bg-pod p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-rounded font-semibold text-ink-muted break-words leading-tight">
                {t('tireRollingPill')}
              </span>
              <InfoTooltip
                title={t('rollingTooltipTitle')}
                content={t('rollingTooltipContent')}
                size="sm"
              />
            </div>
            <div className="flex items-baseline gap-1 tnum">
              <span className={`text-2xl sm:text-[26px] font-bold tracking-tight ${CHIP_TOKENS.lime.primary}`}>
                {surfaceAndGradeWatts}
              </span>
              <span className="text-xs font-semibold text-ink-muted">W</span>
            </div>
            <span className="text-[11px] text-ink-secondary tnum break-words leading-tight">
              {rollingOnlyWatts} W + {gravityWatts} W ({rollingPercent}%)
            </span>
          </div>
        </div>
      )}

      {/* ── UNIFIED STACKED POWER BUDGET BAR ── */}
      <div className="rounded-pod bg-pod p-3.5 mb-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-rounded font-bold uppercase tracking-[0.14em] text-ink-muted">
            {isFr ? 'Répartition puissance' : 'Power budget'}
          </span>
          <span className="text-xs font-rounded font-bold text-ink tnum">
            {showWattsBudget ? `${legWatts} W` : zoneLabel}
          </span>
        </div>

        <div
          className="h-3.5 w-full rounded-full bg-chip dark:bg-white/10 p-0.5 flex items-stretch gap-1 overflow-hidden"
          role="img"
          aria-label={
            isFr
              ? `Répartition : ${aeroBudgetPct}% aéro, ${rollingBudgetPct}% roulement${gravityBudgetPct > 0 ? `, ${gravityBudgetPct}% gravité` : ''}, ${lossBudgetPct}% transmission`
              : `Power split: ${aeroBudgetPct}% aero, ${rollingBudgetPct}% rolling${gravityBudgetPct > 0 ? `, ${gravityBudgetPct}% climb` : ''}, ${lossBudgetPct}% drivetrain`
          }
        >
          {aeroWatts > 0 && (
            <div
              style={{ flex: `${aeroWatts} 1 0%` }}
              title={`${isFr ? 'Aéro' : 'Aero drag'}: ${aeroBudgetPct}% (${aeroWatts} W)`}
              className="h-full min-w-[6px] rounded-full bg-[#A3B300] dark:bg-volt transition-all duration-300"
            />
          )}
          {rollingOnlyWatts > 0 && (
            <div
              style={{ flex: `${rollingOnlyWatts} 1 0%` }}
              title={`${isFr ? 'Roulement' : 'Rolling'}: ${rollingBudgetPct}% (${rollingOnlyWatts} W)`}
              className="h-full min-w-[6px] rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300"
            />
          )}
          {positiveGravityWatts > 0 && (
            <div
              style={{ flex: `${positiveGravityWatts} 1 0%` }}
              title={`${isFr ? 'Pente' : 'Climb'}: ${gravityBudgetPct}% (${positiveGravityWatts} W)`}
              className={`h-full min-w-[6px] rounded-full transition-all duration-300 ${
                gravityBudgetPct >= 40
                  ? 'bg-rose-500 dark:bg-rose-400'
                  : 'bg-amber-500 dark:bg-amber-400'
              }`}
            />
          )}
          {drivetrainLossWatts > 0 && (
            <div
              style={{ flex: `${drivetrainLossWatts} 1 0%` }}
              title={`${isFr ? 'Transmission' : 'Drivetrain'}: ${lossBudgetPct}% (${drivetrainLossWatts} W)`}
              className="h-full min-w-[6px] rounded-full bg-ink/35 dark:bg-white/35 transition-all duration-300"
            />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-rounded font-semibold text-ink-secondary tnum">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A3B300] dark:bg-volt shrink-0" />
            <span>
              {isFr ? 'Aéro' : 'Aero'} {aeroBudgetPct}%
              {showWattsBudget ? ` · ${aeroWatts} W` : ''}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
            <span>
              {isFr ? 'Roulement' : 'Rolling'} {rollingBudgetPct}%
              {showWattsBudget ? ` · ${rollingOnlyWatts} W` : ''}
            </span>
          </span>
          {positiveGravityWatts > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  gravityBudgetPct >= 40
                    ? 'bg-rose-500 dark:bg-rose-400'
                    : 'bg-amber-500 dark:bg-amber-400'
                }`}
              />
              <span>
                {isFr ? 'Pente' : 'Climb'} {gravityBudgetPct}%
                {showWattsBudget ? ` · ${positiveGravityWatts} W` : ''}
              </span>
            </span>
          )}
          {drivetrainLossWatts > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ink/35 dark:bg-white/35 shrink-0" />
              <span>
                {isFr ? 'Chaîne' : 'Chain'} {lossBudgetPct}%
                {showWattsBudget ? ` · ${drivetrainLossWatts} W` : ''}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ── DIDACTIC WATTS & POWER ZONES EXPLAINER (COLLAPSIBLE) ── */}
      <Collapsible open={showDidactics} id={didacticPanelId} innerClassName="pb-3.5">
        <div className="rounded-pod bg-pod p-3.5 sm:p-4 space-y-3">
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
          <div className="pt-2">
            <div className="lane-divider mb-2" aria-hidden="true" />
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
                    <div className="text-[10px] opacity-85 tnum">{zs.wattsRange}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Collapsible>

      {/* ── VARIABLE SECTIONAL ENERGY & MULTI-ZONE PROFILE (COLLAPSIBLE POD) ── */}
      <div className="bg-pod rounded-pod mb-3 overflow-hidden">
        <Button variant="ghost"
          type="button"
          onClick={() => setShowSectional((v) => !v)}
          aria-expanded={showSectional}
          aria-controls={sectionalPanelId}
          className="w-full min-h-[44px] rounded-none p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <IconBadge theme="amber" icon={Mountains} size="sm" solidBacker />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-[13px] font-bold font-rounded text-ink leading-snug">
                {t('sectionalEnergyHeading')}
              </h4>
              <p className="text-[11px] text-ink-muted break-words leading-relaxed tnum">
                {(() => {
                  const aerobic =
                    (sectional.zoneShares.find((z) => z.zone === 'Z1')?.pctTime ?? 0) +
                    (sectional.zoneShares.find((z) => z.zone === 'Z2')?.pctTime ?? 0);
                  const peak =
                    isEssential && !showWattsInGuided
                      ? isFr
                        ? `pic ${sectional.peakZone}`
                        : `peak ${sectional.peakZone}`
                      : isFr
                      ? `pic ${sectional.peakClimbWatts} W`
                      : `peak ${sectional.peakClimbWatts} W`;
                  return isFr
                    ? `${aerobic} % aérobie · ${peak} · ${surfaceBreakdown.pavedPct} % bitume`
                    : `${aerobic}% aerobic · ${peak} · ${surfaceBreakdown.pavedPct}% paved`;
                })()}
              </p>
            </div>
          </div>

          <DisclosureChevron open={showSectional} />
        </Button>

        <Collapsible
          open={showSectional}
          id={sectionalPanelId}
          innerClassName="px-3 sm:px-3.5 pb-3.5"
        >
          <TerrainEffortStory
            sectional={sectional}
            showWatts={!isEssential || showWattsInGuided}
            totalKcal={Math.round(physicsResult.totalKcalBurn)}
            surfaceSlot={
              <SurfaceProfileBar
                bare
                breakdown={surfaceBreakdown}
                onRefreshOsm={canQueryOsmSurface ? refreshOsmSurface : undefined}
              />
            }
          />

          <p className="mt-3 text-[10px] text-ink-muted leading-relaxed">
            {sectional.isFromGpx ? t('sectionalEnergySubGpx') : t('sectionalEnergySubSynth')}
          </p>
        </Collapsible>
      </div>

      {/* ── CLIMB-BY-CLIMB PACING & FUELING SPLITS (COLLAPSIBLE POD) ── */}
      <div className="bg-pod rounded-pod mb-3 overflow-hidden">
        <Button
          variant="ghost"
          type="button"
          onClick={() => setShowClimbSplits((v) => !v)}
          aria-expanded={showClimbSplits}
          aria-controls={climbSplitsPanelId}
          className="w-full min-h-[44px] rounded-none p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <IconBadge theme="rose" icon={Flame} size="sm" solidBacker />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-[13px] font-bold font-rounded text-ink leading-snug">
                {isFr ? 'Cols, Allures & Ravitaillement' : 'Climb Splits & Fueling'}
              </h4>
              <p className="text-[11px] text-ink-muted break-words leading-relaxed tnum">
                {climbSplits.climbs.length > 0
                  ? isFr
                    ? `${climbSplits.climbs.length} ${
                        climbSplits.climbs.length === 1 ? 'ascension' : 'ascensions'
                      } (+${climbSplits.totalClimbGainM}\u00A0m) · ${climbSplits.checkpoints.length} ${
                        climbSplits.checkpoints.length === 1 ? 'ravito' : 'ravitos'
                      } (${climbSplits.recommendedCarbsGPerHr}\u00A0g/h)`
                    : `${climbSplits.climbs.length} ${
                        climbSplits.climbs.length === 1 ? 'climb' : 'climbs'
                      } (+${climbSplits.totalClimbGainM}\u00A0m) · ${climbSplits.checkpoints.length} ${
                        climbSplits.checkpoints.length === 1 ? 'fuel stop' : 'fuel stops'
                      } (${climbSplits.recommendedCarbsGPerHr}\u00A0g/h)`
                  : isFr
                  ? `Parcours roulant · ${climbSplits.checkpoints.length} ${
                      climbSplits.checkpoints.length === 1 ? 'rappel nutrition' : 'rappels nutrition'
                    } (${climbSplits.recommendedCarbsGPerHr}\u00A0g/h · ${climbSplits.targetFluidMlPerHr}\u00A0mL/h)`
                  : `Rolling/flat course · ${climbSplits.checkpoints.length} ${
                      climbSplits.checkpoints.length === 1 ? 'fueling stop' : 'fueling stops'
                    } (${climbSplits.recommendedCarbsGPerHr}\u00A0g/h · ${climbSplits.targetFluidMlPerHr}\u00A0mL/h)`}
              </p>
            </div>
          </div>

          <DisclosureChevron open={showClimbSplits} />
        </Button>

        <Collapsible
          open={showClimbSplits}
          id={climbSplitsPanelId}
          innerClassName="px-3 sm:px-3.5 pb-3.5 space-y-3"
        >
          {climbSplits.climbs.length > 0 ? (
            <>
              {/* Mobile (< md): Concentric Climb Cards */}
              <div className="md:hidden space-y-2 tnum">
                {climbSplits.climbs.map((climb) => (
                  <div
                    key={`climb-card-${climb.index}`}
                    className="rounded-sub-pod bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08] p-3 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={climb.category === 'HC' || climb.category === '1' ? 'amber' : 'zinc'}
                            size="xs"
                          >
                            {formatClimbCategoryLabel(climb.category, lang)}
                          </Badge>
                          <span className="text-xs font-bold font-rounded text-ink leading-snug">
                            {climb.name}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-muted whitespace-nowrap">
                          Km {climb.startKm}–{climb.endKm} · {climb.startEleM}–{climb.summitEleM}&nbsp;m
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-rounded text-ink">
                          {climb.durationFormatted}
                        </div>
                        {climb.etaStartHHMM && (
                          <div className="text-[10px] text-ink-muted">{climb.etaStartHHMM}</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-ink/10 dark:divide-white/10 pt-2 border-t border-ink/[0.06] dark:border-white/[0.08]">
                      <div className="pr-2 min-w-0">
                        <div className="text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                          {isFr ? 'Dist / Pente' : 'Dist / Grade'}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-bold font-rounded text-ink leading-tight">
                          {climb.lengthKm}&nbsp;km · +{climb.elevationGainM}&nbsp;m
                        </div>
                        <div className="text-[10px] text-ink-muted leading-tight mt-0.5">
                          {climb.avgGradePct}% ({isFr ? 'max' : 'max'} {climb.maxGradePct}%)
                        </div>
                      </div>

                      <div className="px-2 min-w-0">
                        <div className="text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                          {isFr ? 'Cible' : 'Target'}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-bold font-rounded text-ink leading-tight">
                          {climb.targetWatts}&nbsp;W
                        </div>
                        <div className="text-[10px] text-ink-muted leading-tight mt-0.5">
                          {climb.wattsPerKg}&nbsp;W/kg · {climb.powerZone} ({climb.ftpPercent}%)
                        </div>
                      </div>

                      <div className="pl-2 min-w-0">
                        <div className="text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                          {isFr ? 'Allure / VAM' : 'Pace / VAM'}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-bold font-rounded text-ink leading-tight">
                          {climb.climbSpeedKmH}&nbsp;km/h
                        </div>
                        <div className="text-[10px] text-ink-muted leading-tight mt-0.5">
                          {climb.vamMetersPerHour} VAM
                        </div>
                      </div>
                    </div>

                    {climb.fuelingCue && (
                      <div className="rounded-sub-pod bg-pod px-2.5 py-1.5 flex items-start gap-1.5 text-[11px] text-ink-secondary leading-snug">
                        <Droplet className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
                        <span>{climb.fuelingCue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop (md+): Full 5-Column Climb Table */}
              <div className="hidden md:block overflow-x-auto rounded-sub-pod bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08]">
                <table className="w-full min-w-[580px] text-left border-collapse text-[11px] tnum">
                  <thead>
                    <tr className="border-b border-ink/10 text-[10px] uppercase tracking-wider text-ink-muted">
                      <th className="py-2 px-2.5 font-semibold">
                        {isFr ? 'Ascension' : 'Climb'}
                      </th>
                      <th className="py-2 px-2 font-semibold text-right">
                        {isFr ? 'Dist / Pente' : 'Dist / Grade'}
                      </th>
                      <th className="py-2 px-2 font-semibold text-right">
                        {isFr ? 'Cible' : 'Target'}
                      </th>
                      <th className="py-2 px-2 font-semibold text-right">
                        {isFr ? 'Durée' : 'Time'}
                      </th>
                      <th className="py-2 px-2.5 font-semibold">
                        {isFr ? 'Ravitaillement' : 'Fueling'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {climbSplits.climbs.map((climb) => (
                      <tr key={`climb-${climb.index}`} className="align-top">
                        <td className="py-2 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant={climb.category === 'HC' || climb.category === '1' ? 'amber' : 'zinc'}
                              size="xs"
                            >
                              {formatClimbCategoryLabel(climb.category, lang)}
                            </Badge>
                            <span className="font-semibold text-ink">{climb.name}</span>
                          </div>
                          <div className="text-[10px] text-ink-muted mt-0.5 whitespace-nowrap">
                            Km {climb.startKm}–{climb.endKm} · {climb.startEleM}–{climb.summitEleM}&nbsp;m
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-ink">
                            {climb.lengthKm} km · +{climb.elevationGainM} m
                          </div>
                          <div className="text-[10px] text-ink-muted">
                            {climb.avgGradePct}% {isFr ? 'moy' : 'avg'} (max {climb.maxGradePct}%)
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-ink">
                            {climb.targetWatts} W · {climb.wattsPerKg} W/kg
                          </div>
                          <div className="text-[10px] text-ink-muted">
                            {climb.powerZone} · {climb.ftpPercent}% FTP · {climb.vamMetersPerHour} VAM
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-ink">{climb.durationFormatted}</div>
                          <div className="text-[10px] text-ink-muted">
                            {climb.etaStartHHMM
                              ? `${climb.etaStartHHMM} · ${climb.climbSpeedKmH} km/h`
                              : `${climb.climbSpeedKmH} km/h`}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-ink-secondary leading-snug max-w-[180px]">
                          {climb.fuelingCue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-sub-pod bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08] p-3 text-[11px] text-ink-muted">
              {isFr
                ? 'Aucune ascension significative détectée (seuil ≥ 35 m D+ et ≥ 2,5 %). Maintenez une allure aérobie régulière.'
                : 'No major climbs detected (threshold ≥ 35 m gain at ≥ 2.5% grade). Maintain steady aerobic cadence.'}
            </div>
          )}

          {climbSplits.checkpoints.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <Droplet className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                  <span>
                    {isFr
                      ? 'Checkpoints ravitaillement km par km'
                      : 'Km-by-Km Fueling & Hydration Checkpoints'}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-ink-muted tnum whitespace-nowrap">
                  {climbSplits.recommendedCarbsGPerHr}&nbsp;g/h · {climbSplits.targetFluidMlPerHr}&nbsp;mL/h
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {climbSplits.checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className="rounded-sub-pod bg-card ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.08] px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-ink tnum">
                        {cp.label}
                      </div>
                      <div className="text-[10px] text-ink-muted leading-snug mt-0.5">
                        {cp.detail}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-ink-muted tnum whitespace-nowrap">
                      <Clock className="w-3 h-3 shrink-0" />
                      {cp.etaHHMM || `${cp.elapsedMinutes}m`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {climbSplits.isSynthesizedProfile && (
            <p className="text-[10px] text-ink-muted leading-relaxed">
              {isFr
                ? 'Profil d’ascension synthétisé depuis le D+ total (importez un GPX pour la détection précise des rampes).'
                : 'Climb splits synthesized from route elevation gain (import a GPX for exact gradient ramp detection).'}
            </p>
          )}
        </Collapsible>
      </div>

      {/* ── COLLAPSIBLE PHYSICS MATH DRAWER (tucked behind "Show physics math" in Guided view) ── */}
      <div className="rounded-pod bg-pod overflow-hidden">
        {isEssential ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setShowTelemetryDrawer((v) => !v)}
            aria-expanded={showTelemetryDrawer}
            aria-controls={telemetryDrawerId}
            className="w-full min-h-[44px] rounded-none px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
          >
            <span className="text-xs font-rounded font-semibold text-ink-secondary">
              {showTelemetryDrawer ? t('hideDeepFormulasBtn') : t('showDeepFormulasBtn')}
            </span>
            <DisclosureChevron open={showTelemetryDrawer} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setShowTelemetryDrawer((v) => !v)}
            aria-expanded={showTelemetryDrawer}
            aria-controls={telemetryDrawerId}
            className="w-full min-h-[44px] rounded-none p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-chip/60 transition-colors cursor-pointer text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <IconBadge theme="yellow-vest" icon={Wind} size="sm" solidBacker />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-[13px] font-bold font-rounded text-ink leading-snug break-words">
                  {t('physicsTelemetryDrawer')}
                </h4>
                <p className="text-[11px] text-ink-muted break-words tnum leading-tight">
                  {t('physicsTelemetryDrawerSub')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="zinc" size="xs" className="hidden md:inline-flex tnum">
                CdA {cda}
              </Badge>
              <Badge variant="zinc" size="xs" className="hidden md:inline-flex tnum">
                Crr {formattedCrr}
              </Badge>
              <Badge variant="zinc" size="xs" className="hidden sm:inline-flex tnum">
                {totalSystemMass} kg
              </Badge>
              <DisclosureChevron open={showTelemetryDrawer} />
            </div>
          </Button>
        )}

        <Collapsible
          open={showTelemetryDrawer}
          id={telemetryDrawerId}
          innerClassName="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 space-y-3.5"
        >
          <div className="lane-divider mb-2" aria-hidden="true" />
          {/* Aerodynamic, Rolling, Air Density & Gravity Coefficient Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 tnum">
            <div className="rounded-sub-pod bg-card px-2.5 py-2 flex items-center justify-between gap-1.5 min-w-0">
              <div className="min-w-0">
                <span className="block text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                  CdA
                </span>
                <span className="text-xs font-bold font-rounded text-ink">{cda}</span>
              </div>
              <InfoTooltip
                title={t('cdaTooltipTitle')}
                content={t('cdaTooltipContent')}
                size="sm"
              />
            </div>

            <div className="rounded-sub-pod bg-card px-2.5 py-2 flex items-center justify-between gap-1.5 min-w-0">
              <div className="min-w-0">
                <span className="block text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                  Crr
                </span>
                <span className="text-xs font-bold font-rounded text-ink">{formattedCrr}</span>
              </div>
              <InfoTooltip
                title={t('crrTooltipTitle')}
                content={t('crrTooltipContent')}
                size="sm"
              />
            </div>

            <div className="rounded-sub-pod bg-card px-2.5 py-2 min-w-0">
              <span className="block text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                {isFr ? 'Air ρ' : 'Air ρ'}
              </span>
              <span className="text-xs font-bold font-rounded text-ink whitespace-nowrap">
                {rho}&nbsp;kg/m&sup3;
              </span>
            </div>

            <div className="rounded-sub-pod bg-card px-2.5 py-2 min-w-0">
              <span className="block text-[9.5px] font-rounded font-bold uppercase tracking-wider text-ink-muted">
                {isFr ? 'Gravité' : 'Gravity'}
              </span>
              <span className="text-xs font-bold font-rounded text-ink whitespace-nowrap">
                {gravityWatts >= 0 ? `+${gravityWatts}` : gravityWatts}&nbsp;W ({trip.physics.gradientPercent ?? 0}%)
              </span>
            </div>
          </div>

          {/* 1. RESISTIVE POWER PIPELINE SUB-PODS (P_aero, P_rolling + P_gravity, Drivetrain Loss) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Stage 1: Aerodynamic Drag (P_aero) */}
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
                >
                  <HandClosed className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{isFr ? 'Aéro' : 'Aero drag'}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-ink-muted tnum">{aeroPercent}%</span>
                  <InfoTooltip
                    title={t('aeroDragTooltipTitle')}
                    content={t('aeroDragTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full h-3 rounded-full bg-pod tarmac-hatch p-0.5 flex items-center overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(4, aeroPercent))}%` }}
                    className="h-full rounded-full bg-[#A3B300] dark:bg-volt transition-all duration-300"
                  />
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink tnum">
                    {aeroWatts}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] text-ink-muted mt-1 tnum">
                  <p className="break-words leading-tight" title={`0.5 × ρ(${rho}) × CdA(${cda}) × v³`}>
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
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`}
                >
                  <CircleArrowUpRight className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{isFr ? 'Route & pente' : 'Road & grade'}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-ink-muted tnum">{rollingPercent}%</span>
                  <InfoTooltip
                    title={t('rollingTooltipTitle')}
                    content={t('rollingTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full h-3 rounded-full bg-pod tarmac-hatch p-0.5 flex items-center overflow-hidden">
                  {gravityWatts >= 0 ? (
                    <div
                      style={{ width: `${Math.min(100, Math.max(6, rollingPercent))}%` }}
                      className="h-full flex items-stretch gap-0.5 overflow-hidden rounded-full transition-all duration-300"
                    >
                      <div
                        style={{ flex: `${Math.max(1, rollingOnlyWatts)} 1 0%` }}
                        title={`${isFr ? 'Roulement' : 'Rolling'}: ${rollingOnlyWatts} W`}
                        className="h-full min-w-[4px] rounded-full bg-emerald-500 dark:bg-emerald-400"
                      />
                      {gravityWatts > 0 && (
                        <div
                          style={{ flex: `${gravityWatts} 1 0%` }}
                          title={`${isFr ? 'Pente' : 'Climb gravity'}: +${gravityWatts} W`}
                          className={`h-full min-w-[4px] rounded-full ${
                            gravityBudgetPct >= 40
                              ? 'bg-rose-500 dark:bg-rose-400'
                              : 'bg-amber-500 dark:bg-amber-400'
                          }`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-stretch gap-0.5">
                      <div
                        style={{
                          width: `${Math.min(
                            82,
                            Math.max(8, Math.round((rollingOnlyWatts / totalResistiveWatts) * 100))
                          )}%`,
                        }}
                        title={`${isFr ? 'Roulement' : 'Rolling'}: ${rollingOnlyWatts} W`}
                        className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                      />
                      <div
                        style={{
                          width: `${Math.min(
                            18,
                            Math.max(6, Math.round((Math.abs(gravityWatts) / totalResistiveWatts) * 100))
                          )}%`,
                        }}
                        title={`${isFr ? 'Descente' : 'Descent assist'}: ${gravityWatts} W`}
                        className="h-full rounded-full bg-sky-500 dark:bg-sky-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-semibold tracking-tight text-ink tnum">
                    {surfaceAndGradeWatts}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
                  <span className="text-[11px] text-ink-secondary tnum">
                    ({rollingOnlyWatts} W {gravityWatts < 0 ? `− ${Math.abs(gravityWatts)} W` : `+ ${gravityWatts} W`})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] text-ink-muted mt-1 tnum">
                  <p className="break-words leading-tight" title={`Crr(${formattedCrr}) × ${totalSystemMass}kg × g × v`}>
                    Crr({formattedCrr}) &middot; {totalSystemMass} kg &middot; g &middot; v
                  </p>
                  <InfoTooltip
                    title={t('rollingFormulaTooltipTitle')}
                    content={t('rollingFormulaTooltipContent', { crr: formattedCrr, mass: totalSystemMass })}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Stage 3: Drivetrain Loss */}
            <div className="rounded-sub-pod bg-card p-3.5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span>{isFr ? 'Transmission' : 'Drivetrain'}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-ink-muted tnum">
                    {t('effShort', { pct: drivetrainEffPercent })}
                  </span>
                  <InfoTooltip
                    title={t('drivetrainTooltipTitle')}
                    content={t('drivetrainTooltipContent')}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    size="sm"
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full h-3 rounded-full bg-pod tarmac-hatch p-0.5 flex items-center overflow-hidden">
                  <div
                    style={{ width: `${drivetrainEffPercent}%` }}
                    className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-300"
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
                <div className="flex items-center justify-between gap-1 text-[11px] text-ink-muted mt-1 tnum">
                  <p className="break-words leading-tight">{t('chainFrictionLoss', { pct: lossPercent })}</p>
                  <InfoTooltip
                    title={t('drivetrainLossTooltipTitle')}
                    content={t('drivetrainLossTooltipContent')}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. SYSTEM MASS & MECHANICAL EFFICIENCY SUB-PODS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* System Mass */}
            <div className="p-3.5 rounded-sub-pod bg-card">
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
                      content={t(
                        ({
                          COMMUTE: 'gearPayloadTooltipContentCommute',
                          ESCAPADE: 'gearPayloadTooltipContentEscapade',
                          BIKEPACKING: 'gearPayloadTooltipContentBikepacking',
                          SPORT: 'gearPayloadTooltipContentSport',
                        } as const)[getArchetypeFromTag(trip.tag, trip.name)]
                      )}
                      size="sm"
                    />
                  </span>
                  <span className="font-semibold text-ink tnum">{gearMass} kg</span>
                </div>
              </div>
            </div>

            {/* Mechanical Efficiency & Output */}
            <div className="p-3.5 rounded-sub-pod bg-card">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                <span className="text-sm font-semibold font-rounded text-ink flex items-center gap-1.5">
                  <span>{isFr ? 'Rendement mécanique' : 'Mechanical output'}</span>
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
                  <span className="text-ink-secondary">
                    {isFr ? 'Puissance à la roue' : 'Wheel power'}
                  </span>
                  <span className="font-semibold text-ink tnum">
                    {Math.round(physicsResult.wheelWatts || legWatts * 0.95)} W
                  </span>
                </div>
                <div className="lane-divider" aria-hidden="true" />
                <div className="flex items-center justify-between pt-1.5">
                  <span className="text-ink-secondary">
                    {isFr ? 'Répartition aéro / route' : 'Aero / surface split'}
                  </span>
                  <span className={`font-semibold tnum ${CHIP_TOKENS.lime.primary}`}>
                    {aeroPercent}% / {rollingPercent}%
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
