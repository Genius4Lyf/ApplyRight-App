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

    // Generate bullet points using AI
    generateBullets: async (role, context, type, targetJob) => {
        const response = await api.post('/ai/generate-bullets', {
            role,
            context,
            type,
            targetJob
        });
        return response.data.suggestions;
    },

    // Delete a draft CV
    deleteDraft: async (id) => {
        const response = await api.delete(`/cv/${id}`);
        return response.data;
    }
};

export default CVService;
