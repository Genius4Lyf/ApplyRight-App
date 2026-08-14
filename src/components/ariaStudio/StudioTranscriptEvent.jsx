import React from 'react';
// `motion` is used through JSX; this ESLint setup does not detect that usage.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { bubbleAnim } from '../../lib/ariaMotion';

export const SelectedAnswerBubble = ({ children, reduce = false }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      data-transcript-kind="selection"
      className="self-end max-w-[92%] rounded-[28px] bg-[rgb(242,240,240)] text-[rgb(31,31,31)] dark:bg-slate-800 dark:text-slate-50 px-7 py-5"
      {...bubbleAnim('user', reduce)}
    >
      <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        {t('ariaStudio.chat.respondedToAriaInterview')}
      </span>
      <span className="block whitespace-pre-wrap text-[17px] leading-6">{children}</span>
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
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    >
      ✓
    </span>
    <span className="min-w-0">
      <span className="block text-[14px] font-semibold leading-5 text-slate-800 dark:text-slate-100">
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-[12px] leading-4 text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      ) : null}
    </span>
  </motion.div>
);

export const StudioPhaseDivider = ({ children, reduce = false }) => (
  <motion.div
    data-transcript-kind="phase"
    className="self-stretch my-2 flex items-center gap-2 px-1"
    {...bubbleAnim('aria', reduce)}
    role="separator"
  >
    <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
    <span className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
      ✓ {children}
    </span>
    <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
  </motion.div>
);
