import React, { useState } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import { CREDIT_COSTS } from '../../lib/credits';
import AriaCard from './AriaCard';

// Keys, not text — resolved via t() at render so the runtime UI language decides.
const RECOMMENDATION_KEYS = {
  strong_match: 'ariaStudio.scoreCard.recommendation.strongMatch',
  good_match: 'ariaStudio.scoreCard.recommendation.goodMatch',
  potential_match: 'ariaStudio.scoreCard.recommendation.potentialMatch',
  weak_match: 'ariaStudio.scoreCard.recommendation.weakMatch',
};

// The tri-band rail — where this score sits across bad / warn / ok. Gives the number
// context at a glance: 62 means nothing on its own, 62 sitting just inside amber does.
const BandRail = ({ score }) => {
  const { t } = useTranslation();
  const band = bandOf(score);
  return (
    <div className="mt-3">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full">
        <span className="h-full bg-rose-500/25" style={{ width: '45%' }} />
        <span className="h-full bg-amber-500/25" style={{ width: '30%' }} />
        <span className="h-full bg-emerald-500/25" style={{ width: '25%' }} />
      </div>
      <div className="relative h-3">
        <motion.span
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: `${Math.min(100, Math.max(0, score))}%`, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute top-0 -translate-x-1/2 w-0.5 h-2.5 rounded-full ${BAND_RULEBG[band]}`}
        />
      </div>
      <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <span>{t('ariaStudio.scoreCard.bandWeak')}</span>
        <span>{t('ariaStudio.scoreCard.bandPossible')}</span>
        <span>{t('ariaStudio.scoreCard.bandStrong')}</span>
      </div>
    </div>
  );
};

// Aria's scan verdict: the fit score, what it means in one line, and — behind a
// disclosure — the full analysis (dimension bars, matched/missing skills, and the
// evidence quotes with issue → fix). Collapsed by default: the number is the headline;
// the reasoning is there when the user wants to argue with it.
const ScoreCard = ({ scan, cost, isDrafted = false }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!scan) return null;

  const score = scan.fitScore ?? 0;
  const band = bandOf(score);
  const breakdown = scan.scoreBreakdown || {};
  const evidence = Array.isArray(scan.evidence) ? scan.evidence : [];
  const matched = scan.matchedSkills || [];
  const missing = scan.missingSkills || [];
  const price = cost ?? CREDIT_COSTS.FIT_ANALYSIS ?? 10;

  const dimensions = [
    { label: t('ariaStudio.scoreCard.dims.skills'), score: breakdown.skillsScore, weight: '40%' },
    {
      label: t('ariaStudio.scoreCard.dims.experience'),
      score: breakdown.experienceScore,
      weight: '25%',
    },
    {
      label: t('ariaStudio.scoreCard.dims.education'),
      score: breakdown.educationScore,
      weight: '15%',
    },
    {
      label: t('ariaStudio.scoreCard.dims.seniority'),
      score: breakdown.seniorityScore,
      weight: '10%',
    },
    {
      label: t('ariaStudio.scoreCard.dims.profileStrength'),
      score: breakdown.overallScore,
      weight: '10%',
    },
  ].filter((d) => d.score != null);

  return (
    <AriaCard cardKey="score">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.scoreCard.fitAgainstJob')}
            </p>
            <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('ariaStudio.scoreCard.costAnalysis', { price })}
            </span>
          </div>

          {isDrafted && (
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.jobCapture.draftedTag')}
            </p>
          )}

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`font-heading text-4xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
              {score}
            </span>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.common.outOf100')}
            </span>
          </div>

          <BandRail score={score} />

          <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {scan.recommendation && RECOMMENDATION_KEYS[scan.recommendation]
              ? t(RECOMMENDATION_KEYS[scan.recommendation])
              : t('ariaStudio.scoreCard.scanComplete')}
          </p>

          {/* A recompute refreshed the numbers under narrative written for an older
              version of the CV — say so rather than passing it off as current. */}
          {scan.fromLastFullScan && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {t('ariaStudio.scoreCard.scoresUpdated')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
            {open
              ? t('ariaStudio.scoreCard.hideFullAnalysis')
              : t('ariaStudio.scoreCard.showFullAnalysis')}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 dark:text-slate-500"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="analysis"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-5">
                {/* Dimension bars */}
                {dimensions.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('ariaStudio.scoreCard.theMath')}
                    </p>
                    {dimensions.map(({ label, score: s, weight }) => {
                      const dBand = bandOf(s);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-slate-600 dark:text-slate-300">
                              {label}{' '}
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                ({weight})
                              </span>
                            </span>
                            <span className={`font-semibold tabular-nums ${BAND_TEXT[dBand]}`}>
                              {s}/100
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${s}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-1.5 rounded-full ${BAND_RULEBG[dBand]}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Matched vs missing */}
                {(matched.length > 0 || missing.length > 0) && (
                  <div className="space-y-2.5">
                    {matched.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
                          {t('ariaStudio.scoreCard.youHave', { n: matched.length })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matched.map((s, i) => (
                            <span
                              key={`${s.name}-${i}`}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {missing.length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">
                          {t('ariaStudio.scoreCard.missing', { n: missing.length })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {missing.map((s, i) => (
                            <span
                              key={`${s.name}-${i}`}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence — verbatim quotes with issue → fix */}
                {evidence.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      {t('ariaStudio.scoreCard.readFromCv')}
                    </p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {evidence.map((e, i) => (
                        <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="font-heading italic text-[13px] text-slate-900 dark:text-slate-100">
                              &ldquo;{e.quote}&rdquo;
                            </p>
                            {e.issue && (
                              <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                                {e.issue}
                              </p>
                            )}
                            {e.fix && (
                              <p className="mt-1 flex items-start gap-1.5 text-[12px] text-slate-700 dark:text-slate-300">
                                <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{e.fix}</span>
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AriaCard>
  );
};

export default ScoreCard;
