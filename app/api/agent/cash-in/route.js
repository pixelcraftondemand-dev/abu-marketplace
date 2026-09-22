// ─── AMBER PAY — Agent Cash-In ────────────────────────────────────────────────
//
// POST /api/agent/cash-in
//
// An agent processes a user's top-up request. The agent confirms they received
// cash from the user, and the user's wallet is credited instantly.
//
// Flow:
//   1. User shows agentRef code (e.g. "A7K2M9")
//   2. Agent looks up the top-up request
//   3. Agent confirms cash received
//   4. User's wallet is credited

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { agentProcessTopUp } from "@/lib/services/amberPayService";
import prisma from "@/lib/prisma";

const cashInSchema = z.object({
  agentRef: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  notes: z.string().max(200).optional().nullable(),
});

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // Verify the user is an active agent
    const agent = await prisma.agent.findUnique({
      where: { userId },
      select: { id: true, status: true, businessName: true },
    });

    if (!agent || agent.status !== "active") {
      return NextResponse.json(
        { error: "You are not an active AMBER PAY agent." },
        { status: 403 }
      );
    }

    // Validate input
    let parsed;
    try {
      const body = await request.json();
      const result = cashInSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid cash-in details.", details: result.error.issues.map((i) => i.path.join(".")) },
          { status: 422 }
        );
      }
      parsed = result.data;
    } catch {
      return NextResponse.json({ error: "Invalid cash-in details." }, { status: 400 });
    }

    // Find the top-up request by agentRef
    const topUpRequest = await prisma.topUpRequest.findFirst({
      where: { agentRef: parsed.agentRef },
      select: { id: true, status: true, amount: true },
    });

    if (!topUpRequest) {
      return NextResponse.json(
        { error: "No top-up request found with that reference code." },
        { status: 404 }
      );
    }

    if (topUpRequest.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${topUpRequest.status}.` },
        { status: 409 }
      );
    }

    // Process the cash-in
    const result = await agentProcessTopUp(prisma, agent.id, topUpRequest.id, {
      notes: parsed.notes,
    });

    return NextResponse.json({
      cashIn: {
        requestId: result.requestId,
        amount: result.amount,
        walletBalance: result.walletBalance,
        agent: agent.businessName,
      },
      message: `Successfully credited $${result.amount.toFixed(2)} to the user's wallet.`,
    });
  } catch (error) {
    console.error("[POST /api/agent/cash-in]", error);
    return NextResponse.json(
      { error: "Unable to process cash-in." },
      { status: 500 }
    );
  }
}
