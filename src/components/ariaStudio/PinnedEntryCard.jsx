import React, { useEffect, useRef, useState } from 'react';

import { ChevronDown, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { entryProgress, bulletCount, sectionIcon } from '../../lib/studioFlow';

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

// The card's paper. The header and the body that drops out of it are two separate boxes
// (see the render), so the border/background/shadow that make them read as one sheet are
// written once here rather than typed twice and left to drift apart.
const CARD_CHROME =
  'border border-slate-200 dark:border-slate-800 border-l-2 border-l-slate-900 dark:border-l-white bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-md dark:shadow-black/20';

// ─── Which captured fields can be corrected in place ───
//
// A WHITELIST, not "everything the row can render". The interview asks one question at a
// time and mishearing one of them is ordinary — the company typed into the role title —
// but until now the only way back was to finish the CV and unlock the Live Preview.
//
// Only the SCALAR capture fields are here. The three deliberate omissions:
//   entryType / type — chip-picked, and the pick also drives what Aria asks next; a free
//     text box would let a value in that no prompt knows how to interpret.
//   achievements     — a bullet LIST, generated and applied through applyRoleBulletDiff.
//     A single-line input is the wrong instrument, and the coach already owns them.
const EDITABLE_TEXT_FIELDS = [
  'title',
  'company',
  'degree',
  'school',
  'graduationDate',
  'link',
  'cgpa',
];
// Everything except link/cgpa identifies the entry, so clearing one would leave the CV
// holding a nameless row. A link or a CGPA is genuinely optional and may be emptied.
const REQUIRED_TEXT_FIELDS = ['title', 'company', 'degree', 'school', 'graduationDate'];
const isEditableField = (key) => key === 'dates' || EDITABLE_TEXT_FIELDS.includes(key);

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
  // CORRECT one captured field in place. Takes the SAME narrow patch the interview's own
  // capture sends — { title } or { startDate, endDate, isCurrent } — and returns { ok }.
  // The caller (StudioChat → applyEntryEdit) owns the optimistic write, the narrow
  // { _id, <list> } save, and the rollback + toast if it fails; this card only decides
  // WHICH key changed and what it becomes. Absent → no ✎ renders, as before.
  onFieldSave,
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
  // WHICH field is being corrected, or null. One at a time — an inline editor is a
  // correction, not a form, and two open at once invites a half-typed second edit being
  // abandoned by saving the first.
  const [editingKey, setEditingKey] = useState(null);
  // The open editor's working copy. Seeded from the entry when the ✎ is tapped and thrown
  // away on cancel, so nothing here can drift from the draft while it's closed.
  const [draft, setDraft] = useState({ text: '', start: '', end: '', isCurrent: false });
  const [saving, setSaving] = useState(false);
  // The opened editor's first input, so the caret lands where the correction is typed
  // instead of leaving the user to hunt for a box that appeared mid-card.
  const editorInputRef = useRef(null);
  const bulletTotal = bulletCount(entry);
  // Scrolling the achievements list is real engagement, but on touch it fires neither
  // mouseenter nor focus — so `interacting` stays false and the idle timer below would
  // shut the card mid-scroll. Re-arm that timer on activity instead of pinning
  // `interacting` true: touch has no matching "leave" event, so pinning it would wedge
  // the card open for good.
  const [activity, setActivity] = useState(0);
  const lastBump = useRef(0);
  const bumpActivity = () => {
    // Scroll fires continuously; re-arming twice a second is enough.
    const now = performance.now();
    if (now - lastBump.current < 500) return;
    lastBump.current = now;
    setActivity((n) => n + 1);
  };

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
  }, [open, interacting, entry?._sortId, bulletTotal, activity]);
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

  // A field is correctable only when it is a whitelisted scalar, it has ALREADY been
  // captured (f.done), and the parent gave us somewhere to write. Offering ✎ on a field
  // the interview hasn't reached yet would put two ways to answer the same question on
  // screen at once — the capture card is already asking it.
  const canEdit = (f) => !!onFieldSave && !!f.done && isEditableField(f.key);

  const startEditing = (f) => {
    setEditingKey(f.key);
    // Seed from the ENTRY, not from whatever the last editor held: the point of the ✎ is
    // to correct what is actually saved, so the input has to open on that.
    setDraft({
      text: f.key === 'dates' ? '' : entry[f.key] || '',
      start: entry.startDate || '',
      end: entry.endDate || '',
      isCurrent: !!entry.isCurrent,
    });
    // requestAnimationFrame: the input doesn't exist yet this tick. Optional-called so
    // jsdom without rAF still opens the editor, it just doesn't move focus.
    window.requestAnimationFrame?.(() => editorInputRef.current?.focus());
  };

  // Escape and Cancel are the same act — close and write NOTHING. No patch, no save, no
  // rollback to reason about.
  const cancelEditing = () => setEditingKey(null);

  const textEditValid = (key) => !REQUIRED_TEXT_FIELDS.includes(key) || !!draft.text.trim();
  const datesEditValid = !!draft.start.trim();

  // ONE narrow patch per save — exactly the shape applyEntryEdit expects, and never more
  // keys than the field the user opened. `dates` is the one field that is three keys on
  // the entry, so it sends all three together: an end date left behind by a role that is
  // now current would render as "2021 – Present" on a document that also stores 2024.
  const submitEdit = async (f) => {
    if (saving) return;
    const patch =
      f.key === 'dates'
        ? {
            startDate: draft.start.trim(),
            endDate: draft.isCurrent ? '' : draft.end.trim(),
            isCurrent: draft.isCurrent,
          }
        : { [f.key]: draft.text.trim() };
    setSaving(true);
    try {
      const res = await onFieldSave?.(patch);
      // A failed save has ALREADY been rolled back and toasted by the writer, so the
      // editor deliberately stays open — closing it would throw away what the user typed
      // and leave them re-typing a correction that never landed. `undefined` counts as
      // success for a caller that doesn't report one.
      if (res === undefined || res === true || res?.ok) setEditingKey(null);
    } finally {
      setSaving(false);
    }
  };

  // The quiet control shared by every editable row. Small and grey until hovered — a
  // correction affordance, not a call to action competing with Aria's question.
  const editButton = (f) => (
    <button
      type="button"
      onClick={() => startEditing(f)}
      aria-label={t('ariaStudio.pinnedEntry.editField', { field: t(f.labelKey) })}
      className="shrink-0 text-[12px] leading-none px-1 py-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      ✎
    </button>
  );

  const editorActions = (f, valid) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => submitEdit(f)}
        disabled={saving || !valid}
        className="btn-primary px-2.5 py-1 text-[12px] disabled:opacity-40"
      >
        {saving ? t('ariaStudio.pinnedEntry.saving') : t('ariaStudio.pinnedEntry.saveField')}
      </button>
      <button
        type="button"
        onClick={cancelEditing}
        disabled={saving}
        className="text-[12px] font-semibold px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
      >
        {t('common.cancel')}
      </button>
    </div>
  );

  // Enter saves, Escape abandons — the same two keys the capture card the value came from
  // already answers to, so correcting a field feels like re-answering the question.
  const onEditorKeyDown = (f, valid) => (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (valid) submitEdit(f);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    // Only the HEADER occupies space in the transcript; the body hangs off it absolutely.
    // This is what makes opening the card a dropdown rather than a reflow — an in-flow
    // body grows the scroller's content by its full height and shoves the whole
    // conversation down the moment you tap the chevron.
    //
    // The interaction handlers live out here, on the wrapper, precisely because the body
    // is no longer a descendant of the bordered header: hung off the header instead, a
    // pointer moving from header into body would read as leaving the card and let the
    // idle timer close it mid-read.
    <div
      className="relative"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onTouchStart={bumpActivity}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
    >
      <div
        className={`rounded-xl ${CARD_CHROME} ${
          // Square off where the body meets it, so the two boxes read as one sheet.
          open ? 'rounded-b-none' : ''
        }`}
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
            <span aria-hidden="true">{sectionIcon(section)}</span> <span>{t(copy.labelKey)}</span>
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800 dark:text-slate-100">
            {heading}
          </span>
          <span
            className={`shrink-0 font-mono text-[12px] font-bold tabular-nums ${
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
      </div>

      {/* `top-full` pins it to the header's bottom edge; `left/right-0` span the wrapper,
          which is the header's border box, so the two line up exactly. The header's own
          bottom border is the divider between them — hence `border-t-0` here, or the
          seam would be a double hairline. */}
      <div
        className={`absolute left-0 right-0 top-full z-10 grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className={`overflow-hidden rounded-b-xl ${CARD_CHROME} border-t-0`}>
          <div className="px-3 pb-3 pt-2.5">
            <dl className="space-y-1.5">
              {fields.map((f) => {
                const value = valueFor(f.key);
                const editing = editingKey === f.key;
                return (
                  <div key={f.key} className="flex items-baseline gap-2 min-w-0">
                    <dt className="shrink-0 w-24 font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {t(f.labelKey)}
                    </dt>
                    {/* The dates editor is three controls, so the row it replaces stops
                        being a single-line value. Everything else keeps the read-only
                        <dd> exactly as it was, with the ✎ trailing the value. */}
                    {editing && f.key === 'dates' ? (
                      <dd className="min-w-0 flex-1 space-y-1.5">
                        <label className="block">
                          <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {t('ariaStudio.roleCapture.started')}
                          </span>
                          <input
                            type="text"
                            value={draft.start}
                            ref={editorInputRef}
                            onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                            onKeyDown={onEditorKeyDown(f, datesEditValid)}
                            placeholder={t('ariaStudio.roleCapture.startedPlaceholder')}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[16px] text-slate-900 dark:text-slate-100"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-[14px] text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={draft.isCurrent}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, isCurrent: e.target.checked }))
                            }
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                          {t('ariaStudio.roleCapture.stillWorkHere')}
                        </label>
                        {/* Hidden rather than disabled while current: there is no end
                            date to correct on a role that hasn't ended. */}
                        {!draft.isCurrent && (
                          <label className="block">
                            <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              {t('ariaStudio.roleCapture.ended')}
                            </span>
                            <input
                              type="text"
                              value={draft.end}
                              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                              onKeyDown={onEditorKeyDown(f, datesEditValid)}
                              placeholder={t('ariaStudio.roleCapture.endedPlaceholder')}
                              className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[16px] text-slate-900 dark:text-slate-100"
                            />
                          </label>
                        )}
                        {editorActions(f, datesEditValid)}
                      </dd>
                    ) : editing ? (
                      <dd className="min-w-0 flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={draft.text}
                          ref={editorInputRef}
                          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                          onKeyDown={onEditorKeyDown(f, textEditValid(f.key))}
                          aria-label={t('ariaStudio.pinnedEntry.editField', {
                            field: t(f.labelKey),
                          })}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[16px] text-slate-900 dark:text-slate-100"
                        />
                        {editorActions(f, textEditValid(f.key))}
                      </dd>
                    ) : (
                      <>
                        <dd
                          className={`min-w-0 flex-1 truncate text-[16px] ${
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
                        {canEdit(f) && editButton(f)}
                      </>
                    )}
                  </div>
                );
              })}
            </dl>

            {/* Capped and scrollable, because a role can collect a dozen achievements and
                this card is sticky — an unbounded list pushes "Next role" and "Done" off
                the viewport with no way to scroll down to them. The fields above and the
                actions below stay in flow; only the bullets move. */}
            {bullets.length > 0 && (
              <div
                role="group"
                // A scroll container unreachable by keyboard is a WCAG 2.1.1 failure —
                // it has to take focus for arrows/PageDown to move it.
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                tabIndex={0}
                aria-label={t('ariaStudio.pinnedEntry.achievementsList')}
                onScroll={bumpActivity}
                className="custom-scrollbar mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 max-h-[min(34vh,260px)] overflow-y-auto overscroll-contain rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600"
              >
                <ul className="space-y-1">
                  {bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex gap-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                      {/* A list glyph — decoration, not Aria and not an action. */}
                      <span className="shrink-0 text-slate-400 dark:text-slate-500">•</span>
                      <span className="min-w-0">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onNextRole}
                disabled={busy || done < total}
                title={done < total ? t('ariaStudio.pinnedEntry.finishFirst') : undefined}
                className="btn-primary px-3.5 py-1.5 text-[14px] disabled:opacity-40"
              >
                {busy === 'next' ? t('ariaStudio.pinnedEntry.saving') : t(copy.nextKey)}
              </button>
              <button
                type="button"
                onClick={onDone}
                disabled={busy}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {busy === 'done' ? t('ariaStudio.pinnedEntry.finishing') : t(copy.doneKey)}
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={busy}
                  className="text-[12px] font-semibold px-2 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white transition-colors disabled:opacity-50"
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
