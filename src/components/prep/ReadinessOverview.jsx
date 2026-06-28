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
import { computeReadiness } from '../../utils/interviewPrep';
import InterviewReadinessChecklist from './InterviewReadinessChecklist';

// Persistent "where do I stand" card shown above the prep tabs. Hosts the
// interview-readiness gate checklist — finishing the tasks unlocks the interview.
// Reads only data already on the prep (no API calls).
const ReadinessOverview = ({ application, gate, onPracticeWeak, onGoToTab, onDraftWeakness }) => {
  // Only used for the "practice weak spots" shortcut — the headline readiness is
  // now the gate checklist, not the old confidence score.
  const { weakQuestionIndices } = computeReadiness(application);

  const unlocked = gate ? gate.unlocked : true;
  const remaining = gate ? gate.requiredCount - gate.doneCount : 0;
  const hasWeakQuestions = weakQuestionIndices.length > 0;

  return (
    <section
      className={`relative overflow-hidden rounded-xl p-4 sm:p-5 flex flex-col justify-between h-full hover:shadow-[0_8px_30px_rgb(99,102,241,0.08)] transition-all duration-300 ${
        unlocked
          ? 'border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900 hover:border-emerald-500/50'
          : 'border border-indigo-100 dark:border-indigo-500/20 bg-white dark:bg-slate-900 hover:border-indigo-500/50 dark:hover:border-indigo-500/40'
      }`}
    >
      {/* Top-accent gradient line */}
      {unlocked ? (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
      ) : (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
      )}

      {/* Tiny stars for dark mode */}
      <Sparkles className="hidden dark:block absolute top-4 right-5 w-4 h-4 text-indigo-400/25 pointer-events-none" />
      <Sparkle className="hidden dark:block absolute bottom-12 left-6 w-3 h-3 text-amber-400/25 pointer-events-none" />

      {/* Education icon for light mode */}
      <GraduationCap className="block dark:hidden absolute top-4 right-5 w-10 h-10 text-indigo-600/8 pointer-events-none" />

      <div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Interview readiness
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {unlocked
            ? "You're prepped — start your interview whenever you're ready."
            : 'Complete the checklist below to unlock your interview.'}
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-indigo-500 dark:text-indigo-300 shrink-0" />
          )}
          <span
            className={`font-semibold ${unlocked ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}
          >
            {unlocked
              ? 'Interview unlocked'
              : `${remaining} task${remaining === 1 ? '' : 's'} left to unlock`}
          </span>
        </div>
        {unlocked && hasWeakQuestions && (
          <button
            type="button"
            onClick={onPracticeWeak}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Practice weak spots{' '}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </section>
  );
};

export default ReadinessOverview;
