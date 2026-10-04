import { describe, expect, it } from "vitest";
import {
  buildWhatsAppLink,
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
