import api from './api';

// API calls for CV-agent accounts: client folders + dashboard summary.
// All endpoints are gated server-side by the `agent` middleware (/api/agent/*).
const AgentService = {
  // Dashboard counts: { clientCount, cvCount }
  getSummary: async () => {
    const res = await api.get('/agent/summary');
    return res.data;
  },

  // List the agent's clients, each with a cvCount.
  listClients: async () => {
    const res = await api.get('/agent/clients');
    return res.data;
  },

  getClient: async (id) => {
    const res = await api.get(`/agent/clients/${id}`);
    return res.data;
  },

  createClient: async (payload) => {
    const res = await api.post('/agent/clients', payload);
    return res.data;
  },

  updateClient: async (id, payload) => {
    const res = await api.patch(`/agent/clients/${id}`, payload);
    return res.data;
  },

  deleteClient: async (id) => {
    const res = await api.delete(`/agent/clients/${id}`);
    return res.data;
  },

  // CVs filed under a given client.
  getClientCVs: async (id) => {
    const res = await api.get(`/agent/clients/${id}/cvs`);
    return res.data;
  },
};

export default AgentService;
