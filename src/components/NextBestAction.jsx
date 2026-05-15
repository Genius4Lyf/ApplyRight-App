import React from 'react';
import {
  Sparkles,
  FileText,
  Mail,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { hasInterviewPrep } from '../utils/interviewPrep';
import CreditGate from './CreditGate';
import { CREDIT_COSTS } from '../lib/credits';

const MotionDiv = motion.div;

/**
 * Prescriptive "what should you do next" CTA shown above FitScoreCard.
 *
 * Picks ONE primary action based on what's already been generated and where
 * the score sits, instead of presenting three equally-weighted "Generate X"
 * cards. The user always knows the single next step.
 *
 * Decision order:
 *   1. No CV yet → Generate optimized CV (the highest-leverage action,
 *      especially when there are missing must-have skills).
 *   2. CV done, no cover letter → Generate cover letter.
 *   3. CV + letter done, no interview prep → Generate interview prep.
 *   4. All assets generated → View your full application.
 *
 * Below score 50 we also surface a soft advisory: this role may not be a
 * strong fit. The CTA still points forward (CV gen) but the framing prepares
 * the user for a tougher path.
 */
const NextBestAction = ({
  fitScore,
  fitAnalysis,
  application,
  onGenerateCV,
  onGenerateCoverLetter,
  onGenerateInterview,
  onGenerateBundle,
  onView,
  generatingCV = false,
  generatingCL = false,
  generatingInterview = false,
  cvGenStatus = null, // { stage, progress, stageMessage } during async pipeline
  // Completion handoff. When an asset finishes generating, the parent sets
  // `justCompleted` so we show a "Just generated" card instead of immediately
  // rotating to the next NBA. The user advances explicitly via the View or
  // Next button — both call back through these handlers.
  justCompleted = null, // 'cv' | 'coverLetter' | 'interview'
  onDismissCompletion,
  onViewCV,
  onViewCoverLetter,
  onViewInterviewPrep,
}) => {
  // While CV generation is in flight, replace the button with a live progress
  // card driven by the polled status. This is the "feel" the async pipeline
  // is meant to deliver — users see motion through each stage instead of a
  // single 30-second spinner.
  if (generatingCV && cvGenStatus) {
    const progress = Math.min(Math.max(cvGenStatus.progress || 0, 5), 100);
    return (
      <MotionDiv
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-md"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 opacity-80">
              Generating optimized CV
            </p>
            <p className="font-semibold text-slate-800 text-sm mt-0.5 truncate">
              {cvGenStatus.stageMessage || 'Working…'}
            </p>
          </div>
          <span className="text-sm font-bold text-indigo-600 shrink-0">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <MotionDiv
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-indigo-600 rounded-full"
          />
        </div>
      </MotionDiv>
    );
  }

  const hasCV = !!(application?.optimizedCV || application?.draftCVId);
  const hasCoverLetter = !!application?.coverLetter;
  const hasInterview = hasInterviewPrep(application);
  const missingMustHaves = (fitAnalysis?.missingSkills || []).filter(
    (s) => s.importance === 'must_have'
  );
  const isWeakFit = typeof fitScore === 'number' && fitScore < 50;

  let action;
  if (!hasCV) {
    const subtitle =
      missingMustHaves.length > 0
        ? `Will weave in ${missingMustHaves.length} missing keyword${missingMustHaves.length === 1 ? '' : 's'} from the role.`
        : 'Tailored bullets, ATS keywords, and a clean format.';
    action = {
      icon: <FileText className="w-5 h-5" />,
      title: 'Generate optimized CV',
      subtitle,
      meta: '10 credits • ~30s',
      handler: onGenerateCV,
      loading: generatingCV,
      tone: 'primary',
    };
  } else if (!hasCoverLetter) {
    action = {
      icon: <Mail className="w-5 h-5" />,
      title: 'Generate cover letter',
      subtitle: 'Connects your experience to this specific role.',
      meta: '5 credits',
      handler: onGenerateCoverLetter,
      loading: generatingCL,
      tone: 'primary',
    };
  } else if (!hasInterview) {
    action = {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'Get interview prep',
      subtitle: 'Likely questions plus smart questions to ask the interviewer.',
      meta: '5 credits',
      handler: onGenerateInterview,
      loading: generatingInterview,
      tone: 'primary',
    };
  } else {
    action = {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'View your full application',
      subtitle: 'CV, cover letter, and interview prep are ready.',
      meta: null,
      handler: onView,
      loading: false,
      tone: 'secondary',
    };
  }

  if (!action.handler) return null;

  // Completion handoff — render a "Just generated" card instead of the next
  // NBA. The user clicks View (jumps to the asset) or Next (dismisses and the
  // normal NBA takes over). Without this, the action below silently rotated
  // and the user never got to see what they just paid for.
  if (justCompleted) {
    const completionMap = {
      cv: {
        label: 'Optimized CV ready',
        subtitle:
          typeof application?.fitScoreBefore === 'number' &&
          typeof application?.fitScoreAfter === 'number' &&
          application.fitScoreAfter > application.fitScoreBefore
            ? `Your match lifted ${application.fitScoreBefore}% → ${application.fitScoreAfter}%.`
            : 'Tailored bullets and ATS keywords are in your draft.',
        advisory:
          'Review every claim against your real experience before sending — you can edit anything before you export.',
        viewLabel: 'View CV',
        onView: onViewCV,
      },
      coverLetter: {
        label: 'Cover letter ready',
        subtitle: 'Connects your experience to this specific role.',
        advisory:
          'Read it through before sending — edit any line that overstates what you actually did.',
        viewLabel: 'View letter',
        onView: onViewCoverLetter,
      },
      interview: {
        label: 'Interview prep ready',
        subtitle: 'Likely questions plus smart questions to ask the interviewer.',
        advisory: null,
        viewLabel: 'View prep',
        onView: onViewInterviewPrep,
      },
    };
    const completed = completionMap[justCompleted];
    if (completed) {
      // Compact label for the Next button — strip the leading "Generate " so
      // it reads naturally ("Next: cover letter →" rather than "Next: Generate
      // cover letter →"). For the all-done state action.title is "View your
      // full application", which already reads cleanly.
      const nextLabel = action.title.replace(/^Generate /, '');
      return (
        <MotionDiv
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white border-2 border-emerald-300 rounded-xl p-4 shadow-md"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                Just generated
              </span>
              <p className="font-bold text-[15px] sm:text-base mt-0.5 leading-snug text-slate-900">
                {completed.label}
              </p>
              <p className="text-[13px] sm:text-sm mt-1 leading-snug text-slate-600">
                {completed.subtitle}
              </p>
            </div>
          </div>
          {completed.advisory && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[12px] sm:text-[13px] leading-snug">{completed.advisory}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={completed.onView}
              className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> {completed.viewLabel}
            </button>
            <button
              type="button"
              onClick={onDismissCompletion}
              className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border border-slate-200 text-slate-700 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1"
            >
              Next: {nextLabel} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </MotionDiv>
      );
    }
  }

  // Show the bundle option only when nothing has been generated yet — that's
  // when "everything in one click" is most relevant. Once you have a CV,
  // bundling doesn't compose with what's already done.
  const showBundle = !hasCV && !hasCoverLetter && !hasInterview && !!onGenerateBundle;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-2"
    >
      {isWeakFit && !hasCV && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This role is a stretch — even with optimization, you'll likely need to address skill
            gaps. Worth applying if you're still interested.
          </span>
        </div>
      )}

      <button
        onClick={action.handler}
        disabled={action.loading}
        className={`w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
          action.tone === 'primary'
            ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed'
            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}
      >
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
            action.tone === 'primary' ? 'bg-white/15' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {action.loading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            action.icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
            Next best action
          </span>
          <p className="font-bold text-[15px] sm:text-base mt-0.5 leading-snug">{action.title}</p>
          <p
            className={`text-[13px] sm:text-sm mt-1 leading-snug ${
              action.tone === 'primary' ? 'text-white/85' : 'text-slate-500'
            }`}
          >
            {action.subtitle}
          </p>
          {action.meta && (
            <span
              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-2 ${
                action.tone === 'primary'
                  ? 'bg-white/15 text-white'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {action.meta}
            </span>
          )}
        </div>
        <ArrowRight className="w-5 h-5 shrink-0 opacity-70 hidden sm:block" />
      </button>

      {showBundle && (
        <CreditGate cost={CREDIT_COSTS.GENERATE_BUNDLE}>
          <button
            type="button"
            onClick={onGenerateBundle}
            className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3.5 sm:px-4 py-3 sm:py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-sm text-left"
          >
            <span className="flex items-start sm:items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 mt-0.5 sm:mt-0">
                Bundle
              </span>
              <span className="leading-snug">Get the full kit — CV + letter + interview prep</span>
            </span>
            <span className="text-xs font-semibold text-slate-700 shrink-0 self-end sm:self-auto">
              18 cr <span className="text-emerald-600">(save 2)</span>
            </span>
          </button>
        </CreditGate>
      )}
    </MotionDiv>
  );
};

export default NextBestAction;
