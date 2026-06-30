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

const deleteAccount = async () => {
  const response = await api.delete('/users/profile');
  return response.data;
};

// Referral code + invites + credits earned for the Account hub.
const getReferralStats = async () => {
  const response = await api.get('/users/me/referrals');
  return response.data;
};

// Activity & progress snapshot for the Account hub Overview.
const getActivityStats = async () => {
  const response = await api.get('/users/me/stats');
  return response.data;
};

// Change account email (requires current password). Returns the updated user.
const changeEmail = async ({ currentPassword, newEmail }) => {
  const response = await api.patch('/users/me/email', { currentPassword, newEmail });
  return response.data;
};

// Change account password (requires current password).
const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.patch('/users/me/password', { currentPassword, newPassword });
  return response.data;
};

// Download all user data as a JSON file (blob → triggers a browser download).
const exportData = async () => {
  const response = await api.get('/users/me/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'applyright-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const UserService = {
  updateSettings,
  deleteAccount,
  getReferralStats,
  getActivityStats,
  changeEmail,
  changePassword,
  exportData,
};

export default UserService;
