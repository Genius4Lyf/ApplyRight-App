import React, { useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { LANGUAGE_LEVELS, levelI18nKey, levelLabel } from '../../lib/languageLevels';

// The Live Preview's LANGUAGES sub-block, editable in place.
//
// Languages had no field, no UI and no markdown before this. Three of the ~19 templates
// scraped a "- **Languages:** …" line out of the SKILLS section in case the AI happened to
// write one there; the other sixteen ignored it. So a real section is what makes them
// appear at all, and appear everywhere.
//
// A language is { name, level } with NO _sortId, which decides the shape of this component
// exactly as it does for certifications and skills:
//
//   • no drag handles, no ↑/↓, no PreviewEntryRow: there is no id to reorder BY, so
//     reordering is out of scope rather than merely unimplemented. INDEX is identity;
//   • no focus-mode lock: Aria interviews ENTRIES, and a language isn't one, so no line
//     can ever be the active entry. They stay editable in edit mode, always;
//   • both writes are a whole-array replace (replaceLanguages) — delete filters the index
//     out, add appends. The array is the only thing there is to address.
//
// NO AI, no credit, no floor. Languages are typed rather than generated, so there is no
// "suggest with Aria" counterpart — and unlike skills, a CV with none is a normal CV, so
// removing the last one is allowed. replaceLanguages owns the optimistic apply, the
// rollback and the toast, so a failed save is handled by the time it returns.
//
// Deliberately OPTIONAL: nothing here reaches finishableNow or the section progress, and
// nothing reaches scoreSignature either — the scan does not read languages, so adding one
// must not fire a charged re-score.

const field =
  'min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';
// The same reveal PreviewEntryRow, the certs lines and the skill pills use: hidden until
// hover/focus on a device that HAS hover, permanently visible on touch.
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

const emptyForm = { name: '', level: '' };

// `readOnly` is the parent's completeness lock: an incomplete BUILD session shows its
// document but hands out no affordances.
const PreviewLanguagesBlock = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, replaceLanguages } = useAriaStudio();
  const languages = useMemo(() => cvData?.languages || [], [cvData?.languages]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  // One character is a typo, not a language — the same threshold the certifications block
  // holds its name field to.
  const canAdd = form.name.trim().length > 1;

  const closeAdd = () => {
    setAdding(false);
    setForm(emptyForm);
  };

  const openAdd = () => {
    setAdding(true);
    // The affordance the user clicked is replaced by the form, so focus would otherwise
    // fall back to <body>. requestAnimationFrame: the input doesn't exist yet this tick.
    window.requestAnimationFrame?.(() => nameRef.current?.focus());
  };

  // By INDEX, because index is identity here — and unlike skills there is no last-one
  // guard, because a CV with no languages is complete.
  const remove = async (index) => {
    if (busy) return;
    setBusy(true);
    // replaceLanguages rolls back and toasts on failure — nothing to add to that.
    await replaceLanguages?.(languages.filter((_, i) => i !== index));
    setBusy(false);
  };

  // Level is OPTIONAL, and CHOSEN rather than typed. Free text produced a different
  // vocabulary on every CV ("fluent", "very good", "B2", "mother tongue"), none of which a
  // recruiter can compare and none of which could be translated when the CV language is
  // toggled. The stored value is canonical English; see lib/languageLevels.
  const submit = async () => {
    if (busy || !canAdd) return;
    setBusy(true);
    const result = await replaceLanguages?.([
      ...languages,
      { name: form.name.trim(), level: form.level.trim() },
    ]);
    setBusy(false);
    // A FAILED save keeps the typed text to retry with: replaceLanguages has already
    // rolled the array back and toasted, and clearing here would throw the user's input
    // away on the one path they need it back.
    if (result?.ok === false) return;
    setForm(emptyForm);
    // Stays OPEN after a success — languages arrive in twos and threes, and reopening the
    // form for each would cost a click apiece. Escape / Cancel is the way out.
    nameRef.current?.focus();
  };

  // Escape closes from either field, stopped from bubbling so it doesn't also close the
  // sheet this preview lives in. Enter commits — both fields are single-line.
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

  // Locked AND empty: render nothing rather than a bare "Languages" heading over a blank
  // space. The only reason this block renders unconditionally is to offer "Add language"
  // to a document that has none — and that is exactly the affordance the lock removes.
  if (readOnly && languages.length === 0) return null;

  return (
    <div className="pt-1">
      {/* The same mono micro-label the other sub-headings on the sheet use, so the
          languages read as part of the document rather than as a control. */}
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.livePreview.languages')}
      </p>

      {languages.length > 0 && (
        <div className="mt-1 space-y-1">
          {languages.map((language, index) => (
            <div
              // Index is part of the key BECAUSE it is the identity here.
              key={`${language.name}-${index}`}
              className="group flex items-center gap-1.5"
            >
              <p className="min-w-0 flex-1 text-[12px] text-slate-600 dark:text-slate-300">
                {language.name}
                {language.level ? ` · ${levelLabel(language.level, t)}` : ''}
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={busy}
                  aria-label={t('ariaStudio.livePreview.removeLanguage', { name: language.name })}
                  title={t('ariaStudio.livePreview.removeLanguage', { name: language.name })}
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-[opacity,color,background-color] hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${revealOnHover}`}
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {readOnly ? null : adding ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Labelled by the FIELD names, placeholdered by the examples — the same split
              the certifications block uses, so a screen reader hears "Language" rather
              than "e.g. French". */}
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={set('name')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.fieldLanguage')}
            placeholder={t('ariaStudio.livePreview.placeholderLanguage')}
            className={`${field} basis-[8rem]`}
          />
          <select
            value={form.level}
            onChange={set('level')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.fieldLevel')}
            className={`${field} basis-[9rem]`}
          >
            {/* Blank first, and selected by default: a language with no level stated is a
                real entry, and pre-picking one would put a claim on the CV nobody made. */}
            <option value="">{t('ariaStudio.livePreview.noLevel')}</option>
            {LANGUAGE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(levelI18nKey(level))}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canAdd}
            className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {t('ariaStudio.certifications.add')}
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
        <button
          type="button"
          onClick={openAdd}
          className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          {t('ariaStudio.livePreview.addLanguage')}
        </button>
      )}
    </div>
  );
};

export default PreviewLanguagesBlock;
