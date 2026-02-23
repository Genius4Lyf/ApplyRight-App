import api from './api';

const updateSettings = async (settings) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.token) return null;

    const response = await api.put('/users/profile', { settings });

    // Update local user object
    if (response.data) {
        const updatedUser = { ...user, ...response.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Dispatch event for same-tab updates (storage event only fires for other tabs)
        window.dispatchEvent(new Event('userDataUpdated'));
        return updatedUser;
    }
    return null;
};

const UserService = {
    updateSettings
};

export default UserService;
