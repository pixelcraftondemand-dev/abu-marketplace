import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import {
  createSettlementBatch,
  markSettlementSent,
  confirmSettlement,
  failSettlement,
  getMerchantSettlements,
} from "@/lib/services/settlement";
import { checkSettlementExists } from "@/lib/services/abuseDetection";

// ─── GET /api/psp/settlement ────────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    if (!isAdmin && !merchantId) {
      // Non-admin users see their own store's settlements
      const store = await prisma.store.findUnique({ where: { userId }, select: { id: true } });
      if (!store) {
        return NextResponse.json({ settlements: [], total: 0 });
      }
      const settlements = await getMerchantSettlements(prisma, { merchantId: store.id, status, limit });
      return NextResponse.json({ settlements, total: settlements.length });
    }

    const targetMerchantId = isAdmin ? (merchantId || undefined) : merchantId;
    const settlements = await getMerchantSettlements(prisma, { merchantId: targetMerchantId, status, limit });
    return NextResponse.json({ settlements, total: settlements.length });
  } catch (error) {
    console.error("[GET /api/psp/settlement]", error);
    return NextResponse.json({ error: "Unable to fetch settlements." }, { status: 500 });
  }
}

// ─── POST /api/psp/settlement ────────────────────────────────────────────────

export async function POST(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "confirm") {
      return handleConfirm(body);
    }
    if (action === "retry") {
      return handleRetry(body);
    }
    if (action === "mark_sent") {
      return handleMarkSent(body);
    }

    // Default: create a settlement batch
    return handleCreateBatch(body);
  } catch (error) {
    console.error("[POST /api/psp/settlement]", error);
    return NextResponse.json({ error: "Unable to process settlement." }, { status: 500 });
  }
}

async function handleCreateBatch(body) {
  const schema = z.object({
    merchantId: z.string().min(1).max(100),
    feeRate: z.number().min(0).max(0.5).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settlement request.", details: parsed.error.issues }, { status: 422 });
  }

  const { merchantId, feeRate } = parsed.data;

  // Double-claim guard: check if a batch already exists for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const exists = await checkSettlementExists(prisma, {
    merchantId,
    periodStart: todayStart,
    periodEnd: todayEnd,
  });

  if (exists.exists) {
    return NextResponse.json({
      error: "Settlement batch already exists for today.",
      existingBatchId: exists.existingBatchId,
      existingStatus: exists.existingStatus,
    }, { status: 409 });
  }

  const batch = await createSettlementBatch(prisma, { merchantId, feeRate });
  if (!batch) {
    return NextResponse.json({ message: "No unsettled transactions for this merchant." });
  }

  return NextResponse.json({ batch });
}

async function handleConfirm(body) {
  const schema = z.object({ batchId: z.string().min(1).max(100) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid confirm request." }, { status: 422 });
  }

  try {
    const batch = await confirmSettlement(prisma, { batchId: parsed.data.batchId });
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleRetry(body) {
  const schema = z.object({
    batchId: z.string().min(1).max(100),
    reason: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retry request." }, { status: 422 });
  }

  const batch = await failSettlement(prisma, {
    batchId: parsed.data.batchId,
    reason: parsed.data.reason || "Retried by admin",
  });

  return NextResponse.json({ batch });
}

async function handleMarkSent(body) {
  const schema = z.object({
    batchId: z.string().min(1).max(100),
    payoutRef: z.string().min(1).max(200),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mark_sent request." }, { status: 422 });
  }

  try {
    const batch = await markSettlementSent(prisma, {
      batchId: parsed.data.batchId,
      payoutRef: parsed.data.payoutRef,
    });
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}
