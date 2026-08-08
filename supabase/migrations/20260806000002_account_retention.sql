-- Account closure / AML retention migration (production PostgreSQL / Supabase).
--
-- Matches prisma/schema.prisma. For local development the SQLite dev database
-- is synced via `npx prisma db push`.
--
-- When an account is closed it is soft-deleted: deletedAt is set and
-- dataRetentionUntil marks deletedAt + 5 years. Orders, payments, wallet
-- transactions, addresses and ratings are retained for anti-money-laundering
-- record-keeping so records can be produced to law enforcement upon request.
--
-- Idempotent: safe to run on a fresh database (after the baseline) or against
-- an older database.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "dataRetentionUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "user_deletedAt_idx" ON "user"("deletedAt");
