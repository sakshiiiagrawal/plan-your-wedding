export const VENDOR_QUERY_KEYS = {
  all: ['vendors'] as const,
  list: (params?: Record<string, unknown>) => ['vendors', 'list', params ?? {}] as const,
  detail: (id: string) => ['vendors', id] as const,
  categories: ['vendors', 'categories'] as const,
  payments: (vendorId: string) => ['vendors', vendorId, 'payments'] as const,
} as const;

export {
  useVendors,
  useVendorsList,
  useVendor,
  useVendorCategories,
  useVendorPayments,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '../../../hooks/useApi';
