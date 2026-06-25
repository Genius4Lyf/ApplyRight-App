import { useEffect, useState } from 'react';

// Web screenshot DETERRENT (not a true block — browsers expose no screenshot API).
// We blur the protected content whenever the page loses focus or is hidden, which
// is what happens when a user opens the Snipping Tool / alt-tabs to a capture app,
// and briefly on a PrintScreen / capture key combo. This catches the common
// snip-and-grab flows; a raw PrtScn full-frame grab or a phone photo still gets
// through (those carry the watermark instead). Native apps use FLAG_SECURE for a
// real block — see the production notes.
export function useScreenshotGuard() {
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    let revealTimer = null;
    const hide = () => setObscured(true);
    const reveal = () => setObscured(false);
    const onVisibility = () => (document.hidden ? hide() : reveal());
    const onKey = (e) => {
      // PrintScreen, or common OS capture combos (⌘⇧, Win+Shift+S → Shift held).
      if (e.key === 'PrintScreen' || (e.shiftKey && (e.metaKey || e.getModifierState?.('Meta')))) {
        hide();
        clearTimeout(revealTimer);
        revealTimer = setTimeout(reveal, 1500);
      }
    };

    window.addEventListener('blur', hide);
    window.addEventListener('focus', reveal);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keyup', onKey);

    return () => {
      clearTimeout(revealTimer);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', reveal);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  return obscured;
}

export default useScreenshotGuard;
