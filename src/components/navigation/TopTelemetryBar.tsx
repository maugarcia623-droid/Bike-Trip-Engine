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
} from '@/components/icons';
import { Cloud, LogOut, Languages, ChevronRight, RefreshCw } from 'lucide-react';
import { IconBadge } from '../common/IconBadge';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
  GREYSCALE_TOKENS,
  YELLOW_VEST_SOLID_CTA_CLASSES,
  LayeredTokenTheme,
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

    // Intercept touchmove on mobile so background page never scrolls when only the menu is open
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow scrolling inside any open modal or dialog (Rider Specs, Share Receipt, Feedback, Auth, etc.)
      if (
        target.closest('[role="dialog"]') ||
        target.closest('[aria-modal="true"]') ||
        target.closest('.overflow-y-auto') ||
        target.closest('.overflow-auto') ||
        target.closest('.overflow-scroll')
      ) {
        return;
      }

      // If any modal dialog is currently mounted in the DOM, let the modal handle all touches
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        return;
      }

      // Allow scrolling inside the mobile settings sheet
      if (mobileSheetRef.current && mobileSheetRef.current.contains(target)) {
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

  // ── Settings panel (shared by desktop popover + mobile sheet) ──────────────
  const isFr = lang === 'fr';
  const yellowVest = CHIP_TOKENS['yellow-vest'];

  const syncStatusLabel = !user
    ? isFr
      ? 'Enregistré sur cet appareil'
      : 'Saved on this device'
    : syncStatus === 'saving'
    ? t('syncStatusSaving')
    : syncStatus === 'error'
    ? t('syncStatusError')
    : t('cloudSynced');

  const renderPanel = (m: boolean) => {
    // Size scale: mobile gets larger type and taller touch targets
    const rowH = m ? 'min-h-[60px]' : 'min-h-[52px]';
    const labelCls = m ? 'text-[15px]' : 'text-sm';
    const subCls = m ? 'text-[13px]' : 'text-xs';
    const badgeSize = m ? 'lg' : 'md';
    const dividerInset = m ? 'ml-[68px]' : 'ml-[60px]';

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
      <div className="px-2 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">
        {children}
      </div>
    );

    const Group = ({ children }: { children: React.ReactNode }) => (
      <div className="rounded-[22px] bg-pod/70 dark:bg-white/[0.045] overflow-hidden">{children}</div>
    );

    const Divider = () => (
      <div className={`h-px bg-ink/[0.06] dark:bg-white/[0.06] mr-4 ${dividerInset}`} />
    );

    const Row = ({
      theme,
      icon,
      label,
      sub,
      onClick,
      trailing,
      danger = false,
    }: {
      theme: LayeredTokenTheme;
      icon: React.ElementType;
      label: string;
      sub?: string;
      onClick?: () => void;
      trailing?: React.ReactNode;
      danger?: boolean;
    }) => {
      const content = (
        <>
          <IconBadge theme={theme} icon={icon} size={badgeSize} shape="circle" />
          <div className="min-w-0 flex-1 text-left">
            <div
              className={`${labelCls} font-semibold leading-tight truncate ${
                danger ? 'text-rose-600 dark:text-rose-400' : 'text-ink'
              }`}
            >
              {label}
            </div>
            {sub && <div className={`${subCls} text-ink-muted leading-snug truncate mt-0.5`}>{sub}</div>}
          </div>
          {trailing !== undefined
            ? trailing
            : onClick && <ChevronRight className="w-4 h-4 text-ink-muted/70 shrink-0" aria-hidden="true" />}
        </>
      );

      const base = `w-full flex items-center gap-3 px-3.5 ${rowH} py-2.5`;

      return onClick ? (
        <button
          type="button"
          role="menuitem"
          onClick={onClick}
          className={`${base} cursor-pointer transition-colors active:scale-[0.99] ${
            danger
              ? 'hover:bg-rose-500/[0.07] active:bg-rose-500/10'
              : 'hover:bg-ink/[0.035] dark:hover:bg-white/[0.04] active:bg-ink/[0.06] dark:active:bg-white/[0.07]'
          } focus:outline-none focus-visible:bg-ink/[0.05] dark:focus-visible:bg-white/[0.06]`}
        >
          {content}
        </button>
      ) : (
        <div className={base}>{content}</div>
      );
    };

    const Segmented = <T extends string>({
      value,
      options,
      onChange,
      ariaLabel,
    }: {
      value: T;
      options: { value: T; label: string; icon?: React.ElementType }[];
      onChange: (v: T) => void;
      ariaLabel: string;
    }) => (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="flex items-center p-1 gap-0.5 rounded-full bg-card dark:bg-black/30 shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-150 cursor-pointer focus:outline-none ${
                m ? 'h-8 px-3 text-[13px]' : 'h-7 px-2.5 text-xs'
              } ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                active
                  ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing} shadow-xs`
                  : 'ring-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {OptIcon && <OptIcon className="w-3.5 h-3.5 shrink-0 text-current" aria-hidden="true" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="flex flex-col">
        {/* ── Identity header ── */}
        <div className="flex items-center gap-3 px-1.5 pt-1 pb-1">
          <div
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              user
                ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                : `${GREYSCALE_TOKENS.surface} ${GREYSCALE_TOKENS.primary} ring-transparent`
            }`}
          >
            {user ? userInitial : <User className="w-6 h-6 text-current" />}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-[2.5px] ring-card dark:ring-[#18181B] ${syncBeaconClass}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`${m ? 'text-[17px]' : 'text-base'} font-semibold text-ink tracking-tight truncate`}>
              {user ? userDisplayName : isFr ? 'Cycliste invité' : 'Guest rider'}
            </div>
            <div className={`${subCls} text-ink-muted truncate mt-0.5`}>
              {user ? user.email : syncStatusLabel}
            </div>
          </div>
          {m && (
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
              aria-label={t('menuCloseAria')}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Cloud account ── */}
        <div className="mt-3">
          {user ? (
            <Group>
              <Row
                theme={syncStatus === 'error' ? 'rose' : 'emerald'}
                icon={Cloud}
                label={syncStatusLabel}
                sub={t('autoSaveActive')}
                trailing={
                  <button
                    type="button"
                    onClick={async () => {
                      await forceSyncNow();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full font-semibold cursor-pointer transition-colors shrink-0 bg-card dark:bg-white/[0.08] hover:bg-chip text-ink ${
                      m ? 'h-9 px-3.5 text-[13px]' : 'h-8 px-3 text-xs'
                    }`}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncStatus === 'saving' ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    {t('syncNowBtn')}
                  </button>
                }
              />
            </Group>
          ) : (
            <div className={`rounded-[22px] p-4 ${yellowVest.surface}`}>
              <div className="flex items-start gap-3">
                <IconBadge theme="yellow-vest" icon={Cloud} size={badgeSize} isSelected solidBacker />
                <div className="min-w-0">
                  <div className={`${labelCls} font-semibold ${yellowVest.primary}`}>
                    {isFr ? 'Synchronisez vos sorties' : 'Sync your rides'}
                  </div>
                  <div className={`${subCls} text-ink-secondary leading-snug mt-0.5`}>
                    {isFr
                      ? 'Retrouvez trajets, vélos et checklists sur tous vos appareils.'
                      : 'Keep trips, bikes and checklists on all your devices.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className={`mt-3.5 w-full inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-all hover:brightness-[0.97] active:scale-[0.99] shadow-xs ${YELLOW_VEST_SOLID_CTA_CLASSES} ${
                  m ? 'h-12 text-[15px]' : 'h-10 text-sm'
                }`}
              >
                {t('logInOrSignUp')}
              </button>
            </div>
          )}
        </div>

        {/* ── Preferences ── */}
        <SectionLabel>{isFr ? 'Préférences' : 'Preferences'}</SectionLabel>
        <Group>
          <Row
            theme="amber"
            icon={isDark ? Moon : Sun}
            label={t('onboardingThemePrompt')}
            trailing={
              <Segmented
                ariaLabel={t('onboardingThemePrompt')}
                value={isDark ? 'dark' : 'light'}
                onChange={(v) => {
                  if ((v === 'dark') !== isDark) toggleTheme();
                }}
                options={[
                  { value: 'light', label: t('themeLight'), icon: Sun },
                  { value: 'dark', label: t('themeDark'), icon: Moon },
                ]}
              />
            }
          />
          <Divider />
          <Row
            theme="teal"
            icon={Languages}
            label={t('onboardingLangPrompt')}
            trailing={
              <Segmented
                ariaLabel={t('switchLanguageAria')}
                value={lang}
                onChange={(v) => setLang(v)}
                options={[
                  { value: 'en', label: 'EN' },
                  { value: 'fr', label: 'FR' },
                ]}
              />
            }
          />
        </Group>

        {/* ── Ride tools ── */}
        <SectionLabel>{isFr ? 'Sortie' : 'Ride'}</SectionLabel>
        <Group>
          {onOpenSpecs && (
            <Row
              theme="sky"
              icon={Bicycle}
              label={t('specsModalTitle')}
              sub={
                riderSpecs && activeBike
                  ? `${activeBike.name} · ${riderSpecs.ftpWatts} W · ${
                      activeBike.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tube'
                    }`
                  : undefined
              }
              onClick={onOpenSpecs}
            />
          )}
          {onOpenSpecs && (onShareReceipt || onPrint) && <Divider />}
          {onShareReceipt && (
            <Row
              theme="lime"
              icon={Receipt}
              label={t('shareReceiptBtn')}
              sub={isFr ? 'Carte story PNG 1080×1920' : '1080×1920 PNG story card'}
              onClick={onShareReceipt}
            />
          )}
          {onShareReceipt && onPrint && <Divider />}
          {onPrint && (
            <Row
              theme="blue"
              icon={Printer}
              label={t('printButtonTitle')}
              sub={isFr ? 'Feuille de route A4 imprimable' : 'Printable A4 route summary'}
              onClick={onPrint}
            />
          )}
        </Group>

        {/* ── Support & account ── */}
        {(onOpenFeedback || user) && (
          <>
            <SectionLabel>{isFr ? 'Assistance' : 'Support'}</SectionLabel>
            <Group>
              {onOpenFeedback && (
                <Row
                  theme="purple"
                  icon={Send}
                  label={t('sendFeedbackBtn')}
                  sub={isFr ? 'Signaler un bug ou proposer une idée' : 'Report a bug or suggest an idea'}
                  onClick={onOpenFeedback}
                />
              )}
              {onOpenFeedback && user && <Divider />}
              {user && (
                <Row
                  theme="rose"
                  icon={LogOut}
                  label={t('logOut')}
                  danger
                  trailing={null}
                  onClick={async () => {
                    setIsMenuOpen(false);
                    await signOut();
                  }}
                />
              )}
            </Group>
          </>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-1 text-[11px] text-ink-muted font-mono tnum">
          <span>{t('appName')}</span>
          <span aria-hidden="true">·</span>
          <span>v2.6</span>
        </div>
      </div>
    );
  };

  return (
    <header className="w-full px-4 sm:px-8 lg:px-12 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 sm:pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] sm:pb-5 transition-colors duration-200 select-none no-print relative z-40">
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
            title={`${t('rideFeasibility')}: ${physics?.goStatus || 'GO'} — ${physics?.goStatusReason || ''} (${currentView === 'dashboard' ? t('editParamsTitle') : t('openFlightDeckBtn')})`}
            className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-card dark:bg-pod hover:bg-pod dark:hover:bg-chip rounded-full text-[13px] sm:text-sm font-mono shadow-xs min-w-0 max-w-lg transition-colors cursor-pointer focus:outline-none"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotClass}`}
              title={`${physics?.goStatus}: ${physics?.goStatusReason}`}
            />
            <span className="text-ink-muted uppercase tracking-wider text-xs font-bold shrink-0">
              {activeTrip.tag}
            </span>
            <span className="text-ink-muted shrink-0">/</span>
            <span className="text-ink font-semibold truncate">{activeMeta.name}</span>
            <span className="text-ink-muted shrink-0">·</span>
            <span className="text-ink-secondary tnum font-bold shrink-0">
              {activeTrip.route.distanceKm} km
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                physics?.goStatus === 'GO'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : physics?.goStatus === 'CAUTION'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              {physics?.goStatus}
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
              DESKTOP SETTINGS POPOVER (anchored to avatar trigger)
             ══════════════════════════════════════════════════════════════════ */}
          {isMenuOpen && (
            <div
              role="menu"
              aria-label={isFr ? 'Réglages' : 'Settings'}
              className="hidden sm:block absolute right-4 sm:right-8 lg:right-12 top-full mt-3 w-[23rem] max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain bg-card dark:bg-[#18181B] border border-ink/[0.06] dark:border-white/[0.08] rounded-[28px] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-50 animate-apple-popover select-none"
            >
              {renderPanel(false)}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MOBILE SETTINGS SHEET (inset floating card, portaled to body)
             ══════════════════════════════════════════════════════════════════ */}
          {isMenuOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div className="sm:hidden no-print print:hidden">
                {/* Solid dark backdrop (no blur) */}
                <div
                  className="fixed inset-0 z-[60] bg-black/85 animate-fade-in touch-none"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Inset floating card */}
                <div
                  ref={mobileSheetRef}
                  role="menu"
                  aria-label={isFr ? 'Réglages' : 'Settings'}
                  className="fixed inset-x-3.5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[65] max-w-lg mx-auto bg-card dark:bg-[#18181B] border-0 rounded-[32px] px-4 pt-3 pb-4 shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto overscroll-contain animate-apple-in select-none"
                >
                  {/* Grabber */}
                  <div className="w-10 h-1 bg-ink/15 dark:bg-white/20 rounded-full mx-auto mb-3" />
                  {renderPanel(true)}
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
};
