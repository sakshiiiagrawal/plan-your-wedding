const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple in-memory auth for demo purposes
// In production, you'd use Supabase Auth or another auth provider
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@wedding.com',
  password: process.env.ADMIN_PASSWORD || 'SakshiAyush2026'
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET || 'wedding-planner-secret-2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        email,
        role: 'admin',
        name: 'Wedding Admin'
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

    res.json({
      email: decoded.email,
      role: decoded.role,
      name: 'Wedding Admin'
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
