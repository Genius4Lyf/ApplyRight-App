import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AssessmentReport from './AssessmentReport';

// Re-readable AI assessment from the last conversational interview. The full
// report is persisted in lastInterviewSession.assessment, so users can come back
// and re-read their feedback instead of losing it after the review screen.
const READINESS_LABEL = {
  ready: 'Interview-ready',
  almost: 'Almost there',
  needs_work: 'Needs work',
};

const scoreTone = (s) =>
  s >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : s >= 45
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

const LastAssessmentCard = ({ application }) => {
  const [open, setOpen] = useState(false);
  const assessment = application?.interviewPrep?.lastInterviewSession?.assessment;
  if (!assessment || typeof assessment.overallScore !== 'number') return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3.5 text-left cursor-pointer"
      >
        <div className="shrink-0 text-center">
          <div
            className={`font-heading text-3xl font-bold leading-none tabular-nums ${scoreTone(assessment.overallScore)}`}
          >
            {assessment.overallScore}
            <span className="text-lg">%</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Overall
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
            Your last interview assessment
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {READINESS_LABEL[assessment.readiness] || 'Scored'} · tap to{' '}
            {open ? 'hide' : 'review your feedback'}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <AssessmentReport assessment={assessment} />}
    </div>
  );
};

export default LastAssessmentCard;
