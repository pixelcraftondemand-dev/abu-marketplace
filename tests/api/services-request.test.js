import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serviceRequestRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { POST } from "@/app/api/services/request/route";

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
  return new Request("http://localhost:3000/api/services/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Aisha Bangura",
  phone: "+232 76 000 000",
  email: "aisha@example.com",
  location: "Freetown",
  trade: "Plumber",
  jobDate: "This weekend",
  details: "Kitchen sink is leaking and needs urgent repair.",
};

describe("services request POST", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("SUPPORT_EMAIL_TO", SUPPORT_EMAIL_TO);
    vi.stubEnv("SUPPORT_EMAIL_FROM", SUPPORT_EMAIL_FROM);
    vi.resetAllMocks();
    serviceRequestRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    serviceRequestRateLimiter._clear();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(buildRequest({ name: "Only Name" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Name, phone, location, and trade are required.",
    });
  });

  it("returns 400 for an unknown trade", async () => {
    const res = await POST(buildRequest({ ...validBody, trade: "Hacker" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown trade." });
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

  it("sends the hire request email to support", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.to).toEqual([SUPPORT_EMAIL_TO]);
    expect(sendArg.from).toBe(SUPPORT_EMAIL_FROM);
    expect(sendArg.subject).toContain("Plumber");
    expect(sendArg.text).toContain("Aisha Bangura");
    expect(sendArg.text).toContain("Freetown");
    expect(sendArg.text).toContain("leaking");
    expect(sendArg.html).toContain("Aisha Bangura");
  });

  it("falls back to the support email as from-address when SUPPORT_EMAIL_FROM is unset", async () => {
    vi.stubEnv("SUPPORT_EMAIL_FROM", "");
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: SUPPORT_EMAIL_TO }));
  });

  it("blocks beyond the rate limit (5 per window)", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    let last;
    for (let i = 0; i < 6; i++) {
      last = await POST(buildRequest(validBody));
    }
    expect(last.status).toBe(429);
    expect(mockSend).toHaveBeenCalledTimes(5);
  });

  it("returns 500 when the email send fails", async () => {
    mockSend.mockRejectedValue(new Error("domain not verified"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest(validBody));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Unable to submit your request. Please try again.",
      });
    } finally {
      spy.mockRestore();
    }
  });
});
