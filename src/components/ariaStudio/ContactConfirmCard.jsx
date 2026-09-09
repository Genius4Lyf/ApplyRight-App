import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import { loadPhoto, PHOTO_ACCEPT_ATTR } from '../../utils/cvPhoto';
import PhotoFramer from './PhotoFramer';
import CardEyebrow from './CardEyebrow';
import HintedLabel from '../HintedLabel';
import { sectionIcon } from '../../lib/studioFlow';

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

// The title printed under the name by every template. NOT in FIELDS, for the same reason
// PreviewContactBlock keeps it out of its own list: it is not a contact detail. It is
// here because it was previously offered ONLY at the very end, in the preview editor —
// so anyone who never opened that editor had a CV whose most prominent line was blank
// and nothing ever mentioned it. Optional throughout: left empty it simply does not
// render, here or on the document.
const TITLE_FIELD = 'currentJobTitle';

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

  // The chosen image, held decoded so it can be FRAMED before anything is written. Null
  // whenever the framer is closed.
  const [framing, setFraming] = useState(null);
  const [photoError, setPhotoError] = useState('');

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    // The picker is reset immediately so choosing the SAME file again still fires a
    // change event — otherwise a user who cancels the framer cannot reopen it.
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    try {
      const { image, src } = await loadPhoto(file);
      // Carry the data URL on the element: `image.src` is already it, but reading it back
      // off a decoded HTMLImageElement is not guaranteed to round-trip identically.
      setFraming({ width: image.width, height: image.height, src, el: image });
    } catch (error) {
      // A NAMED failure. This used to swallow everything and leave the old photo in
      // place with nothing said, so an iPhone HEIC — which Chrome cannot decode at all —
      // read as the button simply not working.
      setPhotoError(error?.message || t('ariaStudio.contactConfirm.photoFailed'));
    }
  };

  const save = () => {
    onChange?.(form);
    setEditing(false);
  };

  if (editing) {
    return (
      <AriaCard cardKey="contactedit">
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <CardEyebrow icon={sectionIcon('contact')}>
            {isEmpty
              ? t('ariaStudio.contactConfirm.howReachYou')
              : t('ariaStudio.contactConfirm.yourDetails')}
          </CardEyebrow>

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

          <div className="mt-3 min-w-0">
            {/* The one field on this card whose NAME was the problem. "Job title"
                names three different things in this product — the job being applied
                to, the title on each work-history entry, and this: the line under
                your name. So it is named for what it is, and the hint says what it
                is for, which no placeholder can. */}
            <HintedLabel
              htmlFor={`studio-contact-${TITLE_FIELD}`}
              hint={t('ariaStudio.livePreview.jobTitleHint')}
              className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
            >
              {t('ariaStudio.livePreview.jobTitleLabel')}
              <span className="ml-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.contactConfirm.importance.optional')}
              </span>
            </HintedLabel>
            <input
              id={`studio-contact-${TITLE_FIELD}`}
              type="text"
              value={form[TITLE_FIELD] || ''}
              onChange={(event) => set(TITLE_FIELD, event.target.value)}
              placeholder={t('ariaStudio.livePreview.jobTitlePlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-white"
            />
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
                {/* Named formats, not `image/*`. See cvPhoto.js: that wildcard offered
                    SVG, HEIC and TIFF, none of which this pipeline can decode — so the
                    picker cheerfully accepted files that were always going to fail. */}
                <input
                  id="studio-contact-photoUrl"
                  type="file"
                  aria-label={t('ariaStudio.contactConfirm.fields.photo.label')}
                  accept={PHOTO_ACCEPT_ATTR}
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

            {/* Framing happens HERE, under the control that opened it, rather than in a
                dialog — this card already lives inside a chat that is itself inside a
                drawer on a phone, and a third stacked layer is how a sheet becomes
                impossible to dismiss. */}
            {framing && (
              <PhotoFramer
                image={framing}
                onCancel={() => setFraming(null)}
                onApply={(dataUrl) => {
                  set('photoUrl', dataUrl);
                  setFraming(null);
                }}
              />
            )}

            {photoError && (
              <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {photoError}
              </p>
            )}
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
    <AriaCard cardKey="contactconfirm">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <CardEyebrow icon={sectionIcon('contact')}>
          {t('ariaStudio.contactConfirm.reviewDetails')}
        </CardEyebrow>

        {/* Every control in this grid is font-mono, and that is structural. index.css
            forces non-mono text inside an Aria card to 17px !important below 640px, and
            these sit in the row's `auto` column beside an 8px mono OPTIONAL/REQUIRED
            marker. At 17px the column blew out and squeezed the value beside it, so on a
            phone the row read as broken rather than merely mismatched. */}
        <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {/* First, because it is the first line on the finished document — the one
              printed directly under the name. */}
          <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 py-2">
            {/* The SHORT name here. The full one ("Your professional title") is three
                words wide and this column is 88px of 9px mono — it would wrap to three
                lines beside a one-line value. The full name and the explanation both live
                in the edit form, one tap away. */}
            <dt className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('ariaStudio.livePreview.jobTitleShort')}
            </dt>
            <dd
              className={`min-w-0 truncate text-[13.5px] ${
                (personalInfo[TITLE_FIELD] || '').trim()
                  ? 'text-slate-800 dark:text-slate-100'
                  : 'italic text-slate-400 dark:text-slate-500'
              }`}
            >
              {(personalInfo[TITLE_FIELD] || '').trim() || t('ariaStudio.contactConfirm.missing')}
            </dd>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.contactConfirm.importance.optional')}
              </span>
              {!(personalInfo[TITLE_FIELD] || '').trim() && (
                <button
                  type="button"
                  onClick={() => editField(TITLE_FIELD)}
                  className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-slate-900 underline underline-offset-2 hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
                >
                  {t('ariaStudio.contactConfirm.addField')}
                </button>
              )}
            </div>
          </div>
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
                className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-slate-900 underline underline-offset-2 hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
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
                      className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-slate-900 underline underline-offset-2 hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
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
