import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type WebsiteContentRow = TableRow<'website_content'>;
export type WebsiteContentInsert = TableInsert<'website_content'>;

// ---------------------------------------------------------------------------
// Typed content shapes
// ---------------------------------------------------------------------------

/**
 * The `content` JSON blob stored in the `hero` section of `website_content`.
 * Fields map to what the onboarding wizard persists.
 */
export interface HeroContent {
  bride_name: string;
  groom_name: string;
  /** ISO date string (YYYY-MM-DD) or null if not yet set. */
  wedding_date: string | null;
  tagline: string;
}
