import api from './api';

const billingService = {
  // Get current user credit balance
  getBalance: async () => {
    const response = await api.get('/billing/balance');
    return response.data;
  },

  // Get transaction history
  getTransactions: async () => {
    const response = await api.get('/billing/transactions');
    return response.data;
  },

  // Watch Ad Reward
  watchAd: async (type = 'video') => {
    const response = await api.post('/billing/watch-ad', { type });
    return response.data;
  },

  // Get Ad Stats
  getAdStats: async () => {
    const response = await api.get('/billing/ad-stats');
    return response.data;
  },

  // --- Flutterwave one-time payments ---

  // Start a checkout for a catalog item; returns { link, txRef }.
  checkout: async (planId, currency = 'NGN') => {
    const response = await api.post('/billing/checkout', { planId, currency });
    return response.data;
  },

  // Verify a payment on redirect-return (webhook fallback).
  // Returns { status, entitlement }.
  verifyPayment: async ({ txRef, transactionId }) => {
    const response = await api.post('/billing/verify', { txRef, transactionId });
    return response.data;
  },

  // Current subscription/minute entitlement.
  getEntitlement: async () => {
    const response = await api.get('/billing/entitlement');
    return response.data;
  },

  /**
   * Poll /verify until the payment is settled or the deadline passes — covers the
   * race where the user lands on the return page before the webhook fires.
   * Returns the final { status, entitlement }.
   */
  pollVerifyUntilSettled: async (
    { txRef, transactionId },
    { intervalMs = 1500, timeoutMs = 15000 } = {}
  ) => {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < deadline) {
      try {
        last = await billingService.verifyPayment({ txRef, transactionId });
        if (last?.status === 'successful') return last;
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return last || { status: 'pending', entitlement: null };
  },

  /**
   * Poll /balance until the user's credit balance exceeds `baseline`, or
   * `timeoutMs` elapses. Used by the AdMob Rewarded Video flow on Android:
   * the actual credit grant lands via Google's SSV callback to the backend,
   * so the client just watches for the balance to tick up.
   *
   * Returns { credits, increased: true } on success, or
   *         { credits, increased: false } if the deadline passes.
   */
  pollBalanceUntilIncrease: async (baseline, { intervalMs = 1500, timeoutMs = 12000 } = {}) => {
    const deadline = Date.now() + timeoutMs;
    let lastCredits = baseline;
    while (Date.now() < deadline) {
      try {
        const data = await billingService.getBalance();
        lastCredits = data?.credits ?? lastCredits;
        if (lastCredits > baseline) {
          return { credits: lastCredits, increased: true };
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { credits: lastCredits, increased: false };
  },
};

export default billingService;
