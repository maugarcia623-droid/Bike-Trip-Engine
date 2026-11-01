import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  SlidersHorizontal,
  HomeSmile,
  Plus,
  CaretUp,
  CaretDown,
  Check,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { calculatePhysics } from '../../utils/physics';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

interface DynamicIslandNavProps {
  currentView: 'home' | 'configurator' | 'dashboard';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard') => void;
  activeTrip: TripProfile;
  allTrips: TripProfile[];
  onSelectTrip: (id: string) => void;
  onCreateNew: () => void;
  onPrint?: () => void;
  onOpenSpecs?: () => void;
  onResetDefaults?: () => void;
}

export const DynamicIslandNav: React.FC<DynamicIslandNavProps> = ({
  currentView,
  onNavigate,
  activeTrip,
  allTrips,
  onSelectTrip,
  onCreateNew,
}) => {
  const { lang, t } = useTranslation();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Calculate live physics for dynamic telemetry status dot
  const physics = calculatePhysics(activeTrip.physics, activeTrip.route, activeTrip.weather, lang);
  const isGo = physics.goStatus === 'GO';
  const isCaution = physics.goStatus === 'CAUTION';

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setIsSwitcherOpen(false);
      } else if (e.key === '1') {
        onNavigate('home');
      } else if (e.key === '2') {
        onNavigate('configurator');
      } else if (e.key === '3') {
        onNavigate('dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  // Click outside to dismiss trip switcher (with micro-delay to prevent synthesized click collisions)
  useEffect(() => {
    if (!isSwitcherOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSwitcherOpen]);

  const activeMeta = getLocalizedTripMeta(activeTrip, lang);
  const yellowVest = CHIP_TOKENS['yellow-vest'];
  const navBtnBase = `inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:h-10 px-0 sm:px-4.5 rounded-full text-xs sm:text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer focus:outline-none shrink-0 ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES}`;
  const navBtnActive = `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`;
  const navBtnInactive = `${CHIP_RING_UNSELECTED} text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/70`;

  return (
    <div
      className="fixed bottom-[max(0.875rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-1.5rem)] select-none print:hidden no-print"
      aria-label={t('navPrimaryViewsAria')}
    >
      {/* ── THE DYNAMIC ISLAND PILL (OVERFLOW-VISIBLE SO POPOVER FLOATS FREELY ABOVE) ── */}
      <div
        ref={switcherRef}
        className="relative flex items-center gap-1 sm:gap-2.5 p-1.5 sm:p-2.5 max-w-full rounded-full bg-white dark:bg-[#111114] text-ink dark:text-white shadow-[0_16px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5)] overflow-visible transition-colors duration-150"
      >
        {/* Primary Views Navigation */}
        <nav
          className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0"
          aria-label={t('navPrimaryViewsAria')}
        >
          {/* View 1: Trips (Home) */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            title={t('navHome')}
            aria-label={t('navHome')}
            aria-current={currentView === 'home' ? 'page' : undefined}
            className={`${navBtnBase} ${currentView === 'home' ? navBtnActive : navBtnInactive}`}
          >
            <HomeSmile className="w-4 h-4 shrink-0 text-current" />
            <span className="hidden sm:inline whitespace-nowrap">{t('navHome')}</span>
          </button>

          {/* View 2: Configurator */}
          <button
            type="button"
            onClick={() => onNavigate('configurator')}
            title={t('navConfigurator')}
            aria-label={t('navConfigurator')}
            aria-current={currentView === 'configurator' ? 'page' : undefined}
            className={`${navBtnBase} ${
              currentView === 'configurator' ? navBtnActive : navBtnInactive
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0 text-current" />
            <span className="hidden sm:inline whitespace-nowrap">{t('navConfigurator')}</span>
          </button>

          {/* View 3: Flight Deck */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            title={t('navFlightDeck')}
            aria-label={t('navFlightDeck')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
            className={`${navBtnBase} ${
              currentView === 'dashboard' ? navBtnActive : navBtnInactive
            }`}
          >
            <Compass className="w-4 h-4 shrink-0 text-current" />
            <span className="hidden sm:inline whitespace-nowrap">{t('navFlightDeck')}</span>
          </button>
        </nav>

        {/* Divider */}
        <span className="w-px h-4 sm:h-5 bg-[#E5E3DD] dark:bg-[#2C2C30] shrink-0 mx-0.5" aria-hidden="true" />

        {/* ── PROJECT TITLE BUTTON & DEDICATED TRIP SELECTOR DROPDOWN ── */}
        <div className="min-w-0 flex-1 sm:flex-initial sm:relative z-50">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSwitcherOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 sm:gap-2.5 h-9 sm:h-10 px-2.5 sm:px-4.5 max-w-full min-w-0 rounded-full text-xs sm:text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer focus:outline-none ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
              isSwitcherOpen
                ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                : `${CHIP_RING_UNSELECTED} bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 dark:text-zinc-200`
            }`}
            title="Open Trip Selector"
            aria-expanded={isSwitcherOpen}
            aria-haspopup="listbox"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isGo
                  ? CHIP_TOKENS.emerald.dot
                  : isCaution
                  ? CHIP_TOKENS.amber.dot
                  : CHIP_TOKENS.rose.dot
              }`}
            />
            <span className="truncate max-w-[96px] min-[360px]:max-w-[145px] min-[400px]:max-w-[180px] sm:max-w-[220px] md:max-w-[280px]">
              {activeMeta.name}
            </span>
            {isSwitcherOpen ? (
              <CaretDown className="w-4 h-4 shrink-0 text-current stroke-[2.2]" />
            ) : (
              <CaretUp className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400 stroke-[2.2]" />
            )}
          </button>

          {/* ── TRIP SWITCHER / SELECTOR (CENTERED ABOVE PILL ON MOBILE, ANCHORED ABOVE BUTTON ON SM+) ── */}
          {isSwitcherOpen && (
            <div
              role="listbox"
              aria-label={t('activeTripAria')}
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 sm:min-w-full w-[min(20rem,calc(100vw-1.5rem))] sm:w-84 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#161618] rounded-[24px] p-3 text-ink dark:text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_55px_rgba(0,0,0,0.7)] z-50 animate-fade-in"
            >
              {/* Header with Active Trip Count & New Trip Action */}
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#E5E3DD] dark:border-[#2C2C30] px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-zinc-400 font-bold truncate">
                  {t('activeTripAria')} ({allTrips.length})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNew();
                    setIsSwitcherOpen(false);
                  }}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer transition-all hover:brightness-[0.97] dark:hover:brightness-110 ${yellowVest.surface} ${yellowVest.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                >
                  <Plus className="w-3.5 h-3.5 text-current stroke-[2.5] shrink-0" />
                  <span>{t('newTripButton')}</span>
                </button>
              </div>

              {/* Scrollable Trip Options (Constant dimensions in all states) */}
              <div className="max-h-56 sm:max-h-60 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
                {allTrips.map((tripItem) => {
                  const meta = getLocalizedTripMeta(tripItem, lang);
                  const isSelected = tripItem.id === activeTrip.id;
                  return (
                    <button
                      key={tripItem.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrip(tripItem.id);
                        setIsSwitcherOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 sm:px-3.5 py-2.5 rounded-xl text-[13px] text-left transition-all duration-150 cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                        isSelected
                          ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                          : `${CHIP_RING_UNSELECTED} bg-[#F4F3EF] hover:bg-[#EBE9E3] text-[#111111] dark:bg-[#202023] dark:hover:bg-[#2C2C30] dark:text-[#F5F5F7]`
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold whitespace-normal break-words leading-snug">
                          {meta.name}
                        </div>
                        <div
                          className={`text-[11px] font-mono mt-0.5 truncate ${
                            isSelected ? 'opacity-80' : 'text-ink-muted dark:text-zinc-400'
                          }`}
                        >
                          {tripItem.tag} · {tripItem.route.distanceKm} km · {tripItem.route.elevationGainM ?? Math.round(tripItem.route.distanceKm * 6.5)}m+
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0 text-current stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
