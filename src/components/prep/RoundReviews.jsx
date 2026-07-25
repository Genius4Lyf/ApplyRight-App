import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initials } from '../../utils/avatar';
import AssessmentReport from './AssessmentReport';

// Per-interviewer reviews: for each loop round the user completed, show who
// interviewed them, the score they gave, and — pinned to each card — the FULL
// assessment that interviewer wrote (rubric, strengths, gaps, next steps,
// questions asked). This is now the single home for interview assessments (it
// replaces the standalone "last interview assessment" card). Reads
// application.interviewPrep.rounds.

// Ink score + one 6px semantic dot on the band label (see LoopBoard).
const READINESS = {
  needs_work: { labelKey: 'interviewPrep.roundReviews.readiness.needs_work', dot: 'bg-rose-500' },
  almost: { labelKey: 'interviewPrep.roundReviews.readiness.almost', dot: 'bg-amber-500' },
  ready: { labelKey: 'interviewPrep.roundReviews.readiness.ready', dot: 'bg-emerald-500' },
};

const Avatar = ({ name }) => (
  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
    {initials(name)}
  </div>
);

const ReviewCard = ({ round }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const a = round.assessment || {};
  const band = READINESS[round.readiness] || READINESS.almost;
  const when = round.completedAt ? new Date(round.completedAt).toLocaleDateString() : '';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
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
          <div className="font-heading text-lg font-extrabold leading-none tabular-nums text-slate-900 dark:text-slate-100">
            {round.score}%
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${band.dot}`} />
            {t(band.labelKey)}
          </div>
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
  const { t } = useTranslation();
  const list = (Array.isArray(rounds) ? rounds : [])
    .filter((r) => r && typeof r.score === 'number')
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('interviewPrep.roundReviews.emptyTitle')}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {t('interviewPrep.roundReviews.emptyBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {t('interviewPrep.roundReviews.desc')}
      </p>
      {list.map((r) => (
        <ReviewCard key={r.seatIndex} round={r} />
      ))}
    </div>
  );
};

export default RoundReviews;
