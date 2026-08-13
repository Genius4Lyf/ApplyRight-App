import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import { builderStepUrl, isDismissable, rankEntriesByGap } from '../../lib/studioFlow';

// Which role (or project) are we sharpening? Work history and projects are fixed
// per-ENTRY — "your experience is weak" isn't actionable, "this role never mentions
// pressure testing" is.
//
// Each row surfaces how many of the section's missing keywords that entry is silent
// on, so the worst offender is obvious without the user reading six job descriptions.
// `draftId` and `section` exist for the EMPTY case only: a picker with nothing to pick
// used to name a destination ("add an entry in the CV builder") and give no way to reach
// it — a dead end, on the one screen where the user is most stuck.
const EntryPickerCard = ({
  entries = [],
  missingKeywords = [],
  section,
  draftId,
  onPick,
  onCancel,
  onDismissSection,
  busy,
}) => {
  const { t } = useTranslation();
  // Worst-first, by how many of the section's missing keywords each entry is silent on.
  // The TESTED export owns that rule — this card used to carry its own identical copy,
  // which is exactly the kind of duplicate that drifts the day the ranking changes.
  // (The helper also reshapes each entry to { sortId, title, company, description };
  // for the already-shaped list this card receives that's a no-op, `sortId` falling
  // through unchanged since there's no `_sortId` on it.)
  const ranked = rankEntriesByGap(entries, missingKeywords);

  const builderUrl = builderStepUrl(draftId, section);
  const canDismiss = !!onDismissSection && isDismissable(section);

  return (
    <AriaCard cardKey="entrypicker">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.entryPicker.whichOne')}
        </p>

        {ranked.length === 0 && (
          <div className="mt-3">
            <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.entryPicker.nothingHere')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Same treatment as SectionGuidanceCard's CTA — a NEW TAB, so the Studio
                  session and everything in it survives the trip to the builder. */}
              {builderUrl && (
                <a
                  href={builderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
                >
                  {t('ariaStudio.entryPicker.openBuilder')} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {/* The other honest answer to an empty Projects list: not everyone has side
                  projects, and this empty state is exactly where such a user lands. */}
              {canDismiss && (
                <button
                  type="button"
                  onClick={() => onDismissSection(section)}
                  disabled={busy}
                  className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('ariaStudio.sectionBreakdown.notApplicable')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollbar-none">
          {ranked.map(({ entry, gaps }, i) => (
            <button
              // An untitled entry has neither a _sortId nor a title to key on; the index
              // is the only thing left that stays unique across the list.
              key={entry.sortId || entry.title || i}
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
