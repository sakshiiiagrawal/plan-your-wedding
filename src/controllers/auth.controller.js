const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple in-memory auth for demo purposes
// In production, you'd use Supabase Auth or another auth provider
// User roles: admin (full access), family (view all, read-only), friends (view all except finance, read-only)
const USERS = {
  'admin@wedding.com': {
    password: process.env.ADMIN_PASSWORD || 'SakshiAyush2026',
    role: 'admin',
    name: 'Wedding Admin'
  },
  'family@wedding.com': {
    password: process.env.FAMILY_PASSWORD || 'Family2026',
    role: 'family',
    name: 'Family Member'
  },
  'friends@wedding.com': {
    password: process.env.FRIENDS_PASSWORD || 'Friends2026',
    role: 'friends',
    name: 'Friend'
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = USERS[email];
    if (!user || password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email, role: user.role },
      process.env.JWT_SECRET || 'wedding-planner-secret-2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // For JWT, logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'wedding-planner-secret-2026'
    );

    const user = USERS[decoded.email];
    res.json({
      email: decoded.email,
      role: decoded.role,
      name: user?.name || 'Guest'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser
};
