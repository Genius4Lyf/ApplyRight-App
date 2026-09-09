import { useCallback, useSyncExternalStore } from 'react';

// SUBSCRIBE TO A MEDIA QUERY AS WHAT IT IS — an external store.
//
// `useSyncExternalStore` reads the CURRENT value on every render rather than mirroring it
// into state via an effect. That is the whole point: no cascading render on resize, and no
// window in which React's copy of the viewport disagrees with the viewport.
//
// This was written three times — privately inside useStudioLayout and useWorkspaceLayout,
// and about to be written a fourth time for the CV Studio's design rail. The two existing
// copies had already diverged in one load-bearing way, which is the argument for having
// one: only useWorkspaceLayout's guarded `window.matchMedia`. That guard is kept here.
//
// WHY IT MATTERS THAT THE GUARD IS IN THE HOOK. jsdom does not implement matchMedia, and
// suites that never cared about widths do not stub it. Guarding here rather than in each
// consumer means a component that only *might* ask about the viewport can be rendered in
// such a test and simply read as "not matching", instead of throwing on mount.
const query = (q) =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;

/**
 * Does the viewport match this media query right now?
 *
 * @param {string} q a media query string, e.g. `(min-width: 1024px)`
 * @returns {boolean}
 */
export default function useMedia(q) {
  const subscribe = useCallback(
    (onChange) => {
      const mq = query(q);
      if (!mq) return () => {};
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [q]
  );
  return useSyncExternalStore(
    subscribe,
    () => query(q)?.matches ?? false,
    // Server / prerender: assume the widest layout. A narrow guess would mount the mobile
    // presentation — which for several consumers is a portal with a focus trap — into a
    // document that has no viewport to justify it.
    () => false
  );
}
