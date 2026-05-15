import { useEffect, useState, useCallback } from 'react';

// Reads credits from localStorage user object and stays in sync with the
// `credit_updated` custom event that Dashboard / CreditStore / etc. dispatch
// after any deduction or top-up. Centralises the previously-scattered
// `JSON.parse(localStorage.getItem('user')).credits` pattern.
const readCredits = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const value = user?.credits;
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
};

export function useCredits() {
  const [credits, setCredits] = useState(readCredits);

  useEffect(() => {
    const handleCreditUpdate = (event) => {
      if (typeof event.detail === 'number') {
        setCredits(event.detail);
      } else {
        // Fallback: re-read from localStorage if event payload is missing
        setCredits(readCredits());
      }
    };
    const handleStorage = () => setCredits(readCredits());

    window.addEventListener('credit_updated', handleCreditUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('credit_updated', handleCreditUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const hasEnough = useCallback((cost) => credits != null && credits >= cost, [credits]);
  const shortBy = useCallback(
    (cost) => (credits == null ? cost : Math.max(0, cost - credits)),
    [credits]
  );

  return { credits, hasEnough, shortBy };
}

export default useCredits;
