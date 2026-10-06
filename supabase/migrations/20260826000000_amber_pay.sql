-- ─── AMBER PAY migration ─────────────────────────────────────────────────────
-- Adds the phone column to user table for USSD lookups.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ussdPinHash" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ussdPinSetAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "user_phone_idx" ON "user"("phone") WHERE "phone" IS NOT NULL;
-- Adds the in-house financial system tables:
--   1. wallet extensions (sllBalance, status, frozenAt, closedAt)
--   2. wallet_transaction extensions (currency, metadata)
--   3. agent (cash-in/cash-out locations)
--   4. agent_transaction (processed cash-in/out records)
--   5. topup_request (user deposit requests)
--   6. withdrawal_request (user cash-out requests)
--   7. p2p_transfer (peer-to-peer money transfers)
--
-- Idempotent: every object uses IF NOT EXISTS so it can safely re-run.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. WALLET EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add SLL balance and status columns to existing wallet table.
ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "sllBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);
ALTER TABLE "wallet" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. WALLET TRANSACTION EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add currency and metadata columns to existing wallet_transaction table.
ALTER TABLE "wallet_transaction" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "wallet_transaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add index on transaction type for faster filtering.
CREATE INDEX IF NOT EXISTS "wallet_transaction_type_idx" ON "wallet_transaction"("type");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AGENT TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "floatBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_userId_key" ON "agent"("userId");

-- Add agent relation to user table (the Agent? field in Prisma).
-- This is a virtual relation in Prisma — no column needed on "user",
-- but we add a comment for documentation.
-- NOTE: Prisma manages this via the Agent model's userId unique constraint.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. AGENT TRANSACTION TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "agent_transaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentRef" TEXT,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_transaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agent_transaction_agentId_fkey"
        FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_transaction_agentRef_key" ON "agent_transaction"("agentRef");
CREATE INDEX IF NOT EXISTS "agent_transaction_agentId_idx" ON "agent_transaction"("agentId");
CREATE INDEX IF NOT EXISTS "agent_transaction_userId_idx" ON "agent_transaction"("userId");
CREATE INDEX IF NOT EXISTS "agent_transaction_status_idx" ON "agent_transaction"("status");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. TOP-UP REQUEST TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "topup_request" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentRef" TEXT,
    "notes" TEXT,
    "matchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "topup_request_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "topup_request_walletId_fkey"
        FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "topup_request_agentId_fkey"
        FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "topup_request_agentRef_key" ON "topup_request"("agentRef");
CREATE INDEX IF NOT EXISTS "topup_request_walletId_idx" ON "topup_request"("walletId");
CREATE INDEX IF NOT EXISTS "topup_request_userId_idx" ON "topup_request"("userId");
CREATE INDEX IF NOT EXISTS "topup_request_agentId_idx" ON "topup_request"("agentId");
CREATE INDEX IF NOT EXISTS "topup_request_status_idx" ON "topup_request"("status");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. WITHDRAWAL REQUEST TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "withdrawal_request" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentRef" TEXT,
    "notes" TEXT,
    "matchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "withdrawal_request_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "withdrawal_request_walletId_fkey"
        FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "withdrawal_request_agentId_fkey"
        FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "withdrawal_request_agentRef_key" ON "withdrawal_request"("agentRef");
CREATE INDEX IF NOT EXISTS "withdrawal_request_walletId_idx" ON "withdrawal_request"("walletId");
CREATE INDEX IF NOT EXISTS "withdrawal_request_userId_idx" ON "withdrawal_request"("userId");
CREATE INDEX IF NOT EXISTS "withdrawal_request_agentId_idx" ON "withdrawal_request"("agentId");
CREATE INDEX IF NOT EXISTS "withdrawal_request_status_idx" ON "withdrawal_request"("status");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. P2P TRANSFER TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "p2p_transfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "senderWalletId" TEXT NOT NULL,
    "receiverWalletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "p2p_transfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "p2p_transfer_senderWalletId_fkey"
        FOREIGN KEY ("senderWalletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "p2p_transfer_receiverWalletId_fkey"
        FOREIGN KEY ("receiverWalletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "p2p_transfer_idempotencyKey_key" ON "p2p_transfer"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "p2p_transfer_senderId_idx" ON "p2p_transfer"("senderId");
CREATE INDEX IF NOT EXISTS "p2p_transfer_receiverId_idx" ON "p2p_transfer"("receiverId");
CREATE INDEX IF NOT EXISTS "p2p_transfer_status_idx" ON "p2p_transfer"("status");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. WEBHOOK EVENT PROVIDER DEFAULT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update the default provider from 'flutterwave' to 'amber_pay' for new rows.
ALTER TABLE "webhook_event" ALTER COLUMN "provider" SET DEFAULT 'amber_pay';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. PAYMENT CODES (Monime-style USSD flow)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "payment_code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mobileRef" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_code_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_code_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_code_code_key" ON "payment_code"("code");
CREATE INDEX IF NOT EXISTS "payment_code_userId_idx" ON "payment_code"("userId");
CREATE INDEX IF NOT EXISTS "payment_code_status_idx" ON "payment_code"("status");

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. CARD PAYMENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "card_payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cardLast4" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerRef" TEXT,
    "authorizationCode" TEXT,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "card_payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "card_payment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "card_payment_walletId_fkey"
        FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "card_payment_providerRef_key" ON "card_payment"("providerRef");
CREATE INDEX IF NOT EXISTS "card_payment_userId_idx" ON "card_payment"("userId");
CREATE INDEX IF NOT EXISTS "card_payment_walletId_idx" ON "card_payment"("walletId");
CREATE INDEX IF NOT EXISTS "card_payment_status_idx" ON "card_payment"("status");
CREATE INDEX IF NOT EXISTS "card_payment_cardLast4_idx" ON "card_payment"("cardLast4");
