import React, { useState, useEffect } from 'react';
import { Wind, ThermometerSimple, CloudRain, Warning, CheckCircle, NavigationArrow } from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { useTranslation } from '../../context/LanguageContext';
import { calculatePhysics } from '../../utils/physics';
import { degreesToCompassCardinal } from '../../services/weatherService';
import { Badge } from '../common/Badge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface WeatherWidgetProps {
  trip?: TripProfile;
  weather: WeatherCondition;
  onUpdateWeather?: (newWeather: WeatherCondition) => void;
  speedKmH: number;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  trip,
  weather,
  speedKmH,
}) => {
  const { lang, t } = useTranslation();

  const rhoNum = weather.airDensityRho ?? trip?.physics.rho ?? 1.225;
  const effectivePhysics = {
    riderWeightKg: trip?.physics.riderWeightKg ?? 74,
    bikeWeightKg: trip?.physics.bikeWeightKg ?? 9.4,
    gearWeightKg: trip?.physics.gearWeightKg ?? 4.0,
    cda: trip?.physics.cda ?? 0.4,
    crr: trip?.physics.crr ?? 0.006,
    rho: rhoNum,
    drivetrainEfficiency: trip?.physics.drivetrainEfficiency ?? 0.95,
    grossMechanicalEfficiency: trip?.physics.grossMechanicalEfficiency ?? 0.21,
    gradientPercent: trip?.physics.gradientPercent ?? 0,
  };
  const effectiveRoute = trip?.route ?? {
    distanceKm: 22,
    targetSpeedKmH: speedKmH,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 5,
  };

  const physicsResult = calculatePhysics(effectivePhysics, effectiveRoute, weather, lang);

  const effectiveWindSpeed = weather.isHeadwindActive ? weather.baseWindSpeedKmH : 0;
  const windDeg = Math.round(weather.windDirectionDegrees ?? 245);
  const windCardinal = degreesToCompassCardinal(windDeg, lang);
  const peakGust = weather.isHeadwindActive
    ? (weather.estuaryGustKmH || Math.round(weather.baseWindSpeedKmH * 1.5))
    : Math.min(8, weather.estuaryGustKmH || 5);
  const aeroDeltaWatts = Math.max(1, Math.round(physicsResult.powerDeltaWatts));

  const isHighWind = physicsResult.goStatus === 'NO-GO';
  const isCaution = physicsResult.goStatus === 'CAUTION';

  return (
    <div className="bg-card rounded-card p-4 mb-7 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full animate-beacon-pulse ${
                isHighWind
                  ? CHIP_TOKENS.rose.dot
                  : isCaution
                  ? CHIP_TOKENS.amber.dot
                  : CHIP_TOKENS.emerald.dot
              }`}
              title={`${physicsResult.goStatus}: ${physicsResult.goStatusReason}`}
            />
            <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
              {t('weatherCheckTitle')}
            </h2>
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {t('weatherCheckSubtitle')}
          </p>
        </div>

        {/* Full-Radius Status Callout */}
        <div className="flex items-center gap-2 flex-wrap">
          {isHighWind ? (
            <Badge variant="rose" size="lg" icon={Warning} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${physicsResult.goStatus} — ${physicsResult.goStatusReason}`}>
              {t('statusNoGoGale')}
            </Badge>
          ) : isCaution ? (
            <Badge variant="amber" size="lg" icon={Warning} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${physicsResult.goStatus} — ${physicsResult.goStatusReason}`}>
              {t('statusCautionHeadwind')}
            </Badge>
          ) : (
            <Badge variant="emerald" size="lg" icon={CheckCircle} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${physicsResult.goStatus} — ${physicsResult.goStatusReason}`}>
              {t('statusGoOptimal')}
            </Badge>
          )}
        </div>
      </div>

      {/* 4 Borderless Weather Gauge Pods */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="truncate">{t('estuaryVectorLabel')}</span>
            <NavigationArrow
              className={`w-4 h-4 shrink-0 transform transition-transform ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                weather.isHeadwindActive
                  ? `${CHIP_TOKENS.amber.primary} rotate-180`
                  : `${CHIP_TOKENS.emerald.primary} rotate-45`
              }`}
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink tnum">
              {effectiveWindSpeed}
            </span>
            <span className="text-xs font-medium text-ink-muted">km/h</span>
          </div>
          <p className="text-xs text-ink-secondary mt-1 tnum">
            {weather.isHeadwindActive && effectiveWindSpeed > 0
              ? t('opposingHeadwindSub', { deg: windDeg, dir: windCardinal })
              : t('negligibleDragSub', { deg: windDeg, dir: windCardinal })}
          </p>
        </div>

        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="truncate">{t('airTempDensityLabel')}</span>
            <ThermometerSimple className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink tnum">
              {weather.temperatureC}°C
            </span>
            <span className="text-xs font-medium text-ink-muted tnum">{rhoNum.toFixed(3)} kg/m³</span>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            {rhoNum >= 1.245
              ? t('coldDenseAirSub')
              : rhoNum <= 1.195
              ? t('warmLightAirSub')
              : t('standardMorningDensitySub')}
          </p>
        </div>

        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="truncate">{t('bridgeGustsLabel')}</span>
            <Wind className={`w-4 h-4 shrink-0 ${GREYSCALE_TOKENS.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink tnum">
              {peakGust}
            </span>
            <span className="text-xs font-medium text-ink-muted">{t('maxUnit')}</span>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            {peakGust >= 40
              ? t('lateralGustCautionSub')
              : peakGust >= 24
              ? t('lateralGustModerateSub')
              : t('lateralHandlingSafeSub')}
          </p>
        </div>

        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="truncate">{t('precipitationLabel')}</span>
            <CloudRain
              className={`w-4 h-4 shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                weather.precipitationRiskPercent >= 25
                  ? CHIP_TOKENS.blue.primary
                  : GREYSCALE_TOKENS.primary
              }`}
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink tnum">
              {weather.precipitationRiskPercent}%
            </span>
            <span className="text-xs font-medium text-ink-muted">{t('riskUnit')}</span>
          </div>
          <p className="text-xs text-ink-secondary mt-1 tnum">
            {weather.precipitationRiskPercent >= 40
              ? t('wetSurfaceCrrSub', { crr: effectivePhysics.crr })
              : t('nominalCrrSub', { crr: effectivePhysics.crr })}
          </p>
        </div>
      </div>

      {/* Full-Radius Telemetry Summary Capsule */}
      <div className="rounded-pod lg:rounded-full bg-pod px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-ink-secondary font-medium shrink-0">
            {lang === 'fr' ? 'Allure cible & aérodynamique :' : 'Cruising pace & aerodynamics:'}
          </span>
          <span className="px-3 py-1 rounded-full bg-card font-semibold text-ink tnum shrink-0 whitespace-nowrap">
            {speedKmH} km/h
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          {weather.isHeadwindActive && effectiveWindSpeed > 0 ? (
            <Badge variant="amber" size="md" className="tnum">
              {t('aeroDragFactoredPill', { watts: aeroDeltaWatts })}
            </Badge>
          ) : (
            <Badge variant="emerald" size="md">
              {t('baselineDragPill')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
