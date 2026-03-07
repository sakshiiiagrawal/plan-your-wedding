const { supabase } = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const { side, rsvp_status, event_id, needs_accommodation, search } = req.query;

    let query = supabase
      .from('guests')
      .select('*, guest_groups(name), room_allocations(*, rooms(*, accommodations(name)))');

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
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, side');

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
    const { data, error } = await supabase
      .from('guest_groups')
      .select('*, guests(count)')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('guest_groups')
      .insert([req.body])
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
    const { data, error } = await supabase
      .from('guests')
      .select('*, guest_groups(*), guest_event_rsvp(*), room_allocations(*, rooms(*, accommodations(*)))')
      .eq('id', id)
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

    // Create guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .insert([guestData])
      .select()
      .single();

    if (guestError) throw guestError;

    // Create RSVP entries for selected events
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

    const { data, error } = await supabase
      .from('guests')
      .insert(guests)
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
    const { data, error } = await supabase
      .from('guests')
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

const deleteGuest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);

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
  updateRsvp
};
