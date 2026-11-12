import React from 'react';
import { Check, AlertCircle } from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { RouteWaypoint } from '../../types/trip';
import { SchematicRouteMap } from './SchematicRouteMap';

interface Screen6RideReadyProps {
  origin: string;
  destination: string;
  distanceKm: number;
  coordinates?: [number, number][];
  waypoints?: RouteWaypoint[];
  ridingMinutes: number;
  speedKmH: number;
  rideDateFormatted: string;
  leaveTimeFormatted: string;
  arriveTimeFormatted: string;
  readyTimeFormatted: string;
  parkingBufferMin: number;
  targetMode: 'arrive' | 'depart';
  isWeatherFetched?: boolean;
  weatherSummary?: string;
  purpose?: string;
  selectedBikeName?: string;
  onEditRoute: () => void;
  onEditTiming: () => void;
  onEditSetup: () => void;
}

export const Screen6RideReady: React.FC<Screen6RideReadyProps> = ({
  origin,
  destination,
  distanceKm,
  coordinates,
  waypoints,
  ridingMinutes,
  speedKmH,
  rideDateFormatted,
  leaveTimeFormatted,
  arriveTimeFormatted,
  readyTimeFormatted,
  parkingBufferMin,
  targetMode,
  isWeatherFetched = false,
  weatherSummary,
  purpose,
  selectedBikeName,
  onEditRoute,
  onEditTiming,
  onEditSetup,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  const originShort = origin.split(',')[0].trim() || 'Trentemoult';
  const destShort = destination.split(',')[0].trim() || 'Nantes gare';

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* Top Narrative Banner */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
          <span>{isFr ? 'Étape 4 sur 4 · Aperçu de sortie' : 'Step 4 of 4 · Ride preview'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-2">
          {isFr ? 'Votre première sortie est prête.' : 'Your first ride is ready.'}
        </h2>

        <p className="text-sm text-ink-secondary font-body">
          {isFr
            ? `Un plan clair pour votre sortie ${purpose ? purpose.toLowerCase() : ''}. Vérifiez les estimations, modifiez un point ou continuez sans créer de compte.`
            : `A clear plan for your ${purpose ? purpose.toLowerCase() : 'ride'}. Review the estimates, make a change, or keep going without an account.`}
        </p>
      </div>

      {/* 2-Column Responsive Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Left Column: Route Preview & 3 Big KPIs */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Route Header with Edit Link */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-rounded font-bold text-ink">
                {originShort} → {destShort}
              </span>
              {waypoints && waypoints.length > 0 && (
                <span className="text-xs text-ink-muted font-body mt-0.5">
                  via {waypoints.map((w) => w.name.split(',')[0]).filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onEditRoute}
              className="text-xs font-rounded font-bold text-ink underline hover:text-ink-secondary cursor-pointer"
            >
              {isFr ? 'Modifier le parcours' : 'Edit route'}
            </button>
          </div>

          {/* Route Map Preview */}
          <SchematicRouteMap
            originLabel={originShort}
            destinationLabel={destShort}
            distanceKm={distanceKm}
            estimatedMinutes={ridingMinutes}
            coordinates={coordinates}
            waypoints={waypoints}
          />

          {/* 3 Metric Pods */}
          <div className="grid grid-cols-3 gap-3">
            {/* Metric 1 */}
            <div className="p-3.5 sm:p-4 rounded-pod bg-card border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-ink-muted truncate">
                {isFr ? 'Itinéraire' : 'Example route'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-rounded text-ink tnum mt-1">
                {distanceKm.toFixed(1)} <span className="text-xs font-medium text-ink-muted">km</span>
              </span>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 sm:p-4 rounded-pod bg-card border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-ink-muted truncate">
                {isFr ? 'Pédalage est.' : 'Est. riding time'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-rounded text-ink tnum mt-1">
                {ridingMinutes} <span className="text-xs font-medium text-ink-muted">min</span>
              </span>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 sm:p-4 rounded-pod bg-card border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-ink-muted truncate">
                {isFr ? 'Allure choisie' : 'Selected pace'}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-rounded text-ink tnum mt-1">
                {speedKmH} <span className="text-xs font-medium text-ink-muted">km/h</span>
              </span>
            </div>
          </div>

          <p className="text-[11.5px] text-ink-muted font-body leading-relaxed pt-1">
            {isFr
              ? 'Itinéraire et estimations illustratives, sans guidage pas-à-pas direct. Vérifiez votre route avant de rouler.'
              : 'Illustrative route and estimates, not turn-by-turn navigation. Check your route before riding.'}
          </p>
        </div>

        {/* Right Column: Schedule Timeline & Readiness Review */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Schedule Timeline Bento Card */}
          <div className="bento-card bg-card text-ink rounded-card p-5 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-rounded font-bold text-ink">
                {rideDateFormatted} {isFr ? '· estimation' : '· estimated'}
              </span>
              <button
                type="button"
                onClick={onEditTiming}
                className="text-xs font-rounded font-bold text-ink underline hover:text-ink-secondary cursor-pointer"
              >
                {isFr ? 'Modifier l’horaire' : 'Edit timing'}
              </button>
            </div>

            {/* Timeline Steps */}
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-ink before:via-ink/40 before:to-ink/10 dark:before:from-white dark:before:via-white/40 dark:before:to-white/10">
              {/* Step 1: Leave */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-card ring-2 ring-ink dark:ring-white" />
                <div className="text-lg sm:text-xl font-rounded font-extrabold text-ink tnum leading-tight">
                  {leaveTimeFormatted}
                </div>
                <div className="text-xs font-medium text-ink-secondary">
                  {isFr ? `Départ de ${originShort}` : `Leave ${originShort}`}
                </div>
                <div className="text-[11px] text-ink-muted font-body">
                  {isFr
                    ? `${ridingMinutes} min de pédalage à ${speedKmH} km/h`
                    : `${ridingMinutes} min riding at ${speedKmH} km/h`}
                </div>
              </div>

              {/* Step 2: Arrive */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-card ring-2 ring-ink dark:ring-white" />
                <div className="text-lg sm:text-xl font-rounded font-extrabold text-ink tnum leading-tight">
                  {arriveTimeFormatted}
                </div>
                <div className="text-xs font-medium text-ink-secondary">
                  {isFr ? `Arrivée à ${destShort}` : `Arrive at ${destShort}`}
                </div>
                <div className="text-[11px] text-ink-muted font-body">
                  {isFr
                    ? `${parkingBufferMin} min pour garer le vélo & se changer`
                    : `${parkingBufferMin} min to park & get ready`}
                </div>
              </div>

              {/* Step 3: Target Ready */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-ink dark:bg-white" />
                <div className="text-lg sm:text-xl font-rounded font-extrabold text-ink tnum leading-tight">
                  {readyTimeFormatted}
                </div>
                <div className="text-xs font-medium text-ink-secondary">
                  {isFr ? 'Prêt pour votre journée' : 'Ready for your day'}
                </div>
                <div className="text-[11px] text-ink-muted font-body">
                  {targetMode === 'arrive'
                    ? isFr ? 'Votre objectif d’arrivée' : 'Your arrive-by target'
                    : isFr ? 'Arrivée finale avec marge' : 'Target arrival with buffer'}
                </div>
              </div>
            </div>
          </div>

          {/* Review Status Box */}
          <div className="p-4 rounded-pod bg-pod border border-black/5 dark:border-white/10 space-y-2.5 text-xs">
            <span className="font-rounded font-bold text-ink block">
              {isFr ? 'Prêt pour la revue' : 'Ready to review'}
            </span>

            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">
                {isFr ? 'Parcours & horaires' : 'Route & timing'}
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <Check size={13} className="stroke-[3]" />
                <span>{isFr ? 'Défini' : 'Set'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">
                {isFr ? 'Cycliste & vélo' : 'Rider & bike'}
              </span>
              <button
                type="button"
                onClick={onEditSetup}
                className="font-medium text-ink underline hover:text-ink-secondary cursor-pointer"
              >
                {selectedBikeName
                  ? `${selectedBikeName} · ${isFr ? 'Modifier' : 'Edit setup'}`
                  : (isFr ? 'Défauts · Modifier' : 'Defaults · Edit setup')}
              </button>
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/10">
              {isWeatherFetched ? (
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium text-[11.5px] mb-0.5">
                    <Check size={13} className="stroke-[3] text-emerald-600" />
                    <span>
                      {isFr
                        ? `Météo en direct · ${weatherSummary || 'Prévision appliquée'}`
                        : `Live weather · ${weatherSummary || 'Forecast applied'}`}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-ink-muted leading-relaxed font-body">
                    {isFr
                      ? 'Conditions météorologiques réelles appliquées à votre plan de route.'
                      : 'Live weather conditions factored into your ride plan.'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium text-[11.5px] mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>
                      {isFr
                        ? 'Météo non chargée · vérifiez avant de partir'
                        : 'Weather not fetched · check before you go'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-ink-muted leading-relaxed font-body">
                    {isFr
                      ? 'Le timing exclut les arrêts, le trafic et la météo réelle. Aucune condition en direct n’a été chargée.'
                      : 'Timing excludes stops, traffic delays and weather. No live conditions have been checked.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
