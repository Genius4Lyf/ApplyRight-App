import React, { useState } from 'react';
import AriaCard from './AriaCard';

// The fields a CV's contact block needs. `address` is asked for but never prefilled —
// User doesn't store one, so there's nothing honest to put there.
const FIELDS = [
  { key: 'fullName', label: 'Full name', placeholder: 'Ernest Akibor', required: true },
  { key: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { key: 'phone', label: 'Phone', placeholder: '+234 …' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  { key: 'website', label: 'Portfolio / website', placeholder: 'yoursite.com' },
  { key: 'address', label: 'Location', placeholder: 'Lagos, Nigeria' },
];

// Confirm the contact block that build-start prefilled from the user's profile.
//
// Confirming beats silently accepting: a stale phone number or an old email is invisible
// until an employer fails to reach you, and this is the one moment the user is looking
// straight at it. When the profile is empty there's nothing to confirm, so the card opens
// straight into the form rather than showing a row of blanks and asking "looks right?".
const ContactConfirmCard = ({ personalInfo = {}, onConfirm, onChange, saving }) => {
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
            {isEmpty ? 'How can employers reach you?' : 'Your details'}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="min-w-0">
                <label
                  htmlFor={`studio-contact-${f.key}`}
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  {f.label}
                  {f.required && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  id={`studio-contact-${f.key}`}
                  value={form[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
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
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="btn-primary ml-auto px-5 py-2 text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & continue'}
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
          I&rsquo;ve filled these in from your profile
        </p>

        <dl className="mt-3 space-y-1.5">
          {filled.map((f) => (
            <div key={f.key} className="flex items-baseline gap-2 min-w-0">
              <dt className="shrink-0 w-24 font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {f.label}
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
            ✎ Edit
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.(personalInfo)}
            disabled={saving}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            Looks right →
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default ContactConfirmCard;
