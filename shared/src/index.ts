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
  DbPaymentMethod,
  DbTaskPriority,
  DbTaskStatus,
  DbRoomType,
  DbVendorCategory,
} from './supabase.generated';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type { UserRow, UserInsert, AuthenticatedUser } from './domain/user.types';

export type {
  GuestRow,
  GuestInsert,
  GuestGroupRow,
  GuestGroupInsert,
  GuestEventRsvpRow,
  GuestEventRsvpInsert,
  GuestWithDetails,
} from './domain/guest.types';

export type {
  VenueRow,
  VenueInsert,
  VenueWithFinance,
  RoomRow,
  RoomInsert,
  RoomAllocationRow,
  RoomAllocationInsert,
  RoomWithAllocations,
} from './domain/venue.types';

export type { EventRow, EventInsert, EventWithVenue } from './domain/event.types';

export type { VendorRow, VendorInsert, VendorWithFinance } from './domain/vendor.types';

export type {
  ExpenseCategoryRow,
  ExpenseCategoryInsert,
  ExpenseRow,
  ExpenseInsert,
  ExpenseItemRow,
  ExpenseItemInput,
  PaymentRow,
  PaymentInsert,
  PaymentAllocationRow,
  PaymentAllocationInput,
  FinanceActivityRow,
  ExpenseBalanceSummary,
  ExpenseSummaryRow,
  ExpenseSummaryInsert,
  ExpenseWithDetails,
  FinanceSourceType,
  FinanceHeaderStatus,
  FinanceItemSide,
  FinancePaymentDirection,
  FinancePaymentStatus,
  FinancePaidBySide,
  FinanceActivityEntityType,
  FinanceActivityActionType,
} from './domain/expense.types';

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

export {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  FINANCE_SOURCE_TYPES,
  FINANCE_HEADER_STATUSES,
  FINANCE_ITEM_SIDES,
  FINANCE_PAYMENT_DIRECTIONS,
  FINANCE_PAYMENT_STATUSES,
  FINANCE_PAID_BY_SIDES,
  EXPENSE_CATEGORIES,
  DEFAULT_CATEGORY_TREE,
} from './enums/expense.enums';
export type {
  PaymentStatus,
  PaymentMethod,
  FinanceSourceType as EnumFinanceSourceType,
  FinanceHeaderStatus as EnumFinanceHeaderStatus,
  FinanceItemSide as EnumFinanceItemSide,
  FinancePaymentDirection as EnumFinancePaymentDirection,
  FinancePaymentStatus as EnumFinancePaymentStatus,
  FinancePaidBySide as EnumFinancePaidBySide,
  ExpenseCategoryName,
} from './enums/expense.enums';

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
