/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineUsers,
  HiOutlineCurrencyRupee,
  HiOutlineX,
  HiOutlineExternalLink,
  HiOutlineAnnotation,
  HiOutlineCalendar,
  HiOutlineHome,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi';
import {
  useVenues,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  useAccommodationRooms,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';

const PRESET_ROOM_TYPES: { label: string; capacity: number; prefix: string }[] = [
  { label: 'Standard Room', capacity: 2, prefix: 'STD' },
  { label: 'Deluxe Room', capacity: 2, prefix: 'DLX' },
  { label: 'Super Deluxe Room', capacity: 2, prefix: 'SDL' },
  { label: 'Premium Room', capacity: 2, prefix: 'PRM' },
  { label: 'Executive Room', capacity: 2, prefix: 'EXC' },
  { label: 'Club Room', capacity: 2, prefix: 'CLB' },
  { label: 'Junior Suite', capacity: 2, prefix: 'JSU' },
  { label: 'Suite', capacity: 2, prefix: 'SU' },
  { label: 'Executive Suite', capacity: 2, prefix: 'ESU' },
  { label: 'Luxury Suite', capacity: 2, prefix: 'LSU' },
  { label: 'Presidential Suite', capacity: 4, prefix: 'PSU' },
];

const PRESET_BY_LABEL: Record<string, { capacity: number; prefix: string }> =
  Object.fromEntries(PRESET_ROOM_TYPES.map((t) => [t.label, { capacity: t.capacity, prefix: t.prefix }]));

interface RoomCategoryEntry {
  room_type: string;        // preset label or custom text
  is_custom: boolean;
  count: number | string;
  capacity: number | string;
  rate_per_night: number | string;
}

const DEFAULT_CATEGORY: RoomCategoryEntry = {
  room_type: 'Standard Room',
  is_custom: false,
  count: '',
  capacity: 2,
  rate_per_night: '',
};

interface VenueFormData {
  name: string;
  venue_type: string;
  address: string;
  city: string;
  capacity: number | string;
  total_cost: number | string;
  has_accommodation: boolean;
  contact_person: string;
  contact_phone: string;
  google_maps_link: string;
  default_check_in_date: string;
  default_check_out_date: string;
}

const DEFAULT_FORM: VenueFormData = {
  name: '',
  venue_type: 'wedding_hall',
  address: '',
  city: '',
  capacity: 0,
  total_cost: 0,
  has_accommodation: false,
  contact_person: '',
  contact_phone: '',
  google_maps_link: '',
  default_check_in_date: '',
  default_check_out_date: '',
};

function VenueRoomsSection({ venueId }: { venueId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rooms = [], isLoading } = useAccommodationRooms(venueId);

  const grouped = useMemo(() => {
    const map: Record<string, { count: number; capacity: number | null; rate: number | null }> = {};
    (rooms as any[]).forEach((r: any) => {
      const type = r.room_type as string;
      if (!map[type]) map[type] = { count: 0, capacity: r.capacity ?? null, rate: r.rate_per_night ?? null };
      map[type].count++;
    });
    return Object.entries(map);
  }, [rooms]);

  const totalRooms = (rooms as any[]).length;

  if (isLoading) {
    return <p className="text-xs text-gray-400">Loading rooms…</p>;
  }

  if (totalRooms === 0) {
    return <p className="text-sm text-gray-400 italic">No rooms added yet.</p>;
  }

  return (
    <div className="space-y-2">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-1.5">
        {grouped.map(([type, info]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-50 text-gold-800 text-xs font-medium border border-gold-200"
          >
            {type}
            <span className="bg-gold-200 text-gold-900 rounded-full px-1.5 font-semibold">{info.count}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{totalRooms} room{totalRooms !== 1 ? 's' : ''} total</p>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-xs text-gold-700 hover:text-gold-900 font-medium transition-colors"
        >
          {expanded ? (
            <><HiOutlineChevronUp className="w-3.5 h-3.5" /> Collapse</>
          ) : (
            <><HiOutlineChevronDown className="w-3.5 h-3.5" /> View details</>
          )}
        </button>
      </div>

      {/* Expanded table */}
      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Room</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-center font-medium">Occ.</th>
                <th className="px-3 py-2 text-right font-medium">Rate / night</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(rooms as any[]).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono font-medium text-gray-800">{r.room_number}</td>
                  <td className="px-3 py-2 text-gray-600">{r.room_type}</td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {r.capacity ? `${r.capacity}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {r.rate_per_night
                      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.rate_per_night)
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Venues() {
  const { canEdit } = useAuth();
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>(DEFAULT_FORM);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryEntry[]>([]);

  const { data: venues = [], isLoading, error } = useVenues();
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();
  const { data: existingRooms = [] } = useAccommodationRooms(editingVenue?.id);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingVenue(null);
    setRoomCategories([]);
  };

  const handleEdit = (venue: any) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name || '',
      venue_type: venue.venue_type || 'wedding_hall',
      address: venue.address || '',
      city: venue.city || '',
      capacity: venue.capacity || 0,
      total_cost: venue.total_cost || 0,
      has_accommodation: venue.has_accommodation ?? false,
      contact_person: venue.contact_person || '',
      contact_phone: venue.contact_phone || '',
      google_maps_link: venue.google_maps_link || '',
      default_check_in_date: venue.default_check_in_date || '',
      default_check_out_date: venue.default_check_out_date || '',
    });
    setShowVenueModal(true);
  };

  const buildRoomsPayload = () => {
    const validCategories = roomCategories.filter((c) => Number(c.count) > 0);
    if (validCategories.length === 0) return [];

    const existingCountByType = (existingRooms as any[]).reduce(
      (acc: Record<string, number>, r: any) => {
        acc[r.room_type] = (acc[r.room_type] || 0) + 1;
        return acc;
      },
      {},
    );

    const rooms: Array<{
      room_number: string;
      room_type: string;
      capacity?: number;
      rate_per_night?: number;
    }> = [];

    for (const entry of validCategories) {
      const preset = PRESET_BY_LABEL[entry.room_type];
      const prefix =
        preset?.prefix ?? entry.room_type.slice(0, 4).toUpperCase().replace(/\s/g, '');
      const startIdx = (existingCountByType[entry.room_type] || 0) + 1;
      const count = Number(entry.count);
      for (let i = 0; i < count; i++) {
        rooms.push({
          room_number: `${prefix}-${startIdx + i}`,
          room_type: entry.room_type,
          ...(entry.capacity !== '' && { capacity: Number(entry.capacity) }),
          ...(entry.rate_per_night !== '' && { rate_per_night: Number(entry.rate_per_night) }),
        });
      }
    }

    return rooms;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rooms = buildRoomsPayload();
    try {
      if (editingVenue) {
        await updateMutation.mutateAsync({ id: editingVenue.id, ...formData, rooms });
        toast.success('Venue updated successfully!');
      } else {
        await createMutation.mutateAsync({ ...formData, rooms });
        toast.success('Venue added successfully!');
      }
      setShowVenueModal(false);
      resetForm();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save venue';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Venue deleted successfully!');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete venue');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
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
        <div className="text-red-500">Error loading venues: {(error as any).message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Venues</h1>
        {canEdit && (
          <button
            onClick={() => setShowVenueModal(true)}
            className="btn-primary self-start sm:self-auto"
          >
            Add Venue
          </button>
        )}
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No venues found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {venues.map((venue) => {
            const v = venue as any;
            const venueTypeLabel = v.venue_type?.replace(/_/g, ' ') ?? '';
            const fullAddress = [v.address, v.city].filter(Boolean).join(', ');
            const hasContact = v.contact_person || v.contact_phone;
            const hasRooms = v.has_accommodation;
            const hasEvents = v.events && v.events.length > 0;

            return (
              <div key={venue.id} className="card-hover flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-display font-bold text-maroon-800 leading-tight">
                      {venue.name}
                    </h3>
                    {v.city && (
                      <p className="text-sm text-gray-500 mt-0.5">{v.city}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {venueTypeLabel && (
                      <span className="badge bg-maroon-50 text-maroon-700 capitalize whitespace-nowrap">
                        {venueTypeLabel}
                      </span>
                    )}
                    {hasRooms && (
                      <span className="badge badge-info whitespace-nowrap">Has Rooms</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-0 divide-y divide-gray-100">

                  {/* Location */}
                  <div className="py-3 space-y-2">
                    {fullAddress && (
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <HiOutlineLocationMarker className="w-4 h-4 mt-0.5 shrink-0 text-gold-600" />
                        <span>{fullAddress}</span>
                      </div>
                    )}
                    {v.google_maps_link && (
                      <div className="flex items-center gap-2 text-sm">
                        <HiOutlineExternalLink className="w-4 h-4 shrink-0 text-gold-600" />
                        <a
                          href={v.google_maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Capacity & Cost */}
                  <div className="py-3 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <HiOutlineUsers className="w-4 h-4 shrink-0 text-gold-600" />
                      <div>
                        <p className="text-xs text-gray-400 leading-none">Capacity</p>
                        {v.capacity && Number(v.capacity) > 0
                          ? <p className="font-medium">{v.capacity} guests</p>
                          : <p className="text-gray-400 italic text-xs">Not specified</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <HiOutlineCurrencyRupee className="w-4 h-4 shrink-0 text-gold-600" />
                      <div>
                        <p className="text-xs text-gray-400 leading-none">Total Cost</p>
                        {v.total_cost && Number(v.total_cost) > 0
                          ? <p className="font-medium">{formatCurrency(v.total_cost)}</p>
                          : <p className="text-gray-400 italic text-xs">Not specified</p>}
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  {hasContact && (
                    <div className="py-3 space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contact</p>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <HiOutlinePhone className="w-4 h-4 shrink-0 text-gold-600" />
                        <span>
                          {v.contact_person}
                          {v.contact_person && v.contact_phone && ' · '}
                          {v.contact_phone && (
                            <a
                              href={`tel:${v.contact_phone}`}
                              className="font-medium hover:text-maroon-700"
                            >
                              {v.contact_phone}
                            </a>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Accommodation rooms summary */}
                  {hasRooms && (
                    <div className="py-3 space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <HiOutlineHome className="w-3.5 h-3.5" />
                        Accommodation
                      </p>
                      <VenueRoomsSection venueId={venue.id} />
                    </div>
                  )}

                  {/* Notes */}
                  {v.notes && (
                    <div className="py-3 space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</p>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <HiOutlineAnnotation className="w-4 h-4 mt-0.5 shrink-0 text-gold-600" />
                        <span className="whitespace-pre-line">{v.notes}</span>
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {hasEvents && (
                    <div className="py-3 space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <HiOutlineCalendar className="w-3.5 h-3.5" />
                        Events at this venue
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {v.events.map((event: any) => (
                          <span key={event.id} className="badge bg-gold-100 text-gold-700">
                            {event.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(venue)}
                      className="btn-outline flex-1 text-sm py-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(venue.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && showVenueModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">
                  {editingVenue ? 'Edit Venue' : 'Add New Venue'}
                </h2>
                <button
                  onClick={() => {
                    setShowVenueModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="label">Venue Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Venue name"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type *</label>
                    <select
                      value={formData.venue_type}
                      onChange={(e) => setFormData({ ...formData, venue_type: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="wedding_hall">Wedding Hall</option>
                      <option value="banquet">Banquet</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="resort">Resort</option>
                      <option value="hotel">Hotel</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="has_accommodation"
                      checked={formData.has_accommodation}
                      onChange={(e) =>
                        setFormData({ ...formData, has_accommodation: e.target.checked })
                      }
                      className="w-4 h-4 accent-gold-600"
                    />
                    <label htmlFor="has_accommodation" className="label mb-0 cursor-pointer">
                      Has guest rooms / accommodation
                    </label>
                  </div>
                </div>

                {formData.has_accommodation && (
                  <div className="border border-gold-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-maroon-800">Room Categories</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Rooms auto-numbered per category (e.g. D-1, D-2…)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRoomCategories((prev) => [...prev, { ...DEFAULT_CATEGORY }])
                        }
                        className="text-xs text-gold-700 hover:text-gold-800 font-medium border border-gold-300 rounded-lg px-3 py-1 hover:bg-gold-50 transition-colors"
                      >
                        + Add Category
                      </button>
                    </div>

                    {existingRooms.length > 0 && (() => {
                      const groups: Record<string, { count: number; rate: number | null }> = {};
                      (existingRooms as any[]).forEach((r: any) => {
                        const t = r.room_type as string;
                        if (!groups[t]) groups[t] = { count: 0, rate: r.rate_per_night ?? null };
                        groups[t].count++;
                      });
                      return (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Already added rooms:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(groups).map(([type, info]) => (
                              <span key={type} className="badge bg-gray-100 text-gray-600 text-xs">
                                {type} × {info.count}
                                {info.rate ? ` · ₹${info.rate}/night` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {roomCategories.length === 0 && existingRooms.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        No categories yet. Click "+ Add Category" to bulk-add rooms.
                      </p>
                    )}

                    {roomCategories.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2">
                          <span className="text-xs text-gray-500 font-medium">Category</span>
                          <span className="text-xs text-gray-500 font-medium">Count</span>
                          <span className="text-xs text-gray-500 font-medium">Occupancy</span>
                          <span className="text-xs text-gray-500 font-medium">Rate / night</span>
                          <span />
                        </div>
                        {roomCategories.map((cat, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2 items-center"
                          >
                            {cat.is_custom ? (
                              <input
                                type="text"
                                value={cat.room_type}
                                onChange={(e) =>
                                  setRoomCategories((prev) =>
                                    prev.map((c, i) =>
                                      i === idx ? { ...c, room_type: e.target.value } : c,
                                    ),
                                  )
                                }
                                className="input text-sm py-1.5"
                                placeholder="Category name"
                                autoFocus
                              />
                            ) : (
                              <select
                                value={cat.room_type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__custom__') {
                                    setRoomCategories((prev) =>
                                      prev.map((c, i) =>
                                        i === idx
                                          ? { ...c, is_custom: true, room_type: '', capacity: 2 }
                                          : c,
                                      ),
                                    );
                                  } else {
                                    const preset = PRESET_BY_LABEL[val];
                                    setRoomCategories((prev) =>
                                      prev.map((c, i) =>
                                        i === idx
                                          ? {
                                              ...c,
                                              room_type: val,
                                              capacity: preset?.capacity ?? c.capacity,
                                            }
                                          : c,
                                      ),
                                    );
                                  }
                                }}
                                className="input text-sm py-1.5"
                              >
                                {PRESET_ROOM_TYPES.map((t) => (
                                  <option key={t.label} value={t.label}>
                                    {t.label}
                                  </option>
                                ))}
                                <option value="__custom__">Custom…</option>
                              </select>
                            )}
                            <input
                              type="number"
                              value={cat.count}
                              onChange={(e) =>
                                setRoomCategories((prev) =>
                                  prev.map((c, i) =>
                                    i === idx ? { ...c, count: e.target.value } : c,
                                  ),
                                )
                              }
                              className="input text-sm py-1.5"
                              placeholder="0"
                              min={1}
                            />
                            <input
                              type="number"
                              value={cat.capacity}
                              onChange={(e) =>
                                setRoomCategories((prev) =>
                                  prev.map((c, i) =>
                                    i === idx ? { ...c, capacity: e.target.value } : c,
                                  ),
                                )
                              }
                              className="input text-sm py-1.5"
                              placeholder="2"
                              min={1}
                            />
                            <input
                              type="number"
                              value={cat.rate_per_night}
                              onChange={(e) =>
                                setRoomCategories((prev) =>
                                  prev.map((c, i) =>
                                    i === idx ? { ...c, rate_per_night: e.target.value } : c,
                                  ),
                                )
                              }
                              className="input text-sm py-1.5"
                              placeholder="₹ 0"
                              min={0}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setRoomCategories((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <p className="text-xs text-gray-400 pt-1">
                          Total rooms to add:{' '}
                          <span className="font-medium text-maroon-700">
                            {roomCategories.reduce((s, c) => s + (Number(c.count) || 0), 0)}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-gold-100">
                      <div>
                        <label className="label">Default Check-in Date</label>
                        <input
                          type="date"
                          value={formData.default_check_in_date}
                          onChange={(e) =>
                            setFormData({ ...formData, default_check_in_date: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Default Check-out Date</label>
                        <input
                          type="date"
                          value={formData.default_check_out_date}
                          onChange={(e) =>
                            setFormData({ ...formData, default_check_out_date: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                      <p className="sm:col-span-2 text-xs text-gray-500 -mt-1">
                        Pre-filled when assigning guests to rooms in this hotel.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Address *</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Full address"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input"
                      placeholder="City name"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="input"
                      placeholder="Number of guests"
                    />
                  </div>
                  <div>
                    <label className="label">Total Cost</label>
                    <input
                      type="number"
                      value={formData.total_cost}
                      onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="input"
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="input"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Google Maps Link</label>
                  <input
                    type="url"
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    className="input"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </form>

              <div className="flex gap-3 p-6 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVenueModal(false);
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
                    : editingVenue
                      ? 'Update Venue'
                      : 'Add Venue'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {deleteConfirm && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md">
              <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this venue? This action cannot be undone.
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
