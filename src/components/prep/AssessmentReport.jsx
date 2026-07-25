import React from 'react';
import { useTranslation } from 'react-i18next';

// AI assessment of a conversational interview — rubric breakdown, strengths,
// gaps, what to practise next, and the questions the interviewer actually asked.
// Shared by the post-interview review screen and the "View assessment" panel on
// the prep page (so users can re-read their report).
const AssessmentList = ({ title, items, tone }) => {
  if (!items || items.length === 0) return null;
  const dot =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'rose'
        ? 'bg-rose-500'
        : 'bg-slate-400 dark:bg-slate-500';
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-3.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
          >
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Measured delivery, shown as plain figures. Only ever rendered when the live
// session actually captured them — there is no "delivery was fine" state, because
// no measurement means nothing was measured, not that nothing went wrong.
const secs = (ms) => `${Math.round(ms / 100) / 10}s`;

const DeliveryStrip = ({ delivery }) => {
  const { t } = useTranslation();
  if (!delivery || !delivery.answerCount) return null;
  const stats = [
    delivery.medianTimeToFirstWordMs != null && {
      label: t('interviewPrep.assessmentReport.typicalPause'),
      value: secs(delivery.medianTimeToFirstWordMs),
    },
    delivery.meanAnswerMs != null && {
      label: t('interviewPrep.assessmentReport.averageLength'),
      value: secs(delivery.meanAnswerMs),
    },
    delivery.longestPauseWithinAnswerMs != null && {
      label: t('interviewPrep.assessmentReport.longestSilence'),
      value: secs(delivery.longestPauseWithinAnswerMs),
    },
    delivery.filler && {
      label: t('interviewPrep.assessmentReport.fillerPer100'),
      value: String(delivery.filler.fillerPer100Words),
    },
  ].filter(Boolean);
  if (!stats.length) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
        {t('interviewPrep.assessmentReport.howYouDelivered')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-3.5"
          >
            <p className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {s.value}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Things said in the room that the CV doesn't back up. Framed as work on the
// DOCUMENT — usually this is real experience simply missing from it.
const CvFindings = ({ findings }) => {
  const { t } = useTranslation();
  if (!findings || !findings.length) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
        {t('interviewPrep.assessmentReport.updateCv')}
      </p>
      <div className="space-y-2.5">
        {findings.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5"
          >
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {t('interviewPrep.assessmentReport.youSaid', { claim: f.claim })}
            </p>
            {f.cvSays && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('interviewPrep.assessmentReport.yourCv', { cvSays: f.cvSays })}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-medium">
              {f.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// The stronger version of a weak answer, built only from what they said and what
// is already on their CV.
const Rewrites = ({ rewrites }) => {
  const { t } = useTranslation();
  if (!rewrites || !rewrites.length) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
        {t('interviewPrep.assessmentReport.sayInstead')}
      </p>
      <div className="space-y-3">
        {rewrites.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-3.5"
          >
            {r.question && (
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
                {r.question}
              </p>
            )}
            {r.whatTheySaid && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-through decoration-slate-300 dark:decoration-slate-600">
                {r.whatTheySaid}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed border-l-2 border-emerald-500 pl-3">
              {r.strongerVersion}
            </p>
            {r.why && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {r.why}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AssessmentReport = ({ assessment }) => {
  const { t } = useTranslation();
  const {
    summary,
    dimensions = [],
    strengths = [],
    gaps = [],
    nextSteps = [],
    questionsAsked = [],
    cvFindings = [],
    rewrites = [],
    delivery = null,
  } = assessment || {};
  return (
    <div className="mt-6 space-y-6">
      {summary && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
      )}

      {/* Rubric breakdown */}
      {dimensions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-3">
            {t('interviewPrep.assessmentReport.howYouScored')}
          </p>
          <div className="space-y-3">
            {dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {d.label}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {d.score}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                {d.feedback && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {d.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths / gaps / next steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AssessmentList
          title={t('interviewPrep.assessmentReport.strengths')}
          items={strengths}
          tone="emerald"
        />
        <AssessmentList
          title={t('interviewPrep.assessmentReport.gapsToClose')}
          items={gaps}
          tone="rose"
        />
        <AssessmentList
          title={t('interviewPrep.assessmentReport.practiceNext')}
          items={nextSteps}
          tone="neutral"
        />
      </div>

      <DeliveryStrip delivery={delivery} />
      <Rewrites rewrites={rewrites} />
      <CvFindings findings={cvFindings} />

      {/* Your interview transcript */}
      {questionsAsked.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
            {t('interviewPrep.assessmentReport.transcript')}
          </p>
          <ol className="space-y-1.5">
            {questionsAsked.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                <span className="shrink-0 w-4 text-right font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                  {i + 1}.
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default AssessmentReport;
