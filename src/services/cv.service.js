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

  // Generate bullet points using AI.
  // - summary/project → { suggestions, lockedCount }
  // - experience → two-tier payload: { isPaid, ai:{title,suggestions},
  //   ats:{title,suggestions,locked}, limits:{selectMax,bulletMax} }. Free users
  //   get real "AI suggestions" + a blurred "ApplyRight ATS" teaser; paid users
  //   get real, JD-keyword-targeted ApplyRight ATS suggestions. draftId lets the
  //   server reuse the cached target-job keywords for ATS generation.
  generateBullets: async (role, context, type, targetJob, draftId) => {
    const response = await api.post('/ai/generate-bullets', {
      role,
      context,
      type,
      targetJob,
      draftId,
    });
    return response.data;
  },

  // Reveal the free user's ONE-TIME real ApplyRight ATS suggestions for a role.
  // Called only when the user clicks "Reveal" — this is where the lifetime taste
  // is spent (server-side, atomic). Returns { taste, ats:{suggestions,locked},
  // limits }, or HTTP 409 { code:'TASTE_USED' } if it was already used.
  revealAtsTaste: async (role, context, targetJob, draftId) => {
    const response = await api.post('/ai/reveal-ats-taste', {
      role,
      context,
      targetJob,
      draftId,
    });
    return response.data;
  },

  // ApplyRight Suggested Summary — professional-summary variations by tone.
  // Free users get the Professional tone real + the rest as locked teasers; paid
  // get all tones. Returns { isPaid, tones:[{key,label,text,locked}] }.
  generateSummaries: async (role, context) => {
    const response = await api.post('/ai/generate-summaries', { role, context });
    return response.data;
  },

  // CV Coach "Deep Scan": Job Match + Career Match + recruiter red-flags for a
  // draft. Paid users run it freely; free users get one lifetime taste (spent
  // server-side, atomic). Returns { isPaid, locked?, taste?, tasteAvailable,
  // jobMatch, careerMatch, redFlags }. A 402/403/502 surfaces as a thrown error.
  coachDeepScan: async (draftId, jobDescription) => {
    const response = await api.post('/coach/deep-scan', { draftId, jobDescription });
    return response.data;
  },

  // Live conversational AI coach message for the current builder step. Returns
  // { message, guide, tone, limited, remaining } — or { limited:true } when the
  // free daily quota is spent, or { fallback:true } when AI is unavailable. The
  // caller falls back to the instant scripted coach in those cases.
  coachGuide: async (draftId, step, signal, cvData) => {
    const response = await api.post('/coach/guide', { draftId, step, signal, cvData });
    return response.data;
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

  // Generate PDF (Puppeteer). Throws an Error with `.code === 'NEED_DOWNLOAD'`
  // when the user is out of download entitlement (so callers can show the
  // paywall). Because the request is a blob, a 402 JSON body arrives as a Blob
  // and must be read back to text first.
  generatePdf: async (htmlContent, options = {}, metadata = {}) => {
    try {
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
    } catch (error) {
      if (error.response?.status === 402 && error.response.data) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          const e = new Error(json.message || 'Payment required to download');
          e.code = json.code || 'NEED_DOWNLOAD';
          throw e;
        } catch (parseErr) {
          if (parseErr.code) throw parseErr;
          const e = new Error('Payment required to download');
          e.code = 'NEED_DOWNLOAD';
          throw e;
        }
      }
      throw error;
    }
  },
};

export default CVService;
