import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import { z } from "zod";
import { getSafeOrigin, walletTopupRateLimiter } from "@/lib/security";
import { getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { roundMoney } from "@/lib/services/walletService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";
import { logPayment, getRequestId } from "@/lib/paymentLog";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

const topupSchema = z.object({
  // Canonical USD amount. Min $1, max $1000 per top-up.
  amount: z.number().positive().max(1000),
  idempotencyKey: z.string().regex(IDEMPOTENCY_KEY_PATTERN).optional().nullable(),
});

/**
 * Start a wallet top-up:
 *  1. Creates a Payment row (unique idempotencyKey) — same hardening as checkout.
 *  2. Creates a Stripe Checkout session with `walletTopup` metadata.
 *  3. The verified payment_intent.succeeded webhook credits the wallet exactly once.
 *
 * Retrying with the same idempotency key returns the existing session instead of
 * creating a second charge.
 */
export async function POST(request) {
  const requestId = getRequestId(request);
  let parsed;
  try {
    const body = await request.json();
    const result = topupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid top-up details." }, { status: 422 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid top-up details." }, { status: 400 });
  }

  try {
    // Top-ups move money — require a verified email server-side.
    const verifiedUser = await getVerifiedUserFromRequest();
    const userId = verifiedUser?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Please verify your email address before topping up your wallet." },
        { status: 403 }
      );
    }

    const rl = walletTopupRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    const amount = roundMoney(parsed.amount);
    if (amount < 1) {
      return NextResponse.json({ error: "Minimum top-up is $1." }, { status: 422 });
    }

    const idempotencyKey = (parsed.idempotencyKey || crypto.randomUUID()).slice(0, 128);

    // ── Idempotency: return the existing attempt instead of charging again ─────
    if (parsed.idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.userId !== userId) {
          return NextResponse.json({ error: "Idempotency key is already in use." }, { status: 403 });
        }
        if (existing.status === PAYMENT_STATES.SUCCEEDED) {
          return NextResponse.json({ alreadyProcessed: true, paymentId: existing.id });
        }
        if (existing.providerSessionUrl) {
          return NextResponse.json({ session: { url: existing.providerSessionUrl }, paymentId: existing.id, reused: true });
        }
        return NextResponse.json({ error: "Top-up already in progress.", paymentId: existing.id }, { status: 409 });
      }
    }

    // ── Create the payment attempt (DB-unique idempotency key) ────────────────
    let payment;
    try {
      payment = await prisma.payment.create({
        data: { idempotencyKey, userId, amount, currency: "USD", status: PAYMENT_STATES.PENDING },
      });
    } catch (error) {
      if (error?.code === "P2002") {
        const winner = await prisma.payment.findUnique({ where: { idempotencyKey } });
        if (winner && winner.userId === userId && winner.providerSessionUrl) {
          return NextResponse.json({ session: { url: winner.providerSessionUrl }, paymentId: winner.id, reused: true });
        }
        return NextResponse.json({ error: "Top-up already in progress." }, { status: 409 });
      }
      throw error;
    }

    // ── Create the Stripe checkout session ─────────────────────────────────────
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = getSafeOrigin(request);
    try {
      const checkoutSession = await stripe.checkout.sessions.create(
        {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: "Wallet Top-up" },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          mode: "payment",
          success_url: `${origin}/wallet?status=success`,
          cancel_url: `${origin}/wallet?status=cancelled`,
          metadata: { appId: "abu-marketplace", userId, paymentId: payment.id, walletTopup: "1" },
        },
        { idempotencyKey: `topup_${payment.id}` }
      );

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerSessionId: checkoutSession.id,
          providerSessionUrl: checkoutSession.url,
          status: PAYMENT_STATES.PROCESSING,
        },
      });

      logPayment({ event: "wallet.topup_created", paymentId: payment.id, userId, amount, currency: "USD", requestId });
      return NextResponse.json({ session: checkoutSession, paymentId: payment.id, idempotencyKey });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: PAYMENT_STATES.FAILED } });
      logPayment({ event: "wallet.topup_session_failed", paymentId: payment.id, failureCategory: "provider_error", requestId });
      return NextResponse.json({ error: "Unable to start the top-up. Please try again." }, { status: 502 });
    }
  } catch (error) {
    console.error("[POST /api/wallet/topup]", error);
    return NextResponse.json({ error: "Unable to start the top-up." }, { status: 400 });
  }
}
