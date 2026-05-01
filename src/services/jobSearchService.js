import api from './api';

const jobSearchService = {
  // Search jobs from both sources (paginated)
  search: (params) => api.post('/job-search/search', params).then((r) => r.data),

  // Trending jobs (paginated)
  getTrending: (source = 'mixed', page = 1, limit = 10) =>
    api.get(`/job-search/trending?source=${source}&page=${page}&limit=${limit}`).then((r) => r.data),

  // Browse by source (paginated)
  browse: (source, page = 1, limit = 10) =>
    api.get(`/job-search/browse?source=${source}&page=${page}&limit=${limit}`).then((r) => r.data),

  // Get cached search results
  getSearch: (searchId) => api.get(`/job-search/search/${searchId}`).then((r) => r.data),

  // Get full job description
  getJobDetails: (searchId, resultId) =>
    api.post(`/job-search/${searchId}/details/${resultId}`).then((r) => r.data),

  // Track apply click (CPC)
  trackClick: (searchId, resultId) =>
    api.post(`/job-search/${searchId}/click/${resultId}`).then((r) => r.data),
};

export default jobSearchService;
