import React, { useState, useEffect } from 'react';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getActiveBike } from '../../utils/specsStorage';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { calculatePhysics } from '../../utils/physics';
import { Sun, Moon, Bicycle, Printer } from '@/components/icons';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface TopTelemetryBarProps {
  activeTrip: TripProfile;
  currentView: 'home' | 'configurator' | 'dashboard';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard') => void;
  onOpenSpecs?: () => void;
  onPrint?: () => void;
  riderSpecs?: RiderBikeSpecs;
}

function formatLocalUtcOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  return mins > 0
    ? `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`
    : `UTC${sign}${hours}`;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  activeTrip,
  currentView,
  onNavigate,
  onOpenSpecs,
  onPrint,
  riderSpecs,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [utcLabel, setUtcLabel] = useState<string>(() => formatLocalUtcOffset(new Date()));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcLabel(formatLocalUtcOffset(now));
      setCurrentTime(
        now.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, [lang]);

  const activeMeta = getLocalizedTripMeta(activeTrip, lang);
  const activeBike = riderSpecs ? getActiveBike(riderSpecs) : null;
  const physics = calculatePhysics(
    activeTrip.physics,
    activeTrip.route,
    activeTrip.weather,
    lang,
    riderSpecs?.ftpWatts
  );
  const statusDotClass =
    physics.goStatus === 'GO'
      ? CHIP_TOKENS.emerald.dot
      : physics.goStatus === 'CAUTION'
      ? CHIP_TOKENS.amber.dot
      : CHIP_TOKENS.rose.dot;
  const breadcrumbTargetView = currentView === 'dashboard' ? 'configurator' : 'dashboard';

  return (
    <header className="w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-5 transition-colors duration-200 select-none no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Left: Chain-Link Brand Identifier with Comfortable Breathing Room */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 cursor-pointer group text-left focus:outline-none"
        >
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-xs ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest'].selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
          >
            <svg
              className="keyline-icon w-4.5 h-4.5 sm:w-5.5 sm:h-5.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
              <circle cx="17" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
              <path d="M9.5 9.2c1.6.9 3.4.9 5 0" />
              <path d="M9.5 14.8c1.6-.9 3.4-.9 5 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold tracking-tight text-ink text-[15px] sm:text-[17px] whitespace-nowrap truncate">
                {t('appName')}
              </span>
              <span className={`hidden min-[380px]:inline-flex text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shrink-0 tnum ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary}`}>
                v2.6
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-ink-muted hidden md:block mt-0.5">
              {t('headerTagline')}
            </p>
          </div>
        </button>

        {/* Center: Live Operational Breadcrumb (Desktop) */}
        <button
          type="button"
          onClick={() => onNavigate(breadcrumbTargetView)}
          title={currentView === 'dashboard' ? t('editParamsTitle') : t('openFlightDeckBtn')}
          className="hidden lg:flex items-center gap-3 px-4 py-2 bg-card dark:bg-pod hover:bg-pod dark:hover:bg-chip rounded-full text-[13px] sm:text-sm font-mono shadow-xs min-w-0 max-w-md transition-colors cursor-pointer focus:outline-none"
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotClass}`} />
          <span className="text-ink-muted uppercase tracking-wider text-xs font-bold shrink-0">
            {activeTrip.tag}
          </span>
          <span className="text-ink-muted shrink-0">/</span>
          <span className="text-ink font-semibold truncate">
            {activeMeta.name}
          </span>
          <span className="text-ink-muted shrink-0">·</span>
          <span className="text-ink-secondary tnum font-bold shrink-0">
            {activeTrip.route.distanceKm} km
          </span>
        </button>

        {/* Right: Telemetry Sync Clock & Auxiliary Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-card dark:bg-pod rounded-full text-xs sm:text-[13px] font-mono text-ink-secondary shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-ink-muted font-bold tnum">{utcLabel}</span>
            <span className="font-bold text-ink tnum">{currentTime}</span>
          </div>

          {/* Dedicated Rider Profile + Bike Garage 1:1 Trigger */}
          {onOpenSpecs && (
            <button
              type="button"
              onClick={onOpenSpecs}
              className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-card dark:bg-pod hover:bg-chip flex items-center justify-center transition-colors cursor-pointer shadow-xs ${CHIP_DUOTONE_ISOLATION_CLASSES} ${GREYSCALE_TOKENS.primary} hover:text-ink`}
              title={
                activeBike && riderSpecs
                  ? `${t('specsModalTitle')} — ${riderSpecs.ftpWatts}W · ${riderSpecs.carbTargetGPerHr}g/h · ${activeBike.name} (${activeBike.isTubeless ? 'Tubeless' : 'Tube'})`
                  : t('specsModalTitle')
              }
              aria-label={t('specsModalTitle')}
            >
              <Bicycle size={19} className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-current shrink-0" />
            </button>
          )}

          {/* Print A4 Cue Sheet Trigger */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className={`hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card dark:bg-pod hover:bg-chip items-center justify-center transition-colors cursor-pointer shadow-xs ${CHIP_DUOTONE_ISOLATION_CLASSES} ${GREYSCALE_TOKENS.primary} hover:text-ink`}
              title={t('printButtonTitle')}
              aria-label={t('printButtonTitle')}
            >
              <Printer size={18} className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-current shrink-0" />
            </button>
          )}

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card dark:bg-pod text-ink hover:bg-[#faffcb] hover:text-[#4d5200] dark:hover:bg-[#1f2203]/60 dark:hover:text-[#dfff00] text-xs sm:text-[13px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs`}
            title={t('switchLanguageAria')}
            aria-label={t('switchLanguageAria')}
          >
            {lang.toUpperCase()}
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card dark:bg-pod hover:bg-chip flex items-center justify-center transition-colors cursor-pointer shadow-xs ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              isDark ? CHIP_TOKENS.amber.primary : GREYSCALE_TOKENS.primary
            }`}
            title={isDark ? t('switchToLight') : t('switchToDark')}
            aria-label={isDark ? t('switchToLight') : t('switchToDark')}
          >
            {isDark ? (
              <Sun size={20} className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-current shrink-0 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon size={20} className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-current shrink-0 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
