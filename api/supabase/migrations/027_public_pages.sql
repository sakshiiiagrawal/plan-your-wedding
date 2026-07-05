-- Migration 027: Multiple public pages per wedding.
-- Each wedding can publish several independently-templated pages:
-- /{slug} (page_slug = '', the home page, usually kind 'website') and
-- /{slug}/{page_slug} (e.g. 'invite' — the tap-to-open luxury invitation).
-- Couple data (names/date/story/gallery) stays in website_content; a page row
-- holds only design choices (template, palette) and page-scoped config
-- (sections_order, music_url, …).

CREATE TABLE IF NOT EXISTS public_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_slug VARCHAR(60) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'website',
  title VARCHAR(120) NOT NULL,
  template VARCHAR(40) NOT NULL,
  palette VARCHAR(40) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, page_slug)
);

CREATE INDEX IF NOT EXISTS idx_public_pages_user ON public_pages(user_id);

DO $$
BEGIN
  CREATE TRIGGER update_public_pages_updated_at
    BEFORE UPDATE ON public_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: one home 'website' page per existing user, carrying over the
-- design settings previously stored in the hero content blob (template/palette
-- from the new studio; legacy 'theme' ids map 1:1 onto palette ids).
INSERT INTO public_pages (user_id, page_slug, kind, title, template, palette, config)
SELECT
  u.id,
  '',
  'website',
  'Main website',
  COALESCE(wc.content->>'template', 'classic'),
  COALESCE(
    wc.content->>'palette',
    CASE
      WHEN wc.content->>'theme' IN ('royal', 'desert', 'mandala') THEN wc.content->>'theme'
      ELSE 'royal'
    END
  ),
  CASE
    WHEN wc.content ? 'sections_order'
      THEN jsonb_build_object('sections_order', wc.content->'sections_order')
    WHEN wc.content ? 'sections'
      THEN jsonb_build_object('sections', wc.content->'sections')
    ELSE '{}'::jsonb
  END
FROM users u
LEFT JOIN website_content wc ON wc.user_id = u.id AND wc.section_name = 'hero'
ON CONFLICT (user_id, page_slug) DO NOTHING;
