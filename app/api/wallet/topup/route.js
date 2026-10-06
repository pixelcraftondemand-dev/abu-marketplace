// ─── AMBER PAY — Wallet Top-Up Request ───────────────────────────────────────
//
// POST /api/wallet/topup
//
// Creates a top-up request. The user specifies the amount they want to
// deposit. An agent nearby will see this request and process it (cash-in).
// This is modeled after Vult's "Agent Request" feature.
//
// Flow:
//   1. User creates top-up request with amount
//   2. System generates a short agentRef code (e.g. "A7K2M9")
//   3. User shows the code to a physical agent
//   4. Agent confirms cash received → wallet is credited

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { walletTopupRateLimiter } from "@/lib/security";
import {
  createTopUpRequest,
  InsufficientFundsError,
} from "@/lib/services/amberPayService";
import { getOrCreateWallet } from "@/lib/services/walletService";
import prisma from "@/lib/prisma";

const TOPUP_MIN = 1; // minimum top-up amount in USD
const TOPUP_MAX = 10000; // maximum top-up amount in USD

const topupSchema = z.object({
  amount: z.number().min(TOPUP_MIN).max(TOPUP_MAX),
});

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // Rate limit: 10 top-ups per minute per user
    const rl = await walletTopupRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many top-up attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter || 60) },
        }
      );
    }

    // Validate input
    let parsed;
    try {
      const body = await request.json();
      const result = topupSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          {
            error: "Invalid top-up details.",
            details: result.error.issues.map((i) => i.path.join(".")),
          },
          { status: 422 }
        );
      }
      parsed = result.data;
    } catch {
      return NextResponse.json(
        { error: "Invalid top-up details." },
        { status: 400 }
      );
    }

    // Ensure the user has a wallet (lazy creation)
    await getOrCreateWallet(prisma, userId);

    // Create a top-up request with agent reference code
    const topUpRequest = await createTopUpRequest(prisma, userId, {
      amount: parsed.amount,
    });

    return NextResponse.json({
      request: {
        id: topUpRequest.requestId,
        agentRef: topUpRequest.agentRef,
        amount: topUpRequest.amount,
        currency: topUpRequest.currency,
        status: topUpRequest.status,
      },
      message: "Take this code to an AMBER PAY agent to complete your top-up.",
    });
  } catch (error) {
    console.error("[POST /api/wallet/topup]", error);
    return NextResponse.json(
      { error: "Unable to create top-up request." },
      { status: 500 }
    );
  }
}
