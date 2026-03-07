import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineHome } from 'react-icons/hi';

const mockAccommodations = [
  {
    id: 1,
    name: 'Hotel Malsi Mist',
    type: 'hotel',
    distance: '0.5 km (Main Venue)',
    rooms_booked: 24,
    total_capacity: 60,
    guests_allocated: 0,
    total_cost: 741000,
    check_in: '2026-11-24',
    check_out: '2026-11-27'
  },
  {
    id: 2,
    name: 'Hotel White Rock',
    type: 'hotel',
    distance: '0.7 km',
    rooms_booked: 28,
    total_capacity: 70,
    guests_allocated: 0,
    total_cost: 120000,
    check_in: '2026-11-25',
    check_out: '2026-11-26'
  },
];

const mockRooms = [
  { id: 1, number: '201', type: 'Double', capacity: 2, guests: ['Rakesh Agrawal', 'Sunita Agrawal'], side: 'bride' },
  { id: 2, number: '202', type: 'Double', capacity: 2, guests: ['Vinod Dangwal', 'Meera Dangwal'], side: 'groom' },
  { id: 3, number: '203', type: 'Family', capacity: 4, guests: ['Sharma Family'], side: 'bride' },
  { id: 4, number: '204', type: 'Suite', capacity: 2, guests: [], side: null },
  { id: 5, number: '205', type: 'Double', capacity: 2, guests: ['Amit Kumar'], side: 'groom' },
  { id: 6, number: '206', type: 'Double', capacity: 2, guests: [], side: null },
];

export default function Accommodations() {
  const { canEdit } = useAuth();
  const [selectedHotel, setSelectedHotel] = useState(mockAccommodations[0]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Accommodations & Room Allocation</h1>
        {canEdit && <button className="btn-primary">Add Hotel</button>}
      </div>

      {/* Hotel Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {mockAccommodations.map((hotel) => (
          <div
            key={hotel.id}
            onClick={() => setSelectedHotel(hotel)}
            className={`card-hover cursor-pointer ${selectedHotel?.id === hotel.id ? 'ring-2 ring-gold-500' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <HiOutlineOfficeBuilding className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h3 className="font-semibold text-maroon-800">{hotel.name}</h3>
                <p className="text-xs text-gray-500">{hotel.distance}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Rooms:</span>
                <span className="ml-1 font-medium">{hotel.rooms_booked}</span>
              </div>
              <div>
                <span className="text-gray-500">Allocated:</span>
                <span className="ml-1 font-medium">{hotel.guests_allocated}/{hotel.total_capacity}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gold-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cost:</span>
                <span className="font-medium text-maroon-800">{formatCurrency(hotel.total_cost)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Room Allocation Matrix */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">{selectedHotel?.name} - Room Allocation</h3>
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
              {mockRooms.map((room) => (
                <tr key={room.id} className="table-row">
                  <td className="p-3 font-medium">{room.number}</td>
                  <td className="p-3 text-gray-600">{room.type}</td>
                  <td className="p-3 text-gray-600">{room.capacity}</td>
                  <td className="p-3">
                    {room.guests.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${room.side === 'bride' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                        <span className="text-gray-700">{room.guests.join(', ')}</span>
                        <span className="text-xs text-gray-400">({room.guests.length}/{room.capacity})</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Available - Drag guest here</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <button className="text-sm text-gold-600 hover:text-gold-700">
                        {room.guests.length > 0 ? 'Edit' : 'Assign'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-gold-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Unassigned guests needing rooms:</strong> 12 guests
            <button className="ml-2 text-gold-600 hover:underline">View list</button>
          </p>
        </div>
      </div>
    </div>
  );
}
