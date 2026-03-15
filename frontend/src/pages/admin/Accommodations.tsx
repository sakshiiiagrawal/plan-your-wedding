import { useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineDownload,
  HiOutlineUpload,
} from 'react-icons/hi';
import {
  useAllocationMatrix,
  useUnassignedGuests,
  useCreateAccommodation,
  useCreateRoom,
  useCreateAllocation,
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
  distance_from_venue: string;
  total_rooms_booked: number;
  total_cost: number;
  contact_person: string;
  contact_phone: string;
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
  guest_id: string | null;
  check_in_date: string;
  check_out_date: string;
}

export default function Accommodations() {
  const { canEdit } = useAuth();
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
    distance_from_venue: '',
    total_rooms_booked: 0,
    total_cost: 0,
    contact_person: '',
    contact_phone: '',
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
    guest_id: null,
    check_in_date: '',
    check_out_date: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createHotelMutation = useCreateAccommodation();
  const createRoomMutation = useCreateRoom();
  const createAllocationMutation = useCreateAllocation();

  const resetHotelForm = () => {
    setHotelFormData({
      name: '',
      address: '',
      distance_from_venue: '',
      total_rooms_booked: 0,
      total_cost: 0,
      contact_person: '',
      contact_phone: '',
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
      guest_id: null,
      check_in_date: '',
      check_out_date: '',
    });
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
      await createAllocationMutation.mutateAsync(allocationFormData);
      toast.success('Guest assigned successfully!');
      setShowAllocationModal(false);
      resetAllocationForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Failed to assign guest';
      toast.error(errorMessage);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/accommodations/allocations/template/all-venues/download', {
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
      const response = await api.post('/accommodations/allocations/import/all-venues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResults(response.data);

      queryClient.invalidateQueries({ queryKey: ['accommodations', 'allocation-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations', 'unassigned-guests'] });

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
          return sum + (room.room_allocations?.length || 0);
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
                distance_from_venue?: string;
                roomsBooked: number;
                guestsAllocated: number;
                totalCapacity: number;
                total_cost?: number;
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
                      <p className="text-xs text-gray-500">{hotel.distance_from_venue || 'N/A'}</p>
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
          {selectedHotel && (
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="section-title mb-0">{selectedHotel.name} - Room Allocation</h3>
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
                              guests?: { first_name: string; last_name: string; side?: string };
                            }>;
                          }) => {
                            const allocations = room.room_allocations || [];
                            const guests = allocations
                              .map((alloc) => alloc.guests)
                              .filter(Boolean) as Array<{
                              first_name: string;
                              last_name: string;
                              side?: string;
                            }>;
                            const guestSide = guests[0]?.side;

                            return (
                              <tr key={room.id} className="table-row">
                                <td className="p-3 font-medium">{room.room_number}</td>
                                <td className="p-3 text-gray-600">{room.room_type || 'N/A'}</td>
                                <td className="p-3 text-gray-600">{room.capacity || 0}</td>
                                <td className="p-3">
                                  {guests.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${guestSide === 'bride' ? 'bg-pink-400' : 'bg-blue-400'}`}
                                      />
                                      <span className="text-gray-700">
                                        {guests
                                          .map((g) => `${g.first_name} ${g.last_name}`)
                                          .join(', ')}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        ({guests.length}/{room.capacity})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Available - Drag guest here
                                    </span>
                                  )}
                                </td>
                                {canEdit && (
                                  <td className="p-3">
                                    <button
                                      onClick={() => {
                                        setAllocationFormData({
                                          ...allocationFormData,
                                          room_id: room.id,
                                        });
                                        setShowAllocationModal(true);
                                      }}
                                      className="text-sm text-gold-600 hover:text-gold-700"
                                    >
                                      {guests.length > 0 ? 'Edit' : 'Assign'}
                                    </button>
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
          )}
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

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Distance from Venue</label>
                    <input
                      type="text"
                      value={hotelFormData.distance_from_venue}
                      onChange={(e) =>
                        setHotelFormData({ ...hotelFormData, distance_from_venue: e.target.value })
                      }
                      className="input"
                      placeholder="e.g., 2 km"
                    />
                  </div>
                  <div>
                    <label className="label">Rooms Booked</label>
                    <input
                      type="number"
                      value={hotelFormData.total_rooms_booked}
                      onChange={(e) =>
                        setHotelFormData({
                          ...hotelFormData,
                          total_rooms_booked: Number(e.target.value),
                        })
                      }
                      className="input"
                      placeholder="0"
                    />
                  </div>
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
      {canEdit && showAllocationModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gold-200">
                <h2 className="text-xl font-display font-bold text-maroon-800">
                  Assign Guest to Room
                </h2>
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

              <form onSubmit={handleAllocationSubmit} className="p-6 space-y-4">
                <div>
                  <label className="label">Guest *</label>
                  <select
                    value={allocationFormData.guest_id || ''}
                    onChange={(e) =>
                      setAllocationFormData({ ...allocationFormData, guest_id: e.target.value })
                    }
                    className="input"
                    required
                  >
                    <option value="">Select Guest</option>
                    {unassignedGuests.map(
                      (guest: { id: string; first_name: string; last_name: string }) => (
                        <option key={guest.id} value={guest.id}>
                          {guest.first_name} {guest.last_name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

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

                <div className="p-3 bg-gold-50 rounded-lg text-sm text-gray-600">
                  {unassignedGuests.length} unassigned guests needing accommodation
                </div>
              </form>

              <div className="flex gap-3 p-6 border-t border-gold-200">
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
                  onClick={(e) =>
                    handleAllocationSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                  }
                  disabled={createAllocationMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {createAllocationMutation.isPending ? 'Assigning...' : 'Assign Guest'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

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
