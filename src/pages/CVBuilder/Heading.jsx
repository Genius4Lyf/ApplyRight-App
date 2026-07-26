import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCVBuilder } from '../../context/CVContext';
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Globe,
  Linkedin,
  Flag,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import SectionTips from '../../components/SectionTips';
import StepHeader from '../../components/cv/StepHeader';

const Heading = () => {
  const { t } = useTranslation();
  // Use the custom hook for context
  const { cvData, handleNext, handleBack, saving, user, setStepDirty, registerStepData } =
    useCVBuilder();

  // Initialize form data - start with empty then populate via useEffect
  const [formData, setFormData] = useState({});

  // Track visibility of optional fields
  const [visibleFields, setVisibleFields] = useState({
    linkedin: false,
    website: false,
    nationality: false,
    address: false,
    photo: false,
  });

  // Populate the form ONCE, from the saved draft plus (for still-empty fields)
  // the user's profile. We deliberately do not re-derive on every cvData change:
  // otherwise saving the step (which updates cvData) would re-run this and
  // re-add/re-fill optional fields the user intentionally removed — e.g. a
  // Website cleared here would come straight back from user.portfolioUrl.
  const populated = useRef(false);

  const populateForm = () => {
    const draftData = cvData?.personalInfo || {};
    const mergedData = { ...draftData };

    if (user) {
      if (!mergedData.fullName && user.firstName) {
        const nameParts = [user.firstName, user.otherName, user.lastName].filter(Boolean);
        mergedData.fullName = nameParts.join(' ');
      }
      if (!mergedData.email && user.email) mergedData.email = user.email;
      if (!mergedData.phone && user.phone) mergedData.phone = user.phone;
      // For the optional, removable URL fields we only auto-fill when the draft
      // has never set them (undefined). An explicit empty string means the user
      // intentionally removed it, so we must not bring it back from their profile.
      if (mergedData.linkedin === undefined && user.linkedinUrl)
        mergedData.linkedin = user.linkedinUrl;
      if (mergedData.website === undefined && user.portfolioUrl)
        mergedData.website = user.portfolioUrl;
    }

    setFormData(mergedData);

    // Initial visibility reflects which optional fields actually have a value.
    setVisibleFields({
      linkedin: !!mergedData.linkedin,
      website: !!mergedData.website,
      nationality: !!mergedData.nationality,
      address: !!mergedData.address,
      photo: !!mergedData.photoUrl,
    });
  };

  useEffect(() => {
    if (populated.current) return;
    // Wait until the draft has loaded so we don't populate from an empty draft.
    if (!cvData) return;
    populated.current = true;
    populateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cvData]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ personalInfo: formData }));
    return () => registerStepData?.(null);
  }, [formData, registerStepData]);

  const handleChange = (e) => {
    setStepDirty?.(true);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-prepend https:// to URL fields on blur if user entered a bare domain
  const handleUrlBlur = (e) => {
    const { name, value } = e.target;
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setStepDirty?.(true);
      setFormData((prev) => ({ ...prev, [name]: `https://${trimmed}` }));
    }
  };

  const toggleField = (field) => {
    const willShow = !visibleFields[field];
    setVisibleFields((prev) => ({ ...prev, [field]: willShow }));
    // When removing an optional field, also clear its value so it isn't saved
    // (and can't be restored from the draft on the next load).
    if (!willShow) {
      setStepDirty?.(true);
      // The photo's data key (photoUrl) doesn't match its visibility flag (photo).
      if (field === 'photo') {
        setFormData((prev) => ({ ...prev, photoUrl: '' }));
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setStepDirty?.(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const SIZE = 320;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 220_000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
        setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    // Also update title if not set
    const titleUpdate =
      !cvData.title || cvData.title === 'Untitled CV'
        ? { title: t('cvBuilder.heading.defaultCvTitle', { name: formData.fullName }) }
        : {};

    setStepDirty?.(false);
    handleNext({ personalInfo: formData, ...titleUpdate });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      <StepHeader
        eyebrow={t('cvBuilder.heading.eyebrow')}
        title={t('cvBuilder.heading.title')}
        subtitle={t('cvBuilder.heading.subtitle')}
      />

      <SectionTips
        sectionKey="cvbuilder_heading"
        title={t('cvBuilder.heading.tips.title')}
        intro={t('cvBuilder.heading.tips.intro')}
        tips={[
          t('cvBuilder.heading.tips.list.0'),
          t('cvBuilder.heading.tips.list.1'),
          t('cvBuilder.heading.tips.list.2'),
          t('cvBuilder.heading.tips.list.3'),
          t('cvBuilder.heading.tips.list.4'),
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label
            htmlFor="heading-fullName"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t('cvBuilder.heading.fullName')}
          </label>
          <input
            id="heading-fullName"
            type="text"
            name="fullName"
            value={formData.fullName || ''}
            onChange={handleChange}
            required
            placeholder={t('cvBuilder.heading.phFullName')}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="heading-email" className="block text-sm font-medium text-slate-700 mb-1">
            {t('cvBuilder.heading.emailPro')}
          </label>
          <input
            id="heading-email"
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            required
            placeholder={t('cvBuilder.heading.phEmail')}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="heading-phone" className="block text-sm font-medium text-slate-700 mb-1">
            {t('cvBuilder.heading.phone')}
          </label>
          <input
            id="heading-phone"
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            placeholder={t('cvBuilder.heading.phPhone')}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Optional Fields Section */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t('cvBuilder.heading.addMore')}
          </h3>
          <div className="relative group cursor-help">
            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold">
              i
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {t('cvBuilder.heading.addMoreTooltip')}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {!visibleFields.address && (
            <button type="button" onClick={() => toggleField('address')} className="btn-chip">
              {t('cvBuilder.heading.chipLocation')} <Plus className="w-3 h-3 ml-1" />
            </button>
          )}
          {!visibleFields.linkedin && (
            <button type="button" onClick={() => toggleField('linkedin')} className="btn-chip">
              {t('cvBuilder.heading.chipLinkedin')} <Plus className="w-3 h-3 ml-1" />
            </button>
          )}
          {!visibleFields.website && (
            <button type="button" onClick={() => toggleField('website')} className="btn-chip">
              {t('cvBuilder.heading.chipWebsite')} <Plus className="w-3 h-3 ml-1" />
            </button>
          )}

          {!visibleFields.nationality && (
            <button type="button" onClick={() => toggleField('nationality')} className="btn-chip">
              {t('cvBuilder.heading.nationality')} <Plus className="w-3 h-3 ml-1" />
            </button>
          )}

          {!visibleFields.photo && (
            <button type="button" onClick={() => toggleField('photo')} className="btn-chip">
              {t('cvBuilder.heading.chipPhoto')} <Plus className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
          {visibleFields.address && (
            <div className="relative group">
              <div className="flex justify-between mb-1">
                <label
                  htmlFor="heading-address"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t('cvBuilder.heading.locationLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('address')}
                  className="p-2 -m-1 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                <input
                  id="heading-address"
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder={t('cvBuilder.heading.phLocation')}
                  className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {visibleFields.linkedin && (
            <div className="relative group">
              <div className="flex justify-between mb-1">
                <label
                  htmlFor="heading-linkedin"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t('cvBuilder.heading.linkedinLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('linkedin')}
                  className="p-2 -m-1 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                <input
                  id="heading-linkedin"
                  type="text"
                  name="linkedin"
                  value={formData.linkedin || ''}
                  onChange={handleChange}
                  onBlur={handleUrlBlur}
                  placeholder={t('cvBuilder.heading.phLinkedin')}
                  className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {visibleFields.website && (
            <div className="relative group">
              <div className="flex justify-between mb-1">
                <label
                  htmlFor="heading-website"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t('cvBuilder.heading.websiteLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('website')}
                  className="p-2 -m-1 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                <input
                  id="heading-website"
                  type="text"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  onBlur={handleUrlBlur}
                  placeholder={t('cvBuilder.heading.phWebsite')}
                  className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {visibleFields.nationality && (
            <div className="relative group">
              <div className="flex justify-between mb-1">
                <label
                  htmlFor="heading-nationality"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t('cvBuilder.heading.nationality')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('nationality')}
                  className="p-2 -m-1 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <Flag className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                <input
                  id="heading-nationality"
                  type="text"
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  placeholder={t('cvBuilder.heading.phNationality')}
                  className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {visibleFields.photo && (
            <div className="relative group md:col-span-2">
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('cvBuilder.heading.photoLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('photo')}
                  className="p-2 -m-1 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <input
                  id="heading-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {t('cvBuilder.heading.photoHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
        <button
          type="button"
          onClick={handleBack}
          className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          {saving ? t('cvBuilder.common.saving') : t('cvBuilder.heading.nextWorkHistory')}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <style>{`
                .btn-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.5rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #475569;
                    background-color: white;
                    transition: all 0.2s;
                }
                .btn-chip:hover {
                    border-color: #6366f1;
                    color: #4f46e5;
                    background-color: #eef2ff;
                }
            `}</style>
    </form>
  );
};

export default Heading;
