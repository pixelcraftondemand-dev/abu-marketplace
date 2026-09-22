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

const provider = {
  verifyTransaction: vi.fn(),
  verifyTransactionByRef: vi.fn(),
};

describe("reconcilePayment", () => {
  it("reports not_found for an unknown payment", async () => {
    const prisma = makePrisma(null);
    const result = await reconcilePayment({ paymentId: "pay_x", prisma, provider });
    expect(result.status).toBe("not_found");
  });

  it("skips payments without a provider transaction", async () => {
    const prisma = makePrisma(makePayment({ providerPaymentIntentId: null }));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("skipped");
  });

  it("leaves terminal states untouched", async () => {
    const prisma = makePrisma(makePayment({ status: "SUCCEEDED" }));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("consistent");
    expect(provider.verifyTransaction).not.toHaveBeenCalled();
  });

  it("reports provider_unreachable when the provider call fails", async () => {
    const prisma = makePrisma(makePayment());
    provider.verifyTransaction.mockRejectedValue(new Error("timeout"));
    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("provider_unreachable");
  });

  it("recovers a PENDING payment the provider reports as succeeded (verified amount)", async () => {
    const prisma = makePrisma(makePayment({ status: "PENDING" }));
    provider.verifyTransaction.mockResolvedValue({
      id: "pi_123",
      status: "successful",
      currency: "USD",
      amount: 25,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
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
    provider.verifyTransaction.mockResolvedValue({
      id: "pi_123",
      status: "successful",
      currency: "USD",
      amount: 111,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("amount_mismatch");
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it("resolves the transaction by reference when it is missing (lost-webhook recovery)", async () => {
    const prisma = makePrisma(
      makePayment({ providerPaymentIntentId: null, providerSessionId: "cs_1" })
    );
    provider.verifyTransactionByRef.mockResolvedValue({ id: "pi_123" });
    provider.verifyTransaction.mockResolvedValue({
      id: "pi_123",
      status: "successful",
      currency: "USD",
      amount: 25,
    });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("reconciled");
    expect(result.newState).toBe("SUCCEEDED");
    expect(provider.verifyTransactionByRef).toHaveBeenCalledWith("cs_1");
    // The resolved transaction id is persisted for future reconciliation runs.
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: { providerPaymentIntentId: "pi_123" },
    });
  });

  it("recovers a PROCESSING payment the provider reports as failed (releases stock)", async () => {
    const prisma = makePrisma(makePayment());
    provider.verifyTransaction.mockResolvedValue({ id: "pi_123", status: "requires_payment_method" });

    const result = await reconcilePayment({ paymentId: "pay_1", prisma, provider });
    expect(result.status).toBe("reconciled");
    expect(result.newState).toBe("FAILED");
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 2 } },
    });
  });
});
