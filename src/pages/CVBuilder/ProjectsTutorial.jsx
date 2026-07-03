import React from 'react';
import { Sparkles, FlaskConical, ClipboardPaste, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../assets/logo/applyright-icon.png';

/**
 * ProjectsTutorial — explains how to get good results from the AI rewrite
 * button on the Projects step. Organized as a landscape, non-scrollable modal on desktop.
 */
const ProjectsTutorial = ({ isOpen, onClose }) => {
  const handleDismiss = () => {
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-3xl rounded-2xl shadow-2xl relative overflow-hidden max-h-[90dvh] overflow-y-auto border border-slate-100 dark:border-slate-800"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Left Column: Guidelines (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                {/* Hero icon - ApplyRight logo */}
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 p-2.5">
                  <img src={logo} alt="ApplyRight Logo" className="w-full h-full object-contain" />
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                  How ApplyRight AI Works
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  A couple of tips so AI Suggestions can rewrite your project bullets like a pro.
                </p>

                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100/55 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                      <FlaskConical className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Name the project, name the goal
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                        Use a clear <strong>project name</strong> and what you set out to achieve
                        (e.g. "Marketing campaign for Q3 launch", "Open-source onboarding tool").
                        The AI uses this to highlight your impact.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100/55 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                      <ClipboardPaste className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Drop in rough notes — the AI polishes
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                        Paste a list of tasks, results, or a quick description. The AI rewrites them
                        into <strong>impressive professional achievements</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Example Transformation Card (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800/80">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Example Transformation
                </h4>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      Your Rough Input
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-1 leading-relaxed">
                      "did social media postings for a local shop"
                    </p>
                  </div>

                  <div className="border-t border-slate-200/60 dark:border-slate-800/60 my-2"></div>

                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> ApplyRight
                      AI Optimized
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-1 leading-relaxed">
                      "Launched a local Facebook ad campaign and created weekly promotional content,
                      driving a 30% increase in store foot traffic."
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-5 py-2.5 flex items-center justify-center gap-2 text-sm shadow-sm transition-colors"
                >
                  Got it
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectsTutorial;
