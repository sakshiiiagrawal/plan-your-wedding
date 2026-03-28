import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
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
} from 'react-icons/hi';
import {
  useAllocationMatrix,
  useUnassignedGuests,
  useCreateAccommodation,
  useUpdateAccommodation,
  useCreateRoom,
  useUpdateRoom,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  useUpdateGuest,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Portal from '../../components/Portal';

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

interface HotelFormData {
  name: string;
  address: string;
  total_cost: number;
  contact_person: string;
  contact_phone: string;
  default_check_in_date: string;
  default_check_out_date: string;
}

interface RoomFormData {
  accommodationId: string | null;
  room_number: string;
  room_type: string;
  capacity: number;
  rate_per_night: number;
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
  return q.split(/\s+/).filter(Boolean).every((word) => t.includes(word));
}

export default function Accommodations() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allocationMatrix = [], isLoading, error } = useAllocationMatrix();
  const { data: unassignedGuests = [] } = useUnassignedGuests();
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportResultsModal, setShowImportResultsModal] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [hotelFormData, setHotelFormData] = useState<HotelFormData>({
    name: '',
    address: '',
    total_cost: 0,
    contact_person: '',
    contact_phone: '',
    default_check_in_date: '',
    default_check_out_date: '',
  });
  const [roomFormData, setRoomFormData] = useState<RoomFormData>({
    accommodationId: null,
    room_number: '',
    room_type: '',
    capacity: 2,
    rate_per_night: 0,
  });
  const [allocationFormData, setAllocationFormData] = useState<AllocationFormData>({
    room_id: null,
    guest_ids: [],
    check_in_date: '',
    check_out_date: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createHotelMutation = useCreateAccommodation();
  const updateHotelMutation = useUpdateAccommodation();
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const createAllocationMutation = useCreateAllocation();
  const updateAllocationMutation = useUpdateAllocation();
  const deleteAllocationMutation = useDeleteAllocation();
  const updateGuestMutation = useUpdateGuest();

  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [editAllocation, setEditAllocation] = useState<EditAllocationState | null>(null);
  const [roomCapacity, setRoomCapacity] = useState<number>(0);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomValues, setEditRoomValues] = useState<{ room_number: string; capacity: number }>({ room_number: '', capacity: 0 });
  const [editingHotelDates, setEditingHotelDates] = useState(false);
  const [editHotelDateValues, setEditHotelDateValues] = useState<{ default_check_in_date: string; default_check_out_date: string }>({ default_check_in_date: '', default_check_out_date: '' });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resetHotelForm = () => {
    setHotelFormData({
      name: '',
      address: '',
      total_cost: 0,
      contact_person: '',
      contact_phone: '',
      default_check_in_date: '',
      default_check_out_date: '',
    });
  };

  const resetRoomForm = () => {
    setRoomFormData({
      accommodationId: null,
      room_number: '',
      room_type: '',
      capacity: 2,
      rate_per_night: 0,
    });
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
  };

  const handleHotelSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createHotelMutation.mutateAsync(hotelFormData);
      toast.success('Hotel added successfully!');
      setShowHotelModal(false);
      resetHotelForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Failed to add hotel';
      toast.error(errorMessage);
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { accommodationId, ...roomData } = roomFormData;
      await createRoomMutation.mutateAsync({ accommodationId: accommodationId!, ...roomData });
      toast.success('Room added successfully!');
      setShowRoomModal(false);
      resetRoomForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Failed to add room';
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
        guestsToFlag.map((g) => updateGuestMutation.mutateAsync({ id: g.id, needs_accommodation: true })),
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

  const selectedHotel = useMemo(() => {
    if (allocationMatrix.length > 0) {
      const hotelId = selectedHotelId || allocationMatrix[0]?.id;
      return allocationMatrix.find((h: { id: string }) => h.id === hotelId) || allocationMatrix[0];
    }
    return null;
  }, [allocationMatrix, selectedHotelId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Accommodations & Room Allocation</h1>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-outline flex items-center gap-2"
              >
                <HiOutlineUpload className="w-4 h-4" />
                Import
              </button>
              <button onClick={() => setShowHotelModal(true)} className="btn-primary">
                Add Hotel
              </button>
            </>
          )}
        </div>
      </div>

      {enrichedHotels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No accommodations found</p>
        </div>
      ) : (
        <>
          {/* Hotel Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {enrichedHotels.map(
              (hotel: {
                id: string;
                name: string;
                city?: string;
                roomsBooked: number;
                guestsAllocated: number;
                totalCapacity: number;
                total_cost?: number;
                default_check_in_date?: string | null;
                default_check_out_date?: string | null;
              }) => (
                <div
                  key={hotel.id}
                  onClick={() => setSelectedHotelId(hotel.id)}
                  className={`card-hover cursor-pointer ${selectedHotel?.id === hotel.id ? 'ring-2 ring-gold-500' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                      <HiOutlineOfficeBuilding className="w-5 h-5 text-gold-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-maroon-800">{hotel.name}</h3>
                      <p className="text-xs text-gray-500">{hotel.city || ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Rooms:</span>
                      <span className="ml-1 font-medium">{hotel.roomsBooked}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Allocated:</span>
                      <span className="ml-1 font-medium">
                        {hotel.guestsAllocated}/{hotel.totalCapacity}
                      </span>
                    </div>
                  </div>

                  {hotel.total_cost && (
                    <div className="mt-3 pt-3 border-t border-gold-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cost:</span>
                        <span className="font-medium text-maroon-800">
                          {formatCurrency(hotel.total_cost)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* Room Allocation Matrix */}
          {selectedHotel && (() => {
            const hotel = selectedHotel as typeof selectedHotel & {
              default_check_in_date?: string | null;
              default_check_out_date?: string | null;
            };

            const handleHotelDateSave = async () => {
              try {
                await updateHotelMutation.mutateAsync({
                  id: hotel.id,
                  default_check_in_date: editHotelDateValues.default_check_in_date || null,
                  default_check_out_date: editHotelDateValues.default_check_out_date || null,
                });
                setEditingHotelDates(false);
                toast.success('Default dates updated');
              } catch {
                toast.error('Failed to update default dates');
              }
            };

            return (
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="section-title mb-1">{hotel.name} - Room Allocation</h3>
                  {/* Default dates row */}
                  {editingHotelDates ? (
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Check-in:</span>
                        <input
                          type="date"
                          value={editHotelDateValues.default_check_in_date}
                          onChange={(e) => setEditHotelDateValues({ ...editHotelDateValues, default_check_in_date: e.target.value })}
                          className="input py-0.5 px-2 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Check-out:</span>
                        <input
                          type="date"
                          value={editHotelDateValues.default_check_out_date}
                          onChange={(e) => setEditHotelDateValues({ ...editHotelDateValues, default_check_out_date: e.target.value })}
                          className="input py-0.5 px-2 text-xs"
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
                        onClick={() => setEditingHotelDates(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4 mt-1 group/dates">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Default check-in:</span>
                        <span className="font-medium text-gray-700">
                          {hotel.default_check_in_date ?? <span className="italic text-gray-400">not set</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Check-out:</span>
                        <span className="font-medium text-gray-700">
                          {hotel.default_check_out_date ?? <span className="italic text-gray-400">not set</span>}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditHotelDateValues({
                              default_check_in_date: hotel.default_check_in_date ?? '',
                              default_check_out_date: hotel.default_check_out_date ?? '',
                            });
                            setEditingHotelDates(true);
                          }}
                          className="opacity-0 group-hover/dates:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                          title="Edit default dates"
                        >
                          <HiOutlinePencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-400" />
                      <span>Bride Side</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span>Groom Side</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      <span>Available</span>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setRoomFormData({ ...roomFormData, accommodationId: selectedHotel.id });
                        setShowRoomModal(true);
                      }}
                      className="btn-outline text-sm flex items-center gap-2"
                    >
                      <HiOutlinePlus className="w-4 h-4" />
                      Add Room
                    </button>
                  )}
                </div>
              </div>

              {selectedHotel.rooms && selectedHotel.rooms.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="table-header">
                        <tr>
                          <th className="text-left p-3">Room</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Capacity</th>
                          <th className="text-left p-3">Guests</th>
                          {canEdit && <th className="text-left p-3">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedHotel.rooms.map(
                          (room: {
                            id: string;
                            room_number: string;
                            room_type?: string;
                            capacity?: number;
                            room_allocations?: Array<{
                              id: string;
                              guest_ids?: string[];
                              check_in_date?: string;
                              check_out_date?: string;
                              guests?: Array<{ id: string; first_name: string; last_name: string; side?: string; needs_accommodation?: boolean }>;
                            }>;
                          }) => {
                            const allocations = room.room_allocations || [];
                            // Use first allocation (one per room per stay period)
                            const existingAlloc = allocations[0] ?? null;
                            const guests = allocations.flatMap((alloc) => alloc.guests || []) as Array<{
                              id: string;
                              first_name: string;
                              last_name: string | null;
                              side?: string;
                              needs_accommodation?: boolean;
                            }>;
                            const guestSide = guests[0]?.side;

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
                                const e = err as { response?: { data?: { message?: string; error?: string } } };
                                toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to update room');
                              }
                            };

                            const startEditing = () => {
                              setEditingRoomId(room.id);
                              setEditRoomValues({ room_number: room.room_number, capacity: room.capacity ?? 0 });
                            };

                            return (
                              <tr key={room.id} className="table-row group">
                                {/* Room number cell with hover pencil */}
                                <td className="p-3 font-medium">
                                  {isEditingRoom ? (
                                    <input
                                      className="input py-1 px-2 text-sm w-24"
                                      value={editRoomValues.room_number}
                                      onChange={(e) => setEditRoomValues({ ...editRoomValues, room_number: e.target.value })}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleRoomEditSave(); if (e.key === 'Escape') setEditingRoomId(null); }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5">
                                      {room.room_number}
                                      {canEdit && (
                                        <button
                                          onClick={startEditing}
                                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                          title="Edit room number"
                                        >
                                          <HiOutlinePencil className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-gray-600">{room.room_type || 'N/A'}</td>
                                {/* Capacity cell with hover pencil */}
                                <td className="p-3 text-gray-600">
                                  {isEditingRoom ? (
                                    <input
                                      type="number"
                                      min={0}
                                      className="input py-1 px-2 text-sm w-20"
                                      value={editRoomValues.capacity}
                                      onChange={(e) => setEditRoomValues({ ...editRoomValues, capacity: Number(e.target.value) })}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleRoomEditSave(); if (e.key === 'Escape') setEditingRoomId(null); }}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5">
                                      {room.capacity || 0}
                                      {canEdit && (
                                        <button
                                          onClick={startEditing}
                                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                          title="Edit capacity"
                                        >
                                          <HiOutlinePencil className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {guests.length > 0 ? (
                                    <div className="flex items-start gap-2">
                                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${guestSide === 'bride' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                                      <div className="flex flex-col gap-0.5">
                                        {guests.map((g) => (
                                          <span key={g.id} className="text-gray-700 text-sm">
                                            {[g.first_name, g.last_name].filter(Boolean).join(' ')}
                                          </span>
                                        ))}
                                        <span className="text-xs text-gray-400">
                                          {guests.length}/{room.capacity} guests
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">Available</span>
                                  )}
                                </td>
                                {canEdit && (
                                  <td className="p-3">
                                    {isEditingRoom ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={handleRoomEditSave}
                                          disabled={updateRoomMutation.isPending}
                                          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                        >
                                          {updateRoomMutation.isPending ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => setEditingRoomId(null)}
                                          className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
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
                                            setAllocationFormData({
                                              room_id: room.id,
                                              guest_ids: existingAlloc.guest_ids ?? [],
                                              check_in_date: existingAlloc.check_in_date ?? '',
                                              check_out_date: existingAlloc.check_out_date ?? '',
                                            });
                                          } else {
                                            setEditAllocation(null);
                                            setAllocationFormData({
                                              room_id: room.id,
                                              guest_ids: [],
                                              check_in_date: hotel.default_check_in_date ?? '',
                                              check_out_date: hotel.default_check_out_date ?? '',
                                            });
                                          }
                                          setGuestSearchQuery('');
                                          setShowAllocationModal(true);
                                        }}
                                        className="text-sm text-gold-600 hover:text-gold-700"
                                      >
                                        {guests.length > 0 ? 'Edit' : 'Assign'}
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Unassigned guests needing rooms:</strong> {unassignedGuests.length}{' '}
                      guests
                      {unassignedGuests.length > 0 && (
                        <button className="ml-2 text-gold-600 hover:underline">View list</button>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No rooms found for this accommodation. Add rooms to begin allocation.
                </div>
              )}
            </div>
            );
          })()}
        </>
      )}

      {/* Add Hotel Modal */}
      {canEdit && showHotelModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">Add Hotel</h2>
                <button
                  onClick={() => {
                    setShowHotelModal(false);
                    resetHotelForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleHotelSubmit} className="p-6 space-y-4">
                <div>
                  <label className="label">Hotel Name *</label>
                  <input
                    type="text"
                    value={hotelFormData.name}
                    onChange={(e) => setHotelFormData({ ...hotelFormData, name: e.target.value })}
                    className="input"
                    placeholder="Hotel name"
                    required
                  />
                </div>

                <div>
                  <label className="label">Address *</label>
                  <textarea
                    value={hotelFormData.address}
                    onChange={(e) =>
                      setHotelFormData({ ...hotelFormData, address: e.target.value })
                    }
                    className="input"
                    rows={2}
                    placeholder="Full address"
                    required
                  />
                </div>

                <div>
                  <label className="label">Total Cost</label>
                  <input
                    type="number"
                    value={hotelFormData.total_cost}
                    onChange={(e) =>
                      setHotelFormData({ ...hotelFormData, total_cost: Number(e.target.value) })
                    }
                    className="input"
                    placeholder="0"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact Person</label>
                    <input
                      type="text"
                      value={hotelFormData.contact_person}
                      onChange={(e) =>
                        setHotelFormData({ ...hotelFormData, contact_person: e.target.value })
                      }
                      className="input"
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Phone</label>
                    <input
                      type="tel"
                      value={hotelFormData.contact_phone}
                      onChange={(e) =>
                        setHotelFormData({ ...hotelFormData, contact_phone: e.target.value })
                      }
                      className="input"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Default Check-in Date</label>
                    <input
                      type="date"
                      value={hotelFormData.default_check_in_date}
                      onChange={(e) =>
                        setHotelFormData({ ...hotelFormData, default_check_in_date: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Default Check-out Date</label>
                    <input
                      type="date"
                      value={hotelFormData.default_check_out_date}
                      onChange={(e) =>
                        setHotelFormData({ ...hotelFormData, default_check_out_date: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  These dates will be pre-filled when assigning guests to rooms in this hotel.
                </p>
              </form>

              <div className="flex gap-3 p-6 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowHotelModal(false);
                    resetHotelForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) =>
                    handleHotelSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                  }
                  disabled={createHotelMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {createHotelMutation.isPending ? 'Adding...' : 'Add Hotel'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Room Modal */}
      {canEdit && showRoomModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">Add Room</h2>
                <button
                  onClick={() => {
                    setShowRoomModal(false);
                    resetRoomForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Room Number *</label>
                    <input
                      type="text"
                      value={roomFormData.room_number}
                      onChange={(e) =>
                        setRoomFormData({ ...roomFormData, room_number: e.target.value })
                      }
                      className="input"
                      placeholder="e.g., 101"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Room Type *</label>
                    <select
                      value={roomFormData.room_type}
                      onChange={(e) =>
                        setRoomFormData({ ...roomFormData, room_type: e.target.value })
                      }
                      className="input"
                      required
                    >
                      <option value="">Select room type</option>
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="suite">Suite</option>
                      <option value="family">Family</option>
                      <option value="dormitory">Dormitory</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Capacity *</label>
                  <input
                    type="number"
                    value={roomFormData.capacity}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })
                    }
                    className="input"
                    placeholder="2"
                    required
                  />
                </div>

                <div>
                  <label className="label">Rate Per Night</label>
                  <input
                    type="number"
                    value={roomFormData.rate_per_night}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, rate_per_night: Number(e.target.value) })
                    }
                    className="input"
                    placeholder="0"
                  />
                </div>
              </form>

              <div className="flex gap-3 p-6 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomModal(false);
                    resetRoomForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) =>
                    handleRoomSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                  }
                  disabled={createRoomMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {createRoomMutation.isPending ? 'Adding...' : 'Add Room'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Assign Guest to Room Modal */}
      {canEdit && showAllocationModal && (() => {
        // In edit mode, merge currently-assigned guests back in (they're excluded from unassignedGuests)
        const unassigned = unassignedGuests as GuestOption[];
        const currentGuestIds = new Set(editAllocation?.currentGuests.map((g) => g.id) ?? []);
        const allGuests: GuestOption[] = [
          ...(editAllocation?.currentGuests ?? []),
          ...unassigned.filter((g) => !currentGuestIds.has(g.id)),
        ];

        const needsAccomm = allGuests.filter((g) => g.needs_accommodation);
        const otherGuests = allGuests.filter((g) => !g.needs_accommodation);

        const filteredNeedsAccomm = needsAccomm.filter((g) =>
          fuzzyMatch(guestSearchQuery, `${g.first_name} ${g.last_name ?? ''}`),
        );
        const filteredOther = otherGuests.filter((g) =>
          fuzzyMatch(guestSearchQuery, `${g.first_name} ${g.last_name ?? ''}`),
        );

        const selectedGuests = allGuests.filter((g) =>
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
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
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        atCapacity
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        <span>{selectedCount} / {roomCapacity}</span>
                        <span className="text-xs opacity-75">capacity</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowAllocationModal(false);
                      resetAllocationForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <HiOutlineX className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAllocationSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Guest selector */}
                    <div>
                      <label className="label mb-2">Guests *</label>

                      {allGuests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[140px] border border-gold-200 rounded-xl bg-gold-50 p-6 text-center gap-3">
                          <HiOutlineUserGroup className="w-8 h-8 text-gold-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">No guests added yet</p>
                            <p className="text-xs text-gray-500 mt-1">Add guests before assigning them to a room</p>
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
                              <span className="text-red-500">— uncheck a guest to swap them out</span>
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
                                    const isSelected = allocationFormData.guest_ids.includes(guest.id);
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
                                          {[guest.first_name, guest.last_name].filter(Boolean).join(' ')}
                                        </span>
                                        {isSelected && (
                                          <span className="text-xs text-maroon-600 font-medium">Selected</span>
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
                                      Other guests — not flagged for accommodation ({filteredOther.length})
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 bg-amber-50/60 border-b border-gold-100">
                                    <p className="text-xs text-amber-700">
                                      Selecting any of these guests will automatically mark them as needing accommodation.
                                    </p>
                                  </div>
                                  {filteredOther.map((guest) => {
                                    const isSelected = allocationFormData.guest_ids.includes(guest.id);
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
                                          {[guest.first_name, guest.last_name].filter(Boolean).join(' ')}
                                        </span>
                                        {isSelected && (
                                          <span className="text-xs text-maroon-600 font-medium">Selected</span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </>
                              )}

                              {filteredNeedsAccomm.length === 0 && filteredOther.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                  No guests match "{guestSearchQuery}"
                                </div>
                              )}
                            </div>
                        </>
                      )}
                    </div>

                    {/* Dates */}
                    {allGuests.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Check-in Date *</label>
                          <input
                            type="date"
                            value={allocationFormData.check_in_date}
                            onChange={(e) =>
                              setAllocationFormData({
                                ...allocationFormData,
                                check_in_date: e.target.value,
                              })
                            }
                            className="input"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Check-out Date *</label>
                          <input
                            type="date"
                            value={allocationFormData.check_out_date}
                            onChange={(e) =>
                              setAllocationFormData({
                                ...allocationFormData,
                                check_out_date: e.target.value,
                              })
                            }
                            className="input"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 p-6 border-t border-gold-200 flex-shrink-0">
                    {allGuests.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllocationModal(false);
                          resetAllocationForm();
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
                          onClick={() => {
                            setShowAllocationModal(false);
                            resetAllocationForm();
                          }}
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
                          {(createAllocationMutation.isPending || updateAllocationMutation.isPending || deleteAllocationMutation.isPending)
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
      {canEdit && showImportModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl">
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
