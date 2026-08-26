import React, { createContext, useContext } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { portalCard } from '../../lib/ariaMotion';
import AriaOrbit from '../cv/AriaOrbit';

// Whether the card currently on screen should stand down for the conversation.
//
// A card asking "shall we do projects next?" used to sit at full size while the user typed
// a completely different question underneath it, so the chat had to happen around a panel
// that wasn't part of it. When the user starts talking instead of tapping, the card shrinks
// to a line they can tap to get back — the step is never lost, it just stops competing.
//
// ONLY prompts and forms take part. A card HOLDING something — generated skills waiting to
// be applied, a summary draft, rewritten bullet rows — always stays full size, because
// shrinking work the user has already paid for is how it gets forgotten.
//
// Provided by StudioChat, which is the one place that knows both the phase and whether the
// user has spoken since the card appeared. Cards are phase-gated so only one is ever on
// screen, which is why a single value can drive this without per-card plumbing.
const CardCollapseContext = createContext(null);

export const CardCollapseProvider = CardCollapseContext.Provider;

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
  const collapse = useContext(CardCollapseContext);
  const collapsed = !!collapse?.collapsed && !!collapse?.label;

  return (
    <motion.div
      ref={ref}
      key={cardKey}
      className="aria-row aria-response-card self-start flex flex-col items-start gap-1.5 w-full max-w-none"
      {...portalCard(reduce)}
    >
      {collapsed ? (
        // Deliberately a RULE, not a small card: it reads as a place in the conversation
        // you can return to, rather than a second thing demanding attention.
        <button
          type="button"
          onClick={collapse.expand}
          className="group w-full flex items-center gap-2 px-1 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg"
        >
          <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
            {collapse.label}
          </span>
          <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
        </button>
      ) : (
        children
      )}
      <AriaOrbit size={16} className="aria-mark ml-1" />
    </motion.div>
  );
});

AriaCard.displayName = 'AriaCard';

export default AriaCard;
