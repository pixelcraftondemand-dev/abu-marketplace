import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Stripe from "stripe";

import prisma from "@/lib/prisma";
import { webhookRateLimiter } from "@/lib/security";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { creditWallet } from "@/lib/services/walletService";
import { POST } from "@/app/api/stripe/route";

// Stripe network calls we never want to make in tests.
const { mockSessionsList, mockPIRetrieve } = vi.hoisted(() => ({
  mockSessionsList: vi.fn(),
  mockPIRetrieve: vi.fn(),
}));

// Deliberately subclass the REAL Stripe SDK so signature verification runs
// genuine HMAC-SHA256 offline. Only network-bound calls are stubbed.
vi.mock("stripe", async (importOriginal) => {
  const { default: RealStripe } = await importOriginal();
  return {
    default: class extends RealStripe {
      constructor(key) {
        super(key);
        this.checkout.sessions.list = mockSessionsList;
        this.paymentIntents.retrieve = mockPIRetrieve;
      }
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    webhookEvent: { create: vi.fn(), deleteMany: vi.fn() },
    payment: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(() => ({ count: 1 })) },
    order: { findMany: vi.fn(), updateMany: vi.fn() },
    product: { updateMany: vi.fn() },
    user: { update: vi.fn() },
  },
}));

vi.mock("@/lib/orderEmail", () => ({
  sendOrderConfirmation: vi.fn(),
}));

vi.mock("@/lib/services/walletService", () => ({
  creditWallet: vi.fn(),
}));

const WEBHOOK_SECRET = "whsec_test_secret";
const API_KEY = "sk_test_123";
const VALID_METADATA = { orderIds: "ord_1,ord_2", userId: "usr_1", appId: "abu-marketplace", paymentId: "pay_1" };
const TOPUP_METADATA = { userId: "usr_1", appId: "abu-marketplace", paymentId: "pay_1", walletTopup: "1" };

const topupPayment = {
  id: "pay_1",
  userId: "usr_1",
  amount: 50,
  status: "PROCESSING",
  orders: [], // top-ups have no orders
};

const payment = {
  id: "pay_1",
  userId: "usr_1",
  amount: 25,
  status: "PROCESSING",
  orders: [
    { id: "ord_1", orderItems: [{ productId: "prod_1", quantity: 1 }] },
    { id: "ord_2", orderItems: [{ productId: "prod_2", quantity: 1 }] },
  ],
};

function buildRequest(payload, sig) {
  const headers = sig ? { "stripe-signature": sig } : {};
  return new Request("http://localhost:3000/api/stripe", {
    method: "POST",
    headers,
    body: payload,
  });
}

function signedPayload(stripe, event) {
  const payload = JSON.stringify(event);
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { payload, sig };
}

const succeededEvent = (objectId = "pi_123") => ({
  id: "evt_succeeded",
  type: "payment_intent.succeeded",
  data: { object: { id: objectId } },
});

const failedEvent = (objectId = "pi_123") => ({
  id: "evt_failed",
  type: "payment_intent.payment_failed",
  data: { object: { id: objectId } },
});

const canceledEvent = (objectId = "pi_123") => ({
  id: "evt_canceled",
  type: "payment_intent.canceled",
  data: { object: { id: objectId } },
});

const expiredEvent = (sessionId = "cs_exp") => ({
  id: "evt_expired",
  type: "checkout.session.expired",
  data: { object: { id: sessionId } },
});

describe("Stripe webhook POST", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", API_KEY);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.resetAllMocks();
    webhookRateLimiter._clear();
    // Defaults: empty metadata -> every guard short-circuits.
    mockSessionsList.mockResolvedValue({ data: [{ metadata: {} }] });
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "usd", amount_received: 2500 });
    prisma.webhookEvent.create.mockResolvedValue({});
    prisma.payment.findFirst.mockResolvedValue(null);
    sendOrderConfirmation.mockResolvedValue();
    creditWallet.mockResolvedValue({ alreadyApplied: false, balance: 50 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request without a stripe-signature header", async () => {
    const res = await POST(buildRequest("{}", null));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing Stripe signature" });
  });

  it("rejects an invalid signature", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest("{}", "t=1234567890,v1=deadbeef"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid webhook payload" });
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects a payload tampered after signing", async () => {
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());
    const tampered = payload.replace("pi_123", "pi_999");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(tampered, sig));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid webhook payload" });
    } finally {
      spy.mockRestore();
    }
  });

  it("acknowledges unhandled event types without touching payment state", async () => {
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, {
      id: "evt_other",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    });

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: { provider: "stripe", providerEventId: "evt_other", type: "checkout.session.completed" },
    });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("treats a duplicate webhook event id as a safe no-op", async () => {
    prisma.webhookEvent.create.mockRejectedValueOnce({ code: "P2002" }); // already recorded
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("rolls back the dedup record when processing fails so the retry can reprocess", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockRejectedValue(new Error("db boom"));
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(buildRequest(payload, sig));
      expect(res.status).toBe(400);
      expect(prisma.webhookEvent.deleteMany).toHaveBeenCalledWith({ where: { providerEventId: "evt_succeeded" } });
    } finally {
      spy.mockRestore();
    }
  });

  it("marks the payment succeeded, orders paid, and clears the cart on payment_intent.succeeded", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Provider verified: amount + currency checked against canonical totals.
    expect(mockPIRetrieve).toHaveBeenCalledWith("pi_123");
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: "pay_1", userId: "usr_1" },
      include: { orders: { include: { orderItems: true } } },
    });
    // Atomic transition: only applies if still in PROCESSING.
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "SUCCEEDED" },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: { providerTransactionId: "pi_123", providerPaymentIntentId: "pi_123" },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "pay_1", isPaid: false },
      data: { isPaid: true, paymentStatus: "SUCCEEDED" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "usr_1" }, data: { cart: {} } });
    expect(sendOrderConfirmation).toHaveBeenCalledWith("usr_1", ["ord_1", "ord_2"]);
  });

  it("does not mark orders paid when the provider amount does not match the canonical total", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "usd", amount_received: 999 });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does not mark orders paid when the provider currency is not usd", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "eur", amount_received: 2500 });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does nothing when the payment intent is not succeeded", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "processing", currency: "usd", amount_received: 0 });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does not re-process when the payment is already SUCCEEDED", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: "SUCCEEDED" });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does nothing when the appId metadata does not match", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: { ...VALID_METADATA, appId: "another-app" } }] });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("does nothing when the metadata order list does not match the payment's orders", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue({
      ...payment,
      orders: [{ id: "ord_x", orderItems: [] }], // mismatch vs ord_1,ord_2
    });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("transitions to FAILED and releases inventory on payment_failed", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, failedEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "FAILED" },
    });
    // Reserved inventory released once (idempotent increments).
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 1 } },
    });
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_2" },
      data: { stock: { increment: 1 } },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "pay_1" },
      data: { paymentStatus: "FAILED" },
    });
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("transitions to CANCELLED and releases inventory on payment_intent.canceled", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, canceledEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "CANCELLED" },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "pay_1" },
      data: { paymentStatus: "CANCELLED" },
    });
  });

  it("transitions to EXPIRED and releases inventory on checkout.session.expired", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, expiredEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { providerSessionId: "cs_exp" },
      include: { orders: { include: { orderItems: true } } },
    });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "EXPIRED" },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "pay_1" },
      data: { paymentStatus: "EXPIRED" },
    });
  });

  it("activates a membership when a completed checkout session is received", async () => {
    const stripe = new Stripe(API_KEY);
    const metadata = { appId: "abu-marketplace", userId: "usr_1", tierId: "plus", subscriptionType: "membership" };
    const payload = JSON.stringify({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", metadata, payment_status: "paid", subscription: "sub_123" } },
    });
    const { sig } = signedPayload(stripe, {
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", metadata, payment_status: "paid", subscription: "sub_123" } },
    });

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "usr_1" },
      data: expect.objectContaining({
        membershipTier: "plus",
        membershipStatus: "active",
        membershipProviderId: "sub_123",
      }),
    });
  });

  it("credits the wallet exactly once for a verified top-up", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: TOPUP_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(topupPayment);
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "usd", amount_received: 5000 });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);

    // Amount + currency verified against the canonical top-up amount.
    expect(mockPIRetrieve).toHaveBeenCalledWith("pi_123");
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "SUCCEEDED" },
    });
    expect(creditWallet).toHaveBeenCalledWith(
      prisma,
      "usr_1",
      50,
      expect.objectContaining({ referenceId: "pay_1", referenceType: "payment" })
    );
    // No order side-effects, no cart clear, no confirmation email.
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("never double-credits a wallet top-up on duplicate delivery", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: TOPUP_METADATA }] });
    // First delivery: PROCESSING -> SUCCEEDED and credits.
    prisma.payment.findFirst.mockResolvedValueOnce(topupPayment);
    // Second (duplicate) delivery: already SUCCEEDED -> repair path only.
    prisma.payment.findFirst.mockResolvedValueOnce({ ...topupPayment, status: "SUCCEEDED" });
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "usd", amount_received: 5000 });
    creditWallet.mockResolvedValueOnce({ alreadyApplied: false, balance: 50 });
    creditWallet.mockResolvedValueOnce({ alreadyApplied: true, balance: 50 });

    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());
    await POST(buildRequest(payload, sig));
    await POST(buildRequest(payload, sig));

    expect(creditWallet).toHaveBeenCalledTimes(2);
    // Both deliveries reach the ledger with the same unique reference — the
    // DB-level (referenceType, referenceId) guard (unit-tested in
    // walletService.test.js) is what makes the second one a no-op credit.
    expect(creditWallet).toHaveBeenNthCalledWith(
      2,
      prisma,
      "usr_1",
      50,
      expect.objectContaining({ referenceId: "pay_1", referenceType: "payment" })
    );
  });

  it("does not credit the wallet when the top-up amount does not match the provider", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: TOPUP_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(topupPayment);
    mockPIRetrieve.mockResolvedValue({ id: "pi_123", status: "succeeded", currency: "usd", amount_received: 999 });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());

    const res = await POST(buildRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(creditWallet).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it("out-of-order delivery (expired then canceled) is a safe no-op, not an error", async () => {
    // Payment is already EXPIRED (session.expired arrived first); a late
    // payment_intent.canceled must NOT throw an invalid-transition error
    // (which would make the provider retry forever).
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: "EXPIRED" });
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, canceledEvent());
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(buildRequest(payload, sig));
      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("still acknowledges the webhook when the confirmation email fails", async () => {
    mockSessionsList.mockResolvedValue({ data: [{ metadata: VALID_METADATA }] });
    prisma.payment.findFirst.mockResolvedValue(payment);
    sendOrderConfirmation.mockRejectedValue(new Error("email down"));
    const stripe = new Stripe(API_KEY);
    const { payload, sig } = signedPayload(stripe, succeededEvent());
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(buildRequest(payload, sig));
      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).toHaveBeenCalled();
      expect(sendOrderConfirmation).toHaveBeenCalledWith("usr_1", ["ord_1", "ord_2"]);
    } finally {
      spy.mockRestore();
    }
  });
});
