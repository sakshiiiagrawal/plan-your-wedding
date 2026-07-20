import axios from 'axios';
import { clearSession, readToken } from '../utils/session';
import { weddingHref } from '../utils/tenant';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = readToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401
    ) {
      const path = window.location.pathname;
      // Don't redirect if already on a login or onboarding screen
      const isLoginPage = path.endsWith('/login');
      const isOnboard = path === '/onboard';
      if (!isLoginPage && !isOnboard) {
        const slug = localStorage.getItem('slug');
        clearSession();
        // Read by the login page after the redirect to explain why it landed there
        sessionStorage.setItem('sessionExpired', '1');
        // Back to this wedding's own login when we know which one it is
        window.location.href = slug ? weddingHref(slug, '/login') : '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
