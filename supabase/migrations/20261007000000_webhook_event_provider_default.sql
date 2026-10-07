-- Align the webhook event provider default with the current Prisma schema.
-- Existing webhook event rows and provider identifiers are preserved.
ALTER TABLE "webhook_event"
  ALTER COLUMN "provider" SET DEFAULT 'amber_pay';
