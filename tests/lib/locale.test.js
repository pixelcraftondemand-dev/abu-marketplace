import { describe, expect, it } from "vitest";
import {
  supportedLocales,
  defaultLocale,
  stripLocaleFromPath,
  getLocaleFromPath,
  getPreferredLocaleFromAcceptLanguage,
  buildLocalizedPath,
  getLocaleForLanguage,
  getLanguageForLocale,
  buildLocaleOptions,
} from "@/lib/utils/locale";

describe("locale utilities", () => {
  it("exposes the supported locales with English as default", () => {
    // Sierra Leone pilot: English plus Krio only.
    expect(supportedLocales).toEqual(["en", "kri"]);
    expect(defaultLocale).toBe("en");
  });

  it("reads the locale prefix from a path", () => {
    expect(getLocaleFromPath("/kri/shop")).toBe("kri");
    expect(getLocaleFromPath("/en")).toBe("en");
    expect(getLocaleFromPath("/shop")).toBe(null);
    expect(getLocaleFromPath("/")).toBe(null);
    expect(getLocaleFromPath("/store/orders")).toBe(null);
    // Locales outside the pilot are not recognized.
    expect(getLocaleFromPath("/fr/shop")).toBe(null);
  });

  it("strips the locale prefix from a path", () => {
    expect(stripLocaleFromPath("/kri/shop")).toBe("/shop");
    expect(stripLocaleFromPath("/en")).toBe("/");
    expect(stripLocaleFromPath("/kri")).toBe("/");
    expect(stripLocaleFromPath("/shop")).toBe("/shop");
    expect(stripLocaleFromPath("/")).toBe("/");
    expect(stripLocaleFromPath("/kri/product/abc")).toBe("/product/abc");
  });

  it("builds locale-prefixed paths without double prefixes", () => {
    expect(buildLocalizedPath("/shop", "kri")).toBe("/kri/shop");
    expect(buildLocalizedPath("/", "en")).toBe("/en");
    expect(buildLocalizedPath("/kri/shop", "en")).toBe("/en/shop");
    expect(buildLocalizedPath("/kri/product/abc", "en")).toBe("/en/product/abc");
  });

  it("maps between language display names and locale codes", () => {
    expect(getLocaleForLanguage("English")).toBe("en");
    expect(getLocaleForLanguage("Krio")).toBe("kri");
    expect(getLocaleForLanguage("French")).toBe("en");
    expect(getLocaleForLanguage("Unknown")).toBe("en");
    expect(getLanguageForLocale("kri")).toBe("Krio");
    expect(getLanguageForLocale("zz")).toBe("English");
  });

  it("builds a language option list for the selector", () => {
    const options = buildLocaleOptions();
    expect(options).toHaveLength(supportedLocales.length);
    expect(options[0]).toEqual({ code: "en", label: "English" });
  });

  describe("getPreferredLocaleFromAcceptLanguage", () => {
    it("prefers explicit supported locale codes over region codes", () => {
      expect(getPreferredLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("en-GB,en;q=0.8")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("kri,en;q=0.9")).toBe("kri");
    });

    it("maps recognized browser language codes to marketplace locales", () => {
      expect(getPreferredLocaleFromAcceptLanguage("en-US")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("en")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("kri")).toBe("kri");
      // Unsupported marketplace locales fall back to English.
      expect(getPreferredLocaleFromAcceptLanguage("fr-FR")).toBe("en");
    });

    it("falls back to the default locale when nothing matches", () => {
      expect(getPreferredLocaleFromAcceptLanguage("de-DE,de;q=0.9")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage(undefined)).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("zz-YY")).toBe("en");
    });
  });
});
