-- 0024_digest_last_send_error.sql
-- Track last email delivery error per digest subscription

ALTER TABLE report_digest_subscription
  ADD COLUMN IF NOT EXISTS last_send_error TEXT;
