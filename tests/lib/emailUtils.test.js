import { afterEach, describe, expect, it, vi } from "vitest";

import { escapeHtml, getEmailFromAddress } from "@/lib/emailUtils";

describe("getEmailFromAddress", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns EMAIL_FROM for order emails", () => {
    vi.stubEnv("EMAIL_FROM", "orders@abumarketplace.shop");
    expect(getEmailFromAddress("order")).toBe("orders@abumarketplace.shop");
  });

  it("falls back to SUPPORT_EMAIL_FROM for order emails when EMAIL_FROM is unset", () => {
    vi.stubEnv("SUPPORT_EMAIL_FROM", "support@abumarketplace.shop");
    expect(getEmailFromAddress("order")).toBe("support@abumarketplace.shop");
  });

  it("defaults order emails to the brand noreply address", () => {
    expect(getEmailFromAddress("order")).toBe("ABU Marketplace <noreply@abumarketplace.shop>");
  });

  it("returns VERIFICATION_EMAIL_FROM for verification emails", () => {
    vi.stubEnv("VERIFICATION_EMAIL_FROM", "no-reply@verification.abumarketplace.shop");
    expect(getEmailFromAddress("verification")).toBe(
      "no-reply@verification.abumarketplace.shop"
    );
  });

  it("defaults verification emails to the verification subdomain address", () => {
    expect(getEmailFromAddress("verification")).toBe(
      "ABU Marketplace <noreply@verification.abumarketplace.shop>"
    );
  });

  it("returns SUPPORT_EMAIL_FROM for support emails, or empty string when unset", () => {
    expect(getEmailFromAddress("support")).toBe("");
    vi.stubEnv("SUPPORT_EMAIL_FROM", "support@abumarketplace.shop");
    expect(getEmailFromAddress("support")).toBe("support@abumarketplace.shop");
  });

  it("falls back to the order config for unknown purposes", () => {
    vi.stubEnv("EMAIL_FROM", "orders@abumarketplace.shop");
    expect(getEmailFromAddress("unknown")).toBe("orders@abumarketplace.shop");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });

  it("returns an empty string for nullish values", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});
