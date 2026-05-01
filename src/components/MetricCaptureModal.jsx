import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight, Hash } from 'lucide-react';

/**
 * MetricCaptureModal
 *
 * Shown between "Generate CV" click and the actual generation request when
 * the backend's preflight has flagged bullets that use action verbs but lack
 * numbers. The user fills in concrete metrics (team size, %, $, scale) which
 * the LLM then weaves into those bullets as authoritative facts.
 *
 * Skipping is always one click; cancelling aborts the whole generation.
 */
const MetricCaptureModal = ({
  isOpen,
  vagueBullets = [],
  onSubmit,
  onCancel,
  primaryLabel = 'Generate CV',
}) => {
  const [values, setValues] = useState({});

  const setVal = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));
  const skip = (id) => setValues((prev) => ({ ...prev, [id]: '' }));

  const handleSubmit = (skipAll = false) => {
    const cleaned = {};
    if (!skipAll) {
      for (const [id, v] of Object.entries(values)) {
        const trimmed = (v || '').trim();
        if (trimmed) cleaned[id] = trimmed.slice(0, 200);
      }
    }
    onSubmit(cleaned);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white relative shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 bg-white/15 rounded-lg">
                <Hash className="w-4 h-4 text-yellow-200" />
              </div>
              <h2 className="text-lg font-bold">Add numbers to stand out (optional)</h2>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed">
              We spotted {vagueBullets.length} bullet{vagueBullets.length === 1 ? '' : 's'} that could pop with concrete numbers. Fill in what you remember — skip the rest.
            </p>
          </div>

          {/* Bullets */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {vagueBullets.map((b) => {
              const isSkipped = values[b.bulletId] === '';
              const hasValue = (values[b.bulletId] || '').trim().length > 0;
              return (
                <div key={b.bulletId} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">{b.roleTitle}</span>
                    {b.company && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">{b.company}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 italic leading-snug">
                    "{b.original}"
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={200}
                      value={values[b.bulletId] ?? ''}
                      onChange={(e) => setVal(b.bulletId, e.target.value)}
                      placeholder={b.placeholder}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        hasValue
                          ? 'border-indigo-300 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    />
                    {!isSkipped && !hasValue && (
                      <button
                        type="button"
                        onClick={() => skip(b.bulletId)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 shrink-0"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                These won't change facts in your CV — they'll be woven into the matching bullet only if they truly apply to your experience.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Skip all & generate
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              {primaryLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MetricCaptureModal;
