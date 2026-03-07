const { supabase } = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getBySection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .eq('section_name', section)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Section not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getHeroContent = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'hero')
      .single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const getCoupleContent = async (req, res, next) => {
  try {
    const { data, error} = await supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'couple')
      .single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const getOurStory = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('website_content')
      .select('content')
      .eq('section_name', 'our_story')
      .single();

    if (error) throw error;
    res.json(data?.content || {});
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { data, error } = await supabase
      .from('website_content')
      .update(req.body)
      .eq('section_name', section)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
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
  update
};
