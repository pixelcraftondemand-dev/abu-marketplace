-- Distributed rate-limit counters (shared across serverless instances).
-- See prisma/schema.prisma -> RateLimitEntry. Idempotent like the other
-- migrations so it can be re-run against the prod delta workflow.
CREATE TABLE IF NOT EXISTS "rate_limit_entry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_entry_key_key" ON "rate_limit_entry"("key");
CREATE INDEX IF NOT EXISTS "rate_limit_entry_windowStart_idx" ON "rate_limit_entry"("windowStart");
