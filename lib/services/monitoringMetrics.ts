// Monitoring metrics computation.

import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

interface MetricResult {
  value: number | null;
  metadata: Record<string, unknown>;
}

interface WindowParams {
  from?: Date;
  to?: Date;
}

function getWindow({ from, to }: WindowParams = {}): { windowFrom: Date; windowTo: Date } {
  const now = new Date();
  return {
    windowFrom: from || new Date(now.getTime() - 60 * 60 * 1000),
    windowTo: to || now,
  };
}

export async function paymentSuccessRate(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const attempted = await db.pspTransaction.count({ where: { createdAt: { gte: windowFrom, lte: windowTo } } });
  const captured = await db.pspTransaction.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: { in: ["CAPTURED", "SETTLED"] } } });
  const failed = await db.pspTransaction.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: "FAILED" } });
  const failedTransactions = await db.pspTransaction.findMany({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: "FAILED" }, select: { failureReason: true } });
  const byReason: Record<string, number> = {};
  for (const txn of failedTransactions) { const reason = txn.failureReason || "unknown"; byReason[reason] = (byReason[reason] || 0) + 1; }
  const value = attempted > 0 ? (captured / attempted) * 100 : 100;
  return { value: Math.round(value * 100) / 100, metadata: { captured, attempted, failed, byReason, windowFrom, windowTo } };
}

export async function paymentFailureByReason(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const failedTransactions = await db.pspTransaction.findMany({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: "FAILED" }, select: { failureReason: true } });
  const byReason: Record<string, number> = {};
  for (const txn of failedTransactions) { const reason = txn.failureReason || "unknown"; byReason[reason] = (byReason[reason] || 0) + 1; }
  return { value: failedTransactions.length, metadata: { byReason, windowFrom, windowTo } };
}

export async function refundRate(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const now = new Date();
  const windowFrom = params.from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowTo = params.to || now;
  const refundCount = await db.refund.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, status: "SUCCEEDED" } });
  const captureCount = await db.pspTransaction.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: { in: ["CAPTURED", "SETTLED"] } } });
  const refundAgg = await db.refund.aggregate({ where: { createdAt: { gte: windowFrom, lte: windowTo }, status: "SUCCEEDED" }, _sum: { amount: true } });
  const captureAgg = await db.pspTransaction.aggregate({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: { in: ["CAPTURED", "SETTLED"] } }, _sum: { capturedAmount: true } });
  const refundAmount = refundAgg._sum.amount || 0;
  const captureAmount = captureAgg._sum.capturedAmount || 0;
  const value = captureAmount > 0 ? refundAmount / captureAmount : 0;
  return { value: Math.round(value * 10000) / 10000, metadata: { refundCount, captureCount, refundAmount, captureAmount, windowFrom, windowTo } };
}

export async function disputeRate(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const now = new Date();
  const windowFrom = params.from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowTo = params.to || now;
  const disputeCount = await db.dispute.count({ where: { createdAt: { gte: windowFrom, lte: windowTo } } });
  const captureCount = await db.pspTransaction.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, pspStatus: { in: ["CAPTURED", "SETTLED"] } } });
  const value = captureCount > 0 ? disputeCount / captureCount : 0;
  return { value: Math.round(value * 10000) / 10000, metadata: { disputeCount, captureCount, windowFrom, windowTo } };
}

export async function fraudScoreDistribution(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const events = await db.fraudEvent.findMany({ where: { createdAt: { gte: windowFrom, lte: windowTo } }, select: { riskScore: true } });
  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const event of events) { if (event.riskScore >= 80) distribution.critical++; else if (event.riskScore >= 50) distribution.high++; else if (event.riskScore > 0) distribution.medium++; else distribution.low++; }
  return { value: distribution.high + distribution.critical, metadata: { distribution, total: events.length, windowFrom, windowTo } };
}

export async function rateLimitTriggerCount(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const count = await db.rateLimitEntry.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, count: { gte: 3 } } });
  return { value: count, metadata: { windowFrom, windowTo } };
}

export async function ledgerBalanceCheck(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const now = new Date();
  const windowFrom = params.from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowTo = params.to || now;
  const entries = await db.ledgerEntry.findMany({ where: { createdAt: { gte: windowFrom, lte: windowTo } }, select: { debit: true, credit: true } });
  const totalDebit = entries.reduce((sum: number, e: { debit: number }) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum: number, e: { credit: number }) => sum + e.credit, 0);
  const imbalance = Math.round((totalDebit - totalCredit) * 100) / 100;
  return { value: Math.abs(imbalance), metadata: { balanced: Math.abs(imbalance) < 0.01, totalDebit, totalCredit, imbalance, entryCount: entries.length, windowFrom, windowTo } };
}

export async function settlementFailureRate(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const now = new Date();
  const windowFrom = params.from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowTo = params.to || now;
  const total = await db.settlementBatch.count({ where: { createdAt: { gte: windowFrom, lte: windowTo } } });
  const failed = await db.settlementBatch.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, status: "FAILED" } });
  const value = total > 0 ? failed / total : 0;
  return { value: Math.round(value * 10000) / 10000, metadata: { failed, total, windowFrom, windowTo } };
}

export async function webhookProcessingLag(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const webhookEvents = await db.webhookEvent.findMany({ where: { processedAt: { gte: windowFrom, lte: windowTo } }, select: { type: true, processedAt: true } });
  const webhookAuditEvents = await db.auditLog.findMany({ where: { actor: "webhook", createdAt: { gte: windowFrom, lte: windowTo } }, select: { createdAt: true, metadata: true } });
  const avgLagMs = webhookAuditEvents.length > 0 ? webhookAuditEvents.reduce((sum: number, e: { metadata?: Record<string, unknown> }) => sum + ((e.metadata?.processingTimeMs as number) || 0), 0) / webhookAuditEvents.length : 0;
  return { value: Math.round(avgLagMs), metadata: { eventCount: webhookEvents.length, auditEventCount: webhookAuditEvents.length, avgLagMs: Math.round(avgLagMs), windowFrom, windowTo } };
}

export async function idempotencyConflictRate(db: PrismaDb, params: WindowParams = {}): Promise<MetricResult> {
  const { windowFrom, windowTo } = getWindow(params);
  const conflicts = await db.idempotencyKeyRecord.count({ where: { createdAt: { gte: windowFrom, lte: windowTo }, status: "conflict" } });
  const total = await db.idempotencyKeyRecord.count({ where: { createdAt: { gte: windowFrom, lte: windowTo } } });
  const value = total > 0 ? conflicts / total : 0;
  return { value: Math.round(value * 10000) / 10000, metadata: { conflicts, total, windowFrom, windowTo } };
}

export async function computeAllMetrics(db: PrismaDb, params: WindowParams = {}): Promise<Record<string, MetricResult>> {
  const metrics = await Promise.allSettled([
    paymentSuccessRate(db, params),
    paymentFailureByReason(db, params),
    refundRate(db, params),
    disputeRate(db, params),
    fraudScoreDistribution(db, params),
    rateLimitTriggerCount(db, params),
    ledgerBalanceCheck(db, params),
    settlementFailureRate(db, params),
    webhookProcessingLag(db, params),
    idempotencyConflictRate(db, params),
  ]);
  const names = ["payment_success_rate", "payment_failure_by_reason", "refund_rate", "dispute_rate", "fraud_score_distribution", "rate_limit_triggers", "ledger_balance", "settlement_failure_rate", "webhook_processing_lag", "idempotency_conflict_rate"];
  const result: Record<string, MetricResult> = {};
  for (let i = 0; i < names.length; i++) {
    const entry = metrics[i];
    if (entry.status === "fulfilled") { result[names[i]] = entry.value; } else { result[names[i]] = { value: null, metadata: { error: (entry.reason as Error)?.message || "Computation failed" } }; }
  }
  return result;
}
