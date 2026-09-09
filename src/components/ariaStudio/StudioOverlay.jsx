import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

// The mobile presentation for the rail (left drawer) and for the working panels — the
// live preview, the insights and the job target (right sheet). One component because the
// BEHAVIOUR is identical — scrim, focus trap, Escape, Android back — and only the
// geometry differs. Two implementations would mean two places to get the trap wrong.
//
// `side`:
//   'left'   — the sessions rail. A PARTIAL drawer, on purpose: the page behind stays
//              visible because you are picking a destination, not working.
//   'right'  — the working panels. FULL WIDTH on a phone. It used to be a bottom sheet
//              stopping 4.5rem short of the top, and a bottom sheet reads as a peek —
//              something you pull up, glance at, let fall — which was the wrong framing
//              for a surface people spend minutes inside editing a CV. Capped at 720px
//              so a wide tablet keeps a sliver of chat at the edge rather than having it
//              wiped out; on anything narrower than the cap it is edge to edge.
//
// One consequence of full width has to be named: at that size there is no scrim left to
// tap, so the panel's own close control (all three render one when handed `onClose`),
// Escape, and the Android back button are the entire way out. That is why the history
// entry below is not a nicety.
// ONLY THE TOP SHEET LISTENS.
//
// More than one of these can be open at once, and today that is not hypothetical: Aria
// Studio's rail and its working panel are independent booleans, and the CV Studio has a
// left CV-list drawer alongside its right design sheet. When two were mounted together,
// three things went wrong at once, all of them invisible until someone pressed a key:
//
//   ESCAPE CLOSED BOTH. Both listeners are on `document` in the capture phase, and
//   `e.stopPropagation()` does not stop a sibling listener on the SAME node — only
//   stopImmediatePropagation would. So the guard below read as protective and was not.
//
//   ONE BACK PRESS POPPED THREE ENTRIES. Both handlers fired `onClose`, then both
//   cleanups read `history.state` — which still said `studioOverlay` for the second one,
//   because the first one's `history.back()` had only been queued — and both called
//   back() again. One press, three pops, and the user was off the page entirely.
//
//   FOCUS WENT TO WHICHEVER MOUNTED LAST, regardless of which sheet the user opened.
//
// A module-level stack, in the same spirit as the counter in useBodyScrollLock: each open
// overlay pushes a token, and every global handler returns early unless its own token is
// on top. Closing the top one hands the keyboard and the back button back to the one
// underneath, which is what a stack of sheets should do.
const openStack = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const StudioOverlay = ({ open, onClose, side = 'left', label, children }) => {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const reduce = useReducedMotion();

  // Shared counter-based lock (see useBodyScrollLock) — NOT an independent save/restore
  // of style.overflow. This overlay nests inside a page (Aria Studio) that ALSO locks the
  // body while it's mounted; two uncoordinated lockers racing on unmount is what used to
  // leave the page frozen when "Home" was tapped while this sheet was still open.
  useBodyScrollLock(open);

  // Escape + Android/browser back. The history entry is pushed on open and consumed on
  // close, so the hardware back button dismisses the overlay instead of leaving the
  // Studio — the single most common way a mobile user tries to close a sheet.
  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    window.history.pushState({ studioOverlay: true }, '');

    // Identity by object rather than by index: overlays do not necessarily close in the
    // order they opened, so the cleanup has to find its own entry rather than pop blindly.
    const token = {};
    openStack.push(token);
    const isTop = () => openStack[openStack.length - 1] === token;

    const onKey = (e) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap — cycle within the panel so tabbing can't reach the inert page
      // behind the scrim.
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onPop = () => {
      if (!isTop()) return;
      onClose?.();
    };

    document.addEventListener('keydown', onKey, true);
    window.addEventListener('popstate', onPop);

    // Move focus in so the trap has something to hold, and screen readers land inside.
    const raf = requestAnimationFrame(() => {
      if (!isTop()) return;
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      (nodes?.[0] || panelRef.current)?.focus?.();
    });

    return () => {
      const at = openStack.indexOf(token);
      if (at > -1) openStack.splice(at, 1);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('popstate', onPop);
      cancelAnimationFrame(raf);
      // Consume the history entry if we're closing for a reason OTHER than back.
      if (window.history.state?.studioOverlay) window.history.back();
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const isLeft = side === 'left';

  // Geometry per side, kept as one lookup rather than nested ternaries in the className —
  // adding a fourth side should mean adding a row, not unpicking an expression.
  const geometry = {
    left: 'absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl outline-none flex flex-col',
    // No rounding and no max-height: this is a full-height working surface, and rounded
    // corners on something edge-to-edge only reveal the page behind in two small notches.
    right:
      'absolute inset-y-0 right-0 w-full max-w-[720px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl outline-none flex flex-col pb-[env(safe-area-inset-bottom)]',
  }[side];

  // Each side slides in from its own edge.
  const hidden = { x: isLeft ? '-100%' : '100%' };
  const shown = { x: 0 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:z-50"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/50 dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={geometry}
            initial={reduce ? { opacity: 0 } : hidden}
            animate={reduce ? { opacity: 1 } : shown}
            exit={reduce ? { opacity: 0 } : hidden}
            transition={
              reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 38 }
            }
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default StudioOverlay;
