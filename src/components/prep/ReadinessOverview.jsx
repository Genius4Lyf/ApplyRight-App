import React from 'react';
import {
  Target,
  PlayCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Sparkle,
  GraduationCap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { computeReadiness } from '../../utils/interviewPrep';
import InterviewReadinessChecklist from './InterviewReadinessChecklist';

// Persistent "where do I stand" card shown above the prep tabs. Hosts the
// interview-readiness gate checklist — finishing the tasks unlocks the interview.
// Reads only data already on the prep (no API calls).
const ReadinessOverview = ({ application, gate, onPracticeWeak, onGoToTab, onDraftWeakness }) => {
  const { t } = useTranslation();
  // Only used for the "practice weak spots" shortcut — the headline readiness is
  // now the gate checklist, not the old confidence score.
  const { weakQuestionIndices } = computeReadiness(application);

  const unlocked = gate ? gate.unlocked : true;
  const remaining = gate ? gate.requiredCount - gate.doneCount : 0;
  const hasWeakQuestions = weakQuestionIndices.length > 0;

  return (
    <section className="relative overflow-hidden rounded-xl p-4 sm:p-5 flex flex-col justify-between h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
      {/* Top hairline accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-200 dark:bg-slate-700" />

      {/* Tiny stars for dark mode */}
      <Sparkles className="hidden dark:block absolute top-4 right-5 w-4 h-4 text-slate-500/30 pointer-events-none" />
      <Sparkle className="hidden dark:block absolute bottom-12 left-6 w-3 h-3 text-slate-500/30 pointer-events-none" />

      {/* Education icon for light mode */}
      <GraduationCap className="block dark:hidden absolute top-4 right-5 w-10 h-10 text-slate-900/[0.06] pointer-events-none" />

      <div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.readinessOverview.heading')}
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {unlocked
            ? t('interviewPrep.readinessOverview.unlockedDesc')
            : t('interviewPrep.readinessOverview.lockedDesc')}
        </p>

        {/* Readiness gate checklist — finish to unlock the interview */}
        {gate && (
          <div className="mt-4">
            <InterviewReadinessChecklist
              gate={gate}
              embedded
              onGoToTab={onGoToTab}
              onDraftWeakness={onDraftWeakness}
            />
          </div>
        )}
      </div>

      {/* Lock / unlock status */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {unlocked ? (
            <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span
            className={`font-semibold ${unlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
          >
            {unlocked
              ? t('interviewPrep.readinessOverview.unlocked')
              : t('interviewPrep.readinessOverview.tasksLeft', { count: remaining })}
          </span>
        </div>
        {unlocked && hasWeakQuestions && (
          <button
            type="button"
            onClick={onPracticeWeak}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100"
          >
            <PlayCircle className="w-3.5 h-3.5" />{' '}
            {t('interviewPrep.readinessOverview.practiceWeak')} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </section>
  );
};

export default ReadinessOverview;
