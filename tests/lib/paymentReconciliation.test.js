import { describe, expect, it, vi } from "vitest";
import { reconcilePayment } from "@/lib/services/paymentReconciliation";

function makePayment(overrides = {}) {
  return {
    id: "pay_1",
    amount: 25,
    status: "PROCESSING",
    providerPaymentIntentId: "pi_123",
    orders: [{ id: "ord_1", orderItems: [{ productId: "prod_1", quantity: 2 }] }],
    ...overrides,
  };
}

function makePrisma(payment) {
  return {
    payment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      update: vi.fn(),
      updateMany: vi.fn(() => ({ count: 1 })),
    },
    order: { updateMany: vi.fn() },
    product: { updateMany: vi.fn() },
  };
}

const stripe = {
  paymentIntents: { retrieve: vi.fn() },
  checkout: { sessions: { retrieve: vi.fn() } },
};

describe("reconcilePayment", () => {
  it("reports not_found for an unknown payment", async () => {
    const prisma = makePrisma(null);
    const result = await reconcilePayment({ paymentId: "pay_x", prisma, stripe });
    expect(result.status).toBe("not_found");
  });

  it("skips payments without a provider intent", async () => {
    const prisma = makePrisma(makePayment({ providerPaymentIntentId: null }));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("skipped");
  });

  it("leaves terminal states untouched", async () => {
    const prisma = makePrisma(makePayment({ status: "SUCCEEDED" }));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("consistent");
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("reports provider_unreachable when the provider call fails", async () => {
    const prisma = makePrisma(makePayment());
    stripe.paymentIntents.retrieve.mockRejectedValue(new Error("timeout"));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("provider_unreachable");
  });

  it("recovers a PENDING payment the provider reports as succeeded (verified amount)", async () => {
    const prisma = makePrisma(makePayment({ status: "PENDING" }));
    stripe.paymentIntents.retrieve.mockResolvedValue({
      status: "succeeded",
      currency: "usd",
      amount_received: 2500,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("reconciled");
    expect(result.newState).toBe("SUCCEEDED");
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PENDING" },
      data: { status: "SUCCEEDED" },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPaid: true }) })
    );
  });

  it("reports amount_mismatch instead of auto-recovering", async () => {
    const prisma = makePrisma(makePayment({ status: "PENDING" }));
    stripe.paymentIntents.retrieve.mockResolvedValue({
      status: "succeeded",
      currency: "usd",
      amount_received: 111,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("amount_mismatch");
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it("resolves the payment intent from the session when it is missing (lost-webhook recovery)", async () => {
    const prisma = makePrisma(
      makePayment({ providerPaymentIntentId: null, providerSessionId: "cs_1" })
    );
    stripe.checkout.sessions.retrieve.mockResolvedValue({ payment_intent: "pi_123" });
    stripe.paymentIntents.retrieve.mockResolvedValue({
      status: "succeeded",
      currency: "usd",
      amount_received: 2500,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("reconciled");
    expect(result.newState).toBe("SUCCEEDED");
    // The resolved intent is persisted for future reconciliation runs.
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: { providerPaymentIntentId: "pi_123" },
    });
  });

  it("recovers a PROCESSING payment the provider reports as failed (releases stock)", async () => {
    const prisma = makePrisma(makePayment());
    stripe.paymentIntents.retrieve.mockResolvedValue({ status: "requires_payment_method" });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, stripe });
    expect(result.status).toBe("reconciled");
    expect(result.newState).toBe("FAILED");
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 2 } },
    });
  });
});
