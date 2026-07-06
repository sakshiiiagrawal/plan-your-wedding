-- Migration 018: Drop unused users.role column
-- The multi-role model (admin/family/friends) was never built: the app never
-- sets role on insert, the live schema no longer has the column (generated
-- types omit it), and ownership is hard-wired to the logged-in user. On a DB
-- built strictly from migrations, role's NOT NULL constraint made every
-- registration fail. Dropping it re-aligns migrations with the live schema.

ALTER TABLE users DROP COLUMN IF EXISTS role;
