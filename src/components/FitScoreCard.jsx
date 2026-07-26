import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { bandOf } from '../lib/applicationInsights';
import { BAND_TEXT, BAND_RULEBG } from '../lib/noteStyles';

// Editorial tokens shared across the analysis desk.
const EYEBROW =
  'font-mono uppercase text-[0.7rem] tracking-[0.18em] text-indigo-800 dark:text-indigo-300';
const CARD =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-card p-6';

/**
 * Tiny inline widget to capture 👍/👎 on an AI-generated artifact.
 * Posts to /ai-feedback which attaches the rating to the latest matching
 * AICallLog row for (applicationId, operation).
 */
const AIFeedbackWidget = ({ applicationId, operation, label }) => {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('fitScoreCard.feedback.wasHelpful');
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (feedback) => {
    if (submitting || submitted || !applicationId) return;
    setSubmitting(true);
    try {
      await api.post('/ai-feedback', { applicationId, operation, feedback });
      setSubmitted(feedback);
      toast.success(t('fitScoreCard.feedback.thanks'));
    } catch (e) {
      console.error('Feedback submit failed', e);
      toast.error(t('fitScoreCard.feedback.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!applicationId) return null;

  // Once submitted: collapse to a tidy "thanks" pill so the card doesn't keep
  // shouting after the user has already replied.
  if (submitted) {
    return (
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-3 py-1.5"
      >
        {submitted === 'up' ? (
          <ThumbsUp className="w-3.5 h-3.5" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" />
        )}
        {t('fitScoreCard.feedback.thanks')}
      </Motion.div>
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
      className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-1.5 py-1 shadow-sm"
    >
      <Motion.div
        // One-time wiggle to draw attention. Loops 2x then stops so it's
        // noticeable on first arrival without becoming visual noise.
        animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
        transition={{ delay: 1.2, duration: 0.9, repeat: 1, repeatDelay: 4 }}
        className="text-indigo-500"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </Motion.div>
      <span className="font-medium">{resolvedLabel}</span>
      <button
        type="button"
        onClick={() => submit('up')}
        disabled={submitting}
        className="ml-1 p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 active:scale-90 transition-all"
        aria-label={t('fitScoreCard.feedback.helpfulAria')}
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => submit('down')}
        disabled={submitting}
        className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 active:scale-90 transition-all"
        aria-label={t('fitScoreCard.feedback.notHelpfulAria')}
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </Motion.div>
  );
};

// Small flat pill for the experience/seniority stat rows — hairline + accent
// text, never a filled box.
const StatPill = ({ ok, meetLabel, missLabel }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      ok
        ? 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
        : 'border border-amber-500/40 text-amber-600 dark:text-amber-400'
    }`}
  >
    {ok ? meetLabel : missLabel}
  </span>
);

const FitScoreCard = ({ fitScore, fitAnalysis, actionPlan, optimizedFitScore, applicationId }) => {
  const { t } = useTranslation();
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  // Curiosity-driven sections collapsed by default — they're "show me the math"
  // rather than "what should I do." Skill Gaps stays open because it IS the action.
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const matchedSkills = fitAnalysis?.matchedSkills || [];
  const missingSkills = fitAnalysis?.missingSkills || [];
  const expAnalysis = fitAnalysis?.experienceAnalysis || {};
  const senAnalysis = fitAnalysis?.seniorityAnalysis || {};
  const breakdown = fitAnalysis?.scoreBreakdown || {};

  const totalSkills = matchedSkills.length + missingSkills.length;
  const mustHaves = missingSkills.filter((s) => s.importance === 'must_have');
  const niceToHaves = missingSkills.filter((s) => s.importance !== 'must_have');

  const band = bandOf(fitScore);

  const levelLabel = (level) => {
    const labels = {
      intern: t('fitScoreCard.levels.intern'),
      entry: t('fitScoreCard.levels.entry'),
      junior: t('fitScoreCard.levels.junior'),
      mid: t('fitScoreCard.levels.mid'),
      'mid-senior': t('fitScoreCard.levels.midSenior'),
      senior: t('fitScoreCard.levels.senior'),
      staff: t('fitScoreCard.levels.staff'),
      lead: t('fitScoreCard.levels.lead'),
      principal: t('fitScoreCard.levels.principal'),
      manager: t('fitScoreCard.levels.manager'),
      director: t('fitScoreCard.levels.director'),
      vp: t('fitScoreCard.levels.vp'),
      executive: t('fitScoreCard.levels.executive'),
      'not specified': t('fitScoreCard.levels.notSpecified'),
    };
    return labels[level] || level || t('fitScoreCard.levels.unknown');
  };

  const hasLift =
    typeof optimizedFitScore === 'number' &&
    typeof fitScore === 'number' &&
    optimizedFitScore > fitScore;
  const lift = hasLift ? optimizedFitScore - fitScore : 0;

  const hasYears = expAnalysis.candidateYears != null || expAnalysis.requiredYears != null;

  return (
    <div className="w-full space-y-6">
      {/* 1. Verdict masthead */}
      <div className={CARD}>
        <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:gap-10 md:items-center">
          {/* Left — the score + band rail */}
          <div>
            <p className={EYEBROW}>{t('fitScoreCard.eyebrow')}</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className={`font-heading text-5xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
                {fitScore}%
              </span>
            </div>
            {hasLift && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('fitScoreCard.optimizedTo')}{' '}
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {optimizedFitScore}%
                </span>{' '}
                ·{' '}
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {t('fitScoreCard.liftPts', { lift })}
                </span>
              </p>
            )}

            {/* Band rail — needs-work / almost / ready, with a marker pin */}
            <div className="mt-5">
              <div className="relative">
                <div className="grid grid-cols-[45fr_30fr_25fr] gap-0.5 h-2 rounded-full overflow-hidden">
                  <span className="bg-rose-500/50" />
                  <span className="bg-amber-500/50" />
                  <span className="bg-emerald-500/50" />
                </div>
                {typeof fitScore === 'number' && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-100"
                    style={{ left: `${Math.max(0, Math.min(100, fitScore))}%` }}
                  />
                )}
              </div>
              <div className="mt-1.5 grid grid-cols-[45fr_30fr_25fr] gap-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                <span>{t('fitScoreCard.band.needsWork')}</span>
                <span className="text-center">{t('fitScoreCard.band.almost')}</span>
                <span className="text-right">{t('fitScoreCard.band.ready')}</span>
              </div>
            </div>

            {/* Quick-capture summary — fills the space beside a long verdict so
                standing reads at a glance. Reuses existing derivations; each row
                is guarded on its own data and complements the detail cards below. */}
            <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
              {totalSkills > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={EYEBROW}>{t('fitScoreCard.skillsMatched')}</span>
                    <span className="font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
                      {matchedSkills.length}
                      <span className="text-slate-400 dark:text-slate-500">/{totalSkills}</span>
                    </span>
                  </div>

                  {/* Segmented bar (≤10 skills) or a continuous fill (>10). */}
                  <div className="mt-2">
                    {totalSkills <= 10 ? (
                      <div
                        className="grid gap-0.5 h-2"
                        style={{ gridTemplateColumns: `repeat(${totalSkills}, 1fr)` }}
                      >
                        {Array.from({ length: totalSkills }).map((_, i) => (
                          <span
                            key={i}
                            className={`rounded ${
                              i < matchedSkills.length
                                ? 'bg-emerald-500'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-2 rounded bg-emerald-500"
                          style={{ width: `${(matchedSkills.length / totalSkills) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* "You have" — the matched skills, capped. */}
                  {matchedSkills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                        {t('fitScoreCard.youHave')}
                      </span>
                      {matchedSkills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={`have-${idx}`}
                          className="inline-flex items-center rounded-full border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
                        >
                          {skill.name}
                        </span>
                      ))}
                      {matchedSkills.length > 3 && (
                        <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                          {t('fitScoreCard.moreCount', { n: matchedSkills.length - 3 })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(hasYears || expAnalysis.match != null) && (
                <div className="flex items-center justify-between gap-3">
                  <span className={EYEBROW}>{t('fitScoreCard.experience')}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300 truncate">
                      {hasYears
                        ? t('fitScoreCard.yearsNeeds', {
                            years: expAnalysis.candidateYears ?? '?',
                            required: expAnalysis.requiredYears ?? '?',
                          })
                        : expAnalysis.match
                          ? t('fitScoreCard.meets')
                          : t('fitScoreCard.belowPreferred')}
                    </span>
                    <StatPill
                      ok={!!expAnalysis.match}
                      meetLabel={t('fitScoreCard.meets')}
                      missLabel={t('fitScoreCard.belowPreferred')}
                    />
                  </span>
                </div>
              )}
              {(senAnalysis.candidateLevel ||
                senAnalysis.requiredLevel ||
                senAnalysis.match != null) && (
                <div className="flex items-center justify-between gap-3">
                  <span className={EYEBROW}>{t('fitScoreCard.seniority')}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                      {levelLabel(senAnalysis.candidateLevel) || t('fitScoreCard.levelVaries')}
                    </span>
                    <StatPill
                      ok={!!senAnalysis.match}
                      meetLabel={t('fitScoreCard.aligned')}
                      missLabel={t('fitScoreCard.mixed')}
                    />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right — the verdict */}
          <div>
            {fitAnalysis?.overallFeedback && (
              <p className="font-heading text-lg leading-relaxed text-slate-900 dark:text-slate-100">
                {fitAnalysis.overallFeedback}
              </p>
            )}
            {fitAnalysis?.recommendation && (
              <div className="mt-4 border-l-2 border-indigo-500 pl-4">
                <p className={EYEBROW}>{t('fitScoreCard.bottomLine')}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {fitAnalysis.recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Where you're short — the skill gaps, severity-ordered. */}
      <section className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={EYEBROW}>{t('fitScoreCard.theGap')}</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('fitScoreCard.whereShort')}
            </h3>
          </div>
          {totalSkills > 0 && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {t('fitScoreCard.matchedOfTotal', {
                matched: matchedSkills.length,
                total: totalSkills,
              })}
            </span>
          )}
        </div>

        {missingSkills.length === 0 && totalSkills > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            {t('fitScoreCard.allSkillsMatched')}
          </p>
        ) : missingSkills.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t('fitScoreCard.noSkillRequirements')}
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Must-have gaps — rose left stripe */}
            {mustHaves.length > 0 && (
              <div className="border-l-2 border-rose-500 pl-4">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
                  {t('fitScoreCard.criticalRequired')}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {mustHaves.map((skill, idx) => (
                    <span
                      key={`must-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nice-to-have gaps — muted */}
            {niceToHaves.length > 0 && (
              <div className="pl-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {t('fitScoreCard.bonusSkills')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {niceToHaves.map((skill, idx) => (
                    <span
                      key={`nice-${idx}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matched skills — collapsible, lowest priority */}
            {matchedSkills.length > 0 && (
              <div className="pl-4">
                <button
                  type="button"
                  onClick={() => setSkillsExpanded(!skillsExpanded)}
                  className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  aria-expanded={skillsExpanded}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {t('fitScoreCard.skillsMatchedToggle', { count: matchedSkills.length })}
                  {skillsExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {skillsExpanded && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {matchedSkills.map((skill, idx) => (
                      <span
                        key={`match-${idx}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. What stood out — verbatim quotes pulled from the resume. Only renders
          when the AI found real, validated quotes. */}
      {Array.isArray(fitAnalysis?.evidence) && fitAnalysis.evidence.length > 0 && (
        <section className={CARD}>
          <p className={EYEBROW}>{t('fitScoreCard.readFromResume')}</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('fitScoreCard.whatStoodOut')}
          </h3>
          <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {fitAnalysis.evidence.map((e, idx) => (
              <li key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <span className="shrink-0 pt-1 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-heading italic text-slate-900 dark:text-slate-100">
                    “{e.quote}”
                  </p>
                  {e.issue && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {e.issue}
                    </p>
                  )}
                  {e.fix && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-indigo-700 dark:text-indigo-300">
                      <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{e.fix}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Score breakdown — collapsible, with the fixed-weights tooltip. */}
      {breakdown.skillsScore != null &&
        (() => {
          const dimensions = [
            { label: t('fitScoreCard.dims.skills'), score: breakdown.skillsScore, weight: '40%' },
            {
              label: t('fitScoreCard.dims.experience'),
              score: breakdown.experienceScore,
              weight: '25%',
            },
            {
              label: t('fitScoreCard.dims.education'),
              score: breakdown.educationScore,
              weight: '15%',
            },
            {
              label: t('fitScoreCard.dims.seniority'),
              score: breakdown.seniorityScore,
              weight: '10%',
            },
            {
              label: t('fitScoreCard.dims.profileStrength'),
              score: breakdown.overallScore,
              weight: '10%',
            },
          ].filter(({ score }) => score != null);
          return (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setBreakdownOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                aria-expanded={breakdownOpen}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={EYEBROW}>{t('fitScoreCard.theMath')}</p>
                    {/* Tooltip — explains the fixed weights so users understand why,
                        not just what. Click target is the icon; hover/focus reveals. */}
                    <div className="relative group">
                      <HelpCircle
                        className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                        tabIndex={0}
                      />
                      <div
                        role="tooltip"
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-w-[calc(100vw-2rem)] px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all pointer-events-none z-10"
                      >
                        <p className="font-semibold mb-1">{t('fitScoreCard.whyWeights')}</p>
                        <p className="leading-relaxed text-slate-200">
                          {t('fitScoreCard.weightsExplainer')}
                        </p>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('fitScoreCard.scoreBreakdown')}
                  </h3>
                  {!breakdownOpen && (
                    <p className="mt-1 font-mono text-[0.7rem] tabular-nums text-slate-400 dark:text-slate-500 truncate">
                      {dimensions.map((d) => `${d.label} ${d.score}`).join(' · ')}
                    </p>
                  )}
                </div>
                <Motion.div
                  animate={{ rotate: breakdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-400 dark:text-slate-500 shrink-0"
                >
                  <ChevronDown className="w-5 h-5" />
                </Motion.div>
              </button>
              <AnimatePresence initial={false}>
                {breakdownOpen && (
                  <Motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {dimensions.map(({ label, score, weight }) => {
                        const dBand = bandOf(score);
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="text-slate-600 dark:text-slate-300">
                                {label}{' '}
                                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                                  ({weight})
                                </span>
                              </span>
                              <span className={`font-semibold tabular-nums ${BAND_TEXT[dBand]}`}>
                                {score}/100
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <Motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={`h-1.5 rounded-full ${BAND_RULEBG[dBand]}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })()}

      {/* 6. What to fix next — the internal action plan. */}
      {actionPlan && actionPlan.length > 0 && (
        <section className={CARD}>
          <p className={EYEBROW}>{t('fitScoreCard.yourMove')}</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('fitScoreCard.whatToFixNext')}
          </h3>
          <ol className="mt-5 space-y-5">
            {actionPlan.map((item, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="w-9 shrink-0 font-heading text-3xl font-bold leading-none tabular-nums text-slate-200 dark:text-slate-700">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 pt-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {(item.skill || item.category) && (
                      <span className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        {item.category || item.skill}
                      </span>
                    )}
                    {item.importance === 'must_have' && (
                      <span className="rounded border border-rose-500/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-rose-600 dark:text-rose-400">
                        {t('fitScoreCard.critical')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {item.task || item.action}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 7. AI feedback — only renders when we have an applicationId to attach to */}
      {applicationId && (
        <div className="flex justify-end pt-1">
          <AIFeedbackWidget
            applicationId={applicationId}
            operation="generateAnalysisFeedback"
            label={t('fitScoreCard.wasAnalysisAccurate')}
          />
        </div>
      )}
    </div>
  );
};

export default FitScoreCard;
