-- Track which RSVP responses came from the public website form, so a guest can
-- correct their own submission without being able to overwrite per-event
-- responses the couple entered in the dashboard.
ALTER TABLE guest_event_rsvp
  ADD COLUMN IF NOT EXISTS responded_via_public boolean NOT NULL DEFAULT false;
