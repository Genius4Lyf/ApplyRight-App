import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const TargetJob = () => {
  const { t } = useTranslation();
  // Safely destructure context — fallback ensures hooks below see stable
  // shapes on the first render even if the provider hasn't initialised yet.
  const context = useOutletContext();
  const { cvData, handleNext, handleBack, saving, setStepDirty, registerStepData } = context || {};

  // The JD is now captured through the coach chat (see ATSCoachPanel's target-step
  // chat) — this step just mirrors whatever targetJob the coach has stored, so
  // proceeding carries it forward.
  const [formData, setFormData] = useState(cvData?.targetJob || { title: '', description: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const hasUserEdited = useRef(false);

  // Sync prefilled data from CVContext (e.g. when navigating from job search, or
  // when the coach chat saves a job description).
  useEffect(() => {
    if (!hasUserEdited.current && cvData?.targetJob) {
      const { title, description } = cvData.targetJob;
      if (title || description) {
        setFormData({ title: title || '', description: description || '' });
      }
    }
  }, [cvData?.targetJob?.title, cvData?.targetJob?.description]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ targetJob: formData }));
    return () => registerStepData?.(null);
  }, [formData, registerStepData]);

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('cvBuilder.targetJob.loading')}
      </div>
    );
  }

  const proceed = () => {
    setStepDirty?.(false);
    handleNext({ targetJob: formData });
  };

  // A JD sent to Aria lives in cvData.targetJob. Continuing with none skips the
  // tailoring, so ask for confirmation first (proceed directly if one exists).
  const hasJd = !!(cvData?.targetJob?.description || '').trim();
  const onContinue = () => (hasJd ? proceed() : setShowConfirm(true));

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 px-4 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Centered greeting with the coach avatar on top — the "is there a job?"
          question is answered in the coach chat on the right. */}
      <span className="w-14 h-14 rounded-full border-2 border-indigo-500 dark:border-indigo-400 flex items-center justify-center mb-4 shrink-0">
        <span className="w-5 h-5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      </span>
      {/* Aria's identity — name + what ARIA stands for (first impression on opening the builder) */}
      <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">Aria</h1>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
        ApplyRight Intelligent Assistant
      </p>

      {/* Warm personal greeting */}
      <p className="mt-5 max-w-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        {t('cvBuilder.targetJob.greetingLine1')}
        <br />
        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
          {t('cvBuilder.targetJob.greetingLine2')}
        </span>
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onContinue}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
        >
          {saving ? t('cvBuilder.common.saving') : t('cvBuilder.targetJob.continue')}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirm continuing with no target job — Aria can't tailor without one. */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-5 text-left animate-in zoom-in-95 duration-150">
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('cvBuilder.targetJob.confirmTitle')}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('cvBuilder.targetJob.confirmBody')}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-4 py-2 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowConfirm(false);
                  proceed();
                }}
                className="btn-primary px-5 py-2 text-sm"
              >
                {t('cvBuilder.targetJob.continueAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetJob;
