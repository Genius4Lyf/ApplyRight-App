import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
// `motion` is used only via <motion.*> in JSX; this eslint config lacks jsx-uses-vars so it
// reads as unused — the same false positive SectionCoach suppresses.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { PenLine, MessagesSquare } from 'lucide-react';
import { modalAnim, scrimAnim, pressable } from '../../lib/ariaMotion';

// BEFORE WE SPEND CREDITS ON A CALL THAT MAY NOT BE FINISHED.
//
// "Write my bullets from this call" is a one-way door: it charges per bullet and it wraps the
// interview up whether or not the interview was actually done. And the calls that reach this
// card are exactly the unfinished ones — the user hung up, the clock stopped, the connection
// went. Aria was usually mid-question.
//
// So there are two honest answers to "shall I write them now?", and this asks which:
//
//   WRITE THEM  — they know they said enough. Straight to the bullet count, as before.
//   ASK ARIA    — let her read the call back and say whether she has what she needs. She either
//                 asks the one thing that is missing (in chat, free) or says she is ready and
//                 the bullet picker opens anyway.
//
// The second is the reason this exists: it makes her aware of the call even though it is over,
// which is the difference between bullets written from a finished interview and bullets padded
// out of half of one.
const CallWrapUpConfirm = ({ open, busy, onWriteNow, onAskAria, onCancel }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const askRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    // "Ask Aria" takes focus: it is the cheaper of the two and the one that cannot waste
    // credits on an interview that turns out to be half-finished.
    askRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const choice =
    'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50';

  return createPortal(
    <motion.div
      {...scrimAnim}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
    >
      <motion.div
        {...modalAnim(reduce)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-wrapup-title"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto scrollbar-none rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="px-5 pt-5 pb-4 sm:px-6">
          <h3
            id="call-wrapup-title"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            {t('ariaStudio.ariaLive.wrapUp.title')}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ariaStudio.ariaLive.wrapUp.body')}
          </p>

          <div className="mt-4 space-y-2.5">
            <motion.button
              ref={askRef}
              type="button"
              onClick={onAskAria}
              disabled={busy}
              {...pressable(reduce)}
              className={`${choice} border-slate-900 dark:border-white`}
            >
              <MessagesSquare
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                  {t('ariaStudio.ariaLive.wrapUp.ask')}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
                  {t('ariaStudio.ariaLive.wrapUp.askHint')}
                </span>
              </span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onWriteNow}
              disabled={busy}
              {...pressable(reduce)}
              className={`${choice} border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500`}
            >
              <PenLine
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                  {t('ariaStudio.ariaLive.wrapUp.write')}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
                  {t('ariaStudio.ariaLive.wrapUp.writeHint')}
                </span>
              </span>
            </motion.button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {t('common.back')}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default CallWrapUpConfirm;
