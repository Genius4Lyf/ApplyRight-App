import api from './api';

const jobSearchService = {
  // Search jobs from both sources (paginated)
  search: (params) => api.post('/job-search/search', params).then((r) => { console.log('🔍 [API] searchJobs response:', r.data); return r.data; }),

  // Trending jobs (no profile needed, paginated)
  getTrending: (source = 'mixed', page = 1, limit = 10) =>
    api.get(`/job-search/trending?source=${source}&page=${page}&limit=${limit}`).then((r) => { console.log('📈 [API] getTrending response:', r.data); return r.data; }),

  // Browse by source (no profile needed, paginated)
  browse: (source, page = 1, limit = 10) =>
    api.get(`/job-search/browse?source=${source}&page=${page}&limit=${limit}`).then((r) => { console.log('📂 [API] browse response:', r.data); return r.data; }),

  // Get cached search results
  getSearch: (searchId) => api.get(`/job-search/search/${searchId}`).then((r) => r.data),

  // Auto-matched jobs from profile/CV (personalized, paginated)
  getRecommendations: (page = 1, limit = 10) =>
    api.get(`/job-search/recommendations?page=${page}&limit=${limit}`).then((r) => { console.log('💡 [API] getRecommendations response:', r.data); return r.data; }),

  // Get full job description
  getJobDetails: (searchId, resultId) =>
    api.post(`/job-search/${searchId}/details/${resultId}`).then((r) => { console.log('📝 [API] getJobDetails (Raw HTML/Snippet):', r.data); return r.data; }),

  // Track apply click (CPC)
  trackClick: (searchId, resultId) =>
    api.post(`/job-search/${searchId}/click/${resultId}`).then((r) => r.data),

  // Toggle bookmark
  toggleSave: (searchId, resultId) =>
    api.post(`/job-search/${searchId}/save/${resultId}`).then((r) => r.data),

  // Get all saved jobs (paginated)
  getSavedJobs: (page = 1, limit = 10) =>
    api.get(`/job-search/saved?page=${page}&limit=${limit}`).then((r) => r.data),

  // Quick ATS score (no credits)
  quickScore: (searchId, resultId, cvId) =>
    api.post(`/job-search/${searchId}/quick-score/${resultId}`, { cvId }).then((r) => r.data),

  // Tailor CV for a job (costs credits)
  tailorCV: (searchId, resultId, cvId) =>
    api.post(`/job-search/${searchId}/tailor/${resultId}`, { cvId }).then((r) => r.data),

  // Tailor bundle (CV + cover letter + interview)
  tailorBundle: (searchId, resultId, cvId) =>
    api.post(`/job-search/${searchId}/tailor-bundle/${resultId}`, { cvId }).then((r) => r.data),

  // Update job profile (onboarding)
  updateJobProfile: (profile) => api.put('/job-search/profile', profile).then((r) => r.data),
};

export default jobSearchService;
