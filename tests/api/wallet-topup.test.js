import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { walletTopupRateLimiter } from "@/lib/security";
import { getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { POST } from "@/app/api/wallet/topup/route";

const { mockCreateSession } = vi.hoisted(() => ({ mockCreateSession: vi.fn() }));

vi.mock("stripe", () => ({
  default: () => ({
    checkout: { sessions: { create: mockCreateSession } },
  }),
}));

vi.mock("@/lib/serverAuth", () => ({
  getVerifiedUserFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    payment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

function buildRequest(body) {
  return new Request("http://localhost:3000/api/wallet/topup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

const verifiedUser = { id: "usr_1", emailVerified: true };

describe("POST /api/wallet/topup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    walletTopupRateLimiter._clear();
    getVerifiedUserFromRequest.mockResolvedValue(verifiedUser);
  });

  it("returns 401 when not authenticated", async () => {
    getVerifiedUserFromRequest.mockResolvedValue(null);
    const res = await POST(buildRequest({ amount: 25 }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("verify your email");
  });

  it("requires a verified email before allowing money movement", async () => {
    getVerifiedUserFromRequest.mockResolvedValue(null);
    const res = await POST(buildRequest({ amount: 25 }));
    expect(res.status).toBe(403);
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid amounts", async () => {
    for (const amount of [0, -5, 0.5, "abc", 1001, undefined, null]) {
      const res = await POST(buildRequest({ amount }));
      expect(res.status).toBe(422);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    }
  });

  it("creates a payment and Stripe session with walletTopup metadata", async () => {
    prisma.payment.create.mockResolvedValue({ id: "pay_1" });
    prisma.payment.update.mockResolvedValue({});
    mockCreateSession.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/x" });

    const res = await POST(buildRequest({ amount: 25, idempotencyKey: "key_12345678" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentId).toBe("pay_1");
    expect(json.idempotencyKey).toBe("key_12345678");

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        idempotencyKey: "key_12345678",
        userId: "usr_1",
        amount: 25,
        currency: "USD",
        status: "PENDING",
      },
    });
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: { appId: "abu-marketplace", userId: "usr_1", paymentId: "pay_1", walletTopup: "1" },
        success_url: "http://localhost:3000/wallet?status=success",
      }),
      { idempotencyKey: "topup_pay_1" }
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: expect.objectContaining({ providerSessionId: "cs_1", status: "PROCESSING" }),
    });
  });

  it("reuses the existing session for the same idempotency key (no second charge)", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_1",
      status: "PROCESSING",
      providerSessionUrl: "https://checkout.stripe.com/original",
    });
    const res = await POST(buildRequest({ amount: 25, idempotencyKey: "key_12345678" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reused).toBe(true);
    expect(json.session.url).toBe("https://checkout.stripe.com/original");
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("returns alreadyProcessed for a completed top-up", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_1",
      status: "SUCCEEDED",
      providerSessionUrl: null,
    });
    const res = await POST(buildRequest({ amount: 25, idempotencyKey: "key_12345678" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyProcessed: true, paymentId: "pay_1" });
  });

  it("rejects another user's idempotency key", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      userId: "usr_other",
      status: "PROCESSING",
      providerSessionUrl: "https://checkout.stripe.com/original",
    });
    const res = await POST(buildRequest({ amount: 25, idempotencyKey: "key_12345678" }));
    expect(res.status).toBe(403);
  });

  it("P2002 race: returns the winner's session without creating a second charge", async () => {
    prisma.payment.create.mockRejectedValueOnce({ code: "P2002" });
    prisma.payment.findUnique.mockResolvedValue({
      id: "pay_win",
      userId: "usr_1",
      status: "PROCESSING",
      providerSessionUrl: "https://checkout.stripe.com/win",
    });
    const res = await POST(buildRequest({ amount: 25, idempotencyKey: "key_12345678" }));
    expect(res.status).toBe(200);
    expect((await res.json()).session.url).toBe("https://checkout.stripe.com/win");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("marks the payment FAILED and returns 502 when Stripe cannot create the session", async () => {
    prisma.payment.create.mockResolvedValue({ id: "pay_1" });
    prisma.payment.update.mockResolvedValue({});
    mockCreateSession.mockRejectedValue(new Error("stripe down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(buildRequest({ amount: 25 }));
      expect(res.status).toBe(502);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "pay_1" },
        data: { status: "FAILED" },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("rate limits top-ups per user", async () => {
    prisma.payment.create.mockResolvedValue({ id: "pay_1" });
    prisma.payment.update.mockResolvedValue({});
    mockCreateSession.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/x" });

    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = await POST(buildRequest({ amount: 10 }));
    }
    expect(last.status).toBe(429);
  });
});
