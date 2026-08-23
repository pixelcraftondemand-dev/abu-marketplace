// Settlement engine.
//
// Batches captured transactions per merchant on a defined schedule and
// initiates payouts. Fee deduction happens explicitly in the ledger.
// Settlement references the ledger as source of truth — never recomputes
// from scratch.

import { PSP_STATES, isHeldForSettlement } from "./pspStateMachine.js";
import { recordPlatformFee, recordSettlement } from "./ledger.js";
import { appendAuditLog } from "./auditLog.js";

const DEFAULT_PLATFORM_FEE_RATE = 0.05; // 5% platform fee

/**
 * Create a settlement batch for a merchant's captured transactions.
 *
 * @param {object} db - Prisma client
 * @param {object} params
 * @param {string} params.merchantId - storeId
 * @param {number} [params.feeRate] - override default fee rate
 * @returns {object} settlement batch
 */
export async function createSettlementBatch(db, { merchantId, feeRate = DEFAULT_PLATFORM_FEE_RATE }) {
  // Find all captured transactions for this merchant that haven't been settled
  const unsettledTransactions = await db.pspTransaction.findMany({
    where: {
      merchantId,
      pspStatus: PSP_STATES.CAPTURED,
      settlementBatchId: null,
    },
    orderBy: { capturedAt: "asc" },
  });

  if (unsettledTransactions.length === 0) {
    return null; // nothing to settle
  }

  const grossAmount = unsettledTransactions.reduce((sum, t) => sum + t.capturedAmount, 0);
  const platformFee = Math.round(grossAmount * feeRate * 100) / 100;
  const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

  // Create the batch and link transactions in a single transaction
  const batch = await db.$transaction(async (tx) => {
    const batchRecord = await tx.settlementBatch.create({
      data: {
        merchantId,
        grossAmount,
        platformFee,
        netAmount,
        currency: "USD",
        status: "PENDING",
      },
    });

    // Link all unsettled transactions to this batch
    await tx.pspTransaction.updateMany({
      where: {
        id: { in: unsettledTransactions.map((t) => t.id) },
      },
      data: {
        settlementBatchId: batchRecord.id,
      },
    });

    // Record platform fee in the ledger for each transaction
    for (const txn of unsettledTransactions) {
      const fee = Math.round(txn.capturedAmount * feeRate * 100) / 100;
      if (fee > 0) {
        await recordPlatformFee(tx, {
          pspTransactionId: txn.id,
          amount: fee,
          description: `Platform fee (${feeRate * 100}%) for transaction ${txn.id}`,
          referenceType: "settlement",
          referenceId: batchRecord.id,
        });
      }
    }

    return batchRecord;
  });

  await appendAuditLog(db, {
    actor: "system",
    action: "settle",
    metadata: {
      batchId: batch.id,
      merchantId,
      transactionCount: unsettledTransactions.length,
      grossAmount,
      platformFee,
      netAmount,
    },
  });

  return batch;
}

/**
 * Mark a settlement batch as sent (payout initiated).
 */
export async function markSettlementSent(db, { batchId, payoutRef }) {
  const batch = await db.settlementBatch.update({
    where: { id: batchId, status: "PENDING" },
    data: {
      status: "SENT",
      payoutRef,
      sentAt: new Date(),
    },
  });

  await appendAuditLog(db, {
    actor: "system",
    action: "settle",
    metadata: { batchId, payoutRef, event: "settlement_sent" },
  });

  return batch;
}

/**
 * Confirm a settlement batch (payout received by merchant).
 * Updates PSP transactions to SETTLED and records ledger entries.
 */
export async function confirmSettlement(db, { batchId }) {
  const batch = await db.settlementBatch.findUnique({
    where: { id: batchId },
    include: { transactions: true },
  });

  if (!batch || batch.status !== "SENT") {
    throw new Error(`Cannot confirm settlement batch ${batchId}: status is ${batch?.status}`);
  }

  await db.$transaction(async (tx) => {
    // Update batch status
    await tx.settlementBatch.update({
      where: { id: batchId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    // Mark all transactions as SETTLED
    for (const txn of batch.transactions) {
      await tx.pspTransaction.update({
        where: { id: txn.id, version: txn.version },
        data: {
          pspStatus: PSP_STATES.SETTLED,
          settledAmount: txn.capturedAmount,
          settledAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Record settlement in ledger
      await recordSettlement(tx, {
        pspTransactionId: txn.id,
        amount: txn.capturedAmount,
        description: `Settlement payout for batch ${batchId}`,
        referenceType: "settlement",
        referenceId: batchId,
      });
    }
  });

  await appendAuditLog(db, {
    actor: "system",
    action: "settle",
    metadata: { batchId, event: "settlement_confirmed", transactionCount: batch.transactions.length },
  });

  return batch;
}

/**
 * Handle a failed settlement — mark batch as failed for retry.
 */
export async function failSettlement(db, { batchId, reason }) {
  const batch = await db.settlementBatch.update({
    where: { id: batchId },
    data: {
      status: "FAILED",
      failureReason: reason || "Unknown",
      failedAt: new Date(),
      retryCount: { increment: 1 },
    },
  });

  await appendAuditLog(db, {
    actor: "system",
    action: "settle",
    metadata: { batchId, event: "settlement_failed", reason },
  });

  return batch;
}

/**
 * Get settlement batches for a merchant, with status filtering.
 */
export async function getMerchantSettlements(db, { merchantId, status, limit = 50 }) {
  const where = { merchantId };
  if (status) where.status = status;

  return db.settlementBatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      transactions: {
        select: { id: true, amount: true, capturedAmount: true, pspStatus: true },
      },
    },
  });
}
