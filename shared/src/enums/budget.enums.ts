// Budget-domain enum constants and their derived union types.

export const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "upi",
  "cheque",
  "credit_card",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Well-known top-level budget category names.
 * These mirror common default categories seeded at setup time.
 */
export const BUDGET_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography & Videography",
  "Decoration",
  "Entertainment",
  "Attire & Beauty",
  "Invitations & Stationery",
  "Transportation",
  "Accommodation",
  "Jewellery",
  "Mehendi & Rituals",
  "Miscellaneous",
] as const;
export type BudgetCategoryName = (typeof BUDGET_CATEGORIES)[number];
