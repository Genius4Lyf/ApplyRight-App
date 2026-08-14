import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

const FIELDS = [
  {
    key: 'fullName',
    labelKey: 'ariaStudio.contactConfirm.fields.fullName.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.fullName.placeholder',
    required: true,
    importance: 'essential',
  },
  {
    key: 'email',
    labelKey: 'ariaStudio.contactConfirm.fields.email.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.email.placeholder',
    required: true,
    importance: 'essential',
  },
  {
    key: 'phone',
    labelKey: 'ariaStudio.contactConfirm.fields.phone.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.phone.placeholder',
    required: true,
    importance: 'essential',
  },
  {
    key: 'linkedin',
    labelKey: 'ariaStudio.contactConfirm.fields.linkedin.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.linkedin.placeholder',
    importance: 'recommended',
  },
  {
    key: 'website',
    labelKey: 'ariaStudio.contactConfirm.fields.website.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.website.placeholder',
    importance: 'optional',
  },
  {
    key: 'address',
    labelKey: 'ariaStudio.contactConfirm.fields.address.label',
    placeholderKey: 'ariaStudio.contactConfirm.fields.address.placeholder',
    importance: 'recommended',
  },
];

// Confirm the complete CV contact block. Missing fields remain visible so users
// understand what the CV still needs instead of mistaking an omitted row for a
// finished section. Essential details block confirmation; optional ones do not.
const ContactConfirmCard = ({ personalInfo = {}, onConfirm, onChange, saving }) => {
  const { t } = useTranslation();
  const filled = FIELDS.filter((field) => (personalInfo[field.key] || '').trim());
  const isEmpty = filled.length === 0;

  const [editing, setEditing] = useState(isEmpty);
  const [form, setForm] = useState(() => ({ ...personalInfo }));

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const requiredFields = FIELDS.filter((field) => field.required);
  const missingRequired = requiredFields.filter((field) => !(personalInfo[field.key] || '').trim());
  const canSave = requiredFields.every((field) => (form[field.key] || '').trim());

  const editField = (key) => {
    setForm({ ...personalInfo });
    setEditing(true);
    requestAnimationFrame(() => document.getElementById(`studio-contact-${key}`)?.focus());
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;
        context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 220_000) dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        set('photoUrl', dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const save = () => {
    onChange?.(form);
    setEditing(false);
  };

  if (editing) {
    return (
      <AriaCard cardKey="contactedit" wide>
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white shadow-md dark:shadow-black/20 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {isEmpty
              ? t('ariaStudio.contactConfirm.howReachYou')
              : t('ariaStudio.contactConfirm.yourDetails')}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="min-w-0">
                <label
                  htmlFor={`studio-contact-${field.key}`}
                  className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  {t(field.labelKey)}
                  <span
                    className={`ml-1.5 font-mono text-[8px] uppercase tracking-[0.08em] ${
                      field.required
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {t(`ariaStudio.contactConfirm.importance.${field.importance}`)}
                  </span>
                </label>
                <input
                  id={`studio-contact-${field.key}`}
                  value={form[field.key] || ''}
                  onChange={(event) => set(field.key, event.target.value)}
                  placeholder={t(field.placeholderKey)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/20"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                  {t('ariaStudio.contactConfirm.fields.photo.label')}
                  <span className="ml-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.contactConfirm.importance.optional')}
                  </span>
                </p>
                <p className="mt-1 max-w-md text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.contactConfirm.photoGuidance')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {form.photoUrl && (
                  <img
                    src={form.photoUrl}
                    alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
                    className="h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                )}
                <label
                  htmlFor="studio-contact-photoUrl"
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white dark:hover:text-white"
                >
                  {form.photoUrl
                    ? t('ariaStudio.contactConfirm.replacePhoto')
                    : t('ariaStudio.contactConfirm.addPhoto')}
                </label>
                <input
                  id="studio-contact-photoUrl"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => set('photoUrl', '')}
                    className="text-[10px] font-semibold text-slate-400 underline underline-offset-2 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400"
                  >
                    {t('ariaStudio.contactConfirm.removePhoto')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {!isEmpty && (
              <button
                type="button"
                onClick={() => {
                  setForm({ ...personalInfo });
                  setEditing(false);
                }}
                className="rounded-lg px-2 py-1.5 text-[14px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="btn-primary ml-auto px-5 py-2 text-[16px] disabled:opacity-50"
            >
              {saving
                ? t('ariaStudio.contactConfirm.saving')
                : t('ariaStudio.contactConfirm.saveContinue')}
            </button>
          </div>
        </div>
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="contactconfirm" wide>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white shadow-md dark:shadow-black/20 p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.contactConfirm.reviewDetails')}
        </p>

        <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 py-2">
            <dt className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('ariaStudio.contactConfirm.fields.photo.label')}
            </dt>
            <dd className="min-w-0">
              {personalInfo.photoUrl ? (
                <img
                  src={personalInfo.photoUrl}
                  alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
                  className="h-9 w-9 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <span className="text-[13.5px] italic text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.contactConfirm.missing')}
                </span>
              )}
            </dd>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.contactConfirm.importance.optional')}
              </span>
              <button
                type="button"
                onClick={() => editField('photoUrl')}
                className="text-[10px] font-bold text-slate-900 underline underline-offset-2 hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
              >
                {personalInfo.photoUrl
                  ? t('ariaStudio.contactConfirm.replacePhoto')
                  : t('ariaStudio.contactConfirm.addField')}
              </button>
            </div>
          </div>
          {FIELDS.map((field) => {
            const value = (personalInfo[field.key] || '').trim();
            return (
              <div
                key={field.key}
                className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 py-2"
              >
                <dt className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t(field.labelKey)}
                </dt>
                <dd
                  className={`min-w-0 truncate text-[13.5px] ${
                    value
                      ? 'text-slate-800 dark:text-slate-100'
                      : field.required
                        ? 'font-semibold text-rose-600 dark:text-rose-400'
                        : 'italic text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {value || t('ariaStudio.contactConfirm.missing')}
                </dd>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[8px] uppercase tracking-[0.08em] ${
                      field.required && !value
                        ? 'text-rose-600 dark:text-rose-400'
                        : field.required
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {t(`ariaStudio.contactConfirm.importance.${field.importance}`)}
                  </span>
                  {!value && (
                    <button
                      type="button"
                      onClick={() => editField(field.key)}
                      className="text-[10px] font-bold text-slate-900 underline underline-offset-2 hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
                    >
                      {t('ariaStudio.contactConfirm.addField')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </dl>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1.5 text-[14px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ✎ {t('ariaStudio.pinnedEntry.edit')}
          </button>
          <button
            type="button"
            onClick={() =>
              missingRequired.length ? editField(missingRequired[0].key) : onConfirm?.(personalInfo)
            }
            disabled={saving}
            className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
          >
            {missingRequired.length
              ? t('ariaStudio.contactConfirm.addMissing', { count: missingRequired.length })
              : `${t('ariaStudio.contactConfirm.looksRight')} →`}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default ContactConfirmCard;
