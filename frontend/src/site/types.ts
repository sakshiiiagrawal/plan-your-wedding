import type { ComponentType, LazyExoticComponent } from 'react';
import type { EffectControl } from './effects/schema';

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

/**
 * How a template's photo grid arranges itself. Stored per page in
 * `config.gallery_layout`; templates that render a photo grid read it via
 * the shared `GalleryGrid` effect.
 */
export type GalleryLayoutId = 'mosaic' | 'masonry' | 'filmstrip' | 'polaroid';

export const DEFAULT_GALLERY_LAYOUT: GalleryLayoutId = 'mosaic';

export const GALLERY_LAYOUTS: { id: GalleryLayoutId; name: string; hint: string }[] = [
  { id: 'mosaic', name: 'Mosaic', hint: 'Square tiles with featured photos twice the size' },
  { id: 'masonry', name: 'Masonry', hint: 'Flowing columns that keep each photo’s natural shape' },
  { id: 'filmstrip', name: 'Filmstrip', hint: 'One elegant row that guests swipe through' },
  { id: 'polaroid', name: 'Polaroid', hint: 'Tilted keepsake prints with paper borders' },
];

/** Normalized, template-agnostic input every template renders from. */
export interface SiteData {
  slug: string;
  /** Link to this wedding's home page. Root-relative on a wedding subdomain,
   *  `/{slug}` on path-scoped hosts — never build these by hand. */
  homePath: string;
  /** Link to another page of this wedding, by its page slug ('' = home). */
  pagePath: (pageSlug: string) => string;
  brideName: string;
  groomName: string;
  weddingDate: Date | null;
  tagline: string;
  story: string;
  events: PublicEvent[];
  galleryImages: { url: string }[];
  gallerySubtitle: string;
  /** Per-page photo-grid arrangement (config.gallery_layout); templates with a grid honor it. */
  galleryLayout?: GalleryLayoutId;
  /** Sparse per-page animation picks (config.effects) — resolved against the
   *  template's `effectControls` by the template root. */
  effects?: Record<string, string> | undefined;
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
  /** Opened via ?print=1: skip tap-to-open intros so the whole page prints. */
  print?: boolean;
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
  /** Animation controls this template honors — declaring them is all it takes
   *  for the Studio to render the "Animations & effects" pickers. */
  effectControls?: EffectControl[];
  /** Whether this template renders its gallery through the shared `GalleryGrid`
   *  and so honors the couple's `galleryLayout` pick. Templates with a bespoke,
   *  art-directed gallery leave this off, and the Studio hides the picker for
   *  them rather than showing a control that does nothing. */
  supportsGalleryLayout?: boolean;
  component:
    | ComponentType<TemplateProps>
    | LazyExoticComponent<ComponentType<TemplateProps>>;
}
