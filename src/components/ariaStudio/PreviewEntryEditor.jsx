import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAriaStudio } from '../../context/AriaStudioContext';

// Edit one Live Preview entry MANUALLY, in place on the sheet.
//
// It renders in the slot the read-only entry occupied — same SectionBlock, same list — so
// the document doesn't reflow into a modal to change one word. NOT a dialog and NOT
// contenteditable: real <input>/<textarea> controls, in a small card with a header strip,
// named fields and a divided footer, so a form sitting inside a 680px document sheet still
// reads as a form rather than as four grey boxes. contenteditable would fight the bullets,
// which are newline TEXT in `description` rather than DOM list items.
//
// It edits ONLY what the preview shows, with two exceptions carried in explicitly: a
// project's link and an education entry's CGPA are both optional, not rendered on the
// read-only row, but genuinely useful to fix without reopening the whole build flow. A
// field still absent here (entry type, the project kind) isn't silently missing — it's
// simply not this surface's business, and a patch that never mentions it can't clobber it.
//
// ONE WRITE PATH: applyEntryEdit(section, sortId, patch), with a patch of the CHANGED
// fields only. That function owns the optimistic apply, the narrow single-key save and the
// rollback + toast on failure, so there is nothing to catch here beyond "did it land".
// No recompute is triggered — auto-recompute after an edit is a later slice; the score
// refreshes on the next re-score.
//
// ⚠ `section` is the SECTION_LIST vocabulary, where projects is SINGULAR: 'experience' |
// 'project' | 'education'. The caller threads the same token its reorder/delete already
// use; 'projects' would resolve to no list key and the edit would land nowhere.
//
// ⚠ onClose is called with { saved, patch } after a save that LANDED, and with nothing
// when the editor is dismissed. The parent prunes an abandoned blank row on close, and it
// reads cvData from its own render closure — which, one synchronous tick after the save,
// still holds this entry as it was BEFORE the patch. Telling it what landed is what stops
// it pruning the row the user just filled in. See the comment in `save` below.

// Per-section shape. The preview renders different things per section, so the editor
// offers exactly those and nothing else. Every label is an EXISTING key — the same ones
// the interview asks its questions under, so a field is called the same thing whether
// Aria asked for it or the user typed it here.
const SECTION_FIELDS = {
  experience: {
    lines: [
      { key: 'title', labelKey: 'ariaStudio.studioFlow.fields.experience.title' },
      { key: 'company', labelKey: 'ariaStudio.studioFlow.fields.experience.company' },
    ],
    // Free-text dates + "current role", exactly as the sheet reads them back.
    dates: true,
    descriptionLabelKey: 'ariaStudio.studioFlow.fields.experience.achievements',
  },
  project: {
    lines: [
      { key: 'title', labelKey: 'ariaStudio.studioFlow.fields.project.title' },
      { key: 'link', labelKey: 'ariaStudio.studioFlow.fields.project.link' },
    ],
    dates: false,
    descriptionLabelKey: 'ariaStudio.studioFlow.fields.project.achievements',
  },
  education: {
    lines: [
      { key: 'degree', labelKey: 'ariaStudio.studioFlow.fields.education.degree' },
      { key: 'school', labelKey: 'ariaStudio.studioFlow.fields.education.school' },
      { key: 'graduationDate', labelKey: 'ariaStudio.studioFlow.fields.education.graduationDate' },
      { key: 'cgpa', labelKey: 'ariaStudio.studioFlow.fields.education.cgpa' },
    ],
    dates: false,
    descriptionLabelKey: 'ariaStudio.studioFlow.fields.education.description',
  },
};

// Which sections keep their description as a BULLET LIST. Experience and projects print as
// bullets on the sheet and in every template; an education entry's description is prose.
const isBulletSection = (section) => section === 'experience' || section === 'project';
const BULLET = '• ';

// One "• " per non-empty line, markers never doubled.
//
// Used in three places, and it has to be the same function in all three or they disagree
// about whether anything changed: seeding the textarea (so stored text shows the same
// markers the sheet prints), the Enter handler, and the patch comparison. A line that is
// only a marker — an empty bullet the user tabbed through or thought better of — is
// dropped, which is what keeps "focus the box, change nothing, save" a no-op write and
// keeps an abandoned blank row prunable.
const toBulletLines = (text) =>
  String(text || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[•\-*]+\s*/, '').trim())
    .filter(Boolean)
    .map((l) => `${BULLET}${l}`)
    .join('\n');

// Auto-prepend https:// to a bare domain on blur, matching CVBuilder/Projects.jsx's own
// link normalizer — a link fixed here should behave identically to one typed in the wizard.
const normalizeLink = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

const FIELD =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 ' +
  'px-2.5 py-1.5 text-[12.5px] text-slate-800 dark:text-slate-100 ' +
  'placeholder-slate-300 dark:placeholder-slate-600 outline-none ' +
  'focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 ' +
  'dark:focus:border-white dark:focus:ring-white/15 transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

// Field NAMES, not placeholder ghosts. A placeholder-only form loses every label the
// moment it has content in it, which on a four-field education entry means four boxes of
// text and no way to tell which one is the grade.
const FIELD_LABEL =
  'mb-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500';

const PreviewEntryEditor = ({ section = 'experience', entry, onClose }) => {
  const { t } = useTranslation();
  const { applyEntryEdit } = useAriaStudio();
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;
  const bulleted = isBulletSection(section);
  const firstInputRef = useRef(null);
  const uid = useId();
  const fieldId = (key) => `${uid}-${key}`;

  // SEEDED ONCE, deliberately — the lazy initialiser runs on mount and never again.
  // cvData re-renders constantly here (an Aria turn, an autosave, an externalEditNonce
  // bump), and re-seeding on any of those would wipe half-typed text mid-sentence.
  const [form, setForm] = useState(() => {
    const stored = entry?.description || '';
    const seeded = { description: bulleted ? toBulletLines(stored) : stored };
    spec.lines.forEach((f) => {
      seeded[f.key] = entry?.[f.key] || '';
    });
    if (spec.dates) {
      seeded.startDate = entry?.startDate || '';
      seeded.endDate = entry?.endDate || '';
      seeded.isCurrent = !!entry?.isCurrent;
    }
    return seeded;
  });
  const [saving, setSaving] = useState(false);

  // The ✎ that opened this editor is gone from the DOM (the editor replaced the whole row),
  // so focus would otherwise fall back to <body>. Land it on the first field instead.
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Put the caret back after a programmatic value change. React re-renders the textarea
  // from state, which drops the selection to the end of the new value — fine when we
  // appended at the end, wrong the moment the user is editing mid-list.
  const restoreCaret = (textarea, caret) => {
    window.requestAnimationFrame?.(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  // THE FIRST BULLET IS SHOWN BEFORE IT IS TYPED INTO, not after.
  //
  // Enter inserts the marker for the NEXT line, so on an empty box the first achievement
  // was typed as bare prose and only grew a bullet once the user pressed Enter — which
  // read as the list not working, and left anyone who wrote a single achievement with an
  // unbulleted one. Seeding the marker on focus makes the format visible up front. It
  // costs nothing if they walk away again: toBulletLines drops a marker-only line, so the
  // patch comes out empty and an abandoned row stays prunable.
  const seedFirstBullet = (event) => {
    if (!bulleted || saving) return;
    if ((form.description || '').trim()) return;
    const textarea = event.currentTarget;
    setForm((prev) => ({ ...prev, description: BULLET }));
    restoreCaret(textarea, BULLET.length);
  };

  // CHANGED FIELDS ONLY. applyEntryEdit shallow-merges the patch onto the entry, so
  // sending an untouched field would be a write of the value we just read — harmless
  // today, and a lost update the moment anything else edits this entry concurrently.
  const buildPatch = () => {
    const patch = {};
    const put = (key, value) => {
      const before = entry?.[key] == null ? '' : String(entry[key]);
      if (value !== before) patch[key] = value;
    };
    spec.lines.forEach((f) => put(f.key, (form[f.key] || '').trim()));
    if (spec.dates) {
      put('startDate', (form.startDate || '').trim());
      // "Current role" is what the sheet prints instead of an end date, so checking it
      // clears the end date rather than leaving a stale one behind the label.
      put('endDate', form.isCurrent ? '' : (form.endDate || '').trim());
      if (!!entry?.isCurrent !== form.isCurrent) patch.isCurrent = form.isCurrent;
    }
    // The textarea IS the raw description: bullets live as newline text (what parseBullets
    // and applyRoleBulletDiff both read), one line per bullet. Normalised through the same
    // toBulletLines the box was seeded from, so a marker typed, deleted or left empty is
    // never reported as an edit; education's prose is sent verbatim.
    const description = bulleted ? toBulletLines(form.description) : form.description || '';
    if (description !== (entry?.description || '')) patch.description = description;
    return patch;
  };

  const save = async () => {
    if (saving) return;
    const patch = buildPatch();
    // Nothing moved — close without spending a write, same reasoning as reorderEntries'
    // no-op short-circuit.
    if (!Object.keys(patch).length) {
      onClose?.();
      return;
    }
    setSaving(true);
    let result;
    try {
      result = await applyEntryEdit?.(section, entry?._sortId, patch);
    } catch {
      // applyEntryEdit already catches its own save failures, so this is belt-and-braces:
      // an unexpected throw must not close the editor and take the user's text with it.
      result = { ok: false };
    }
    setSaving(false);
    // `found: false` is the ONE failure applyEntryEdit does not toast, because it is not a
    // save failure: the entry had already left the document (another tab, the builder, a
    // delete). That reported nothing at all — the user pressed Save and the button simply
    // did nothing, every time. Say it once and close; there is nothing here to retry.
    if (result && result.ok === false && result.found === false) {
      toast.error(t('ariaStudio.livePreview.editorEntryGone'));
      onClose?.();
      return;
    }
    // On any other failure applyEntryEdit has already rolled the list back and toasted.
    // Staying open keeps the user's text on screen to retry with — closing would throw it
    // away and the sheet would silently show the old entry as though nothing was typed.
    //
    // On success, hand the landed patch back. The parent's close handler prunes a
    // still-blank row, and its view of this entry is one tick behind this write — so
    // "blank" has to be judged against what we just saved, not against what it can
    // currently see. Without this, a freshly added row that the user filled in and saved
    // was deleted on the way out: the save worked, the row vanished, and it looked exactly
    // like Save not saving.
    if (result?.ok) onClose?.({ saved: true, patch });
  };

  // Escape discards and closes from ANY control in here — including the textarea. Stopped
  // from bubbling so it doesn't also close the panel this sheet lives in. Bound per
  // control rather than on a wrapper <div>, which would be a keyboard handler on a
  // non-interactive element with nothing to focus it.
  const escapeCloses = (event) => {
    if (event.key !== 'Escape') return false;
    event.stopPropagation();
    onClose?.();
    return true;
  };

  // Enter commits from any single-line field. NOT bound on the textarea: bullets are
  // newlines, so Enter there has to stay Enter.
  const lineKeyDown = (event) => {
    if (escapeCloses(event)) return;
    if (event.key !== 'Enter') return;
    event.preventDefault();
    save();
  };

  // Descriptions are stored as one newline-delimited bullet per line. Continue that
  // structure at the cursor so Enter in the live editor behaves like a CV list instead
  // of leaving the next achievement as unformatted prose. Experience and projects share
  // this behavior; education keeps Enter as a normal paragraph break.
  //
  // Backspace against an EMPTY marker removes the whole marker, and the newline carrying
  // it, rather than nibbling it one character at a time — otherwise the way out of a
  // bullet you did not want is three backspaces that each look like a no-op.
  const descriptionKeyDown = (event) => {
    if (escapeCloses(event)) return;
    if (!bulleted) return;
    const textarea = event.currentTarget;
    const value = form.description || '';
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;

    if (event.key === 'Enter') {
      event.preventDefault();
      const insert = value ? `\n${BULLET}` : BULLET;
      const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
      setForm((prev) => ({ ...prev, description: next }));
      restoreCaret(textarea, start + insert.length);
      return;
    }

    if (event.key === 'Backspace' && start === end) {
      const marker = value.slice(0, start).match(/\n?[•\-*]\s$/);
      if (!marker) return;
      event.preventDefault();
      const cut = start - marker[0].length;
      setForm((prev) => ({ ...prev, description: value.slice(0, cut) + value.slice(end) }));
      restoreCaret(textarea, cut);
    }
  };

  const line = (key, labelKey, ref) => (
    <input
      id={fieldId(key)}
      ref={ref}
      type="text"
      value={form[key]}
      onChange={set(key)}
      onBlur={
        key === 'link'
          ? () => setForm((prev) => ({ ...prev, link: normalizeLink(prev.link) }))
          : undefined
      }
      onKeyDown={lineKeyDown}
      disabled={saving}
      placeholder={t(labelKey)}
      className={FIELD}
    />
  );

  const descriptionId = fieldId('description');
  const datesLabel = t('ariaStudio.studioFlow.fields.experience.dates');

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_-18px_rgba(15,23,42,0.35)] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_18px_38px_-24px_rgba(0,0,0,.6)]">
      {/* A header strip, so an open editor reads as ONE object inside the document rather
          than as a loose stack of boxes where a row used to be. */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-950/40">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <Pencil size={11} aria-hidden="true" className="text-slate-400 dark:text-slate-500" />
          {t('ariaStudio.livePreview.editorEyebrow')}
        </span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 sm:inline">
          {t('ariaStudio.livePreview.editorKeyHint')}
        </span>
      </div>

      <div className="space-y-2.5 p-2.5">
        {/* Two across where there is room. Education's four fields pair up the same way
            (qualification/school, then finished/grade), which is how they read on paper. */}
        <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
          {spec.lines.map((f, i) => (
            <div key={f.key}>
              <label className={FIELD_LABEL} htmlFor={fieldId(f.key)}>
                {t(f.labelKey)}
              </label>
              {line(f.key, f.labelKey, i === 0 ? firstInputRef : undefined)}
            </div>
          ))}
        </div>

        {spec.dates && (
          <div>
            {/* A SPAN, not a <label>: one name covers the PAIR, and both inputs carry it as
                an aria-label instead — a <label> can only ever point at one of them. */}
            <span className={FIELD_LABEL}>{datesLabel}</span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Two plain text inputs: the app stores these as free strings ("Jan 2024",
                  "2024-01", "Summer 2023") and the sheet prints them verbatim, so a date
                  picker would reject values the rest of the CV accepts. */}
              <input
                type="text"
                value={form.startDate}
                onChange={set('startDate')}
                onKeyDown={lineKeyDown}
                disabled={saving}
                aria-label={datesLabel}
                placeholder={datesLabel}
                className={`${FIELD} w-auto min-w-0 flex-1 basis-24`}
              />
              <span aria-hidden="true" className="font-mono text-[11px] text-slate-400">
                –
              </span>
              <input
                type="text"
                value={form.isCurrent ? '' : form.endDate}
                onChange={set('endDate')}
                onKeyDown={lineKeyDown}
                // Empty AND unusable while the role is current — the sheet prints "Present"
                // there, so an editable end date would be a control with no effect.
                disabled={saving || form.isCurrent}
                aria-label={datesLabel}
                placeholder={form.isCurrent ? t('ariaStudio.pinnedEntry.present') : ''}
                className={`${FIELD} w-auto min-w-0 flex-1 basis-24`}
              />
              <label className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-[11.5px] text-slate-600 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500">
                <input
                  type="checkbox"
                  checked={form.isCurrent}
                  onChange={(event) => {
                    const { checked } = event.target;
                    setForm((prev) => ({
                      ...prev,
                      isCurrent: checked,
                      endDate: checked ? '' : prev.endDate,
                    }));
                  }}
                  onKeyDown={escapeCloses}
                  disabled={saving}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:text-white dark:focus:ring-white/20"
                />
                {t('ariaStudio.livePreview.currentRole')}
              </label>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label className={`${FIELD_LABEL} mb-0`} htmlFor={descriptionId}>
              {t(spec.descriptionLabelKey)}
            </label>
            {bulleted && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.livePreview.bulletsHint')}
              </span>
            )}
          </div>
          <textarea
            id={descriptionId}
            value={form.description}
            onChange={set('description')}
            onFocus={seedFirstBullet}
            onKeyDown={descriptionKeyDown}
            disabled={saving}
            rows={Math.min(
              9,
              Math.max(bulleted ? 4 : 3, (form.description || '').split('\n').length + 1)
            )}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/40">
        <button
          type="button"
          onClick={() => onClose?.()}
          onKeyDown={escapeCloses}
          disabled={saving}
          className="rounded px-2 py-1 text-[11.5px] font-semibold text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={save}
          onKeyDown={escapeCloses}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] disabled:opacity-50"
        >
          {saving && <Loader2 size={12} aria-hidden="true" className="animate-spin" />}
          {t('ariaStudio.livePreview.saveEdit')}
        </button>
      </div>
    </div>
  );
};

export default PreviewEntryEditor;
