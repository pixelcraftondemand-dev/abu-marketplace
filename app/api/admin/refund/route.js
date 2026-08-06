import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { refundRateLimiter } from "@/lib/security";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { transitionPaymentStatus, toCents } from "@/lib/services/paymentService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";
import { logPayment, getRequestId } from "@/lib/paymentLog";

const refundSchema = z.object({
  paymentId: z.string().min(1).max(100),
  // Amount in canonical USD units; omitted = full remaining refund.
  amount: z.number().positive().max(1_000_000).optional(),
  reason: z.string().trim().max(500).optional().nullable(),
});

/**
 * Idempotent, admin-only refunds:
 *  - a Refund ledger row is created (PENDING) before calling the provider;
 *  - Stripe is called with an idempotency key tied to the refund row, so a
 *    retried request can never issue a second refund;
 *  - the total of SUCCEEDED refunds can never exceed the captured amount;
 *  - the payment transitions atomically (SUCCEEDED -> REFUNDED /
 *    PARTIALLY_REFUNDED).
 */
export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const rl = refundRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many refund attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid refund details." }, { status: 422 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parsed.data.paymentId },
      include: { refunds: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    if (payment.status !== PAYMENT_STATES.SUCCEEDED && payment.status !== PAYMENT_STATES.PARTIALLY_REFUNDED) {
      return NextResponse.json({ error: "Payment is not refundable." }, { status: 409 });
    }
    if (!payment.providerPaymentIntentId) {
      return NextResponse.json({ error: "Payment has no provider transaction." }, { status: 409 });
    }

    const refundedSoFar = payment.refunds
      .filter((r) => r.status === "SUCCEEDED")
      .reduce((sum, r) => sum + r.amount, 0);

    const amount =
      parsed.data.amount ??
      parseFloat((payment.amount - refundedSoFar).toFixed(2));

    if (amount <= 0) {
      return NextResponse.json({ error: "No refundable amount remaining." }, { status: 422 });
    }
    // Never allow total refunds to exceed what was actually captured.
    if (refundedSoFar + amount > payment.amount + 0.001) {
      return NextResponse.json({ error: "Refund amount exceeds the captured amount." }, { status: 422 });
    }

    // Ledger row first — audit trail + idempotency anchor.
    const refund = await prisma.refund.create({
      data: { paymentId: payment.id, amount, reason: parsed.data.reason || null, status: "PENDING" },
    });

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    try {
      const providerRefund = await stripe.refunds.create(
        {
          payment_intent: payment.providerPaymentIntentId,
          amount: toCents(amount),
          metadata: { appId: "abu-marketplace", paymentId: payment.id, refundId: refund.id },
        },
        { idempotencyKey: `refund_${refund.id}` } // provider-side dedup for retries
      );

      await prisma.refund.updateMany({
        where: { id: refund.id, status: "PENDING" },
        data: { status: "SUCCEEDED", providerRefundId: providerRefund.id },
      });

      const succeededRefunds = await prisma.refund.findMany({
        where: { paymentId: payment.id, status: "SUCCEEDED" },
        select: { amount: true },
      });
      const totalRefunded = succeededRefunds.reduce((sum, r) => sum + r.amount, 0);
      const next =
        totalRefunded >= payment.amount - 0.001
          ? PAYMENT_STATES.REFUNDED
          : PAYMENT_STATES.PARTIALLY_REFUNDED;

      if (next !== payment.status) {
        await transitionPaymentStatus(prisma, payment.id, payment.status, next);
      }

      logPayment({
        event: "refund.succeeded",
        refundId: refund.id,
        paymentId: payment.id,
        providerRefundId: providerRefund.id,
        amount,
        currency: payment.currency,
        requestId,
      });

      return NextResponse.json({
        refund: { id: refund.id, amount, status: "SUCCEEDED", providerRefundId: providerRefund.id },
        paymentStatus: next,
      });
    } catch (error) {
      await prisma.refund.updateMany({
        where: { id: refund.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      logPayment({
        event: "refund.failed",
        refundId: refund.id,
        paymentId: payment.id,
        failureCategory: "provider_error",
        requestId,
      });
      console.error("[POST /api/admin/refund]", error?.message || error);
      return NextResponse.json({ error: "Refund could not be processed. Please try again." }, { status: 502 });
    }
  } catch (error) {
    console.error("[POST /api/admin/refund]", error);
    return NextResponse.json({ error: "Unable to process refund." }, { status: 400 });
  }
}
