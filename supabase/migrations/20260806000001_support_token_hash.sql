-- Security hardening: support-ticket bearer tokens must be stored as SHA-256
-- hashes, never in plaintext (a leaked DB dump cannot be replayed as a live
-- token). Matches prisma/schema.prisma (SupportTicket.accessTokenHash).
--
-- Renames the column added by 20260806000000_payment_hardening.sql. Existing
-- rows already hold raw tokens; they are treated as invalid after this change
-- (safe — tickets are re-issued with a fresh hashed token on next contact).
ALTER TABLE "SupportTicket" RENAME COLUMN "accessToken" TO "accessTokenHash";
