export const VENUE_QUERY_KEYS = {
  all: ['venues'] as const,
  list: () => ['venues'] as const,
  detail: (id: string) => ['venues', id] as const,
} as const;

export {
  useVenues,
  useVenue,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
} from '../../../hooks/useApi';
