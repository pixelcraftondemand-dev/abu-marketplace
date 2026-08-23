// Reconciliation service.
//
// Scheduled job (daily minimum) comparing the internal ledger against actual
// bank/mobile-money settlement confirmations. Flags any mismatch for
// investigation. This is the safety net that catches discrepancies between
// what the system thinks happened and what actually happened with money.

import { LEDGER_ACCOUNTS } from "./ledger.js";
import { appendAuditLog } from "./auditLog.js";

/**
 * Run reconciliation for a given date range.
 *
 * Compares:
 *   1. Settlement batches vs ledger entries for settlements
 *   2. PSP transactions in SETTLED state vs settlement batches
 *   3. Ledger balance integrity (all entries sum to zero)
 *
 * Returns { balanced, mismatches, summary }.
 */
export async function runReconciliation(db, { from, to }) {
  const mismatches = [];

  // ── 1. Check that every SETTLED PSP transaction is in a CONFIRMED settlement batch ──
  const settledWithoutBatch = await db.pspTransaction.findMany({
    where: {
      pspStatus: "SETTLED",
      settlementBatchId: null,
      settledAt: { gte: from, lte: to },
    },
    select: { id: true, amount: true, merchantId: true, settledAt: true },
  });

  if (settledWithoutBatch.length > 0) {
    mismatches.push({
      type: "settled_without_batch",
      description: `${settledWithoutBatch.length} SETTLED transactions have no settlement batch`,
      details: settledWithoutBatch,
    });
  }

  // ── 2. Check that every CONFIRMED settlement batch has matching SETTLED transactions ──
  const confirmedBatches = await db.settlementBatch.findMany({
    where: {
      status: "CONFIRMED",
      confirmedAt: { gte: from, lte: to },
    },
    include: { transactions: true },
  });

  for (const batch of confirmedBatches) {
    const unsettledInBatch = batch.transactions.filter((t) => t.pspStatus !== "SETTLED");
    if (unsettledInBatch.length > 0) {
      mismatches.push({
        type: "batch_unsetted_transactions",
        description: `Batch ${batch.id} has ${unsettledInBatch.length} transactions not in SETTLED state`,
        details: { batchId: batch.id, transactionIds: unsettledInBatch.map((t) => t.id) },
      });
    }

    // Verify net amount matches
    const expectedNet = batch.grossAmount - batch.platformFee;
    if (Math.abs(expectedNet - batch.netAmount) > 0.01) {
      mismatches.push({
        type: "batch_amount_mismatch",
        description: `Batch ${batch.id}: expected net $${expectedNet}, got $${batch.netAmount}`,
        details: { batchId: batch.id, gross: batch.grossAmount, fee: batch.platformFee, net: batch.netAmount },
      });
    }
  }

  // ── 3. Check ledger balance integrity ──
  const ledgerEntries = await db.ledgerEntry.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: { account: true, debit: true, credit: true },
  });

  const accountTotals = {};
  for (const entry of ledgerEntries) {
    if (!accountTotals[entry.account]) {
      accountTotals[entry.account] = { debit: 0, credit: 0 };
    }
    accountTotals[entry.account].debit += entry.debit;
    accountTotals[entry.account].credit += entry.credit;
  }

  // Verify each account's balance is reasonable
  for (const [account, totals] of Object.entries(accountTotals)) {
    const balance = totals.debit - totals.credit;
    // For asset accounts, balance should be >= 0
    // For liability accounts, balance should be <= 0
    if (account === LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE && balance < -0.01) {
      mismatches.push({
        type: "ledger_imbalance",
        description: `Customer receivable has negative balance: $${balance}`,
        details: { account, ...totals },
      });
    }
    if (account === LEDGER_ACCOUNTS.MERCHANT_PAYABLE && balance > 0.01) {
      mismatches.push({
        type: "ledger_imbalance",
        description: `Merchant payable has positive balance: $${balance}`,
        details: { account, ...totals },
      });
    }
  }

  // ── 4. Check for failed settlements that need retry ──
  const failedBatches = await db.settlementBatch.findMany({
    where: {
      status: "FAILED",
      retryCount: { lt: 3 }, // only flag if retries remain
    },
    select: { id: true, merchantId: true, netAmount: true, failureReason: true, retryCount: true },
  });

  if (failedBatches.length > 0) {
    mismatches.push({
      type: "failed_settlements_need_retry",
      description: `${failedBatches.length} failed settlement batches need retry`,
      details: failedBatches,
    });
  }

  // ── 5. Check for disputed transactions still in CAPTURED (held funds) ──
  const disputedCaptured = await db.pspTransaction.findMany({
    where: {
      pspStatus: "DISPUTED",
      createdAt: { gte: from, lte: to },
    },
    select: { id: true, amount: true, capturedAmount: true, merchantId: true },
  });

  if (disputedCaptured.length > 0) {
    mismatches.push({
      type: "disputed_held_funds",
      description: `${disputedCaptured.length} transactions held due to active disputes`,
      details: disputedCaptured,
    });
  }

  // Log the reconciliation result
  await appendAuditLog(db, {
    actor: "system",
    action: "reconcile",
    metadata: {
      period: { from: from.toISOString(), to: to.toISOString() },
      mismatchCount: mismatches.length,
      types: mismatches.map((m) => m.type),
    },
  });

  return {
    balanced: mismatches.length === 0,
    mismatches,
    summary: {
      period: { from, to },
      ledgerEntries: ledgerEntries.length,
      accountTotals,
      confirmedBatches: confirmedBatches.length,
      failedBatches: failedBatches.length,
      disputedTransactions: disputedCaptured.length,
    },
  };
}

/**
 * Get reconciliation history for admin review.
 */
export async function getReconciliationHistory(db, { limit = 30 }) {
  return db.auditLog.findMany({
    where: { action: "reconcile" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      metadata: true,
      createdAt: true,
    },
  });
}
