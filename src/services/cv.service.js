import api from './api';

// Download requests use `responseType: 'blob'`, so a JSON *error* body arrives as
// an opaque Blob too — `error.message` degrades to "[object Blob]" and the real
// server reason never surfaces anywhere. Read the Blob back to text, parse it
// (guarded: a proxy/HTML error page is not JSON), and rethrow a typed Error
// carrying the server's `message` + `code`. Always throws.
const throwDecodedBlobError = async (error) => {
  const { status, data } = error.response || {};
  let body = null;
  let raw = '';

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      raw = await data.text();
      body = JSON.parse(raw);
    } catch {
      body = null; // non-JSON body (HTML error page, empty, truncated) — keep `raw`
    }
  } else if (data && typeof data === 'object') {
    body = data;
  }

  // Paywall: unchanged contract — callers switch on `.code === 'NEED_DOWNLOAD'`.
  if (status === 402 && data) {
    const e = new Error(body?.message || 'Payment required to download');
    e.code = body?.code || 'NEED_DOWNLOAD';
    e.status = 402;
    throw e;
  }

  const message =
    body?.message || body?.error || (raw && !raw.startsWith('<') ? raw.slice(0, 300) : '');
  if (message) {
    const e = new Error(message);
    if (body?.code) e.code = body.code;
    e.status = status;
    throw e;
  }

  throw error;
};

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

  // Aria Studio — detach a CV from the Studio without deleting it. Clearing studioKind
  // drops it from the session rail; the DraftCV itself (and everything on it) survives
  // in My CVs. The escape hatch for a master CV someone no longer wants in the sidebar.
  studioRemoveSession: async (draftId) => {
    const response = await api.post('/cv/save', { _id: draftId, studioKind: null });
    return response.data;
  },

  // Aria Studio — start a BUILD session: an empty CV prefilled with the user's contact
  // details, optionally aimed at a job. 402 { code:'NEED_AGENT_SUB' } → agent needs a plan.
  studioBuildStart: async ({ jobTitle, jobDescription } = {}) => {
    const response = await api.post('/studio/build-start', { jobTitle, jobDescription });
    return response.data; // { draftId, personalInfo, brief, draft }
  },

  // Aria Studio — the user's sessions for the rail. A LEAN projection (title, job,
  // score, timestamp), never whole drafts: a session IS a DraftCV, and shipping those
  // in full would send every transcript and CV body just to draw a list.
  studioSessions: async () => {
    const response = await api.get('/studio/sessions');
    return response.data; // { sessions: [{ _id, kind, title, jobTitle, company, sourceTitle, fitScore, updatedAt }] }
  },

  // Aria Studio — read a job with NO draft attached, so the user can confirm or correct
  // Aria's read before anything is created. Free (same policy as /coach/brief), and
  // nothing is persisted. Returns { brief: null } if the AI is unavailable.
  studioBriefPreview: async ({ jobTitle, jobDescription }) => {
    const response = await api.post('/studio/brief-preview', { jobTitle, jobDescription });
    return response.data; // { brief }
  },

  // Aria Studio — start a tailor run. Clones the source CV's CONTENT into a new draft
  // bound to the target job. Pass the `brief` the user already confirmed at the preview
  // step and it's persisted as-is (no second AI extraction); omit it and one is built.
  // The source draft is never mutated. 402 { code:'NEED_AGENT_SUB' } → agent needs a plan.
  studioTailorStart: async ({ sourceDraftId, jobTitle, jobDescription, brief }) => {
    const response = await api.post('/studio/tailor-start', {
      sourceDraftId,
      jobTitle,
      jobDescription,
      brief,
    });
    return response.data; // { draftId, title, brief, tailoredFrom, draft }
  },

  // Aria Studio — full scan: AI fit analysis of the tailored copy against its target
  // job, plus free deterministic per-section verdicts. CHARGES ANALYSIS (10cr), and
  // only after the AI succeeds. 403 { code:'INSUFFICIENT_CREDITS' } if the balance is short.
  studioScan: async (draftId) => {
    const response = await api.post('/studio/scan', { draftId });
    return response.data; // { studioScan, remainingCredits }
  },

  // Aria Studio — FREE deterministic re-score after an edit. No AI, no charge: refreshes
  // fitScore/scoreBreakdown/sections while keeping the last scan's narrative (flagged
  // fromLastFullScan) rather than inventing new commentary.
  studioRecompute: async (draftId) => {
    const response = await api.post('/studio/recompute', { draftId });
    return response.data; // { studioScan }
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
  coachChat: async ({
    draftId,
    currentStepId,
    messages,
    focus,
    buildTurns,
    stage,
    studioInterview,
  }) => {
    const response = await api.post('/coach/chat', {
      draftId,
      currentStepId,
      messages,
      focus,
      buildTurns,
      studioInterview,
      // Career stage ('grad'|'experienced'|'changer') forks the experience coaching:
      // entry-level is eased in (no metric pressure). Optional — the backend infers
      // from the draft when it's absent.
      stage,
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

  // Set the Aria model for this session (persists on the draft), and optionally the
  // user's default. Server-gated: an un-exposed model is rejected (400 MODEL_NOT_ALLOWED).
  setModel: async (draftId, model, { setDefault = false } = {}) => {
    const response = await api.post('/coach/model', { draftId, model, setDefault });
    return response.data; // { model, tier }
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
  // paywall). Every other failure is decoded too, so the server's real message
  // reaches the caller instead of an opaque Blob (see throwDecodedBlobError).
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
      await throwDecodedBlobError(error);
    }
  },

  // Generate a Word (.docx) from the CV data (server-side via the `docx` lib).
  // Mirrors generatePdf: same download paywall (402 → typed Error with
  // `.code === 'NEED_DOWNLOAD'`), and every other error status is decoded out of
  // its Blob body so the server's message is diagnosable client-side.
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
      await throwDecodedBlobError(error);
    }
  },
};

export default CVService;
