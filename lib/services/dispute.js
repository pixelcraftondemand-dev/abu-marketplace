// Dispute and chargeback handling.
//
// A defined workflow for disputed transactions:
//   1. Customer/merchant raises a dispute → status moves to DISPUTED
//   2. Held funds: don't settle a disputed transaction until resolved
//   3. Resolution reverses or confirms the original transaction
// Every dispute has its own audit trail separate from the general log.

import { PSP_STATES, transitionPspStatus } from "./pspStateMachine.js";
import { recordRefund } from "./ledger.js";
import { appendAuditLog } from "./auditLog.js";

/**
 * Open a dispute on a PSP transaction.
 * Moves the PSP transaction to DISPUTED state and creates a Dispute record.
 * Funds are held (not settled) while a dispute is open.
 */
export async function openDispute(db, {
  pspTransactionId,
  userId,
  reason,
  amount,
  ipAddress,
}) {
  const txn = await db.pspTransaction.findUnique({
    where: { id: pspTransactionId },
  });

  if (!txn) {
    throw new Error("Transaction not found.");
  }

  // Only captured transactions can be disputed
  if (txn.pspStatus !== PSP_STATES.CAPTURED) {
    throw new Error(`Cannot dispute transaction in ${txn.pspStatus} state.`);
  }

  // Check for existing open dispute
  const existing = await db.dispute.findFirst({
    where: {
      pspTransactionId,
      status: { notIn: ["RESOLVED_FOR_BUYER", "RESOLVED_FOR_SELLER"] },
    },
  });
  if (existing) {
    throw new Error(`Dispute already open: ${existing.id}`);
  }

  const dispute = await db.$transaction(async (tx) => {
    // Transition PSP transaction to DISPUTED
    const transition = await transitionPspStatus(
      tx,
      pspTransactionId,
      PSP_STATES.CAPTURED,
      PSP_STATES.DISPUTED,
      txn.version
    );

    if (!transition.applied) {
      throw new Error("Concurrent modification — please retry.");
    }

    // Create the dispute record
    const disputeRecord = await tx.dispute.create({
      data: {
        pspTransactionId,
        userId,
        reason,
        amount: amount || txn.capturedAmount,
        status: "OPEN",
      },
    });

    return disputeRecord;
  });

  await appendAuditLog(db, {
    pspTransactionId,
    actor: userId,
    action: "dispute",
    previousState: PSP_STATES.CAPTURED,
    newState: PSP_STATES.DISPUTED,
    metadata: { disputeId: dispute.id, reason, amount: amount || txn.capturedAmount },
    ipAddress,
  });

  return dispute;
}

/**
 * Resolve a dispute in favor of the buyer (refund).
 * Moves PSP to REFUND_PENDING, creates refund ledger entries.
 */
export async function resolveDisputeForBuyer(db, { disputeId, resolution, adminId, ipAddress }) {
  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: { pspTransaction: true },
  });

  if (!dispute) throw new Error("Dispute not found.");
  if (dispute.status === "RESOLVED_FOR_BUYER" || dispute.status === "RESOLVED_FOR_SELLER") {
    throw new Error("Dispute already resolved.");
  }

  const txn = dispute.pspTransaction;

  await db.$transaction(async (tx) => {
    // Update dispute record
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED_FOR_BUYER",
        resolution: resolution || "Refunded to buyer",
        resolvedAt: new Date(),
      },
    });

    // Transition PSP transaction from DISPUTED → RESOLVED → REFUND_PENDING
    await transitionPspStatus(tx, txn.id, PSP_STATES.DISPUTED, PSP_STATES.RESOLVED, txn.version);
    // Re-fetch for updated version
    const updated = await tx.pspTransaction.findUnique({ where: { id: txn.id } });
    await transitionPspStatus(tx, txn.id, PSP_STATES.RESOLVED, PSP_STATES.REFUND_PENDING, updated.version);

    // Record refund in ledger
    await recordRefund(tx, {
      pspTransactionId: txn.id,
      amount: dispute.amount,
      description: `Dispute resolved for buyer: ${disputeId}`,
      referenceType: "dispute",
      referenceId: disputeId,
    });
  });

  await appendAuditLog(db, {
    pspTransactionId: txn.id,
    actor: adminId || "system",
    action: "resolve",
    previousState: PSP_STATES.DISPUTED,
    newState: PSP_STATES.REFUND_PENDING,
    metadata: { disputeId, resolution: "buyer", reason: resolution },
    ipAddress,
  });

  return dispute;
}

/**
 * Resolve a dispute in favor of the seller (release funds).
 * Moves PSP back to CAPTURED state so settlement can proceed.
 */
export async function resolveDisputeForSeller(db, { disputeId, resolution, adminId, ipAddress }) {
  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: { pspTransaction: true },
  });

  if (!dispute) throw new Error("Dispute not found.");
  if (dispute.status === "RESOLVED_FOR_BUYER" || dispute.status === "RESOLVED_FOR_SELLER") {
    throw new Error("Dispute already resolved.");
  }

  const txn = dispute.pspTransaction;

  await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED_FOR_SELLER",
        resolution: resolution || "Funds released to seller",
        resolvedAt: new Date(),
      },
    });

    // Transition PSP transaction from DISPUTED → RESOLVED → CAPTURED
    await transitionPspStatus(tx, txn.id, PSP_STATES.DISPUTED, PSP_STATES.RESOLVED, txn.version);
    const updated = await tx.pspTransaction.findUnique({ where: { id: txn.id } });
    await transitionPspStatus(tx, txn.id, PSP_STATES.RESOLVED, PSP_STATES.CAPTURED, updated.version);
  });

  await appendAuditLog(db, {
    pspTransactionId: txn.id,
    actor: adminId || "system",
    action: "resolve",
    previousState: PSP_STATES.DISPUTED,
    newState: PSP_STATES.CAPTURED,
    metadata: { disputeId, resolution: "seller", reason: resolution },
    ipAddress,
  });

  return dispute;
}

/**
 * Get all disputes, optionally filtered by status.
 */
export async function getDisputes(db, { status, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (status) where.status = status;

  return db.dispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      pspTransaction: {
        select: { id: true, amount: true, capturedAmount: true, pspStatus: true, merchantId: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Check if a transaction's funds are held due to an active dispute.
 */
export async function isHeldByDispute(db, pspTransactionId) {
  const dispute = await db.dispute.findFirst({
    where: {
      pspTransactionId,
      status: { notIn: ["RESOLVED_FOR_BUYER", "RESOLVED_FOR_SELLER"] },
    },
  });
  return !!dispute;
}
