// Append-only audit log service.
//
// Every payment-state-changing action is recorded here with old/new state,
// actor, timestamp, and metadata. No updates or deletes at the application
// level — this is an immutable audit trail for BSL reporting and dispute
// resolution.

/**
 * Append an audit log entry. This is append-only: no updates, no deletes.
 *
 * @param {object} db - Prisma client or transaction
 * @param {object} params
 * @param {string} params.pspTransactionId - optional link to PSP transaction
 * @param {string} params.actor - "system" | "webhook" | userId | "admin"
 * @param {string} params.action - "authorize" | "capture" | "settle" | "fail" | "refund" | "dispute" | "resolve"
 * @param {string} [params.previousState]
 * @param {string} [params.newState]
 * @param {object} [params.metadata] - additional context
 * @param {string} [params.ipAddress]
 */
export async function appendAuditLog(db, {
  pspTransactionId,
  actor,
  action,
  previousState,
  newState,
  metadata,
  ipAddress,
}) {
  return db.auditLog.create({
    data: {
      pspTransactionId: pspTransactionId || null,
      actor: actor || "system",
      action,
      previousState: previousState || null,
      newState: newState || null,
      metadata: metadata || null,
      ipAddress: ipAddress || null,
    },
  });
}

/**
 * Retrieve the full audit trail for a PSP transaction.
 * Ordered chronologically for investigation and dispute resolution.
 */
export async function getAuditTrail(db, pspTransactionId) {
  return db.auditLog.findMany({
    where: { pspTransactionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      actor: true,
      action: true,
      previousState: true,
      newState: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
    },
  });
}

/**
 * Retrieve audit logs for regulatory reporting (BSL).
 * Filters by date range and optionally by action type.
 */
export async function getAuditLogsForReporting(db, { from, to, action, limit = 1000 }) {
  const where = {
    createdAt: { gte: from, lte: to },
  };
  if (action) where.action = action;

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
