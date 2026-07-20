// ---------------------------------------------------------------------------
// Common API envelope types used across all endpoints
// ---------------------------------------------------------------------------

/**
 * Standard success envelope returned by API endpoints.
 *
 * @example
 * // 200 OK
 * { success: true, data: { ... } }
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  /** Optional human-readable message (e.g. "Created successfully"). */
  message?: string;
}

/**
 * Paginated list result shape used by every list endpoint that supports
 * page/per_page — matches what vendors.service.ts already returns.
 */
export interface Paginated<T> {
  items: T[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

/**
 * Standard error envelope returned by API endpoints on failure.
 *
 * @example
 * // 400 Bad Request
 * { success: false, error: "Invalid input", code: "VALIDATION_ERROR" }
 */
export interface ErrorResponse {
  success: false;
  error: string;
  /** Machine-readable error code for programmatic handling. */
  code?: string;
  /** Field-level validation errors, keyed by field name. */
  fieldErrors?: Record<string, string>;
}
