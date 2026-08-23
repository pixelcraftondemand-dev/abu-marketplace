// PSP State Machine — explicit, enforced lifecycle for payment transactions.
//
// Every state change must go through `transitionPspStatus()`. No other code
// path writes to pspStatus directly. The version column provides optimistic
// concurrency: two racing transitions on the same transaction cannot both apply.
//
// Lifecycle:
//   pending → authorized → captured → settled
//                    ↘ failed
//   captured → refund_pending → refunded
//   captured → disputed → resolved (back to captured or refund_pending)

export const PSP_STATES = {
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  SETTLED: "SETTLED",
  FAILED: "FAILED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
  RESOLVED: "RESOLVED",
};

// Valid transitions per current state. Anything not listed is rejected.
const PSP_TRANSITIONS = {
  [PSP_STATES.PENDING]: [PSP_STATES.AUTHORIZED, PSP_STATES.FAILED],
  [PSP_STATES.AUTHORIZED]: [PSP_STATES.CAPTURED, PSP_STATES.FAILED],
  [PSP_STATES.CAPTURED]: [PSP_STATES.SETTLED, PSP_STATES.REFUND_PENDING, PSP_STATES.DISPUTED],
  [PSP_STATES.SETTLED]: [], // terminal — settlement is final
  [PSP_STATES.FAILED]: [], // terminal
  [PSP_STATES.REFUND_PENDING]: [PSP_STATES.REFUNDED, PSP_STATES.FAILED],
  [PSP_STATES.REFUNDED]: [], // terminal
  [PSP_STATES.DISPUTED]: [PSP_STATES.RESOLVED],
  [PSP_STATES.RESOLVED]: [PSP_STATES.REFUND_PENDING, PSP_STATES.CAPTURED], // resolved back to captured or refund
};

export function isValidPspState(state) {
  return Object.prototype.hasOwnProperty.call(PSP_STATES, state);
}

export function canPspTransition(from, to) {
  if (!from) return true;
  const allowed = PSP_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Throws if `from -> to` is not a valid PSP state transition.
 */
export function assertValidPspTransition(from, to) {
  if (!isValidPspState(to)) {
    throw new Error(`Unknown PSP state: ${to}`);
  }
  if (!canPspTransition(from, to)) {
    throw new Error(`Invalid PSP state transition: ${from || "(none)"} -> ${to}`);
  }
}

/**
 * Atomically transition a PSP transaction's status using optimistic concurrency.
 * The UPDATE matches rows still in state `from` AND version `expectedVersion`.
 * If two processors race, only one applies; the loser gets { applied: false }.
 *
 * Returns { applied, newVersion, previousState, newState }.
 */
export async function transitionPspStatus(db, transactionId, from, to, expectedVersion) {
  assertValidPspTransition(from, to);

  const now = new Date();
  const updateData = {
    pspStatus: to,
    version: { increment: 1 },
  };

  // Set timestamp fields based on transition
  if (to === PSP_STATES.AUTHORIZED) updateData.authorizedAt = now;
  if (to === PSP_STATES.CAPTURED) updateData.capturedAt = now;
  if (to === PSP_STATES.SETTLED) updateData.settledAt = now;
  if (to === PSP_STATES.FAILED) updateData.failedAt = now;

  const where = {
    id: transactionId,
    pspStatus: from,
  };

  // If expectedVersion provided, enforce optimistic concurrency
  if (expectedVersion !== undefined) {
    where.version = expectedVersion;
  }

  const result = await db.pspTransaction.updateMany({
    where,
    data: updateData,
  });

  return {
    applied: result.count === 1,
    previousState: from,
    newState: to,
    newVersion: expectedVersion !== undefined ? expectedVersion + 1 : undefined,
  };
}

/**
 * Determine if a transaction is in a held state (funds captured but not settled,
 * and not disputed). Used by the settlement engine to know what's available.
 */
export function isHeldForSettlement(status) {
  return status === PSP_STATES.CAPTURED;
}

/**
 * Determine if a transaction's funds should be held (not settled) due to
 * an active dispute.
 */
export function isFundsHeld(status) {
  return status === PSP_STATES.DISPUTED;
}

/**
 * Determine if a transaction is in a terminal state (no further transitions
 * possible except from RESOLVED).
 */
export function isTerminal(status) {
  return PSP_TRANSITIONS[status]?.length === 0;
}
