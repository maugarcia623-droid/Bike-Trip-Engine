import React from 'react';
import { Button } from '@/components/arc';
import { TripProfile } from '../../types/trip';
import { RiderBikeSpecs } from '../../types/specs';
import { loadRiderBikeSpecs } from '../../utils/specsStorage';
import { PhysicsCalculationResult } from '../../types/trip';
import { ReverseTimelineCalculation } from '../../utils/timeline';
import { StageAmenity } from '../../types/amenities';
import { RideBriefData, RideBriefPriorityIconKey } from '../../utils/rideBrief';
import { buildPlanShareUrl } from '../../utils/planShare';
import { downloadTripFit } from '../../utils/fitExporter';
import { downloadTripGpx, downloadEntireTourGpx } from '../../utils/gpxExporter';
import { useTranslation, getLocalizedTripMeta } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { Collapsible } from '../common/Collapsible';
import {
  ReadinessGauge,
  RideReadinessPanel,
  RideReadinessBreakdown,
} from './RideReadinessGauge';
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
  Send,
  CheckCircle2,
  Download,
  Calculator,
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
  onOpenTools?: (tab?: 'wind' | 'leave-by' | 'pressure') => void;
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
  riderSpecs,
  brief,
  isExpanded,
  onToggleExpand,
  onOpenTools,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const meta = getLocalizedTripMeta(trip, lang);

  const [copiedPlanLink, setCopiedPlanLink] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = React.useState(false);
  const readiness = brief.readiness;

  const hasMultipleStages = Boolean(trip.stages && trip.stages.length > 1);
  const distLabel =
    brief.distanceKm >= 100
      ? `${Math.round(brief.distanceKm)}`
      : Number(brief.distanceKm.toFixed(1)).toString();

  const handleCopyGroupLink = async () => {
    const shareUrl = buildPlanShareUrl(trip, {
      leaveByHHMM: brief.leaveByHHMM,
      arrivalHHMM: brief.arrivalHHMM,
      goStatus: brief.verdict,
      bikeName: brief.bikeName,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const el = document.createElement('textarea');
        el.value = shareUrl;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedPlanLink(true);
      window.setTimeout(() => setCopiedPlanLink(false), 2400);
    } catch {
      window.prompt(isFr ? 'Copiez le lien du plan :' : 'Copy Group Plan Link:', shareUrl);
    }
  };

  const handleDownloadFit = () => {
    setExportError(null);
    try {
      const specs = riderSpecs ?? loadRiderBikeSpecs();
      downloadTripFit(trip, {
        lang,
        ftpWatts: specs.ftpWatts,
        carbTargetGPerHr: specs.carbTargetGPerHr,
        nutritionPreference: specs.nutritionPreference,
      });
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : isFr
          ? 'Export .FIT indisponible'
          : '.FIT export unavailable'
      );
      window.setTimeout(() => setExportError(null), 4000);
    }
  };

  const handleDownloadGpx = () => {
    setExportError(null);
    try {
      if (hasMultipleStages) {
        downloadEntireTourGpx(trip);
      } else {
        downloadTripGpx(trip);
      }
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : isFr
          ? 'Export .GPX indisponible'
          : '.GPX export unavailable'
      );
      window.setTimeout(() => setExportError(null), 4000);
    }
  };

  const showBlockerBadge =
    !brief.blockerAlreadyFeatured &&
    (brief.firstProblem.severity === 'critical' ||
      brief.firstProblem.severity === 'warning');

  const loopComp = brief.loopComparison;
  const showLoopBadge = Boolean(
    loopComp?.isLoop &&
      loopComp.recommendedDirection !== 'neutral' &&
      loopComp.minutesSaved >= 2
  );

  return (
    <section
      id="ride-brief-card"
      data-testid="ride-brief-card"
      aria-label={isFr ? 'Briefing départ' : 'Ride Brief'}
      className="w-full mb-3 sm:mb-4 lg:mb-5 rounded-card bg-card p-3.5 sm:p-5 lg:px-6 lg:py-5 shadow-xs border border-ink/5 dark:border-white/5 transition-colors"
    >
      {/* ── Header Row ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 min-w-0 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight text-ink font-sans shrink-0">
              {isFr ? 'Briefing départ' : 'Ride Brief'}
            </h2>
            <span className="text-[13px] font-medium text-ink-muted font-body break-words leading-snug sm:truncate sm:max-w-[440px]">
              {meta.name} · {brief.archetypeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {!isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onToggleExpand}
                aria-label={isFr ? 'Déplier le briefing départ' : 'Expand Ride Brief'}
                className="inline-flex items-center gap-2 rounded-full bg-pod hover:bg-chip px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:px-2.5 sm:py-1 text-xs font-semibold text-ink tnum max-w-full cursor-pointer transition-colors"
              >
                <span className="inline-flex items-center rounded-full bg-volt text-[#111111] px-2 py-0.5 text-[11px] font-extrabold leading-none">
                  {brief.leaveByHHMM}
                </span>
                <span className="whitespace-nowrap">{distLabel} km</span>
                <span className="text-ink-muted font-medium whitespace-nowrap hidden sm:inline">
                  · {brief.totalDurationFormatted}
                </span>
                <span className="text-ink-muted font-medium whitespace-nowrap hidden md:inline">
                  · {brief.tyrePressure.frontBar}/{brief.tyrePressure.rearBar} bar
                </span>
              </Button>
            )}

            <Badge
              variant={brief.attentionBadgeVariant}
              size="sm"
              dot
              className="font-semibold sm:hidden"
            >
              {brief.attentionBadgeLabel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Badge
            variant={brief.attentionBadgeVariant}
            size="sm"
            dot
            className="font-semibold hidden sm:inline-flex"
          >
            {brief.attentionBadgeLabel}
          </Badge>

          {!isExpanded && (
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

          <Button
            variant="ghost"
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-controls="ride-brief-body"
            data-testid="ride-brief-toggle"
            aria-label={
              isExpanded
                ? isFr
                  ? 'Réduire le briefing départ'
                  : 'Collapse Ride Brief'
                : isFr
                ? 'Déplier le briefing départ'
                : 'Expand Ride Brief'
            }
            className="w-11 h-11 md:w-9 md:h-9 p-0 rounded-full bg-pod hover:bg-chip text-ink flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* ── Collapsible Body ── */}
      <Collapsible open={isExpanded} id="ride-brief-body" innerClassName="pt-4 md:pt-3.5">
        {/* Top Row: Leave-By Volt Pod + Natural-Language Ride Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[208px_minmax(0,1fr)_320px] md:items-center gap-4 md:gap-5">
          <div className="w-full shrink-0 rounded-pod bg-volt text-[#111111] px-4 py-3.5 md:py-3.5 flex flex-col justify-between gap-1.5 shadow-xs">
            <span className="text-[13px] font-medium font-body leading-tight text-[#111111]/90">
              {brief.leavePodLabel}
            </span>
            <span className="text-[36px] leading-none font-extrabold tracking-tight font-sans tnum">
              {brief.leaveByHHMM}
            </span>
            <span className="text-xs font-medium font-body leading-tight text-[#111111]/75">
              {brief.targetContextLabel}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <h3 className="text-2xl sm:text-[28px] leading-[1.15] font-bold tracking-tight text-ink font-sans">
              {brief.headline}
            </h3>
            <p className="text-sm font-medium text-ink-secondary font-body leading-snug max-w-4xl">
              {brief.narrativeSummary}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-[14px] font-rounded">
              <span className="font-bold text-ink tnum">{distLabel} km</span>
              <span className="font-bold text-ink tnum">{brief.totalDurationFormatted}</span>
              <span className="font-medium text-ink-muted tnum">
                {brief.tempC}°C · {isFr ? 'ressenti' : 'feels like'} {brief.feelsLikeC}°C
              </span>
            </div>
          </div>

          {/* Readiness score pod — full width under on mobile/tablet, third column on xl */}
          <div className="md:col-span-2 xl:col-span-1 min-w-0">
            <RideReadinessPanel
              readiness={readiness}
              isFr={isFr}
              showBreakdown={showReadinessBreakdown}
              onToggleBreakdown={() => setShowReadinessBreakdown((v) => !v)}
              breakdownId="ride-readiness-breakdown"
            />
          </div>
        </div>

        {/* Readiness breakdown (per-factor scores) */}
        <Collapsible
          open={showReadinessBreakdown}
          id="ride-readiness-breakdown"
          innerClassName="pt-4 md:pt-3.5"
        >
          <RideReadinessBreakdown readiness={readiness} isFr={isFr} />
        </Collapsible>

        {/* Hairline Divider */}
        <div className="h-px w-full bg-chip dark:bg-white/10 my-4 md:my-3.5" aria-hidden="true" />

        {/* Bottom 3-Column Intelligent Priority Highlights with Keyline Colored Duotone Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {brief.priorities.map((item) => {
            const PriorityIcon =
              item.id === 'visibility-twilight'
                ? Flashlight
                : getPriorityIcon(item.iconKey);
            return (
              <div key={item.id} className="flex items-center gap-3 min-w-0">
                <IconBadge
                  theme={item.theme}
                  icon={PriorityIcon}
                  size="lg"
                  shape="circle"
                  className="shrink-0"
                />
                <div className="min-w-0 flex flex-col gap-0.5">
                  <p className="text-[14px] font-bold text-ink font-rounded leading-[1.3]">
                    {item.headline}
                  </p>
                  <p className="text-[12px] font-medium text-ink-muted font-body leading-[1.3]">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Pills & Pre-Ride Action Strip */}
        <div className="mt-4 pt-3.5 md:mt-3.5 md:pt-3 border-t border-chip dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge variant="sky" size="md" icon={Gauge} className="tnum">
              {brief.tyrePressure.frontBar}/{brief.tyrePressure.rearBar} bar · {brief.tireWidthMm}mm{' '}
              {brief.isTubeless ? 'TL' : isFr ? 'chambre' : 'tubes'}
            </Badge>

            <Badge variant={brief.kit.tierTheme} size="md" icon={ThermometerSimple}>
              {brief.kit.tierBadge}
            </Badge>

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

            {showBlockerBadge && (
              <Badge
                variant={brief.firstProblem.severity === 'critical' ? 'red' : 'amber'}
                size="md"
                icon={TriangleAlert}
              >
                {brief.firstProblem.headline}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleCopyGroupLink}
              className="min-h-[44px] sm:h-8 sm:min-h-0 px-3.5 sm:px-3 rounded-full bg-pod hover:bg-chip text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              {copiedPlanLink ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedPlanLink
                  ? isFr
                    ? 'Lien copié !'
                    : 'Link copied!'
                  : isFr
                  ? 'Lien Groupe'
                  : 'Group Link'}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleDownloadFit}
              className="min-h-[44px] sm:h-8 sm:min-h-0 px-3.5 sm:px-3 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors tnum"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.FIT</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleDownloadGpx}
              className="min-h-[44px] sm:h-8 sm:min-h-0 px-3.5 sm:px-3 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors tnum"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{hasMultipleStages ? (isFr ? '.GPX Tour' : 'Tour .GPX') : '.GPX'}</span>
            </Button>

            {onOpenTools && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onOpenTools('wind')}
                className="min-h-[44px] sm:h-8 sm:min-h-0 px-3.5 sm:px-3 rounded-full bg-pod hover:bg-chip text-ink-secondary hover:text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{isFr ? 'Outils' : 'Free Tools'}</span>
              </Button>
            )}
          </div>
        </div>

        {exportError && (
          <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 font-body">
            {exportError}
          </p>
        )}
      </Collapsible>
    </section>
  );
};
