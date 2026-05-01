import React, { useState } from 'react';
import { Sparkles, Building2, ClipboardPaste, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import UserService from '../../services/user.service';

/**
 * HistoryTutorial — explains how to get good results from the AI rewrite
 * button on the Work History step. Triggered by the user clicking the
 * "How AI Works" button (auto-show on first visit was retired in favor of
 * the inline SectionTips card).
 *
 * Design pattern matches the target-job warning and the rest of our newer
 * modals: bottom-sheet on mobile, centered on desktop, hero icon on its
 * own row, stacked CTAs on phones, plain-language copy.
 */
const HistoryTutorial = ({ isOpen, onClose, user }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = async () => {
    if (onClose) onClose();

    if (dontShowAgain && user) {
      try {
        const currentSettings = user.settings || {};
        await UserService.updateSettings({ ...currentSettings, showOnboardingTutorials: false });
      } catch (error) {
        console.error('Failed to update tutorial usage', error);
        toast.error("Couldn't save preference — tutorial may show again");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-7 pb-5 sm:px-6 sm:pt-8 sm:pb-6">
          {/* Hero icon */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 leading-tight">
            Get the most from AI Suggestions
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Two quick tips so the AI rewrite button actually nails your bullets.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">Be specific about role &amp; company</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                  Use the <strong>exact job title and company name</strong>. The AI uses these to tailor suggestions to your industry.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ClipboardPaste className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">Write 2+ rough bullets first</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                  Drop in a few rough lines about what you did. The AI will sharpen them into <strong>achievement-focused, ATS-ready bullets</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — stacks on mobile (primary on top for thumb reach), inline on desktop */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t border-slate-100 pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-slate-500 group-hover:text-slate-700">
              Don't show this again
            </span>
          </label>
          <button
            type="button"
            onClick={handleDismiss}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-5 py-2.5 flex items-center justify-center gap-2 text-sm shadow-sm transition-colors"
          >
            Got it
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default HistoryTutorial;
