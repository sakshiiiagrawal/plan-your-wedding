import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents, useVenues, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock, HiOutlineSparkles, HiOutlinePlus, HiOutlineX, HiOutlineTrash } from 'react-icons/hi';

export default function Events() {
  const { canEdit } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    event_type: '',
    event_date: '',
    start_time: '',
    end_time: '',
    venue_id: null,
    theme: '',
    description: '',
    dress_code: '',
    estimated_guests: 0,
    color_palette: { primary: '#8B0000' }
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // API hooks
  const { data: events = [], isLoading } = useEvents();
  const { data: venues = [] } = useVenues();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  // Handler functions
  const resetForm = () => {
    setFormData({
      name: '',
      event_type: '',
      event_date: '',
      start_time: '',
      end_time: '',
      venue_id: null,
      theme: '',
      description: '',
      dress_code: '',
      estimated_guests: 0,
      color_palette: { primary: '#8B0000' }
    });
    setEditingEvent(null);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    const colorPalette = typeof event.color_palette === 'string'
      ? JSON.parse(event.color_palette)
      : (event.color_palette || {});
    setFormData({
      name: event.name || '',
      event_type: event.event_type || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      venue_id: event.venue_id || null,
      theme: event.theme || '',
      description: event.description || '',
      dress_code: event.dress_code || '',
      estimated_guests: event.estimated_guests || 0,
      color_palette: colorPalette
    });
    setShowEventModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        color_palette: JSON.stringify(formData.color_palette)
      };
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, ...submitData });
        toast.success('Event updated successfully!');
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success('Event created successfully!');
      }
      setShowEventModal(false);
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save event';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Event deleted successfully!');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

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
        {canEdit && (
          <button
            onClick={() => setShowEventModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Event
          </button>
        )}
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
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(event)}
                              className="btn-primary"
                            >
                              Edit Event
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(event.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              Delete Event
                            </button>
                          </>
                        )}
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

      {/* Add/Edit Event Modal */}
      {canEdit && showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h2>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Event Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Mehendi, Sangeet, Wedding"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Event Type *</label>
                  <select
                    value={formData.event_type || ''}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="sangeet">Sangeet</option>
                    <option value="mehendi">Mehendi</option>
                    <option value="haldi">Haldi</option>
                    <option value="wedding">Wedding</option>
                    <option value="reception">Reception</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Event Date *</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Venue</label>
                  <select
                    value={formData.venue_id || ''}
                    onChange={(e) => setFormData({ ...formData, venue_id: e.target.value || null })}
                    className="input"
                  >
                    <option value="">Select Venue</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Estimated Guests</label>
                  <input
                    type="number"
                    value={formData.estimated_guests}
                    onChange={(e) => setFormData({ ...formData, estimated_guests: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Theme</label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    className="input"
                    placeholder="e.g., Traditional, Modern"
                  />
                </div>
                <div>
                  <label className="label">Theme Color</label>
                  <input
                    type="color"
                    value={formData.color_palette.primary}
                    onChange={(e) => setFormData({
                      ...formData,
                      color_palette: { primary: e.target.value }
                    })}
                    className="input h-10"
                  />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Event description..."
                />
              </div>

              <div>
                <label className="label">Dress Code</label>
                <input
                  type="text"
                  value={formData.dress_code}
                  onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                  className="input"
                  placeholder="e.g., Traditional Indian"
                />
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setShowEventModal(false);
                  resetForm();
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingEvent
                  ? 'Update Event'
                  : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
