import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../hooks/useApi';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock, HiOutlineSparkles } from 'react-icons/hi';

export default function Events() {
  const { canEdit } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);

  // API hooks
  const { data: events = [], isLoading } = useEvents();

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Events & Itinerary</h1>
      </div>

      {/* Timeline View */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gold-300 hidden md:block" />

        <div className="space-y-6">
          {events.map((event, index) => {
            // Parse color palette if it's a string, otherwise use directly
            const colorPalette = typeof event.color_palette === 'string'
              ? JSON.parse(event.color_palette)
              : (event.color_palette || {});
            const eventColor = colorPalette.primary || '#8B0000';

            return (
              <div key={event.id} className="relative md:pl-16">
                {/* Timeline dot */}
                <div
                  className="absolute left-4 w-5 h-5 rounded-full border-4 border-white shadow hidden md:block"
                  style={{ backgroundColor: eventColor }}
                />

                <div
                  className="card-hover cursor-pointer overflow-hidden"
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  {/* Color bar */}
                  <div
                    className="h-2 -mx-6 -mt-6 mb-4"
                    style={{ backgroundColor: eventColor }}
                  />

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Event Number */}
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
                      style={{ backgroundColor: eventColor }}
                    >
                      {index + 1}
                    </div>

                    {/* Event Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-bold text-maroon-800">
                        {event.name}
                      </h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <HiOutlineCalendar className="w-4 h-4" />
                          {formatDate(event.event_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HiOutlineClock className="w-4 h-4" />
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <HiOutlineLocationMarker className="w-4 h-4" />
                        {event.venues?.name || 'Venue TBD'}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-col gap-2 items-end">
                      <span className="badge bg-gold-100 text-gold-700">
                        <HiOutlineSparkles className="w-3 h-3 mr-1" />
                        {event.theme || 'Theme'}
                      </span>
                      {event.estimated_guests && (
                        <span className="text-sm text-gray-500">
                          ~{event.estimated_guests} guests
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedEvent?.id === event.id && (
                    <div className="mt-6 pt-6 border-t border-gold-200 animate-fade-in">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-maroon-800 mb-2">Description</h4>
                          <p className="text-gray-600">{event.description || 'No description available'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-maroon-800 mb-2">Dress Code</h4>
                          <p className="text-gray-600">{event.dress_code || 'Casual/Formal'}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        {canEdit && <button className="btn-primary">Edit Event</button>}
                        <button className="btn-outline">View Vendors</button>
                        {canEdit && <button className="btn-outline">Manage Rituals</button>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="card text-center py-8 text-gray-500">
              No events found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
