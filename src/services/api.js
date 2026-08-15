import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

// Tells the backend whether the request is from the native app or the web. The
// native app keeps its AdMob-rewarded download model, so native requests are
// exempt from the web ₦500 download gate (a PDF costs us ~nothing to serve, so
// the negligible spoof risk is an acceptable trade for not duplicating the gate).
const CLIENT_PLATFORM = Capacitor.isNativePlatform() ? 'native' : 'web';

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Client-Platform'] = CLIENT_PLATFORM;
    // Read live on every request, so toggling the language takes effect on the
    // very next AI call without a reload.
    config.headers['X-App-Language'] = localStorage.getItem('lang') || 'en';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRequest =
        error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      if (!isAuthRequest) {
        // Token expired or invalid — redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
