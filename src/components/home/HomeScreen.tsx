import React from 'react';
import { Plus, ArrowCounterClockwise, ShieldCheck, Sparkle } from '@/components/icons';
import { TripProfile, WeatherCondition } from '../../types/trip';
import { TripCard } from './TripCard';
import { WeatherWidget } from './WeatherWidget';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';
import { useTranslation } from '../../context/LanguageContext';

interface HomeScreenProps {
  trips: TripProfile[];
  activeTrip: TripProfile;
  onSelectTrip: (id: string) => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripProfile) => void;
  onDuplicateTrip: (trip: TripProfile) => void;
  onDeleteTrip: (id: string) => void;
  onLaunchDashboard: (id: string) => void;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
  onResetDefaults: () => void;
  onOpenOnboarding?: () => void;
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
}) => {
  const { lang, t } = useTranslation();
  const syncedTime = new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
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

      {/* Quick Weather Check Widget */}
      <WeatherWidget
        trip={activeTrip}
        weather={activeTrip.weather}
        onUpdateWeather={onUpdateWeather}
        speedKmH={activeTrip.route.targetSpeedKmH}
      />

      {/* Section Title */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {t('savedProfilesHeading')}
        </h2>
        <span className="text-xs text-ink-muted">
          {t('savedProfilesHint')}
        </span>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            isActive={trip.id === activeTrip.id}
            onSelect={onSelectTrip}
            onEdit={onEditTrip}
            onDuplicate={onDuplicateTrip}
            onDelete={onDeleteTrip}
            onLaunch={onLaunchDashboard}
          />
        ))}
      </div>

      {/* Full-Radius Chain-Link Persistence Callout */}
      <div className="mt-10 px-3.5 sm:pl-2.5 sm:pr-4 py-3 sm:py-2.5 rounded-2xl lg:rounded-full bg-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs text-ink-secondary">
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge theme="emerald" icon={ShieldCheck} size="md" solidBacker />
          <span className="leading-relaxed">{t('localStorageNotice')}</span>
        </div>
        <div className="flex items-center gap-2.5 w-full lg:w-auto lg:shrink-0 flex-wrap justify-start lg:justify-end">
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
            {t('syncedAt', { time: syncedTime })}
          </span>
        </div>
      </div>
    </div>
  );
};
