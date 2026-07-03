import React from 'react';
import { CheckCircle2, Circle, Lock, ArrowRight } from 'lucide-react';

// The gamified "interview readiness" checklist that gates the Start Interview
// button. Each task the user completes fills the progress bar; finishing them all
// unlocks the interview. Driven by `computeInterviewGate(application)`.
//
// Presentational only: `gate` is the gate object; `onGoToTab(tabId)` jumps the
// user to the tab where they can complete a task. `onDraftWeakness` (optional)
// seeds + opens the weakness note so that task can be completed in one click.
// `embedded` strips the outer card chrome + title so it can live inside the
// "Interview readiness" card (which already provides them).
const InterviewReadinessChecklist = ({
  gate,
  onGoToTab,
  onDraftWeakness,
  embedded = false,
  className = '',
}) => {
  if (!gate) return null;
  const { tasks, doneCount, requiredCount, pct, unlocked } = gate;

  const runTask = (t) => {
    if (t.key === 'weakness' && onDraftWeakness) onDraftWeakness();
    else onGoToTab?.(t.tab);
  };
  const canAct = (t) => (t.key === 'weakness' ? !!onDraftWeakness : !!onGoToTab);

  return (
    <div
      className={`${
        embedded
          ? ''
          : 'rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5 p-3.5'
      } ${className}`}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            {unlocked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
            )}
            Interview readiness
          </span>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
            {doneCount}/{requiredCount}
          </span>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Readiness checklist
          </h3>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
            {doneCount}/{requiredCount}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-500/15 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            unlocked ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
        {unlocked
          ? "You're prepped — the interview is unlocked."
          : 'Finish these to unlock your interview.'}
      </p>

      {/* Tasks */}
      <ul className="mt-2.5 space-y-1.5">
        {tasks.map((t) => (
          <li key={t.key} className="flex items-center gap-2.5">
            {t.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span
                className={`block text-xs font-semibold leading-tight ${
                  t.done
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {t.label}
              </span>
              {!t.done && (
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                  {t.hint}
                </span>
              )}
            </span>
            {!t.done && canAct(t) && (
              <button
                type="button"
                onClick={() => runTask(t)}
                className="shrink-0 inline-flex items-center gap-0.5 py-2 px-1 -my-1 min-h-[36px] text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
              >
                Do it <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InterviewReadinessChecklist;
