import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { getActiveBike } from '../../utils/specsStorage';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../utils/userProfileStorage';
import { calculatePhysics } from '../../utils/physics';
import {
  Sun,
  Moon,
  Bicycle,
  Printer,
  Receipt,
  User,
  Send,
  X,
  Monitor2Check,
} from '@/components/icons';
import { Cloud, LogOut, Languages } from 'lucide-react';
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
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  riderSpecs?: RiderBikeSpecs;
  isMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
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
  onShareReceipt,
  onOpenFeedback,
  riderSpecs,
  isMenuOpen: propIsMenuOpen,
  onMenuOpenChange,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const { user, openAuthModal, signOut, syncStatus, forceSyncNow } = useAuth();
  const { username } = useUserProfile();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [utcLabel, setUtcLabel] = useState<string>(() => formatLocalUtcOffset(new Date()));
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = propIsMenuOpen !== undefined ? propIsMenuOpen : internalMenuOpen;
  const setIsMenuOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof open === 'function' ? open(isMenuOpen) : open;
    setInternalMenuOpen(nextVal);
    onMenuOpenChange?.(nextVal);
  };
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // Close overlay on click outside or Escape, while preserving persistent state when modals are active
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If user is clicking inside an active modal dialog/backdrop, do NOT close the menu underneath
      if (
        target.closest('[role="dialog"]') ||
        target.closest('.modal-content') ||
        target.closest('[data-modal]')
      ) {
        return;
      }

      // If user is clicking inside the portaled mobile card, do NOT close
      if (mobileSheetRef.current && mobileSheetRef.current.contains(target)) {
        return;
      }

      if (menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const hasOpenModal = document.querySelector('[role="dialog"]');
        if (!hasOpenModal) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling completely when overlay is open
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Intercept touchmove on mobile so background page never scrolls
    const handleTouchMove = (e: TouchEvent) => {
      // Allow scrolling inside the mobile card if the touch is inside it
      if (mobileSheetRef.current && mobileSheetRef.current.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isMenuOpen]);

  // Live real-time clock
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

  // Avatar user display name / initial
  const userDisplayName = username || (user?.email ? user.email.split('@')[0] : 'Rider');
  const userInitial = (userDisplayName[0] || 'R').toUpperCase();

  // Beacon status dot for cloud storage
  const syncBeaconClass = !user
    ? 'bg-amber-400'
    : syncStatus === 'saving'
    ? 'bg-amber-400 animate-pulse'
    : syncStatus === 'error'
    ? 'bg-rose-500'
    : 'bg-emerald-500';

  return (
    <header className="w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-5 transition-colors duration-200 select-none no-print relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Left: Chain-Link Brand Identifier */}
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
              <span
                className={`hidden min-[380px]:inline-flex text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shrink-0 tnum ${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary}`}
              >
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
            <span className="text-ink font-semibold truncate">{activeMeta.name}</span>
            <span className="text-ink-muted shrink-0">·</span>
            <span className="text-ink-secondary tnum font-bold shrink-0">
              {activeTrip.route.distanceKm} km
            </span>
          </button>
        )}

        {/* Right: Telemetry Sync Clock & Streamlined Profile Overlay Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={menuContainerRef}>
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-card dark:bg-pod rounded-full text-xs sm:text-[13px] font-mono text-ink-secondary shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-ink-muted font-bold tnum">
              {utcLabel}
            </span>
            <span className="font-bold text-ink tnum">{currentTime}</span>
          </div>

          {/* Unified Profile & Utility Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label={t('menuOpenAria')}
            title={user ? `${user.email} (${t('cloudSynced')})` : t('savedOnDeviceClickToSync')}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs select-none focus:outline-none ring-2 ${
              isMenuOpen
                ? 'ring-volt bg-pod dark:bg-chip text-ink'
                : 'ring-ink/10 dark:ring-white/15 bg-card dark:bg-pod text-ink hover:ring-volt/60'
            }`}
          >
            {user ? (
              <span className="font-bold text-sm text-ink">{userInitial}</span>
            ) : (
              <User size={19} className="w-5 h-5 text-ink-secondary shrink-0" />
            )}

            {/* Live Sync Beacon Indicator Dot */}
            <span
              className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-canvas ${syncBeaconClass}`}
            />
          </button>

          {/* ══════════════════════════════════════════════════════════════════
              DESKTOP OVERLAY MENU (Anchored floating popover matching ref image)
             ══════════════════════════════════════════════════════════════════ */}
          {isMenuOpen && (
            <div className="hidden sm:block absolute right-4 sm:right-8 lg:right-12 top-full mt-2.5 w-84 bg-card/95 dark:bg-[#16161A]/95 backdrop-blur-2xl border border-ink/10 dark:border-white/15 rounded-2xl p-2.5 shadow-2xl z-50 animate-apple-popover text-xs select-none">
              {/* 1. Cloud Storage & Account Header Row */}
              <div className="p-2.5 rounded-xl bg-pod/60 dark:bg-white/5 border border-ink/5 dark:border-white/5 mb-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs ${
                        user
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                      }`}
                    >
                      {user ? userInitial : <User size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-xs truncate">
                        {user ? userDisplayName : t('savedOnDeviceShort')}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted truncate mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${syncBeaconClass}`} />
                        <span>
                          {user
                            ? syncStatus === 'saving'
                              ? t('syncStatusSaving')
                              : t('cloudSynced')
                            : t('localStorageNotice').split('—')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {user ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await forceSyncNow();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-card dark:bg-pod hover:bg-chip text-ink text-[11px] font-mono font-medium transition-colors cursor-pointer shrink-0 border border-ink/5 dark:border-white/10"
                      title={t('syncNowBtn')}
                    >
                      <Cloud className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        openAuthModal('login');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-volt text-[#111111] hover:bg-volt-lime text-[11px] font-semibold transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      {t('logIn')}
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Bike Settings (Rider Profile & Bike Garage) */}
              {onOpenSpecs && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSpecs();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Bicycle size={16} className="text-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-ink text-xs">{t('specsModalTitle')}</div>
                      {riderSpecs && activeBike && (
                        <div className="text-[11px] text-ink-muted truncate">
                          {activeBike.name} · {riderSpecs.ftpWatts}W
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-pod dark:bg-white/10 text-ink-muted shrink-0 font-medium">
                    {activeBike?.isTubeless ? 'TL' : 'Tube'}
                  </span>
                </button>
              )}

              {/* 3. Theme Toggle (Segmented inline control) */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                  </div>
                  <span className="font-medium text-ink text-xs">{t('onboardingThemePrompt')}</span>
                </div>
                <div className="flex items-center p-0.5 rounded-lg bg-card dark:bg-pod border border-ink/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDark) toggleTheme();
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      !isDark
                        ? 'bg-pod dark:bg-chip text-ink shadow-xs font-semibold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Sun size={12} />
                    <span>{t('themeLight')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDark) toggleTheme();
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isDark
                        ? 'bg-pod dark:bg-chip text-ink shadow-xs font-semibold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Moon size={12} />
                    <span>{t('themeDark')}</span>
                  </button>
                </div>
              </div>

              {/* 4. Language Switcher (Segmented inline control) */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Languages className="w-4 h-4 text-current" />
                  </div>
                  <span className="font-medium text-ink text-xs">{t('onboardingLangPrompt')}</span>
                </div>
                <div className="flex items-center p-0.5 rounded-lg bg-card dark:bg-pod border border-ink/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      lang === 'en'
                        ? 'bg-pod dark:bg-chip text-ink shadow-xs font-bold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('fr')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      lang === 'fr'
                        ? 'bg-pod dark:bg-chip text-ink shadow-xs font-bold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    FR
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="my-1.5 border-t border-ink/5 dark:border-white/10" />

              {/* 5. Share Ride Receipt */}
              {onShareReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onShareReceipt();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-lime-500/15 text-lime-600 dark:text-lime-400 flex items-center justify-center shrink-0">
                      <Receipt size={16} className="text-current" />
                    </div>
                    <span className="font-medium text-ink text-xs">{t('shareReceiptBtn')}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-volt/20 text-volt-lime font-bold shrink-0">
                    PNG
                  </span>
                </button>
              )}

              {/* 6. Print A4 Cue Sheet */}
              {onPrint && (
                <button
                  type="button"
                  onClick={() => {
                    onPrint();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Printer size={16} className="text-current" />
                    </div>
                    <span className="font-medium text-ink text-xs">{t('printButtonTitle')}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-pod dark:bg-white/10 text-ink-muted shrink-0 font-medium">
                    A4
                  </span>
                </button>
              )}

              {/* 7. Send Feedback (without green indicator dot) */}
              {onOpenFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFeedback();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-pod/80 dark:hover:bg-white/5 text-ink transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Send size={15} className="text-current" />
                    </div>
                    <span className="font-medium text-ink text-xs">{t('sendFeedbackBtn')}</span>
                  </div>
                </button>
              )}

              {/* 8. Log Out (If authenticated) */}
              {user && (
                <>
                  <div className="my-1.5 border-t border-ink/5 dark:border-white/10" />
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left font-medium"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4 text-current" />
                    </div>
                    <span className="text-xs">{t('logOut')}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MOBILE OVERLAY MENU (Ergonomic inset floating card matching ref image 3,
              portaled to body, no blur, dark backdrop, no outline border, rounded-[32px])
             ══════════════════════════════════════════════════════════════════ */}
          {isMenuOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div className="sm:hidden">
                {/* Dimmed Dark Backdrop (NO blur effect, deeper darkness) */}
                <div
                  className="fixed inset-0 z-[60] bg-black/85 animate-fade-in touch-none"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Inset Mobile Card Overlay (floating with margins on left, right & bottom, fully rounded, max-w-lg) */}
                <div
                  ref={mobileSheetRef}
                  className="fixed inset-x-3.5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[65] max-w-lg mx-auto bg-card dark:bg-[#18181B] border-0 rounded-[32px] p-5 sm:p-6 shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto overscroll-contain animate-apple-in select-none"
                >
                  {/* Pull handle indicator */}
                  <div className="w-10 h-1 bg-ink/20 dark:bg-white/20 rounded-full mx-auto mb-3.5" />

                {/* Mobile Header (no border line) */}
                <div className="flex items-center justify-between pb-3.5 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${
                        user
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                      }`}
                    >
                      {user ? userInitial : <User size={18} />}
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">
                        {user ? userDisplayName : t('savedOnDeviceShort')}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${syncBeaconClass}`} />
                        <span>
                          {user
                            ? syncStatus === 'saving'
                              ? t('syncStatusSaving')
                              : t('cloudSynced')
                            : t('localStorageNotice').split('—')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-10 h-10 rounded-full bg-pod hover:bg-chip text-ink flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('menuCloseAria')}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Cloud Sync Status / Sign In Action for Mobile */}
                <div className="mb-3">
                  {user ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await forceSyncNow();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 border-0 text-ink transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Cloud className="w-5 h-5 text-current" />
                        </div>
                        <span className="font-medium text-sm">{t('syncNowBtn')}</span>
                      </div>
                      <span className="text-xs font-mono text-ink-muted uppercase font-bold">
                        {syncStatus}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        openAuthModal('login');
                      }}
                      className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-volt text-[#111111] hover:bg-volt-lime font-semibold text-sm transition-all cursor-pointer shadow-sm border-0"
                    >
                      <Monitor2Check className="w-5 h-5 shrink-0" />
                      <span>{t('logInOrSignUp')}</span>
                    </button>
                  )}
                </div>

                {/* Mobile Menu Action List (All circle containers, all colored, no stroke) */}
                <div className="space-y-2.5">
                  {/* Bike Settings */}
                  {onOpenSpecs && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSpecs();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 hover:bg-pod dark:hover:bg-white/10 border-0 text-ink transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Bicycle size={20} className="text-current" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{t('specsModalTitle')}</div>
                          {riderSpecs && activeBike && (
                            <div className="text-xs text-ink-muted">
                              {activeBike.name} · {riderSpecs.ftpWatts}W
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-card dark:bg-white/10 text-ink-secondary font-semibold">
                        {activeBike?.isTubeless ? 'TL' : 'Tube'}
                      </span>
                    </button>
                  )}

                  {/* Theme Switcher Mobile */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 border-0 text-ink">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                        {isDark ? <Moon size={20} /> : <Sun size={20} />}
                      </div>
                      <span className="font-medium text-sm">{t('onboardingThemePrompt')}</span>
                    </div>
                    <div className="flex items-center p-1 rounded-xl bg-card dark:bg-pod border-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isDark) toggleTheme();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          !isDark
                            ? 'bg-pod dark:bg-chip text-ink shadow-sm font-semibold'
                            : 'text-ink-muted'
                        }`}
                      >
                        <Sun size={14} />
                        <span>{t('themeLight')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDark) toggleTheme();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          isDark
                            ? 'bg-pod dark:bg-chip text-ink shadow-sm font-semibold'
                            : 'text-ink-muted'
                        }`}
                      >
                        <Moon size={14} />
                        <span>{t('themeDark')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Language Switcher Mobile */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 border-0 text-ink">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Languages className="w-5 h-5 text-current" />
                      </div>
                      <span className="font-medium text-sm">{t('onboardingLangPrompt')}</span>
                    </div>
                    <div className="flex items-center p-1 rounded-xl bg-card dark:bg-pod border-0">
                      <button
                        type="button"
                        onClick={() => setLang('en')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          lang === 'en'
                            ? 'bg-pod dark:bg-chip text-ink shadow-sm font-bold'
                            : 'text-ink-muted'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('fr')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          lang === 'fr'
                            ? 'bg-pod dark:bg-chip text-ink shadow-sm font-bold'
                            : 'text-ink-muted'
                        }`}
                      >
                        FR
                      </button>
                    </div>
                  </div>

                  {/* Share Receipt Mobile */}
                  {onShareReceipt && (
                    <button
                      type="button"
                      onClick={() => {
                        onShareReceipt();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 hover:bg-pod dark:hover:bg-white/10 border-0 text-ink transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lime-500/15 text-lime-600 dark:text-lime-400 flex items-center justify-center shrink-0">
                          <Receipt size={20} className="text-current" />
                        </div>
                        <span className="font-medium text-sm">{t('shareReceiptBtn')}</span>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-volt/20 text-volt-lime font-bold">
                        PNG
                      </span>
                    </button>
                  )}

                  {/* Print A4 Mobile */}
                  {onPrint && (
                    <button
                      type="button"
                      onClick={() => {
                        onPrint();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 hover:bg-pod dark:hover:bg-white/10 border-0 text-ink transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Printer size={20} className="text-current" />
                        </div>
                        <span className="font-medium text-sm">{t('printButtonTitle')}</span>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-card dark:bg-white/10 text-ink-secondary font-semibold">
                        A4
                      </span>
                    </button>
                  )}

                  {/* Send Feedback Mobile (NO glowing indicator dot) */}
                  {onOpenFeedback && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenFeedback();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-pod/60 dark:bg-white/5 hover:bg-pod dark:hover:bg-white/10 border-0 text-ink transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Send size={18} className="text-current" />
                        </div>
                        <span className="font-medium text-sm">{t('sendFeedbackBtn')}</span>
                      </div>
                    </button>
                  )}

                  {/* Log Out Button Mobile */}
                  {user && (
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                      }}
                      className="w-full flex items-center gap-3 p-3.5 mt-2 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold transition-colors cursor-pointer text-left border-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                        <LogOut className="w-5 h-5 text-current" />
                      </div>
                      <span className="text-sm">{t('logOut')}</span>
                    </button>
                  )}
                </div>

                {/* Subtle bottom spacer for smooth scroll padding */}
                <div className="h-2" />
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </header>
  );
};
