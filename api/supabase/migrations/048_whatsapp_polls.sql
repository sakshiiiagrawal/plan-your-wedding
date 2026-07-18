-- WhatsApp "polls": interactive list broadcasts with per-recipient row ids.
-- The Cloud API has no native polls; replies are recorded statelessly because
-- each row id encodes poll + guest + option.

CREATE TABLE IF NOT EXISTS whatsapp_polls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  options    JSONB NOT NULL, -- array of option strings, 2..10
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_polls_wedding ON whatsapp_polls(wedding_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_poll_responses (
  poll_id    UUID NOT NULL REFERENCES whatsapp_polls(id) ON DELETE CASCADE,
  guest_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  option_idx INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One vote per guest; re-voting overwrites
  PRIMARY KEY (poll_id, guest_id)
);
