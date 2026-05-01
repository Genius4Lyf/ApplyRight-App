import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Target,
  Award,
  Briefcase,
  Lightbulb,
  Wrench,
  Bot,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

/**
 * Tiny inline widget to capture 👍/👎 on an AI-generated artifact.
 * Posts to /ai-feedback which attaches the rating to the latest matching
 * AICallLog row for (applicationId, operation).
 */
const AIFeedbackWidget = ({ applicationId, operation, label = 'Was this helpful?' }) => {
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (feedback) => {
    if (submitting || submitted || !applicationId) return;
    setSubmitting(true);
    try {
      await api.post('/ai-feedback', { applicationId, operation, feedback });
      setSubmitted(feedback);
      toast.success('Thanks for the feedback');
    } catch (e) {
      console.error('Feedback submit failed', e);
      toast.error("Couldn't save feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (!applicationId) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => submit('up')}
        disabled={submitting || !!submitted}
        className={`p-1 rounded hover:bg-emerald-50 transition-colors ${
          submitted === 'up' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
        } disabled:cursor-default`}
        aria-label="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => submit('down')}
        disabled={submitting || !!submitted}
        className={`p-1 rounded hover:bg-red-50 transition-colors ${
          submitted === 'down' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-red-500'
        } disabled:cursor-default`}
        aria-label="Not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const FitScoreCard = ({ fitScore, fitAnalysis, actionPlan, optimizedFitScore, applicationId }) => {
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  // Curiosity-driven sections collapsed by default — they're "show me the math"
  // rather than "what should I do." Skill Gaps stays open because it IS the action.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [seniorityOpen, setSeniorityOpen] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const textColor = getScoreColor(fitScore);
  const bgColor = getScoreBg(fitScore);
  const isAIMode = fitAnalysis?.mode === 'AI';

  const matchedSkills = fitAnalysis?.matchedSkills || [];
  const missingSkills = fitAnalysis?.missingSkills || [];
  const expAnalysis = fitAnalysis?.experienceAnalysis || {};
  const senAnalysis = fitAnalysis?.seniorityAnalysis || {};
  const breakdown = fitAnalysis?.scoreBreakdown || {};

  const totalSkills = matchedSkills.length + missingSkills.length;

  const levelLabel = (level) => {
    const labels = {
      intern: 'Intern', entry: 'Entry', junior: 'Junior', mid: 'Mid-Level',
      'mid-senior': 'Mid-Senior', senior: 'Senior', staff: 'Staff',
      lead: 'Lead', principal: 'Principal', manager: 'Manager',
      director: 'Director', vp: 'VP', executive: 'Executive',
      'not specified': 'Not Specified',
    };
    return labels[level] || level || 'Unknown';
  };

  const hasLift =
    typeof optimizedFitScore === 'number' &&
    typeof fitScore === 'number' &&
    optimizedFitScore > fitScore;
  const lift = hasLift ? optimizedFitScore - fitScore : 0;

  return (
    <div className="w-full space-y-6">
      {/* Optimization lift banner — appears after CV generation succeeds */}
      {hasLift && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="bg-gradient-to-r from-emerald-50 via-emerald-50 to-indigo-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700">
              Your optimized CV improved this match
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-slate-400 text-sm line-through">{fitScore}%</span>
              <span className="text-slate-400 text-sm">→</span>
              <span className={`text-2xl font-bold ${getScoreColor(optimizedFitScore)}`}>
                {optimizedFitScore}%
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                +{lift} pts
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-8"
      >
        {/* Circular Score */}
        <div className="relative flex-shrink-0 w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
            <circle
              cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
              strokeDasharray={351.86}
              strokeDashoffset={351.86 - (351.86 * (fitScore || 0)) / 100}
              className={`${textColor} transition-all duration-1000 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-3xl font-bold ${textColor}`}>{fitScore}%</span>
            <span className="text-xs uppercase font-bold text-slate-400">Match</span>
          </div>
        </div>

        {/* Summary & Recommendation */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Application Fit Analysis</h3>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isAIMode ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {isAIMode ? <Bot className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
              {isAIMode ? 'AI-Powered Analysis' : 'Standard Match (Beta)'}
            </div>
          </div>

          <p className="text-slate-600">{fitAnalysis?.overallFeedback}</p>

          <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 ${bgColor}`}>
            <Info className={`w-5 h-5 flex-shrink-0 ${textColor} mt-0.5`} />
            <div>
              <p className={`font-semibold text-sm ${textColor}`}>Our Recommendation</p>
              <p className="text-slate-700 text-sm mt-1">{fitAnalysis?.recommendation}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Score Breakdown — collapsible. Closed by default; the score itself is
          the headline, this is "show me the math" for users who want to verify. */}
      {breakdown.skillsScore != null && (() => {
        const dimensions = [
          { label: 'Skills', score: breakdown.skillsScore, weight: '40%' },
          { label: 'Experience', score: breakdown.experienceScore, weight: '25%' },
          { label: 'Education', score: breakdown.educationScore, weight: '15%' },
          { label: 'Seniority', score: breakdown.seniorityScore, weight: '10%' },
          { label: 'Profile Strength', score: breakdown.overallScore, weight: '10%' },
        ].filter(({ score }) => score != null);
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              aria-expanded={breakdownOpen}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-slate-800">Score Breakdown</h4>
                  {/* Tooltip — explains the fixed weights so users understand why,
                      not just what. Click target is the icon; hover/focus reveals. */}
                  <div className="relative group">
                    <HelpCircle
                      className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help"
                      tabIndex={0}
                    />
                    <div
                      role="tooltip"
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all pointer-events-none z-10"
                    >
                      <p className="font-semibold mb-1">Why these weights?</p>
                      <p className="leading-relaxed text-slate-200">
                        Skills (40%) are the strongest predictor of fit, followed by experience (25%) and education (15%). Seniority and profile strength (10% each) round out the picture. Fixed across every analysis so scores are directly comparable.
                      </p>
                      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                </div>
                {!breakdownOpen && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {dimensions.map((d) => `${d.label} ${d.score}`).join(' · ')}
                  </p>
                )}
              </div>
              <motion.div
                animate={{ rotate: breakdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 shrink-0"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {breakdownOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
                    {dimensions.map(({ label, score, weight }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">
                            {label} <span className="text-slate-400">({weight})</span>
                          </span>
                          <span className={`font-semibold ${getScoreColor(score)}`}>{score}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-2 rounded-full ${getBarColor(score)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}

      {/* Top Gaps panel — prominent, severity-ordered. Replaces the cramped
          Skills card so missing must-haves drive the user's attention to the
          single most impactful action: generate an optimized CV. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            <h4 className="font-semibold text-slate-800">Skill Gaps</h4>
          </div>
          {totalSkills > 0 && (
            <span className="text-xs text-slate-400">
              {matchedSkills.length}/{totalSkills} matched
            </span>
          )}
        </div>

        {missingSkills.length === 0 && totalSkills > 0 ? (
          <div className="p-5 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">All required skills matched — strong fit on skills.</span>
          </div>
        ) : missingSkills.length === 0 ? (
          <div className="p-5 flex items-center gap-2 text-sm text-slate-500">
            <Info className="w-5 h-5 text-slate-400" />
            No specific skill requirements were detected for this role.
          </div>
        ) : (
          <div>
            {/* Must-have gaps — dominant, red severity */}
            {missingSkills.filter((s) => s.importance === 'must_have').length > 0 && (
              <div className="px-5 py-4 bg-red-50/50 border-b border-red-100">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 mb-2">
                  Critical — required by the role
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingSkills
                    .filter((s) => s.importance === 'must_have')
                    .map((skill, idx) => (
                      <span
                        key={`must-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-sm font-medium text-slate-800"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        {skill.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Nice-to-have gaps — secondary, amber */}
            {missingSkills.filter((s) => s.importance !== 'must_have').length > 0 && (
              <div className="px-5 py-3 bg-amber-50/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-2">
                  Bonus — would strengthen the application
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills
                    .filter((s) => s.importance !== 'must_have')
                    .map((skill, idx) => (
                      <span
                        key={`nice-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-xs text-slate-700"
                      >
                        {skill.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Matched skills — collapsible, lowest priority */}
            {matchedSkills.length > 0 && (
              <button
                onClick={() => setSkillsExpanded(!skillsExpanded)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {matchedSkills.length} skill{matchedSkills.length === 1 ? '' : 's'} matched
                </span>
                {skillsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            {skillsExpanded && matchedSkills.length > 0 && (
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-1.5">
                {matchedSkills.map((skill, idx) => (
                  <span
                    key={`match-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-xs text-slate-700"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Experience + Seniority — both collapsed by default. The teaser line
          gives the headline answer (years, match) so the user gets the signal
          without needing to expand. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Experience Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setExperienceOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            aria-expanded={experienceOpen}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-800">Experience</h4>
              {!experienceOpen && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                  {expAnalysis.candidateYears != null && expAnalysis.requiredYears != null ? (
                    <>
                      {expAnalysis.candidateYears} yrs vs {expAnalysis.requiredYears} required
                      <span className="text-slate-300">·</span>
                    </>
                  ) : null}
                  {expAnalysis.match ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3 h-3" /> Meets
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3" /> Below preferred
                    </span>
                  )}
                </p>
              )}
            </div>
            <motion.div
              animate={{ rotate: experienceOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400 shrink-0"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {experienceOpen && (
              <motion.div
                key="exp-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                  {(expAnalysis.candidateYears != null || expAnalysis.requiredYears != null) && (
                    <div className="flex items-center gap-3 mb-3 mt-3">
                      <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                        <div className="text-lg font-bold text-slate-800">
                          {expAnalysis.candidateYears ?? '?'}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">Your Years</div>
                      </div>
                      <span className="text-slate-300 text-sm">vs</span>
                      <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                        <div className="text-lg font-bold text-slate-800">
                          {expAnalysis.requiredYears ?? '?'}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">Required</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    {expAnalysis.match ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-slate-600">
                      {expAnalysis.feedback || (expAnalysis.match ? 'Meets requirements' : 'Less than preferred')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Seniority Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setSeniorityOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            aria-expanded={seniorityOpen}
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-800">Seniority Level</h4>
              {!seniorityOpen && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                  {(senAnalysis.candidateLevel || senAnalysis.requiredLevel) && (
                    <>
                      {levelLabel(senAnalysis.candidateLevel)} vs {levelLabel(senAnalysis.requiredLevel)}
                      <span className="text-slate-300">·</span>
                    </>
                  )}
                  {senAnalysis.match ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3 h-3" /> Aligned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Info className="w-3 h-3" /> Mixed
                    </span>
                  )}
                </p>
              )}
            </div>
            <motion.div
              animate={{ rotate: seniorityOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400 shrink-0"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {seniorityOpen && (
              <motion.div
                key="sen-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                  {(senAnalysis.candidateLevel || senAnalysis.requiredLevel) && (
                    <div className="flex items-center gap-3 mb-3 mt-3">
                      <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                        <div className="text-sm font-bold text-slate-800">
                          {levelLabel(senAnalysis.candidateLevel)}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">You</div>
                      </div>
                      <span className="text-slate-300 text-sm">vs</span>
                      <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                        <div className="text-sm font-bold text-slate-800">
                          {levelLabel(senAnalysis.requiredLevel)}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">Required</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    {senAnalysis.match ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-slate-600">
                      {senAnalysis.feedback || (senAnalysis.match ? 'Aligned with role' : 'Role may vary from level')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Smart Action Plan */}
      {actionPlan && actionPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-indigo-50 rounded-xl p-6 border border-indigo-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Smart Action Plan</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Based on your gaps, here are specific steps to improve your fit:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionPlan.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-3"
              >
                <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {(item.skill || item.category) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                        {item.category || item.skill}
                      </span>
                    )}
                    {item.importance === 'must_have' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold uppercase">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{item.task || item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI feedback — only renders when we have an applicationId to attach to */}
      {applicationId && (
        <div className="flex justify-end pt-1">
          <AIFeedbackWidget
            applicationId={applicationId}
            operation="generateAnalysisFeedback"
            label="Was this analysis accurate?"
          />
        </div>
      )}
    </div>
  );
};

export default FitScoreCard;
