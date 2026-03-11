const { supabase } = require('../config/database');

const getWeddingBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('slug', slug)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.json({ exists: false });
    return res.json({ exists: true, userId: data.id });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWeddingBySlug };
