// ---------------------------------------------------------------------------
// @wedding-planner/shared — public surface
// ---------------------------------------------------------------------------

// Supabase generated types (Database interface + helpers)
export type {
  Json,
  Database,
  TableRow,
  TableInsert,
  TableUpdate,
  DbGuestSide,
  DbRsvpStatus,
  DbMealPreference,
  DbAgeGroup,
  DbGender,
  DbPaymentStatus,
  DbPaymentMethod,
  DbTaskPriority,
  DbTaskStatus,
  DbRoomType,
  DbVendorCategory,
} from './supabase.generated';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type { UserRow, UserInsert, AuthenticatedUser, UserRole } from './domain/user.types';
export { USER_ROLES } from './domain/user.types';

export type {
  GuestRow,
  GuestInsert,
  GuestGroupRow,
  GuestGroupInsert,
  GuestEventRsvpRow,
  GuestEventRsvpInsert,
  GuestWithDetails,
} from './domain/guest.types';

export type { VenueRow, VenueInsert } from './domain/venue.types';

export type { EventRow, EventInsert, EventWithVenue } from './domain/event.types';

export type { VendorRow, VendorInsert } from './domain/vendor.types';

export type {
  BudgetCategoryRow,
  BudgetCategoryInsert,
  ExpenseRow,
  ExpenseInsert,
  PaymentRow,
  PaymentInsert,
  BudgetSummaryRow,
  BudgetSummaryInsert,
  ExpenseWithDetails,
} from './domain/budget.types';

export type {
  AccommodationRow,
  AccommodationInsert,
  RoomRow,
  RoomInsert,
  RoomAllocationRow,
  RoomAllocationInsert,
  RoomWithAllocations,
} from './domain/accommodation.types';

export type { TaskRow, TaskInsert } from './domain/task.types';

export type {
  WebsiteContentRow,
  WebsiteContentInsert,
  HeroContent,
} from './domain/website-content.types';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export {
  GUEST_SIDES,
  RSVP_STATUSES,
  MEAL_PREFERENCES,
  AGE_GROUPS,
  GENDER_OPTIONS,
} from './enums/guest.enums';
export type { GuestSide, RsvpStatus, MealPreference, AgeGroup, Gender } from './enums/guest.enums';

export { PAYMENT_STATUSES, PAYMENT_METHODS, BUDGET_CATEGORIES } from './enums/budget.enums';
export type { PaymentStatus, PaymentMethod, BudgetCategoryName } from './enums/budget.enums';

export { VENDOR_CATEGORIES } from './enums/vendor.enums';
export type { VendorCategory } from './enums/vendor.enums';

export { TASK_PRIORITIES, TASK_STATUSES, ROOM_TYPES } from './enums/task.enums';
export type { TaskPriority, TaskStatus, RoomType } from './enums/task.enums';

// ---------------------------------------------------------------------------
// API DTOs
// ---------------------------------------------------------------------------

export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthUser,
} from './api/auth.dto';

export type { ApiResponse, PaginatedResponse, ErrorResponse } from './api/common.dto';
