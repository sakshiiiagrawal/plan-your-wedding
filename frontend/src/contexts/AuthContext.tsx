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
  /** id of the wedding owner the user is currently working on (self or a membership) */
  ownerId?: string;
  /** role within the active wedding; 'admin' on your own wedding */
  role?: 'admin' | 'editor' | 'viewer';
  /** null/undefined = full access; a non-empty array limits nav + API to those sections */
  allowedSections?: string[] | null;
  /** Fine-grained grants (e.g. 'budget:splits', 'members:manage'). Admins implicitly hold all. */
  permissions?: string[] | null;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  /** required when creating a wedding; omitted when joining via invite */
  slug?: string;
  /** joining an existing wedding — activates the membership during signup */
  inviteToken?: string;
  /** 'collaborator' = planner/family account with no wedding of its own */
  accountType?: 'couple' | 'collaborator';
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
  /** Re-fetch /auth/me (e.g. after accepting an invite switches the active wedding). */
  refresh: () => Promise<AuthUser | null>;
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

  const checkAuth = async (): Promise<AuthUser | null> => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return null;
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
      return response.data;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('slug');
      setSlug(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // After storing the token, resolve the session from /auth/me rather than the
  // login/register payload: /me carries the active-wedding scope (role,
  // ownerId, allowedSections) and resolves the slug through memberships — a
  // collaborator's own slug is null, but their active wedding's isn't.
  const resolveSession = async (
    token: string,
    fallback: { user: AuthUser; slug: string | null },
  ): Promise<{ user: AuthUser; slug: string | null }> => {
    localStorage.setItem('token', token);
    try {
      const me = (await api.get<AuthUser>('/auth/me')).data;
      localStorage.setItem('user', JSON.stringify(me));
      setActiveCurrency(me.currency);
      if (me.slug) {
        localStorage.setItem('slug', me.slug);
        setSlug(me.slug);
      }
      setUser(me);
      return { user: me, slug: me.slug ?? null };
    } catch {
      // /me hiccup right after auth — fall back to the auth payload
      localStorage.setItem('user', JSON.stringify(fallback.user));
      if (fallback.slug) {
        localStorage.setItem('slug', fallback.slug);
        setSlug(fallback.slug);
      }
      setUser(fallback.user);
      return fallback;
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
    return resolveSession(token, { user: loggedInUser, slug: returnedSlug });
  };

  const register = async (data: RegisterData): Promise<{ user: AuthUser; slug: string | null }> => {
    const response = await api.post<{ token: string; user: AuthUser; slug: string | null }>(
      '/auth/register',
      data,
    );
    const { token, user: registeredUser, slug: returnedSlug } = response.data;
    return resolveSession(token, { user: registeredUser, slug: returnedSlug });
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
        refresh: checkAuth,
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
