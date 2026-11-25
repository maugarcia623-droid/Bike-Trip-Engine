import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlarmClock,
  Bakery,
  Banana,
  Bicycle,
  Calculator,
  Compass,
  CornerDownLeft,
  Gauge,
  HomeSmile,
  Moon,
  Plus,
  Printer,
  Scissors,
  Search,
  ShareNetwork,
  Hanger,
  SlidersHorizontal,
  Sun,
  X,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { AppView } from '../../utils/appNavigation';
import { FreeWebToolId, TOOL_CATALOG } from '../../utils/toolCatalog';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { calculatePhysics } from '../../utils/physics';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_RING_UNSELECTED,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

export interface QuickCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: AppView;
  trips: TripProfile[];
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onNavigateView: (view: AppView) => void;
  onLaunchTrip: (tripId: string) => void;
  onEditTrip: (trip: TripProfile) => void;
  onCreateNewTrip: () => void;
  onOpenTool: (toolId: FreeWebToolId) => void;
  onOpenSpecs: () => void;
  onShareReceipt?: () => void;
  onPrint?: () => void;
}

type CommandGroup = 'trips' | 'views' | 'tools' | 'actions';

interface CommandItem {
  id: string;
  group: CommandGroup;
  label: string;
  sub?: string;
  keywords: string;
  shortcut?: string;
  dotClass?: string;
  icon?: React.ElementType;
  isCurrent?: boolean;
  onRun: () => void;
  secondaryAction?: {
    label: string;
    onRun: () => void;
  };
}

const TOOL_ICON_MAP: Record<string, React.ElementType> = {
  'tyre-pressure': Gauge,
  'flip-my-loop': Compass,
  'fuel-plan': Banana,
  'water-bakery': Bakery,
  'what-to-wear': Hanger,
  'leave-by': AlarmClock,
  'stem-sticker': Scissors,
};

export const QuickCommandModal: React.FC<QuickCommandModalProps> = ({
  isOpen,
  onClose,
  currentView,
  trips,
  activeTrip,
  riderSpecs,
  onNavigateView,
  onLaunchTrip,
  onEditTrip,
  onCreateNewTrip,
  onOpenTool,
  onOpenSpecs,
  onShareReceipt,
  onPrint,
}) => {
  const { lang, t } = useTranslation();
  const { isDark, setThemePreference } = useTheme();
  const isFr = lang === 'fr';
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 15);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. Saved Trips (Home <-> Trip <-> Configurator)
    for (const tripItem of trips) {
      const meta = getLocalizedTripMeta(tripItem, lang);
      const physics = calculatePhysics(
        tripItem.physics,
        tripItem.route,
        tripItem.weather,
        lang,
        riderSpecs?.ftpWatts
      );
      const dotClass =
        physics.goStatus === 'GO'
          ? CHIP_TOKENS.emerald.dot
          : physics.goStatus === 'CAUTION'
          ? CHIP_TOKENS.amber.dot
          : CHIP_TOKENS.rose.dot;
      const dist = tripItem.route.distanceKm;
      const elev = tripItem.route.elevationGainM ?? Math.round(dist * 6.5);
      const isCurrent = activeTrip?.id === tripItem.id;

      items.push({
        id: `trip:${tripItem.id}`,
        group: 'trips',
        label: meta.name || t('defaultTripName'),
        sub: `${tripItem.tag === 'VÉLOTAF' ? (isFr ? 'Vélotaf' : 'Commute') : tripItem.tag} · ${dist} km · +${elev} m`,
        keywords: `${meta.name} ${tripItem.tag} ${tripItem.route.origin || ''} ${
          tripItem.route.destination || ''
        } trip ride plan trajet`,
        dotClass,
        isCurrent,
        onRun: () => {
          onLaunchTrip(tripItem.id);
          onClose();
        },
        secondaryAction: {
          label: t('navConfigurator'),
          onRun: () => {
            onEditTrip(tripItem);
            onClose();
          },
        },
      });
    }

    // 2. Primary Screens (aligned to Home <-> Ride plan <-> Trip setup | Multi-Tool)
    items.push(
      {
        id: 'view:home',
        group: 'views',
        label: t('navHome'),
        sub: isFr ? 'Hub des sorties et météo' : 'Trips hub and quick builder',
        keywords: 'home accueil hub trips',
        shortcut: '1',
        icon: HomeSmile,
        isCurrent: currentView === 'home',
        onRun: () => {
          onNavigateView('home');
          onClose();
        },
      },
      {
        id: 'view:dashboard',
        group: 'views',
        label: t('navFlightDeck'),
        sub: activeTrip ? getLocalizedTripMeta(activeTrip, lang).name : undefined,
        keywords: 'ride plan dashboard trip plan de sortie',
        shortcut: '2',
        icon: Compass,
        isCurrent: currentView === 'dashboard',
        onRun: () => {
          onNavigateView('dashboard');
          onClose();
        },
      },
      {
        id: 'view:configurator',
        group: 'views',
        label: t('navConfigurator'),
        sub: isFr ? 'Itinéraire, horaire, style et allure' : 'Route, timing, style, and pace',
        keywords: 'trip setup configurator edit configuration',
        shortcut: '3',
        icon: SlidersHorizontal,
        isCurrent: currentView === 'configurator',
        onRun: () => {
          onNavigateView('configurator');
          onClose();
        },
      },
      {
        id: 'view:tools',
        group: 'views',
        label: t('navMultiTool'),
        sub: isFr ? 'Pneus, vent, nutrition, eau, tenue, cadre' : 'Tyres, wind, fuel, bakeries, outfit, sticker',
        keywords: 'multi-tool tools calculators outils',
        shortcut: '4',
        icon: Calculator,
        isCurrent: currentView === 'tools',
        onRun: () => {
          onOpenTool('hub');
          onClose();
        },
      }
    );

    // 3. Multi-Tool Calculators
    for (const tool of TOOL_CATALOG) {
      items.push({
        id: `tool:${tool.id}`,
        group: 'tools',
        label: isFr ? tool.shortLabelFr : tool.shortLabelEn,
        sub: isFr ? tool.taglineFr : tool.taglineEn,
        keywords: `${tool.shortLabelEn} ${tool.shortLabelFr} ${tool.titleEn} ${tool.titleFr} ${tool.slug}`,
        icon: TOOL_ICON_MAP[tool.id] || Calculator,
        onRun: () => {
          onOpenTool(tool.id);
          onClose();
        },
      });
    }

    // 4. Quick Actions
    items.push(
      {
        id: 'action:new-trip',
        group: 'actions',
        label: t('createNewTripBtn'),
        sub: isFr ? 'Démarrer un nouveau trajet dans Configuration' : 'Start a fresh ride in Trip setup',
        keywords: 'create new trip ride nouveau trajet',
        icon: Plus,
        onRun: () => {
          onClose();
          onCreateNewTrip();
        },
      },
      {
        id: 'action:specs',
        group: 'actions',
        label: t('specsModalTitle'),
        sub: isFr ? 'Poids, vélo, pneus, nutrition et profil' : 'Weight, bike, tyres, and fuel setup',
        keywords: 'bike rider specs settings profile garage velo reglage',
        icon: Bicycle,
        onRun: () => {
          onClose();
          onOpenSpecs();
        },
      },
      {
        id: 'action:theme',
        group: 'actions',
        label: isDark ? t('switchToLight') : t('switchToDark'),
        keywords: 'theme dark light mode sombre clair',
        icon: isDark ? Sun : Moon,
        onRun: () => {
          setThemePreference(isDark ? 'light' : 'dark');
          onClose();
        },
      }
    );

    if (activeTrip && onShareReceipt) {
      items.push({
        id: 'action:share',
        group: 'actions',
        label: isFr ? 'Partager la sortie' : 'Share ride',
        sub: getLocalizedTripMeta(activeTrip, lang).name,
        keywords: 'share receipt link export partager',
        icon: ShareNetwork,
        onRun: () => {
          onClose();
          onShareReceipt();
        },
      });
    }

    if (activeTrip && onPrint) {
      items.push({
        id: 'action:print',
        group: 'actions',
        label: isFr ? 'Imprimer la feuille A4' : 'Print cue sheet (A4)',
        keywords: 'print a4 sheet pdf imprimer',
        icon: Printer,
        onRun: () => {
          onClose();
          window.requestAnimationFrame(() => onPrint());
        },
      });
    }

    return items;
  }, [
    trips,
    activeTrip,
    currentView,
    lang,
    isFr,
    isDark,
    riderSpecs?.ftpWatts,
    t,
    onLaunchTrip,
    onEditTrip,
    onNavigateView,
    onOpenTool,
    onCreateNewTrip,
    onOpenSpecs,
    onShareReceipt,
    onPrint,
    setThemePreference,
    onClose,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Without a query, show saved trips (up to 6), all 4 views, and quick actions
      return allItems.filter((item) => {
        if (item.group === 'tools') return false;
        if (item.group === 'trips') {
          const tripIdx = allItems.filter((x) => x.group === 'trips').indexOf(item);
          return tripIdx < 6;
        }
        return true;
      });
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return allItems.filter((item) => {
      const hay = `${item.label} ${item.sub || ''} ${item.keywords}`.toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length === 0
            ? 0
            : (prev - 1 + filteredItems.length) % filteredItems.length
        );
        return;
      }
      if (e.key === 'Enter') {
        const chosen = filteredItems[selectedIndex];
        if (!chosen) return;
        e.preventDefault();
        if (e.shiftKey && chosen.secondaryAction) {
          chosen.secondaryAction.onRun();
        } else {
          chosen.onRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-cmd-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const yellowVest = CHIP_TOKENS['yellow-vest'];
  const groupsOrder: { key: CommandGroup; label: string }[] = [
    { key: 'trips', label: t('quickSwitchTripsHeading') },
    { key: 'views', label: t('quickSwitchViewsHeading') },
    { key: 'tools', label: t('quickSwitchToolsHeading') },
    { key: 'actions', label: t('quickSwitchActionsHeading') },
  ];

  let runningFlatIndex = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-3.5 pt-[10vh] sm:pt-[12vh] pb-6 no-print print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('quickSwitchOpenAria')}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 animate-apple-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Card */}
      <div className="relative z-10 w-full max-w-xl rounded-card bg-card text-ink shadow-[0_24px_70px_rgba(0,0,0,0.28)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-ink/[0.06] dark:ring-white/[0.1] overflow-hidden animate-apple-modal flex flex-col max-h-[75dvh]">
        {/* Search Input Row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink/[0.06] dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('quickSwitchPlaceholder')}
            className="flex-1 min-w-0 bg-transparent text-base sm:text-sm font-body text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('menuClose')}
              className="w-7 h-7 rounded-full bg-pod hover:bg-chip text-ink-muted hover:text-ink flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-pod text-[11px] font-rounded font-semibold text-ink-muted hover:text-ink cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted">{t('quickSwitchEmpty')}</div>
          ) : (
            groupsOrder.map((grp) => {
              const groupItems = filteredItems.filter((i) => i.group === grp.key);
              if (groupItems.length === 0) return null;
              return (
                <div key={grp.key} className="space-y-1">
                  <div className="px-2.5 pb-0.5 text-[11px] font-rounded font-semibold text-ink-muted">
                    {grp.label}
                  </div>
                  {groupItems.map((item) => {
                    runningFlatIndex += 1;
                    const idx = runningFlatIndex;
                    const isActive = idx === selectedIndex;
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.id}
                        data-cmd-active={isActive ? 'true' : undefined}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={item.onRun}
                        role="button"
                        tabIndex={-1}
                        className={`w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-pod cursor-pointer transition-colors ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                          isActive
                            ? `${yellowVest.surface} ${yellowVest.primary} ${yellowVest.selectedRing}`
                            : `${CHIP_RING_UNSELECTED} hover:bg-pod text-ink`
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.dotClass ? (
                            <span className="w-7 h-7 rounded-full bg-card dark:bg-black/25 flex items-center justify-center shrink-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                            </span>
                          ) : IconComp ? (
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-black/5 dark:bg-white/10' : 'bg-pod text-ink-secondary'
                              }`}
                            >
                              <IconComp className="w-4 h-4 text-current" />
                            </span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[13px] font-semibold truncate">{item.label}</span>
                              {item.isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/15 text-[10px] font-rounded font-bold shrink-0">
                                  {t('activeBadge')}
                                </span>
                              )}
                            </div>
                            {item.sub && (
                              <div
                                className={`text-[11px] truncate tnum ${
                                  isActive ? 'opacity-80' : 'text-ink-muted'
                                }`}
                              >
                                {item.sub}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.secondaryAction && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                item.secondaryAction!.onRun();
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-rounded font-semibold transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-black/10 dark:bg-white/15 hover:bg-black/15 dark:hover:bg-white/25 text-current'
                                  : 'bg-pod hover:bg-chip text-ink-secondary hover:text-ink'
                              }`}
                            >
                              {item.secondaryAction.label}
                            </button>
                          )}
                          {item.shortcut && (
                            <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-pod dark:bg-white/10 text-[11px] font-rounded font-bold text-ink-muted tnum">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isActive && !item.shortcut && (
                            <CornerDownLeft className="w-3.5 h-3.5 opacity-70 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer keyboard hints */}
        <div className="px-5 py-3 border-t border-ink/[0.06] dark:border-white/[0.08] bg-pod/50 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span>↑↓ {isFr ? 'Naviguer' : 'Navigate'}</span>
            <span>·</span>
            <span>↵ {isFr ? 'Ouvrir' : 'Open'}</span>
          </span>
          <span className="hidden sm:inline">
            {isFr ? 'Raccourcis : 1–4 vues · ⌘K' : 'Shortcuts: 1–4 views · ⌘K'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
