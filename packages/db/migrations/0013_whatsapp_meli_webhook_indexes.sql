-- 0013_whatsapp_meli_webhook_indexes.sql — RENA-75
-- Functional indexes for JSONB webhook lookup paths.
-- WhatsApp inbound webhooks resolve the channel by phoneNumberId;
-- MercadoLibre webhooks resolve the connection by mlUserId.
-- Without these, every webhook hit triggers a sequential scan.

-- ---------------------------------------------------------------------------
-- inbox_channel: WhatsApp phoneNumberId lookup
-- ---------------------------------------------------------------------------

CREATE INDEX idx_inbox_channel_whatsapp_phone
  ON inbox_channel ((config->>'phoneNumberId'))
  WHERE type = 'whatsapp' AND status = 'active' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- portal_connection: MercadoLibre mlUserId lookup
-- ---------------------------------------------------------------------------

CREATE INDEX idx_portal_connection_ml_user
  ON portal_connection ((config->>'mlUserId'))
  WHERE portal = 'mercadolibre' AND deleted_at IS NULL;
