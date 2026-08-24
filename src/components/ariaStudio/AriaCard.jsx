import React from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { portalCard } from '../../lib/ariaMotion';
import AriaOrbit from '../cv/AriaOrbit';

// The orbit-portal wrapper for every Aria ACTION card in the Studio (job picker, tailor
// plan, consent, results). The body blooms up on enter and collapses back down on exit,
// so an action always reads as coming FROM Aria — no phase-swap, everything inline in
// the chat stream. Her orbit mark trails BELOW the card (Claude-style: a response marker
// that follows the content, not a badge stuck to its side).
//
// A card is always the LAST thing in the stream, so `aria-row` normally resolves the
// mark to this card (see the .aria-row rules in index.css — only the final Aria row
// shows its mark).
//
// Usage (Phase 1+), inside StudioChat's <AnimatePresence>:
//   {phase === 'plan' && <AriaCard cardKey="plan"><TailorPlan …/></AriaCard>}
//
// Every card fills the chat column's full width. The chat column's own padding still
// bounds it, so nothing can overflow horizontally.
//
// Every card's own root div supplies the shadow (shadow-sm/shadow-md classes) — this
// wrapper only handles the bloom animation and the trailing mark — so a card always
// reads as a raised, clickable surface rather than a flat message.
const AriaCard = React.forwardRef(({ cardKey, children }, ref) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      key={cardKey}
      className="aria-row aria-response-card self-start flex flex-col items-start gap-1.5 w-full max-w-none"
      {...portalCard(reduce)}
    >
      {children}
      <AriaOrbit size={16} className="aria-mark ml-1" />
    </motion.div>
  );
});

AriaCard.displayName = 'AriaCard';

export default AriaCard;
