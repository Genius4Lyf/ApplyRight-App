import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, EyeOff, Volume2 } from 'lucide-react';
import { speak, stopSpeaking, isTTSSupported } from '../../lib/speech';

// Shared readiness chips (also used by StoryBank + the prep detail page).
// eslint-disable-next-line react-refresh/only-export-components
export const CONFIDENCE_OPTIONS = [
  {
    id: 'needs_work',
    label: 'Needs work',
    classes:
      'border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15',
    activeClasses:
      'bg-rose-50 dark:bg-rose-500/15 border-rose-350 border-rose-450 text-rose-800 dark:text-rose-200',
  },
  {
    id: 'almost',
    label: 'Almost there',
    classes:
      'border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/15',
    activeClasses:
      'bg-amber-50 dark:bg-amber-500/15 border-amber-350 border-amber-450 text-amber-800 dark:text-amber-200',
  },
  {
    id: 'ready',
    label: 'Ready',
    classes:
      'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15',
    activeClasses:
      'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-350 border-emerald-450 text-emerald-800 dark:text-emerald-200',
  },
];

// Flashcard rehearsal — read the prompt, answer out loud, reveal the model
// answer, and self-rate readiness. The graded "AI mock" lives in Interview Mode
// now; Practice is purely for rehearsal.
const PracticeRunner = ({ cards, confidenceById = {}, onMarkConfidence, initialIndex = 0 }) => {
  const [index, setIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);

  // Reset reveal + stop any read-aloud when the card changes.
  const [lastIndex, setLastIndex] = useState(initialIndex);
  if (lastIndex !== index) {
    setLastIndex(index);
    setShowAnswer(false);
    stopSpeaking();
  }

  useEffect(() => () => stopSpeaking(), []);

  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p className="text-sm">No practice cards available.</p>
      </div>
    );
  }

  const total = cards.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const card = cards[safeIndex];
  const activeConfidence = confidenceById[card.id] || card.confidence;
  const canRate = card.kind !== 'skill'; // skills are reference, not rated

  const label =
    card.kind === 'skill'
      ? 'Skill talking point'
      : card.kind === 'story'
        ? 'Your STAR story'
        : card.type || 'Question';
  const answerLabel =
    card.kind === 'skill'
      ? 'Suggested talking point'
      : card.kind === 'story'
        ? 'Your STAR story'
        : 'Suggested answer';

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
      {/* Mini header */}
      <div className="shrink-0 flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300">
          {label}
        </span>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Card {safeIndex + 1} of {total}
        </p>
      </div>

      {/* Progress */}
      <div className="shrink-0 flex items-center gap-1.5 mb-4">
        {cards.map((c, i) => (
          <span
            key={c.id}
            className={`h-1.5 rounded-full transition-all ${
              i === safeIndex
                ? 'flex-1 bg-gradient-to-r from-indigo-500 to-violet-500'
                : i < safeIndex
                  ? 'w-6 bg-indigo-400'
                  : 'w-6 bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Prompt — premium frosted tile */}
      <div className="shrink-0 relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 sm:p-6 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5">
              {label}
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {card.prompt}
            </p>
          </div>
          {isTTSSupported() && (
            <button
              type="button"
              onClick={() => speak(card.prompt)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
              title="Hear the question"
              aria-label="Hear the question"
            >
              <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hear</span>
            </button>
          )}
        </div>
      </div>

      {/* Your turn — reveal scrolls internally so the controls stay pinned */}
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <p className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2 px-1">
          Your turn
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {showAnswer ? (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 p-5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 mb-2">
                {answerLabel}
              </p>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {card.suggestedAnswer || 'No suggested answer available.'}
              </p>
            </div>
          ) : (
            <div className="h-full min-h-40 flex flex-col items-center justify-center text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-white/60 dark:bg-slate-900/60 p-6">
              <EyeOff className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Answer out loud
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Say your answer before revealing the model answer — that&apos;s how it sticks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls (pinned) */}
      <div className="shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex(Math.max(safeIndex - 1, 0))}
            disabled={safeIndex === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex(Math.min(safeIndex + 1, total - 1))}
            disabled={safeIndex === total - 1}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
          >
            {showAnswer ? 'Hide answer' : 'Reveal answer'}
          </button>
        </div>

        {canRate && (
          <div className="lg:ml-auto flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mr-1.5">
              Rate readiness:
            </span>
            {CONFIDENCE_OPTIONS.map((option) => {
              const active = activeConfidence === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onMarkConfidence?.(card, option.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                    active ? option.activeClasses : option.classes
                  }`}
                >
                  {active ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeRunner;
