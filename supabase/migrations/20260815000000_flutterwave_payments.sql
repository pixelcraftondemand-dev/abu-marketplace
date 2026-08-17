-- Flutterwave migration: the marketplace moved from Stripe to Flutterwave
-- (Stripe does not support the marketplace's country).
--
-- Additive-only:
--   1. New PaymentMethod enum value (historical STRIPE rows are preserved).
--   2. webhook_event.provider default -> 'flutterwave' (new webhook events).

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'FLUTTERWAVE';

ALTER TABLE "webhook_event" ALTER COLUMN "provider" SET DEFAULT 'flutterwave';
