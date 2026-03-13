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
 * Paginated list envelope for collection endpoints.
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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
