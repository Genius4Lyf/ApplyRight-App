import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Which role (or project) are we sharpening? Work history and projects are fixed
// per-ENTRY — "your experience is weak" isn't actionable, "this role never mentions
// pressure testing" is.
//
// Each row surfaces how many of the section's missing keywords that entry is silent
// on, so the worst offender is obvious without the user reading six job descriptions.
const EntryPickerCard = ({ entries = [], missingKeywords = [], onPick, onCancel }) => {
  const { t } = useTranslation();
  // Which of the section's missing keywords this entry doesn't mention. Plain substring
  // matching on purpose: the authoritative coverage already ran server-side during the
  // scan — this is a hint for ordering, not a second scoring system.
  const gapsFor = (entry) => {
    const text = [entry.title, entry.company, entry.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return missingKeywords.filter((k) => !text.includes(String(k).toLowerCase()));
  };

  const ranked = entries
    .map((e) => ({ entry: e, gaps: gapsFor(e) }))
    .sort((a, b) => b.gaps.length - a.gaps.length);

  return (
    <AriaCard cardKey="entrypicker">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.entryPicker.whichOne')}
        </p>

        {ranked.length === 0 && (
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ariaStudio.entryPicker.nothingHere')}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollbar-none">
          {ranked.map(({ entry, gaps }) => (
            <button
              key={entry.sortId || entry.title}
              type="button"
              onClick={() => onPick?.(entry)}
              className="text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white bg-white dark:bg-slate-900 px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
            >
              <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                {entry.title || t('ariaStudio.entryPicker.untitled')}
              </span>
              {entry.company && (
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {entry.company}
                </span>
              )}
              {gaps.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {gaps.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    >
                      {t('ariaStudio.entryPicker.noKeyword', { keyword: k })}
                    </span>
                  ))}
                  {gaps.length > 3 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 text-slate-400 dark:text-slate-500">
                      +{gaps.length - 3}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default EntryPickerCard;
