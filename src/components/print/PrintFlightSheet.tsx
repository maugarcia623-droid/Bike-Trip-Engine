import React from 'react';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs, getActiveBike } from '../../utils/specsStorage';
import { calculatePhysics } from '../../utils/physics';
import { calculateReverseTimeline, solveTripTimeline } from '../../utils/timeline';
import { getChipsExtraBufferMinutes, getArchetypeFromTag } from '../../utils/archetypeChips';
import { getRealFoodNutritionPlan, addMinutesToTime } from '../../utils/nutrition';
import { resolveCompliantPantry } from '../../data/pantryCatalog';
import { getExpeditionTotals } from '../../utils/stageManager';
import { calculateAmenityEta } from '../../services/overpassCorridor';
import {
  useTranslation,
  getLocalizedTripMeta,
  getChecklistItemLabel,
  getChecklistCategoryLabel,
} from '../../context/LanguageContext';

interface PrintFlightSheetProps {
  trip: TripProfile;
  riderSpecs?: RiderBikeSpecs;
}

export const PrintFlightSheet: React.FC<PrintFlightSheetProps> = ({ trip, riderSpecs: riderSpecsProp }) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const locale = isFr ? 'fr-FR' : 'en-US';
  const effectiveSpecs = riderSpecsProp || loadRiderBikeSpecs();
  const activeBike = getActiveBike(effectiveSpecs);
  const meta = getLocalizedTripMeta(trip, lang);
  const arch = getArchetypeFromTag(trip.tag, trip.name);
  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const expeditionTotals = getExpeditionTotals(trip);

  const physicsResult = calculatePhysics(
    trip.physics,
    trip.route,
    trip.weather,
    lang,
    effectiveSpecs.ftpWatts
  );
  const extraBufferMinutes = getChipsExtraBufferMinutes(trip);
  const timelineResult = calculateReverseTimeline(
    trip.route,
    trip.office,
    trip.weather,
    trip.tag,
    trip.route?.destination,
    lang,
    extraBufferMinutes,
    trip.customChips || [],
    {
      effectiveSpeedKmH: physicsResult.effectiveSpeedKmH,
      calmSpeedKmH: physicsResult.calmSpeedKmH,
      arriveAtMode: trip.arriveAtMode,
      departureTime: trip.departureTime,
      movingTimeSeconds: physicsResult.movingTimeSeconds,
      logistics: trip.ruleSettings,
      pinnedAmenities: trip.pinnedAmenities,
    }
  );
  const solvedTimeline = solveTripTimeline(
    physicsResult.movingTimeSeconds,
    trip.customChips || [],
    trip.ruleSettings
  );
  const breakRoomTime = addMinutesToTime(
    timelineResult.gateArrivalTime,
    (trip.office.lockerRefuelMinutes ?? 10) + (trip.office.showerChangeMinutes ?? 10)
  );
  const nutritionPhases = getRealFoodNutritionPlan(
    solvedTimeline.arrivalTimeHHMM,
    solvedTimeline.postRideMealWindow?.split(' – ')[0] ?? breakRoomTime,
    solvedTimeline.departureTimeHHMM,
    lang,
    {
      carbTargetGPerHr: effectiveSpecs.carbTargetGPerHr,
      rideHours: Math.max(0.6, physicsResult.movingTimeSeconds / 3600),
      nutritionPreference: effectiveSpecs.nutritionPreference,
      pctFtp: physicsResult.ftpPercent,
      carbOxidationGramPerHour: physicsResult.carbOxidationGramPerHour,
      totalDays: expeditionTotals?.totalDays || (trip.stages?.length || 1),
      activeChips: trip.customChips || [],
      compliantPantry: resolveCompliantPantry(effectiveSpecs, {
        hasDestinationFridge: trip.ruleSettings?.hasDestinationFridge,
      }),
      logistics: trip.ruleSettings,
      solvedTimeline,
    }
  );

  return (
    <div className="print-only p-8 text-black bg-white max-w-[210mm] mx-auto font-sans leading-tight tnum">
      {/* Top Clean Editorial Print Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <div className="text-[10px] tracking-widest uppercase font-bold text-gray-600">
            {t('printHeaderTagline')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            {meta.name || t('defaultTripName')}
          </h1>
          <div className="text-xs text-gray-700 mt-1">
            {t('printClassification')} <strong>{trip.tag}</strong> &middot; {t('printDestination')}{' '}
            <strong>{meta.gateName}</strong> &middot;{' '}
            {t(
              ({
                COMMUTE: 'printShiftLock',
                ESCAPADE: 'printCutoffEscapade',
                BIKEPACKING: 'printCutoffBikepacking',
                SPORT: 'printCutoffSport',
              } as const)[arch]
            )}{' '}
            <strong>{timelineResult.shiftStartTime}</strong>
          </div>
        </div>

        <div className="text-right">
          <div className="border-2 border-black rounded-full px-4 py-1 text-center font-bold text-xs inline-block">
            {t('printDecision', {
              status:
                physicsResult.goStatus === 'GO'
                  ? t('feasibilityOptimal')
                  : physicsResult.goStatus === 'CAUTION'
                  ? t('feasibilityCaution')
                  : t('feasibilitySevere'),
            })}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {t('printGenerated')} {new Date().toLocaleDateString(locale)} {new Date().toLocaleTimeString(locale)}
          </div>
        </div>
      </div>

      {/* Multi-Day Tour Itinerary Table */}
      {hasMultipleStages && trip.stages && (
        <div className="mb-5">
          <div className="flex justify-between items-baseline border-b border-gray-400 pb-1 mb-1.5">
            <h2 className="text-xs font-bold tracking-tight">
              {isFr ? 'Itinéraire du séjour (étapes)' : 'Multi-day itinerary'}
            </h2>
            <span className="text-[11px] text-gray-600 tnum">
              {expeditionTotals.totalDays} {isFr ? 'étapes' : 'stages'} &middot; {expeditionTotals.totalDistanceKm} km &middot; +{expeditionTotals.totalElevationM} m
            </span>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-300 tnum">
            <thead>
              <tr className="bg-gray-100 text-[10px] text-gray-700 font-bold border-b border-gray-300">
                <th className="border border-gray-300 px-2 py-1 text-left w-14">{isFr ? 'Étape' : 'Stage'}</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-24">{isFr ? 'Date' : 'Date'}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{isFr ? 'Itinéraire' : 'Route'}</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-36">{isFr ? 'Distance / Déniv.' : 'Distance / Elev'}</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-20">{isFr ? 'Allure' : 'Target pace'}</th>
                <th className="border border-gray-300 px-2 py-1 text-left w-36">{isFr ? 'Arrivée souhaitée' : 'Target cutoff'}</th>
              </tr>
            </thead>
            <tbody>
              {trip.stages.map((stage, idx) => {
                const isActive = idx === (trip.activeStageIndex || 0);
                const stageLabel = isFr ? `J${stage.dayNumber}` : `Day ${stage.dayNumber}`;
                const origin = stage.route.origin || '...';
                const dest = stage.route.destination || '...';
                const distanceKm = stage.route.distanceKm;
                const elevM = stage.route.elevationGainM ?? 0;
                const pace = stage.route.targetSpeedKmH || trip.route.targetSpeedKmH || 25;
                const cutoff = stage.office?.targetGateArrivalTime || '17:30';

                return (
                  <tr
                    key={stage.id || `stage-${idx}`}
                    className={`border-b border-gray-200 ${isActive ? 'bg-gray-50 font-bold' : ''}`}
                  >
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">
                      {stageLabel} {isActive && <span className="text-[9px] text-gray-500 font-normal">(*)</span>}
                    </td>
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">{stage.departureDate}</td>
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">{origin} &rarr; {dest}</td>
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">{distanceKm} km (+{elevM} m)</td>
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">{pace} km/h</td>
                    <td className="border border-gray-200 px-2 py-1 text-[10px]">{cutoff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[9px] text-gray-500 mt-1">
            {isFr
              ? '(*) Étape active détaillée ci-dessous (horaires et check-list).'
              : '(*) Active stage detailed below in the schedule and checklist.'}
          </div>
        </div>
      )}

      {/* Effort & Weather Overview */}
      <div className="mb-6">
        <h2 className="text-xs font-bold border-b border-gray-400 pb-1 mb-2">
          {t('printSection1')}
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs border border-gray-300 p-2.5 rounded">
          <div>
            <div className="text-gray-500 text-[10px]">{t('printSystemMass')}</div>
            <div className="font-bold text-sm">{physicsResult.systemMassKg} kg</div>
            <div className="text-[9px] text-gray-500">
              {t('printSystemMassBreak', {
                rider: trip.physics.riderWeightKg,
                bike: trip.physics.bikeWeightKg,
                gear: trip.physics.gearWeightKg,
              })}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">{t('printTargetPower')}</div>
            <div className="font-bold text-sm">
              {Math.round(physicsResult.legWatts)} W ({physicsResult.powerZone} &middot; {physicsResult.ftpPercent}% FTP)
            </div>
            <div className="text-[9px] text-gray-500">
              {t('printWheelPower', {
                speed: physicsResult.effectiveSpeedKmH,
                wheel: Math.round(physicsResult.wheelWatts),
              })}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">{t('printAeroRolling')}</div>
            <div className="font-bold text-sm">CdA {trip.physics.cda} / Crr {trip.physics.crr}</div>
            <div className="text-[9px] text-gray-500">
              {t('printRhoEff', {
                rho: (trip.weather.airDensityRho ?? trip.physics.rho ?? 1.225).toFixed(3),
                eff: Math.round((trip.physics.drivetrainEfficiency ?? 0.95) * 100),
              })}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[10px]">{t('printMetabolicWork')}</div>
            <div className="font-bold text-sm">
              {effectiveSpecs.telemetryMode === 'quantitative'
                ? `${Math.round(physicsResult.totalWorkKj)} kJ / ${Math.round(physicsResult.totalKcalBurn)} kcal`
                : effectiveSpecs.telemetryMode === 'fuel-first'
                ? `${Math.round(physicsResult.totalWorkKj)} kJ / ~${Math.max(1, Math.round(physicsResult.carbOxidationGramPerHour / 20))} ${isFr ? 'unités/h' : 'units/h'}`
                : `${Math.round(physicsResult.totalWorkKj)} kJ / ${isFr ? 'Rythme régulier' : 'Steady rhythm'}`}
            </div>
            <div className="text-[9px] text-gray-500">
              {effectiveSpecs.telemetryMode === 'quantitative'
                ? t('printCarbOx', { carbs: physicsResult.carbOxidationGramPerHour })
                : effectiveSpecs.telemetryMode === 'fuel-first'
                ? `${Math.max(1, Math.round(physicsResult.carbOxidationGramPerHour / 20))} ${isFr ? 'unités ravito / h' : 'fuel units / hr'}`
                : isFr
                ? 'Hydratation régulière'
                : 'Steady hydration'}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-gray-600 bg-gray-100 p-1.5 rounded flex justify-between items-center">
          <span>
            {lang === 'fr' ? 'Conditions météo :' : 'Weather conditions:'} {trip.weather.temperatureC}&deg;C &middot;{' '}
            {lang === 'fr' ? 'Vent' : 'Wind'} {trip.weather.baseWindSpeedKmH} km/h &middot;{' '}
            {lang === 'fr' ? 'Visibilité' : 'Visibility'} {trip.weather.visibilityKm ?? 15} km
          </span>
          <span className="font-bold text-black">
            {lang === 'fr' ? 'Éclairage conseillé :' : 'Lighting note:'}{' '}
            {(trip.weather.visibilityKm ?? 15) < 5 || trip.weather.isDay === false
              ? (lang === 'fr' ? 'Feu 800–1000 lm et gilet haute visibilité' : '800–1000 lm beam & reflective vest')
              : (lang === 'fr' ? 'Feu de jour conseillé' : 'Daytime safety light')}
          </span>
        </div>
      </div>

      {/* Step-by-Step Schedule Table */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline border-b border-gray-400 pb-1 mb-2">
          <h2 className="text-xs font-bold">
            {t(
              ({
                COMMUTE: 'printSection2',
                ESCAPADE: 'printSection2Escapade',
                BIKEPACKING: 'printSection2Bikepacking',
                SPORT: 'printSection2Sport',
              } as const)[arch]
            )}
          </h2>
          {(arch !== 'COMMUTE' || trip.office.strictNoFoodInOpenSpace) && (
            <span className="text-[10px] font-bold text-red-700">
              {arch === 'COMMUTE' ? t('printZeroFoodMandate') : t('printTouringRecoveryNote')}
            </span>
          )}
        </div>

        <table className="w-full text-xs border-collapse tnum">
          <thead>
            <tr className="border-b border-gray-300 text-left text-[10px] text-gray-500">
              <th className="py-1 w-16">{t('printColTime')}</th>
              <th className="py-1 w-44">{t('printColCheckpoint')}</th>
              <th className="py-1 w-32">{t('printColLocation')}</th>
              <th className="py-1">{t('printColDirective')}</th>
              <th className="py-1 w-12 text-center">{t('printColCheck')}</th>
            </tr>
          </thead>
          <tbody>
            {timelineResult.steps.map((step) => (
              <tr key={step.id} className="border-b border-gray-200">
                <td className="py-1 font-bold">{step.time}</td>
                <td className="py-1 font-semibold">{step.title}</td>
                <td className="py-1 text-gray-600">{step.location}</td>
                <td className="py-1 text-gray-700 text-[11px]">{step.description}</td>
                <td className="py-1 text-center">
                  <span className="inline-block w-4 h-4 border border-black" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Saved Route Resupply Stops */}
        {trip.pinnedAmenities && trip.pinnedAmenities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-gray-300">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[11px] font-bold text-gray-800">
                {t('printResupplySection')}
              </span>
              <span className="text-[9px] text-gray-500">
                {trip.pinnedAmenities.length}{' '}
                {trip.pinnedAmenities.length === 1
                  ? isFr ? 'arrêt enregistré' : 'saved stop'
                  : isFr ? 'arrêts enregistrés' : 'saved stops'}
              </span>
            </div>
            <table className="w-full text-xs border-collapse border border-gray-300 tnum">
              <thead>
                <tr className="bg-gray-100 text-[10px] text-gray-700 font-bold border-b border-gray-300">
                  <th className="border border-gray-300 px-2 py-1 text-left w-14">{t('printColKm')}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left w-16">{t('printColEta')}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t('printColStop')}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left w-28">{t('printColDetour')}</th>
                  <th className="border border-gray-300 px-2 py-1 text-center w-12">{t('printColVerified')}</th>
                </tr>
              </thead>
              <tbody>
                {trip.pinnedAmenities.map((amenity) => {
                  const eta = calculateAmenityEta(
                    timelineResult.hardDepartureTime,
                    amenity.routeKm,
                    physicsResult.effectiveSpeedKmH
                  );
                  const catLabel =
                    amenity.category === 'water'
                      ? (isFr ? "Point d'eau" : 'Water')
                      : amenity.category === 'cemetery'
                      ? (isFr ? 'Cimetière' : 'Cemetery')
                      : amenity.category === 'food'
                      ? (isFr ? 'Alimentation' : 'Food')
                      : (isFr ? 'Atelier vélo' : 'Bike shop');

                  return (
                    <tr key={amenity.id} className="border-b border-gray-200">
                      <td className="border border-gray-200 px-2 py-1 font-bold text-[10px]">{amenity.routeKm} km</td>
                      <td className="border border-gray-200 px-2 py-1 text-[10px] font-semibold">{eta}</td>
                      <td className="border border-gray-200 px-2 py-1 text-[10px]">
                        <strong>{catLabel} :</strong> {amenity.name}
                        {amenity.openingHours && <span className="text-gray-500 text-[9px] ml-1">({amenity.openingHours})</span>}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-[10px] text-gray-600">
                        {amenity.detourMeters < 75 ? (isFr ? 'Sur l’itinéraire' : 'On route') : `+${amenity.detourMeters} m`}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-center">
                        <span className="inline-block w-3.5 h-3.5 border border-black" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Food & Hydration Plan */}
      <div className="mb-6">
        <h2 className="text-xs font-bold border-b border-gray-400 pb-1 mb-2">
          {t(
            ({
              COMMUTE: 'printSection3',
              ESCAPADE: 'printSection3Escapade',
              BIKEPACKING: 'printSection3Bikepacking',
              SPORT: 'printSection3Sport',
            } as const)[arch]
          )}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs tnum">
          {nutritionPhases.map((phase) => (
            <div key={phase.phaseId} className="border border-gray-300 p-2 rounded">
              <div className="flex justify-between font-bold text-[11px] border-b border-gray-200 pb-0.5 mb-1">
                <span>{phase.title}</span>
                <span className="text-gray-600">{phase.timeWindow.split('–')[0]}</span>
              </div>
              <div className="text-[10px] text-gray-600 mb-1">{phase.location}</div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-gray-800">
                {phase.items.map((item, i) => (
                  <li key={i}>
                    {effectiveSpecs.telemetryMode === 'quantitative' ? (
                      <>
                        <strong>{item.quantitativeLabel || item.name}</strong> ({item.quantity}) &mdash; {item.carbsGrams} g C, {item.proteinGrams} g P
                      </>
                    ) : (
                      <>
                        <strong>{item.portionLabel || item.name}</strong> ({item.quantity})
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Table & Footer Note */}
      <div>
        <h2 className="text-xs font-bold border-b border-gray-400 pb-1 mb-2">
          {t('printSection4')}
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] mb-4 tnum">
          {(trip.checklist || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-0.5">
              <span className={item.checked ? 'font-bold' : ''}>
                [{item.checked ? 'X' : ' '}]{' '}
                {getChecklistItemLabel(item, trip.route?.distanceKm, lang, {
                  isTubeless: activeBike?.isTubeless,
                  carbTargetGPerHr: effectiveSpecs.carbTargetGPerHr,
                  nutritionPreference: effectiveSpecs.nutritionPreference,
                })}
              </span>
              <span className="text-gray-500 text-[10px]">
                {getChecklistCategoryLabel(item.category, lang)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary Line */}
        <div className="pt-4 border-t border-black flex justify-between items-end text-xs">
          <div>
            <div>{t('printAuthorization')}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">{t('printAllVerified')}</div>
          </div>
          <div className="text-right">
            <div>
              {t(
                ({
                  COMMUTE: 'printClearanceId',
                  ESCAPADE: 'printClearanceEscapade',
                  BIKEPACKING: 'printClearanceBikepacking',
                  SPORT: 'printClearanceSport',
                } as const)[arch]
              )}{' '}
              <strong>
                {arch === 'COMMUTE'
                  ? 'CADENCE-COMMUTE'
                  : t(
                      ({
                        ESCAPADE: 'printClearanceCodeEscapade',
                        BIKEPACKING: 'printClearanceCodeBikepacking',
                        SPORT: 'printClearanceCodeSport',
                      } as const)[arch]
                    )}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
