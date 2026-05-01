import React from 'react';
import { Sparkles, FileText, Mail, MessageSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

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
}) => {
  // While CV generation is in flight, replace the button with a live progress
  // card driven by the polled status. This is the "feel" the async pipeline
  // is meant to deliver — users see motion through each stage instead of a
  // single 30-second spinner.
  if (generatingCV && cvGenStatus) {
    const progress = Math.min(Math.max(cvGenStatus.progress || 0, 5), 100);
    return (
      <motion.div
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
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-indigo-600 rounded-full"
          />
        </div>
      </motion.div>
    );
  }

  const hasCV = !!(application?.optimizedCV || application?.draftCVId);
  const hasCoverLetter = !!application?.coverLetter;
  const hasInterview = !!(application?.interviewQuestions && application.interviewQuestions.length > 0);
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

  // Show the bundle option only when nothing has been generated yet — that's
  // when "everything in one click" is most relevant. Once you have a CV,
  // bundling doesn't compose with what's already done.
  const showBundle = !hasCV && !hasCoverLetter && !hasInterview && !!onGenerateBundle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-2"
    >
      {isWeakFit && !hasCV && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This role is a stretch — even with optimization, you'll likely need to address skill gaps. Worth applying if you're still interested.
          </span>
        </div>
      )}

      <button
        onClick={action.handler}
        disabled={action.loading}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
          action.tone === 'primary'
            ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed'
            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
              Next best action
            </span>
            {action.meta && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  action.tone === 'primary'
                    ? 'bg-white/15 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {action.meta}
              </span>
            )}
          </div>
          <p className="font-bold text-base mt-0.5">{action.title}</p>
          <p
            className={`text-sm mt-0.5 ${
              action.tone === 'primary' ? 'text-white/85' : 'text-slate-500'
            }`}
          >
            {action.subtitle}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 shrink-0 opacity-70" />
      </button>

      {showBundle && (
        <button
          type="button"
          onClick={onGenerateBundle}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Bundle
            </span>
            <span>Or get the full kit — CV + letter + interview prep</span>
          </span>
          <span className="text-xs font-semibold text-slate-700 shrink-0">
            18 cr <span className="text-emerald-600">(save 2)</span>
          </span>
        </button>
      )}
    </motion.div>
  );
};

export default NextBestAction;
