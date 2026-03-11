const { supabase } = require('../config/database');
const { getWeddingOwnerId } = require('../utils/auth');

async function resolveOwnerBySlug(slug) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'admin')
    .maybeSingle();
  return data?.id || null;
}

async function resolveOwnerId(req) {
  if (req.user) return getWeddingOwnerId(req);
  return null;
}

const getAll = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);
    let query = supabase
      .from('website_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (ownerId) query = query.eq('user_id', ownerId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getBySection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const ownerId = await resolveOwnerId(req);

    let query = supabase
      .from('website_content')
      .select('*')
      .eq('section_name', section);

    if (ownerId) query = query.eq('user_id', ownerId);

    const { data, error } = await query.single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Section not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getHeroContent = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);

    let query = supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'hero');

    if (ownerId) query = query.eq('user_id', ownerId);

    const { data, error } = await query.single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const getCoupleContent = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);

    let query = supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'couple');

    if (ownerId) query = query.eq('user_id', ownerId);

    const { data, error } = await query.single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const getOurStory = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);

    let query = supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'our_story');

    if (ownerId) query = query.eq('user_id', ownerId);

    const { data, error } = await query.single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { section } = req.params;
    const ownerId = getWeddingOwnerId(req);

    const { data, error } = await supabase
      .from('website_content')
      .upsert(
        { ...req.body, section_name: section, user_id: ownerId },
        { onConflict: 'section_name,user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Public: GET /api/v1/public/:slug/website-content/:section
const getPublicWebsiteContent = async (req, res, next) => {
  try {
    const { slug, section } = req.params;
    const userId = await resolveOwnerBySlug(slug);
    if (!userId) return res.status(404).json({ error: 'Wedding not found' });

    const { data, error } = await supabase
      .from('website_content')
      .select('content')
      .eq('section_name', section)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getBySection,
  getHeroContent,
  getCoupleContent,
  getOurStory,
  update,
  getPublicWebsiteContent,
};
