-- Channel-agnostic communications: the whatsapp_* tables become generic
-- messages/conversations/polls with a channel dimension, so future channels
-- (SMS, email, …) share one log, one inbox and one poll model. Postgres
-- re-points FKs and indexes on rename; only names change.

-- 1. Remove zero-vote test polls created before send-failure rollback existed.
DELETE FROM whatsapp_polls
WHERE id NOT IN (SELECT DISTINCT poll_id FROM whatsapp_poll_responses);

-- 2. Renames.
ALTER TABLE whatsapp_conversations RENAME TO conversations;
ALTER TABLE whatsapp_messages RENAME TO messages;
ALTER TABLE whatsapp_polls RENAME TO polls;
ALTER TABLE whatsapp_poll_responses RENAME TO poll_responses;

ALTER TABLE conversations RENAME COLUMN phone TO address;
ALTER TABLE messages RENAME COLUMN phone TO address;
ALTER TABLE messages RENAME COLUMN wa_message_id TO provider_message_id;

-- 3. Channel dimension. poll_responses stays channel-free (derivable via poll).
ALTER TABLE conversations ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE polls ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp';

-- 4. Conversations: one row per (channel, address).
--    last_read_at powers the inbox unread dot (per-wedding, not per-member);
--    last_inbound_at tracks the provider session window (24h for WhatsApp).
ALTER TABLE conversations DROP CONSTRAINT whatsapp_conversations_pkey;
ALTER TABLE conversations ADD PRIMARY KEY (channel, address);
ALTER TABLE conversations ADD COLUMN last_read_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN last_inbound_at TIMESTAMPTZ;

UPDATE conversations c
SET last_inbound_at = m.latest
FROM (
  SELECT address, MAX(created_at) AS latest
  FROM messages
  WHERE direction = 'inbound'
  GROUP BY address
) m
WHERE m.address = c.address;

-- 5. Index hygiene + thread/reachability lookups.
ALTER INDEX idx_wa_conversations_wedding RENAME TO idx_conversations_wedding;
ALTER INDEX idx_wa_messages_wedding RENAME TO idx_messages_wedding;
ALTER INDEX idx_wa_messages_wa_id RENAME TO idx_messages_provider_id;
ALTER INDEX idx_wa_polls_wedding RENAME TO idx_polls_wedding;
CREATE INDEX IF NOT EXISTS idx_messages_guest_created
  ON messages(wedding_id, guest_id, created_at DESC);
