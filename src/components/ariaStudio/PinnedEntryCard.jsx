import React, { useEffect, useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
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
  // STILL UNWIRED, deliberately. StudioChat is this card's only caller and passes no
  // onEdit, so the ✎ below never renders today.
  //
  // Hooking it to the Live Preview's inline manual editor (3c-i) isn't a matter of passing
  // a callback: that editor is rendered BY THE SHEET, in the slot the entry occupies, and
  // this card lives in the chat column where there is no such slot. Wiring it would mean
  // giving StudioChat its own editing state and its own copy of the editor host — a second
  // place that decides what "editing an entry" means, next to the pinned interview that is
  // already writing into the same entry. That belongs with the manual-vs-Aria choice in
  // 3c-ii, which has to answer the pinned-entry question anyway.
  onEdit,
  busy,
  messagePulse = 0,
  reviewHint = '',
  onReviewHintOpen,
  // Always starts collapsed; the user decides when this status summary opens.
  defaultExpanded = false,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultExpanded);
  const [interacting, setInteracting] = useState(false);
  const bulletTotal = bulletCount(entry);
  const toggleOpen = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next && reviewHint) onReviewHintOpen?.();
      return next;
    });
  };
  // This is a glanceable progress summary, not another form. Close it after a brief
  // idle window, but never while the user is hovering or keyboard-focused inside it.
  useEffect(() => {
    if (!open || interacting) return undefined;
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [open, interacting, entry?._sortId, bulletTotal]);
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
    if (key === 'entryType') return t(`ariaStudio.chat.experienceType.${entry.entryType}`);
    if (key === 'achievements')
      return bulletCount(entry)
        ? t('ariaStudio.pinnedEntry.addedCount', { n: bulletCount(entry) })
        : '';
    return entry[key] || '';
  };

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-slate-900 dark:border-l-white bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-sm"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
    >
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
      >
        <span
          role="status"
          title={t('ariaStudio.pinnedEntry.liveStatus')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]" />
          </span>
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
        {bulletTotal > 0 && (
          <span
            key={`saved-bullets-${messagePulse}`}
            role="status"
            className={`relative shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400 ${
              messagePulse > 0
                ? 'animate-[bounce_0.8s_ease-in-out_2] motion-reduce:animate-none'
                : ''
            }`}
            title={t('ariaStudio.pinnedEntry.savedBullets', { n: bulletTotal })}
          >
            {messagePulse > 0 && (
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/60 opacity-0 animate-[ping_0.9s_cubic-bezier(0,0,0.2,1)_1] motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            <MessageSquare className="relative z-10 w-3.5 h-3.5" aria-hidden="true" />
            <span className="relative z-10 font-mono text-[10px] font-bold tabular-nums">
              {bulletTotal}
            </span>
            <span className="sr-only">
              {t('ariaStudio.pinnedEntry.savedBullets', { n: bulletTotal })}
            </span>
          </span>
        )}
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {reviewHint && !open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            onReviewHintOpen?.();
          }}
          className="w-full border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 flex items-center justify-end gap-1.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          {reviewHint}
        </button>
      )}

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
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
                  className="text-[11px] font-semibold px-2 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  ✎ {t('ariaStudio.pinnedEntry.edit')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinnedEntryCard;
