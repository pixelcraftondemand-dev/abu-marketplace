import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { checkoutRateLimiter } from "@/lib/security";
import { getSessionFromRequest, getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { GET, POST } from "@/app/api/orders/route";

// AMBER PAY is in-house — no external payment provider calls in tests.

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
  getVerifiedUserFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    address: { findFirst: vi.fn() },
    coupon: { findUnique: vi.fn(), updateMany: vi.fn(() => ({ count: 1 })) },
    order: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    product: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(() => ({ count: 1 })) },
    payment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(() => ({ count: 1 })) },
    user: { update: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: "usr_1", createdAt: new Date("2025-01-01") }) },
    wallet: { findUnique: vi.fn().mockResolvedValue({ id: "w_1", userId: "usr_1", balance: 100 }), updateMany: vi.fn(() => ({ count: 1 })) },
    walletTransaction: { create: vi.fn().mockResolvedValue({ id: "tx_1" }) },
    // PSP integration — added after original tests were written
    pspTransaction: { create: vi.fn().mockResolvedValue({ id: "psp_1", version: 1 }), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    auditLog: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    fraudEvent: { create: vi.fn(), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), groupBy: vi.fn().mockResolvedValue([]) },
    ledgerEntry: { create: vi.fn() },
    idempotencyKeyRecord: { create: vi.fn().mockResolvedValue({}) },
  };
  prismaMock.$transaction = vi.fn(async (fn) => fn(prismaMock));
  return { default: prismaMock };
});

const ORIGIN = "http://localhost:3000";

function buildRequest(body, { origin = ORIGIN } = {}) {
  return new Request(origin, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

const validBody = {
  addressId: "addr_123",
  items: [{ id: "prod_1", quantity: 2 }],
  paymentMethod: "COD",
  country: "Sierra Leone",
};

const futureCoupon = {
  code: "SAVE10",
  discount: 10,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  forNewUser: false,
  forMember: false,
};

const productRow = { id: "prod_1", price: 10, storeId: "st_a", inStock: true };

describe("orders POST", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checkoutRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    getVerifiedUserFromRequest.mockResolvedValue({ id: "usr_1", emailVerified: true, email: "buyer@example.com", name: "Buyer" });
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    // Wallet mocks (resetAllMocks wipes factory defaults).
    prisma.wallet.findUnique.mockResolvedValue({ id: "w_1", userId: "usr_1", balance: 100 });
    prisma.wallet.updateMany.mockResolvedValue({ count: 1 });
    prisma.walletTransaction.create.mockResolvedValue({ id: "tx_1" });
  });

  it("returns 401 when the user is not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "not authorized" });
  });

  it("returns 422 for malformed or oversized input", async () => {
    const cases = [
      { ...validBody, addressId: undefined },
      { ...validBody, items: undefined },
      { ...validBody, items: [] },
      { ...validBody, paymentMethod: undefined },
      { ...validBody, paymentMethod: "BITCOIN" },
      { ...validBody, items: Array.from({ length: 51 }, (_, i) => ({ id: `prod_${i}`, quantity: 1 })) },
      { ...validBody, items: [{ id: "prod_1", quantity: 0 }] },
      { ...validBody, items: [{ id: "prod_1", quantity: 1.5 }] },
      { ...validBody, items: [{ id: "prod_1" }] },
    ];
    for (const body of cases) {
      const res = await POST(buildRequest(body));
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe("Invalid checkout details.");
    }
  });

  it("returns 422 for an invalid address id", async () => {
    const res = await POST(buildRequest({ ...validBody, addressId: "x!" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Invalid address.");
  });

  it("returns 404 when the address does not belong to the user", async () => {
    prisma.address.findFirst.mockResolvedValue(null);
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Address not found.");
  });

  it("returns 404 when some products are not found", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    const res = await POST(
      buildRequest({ ...validBody, items: [{ id: "prod_1", quantity: 1 }, { id: "prod_2", quantity: 1 }] })
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("One or more products were not found.");
  });

  it("returns 400 when a product is out of stock", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([{ ...productRow, inStock: false }]);
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("One or more products are out of stock.");
  });

  it("returns 422 with no orders or reservations when stock is insufficient", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.product.updateMany.mockResolvedValue({ count: 0 }); // atomic guard fails
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("One or more products are no longer in stock.");
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("returns 400 when an unexpected error occurs mid-request", async () => {
    prisma.address.findFirst.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(validBody));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Unable to place order.");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns 400 for an unknown coupon", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.coupon.findUnique.mockResolvedValue(null);
    const res = await POST(buildRequest({ ...validBody, couponCode: "NOPE" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Coupon not found");
  });

  it("returns 400 for an expired coupon", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.coupon.findUnique.mockResolvedValue({ ...futureCoupon, expiresAt: new Date(Date.now() - 1000) });
    const res = await POST(buildRequest({ ...validBody, couponCode: "SAVE10" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Coupon has expired");
  });

  it("returns 400 when a new-user coupon is used by an existing customer", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.coupon.findUnique.mockResolvedValue({ ...futureCoupon, forNewUser: true });
    prisma.order.findMany.mockResolvedValue([{ id: "old_order" }]);
    const res = await POST(buildRequest({ ...validBody, couponCode: "SAVE10" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Coupon valid for new users only.");
  });

  it("creates one order per store and clears the cart for COD", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([
      productRow,
      { id: "prod_2", price: 20, storeId: "st_b", inStock: true },
    ]);
    prisma.order.create.mockResolvedValueOnce({ id: "o1" }).mockResolvedValueOnce({ id: "o2" });

    const res = await POST(
      buildRequest({
        ...validBody,
        items: [{ id: "prod_1", quantity: 1 }, { id: "prod_2", quantity: 1 }],
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Orders Placed Successfully" });

    // Store A: 10 + 5 delivery fee. Store B: 20 (fee charged once).
    expect(prisma.order.create).toHaveBeenNthCalledWith(1, {
      data: {
        userId: "usr_1",
        storeId: "st_a",
        addressId: "addr_123",
        total: 15,
        paymentMethod: "COD",
        isCouponUsed: false,
        coupon: {},
        orderItems: { create: [{ productId: "prod_1", quantity: 1, price: 10 }] },
      },
    });
    expect(prisma.order.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: "usr_1",
        storeId: "st_b",
        addressId: "addr_123",
        total: 20,
        paymentMethod: "COD",
        isCouponUsed: false,
        coupon: {},
        orderItems: { create: [{ productId: "prod_2", quantity: 1, price: 20 }] },
      },
    });
    // Inventory was reserved atomically for both products.
    expect(prisma.product.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "usr_1" }, data: { cart: {} } });
  });

  it("applies coupon discount and increments usage atomically for limited coupons", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.coupon.findUnique.mockResolvedValue({ ...futureCoupon, maxUses: 5 });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.order.create.mockResolvedValueOnce({ id: "o1" });

    const res = await POST(buildRequest({ ...validBody, couponCode: "SAVE10" }));
    expect(res.status).toBe(200);

    // 10 x 2 = 20, minus 10% = 18, then + 5 delivery fee = 23.
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: {
        userId: "usr_1",
        storeId: "st_a",
        addressId: "addr_123",
        total: 23,
        paymentMethod: "COD",
        isCouponUsed: true,
        coupon: { ...futureCoupon, maxUses: 5 },
        orderItems: { create: [{ productId: "prod_1", quantity: 2, price: 10 }] },
      },
    });
    // Atomic usage increment guarded by maxUses.
    expect(prisma.coupon.updateMany).toHaveBeenCalledWith({
      where: { code: "SAVE10", usageCount: { lt: 5 } },
      data: { usageCount: { increment: 1 } },
    });
  });

  it("price integrity: tampered client prices/subtotals never change the payable total", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.order.create.mockResolvedValueOnce({ id: "o1" });

    const res = await POST(
      buildRequest({
        ...validBody,
        items: [{ id: "prod_1", quantity: 2, price: 0.01, subtotal: 0.02 }],
        total: 0.02,
        discount: 99,
        shipping: 0,
      })
    );

    expect(res.status).toBe(200);
    // Canonical math only: (10 x 2) + 5 = 25. All client-supplied amounts ignored.
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          total: 25,
          orderItems: { create: [{ productId: "prod_1", quantity: 2, price: 10 }] },
        }),
      })
    );
  });

  it("blocks unverified accounts from ordering with every payment method", async () => {
    getVerifiedUserFromRequest.mockResolvedValue(null);
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);

    for (const paymentMethod of ["COD", "WALLET"]) {
      const res = await POST(buildRequest({ ...validBody, paymentMethod }));
      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("verify your email");
    }
    // Nothing was created for any method — the check runs before any side effects.
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it("allows verified users to place orders with any payment method", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.order.create.mockResolvedValueOnce({ id: "o1" });

    const res = await POST(buildRequest(validBody)); // COD
    expect(res.status).toBe(200);
    expect(getVerifiedUserFromRequest).toHaveBeenCalled();
  });

  it("WALLET: debits the wallet, creates a SUCCEEDED payment, and marks orders paid instantly", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.payment.create.mockResolvedValueOnce({ id: "pay_1" });
    prisma.order.create.mockResolvedValueOnce({ id: "o1" });

    const res = await POST(buildRequest({ ...validBody, paymentMethod: "WALLET" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("Orders Placed Successfully");
    expect(json.paymentId).toBe("pay_1");
    // The idempotency key is returned so a timeout-retry cannot double-debit.
    expect(typeof json.idempotencyKey).toBe("string");

    // A payment row exists (idempotency) and is immediately SUCCEEDED.
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: expect.any(String),
          userId: "usr_1",
          amount: 25,
          currency: "USD",
          status: "SUCCEEDED",
        }),
      })
    );
    // Wallet debit is atomic and ledger-guarded against double-spend.
    expect(prisma.wallet.updateMany).toHaveBeenCalledWith({
      where: { id: "w_1", balance: { gte: 25 } },
      data: { balance: { decrement: 25 } },
    });
    expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PAYMENT",
          amount: -25,
          referenceId: "pay_1",
          referenceType: "order",
        }),
      })
    );
    // Order is paid immediately.
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: "pay_1",
          paymentStatus: "SUCCEEDED",
          isPaid: true,
          paymentMethod: "WALLET",
        }),
      })
    );
    // Cart cleared after successful wallet checkout.
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "usr_1" }, data: { cart: {} } });
  });

  it("returns 422 with a full rollback when the wallet cannot cover the total", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.payment.create.mockResolvedValueOnce({ id: "pay_1" });
    // Atomic balance guard fails.
    prisma.wallet.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await POST(buildRequest({ ...validBody, paymentMethod: "WALLET" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Insufficient wallet balance.");
    // No order, no cart clear — the transaction rolled back.
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("WALLET retry WITHOUT a key returns alreadyProcessed when a recent wallet payment exists", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "pay_1",
      createdAt: new Date(),
    });
    const res = await POST(buildRequest({ ...validBody, paymentMethod: "WALLET" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyProcessed: true, paymentId: "pay_1" });
    // No second debit, no second order, no second payment.
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.wallet.updateMany).not.toHaveBeenCalled();
    expect(prisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "usr_1", status: "SUCCEEDED" }) })
    );
  });

  it("WALLET retry with the same idempotency key returns alreadyProcessed (no second debit)", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_1",
      status: "SUCCEEDED",

    });
    const res = await POST(
      buildRequest({ ...validBody, paymentMethod: "WALLET", idempotencyKey: "key_12345678" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyProcessed: true, paymentId: "pay_1" });
    expect(prisma.wallet.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("returns 422 for an unsupported currency", async () => {
    const res = await POST(buildRequest({ ...validBody, currency: "XXX" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Unsupported currency.");
  });

  it("accepts a supported display currency without affecting totals", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.order.create.mockResolvedValueOnce({ id: "o1" });

    const res = await POST(buildRequest({ ...validBody, currency: "SLL" }));
    expect(res.status).toBe(200);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ total: 25 }) })
    );
  });

  it("returns 409 for an in-flight idempotency key (no second charge)", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_1",
      status: "PROCESSING",
    });
    const res = await POST(
      buildRequest({ ...validBody, paymentMethod: "WALLET", idempotencyKey: "key_12345678" })
    );
    expect(res.status).toBe(409);

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("returns alreadyProcessed for a SUCCEEDED idempotency key", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_1",
      status: "SUCCEEDED",

    });
    const res = await POST(
      buildRequest({ ...validBody, paymentMethod: "WALLET", idempotencyKey: "key_12345678" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyProcessed: true, paymentId: "pay_1" });
  });

  it("rejects another user's idempotency key", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_other",
      status: "PROCESSING",

    });
    const res = await POST(
      buildRequest({ ...validBody, paymentMethod: "WALLET", idempotencyKey: "key_12345678" })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Idempotency key is already in use.");
  });

  it("P2002 race: concurrent duplicate key returns the winner's session without a second order", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "addr_123" });
    prisma.product.findMany.mockResolvedValue([productRow]);
    prisma.payment.findUnique
      .mockResolvedValueOnce(null) // idempotency pre-check
      .mockResolvedValueOnce({ id: "pay_win", userId: "usr_1", status: "SUCCEEDED" });
    prisma.payment.create.mockRejectedValueOnce({ code: "P2002" }); // unique constraint

    const res = await POST(
      buildRequest({ ...validBody, paymentMethod: "WALLET", idempotencyKey: "key_12345678" })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyProcessed).toBe(true);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("WALLET retry WITHOUT a key returns alreadyProcessed when a recent wallet payment exists", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: "pay_1",
      status: "SUCCEEDED",
      createdAt: new Date(),
    });
    const res = await POST(buildRequest({ ...validBody, paymentMethod: "WALLET" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alreadyProcessed).toBe(true);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});

describe("orders GET", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await GET(new Request(`${ORIGIN}/api/orders`));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "not authorized" });
  });

  it("returns the user's paid/COD orders", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    prisma.order.findMany.mockResolvedValue([{ id: "o1", total: 15 }]);

    const res = await GET(new Request(`${ORIGIN}/api/orders`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orders: [{ id: "o1", total: 15 }] });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "usr_1" }),
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
