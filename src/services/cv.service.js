import api from './api';

const CVService = {
  // Save or Update a Draft CV
  saveDraft: async (data) => {
    const response = await api.post('/cv/save', data);
    return response.data;
  },

  // Get all drafts for the current user
  getMyDrafts: async () => {
    const response = await api.get('/cv/my-cvs');
    return response.data;
  },

  // Get a single draft by ID
  getDraftById: async (id) => {
    const response = await api.get(`/cv/${id}`);
    return response.data;
  },

  // Generate bullet points using AI. Returns { suggestions, lockedCount } —
  // lockedCount is the number of trailing suggestions redacted for free users
  // (work-history only); 0 for paid users and for summary/project types.
  generateBullets: async (role, context, type, targetJob) => {
    const response = await api.post('/ai/generate-bullets', {
      role,
      context,
      type,
      targetJob,
    });
    return response.data; // { suggestions, lockedCount }
  },

  // Generate categorized skills
  generateSkills: async (education, experience, projects, targetJob) => {
    const response = await api.post('/ai/generate-skills', {
      education,
      experience,
      projects,
      targetJob,
    });
    return response.data; // Returns { suggestions, remainingCredits }
  },

  // Suggest ATS keywords for the target job. Baseline is free; pass
  // { mode: 'rich', draftId } for the paid AI extraction (charged once per JD).
  getJobKeywords: async (targetJob, opts = {}) => {
    const response = await api.post('/ai/job-keywords', { targetJob, ...opts });
    return response.data; // { keywords, source, charged?, remainingCredits?, aiKeywordsHash? }
  },

  // Live keyword-coverage tracker (free, no AI). Matches the user's skills/
  // bullets against the job keywords via the backend synonym+fuzzy normalizer.
  getKeywordCoverage: async (keywords, { text = '', skills = [] } = {}) => {
    const response = await api.post('/ai/keyword-coverage', { keywords, text, skills });
    return response.data; // { results, covered, total, mustHaveCovered, mustHaveTotal }
  },

  // Delete a draft CV
  deleteDraft: async (id) => {
    const response = await api.delete(`/cv/${id}`);
    return response.data;
  },

  // Generate PDF (Puppeteer)
  generatePdf: async (htmlContent, options = {}, metadata = {}) => {
    const response = await api.post(
      '/pdf/generate',
      {
        html: htmlContent,
        options,
        ...metadata,
      },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

export default CVService;
