/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import type { HeroContent, GuestWithDetails, EventWithVenue, VenueRow } from '@wedding-planner/shared';

// =====================================================
// SETUP HOOKS
// =====================================================

export const useSetupStatus = () => useQuery({
  queryKey: ['setup-status'],
  queryFn: () => api.get('/setup-status').then(res => res.data),
  staleTime: Infinity,
});

// =====================================================
// USER MANAGEMENT HOOKS
// =====================================================

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'family' | 'friends';
  created_at: string;
}

export const useUsers = () => useQuery<TeamMember[]>({
  queryKey: ['users'],
  queryFn: () => api.get('/auth/users').then(res => res.data),
});

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData: { name: string; email: string; password: string; role: string }) =>
      api.post('/auth/create-user', userData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// =====================================================
// WEBSITE CONTENT HOOKS
// =====================================================

export const useHeroContent = (slug?: string | null) => useQuery<HeroContent>({
  queryKey: ['website-content', 'hero', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/hero`).then(res => res.data)
      : api.get('/website-content/hero').then(res => res.data),
  staleTime: 10 * 60 * 1000,
  enabled: true,
});

export const useCoupleContent = (slug?: string | null) => useQuery<any>({
  queryKey: ['website-content', 'couple', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/couple`).then(res => res.data)
      : api.get('/website-content/couple').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export const useOurStory = (slug?: string | null) => useQuery<any>({
  queryKey: ['website-content', 'story', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/our_story`).then(res => res.data)
      : api.get('/website-content/story').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export interface GalleryContent {
  images: { url: string; alt?: string }[];
  subtitle?: string;
}

export const useGalleryContent = (slug?: string | null) => useQuery<GalleryContent>({
  queryKey: ['website-content', 'gallery', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/gallery`).then(res => res.data)
      : api.get('/website-content/gallery').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export interface PublicEvent {
  name: string;
  description?: string;
  date?: string;
  time?: string;
  venue?: string;
  color?: string;
  dress?: string;
}

export const usePublicEvents = (slug?: string | null) => useQuery<PublicEvent[]>({
  queryKey: ['public-events', slug],
  queryFn: () => api.get(`/public/${slug}/events`).then(res => res.data),
  enabled: !!slug,
  staleTime: 5 * 60 * 1000,
});

// =====================================================
// DASHBOARD HOOKS
// =====================================================

export interface DashboardStats {
  guests: { total: number; bride: number; groom: number };
  rsvp: { confirmed: number; pending: number };
  tasks: { pending: number; completed: number };
  budget: { total: number; spent: number };
}

export const useDashboardStats = () => useQuery<DashboardStats>({
  queryKey: ['dashboard', 'stats'],
  queryFn: () => api.get('/dashboard/stats').then(res => res.data),
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

export const useDashboardSummary = () => useQuery<DashboardSummary>({
  queryKey: ['dashboard', 'summary'],
  queryFn: () => api.get('/dashboard/summary').then(res => res.data),
});

export interface CountdownData {
  weddingDate?: string;
}

export const useCountdown = () => useQuery<CountdownData>({
  queryKey: ['dashboard', 'countdown'],
  queryFn: () => api.get('/dashboard/countdown').then(res => res.data),
  refetchInterval: 60000,
});

// =====================================================
// GUESTS HOOKS
// =====================================================

export interface GuestFilters {
  side?: string;
  needs_accommodation?: string;
  search?: string;
}

export const useGuests = (filters: GuestFilters = {}) => useQuery<GuestWithDetails[]>({
  queryKey: ['guests', filters],
  queryFn: () => api.get('/guests', { params: filters }).then(res => res.data),
});

export interface GuestSummary {
  total: number;
  bride: number;
  groom: number;
  confirmed: number;
  pending: number;
  declined: number;
}

export const useGuestSummary = () => useQuery<GuestSummary>({
  queryKey: ['guests', 'summary'],
  queryFn: () => api.get('/guests/summary').then(res => res.data),
});

export const useGuestGroups = () => useQuery<any[]>({
  queryKey: ['guests', 'groups'],
  queryFn: () => api.get('/guests/groups').then(res => res.data),
});

export const useGuest = (id?: string | null) => useQuery<GuestWithDetails>({
  queryKey: ['guests', id],
  queryFn: () => api.get(`/guests/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestData: any) => api.post('/guests', guestData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useUpdateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/guests/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useDeleteGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/guests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

// =====================================================
// EVENTS HOOKS
// =====================================================

export const useEvents = () => useQuery<EventWithVenue[]>({
  queryKey: ['events'],
  queryFn: () => api.get('/events').then(res => res.data),
});

export const useEvent = (id?: string | null) => useQuery<EventWithVenue>({
  queryKey: ['events', id],
  queryFn: () => api.get(`/events/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useEventGuests = (eventId?: string | null) => useQuery<any[]>({
  queryKey: ['events', eventId, 'guests'],
  queryFn: () => api.get(`/events/${eventId}/guests`).then(res => res.data),
  enabled: !!eventId,
});

export const useEventVendors = (eventId?: string | null) => useQuery<any[]>({
  queryKey: ['events', eventId, 'vendors'],
  queryFn: () => api.get(`/events/${eventId}/vendors`).then(res => res.data),
  enabled: !!eventId,
});

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventData: any) => api.post('/events', eventData).then(res => res.data),
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
      api.put(`/events/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
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

export const useVenues = () => useQuery<VenueRow[]>({
  queryKey: ['venues'],
  queryFn: () => api.get('/venues').then(res => res.data),
});

export const useVenue = (id?: string | null) => useQuery<any>({
  queryKey: ['venues', id],
  queryFn: () => api.get(`/venues/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (venueData: any) => api.post('/venues', venueData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useUpdateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/venues/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useDeleteVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/venues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

// =====================================================
// ACCOMMODATIONS HOOKS
// =====================================================

export const useAccommodations = () => useQuery<any[]>({
  queryKey: ['accommodations'],
  queryFn: () => api.get('/accommodations').then(res => res.data),
});

export const useAccommodation = (id?: string | null) => useQuery<any>({
  queryKey: ['accommodations', id],
  queryFn: () => api.get(`/accommodations/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useAccommodationRooms = (accommodationId?: string | null) => useQuery<any[]>({
  queryKey: ['accommodations', accommodationId, 'rooms'],
  queryFn: () => api.get(`/accommodations/${accommodationId}/rooms`).then(res => res.data),
  enabled: !!accommodationId,
});

export const useRoomAllocations = () => useQuery<any[]>({
  queryKey: ['accommodations', 'allocations'],
  queryFn: () => api.get('/accommodations/allocations').then(res => res.data),
});

export const useAllocationMatrix = () => useQuery<any>({
  queryKey: ['accommodations', 'allocation-matrix'],
  queryFn: () => api.get('/accommodations/allocations/matrix').then(res => res.data),
});

export const useUnassignedGuests = () => useQuery<any[]>({
  queryKey: ['accommodations', 'unassigned-guests'],
  queryFn: () => api.get('/accommodations/allocations/unassigned').then(res => res.data),
});

export const useCreateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/accommodations', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/accommodations/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accommodations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accommodationId, ...data }: { accommodationId: string } & Record<string, any>) =>
      api.post(`/accommodations/${accommodationId}/rooms`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useCreateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allocationData: any) => api.post('/accommodations/allocations', allocationData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/accommodations/allocations/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accommodations/allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

// =====================================================
// VENDORS HOOKS
// =====================================================

export const useVendors = (category?: string) => useQuery<any[]>({
  queryKey: ['vendors', { category }],
  queryFn: () => api.get('/vendors', { params: category ? { category } : {} }).then(res => res.data),
});

export const useVendor = (id?: string | null) => useQuery<any>({
  queryKey: ['vendors', id],
  queryFn: () => api.get(`/vendors/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useVendorCategories = () => useQuery<{ value: string; label: string }[]>({
  queryKey: ['vendors', 'categories'],
  queryFn: () => api.get('/vendors/categories').then(res => res.data),
});

export const useVendorPayments = (vendorId?: string | null) => useQuery<any[]>({
  queryKey: ['vendors', vendorId, 'payments'],
  queryFn: () => api.get(`/vendors/${vendorId}/payments`).then(res => res.data),
  enabled: !!vendorId,
});

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorData: any) => api.post('/vendors', vendorData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/vendors/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

// =====================================================
// BUDGET HOOKS
// =====================================================

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
}

export const useBudgetSummary = () => useQuery<BudgetSummary>({
  queryKey: ['budget', 'summary'],
  queryFn: () => api.get('/budget').then(res => res.data),
});

export const useBudgetOverview = () => useQuery<any[]>({
  queryKey: ['budget', 'overview'],
  queryFn: () => api.get('/budget/overview').then(res => res.data),
});

export const useBudgetByCategory = () => useQuery<any>({
  queryKey: ['budget', 'by-category'],
  queryFn: () => api.get('/budget/expenses/by-category').then(res => res.data),
});

export const useBudgetBySide = () => useQuery<any>({
  queryKey: ['budget', 'by-side'],
  queryFn: () => api.get('/budget/by-side').then(res => res.data),
});

export const useBudgetCategories = () => useQuery<any[]>({
  queryKey: ['budget', 'categories'],
  queryFn: () => api.get('/budget/categories').then(res => res.data),
});

export const useCategoryTree = () => useQuery<any[]>({
  queryKey: ['budget', 'categories', 'tree'],
  queryFn: () => api.get('/budget/categories/tree').then(res => res.data),
});

export const useExpensesByCategoryTree = () => useQuery<any>({
  queryKey: ['budget', 'expenses', 'by-category-tree'],
  queryFn: () => api.get('/budget/expenses/by-category-tree').then(res => res.data),
});

export const useExpenses = (filters: Record<string, string> = {}) => useQuery<any[]>({
  queryKey: ['budget', 'expenses', filters],
  queryFn: () => api.get('/budget/expenses', { params: filters }).then(res => res.data),
});

export const useVendorBudgetSummary = () => useQuery<any[]>({
  queryKey: ['budget', 'vendors', 'summary'],
  queryFn: () => api.get('/budget/vendors/summary').then(res => res.data),
});

export const useVendorsBySide = () => useQuery<any>({
  queryKey: ['budget', 'vendors', 'by-side'],
  queryFn: () => api.get('/budget/vendors/by-side').then(res => res.data),
});

export interface SideSummary {
  bride: { total: number };
  groom: { total: number };
}

export const useSideSummary = () => useQuery<SideSummary>({
  queryKey: ['budget', 'side-summary'],
  queryFn: () => api.get('/budget/side-summary').then(res => res.data),
});

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseData: any) => api.post('/budget/expenses', expenseData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.put(`/budget/expenses/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budget/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};

export const useCreateCustomCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryData: any) => api.post('/budget/categories/custom', categoryData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
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

export const useTasks = (filters: TaskFilters = {}) => useQuery<any[]>({
  queryKey: ['tasks', filters],
  queryFn: () => api.get('/tasks', { params: filters }).then(res => res.data),
});

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export const useTaskStats = () => useQuery<TaskStats>({
  queryKey: ['tasks', 'stats'],
  queryFn: () => api.get('/tasks/stats').then(res => res.data),
});

export const useOverdueTasks = () => useQuery<any[]>({
  queryKey: ['tasks', 'overdue'],
  queryFn: () => api.get('/tasks/overdue').then(res => res.data),
});

export const useUpcomingTasks = () => useQuery<any[]>({
  queryKey: ['tasks', 'upcoming'],
  queryFn: () => api.get('/tasks/upcoming').then(res => res.data),
});

export const useTask = (id?: string | null) => useQuery<any>({
  queryKey: ['tasks', id],
  queryFn: () => api.get(`/tasks/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskData: any) => api.post('/tasks', taskData).then(res => res.data),
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
      api.put(`/tasks/${id}`, data).then(res => res.data),
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
      api.put(`/tasks/${id}/status`, { status }).then(res => res.data),
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
