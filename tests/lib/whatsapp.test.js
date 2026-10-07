import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSupportMessage,
  buildSupportWhatsAppLink,
  buildWhatsAppLink,
  buildWhatsAppSignupLink,
  getSupportWhatsAppNumber,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
} from "@/lib/utils/whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("keeps an already-international number as digits", () => {
    expect(normalizeWhatsAppNumber("23276123456")).toBe("23276123456");
    expect(normalizeWhatsAppNumber("+232 76 123 456")).toBe("23276123456");
  });

  it("upgrades a local Sierra Leone number to international", () => {
    expect(normalizeWhatsAppNumber("076 123 456")).toBe("23276123456");
  });

  it("strips the international 00 prefix", () => {
    expect(normalizeWhatsAppNumber("00 232 76 123 456")).toBe("23276123456");
  });

  it("returns null when there are no digits", () => {
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("call me")).toBeNull();
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
  });
});

describe("isValidWhatsAppNumber", () => {
  it("accepts plausible numbers and rejects short/long ones", () => {
    expect(isValidWhatsAppNumber("23276123456")).toBe(true);
    expect(isValidWhatsAppNumber("076123456")).toBe(true);
    expect(isValidWhatsAppNumber("123")).toBe(false);
    expect(isValidWhatsAppNumber("1234567890123456")).toBe(false);
    expect(isValidWhatsAppNumber("n/a")).toBe(false);
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a bare wa.me link for a valid number", () => {
    expect(buildWhatsAppLink("+232 76 123 456")).toBe("https://wa.me/23276123456");
  });

  it("encodes the prefilled message", () => {
    expect(buildWhatsAppLink("23276123456", "Hello store, I have a question")).toBe(
      "https://wa.me/23276123456?text=Hello%20store%2C%20I%20have%20a%20question"
    );
  });

  it("returns null when the number is unusable", () => {
    expect(buildWhatsAppLink("")).toBeNull();
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink("123")).toBeNull();
  });
});

describe("site-wide support line", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unset by default, so the bubble stays hidden", () => {
    expect(getSupportWhatsAppNumber()).toBe("");
    expect(buildSupportWhatsAppLink("Hi")).toBeNull();
  });

  it("builds a prefilled link from the configured number", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "23279069045");
    expect(getSupportWhatsAppNumber()).toBe("23279069045");
    expect(buildSupportWhatsAppLink("Hi ABU")).toBe(
      "https://wa.me/23279069045?text=Hi%20ABU"
    );
  });

  it("normalises a locally-formatted support number too", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "079 069 045");
    expect(buildSupportWhatsAppLink()).toBe("https://wa.me/23279069045");
  });

  it("builds a Meta In-App Signup deep link from the configured signup ID", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "+232 79 069 045");
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SIGNUP_ID", "9876543210123456");
    expect(buildWhatsAppSignupLink()).toBe(
      "https://wa.me/23279069045/signup/9876543210123456"
    );
  });

  it("returns null unless a valid signup ID and WhatsApp number are configured", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "23279069045");
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SIGNUP_ID", "");
    expect(buildWhatsAppSignupLink()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SIGNUP_ID", "not-an-id");
    expect(buildWhatsAppSignupLink()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER", "");
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_SIGNUP_ID", "9876543210123456");
    expect(buildWhatsAppSignupLink()).toBeNull();
  });
});

describe("buildSupportMessage", () => {
  it("asks for human help when there is no product context", () => {
    expect(buildSupportMessage()).toBe(
      "Hi ABU Marketplace, I'd like help with an order or a payment."
    );
  });

  it("names the product and asks about availability when given context", () => {
    const message = buildSupportMessage({
      productName: "Smart watch white",
      url: "https://abumarketplace.shop/en/product/abc",
    });
    expect(message).toContain('"Smart watch white"');
    expect(message).toContain("https://abumarketplace.shop/en/product/abc");
    expect(message).toMatch(/available/i);
  });
});
