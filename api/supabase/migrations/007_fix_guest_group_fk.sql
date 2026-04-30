-- Migration 007: Fix guest_groups.primary_contact_id FK to use ON DELETE SET NULL
-- Without this, deleting a guest who is a group's primary contact returns 400.

BEGIN;

ALTER TABLE guest_groups
  DROP CONSTRAINT IF EXISTS fk_primary_contact;

ALTER TABLE guest_groups
  ADD CONSTRAINT fk_primary_contact
  FOREIGN KEY (primary_contact_id) REFERENCES guests(id) ON DELETE SET NULL;

COMMIT;
