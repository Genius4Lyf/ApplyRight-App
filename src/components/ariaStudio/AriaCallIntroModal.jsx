import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks jsx-uses-vars so it
// reads as unused — the same false positive SectionCoach suppresses.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { Phone, Zap, MessageCircle, Sparkles } from 'lucide-react';
import { modalAnim, scrimAnim, pressable } from '../../lib/ariaMotion';

// THE ONE TIME WE TELL THEM CALLS EXIST.
//
// A voice feature nobody knows about is a voice feature nobody buys. "Talk it through instead"
// sits under the composer, but at the exact moment it appears the user is reading Aria's first
// question and typing an answer — a quiet link next to the box they are already using loses
// every time.
//
// So it gets announced once, deliberately, at the only moment it makes sense: the role form is
// filled in, the interview is about to start, and the choice between typing and talking is
// live and unmade. Not on the dashboard, not at signup — here, with the decision in front of
// them.
//
// ── ONCE MEANS ONCE ──
//
// Marked seen the moment it is DISPLAYED (settings.seenAriaCallIntro), not when a button is
// pressed: closing it with Escape, or wandering off to another tab, is still having been told.
// An announcement that comes back because you dismissed it the wrong way is an advert.
//
// Not to be confused with AriaCallTipsModal. That one is a BRIEF — how to get a good call — and
// it shows before every first call of a session until the user opts out. This one is news, and
// it is over after the first showing. Someone who buys minutes here meets the brief next, on
// the call itself; the two never appear together.
//
// Portalled to <body>, like the tips: the coach lives inside a scrolling chat column and on a
// phone the edit panel can sit over it, so an inline dialog could open somewhere unseen.
const POINTS = [
  { key: 'faster', icon: Zap },
  { key: 'asItComes', icon: MessageCircle },
  { key: 'sheWrites', icon: Sparkles },
];

const AriaCallIntroModal = ({ open, onGetMinutes, onKeepTyping }) => {
  const { t } = useTranslation();
  const keepRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    // "Keep typing" holds focus, not "Get minutes". The user was in the middle of building a
    // CV; a stray Enter should return them to what they were doing, never start a purchase.
    keepRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onKeepTyping?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onKeepTyping]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      {...scrimAnim}
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        {...modalAnim(reduce)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aria-call-intro-title"
        // The safety net is for short windows only; at ordinary sizes this fits without a
        // scroll, which is the whole point of keeping it to three lines and three points.
        className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto scrollbar-none rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        {/* Sized to FIT, not to fill. Measured across the usual window heights: at the roomy
            spacing this started with it ran past the bottom of a 640px-tall phone and a short
            laptop window, and a product announcement that you have to scroll is one nobody
            reads to the end of. The `short-screen` steps take a little more back on the
            windows that actually need it rather than cramping every screen. */}
        <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-7 short-screen:pt-5 short-screen:pb-4">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.ariaLive.intro.eyebrow')}
            </p>
            <h3
              id="aria-call-intro-title"
              className="mt-1.5 text-xl font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-[1.4rem]"
            >
              {t('ariaStudio.ariaLive.intro.title')}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.ariaLive.intro.lead')}
            </p>
          </div>

          <ul className="mt-5 space-y-4 short-screen:mt-4 short-screen:space-y-3.5">
            {/* `Icon` is used only as <Icon />; this eslint config lacks jsx-uses-vars, so it
                reads as unused — the same false positive AriaCallTipsModal suppresses. */}
            {/* eslint-disable-next-line no-unused-vars */}
            {POINTS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3.5">
                <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t(`ariaStudio.ariaLive.intro.${key}.title`)}
                  </p>
                  {/* Tightened on short windows rather than shortened: the three points are
                      the whole argument, and cutting one to make the box fit a 640px phone
                      would be fitting the message to the furniture. */}
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 short-screen:leading-snug">
                    {t(`ariaStudio.ariaLive.intro.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Both doors, and neither is a dead end: typing is how the CV gets built either way. */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-8">
          <motion.button
            ref={keepRef}
            type="button"
            onClick={onKeepTyping}
            {...pressable(reduce)}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:w-auto"
          >
            {t('ariaStudio.ariaLive.intro.keepTyping')}
          </motion.button>
          <motion.button
            type="button"
            onClick={onGetMinutes}
            {...pressable(reduce)}
            className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:w-auto"
          >
            {t('ariaStudio.ariaLive.intro.getMinutes')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default AriaCallIntroModal;
