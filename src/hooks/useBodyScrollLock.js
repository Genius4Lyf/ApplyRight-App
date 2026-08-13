import { useLayoutEffect } from 'react';

// Track how many overlays currently want the page locked. Multiple drawers/sheets/
// full-screen pages can want the lock at once (Aria Studio's own page-level lock PLUS
// its mobile rail drawer / bottom sheet nested inside it), and they can close or unmount
// in any order — a route change can tear the whole tree down bottom-up in one commit,
// or a sheet can close on its own while the page underneath is still locked. Each locker
// independently snapshotting and restoring `style.overflow` is exactly how that leaves
// the page stuck: whichever locker unwinds LAST clobbers the value an earlier one
// already restored. A shared counter fixes that at the root — only the very last
// release actually unlocks, and it always unlocks to the true original values.
let lockCount = 0;
let savedScrollY = 0;
let savedHtmlOverflow = '';

/**
 * Locks background page scroll while `locked` is true.
 *
 * Uses the position:fixed technique on the body (rather than just `overflow: hidden`)
 * because on mobile Safari/Chrome `overflow: hidden` alone does NOT stop the page behind
 * a fixed overlay from scrolling, which is exactly the "page still scrolls / jumps"
 * symptom we're fixing. We snapshot scrollY, pin the body, then restore the exact
 * scroll position on release so the page doesn't jump back to the top. `documentElement`
 * is locked alongside it with plain `overflow: hidden` — some mobile browsers still
 * rubber-band the html element itself under a fixed body.
 */
export default function useBodyScrollLock(locked) {
  useLayoutEffect(() => {
    if (!locked) return undefined;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const { body, documentElement } = document;
      savedHtmlOverflow = documentElement.style.overflow;
      documentElement.style.overflow = 'hidden';
      // Compensate for the scrollbar width disappearing (desktop) to avoid a shift.
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      body.style.position = 'fixed';
      body.style.top = `-${savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const { body, documentElement } = document;
        documentElement.style.overflow = savedHtmlOverflow;
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.paddingRight = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [locked]);
}
