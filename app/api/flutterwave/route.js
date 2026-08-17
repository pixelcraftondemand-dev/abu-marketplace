import prisma from "@/lib/prisma";
import { isValidId, webhookRateLimiter } from "@/lib/security";
import { NextResponse } from "next/server";
import { verifyTransaction, verifyWebhookSignature } from "@/lib/services/flutterwave";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { transitionPaymentStatus, releaseStock } from "@/lib/services/paymentService";
import { creditWallet } from "@/lib/services/walletService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";
import { logPayment, getRequestId, hashIp } from "@/lib/paymentLog";

const APP_ID = "abu-marketplace";

export async function POST(request) {
  const requestId = getRequestId(request);
  let payload = null;
  try {
    // Generous limit — providers legitimately retry; verif-hash is the real gate.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await webhookRateLimiter.check(hashIp(ip));
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Flutterwave sends the dashboard-configured secret hash in the
    // verif-hash header — reject missing/mismatched requests outright.
    if (!verifyWebhookSignature(request.headers)) {
      logPayment({ event: "webhook.invalid_signature", requestId, failureCategory: "invalid_payload" });
      return NextResponse.json({ error: "Invalid verif-hash header" }, { status: 400 });
    }

    payload = await request.json();
    const eventType = payload?.event;
    const data = payload?.data || {};
    if (!eventType || !data?.id) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // ── Replay/deduplication gate ─────────────────────────────────────────────
    // providerEventId = event type + transaction id, so the same delivery is a
    // safe no-op. If processing fails below, the record is rolled back so the
    // provider's retry can reprocess.
    const providerEventId = `${eventType}:${data.id}`;
    try {
      await prisma.webhookEvent.create({
        data: { provider: "flutterwave", providerEventId, type: eventType },
      });
    } catch (error) {
      if (error?.code === "P2002") {
        logPayment({ event: "webhook.duplicate", eventId: providerEventId, requestId });
        return NextResponse.json({ received: true });
      }
      throw error;
    }

    try {
      await handleEvent(payload, requestId);
    } catch (error) {
      await prisma.webhookEvent.deleteMany({ where: { providerEventId } });
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Flutterwave webhook]", error?.message || error);
    logPayment({
      event: "webhook.invalid",
      eventId: payload?.data?.id ? `${payload.event}:${payload.data.id}` : null,
      failureCategory: "invalid_payload",
      requestId,
    });
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}

async function handleEvent(payload, requestId) {
  const data = payload.data || {};
  const status = data.status;

  // Failed/cancelled — transition the payment and release reserved inventory.
  if (status === "failed") {
    await handleFailure(data, PAYMENT_STATES.FAILED, requestId);
    return;
  }
  if (status === "cancelled") {
    await handleFailure(data, PAYMENT_STATES.CANCELLED, requestId);
    return;
  }

  // charge.completed is the only success signal we act on.
  if (payload.event !== "charge.completed" || status !== "successful") return;

  // Re-verify with the provider — never trust the webhook body alone.
  const tx = await verifyTransaction(data.id);
  if (tx.status !== "successful") return;

  const meta = tx.meta || {};
  if (meta.appId !== APP_ID) return;

  if (meta.subscriptionType === "membership") {
    await grantMembership(tx, meta, requestId);
    return;
  }
  if (meta.walletTopup === "1") {
    await handleTopupSucceeded(tx, meta, requestId);
    return;
  }
  await handleOrderSucceeded(tx, meta, requestId);
}

/** Provider amount/currency must match the canonical DB amount. */
function amountMatches(tx, payment) {
  return tx.currency === "USD" && Math.abs(Number(tx.amount) - payment.amount) < 0.01;
}

/** One-time membership purchase — grant the tier on the verified transaction. */
async function grantMembership(tx, meta, requestId) {
  const { userId, tierId } = meta;
  if (!isValidId(userId) || !tierId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      membershipTier: tierId,
      membershipStatus: "active",
      membershipProviderId: String(tx.id),
      membershipStartedAt: new Date(),
      membershipEndsAt: null,
    },
  });
  logPayment({ event: "webhook.membership_granted", userId, tierId, providerTransactionId: String(tx.id), requestId });
}

/**
 * Verified wallet top-up — credit the wallet exactly once. The ledger row is
 * the atomic gate (unique payment reference), so duplicate deliveries and
 * retries after partial failures can never double-credit.
 */
async function handleTopupSucceeded(tx, meta, requestId) {
  const { userId, paymentId } = meta;
  if (!isValidId(userId) || !isValidId(paymentId)) return;

  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
  if (!payment) return;

  if (!amountMatches(tx, payment)) {
    logPayment({
      event: "webhook.amount_mismatch",
      eventId: String(tx.id),
      paymentId: payment.id,
      providerTransactionId: String(tx.id),
      currency: tx.currency,
      amount: tx.amount,
      expected: payment.amount,
      failureCategory: "amount_mismatch",
      requestId,
    });
    return; // stays PENDING for reconciliation
  }

  if (payment.status === PAYMENT_STATES.SUCCEEDED) {
    // Retry after a partial failure — repair the credit if it never landed.
    await ensureTopupCredited(payment, requestId);
    return;
  }

  const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.SUCCEEDED);
  if (!transition.applied) return; // another delivery won — it credits

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerTransactionId: String(tx.id), providerPaymentIntentId: String(tx.id) },
  });
  await ensureTopupCredited(payment, requestId);
  logPayment({
    event: "webhook.wallet_topup",
    eventId: String(tx.id),
    paymentId: payment.id,
    providerTransactionId: String(tx.id),
    previousState: payment.status,
    newState: PAYMENT_STATES.SUCCEEDED,
    currency: "USD",
    amount: payment.amount,
    requestId,
  });
}

async function ensureTopupCredited(payment, requestId) {
  await creditWallet(prisma, payment.userId, payment.amount, {
    referenceId: payment.id,
    referenceType: "payment",
    description: "Wallet top-up",
  });
  logPayment({ event: "webhook.wallet_credit", paymentId: payment.id, userId: payment.userId, amount: payment.amount, currency: "USD", requestId });
}

/** Verified order checkout — the only path that marks order money as received. */
async function handleOrderSucceeded(tx, meta, requestId) {
  const { orderIds, userId, paymentId } = meta;
  if (!isValidId(userId) || !isValidId(paymentId) || !orderIds) return;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment || payment.orders.length === 0) {
    logPayment({ event: "webhook.payment_not_found", eventId: String(tx.id), paymentId, requestId, failureCategory: "mismatch" });
    return;
  }

  // Cross-check the metadata order list against the orders tied to the payment.
  const metadataOrderIds = orderIds.split(",").filter(isValidId).sort();
  const dbOrderIds = payment.orders.map((o) => o.id).sort();
  if (metadataOrderIds.length !== dbOrderIds.length || metadataOrderIds.join() !== dbOrderIds.join()) {
    logPayment({ event: "webhook.order_mismatch", eventId: String(tx.id), paymentId: payment.id, requestId, failureCategory: "mismatch" });
    return;
  }

  if (!amountMatches(tx, payment)) {
    logPayment({
      event: "webhook.amount_mismatch",
      eventId: String(tx.id),
      paymentId: payment.id,
      providerTransactionId: String(tx.id),
      currency: tx.currency,
      amount: tx.amount,
      expected: payment.amount,
      failureCategory: "amount_mismatch",
      requestId,
    });
    return; // stays PENDING for reconciliation
  }

  // Only an in-flight payment may transition here; terminal states are left
  // alone (no invalid-transition throw, no infinite provider retry).
  if (![PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status)) return;

  const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.SUCCEEDED);
  if (!transition.applied) return; // another delivery won the race — safe no-op

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerTransactionId: String(tx.id), providerPaymentIntentId: String(tx.id) },
  });

  await prisma.order.updateMany({
    where: { paymentId: payment.id, isPaid: false },
    data: { isPaid: true, paymentStatus: PAYMENT_STATES.SUCCEEDED },
  });
  await prisma.user.update({ where: { id: payment.userId }, data: { cart: {} } });

  logPayment({
    event: "webhook.payment_succeeded",
    eventId: String(tx.id),
    paymentId: payment.id,
    orderIds: payment.orders.map((o) => o.id),
    providerTransactionId: String(tx.id),
    previousState: payment.status,
    newState: PAYMENT_STATES.SUCCEEDED,
    currency: "USD",
    amount: payment.amount,
    requestId,
  });

  // Best-effort — never fail the webhook acknowledgment on email errors.
  await sendOrderConfirmation(payment.userId, payment.orders.map((o) => o.id)).catch((error) => {
    console.error("[Flutterwave webhook] Order confirmation email failed:", error);
  });
}

/**
 * Failed/cancelled webhook — transition the payment, release reserved
 * inventory (once — increments are idempotent), and mark orders.
 */
async function handleFailure(data, targetStatus, requestId) {
  // Prefer the provider-verified meta; fall back to the webhook body's meta if
  // verification is temporarily unreachable (a failed webhook only releases
  // stock — no money is ever credited from this path).
  let meta = data.meta || {};
  try {
    const tx = await verifyTransaction(data.id);
    meta = tx.meta || meta;
  } catch {
    // provider unreachable — proceed with the webhook's own meta
  }

  const { userId, paymentId } = meta;
  if (meta.appId !== APP_ID || !isValidId(userId) || !isValidId(paymentId)) return;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment) return;
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
    eventId: String(data.id),
    paymentId: payment.id,
    providerTransactionId: String(data.id),
    previousState,
    newState: targetStatus,
    failureCategory: targetStatus === PAYMENT_STATES.FAILED ? "payment_failed" : "canceled",
    requestId,
  });
}
