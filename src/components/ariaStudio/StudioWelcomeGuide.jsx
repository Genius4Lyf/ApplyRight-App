import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, X } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useChatTheme } from '../../hooks/useChatTheme';
import AriaOrbit from '../cv/AriaOrbit';

const STEPS = [
  { key: 'welcome' },
  { key: 'workspace' },
  { key: 'edit' },
  { key: 'review' },
  { key: 'builder' },
];

// A short orientation, not a feature tour. Studio is strongest when it improves an
// existing CV; the Builder remains the intentional place to add structured entries.
const StudioWelcomeGuide = ({ open, onComplete }) => {
  const { t } = useTranslation();
  const [chatTheme] = useChatTheme();
  const [step, setStep] = useState(0);
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (!open) return undefined;

    restoreFocusRef.current = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onComplete?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onComplete]);

  const advance = () => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStep((currentStep) => currentStep + 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="studio-welcome-title">
          <motion.button
            type="button"
            aria-label={t('ariaStudio.welcomeGuide.skip')}
            onClick={onComplete}
            className="absolute inset-0 cursor-default bg-slate-950/55 dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.section
            ref={dialogRef}
            tabIndex={-1}
            className={`relative w-full max-w-[36rem] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl outline-none dark:border-slate-800 aria-theme-${chatTheme}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="bg-white/95 px-5 pb-6 pt-5 dark:bg-slate-900/95 sm:px-7 sm:pb-7 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AriaOrbit size={22} working={step === 0} />
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t('ariaStudio.welcomeGuide.eyebrow')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onComplete}
                  className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={t('ariaStudio.welcomeGuide.skip')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2" aria-label={t('ariaStudio.welcomeGuide.progress', { current: step + 1, total: STEPS.length })}>
                {STEPS.map((item, index) => (
                  <span key={item.key} className={`h-1 flex-1 rounded-full transition-colors ${index <= step ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                ))}
              </div>

              <div className="mt-7 flex min-h-[242px] flex-col items-start">
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                    {t('ariaStudio.welcomeGuide.stepLabel', { current: step + 1, total: STEPS.length })}
                  </span>
                  <span className="h-px w-7 bg-emerald-500/50" />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={current.key}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                    transition={{ duration: 0.16 }}
                  >
                    <h2 id="studio-welcome-title" className="max-w-md text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.7rem]">
                      {t(`ariaStudio.welcomeGuide.steps.${current.key}.title`)}
                    </h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">
                      {t(`ariaStudio.welcomeGuide.steps.${current.key}.body`)}
                    </p>
                    <div className="mt-5 space-y-2.5 border-l border-slate-200 pl-4 dark:border-slate-700">
                      <p className="flex gap-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />{t(`ariaStudio.welcomeGuide.steps.${current.key}.detailOne`)}</p>
                      <p className="flex gap-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />{t(`ariaStudio.welcomeGuide.steps.${current.key}.detailTwo`)}</p>
                    </div>
                    <a href="/cv-builder-guide" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 no-underline transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300">
                      {t('ariaStudio.welcomeGuide.tutorialVideos')}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white/95 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((currentStep) => currentStep - 1)} className="inline-flex items-center gap-1.5 px-1 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                  <ArrowLeft className="h-4 w-4" />
                  {t('ariaStudio.welcomeGuide.back')}
                </button>
              ) : (
                <button type="button" onClick={onComplete} className="px-1 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                  {t('ariaStudio.welcomeGuide.skip')}
                </button>
              )}
              <button type="button" onClick={advance} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
                {t(isLast ? 'ariaStudio.welcomeGuide.finish' : 'ariaStudio.welcomeGuide.next')}
                {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StudioWelcomeGuide;
