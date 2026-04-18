/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import {
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineUsers,
  HiOutlineCurrencyRupee,
  HiOutlineX,
  HiOutlineExternalLink,
  HiOutlineAnnotation,
  HiOutlineCalendar,
  HiOutlineHome,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineMap,
} from 'react-icons/hi';
import { SectionHeader } from '../../components/ui';
import {
  useVenues,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  useAccommodationRooms,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import VendorPaymentsModal from './VendorPaymentsModal';
import type { VenueWithFinance } from '@wedding-planner/shared';

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

const PRESET_BY_LABEL: Record<string, { capacity: number; prefix: string }> =
  Object.fromEntries(PRESET_ROOM_TYPES.map((t) => [t.label, { capacity: t.capacity, prefix: t.prefix }]));

interface RoomCategoryEntry {
  room_type: string;        // preset label or custom text
  is_custom: boolean;
  count: number | string;
  capacity: number | string;
  rate_per_night: number | string;
}

const DEFAULT_CATEGORY: RoomCategoryEntry = {
  room_type: 'Standard Room',
  is_custom: false,
  count: '',
  capacity: 2,
  rate_per_night: '',
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
  google_maps_link: string;
  default_check_in_date: string;
  default_check_out_date: string;
}

const DEFAULT_FORM: VenueFormData = {
  name: '',
  venue_type: 'wedding_hall',
  address: '',
  city: '',
  capacity: 0,
  total_cost: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  side: 'shared',
  bride_share_percentage: 50,
  has_accommodation: false,
  contact_person: '',
  contact_phone: '',
  google_maps_link: '',
  default_check_in_date: '',
  default_check_out_date: '',
};

function VenueRoomsSection({ venueId }: { venueId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rooms = [], isLoading } = useAccommodationRooms(venueId);

  const grouped = useMemo(() => {
    const map: Record<string, { count: number; capacity: number | null; rate: number | null }> = {};
    (rooms as any[]).forEach((r: any) => {
      const type = r.room_type as string;
      if (!map[type]) map[type] = { count: 0, capacity: r.capacity ?? null, rate: r.rate_per_night ?? null };
      map[type].count++;
    });
    return Object.entries(map);
  }, [rooms]);

  const totalRooms = (rooms as any[]).length;

  if (isLoading) {
    return <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Loading rooms…</p>;
  }

  if (totalRooms === 0) {
    return <p style={{ fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>No rooms added yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {grouped.map(([type, info]) => (
          <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 100, background: 'var(--gold-glow)', color: 'var(--gold-deep)', fontSize: 11, fontWeight: 500, border: '1px solid rgba(212,175,55,0.25)' }}>
            {type}
            <span style={{ background: 'var(--gold)', color: 'white', borderRadius: 100, padding: '0 5px', fontSize: 10, fontWeight: 600 }}>{info.count}</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{totalRooms} room{totalRooms !== 1 ? 's' : ''} total</p>
        <button onClick={() => setExpanded((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-deep)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
          {expanded ? <><HiOutlineChevronUp style={{ width: 12, height: 12 }} /> Collapse</> : <><HiOutlineChevronDown style={{ width: 12, height: 12 }} /> View details</>}
        </button>
      </div>

      {expanded && (
        <div style={{ borderRadius: 8, border: '1px solid var(--line-soft)', overflow: 'hidden', marginTop: 4 }}>
          <table className="tbl" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Occ.</th>
                <th style={{ textAlign: 'right' }}>Rate / night</th>
              </tr>
            </thead>
            <tbody>
              {(rooms as any[]).map((r: any) => (
                <tr key={r.id}>
                  <td className="mono strong">{r.room_number}</td>
                  <td>{r.room_type}</td>
                  <td style={{ textAlign: 'center' }}>{r.capacity ?? <span className="ink-dim">—</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.rate_per_night ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.rate_per_night) : <span className="ink-dim">—</span>}
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
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>(DEFAULT_FORM);
  const [editingVenue, setEditingVenue] = useState<VenueWithFinance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryEntry[]>([]);
  const [paymentSource, setPaymentSource] = useState<VenueWithFinance | null>(null);

  const { data: venues = [], isLoading, error } = useVenues();
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();
  const { data: existingRooms = [] } = useAccommodationRooms(editingVenue?.id);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingVenue(null);
    setRoomCategories([]);
  };

  const handleEdit = (venue: VenueWithFinance) => {
    const firstItem = venue.finance?.items?.[0];
    setEditingVenue(venue);
    setFormData({
      name: venue.name || '',
      venue_type: venue.venue_type || 'wedding_hall',
      address: venue.address || '',
      city: venue.city || '',
      capacity: venue.capacity || 0,
      total_cost: venue.finance_summary?.committed_amount || 0,
      expense_date: venue.finance?.expense_date || new Date().toISOString().slice(0, 10),
      side: firstItem?.side || 'shared',
      bride_share_percentage: firstItem?.bride_share_percentage || 50,
      has_accommodation: venue.has_accommodation ?? false,
      contact_person: venue.contact_person || '',
      contact_phone: venue.contact_phone || '',
      google_maps_link: venue.google_maps_link || '',
      default_check_in_date: venue.default_check_in_date || '',
      default_check_out_date: venue.default_check_out_date || '',
    });
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
    }> = [];

    for (const entry of validCategories) {
      const preset = PRESET_BY_LABEL[entry.room_type];
      const prefix =
        preset?.prefix ?? entry.room_type.slice(0, 4).toUpperCase().replace(/\s/g, '');
      const startIdx = (existingCountByType[entry.room_type] || 0) + 1;
      const count = Number(entry.count);
      for (let i = 0; i < count; i++) {
        rooms.push({
          room_number: `${prefix}-${startIdx + i}`,
          room_type: entry.room_type,
          ...(entry.capacity !== '' && { capacity: Number(entry.capacity) }),
          ...(entry.rate_per_night !== '' && { rate_per_night: Number(entry.rate_per_night) }),
        });
      }
    }

    return rooms;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rooms = buildRoomsPayload();
    try {
      if (editingVenue) {
        await updateMutation.mutateAsync({ id: editingVenue.id, ...formData, rooms });
        toast.success('Venue updated successfully!');
      } else {
        await createMutation.mutateAsync({ ...formData, rooms });
        toast.success('Venue added successfully!');
      }
      setShowVenueModal(false);
      resetForm();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to save venue';
      toast.error(errorMessage);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--line-soft)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
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
    'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.3) 100%)',
    'linear-gradient(135deg, rgba(190,24,93,0.08) 0%, rgba(124,58,237,0.12) 100%)',
    'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(212,175,55,0.15) 100%)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Locations"
        title="Venues"
        action={
          <button onClick={() => setShowVenueModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
            Add venue
          </button>
        }
      />

      {venues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>No venues found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {venues.map((venue, venueIndex) => {
            const v = venue as VenueWithFinance & { events?: Array<{ id: string; name: string }> };
            const venueTypeLabel = v.venue_type?.replace(/_/g, ' ') ?? '';
            const fullAddress = [v.address, v.city].filter(Boolean).join(', ');
            const hasContact = v.contact_person || v.contact_phone;
            const hasRooms = v.has_accommodation;
            const hasEvents = v.events && v.events.length > 0;
            const committed = v.finance_summary?.committed_amount ?? 0;
            const paid = v.finance_summary?.paid_amount ?? 0;
            const outstanding = v.finance_summary?.outstanding_amount ?? 0;
            const plannedPayments = v.finance?.payments?.filter((p) => p.status === 'scheduled') ?? [];

            return (
              <div key={venue.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image placeholder */}
                <div style={{ height: 180, background: HEADER_GRADIENTS[venueIndex % 3], display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                  {hasRooms && (
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.8)', color: 'var(--ink-mid)', padding: '3px 10px', borderRadius: 100, fontWeight: 500 }}>
                      Has rooms
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="uppercase-eyebrow" style={{ marginBottom: 4, textTransform: 'capitalize' }}>{venueTypeLabel || 'Venue'}</div>
                    <h3 className="display" style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)', lineHeight: 1.2 }}>{venue.name}</h3>
                    {v.city && <div className="mono" style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-dim)' }}>{v.city}</div>}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Location */}
                    {(fullAddress || v.google_maps_link) && (
                      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {fullAddress && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-mid)' }}>
                            <HiOutlineLocationMarker style={{ width: 14, height: 14, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                            <span>{fullAddress}</span>
                          </div>
                        )}
                        {v.google_maps_link && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <HiOutlineExternalLink style={{ width: 14, height: 14, color: 'var(--gold)', flexShrink: 0 }} />
                            <a href={v.google_maps_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-deep)', textDecoration: 'none', fontWeight: 500 }}>View on Google Maps</a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Capacity & Cost */}
                    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineUsers style={{ width: 14, height: 14, color: 'var(--gold)', flexShrink: 0 }} />
                        <div>
                          <div className="uppercase-eyebrow" style={{ marginBottom: 2 }}>Capacity</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-mid)', fontWeight: 500 }}>
                            {v.capacity && Number(v.capacity) > 0 ? `${v.capacity} guests` : <span style={{ color: 'var(--ink-dim)', fontStyle: 'italic', fontWeight: 400, fontSize: 11 }}>Not set</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineCurrencyRupee style={{ width: 14, height: 14, color: 'var(--gold)', flexShrink: 0 }} />
                        <div>
                          <div className="uppercase-eyebrow" style={{ marginBottom: 2 }}>Committed</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-mid)', fontWeight: 500 }}>
                            {committed > 0 ? formatCurrency(committed) : <span style={{ color: 'var(--ink-dim)', fontStyle: 'italic', fontWeight: 400, fontSize: 11 }}>Not set</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment summary */}
                    {(committed > 0 || paid > 0 || plannedPayments.length > 0) && (
                      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          {[
                            { label: 'Paid', value: formatCurrency(paid), color: '#16a34a' },
                            { label: 'Outstanding', value: formatCurrency(outstanding), color: '#ea580c' },
                            { label: 'Side', value: v.finance?.items?.[0]?.side ?? 'shared', color: 'var(--ink-mid)' },
                          ].map(({ label, value, color }) => (
                            <div key={label}>
                              <div className="uppercase-eyebrow" style={{ marginBottom: 2 }}>{label}</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color, textTransform: 'capitalize' }}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {plannedPayments.slice(0, 2).map((payment) => (
                          <div key={payment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gold-glow)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                            <span className="mono" style={{ fontWeight: 500, color: 'var(--gold-deep)' }}>{formatCurrency(payment.amount)}</span>
                            <span style={{ color: 'var(--ink-low)' }}>{new Date(payment.due_date ?? payment.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                        ))}
                        {v.expense_id ? (
                          <button onClick={() => setPaymentSource(v)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold-deep)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
                            <HiOutlineCurrencyRupee style={{ width: 13, height: 13 }} /> Manage payments
                          </button>
                        ) : (
                          <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Add a committed amount to unlock payment tracking.</p>
                        )}
                      </div>
                    )}

                    {/* Contact */}
                    {hasContact && (
                      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 6 }}>Contact</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-mid)' }}>
                          <HiOutlinePhone style={{ width: 13, height: 13, color: 'var(--gold)', flexShrink: 0 }} />
                          <span>
                            {v.contact_person}
                            {v.contact_person && v.contact_phone && ' · '}
                            {v.contact_phone && <a href={`tel:${v.contact_phone}`} style={{ color: 'var(--gold-deep)', fontWeight: 500, textDecoration: 'none' }}>{v.contact_phone}</a>}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rooms */}
                    {hasRooms && (
                      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineHome style={{ width: 11, height: 11 }} /> Accommodation
                        </div>
                        <VenueRoomsSection venueId={venue.id} />
                      </div>
                    )}

                    {/* Notes */}
                    {(v as any).notes && (
                      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 6 }}>Notes</div>
                        <p style={{ fontSize: 13, color: 'var(--ink-mid)', whiteSpace: 'pre-line' }}>{(v as any).notes}</p>
                      </div>
                    )}

                    {/* Events */}
                    {hasEvents && (
                      <div style={{ padding: '12px 0' }}>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineCalendar style={{ width: 11, height: 11 }} /> Events at this venue
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(v.events ?? []).map((event: any) => (
                            <span key={event.id} style={{ fontSize: 10, background: 'var(--gold-glow)', color: 'var(--gold-deep)', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(212,175,55,0.25)' }}>{event.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                    {v.google_maps_link && (
                      <a href={v.google_maps_link} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, textDecoration: 'none' }}>
                        <HiOutlineMap style={{ width: 14, height: 14 }} /> Directions
                      </a>
                    )}
                    {v.contact_phone && (
                      <a href={`tel:${v.contact_phone}`} title="Call venue"
                        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink-dim)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <HiOutlinePhone style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                    <button onClick={() => handleEdit(venue)} title="Edit venue"
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
                    >
                      <HiOutlineAnnotation style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>{/* end card body */}
              </div>
            );
          })}
        </div>
      )}

      {showVenueModal && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>Locations</div>
                  <h2 className="display" style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}>{editingVenue ? 'Edit venue' : 'Add venue'}</h2>
                </div>
                <button onClick={() => { setShowVenueModal(false); resetForm(); }} style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}>
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Venue Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Venue name"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Type *</label>
                    <select
                      value={formData.venue_type}
                      onChange={(e) => setFormData({ ...formData, venue_type: e.target.value })}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                    <input
                      type="checkbox"
                      id="has_accommodation"
                      checked={formData.has_accommodation}
                      onChange={(e) => setFormData({ ...formData, has_accommodation: e.target.checked })}
                      style={{ width: 14, height: 14, accentColor: 'var(--gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="has_accommodation" className="label" style={{ margin: 0, cursor: 'pointer' }}>
                      Has guest rooms
                    </label>
                  </div>
                </div>

                {formData.has_accommodation && (
                  <div style={{ border: '1px solid var(--line-soft)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-high)' }}>Room Categories</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>Rooms auto-numbered per category (e.g. D-1, D-2…)</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRoomCategories((prev) => [...prev, { ...DEFAULT_CATEGORY }])}
                        className="btn-outline"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        + Add Category
                      </button>
                    </div>

                    {existingRooms.length > 0 && (() => {
                      const groups: Record<string, { count: number; rate: number | null }> = {};
                      (existingRooms as any[]).forEach((r: any) => {
                        const t = r.room_type as string;
                        if (!groups[t]) groups[t] = { count: 0, rate: r.rate_per_night ?? null };
                        groups[t].count++;
                      });
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ fontSize: 11, color: 'var(--ink-low)' }}>Already added rooms:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {Object.entries(groups).map(([type, info]) => (
                              <span key={type} style={{ fontSize: 11, background: 'var(--bg-raised)', color: 'var(--ink-mid)', padding: '2px 8px', borderRadius: 100, border: '1px solid var(--line)' }}>
                                {type} × {info.count}{info.rate ? ` · ₹${info.rate}/night` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {roomCategories.length === 0 && existingRooms.length === 0 && (
                      <p style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', padding: '8px 0' }}>
                        No categories yet. Click &quot;+ Add Category&quot; to bulk-add rooms.
                      </p>
                    )}

                    {roomCategories.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 100px 32px', gap: 6 }}>
                          {['Category', 'Count', 'Occupancy', 'Rate / night', ''].map((h) => (
                            <span key={h} className="uppercase-eyebrow" style={{ fontSize: 9 }}>{h}</span>
                          ))}
                        </div>
                        {roomCategories.map((cat, idx) => (
                          <div
                            key={idx}
                            style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 100px 32px', gap: 6, alignItems: 'center' }}
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
                                          ? { ...c, is_custom: true, room_type: '', capacity: 2 }
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
                              placeholder="₹ 0"
                              min={0}
                            />
                            <button
                              type="button"
                              onClick={() => setRoomCategories((prev) => prev.filter((_, i) => i !== idx))}
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--err)', background: 'transparent', borderRadius: 6, cursor: 'pointer' }}
                            >
                              <HiOutlineX style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        ))}
                        <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                          Total rooms to add: <span style={{ fontWeight: 600, color: 'var(--gold-deep)' }}>{roomCategories.reduce((s, c) => s + (Number(c.count) || 0), 0)}</span>
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                      <div>
                        <label className="label">Default Check-in Date</label>
                        <input type="date" value={formData.default_check_in_date} onChange={(e) => setFormData({ ...formData, default_check_in_date: e.target.value })} className="input" />
                      </div>
                      <div>
                        <label className="label">Default Check-out Date</label>
                        <input type="date" value={formData.default_check_out_date} onChange={(e) => setFormData({ ...formData, default_check_out_date: e.target.value })} className="input" />
                      </div>
                      <p style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--ink-dim)' }}>Pre-filled when assigning guests to rooms in this hotel.</p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Address *</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input" rows={2} placeholder="Full address" required />
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input" placeholder="City name" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Capacity</label>
                    <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input" placeholder="Number of guests" />
                  </div>
                  <div>
                    <label className="label">Committed Amount</label>
                    <input type="number" value={formData.total_cost} onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })} className="input" placeholder="0" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Obligation Date</label>
                    <input type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} className="input" />
                  </div>
                  <div>
                    <label className="label">Liability Side</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['bride', 'groom', 'shared'] as const).map((side) => {
                        const isActive = formData.side === side;
                        const activeColors = side === 'bride'
                          ? { border: '#be185d', bg: 'rgba(190,24,93,0.08)', color: '#be185d' }
                          : side === 'groom'
                            ? { border: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', color: '#1d4ed8' }
                            : { border: 'var(--gold)', bg: 'var(--gold-glow)', color: 'var(--gold-deep)' };
                        return (
                          <button key={side} type="button" onClick={() => setFormData({ ...formData, side })}
                            style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, border: `2px solid ${isActive ? activeColors.border : 'var(--line)'}`, background: isActive ? activeColors.bg : 'transparent', color: isActive ? activeColors.color : 'var(--ink-mid)', cursor: 'pointer', fontWeight: isActive ? 500 : 400 }}>
                            {side === 'shared' ? 'Shared' : side.charAt(0).toUpperCase() + side.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {formData.side === 'shared' && (
                  <div>
                    <label className="label">Bride Share — {formData.bride_share_percentage}%</label>
                    <input type="range" min="0" max="100" value={formData.bride_share_percentage} onChange={(e) => setFormData({ ...formData, bride_share_percentage: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--gold)' }} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Contact Person</label>
                    <input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="input" placeholder="Contact name" />
                  </div>
                  <div>
                    <label className="label">Contact Phone</label>
                    <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} className="input" placeholder="Phone number" />
                  </div>
                </div>

                <div>
                  <label className="label">Google Maps Link</label>
                  <input type="url" value={formData.google_maps_link} onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })} className="input" placeholder="https://maps.google.com/…" />
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => { setShowVenueModal(false); resetForm(); }} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary" style={{ flex: 1, opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1 }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editingVenue ? 'Update venue' : 'Add venue'}
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
              <h3 className="display" style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}>Delete venue?</h3>
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
            type: 'venue',
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
