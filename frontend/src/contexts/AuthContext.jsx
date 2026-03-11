import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [slug, setSlug] = useState(() => localStorage.getItem('slug') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      // Restore slug from localStorage on page reload
      const storedSlug = localStorage.getItem('slug');
      if (storedSlug) setSlug(storedSlug);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('slug');
      setSlug(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user, slug: returnedSlug } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (returnedSlug) {
      localStorage.setItem('slug', returnedSlug);
      setSlug(returnedSlug);
    }
    setUser(user);
    return { user, slug: returnedSlug };
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    const { token, user, slug: returnedSlug } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (returnedSlug) {
      localStorage.setItem('slug', returnedSlug);
      setSlug(returnedSlug);
    }
    setUser(user);
    return { user, slug: returnedSlug };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('slug');
    setUser(null);
    setSlug(null);
  };

  const isAdmin = user?.role === 'admin';
  const isFamily = user?.role === 'family';
  const isFriends = user?.role === 'friends';
  const canEdit = isAdmin;
  const canViewFinance = isAdmin || isFamily;
  const isReadOnly = isFamily || isFriends;

  return (
    <AuthContext.Provider value={{
      user,
      slug,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isAdmin,
      isFamily,
      isFriends,
      canEdit,
      canViewFinance,
      isReadOnly
    }}>
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
