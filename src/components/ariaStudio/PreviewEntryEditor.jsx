import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';

// Edit one Live Preview entry MANUALLY, in place on the sheet.
//
// It renders in the slot the read-only entry occupied — same SectionBlock, same list — so
// the document doesn't reflow into a modal to change one word. NOT a dialog and NOT
// contenteditable: real <input>/<textarea> controls, styled quietly enough to sit on a
// 680px sheet set in 12.5px type. contenteditable would fight the bullets, which are
// newline TEXT in `description` rather than DOM list items.
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

// Auto-prepend https:// to a bare domain on blur, matching CVBuilder/Projects.jsx's own
// link normalizer — a link fixed here should behave identically to one typed in the wizard.
const normalizeLink = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

const field =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';

const PreviewEntryEditor = ({ section = 'experience', entry, onClose }) => {
  const { t } = useTranslation();
  const { applyEntryEdit } = useAriaStudio();
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;
  const firstInputRef = useRef(null);

  // SEEDED ONCE, deliberately — the lazy initialiser runs on mount and never again.
  // cvData re-renders constantly here (an Aria turn, an autosave, an externalEditNonce
  // bump), and re-seeding on any of those would wipe half-typed text mid-sentence.
  const [form, setForm] = useState(() => {
    const seeded = { description: entry?.description || '' };
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
    // and applyRoleBulletDiff both read), one line per bullet. Sent verbatim — trimming
    // here would report a whitespace tidy-up as a user edit.
    if ((form.description || '') !== (entry?.description || '')) {
      patch.description = form.description || '';
    }
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
    // On failure applyEntryEdit has already rolled the list back and toasted. Staying open
    // keeps the user's text on screen to retry with — closing would throw it away and the
    // sheet would silently show the old entry as though nothing had been typed.
    if (result?.ok) onClose?.();
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
  const descriptionKeyDown = (event) => {
    if (escapeCloses(event)) return;
    if (event.key !== 'Enter' || section === 'education') return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const value = form.description || '';
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const insert = value ? '\n• ' : '• ';
    const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    const caret = start + insert.length;

    setForm((prev) => ({ ...prev, description: next }));
    window.requestAnimationFrame?.(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const line = (key, labelKey, ref) => (
    <input
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
      aria-label={t(labelKey)}
      placeholder={t(labelKey)}
      className={field}
    />
  );

  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-2 space-y-1.5">
      {spec.lines.map((f, i) => (
        <div key={f.key}>{line(f.key, f.labelKey, i === 0 ? firstInputRef : undefined)}</div>
      ))}

      {spec.dates && (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Two plain text inputs: the app stores these as free strings ("Jan 2024",
              "2024-01", "Summer 2023") and the sheet prints them verbatim, so a date
              picker would reject values the rest of the CV accepts. Both carry the
              section's existing `dates` label — there is one key for the pair. */}
          {line('startDate', 'ariaStudio.studioFlow.fields.experience.dates')}
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
            aria-label={t('ariaStudio.studioFlow.fields.experience.dates')}
            placeholder={form.isCurrent ? t('ariaStudio.pinnedEntry.present') : ''}
            className={field}
          />
          <label className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
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
              className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-slate-900/20 dark:text-white dark:focus:ring-white/20"
            />
            {t('ariaStudio.livePreview.currentRole')}
          </label>
        </div>
      )}

      <div>
        <textarea
          value={form.description}
          onChange={set('description')}
          onKeyDown={descriptionKeyDown}
          disabled={saving}
          rows={Math.min(8, Math.max(3, (form.description || '').split('\n').length + 1))}
          aria-label={t(spec.descriptionLabelKey)}
          className={`${field} resize-y leading-relaxed`}
        />
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t('ariaStudio.livePreview.bulletsHint')}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={save}
          onKeyDown={escapeCloses}
          disabled={saving}
          className="btn-primary px-3 py-1 text-[11px] disabled:opacity-50"
        >
          {t('ariaStudio.livePreview.saveEdit')}
        </button>
        <button
          type="button"
          onClick={() => onClose?.()}
          onKeyDown={escapeCloses}
          disabled={saving}
          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-1.5 py-1 rounded transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

export default PreviewEntryEditor;
