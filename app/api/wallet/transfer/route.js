// ─── AMBER PAY — P2P Transfer ─────────────────────────────────────────────────
//
// POST /api/wallet/transfer
//
// Send money from the caller's wallet to another AMBER PAY user.
// Instant wallet-to-wallet transfer, like Vult's P2P feature.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { checkoutRateLimiter } from "@/lib/security";
import {
  sendP2P,
  InsufficientFundsError,
  MIN_P2P_TRANSFER,
  MAX_P2P_TRANSFER,
} from "@/lib/services/amberPayService";

const transferSchema = z.object({
  recipientEmail: z.string().email().max(254),
  amount: z.number().min(MIN_P2P_TRANSFER).max(MAX_P2P_TRANSFER),
  description: z.string().max(200).optional().nullable(),
});

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // Rate limit
    const rl = await checkoutRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many transfer attempts. Please wait." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    // Validate input
    let parsed;
    try {
      const body = await request.json();
      const result = transferSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid transfer details.", details: result.error.issues.map((i) => i.path.join(".")) },
          { status: 422 }
        );
      }
      parsed = result.data;
    } catch {
      return NextResponse.json({ error: "Invalid transfer details." }, { status: 400 });
    }

    // Find recipient by email
    const prisma = (await import("@/lib/prisma")).default;
    const recipient = await prisma.user.findFirst({
      where: { email: parsed.recipientEmail.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "No AMBER PAY user found with that email." },
        { status: 404 }
      );
    }

    if (recipient.id === userId) {
      return NextResponse.json(
        { error: "You cannot send money to yourself." },
        { status: 422 }
      );
    }

    // Execute the P2P transfer
    const result = await sendP2P(prisma, userId, recipient.id, parsed.amount, {
      description: parsed.description,
    });

    return NextResponse.json({
      transfer: {
        id: result.transferId,
        amount: result.amount,
        fee: result.fee,
        netAmount: result.netAmount,
        recipient: { name: recipient.name, email: recipient.email },
        senderBalance: result.senderBalance,
      },
      message: `Successfully sent $${result.netAmount.toFixed(2)} to ${recipient.name}.`,
    });
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        { error: "Insufficient wallet balance.", balance: error.balance, requested: error.requested },
        { status: 422 }
      );
    }
    console.error("[POST /api/wallet/transfer]", error);
    return NextResponse.json(
      { error: "Unable to complete transfer." },
      { status: 500 }
    );
  }
}
