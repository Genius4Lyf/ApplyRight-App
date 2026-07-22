import React from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { portalCard } from '../../lib/ariaMotion';
import AriaOrbit from '../cv/AriaOrbit';

// The orbit-portal wrapper for every Aria ACTION card in the Studio (job picker, tailor
// plan, consent, results). Her orbit mark sits to the left; the body blooms out of it on
// enter and collapses back into it on exit, so an action always reads as coming FROM
// Aria — no phase-swap, everything inline in the chat stream.
//
// Usage (Phase 1+), inside StudioChat's <AnimatePresence>:
//   {phase === 'plan' && <AriaCard cardKey="plan"><TailorPlan …/></AriaCard>}
//
// `wide` opts a card out of the conversational bubble width and lets it fill the chat
// column. Forms are workspaces — a job description needs room to paste and read — while
// chat cards are speech and stay narrow. The contrast is intentional; only form-bearing
// cards should pass it. The chat column's own padding still bounds a wide card, so
// nothing can overflow horizontally.
const AriaCard = React.forwardRef(({ cardKey, children, wide = false }, ref) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      key={cardKey}
      className={`self-start flex items-start gap-2 ${wide ? 'w-full max-w-none' : 'max-w-[92%]'}`}
      {...portalCard(reduce)}
    >
      <AriaOrbit size={16} className="mt-2" />
      {children}
    </motion.div>
  );
});

AriaCard.displayName = 'AriaCard';

export default AriaCard;
