import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { paymentStatusRateLimiter } from "@/lib/security";
import { NextResponse } from "next/server";
import { z } from "zod";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

const querySchema = z
  .object({
    idempotencyKey: z.string().regex(IDEMPOTENCY_KEY_PATTERN).optional(),
    paymentId: z.string().min(1).max(100).optional(),
  })
  .refine((v) => v.idempotencyKey || v.paymentId, {
    message: "Provide either idempotencyKey or paymentId.",
  });

/**
 * Safe mechanism for retrieving the current payment state after an ambiguous
 * timeout. Ownership is enforced server-side (the payment must belong to the
 * caller), so a customer can never read or pay someone else's attempt.
 */
export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const rl = paymentStatusRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      idempotencyKey: searchParams.get("idempotencyKey") || undefined,
      paymentId: searchParams.get("paymentId") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status query." }, { status: 422 });
    }

    const where = parsed.data.paymentId
      ? { id: parsed.data.paymentId, userId }
      : { idempotencyKey: parsed.data.idempotencyKey, userId };

    const payment = await prisma.payment.findFirst({
      where,
      select: {
        id: true,
        idempotencyKey: true,
        status: true,
        amount: true,
        currency: true,
        providerSessionUrl: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "No payment attempt found for this key." }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[GET /api/payments/status]", error);
    return NextResponse.json({ error: "Unable to check payment status." }, { status: 400 });
  }
}
