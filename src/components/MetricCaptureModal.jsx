import React, { useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight, Hash, ShieldCheck } from 'lucide-react';

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
const MetricCaptureModal = ({ isOpen, vagueBullets = [], onSubmit, onCancel, primaryLabel }) => {
  const { t } = useTranslation();
  const resolvedPrimaryLabel = primaryLabel ?? t('dashboard.metricCapture.generateCv');
  const [values, setValues] = useState({});

  const setVal = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  const filledCount = useMemo(
    () => Object.values(values).filter((v) => (v || '').trim().length > 0).length,
    [values]
  );

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

  const total = vagueBullets.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Drag-handle on mobile (visual affordance for the bottom-sheet) */}
          <div className="sm:hidden pt-2 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Header — softer, info-first instead of decorative gradient */}
          <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {t('dashboard.metricCapture.title')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  <Trans
                    i18nKey="dashboard.metricCapture.intro"
                    count={total}
                    values={{ count: total }}
                    components={{
                      bold: <span className="font-semibold text-slate-800 dark:text-slate-200" />,
                    }}
                  />
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                aria-label={t('common.cancel')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress chip — gives the user a sense of how much they've done */}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t('dashboard.metricCapture.filledOfTotal', { filled: filledCount, total })}
              </span>
              <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${total > 0 ? (filledCount / total) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-indigo-500 rounded-full"
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500">
                {t('dashboard.metricCapture.allOptional')}
              </span>
            </div>
          </div>

          {/* Bullets — each in a card so they don't blur into one wall of text */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
            {vagueBullets.map((b) => {
              const value = values[b.bulletId] ?? '';
              const hasValue = value.trim().length > 0;
              return (
                <div
                  key={b.bulletId}
                  className={`rounded-xl border p-3 sm:p-4 transition-colors bg-white dark:bg-slate-900 ${
                    hasValue
                      ? 'border-indigo-300 dark:border-indigo-500/30 ring-1 ring-indigo-200/40'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] mb-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      {b.roleTitle}
                    </span>
                    {b.company && (
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {b.company}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-snug mb-3">
                    "{b.original}"
                  </p>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t('dashboard.metricCapture.addNumberLabel')}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={value}
                    onChange={(e) => setVal(b.bulletId, e.target.value)}
                    placeholder={b.placeholder || t('dashboard.metricCapture.numberPlaceholder')}
                    className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 ${
                      hasValue
                        ? 'border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  />
                </div>
              );
            })}

            {/* Reassurance — clearer pact with the user */}
            <div className="flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <Trans
                  i18nKey="dashboard.metricCapture.reassurance"
                  components={{ bold: <strong className="font-semibold" /> }}
                />
              </span>
            </div>
          </div>

          {/* Footer — actions stack on mobile, inline on desktop */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('dashboard.metricCapture.skip')}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm"
            >
              {filledCount > 0
                ? t('dashboard.metricCapture.withNumbers', {
                    label: resolvedPrimaryLabel,
                    count: filledCount,
                  })
                : resolvedPrimaryLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MetricCaptureModal;
