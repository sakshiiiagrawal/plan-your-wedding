import type { ComponentType, LazyExoticComponent } from 'react';

/** Every togglable/reorderable building block any template can declare. */
export type PartId =
  | 'hero'
  | 'story'
  | 'events'
  | 'rsvp'
  | 'gallery'
  | 'envelope'
  | 'countdown'
  | 'final';

/** Kept as an alias — the original name before invite parts joined the model. */
export type SectionId = PartId;

export interface SectionSetting {
  id: PartId;
  enabled: boolean;
}

export interface TemplatePart {
  id: PartId;
  label: string;
  /**
   * Overlay parts (e.g. the invite envelope) render outside the page flow:
   * they can be toggled but have no position, so the Studio hides reorder
   * arrows for them.
   */
  overlay?: boolean;
  /**
   * Positionless parts are woven into other sections by the template (e.g.
   * Journey threads gallery photos through its timeline) — togglable, but
   * reordering them has no effect, so the Studio hides their arrows.
   */
  positionless?: boolean;
}

/**
 * Color tokens every template must honor. Palettes live in a shared catalog
 * (`palettes.ts`) fully decoupled from templates — any palette works with any
 * template. Templates expose the active palette as `--site-*` CSS variables
 * at their root so shared blocks (RsvpForm, effects) inherit it.
 */
export interface Palette {
  id: string;
  name: string;
  tone: 'light' | 'dark';
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  primary: string;
  accent: string;
  onAccent: string;
  heroGradient: string;
  onHero: string;
  onHeroSoft: string;
}

/** Mirrors PublicEventPayload served by GET /public/:slug/events. */
export interface PublicEventVenue {
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PublicEvent {
  id: string;
  name: string;
  event_type: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  dress_code: string | null;
  color: string | null;
  venue: PublicEventVenue | null;
}

/** What a wedding publishes: several pages, each independently templated. */
export type PageKind = 'website' | 'invite';

export interface PublicPageLink {
  pageSlug: string;
  kind: PageKind;
  title: string;
}

/** Persisted in a page's `config.qr_enabled` / `config.qr_style`; `url` is
 *  computed by the caller (Studio preview or public renderer) from the
 *  page's own slug — never stored, so it can't go stale if the slug changes. */
export interface QrCodeSetting {
  enabled: boolean;
  style: string;
  url: string;
}

/** Normalized, template-agnostic input every template renders from. */
export interface SiteData {
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: Date | null;
  tagline: string;
  story: string;
  events: PublicEvent[];
  galleryImages: { url: string }[];
  gallerySubtitle: string;
  /** Ordered, validated against the active template's `parts`. */
  sections: SectionSetting[];
  palette: Palette;
  /** The wedding's other published pages, for cross-linking. */
  pages: PublicPageLink[];
  musicUrl?: string | null;
  musicStartTime?: number;
  musicEndTime?: number;
  qrCode?: QrCodeSetting | undefined;
  authed: boolean;
  /** True inside the Site Studio preview canvas (disables live form submission). */
  preview?: boolean;
  /** Preview-only: notifies the Studio canvas once a tap-to-open intro has been dismissed, so it can stop suppressing scroll. */
  onIntroOpen?: () => void;
}

export interface TemplateProps {
  data: SiteData;
}

export interface TemplateDefinition {
  id: string;
  /** The purpose this layout is built for; the Studio filters pickers by it. */
  kind: PageKind;
  name: string;
  tagline: string;
  /** Reserved for the paid tier — locked in the picker once billing exists. */
  premium?: boolean;
  /** The template's composition, each part togglable (and orderable unless overlay). */
  parts: TemplatePart[];
  defaultPaletteId: string;
  /** Curation only — shown first in the palette picker; all palettes remain usable. */
  recommendedPaletteIds: string[];
  component:
    | ComponentType<TemplateProps>
    | LazyExoticComponent<ComponentType<TemplateProps>>;
}
