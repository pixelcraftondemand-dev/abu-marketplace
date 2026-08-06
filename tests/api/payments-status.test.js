import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { paymentStatusRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET } from "@/app/api/payments/status/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    payment: { findFirst: vi.fn() },
  },
}));

function buildRequest(search = "") {
  return new Request(`http://localhost:3000/api/payments/status?${search}`);
}

const paymentRow = {
  id: "pay_1",
  idempotencyKey: "key_12345678",
  status: "PROCESSING",
  amount: 25,
  currency: "USD",
  providerSessionUrl: "https://checkout.stripe.com/x",
  createdAt: new Date(),
};

describe("GET /api/payments/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    paymentStatusRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
  });

  it("returns 401 when not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await GET(buildRequest("idempotencyKey=key_12345678"));
    expect(res.status).toBe(401);
  });

  it("returns 422 without a paymentId or idempotencyKey", async () => {
    const res = await GET(buildRequest(""));
    expect(res.status).toBe(422);
  });

  it("returns the payment status for an idempotency key", async () => {
    prisma.payment.findFirst.mockResolvedValue(paymentRow);
    const res = await GET(buildRequest("idempotencyKey=key_12345678"));
    expect(res.status).toBe(200);
    expect((await res.json()).payment.status).toBe("PROCESSING");
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: "key_12345678", userId: "usr_1" },
      select: expect.objectContaining({ id: true, status: true }),
    });
  });

  it("scopes lookups to the caller's userId (cannot read another user's payment)", async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    const res = await GET(buildRequest("paymentId=pay_other"));
    expect(res.status).toBe(404);
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: "pay_other", userId: "usr_1" },
      select: expect.objectContaining({ id: true, status: true }),
    });
  });
});
