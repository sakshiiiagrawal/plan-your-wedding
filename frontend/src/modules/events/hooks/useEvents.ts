export const EVENT_QUERY_KEYS = {
  all: ['events'] as const,
  list: () => ['events'] as const,
  detail: (id: string) => ['events', id] as const,
  guests: (eventId: string) => ['events', eventId, 'guests'] as const,
  vendors: (eventId: string) => ['events', eventId, 'vendors'] as const,
} as const;

export {
  useEvents,
  useEvent,
  useEventGuests,
  useEventVendors,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '../../../hooks/useApi';
