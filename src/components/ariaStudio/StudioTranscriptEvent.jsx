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
      className="self-end max-w-[92%] rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2.5 text-white dark:bg-white dark:text-slate-900"
      {...bubbleAnim('user', reduce)}
    >
      <span className="mb-0.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white/55 dark:text-slate-500">
        {t('ariaStudio.chat.respondedToAriaInterview')}
      </span>
      <span className="block whitespace-pre-wrap text-[13px] leading-relaxed">{children}</span>
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
      <span className="block text-[12.5px] font-semibold leading-5 text-slate-800 dark:text-slate-100">
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-[10.5px] leading-4 text-slate-500 dark:text-slate-400">
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
