import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCcw,
  Wand2,
  Lock,
  Crown,
} from 'lucide-react';
import CVService from '../../services/cv.service';
import Modal from '../../components/Modal';
import { toast } from 'sonner';
import SectionTips from '../../components/SectionTips';
import InlineExample from '../../components/InlineExample';

const ProfessionalSummary = () => {
  // Safely destructure context — fallback ensures hooks below see stable
  // shapes on the first render even if the provider hasn't initialised yet.
  const context = useOutletContext();
  const { cvData, handleNext, handleBack, saving, setStepDirty, registerStepData } = context || {};
  const navigate = useNavigate();

  const [summary, setSummary] = useState(cvData?.professionalSummary || '');
  const [generating, setGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  // ApplyRight Suggested Summary tone picker. toneData = { isPaid, tones:
  // [{ key, label, text, locked }] }. Free users get the Professional tone real
  // and the rest locked; paid users get all tones.
  const [showToneModal, setShowToneModal] = useState(false);
  const [toneData, setToneData] = useState(null);
  const [activeToneKey, setActiveToneKey] = useState(null);
  const hasAutoOpened = useRef(false);

  // Auto-prompt for AI Summary if empty
  useEffect(() => {
    // Only run if summary is empty/short and we haven't asked yet
    if (
      cvData &&
      (!summary || summary.trim().length < 10) &&
      !hasAutoOpened.current &&
      window.matchMedia('(min-width: 1024px)').matches
    ) {
      hasAutoOpened.current = true;
      // Small timeout to allow UI to settle/animate in
      setTimeout(() => {
        setShowAiModal(true);
      }, 500);
    }
  }, [cvData, summary]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ professionalSummary: summary }));
    return () => registerStepData?.(null);
  }, [summary, registerStepData]);

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading editor context...
      </div>
    );
  }

  const handleGenerateClick = () => {
    if (!cvData.targetJob?.title && !cvData.personalInfo?.fullName) {
      // Fallback minimal check, but we really want at least a job title
      toast.error('Please add a Target Job Title (Step 1) first.');
      return;
    }
    setShowAiModal(true);
  };

  const confirmGenerate = async () => {
    setGenerating(true);
    setShowAiModal(false); // Close modal while generating or keep open? User said "when user clicks... show modal...".
    // Better to close modal and show loading state on the page, or keep modal with loader.
    // The existing UI has a loading state on the button. Let's close modal and show loading on button.

    try {
      // Construct enhanced context from previous steps
      const skillsStr = cvData.skills
        ? cvData.skills.map((s) => (typeof s === 'object' ? s.type || s.name : s)).join(', ')
        : '';
      const historyStr = cvData.experience
        ? cvData.experience
            .map(
              (exp) =>
                `${exp.title} at ${exp.company} (${exp.startDate}-${exp.isCurrent ? 'Present' : exp.endDate})`
            )
            .join('; ')
        : '';

      // The summary is built from the candidate's own CV (work history, skills,
      // existing draft) — NOT the target job description. We intentionally do
      // not send the JD so the AI can't tailor/fabricate to match a role.
      const context = `
                Candidate Name: ${cvData.personalInfo?.fullName || 'Candidate'}
                Target Job Title: ${cvData.targetJob?.title || 'Professional'}

                Key Skills: ${skillsStr}

                Work History Summary: ${historyStr}

                Existing Summary Draft: ${summary}
            `.trim();

      const data = await CVService.generateSummaries(
        cvData.targetJob?.title || 'Professional',
        context
      );

      if (data?.tones?.length) {
        setToneData(data);
        const firstUnlocked = data.tones.find((t) => !t.locked) || data.tones[0];
        setActiveToneKey(firstUnlocked.key);
        setShowToneModal(true);
      } else {
        toast.warning('No summary generated. Please try again.');
      }
    } catch (error) {
      console.error('AI Gen Failed', error);
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const goUpgrade = () => {
    setShowToneModal(false);
    navigate('/upgrade');
  };

  // Apply the currently-selected (unlocked) tone's summary to the editor.
  const applyTone = () => {
    const tone = toneData?.tones.find((t) => t.key === activeToneKey);
    if (!tone || tone.locked || !tone.text) return;
    setSummary(tone.text);
    setStepDirty?.(true);
    toast.success('Summary applied!');
    setShowToneModal(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({ professionalSummary: summary });
  };

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Professional Summary
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Your 30-second elevator pitch. Make it count.
            </p>
          </div>
        </div>

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
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 rounded-md text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
            >
              {generating ? (
                <RefreshCcw className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {generating ? 'Writing...' : 'ApplyRight Summary'}
            </button>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-500/15 p-4 rounded-lg flex items-start gap-3">
          <div className="p-1 bg-indigo-100 dark:bg-indigo-500/20 rounded text-indigo-600 dark:text-indigo-300 mt-0.5">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            <strong>Tip:</strong> The AI uses your Work History and Skills to craft this summary —
            it's grounded in your own experience, not tailored to a job description.
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

      {showAiModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 pb-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                  We've got some ideas for your summary
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Let AI craft your elevator pitch based on your experience.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed text-sm">
                Generate an AI-personalised summary: the AI will analyse your{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-medium">
                  work history
                </strong>{' '}
                and{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-medium">skills</strong>{' '}
                to provide the result.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  If you're unhappy with the AI's response, you can simply discard it and write your
                  own.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                Not now
              </button>
              <button
                onClick={confirmGenerate}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-sm"
              >
                <Wand2 className="w-4 h-4" /> Yes, generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ApplyRight Suggested Summary — tone picker. Free users get the
          Professional tone unlocked; other tones are locked teasers. Paid users
          get every tone. */}
      {showToneModal &&
        toneData &&
        (() => {
          const activeTone =
            toneData.tones.find((t) => t.key === activeToneKey) || toneData.tones[0];
          const lockedActive = activeTone?.locked;
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                        ApplyRight Suggested Summary
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {toneData.isPaid
                          ? 'Pick the tone that fits you best.'
                          : 'One tone is free — unlock all 6 with a premium plan.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tone tabs */}
                <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 shrink-0 scrollbar-none">
                  {toneData.tones.map((t) => {
                    const active = t.key === activeToneKey;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveToneKey(t.key)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                            : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {t.locked && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        )}
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Body — selected tone's summary */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                  <p
                    className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans ${
                      lockedActive ? 'blur-[5px] select-none pointer-events-none opacity-40' : ''
                    }`}
                  >
                    {activeTone?.text}
                  </p>
                  {lockedActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-slate-900/75 p-6 backdrop-blur-[2px]">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/80 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        {activeTone.label} tone
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[280px]">
                        Unlock this tone and 5 other options to customize your professional summary.
                      </p>
                      <button
                        type="button"
                        onClick={goUpgrade}
                        className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-white text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 transition-all active:scale-[0.98]"
                      >
                        <Lock className="w-3.5 h-3.5" /> Upgrade to unlock
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-4">
                  <div className="flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Note:</strong> Grounded in your work history and skills, not the job
                      description. Review and edit before using.
                    </span>
                  </div>
                  {!toneData.isPaid && (
                    <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          Upgrade to unlock all 6 professional tones
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={goUpgrade}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 shrink-0"
                      >
                        View Plans &rarr;
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowToneModal(false)}
                      className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyTone}
                      disabled={lockedActive || !activeTone?.text}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      Use this summary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default ProfessionalSummary;
