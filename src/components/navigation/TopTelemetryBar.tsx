import React, { useState, useEffect, useRef } from 'react';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getActiveBike } from '../../utils/specsStorage';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../utils/userProfileStorage';
import { calculatePhysics } from '../../utils/physics';
import { Sun, Moon, Bicycle, Printer, User, CaretDown, Monitor2Check, CircleChevronDown } from '@/components/icons';
import { Cloud, LogOut } from 'lucide-react';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
} from '../../tokens/chipTokens';

interface TopTelemetryBarProps {
  activeTrip?: TripProfile | null;
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
  const { user, openAuthModal, signOut, syncStatus, forceSyncNow } = useAuth();
  const { username } = useUserProfile();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [utcLabel, setUtcLabel] = useState<string>(() => formatLocalUtcOffset(new Date()));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

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

  const activeMeta = activeTrip ? getLocalizedTripMeta(activeTrip, lang) : null;
  const activeBike = riderSpecs ? getActiveBike(riderSpecs) : null;
  const physics = activeTrip
    ? calculatePhysics(
        activeTrip.physics,
        activeTrip.route,
        activeTrip.weather,
        lang,
        riderSpecs?.ftpWatts
      )
    : null;
  const statusDotClass =
    physics?.goStatus === 'GO'
      ? CHIP_TOKENS.emerald.dot
      : physics?.goStatus === 'CAUTION'
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
        {activeTrip && activeMeta && (
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
        )}

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

          {/* Supabase User Sync Status Pill & Profile Menu */}
          {!user ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full bg-card dark:bg-pod hover:bg-chip flex items-center gap-2 text-xs sm:text-[13px] font-medium text-ink transition-all cursor-pointer shadow-xs border border-ink/10 dark:border-white/10 shrink-0 ml-1 group"
              title={lang === 'fr' ? 'Données sur cet appareil — Cliquer pour synchroniser' : 'Data on this device — Click to sync'}
            >
              <Monitor2Check className="w-4 h-4 text-beacon-amber dual-tone-amber shrink-0" />
              <span className="hidden min-[540px]:inline whitespace-nowrap">
                {t('savedOnDeviceClickToSync')}
              </span>
              <span className="min-[540px]:hidden whitespace-nowrap">
                {t('savedOnDeviceShort')}
              </span>
            </button>
          ) : (
            <div className="relative shrink-0 ml-1" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full bg-card dark:bg-pod hover:bg-chip flex items-center gap-2 text-xs sm:text-[13px] font-medium text-ink border border-ink/10 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
                title={`${t('cloudSynced')} (${user.email})`}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    syncStatus === 'saving'
                      ? 'bg-amber-400 animate-pulse'
                      : syncStatus === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {t('cloudSynced')}
                </span>
                <span className="hidden md:inline text-ink-muted text-xs truncate max-w-[120px]">
                  {username || user.email?.split('@')[0]}
                </span>
                <CaretDown className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-150 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card dark:bg-pod border border-ink/10 dark:border-white/15 rounded-2xl p-3 shadow-xl z-50 animate-fade-in text-xs select-none">
                  <div className="px-2 py-1.5 border-b border-ink/5 dark:border-white/10 mb-2">
                    <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider font-bold">
                      {t('cloudAccount')}
                    </div>
                    <div className="font-semibold text-ink text-xs truncate mt-0.5" title={user.email}>
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t('autoSaveActive')}</span>
                    </div>
                  </div>

                  {/* Force Sync button */}
                  <button
                    type="button"
                    onClick={async () => {
                      await forceSyncNow();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-chip text-ink transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-ink-muted" />
                      <span>{t('syncNowBtn')}</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted uppercase">
                      {syncStatus}
                    </span>
                  </button>

                  {/* Log Out button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-current" />
                    <span className="font-semibold">{t('logOut')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
