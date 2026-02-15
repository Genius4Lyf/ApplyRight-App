import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/users'; // Adjust if needed

const updateSettings = async (settings) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.token) return null;

    const config = {
        headers: {
            Authorization: `Bearer ${user.token}`,
        },
    };

    const response = await axios.put(`${API_URL}/profile`, { settings }, config);

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
