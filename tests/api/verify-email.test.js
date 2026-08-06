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
    expect((await res.json()).error).toBe("Invalid verification token.");
  });

  it("returns 422 for a malformed token", async () => {
    for (const body of [{}, { token: "short" }, { token: "x".repeat(201) }, { token: 123 }]) {
      const res = await POST(buildRequest(body));
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe("Invalid verification token.");
    }
  });

  it("returns verified when the token is valid", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "verified", userId: "usr_1" });
    const res = await POST(buildRequest({ token: "a-valid-token-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, userId: "usr_1" });
    expect(verifyVerificationToken).toHaveBeenCalledWith("a-valid-token-123");
  });

  it("returns already-verified safely", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "already_verified", userId: "usr_1" });
    const res = await POST(buildRequest({ token: "a-valid-token-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, alreadyVerified: true, userId: "usr_1" });
  });

  it("returns 410 for an expired token", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "expired" });
    const res = await POST(buildRequest({ token: "a-valid-token-123" }));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ verified: false, status: "expired" });
  });

  it("returns 400 for an invalid token", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "invalid" });
    const res = await POST(buildRequest({ token: "a-valid-token-123" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ verified: false, status: "invalid" });
  });

  it("returns a safe 500 on server errors (no internals leaked)", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "server_error" });
    const res = await POST(buildRequest({ token: "a-valid-token-123" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Unable to verify");
    expect(JSON.stringify(json)).not.toContain("stack");
  });

  it("rate limits repeated attempts per IP (before any parsing or DB work)", async () => {
    verifyVerificationToken.mockResolvedValue({ status: "invalid" });
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = await POST(buildRequest({ token: `token-${i}-pad` }));
    }
    expect(last.status).toBe(429);
    // The limiter blocked the excess requests before they reached the service.
    expect(verifyVerificationToken).toHaveBeenCalledTimes(20);
  });
});
