// Regulatory reporting service.
//
// Builds exports for BSL periodic reporting under the Payment Systems Act.
// Transaction volumes, values, merchant activity — queryable from the data model.
// Suspicious activity flagging from the fraud system feeds into the SAR process.
// Retains transaction and audit records per AML regulations.

/**
 * Generate transaction volume report for a period.
 * Returns total transactions, total value, and breakdown by status/type.
 */
export async function generateTransactionVolumeReport(db, { from, to }) {
  // Total PSP transactions in period
  const totals = await db.pspTransaction.aggregate({
    where: { createdAt: { gte: from, lte: to } },
    _count: true,
    _sum: { amount: true, capturedAmount: true, settledAmount: true },
  });

  // Breakdown by status
  const statusBreakdown = await db.pspTransaction.groupBy({
    by: ["pspStatus"],
    where: { createdAt: { gte: from, lte: to } },
    _count: true,
    _sum: { amount: true },
  });

  // Breakdown by merchant
  const merchantBreakdown = await db.pspTransaction.groupBy({
    by: ["merchantId"],
    where: { createdAt: { gte: from, lte: to } },
    _count: true,
    _sum: { amount: true, settledAmount: true },
  });

  return {
    period: { from, to },
    totalTransactions: totals._count,
    totalAmount: totals._sum.amount || 0,
    totalCaptured: totals._sum.capturedAmount || 0,
    totalSettled: totals._sum.settledAmount || 0,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.pspStatus,
      count: s._count,
      amount: s._sum.amount || 0,
    })),
    merchantBreakdown: merchantBreakdown.map((m) => ({
      merchantId: m.merchantId,
      count: m._count,
      amount: m._sum.amount || 0,
      settled: m._sum.settledAmount || 0,
    })),
  };
}

/**
 * Generate settlement report for a period.
 * Shows what was settled, fees collected, and pending settlements.
 */
export async function generateSettlementReport(db, { from, to }) {
  const batches = await db.settlementBatch.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    include: {
      merchant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    totalBatches: batches.length,
    totalGross: batches.reduce((sum, b) => sum + b.grossAmount, 0),
    totalFees: batches.reduce((sum, b) => sum + b.platformFee, 0),
    totalNet: batches.reduce((sum, b) => sum + b.netAmount, 0),
    confirmedBatches: batches.filter((b) => b.status === "CONFIRMED").length,
    pendingBatches: batches.filter((b) => b.status === "PENDING").length,
    failedBatches: batches.filter((b) => b.status === "FAILED").length,
  };

  return { period: { from, to }, summary, batches };
}

/**
 * Flag suspicious activity for SAR (Suspicious Activity Report).
 * Pulls from fraud events and dispute history.
 */
export async function generateSuspiciousActivityReport(db, { from, to }) {
  // High-risk fraud events
  const highRiskEvents = await db.fraudEvent.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      riskScore: { gte: 50 },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { riskScore: "desc" },
  });

  // Blocked transactions
  const blockedEvents = await db.fraudEvent.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      action: "BLOCK",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Open disputes
  const openDisputes = await db.dispute.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["RESOLVED_FOR_BUYER", "RESOLVED_FOR_SELLER"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      pspTransaction: { select: { id: true, amount: true, merchantId: true } },
    },
  });

  return {
    period: { from, to },
    highRiskEvents: highRiskEvents.length,
    blockedTransactions: blockedEvents.length,
    openDisputes: openDisputes.length,
    details: {
      highRiskEvents: highRiskEvents.slice(0, 100), // cap for report size
      blockedEvents: blockedEvents.slice(0, 100),
      openDisputes: openDisputes.slice(0, 100),
    },
  };
}

/**
 * Merchant activity report — per-merchant breakdown for BSL oversight.
 */
export async function generateMerchantActivityReport(db, { from, to }) {
  const merchantStats = await db.pspTransaction.groupBy({
    by: ["merchantId"],
    where: { createdAt: { gte: from, lte: to } },
    _count: true,
    _sum: { amount: true, capturedAmount: true, settledAmount: true },
  });

  const results = [];
  for (const stat of merchantStats) {
    const profile = await db.merchantProfile.findUnique({
      where: { storeId: stat.merchantId },
      select: { verificationStatus: true, riskTier: true },
    });

    const disputes = await db.dispute.count({
      where: {
        pspTransaction: { merchantId: stat.merchantId },
        createdAt: { gte: from, lte: to },
      },
    });

    results.push({
      merchantId: stat.merchantId,
      verificationStatus: profile?.verificationStatus || "N/A",
      riskTier: profile?.riskTier || "N/A",
      transactionCount: stat._count,
      totalAmount: stat._sum.amount || 0,
      totalCaptured: stat._sum.capturedAmount || 0,
      totalSettled: stat._sum.settledAmount || 0,
      disputes,
    });
  }

  return { period: { from, to }, merchants: results };
}

/**
 * Check data retention status.
 * Ensures transaction and audit records are kept per AML regulations.
 */
export async function checkRetentionStatus(db) {
  const oldestPayment = await db.pspTransaction.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const oldestAudit = await db.auditLog.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const oldestLedger = await db.ledgerEntry.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  return {
    oldestPspTransaction: oldestPayment?.createdAt || null,
    oldestAuditLog: oldestAudit?.createdAt || null,
    oldestLedgerEntry: oldestLedger?.createdAt || null,
    retentionNote: "BSL/AML regulations require minimum 5-year retention. Records are never auto-deleted.",
  };
}
