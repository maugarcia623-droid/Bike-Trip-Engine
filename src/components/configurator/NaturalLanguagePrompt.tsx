import React, { useState } from 'react';
import { Sparkles, Wand2, Check } from 'lucide-react';
import { TripProfile } from '../../types/trip';
import { parseTripDescription } from '../../utils/nlpParser';

interface NaturalLanguagePromptProps {
  currentTrip: TripProfile;
  onApplyParsed: (updated: Partial<TripProfile>, summary: string[]) => void;
}

const SAMPLE_PROMPTS = [
  "22km gravel commute along estuary bridge to Gate 17, arriving at 08:30 for a 09:00 shift. Rider 74kg, bike 9.4kg, gear 4kg, cruising at 27.5 km/h with 8 km/h headwind. Strict office rule: no food in open space.",
  "Fast 28km aero commute to North Gate arriving strictly at 08:00 for 08:30 engineering scrum. Rider 72kg, bike 8.5kg, target 31km/h.",
  "18km gentle recovery ride to Gate 12, arriving at 08:45 for 09:15 shift. Rider 75kg, bike 10kg, gear 5kg, cruising 23km/h in calm conditions.",
];

export const NaturalLanguagePrompt: React.FC<NaturalLanguagePromptProps> = ({
  currentTrip,
  onApplyParsed,
}) => {
  const [promptText, setPromptText] = useState('');
  const [extractedPills, setExtractedPills] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParse = () => {
    if (!promptText.trim()) return;
    const { parsedValues, extractedSummary } = parseTripDescription(promptText, currentTrip);
    setExtractedPills(extractedSummary);
    setHasParsed(true);
    onApplyParsed(parsedValues, extractedSummary);
  };

  const handleUseSample = (sample: string) => {
    setPromptText(sample);
    const { parsedValues, extractedSummary } = parseTripDescription(sample, currentTrip);
    setExtractedPills(extractedSummary);
    setHasParsed(true);
    onApplyParsed(parsedValues, extractedSummary);
  };

  return (
    <div className="bg-white dark:bg-[#121215] border border-cyan-400/60 dark:border-cyan-500/30 rounded-xl p-5 mb-8 relative overflow-hidden shadow-sm dark:shadow-glow-cyan">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Wand2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
            NATURAL LANGUAGE MISSION CONFIGURATOR
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
          Smart Regex &amp; Semantic Rule Extractor
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-zinc-300 mb-3">
        Describe your commute in plain words (distance, arrival target, shift start, gate, weights, office rules). The engine will automatically tune your physics and reverse timeline.
      </p>

      {/* Text Area */}
      <div className="relative">
        <textarea
          rows={3}
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            setHasParsed(false);
          }}
          placeholder="e.g. 22km gravel commute along estuary bridge to Gate 17, arriving at 08:30 for a 09:00 shift. Rider 74kg, bike 9.4kg, gear 4.2kg, cruising 27.5 km/h with 8 km/h headwind. No food in open space..."
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 font-sans focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
        />
        <button
          onClick={handleParse}
          disabled={!promptText.trim()}
          className="absolute right-3 bottom-3 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-zinc-950 font-bold text-xs font-mono rounded-md transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Parse &amp; Apply</span>
        </button>
      </div>

      {/* Sample Quick Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase">Try Presets:</span>
        {SAMPLE_PROMPTS.map((sample, i) => (
          <button
            key={i}
            onClick={() => handleUseSample(sample)}
            className="text-[11px] font-mono bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1 text-left truncate max-w-xs transition-colors"
          >
            &ldquo;{sample.slice(0, 38)}...&rdquo;
          </button>
        ))}
      </div>

      {/* Extracted Parameter Feedback */}
      {hasParsed && extractedPills.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 mb-2 font-bold">
            <Check className="w-3.5 h-3.5" />
            <span>Extracted &amp; Applied Parameters:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {extractedPills.map((pill, idx) => (
              <span
                key={idx}
                className="text-[11px] font-mono bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-medium"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
