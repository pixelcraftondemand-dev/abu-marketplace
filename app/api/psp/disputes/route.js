import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import {
  openDispute,
  resolveDisputeForBuyer,
  resolveDisputeForSeller,
  getDisputes,
} from "@/lib/services/dispute";

// ─── GET /api/psp/disputes ──────────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const disputes = await getDisputes(prisma, { status, limit, offset });

    // Non-admin users can only see their own disputes
    const filtered = isAdmin ? disputes : disputes.filter((d) => d.userId === userId);

    return NextResponse.json({ disputes: filtered, total: filtered.length });
  } catch (error) {
    console.error("[GET /api/psp/disputes]", error);
    return NextResponse.json({ error: "Unable to fetch disputes." }, { status: 500 });
  }
}

// ─── POST /api/psp/disputes ──────────────────────────────────────────────────

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

    if (action === "resolve_buyer") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
      return handleResolveForBuyer(body, userId);
    }

    if (action === "resolve_seller") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
      return handleResolveForSeller(body, userId);
    }

    // Default: open a new dispute
    return handleOpenDispute(body, userId, request);
  } catch (error) {
    console.error("[POST /api/psp/disputes]", error);
    return NextResponse.json({ error: "Unable to process dispute." }, { status: 500 });
  }
}

async function handleOpenDispute(body, userId, request) {
  const schema = z.object({
    pspTransactionId: z.string().min(1).max(100),
    reason: z.string().min(10).max(1000),
    amount: z.number().positive().max(10_000_000).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispute request.", details: parsed.error.issues }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const dispute = await openDispute(prisma, {
      pspTransactionId: parsed.data.pspTransactionId,
      userId,
      reason: parsed.data.reason,
      amount: parsed.data.amount,
      ipAddress: ip,
    });
    return NextResponse.json({ dispute });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleResolveForBuyer(body, adminId) {
  const schema = z.object({
    disputeId: z.string().min(1).max(100),
    resolution: z.string().min(5).max(500),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resolution request." }, { status: 422 });
  }

  try {
    const dispute = await resolveDisputeForBuyer(prisma, {
      disputeId: parsed.data.disputeId,
      resolution: parsed.data.resolution,
      adminId,
    });
    return NextResponse.json({ dispute });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

async function handleResolveForSeller(body, adminId) {
  const schema = z.object({
    disputeId: z.string().min(1).max(100),
    resolution: z.string().min(5).max(500),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resolution request." }, { status: 422 });
  }

  try {
    const dispute = await resolveDisputeForSeller(prisma, {
      disputeId: parsed.data.disputeId,
      resolution: parsed.data.resolution,
      adminId,
    });
    return NextResponse.json({ dispute });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}
