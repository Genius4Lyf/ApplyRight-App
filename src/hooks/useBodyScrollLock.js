import { useLayoutEffect } from 'react';

// Track how many overlays currently want the body locked. Multiple drawers/sheets
// can be open at once (or unmount in any order); we only release the lock when the
// last one lets go so a closing sheet can't unlock the body out from under an open one.
let lockCount = 0;
let savedScrollY = 0;

/**
 * Locks background page scroll while `locked` is true.
 *
 * Uses the position:fixed technique (rather than just `overflow: hidden`) because
 * on mobile Safari/Chrome `overflow: hidden` alone does NOT stop the page behind a
 * fixed overlay from scrolling, which is exactly the "page still scrolls / jumps"
 * symptom we're fixing. We snapshot scrollY, pin the body, then restore the exact
 * scroll position on release so the page doesn't jump back to the top.
 */
export default function useBodyScrollLock(locked) {
  useLayoutEffect(() => {
    if (!locked) return undefined;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const { body } = document;
      // Compensate for the scrollbar width disappearing (desktop) to avoid a shift.
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
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
        const { body } = document;
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
