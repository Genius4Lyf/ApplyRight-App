import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import TrashFlash from '../components/ui/TrashFlash';

// Raise the wordless delete acknowledgement. See components/ui/TrashFlash for WHY a
// successful delete no longer says anything: the row vanishing from the list is the real
// confirmation, and a worded toast was the same news told twice in the corner reserved for
// things that went wrong.
//
// NOT A TOAST, deliberately — this is its own portal.
//
// It started as `toast.custom(..., { position: 'top-center' })`. Sonner types that option
// and accepts it without complaint, but the app mounts ONE <Toaster position="top-right">
// and the flash kept coming out in that corner regardless. Rather than keep guessing at
// which of sonner's internals decides placement, this owns its own fixed, centred node:
// there is nothing left to disagree with it.
//
// It also says something true about the thing — it is a gesture standing in for the row you
// just watched disappear, not a notification, so sharing a stack with error messages (and
// being pushed down the screen by one) was always slightly wrong.
//
// `toast.error` at every call site is untouched: a failure still needs words.
const HOLD_MS = 1100; // how long it sits before fading
const FADE_MS = 220; // the fade itself, after which the node is torn down

export const trashFlash = () => {
  if (typeof document === 'undefined') return;

  const host = document.createElement('div');
  // INLINE STYLES, not Tailwind classes, and that is the point. Utility classes written
  // inside a JS string are only as reliable as the scanner that has to find them there — if
  // `left-1/2 -translate-x-1/2` were ever purged, this would silently pin to the top-LEFT,
  // which is indistinguishable from the sonner bug this replaced. Nothing to purge here.
  //
  // `pointerEvents: none` so a flash over a list never swallows the next click: deleting
  // two rows shouldn't mean waiting out an animation.
  Object.assign(host.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    pointerEvents: 'none',
    opacity: '0',
    transition: `opacity ${FADE_MS}ms ease`,
  });
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(createElement(TrashFlash));

  // Next frame, so the transition has two distinct values to move between.
  requestAnimationFrame(() => {
    host.style.opacity = '1';
  });

  window.setTimeout(() => {
    host.style.opacity = '0';
    window.setTimeout(() => {
      // Unmount before removing the node: tearing the element out from under a live root
      // leaves React holding a detached tree.
      root.unmount();
      host.remove();
    }, FADE_MS);
  }, HOLD_MS);
};
