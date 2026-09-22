/**
 * Inngest functions for async side effects.
 *
 * These replace inline side effects that were blocking checkout and other
 * critical paths. Each function is invoked via `inngest.send()` from the
 * route handler and runs asynchronously — the user gets an immediate response
 * while emails, fraud scoring, and analytics happen in the background.
 *
 * Failure isolation: if a side effect fails, it retries via Inngest's built-in
 * retry mechanism and never affects the checkout response.
 */
import { inngest } from "./client.js";
import prisma from "@/lib/prisma";

// ─── Order Confirmation Email ───────────────────────────────────────────────

/**
 * Send order confirmation email after checkout.
 *
 * Previously this was a direct call from the checkout route, which meant
 * a Resend API timeout would delay or fail the order response. Now it's
 * fire-and-forget via Inngest with automatic retries.
 */
export const sendOrderEmail = inngest.createFunction(
  { id: "send-order-email" },
  { event: "order/placed" },
  async ({ event, step }) => {
    const { userId, orderIds } = event.data;

    // Step 1: Fetch user and orders
    const { user, orders } = await step.run("fetch-order-data", async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds }, userId },
        include: {
          orderItems: { include: { product: true } },
          store: true,
        },
      });

      return { user, orders };
    });

    if (!user?.email || orders.length === 0) {
      console.warn("[Inngest sendOrderEmail] No user email or orders found; skipping.");
      return;
    }

    // Step 2: Send email via Resend
    await step.run("send-email", async () => {
      const { sendOrderConfirmation } = await import("@/lib/orderEmail");
      await sendOrderConfirmation(userId, orderIds);
    });
  }
);

// ─── Fraud Risk Evaluation ──────────────────────────────────────────────────

/**
 * Async fraud risk scoring for completed checkouts.
 *
 * Previously `evaluateCheckoutRisk()` ran inline during checkout, adding
 * latency to every order. Now the checkout completes immediately and fraud
 * scoring happens asynchronously. High-risk orders are flagged in the audit
 * log for admin review — they are NOT blocked retroactively.
 */
export const evaluateOrderRisk = inngest.createFunction(
  { id: "evaluate-order-risk" },
  { event: "order/placed" },
  async ({ event, step }) => {
    const { userId, orderIds, orderAmount, ipAddress, deviceFingerprint } = event.data;

    await step.run("run-fraud-check", async () => {
      const { evaluateCheckoutRisk } = await import("@/lib/services/fraudPrevention");
      const { appendAuditLog } = await import("@/lib/services/auditLog");

      const result = await evaluateCheckoutRisk(prisma, {
        userId,
        orderAmount,
        ipAddress: ipAddress || "unknown",
        deviceFingerprint: deviceFingerprint || null,
      });

      // Log the risk assessment for admin review
      await appendAuditLog(prisma, {
        actor: userId,
        action: "fraud_check",
        metadata: {
          orderIds,
          riskScore: result.riskScore,
          action: result.action,
          reasons: result.reasons,
        },
      });

      console.log(
        `[Inngest evaluateOrderRisk] userId=${userId} risk=${result.riskScore} action=${result.action}`
      );
    });
  }
);

// ─── Analytics Event ────────────────────────────────────────────────────────

/**
 * Track order placement for analytics.
 *
 * Fires after checkout completes. Currently logs to console; replace with
 * a real analytics provider (PostHog, Mixpanel, etc.) when ready.
 */
export const trackOrderPlaced = inngest.createFunction(
  { id: "track-order-placed" },
  { event: "order/placed" },
  async ({ event }) => {
    const { userId, orderIds, orderAmount, paymentMethod, currency } = event.data;

    console.log(
      JSON.stringify({
        event: "order_placed",
        userId,
        orderIds,
        orderAmount,
        paymentMethod,
        currency,
        timestamp: new Date().toISOString(),
      })
    );
  }
);
