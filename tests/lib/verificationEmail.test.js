import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendAccountVerificationEmail,
  sendVerificationEmail,
} from "@/lib/verificationEmail";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockSend } },
}));

const VERIFICATION_EMAIL_FROM = "ABU Marketplace <noreply@verification.abumarketplace.shop>";

describe("sendVerificationEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when the recipient email is missing", async () => {
    await expect(sendVerificationEmail({ code: "123456" })).rejects.toThrow(
      "requires a recipient email address"
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("throws when the code is missing", async () => {
    await expect(sendVerificationEmail({ to: "buyer@example.com" })).rejects.toThrow(
      "requires a verification code"
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends a verification email with the code from the verification subdomain", async () => {
    vi.stubEnv("VERIFICATION_EMAIL_FROM", VERIFICATION_EMAIL_FROM);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "483920" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.from).toBe(VERIFICATION_EMAIL_FROM);
    expect(sendArg.to).toEqual(["buyer@example.com"]);
    expect(sendArg.subject).toBe("Verify your email — ABU Marketplace");
    expect(sendArg.html).toContain("483920");
    expect(sendArg.html).toContain("expires in 10 minutes");
    expect(sendArg.text).toContain("483920");
  });

  it("uses the purpose-specific subject and action text", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "111111", purpose: "login" });
    expect(mockSend.mock.calls[0][0].subject).toBe("Your sign-in code — ABU Marketplace");
    expect(mockSend.mock.calls[0][0].html).toContain("sign in to your account");

    await sendVerificationEmail({ to: "buyer@example.com", code: "222222", purpose: "reset" });
    expect(mockSend.mock.calls[1][0].subject).toBe("Reset your password — ABU Marketplace");
    expect(mockSend.mock.calls[1][0].html).toContain("reset your password");
  });

  it("falls back to the default verification from-address when env is unset", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "483920" });

    expect(mockSend.mock.calls[0][0].from).toBe(
      "ABU Marketplace <noreply@verification.abumarketplace.shop>"
    );
  });

  it("escapes the code in the HTML body", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "12<b>34</b>" });

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain("12&lt;b&gt;34&lt;/b&gt;");
    expect(html).not.toContain("12<b>34</b>");
  });

  it("honors a custom expiry window", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "483920", expiresInMinutes: 5 });

    expect(mockSend.mock.calls[0][0].html).toContain("expires in 5 minutes");
  });

  it("clamps a non-positive expiry window to 1 minute", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendVerificationEmail({ to: "buyer@example.com", code: "483920", expiresInMinutes: 0 });

    expect(mockSend.mock.calls[0][0].html).toContain("expires in 1 minutes");
  });

  it("propagates a Resend send failure to the caller", async () => {
    mockSend.mockRejectedValue(new Error("domain not verified"));

    await expect(
      sendVerificationEmail({ to: "buyer@example.com", code: "483920" })
    ).rejects.toThrow("domain not verified");
  });
});

describe("sendAccountVerificationEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("VERIFICATION_EMAIL_FROM", VERIFICATION_EMAIL_FROM);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws without a recipient", async () => {
    await expect(
      sendAccountVerificationEmail({ verificationUrl: "https://abumarketplace.shop/verify-email?token=x" })
    ).rejects.toThrow("requires a recipient email address");
  });

  it("rejects a non-https verification URL", async () => {
    await expect(
      sendAccountVerificationEmail({ to: "buyer@example.com", verificationUrl: "http://insecure.example/x" })
    ).rejects.toThrow("requires a valid https verification URL");
  });

  it("allows http:// only for local development hosts", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    const url = "http://localhost:3000/verify-email?token=abc123";
    await sendAccountVerificationEmail({ to: "buyer@example.com", verificationUrl: url });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].html).toContain(url);
  });

  it("sends from the verification subdomain with the expected subject and CTA", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    const url = "https://abumarketplace.shop/verify-email?token=abc123";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sendAccountVerificationEmail({ to: "buyer@example.com", verificationUrl: url, expiresAt });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.from).toBe(VERIFICATION_EMAIL_FROM);
    expect(sendArg.to).toEqual(["buyer@example.com"]);
    expect(sendArg.subject).toBe("Verify your ABU Marketplace account");
    expect(sendArg.html).toContain(url);
    expect(sendArg.html).toContain("Verify Email Address");
    expect(sendArg.html).toContain("expires on");
    expect(sendArg.text).toContain(url);
    expect(sendArg.text).toContain("ABU Marketplace");
  });

  it("escapes the URL in the HTML body", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_1" } });
    const url = 'https://abumarketplace.shop/verify-email?token=<b>evil</b>';

    await sendAccountVerificationEmail({ to: "buyer@example.com", verificationUrl: url });

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain("&lt;b&gt;evil&lt;/b&gt;");
    expect(html).not.toContain("<b>evil</b>");
  });

  it("propagates a Resend send failure to the caller", async () => {
    mockSend.mockRejectedValue(new Error("quota exceeded"));
    await expect(
      sendAccountVerificationEmail({
        to: "buyer@example.com",
        verificationUrl: "https://abumarketplace.shop/verify-email?token=abc",
      })
    ).rejects.toThrow("quota exceeded");
  });
});
