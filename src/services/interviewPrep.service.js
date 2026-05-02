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

  updateNotes: async (applicationId, notes) => {
    const response = await api.patch(`/interview-prep/${applicationId}/notes`, { notes });
    return response.data;
  },

  remove: async (applicationId) => {
    const response = await api.delete(`/interview-prep/${applicationId}`);
    return response.data;
  },
};

export default InterviewPrepService;
