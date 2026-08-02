import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// The mobile presentation for the rail (left drawer) and the artifact panel (bottom
// sheet). One component because the BEHAVIOUR is identical — scrim, focus trap, Escape,
// Android back — and only the geometry differs. Two implementations would mean two
// places to get the trap wrong.
//
// `side`: 'left' → drawer; 'bottom' → sheet with a grab handle.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const StudioOverlay = ({ open, onClose, side = 'left', label, children }) => {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  const reduce = useReducedMotion();

  // Escape + Android/browser back. The history entry is pushed on open and consumed on
  // close, so the hardware back button dismisses the overlay instead of leaving the
  // Studio — the single most common way a mobile user tries to close a sheet.
  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    window.history.pushState({ studioOverlay: true }, '');

    const onKey = (e) => {
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

    const onPop = () => onClose?.();

    document.addEventListener('keydown', onKey, true);
    window.addEventListener('popstate', onPop);

    // Move focus in so the trap has something to hold, and screen readers land inside.
    const raf = requestAnimationFrame(() => {
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      (nodes?.[0] || panelRef.current)?.focus?.();
    });

    // The page behind must not scroll under the overlay.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('popstate', onPop);
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      // Consume the history entry if we're closing for a reason OTHER than back.
      if (window.history.state?.studioOverlay) window.history.back();
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const isLeft = side === 'left';

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
            className={
              isLeft
                ? 'absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl outline-none flex flex-col'
                : 'absolute inset-x-0 bottom-0 h-[80dvh] max-h-[80dvh] overflow-hidden rounded-t-2xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl outline-none flex flex-col pb-[env(safe-area-inset-bottom)]'
            }
            initial={reduce ? { opacity: 0 } : isLeft ? { x: '-100%' } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : isLeft ? { x: 0 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : isLeft ? { x: '-100%' } : { y: '100%' }}
            transition={
              reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 38 }
            }
          >
            {!isLeft && (
              <div className="shrink-0 pt-2 pb-1 flex justify-center">
                <span className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default StudioOverlay;
