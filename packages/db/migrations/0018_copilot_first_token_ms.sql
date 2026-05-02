-- 0018_copilot_first_token_ms.sql — RENA-108
-- Add first-token latency column to copilot_turn for SLA instrumentation.

ALTER TABLE copilot_turn ADD COLUMN first_token_ms integer;
