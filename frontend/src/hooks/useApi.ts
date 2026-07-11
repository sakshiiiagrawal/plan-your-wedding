/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import type { PublicEvent } from '../site/types';
import type {
  HeroContent,
  GuestWithDetails,
  EventWithVenue,
  ExpenseBalanceSummary,
  ExpenseWithDetails,
  PaymentRow,
  VendorWithFinance,
  VenueWithFinance,
} from '@wedding-planner/shared';

// =====================================================
// SETUP HOOKS
// =====================================================

export const useSetupStatus = () =>
  useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get('/setup-status').then((res) => res.data),
    staleTime: Infinity,
  });

// =====================================================
// WEBSITE CONTENT HOOKS
// =====================================================

export const useHeroContent = (slug?: string | null) =>
  useQuery<HeroContent>({
    queryKey: ['website-content', 'hero', slug || 'authed'],
    queryFn: () =>
      slug
        ? api.get(`/public/${slug}/website-content/hero`).then((res) => res.data)
        : api.get('/website-content/hero').then((res) => res.data),
    staleTime: 10 * 60 * 1000,
    enabled: true,
  });

export const useUpdateWebsiteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ section, payload }: { section: string; payload: Record<string, any> }) =>
      api.put(`/website-content/${section}`, payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-content'] });
    },
  });
};

export const useCoupleContent = (slug?: string | null) =>
  useQuery<any>({
    queryKey: ['website-content', 'couple', slug || 'authed'],
    queryFn: () =>
      slug
        ? api.get(`/public/${slug}/website-content/couple`).then((res) => res.data)
        : api.get('/website-content/couple').then((res) => res.data),
    staleTime: 10 * 60 * 1000,
  });

export const useOurStory = (slug?: string | null) =>
  useQuery<any>({
    queryKey: ['website-content', 'story', slug || 'authed'],
    queryFn: () =>
      slug
        ? api.get(`/public/${slug}/website-content/our_story`).then((res) => res.data)
        : api.get('/website-content/story').then((res) => res.data),
    staleTime: 10 * 60 * 1000,
  });

export interface GalleryContent {
  images: { url: string; alt?: string }[];
  subtitle?: string;
}

export const useGalleryContent = (slug?: string | null) =>
  useQuery<GalleryContent>({
    queryKey: ['website-content', 'gallery', slug || 'authed'],
    queryFn: () =>
      slug
        ? api.get(`/public/${slug}/website-content/gallery`).then((res) => res.data)
        : api.get('/website-content/gallery').then((res) => res.data),
    staleTime: 10 * 60 * 1000,
  });

export const useUploadGalleryImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api
        .post('/website-content/gallery/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-content'] });
    },
  });
};

export const useDeleteGalleryImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      api.delete('/website-content/gallery/images', { data: { url } }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-content'] });
    },
  });
};

export type { PublicEvent } from '../site/types';

export const usePublicEvents = (slug?: string | null) =>
  useQuery<PublicEvent[]>({
    queryKey: ['public-events', slug],
    queryFn: () => api.get(`/public/${slug}/events`).then((res) => res.data),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

// =====================================================
// PUBLIC PAGES (multi-page site)
// =====================================================

export interface PublicPagePayload {
  page_slug: string;
  kind: 'website' | 'invite';
  title: string;
  template: string;
  palette: string;
   
  config: Record<string, any>;
}

export interface PublicPageRecord extends PublicPagePayload {
  id: string;
  is_published: boolean;
  display_order: number;
}

/** Published pages of a wedding, as seen by guests. */
export const usePublicPages = (slug?: string | null) =>
  useQuery<PublicPagePayload[]>({
    queryKey: ['public-pages', slug],
    queryFn: () => api.get(`/public/${slug}/pages`).then((res) => res.data),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });

/** All pages of the authenticated wedding (Site Studio). */
export const usePages = () =>
  useQuery<PublicPageRecord[]>({
    queryKey: ['pages'],
    queryFn: () => api.get('/pages').then((res) => res.data),
  });

const invalidatePages = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['pages'] });
  queryClient.invalidateQueries({ queryKey: ['public-pages'] });
};

export const useCreatePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PublicPageRecord>) =>
      api.post('/pages', payload).then((res) => res.data),
    onSuccess: (created: PublicPageRecord) => {
      // Seed the cache immediately so the newly created page is present
      // before the invalidated refetch lands (avoids a stale-list render
      // where the selection falls back to the home page).
      queryClient.setQueryData<PublicPageRecord[]>(['pages'], (old) => [
        ...(old ?? []),
        created,
      ]);
      invalidatePages(queryClient);
    },
  });
};

export const useUpdatePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<PublicPageRecord> & { id: string }) =>
      api.put(`/pages/${id}`, payload).then((res) => res.data),
    onSuccess: () => invalidatePages(queryClient),
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pages/${id}`).then((res) => res.data),
    onSuccess: () => invalidatePages(queryClient),
  });
};

// =====================================================
// DASHBOARD HOOKS
// =====================================================

export interface DashboardStats {
  guests: { total: number; bride: number; groom: number };
  rsvp: { confirmed: number; pending: number };
  tasks: { pending: number; completed: number };
  expense: {
    total: number;
    committed: number;
    paid: number;
    outstanding: number;
    remaining: number;
  };
}

export interface FinanceTimelinePayment extends PaymentRow {
  expense: {
    id: string;
    description: string;
    source_type: 'manual' | 'vendor' | 'venue';
    source_id: string | null;
  };
  expense_summary: ExpenseBalanceSummary | null;
}

export interface ExpenseOutstandingItem {
  id: string;
  name: string;
  type: 'manual' | 'vendor' | 'venue';
  totalCost: number;
  paid: number;
  outstanding: number;
  expense_id: string;
}

export interface ExpenseAlerts {
  overduePayments: FinanceTimelinePayment[];
  overdueCount: number;
  overdueTotal: number;
  upcomingPayments: FinanceTimelinePayment[];
  upcomingCount: number;
  upcomingTotal: number;
  overBudgetCategories: Array<{ id: string; name: string; overBy: number }>;
  nearBudgetCategories: Array<{ id: string; name: string; percentage: number }>;
}

export const useDashboardStats = () =>
  useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then((res) => res.data),
  });

export interface DashboardSummary {
  events: Array<{
    id: string;
    name: string;
    event_date: string;
    start_time?: string;
    theme?: string;
    color_palette?: unknown;
  }>;
}

export const useDashboardSummary = () =>
  useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/dashboard/summary').then((res) => res.data),
  });

export interface ActivityItem {
  what: string;
  when: string;
  actor_name: string | null;
}

export const useRecentActivity = () =>
  useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.get('/dashboard/activity').then((res) => res.data),
    staleTime: 30 * 1000,
  });

// =====================================================
// GUESTS HOOKS
// =====================================================

export interface GuestFilters {
  side?: string;
  needs_accommodation?: string;
  search?: string;
}

export const useGuests = (filters: GuestFilters = {}) =>
  useQuery<GuestWithDetails[]>({
    queryKey: ['guests', filters],
    queryFn: () => api.get('/guests', { params: filters }).then((res) => res.data),
  });

export interface GuestSummary {
  total: number;
  bride: number;
  groom: number;
  confirmed: number;
  pending: number;
  declined: number;
}

export const useGuestSummary = () =>
  useQuery<GuestSummary>({
    queryKey: ['guests', 'summary'],
    queryFn: () => api.get('/guests/summary').then((res) => res.data),
  });

export const useGuestGroups = () =>
  useQuery<any[]>({
    queryKey: ['guests', 'groups'],
    queryFn: () => api.get('/guests/groups').then((res) => res.data),
  });

export const useGuest = (id?: string | null) =>
  useQuery<GuestWithDetails>({
    queryKey: ['guests', id],
    queryFn: () => api.get(`/guests/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useCreateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestData: any) => api.post('/guests', guestData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useBulkCreateGuests = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guests: any[]) => api.post('/guests/bulk', { guests }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/guests/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/guests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useSetOverallRsvp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; rsvp_status: string; plus_ones?: number }) =>
      api.put(`/guests/${id}/rsvp`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateGuestRsvp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      guestId,
      eventId,
      ...data
    }: {
      guestId: string;
      eventId: string;
      rsvp_status?: string;
      plus_ones?: number;
    }) => api.put(`/guests/${guestId}/rsvp/${eventId}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useBulkDeleteGuests = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.delete('/guests/bulk', { data: { ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

// =====================================================
// EVENTS HOOKS
// =====================================================

export const useEvents = () =>
  useQuery<EventWithVenue[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then((res) => res.data),
  });

export const useEvent = (id?: string | null) =>
  useQuery<EventWithVenue>({
    queryKey: ['events', id],
    queryFn: () => api.get(`/events/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useEventGuests = (eventId?: string | null) =>
  useQuery<any[]>({
    queryKey: ['events', eventId, 'guests'],
    queryFn: () => api.get(`/events/${eventId}/guests`).then((res) => res.data),
    enabled: !!eventId,
  });

export const useEventVendors = (eventId?: string | null) =>
  useQuery<any[]>({
    queryKey: ['events', eventId, 'vendors'],
    queryFn: () => api.get(`/events/${eventId}/vendors`).then((res) => res.data),
    enabled: !!eventId,
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventData: any) => api.post('/events', eventData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/events/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// VENUES HOOKS
// =====================================================

export const useVenues = () =>
  useQuery<VenueWithFinance[]>({
    queryKey: ['venues'],
    queryFn: () => api.get('/venues').then((res) => res.data),
  });

export const useVenue = (id?: string | null) =>
  useQuery<VenueWithFinance>({
    queryKey: ['venues', id],
    queryFn: () => api.get(`/venues/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useCreateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (venueData: any) => api.post('/venues', venueData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/venues/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/venues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// ACCOMMODATIONS HOOKS (backed by /venues/* endpoints)
// =====================================================

export const useAccommodations = () =>
  useQuery<any[]>({
    queryKey: ['accommodations'],
    queryFn: () => api.get('/venues').then((res) => res.data),
  });

export const useAccommodation = (id?: string | null) =>
  useQuery<any>({
    queryKey: ['accommodations', id],
    queryFn: () => api.get(`/venues/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useAccommodationRooms = (venueId?: string | null) =>
  useQuery<any[]>({
    queryKey: ['accommodations', venueId, 'rooms'],
    queryFn: () => api.get(`/venues/${venueId}/rooms`).then((res) => res.data),
    enabled: !!venueId,
  });

export const useAllocationMatrix = () =>
  useQuery<any>({
    queryKey: ['accommodations', 'allocation-matrix'],
    queryFn: () => api.get('/venues/allocations/matrix').then((res) => res.data),
  });

export const useUnassignedGuests = () =>
  useQuery<any[]>({
    queryKey: ['accommodations', 'unassigned-guests'],
    queryFn: () => api.get('/venues/allocations/unassigned').then((res) => res.data),
  });

export const useCreateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api.post('/venues', { ...data, has_accommodation: true }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useUpdateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/venues/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useDeleteAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/venues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accommodationId, ...data }: { accommodationId: string } & Record<string, any>) =>
      api.post(`/venues/${accommodationId}/rooms`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/venues/rooms/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/venues/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useCreateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allocationData: any) =>
      api.post('/venues/allocations', allocationData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/venues/allocations/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useDeleteAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/venues/allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

// =====================================================
// VENUE PAYMENTS HOOKS
// =====================================================

export const useVenuePayments = (venueId?: string | null) =>
  useQuery<PaymentRow[]>({
    queryKey: ['venues', venueId, 'payments'],
    queryFn: () => api.get(`/venues/${venueId}/payments`).then((res) => res.data),
    enabled: !!venueId,
  });

export const useAddVenuePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, ...data }: { venueId: string } & Record<string, any>) =>
      api.post(`/venues/${venueId}/payments`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteVenuePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, paymentId }: { venueId: string; paymentId: string }) =>
      api.delete(`/venues/${venueId}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// VENDOR PAYMENT MUTATIONS (add/delete)
// =====================================================

export const useAddVendorPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, ...data }: { vendorId: string } & Record<string, any>) =>
      api.post(`/vendors/${vendorId}/payments`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteVendorPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, paymentId }: { vendorId: string; paymentId: string }) =>
      api.delete(`/vendors/${vendorId}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// VENDORS HOOKS
// =====================================================

export type VendorPaymentFilter = 'quoted' | 'deposit' | 'confirmed';
export type VendorLogisticsFilter = 'food' | 'accommodation' | 'team';

export interface VendorsListParams {
  category_ids?: string[];
  payment_states?: VendorPaymentFilter[];
  logistics?: VendorLogisticsFilter[];
  search?: string;
  page?: number;
  per_page?: number;
}

export interface VendorsListResponse {
  items: VendorWithFinance[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export const useVendors = () =>
  useQuery<VendorWithFinance[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').then((res) => res.data),
  });

export const useVendorsList = (params: VendorsListParams) =>
  useQuery<VendorsListResponse>({
    queryKey: ['vendors', 'list', params],
    queryFn: () =>
      api
        .get('/vendors', {
          params: {
            ...params,
            category_ids: params.category_ids?.join(','),
            payment_states: params.payment_states?.join(','),
            logistics: params.logistics?.join(','),
          },
        })
        .then((res) => res.data),
    placeholderData: (previousData) => previousData,
  });

export const useVendor = (id?: string | null) =>
  useQuery<VendorWithFinance>({
    queryKey: ['vendors', id],
    queryFn: () => api.get(`/vendors/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useVendorCategories = () =>
  useQuery<{ value: string; label: string }[]>({
    queryKey: ['vendors', 'categories'],
    queryFn: () => api.get('/vendors/categories').then((res) => res.data),
  });

export const useVendorPayments = (vendorId?: string | null) =>
  useQuery<PaymentRow[]>({
    queryKey: ['vendors', vendorId, 'payments'],
    queryFn: () => api.get(`/vendors/${vendorId}/payments`).then((res) => res.data),
    enabled: !!vendorId,
  });

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorData: any) => api.post('/vendors', vendorData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/vendors/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// EXPENSE HOOKS
// =====================================================

export interface ExpenseSummary {
  totalExpense: number;
  brideContribution: number;
  groomContribution: number;
  totalCommitted: number;
  totalSpent: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingBudget: number;
  remaining: number;
}

export const useExpenseSummary = () =>
  useQuery<ExpenseSummary>({
    queryKey: ['expense', 'summary'],
    queryFn: () => api.get('/expense').then((res) => res.data),
  });

export const useExpenseOverview = () =>
  useQuery<any[]>({
    queryKey: ['expense', 'overview'],
    queryFn: () => api.get('/expense/overview').then((res) => res.data),
  });

export const useExpenseByCategory = () =>
  useQuery<any>({
    queryKey: ['expense', 'by-category'],
    queryFn: () => api.get('/expense/expenses/by-category').then((res) => res.data),
  });

export const useExpenseBySide = () =>
  useQuery<any>({
    queryKey: ['expense', 'by-side'],
    queryFn: () => api.get('/expense/by-side').then((res) => res.data),
  });

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allocated_amount }: { id: string; allocated_amount: number }) =>
      api.put(`/expense/categories/${id}`, { allocated_amount }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense'] });
    },
  });
};

export const useExpenseCategories = () =>
  useQuery<any[]>({
    queryKey: ['expense', 'categories'],
    queryFn: () => api.get('/expense/categories').then((res) => res.data),
  });

export const useCategoryTree = () =>
  useQuery<any[]>({
    queryKey: ['expense', 'categories', 'tree'],
    queryFn: () => api.get('/expense/categories/tree').then((res) => res.data),
  });

export const useExpensesByCategoryTree = () =>
  useQuery<any>({
    queryKey: ['expense', 'expenses', 'by-category-tree'],
    queryFn: () => api.get('/expense/expenses/by-category-tree').then((res) => res.data),
  });

export const useExpenses = (filters: Record<string, string> = {}) =>
  useQuery<ExpenseWithDetails[]>({
    queryKey: ['expense', 'expenses', filters],
    queryFn: () => api.get('/expense/expenses', { params: filters }).then((res) => res.data),
  });

export const useVendorExpenseSummary = () =>
  useQuery<any[]>({
    queryKey: ['expense', 'vendors', 'summary'],
    queryFn: () => api.get('/expense/vendors/summary').then((res) => res.data),
  });

export const useVendorsBySide = () =>
  useQuery<any>({
    queryKey: ['expense', 'vendors', 'by-side'],
    queryFn: () => api.get('/expense/vendors/by-side').then((res) => res.data),
  });

export interface SideSummary {
  bride: { total: number };
  groom: { total: number };
}

export const useSideSummary = () =>
  useQuery<SideSummary>({
    queryKey: ['expense', 'side-summary'],
    queryFn: () => api.get('/expense/side-summary').then((res) => res.data),
  });

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseData: any) =>
      api.post('/expense/expenses', expenseData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/expense/expenses/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expense/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCreateCustomCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryData: any) =>
      api.post('/expense/categories/custom', categoryData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', 'categories'] });
    },
  });
};

export const useExpensePayments = () =>
  useQuery<FinanceTimelinePayment[]>({
    queryKey: ['expense', 'payments'],
    queryFn: () => api.get('/expense/payments').then((res) => res.data),
  });

export const useExpenseOutstanding = () =>
  useQuery<{ items: ExpenseOutstandingItem[]; totalOutstanding: number }>({
    queryKey: ['expense', 'outstanding'],
    queryFn: () => api.get('/expense/outstanding').then((res) => res.data),
  });

export const useExpenseAlerts = () =>
  useQuery<ExpenseAlerts>({
    queryKey: ['expense', 'alerts'],
    queryFn: () => api.get('/expense/alerts').then((res) => res.data),
  });

export const useSourcePayments = (sourceType: 'vendor' | 'venue', sourceId?: string | null) =>
  useQuery<PaymentRow[]>({
    queryKey: [sourceType, sourceId, 'payments'],
    queryFn: () => api.get(`/${sourceType}s/${sourceId}/payments`).then((res) => res.data),
    enabled: !!sourceId,
  });

const getSourceListQueryKey = (sourceType: 'vendor' | 'venue') =>
  [sourceType === 'vendor' ? 'vendors' : 'venues'] as const;

const syncSourceFinanceCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  sourceType: 'vendor' | 'venue',
  sourceId: string,
  finance: ExpenseWithDetails,
) => {
  queryClient.setQueryData([sourceType, sourceId, 'payments'], finance.payments ?? []);

  const listKey = getSourceListQueryKey(sourceType);
  queryClient.setQueryData(
    listKey,
    (current: VendorWithFinance[] | VenueWithFinance[] | undefined) => {
      if (!Array.isArray(current)) return current;
      return current.map((entry) =>
        entry.id === sourceId
          ? {
              ...entry,
              finance,
              finance_summary: finance.summary,
            }
          : entry,
      );
    },
  );

  queryClient.setQueryData(
    [listKey[0], sourceId],
    (current: VendorWithFinance | VenueWithFinance | undefined) => {
      if (!current) return current;
      return {
        ...current,
        finance,
        finance_summary: finance.summary,
      };
    },
  );
};

export const useCreateSourcePayment = (sourceType: 'vendor' | 'venue') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, ...data }: { sourceId: string } & Record<string, any>) =>
      api.post(`/${sourceType}s/${sourceId}/payments`, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      if (variables?.sourceId && data?.summary) {
        syncSourceFinanceCache(
          queryClient,
          sourceType,
          variables.sourceId,
          data as ExpenseWithDetails,
        );
      }
      if (variables?.sourceId) {
        queryClient.invalidateQueries({ queryKey: [sourceType, variables.sourceId, 'payments'] });
      }
      queryClient.invalidateQueries({ queryKey: getSourceListQueryKey(sourceType) });
      if (sourceType === 'venue') queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteSourcePayment = (sourceType: 'vendor' | 'venue') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, paymentId }: { sourceId: string; paymentId: string }) =>
      api.delete(`/${sourceType}s/${sourceId}/payments/${paymentId}`),
    onMutate: async ({ sourceId, paymentId }) => {
      await queryClient.cancelQueries({ queryKey: [sourceType, sourceId, 'payments'] });
      const previousPayments = queryClient.getQueryData<PaymentRow[]>([
        sourceType,
        sourceId,
        'payments',
      ]);
      queryClient.setQueryData<PaymentRow[]>([sourceType, sourceId, 'payments'], (current = []) =>
        current.filter((payment) => payment.id !== paymentId),
      );
      return { previousPayments, sourceId };
    },
    onError: (_error, _variables, context) => {
      if (!context?.sourceId) return;
      queryClient.setQueryData(
        [sourceType, context.sourceId, 'payments'],
        context.previousPayments,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [sourceType, variables.sourceId, 'payments'] });
      queryClient.invalidateQueries({ queryKey: getSourceListQueryKey(sourceType) });
      if (sourceType === 'venue') queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useExpensePaymentsForExpense = (expenseId?: string | null) =>
  useQuery<PaymentRow[]>({
    queryKey: ['expense', expenseId, 'payments'],
    queryFn: () => api.get(`/expense/expenses/${expenseId}/payments`).then((res) => res.data),
    enabled: !!expenseId,
  });

export const useCreateExpensePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: { expenseId: string } & Record<string, any>) =>
      api.post(`/expense/expenses/${expenseId}/payments`, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      if (variables?.expenseId && data) {
        queryClient.setQueryData(
          ['expense', variables.expenseId, 'payments'],
          (data as ExpenseWithDetails).payments ?? [],
        );
      }
      if (variables?.expenseId) {
        queryClient.invalidateQueries({ queryKey: ['expense', variables.expenseId, 'payments'] });
      }
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteExpensePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId }: { expenseId: string; paymentId: string }) =>
      api.delete(`/expense/payments/${paymentId}`),
    onMutate: async ({ expenseId, paymentId }) => {
      await queryClient.cancelQueries({ queryKey: ['expense', expenseId, 'payments'] });
      const previousPayments = queryClient.getQueryData<PaymentRow[]>([
        'expense',
        expenseId,
        'payments',
      ]);
      queryClient.setQueryData<PaymentRow[]>(['expense', expenseId, 'payments'], (current = []) =>
        current.filter((payment) => payment.id !== paymentId),
      );
      return { previousPayments, expenseId };
    },
    onError: (_error, _variables, context) => {
      if (!context?.expenseId) return;
      queryClient.setQueryData(['expense', context.expenseId, 'payments'], context.previousPayments);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expense', variables.expenseId, 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['expense'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// TASKS HOOKS
// =====================================================

export interface TaskFilters {
  status?: string;
  priority?: string;
}

export const useTasks = (filters: TaskFilters = {}) =>
  useQuery<any[]>({
    queryKey: ['tasks', filters],
    queryFn: () => api.get('/tasks', { params: filters }).then((res) => res.data),
  });

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export const useTaskStats = () =>
  useQuery<TaskStats>({
    queryKey: ['tasks', 'stats'],
    queryFn: () => api.get('/tasks/stats').then((res) => res.data),
  });

export const useOverdueTasks = () =>
  useQuery<any[]>({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => api.get('/tasks/overdue').then((res) => res.data),
  });

export const useUpcomingTasks = () =>
  useQuery<any[]>({
    queryKey: ['tasks', 'upcoming'],
    queryFn: () => api.get('/tasks/upcoming').then((res) => res.data),
  });

export const useTask = (id?: string | null) =>
  useQuery<any>({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/tasks/${id}`).then((res) => res.data),
    enabled: !!id,
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskData: any) => api.post('/tasks', taskData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/tasks/${id}/status`, { status }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// AUTH / ACCOUNT HOOKS
// =====================================================

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) =>
      api.post('/auth/forgot-password', { email }).then((res) => res.data),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api.post('/auth/reset-password', { token, password }).then((res) => res.data),
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (token: string) => api.post('/auth/verify-email', { token }).then((res) => res.data),
  });

export const useResendVerification = () =>
  useMutation({
    mutationFn: () => api.post('/auth/resend-verification').then((res) => res.data),
  });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (updates: { name?: string; email?: string; slug?: string; currency?: string }) =>
      api
        .patch<{
          slug?: string | null;
          currency?: string;
          email_verified?: boolean;
          verification_email_sent?: boolean;
        }>('/auth/me', updates)
        .then((res) => res.data),
  });

export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: { oldPassword: string; newPassword: string }) =>
      api
        .post<{ message: string; token?: string }>('/auth/change-password', payload)
        .then((res) => res.data),
    onSuccess: (data) => {
      // Changing the password invalidates all previous tokens (including the
      // one this request used) — swap in the fresh one the API returned.
      if (data.token) localStorage.setItem('token', data.token);
    },
  });

export const useDeleteAccount = () =>
  useMutation({
    mutationFn: () => api.delete('/auth/me'),
  });

// =====================================================
// MEMBERS / COLLABORATION HOOKS
// =====================================================

export interface WeddingMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  invited_email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'active';
  /** null = full access; a non-empty array limits the member to those sections */
  allowed_sections: string[] | null;
  /** Fine-grained grants (e.g. 'budget:splits', 'members:manage'). Admins implicitly hold all. */
  permissions: string[];
  created_at: string;
}

export const useMembers = () =>
  useQuery<WeddingMember[]>({
    queryKey: ['members'],
    queryFn: () => api.get('/members').then((res) => res.data),
  });

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      email: string;
      role: string;
      sections?: string[] | null;
      permissions?: string[];
    }) => api.post('/members/invite', payload).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
};

export const useAcceptInvite = () =>
  useMutation({
    mutationFn: (token: string) =>
      api.post('/members/accept', { token }).then((res) => res.data),
  });

export interface PendingInvite {
  id: string;
  owner_id: string;
  role: 'admin' | 'editor' | 'viewer';
  allowed_sections: string[] | null;
  created_at: string;
  owner: { name: string | null; slug: string | null } | null;
}

/** Invites addressed to the logged-in user's email, not yet accepted. */
export const usePendingInvites = (enabled = true) =>
  useQuery<PendingInvite[]>({
    queryKey: ['pending-invites'],
    queryFn: () => api.get('/members/pending').then((res) => res.data),
    enabled,
  });

export const useAcceptPendingInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/members/pending/${id}/accept`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
    },
  });
};

export const useDeclinePendingInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/members/pending/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-invites'] }),
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      role,
      sections,
      permissions,
    }: {
      id: string;
      role?: string;
      sections?: string[] | null;
      permissions?: string[];
    }) =>
      api
        .patch(`/members/${id}`, {
          ...(role !== undefined ? { role } : {}),
          ...(sections !== undefined ? { sections } : {}),
          ...(permissions !== undefined ? { permissions } : {}),
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
};

// =====================================================
// EXPORT HOOKS
// =====================================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function useExport(path: string, filename: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(path, { responseType: 'blob' });
      downloadBlob(res.data, filename);
    },
  });
}

export const useExportGuests = () => useExport('/guests/export', 'guests.xlsx');
export const useExportBudget = () => useExport('/expense/export', 'budget.xlsx');
export const useExportVendors = () => useExport('/vendors/export', 'vendors.xlsx');
export const useExportAllocations = () =>
  useExport('/venues/allocations/export', 'accommodations.xlsx');

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
};

// =====================================================
// WEDDING SWITCHER HOOKS
// =====================================================

export interface WeddingOption {
  ownerId: string;
  label: string;
  role: 'admin' | 'editor' | 'viewer';
  isOwn: boolean;
}

export const useWeddings = () =>
  useQuery<{ activeOwnerId: string; weddings: WeddingOption[] }>({
    queryKey: ['weddings'],
    queryFn: () => api.get('/auth/weddings').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

export const useSetActiveWedding = () =>
  useMutation({
    mutationFn: (ownerId: string) =>
      api.post('/auth/active-wedding', { ownerId }).then((res) => res.data),
    // Switching changes every scoped query, the slug and the currency; a full
    // reload re-resolves the auth context and refetches everything cleanly.
    onSuccess: () => window.location.reload(),
  });
