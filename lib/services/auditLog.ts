// Append-only audit log service.
//
// Every payment-state-changing action is recorded here with old/new state,
// actor, timestamp, and metadata. No updates or deletes at the application
// level — this is an immutable audit trail for BSL reporting and dispute
// resolution.

import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

interface AppendAuditLogParams {
  pspTransactionId?: string | null;
  actor?: string;
  action: string;
  previousState?: string | null;
  newState?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  previousState: string | null;
  newState: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface ReportingParams {
  from: Date;
  to: Date;
  action?: string;
  limit?: number;
}

/**
 * Append an audit log entry. This is append-only: no updates, no deletes.
 */
export async function appendAuditLog(
  db: PrismaDb,
  {
    pspTransactionId,
    actor,
    action,
    previousState,
    newState,
    metadata,
    ipAddress,
  }: AppendAuditLogParams
): Promise<void> {
  await db.auditLog.create({
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
export async function getAuditTrail(
  db: PrismaDb,
  pspTransactionId: string
): Promise<AuditLogEntry[]> {
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
export async function getAuditLogsForReporting(
  db: PrismaDb,
  { from, to, action, limit = 1000 }: ReportingParams
): Promise<AuditLogEntry[]> {
  const where: Record<string, unknown> = {
    createdAt: { gte: from, lte: to },
  };
  if (action) where.action = action;

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
