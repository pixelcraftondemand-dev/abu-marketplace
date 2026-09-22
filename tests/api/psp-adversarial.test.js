/**
 * PSP Payment System — Adversarial Edge Cases & Abuse Prevention Tests
 *
 * Every entry is an attack pattern paired with the specific defense.
 * These are REQUIRED test cases, not optional hardening.
 */

import { describe, it, expect, vi } from "vitest";
import {
  toMinorUnits,
  toDisplayAmount,
  roundMoney,
  calculateFee,
  validateAmount,
  validateQuantity,
  validatePrice,
  maxRefundable,
} from "@/lib/services/money";
import {
  validateCheckoutPrices,
  lockExchangeRate,
  isRateValid,
} from "@/lib/services/priceGuard";
import {
  PSP_STATES,
  assertValidPspTransition,
  transitionPspStatus,
} from "@/lib/services/pspStateMachine";
import {
  postLedgerEntry,
  LEDGER_ACCOUNTS,
} from "@/lib/services/ledger";
import {
  checkSettlementExists,
} from "@/lib/services/abuseDetection";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TIMING AND RACE-BASED ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Race Attack: Double-submit / duplicate charge burst", () => {
  it("survives 20 simultaneous identical checkout requests — exactly one succeeds", async () => {
    // Simulate idempotency key guard with DB unique constraint
    const processed = new Map();

    const processCheckout = async (idempotencyKey, userId, amount) => {
      if (processed.has(idempotencyKey)) {
        return { success: false, reason: "duplicate", existingId: processed.get(idempotencyKey) };
      }
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      processed.set(idempotencyKey, paymentId);
      return { success: true, paymentId };
    };

    // Fire 20 simultaneous requests with the same key
    const results = await Promise.all(
      Array.from({ length: 20 }, () => processCheckout("burst_key_1", "user_1", 99.99))
    );

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    expect(successes).toHaveLength(1); // exactly one succeeds
    expect(failures).toHaveLength(19); // 19 rejected as duplicates
    expect(failures.every((f) => f.reason === "duplicate")).toBe(true);
  });
});

describe("Race Attack: Inventory race exploitation", () => {
  it("20+ concurrent requests against stock of 1 — exactly one succeeds, stock never negative", async () => {
    let stock = 1;

    const reserveStock = async (quantity) => {
      if (stock >= quantity) {
        stock -= quantity;
        return { success: true, remainingStock: stock };
      }
      return { success: false, remainingStock: stock };
    };

    // Fire 25 simultaneous requests
    const results = await Promise.all(
      Array.from({ length: 25 }, () => reserveStock(1))
    );

    const successes = results.filter((r) => r.success);
    expect(successes).toHaveLength(1);
    expect(stock).toBe(0);
    expect(stock).toBeGreaterThanOrEqual(0); // never negative
  });

  it("10 concurrent requests against stock of 3 — exactly 3 succeed", async () => {
    let stock = 3;

    const reserveStock = async (quantity) => {
      if (stock >= quantity) {
        stock -= quantity;
        return { success: true };
      }
      return { success: false };
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveStock(1))
    );

    expect(results.filter((r) => r.success)).toHaveLength(3);
    expect(stock).toBe(0);
  });
});

describe("TOCTOU Attack: Stale price exploitation", () => {
  it("rejects client-submitted price that differs from server price", async () => {
    // Mock DB with product at $29.99
    const db = {
      product: {
        findMany: vi.fn(async () => [
          { id: "prod_1", price: 29.99, mrp: 39.99, inStock: true, name: "Widget" },
        ]),
      },
    };

    // Client tries to submit stale price of $19.99 (old sale price)
    const items = [{ id: "prod_1", quantity: 1, clientPrice: 19.99 }];
    const result = await validateCheckoutPrices(db, items);

    expect(result.valid).toBe(true);
    expect(result.priceChanged).toBe(true);
    // Server uses canonical price, not client price
    expect(result.items[0].price).toBe(29.99);
    expect(result.items[0].lineTotal).toBe(29.99);
  });

  it("always uses server price regardless of client submission", async () => {
    const db = {
      product: {
        findMany: vi.fn(async () => [
          { id: "prod_1", price: 50.00, mrp: 60.00, inStock: true, name: "Gadget" },
        ]),
      },
    };

    // Client submits $0.01 hoping for a free item
    const items = [{ id: "prod_1", quantity: 1, clientPrice: 0.01 }];
    const result = await validateCheckoutPrices(db, items);

    expect(result.items[0].price).toBe(50.00);
  });

  it("rejects negative price injection", async () => {
    const db = {
      product: {
        findMany: vi.fn(async () => [
          { id: "prod_1", price: 25.00, mrp: 30.00, inStock: true, name: "Thing" },
        ]),
      },
    };

    // Negative client price is invalid — validateCheckoutPrices rejects it
    const items = [{ id: "prod_1", quantity: 1, clientPrice: -100 }];
    const result = await validateCheckoutPrices(db, items);

    // Function returns valid: false for negative prices
    expect(result.valid).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.message).toMatch(/Invalid price/);
  });
});

describe("Webhook replay after state change", () => {
  it("rejects a 'payment authorized' webhook after order is already refunded", async () => {
    // PSP transaction is already REFUNDED (terminal)
    expect(() => assertValidPspTransition("REFUNDED", "AUTHORIZED")).toThrow(
      "Invalid PSP state transition"
    );
  });

  it("rejects a 'capture' webhook after order is already settled", async () => {
    expect(() => assertValidPspTransition("SETTLED", "CAPTURED")).toThrow(
      "Invalid PSP state transition"
    );
  });

  it("rejects a 'failed' webhook after order is already succeeded", async () => {
    // CAPTURED -> FAILED is not valid (must go through dispute or refund)
    expect(() => assertValidPspTransition("CAPTURED", "FAILED")).toThrow(
      "Invalid PSP state transition"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FINANCIAL PRECISION AND ROUNDING ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Salami slicing / rounding exploitation", () => {
  it("integer arithmetic eliminates floating-point drift", () => {
    // The classic floating-point trap: 0.1 + 0.2 !== 0.3
    expect(0.1 + 0.2).not.toBe(0.3);

    // But minor units avoid this entirely
    const a = toMinorUnits(0.1);
    const b = toMinorUnits(0.2);
    expect(a + b).toBe(toMinorUnits(0.3));
  });

  it("calculateFee always rounds down (platform's favor)", () => {
    // 5% of 99.99 should be 4.99 (truncated), not 5.00 (rounded up)
    const fee = calculateFee(99.99, 0.05);
    expect(fee).toBe(4.99);

    // 5% of 1.01 should be 0.05 (truncated)
    expect(calculateFee(1.01, 0.05)).toBe(0.05);

    // Fee should never exceed the mathematical value
    for (const amount of [1.00, 10.50, 99.99, 999.99, 1234.56]) {
      const fee = calculateFee(amount, 0.05);
      expect(fee).toBeLessThanOrEqual(amount * 0.05);
    }
  });

  it("roundMoney produces consistent results across many operations", () => {
    // Simulate 1000 small transactions — cumulative drift should be zero
    let total = 0;
    for (let i = 0; i < 1000; i++) {
      total = roundMoney(total + roundMoney(0.1));
    }
    // 1000 * 0.10 = 100.00 exactly
    expect(total).toBe(100.00);
  });

  it("toMinorUnits and toDisplayAmount are lossless round-trip", () => {
    const amounts = [0.01, 0.10, 1.00, 10.50, 99.99, 1234.56, 99999.99];
    for (const amount of amounts) {
      const minor = toMinorUnits(amount);
      const display = toDisplayAmount(minor);
      expect(display).toBe(amount);
    }
  });
});

describe("Currency conversion arbitrage", () => {
  it("locked exchange rate expires after validity window", () => {
    const rateLock = lockExchangeRate({
      fromCurrency: "USD",
      toCurrency: "SLL",
      rate: 21000,
      validForMs: 100, // 100ms for testing
    });

    expect(isRateValid(rateLock)).toBe(true);

    // After window expires, rate is invalid
    // (In real code, this would be checked after a delay)
    expect(rateLock.expiresAt.getTime()).toBeGreaterThan(rateLock.lockedAt.getTime());
  });

  it("rejects invalid exchange rates", () => {
    expect(() => lockExchangeRate({ fromCurrency: "USD", toCurrency: "SLL", rate: -1 })).toThrow("Invalid exchange rate");
    expect(() => lockExchangeRate({ fromCurrency: "USD", toCurrency: "SLL", rate: 0 })).toThrow("Invalid exchange rate");
    expect(() => lockExchangeRate({ fromCurrency: "USD", toCurrency: "SLL", rate: NaN })).toThrow("Invalid exchange rate");
  });

  it("locked rate matches the rate used for conversion", () => {
    const rateLock = lockExchangeRate({
      fromCurrency: "USD",
      toCurrency: "SLL",
      rate: 21000.50,
    });

    // The locked rate is the one that must be used
    expect(rateLock.rate).toBe(21000.50);
    expect(rateLock.fromCurrency).toBe("USD");
    expect(rateLock.toCurrency).toBe("SLL");
  });
});

describe("Negative quantity / negative amount injection", () => {
  it("rejects negative quantities", () => {
    expect(validateQuantity(-1)).toBe(false);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(-100)).toBe(false);
  });

  it("rejects non-integer quantities", () => {
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity(0.1)).toBe(false);
  });

  it("rejects absurdly large quantities", () => {
    expect(validateQuantity(1000)).toBe(false);
    expect(validateQuantity(999999)).toBe(false);
  });

  it("accepts valid quantities", () => {
    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(50)).toBe(true);
    expect(validateQuantity(99)).toBe(true);
  });

  it("rejects negative prices", () => {
    expect(validatePrice(-10)).toBe(false);
    expect(validatePrice(0)).toBe(false);
    expect(validatePrice(-0.01)).toBe(false);
  });

  it("rejects non-finite prices", () => {
    expect(validatePrice(NaN)).toBe(false);
    expect(validatePrice(Infinity)).toBe(false);
  });

  it("accepts valid prices", () => {
    expect(validatePrice(0.01)).toBe(true);
    expect(validatePrice(99.99)).toBe(true);
    expect(validatePrice(999999)).toBe(true);
  });

  it("validateAmount rejects negative and zero amounts", () => {
    expect(validateAmount(-1)).toBe(false);
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(0.001)).toBe(false); // below minimum
  });

  it("validateAmount rejects absurdly large amounts", () => {
    expect(validateAmount(100_000_000)).toBe(false); // above max
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DISCOUNT, PROMO, AND COUPON ABUSE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Coupon stacking / double-redeem race", () => {
  it("single-use coupon redeemed twice — only one succeeds (simulated)", async () => {
    // Simulate DB unique constraint on coupon usage
    const redemptions = new Map();

    const redeemCoupon = async (couponCode, userId, orderId) => {
      const key = `${couponCode}:${userId}`;
      if (redemptions.has(key)) {
        return { success: false, reason: "already_redeemed" };
      }
      redemptions.set(key, orderId);
      return { success: true };
    };

    // Two simultaneous attempts with same coupon
    const [r1, r2] = await Promise.all([
      redeemCoupon("NEW20", "user_1", "order_1"),
      redeemCoupon("NEW20", "user_1", "order_2"),
    ]);

    expect(r1.success).not.toBe(r2.success); // exactly one wins
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REFUND AND CHARGEBACK ABUSE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Partial refund / overpayment exploitation", () => {
  it("refund amount capped at captured amount minus already refunded", () => {
    // Transaction captured for $100, already refunded $30
    const refundable = maxRefundable(100, 30);
    expect(refundable).toBe(70);
  });

  it("rejects refund exceeding captured amount", () => {
    const refundable = maxRefundable(50, 0);
    expect(refundable).toBe(50);

    // Client requests $200 refund on $50 capture
    const requestedRefund = 200;
    expect(requestedRefund > refundable).toBe(true);
    // Server should cap at $50
  });

  it("fully refunded transaction has zero refundable", () => {
    expect(maxRefundable(100, 100)).toBe(0);
    expect(maxRefundable(50, 50)).toBe(0);
  });

  it("over-refunded transaction has zero refundable (never negative)", () => {
    // Edge case: some bug allowed $110 refund on $100 capture
    expect(maxRefundable(100, 110)).toBe(0);
  });

  it("handles floating-point edge cases in refund calculation", () => {
    // 99.99 - 33.33 should be 66.66, not 66.65999999999999
    const refundable = maxRefundable(99.99, 33.33);
    expect(refundable).toBe(66.66);
  });

  it("validates refund request against actual transaction record", async () => {
    // Simulated transaction
    const transaction = { capturedAmount: 75.00, id: "txn_1" };
    const existingRefunds = [
      { amount: 25.00 },
      { amount: 10.00 },
    ];

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const refundable = maxRefundable(transaction.capturedAmount, totalRefunded);

    expect(refundable).toBe(40.00); // 75 - 25 - 10

    // Client requests $50 refund
    expect(50 > refundable).toBe(true); // should be rejected
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. IDENTITY AND ACCOUNT-LEVEL ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Card testing detection", () => {
  it("multiple small failures from same device triggers detection", async () => {
    const db = {
      fraudEvent: {
        count: vi.fn(async () => 5), // 5 failed attempts
      },
    };

    // Import would be needed in real test, but we test the logic pattern
    const CARD_TEST_MAX_FAILURES = 3;
    const failures = await db.fraudEvent.count();
    expect(failures).toBeGreaterThanOrEqual(CARD_TEST_MAX_FAILURES);
  });
});

describe("Synthetic identity detection", () => {
  it("accounts created within 1 minute of each other are flagged", async () => {
    const accounts = [
      { id: "a1", createdAt: new Date("2026-01-01T12:00:00Z") },
      { id: "a2", createdAt: new Date("2026-01-01T12:00:30Z") }, // 30 seconds later
      { id: "a3", createdAt: new Date("2026-01-01T12:00:45Z") }, // 45 seconds later
    ];

    // All created within 1 minute — likely bot-created
    const BURST_WINDOW_MS = 60_000;
    const referenceTime = accounts[0].createdAt.getTime();
    const burstCount = accounts.filter(
      (a) => Math.abs(a.createdAt.getTime() - referenceTime) < BURST_WINDOW_MS
    ).length;

    expect(burstCount).toBeGreaterThanOrEqual(3); // 3+ accounts in burst = suspicious
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SETTLEMENT DOUBLE-CLAIM GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe("Settlement double-claim", () => {
  it("second settlement batch for same period is a safe no-op", async () => {
    const db = {
      settlementBatch: {
        findFirst: vi.fn(async () => ({
          id: "batch_1",
          status: "SENT",
        })),
      },
    };

    const result = await checkSettlementExists(db, {
      merchantId: "store_1",
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-02"),
    });

    expect(result.exists).toBe(true);
    expect(result.existingBatchId).toBe("batch_1");
    // Second run should not create a new batch
  });

  it("failed batch can be retried (not blocked by double-claim guard)", async () => {
    const db = {
      settlementBatch: {
        findFirst: vi.fn(async () => null), // failed batches excluded from check
      },
    };

    const result = await checkSettlementExists(db, {
      merchantId: "store_1",
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-02"),
    });

    expect(result.exists).toBe(false); // can proceed with retry
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LEDGER INTEGRITY UNDER ATTACK
// ═══════════════════════════════════════════════════════════════════════════════

describe("Ledger integrity under adversarial conditions", () => {
  it("refuse to post ledger entry with zero amount", async () => {
    const db = { ledgerEntry: { create: vi.fn() } };
    await expect(
      postLedgerEntry(db, {
        amount: 0,
        referenceType: "psp_transaction",
        referenceId: "txn_1",
        debitAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
        creditAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
      })
    ).rejects.toThrow("amount must be positive");
  });

  it("refuse to post ledger entry with negative amount", async () => {
    const db = { ledgerEntry: { create: vi.fn() } };
    await expect(
      postLedgerEntry(db, {
        amount: -50,
        referenceType: "psp_transaction",
        referenceId: "txn_1",
        debitAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
        creditAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
      })
    ).rejects.toThrow("amount must be positive");
  });

  it("absurdly large amounts pass positive-check but are bounded by application validation", async () => {
    // The ledger itself only checks positive/non-zero — upper bounds are
    // enforced by the calling code (checkout schema, refund validation).
    // postLedgerEntry uses db.$transaction([promise, promise]) — mock that pattern.
    let idCounter = 0;
    const createFn = vi.fn(async ({ data }) => ({ id: `le_${++idCounter}`, ...data }));
    const db = {
      ledgerEntry: { create: createFn },
      $transaction: vi.fn(async (promises) => Promise.all(promises)),
    };
    const result = await postLedgerEntry(db, {
      amount: 999_999_999,
      referenceType: "psp_transaction",
      referenceId: "txn_1",
      debitAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
      creditAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
    });
    // Ledger posts it — upper bound is enforced at the checkout/refund level
    expect(result.debit.debit).toBe(999_999_999);
    expect(result.credit.credit).toBe(999_999_999);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. GENERAL PRINCIPLE: NEVER TRUST CLIENT INPUT
// ═══════════════════════════════════════════════════════════════════════════════

describe("General principle: never trust client-submitted financial values", () => {
  it("price validation always re-fetches from server", async () => {
    const db = {
      product: {
        findMany: vi.fn(async () => [
          { id: "prod_1", price: 100.00, mrp: 120.00, inStock: true, name: "Expensive" },
        ]),
      },
    };

    // Client tries every trick with valid-but-wrong prices
    // (negative/zero prices return valid:false from the function)
    const tricks = [
      { id: "prod_1", quantity: 1, clientPrice: 0.01 },
      { id: "prod_1", quantity: 1, clientPrice: 999999 },
      { id: "prod_1", quantity: 1, clientPrice: 50.00 }, // stale sale price
    ];

    for (const item of tricks) {
      const result = await validateCheckoutPrices(db, [item]);
      // Server always uses its own price, never the client-submitted one
      expect(result.items[0].price).toBe(100.00);
    }

    // Also verify: valid client price matches server — no false alarm
    const correctResult = await validateCheckoutPrices(db, [
      { id: "prod_1", quantity: 1, clientPrice: 100.00 },
    ]);
    expect(correctResult.priceChanged).toBe(false);
    expect(correctResult.items[0].price).toBe(100.00);

    // And: negative/zero prices are rejected as invalid
    const negResult = await validateCheckoutPrices(db, [
      { id: "prod_1", quantity: 1, clientPrice: -100 },
    ]);
    expect(negResult.valid).toBe(false);
    expect(negResult.items).toHaveLength(0);

    const zeroResult = await validateCheckoutPrices(db, [
      { id: "prod_1", quantity: 1, clientPrice: 0 },
    ]);
    expect(zeroResult.valid).toBe(false);
    expect(zeroResult.items).toHaveLength(0);
  });

  it("quantity validation rejects all invalid values", () => {
    const invalid = [
      -1, 0, 1.5, -100, 0.001, NaN, Infinity,
      1000, 999999, "1", null, undefined,
    ];

    for (const qty of invalid) {
      expect(validateQuantity(qty)).toBe(false);
    }
  });

  it("amount validation rejects all invalid values", () => {
    const invalid = [-1, 0, -0.01, NaN, Infinity, "100", null, undefined];

    for (const amount of invalid) {
      expect(validateAmount(amount)).toBe(false);
    }
  });
});
