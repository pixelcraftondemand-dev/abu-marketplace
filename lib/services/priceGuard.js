// TOCTOU price validation — server-side price re-fetch at checkout.
//
// Never trust a client-submitted price. Always re-fetch from the database
// at the moment of payment authorization. If the price changed since
// cart-add, surface the discrepancy rather than silently charging either
// the old or new amount.

import { roundMoney, validatePrice } from "./money.js";

const PRICE_STALENESS_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Re-validate all item prices at checkout time.
 * Returns { valid, priceChanged, items } where items have canonical prices.
 *
 * @param {object} tx - Prisma transaction client
 * @param {Array<{id: string, quantity: number, clientPrice?: number}>} items
 * @returns {{ valid: boolean, priceChanged: boolean, items: Array, message?: string }}
 */
export async function validateCheckoutPrices(tx, items) {
  const productIds = items.map((i) => i.id);
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, mrp: true, inStock: true, name: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const validatedItems = [];
  let priceChanged = false;

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return { valid: false, priceChanged: false, items: [], message: `Product ${item.id} not found.` };
    }

    if (!product.inStock) {
      return { valid: false, priceChanged: false, items: [], message: `"${product.name}" is out of stock.` };
    }

    const canonicalPrice = roundMoney(product.price);

    // If the client submitted a price, check if it's stale
    if (item.clientPrice !== undefined) {
      if (!validatePrice(item.clientPrice)) {
        return { valid: false, priceChanged: false, items: [], message: `Invalid price for "${product.name}".` };
      }

      const clientPrice = roundMoney(item.clientPrice);
      if (Math.abs(clientPrice - canonicalPrice) > 0.01) {
        priceChanged = true;
      }
    }

    validatedItems.push({
      id: product.id,
      name: product.name,
      quantity: item.quantity,
      price: canonicalPrice, // always use canonical price
      lineTotal: roundMoney(canonicalPrice * item.quantity),
    });
  }

  return { valid: true, priceChanged, items: validatedItems };
}

/**
 * Exchange rate lock — snapshot the rate at checkout initiation.
 * Returns the rate metadata to store with the transaction.
 *
 * @param {object} params
 * @param {string} params.fromCurrency
 * @param {string} params.toCurrency
 * @param {number} params.rate
 * @param {number} [params.validForMs] - how long the rate is valid
 * @returns {{ rate, lockedAt, expiresAt, fromCurrency, toCurrency }}
 */
export function lockExchangeRate({ fromCurrency, toCurrency, rate, validForMs = 60_000 }) {
  if (!validatePrice(rate)) {
    throw new Error(`Invalid exchange rate: ${rate}`);
  }

  const lockedAt = new Date();
  const expiresAt = new Date(lockedAt.getTime() + validForMs);

  return {
    rate: roundMoney(rate),
    lockedAt,
    expiresAt,
    fromCurrency,
    toCurrency,
  };
}

/**
 * Check if a locked exchange rate is still valid.
 */
export function isRateValid(rateLock) {
  if (!rateLock || !rateLock.expiresAt) return false;
  return new Date() <= new Date(rateLock.expiresAt);
}
