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
  it("exposes all ten supported locales with English as default", () => {
    expect(supportedLocales).toEqual([
      "en", "fr", "pt", "kri", "ha", "yo", "ig", "wo", "ff", "ak",
    ]);
    expect(defaultLocale).toBe("en");
  });

  it("reads the locale prefix from a path", () => {
    expect(getLocaleFromPath("/fr/shop")).toBe("fr");
    expect(getLocaleFromPath("/en")).toBe("en");
    expect(getLocaleFromPath("/shop")).toBe(null);
    expect(getLocaleFromPath("/")).toBe(null);
    expect(getLocaleFromPath("/store/orders")).toBe(null);
  });

  it("strips the locale prefix from a path", () => {
    expect(stripLocaleFromPath("/fr/shop")).toBe("/shop");
    expect(stripLocaleFromPath("/en")).toBe("/");
    expect(stripLocaleFromPath("/fr")).toBe("/");
    expect(stripLocaleFromPath("/shop")).toBe("/shop");
    expect(stripLocaleFromPath("/")).toBe("/");
    expect(stripLocaleFromPath("/fr/product/abc")).toBe("/product/abc");
  });

  it("builds locale-prefixed paths without double prefixes", () => {
    expect(buildLocalizedPath("/shop", "fr")).toBe("/fr/shop");
    expect(buildLocalizedPath("/", "pt")).toBe("/pt");
    expect(buildLocalizedPath("/fr/shop", "en")).toBe("/en/shop");
    expect(buildLocalizedPath("/fr/product/abc", "kri")).toBe("/kri/product/abc");
  });

  it("maps between language display names and locale codes", () => {
    expect(getLocaleForLanguage("French")).toBe("fr");
    expect(getLocaleForLanguage("Twi")).toBe("ak");
    expect(getLocaleForLanguage("Unknown")).toBe("en");
    expect(getLanguageForLocale("fr")).toBe("French");
    expect(getLanguageForLocale("zz")).toBe("English");
  });

  it("builds a language option list for the selector", () => {
    const options = buildLocaleOptions();
    expect(options).toHaveLength(supportedLocales.length);
    expect(options[0]).toEqual({ code: "en", label: "English" });
  });

  describe("getPreferredLocaleFromAcceptLanguage", () => {
    it("prefers explicit supported locale codes over region codes", () => {
      expect(getPreferredLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
      expect(getPreferredLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt");
    });

    it("maps recognized browser language codes to marketplace locales", () => {
      expect(getPreferredLocaleFromAcceptLanguage("yo-NG")).toBe("yo");
      expect(getPreferredLocaleFromAcceptLanguage("ha-NG")).toBe("ha");
      expect(getPreferredLocaleFromAcceptLanguage("ig-NG")).toBe("ig");
      expect(getPreferredLocaleFromAcceptLanguage("ak-GH")).toBe("ak");
      expect(getPreferredLocaleFromAcceptLanguage("wo-SN")).toBe("wo");
      expect(getPreferredLocaleFromAcceptLanguage("ff-SN")).toBe("ff");
    });

    it("falls back to the default locale when nothing matches", () => {
      expect(getPreferredLocaleFromAcceptLanguage("de-DE,de;q=0.9")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("")).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage(undefined)).toBe("en");
      expect(getPreferredLocaleFromAcceptLanguage("zz-YY")).toBe("en");
    });
  });
});
