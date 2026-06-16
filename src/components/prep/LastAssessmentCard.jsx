import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
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
  s >= 75 ? 'text-emerald-600' : s >= 45 ? 'text-amber-600' : 'text-rose-600';

const LastAssessmentCard = ({ application }) => {
  const [open, setOpen] = useState(false);
  const assessment = application?.interviewPrep?.lastInterviewSession?.assessment;
  if (!assessment || typeof assessment.overallScore !== 'number') return null;

  return (
    <div className="rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3.5 text-left cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
          <span className={`text-base font-bold ${scoreTone(assessment.overallScore)}`}>
            {assessment.overallScore}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Your last interview assessment
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
