-- Payment hardening migration (production PostgreSQL / Supabase).
--
-- Matches prisma/schema.prisma. For local development the SQLite dev database
-- is already in sync via `npx prisma db push`.
--
-- Table names follow Prisma defaults ("Order", "Product", "Coupon") and the
-- explicit @@map() mappings ("payment", "refund", "webhook_event", "user").

-- ── Payment status enum ───────────────────────────────────────────────────────
CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED',
  'REFUNDED', 'PARTIALLY_REFUNDED'
);

-- ── Payment table ─────────────────────────────────────────────────────────────
CREATE TABLE "payment" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerSessionId" TEXT,
  "providerSessionUrl" TEXT,
  "providerPaymentIntentId" TEXT,
  "providerTransactionId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Database-level uniqueness: the final safety net against duplicate charges,
-- duplicate webhook processing, and duplicate refunds.
CREATE UNIQUE INDEX "payment_idempotencyKey_key" ON "payment"("idempotencyKey");
CREATE UNIQUE INDEX "payment_providerSessionId_key" ON "payment"("providerSessionId");
CREATE UNIQUE INDEX "payment_providerPaymentIntentId_key" ON "payment"("providerPaymentIntentId");
CREATE UNIQUE INDEX "payment_providerTransactionId_key" ON "payment"("providerTransactionId");
CREATE INDEX "payment_userId_idx" ON "payment"("userId");
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- ── Refund table ──────────────────────────────────────────────────────────────
CREATE TABLE "refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerRefundId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "refund_providerRefundId_key" ON "refund"("providerRefundId");
CREATE INDEX "refund_paymentId_idx" ON "refund"("paymentId");

-- ── Webhook event dedup ledger ────────────────────────────────────────────────
CREATE TABLE "webhook_event" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_event_providerEventId_key" ON "webhook_event"("providerEventId");
CREATE INDEX "webhook_event_provider_providerEventId_idx" ON "webhook_event"("provider", "providerEventId");

-- ── Order additions ───────────────────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD CONSTRAINT "order_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "order_userId_paymentId_idx" ON "Order"("userId", "paymentId");

-- ── Product inventory (NULL = unlimited) ──────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN "stock" INTEGER;

-- ── Coupon usage limits ───────────────────────────────────────────────────────
ALTER TABLE "Coupon" ADD COLUMN "maxUses" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;

-- ── Wallet ────────────────────────────────────────────────────────────────────
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';

CREATE TABLE "wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wallet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");

CREATE TABLE "wallet_transaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "balanceAfter" DOUBLE PRECISION NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_transaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- DB-level guarantee that a top-up or checkout is never applied twice.
CREATE UNIQUE INDEX "wallet_transaction_referenceType_referenceId_key"
  ON "wallet_transaction"("referenceType", "referenceId");
CREATE INDEX "wallet_transaction_walletId_idx" ON "wallet_transaction"("walletId");
CREATE INDEX "wallet_transaction_userId_idx" ON "wallet_transaction"("userId");

-- ── Email verification: single-use token hash must be unique ─────────────────
-- Token values are SHA-256 hashes of the raw token (never stored in plaintext).
CREATE UNIQUE INDEX "verification_value_key" ON "verification"("value");

-- ── Support tickets: owner bearer access token (IDOR protection) ─────────────
ALTER TABLE "SupportTicket" ADD COLUMN "accessToken" TEXT;
