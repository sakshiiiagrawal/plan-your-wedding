import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

export type UserRole = 'admin' | 'family' | 'friends';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  slug?: string | null;
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
  isAdmin: boolean;
  isFamily: boolean;
  isFriends: boolean;
  canEdit: boolean;
  canViewFinance: boolean;
  isReadOnly: boolean;
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
  };

  const isAdmin = user?.role === 'admin';
  const isFamily = user?.role === 'family';
  const isFriends = user?.role === 'friends';
  const canEdit = isAdmin;
  const canViewFinance = isAdmin || isFamily;
  const isReadOnly = isFamily || isFriends;

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
        isAdmin,
        isFamily,
        isFriends,
        canEdit,
        canViewFinance,
        isReadOnly,
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
