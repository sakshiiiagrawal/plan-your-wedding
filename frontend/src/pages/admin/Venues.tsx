/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlineLocationMarker, HiOutlinePhone, HiOutlineUsers, HiOutlineCurrencyRupee, HiOutlineX } from 'react-icons/hi';
import { useVenues, useCreateVenue, useUpdateVenue, useDeleteVenue } from '../../hooks/useApi';
import toast from 'react-hot-toast';

interface VenueFormData {
  name: string;
  venue_type: string;
  address: string;
  city: string;
  capacity: number | string;
  total_cost: number | string;
  payment_status: string;
  contact_person: string;
  contact_phone: string;
  google_maps_link: string;
}

const DEFAULT_FORM: VenueFormData = {
  name: '',
  venue_type: 'wedding_hall',
  address: '',
  city: '',
  capacity: 0,
  total_cost: 0,
  payment_status: 'pending',
  contact_person: '',
  contact_phone: '',
  google_maps_link: '',
};

export default function Venues() {
  const { canEdit } = useAuth();
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>(DEFAULT_FORM);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: venues = [], isLoading, error } = useVenues();
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingVenue(null);
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
      payment_status: venue.payment_status || 'pending',
      contact_person: venue.contact_person || '',
      contact_phone: venue.contact_phone || '',
      google_maps_link: venue.google_maps_link || '',
    });
    setShowVenueModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await updateMutation.mutateAsync({ id: editingVenue.id, ...formData });
        toast.success('Venue updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Venue added successfully!');
      }
      setShowVenueModal(false);
      resetForm();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save venue';
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
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      paid: 'badge-success',
      partial: 'badge-warning',
      pending: 'badge-danger',
    };
    return badges[status] ?? 'badge-info';
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
      <div className="flex items-center justify-between">
        <h1 className="page-title">Venues</h1>
        {canEdit && (
          <button onClick={() => setShowVenueModal(true)} className="btn-primary">Add Venue</button>
        )}
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
                  <p className="text-sm text-gray-500 capitalize">{(venue as any).venue_type?.replace('_', ' ')}</p>
                </div>
                <span className={getStatusBadge((venue as any).payment_status)}>
                  {(venue as any).payment_status?.charAt(0).toUpperCase() + (venue as any).payment_status?.slice(1)}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-600">
                  <HiOutlineLocationMarker className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{(venue as any).address}</span>
                </div>

                {(venue as any).capacity && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineUsers className="w-4 h-4" />
                    <span>Capacity: {(venue as any).capacity} guests</span>
                  </div>
                )}

                {(venue as any).total_cost && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlineCurrencyRupee className="w-4 h-4" />
                    <span>Cost: {formatCurrency((venue as any).total_cost)}</span>
                  </div>
                )}

                {((venue as any).contact_person || (venue as any).contact_phone) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <HiOutlinePhone className="w-4 h-4" />
                    <span>
                      {(venue as any).contact_person && `${(venue as any).contact_person}`}
                      {(venue as any).contact_person && (venue as any).contact_phone && ' - '}
                      {(venue as any).contact_phone}
                    </span>
                  </div>
                )}
              </div>

              {(venue as any).events && (venue as any).events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gold-100">
                  <p className="text-xs text-gray-500 mb-2">Events:</p>
                  <div className="flex flex-wrap gap-2">
                    {(venue as any).events.map((event: any) => (
                      <span key={event.id} className="badge bg-gold-100 text-gold-700">{event.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleEdit(venue)} className="btn-outline flex-1 text-sm py-2">Edit</button>
                  <button
                    onClick={() => setDeleteConfirm(venue.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && showVenueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">
                {editingVenue ? 'Edit Venue' : 'Add New Venue'}
              </h2>
              <button onClick={() => { setShowVenueModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
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
                  </select>
                </div>
                <div>
                  <label className="label">Payment Status *</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

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
              <button type="button" onClick={() => { setShowVenueModal(false); resetForm(); }} className="btn-outline flex-1">
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
                  : editingVenue ? 'Update Venue' : 'Add Venue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this venue? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1">Cancel</button>
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
