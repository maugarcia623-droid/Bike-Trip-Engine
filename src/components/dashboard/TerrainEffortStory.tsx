import React, { useId, useMemo, useState } from 'react';
import {
  EffortTracePoint,
  PowerZoneCode,
  SectionalEffortBand,
  SectionalEnergySummary,
} from '../../utils/physics';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { ChipTheme } from '../../tokens/chipTokens';

/* ──────────────────────────────────────────────────────────────────────────────
 * Effort & Terrain story — coloured flat design, max 3 surface levels
 *   Level 1  bg-card  (parent PhysicsEngineCard)
 *   Level 2  bg-pod   (this collapsible section — all content sits directly on it)
 *   Level 3  bg-chip  (bar tracks only)
 * One tabbed panel visible at a time to kill the "infinite scroll" feeling.
 * Each fact is shown once: no duplicate graphics for the same number.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Solid data fills, darker in light mode so bars keep ≥ ~3:1 against the warm pod surface */
export const ZONE_FILL: Record<PowerZoneCode, string> = {
  Z1: 'bg-emerald-600 dark:bg-emerald-400',
  Z2: 'bg-lime-600 dark:bg-lime-400',
  Z3: 'bg-yellow-600 dark:bg-yellow-300',
  Z4: 'bg-orange-600 dark:bg-orange-400',
  Z5: 'bg-rose-600 dark:bg-rose-400',
};

/** Design-system chip palette per zone (pills/badges use the 4-layer tonal tokens) */
export const ZONE_THEME: Record<PowerZoneCode, ChipTheme> = {
  Z1: 'emerald',
  Z2: 'lime',
  Z3: 'yellow-vest',
  Z4: 'orange',
  Z5: 'rose',
};

const ZONE_ORDER: PowerZoneCode[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
const EYEBROW = 'text-[10px] font-rounded font-bold uppercase tracking-[0.14em] text-ink-muted';

function zoneForPct(pct: number): PowerZoneCode {
  if (pct < 56) return 'Z1';
  if (pct <= 75) return 'Z2';
  if (pct <= 90) return 'Z3';
  if (pct <= 105) return 'Z4';
  return 'Z5';
}

type TabKey = 'effort' | 'terrain' | 'surface';

interface TerrainEffortStoryProps {
  sectional: SectionalEnergySummary;
  /** Show watts readouts (Pro view, or Guided riders who pace by power). */
  showWatts: boolean;
  totalKcal: number;
  /** Rendered inside the "Surface" tab (road surfaces & tire suitability). */
  surfaceSlot?: React.ReactNode;
}

function useFormatters(isFr: boolean) {
  return useMemo(() => {
    const num = (v: number, digits = 1) => {
      const s = v.toFixed(digits);
      return isFr ? s.replace('.', ',') : s;
    };
    const duration = (min: number) => {
      const m = Math.max(0, Math.round(min));
      const h = Math.floor(m / 60);
      const r = m % 60;
      if (h === 0) return `${r}\u00A0min`;
      return `${h}\u00A0h\u00A0${String(r).padStart(2, '0')}\u00A0min`;
    };
    const pct = (v: number) => (isFr ? `${v}\u00A0%` : `${v}%`);
    const int = (v: number) => Math.round(v).toLocaleString(isFr ? 'fr-FR' : 'en-US');
    return { num, duration, pct, int };
  }, [isFr]);
}

function bandName(id: SectionalEffortBand['id'], isFr: boolean) {
  if (id === 'easy') return isFr ? 'Plats & descentes' : 'Flats & descents';
  if (id === 'rolling') return isFr ? 'Faux-plats' : 'Rolling roads';
  return isFr ? 'Côtes' : 'Climbs';
}

/* ── Elevation as flat pill bars, each painted with its effort zone ── */
const ElevationBars: React.FC<{
  trace: EffortTracePoint[];
  ftp: number;
  peakKm: number;
  peakLabel: string;
  peakTheme: ChipTheme;
  isFr: boolean;
  fmtNum: (v: number, d?: number) => string;
}> = ({ trace, ftp, peakKm, peakLabel, peakTheme, isFr, fmtNum }) => {
  const model = useMemo(() => {
    if (trace.length < 2) return null;
    const d0 = trace[0].distKm;
    const dN = trace[trace.length - 1].distKm;
    const span = Math.max(0.1, dN - d0);
    const N = Math.min(44, Math.max(12, trace.length - 1));
    const bars: Array<{ ele: number; watts: number; startKm: number; endKm: number }> = [];
    let last = { ele: trace[0].eleM, watts: trace[0].watts };
    for (let k = 0; k < N; k++) {
      const a = d0 + (k / N) * span;
      const b = d0 + ((k + 1) / N) * span;
      const pts = trace.slice(1).filter((p) => p.distKm > a && p.distKm <= b + 1e-6);
      if (pts.length > 0) {
        last = {
          ele: pts.reduce((s, p) => s + p.eleM, 0) / pts.length,
          watts: pts.reduce((s, p) => s + p.watts, 0) / pts.length,
        };
      }
      bars.push({ ...last, startKm: a, endKm: b });
    }
    const eles = bars.map((b) => b.ele);
    const eMin = Math.min(...eles);
    const eMax = Math.max(...eles);
    // Honest scale: a flat route stays visually flat (minimum 60 m window)
    const range = Math.max(60, eMax - eMin);
    const peakIdx = Math.max(
      0,
      bars.findIndex((b) => peakKm > b.startKm && peakKm <= b.endKm + 1e-6)
    );
    return {
      bars: bars.map((b) => ({
        h: 18 + ((b.ele - eMin) / range) * 82,
        zone: zoneForPct(Math.round((b.watts / ftp) * 100)),
      })),
      peakIdx,
      eMin: Math.round(Math.min(...trace.map((p) => p.eleM))),
      eMax: Math.round(Math.max(...trace.map((p) => p.eleM))),
      span,
    };
  }, [trace, ftp, peakKm]);

  if (!model) return null;
  const peakLeftPct = ((model.peakIdx + 0.5) / model.bars.length) * 100;
  const anchor = peakLeftPct > 80 ? 'right' : peakLeftPct < 20 ? 'left' : 'center';

  return (
    <div
      role="img"
      aria-label={
        isFr
          ? 'Profil altimétrique, chaque barre colorée selon la zone d’effort'
          : 'Elevation profile, each bar coloured by effort zone'
      }
    >
      {/* Dedicated label lane: the peak badge never overlaps the bars */}
      <div className="relative h-6">
        <span
          className={`absolute top-0 ${
            anchor === 'center' ? '-translate-x-1/2' : anchor === 'right' ? '-translate-x-full' : ''
          }`}
          style={{ left: `${peakLeftPct}%` }}
        >
          <Badge variant={peakTheme} size="xs" className="tnum whitespace-nowrap">
            {peakLabel}
          </Badge>
        </span>
      </div>
      <div className="h-20 flex items-end gap-[2px]">
        {model.bars.map((b, i) => (
          <span
            key={i}
            className={`flex-1 min-w-0 rounded-full ${ZONE_FILL[b.zone]} ${
              i === model.peakIdx ? 'ring-2 ring-ink' : ''
            }`}
            style={{ height: `${b.h}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-rounded font-semibold text-ink-muted tnum">
        <span>0 km</span>
        <span>
          {model.eMin}–{model.eMax} m
        </span>
        <span>{fmtNum(model.span)} km</span>
      </div>
    </div>
  );
};

export const TerrainEffortStory: React.FC<TerrainEffortStoryProps> = ({
  sectional,
  showWatts,
  totalKcal,
  surfaceSlot,
}) => {
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';
  const f = useFormatters(isFr);
  const tabsId = useId();
  const [tab, setTab] = useState<TabKey>('effort');

  const ftp = Math.max(80, sectional.ftpWatts);
  const share = (z: PowerZoneCode) => sectional.zoneShares.find((s) => s.zone === z);
  const pctOf = (z: PowerZoneCode) => share(z)?.pctTime ?? 0;
  const minOf = (z: PowerZoneCode) => share(z)?.minutes ?? 0;

  const aerobicPct = pctOf('Z1') + pctOf('Z2');
  const intensePct = pctOf('Z4') + pctOf('Z5');
  const tempoPlusPct = pctOf('Z3') + intensePct;
  const aerobicMin = minOf('Z1') + minOf('Z2');
  const intenseMin = minOf('Z4') + minOf('Z5');

  const zoneName = (z: PowerZoneCode) => {
    const full = t(`ftpZone${z}` as Parameters<typeof t>[0]);
    const parts = String(full).split('·');
    return (parts[1] ?? parts[0]).trim();
  };

  /* Peak location — prefer the engine's exact km, fall back to the hottest trace bucket */
  const trace = sectional.effortTrace;
  const hottest = trace.reduce<EffortTracePoint | null>(
    (best, p) => (!best || p.watts > best.watts ? p : best),
    null
  );
  const peakKm = sectional.peakAtKm > 0 ? sectional.peakAtKm : hottest?.distKm ?? 0;
  const peakGrade = sectional.peakAtKm > 0 ? sectional.peakGradePct : hottest?.gradePct ?? 0;
  const peakPctFtp = Math.round((sectional.peakClimbWatts / ftp) * 100);

  /* ── Editorial copy ── */
  const character =
    aerobicPct >= 85
      ? { en: 'Aerobic', fr: 'Aérobie', intense: false }
      : intensePct >= 25
      ? { en: 'Intense', fr: 'Intense', intense: true }
      : tempoPlusPct >= 40
      ? { en: 'Tempo', fr: 'Tempo', intense: false }
      : { en: 'Mixed', fr: 'Variée', intense: false };

  const strong = (s: string) => <strong className="font-semibold text-ink">{s}</strong>;

  const lead = character.intense ? (
    isFr ? (
      <>{strong(f.pct(intensePct))} de la sortie au-dessus du seuil ({f.duration(intenseMin)}). </>
    ) : (
      <>{strong(`${intensePct}%`)} of your ride sits above threshold ({f.duration(intenseMin)}). </>
    )
  ) : isFr ? (
    <>{strong(f.pct(aerobicPct))} de la sortie en Z1–Z2 ({f.duration(aerobicMin)}). </>
  ) : (
    <>{strong(`${aerobicPct}%`)} of your ride stays in Z1–Z2 ({f.duration(aerobicMin)}). </>
  );

  const peakCue =
    peakGrade >= 2
      ? isFr
        ? `pente de ${f.num(peakGrade)}\u00A0% — moulinez tôt.`
        : `a ${f.num(peakGrade)}% pitch — shift down early.`
      : isFr
      ? 'portion exposée — restez abrité.'
      : 'an exposed stretch — stay tucked.';

  const peakSentence = isFr ? (
    <>
      Pic {showWatts ? <>{strong(`${sectional.peakClimbWatts}\u00A0W`)} ({f.pct(peakPctFtp)} FTP)</> : strong(sectional.peakZone)} au km{' '}
      {f.num(peakKm)}, sur une {peakCue}
    </>
  ) : (
    <>
      Peak {showWatts ? <>{strong(`${sectional.peakClimbWatts}\u00A0W`)} ({peakPctFtp}% FTP)</> : strong(sectional.peakZone)} at km{' '}
      {f.num(peakKm)}, on {peakCue}
    </>
  );

  const zoneDominant = sectional.zoneShares.reduce((a, b) => (b.pctTime > a.pctTime ? b : a));
  const zoneInsight =
    zoneDominant.zone === 'Z1' || zoneDominant.zone === 'Z2'
      ? isFr
        ? 'Allure surtout aérobie : vous brûlez des graisses et préservez le glycogène.'
        : 'Mostly aerobic: you burn fat and spare glycogen.'
      : zoneDominant.zone === 'Z3'
      ? isFr
        ? 'Dominante tempo : gourmande en glycogène — mangez tôt et souvent.'
        : 'Tempo-heavy: glycogen-hungry — fuel early and often.'
      : isFr
      ? 'Dominante seuil : fatigue profonde après ~60 min. Baissez la vitesse cible.'
      : 'Threshold-heavy: deep fatigue after ~60 min. Ease the target speed.';

  /* ── Terrain bands ── */
  const bands = sectional.bands;
  const activeBands = bands.filter((b) => b.distanceKm >= 0.1 && b.pctDistance > 0);
  const domBand = activeBands.reduce<SectionalEffortBand | null>(
    (a, b) => (!a || b.pctDistance > a.pctDistance ? b : a),
    null
  );
  const easyBand = activeBands.find((b) => b.id === 'easy');
  const hardBand = activeBands.filter((b) => b.id !== 'easy').sort((a, b) => b.avgWatts - a.avgWatts)[0];
  const powerRatio = easyBand && hardBand ? hardBand.avgWatts / Math.max(1, easyBand.avgWatts) : 1;

  const terrainCopy =
    domBand && hardBand && easyBand && powerRatio >= 1.2
      ? isFr
        ? `${bandName(domBand.id, true)} : ${f.pct(domBand.pctDistance)} de la distance. ${bandName(hardBand.id, true)} demandent ${f.num(powerRatio)}× plus de puissance.`
        : `${bandName(domBand.id, false)} cover ${domBand.pctDistance}% of the distance. ${bandName(hardBand.id, false)} ask for ${f.num(powerRatio)}× the power.`
      : isFr
      ? 'Effort homogène sur tout le parcours — gardez une cadence régulière.'
      : 'Even effort across the whole route — hold a steady cadence.';

  /* ── Energy ── */
  const kcalPerKm = (b: SectionalEffortBand) => b.kcalShare / Math.max(0.1, b.distanceKm);
  const fuelBands = activeBands.filter((b) => b.distanceKm >= 0.3 && b.kcalShare > 0);
  const fuelEasy = fuelBands.find((b) => b.id === 'easy');
  const fuelHard = fuelBands.filter((b) => b.id !== 'easy').sort((a, b) => kcalPerKm(b) - kcalPerKm(a))[0];
  const costRatio = fuelEasy && fuelHard ? kcalPerKm(fuelHard) / Math.max(0.1, kcalPerKm(fuelEasy)) : 1;
  const fuelInsight =
    fuelEasy && fuelHard && costRatio >= 1.3
      ? isFr
        ? `${bandName(fuelHard.id, true)} coûtent ${f.num(costRatio)}× plus au km que le plat — mangez avant.`
        : `${bandName(fuelHard.id, false)} cost ${f.num(costRatio)}× more per km than flats — eat before them.`
      : isFr
      ? 'Coût homogène — mangez à horloge fixe (toutes les 20 min).'
      : 'Even cost — fuel on a steady clock (every 20 min).';
  const kcalPerHour = Math.round(totalKcal / Math.max(0.25, sectional.totalMinutes / 60));

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'effort', label: isFr ? 'Effort' : 'Effort' },
    { key: 'terrain', label: isFr ? 'Relief & énergie' : 'Terrain & fuel' },
    ...(surfaceSlot ? [{ key: 'surface' as const, label: isFr ? 'Revêtement' : 'Surface' }] : []),
  ];

  return (
    <div>
      {/* ── Tabs: one panel at a time (no extra surface — underline indicator only) ── */}
      <div role="tablist" aria-label={t('sectionalEnergyHeading')} className="flex gap-6 border-b border-ink/10">
        {tabs.map((tb) => {
          const sel = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${tb.key}`}
              aria-selected={sel}
              aria-controls={`${tabsId}-panel-${tb.key}`}
              onClick={() => setTab(tb.key)}
              className={`relative min-w-0 min-h-[44px] py-3 text-left cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30 rounded-t-md ${
                sel ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <span className="block text-xs font-rounded font-bold leading-tight truncate">{tb.label}</span>
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors ${
                  sel ? 'bg-ink' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ─────────── PANEL · EFFORT ─────────── */}
      {tab === 'effort' && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-effort`}
          aria-labelledby={`${tabsId}-tab-effort`}
          className="pt-3.5 animate-fade-in"
        >
          <p className={EYEBROW}>{isFr ? 'Votre sortie sera' : 'Your ride will be'}</p>
          <h5 className="mt-1 text-[28px] leading-none font-rounded font-extrabold tracking-tight text-ink">
            {isFr ? character.fr : character.en}
          </h5>
          <p className="mt-2 text-xs font-body text-ink-secondary leading-relaxed tnum">
            {lead}
            {peakSentence}
          </p>

          <div className="mt-3">
            <ElevationBars
              trace={trace}
              ftp={ftp}
              peakKm={peakKm}
              peakLabel={showWatts ? `${sectional.peakClimbWatts} W` : sectional.peakZone}
              peakTheme={ZONE_THEME[sectional.peakZone]}
              isFr={isFr}
              fmtNum={f.num}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className={EYEBROW}>{isFr ? 'Temps par zone' : 'Time in zones'}</p>
            {showWatts && (
              <span className="text-[10px] font-rounded font-bold text-ink-muted tnum">FTP {ftp} W</span>
            )}
          </div>
          <ul className="mt-2 space-y-2">
            {ZONE_ORDER.map((z) => {
              const s = share(z);
              const p = s?.pctTime ?? 0;
              return (
                <li key={z} className={p === 0 ? 'opacity-50' : ''}>
                  <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
                    <span className="font-rounded font-bold text-ink truncate">
                      {z} <span className="font-semibold text-ink-secondary">{zoneName(z)}</span>
                      {showWatts && s && (
                        <span className="font-semibold text-ink-muted tnum"> · {s.wattsRange.replace('W', '\u00A0W')}</span>
                      )}
                    </span>
                    <span className="font-rounded tnum whitespace-nowrap">
                      <span className="font-bold text-ink">{f.pct(p)}</span>
                      <span className="font-semibold text-ink-muted"> · {f.duration(s?.minutes ?? 0)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-chip overflow-hidden" aria-hidden="true">
                    {p > 0 && (
                      <div
                        className={`h-full rounded-full ${ZONE_FILL[z]}`}
                        style={{ width: `${p}%`, minWidth: 6 }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] font-body text-ink-secondary leading-relaxed">{zoneInsight}</p>
        </div>
      )}

      {/* ─────────── PANEL · TERRAIN ─────────── */}
      {tab === 'terrain' && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-terrain`}
          aria-labelledby={`${tabsId}-tab-terrain`}
          className="pt-3.5 animate-fade-in"
        >
          <p className={EYEBROW}>{isFr ? 'Où partent les watts' : 'Where the watts go'}</p>
          <p className="mt-1.5 text-xs font-body text-ink-secondary leading-relaxed tnum">{terrainCopy}</p>

          <ul className="mt-2">
            {bands.map((b, i) => {
              const empty = b.distanceKm < 0.1 || b.pctDistance === 0;
              return (
                <li
                  key={b.id}
                  className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-ink/[0.08]' : ''} ${
                    empty ? 'opacity-55' : ''
                  }`}
                >
                  <Badge
                    variant={empty ? 'zinc' : ZONE_THEME[b.zone]}
                    size="sm"
                    className="min-w-[58px] justify-center tnum shrink-0"
                  >
                    {empty ? '—' : showWatts ? `${b.avgWatts} W` : b.zone}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-rounded font-bold text-ink leading-tight truncate">
                        {bandName(b.id, isFr)}
                      </span>
                      <span className="text-[13px] font-rounded font-bold text-ink tnum whitespace-nowrap">
                        {empty ? '' : `${f.num(b.distanceKm)}\u00A0km`}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-rounded font-semibold text-ink-muted tnum leading-snug">
                      {empty
                        ? b.id === 'climbs'
                          ? isFr
                            ? 'Aucune rampe au-dessus de 3,5 %'
                            : 'No ramps above 3.5% on this route'
                          : isFr
                          ? 'Absent du parcours'
                          : 'Not on this route'
                        : `${f.pct(b.pctDistance)} · ${f.num(b.avgSpeedKmH)}\u00A0km/h · ${f.int(b.kcalShare)}\u00A0kcal`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="lane-divider my-3" aria-hidden="true" />

          <p className={EYEBROW}>{isFr ? 'Coût énergétique' : 'Energy cost'}</p>
          <dl className="mt-2 grid grid-cols-2 divide-x divide-ink/10">
            <div className="pr-3">
              <dt className="text-[10px] font-rounded font-semibold text-ink-muted">{isFr ? 'Total' : 'Total'}</dt>
              <dd className="mt-0.5 text-xl leading-none font-rounded font-extrabold text-ink tnum">
                {f.int(totalKcal)}
                <span className="ml-1 text-[11px] font-bold text-ink-muted">kcal</span>
              </dd>
            </div>
            <div className="pl-3">
              <dt className="text-[10px] font-rounded font-semibold text-ink-muted">{isFr ? 'Dépense' : 'Burn rate'}</dt>
              <dd className="mt-0.5 text-xl leading-none font-rounded font-extrabold text-ink tnum">
                {f.int(kcalPerHour)}
                <span className="ml-1 text-[11px] font-bold text-ink-muted">kcal/h</span>
              </dd>
            </div>
          </dl>
          <p className="mt-2.5 text-[11px] font-body text-ink-secondary leading-relaxed tnum">{fuelInsight}</p>
        </div>
      )}

      {/* ─────────── PANEL · SURFACE ─────────── */}
      {tab === 'surface' && surfaceSlot && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-surface`}
          aria-labelledby={`${tabsId}-tab-surface`}
          className="pt-3.5 animate-fade-in"
        >
          {surfaceSlot}
        </div>
      )}
    </div>
  );
};
