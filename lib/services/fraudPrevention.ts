// Fraud prevention service.
//
// Risk-scored checks at checkout. Orders above the risk threshold go to a
// manual review queue (admin-facing held-orders list), not auto-block — false
// positives cost more in lost legitimate sales than fraud losses at this stage.

import { PrismaClient } from "@prisma/client";
import { appendAuditLog } from "./auditLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

// ─── Risk scoring thresholds ──────────────────────────────────────────────────

const VELOCITY_WINDOW_MS = 15 * 60 * 1000; // 15-minute window
const VELOCITY_MAX_FAILURES = 3; // max failed payments per user in window
const VELOCITY_MAX_ORDERS = 5; // max orders per user in window
const HIGH_VALUE_THRESHOLD = 500; // USD — orders above this are flagged
const NEW_ACCOUNT_DAYS = 7; // accounts younger than this get extra scrutiny
const RISK_SCORE_BLOCK_THRESHOLD = 80; // scores >= 80 → block
const RISK_SCORE_REVIEW_THRESHOLD = 50; // scores >= 50 → manual review

interface EvaluateRiskParams {
  userId: string;
  orderAmount: number;
  ipAddress: string;
  deviceFingerprint?: string | null;
  pspTransactionId?: string;
}

interface RiskResult {
  action: "ALLOW" | "FLAG" | "BLOCK" | "MANUAL_REVIEW";
  riskScore: number;
  reasons: string[];
}

interface HeldOrdersParams {
  limit?: number;
  offset?: number;
}

interface ReviewParams {
  eventId: string;
  reviewedBy: string;
  approved: boolean;
  note?: string;
}

/**
 * Evaluate the risk of a checkout request.
 */
export async function evaluateCheckoutRisk(
  db: PrismaDb,
  {
    userId,
    orderAmount,
    ipAddress,
    deviceFingerprint,
    pspTransactionId,
  }: EvaluateRiskParams
): Promise<RiskResult> {
  let riskScore = 0;
  const reasons: string[] = [];

  // 1. Velocity check: failed payment attempts in recent window
  const recentFailures = await db.auditLog.count({
    where: {
      actor: userId,
      action: "fail",
      createdAt: { gte: new Date(Date.now() - VELOCITY_WINDOW_MS) },
    },
  });
  if (recentFailures >= VELOCITY_MAX_FAILURES) {
    riskScore += 40;
    reasons.push(`velocity: ${recentFailures} failed attempts in ${VELOCITY_WINDOW_MS / 60000}min`);
  }

  // 2. Velocity check: rapid repeat orders
  const recentOrders = await db.order.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - VELOCITY_WINDOW_MS) },
    },
  });
  if (recentOrders >= VELOCITY_MAX_ORDERS) {
    riskScore += 30;
    reasons.push(`velocity: ${recentOrders} orders in ${VELOCITY_WINDOW_MS / 60000}min`);
  }

  // 3. New account + high value
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (user) {
    const accountAge = Date.now() - user.createdAt.getTime();
    const isNewAccount = accountAge < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
    if (isNewAccount && orderAmount > HIGH_VALUE_THRESHOLD) {
      riskScore += 35;
      reasons.push(`new_account_high_value: account ${Math.floor(accountAge / 86400000)} days old, amount $${orderAmount}`);
    }
  }

  // 4. IP/device signals: check for previously flagged IPs
  if (ipAddress) {
    const flaggedIps = await db.fraudEvent.findFirst({
      where: {
        eventType: "ip_device",
        action: { in: ["BLOCK", "MANUAL_REVIEW"] },
        details: { path: ["ip"], equals: ipAddress },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
      },
    });
    if (flaggedIps) {
      riskScore += 25;
      reasons.push(`ip_device: IP ${ipAddress} previously flagged`);
    }
  }

  // 5. Mismatch signals: large order with no order history
  const totalOrders = await db.order.count({ where: { userId } });
  if (totalOrders === 0 && orderAmount > 200) {
    riskScore += 15;
    reasons.push(`mismatch: first-time buyer, amount $${orderAmount}`);
  }

  // Clamp risk score to 0-100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine action
  let action: RiskResult["action"];
  if (riskScore >= RISK_SCORE_BLOCK_THRESHOLD) {
    action = "BLOCK";
  } else if (riskScore >= RISK_SCORE_REVIEW_THRESHOLD) {
    action = "MANUAL_REVIEW";
  } else if (riskScore > 0) {
    action = "FLAG";
  } else {
    action = "ALLOW";
  }

  // Log the fraud event
  await db.fraudEvent.create({
    data: {
      userId,
      pspTransactionId: pspTransactionId || null,
      eventType: reasons.length > 0 ? reasons[0].split(":")[0] : "routine_check",
      riskScore,
      action,
      details: {
        ip: ipAddress || null,
        deviceFingerprint: deviceFingerprint || null,
        orderAmount,
        reasons,
      },
    },
  });

  return { action, riskScore, reasons };
}

/**
 * Get orders flagged for manual review.
 */
export async function getHeldOrders(
  db: PrismaDb,
  { limit = 50, offset = 0 }: HeldOrdersParams = {}
): Promise<unknown[]> {
  const events = await db.fraudEvent.findMany({
    where: { action: { in: ["MANUAL_REVIEW", "BLOCK"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return events;
}

/**
 * Admin review action: approve or reject a flagged event.
 */
export async function reviewFraudEvent(
  db: PrismaDb,
  { eventId, reviewedBy, approved, note }: ReviewParams
): Promise<unknown> {
  const action = approved ? "ALLOW" : "BLOCK";
  return db.fraudEvent.update({
    where: { id: eventId },
    data: {
      action,
      reviewedBy,
      reviewNote: note || null,
    },
  });
}
