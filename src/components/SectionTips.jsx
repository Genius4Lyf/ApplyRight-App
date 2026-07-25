import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lightbulb, ChevronDown, X } from 'lucide-react';

/**
 * SectionTips
 *
 * A collapsible tip card pinned to the top of each CV builder step. Replaces
 * the old auto-modal tutorials that:
 *   1. fired only once and disappeared,
 *   2. covered the whole screen on mobile, and
 *   3. were dismissed without users seeing them due to a race we patched earlier.
 *
 * Persists per-section dismissal in localStorage. Even when "dismissed,"
 * a small "Tips" pill remains so users can re-open later.
 *
 * Props:
 *   sectionKey - unique localStorage key (e.g. "cvbuilder_tips_history")
 *   title      - card heading
 *   intro      - 1 short sentence shown above the bullets
 *   tips       - array of strings (1-4 best practices)
 *   defaultOpen - whether the card opens expanded the first time (default: true)
 */
const SectionTips = ({ sectionKey, title, intro, tips = [], defaultOpen = true }) => {
  const { t } = useTranslation();
  const storageKey = `tip_dismissed_${sectionKey}`;
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(defaultOpen);

  // Load dismissed state once on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') {
        setDismissed(true);
        setExpanded(false);
      }
    } catch (_) {
      /* localStorage unavailable — show as default */
    }
  }, [storageKey]);

  const persistDismiss = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch (_) {
      /* ignore */
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    setExpanded(false);
    persistDismiss();
  };

  const handleReopen = () => {
    setDismissed(false);
    setExpanded(true);
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {
      /* ignore */
    }
  };

  // Once dismissed, render only a slim re-open pill
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={handleReopen}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-md transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        {t('cvBuilder.sectionTips.tipsForSection')}
      </button>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </p>
          {!expanded && intro && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{intro}</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 dark:text-slate-500 shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-200 dark:border-slate-800">
              {intro && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2 mb-2">
                  {intro}
                </p>
              )}
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    <span className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: tip }} />
                  </li>
                ))}
              </ul>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t('cvBuilder.sectionTips.gotItHide')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SectionTips;
