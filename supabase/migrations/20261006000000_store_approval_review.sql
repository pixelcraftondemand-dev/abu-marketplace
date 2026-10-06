-- Store approval review trail.
--
-- Why: a rejected store application used to be a dead end — the seller was told
-- "contact the admin for more details" with no details recorded anywhere, and
-- /api/store/create refused any further submission. These columns let an admin
-- record *why* a store was rejected, and let the seller fix it and resubmit.
--
-- Additive and idempotent: safe to apply to an existing pilot database.

ALTER TABLE public."Store"
  ADD COLUMN IF NOT EXISTS "rejectionReason" text,
  ADD COLUMN IF NOT EXISTS "reviewedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "reviewedBy" text;

-- The admin queue reads pending + rejected applications, newest first.
CREATE INDEX IF NOT EXISTS "Store_status_createdAt_idx"
  ON public."Store" ("status", "createdAt" DESC);
