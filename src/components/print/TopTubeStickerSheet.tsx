import React from 'react';
import {
  STEM_STICKER_PRESETS,
  StemStickerData,
  StemStickerPresetId,
} from '../../utils/stemSticker';

export interface TopTubeStickerStripProps {
  data: StemStickerData;
  presetId: StemStickerPresetId;
  lang: 'en' | 'fr';
  showCutMarks?: boolean;
  className?: string;
}

/**
 * Single physical-scale Top-Tube / Stem Cue Sticker strip.
 * Uses high-contrast monochrome ink designed for crisp home printing + clear packing tape.
 */
export const TopTubeStickerStrip: React.FC<TopTubeStickerStripProps> = ({
  data,
  presetId,
  lang,
  showCutMarks = true,
  className = '',
}) => {
  const isFr = lang === 'fr';
  const preset = STEM_STICKER_PRESETS[presetId];
  const isNarrow = presetId === 'road';

  return (
    <div
      style={{
        width: `${preset.widthMm}mm`,
        minHeight: `${preset.minHeightMm}mm`,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
      className={`relative bg-white text-[#111111] flex flex-col justify-between select-none ${
        showCutMarks ? 'border border-dashed border-[#111111]/65' : 'border border-[#111111]'
      } ${className}`}
    >
      {/* Corner crop marks for scissors / hobby knife */}
      {showCutMarks && (
        <>
          <span className="pointer-events-none absolute -top-2 -left-px w-px h-2 bg-[#111111]" />
          <span className="pointer-events-none absolute -top-px -left-2 w-2 h-px bg-[#111111]" />
          <span className="pointer-events-none absolute -top-2 -right-px w-px h-2 bg-[#111111]" />
          <span className="pointer-events-none absolute -top-px -right-2 w-2 h-px bg-[#111111]" />
          <span className="pointer-events-none absolute -bottom-2 -left-px w-px h-2 bg-[#111111]" />
          <span className="pointer-events-none absolute -bottom-px -left-2 w-2 h-px bg-[#111111]" />
          <span className="pointer-events-none absolute -bottom-2 -right-px w-px h-2 bg-[#111111]" />
          <span className="pointer-events-none absolute -bottom-px -right-2 w-2 h-px bg-[#111111]" />
        </>
      )}

      {/* Header block — high contrast black bar */}
      <div>
        <div className="bg-[#111111] text-white px-2 py-2">
          <div
            className={`${
              isNarrow ? 'text-[9.5px]' : 'text-[10.5px]'
            } font-extrabold leading-tight tracking-tight truncate`}
          >
            {data.title}
          </div>
          <div className="flex items-center justify-between gap-1 text-[8px] font-semibold text-white/85 tnum mt-0.5">
            <span>{data.distanceKm.toFixed(1)} km</span>
            <span>+{data.elevationGainM} m</span>
            <span>{data.movingLabel}</span>
          </div>
        </div>

        {/* Setup micro-bar: pressure & start -> finish */}
        <div className="px-2 py-1 border-b border-[#111111] flex items-center justify-between text-[7.5px] font-bold tnum bg-[#F4F3EF]">
          <span>
            {data.startTime}→{data.finishHHMM}
          </span>
          <span>{data.tyrePressureLine}</span>
        </div>

        {/* Cue table */}
        <div className="divide-y divide-[#111111]/20">
          {data.rows.map((row) => (
            <div
              key={row.id}
              className={`px-2 py-1.5 flex items-start gap-1.5 ${
                row.kind === 'warning'
                  ? 'bg-[#111111] text-white'
                  : row.emphasis
                  ? 'bg-[#F2F455]/45'
                  : ''
              }`}
            >
              {/* KM + ETA column */}
              <div className="shrink-0 w-[34px] leading-none">
                <div
                  className={`${
                    isNarrow ? 'text-[8.5px]' : 'text-[9px]'
                  } font-extrabold tnum`}
                >
                  {row.km.toFixed(row.km >= 100 ? 0 : 1)}
                </div>
                {row.etaHHMM && (
                  <div
                    className={`text-[7px] tnum mt-0.5 ${
                      row.kind === 'warning' ? 'text-white/80' : 'text-[#555555]'
                    }`}
                  >
                    {row.etaHHMM}
                  </div>
                )}
              </div>

              {/* Event description */}
              <div className="min-w-0 flex-1 leading-tight">
                <div
                  className={`${
                    isNarrow ? 'text-[8px]' : 'text-[8.5px]'
                  } font-bold break-words`}
                >
                  {row.title}
                </div>
                {row.detail && (
                  <div
                    className={`text-[7px] mt-0.5 break-words ${
                      row.kind === 'warning' ? 'text-white/90 font-semibold' : 'text-[#444444]'
                    }`}
                  >
                    {row.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Fuel cue + subtle Cadence wordmark */}
      <div className="border-t border-[#111111]">
        <div className="px-2 py-1 text-[7.5px] font-bold tnum text-center bg-[#F4F3EF] border-b border-[#111111]/20">
          {data.fuelCueLine}
        </div>
        <div className="px-2 py-1 flex items-center justify-between text-[7px] font-bold tracking-tight text-[#444444]">
          <span>cadence</span>
          <span>{isFr ? 'Coller + scotch clair' : 'Tape with clear tape'}</span>
        </div>
      </div>
    </div>
  );
};

export interface TopTubeStickerPrintSheetProps {
  data: StemStickerData;
  presetId: StemStickerPresetId;
  copies: 1 | 2;
  lang: 'en' | 'fr';
}

/**
 * Full printable A4/Letter sheet holding 1 or 2 real-scale Top-Tube Stickers with cutting instructions.
 */
export const TopTubeStickerPrintSheet: React.FC<TopTubeStickerPrintSheetProps> = ({
  data,
  presetId,
  copies,
  lang,
}) => {
  const isFr = lang === 'fr';
  const preset = STEM_STICKER_PRESETS[presetId];

  return (
    <div className="bg-white text-[#111111] p-8 font-sans">
      <div className="mb-6 pb-3 border-b border-dashed border-[#111111]/30 flex items-center justify-between">
        <div>
          <div className="text-sm font-extrabold tracking-tight">
            Cadence — {isFr ? 'Sticker Cadre / Potence' : 'Top-Tube Stem Sticker'}
          </div>
          <div className="text-[11px] text-[#555555] mt-0.5">
            {isFr
              ? `Imprimer à 100 % (taille réelle · ${preset.dimLabel}). Découper sur les pointillés et fixer sur le tube supérieur avec du ruban adhésif transparent.`
              : `Print at 100% scale (actual size · ${preset.dimLabel}). Cut along the dashed line and seal onto your top tube with clear packing tape.`}
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-[#555555]">
          <div>{preset.dimLabel}</div>
          <div>{copies === 2 ? (isFr ? '2 exemplaires' : '2 copies') : '1×'}</div>
        </div>
      </div>

      {/* 5 cm calibration scale ruler */}
      <div className="mb-8 flex items-center gap-3">
        <div
          style={{ width: '50mm' }}
          className="h-3 border-x border-b border-[#111111] relative flex items-end justify-between text-[8px] font-mono px-0.5"
        >
          <span>0</span>
          <span>2.5</span>
          <span>5 cm</span>
        </div>
        <span className="text-[10px] text-[#555555]">
          {isFr ? 'Repère d’échelle (doit mesurer exactement 5 cm)' : 'Scale check (should measure exactly 5 cm)'}
        </span>
      </div>

      <div className="flex items-start gap-12">
        <TopTubeStickerStrip data={data} presetId={presetId} lang={lang} showCutMarks />
        {copies === 2 && (
          <TopTubeStickerStrip data={data} presetId={presetId} lang={lang} showCutMarks />
        )}
      </div>
    </div>
  );
};
