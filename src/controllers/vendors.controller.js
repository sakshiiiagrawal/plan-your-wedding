const { supabase } = require('../config/database');
const { VENDOR_CATEGORIES } = require('../config/constants');
const { validateRequiredFields, createValidationError } = require('../utils/validation');

const getAll = async (req, res, next) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('vendors')
      .select('*, vendor_event_assignments(event_id, events(name))');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    res.json(VENDOR_CATEGORIES.map(cat => ({
      value: cat,
      label: cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    })));
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('vendors')
      .select('*, vendor_event_assignments(*, events(*)), payments(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Vendor not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name', 'category']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('vendors')
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
      .from('vendors')
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

const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const assignToEvent = async (req, res, next) => {
  try {
    const { id, eventId } = req.params;
    const { service_description, arrival_time, setup_requirements, special_instructions } = req.body;

    const { data, error } = await supabase
      .from('vendor_event_assignments')
      .insert([{
        vendor_id: id,
        event_id: eventId,
        service_description,
        arrival_time,
        setup_requirements,
        special_instructions
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const removeFromEvent = async (req, res, next) => {
  try {
    const { id, eventId } = req.params;
    const { error } = await supabase
      .from('vendor_event_assignments')
      .delete()
      .eq('vendor_id', id)
      .eq('event_id', eventId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('vendor_id', id)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getCategories,
  getById,
  create,
  update,
  delete: deleteVendor,
  assignToEvent,
  removeFromEvent,
  getPayments
};
