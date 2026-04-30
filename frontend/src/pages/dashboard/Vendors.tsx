import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineCurrencyRupee,
  HiOutlineInformationCircle,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlineSelector,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import CategoryCombobox from '../../components/CategoryCombobox';
import {
  useCategoryTree,
  useCreateSourcePayment,
  useCreateVendor,
  useDeleteSourcePayment,
  useDeleteVendor,
  useSourcePayments,
  useUpdateVendor,
  useVendorsList,
} from '../../hooks/useApi';
import type {
  ExpenseItemRow,
  PaymentAllocationRow,
  PaymentRow,
  VendorWithFinance,
} from '@wedding-planner/shared';
import { SectionHeader } from '../../components/ui';
import DatePicker from '../../components/ui/DatePicker';
import SplitShare from '../../components/ui/SplitShare';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';

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

interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  paid_bride_share_percentage: number;
  notes: string;
  extra_category_id: string | null;
  extra_description: string;
  extra_side: 'bride' | 'groom' | 'shared';
  extra_bride_share_percentage: number;
}

interface ApiError {
  response?: { data?: { message?: string; error?: string } };
}

const parseTeamSize = (raw: string): number => {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 100);
};

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
  needs_food: false,
  needs_accommodation: false,
  team_size: '1',
  team_member_names: [],
};

const DEFAULT_PAYMENT_FORM: PaymentFormState = {
  amount: '',
  payment_date: TODAY,
  payment_method: 'cash',
  paid_by_side: 'shared',
  paid_bride_share_percentage: 50,
  notes: '',
  extra_category_id: null,
  extra_description: 'Tip',
  extra_side: 'shared',
  extra_bride_share_percentage: 50,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatPaymentAmount = (amount: number, direction: 'outflow' | 'inflow') =>
  `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;

function sharedPaymentSideAmounts(
  payment: Pick<
    PaymentRow,
    'id' | 'amount' | 'direction' | 'paid_by_side' | 'paid_bride_share_percentage'
  >,
  items: ExpenseItemRow[],
  allocations: PaymentAllocationRow[],
): { bride: number; groom: number } | null {
  if (payment.paid_by_side !== 'shared') return null;
  const multiplier = payment.direction === 'inflow' ? -1 : 1;

  if (payment.paid_bride_share_percentage != null) {
    return {
      bride: payment.amount * multiplier * (payment.paid_bride_share_percentage / 100),
      groom: payment.amount * multiplier * ((100 - payment.paid_bride_share_percentage) / 100),
    };
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const allocationsForPayment = allocations.filter(
    (allocation) => allocation.payment_id === payment.id,
  );

  let bride = 0;
  let groom = 0;

  const addPortion = (portion: number, item: ExpenseItemRow | undefined) => {
    if (!item) return;
    if (item.side === 'bride') bride += portion;
    else if (item.side === 'groom') groom += portion;
    else {
      const bridePercentage = item.bride_share_percentage ?? 50;
      bride += portion * (bridePercentage / 100);
      groom += portion * ((100 - bridePercentage) / 100);
    }
  };

  if (allocationsForPayment.length > 0) {
    for (const allocation of allocationsForPayment) {
      addPortion(allocation.amount * multiplier, itemById.get(allocation.expense_item_id));
    }
    return { bride, groom };
  }

  const sharedItem = items.find((item) => item.side === 'shared');
  const amount = payment.amount * multiplier;
  if (sharedItem) {
    const bridePercentage = sharedItem.bride_share_percentage ?? 50;
    return {
      bride: amount * (bridePercentage / 100),
      groom: amount * ((100 - bridePercentage) / 100),
    };
  }

  return { bride: amount / 2, groom: amount / 2 };
}

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
  const target = new Date(dateStr);
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
    label: new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    style: { background: 'var(--bg-raised)', color: 'var(--ink-low)' },
  };
}

export default function Vendors() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilters, setPaymentFilters] = useState<VendorPaymentFilter[]>([]);
  const [logisticsFilters, setLogisticsFilters] = useState<VendorLogisticsFilter[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>(DEFAULT_FORM);
  const [editingVendor, setEditingVendor] = useState<VendorWithFinance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);

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
  const getVendorFormState = (vendor?: VendorWithFinance | null): VendorFormData => {
    if (!vendor) return DEFAULT_FORM;
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
      expense_date: vendor.finance?.expense_date ?? TODAY,
      side: firstItem?.side ?? 'shared',
      bride_share_percentage: firstItem?.bride_share_percentage ?? 50,
      needs_food: vendor.needs_food ?? false,
      needs_accommodation: vendor.needs_accommodation ?? false,
      team_size: String(teamSize > 0 ? teamSize : 1),
      team_member_names: teamMembers.map((member) => member.first_name ?? ''),
    };
  };
  const getVendorPaymentFormState = (vendor?: VendorWithFinance | null): PaymentFormState => {
    const firstItem = vendor ? getFirstFinanceItem(vendor) : null;
    return {
      ...DEFAULT_PAYMENT_FORM,
      paid_by_side: firstItem?.side ?? 'shared',
      paid_bride_share_percentage: firstItem?.bride_share_percentage ?? 50,
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
  const committedForPayment = editingVendor ? paymentOutstanding : Number(formData.total_cost || 0);
  const enteredAmount = Number(paymentForm.amount || 0);
  const paymentDirection = enteredAmount < 0 ? 'inflow' : 'outflow';
  const paymentMagnitude = Math.abs(enteredAmount);
  const isReversal = paymentDirection === 'inflow';
  const excessAmount = isReversal
    ? 0
    : Math.max(0, Number((paymentMagnitude - committedForPayment).toFixed(2)));
  const isScheduled = paymentForm.payment_date > TODAY;
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
    'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.3) 100%)',
    'linear-gradient(135deg, rgba(190,24,93,0.08) 0%, rgba(124,58,237,0.12) 100%)',
    'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(212,175,55,0.15) 100%)',
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
    setFormData(DEFAULT_FORM);
    setEditingVendor(null);
    setActiveTab(0);
    setPaymentForm(DEFAULT_PAYMENT_FORM);
  };

  const closeVendorModal = () => {
    setShowVendorModal(false);
    resetForm();
  };
  const isVendorModalDirty =
    JSON.stringify({ formData, paymentForm }) !==
    JSON.stringify({
      formData: getVendorFormState(editingVendor),
      paymentForm: getVendorPaymentFormState(editingVendor),
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

  const handleEdit = (vendor: VendorWithFinance) => {
    setEditingVendor(vendor);
    setFormData(getVendorFormState(vendor));
    setPaymentForm(getVendorPaymentFormState(vendor));
    setShowVendorModal(true);
  };

  const openPaymentsTab = (vendor: VendorWithFinance) => {
    handleEdit(vendor);
    setTimeout(() => setActiveTab(1), 50);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const teamRelevant = formData.needs_food || formData.needs_accommodation;
    const effectiveTeamSize = teamRelevant ? parseTeamSize(formData.team_size) : 0;
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
      needs_food: formData.needs_food,
      needs_accommodation: formData.needs_accommodation,
      team_size: effectiveTeamSize,
      team_member_names: teamRelevant ? formData.team_member_names.slice(0, effectiveTeamSize) : [],
    };

    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({ id: editingVendor.id, ...payload });
        toast.success('Vendor updated successfully.');
      } else {
        const savedVendor = await createMutation.mutateAsync(payload);
        toast.success('Vendor added successfully.');

        if (enteredAmount !== 0 && savedVendor?.id && savedVendor?.expense_id) {
          try {
            await createVendorPayment.mutateAsync({
              sourceId: savedVendor.id,
              amount: paymentMagnitude,
              direction: paymentDirection,
              status: isScheduled ? 'scheduled' : 'posted',
              due_date: paymentForm.payment_date,
              paid_date: isScheduled ? null : paymentForm.payment_date,
              payment_method: isScheduled ? null : paymentForm.payment_method,
              paid_by_side: paymentForm.paid_by_side,
              paid_bride_share_percentage:
                paymentForm.paid_by_side === 'shared'
                  ? paymentForm.paid_bride_share_percentage
                  : null,
              notes: paymentForm.notes || null,
            });
            toast.success(
              isScheduled
                ? isReversal
                  ? 'Planned reversal saved.'
                  : 'Planned payment saved.'
                : isReversal
                  ? 'Reversal recorded.'
                  : 'Payment recorded.',
            );
          } catch {
            toast.error(
              'Vendor saved but failed to record payment. You can add it from the Payments tab.',
            );
          }
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

  const handlePaymentSave = async () => {
    if (!editingVendor?.expense_id) {
      toast.error('Add the obligation amount first before recording payments.');
      return;
    }
    if (!enteredAmount) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (excessAmount > 0 && !paymentForm.extra_category_id) {
      toast.error('Select a category for the excess amount.');
      return;
    }

    try {
      await createVendorPayment.mutateAsync({
        sourceId: editingVendor.id,
        amount: paymentMagnitude,
        direction: paymentDirection,
        status: isScheduled ? 'scheduled' : 'posted',
        due_date: paymentForm.payment_date,
        paid_date: isScheduled ? null : paymentForm.payment_date,
        payment_method: isScheduled ? null : paymentForm.payment_method,
        paid_by_side: paymentForm.paid_by_side,
        paid_bride_share_percentage:
          paymentForm.paid_by_side === 'shared' ? paymentForm.paid_bride_share_percentage : null,
        notes: paymentForm.notes || null,
        new_items:
          excessAmount > 0 && paymentForm.extra_category_id
            ? [
                {
                  category_id: paymentForm.extra_category_id,
                  description: paymentForm.extra_description || 'Additional charge',
                  amount: excessAmount,
                  side: paymentForm.extra_side,
                  bride_share_percentage:
                    paymentForm.extra_side === 'shared'
                      ? paymentForm.extra_bride_share_percentage
                      : null,
                },
              ]
            : undefined,
      });
      toast.success(
        isScheduled
          ? isReversal
            ? 'Planned reversal saved.'
            : 'Planned payment saved.'
          : isReversal
            ? 'Reversal recorded.'
            : 'Payment recorded.',
      );
      setPaymentForm(getVendorPaymentFormState(editingVendor));
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to save payment.';
      toast.error(message);
    }
  };

  const handlePaymentDelete = async (paymentId: string) => {
    if (!editingVendor) return;
    try {
      await deleteVendorPayment.mutateAsync({ sourceId: editingVendor.id, paymentId });
      toast.success('Scheduled payment deleted.');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to delete payment.';
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
              className="input"
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
                                border: `1px solid ${checked ? 'rgba(212,175,55,0.35)' : 'var(--line-soft)'}`,
                                background: checked ? 'var(--gold-glow)' : 'var(--bg-raised)',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: 'var(--ink-high)',
                                textTransform: 'none',
                                letterSpacing: 'normal',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleSelection(
                                    cat.id,
                                    selectedCategoryIds,
                                    setSelectedCategoryIds,
                                  )
                                }
                                style={{
                                  accentColor: 'var(--gold)',
                                  pointerEvents: 'none',
                                  width: 14,
                                  height: 14,
                                  margin: 0,
                                  flexShrink: 0,
                                }}
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
                              border: `1px solid ${checked ? 'rgba(212,175,55,0.35)' : 'var(--line-soft)'}`,
                              background: checked ? 'var(--gold-glow)' : 'var(--bg-raised)',
                              cursor: 'pointer',
                              fontSize: 12,
                              color: 'var(--ink-high)',
                              textTransform: 'none',
                              letterSpacing: 'normal',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSelection(option.id, paymentFilters, setPaymentFilters)
                              }
                              style={{
                                accentColor: 'var(--gold)',
                                pointerEvents: 'none',
                                width: 14,
                                height: 14,
                                margin: 0,
                                flexShrink: 0,
                              }}
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
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSelection(option.id, logisticsFilters, setLogisticsFilters)
                              }
                              style={{
                                accentColor: '#0f766e',
                                pointerEvents: 'none',
                                width: 14,
                                height: 14,
                                margin: 0,
                                flexShrink: 0,
                              }}
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

      {vendors.length > 0 ? (
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
                              border: '1px solid rgba(212,175,55,0.25)',
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
                          el.style.borderColor = 'rgba(212,175,55,0.5)';
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

                  {committed > 0 && (
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
                              border: '1px solid rgba(212,175,55,0.2)',
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
                            border: '1px solid rgba(212,175,55,0.25)',
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
                            border: '1px solid rgba(212,175,55,0.25)',
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
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>
            {hasActiveFilters ? 'No vendors match the current filters.' : 'No vendors found.'}
          </p>
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
        <Portal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 16,
            }}
            onClick={attemptCloseVendorModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: 900,
                height: 'min(88vh, 760px)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  padding: '14px 24px 16px',
                  borderBottom: '1px solid var(--line-soft)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div className="uppercase-eyebrow">
                    Service providers · {editingVendor ? 'Edit vendor' : 'Add vendor'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {!canRecordPayment && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          background: 'rgba(217,119,6,0.07)',
                          border: '1px solid rgba(217,119,6,0.2)',
                          borderRadius: 100,
                        }}
                      >
                        <HiOutlineInformationCircle
                          style={{ width: 13, height: 13, color: 'var(--warn)', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--warn)', whiteSpace: 'nowrap' }}>
                          Set a committed amount to record payments
                        </span>
                      </div>
                    )}
                    {canRecordPayment && editingVendor && (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--ok)', whiteSpace: 'nowrap' }}>
                          Paid: <strong>{formatCurrency(paymentPaid)}</strong>
                        </span>
                        {paymentOutstanding > 0 && (
                          <span
                            style={{ fontSize: 12, color: 'var(--warn)', whiteSpace: 'nowrap' }}
                          >
                            Outstanding: <strong>{formatCurrency(paymentOutstanding)}</strong>
                          </span>
                        )}
                      </>
                    )}
                    <button
                      onClick={attemptCloseVendorModal}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        color: 'var(--ink-dim)',
                        background: 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <HiOutlineX style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    columnGap: 16,
                    alignItems: 'end',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <label className="label">Vendor Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="input"
                      placeholder="Vendor name"
                      required
                      form="vendor-form"
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
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
                      form="vendor-form"
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--line-soft)',
                  padding: '0 24px',
                  flexShrink: 0,
                }}
              >
                {[
                  { id: 0, label: 'Details' },
                  { id: 1, label: 'Payments' },
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

              <form
                id="vendor-form"
                onSubmit={handleSubmit}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {activeTab === 0 && (
                    <div
                      style={{
                        height: '100%',
                        overflowY: 'auto',
                        padding: 24,
                        display: 'grid',
                        gridTemplateColumns: '1fr 320px',
                        gap: 24,
                        alignContent: 'start',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--ink-dim)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Vendor details
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="label">Category *</label>
                            <CategoryCombobox
                              value={formData.category_id}
                              onChange={(id) =>
                                setFormData((prev) => ({ ...prev, category_id: id }))
                              }
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                padding: 14,
                                border: '1px solid var(--line-soft)',
                                borderRadius: 8,
                                background: 'var(--bg-raised)',
                              }}
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
                                <div className="uppercase-eyebrow">Team logistics</div>
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
                                    <input
                                      type="checkbox"
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
                                    <input
                                      type="checkbox"
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
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--ink-dim)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Financial details
                        </p>

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

                        <div>
                          <label className="label">Liability Side</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(['bride', 'groom', 'shared'] as const).map((side) => {
                              const isActive = formData.side === side;
                              const activeColors =
                                side === 'bride'
                                  ? {
                                      border: '#be185d',
                                      bg: 'rgba(190,24,93,0.08)',
                                      color: '#be185d',
                                    }
                                  : side === 'groom'
                                    ? {
                                        border: '#1d4ed8',
                                        bg: 'rgba(29,78,216,0.08)',
                                        color: '#1d4ed8',
                                      }
                                    : {
                                        border: 'var(--gold)',
                                        bg: 'var(--gold-glow)',
                                        color: 'var(--gold-deep)',
                                      };
                              return (
                                <button
                                  key={side}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, side }))}
                                  style={{
                                    flex: 1,
                                    padding: '6px 4px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    border: `2px solid ${isActive ? activeColors.border : 'var(--line)'}`,
                                    background: isActive ? activeColors.bg : 'transparent',
                                    color: isActive ? activeColors.color : 'var(--ink-mid)',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 500 : 400,
                                  }}
                                >
                                  {side === 'shared'
                                    ? 'Shared'
                                    : side.charAt(0).toUpperCase() + side.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {formData.side === 'shared' && (
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

                        {editingVendor && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: 14,
                              background: 'var(--bg-raised)',
                              borderRadius: 10,
                              border: '1px solid var(--line-soft)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'var(--ink-dim)',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Payment Summary
                            </p>
                            <div
                              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                            >
                              <div>
                                <div
                                  style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}
                                >
                                  Committed
                                </div>
                                <div
                                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)' }}
                                >
                                  {formatCurrency(paymentCommitted)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}
                                >
                                  Paid
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                                  {formatCurrency(paymentPaid)}
                                </div>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div
                                  style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 2 }}
                                >
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
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div
                      style={{
                        height: '100%',
                        display: 'grid',
                        gridTemplateColumns: editingVendor ? '1fr 340px' : '1fr',
                        overflow: 'hidden',
                      }}
                    >
                      {editingVendor && (
                        <div
                          style={{
                            overflowY: 'auto',
                            padding: 24,
                            borderRight: '1px solid var(--line-soft)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--ink-dim)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Payment History
                          </p>
                          {sortedPayments.length === 0 ? (
                            <div
                              style={{
                                border: '1.5px dashed var(--line)',
                                borderRadius: 10,
                                padding: '24px 20px',
                                fontSize: 13,
                                color: 'var(--ink-dim)',
                                textAlign: 'center',
                              }}
                            >
                              No payments recorded yet.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {sortedPayments.map((payment) => {
                                const dateLabel =
                                  payment.paid_date ?? payment.due_date ?? payment.created_at;
                                const isDeleteAllowed = payment.status === 'scheduled';
                                const isInflow = payment.direction === 'inflow';
                                const amountColor = isInflow
                                  ? '#0369a1'
                                  : payment.status === 'posted'
                                    ? 'var(--ok)'
                                    : 'var(--gold-deep)';
                                const sideShares = sharedPaymentSideAmounts(
                                  payment,
                                  currentVendorFinance?.items ?? [],
                                  currentVendorFinance?.allocations ?? [],
                                );

                                return (
                                  <div
                                    key={payment.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      justifyContent: 'space-between',
                                      gap: 12,
                                      border: '1px solid var(--line-soft)',
                                      borderRadius: 10,
                                      padding: '10px 14px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          alignItems: 'center',
                                          gap: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 14,
                                            color: amountColor,
                                          }}
                                        >
                                          {formatPaymentAmount(payment.amount, payment.direction)}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            padding: '2px 7px',
                                            borderRadius: 100,
                                            background: 'var(--bg-raised)',
                                            color: 'var(--ink-low)',
                                            textTransform: 'capitalize',
                                          }}
                                        >
                                          {payment.status.replaceAll('_', ' ')}
                                        </span>
                                        {payment.paid_by_side && (
                                          <span
                                            style={{
                                              fontSize: 10,
                                              padding: '2px 7px',
                                              borderRadius: 100,
                                              background: 'var(--bg-raised)',
                                              color: 'var(--ink-low)',
                                              textTransform: 'capitalize',
                                            }}
                                          >
                                            {payment.paid_by_side}
                                          </span>
                                        )}
                                      </div>
                                      {sideShares && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: 'var(--ink-low)',
                                            lineHeight: 1.35,
                                          }}
                                        >
                                          Bride {formatCurrency(sideShares.bride)} · Groom{' '}
                                          {formatCurrency(sideShares.groom)}
                                        </div>
                                      )}
                                      <div
                                        className="mono"
                                        style={{ fontSize: 11, color: 'var(--ink-dim)' }}
                                      >
                                        {new Date(dateLabel).toLocaleDateString('en-IN')}
                                        {payment.payment_method &&
                                          ` · ${PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
                                        {payment.notes ? ` · ${payment.notes}` : ''}
                                      </div>
                                    </div>
                                    {isDeleteAllowed && (
                                      <button
                                        onClick={() => handlePaymentDelete(payment.id)}
                                        disabled={deleteVendorPayment.isPending}
                                        style={{
                                          padding: '6px 8px',
                                          borderRadius: 6,
                                          color: 'var(--err)',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          flexShrink: 0,
                                          opacity: deleteVendorPayment.isPending ? 0.5 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                          (e.currentTarget as HTMLElement).style.background =
                                            'rgba(220,38,38,0.08)';
                                        }}
                                        onMouseLeave={(e) => {
                                          (e.currentTarget as HTMLElement).style.background =
                                            'transparent';
                                        }}
                                      >
                                        <HiOutlineTrash style={{ width: 15, height: 15 }} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          overflowY: 'auto',
                          padding: 24,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 14,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--ink-dim)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {editingVendor
                            ? isScheduled
                              ? 'Schedule Payment'
                              : 'Record Payment'
                            : 'Initial Payment (Optional)'}
                        </p>

                        {!editingVendor && (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-low)' }}>
                            Optionally record a token or advance payment alongside the vendor. Leave
                            blank to skip.
                          </p>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="label">Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) =>
                                setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                              }
                              className="input"
                              placeholder="Enter amount"
                            />
                          </div>
                          <div>
                            <label className="label">
                              {isScheduled ? 'Due Date' : 'Payment Date'}
                            </label>
                            <DatePicker
                              value={paymentForm.payment_date}
                              onChange={(value) =>
                                setPaymentForm((prev) => ({ ...prev, payment_date: value }))
                              }
                              placeholder={isScheduled ? 'Due date' : 'Payment date'}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="label">Method</label>
                            <select
                              value={paymentForm.payment_method}
                              onChange={(e) =>
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  payment_method: e.target.value,
                                }))
                              }
                              className="input"
                              disabled={isScheduled}
                            >
                              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Paid By</label>
                            <select
                              value={paymentForm.paid_by_side}
                              onChange={(e) =>
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  paid_by_side: e.target.value as 'bride' | 'groom' | 'shared',
                                }))
                              }
                              className="input"
                            >
                              <option value="bride">Bride</option>
                              <option value="groom">Groom</option>
                              <option value="shared">Shared</option>
                            </select>
                          </div>
                        </div>

                        {paymentForm.paid_by_side === 'shared' && (
                          <SplitShare
                            total={paymentMagnitude}
                            bridePercentage={paymentForm.paid_bride_share_percentage}
                            onChange={(percentage) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                paid_bride_share_percentage: percentage,
                              }))
                            }
                          />
                        )}

                        <div>
                          <label className="label">Notes</label>
                          <textarea
                            value={paymentForm.notes}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            className="input"
                            style={{ minHeight: 60 }}
                            placeholder={
                              isScheduled
                                ? 'Optional reminder note'
                                : 'Reference, cheque no., or note'
                            }
                          />
                        </div>

                        {isScheduled && (
                          <div
                            style={{
                              border: '1px solid rgba(217,119,6,0.25)',
                              background: 'rgba(217,119,6,0.06)',
                              borderRadius: 8,
                              padding: '10px 14px',
                              fontSize: 12,
                              color: 'var(--warn)',
                            }}
                          >
                            Future date — will be saved as a scheduled reminder.
                          </div>
                        )}

                        {isReversal && (
                          <div
                            style={{
                              border: '1px solid rgba(3,105,161,0.22)',
                              background: 'rgba(3,105,161,0.06)',
                              borderRadius: 8,
                              padding: '10px 14px',
                              fontSize: 12,
                              color: '#0c4a6e',
                            }}
                          >
                            Negative amounts are recorded as payment reversals and reduce the paid
                            total.
                          </div>
                        )}

                        {editingVendor && excessAmount > 0 && (
                          <div
                            style={{
                              border: '1px solid rgba(234,88,12,0.25)',
                              background: 'rgba(234,88,12,0.05)',
                              borderRadius: 8,
                              padding: 14,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                            }}
                          >
                            <div style={{ fontSize: 12, color: '#9a3412' }}>
                              {formatCurrency(excessAmount)} over outstanding — classify the extra
                              amount.
                            </div>
                            <div>
                              <label className="label">Category</label>
                              <CategoryCombobox
                                value={paymentForm.extra_category_id}
                                onChange={(id) =>
                                  setPaymentForm((prev) => ({ ...prev, extra_category_id: id }))
                                }
                                level="subcategory"
                                placeholder="Select category"
                              />
                            </div>
                            <div
                              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                            >
                              <div>
                                <label className="label">Label</label>
                                <input
                                  type="text"
                                  value={paymentForm.extra_description}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      extra_description: e.target.value,
                                    }))
                                  }
                                  className="input"
                                  placeholder="Tip, late fee…"
                                />
                              </div>
                              <div>
                                <label className="label">Side</label>
                                <select
                                  value={paymentForm.extra_side}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      extra_side: e.target.value as 'bride' | 'groom' | 'shared',
                                    }))
                                  }
                                  className="input"
                                >
                                  <option value="bride">Bride</option>
                                  <option value="groom">Groom</option>
                                  <option value="shared">Shared</option>
                                </select>
                              </div>
                            </div>
                            {paymentForm.extra_side === 'shared' && (
                              <SplitShare
                                total={excessAmount}
                                bridePercentage={paymentForm.extra_bride_share_percentage}
                                onChange={(percentage) =>
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    extra_bride_share_percentage: percentage,
                                  }))
                                }
                              />
                            )}
                          </div>
                        )}

                        {editingVendor && (
                          <button
                            type="button"
                            onClick={handlePaymentSave}
                            disabled={createVendorPayment.isPending || !editingVendor.expense_id}
                            className="btn-primary"
                            style={{
                              opacity:
                                createVendorPayment.isPending || !editingVendor.expense_id
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {createVendorPayment.isPending
                              ? 'Saving…'
                              : isScheduled
                                ? 'Save Planned Payment'
                                : 'Record Payment'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '14px 24px',
                    borderTop: '1px solid var(--line-soft)',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={attemptCloseVendorModal}
                    className="btn-outline"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving…'
                      : editingVendor
                        ? 'Update vendor'
                        : enteredAmount !== 0
                          ? 'Add vendor & record payment'
                          : 'Add vendor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      {vendorUnsavedDialog}

      {deleteConfirm && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 16,
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                maxWidth: 380,
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <h3
                className="display"
                style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}
              >
                Delete vendor?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 24 }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '9px 16px',
                    background: 'var(--err)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: deleteMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
