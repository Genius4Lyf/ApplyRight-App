import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AssessmentReport from './AssessmentReport';

// Re-readable AI assessment from the last conversational interview. The full
// report is persisted in lastInterviewSession.assessment, so users can come back
// and re-read their feedback instead of losing it after the review screen.
// Module-level → i18n KEYS resolved via t() at render.
const READINESS_KEYS = {
  ready: 'interviewPrep.lastAssessment.readiness.ready',
  almost: 'interviewPrep.lastAssessment.readiness.almost',
  needs_work: 'interviewPrep.lastAssessment.readiness.needs_work',
};

// The figure itself is ink; the band rides on one small semantic dot beside the
// readiness word (see LoopBoard/RoundReviews).
const scoreDot = (s) => (s >= 75 ? 'bg-emerald-500' : s >= 45 ? 'bg-amber-500' : 'bg-rose-500');

const LastAssessmentCard = ({ application }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const assessment = application?.interviewPrep?.lastInterviewSession?.assessment;
  if (!assessment || typeof assessment.overallScore !== 'number') return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3.5 text-left cursor-pointer"
      >
        <div className="shrink-0 text-center">
          <div className="font-heading text-3xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-100">
            {assessment.overallScore}
            <span className="text-lg">%</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('interviewPrep.lastAssessment.overall')}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.lastAssessment.title')}
          </h3>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreDot(assessment.overallScore)}`}
            />
            {READINESS_KEYS[assessment.readiness]
              ? t(READINESS_KEYS[assessment.readiness])
              : t('interviewPrep.lastAssessment.scored')}{' '}
            ·{' '}
            {open
              ? t('interviewPrep.lastAssessment.tapHide')
              : t('interviewPrep.lastAssessment.tapReview')}
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
