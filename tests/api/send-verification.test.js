import { beforeEach, describe, expect, it, vi } from "vitest";

import { verificationSendRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { issueVerificationEmail } from "@/lib/services/verificationService";
import { POST } from "@/app/api/auth/send-verification/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/services/verificationService", () => ({
  issueVerificationEmail: vi.fn(),
}));

function buildRequest(body = {}) {
  return new Request("http://localhost:3000/api/auth/send-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/send-verification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verificationSendRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    issueVerificationEmail.mockResolvedValue({ sent: true });
  });

  it("returns 401 when not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await POST(buildRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("not authorized");
    expect(issueVerificationEmail).not.toHaveBeenCalled();
  });

  it("issues and sends a verification email for the authenticated user", async () => {
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Verification email sent." });
    expect(issueVerificationEmail).toHaveBeenCalledWith("usr_1");
  });

  it("returns alreadyVerified without sending again", async () => {
    issueVerificationEmail.mockResolvedValue({ sent: false, reason: "already_verified" });
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "Your email is already verified.",
      alreadyVerified: true,
    });
  });

  it("never reveals account existence (generic response for unknown users)", async () => {
    issueVerificationEmail.mockResolvedValue({ sent: false, reason: "no_account" });
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("If an account exists");
    expect(json.message).not.toContain("no_account");
  });

  it("rejects a non-empty body (client input is never trusted)", async () => {
    const res = await POST(buildRequest({ email: "victim@example.com" }));
    expect(res.status).toBe(422);
    expect(issueVerificationEmail).not.toHaveBeenCalled();
  });

  it("rate limits per user to prevent email flooding", async () => {
    let last = 0;
    for (let i = 0; i < 4; i++) {
      last = await POST(buildRequest());
    }
    expect(last.status).toBe(429);
    expect(issueVerificationEmail).toHaveBeenCalledTimes(3);
  });

  it("returns a safe generic error (no internals) on unexpected failures", async () => {
    issueVerificationEmail.mockRejectedValue(new Error("resend: connection refused"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest());
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Unable to send the verification email");
      expect(JSON.stringify(json)).not.toContain("resend");
      expect(JSON.stringify(json)).not.toContain("connection");
    } finally {
      spy.mockRestore();
    }
  });
});
