import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

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

export const useUsers = () => useQuery({
  queryKey: ['users'],
  queryFn: () => api.get('/auth/users').then(res => res.data),
});

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => api.post('/auth/create-user', userData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// =====================================================
// WEBSITE CONTENT HOOKS
// =====================================================

// When a slug is provided, fetches public content (no auth required).
// When called without slug (e.g. from admin pages), falls back to authenticated endpoint.
export const useHeroContent = (slug) => useQuery({
  queryKey: ['website-content', 'hero', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/hero`).then(res => res.data)
      : api.get('/website-content/hero').then(res => res.data),
  staleTime: 10 * 60 * 1000, // 10 minutes
  enabled: true,
});

export const useCoupleContent = (slug) => useQuery({
  queryKey: ['website-content', 'couple', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/couple`).then(res => res.data)
      : api.get('/website-content/couple').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export const useOurStory = (slug) => useQuery({
  queryKey: ['website-content', 'story', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/our_story`).then(res => res.data)
      : api.get('/website-content/story').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export const useGalleryContent = (slug) => useQuery({
  queryKey: ['website-content', 'gallery', slug || 'authed'],
  queryFn: () =>
    slug
      ? api.get(`/public/${slug}/website-content/gallery`).then(res => res.data)
      : api.get('/website-content/gallery').then(res => res.data),
  staleTime: 10 * 60 * 1000,
});

export const usePublicEvents = (slug) => useQuery({
  queryKey: ['public-events', slug],
  queryFn: () => api.get(`/public/${slug}/events`).then(res => res.data),
  enabled: !!slug,
  staleTime: 5 * 60 * 1000,
});

// =====================================================
// DASHBOARD HOOKS
// =====================================================

export const useDashboardStats = () => useQuery({
  queryKey: ['dashboard', 'stats'],
  queryFn: () => api.get('/dashboard/stats').then(res => res.data),
});

export const useDashboardSummary = () => useQuery({
  queryKey: ['dashboard', 'summary'],
  queryFn: () => api.get('/dashboard/summary').then(res => res.data),
});

export const useCountdown = () => useQuery({
  queryKey: ['dashboard', 'countdown'],
  queryFn: () => api.get('/dashboard/countdown').then(res => res.data),
  refetchInterval: 60000, // Refetch every minute
});

// =====================================================
// GUESTS HOOKS
// =====================================================

export const useGuests = (filters = {}) => useQuery({
  queryKey: ['guests', filters],
  queryFn: () => api.get('/guests', { params: filters }).then(res => res.data),
});

export const useGuestSummary = () => useQuery({
  queryKey: ['guests', 'summary'],
  queryFn: () => api.get('/guests/summary').then(res => res.data),
});

export const useGuestGroups = () => useQuery({
  queryKey: ['guests', 'groups'],
  queryFn: () => api.get('/guests/groups').then(res => res.data),
});

export const useGuest = (id) => useQuery({
  queryKey: ['guests', id],
  queryFn: () => api.get(`/guests/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestData) => api.post('/guests', guestData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useUpdateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/guests/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

export const useDeleteGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/guests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
};

// =====================================================
// EVENTS HOOKS
// =====================================================

export const useEvents = () => useQuery({
  queryKey: ['events'],
  queryFn: () => api.get('/events').then(res => res.data),
});

export const useEvent = (id) => useQuery({
  queryKey: ['events', id],
  queryFn: () => api.get(`/events/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useEventGuests = (eventId) => useQuery({
  queryKey: ['events', eventId, 'guests'],
  queryFn: () => api.get(`/events/${eventId}/guests`).then(res => res.data),
  enabled: !!eventId,
});

export const useEventVendors = (eventId) => useQuery({
  queryKey: ['events', eventId, 'vendors'],
  queryFn: () => api.get(`/events/${eventId}/vendors`).then(res => res.data),
  enabled: !!eventId,
});

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventData) => api.post('/events', eventData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/events/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// =====================================================
// VENUES HOOKS
// =====================================================

export const useVenues = () => useQuery({
  queryKey: ['venues'],
  queryFn: () => api.get('/venues').then(res => res.data),
});

export const useVenue = (id) => useQuery({
  queryKey: ['venues', id],
  queryFn: () => api.get(`/venues/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (venueData) => api.post('/venues', venueData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useUpdateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/venues/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useDeleteVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/venues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

// =====================================================
// ACCOMMODATIONS HOOKS
// =====================================================

export const useAccommodations = () => useQuery({
  queryKey: ['accommodations'],
  queryFn: () => api.get('/accommodations').then(res => res.data),
});

export const useAccommodation = (id) => useQuery({
  queryKey: ['accommodations', id],
  queryFn: () => api.get(`/accommodations/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useAccommodationRooms = (accommodationId) => useQuery({
  queryKey: ['accommodations', accommodationId, 'rooms'],
  queryFn: () => api.get(`/accommodations/${accommodationId}/rooms`).then(res => res.data),
  enabled: !!accommodationId,
});

export const useRoomAllocations = () => useQuery({
  queryKey: ['accommodations', 'allocations'],
  queryFn: () => api.get('/accommodations/allocations').then(res => res.data),
});

export const useAllocationMatrix = () => useQuery({
  queryKey: ['accommodations', 'allocation-matrix'],
  queryFn: () => api.get('/accommodations/allocations/matrix').then(res => res.data),
});

export const useUnassignedGuests = () => useQuery({
  queryKey: ['accommodations', 'unassigned-guests'],
  queryFn: () => api.get('/accommodations/allocations/unassigned').then(res => res.data),
});

export const useCreateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/accommodations', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/accommodations/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteAccommodation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/accommodations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accommodationId, ...data }) =>
      api.post(`/accommodations/${accommodationId}/rooms`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useCreateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allocationData) => api.post('/accommodations/allocations', allocationData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/accommodations/allocations/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

export const useDeleteAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/accommodations/allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
};

// =====================================================
// VENDORS HOOKS
// =====================================================

export const useVendors = (category) => useQuery({
  queryKey: ['vendors', { category }],
  queryFn: () => api.get('/vendors', { params: category ? { category } : {} }).then(res => res.data),
});

export const useVendor = (id) => useQuery({
  queryKey: ['vendors', id],
  queryFn: () => api.get(`/vendors/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useVendorCategories = () => useQuery({
  queryKey: ['vendors', 'categories'],
  queryFn: () => api.get('/vendors/categories').then(res => res.data),
});

export const useVendorPayments = (vendorId) => useQuery({
  queryKey: ['vendors', vendorId, 'payments'],
  queryFn: () => api.get(`/vendors/${vendorId}/payments`).then(res => res.data),
  enabled: !!vendorId,
});

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorData) => api.post('/vendors', vendorData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/vendors/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

// =====================================================
// BUDGET HOOKS
// =====================================================

export const useBudgetSummary = () => useQuery({
  queryKey: ['budget', 'summary'],
  queryFn: () => api.get('/budget').then(res => res.data),
});

export const useBudgetOverview = () => useQuery({
  queryKey: ['budget', 'overview'],
  queryFn: () => api.get('/budget/overview').then(res => res.data),
});

export const useBudgetByCategory = () => useQuery({
  queryKey: ['budget', 'by-category'],
  queryFn: () => api.get('/budget/expenses/by-category').then(res => res.data),
});

export const useBudgetBySide = () => useQuery({
  queryKey: ['budget', 'by-side'],
  queryFn: () => api.get('/budget/by-side').then(res => res.data),
});

export const useBudgetCategories = () => useQuery({
  queryKey: ['budget', 'categories'],
  queryFn: () => api.get('/budget/categories').then(res => res.data),
});

export const useCategoryTree = () => useQuery({
  queryKey: ['budget', 'categories', 'tree'],
  queryFn: () => api.get('/budget/categories/tree').then(res => res.data),
});

export const useExpensesByCategoryTree = () => useQuery({
  queryKey: ['budget', 'expenses', 'by-category-tree'],
  queryFn: () => api.get('/budget/expenses/by-category-tree').then(res => res.data),
});

export const useExpenses = (filters = {}) => useQuery({
  queryKey: ['budget', 'expenses', filters],
  queryFn: () => api.get('/budget/expenses', { params: filters }).then(res => res.data),
});


export const useVendorBudgetSummary = () => useQuery({
  queryKey: ['budget', 'vendors', 'summary'],
  queryFn: () => api.get('/budget/vendors/summary').then(res => res.data),
});

export const useVendorsBySide = () => useQuery({
  queryKey: ['budget', 'vendors', 'by-side'],
  queryFn: () => api.get('/budget/vendors/by-side').then(res => res.data),
});

export const useSideSummary = () => useQuery({
  queryKey: ['budget', 'side-summary'],
  queryFn: () => api.get('/budget/side-summary').then(res => res.data),
});

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseData) => api.post('/budget/expenses', expenseData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/budget/expenses/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/budget/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
};


export const useCreateCustomCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryData) => api.post('/budget/categories/custom', categoryData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
    },
  });
};

// =====================================================
// TASKS HOOKS
// =====================================================

export const useTasks = (filters = {}) => useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => api.get('/tasks', { params: filters }).then(res => res.data),
});

export const useTaskStats = () => useQuery({
  queryKey: ['tasks', 'stats'],
  queryFn: () => api.get('/tasks/stats').then(res => res.data),
});

export const useOverdueTasks = () => useQuery({
  queryKey: ['tasks', 'overdue'],
  queryFn: () => api.get('/tasks/overdue').then(res => res.data),
});

export const useUpcomingTasks = () => useQuery({
  queryKey: ['tasks', 'upcoming'],
  queryFn: () => api.get('/tasks/upcoming').then(res => res.data),
});

export const useTask = (id) => useQuery({
  queryKey: ['tasks', id],
  queryFn: () => api.get(`/tasks/${id}`).then(res => res.data),
  enabled: !!id,
});

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskData) => api.post('/tasks', taskData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tasks/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}/status`, { status }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
