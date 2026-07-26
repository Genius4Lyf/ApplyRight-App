import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { entryProgress, bulletCount } from '../../lib/studioFlow';

// The role being built, pinned to the top of the conversation.
//
// It exists because building a CV entry is a long exchange, and without it the thing you
// are actually working on scrolls away — you lose track of what's captured and what's
// still missing. Pinned, it stays a stable reference point while the chat moves under it.
//
// SOURCE OF TRUTH IS THE DRAFT ENTRY. Every value here is read from `entry` (looked up by
// _sortId in the parent) and never mirrored into local state — the only local state is
// whether the card is expanded. That's what makes it survive a refresh with the same
// contents, and what stops it drifting from the document it claims to describe.

// Per-section wording. The card is ONE component parameterised by section — forking it
// per section would mean three copies of the pin/counter/expand logic drifting apart.
// Keys, not text — resolved via t() at render so the runtime UI language decides.
const COPY = {
  experience: {
    labelKey: 'ariaStudio.pinnedEntry.copy.experience.label',
    blankKey: 'ariaStudio.pinnedEntry.copy.experience.blank',
    nextKey: 'ariaStudio.pinnedEntry.copy.experience.next',
    doneKey: 'ariaStudio.pinnedEntry.copy.experience.done',
  },
  project: {
    labelKey: 'ariaStudio.pinnedEntry.copy.project.label',
    blankKey: 'ariaStudio.pinnedEntry.copy.project.blank',
    nextKey: 'ariaStudio.pinnedEntry.copy.project.next',
    doneKey: 'ariaStudio.pinnedEntry.copy.project.done',
  },
  education: {
    labelKey: 'ariaStudio.pinnedEntry.copy.education.label',
    blankKey: 'ariaStudio.pinnedEntry.copy.education.blank',
    nextKey: 'ariaStudio.pinnedEntry.copy.education.next',
    doneKey: 'ariaStudio.pinnedEntry.copy.education.done',
  },
};

const PinnedEntryCard = ({
  entry,
  section = 'experience',
  typePicked,
  typeLabel,
  onNextRole,
  onDone,
  onEdit,
  busy,
  // Collapsed by default on small screens: expanded, this card plus the sticky header
  // would eat most of a 360px viewport before the conversation gets any.
  defaultExpanded = true,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultExpanded);
  if (!entry) return null;

  const copy = COPY[section] || COPY.experience;
  const { fields, done, total } = entryProgress(entry, section, { typePicked });
  const bullets = (entry.description || '')
    .split('\n')
    .map((l) => l.replace(/^[•\-*\s]+/, '').trim())
    .filter(Boolean);

  const heading =
    [entry.title || entry.degree, entry.company || entry.school].filter(Boolean).join(' · ') ||
    t(copy.blankKey);

  const dateValue = entry.startDate
    ? `${entry.startDate} – ${entry.isCurrent ? t('ariaStudio.pinnedEntry.present') : entry.endDate || '?'}`
    : '';

  const valueFor = (key) => {
    if (key === 'dates') return dateValue;
    if (key === 'type') return typeLabel || '';
    if (key === 'achievements')
      return bulletCount(entry)
        ? t('ariaStudio.pinnedEntry.addedCount', { n: bulletCount(entry) })
        : '';
    return entry[key] || '';
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-indigo-500 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t(copy.labelKey)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
          {heading}
        </span>
        <span
          className={`shrink-0 font-mono text-[11px] font-bold tabular-nums ${
            done === total
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {done}/{total}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <dl className="space-y-1.5">
            {fields.map((f) => {
              const value = valueFor(f.key);
              return (
                <div key={f.key} className="flex items-baseline gap-2 min-w-0">
                  <dt className="shrink-0 w-24 font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {t(f.labelKey)}
                  </dt>
                  <dd
                    className={`min-w-0 flex-1 truncate text-[12.5px] ${
                      f.done
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'italic text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {f.done && value
                      ? value
                      : f.optional
                        ? t('ariaStudio.pinnedEntry.optional')
                        : t('ariaStudio.pinnedEntry.notYet')}
                  </dd>
                </div>
              );
            })}
          </dl>

          {bullets.length > 0 && (
            <ul className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300"
                >
                  {/* A list glyph — decoration, not Aria and not an action. */}
                  <span className="shrink-0 text-slate-400 dark:text-slate-500">•</span>
                  <span className="min-w-0">{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNextRole}
              disabled={busy || done < total}
              title={done < total ? t('ariaStudio.pinnedEntry.finishFirst') : undefined}
              className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-40"
            >
              {busy === 'next' ? t('ariaStudio.pinnedEntry.saving') : t(copy.nextKey)}
            </button>
            <button
              type="button"
              onClick={onDone}
              disabled={busy}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {busy === 'done' ? t('ariaStudio.pinnedEntry.finishing') : t(copy.doneKey)}
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                className="text-[11px] font-semibold px-2 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                ✎ {t('ariaStudio.pinnedEntry.edit')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PinnedEntryCard;
