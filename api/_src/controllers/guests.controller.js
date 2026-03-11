const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');
const { generateGuestTemplate, parseGuestExcel, validateGuest } = require('../utils/excel.utils');
const { getWeddingOwnerId } = require('../utils/auth');

const getAll = async (req, res, next) => {
  try {
    const { side, rsvp_status, event_id, needs_accommodation, search } = req.query;
    const ownerId = getWeddingOwnerId(req);

    let query = supabase
      .from('guests')
      .select('*, guest_groups!group_id(name), room_allocations(*, rooms(*, accommodations(name)))')
      .eq('user_id', ownerId);

    if (side && side !== 'all') {
      query = query.eq('side', side);
    }

    if (needs_accommodation === 'true') {
      query = query.eq('needs_accommodation', true);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, error } = await query.order('first_name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, side')
      .eq('user_id', ownerId);

    const { data: rsvps, error: rsvpError } = await supabase
      .from('guest_event_rsvp')
      .select('guest_id, event_id, rsvp_status, plus_ones');

    if (guestError) throw guestError;

    const brideCount = guests.filter(g => g.side === 'bride').length;
    const groomCount = guests.filter(g => g.side === 'groom').length;
    const confirmedCount = rsvps?.filter(r => r.rsvp_status === 'confirmed').length || 0;
    const pendingCount = rsvps?.filter(r => r.rsvp_status === 'pending').length || 0;
    const declinedCount = rsvps?.filter(r => r.rsvp_status === 'declined').length || 0;
    const plusOnes = rsvps?.reduce((sum, r) => sum + (r.plus_ones || 0), 0) || 0;

    res.json({
      total: guests.length,
      bride: brideCount,
      groom: groomCount,
      confirmed: confirmedCount,
      pending: pendingCount,
      declined: declinedCount,
      plusOnes
    });
  } catch (error) {
    next(error);
  }
};

const getGroups = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('guest_groups')
      .select('*, guests(count)')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const validation = validateRequiredFields(req.body, ['name', 'side']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('guest_groups')
      .insert([{ ...req.body, user_id: ownerId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('guests')
      .select('*, guest_groups!group_id(*), guest_event_rsvp(*), room_allocations(*, rooms(*, accommodations(*)))')
      .eq('id', id)
      .eq('user_id', ownerId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Guest not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { events, ...guestData } = req.body;

    const validation = validateRequiredFields(guestData, ['first_name', 'side']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);

    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .insert([{ ...guestData, user_id: ownerId }])
      .select()
      .single();

    if (guestError) throw guestError;

    if (events && events.length > 0) {
      const rsvpEntries = events.map(eventId => ({
        guest_id: guest.id,
        event_id: eventId,
        rsvp_status: 'pending'
      }));

      const { error: rsvpError } = await supabase
        .from('guest_event_rsvp')
        .insert(rsvpEntries);

      if (rsvpError) throw rsvpError;
    }

    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
};

const bulkCreate = async (req, res, next) => {
  try {
    const { guests } = req.body;
    const ownerId = getWeddingOwnerId(req);

    const guestsWithOwner = guests.map(g => ({ ...g, user_id: ownerId }));

    const { data, error } = await supabase
      .from('guests')
      .insert(guestsWithOwner)
      .select();

    if (error) throw error;
    res.status(201).json({ created: data.length, guests: data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('guests')
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

const deleteGuest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const updateRsvp = async (req, res, next) => {
  try {
    const { id, eventId } = req.params;
    const { rsvp_status, plus_ones, plus_one_names, notes } = req.body;

    const { data, error } = await supabase
      .from('guest_event_rsvp')
      .upsert({
        guest_id: id,
        event_id: eventId,
        rsvp_status,
        plus_ones,
        plus_one_names,
        notes,
        responded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = generateGuestTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=guest_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const importGuests = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const guests = parseGuestExcel(req.file.buffer);

    if (guests.length === 0) {
      return res.status(400).json({
        error: 'No valid guest data found in the Excel file',
        details: 'The file does not contain any guest data rows (all rows below the header are empty).',
        hint: 'Make sure you have at least one row with First Name* and Side* filled in.'
      });
    }

    const validationResults = guests.map((guest, index) => ({
      index: index + 1,
      guest,
      validation: validateGuest(guest)
    }));

    const invalidGuests = validationResults.filter(r => !r.validation.isValid);

    if (invalidGuests.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        invalidGuests: invalidGuests.map(r => ({
          row: r.index,
          errors: r.validation.errors
        }))
      });
    }

    const ownerId = getWeddingOwnerId(req);
    const guestsWithOwner = guests.map(g => ({ ...g, user_id: ownerId }));

    const { data, error } = await supabase
      .from('guests')
      .insert(guestsWithOwner)
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Guests imported successfully',
      count: data.length,
      guests: data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getSummary,
  getGroups,
  createGroup,
  getById,
  create,
  bulkCreate,
  update,
  delete: deleteGuest,
  updateRsvp,
  downloadTemplate,
  importGuests
};
