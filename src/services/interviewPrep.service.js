import api from './api';

const InterviewPrepService = {
  list: async () => {
    const response = await api.get('/interview-prep');
    return response.data;
  },

  getOne: async (applicationId) => {
    const response = await api.get(`/interview-prep/${applicationId}`);
    return response.data;
  },

  saveSkills: async (applicationId, skillsWithEvidence) => {
    const response = await api.post('/interview-prep/save-skills', {
      applicationId,
      skillsWithEvidence,
    });
    return response.data;
  },

  // Save by draftCVId — used by CV Builder where applicationId isn't directly
  // known. Backend finds linked applications and saves prep to each.
  // Pass skillsWithEvidence to override what's persisted on the draft (useful
  // when the user just generated and hasn't saved the wizard step yet).
  saveSkillsByDraft: async (draftCVId, skillsWithEvidence) => {
    const response = await api.post('/interview-prep/save-skills', {
      draftCVId,
      skillsWithEvidence,
    });
    return response.data;
  },

  // Legacy single-string notes endpoint. Kept for any in-flight client.
  // Prefer createNote / updateNote / deleteNote for the multi-note UI.
  updateNotes: async (applicationId, notes) => {
    const response = await api.patch(`/interview-prep/${applicationId}/notes`, { notes });
    return response.data;
  },

  createNote: async (applicationId, { title = '', body = '', status = 'draft' } = {}) => {
    const response = await api.post(`/interview-prep/${applicationId}/notes`, {
      title,
      body,
      status,
    });
    return response.data;
  },

  updateNote: async (applicationId, noteId, patch) => {
    const response = await api.patch(`/interview-prep/${applicationId}/notes/${noteId}`, patch);
    return response.data;
  },

  deleteNote: async (applicationId, noteId) => {
    const response = await api.delete(`/interview-prep/${applicationId}/notes/${noteId}`);
    return response.data;
  },

  updateSkillConfidence: async (applicationId, skillName, confidence) => {
    const response = await api.patch(`/interview-prep/${applicationId}/skill-confidence`, {
      skillName,
      confidence,
    });
    return response.data;
  },

  updateQuestionConfidence: async (applicationId, questionText, questionIndex, confidence) => {
    const response = await api.patch(`/interview-prep/${applicationId}/question-confidence`, {
      questionText,
      questionIndex,
      confidence,
    });
    return response.data;
  },

  gradeAnswer: async (applicationId, questionText, questionIndex, answerText) => {
    const response = await api.post(`/interview-prep/${applicationId}/grade-answer`, {
      questionText,
      questionIndex,
      answerText,
    });
    return response.data;
  },

  // Grade a delivered Story Bank story against its own STAR (1 credit).
  gradeStory: async (applicationId, storyId, questionText, answerText) => {
    const response = await api.post(`/interview-prep/${applicationId}/grade-story`, {
      storyId,
      questionText,
      answerText,
    });
    return response.data;
  },

  // ── Story Bank ──
  // Generate the bank (reached via the ad-reward flow on the detail page). Lives
  // under /analysis like generate-interview; returns { stories, interviewPrep, remainingCredits }.
  generateStories: async (applicationId) => {
    const response = await api.post(`/analysis/${applicationId}/generate-stories`);
    return response.data;
  },

  // Premium TTS for Interview Mode — returns an audio Blob (mp3). Throws on 503
  // when no provider is configured, so callers fall back to the browser voice.
  synthesizeSpeech: async (text) => {
    const response = await api.post('/interview-prep/tts', { text }, { responseType: 'blob' });
    return response.data;
  },

  // Save the self-assessed result of an Interview Mode session.
  saveInterviewSession: async (applicationId, payload) => {
    const response = await api.post(`/interview-prep/${applicationId}/interview-session`, payload);
    return response.data;
  },

  // Standalone "Interview Me": create a lightweight Application (no fit analysis,
  // no CV/cover-letter generation) and generate the question set, then return
  // { applicationId } so the caller can jump straight into the live mock
  // interview. Paid-only — a free user gets a 403 { code: 'TIER_REQUIRED' }. The
  // job description is required; pass a resumeId (uploaded) OR draftCVId (saved CV).
  startDirectInterview: async ({ resumeId, draftCVId, jobId }) => {
    const response = await api.post('/analysis/direct-interview', {
      resumeId,
      draftCVId,
      jobId,
    });
    return response.data;
  },

  // Generate a personalized essential answer (kind: 'intro' | 'motivation').
  generateEssential: async (applicationId, kind) => {
    const response = await api.post(`/analysis/${applicationId}/generate-essential`, { kind });
    return response.data;
  },

  // Generate a tailored "what to wear / first impression" guide for this role.
  generateDressGuide: async (applicationId) => {
    const response = await api.post(`/analysis/${applicationId}/generate-dress-guide`);
    return response.data;
  },

  // Adaptive interviewer: one dynamic follow-up to the user's answer (1 credit).
  generateFollowUp: async (applicationId, questionText, answerText) => {
    const response = await api.post(`/interview-prep/${applicationId}/follow-up`, {
      questionText,
      answerText,
    });
    return response.data;
  },

  // Conversational Interview Mode: one live turn. The client owns the transcript
  // + question spine and resends them each turn (server is stateless).
  // payload = { questionSpine, spineIndex, transcript, lastAnswer, phase }.
  // Returns { spoken, displayQuestion, isFollowUp, nextSpineIndex, done }.
  conversationTurn: async (applicationId, payload) => {
    const response = await api.post(`/interview-prep/${applicationId}/conversation-turn`, payload);
    return response.data;
  },

  // Realtime (live voice) Interview Mode: mint a short-lived OpenAI ephemeral
  // client secret. The browser then does the WebRTC handshake directly with
  // OpenAI. meta = { timeOfDay, candidateName, voice, style, requestedSec, wrapUp }
  //   - requestedSec: desired interview length (paid only; free is fixed at taste)
  //   - wrapUp: include the billed wrap-up window (default true server-side)
  // Returns { clientSecret, expiresAt, model, voice, mainSec, graceSec,
  //           maxSessionSec, reservationId, reservedSec }.
  createRealtimeSession: async (applicationId, questionSpine, meta = {}) => {
    const response = await api.post(`/interview-prep/${applicationId}/realtime-session`, {
      questionSpine,
      ...meta, // { timeOfDay, candidateName } for a natural, time-aware greeting
    });
    return response.data;
  },

  // "Who's likely to interview you" — the 3-person panel (HR + 2 JD-derived
  // interviewers) for this role + style. Returns { panel:[{seat,name,role,focus,
  // voice}], style }. Open to all tiers (shown as an upsell teaser for free).
  getPanel: async (applicationId, style = 'balanced') => {
    const response = await api.get(`/interview-prep/${applicationId}/panel`, {
      params: { style },
    });
    return response.data;
  },

  // Premium multi-voice panel: mint the NEXT seat's realtime session (its own
  // voice) under the SAME reservation. No new minutes are reserved. meta =
  // { reservationId, seatIndex, timeOfDay, candidateName, style, questionSpine }.
  // Returns { clientSecret, model, voice, mainSec, graceSec, seatIndex, name, role }.
  createRealtimeSegment: async (applicationId, meta = {}) => {
    const response = await api.post(`/interview-prep/${applicationId}/realtime-segment`, meta);
    return response.data;
  },

  // Assess a finished conversational interview from its transcript (AI grade
  // grounded in CV + job). Persists as the prep's last session.
  // Returns { assessment, lastInterviewSession }.
  assessInterview: async (
    applicationId,
    { transcript, durationSec, plannedSec, reservationId, interviewerSeatIndex, deliveryTelemetry }
  ) => {
    const response = await api.post(`/interview-prep/${applicationId}/assess-interview`, {
      transcript,
      durationSec,
      plannedSec,
      reservationId, // reconciles the live-minute reservation (realtime sessions only)
      interviewerSeatIndex, // records this round against the chosen interviewer (loop)
      deliveryTelemetry, // per-answer numbers from the live session (live mode only)
    });
    return response.data;
  },

  updateStoryConfidence: async (applicationId, storyId, confidence) => {
    const response = await api.patch(`/interview-prep/${applicationId}/story-confidence`, {
      storyId,
      confidence,
    });
    return response.data;
  },

  createStory: async (applicationId, story = {}) => {
    const response = await api.post(`/interview-prep/${applicationId}/stories`, story);
    return response.data;
  },

  updateStory: async (applicationId, storyId, patch) => {
    const response = await api.patch(`/interview-prep/${applicationId}/stories/${storyId}`, patch);
    return response.data;
  },

  deleteStory: async (applicationId, storyId) => {
    const response = await api.delete(`/interview-prep/${applicationId}/stories/${storyId}`);
    return response.data;
  },

  // Returns { exists, draftCVId, generatedAt, skillCount, alreadySynced } when
  // the linked DraftCV has skills with evidence available to pull into prep.
  detectGeneratedCV: async (applicationId) => {
    const response = await api.get(`/interview-prep/${applicationId}/linked-cv`);
    return response.data;
  },

  remove: async (applicationId) => {
    const response = await api.delete(`/interview-prep/${applicationId}`);
    return response.data;
  },
};

export default InterviewPrepService;
