import prisma from "@/lib/prisma";
import { isValidId, webhookRateLimiter } from "@/lib/security";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { transitionPaymentStatus, releaseStock, toCents } from "@/lib/services/paymentService";
import { creditWallet } from "@/lib/services/walletService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";
import { logPayment, getRequestId, hashIp } from "@/lib/paymentLog";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const requestId = getRequestId(request);
  let event = null;
  try {
    // Generous limit — providers legitimately retry; signature is the real gate.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = webhookRateLimiter.check(hashIp(ip));
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const stripe = getStripe();
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    // ── Replay/deduplication gate ─────────────────────────────────────────────
    // The unique providerEventId means the same webhook can only be processed
    // once — repeated deliveries are a safe no-op. If processing fails below,
    // the record is rolled back so the provider's retry can reprocess.
    try {
      await prisma.webhookEvent.create({
        data: { provider: "stripe", providerEventId: event.id, type: event.type },
      });
    } catch (error) {
      if (error?.code === "P2002") {
        logPayment({ event: "webhook.duplicate", eventId: event.id, requestId });
        return NextResponse.json({ received: true });
      }
      throw error;
    }

    try {
      await handleEvent(stripe, event, requestId);
    } catch (error) {
      await prisma.webhookEvent.deleteMany({ where: { providerEventId: event.id } });
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe webhook]", error?.message || error);
    logPayment({
      event: "webhook.invalid",
      eventId: event?.id,
      failureCategory: error?.code === "P2002" ? "duplicate" : "invalid_payload",
      requestId,
    });
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}

async function handleEvent(stripe, event, requestId) {
  switch (event.type) {
    case "payment_intent.succeeded":
      await handleSucceeded(stripe, event, requestId);
      break;
    case "payment_intent.payment_failed":
      await handleFailure(stripe, event, PAYMENT_STATES.FAILED, requestId);
      break;
    case "payment_intent.canceled":
      await handleFailure(stripe, event, PAYMENT_STATES.CANCELLED, requestId);
      break;
    case "checkout.session.completed":
      await handleMembershipCheckoutCompleted(event, requestId);
      break;
    case "checkout.session.expired":
      await handleSessionExpired(event.data.object.id, requestId);
      break;
    default:
      // Unhandled types are acknowledged but not processed.
      break;
  }
}

async function handleMembershipCheckoutCompleted(event) {
  const session = event?.data?.object;
  const metadata = session?.metadata || {};
  const { appId, userId, tierId, subscriptionType } = metadata;

  if (appId !== "abu-marketplace" || !isValidId(userId) || !tierId || subscriptionType !== "membership") {
    return;
  }

  const paymentStatus = session?.payment_status;
  if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      membershipTier: tierId,
      membershipStatus: "active",
      membershipProviderId: session?.subscription || null,
      membershipStartedAt: new Date(),
      membershipEndsAt: null,
    },
  });
}

/**
 * Loads a payment + its orders from verified webhook metadata. Returns null if
 * anything does not line up (wrong app, invalid ids, unknown payment).
 */
async function loadPaymentFromMetadata(metadata) {
  const { orderIds, userId, appId, paymentId } = metadata || {};
  if (appId !== "abu-marketplace" || !isValidId(userId) || !isValidId(paymentId) || !orderIds) {
    return null;
  }
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment || payment.orders.length === 0) return null;

  // Cross-check the metadata order list against the orders tied to the payment.
  const metadataOrderIds = orderIds.split(",").filter(isValidId).sort();
  const dbOrderIds = payment.orders.map((o) => o.id).sort();
  if (metadataOrderIds.length !== dbOrderIds.length || metadataOrderIds.join() !== dbOrderIds.join()) {
    return null;
  }
  return payment;
}

/**
 * payment_intent.succeeded — the only path that marks money as received.
 * Verifies amount + currency against the provider and canonical DB totals
 * before any state change, and applies the transition atomically so duplicate
 * deliveries can never double-process.
 */
async function handleSucceeded(stripe, event, requestId) {
  const intentId = event.data.object.id;
  // 1) Verify with the provider directly — never trust the webhook body alone.
  const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
  if (paymentIntent.status !== "succeeded") {
    logPayment({ event: "webhook.intent_not_succeeded", eventId: event.id, providerTransactionId: intentId, requestId, failureCategory: "provider_status" });
    return;
  }

  const session = await stripe.checkout.sessions.list({ payment_intent: intentId });
  const metadata = session.data[0]?.metadata || {};
  const { orderIds, userId, appId, paymentId, walletTopup } = metadata;
  if (appId !== "abu-marketplace" || !isValidId(userId) || !isValidId(paymentId)) {
    logPayment({ event: "webhook.payment_not_found", eventId: event.id, providerTransactionId: intentId, requestId, failureCategory: "mismatch" });
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment) {
    logPayment({ event: "webhook.payment_not_found", eventId: event.id, providerTransactionId: intentId, requestId, failureCategory: "mismatch" });
    return;
  }

  // 2) Amount + currency verification: expected = canonical amount from the DB.
  const expectedCents = toCents(payment.amount);
  if (paymentIntent.currency !== "usd" || paymentIntent.amount_received !== expectedCents) {
    logPayment({
      event: "webhook.amount_mismatch",
      eventId: event.id,
      paymentId: payment.id,
      providerTransactionId: intentId,
      currency: paymentIntent.currency,
      amount: paymentIntent.amount_received,
      expectedCents,
      failureCategory: "amount_mismatch",
      requestId,
    });
    // Do NOT mark paid / credit — the record stays PENDING for reconciliation.
    return;
  }

  // ── Wallet top-up branch ────────────────────────────────────────────────────
  if (walletTopup === "1") {
    if (payment.status === PAYMENT_STATES.SUCCEEDED) {
      // Retry after a partial failure — repair the credit if it never landed.
      await ensureTopupCredited(payment, requestId);
      return;
    }
    const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.SUCCEEDED);
    if (!transition.applied) return; // another delivery won — it credits
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransactionId: intentId, providerPaymentIntentId: intentId },
    });
    await ensureTopupCredited(payment, requestId);
    logPayment({
      event: "webhook.wallet_topup",
      eventId: event.id,
      paymentId: payment.id,
      providerTransactionId: intentId,
      previousState: payment.status,
      newState: PAYMENT_STATES.SUCCEEDED,
      currency: "USD",
      amount: payment.amount,
      requestId,
    });
    return;
  }

  // ── Order branch ────────────────────────────────────────────────────────────
  if (payment.orders.length === 0) {
    logPayment({ event: "webhook.payment_not_found", eventId: event.id, paymentId: payment.id, requestId, failureCategory: "mismatch" });
    return;
  }
  const metadataOrderIds = (orderIds || "").split(",").filter(isValidId).sort();
  const dbOrderIds = payment.orders.map((o) => o.id).sort();
  if (metadataOrderIds.length !== dbOrderIds.length || metadataOrderIds.join() !== dbOrderIds.join()) {
    logPayment({ event: "webhook.order_mismatch", eventId: event.id, paymentId: payment.id, requestId, failureCategory: "mismatch" });
    return;
  }

  // Only a payment still awaiting success may transition here. Any terminal
  // state (FAILED/CANCELLED/EXPIRED) means the order was never payable — log
  // and no-op rather than throwing on an invalid transition (which would make
  // the provider retry forever).
  if (![PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status)) {
    logPayment({ event: "webhook.ignored_state", eventId: event.id, paymentId: payment.id, previousState: payment.status, requestId });
    return;
  }

  // 3) Atomic state transition — only one delivery can apply this.
  const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.SUCCEEDED);
  if (!transition.applied) {
    return; // another delivery won the race — safe no-op
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerTransactionId: intentId, providerPaymentIntentId: intentId },
  });

  // 4) Once-only side effects (guarded by the transition above).
  await prisma.order.updateMany({
    where: { paymentId: payment.id, isPaid: false },
    data: { isPaid: true, paymentStatus: PAYMENT_STATES.SUCCEEDED },
  });
  await prisma.user.update({ where: { id: payment.userId }, data: { cart: {} } });

  logPayment({
    event: "webhook.payment_succeeded",
    eventId: event.id,
    paymentId: payment.id,
    orderIds: payment.orders.map((o) => o.id),
    providerTransactionId: intentId,
    previousState: payment.status,
    newState: PAYMENT_STATES.SUCCEEDED,
    currency: "USD",
    amount: payment.amount,
    requestId,
  });

  // Best-effort — never fail the webhook acknowledgment on email errors.
  await sendOrderConfirmation(payment.userId, payment.orders.map((o) => o.id)).catch((error) => {
    console.error("[Stripe webhook] Order confirmation email failed:", error);
  });
}

/**
 * Credit the wallet for a verified top-up exactly once. The ledger row is the
 * atomic gate (unique payment reference), so duplicate deliveries and retries
 * after partial failures can never double-credit.
 */
async function ensureTopupCredited(payment, requestId) {
  await creditWallet(prisma, payment.userId, payment.amount, {
    referenceId: payment.id,
    referenceType: "payment",
    description: "Wallet top-up",
  });
  logPayment({ event: "webhook.wallet_credit", paymentId: payment.id, userId: payment.userId, amount: payment.amount, currency: "USD", requestId });
}

/**
 * payment_failed / payment_intent.canceled — transition the payment, release
 * reserved inventory (once — increments are idempotent), and mark orders.
 */
async function handleFailure(stripe, event, targetStatus, requestId) {
  const intentId = event.data.object.id;
  // Verify the intent against the provider (it is the source of truth).
  await stripe.paymentIntents.retrieve(intentId);
  const session = await stripe.checkout.sessions.list({ payment_intent: intentId });
  const metadata = session.data[0]?.metadata || {};
  const payment = await loadPaymentFromMetadata(metadata);
  if (!payment) return;

  // Only in-flight payments may fail/cancel; terminal states are left alone
  // (no invalid-transition throw, no infinite provider retry).
  if (![PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status)) return;
  if (payment.status === targetStatus) return;

  const previousState = payment.status;
  const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, targetStatus);
  if (!transition.applied) return;

  await releaseStock(
    prisma,
    payment.orders.flatMap((o) => o.orderItems)
  );
  await prisma.order.updateMany({ where: { paymentId: payment.id }, data: { paymentStatus: targetStatus } });

  logPayment({
    event: "webhook.payment_failed",
    eventId: event.id,
    paymentId: payment.id,
    providerTransactionId: intentId,
    previousState,
    newState: targetStatus,
    failureCategory: targetStatus === PAYMENT_STATES.FAILED ? "payment_failed" : "canceled",
    requestId,
  });
}

/** checkout.session.expired — release inventory and mark EXPIRED. */
async function handleSessionExpired(sessionId, requestId) {
  const payment = await prisma.payment.findFirst({
    where: { providerSessionId: sessionId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment) return;
  if (![PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status)) return;

  const previousState = payment.status;
  const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.EXPIRED);
  if (!transition.applied) return;

  await releaseStock(
    prisma,
    payment.orders.flatMap((o) => o.orderItems)
  );
  await prisma.order.updateMany({ where: { paymentId: payment.id }, data: { paymentStatus: PAYMENT_STATES.EXPIRED } });

  logPayment({
    event: "webhook.session_expired",
    eventId: null,
    paymentId: payment.id,
    previousState,
    newState: PAYMENT_STATES.EXPIRED,
    requestId,
  });
}
