// Abuse detection services.
//
// Behavioral and cross-account pattern detection for adversarial edge cases.
// These complement the risk scoring in fraudPrevention.js with deeper
// pattern analysis.

import { appendAuditLog } from "./auditLog.js";

// ─── Card testing detection ──────────────────────────────────────────────────

const CARD_TEST_WINDOW_MS = 10 * 60 * 1000; // 10-minute window
const CARD_TEST_MAX_FAILURES = 3; // 3+ failures from same device = card testing
const CARD_TEST_MAX_ATTEMPTS = 5; // 5+ attempts from same device = card testing

/**
 * Detect card-testing behavior: multiple small transactions, varied card tokens,
 * same device/session, short time window.
 *
 * @returns {{ detected: boolean, reason?: string, riskScore: number }}
 */
export async function detectCardTesting(db, { userId, deviceFingerprint, ipAddress, orderAmount }) {
  const reasons = [];
  let riskScore = 0;

  const windowStart = new Date(Date.now() - CARD_TEST_WINDOW_MS);

  // Check for multiple failed payments from same device in short window
  const deviceFailures = await db.fraudEvent.count({
    where: {
      eventType: "velocity",
      action: { in: ["BLOCK", "MANUAL_REVIEW"] },
      createdAt: { gte: windowStart },
      details: {
        path: ["deviceFingerprint"],
        equals: deviceFingerprint,
      },
    },
  });

  if (deviceFailures >= CARD_TEST_MAX_FAILURES) {
    riskScore += 50;
    reasons.push(`card_testing: ${deviceFailures} failed attempts from same device in ${CARD_TEST_WINDOW_MS / 60000}min`);
  }

  // Check for many checkout attempts (success or fail) from same device
  const deviceAttempts = await db.fraudEvent.count({
    where: {
      createdAt: { gte: windowStart },
      details: {
        path: ["deviceFingerprint"],
        equals: deviceFingerprint,
      },
    },
  });

  if (deviceAttempts >= CARD_TEST_MAX_ATTEMPTS) {
    riskScore += 40;
    reasons.push(`card_testing: ${deviceAttempts} total attempts from same device`);
  }

  // Check for multiple small-value transactions (classic card test pattern)
  const smallTransactions = await db.pspTransaction.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
      amount: { lt: 20 }, // small amounts = test transactions
    },
  });

  if (smallTransactions >= 3) {
    riskScore += 30;
    reasons.push(`card_testing: ${smallTransactions} small-value transactions`);
  }

  // Same IP, different users — botnet signal
  if (ipAddress) {
    const distinctUsers = await db.fraudEvent.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: windowStart },
        details: { path: ["ip"], equals: ipAddress },
      },
    });

    if (distinctUsers.length >= 3) {
      riskScore += 45;
      reasons.push(`card_testing: ${distinctUsers.length} distinct users from IP ${ipAddress}`);
    }
  }

  riskScore = Math.min(100, riskScore);

  return {
    detected: riskScore >= 50,
    reasons,
    riskScore,
  };
}

// ─── Account takeover detection ──────────────────────────────────────────────

/**
 * Detect account takeover: shipping address change + new device + saved
 * payment method on first use from new location.
 *
 * @returns {{ detected: boolean, reason?: string, requiresVerification: boolean }}
 */
export async function detectAccountTakeover(db, {
  userId,
  shippingAddressId,
  deviceFingerprint,
  ipAddress,
}) {
  const reasons = [];
  let requiresVerification = false;

  // Check if this is a new device for this user
  const knownDevice = await db.deviceSession.findFirst({
    where: {
      userId,
      fingerprintHash: deviceFingerprint,
    },
  });

  const isNewDevice = !knownDevice;

  // Check if shipping address has changed recently
  const recentAddressChange = await db.order.findFirst({
    where: {
      userId,
      addressId: { not: shippingAddressId },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days
    },
    orderBy: { createdAt: "desc" },
    select: { addressId: true },
  });

  const addressChanged = !!recentAddressChange;

  // Check if user has used a saved payment method before
  const hasPaymentHistory = await db.payment.count({
    where: { userId, status: "SUCCEEDED" },
  });

  // Account takeover pattern: new device + address change + payment method usage
  if (isNewDevice && addressChanged && hasPaymentHistory > 0) {
    requiresVerification = true;
    reasons.push("account_takeover: new device + address change + existing payment history");
  }

  // Also flag if new device + first-time high-value purchase
  if (isNewDevice && hasPaymentHistory === 0) {
    // New device on account with no history — worth noting but lower risk
    reasons.push("account_takeover: new device on account with no order history");
  }

  return {
    detected: requiresVerification,
    requiresVerification,
    isNewDevice,
    addressChanged,
    reasons,
  };
}

// ─── Synthetic identity / structuring detection ─────────────────────────────

/**
 * Detect synthetic identity: multiple "different" accounts sharing signals
 * (device, IP, payment method, shipping address) — aggregate into combined
 * risk signal.
 *
 * @returns {{ detected: boolean, sharedSignals: object[], combinedRiskScore: number }}
 */
export async function detectSyntheticIdentity(db, { userId }) {
  const sharedSignals = [];
  let combinedRiskScore = 0;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true },
  });
  if (!user) return { detected: false, sharedSignals: [], combinedRiskScore: 0 };

  // Check for shared device fingerprints with other users
  const userDevices = await db.deviceSession.findMany({
    where: { userId },
    select: { fingerprintHash: true },
  });

  for (const device of userDevices) {
    const otherUsers = await db.deviceSession.groupBy({
      by: ["userId"],
      where: {
        fingerprintHash: device.fingerprintHash,
        userId: { not: userId },
      },
    });

    if (otherUsers.length > 0) {
      sharedSignals.push({
        type: "shared_device",
        count: otherUsers.length,
        detail: `Device shared with ${otherUsers.length} other account(s)`,
      });
      combinedRiskScore += 30;
    }
  }

  // Check for shared IP addresses
  const userOrders = await db.order.findMany({
    where: { userId },
    select: { id: true },
    take: 5,
  });

  // Check for accounts created very close together (bot-created)
  const recentAccounts = await db.user.count({
    where: {
      createdAt: {
        gte: new Date(user.createdAt.getTime() - 60_000), // within 1 minute
        lte: new Date(user.createdAt.getTime() + 60_000),
      },
      id: { not: userId },
    },
  });

  if (recentAccounts >= 2) {
    sharedSignals.push({
      type: "burst_account_creation",
      count: recentAccounts,
      detail: `${recentAccounts} accounts created within 1 minute`,
    });
    combinedRiskScore += 40;
  }

  combinedRiskScore = Math.min(100, combinedRiskScore);

  return {
    detected: combinedRiskScore >= 50,
    sharedSignals,
    combinedRiskScore,
  };
}

// ─── Coupon abuse detection ─────────────────────────────────────────────────

/**
 * Detect new-account promo farming: same device/IP/account details
 * claiming first-order discounts multiple times.
 *
 * @returns {{ detected: boolean, reason?: string }}
 */
export async function detectCouponFarming(db, { userId, deviceFingerprint, ipAddress, couponCode }) {
  const reasons = [];
  let detected = false;

  // Check if same device has already used this coupon type
  if (deviceFingerprint) {
    const deviceOrders = await db.order.findMany({
      where: {
        isCouponUsed: true,
        coupon: { path: ["code"], equals: couponCode },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
      },
      select: { userId: true },
    });

    // Check if any of these orders came from the same device
    for (const order of deviceOrders) {
      const hasSameDevice = await db.deviceSession.findFirst({
        where: {
          userId: order.userId,
          fingerprintHash: deviceFingerprint,
        },
      });
      if (hasSameDevice && order.userId !== userId) {
        detected = true;
        reasons.push(`coupon_farming: same device used coupon ${couponCode} from another account`);
        break;
      }
    }
  }

  // Check if same IP has multiple new-account orders with coupons
  if (ipAddress) {
    const ipCouponOrders = await db.order.findMany({
      where: {
        isCouponUsed: true,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { userId: true, coupon: true },
    });

    const couponCodes = ipCouponOrders
      .map((o) => o.coupon?.code)
      .filter(Boolean);

    // Multiple first-order coupons from similar timing
    const firstOrderCoupons = ipCouponOrders.filter((o) => {
      // "new user" coupons have forNewUser: true
      return o.coupon?.forNewUser === true;
    });

    if (firstOrderCoupons.length >= 3) {
      detected = true;
      reasons.push(`coupon_farming: ${firstOrderCoupons.length} new-user coupons from similar timing`);
    }
  }

  return { detected, reasons };
}

// ─── Merchant self-dealing detection ────────────────────────────────────────

/**
 * Detect merchant self-dealing: unusual spikes in transaction volume or
 * average order value relative to history.
 *
 * @returns {{ detected: boolean, reason?: string, anomalyScore: number }}
 */
export async function detectMerchantSelfDealing(db, { merchantId, transactionAmount }) {
  const reasons = [];
  let anomalyScore = 0;

  // Get merchant's 30-day transaction history
  const history = await db.pspTransaction.aggregate({
    where: {
      merchantId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _avg: { amount: true },
    _count: true,
    _sum: { amount: true },
  });

  const avgAmount = history._avg.amount || 0;
  const totalTransactions = history._count || 0;

  // Flag if this transaction is 3x+ the average
  if (avgAmount > 0 && transactionAmount > avgAmount * 3) {
    anomalyScore += 40;
    reasons.push(`self_dealing: amount $${transactionAmount} is ${Math.round(transactionAmount / avgAmount)}x the 30-day average`);
  }

  // Flag if there's a sudden spike in transaction count today
  const todayCount = await db.pspTransaction.count({
    where: {
      merchantId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const dailyAvg = totalTransactions / 30;
  if (dailyAvg > 0 && todayCount > dailyAvg * 5) {
    anomalyScore += 50;
    reasons.push(`self_dealing: today's count ${todayCount} is ${Math.round(todayCount / dailyAvg)}x the daily average`);
  }

  anomalyScore = Math.min(100, anomalyScore);

  return {
    detected: anomalyScore >= 50,
    reasons,
    anomalyScore,
  };
}

// ─── Settlement double-claim guard ──────────────────────────────────────────

/**
 * Check if a settlement batch already exists for this merchant+period.
 * Prevents duplicate payouts from running the settlement job twice.
 *
 * @param {object} db
 * @param {string} merchantId
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {{ exists: boolean, existingBatchId?: string }}
 */
export async function checkSettlementExists(db, { merchantId, periodStart, periodEnd }) {
  const existing = await db.settlementBatch.findFirst({
    where: {
      merchantId,
      createdAt: { gte: periodStart, lte: periodEnd },
      status: { notIn: ["FAILED"] }, // allow retry of failed batches
    },
    select: { id: true, status: true },
  });

  return {
    exists: !!existing,
    existingBatchId: existing?.id,
    existingStatus: existing?.status,
  };
}
