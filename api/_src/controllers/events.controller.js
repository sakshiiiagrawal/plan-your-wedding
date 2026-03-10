const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');

const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*, venues(*)')
      .order('event_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .select('*, venues(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name', 'event_type', 'event_date', 'start_time']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('events')
      .insert([req.body])
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
    const { data, error } = await supabase
      .from('events')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getGuests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('guest_event_rsvp')
      .select('*, guests(*)')
      .eq('event_id', id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getVendors = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('vendor_event_assignments')
      .select('*, vendors(*)')
      .eq('event_id', id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getRituals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('rituals')
      .select('*')
      .eq('event_id', id)
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteEvent,
  getGuests,
  getVendors,
  getRituals
};
