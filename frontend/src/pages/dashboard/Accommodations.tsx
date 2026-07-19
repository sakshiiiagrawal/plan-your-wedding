import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useViewPreference } from '../../hooks/useViewPreference';
import {
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlineSearch,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlinePencil,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
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
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableItem from '../../components/SortableItem';
import { SectionHeader } from '../../components/ui';
import {
  useAccommodationsPageData,
  useUpdateAccommodation,
  useUpdateRoom,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  useSetGuestStayStatus,
  useUpdateGuest,
  useExportAllocations,
  useReorderVenues,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Portal from '../../components/Portal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { Checkbox } from '../../components/ui';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { currencySymbol } from '../../utils/currency';

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

interface RoomCategoryEntry {
  room_type: string;
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

interface ImportAllocation {
  guest: string;
  room: string;
  venue: string;
  action?: 'created' | 'updated';
}

interface ImportError {
  guest?: string;
  row?: number;
  sheet?: string;
  error?: string;
  errors?: string[];
  suggestions?: Array<{ name: string; similarity: string; side: string }>;
}

interface NewRoom {
  room: string;
  venue: string;
}

interface ImportResults {
  success?: boolean;
  count: number;
  created?: number;
  updated?: number;
  failedCount?: number;
  roomsCreated?: number;
  error?: string;
  errors?: ImportError[];
  allocations?: ImportAllocation[];
  newRooms?: NewRoom[];
}

interface AllocationFormData {
  room_id: string | null;
  guest_ids: string[];
  check_in_date: string;
  check_out_date: string;
}

interface GuestOption {
  id: string;
  first_name: string;
  last_name: string | null;
  needs_accommodation: boolean;
  side?: string | undefined;
}

interface EditAllocationState {
  id: string;
  currentGuests: GuestOption[];
}

interface AccommodationGuest extends GuestOption {
  is_vip?: boolean;
}

interface RoomAllocationSummary {
  id: string;
  guest_ids?: string[];
  checked_in_guest_ids?: string[];
  checked_out_guest_ids?: string[];
  check_in_date?: string | null;
  check_out_date?: string | null;
  guests?: AccommodationGuest[];
}

interface VenueRoom {
  id: string;
  room_number: string;
  room_type?: string;
  capacity?: number;
  rate_per_night?: number | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  room_allocations?: RoomAllocationSummary[];
}

interface AllocationVenue {
  id: string;
  name: string;
  city?: string;
  default_check_in_date?: string | null;
  default_check_out_date?: string | null;
  rooms?: VenueRoom[];
  total_rooms_booked?: number;
  [key: string]: unknown;
}

type EnrichedVenue = AllocationVenue & {
  totalCapacity: number;
  guestsAllocated: number;
  estCost: number;
  roomsBooked: number;
};

function fuzzyMatch(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => t.includes(word));
}

function formatStayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function rangesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && aOut > bIn;
}

function nightsBetween(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
  return Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000,
  );
}

// Distinct nights the room is occupied (union of stay ranges — a room night is paid once).
function roomOccupiedNights(allocs: RoomAllocationSummary[]): number {
  const ranges = allocs
    .filter((a) => a.check_in_date && a.check_out_date)
    .map((a) => ({ start: a.check_in_date!, end: a.check_out_date! }))
    .sort((a, b) => a.start.localeCompare(b.start));
  let total = 0;
  let curStart = '';
  let curEnd = '';
  for (const r of ranges) {
    if (!curStart) {
      curStart = r.start;
      curEnd = r.end;
      continue;
    }
    if (r.start > curEnd) {
      total += nightsBetween(curStart, curEnd);
      curStart = r.start;
      curEnd = r.end;
    } else if (r.end > curEnd) {
      curEnd = r.end;
    }
  }
  total += nightsBetween(curStart, curEnd);
  return total;
}

export default function Accommodations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pageData, isLoading, error } = useAccommodationsPageData();
  const allocationMatrix = pageData?.matrix ?? [];
  const exportAllocations = useExportAllocations();
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportResultsModal, setShowImportResultsModal] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [addingRoomsToHotelId, setAddingRoomsToHotelId] = useState<string | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryEntry[]>([]);
  const [initialRoomCategories, setInitialRoomCategories] = useState<RoomCategoryEntry[]>([]);
  const [allocationFormData, setAllocationFormData] = useState<AllocationFormData>({
    room_id: null,
    guest_ids: [],
    check_in_date: '',
    check_out_date: '',
  });
  const [initialAllocationFormData, setInitialAllocationFormData] = useState<AllocationFormData>({
    room_id: null,
    guest_ids: [],
    check_in_date: '',
    check_out_date: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateHotelMutation = useUpdateAccommodation();
  const updateRoomMutation = useUpdateRoom();
  const createAllocationMutation = useCreateAllocation();
  const updateAllocationMutation = useUpdateAllocation();
  const deleteAllocationMutation = useDeleteAllocation();
  const setGuestStayStatusMutation = useSetGuestStayStatus();
  const updateGuestMutation = useUpdateGuest();

  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [editAllocation, setEditAllocation] = useState<EditAllocationState | null>(null);
  const [modalRoomContext, setModalRoomContext] = useState<{
    roomId: string;
    capacity: number;
    roomNumber: string;
    otherAllocations: { check_in_date: string; check_out_date: string; count: number }[];
  } | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomValues, setEditRoomValues] = useState<{
    room_number: string;
    capacity: number;
    check_in_date: string;
    check_out_date: string;
  }>({
    room_number: '',
    capacity: 0,
    check_in_date: '',
    check_out_date: '',
  });
  const [panelView, setPanelView] = useViewPreference<'rooms' | 'schedule'>(
    'accommodations.panelView',
    'rooms',
  );
  const [scheduleDate, setScheduleDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [applyDatesToExisting, setApplyDatesToExisting] = useState(false);
  const [guestPanelSearch, setGuestPanelSearch] = useState('');
  const [noRoomNeededCollapsed, setNoRoomNeededCollapsed] = useState(true);
  const [collapsedHotelIds, setCollapsedHotelIds] = useState<Set<string>>(() => new Set());
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [editHotelDateValues, setEditHotelDateValues] = useState<{
    default_check_in_date: string;
    default_check_out_date: string;
  }>({ default_check_in_date: '', default_check_out_date: '' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resetRoomForm = () => {
    setRoomCategories([]);
    setInitialRoomCategories([]);
    setAddingRoomsToHotelId(null);
  };

  const buildRoomsPayload = (existingRooms: VenueRoom[]) => {
    const validCategories = roomCategories.filter((c) => Number(c.count) > 0);
    if (validCategories.length === 0) return [];
    const existingCountByType = existingRooms.reduce((acc: Record<string, number>, r) => {
      const roomType = r.room_type;
      if (!roomType) return acc;
      acc[roomType] = (acc[roomType] || 0) + 1;
      return acc;
    }, {});
    const rooms: Array<{
      room_number: string;
      room_type: string;
      capacity?: number;
      rate_per_night?: number;
    }> = [];
    for (const entry of validCategories) {
      const preset = PRESET_BY_LABEL[entry.room_type];
      const prefix = preset?.prefix ?? entry.room_type.slice(0, 4).toUpperCase().replace(/\s/g, '');
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

  const resetAllocationForm = () => {
    setAllocationFormData({
      room_id: null,
      guest_ids: [],
      check_in_date: '',
      check_out_date: '',
    });
    setGuestSearchQuery('');
    setEditAllocation(null);
    setModalRoomContext(null);
    setInitialAllocationFormData({
      room_id: null,
      guest_ids: [],
      check_in_date: '',
      check_out_date: '',
    });
  };
  const isRoomFormDirty = JSON.stringify(roomCategories) !== JSON.stringify(initialRoomCategories);
  const { attemptClose: attemptCloseRoomModal, dialog: roomUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isRoomFormDirty,
      onDiscard: () => {
        setShowRoomModal(false);
        resetRoomForm();
      },
      onSave: () => {
        (document.getElementById('room-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving: updateHotelMutation.isPending,
    });
  const isAllocationFormDirty =
    JSON.stringify(allocationFormData) !== JSON.stringify(initialAllocationFormData);
  const { attemptClose: attemptCloseAllocationModal, dialog: allocationUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isAllocationFormDirty,
      onDiscard: () => {
        setShowAllocationModal(false);
        resetAllocationForm();
      },
      onSave: () => {
        (document.getElementById('allocation-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving:
        createAllocationMutation.isPending ||
        updateAllocationMutation.isPending ||
        deleteAllocationMutation.isPending,
    });
  useModalDismiss(showRoomModal, attemptCloseRoomModal);
  useModalDismiss(showAllocationModal, attemptCloseAllocationModal);
  useModalDismiss(showImportModal, () => setShowImportModal(false));
  useModalDismiss(showImportResultsModal, () => setShowImportResultsModal(false));

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const hotel = enrichedHotels.find((h: EnrichedVenue) => h.id === addingRoomsToHotelId);
    const existingRooms = (hotel?.rooms || []) as VenueRoom[];
    const rooms = buildRoomsPayload(existingRooms);
    if (rooms.length === 0) {
      toast.error('Add at least one room category with a count');
      return;
    }
    try {
      await updateHotelMutation.mutateAsync({ id: addingRoomsToHotelId!, rooms });
      toast.success(`${rooms.length} room${rooms.length !== 1 ? 's' : ''} added successfully!`);
      setShowRoomModal(false);
      resetRoomForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Failed to add rooms';
      toast.error(errorMessage);
    }
  };

  const handleAllocationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Flag any newly-selected guests who didn't have needs_accommodation set
      const guestsToFlag = (allGuests as GuestOption[]).filter(
        (g) => allocationFormData.guest_ids.includes(g.id) && !g.needs_accommodation,
      );
      await Promise.all(
        guestsToFlag.map((g) =>
          updateGuestMutation.mutateAsync({ id: g.id, needs_accommodation: true }),
        ),
      );

      if (editAllocation) {
        if (allocationFormData.guest_ids.length === 0) {
          // All guests removed — delete the allocation
          await deleteAllocationMutation.mutateAsync(editAllocation.id);
          toast.success('Room unassigned successfully');
        } else {
          await updateAllocationMutation.mutateAsync({
            id: editAllocation.id,
            guest_ids: allocationFormData.guest_ids,
            check_in_date: allocationFormData.check_in_date,
            check_out_date: allocationFormData.check_out_date,
          });
          toast.success('Room assignment updated!');
        }
      } else {
        await createAllocationMutation.mutateAsync(allocationFormData);
        toast.success('Guest assigned successfully!');
      }

      setShowAllocationModal(false);
      resetAllocationForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Failed to save assignment';
      toast.error(errorMessage);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/venues/allocations/template/all-venues/download', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = 'all_venues_room_allocation.xlsx';
      link.setAttribute('download', filename);
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
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/venues/allocations/import/all-venues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResults(response.data);

      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowImportModal(false);
      setShowImportResultsModal(true);
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: { error?: string; errors?: ImportError[]; invalidAllocations?: ImportError[] };
        };
      };
      const errorMessage = error.response?.data?.error || 'Failed to import allocations';
      const errors = error.response?.data?.errors || error.response?.data?.invalidAllocations;

      setImportResults({
        success: false,
        error: errorMessage,
        errors: errors || [],
        count: 0,
      });

      setShowImportModal(false);
      setShowImportResultsModal(true);
    } finally {
      setIsImporting(false);
    }
  };

  const enrichedHotels = useMemo(() => {
    return allocationMatrix.map((hotel: AllocationVenue) => {
      const rooms = hotel.rooms || [];
      const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
      const guestsAllocated = new Set(
        rooms.flatMap((room) =>
          ((room.room_allocations || []) as Array<{ guest_ids?: string[] }>).flatMap(
            (a) => a.guest_ids ?? [],
          ),
        ),
      ).size;
      const estCost = rooms.reduce((sum, room) => {
        const rate = room.rate_per_night ?? 0;
        if (!rate) return sum;
        return sum + roomOccupiedNights(room.room_allocations || []) * rate;
      }, 0);

      return {
        ...hotel,
        totalCapacity,
        guestsAllocated,
        estCost,
        roomsBooked: hotel.total_rooms_booked || rooms.length,
      };
    });
  }, [allocationMatrix]);

  const reorderMutation = useReorderVenues();
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const handleHotelDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = enrichedHotels.map((h: EnrichedVenue) => h.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderMutation.mutate(arrayMove(ids, oldIndex, newIndex));
  };

  const allGuests = (pageData?.guests ?? []) as AccommodationGuest[];

  const assignedGuestIds = useMemo(() => {
    const ids = new Set<string>();
    (allocationMatrix as AllocationVenue[]).forEach((venue) => {
      (venue.rooms || []).forEach((room) => {
        (room.room_allocations || []).forEach((alloc) => {
          (alloc.guest_ids || []).forEach((id: string) => ids.add(id));
        });
      });
    });
    return ids;
  }, [allocationMatrix]);

  const roomLookup = useMemo(() => {
    const map = new Map<
      string,
      { room_number: string; venue_name: string; check_in: string; check_out: string }[]
    >();
    (allocationMatrix as AllocationVenue[]).forEach((venue) => {
      (venue.rooms || []).forEach((room) => {
        (room.room_allocations || []).forEach((alloc) => {
          (alloc.guest_ids || []).forEach((id: string) => {
            const list = map.get(id) ?? [];
            list.push({
              room_number: room.room_number,
              venue_name: venue.name,
              check_in: alloc.check_in_date ?? '',
              check_out: alloc.check_out_date ?? '',
            });
            map.set(id, list);
          });
        });
      });
    });
    map.forEach((list) => list.sort((a, b) => a.check_in.localeCompare(b.check_in)));
    return map;
  }, [allocationMatrix]);

  const guestSegments = useMemo(
    () => ({
      unassigned: allGuests.filter(
        (g: AccommodationGuest) => g.needs_accommodation && !assignedGuestIds.has(g.id),
      ),
      assigned: allGuests.filter(
        (g: AccommodationGuest) => g.needs_accommodation && assignedGuestIds.has(g.id),
      ),
      noRoomNeeded: allGuests.filter((g: AccommodationGuest) => !g.needs_accommodation),
    }),
    [allGuests, assignedGuestIds],
  );

  const filteredGuestSegments = useMemo(() => {
    if (!guestPanelSearch.trim()) return guestSegments;
    const filter = (g: AccommodationGuest) =>
      fuzzyMatch(guestPanelSearch, `${g.first_name} ${g.last_name ?? ''}`);
    return {
      unassigned: guestSegments.unassigned.filter(filter),
      assigned: guestSegments.assigned.filter(filter),
      noRoomNeeded: guestSegments.noRoomNeeded.filter(filter),
    };
  }, [guestSegments, guestPanelSearch]);

  const schedule = useMemo(() => {
    type Entry = {
      guest: AccommodationGuest;
      venue: string;
      room: string;
      alloc: RoomAllocationSummary;
    };
    const arriving: Entry[] = [];
    const departing: Entry[] = [];
    const staying: Entry[] = [];
    (allocationMatrix as AllocationVenue[]).forEach((venue) =>
      (venue.rooms || []).forEach((room) =>
        (room.room_allocations || []).forEach((alloc) => {
          (alloc.guests || []).forEach((guest) => {
            const entry: Entry = { guest, venue: venue.name, room: room.room_number, alloc };
            if (alloc.check_in_date === scheduleDate) arriving.push(entry);
            else if (alloc.check_out_date === scheduleDate) departing.push(entry);
            else if (
              (alloc.check_in_date ?? '') < scheduleDate &&
              (alloc.check_out_date ?? '') > scheduleDate
            )
              staying.push(entry);
          });
        }),
      ),
    );
    return { arriving, departing, staying };
  }, [allocationMatrix, scheduleDate]);

  const guestStatus = (
    alloc: RoomAllocationSummary,
    guestId: string,
  ): 'expected' | 'checked_in' | 'checked_out' => {
    if ((alloc.checked_out_guest_ids ?? []).includes(guestId)) return 'checked_out';
    if ((alloc.checked_in_guest_ids ?? []).includes(guestId)) return 'checked_in';
    return 'expected';
  };

  const cycleGuestStatus = (alloc: RoomAllocationSummary, guestId: string) => {
    const current = guestStatus(alloc, guestId);
    const next =
      current === 'expected' ? 'checked_in' : current === 'checked_in' ? 'checked_out' : 'expected';
    setGuestStayStatusMutation.mutate(
      { allocationId: alloc.id, guestId, status: next },
      {
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { message?: string; error?: string } } };
          toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to update');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-low">Loading accommodations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading accommodations: {(error as Error).message}</div>
      </div>
    );
  }

  const renderGuestRow = (
    guest: AccommodationGuest,
    stays?: { room_number: string; venue_name: string; check_in: string; check_out: string }[],
    draggable = false,
  ) => (
    <div
      key={guest.id}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              setDraggingGuestId(guest.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('guestId', guest.id);
            }
          : undefined
      }
      onDragEnd={draggable ? () => setDraggingGuestId(null) : undefined}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-opacity ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${draggingGuestId === guest.id ? 'opacity-40' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-ink-high truncate">
            {[guest.first_name, guest.last_name].filter(Boolean).join(' ')}
          </span>
          {guest.side === 'bride' && <span className="badge-bride text-xs">Bride</span>}
          {guest.side === 'groom' && <span className="badge-groom text-xs">Groom</span>}
          {guest.is_vip && <span className="badge bg-gold-100 text-gold-800 text-xs">VIP</span>}
        </div>
        {stays &&
          stays.map((r, i) => (
            <p key={i} className="text-xs text-ink-dim mt-0.5">
              Room {r.room_number} · {r.venue_name} · {formatStayDate(r.check_in)}→
              {formatStayDate(r.check_out)}
            </p>
          ))}
      </div>
      {draggable && <span className="text-ink-dim text-xs select-none">⠿</span>}
    </div>
  );

  const openCreateStayModal = (
    room: VenueRoom,
    guestIds: string[],
    checkIn: string,
    checkOut: string,
  ) => {
    const allocations = room.room_allocations || [];
    setEditAllocation(null);
    const nextForm = {
      room_id: room.id,
      guest_ids: guestIds,
      check_in_date: checkIn,
      check_out_date: checkOut,
    };
    setAllocationFormData(nextForm);
    setInitialAllocationFormData(nextForm);
    setModalRoomContext({
      roomId: room.id,
      capacity: room.capacity ?? 2,
      roomNumber: room.room_number,
      otherAllocations: allocations.map((a) => ({
        check_in_date: a.check_in_date ?? '',
        check_out_date: a.check_out_date ?? '',
        count: (a.guest_ids ?? []).length,
      })),
    });
    setGuestSearchQuery('');
    setShowAllocationModal(true);
  };

  const handleDropOnAllocation = async (
    room: VenueRoom,
    hotel: EnrichedVenue,
    alloc: RoomAllocationSummary | null,
  ) => {
    setDropTargetKey(null);
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    if (!guestId) return;

    const guest = allGuests.find((g: AccommodationGuest) => g.id === guestId);
    const capacity = room.capacity ?? 2;
    const allocations = room.room_allocations || [];

    try {
      if (alloc) {
        if ((alloc.guest_ids ?? []).includes(guestId)) {
          toast('Guest is already in this stay');
          return;
        }
        const overlappingOthers = allocations
          .filter(
            (a) =>
              a.id !== alloc.id &&
              rangesOverlap(
                a.check_in_date ?? '',
                a.check_out_date ?? '',
                alloc.check_in_date ?? '',
                alloc.check_out_date ?? '',
              ),
          )
          .reduce((s, a) => s + (a.guest_ids ?? []).length, 0);
        if ((alloc.guest_ids ?? []).length + overlappingOthers >= capacity) {
          toast.error(`This stay is full (${capacity}/${capacity})`);
          return;
        }
        if (guest && !guest.needs_accommodation) {
          await updateGuestMutation.mutateAsync({ id: guestId, needs_accommodation: true });
        }
        await updateAllocationMutation.mutateAsync({
          id: alloc.id,
          guest_ids: [...(alloc.guest_ids ?? []), guestId],
          check_in_date: alloc.check_in_date ?? '',
          check_out_date: alloc.check_out_date ?? '',
        });
      } else {
        // Empty room — no existing stay to inherit dates from.
        if (!hotel.default_check_in_date || !hotel.default_check_out_date) {
          openCreateStayModal(room, [guestId], '', '');
          return;
        }
        if (guest && !guest.needs_accommodation) {
          await updateGuestMutation.mutateAsync({ id: guestId, needs_accommodation: true });
        }
        await createAllocationMutation.mutateAsync({
          room_id: room.id,
          guest_ids: [guestId],
          check_in_date: hotel.default_check_in_date,
          check_out_date: hotel.default_check_out_date,
        });
      }

      const guestName = guest
        ? [guest.first_name, guest.last_name].filter(Boolean).join(' ')
        : 'Guest';
      toast.success(`${guestName} assigned to Room ${room.room_number}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to assign guest');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Stay & Rooms"
        title="Accommodations & Room Allocation"
        description="Tap a guest chip to cycle: expected → checked in → checked out"
        action={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-outline flex items-center gap-2"
            >
              <HiOutlineUpload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => exportAllocations.mutate()}
              disabled={exportAllocations.isPending}
              className="btn-outline flex items-center gap-2"
            >
              <HiOutlineDownload className="w-4 h-4" />
              Export Excel
            </button>
            <button onClick={() => navigate('../venues')} className="btn-primary">
              Add Venue
            </button>
          </div>
        }
      />

      {allocationMatrix.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-16 gap-4">
          <div className="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto">
            <HiOutlineOfficeBuilding className="w-10 h-10 text-gold-600" />
          </div>
          <div>
            <h2 className="text-xl display font-semibold text-ink-high mb-2">
              No accommodation venues yet
            </h2>
            <p className="text-ink-low text-sm max-w-sm">
              Add a venue in the Venues page and enable &quot;Has Accommodation&quot; to start
              managing room allocations here.
            </p>
          </div>
          <button onClick={() => navigate('../venues')} className="btn-primary mt-2">
            Go to Venues
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT PANEL - Guest Panel */}
          <div className="lg:w-2/5 w-full">
            <div className="card print-expand max-h-[calc(100vh-14rem)] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Guests</h2>
                <span className="badge bg-gold-100 text-gold-800 text-xs">
                  {guestSegments.unassigned.length + guestSegments.assigned.length} needing rooms
                </span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={guestPanelSearch}
                  onChange={(e) => setGuestPanelSearch(e.target.value)}
                  className="input input-neu pl-9 py-2 text-sm"
                />
                {guestPanelSearch && (
                  <button
                    onClick={() => setGuestPanelSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink-mid"
                  >
                    <HiOutlineX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Unassigned section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
                    Unassigned ({filteredGuestSegments.unassigned.length})
                  </span>
                  {filteredGuestSegments.unassigned.length > 0 && (
                    <span className="ml-auto text-xs text-ink-dim italic">drag to assign</span>
                  )}
                </div>
                {filteredGuestSegments.unassigned.length > 0 ? (
                  filteredGuestSegments.unassigned.map((g: AccommodationGuest) =>
                    renderGuestRow(g, undefined, true),
                  )
                ) : (
                  <p className="text-xs italic text-ink-dim px-2">
                    {guestPanelSearch ? 'No matches' : 'All guests assigned'}
                  </p>
                )}
              </div>

              {/* Assigned section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
                    Assigned ({filteredGuestSegments.assigned.length})
                  </span>
                </div>
                {filteredGuestSegments.assigned.length > 0 ? (
                  filteredGuestSegments.assigned.map((g: AccommodationGuest) =>
                    renderGuestRow(g, roomLookup.get(g.id), true),
                  )
                ) : (
                  <p className="text-xs italic text-ink-dim px-2">
                    {guestPanelSearch ? 'No matches' : 'No guests assigned yet'}
                  </p>
                )}
              </div>

              {/* No Room Needed section (collapsible) */}
              <div>
                <button
                  onClick={() => setNoRoomNeededCollapsed(!noRoomNeededCollapsed)}
                  className="flex items-center gap-2 w-full mb-2 hover:opacity-80"
                >
                  <span className="w-2 h-2 rounded-full bg-ink-dim flex-shrink-0" />
                  <span className="text-xs font-semibold text-ink-low uppercase tracking-wide flex-1 text-left">
                    No Room Needed ({filteredGuestSegments.noRoomNeeded.length})
                  </span>
                  {noRoomNeededCollapsed ? (
                    <HiOutlineChevronDown className="w-4 h-4 text-ink-dim" />
                  ) : (
                    <HiOutlineChevronUp className="w-4 h-4 text-ink-dim" />
                  )}
                </button>
                {!noRoomNeededCollapsed &&
                  filteredGuestSegments.noRoomNeeded.map((g: AccommodationGuest) =>
                    renderGuestRow(g),
                  )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Venues & Rooms */}
          <div className="flex-1 space-y-4">
            {/* View toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPanelView('rooms')}
                className={`badge text-xs px-3 py-1 ${
                  panelView === 'rooms'
                    ? 'bg-maroon-100 text-maroon-800'
                    : 'bg-surface-highest text-ink-mid'
                }`}
              >
                Rooms
              </button>
              <button
                onClick={() => setPanelView('schedule')}
                className={`badge text-xs px-3 py-1 ${
                  panelView === 'schedule'
                    ? 'bg-maroon-100 text-maroon-800'
                    : 'bg-surface-highest text-ink-mid'
                }`}
              >
                Schedule
              </button>
            </div>

            {panelView === 'schedule' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date(`${scheduleDate}T00:00:00`);
                      d.setDate(d.getDate() - 1);
                      setScheduleDate(d.toISOString().slice(0, 10));
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-highest text-ink-low"
                    title="Previous day"
                  >
                    ‹
                  </button>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                  />
                  <button
                    onClick={() => {
                      const d = new Date(`${scheduleDate}T00:00:00`);
                      d.setDate(d.getDate() + 1);
                      setScheduleDate(d.toISOString().slice(0, 10));
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-highest text-ink-low"
                    title="Next day"
                  >
                    ›
                  </button>
                </div>

                {(
                  [
                    ['Arriving', schedule.arriving, 'checked_in'],
                    ['Departing', schedule.departing, 'checked_out'],
                    ['In-house', schedule.staying, null],
                  ] as const
                ).map(([label, entries, toggleTo]) => {
                  const byVenue = new Map<string, typeof entries>();
                  entries.forEach((entry) => {
                    const list = byVenue.get(entry.venue) ?? [];
                    list.push(entry);
                    byVenue.set(entry.venue, list as typeof entries);
                  });
                  return (
                    <div key={label}>
                      <h3 className="section-title text-sm mb-2">
                        {label} ({entries.length})
                      </h3>
                      {entries.length === 0 ? (
                        <p className="text-xs italic text-ink-dim px-2">
                          {label === 'Arriving'
                            ? 'No one arriving this day'
                            : label === 'Departing'
                              ? 'No one departing this day'
                              : 'No one in-house this day'}
                        </p>
                      ) : (
                        Array.from(byVenue.entries()).map(([venue, list]) => {
                          const arrivedCount = list.filter(
                            (e) => guestStatus(e.alloc, e.guest.id) !== 'expected',
                          ).length;
                          return (
                            <div key={venue} className="mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-ink-mid">{venue}</span>
                                {label === 'Arriving' && (
                                  <span className="text-xs text-ink-dim">
                                    {arrivedCount} of {list.length} arrived
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {list.map((entry) => {
                                  const status = guestStatus(entry.alloc, entry.guest.id);
                                  return (
                                    <div
                                      key={`${entry.alloc.id}-${entry.guest.id}`}
                                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-raised"
                                    >
                                      <span className="text-sm text-ink-high flex-1 truncate">
                                        {[entry.guest.first_name, entry.guest.last_name]
                                          .filter(Boolean)
                                          .join(' ')}
                                      </span>
                                      <span className="text-xs text-ink-low">
                                        Room {entry.room}
                                      </span>
                                      <span className="text-xs text-ink-dim whitespace-nowrap">
                                        {formatStayDate(entry.alloc.check_in_date)}→
                                        {formatStayDate(entry.alloc.check_out_date)}
                                      </span>
                                      {toggleTo && (
                                        <button
                                          onClick={() =>
                                            cycleGuestStatus(entry.alloc, entry.guest.id)
                                          }
                                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            status === 'checked_out'
                                              ? 'bg-surface-highest text-ink-dim line-through'
                                              : status === 'checked_in'
                                                ? 'ring-1 ring-green-400 bg-green-50 text-green-800'
                                                : 'bg-surface-highest text-ink-mid'
                                          }`}
                                          title="Tap to cycle status"
                                        >
                                          {status === 'checked_out'
                                            ? 'checked out'
                                            : status === 'checked_in'
                                              ? '✓ checked in'
                                              : label === 'Departing'
                                                ? 'check out'
                                                : 'check in'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {panelView === 'rooms' && (
              <DndContext
                sensors={dragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleHotelDragEnd}
              >
                <SortableContext
                  items={enrichedHotels.map((h: EnrichedVenue) => h.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {enrichedHotels.map((hotel: EnrichedVenue) => {
                    const handleHotelDateSave = async () => {
                      try {
                        await updateHotelMutation.mutateAsync({
                          id: hotel.id,
                          default_check_in_date: editHotelDateValues.default_check_in_date || null,
                          default_check_out_date:
                            editHotelDateValues.default_check_out_date || null,
                        });
                        if (
                          applyDatesToExisting &&
                          editHotelDateValues.default_check_in_date &&
                          editHotelDateValues.default_check_out_date
                        ) {
                          const allocationIds = (hotel.rooms || []).flatMap((room) =>
                            (room.room_allocations || []).map((a) => a.id),
                          );
                          const results = await Promise.allSettled(
                            allocationIds.map((id) =>
                              updateAllocationMutation.mutateAsync({
                                id,
                                check_in_date: editHotelDateValues.default_check_in_date,
                                check_out_date: editHotelDateValues.default_check_out_date,
                              }),
                            ),
                          );
                          const failed = results.filter((r) => r.status === 'rejected').length;
                          if (failed > 0) {
                            toast.error(
                              `${failed} stay${failed !== 1 ? 's' : ''} couldn't be updated (room full or guest conflicts). The rest were updated.`,
                            );
                          } else if (allocationIds.length > 0) {
                            toast.success(
                              `Dates applied to ${allocationIds.length} stay${allocationIds.length !== 1 ? 's' : ''}`,
                            );
                          }
                        }
                        setEditingHotelId(null);
                        toast.success('Default dates updated');
                      } catch {
                        toast.error('Failed to update default dates');
                      }
                    };

                    const isEditingDates = editingHotelId === hotel.id;
                    const isHotelCollapsed = collapsedHotelIds.has(hotel.id);

                    const toggleHotelCollapsed = () => {
                      setCollapsedHotelIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(hotel.id)) next.delete(hotel.id);
                        else next.add(hotel.id);
                        return next;
                      });
                    };

                    return (
                      <SortableItem id={hotel.id} key={hotel.id}>
                        {({ handleProps }) => (
                          <div className="card space-y-4">
                            {/* Venue header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <button
                                  {...handleProps}
                                  type="button"
                                  className="mt-0.5 p-1.5 rounded-lg hover:bg-surface-highest text-ink-dim flex-shrink-0"
                                  aria-label="Drag to reorder venue"
                                >
                                  <HiOutlineDotsVertical className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={toggleHotelCollapsed}
                                  className="mt-0.5 p-1.5 rounded-lg hover:bg-surface-highest text-ink-low flex-shrink-0"
                                  aria-expanded={!isHotelCollapsed}
                                  title={isHotelCollapsed ? 'Expand' : 'Collapse'}
                                >
                                  {isHotelCollapsed ? (
                                    <HiOutlineChevronDown className="w-5 h-5" />
                                  ) : (
                                    <HiOutlineChevronUp className="w-5 h-5" />
                                  )}
                                </button>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <HiOutlineOfficeBuilding className="w-5 h-5 text-gold-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-semibold text-ink-high">{hotel.name}</h3>
                                    {hotel.city && (
                                      <p className="text-xs text-ink-low">{hotel.city}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap sm:justify-end">
                                <span
                                  className="text-sm text-ink-low"
                                  title={
                                    hotel.estCost > 0
                                      ? 'Estimated room cost: occupied nights × rate per night'
                                      : undefined
                                  }
                                >
                                  {hotel.rooms?.length || 0} rooms · sleeps {hotel.totalCapacity} ·{' '}
                                  {hotel.guestsAllocated} assigned
                                  {hotel.estCost > 0 &&
                                    ` · est. ${currencySymbol()}${hotel.estCost}`}
                                </span>
                                <button
                                  onClick={() => {
                                    setAddingRoomsToHotelId(hotel.id);
                                    // First rooms for this hotel: prefill a
                                    // saveable batch so one click can finish.
                                    const nextRoomCategories = [
                                      {
                                        ...DEFAULT_CATEGORY,
                                        count: hotel.rooms?.length ? '' : 10,
                                      },
                                    ];
                                    setRoomCategories(nextRoomCategories);
                                    setInitialRoomCategories(nextRoomCategories);
                                    setShowRoomModal(true);
                                  }}
                                  className="btn-outline text-sm flex items-center gap-1.5"
                                >
                                  <HiOutlinePlus className="w-4 h-4" />
                                  Add Room
                                </button>
                              </div>
                            </div>

                            {!isHotelCollapsed && (
                              <>
                                {/* Default dates row */}
                                {isEditingDates ? (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="w-[360px]">
                                      <DateRangePicker
                                        startValue={editHotelDateValues.default_check_in_date}
                                        endValue={editHotelDateValues.default_check_out_date}
                                        onChange={({ start, end }) =>
                                          setEditHotelDateValues({
                                            default_check_in_date: start,
                                            default_check_out_date: end,
                                          })
                                        }
                                        size="sm"
                                        startLabel="Check-in"
                                        endLabel="Check-out"
                                      />
                                    </div>
                                    <button
                                      onClick={handleHotelDateSave}
                                      disabled={updateHotelMutation.isPending}
                                      className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                    >
                                      {updateHotelMutation.isPending ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingHotelId(null)}
                                      className="text-xs text-ink-low hover:text-ink-mid"
                                    >
                                      Cancel
                                    </button>
                                    <label className="flex items-center gap-1.5 text-xs text-ink-low cursor-pointer">
                                      <Checkbox
                                        checked={applyDatesToExisting}
                                        onChange={(e) => setApplyDatesToExisting(e.target.checked)}
                                      />
                                      Also apply to all existing stays at this hotel
                                    </label>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-4 group/dates">
                                    <div className="flex items-center gap-1.5 text-xs text-ink-low">
                                      <span>Default check-in:</span>
                                      <span className="font-medium text-ink-mid">
                                        {hotel.default_check_in_date ?? (
                                          <span className="italic text-ink-low">not set</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-ink-low">
                                      <span>Check-out:</span>
                                      <span className="font-medium text-ink-mid">
                                        {hotel.default_check_out_date ?? (
                                          <span className="italic text-ink-low">not set</span>
                                        )}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditHotelDateValues({
                                          default_check_in_date: hotel.default_check_in_date ?? '',
                                          default_check_out_date:
                                            hotel.default_check_out_date ?? '',
                                        });
                                        setApplyDatesToExisting(false);
                                        setEditingHotelId(hotel.id);
                                        setCollapsedHotelIds((prev) => {
                                          const next = new Set(prev);
                                          next.delete(hotel.id);
                                          return next;
                                        });
                                      }}
                                      className="opacity-0 group-hover/dates:opacity-100 transition-opacity text-ink-dim hover:text-ink-mid"
                                      title="Edit default dates"
                                    >
                                      <HiOutlinePencil className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Room list */}
                                <div className="border-t border-gold-100 pt-4">
                                  {draggingGuestId && hotel.rooms && hotel.rooms.length > 0 && (
                                    <p className="text-xs text-green-600 font-medium mb-2 animate-pulse">
                                      ↓ Drop guest onto a stay to assign
                                    </p>
                                  )}
                                  {hotel.rooms && hotel.rooms.length > 0 ? (
                                    <div className="space-y-3">
                                      {hotel.rooms.map((room: VenueRoom) => {
                                        const allocations = (
                                          [
                                            ...(room.room_allocations || []),
                                          ] as RoomAllocationSummary[]
                                        ).sort((a, b) =>
                                          (a.check_in_date ?? '').localeCompare(
                                            b.check_in_date ?? '',
                                          ),
                                        );
                                        const capacity = room.capacity ?? 2;
                                        const isEditingRoom = editingRoomId === room.id;

                                        const handleRoomEditSave = async () => {
                                          try {
                                            await updateRoomMutation.mutateAsync({
                                              id: room.id,
                                              room_number: editRoomValues.room_number,
                                              capacity: editRoomValues.capacity,
                                              check_in_date: editRoomValues.check_in_date || null,
                                              check_out_date: editRoomValues.check_out_date || null,
                                            });
                                            setEditingRoomId(null);
                                            toast.success('Room updated');
                                          } catch (err: unknown) {
                                            const e = err as {
                                              response?: {
                                                data?: { message?: string; error?: string };
                                              };
                                            };
                                            toast.error(
                                              e.response?.data?.message ||
                                                e.response?.data?.error ||
                                                'Failed to update room',
                                            );
                                          }
                                        };

                                        const startEditRoom = () => {
                                          setEditingRoomId(room.id);
                                          setEditRoomValues({
                                            room_number: room.room_number,
                                            capacity: capacity,
                                            check_in_date: room.check_in_date ?? '',
                                            check_out_date: room.check_out_date ?? '',
                                          });
                                        };

                                        const openEditStay = (alloc: RoomAllocationSummary) => {
                                          setEditAllocation({
                                            id: alloc.id,
                                            currentGuests: (alloc.guests ?? []).map((g) => ({
                                              id: g.id,
                                              first_name: g.first_name,
                                              last_name: g.last_name,
                                              needs_accommodation: g.needs_accommodation ?? true,
                                              side: g.side,
                                            })),
                                          });
                                          const nextForm = {
                                            room_id: room.id,
                                            guest_ids: alloc.guest_ids ?? [],
                                            check_in_date: alloc.check_in_date ?? '',
                                            check_out_date: alloc.check_out_date ?? '',
                                          };
                                          setAllocationFormData(nextForm);
                                          setInitialAllocationFormData(nextForm);
                                          setModalRoomContext({
                                            roomId: room.id,
                                            capacity,
                                            roomNumber: room.room_number,
                                            otherAllocations: allocations
                                              .filter((a) => a.id !== alloc.id)
                                              .map((a) => ({
                                                check_in_date: a.check_in_date ?? '',
                                                check_out_date: a.check_out_date ?? '',
                                                count: (a.guest_ids ?? []).length,
                                              })),
                                          });
                                          setGuestSearchQuery('');
                                          setShowAllocationModal(true);
                                        };

                                        const openAddStay = () => {
                                          const latestCheckout = allocations
                                            .map((a) => a.check_out_date ?? '')
                                            .filter(Boolean)
                                            .sort()
                                            .pop();
                                          const prefillIn =
                                            latestCheckout ?? hotel.default_check_in_date ?? '';
                                          const prefillOut = latestCheckout
                                            ? ''
                                            : (hotel.default_check_out_date ?? '');
                                          openCreateStayModal(room, [], prefillIn, prefillOut);
                                        };

                                        return (
                                          <div
                                            key={room.id}
                                            className="rounded-lg bg-surface-raised p-3 group space-y-2"
                                          >
                                            {/* Room header line */}
                                            <div className="flex flex-wrap items-center gap-2">
                                              {isEditingRoom ? (
                                                <input
                                                  className="input py-1 px-2 text-sm w-24"
                                                  value={editRoomValues.room_number}
                                                  onChange={(e) =>
                                                    setEditRoomValues({
                                                      ...editRoomValues,
                                                      room_number: e.target.value,
                                                    })
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRoomEditSave();
                                                    if (e.key === 'Escape') setEditingRoomId(null);
                                                  }}
                                                  autoFocus
                                                />
                                              ) : (
                                                <span className="inline-flex items-center gap-1.5 font-medium text-sm text-ink-high">
                                                  Room {room.room_number}
                                                  <button
                                                    onClick={startEditRoom}
                                                    className="opacity-0 group-hover:opacity-100 text-ink-dim hover:text-ink-mid transition-opacity"
                                                    title="Edit room"
                                                  >
                                                    <HiOutlinePencil className="w-3.5 h-3.5" />
                                                  </button>
                                                </span>
                                              )}
                                              {room.room_type && (
                                                <span className="badge bg-surface-highest text-ink-mid text-xs capitalize">
                                                  {room.room_type}
                                                </span>
                                              )}
                                              {isEditingRoom ? (
                                                <input
                                                  type="number"
                                                  min={1}
                                                  className="input py-1 px-2 text-xs w-16"
                                                  value={editRoomValues.capacity}
                                                  onChange={(e) =>
                                                    setEditRoomValues({
                                                      ...editRoomValues,
                                                      capacity: Number(e.target.value),
                                                    })
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRoomEditSave();
                                                    if (e.key === 'Escape') setEditingRoomId(null);
                                                  }}
                                                />
                                              ) : (
                                                <span className="text-xs text-ink-low">
                                                  sleeps {capacity}
                                                </span>
                                              )}
                                              {!isEditingRoom &&
                                                (room.check_in_date || room.check_out_date) && (
                                                  <span className="text-xs text-ink-dim">
                                                    booked {formatStayDate(room.check_in_date)} →{' '}
                                                    {formatStayDate(room.check_out_date)}
                                                  </span>
                                                )}

                                              <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                                                {isEditingRoom ? (
                                                  <>
                                                    <button
                                                      onClick={handleRoomEditSave}
                                                      disabled={updateRoomMutation.isPending}
                                                      className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                                    >
                                                      {updateRoomMutation.isPending
                                                        ? 'Saving…'
                                                        : 'Save'}
                                                    </button>
                                                    <button
                                                      onClick={() => setEditingRoomId(null)}
                                                      className="text-xs text-ink-low hover:text-ink-mid"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </>
                                                ) : (
                                                  <button
                                                    onClick={openAddStay}
                                                    className="text-xs text-gold-600 hover:text-gold-700 font-medium inline-flex items-center gap-1"
                                                  >
                                                    <HiOutlinePlus className="w-3.5 h-3.5" />
                                                    Add stay
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Booked-window editor */}
                                            {isEditingRoom && (
                                              <div className="w-[360px] max-w-full">
                                                <DateRangePicker
                                                  startValue={editRoomValues.check_in_date}
                                                  endValue={editRoomValues.check_out_date}
                                                  onChange={({ start, end }) =>
                                                    setEditRoomValues({
                                                      ...editRoomValues,
                                                      check_in_date: start,
                                                      check_out_date: end,
                                                    })
                                                  }
                                                  size="sm"
                                                  startLabel="Booked-from"
                                                  endLabel="Booked-to"
                                                />
                                              </div>
                                            )}

                                            {/* Allocation sub-rows */}
                                            {allocations.length > 0 ? (
                                              allocations.map((alloc) => {
                                                const stayGuests = alloc.guests ?? [];
                                                const stayCount = (alloc.guest_ids ?? []).length;
                                                const overlappingOthers = allocations
                                                  .filter(
                                                    (a) =>
                                                      a.id !== alloc.id &&
                                                      rangesOverlap(
                                                        a.check_in_date ?? '',
                                                        a.check_out_date ?? '',
                                                        alloc.check_in_date ?? '',
                                                        alloc.check_out_date ?? '',
                                                      ),
                                                  )
                                                  .reduce(
                                                    (s, a) => s + (a.guest_ids ?? []).length,
                                                    0,
                                                  );
                                                const stayFull =
                                                  stayCount + overlappingOthers >= capacity;
                                                const isDropTarget = dropTargetKey === alloc.id;
                                                const nights = nightsBetween(
                                                  alloc.check_in_date,
                                                  alloc.check_out_date,
                                                );
                                                const rate = room.rate_per_night ?? 0;
                                                return (
                                                  <div
                                                    key={alloc.id}
                                                    onDragOver={
                                                      draggingGuestId
                                                        ? (e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'move';
                                                            setDropTargetKey(alloc.id);
                                                          }
                                                        : undefined
                                                    }
                                                    onDragLeave={
                                                      draggingGuestId
                                                        ? () => setDropTargetKey(null)
                                                        : undefined
                                                    }
                                                    onDrop={
                                                      draggingGuestId
                                                        ? (e) => {
                                                            e.preventDefault();
                                                            handleDropOnAllocation(
                                                              room,
                                                              hotel,
                                                              alloc,
                                                            );
                                                          }
                                                        : undefined
                                                    }
                                                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded-lg transition-colors ${
                                                      isDropTarget
                                                        ? stayFull
                                                          ? 'bg-red-50 ring-2 ring-red-300'
                                                          : 'bg-green-50 ring-2 ring-green-300'
                                                        : 'bg-surface-panel'
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0 sm:w-56 flex-shrink-0">
                                                      <span className="text-xs text-ink-low whitespace-nowrap">
                                                        {formatStayDate(alloc.check_in_date)} →{' '}
                                                        {formatStayDate(alloc.check_out_date)}
                                                      </span>
                                                      <span
                                                        className={`text-xs font-medium ${
                                                          stayCount >= capacity
                                                            ? 'text-red-600'
                                                            : 'text-ink-mid'
                                                        }`}
                                                      >
                                                        {stayCount}/{capacity}
                                                      </span>
                                                      {rate > 0 && nights > 0 && (
                                                        <span className="text-xs text-ink-dim">
                                                          · {nights} night{nights !== 1 ? 's' : ''}{' '}
                                                          · {currencySymbol()}
                                                          {nights * rate}
                                                        </span>
                                                      )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 flex-1">
                                                      {stayGuests.length > 0 ? (
                                                        stayGuests.map((g) => {
                                                          const status = guestStatus(alloc, g.id);
                                                          return (
                                                            <button
                                                              type="button"
                                                              key={g.id}
                                                              onClick={() =>
                                                                cycleGuestStatus(alloc, g.id)
                                                              }
                                                              title="Tap to cycle: expected → checked in → checked out"
                                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                status === 'checked_out'
                                                                  ? 'bg-surface-highest text-ink-dim line-through'
                                                                  : status === 'checked_in'
                                                                    ? 'ring-1 ring-green-400 bg-green-50 text-green-800'
                                                                    : g.side === 'bride'
                                                                      ? 'bg-pink-100 text-pink-800'
                                                                      : g.side === 'groom'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-surface-highest text-ink-mid'
                                                              }`}
                                                            >
                                                              {status === 'checked_in' && '✓ '}
                                                              {[g.first_name, g.last_name]
                                                                .filter(Boolean)
                                                                .join(' ')}
                                                            </button>
                                                          );
                                                        })
                                                      ) : (
                                                        <span className="text-xs italic text-ink-dim">
                                                          No guests
                                                        </span>
                                                      )}
                                                    </div>

                                                    <button
                                                      onClick={() => openEditStay(alloc)}
                                                      className="text-xs text-gold-600 hover:text-gold-700 font-medium flex-shrink-0"
                                                    >
                                                      Edit
                                                    </button>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div
                                                onDragOver={
                                                  draggingGuestId
                                                    ? (e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setDropTargetKey(room.id);
                                                      }
                                                    : undefined
                                                }
                                                onDragLeave={
                                                  draggingGuestId
                                                    ? () => setDropTargetKey(null)
                                                    : undefined
                                                }
                                                onDrop={
                                                  draggingGuestId
                                                    ? (e) => {
                                                        e.preventDefault();
                                                        handleDropOnAllocation(room, hotel, null);
                                                      }
                                                    : undefined
                                                }
                                                className={`p-2 rounded-lg text-xs italic text-ink-dim transition-colors ${
                                                  dropTargetKey === room.id
                                                    ? 'bg-green-50 ring-2 ring-green-300'
                                                    : ''
                                                }`}
                                              >
                                                Available — drag a guest here or add a stay
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between py-3">
                                      <p className="text-sm text-ink-dim italic">
                                        No rooms added yet
                                      </p>
                                      <button
                                        onClick={() => navigate('../venues')}
                                        className="text-xs text-gold-700 hover:text-gold-900 font-medium"
                                      >
                                        Add rooms from Venues page →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showRoomModal &&
        (() => {
          const hotel = enrichedHotels.find((h: EnrichedVenue) => h.id === addingRoomsToHotelId);
          const existingRooms = (hotel?.rooms || []) as VenueRoom[];
          const existingGroups: Record<string, number> = existingRooms.reduce(
            (acc: Record<string, number>, r: VenueRoom) => {
              const roomType = r.room_type;
              if (!roomType) return acc;
              acc[roomType] = (acc[roomType] || 0) + 1;
              return acc;
            },
            {},
          );
          const totalToAdd = roomCategories.reduce((s, c) => s + (Number(c.count) || 0), 0);

          return (
            <Portal>
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={attemptCloseRoomModal}
              >
                <div
                  className="bg-surface-panel rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-6 border-b border-gold-200">
                    <div>
                      <h2 className="text-xl display font-semibold text-ink-high">Add Rooms</h2>
                      {hotel && <p className="text-sm text-ink-low mt-0.5">{hotel.name}</p>}
                    </div>
                    <button
                      onClick={attemptCloseRoomModal}
                      className="p-2 hover:bg-surface-highest rounded-lg"
                    >
                      <HiOutlineX className="w-5 h-5" />
                    </button>
                  </div>

                  <form id="room-form" onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                    <div className="border border-gold-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-ink-high">Room Categories</h3>
                          <p className="text-xs text-ink-dim mt-0.5">
                            Rooms auto-numbered per category (e.g. STD-1, STD-2…)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRoomCategories((prev) => [...prev, { ...DEFAULT_CATEGORY }])
                          }
                          className="text-xs text-gold-700 hover:text-gold-800 font-medium border border-gold-300 rounded-lg px-3 py-1 hover:bg-gold-50 transition-colors"
                        >
                          + Add Category
                        </button>
                      </div>

                      {existingRooms.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-ink-low">Already added rooms:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(existingGroups).map(([type, count]) => (
                              <span
                                key={type}
                                className="badge bg-surface-highest text-ink-mid text-xs"
                              >
                                {type} × {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {roomCategories.length === 0 && (
                        <p className="text-xs text-ink-dim text-center py-2">
                          No categories yet. Click &quot;+ Add Category&quot; to bulk-add rooms.
                        </p>
                      )}

                      {roomCategories.length > 0 && (
                        <div className="space-y-2 overflow-x-auto">
                          <div className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2 min-w-[440px]">
                            <span className="text-xs text-ink-low font-medium">Category</span>
                            <span className="text-xs text-ink-low font-medium">Count</span>
                            <span className="text-xs text-ink-low font-medium">Occupancy</span>
                            <span className="text-xs text-ink-low font-medium">Rate / night</span>
                            <span />
                          </div>
                          {roomCategories.map((cat, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2 items-center min-w-[440px]"
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
                              {cat.is_custom ? (
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
                              ) : (
                                /* Presets know their occupancy — nothing to ask. */
                                <span
                                  className="text-sm text-ink-low text-center"
                                  title="Sleeps"
                                >
                                  {cat.capacity || 2}
                                </span>
                              )}
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
                              <button
                                type="button"
                                onClick={() =>
                                  setRoomCategories((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <HiOutlineX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <p className="text-xs text-ink-dim pt-1">
                            Total rooms to add:{' '}
                            <span className="font-medium text-maroon-700">{totalToAdd}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2 justify-end">
                      <button type="button" onClick={attemptCloseRoomModal} className="btn-outline">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateHotelMutation.isPending || totalToAdd === 0}
                        className="btn-primary disabled:opacity-50"
                      >
                        {updateHotelMutation.isPending
                          ? 'Adding...'
                          : `Add ${totalToAdd > 0 ? totalToAdd : ''} Room${totalToAdd !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          );
        })()}

      {/* Assign Guest to Room Modal */}
      {showAllocationModal &&
        (() => {
          const currentIds = new Set(editAllocation?.currentGuests.map((g) => g.id) ?? []);
          const stayCount = (g: AccommodationGuest) => roomLookup.get(g.id)?.length ?? 0;
          const all = allGuests as AccommodationGuest[];
          const groups = {
            current: all.filter((g) => currentIds.has(g.id)),
            unassignedNeeds: all.filter(
              (g) => !currentIds.has(g.id) && g.needs_accommodation && stayCount(g) === 0,
            ),
            assignedElsewhere: all.filter((g) => !currentIds.has(g.id) && stayCount(g) > 0),
            notFlagged: all.filter(
              (g) => !currentIds.has(g.id) && !g.needs_accommodation && stayCount(g) === 0,
            ),
          };
          const modalGuests: AccommodationGuest[] = [
            ...groups.current,
            ...groups.unassignedNeeds,
            ...groups.assignedElsewhere,
            ...groups.notFlagged,
          ];
          const searchFilter = (g: AccommodationGuest) =>
            fuzzyMatch(guestSearchQuery, `${g.first_name} ${g.last_name ?? ''}`);
          const filteredCurrent = groups.current.filter(searchFilter);
          const filteredNeeds = groups.unassignedNeeds.filter(searchFilter);
          const filteredElsewhere = groups.assignedElsewhere.filter(searchFilter);
          const filteredNotFlagged = groups.notFlagged.filter(searchFilter);

          const selectedGuests = modalGuests.filter((g) =>
            allocationFormData.guest_ids.includes(g.id),
          );
          const isEditing = !!editAllocation;

          const selectedCount = allocationFormData.guest_ids.length;
          const overlapUsed = (modalRoomContext?.otherAllocations ?? [])
            .filter((a) =>
              allocationFormData.check_in_date && allocationFormData.check_out_date
                ? rangesOverlap(
                    a.check_in_date,
                    a.check_out_date,
                    allocationFormData.check_in_date,
                    allocationFormData.check_out_date,
                  )
                : true,
            )
            .reduce((s, a) => s + a.count, 0);
          const effectiveCapacity = Math.max(0, (modalRoomContext?.capacity ?? 2) - overlapUsed);
          const atCapacity = selectedCount >= effectiveCapacity;

          const toggleGuest = (guestId: string) => {
            const isSelected = allocationFormData.guest_ids.includes(guestId);
            if (!isSelected && atCapacity) return; // block adding beyond capacity
            setAllocationFormData({
              ...allocationFormData,
              guest_ids: isSelected
                ? allocationFormData.guest_ids.filter((id) => id !== guestId)
                : [...allocationFormData.guest_ids, guestId],
            });
            // Clear search so user can find next guest
            if (!isSelected) {
              setGuestSearchQuery('');
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }
          };

          const renderOption = (guest: AccommodationGuest) => {
            const isSelected = allocationFormData.guest_ids.includes(guest.id);
            const isDisabled = !isSelected && atCapacity;
            const otherStays = currentIds.has(guest.id) ? [] : (roomLookup.get(guest.id) ?? []);
            return (
              <label
                key={guest.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isSelected
                      ? 'bg-maroon-50 cursor-pointer'
                      : 'hover:bg-surface-raised cursor-pointer'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => toggleGuest(guest.id)}
                  disabled={isDisabled}
                />
                <HiOutlineUser className="w-4 h-4 text-ink-dim flex-shrink-0" />
                <span className="text-sm text-ink-high flex-1">
                  {[guest.first_name, guest.last_name].filter(Boolean).join(' ')}
                  {otherStays.length > 0 && (
                    <span className="block text-xs text-ink-dim">
                      {otherStays
                        .map(
                          (s) =>
                            `${s.venue_name} ${formatStayDate(s.check_in)}→${formatStayDate(s.check_out)}`,
                        )
                        .join(' · ')}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="text-xs text-maroon-600 font-medium">Selected</span>
                )}
              </label>
            );
          };

          return (
            <Portal>
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={attemptCloseAllocationModal}
              >
                <div
                  className="bg-surface-panel rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gold-200 flex-shrink-0">
                    <div>
                      <h2 className="text-xl display font-semibold text-ink-high">
                        {isEditing ? 'Edit Room Assignment' : 'Assign Guests to Room'}
                      </h2>
                      <p className="text-sm text-ink-low mt-0.5">
                        {isEditing
                          ? 'Update guests or dates — uncheck guests to remove them'
                          : 'Select guests to assign, then set their stay dates'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {modalRoomContext && (
                        <div className="flex flex-col items-end">
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                              atCapacity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            <span>
                              {selectedCount} / {effectiveCapacity}
                            </span>
                            <span className="text-xs opacity-75">capacity</span>
                          </div>
                          {overlapUsed > 0 && (
                            <span className="text-[11px] text-ink-dim mt-1">
                              {overlapUsed} spot{overlapUsed !== 1 ? 's' : ''} taken by another stay
                              on these dates
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={attemptCloseAllocationModal}
                      className="p-2 hover:bg-surface-highest rounded-lg"
                    >
                      <HiOutlineX className="w-5 h-5" />
                    </button>
                  </div>

                  <form
                    id="allocation-form"
                    onSubmit={handleAllocationSubmit}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Guest selector */}
                      <div>
                        <label className="label mb-2">Guests *</label>

                        {modalGuests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center min-h-[140px] border border-gold-200 rounded-xl bg-gold-50 p-6 text-center gap-3">
                            <HiOutlineUserGroup className="w-8 h-8 text-gold-400" />
                            <div>
                              <p className="text-sm font-medium text-ink-mid">
                                No guests added yet
                              </p>
                              <p className="text-xs text-ink-low mt-1">
                                Add guests before assigning them to a room
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Selected chips */}
                            {selectedGuests.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {selectedGuests.map((g) => (
                                  <span
                                    key={g.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-maroon-100 text-maroon-800 rounded-full text-sm font-medium"
                                  >
                                    <HiOutlineUser className="w-3.5 h-3.5" />
                                    {[g.first_name, g.last_name].filter(Boolean).join(' ')}
                                    <button
                                      type="button"
                                      onClick={() => toggleGuest(g.id)}
                                      className="ml-0.5 hover:text-maroon-600"
                                    >
                                      <HiOutlineX className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Search bar */}
                            <div className="relative mb-3">
                              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
                              <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search guests by name…"
                                value={guestSearchQuery}
                                onChange={(e) => setGuestSearchQuery(e.target.value)}
                                className="input input-neu pl-9"
                                autoFocus
                              />
                              {guestSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setGuestSearchQuery('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink-mid"
                                >
                                  <HiOutlineX className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Capacity warning */}
                            {atCapacity && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <span className="font-medium">Room is full</span>
                                <span className="text-red-500">
                                  — uncheck a guest to swap them out
                                </span>
                              </div>
                            )}

                            {/* Guest list */}
                            <div className="border border-gold-200 rounded-xl overflow-hidden divide-y divide-gold-100">
                              {/* In this stay (edit mode only) */}
                              {isEditing && filteredCurrent.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-maroon-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-maroon-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-maroon-700 uppercase tracking-wide">
                                      In this stay ({filteredCurrent.length})
                                    </span>
                                  </div>
                                  {filteredCurrent.map(renderOption)}
                                </>
                              )}

                              {/* Needs accommodation section */}
                              {filteredNeeds.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-green-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                                      Needs accommodation ({filteredNeeds.length})
                                    </span>
                                  </div>
                                  {filteredNeeds.map(renderOption)}
                                </>
                              )}

                              {/* Staying elsewhere section */}
                              {filteredElsewhere.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-blue-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                      Staying elsewhere ({filteredElsewhere.length})
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 bg-blue-50/60 border-b border-gold-100">
                                    <p className="text-xs text-blue-700">
                                      These guests already have a stay. You can add another one as
                                      long as the dates don&apos;t overlap — overlapping dates will
                                      be rejected on save.
                                    </p>
                                  </div>
                                  {filteredElsewhere.map(renderOption)}
                                </>
                              )}

                              {/* Other guests section */}
                              {filteredNotFlagged.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-amber-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                      Other guests — not flagged for accommodation (
                                      {filteredNotFlagged.length})
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 bg-amber-50/60 border-b border-gold-100">
                                    <p className="text-xs text-amber-700">
                                      Selecting any of these guests will automatically mark them as
                                      needing accommodation.
                                    </p>
                                  </div>
                                  {filteredNotFlagged.map(renderOption)}
                                </>
                              )}

                              {filteredCurrent.length === 0 &&
                                filteredNeeds.length === 0 &&
                                filteredElsewhere.length === 0 &&
                                filteredNotFlagged.length === 0 && (
                                  <div className="px-4 py-6 text-center text-sm text-ink-low">
                                    No guests match &quot;{guestSearchQuery}&quot;
                                  </div>
                                )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Dates */}
                      {modalGuests.length > 0 && (
                        <div>
                          <label className="label">Check-in & Check-out Dates *</label>
                          <DateRangePicker
                            startValue={allocationFormData.check_in_date}
                            endValue={allocationFormData.check_out_date}
                            onChange={({ start, end }) =>
                              setAllocationFormData({
                                ...allocationFormData,
                                check_in_date: start,
                                check_out_date: end,
                              })
                            }
                            required
                            startLabel="Check-in"
                            endLabel="Check-out"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 p-6 border-t border-gold-200 flex-shrink-0 justify-end">
                      {modalGuests.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            attemptCloseAllocationModal();
                            navigate('../guests');
                          }}
                          className="btn-primary"
                        >
                          Add Guests
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={attemptCloseAllocationModal}
                            className="btn-outline"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={
                              createAllocationMutation.isPending ||
                              updateAllocationMutation.isPending ||
                              deleteAllocationMutation.isPending ||
                              (!isEditing && allocationFormData.guest_ids.length === 0)
                            }
                            className={`btn-primary disabled:opacity-50 ${
                              isEditing && allocationFormData.guest_ids.length === 0
                                ? 'bg-red-600 hover:bg-red-700'
                                : ''
                            }`}
                          >
                            {createAllocationMutation.isPending ||
                            updateAllocationMutation.isPending ||
                            deleteAllocationMutation.isPending
                              ? 'Saving…'
                              : isEditing
                                ? allocationFormData.guest_ids.length === 0
                                  ? 'Remove All & Unassign Room'
                                  : `Save Changes`
                                : `Assign ${allocationFormData.guest_ids.length > 0 ? allocationFormData.guest_ids.length : ''} Guest${allocationFormData.guest_ids.length !== 1 ? 's' : ''}`}
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </Portal>
          );
        })()}

      {/* Import Modal */}
      {roomUnsavedDialog}
      {allocationUnsavedDialog}
      {showImportModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            <div
              className="bg-surface-panel rounded-2xl w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl display font-semibold text-ink-high">
                  Import Room Allocations from Excel
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-surface-highest rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Import Instructions</h3>
                  <ol className="list-decimal ml-5 space-y-2 text-sm text-ink-mid">
                    <li>
                      <strong>Download the sample template</strong> - It contains separate sheets
                      for each venue with example room allocations
                    </li>
                    <li>
                      <strong>Edit the Excel file:</strong> Go to the sheet for the venue you want
                      to import and replace the sample data with your actual room assignments
                    </li>
                    <li>
                      <strong>Use the Guest List sheet:</strong> The last sheet contains all your
                      guests grouped by side. Copy exact names from there into the Guest 1, Guest 2,
                      Guest 3 columns
                    </li>
                    <li>
                      <strong>Mandatory fields:</strong> Room Number*, at least one Guest (Guest 1),
                      Check-in Date*, and Check-out Date*
                    </li>
                    <li>
                      <strong>Multiple guests per room:</strong> Assign up to 6 guests per room
                      using the Guest 1–6 columns. Optional Room Type and Capacity columns are used
                      when the room doesn&apos;t exist yet.
                    </li>
                  </ol>
                </div>

                <div className="flex justify-center py-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="btn-outline text-sm flex items-center gap-2"
                  >
                    <HiOutlineDownload className="w-4 h-4" />
                    Download Sample Template
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />

                <div className="pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <HiOutlineUpload className="w-5 h-5" />
                    {isImporting ? 'Importing...' : 'Import Data from Excel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Import Results Modal */}
      {showImportResultsModal && importResults && (
        <Portal>
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowImportResultsModal(false);
              setImportResults(null);
            }}
          >
            <div
              className="bg-surface-panel rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl display font-semibold text-ink-high">Import Results</h2>
                <button
                  onClick={() => {
                    setShowImportResultsModal(false);
                    setImportResults(null);
                  }}
                  className="p-2 hover:bg-surface-highest rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-700">
                      {importResults.count || 0}
                    </div>
                    <div className="text-sm text-green-600 font-medium">Successful Imports</div>
                  </div>
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-red-700">
                      {importResults.failedCount || importResults.errors?.length || 0}
                    </div>
                    <div className="text-sm text-red-600 font-medium">Failed Imports</div>
                  </div>
                </div>

                {importResults.count > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <span className="text-xl">✓</span>
                      Successfully Imported
                    </h3>
                    <div className="text-sm text-ink-mid space-y-3">
                      <div className="flex gap-4">
                        <p>
                          <strong>{importResults.count} room allocations</strong> processed
                        </p>
                        {importResults.created && importResults.created > 0 && (
                          <span className="text-green-700">({importResults.created} created)</span>
                        )}
                        {importResults.updated && importResults.updated > 0 && (
                          <span className="text-blue-700">({importResults.updated} updated)</span>
                        )}
                      </div>

                      {importResults.allocations && importResults.allocations.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-green-800 mb-2">Guest Allocations:</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {importResults.allocations.map((allocation, idx) => (
                              <div
                                key={idx}
                                className={`bg-surface-panel border rounded p-2 text-xs ${
                                  allocation.action === 'updated'
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-green-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="font-medium text-ink-high">
                                      {allocation.guest}
                                    </span>
                                    <span className="text-ink-low">→</span>
                                    <span className="text-ink-mid">Room {allocation.room}</span>
                                    {allocation.action === 'updated' && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        Updated
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-ink-low text-right">{allocation.venue}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {importResults.roomsCreated && importResults.roomsCreated > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-green-800">
                            Created {importResults.roomsCreated} new rooms:
                          </p>
                          <ul className="list-disc ml-5 mt-1">
                            {importResults.newRooms?.map((room, idx) => (
                              <li key={idx}>
                                Room {room.room} at {room.venue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {((importResults.errors && importResults.errors.length > 0) ||
                  importResults.success === false) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <span className="text-xl">✗</span>
                      Failed Imports
                    </h3>

                    {importResults.success === false && (
                      <div className="mb-4 p-3 bg-red-100 rounded border border-red-300">
                        <p className="font-medium text-red-800">{importResults.error}</p>
                      </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {importResults.errors?.map((err, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-panel border border-red-200 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-ink-high">
                                {err.guest || `Row ${err.row}`}
                              </div>
                              <div className="text-xs text-ink-low mt-1">
                                Sheet: {err.sheet} • Row: {err.row}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-red-700 mb-2">
                            {err.error || err.errors?.join(', ')}
                          </div>

                          {err.suggestions && err.suggestions.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <div className="text-xs font-medium text-blue-900 mb-1">
                                Did you mean one of these?
                              </div>
                              <ul className="text-xs text-blue-700 space-y-1">
                                {err.suggestions.map((suggestion, sIdx) => (
                                  <li key={sIdx}>
                                    • {suggestion.name} ({suggestion.similarity}, {suggestion.side}{' '}
                                    side)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Next Steps:</strong> Fix the errors in your Excel file and try
                          importing again. Make sure to copy guest names exactly from the Guest List
                          sheet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {importResults.count > 0 &&
                  (!importResults.errors || importResults.errors.length === 0) && (
                    <div className="text-center p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="text-5xl mb-3">🎉</div>
                      <h3 className="text-xl font-bold text-green-800 mb-2">All Done!</h3>
                      <p className="text-green-700">
                        All room allocations were imported successfully. Your data is now available
                        on the accommodations page.
                      </p>
                    </div>
                  )}
              </div>

              <div className="flex gap-3 p-6 border-t border-gold-200 justify-end">
                <button
                  onClick={() => {
                    setShowImportResultsModal(false);
                    setImportResults(null);
                  }}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
