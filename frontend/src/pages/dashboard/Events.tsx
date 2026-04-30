/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEvents,
  useVenues,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import {
  HiOutlineCalendar,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineChevronDown,
  HiOutlineViewList,
  HiOutlineViewGrid,
  HiOutlinePencil,
  HiOutlineUserGroup,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import { SectionHeader, Ornament } from '../../components/ui';
import DatePicker from '../../components/ui/DatePicker';
import TimePicker from '../../components/ui/TimePicker';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';

// ── PAN India wedding event types ──────────────────────────────────────────
const EVENT_TYPES = [
  // Pre-Wedding
  { value: 'roka', label: 'Roka Ceremony', group: 'Pre-Wedding' },
  { value: 'engagement', label: 'Engagement / Sagai', group: 'Pre-Wedding' },
  { value: 'ring_ceremony', label: 'Ring Ceremony', group: 'Pre-Wedding' },
  { value: 'tilak', label: 'Tilak Ceremony', group: 'Pre-Wedding' },
  { value: 'chunni', label: 'Chunni Ceremony', group: 'Pre-Wedding' },
  { value: 'lagan', label: 'Lagan', group: 'Pre-Wedding' },
  { value: 'shagun', label: 'Shagun Ceremony', group: 'Pre-Wedding' },
  { value: 'saatak', label: 'Saatak', group: 'Pre-Wedding' },
  // Wedding Celebrations
  { value: 'mehendi', label: 'Mehendi', group: 'Wedding Celebrations' },
  { value: 'haldi', label: 'Haldi', group: 'Wedding Celebrations' },
  { value: 'sangeet', label: 'Sangeet', group: 'Wedding Celebrations' },
  { value: 'cocktail', label: 'Cocktail Party', group: 'Wedding Celebrations' },
  { value: 'bachelor', label: 'Bachelor Party', group: 'Wedding Celebrations' },
  { value: 'bachelorette', label: 'Bachelorette Party', group: 'Wedding Celebrations' },
  { value: 'bridal_shower', label: 'Bridal Shower', group: 'Wedding Celebrations' },
  // Wedding Day
  { value: 'baraat', label: 'Baraat', group: 'Wedding Day' },
  { value: 'jaimala', label: 'Jai Mala / Varmala', group: 'Wedding Day' },
  { value: 'pheras', label: 'Pheras / Saat Phere', group: 'Wedding Day' },
  { value: 'wedding', label: 'Wedding', group: 'Wedding Day' },
  { value: 'vidaai', label: 'Vidaai', group: 'Wedding Day' },
  // Post-Wedding
  { value: 'reception', label: 'Reception', group: 'Post-Wedding' },
  { value: 'griha_pravesh', label: 'Griha Pravesh', group: 'Post-Wedding' },
  { value: 'pag_phere', label: 'Pag Phere', group: 'Post-Wedding' },
  // Religious Rituals
  { value: 'ganesh_puja', label: 'Ganesh Puja', group: 'Religious Rituals' },
  { value: 'havan', label: 'Havan / Homam', group: 'Religious Rituals' },
  { value: 'mata_ki_chowki', label: 'Mata Ki Chowki', group: 'Religious Rituals' },
  { value: 'satyanarayan_katha', label: 'Satyanarayan Katha', group: 'Religious Rituals' },
  // South Indian
  { value: 'nischitartham', label: 'Nischitartham / Nichayathartham', group: 'South Indian' },
  { value: 'naandi', label: 'Naandi', group: 'South Indian' },
  { value: 'pellikuturu', label: 'Pellikuturu', group: 'South Indian' },
  { value: 'pellikoduku', label: 'Pellikoduku', group: 'South Indian' },
  { value: 'oonjal', label: 'Oonjal', group: 'South Indian' },
  { value: 'kashi_yatra', label: 'Kashi Yatra', group: 'South Indian' },
  { value: 'muhurtam', label: 'Muhurtam', group: 'South Indian' },
  { value: 'sumangali_prarthanai', label: 'Sumangali Prarthanai', group: 'South Indian' },
];

const EVENT_ICONS: Record<string, string> = {
  roka: '🤝', engagement: '💍', ring_ceremony: '💍', tilak: '🪔', chunni: '🧣',
  lagan: '📜', shagun: '🎁', saatak: '🙏', mehendi: '🌿', haldi: '🌼',
  sangeet: '🎶', cocktail: '🍹', bachelor: '🎉', bachelorette: '👑',
  bridal_shower: '🌸', baraat: '🐴', jaimala: '🌹', pheras: '🔥',
  wedding: '💒', vidaai: '🚗', reception: '🥂', griha_pravesh: '🏠',
  pag_phere: '👪', ganesh_puja: '🐘', havan: '🔥', mata_ki_chowki: '🪔',
  satyanarayan_katha: '📿', nischitartham: '💛', naandi: '🙏',
  pellikuturu: '💛', pellikoduku: '💛', oonjal: '🌸', kashi_yatra: '🌊',
  muhurtam: '⭐', sumangali_prarthanai: '🌺',
};

const KNOWN_TYPE_VALUES = new Set(EVENT_TYPES.map((t) => t.value));

function getTypeLabel(value: string) {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ── Searchable event type combobox ─────────────────────────────────────────
interface EventTypeComboboxProps {
  value: string;
  isOther: boolean;
  onSelect: (value: string, isOther: boolean) => void;
}

function EventTypeCombobox({ value, isOther, onSelect }: EventTypeComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const q = query.toLowerCase();
  const filtered = q
    ? EVENT_TYPES.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.value.toLowerCase().includes(q),
      )
    : EVENT_TYPES;

  // Group filtered results
  const grouped: Record<string, typeof EVENT_TYPES> = {};
  for (const t of filtered) {
    if (!grouped[t.group]) grouped[t.group] = [];
    (grouped[t.group] as typeof EVENT_TYPES).push(t);
  }

  const displayLabel = isOther ? 'Other (Custom)' : value ? getTypeLabel(value) : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left w-full"
      >
        <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || 'Select event type'}
        </span>
        <HiOutlineChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search event types..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto">
            {Object.entries(grouped).map(([group, types]) => (
              <div key={group}>
                <div className="uppercase-eyebrow" style={{ padding: '6px 12px', background: 'var(--bg-raised)', fontSize: 9 }}>
                  {group}
                </div>
                {types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      onSelect(t.value, false);
                      setOpen(false);
                      setQuery('');
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13, background: value === t.value && !isOther ? 'var(--gold-glow)' : 'transparent', color: value === t.value && !isOther ? 'var(--gold-deep)' : 'var(--ink-mid)', fontWeight: value === t.value && !isOther ? 500 : 400, cursor: 'pointer' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ))}

            {/* "Other" option always visible at bottom */}
            {!q && (
              <div>
                <div className="uppercase-eyebrow" style={{ padding: '6px 12px', background: 'var(--bg-raised)', fontSize: 9 }}>
                  Other
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelect('', true);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13, background: isOther ? 'var(--gold-glow)' : 'transparent', color: isOther ? 'var(--gold-deep)' : 'var(--ink-mid)', fontWeight: isOther ? 500 : 400, cursor: 'pointer' }}
                >
                  Other (Custom)
                </button>
              </div>
            )}

            {Object.keys(grouped).length === 0 && q && (
              <div className="px-4 py-3 text-sm text-gray-500">
                No match — select{' '}
                <button
                  type="button"
                  style={{ color: 'var(--gold-deep)', textDecoration: 'underline', background: 'transparent', cursor: 'pointer', fontSize: 13 }}
                  onClick={() => {
                    onSelect('', true);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  Other (Custom)
                </button>{' '}
                to enter your own.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface EventFormData {
  name: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_id: string | null;
  theme: string;
  description: string;
  dress_code: string;
  estimated_guests: number;
  color_palette: { primary: string };
}

const DEFAULT_FORM: EventFormData = {
  name: '',
  event_type: '',
  event_date: '',
  start_time: '',
  end_time: '',
  venue_id: null,
  theme: '',
  description: '',
  dress_code: '',
  estimated_guests: 0,
  color_palette: { primary: '#8B0000' },
};

function getEventFormState(event?: any): EventFormData {
  if (!event) return DEFAULT_FORM;
  const colorPalette =
    typeof event.color_palette === 'string'
      ? JSON.parse(event.color_palette)
      : event.color_palette || {};

  return {
    name: event.name || '',
    event_type: event.event_type || '',
    event_date: event.event_date || '',
    start_time: event.start_time || '',
    end_time: event.end_time || '',
    venue_id: event.venue_id || null,
    theme: event.theme || '',
    description: event.description || '',
    dress_code: event.dress_code || '',
    estimated_guests: event.estimated_guests || 0,
    color_palette: colorPalette,
  };
}

export default function Events() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('cards');
  const [detailEvent, setDetailEvent] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);
  const [isOtherType, setIsOtherType] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: events = [], isLoading } = useEvents();
  const { data: venues = [] } = useVenues();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const isEventFormDirty =
    JSON.stringify(formData) !== JSON.stringify(getEventFormState(editingEvent));
  const { attemptClose: attemptCloseEventModal, dialog: eventUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isEventFormDirty,
      onDiscard: () => {
        setShowEventModal(false);
        resetForm();
      },
      onSave: () => {
        (document.getElementById('event-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving: createMutation.isPending || updateMutation.isPending,
    });

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingEvent(null);
    setIsOtherType(false);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    const isCustom = event.event_type && !KNOWN_TYPE_VALUES.has(event.event_type);
    setIsOtherType(isCustom);
    setFormData(getEventFormState(event));
    setShowEventModal(true);
  };

  const handleTypeSelect = (value: string, other: boolean) => {
    setIsOtherType(other);
    setFormData((prev) => ({ ...prev, event_type: other ? '' : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_type) {
      toast.error('Please enter an event type');
      return;
    }
    try {
      const submitData = {
        ...formData,
        color_palette: JSON.stringify(formData.color_palette),
      };
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, ...submitData });
        toast.success('Event updated successfully!');
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success('Event created successfully!');
      }
      setShowEventModal(false);
      resetForm();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save event';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Event deleted successfully!');
      setDeleteConfirm(null);
      if ((selectedEvent as any)?.id === id) setSelectedEvent(null);
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    const parts = time.split(':');
    const hours = parts[0] ?? '0';
    const minutes = parts[1] ?? '00';
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--line-soft)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const EVENT_COLORS_LIST = ['#8B0000', '#B8860B', '#5C6BC0', '#2E7D32', '#6A1B9A', '#0277BD'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Festivities"
        title="Events & timeline"
        description="All events and ceremonies. Click any event to see full details."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-raised)', padding: 4, borderRadius: 10 }}>
              {[
                { mode: 'timeline' as const, Icon: HiOutlineViewList, label: 'Timeline' },
                { mode: 'cards' as const, Icon: HiOutlineViewGrid, label: 'Cards' },
              ].map(({ mode, Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                    background: viewMode === mode ? 'var(--bg-panel)' : 'transparent',
                    color: viewMode === mode ? 'var(--gold-deep)' : 'var(--ink-low)',
                    boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  <Icon style={{ width: 13, height: 13 }} /> {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowEventModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <HiOutlinePlus style={{ width: 14, height: 14 }} /> New event
            </button>
          </div>
        }
      />

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {events.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-dim)', fontSize: 13 }}>No events yet — add your first event.</div>
          )}
          {events.map((event, index) => {
            const colorPalette = typeof event.color_palette === 'string' ? JSON.parse(event.color_palette) : event.color_palette || {};
            const eventColor = (colorPalette as any).primary || EVENT_COLORS_LIST[index % EVENT_COLORS_LIST.length];
            const startTime = formatTime(event.start_time);
            const endTime = formatTime(event.end_time);
            const dateShort = new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div
                key={event.id}
                onClick={() => setDetailEvent(event)}
                style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr auto',
                  gap: 20, padding: '18px 24px', cursor: 'pointer',
                  borderTop: index > 0 ? '1px solid var(--line-soft)' : 'none',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div>
                  <div className="display" style={{ fontSize: 16, fontWeight: 500, color: eventColor }}>{dateShort.split(',')[0]}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>{startTime || '—'}</div>
                  {endTime && <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>→ {endTime}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, background: `${eventColor}18`, border: `1.5px solid ${eventColor}44` }}>
                    {EVENT_ICONS[event.event_type as keyof typeof EVENT_ICONS] || '🎊'}
                  </div>
                  <div>
                    <div className="display" style={{ fontSize: 17, color: 'var(--ink-high)' }}>{event.name}</div>
                    {event.description && <div style={{ fontSize: 12, color: 'var(--ink-low)', marginTop: 2 }}>{event.description}</div>}
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--ink-dim)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiOutlineLocationMarker style={{ width: 12, height: 12 }} />{(event as any).venues?.name || 'Venue TBD'}</span>
                      {event.estimated_guests ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiOutlineUserGroup style={{ width: 12, height: 12 }} />{event.estimated_guests} guests</span> : null}
                      {event.dress_code && <span style={{ color: eventColor }}>◆ {event.dress_code}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <HiOutlineChevronRight style={{ width: 16, height: 16, color: 'var(--ink-dim)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cards Timeline View (zigzag with curvy connectors) ── */}
      {viewMode === 'cards' && (() => {
        if (events.length === 0) {
          return (
            <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-dim)', fontSize: 13 }}>No events yet — add your first event.</div>
          );
        }
        const CARD_W = 340;
        const CARD_H = 180;
        const GAP_Y = 80;
        const OFFSET_X = 260;
        const PAD_X = 24;
        const PAD_Y = 24;
        const stepY = CARD_H + GAP_Y;
        const contentW = PAD_X * 2 + CARD_W + OFFSET_X;
        const contentH = PAD_Y * 2 + events.length * CARD_H + (events.length - 1) * GAP_Y;
        // Viewport shows ~2 cards at a time
        const viewportH = PAD_Y * 2 + 2 * CARD_H + GAP_Y;
        const anchors = events.map((_, i) => {
          const x = PAD_X + (i % 2 === 0 ? 0 : OFFSET_X);
          const y = PAD_Y + i * stepY;
          return { x, y, midX: x + CARD_W / 2, topY: y, bottomY: y + CARD_H };
        });
        return (
          <div style={{ padding: 0 }}>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: viewportH }}>
              <div style={{ position: 'relative', width: contentW, height: contentH, margin: '0 auto' }}>
                {/* Curvy connectors */}
                <svg width={contentW} height={contentH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <defs>
                    <linearGradient id="tl-line" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  {anchors.slice(0, -1).map((a, i) => {
                    const b = anchors[i + 1]!;
                    const x1 = a.midX;
                    const y1 = a.bottomY;
                    const x2 = b.midX;
                    const y2 = b.topY;
                    const cy = (y1 + y2) / 2;
                    const d = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
                    return (
                      <g key={i}>
                        <path d={d} fill="none" stroke="url(#tl-line)" strokeWidth={1.5} strokeDasharray="4 5" />
                        <circle cx={x1} cy={y1} r={3} fill="var(--gold)" opacity={0.75} />
                        <circle cx={x2} cy={y2} r={3} fill="var(--gold)" opacity={0.75} />
                      </g>
                    );
                  })}
                </svg>
                {/* Cards */}
                {events.map((event, index) => {
                  const colorPalette = typeof event.color_palette === 'string' ? JSON.parse(event.color_palette) : event.color_palette || {};
                  const eventColor = (colorPalette as any).primary || EVENT_COLORS_LIST[index % EVENT_COLORS_LIST.length];
                  const startTime = formatTime(event.start_time);
                  const a = anchors[index]!;
                  return (
                    <div
                      key={event.id}
                      onClick={() => setDetailEvent(event)}
                      className="card"
                      style={{
                        position: 'absolute', left: a.x, top: a.y,
                        width: CARD_W, height: CARD_H,
                        padding: 0, overflow: 'hidden', cursor: 'pointer',
                        transition: 'transform 150ms, box-shadow 150ms',
                        display: 'flex', flexDirection: 'column',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
                    >
                      <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `linear-gradient(135deg, ${eventColor}44, ${eventColor}11)`, flexShrink: 0 }}>
                        {EVENT_ICONS[event.event_type as keyof typeof EVENT_ICONS] || '🎊'}
                      </div>
                      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3, color: eventColor }}>
                          {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                          {startTime ? ` · ${startTime}` : ''}
                        </div>
                        <div className="display" style={{ fontSize: 15, color: 'var(--ink-high)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</div>
                        {(event as any).venues?.name && (
                          <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(event as any).venues.name}</div>
                        )}
                        <div style={{ display: 'flex', gap: 5, marginTop: 'auto', flexWrap: 'wrap' }}>
                          {event.estimated_guests ? (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'var(--bg-raised)', color: 'var(--ink-low)', border: '1px solid var(--line)' }}>{event.estimated_guests} guests</span>
                          ) : null}
                          {event.dress_code && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, border: `1px solid ${eventColor}55`, background: `${eventColor}11`, color: eventColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{event.dress_code}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Event Detail Modal ── */}
      {detailEvent && (() => {
        const ev = detailEvent;
        const colorPalette = typeof ev.color_palette === 'string' ? JSON.parse(ev.color_palette) : ev.color_palette || {};
        const eventColor = (colorPalette as any).primary || '#8B0000';
        const startTime = formatTime(ev.start_time);
        const endTime = formatTime(ev.end_time);
        return (
          <Portal>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setDetailEvent(null)}>
              <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setDetailEvent(null)} style={{ position: 'absolute', top: 14, right: 14, padding: '5px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', zIndex: 10 }}>
                  <HiOutlineX style={{ width: 14, height: 14 }} />
                </button>
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, background: `linear-gradient(135deg, ${eventColor}44, ${eventColor}11)` }}>
                  {EVENT_ICONS[ev.event_type as keyof typeof EVENT_ICONS] || '🎊'}
                </div>
                <div style={{ padding: '20px 32px 32px', textAlign: 'center' }}>
                  <Ornament mark="❋" />
                  <h2 className="display" style={{ margin: '10px 0 0', fontSize: 28, color: 'var(--ink-high)', fontWeight: 400 }}>{ev.name}</h2>
                  {(startTime || endTime) && (
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8, color: eventColor }}>
                      {new Date(ev.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
                      {startTime ? ` · ${startTime}` : ''}
                      {endTime ? ` – ${endTime}` : ''}
                    </div>
                  )}
                  {ev.description && (
                    <p className="display" style={{ fontStyle: 'italic', color: 'var(--ink-low)', fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>{ev.description}</p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24, textAlign: 'left' }}>
                    {[
                      { label: 'Venue', value: (ev as any).venues?.name || 'TBD' },
                      { label: 'Dress code', value: ev.dress_code || '—', colored: true },
                      { label: 'Guests', value: ev.estimated_guests ? `${ev.estimated_guests} attending` : '—' },
                      { label: 'Duration', value: (startTime && endTime) ? `${startTime} – ${endTime}` : startTime || '—' },
                    ].map(({ label, value, colored }) => (
                      <div key={label}>
                        <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 13, color: colored ? eventColor : 'var(--ink-mid)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setDetailEvent(null); setDeleteConfirm(ev.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--err)', background: 'transparent', cursor: 'pointer' }}
                    >
                      <HiOutlineTrash style={{ width: 13, height: 13 }} /> Delete
                    </button>
                    <button onClick={() => { setDetailEvent(null); handleEdit(ev); }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <HiOutlinePencil style={{ width: 13, height: 13 }} /> Edit
                    </button>
                    <button
                      onClick={() => { setDetailEvent(null); navigate('../guests'); }}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                    >
                      <HiOutlineUserGroup style={{ width: 13, height: 13 }} /> Manage guests
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        );
      })()}

      {/* Add / Edit modal */}
      {showEventModal && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={attemptCloseEventModal}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>Festivities</div>
                  <h2 className="display" style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}>{editingEvent ? 'Edit event' : 'Add event'}</h2>
                </div>
                <button onClick={attemptCloseEventModal} style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}>
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form id="event-form" onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Event Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., Mehendi Night, Ring Ceremony" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Event Type *</label>
                    <EventTypeCombobox value={isOtherType ? '' : formData.event_type} isOther={isOtherType} onSelect={handleTypeSelect} />
                    {isOtherType && (
                      <input type="text" value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} className="input" style={{ marginTop: 8 }} placeholder="Describe your custom event type" required autoFocus />
                    )}
                  </div>
                  <div>
                    <label className="label">Event Date *</label>
                    <DatePicker value={formData.event_date} onChange={(v) => setFormData({ ...formData, event_date: v })} placeholder="Select event date" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Venue</label>
                    <select value={formData.venue_id || ''} onChange={(e) => setFormData({ ...formData, venue_id: e.target.value || null })} className="input">
                      <option value="">Select Venue</option>
                      {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Start Time *</label>
                    <TimePicker value={formData.start_time} onChange={(v) => setFormData({ ...formData, start_time: v })} placeholder="Start time" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">End Time</label>
                    <TimePicker value={formData.end_time} onChange={(v) => setFormData({ ...formData, end_time: v })} placeholder="End time" />
                  </div>
                  <div>
                    <label className="label">Estimated Guests</label>
                    <input type="number" value={formData.estimated_guests || ''} onChange={(e) => setFormData({ ...formData, estimated_guests: Math.max(0, parseInt(e.target.value, 10) || 0) })} className="input" placeholder="0" min={0} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Theme</label>
                    <input type="text" value={formData.theme} onChange={(e) => setFormData({ ...formData, theme: e.target.value })} className="input" placeholder="e.g., Royal, Floral, Boho" />
                  </div>
                  <div>
                    <label className="label">Theme Color</label>
                    <input type="color" value={formData.color_palette.primary} onChange={(e) => setFormData({ ...formData, color_palette: { primary: e.target.value } })} className="input" style={{ height: 40 }} />
                  </div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Event description, rituals, schedule details…" />
                </div>

                <div>
                  <label className="label">Dress Code</label>
                  <input type="text" value={formData.dress_code} onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })} className="input" placeholder="e.g., Traditional Indian, White & Gold, Pastel" />
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={attemptCloseEventModal} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary" style={{ flex: 1, opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1 }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editingEvent ? 'Update event' : 'Create event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      {eventUnsavedDialog}

      {deleteConfirm && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setDeleteConfirm(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <h3 className="display" style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}>Delete event?</h3>
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
    </div>
  );
}
