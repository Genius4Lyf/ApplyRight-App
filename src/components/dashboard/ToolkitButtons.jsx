import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaLoader from '../ui/AriaLoader';
import { Eye } from 'lucide-react';

// Shared toolkit primitives so the generated-artifact rows look identical
// wherever they appear (the Studio's prep results, and any future artifact list).

// Emerald "Ready" status chip (dot + label).
export const ReadyChip = () => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t('dashboard.toolkit.ready')}
    </span>
  );
};

// Ghost / secondary action (View). Compact, hairline, right-aligned.
export const GhostButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
  >
    <Eye className="w-4 h-4" /> {children}
  </button>
);

// Ink / primary action (Generate). The cost rides along as a quiet mono badge;
// the generating state swaps to a muted disabled pill with a spinner.
export const InkButton = ({ onClick, disabled, generating, cost, freeLabel = null }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
      }`}
    >
      {generating ? (
        <>
          <AriaLoader inline tone="mono" size={14} label="" />
          {t('dashboard.toolkit.generating')}
        </>
      ) : (
        <>
          {t('dashboard.toolkit.generate')}
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 dark:bg-slate-900/10">
            {freeLabel || t('cvBuilder.common.creditChip', { n: cost })}
          </span>
        </>
      )}
    </button>
  );
};
