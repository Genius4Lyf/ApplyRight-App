import React, { useState, useEffect, useRef } from 'react';
import { useCVBuilder } from '../../context/CVContext';
import { User, ArrowRight, ArrowLeft, Plus, X, Globe, Linkedin, Flag, MapPin } from 'lucide-react';
import SectionTips from '../../components/SectionTips';

const Heading = () => {
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
      setFormData((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    // Also update title if not set
    const titleUpdate =
      !cvData.title || cvData.title === 'Untitled CV' ? { title: `${formData.fullName}'s CV` } : {};

    setStepDirty?.(false);
    handleNext({ personalInfo: formData, ...titleUpdate });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Contact Information
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Your professional header. Keep it accurate and simple.
            </p>
          </div>
        </div>
      </div>

      <SectionTips
        sectionKey="cvbuilder_heading"
        title="Keep the header clean and recruiter-ready"
        intro="Your header is the first thing they see. A few small choices make a big difference."
        tips={[
          'Use a professional email — <code class="text-[11px] bg-white/60 px-1 rounded">firstname.lastname@email.com</code> beats a nickname.',
          'City and country is enough — no need for a full street address.',
          'Include your LinkedIn URL if you have one; recruiters click it.',
          "Skip the photo unless you're applying in a region where it's standard.",
          'Example: <em>Jane Doe · London, UK · jane.doe@email.com · +44 7123 456 789 · linkedin.com/in/janedoe</em>',
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label
            htmlFor="heading-fullName"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Full Name
          </label>
          <input
            id="heading-fullName"
            type="text"
            name="fullName"
            value={formData.fullName || ''}
            onChange={handleChange}
            required
            placeholder="e.g. Alexander James"
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="heading-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email (Professional)
          </label>
          <input
            id="heading-email"
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            required
            placeholder="e.g. alex.james@gmail.com"
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="heading-phone" className="block text-sm font-medium text-slate-700 mb-1">
            Phone Number
          </label>
          <input
            id="heading-phone"
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            placeholder="e.g. +1 (555) 123-4567"
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Optional Fields Section */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Add additional information to your CV (optional)
          </h3>
          <div className="relative group cursor-help">
            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold">
              i
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Add these only if relevant to the job application.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {!visibleFields.address && (
            <button type="button" onClick={() => toggleField('address')} className="btn-chip">
              Location <Plus className="w-3 h-3 ml-1" />
            </button>
          )}
          {!visibleFields.linkedin && (
            <button type="button" onClick={() => toggleField('linkedin')} className="btn-chip">
              LinkedIn <Plus className="w-3 h-3 ml-1" />
            </button>
          )}
          {!visibleFields.website && (
            <button type="button" onClick={() => toggleField('website')} className="btn-chip">
              Website <Plus className="w-3 h-3 ml-1" />
            </button>
          )}

          {!visibleFields.nationality && (
            <button type="button" onClick={() => toggleField('nationality')} className="btn-chip">
              Nationality <Plus className="w-3 h-3 ml-1" />
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
                  Location (City, Country)
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('address')}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-500"
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
                  placeholder="e.g. London, UK"
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
                  LinkedIn URL
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('linkedin')}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-500"
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
                  placeholder="linkedin.com/in/profile"
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
                  Website / Portfolio
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('website')}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-500"
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
                  placeholder="your-portfolio.com"
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
                  Nationality
                </label>
                <button
                  type="button"
                  onClick={() => toggleField('nationality')}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-500"
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
                  placeholder="e.g. British"
                  className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
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
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : 'Next: Work History'} <ArrowRight className="w-4 h-4" />
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
