import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lightning, Pen } from '@/components/icons';
import { CHIP_DUOTONE_ISOLATION_CLASSES } from '../../tokens/chipTokens';
import {
  ArchetypeChipDef,
  CHIP_ICONS,
  ChipColorKey,
  ChipPresetSetting,
} from '../../utils/archetypeChips';
import { addMinutesToTime, subtractMinutesFromTime } from '../../utils/nutrition';

interface RuleCardAccent {
  pill: string;
  interactive: string;
  divider: string;
}

/**
 * Static unified-hue inner capsule & button surfaces tuned one tonal step above
 * `.chip-rule-card` across all 10 existing ChipTheme palettes (Light & Dark modes).
 */
const RULE_CARD_ACCENT_MAP: Record<ChipColorKey, RuleCardAccent> = {
  amber: {
    pill: 'bg-amber-200/60 dark:bg-amber-400/15',
    interactive:
      'bg-amber-200/60 hover:bg-amber-200/95 active:bg-amber-300/80 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 dark:active:bg-amber-400/35',
    divider: 'border-amber-500/20 dark:border-amber-400/15',
  },
  blue: {
    pill: 'bg-blue-200/60 dark:bg-blue-400/15',
    interactive:
      'bg-blue-200/60 hover:bg-blue-200/95 active:bg-blue-300/80 dark:bg-blue-400/15 dark:hover:bg-blue-400/25 dark:active:bg-blue-400/35',
    divider: 'border-blue-500/20 dark:border-blue-400/15',
  },
  purple: {
    pill: 'bg-purple-200/60 dark:bg-purple-400/15',
    interactive:
      'bg-purple-200/60 hover:bg-purple-200/95 active:bg-purple-300/80 dark:bg-purple-400/15 dark:hover:bg-purple-400/25 dark:active:bg-purple-400/35',
    divider: 'border-purple-500/20 dark:border-purple-400/15',
  },
  emerald: {
    pill: 'bg-emerald-200/60 dark:bg-emerald-400/15',
    interactive:
      'bg-emerald-200/60 hover:bg-emerald-200/95 active:bg-emerald-300/80 dark:bg-emerald-400/15 dark:hover:bg-emerald-400/25 dark:active:bg-emerald-400/35',
    divider: 'border-emerald-500/20 dark:border-emerald-400/15',
  },
  orange: {
    pill: 'bg-orange-200/60 dark:bg-orange-400/15',
    interactive:
      'bg-orange-200/60 hover:bg-orange-200/95 active:bg-orange-300/80 dark:bg-orange-400/15 dark:hover:bg-orange-400/25 dark:active:bg-orange-400/35',
    divider: 'border-orange-500/20 dark:border-orange-400/15',
  },
  teal: {
    pill: 'bg-teal-200/60 dark:bg-teal-400/15',
    interactive:
      'bg-teal-200/60 hover:bg-teal-200/95 active:bg-teal-300/80 dark:bg-teal-400/15 dark:hover:bg-teal-400/25 dark:active:bg-teal-400/35',
    divider: 'border-teal-500/20 dark:border-teal-400/15',
  },
  lime: {
    pill: 'bg-lime-200/65 dark:bg-lime-400/15',
    interactive:
      'bg-lime-200/65 hover:bg-lime-200/95 active:bg-lime-300/80 dark:bg-lime-400/15 dark:hover:bg-lime-400/25 dark:active:bg-lime-400/35',
    divider: 'border-lime-600/20 dark:border-lime-400/15',
  },
  sky: {
    pill: 'bg-sky-200/60 dark:bg-sky-400/15',
    interactive:
      'bg-sky-200/60 hover:bg-sky-200/95 active:bg-sky-300/80 dark:bg-sky-400/15 dark:hover:bg-sky-400/25 dark:active:bg-sky-400/35',
    divider: 'border-sky-500/20 dark:border-sky-400/15',
  },
  rose: {
    pill: 'bg-rose-200/60 dark:bg-rose-400/15',
    interactive:
      'bg-rose-200/60 hover:bg-rose-200/95 active:bg-rose-300/80 dark:bg-rose-400/15 dark:hover:bg-rose-400/25 dark:active:bg-rose-400/35',
    divider: 'border-rose-500/20 dark:border-rose-400/15',
  },
  'yellow-vest': {
    pill: 'bg-[#dfe874]/60 dark:bg-[#dfff00]/15',
    interactive:
      'bg-[#dfe874]/60 hover:bg-[#dfe874]/90 active:bg-[#d2dd58]/85 dark:bg-[#dfff00]/15 dark:hover:bg-[#dfff00]/25 dark:active:bg-[#dfff00]/35',
    divider: 'border-[#a3b300]/25 dark:border-[#dfff00]/20',
  },
};

function getFieldVisualPriority(type: ChipPresetSetting['type']): number {
  if (type === 'number' || type === 'time') return 0;
  if (type === 'select') return 1;
  if (type === 'boolean') return 2;
  return 3;
}

function getNumericStepConfig(
  field: ChipPresetSetting,
  currentVal: number
): { step: number; min: number; max: number; decimals: number } {
  const unit = field.unit || '';
  const defVal = Number(field.defaultValue) || 0;

  if (unit === 'bar') {
    return { step: 0.1, min: 0.5, max: 8.5, decimals: 1 };
  }
  if (unit === 'kg') {
    const isLight = defVal < 1.5;
    return { step: isLight ? 0.1 : 0.5, min: 0, max: 35, decimals: 1 };
  }
  if (unit === 'W') {
    return { step: 5, min: 60, max: 900, decimals: 0 };
  }
  if (unit === 'm/h') {
    return { step: 25, min: 150, max: 2200, decimals: 0 };
  }
  if (unit === '%') {
    return { step: 5, min: 0, max: 100, decimals: 0 };
  }
  if (unit === 'g/h') {
    return { step: 5, min: 0, max: 160, decimals: 0 };
  }
  if (unit === 'km') {
    return { step: 5, min: 5, max: 300, decimals: 0 };
  }
  if (unit === 'km/h') {
    return { step: 1, min: 5, max: 65, decimals: 1 };
  }
  if (unit === 'min') {
    const useFiveMinStep = defVal >= 15 && defVal % 5 === 0 && currentVal % 5 === 0;
    return { step: useFiveMinStep ? 5 : 1, min: 0, max: 300, decimals: 0 };
  }

  const hasDecimal = !Number.isInteger(defVal);
  return { step: hasDecimal ? 0.5 : 1, min: 0, max: 999, decimals: hasDecimal ? 1 : 0 };
}

interface StepperPairProps {
  onIncrement: () => void;
  onDecrement: () => void;
  accent: RuleCardAccent;
  incLabel: string;
  decLabel: string;
  disableInc?: boolean;
  disableDec?: boolean;
}

const StepperButtons: React.FC<StepperPairProps> = ({
  onIncrement,
  onDecrement,
  accent,
  incLabel,
  decLabel,
  disableInc = false,
  disableDec = false,
}) => (
  <div className="flex flex-col gap-1 shrink-0">
    <button
      type="button"
      onClick={onIncrement}
      disabled={disableInc}
      aria-label={incLabel}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 select-none chip-rule-title ${
        disableInc
          ? `${accent.pill} opacity-35 cursor-not-allowed`
          : `${accent.interactive} cursor-pointer active:scale-90`
      }`}
    >
      <ArrowUp className="w-3.5 h-3.5 text-current [&_path]:[stroke-width:2.3]" aria-hidden="true" />
    </button>
    <button
      type="button"
      onClick={onDecrement}
      disabled={disableDec}
      aria-label={decLabel}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 select-none chip-rule-title ${
        disableDec
          ? `${accent.pill} opacity-35 cursor-not-allowed`
          : `${accent.interactive} cursor-pointer active:scale-90`
      }`}
    >
      <ArrowDown className="w-3.5 h-3.5 text-current [&_path]:[stroke-width:2.3]" aria-hidden="true" />
    </button>
  </div>
);

interface NumericRuleFieldProps {
  field: ChipPresetSetting;
  value: number;
  isFr: boolean;
  accent: RuleCardAccent;
  sizeVariant: 'hero' | 'compactHero';
  onChange: (nextVal: number) => void;
}

const NumericRuleField: React.FC<NumericRuleFieldProps> = ({
  field,
  value,
  isFr,
  accent,
  sizeVariant,
  onChange,
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const label = isFr ? field.labelFr : field.labelEn;
  const numericVal = Number.isFinite(Number(value)) ? Number(value) : Number(field.defaultValue) || 0;
  const displayStr = draft !== null ? draft : String(numericVal);

  const heroTextClasses =
    sizeVariant === 'hero'
      ? 'text-[32px] sm:text-[38px]'
      : 'text-[26px] sm:text-[30px]';

  const unitLabel =
    field.unit === 'min'
      ? isFr
        ? 'min'
        : numericVal === 1
        ? 'min'
        : 'mins'
      : field.unit;

  const handleStep = (direction: 1 | -1) => {
    const cfg = getNumericStepConfig(field, numericVal);
    const rawNext = numericVal + direction * cfg.step;
    const clamped = Math.min(cfg.max, Math.max(cfg.min, rawNext));
    const rounded = Number(clamped.toFixed(cfg.decimals));
    setDraft(null);
    onChange(rounded);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="inline-grid items-baseline max-w-full">
            <span
              aria-hidden="true"
              className={`invisible col-start-1 row-start-1 whitespace-pre pointer-events-none select-none font-rounded font-bold ${heroTextClasses} leading-[0.9] tracking-[-0.03em] tnum`}
            >
              {displayStr || '0'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={displayStr}
              aria-label={label}
              onChange={(e) => {
                const raw = e.target.value.replace(',', '.');
                if (!/^-?\d*\.?\d*$/.test(raw)) return;
                setDraft(raw);
                if (raw !== '' && raw !== '-' && !raw.endsWith('.')) {
                  const parsed = parseFloat(raw);
                  if (Number.isFinite(parsed)) {
                    onChange(parsed);
                  }
                }
              }}
              onBlur={() => {
                if (draft !== null) {
                  const parsed = parseFloat(draft);
                  onChange(Number.isFinite(parsed) ? parsed : 0);
                  setDraft(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  handleStep(1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  handleStep(-1);
                } else if (e.key === 'Enter') {
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className={`col-start-1 row-start-1 w-full min-w-[1ch] bg-transparent border-0 p-0 m-0 font-rounded font-bold ${heroTextClasses} leading-[0.9] tracking-[-0.03em] tnum chip-rule-title focus:outline-none focus:underline focus:decoration-2 focus:underline-offset-4 cursor-text`}
            />
          </span>

          {unitLabel && (
            <span className="font-rounded font-semibold text-xs sm:text-sm leading-none chip-rule-title opacity-90 select-none shrink-0">
              {unitLabel}
            </span>
          )}
        </div>

        <StepperButtons
          onIncrement={() => handleStep(1)}
          onDecrement={() => handleStep(-1)}
          accent={accent}
          incLabel={isFr ? `Augmenter : ${label}` : `Increase ${label}`}
          decLabel={isFr ? `Diminuer : ${label}` : `Decrease ${label}`}
        />
      </div>

      <span className="text-[11px] sm:text-xs text-ink-muted block mt-1 leading-snug">
        {label}
      </span>
    </div>
  );
};

interface TimeRuleFieldProps {
  field: ChipPresetSetting;
  value: string;
  isFr: boolean;
  accent: RuleCardAccent;
  sizeVariant: 'hero' | 'compactHero';
  onChange: (nextTime: string) => void;
}

const TimeRuleField: React.FC<TimeRuleFieldProps> = ({
  field,
  value,
  isFr,
  accent,
  sizeVariant,
  onChange,
}) => {
  const label = isFr ? field.labelFr : field.labelEn;
  const safeTime =
    typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
      ? value
      : String(field.defaultValue || '18:00');

  const timeTextClasses =
    sizeVariant === 'hero'
      ? 'text-[28px] sm:text-[32px]'
      : 'text-[24px] sm:text-[26px]';

  return (
    <div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative inline-flex items-baseline min-w-0 group">
          <span
            className={`font-rounded font-bold ${timeTextClasses} leading-[0.92] tracking-[-0.03em] tnum chip-rule-title group-focus-within:underline group-focus-within:decoration-2 group-focus-within:underline-offset-4`}
          >
            {safeTime}
          </span>
          <input
            type="time"
            value={safeTime}
            aria-label={label}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            onClick={(e) => {
              const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
              try {
                el.showPicker?.();
              } catch {
                // Ignore if showPicker is unsupported or already open
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <StepperButtons
          onIncrement={() => onChange(addMinutesToTime(safeTime, 15))}
          onDecrement={() => onChange(subtractMinutesFromTime(safeTime, 15))}
          accent={accent}
          incLabel={isFr ? `+15 min (${label})` : `+15 min (${label})`}
          decLabel={isFr ? `-15 min (${label})` : `-15 min (${label})`}
        />
      </div>

      <span className="text-[11px] sm:text-xs text-ink-muted block mt-1 leading-snug">
        {label}
      </span>
    </div>
  );
};

interface SelectRuleFieldProps {
  field: ChipPresetSetting;
  value: string;
  isFr: boolean;
  accent: RuleCardAccent;
  onChange: (nextVal: string) => void;
}

const SelectRuleField: React.FC<SelectRuleFieldProps> = ({
  field,
  value,
  isFr,
  accent,
  onChange,
}) => {
  const options = field.options || [];
  const label = isFr ? field.labelFr : field.labelEn;
  const currentIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );
  const activeOption = options[currentIndex] || options[0];
  const activeDisplay = activeOption
    ? isFr
      ? activeOption.labelFr
      : activeOption.labelEn
    : String(value);

  const parenMatch = activeDisplay.match(/^(.+?)\s*\((.+)\)$/);
  const headline = parenMatch ? parenMatch[1] : activeDisplay;
  const qualifier = parenMatch ? parenMatch[2] : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative inline-flex flex-wrap items-baseline gap-1.5 min-w-0 group cursor-pointer">
          <span className="font-rounded font-bold text-[17px] sm:text-[19px] leading-tight tracking-tight tnum chip-rule-title group-focus-within:underline group-focus-within:decoration-2 group-focus-within:underline-offset-4">
            {headline}
          </span>
          {qualifier && (
            <span className="font-rounded font-semibold text-xs leading-tight chip-rule-title opacity-85">
              {qualifier}
            </span>
          )}
          <select
            value={value}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {isFr ? opt.labelFr : opt.labelEn}
              </option>
            ))}
          </select>
        </div>

        <StepperButtons
          onIncrement={() => {
            if (currentIndex < options.length - 1) {
              onChange(options[currentIndex + 1].value);
            }
          }}
          onDecrement={() => {
            if (currentIndex > 0) {
              onChange(options[currentIndex - 1].value);
            }
          }}
          disableInc={currentIndex >= options.length - 1}
          disableDec={currentIndex <= 0}
          accent={accent}
          incLabel={isFr ? `Option suivante : ${label}` : `Next ${label}`}
          decLabel={isFr ? `Option précédente : ${label}` : `Previous ${label}`}
        />
      </div>

      <span className="text-[11px] sm:text-xs text-ink-muted block mt-1 leading-snug">
        {label}
      </span>
    </div>
  );
};

interface BooleanRuleFieldProps {
  field: ChipPresetSetting;
  value: boolean;
  isFr: boolean;
  accent: RuleCardAccent;
  isSoleField: boolean;
  onChange: (nextVal: boolean) => void;
}

const BooleanRuleField: React.FC<BooleanRuleFieldProps> = ({
  field,
  value,
  isFr,
  accent,
  isSoleField,
  onChange,
}) => {
  const label = isFr ? field.labelFr : field.labelEn;
  const stateLabel = value
    ? isFr
      ? 'Appliqué'
      : 'Active'
    : isFr
    ? 'Facultatif'
    : 'Advisory';

  return (
    <div>
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => onChange(!value)}
          className="text-left focus:outline-none cursor-pointer group min-w-0"
        >
          <span
            className={`font-rounded font-bold ${
              isSoleField ? 'text-[20px] sm:text-[23px]' : 'text-[16px] sm:text-[18px]'
            } leading-none tracking-tight chip-rule-title transition-opacity duration-150 block break-words ${
              value ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'
            }`}
          >
            {stateLabel}
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          aria-label={label}
          onClick={() => onChange(!value)}
          className={`w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-all duration-200 cursor-pointer active:scale-95 chip-rule-title ${accent.interactive}`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center shadow-xs transition-all duration-200 ${
              value
                ? 'translate-x-5 bg-white dark:bg-zinc-900 opacity-100'
                : 'translate-x-0 bg-white/75 dark:bg-zinc-900/60 opacity-55'
            }`}
          >
            {value && <Check className="w-3 h-3 text-current" aria-hidden="true" />}
          </span>
        </button>
      </div>

      <span className="text-[11px] sm:text-xs text-ink-muted block mt-1 leading-snug">
        {label}
      </span>
    </div>
  );
};

interface TextRuleFieldProps {
  field: ChipPresetSetting;
  value: string;
  isFr: boolean;
  accent: RuleCardAccent;
  onChange: (nextVal: string) => void;
}

const TextRuleField: React.FC<TextRuleFieldProps> = ({
  field,
  value,
  isFr,
  accent,
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = isFr ? field.labelFr : field.labelEn;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value ?? ''}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent border-0 p-0 font-rounded font-bold text-[13px] sm:text-[14px] leading-snug tracking-tight chip-rule-title focus:outline-none focus:underline focus:decoration-2 focus:underline-offset-4"
        />
        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          aria-label={isFr ? `Modifier : ${label}` : `Edit ${label}`}
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer active:scale-90 chip-rule-title ${accent.interactive}`}
        >
          <Pen className="w-3 h-3 text-current" aria-hidden="true" />
        </button>
      </div>

      <span className="text-[11px] sm:text-xs text-ink-muted block mt-1 leading-snug">
        {label}
      </span>
    </div>
  );
};

export interface PresetRuleCardProps {
  def: ArchetypeChipDef;
  ruleSettings: Record<string, any>;
  isFr: boolean;
  onUpdateSetting: (key: string, value: any) => void;
}

export const PresetRuleCard: React.FC<PresetRuleCardProps> = ({
  def,
  ruleSettings,
  isFr,
  onUpdateSetting,
}) => {
  const Icon = CHIP_ICONS[def.iconName] || Lightning;
  const accent = RULE_CARD_ACCENT_MAP[def.colorKey] || RULE_CARD_ACCENT_MAP.amber;

  const orderedFields = [...def.settingsFields].sort(
    (a, b) => getFieldVisualPriority(a.type) - getFieldVisualPriority(b.type)
  );
  const heroMetricCount = orderedFields.filter(
    (f) => f.type === 'number' || f.type === 'time'
  ).length;
  const heroSizeVariant: 'hero' | 'compactHero' =
    heroMetricCount <= 1 ? 'hero' : 'compactHero';
  const isSoleField = orderedFields.length === 1;

  return (
    <div
      className={`chip-theme-${def.colorKey} chip-rule-card ${CHIP_DUOTONE_ISOLATION_CLASSES} rounded-pod border-[1.5px] p-3.5 sm:p-4 flex flex-col justify-between gap-3 sm:gap-3.5 transition-colors animate-fade-in`}
    >
      {/* Top Section: Twin Tonal Header Capsules + Rounded Protocol Heading & Description */}
      <div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 chip-rule-title ${accent.pill}`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" aria-hidden="true" />
          </div>
          <span
            className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-full inline-flex items-center font-rounded font-bold text-[11px] sm:text-xs leading-none chip-rule-title ${accent.pill} break-words`}
          >
            {isFr ? def.labelFr : def.labelEn}
          </span>
        </div>

        <div className="mt-3">
          <h5 className="chip-rule-title font-rounded font-bold text-[14px] sm:text-[15px] leading-snug tracking-tight break-words">
            {isFr ? def.ruleTitleFr : def.ruleTitleEn}
          </h5>
          <p className="text-[11.5px] sm:text-xs text-ink-muted mt-1 leading-normal break-words">
            {isFr ? def.ruleDescriptionFr : def.ruleDescriptionEn}
          </p>
        </div>
      </div>

      {/* Bottom Section: Large Rounded Typography & Tactile Interactive Controls */}
      <div className="mt-auto space-y-2 sm:space-y-2.5">
        {orderedFields.map((field, index) => {
          const val = ruleSettings[field.id] ?? field.defaultValue;

          return (
            <div
              key={field.id}
              className={index > 0 ? `pt-2 sm:pt-2.5 border-t border-dashed ${accent.divider}` : undefined}
            >
              {field.type === 'number' ? (
                <NumericRuleField
                  field={field}
                  value={Number(val ?? field.defaultValue ?? 0)}
                  isFr={isFr}
                  accent={accent}
                  sizeVariant={heroSizeVariant}
                  onChange={(nextVal) => onUpdateSetting(field.id, nextVal)}
                />
              ) : field.type === 'time' ? (
                <TimeRuleField
                  field={field}
                  value={String(val ?? field.defaultValue ?? '18:00')}
                  isFr={isFr}
                  accent={accent}
                  sizeVariant={heroSizeVariant}
                  onChange={(nextVal) => onUpdateSetting(field.id, nextVal)}
                />
              ) : field.type === 'select' && field.options ? (
                <SelectRuleField
                  field={field}
                  value={String(val ?? field.defaultValue ?? '')}
                  isFr={isFr}
                  accent={accent}
                  onChange={(nextVal) => onUpdateSetting(field.id, nextVal)}
                />
              ) : field.type === 'boolean' ? (
                <BooleanRuleField
                  field={field}
                  value={Boolean(val)}
                  isFr={isFr}
                  accent={accent}
                  isSoleField={isSoleField}
                  onChange={(nextVal) => onUpdateSetting(field.id, nextVal)}
                />
              ) : (
                <TextRuleField
                  field={field}
                  value={String(val ?? field.defaultValue ?? '')}
                  isFr={isFr}
                  accent={accent}
                  onChange={(nextVal) => onUpdateSetting(field.id, nextVal)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PresetRuleCard;
