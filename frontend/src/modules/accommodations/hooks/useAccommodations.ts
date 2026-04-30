export const ACCOMMODATION_QUERY_KEYS = {
  all: ['accommodations'] as const,
  list: () => ['accommodations'] as const,
  detail: (id: string) => ['accommodations', id] as const,
  rooms: (accommodationId: string) => ['accommodations', accommodationId, 'rooms'] as const,
  allocations: ['accommodations', 'allocations'] as const,
  allocationMatrix: ['accommodations', 'allocation-matrix'] as const,
  unassignedGuests: ['accommodations', 'unassigned-guests'] as const,
} as const;

export {
  useAccommodations,
  useAccommodation,
  useAccommodationRooms,
  useAllocationMatrix,
  useUnassignedGuests,
  useCreateAccommodation,
  useUpdateAccommodation,
  useDeleteAccommodation,
  useCreateRoom,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
} from '../../../hooks/useApi';
