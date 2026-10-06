// ─── AMBER PAY — Card Payment Service ─────────────────────────────────────────
//
// Handles prepaid and debit card top-ups for wallet funding.
// Card details are tokenized — only last 4 digits and card brand are stored.
//
// Architecture:
//   1. User enters card details on web app
//   2. Frontend sends card details to API
//   3. API tokenizes card with card processor (Stripe, etc.)
//   4. Processor returns token + authorization code
//   5. We credit the wallet and store minimal card info

import crypto from "node:crypto";
import { creditWallet } from "./walletService";
import prisma from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  type?: string;
  ip?: string;
}

interface ProcessCardPaymentResult {
  success: boolean;
  paymentId: string;
  amount: number;
  cardLast4: string;
  cardBrand: string;
  authorizationCode: string;
  newBalance: number;
}

interface CardPaymentStatus {
  id: string;
  amount: number;
  cardLast4: string;
  cardBrand: string;
  cardType: string;
  status: string;
  authorizationCode: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  expiresAt: Date;
}

interface SavedCard {
  cardLast4: string;
  cardBrand: string;
  cardType: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Payment link expiry: 10 minutes */
const PAYMENT_TTL_MS = 10 * 60 * 1000;

/** Card type detection from first digit */
const CARD_BRANDS: Record<number, string> = {
  4: "visa",
  5: "mastercard",
  3: "amex",
  6: "discover",
};

// ─── Card Validation ──────────────────────────────────────────────────────────

/**
 * Detect card brand from card number.
 */
export function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 13) return "other";

  const firstDigit = parseInt(cleaned[0], 10);
  return CARD_BRANDS[firstDigit] || "other";
}

/**
 * Validate card number using Luhn algorithm.
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let alternate = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Validate card expiry date.
 */
export function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2,4})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  const fullYear = match[2].length === 2 ? 2000 + year : year;

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiryDate = new Date(fullYear, month + 1, 0); // Last day of month

  return expiryDate > now;
}

/**
 * Validate CVV.
 */
export function validateCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

// ─── Card Payment Processing ──────────────────────────────────────────────────

/**
 * Create a card payment record and initiate processing.
 * In production, this calls the card processor API.
 * For MVP, we simulate the processor and credit the wallet directly.
 */
export async function processCardPayment(
  userId: string,
  cardDetails: CardDetails,
  amount: number
): Promise<ProcessCardPaymentResult> {
  // Validate card details
  if (!validateCardNumber(cardDetails.number)) {
    throw new Error("Invalid card number");
  }
  if (!validateExpiry(cardDetails.expiry)) {
    throw new Error("Invalid or expired card");
  }
  if (!validateCvv(cardDetails.cvv)) {
    throw new Error("Invalid CVV");
  }

  // Detect card brand
  const cardBrand = detectCardBrand(cardDetails.number);
  const last4 = cardDetails.number.replace(/\D/g, "").slice(-4);

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  // ─── Atomic transaction: create card payment + credit wallet + mark completed ─
  // All three writes must succeed or all must roll back — a credited wallet
  // with a stuck "processing" card payment (or vice versa) is inconsistent.
  const result = await prisma.$transaction(async (tx) => {
    // Get user's wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId },
      select: { id: true, status: true, balance: true },
    });

    if (!wallet || wallet.status !== "active") {
      throw new Error("Wallet not active");
    }

    // Create card payment record
    const cardPayment = await tx.cardPayment.create({
      data: {
        userId,
        walletId: wallet.id,
        amount,
        currency: "USD",
        cardLast4: last4,
        cardBrand,
        cardType: cardDetails.type || "debit",
        status: "processing",
        expiresAt: new Date(Date.now() + PAYMENT_TTL_MS),
        metadata: {
          idempotencyKey,
          cardholderName: cardDetails.name,
          ip: cardDetails.ip || null,
        },
      },
    });

    // ─── Process with card processor ───────────────────────────────
    // In production, this calls Stripe/similar:
    //   - POST to processor API with tokenized card
    //   - Processor returns authorization code
    //   - We verify and credit wallet
    //
    // For MVP, simulate successful processing:

    // Simulate processor delay (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate authorization code
    const authorizationCode = `AUTH_${Date.now().toString(36).toUpperCase()}`;
    const providerRef = `CARD_${Date.now().toString(36).toUpperCase()}`;

    // Credit the wallet — pass tx so the wallet credit uses the same transaction
    // (Prisma creates a savepoint for nested $transaction on a transaction client)
    const creditResult = await creditWallet(tx, userId, amount, {
      referenceId: cardPayment.id,
      referenceType: "card_payment",
      description: `Card top-up (${cardBrand} ****${last4})`,
    });

    // Mark payment as completed
    await tx.cardPayment.update({
      where: { id: cardPayment.id },
      data: {
        status: "completed",
        providerRef,
        authorizationCode,
        responseCode: "00",
        responseMessage: "Successful",
        completedAt: new Date(),
      },
    });

    return {
      paymentId: cardPayment.id,
      authorizationCode,
      newBalance: creditResult.balance,
    };
  });

  return {
    success: true,
    paymentId: result.paymentId,
    amount,
    cardLast4: last4,
    cardBrand,
    authorizationCode: result.authorizationCode,
    newBalance: result.newBalance,
  };
}

/**
 * Get card payment status.
 */
export async function getCardPaymentStatus(
  paymentId: string
): Promise<CardPaymentStatus | null> {
  const payment = await prisma.cardPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      cardLast4: true,
      cardBrand: true,
      cardType: true,
      status: true,
      authorizationCode: true,
      completedAt: true,
      failedAt: true,
      failureReason: true,
      expiresAt: true,
    },
  });

  if (!payment) return null;

  // Auto-expire — use conditional updateMany to avoid TOCTOU race between
  // two concurrent status checks (only the first caller transitions the row).
  if (payment.status === "pending" && new Date() > payment.expiresAt) {
    const updated = await prisma.cardPayment.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "expired", failedAt: new Date(), failureReason: "Payment link expired" },
    });
    if (updated.count === 1) {
      payment.status = "expired";
    }
    // If count === 0, another request already transitioned — re-read
    if (updated.count === 0) {
      const fresh = await prisma.cardPayment.findUnique({
        where: { id: paymentId },
        select: { status: true },
      });
      payment.status = fresh?.status ?? payment.status;
    }
  }

  return payment;
}

/**
 * Get user's saved card tokens (last 4 digits + brand).
 * For MVP, we don't store full card numbers — just the last 4 for display.
 */
export async function getSavedCards(userId: string): Promise<SavedCard[]> {
  const cards = await prisma.cardPayment.findMany({
    where: {
      userId,
      status: "completed",
    },
    select: {
      cardLast4: true,
      cardBrand: true,
      cardType: true,
    },
    distinct: ["cardLast4"],
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return cards;
}
