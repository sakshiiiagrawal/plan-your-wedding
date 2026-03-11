const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');
const { generateRoomAllocationTemplate, generateAllVenuesAllocationTemplate, parseRoomAllocationExcel, parseMultiVenueAllocationExcel, validateRoomAllocation, findSimilarGuests } = require('../utils/excel.utils');
const { getWeddingOwnerId } = require('../utils/auth');

const getAll = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('accommodations')
      .select('*, rooms(count)')
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
      .from('accommodations')
      .select('*, rooms(*)')
      .eq('id', id)
      .eq('user_id', ownerId)
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
    const validation = validateRequiredFields(req.body, ['name']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('accommodations')
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
      .from('accommodations')
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

const deleteAccommodation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { error } = await supabase
      .from('accommodations')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);

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
    const ownerId = getWeddingOwnerId(req);
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
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createAllocation = async (req, res, next) => {
  try {
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
    const ownerId = getWeddingOwnerId(req);

    const { data: allGuests, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', ownerId)
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

const downloadAllocationTemplate = async (req, res, next) => {
  try {
    const { hotel_id, hotel_name } = req.query;
    const ownerId = getWeddingOwnerId(req);

    let hotelName = hotel_name;

    if (hotel_id && !hotel_name) {
      const { data: hotel, error } = await supabase
        .from('accommodations')
        .select('name')
        .eq('id', hotel_id)
        .eq('user_id', ownerId)
        .single();

      if (error || !hotel) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      hotelName = hotel.name;
    }

    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('first_name, last_name, side, needs_accommodation')
      .eq('user_id', ownerId)
      .order('side', { ascending: true })
      .order('first_name', { ascending: true });

    if (guestsError) throw guestsError;

    const buffer = generateRoomAllocationTemplate(hotelName || 'Hotel Name', guests || []);
    const filename = hotelName
      ? `${hotelName.replace(/\s+/g, '_')}_room_allocation.xlsx`
      : 'room_allocation_template.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const importAllocations = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { hotel_id, hotel_name } = req.body || req.query;
    const ownerId = getWeddingOwnerId(req);

    if (!hotel_id && !hotel_name) {
      return res.status(400).json({
        error: 'Hotel information is required. Please provide hotel_id or hotel_name.'
      });
    }

    let accommodationQuery = supabase.from('accommodations').select('id, name').eq('user_id', ownerId);

    if (hotel_id) {
      accommodationQuery = accommodationQuery.eq('id', hotel_id);
    } else {
      accommodationQuery = accommodationQuery.ilike('name', hotel_name);
    }

    const { data: accommodations, error: accomError } = await accommodationQuery.limit(1);

    if (accomError) throw accomError;

    if (!accommodations || accommodations.length === 0) {
      return res.status(404).json({
        error: `Hotel "${hotel_name || hotel_id}" not found. Please create the hotel first.`
      });
    }

    const accommodation = accommodations[0];

    const allocations = parseRoomAllocationExcel(req.file.buffer, accommodation.name);

    if (allocations.length === 0) {
      return res.status(400).json({
        error: 'No valid room allocation data found in the Excel file',
        details: 'The file does not contain any room allocation data (all rows below the header are empty).',
        hint: 'Make sure you have at least one row with Room Number*, Guest 1, and dates filled in.'
      });
    }

    const validationResults = allocations.map((allocation, index) => ({
      index: index + 1,
      allocation,
      validation: validateRoomAllocation(allocation)
    }));

    const invalidAllocations = validationResults.filter(r => !r.validation.isValid);

    if (invalidAllocations.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        invalidAllocations: invalidAllocations.map(r => ({
          row: r.index,
          guest: r.allocation.guest_full_name,
          errors: r.validation.errors
        }))
      });
    }

    const { data: allGuests, error: allGuestsError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, side')
      .eq('user_id', ownerId);

    if (allGuestsError) throw allGuestsError;

    const processedAllocations = [];
    const allocationsToUpdate = [];
    const errors = [];
    const warnings = [];
    const createdRooms = [];
    const roomCache = {};

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      const rowNum = i + 1;

      try {
        let room;

        if (roomCache[allocation.room_number]) {
          room = roomCache[allocation.room_number];
        } else {
          const { data: existingRooms, error: roomError } = await supabase
            .from('rooms')
            .select('id, capacity, room_number')
            .eq('accommodation_id', accommodation.id)
            .eq('room_number', allocation.room_number)
            .limit(1);

          if (roomError) throw roomError;

          if (existingRooms && existingRooms.length > 0) {
            room = existingRooms[0];
          } else {
            const guestsInRoom = allocations.filter(a => a.room_number === allocation.room_number).length;
            const defaultCapacity = Math.max(guestsInRoom, 2);

            const { data: newRoom, error: createError } = await supabase
              .from('rooms')
              .insert([{
                accommodation_id: accommodation.id,
                room_number: allocation.room_number,
                room_type: 'double',
                capacity: defaultCapacity,
                rate_per_night: 0
              }])
              .select('id, capacity, room_number')
              .single();

            if (createError) throw createError;

            room = newRoom;
            createdRooms.push(room);
          }

          roomCache[allocation.room_number] = room;
        }

        let guestQuery = supabase.from('guests').select('id, first_name, last_name').eq('user_id', ownerId);

        if (allocation.guest_last_name) {
          guestQuery = guestQuery
            .ilike('first_name', allocation.guest_first_name)
            .ilike('last_name', allocation.guest_last_name);
        } else {
          guestQuery = guestQuery.ilike('first_name', allocation.guest_first_name);
        }

        const { data: guests, error: guestError } = await guestQuery.limit(1);

        if (guestError) throw guestError;

        let guest = null;

        if (guests && guests.length > 0) {
          guest = guests[0];
        } else {
          const similarGuests = findSimilarGuests(allocation.guest_full_name, allGuests);

          if (similarGuests.length > 0) {
            errors.push({
              row: rowNum,
              guest: allocation.guest_full_name,
              error: `Guest "${allocation.guest_full_name}" not found. Did you mean one of these?`,
              suggestions: similarGuests.map(s => ({
                name: s.fullName,
                similarity: `${Math.round(s.similarity * 100)}% match`,
                side: s.guest.side
              }))
            });
          } else {
            errors.push({
              row: rowNum,
              guest: allocation.guest_full_name,
              error: `Guest "${allocation.guest_full_name}" not found. Please check spelling or import the guest first.`
            });
          }
          continue;
        }

        const { data: existingAllocations, error: existingError } = await supabase
          .from('room_allocations')
          .select('id, guest_id')
          .eq('room_id', room.id);

        if (existingError) throw existingError;

        const existingAllocation = existingAllocations?.find(a => a.guest_id === guest.id);

        if (existingAllocation) {
          allocationsToUpdate.push({
            id: existingAllocation.id,
            check_in_date: allocation.check_in_date,
            check_out_date: allocation.check_out_date
          });
          continue;
        }

        if (existingAllocations && existingAllocations.length >= room.capacity) {
          errors.push({
            row: rowNum,
            guest: allocation.guest_full_name,
            error: `Room "${allocation.room_number}" is at full capacity (${room.capacity} guests)`
          });
          continue;
        }

        processedAllocations.push({
          room_id: room.id,
          guest_id: guest.id,
          check_in_date: allocation.check_in_date,
          check_out_date: allocation.check_out_date
        });
      } catch (error) {
        errors.push({
          row: rowNum,
          guest: allocation.guest_full_name,
          error: error.message
        });
      }
    }

    if (errors.length > 0 && processedAllocations.length === 0 && allocationsToUpdate.length === 0) {
      return res.status(400).json({
        error: 'All allocations failed to process',
        errors
      });
    }

    let allFormattedAllocations = [];

    if (processedAllocations.length > 0) {
      const { data, error: insertError } = await supabase
        .from('room_allocations')
        .insert(processedAllocations)
        .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))');

      if (insertError) throw insertError;

      const formattedNew = data.map(allocation => ({
        guest: `${allocation.guests.first_name} ${allocation.guests.last_name}`.trim(),
        room: allocation.rooms.room_number,
        venue: allocation.rooms.accommodations.name,
        checkIn: allocation.check_in_date,
        checkOut: allocation.check_out_date,
        action: 'created'
      }));

      allFormattedAllocations = [...allFormattedAllocations, ...formattedNew];
    }

    if (allocationsToUpdate.length > 0) {
      for (const updateData of allocationsToUpdate) {
        const { data, error: updateError } = await supabase
          .from('room_allocations')
          .update({
            check_in_date: updateData.check_in_date,
            check_out_date: updateData.check_out_date
          })
          .eq('id', updateData.id)
          .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))')
          .single();

        if (updateError) throw updateError;

        allFormattedAllocations.push({
          guest: `${data.guests.first_name} ${data.guests.last_name}`.trim(),
          room: data.rooms.room_number,
          venue: data.rooms.accommodations.name,
          checkIn: data.check_in_date,
          checkOut: data.check_out_date,
          action: 'updated'
        });
      }
    }

    if (allFormattedAllocations.length > 0) {
      const response = {
        message: 'Room allocations imported successfully',
        count: allFormattedAllocations.length,
        created: processedAllocations.length,
        updated: allocationsToUpdate.length,
        hotel: accommodation.name,
        allocations: allFormattedAllocations
      };

      if (createdRooms.length > 0) {
        response.roomsCreated = createdRooms.length;
        response.newRooms = createdRooms.map(r => r.room_number);
      }

      if (warnings.length > 0) {
        response.warnings = warnings;
      }

      if (errors.length > 0) {
        response.partialSuccess = true;
        response.failedCount = errors.length;
        response.errors = errors;
      }

      res.status(201).json(response);
    }
  } catch (error) {
    next(error);
  }
};

const downloadAllVenuesTemplate = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: venues, error: venuesError } = await supabase
      .from('accommodations')
      .select('id, name')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (venuesError) throw venuesError;

    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('first_name, last_name, side, needs_accommodation')
      .eq('user_id', ownerId)
      .order('side', { ascending: true })
      .order('first_name', { ascending: true });

    if (guestsError) throw guestsError;

    const buffer = generateAllVenuesAllocationTemplate(venues || [], guests || []);
    const filename = 'all_venues_room_allocation.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const importAllVenuesAllocations = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ownerId = getWeddingOwnerId(req);

    const { data: venues, error: venuesError } = await supabase
      .from('accommodations')
      .select('id, name')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (venuesError) throw venuesError;

    if (!venues || venues.length === 0) {
      return res.status(400).json({
        error: 'No venues found. Please create venues/hotels first before importing allocations.'
      });
    }

    const venuesMap = {};
    venues.forEach(venue => {
      venuesMap[venue.name.toLowerCase()] = venue;
    });

    const allocations = parseMultiVenueAllocationExcel(req.file.buffer, venuesMap);

    if (allocations.length === 0) {
      return res.status(400).json({
        error: 'No valid room allocation data found in the Excel file',
        details: 'The file does not contain any room allocation data (all rows below headers are empty).',
        hint: 'Make sure you have at least one row with Room Number*, Guest 1, and dates filled in on any venue sheet.'
      });
    }

    const validationResults = allocations.map((allocation, index) => ({
      index: index + 1,
      allocation,
      validation: validateRoomAllocation(allocation)
    }));

    const invalidAllocations = validationResults.filter(r => !r.validation.isValid);

    if (invalidAllocations.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        invalidAllocations: invalidAllocations.map(r => ({
          row: r.index,
          sheet: r.allocation.sheet_name,
          guest: r.allocation.guest_full_name,
          errors: r.validation.errors
        }))
      });
    }

    const { data: allGuests, error: allGuestsError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, side')
      .eq('user_id', ownerId);

    if (allGuestsError) throw allGuestsError;

    const processedAllocations = [];
    const allocationsToUpdate = [];
    const errors = [];
    const createdRooms = [];
    const roomCache = {};

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      const rowNum = i + 1;

      try {
        const venueName = allocation.hotel_name.toLowerCase();
        const venue = venuesMap[venueName] || Object.values(venuesMap).find(v =>
          v.name.toLowerCase().includes(venueName) || venueName.includes(v.name.toLowerCase())
        );

        if (!venue) {
          errors.push({
            row: rowNum,
            sheet: allocation.sheet_name,
            guest: allocation.guest_full_name,
            error: `Venue "${allocation.hotel_name}" not found. Please create it first or check the sheet name matches the venue name.`
          });
          continue;
        }

        const roomKey = `${venue.id}_${allocation.room_number}`;
        let room;

        if (roomCache[roomKey]) {
          room = roomCache[roomKey];
        } else {
          const { data: existingRooms, error: roomError } = await supabase
            .from('rooms')
            .select('id, capacity, room_number')
            .eq('accommodation_id', venue.id)
            .eq('room_number', allocation.room_number)
            .limit(1);

          if (roomError) throw roomError;

          if (existingRooms && existingRooms.length > 0) {
            room = existingRooms[0];
          } else {
            const guestsInRoom = allocations.filter(a =>
              a.hotel_name === allocation.hotel_name && a.room_number === allocation.room_number
            ).length;
            const defaultCapacity = Math.max(guestsInRoom, 2);

            const { data: newRoom, error: createError } = await supabase
              .from('rooms')
              .insert([{
                accommodation_id: venue.id,
                room_number: allocation.room_number,
                room_type: 'double',
                capacity: defaultCapacity,
                rate_per_night: 0
              }])
              .select('id, capacity, room_number')
              .single();

            if (createError) throw createError;

            room = newRoom;
            createdRooms.push({ venue: venue.name, room: room.room_number });
          }

          roomCache[roomKey] = room;
        }

        let guestQuery = supabase.from('guests').select('id, first_name, last_name').eq('user_id', ownerId);

        if (allocation.guest_last_name) {
          guestQuery = guestQuery
            .ilike('first_name', allocation.guest_first_name)
            .ilike('last_name', allocation.guest_last_name);
        } else {
          guestQuery = guestQuery.ilike('first_name', allocation.guest_first_name);
        }

        const { data: guests, error: guestError } = await guestQuery.limit(1);

        if (guestError) throw guestError;

        let guest = null;

        if (guests && guests.length > 0) {
          guest = guests[0];
        } else {
          const similarGuests = findSimilarGuests(allocation.guest_full_name, allGuests);

          if (similarGuests.length > 0) {
            errors.push({
              row: rowNum,
              sheet: allocation.sheet_name,
              guest: allocation.guest_full_name,
              error: `Guest "${allocation.guest_full_name}" not found. Did you mean one of these?`,
              suggestions: similarGuests.map(s => ({
                name: s.fullName,
                similarity: `${Math.round(s.similarity * 100)}% match`,
                side: s.guest.side
              }))
            });
          } else {
            errors.push({
              row: rowNum,
              sheet: allocation.sheet_name,
              guest: allocation.guest_full_name,
              error: `Guest "${allocation.guest_full_name}" not found. Please check spelling or import the guest first.`
            });
          }
          continue;
        }

        const { data: existingAllocations, error: existingError } = await supabase
          .from('room_allocations')
          .select('id, guest_id')
          .eq('room_id', room.id);

        if (existingError) throw existingError;

        const existingAllocation = existingAllocations?.find(a => a.guest_id === guest.id);

        if (existingAllocation) {
          allocationsToUpdate.push({
            id: existingAllocation.id,
            check_in_date: allocation.check_in_date,
            check_out_date: allocation.check_out_date
          });
          continue;
        }

        if (existingAllocations && existingAllocations.length >= room.capacity) {
          errors.push({
            row: rowNum,
            sheet: allocation.sheet_name,
            guest: allocation.guest_full_name,
            error: `Room "${allocation.room_number}" at ${venue.name} is at full capacity (${room.capacity} guests)`
          });
          continue;
        }

        processedAllocations.push({
          room_id: room.id,
          guest_id: guest.id,
          check_in_date: allocation.check_in_date,
          check_out_date: allocation.check_out_date
        });
      } catch (error) {
        errors.push({
          row: rowNum,
          sheet: allocation.sheet_name,
          guest: allocation.guest_full_name,
          error: error.message
        });
      }
    }

    if (errors.length > 0 && processedAllocations.length === 0 && allocationsToUpdate.length === 0) {
      return res.status(400).json({
        error: 'All allocations failed to process',
        errors
      });
    }

    let allFormattedAllocations = [];

    if (processedAllocations.length > 0) {
      const { data, error: insertError } = await supabase
        .from('room_allocations')
        .insert(processedAllocations)
        .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))');

      if (insertError) throw insertError;

      const formattedNew = data.map(allocation => ({
        guest: `${allocation.guests.first_name} ${allocation.guests.last_name}`.trim(),
        room: allocation.rooms.room_number,
        venue: allocation.rooms.accommodations.name,
        checkIn: allocation.check_in_date,
        checkOut: allocation.check_out_date,
        action: 'created'
      }));

      allFormattedAllocations = [...allFormattedAllocations, ...formattedNew];
    }

    if (allocationsToUpdate.length > 0) {
      for (const updateData of allocationsToUpdate) {
        const { data, error: updateError } = await supabase
          .from('room_allocations')
          .update({
            check_in_date: updateData.check_in_date,
            check_out_date: updateData.check_out_date
          })
          .eq('id', updateData.id)
          .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))')
          .single();

        if (updateError) throw updateError;

        allFormattedAllocations.push({
          guest: `${data.guests.first_name} ${data.guests.last_name}`.trim(),
          room: data.rooms.room_number,
          venue: data.rooms.accommodations.name,
          checkIn: data.check_in_date,
          checkOut: data.check_out_date,
          action: 'updated'
        });
      }
    }

    if (allFormattedAllocations.length > 0) {
      const response = {
        message: 'Room allocations imported successfully',
        count: allFormattedAllocations.length,
        created: processedAllocations.length,
        updated: allocationsToUpdate.length,
        allocations: allFormattedAllocations
      };

      if (createdRooms.length > 0) {
        response.roomsCreated = createdRooms.length;
        response.newRooms = createdRooms;
      }

      if (errors.length > 0) {
        response.partialSuccess = true;
        response.failedCount = errors.length;
        response.errors = errors;
      }

      res.status(201).json(response);
    }
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
  getUnassignedGuests,
  downloadAllocationTemplate,
  downloadAllVenuesTemplate,
  importAllocations,
  importAllVenuesAllocations
};
