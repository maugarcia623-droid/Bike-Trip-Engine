import React, { useState, useEffect } from 'react';
import {
  Sparkle,
  ArrowRight,
  Check,
  Lightning,
  Calendar,
  Clock,
  Compass,
  Package,
  User,
  Bicycle,
  NavigationArrow,
  Shield,
  Wind,
  Path,
  ShieldWarning,
  Coffee,
  Wrench,
} from '@/components/icons';
import { TripProfile } from '../../types/trip';
import { parseTripDescription, ParsedFeedback } from '../../utils/nlpParser';
import { useTranslation } from '../../context/LanguageContext';

interface NaturalLanguagePromptProps {
  currentTrip: TripProfile;
  onApplyParsed: (parsed: Partial<TripProfile>, meta?: ParsedFeedback) => void;
}

export const NaturalLanguagePrompt: React.FC<NaturalLanguagePromptProps> = ({
  currentTrip,
  onApplyParsed,
}) => {
  const { lang, t } = useTranslation();
  const [prompt, setPrompt] = useState(() => {
    return localStorage.getItem('velotaf_last_nl_prompt') || '';
  });
  const [isApplied, setIsApplied] = useState(false);
  const [feedback, setFeedback] = useState<ParsedFeedback | null>(null);

  const presetPrompts = [
    {
      label: t('nlpPresetCommuteLabel'),
      text: t('nlpPresetCommuteText'),
    },
    {
      label: t('nlpPresetEscapadeLabel'),
      text: t('nlpPresetEscapadeText'),
    },
    {
      label: t('nlpPresetBikepackingLabel'),
      text: t('nlpPresetBikepackingText'),
    },
    {
      label: t('nlpPresetSportLabel'),
      text: t('nlpPresetSportText'),
    },
  ];

  useEffect(() => {
    localStorage.setItem('velotaf_last_nl_prompt', prompt);
  }, [prompt]);

  const handleParse = (textToParse?: string) => {
    const rawText = textToParse || prompt;
    if (!rawText.trim()) return;

    const { parsedValues, detected } = parseTripDescription(rawText, currentTrip, lang);

    onApplyParsed(parsedValues, detected);
    setFeedback(detected);
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 4500);
  };

  const handleApplyPreset = (presetText: string) => {
    setPrompt(presetText);
    handleParse(presetText);
  };

  return (
    <div className="rounded-card bg-card text-ink p-4 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-pod flex items-center justify-center text-ink dark:text-volt shrink-0 mt-0.5">
            <Sparkle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
              {t('nlpHeading')}
            </h3>
            <p className="text-[13px] text-ink-muted mt-0.5">
              {t('nlpSub')}
            </p>
          </div>
        </div>

        {isApplied && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-volt-lime text-[#111111] dark:bg-pod dark:text-volt-lime px-3.5 py-1.5 rounded-full animate-fade-in shrink-0">
            <Check className="w-4 h-4" />
            {t('nlpAppliedBadge')}
          </span>
        )}
      </div>

      {/* Preset Quick Pills */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3.5 text-xs">
        <span className="text-xs text-ink-muted font-medium whitespace-nowrap mr-1">
          {t('nlpTemplatesLabel')}
        </span>
        {presetPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyPreset(p.text)}
            className="px-3.5 py-1.5 rounded-full bg-pod hover:bg-chip text-xs font-medium text-ink-secondary hover:text-ink transition-colors whitespace-nowrap cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Full-Radius Chain-Link Command Capsule (Zero rounded rectangles) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl sm:rounded-full bg-pod p-2 sm:p-1.5 sm:pl-5 focus-within:ring-2 focus-within:ring-ink/20 transition-all">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleParse();
              }
            }}
            placeholder={t('nlpPlaceholder')}
            className="flex-1 min-w-0 bg-transparent px-2 sm:px-0 py-1.5 sm:py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />

          <button
            type="button"
            onClick={() => handleParse()}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-medium rounded-xl sm:rounded-full bg-[#111111] hover:bg-[#262626] text-white dark:bg-chip dark:hover:bg-chip-hover dark:text-ink transition-all cursor-pointer"
          >
            <span>{t('nlpParseApplyBtn')}</span>
            <ArrowRight className="w-4 h-4 dark:text-volt" />
          </button>
        </div>

        <span className="text-xs text-ink-muted px-2">
          {t('nlpHint')}
        </span>
      </div>

      {/* Extracted Feedback Pills */}
      {feedback && Object.keys(feedback).length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-dashed border-ink/10 dark:border-white/10">
          <div className="flex flex-wrap gap-2 text-xs">
            {feedback.tripMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-volt text-[#111111] dark:bg-pod dark:text-volt font-semibold">
                <Compass className="w-4 h-4" />
                {feedback.tripMode}
              </span>
            )}
            {feedback.date && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Calendar className="w-4 h-4 text-ink-muted" />
                {feedback.date}
              </span>
            )}
            {feedback.rolloutTime && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Clock className="w-4 h-4 text-ink-muted" />
                {t('nlpFeedbackRollout', { time: feedback.rolloutTime })}
              </span>
            )}
            {feedback.arrivalTarget && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Clock className="w-4 h-4 text-beacon-amber" />
                {t('nlpFeedbackArrival', { time: feedback.arrivalTarget })}
              </span>
            )}
            {feedback.speed !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Lightning className="w-4 h-4 text-ink-muted" />
                {feedback.speed} km/h
              </span>
            )}
            {feedback.distance !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Path className="w-4 h-4 text-ink-muted" />
                {feedback.distance} km
              </span>
            )}
            {feedback.cargo !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Package className="w-4 h-4 text-ink-muted" />
                {t('nlpFeedbackGear', { mass: feedback.cargo })}
              </span>
            )}
            {feedback.riderMass !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <User className="w-4 h-4 text-ink-muted" />
                {t('nlpFeedbackRider', { mass: feedback.riderMass })}
              </span>
            )}
            {feedback.bikeMass !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Bicycle className="w-4 h-4 text-ink-muted" />
                {t('nlpFeedbackBike', { mass: feedback.bikeMass })}
              </span>
            )}
            {(feedback.origin || feedback.destination) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium">
                <NavigationArrow className="w-4 h-4 text-ink-muted" />
                {feedback.origin ? `${feedback.origin} → ` : ''}{feedback.destination}
              </span>
            )}
            {feedback.gate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium">
                <Shield className="w-4 h-4 text-beacon-amber" />
                {feedback.gate}
              </span>
            )}
            {feedback.headwind && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium tnum">
                <Wind className="w-4 h-4 text-beacon-amber" />
                {feedback.headwind}
              </span>
            )}
            {feedback.ravito && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium">
                <Coffee className="w-4 h-4 text-beacon-amber" />
                {t('nlpFeedbackRavito', { info: feedback.ravito })}
              </span>
            )}
            {feedback.puncturePrep && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-ink font-medium">
                <Wrench className="w-4 h-4 text-beacon-green dark:text-volt-lime" />
                {t('nlpFeedbackPuncture', { info: feedback.puncturePrep })}
              </span>
            )}
            {feedback.strictFoodRule && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pod text-beacon-orange dark:text-beacon-red font-medium">
                <ShieldWarning className="w-4 h-4" />
                {t('nlpFeedbackDeskBan')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
