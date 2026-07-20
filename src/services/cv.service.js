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

  // Rewrite a professional summary into a tighter, shorter version. Charges 1
  // credit (paid tiers draw from their allowance); AI outage 503s with no charge.
  // Returns { tightened, remainingCredits }.
  tightenSummary: async (text) => {
    const response = await api.post('/ai/tighten-summary', { text });
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

  // Generate categorized skills. draftId lets the backend cache the result against
  // the profile inputs so re-opening the modal / re-clicking doesn't re-charge.
  generateSkills: async (education, experience, projects, targetJob, draftId) => {
    const response = await api.post('/ai/generate-skills', {
      education,
      experience,
      projects,
      targetJob,
      draftId,
    });
    return response.data; // { suggestions, bestForRole, isPaid, fromCache, remainingCredits }
  },

  // Suggest ATS keywords for the target job. Baseline is free; pass
  // { mode: 'rich', draftId } for the paid AI extraction (charged once per JD).
  getJobKeywords: async (targetJob, opts = {}) => {
    const response = await api.post('/ai/job-keywords', { targetJob, ...opts });
    return response.data; // { keywords, source, charged?, remainingCredits?, aiKeywordsHash? }
  },

  // Aria "build-with" bullet generation (Chunk 2 endpoint). Turns a described
  // role/project into `count` Role-Brief-grounded bullets. Charges count ×
  // GENERATE_BULLET; the first re-roll of an identical request is free.
  // Distinct from the legacy two-tier generateBullets above.
  coachGenerateBullets: async ({
    draftId,
    section,
    sortId,
    description,
    count,
    reroll = false,
  }) => {
    const response = await api.post('/coach/generate-bullets', {
      draftId,
      section,
      sortId,
      description,
      count,
      reroll,
    });
    return response.data; // { bullets, wasFree, cost, remainingCredits }
  },

  // Fetch (or build+cache) Aria's Role Brief for a draft — powers the "Aria's
  // read" strip. Cheap on repeat (same-JD cache hit); no target JD → { brief: null }.
  getBrief: async (draftId) => {
    const response = await api.post('/coach/brief', { draftId });
    return response.data; // { brief }
  },

  // Aria's free-form coach chat. Shares one daily free pool with build-with, then
  // 1 credit each. A 402 { code:'CHAT_LIMIT_REACHED' } means out of free chats +
  // credits for today.
  askAria: async (draftId, currentStepId, question) => {
    const response = await api.post('/coach/ask', { draftId, currentStepId, question });
    return response.data; // { answer, freeRemaining, charged }
  },

  // Aria's UNIFIED turn — general Q&A + build-with in one thread. focus optional.
  // Smart per-message charging happens server-side (focused building = free, a
  // general question spends the daily allowance).
  coachChat: async ({ draftId, currentStepId, messages, focus, buildTurns }) => {
    const response = await api.post('/coach/chat', {
      draftId,
      currentStepId,
      messages,
      focus,
      buildTurns,
    });
    return response.data; // { reply, intent, readyToDraft, description, freeRemaining, charged }
  },

  // Aria's career-stage-aware, JD-tailored professional summary. Charges
  // GENERATE_SUMMARY per draft (each re-roll charges again). stage is
  // 'grad'|'experienced'|'changer'. Returns { summary, cost, remainingCredits }.
  coachSummary: async ({ draftId, stage }) => {
    const { data } = await api.post('/coach/summary', { draftId, stage });
    return data; // { summary, cost, remainingCredits }
  },

  // Confirm/correct the inferred company type on Aria's Role Brief (infer+confirm
  // chip). Persists the choice so a same-JD brief rebuild keeps it.
  setCompanyType: async (draftId, companyType) => {
    const response = await api.post('/coach/company-type', { draftId, companyType });
    return response.data; // { brief }
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

  // Generate a Word (.docx) from the CV data (server-side via the `docx` lib).
  // Mirrors generatePdf: same download paywall, so a NEED_DOWNLOAD 402 (delivered
  // as a Blob body because responseType is 'blob') is decoded back into a typed
  // Error with `.code === 'NEED_DOWNLOAD'` for callers to show the paywall.
  // data = { markdown, userProfile }; metadata = { applicationId, isDraft, templateId }.
  generateDocx: async (data = {}, metadata = {}) => {
    try {
      const response = await api.post(
        '/docx/generate',
        {
          ...data,
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
