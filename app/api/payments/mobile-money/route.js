import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { walletTopupRateLimiter } from "@/lib/security";
import { roundMoney } from "@/lib/services/walletService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";

const schema = z.object({
  amount: z.number().positive().max(1000),
  network: z.enum(["orange_money", "afrimoney"]),
  phoneNumber: z.string().trim().min(8).max(20),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9._-]{8,128}$/).optional().nullable(),
});

// Own the payment attempt and ledger boundary without crediting funds until a
// verified provider callback or admin reconciliation marks it successful.
export async function POST(request) {
  try {
    const verifiedUser = await getVerifiedUserFromRequest();
    if (!verifiedUser?.id) return NextResponse.json({ error: "Verify your email before funding ABU Pay." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid amount, network, and mobile-money number." }, { status: 422 });
    const rl = await walletTopupRateLimiter.check(verifiedUser.id);
    if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
    const amount = roundMoney(parsed.data.amount);
    const idempotencyKey = parsed.data.idempotencyKey || crypto.randomUUID();
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId !== verifiedUser.id) return NextResponse.json({ error: "Idempotency key is already in use." }, { status: 403 });
      return NextResponse.json({ paymentId: existing.id, status: existing.status, reused: true });
    }
    const payment = await prisma.payment.create({ data: {
      idempotencyKey, userId: verifiedUser.id, amount, currency: "USD",
      status: PAYMENT_STATES.PROCESSING, provider: "abu_pay",
      providerMetadata: { network: parsed.data.network, phoneNumber: parsed.data.phoneNumber, railStatus: "AWAITING_CONFIRMATION" },
    }});
    return NextResponse.json({ paymentId: payment.id, status: "AWAITING_CONFIRMATION", network: parsed.data.network, amount, message: "Payment intent created. Confirm the mobile-money transfer before ABU Pay credits your wallet." }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments/mobile-money]", error);
    return NextResponse.json({ error: "Unable to start the ABU Pay payment." }, { status: 400 });
  }
}
