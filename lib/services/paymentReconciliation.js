// Payment reconciliation service.
//
// Compares the marketplace's payment state against the payment provider and
// recovers discrepancies that are safe to auto-fix (verified against the
// provider and canonical DB data). Everything else is reported for manual
// review. Discrepancies are logged for the audit trail.
//
// Provider interface (Flutterwave service):
//   verifyTransaction(transactionId)  -> { id, txRef, amount, currency, status, meta }
//   verifyTransactionByRef(txRef)     -> same shape

import { transitionPaymentStatus, releaseStock } from "./paymentService";
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
export async function reconcilePayment({ paymentId, prisma, provider }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { orders: { include: { orderItems: true } } },
  });
  if (!payment) return { paymentId, status: "not_found" };
  if (TERMINAL_STATES.has(payment.status)) {
    return { paymentId, status: "consistent" };
  }

  // The transaction id is only known after payment; for a lost-webhook payment
  // the checkout stored our tx_ref in providerSessionId, so resolve the
  // transaction by reference.
  let providerTransactionId = payment.providerPaymentIntentId;
  if (!providerTransactionId && payment.providerSessionId) {
    try {
      const tx = await provider.verifyTransactionByRef(payment.providerSessionId);
      providerTransactionId = tx?.id ? String(tx.id) : null;
      if (providerTransactionId && payment.providerPaymentIntentId !== providerTransactionId) {
        await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentIntentId: providerTransactionId } });
      }
    } catch {
      providerTransactionId = null;
    }
  }
  if (!providerTransactionId) {
    return { paymentId, status: "skipped", reason: "no_provider_transaction" };
  }

  let tx;
  try {
    tx = await provider.verifyTransaction(providerTransactionId);
  } catch {
    logPayment({
      event: "reconcile.provider_unreachable",
      paymentId,
      failureCategory: "provider_unreachable",
    });
    return { paymentId, status: "provider_unreachable" };
  }

  const providerSucceeded = tx.status === "successful";
  const dbPending = [PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING].includes(payment.status);

  // Provider says SUCCESS, marketplace says PENDING/PROCESSING.
  if (providerSucceeded && dbPending) {
    if (tx.currency !== "USD" || Math.abs(Number(tx.amount) - payment.amount) > 0.01) {
      logPayment({
        event: "reconcile.amount_mismatch",
        paymentId,
        providerTransactionId,
        currency: tx.currency,
        amount: tx.amount,
        expected: payment.amount,
        failureCategory: "amount_mismatch",
      });
      return { paymentId, status: "amount_mismatch", providerAmount: tx.amount, expected: payment.amount };
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

  // Provider says FAILED/CANCELLED/EXPIRED, marketplace says PENDING/PROCESSING.
  if (!providerSucceeded && dbPending) {
    const target =
      tx.status === "cancelled"
        ? PAYMENT_STATES.CANCELLED
        : tx.status === "expired"
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
export async function reconcileAllStuck({ prisma, provider, take = 50 }) {
  const stuck = await prisma.payment.findMany({
    where: { status: { in: [PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING] } },
    take,
    select: { id: true },
  });
  const results = [];
  for (const { id } of stuck) {
    results.push(await reconcilePayment({ paymentId: id, prisma, provider }));
  }
  return results;
}
