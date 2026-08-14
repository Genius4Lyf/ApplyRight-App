import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks jsx-uses-vars
// so it reads as unused — suppress the false positive (same as the chat surfaces).
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AI_MODELS,
  MODEL_LABELS,
  PROVIDER_GLYPH,
  modelLabel,
  modelsByTier,
  costForActionTier,
} from '../lib/models';
import { SPRING } from '../lib/ariaMotion';

// The Aria model picker — choose which model powers chat / tailoring. A flat list of the
// EXPOSED models: each row shows the TIER ("Standard" / "Pro") as the primary label with the
// model name + per-message cost as a subtitle. The SELECTED row is inked (slate-900 / white),
// NOT indigo-filled — indigo stays the accent/focus colour. Reads the exposed list + tier
// costs from lib/models (hydrated from /auth/config); calls onSelect(modelId) to persist.
// `costAction` picks which action's cost to show (default the chat per-message cost).
//
// `drop` places the menu: 'down' (default — the Studio header, absolutely positioned as
// it always was) or 'up', for the picker docked in a chat composer at the bottom of the
// viewport, where a downward menu would open off-screen. 'up' also PORTALS the menu to
// the body and positions it fixed off the trigger's rect: the builder's mobile coach
// drawer is `overflow-hidden` and can be dragged down to 140px, so an in-flow menu —
// however it's anchored — would simply be clipped away there.
//
// `compact` is the in-composer chip: glyph + tier + caret in a borderless pill that only
// paints on hover, sized to sit on one row with the input. Below `sm` it drops the text
// label to a glyph + caret — spelling out "Standard" at 360px squeezes the text field
// under ~40% of the row. The trigger therefore carries an explicit aria-label, so the
// collapsed form still announces the current model instead of being an unnamed button.
const ModelPicker = ({
  value,
  onSelect,
  costAction = 'ARIA_CHAT_MESSAGE',
  align = 'left',
  drop = 'down',
  compact = false,
}) => {
  const { t } = useTranslation();
  const tierLabel = (tier) =>
    t(
      tier === 'flagship' ? 'cvBuilder.modelPicker.tierFlagship' : 'cvBuilder.modelPicker.tierLight'
    );
  // Per-model character line for the explainer's Pro list — i18n, not hardcoded, so it
  // exists in every locale (see GenerationModelRow, which reads the same keys). A model
  // id with no entry returns '' rather than a raw key, so it just shows the name alone.
  const proBlurbFor = (id) => t(`cvBuilder.modelPicker.proBlurb.${id}`, { defaultValue: '' });
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const menuRef = useRef(null);
  const dropUp = drop === 'up';

  // Fixed coordinates for the portaled ('up') menu, measured off the trigger. Also
  // caps the height to the room actually above it, so the menu scrolls internally
  // instead of running off the top of a short viewport (a phone with the keyboard up).
  const [pos, setPos] = useState(null);
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = Math.min(240, window.innerWidth - 32); // matches the CSS width clamp
    const GAP = 4;
    const EDGE = 8;
    const raw = align === 'right' ? r.right - W : r.left;
    const left = Math.min(Math.max(EDGE, raw), Math.max(EDGE, window.innerWidth - W - EDGE));
    setPos({
      left,
      bottom: window.innerHeight - r.top + GAP,
      maxHeight: Math.max(140, Math.min(window.innerHeight * 0.6, r.top - GAP - EDGE)),
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open || !dropUp) return undefined;
    place();
    // Reposition rather than close: the composer moves when the input auto-grows, the
    // drawer is dragged, or the on-screen keyboard resizes the viewport.
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    window.visualViewport?.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      window.visualViewport?.removeEventListener('resize', onMove);
    };
  }, [open, dropUp, place]);

  // The explainer bloom: grows from near the (i) trigger (top-right) on open, shrinks out
  // on close. Reduced motion → an instant fade, no scale. Reuses the shared Aria SPRING.
  // The origin holds for BOTH drop directions: the explainer is a sibling directly under
  // the panel's own header, so flipping the panel up moves the (i) with it — 'top right'
  // still points at the trigger.
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
    // The 'up' menu is portaled OUT of this subtree, so a click inside it isn't inside
    // `ref` — it has to be excluded explicitly or the menu closes before a row fires.
    const onDoc = (e) => {
      const inTrigger = ref.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
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
          <span className="block text-[13px] font-semibold leading-tight">{tierLabel(m.tier)}</span>
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

  // 'up' escapes the composer's clipping ancestors through a body portal (it carries its
  // own fixed coordinates); 'down' stays absolutely positioned in flow, as it always was.
  const withPortal = (node) => (dropUp ? createPortal(node, document.body) : node);

  return (
    <div className={`relative ${compact ? 'shrink-0' : ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('cvBuilder.modelPicker.ariaLabelModel', { tier: tierLabel(currentTier) })}
        title={t('cvBuilder.modelPicker.triggerTitle')}
        // The compact chip keeps a ≥44px pointer target through the ::before overlay
        // rather than by growing the row — a 36px chip is what fits beside the input.
        className={`relative inline-flex items-center shrink-0 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
          compact
            ? "gap-1 h-10 px-2 rounded-full text-[12px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 before:content-[''] before:absolute before:inset-x-0 before:-inset-y-1"
            : 'gap-1.5 h-8 px-2.5 rounded-lg text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
          {PROVIDER_GLYPH[rows.find((m) => m.id === current)?.provider] || '◇'}
        </span>
        {/* The current model stays visibly labeled at every width, not just ≥sm — the
            reference chat header never hides which model is active. */}
        <span aria-hidden="true" className={compact ? 'hidden sm:inline' : 'inline'}>
          {tierLabel(currentTier)}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {open &&
        withPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={
              dropUp
                ? {
                    position: 'fixed',
                    left: pos?.left ?? -9999,
                    bottom: pos?.bottom ?? 0,
                    maxHeight: pos?.maxHeight,
                    // Hidden until measured, so it can't flash at the wrong spot.
                    visibility: pos ? 'visible' : 'hidden',
                  }
                : undefined
            }
            // Never wider than the viewport allows: a flat w-60 overflows a 360px screen
            // once the panel is anchored near an edge.
            className={`w-[min(15rem,calc(100vw-2rem))] overflow-y-auto scrollbar-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg ${
              dropUp
                ? 'z-50'
                : `absolute z-40 mt-1 max-h-[60vh] ${align === 'right' ? 'right-0' : 'left-0'}`
            }`}
          >
            {/* Header — title + an (i) that toggles the inline explainer (no separate modal). */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {t('cvBuilder.modelPicker.header')}
              </span>
              <button
                type="button"
                onClick={() => setShowInfo((s) => !s)}
                aria-label={t('cvBuilder.modelPicker.whatsDifference')}
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
                      aria-label={t('cvBuilder.modelPicker.close')}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {tierLabel('light')}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {t('cvBuilder.modelPicker.standardBlurb', { standardLabel })}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {tierLabel('flagship')}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {t('cvBuilder.modelPicker.flagshipBlurb')}
                    </p>
                    {proModels.some((m) => proBlurbFor(m.id)) && (
                      <ul className="mt-1.5 space-y-1">
                        {proModels
                          .filter((m) => proBlurbFor(m.id))
                          .map((m) => (
                            <li
                              key={m.id}
                              className="relative pl-3.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300 before:content-['·'] before:absolute before:left-0 before:text-slate-400 dark:before:text-slate-500"
                            >
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {modelLabel(m.id)}
                              </span>{' '}
                              — {proBlurbFor(m.id)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 italic">
                    {t('cvBuilder.modelPicker.notSure', {
                      standardLabel: tierLabel('light'),
                      flagshipLabel: tierLabel('flagship'),
                    })}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {rows.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                {t('cvBuilder.modelPicker.noModels')}
              </p>
            ) : (
              <>
                <div className="py-1">{rows.map(renderRow)}</div>
                <p className="px-3 py-2 text-[10px] leading-snug text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                  {t('cvBuilder.modelPicker.footnote', {
                    standardLabel: tierLabel('light'),
                    flagshipLabel: tierLabel('flagship'),
                  })}
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
