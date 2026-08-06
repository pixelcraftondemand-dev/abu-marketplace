import { beforeEach, describe, expect, it, vi } from "vitest";

import { verificationVerifyRateLimiter } from "@/lib/security";
import { verifyVerificationToken } from "@/lib/services/verificationService";
import { POST } from "@/app/api/auth/verify-email/route";

vi.mock("@/lib/services/verificationService", () => ({
  verifyVerificationToken: vi.fn(),
}));

function buildRequest(body) {
  return new Request("http://localhost:3000/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verificationVerifyRateLimiter._clear();
  });

  it("returns 400 for a missing/invalid JSON body", async () => {
    const res = await POST(new Request("http://localhost:3000/api/auth/verify-email", { method: "POST" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid verification code.");
  });

  it("returns 422 for a malformed code", async () => {
    for (const body of [
      {},
      { code: "12345" },
      { code: "abcdef" },
      { code: "1234567" },
      { code: " 123456" },
      { code: 123456 },
      { token: "short" },
      { token: 123 },
    ]) {
      const res = await POST(buildRequest(body));
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe("Invalid verification code.");
    }
  });

  it("returns verified when the code is valid", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "verified", userId: "usr_1" });
    const res = await POST(buildRequest({ code: "483920" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, userId: "usr_1" });
    expect(verifyVerificationToken).toHaveBeenCalledWith("483920");
  });

  it("accepts a legacy link token for backward compatibility", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "verified", userId: "usr_1" });
    const res = await POST(buildRequest({ token: "legacy-token-123456" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, userId: "usr_1" });
    expect(verifyVerificationToken).toHaveBeenCalledWith("legacy-token-123456");
  });

  it("returns already-verified safely", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "already_verified", userId: "usr_1" });
    const res = await POST(buildRequest({ code: "483920" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, alreadyVerified: true, userId: "usr_1" });
  });

  it("returns 410 for an expired code", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "expired" });
    const res = await POST(buildRequest({ code: "483920" }));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ verified: false, status: "expired" });
  });

  it("returns 400 for an invalid code", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "invalid" });
    const res = await POST(buildRequest({ code: "483920" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ verified: false, status: "invalid" });
  });

  it("returns a safe 500 on server errors (no internals leaked)", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "server_error" });
    const res = await POST(buildRequest({ code: "483920" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Unable to verify");
    expect(JSON.stringify(json)).not.toContain("stack");
  });

  it("rate limits repeated attempts per IP (before any parsing or DB work)", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "invalid" });
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = await POST(buildRequest({ code: "483920" }));
    }
    expect(last.status).toBe(429);
    // The limiter blocked the excess requests before they reached the service.
    expect(verifyVerificationToken).toHaveBeenCalledTimes(20);
  });
});
