// Structured payment logging.
//
// Only safe, whitelisted metadata is ever logged. Card numbers, CVVs,
// passwords, API keys, tokens, and full provider payloads are NEVER logged.

import crypto from "node:crypto";

// Fields that are safe to record in payment logs.
const SAFE_FIELDS = new Set([
  "event",
  "requestId",
  "orderId",
  "orderIds",
  "paymentId",
  "refundId",
  "providerSessionId",
  "providerPaymentIntentId",
  "providerTransactionId",
  "providerRefundId",
  "eventId",
  "providerEventId",
  "type",
  "previousState",
  "newState",
  "currency",
  "amount",
  "timestamp",
  "failureCategory",
  "reason",
  "discrepancy",
  "ipHash",
]);

/**
 * Log a structured payment event. `fields` are filtered against SAFE_FIELDS so
 * a stray sensitive value can never leak into the log.
 */
export function logPayment(fields) {
  const entry = { timestamp: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields || {})) {
    if (SAFE_FIELDS.has(key) && value !== undefined && value !== null) {
      entry[key] = value;
    }
  }
  console.log(`[payment:${entry.event || "event"}] ${JSON.stringify(entry)}`);

  // Surface failures to the project's error monitoring (fire-and-forget; never
  // blocks or breaks the payment path). Safe fields only.
  if (entry.failureCategory || /failed|mismatch|unreachable/.test(entry.event || "")) {
    import("@sentry/nextjs")
      .then(({ captureMessage }) => {
        captureMessage(`[payment] ${entry.event}`, { extra: entry, level: "error" });
      })
      .catch(() => {});
  }
}

/** Stable hash of a raw IP — store/log the hash, never the raw address. */
export function hashIp(ip) {
  if (!ip) return null;
  try {
    return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

/** Correlation/request ID from the `x-request-id` header, or a fresh UUID. */
export function getRequestId(request) {
  const header = request?.headers?.get?.("x-request-id");
  return header && /^[A-Za-z0-9._-]{8,64}$/.test(header) ? header : crypto.randomUUID();
}
