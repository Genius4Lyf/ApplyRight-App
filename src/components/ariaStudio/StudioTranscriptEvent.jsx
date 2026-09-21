import React from 'react';
// `motion` is used through JSX; this ESLint setup does not detect that usage.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { bubbleAnim } from '../../lib/ariaMotion';

export const SelectedAnswerBubble = ({ children, eyebrow, reduce = false }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      data-transcript-kind="selection"
      className="self-end max-w-[92%] rounded-[28px] bg-[rgb(242,240,240)] text-[rgb(31,31,31)] dark:bg-slate-800 dark:text-slate-50 px-7 py-5"
      {...bubbleAnim('user', reduce)}
    >
      <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        {/* Defaults to the system wording, because most of these bubbles ARE a
            recorded interview answer. A caller that knows better — the requirement
            tap, where the user asked rather than answered — says so. */}
        {eyebrow || t('ariaStudio.chat.respondedToAriaInterview')}
      </span>
      {/* `break-words` so an unbroken 60-character string (a scraped title, a URL) wraps
          instead of forcing the bubble wider than the column. */}
      <span className="block whitespace-pre-wrap break-words text-[17px] leading-6">
        {children}
      </span>
    </motion.div>
  );
};

export const StudioReceipt = ({ title, detail, reduce = false }) => (
  <motion.div
    data-transcript-kind="receipt"
    className="self-start max-w-[92%] flex items-start gap-2 px-1 py-1"
    {...bubbleAnim('aria', reduce)}
    role="status"
  >
    {/* Sized to be READ, not just noticed. This is the receipt for work that just landed
        on the CV — the moment the interview pays off — and at 14/12 it was the smallest
        text in the thread, announcing the largest thing that had happened in it. */}
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    >
      ✓
    </span>
    <span className="min-w-0">
      <span className="block text-[16px] font-semibold leading-6 text-slate-800 dark:text-slate-100">
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      ) : null}
    </span>
  </motion.div>
);

export const StudioPhaseDivider = ({ children, reduce = false }) => (
  <motion.div
    data-transcript-kind="phase"
    className="my-2 flex w-full min-w-0 items-center gap-2 self-stretch px-1"
    {...bubbleAnim('aria', reduce)}
    role="separator"
  >
    <span className="h-px min-w-[8px] flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
    {/* TRUNCATES, and must. A divider is one line by definition, and a job title can run
        to eighty characters — left un-shrinkable it pushed the rules to zero width and
        then stretched the whole page sideways. `title` keeps the full text reachable. */}
    <span
      title={typeof children === 'string' ? children : undefined}
      className="min-w-0 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400"
    >
      ✓ {children}
    </span>
    <span className="h-px min-w-[8px] flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
  </motion.div>
);
