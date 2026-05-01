import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a flag true for at least `minMs` after it first becomes true, even
 * after the source flag flips back to false. Lets short-lived loading states
 * still display long enough for the user to read a tip / spinner.
 *
 * Usage:
 *   const showLoader = useMinVisible(isLoading, 4000);
 *   {showLoader && <LoadingWithAd ... />}
 */
export function useMinVisible(active, minMs = 4000) {
  const [visible, setVisible] = useState(active);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      if (startTimeRef.current == null) {
        startTimeRef.current = Date.now();
      }
      return;
    }

    if (!visible) return;

    const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
    const remaining = Math.max(0, minMs - elapsed);
    const timer = setTimeout(() => {
      setVisible(false);
      startTimeRef.current = null;
    }, remaining);
    return () => clearTimeout(timer);
  }, [active, minMs, visible]);

  return visible;
}
