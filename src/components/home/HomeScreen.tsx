import React from 'react';
import { Plus, ArrowCounterClockwise, ShieldCheck, Sparkle } from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { TripCard } from './TripCard';
import { WeatherWidget } from './WeatherWidget';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Cloud } from 'lucide-react';

interface HomeScreenProps {
  trips: TripProfile[];
  activeTrip?: TripProfile | null;
  onSelectTrip: (id: string) => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripProfile) => void;
  onDuplicateTrip: (trip: TripProfile) => void;
  onDeleteTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
  onResetDefaults: () => void;
  onOpenOnboarding?: () => void;
  onLoadDemoTrip?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onCreateNewTrip,
  onEditTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onLaunchDashboard,
  onUpdateWeather,
  onResetDefaults,
  onOpenOnboarding,
  onLoadDemoTrip,
}) => {
  const { lang, t } = useTranslation();
  const { user, openAuthModal, lastSyncedAt } = useAuth();
  const syncedDisplayTime = (lastSyncedAt || new Date()).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 animate-fade-in">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight leading-tight">
              {t('homeTitle')}
            </h1>
            <Badge variant="yellow-vest" size="md" className="py-1 px-3 tnum">
              {t('homeProfilesCount', { count: trips.length })}
            </Badge>
          </div>
          <p className="text-ink-muted text-[13px] mt-1 max-w-2xl leading-relaxed">
            {t('homeSubtitle')}
          </p>
        </div>

        {/* Full-Radius Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className={`flex items-center gap-2 h-10 px-4 text-[13px] font-semibold rounded-full transition-all cursor-pointer ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} hover:brightness-[0.98] dark:hover:brightness-110 ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
            >
              <Sparkle className="w-4 h-4 text-current shrink-0" />
              <span>{t('calibrationWizardBtn')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetDefaults}
            title={t('resetDefaultsTitle')}
            className={`flex items-center gap-2 h-10 px-4 text-[13px] font-medium bg-card hover:bg-pod rounded-full transition-all cursor-pointer ${GREYSCALE_TOKENS.primary} hover:text-ink ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <ArrowCounterClockwise className="w-4 h-4 text-current" />
            <span>{t('resetDefaultsBtn')}</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewTrip}
            className={`flex items-center gap-1.5 h-10 px-5 bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] font-medium text-[13px] rounded-full transition-all cursor-pointer ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <Plus className="w-4 h-4 text-current stroke-[2.2]" />
            <span>{t('createNewTripBtn')}</span>
          </button>
        </div>
      </div>

      {/* Quick Weather Check Widget (Only when activeTrip exists) */}
      {activeTrip && (
        <WeatherWidget
          trip={activeTrip}
          weather={activeTrip.weather}
          onUpdateWeather={onUpdateWeather}
          speedKmH={activeTrip.route.targetSpeedKmH}
        />
      )}

      {/* Section Title */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {t('savedProfilesHeading')}
        </h2>
        <span className="text-xs text-ink-muted">
          {t('savedProfilesHint')}
        </span>
      </div>

      {/* Trip Cards Grid / Empty State */}
      {trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isActive={activeTrip ? trip.id === activeTrip.id : false}
              onSelect={onSelectTrip}
              onEdit={onEditTrip}
              onDuplicate={onDuplicateTrip}
              onDelete={onDeleteTrip}
              onLaunch={onLaunchDashboard}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-card border border-ink/10 dark:border-white/10 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-pod flex items-center justify-center mx-auto text-ink-muted">
            <Sparkle className="w-6 h-6 text-volt-dim dark:text-volt" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ink">
              {lang === 'fr' ? 'Aucun profil de trajet' : 'No Trip Profiles Saved'}
            </h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              {lang === 'fr'
                ? 'Configurez votre première sortie personnalisée ou chargez un profil démo pour explorer le Flight Deck.'
                : 'Create your first custom ride or load a demo profile to explore the Flight Deck telemetry.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={onCreateNewTrip}
              className={`flex items-center gap-1.5 h-10 px-5 ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} font-semibold text-xs rounded-full transition-all cursor-pointer`}
            >
              <Plus className="w-4 h-4 text-current stroke-[2.2]" />
              <span>{t('createNewTripBtn')}</span>
            </button>
            {onLoadDemoTrip && (
              <button
                type="button"
                onClick={onLoadDemoTrip}
                className="flex items-center gap-1.5 h-10 px-5 bg-pod hover:bg-chip text-ink border border-black/10 dark:border-white/15 font-semibold text-xs rounded-full transition-all cursor-pointer"
              >
                <Sparkle className="w-4 h-4 text-volt-dim dark:text-volt" />
                <span>{lang === 'fr' ? 'Charger un trajet démo' : 'Load Sample Trip (Demo)'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full-Radius Chain-Link Persistence Callout */}
      <div className="mt-10 px-3.5 sm:pl-2.5 sm:pr-4 py-3 sm:py-2.5 rounded-2xl lg:rounded-full bg-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs text-ink-secondary">
        <div className="flex items-center gap-3 min-w-0">
          {user ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
          ) : (
            <IconBadge theme="emerald" icon={ShieldCheck} size="md" solidBacker />
          )}
          <span className="leading-relaxed">
            {user ? t('cloudSyncNotice') : t('localStorageNotice')}
          </span>
        </div>
        <div className="flex items-center gap-2.5 w-full lg:w-auto lg:shrink-0 flex-wrap justify-start lg:justify-end">
          {!user && (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="py-1 px-3 rounded-full bg-volt text-[#111111] text-xs font-semibold hover:brightness-105 transition-all cursor-pointer shadow-xs"
            >
              {t('logInOrSignUp')}
            </button>
          )}
          {onOpenOnboarding && (
            <Badge
              variant="yellow-vest"
              size="md"
              icon={Sparkle}
              interactive
              onClick={onOpenOnboarding}
              className="py-1.5 px-3.5 max-w-full"
              title={lang === 'fr' ? 'Ouvrir l’assistant de calibrage interactif' : 'Test Drive: Interactive Calibration Wizard'}
            >
              {lang === 'fr' ? 'Essai : Assistant de calibrage interactif' : 'Test Drive: Interactive Calibration Wizard'}
            </Badge>
          )}
          <span className="px-3 py-1 rounded-full bg-pod text-ink-muted tnum shrink-0 whitespace-nowrap">
            {t('syncedAt', { time: syncedDisplayTime })}
          </span>
        </div>
      </div>
    </div>
  );
};
