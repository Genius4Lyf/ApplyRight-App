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

  // ── Story Bank ──
  // Generate the bank (reached via the ad-reward flow on the detail page). Lives
  // under /analysis like generate-interview; returns { stories, interviewPrep, remainingCredits }.
  generateStories: async (applicationId) => {
    const response = await api.post(`/analysis/${applicationId}/generate-stories`);
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
