import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import {
  createMerchantProfile,
  submitKycDocuments,
  verifyMerchant,
  checkMerchantLimits,
  getMerchantProfile,
  listMerchantProfiles,
} from "@/lib/services/merchantOnboarding";

// ─── GET /api/psp/merchant ──────────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const verificationStatus = searchParams.get("verificationStatus");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    if (isAdmin && !storeId) {
      // Admin: list all merchants
      const merchants = await listMerchantProfiles(prisma, { verificationStatus, limit, offset });
      return NextResponse.json({ merchants, total: merchants.length });
    }

    // Non-admin: get own merchant profile
    const store = await prisma.store.findUnique({ where: { userId }, select: { id: true } });
    if (!store) {
      return NextResponse.json({ error: "No store found." }, { status: 404 });
    }

    const profile = await getMerchantProfile(prisma, { storeId: storeId || store.id });
    if (!profile) {
      return NextResponse.json({ error: "Merchant profile not found." }, { status: 404 });
    }

    return NextResponse.json({ merchant: profile });
  } catch (error) {
    console.error("[GET /api/psp/merchant]", error);
    return NextResponse.json({ error: "Unable to fetch merchant data." }, { status: 500 });
  }
}

// ─── POST /api/psp/merchant ──────────────────────────────────────────────────

export async function POST(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    const body = await request.json();
    const { action } = body;

    if (action === "verify") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
      return handleVerify(body, userId);
    }

    if (action === "submit_kyc") {
      return handleSubmitKyc(body, userId);
    }

    if (action === "check_limits") {
      return handleCheckLimits(body, userId);
    }

    // Default: create merchant profile
    return handleCreateProfile(body, userId);
  } catch (error) {
    console.error("[POST /api/psp/merchant]", error);
    return NextResponse.json({ error: "Unable to process merchant request." }, { status: 500 });
  }
}

async function handleCreateProfile(body, userId) {
  // Find the user's store
  const store = await prisma.store.findUnique({ where: { userId }, select: { id: true } });
  if (!store) {
    return NextResponse.json({ error: "You must create a store first." }, { status: 404 });
  }

  try {
    const profile = await createMerchantProfile(prisma, { storeId: store.id });
    return NextResponse.json({ merchant: profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleSubmitKyc(body, userId) {
  const schema = z.object({
    storeId: z.string().min(1).max(100).optional(),
    businessRegNumber: z.string().max(100).optional(),
    beneficialOwners: z.array(z.object({
      name: z.string(),
      id: z.string(),
      ownership: z.number().min(0).max(100),
    })).optional(),
    bankAccount: z.object({
      type: z.enum(["bank", "mobile"]),
      accountNumber: z.string(),
      bank: z.string().optional(),
      provider: z.string().optional(),
    }).optional(),
    mobileMoneyAccount: z.object({
      provider: z.string(),
      number: z.string(),
    }).optional(),
    kycDocuments: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid KYC submission.", details: parsed.error.issues }, { status: 422 });
  }

  const storeId = parsed.data.storeId || (await prisma.store.findUnique({ where: { userId }, select: { id: true } }))?.id;
  if (!storeId) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  try {
    const profile = await submitKycDocuments(prisma, { storeId, ...parsed.data });
    return NextResponse.json({ merchant: profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleVerify(body, adminId) {
  const schema = z.object({
    storeId: z.string().min(1).max(100),
    approved: z.boolean(),
    rejectionReason: z.string().max(500).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification request." }, { status: 422 });
  }

  try {
    const profile = await verifyMerchant(prisma, {
      storeId: parsed.data.storeId,
      approved: parsed.data.approved,
      adminId,
      rejectionReason: parsed.data.rejectionReason,
    });
    return NextResponse.json({ merchant: profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleCheckLimits(body, userId) {
  const schema = z.object({
    merchantId: z.string().min(1).max(100),
    amount: z.number().positive(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid limits check." }, { status: 422 });
  }

  const result = await checkMerchantLimits(prisma, {
    merchantId: parsed.data.merchantId,
    amount: parsed.data.amount,
  });

  return NextResponse.json(result);
}
