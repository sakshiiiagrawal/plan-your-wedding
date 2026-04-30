/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGuests,
  useGuestSummary,
  useBulkCreateGuests,
  useUpdateGuest,
  useBulkDeleteGuests,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Portal from '../../components/Portal';
import {
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineSave,
} from 'react-icons/hi';

interface GuestFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  side: string;
  relationship: string;
  meal_preference: string;
  dietary_restrictions: string;
  needs_accommodation: boolean;
  needs_pickup: boolean;
  is_vip: boolean;
  notes: string;
}

interface PendingRow extends GuestFormData {
  _key: string;
}

const DEFAULT_FORM: GuestFormData = {
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
  notes: '',
};

export default function Guests() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<GuestFormData>(DEFAULT_FORM);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: guests = [], isLoading: guestsLoading } = useGuests(
    sideFilter !== 'all' ? { side: sideFilter } : {},
  );
  const { data: summary } = useGuestSummary();
  const bulkCreateMutation = useBulkCreateGuests();
  const updateMutation = useUpdateGuest();
  const bulkDeleteMutation = useBulkDeleteGuests();

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingGuest(null);
  };

  const handleEdit = (guest: any) => {
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
      notes: guest.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ id: editingGuest.id, ...formData });
      toast.success('Guest updated successfully!');
      setShowEditModal(false);
      resetForm();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save guest';
      toast.error(errorMessage);
    }
  };

  const markForDelete = (id: string) => {
    setPendingDeletes((prev) => new Set(prev).add(id));
  };

  const unmarkForDelete = (id: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const commitDeletes = async () => {
    if (pendingDeletes.size === 0) return;
    setIsDeletingAll(true);
    try {
      await bulkDeleteMutation.mutateAsync([...pendingDeletes]);
      toast.success(
        `${pendingDeletes.size} guest${pendingDeletes.size > 1 ? 's' : ''} deleted successfully!`,
      );
      setPendingDeletes(new Set());
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to delete guests';
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const addPendingRow = (template?: GuestFormData) => {
    const newRow: PendingRow = {
      ...(template || DEFAULT_FORM),
      _key: crypto.randomUUID(),
    };
    setPendingRows((prev) => [...prev, newRow]);
  };

  const removePendingRow = (key: string) => {
    setPendingRows((prev) => prev.filter((r) => r._key !== key));
  };

  const updatePendingRow = (key: string, updates: Partial<GuestFormData>) => {
    setPendingRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...updates } : r)));
  };

  const duplicateLastRow = () => {
    const last = pendingRows[pendingRows.length - 1];
    if (last) addPendingRow(last);
  };

  const saveAllPending = async () => {
    if (pendingRows.some((r) => !r.first_name.trim())) {
      toast.error('First name is required for all guests');
      return;
    }
    setIsSavingAll(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await bulkCreateMutation.mutateAsync(pendingRows.map(({ _key, ...data }) => data));
      toast.success(
        `${pendingRows.length} guest${pendingRows.length > 1 ? 's' : ''} added successfully!`,
      );
      setPendingRows([]);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save guests';
      toast.error(errorMessage);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/guests/template/download', {
        responseType: 'blob',
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
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const importFormData = new FormData();
    importFormData.append('file', file);

    try {
      const response = await api.post('/guests/import', importFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`Successfully imported ${response.data.count} guests!`);

      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['guests', 'summary'] });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowImportModal(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to import guests';
      const details = error?.response?.data?.invalidGuests || error?.response?.data?.errors;
      const hint = error?.response?.data?.hint;
      const additionalDetails = error?.response?.data?.details;

      if (details && details.length > 0) {
        toast.error(`${errorMessage}. Check console for details.`, { duration: 5000 });
        console.error('========== IMPORT ERRORS ==========');
        console.error(errorMessage);
        if (additionalDetails) console.error(additionalDetails);
        if (hint) console.error('Hint:', hint);
        console.error('\nValidation Errors:');
        details.forEach((err: any, idx: number) => {
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

  const filteredGuests = useMemo(() => {
    return guests.filter((guest: any) => {
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

      if (rsvpFilter !== 'all' && guest.rsvp_status) {
        if (guest.rsvp_status !== rsvpFilter) return false;
      }

      return true;
    });
  }, [guests, searchTerm, rsvpFilter]);

  if (guestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Guest Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <HiOutlineUpload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => addPendingRow()}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Guest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-maroon-800">{(summary as any)?.total || 0}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-pink-600">{(summary as any)?.bride || 0}</div>
          <div className="text-sm text-gray-500">Bride Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{(summary as any)?.groom || 0}</div>
          <div className="text-sm text-gray-500">Groom Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {(summary as any)?.confirmed || 0}
          </div>
          <div className="text-sm text-gray-500">Confirmed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{(summary as any)?.pending || 0}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{(summary as any)?.declined || 0}</div>
          <div className="text-sm text-gray-500">Declined</div>
        </div>
      </div>

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

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Side</th>
                <th className="text-left p-4 hidden sm:table-cell">Phone</th>
                <th className="text-left p-4">Diet</th>
                <th className="text-left p-4 hidden md:table-cell">Accommodation</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest: any) => {
                const isMarkedForDelete = pendingDeletes.has(guest.id);
                return (
                  <tr
                    key={guest.id}
                    className={`table-row${isMarkedForDelete ? ' opacity-40 line-through bg-red-50' : ''}`}
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-800">
                          {guest.first_name} {guest.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{guest.relationship}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          guest.side === 'bride'
                            ? 'badge-bride'
                            : guest.side === 'groom'
                              ? 'badge-groom'
                              : 'badge bg-purple-100 text-purple-700'
                        }
                      >
                        {guest.side === 'bride'
                          ? 'Bride'
                          : guest.side === 'groom'
                            ? 'Groom'
                            : 'Mutual'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 hidden sm:table-cell">{guest.phone || '—'}</td>
                    <td className="p-4 text-gray-600 capitalize">
                      {guest.meal_preference?.replace('_', ' ') || '—'}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      {guest.needs_accommodation ? (
                        <span className="badge-info">Needed</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {!isMarkedForDelete ? (
                          <>
                            <button
                              onClick={() => handleEdit(guest)}
                              className="p-2 hover:bg-gold-50 rounded-lg text-gold-600"
                              title="Edit guest"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => markForDelete(guest.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                              title="Mark for deletion"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => unmarkForDelete(guest.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                            title="Undo deletion"
                          >
                            <HiOutlineX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredGuests.length === 0 && pendingRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No guests found
                  </td>
                </tr>
              )}

              {pendingRows.map((row) => (
                <tr key={row._key} className="bg-amber-50/40 border-b border-gold-100">
                  <td className="p-2">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={row.first_name}
                        onChange={(e) =>
                          updatePendingRow(row._key, { first_name: e.target.value })
                        }
                        className="input text-sm py-1.5 min-w-0 w-28"
                        placeholder="First name *"
                      />
                      <input
                        type="text"
                        value={row.last_name}
                        onChange={(e) => updatePendingRow(row._key, { last_name: e.target.value })}
                        className="input text-sm py-1.5 min-w-0 w-28"
                        placeholder="Last name"
                      />
                    </div>
                  </td>
                  <td className="p-2">
                    <select
                      value={row.side}
                      onChange={(e) => updatePendingRow(row._key, { side: e.target.value })}
                      className="input text-sm py-1.5"
                    >
                      <option value="bride">Bride</option>
                      <option value="groom">Groom</option>
                    </select>
                  </td>
                  <td className="p-2 hidden sm:table-cell">
                    <input
                      type="tel"
                      value={row.phone}
                      onChange={(e) => updatePendingRow(row._key, { phone: e.target.value })}
                      className="input text-sm py-1.5 w-36"
                      placeholder="Phone"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.meal_preference}
                      onChange={(e) =>
                        updatePendingRow(row._key, { meal_preference: e.target.value })
                      }
                      className="input text-sm py-1.5"
                    >
                      <option value="vegetarian">Veg</option>
                      <option value="jain">Jain</option>
                      <option value="vegan">Vegan</option>
                      <option value="non_vegetarian">Non-Veg</option>
                    </select>
                  </td>
                  <td className="p-2 hidden md:table-cell text-center">
                    <input
                      type="checkbox"
                      checked={row.needs_accommodation}
                      onChange={(e) =>
                        updatePendingRow(row._key, { needs_accommodation: e.target.checked })
                      }
                      className="w-4 h-4 text-maroon-800 cursor-pointer"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => removePendingRow(row._key)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"
                      title="Remove row"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {pendingRows.length > 0 && (
                <tr className="bg-amber-50/20">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={duplicateLastRow}
                        className="flex items-center gap-1.5 text-sm text-gold-700 hover:text-gold-900 font-medium transition-colors"
                        title="Add another row based on the last entry"
                      >
                        <HiOutlinePlus className="w-4 h-4" />
                        Duplicate last row
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPendingRows([])}
                          className="btn-outline text-sm py-1.5 px-3"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveAllPending}
                          disabled={isSavingAll}
                          className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <HiOutlineSave className="w-4 h-4" />
                          {isSavingAll
                            ? 'Saving...'
                            : `Save ${pendingRows.length} Guest${pendingRows.length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {pendingDeletes.size > 0 && pendingRows.length === 0 && (
                <tr className="bg-red-50/60">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-red-700 font-medium">
                        {pendingDeletes.size} guest{pendingDeletes.size > 1 ? 's' : ''} marked for
                        deletion
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPendingDeletes(new Set())}
                          className="btn-outline text-sm py-1.5 px-3"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={commitDeletes}
                          disabled={isDeletingAll}
                          className="text-sm py-1.5 px-4 flex items-center gap-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                          {isDeletingAll ? 'Deleting...' : `Delete ${pendingDeletes.size} Guest${pendingDeletes.size > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">Edit Guest</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
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
                      onChange={(e) =>
                        setFormData({ ...formData, meal_preference: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, dietary_restrictions: e.target.value })
                      }
                      className="input"
                      placeholder="e.g., No onion-garlic"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.needs_accommodation}
                      onChange={(e) =>
                        setFormData({ ...formData, needs_accommodation: e.target.checked })
                      }
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
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Guest'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showImportModal && (
        <Portal>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Import Instructions</h3>
                  <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                    <li>
                      <strong>Download the sample template</strong> - It contains example data with
                      3 guests to help you understand the format
                    </li>
                    <li>
                      <strong>Edit the Excel file:</strong> Replace the sample data with your actual
                      guests, or add new rows below the examples
                    </li>
                    <li>
                      <strong>Mandatory fields:</strong> First Name* and Side* (must be either
                      &quot;Bride&quot; or &quot;Groom&quot;)
                    </li>
                    <li>
                      <strong>Optional fields:</strong> Last Name, Phone, Relationship, Meal
                      Preference, Needs Accommodation, Needs Pickup
                    </li>
                    <li>
                      <strong>Boolean values:</strong> Use &quot;Yes&quot; or &quot;No&quot; for
                      Needs Accommodation and Needs Pickup columns
                    </li>
                    <li>
                      <strong>Important:</strong> Row 1 contains the headers and will be kept
                      automatically. All data rows below will be imported
                    </li>
                  </ol>
                </div>

                <div className="flex justify-center py-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="btn-outline text-sm flex items-center gap-2"
                  >
                    <HiOutlineDownload className="w-4 h-4" />
                    Download Sample Template
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />

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
        </Portal>
      )}
    </div>
  );
}
