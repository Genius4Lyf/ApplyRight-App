import React from 'react';
import { Target, PlayCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { computeReadiness } from '../../utils/interviewPrep';

// Small SVG score ring. Color tracks the score band.
const ScoreRing = ({ score }) => {
  const radius = 30;
  const stroke = 6;
  const r = radius - stroke;
  const circumference = r * 2 * Math.PI;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: 64, height: 64 }}
    >
      <svg width="64" height="64" className="-rotate-90">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={r} cx="32" cy="32" />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={r}
          cx="32"
          cy="32"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  );
};

const Chip = ({ label, count, tone }) => {
  if (!count) return null;
  const tones = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    almost: 'bg-amber-50 text-amber-700 border-amber-200',
    needs_work: 'bg-rose-50 text-rose-700 border-rose-200',
    unrated: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${tones[tone]}`}
    >
      {count} {label}
    </span>
  );
};

// Persistent "where do I stand" card shown above the prep tabs. Reads only data
// already on the prep (no API calls).
const ReadinessOverview = ({ application, onPracticeWeak, onGoToTab }) => {
  const { total, rated, counts, score, weakQuestionIndices, nextAction } =
    computeReadiness(application);

  const isReady = nextAction.kind === 'done';
  const hasWeakQuestions = weakQuestionIndices.length > 0;

  const handleNextAction = () => {
    switch (nextAction.kind) {
      case 'generate':
        onGoToTab?.('stories');
        break;
      case 'rate':
      case 'revisit':
        if (hasWeakQuestions) onPracticeWeak?.();
        else onGoToTab?.('stories');
        break;
      case 'verify':
        onGoToTab?.('questions');
        break;
      default:
        break;
    }
  };

  return (
    <section
      className={`rounded-xl border p-4 sm:p-5 mb-4 ${
        isReady ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Interview readiness</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {total === 0
              ? 'No prep to score yet.'
              : `${rated} of ${total} item${total === 1 ? '' : 's'} rated`}
          </p>
          {total > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Chip label="ready" count={counts.ready} tone="ready" />
              <Chip label="almost" count={counts.almost} tone="almost" />
              <Chip label="needs work" count={counts.needs_work} tone="needs_work" />
              <Chip label="not rated" count={counts.unrated} tone="unrated" />
            </div>
          )}
        </div>
      </div>

      {/* Next best action */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {isReady ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          )}
          <span className={`font-semibold ${isReady ? 'text-emerald-800' : 'text-slate-700'}`}>
            {nextAction.label}
          </span>
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          {hasWeakQuestions && (
            <button
              type="button"
              onClick={onPracticeWeak}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Practice weak spots
            </button>
          )}
          {!isReady && (
            <button
              type="button"
              onClick={handleNextAction}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              {nextAction.label.split(' ').slice(0, 1).join(' ') === 'Verify' ? 'Review' : 'Go'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReadinessOverview;
