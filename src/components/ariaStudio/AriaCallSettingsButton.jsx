import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
// `motion` is used only via <motion.*> in JSX; this eslint config lacks jsx-uses-vars so it
// reads as unused — the same false positive SectionCoach suppresses.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import AriaCallSettingsControls from './AriaCallSettingsControls';
import { normalizeCallSettings } from '../../lib/ariaCallSettings';
import { popoverAnim, sheetAnim, scrimAnim, pressable } from '../../lib/ariaMotion';
import useMedia from '../../hooks/useMedia';

// The chip beside "Talk it through instead".
//
// It SHOWS the current choice ("Thorough · Friendly") so nobody has to open anything to know
// how the call will go — and most people never will, because the defaults are the call most
// people should have. Opening it is for the ones who know they want something different.
//
// ── TWO PRESENTATIONS, FOR ONE REAL REASON ──
//
// DESKTOP — a popover above the chip. It cannot drop downward: the chip lives in the composer
// dock at the very bottom of the chat, so down is off-screen.
//
// PHONES — a sheet off the bottom edge, with a scrim.
//
// The sheet is not decoration. The chip sits in a `flex-wrap justify-center` row next to the
// call button, so where it lands across the width is a function of how that row wraps — and a
// popover centred on the chip therefore hangs off whichever screen edge the chip is nearest.
// Capping its width (`min(20rem, 100vw - 2rem)`) sized it correctly and still let it sit hard
// against the edge, because the overflow was in the CENTRING, not the width. Anchoring to the
// viewport instead of to the chip is the fix; a sheet is what that looks like on a phone.
//
// Closing: the scrim handles the sheet, and a document listener handles the popover. The
// listener has to know about BOTH nodes — the sheet is portalled to <body>, so it is outside
// wrapRef and a press inside it would otherwise read as "outside" and close the thing being
// used.
const AriaCallSettingsButton = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const reduce = useReducedMotion();
  // jsdom reports no match, so tests get the sheet. Both render the same controls.
  const isWide = useMedia('(min-width: 640px)');
  const current = normalizeCallSettings(value);
  const base = 'ariaStudio.ariaLive.settings';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inChip = wrapRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inChip && !inPanel) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const summary = `${t(`${base}.depth.${current.depth}.label`)} · ${t(
    `${base}.style.${current.style}.label`
  )}`;

  const heading = (
    <p className="mb-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
      {t(`${base}.title`)}
    </p>
  );

  // Positioned `left-1/2`; the matching `x: '-50%'` is inside popoverAnim, not a class — see
  // the note there about framer overwriting Tailwind translates.
  const popover = (
    <motion.div
      key="popover"
      ref={panelRef}
      role="dialog"
      aria-label={t(`${base}.title`)}
      {...popoverAnim(reduce)}
      className="absolute bottom-full left-1/2 z-40 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      {heading}
      <AriaCallSettingsControls value={current} onChange={onChange} />
    </motion.div>
  );

  // `inset-x-3` is the gutter the popover never had: the sheet is measured from the VIEWPORT,
  // so it cannot touch an edge however the chip row happens to wrap. The bottom padding clears
  // the home indicator on a notched phone.
  //
  // The scrim and the panel are SIBLINGS in an array rather than children of one positioned
  // wrapper. AnimatePresence only animates its own direct children out, so a wrapper div
  // between it and these would mean the sheet vanished on close instead of sliding back.
  const sheet = [
    <motion.div
      key="scrim"
      {...scrimAnim}
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[280] bg-black/40 backdrop-blur-[2px] sm:hidden"
      aria-hidden="true"
    />,
    <motion.div
      key="sheet"
      ref={panelRef}
      role="dialog"
      aria-label={t(`${base}.title`)}
      {...sheetAnim(reduce)}
      className="fixed inset-x-3 bottom-3 z-[281] max-h-[80dvh] overflow-y-auto scrollbar-none rounded-2xl border border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:hidden"
    >
      {/* The grab handle is the whole signal that this came from the bottom edge and goes
          back to it. Decorative — dragging is not wired up; the scrim closes it. */}
      <div
        aria-hidden="true"
        className="mx-auto mb-3 h-1 w-9 rounded-full bg-slate-200 dark:bg-slate-700"
      />
      {heading}
      <AriaCallSettingsControls value={current} onChange={onChange} />
    </motion.div>,
  ];

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t(`${base}.open`, { summary })}
        {...pressable(reduce)}
        className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-white dark:hover:text-white"
      >
        <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
        {summary}
      </motion.button>

      {/* The popover belongs to the chip, so it stays in place. The sheet belongs to the
          viewport, so it is portalled out — inside the chat column it would be clipped by the
          dock's own overflow and trapped under the panel that can sit over the chat. */}
      {isWide ? (
        <AnimatePresence>{open && popover}</AnimatePresence>
      ) : typeof document === 'undefined' ? null : (
        createPortal(<AnimatePresence>{open && sheet}</AnimatePresence>, document.body)
      )}
    </div>
  );
};

export default AriaCallSettingsButton;
