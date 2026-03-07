const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');

const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*, rooms(count)')
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
    const { data, error } = await supabase
      .from('accommodations')
      .select('*, rooms(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Accommodation not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('accommodations')
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
      .from('accommodations')
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

const deleteAccommodation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('accommodations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getRooms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_allocations(*, guests(first_name, last_name, side))')
      .eq('accommodation_id', id)
      .order('room_number', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const addRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['room_number', 'room_type']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ ...req.body, accommodation_id: id }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const getAllocations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('room_allocations')
      .select('*, rooms(*, accommodations(name)), guests(first_name, last_name, side)')
      .order('check_in_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getAllocationMatrix = async (req, res, next) => {
  try {
    // Get all accommodations with rooms and allocations
    const { data, error } = await supabase
      .from('accommodations')
      .select(`
        *,
        rooms (
          *,
          room_allocations (
            *,
            guests (id, first_name, last_name, side)
          )
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createAllocation = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['room_id', 'guest_id', 'check_in_date', 'check_out_date']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('room_allocations')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('room_allocations')
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

const deleteAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('room_allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getUnassignedGuests = async (req, res, next) => {
  try {
    // Get guests who need accommodation but don't have a room allocation
    const { data: allGuests, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('needs_accommodation', true);

    const { data: allocations, error: allocError } = await supabase
      .from('room_allocations')
      .select('guest_id');

    if (guestError) throw guestError;

    const allocatedGuestIds = new Set(allocations?.map(a => a.guest_id) || []);
    const unassigned = allGuests.filter(g => !allocatedGuestIds.has(g.id));

    res.json(unassigned);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteAccommodation,
  getRooms,
  addRoom,
  getAllocations,
  getAllocationMatrix,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  getUnassignedGuests
};
