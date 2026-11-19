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
  User,
  Send,
  X,
  Cloud,
  LogOut,
  Languages,
  ChevronRight,
  RefreshCw,
  Download,
  Compass,
  Check,
  ShareNetwork,
  Calculator,
  ArrowLeft,
  SlidersHorizontal,
} from '@/components/icons';

import { IconBadge } from '../common/IconBadge';
import { Button, ActionButton } from '@/components/arc';
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
  currentView: 'home' | 'configurator' | 'dashboard' | 'tools';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard' | 'tools') => void;
  onOpenSpecs?: () => void;
  onPrint?: () => void;
  onShareReceipt?: () => void;
  onOpenFeedback?: () => void;
  onOpenRideBrief?: () => void;
  onOpenTools?: (tab?: 'wind' | 'leave-by' | 'pressure') => void;
  riderSpecs?: RiderBikeSpecs;
  isMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  dashboardBackTarget?: 'home' | 'trips';
  onBackFromDashboard?: () => void;
  onOpenMobileWeather?: () => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  activeTrip,
  currentView,
  onNavigate,
  onOpenSpecs,
  onPrint,
  onShareReceipt,
  onOpenFeedback,
  onOpenRideBrief: _onOpenRideBrief,
  onOpenTools,
  riderSpecs,
  isMenuOpen: propIsMenuOpen,
  onMenuOpenChange,
  dashboardBackTarget = 'home',
  onBackFromDashboard,
  onOpenMobileWeather,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const { user, openAuthModal, signOut, syncStatus, forceSyncNow } = useAuth();
  const { username } = useUserProfile();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = propIsMenuOpen !== undefined ? propIsMenuOpen : internalMenuOpen;
  const setIsMenuOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof open === 'function' ? open(isMenuOpen) : open;
    setInternalMenuOpen(nextVal);
    onMenuOpenChange?.(nextVal);
  };
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const [exportedFormat, setExportedFormat] = useState<'FIT' | 'GPX' | 'TCX' | null>(null);
  const exportFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exportFeedbackTimerRef.current !== null) {
        window.clearTimeout(exportFeedbackTimerRef.current);
      }
    };
  }, []);

  const triggerExportFeedback = (fmt: 'FIT' | 'GPX' | 'TCX') => {
    setExportedFormat(fmt);
    if (exportFeedbackTimerRef.current !== null) {
      window.clearTimeout(exportFeedbackTimerRef.current);
    }
    exportFeedbackTimerRef.current = window.setTimeout(() => {
      setExportedFormat(null);
    }, 1500);
  };

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
  const userDisplayName = username || (user?.email ? user.email.split('@')[0] : lang === 'fr' ? 'Cycliste' : 'Rider');
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
      <div className="px-2 pt-4 pb-2 text-xs font-rounded font-semibold text-ink-muted">
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
              className={`${labelCls} font-semibold leading-tight break-words ${
                danger ? 'text-rose-600 dark:text-rose-400' : 'text-ink'
              }`}
            >
              {label}
            </div>
            {sub && <div className={`${subCls} text-ink-muted leading-snug break-words mt-0.5`}>{sub}</div>}
          </div>
          {trailing !== undefined
            ? trailing
            : onClick && <ChevronRight className="w-4 h-4 text-ink-muted/70 shrink-0" aria-hidden="true" />}
        </>
      );

      const base = `w-full flex items-center gap-3 px-3.5 ${rowH} py-2.5`;

      return onClick ? (
        <Button
          variant="ghost"
          size="md"
          role="menuitem"
          onClick={onClick}
          className={`${base} justify-start text-left whitespace-normal font-normal rounded-none cursor-pointer transition-colors active:scale-[0.99] ${
            danger
              ? 'hover:bg-rose-500/[0.07] active:bg-rose-500/10'
              : 'hover:bg-ink/[0.035] dark:hover:bg-white/[0.04] active:bg-ink/[0.06] dark:active:bg-white/[0.07]'
          } focus:outline-none focus-visible:bg-ink/[0.05] dark:focus-visible:bg-white/[0.06]`}
        >
          {content}
        </Button>
      ) : (
        <div className={base}>{content}</div>
      );
    };

    const Segmented = <T extends string>({
      value,
      options,
      onChange,
      ariaLabel,
      iconOnlyOnMobile = false,
    }: {
      value: T;
      options: { value: T; label: string; icon?: React.ElementType }[];
      onChange: (v: T) => void;
      ariaLabel: string;
      iconOnlyOnMobile?: boolean;
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
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={active}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all duration-150 cursor-pointer focus:outline-none ${
                m
                  ? iconOnlyOnMobile && OptIcon
                    ? 'min-h-[44px] w-11 sm:w-auto sm:px-3.5 text-[13px]'
                    : 'min-h-[44px] px-3.5 text-[13px]'
                  : 'h-8 px-2.5 text-xs'
              } ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                active
                  ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing} shadow-xs`
                  : 'ring-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {OptIcon && <OptIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 text-current" aria-hidden="true" />}
              <span className={iconOnlyOnMobile && OptIcon ? 'hidden sm:inline' : undefined}>
                {opt.label}
              </span>
            </Button>
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
            <div className={`${m ? 'text-[17px]' : 'text-base'} font-semibold text-ink tracking-tight break-words`}>
              {user ? userDisplayName : isFr ? 'Cycliste invité' : 'Guest rider'}
            </div>
            <div className={`${subCls} text-ink-muted break-words mt-0.5`}>
              {user ? user.email : syncStatusLabel}
            </div>
          </div>
          {m && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMenuOpen(false)}
              className="w-11 h-11 p-0 rounded-full bg-pod dark:bg-white/[0.06] hover:bg-chip text-ink-secondary hover:text-ink flex items-center justify-center cursor-pointer transition-colors shrink-0"
              aria-label={t('menuCloseAria')}
            >
              <X size={18} />
            </Button>
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
                  <ActionButton
                    label={t('syncNowBtn')}
                    pendingLabel={t('syncStatusSaving')}
                    successLabel={t('cloudSynced')}
                    onAction={async () => {
                      await forceSyncNow();
                    }}
                    icon={
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncStatus === 'saving' ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full font-semibold cursor-pointer transition-colors shrink-0 bg-card dark:bg-white/[0.08] hover:bg-chip text-ink ${
                      m ? 'min-h-[44px] px-4 text-[13px]' : 'h-8 px-3 text-xs'
                    }`}
                  />
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
              <Button
                variant="primary"
                size={m ? 'lg' : 'md'}
                onClick={() => {
                  setIsMenuOpen(false);
                  openAuthModal('login');
                }}
                className={`mt-3.5 w-full inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-all hover:brightness-[0.97] active:scale-[0.99] shadow-xs ${YELLOW_VEST_SOLID_CTA_CLASSES} ${
                  m ? 'h-12 text-[15px]' : 'h-10 text-sm'
                }`}
              >
                {t('logInOrSignUp')}
              </Button>
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
                iconOnlyOnMobile
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

        {/* ── Ride ── */}
        {(onOpenSpecs || onOpenTools) && (
          <>
            <SectionLabel>{isFr ? 'Sortie' : 'Ride'}</SectionLabel>
            <Group>
              {onOpenSpecs && (
                <Row
                  theme="sky"
                  icon={Bicycle}
                  label={t('specsModalTitle')}
                  sub={
                    riderSpecs && activeBike
                      ? riderSpecs.cockpitViewMode === 'pro'
                        ? `${activeBike.name} · ${riderSpecs.ftpWatts} W · ${
                            activeBike.isTubeless ? 'Tubeless' : isFr ? 'Chambre' : 'Tube'
                          }`
                        : activeBike.name
                      : undefined
                  }
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSpecs();
                  }}
                />
              )}
              {onOpenSpecs && onOpenTools && <Divider />}
              {onOpenTools && (
                <Row
                  theme="purple"
                  icon={Calculator}
                  label={isFr ? 'Outils' : 'Tools'}
                  sub={isFr ? 'Vent · Heure de départ · Pression' : 'Wind · Leave-by · Tire pressure'}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenTools('wind');
                  }}
                />
              )}
            </Group>
          </>
        )}

        {/* ── Export & share ── */}
        {(activeTrip || onPrint || onShareReceipt) && (
          <>
            <SectionLabel>{isFr ? 'Export & partage' : 'Export & share'}</SectionLabel>
            <Group>
              <div className="p-3 space-y-2.5">
                {activeTrip && activeMeta && (
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className={`${subCls} font-medium text-ink truncate`}>
                      {activeMeta.name}
                    </span>
                    <span className="text-[11px] font-rounded font-semibold text-ink-muted tnum shrink-0">
                      {activeTrip.route.distanceKm} km
                    </span>
                  </div>
                )}

                {activeTrip && (
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          id: 'FIT' as const,
                          label: '.FIT',
                          hint: 'Garmin · Wahoo',
                          icon: Download,
                          iconCls: 'text-amber-600 dark:text-amber-400',
                          onExport: () =>
                            void import('../../utils/fitExporter').then(({ downloadTripFit }) =>
                              downloadTripFit(activeTrip, {
                                lang,
                                ftpWatts: riderSpecs?.ftpWatts,
                                carbTargetGPerHr: riderSpecs?.carbTargetGPerHr,
                                nutritionPreference: riderSpecs?.nutritionPreference,
                              })
                            ),
                        },
                        {
                          id: 'GPX' as const,
                          label: '.GPX',
                          hint: isFr ? 'Universel' : 'Universal',
                          icon: Download,
                          iconCls: 'text-sky-600 dark:text-sky-400',
                          onExport: () =>
                            void import('../../utils/gpxExporter').then(({ downloadTripGpx }) =>
                              downloadTripGpx(activeTrip)
                            ),
                        },
                        {
                          id: 'TCX' as const,
                          label: '.TCX',
                          hint: isFr ? 'Parcours' : 'Courses',
                          icon: Compass,
                          iconCls: 'text-emerald-600 dark:text-emerald-400',
                          onExport: () =>
                            void import('../../utils/gpxExporter').then(({ downloadTripTcx }) =>
                              downloadTripTcx(activeTrip)
                            ),
                        },
                      ] as const
                    ).map((fmt) => {
                      const isDone = exportedFormat === fmt.id;
                      const FmtIcon = isDone ? Check : fmt.icon;
                      return (
                        <Button
                          key={fmt.id}
                          variant="ghost"
                          size="sm"
                          role="menuitem"
                          onClick={() => {
                            fmt.onExport();
                            triggerExportFeedback(fmt.id);
                          }}
                          className={`min-h-[48px] px-2 py-2 rounded-[14px] flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-[0.98] ${
                            isDone
                              ? `${CHIP_TOKENS.emerald.surface} ${CHIP_TOKENS.emerald.primary} ring-1 ring-inset ring-emerald-500/35`
                              : 'bg-card dark:bg-white/[0.07] hover:bg-chip text-ink ring-1 ring-inset ring-ink/[0.04] dark:ring-white/[0.06]'
                          }`}
                        >
                          <div className="inline-flex items-center gap-1 text-xs font-rounded font-bold tnum">
                            <FmtIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isDone ? 'text-current' : fmt.iconCls
                              }`}
                              aria-hidden="true"
                            />
                            <span>{isDone ? (isFr ? 'Enregistré' : 'Saved') : fmt.label}</span>
                          </div>
                          <span className="text-[10px] font-medium text-ink-muted leading-tight truncate max-w-full">
                            {fmt.hint}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                )}

                {(onShareReceipt || onPrint) && (
                  <div
                    className={`grid gap-2 ${
                      onShareReceipt && onPrint ? 'grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {onShareReceipt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        role="menuitem"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onShareReceipt();
                        }}
                        className="min-h-[44px] px-3 rounded-[14px] bg-card dark:bg-white/[0.07] hover:bg-chip text-ink text-xs font-rounded font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-inset ring-ink/[0.04] dark:ring-white/[0.06] active:scale-[0.98]"
                      >
                        <ShareNetwork className="w-3.5 h-3.5 shrink-0 text-lime-700 dark:text-lime-400" aria-hidden="true" />
                        <span>{isFr ? 'Partager' : 'Share ride'}</span>
                      </Button>
                    )}
                    {onPrint && (
                      <Button
                        variant="ghost"
                        size="sm"
                        role="menuitem"
                        onClick={() => {
                          setIsMenuOpen(false);
                          requestAnimationFrame(() => onPrint());
                        }}
                        className="min-h-[44px] px-3 rounded-[14px] bg-card dark:bg-white/[0.07] hover:bg-chip text-ink text-xs font-rounded font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-inset ring-ink/[0.04] dark:ring-white/[0.06] active:scale-[0.98]"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span>{isFr ? 'Imprimer A4' : 'Print A4'}</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Group>
          </>
        )}

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
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFeedback();
                  }}
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
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-1 text-[11px] text-ink-muted font-rounded tnum">
          <span>{t('appName')}</span>
          <span aria-hidden="true">·</span>
          <span>v4.0</span>
        </div>
      </div>
    );
  };

  return (
    <header className="w-full transition-colors duration-200 select-none no-print relative z-40">
      <div className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-5 lg:px-7 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pb-4 flex items-center justify-between lg:grid lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
        {/* Left: Back Button on Ride Plan (dashboard), or Chain-Link Brand Identifier */}
        {currentView === 'dashboard' ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => (onBackFromDashboard ? onBackFromDashboard() : onNavigate('home'))}
            className="lg:col-span-1 lg:justify-self-start inline-flex items-center gap-1.5 min-h-[44px] h-10 px-4 rounded-full bg-card hover:bg-pod text-ink border border-ink/5 dark:border-white/5 text-xs font-semibold shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 text-current shrink-0" />
            <span>
              {dashboardBackTarget === 'trips'
                ? isFr
                  ? 'Trajets'
                  : 'Trips'
                : isFr
                ? 'Accueil'
                : 'Home'}
            </span>
          </Button>
        ) : (
          <>
            {currentView === 'home' && onOpenMobileWeather && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenMobileWeather}
                className="md:hidden inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-full bg-card hover:bg-pod text-ink border border-ink/5 dark:border-white/5 text-xs font-semibold shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
                <span>{t('weatherCardTitle')}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="md"
              onClick={() => onNavigate('home')}
              className={`${currentView === 'home' ? 'hidden md:flex' : 'flex'} lg:col-span-1 lg:justify-self-start items-center gap-2.5 sm:gap-3.5 min-h-[44px] p-0 hover:bg-transparent min-w-0 cursor-pointer group text-left focus:outline-none`}
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
                <span className="font-semibold tracking-tight text-ink text-[15px] sm:text-[17px] break-words">
                  {t('appName')}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-ink-muted hidden md:block mt-0.5">
                {t('headerTagline')}
              </p>
            </div>
          </Button>
          </>
        )}

        {/* Center: Live Operational Breadcrumb (Desktop) */}
        <div className="hidden lg:flex lg:col-span-3 lg:justify-self-center min-w-0 max-w-full">
          {activeTrip && activeMeta && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate(breadcrumbTargetView)}
              title={`${isFr ? 'Conditions de sortie' : 'Ride outlook'}: ${physics?.goStatus === 'GO' ? t('feasibilityOptimal') : physics?.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')} — ${physics?.goStatusReason || ''} (${currentView === 'dashboard' ? t('editParamsTitle') : t('openFlightDeckBtn')})`}
              className="flex items-center gap-2.5 px-4 py-2 bg-card dark:bg-pod hover:bg-pod dark:hover:bg-chip rounded-full font-rounded text-[13px] sm:text-sm shadow-xs min-w-0 max-w-xl transition-colors cursor-pointer focus:outline-none"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotClass}`}
                title={`${physics?.goStatus === 'GO' ? t('feasibilityOptimal') : physics?.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}: ${physics?.goStatusReason}`}
              />
              <span className="text-ink-muted font-rounded text-xs font-semibold shrink-0">
                {activeTrip.tag === 'VÉLOTAF' ? (lang === 'fr' ? 'Vélotaf' : 'Commute') : activeTrip.tag}
              </span>
              <span className="text-ink-muted shrink-0">/</span>
              <span className="text-ink font-semibold break-words leading-tight">{activeMeta.name}</span>
              <span className="text-ink-muted shrink-0">·</span>
              <span className="text-ink-secondary tnum font-bold shrink-0">
                {activeTrip.route.distanceKm} km
              </span>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                  physics?.goStatus === 'GO'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : physics?.goStatus === 'CAUTION'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                }`}
              >
                {physics?.goStatus === 'GO' ? t('feasibilityOptimal') : physics?.goStatus === 'CAUTION' ? t('feasibilityCaution') : t('feasibilitySevere')}
              </span>
            </Button>
          )}
        </div>

        {/* Right: Trip Setup on Ride Plan (dashboard), or Sync Clock & Profile Overlay Trigger */}
        {currentView === 'dashboard' ? (
          <div className="lg:col-span-1 lg:justify-self-end flex items-center shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('configurator')}
              className="inline-flex items-center gap-1.5 min-h-[44px] h-10 px-4 rounded-full bg-card hover:bg-pod text-ink border border-ink/5 dark:border-white/5 text-xs font-semibold shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <SlidersHorizontal className="w-4 h-4 text-current shrink-0" />
              <span>{isFr ? 'Configuration' : 'Trip Setup'}</span>
            </Button>
          </div>
        ) : (
          <div className="lg:col-span-1 lg:justify-self-end flex items-center gap-2 sm:gap-3 shrink-0 relative" ref={menuContainerRef}>
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center px-3.5 py-2 bg-card dark:bg-pod rounded-full text-xs sm:text-[13px] font-rounded text-ink shadow-xs">
            <span className="font-bold text-ink tnum">{currentTime}</span>
          </div>

          {/* Unified Profile & Utility Trigger Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label={t('menuOpenAria')}
            title={user ? `${user.email} (${t('cloudSynced')})` : t('savedOnDeviceClickToSync')}
            className={`relative w-11 h-11 sm:w-10 sm:h-10 p-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs select-none focus:outline-none ring-2 ${
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
          </Button>


          {/* ══════════════════════════════════════════════════════════════════
              DESKTOP SETTINGS POPOVER (anchored to avatar trigger)
             ══════════════════════════════════════════════════════════════════ */}
          {isMenuOpen && (
            <div
              role="menu"
              aria-label={isFr ? 'Réglages' : 'Settings'}
              className="hidden sm:block absolute right-0 top-full mt-3 w-[23rem] max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain bg-card dark:bg-[#18181B] border border-ink/[0.06] dark:border-white/[0.08] rounded-[28px] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-50 animate-apple-popover select-none"
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
                  className="fixed inset-0 z-[60] bg-black/85 animate-apple-fade-in touch-none"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Inset floating card */}
                <div
                  ref={mobileSheetRef}
                  role="menu"
                  aria-label={isFr ? 'Réglages' : 'Settings'}
                  className="fixed inset-x-3.5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[65] max-w-lg mx-auto bg-card dark:bg-[#18181B] border-0 rounded-[32px] px-4 pt-3 pb-4 shadow-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto overscroll-contain animate-apple-modal select-none"
                >
                  {/* Grabber */}
                  <div className="w-10 h-1 bg-ink/15 dark:bg-white/20 rounded-full mx-auto mb-3" />
                  {renderPanel(true)}
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </header>
  );
};
