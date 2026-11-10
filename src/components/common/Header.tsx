import React, { useState, useEffect, useRef } from 'react';
import {
  Bicycle,
  Compass,
  SlidersHorizontal,
  SquaresFour,
  HomeSmile,
  Printer,
  Download,
  CaretDown,
  Plus,
  Sun,
  Moon,
  List,
  X,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { downloadTripGpx, downloadTripTcx } from '../../utils/gpxExporter';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';

interface HeaderProps {
  onOpenSpecs?: () => void;
  currentView: 'home' | 'configurator' | 'dashboard';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard') => void;
  activeTrip: TripProfile;
  allTrips: TripProfile[];
  onSelectTrip: (id: string) => void;
  onCreateNew: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeTrip,
  allTrips,
  onSelectTrip,
  onCreateNew,
  onOpenSpecs,
  onPrint,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  const themeToggleLabel = isDark ? t('switchToLight') : t('switchToDark');

  return (
    <>
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 z-40 lg:hidden no-print"
          aria-hidden="true"
        />
      )}

      <header
        ref={headerRef}
        className="sticky top-0 z-50 bg-canvas w-full px-4 sm:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] pb-3.5 sm:pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] sm:pb-3.5 transition-colors duration-200 no-print"
      >
        <div className="max-w-7xl mx-auto">
          {/* ── DESKTOP LAYOUT (lg+) ── */}
          <div className="hidden lg:flex items-center justify-between w-full gap-4">
            {/* Left: Chain-Link Brand Mark */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 cursor-pointer group select-none text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-full bg-[#111111] text-volt dark:bg-[#F5F5F7] dark:text-[#111111] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <svg className="keyline-icon w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                  <circle cx="17" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                  <path d="M9.5 9.2c1.6.9 3.4.9 5 0" />
                  <path d="M9.5 14.8c1.6-.9 3.4-.9 5 0" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tracking-tight text-ink text-[15px]">
                    {t('appName')}
                  </span>
                </div>
                <p className="text-xs text-ink-muted hidden xl:block">
                  {t('headerTagline')}
                </p>
              </div>
            </button>

            {/* Center: Full-Radius View Navigation Switcher */}
            <nav
              aria-label={t('navPrimaryViewsAria')}
              className="flex items-center bg-card rounded-full p-1 text-[13px] font-medium"
            >
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  currentView === 'home'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-pod'
                }`}
              >
                <HomeSmile className={`w-4.5 h-4.5 transition-colors duration-200 ${currentView === 'home' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navHome')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('configurator')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  currentView === 'configurator'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-pod'
                }`}
              >
                <SlidersHorizontal className={`w-4.5 h-4.5 transition-colors duration-200 ${currentView === 'configurator' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navConfigurator')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-pod'
                }`}
              >
                <SquaresFour className={`w-4.5 h-4.5 transition-colors duration-200 ${currentView === 'dashboard' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navFlightDeck')}</span>
              </button>
            </nav>

            {/* Right: Full-Radius Trip Selector, Utility Pills & Primary CTA */}
            <div className="flex items-center gap-2">
              {/* Trip Selector Capsule */}
              <div className="flex items-center gap-2 bg-card hover:bg-pod transition-colors rounded-full h-10 px-4 text-[13px]">
                <span className="w-2 h-2 rounded-full bg-beacon-green dark:bg-volt dark:shadow-beacon-volt shrink-0" />
                <div className="relative flex items-center">
                  <select
                    aria-label={t('activeTripAria')}
                    value={activeTrip.id}
                    onChange={(e) => onSelectTrip(e.target.value)}
                    className="appearance-none bg-transparent text-ink font-medium cursor-pointer pr-5 focus:outline-none text-[13px] max-w-[260px] lg:max-w-[360px] xl:max-w-[480px]"
                  >
                    {allTrips.map((tripItem) => {
                      const meta = getLocalizedTripMeta(tripItem, lang);
                      return (
                        <option key={tripItem.id} value={tripItem.id} className="bg-card text-ink">
                          {meta.name}
                        </option>
                      );
                    })}
                  </select>
                  <CaretDown className="w-4 h-4 text-ink-muted absolute right-0 pointer-events-none" />
                </div>
              </div>

              {/* Specs Circular Button */}
              {onOpenSpecs && (
                <button
                  type="button"
                  onClick={onOpenSpecs}
                  title={t('specsButtonTitle')}
                  aria-label={t('specsButtonTitle')}
                  className="w-10 h-10 shrink-0 rounded-full bg-card hover:bg-pod transition-colors flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer"
                >
                  <Bicycle className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Print Circular Button */}
              <button
                type="button"
                onClick={onPrint}
                title={t('printButtonTitle')}
                aria-label={t('printButtonTitle')}
                className="w-10 h-10 rounded-full bg-card hover:bg-pod transition-colors flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Lightweight Language Switch Capsule (EN | FR) */}
              <div
                role="group"
                aria-label={t('switchLanguageAria')}
                className="flex items-center bg-card rounded-full p-1 h-10 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                  className={`px-2.5 h-8 rounded-full transition-all cursor-pointer ${
                    lang === 'en'
                      ? 'bg-[#111111] text-volt dark:bg-chip dark:text-volt'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('fr')}
                  aria-pressed={lang === 'fr'}
                  className={`px-2.5 h-8 rounded-full transition-all cursor-pointer ${
                    lang === 'fr'
                      ? 'bg-[#111111] text-volt dark:bg-chip dark:text-volt'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  FR
                </button>
              </div>

              {/* Circular Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
                className="w-10 h-10 rounded-full bg-card hover:bg-pod transition-colors flex items-center justify-center text-ink cursor-pointer"
              >
                {isDark ? (
                  <Sun size={20} className="w-5 h-5 text-volt transition-transform hover:rotate-45" weight="bold" />
                ) : (
                  <Moon size={20} className="w-5 h-5 text-[#111111] transition-transform hover:-rotate-12" weight="bold" />
                )}
              </button>

              {/* Primary Solid Pill CTA */}
              <button
                type="button"
                onClick={onCreateNew}
                className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-[#F5F5F7] dark:hover:bg-white dark:text-[#111111] text-[13px] font-medium transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
                <span>{t('newTripButton')}</span>
              </button>
            </div>
          </div>

          {/* ── MOBILE / TABLET LAYOUT (< lg) ── */}
          <div className="lg:hidden flex flex-col w-full">
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 cursor-pointer select-none min-w-0 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#111111] text-volt dark:bg-[#F5F5F7] dark:text-[#111111] flex items-center justify-center shrink-0">
                  <svg className="keyline-icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                    <circle cx="17" cy="12" r="3.5" fill="currentColor" fillOpacity="0.4" />
                    <path d="M9.5 9.2c1.6.9 3.4.9 5 0" />
                    <path d="M9.5 14.8c1.6-.9 3.4-.9 5 0" />
                  </svg>
                </div>
                <span className="font-semibold tracking-tight text-ink text-sm sm:text-base break-words">
                  {t('appName')}
                </span>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mobile EN / FR Segmented Switch */}
                <div
                  role="group"
                  aria-label={t('switchLanguageAria')}
                  className="flex items-center bg-card rounded-full p-0.5 h-9 text-[11px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    aria-pressed={lang === 'en'}
                    className={`px-2 h-8 rounded-full transition-all cursor-pointer ${
                      lang === 'en'
                        ? 'bg-[#111111] text-volt dark:bg-chip dark:text-volt'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('fr')}
                    aria-pressed={lang === 'fr'}
                    className={`px-2 h-8 rounded-full transition-all cursor-pointer ${
                      lang === 'fr'
                        ? 'bg-[#111111] text-volt dark:bg-chip dark:text-volt'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    FR
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={themeToggleLabel}
                  className="w-9 h-9 rounded-full bg-card hover:bg-pod transition-colors flex items-center justify-center text-ink cursor-pointer"
                >
                  {isDark ? (
                    <Sun size={20} className="w-5 h-5 text-volt" weight="bold" />
                  ) : (
                    <Moon size={20} className="w-5 h-5 text-[#111111]" weight="bold" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-navigation-drawer"
                  aria-label={isMobileMenuOpen ? t('menuCloseAria') : t('menuOpenAria')}
                  className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isMobileMenuOpen
                      ? 'bg-[#111111] text-white dark:bg-[#F5F5F7] dark:text-[#111111]'
                      : 'bg-card text-ink hover:bg-pod'
                  }`}
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  <span>{isMobileMenuOpen ? t('menuClose') : t('menuOpen')}</span>
                </button>
              </div>
            </div>

            {/* Always-Visible Mobile View Switcher */}
            <nav
              aria-label={t('navMobileViewsAria')}
              className="mt-3 grid grid-cols-3 gap-1 bg-card rounded-full p-1 text-xs font-medium"
            >
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-full transition-all cursor-pointer ${
                  currentView === 'home'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <HomeSmile className={`w-4 h-4 ${currentView === 'home' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navHome')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('configurator');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-full transition-all cursor-pointer ${
                  currentView === 'configurator'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <SlidersHorizontal className={`w-4 h-4 ${currentView === 'configurator' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navConfigShort')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-full transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-[#111111] text-white dark:bg-chip dark:text-ink font-medium'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <SquaresFour className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-volt' : 'text-ink-muted'}`} />
                <span>{t('navFlightDeck')}</span>
              </button>
            </nav>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
              <div
                id="mobile-navigation-drawer"
                className="mt-3 p-5 rounded-card bg-card flex flex-col gap-4 max-h-[calc(100vh-140px)] overflow-y-auto"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-ink-muted">
                      {t('activeTripAria')}
                    </span>
                    <span className="text-xs font-medium bg-pod text-ink-secondary px-2.5 py-0.5 rounded-full tnum">
                      {t('savedCountBadge', { count: allTrips.length })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <select
                        value={activeTrip.id}
                        onChange={(e) => {
                          onSelectTrip(e.target.value);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full appearance-none bg-pod text-ink font-medium rounded-full h-10 px-4 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-ink/20 cursor-pointer"
                      >
                        {allTrips.map((tripItem) => {
                          const meta = getLocalizedTripMeta(tripItem, lang);
                          return (
                            <option key={tripItem.id} value={tripItem.id} className="bg-card text-ink">
                              {meta.name}
                            </option>
                          );
                        })}
                      </select>
                      <CaretDown className="w-4 h-4 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateNew();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-1.5 h-10 px-4 bg-[#111111] text-white dark:bg-[#F5F5F7] dark:text-[#111111] font-medium text-xs rounded-full transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[2.2]" />
                      <span>{t('newTripButton')}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {onOpenSpecs && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSpecs();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full text-xs text-ink bg-pod hover:bg-chip transition-colors cursor-pointer text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shrink-0">
                        <Bicycle className="w-4 h-4 text-ink" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-ink break-words leading-tight">{t('drawerSpecsTitle')}</div>
                        <div className="text-[11px] text-ink-muted break-words leading-tight mt-0.5">{t('drawerSpecsSub')}</div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onPrint();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full text-xs text-ink bg-pod hover:bg-chip transition-colors cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shrink-0">
                      <Printer className="w-4 h-4 text-ink" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink break-words leading-tight">{t('drawerPrintTitle')}</div>
                      <div className="text-[11px] text-ink-muted break-words leading-tight mt-0.5">{t('drawerPrintSub')}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadTripGpx(activeTrip);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full text-xs text-ink bg-pod hover:bg-chip transition-colors cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink break-words leading-tight">{t('drawerGpxTitle')}</div>
                      <div className="text-[11px] text-ink-muted break-words leading-tight mt-0.5">{t('drawerGpxSub')}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadTripTcx(activeTrip);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full text-xs text-ink bg-pod hover:bg-chip transition-colors cursor-pointer text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink break-words leading-tight">{t('drawerTcxTitle')}</div>
                      <div className="text-[11px] text-ink-muted break-words leading-tight mt-0.5">{t('drawerTcxSub')}</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
