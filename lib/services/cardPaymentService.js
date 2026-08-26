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
import { creditWallet, InsufficientFundsError } from "./amberPayService";
import prisma from "@/lib/prisma";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Payment link expiry: 10 minutes */
const PAYMENT_TTL_MS = 10 * 60 * 1000;

/** Card type detection from first digit */
const CARD_BRANDS = {
  4: "visa",
  5: "mastercard",
  3: "amex",
  6: "discover",
};

// ─── Card Validation ──────────────────────────────────────────────────────────

/**
 * Detect card brand from card number.
 * @param {string} cardNumber - 13-19 digit card number
 * @returns {string} Card brand (visa, mastercard, amex, discover, other)
 */
export function detectCardBrand(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 13) return "other";

  const firstDigit = parseInt(cleaned[0], 10);
  return CARD_BRANDS[firstDigit] || "other";
}

/**
 * Validate card number using Luhn algorithm.
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} Whether card number is valid
 */
export function validateCardNumber(cardNumber) {
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
 * @param {string} expiry - MM/YY or MM/YYYY format
 * @returns {boolean} Whether expiry is valid and not in the past
 */
export function validateExpiry(expiry) {
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
 * @param {string} cvv - 3-4 digit CVV
 * @returns {boolean} Whether CVV is valid
 */
export function validateCvv(cvv) {
  return /^\d{3,4}$/.test(cvv);
}

// ─── Card Payment Processing ──────────────────────────────────────────────────

/**
 * Create a card payment record and initiate processing.
 * In production, this calls the card processor API.
 * For MVP, we simulate the processor and credit the wallet directly.
 *
 * @param {string} userId - User ID
 * @param {Object} cardDetails - Card details
 * @param {string} cardDetails.number - Card number
 * @param {string} cardDetails.expiry - MM/YY format
 * @param {string} cardDetails.cvv - 3-4 digit CVV
 * @param {string} cardDetails.name - Cardholder name
 * @param {string} cardDetails.type - prepaid | debit | credit
 * @param {number} amount - Amount in USD
 * @returns {Object} Payment result
 */
export async function processCardPayment(userId, cardDetails, amount) {
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

  // Get user's wallet
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (!wallet || wallet.status !== "active") {
    throw new Error("Wallet not active");
  }

  // Detect card brand
  const cardBrand = detectCardBrand(cardDetails.number);
  const last4 = cardDetails.number.replace(/\D/g, "").slice(-4);

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  // Create card payment record
  const cardPayment = await prisma.cardPayment.create({
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

  try {
    // Simulate processor delay (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate authorization code
    const authorizationCode = `AUTH_${Date.now().toString(36).toUpperCase()}`;
    const providerRef = `CARD_${Date.now().toString(36).toUpperCase()}`;

    // Credit the wallet
    const result = await creditWallet(prisma, userId, amount, {
      referenceId: cardPayment.id,
      referenceType: "card_payment",
      description: `Card top-up (${cardBrand} ****${last4})`,
    });

    // Mark payment as completed
    await prisma.cardPayment.update({
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
      success: true,
      paymentId: cardPayment.id,
      amount,
      cardLast4: last4,
      cardBrand,
      authorizationCode,
      newBalance: result.balance,
    };
  } catch (error) {
    // Mark payment as failed
    await prisma.cardPayment.update({
      where: { id: cardPayment.id },
      data: {
        status: "failed",
        failedAt: new Date(),
        failureReason: error.message,
      },
    });

    throw error;
  }
}

/**
 * Get card payment status.
 * @param {string} paymentId - Card payment ID
 * @returns {Object|null} Payment status
 */
export async function getCardPaymentStatus(paymentId) {
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
    },
  });

  if (!payment) return null;

  // Auto-expire
  if (payment.status === "pending" && new Date() > payment.expiresAt) {
    await prisma.cardPayment.update({
      where: { id: paymentId },
      data: { status: "expired" },
    });
    payment.status = "expired";
  }

  return payment;
}

/**
 * Get user's saved card tokens (last 4 digits + brand).
 * For MVP, we don't store full card numbers — just the last 4 for display.
 *
 * @param {string} userId - User ID
 * @returns {Array} List of saved card tokens
 */
export async function getSavedCards(userId) {
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
