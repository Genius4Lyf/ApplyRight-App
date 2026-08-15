import React, { useState, useEffect } from 'react';

// Reveals `text` a few characters at a time, like tokens streaming in — used ONLY for
// a freshly-arrived Aria reply (see revealedRef in StudioChat), never for restored
// history, so reopening a session doesn't replay every past message. Reduced motion
// shows the full text immediately, matching the app's other reduced-motion bailouts.
const TYPE_CHARS_PER_TICK = 3;
const TYPE_TICK_MS = 16;
const AriaTypewriter = ({ text, reduce, onDone }) => {
  const [count, setCount] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      onDone?.();
      return undefined;
    }
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(text.length, n + TYPE_CHARS_PER_TICK);
      setCount(n);
      if (n >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, TYPE_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return text.slice(0, count);
};

export default AriaTypewriter;
