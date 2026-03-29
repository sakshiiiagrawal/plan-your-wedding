/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import {
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineX,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCurrencyRupee,
} from 'react-icons/hi';
import {
  useVendors,
  useVendorCategories,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '../../hooks/useApi';
import { VENDOR_CATEGORY_LABELS } from '@wedding-planner/shared';
import VendorPaymentsModal from './VendorPaymentsModal';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';

interface VendorFormData {
  name: string;
  category: string;
  contact_person: string;
  phone: string;
  email: string;
  total_cost: string;
  side: string;
  is_shared: boolean;
}

const DEFAULT_FORM: VendorFormData = {
  name: '',
  category: 'decorator',
  contact_person: '',
  phone: '',
  email: '',
  total_cost: '',
  side: 'mutual',
  is_shared: true,
};

export default function Vendors() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(DEFAULT_FORM);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [payingVendor, setPayingVendor] = useState<any | null>(null);

  const { data: vendors, isLoading: loadingVendors } = useVendors(selectedCategory);
  const { data: categoryList, isLoading: loadingCategories } = useVendorCategories();
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const categories = useMemo(() => {
    if (!categoryList) return [{ value: 'all', label: 'All' }];
    return [{ value: 'all', label: 'All' }, ...(categoryList as any[])];
  }, [categoryList]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingVendor(null);
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      category: vendor.category || 'decorator',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      total_cost: vendor.total_cost || '',
      side: vendor.side || 'mutual',
      is_shared: vendor.is_shared !== undefined ? vendor.is_shared : true,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save vendor';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vendor deleted successfully!');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete vendor');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVendorPaymentInfo = (vendor: any) => {
    const payments: any[] = vendor.payments || [];
    const actual = payments.filter((p) => !p.is_planned);
    const planned = payments.filter((p) => p.is_planned);
    const totalPaid = actual.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalCost = parseFloat(vendor.total_cost || 0);
    return { totalCost, paid: totalPaid, due: totalCost - totalPaid, actual, planned };
  };

  const daysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const plannedBadge = (dateStr: string) => {
    const days = daysUntil(dateStr);
    if (days < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
    if (days === 0) return { label: 'Due today', cls: 'bg-red-100 text-red-700' };
    if (days <= 3) return { label: `Due in ${days}d`, cls: 'bg-orange-100 text-orange-700' };
    if (days <= 7) return { label: `Due in ${days}d`, cls: 'bg-amber-100 text-amber-700' };
    return { label: new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), cls: 'bg-gray-100 text-gray-600' };
  };

  const getVendorEvents = (vendor: any): string[] => {
    if (!vendor.vendor_event_assignments || vendor.vendor_event_assignments.length === 0) {
      return [];
    }
    return vendor.vendor_event_assignments
      .map((assignment: any) => assignment.events?.name)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Vendors</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          Add Vendor
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(categories as any[]).map((cat) => (
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

      {vendors && (vendors as any[]).length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(vendors as any[]).map((vendor) => {
            const paymentInfo = getVendorPaymentInfo(vendor);
            const events = getVendorEvents(vendor);

            return (
              <div key={vendor.id} className="card-hover">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-maroon-800">{vendor.name}</h3>
                    <p className="text-sm text-gold-600">
                      {vendor.category
                        ? (VENDOR_CATEGORY_LABELS as Record<string, string>)[vendor.category] ?? vendor.category
                        : null}
                    </p>
                  </div>
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

                {/* Planned payment reminders */}
                {paymentInfo.planned.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {paymentInfo.planned.map((p: any) => {
                      const badge = plannedBadge(p.payment_date);
                      return (
                        <div key={p.id} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-xs">
                            <span>📅</span>
                            <span className="font-medium text-amber-800">{formatCurrency(parseFloat(p.amount))}</span>
                          </div>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {paymentInfo.totalCost > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-1">
                    {paymentInfo.actual.length > 0 ? (
                      <>
                        {paymentInfo.actual.slice(0, 3).map((p: any) => (
                          <div key={p.id} className="flex justify-between text-xs text-gray-600">
                            <span>{new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                            <span className="font-medium text-green-700">
                              {formatCurrency(parseFloat(p.amount))}
                            </span>
                          </div>
                        ))}
                        {paymentInfo.actual.length > 3 && (
                          <button
                            onClick={() => setPayingVendor(vendor)}
                            className="text-xs text-maroon-700 hover:text-maroon-900 font-medium"
                          >
                            +{paymentInfo.actual.length - 3} more…
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No payments recorded</p>
                    )}
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200 mt-1">
                      <span className="text-gray-500">Total Cost:</span>
                      <span className="font-medium">{formatCurrency(paymentInfo.totalCost)}</span>
                    </div>
                    {paymentInfo.due > 0 && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-red-600">Outstanding:</span>
                        <span className="text-red-600">{formatCurrency(paymentInfo.due)}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setPayingVendor(vendor)}
                      className="flex items-center gap-1 text-xs text-maroon-700 hover:text-maroon-900 font-medium mt-1 pt-1 border-t border-gray-200 w-full"
                    >
                      <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />
                      Record payment
                    </button>
                  </div>
                )}
                {paymentInfo.totalCost === 0 && (
                  <button
                    onClick={() => setPayingVendor(vendor)}
                    className="mt-3 flex items-center gap-1 text-xs text-maroon-700 hover:text-maroon-900 font-medium"
                  >
                    <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />
                    Record payment
                  </button>
                )}

                {events.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {events.map((event, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gold-100 flex justify-end items-center">
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">No vendors found.</p>
        </div>
      )}

      {showAddModal && (
        <Portal>
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
                      {(categoryList as any[] | undefined)?.map((cat) => (
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
        </Portal>
      )}

      {deleteConfirm && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md">
              <h3 className="text-lg font-bold text-maroon-800 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this vendor? This action cannot be undone.
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

      {payingVendor && (
        <VendorPaymentsModal
          vendor={payingVendor}
          onClose={() => setPayingVendor(null)}
        />
      )}
    </div>
  );
}
