import { useMemo, useState } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineMail,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineStar,
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
import { SectionHeader } from '../../components/ui';

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
  return (vendor as VendorWithFinance & { expense_categories?: { name?: string } }).expense_categories
    ?.name ?? null;
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

function plannedBadge(dateStr: string): { label: string; style: React.CSSProperties } {
  const days = daysUntil(dateStr);
  if (days < 0) return { label: 'Overdue', style: { background: 'rgba(220,38,38,0.1)', color: '#dc2626' } };
  if (days === 0) return { label: 'Due today', style: { background: 'rgba(220,38,38,0.1)', color: '#dc2626' } };
  if (days <= 3) return { label: `Due in ${days}d`, style: { background: 'rgba(234,88,12,0.1)', color: '#ea580c' } };
  if (days <= 7) return { label: `Due in ${days}d`, style: { background: 'var(--gold-glow)', color: 'var(--gold-deep)' } };
  return {
    label: new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    style: { background: 'var(--bg-raised)', color: 'var(--ink-low)' },
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
    const validIds = new Set<string>([parent.id, ...(parent.children ?? []).map((child) => child.id)]);
    return vendors.filter((vendor) => (vendor.category_id ? validIds.has(vendor.category_id) : false));
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
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to save vendor.';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--line-soft)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Service providers"
        title="Vendors"
        action={
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
            Add vendor
          </button>
        }
      />

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {[{ id: 'all', name: 'All' }, ...categoryTree].map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 16px', borderRadius: 100, fontSize: 12, whiteSpace: 'nowrap',
                background: isActive ? 'var(--gold)' : 'var(--bg-panel)',
                color: isActive ? 'white' : 'var(--ink-mid)',
                border: `1px solid ${isActive ? 'var(--gold)' : 'var(--line)'}`,
                fontWeight: isActive ? 500 : 400, cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {filteredVendors.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredVendors.map((vendor) => {
            const plannedPayments = vendor.finance?.payments?.filter((p) => p.status === 'scheduled') ?? [];
            const events = getVendorEvents(vendor);
            const committed = vendor.finance_summary?.committed_amount ?? 0;
            const paid = vendor.finance_summary?.paid_amount ?? 0;

            const paidPct = committed > 0 ? Math.min(100, (paid / committed) * 100) : 0;
            const statusLabel = paid >= committed && committed > 0 ? 'Confirmed' : paid > 0 ? 'Deposit paid' : 'Quoted';
            const statusDotColor = paid >= committed && committed > 0 ? '#16a34a' : paid > 0 ? 'var(--gold)' : 'var(--line-strong)';

            return (
              <div key={vendor.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                      {getVendorCategoryLabel(vendor) ?? 'Vendor'}
                    </div>
                    <h3 className="display" style={{ margin: 0, fontSize: 20, color: 'var(--ink-high)', lineHeight: 1.2 }}>
                      {vendor.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDotColor, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: 'var(--ink-low)' }}>{statusLabel}</span>
                  </div>
                </div>

                {/* Star rating */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                  {[1,2,3,4,5].map((star) => (
                    <HiOutlineStar
                      key={star}
                      style={{ width: 13, height: 13, color: star <= 4 ? 'var(--gold)' : 'var(--line-strong)', fill: star <= 4 ? 'var(--gold)' : 'none' }}
                    />
                  ))}
                </div>

                {/* Contact details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {vendor.contact_person && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="uppercase-eyebrow" style={{ width: 52, flexShrink: 0 }}>Contact</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-mid)' }}>{vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HiOutlinePhone style={{ width: 13, height: 13, color: 'var(--ink-dim)', flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-mid)' }}>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HiOutlineMail style={{ width: 13, height: 13, color: 'var(--ink-dim)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendor.email}</span>
                    </div>
                  )}
                </div>

                {/* Payment progress */}
                {committed > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ height: 4, background: 'var(--line-soft)', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #16a34a, var(--gold))', width: `${paidPct}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: 10, color: '#16a34a' }}>{formatCurrency(paid)} paid</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>of {formatCurrency(committed)}</span>
                    </div>
                  </div>
                )}

                {/* Upcoming payment alerts */}
                {plannedPayments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {plannedPayments.slice(0, 2).map((payment) => {
                      const dueDate = payment.due_date ?? payment.created_at;
                      const badge = plannedBadge(dueDate);
                      return (
                        <div key={payment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gold-glow)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--gold-deep)' }}>{formatCurrency(payment.amount)}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, ...badge.style }}>{badge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Manage payments */}
                {vendor.expense_id && (
                  <button
                    onClick={() => setPaymentSource(vendor)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-deep)', background: 'transparent', cursor: 'pointer', marginBottom: 12, fontWeight: 500 }}
                  >
                    <HiOutlineCurrencyRupee style={{ width: 13, height: 13 }} />
                    Manage payments
                  </button>
                )}

                {/* Events */}
                {events.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {events.map((event) => (
                      <span key={event} style={{ fontSize: 10, background: 'var(--gold-glow)', color: 'var(--gold-deep)', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(212,175,55,0.25)' }}>{event}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} title="Call vendor"
                      style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <HiOutlinePhone style={{ width: 15, height: 15 }} />
                    </a>
                  )}
                  <button onClick={() => handleEdit(vendor)} title="Edit vendor"
                    style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
                  >
                    <HiOutlinePencil style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => setDeleteConfirm(vendor.id)} title="Delete vendor"
                    style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--err)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
                  >
                    <HiOutlineTrash style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>No vendors found.</p>
        </div>
      )}

      {showAddModal && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>Service providers</div>
                  <h2 className="display" style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}>{editingVendor ? 'Edit vendor' : 'Add vendor'}</h2>
                </div>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}>
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Vendor Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="Vendor name" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Category *</label>
                    <CategoryCombobox value={formData.category_id} onChange={(id) => setFormData((p) => ({ ...p, category_id: id }))} level="subcategory" placeholder="Search categories…" />
                  </div>
                  <div>
                    <label className="label">Contact Person</label>
                    <input type="text" value={formData.contact_person} onChange={(e) => setFormData((p) => ({ ...p, contact_person: e.target.value }))} className="input" placeholder="Contact name" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className="input" placeholder="Phone number" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="input" placeholder="Email address" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Committed Amount</label>
                    <input type="number" min="0" step="0.01" value={formData.total_cost} onChange={(e) => setFormData((p) => ({ ...p, total_cost: e.target.value }))} className="input" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Obligation Date</label>
                    <input type="date" value={formData.expense_date} onChange={(e) => setFormData((p) => ({ ...p, expense_date: e.target.value }))} className="input" />
                  </div>
                </div>

                <div>
                  <label className="label">Liability Side</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['bride', 'groom', 'shared'] as const).map((side) => {
                      const isActive = formData.side === side;
                      const activeColors = side === 'bride'
                        ? { border: '#be185d', bg: 'rgba(190,24,93,0.08)', color: '#be185d' }
                        : side === 'groom'
                          ? { border: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', color: '#1d4ed8' }
                          : { border: 'var(--gold)', bg: 'var(--gold-glow)', color: 'var(--gold-deep)' };
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, side }))}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                            border: `2px solid ${isActive ? activeColors.border : 'var(--line)'}`,
                            background: isActive ? activeColors.bg : 'transparent',
                            color: isActive ? activeColors.color : 'var(--ink-mid)',
                            cursor: 'pointer', transition: 'all 150ms', fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {side === 'shared' ? 'Shared' : `${side.charAt(0).toUpperCase()}${side.slice(1)} side`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.side === 'shared' && (
                  <div>
                    <label className="label">Bride Share — {formData.bride_share_percentage}%</label>
                    <input type="range" min="0" max="100" value={formData.bride_share_percentage} onChange={(e) => setFormData((p) => ({ ...p, bride_share_percentage: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary" style={{ flex: 1, opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1 }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editingVendor ? 'Update vendor' : 'Add vendor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {deleteConfirm && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <h3 className="display" style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}>Delete vendor?</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 24 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteMutation.isPending} style={{ flex: 1, padding: '9px 16px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: deleteMutation.isPending ? 0.5 : 1 }}>
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
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
