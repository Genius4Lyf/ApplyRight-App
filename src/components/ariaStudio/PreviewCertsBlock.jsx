import React, { useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';

// The Live Preview's CERTIFICATIONS sub-block, editable in place.
//
// Certifications live UNDER Education — that's how the builder stores them, how the
// template renders them, and how they're captured in the build flow — so this is a
// sub-block of that section rather than a section of its own.
//
// A certification is { name, issuer, date } with NO _sortId, which decides the shape of
// this component exactly as it does for skills:
//
//   • no drag handles, no ↑/↓, no PreviewEntryRow: there is no id to reorder BY, so
//     reordering is out of scope rather than merely unimplemented. INDEX is identity;
//   • no focus-mode lock: Aria interviews ENTRIES, and a certification isn't one, so no
//     line can ever be the active entry. They stay editable in edit mode, always;
//   • both writes are a whole-array replace (replaceCertifications) — delete filters the
//     index out, add appends. The array is the only thing there is to address.
//
// NO AI. Nothing here calls the model or spends a credit: certifications are typed, not
// generated, so there is no "suggest with Aria" counterpart to the skills block's.
// replaceCertifications owns the optimistic apply, the rollback and the toast, so a
// failed save is already handled by the time it returns.
//
// The build flow has its own add/remove on CertificationsCard. They are NOT shared with
// this: those are StudioChat-local handlers driving one card in one phase, while this
// writes through the context. What IS shared is the copy — the same
// ariaStudio.certifications.* strings label both, so the two surfaces can't drift into
// naming the same field two things.

const field =
  'min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';
// The same reveal PreviewEntryRow and the skill pills use: hidden until hover/focus on a
// device that HAS hover, permanently visible on touch (where there is no hover to reveal
// it with).
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

const emptyForm = { name: '', issuer: '', date: '' };

// `readOnly` is the parent's completeness lock: an incomplete BUILD session shows its
// document but hands out no affordances.
const PreviewCertsBlock = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, replaceCertifications } = useAriaStudio();
  const certifications = useMemo(() => cvData?.certifications || [], [cvData?.certifications]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  // The same threshold CertificationsCard's canAdd uses — a one-character certification
  // is a typo, and the two capture surfaces must not disagree on what's acceptable.
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

  // By INDEX, because index is identity here: two certifications can legitimately share
  // a name (the same course, re-issued), so filtering by name would delete both.
  const remove = async (index) => {
    if (busy) return;
    setBusy(true);
    // replaceCertifications rolls back and toasts on failure — nothing to add to that.
    await replaceCertifications?.(certifications.filter((_, i) => i !== index));
    setBusy(false);
  };

  // Issuer and date are OPTIONAL — a certification with only a name is a real one, and
  // demanding the awarding body for it would cost the user the entry. They're stored as
  // trimmed empty strings rather than omitted, so the shape matches what the build flow
  // and the builder both write.
  const submit = async () => {
    if (busy || !canAdd) return;
    const cert = {
      name: form.name.trim(),
      issuer: form.issuer.trim(),
      date: form.date.trim(),
    };
    setBusy(true);
    const result = await replaceCertifications?.([...certifications, cert]);
    setBusy(false);
    // A FAILED save keeps the typed text to retry with: replaceCertifications has already
    // rolled the array back and toasted, and clearing here would throw the user's input
    // away on the one path they need it back.
    if (result?.ok === false) return;
    setForm(emptyForm);
    // Stays OPEN after a success — certifications arrive in batches (a ticket, its
    // refresher and the medical), and reopening the form for each would cost a click
    // apiece. Escape / Cancel is the way out.
    nameRef.current?.focus();
  };

  // Escape closes from any field, stopped from bubbling so it doesn't also close the
  // sheet this preview lives in. Enter commits from the NAME field — the required one,
  // and the field the user is in when they've typed enough to add.
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

  // Locked AND empty: render nothing rather than a bare "Certifications" heading over a
  // blank space. The only reason this block renders unconditionally in the first place is
  // to offer "Add certification" to a document that has none — and that's exactly the
  // affordance the lock removes.
  if (readOnly && certifications.length === 0) return null;

  return (
    <div className="pt-1">
      {/* The same mono micro-label the other sub-headings on the sheet use, so the
          certifications read as part of the document rather than as a control. */}
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.livePreview.certifications')}
      </p>

      {certifications.length > 0 && (
        <div className="mt-1 space-y-1">
          {certifications.map((certificate, index) => (
            <div
              // Index is part of the key BECAUSE it is the identity here: two
              // certifications may share a name, and the name alone would collide.
              key={`${certificate.name}-${index}`}
              className="group flex items-center gap-1.5"
            >
              <p className="min-w-0 flex-1 text-[12px] text-slate-600 dark:text-slate-300">
                {certificate.name}
                {certificate.issuer ? ` · ${certificate.issuer}` : ''}
                {certificate.date ? ` · ${certificate.date}` : ''}
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={busy}
                  aria-label={t('ariaStudio.certifications.removeAria', { name: certificate.name })}
                  title={t('ariaStudio.certifications.removeAria', { name: certificate.name })}
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
              CertificationsCard uses, so a screen reader hears "Certification" rather
              than "e.g. H2S Awareness". */}
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={set('name')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.certifications.fieldCertification')}
            placeholder={t('ariaStudio.certifications.placeholderCertification')}
            className={`${field} basis-[9rem]`}
          />
          <input
            type="text"
            value={form.issuer}
            onChange={set('issuer')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.certifications.fieldIssuer')}
            placeholder={t('ariaStudio.certifications.placeholderIssuer')}
            className={`${field} basis-[7rem]`}
          />
          <input
            type="text"
            value={form.date}
            onChange={set('date')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.certifications.fieldYear')}
            placeholder={t('ariaStudio.certifications.placeholderYear')}
            className={`${field} basis-[4.5rem]`}
          />
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
          {t('ariaStudio.livePreview.addCertification')}
        </button>
      )}
    </div>
  );
};

export default PreviewCertsBlock;
