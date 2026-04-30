import { useMemo, useState } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineMail,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import CategoryCombobox from '../../components/CategoryCombobox';
import VendorPaymentsModal from './VendorPaymentsModal';
import {
  useCategoryTree,
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from '../../hooks/useApi';
import type { VendorWithFinance } from '@wedding-planner/shared';

interface VendorFormData {
  name: string;
  category_id: string | null;
  contact_person: string;
  phone: string;
  email: string;
  total_cost: string;
  expense_date: string;
  side: 'bride' | 'groom' | 'shared';
  bride_share_percentage: number;
}

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_FORM: VendorFormData = {
  name: '',
  category_id: null,
  contact_person: '',
  phone: '',
  email: '',
  total_cost: '',
  expense_date: TODAY,
  side: 'shared',
  bride_share_percentage: 50,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function getFirstFinanceItem(vendor: VendorWithFinance) {
  return vendor.finance?.items?.[0] ?? null;
}

function getVendorCategoryLabel(vendor: VendorWithFinance) {
  return (
    (vendor as VendorWithFinance & { expense_categories?: { name?: string } }).expense_categories
      ?.name ?? null
  );
}

function getVendorEvents(vendor: VendorWithFinance): string[] {
  const assignments = (
    vendor as VendorWithFinance & {
      vendor_event_assignments?: Array<{ events?: { name?: string } }>;
    }
  ).vendor_event_assignments;
  return (assignments ?? []).map((assignment) => assignment.events?.name ?? '').filter(Boolean);
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function plannedBadge(dateStr: string) {
  const days = daysUntil(dateStr);
  if (days < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
  if (days === 0) return { label: 'Due today', cls: 'bg-red-100 text-red-700' };
  if (days <= 3) return { label: `Due in ${days}d`, cls: 'bg-orange-100 text-orange-700' };
  if (days <= 7) return { label: `Due in ${days}d`, cls: 'bg-amber-100 text-amber-700' };
  return {
    label: new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    cls: 'bg-gray-100 text-gray-600',
  };
}

export default function Vendors() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(DEFAULT_FORM);
  const [editingVendor, setEditingVendor] = useState<VendorWithFinance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [paymentSource, setPaymentSource] = useState<VendorWithFinance | null>(null);

  const { data: vendors = [], isLoading: loadingVendors } = useVendors();
  const { data: categoryTree = [], isLoading: loadingCategories } = useCategoryTree() as {
    data: Array<{ id: string; name: string; children?: Array<{ id: string }> }>;
    isLoading: boolean;
  };
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const filteredVendors = useMemo(() => {
    if (selectedCategory === 'all') return vendors;
    const parent = categoryTree.find((entry) => entry.id === selectedCategory);
    if (!parent) return vendors;
    const validIds = new Set<string>([
      parent.id,
      ...(parent.children ?? []).map((child) => child.id),
    ]);
    return vendors.filter((vendor) =>
      vendor.category_id ? validIds.has(vendor.category_id) : false,
    );
  }, [categoryTree, selectedCategory, vendors]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingVendor(null);
  };

  const handleEdit = (vendor: VendorWithFinance) => {
    const firstItem = getFirstFinanceItem(vendor);
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      category_id: vendor.category_id,
      contact_person: vendor.contact_person ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      total_cost:
        vendor.finance_summary?.committed_amount != null
          ? String(vendor.finance_summary.committed_amount)
          : '',
      expense_date: vendor.finance?.expense_date ?? TODAY,
      side: firstItem?.side ?? 'shared',
      bride_share_percentage: firstItem?.bride_share_percentage ?? 50,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      name: formData.name,
      category_id: formData.category_id,
      contact_person: formData.contact_person || null,
      phone: formData.phone || null,
      email: formData.email || null,
      total_cost: formData.total_cost === '' ? null : Number(formData.total_cost),
      expense_date: formData.expense_date,
      side: formData.side,
      bride_share_percentage: formData.side === 'shared' ? formData.bride_share_percentage : null,
    };

    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({ id: editingVendor.id, ...payload });
        toast.success('Vendor updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Vendor added successfully.');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save vendor.';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vendor deleted successfully.');
      setDeleteConfirm(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to delete vendor.';
      toast.error(message);
    }
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
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-maroon-800 text-white'
              : 'bg-white text-gray-600 hover:bg-gold-50'
          }`}
        >
          All
        </button>
        {categoryTree.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-maroon-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gold-50'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filteredVendors.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => {
            const plannedPayments =
              vendor.finance?.payments?.filter((payment) => payment.status === 'scheduled') ?? [];
            const postedPayments =
              vendor.finance?.payments?.filter((payment) => payment.status === 'posted') ?? [];
            const firstItem = getFirstFinanceItem(vendor);
            const events = getVendorEvents(vendor);
            const committed = vendor.finance_summary?.committed_amount ?? 0;
            const paid = vendor.finance_summary?.paid_amount ?? 0;
            const outstanding = vendor.finance_summary?.outstanding_amount ?? 0;

            return (
              <div key={vendor.id} className="card-hover">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-maroon-800">{vendor.name}</h3>
                    <p className="text-sm text-gold-600">
                      {getVendorCategoryLabel(vendor) ?? 'Vendor'}
                    </p>
                  </div>
                  {vendor.finance_summary && (
                    <span className="badge bg-gray-100 text-gray-700 capitalize">
                      {firstItem?.side ?? 'shared'}
                    </span>
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

                {plannedPayments.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {plannedPayments.map((payment) => {
                      const dueDate = payment.due_date ?? payment.created_at;
                      const badge = plannedBadge(dueDate);
                      return (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span>📅</span>
                            <span className="font-medium text-amber-800">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Committed</p>
                      <p className="font-medium">{formatCurrency(committed)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Paid</p>
                      <p className="font-medium text-green-700">{formatCurrency(paid)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Outstanding</p>
                      <p className="font-medium text-orange-700">{formatCurrency(outstanding)}</p>
                    </div>
                  </div>

                  {postedPayments.length > 0 ? (
                    <div className="space-y-1 pt-1 border-t border-gray-200">
                      {postedPayments.slice(0, 3).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between text-xs text-gray-600"
                        >
                          <span>
                            {new Date(payment.paid_date ?? payment.created_at).toLocaleDateString(
                              'en-IN',
                            )}
                          </span>
                          <span className="font-medium text-green-700">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No posted payments yet</p>
                  )}

                  {vendor.expense_id ? (
                    <button
                      onClick={() => setPaymentSource(vendor)}
                      className="flex items-center gap-1 text-xs text-maroon-700 hover:text-maroon-900 font-medium pt-1 border-t border-gray-200 w-full"
                    >
                      <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />
                      Manage payments
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400 pt-1 border-t border-gray-200">
                      Add a committed amount to unlock payment tracking.
                    </p>
                  )}
                </div>

                {events.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {events.map((event) => (
                      <span
                        key={event}
                        className="text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gold-100 flex justify-end items-center gap-2">
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
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="input"
                    placeholder="Vendor name"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category *</label>
                    <CategoryCombobox
                      value={formData.category_id}
                      onChange={(id) => setFormData((prev) => ({ ...prev, category_id: id }))}
                      level="subcategory"
                      placeholder="Search categories…"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, contact_person: event.target.value }))
                      }
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
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className="input"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="input"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Committed Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_cost}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, total_cost: event.target.value }))
                      }
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Obligation Date</label>
                    <input
                      type="date"
                      value={formData.expense_date}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, expense_date: event.target.value }))
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Liability Side</label>
                  <div className="flex gap-2">
                    {(['bride', 'groom', 'shared'] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, side }))}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          formData.side === side
                            ? side === 'bride'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : side === 'groom'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gold-500 bg-gold-50 text-gold-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {side === 'shared'
                          ? 'Shared'
                          : `${side.charAt(0).toUpperCase()}${side.slice(1)} Side`}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.side === 'shared' && (
                  <div>
                    <label className="label">
                      Bride Share Percentage ({formData.bride_share_percentage}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.bride_share_percentage}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          bride_share_percentage: Number(event.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                )}
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
                  type="button"
                  onClick={(event) => void handleSubmit(event as unknown as React.FormEvent)}
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

      {paymentSource && (
        <VendorPaymentsModal
          source={{
            id: paymentSource.id,
            name: paymentSource.name,
            type: 'vendor',
            expense_id: paymentSource.expense_id,
            finance_summary: paymentSource.finance_summary,
            finance: paymentSource.finance,
          }}
          onClose={() => setPaymentSource(null)}
        />
      )}
    </div>
  );
}
