import React from 'react';

// AI assessment of a conversational interview — rubric breakdown, strengths,
// gaps, what to practise next, and the questions the interviewer actually asked.
// Shared by the post-interview review screen and the "View assessment" panel on
// the prep page (so users can re-read their report).
const dimTone = (s) => (s >= 75 ? 'bg-emerald-500' : s >= 45 ? 'bg-amber-500' : 'bg-rose-500');

const AssessmentList = ({ title, items, tone }) => {
  if (!items || items.length === 0) return null;
  const dot =
    tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-indigo-500';
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5">
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

const AssessmentReport = ({ assessment }) => {
  const {
    summary,
    dimensions = [],
    strengths = [],
    gaps = [],
    nextSteps = [],
    questionsAsked = [],
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
            How you scored
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
                    className={`h-full rounded-full transition-all duration-500 ${dimTone(d.score)}`}
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
        <AssessmentList title="Strengths" items={strengths} tone="emerald" />
        <AssessmentList title="Gaps to close" items={gaps} tone="rose" />
        <AssessmentList title="Practice next" items={nextSteps} tone="indigo" />
      </div>

      {/* Questions you were asked */}
      {questionsAsked.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
            Questions you were asked
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
