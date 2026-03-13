export const WEBSITE_CONTENT_QUERY_KEYS = {
  all: ['website-content'] as const,
  hero: (slug?: string | null) => ['website-content', 'hero', slug || 'authed'] as const,
  couple: (slug?: string | null) => ['website-content', 'couple', slug || 'authed'] as const,
  story: (slug?: string | null) => ['website-content', 'story', slug || 'authed'] as const,
  gallery: (slug?: string | null) => ['website-content', 'gallery', slug || 'authed'] as const,
  publicEvents: (slug?: string | null) => ['public-events', slug] as const,
} as const;

export {
  useHeroContent,
  useCoupleContent,
  useOurStory,
  useGalleryContent,
  usePublicEvents,
} from '../../../hooks/useApi';

export type { GalleryContent, PublicEvent } from '../../../hooks/useApi';
