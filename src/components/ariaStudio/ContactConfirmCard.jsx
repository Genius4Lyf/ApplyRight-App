import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// The fields a CV's contact block needs. `address` is asked for but never prefilled —
// User doesn't store one, so there's nothing honest to put there.
// Keys, not text — resolved via t() at render so the runtime UI language decides.
const FIELDS = [
  {
    key: 'fullName',
    labelKey: 'ariaStudio.contactConfirm.fields.fullName.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.fullName.placeholder',
    required: true,
  },
  {
    key: 'email',
    labelKey: 'ariaStudio.contactConfirm.fields.email.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.email.placeholder',
    required: true,
  },
  {
    key: 'phone',
    labelKey: 'ariaStudio.contactConfirm.fields.phone.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.phone.placeholder',
  },
  {
    key: 'linkedin',
    labelKey: 'ariaStudio.contactConfirm.fields.linkedin.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.linkedin.placeholder',
  },
  {
    key: 'website',
    labelKey: 'ariaStudio.contactConfirm.fields.website.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.website.placeholder',
  },
  {
    key: 'address',
    labelKey: 'ariaStudio.contactConfirm.fields.address.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.address.placeholder',
  },
];

// Confirm the contact block that build-start prefilled from the user's profile.
//
// Confirming beats silently accepting: a stale phone number or an old email is invisible
// until an employer fails to reach you, and this is the one moment the user is looking
// straight at it. When the profile is empty there's nothing to confirm, so the card opens
// straight into the form rather than showing a row of blanks and asking "looks right?".
const ContactConfirmCard = ({ personalInfo = {}, onConfirm, onChange, saving }) => {
  const { t } = useTranslation();
  const filled = FIELDS.filter((f) => (personalInfo[f.key] || '').trim());
  const isEmpty = filled.length === 0;

  const [editing, setEditing] = useState(isEmpty);
  const [form, setForm] = useState(() => ({ ...personalInfo }));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const canSave = !!(form.fullName || '').trim() && !!(form.email || '').trim();

  const save = () => {
    onChange?.(form);
    setEditing(false);
    onConfirm?.(form);
  };

  if (editing) {
    return (
      <AriaCard cardKey="contactedit" wide>
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {isEmpty
              ? t('ariaStudio.contactConfirm.howReachYou')
              : t('ariaStudio.contactConfirm.yourDetails')}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="min-w-0">
                <label
                  htmlFor={`studio-contact-${f.key}`}
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  {t(f.labelKey)}
                  {f.required && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  id={`studio-contact-${f.key}`}
                  value={form[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={t(f.placeholderKey)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {!isEmpty && (
              <button
                type="button"
                onClick={() => {
                  setForm({ ...personalInfo });
                  setEditing(false);
                }}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="btn-primary ml-auto px-5 py-2 text-sm disabled:opacity-50"
            >
              {saving ? t('ariaStudio.contactConfirm.saving') : t('ariaStudio.contactConfirm.saveContinue')}
            </button>
          </div>
        </div>
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="contactconfirm">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.contactConfirm.filledFromProfile')}
        </p>

        <dl className="mt-3 space-y-1.5">
          {filled.map((f) => (
            <div key={f.key} className="flex items-baseline gap-2 min-w-0">
              <dt className="shrink-0 w-24 font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t(f.labelKey)}
              </dt>
              <dd className="min-w-0 flex-1 truncate text-[13px] text-slate-800 dark:text-slate-100">
                {personalInfo[f.key]}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            ✎ {t('ariaStudio.pinnedEntry.edit')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.(personalInfo)}
            disabled={saving}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {t('ariaStudio.contactConfirm.looksRight')} →
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default ContactConfirmCard;
