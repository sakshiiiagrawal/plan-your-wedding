-- Migration 029: Section-scoped member access.
-- NULL allowed_sections = full access (every section). A non-null array limits
-- an editor/viewer to those sections only (e.g. a planner who should see
-- vendors + budget but not the guest list). Admins always have full access;
-- the service layer normalises admin rows to NULL.
ALTER TABLE wedding_members ADD COLUMN IF NOT EXISTS allowed_sections TEXT[];
