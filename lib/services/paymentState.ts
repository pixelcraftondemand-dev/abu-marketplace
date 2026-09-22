// Strict payment state machine.
//
// All payment status changes must go through `assertValidTransition` (or the
// atomic `transitionPaymentStatus` helper in paymentService.js, which combines
// this check with an optimistic-concurrency-safe database update).

export const PAYMENT_STATES = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export type PaymentState = (typeof PAYMENT_STATES)[keyof typeof PAYMENT_STATES];

// Valid transitions per current state. Anything not listed is rejected.
export const PAYMENT_TRANSITIONS: Record<PaymentState, readonly PaymentState[]> = {
  PENDING: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCEEDED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

export function isValidPaymentState(state: string): state is PaymentState {
  return Object.prototype.hasOwnProperty.call(PAYMENT_STATES, state);
}

export function canTransition(from: string | null | undefined, to: string): boolean {
  if (!from) return true; // no previous state -> any initial state allowed
  const allowed = PAYMENT_TRANSITIONS[from as PaymentState];
  return Array.isArray(allowed) && allowed.includes(to as PaymentState);
}

/**
 * Throws if `from -> to` is not a valid payment state transition.
 * Invalid examples: REFUNDED -> SUCCEEDED, FAILED -> REFUNDED, CANCELLED -> SUCCEEDED.
 */
export function assertValidTransition(from: string | null | undefined, to: string): void {
  if (!isValidPaymentState(to)) {
    throw new Error(`Unknown payment state: ${to}`);
  }
  if (!canTransition(from, to)) {
    throw new Error(`Invalid payment state transition: ${from || "(none)"} -> ${to}`);
  }
}
