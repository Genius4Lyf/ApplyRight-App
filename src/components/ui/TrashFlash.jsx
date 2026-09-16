import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';

// THE DELETE CONFIRMATION THAT DOESN'T SAY ANYTHING.
//
// A successful delete used to raise a worded toast — "CV deleted". The words were the
// problem: the row vanishes from the list at the same moment, which already says it better
// than a sentence can, so the toast was a second announcement of something the user had
// just watched happen — occupying the corner reserved for things that went wrong.
//
// What is left is the smallest possible acknowledgement: a sheet of paper drops into a bin,
// the lid takes it, and both fade. No text, no dismiss button, gone in a beat.
//
// NOT for failures. An error still needs words — which one failed, and whether to retry —
// so `toast.error` is untouched at every call site.
const PAPER = { duration: 0.42, ease: [0.36, 0, 0.66, -0.3] }; // anticipate, then fall in
const LID = { duration: 0.34, ease: [0.22, 1, 0.36, 1] };

const TrashFlash = () => {
  const reduce = useReducedMotion();

  return (
    <div
      // Announced politely rather than silently: someone using a screen reader watched
      // nothing, so the vanished row is not self-evident to them the way it is on screen.
      role="status"
      aria-live="polite"
      className="flex items-center justify-center w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6 overflow-visible" aria-hidden="true">
        {/* The sheet — falls from above the bin and is swallowed by it. */}
        <motion.rect
          x="8.5"
          y="1"
          width="7"
          height="8.5"
          rx="1"
          className="fill-rose-300 dark:fill-rose-400/70"
          initial={reduce ? { opacity: 0 } : { y: -9, opacity: 0, rotate: -8 }}
          animate={
            reduce ? { opacity: 1 } : { y: [-9, -2, 5], opacity: [0, 1, 0], rotate: [-8, -2, 4] }
          }
          transition={reduce ? { duration: 0.2 } : PAPER}
          style={{ transformOrigin: '12px 5px' }}
        />
        {/* The lid lifts to take it, then closes. */}
        <motion.g
          className="stroke-rose-600 dark:stroke-rose-400"
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? false : { rotate: 0 }}
          animate={reduce ? {} : { rotate: [0, -22, -22, 0] }}
          transition={reduce ? { duration: 0 } : { ...LID, times: [0, 0.25, 0.6, 1] }}
          style={{ transformOrigin: '5px 7px' }}
        >
          <path d="M3.5 7h17" />
          <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
        </motion.g>
        {/* The bin itself — a small settle as the sheet lands. */}
        <motion.path
          d="M5.5 7.5l.9 12.1A2 2 0 0 0 8.4 21.5h7.2a2 2 0 0 0 2-1.9l.9-12.1"
          className="stroke-rose-600 dark:stroke-rose-400"
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
          initial={false}
          animate={reduce ? {} : { scaleY: [1, 1, 0.92, 1] }}
          transition={reduce ? { duration: 0 } : { duration: 0.55, times: [0, 0.5, 0.65, 1] }}
          style={{ transformOrigin: '12px 21px' }}
        />
      </svg>
    </div>
  );
};

export default TrashFlash;
