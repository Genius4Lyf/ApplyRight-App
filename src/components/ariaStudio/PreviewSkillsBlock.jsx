import React, { useId, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';
import AriaOrbit from '../cv/AriaOrbit';
import { UNCATEGORIZED, skillCategoryLabel } from '../../lib/skillCategories';

// The Live Preview's SKILLS section, editable in place.
//
// Skills are the one list on the sheet with no _sortId: a skill is addressed by its NAME
// and nothing else. That single fact decides the whole shape of this component —
//
//   • no drag handles, no ↑/↓, no PreviewEntryRow: there is no id to reorder BY, so
//     reordering is out of scope rather than merely unimplemented;
//   • no focus-mode lock: Aria interviews ENTRIES, and a skill isn't one, so no pill can
//     ever be the active entry. Skills stay editable in edit mode, always;
//   • DELETE is a whole-array replace (replaceSkills) filtered by name, because position
//     is identity and the array is the only thing there is to address.
//
// Two writers, deliberately different:
//   DELETE → replaceSkills(next)  — whole-array replace. It owns the optimistic apply,
//            the rollback and the toast, so a failure is already handled by the time it
//            returns; there is nothing to re-handle here.
//   ADD    → applySkills([skill]) — MERGES and dedupes case-insensitively, returning
//            { ok, added }. `added: 0` means the skill was already on the CV.
//
// No recompute is fired from here. scoreSignature includes the skill NAMES, so adding or
// deleting one already moves the signature StudioChat's auto-rescore watches; calling
// runRecompute here as well would score the same change twice.
//
// SUGGEST WITH ARIA is the one thing here that is NOT a write, and it deliberately does
// not reach for the command channel either: the block's context use stays the skills
// WRITERS. It calls `onSuggestWithAria` and the PARENT requests the command and closes the
// sheet — the same split as "Edit with Aria", which PreviewEntryRow also only ever ASKS
// for and StudioLivePreview wires. Nothing is generated in the preview; the chat owns the
// phase, the consent and the charge.

// A skill is stored as EITHER a plain string OR { name, category } — both shapes are on
// real CVs (the builder writes objects; older drafts and some imports are strings), so
// every read goes through this rather than assuming one.
const nameOf = (skill) => (typeof skill === 'string' ? skill : skill?.name || '');
const categoryOf = (skill) =>
  (typeof skill === 'string' ? '' : skill?.category || '') || UNCATEGORIZED;
const lower = (s) => (s || '').trim().toLowerCase();

const pillBase =
  'group inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 pl-2 pr-1 py-0.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300';
// The same reveal PreviewEntryRow uses: hidden until hover/focus on a device that HAS
// hover, permanently visible on touch (where there is no hover to reveal it with).
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';
const field =
  'min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';

// `readOnly` is the parent's completeness lock: an incomplete BUILD session shows its
// document but hands out no affordances. The pills and their category labels still
// render — only the × on each, the add form and the Aria button go.
const PreviewSkillsBlock = ({ onSuggestWithAria, readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, replaceSkills, applySkills } = useAriaStudio();
  const skills = useMemo(() => cvData?.skills || [], [cvData?.skills]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: '' });
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  // The datalist has to be addressed by id, and this component can be mounted more than
  // once on a page (the desktop panel + the mobile sheet), so the id can't be a constant.
  const listId = `${useId()}-skill-categories`;

  // GROUPED, in the document's own order: categories appear in the order their first
  // skill does, and skills keep their order within a category. A Map preserves insertion
  // order; a plain object would too for string keys, but only by accident of the spec.
  const groups = useMemo(() => {
    const byCategory = new Map();
    skills.forEach((skill) => {
      const name = nameOf(skill);
      if (!name) return;
      const category = categoryOf(skill);
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({ skill, name });
    });
    return [...byCategory.entries()];
  }, [skills]);

  // The categories ALREADY on this CV, offered as a datalist so the user reuses one
  // instead of coining a near-duplicate ("Backend" vs "backend").
  //
  // 'Uncategorized' is deliberately NOT offered: it is the STORED fallback for a blank
  // field, and its on-screen label is localized. Listing the localized label would let a
  // French user store the category "Non classé", which no other surface groups by.
  const knownCategories = useMemo(() => {
    const seen = new Set();
    const out = [];
    groups.forEach(([category]) => {
      if (category === UNCATEGORIZED) return;
      const key = lower(category);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(category);
    });
    return out;
  }, [groups]);

  const closeAdd = () => {
    setAdding(false);
    setForm({ name: '', category: '' });
  };

  const openAdd = () => {
    setAdding(true);
    // The affordance the user clicked is replaced by the form, so focus would otherwise
    // fall back to <body>. requestAnimationFrame: the input doesn't exist yet this tick.
    window.requestAnimationFrame?.(() => nameRef.current?.focus());
  };

  // Matched on NAME, case-insensitively — the same identity applySkills dedupes by, so
  // "React" can't be deleted while "react" survives. Every OTHER skill is passed through
  // untouched (object or string, category and all): this is a whole-array replace, and
  // normalising the survivors here would silently rewrite the rest of the section.
  const remove = async (skill) => {
    if (busy) return;
    const target = lower(nameOf(skill));
    setBusy(true);
    // replaceSkills rolls back and toasts on failure — there is nothing to add to that.
    await replaceSkills?.(skills.filter((s) => lower(nameOf(s)) !== target));
    setBusy(false);
  };

  const submit = async () => {
    if (busy) return;
    const name = form.name.trim();
    if (!name) return;
    // Blank category → the STORED fallback, so a skill added without one lands in the
    // same bucket the builder and the picker use rather than a fourth spelling of "none".
    const category = form.category.trim() || UNCATEGORIZED;
    setBusy(true);
    const result = await applySkills?.([{ name, category }]);
    setBusy(false);
    // A DUPE is a quiet no-op. applySkills dedupes by name, so `added: 0` means the skill
    // is already on the CV — the user's intent is satisfied and a toast would scold them
    // for it. Clear the field and stay open; the section behind the form already shows
    // the pill they were asking for.
    //
    // A FAILED save is the opposite: applySkills has rolled back and toasted, so the text
    // stays put to retry with rather than being thrown away.
    if (result?.ok === false) return;
    setForm({ name: '', category: '' });
    // Stays OPEN after a success — skills arrive in handfuls, and reopening the form for
    // each one would cost a click per skill. Escape / Cancel is the way out.
    nameRef.current?.focus();
  };

  // Escape closes from either field, stopped from bubbling so it doesn't also close the
  // sheet this preview lives in. Enter commits — both fields are single-line, and a
  // category typed but never submitted is the likeliest way to lose one.
  const keyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeAdd();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submit();
  };

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // A CV needs at least one skill, so the last pill's × is disabled with the reason rather
  // than removed — same "show why it's blocked" rule the required entry rows follow. Skills
  // carry no _sortId, so "the last one" is simply a length check on the whole array.
  const isLastSkill = skills.length <= 1;
  const removeSkillLabel = isLastSkill
    ? t('ariaStudio.livePreview.cannotEmptySkills')
    : t('ariaStudio.livePreview.removeSkill');

  return (
    <div className="space-y-2.5">
      {groups.length ? (
        groups.map(([category, items]) => (
          <div key={category}>
            {/* The same mono micro-label the other sub-headings on the sheet use
                (certifications), so a category reads as part of the document rather
                than as a control. */}
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {skillCategoryLabel(category, t)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {items.map(({ skill, name }) => (
                <span key={`${category}-${name}`} className={pillBase}>
                  {name}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => remove(skill)}
                      disabled={busy || isLastSkill}
                      aria-label={removeSkillLabel}
                      title={removeSkillLabel}
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 transition-[opacity,color,background-color] hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${revealOnHover}`}
                    >
                      <X className="h-2.5 w-2.5" aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
          {t('ariaStudio.livePreview.noSkillsYet')}
        </p>
      )}

      {readOnly ? null : adding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={set('name')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.skillNamePlaceholder')}
            placeholder={t('ariaStudio.livePreview.skillNamePlaceholder')}
            className={`${field} basis-[8rem]`}
          />
          {/* A text input WITH a datalist, not a <select>: the categories on a CV are
              free-form (Aria generates them, the user invents them), so the field has to
              accept a new one while still offering the ones already in use. */}
          <input
            type="text"
            list={listId}
            value={form.category}
            onChange={set('category')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.skillCategoryPlaceholder')}
            placeholder={t('ariaStudio.livePreview.skillCategoryPlaceholder')}
            className={`${field} basis-[8rem]`}
          />
          <datalist id={listId}>
            {knownCategories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !form.name.trim()}
            className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {t('ariaStudio.jobCapture.add')}
          </button>
          <button
            type="button"
            onClick={closeAdd}
            disabled={busy}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t('ariaStudio.livePreview.addSkill')}
          </button>
          {/* Beside "Add skill", not instead of it: typing your own is free and instant,
              Aria's suggestions are a paid round-trip, and the cheap option stays first.
              Rendered only when the parent wired a handler — the preview mounts in tests
              and stories without the command channel, and an affordance that silently
              does nothing is worse than one that isn't there. */}
          {onSuggestWithAria && (
            <button
              type="button"
              onClick={onSuggestWithAria}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
            >
              <AriaOrbit size={11} tone="mono" className="shrink-0" />
              {t('ariaStudio.livePreview.suggestSkillsWithAria')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewSkillsBlock;
