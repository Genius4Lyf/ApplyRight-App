import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import SectionTips from '../../components/SectionTips';
import StepHeader from '../../components/cv/StepHeader';
import InlineExample from '../../components/InlineExample';
import { useCVBuilder } from '../../context/CVContext';

const ProfessionalSummary = () => {
  const { t } = useTranslation();
  // Safely destructure context — fallback ensures hooks below see stable
  // shapes on the first render even if the provider hasn't initialised yet.
  const context = useOutletContext();
  const { cvData, handleNext, handleBack, saving, setStepDirty, registerStepData } = context || {};
  // externalEditNonce bumps whenever a coach action writes to the draft (here: Aria's
  // in-chat "Draft my summary"). We re-seed the textarea off it, like History/Projects.
  const { externalEditNonce } = useCVBuilder();

  const [summary, setSummary] = useState(cvData?.professionalSummary || '');

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ professionalSummary: summary }));
    return () => registerStepData?.(null);
  }, [summary, registerStepData]);

  // Re-seed from the draft when Aria applies a summary from the coach chat. Skip the
  // first run (mount already seeded from cvData) so we don't clobber live typing.
  const seededOnce = useRef(false);
  useEffect(() => {
    if (!seededOnce.current) {
      seededOnce.current = true;
      return;
    }
    setSummary(cvData?.professionalSummary || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditNonce]);

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('cvBuilder.professionalSummary.loadingEditor')}
      </div>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({ professionalSummary: summary });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      <StepHeader
        eyebrow={t('cvBuilder.professionalSummary.eyebrow')}
        title={t('cvBuilder.professionalSummary.title')}
        subtitle={t('cvBuilder.professionalSummary.subtitle')}
      />

      <SectionTips
        sectionKey="cvbuilder_summary"
        title={t('cvBuilder.professionalSummary.tips.title')}
        intro={t('cvBuilder.professionalSummary.tips.intro')}
        tips={[
          t('cvBuilder.professionalSummary.tips.list.0'),
          t('cvBuilder.professionalSummary.tips.list.1'),
          t('cvBuilder.professionalSummary.tips.list.2'),
          t('cvBuilder.professionalSummary.tips.list.3'),
        ]}
      />

      <div className="mt-4 mb-2 flex justify-end">
        <InlineExample kind="summary" targetTitle={cvData.targetJob?.title} />
      </div>

      <div className="relative">
        <textarea
          value={summary}
          onChange={(e) => {
            setStepDirty?.(true);
            setSummary(e.target.value);
          }}
          placeholder={t('cvBuilder.professionalSummary.placeholder')}
          className="w-full p-4 border border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 rounded-xl h-64 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white outline-none transition-all custom-scrollbar resize-none leading-relaxed text-slate-700 dark:text-slate-300"
        />
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-lg flex items-start gap-3">
        <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 mt-0.5">
          <MessageCircle className="w-3 h-3" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <Trans i18nKey="cvBuilder.professionalSummary.ariaTip" components={{ b: <strong /> }} />
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
          {saving ? t('cvBuilder.common.saving') : t('cvBuilder.professionalSummary.reviewFinish')}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default ProfessionalSummary;
