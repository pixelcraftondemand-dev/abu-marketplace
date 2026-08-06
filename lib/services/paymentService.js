// Payment service helpers.
//
// Every helper here is written to be safe under concurrency:
//  - state transitions use conditional UPDATEs (the row must still be in the
//    expected `from` state), so two racing processors can never both apply;
//  - inventory reservation uses atomic conditional decrements
//    (`stock >= quantity`), so a product cannot be oversold;
//  - release is idempotent and safe to run on retries.

import { assertValidTransition } from "./paymentState";

export class StockUnavailableError extends Error {
  constructor(productId) {
    super(`Insufficient stock for product: ${productId}`);
    this.name = "StockUnavailableError";
    this.code = "INSUFFICIENT_STOCK";
    this.productId = productId;
  }
}

/** Canonical amount (USD units) -> provider cents. */
export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

/**
 * Atomically transition a payment's status using optimistic concurrency: the
 * UPDATE only matches rows still in state `from`. If two processors race, only
 * one can apply; the loser gets { applied: false } and must treat the payment
 * as already handled (safe no-op).
 */
export async function transitionPaymentStatus(db, paymentId, from, to) {
  assertValidTransition(from, to);
  const result = await db.payment.updateMany({
    where: { id: paymentId, status: from },
    data: { status: to },
  });
  return { applied: result.count === 1 };
}

/**
 * Reserve stock atomically for `items` ({ productId, quantity }).
 *
 * Products with `stock: null` are treated as unlimited. A product with a finite
 * stock is decremented only if `stock >= quantity`, so two concurrent checkouts
 * can never consume the same unit. Throws StockUnavailableError when any
 * tracked product lacks stock — callers inside a transaction should let the
 * whole transaction roll back (no manual compensation needed).
 */
export async function reserveStock(tx, requestedItems) {
  for (const [productId, quantity] of requestedItems) {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        OR: [{ stock: null }, { stock: { gte: quantity } }],
      },
      data: { stock: { decrement: quantity } },
    });
    if (result.count !== 1) {
      throw new StockUnavailableError(productId);
    }
  }
}

/**
 * Release previously reserved stock (payment failed, expired, canceled, or a
 * checkout that never reached the provider). Idempotent: increments are safe to
 * repeat, and null-stock (unlimited) products are unaffected.
 */
export async function releaseStock(db, items) {
  for (const item of items) {
    const productId = item.productId || item.id;
    const quantity = item.quantity;
    if (!productId || !Number.isInteger(quantity) || quantity < 1) continue;
    await db.product.updateMany({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });
  }
}
