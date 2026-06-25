import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { initials } from '../../utils/avatar';
import AssessmentReport from './AssessmentReport';

// Per-interviewer reviews: for each loop round the user completed, show who
// interviewed them, the score they gave, and — pinned to each card — the FULL
// assessment that interviewer wrote (rubric, strengths, gaps, next steps,
// questions asked). This is now the single home for interview assessments (it
// replaces the standalone "last interview assessment" card). Reads
// application.interviewPrep.rounds.

const READINESS = {
  needs_work: {
    label: 'Needs work',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-500/30',
  },
  almost: {
    label: 'Almost there',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-500/30',
  },
  ready: {
    label: 'Interview-ready',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-500/30',
  },
};

const Avatar = ({ name }) => (
  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-extrabold shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
    {initials(name)}
  </div>
);

const ReviewCard = ({ round }) => {
  const [open, setOpen] = useState(false);
  const a = round.assessment || {};
  const band = READINESS[round.readiness] || READINESS.almost;
  const when = round.completedAt ? new Date(round.completedAt).toLocaleDateString() : '';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <Avatar name={round.name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{round.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{round.role}</p>
          {when && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{when}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className={`text-lg font-extrabold leading-none ${band.text}`}>{round.score}%</div>
          <div className={`text-[10px] font-bold ${band.text}`}>{band.label}</div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 border-t border-slate-100 dark:border-slate-800">
          {/* The full assessment this interviewer gave — pinned to their card. */}
          <AssessmentReport assessment={a} />
        </div>
      )}
    </div>
  );
};

const RoundReviews = ({ rounds = [] }) => {
  const list = (Array.isArray(rounds) ? rounds : [])
    .filter((r) => r && typeof r.score === 'number')
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No reviews yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Complete a round of your interview loop and the interviewer's feedback will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        What each interviewer scored you and said — tap a card to see their full feedback.
      </p>
      {list.map((r) => (
        <ReviewCard key={r.seatIndex} round={r} />
      ))}
    </div>
  );
};

export default RoundReviews;
