import React, { useState, useEffect } from 'react';
import { Wind, ThermometerSimple, CloudRain, Warning, CheckCircle, NavigationArrow } from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { useTranslation } from '../../context/LanguageContext';
import { calculatePhysics } from '../../utils/physics';
import { calculateTripWindInsight } from '../../utils/windInsights';
import { degreesToCompassCardinal } from '../../services/weatherService';
import { Badge } from '../common/Badge';
import { CadenceInsight } from '../common/CadenceInsight';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
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
  embedded?: boolean;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  trip,
  weather,
  speedKmH,
  embedded = false,
}) => {
  const { lang, t } = useTranslation();

  const rhoNum = weather.airDensityRho ?? trip?.physics.rho ?? 1.225;
  const isProView = loadRiderBikeSpecs().cockpitViewMode === 'pro';
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
  const isFr = lang === 'fr';

  const windInsight = calculateTripWindInsight({
    distanceKm: effectiveRoute.distanceKm || 30,
    targetSpeedKmH: speedKmH || 24,
    riderWeightKg: effectivePhysics.riderWeightKg,
    bikeWeightKg: effectivePhysics.bikeWeightKg,
    cda: effectivePhysics.cda,
    crr: effectivePhysics.crr,
    windSpeedKmH: effectiveWindSpeed,
    effectiveHeadwindKmH: weather.effectiveHeadwindKmH,
    isHeadwindActive: weather.isHeadwindActive,
    windDirection: weather.windDirection,
    windFromDegrees: weather.windDirectionDegrees,
    temperatureC: weather.temperatureC,
    lang: isFr ? 'fr' : 'en',
  });

  const companionInsight: {
    tone: 'cadence' | 'emerald' | 'amber' | 'rose' | 'sky';
    headline: string;
    detail: string;
  } = isHighWind
    ? {
        tone: 'rose',
        headline: isFr
          ? `Grosses rafales (${peakGust} km/h) — délicat sur les routes exposées.`
          : `Strong gusts (${peakGust} km/h) — tricky handling on open roads.`,
        detail: isFr
          ? 'Ça vaut le coup de choisir un parcours abrité ou d’attendre une accalmie.'
          : 'Worth picking a sheltered route or waiting for a calmer window.',
      }
    : effectiveWindSpeed >= 12 && windInsight.ghostElevationM >= 45
    ? {
        tone: 'amber',
        headline: isFr
          ? `Ce vent de face ajoute +${windInsight.ghostElevationM} m de montée invisible${windInsight.iconicClimbComparison ? ` (${windInsight.iconicClimbComparison})` : ''}.`
          : `This headwind adds +${windInsight.ghostElevationM} m of invisible climbing${windInsight.iconicClimbComparison ? ` (${windInsight.iconicClimbComparison})` : ''}.`,
        detail: isFr
          ? `Sensation de pente à +${windInsight.equivalentGradePct.toFixed(1)} % sur le plat — démarre souple au lieu de forcer.`
          : `Feels like a +${windInsight.equivalentGradePct.toFixed(1)}% climb on flat ground — spin easy early instead of fighting it.`,
      }
    : weather.precipitationRiskPercent >= 50
    ? {
        tone: 'sky',
        headline: isFr
          ? `Routes probablement humides (${weather.precipitationRiskPercent} %) — prends un coupe-pluie.`
          : `Wet tarmac likely (${weather.precipitationRiskPercent}%) — grab a light rain shell.`,
        detail: isFr
          ? 'Garde un peu plus de marge au freinage et dans les virages.'
          : 'Leave a touch more room for braking and smooth corners.',
      }
    : weather.temperatureC <= 6
    ? {
        tone: 'sky',
        headline: isFr
          ? `Air vif (${weather.temperatureC} °C) — des gants et un coupe-vent sauveront le début.`
          : `Crisp ${weather.temperatureC}°C air — warm gloves and a wind shell save the first 15 min.`,
        detail: isFr
          ? 'Une fois réchauffé, les conditions restent sèches et agréables.'
          : 'Once your legs warm up, conditions stay dry and clean.',
      }
    : weather.windDirection === 'tailwind' && (weather.baseWindSpeedKmH ?? 0) >= 12
    ? {
        tone: 'emerald',
        headline: isFr
          ? `Joli vent de dos (${weather.baseWindSpeedKmH} km/h) — profite de la vitesse gratuite.`
          : `Friendly ${weather.baseWindSpeedKmH} km/h tailwind — enjoy the free speed today.`,
        detail: isFr
          ? 'Conditions portantes et fluides sur la majorité du parcours.'
          : 'Smooth, supportive riding conditions across the route.',
      }
    : {
        tone: 'cadence',
        headline: isFr
          ? 'Air calme et bitume sec — une belle excuse pour rallonger un peu.'
          : 'Calm air and dry roads — easy excuse to take the long way.',
        detail: isFr
          ? `Seulement ${effectiveWindSpeed} km/h de vent et ${weather.temperatureC} °C : rien ne te freine aujourd’hui.`
          : `Just ${effectiveWindSpeed} km/h of breeze at ${weather.temperatureC}°C — nothing fighting your legs today.`,
      };

  return (
    <div
      className={
        embedded
          ? 'p-1 transition-colors'
          : 'bg-card rounded-card p-4 sm:p-5 shadow-xs border border-ink/5 dark:border-white/5 transition-colors'
      }
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full animate-beacon-pulse shrink-0 ${
                isHighWind
                  ? CHIP_TOKENS.rose.dot
                  : isCaution
                  ? CHIP_TOKENS.amber.dot
                  : CHIP_TOKENS.emerald.dot
              }`}
              title={`${isHighWind ? t('feasibilitySevere') : isCaution ? t('feasibilityCaution') : t('feasibilityOptimal')}: ${physicsResult.goStatusReason}`}
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
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isHighWind ? (
            <Badge variant="rose" size="lg" icon={Warning} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${t('feasibilitySevere')} — ${physicsResult.goStatusReason}`}>
              {t('statusNoGoGale')}
            </Badge>
          ) : isCaution ? (
            <Badge variant="amber" size="lg" icon={Warning} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${t('feasibilityCaution')} — ${physicsResult.goStatusReason}`}>
              {t('statusCautionHeadwind')}
            </Badge>
          ) : (
            <Badge variant="emerald" size="lg" icon={CheckCircle} className="py-2 px-3.5 text-xs" title={`${t('rideFeasibility')}: ${t('feasibilityOptimal')} — ${physicsResult.goStatusReason}`}>
              {t('statusGoOptimal')}
            </Badge>
          )}
        </div>
      </div>

      {/* Cadence Intelligence Hero Verdict — single crisp line */}
      <CadenceInsight
        tone={companionInsight.tone}
        headline={companionInsight.headline}
        compact
        className="mb-3.5"
      />

      {/* 4 Borderless Weather Gauge Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-start justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="break-words leading-snug">{t('estuaryVectorLabel')}</span>
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
          <div className="flex items-start justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="break-words leading-snug">
              {isProView ? t('airTempDensityLabel') : isFr ? 'Température' : 'Temperature'}
            </span>
            <ThermometerSimple
              className={`w-4 h-4 shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                weather.temperatureC >= 25
                  ? CHIP_TOKENS.rose.primary
                  : weather.temperatureC <= 8
                  ? CHIP_TOKENS.sky.primary
                  : CHIP_TOKENS.amber.primary
              }`}
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink tnum">
              {weather.temperatureC}°C
            </span>
            {isProView && (
              <span className="text-xs font-medium text-ink-muted tnum">{rhoNum.toFixed(3)} kg/m³</span>
            )}
          </div>
          {isProView && (
            <p className="text-xs text-ink-secondary mt-1">
              {rhoNum >= 1.245
                ? t('coldDenseAirSub')
                : rhoNum <= 1.195
                ? t('warmLightAirSub')
                : t('standardMorningDensitySub')}
            </p>
          )}
        </div>

        <div className="bg-pod rounded-pod p-3.5 sm:p-4 min-w-0">
          <div className="flex items-start justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="break-words leading-snug">{t('bridgeGustsLabel')}</span>
            <Wind
              className={`w-4 h-4 shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                peakGust >= 40
                  ? CHIP_TOKENS.rose.primary
                  : peakGust >= 24
                  ? CHIP_TOKENS.amber.primary
                  : CHIP_TOKENS.teal.primary
              }`}
            />
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
          <div className="flex items-start justify-between gap-1.5 text-xs font-medium text-ink-muted">
            <span className="break-words leading-snug">{t('precipitationLabel')}</span>
            <CloudRain
              className={`w-4 h-4 shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                weather.precipitationRiskPercent >= 25
                  ? CHIP_TOKENS.blue.primary
                  : CHIP_TOKENS.sky.primary
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
            {isProView
              ? weather.precipitationRiskPercent >= 40
                ? t('wetSurfaceCrrSub', { crr: effectivePhysics.crr })
                : t('nominalCrrSub', { crr: effectivePhysics.crr })
              : weather.precipitationRiskPercent >= 40
              ? (lang === 'fr' ? 'Chaussée possiblement humide · prudence dans les virages' : 'Possible wet roads · take extra braking margin')
              : (lang === 'fr' ? 'Chaussée sèche attendue' : 'Dry road conditions expected')}
          </p>
        </div>
      </div>

      {/* Pro Aero Summary Capsule (Pro View only — Companion Insight now leads above) */}
      {isProView && (
        <div className="rounded-pod lg:rounded-full bg-pod px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-ink-secondary font-medium shrink-0">
              {isFr ? 'Allure cible & aéro :' : 'Target pace & aero:'}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-card font-semibold text-ink tnum shrink-0 whitespace-nowrap leading-none">
              {speedKmH} km/h
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
      )}
    </div>
  );
};
