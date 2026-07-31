import { useEffect, useState, useCallback } from 'react';
import billingService from '../services/billing.service';

// Reads credits from localStorage user object and stays in sync with the
// `credit_updated` custom event that Dashboard / CreditStore / etc. dispatch
// after any deduction or top-up. On mount, the hook ALSO refetches the
// authoritative balance from /billing/balance so out-of-band credit grants
// (referral bonuses, admin top-ups, AdMob SSV callbacks, other tabs) don't
// leave the gate showing "you need credits" while the server says otherwise.
const readCredits = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const value = user?.credits;
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
};

const writeCreditsToLocalStorage = (value) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.credits = value;
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // localStorage unavailable (private mode, quota) — non-fatal, state still updates.
  }
};

export function useCredits() {
  const [credits, setCredits] = useState(readCredits);

  useEffect(() => {
    const handleCreditUpdate = (event) => {
      if (typeof event.detail === 'number') {
        setCredits(event.detail);
        writeCreditsToLocalStorage(event.detail);
      } else {
        setCredits(readCredits());
      }
    };
    const handleStorage = () => setCredits(readCredits());

    window.addEventListener('credit_updated', handleCreditUpdate);
    window.addEventListener('storage', handleStorage);

    // Server is the source of truth — fetch once on mount so any out-of-band
    // credit grant (referral bonus, admin top-up, AdMob SSV callback, other
    // tab) becomes visible to every CreditGate, not just the Navbar.
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (token) {
      billingService
        .getBalance()
        .then((data) => {
          if (cancelled) return;
          if (typeof data?.credits === 'number') {
            setCredits(data.credits);
            writeCreditsToLocalStorage(data.credits);
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: data.credits }));
          }
        })
        .catch(() => {
          // Network/auth error — fall back to whatever localStorage has.
        });
    }

    return () => {
      cancelled = true;
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
