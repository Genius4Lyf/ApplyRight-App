import api from './api';

const ApplicationService = {
    // Get all applications for the current user
    getApplications: async () => {
        const response = await api.get('/applications');
        return response.data;
    },

    // Delete an application
    deleteApplication: async (id) => {
        const response = await api.delete(`/applications/${id}`);
        return response.data;
    }
};

export default ApplicationService;
