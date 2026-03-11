const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'wedding-planner-secret-2026',
    { expiresIn: '7d' }
  );

const register = async (req, res, next) => {
  try {
    const { name, email, password, brideName, groomName, weddingDate, slug } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!slug) {
      return res.status(400).json({ error: 'slug is required' });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug may only contain lowercase letters, numbers, and hyphens' });
    }

    if (slug.length < 3 || slug.length > 50) {
      return res.status(400).json({ error: 'Slug must be between 3 and 50 characters' });
    }

    // Check slug uniqueness
    const { data: slugConflict } = await supabase
      .from('users')
      .select('id')
      .eq('slug', slug)
      .limit(1);

    if (slugConflict && slugConflict.length > 0) {
      return res.status(409).json({ error: 'That URL is already taken. Please choose another.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password_hash,
        role: 'admin',
        slug,
      })
      .select('id, email, name, role, slug')
      .single();

    if (userError) throw userError;

    // Upsert hero content with wedding details
    if (brideName || groomName || weddingDate) {
      const heroContent = {
        bride_name: brideName || '',
        groom_name: groomName || '',
        wedding_date: weddingDate || null,
        tagline: `${brideName || 'Bride'} & ${groomName || 'Groom'} are getting married!`,
      };

      await supabase
        .from('website_content')
        .upsert(
          { section_name: 'hero', content: heroContent, display_order: 1, user_id: user.id },
          { onConflict: 'section_name,user_id' }
        );
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      slug: user.slug,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, slug: user.slug }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, slug, created_by')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Determine slug: admin uses own slug; family/friends use their creator's slug
    let slug = user.slug;
    if (user.role !== 'admin' && user.created_by) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('slug')
        .eq('id', user.created_by)
        .single();
      slug = adminUser?.slug || null;
    }

    const token = signToken(user);
    res.json({
      token,
      slug,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, slug }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    // req.user is attached by verifyToken middleware
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, getCurrentUser };
