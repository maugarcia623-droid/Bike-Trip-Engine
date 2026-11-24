import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/arc/button/button';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Gauge,
  Compass,
  Banana,
  Bakery,
  Shirt,
  AlarmClock,
  Scissors,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { FreeWebToolId, FreeWebToolSlug } from '../../utils/toolCatalog';
import {
  CHIP_DUOTONE_ISOLATION_CLASSES,
  CHIP_RING_BASE,
  CHIP_TOKENS,
} from '../../tokens/chipTokens';

type ToolChipTheme = keyof typeof CHIP_TOKENS;

const FuelPlanTool = React.lazy(() =>
  import('./FuelPlanTool').then((m) => ({ default: m.FuelPlanTool }))
);
const LoopWindFlipperTool = React.lazy(() =>
  import('./LoopWindFlipperTool').then((m) => ({ default: m.LoopWindFlipperTool }))
);
const WaterBakeryTool = React.lazy(() =>
  import('./WaterBakeryTool').then((m) => ({ default: m.WaterBakeryTool }))
);
const WhatToWearTool = React.lazy(() =>
  import('./WhatToWearTool').then((m) => ({ default: m.WhatToWearTool }))
);
const TyrePressureTool = React.lazy(() =>
  import('./TyrePressureTool').then((m) => ({ default: m.TyrePressureTool }))
);
const StemStickerTool = React.lazy(() =>
  import('./StemStickerTool').then((m) => ({ default: m.StemStickerTool }))
);
const LeaveByTool = React.lazy(() =>
  import('./LeaveByTool').then((m) => ({ default: m.LeaveByTool }))
);

export type FreeWebToolTab = FreeWebToolId;

export interface FreeWebToolsViewProps {
  initialTab?: FreeWebToolId;
  activeTrip?: TripProfile | null;
  riderSpecs?: RiderBikeSpecs;
  onSelectTool?: (toolId: FreeWebToolId) => void;
  onOpenTripInCadence?: (trip: TripProfile, sourceTool: FreeWebToolId) => void;
  onBackToCockpit: () => void;
}

interface HubQuestionCard {
  id: Exclude<FreeWebToolSlug, 'wind'>;
  icon: React.ElementType;
  theme: ToolChipTheme;
  /** Optional custom icon badge surface/foreground classes (e.g. ripe banana yellow for Fuel) */
  badgeClasses?: string;
  activePillClasses?: string;
  questionEn: string;
  questionFr: string;
  captionEn: string;
  captionFr: string;
  pillEn: string;
  pillFr: string;
}

/**
 * Exact 6-card question grid matching Mauricio's Figma mockup:
 * 3×2 on Desktop, 2-column tactile grid on Mobile.
 */
const FIGMA_HUB_CARDS: HubQuestionCard[] = [
  {
    id: 'tyre-pressure',
    icon: Gauge,
    theme: 'teal',
    questionEn: 'How tight should my tyre pressure be today?',
    questionFr: 'Quelle pression de pneus pour aujourd’hui ?',
    captionEn: 'Based on your weight, your luggage, and terrain.',
    captionFr: 'Selon ton poids, tes bagages et le terrain.',
    pillEn: 'Tyre pressure',
    pillFr: 'Pression pneus',
  },
  {
    id: 'flip-my-loop',
    icon: Compass,
    theme: 'sky',
    questionEn: 'Which way should I ride with today’s weather?',
    questionFr: 'Dans quel sens rouler avec le vent du jour ?',
    captionEn: 'Flip a loop GPX or check today’s live wind & invisible hill.',
    captionFr: 'Inversez une boucle GPX ou testez le vent en direct.',
    pillEn: 'Wind & direction',
    pillFr: 'Vent & direction',
  },
  {
    id: 'fuel-plan',
    icon: Banana,
    theme: 'amber',
    badgeClasses: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-300',
    activePillClasses:
      'bg-yellow-100 text-yellow-800 ring-yellow-500 dark:bg-yellow-400/20 dark:text-yellow-300 dark:ring-yellow-400',
    questionEn: 'What should I eat and drink for this ride?',
    questionFr: 'Que manger et boire sur cette sortie ?',
    captionEn: 'Based on your preferences, effort, and live forecast.',
    captionFr: 'Selon tes goûts, l’intensité et la météo en direct.',
    pillEn: 'Fuel & bottles',
    pillFr: 'Nutrition & bidons',
  },
  {
    id: 'water-bakery',
    icon: Bakery,
    theme: 'amber',
    questionEn: 'Where is the upcoming bakery & water stop?',
    questionFr: 'Où trouver la prochaine boulangerie ouverte ?',
    captionEn: 'Plan A → B or drop a GPX to check open stops at arrival.',
    captionFr: 'Trajet A → B ou GPX pour voir ce qui sera ouvert à ton passage.',
    pillEn: 'Bakeries & water',
    pillFr: 'Eau & boulangeries',
  },
  {
    id: 'what-to-wear',
    icon: Shirt,
    theme: 'purple',
    questionEn: 'What outfit should I wear today?',
    questionFr: 'Quelle tenue porter aujourd’hui ?',
    captionEn: 'Live local weather, wind chill at speed, and daylight.',
    captionFr: 'Météo locale en direct, ressenti à vélo et lumière.',
    pillEn: 'Outfit & lights',
    pillFr: 'Tenue & feux',
  },
  {
    id: 'leave-by',
    icon: AlarmClock,
    theme: 'orange',
    questionEn: 'What time do I need to leave to be on time?',
    questionFr: 'À quelle heure partir pour arriver à l’heure ?',
    captionEn: 'Based on live wind, distance, and your arrival buffers.',
    captionFr: 'Selon le vent réel, la distance et tes marges.',
    pillEn: 'Leave-by clock',
    pillFr: 'Heure de départ',
  },
];

// Exact 1-to-1 match with the 6 hub cards + 1 Printable Top-Tube Sticker strip (zero orphan tabs!)
const ALL_NAV_ITEMS: HubQuestionCard[] = [
  ...FIGMA_HUB_CARDS,
  {
    id: 'stem-sticker',
    icon: Scissors,
    theme: 'yellow-vest',
    pillEn: 'Top-tube sticker',
    pillFr: 'Sticker cadre',
    questionEn: 'Want a cheat sheet taped to your top tube?',
    questionFr: 'Envie d’un pense-bête scotché sur le cadre ?',
    captionEn: 'Real-size printable top-tube cue sticker.',
    captionFr: 'Sticker de cadre imprimable à taille réelle.',
  },
];

function ToolSkeleton() {
  return (
    <div className="rounded-card bg-card p-8 flex items-center justify-center shadow-xs">
      <div className="rounded-full bg-pod px-5 py-2 text-xs font-rounded font-semibold text-ink-muted animate-pulse">
        Loading…
      </div>
    </div>
  );
}

export const FreeWebToolsView: React.FC<FreeWebToolsViewProps> = ({
  initialTab = 'hub',
  activeTrip,
  riderSpecs,
  onSelectTool,
  onOpenTripInCadence,
  onBackToCockpit,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const [activeTool, setActiveTool] = useState<FreeWebToolId>(initialTab);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    setActiveTool(initialTab);
  }, [initialTab]);

  // Normalize legacy /tools/wind-cost deep link straight into Card 2's Wind Tax mode
  const normalizedNavId: FreeWebToolId = activeTool === 'wind' ? 'flip-my-loop' : activeTool;

  const updateSwitcherFades = () => {
    const el = switcherRef.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 6);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    if (activeTool === 'hub') return;
    updateSwitcherFades();
    const el = switcherRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateSwitcherFades, { passive: true });
    window.addEventListener('resize', updateSwitcherFades);
    const raf = requestAnimationFrame(updateSwitcherFades);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', updateSwitcherFades);
      window.removeEventListener('resize', updateSwitcherFades);
    };
  }, [activeTool, lang]);

  const navigateTool = (next: FreeWebToolId) => {
    setActiveTool(next);
    onSelectTool?.(next);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenPlan = onOpenTripInCadence
    ? (trip: TripProfile) => onOpenTripInCadence(trip, activeTool)
    : undefined;

  // ═══════════════════════════════════════════════════════════════════════════
  // HUB VIEW (/tools) — Faithful to Mauricio's Figma Mockup (Desktop + Mobile)
  // ═══════════════════════════════════════════════════════════════════════════
  if (activeTool === 'hub') {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-1 sm:pt-3 pb-20 animate-apple-in">
        {/* Top-left ← Home pill with crisp tactile hover feedback */}
        <div className="flex items-center justify-between mb-6 sm:mb-4">
          <Button
            variant="secondary"
            type="button"
            onClick={onBackToCockpit}
            className="group inline-flex items-center gap-2 min-h-[42px] px-4 rounded-full bg-card dark:bg-pod hover:bg-chip dark:hover:bg-elevated hover:ring-1 hover:ring-ink/15 dark:hover:ring-white/20 hover:-translate-y-px hover:shadow-sm text-xs sm:text-[13px] font-rounded font-bold text-ink shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span>{isFr ? 'Accueil' : 'Home'}</span>
          </Button>
        </div>

        {/* Hero: Left-aligned on Mobile, Centered on Desktop */}
        <div className="flex flex-col items-start md:items-center md:text-center max-w-xl md:mx-auto mb-7 sm:mb-10">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-pod dark:bg-card flex items-center justify-center text-ink mb-3.5 shadow-xs">
            <Briefcase className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-ink" />
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-extrabold font-rounded text-ink tracking-tight leading-[1.08]">
            {isFr ? 'Une sortie en vue ?' : 'Going somewhere?'}
          </h1>
          <p className="text-[13px] sm:text-sm text-ink-muted font-body leading-relaxed mt-2.5 max-w-md">
            {isFr
              ? 'Essaie ce Multi-Tool pour préparer ta prochaine sortie vélo. Sans compte, 100 % privé, pensé pour toi.'
              : 'Try this Multi-Tool for your next bike ride so you can be fully prepared. No accounts, 100% private, bespoke to you.'}
          </p>
        </div>

        {/* 6-Card Question Grid: 2 columns on Mobile, 3×2 on Desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 max-w-4xl mx-auto">
          {FIGMA_HUB_CARDS.map((card, idx) => {
            const Icon = card.icon;
            const tokens = CHIP_TOKENS[card.theme];
            const badgeStyle = card.badgeClasses || `${tokens.surface} ${tokens.primary}`;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigateTool(card.id)}
                className={`group rounded-[26px] sm:rounded-card bg-card hover:bg-card/95 dark:hover:bg-pod p-4 sm:p-6 min-h-[220px] sm:min-h-[258px] flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 dark:focus-visible:ring-white/30 animate-apple-in stagger-${Math.min(6, idx + 1)}`}
              >
                {/* Top-left circular icon badge */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${badgeStyle}`}
                >
                  <Icon className="w-5 h-5 text-current" />
                </div>

                {/* Big human question */}
                <h2 className="text-[16px] sm:text-[21px] font-extrabold font-rounded text-ink tracking-tight leading-[1.2] my-3.5 sm:my-4">
                  {isFr ? card.questionFr : card.questionEn}
                </h2>

                {/* Bottom row: quiet caption + circular → arrow button */}
                <div className="flex items-end justify-between gap-2 sm:gap-3 pt-1">
                  <p className="text-[11px] sm:text-xs text-ink-muted font-body leading-snug">
                    {isFr ? card.captionFr : card.captionEn}
                  </p>
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-pod dark:bg-chip group-hover:bg-ink group-hover:text-ink-inverse text-ink flex items-center justify-center shrink-0 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Full-Width Printable Top-Tube Stem Sticker Companion Strip */}
        <div className="max-w-4xl mx-auto mt-4 sm:mt-5 animate-apple-in stagger-6">
          <button
            type="button"
            onClick={() => navigateTool('stem-sticker')}
            className="group w-full rounded-[26px] sm:rounded-card bg-card hover:bg-card/95 dark:hover:bg-pod p-4 sm:p-5 flex items-center justify-between gap-4 text-left shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary}`}
              >
                <Scissors className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-current" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold font-rounded text-ink tracking-tight leading-tight">
                    {isFr
                      ? 'Envie d’un pense-bête scotché sur ton cadre ?'
                      : 'Want a cheat sheet taped to your top tube?'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-volt text-[#111111] text-[10px] font-rounded font-extrabold">
                    {isFr ? 'Imprimable' : 'Printable'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted font-body mt-0.5 leading-snug">
                  {isFr
                    ? 'Créez un sticker cadre à taille réelle (cols, points d’eau, boulangeries et rappels) prêt à imprimer et découper.'
                    : 'Print a real-size top-tube stem sticker with your climbs, chosen bakeries, water taps, and cues.'}
                </p>
              </div>
            </div>

            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-pod dark:bg-chip group-hover:bg-ink group-hover:text-ink-inverse text-ink flex items-center justify-center shrink-0 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>

        <p className="max-w-4xl mx-auto mt-5 px-1 text-center text-xs text-ink-muted">
          {isFr
            ? 'Tous les calculs tournent localement sur ton appareil · Météo et cartes en direct gratuites.'
            : 'Every calculation runs locally in your browser · Free live weather & map engines built in.'}
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOCUSED TOOL VIEW (/tools/<slug>)
  // ═══════════════════════════════════════════════════════════════════════════
  const currentMeta =
    ALL_NAV_ITEMS.find((item) => item.id === normalizedNavId) || ALL_NAV_ITEMS[0];
  const ActiveIcon = currentMeta.icon;
  const activeTokens = CHIP_TOKENS[currentMeta.theme];
  const headerBadgeStyle =
    currentMeta.badgeClasses || `${activeTokens.surface} ${activeTokens.primary}`;

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-2 pb-20 space-y-5 animate-apple-in">
      {/* Top navigation row: ← All tools ONLY (Cadence Home removed per UX review) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Button
          variant="secondary"
          type="button"
          onClick={() => navigateTool('hub')}
          className="group inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-full bg-card dark:bg-pod hover:bg-chip dark:hover:bg-elevated hover:ring-1 hover:ring-ink/15 dark:hover:ring-white/20 hover:-translate-y-px hover:shadow-sm text-xs font-rounded font-bold text-ink shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span>{isFr ? 'Tous les outils' : 'All tools'}</span>
        </Button>

        <span className="text-[11px] font-rounded font-semibold text-ink-muted hidden sm:inline">
          {isFr ? 'Sans compte · 100 % privé' : 'No accounts · 100% private'}
        </span>
      </div>

      {/* Compact Tool Switcher Strip with smooth left & right opacity fade gradients (zero hard clipping!) */}
      <div className="relative -mx-1">
        <div
          ref={switcherRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 py-1 scroll-smooth"
        >
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = normalizedNavId === item.id;
            const tokens = CHIP_TOKENS[item.theme];
            const activePillCls =
              item.activePillClasses ||
              `${tokens.surface} ${tokens.primary} ${tokens.selectedRing}`;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigateTool(item.id)}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full text-xs font-rounded font-bold transition-all cursor-pointer shrink-0 ${CHIP_RING_BASE} ${CHIP_DUOTONE_ISOLATION_CLASSES} ${
                  active
                    ? `${activePillCls} shadow-xs`
                    : 'bg-card dark:bg-pod text-ink-secondary hover:text-ink hover:bg-chip dark:hover:bg-elevated ring-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-current" />
                <span>{isFr ? item.pillFr : item.pillEn}</span>
              </Button>
            );
          })}
        </div>

        {/* Left fade gradient */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-canvas via-canvas/85 to-transparent transition-opacity duration-200 ${
            fadeLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Right fade gradient */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas via-canvas/85 to-transparent transition-opacity duration-200 ${
            fadeRight ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Animated Tool Container (smooth entrance animation matching the rest of Cadence!) */}
      <div key={activeTool} className="space-y-5 animate-apple-step-in">
        {/* Focused Question Header */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${CHIP_DUOTONE_ISOLATION_CLASSES} ${headerBadgeStyle}`}
          >
            <ActiveIcon className="w-5.5 h-5.5 text-current" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-rounded text-ink tracking-tight leading-tight">
            {isFr ? currentMeta.questionFr : currentMeta.questionEn}
          </h1>
        </div>

        {/* Lazy-Loaded Tool Body */}
        <Suspense fallback={<ToolSkeleton />}>
          {activeTool === 'fuel-plan' && (
            <FuelPlanTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {(activeTool === 'flip-my-loop' || activeTool === 'wind') && (
            <LoopWindFlipperTool
              lang={lang}
              initialMode={activeTool === 'wind' ? 'wind-tax' : 'loop'}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {activeTool === 'water-bakery' && (
            <WaterBakeryTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {activeTool === 'stem-sticker' && (
            <StemStickerTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {activeTool === 'tyre-pressure' && (
            <TyrePressureTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {activeTool === 'what-to-wear' && (
            <WhatToWearTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
          {activeTool === 'leave-by' && (
            <LeaveByTool
              lang={lang}
              activeTrip={activeTrip}
              riderSpecs={riderSpecs}
              onOpenTripInCadence={handleOpenPlan}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};
