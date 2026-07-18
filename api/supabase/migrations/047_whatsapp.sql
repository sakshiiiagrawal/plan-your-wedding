-- WhatsApp RSVP integration: outbound/inbound message log + per-phone
-- conversation state for the RSVP flow (accept → party size → meal pref).

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  -- Normalized digits-only E.164 (e.g. 919876543210). One active flow per phone.
  phone       TEXT PRIMARY KEY,
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id    UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  flow        TEXT NOT NULL DEFAULT 'rsvp',
  -- invited | awaiting_party | awaiting_meal | done | declined
  step        TEXT NOT NULL DEFAULT 'invited',
  context     JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_wedding ON whatsapp_conversations(wedding_id);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id    UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id      UUID REFERENCES guests(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  direction     TEXT NOT NULL, -- outbound | inbound
  wa_message_id TEXT,
  template_name TEXT,
  body          TEXT,
  -- outbound: sent | delivered | read | failed; inbound: received
  status        TEXT NOT NULL DEFAULT 'sent',
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_wedding ON whatsapp_messages(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON whatsapp_messages(wa_message_id);
