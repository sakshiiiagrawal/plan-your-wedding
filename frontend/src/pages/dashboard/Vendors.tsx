import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineDownload,
  HiOutlineInformationCircle,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineSelector,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineViewGrid,
  HiOutlineViewList,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import CategoryCombobox from '../../components/CategoryCombobox';
import { formatCurrency } from '../../utils/currency';
import { parseLocalDate, todayLocal } from '../../utils/date';
import {
  useCategoryTree,
  useCreateSourcePayment,
  useCreateVendor,
  useDeleteSourcePayment,
  useDeleteVendor,
  useSourcePayments,
  useUpdateExpensePayment,
  useUpdateVendor,
  useVendorsList,
  useExportVendors,
} from '../../hooks/useApi';
import type { PaymentRow, VendorWithFinance } from '@wedding-planner/shared';
import { financeTier } from '@wedding-planner/shared';
import { SectionHeader, Checkbox } from '../../components/ui';
import { Modal, FormSection, SideToggle } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DatePicker from '../../components/ui/DatePicker';
import SplitShare from '../../components/ui/SplitShare';
import InstallmentsEditor, {
  installmentToPaymentPayload,
  type InstallmentFormRow,
} from '../../components/finance/InstallmentsEditor';
import PaymentTimelinePanel from '../../components/finance/PaymentTimelinePanel';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useAuth } from '../../contexts/AuthContext';

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
  needs_food: boolean;
  needs_accommodation: boolean;
  team_size: string;
  team_member_names: string[];
}

interface ApiError {
  response?: { data?: { message?: string; error?: string } };
}

const parseTeamSize = (raw: string): number => {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 100);
};

const createDefaultForm = (): VendorFormData => ({
  name: '',
  category_id: null,
  contact_person: '',
  phone: '',
  email: '',
  total_cost: '',
  expense_date: todayLocal(),
  side: 'shared',
  bride_share_percentage: 50,
  needs_food: false,
  needs_accommodation: false,
  team_size: '1',
  team_member_names: [],
});

const formatPaymentAmount = (amount: number, direction: 'outflow' | 'inflow') =>
  `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;

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

type VendorPaymentFilter = 'quoted' | 'deposit' | 'confirmed';
type VendorLogisticsFilter = 'food' | 'accommodation' | 'team';

function summarizeMultiSelect(labels: string[], fallback: string) {
  if (labels.length === 0) return fallback;
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function plannedBadge(dateStr: string): { label: string; style: React.CSSProperties } {
  const days = daysUntil(dateStr);
  if (days < 0) {
    return {
      label: 'Overdue',
      style: { background: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    };
  }
  if (days === 0) {
    return {
      label: 'Due today',
      style: { background: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    };
  }
  if (days <= 3) {
    return {
      label: `Due in ${days}d`,
      style: { background: 'rgba(234,88,12,0.1)', color: '#ea580c' },
    };
  }
  if (days <= 7) {
    return {
      label: `Due in ${days}d`,
      style: { background: 'var(--gold-glow)', color: 'var(--gold-deep)' },
    };
  }
  return {
    label: parseLocalDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    style: { background: 'var(--bg-raised)', color: 'var(--ink-low)' },
  };
}

function VendorsListView({
  vendors,
  canSeeMoney,
  onEdit,
  onDelete,
}: {
  vendors: VendorWithFinance[];
  canSeeMoney: boolean;
  onEdit: (vendor: VendorWithFinance) => void;
  onDelete: (id: string) => void;
}) {
  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-low)',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    color: 'var(--ink-high)',
    borderTop: '1px solid var(--line-soft)',
    verticalAlign: 'middle',
  };
  const numTd: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', minWidth: canSeeMoney ? 760 : 520 }}
      >
        <thead>
          <tr>
            <th style={th}>Vendor</th>
            <th style={th}>Category</th>
            <th style={th}>Status</th>
            {canSeeMoney && (
              <>
                <th style={{ ...th, textAlign: 'right' }}>Committed</th>
                <th style={{ ...th, textAlign: 'right' }}>Paid</th>
                <th style={{ ...th, textAlign: 'right' }}>Due</th>
              </>
            )}
            <th style={th}>Contact</th>
            <th style={{ ...th, textAlign: 'right' }} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => {
            const committed = vendor.finance_summary?.committed_amount ?? 0;
            const paid = vendor.finance_summary?.paid_amount ?? 0;
            const outstanding = vendor.finance_summary?.outstanding_amount ?? 0;
            const statusLabel =
              paid >= committed && committed > 0
                ? 'Confirmed'
                : paid > 0
                  ? 'Deposit paid'
                  : 'Quoted';
            const statusDotColor =
              paid >= committed && committed > 0
                ? '#16a34a'
                : paid > 0
                  ? 'var(--gold)'
                  : 'var(--line-strong)';
            return (
              <tr
                key={vendor.id}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-raised)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={td}>
                  <button
                    onClick={() => onEdit(vendor)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontWeight: 500,
                      color: 'var(--ink-high)',
                      textAlign: 'left',
                    }}
                  >
                    {vendor.name}
                  </button>
                </td>
                <td style={{ ...td, color: 'var(--ink-mid)' }}>
                  {getVendorCategoryLabel(vendor) ?? '—'}
                </td>
                <td style={td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: statusDotColor,
                      }}
                    />
                    {statusLabel}
                  </span>
                </td>
                {canSeeMoney && (
                  <>
                    <td style={numTd}>
                      {committed > 0 ? (
                        formatCurrency(committed)
                      ) : (
                        <span style={{ color: 'var(--ink-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...numTd, color: paid > 0 ? '#16a34a' : 'var(--ink-dim)' }}>
                      {paid > 0 ? formatCurrency(paid) : '—'}
                    </td>
                    <td style={{ ...numTd, color: outstanding > 0 ? '#ea580c' : 'var(--ink-dim)' }}>
                      {outstanding > 0 ? formatCurrency(outstanding) : '—'}
                    </td>
                  </>
                )}
                <td style={{ ...td, color: 'var(--ink-mid)', whiteSpace: 'nowrap' }}>
                  {vendor.phone ? (
                    <a
                      href={`tel:${vendor.phone}`}
                      style={{ color: 'var(--gold-deep)', textDecoration: 'none' }}
                    >
                      {vendor.phone}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--ink-dim)' }}>—</span>
                  )}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button
                    onClick={() => onEdit(vendor)}
                    title="Edit vendor"
                    style={{
                      padding: '5px 7px',
                      borderRadius: 6,
                      color: 'var(--ink-dim)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <HiOutlinePencil style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => onDelete(vendor.id)}
                    title="Delete vendor"
                    style={{
                      padding: '5px 7px',
                      borderRadius: 6,
                      color: 'var(--ink-dim)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <HiOutlineTrash style={{ width: 14, height: 14 }} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Vendors() {
  const { user } = useAuth();
  const tier = financeTier(user);
  const canSeeMoney = tier !== 'none';
  const canSeeSplits = tier === 'full';

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilters, setPaymentFilters] = useState<VendorPaymentFilter[]>([]);
  const [logisticsFilters, setLogisticsFilters] = useState<VendorLogisticsFilter[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(createDefaultForm);
  const [editingVendor, setEditingVendor] = useState<VendorWithFinance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [installments, setInstallments] = useState<InstallmentFormRow[]>([]);

  const { data: categoryTree = [], isLoading: loadingCategories } = useCategoryTree() as {
    data: Array<{ id: string; name: string; children?: Array<{ id: string }> }>;
    isLoading: boolean;
  };
  const categoryFilterIds = useMemo(() => {
    if (selectedCategoryIds.length === 0) return [];
    const validIds = new Set<string>();
    for (const categoryId of selectedCategoryIds) {
      const parent = categoryTree.find((entry) => entry.id === categoryId);
      if (parent) {
        validIds.add(parent.id);
        for (const child of parent.children ?? []) validIds.add(child.id);
      } else {
        validIds.add(categoryId);
      }
    }
    return Array.from(validIds);
  }, [categoryTree, selectedCategoryIds]);
  const {
    data: vendorsResponse,
    isLoading: loadingVendors,
    isFetching: fetchingVendors,
  } = useVendorsList({
    category_ids: categoryFilterIds,
    payment_states: paymentFilters,
    logistics: logisticsFilters,
    search: searchQuery.trim(),
    page,
    per_page: perPage,
  });
  const vendors = useMemo(() => vendorsResponse?.items ?? [], [vendorsResponse?.items]);
  const totalVendors = vendorsResponse?.total_items ?? 0;
  const exportVendors = useExportVendors();
  const totalPages = vendorsResponse?.total_pages ?? 1;
  const activePage = vendorsResponse?.page ?? page;
  const activePerPage = vendorsResponse?.per_page ?? perPage;
  const startIndex = totalVendors === 0 ? 0 : (activePage - 1) * activePerPage + 1;
  const endIndex = totalVendors === 0 ? 0 : startIndex + vendors.length - 1;

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();
  const { data: vendorPayments = [] } = useSourcePayments('vendor', editingVendor?.id ?? '');
  const createVendorPayment = useCreateSourcePayment('vendor');
  const deleteVendorPayment = useDeleteSourcePayment('vendor');
  const updateExpensePayment = useUpdateExpensePayment();
  const getVendorFormState = (vendor?: VendorWithFinance | null): VendorFormData => {
    if (!vendor) return createDefaultForm();
    const firstItem = getFirstFinanceItem(vendor);
    const teamMembers =
      (
        vendor as VendorWithFinance & {
          team_members?: Array<{ first_name: string }>;
        }
      ).team_members ?? [];
    const teamSize = vendor.team_size ?? 0;
    return {
      name: vendor.name,
      category_id: vendor.category_id,
      contact_person: vendor.contact_person ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      total_cost:
        vendor.finance_summary?.committed_amount != null
          ? String(vendor.finance_summary.committed_amount)
          : '',
      expense_date: vendor.finance?.expense_date ?? todayLocal(),
      side: firstItem?.side ?? 'shared',
      bride_share_percentage: firstItem?.bride_share_percentage ?? 50,
      needs_food: vendor.needs_food ?? false,
      needs_accommodation: vendor.needs_accommodation ?? false,
      team_size: String(teamSize > 0 ? teamSize : 1),
      team_member_names: teamMembers.map((member) => member.first_name ?? ''),
    };
  };
  const currentVendorFinance = useMemo(() => {
    if (!editingVendor) return null;
    const freshVendor = vendors.find((vendor) => vendor.id === editingVendor.id);
    return freshVendor?.finance ?? editingVendor.finance;
  }, [editingVendor, vendors]);
  const currentVendorSummary = useMemo(() => {
    if (!editingVendor) return null;
    const freshVendor = vendors.find((vendor) => vendor.id === editingVendor.id);
    return freshVendor?.finance_summary ?? editingVendor.finance_summary;
  }, [editingVendor, vendors]);

  const sortedPayments = useMemo(
    () =>
      [...(vendorPayments as PaymentRow[])].sort((left, right) => {
        const leftDate = left.paid_date ?? left.due_date ?? left.created_at;
        const rightDate = right.paid_date ?? right.due_date ?? right.created_at;
        return rightDate.localeCompare(leftDate);
      }),
    [vendorPayments],
  );

  const paymentCommitted = currentVendorSummary?.committed_amount ?? 0;
  const paymentPaid = currentVendorSummary?.paid_amount ?? 0;
  const paymentOutstanding = currentVendorSummary?.outstanding_amount ?? 0;
  const canRecordPayment = editingVendor
    ? !!editingVendor.expense_id
    : Number(formData.total_cost || 0) > 0;

  const paymentFilterOptions: Array<{ id: VendorPaymentFilter; label: string }> = [
    { id: 'quoted', label: 'Quoted' },
    { id: 'deposit', label: 'Deposit paid' },
    { id: 'confirmed', label: 'Confirmed' },
  ];

  const logisticsFilterOptions: Array<{ id: VendorLogisticsFilter; label: string }> = [
    { id: 'food', label: 'Needs food' },
    { id: 'accommodation', label: 'Needs stay' },
    { id: 'team', label: 'Has team' },
  ];

  const HEADER_GRADIENTS = [
    'linear-gradient(135deg, rgba(176,141,62,0.15) 0%, rgba(176,141,62,0.3) 100%)',
    'linear-gradient(135deg, rgba(190,24,93,0.08) 0%, rgba(124,58,237,0.12) 100%)',
    'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(176,141,62,0.15) 100%)',
  ];

  const hasActiveFilters =
    selectedCategoryIds.length > 0 ||
    paymentFilters.length > 0 ||
    logisticsFilters.length > 0 ||
    searchQuery.trim() !== '';

  useEffect(() => {
    if (!isFilterMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (filterMenuRef.current?.contains(event.target as Node)) return;
      setIsFilterMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isFilterMenuOpen]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategoryIds, paymentFilters, logisticsFilters, searchQuery]);

  const toggleSelection = <T extends string>(
    value: T,
    selected: T[],
    setSelected: (next: T[]) => void,
  ) => {
    setSelected(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  };

  const categorySummary = summarizeMultiSelect(
    categoryTree.filter((cat) => selectedCategoryIds.includes(cat.id)).map((cat) => cat.name),
    'All categories',
  );
  const paymentSummary = summarizeMultiSelect(
    paymentFilterOptions
      .filter((option) => paymentFilters.includes(option.id))
      .map((option) => option.label),
    'All payment states',
  );
  const logisticsSummary = summarizeMultiSelect(
    logisticsFilterOptions
      .filter((option) => logisticsFilters.includes(option.id))
      .map((option) => option.label),
    'All logistics',
  );

  const resetForm = () => {
    setFormData(createDefaultForm());
    setEditingVendor(null);
    setActiveTab(0);
    setInstallments([]);
  };

  const closeVendorModal = () => {
    setShowVendorModal(false);
    resetForm();
  };
  const isVendorModalDirty =
    JSON.stringify({ formData, installments }) !==
    JSON.stringify({
      formData: getVendorFormState(editingVendor),
      installments: [],
    });
  const { attemptClose: attemptCloseVendorModal, dialog: vendorUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isVendorModalDirty,
      onDiscard: closeVendorModal,
      onSave: () => {
        (document.getElementById('vendor-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving:
        createMutation.isPending || updateMutation.isPending || createVendorPayment.isPending,
    });
  useModalDismiss(showVendorModal, attemptCloseVendorModal);

  const handleEdit = (vendor: VendorWithFinance) => {
    setEditingVendor(vendor);
    setFormData(getVendorFormState(vendor));
    setShowVendorModal(true);
  };

  const openPaymentsTab = (vendor: VendorWithFinance) => {
    handleEdit(vendor);
    setTimeout(() => setActiveTab(1), 50);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // D7: installments attach to the vendor's obligation, which only exists once
    // a total cost is set. Block the silent drop and point the user at it.
    if (!editingVendor) {
      const hasInstallments = installments.some((row) => Number(row.amount || 0) !== 0);
      if (hasInstallments && !(Number(formData.total_cost || 0) > 0)) {
        toast.error('Enter the total cost before adding installments.');
        setActiveTab(1);
        return;
      }
    }

    const teamRelevant = formData.needs_food || formData.needs_accommodation;
    const effectiveTeamSize = teamRelevant ? parseTeamSize(formData.team_size) : 0;
    const payload = {
      name: formData.name,
      category_id: formData.category_id,
      contact_person: formData.contact_person || null,
      phone: formData.phone || null,
      email: formData.email || null,
      expense_date: formData.expense_date,
      needs_food: formData.needs_food,
      needs_accommodation: formData.needs_accommodation,
      team_size: effectiveTeamSize,
      team_member_names: teamRelevant ? formData.team_member_names.slice(0, effectiveTeamSize) : [],
      ...(canSeeMoney
        ? { total_cost: formData.total_cost === '' ? null : Number(formData.total_cost) }
        : {}),
      ...(canSeeSplits
        ? {
            side: formData.side,
            bride_share_percentage:
              formData.side === 'shared' ? formData.bride_share_percentage : null,
          }
        : {}),
    };

    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({ id: editingVendor.id, ...payload });
        toast.success('Vendor updated successfully.');
      } else {
        const savedVendor = await createMutation.mutateAsync(payload);
        toast.success('Vendor added successfully.');

        const rowsToRecord = installments.filter((row) => Number(row.amount || 0) !== 0);
        if (rowsToRecord.length > 0 && savedVendor?.id && savedVendor?.expense_id) {
          try {
            for (const row of rowsToRecord) {
              await createVendorPayment.mutateAsync({
                sourceId: savedVendor.id,
                ...installmentToPaymentPayload(row, canSeeSplits),
              });
            }
            toast.success(rowsToRecord.length > 1 ? 'Installments recorded.' : 'Payment recorded.');
          } catch {
            toast.error(
              'Vendor saved but failed to record all payments. You can add the rest from the Payments tab.',
            );
          }
        } else if (rowsToRecord.length > 0 && !savedVendor?.expense_id) {
          toast.error(
            'Vendor saved, but the payments could not be attached. Open the vendor and add them from the Payments tab.',
          );
        }
      }

      closeVendorModal();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        'Failed to save vendor.';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vendor deleted successfully.');
      setDeleteConfirm(null);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        'Failed to delete vendor.';
      toast.error(message);
    }
  };

  if (loadingVendors || loadingCategories) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid var(--line-soft)',
            borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Service providers"
        title="Vendors"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--line)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {[
                { mode: 'grid' as const, Icon: HiOutlineViewGrid, title: 'Grid view' },
                { mode: 'list' as const, Icon: HiOutlineViewList, title: 'List view' },
              ].map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={title}
                  style={{
                    padding: '6px 10px',
                    background: viewMode === mode ? 'var(--gold-glow)' : 'transparent',
                    color: viewMode === mode ? 'var(--gold-deep)' : 'var(--ink-dim)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                </button>
              ))}
            </div>
            <button
              onClick={() => exportVendors.mutate()}
              disabled={exportVendors.isPending}
              className="btn-outline"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineDownload style={{ width: 14, height: 14 }} />
              Export Excel
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowVendorModal(true);
              }}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              Add vendor
            </button>
          </div>
        }
      />

      <div
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <HiOutlineSearch
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'var(--ink-dim)',
              }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-neu"
              placeholder="Search vendors, contacts, categories, or events"
              style={{ paddingLeft: 38 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryIds([]);
                  setPaymentFilters([]);
                  setLogisticsFilters([]);
                  setPage(1);
                }}
                className="btn-outline"
                style={{ whiteSpace: 'nowrap' }}
              >
                Clear filters
              </button>
            )}
            <div ref={filterMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((open) => !open)}
                style={{
                  width: 240,
                  minHeight: 46,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isFilterMenuOpen ? 'var(--gold)' : 'var(--line)'}`,
                  background: 'var(--bg-raised)',
                  color: 'var(--ink-high)',
                  boxShadow: isFilterMenuOpen ? '0 0 0 3px var(--gold-glow)' : 'none',
                  lineHeight: 1.2,
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-mid)',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    Filters
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--ink-high)',
                      fontWeight: 500,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {hasActiveFilters
                      ? `${categorySummary} · ${paymentSummary} · ${logisticsSummary}`
                      : 'All vendors'}
                  </span>
                </span>
                <HiOutlineSelector
                  style={{
                    width: 16,
                    height: 16,
                    color: 'var(--ink-mid)',
                    flexShrink: 0,
                    transform: isFilterMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 150ms ease',
                  }}
                />
              </button>

              {isFilterMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 340,
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 16,
                    boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
                    padding: 14,
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                        Vendor filters
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-low)' }}>
                        Mix and match multiple filters.
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryIds([]);
                          setPaymentFilters([]);
                          setLogisticsFilters([]);
                          setPage(1);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--gold-deep)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="uppercase-eyebrow">Categories</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--ink-high)',
                      }}
                    >
                      {categoryTree
                        .filter((cat) => cat.name !== 'Venue')
                        .map((cat) => {
                          const checked = selectedCategoryIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() =>
                                toggleSelection(cat.id, selectedCategoryIds, setSelectedCategoryIds)
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: 8,
                                width: '100%',
                                minHeight: 36,
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: `1px solid ${checked ? 'rgba(176,141,62,0.35)' : 'var(--line-soft)'}`,
                                background: checked ? 'var(--gold-glow)' : 'var(--bg-raised)',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: 'var(--ink-high)',
                                textTransform: 'none',
                                letterSpacing: 'normal',
                              }}
                            >
                              <Checkbox
                                className="pointer-events-none"
                                checked={checked}
                                onChange={() =>
                                  toggleSelection(
                                    cat.id,
                                    selectedCategoryIds,
                                    setSelectedCategoryIds,
                                  )
                                }
                              />
                              <span
                                style={{
                                  display: 'block',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: checked ? 'var(--gold-deep)' : 'var(--ink-high)',
                                  fontWeight: checked ? 600 : 500,
                                  lineHeight: 1.3,
                                  textAlign: 'left',
                                }}
                              >
                                {cat.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {canSeeMoney && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="uppercase-eyebrow">Payment status</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {paymentFilterOptions.map((option) => {
                          const checked = paymentFilters.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                toggleSelection(option.id, paymentFilters, setPaymentFilters)
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: 8,
                                width: '100%',
                                minHeight: 36,
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: `1px solid ${checked ? 'rgba(176,141,62,0.35)' : 'var(--line-soft)'}`,
                                background: checked ? 'var(--gold-glow)' : 'var(--bg-raised)',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: 'var(--ink-high)',
                                textTransform: 'none',
                                letterSpacing: 'normal',
                              }}
                            >
                              <Checkbox
                                className="pointer-events-none"
                                checked={checked}
                                onChange={() =>
                                  toggleSelection(option.id, paymentFilters, setPaymentFilters)
                                }
                              />
                              <span
                                style={{
                                  display: 'block',
                                  color: checked ? 'var(--gold-deep)' : 'var(--ink-high)',
                                  fontWeight: checked ? 600 : 500,
                                  lineHeight: 1.3,
                                  textAlign: 'left',
                                }}
                              >
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="uppercase-eyebrow">Team logistics</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {logisticsFilterOptions.map((option) => {
                        const checked = logisticsFilters.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              toggleSelection(option.id, logisticsFilters, setLogisticsFilters)
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: 8,
                              width: '100%',
                              minHeight: 36,
                              padding: '8px 10px',
                              borderRadius: 10,
                              border: `1px solid ${checked ? 'rgba(15,118,110,0.22)' : 'var(--line-soft)'}`,
                              background: checked ? 'rgba(15,118,110,0.08)' : 'var(--bg-raised)',
                              cursor: 'pointer',
                              fontSize: 12,
                              color: 'var(--ink-high)',
                              textTransform: 'none',
                              letterSpacing: 'normal',
                            }}
                          >
                            <Checkbox
                              className="pointer-events-none"
                              checked={checked}
                              onChange={() =>
                                toggleSelection(option.id, logisticsFilters, setLogisticsFilters)
                              }
                            />
                            <span
                              style={{
                                display: 'block',
                                color: checked ? '#0f766e' : 'var(--ink-high)',
                                fontWeight: checked ? 600 : 500,
                                lineHeight: 1.3,
                                textAlign: 'left',
                              }}
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--ink-low)' }}>
            Showing {startIndex} - {endIndex} of {totalVendors} vendors
            {fetchingVendors ? ' · Updating…' : ''}
          </div>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>
            {hasActiveFilters ? 'No vendors match the current filters.' : 'No vendors found.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <VendorsListView
          vendors={vendors}
          canSeeMoney={canSeeMoney}
          onEdit={handleEdit}
          onDelete={setDeleteConfirm}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {vendors.map((vendor, vendorIndex) => {
            const plannedPayments =
              vendor.finance?.payments?.filter((payment) => payment.status === 'scheduled') ?? [];
            const events = getVendorEvents(vendor);
            const committed = vendor.finance_summary?.committed_amount ?? 0;
            const paid = vendor.finance_summary?.paid_amount ?? 0;
            const outstanding = vendor.finance_summary?.outstanding_amount ?? 0;
            const paidPct = committed > 0 ? Math.min(100, (paid / committed) * 100) : 0;
            const statusLabel =
              paid >= committed && committed > 0
                ? 'Confirmed'
                : paid > 0
                  ? 'Deposit paid'
                  : 'Quoted';
            const statusDotColor =
              paid >= committed && committed > 0
                ? '#16a34a'
                : paid > 0
                  ? 'var(--gold)'
                  : 'var(--line-strong)';
            const hasTeamLogistics =
              Boolean(vendor.needs_food) ||
              Boolean(vendor.needs_accommodation) ||
              Number(vendor.team_size ?? 0) > 0;

            return (
              <div
                key={vendor.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ height: 4, background: HEADER_GRADIENTS[vendorIndex % 3] }} />
                <div
                  style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                        {getVendorCategoryLabel(vendor) ?? 'Vendor'}
                      </div>
                      <h3
                        className="display"
                        onClick={() => handleEdit(vendor)}
                        style={{
                          margin: 0,
                          fontSize: 16,
                          color: 'var(--ink-high)',
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--ink-high)';
                        }}
                      >
                        {vendor.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 3,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: 10, color: 'var(--ink-low)' }}>{statusLabel}</span>
                        {vendor.finance?.items?.[0]?.side && (
                          <span
                            style={{
                              fontSize: 9,
                              color: 'var(--ink-low)',
                              textTransform: 'capitalize',
                              border: '1px solid var(--line)',
                              padding: '1px 6px',
                              borderRadius: 100,
                            }}
                          >
                            {vendor.finance.items[0].side}
                          </span>
                        )}
                        {Number(vendor.team_size ?? 0) > 0 && (
                          <span
                            style={{
                              fontSize: 9,
                              background: 'var(--gold-glow)',
                              color: 'var(--gold-deep)',
                              padding: '1px 6px',
                              borderRadius: 100,
                              fontWeight: 500,
                              border: '1px solid rgba(176,141,62,0.25)',
                            }}
                          >
                            Team {vendor.team_size}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: statusDotColor,
                          display: 'inline-block',
                        }}
                      />
                      <button
                        onClick={() => handleEdit(vendor)}
                        title="Edit vendor"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          color: 'var(--ink-dim)',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'var(--gold-glow)';
                          el.style.borderColor = 'rgba(176,141,62,0.5)';
                          el.style.color = 'var(--gold-deep)';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'transparent';
                          el.style.borderColor = 'var(--line)';
                          el.style.color = 'var(--ink-dim)';
                        }}
                      >
                        <HiOutlinePencil style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>

                  {canSeeMoney && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        padding: '7px 10px',
                        background: 'var(--bg-raised)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 2, fontSize: 9 }}>
                          Committed
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-high)', fontWeight: 500 }}>
                          {committed > 0 ? (
                            formatCurrency(committed)
                          ) : (
                            <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 2, fontSize: 9 }}>
                          Paid
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: paid > 0 ? '#16a34a' : 'var(--ink-dim)',
                            fontWeight: 500,
                          }}
                        >
                          {paid > 0 ? formatCurrency(paid) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 2, fontSize: 9 }}>
                          Due
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: outstanding > 0 ? '#ea580c' : 'var(--ink-dim)',
                            fontWeight: 500,
                          }}
                        >
                          {outstanding > 0 ? formatCurrency(outstanding) : '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  {canSeeMoney && committed > 0 && (
                    <div>
                      <div
                        style={{
                          height: 4,
                          background: 'var(--line-soft)',
                          borderRadius: 100,
                          overflow: 'hidden',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 100,
                            background: 'linear-gradient(90deg, #16a34a, var(--gold))',
                            width: `${paidPct}%`,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="mono" style={{ fontSize: 10, color: '#16a34a' }}>
                          {formatCurrency(paid)} paid
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                          of {formatCurrency(committed)}
                        </span>
                      </div>
                    </div>
                  )}

                  {(plannedPayments.length > 0 ||
                    vendor.contact_person ||
                    vendor.phone ||
                    vendor.email) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {(vendor.contact_person || vendor.phone || vendor.email) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            color: 'var(--ink-mid)',
                            padding: '4px 8px',
                            background: 'var(--bg-raised)',
                            borderRadius: 6,
                          }}
                        >
                          <HiOutlinePhone
                            style={{
                              width: 11,
                              height: 11,
                              color: 'var(--ink-dim)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {vendor.contact_person && (
                              <span style={{ color: 'var(--ink-mid)' }}>
                                {vendor.contact_person}
                              </span>
                            )}
                            {vendor.contact_person && vendor.phone && (
                              <span style={{ color: 'var(--ink-dim)' }}> · </span>
                            )}
                            {vendor.phone && (
                              <a
                                href={`tel:${vendor.phone}`}
                                style={{
                                  color: 'var(--gold-deep)',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                }}
                              >
                                {vendor.phone}
                              </a>
                            )}
                            {!vendor.phone && vendor.email && (
                              <>
                                {vendor.contact_person && (
                                  <span style={{ color: 'var(--ink-dim)' }}> · </span>
                                )}
                                <span>{vendor.email}</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      {plannedPayments.slice(0, 2).map((payment) => {
                        const dueDate = payment.due_date ?? payment.created_at;
                        const badge = plannedBadge(dueDate);
                        return (
                          <div
                            key={payment.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 8px',
                              background: 'var(--gold-glow)',
                              border: '1px solid rgba(176,141,62,0.2)',
                              borderRadius: 6,
                              fontSize: 11,
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontWeight: 500,
                                color:
                                  payment.direction === 'inflow' ? '#0369a1' : 'var(--gold-deep)',
                              }}
                            >
                              {formatPaymentAmount(payment.amount, payment.direction)}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                padding: '2px 6px',
                                borderRadius: 4,
                                ...badge.style,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {hasTeamLogistics && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {vendor.needs_food && (
                        <span
                          style={{
                            fontSize: 10,
                            background: 'rgba(15,118,110,0.08)',
                            color: '#0f766e',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(15,118,110,0.18)',
                          }}
                        >
                          Needs food
                        </span>
                      )}
                      {vendor.needs_accommodation && (
                        <span
                          style={{
                            fontSize: 10,
                            background: 'rgba(29,78,216,0.08)',
                            color: '#1d4ed8',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(29,78,216,0.18)',
                          }}
                        >
                          Needs stay
                        </span>
                      )}
                      {Number(vendor.team_size ?? 0) > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            background: 'var(--gold-glow)',
                            color: 'var(--gold-deep)',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(176,141,62,0.25)',
                          }}
                        >
                          {vendor.team_size} team
                        </span>
                      )}
                    </div>
                  )}

                  {events.length > 0 && (
                    <div
                      style={{
                        paddingTop: 8,
                        borderTop: '1px solid var(--line-soft)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                      }}
                    >
                      {events.map((event) => (
                        <span
                          key={event}
                          style={{
                            fontSize: 10,
                            background: 'var(--gold-glow)',
                            color: 'var(--gold-deep)',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(176,141,62,0.25)',
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 8,
                      borderTop: '1px solid var(--line-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    {vendor.expense_id && committed > 0 ? (
                      <button
                        onClick={() => openPaymentsTab(vendor)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: 'var(--gold-deep)',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <HiOutlineCurrencyRupee style={{ width: 12, height: 12 }} />
                        Manage payments
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>No payments yet</span>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          title="Call vendor"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            color: 'var(--ink-dim)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <HiOutlinePhone style={{ width: 15, height: 15 }} />
                        </a>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(vendor.id)}
                        title="Delete vendor"
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          color: 'var(--ink-dim)',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            'rgba(220,38,38,0.08)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--err)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
                        }}
                      >
                        <HiOutlineTrash style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>Per page</span>
          <select
            className="input"
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
            style={{ width: 80, height: 34, padding: '6px 8px' }}
          >
            {[12, 24, 48].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={activePage <= 1 || fetchingVendors}
            style={{ padding: '6px 10px', opacity: activePage <= 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span
            style={{ fontSize: 12, color: 'var(--ink-low)', minWidth: 80, textAlign: 'center' }}
          >
            Page {activePage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={activePage >= totalPages || fetchingVendors}
            style={{ padding: '6px 10px', opacity: activePage >= totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>

      {showVendorModal && (
        <Modal
          onClose={attemptCloseVendorModal}
          eyebrow="Service providers"
          title={editingVendor ? 'Edit vendor' : 'Add vendor'}
          size="xl"
          height={760}
          headerRight={
            canRecordPayment && editingVendor ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--ok)', whiteSpace: 'nowrap' }}>
                  Paid: <strong>{formatCurrency(paymentPaid)}</strong>
                </span>
                {paymentOutstanding > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--warn)', whiteSpace: 'nowrap' }}>
                    Outstanding: <strong>{formatCurrency(paymentOutstanding)}</strong>
                  </span>
                )}
              </>
            ) : undefined
          }
          headerBottom={
            <div style={{ display: 'flex', padding: '0 24px' }}>
              {[
                { id: 0, label: 'Details' },
                ...(canSeeMoney ? [{ id: 1, label: 'Payments' }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? 'var(--gold-deep)' : 'var(--ink-low)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom:
                      activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {tab.label}
                  {tab.id === 1 && editingVendor && sortedPayments.length > 0 && (
                    <span
                      style={{
                        fontSize: 9,
                        background: 'rgba(22,163,74,0.1)',
                        color: '#16a34a',
                        padding: '1px 6px',
                        borderRadius: 100,
                        border: '1px solid rgba(22,163,74,0.25)',
                        fontWeight: 600,
                      }}
                    >
                      {sortedPayments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          }
          footerLeft={
            !canRecordPayment ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--warn)',
                }}
              >
                <HiOutlineInformationCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                Set a committed amount to record payments
              </span>
            ) : undefined
          }
          footer={
            <>
              <button type="button" onClick={attemptCloseVendorModal} className="btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                form="vendor-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
                style={{ minWidth: 170 }}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving…'
                  : editingVendor
                    ? 'Update vendor'
                    : installments.some((row) => Number(row.amount || 0) !== 0)
                      ? 'Add vendor & record payments'
                      : 'Add vendor'}
              </button>
            </>
          }
        >
          <form
            id="vendor-form"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {activeTab === 0 && (
              <div
                className={`grid grid-cols-1 gap-6 content-start ${
                  canSeeMoney ? 'md:grid-cols-[1fr_320px]' : ''
                }`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <FormSection title="Vendor details">
                    <div>
                      <label className="label">Vendor Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="input"
                        placeholder="Vendor name"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
                          }
                          className="input"
                          placeholder="Contact name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, phone: e.target.value }))
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
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="input"
                          placeholder="Email address"
                        />
                      </div>
                    </div>
                  </FormSection>

                  {(() => {
                    const teamRelevant = formData.needs_food || formData.needs_accommodation;
                    const renderedSize = teamRelevant ? parseTeamSize(formData.team_size) : 0;
                    const adjustSize = (delta: number) => {
                      const next = Math.max(
                        1,
                        Math.min(100, parseTeamSize(formData.team_size) + delta),
                      );
                      setFormData((prev) => ({ ...prev, team_size: String(next) }));
                    };
                    const stepperBtn = {
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--line)',
                      background: 'var(--bg-panel)',
                      color: 'var(--ink-mid)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      lineHeight: 1,
                    } as React.CSSProperties;

                    return (
                      <FormSection title="Team logistics">
                        <div
                          style={{
                            display: 'flex',
                            gap: 16,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: 'var(--ink-mid)',
                              cursor: 'pointer',
                            }}
                          >
                            <Checkbox
                              checked={formData.needs_food}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  needs_food: e.target.checked,
                                }))
                              }
                            />
                            Needs food
                          </label>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: 'var(--ink-mid)',
                              cursor: 'pointer',
                            }}
                          >
                            <Checkbox
                              checked={formData.needs_accommodation}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  needs_accommodation: e.target.checked,
                                }))
                              }
                            />
                            Needs accommodation
                          </label>
                          {teamRelevant && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>
                                Team size
                              </span>
                              <button
                                type="button"
                                style={stepperBtn}
                                onClick={() => adjustSize(-1)}
                                aria-label="Decrease"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formData.team_size}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                  setFormData((prev) => ({ ...prev, team_size: cleaned }));
                                }}
                                onBlur={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    team_size: String(parseTeamSize(prev.team_size)),
                                  }));
                                }}
                                style={{
                                  width: 48,
                                  height: 28,
                                  textAlign: 'center',
                                  borderRadius: 6,
                                  border: '1px solid var(--line)',
                                  background: 'var(--bg-panel)',
                                  color: 'var(--ink-high)',
                                  fontSize: 13,
                                }}
                              />
                              <button
                                type="button"
                                style={stepperBtn}
                                onClick={() => adjustSize(1)}
                                aria-label="Increase"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>

                        {teamRelevant && (
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--ink-low)',
                                marginBottom: 6,
                              }}
                            >
                              Team member names{' '}
                              <span style={{ color: 'var(--ink-dim)' }}>
                                · optional, auto-filled if blank
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: 8,
                              }}
                            >
                              {Array.from({ length: renderedSize }).map((_, idx) => (
                                <input
                                  key={idx}
                                  type="text"
                                  className="input"
                                  placeholder={`Member ${idx + 1}`}
                                  value={formData.team_member_names[idx] ?? ''}
                                  onChange={(e) => {
                                    const next = [...formData.team_member_names];
                                    while (next.length <= idx) next.push('');
                                    next[idx] = e.target.value;
                                    setFormData((prev) => ({
                                      ...prev,
                                      team_member_names: next,
                                    }));
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </FormSection>
                    );
                  })()}
                </div>

                {canSeeMoney && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <FormSection title="Financial details">
                      <div>
                        <label className="label">Committed Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.total_cost}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, total_cost: e.target.value }))
                          }
                          className="input"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="label">Obligation Date</label>
                        <DatePicker
                          value={formData.expense_date}
                          onChange={(value) =>
                            setFormData((prev) => ({ ...prev, expense_date: value }))
                          }
                          placeholder="Obligation date"
                        />
                      </div>

                      {canSeeSplits && (
                        <div>
                          <label className="label">Liability Side</label>
                          <SideToggle
                            value={formData.side}
                            onChange={(side) => setFormData((prev) => ({ ...prev, side }))}
                          />
                        </div>
                      )}

                      {canSeeSplits && formData.side === 'shared' && (
                        <SplitShare
                          total={Number(formData.total_cost) || 0}
                          bridePercentage={formData.bride_share_percentage}
                          onChange={(percentage) =>
                            setFormData((prev) => ({
                              ...prev,
                              bride_share_percentage: percentage,
                            }))
                          }
                        />
                      )}
                    </FormSection>

                    {editingVendor && (
                      <div
                        style={{
                          padding: 14,
                          background: 'var(--bg-raised)',
                          borderRadius: 10,
                          border: '1px solid var(--line-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <p className="form-section-title" style={{ margin: 0 }}>
                          Payment Summary
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}>
                              Committed
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)' }}>
                              {formatCurrency(paymentCommitted)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}>
                              Paid
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                              {formatCurrency(paymentPaid)}
                            </div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}>
                              Outstanding
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: paymentOutstanding > 0 ? '#ea580c' : 'var(--ink-dim)',
                              }}
                            >
                              {formatCurrency(paymentOutstanding)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab(1)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: 'var(--gold-deep)',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 500,
                            padding: 0,
                          }}
                        >
                          <HiOutlineCurrencyRupee style={{ width: 13, height: 13 }} /> Manage
                          payments →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {editingVendor ? (
                  <PaymentTimelinePanel
                    payments={sortedPayments}
                    committed={paymentCommitted}
                    paid={paymentPaid}
                    outstanding={paymentOutstanding}
                    onCreate={(payload) =>
                      createVendorPayment.mutateAsync({
                        sourceId: editingVendor.id,
                        ...payload,
                      })
                    }
                    onDelete={(paymentId) =>
                      deleteVendorPayment.mutateAsync({
                        sourceId: editingVendor.id,
                        paymentId,
                      })
                    }
                    onUpdate={(paymentId, payload) =>
                      updateExpensePayment.mutateAsync({ paymentId, ...payload })
                    }
                    isUpdating={updateExpensePayment.isPending}
                    items={currentVendorFinance?.items}
                    allocations={currentVendorFinance?.allocations}
                    isCreating={createVendorPayment.isPending}
                    isDeleting={deleteVendorPayment.isPending}
                    defaultSplit={{
                      side: currentVendorFinance?.items?.[0]?.side ?? 'shared',
                      bridePercentage:
                        currentVendorFinance?.items?.[0]?.bride_share_percentage ?? 50,
                    }}
                    canSeeSplits={canSeeSplits}
                    canRecordPayment={!!editingVendor.expense_id}
                    disabledReason="Link an obligation to this vendor before recording payments."
                  />
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-low)' }}>
                      Optionally record advance, milestone, or final payments alongside the vendor.
                      Leave empty to skip.
                    </p>
                    <InstallmentsEditor
                      installments={installments}
                      onChange={setInstallments}
                      committedTotal={Number(formData.total_cost || 0)}
                      canSeeSplits={canSeeSplits}
                    />
                  </>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
      {vendorUnsavedDialog}

      <ConfirmDialog
        open={deleteConfirm != null}
        title="Delete vendor?"
        message="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
