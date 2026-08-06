import { describe, expect, it } from "vitest";
import {
  convertAmount,
  formatCurrency,
  formatPrice,
  formatPriceCompact,
  getCurrencySymbol,
  isValidCurrency,
  supportedCurrencies,
  FALLBACK_RATES,
} from "@/lib/utils/currency";

describe("currency utils", () => {
  it("treats USD as the canonical base currency", () => {
    expect(supportedCurrencies).toContain("USD");
    expect(supportedCurrencies).toContain("SLE");
    expect(supportedCurrencies).toContain("EUR");
    expect(supportedCurrencies).toContain("GBP");
  });

  it("validates supported and unsupported currencies", () => {
    expect(isValidCurrency("USD")).toBe(true);
    expect(isValidCurrency("SLE")).toBe(true);
    expect(isValidCurrency("EUR")).toBe(true);
    expect(isValidCurrency("GBP")).toBe(true);
    expect(isValidCurrency("BTC")).toBe(false);
    expect(isValidCurrency("")).toBe(false);
    expect(isValidCurrency(undefined)).toBe(false);
  });

  it("converts canonical amounts by a rate", () => {
    expect(convertAmount(10, 1)).toBe(10);
    expect(convertAmount(10, 22.5)).toBe(225);
    expect(convertAmount(10, 0.92)).toBeCloseTo(9.2);
  });

  it("returns the amount unchanged when the rate is invalid", () => {
    expect(convertAmount(10, undefined)).toBe(10);
    expect(convertAmount("abc", 1)).toBe(Number("abc"));
  });

  it("formats USD with a $ symbol", () => {
    expect(formatPrice(10, "USD")).toContain("$");
    expect(formatPrice(1234.5, "USD")).toContain("1,234.50");
  });

  it("formats SLE with the brand SLe symbol and grouped numbers", () => {
    const out = formatPrice(1234.5, "SLE");
    expect(out).toContain("SLe");
    expect(out).toContain("1,234.50");
  });

  it("formats EUR and GBP with their symbols", () => {
    expect(formatPrice(10, "EUR")).toContain("€");
    expect(formatPrice(10, "GBP")).toContain("£");
  });

  it("respects the locale for formatting", () => {
    const out = formatPrice(1234.5, "EUR", "fr-FR");
    expect(out).toContain("€");
  });

  it("handles non-finite amounts gracefully", () => {
    expect(formatPrice("abc", "USD")).toBe("");
    expect(formatPrice(undefined, "USD")).toBe("");
  });

  it("keeps the backward-compatible formatter working", () => {
    expect(formatCurrency(5, "USD")).toContain("$");
  });

  it("formats compact amounts with the currency symbol", () => {
    expect(formatPriceCompact(1250, "USD")).toMatch(/\$/);
    expect(formatPriceCompact(25312.5, "SLE")).toContain("SLe");
  });

  it("handles non-finite compact amounts gracefully", () => {
    expect(formatPriceCompact("abc", "USD")).toBe("");
    expect(formatPriceCompact(undefined, "USD")).toBe("");
  });

  it("exposes the static fallback rates used when the API is unreachable", () => {
    expect(FALLBACK_RATES.USD).toBe(1);
    expect(FALLBACK_RATES.SLE).toBeGreaterThan(1);
  });

  it("maps currency codes to symbols", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("SLE")).toContain("SLe");
    expect(getCurrencySymbol("XYZ")).toBe("XYZ ");
  });
});
