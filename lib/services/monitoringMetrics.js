// Monitoring metrics computation.
//
// Computes time-series metrics from the existing PSP, payment, ledger, and
// fraud tables. Every function returns { value, metadata } where `value` is
// the primary number for threshold comparison and `metadata` holds breakdown
// detail for dashboards and alert context.

import prisma from "@/lib/prisma.js";

// ─── Transaction health ──────────────────────────────────────────────────────

/**
 * Payment success rate: captured / attempted in the given window.
 * Returns { value: 0-100, metadata: { captured, attempted, failed, byReason } }
 */
export async function paymentSuccessRate(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000); // default: last hour
  const windowTo = to || now;

  const attempted = await db.pspTransaction.count({
    where: { createdAt: { gte: windowFrom, lte: windowTo } },
  });

  const captured = await db.pspTransaction.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: { in: ["CAPTURED", "SETTLED"] },
    },
  });

  const failed = await db.pspTransaction.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: "FAILED",
    },
  });

  // Breakdown by failure reason
  const failedTransactions = await db.pspTransaction.findMany({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: "FAILED",
    },
    select: { failureReason: true },
  });

  const byReason = {};
  for (const txn of failedTransactions) {
    const reason = txn.failureReason || "unknown";
    byReason[reason] = (byReason[reason] || 0) + 1;
  }

  const value = attempted > 0 ? (captured / attempted) * 100 : 100;

  return {
    value: Math.round(value * 100) / 100,
    metadata: { captured, attempted, failed, byReason, windowFrom, windowTo },
  };
}

/**
 * Payment failure rate by reason: returns individual rates for each failure type.
 * Returns { value: overall failure rate, metadata: { byReason: { reason: count } } }
 */
export async function paymentFailureByReason(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000);
  const windowTo = to || now;

  const failedTransactions = await db.pspTransaction.findMany({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: "FAILED",
    },
    select: { failureReason: true },
  });

  const byReason = {};
  for (const txn of failedTransactions) {
    const reason = txn.failureReason || "unknown";
    byReason[reason] = (byReason[reason] || 0) + 1;
  }

  const total = failedTransactions.length;

  return {
    value: total,
    metadata: { byReason, windowFrom, windowTo },
  };
}

/**
 * Refund rate: refunds / captures in the given window.
 * Returns { value: ratio 0-1, metadata: { refundCount, captureCount, refundAmount, captureAmount } }
 */
export async function refundRate(db, { from, to } = {}) {
  const now = new Date();
  // Default: trailing 7 days for refund rate (longer window needed for signal)
  const windowFrom = from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowTo = to || now;

  const refundCount = await db.refund.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      status: "SUCCEEDED",
    },
  });

  const captureCount = await db.pspTransaction.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: { in: ["CAPTURED", "SETTLED"] },
    },
  });

  const refundAgg = await db.refund.aggregate({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      status: "SUCCEEDED",
    },
    _sum: { amount: true },
  });

  const captureAgg = await db.pspTransaction.aggregate({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: { in: ["CAPTURED", "SETTLED"] },
    },
    _sum: { capturedAmount: true },
  });

  const refundAmount = refundAgg._sum.amount || 0;
  const captureAmount = captureAgg._sum.capturedAmount || 0;
  const value = captureAmount > 0 ? refundAmount / captureAmount : 0;

  return {
    value: Math.round(value * 10000) / 10000,
    metadata: { refundCount, captureCount, refundAmount, captureAmount, windowFrom, windowTo },
  };
}

/**
 * Chargeback/dispute rate: disputes / captures in the given window.
 */
export async function disputeRate(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowTo = to || now;

  const disputeCount = await db.dispute.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
    },
  });

  const captureCount = await db.pspTransaction.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      pspStatus: { in: ["CAPTURED", "SETTLED"] },
    },
  });

  const value = captureCount > 0 ? disputeCount / captureCount : 0;

  return {
    value: Math.round(value * 10000) / 10000,
    metadata: { disputeCount, captureCount, windowFrom, windowTo },
  };
}

// ─── Fraud and abuse signals ─────────────────────────────────────────────────

/**
 * Fraud score distribution: count of events in each risk band.
 * Returns { value: highRiskCount, metadata: { distribution: { low: N, medium: N, high: N, critical: N } } }
 */
export async function fraudScoreDistribution(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000);
  const windowTo = to || now;

  const events = await db.fraudEvent.findMany({
    where: { createdAt: { gte: windowFrom, lte: windowTo } },
    select: { riskScore: true },
  });

  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const event of events) {
    if (event.riskScore >= 80) distribution.critical++;
    else if (event.riskScore >= 50) distribution.high++;
    else if (event.riskScore > 0) distribution.medium++;
    else distribution.low++;
  }

  return {
    value: distribution.high + distribution.critical,
    metadata: { distribution, total: events.length, windowFrom, windowTo },
  };
}

/**
 * Rate-limit trigger count: how many rate limit entries in the given window.
 */
export async function rateLimitTriggerCount(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000);
  const windowTo = to || now;

  const count = await db.rateLimitEntry.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      count: { gte: 3 }, // only count entries that hit the limit multiple times
    },
  });

  return {
    value: count,
    metadata: { windowFrom, windowTo },
  };
}

// ─── Settlement and ledger ───────────────────────────────────────────────────

/**
 * Ledger balance check: verify total debits = total credits across all entries.
 * Returns { value: 0 (balanced) or imbalance amount, metadata: { balanced, totalDebit, totalCredit } }
 */
export async function ledgerBalanceCheck(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowTo = to || now;

  const entries = await db.ledgerEntry.findMany({
    where: { createdAt: { gte: windowFrom, lte: windowTo } },
    select: { debit: true, credit: true },
  });

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const imbalance = Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = Math.abs(imbalance) < 0.01;

  return {
    value: Math.abs(imbalance),
    metadata: { balanced, totalDebit, totalCredit, imbalance, entryCount: entries.length, windowFrom, windowTo },
  };
}

/**
 * Settlement batch failure rate: failed batches / total batches in window.
 */
export async function settlementFailureRate(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowTo = to || now;

  const total = await db.settlementBatch.count({
    where: { createdAt: { gte: windowFrom, lte: windowTo } },
  });

  const failed = await db.settlementBatch.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      status: "FAILED",
    },
  });

  const value = total > 0 ? failed / total : 0;

  return {
    value: Math.round(value * 10000) / 10000,
    metadata: { failed, total, windowFrom, windowTo },
  };
}

// ─── System health ───────────────────────────────────────────────────────────

/**
 * Webhook processing lag: average time between event creation and processing.
 * Uses WebhookEvent.processedAt as proxy (created → processed delay).
 * For more accurate lag, we'd need to add a receivedAt field; this uses
 * created timestamps from the audit log as approximation.
 */
export async function webhookProcessingLag(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000);
  const windowTo = to || now;

  // Look for webhook-triggered audit events and estimate processing time
  const webhookEvents = await db.webhookEvent.findMany({
    where: { processedAt: { gte: windowFrom, lte: windowTo } },
    select: { type: true, processedAt: true },
  });

  // Average lag is approximated from audit log timestamps for webhook events
  const webhookAuditEvents = await db.auditLog.findMany({
    where: {
      actor: "webhook",
      createdAt: { gte: windowFrom, lte: windowTo },
    },
    select: { createdAt: true, metadata: true },
  });

  // If we have no data, return 0 (no lag detected)
  const avgLagMs = webhookAuditEvents.length > 0
    ? webhookAuditEvents.reduce((sum, e) => {
        const lag = e.metadata?.processingTimeMs || 0;
        return sum + lag;
      }, 0) / webhookAuditEvents.length
    : 0;

  return {
    value: Math.round(avgLagMs),
    metadata: {
      eventCount: webhookEvents.length,
      auditEventCount: webhookAuditEvents.length,
      avgLagMs: Math.round(avgLagMs),
      windowFrom,
      windowTo,
    },
  };
}

/**
 * Idempotency key conflict rate: conflicts / total idempotency checks.
 */
export async function idempotencyConflictRate(db, { from, to } = {}) {
  const now = new Date();
  const windowFrom = from || new Date(now.getTime() - 60 * 60 * 1000);
  const windowTo = to || now;

  const conflicts = await db.idempotencyKeyRecord.count({
    where: {
      createdAt: { gte: windowFrom, lte: windowTo },
      status: "conflict",
    },
  });

  const total = await db.idempotencyKeyRecord.count({
    where: { createdAt: { gte: windowFrom, lte: windowTo } },
  });

  const value = total > 0 ? conflicts / total : 0;

  return {
    value: Math.round(value * 10000) / 10000,
    metadata: { conflicts, total, windowFrom, windowTo },
  };
}

// ─── Aggregate: compute all metrics at once ──────────────────────────────────

/**
 * Compute all monitoring metrics in a single pass. Used by the cron jobs.
 * Returns an object keyed by metric name.
 */
export async function computeAllMetrics(db, { from, to } = {}) {
  const metrics = await Promise.allSettled([
    paymentSuccessRate(db, { from, to }),
    paymentFailureByReason(db, { from, to }),
    refundRate(db, { from, to }),
    disputeRate(db, { from, to }),
    fraudScoreDistribution(db, { from, to }),
    rateLimitTriggerCount(db, { from, to }),
    ledgerBalanceCheck(db, { from, to }),
    settlementFailureRate(db, { from, to }),
    webhookProcessingLag(db, { from, to }),
    idempotencyConflictRate(db, { from, to }),
  ]);

  const names = [
    "payment_success_rate",
    "payment_failure_by_reason",
    "refund_rate",
    "dispute_rate",
    "fraud_score_distribution",
    "rate_limit_triggers",
    "ledger_balance",
    "settlement_failure_rate",
    "webhook_processing_lag",
    "idempotency_conflict_rate",
  ];

  const result = {};
  for (let i = 0; i < names.length; i++) {
    const entry = metrics[i];
    if (entry.status === "fulfilled") {
      result[names[i]] = entry.value;
    } else {
      result[names[i]] = {
        value: null,
        metadata: { error: entry.reason?.message || "Computation failed" },
      };
    }
  }

  return result;
}
