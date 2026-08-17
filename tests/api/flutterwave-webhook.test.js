import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { webhookRateLimiter } from "@/lib/security";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { creditWallet } from "@/lib/services/walletService";
import { POST } from "@/app/api/flutterwave/route";

// verifyTransaction is the only network call we never want to make in tests.
// The real verifyWebhookSignature runs against the stubbed env hash.
const { mockVerifyTransaction } = vi.hoisted(() => ({ mockVerifyTransaction: vi.fn() }));

vi.mock("@/lib/services/flutterwave", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, verifyTransaction: mockVerifyTransaction };
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

const WEBHOOK_HASH = "test-secret-hash";
const VALID_METADATA = { orderIds: "ord_1,ord_2", userId: "usr_1", appId: "abu-marketplace", paymentId: "pay_1" };
const TOPUP_METADATA = { userId: "usr_1", appId: "abu-marketplace", paymentId: "pay_1", walletTopup: "1" };
const MEMBERSHIP_METADATA = { userId: "usr_1", appId: "abu-marketplace", tierId: "plus", subscriptionType: "membership" };

const topupPayment = { id: "pay_1", userId: "usr_1", amount: 50, status: "PROCESSING", orders: [] };

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

function buildRequest(payload, hash) {
  const headers = hash ? { "verif-hash": hash } : {};
  return new Request("http://localhost:3000/api/flutterwave", {
    method: "POST",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

function succeededEvent(overrides = {}) {
  return {
    event: "charge.completed",
    data: {
      id: 285959875,
      tx_ref: "pay_1",
      amount: 25,
      currency: "USD",
      status: "successful",
      meta: VALID_METADATA,
      ...overrides,
    },
  };
}

const failedEvent = (overrides = {}) => ({
  event: "charge.failed",
  data: {
    id: 285959876,
    tx_ref: "pay_1",
    amount: 25,
    currency: "USD",
    status: "failed",
    meta: VALID_METADATA,
    ...overrides,
  },
});

function verifiedTx(overrides = {}) {
  return {
    id: 285959875,
    txRef: "pay_1",
    amount: 25,
    currency: "USD",
    status: "successful",
    meta: VALID_METADATA,
    ...overrides,
  };
}

describe("Flutterwave webhook POST", () => {
  beforeEach(() => {
    vi.stubEnv("FLW_WEBHOOK_SECRET_HASH", WEBHOOK_HASH);
    vi.resetAllMocks();
    webhookRateLimiter._clear();
    mockVerifyTransaction.mockResolvedValue(verifiedTx());
    prisma.webhookEvent.create.mockResolvedValue({});
    prisma.payment.findFirst.mockResolvedValue(null);
    sendOrderConfirmation.mockResolvedValue();
    creditWallet.mockResolvedValue({ alreadyApplied: false, balance: 50 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request without a verif-hash header", async () => {
    const res = await POST(buildRequest(succeededEvent(), null));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid verif-hash header" });
  });

  it("rejects a request with a wrong verif-hash header", async () => {
    const res = await POST(buildRequest(succeededEvent(), "wrong-hash"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid verif-hash header" });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("acknowledges unhandled event types without touching payment state", async () => {
    const res = await POST(buildRequest({ event: "transfer.completed", data: { id: 1 } }, WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: { provider: "flutterwave", providerEventId: "transfer.completed:1", type: "transfer.completed" },
    });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("treats a duplicate webhook event id as a safe no-op", async () => {
    prisma.webhookEvent.create.mockRejectedValueOnce({ code: "P2002" });
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("rolls back the dedup record when processing fails so the retry can reprocess", async () => {
    prisma.payment.findFirst.mockRejectedValue(new Error("db boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
      expect(res.status).toBe(400);
      expect(prisma.webhookEvent.deleteMany).toHaveBeenCalledWith({
        where: { providerEventId: "charge.completed:285959875" },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("marks the payment succeeded, orders paid, and clears the cart on charge.completed", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Re-verified with the provider before any state change.
    expect(mockVerifyTransaction).toHaveBeenCalledWith(285959875);
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: "pay_1", userId: "usr_1" },
      include: { orders: { include: { orderItems: true } } },
    });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "SUCCEEDED" },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: { providerTransactionId: "285959875", providerPaymentIntentId: "285959875" },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "pay_1", isPaid: false },
      data: { isPaid: true, paymentStatus: "SUCCEEDED" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "usr_1" }, data: { cart: {} } });
    expect(sendOrderConfirmation).toHaveBeenCalledWith("usr_1", ["ord_1", "ord_2"]);
  });

  it("does not mark orders paid when the provider amount does not match the canonical total", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ amount: 999 }));
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does not mark orders paid when the provider currency is not USD", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ currency: "EUR" }));
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does nothing when the verified transaction is not successful", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ status: "pending" }));
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does not re-process when the payment is already SUCCEEDED", async () => {
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: "SUCCEEDED" });
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("does nothing when the appId meta does not match", async () => {
    mockVerifyTransaction.mockResolvedValue(
      verifiedTx({ meta: { ...VALID_METADATA, appId: "another-app" } })
    );
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("does nothing when the meta order list does not match the payment's orders", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      ...payment,
      orders: [{ id: "ord_x", orderItems: [] }],
    });
    const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("transitions to FAILED and releases inventory on charge.failed", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    const res = await POST(buildRequest(failedEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "FAILED" },
    });
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

  it("transitions to CANCELLED and releases inventory on a cancelled status", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    const res = await POST(
      buildRequest({ event: "charge.completed", data: { ...failedEvent().data, status: "cancelled" } }, WEBHOOK_HASH)
    );
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

  it("activates a membership on a verified charge.completed", async () => {
    mockVerifyTransaction.mockResolvedValue(
      verifiedTx({ meta: MEMBERSHIP_METADATA })
    );
    const res = await POST(buildRequest(succeededEvent({ meta: MEMBERSHIP_METADATA }), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "usr_1" },
      data: expect.objectContaining({
        membershipTier: "plus",
        membershipStatus: "active",
        membershipProviderId: "285959875",
      }),
    });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("credits the wallet exactly once for a verified top-up", async () => {
    prisma.payment.findFirst.mockResolvedValue(topupPayment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ meta: TOPUP_METADATA, amount: 50 }));
    const res = await POST(buildRequest(succeededEvent({ meta: TOPUP_METADATA }), WEBHOOK_HASH));
    expect(res.status).toBe(200);

    expect(mockVerifyTransaction).toHaveBeenCalledWith(285959875);
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
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("never double-credits a wallet top-up on duplicate delivery", async () => {
    prisma.payment.findFirst.mockResolvedValue(topupPayment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ meta: TOPUP_METADATA, amount: 50 }));
    creditWallet.mockResolvedValueOnce({ alreadyApplied: false, balance: 50 });
    // Match the unique providerEventId constraint that the production database
    // enforces on the second provider delivery.
    prisma.webhookEvent.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: "P2002" });

    await POST(buildRequest(succeededEvent({ meta: TOPUP_METADATA }), WEBHOOK_HASH));
    await POST(buildRequest(succeededEvent({ meta: TOPUP_METADATA }), WEBHOOK_HASH));

    // The webhook event unique key rejects the second delivery before it can
    // invoke wallet credit. The wallet ledger is the second safety net.
    expect(creditWallet).toHaveBeenCalledTimes(1);
    expect(creditWallet).toHaveBeenCalledWith(
      prisma,
      "usr_1",
      50,
      expect.objectContaining({ referenceId: "pay_1", referenceType: "payment" })
    );
  });

  it("does not credit the wallet when the top-up amount does not match the provider", async () => {
    prisma.payment.findFirst.mockResolvedValue(topupPayment);
    mockVerifyTransaction.mockResolvedValue(verifiedTx({ meta: TOPUP_METADATA, amount: 999 }));
    const res = await POST(buildRequest(succeededEvent({ meta: TOPUP_METADATA }), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(creditWallet).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it("out-of-order delivery (terminal state then retry) is a safe no-op, not an error", async () => {
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: "EXPIRED" });
    const res = await POST(buildRequest(failedEvent(), WEBHOOK_HASH));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it("still acknowledges the webhook when the confirmation email fails", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    sendOrderConfirmation.mockRejectedValue(new Error("email down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(succeededEvent(), WEBHOOK_HASH));
      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).toHaveBeenCalled();
      expect(sendOrderConfirmation).toHaveBeenCalledWith("usr_1", ["ord_1", "ord_2"]);
    } finally {
      spy.mockRestore();
    }
  });
});
