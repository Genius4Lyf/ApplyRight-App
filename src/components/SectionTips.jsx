import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        Tips for this section
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-50 border border-indigo-200/70 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-100/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="w-9 h-9 rounded-lg bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">{title}</p>
          {!expanded && intro && (
            <p className="text-xs text-indigo-700/80 mt-0.5 truncate">{intro}</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-indigo-400 shrink-0"
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
            <div className="px-4 pb-4 pt-1 border-t border-indigo-200/60">
              {intro && (
                <p className="text-xs text-indigo-800/90 leading-relaxed mt-2 mb-2">{intro}</p>
              )}
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-indigo-900/90 leading-relaxed">
                    <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: tip }} />
                  </li>
                ))}
              </ul>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600/80 hover:text-indigo-800 hover:bg-white/60 px-2 py-1 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                  Got it, hide
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
