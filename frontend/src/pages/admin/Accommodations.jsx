import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineHome, HiOutlinePlus, HiOutlineX } from 'react-icons/hi';
import { useAllocationMatrix, useUnassignedGuests, useCreateAccommodation, useCreateRoom, useCreateAllocation } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function Accommodations() {
  const { canEdit } = useAuth();
  const { data: allocationMatrix = [], isLoading, error } = useAllocationMatrix();
  const { data: unassignedGuests = [] } = useUnassignedGuests();
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [hotelFormData, setHotelFormData] = useState({
    name: '',
    address: '',
    distance_from_venue: '',
    total_rooms_booked: 0,
    total_cost: 0,
    contact_person: '',
    contact_phone: ''
  });
  const [roomFormData, setRoomFormData] = useState({
    accommodationId: null,
    room_number: '',
    room_type: '',
    capacity: 2,
    rate_per_night: 0
  });
  const [allocationFormData, setAllocationFormData] = useState({
    room_id: null,
    guest_id: null,
    check_in_date: '',
    check_out_date: ''
  });

  const createHotelMutation = useCreateAccommodation();
  const createRoomMutation = useCreateRoom();
  const createAllocationMutation = useCreateAllocation();

  // Handler functions
  const resetHotelForm = () => {
    setHotelFormData({
      name: '',
      address: '',
      distance_from_venue: '',
      total_rooms_booked: 0,
      total_cost: 0,
      contact_person: '',
      contact_phone: ''
    });
  };

  const resetRoomForm = () => {
    setRoomFormData({
      accommodationId: null,
      room_number: '',
      room_type: '',
      capacity: 2,
      rate_per_night: 0
    });
  };

  const resetAllocationForm = () => {
    setAllocationFormData({
      room_id: null,
      guest_id: null,
      check_in_date: '',
      check_out_date: ''
    });
  };

  const handleHotelSubmit = async (e) => {
    e.preventDefault();
    try {
      await createHotelMutation.mutateAsync(hotelFormData);
      toast.success('Hotel added successfully!');
      setShowHotelModal(false);
      resetHotelForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to add hotel';
      toast.error(errorMessage);
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      const { accommodationId, ...roomData } = roomFormData;
      await createRoomMutation.mutateAsync({ accommodationId, ...roomData });
      toast.success('Room added successfully!');
      setShowRoomModal(false);
      resetRoomForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to add room';
      toast.error(errorMessage);
    }
  };

  const handleAllocationSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAllocationMutation.mutateAsync(allocationFormData);
      toast.success('Guest assigned successfully!');
      setShowAllocationModal(false);
      resetAllocationForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to assign guest';
      toast.error(errorMessage);
    }
  };

  // Select first hotel by default when data loads
  const selectedHotel = useMemo(() => {
    if (allocationMatrix.length > 0) {
      const hotelId = selectedHotelId || allocationMatrix[0]?.id;
      return allocationMatrix.find(h => h.id === hotelId) || allocationMatrix[0];
    }
    return null;
  }, [allocationMatrix, selectedHotelId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate capacity and allocations for each hotel
  const enrichedHotels = useMemo(() => {
    return allocationMatrix.map(hotel => {
      const rooms = hotel.rooms || [];
      const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
      const guestsAllocated = rooms.reduce((sum, room) => {
        return sum + (room.room_allocations?.length || 0);
      }, 0);

      return {
        ...hotel,
        totalCapacity,
        guestsAllocated,
        roomsBooked: hotel.total_rooms_booked || rooms.length
      };
    });
  }, [allocationMatrix]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading accommodations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading accommodations: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Accommodations & Room Allocation</h1>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowHotelModal(true)}
                className="btn-primary"
              >
                Add Hotel
              </button>
              {selectedHotel && (
                <button
                  onClick={() => {
                    setRoomFormData({ ...roomFormData, accommodationId: selectedHotel.id });
                    setShowRoomModal(true);
                  }}
                  className="btn-outline"
                >
                  Add Room
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {enrichedHotels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No accommodations found</p>
        </div>
      ) : (
        <>
          {/* Hotel Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {enrichedHotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => setSelectedHotelId(hotel.id)}
                className={`card-hover cursor-pointer ${selectedHotel?.id === hotel.id ? 'ring-2 ring-gold-500' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                    <HiOutlineOfficeBuilding className="w-5 h-5 text-gold-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-maroon-800">{hotel.name}</h3>
                    <p className="text-xs text-gray-500">{hotel.distance_from_venue || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Rooms:</span>
                    <span className="ml-1 font-medium">{hotel.roomsBooked}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Allocated:</span>
                    <span className="ml-1 font-medium">{hotel.guestsAllocated}/{hotel.totalCapacity}</span>
                  </div>
                </div>

                {hotel.total_cost && (
                  <div className="mt-3 pt-3 border-t border-gold-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cost:</span>
                      <span className="font-medium text-maroon-800">{formatCurrency(hotel.total_cost)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Room Allocation Matrix */}
          {selectedHotel && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title mb-0">{selectedHotel.name} - Room Allocation</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-400" />
                    <span>Bride Side</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span>Groom Side</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span>Available</span>
                  </div>
                </div>
              </div>

              {selectedHotel.rooms && selectedHotel.rooms.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="table-header">
                        <tr>
                          <th className="text-left p-3">Room</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Capacity</th>
                          <th className="text-left p-3">Guests</th>
                          {canEdit && <th className="text-left p-3">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedHotel.rooms.map((room) => {
                          const allocations = room.room_allocations || [];
                          const guests = allocations.map(alloc => alloc.guests).filter(Boolean);
                          const guestSide = guests[0]?.side;

                          return (
                            <tr key={room.id} className="table-row">
                              <td className="p-3 font-medium">{room.room_number}</td>
                              <td className="p-3 text-gray-600">{room.room_type || 'N/A'}</td>
                              <td className="p-3 text-gray-600">{room.capacity || 0}</td>
                              <td className="p-3">
                                {guests.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${guestSide === 'bride' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                                    <span className="text-gray-700">
                                      {guests.map(g => `${g.first_name} ${g.last_name}`).join(', ')}
                                    </span>
                                    <span className="text-xs text-gray-400">({guests.length}/{room.capacity})</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Available - Drag guest here</span>
                                )}
                              </td>
                              {canEdit && (
                                <td className="p-3">
                                  <button
                                    onClick={() => {
                                      setAllocationFormData({
                                        ...allocationFormData,
                                        room_id: room.id
                                      });
                                      setShowAllocationModal(true);
                                    }}
                                    className="text-sm text-gold-600 hover:text-gold-700"
                                  >
                                    {guests.length > 0 ? 'Edit' : 'Assign'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Unassigned guests needing rooms:</strong> {unassignedGuests.length} guests
                      {unassignedGuests.length > 0 && (
                        <button className="ml-2 text-gold-600 hover:underline">View list</button>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No rooms found for this accommodation. Add rooms to begin allocation.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Hotel Modal */}
      {canEdit && showHotelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Add Hotel</h2>
              <button
                onClick={() => {
                  setShowHotelModal(false);
                  resetHotelForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHotelSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Hotel Name *</label>
                <input
                  type="text"
                  value={hotelFormData.name}
                  onChange={(e) => setHotelFormData({ ...hotelFormData, name: e.target.value })}
                  className="input"
                  placeholder="Hotel name"
                  required
                />
              </div>

              <div>
                <label className="label">Address *</label>
                <textarea
                  value={hotelFormData.address}
                  onChange={(e) => setHotelFormData({ ...hotelFormData, address: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Full address"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Distance from Venue</label>
                  <input
                    type="text"
                    value={hotelFormData.distance_from_venue}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, distance_from_venue: e.target.value })}
                    className="input"
                    placeholder="e.g., 2 km"
                  />
                </div>
                <div>
                  <label className="label">Rooms Booked</label>
                  <input
                    type="number"
                    value={hotelFormData.total_rooms_booked}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, total_rooms_booked: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="label">Total Cost</label>
                <input
                  type="number"
                  value={hotelFormData.total_cost}
                  onChange={(e) => setHotelFormData({ ...hotelFormData, total_cost: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Person</label>
                  <input
                    type="text"
                    value={hotelFormData.contact_person}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, contact_person: e.target.value })}
                    className="input"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="tel"
                    value={hotelFormData.contact_phone}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, contact_phone: e.target.value })}
                    className="input"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setShowHotelModal(false);
                  resetHotelForm();
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleHotelSubmit}
                disabled={createHotelMutation.isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {createHotelMutation.isPending ? 'Adding...' : 'Add Hotel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {canEdit && showRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Add Room</h2>
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  resetRoomForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Room Number *</label>
                  <input
                    type="text"
                    value={roomFormData.room_number}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                    className="input"
                    placeholder="e.g., 101"
                    required
                  />
                </div>
                <div>
                  <label className="label">Room Type *</label>
                  <select
                    value={roomFormData.room_type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select room type</option>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="suite">Suite</option>
                    <option value="family">Family</option>
                    <option value="dormitory">Dormitory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Capacity *</label>
                <input
                  type="number"
                  value={roomFormData.capacity}
                  onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                  className="input"
                  placeholder="2"
                  required
                />
              </div>

              <div>
                <label className="label">Rate Per Night</label>
                <input
                  type="number"
                  value={roomFormData.rate_per_night}
                  onChange={(e) => setRoomFormData({ ...roomFormData, rate_per_night: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setShowRoomModal(false);
                  resetRoomForm();
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleRoomSubmit}
                disabled={createRoomMutation.isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {createRoomMutation.isPending ? 'Adding...' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Guest to Room Modal */}
      {canEdit && showAllocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Assign Guest to Room</h2>
              <button
                onClick={() => {
                  setShowAllocationModal(false);
                  resetAllocationForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocationSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Guest *</label>
                <select
                  value={allocationFormData.guest_id || ''}
                  onChange={(e) => setAllocationFormData({ ...allocationFormData, guest_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Guest</option>
                  {unassignedGuests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.first_name} {guest.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Check-in Date *</label>
                  <input
                    type="date"
                    value={allocationFormData.check_in_date}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, check_in_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Check-out Date *</label>
                  <input
                    type="date"
                    value={allocationFormData.check_out_date}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, check_out_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-gold-50 rounded-lg text-sm text-gray-600">
                {unassignedGuests.length} unassigned guests needing accommodation
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setShowAllocationModal(false);
                  resetAllocationForm();
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleAllocationSubmit}
                disabled={createAllocationMutation.isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {createAllocationMutation.isPending ? 'Assigning...' : 'Assign Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
