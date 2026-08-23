import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { refundRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import { POST } from "@/app/api/admin/refund/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/middlewares/authAdmin", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    payment: { findUnique: vi.fn(), updateMany: vi.fn(() => ({ count: 1 })) },
    refund: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  },
}));

function buildRequest(body) {
  return new Request("http://localhost:3000/api/admin/refund", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const paidPayment = {
  id: "pay_1",
  status: "SUCCEEDED",
  providerPaymentIntentId: "pi_123",
  amount: 100,
  currency: "USD",
  refunds: [],
};

describe("POST /api/admin/refund", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refundRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "admin_1" } });
    authAdmin.mockResolvedValue(true);
    prisma.refund.create.mockResolvedValue({ id: "ref_1", amount: 50, status: "PENDING" });
    prisma.refund.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 403 for non-admins", async () => {
    authAdmin.mockResolvedValue(false);
    const res = await POST(buildRequest({ paymentId: "pay_1", amount: 50 }));
    expect(res.status).toBe(403);
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid input", async () => {
    const res = await POST(buildRequest({ amount: "lots" }));
    expect(res.status).toBe(422);
  });

  it("returns 404 when the payment does not exist", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    const res = await POST(buildRequest({ paymentId: "pay_missing", amount: 50 }));
    expect(res.status).toBe(404);
  });

  it("refuses to refund an un-captured payment", async () => {
    prisma.payment.findUnique.mockResolvedValue({ ...paidPayment, status: "PENDING", providerPaymentIntentId: null });
    const res = await POST(buildRequest({ paymentId: "pay_1", amount: 50 }));
    expect(res.status).toBe(409);
  });

  it("rejects a refund that exceeds the captured amount", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...paidPayment,
      refunds: [{ id: "r1", amount: 60, status: "SUCCEEDED" }],
    });
    const res = await POST(buildRequest({ paymentId: "pay_1", amount: 50 }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Refund amount exceeds the captured amount.");
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  it("issues a refund and transitions the payment", async () => {
    prisma.payment.findUnique.mockResolvedValue(paidPayment);
    prisma.refund.findMany.mockResolvedValue([{ amount: 50, status: "SUCCEEDED" }]);

    const res = await POST(buildRequest({ paymentId: "pay_1", amount: 50, reason: "Buyer changed mind" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refund.status).toBe("SUCCEEDED");
    expect(json.paymentStatus).toBe("PARTIALLY_REFUNDED");

    // Ledger row created before marking success.
    expect(prisma.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentId: "pay_1", amount: 50, status: "PENDING", reason: "Buyer changed mind" }),
      })
    );
    // Refund marked SUCCEEDED (no external provider call).
    expect(prisma.refund.updateMany).toHaveBeenCalledWith({
      where: { id: "ref_1", status: "PENDING" },
      data: { status: "SUCCEEDED" },
    });
  });

  it("marks the payment REFUNDED when fully refunded", async () => {
    prisma.payment.findUnique.mockResolvedValue(paidPayment);
    prisma.refund.findMany.mockResolvedValue([{ amount: 100, status: "SUCCEEDED" }]);

    const res = await POST(buildRequest({ paymentId: "pay_1" })); // full refund (default)
    expect(res.status).toBe(200);
    expect((await res.json()).paymentStatus).toBe("REFUNDED");
  });

  it("marks the refund FAILED when an error occurs", async () => {
    prisma.payment.findUnique.mockResolvedValue(paidPayment);
    prisma.refund.create.mockRejectedValueOnce(new Error("db error"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(buildRequest({ paymentId: "pay_1", amount: 50 }));
      expect(res.status).toBe(400);
    } finally {
      spy.mockRestore();
    }
  });
});
