// Payment reconciliation service.
//
// Compares the marketplace's payment state against the payment provider and
// recovers discrepancies that are safe to auto-fix (verified against the
// provider and canonical DB data). Everything else is reported for manual
// review. Discrepancies are logged for the audit trail.

import { transitionPaymentStatus, releaseStock, toCents } from "./paymentService";
import { PAYMENT_STATES } from "./paymentState";
import { logPayment } from "@/lib/paymentLog";

const TERMINAL_STATES = new Set([
  PAYMENT_STATES.SUCCEEDED,
  PAYMENT_STATES.REFUNDED,
  PAYMENT_STATES.PARTIALLY_REFUNDED,
  PAYMENT_STATES.FAILED,
  PAYMENT_STATES.CANCELLED,
  PAYMENT_STATES.EXPIRED,
]);

/**
 * Reconcile a single payment.
 *
 * Returns a report object describing the outcome:
 *   { paymentId, status: "ok" | "consistent" | "reconciled" | "amount_mismatch"
 *     | "provider_unreachable" | "not_found" | "skipped", ...details }
 */
export async function reconcilePayment({ paymentId, prisma, stripe }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment) return { paymentId, status: "not_found" };
  if (TERMINAL_STATES.has(payment.status)) {
    return { paymentId, status: "consistent" };
  }

  // The intent id is only known after payment; for a lost-webhook payment the
  // checkout stored the session id, so resolve the intent from the session.
  let providerPaymentIntentId = payment.providerPaymentIntentId;
  if (!providerPaymentIntentId && payment.providerSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(payment.providerSessionId);
      providerPaymentIntentId = session?.payment_intent || null;
      if (providerPaymentIntentId && payment.providerPaymentIntentId !== providerPaymentIntentId) {
        await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentIntentId } });
      }
    } catch {
      providerPaymentIntentId = null;
    }
  }
  if (!providerPaymentIntentId) {
    return { paymentId, status: "skipped", reason: "no_provider_intent" };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(providerPaymentIntentId);
  } catch {
    logPayment({
      event: "reconcile.provider_unreachable",
      paymentId,
      failureCategory: "provider_unreachable",
    });
    return { paymentId, status: "provider_unreachable" };
  }

  const providerSucceeded = paymentIntent.status === "succeeded";
  const dbPending = [PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status);

  // Provider says SUCCESS, marketplace says PENDING/PROCESSING.
  if (providerSucceeded && dbPending) {
    const expectedCents = toCents(payment.amount);
    if (paymentIntent.currency !== "usd" || paymentIntent.amount_received !== expectedCents) {
      logPayment({
        event: "reconcile.amount_mismatch",
        paymentId,
        providerTransactionId: providerPaymentIntentId,
        currency: paymentIntent.currency,
        amount: paymentIntent.amount_received,
        expectedCents,
        failureCategory: "amount_mismatch",
      });
      return { paymentId, status: "amount_mismatch", providerAmount: paymentIntent.amount_received, expectedCents };
    }

    const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, PAYMENT_STATES.SUCCEEDED);
    if (transition.applied) {
      await prisma.order.updateMany({
        where: { paymentId: payment.id, isPaid: false },
        data: { isPaid: true, paymentStatus: PAYMENT_STATES.SUCCEEDED },
      });
      logPayment({
        event: "reconcile.recovered",
        paymentId,
        previousState: payment.status,
        newState: PAYMENT_STATES.SUCCEEDED,
      });
      return { paymentId, status: "reconciled", newState: PAYMENT_STATES.SUCCEEDED };
    }
    return { paymentId, status: "ok" };
  }

  // Provider says FAILED/CANCELED/EXPIRED, marketplace says PENDING/PROCESSING.
  if (!providerSucceeded && dbPending) {
    const target =
      paymentIntent.status === "canceled"
        ? PAYMENT_STATES.CANCELLED
        : paymentIntent.status === "expired"
          ? PAYMENT_STATES.EXPIRED
          : PAYMENT_STATES.FAILED;

    const transition = await transitionPaymentStatus(prisma, payment.id, payment.status, target);
    if (transition.applied) {
      await releaseStock(
        prisma,
        payment.orders.flatMap((o) => o.orderItems)
      );
      await prisma.order.updateMany({ where: { paymentId: payment.id }, data: { paymentStatus: target } });
      logPayment({
        event: "reconcile.recovered",
        paymentId,
        previousState: payment.status,
        newState: target,
      });
      return { paymentId, status: "reconciled", newState: target };
    }
    return { paymentId, status: "ok" };
  }

  return { paymentId, status: "consistent" };
}

/**
 * Reconcile all non-terminal payments (bounded). Returns an array of reports.
 */
export async function reconcileAllStuck({ prisma, stripe, take = 50 }) {
  const stuck = await prisma.payment.findMany({
    where: { status: { in: [PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING] } },
    take,
    select: { id: true },
  });
  const results = [];
  for (const { id } of stuck) {
    results.push(await reconcilePayment({ paymentId: id, prisma, stripe }));
  }
  return results;
}
