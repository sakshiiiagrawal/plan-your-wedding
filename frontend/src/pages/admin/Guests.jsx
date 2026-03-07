import { useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useGuests, useGuestSummary, useCreateGuest, useUpdateGuest, useDeleteGuest } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';

export default function Guests() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    side: 'bride',
    relationship: '',
    meal_preference: 'vegetarian',
    dietary_restrictions: '',
    needs_accommodation: false,
    needs_pickup: false,
    is_vip: false,
    notes: ''
  });
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // API hooks - fetch all guests without search filter
  const { data: guests = [], isLoading: guestsLoading } = useGuests({
    side: sideFilter !== 'all' ? sideFilter : undefined,
  });
  const { data: summary } = useGuestSummary();
  const createMutation = useCreateGuest();
  const updateMutation = useUpdateGuest();
  const deleteMutation = useDeleteGuest();

  // Handler functions
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      side: 'bride',
      relationship: '',
      meal_preference: 'vegetarian',
      dietary_restrictions: '',
      needs_accommodation: false,
      needs_pickup: false,
      is_vip: false,
      notes: ''
    });
    setEditingGuest(null);
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      phone: guest.phone || '',
      email: guest.email || '',
      side: guest.side || 'bride',
      relationship: guest.relationship || '',
      meal_preference: guest.meal_preference || 'vegetarian',
      dietary_restrictions: guest.dietary_restrictions || '',
      needs_accommodation: guest.needs_accommodation || false,
      needs_pickup: guest.needs_pickup || false,
      is_vip: guest.is_vip || false,
      notes: guest.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGuest) {
        await updateMutation.mutateAsync({ id: editingGuest.id, ...formData });
        toast.success('Guest updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Guest added successfully!');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save guest';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Guest deleted successfully!');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete guest');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/guests/template/download', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'guest_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/guests/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Successfully imported ${response.data.count} guests!`);

      // Refresh guest list and summary
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['guests', 'summary'] });

      // Reset file input and close modal
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowImportModal(false);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to import guests';
      const details = error.response?.data?.invalidGuests || error.response?.data?.errors;
      const hint = error.response?.data?.hint;
      const additionalDetails = error.response?.data?.details;

      if (details && details.length > 0) {
        toast.error(`${errorMessage}. Check console for details.`, { duration: 5000 });
        console.error('========== IMPORT ERRORS ==========');
        console.error(errorMessage);
        if (additionalDetails) console.error(additionalDetails);
        if (hint) console.error('Hint:', hint);
        console.error('\nValidation Errors:');
        details.forEach((err, idx) => {
          console.error(`${idx + 1}. Row ${err.row}:`, err.errors.join(', '));
        });
        console.error('===================================');
      } else if (additionalDetails || hint) {
        toast.error(errorMessage, { duration: 6000 });
        console.error('========== IMPORT ERROR ==========');
        console.error(errorMessage);
        if (additionalDetails) console.error('\n' + additionalDetails);
        if (hint) console.error('\nHint:', hint);
        console.error('==================================');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Client-side filtering for search and RSVP
  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
        const matchesSearch =
          fullName.includes(search) ||
          guest.phone?.toLowerCase().includes(search) ||
          guest.email?.toLowerCase().includes(search) ||
          guest.relationship?.toLowerCase().includes(search);

        if (!matchesSearch) return false;
      }

      // RSVP filter (if rsvp_status exists in guest data)
      if (rsvpFilter !== 'all' && guest.rsvp_status) {
        if (guest.rsvp_status !== rsvpFilter) return false;
      }

      return true;
    });
  }, [guests, searchTerm, rsvpFilter]);

  // Loading state
  if (guestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Guest Management</h1>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-outline flex items-center gap-2"
              >
                <HiOutlineUpload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Guest
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-maroon-800">{summary?.total || 0}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-pink-600">{summary?.bride || 0}</div>
          <div className="text-sm text-gray-500">Bride Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{summary?.groom || 0}</div>
          <div className="text-sm text-gray-500">Groom Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{summary?.confirmed || 0}</div>
          <div className="text-sm text-gray-500">Confirmed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{summary?.pending || 0}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{summary?.declined || 0}</div>
          <div className="text-sm text-gray-500">Declined</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Sides</option>
            <option value="bride">Bride Side</option>
            <option value="groom">Groom Side</option>
          </select>
          <select
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All RSVP</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Guest Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Side</th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4">Diet</th>
                <th className="text-left p-4">Accommodation</th>
                {canEdit && <th className="text-left p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="table-row">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-800">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{guest.relationship}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={guest.side === 'bride' ? 'badge-bride' : guest.side === 'groom' ? 'badge-groom' : 'badge bg-purple-100 text-purple-700'}>
                      {guest.side === 'bride' ? 'Bride' : guest.side === 'groom' ? 'Groom' : 'Mutual'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{guest.phone || '—'}</td>
                  <td className="p-4 text-gray-600 capitalize">
                    {guest.meal_preference?.replace('_', ' ') || '—'}
                  </td>
                  <td className="p-4">
                    {guest.needs_accommodation ? (
                      <span className="badge-info">Needed</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(guest)}
                          className="p-2 hover:bg-gold-50 rounded-lg text-gold-600"
                          title="Edit guest"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(guest.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                          title="Delete guest"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-gray-500">
                    No guests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Guest Modal */}
      {canEdit && showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">
                {editingGuest ? 'Edit Guest' : 'Add New Guest'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Side *</label>
                  <select
                    value={formData.side}
                    onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="bride">Bride Side</option>
                    <option value="groom">Groom Side</option>
                  </select>
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <input
                    type="text"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="input"
                    placeholder="e.g., Uncle, Cousin"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Meal Preference</label>
                  <select
                    value={formData.meal_preference}
                    onChange={(e) => setFormData({ ...formData, meal_preference: e.target.value })}
                    className="input"
                  >
                    <option value="vegetarian">Vegetarian</option>
                    <option value="jain">Jain</option>
                    <option value="vegan">Vegan</option>
                    <option value="non_vegetarian">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dietary Restrictions</label>
                  <input
                    type="text"
                    value={formData.dietary_restrictions}
                    onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                    className="input"
                    placeholder="e.g., No onion-garlic"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.needs_accommodation}
                    onChange={(e) => setFormData({ ...formData, needs_accommodation: e.target.checked })}
                    className="w-4 h-4 text-maroon-800"
                  />
                  <span className="text-sm">Needs Accommodation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.needs_pickup}
                    onChange={(e) => setFormData({ ...formData, needs_pickup: e.target.checked })}
                    className="w-4 h-4 text-maroon-800"
                  />
                  <span className="text-sm">Needs Pickup</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_vip}
                    onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                    className="w-4 h-4 text-maroon-800"
                  />
                  <span className="text-sm">VIP Guest</span>
                </label>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Any special notes..."
                />
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
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
                  : editingGuest
                  ? 'Update Guest'
                  : 'Add Guest'}
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
              Are you sure you want to delete this guest? This action cannot be undone.
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

      {/* Import Modal */}
      {canEdit && showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">
                Import Guests from Excel
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Import Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Import Instructions</h3>
                <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                  <li>
                    <strong>Download the sample template</strong> - It contains example data with 3 guests to help you understand the format
                  </li>
                  <li>
                    <strong>Edit the Excel file:</strong> Replace the sample data with your actual guests, or add new rows below the examples
                  </li>
                  <li>
                    <strong>Mandatory fields:</strong> First Name* and Side* (must be either "Bride" or "Groom")
                  </li>
                  <li>
                    <strong>Optional fields:</strong> Last Name, Phone, Relationship, Meal Preference, Needs Accommodation, Needs Pickup
                  </li>
                  <li>
                    <strong>Boolean values:</strong> Use "Yes" or "No" for Needs Accommodation and Needs Pickup columns
                  </li>
                  <li>
                    <strong>Important:</strong> Row 1 contains the headers and will be kept automatically. All data rows below will be imported
                  </li>
                </ol>
              </div>

              {/* Download Template Button */}
              <div className="flex justify-center py-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="btn-outline text-sm flex items-center gap-2"
                >
                  <HiOutlineDownload className="w-4 h-4" />
                  Download Sample Template
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />

              {/* Import Button */}
              <div className="pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <HiOutlineUpload className="w-5 h-5" />
                  {isImporting ? 'Importing...' : 'Import Data from Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
