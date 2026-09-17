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

// ─── THE DOCK: everything that opens at the bottom of the chat ───
//
// The composer dock is the one place in the studio where things appear UNDER the user's hands
// rather than in the scroll. Whatever opens there pushes the textarea down, so an abrupt
// appearance reads as a layout bug — but a leisurely one reads as lag.
//
// Tuned once, for speed. The first version of this spring settled over about half a second and
// felt sluggish: these things open under the hand that just tapped them, so the movement has to
// be over almost as soon as it is noticed. Stiff enough to arrive immediately, damped enough
// not to wobble on the way in.
export const SPRING_DOCK = { type: 'spring', stiffness: 700, damping: 40, mass: 0.7 };

// Exits are shorter than entrances, always. An entrance is showing you something and is worth
// a beat; an exit is getting out of the way, and any time it spends is time you are waiting.
// Sharp in, so it commits to leaving immediately rather than drifting.
export const EASE_OUT_FAST = { duration: 0.14, ease: [0.4, 0, 1, 1] };

// A notice that opens ABOVE the composer (call ended, out of minutes). The height is animated
// as well as the contents, so the textarea slides down to make room instead of being shoved —
// which is why the element this is spread onto must be `overflow-hidden`.
export const dockCardAnim = (reduce) =>
  reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { height: 0, opacity: 0, y: 10 },
        animate: { height: 'auto', opacity: 1, y: 0, transition: SPRING_DOCK },
        exit: { height: 0, opacity: 0, y: 6, transition: EASE_OUT_FAST },
        style: { overflow: 'hidden' },
      };

// The call itself arriving in place of the textarea. Weightier and a touch slower than a card:
// this is the whole input surface changing, and it should feel like the room going quiet
// rather than like another card sliding in.
export const callEnterAnim = (reduce) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, y: 16, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { type: 'spring', stiffness: 300, damping: 30, mass: 1.1 },
        style: { transformOrigin: 'center bottom' },
      };

// A popover anchored above its own chip (desktop call settings), CENTRED on that chip. Grows
// out of the chip, so the origin is the bottom centre — the edge it is attached to.
//
// The `x: '-50%'` is the centring, and it has to live here rather than as a `-translate-x-1/2`
// class: framer writes the whole `transform` inline to animate scale and y, which silently
// overrides any Tailwind translate on the same element and drops the popover half a width to
// the right. Anything spread with this belongs on an element positioned `left-1/2`.
export const popoverAnim = (reduce) =>
  reduce
    ? {
        initial: { opacity: 0, x: '-50%' },
        animate: { opacity: 1, x: '-50%' },
        exit: { opacity: 0, x: '-50%' },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, y: 8, scale: 0.94, x: '-50%' },
        animate: { opacity: 1, y: 0, scale: 1, x: '-50%', transition: SPRING_DOCK },
        exit: { opacity: 0, y: 4, scale: 0.97, x: '-50%', transition: EASE_OUT_FAST },
        style: { transformOrigin: 'center bottom' },
      };

// The same content on a phone, as a sheet off the bottom edge. Not a style choice: a popover
// anchored to a chip that sits anywhere along a wrapping row will hang off whichever screen
// edge the chip happens to be near, and no amount of max-width fixes that.
export const sheetAnim = (reduce) =>
  reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { y: '110%' },
        animate: { y: 0, transition: SPRING_DOCK },
        exit: { y: '110%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
      };

// The scrim behind a sheet. Plain opacity — anything springy behind a springy panel reads as
// two separate animations rather than one movement.
export const scrimAnim = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// A centred dialog arriving over a scrim. Rises very slightly as it scales up, so it reads as
// coming toward the reader rather than being switched on.
//
// A TWEEN, not a spring. A spring's overshoot is what gives a small control its bounce, but at
// dialog size the same overshoot reads as the whole panel wobbling. This is a fast expo-out
// instead: nearly all the distance is covered in the first few frames, so it feels immediate
// and then simply stops.
//
// Both halves are here, so the caller must keep the dialog mounted through its exit — wrap it
// in an AnimatePresence, or `open && <Modal/>` will unmount it mid-animation and only the
// entrance will ever be seen.
export const modalAnim = (reduce) =>
  reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        // 0.14s, and a short distance to cover. Anything slower on something this large reads
        // as the dialog taking its time to decide, which is the opposite of premium: the
        // reader has already committed by tapping, so the panel's only job is to be there.
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
        },
        exit: {
          opacity: 0,
          y: 4,
          scale: 0.985,
          transition: { duration: 0.11, ease: [0.4, 0, 1, 1] },
        },
      };

// A control that should feel like it takes the press. Used on the call chips: they are small,
// and a colour change alone does not register as "I hit it" on a touch screen.
export const pressable = (reduce) =>
  reduce ? {} : { whileTap: { scale: 0.96 }, transition: SPRING_POP };

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
