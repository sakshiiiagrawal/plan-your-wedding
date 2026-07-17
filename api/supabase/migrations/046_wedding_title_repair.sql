-- Migration 046: repair backfilled wedding titles.
-- 041's backfill set weddings.title = users.name — the signup account's own
-- name (one half of the couple), which is what collaborators then see in the
-- workspace switcher/hub. Rebuild "Bride & Groom" from the hero section, but
-- only where the title still looks like the backfill artifact (owner's name,
-- the slug, or the default) so deliberately customized titles survive.

UPDATE weddings w
SET title = TRIM(wc.content->>'bride_name') || ' & ' || TRIM(wc.content->>'groom_name')
FROM website_content wc, users u
WHERE wc.user_id = w.id
  AND wc.section_name = 'hero'
  AND u.id = w.owner_id
  AND NULLIF(TRIM(wc.content->>'bride_name'), '') IS NOT NULL
  AND NULLIF(TRIM(wc.content->>'groom_name'), '') IS NOT NULL
  AND w.title IN (u.name, w.slug, 'My wedding');
