import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import AriaOrbit from '../cv/AriaOrbit';

// The analysis is the one charged step in a prep session, and the slowest — a full read
// of a CV against a job description takes several seconds. A bare spinner for that long
// reads as a hang.
//
// So Aria narrates it. The lines below are the passes the server genuinely makes, in the
// order it makes them, which is what keeps this from being a progress bar that means
// nothing: it does read the CV, it does read the posting, it does match one against the
// other before it scores. They advance on a timer rather than on real events because the
// endpoint is a single request with no progress channel — so the LAST line holds until
// the result lands rather than looping back to the first, which would claim work had
// restarted.
const STEP_KEYS = [
  'ariaStudio.prep.analyzing.readingCv',
  'ariaStudio.prep.analyzing.readingJob',
  'ariaStudio.prep.analyzing.matching',
  'ariaStudio.prep.analyzing.weighing',
];

const STEP_MS = 2400;

const PrepAnalyzingCard = ({ jobTitle }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEP_KEYS.length - 1) return undefined;
    const timer = setTimeout(() => setStep((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <AriaCard cardKey="prep-analyzing">
      <div
        className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-5 py-8 shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center text-center">
          <span className="aria-orbit-slow inline-block">
            <AriaOrbit size={56} working />
          </span>

          {/* The line CHANGES, so it is announced; the heading around it does not. Fixed
              height so a shorter line doesn't bounce the card as they swap. */}
          <div className="mt-5 flex h-6 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={step}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="text-[15px] font-semibold text-slate-800 dark:text-slate-100"
              >
                {t(STEP_KEYS[step])}
              </motion.p>
            </AnimatePresence>
          </div>

          {jobTitle && (
            <p className="mt-1.5 max-w-full truncate font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {jobTitle}
            </p>
          )}

          {/* Four ticks, filling as the passes go by. Not a percentage: we don't have one,
              and inventing a number that creeps to 90% and stalls is the thing people
              have learned not to believe. */}
          <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
            {STEP_KEYS.map((key, i) => (
              <span
                key={key}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i <= step
                    ? 'w-6 bg-slate-900 dark:bg-white'
                    : 'w-3 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ariaStudio.prep.analyzing.note')}
          </p>
        </div>
      </div>
    </AriaCard>
  );
};

export default PrepAnalyzingCard;
