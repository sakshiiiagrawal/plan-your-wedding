import { useState } from 'react';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock, HiOutlineSparkles } from 'react-icons/hi';

const mockEvents = [
  {
    id: 1,
    name: 'Mehendi',
    event_type: 'mehendi',
    date: '2026-11-24',
    start_time: '18:00',
    end_time: '23:00',
    venue: 'Garden Lawns, Hotel Radisson',
    dress_code: 'Green/Yellow Traditional',
    theme: 'Floral Garden',
    color: '#228B22',
    estimated_guests: 150,
    description: 'Traditional Mehendi ceremony with music, dance and celebrations.'
  },
  {
    id: 2,
    name: 'Haldi Carnival',
    event_type: 'haldi',
    date: '2026-11-25',
    start_time: '09:00',
    end_time: '13:00',
    venue: 'Pool Side, Hotel Radisson',
    dress_code: 'Yellow Attire',
    theme: 'Yellow Carnival',
    color: '#FFD700',
    estimated_guests: 100,
    description: 'Colorful Haldi ceremony with fun activities and water splash.'
  },
  {
    id: 3,
    name: 'Engagement & Sangeet',
    event_type: 'sangeet',
    date: '2026-11-25',
    start_time: '18:00',
    end_time: '00:00',
    venue: 'Grand Ballroom, Hotel Radisson',
    dress_code: 'Indo-Western/Cocktail',
    theme: 'Starry Night',
    color: '#1A237E',
    estimated_guests: 200,
    description: 'Ring ceremony followed by dance performances and music.'
  },
  {
    id: 4,
    name: 'Wedding Ceremony',
    event_type: 'wedding',
    date: '2026-11-26',
    start_time: '07:00',
    end_time: '16:00',
    venue: 'Main Lawn, Hotel Radisson',
    dress_code: 'Traditional - Red/Maroon',
    theme: 'Royal Indian Wedding',
    color: '#8B0000',
    estimated_guests: 250,
    description: 'Main wedding ceremony with traditional Baniya-Brahmin rituals.'
  },
];

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

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
          {mockEvents.map((event, index) => (
            <div key={event.id} className="relative md:pl-16">
              {/* Timeline dot */}
              <div
                className="absolute left-4 w-5 h-5 rounded-full border-4 border-white shadow hidden md:block"
                style={{ backgroundColor: event.color }}
              />

              <div
                className="card-hover cursor-pointer overflow-hidden"
                onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
              >
                {/* Color bar */}
                <div
                  className="h-2 -mx-6 -mt-6 mb-4"
                  style={{ backgroundColor: event.color }}
                />

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Event Number */}
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
                    style={{ backgroundColor: event.color }}
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
                        {formatDate(event.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="w-4 h-4" />
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                      <HiOutlineLocationMarker className="w-4 h-4" />
                      {event.venue}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-col gap-2 items-end">
                    <span className="badge bg-gold-100 text-gold-700">
                      <HiOutlineSparkles className="w-3 h-3 mr-1" />
                      {event.theme}
                    </span>
                    <span className="text-sm text-gray-500">
                      ~{event.estimated_guests} guests
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedEvent?.id === event.id && (
                  <div className="mt-6 pt-6 border-t border-gold-200 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-maroon-800 mb-2">Description</h4>
                        <p className="text-gray-600">{event.description}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-maroon-800 mb-2">Dress Code</h4>
                        <p className="text-gray-600">{event.dress_code}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button className="btn-primary">Edit Event</button>
                      <button className="btn-outline">View Vendors</button>
                      <button className="btn-outline">Manage Rituals</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
