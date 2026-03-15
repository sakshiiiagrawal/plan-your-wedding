import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('slug');
        // Redirect to slug-scoped login if we have a slug, otherwise home
        window.location.href = slug ? `/${slug}/login` : '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
