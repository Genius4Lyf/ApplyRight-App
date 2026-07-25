import React from 'react';
import { CheckCircle2, Circle, Lock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  if (!gate) return null;
  const { tasks, doneCount, requiredCount, pct, unlocked } = gate;

  const runTask = (task) => {
    if (task.key === 'weakness' && onDraftWeakness) onDraftWeakness();
    else onGoToTab?.(task.tab);
  };
  const canAct = (task) => (task.key === 'weakness' ? !!onDraftWeakness : !!onGoToTab);

  return (
    <div
      className={`${
        embedded
          ? ''
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5'
      } ${className}`}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            {unlocked ? (
              <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            )}
            {t('interviewPrep.readinessChecklist.interviewReadiness')}
          </span>
          <span className="font-heading text-[11px] font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {doneCount}/{requiredCount}
          </span>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('interviewPrep.readinessChecklist.readinessChecklist')}
          </h3>
          <span className="font-heading text-[11px] font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {doneCount}/{requiredCount}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
        {unlocked
          ? t('interviewPrep.readinessChecklist.prepped')
          : t('interviewPrep.readinessChecklist.finishToUnlock')}
      </p>

      {/* Tasks */}
      <ul className="mt-2.5 space-y-1.5">
        {tasks.map((task) => (
          <li key={task.key} className="flex items-center gap-2.5">
            {task.done ? (
              <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span
                className={`block text-xs font-semibold leading-tight ${
                  task.done
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {task.label}
              </span>
              {!task.done && (
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                  {task.hint}
                </span>
              )}
            </span>
            {!task.done && canAct(task) && (
              <button
                type="button"
                onClick={() => runTask(task)}
                className="shrink-0 inline-flex items-center gap-0.5 py-2 px-1 -my-1 min-h-[36px] text-[11px] font-bold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 transition-colors"
              >
                {t('interviewPrep.readinessChecklist.doIt')} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InterviewReadinessChecklist;
