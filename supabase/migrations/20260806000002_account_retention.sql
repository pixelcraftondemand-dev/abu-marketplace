-- Account closure / AML retention migration (production PostgreSQL / Supabase).
--
-- Matches prisma/schema.prisma. For local development the SQLite dev database
-- is synced via `npx prisma db push`.
--
-- When an account is closed it is soft-deleted: deletedAt is set and
-- dataRetentionUntil marks deletedAt + 5 years. Orders, payments, wallet
-- transactions, addresses and ratings are retained for anti-money-laundering
-- record-keeping so records can be produced to law enforcement upon request.

ALTER TABLE "user" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "dataRetentionUntil" TIMESTAMP(3);

CREATE INDEX "user_deletedAt_idx" ON "user"("deletedAt");
