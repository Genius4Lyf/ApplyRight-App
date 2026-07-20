// Aria's motion language — one spring, scaled to what's arriving. Import everywhere Aria speaks.
export const SPRING = { type: 'spring', stiffness: 500, damping: 30, mass: 0.85 }; // messages
export const SPRING_CARD = { type: 'spring', stiffness: 460, damping: 32, mass: 1 }; // suggestion cards
export const SPRING_POP = { type: 'spring', stiffness: 600, damping: 18, mass: 0.7 }; // confirm check
export const EASE_CRUMB = { duration: 0.4, ease: [0.22, 1, 0.36, 1] }; // step crumb

// tail-anchored bubble entrance. side: 'aria' (bottom-left) | 'user' (bottom-right).
export const bubbleAnim = (side, reduce) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18 } }
    : {
        initial: { opacity: 0, y: 14, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: SPRING,
        style: { originX: side === 'user' ? 1 : 0, originY: 1 },
      };

// heavier card entrance (suggestion / drafted-bullet cards)
export const cardAnim = (reduce) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, y: 18, scale: 0.94 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: SPRING_CARD,
        style: { originX: 0, originY: 1 },
      };

// step crumb (compacted history) — soft drop from above
export const crumbAnim = (reduce) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: -8, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: EASE_CRUMB,
      };

// chip group: chipStagger on the PARENT (variants), chipItem on each child
export const chipStagger = { animate: { transition: { staggerChildren: 0.045 } } };
export const chipItem = (reduce) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 8, scale: 0.8 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { type: 'spring', stiffness: 600, damping: 24 },
      };

// Portal card — an Aria action (picker/consent/results) blooms from her orbit and
// collapses back into it. Origin is the bubble's bottom-left (where her mark sits).
export const portalCard = (reduce) =>
  reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, scale: 0.4 },
        animate: { opacity: 1, scale: 1, transition: SPRING },
        exit: { opacity: 0, scale: 0.15, transition: { duration: 0.32, ease: [0.5, 0, 0.75, 0] } },
        style: { transformOrigin: 'left bottom', willChange: 'transform' },
      };
