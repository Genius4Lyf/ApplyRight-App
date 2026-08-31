import React, { useEffect, useRef, useState } from 'react';
import { FilePlus2, ChevronDown, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import AriaOrbit from '../cv/AriaOrbit';

// The two ways to start something, in every sidebar in the app.
//
// "New CV" is a menu rather than a button because there are genuinely TWO ways to build
// one — a conversation with Aria, or the step-by-step form — and which you want is a real
// choice, not a setting. The hint under each label is what makes it a choice a first-timer
// can make; without it the two read as the same action named twice.
//
// Interview sits beside it, not under it: it needs a CV to analyse, so it is the second
// thing you do here, never the first.
//
// Shared by SessionRail and WorkspaceSidebar. Only the callbacks differ — inside Aria
// Studio "build with Aria" starts a session in place; everywhere else it navigates there.
const NewCvMenu = ({ onBuildWithAria, onBuildWithBuilder, onInterview, newCvPrimary = true }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const pick = (run) => {
    setOpen(false);
    run?.();
  };

  // Sizing is COMPOSED on top of the app's button classes (width, compact padding, rail
  // -scale text) rather than re-implementing the colours, so these stay in step with every
  // other button in the app.
  //
  // The pair sits side by side at EVERY width now. Stacked, they read as a list of two
  // unrelated errands; abreast, they read as the choice they are — build something, or
  // aim it at a job. The budget that makes it fit a 248px rail is tight and deliberate:
  // ~108px a side, so the padding is px-2, the icons shrink at sm, and the interview
  // button always takes its short label rather than swapping to the long one on desktop.
  const shape =
    'flex-1 min-w-0 justify-center gap-1.5 px-2 py-2 text-[15px] sm:text-[12.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100';

  return (
    <div className="flex gap-2">
      <div ref={ref} className="relative flex-1 min-w-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('workspace.newCv.aria')}
          className={`${newCvPrimary ? 'btn-primary' : 'btn-secondary'} w-full ${shape}`}
        >
          <FilePlus2 className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
          <span className="whitespace-nowrap">{t('workspace.newCv.label')}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              role="menu"
              className="absolute left-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(onBuildWithAria)}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <AriaOrbit size={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {t('workspace.newCv.withAria')}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {t('workspace.newCv.withAriaHint')}
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => pick(onBuildWithBuilder)}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <FilePlus2 className="mt-0.5 h-[15px] w-[15px] shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {t('workspace.newCv.withBuilder')}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {t('workspace.newCv.withBuilderHint')}
                  </span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onInterview}
        aria-label={t('workspace.interview.label')}
        className={`btn-secondary ${shape}`}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
        {/* Always the short label. Sharing a 248px row with New CV, "Prepare for an
            interview" has nowhere to go but a truncation. The full phrase survives as the
            button's accessible name. */}
        <span className="whitespace-nowrap">{t('workspace.interview.short')}</span>
      </button>
    </div>
  );
};

export default NewCvMenu;
