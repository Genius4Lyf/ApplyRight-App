import api from './api';

const billingService = {
  // Get current user credit balance
  getBalance: async () => {
    const response = await api.get('/billing/balance');
    return response.data;
  },

  // Add credits (simulated for now)
  addCredits: async (amount, description) => {
    const response = await api.post('/billing/add', { amount, description });
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

  verifyPayment: async (reference) => {
    const response = await api.post('/billing/verify-payment', { reference });
    return response.data;
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
