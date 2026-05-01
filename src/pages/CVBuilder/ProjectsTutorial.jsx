import React, { useState } from 'react';
import { Sparkles, FlaskConical, ClipboardPaste, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import UserService from '../../services/user.service';

/**
 * ProjectsTutorial — explains how to get good results from the AI rewrite
 * button on the Projects step. Same modal pattern as HistoryTutorial; kept
 * a separate file because the copy and feature points differ.
 */
const ProjectsTutorial = ({ isOpen, onClose, user }) => {
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
            Make your projects pop
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            A couple of tips so AI Suggestions can rewrite your project bullets like a pro.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">Name the project, name the goal</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                  Use a clear <strong>project name</strong> and what you set out to achieve (e.g. "Marketing campaign for Q3 launch", "Open-source onboarding tool"). The AI uses this to highlight your impact.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ClipboardPaste className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">Drop in rough notes — the AI polishes</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                  Paste a list of tasks, results, or a quick description. The AI rewrites them into <strong>impressive professional achievements</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — stacks on mobile, inline on desktop */}
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

export default ProjectsTutorial;
