import React from 'react';
import { Button } from "@/components/arc/button/button";
import type { FreeWebToolId } from '../../utils/toolCatalog';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { PhysicsCalculationResult } from '../../types/trip';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { StageAmenity } from '../../types/amenities';
import { RideBriefData, RideBriefPriorityIconKey } from '../../utils/rideBrief';
import { SenderBaseline } from '../../utils/planShare';
import { copyShortPlanShareUrl } from '../../services/planShareService';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import {
  getStationaryRecoveryRuleForTrip,
  resolveEffectiveRestStopMinutes,
} from '../../utils/stationaryRecovery';
import { Badge } from '../common/Badge';
import { CadenceInsight } from '../common/CadenceInsight';
import { IconBadge } from '../common/IconBadge';
import { Collapsible } from '../common/Collapsible';
import {
  ReadinessGauge,
  RideReadinessPanel,
  RideReadinessBreakdown,
} from './RideReadinessGauge';
import {
  ReadinessActionCard,
  ReadinessActionAppliedInfo,
} from './ReadinessActionCard';
import type { ReadinessActionKind } from '../../utils/rideReadiness';
import {
  ChevronDown,
  Moon,
  Flashlight,
  Wind,
  CloudRain,
  Sun,
  Utensils,
  Gauge,
  TriangleAlert,
  ThermometerSimple,
  Compass,
  CheckCircle2,
  Coffee,
  ArrowCounterClockwise,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Link2,
  Newspaper,
  X,
} from '@/components/icons';

export interface RideBriefCardProps {
  trip: TripProfile;
  physics: PhysicsCalculationResult;
  timeline: ReverseTimelineCalculation;
  riderSpecs?: RiderBikeSpecs;
  amenities?: StageAmenity[];
  brief: RideBriefData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  layout?: 'full' | 'sidecar';
  partnerSyncSlot?: React.ReactNode;
  senderBaseline?: SenderBaseline;
  onOpenTools?: (tab?: FreeWebToolId) => void;
  onUpdateTrip?: (updated: TripProfile) => void;
  onSelectBike?: (bikeId: string) => void;
  onOpenSpecs?: () => void;
  onOpenConfigurator?: () => void;
  onJumpToSection?: (sectionId: string) => void;
}

function getPriorityIcon(key: RideBriefPriorityIconKey) {
  switch (key) {
    case 'lights':
      return Moon;
    case 'blocker':
      return TriangleAlert;
    case 'tyre':
      return Gauge;
    case 'wind':
      return Wind;
    case 'rain':
      return CloudRain;
    case 'sun':
      return Sun;
    case 'fuel':
    default:
      return Utensils;
  }
}

export const RideBriefCard: React.FC<RideBriefCardProps> = ({
  trip,
  physics,
  timeline,
  riderSpecs,
  amenities,
  brief,
  isExpanded,
  onToggleExpand,
  layout = 'full',
  partnerSyncSlot,
  senderBaseline,
  onOpenTools: _onOpenTools,
  onUpdateTrip,
  onSelectBike,
  onOpenSpecs,
  onOpenConfigurator,
  onJumpToSection,
}) => {
  const isSidecar = layout === 'sidecar';
  const effectiveExpanded = isSidecar ? true : isExpanded;
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const meta = getLocalizedTripMeta(trip, lang);

  const [showReadinessBreakdown, setShowReadinessBreakdown] = React.useState(false);
  const [activeReadinessAction, setActiveReadinessAction] = React.useState<ReadinessActionKind | null>(null);
  const [appliedFeedback, setAppliedFeedback] = React.useState<ReadinessActionAppliedInfo | null>(null);
  const [copiedPlanLink, setCopiedPlanLink] = React.useState(false);
  const [isCopyingPlanLink, setIsCopyingPlanLink] = React.useState(false);
  const readiness = brief.readiness;
  const effectiveSpecs = riderSpecs ?? loadRiderBikeSpecs();
  const rawPlannedLongStopMin = Math.max(0, Math.round(Number(trip.ruleSettings?.plannedLongStopMin ?? 0)));
  const recoveryRule = getStationaryRecoveryRuleForTrip(trip, brief.leaveByHHMM);
  const plannedLongStopMin = resolveEffectiveRestStopMinutes(rawPlannedLongStopMin, recoveryRule);

  React.useEffect(() => {
    setActiveReadinessAction(null);
    setAppliedFeedback(null);
  }, [trip.id]);

  const handleTriggerReadinessAction = (actionKind: ReadinessActionKind) => {
    setAppliedFeedback(null);
    setActiveReadinessAction((prev) => (prev === actionKind ? null : actionKind));
  };

  const handleCopyGroupLink = async () => {
    if (isCopyingPlanLink) return;
    setIsCopyingPlanLink(true);
    try {
      const { copied } = await copyShortPlanShareUrl(
        trip,
        {
          leaveByHHMM: brief.leaveByHHMM,
          arrivalHHMM: brief.arrivalHHMM,
          goStatus: brief.verdict,
          bikeName: brief.bikeName,
          senderBaseline,
        },
        {
          promptLabel: isFr ? 'Copiez le lien du plan :' : 'Copy ride plan link:',
        }
      );
      if (copied) {
        setCopiedPlanLink(true);
        window.setTimeout(() => setCopiedPlanLink(false), 2400);
      }
    } finally {
      setIsCopyingPlanLink(false);
    }
  };

  const loopComp = brief.loopComparison;
  const showLoopBadge = Boolean(
    loopComp?.isLoop &&
      loopComp.recommendedDirection !== 'neutral' &&
      loopComp.minutesSaved >= 2
  );

  const getPriorityTarget = (
    id: string,
    iconKey: RideBriefPriorityIconKey
  ): { sectionId: string; label: string } => {
    if (iconKey === 'tyre' || iconKey === 'lights') {
      return { sectionId: 'bento-checklist', label: isFr ? 'Check-list' : 'Checklist' };
    }
    if (iconKey === 'blocker') {
      if (id.includes('water') || id.includes('resupply') || id.includes('gap')) {
        return { sectionId: 'bento-resupply', label: isFr ? 'Ravito' : 'Resupply' };
      }
      return { sectionId: 'bento-timeline', label: isFr ? 'Horaires' : 'Schedule' };
    }
    if (iconKey === 'wind' || iconKey === 'rain' || iconKey === 'sun') {
      return { sectionId: 'bento-weather', label: isFr ? 'Météo' : 'Weather' };
    }
    return { sectionId: 'bento-nutrition', label: isFr ? 'Nutrition' : 'Fuel' };
  };

  return (
    <section
      id="ride-brief-card"
      data-testid="ride-brief-card"
      aria-label={isFr ? 'Briefing départ' : 'Ride brief'}
      onClick={!effectiveExpanded ? onToggleExpand : undefined}
      className={`w-full ${isSidecar ? 'mb-0 h-full flex flex-col' : 'mb-3 sm:mb-4 lg:mb-5'} rounded-card bg-card p-3.5 sm:p-5 ${isSidecar ? 'lg:p-5' : 'lg:px-6 lg:py-5'} shadow-xs transition-colors ${
        !effectiveExpanded ? 'cursor-pointer' : ''
      }`}
    >
      {/* ── Header Row ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 min-w-0 w-full">
            <IconBadge
              theme="purple"
              icon={Newspaper}
              size="md"
              shape="circle"
              className="shrink-0"
            />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight text-ink font-sans shrink-0">
                {isFr ? 'Briefing départ' : 'Ride brief'}
              </h2>
              <span className="text-[13px] font-medium text-ink-muted font-body leading-snug truncate">
                {meta.name} · {brief.archetypeLabel}
              </span>
            </div>
          </div>

          {!effectiveExpanded && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={isFr ? 'Déplier le briefing départ' : 'Expand ride brief'}
              className="inline-flex items-center gap-2 rounded-full bg-pod hover:bg-chip px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:px-2.5 sm:py-1 text-xs font-semibold text-ink tnum max-w-full cursor-pointer transition-colors"
            >
              <span className="whitespace-nowrap font-bold">{readiness.label}</span>
              <span className="text-ink-muted font-medium">·</span>
              <span className="min-w-0 truncate font-medium text-ink-secondary">
                {readiness.topLift?.tip || brief.priorities[0]?.headline || brief.headline}
              </span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!effectiveExpanded && (
            <span
              className="inline-flex items-center shrink-0"
              title={`${isFr ? 'Prêt à partir' : 'Ride readiness'} · ${readiness.label}`}
            >
              <ReadinessGauge
                score={readiness.score}
                level={readiness.level}
                label={readiness.label}
                size={40}
                showIcon={false}
              />
            </span>
          )}

          {!isSidecar && (
            <Button
              variant="ghost"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-expanded={effectiveExpanded}
              aria-controls="ride-brief-body"
              data-testid="ride-brief-toggle"
              aria-label={
                effectiveExpanded
                  ? isFr
                    ? 'Réduire le briefing départ'
                    : 'Collapse ride brief'
                  : isFr
                  ? 'Déplier le briefing départ'
                  : 'Expand ride brief'
              }
              className="w-11 h-11 md:w-9 md:h-9 p-0 rounded-full bg-pod hover:bg-chip text-ink flex items-center justify-center transition-colors shrink-0"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  effectiveExpanded ? 'rotate-180' : ''
                }`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* ── Collapsible Body (Decision Summary Layer) ── */}
      <Collapsible
        open={effectiveExpanded}
        id="ride-brief-body"
        className={isSidecar ? 'flex-1' : ''}
        innerClassName={isSidecar ? 'pt-3.5 h-full flex flex-col justify-between' : 'pt-4 md:pt-3.5'}
      >
        <div>
        {/* Top Row: Plain-Language Verdict + Readiness Gauge */}
        <div
          className={
            isSidecar
              ? 'flex flex-col gap-3.5'
              : 'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] md:items-center gap-4 md:gap-5'
          }
        >
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <h3 className={`${isSidecar ? 'text-xl sm:text-[22px]' : 'text-2xl sm:text-[26px]'} leading-[1.15] font-bold tracking-tight text-ink font-sans`}>
              {brief.headline}
            </h3>
            <p className={`${isSidecar ? 'text-xs sm:text-[13px]' : 'text-sm'} font-medium text-ink-secondary font-body leading-snug max-w-3xl`}>
              {brief.narrativeSummary}
            </p>
            {brief.companionNote && (
              <CadenceInsight
                compact
                tone={
                  brief.companionNote.icon === 'flame'
                    ? 'amber'
                    : brief.companionNote.icon === 'wind' || brief.companionNote.icon === 'thermometer'
                    ? 'sky'
                    : 'cadence'
                }
                headline={brief.companionNote.text}
                className="mt-1 max-w-3xl"
              />
            )}
          </div>

          <div className="min-w-0">
            <RideReadinessPanel
              readiness={readiness}
              isFr={isFr}
              showBreakdown={showReadinessBreakdown}
              onToggleBreakdown={() => setShowReadinessBreakdown((v) => !v)}
              breakdownId="ride-readiness-breakdown"
              activeAction={activeReadinessAction}
              onTriggerAction={onUpdateTrip ? handleTriggerReadinessAction : undefined}
              actionCardId="ride-readiness-action"
            />
          </div>
        </div>

        {/* Guided Readiness Action Prompt Card */}
        <Collapsible
          open={Boolean(activeReadinessAction && onUpdateTrip)}
          id="ride-readiness-action"
          innerClassName="pt-4 md:pt-3.5"
        >
          {activeReadinessAction && onUpdateTrip && (
            <ReadinessActionCard
              action={activeReadinessAction}
              trip={trip}
              physics={physics}
              timeline={timeline}
              riderSpecs={effectiveSpecs}
              amenities={amenities}
              brief={brief}
              lang={lang === 'fr' ? 'fr' : 'en'}
              onUpdateTrip={onUpdateTrip}
              onSelectBike={onSelectBike}
              onOpenSpecs={onOpenSpecs}
              onOpenConfigurator={onOpenConfigurator}
              onJumpToSection={onJumpToSection}
              onApplied={(info) => {
                setActiveReadinessAction(null);
                setAppliedFeedback(info);
              }}
              onClose={() => setActiveReadinessAction(null)}
            />
          )}
        </Collapsible>

        {/* Confirmation + Undo strip after applying a readiness recommendation */}
        {appliedFeedback && (
          <div
            data-testid="readiness-applied-banner"
            className="mt-3.5 rounded-pod bg-emerald-50 dark:bg-emerald-950/35 ring-1 ring-inset ring-emerald-500/30 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold font-body text-ink leading-snug">
                {appliedFeedback.summary}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {appliedFeedback.jumpSectionId && onJumpToSection && (
                <button
                  type="button"
                  onClick={() => onJumpToSection(appliedFeedback.jumpSectionId!)}
                  className="inline-flex items-center gap-1 rounded-full bg-card hover:bg-chip px-2.5 py-1 text-[11px] font-bold font-rounded text-ink transition-colors cursor-pointer"
                >
                  <span>{appliedFeedback.jumpLabel || (isFr ? 'Voir' : 'View')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {appliedFeedback.previousTrip && onUpdateTrip && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTrip(appliedFeedback.previousTrip!);
                    setAppliedFeedback(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-card hover:bg-chip px-2.5 py-1 text-[11px] font-bold font-rounded text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                >
                  <ArrowCounterClockwise className="w-3 h-3" />
                  <span>{isFr ? 'Annuler' : 'Undo'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAppliedFeedback(null)}
                aria-label={isFr ? 'Fermer' : 'Dismiss'}
                className="w-6 h-6 rounded-full hover:bg-card/80 text-ink-muted hover:text-ink flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Readiness breakdown (per-factor scores) */}
        <Collapsible
          open={showReadinessBreakdown}
          id="ride-readiness-breakdown"
          innerClassName="pt-4 md:pt-3.5"
        >
          <RideReadinessBreakdown
            readiness={readiness}
            isFr={isFr}
            activeAction={activeReadinessAction}
            onTriggerAction={onUpdateTrip ? handleTriggerReadinessAction : undefined}
          />
        </Collapsible>

        {/* Clickable Priority Rows — jump straight to Layer 2 canonical tab */}
        <div
          className={
            isSidecar
              ? 'mt-4 md:mt-3.5 grid grid-cols-1 gap-1.5'
              : 'mt-4 md:mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-4'
          }
        >
          {brief.priorities.map((item) => {
            const PriorityIcon =
              item.id === 'visibility-twilight'
                ? Flashlight
                : getPriorityIcon(item.iconKey);
            const target = getPriorityTarget(item.id, item.iconKey);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onJumpToSection?.(target.sectionId)}
                className="group w-full flex items-center gap-3 min-w-0 px-2.5 py-2 rounded-pod hover:bg-pod transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
              >
                <IconBadge
                  theme={item.theme}
                  icon={PriorityIcon}
                  size="lg"
                  shape="circle"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <p className="text-[14px] font-bold text-ink font-rounded leading-[1.3]">
                    {item.headline}
                  </p>
                  <p className="text-[12px] font-medium text-ink-muted font-body leading-[1.3] line-clamp-1">
                    {item.detail}
                  </p>
                </div>
                {onJumpToSection && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pod group-hover:bg-chip px-2.5 py-1 text-[11px] font-rounded font-semibold text-ink-muted group-hover:text-ink transition-colors shrink-0">
                    <span>{target.label}</span>
                    <ArrowUpRight className="w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Optional Multi-Player Group Sync Check Slot */}
        {partnerSyncSlot && <div className="mt-4">{partnerSyncSlot}</div>}
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-ink/15 dark:border-white/15 flex flex-col gap-2.5">
          {/* Active Schedule Modifiers (only rendered when triggered) */}
          {(plannedLongStopMin > 0 || recoveryRule.isRestricted || showLoopBadge) && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {plannedLongStopMin > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateTrip && handleTriggerReadinessAction('effort-load')}
                  className="inline-flex cursor-pointer active:scale-[0.98] transition-transform"
                  title={isFr ? 'Modifier ou retirer la pause longue' : 'Adjust or remove planned stop'}
                >
                  <Badge variant="amber" size="md" icon={Coffee} className="tnum">
                    {isFr ? `Pause ${plannedLongStopMin} min` : `${plannedLongStopMin} min stop`}
                  </Badge>
                </button>
              )}

              {recoveryRule.isRestricted && (
                <Badge
                  variant="sky"
                  size="md"
                  icon={ThermometerSimple}
                  className="tnum"
                  title={
                    isFr
                      ? 'Départ hivernal avant l’aube : pauses ≤ 5 min max et pauses déjeuner (30 min+) désactivées'
                      : 'Pre-dawn winter start: rest stops capped at 5 min max and 30-min+ lunch breaks disabled'
                  }
                >
                  {isFr ? 'Pauses ≤ 5 min (hiver avant l’aube)' : 'Stops ≤ 5 min (pre-dawn winter)'}
                </Badge>
              )}

              {showLoopBadge && loopComp && (
                <Badge variant="emerald" size="md" icon={Compass} className="tnum">
                  {loopComp.recommendedDirection === 'reverse'
                    ? isFr
                      ? `Sens inverse (−${loopComp.minutesSaved} min)`
                      : `Flip loop (−${loopComp.minutesSaved} min)`
                    : isFr
                    ? `Sens normal (−${loopComp.minutesSaved} min)`
                    : `Default dir (−${loopComp.minutesSaved} min)`}
                </Badge>
              )}
            </div>
          )}

          {/* Layer 1 Actions: Trip Setup + Duo Partner Share */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {onOpenConfigurator && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onOpenConfigurator}
                className="min-h-[40px] sm:h-9 sm:min-h-0 px-3.5 rounded-full bg-pod hover:bg-chip text-ink text-xs font-rounded font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>{t('navConfigurator')}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleCopyGroupLink}
              disabled={isCopyingPlanLink}
              className="min-h-[40px] sm:h-9 sm:min-h-0 px-3.5 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink text-xs font-rounded font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              {copiedPlanLink ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Link2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {copiedPlanLink
                  ? isFr
                    ? 'Lien copié !'
                    : 'Link copied!'
                  : isCopyingPlanLink
                  ? isFr
                    ? 'Création…'
                    : 'Creating…'
                  : isFr
                  ? 'Partager (duo)'
                  : 'Share with partner'}
              </span>
            </Button>
          </div>
        </div>
      </Collapsible>
    </section>
  );
};
