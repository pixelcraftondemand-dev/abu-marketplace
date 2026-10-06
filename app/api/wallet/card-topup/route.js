// ─── AMBER PAY — Card Top-Up ──────────────────────────────────────────────────
//
// POST /api/wallet/card-topup
//
// Process a prepaid or debit card top-up for wallet funding.
// Card details are validated and tokenized — only last 4 digits are stored.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { walletTopupRateLimiter } from "@/lib/security";
import { processCardPayment } from "@/lib/services/cardPaymentService";

const cardSchema = z.object({
  number: z.string().min(13).max(19).regex(/^\d+$/, "Card number must be digits only"),
  expiry: z.string().regex(/^\d{2}\/\d{2,4}$/, "Expiry must be MM/YY or MM/YYYY"),
  cvv: z.string().min(3).max(4).regex(/^\d+$/, "CVV must be digits only"),
  name: z.string().min(1).max(100),
  type: z.enum(["prepaid", "debit", "credit"]).optional().default("debit"),
});

const bodySchema = z.object({
  amount: z.number().min(1).max(10000),
  card: cardSchema,
});

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    // Rate limiting
    const rl = await walletTopupRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    // Parse and validate body
    let parsed;
    try {
      const body = await request.json();
      const result = bodySchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid card details", details: result.error.flatten() },
          { status: 422 }
        );
      }
      parsed = result.data;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Process card payment
    const result = await processCardPayment(userId, parsed.card, parsed.amount);

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      amount: result.amount,
      cardLast4: result.cardLast4,
      cardBrand: result.cardBrand,
      authorizationCode: result.authorizationCode,
      newBalance: result.newBalance,
      message: `$${result.amount.toFixed(2)} added to your wallet via ${result.cardBrand} ****${result.cardLast4}`,
    });
  } catch (error) {
    console.error("[POST /api/wallet/card-topup]", error);

    // Handle specific errors
    if (error.message === "Invalid card number" || error.message === "Invalid or expired card" || error.message === "Invalid CVV") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error.message === "Wallet not active") {
      return NextResponse.json({ error: "Wallet not active" }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to process card payment" }, { status: 500 });
  }
}
