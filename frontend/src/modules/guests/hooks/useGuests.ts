export const GUEST_QUERY_KEYS = {
  all: ['guests'] as const,
  list: (filters: Record<string, string>) => ['guests', filters] as const,
  detail: (id: string) => ['guests', id] as const,
  summary: ['guests', 'summary'] as const,
  groups: ['guests', 'groups'] as const,
} as const;

export {
  useGuests,
  useGuest,
  useGuestSummary,
  useGuestGroups,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
} from '../../../hooks/useApi';

export type { GuestFilters } from '../../../hooks/useApi';
