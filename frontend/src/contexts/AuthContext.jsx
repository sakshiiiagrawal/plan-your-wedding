import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// Demo credentials for when backend is not available
// Roles: admin (full access), family (view all, read-only), friends (view all except finance, read-only)
const DEMO_USERS = {
  'admin@wedding.com': {
    id: 1,
    email: 'admin@wedding.com',
    password: 'SakshiAyush2026',
    name: 'Wedding Admin',
    role: 'admin'
  },
  'family@wedding.com': {
    id: 2,
    email: 'family@wedding.com',
    password: 'Family2026',
    name: 'Family Member',
    role: 'family'
  },
  'friends@wedding.com': {
    id: 3,
    email: 'friends@wedding.com',
    password: 'Friends2026',
    name: 'Friend',
    role: 'friends'
  }
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
        const demoUser = DEMO_USERS[email];
        if (demoUser && password === demoUser.password) {
          const demoToken = 'demo-token-' + Date.now();
          localStorage.setItem('token', demoToken);
          const userToStore = { id: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role };
          localStorage.setItem('user', JSON.stringify(userToStore));
          setUser(userToStore);
          return userToStore;
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

  // Role-based access helpers
  const isAdmin = user?.role === 'admin';
  const isFamily = user?.role === 'family';
  const isFriends = user?.role === 'friends';

  // Can edit/update data - only admin
  const canEdit = isAdmin;

  // Can view finance/budget - admin and family, but NOT friends
  const canViewFinance = isAdmin || isFamily;

  // Is in read-only mode - family and friends
  const isReadOnly = isFamily || isFriends;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      // Role checks
      isAdmin,
      isFamily,
      isFriends,
      // Permission helpers
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
