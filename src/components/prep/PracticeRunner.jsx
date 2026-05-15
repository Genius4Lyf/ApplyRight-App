import React, { useState } from 'react';
import { CheckCircle2, Circle, EyeOff } from 'lucide-react';

// eslint-disable-next-line react-refresh/only-export-components
export const CONFIDENCE_OPTIONS = [
  {
    id: 'needs_work',
    label: 'Needs work',
    classes: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    activeClasses: 'bg-rose-50 border-rose-300 text-rose-800',
  },
  {
    id: 'almost',
    label: 'Almost there',
    classes: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeClasses: 'bg-amber-50 border-amber-300 text-amber-800',
  },
  {
    id: 'ready',
    label: 'Ready',
    classes: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    activeClasses: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  },
];

/**
 * Drives a reveal-then-rate practice flow over an array of "cards", where each
 * card is { type, prompt, suggestedAnswer, kind }. `kind` is 'question' or
 * 'skill' and lets the runner label the card. Confidence is tracked per card
 * id (provided by caller) so the host page can persist it.
 */
const PracticeRunner = ({ cards, confidenceById = {}, onMarkConfidence, initialIndex = 0 }) => {
  const [index, setIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  // Reset the reveal-answer flag when the user navigates to a different card.
  // Using a state-derived check (per the React docs "resetting state on prop
  // change" pattern) keeps this synchronous and avoids the rules-of-effect
  // warning that the setState-in-useEffect approach triggers.
  const [lastIndex, setLastIndex] = useState(initialIndex);
  if (lastIndex !== index) {
    setLastIndex(index);
    setShowAnswer(false);
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No practice cards available.</p>
      </div>
    );
  }

  const total = cards.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const card = cards[safeIndex];
  const activeConfidence = confidenceById[card.id];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs uppercase tracking-wider font-bold text-slate-500">
          {card.kind === 'skill' ? 'Skill talking point' : card.type || 'Question'}
        </p>
        <p className="text-xs font-medium text-slate-500">
          {safeIndex + 1} / {total}
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-8">
        {cards.map((c, i) => (
          <span
            key={c.id}
            className={`h-1.5 rounded-full transition-all ${
              i === safeIndex ? 'flex-1 bg-indigo-600' : 'w-6 bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
          {card.prompt}
        </p>
      </div>

      <div className="mt-5 min-h-40 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        {showAnswer ? (
          <>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-3">
              {card.kind === 'skill' ? 'Suggested talking point' : 'Suggested answer'}
            </p>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {card.suggestedAnswer || 'No suggested answer available.'}
            </p>
          </>
        ) : (
          <div className="h-full min-h-32 flex flex-col items-center justify-center text-center text-slate-500">
            <EyeOff className="w-7 h-7 mb-3 text-slate-300" />
            <p className="text-sm font-medium">
              Answer out loud before revealing the coaching notes.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex(Math.max(safeIndex - 1, 0))}
            disabled={safeIndex === 0}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex(Math.min(safeIndex + 1, total - 1))}
            disabled={safeIndex === total - 1}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            {showAnswer ? 'Hide' : 'Answer'}
          </button>
        </div>

        <div className="lg:ml-auto flex flex-wrap items-center gap-2">
          {CONFIDENCE_OPTIONS.map((option) => {
            const active = activeConfidence === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onMarkConfidence?.(card, option.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
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
      </div>
    </div>
  );
};

export default PracticeRunner;
