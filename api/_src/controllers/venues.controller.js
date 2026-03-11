const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');
const { getWeddingOwnerId } = require('../utils/auth');

const getAll = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('venues')
      .select('*, events(id, name, event_date)')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('venues')
      .select('*, events(*)')
      .eq('id', id)
      .eq('user_id', ownerId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Venue not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const validation = validateRequiredFields(req.body, ['name', 'address', 'city']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('venues')
      .insert([{ ...req.body, user_id: ownerId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('venues')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deleteVenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteVenue
};
