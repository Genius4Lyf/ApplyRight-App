import { useCallback, useSyncExternalStore } from 'react';

// "Is this a finger?" — asked of the INPUT DEVICE, not of the screen width. A small window
// on a laptop still has a mouse, and a large tablet still has a finger, so a width
// breakpoint answers the wrong question for anything to do with touch targets.
//
// Needed wherever CSS cannot decide alone. A media query can hide a 14px drag grip on
// touch, but it cannot move a drag listener from that grip onto the whole element — that
// is a prop, and props are chosen in JavaScript.
const COARSE = '(hover: none)';

const query = () => (typeof window !== 'undefined' ? window.matchMedia?.(COARSE) : null);

/**
 * True when the primary input has no hover — a touchscreen.
 *
 * Read as an external store (the same way useStudioLayout reads its breakpoints) rather
 * than mirrored into state, so there is no render where React's copy disagrees with the
 * device. Defaults to FALSE without matchMedia: assuming a mouse leaves the desktop
 * affordances in place, which is the safer of the two guesses.
 */
export function useCoarsePointer() {
  const subscribe = useCallback((onChange) => {
    const mq = query();
    if (!mq?.addEventListener) return () => {};
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false
  );
}

export default useCoarsePointer;
