import React, { useRef, useState } from 'react';
import { PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';

// The Live Preview's CONTACT HEADER, editable in place.
//
// personalInfo is a SUBDOC, not a list, and that one fact decides this component's shape
// the way "a skill has no _sortId" decides PreviewSkillsBlock's:
//
//   • no list, no drag, no ↑/↓, no PreviewEntryRow: there is one header and nothing to
//     order it against;
//   • "one editor at a time" needs no lifting to the parent (as `editingSortId` does for
//     the three entry lists) — a single boolean here IS the whole invariant;
//   • no focus-mode lock: Aria interviews ENTRIES, and the header isn't one, so it can
//     never be the active entry and stays editable in edit mode, always.
//
// NO AI, and no second route out. Unlike the summary and skills blocks there is no
// "draft with Aria" beside the ✎: a name and a phone number are FACTS the user already
// knows, so there is nothing for a model to generate and no credit to spend. The manual
// editor is the only path, which is why this component takes no callback props at all.
//
// THE FIELDS ARE THE WHOLE POINT of the write shape. This edits six of them —
// fullName, email, phone, linkedin, website, address — and deliberately NOT photoUrl
// (which has its own uploader on ContactConfirmCard, with its own resize/compress) or
// nationality (out of scope). Save DIFFS the form against what it seeded from and sends
// only what CHANGED, so updatePersonalInfo's dot-notation $set touches exactly those
// paths and every field this form doesn't offer survives untouched. Sending the whole
// subdoc would silently clobber the photo the user uploaded one card earlier.
//
// The copy is SHARED with ContactConfirmCard — the same
// ariaStudio.contactConfirm.fields.* labels and placeholders — so the build flow's
// capture and the preview's edit can't drift into naming the same field two things.
//
// No recompute is fired from here. Contact isn't a scored section's prose, and the
// scoreSignature StudioChat's auto-rescore watches already covers what is.

// The FIELD ORDER on the form, and the source of truth for what this editor touches.
// Same keys, same order as ContactConfirmCard's FIELDS — a reader comparing the two
// surfaces should find one list, not two that happen to agree.
const FIELDS = ['fullName', 'email', 'phone', 'linkedin', 'website', 'address'];

// The same reveal PreviewEntryRow, the skills pills and the summary block use: hidden
// until hover/focus on a device that HAS hover, permanently visible on touch (where
// there is no hover to reveal it with).
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';
const quietButton =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-[opacity,color,border-color] hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100';
const field =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';

// `readOnly` is the parent's completeness lock: an incomplete BUILD session shows its
// document but hands out no affordances. The name and the joined contact line still
// render — only the ✎ that opens the form goes.
const PreviewContactBlock = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, updatePersonalInfo } = useAriaStudio();
  const info = cvData?.personalInfo || {};

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  // What the form was SEEDED with — the baseline Save diffs against. A ref, not state:
  // it's never rendered, and it must not change identity mid-edit.
  const seedRef = useRef({});
  const firstFieldRef = useRef(null);

  const contactLine = [info.email, info.phone, info.address, info.linkedin, info.website]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join('  ·  ');

  // SEEDED ONCE, at the moment the editor opens — never from a render. cvData re-renders
  // constantly here (an Aria turn, an autosave, an externalEditNonce bump), and re-seeding
  // on any of those would wipe half-typed text mid-word.
  const openEdit = () => {
    const seed = {};
    FIELDS.forEach((key) => {
      seed[key] = info[key] || '';
    });
    seedRef.current = seed;
    setForm(seed);
    setEditing(true);
    // The ✎ that opened this is replaced by the form, so focus would otherwise fall back
    // to <body>. requestAnimationFrame: the input doesn't exist yet this tick.
    window.requestAnimationFrame?.(() => firstFieldRef.current?.focus());
  };

  const closeEdit = () => {
    setEditing(false);
    setForm({});
    seedRef.current = {};
  };

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (saving) return;
    // THE DIFF. Only fields whose trimmed value differs from the seed go into the patch,
    // so an untouched field is absent from the payload rather than written back — which
    // is what keeps the dot-notation $set as narrow as it claims to be.
    const patch = {};
    FIELDS.forEach((key) => {
      const next = (form[key] || '').trim();
      if (next !== (seedRef.current[key] || '').trim()) patch[key] = next;
    });
    // Nothing changed — close without spending a write. Opening the editor and thinking
    // better of it is not an edit.
    if (!Object.keys(patch).length) {
      closeEdit();
      return;
    }
    setSaving(true);
    let result;
    try {
      result = await updatePersonalInfo?.(patch);
    } catch {
      // updatePersonalInfo already catches its own save failures, so this is
      // belt-and-braces: an unexpected throw must not close the form and take the
      // user's typing with it.
      result = { ok: false };
    }
    setSaving(false);
    // On failure the writer has already rolled personalInfo back and toasted. Staying
    // open keeps the typed values on screen to retry with — closing would throw them
    // away and the header would silently show the old details as though nothing had
    // been typed.
    if (result?.ok) closeEdit();
  };

  // Escape discards and closes, stopped from bubbling so it doesn't also close the sheet
  // this preview lives in. Enter submits: every field here is a single line, so there is
  // no newline for it to mean instead (the summary's textarea is the opposite case).
  const keyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeEdit();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    save();
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FIELDS.map((key, index) => (
            <div key={key} className="min-w-0">
              {/* Labelled by the FIELD name, placeholdered by the example — the same
                  split ContactConfirmCard uses, so a screen reader hears "Email"
                  rather than "you@example.com". */}
              <label
                htmlFor={`studio-preview-contact-${key}`}
                className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400"
              >
                {t(`ariaStudio.contactConfirm.fields.${key}.label`)}
              </label>
              <input
                ref={index === 0 ? firstFieldRef : undefined}
                id={`studio-preview-contact-${key}`}
                type="text"
                value={form[key] || ''}
                onChange={set(key)}
                onKeyDown={keyDown}
                disabled={saving}
                placeholder={t(`ariaStudio.contactConfirm.fields.${key}.placeholder`)}
                className={`${field} mt-0.5`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            onKeyDown={keyDown}
            disabled={saving}
            className="btn-primary px-3 py-1 text-[11px] disabled:opacity-50"
          >
            {t('ariaStudio.livePreview.saveEdit')}
          </button>
          <button
            type="button"
            onClick={closeEdit}
            onKeyDown={keyDown}
            disabled={saving}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-1.5 py-1 rounded transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center gap-3">
        {/* Rendered, never EDITED here: the photo has its own uploader on
            ContactConfirmCard, and the dot-notation write is what guarantees this form
            can't quietly drop it. */}
        {info.photoUrl && (
          <img
            src={info.photoUrl}
            alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
            className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
          />
        )}
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
            {(info.fullName || '').trim() || t('ariaStudio.livePreview.yourName')}
          </p>
          {contactLine && (
            <p className="mt-1 break-words text-[12px] text-slate-500 dark:text-slate-400">
              {contactLine}
            </p>
          )}
        </div>
      </div>
      {!readOnly && (
        <div className="mt-1.5">
          <button type="button" onClick={openEdit} className={`${quietButton} ${revealOnHover}`}>
            <PencilLine className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t('ariaStudio.livePreview.editEntry')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PreviewContactBlock;
