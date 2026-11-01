import React from 'react';
import { Lightning } from '@/components/icons';
import { TripProfile, PhysicsCalculationResult } from '../../types/trip';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { InfoTooltip } from '../common/InfoTooltip';
import { useTranslation } from '../../context/LanguageContext';
import { CHIP_TOKENS, GREYSCALE_TOKENS, ChipTheme } from '../../tokens/chipTokens';

interface PhysicsEngineCardProps {
  trip: TripProfile;
  physicsResult: PhysicsCalculationResult;
}

export const PhysicsEngineCard: React.FC<PhysicsEngineCardProps> = ({
  trip,
  physicsResult,
}) => {
  const { t } = useTranslation();

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

  const totalCarbs =
    physicsResult.totalCarbsBurnedGrams ||
    Math.round(physicsResult.carbOxidationGramPerHour * ((physicsResult.movingTimeSeconds || 2880) / 3600));

  const wattsPerKg = physicsResult.wattsPerKg ?? Number((legWatts / Math.max(40, riderMass)).toFixed(2));
  const ftpPercent = physicsResult.ftpPercent ?? Math.round((legWatts / 210) * 100);
  const ftpWatts = physicsResult.ftpWatts ?? 210;
  const powerZone = physicsResult.powerZone ?? 'Z2';
  const effectiveSpeed = physicsResult.effectiveSpeedKmH ?? trip.route.targetSpeedKmH;

  const zoneTheme: ChipTheme =
    powerZone === 'Z1'
      ? 'emerald'
      : powerZone === 'Z2'
      ? 'lime'
      : powerZone === 'Z3'
      ? 'yellow-vest'
      : powerZone === 'Z4'
      ? 'amber'
      : 'rose';

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

  return (
    <Card
      title={t('physicsCardTitle')}
      subtitle={t('physicsCardSub')}
      badge={
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium font-mono ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary}`}>
            <span>CdA {cda}</span>
            <InfoTooltip
              title={t('cdaTooltipTitle')}
              content={t('cdaTooltipContent')}
              size="sm"
            />
          </span>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium font-mono ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary}`}>
            <span>Crr {crr}</span>
            <InfoTooltip
              title={t('crrTooltipTitle')}
              content={t('crrTooltipContent')}
              size="sm"
            />
          </span>
        </div>
      }
    >
      {/* ── 0. RIDER-NORMALIZED EFFORT & POWER ZONE CAPSULE ── */}
      <div className="rounded-pod bg-pod px-3.5 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge theme={zoneTheme} icon={Lightning} size="md" solidBacker />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink tnum">
                {legWatts} W
              </span>
              <span className="text-xs font-semibold text-ink-secondary tnum">
                {wattsPerKg} W/kg &middot; {ftpPercent}% FTP
              </span>
            </div>
            <span className="text-[11px] text-ink-muted block tnum">
              {t('riderEffortHeading')} &middot; @{effectiveSpeed} km/h ({t('ftpRefLabel', { ftp: ftpWatts })})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Badge variant={zoneTheme} size="md" dot className="tnum">
            {zoneLabel}
          </Badge>
        </div>
      </div>

      {/* ── 1. RESISTIVE POWER PIPELINE PODS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {/* Stage 1: Aerodynamic Drag */}
        <div className="rounded-pod bg-pod p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS['yellow-vest'].dot}`} />
              <span>{t('aeroDragPill')}</span>
              <InfoTooltip
                title={t('aeroDragTooltipTitle')}
                content={t('aeroDragTooltipContent')}
                className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                size="sm"
              />
            </span>
            <span className="text-xs font-medium text-ink-muted tnum">
              {aeroPercent}%
            </span>
          </div>

          <div className="h-12 sm:h-20 flex items-end mb-3 sm:mb-3.5">
            <div
              style={{ height: `${Math.max(30, aeroPercent)}%` }}
              className="w-full rounded-sub-pod tarmac-hatch transition-all duration-300"
            />
          </div>

          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight text-ink tnum">
                {aeroWatts}
              </span>
              <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1">
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

        {/* Stage 2: Rolling Resistance */}
        <div className="rounded-pod bg-pod p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.emerald.dot}`} />
              <span>{t('tireRollingPill')}</span>
              <InfoTooltip
                title={t('rollingTooltipTitle')}
                content={t('rollingTooltipContent')}
                className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                size="sm"
              />
            </span>
            <span className="text-xs font-medium text-ink-muted tnum">
              {rollingPercent}%
            </span>
          </div>

          <div className="h-12 sm:h-20 flex items-end mb-3 sm:mb-3.5">
            <div
              style={{ height: `${Math.max(24, rollingPercent * 1.45)}%` }}
              className="w-full rounded-sub-pod tarmac-hatch transition-all duration-300"
            />
          </div>

          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl font-semibold tracking-tight text-ink tnum">
                {surfaceAndGradeWatts}
              </span>
              <span className="text-xs font-medium text-ink-muted">{t('wattsUnit')}</span>
              {Math.abs(gravityWatts) >= 2 && (
                <span className="text-[11px] font-mono text-ink-secondary tnum">
                  ({rollingOnlyWatts}W + {gravityWatts}W {trip.physics.gradientPercent}%)
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1">
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
        <div className="rounded-pod bg-pod p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP_TOKENS.amber.surface} ${CHIP_TOKENS.amber.primary}`}>
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

          <div className="h-6 sm:h-20 flex items-end mb-3 sm:mb-3.5">
            <div className="w-full h-3.5 rounded-full bg-chip flex items-center overflow-hidden">
              <div
                style={{ width: `${drivetrainEffPercent}%` }}
                className={`h-full rounded-full ${CHIP_TOKENS['yellow-vest'].dot}`}
              />
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight text-ink tnum">
                {drivetrainLossWatts}
              </span>
              <span className="text-xs font-medium text-ink-muted">{t('wattsLossUnit')}</span>
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-ink-muted mt-1">
              <p className="truncate">
                {t('chainFrictionLoss', { pct: lossPercent })}
              </p>
              <InfoTooltip
                title={t('drivetrainLossTooltipTitle')}
                content={t('drivetrainLossTooltipContent')}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. DUAL TELEMETRY TABLES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* System Mass */}
        <div className="p-4 rounded-pod bg-pod">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <span>{t('systemMassHeading')}</span>
              <InfoTooltip
                title={t('systemMassTooltipTitle')}
                content={t('systemMassTooltipContent')}
                size="sm"
              />
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card text-ink tnum">
              {t('totalKgBadge', { mass: totalSystemMass })}
            </span>
          </div>

          <div className="text-[13px]">
            <div className="flex items-center justify-between py-2">
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
            <div className="flex items-center justify-between py-2">
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
            <div className="flex items-center justify-between pt-2">
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
        <div className="p-4 rounded-pod bg-pod">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <span>{t('energySubstrateHeading')}</span>
              <InfoTooltip
                title={t('energySubstrateTooltipTitle')}
                content={t('energySubstrateTooltipContent')}
                size="sm"
              />
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card text-ink tnum">
              {t('grossEffBadge', { pct: gmePercent })}
            </span>
          </div>

          <div className="text-[13px]">
            <div className="flex items-center justify-between py-2">
              <span className="text-ink-secondary flex items-center gap-1.5">
                <span>{t('mechanicalWorkRow')}</span>
                <InfoTooltip
                  title={t('mechanicalWorkTooltipTitle')}
                  content={t('mechanicalWorkTooltipContent', { work: Math.round(physicsResult.totalWorkKj) })}
                  size="sm"
                />
              </span>
              <span className="font-semibold text-ink tnum">{Math.round(physicsResult.totalWorkKj)} kJ</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between py-2">
              <span className="text-ink-secondary flex items-center gap-1.5">
                <span>{t('metabolicBurnRow')}</span>
                <InfoTooltip
                  title={t('metabolicBurnTooltipTitle')}
                  content={t('metabolicBurnTooltipContent')}
                  size="sm"
                />
              </span>
              <span className="font-semibold text-ink tnum">{Math.round(physicsResult.totalKcalBurn)} kcal</span>
            </div>
            <div className="lane-divider" aria-hidden="true" />
            <div className="flex items-center justify-between pt-2">
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
    </Card>
  );
};
