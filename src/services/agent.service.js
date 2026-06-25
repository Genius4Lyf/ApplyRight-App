import api from './api';

// API calls for CV-agent accounts. The dashboard summary is the only agent
// endpoint (client folders were removed). Gated server-side by the `agent`
// middleware (/api/agent/*).
const AgentService = {
  // Dashboard earnings/usage summary. Optional { from, to } ISO date strings
  // narrow the download counts + chart to a range.
  getSummary: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/agent/summary', { params });
    return res.data;
  },
};

export default AgentService;
