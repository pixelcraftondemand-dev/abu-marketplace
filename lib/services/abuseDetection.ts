// Abuse detection services.

import { PrismaClient } from "@prisma/client";
import { appendAuditLog } from "./auditLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

const CARD_TEST_WINDOW_MS = 10 * 60 * 1000;
const CARD_TEST_MAX_FAILURES = 3;
const CARD_TEST_MAX_ATTEMPTS = 5;

interface CardTestingResult {
  detected: boolean;
  reasons: string[];
  riskScore: number;
}

interface AccountTakeoverResult {
  detected: boolean;
  requiresVerification: boolean;
  isNewDevice: boolean;
  addressChanged: boolean;
  reasons: string[];
}

interface SyntheticIdentityResult {
  detected: boolean;
  sharedSignals: Array<{ type: string; count: number; detail: string }>;
  combinedRiskScore: number;
}

interface CouponFarmingResult {
  detected: boolean;
  reasons: string[];
}

interface SelfDealingResult {
  detected: boolean;
  reasons: string[];
  anomalyScore: number;
}

interface SettlementExistsResult {
  exists: boolean;
  existingBatchId?: string;
  existingStatus?: string;
}

export async function detectCardTesting(
  db: PrismaDb,
  { userId, deviceFingerprint, ipAddress, orderAmount }: { userId: string; deviceFingerprint?: string; ipAddress?: string; orderAmount?: number }
): Promise<CardTestingResult> {
  const reasons: string[] = [];
  let riskScore = 0;
  const windowStart = new Date(Date.now() - CARD_TEST_WINDOW_MS);

  const deviceFailures = await db.fraudEvent.count({
    where: {
      eventType: "velocity",
      action: { in: ["BLOCK", "MANUAL_REVIEW"] },
      createdAt: { gte: windowStart },
      details: { path: ["deviceFingerprint"], equals: deviceFingerprint },
    },
  });
  if (deviceFailures >= CARD_TEST_MAX_FAILURES) {
    riskScore += 50;
    reasons.push(`card_testing: ${deviceFailures} failed attempts from same device`);
  }

  const deviceAttempts = await db.fraudEvent.count({
    where: {
      createdAt: { gte: windowStart },
      details: { path: ["deviceFingerprint"], equals: deviceFingerprint },
    },
  });
  if (deviceAttempts >= CARD_TEST_MAX_ATTEMPTS) {
    riskScore += 40;
    reasons.push(`card_testing: ${deviceAttempts} total attempts from same device`);
  }

  const smallTransactions = await db.pspTransaction.count({
    where: { userId, createdAt: { gte: windowStart }, amount: { lt: 20 } },
  });
  if (smallTransactions >= 3) {
    riskScore += 30;
    reasons.push(`card_testing: ${smallTransactions} small-value transactions`);
  }

  if (ipAddress) {
    const distinctUsers = await db.fraudEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: windowStart }, details: { path: ["ip"], equals: ipAddress } },
    });
    if (distinctUsers.length >= 3) {
      riskScore += 45;
      reasons.push(`card_testing: ${distinctUsers.length} distinct users from IP ${ipAddress}`);
    }
  }

  riskScore = Math.min(100, riskScore);
  return { detected: riskScore >= 50, reasons, riskScore };
}

export async function detectAccountTakeover(
  db: PrismaDb,
  { userId, shippingAddressId, deviceFingerprint, ipAddress }: { userId: string; shippingAddressId?: string; deviceFingerprint?: string; ipAddress?: string }
): Promise<AccountTakeoverResult> {
  const reasons: string[] = [];
  let requiresVerification = false;

  const knownDevice = await db.deviceSession.findFirst({
    where: { userId, fingerprintHash: deviceFingerprint },
  });
  const isNewDevice = !knownDevice;

  const recentAddressChange = await db.order.findFirst({
    where: { userId, addressId: { not: shippingAddressId }, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { addressId: true },
  });
  const addressChanged = !!recentAddressChange;

  const hasPaymentHistory = await db.payment.count({ where: { userId, status: "SUCCEEDED" } });

  if (isNewDevice && addressChanged && hasPaymentHistory > 0) {
    requiresVerification = true;
    reasons.push("account_takeover: new device + address change + existing payment history");
  }
  if (isNewDevice && hasPaymentHistory === 0) {
    reasons.push("account_takeover: new device on account with no order history");
  }

  return { detected: requiresVerification, requiresVerification, isNewDevice, addressChanged, reasons };
}

export async function detectSyntheticIdentity(
  db: PrismaDb,
  { userId }: { userId: string }
): Promise<SyntheticIdentityResult> {
  const sharedSignals: Array<{ type: string; count: number; detail: string }> = [];
  let combinedRiskScore = 0;

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, createdAt: true } });
  if (!user) return { detected: false, sharedSignals: [], combinedRiskScore: 0 };

  const userDevices = await db.deviceSession.findMany({ where: { userId }, select: { fingerprintHash: true } });
  for (const device of userDevices) {
    const otherUsers = await db.deviceSession.groupBy({
      by: ["userId"],
      where: { fingerprintHash: device.fingerprintHash, userId: { not: userId } },
    });
    if (otherUsers.length > 0) {
      sharedSignals.push({ type: "shared_device", count: otherUsers.length, detail: `Device shared with ${otherUsers.length} other account(s)` });
      combinedRiskScore += 30;
    }
  }

  const recentAccounts = await db.user.count({
    where: {
      createdAt: { gte: new Date(user.createdAt.getTime() - 60_000), lte: new Date(user.createdAt.getTime() + 60_000) },
      id: { not: userId },
    },
  });
  if (recentAccounts >= 2) {
    sharedSignals.push({ type: "burst_account_creation", count: recentAccounts, detail: `${recentAccounts} accounts created within 1 minute` });
    combinedRiskScore += 40;
  }

  combinedRiskScore = Math.min(100, combinedRiskScore);
  return { detected: combinedRiskScore >= 50, sharedSignals, combinedRiskScore };
}

export async function detectCouponFarming(
  db: PrismaDb,
  { userId, deviceFingerprint, ipAddress, couponCode }: { userId: string; deviceFingerprint?: string; ipAddress?: string; couponCode?: string }
): Promise<CouponFarmingResult> {
  const reasons: string[] = [];
  let detected = false;

  if (deviceFingerprint) {
    const deviceOrders = await db.order.findMany({
      where: { isCouponUsed: true, coupon: { path: ["code"], equals: couponCode }, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { userId: true },
    });
    for (const order of deviceOrders) {
      const hasSameDevice = await db.deviceSession.findFirst({ where: { userId: order.userId, fingerprintHash: deviceFingerprint } });
      if (hasSameDevice && order.userId !== userId) {
        detected = true;
        reasons.push(`coupon_farming: same device used coupon ${couponCode} from another account`);
        break;
      }
    }
  }

  if (ipAddress) {
    const ipCouponOrders = await db.order.findMany({
      where: { isCouponUsed: true, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { userId: true, coupon: true },
    });
    const firstOrderCoupons = ipCouponOrders.filter((o: { coupon?: { forNewUser?: boolean } }) => o.coupon?.forNewUser === true);
    if (firstOrderCoupons.length >= 3) {
      detected = true;
      reasons.push(`coupon_farming: ${firstOrderCoupons.length} new-user coupons from similar timing`);
    }
  }

  return { detected, reasons };
}

export async function detectMerchantSelfDealing(
  db: PrismaDb,
  { merchantId, transactionAmount }: { merchantId: string; transactionAmount: number }
): Promise<SelfDealingResult> {
  const reasons: string[] = [];
  let anomalyScore = 0;

  const history = await db.pspTransaction.aggregate({
    where: { merchantId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    _avg: { amount: true },
    _count: true,
  });

  const avgAmount = history._avg.amount || 0;
  const totalTransactions = history._count || 0;

  if (avgAmount > 0 && transactionAmount > avgAmount * 3) {
    anomalyScore += 40;
    reasons.push(`self_dealing: amount $${transactionAmount} is ${Math.round(transactionAmount / avgAmount)}x the 30-day average`);
  }

  const todayCount = await db.pspTransaction.count({
    where: { merchantId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });
  const dailyAvg = totalTransactions / 30;
  if (dailyAvg > 0 && todayCount > dailyAvg * 5) {
    anomalyScore += 50;
    reasons.push(`self_dealing: today's count ${todayCount} is ${Math.round(todayCount / dailyAvg)}x the daily average`);
  }

  anomalyScore = Math.min(100, anomalyScore);
  return { detected: anomalyScore >= 50, reasons, anomalyScore };
}

export async function checkSettlementExists(
  db: PrismaDb,
  { merchantId, periodStart, periodEnd }: { merchantId: string; periodStart: Date; periodEnd: Date }
): Promise<SettlementExistsResult> {
  const existing = await db.settlementBatch.findFirst({
    where: { merchantId, createdAt: { gte: periodStart, lte: periodEnd }, status: { notIn: ["FAILED"] } },
    select: { id: true, status: true },
  });
  return { exists: !!existing, existingBatchId: existing?.id, existingStatus: existing?.status };
}
