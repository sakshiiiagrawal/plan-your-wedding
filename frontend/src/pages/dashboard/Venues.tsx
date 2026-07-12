/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineCurrencyRupee,
  HiOutlineX,
  HiOutlinePencilAlt,
  HiOutlineCalendar,
  HiOutlineHome,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineMap,
  HiOutlineTrash,
  HiOutlineInformationCircle,
  HiOutlineDotsVertical,
} from 'react-icons/hi';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableItem from '../../components/SortableItem';
import { SectionHeader, Checkbox } from '../../components/ui';
import SplitShare from '../../components/ui/SplitShare';
import AddressAutocomplete, { buildMapsUrl } from '../../components/AddressAutocomplete';
import {
  useVenuesPageData,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  useReorderVenues,
  useAccommodationRooms,
  useDeleteRoom,
  useSourcePayments,
  useCreateSourcePayment,
  useDeleteSourcePayment,
  useUpdateExpensePayment,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import CategoryCombobox from '../../components/CategoryCombobox';
import DatePicker from '../../components/ui/DatePicker';
import DateRangePicker from '../../components/ui/DateRangePicker';
import PaymentTimelinePanel from '../../components/finance/PaymentTimelinePanel';
import InstallmentsEditor, {
  installmentToPaymentPayload,
  type InstallmentFormRow,
} from '../../components/finance/InstallmentsEditor';
import type { VenueWithFinance } from '@wedding-planner/shared';
import { financeTier } from '@wedding-planner/shared';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { parseLocalDate, todayLocal } from '../../utils/date';
import { currencySymbol, formatCurrency } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';

/** Bride / groom amounts for a payment marked paid_by shared, from allocations + line-item sides. */
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

const PRESET_BY_LABEL: Record<string, { capacity: number; prefix: string }> = Object.fromEntries(
  PRESET_ROOM_TYPES.map((t) => [t.label, { capacity: t.capacity, prefix: t.prefix }]),
);

const formatPaymentAmount = (amount: number, direction: 'outflow' | 'inflow') =>
  `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;

interface RoomCategoryEntry {
  room_type: string;
  is_custom: boolean;
  count: number | string;
  capacity: number | string;
  rate_per_night: number | string;
  includes_breakfast: boolean;
  check_in_date: string;
  check_out_date: string;
}

const DEFAULT_CATEGORY: RoomCategoryEntry = {
  room_type: 'Standard Room',
  is_custom: false,
  count: '',
  capacity: 2,
  rate_per_night: '',
  includes_breakfast: false,
  check_in_date: '',
  check_out_date: '',
};

interface VenueFormData {
  name: string;
  venue_type: string;
  address: string;
  city: string;
  capacity: number | string;
  total_cost: number | string;
  expense_date: string;
  side: 'bride' | 'groom' | 'shared';
  bride_share_percentage: number;
  has_accommodation: boolean;
  contact_person: string;
  contact_phone: string;
  notes: string;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  default_check_in_date: string;
  default_check_out_date: string;
}

const createDefaultForm = (): VenueFormData => ({
  name: '',
  venue_type: 'wedding_hall',
  address: '',
  city: '',
  capacity: '',
  total_cost: '',
  expense_date: todayLocal(),
  side: 'shared',
  bride_share_percentage: 50,
  has_accommodation: false,
  contact_person: '',
  contact_phone: '',
  notes: '',
  place_id: null,
  latitude: null,
  longitude: null,
  photo_url: null,
  default_check_in_date: '',
  default_check_out_date: '',
});

function VenueRoomsSection({ rooms = [] }: { rooms?: any[] }) {
  const [expanded, setExpanded] = useState(false);

  const groupedByDay = useMemo(() => {
    // (check_in|check_out|type) → count, rate, capacity, breakfast. Then cluster by check-in and sort by date.
    const map: Record<
      string,
      {
        type: string;
        count: number;
        capacity: number | null;
        rate: number | null;
        includes_breakfast: boolean;
        check_in: string | null;
        check_out: string | null;
      }
    > = {};
    (rooms as any[]).forEach((r: any) => {
      const key = `${r.check_in_date ?? ''}|${r.check_out_date ?? ''}|${r.room_type}`;
      if (!map[key])
        map[key] = {
          type: r.room_type,
          count: 0,
          capacity: r.capacity ?? null,
          rate: r.rate_per_night ?? null,
          includes_breakfast: r.includes_breakfast ?? false,
          check_in: r.check_in_date ?? null,
          check_out: r.check_out_date ?? null,
        };
      map[key].count++;
    });
    const entries = Object.values(map).sort((a, b) => {
      const ad = a.check_in ?? '9999-12-31';
      const bd = b.check_in ?? '9999-12-31';
      return ad.localeCompare(bd);
    });
    const byDay: { day: string | null; groups: typeof entries }[] = [];
    entries.forEach((g) => {
      const last = byDay[byDay.length - 1];
      if (last && last.day === g.check_in) last.groups.push(g);
      else byDay.push({ day: g.check_in, groups: [g] });
    });
    return byDay;
  }, [rooms]);

  const totalRooms = (rooms as any[]).length;

  if (totalRooms === 0)
    return (
      <p style={{ fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>
        No rooms added yet.
      </p>
    );

  const fmtShortDate = (d: string | null) =>
    d ? parseLocalDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groupedByDay.map(({ day, groups }) => (
          <div key={day ?? '__none__'} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-dim)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {day ? `Check-in ${fmtShortDate(day)}` : 'No check-in date'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map((info, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    rowGap: 4,
                    gap: 4,
                    maxWidth: '100%',
                    padding: '2px 8px',
                    borderRadius: 100,
                    background: 'var(--gold-glow)',
                    color: 'var(--gold-deep)',
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    border: '1px solid rgba(176,141,62,0.25)',
                  }}
                >
                  {info.type}
                  <span
                    style={{
                      background: 'var(--gold)',
                      color: 'white',
                      borderRadius: 100,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {info.count}
                  </span>
                  {info.check_out && (
                    <span style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
                      → {fmtShortDate(info.check_out)}
                    </span>
                  )}
                  {info.includes_breakfast && (
                    <span
                      style={{
                        fontSize: 9,
                        background: 'rgba(22,163,74,0.12)',
                        color: '#15803d',
                        borderRadius: 100,
                        padding: '0 5px',
                        fontWeight: 600,
                        border: '1px solid rgba(22,163,74,0.25)',
                      }}
                    >
                      Breakfast
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
          {totalRooms} room{totalRooms !== 1 ? 's' : ''} total
        </p>
        <button
          onClick={() => setExpanded((p) => !p)}
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
          {expanded ? (
            <>
              <HiOutlineChevronUp style={{ width: 12, height: 12 }} /> Collapse
            </>
          ) : (
            <>
              <HiOutlineChevronDown style={{ width: 12, height: 12 }} /> View details
            </>
          )}
        </button>
      </div>
      {expanded && (
        <div
          className="print-expand"
          style={{
            borderRadius: 8,
            border: '1px solid var(--line-soft)',
            overflow: 'auto',
            marginTop: 4,
            maxHeight: 320,
          }}
        >
          <table className="tbl" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Occ.</th>
                <th style={{ textAlign: 'right' }}>Rate / night</th>
                <th style={{ textAlign: 'center' }}>Breakfast</th>
                <th style={{ textAlign: 'center' }}>Check-in</th>
                <th style={{ textAlign: 'center' }}>Check-out</th>
              </tr>
            </thead>
            <tbody>
              {[...(rooms as any[])]
                .sort((a, b) =>
                  (a.check_in_date ?? '9999-12-31').localeCompare(b.check_in_date ?? '9999-12-31'),
                )
                .map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono strong">{r.room_number}</td>
                    <td>{r.room_type}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.capacity ?? <span className="ink-dim">—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.rate_per_night ? (
                        formatCurrency(r.rate_per_night)
                      ) : (
                        <span className="ink-dim">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.includes_breakfast ? (
                        <span
                          style={{
                            fontSize: 10,
                            background: 'rgba(22,163,74,0.12)',
                            color: '#15803d',
                            borderRadius: 100,
                            padding: '1px 7px',
                            fontWeight: 600,
                          }}
                        >
                          Yes
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.check_in_date ? (
                        fmtShortDate(r.check_in_date)
                      ) : (
                        <span className="ink-dim">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.check_out_date ? (
                        fmtShortDate(r.check_out_date)
                      ) : (
                        <span className="ink-dim">—</span>
                      )}
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
  const { user } = useAuth();
  const tier = financeTier(user);
  const canSeeMoney = tier !== 'none';
  const canSeeSplits = tier === 'full';

  const [showVenueModal, setShowVenueModal] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>(createDefaultForm);
  const [editingVenue, setEditingVenue] = useState<VenueWithFinance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [installments, setInstallments] = useState<InstallmentFormRow[]>([]);

  const { data: pageData, isLoading, error } = useVenuesPageData();
  const venues = pageData?.venues ?? [];
  const roomsByVenue = pageData?.roomsByVenue ?? {};
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();
  const reorderMutation = useReorderVenues();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleVenueDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = venues.map((v) => v.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderMutation.mutate(arrayMove(ids, oldIndex, newIndex));
  };
  const { data: existingRooms = [] } = useAccommodationRooms(editingVenue?.id);
  const deleteRoomMutation = useDeleteRoom();
  const { data: venuePayments = [] } = useSourcePayments('venue', editingVenue?.id ?? '');

  const currentVenueFinance = useMemo(() => {
    if (!editingVenue) return null;
    const fresh = venues.find((v) => v.id === editingVenue.id);
    return fresh?.finance ?? editingVenue.finance;
  }, [editingVenue, venues]);
  const currentVenueSummary = useMemo(() => {
    if (!editingVenue) return null;
    const fresh = venues.find((v) => v.id === editingVenue.id);
    return fresh?.finance_summary ?? editingVenue.finance_summary;
  }, [editingVenue, venues]);
  const createVenuePayment = useCreateSourcePayment('venue');
  const deleteVenuePayment = useDeleteSourcePayment('venue');
  const updateExpensePayment = useUpdateExpensePayment();
  const getVenueFormState = (venue?: VenueWithFinance | null): VenueFormData => {
    if (!venue) return createDefaultForm();
    const firstItem = venue.finance?.items?.[0];
    return {
      name: venue.name || '',
      venue_type: venue.venue_type || 'wedding_hall',
      address: venue.address || '',
      city: venue.city || '',
      capacity: venue.capacity || '',
      total_cost: venue.finance_summary?.committed_amount || '',
      expense_date: venue.finance?.expense_date || todayLocal(),
      side: firstItem?.side || 'shared',
      bride_share_percentage: firstItem?.bride_share_percentage ?? 50,
      has_accommodation: venue.has_accommodation ?? false,
      contact_person: venue.contact_person || '',
      contact_phone: venue.contact_phone || '',
      notes: (venue as any).notes || '',
      place_id: (venue as any).place_id ?? null,
      latitude: (venue as any).latitude ?? null,
      longitude: (venue as any).longitude ?? null,
      photo_url: (venue as any).photo_url ?? null,
      default_check_in_date: venue.default_check_in_date || '',
      default_check_out_date: venue.default_check_out_date || '',
    };
  };
  const sortedPayments = useMemo(
    () =>
      [...(venuePayments as any[])].sort((a: any, b: any) => {
        const aDate = a.paid_date ?? a.due_date ?? a.created_at;
        const bDate = b.paid_date ?? b.due_date ?? b.created_at;
        return bDate.localeCompare(aDate);
      }),
    [venuePayments],
  );

  const paymentCommitted = currentVenueSummary?.committed_amount ?? 0;
  const paymentPaid = currentVenueSummary?.paid_amount ?? 0;
  const paymentOutstanding = currentVenueSummary?.outstanding_amount ?? 0;

  // Only show Rooms tab when venue has accommodation; Payments tab needs money visibility
  const visibleTabs = useMemo(() => {
    const tabs = [{ id: 0, label: 'Details' }];
    if (formData.has_accommodation) tabs.push({ id: 1, label: 'Rooms' });
    if (canSeeMoney) tabs.push({ id: 2, label: 'Payments' });
    return tabs;
  }, [formData.has_accommodation, canSeeMoney]);

  // Whether payment can be recorded right now
  const canRecordPayment = editingVenue
    ? !!editingVenue.expense_id
    : Number(formData.total_cost || 0) > 0;

  const resetForm = () => {
    setFormData(createDefaultForm());
    setEditingVenue(null);
    setRoomCategories([]);
    setActiveTab(0);
    setInstallments([]);
  };
  const closeVenueModal = () => {
    setShowVenueModal(false);
    resetForm();
  };
  const isVenueModalDirty =
    JSON.stringify({ formData, roomCategories, installments }) !==
    JSON.stringify({
      formData: getVenueFormState(editingVenue),
      roomCategories: [],
      installments: [],
    });
  const { attemptClose: attemptCloseVenueModal, dialog: venueUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isVenueModalDirty,
      onDiscard: closeVenueModal,
      onSave: () => {
        (document.getElementById('venue-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving:
        createMutation.isPending || updateMutation.isPending || createVenuePayment.isPending,
    });
  useModalDismiss(showVenueModal, attemptCloseVenueModal);

  const handleEdit = (venue: VenueWithFinance) => {
    setEditingVenue(venue);
    setFormData(getVenueFormState(venue));
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
      includes_breakfast?: boolean;
      check_in_date?: string | null;
      check_out_date?: string | null;
    }> = [];
    const runningCountByType: Record<string, number> = { ...existingCountByType };
    const sortedEntries = [...validCategories].sort((a, b) => {
      const ad = a.check_in_date || '9999-12-31';
      const bd = b.check_in_date || '9999-12-31';
      return ad.localeCompare(bd);
    });
    for (const entry of sortedEntries) {
      const preset = PRESET_BY_LABEL[entry.room_type];
      const prefix = preset?.prefix ?? entry.room_type.slice(0, 4).toUpperCase().replace(/\s/g, '');
      const startIdx = (runningCountByType[entry.room_type] || 0) + 1;
      const count = Number(entry.count);
      for (let i = 0; i < count; i++) {
        rooms.push({
          room_number: `${prefix}-${startIdx + i}`,
          room_type: entry.room_type,
          ...(entry.capacity !== '' && { capacity: Number(entry.capacity) }),
          ...(entry.rate_per_night !== '' && { rate_per_night: Number(entry.rate_per_night) }),
          includes_breakfast: entry.includes_breakfast,
          check_in_date: entry.check_in_date || null,
          check_out_date: entry.check_out_date || null,
        });
      }
      runningCountByType[entry.room_type] = startIdx - 1 + count;
    }
    return rooms;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending || updateMutation.isPending) return;

    // D7: installments need an obligation, which only exists with a total cost.
    if (!editingVenue) {
      const hasInstallments = installments.some((row) => Number(row.amount || 0) !== 0);
      if (hasInstallments && !(Number(formData.total_cost || 0) > 0)) {
        toast.error('Enter the total cost before adding installments.');
        setActiveTab(2);
        return;
      }
    }

    const rooms = buildRoomsPayload();
    const { side: _side, bride_share_percentage: _bsp, ...restFormData } = formData;
    const payload = {
      ...restFormData,
      capacity: formData.capacity === '' ? null : Number(formData.capacity),
      ...(canSeeMoney ? { total_cost: formData.total_cost === '' ? 0 : Number(formData.total_cost) } : {}),
      ...(canSeeSplits ? { side: formData.side, bride_share_percentage: formData.bride_share_percentage } : {}),
    };
    try {
      let savedVenue: any;
      if (editingVenue) {
        savedVenue = await updateMutation.mutateAsync({ id: editingVenue.id, ...payload, rooms });
        toast.success('Venue updated successfully!');
      } else {
        savedVenue = await createMutation.mutateAsync({ ...payload, rooms });
        toast.success('Venue added successfully!');
      }

      // Record initial installments if any were filled on the Payments tab
      const rowsToRecord = installments.filter((row) => Number(row.amount || 0) !== 0);
      if (rowsToRecord.length > 0 && savedVenue?.id && savedVenue?.expense_id) {
        try {
          for (const row of rowsToRecord) {
            await createVenuePayment.mutateAsync({
              sourceId: savedVenue.id,
              ...installmentToPaymentPayload(row, canSeeSplits),
            });
          }
          toast.success(rowsToRecord.length > 1 ? 'Installments recorded.' : 'Payment recorded.');
        } catch {
          toast.error(
            'Venue saved but failed to record all payments. You can add the rest from the Payments tab.',
          );
        }
      } else if (rowsToRecord.length > 0 && !savedVenue?.expense_id) {
        toast.error(
          'Venue saved, but the payments could not be attached. Open the venue and add them from the Payments tab.',
        );
      }

      closeVenueModal();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save venue',
      );
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

  if (isLoading) {
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

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--err)', fontSize: 13 }}>
        Error loading venues: {(error as any).message}
      </div>
    );
  }

  const HEADER_GRADIENTS = [
    'linear-gradient(135deg, rgba(176,141,62,0.15) 0%, rgba(176,141,62,0.3) 100%)',
    'linear-gradient(135deg, rgba(190,24,93,0.08) 0%, rgba(124,58,237,0.12) 100%)',
    'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(176,141,62,0.15) 100%)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Locations"
        title="Venues"
        action={
          <button
            onClick={() => setShowVenueModal(true)}
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            Add venue
          </button>
        }
      />

      {venues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>
            No venues yet — add your first venue.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleVenueDragEnd}
        >
          <SortableContext items={venues.map((v) => v.id)} strategy={rectSortingStrategy}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {venues.map((venue, venueIndex) => {
            const v = venue as VenueWithFinance & { events?: Array<{ id: string; name: string }> };
            const venueTypeLabel = v.venue_type?.replace(/_/g, ' ') ?? '';
            const fullAddress = [v.address, v.city].filter(Boolean).join(', ');
            const mapsUrl = buildMapsUrl({
              place_id: (v as any).place_id,
              latitude: (v as any).latitude,
              longitude: (v as any).longitude,
              address: fullAddress,
            });
            const hasContact = v.contact_person || v.contact_phone;
            const hasRooms = v.has_accommodation;
            const hasEvents = v.events && v.events.length > 0;
            const committed = v.finance_summary?.committed_amount ?? 0;
            const paid = v.finance_summary?.paid_amount ?? 0;
            const outstanding = v.finance_summary?.outstanding_amount ?? 0;
            const plannedPayments =
              v.finance?.payments?.filter((p) => p.status === 'scheduled') ?? [];

            return (
              <SortableItem id={venue.id} key={venue.id}>
                {({ handleProps }) => (
              <div
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div style={{ height: 4, background: HEADER_GRADIENTS[venueIndex % 3] }} />

                <div
                  style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    {(v as any).photo_url && (
                      <img
                        src={(v as any).photo_url}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid var(--line)',
                        }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3
                        className="display"
                        onClick={() => handleEdit(venue)}
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
                        {venue.name}
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
                        {venueTypeLabel && (
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--ink-low)',
                              textTransform: 'capitalize',
                              fontWeight: 500,
                              letterSpacing: 0.3,
                            }}
                          >
                            {venueTypeLabel}
                          </span>
                        )}
                        {v.city && (
                          <span style={{ fontSize: 10, color: 'var(--ink-dim)' }}>· {v.city}</span>
                        )}
                        {hasRooms && (
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
                            Rooms
                          </span>
                        )}
                        {v.finance?.items?.[0]?.side && (
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
                            {v.finance.items[0].side}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button
                        {...handleProps}
                        type="button"
                        style={{
                          ...(handleProps.style as object),
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          color: 'var(--ink-dim)',
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Drag to reorder venue"
                      >
                        <HiOutlineDotsVertical style={{ width: 14, height: 14 }} />
                      </button>
                      {v.contact_phone && (
                        <a
                          href={`tel:${v.contact_phone}`}
                          title={`Call ${v.contact_person || 'venue'}`}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid var(--line)',
                            color: 'var(--ink-dim)',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(22,163,74,0.08)';
                            el.style.borderColor = 'rgba(22,163,74,0.4)';
                            el.style.color = '#16a34a';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'transparent';
                            el.style.borderColor = 'var(--line)';
                            el.style.color = 'var(--ink-dim)';
                          }}
                        >
                          <HiOutlinePhone style={{ width: 14, height: 14 }} />
                        </a>
                      )}
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Get directions"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid var(--line)',
                            color: 'var(--ink-dim)',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(29,78,216,0.08)';
                            el.style.borderColor = 'rgba(29,78,216,0.4)';
                            el.style.color = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'transparent';
                            el.style.borderColor = 'var(--line)';
                            el.style.color = 'var(--ink-dim)';
                          }}
                        >
                          <HiOutlineMap style={{ width: 14, height: 14 }} />
                        </a>
                      )}
                      <button
                        onClick={() => handleEdit(venue)}
                        title="Edit venue"
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
                        <HiOutlinePencilAlt style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${canSeeMoney ? 4 : 1}, 1fr)`,
                      gap: 6,
                      padding: '7px 10px',
                      background: 'var(--bg-raised)',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div className="uppercase-eyebrow" style={{ marginBottom: 2, fontSize: 9 }}>
                        Cap
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-high)', fontWeight: 500 }}>
                        {v.capacity && Number(v.capacity) > 0 ? (
                          v.capacity
                        ) : (
                          <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>—</span>
                        )}
                      </div>
                    </div>
                    {canSeeMoney && (
                      <>
                        <div>
                          <div
                            className="uppercase-eyebrow"
                            style={{ marginBottom: 2, fontSize: 9 }}
                          >
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
                          <div
                            className="uppercase-eyebrow"
                            style={{ marginBottom: 2, fontSize: 9 }}
                          >
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
                          <div
                            className="uppercase-eyebrow"
                            style={{ marginBottom: 2, fontSize: 9 }}
                          >
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
                      </>
                    )}
                  </div>

                  {(plannedPayments.length > 0 || hasContact) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {hasContact && (
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
                            {v.contact_person && (
                              <span style={{ color: 'var(--ink-mid)' }}>{v.contact_person}</span>
                            )}
                            {v.contact_person && v.contact_phone && (
                              <span style={{ color: 'var(--ink-dim)' }}> · </span>
                            )}
                            {v.contact_phone && (
                              <a
                                href={`tel:${v.contact_phone}`}
                                style={{
                                  color: 'var(--gold-deep)',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                }}
                              >
                                {v.contact_phone}
                              </a>
                            )}
                          </span>
                        </div>
                      )}
                      {plannedPayments.slice(0, 2).map((payment) => (
                        <div
                          key={payment.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--gold-glow)',
                            border: '1px solid rgba(176,141,62,0.2)',
                            borderRadius: 6,
                            padding: '4px 8px',
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
                          <span style={{ color: 'var(--ink-low)' }}>
                            {parseLocalDate(payment.due_date ?? payment.created_at).toLocaleDateString(
                              'en-IN',
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasRooms && (
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
                      <div
                        className="uppercase-eyebrow"
                        style={{
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 9,
                        }}
                      >
                        <HiOutlineHome style={{ width: 10, height: 10 }} /> Accommodation
                      </div>
                      <VenueRoomsSection rooms={roomsByVenue[venue.id] ?? []} />
                      <Link
                        to="../accommodations"
                        style={{ fontSize: 11, color: 'var(--gold-deep)', fontWeight: 500 }}
                      >
                        Manage room allocations →
                      </Link>
                    </div>
                  )}

                  {(v as any).notes && (
                    <div
                      style={{
                        paddingTop: 8,
                        borderTop: '1px solid var(--line-soft)',
                        fontSize: 12,
                        color: 'var(--ink-mid)',
                        whiteSpace: 'pre-line',
                        lineHeight: 1.4,
                      }}
                    >
                      {(v as any).notes}
                    </div>
                  )}

                  {hasEvents && (
                    <div
                      style={{
                        paddingTop: 8,
                        borderTop: '1px solid var(--line-soft)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      <HiOutlineCalendar
                        style={{ width: 11, height: 11, color: 'var(--ink-dim)' }}
                      />
                      {(v.events ?? []).map((event: any) => (
                        <span
                          key={event.id}
                          style={{
                            fontSize: 10,
                            background: 'var(--gold-glow)',
                            color: 'var(--gold-deep)',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(176,141,62,0.25)',
                          }}
                        >
                          {event.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {canSeeMoney && v.expense_id && committed > 0 && (
                    <button
                      onClick={() => {
                        handleEdit(v);
                        setTimeout(() => setActiveTab(2), 50);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--gold-deep)',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 500,
                        marginTop: 'auto',
                        paddingTop: 8,
                        borderTop: '1px solid var(--line-soft)',
                      }}
                    >
                      <HiOutlineCurrencyRupee style={{ width: 12, height: 12 }} /> Manage payments
                    </button>
                  )}
                </div>
              </div>
                )}
              </SortableItem>
            );
          })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Venue Modal ── */}
      {showVenueModal && (
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
            onClick={attemptCloseVenueModal}
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
              {/* Header */}
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
                    Locations · {editingVenue ? 'Edit venue' : 'Add venue'}
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
                    {canRecordPayment && editingVenue && (
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
                      onClick={attemptCloseVenueModal}
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
                    gridTemplateColumns: canSeeMoney ? '1.4fr 1fr' : '1fr',
                    columnGap: 16,
                    alignItems: 'end',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <label className="label">Venue Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Venue name"
                      required
                      form="venue-form"
                    />
                  </div>
                  {canSeeMoney && (
                    <div style={{ minWidth: 0 }}>
                      <label className="label">Committed Amount</label>
                      <input
                        type="number"
                        value={formData.total_cost}
                        onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                        className="input"
                        placeholder="0"
                        form="venue-form"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tab nav */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--line-soft)',
                  padding: '0 24px',
                  flexShrink: 0,
                }}
              >
                {visibleTabs.map((tab) => (
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
                    {tab.id === 2 && editingVenue && sortedPayments.length > 0 && (
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

              {/* Scrollable content + footer — all inside one form so Save Venue works from any tab */}
              <form
                id="venue-form"
                onSubmit={handleSubmit}
                onInvalid={() =>
                  toast.error('Please fill in the required fields.', { id: 'venue-form-invalid' })
                }
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {/* ── TAB 0: DETAILS ── */}
                  {activeTab === 0 && (
                    <div
                      style={{
                        height: '100%',
                        overflowY: 'auto',
                        padding: 24,
                        display: 'grid',
                        gridTemplateColumns: canSeeMoney ? '1fr 300px' : '1fr',
                        gap: 24,
                        alignContent: 'start',
                      }}
                    >
                      {/* Left: Basic venue info */}
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
                          Venue Info
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="label">Type *</label>
                            <select
                              value={formData.venue_type}
                              onChange={(e) =>
                                setFormData({ ...formData, venue_type: e.target.value })
                              }
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
                          <div>
                            <label className="label">Options</label>
                            <div
                              onClick={() => {
                                const newChecked = !formData.has_accommodation;
                                setFormData((prev) => ({ ...prev, has_accommodation: newChecked }));
                                if (!newChecked && (activeTab as number) === 1) setActiveTab(0);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 8,
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: `1px solid ${formData.has_accommodation ? 'rgba(176,141,62,0.4)' : 'var(--line)'}`,
                                background: formData.has_accommodation
                                  ? 'rgba(176,141,62,0.15)'
                                  : '#ffffff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Checkbox
                                id="has_accommodation_chk"
                                checked={!!formData.has_accommodation}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--ink-high)',
                                  fontWeight: 500,
                                  userSelect: 'none',
                                  display: 'block',
                                  lineHeight: 1,
                                }}
                              >
                                Has guest rooms
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="label">Address *</label>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            {formData.photo_url && (
                              <img
                                src={formData.photo_url}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 8,
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  border: '1px solid var(--line)',
                                }}
                              />
                            )}
                            <div style={{ flex: 1 }}>
                              <AddressAutocomplete
                                value={formData.address}
                                onChange={(sel) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: sel.address,
                                    place_id: sel.place_id,
                                    latitude: sel.latitude,
                                    longitude: sel.longitude,
                                    city: sel.city ?? prev.city,
                                    photo_url: sel.photo_url,
                                  }))
                                }
                                placeholder="Search venue address…"
                                required
                              />
                            </div>
                          </div>
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label className="label">Contact Person</label>
                            <input
                              type="text"
                              value={formData.contact_person}
                              onChange={(e) =>
                                setFormData({ ...formData, contact_person: e.target.value })
                              }
                              className="input"
                              placeholder="Contact name"
                            />
                          </div>
                          <div>
                            <label className="label">Contact Phone</label>
                            <input
                              type="tel"
                              value={formData.contact_phone}
                              onChange={(e) =>
                                setFormData({ ...formData, contact_phone: e.target.value })
                              }
                              className="input"
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label">Notes</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData({ ...formData, notes: e.target.value })
                            }
                            className="input"
                            rows={3}
                            placeholder="Any details about this venue…"
                            style={{ resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      {/* Right: Financial details */}
                      {canSeeMoney && (
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
                          Financial Details
                        </p>

                        <div>
                          <label className="label">Obligation Date</label>
                          <DatePicker
                            value={formData.expense_date}
                            onChange={(v) => setFormData({ ...formData, expense_date: v })}
                            placeholder="Obligation date"
                          />
                        </div>

                        {canSeeSplits && (
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
                                  onClick={() => setFormData({ ...formData, side })}
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
                        )}

                        {canSeeSplits && formData.side === 'shared' && (
                          <SplitShare
                            total={Number(formData.total_cost) || 0}
                            bridePercentage={formData.bride_share_percentage}
                            onChange={(pct) =>
                              setFormData({ ...formData, bride_share_percentage: pct })
                            }
                          />
                        )}

                        {/* Payment summary — only when editing */}
                        {editingVenue && (
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
                              onClick={() => setActiveTab(2)}
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

                  {/* ── TAB 1: ROOMS ── */}
                  {activeTab === 1 && (
                    <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div
                              style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-high)' }}
                            >
                              Room Categories
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>
                              Rooms auto-numbered per category (e.g. STD-1, STD-2…)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setRoomCategories((prev) => [
                                ...prev,
                                {
                                  ...DEFAULT_CATEGORY,
                                  check_in_date: formData.default_check_in_date,
                                  check_out_date: formData.default_check_out_date,
                                },
                              ])
                            }
                            className="btn-outline"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            + Add Category
                          </button>
                        </div>

                        {existingRooms.length > 0 &&
                          (() => {
                            // Group existing rooms by (check_in, check_out, type) so the same category on different days shows separately, then sort by check-in date.
                            const groups: Record<
                              string,
                              {
                                type: string;
                                count: number;
                                rate: number | null;
                                check_in: string | null;
                                check_out: string | null;
                                ids: string[];
                                hasGuests: boolean;
                              }
                            > = {};
                            (existingRooms as any[]).forEach((r: any) => {
                              const key = `${r.check_in_date ?? ''}|${r.check_out_date ?? ''}|${r.room_type}`;
                              if (!groups[key])
                                groups[key] = {
                                  type: r.room_type,
                                  count: 0,
                                  rate: r.rate_per_night ?? null,
                                  check_in: r.check_in_date ?? null,
                                  check_out: r.check_out_date ?? null,
                                  ids: [],
                                  hasGuests: false,
                                };
                              groups[key].count++;
                              groups[key].ids.push(r.id);
                              const allocated = (r.room_allocations ?? []).some(
                                (a: any) => (a.guest_ids ?? []).length > 0,
                              );
                              if (allocated) groups[key].hasGuests = true;
                            });
                            const sortedGroups = Object.values(groups).sort((a, b) => {
                              const ad = a.check_in ?? '9999-12-31';
                              const bd = b.check_in ?? '9999-12-31';
                              return ad.localeCompare(bd);
                            });
                            // Cluster by check-in date for a per-day header.
                            const byDay: Record<string, typeof sortedGroups> = {};
                            sortedGroups.forEach((g) => {
                              const k = g.check_in ?? '__unscheduled__';
                              (byDay[k] ||= []).push(g);
                            });
                            const fmtDate = (d: string | null) =>
                              d
                                ? parseLocalDate(d).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'No date';
                            const handleDeleteGroup = async (ids: string[]) => {
                              try {
                                await Promise.all(
                                  ids.map((id) => deleteRoomMutation.mutateAsync(id)),
                                );
                                toast.success('Rooms deleted.');
                              } catch (err: any) {
                                toast.error(
                                  err?.response?.data?.error || 'Failed to delete rooms.',
                                );
                              }
                            };
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p style={{ fontSize: 11, color: 'var(--ink-low)', margin: 0 }}>
                                  Already added rooms (by day):
                                </p>
                                {Object.entries(byDay).map(([day, gs]) => (
                                  <div
                                    key={day}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 4,
                                      padding: '6px 10px',
                                      background: 'var(--bg-raised)',
                                      borderRadius: 8,
                                      border: '1px solid var(--line-soft)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: 'var(--ink-dim)',
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {day === '__unscheduled__'
                                        ? 'No check-in date'
                                        : `Check-in ${fmtDate(day)}`}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {gs.map((g, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontSize: 11,
                                            background: 'var(--bg-panel)',
                                            color: 'var(--ink-mid)',
                                            padding: '2px 8px',
                                            borderRadius: 100,
                                            border: '1px solid var(--line)',
                                          }}
                                        >
                                          <span>
                                            {g.type} × {g.count}
                                            {g.rate ? ` · ${formatCurrency(g.rate)}/night` : ''}
                                            {g.check_out ? ` · out ${fmtDate(g.check_out)}` : ''}
                                          </span>
                                          {!g.hasGuests && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteGroup(g.ids)}
                                              disabled={deleteRoomMutation.isPending}
                                              title="Delete these rooms"
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: 'var(--err)',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                padding: 0,
                                                opacity: deleteRoomMutation.isPending ? 0.5 : 1,
                                              }}
                                            >
                                              <HiOutlineTrash style={{ width: 12, height: 12 }} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                        {roomCategories.length === 0 && existingRooms.length === 0 && (
                          <p
                            style={{
                              fontSize: 11,
                              color: 'var(--ink-dim)',
                              textAlign: 'center',
                              padding: '12px 0',
                              margin: 0,
                            }}
                          >
                            No categories yet. Click &quot;+ Add Category&quot; to bulk-add rooms.
                          </p>
                        )}

                        {roomCategories.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1.1fr 56px 64px 88px 48px 260px 28px',
                                gap: 6,
                              }}
                            >
                              {[
                                'Category',
                                'Count',
                                'Occ.',
                                'Rate',
                                'Food',
                                'Check-in → Check-out',
                                '',
                              ].map((h) => (
                                <span key={h} className="uppercase-eyebrow" style={{ fontSize: 9 }}>
                                  {h}
                                </span>
                              ))}
                            </div>
                            {[...roomCategories]
                              .map((cat, originalIdx) => ({ cat, originalIdx }))
                              .sort((a, b) => {
                                const ad = a.cat.check_in_date || '9999-12-31';
                                const bd = b.cat.check_in_date || '9999-12-31';
                                return ad.localeCompare(bd);
                              })
                              .map(({ cat, originalIdx: idx }) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.1fr 56px 64px 88px 48px 260px 28px',
                                    gap: 6,
                                    alignItems: 'center',
                                  }}
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
                                                ? {
                                                    ...c,
                                                    is_custom: true,
                                                    room_type: '',
                                                    capacity: 2,
                                                  }
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
                                    placeholder={`${currencySymbol()} 0`}
                                    min={0}
                                  />
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Checkbox
                                      checked={cat.includes_breakfast}
                                      onChange={(e) =>
                                        setRoomCategories((prev) =>
                                          prev.map((c, i) =>
                                            i === idx
                                              ? { ...c, includes_breakfast: e.target.checked }
                                              : c,
                                          ),
                                        )
                                      }
                                      title="Includes breakfast"
                                    />
                                  </div>
                                  <DateRangePicker
                                    startValue={cat.check_in_date}
                                    endValue={cat.check_out_date}
                                    onChange={({ start, end }) =>
                                      setRoomCategories((prev) =>
                                        prev.map((c, i) =>
                                          i === idx
                                            ? { ...c, check_in_date: start, check_out_date: end }
                                            : c,
                                        ),
                                      )
                                    }
                                    size="sm"
                                    startPlaceholder="Check-in"
                                    endPlaceholder="Check-out"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRoomCategories((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    style={{
                                      width: 28,
                                      height: 28,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--err)',
                                      background: 'transparent',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <HiOutlineX style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              ))}
                            <p style={{ fontSize: 11, color: 'var(--ink-dim)', margin: 0 }}>
                              Total rooms to add:{' '}
                              <span style={{ fontWeight: 600, color: 'var(--gold-deep)' }}>
                                {roomCategories.reduce((s, c) => s + (Number(c.count) || 0), 0)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TAB 2: PAYMENTS ── */}
                  {activeTab === 2 && (
                    <div
                      style={{
                        height: '100%',
                        overflowY: 'auto',
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      {editingVenue ? (
                        <PaymentTimelinePanel
                          payments={sortedPayments}
                          committed={paymentCommitted}
                          paid={paymentPaid}
                          outstanding={paymentOutstanding}
                          onCreate={(payload) =>
                            createVenuePayment.mutateAsync({
                              sourceId: editingVenue.id,
                              ...payload,
                            })
                          }
                          onDelete={(paymentId) =>
                            deleteVenuePayment.mutateAsync({
                              sourceId: editingVenue.id,
                              paymentId,
                            })
                          }
                          onUpdate={(paymentId, payload) =>
                            updateExpensePayment.mutateAsync({ paymentId, ...payload })
                          }
                          isUpdating={updateExpensePayment.isPending}
                          items={currentVenueFinance?.items}
                          allocations={currentVenueFinance?.allocations}
                          isCreating={createVenuePayment.isPending}
                          isDeleting={deleteVenuePayment.isPending}
                          defaultSplit={{
                            side: currentVenueFinance?.items?.[0]?.side ?? 'shared',
                            bridePercentage:
                              currentVenueFinance?.items?.[0]?.bride_share_percentage ?? 50,
                          }}
                          canSeeSplits={canSeeSplits}
                          canRecordPayment={!!editingVenue.expense_id}
                          disabledReason="Link an obligation to this venue before recording payments."
                        />
                      ) : (
                        <>
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
                            Initial Payments (Optional)
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-low)' }}>
                            Optionally record advance, milestone, or final payments alongside the
                            venue. Leave empty to skip.
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
                </div>

                {/* Unified footer */}
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
                    onClick={attemptCloseVenueModal}
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
                      : editingVenue
                        ? 'Update venue'
                        : installments.some((row) => Number(row.amount || 0) !== 0)
                          ? 'Add venue & record payments'
                          : 'Add venue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      {venueUnsavedDialog}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete venue?"
        message="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
