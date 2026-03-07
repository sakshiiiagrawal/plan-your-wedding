import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineLocationMarker, HiOutlinePhone, HiOutlineUsers, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { useVenues } from '../../hooks/useApi';

export default function Venues() {
  const { canEdit } = useAuth();
  const { data: venues = [], isLoading, error } = useVenues();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading venues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading venues: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Venues</h1>
        {canEdit && <button className="btn-primary">Add Venue</button>}
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No venues found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="card-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-display font-bold text-maroon-800">{venue.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{venue.venue_type?.replace('_', ' ')}</p>
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

                {venue.capacity && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineUsers className="w-4 h-4" />
                    <span>Capacity: {venue.capacity} guests</span>
                  </div>
                )}

                {venue.total_cost && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineCurrencyRupee className="w-4 h-4" />
                    <span>Cost: {formatCurrency(venue.total_cost)}</span>
                  </div>
                )}

                {(venue.contact_person || venue.contact_phone) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlinePhone className="w-4 h-4" />
                    <span>
                      {venue.contact_person && `${venue.contact_person}`}
                      {venue.contact_person && venue.contact_phone && ' - '}
                      {venue.contact_phone}
                    </span>
                  </div>
                )}
              </div>

              {venue.events && venue.events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gold-100">
                  <p className="text-xs text-gray-500 mb-2">Events:</p>
                  <div className="flex flex-wrap gap-2">
                    {venue.events.map((event) => (
                      <span key={event.id} className="badge bg-gold-100 text-gold-700">{event.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button className="btn-outline flex-1 text-sm py-2">View Details</button>
                {venue.google_maps_link && (
                  <button
                    className="btn-secondary flex-1 text-sm py-2"
                    onClick={() => window.open(venue.google_maps_link, '_blank')}
                  >
                    View on Map
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
