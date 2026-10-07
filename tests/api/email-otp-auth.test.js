import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendLimiter: { check: vi.fn() },
  verifyLimiter: { check: vi.fn() },
  issueEmailOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
  createEmailSignInTicket: vi.fn(),
  hashIp: vi.fn((value) => `hashed:${value}`),
}));

vi.mock("@/lib/services/emailOtpService", () => ({
  emailOtpSendRateLimiter: mocks.sendLimiter,
  emailOtpVerifyRateLimiter: mocks.verifyLimiter,
  issueEmailOtp: mocks.issueEmailOtp,
  normalizeEmailAddress: (email) => email.trim().toLowerCase(),
  verifyEmailOtp: mocks.verifyEmailOtp,
}));

vi.mock("@/lib/services/clerkEmailAuth", () => ({
  createEmailSignInTicket: mocks.createEmailSignInTicket,
}));

vi.mock("@/lib/paymentLog", () => ({ hashIp: mocks.hashIp }));

import { POST as sendCode } from "@/app/api/auth/email/send/route";
import { POST as verifyCode } from "@/app/api/auth/email/verify/route";

function request(path, body) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("email OTP authentication routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendLimiter.check.mockResolvedValue({ allowed: true });
    mocks.verifyLimiter.check.mockResolvedValue({ allowed: true });
    mocks.verifyEmailOtp.mockResolvedValue({ status: "invalid" });
  });

  it("sends a code for a normalized email and selected flow", async () => {
    const response = await sendCode(
      request("/api/auth/email/send", {
        email: "  Buyer@Example.com ",
        intent: "signUp",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.issueEmailOtp).toHaveBeenCalledWith("buyer@example.com", "signUp");
  });

  it("rejects malformed send requests", async () => {
    const response = await sendCode(
      request("/api/auth/email/send", { email: "bad", intent: "signIn" })
    );

    expect(response.status).toBe(422);
    expect(mocks.issueEmailOtp).not.toHaveBeenCalled();
  });

  it("rate limits code sends", async () => {
    mocks.sendLimiter.check.mockResolvedValueOnce({ allowed: false, retryAfter: 45 });

    const response = await sendCode(
      request("/api/auth/email/send", {
        email: "buyer@example.com",
        intent: "signIn",
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(mocks.issueEmailOtp).not.toHaveBeenCalled();
  });

  it("rejects OTPs that are not six characters", async () => {
    const response = await verifyCode(
      request("/api/auth/email/verify", {
        email: "buyer@example.com",
        intent: "signIn",
        code: "1234A",
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("returns a short-lived sign-in ticket only after OTP verification", async () => {
    mocks.verifyEmailOtp.mockResolvedValue({
      status: "verified",
      email: "buyer@example.com",
      intent: "signIn",
    });
    mocks.createEmailSignInTicket.mockResolvedValue({ ok: true, ticket: "opaque-ticket" });

    const response = await verifyCode(
      request("/api/auth/email/verify", {
        email: "buyer@example.com",
        intent: "signIn",
        code: "12345A",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, ticket: "opaque-ticket" });
    expect(mocks.createEmailSignInTicket).toHaveBeenCalledWith(
      "buyer@example.com",
      "signIn"
    );
  });

  it("does not issue tickets when the OTP is invalid", async () => {
    const response = await verifyCode(
      request("/api/auth/email/verify", {
        email: "buyer@example.com",
        intent: "signIn",
        code: "12345A",
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.createEmailSignInTicket).not.toHaveBeenCalled();
  });
});
