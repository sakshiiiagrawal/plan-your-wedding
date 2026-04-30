/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGuests,
  useGuest,
  useGuestSummary,
  useBulkCreateGuests,
  useUpdateGuest,
  useBulkDeleteGuests,
  useEvents,
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
  HiOutlinePhone,
} from 'react-icons/hi';
import { SectionHeader, SegmentedControl, KPICard, DrawerPanel } from '../../components/ui';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';

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

function getGuestFormState(guest?: any): GuestFormData {
  if (!guest) return DEFAULT_FORM;
  return {
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
  };
}

// ── Guest detail drawer (fetches fresh data + events) ────────────────────────

function GuestDrawer({
  guest,
  onClose,
  onEdit,
  onDelete,
}: {
  guest: any;
  onClose: () => void;
  onEdit: (g: any) => void;
  onDelete: (g: any) => void;
}) {
  const { data: detail } = useGuest(guest.id);
  const { data: allEvents = [] } = useEvents();

  const rsvps: any[] = detail?.rsvps ?? guest.rsvps ?? [];
  const eventsMap = new Map((allEvents as any[]).map((e: any) => [e.id, e]));

  const rsvpColor = (status: string) => {
    if (status === 'confirmed')
      return { color: 'var(--ok)', bg: 'rgba(22,163,74,0.08)', border: 'var(--ok)' };
    if (status === 'declined')
      return { color: 'var(--err)', bg: 'rgba(220,38,38,0.07)', border: 'var(--err)' };
    return { color: 'var(--warn)', bg: 'rgba(217,119,6,0.08)', border: 'var(--warn)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: 24, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            padding: '6px 10px',
            borderRadius: 6,
            color: 'var(--ink-dim)',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <HiOutlineX style={{ width: 14, height: 14 }} />
        </button>

        {/* Avatar + name */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <div
            className="avatar"
            style={{
              width: 56,
              height: 56,
              fontSize: 20,
              background:
                guest.side === 'bride'
                  ? 'linear-gradient(135deg, #be185d, #7c3aed)'
                  : 'linear-gradient(135deg, var(--gold-deep), var(--gold))',
            }}
          >
            {(guest.first_name?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <h2 className="display" style={{ margin: 0, fontSize: 24, color: 'var(--ink-high)' }}>
              {guest.first_name} {guest.last_name}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ink-low)' }}>
              {guest.relationship}
              {guest.relationship && guest.side ? ' · ' : ''}
              {guest.side}
            </div>
          </div>
        </div>

        <hr className="hairline" />

        {/* Overall RSVP status */}
        <div style={{ padding: '20px 0' }}>
          <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>
            Overall RSVP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {(
              [
                ['confirmed', 'Confirmed'],
                ['pending', 'Pending'],
                ['declined', 'Regret'],
              ] as const
            ).map(([v, l]) => {
              const isActive = guest.rsvp_status === v;
              const c = rsvpColor(v);
              return (
                <div
                  key={v}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    textAlign: 'center',
                    border: `1px solid ${isActive ? c.border : 'var(--line)'}`,
                    background: isActive ? c.bg : 'transparent',
                    fontSize: 12,
                    fontWeight: 500,
                    color: isActive ? c.color : 'var(--ink-low)',
                  }}
                >
                  {l}
                </div>
              );
            })}
          </div>
        </div>

        <hr className="hairline" />

        {/* Events attending */}
        <div style={{ padding: '20px 0' }}>
          <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>
            Events attending
          </div>
          {rsvps.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>
              Not linked to any events yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rsvps.map((rsvp: any) => {
                const event = eventsMap.get(rsvp.event_id);
                const c = rsvpColor(rsvp.rsvp_status);
                return (
                  <div
                    key={rsvp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-high)' }}>
                        {event?.name ?? 'Unknown event'}
                      </div>
                      {event?.date && (
                        <div
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}
                        >
                          {new Date(event.date).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 100,
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        background: c.bg,
                        color: c.color,
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      {rsvp.rsvp_status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <hr className="hairline" />

        {/* Contact details */}
        <div
          style={{ padding: '20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {[
            { label: 'Phone', value: guest.phone || '—', mono: true },
            { label: 'Meal', value: guest.meal_preference?.replace('_', ' ') || '—' },
            { label: 'Email', value: guest.email || '—' },
            { label: 'Pickup', value: guest.needs_pickup ? 'Needed' : 'Not needed' },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <div className="uppercase-eyebrow">{label}</div>
              <div
                className={mono ? 'mono' : ''}
                style={{ fontSize: 13, marginTop: 4, color: 'var(--ink-mid)' }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {guest.notes && (
          <>
            <hr className="hairline" />
            <div style={{ padding: '20px 0' }}>
              <div className="uppercase-eyebrow" style={{ marginBottom: 6 }}>
                Notes
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-mid)' }}>{guest.notes}</div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onEdit(guest)}
            className="btn-secondary"
            style={{
              flex: 1,
              fontSize: 12,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <HiOutlinePencil style={{ width: 13, height: 13 }} /> Edit
          </button>
          {guest.phone && (
            <a
              href={`tel:${guest.phone}`}
              className="btn-secondary"
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
            >
              <HiOutlinePhone style={{ width: 13, height: 13 }} />
            </a>
          )}
          <button
            onClick={() => onDelete(guest)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--err)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <HiOutlineTrash style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Guests() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [showVendorTeams, setShowVendorTeams] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<GuestFormData>(DEFAULT_FORM);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: guests = [], isLoading: guestsLoading } = useGuests(
    sideFilter !== 'all' ? { side: sideFilter } : {},
  );
  const { data: summary } = useGuestSummary();
  const bulkCreateMutation = useBulkCreateGuests();
  const updateMutation = useUpdateGuest();
  const bulkDeleteMutation = useBulkDeleteGuests();
  const isGuestFormDirty =
    JSON.stringify(formData) !== JSON.stringify(getGuestFormState(editingGuest));
  const { attemptClose: attemptCloseGuestModal, dialog: guestUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isGuestFormDirty,
      onDiscard: () => {
        setShowEditModal(false);
        resetForm();
      },
      onSave: () => {
        (document.getElementById('edit-guest-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving: updateMutation.isPending,
    });

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingGuest(null);
  };

  const handleEdit = (guest: any) => {
    setEditingGuest(guest);
    setFormData(getGuestFormState(guest));
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
      if (!showVendorTeams && guest.guest_type === 'vendor_team') return false;

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
  }, [guests, searchTerm, rsvpFilter, showVendorTeams]);

  if (guestsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
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

  const s = summary as any;
  const totalGuests = s?.total || 0;
  const confirmed = s?.confirmed || 0;
  const pending = s?.pending || 0;
  const declined = s?.declined || 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Guest List"
        title="RSVPs & guest management"
        description={`${totalGuests} invited · ${confirmed} confirmed · ${pending} pending. Import from Excel, manage meal preferences, allocate rooms.`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <HiOutlineUpload className="w-4 h-4" />
              Import Excel
            </button>
            <button
              onClick={() => addPendingRow()}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add guest
            </button>
          </div>
        }
      />

      {/* Stats row — 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard eyebrow="Invited" value={totalGuests} hint="Total invites sent" />
        <KPICard
          eyebrow="Confirmed"
          value={confirmed}
          hint={
            totalGuests > 0 ? `${Math.round((confirmed / totalGuests) * 100)}% response rate` : ''
          }
          accent
        />
        <KPICard eyebrow="Pending" value={pending} hint="Awaiting response" />
        <KPICard eyebrow="Regrets" value={declined} hint="Cannot attend" />
      </div>

      {/* Toolbar */}
      <div
        className="card"
        style={{
          padding: 12,
          marginBottom: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search guests…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>
        <SegmentedControl
          options={[
            { value: 'all', label: 'All', count: totalGuests },
            { value: 'confirmed', label: 'Confirmed', count: confirmed },
            { value: 'pending', label: 'Pending', count: pending },
            { value: 'declined', label: 'Regrets', count: declined },
          ]}
          value={rsvpFilter}
          onChange={setRsvpFilter}
        />
        <SegmentedControl
          options={[
            { value: 'all', label: 'Both' },
            { value: 'bride', label: 'Bride' },
            { value: 'groom', label: 'Groom' },
          ]}
          value={sideFilter}
          onChange={setSideFilter}
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--ink-mid)',
            cursor: 'pointer',
            padding: '0 8px',
          }}
          title="Vendor teams are stored as guests so they appear in accommodation and meal counts."
        >
          <input
            type="checkbox"
            checked={showVendorTeams}
            onChange={(e) => setShowVendorTeams(e.target.checked)}
          />
          Show vendor teams
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Side</th>
                <th className="hidden sm:table-cell">Phone</th>
                <th className="hidden md:table-cell">Meal</th>
                <th>RSVP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest: any) => {
                const isMarkedForDelete = pendingDeletes.has(guest.id);
                const rsvpVariant =
                  guest.rsvp_status === 'confirmed'
                    ? 'ok'
                    : guest.rsvp_status === 'declined'
                      ? 'err'
                      : 'warn';
                const rsvpLabel =
                  guest.rsvp_status === 'confirmed'
                    ? 'Confirmed'
                    : guest.rsvp_status === 'declined'
                      ? 'Regret'
                      : 'Pending';
                return (
                  <tr
                    key={guest.id}
                    onClick={() => !isMarkedForDelete && setSelectedGuest(guest)}
                    className={isMarkedForDelete ? 'opacity-40 line-through' : 'cursor-pointer'}
                  >
                    <td className="strong">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="avatar"
                          style={{
                            width: 28,
                            height: 28,
                            fontSize: 11,
                            background:
                              guest.side === 'bride'
                                ? 'linear-gradient(135deg, #be185d, #7c3aed)'
                                : 'linear-gradient(135deg, var(--gold-deep), var(--gold))',
                          }}
                        >
                          {(guest.first_name?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div>
                            {guest.first_name} {guest.last_name}
                          </div>
                          {guest.relationship && (
                            <div className="ink-low" style={{ fontSize: 11 }}>
                              {guest.relationship}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${guest.side === 'bride' ? 'bride' : 'groom'}`}>
                        <span className="dot" />
                        {guest.side === 'bride'
                          ? 'Bride'
                          : guest.side === 'groom'
                            ? 'Groom'
                            : 'Mutual'}
                      </span>
                    </td>
                    <td className="mono hidden sm:table-cell" style={{ fontSize: 11 }}>
                      {guest.phone || <span className="ink-dim">—</span>}
                    </td>
                    <td className="hidden md:table-cell" style={{ textTransform: 'capitalize' }}>
                      {guest.meal_preference?.replace('_', ' ') || (
                        <span className="ink-dim">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${rsvpVariant}`}>
                        <span className="dot" />
                        {rsvpLabel}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {!isMarkedForDelete ? (
                          <>
                            <button
                              onClick={() => handleEdit(guest)}
                              style={{
                                padding: '5px 7px',
                                borderRadius: 6,
                                color: 'var(--ink-dim)',
                                background: 'transparent',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background =
                                  'var(--gold-glow)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
                              }}
                              title="Edit guest"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => markForDelete(guest.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                              title="Delete guest"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => unmarkForDelete(guest.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
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
                <tr key={row._key} style={{ background: 'var(--gold-glow)' }}>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={row.first_name}
                        onChange={(e) => updatePendingRow(row._key, { first_name: e.target.value })}
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
                      style={{
                        width: 14,
                        height: 14,
                        cursor: 'pointer',
                        accentColor: 'var(--gold)',
                      }}
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: 'var(--gold-deep)',
                          fontWeight: 500,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
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
                          {isDeletingAll
                            ? 'Deleting...'
                            : `Delete ${pendingDeletes.size} Guest${pendingDeletes.size > 1 ? 's' : ''}`}
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

      {/* ── Guest Detail Drawer ── */}
      <DrawerPanel open={!!selectedGuest} onClose={() => setSelectedGuest(null)} width={440}>
        {selectedGuest && (
          <GuestDrawer
            guest={selectedGuest}
            onClose={() => setSelectedGuest(null)}
            onEdit={(g) => {
              setSelectedGuest(null);
              handleEdit(g);
            }}
            onDelete={(g) => {
              markForDelete(g.id);
              setSelectedGuest(null);
            }}
          />
        )}
      </DrawerPanel>

      {showEditModal && (
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
            onClick={attemptCloseGuestModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: 640,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                    Guest Details
                  </div>
                  <h2
                    className="display"
                    style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}
                  >
                    {editingGuest ? 'Edit guest' : 'Add a guest'}
                  </h2>
                </div>
                <button
                  onClick={attemptCloseGuestModal}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    color: 'var(--ink-dim)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form
                id="edit-guest-form"
                onSubmit={handleEditSubmit}
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                  {[
                    { key: 'needs_accommodation', label: 'Needs Accommodation' },
                    { key: 'needs_pickup', label: 'Needs Pickup' },
                    { key: 'is_vip', label: 'VIP Guest' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--ink-mid)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData[key as keyof GuestFormData] as boolean}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                        style={{
                          width: 14,
                          height: 14,
                          cursor: 'pointer',
                          accentColor: 'var(--gold)',
                        }}
                      />
                      {label}
                    </label>
                  ))}
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

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '16px 24px',
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={attemptCloseGuestModal}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-guest-form"
                  disabled={updateMutation.isPending}
                  className="btn-primary"
                  style={{ flex: 1, opacity: updateMutation.isPending ? 0.5 : 1 }}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Update Guest'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {guestUnsavedDialog}

      {showImportModal && (
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
            onClick={() => setShowImportModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: 560,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                    Excel Import
                  </div>
                  <h2
                    className="display"
                    style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}
                  >
                    Import guests
                  </h2>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    color: 'var(--ink-dim)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div className="uppercase-eyebrow" style={{ marginBottom: 10 }}>
                    Instructions
                  </div>
                  <ol
                    style={{
                      paddingLeft: 18,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {[
                      <>
                        <strong>Download the sample template</strong> — contains 3 example guests to
                        show the format
                      </>,
                      <>
                        <strong>Edit the Excel file:</strong> replace sample data with your actual
                        guests
                      </>,
                      <>
                        <strong>Required fields:</strong> First Name and Side (must be
                        &quot;Bride&quot; or &quot;Groom&quot;)
                      </>,
                      <>
                        <strong>Optional:</strong> Last Name, Phone, Relationship, Meal Preference,
                        Accommodation, Pickup
                      </>,
                      <>
                        <strong>Boolean values:</strong> use &quot;Yes&quot; or &quot;No&quot; for
                        Accommodation and Pickup columns
                      </>,
                    ].map((item, i) => (
                      <li
                        key={i}
                        style={{ fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.5 }}
                      >
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={handleDownloadTemplate}
                    className="btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                  >
                    <HiOutlineDownload style={{ width: 15, height: 15 }} />
                    Download Sample Template
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: isImporting ? 0.5 : 1,
                  }}
                >
                  <HiOutlineUpload style={{ width: 16, height: 16 }} />
                  {isImporting ? 'Importing…' : 'Import Data from Excel'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
