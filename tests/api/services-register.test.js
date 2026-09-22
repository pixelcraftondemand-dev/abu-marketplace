import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serviceRegisterRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { POST } from "@/app/api/services/register/route";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockSend } },
}));

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

const SUPPORT_EMAIL_TO = "support@abumarketplace.shop";
const SUPPORT_EMAIL_FROM = "ABU Marketplace <noreply@abumarketplace.shop>";

function buildRequest(body) {
  return new Request("http://localhost:3000/api/services/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Mohamed Koroma",
  phone: "+232 76 000 001",
  email: "mohamed@example.com",
  trade: "Electrician",
  location: "Waterloo",
  experience: "5 years",
  hourlyRate: "$7",
  bio: "Certified electrician for home wiring and repairs.",
};

describe("services register POST", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("SUPPORT_EMAIL_TO", SUPPORT_EMAIL_TO);
    vi.stubEnv("SUPPORT_EMAIL_FROM", SUPPORT_EMAIL_FROM);
    vi.resetAllMocks();
    serviceRegisterRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    serviceRegisterRateLimiter._clear();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(buildRequest({ name: "Only Name" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Name, phone, email, trade, and location are required.",
    });
  });

  it("returns 400 for an unknown trade", async () => {
    const res = await POST(buildRequest({ ...validBody, trade: "Influencer" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown trade." });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed email", async () => {
    const res = await POST(buildRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "A valid email address is required." });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 when the support destination email is not configured", async () => {
    vi.stubEnv("SUPPORT_EMAIL_TO", "");
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Support email destination is not configured.",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the worker listing email to support", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.to).toEqual([SUPPORT_EMAIL_TO]);
    expect(sendArg.from).toBe(SUPPORT_EMAIL_FROM);
    expect(sendArg.subject).toContain("Electrician");
    expect(sendArg.text).toContain("Mohamed Koroma");
    expect(sendArg.text).toContain("Waterloo");
    expect(sendArg.html).toContain("Mohamed Koroma");
  });

  it("escapes user content in the HTML email", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    const res = await POST(
      buildRequest({ ...validBody, bio: 'I like <script>alert("x")</script> & stuff' })
    );
    expect(res.status).toBe(200);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.html).not.toContain("<script>");
    expect(sendArg.html).toContain("&lt;script&gt;");
  });

  it("blocks beyond the rate limit (3 per window)", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    let last;
    for (let i = 0; i < 4; i++) {
      last = await POST(buildRequest(validBody));
    }
    expect(last.status).toBe(429);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("returns 500 when the email send fails", async () => {
    mockSend.mockRejectedValue(new Error("domain not verified"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(validBody));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Unable to submit your listing. Please try again.",
      });
    } finally {
      spy.mockRestore();
    }
  });
});
