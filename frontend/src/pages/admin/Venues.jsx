import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineLocationMarker, HiOutlinePhone, HiOutlineUsers, HiOutlineCurrencyRupee } from 'react-icons/hi';

const mockVenues = [
  {
    id: 1,
    name: 'Grand Ballroom',
    venue_type: 'banquet_hall',
    address: 'Hotel Radisson Blu, Sector 18, Noida',
    events: ['Engagement & Sangeet'],
    capacity: 500,
    total_cost: 800000,
    payment_status: 'paid',
    contact_person: 'Mr. Sharma',
    contact_phone: '9876543210'
  },
  {
    id: 2,
    name: 'Garden Lawns',
    venue_type: 'lawn',
    address: 'Hotel Radisson Blu, Sector 18, Noida',
    events: ['Mehendi'],
    capacity: 200,
    total_cost: 300000,
    payment_status: 'partial',
    contact_person: 'Mr. Sharma',
    contact_phone: '9876543210'
  },
  {
    id: 3,
    name: 'Pool Side Area',
    venue_type: 'outdoor',
    address: 'Hotel Radisson Blu, Sector 18, Noida',
    events: ['Haldi Carnival'],
    capacity: 150,
    total_cost: 200000,
    payment_status: 'pending',
    contact_person: 'Mr. Sharma',
    contact_phone: '9876543210'
  },
  {
    id: 4,
    name: 'Royal Mandap Lawn',
    venue_type: 'lawn',
    address: 'Hotel Radisson Blu, Sector 18, Noida',
    events: ['Wedding Ceremony'],
    capacity: 300,
    total_cost: 1000000,
    payment_status: 'partial',
    contact_person: 'Mr. Sharma',
    contact_phone: '9876543210'
  },
];

export default function Venues() {
  const { canEdit } = useAuth();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'badge-success',
      partial: 'badge-warning',
      pending: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Venues</h1>
        {canEdit && <button className="btn-primary">Add Venue</button>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mockVenues.map((venue) => (
          <div key={venue.id} className="card-hover">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-maroon-800">{venue.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{venue.venue_type.replace('_', ' ')}</p>
              </div>
              <span className={getStatusBadge(venue.payment_status)}>
                {venue.payment_status.charAt(0).toUpperCase() + venue.payment_status.slice(1)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-gray-600">
                <HiOutlineLocationMarker className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{venue.address}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <HiOutlineUsers className="w-4 h-4" />
                <span>Capacity: {venue.capacity} guests</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <HiOutlineCurrencyRupee className="w-4 h-4" />
                <span>Cost: {formatCurrency(venue.total_cost)}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <HiOutlinePhone className="w-4 h-4" />
                <span>{venue.contact_person} - {venue.contact_phone}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gold-100">
              <p className="text-xs text-gray-500 mb-2">Events:</p>
              <div className="flex flex-wrap gap-2">
                {venue.events.map((event) => (
                  <span key={event} className="badge bg-gold-100 text-gold-700">{event}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn-outline flex-1 text-sm py-2">View Details</button>
              <button className="btn-secondary flex-1 text-sm py-2">View on Map</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
