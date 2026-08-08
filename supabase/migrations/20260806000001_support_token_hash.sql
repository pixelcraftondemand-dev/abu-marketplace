-- Security hardening: support-ticket bearer tokens must be stored as SHA-256
-- hashes, never in plaintext (a leaked DB dump cannot be replayed as a live
-- token). Matches prisma/schema.prisma (SupportTicket.accessTokenHash).
--
-- Renames the column added by 20260806000000_payment_hardening.sql. Existing
-- rows already hold raw tokens; they are treated as invalid after this change
-- (safe — tickets are re-issued with a fresh hashed token on next contact).
--
-- Idempotent: on a fresh database the baseline (20260714133553_new-migration.sql)
-- already creates SupportTicket.accessTokenHash directly, so the rename is
-- skipped when there is no legacy "accessToken" column to migrate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SupportTicket' AND column_name = 'accessToken'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SupportTicket' AND column_name = 'accessTokenHash'
  ) THEN
    ALTER TABLE "SupportTicket" RENAME COLUMN "accessToken" TO "accessTokenHash";
  END IF;
END $$;
