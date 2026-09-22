// Merchant onboarding service.
//
// KYC on merchants, risk tiering, transaction limits.
// Built from the start with multi-merchant support even though ABU Marketplace
// is the only merchant at launch — retrofitting this later is much harder.

import { PrismaClient } from "@prisma/client";
import { appendAuditLog } from "./auditLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

const RISK_TIERS: Record<string, { dailyLimit: number; monthlyLimit: number; requiresManualReview: boolean }> = {
  new: { dailyLimit: 1000, monthlyLimit: 25000, requiresManualReview: true },
  standard: { dailyLimit: 5000, monthlyLimit: 100000, requiresManualReview: false },
  established: { dailyLimit: 50000, monthlyLimit: 500000, requiresManualReview: false },
};

interface SubmitKycParams {
  storeId: string;
  businessRegNumber?: string;
  beneficialOwners?: unknown;
  bankAccount?: unknown;
  mobileMoneyAccount?: unknown;
  kycDocuments?: unknown;
}

interface VerifyParams {
  storeId: string;
  approved: boolean;
  adminId?: string;
  rejectionReason?: string;
}

interface CheckLimitsParams {
  merchantId: string;
  amount: number;
}

interface LimitsResult {
  allowed: boolean;
  reason?: string;
  dailyRemaining: number;
  monthlyRemaining: number;
}

interface ListParams {
  verificationStatus?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a merchant profile for a store.
 */
export async function createMerchantProfile(
  db: PrismaDb,
  { storeId }: { storeId: string }
): Promise<unknown> {
  return db.merchantProfile.create({
    data: {
      storeId,
      verificationStatus: "UNVERIFIED",
      riskTier: "new",
    },
  });
}

/**
 * Submit KYC documents for merchant verification.
 */
export async function submitKycDocuments(
  db: PrismaDb,
  { storeId, businessRegNumber, beneficialOwners, bankAccount, mobileMoneyAccount, kycDocuments }: SubmitKycParams
): Promise<unknown> {
  const profile = await db.merchantProfile.findUnique({ where: { storeId } });
  if (!profile) throw new Error("Merchant profile not found.");

  if (profile.verificationStatus === "VERIFIED") {
    throw new Error("Merchant already verified.");
  }

  return db.merchantProfile.update({
    where: { storeId },
    data: {
      businessRegNumber: businessRegNumber || profile.businessRegNumber,
      beneficialOwners: beneficialOwners || profile.beneficialOwners,
      bankAccount: bankAccount || profile.bankAccount,
      mobileMoneyAccount: mobileMoneyAccount || profile.mobileMoneyAccount,
      kycDocuments: kycDocuments || profile.kycDocuments,
      verificationStatus: "PENDING_REVIEW",
    },
  });
}

/**
 * Admin action: verify or reject a merchant.
 */
export async function verifyMerchant(
  db: PrismaDb,
  { storeId, approved, adminId, rejectionReason }: VerifyParams
): Promise<unknown> {
  const profile = await db.merchantProfile.findUnique({ where: { storeId } });
  if (!profile) throw new Error("Merchant profile not found.");

  const newStatus = approved ? "VERIFIED" : "REJECTED";

  // Atomic transaction: update merchant profile + activate/deactivate store + audit log.
  await db.$transaction(async (tx: PrismaDb) => {
    await tx.merchantProfile.update({
      where: { storeId },
      data: {
        verificationStatus: newStatus,
        verifiedAt: approved ? new Date() : null,
        rejectedAt: approved ? null : new Date(),
        rejectionReason: rejectionReason || null,
        riskTier: approved ? "standard" : profile.riskTier,
        dailyLimit: approved ? RISK_TIERS.standard.dailyLimit : profile.dailyLimit,
        monthlyLimit: approved ? RISK_TIERS.standard.monthlyLimit : profile.monthlyLimit,
      },
    });

    await tx.store.update({
      where: { id: storeId },
      data: { isActive: approved, status: approved ? "approved" : "rejected" },
    });

    await appendAuditLog(tx, {
      actor: adminId || "system",
      action: approved ? "verify" : "reject",
      metadata: {
        storeId,
        newStatus,
        previousStatus: profile.verificationStatus,
        rejectionReason: rejectionReason || null,
      },
    });
  });

  return db.merchantProfile.findUnique({ where: { storeId } });
}

/**
 * Check if a merchant's transaction is within their limits.
 */
export async function checkMerchantLimits(
  db: PrismaDb,
  { merchantId, amount }: CheckLimitsParams
): Promise<LimitsResult> {
  const profile = await db.merchantProfile.findUnique({ where: { storeId: merchantId } });
  if (!profile) return { allowed: false, reason: "Merchant profile not found.", dailyRemaining: 0, monthlyRemaining: 0 };
  if (profile.verificationStatus !== "VERIFIED") {
    return { allowed: false, reason: "Merchant not yet verified.", dailyRemaining: 0, monthlyRemaining: 0 };
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailySettled = await db.pspTransaction.aggregate({
    where: {
      merchantId,
      pspStatus: { in: ["SETTLED", "CAPTURED"] },
      createdAt: { gte: dayStart },
    },
    _sum: { amount: true },
  });

  const monthlySettled = await db.pspTransaction.aggregate({
    where: {
      merchantId,
      pspStatus: { in: ["SETTLED", "CAPTURED"] },
      createdAt: { gte: monthStart },
    },
    _sum: { amount: true },
  });

  const dailyUsed = dailySettled._sum.amount || 0;
  const monthlyUsed = monthlySettled._sum.amount || 0;
  const dailyRemaining = profile.dailyLimit - dailyUsed;
  const monthlyRemaining = profile.monthlyLimit - monthlyUsed;

  if (amount > dailyRemaining) {
    return {
      allowed: false,
      reason: `Exceeds daily limit. Remaining: $${dailyRemaining.toFixed(2)}`,
      dailyRemaining,
      monthlyRemaining,
    };
  }

  if (amount > monthlyRemaining) {
    return {
      allowed: false,
      reason: `Exceeds monthly limit. Remaining: $${monthlyRemaining.toFixed(2)}`,
      dailyRemaining,
      monthlyRemaining,
    };
  }

  return { allowed: true, dailyRemaining, monthlyRemaining };
}

/**
 * Get merchant profile with limits info.
 */
export async function getMerchantProfile(
  db: PrismaDb,
  { storeId }: { storeId: string }
): Promise<unknown> {
  return db.merchantProfile.findUnique({
    where: { storeId },
    include: {
      store: {
        select: { id: true, name: true, username: true, email: true, status: true, isActive: true },
      },
    },
  });
}

/**
 * Get all merchant profiles for admin dashboard.
 */
export async function listMerchantProfiles(
  db: PrismaDb,
  { verificationStatus, limit = 50, offset = 0 }: ListParams = {}
): Promise<unknown[]> {
  const where: Record<string, unknown> = {};
  if (verificationStatus) where.verificationStatus = verificationStatus;

  return db.merchantProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      store: {
        select: { id: true, name: true, username: true, email: true },
      },
    },
  });
}
