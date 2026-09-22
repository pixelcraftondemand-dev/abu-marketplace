// TOCTOU price validation — server-side price re-fetch at checkout.
//
// Never trust a client-submitted price. Always re-fetch from the database
// at the moment of payment authorization. If the price changed since
// cart-add, surface the discrepancy rather than silently charging either
// the old or new amount.

import { PrismaClient } from "@prisma/client";
import { roundMoney, validatePrice } from "./money";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

interface CheckoutItem {
  id: string;
  quantity: number;
  clientPrice?: number;
}

interface ValidatedItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface ValidateResult {
  valid: boolean;
  priceChanged: boolean;
  items: ValidatedItem[];
  message?: string;
}

interface RateLockParams {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  validForMs?: number;
}

interface RateLock {
  rate: number;
  lockedAt: Date;
  expiresAt: Date;
  fromCurrency: string;
  toCurrency: string;
}

/**
 * Re-validate all item prices at checkout time.
 */
export async function validateCheckoutPrices(
  tx: PrismaDb,
  items: CheckoutItem[]
): Promise<ValidateResult> {
  const productIds = items.map((i) => i.id);
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, mrp: true, inStock: true, name: true },
  });

  interface Product {
    id: string;
    price: number;
    mrp: number;
    inStock: boolean;
    name: string;
  }
  const productMap = new Map<string, Product>(products.map((p: Product) => [p.id, p]));

  const validatedItems: ValidatedItem[] = [];
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
      price: canonicalPrice,
      lineTotal: roundMoney(canonicalPrice * item.quantity),
    });
  }

  return { valid: true, priceChanged, items: validatedItems };
}

/**
 * Exchange rate lock — snapshot the rate at checkout initiation.
 */
export function lockExchangeRate({
  fromCurrency,
  toCurrency,
  rate,
  validForMs = 60_000,
}: RateLockParams): RateLock {
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
export function isRateValid(rateLock: RateLock | null | undefined): boolean {
  if (!rateLock || !rateLock.expiresAt) return false;
  return new Date() <= new Date(rateLock.expiresAt);
}
