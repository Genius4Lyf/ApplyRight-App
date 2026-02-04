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
    }
};

export default billingService;
