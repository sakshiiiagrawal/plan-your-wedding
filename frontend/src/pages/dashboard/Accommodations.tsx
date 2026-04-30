import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
} from 'react-icons/hi';
import {
  useAllocationMatrix,
  useUnassignedGuests,
  useGuests,
  useUpdateAccommodation,
  useUpdateRoom,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  useUpdateGuest,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Portal from '../../components/Portal';
import DatePicker from '../../components/ui/DatePicker';
import DateRangePicker from '../../components/ui/DateRangePicker';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';

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

function fuzzyMatch(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => t.includes(word));
}

export default function Accommodations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allocationMatrix = [], isLoading, error } = useAllocationMatrix();
  const { data: unassignedGuests = [] } = useUnassignedGuests();
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
  const updateGuestMutation = useUpdateGuest();

  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [editAllocation, setEditAllocation] = useState<EditAllocationState | null>(null);
  const [roomCapacity, setRoomCapacity] = useState<number>(0);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomValues, setEditRoomValues] = useState<{ room_number: string; capacity: number }>({
    room_number: '',
    capacity: 0,
  });
  const [guestPanelSearch, setGuestPanelSearch] = useState('');
  const [noRoomNeededCollapsed, setNoRoomNeededCollapsed] = useState(true);
  const [collapsedHotelIds, setCollapsedHotelIds] = useState<Set<string>>(() => new Set());
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [dropTargetRoomId, setDropTargetRoomId] = useState<string | null>(null);
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

  const buildRoomsPayload = (existingRooms: any[]) => {
    const validCategories = roomCategories.filter((c) => Number(c.count) > 0);
    if (validCategories.length === 0) return [];
    const existingCountByType = existingRooms.reduce((acc: Record<string, number>, r: any) => {
      acc[r.room_type] = (acc[r.room_type] || 0) + 1;
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
    setRoomCapacity(0);
    setInitialAllocationFormData({
      room_id: null,
      guest_ids: [],
      check_in_date: '',
      check_out_date: '',
    });
  };
  const isRoomFormDirty =
    JSON.stringify(roomCategories) !== JSON.stringify(initialRoomCategories);
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
  const {
    attemptClose: attemptCloseAllocationModal,
    dialog: allocationUnsavedDialog,
  } = useUnsavedChangesPrompt({
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

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const hotel = enrichedHotels.find((h: any) => h.id === addingRoomsToHotelId);
    const existingRooms = (hotel?.rooms || []) as any[];
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
      const allModalGuests = editAllocation
        ? [...editAllocation.currentGuests, ...(unassignedGuests as GuestOption[])]
        : (unassignedGuests as GuestOption[]);
      const guestsToFlag = allModalGuests.filter(
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

      queryClient.invalidateQueries({ queryKey: ['venues', 'allocation-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['venues', 'unassigned-guests'] });

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
    return allocationMatrix.map(
      (hotel: {
        id: string;
        rooms?: Array<{ capacity?: number; room_allocations?: unknown[] }>;
        total_rooms_booked?: number;
        [key: string]: unknown;
      }) => {
        const rooms = hotel.rooms || [];
        const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
        const guestsAllocated = rooms.reduce((sum, room) => {
          const allocs = (room.room_allocations || []) as Array<{ guest_ids?: string[] }>;
          return sum + allocs.reduce((s, a) => s + (a.guest_ids?.length || 0), 0);
        }, 0);

        return {
          ...hotel,
          totalCapacity,
          guestsAllocated,
          roomsBooked: hotel.total_rooms_booked || rooms.length,
        };
      },
    );
  }, [allocationMatrix]);

  const { data: allGuests = [] } = useGuests();

  const assignedGuestIds = useMemo(() => {
    const ids = new Set<string>();
    allocationMatrix.forEach((venue: any) => {
      (venue.rooms || []).forEach((room: any) => {
        (room.room_allocations || []).forEach((alloc: any) => {
          (alloc.guest_ids || []).forEach((id: string) => ids.add(id));
        });
      });
    });
    return ids;
  }, [allocationMatrix]);

  const roomLookup = useMemo(() => {
    const map = new Map<string, { room_number: string; venue_name: string }>();
    allocationMatrix.forEach((venue: any) => {
      (venue.rooms || []).forEach((room: any) => {
        (room.room_allocations || []).forEach((alloc: any) => {
          (alloc.guest_ids || []).forEach((id: string) => {
            map.set(id, { room_number: room.room_number, venue_name: venue.name });
          });
        });
      });
    });
    return map;
  }, [allocationMatrix]);

  const guestSegments = useMemo(
    () => ({
      unassigned: allGuests.filter(
        (g: any) => g.needs_accommodation && !assignedGuestIds.has(g.id),
      ),
      assigned: allGuests.filter((g: any) => g.needs_accommodation && assignedGuestIds.has(g.id)),
      noRoomNeeded: allGuests.filter((g: any) => !g.needs_accommodation),
    }),
    [allGuests, assignedGuestIds],
  );

  const filteredGuestSegments = useMemo(() => {
    if (!guestPanelSearch.trim()) return guestSegments;
    const filter = (g: any) => fuzzyMatch(guestPanelSearch, `${g.first_name} ${g.last_name ?? ''}`);
    return {
      unassigned: guestSegments.unassigned.filter(filter),
      assigned: guestSegments.assigned.filter(filter),
      noRoomNeeded: guestSegments.noRoomNeeded.filter(filter),
    };
  }, [guestSegments, guestPanelSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading accommodations...</div>
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
    guest: any,
    roomInfo?: { room_number: string; venue_name: string },
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
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-opacity ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${draggingGuestId === guest.id ? 'opacity-40' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-gray-800 truncate">
            {[guest.first_name, guest.last_name].filter(Boolean).join(' ')}
          </span>
          {guest.side === 'bride' && <span className="badge-bride text-xs">Bride</span>}
          {guest.side === 'groom' && <span className="badge-groom text-xs">Groom</span>}
          {guest.is_vip && <span className="badge bg-gold-100 text-gold-800 text-xs">VIP</span>}
        </div>
        {roomInfo && (
          <p className="text-xs text-gray-400 mt-0.5">
            Room {roomInfo.room_number} · {roomInfo.venue_name}
          </p>
        )}
      </div>
      {draggable && <span className="text-gray-300 text-xs select-none">⠿</span>}
    </div>
  );

  const handleDropOnRoom = async (room: any, hotel: any) => {
    setDropTargetRoomId(null);
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    if (!guestId) return;

    const existingAlloc = (room.room_allocations || [])[0] ?? null;
    const existingGuests = (room.room_allocations || []).flatMap((a: any) => a.guests || []);

    if (existingAlloc?.guest_ids?.includes(guestId)) {
      toast('Guest is already in this room');
      return;
    }

    const capacity = room.capacity ?? 0;
    if (capacity > 0 && existingGuests.length >= capacity) {
      toast.error(`Room ${room.room_number} is full (${capacity}/${capacity})`);
      return;
    }

    const guest = allGuests.find((g: any) => g.id === guestId);

    // Require default dates when no existing allocation to inherit from
    if (!existingAlloc && (!hotel.default_check_in_date || !hotel.default_check_out_date)) {
      toast.error(`Set default check-in/out dates for ${hotel.name} before drag-assigning guests`, {
        duration: 4000,
      });
      return;
    }

    try {
      // Flag needs_accommodation if not already set
      if (guest && !guest.needs_accommodation) {
        await updateGuestMutation.mutateAsync({ id: guestId, needs_accommodation: true });
      }

      if (existingAlloc) {
        await updateAllocationMutation.mutateAsync({
          id: existingAlloc.id,
          guest_ids: [...(existingAlloc.guest_ids ?? []), guestId],
          check_in_date: existingAlloc.check_in_date ?? '',
          check_out_date: existingAlloc.check_out_date ?? '',
        });
      } else {
        await createAllocationMutation.mutateAsync({
          room_id: room.id,
          guest_ids: [guestId],
          check_in_date: hotel.default_check_in_date ?? '',
          check_out_date: hotel.default_check_out_date ?? '',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Accommodations & Room Allocation</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <HiOutlineUpload className="w-4 h-4" />
            Import
          </button>
          <button onClick={() => navigate('../venues')} className="btn-primary">
            Add Venue
          </button>
        </div>
      </div>

      {allocationMatrix.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-16 gap-4">
          <div className="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto">
            <HiOutlineOfficeBuilding className="w-10 h-10 text-gold-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-maroon-800 mb-2">
              No accommodation venues yet
            </h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Add a venue in the Venues page and enable &quot;Has Accommodation&quot; to start managing room
              allocations here.
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
            <div className="card max-h-[calc(100vh-14rem)] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Guests</h2>
                <span className="badge bg-gold-100 text-gold-800 text-xs">
                  {guestSegments.unassigned.length + guestSegments.assigned.length} needing rooms
                </span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={guestPanelSearch}
                  onChange={(e) => setGuestPanelSearch(e.target.value)}
                  className="input pl-9 py-2 text-sm"
                />
                {guestPanelSearch && (
                  <button
                    onClick={() => setGuestPanelSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <HiOutlineX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Unassigned section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Unassigned ({filteredGuestSegments.unassigned.length})
                  </span>
                  {filteredGuestSegments.unassigned.length > 0 && (
                    <span className="ml-auto text-xs text-gray-400 italic">drag to assign</span>
                  )}
                </div>
                {filteredGuestSegments.unassigned.length > 0 ? (
                  filteredGuestSegments.unassigned.map((g: any) =>
                    renderGuestRow(g, undefined, true),
                  )
                ) : (
                  <p className="text-xs italic text-gray-400 px-2">
                    {guestPanelSearch ? 'No matches' : 'All guests assigned'}
                  </p>
                )}
              </div>

              {/* Assigned section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Assigned ({filteredGuestSegments.assigned.length})
                  </span>
                </div>
                {filteredGuestSegments.assigned.length > 0 ? (
                  filteredGuestSegments.assigned.map((g: any) =>
                    renderGuestRow(g, roomLookup.get(g.id)),
                  )
                ) : (
                  <p className="text-xs italic text-gray-400 px-2">
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
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1 text-left">
                    No Room Needed ({filteredGuestSegments.noRoomNeeded.length})
                  </span>
                  {noRoomNeededCollapsed ? (
                    <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <HiOutlineChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {!noRoomNeededCollapsed &&
                  filteredGuestSegments.noRoomNeeded.map((g: any) => renderGuestRow(g))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Venues & Rooms */}
          <div className="flex-1 space-y-4">
            {enrichedHotels.map((hotel: any) => {
              const handleHotelDateSave = async () => {
                try {
                  await updateHotelMutation.mutateAsync({
                    id: hotel.id,
                    default_check_in_date: editHotelDateValues.default_check_in_date || null,
                    default_check_out_date: editHotelDateValues.default_check_out_date || null,
                  });
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
                <div key={hotel.id} className="card space-y-4">
                  {/* Venue header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={toggleHotelCollapsed}
                        className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
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
                          <h3 className="font-semibold text-maroon-800">{hotel.name}</h3>
                          {hotel.city && <p className="text-xs text-gray-500">{hotel.city}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap sm:justify-end">
                      <span className="text-sm text-gray-500">
                        {hotel.rooms?.length || 0} rooms · {hotel.guestsAllocated}/
                        {hotel.totalCapacity} guests
                      </span>
                      <button
                        onClick={() => {
                          setAddingRoomsToHotelId(hotel.id);
                          const nextRoomCategories = [{ ...DEFAULT_CATEGORY }];
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
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4 group/dates">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Default check-in:</span>
                        <span className="font-medium text-gray-700">
                          {hotel.default_check_in_date ?? (
                            <span className="italic text-gray-400">not set</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Check-out:</span>
                        <span className="font-medium text-gray-700">
                          {hotel.default_check_out_date ?? (
                            <span className="italic text-gray-400">not set</span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditHotelDateValues({
                            default_check_in_date: hotel.default_check_in_date ?? '',
                            default_check_out_date: hotel.default_check_out_date ?? '',
                          });
                          setEditingHotelId(hotel.id);
                          setCollapsedHotelIds((prev) => {
                            const next = new Set(prev);
                            next.delete(hotel.id);
                            return next;
                          });
                        }}
                        className="opacity-0 group-hover/dates:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
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
                        ↓ Drop guest onto a room to assign
                      </p>
                    )}
                    {hotel.rooms && hotel.rooms.length > 0 ? (
                      <div className="space-y-2">
                        {hotel.rooms.map((room: any) => {
                          const allocations = room.room_allocations || [];
                          const existingAlloc = allocations[0] ?? null;
                          const guests = allocations.flatMap(
                            (alloc: any) => alloc.guests || [],
                          ) as Array<{
                            id: string;
                            first_name: string;
                            last_name: string | null;
                            side?: string;
                            needs_accommodation?: boolean;
                          }>;

                          const isEditingRoom = editingRoomId === room.id;

                          const handleRoomEditSave = async () => {
                            try {
                              await updateRoomMutation.mutateAsync({
                                id: room.id,
                                room_number: editRoomValues.room_number,
                                capacity: editRoomValues.capacity,
                              });
                              setEditingRoomId(null);
                              toast.success('Room updated');
                            } catch (err: unknown) {
                              const e = err as {
                                response?: { data?: { message?: string; error?: string } };
                              };
                              toast.error(
                                e.response?.data?.message ||
                                  e.response?.data?.error ||
                                  'Failed to update room',
                              );
                            }
                          };

                          const isDropTarget = dropTargetRoomId === room.id;
                          const isFull =
                            (room.capacity ?? 0) > 0 && guests.length >= (room.capacity ?? 0);

                          return (
                            <div
                              key={room.id}
                              onDragOver={
                                draggingGuestId
                                  ? (e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      setDropTargetRoomId(room.id);
                                    }
                                  : undefined
                              }
                              onDragLeave={
                                draggingGuestId ? () => setDropTargetRoomId(null) : undefined
                              }
                              onDrop={
                                draggingGuestId
                                  ? (e) => {
                                      e.preventDefault();
                                      handleDropOnRoom(room, hotel);
                                    }
                                  : undefined
                              }
                              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg group transition-colors ${
                                isDropTarget
                                  ? isFull
                                    ? 'bg-red-50 ring-2 ring-red-300'
                                    : 'bg-green-50 ring-2 ring-green-300'
                                  : 'bg-gray-50'
                              }`}
                            >
                              {/* Room number + type */}
                              <div className="flex items-center gap-2 min-w-0">
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
                                  <span className="inline-flex items-center gap-1.5 font-medium text-sm text-gray-800">
                                    Room {room.room_number}
                                    <button
                                      onClick={() => {
                                        setEditingRoomId(room.id);
                                        setEditRoomValues({
                                          room_number: room.room_number,
                                          capacity: room.capacity ?? 0,
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                      title="Edit room"
                                    >
                                      <HiOutlinePencil className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                )}
                                {room.room_type && (
                                  <span className="badge bg-gray-100 text-gray-600 text-xs capitalize">
                                    {room.room_type}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {isEditingRoom ? (
                                    <input
                                      type="number"
                                      min={0}
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
                                    `${guests.length}/${room.capacity || 0}`
                                  )}
                                </span>
                              </div>

                              {/* Guest chips */}
                              <div className="flex flex-wrap gap-1.5 flex-1">
                                {guests.length > 0 ? (
                                  guests.map((g) => (
                                    <span
                                      key={g.id}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        g.side === 'bride'
                                          ? 'bg-pink-100 text-pink-800'
                                          : g.side === 'groom'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {[g.first_name, g.last_name].filter(Boolean).join(' ')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs italic text-gray-400">Available</span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isEditingRoom ? (
                                  <>
                                    <button
                                      onClick={handleRoomEditSave}
                                      disabled={updateRoomMutation.isPending}
                                      className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                    >
                                      {updateRoomMutation.isPending ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingRoomId(null)}
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRoomCapacity(room.capacity ?? 0);
                                      if (existingAlloc) {
                                        setEditAllocation({
                                          id: existingAlloc.id,
                                          currentGuests: guests.map((g) => ({
                                            id: g.id,
                                            first_name: g.first_name,
                                            last_name: g.last_name,
                                            needs_accommodation: g.needs_accommodation ?? true,
                                            side: g.side,
                                          })),
                                        });
                                        const nextAllocationFormData = {
                                          room_id: room.id,
                                          guest_ids: existingAlloc.guest_ids ?? [],
                                          check_in_date: existingAlloc.check_in_date ?? '',
                                          check_out_date: existingAlloc.check_out_date ?? '',
                                        };
                                        setAllocationFormData(nextAllocationFormData);
                                        setInitialAllocationFormData(nextAllocationFormData);
                                      } else {
                                        setEditAllocation(null);
                                        const nextAllocationFormData = {
                                          room_id: room.id,
                                          guest_ids: [],
                                          check_in_date: hotel.default_check_in_date ?? '',
                                          check_out_date: hotel.default_check_out_date ?? '',
                                        };
                                        setAllocationFormData(nextAllocationFormData);
                                        setInitialAllocationFormData(nextAllocationFormData);
                                      }
                                      setGuestSearchQuery('');
                                      setShowAllocationModal(true);
                                    }}
                                    className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                                  >
                                    {guests.length > 0 ? 'Edit' : 'Assign'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-3">
                        <p className="text-sm text-gray-400 italic">No rooms added yet</p>
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
              );
            })}
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showRoomModal &&
        (() => {
          const hotel = enrichedHotels.find((h: any) => h.id === addingRoomsToHotelId);
          const existingRooms = (hotel?.rooms || []) as any[];
          const existingGroups: Record<string, number> = existingRooms.reduce(
            (acc: Record<string, number>, r: any) => {
              acc[r.room_type] = (acc[r.room_type] || 0) + 1;
              return acc;
            },
            {},
          );
          const totalToAdd = roomCategories.reduce((s, c) => s + (Number(c.count) || 0), 0);

          return (
            <Portal>
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={attemptCloseRoomModal}>
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-gold-200">
                    <div>
                      <h2 className="text-xl font-display font-bold text-maroon-800">Add Rooms</h2>
                      {hotel && <p className="text-sm text-gray-500 mt-0.5">{hotel.name}</p>}
                    </div>
                    <button
                      onClick={attemptCloseRoomModal}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineX className="w-5 h-5" />
                    </button>
                  </div>

                  <form id="room-form" onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                    <div className="border border-gold-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-maroon-800">Room Categories</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
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
                          <p className="text-xs text-gray-500">Already added rooms:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(existingGroups).map(([type, count]) => (
                              <span key={type} className="badge bg-gray-100 text-gray-600 text-xs">
                                {type} × {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {roomCategories.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">
                          No categories yet. Click &quot;+ Add Category&quot; to bulk-add rooms.
                        </p>
                      )}

                      {roomCategories.length > 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2">
                            <span className="text-xs text-gray-500 font-medium">Category</span>
                            <span className="text-xs text-gray-500 font-medium">Count</span>
                            <span className="text-xs text-gray-500 font-medium">Occupancy</span>
                            <span className="text-xs text-gray-500 font-medium">Rate / night</span>
                            <span />
                          </div>
                          {roomCategories.map((cat, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[1fr_72px_72px_100px_32px] gap-2 items-center"
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
                                onClick={() =>
                                  setRoomCategories((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <HiOutlineX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <p className="text-xs text-gray-400 pt-1">
                            Total rooms to add:{' '}
                            <span className="font-medium text-maroon-700">{totalToAdd}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={attemptCloseRoomModal}
                        className="btn-outline flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateHotelMutation.isPending || totalToAdd === 0}
                        className="btn-primary flex-1 disabled:opacity-50"
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
          // In edit mode, merge currently-assigned guests back in (they're excluded from unassignedGuests)
          const unassigned = unassignedGuests as GuestOption[];
          const currentGuestIds = new Set(editAllocation?.currentGuests.map((g) => g.id) ?? []);
          const modalGuests: GuestOption[] = [
            ...(editAllocation?.currentGuests ?? []),
            ...unassigned.filter((g) => !currentGuestIds.has(g.id)),
          ];

          const needsAccomm = modalGuests.filter((g) => g.needs_accommodation);
          const otherGuests = modalGuests.filter((g) => !g.needs_accommodation);

          const filteredNeedsAccomm = needsAccomm.filter((g) =>
            fuzzyMatch(guestSearchQuery, `${g.first_name} ${g.last_name ?? ''}`),
          );
          const filteredOther = otherGuests.filter((g) =>
            fuzzyMatch(guestSearchQuery, `${g.first_name} ${g.last_name ?? ''}`),
          );

          const selectedGuests = modalGuests.filter((g) =>
            allocationFormData.guest_ids.includes(g.id),
          );
          const isEditing = !!editAllocation;

          const selectedCount = allocationFormData.guest_ids.length;
          const atCapacity = roomCapacity > 0 && selectedCount >= roomCapacity;

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

          return (
            <Portal>
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={attemptCloseAllocationModal}>
                <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gold-200 flex-shrink-0">
                    <div>
                      <h2 className="text-xl font-display font-bold text-maroon-800">
                        {isEditing ? 'Edit Room Assignment' : 'Assign Guests to Room'}
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {isEditing
                          ? 'Update guests or dates — uncheck guests to remove them'
                          : 'Select guests to assign, then set their stay dates'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {roomCapacity > 0 && (
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            atCapacity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <span>
                            {selectedCount} / {roomCapacity}
                          </span>
                          <span className="text-xs opacity-75">capacity</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={attemptCloseAllocationModal}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineX className="w-5 h-5" />
                    </button>
                  </div>

                  <form id="allocation-form" onSubmit={handleAllocationSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Guest selector */}
                      <div>
                        <label className="label mb-2">Guests *</label>

                        {modalGuests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center min-h-[140px] border border-gold-200 rounded-xl bg-gold-50 p-6 text-center gap-3">
                            <HiOutlineUserGroup className="w-8 h-8 text-gold-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                No guests added yet
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
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
                              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search guests by name…"
                                value={guestSearchQuery}
                                onChange={(e) => setGuestSearchQuery(e.target.value)}
                                className="input pl-9"
                                autoFocus
                              />
                              {guestSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setGuestSearchQuery('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                              {/* Needs accommodation section */}
                              {filteredNeedsAccomm.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-green-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                                      Needs accommodation ({filteredNeedsAccomm.length})
                                    </span>
                                  </div>
                                  {filteredNeedsAccomm.map((guest) => {
                                    const isSelected = allocationFormData.guest_ids.includes(
                                      guest.id,
                                    );
                                    const isDisabled = !isSelected && atCapacity;
                                    return (
                                      <label
                                        key={guest.id}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                          isDisabled
                                            ? 'opacity-40 cursor-not-allowed'
                                            : isSelected
                                              ? 'bg-maroon-50 cursor-pointer'
                                              : 'hover:bg-gray-50 cursor-pointer'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleGuest(guest.id)}
                                          disabled={isDisabled}
                                          className="w-4 h-4 accent-maroon-700 rounded"
                                        />
                                        <HiOutlineUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-800 flex-1">
                                          {[guest.first_name, guest.last_name]
                                            .filter(Boolean)
                                            .join(' ')}
                                        </span>
                                        {isSelected && (
                                          <span className="text-xs text-maroon-600 font-medium">
                                            Selected
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </>
                              )}

                              {/* Other guests section */}
                              {filteredOther.length > 0 && (
                                <>
                                  <div className="px-4 py-2 bg-amber-50 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                      Other guests — not flagged for accommodation (
                                      {filteredOther.length})
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 bg-amber-50/60 border-b border-gold-100">
                                    <p className="text-xs text-amber-700">
                                      Selecting any of these guests will automatically mark them as
                                      needing accommodation.
                                    </p>
                                  </div>
                                  {filteredOther.map((guest) => {
                                    const isSelected = allocationFormData.guest_ids.includes(
                                      guest.id,
                                    );
                                    const isDisabled = !isSelected && atCapacity;
                                    return (
                                      <label
                                        key={guest.id}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                          isDisabled
                                            ? 'opacity-40 cursor-not-allowed'
                                            : isSelected
                                              ? 'bg-maroon-50 cursor-pointer'
                                              : 'hover:bg-gray-50 cursor-pointer'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleGuest(guest.id)}
                                          disabled={isDisabled}
                                          className="w-4 h-4 accent-maroon-700 rounded"
                                        />
                                        <HiOutlineUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-800 flex-1">
                                          {[guest.first_name, guest.last_name]
                                            .filter(Boolean)
                                            .join(' ')}
                                        </span>
                                        {isSelected && (
                                          <span className="text-xs text-maroon-600 font-medium">
                                            Selected
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </>
                              )}

                              {filteredNeedsAccomm.length === 0 && filteredOther.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
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
                    <div className="flex gap-3 p-6 border-t border-gold-200 flex-shrink-0">
                      {modalGuests.length === 0 ? (
                        <button
                          type="button"
                            onClick={() => {
                              attemptCloseAllocationModal();
                              navigate('../guests');
                            }}
                          className="btn-primary flex-1"
                        >
                          Add Guests
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={attemptCloseAllocationModal}
                            className="btn-outline flex-1"
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
                            className={`btn-primary flex-1 disabled:opacity-50 ${
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImportModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">
                  Import Room Allocations from Excel
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Import Instructions</h3>
                  <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
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
                      <strong>Multiple guests per room:</strong> Assign up to 3 guests per room
                      using the Guest 1, 2, 3 columns
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
            setShowImportResultsModal(false);
            setImportResults(null);
          }}>
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">Import Results</h2>
                <button
                  onClick={() => {
                    setShowImportResultsModal(false);
                    setImportResults(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
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
                    <div className="text-sm text-gray-700 space-y-3">
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
                                className={`bg-white border rounded p-2 text-xs ${
                                  allocation.action === 'updated'
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-green-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="font-medium text-gray-800">
                                      {allocation.guest}
                                    </span>
                                    <span className="text-gray-500">→</span>
                                    <span className="text-gray-600">Room {allocation.room}</span>
                                    {allocation.action === 'updated' && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        Updated
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-right">{allocation.venue}</div>
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
                        <div key={idx} className="bg-white border border-red-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {err.guest || `Row ${err.row}`}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
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

              <div className="flex gap-3 p-6 border-t border-gold-200">
                <button
                  onClick={() => {
                    setShowImportResultsModal(false);
                    setImportResults(null);
                  }}
                  className="btn-primary flex-1"
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
