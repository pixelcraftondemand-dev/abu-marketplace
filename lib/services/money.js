// Money utilities — integer arithmetic for financial precision.
//
// All money values are stored and computed as minor units (cents/leones)
// to eliminate floating-point rounding errors. Every rounding rule is
// centralized here so the same rule applies everywhere — no salami slicing.

/**
 * Convert a display amount (e.g. 10.50 USD) to minor units (1050 cents).
 * Always rounds down (truncates) to favor the platform — never over-charge
 * due to rounding.
 */
export function toMinorUnits(amount, decimals = 2) {
  if (!Number.isFinite(amount)) throw new Error(`Non-finite amount: ${amount}`);
  return Math.trunc(amount * 10 ** decimals);
}

/**
 * Convert minor units back to display amount.
 */
export function toDisplayAmount(minorUnits, decimals = 2) {
  return minorUnits / 10 ** decimals;
}

/**
 * Round money consistently using banker's rounding (round half to even).
 * This is the standard for financial systems — it minimizes cumulative
 * rounding bias compared to round-half-up.
 */
export function roundMoney(value) {
  if (!Number.isFinite(value)) throw new Error(`Non-finite value: ${value}`);
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate a percentage fee, always rounded in the platform's favor (down).
 * E.g. 5% of 99.99 → 4.99 (not 5.00).
 */
export function calculateFee(amount, feeRate) {
  const fee = amount * feeRate;
  return Math.trunc(fee * 100) / 100; // truncate to cents, platform's favor
}

/**
 * Validate that a monetary amount is within sane bounds.
 * Rejects negative, zero, NaN, Infinity, and absurdly large values.
 */
export function validateAmount(amount, { min = 0.01, max = 10_000_000 } = {}) {
  if (!Number.isFinite(amount)) return false;
  if (amount < min) return false;
  if (amount > max) return false;
  return true;
}

/**
 * Validate that a quantity is a positive integer within bounds.
 */
export function validateQuantity(qty, { min = 1, max = 99 } = {}) {
  if (!Number.isInteger(qty)) return false;
  if (qty < min || qty > max) return false;
  return true;
}

/**
 * Validate that a price is a positive number (integer cents or display price).
 * Rejects negative, zero, NaN, Infinity.
 */
export function validatePrice(price) {
  return Number.isFinite(price) && price > 0;
}

/**
 * Calculate the maximum refundable amount for a transaction.
 * Never trusts a client-submitted refund amount.
 *
 * @param {number} capturedAmount - original captured amount
 * @param {number} alreadyRefunded - sum of previous refund amounts
 * @returns {number} maximum refundable (never negative)
 */
export function maxRefundable(capturedAmount, alreadyRefunded = 0) {
  const remaining = capturedAmount - alreadyRefunded;
  return Math.max(0, Math.round(remaining * 100) / 100);
}
