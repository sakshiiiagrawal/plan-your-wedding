/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import {
  useEvents,
  useVenues,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import {
  HiOutlineCalendar,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineChevronDown,
} from 'react-icons/hi';

// ── PAN India wedding event types ──────────────────────────────────────────
const EVENT_TYPES = [
  // Pre-Wedding
  { value: 'roka', label: 'Roka Ceremony', group: 'Pre-Wedding' },
  { value: 'engagement', label: 'Engagement / Sagai', group: 'Pre-Wedding' },
  { value: 'ring_ceremony', label: 'Ring Ceremony', group: 'Pre-Wedding' },
  { value: 'tilak', label: 'Tilak Ceremony', group: 'Pre-Wedding' },
  { value: 'chunni', label: 'Chunni Ceremony', group: 'Pre-Wedding' },
  { value: 'lagan', label: 'Lagan', group: 'Pre-Wedding' },
  { value: 'shagun', label: 'Shagun Ceremony', group: 'Pre-Wedding' },
  { value: 'saatak', label: 'Saatak', group: 'Pre-Wedding' },
  // Wedding Celebrations
  { value: 'mehendi', label: 'Mehendi', group: 'Wedding Celebrations' },
  { value: 'haldi', label: 'Haldi', group: 'Wedding Celebrations' },
  { value: 'sangeet', label: 'Sangeet', group: 'Wedding Celebrations' },
  { value: 'cocktail', label: 'Cocktail Party', group: 'Wedding Celebrations' },
  { value: 'bachelor', label: 'Bachelor Party', group: 'Wedding Celebrations' },
  { value: 'bachelorette', label: 'Bachelorette Party', group: 'Wedding Celebrations' },
  { value: 'bridal_shower', label: 'Bridal Shower', group: 'Wedding Celebrations' },
  // Wedding Day
  { value: 'baraat', label: 'Baraat', group: 'Wedding Day' },
  { value: 'jaimala', label: 'Jai Mala / Varmala', group: 'Wedding Day' },
  { value: 'pheras', label: 'Pheras / Saat Phere', group: 'Wedding Day' },
  { value: 'wedding', label: 'Wedding', group: 'Wedding Day' },
  { value: 'vidaai', label: 'Vidaai', group: 'Wedding Day' },
  // Post-Wedding
  { value: 'reception', label: 'Reception', group: 'Post-Wedding' },
  { value: 'griha_pravesh', label: 'Griha Pravesh', group: 'Post-Wedding' },
  { value: 'pag_phere', label: 'Pag Phere', group: 'Post-Wedding' },
  // Religious Rituals
  { value: 'ganesh_puja', label: 'Ganesh Puja', group: 'Religious Rituals' },
  { value: 'havan', label: 'Havan / Homam', group: 'Religious Rituals' },
  { value: 'mata_ki_chowki', label: 'Mata Ki Chowki', group: 'Religious Rituals' },
  { value: 'satyanarayan_katha', label: 'Satyanarayan Katha', group: 'Religious Rituals' },
  // South Indian
  { value: 'nischitartham', label: 'Nischitartham / Nichayathartham', group: 'South Indian' },
  { value: 'naandi', label: 'Naandi', group: 'South Indian' },
  { value: 'pellikuturu', label: 'Pellikuturu', group: 'South Indian' },
  { value: 'pellikoduku', label: 'Pellikoduku', group: 'South Indian' },
  { value: 'oonjal', label: 'Oonjal', group: 'South Indian' },
  { value: 'kashi_yatra', label: 'Kashi Yatra', group: 'South Indian' },
  { value: 'muhurtam', label: 'Muhurtam', group: 'South Indian' },
  { value: 'sumangali_prarthanai', label: 'Sumangali Prarthanai', group: 'South Indian' },
];

const KNOWN_TYPE_VALUES = new Set(EVENT_TYPES.map((t) => t.value));

function getTypeLabel(value: string) {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ── Searchable event type combobox ─────────────────────────────────────────
interface EventTypeComboboxProps {
  value: string;
  isOther: boolean;
  onSelect: (value: string, isOther: boolean) => void;
}

function EventTypeCombobox({ value, isOther, onSelect }: EventTypeComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const q = query.toLowerCase();
  const filtered = q
    ? EVENT_TYPES.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.group.toLowerCase().includes(q) ||
          t.value.toLowerCase().includes(q),
      )
    : EVENT_TYPES;

  // Group filtered results
  const grouped: Record<string, typeof EVENT_TYPES> = {};
  for (const t of filtered) {
    if (!grouped[t.group]) grouped[t.group] = [];
    (grouped[t.group] as typeof EVENT_TYPES).push(t);
  }

  const displayLabel = isOther ? 'Other (Custom)' : value ? getTypeLabel(value) : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left w-full"
      >
        <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || 'Select event type'}
        </span>
        <HiOutlineChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search event types..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto">
            {Object.entries(grouped).map(([group, types]) => (
              <div key={group}>
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  {group}
                </div>
                {types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      onSelect(t.value, false);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gold-50 transition-colors ${
                      value === t.value && !isOther
                        ? 'bg-gold-50 text-gold-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ))}

            {/* "Other" option always visible at bottom */}
            {!q && (
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  Other
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelect('', true);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gold-50 transition-colors ${
                    isOther ? 'bg-gold-50 text-gold-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Other (Custom)
                </button>
              </div>
            )}

            {Object.keys(grouped).length === 0 && q && (
              <div className="px-4 py-3 text-sm text-gray-500">
                No match — select{' '}
                <button
                  type="button"
                  className="text-gold-600 underline"
                  onClick={() => {
                    onSelect('', true);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  Other (Custom)
                </button>{' '}
                to enter your own.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface EventFormData {
  name: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  theme: string;
  description: string;
  dress_code: string;
  estimated_guests: number;
  color_palette: { primary: string };
}

const DEFAULT_FORM: EventFormData = {
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
  color_palette: { primary: '#8B0000' },
};

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);
  const [isOtherType, setIsOtherType] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: events = [], isLoading } = useEvents();
  const { data: venues = [] } = useVenues();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingEvent(null);
    setIsOtherType(false);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    const colorPalette =
      typeof event.color_palette === 'string'
        ? JSON.parse(event.color_palette)
        : event.color_palette || {};
    const isCustom = event.event_type && !KNOWN_TYPE_VALUES.has(event.event_type);
    setIsOtherType(isCustom);
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
      color_palette: colorPalette,
    });
    setShowEventModal(true);
  };

  const handleTypeSelect = (value: string, other: boolean) => {
    setIsOtherType(other);
    setFormData((prev) => ({ ...prev, event_type: other ? '' : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_type) {
      toast.error('Please enter an event type');
      return;
    }
    try {
      const submitData = {
        ...formData,
        color_palette: JSON.stringify(formData.color_palette),
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
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save event';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Event deleted successfully!');
      setDeleteConfirm(null);
      if ((selectedEvent as any)?.id === id) setSelectedEvent(null);
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    const parts = time.split(':');
    const hours = parts[0] ?? '0';
    const minutes = parts[1] ?? '00';
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Events & Itinerary</h1>
        <button
          onClick={() => setShowEventModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gold-300 hidden md:block" />

        <div className="space-y-6">
          {events.map((event, index) => {
            const colorPalette =
              typeof event.color_palette === 'string'
                ? JSON.parse(event.color_palette)
                : event.color_palette || {};
            const eventColor = (colorPalette as any).primary || '#8B0000';
            const startTime = formatTime(event.start_time);
            const endTime = formatTime(event.end_time);

            return (
              <div key={event.id} className="relative md:pl-16">
                <div
                  className="absolute left-4 w-5 h-5 rounded-full border-4 border-white shadow hidden md:block"
                  style={{ backgroundColor: eventColor }}
                />

                <div
                  className="card-hover cursor-pointer overflow-hidden"
                  onClick={() =>
                    setSelectedEvent((selectedEvent as any)?.id === event.id ? null : event)
                  }
                >
                  <div className="h-2 -mx-6 -mt-6 mb-4" style={{ backgroundColor: eventColor }} />

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
                      style={{ backgroundColor: eventColor }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-display font-bold text-maroon-800">
                          {event.name}
                        </h3>
                        {event.event_type && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-maroon-50 text-maroon-700 border border-maroon-200">
                            {getTypeLabel(event.event_type)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <HiOutlineCalendar className="w-4 h-4" />
                          {formatDate(event.event_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HiOutlineClock className="w-4 h-4" />
                          {startTime}
                          {endTime ? ` – ${endTime}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <HiOutlineLocationMarker className="w-4 h-4" />
                        {(event as any).venues?.name || 'Venue TBD'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-start md:items-end">
                      {event.theme && (
                        <span className="badge bg-gold-100 text-gold-700">
                          <HiOutlineSparkles className="w-3 h-3 mr-1" />
                          {event.theme}
                        </span>
                      )}
                      {event.estimated_guests ? (
                        <span className="text-sm text-gray-500">
                          ~{event.estimated_guests} guests
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {(selectedEvent as any)?.id === event.id && (
                    <div className="mt-6 pt-6 border-t border-gold-200 animate-fade-in">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-maroon-800 mb-2">Description</h4>
                          <p className="text-gray-600">
                            {event.description || 'No description available'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-maroon-800 mb-2">Dress Code</h4>
                          <p className="text-gray-600">{event.dress_code || 'Casual/Formal'}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(event);
                          }}
                          className="btn-primary"
                        >
                          Edit Event
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(event.id);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🎊</div>
              <p className="text-gray-500 mb-4">No events yet. Start planning your celebrations!</p>
              <button
                onClick={() => setShowEventModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add First Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {showEventModal && (
        <Portal>
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
                    placeholder="e.g., Mehendi Night, Ring Ceremony"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Event Type *</label>
                    <EventTypeCombobox
                      value={isOtherType ? '' : formData.event_type}
                      isOther={isOtherType}
                      onSelect={handleTypeSelect}
                    />
                    {isOtherType && (
                      <input
                        type="text"
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                        className="input mt-2"
                        placeholder="Describe your custom event type"
                        required
                        autoFocus
                      />
                    )}
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
                      onChange={(e) =>
                        setFormData({ ...formData, venue_id: e.target.value || null })
                      }
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
                      value={formData.estimated_guests || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_guests: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="input"
                      placeholder="0"
                      min={0}
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
                      placeholder="e.g., Royal, Floral, Boho"
                    />
                  </div>
                  <div>
                    <label className="label">Theme Color</label>
                    <input
                      type="color"
                      value={formData.color_palette.primary}
                      onChange={(e) =>
                        setFormData({ ...formData, color_palette: { primary: e.target.value } })
                      }
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
                    placeholder="Event description, rituals, schedule details..."
                  />
                </div>

                <div>
                  <label className="label">Dress Code</label>
                  <input
                    type="text"
                    value={formData.dress_code}
                    onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                    className="input"
                    placeholder="e.g., Traditional Indian, White & Gold, Pastel"
                  />
                </div>

                <div className="flex gap-3 pt-2">
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
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md">
              <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1">
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
        </Portal>
      )}
    </div>
  );
}
