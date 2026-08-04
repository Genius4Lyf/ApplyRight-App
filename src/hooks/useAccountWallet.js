import React from 'react';
import { billingService } from '../services';

// Module-level in-flight promises, shared across every mounted instance of the hook.
// The Studio sidebar now has TWO simultaneous consumers (StudioSidebarNav for the
// wallet numbers, StudioSidebarProfile for the plan label) on top of the navbar's own
// mount elsewhere — without this, each mounted instance would fire its own
// /billing/balance and /billing/entitlement request. Whoever's effect runs first
// starts the request; everyone else awaits that SAME promise instead of issuing a
// second one.
let creditsFetchPromise = null;
let entitlementFetchPromise = null;

function fetchCreditsOnce() {
  if (!creditsFetchPromise) {
    creditsFetchPromise = billingService.getBalance().finally(() => {
      creditsFetchPromise = null;
    });
  }
  return creditsFetchPromise;
}

function fetchEntitlementOnce() {
  if (!entitlementFetchPromise) {
    entitlementFetchPromise = billingService.getEntitlement().finally(() => {
      entitlementFetchPromise = null;
    });
  }
  return entitlementFetchPromise;
}

// The account wallet — credits + plan/minutes entitlement — shared by every place the
// account menu renders (the top navbar, the Aria Studio sidebar). Safe to mount more
// than once on the same page: the dedup above ensures only one real request goes out,
// and the mirror into localStorage + the credit-update broadcast that every
// <CreditGate> reads happens identically from whichever instance's fetch resolves.
export function useAccountWallet(isAuthenticated) {
  const [credits, setCredits] = React.useState(null);
  const [entitlement, setEntitlement] = React.useState(null);

  // Derived wallet view (plan tier + live-interview minutes). Free users see
  // credits; paid users see their plan + remaining minutes.
  const tier = entitlement?.tier || 'free';
  const isPaid = tier !== 'free';
  // Combined spendable credits (plan allowance + wallet). Paid users now have a
  // finite balance instead of "unlimited", so show the real number.
  const displayCredits = entitlement?.availableCredits ?? credits;
  const minutesLeft = entitlement?.minutesRemaining ?? null;
  const freeTasteMin = entitlement
    ? Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)
    : null;

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCredits = async () => {
      try {
        const data = await fetchCreditsOnce();
        setCredits(data.credits);
        // Mirror the authoritative balance into localStorage and broadcast it
        // so every <CreditGate> (which reads from localStorage via useCredits)
        // sees the same value as the wallet. Without this, out-of-band grants
        // (referrals, admin top-ups, AdMob SSV callbacks, other tabs) would
        // show the right number here but still trip the credit gates.
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (typeof data?.credits === 'number') {
            user.credits = data.credits;
            localStorage.setItem('user', JSON.stringify(user));
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: data.credits }));
          }
        } catch {
          // localStorage unavailable — non-fatal, wallet state still updates.
        }
      } catch (error) {
        console.error('Failed to fetch credits', error);
      }
    };

    fetchCredits();

    // Listen for real-time updates from other components
    const handleCreditUpdate = (event) => {
      if (typeof event.detail === 'number') {
        setCredits(event.detail);
        // Once entitlement has loaded, the wallet renders its availableCredits in
        // preference to `credits`. Keep that preferred value live too, otherwise
        // the dropdown shows the old balance until a reload after a deduction.
        setEntitlement((current) =>
          current ? { ...current, availableCredits: event.detail } : current
        );
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          storedUser.credits = event.detail;
          localStorage.setItem('user', JSON.stringify(storedUser));
        } catch {
          /* localStorage unavailable — the live wallet state is still correct */
        }
      } else {
        console.warn('⚠️ useAccountWallet: Invalid credit value received:', event.detail);
      }
    };

    window.addEventListener('credit_updated', handleCreditUpdate);
    return () => {
      window.removeEventListener('credit_updated', handleCreditUpdate);
    };
  }, [isAuthenticated]);

  // Subscription/minute entitlement. Fetched on mount and refreshed whenever a
  // purchase or interview fires 'entitlement_updated' (see BillingReturn /
  // MockInterviewPage), so the wallet pill stays current without polling.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const fetchEntitlement = () => fetchEntitlementOnce().then(setEntitlement).catch(() => {});
    fetchEntitlement();
    window.addEventListener('entitlement_updated', fetchEntitlement);
    return () => window.removeEventListener('entitlement_updated', fetchEntitlement);
  }, [isAuthenticated]);

  return {
    credits,
    entitlement,
    tier,
    isPaid,
    displayCredits,
    minutesLeft,
    freeTasteMin,
  };
}
