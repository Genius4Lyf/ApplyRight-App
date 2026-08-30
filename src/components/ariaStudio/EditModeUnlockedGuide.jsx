import React, { useEffect, useRef } from 'react';
import { Check, FilePen, X } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useChatTheme } from '../../hooks/useChatTheme';
import AriaOrbit from '../cv/AriaOrbit';

// Shown ONCE, the first time a CV in this Studio becomes editable.
//
// The welcome guide already has an "edit" step, but it runs at the start of a session —
// before there is a CV to edit — so it teaches a capability the user cannot use yet and
// has forgotten by the time they can. This fires at the moment the thing actually becomes
// true, which is the only moment it means anything.
//
// It shows the REAL button — same FilePen, same green dot — because "tap the pencil with
// the green dot" is only useful if you can recognise it when you look up. Deliberately one
// step: the welcome guide is an orientation, this is a single fact.
const EditModeUnlockedGuide = ({ open, onOpenPreview, onComplete }) => {
  const { t } = useTranslation();
  const [chatTheme] = useChatTheme();
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();

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

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-editmode-title"
        >
          <motion.button
            type="button"
            aria-label={t('ariaStudio.editModeGuide.dismiss')}
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
            className={`relative w-full max-w-[30rem] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl outline-none dark:border-slate-800 aria-theme-${chatTheme}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="bg-white/95 px-5 pb-6 pt-5 dark:bg-slate-900/95 sm:px-7 sm:pb-7 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AriaOrbit size={22} />
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t('ariaStudio.editModeGuide.eyebrow')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onComplete}
                  className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={t('ariaStudio.editModeGuide.dismiss')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2
                id="studio-editmode-title"
                className="mt-6 max-w-md text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.7rem]"
              >
                {t('ariaStudio.editModeGuide.title')}
              </h2>

              {/* The button as it actually appears in the header, dot and all. A written
                  description of an icon is worth much less than the icon. */}
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <span className="relative inline-flex shrink-0 text-slate-900 dark:text-white">
                  <FilePen className="h-5 w-5" />
                  <span
                    aria-hidden="true"
                    className="studio-live-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-50 dark:ring-slate-800"
                  />
                </span>
                <p className="min-w-0 text-[13px] leading-5 text-slate-700 dark:text-slate-200">
                  {t('ariaStudio.editModeGuide.buttonHint')}
                </p>
              </div>

              <div className="mt-5 space-y-2.5 border-l border-slate-200 pl-4 dark:border-slate-700">
                <p className="flex gap-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" />
                  {t('ariaStudio.editModeGuide.detailOne')}
                </p>
                <p className="flex gap-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" />
                  {t('ariaStudio.editModeGuide.detailTwo')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white/95 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
              <button
                type="button"
                onClick={onComplete}
                className="px-1 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('ariaStudio.editModeGuide.later')}
              </button>
              <button
                type="button"
                onClick={onOpenPreview}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <FilePen className="h-4 w-4" aria-hidden="true" />
                {t('ariaStudio.editModeGuide.openIt')}
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditModeUnlockedGuide;
