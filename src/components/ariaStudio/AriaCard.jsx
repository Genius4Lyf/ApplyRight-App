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
// `wide` opts a card out of the conversational bubble width and lets it fill the chat
// column. Forms are workspaces — a job description needs room to paste and read — while
// chat cards are speech and stay narrow. The contrast is intentional; only form-bearing
// cards should pass it. The chat column's own padding still bounds a wide card, so
// nothing can overflow horizontally.
//
// Every card's own root div supplies the shadow (shadow-sm/shadow-md classes) — this
// wrapper only handles the bloom animation and the trailing mark — so a card always
// reads as a raised, clickable surface rather than a flat message.
const AriaCard = React.forwardRef(({ cardKey, children, wide = false }, ref) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      key={cardKey}
      className={`aria-row self-start flex flex-col items-start gap-1.5 ${
        wide ? 'w-full max-w-none' : 'max-w-[92%]'
      }`}
      {...portalCard(reduce)}
    >
      {children}
      <AriaOrbit size={16} className="aria-mark ml-1" />
    </motion.div>
  );
});

AriaCard.displayName = 'AriaCard';

export default AriaCard;
