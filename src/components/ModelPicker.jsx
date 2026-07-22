import React, { useEffect, useRef, useState } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks jsx-uses-vars
// so it reads as unused — suppress the false positive (same as the chat surfaces).
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Info, X } from 'lucide-react';
import {
  AI_MODELS,
  MODEL_LABELS,
  PROVIDER_GLYPH,
  TIER_LABEL,
  modelLabel,
  modelsByTier,
  costForActionTier,
} from '../lib/models';
import { SPRING } from '../lib/ariaMotion';

// Per-model one-liners for the explainer's Pro list. Keyed by model id so the panel only
// describes models that are actually exposed — an id without a blurb just shows its name.
const PRO_MODEL_BLURB = {
  'claude-sonnet-5': 'the most natural, human writing feel.',
  'gpt-5': 'familiar and strong all-round.',
};

// The Aria model picker — choose which model powers chat / tailoring. A flat list of the
// EXPOSED models: each row shows the TIER ("Standard" / "Pro") as the primary label with the
// model name + per-message cost as a subtitle. The SELECTED row is inked (slate-900 / white),
// NOT indigo-filled — indigo stays the accent/focus colour. Reads the exposed list + tier
// costs from lib/models (hydrated from /auth/config); calls onSelect(modelId) to persist.
// `costAction` picks which action's cost to show (default the chat per-message cost).
const ModelPicker = ({ value, onSelect, costAction = 'ARIA_CHAT_MESSAGE', align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef(null);

  // The explainer bloom: grows from near the (i) trigger (top-right) on open, shrinks out
  // on close. Reduced motion → an instant fade, no scale. Reuses the shared Aria SPRING.
  const infoMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: SPRING,
        style: { transformOrigin: 'top right', willChange: 'transform' },
      };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = value || AI_MODELS.defaultModel;
  const currentTier = modelsByTier('flagship').some((m) => m.id === current) ? 'flagship' : 'light';

  const pick = (id) => {
    setOpen(false);
    if (id !== value) onSelect?.(id);
  };

  // Exposed models, Standard (light) first then Pro (flagship). Each is ONE option — the
  // TIER is the primary label, the model name a subtitle. With one exposed light model,
  // "Standard" is naturally a single row (no intra-tier list).
  const lightModels = modelsByTier('light');
  const proModels = modelsByTier('flagship');
  const rows = [...lightModels, ...proModels];
  // Data-driven names for the explainer, so it never drifts from the exposed set.
  const standardLabel = modelLabel(lightModels[0]?.id || AI_MODELS.defaultModel);

  const renderRow = (m) => {
    const selected = m.id === current;
    const cost = costForActionTier(costAction, m.tier);
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => pick(m.id)}
        aria-pressed={selected}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
          selected
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span
          className={`shrink-0 w-5 text-center text-[13px] ${
            selected ? '' : 'text-slate-400 dark:text-slate-500'
          }`}
          aria-hidden="true"
        >
          {PROVIDER_GLYPH[m.provider] || '•'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-tight">
            {TIER_LABEL[m.tier]}
          </span>
          <span
            className={`block text-[11px] leading-tight truncate ${
              selected ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {modelLabel(m.id)}
            {typeof cost === 'number' ? ` · ${cost} cr/msg` : ''}
          </span>
        </span>
        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
      </button>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Choose the model powering Aria"
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
      >
        <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
          {PROVIDER_GLYPH[rows.find((m) => m.id === current)?.provider] || '◇'}
        </span>
        <span className="hidden sm:inline">{TIER_LABEL[currentTier]}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-40 mt-1 w-60 max-h-[60vh] overflow-y-auto scrollbar-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header — title + an (i) that toggles the inline explainer (no separate modal). */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Choose your AI
            </span>
            <button
              type="button"
              onClick={() => setShowInfo((s) => !s)}
              aria-label="What's the difference?"
              aria-expanded={showInfo}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inline explainer — Standard vs Pro. Editorial, no fills; dismissible. Tier +
              model names are data-driven so the copy tracks the exposed set. Blooms in/out
              from the (i) trigger via AnimatePresence so the close actually plays. */}
          <AnimatePresence initial={false}>
            {showInfo && (
              <motion.div
                {...infoMotion}
                className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex justify-end -mt-1 -mr-1">
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    aria-label="Close"
                    className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {TIER_LABEL.light}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                    Fast and efficient ({standardLabel}). Great for most CVs — solid bullets,
                    summaries and tailoring. Cheapest on credits, and included free on paid plans.
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {TIER_LABEL.flagship}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                    The strongest models — sharper writing and better nuance on tough or senior
                    roles, with tighter keyword tailoring. Costs more credits per action, and always
                    metered (even on paid plans).
                  </p>
                  {proModels.some((m) => PRO_MODEL_BLURB[m.id]) && (
                    <ul className="mt-1.5 space-y-1">
                      {proModels
                        .filter((m) => PRO_MODEL_BLURB[m.id])
                        .map((m) => (
                          <li
                            key={m.id}
                            className="relative pl-3.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300 before:content-['·'] before:absolute before:left-0 before:text-slate-400 dark:before:text-slate-500"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {modelLabel(m.id)}
                            </span>{' '}
                            — {PRO_MODEL_BLURB[m.id]}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 italic">
                  Not sure? {TIER_LABEL.light} is great for most CVs — reach for{' '}
                  {TIER_LABEL.flagship} when a role is competitive or you want the most polished
                  result.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {rows.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-slate-500 dark:text-slate-400">
              No models available.
            </p>
          ) : (
            <>
              <div className="py-1">{rows.map(renderRow)}</div>
              <p className="px-3 py-2 text-[10px] leading-snug text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                Pro always uses credits. Standard is included on paid plans.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelPicker;

// Re-export for consumers that only need the label map (avoids a second import line).
export { MODEL_LABELS };
