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
  // `stage` ranks the result: coursework-only evidence is real, but for a grad it is not
  // a headline strength. Optional — the backend falls back to the pick persisted on the
  // draft, then to CV-shape inference.
  // `count` is the user-picked CEILING (10/15/20) — the server clamps it and still
  // refuses to pad, so asking for 20 can legitimately return 8 proven plus questions.
  generateSkills: async (
    education,
    experience,
    projects,
    targetJob,
    draftId,
    model,
    stage,
    count
  ) => {
    const response = await api.post('/ai/generate-skills', {
      education,
      experience,
      projects,
      targetJob,
      draftId,
      model,
      stage,
      count,
    });
    return response.data; // { suggestions, bestForRole, reviewGroups, isPaid, fromCache, remainingCredits }
  },

  // Record skills the user says they have never done, so Aria stops offering them as
  // questions on the next generation. Fire-and-forget from the caller's point of view —
  // a failure here must never block skills actually landing on the CV.
  declineSkills: async (draftId, declines) => {
    const response = await api.post('/ai/skill-declines', { draftId, declines });
    return response.data; // { declined }
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
    model,
  }) => {
    const response = await api.post('/coach/generate-bullets', {
      draftId,
      section,
      sortId,
      description,
      count,
      reroll,
      model,
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
  studioBuildStart: async ({ jobTitle, jobDescription, model } = {}) => {
    const response = await api.post('/studio/build-start', { jobTitle, jobDescription, model });
    return response.data; // { draftId, personalInfo, brief, draft }
  },

  // Aria Studio — import an uploaded CV into an existing, EMPTY build session. Charges
  // CREATE_FROM_UPLOAD (the same price the CV builder's upload charges) and only once the
  // extraction has actually produced content. Bullets come back WORD FOR WORD — the
  // Studio improves the CV with the user, so nothing is rewritten on the way in.
  //
  // 403 { code:'INSUFFICIENT_CREDITS' } → short on credits, nothing charged.
  // 409 { code:'DRAFT_NOT_EMPTY' }      → that CV already has content.
  // 422 { code:'NO_TEXT' | 'NOTHING_EXTRACTED' } → unreadable file, nothing charged.
  //
  // Note this posts multipart/form-data, so it can't go through the JSON helpers above.
  studioUploadImport: async (draftId, file) => {
    const form = new FormData();
    form.append('resume', file);
    form.append('draftId', draftId);
    const response = await api.post('/studio/upload-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // { draft, cost, remainingCredits, imported }
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
  studioBriefPreview: async ({ jobTitle, jobDescription, model }) => {
    const response = await api.post('/studio/brief-preview', { jobTitle, jobDescription, model });
    return response.data; // { brief }
  },

  // Add or replace the canonical target job on an existing Studio CV. The backend
  // refreshes the Role Brief and invalidates JD-derived caches as one operation.
  studioUpdateTargetJob: async ({ draftId, jobTitle, jobDescription, model, brief }) => {
    const response = await api.post('/studio/target-job', {
      draftId,
      jobTitle,
      jobDescription,
      model,
      brief,
    });
    return response.data; // { changed, targetJob, studioScan:null, reviewSuggested }
  },

  // Aria Studio — draft a realistic, generic job posting from just a job title, for a
  // user who knows the role they want but has no real posting to paste. Charges
  // DRAFT_JD, only after a non-empty draft comes back. 403 { code:'INSUFFICIENT_CREDITS' }.
  studioDraftJobDescription: async (jobTitle, model) => {
    const response = await api.post('/studio/draft-jd', { jobTitle, model });
    return response.data; // { jobDescription, cost, remainingCredits }
  },

  // Aria Studio — start a tailor run. Clones the source CV's CONTENT into a new draft
  // bound to the target job. Pass the `brief` the user already confirmed at the preview
  // step and it's persisted as-is (no second AI extraction); omit it and one is built.
  // The source draft is never mutated. 402 { code:'NEED_AGENT_SUB' } → agent needs a plan.
  studioTailorStart: async ({
    sourceDraftId,
    jobTitle,
    jobDescription,
    brief,
    model,
    jdSource,
  }) => {
    const response = await api.post('/studio/tailor-start', {
      sourceDraftId,
      jobTitle,
      jobDescription,
      brief,
      model,
      jdSource,
    });
    return response.data; // { draftId, title, brief, tailoredFrom, draft }
  },

  // Aria Studio — full scan: AI fit analysis of the tailored copy against its target
  // job, plus free deterministic per-section verdicts. CHARGES ANALYSIS (10cr), and
  // only after the AI succeeds. 403 { code:'INSUFFICIENT_CREDITS' } if the balance is short.
  studioScan: async (draftId, model) => {
    const response = await api.post('/studio/scan', { draftId, model });
    return response.data; // { studioScan, remainingCredits }
  },

  // Aria Studio — FREE deterministic re-score after an edit. No AI, no charge: refreshes
  // fitScore/scoreBreakdown/sections while keeping the last scan's narrative (flagged
  // fromLastFullScan) rather than inventing new commentary.
  studioRecompute: async (draftId) => {
    const response = await api.post('/studio/recompute', { draftId });
    return response.data; // { studioScan }
  },

  // Aria Studio — rewrite ONE role's EXISTING bullets against the target job. Returns
  // before/after rows the user accepts per bullet. CHARGES REWRITE_ROLE (1cr light /
  // 2cr flagship) — but only when Aria actually changed something: an all-unchanged
  // result comes back { charged:false } so 'already strong' costs nothing.
  studioRewriteRole: async ({ draftId, section, sortId, model }) => {
    const response = await api.post('/studio/rewrite-role', { draftId, section, sortId, model });
    return response.data; // { rows, charged, cost, remainingCredits }
  },

  // Aria Studio — propose AT MOST 3 project ideas grounded in the user's OWN CV, so a
  // role that wants a project doesn't dead-end at a blank form. CHARGES PROJECT_IDEAS
  // (1cr, server-pinned light) ONLY on a non-empty result: { ideas: [] } comes back
  // { charged:false } and the caller falls through to the blank-project path.
  // 400 { code:'NOT_ENOUGH_CV' } when there's too little on the CV to ground an idea;
  // 403 { code:'INSUFFICIENT_CREDITS' } before the AI call if the balance is short.
  studioProjectIdeas: async ({ draftId }) => {
    const response = await api.post('/studio/project-ideas', { draftId });
    return response.data; // { ideas, charged, cost, remainingCredits }
  },

  // Fetch (or build+cache) Aria's Role Brief for a draft — powers the "Aria's
  // read" strip. Cheap on repeat (same-JD cache hit); no target JD → { brief: null }.
  getBrief: async (draftId, model) => {
    const response = await api.post('/coach/brief', { draftId, model });
    return response.data; // { brief }
  },

  // Record "no target job — build a strong all-rounder", and cache the role-family
  // vocabulary that stands in for a Role Brief. FREE (extraction-cached inference).
  // Returns { noJd: { roleFamily, keywords } }.
  setNoTarget: async (draftId, roleFamily) => {
    const response = await api.post('/coach/no-target', { draftId, roleFamily });
    return response.data;
  },

  // Aria's free-form coach chat. Shares one daily free pool with build-with, then
  // 1 credit each. A 402 { code:'CHAT_LIMIT_REACHED' } means out of free chats +
  // credits for today.
  askAria: async (draftId, currentStepId, question, model) => {
    const response = await api.post('/coach/ask', { draftId, currentStepId, question, model });
    return response.data; // { answer, freeRemaining, charged, remainingCredits|null }
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
    // { requirementId } — runs the CROSS-HISTORY HUNT for one employer requirement
    // instead of the entry interview. Free, like a build turn.
    probe,
    model,
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
      probe,
      model,
    });
    // remainingCredits is the post-charge balance, or null when the turn was free.
    return response.data; // { reply, intent, readyToDraft, description, freeRemaining, charged, remainingCredits|null }
  },

  // Aria's career-stage-aware, JD-tailored professional summary. Charges
  // GENERATE_SUMMARY per draft (each re-roll charges again). stage is
  // 'grad'|'experienced'|'changer'. Returns { summary, cost, remainingCredits }.
  // `missingKeywords` is the gap list from the Studio's section scan — the very terms
  // the row the user tapped "Fix" on was complaining about. Passing them makes the
  // rewrite obliged to close the gap it was opened to close, so the free recompute
  // that follows can honestly report movement. Omitted on the build track (no scan).
  coachSummary: async ({ draftId, stage, model, missingKeywords }) => {
    const { data } = await api.post('/coach/summary', {
      draftId,
      stage,
      model,
      missingKeywords,
    });
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

  // ─── Prepare me for an interview ───
  //
  // A prep session runs a job analysis against a CV and creates an Application. These
  // are the SAME endpoints the home page's analysis used before it moved into the
  // Studio — nothing here is new server-side except the cover letter's model choice.

  // Mint (or refresh) the Job record the analysis needs. Free. Takes a link OR pasted
  // text; on the text path a title the user typed wins over the AI's inference.
  extractJob: async ({ jobUrl, description, title } = {}) => {
    const res = await api.post('/jobs/extract', jobUrl ? { jobUrl } : { description, title });
    return res.data;
  },

  // The charged analysis. The CV is EITHER a saved draft or an uploaded resume — never
  // both, which is why the caller passes one id and this picks the matching field.
  analyzeFit: async ({ jobId, draftCVId, resumeId }) => {
    const res = await api.post('/analysis/analyze', {
      jobId,
      ...(draftCVId ? { draftCVId } : { resumeId }),
    });
    return res.data;
  },

  // Reopening a past analysis from Recents. The prep conversation is rebuilt from this
  // record rather than from a stored transcript.
  getApplication: async (id) => {
    const res = await api.get(`/applications/${id}`);
    return res.data;
  },

  deleteApplication: async (id) => {
    const res = await api.delete(`/applications/${id}`);
    return res.data;
  },

  // `model` is the Standard | Pro pick. Omitted → the server's own default, and the
  // free daily letter still applies; a Pro pick always meters.
  generateCoverLetter: async (applicationId, model) => {
    const res = await api.post(
      `/analysis/${applicationId}/generate-cover-letter`,
      model ? { model } : {}
    );
    return res.data;
  },

  generateInterviewPrep: async (applicationId) => {
    const res = await api.post(`/analysis/${applicationId}/generate-interview`);
    return res.data;
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
