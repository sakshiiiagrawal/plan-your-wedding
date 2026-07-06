import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { setActiveCurrency } from '../utils/currency';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  slug?: string | null;
  emailVerified?: boolean;
  currency?: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  slug: string;
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  slug: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser; slug: string | null }>;
  register: (data: RegisterData) => Promise<{ user: AuthUser; slug: string | null }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [slug, setSlug] = useState<string | null>(() => localStorage.getItem('slug') || null);
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
      const response = await api.get<AuthUser>('/auth/me');
      setUser(response.data);
      setActiveCurrency(response.data.currency);
      // The server resolves the active wedding's slug (accounting for
      // membership), which may differ from what was cached at login time.
      if (response.data.slug) {
        localStorage.setItem('slug', response.data.slug);
        setSlug(response.data.slug);
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('slug');
      setSlug(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; slug: string | null }> => {
    const response = await api.post<{ token: string; user: AuthUser; slug: string | null }>(
      '/auth/login',
      { email, password },
    );
    const { token, user: loggedInUser, slug: returnedSlug } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    if (returnedSlug) {
      localStorage.setItem('slug', returnedSlug);
      setSlug(returnedSlug);
    }
    setUser(loggedInUser);
    return { user: loggedInUser, slug: returnedSlug };
  };

  const register = async (data: RegisterData): Promise<{ user: AuthUser; slug: string | null }> => {
    const response = await api.post<{ token: string; user: AuthUser; slug: string | null }>(
      '/auth/register',
      data,
    );
    const { token, user: registeredUser, slug: returnedSlug } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(registeredUser));
    if (returnedSlug) {
      localStorage.setItem('slug', returnedSlug);
      setSlug(returnedSlug);
    }
    setUser(registeredUser);
    return { user: registeredUser, slug: returnedSlug };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('slug');
    setUser(null);
    setSlug(null);
    setActiveCurrency(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        slug,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
