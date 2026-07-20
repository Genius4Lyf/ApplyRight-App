import { useEffect } from 'react';
// Smooth-scroll a chat container to its newest message when `deps` change. Re-runs on
// the next frame and again after entrance/height animations settle (~340ms), so the
// last message lands FULLY in view even while the panel is still resizing — e.g. the
// focus-mode header sliding in shrinks the chat area right after the first scroll.
export function useStickToBottom(ref, deps, reduce) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const toBottom = (behavior) => el.scrollTo({ top: el.scrollHeight, behavior });
    toBottom(reduce ? 'auto' : 'smooth');
    const raf = requestAnimationFrame(() => toBottom('auto')); // catch entrance layout
    const settle = setTimeout(() => toBottom(reduce ? 'auto' : 'smooth'), 340); // after header slide
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
