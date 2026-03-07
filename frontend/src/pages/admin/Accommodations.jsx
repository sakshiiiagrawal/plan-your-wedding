import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineHome } from 'react-icons/hi';
import { useAllocationMatrix, useUnassignedGuests } from '../../hooks/useApi';

export default function Accommodations() {
  const { canEdit } = useAuth();
  const { data: allocationMatrix = [], isLoading, error } = useAllocationMatrix();
  const { data: unassignedGuests = [] } = useUnassignedGuests();
  const [selectedHotelId, setSelectedHotelId] = useState(null);

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
        {canEdit && <button className="btn-primary">Add Hotel</button>}
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
                                  <button className="text-sm text-gold-600 hover:text-gold-700">
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
    </div>
  );
}
