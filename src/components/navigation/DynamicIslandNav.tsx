import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  SlidersHorizontal,
  HomeSmile,
  Plus,
  CircleChevronUp,
  CircleChevronDown,
  Check,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { calculatePhysics } from '../../utils/physics';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

export interface DynamicIslandNavProps {
  currentView: 'home' | 'configurator' | 'dashboard';
  onNavigate: (view: 'home' | 'configurator' | 'dashboard') => void;
  activeTrip?: TripProfile | null;
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
  const riderSpecs = useMemo(() => loadRiderBikeSpecs(), []);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Calculate live physics for dynamic telemetry status dot (if activeTrip is defined)
  const physics = activeTrip
    ? calculatePhysics(
        activeTrip.physics,
        activeTrip.route,
        activeTrip.weather,
        lang,
        riderSpecs?.ftpWatts
      )
    : null;
  const isGo = physics?.goStatus === 'GO';
  const isCaution = physics?.goStatus === 'CAUTION';

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

  const activeMeta = activeTrip ? getLocalizedTripMeta(activeTrip, lang) : null;
  const yellowVest = CHIP_TOKENS['yellow-vest'];
  const navBtnBase = `inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:h-10 px-0 sm:px-4.5 rounded-full text-xs sm:text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.96] cursor-pointer focus:outline-none shrink-0 ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES}`;
  const navBtnActive = `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing} shadow-xs`;
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

          {/* View 3: Cockpit */}
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
          {activeTrip && activeMeta ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSwitcherOpen((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 sm:gap-2.5 min-h-[36px] sm:h-10 py-1 sm:py-0 px-2.5 sm:px-4.5 max-w-full min-w-0 rounded-full text-xs sm:text-[13.5px] font-semibold transition-all duration-150 cursor-pointer focus:outline-none ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                isSwitcherOpen
                  ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                  : `${CHIP_RING_UNSELECTED} bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 dark:text-zinc-200`
              }`}
              title={`${activeMeta.name} — ${t('feasibilityStatus')}: ${physics?.goStatus || 'GO'} (${physics?.goStatusReason || ''})`}
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
                aria-hidden="true"
              />
              <span className="break-words leading-tight text-left">
                {activeMeta.name}
              </span>
              <span
                className={`hidden min-[480px]:inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  isGo
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : isCaution
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                }`}
              >
                {physics?.goStatus || 'GO'}
              </span>
              {isSwitcherOpen ? (
                <CircleChevronUp className="w-4 h-4 shrink-0 text-current" />
              ) : (
                <CircleChevronDown className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateNew}
              className={`inline-flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-full text-xs font-semibold ${yellowVest.surface} ${yellowVest.primary} ${CHIP_RING_BASE} ${yellowVest.selectedRing} ${CHIP_DUOTONE_ISOLATION_CLASSES} cursor-pointer`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('createNewTripBtn')}</span>
            </button>
          )}

          {/* ── TRIP SWITCHER / SELECTOR (CENTERED ABOVE PILL ON MOBILE, ANCHORED ABOVE BUTTON ON SM+) ── */}
          {isSwitcherOpen && (
            <div
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 w-[min(22rem,calc(100vw-1.5rem))] sm:w-96 max-w-[calc(100vw-1.5rem)] z-50 pointer-events-auto"
            >
              <div
                role="listbox"
                aria-label={t('activeTripAria')}
                className="w-full bg-white dark:bg-[#161618] rounded-[24px] p-3 text-ink dark:text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_55px_rgba(0,0,0,0.7)] border border-black/5 dark:border-white/10 animate-apple-popover"
              >
                {/* Header with Active Trip Count & New Trip Action */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#E5E3DD] dark:border-[#2C2C30] px-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted dark:text-zinc-400 font-bold">
                    {t('activeTripAria')} ({allTrips.length})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateNew();
                      setIsSwitcherOpen(false);
                    }}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-[0.96] hover:brightness-[0.97] dark:hover:brightness-110 ${yellowVest.surface} ${yellowVest.primary} ${CHIP_DUOTONE_ISOLATION_CLASSES}`}
                  >
                    <Plus className="w-3.5 h-3.5 text-current stroke-[2.5] shrink-0" />
                    <span>{t('newTripButton')}</span>
                  </button>
                </div>

                {/* Active Trip Feasibility Insight Capsule */}
                {physics && activeTrip && (
                  <div className="mb-2.5 p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-ink/5 dark:border-white/5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-zinc-400 font-bold">
                        {t('rideFeasibility')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isGo
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : isCaution
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isGo
                              ? CHIP_TOKENS.emerald.dot
                              : isCaution
                              ? CHIP_TOKENS.amber.dot
                              : CHIP_TOKENS.rose.dot
                          }`}
                        />
                        {physics.goStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary dark:text-zinc-300 leading-snug">
                      {physics.goStatusReason}
                    </p>
                  </div>
                )}

                {/* Scrollable Trip Options (Constant dimensions in all states) */}
                <div className="max-h-56 sm:max-h-60 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
                  {allTrips.map((tripItem) => {
                    const meta = getLocalizedTripMeta(tripItem, lang);
                    const isSelected = activeTrip ? tripItem.id === activeTrip.id : false;
                    const itemPhysics = calculatePhysics(
                      tripItem.physics,
                      tripItem.route,
                      tripItem.weather,
                      lang,
                      riderSpecs?.ftpWatts
                    );
                    const itemIsGo = itemPhysics.goStatus === 'GO';
                    const itemIsCaution = itemPhysics.goStatus === 'CAUTION';

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
                        title={`${meta.name} — ${itemPhysics.goStatus}: ${itemPhysics.goStatusReason}`}
                        className={`w-full flex items-center justify-between px-3 sm:px-3.5 py-2.5 rounded-xl text-[13px] text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                          isSelected
                            ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                            : `${CHIP_RING_UNSELECTED} bg-[#F4F3EF] hover:bg-[#EBE9E3] text-[#111111] dark:bg-[#202023] dark:hover:bg-[#2C2C30] dark:text-[#F5F5F7]`
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 font-semibold whitespace-normal break-words leading-snug">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                itemIsGo
                                ? CHIP_TOKENS.emerald.dot
                                : itemIsCaution
                                ? CHIP_TOKENS.amber.dot
                                : CHIP_TOKENS.rose.dot
                              }`}
                              aria-hidden="true"
                            />
                            <span className="break-words leading-tight">{meta.name}</span>
                          </div>
                          <div
                            className={`text-[11px] font-mono mt-0.5 break-words leading-tight ${
                              isSelected ? 'opacity-80' : 'text-ink-muted dark:text-zinc-400'
                            }`}
                          >
                            <span className="font-semibold uppercase mr-1">
                              {itemPhysics.goStatus}
                            </span>
                            · {tripItem.tag} · {tripItem.route.distanceKm} km · {tripItem.route.elevationGainM ?? Math.round(tripItem.route.distanceKm * 6.5)}m+
                          </div>
                        </div>
                        {isSelected && (
                          <div className="animate-apple-check-pop shrink-0">
                            <Check className="w-4 h-4 text-current stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Status Legend Footer */}
                <div className="mt-2.5 pt-2 border-t border-[#E5E3DD] dark:border-[#2C2C30] px-1 flex items-center justify-between text-[10px] font-mono text-ink-muted dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.emerald.dot}`} />
                    GO
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.amber.dot}`} />
                    CAUTION
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${CHIP_TOKENS.rose.dot}`} />
                    NO-GO
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { DynamicIslandNav as FloatingWebsiteHeader };
export default DynamicIslandNav;

