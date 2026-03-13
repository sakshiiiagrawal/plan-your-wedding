// Guest-domain enum constants and their derived union types.

export const GUEST_SIDES = ["bride", "groom", "mutual"] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const RSVP_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "tentative",
] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const MEAL_PREFERENCES = [
  "vegetarian",
  "jain",
  "vegan",
  "non_vegetarian",
] as const;
export type MealPreference = (typeof MEAL_PREFERENCES)[number];

export const AGE_GROUPS = ["child", "adult", "senior"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDER_OPTIONS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];
