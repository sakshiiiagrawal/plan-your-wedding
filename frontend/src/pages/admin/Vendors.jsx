import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlinePhone, HiOutlineMail, HiOutlineStar, HiOutlineCurrencyRupee, HiOutlinePlus, HiOutlineX, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { useVendors, useVendorCategories, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function Vendors() {
  const { canEdit } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'venue_decorator',
    contact_person: '',
    phone: '',
    email: '',
    total_cost: '',
    side: 'mutual',
    is_shared: true,
    is_confirmed: false,
    contract_signed: false,
    rating: ''
  });
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch data from API
  const { data: vendors, isLoading: loadingVendors } = useVendors(selectedCategory);
  const { data: categoryList, isLoading: loadingCategories } = useVendorCategories();
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  // Prepare categories with "All" option
  const categories = useMemo(() => {
    if (!categoryList) return [{ value: 'all', label: 'All' }];
    return [
      { value: 'all', label: 'All' },
      ...categoryList
    ];
  }, [categoryList]);

  // Handler functions
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'venue_decorator',
      contact_person: '',
      phone: '',
      email: '',
      total_cost: '',
      side: 'mutual',
      is_shared: true,
      advance_paid: '',
      is_confirmed: false,
      contract_signed: false,
      rating: ''
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      category: vendor.category || 'venue_decorator',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      total_cost: vendor.total_cost || '',
      side: vendor.side || 'mutual',
      is_shared: vendor.is_shared !== undefined ? vendor.is_shared : true,
      is_confirmed: vendor.is_confirmed || false,
      contract_signed: vendor.contract_signed || false,
      rating: vendor.rating || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({ id: editingVendor.id, ...formData });
        toast.success('Vendor updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Vendor added successfully!');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save vendor';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vendor deleted successfully!');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate vendor payment info
  const getVendorPaymentInfo = (vendor) => {
    const payments = vendor.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalCost = parseFloat(vendor.total_cost || 0);
    return {
      totalCost,
      paid: totalPaid,
      due: totalCost - totalPaid
    };
  };

  // Get vendor events
  const getVendorEvents = (vendor) => {
    if (!vendor.vendor_event_assignments || vendor.vendor_event_assignments.length === 0) {
      return [];
    }
    return vendor.vendor_event_assignments
      .map(assignment => assignment.events?.name)
      .filter(Boolean);
  };

  if (loadingVendors || loadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vendors</h1>
        {canEdit && <button onClick={() => setShowAddModal(true)} className="btn-primary">Add Vendor</button>}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-maroon-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gold-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      {vendors && vendors.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => {
            const paymentInfo = getVendorPaymentInfo(vendor);
            const events = getVendorEvents(vendor);

            return (
              <div key={vendor.id} className="card-hover">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-maroon-800">{vendor.name}</h3>
                    <p className="text-sm text-gold-600">
                      {vendor.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                  </div>
                  {vendor.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <HiOutlineStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{vendor.rating}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {vendor.contact_person && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">Contact:</span>
                      <span>{vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlinePhone className="w-4 h-4" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineMail className="w-4 h-4" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                </div>

                {paymentInfo.totalCost > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Total Cost:</span>
                      <span className="font-medium">{formatCurrency(paymentInfo.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Paid:</span>
                      <span className="font-medium text-green-600">{formatCurrency(paymentInfo.paid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Due:</span>
                      <span className="font-medium text-red-600">{formatCurrency(paymentInfo.due)}</span>
                    </div>
                  </div>
                )}

                {events.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {events.map((event, idx) => (
                      <span key={idx} className="text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gold-100 flex justify-between items-center">
                  <span className={vendor.is_confirmed ? 'badge-success' : 'badge-warning'}>
                    {vendor.is_confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="p-2 hover:bg-gold-50 rounded-lg text-gold-600"
                        title="Edit vendor"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(vendor.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Delete vendor"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">No vendors found.</p>
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
              Add Your First Vendor
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Vendor Modal */}
      {canEdit && showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
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
              <div>
                <label className="label">Vendor Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Vendor name"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    required
                  >
                    {categoryList?.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div>
                <label className="label">Responsible Side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, side: 'bride', is_shared: false })}
                    className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                      formData.side === 'bride' && !formData.is_shared
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Bride Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, side: 'groom', is_shared: false })}
                    className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                      formData.side === 'groom' && !formData.is_shared
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Groom Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, side: 'mutual', is_shared: true })}
                    className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                      formData.side === 'mutual' || formData.is_shared
                        ? 'border-gold-500 bg-gold-50 text-gold-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Shared/Mutual
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  className="input"
                  placeholder="4.5"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_confirmed}
                    onChange={(e) => setFormData({ ...formData, is_confirmed: e.target.checked })}
                    className="w-4 h-4 text-maroon-800"
                  />
                  <span className="text-sm">Confirmed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.contract_signed}
                    onChange={(e) => setFormData({ ...formData, contract_signed: e.target.checked })}
                    className="w-4 h-4 text-maroon-800"
                  />
                  <span className="text-sm">Contract Signed</span>
                </label>
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
                  : editingVendor
                  ? 'Update Vendor'
                  : 'Add Vendor'}
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
              Are you sure you want to delete this vendor? This action cannot be undone.
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
