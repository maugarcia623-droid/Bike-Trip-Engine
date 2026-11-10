import { WaterGapAlert } from '../types/amenities';

type Lang = 'en' | 'fr' | string;

/** Locale-aware one-decimal distance (12.5 km / 12,5 km). */
export function formatKm(km: number, lang: Lang): string {
  return (Math.round(km * 10) / 10).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Actionable packing advice for a critical gap (Phase 8).
 * Uses extraPackableBidons (bottles beyond frame cages), never the gap total.
 */
export function formatCriticalGapAdvice(gap: WaterGapAlert | undefined, lang: Lang): string {
  const isFr = lang === 'fr';
  const extra = gap?.extraPackableBidons ?? 0;
  const start = gap ? formatKm(gap.startKm, lang) : '0';
  if (extra > 0) {
    return isFr
      ? `Emportez ${extra} bidon${extra > 1 ? 's' : ''} supplémentaire${extra > 1 ? 's' : ''} ou prévoyez un point d’eau`
      : `Carry ${extra} extra bottle${extra > 1 ? 's' : ''} or plan a refill stop`;
  }
  return isFr
    ? `Remplissez tous vos bidons avant le km ${start}`
    : `Fill every bottle before km ${start}`;
}

/** Compact "18.3 km (~44 min) · 610 ml (47% of your bottles)" detail line. */
export function formatGapDetail(gap: WaterGapAlert, lang: Lang): string {
  const isFr = lang === 'fr';
  const minutes = Math.round((gap.gapHours ?? 0) * 60);
  const pct = gap.depletionPct ?? 0;
  const ml = (gap.gapFluidNeedMl ?? 0).toLocaleString(isFr ? 'fr-FR' : 'en-US');
  const capacity =
    pct > 100
      ? isFr
        ? 'plus que vos bidons'
        : 'more than your bottles hold'
      : isFr
      ? `${pct} % de vos bidons`
      : `${pct}% of your bottles`;
  return `${formatKm(gap.distanceKm, lang)} km (~${minutes} min) · ${ml} ml (${capacity})`;
}
