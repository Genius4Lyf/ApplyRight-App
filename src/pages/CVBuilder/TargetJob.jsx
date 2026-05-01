import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, ArrowRight, AlertCircle, X, Check } from 'lucide-react';
import SectionTips from '../../components/SectionTips';

const TargetJob = () => {
  // Safely destructure context
  const context = useOutletContext();
  const { cvData, handleNext, saving } = context || {};

  // Fallback if context is somehow missing
  if (!cvData) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  const [formData, setFormData] = useState(cvData.targetJob || { title: '', description: '' });
  const [showModal, setShowModal] = useState(false);
  const hasUserEdited = useRef(false);

  // Sync prefilled data from CVContext (e.g. when navigating from job search)
  useEffect(() => {
    if (!hasUserEdited.current && cvData.targetJob) {
      const { title, description } = cvData.targetJob;
      if (title || description) {
        setFormData({ title: title || '', description: description || '' });
      }
    }
  }, [cvData.targetJob?.title, cvData.targetJob?.description]);

  const handleChange = (e) => {
    hasUserEdited.current = true;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    // Check if target job title is empty
    if (!formData.title.trim()) {
      setShowModal(true);
      return;
    }

    handleNext({ targetJob: formData });
  };

  const handleSkipAndContinue = () => {
    setShowModal(false);
    handleNext({ targetJob: formData });
  };

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Target Job Analysis</h2>
            <p className="text-slate-500">
              Tell us what you're applying for so our AI can tailor your resume.
            </p>
          </div>
        </div>

        <SectionTips
          sectionKey="cvbuilder_target"
          title="The clearer the target, the better the CV"
          intro="Everything we build from here gets tailored to this role."
          tips={[
            'Use the exact job title from a posting you\'re considering — even if you don\'t apply yet.',
            'Paste the full job description (not just the company name) so our AI can pick up the keywords that matter.',
            'If you\'re open to multiple roles, build separate CVs. One CV per target.',
            'You can change this later — pick your best guess and move on.',
          ]}
        />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Target Job Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Paste the job description here. Our AI will use this to suggest relevant skills and keywords for your summary and experience."
              className="w-full p-3 border border-slate-300 rounded-lg h-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : 'Next Step'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Target-job confirmation modal — restructured for mobile.
          Old layout crammed icon + title + close-button into one flex row,
          which on phones forced the title to wrap awkwardly and pushed the
          body content to the right of the icon. New layout: icon at the top,
          close in the absolute corner, title and body stacked underneath. */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close button — absolute top-right, doesn't compete with the
                title for horizontal space on mobile. */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Close"
              className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 pt-7 pb-5 sm:px-6 sm:pt-8 sm:pb-6">
              {/* Hero icon */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
              </div>

              {/* Title + body */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 leading-tight">
                Add a target job title?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Telling us the role you're targeting lets our AI tailor your CV with the right
                keywords. Without it you'll get a generic CV.
              </p>

              {/* Benefits list */}
              <ul className="mt-4 space-y-2.5">
                {[
                  ['Keyword optimization', 'matching the job description'],
                  ['AI-generated content', 'tailored to your target role'],
                  ['Higher ATS score', 'for better recruiter visibility'],
                ].map(([title, body]) => (
                  <li key={title} className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed">
                      <strong className="font-semibold text-slate-900">{title}</strong> {body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions — primary on top on mobile (thumb reach), side-by-side on
                desktop with primary on the right. */}
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleSkipAndContinue}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Continue without it
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors text-sm shadow-sm"
              >
                Add target job
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TargetJob;
