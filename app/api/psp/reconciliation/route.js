import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import {
  runReconciliation,
  getReconciliationHistory,
} from "@/lib/services/reconciliation";

// ─── GET /api/psp/reconciliation ────────────────────────────────────────────

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

    const history = await getReconciliationHistory(prisma, { limit });
    return NextResponse.json({ history });
  } catch (error) {
    console.error("[GET /api/psp/reconciliation]", error);
    return NextResponse.json({ error: "Unable to fetch reconciliation history." }, { status: 500 });
  }
}

// ─── POST /api/psp/reconciliation — Run reconciliation job ───────────────────

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
    const schema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reconciliation request." }, { status: 422 });
    }

    // Default: last 24 hours
    const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
    const from = parsed.data.from
      ? new Date(parsed.data.from)
      : new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const result = await runReconciliation(prisma, { from, to });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/psp/reconciliation]", error);
    return NextResponse.json({ error: "Reconciliation job failed." }, { status: 500 });
  }
}
