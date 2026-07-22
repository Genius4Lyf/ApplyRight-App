import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import SectionTips from '../../components/SectionTips';
import StepHeader from '../../components/cv/StepHeader';
import InlineExample from '../../components/InlineExample';
import { useCVBuilder } from '../../context/CVContext';

const ProfessionalSummary = () => {
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
        Loading editor context...
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
        eyebrow="Summary"
        title="Professional summary"
        subtitle="Your 30-second elevator pitch. Make it count."
      />

      <SectionTips
        sectionKey="cvbuilder_summary"
        title="2-3 sentences. Specific beats clever."
        intro="The summary is read first and remembered last. Earn that real estate."
        tips={[
          'Sentence 1: who you are professionally and how many years.',
          'Sentence 2: a concrete win or area of strongest impact.',
          "Sentence 3 (optional): what you're looking for next.",
          'Avoid generic adjectives ("innovative", "passionate") — show, don\'t tell.',
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
          placeholder="e.g. Innovative Software Engineer with 5+ years of experience in..."
          className="w-full p-4 border border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 rounded-xl h-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none leading-relaxed text-slate-700 dark:text-slate-300"
        />
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-lg flex items-start gap-3">
        <div className="p-1 bg-indigo-100 dark:bg-indigo-500/20 rounded text-indigo-600 dark:text-indigo-300 mt-0.5">
          <MessageCircle className="w-3 h-3" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Tip:</strong> Aria writes this from your Work History &amp; Skills — and tailors it
          to your target job when you've set one. Open Aria and tap "Draft my summary".
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
          {saving ? 'Saving...' : 'Review & Finish'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default ProfessionalSummary;
