import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// Demo credentials for when backend is not available
const DEMO_EMAIL = 'admin@wedding.com';
const DEMO_PASSWORD = 'SakshiAyush2026';
const DEMO_USER = {
  id: 1,
  email: 'admin@wedding.com',
  name: 'Wedding Admin',
  role: 'admin'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        // Try to verify with backend
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        // If backend is unavailable, use stored user for demo mode
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      // Try backend authentication first
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return user;
    } catch (error) {
      // If backend is unavailable, use demo credentials
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          const demoToken = 'demo-token-' + Date.now();
          localStorage.setItem('token', demoToken);
          localStorage.setItem('user', JSON.stringify(DEMO_USER));
          setUser(DEMO_USER);
          return DEMO_USER;
        } else {
          throw new Error('Invalid credentials');
        }
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
